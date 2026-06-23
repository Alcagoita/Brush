/**
 * KAN-196 — on-device LLM POI fallback + learn-back unit tests.
 *
 * The native model (`BrushPoiClassifier`) is mocked — real on-device inference
 * can only be exercised on a capable Android device via a dev build.
 *
 * Covers:
 *   validatePoi      — valid type, off-list/freeform → null, none/empty → null
 *   isLlmAvailable   — absent module / isAvailable false / throw → false
 *   classifyPoi      — unavailable → null, valid → poi, off-list → null,
 *                      timeout → null, native throw → null, empty title → null
 *   learn-back       — registers into the dictionary learned layer + persists
 */

const mockIsAvailable = jest.fn();
const mockClassify    = jest.fn();

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: () => ({
    isAvailable: (...a: unknown[]) => mockIsAvailable(...a),
    classify:    (...a: unknown[]) => mockClassify(...a),
  }),
}));

const mockPersist = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore', () => ({
  persistLearnedKeyword: (...a: unknown[]) => mockPersist(...a),
}));

import {
  validatePoi,
  isLlmAvailable,
  classifyPoi,
  learnPoiKeyword,
  learnFromClassification,
  learnFromUserEdit,
  LLM_TIMEOUT_MS,
} from '../../src/services/poiLlm';
import { inferPoiFromRules, clearLearnedKeywords } from '../../src/services/poiInference';

beforeEach(() => {
  jest.clearAllMocks();
  clearLearnedKeywords();
});

// ─── validatePoi ──────────────────────────────────────────────────────────────

describe('validatePoi', () => {
  it('accepts a valid built-in POI type', () => {
    expect(validatePoi('pharmacy')).toBe('pharmacy');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(validatePoi('  CAFE  ')).toBe('cafe');
  });

  it('rejects off-list / freeform text', () => {
    expect(validatePoi('the answer is supermarket probably')).toBeNull();
    expect(validatePoi('bakery')).toBeNull(); // not a built-in PoiType
  });

  it('treats none / null / empty as no result', () => {
    expect(validatePoi('none')).toBeNull();
    expect(validatePoi('null')).toBeNull();
    expect(validatePoi('')).toBeNull();
    expect(validatePoi(null)).toBeNull();
    expect(validatePoi(undefined)).toBeNull();
  });
});

// ─── isLlmAvailable ───────────────────────────────────────────────────────────

describe('isLlmAvailable', () => {
  it('returns true when the native module reports available', async () => {
    mockIsAvailable.mockResolvedValueOnce(true);
    await expect(isLlmAvailable()).resolves.toBe(true);
  });

  it('returns false when the native module reports unavailable', async () => {
    mockIsAvailable.mockResolvedValueOnce(false);
    await expect(isLlmAvailable()).resolves.toBe(false);
  });

  it('returns false (never throws) when the native call throws', async () => {
    mockIsAvailable.mockRejectedValueOnce(new Error('AICore missing'));
    await expect(isLlmAvailable()).resolves.toBe(false);
  });
  // Absent-native-module path (requireOptionalNativeModule → null) is covered in
  // poiLlm.absent.test.ts, which mocks the module as missing for the whole file.
});

// ─── classifyPoi ──────────────────────────────────────────────────────────────

describe('classifyPoi', () => {
  it('returns null for an empty title without calling the model', async () => {
    expect(await classifyPoi('   ', 'en')).toBeNull();
    expect(mockIsAvailable).not.toHaveBeenCalled();
  });

  it('returns null when the model is unavailable', async () => {
    mockIsAvailable.mockResolvedValueOnce(false);
    expect(await classifyPoi('pick up amoxicillin', 'en')).toBeNull();
    expect(mockClassify).not.toHaveBeenCalled();
  });

  it('returns the validated POI for a valid classification', async () => {
    mockIsAvailable.mockResolvedValueOnce(true);
    mockClassify.mockResolvedValueOnce('pharmacy');
    expect(await classifyPoi('pick up amoxicillin', 'en')).toBe('pharmacy');
  });

  it('returns null when the model emits an off-list answer', async () => {
    mockIsAvailable.mockResolvedValueOnce(true);
    mockClassify.mockResolvedValueOnce('i think a pharmacy');
    expect(await classifyPoi('pick up amoxicillin', 'en')).toBeNull();
  });

  it('returns null when the model throws', async () => {
    mockIsAvailable.mockResolvedValueOnce(true);
    mockClassify.mockRejectedValueOnce(new Error('inference failed'));
    expect(await classifyPoi('something', 'en')).toBeNull();
  });

  it('returns null when the model exceeds the timeout', async () => {
    jest.useFakeTimers();
    mockIsAvailable.mockResolvedValueOnce(true);
    mockClassify.mockReturnValueOnce(new Promise(() => {})); // never resolves

    const p = classifyPoi('slow title', 'en');
    await jest.advanceTimersByTimeAsync(LLM_TIMEOUT_MS + 1);
    await expect(p).resolves.toBeNull();
    jest.useRealTimers();
  });
});

// ─── learn-back ───────────────────────────────────────────────────────────────

describe('learn-back', () => {
  it('registers the title into the dictionary learned layer so the rule map catches it next time', async () => {
    expect(inferPoiFromRules('refill amoxicillin 500mg', 'en')).toBeNull();
    await learnPoiKeyword('uid-1', 'Refill amoxicillin 500mg', 'pharmacy', 'en', 'llm');
    expect(inferPoiFromRules('refill amoxicillin 500mg', 'en')).toBe('pharmacy');
  });

  it('persists an LLM classification with source "llm"', async () => {
    await learnFromClassification('uid-1', 'Buy guarana', 'supermarket', 'en');
    expect(mockPersist).toHaveBeenCalledWith('uid-1', {
      keyword: 'Buy guarana', poi: 'supermarket', lang: 'en', source: 'llm',
    });
  });

  it('persists a user edit with source "user"', async () => {
    await learnFromUserEdit('uid-1', 'Levar o carro à oficina', 'store', 'pt-PT');
    expect(mockPersist).toHaveBeenCalledWith('uid-1', {
      keyword: 'Levar o carro à oficina', poi: 'store', lang: 'pt-PT', source: 'user',
    });
  });

  it('still registers in-memory when persistence fails', async () => {
    mockPersist.mockRejectedValueOnce(new Error('offline'));
    await expect(
      learnPoiKeyword('uid-1', 'Walk the dog at the dog park', 'park', 'en', 'user'),
    ).resolves.toBeUndefined();
    expect(inferPoiFromRules('walk the dog at the dog park', 'en')).toBe('park');
  });
});
