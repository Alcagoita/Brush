/**
 * KAN-247 — users.ts: setHome / clearHome.
 *
 * Covers:
 *   - setHome stamps updatedAt and writes the full home object
 *   - clearHome writes a deleteField() sentinel for the home key
 *   - both reject when the given uid doesn't match the signed-in user
 */

const mockUpdateDoc  = jest.fn();
const mockDeleteField = jest.fn(() => ({ _type: 'deleteField' }));

const SERVER_TIMESTAMP = { _isServerTimestamp: true };

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:     jest.fn(),
  doc:              jest.fn(() => ({ _type: 'doc' })),
  updateDoc:        (...args: unknown[]) => mockUpdateDoc(...args),
  deleteField:      (...args: unknown[]) => mockDeleteField(...args),
  serverTimestamp:  jest.fn(() => SERVER_TIMESTAMP),
}));

let mockCurrentUser: { uid: string } | null = { uid: 'uid-1' };
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ get currentUser() { return mockCurrentUser; } }),
}));

import { setHome, clearHome } from '../../../src/services/firestore';

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { uid: 'uid-1' };
});

describe('setHome', () => {
  it('stamps updatedAt and writes the full home object', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await setHome('uid-1', { address: '221B Baker Street', lat: 51.5, lng: -0.1 });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc' },
      { home: { address: '221B Baker Street', lat: 51.5, lng: -0.1, updatedAt: SERVER_TIMESTAMP } },
    );
  });

  it('rejects when uid does not match the signed-in user', async () => {
    mockCurrentUser = { uid: 'someone-else' };

    await expect(setHome('uid-1', { address: 'x', lat: 0, lng: 0 })).rejects.toThrow();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejects when there is no signed-in user', async () => {
    mockCurrentUser = null;

    await expect(setHome('uid-1', { address: 'x', lat: 0, lng: 0 })).rejects.toThrow();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('clearHome', () => {
  it('writes a deleteField() sentinel for the home key', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await clearHome('uid-1');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc' },
      { home: { _type: 'deleteField' } },
    );
    expect(mockDeleteField).toHaveBeenCalled();
  });

  it('rejects when uid does not match the signed-in user', async () => {
    mockCurrentUser = { uid: 'someone-else' };

    await expect(clearHome('uid-1')).rejects.toThrow();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
