/**
 * src/services/poiLlm.ts — KAN-196
 *
 * On-device POI classifier (second pass after the KAN-195 rule map), plus
 * dictionary learn-back. Titles the rule map returns `null` for are run through
 * a small TFLite average-word-embedding text classifier via
 * react-native-fast-tflite — free, offline, and cross-platform (Android + iOS,
 * no hardware gate, ~90 KB bundled model).
 *
 * Pipeline: normalize+tokenize the title (same `normalize()` the dictionary
 * uses) → int[MAXLEN] → model → softmax over the 17 classes (16 POI + "none").
 * Top class wins if its probability ≥ CONFIDENCE_THRESHOLD and it is a real POI;
 * otherwise `null`. `null` is a valid, expected result — callers treat it as
 * "no POI". Any failure (model can't load, inference throws) also degrades to
 * `null`, so POI inference never throws or blocks an import.
 *
 * Model artifacts (trained offline — see ml/poi-classifier/): the .tflite plus
 * vocab.json (token→id) and labels.json (class index→label). The JS tokenizer
 * here MUST match ml/poi-classifier/train_colab.py exactly.
 *
 * ── Learn-back ────────────────────────────────────────────────────────────
 * A confident classification (or a user edit, KAN-197) is fed back into the
 * dictionary's learned layer (KAN-195) AND persisted to Firestore, so next time
 * the rule map catches the title for free.
 */

import { loadTensorflowModel, type TensorflowModel } from 'react-native-fast-tflite';
import type { PoiType } from '../types';
import { POI_CATALOG } from '../types';
import {
  normalize,
  registerLearnedKeyword,
  type PoiResolution,
  type SupportedLang,
} from './poiInference';
import { persistLearnedKeyword } from './firestore';
import vocabJson from '../../assets/poi-model/vocab.json';
import labelsJson from '../../assets/poi-model/labels.json';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MODEL_ASSET = require('../../assets/poi-model/poi_classifier.tflite');

// Must match ml/poi-classifier/train_colab.py.
const MAXLEN = 12;
const PAD_ID = 0;
const OOV_ID = 1;

/** Minimum top-class probability to accept a classification. Below → null. */
export const CONFIDENCE_THRESHOLD = 0.5;

const VOCAB = vocabJson as Record<string, number>;
const LABELS = labelsJson as string[];
const VALID_POI = new Set<string>(POI_CATALOG.map(c => c.type));

// ─── Model (lazy, cached) ─────────────────────────────────────────────────────

let modelPromise: Promise<TensorflowModel> | null = null;

function getModel(): Promise<TensorflowModel> {
  if (!modelPromise) {
    modelPromise = loadTensorflowModel(MODEL_ASSET, []); // [] = default CPU delegate
  }
  return modelPromise;
}

/** Test-only: drop the cached model so the next call reloads it. */
export function __resetModelForTests(): void {
  modelPromise = null;
}

/**
 * Whether the classifier model can be used. Never throws — a load failure
 * (e.g. the native runtime isn't present) resolves to `false`.
 */
export async function isLlmAvailable(): Promise<boolean> {
  try {
    await getModel();
    return true;
  } catch {
    modelPromise = null; // allow a retry next time
    return false;
  }
}

// ─── Tokenizer (must mirror train_colab.py) ──────────────────────────────────

/**
 * Title → fixed-length int token ids. Reuses `normalize()` (lowercase,
 * accent-fold, de-punctuate), splits on whitespace, maps each token to its
 * vocab id (OOV → 1), truncates to MAXLEN and right-pads with 0.
 */
export function tokenize(title: string): Int32Array {
  const ids = new Int32Array(MAXLEN); // zero-filled = PAD_ID
  const tokens = normalize(title).split(' ').filter(Boolean);
  const n = Math.min(tokens.length, MAXLEN);
  for (let i = 0; i < n; i++) {
    ids[i] = VOCAB[tokens[i]] ?? OOV_ID;
  }
  return ids;
}

// ─── Output validation ────────────────────────────────────────────────────────

/**
 * Map a class label to a `PoiType` or `null`. "none"/empty/unknown → null;
 * never trust a label outside the built-in POI set.
 */
export function validatePoi(label: string | null | undefined): PoiType | null {
  if (!label) { return null; }
  const v = label.trim().toLowerCase();
  if (!v || v === 'none' || v === 'null') { return null; }
  return VALID_POI.has(v) ? (v as PoiType) : null;
}

// ─── Classification ───────────────────────────────────────────────────────────

/**
 * Classify a title into a POI type using the on-device model. Returns `null`
 * when the model is unavailable, errors, the top class is below
 * CONFIDENCE_THRESHOLD, or the predicted label is "none"/off-list.
 *
 * `lang` is accepted for API symmetry with the rule map; the model is bilingual
 * via a shared vocab and does not need it.
 */
export async function classifyPoi(
  title: string,
  _lang: SupportedLang,
): Promise<PoiType | null> {
  if (!title || !title.trim()) { return null; }

  let model: TensorflowModel;
  try {
    model = await getModel();
  } catch {
    modelPromise = null;
    return null;
  }

  let probs: Float32Array;
  try {
    // runSync takes/returns ArrayBuffer[]; input is the int32 token tensor,
    // output is the float32 softmax over the classes.
    const outputs = model.runSync([tokenize(title).buffer as ArrayBuffer]);
    probs = new Float32Array(outputs[0]);
  } catch {
    return null;
  }
  if (!probs || probs.length === 0) { return null; }

  let bestIdx = 0;
  let bestP = -1;
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] > bestP) { bestP = probs[i]; bestIdx = i; }
  }
  if (bestP < CONFIDENCE_THRESHOLD) { return null; }
  return validatePoi(LABELS[bestIdx]);
}

// ─── Learn-back ───────────────────────────────────────────────────────────────

/** Where a learned keyword came from. */
export type LearnSource = 'llm' | 'user';

/**
 * Record a confirmed title→POI signal: register it into the in-memory learned
 * layer immediately (so it works this session) and persist it to Firestore (so
 * it survives a restart). The whole normalized title is stored as a phrase
 * keyword — a safe, false-positive-free match for an identical future title.
 *
 * Best-effort: a persistence failure is swallowed so it never breaks an import.
 */
export async function learnPoiKeyword(
  uid: string,
  title: string,
  poi: PoiResolution,
  lang: SupportedLang,
  source: LearnSource,
): Promise<void> {
  registerLearnedKeyword(title, poi, lang);
  try {
    await persistLearnedKeyword(uid, { keyword: title, poi, lang, source });
  } catch {
    // non-fatal — the in-memory registration still stands for this session.
  }
}

/** Learn-back from a model classification (source = 'llm'). */
export function learnFromClassification(
  uid: string,
  title: string,
  poi: PoiResolution,
  lang: SupportedLang,
): Promise<void> {
  return learnPoiKeyword(uid, title, poi, lang, 'llm');
}

/** Learn-back from a manual user POI edit (source = 'user'; KAN-197 wires this). */
export function learnFromUserEdit(
  uid: string,
  title: string,
  poi: PoiResolution,
  lang: SupportedLang,
): Promise<void> {
  return learnPoiKeyword(uid, title, poi, lang, 'user');
}
