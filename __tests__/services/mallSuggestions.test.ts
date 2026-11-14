/**
 * KAN-514 — what the mall Nearby card lists: one row per task the centre can
 * solve, sorted by floor, same-brand units as one candidate, learned brand
 * first, and the floor wording in both languages.
 */
import { COPY, setCopyLanguage } from '../../src/constants/copy';
import {
  buildMallRows, floorRank, formatFloors, groupCandidates, nextCandidateIndex, unitSolvesTask,
} from '../../src/services/mallSuggestions';
import type { VenueUnit } from '../../src/services/venueInventory';
import type { Task } from '../../src/types';

function unit(key: string, name: string, poiType: string, overrides: Partial<VenueUnit> = {}): VenueUnit {
  return {
    key, poiId: key, source: 'community', poiType, primaryPoiType: poiType, name,
    nameLocal: name, nameLocalLang: null, names: {}, countryCode: 'PT', lat: 40.2, lng: -8.4,
    floor: null, brand: null, attributes: {}, ...overrides,
  };
}

function task(id: string, title: string, poi: string, overrides: Partial<Task> = {}): Task {
  return {
    id, title, poi, category: 'errands', done: false, date: '2026-11-14',
    createdAt: { toDate: () => new Date() } as unknown as Task['createdAt'], ...overrides,
  } as Task;
}

const ZARA_1 = unit('community:zara', 'Zara', 'store', { brand: 'Zara', floor: '1', attributes: { store_kind: ['clothing'] } });
const MANGO_2 = unit('community:mango', 'Mango', 'store', { brand: 'Mango', floor: '2', attributes: { store_kind: ['clothing'] } });
const FNAC_0 = unit('community:fnac', 'FNAC', 'store', { brand: 'Fnac', floor: '0', attributes: { store_kind: ['electronics'] } });
const OAK_0 = unit('community:oak', 'OAKBERRY', 'restaurant', { brand: 'OAKBERRY', floor: '0' });
const OAK_2 = unit('community:oak-2', 'OAKBERRY', 'restaurant', { brand: 'OAKBERRY', floor: '2' });
const PANS = unit('community:pans', 'Café Pans', 'cafe', { floor: '-1' });
const KIOSK = unit('community:kiosk', 'Kiosk', 'cafe', { floor: null });

const byType = (units: VenueUnit[]) => (poiType: string) => units.filter(u => u.poiType === poiType);

describe('matching, by the outdoor Nearby rules', () => {
  it('needs the task type', () => {
    expect(unitSolvesTask(task('t', 'Shirt', 'store'), ZARA_1)).toBe(true);
    expect(unitSolvesTask(task('t', 'Shirt', 'cafe'), ZARA_1)).toBe(false);
    expect(unitSolvesTask(task('t', 'No type', undefined as unknown as string), ZARA_1)).toBe(false);
  });

  it('honours a store kind', () => {
    const electronics = task('t', 'Charger', 'store', { storeSubtype: 'electronics' } as Partial<Task>);
    expect(unitSolvesTask(electronics, FNAC_0)).toBe(true);
    expect(unitSolvesTask(electronics, ZARA_1)).toBe(false);
  });

  it('honours a required brand and rotates only within it', () => {
    const gymA = unit('community:gym-a', 'Fitness Hut', 'gym', { brand: 'Fitness Hut', floor: '-1' });
    const gymB = unit('community:gym-b', 'Solinca', 'gym', { brand: 'Solinca', floor: '3' });
    const gymTask = task('t', 'Gym', 'gym', { poiBrand: 'Solinca' } as Partial<Task>);
    const rows = buildMallRows([gymTask], byType([gymA, gymB]), []);
    expect(rows[0].candidates.map(c => c.name)).toEqual(['Solinca']);
  });
});

describe('candidates', () => {
  it('folds one brand on several floors into one candidate, floors lowest first', () => {
    expect(groupCandidates([OAK_2, OAK_0])).toEqual([
      { key: 'brand:OAKBERRY', name: 'OAKBERRY', floors: ['0', '2'], poiType: 'restaurant' },
    ]);
  });

  it('puts the learned brand first, then lowest floor, then name', () => {
    // A neutral title: "Shirt" would infer the clothing kind and rightly drop FNAC.
    const rows = buildMallRows([task('t', 'Errand', 'store')], byType([ZARA_1, MANGO_2, FNAC_0]), [
      { poiType: 'store', name: 'Mango', visitCount: 4 },
    ]);
    expect(rows[0].candidates.map(c => c.name)).toEqual(['Mango', 'Fnac', 'Zara']);
  });

  it('keeps a task\'s inferred store kind, as the outdoor card does', () => {
    const rows = buildMallRows([task('t', 'Shirt', 'store')], byType([ZARA_1, MANGO_2, FNAC_0]), []);
    expect(rows[0].candidates.map(c => c.name)).toEqual(['Zara', 'Mango']);
  });

  it('wraps "Try another place" after the last candidate', () => {
    expect([0, 1, 2].map(i => nextCandidateIndex(i, 3))).toEqual([1, 2, 0]);
    expect(nextCandidateIndex(0, 1)).toBe(0);
  });
});

describe('rows', () => {
  const units = byType([ZARA_1, MANGO_2, OAK_0, OAK_2, PANS, KIOSK]);

  it('one row per open task the centre can solve, sorted by floor, no floor last', () => {
    const tasks = [
      task('shirt', 'Shirt', 'store'),
      task('done', 'Old', 'store', { done: true }),
      task('acai', 'Açaí', 'restaurant'),
      task('coffee', 'Coffee', 'cafe'),
      task('pharmacy', 'Aspirin', 'pharmacy'),
    ];
    const rows = buildMallRows(tasks, units, []);
    expect(rows.map(r => [r.task.id, r.candidates[0].name, r.candidates[0].floors])).toEqual([
      ['coffee', 'Café Pans', ['-1']],
      ['acai', 'OAKBERRY', ['0', '2']],
      ['shirt', 'Zara', ['1']],
    ]);
  });

  it('keeps the task list order between tasks on the same floor', () => {
    const rows = buildMallRows([task('b', 'B', 'store'), task('a', 'A', 'store')], byType([ZARA_1]), []);
    expect(rows.map(r => r.task.id)).toEqual(['b', 'a']);
  });

  it('sorts a unit with no floor after every floor', () => {
    expect(floorRank(null)).toBe(Number.POSITIVE_INFINITY);
    expect(floorRank('-1')).toBeLessThan(floorRank('0'));
    const rows = buildMallRows([task('k', 'Snack', 'cafe')], byType([KIOSK]), []);
    expect(rows[0].candidates[0].floors).toEqual([]);
  });
});

describe('floor wording', () => {
  afterEach(() => setCopyLanguage('en'));

  it('reads in English', () => {
    setCopyLanguage('en');
    expect(formatFloors(['1'], COPY.mallNearbyCard)).toBe('Floor 1');
    expect(formatFloors(['-1'], COPY.mallNearbyCard)).toBe('Floor -1');
    expect(formatFloors(['0', '2'], COPY.mallNearbyCard)).toBe('Floors 0 and 2');
    expect(formatFloors(['-1', '0', '3'], COPY.mallNearbyCard)).toBe('Floors -1 and 0 +1');
    expect(formatFloors([], COPY.mallNearbyCard)).toBeNull();
  });

  it('reads in Portuguese (pt-PT)', () => {
    setCopyLanguage('pt-PT');
    expect(formatFloors(['1'], COPY.mallNearbyCard)).toBe('Piso 1');
    expect(formatFloors(['0', '2'], COPY.mallNearbyCard)).toBe('Pisos 0 e 2');
    expect(COPY.mallNearbyCard.title('Alma Shopping')).toBe('Enquanto estás em Alma Shopping');
    expect(COPY.mallNearbyCard.waitingHere(3)).toBe('3 à espera aqui');
    expect(COPY.mallNearbyCard.tryAnotherPlace).toBe('Tentar outro local');
  });
});
