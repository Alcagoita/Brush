# POI text classifier (KAN-196)

On-device, cross-platform (Android + iOS), offline POI inference — the second
pass after the KAN-195 rule map. A small TFLite **average-word-embedding text
classifier** maps a task title to one of the 16 POI types or `none`. Runs via
MediaPipe Tasks `TextClassifier` on essentially all phones — no hardware gate,
no model download, ~1–5 MB bundled asset.

This replaces the hardware-gated Gemini Nano / AICore approach (Pixel 8/9 only).

## Files

| File | What |
|------|------|
| `poi_keywords.json` | Seed keywords per POI label (EN + pt-PT) + a `none` class. Mirrors the seed in `src/services/poiInference.ts` — keep in sync. |
| `generate_dataset.py` | Synthesizes `train.csv` / `validation.csv` from the keywords (templates + typo augmentation, bilingual). Stdlib only. |
| `train_colab.py` | Trains + exports `poi_classifier.tflite` (+ `labels.txt`). Run in Colab. |

## Pipeline

### 1. Generate the dataset (local, any Python 3)

```bash
cd ml/poi-classifier
python3 generate_dataset.py --per-class 1000
# → train.csv, validation.csv  (17 classes: 16 POI + none)
```

### 2. Train + export (Google Colab, free, ~5 min)

`mediapipe-model-maker` needs Python 3.11/3.12 — **Colab**, not this machine
(Python 3.14 here can't install TensorFlow).

1. New Colab notebook.
2. Upload `train.csv`, `validation.csv`.
3. Run:
   ```python
   !pip install -q mediapipe-model-maker
   %run train_colab.py   # or paste its contents
   ```
4. Download `exported_model/poi_classifier.tflite` and `labels.txt`.

### 3. Commit the model

Drop `poi_classifier.tflite` into the native module's asset folder (added in the
integration step) and commit it. The labels order is embedded in the model
metadata; `labels.txt` is the human-readable reference.

## Then: native integration (next step, separate change)

- Bundle `poi_classifier.tflite` in `modules/brush-poi-classifier`.
- Android (Kotlin): `com.google.mediapipe:tasks-text` `TextClassifier`.
- iOS (Swift): `MediaPipeTasksText` `TextClassifier`.
- Same JS boundary as today (`classifyPoi(title, lang)` in `src/services/poiLlm.ts`):
  run the model, take the top category, apply a confidence threshold, return the
  POI type or `null`. Output is still validated against the built-in `PoiType` set.

## Retraining / growing

The dictionary is self-growing (learned layer + user edits, KAN-195/197). Periodically:
1. Update `poi_keywords.json` (and/or export confirmed learn-back pairs).
2. Re-run steps 1–3.
3. Commit the refreshed `.tflite`.
