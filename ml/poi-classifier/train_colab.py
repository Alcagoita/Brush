"""
KAN-196 — train the on-device POI text classifier (run in Google Colab).

Pure TensorFlow/Keras (works on Colab's Python 3.12 — unlike
mediapipe-model-maker, which caps at 3.11). Produces three artifacts:

  model.tflite   — average-word-embedding classifier, int32 input [1, MAXLEN]
  vocab.json     — token -> id map (id 0 = pad, 1 = OOV)
  labels.json    — class index -> POI label (argmax order)

Run on-device via react-native-fast-tflite (Android + iOS, offline, all phones).
The JS layer tokenizes the title the SAME way this script does (see
"TOKENIZER CONTRACT" below) and feeds the int sequence to the model.

────────────────────────────────────────────────────────────────────────────
COLAB STEPS (~3 min, CPU is fine):
  1. Upload train.csv + validation.csv (from generate_dataset.py).
  2. Cell:  !pip install -q tensorflow
  3. Cell:  %run train_colab.py     (or paste contents)
  4. Download model.tflite, vocab.json, labels.json. Hand them back.
────────────────────────────────────────────────────────────────────────────

TOKENIZER CONTRACT (JS must match exactly):
  - lowercase
  - Unicode NFD normalize + strip combining marks (accent-fold): "café" -> "cafe"
  - split on /[^a-z0-9]+/ , drop empties
  - map each token -> vocab id, OOV -> 1
  - truncate to MAXLEN tokens; right-pad with 0 to MAXLEN
This mirrors normalize() in src/services/poiInference.ts.
"""

import csv
import json
import re
import unicodedata

import numpy as np
import tensorflow as tf

MAXLEN = 12
MAX_VOCAB = 5000
EMBED_DIM = 16
EPOCHS = 20
PAD_ID = 0
OOV_ID = 1

_SPLIT = re.compile(r"[^a-z0-9]+")


def normalize(text: str) -> list[str]:
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return [t for t in _SPLIT.split(text) if t]


def read_csv(path):
    texts, labels = [], []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            texts.append(row["text"])
            labels.append(row["label"])
    return texts, labels


def build_vocab(token_lists):
    freq = {}
    for toks in token_lists:
        for t in toks:
            freq[t] = freq.get(t, 0) + 1
    ordered = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))
    vocab = {}  # token -> id ; 0=pad, 1=oov reserved
    for i, (tok, _) in enumerate(ordered[: MAX_VOCAB - 2]):
        vocab[tok] = i + 2
    return vocab


def encode(tokens, vocab):
    ids = [vocab.get(t, OOV_ID) for t in tokens][:MAXLEN]
    ids += [PAD_ID] * (MAXLEN - len(ids))
    return ids


def main():
    tr_texts, tr_labels = read_csv("train.csv")
    va_texts, va_labels = read_csv("validation.csv")

    tr_tokens = [normalize(t) for t in tr_texts]
    va_tokens = [normalize(t) for t in va_texts]

    vocab = build_vocab(tr_tokens)
    labels = sorted(set(tr_labels))
    label_to_idx = {l: i for i, l in enumerate(labels)}

    x_tr = np.array([encode(t, vocab) for t in tr_tokens], dtype=np.int32)
    y_tr = np.array([label_to_idx[l] for l in tr_labels], dtype=np.int32)
    x_va = np.array([encode(t, vocab) for t in va_tokens], dtype=np.int32)
    y_va = np.array([label_to_idx[l] for l in va_labels], dtype=np.int32)

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(MAXLEN,), dtype="int32", name="tokens"),
        tf.keras.layers.Embedding(MAX_VOCAB, EMBED_DIM, mask_zero=True),
        tf.keras.layers.GlobalAveragePooling1D(),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(len(labels), activation="softmax"),
    ])
    model.compile(optimizer="adam",
                  loss="sparse_categorical_crossentropy",
                  metrics=["accuracy"])
    model.fit(x_tr, y_tr, validation_data=(x_va, y_va),
              epochs=EPOCHS, batch_size=32, verbose=2)

    loss, acc = model.evaluate(x_va, y_va, verbose=0)
    print(f"\nValidation accuracy: {acc:.4f}")

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite = converter.convert()
    with open("model.tflite", "wb") as f:
        f.write(tflite)
    with open("vocab.json", "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False)
    with open("labels.json", "w", encoding="utf-8") as f:
        json.dump(labels, f, ensure_ascii=False)

    print(f"Wrote model.tflite ({len(tflite)/1024:.0f} KB), "
          f"vocab.json ({len(vocab)} tokens), labels.json ({len(labels)} classes)")
    print("MAXLEN =", MAXLEN, " (JS tokenizer must pad/truncate to this)")


if __name__ == "__main__":
    main()
