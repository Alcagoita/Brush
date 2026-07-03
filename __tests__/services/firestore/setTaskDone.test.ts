/**
 * KAN-226 — setTaskDone persists completedPlaceId/completedPlaceName/
 * completedPoiType as a snapshot of the *current* completion (not sticky
 * history): they're written on a `done: true` call with a matching place,
 * and deleted from the doc in every other case (done: false, or done: true
 * with no matching place) so a later re-completion without a place can
 * never resurrect stale metadata from a previous brush.
 */

const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);

const NOW_TIMESTAMP = { _isNow: true };
const DELETE_FIELD_SENTINEL = { _delete: true };

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(),
  collection:      jest.fn(() => ({ _type: 'collection' })),
  doc:             jest.fn(() => ({ _type: 'doc' })),
  addDoc:          jest.fn(),
  getDoc:          jest.fn(),
  getDocs:         jest.fn(),
  updateDoc:       (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc:       jest.fn(),
  deleteField:     jest.fn(() => DELETE_FIELD_SENTINEL),
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

import { setTaskDone } from '../../../src/services/firestore';

describe('setTaskDone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks done and deletes completedPlace* fields when completedPlace is omitted', async () => {
    await setTaskDone('uid-1', 'task-1', true);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc' },
      {
        done: true,
        completedAt: NOW_TIMESTAMP,
        completedPlaceId: DELETE_FIELD_SENTINEL,
        completedPlaceName: DELETE_FIELD_SENTINEL,
        completedPoiType: DELETE_FIELD_SENTINEL,
      },
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

  it('deletes completedPlace* fields when marking a task undone, even if a place is passed', async () => {
    await setTaskDone('uid-1', 'task-1', false, {
      placeId: 'place-abc',
      name: 'Whole Foods',
      poiType: 'supermarket',
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc' },
      {
        done: false,
        completedAt: null,
        completedPlaceId: DELETE_FIELD_SENTINEL,
        completedPlaceName: DELETE_FIELD_SENTINEL,
        completedPoiType: DELETE_FIELD_SENTINEL,
      },
    );
  });

  it('done(with place) -> undone -> done(without place) does not retain old completedPlace*', async () => {
    await setTaskDone('uid-1', 'task-1', true, {
      placeId: 'place-abc',
      name: 'Whole Foods',
      poiType: 'supermarket',
    });
    await setTaskDone('uid-1', 'task-1', false);
    await setTaskDone('uid-1', 'task-1', true);

    expect(mockUpdateDoc).toHaveBeenNthCalledWith(
      3,
      { _type: 'doc' },
      {
        done: true,
        completedAt: NOW_TIMESTAMP,
        completedPlaceId: DELETE_FIELD_SENTINEL,
        completedPlaceName: DELETE_FIELD_SENTINEL,
        completedPoiType: DELETE_FIELD_SENTINEL,
      },
    );
  });
});
