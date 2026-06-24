# POI text classifier (KAN-196)

On-device, cross-platform (Android + iOS), offline POI inference — the second
pass after the KAN-195 rule map. A small TFLite **average-word-embedding text
classifier** maps a task title to one of the 16 POI types or `none`. Runs via
[`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite)
(JSI, Android + iOS) — no hardware gate, no model download, tiny bundled asset.

Replaces the hardware-gated Gemini Nano / AICore approach (Pixel 8/9 only).

## Files

| File | What |
|------|------|
| `poi_keywords.json` | Seed keywords per POI label (EN + pt-PT) + a `none` class. Mirrors the seed in `src/services/poiInference.ts` — keep in sync. |
| `generate_dataset.py` | Synthesizes `train.csv` / `validation.csv` (templates + typo augmentation, bilingual). Stdlib only. |
| `train_colab.py` | Trains (pure TF/Keras) + exports `model.tflite`, `vocab.json`, `labels.json`. |

## Why pure TensorFlow (not mediapipe-model-maker)

`mediapipe-model-maker` caps at Python 3.11; Colab now runs 3.12. Plain
TF/Keras trains fine on 3.12 and gives a TFLite model we run through
`react-native-fast-tflite`, doing tokenization in JS. Simpler and avoids the
broken installer + MediaPipe native deps on both platforms.

## Pipeline

### 1. Generate the dataset (local, any Python 3)

```bash
cd ml/poi-classifier
python3 generate_dataset.py --per-class 1000
# → train.csv, validation.csv  (17 classes: 16 POI + none)
```

### 2. Train + export (Google Colab, free, ~3 min)

1. New Colab notebook.
2. Upload `train.csv`, `validation.csv`.
3. Cell: `!pip install -q tensorflow`
4. Cell: paste `train_colab.py` contents (or `%run train_colab.py`).
5. Download `model.tflite`, `vocab.json`, `labels.json`.

### 3. Hand the 3 artifacts back

They get bundled into `assets/poi-model` (model asset + vocab/labels shipped
with the JS, loaded by `src/services/poiLlm.ts`). Commit them.

## Tokenizer contract (JS must match `train_colab.py` exactly)

- lowercase
- Unicode NFD normalize + strip combining marks (accent-fold): `café` → `cafe`
- split on `/[^a-z0-9]+/`, drop empties
- map token → `vocab.json` id; OOV → `1`; pad id `0`
- truncate to `MAXLEN` (12) tokens; right-pad with `0`

This is exactly `normalize()` in `src/services/poiInference.ts` — reuse it.

## Then: native integration (next step, separate change)

- Add `react-native-fast-tflite` (+ Expo config plugin) — Android + iOS.
- Bundle `model.tflite`; ship `vocab.json` / `labels.json` with the JS.
- In `src/services/poiLlm.ts` `classifyPoi(title, lang)`: tokenize (shared
  `normalize`) → int[12] → run model → softmax argmax → if confidence ≥ threshold
  and label ≠ `none`, return the label (validated against `PoiType`); else `null`.
- Rule map (KAN-195) stays the fast exact first pass; classifier is the second pass.

## Retraining / growing

The dictionary self-grows (learned layer + user edits, KAN-195/197). Periodically:
1. Update `poi_keywords.json` (and/or fold in confirmed learn-back pairs).
2. Re-run steps 1–3, commit refreshed `model.tflite` + `vocab.json` + `labels.json`.
