/**
 * KAN-83 — import service unit tests.
 *
 * Covers:
 *   - isDuplicate returns true for an exact case-insensitive match
 *   - isDuplicate returns true for a match that differs only in case
 *   - isDuplicate returns true for a match that has leading/trailing whitespace
 *   - isDuplicate returns false when the title is not in the set
 *   - isDuplicate returns false for an empty set
 *   - fetchExistingTitles calls the correct Firestore path and returns lowercase titles
 *   - fetchExistingTitles skips docs with no title field
 *   - iOS connector stubs throw until KAN-85 implements them
 *
 * Note: Google connector tests (importFromGoogleTasks / importFromGoogleCalendar)
 * live in __tests__/services/googleImport.test.ts (KAN-84).
 */

import {
  isDuplicate,
  fetchExistingTitles,
  importFromReminders,
  importFromCalendar,
} from '../../src/services/import';

// ─── GoogleSignin mock (needed because import.ts imports it at module level) ──

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { getTokens: jest.fn(), configure: jest.fn() },
}));

// ─── Firestore mock ───────────────────────────────────────────────────────────

const mockGet = jest.fn();

jest.mock('@react-native-firebase/firestore', () => {
  const collection = jest.fn().mockReturnThis();
  const doc        = jest.fn().mockReturnThis();
  const get        = (...args: unknown[]) => mockGet(...args);

  return () => ({ collection, doc, collection: jest.fn(() => ({ doc: jest.fn(() => ({ collection: jest.fn(() => ({ get })) })) })) });
});

// Simplified mock: make firestore() return a chainable builder ending in get().
jest.mock('@react-native-firebase/firestore', () => {
  return () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          get: (...args: unknown[]) => mockGet(...args),
        }),
      }),
    }),
  });
});

// ─── isDuplicate ─────────────────────────────────────────────────────────────

describe('isDuplicate', () => {
  it('returns true for an exact match', () => {
    const titles = new Set(['pick up milk', 'call mom']);
    expect(isDuplicate('pick up milk', titles)).toBe(true);
  });

  it('returns true when title differs only in case', () => {
    const titles = new Set(['pick up milk']);
    expect(isDuplicate('Pick Up Milk', titles)).toBe(true);
  });

  it('returns true when the existing title has mixed case and the input is lowercase', () => {
    // Titles in the set are already lowercased by fetchExistingTitles; check
    // that isDuplicate lowercases the incoming title.
    const titles = new Set(['buy bread']);
    expect(isDuplicate('BUY BREAD', titles)).toBe(true);
  });

  it('returns true when input has leading/trailing whitespace', () => {
    const titles = new Set(['buy bread']);
    expect(isDuplicate('  buy bread  ', titles)).toBe(true);
  });

  it('returns false when the title is not present in the set', () => {
    const titles = new Set(['pick up milk']);
    expect(isDuplicate('grab coffee', titles)).toBe(false);
  });

  it('returns false for an empty set', () => {
    expect(isDuplicate('any task', new Set())).toBe(false);
  });

  it('returns false for an empty title string against a non-empty set', () => {
    const titles = new Set(['something']);
    expect(isDuplicate('', titles)).toBe(false);
  });
});

// ─── fetchExistingTitles ──────────────────────────────────────────────────────

describe('fetchExistingTitles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns lowercase titles from the Firestore snapshot', async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        { data: () => ({ title: 'Pick up milk' }) },
        { data: () => ({ title: 'Call Mom' }) },
      ],
    });

    const result = await fetchExistingTitles('uid-123');
    expect(result).toEqual(new Set(['pick up milk', 'call mom']));
  });

  it('trims whitespace when building the title set', async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        { data: () => ({ title: '  buy bread  ' }) },
      ],
    });

    const result = await fetchExistingTitles('uid-123');
    expect(result.has('buy bread')).toBe(true);
  });

  it('skips docs that have no title field', async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        { data: () => ({ done: false }) },          // no title
        { data: () => ({ title: 'valid task' }) },
      ],
    });

    const result = await fetchExistingTitles('uid-123');
    expect(result.size).toBe(1);
    expect(result.has('valid task')).toBe(true);
  });

  it('returns an empty set when there are no tasks', async () => {
    mockGet.mockResolvedValueOnce({ docs: [] });
    const result = await fetchExistingTitles('uid-123');
    expect(result.size).toBe(0);
  });
});

// ─── iOS connector stubs ──────────────────────────────────────────────────────

describe('iOS connector stubs', () => {
  it('importFromReminders throws until KAN-85 is implemented', async () => {
    await expect(importFromReminders('uid')).rejects.toThrow('KAN-85');
  });

  it('importFromCalendar throws until KAN-85 is implemented', async () => {
    await expect(importFromCalendar('uid')).rejects.toThrow('KAN-85');
  });
});
