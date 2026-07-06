/**
 * KAN-196 — learned-keyword Firestore persistence (persistLearnedKeyword /
 * loadLearnedKeywords).
 *
 * Firestore is mocked (the repo unit-test convention — @react-native-firebase is
 * a native module with no JS runtime in Jest; emulator-backed coverage would
 * live in Detox e2e). poiInference is the REAL module, so loadLearnedKeywords →
 * registerLearnedKeyword → inferPoiFromRules is exercised end to end.
 */

import {
  persistLearnedKeyword,
  loadLearnedKeywords,
} from '../../src/services/firestore';
import { inferPoiFromRules, clearLearnedKeywords } from '../../src/services/poiInference';

const mockSetDoc       = jest.fn().mockResolvedValue(undefined);
const mockGetDocs      = jest.fn().mockResolvedValue({ docs: [] });
const mockDoc          = jest.fn((_ref: any, id?: string) => ({ id }));
const mockServerTs     = jest.fn(() => ({ _methodName: 'serverTimestamp' }));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(() => ({})),
  collection:      jest.fn(() => ({})),
  doc:             (ref: any, id?: string) => mockDoc(ref, id),
  getDoc:          jest.fn(),
  getDocs:         (...args: any[]) => mockGetDocs(...args),
  setDoc:          (...args: any[]) => mockSetDoc(...args),
  addDoc:          jest.fn().mockResolvedValue({ id: 'mock-id' }),
  updateDoc:       jest.fn().mockResolvedValue(undefined),
  deleteDoc:       jest.fn().mockResolvedValue(undefined),
  writeBatch:      jest.fn(() => ({ set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) })),
  query:           jest.fn(c => c),
  where:           jest.fn(),
  orderBy:         jest.fn(),
  onSnapshot:      jest.fn(() => jest.fn()),
  serverTimestamp: () => mockServerTs(),
  increment:       jest.fn(n => n),
  Timestamp:       { now: jest.fn(), fromDate: jest.fn() },
  limit:           jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  clearLearnedKeywords();
});

describe('persistLearnedKeyword', () => {
  it('upserts the normalized keyword with its fields + serverTimestamp', async () => {
    await persistLearnedKeyword('uid-1', {
      keyword: '  Buy Guarana  ', poi: 'supermarket', lang: 'en', source: 'llm',
    });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toEqual({
      keyword: 'buy guarana',
      poi: 'supermarket',
      lang: 'en',
      source: 'llm',
      updatedAt: { _methodName: 'serverTimestamp' },
    });
  });

  it('keys the doc id by "<lang>:<normalized keyword>"', async () => {
    await persistLearnedKeyword('uid-1', {
      keyword: 'Farmácia', poi: 'pharmacy', lang: 'pt-PT', source: 'user',
    });
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'pt-PT:farmacia');
  });

  it('is a no-op when the keyword normalizes to empty', async () => {
    await persistLearnedKeyword('uid-1', { keyword: '  !! ', poi: 'cafe', lang: 'en', source: 'llm' });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('loadLearnedKeywords', () => {
  it('rehydrates the learned layer so the rule map matches loaded keywords', async () => {
    expect(inferPoiFromRules('refill insulin', 'en')).toBeNull();
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ data: () => ({ keyword: 'refill insulin', poi: 'pharmacy', lang: 'en', source: 'llm' }) }],
    });
    await loadLearnedKeywords('uid-1');
    expect(inferPoiFromRules('refill insulin', 'en')).toBe('pharmacy');
  });

  it('skips malformed docs without throwing', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ keyword: 'no poi here', lang: 'en' }) },        // missing poi
        { data: () => ({ poi: 'cafe', lang: 'en' }) },                    // missing keyword
        { data: () => ({ keyword: 'good one', poi: 'gym', lang: 'en' }) },
      ],
    });
    await expect(loadLearnedKeywords('uid-1')).resolves.toBeUndefined();
    expect(inferPoiFromRules('no poi here', 'en')).toBeNull();
    expect(inferPoiFromRules('good one', 'en')).toBe('gym');
  });

  it('skips a doc with an unsupported lang instead of throwing and aborting the rest of the batch (review fix)', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'bad', data: () => ({ keyword: 'bomba', poi: 'gas_station', lang: 'es' }) }, // unsupported lang
        { id: 'good', data: () => ({ keyword: 'after the bad doc', poi: 'gym', lang: 'en' }) },
      ],
    });
    await expect(loadLearnedKeywords('uid-1')).resolves.toBeUndefined();
    expect(inferPoiFromRules('bomba', 'en')).toBeNull();
    expect(inferPoiFromRules('after the bad doc', 'en')).toBe('gym');
  });
});
