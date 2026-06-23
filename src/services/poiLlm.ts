/**
 * src/services/poiLlm.ts — KAN-196
 *
 * On-device LLM fallback for POI inference, plus dictionary learn-back. This is
 * the SECOND pass: titles the rule map (KAN-195) returns `null` for can be sent
 * to a free, on-device model. No Anthropic/cloud key, no billing, offline-capable.
 *
 * The model itself lives in a native module (`BrushPoiClassifier`):
 *   - Android: ML Kit GenAI / Gemini Nano (the supported path).
 *   - iOS: Apple Foundation Models — stub for now (won't run on the simulator),
 *     so the capability guard simply reports unavailable and we fall back to null.
 *
 * The native module is loaded *optionally*: on any platform/build where it is
 * absent, `requireOptionalNativeModule` returns null and every entry point here
 * degrades to `null` — POI inference never throws or blocks on the LLM.
 *
 * ── Learn-back ────────────────────────────────────────────────────────────
 * When the model (or a user edit, KAN-197) confidently resolves a title to a
 * POI, we feed that back into the dictionary's learned layer (KAN-195) AND
 * persist it to Firestore so it survives a restart. Next time, the rule map
 * catches the title for free — no LLM call — and the dictionary self-improves.
 */

import { requireOptionalNativeModule } from 'expo-modules-core';
import type { PoiType } from '../types';
import { POI_CATALOG } from '../types';
import {
  registerLearnedKeyword,
  type PoiResolution,
  type SupportedLang,
} from './poiInference';
import { persistLearnedKeyword } from './firestore';

// ─── Native module boundary ───────────────────────────────────────────────────

interface PoiClassifierNativeModule {
  /** True only when an on-device model is present and ready on this device. */
  isAvailable(): Promise<boolean>;
  /**
   * Classify `title` into one of `allowed` POI types (or "none").
   * Implementations must constrain output to the allowed list; we re-validate
   * anyway and never trust freeform text.
   */
  classify(title: string, allowed: string[], lang: string): Promise<string | null>;
}

/** Null on any platform/build without the native module compiled in. */
const Native = requireOptionalNativeModule<PoiClassifierNativeModule>('BrushPoiClassifier');

/** Per-call hard timeout — a slow model must not stall an import. */
export const LLM_TIMEOUT_MS = 4_000;

/** The set of valid built-in POI type strings the model may return. */
const VALID_POI = new Set<string>(POI_CATALOG.map(c => c.type));

// ─── Output validation ────────────────────────────────────────────────────────

/**
 * Coerce raw model output to a `PoiType` or `null`. Trims/lowercases, treats
 * "none"/"null"/empty as no-result, and rejects anything not in the built-in
 * POI set. The model's text is never trusted directly.
 */
export function validatePoi(raw: string | null | undefined): PoiType | null {
  if (!raw) { return null; }
  const v = raw.trim().toLowerCase();
  if (!v || v === 'none' || v === 'null') { return null; }
  return VALID_POI.has(v) ? (v as PoiType) : null;
}

// ─── Capability guard ─────────────────────────────────────────────────────────

/**
 * Whether the on-device model can be used right now. Never throws — any error
 * (missing module, native exception) resolves to `false`.
 */
export async function isLlmAvailable(): Promise<boolean> {
  if (!Native) { return false; }
  try { return await Native.isAvailable(); }
  catch { return false; }
}

// ─── Classification ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Infer a POI type from a title using the on-device model. Returns `null` when
 * the model is unavailable, times out, errors, or returns anything off-list.
 * `null` is a valid, expected result — callers must treat it as "no POI".
 */
export async function classifyPoi(
  title: string,
  lang: SupportedLang,
): Promise<PoiType | null> {
  if (!title || !title.trim() || !Native) { return null; }
  if (!(await isLlmAvailable())) { return null; }

  let raw: string | null;
  try {
    raw = await withTimeout(Native.classify(title, [...VALID_POI], lang), LLM_TIMEOUT_MS);
  } catch {
    return null;
  }
  return validatePoi(raw);
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

/** Learn-back from an LLM classification (source = 'llm'). */
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
