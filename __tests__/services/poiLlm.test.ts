/**
 * KAN-196 — on-device POI classifier (fast-tflite) + learn-back unit tests.
 *
 * react-native-fast-tflite is mocked — real inference runs on-device. The real
 * vocab.json / labels.json / tokenizer are exercised; the model output is faked.
 *
 * Covers:
 *   tokenize       — vocab ids, OOV, pad/truncate to MAXLEN
 *   validatePoi    — valid label, none/empty/off-list → null
 *   isLlmAvailable — model loads → true; load throws → false
 *   classifyPoi    — empty → null, valid → POI, below threshold → null,
 *                    "none" → null, inference throws → null, load fails → null
 *   learn-back     — registers into the dictionary learned layer + persists
 */

const mockLoad = jest.fn();
const mockRunSync = jest.fn();

jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: (...a: unknown[]) => mockLoad(...a),
}));

const mockPersist = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore', () => ({
  persistLearnedKeyword: (...a: unknown[]) => mockPersist(...a),
}));

import {
  tokenize,
  validatePoi,
  isLlmAvailable,
  classifyPoi,
  learnPoiKeyword,
  learnFromClassification,
  learnFromUserEdit,
  CONFIDENCE_THRESHOLD,
  __resetModelForTests,
} from '../../src/services/poiLlm';
import { inferPoiFromRules, clearLearnedKeywords } from '../../src/services/poiInference';
import labels from '../../assets/poi-model/labels.json';

const LABELS = labels as string[];
const idxOf = (label: string) => LABELS.indexOf(label);

/** Build a fake softmax output peaking at class `idx`. */
function probs(idx: number, p = 0.9): Float32Array {
  const a = new Float32Array(LABELS.length).fill((1 - p) / (LABELS.length - 1));
  a[idx] = p;
  return a;
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetModelForTests();
  clearLearnedKeywords();
  mockLoad.mockResolvedValue({ runSync: mockRunSync });
});

// ─── tokenize ─────────────────────────────────────────────────────────────────

describe('tokenize', () => {
  it('maps known tokens to their vocab ids and right-pads with 0', () => {
    const ids = Array.from(tokenize('buy bread'));
    expect(ids.length).toBe(12);
    expect(ids[0]).toBeGreaterThan(1); // "buy" known
    expect(ids[1]).toBeGreaterThan(1); // "bread" known
    expect(ids.slice(2).every(x => x === 0)).toBe(true);
  });

  it('maps unknown tokens to OOV (1)', () => {
    const ids = Array.from(tokenize('zzzqqq'));
    expect(ids[0]).toBe(1);
  });

  it('accent-folds and lowercases before lookup (matches training)', () => {
    expect(Array.from(tokenize('Pão'))).toEqual(Array.from(tokenize('pao')));
  });

  it('truncates to 12 tokens', () => {
    const ids = tokenize('a b c d e f g h i j k l m n o p');
    expect(ids.length).toBe(12);
  });
});

// ─── validatePoi ──────────────────────────────────────────────────────────────

describe('validatePoi', () => {
  it('accepts a built-in POI label', () => {
    expect(validatePoi('pharmacy')).toBe('pharmacy');
    expect(validatePoi('  SALON ')).toBe('salon');
  });
  it('treats none/null/empty as no result', () => {
    expect(validatePoi('none')).toBeNull();
    expect(validatePoi('')).toBeNull();
    expect(validatePoi(null)).toBeNull();
  });
  it('rejects an off-list label', () => {
    expect(validatePoi('spaceship')).toBeNull();
  });
});

// ─── isLlmAvailable ───────────────────────────────────────────────────────────

describe('isLlmAvailable', () => {
  it('returns true when the model loads', async () => {
    await expect(isLlmAvailable()).resolves.toBe(true);
  });
  it('returns false (no throw) when the model fails to load', async () => {
    mockLoad.mockReset();
    mockLoad.mockRejectedValue(new Error('no tflite runtime'));
    await expect(isLlmAvailable()).resolves.toBe(false);
  });
});

// ─── classifyPoi ──────────────────────────────────────────────────────────────

describe('classifyPoi', () => {
  it('returns null for an empty title without loading the model', async () => {
    expect(await classifyPoi('   ', 'en')).toBeNull();
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('returns the top POI label above the confidence threshold', async () => {
    mockRunSync.mockReturnValue([probs(idxOf('pharmacy'), 0.92)]);
    expect(await classifyPoi('pick up amoxicillin', 'en')).toBe('pharmacy');
  });

  it('returns null when the top probability is below threshold', async () => {
    mockRunSync.mockReturnValue([probs(idxOf('pharmacy'), CONFIDENCE_THRESHOLD - 0.1)]);
    expect(await classifyPoi('something vague', 'en')).toBeNull();
  });

  it('returns null when the top class is "none"', async () => {
    mockRunSync.mockReturnValue([probs(idxOf('none'), 0.95)]);
    expect(await classifyPoi('call mom', 'en')).toBeNull();
  });

  it('returns null when inference throws', async () => {
    mockRunSync.mockImplementation(() => { throw new Error('inference failed'); });
    expect(await classifyPoi('buy milk', 'en')).toBeNull();
  });

  it('returns null when the model cannot load', async () => {
    mockLoad.mockReset();
    mockLoad.mockRejectedValue(new Error('no runtime'));
    expect(await classifyPoi('buy milk', 'en')).toBeNull();
  });
});

// ─── learn-back ───────────────────────────────────────────────────────────────

describe('learn-back', () => {
  it('registers the title into the dictionary learned layer', async () => {
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
    await learnFromUserEdit('uid-1', 'Levar o carro a oficina', 'store', 'pt-PT');
    expect(mockPersist).toHaveBeenCalledWith('uid-1', {
      keyword: 'Levar o carro a oficina', poi: 'store', lang: 'pt-PT', source: 'user',
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
