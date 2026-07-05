/**
 * KAN-240 — backfillLearnedPlaceCounts: one-time migration that tallies a
 * user's historical completedPlaceId brushes into
 * `/users/{uid}/learnedPlaceCounts/{placeId}`, gated by
 * `learnedPlaceCountsBackfilled` on the user doc so the full-history scan
 * this replaces runs at most once per user.
 *
 * Each counter write re-reads the doc immediately beforehand and keeps
 * whichever visitCount is higher (tallied vs. current) instead of blindly
 * overwriting — a concurrent setTaskDone() increment landing on the same
 * place while this migration is still running must not be lost.
 */

const mockGetDoc      = jest.fn();
const mockGetDocs     = jest.fn();
const mockSetDoc      = jest.fn().mockResolvedValue(undefined);
const mockUpdateDoc   = jest.fn().mockResolvedValue(undefined);
const mockBatchSet    = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockWriteBatch  = jest.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit }));

const USER_PATH = 'users/uid-1';

function counterSnap(data: Record<string, unknown> | undefined) {
  return { exists: () => data !== undefined, data: () => data };
}

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ _type: 'db' })),
  collection:   jest.fn(() => ({ _type: 'collection' })),
  doc:          jest.fn((...args: unknown[]) => ({ _type: 'doc', path: args.slice(1).join('/') })),
  getDoc:       (...args: unknown[]) => mockGetDoc(...args),
  getDocs:      (...args: unknown[]) => mockGetDocs(...args),
  setDoc:       (...args: unknown[]) => mockSetDoc(...args),
  updateDoc:    (...args: unknown[]) => mockUpdateDoc(...args),
  writeBatch:   (...args: unknown[]) => mockWriteBatch(...args),
  query:        jest.fn(),
  where:        jest.fn(),
  orderBy:      jest.fn(),
  Timestamp:    { now: jest.fn(), fromDate: jest.fn() },
}));

import { backfillLearnedPlaceCounts } from '../../../src/services/firestore';

function fakeSnap(docs: Array<Record<string, unknown>>) {
  return { docs: docs.map((data, i) => ({ id: `task-${i}`, data: () => data })) };
}

/** Routes getDoc(ref) by path: the user doc, then any per-place counter reads. */
function mockGetDocByPath(userData: Record<string, unknown>, counters: Record<string, Record<string, unknown> | undefined> = {}) {
  mockGetDoc.mockImplementation((ref: { path: string }) => {
    if (ref.path === USER_PATH) { return Promise.resolve({ data: () => userData }); }
    return Promise.resolve(counterSnap(counters[ref.path]));
  });
}

describe('backfillLearnedPlaceCounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when the user has already been backfilled', async () => {
    mockGetDocByPath({ learnedPlaceCountsBackfilled: true });

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockWriteBatch).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('tallies historical completedPlaceId tasks into counter docs and sets the flag', async () => {
    mockGetDocByPath({});
    mockGetDocs.mockResolvedValue(fakeSnap([
      { completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
      { completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
      { completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
      { completedPlaceId: 'hp_2', completedPlaceName: 'Sightglass', completedPoiType: 'cafe' },
      { completedPlaceId: 'hp_2', completedPlaceName: 'Sightglass', completedPoiType: 'cafe' },
    ]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockBatchSet).toHaveBeenCalledWith(
      { _type: 'doc', path: 'users/uid-1/learnedPlaceCounts/hp_1' },
      { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3 },
    );
    expect(mockBatchSet).toHaveBeenCalledWith(
      { _type: 'doc', path: 'users/uid-1/learnedPlaceCounts/hp_2' },
      { placeId: 'hp_2', name: 'Sightglass', poiType: 'cafe', visitCount: 2 },
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledWith(
      { _type: 'doc', path: USER_PATH },
      { learnedPlaceCountsBackfilled: true },
      { merge: true },
    );
  });

  it('ignores tasks with no completedPlaceId', async () => {
    mockGetDocByPath({});
    mockGetDocs.mockResolvedValue(fakeSnap([
      { title: 'No place' },
    ]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockSetDoc).toHaveBeenCalledWith(
      { _type: 'doc', path: USER_PATH },
      { learnedPlaceCountsBackfilled: true },
      { merge: true },
    );
  });

  it('sets the flag even when there is no history to migrate', async () => {
    mockGetDocByPath({});
    mockGetDocs.mockResolvedValue(fakeSnap([]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockWriteBatch).not.toHaveBeenCalled();
    expect(mockSetDoc).toHaveBeenCalledWith(
      { _type: 'doc', path: USER_PATH },
      { learnedPlaceCountsBackfilled: true },
      { merge: true },
    );
  });

  it('sets the backfilled flag via setDoc+merge so a missing user doc does not strand the migration', async () => {
    // getUser() returns null when the user doc doesn't exist yet — updateDoc
    // would throw in that case, so this must use setDoc(..., { merge: true }).
    mockGetDocByPath({});
    mockGetDocs.mockResolvedValue(fakeSnap([]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('keeps the higher visitCount instead of overwriting a concurrently-incremented counter', async () => {
    // hp_1's counter already sits at 5 (e.g. a live setTaskDone increment that
    // landed after this migration's task-history scan ran) — the tally itself
    // only found 3 historical visits. The write must not regress hp_1 to 3.
    mockGetDocByPath({}, {
      'users/uid-1/learnedPlaceCounts/hp_1': { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 5 },
    });
    mockGetDocs.mockResolvedValue(fakeSnap([
      { completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
      { completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
      { completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
    ]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockBatchSet).toHaveBeenCalledWith(
      { _type: 'doc', path: 'users/uid-1/learnedPlaceCounts/hp_1' },
      { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 5 },
    );
  });

  it('treats a corrupted existing visitCount as 0 when merging rather than propagating NaN', async () => {
    mockGetDocByPath({}, {
      'users/uid-1/learnedPlaceCounts/hp_1': { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 'not-a-number' },
    });
    mockGetDocs.mockResolvedValue(fakeSnap([
      { completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
    ]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockBatchSet).toHaveBeenCalledWith(
      { _type: 'doc', path: 'users/uid-1/learnedPlaceCounts/hp_1' },
      { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 1 },
    );
  });
});
