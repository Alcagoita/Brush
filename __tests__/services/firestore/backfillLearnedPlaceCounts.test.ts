/**
 * KAN-240 — backfillLearnedPlaceCounts: one-time migration that tallies a
 * user's historical completedPlaceId brushes into
 * `/users/{uid}/learnedPlaceCounts/{placeId}`, gated by
 * `learnedPlaceCountsBackfilled` on the user doc so the full-history scan
 * this replaces runs at most once per user.
 */

const mockGetDoc     = jest.fn();
const mockGetDocs    = jest.fn();
const mockUpdateDoc  = jest.fn().mockResolvedValue(undefined);
const mockBatchSet   = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockWriteBatch = jest.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit }));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ _type: 'db' })),
  collection:   jest.fn(() => ({ _type: 'collection' })),
  doc:          jest.fn((...args: unknown[]) => ({ _type: 'doc', path: args.slice(1).join('/') })),
  getDoc:       (...args: unknown[]) => mockGetDoc(...args),
  getDocs:      (...args: unknown[]) => mockGetDocs(...args),
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

describe('backfillLearnedPlaceCounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when the user has already been backfilled', async () => {
    mockGetDoc.mockResolvedValue({ data: () => ({ learnedPlaceCountsBackfilled: true }) });

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockWriteBatch).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('tallies historical completedPlaceId tasks into counter docs and sets the flag', async () => {
    mockGetDoc.mockResolvedValue({ data: () => ({}) });
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
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc', path: 'users/uid-1' },
      { learnedPlaceCountsBackfilled: true },
    );
  });

  it('ignores tasks with no completedPlaceId', async () => {
    mockGetDoc.mockResolvedValue({ data: () => ({}) });
    mockGetDocs.mockResolvedValue(fakeSnap([
      { title: 'No place' },
    ]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc', path: 'users/uid-1' },
      { learnedPlaceCountsBackfilled: true },
    );
  });

  it('sets the flag even when there is no history to migrate', async () => {
    mockGetDoc.mockResolvedValue({ data: () => ({}) });
    mockGetDocs.mockResolvedValue(fakeSnap([]));

    await backfillLearnedPlaceCounts('uid-1');

    expect(mockWriteBatch).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { _type: 'doc', path: 'users/uid-1' },
      { learnedPlaceCountsBackfilled: true },
    );
  });
});
