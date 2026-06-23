# BrushPoiClassifier (KAN-196)

On-device LLM POI classifier, consumed by `src/services/poiLlm.ts` via
`requireOptionalNativeModule('BrushPoiClassifier')`. When the module is absent or
the device is unsupported, the app falls back to the rule-map dictionary
(KAN-195) — POI inference never breaks.

## Surface

```typescript
isAvailable(): Promise<boolean>
classify(title: string, allowed: string[], lang: string): Promise<string | null>
```

## Android — Gemini Nano via AICore

Uses the experimental Google AI Edge SDK (`com.google.ai.edge.aicore:aicore:0.0.1-exp01`).

**Device-gated**: AICore + Gemini Nano is currently limited to Pixel 8/9-series
(and other AICore-enabled devices). On anything else `isAvailable()` returns
`false`. The experimental SDK is **not for production** — keep it behind the
capability guard.

### Build & verify (Android dev build)

1. Prebuild / sync so autolinking picks up the local module:

   ```bash
   npx expo prebuild -p android
   ```

2. Build a dev client onto a supported physical device (not an emulator):

   ```bash
   npx expo run:android --device
   ```

3. Ensure AICore is installed/updated on the device (Play Store → "Android
   System Intelligence" / AICore) and the device is enrolled for Gemini Nano
   experimental access.
4. Smoke test from JS:

   ```ts
   import { isLlmAvailable, classifyPoi } from './src/services/poiLlm';
   await isLlmAvailable();              // expect true on a supported device
   await classifyPoi('pick up amoxicillin', 'en'); // expect 'pharmacy'
   ```

If the build surfaces API mismatches in `BrushPoiClassifierModule.kt`
(`generationConfig` fields, `prepareInferenceEngine`, `generateContent`), adjust
against the installed `aicore` version — the surface here targets `exp01`.

## iOS

Stub only — `isAvailable()` returns `false`, `classify()` returns `nil`. Apple
Foundation Models do not run on the simulator; a future ticket can implement
on-device inference behind the same surface with no JS changes.
