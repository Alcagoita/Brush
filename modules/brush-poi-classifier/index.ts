// Local Expo module: BrushPoiClassifier (KAN-196)
//
// On-device LLM POI classifier. The JS app consumes this via
// `requireOptionalNativeModule('BrushPoiClassifier')` in src/services/poiLlm.ts,
// so this re-export is only a convenience / documentation of the surface.
//
// Native surface:
//   isAvailable(): Promise<boolean>
//   classify(title: string, allowed: string[], lang: string): Promise<string | null>
import { requireOptionalNativeModule } from 'expo-modules-core';

export default requireOptionalNativeModule('BrushPoiClassifier');
