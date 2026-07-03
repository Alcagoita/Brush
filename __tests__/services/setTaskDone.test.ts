/**
 * KAN-226 — setTaskDone persists completedPlaceId/completedPlaceName/
 * completedPoiType when a hero/nearby place is passed at brush time.
 */

const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);

const NOW_TIMESTAMP = { _isNow: true };

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(),
  collection:      jest.fn(() => ({ _type: 'collection' })),
  doc:             jest.fn(() => ({ _type: 'doc' })),
  addDoc:          jest.fn(),
  getDoc:          jest.fn(),
  getDocs:         jest.fn(),
  updateDoc:       (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc:       jest.fn(),
  setDoc:          jest.fn(),
  writeBatch:      jest.fn(),
  query:           jest.fn(),
  where:           jest.fn(),
  orderBy:         jest.fn(),
  onSnapshot:      jest.fn(),
  serverTimestamp: jest.fn(),
  increment:       jest.fn(),
  Timestamp:       { now: jest.fn(() => NOW_TIMESTAMP) },
  runTransaction:  jest.fn(),
}));

import { setTaskDone } from '../../src/services/firestore';

describe('setTaskDone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks done with completedAt and no place fields when completedPlace is omitted', async () => {
    await setTaskDone('uid-1', 'task-1', true);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc' },
      { done: true, completedAt: NOW_TIMESTAMP },
    );
  });

  it('persists completedPlaceId/Name/PoiType when a known place is passed on brush-away', async () => {
    await setTaskDone('uid-1', 'task-1', true, {
      placeId: 'place-abc',
      name: 'Whole Foods',
      poiType: 'supermarket',
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc' },
      {
        done: true,
        completedAt: NOW_TIMESTAMP,
        completedPlaceId: 'place-abc',
        completedPlaceName: 'Whole Foods',
        completedPoiType: 'supermarket',
      },
    );
  });

  it('ignores completedPlace when marking a task undone', async () => {
    await setTaskDone('uid-1', 'task-1', false, {
      placeId: 'place-abc',
      name: 'Whole Foods',
      poiType: 'supermarket',
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc' },
      { done: false, completedAt: null },
    );
  });
});
