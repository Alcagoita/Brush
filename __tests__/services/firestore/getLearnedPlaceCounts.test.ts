/**
 * KAN-240 — getLearnedPlaceCounts: reads the small, bounded
 * `/users/{uid}/learnedPlaceCounts` collection (one doc per distinct venue,
 * kept current by setTaskDone's transaction) for learnedPlaces.ts to rank —
 * replaces the old getCompletedTasksWithPlace, which re-scanned the user's
 * entire completed-task history on every call.
 */

const mockGetDocs = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection:   jest.fn(() => ({ _type: 'collection' })),
  doc:          jest.fn(() => ({ _type: 'doc' })),
  getDocs:      (...args: unknown[]) => mockGetDocs(...args),
  query:        jest.fn(),
  where:        jest.fn(),
  orderBy:      jest.fn(),
  Timestamp:    { now: jest.fn(), fromDate: jest.fn() },
}));

import { getLearnedPlaceCounts } from '../../../src/services/firestore';

function fakeSnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
}

describe('getLearnedPlaceCounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps returned docs into LearnedPlace objects keyed by placeId', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([
      { id: 'hp_1', data: { name: 'Corner ATM', poiType: 'atm', visitCount: 3 } },
      { id: 'hp_2', data: { name: 'Sightglass', poiType: 'cafe', visitCount: 5 } },
    ]));

    const counts = await getLearnedPlaceCounts('uid-1');

    expect(counts).toEqual([
      { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3 },
      { placeId: 'hp_2', name: 'Sightglass', poiType: 'cafe', visitCount: 5 },
    ]);
  });

  it('returns an empty array when the user has no counted places yet', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([]));
    const counts = await getLearnedPlaceCounts('uid-1');
    expect(counts).toEqual([]);
  });
});
