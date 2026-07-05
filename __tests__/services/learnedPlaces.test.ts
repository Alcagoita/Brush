/**
 * KAN-230 / KAN-240 — learnedPlaces: on-device ranking of venues the user
 * actually brushes tasks at.
 *
 * Since KAN-240, visit counts arrive pre-aggregated from
 * `/users/{uid}/learnedPlaceCounts` (kept current by setTaskDone's
 * transaction) instead of being tallied here from raw task history — this
 * module now only filters by threshold and sorts.
 *
 * Covers (fixtures only — no real usage data needed, per the ticket):
 *   - a venue below LEARNED_PLACE_THRESHOLD visits is not a learned place
 *   - a venue at exactly the threshold is promoted
 *   - ranking is sorted by visit count descending
 *   - getLearnedPlaceForPoiType returns the best-ranked match for a type,
 *     or null when none qualifies
 */

import { computeLearnedPlaces, getLearnedPlaceForPoiType, LEARNED_PLACE_THRESHOLD } from '../../src/services/learnedPlaces';
import type { LearnedPlace } from '../../src/services/learnedPlaces';

function count(placeId: string, name: string, poiType: string, visitCount: number): LearnedPlace {
  return { placeId, name, poiType, visitCount };
}

describe('LEARNED_PLACE_THRESHOLD', () => {
  it('defaults to 3', () => {
    expect(LEARNED_PLACE_THRESHOLD).toBe(3);
  });
});

describe('computeLearnedPlaces', () => {
  it('does not promote a venue below the threshold', () => {
    const counts = [count('hp_1', 'Corner ATM', 'atm', 2)];
    expect(computeLearnedPlaces(counts)).toEqual([]);
  });

  it('promotes a venue at exactly LEARNED_PLACE_THRESHOLD visits', () => {
    const counts = [count('hp_1', 'Corner ATM', 'atm', 3)];
    expect(computeLearnedPlaces(counts)).toEqual([
      { placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3 },
    ]);
  });

  it('ranks multiple learned venues by visit count descending', () => {
    const counts = [
      count('hp_1', 'Corner ATM', 'atm', 3),
      count('hp_2', 'Sightglass', 'cafe', 5),
    ];

    const ranked = computeLearnedPlaces(counts);

    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toEqual({ placeId: 'hp_2', name: 'Sightglass', poiType: 'cafe', visitCount: 5 });
    expect(ranked[1]).toEqual({ placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3 });
  });

  it('filters out below-threshold venues while keeping qualifying ones', () => {
    const counts = [
      count('hp_1', 'Corner ATM', 'atm', 2),
      count('hp_2', 'Sightglass', 'cafe', 5),
    ];
    expect(computeLearnedPlaces(counts)).toEqual([
      { placeId: 'hp_2', name: 'Sightglass', poiType: 'cafe', visitCount: 5 },
    ]);
  });

  it('returns an empty array for no counts', () => {
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
