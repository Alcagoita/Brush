/**
 * KAN-230 — getCompletedTasksWithPlace: fetches every completed task with a
 * completedPlaceId (KAN-226), across all dates, for the learned-places
 * ranking to tally.
 */

const mockGetDocs = jest.fn();
const mockQuery   = jest.fn((...args: unknown[]) => ({ _type: 'query', args }));
const mockWhere   = jest.fn((...args: unknown[]) => ({ _type: 'where', args }));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection:   jest.fn(() => ({ _type: 'collection' })),
  doc:          jest.fn(() => ({ _type: 'doc' })),
  getDocs:      (...args: unknown[]) => mockGetDocs(...args),
  query:        (...args: unknown[]) => mockQuery(...args),
  where:        (...args: unknown[]) => mockWhere(...args),
  orderBy:      jest.fn(),
  Timestamp:    { now: jest.fn(), fromDate: jest.fn() },
}));

import { getCompletedTasksWithPlace } from '../../../src/services/firestore';

function fakeSnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
}

describe('getCompletedTasksWithPlace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries with a not-equal-null filter on completedPlaceId', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([]));

    await getCompletedTasksWithPlace('uid-1');

    expect(mockWhere).toHaveBeenCalledWith('completedPlaceId', '!=', null);
  });

  it('maps returned docs into Task objects with their doc id', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([
      { id: 'task-1', data: { title: 'Get cash', completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' } },
      { id: 'task-2', data: { title: 'Coffee', completedPlaceId: 'hp_2', completedPlaceName: 'Sightglass', completedPoiType: 'cafe' } },
    ]));

    const tasks = await getCompletedTasksWithPlace('uid-1');

    expect(tasks).toEqual([
      { id: 'task-1', title: 'Get cash', completedPlaceId: 'hp_1', completedPlaceName: 'Corner ATM', completedPoiType: 'atm' },
      { id: 'task-2', title: 'Coffee', completedPlaceId: 'hp_2', completedPlaceName: 'Sightglass', completedPoiType: 'cafe' },
    ]);
  });

  it('returns an empty array when nothing matches', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([]));
    const tasks = await getCompletedTasksWithPlace('uid-1');
    expect(tasks).toEqual([]);
  });
});
