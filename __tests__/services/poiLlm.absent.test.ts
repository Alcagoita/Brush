/**
 * KAN-196 — poiLlm behaviour when the native module is ABSENT.
 *
 * Mocks `requireOptionalNativeModule` to return null for the whole file (the
 * common case: any platform/build without BrushPoiClassifier compiled in, or an
 * unsupported device). Everything must degrade to null/false, never throw.
 */

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: () => null,
}));

const mockPersist = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore', () => ({
  persistLearnedKeyword: (...a: unknown[]) => mockPersist(...a),
}));

import { isLlmAvailable, classifyPoi } from '../../src/services/poiLlm';

describe('poiLlm with an absent native module', () => {
  it('isLlmAvailable resolves false', async () => {
    await expect(isLlmAvailable()).resolves.toBe(false);
  });

  it('classifyPoi resolves null without throwing', async () => {
    await expect(classifyPoi('pick up amoxicillin', 'en')).resolves.toBeNull();
  });
});
