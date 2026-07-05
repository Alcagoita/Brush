/**
 * KAN-230 — learnedPlaces: on-device ranking of venues the user actually
 * brushes tasks at, from KAN-226's completedPlaceId brush history.
 *
 * Covers (fixtures only — no real usage data needed, per the ticket):
 *   - a venue below LEARNED_PLACE_THRESHOLD visits is not a learned place
 *   - a venue at exactly the threshold is promoted
 *   - ranking is sorted by visit count descending
 *   - tasks with no completedPlaceId are ignored
 *   - a mix of online (Google) and offline (cache) brushes at the SAME
 *     internal place id still counts toward one venue (the identity layer
 *     from KAN-228/229 is what already guarantees the shared id — this
 *     module just has to not care where the id came from)
 *   - getLearnedPlaceForPoiType returns the best-ranked match for a type,
 *     or null when none qualifies
 */

import { computeLearnedPlaces, getLearnedPlaceForPoiType, LEARNED_PLACE_THRESHOLD } from '../../src/services/learnedPlaces';
import type { Task } from '../../src/types';

function brush(placeId: string, name: string, poiType: string, overrides: Partial<Task> = {}): Task {
  return {
    id:                `task-${Math.random()}`,
    title:              'Errand',
    category:           'errands',
    done:               true,
    date:               '2026-07-05',
    createdAt:          { toDate: () => new Date() } as unknown as Task['createdAt'],
    completedPlaceId:   placeId,
    completedPlaceName: name,
    completedPoiType:   poiType,
    ...overrides,
  };
}

describe('LEARNED_PLACE_THRESHOLD', () => {
  it('defaults to 3', () => {
    expect(LEARNED_PLACE_THRESHOLD).toBe(3);
  });
});

describe('computeLearnedPlaces', () => {
  it('does not promote a venue below the threshold', () => {
    const tasks = [
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
    ];
    expect(computeLearnedPlaces(tasks)).toEqual([]);
  });

  it('promotes a venue at exactly LEARNED_PLACE_THRESHOLD visits', () => {
    const tasks = [
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
    ];
    expect(computeLearnedPlaces(tasks)).toEqual([
      { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3 },
    ]);
  });

  it('ranks multiple learned venues by visit count descending', () => {
    const tasks = [
      ...Array(3).fill(null).map(() => brush('hp_1', 'Corner ATM', 'atm')),
      ...Array(5).fill(null).map(() => brush('hp_2', 'Sightglass', 'cafe')),
    ];

    const ranked = computeLearnedPlaces(tasks);

    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toEqual({ placeId: 'hp_2', name: 'Sightglass', poiType: 'cafe', visitCount: 5 });
    expect(ranked[1]).toEqual({ placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3 });
  });

  it('ignores tasks with no completedPlaceId', () => {
    const tasks = [
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
      { id: 'task-x', title: 'No place', category: 'errands', done: true, date: '2026-07-05', createdAt: { toDate: () => new Date() } as unknown as Task['createdAt'] } as Task,
    ];
    // Still only 2 visits — the placeless task contributes nothing.
    expect(computeLearnedPlaces(tasks)).toEqual([]);
  });

  it('counts brushes from both online (Google-sourced) and offline (cache-sourced) hero places toward the same venue, since both share one internal place id', () => {
    // The internal id (hp_1) is what KAN-228/229's cross-source identity
    // resolution guarantees is shared between an online and an offline
    // brush of the same physical place — this module doesn't need to know
    // which source each individual brush came from.
    const tasks = [
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
    ];
    expect(computeLearnedPlaces(tasks)).toHaveLength(1);
  });

  it('returns an empty array for no tasks', () => {
    expect(computeLearnedPlaces([])).toEqual([]);
  });
});

describe('getLearnedPlaceForPoiType', () => {
  const learned = [
    { placeId: 'hp_2', name: 'Sightglass', poiType: 'cafe', visitCount: 5 },
    { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3 },
  ];

  it('returns the learned place matching the given POI type', () => {
    expect(getLearnedPlaceForPoiType(learned, 'cafe')).toEqual(learned[0]);
  });

  it('returns null when no learned place matches the type', () => {
    expect(getLearnedPlaceForPoiType(learned, 'pharmacy')).toBeNull();
  });

  it('returns null for an empty ranking', () => {
    expect(getLearnedPlaceForPoiType([], 'cafe')).toBeNull();
  });
});
