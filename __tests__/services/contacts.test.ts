/**
 * Unit tests for contacts service (KAN-99).
 *
 * Covers:
 *   hashContact
 *     - produces the same output for the same normalised input
 *     - normalises to lowercase before hashing
 *     - different inputs produce different hashes
 *     - trims whitespace before hashing
 *   registerInDiscovery
 *     - calls setDoc with the hashed value and { uid }
 *     - handles email and phone separately
 *   unregisterFromDiscovery
 *     - calls deleteDoc with the hashed value
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSetDoc    = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDoc    = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc:          jest.fn((_db: unknown, ...segs: string[]) => ({ _path: segs.join('/') })),
  setDoc:       (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc:    (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc:       (...args: unknown[]) => mockGetDoc(...args),
  collection:   jest.fn(),
}));

jest.mock('react-native-permissions', () => ({
  check:       jest.fn(),
  request:     jest.fn(),
  PERMISSIONS: { IOS: { CONTACTS: 'ios.permission.CONTACTS' }, ANDROID: { READ_CONTACTS: 'android.permission.READ_CONTACTS' } },
  RESULTS:     { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked', UNAVAILABLE: 'unavailable' },
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

import {
  hashContact,
  registerInDiscovery,
  unregisterFromDiscovery,
} from '../../src/services/contacts';

// ─── hashContact ──────────────────────────────────────────────────────────────

describe('hashContact', () => {
  it('produces the same output for the same input', async () => {
    const h1 = await hashContact('alice@example.com');
    const h2 = await hashContact('alice@example.com');
    expect(h1).toBe(h2);
  });

  it('normalises to lowercase — ALICE@EXAMPLE.COM hashes the same as alice@example.com', async () => {
    const lower = await hashContact('alice@example.com');
    const upper = await hashContact('ALICE@EXAMPLE.COM');
    expect(lower).toBe(upper);
  });

  it('trims whitespace before hashing', async () => {
    const clean   = await hashContact('alice@example.com');
    const padded  = await hashContact('  alice@example.com  ');
    expect(clean).toBe(padded);
  });

  it('different inputs produce different hashes', async () => {
    const h1 = await hashContact('alice@example.com');
    const h2 = await hashContact('bob@example.com');
    expect(h1).not.toBe(h2);
  });

  it('returns a non-empty string', async () => {
    const h = await hashContact('test@test.com');
    expect(typeof h).toBe('string');
    expect(h.length).toBeGreaterThan(0);
  });
});

// ─── registerInDiscovery ──────────────────────────────────────────────────────

describe('registerInDiscovery', () => {
  beforeEach(() => { jest.clearAllMocks(); mockSetDoc.mockResolvedValue(undefined); });

  it('calls setDoc with { uid } for the hashed email', async () => {
    await registerInDiscovery('uid-1', 'alice@example.com');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data).toEqual({ uid: 'uid-1' });
  });

  it('writes two entries when phone is also provided', async () => {
    await registerInDiscovery('uid-1', 'alice@example.com', '+351912345678');
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
  });

  it('the doc path contains userDiscovery', async () => {
    await registerInDiscovery('uid-1', 'alice@example.com');
    const [ref] = mockSetDoc.mock.calls[0];
    expect(ref._path).toContain('userDiscovery');
  });
});

// ─── unregisterFromDiscovery ──────────────────────────────────────────────────

describe('unregisterFromDiscovery', () => {
  beforeEach(() => { jest.clearAllMocks(); mockDeleteDoc.mockResolvedValue(undefined); });

  it('calls deleteDoc for the hashed email', async () => {
    await unregisterFromDiscovery('alice@example.com');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const [ref] = mockDeleteDoc.mock.calls[0];
    expect(ref._path).toContain('userDiscovery');
  });

  it('deletes two entries when phone is also provided', async () => {
    await unregisterFromDiscovery('alice@example.com', '+351912345678');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
  });
});
