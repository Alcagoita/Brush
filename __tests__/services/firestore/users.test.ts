/**
 * KAN-247 — users.ts: setHome / clearHome.
 *
 * Covers:
 *   - setHome stamps updatedAt and writes the full home object
 *   - clearHome writes a deleteField() sentinel for the home key
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

import { setHome, clearHome } from '../../../src/services/firestore';

beforeEach(() => {
  jest.clearAllMocks();
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
});
