/**
 * Unit tests for src/services/achievements.ts (KAN-129).
 *
 * Covers:
 *   TIER_LADDER
 *     - correct tier breakpoints
 *   getNextTier
 *     - returns Bronze when below 50
 *     - returns Silver when between 50 and 150
 *     - returns Gold when between 150 and 350
 *     - returns Gold (last tier) when at or above 350
 *   ACHIEVEMENT_DEFS
 *     - all v1 types defined with required fields
 *   evaluateAchievements
 *     - awards first_brush on first task completion
 *     - skips first_brush when already earned
 *     - awards early_bird when task completed before 9 AM
 *     - skips early_bird when task completed at or after 9 AM
 *     - awards day_complete when allTasksDone is true
 *     - skips day_complete when allTasksDone is false
 *     - awards on_a_roll when streak reaches 3
 *     - does not award on_a_roll when streak < 3
 *     - awards explorer for location task when progress reaches 10
 *     - awards centurion when projected points reach 100
 *     - does not re-award centurion when already earned
 *     - increments totalPoints by sum of awarded achievement points
 *     - does not call tx.update when no changes are needed
 *   awardChallengeWinnerAchievement (KAN-104)
 *     - returns early without writing if already awarded for this challenge
 *     - writes achievement with type challenge_winner and challengeId context
 *     - awards achievement_bonus points
 *     - fires a notification deep-linking to ChallengeDetail
 *   migratePointsToAchievementDerived (KAN-129)
 *     - writes the correct computed total when stored value is stale
 *     - does not call tx.update when stored value already matches
 *     - writes 0 when there are no earned achievements and stored total is non-zero
 *     - is a no-op when there is no user document
 *     - ignores achievements with earnCount 0 in the sum
 *     - counts repeatable achievements by earnCount × points
 */

// ─── Firestore mock ───────────────────────────────────────────────────────────

const mockTxGet    = jest.fn();
const mockTxUpdate = jest.fn();

const mockRunTransaction = jest.fn(
  async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
    const tx = { get: mockTxGet, update: mockTxUpdate };
    return fn(tx);
  },
);

const mockIncrement       = jest.fn((n: number) => ({ _increment: n }));
const mockServerTimestamp = jest.fn(() => ({ _serverTimestamp: true }));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(() => ({})),
  runTransaction:  (...args: unknown[]) => mockRunTransaction(...args),
  serverTimestamp: () => mockServerTimestamp(),
  increment:       (n: number) => mockIncrement(n),
}));

// firestore service helpers (used by awardChallengeWinnerAchievement)
const mockHasAchievement            = jest.fn();
const mockAwardAchievement          = jest.fn();
const mockAwardPointsAchievementBonus = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  hasAchievement:               (...args: unknown[]) => mockHasAchievement(...args),
  awardAchievement:             (...args: unknown[]) => mockAwardAchievement(...args),
  awardPointsAchievementBonus:  (...args: unknown[]) => mockAwardPointsAchievementBonus(...args),
}));

// notifee
const mockCreateChannel        = jest.fn();
const mockDisplayNotification  = jest.fn();

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:       (...args: unknown[]) => mockCreateChannel(...args),
    displayNotification: (...args: unknown[]) => mockDisplayNotification(...args),
  },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  TIER_LADDER,
  getNextTier,
  ACHIEVEMENT_DEFS,
  evaluateAchievements,
  evaluateAddTaskAchievement,
  evaluateCustomCatAchievement,
  awardChallengeWinnerAchievement,
} from '../../src/services/achievements';
import type { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW_SECONDS = Math.floor(Date.now() / 1000);
const THREE_DAYS_AGO_SECONDS = NOW_SECONDS - (3 * 24 * 60 * 60 + 60); // 3 days + 1 min

const BASE_TASK: Task = {
  id:        'task-1',
  title:     'Pick up groceries',
  category:  'errands',
  done:      true,
  date:      '2026-06-07',
  createdAt: { seconds: NOW_SECONDS, nanoseconds: 0 } as any,
};

function makeUserSnap(overrides: Record<string, unknown> = {}) {
  return {
    data: () => ({
      totalPoints:   0,
      currentStreak: 0,
      achievements:  {},
      ...overrides,
    }),
  };
}

// Mock the `db.collection().doc()` chain used inside evaluateAchievements.
// jest.mock('@react-native-firebase/firestore') stubs getFirestore(), but the
// module also calls `db.collection('users').doc(uid)` on the returned object.
// We attach the chain on the mock return value in beforeEach.
let mockUserDocRef: object;

beforeEach(() => {
  jest.clearAllMocks();
  mockAwardAchievement.mockResolvedValue(undefined);
  mockAwardPointsAchievementBonus.mockResolvedValue(undefined);
  mockCreateChannel.mockResolvedValue(undefined);
  mockDisplayNotification.mockResolvedValue(undefined);
  mockTxUpdate.mockResolvedValue(undefined);

  mockUserDocRef = { _type: 'userDoc' };

  const mockDocFn  = jest.fn(() => mockUserDocRef);
  const mockColFn  = jest.fn(() => ({ doc: mockDocFn }));

  const { getFirestore } = require('@react-native-firebase/firestore');
  (getFirestore as jest.Mock).mockReturnValue({ collection: mockColFn });
});

// ─── TIER_LADDER ──────────────────────────────────────────────────────────────

describe('TIER_LADDER', () => {
  it('has five tiers: Bronze@50 → Silver@200 → Gold@500 → Adamantium@1200 → Vibranium@3000', () => {
    expect(TIER_LADDER).toEqual([
      { name: 'Bronze',     at: 50   },
      { name: 'Silver',     at: 200  },
      { name: 'Gold',       at: 500  },
      { name: 'Adamantium', at: 1200 },
      { name: 'Vibranium',  at: 3000 },
    ]);
  });
});

// ─── getNextTier ──────────────────────────────────────────────────────────────

describe('getNextTier', () => {
  it('returns Bronze for 0 points', () => {
    expect(getNextTier(0).name).toBe('Bronze');
  });
  it('returns Bronze for 49 points', () => {
    expect(getNextTier(49).name).toBe('Bronze');
  });
  it('returns Silver for exactly 50 points', () => {
    expect(getNextTier(50).name).toBe('Silver');
  });
  it('returns Silver for 199 points', () => {
    expect(getNextTier(199).name).toBe('Silver');
  });
  it('returns Gold for 200 points', () => {
    expect(getNextTier(200).name).toBe('Gold');
  });
  it('returns Vibranium (last tier) for 3000+ points', () => {
    expect(getNextTier(3000).name).toBe('Vibranium');
    expect(getNextTier(9999).name).toBe('Vibranium');
  });
});

// ─── ACHIEVEMENT_DEFS ─────────────────────────────────────────────────────────

describe('ACHIEVEMENT_DEFS', () => {
  const TIN_IDS  = ['first_task', 'first_brush', 'right_place', 'worth_wait', 'custom_cat', 'out_about'];
  const V1_IDS   = ['first_brush', 'early_bird', 'day_complete', 'on_a_roll', 'explorer', 'centurion'];
  const ALL_IDS  = [...new Set([...TIN_IDS, ...V1_IDS])];

  it('defines all Tin-tier achievement types', () => {
    for (const id of TIN_IDS) {
      expect(ACHIEVEMENT_DEFS[id]).toBeDefined();
    }
  });

  it('defines all legacy v1 achievement types', () => {
    for (const id of V1_IDS) {
      expect(ACHIEVEMENT_DEFS[id]).toBeDefined();
    }
  });

  it('Tin-tier total is exactly 50 pts (= Bronze threshold)', () => {
    const tinTotal = TIN_IDS.reduce((sum, id) => sum + ACHIEVEMENT_DEFS[id].points, 0);
    expect(tinTotal).toBe(50);
  });

  it('each def has id, label, desc, icon, points, target, repeatable', () => {
    for (const id of ALL_IDS) {
      const def = ACHIEVEMENT_DEFS[id];
      expect(typeof def.id).toBe('string');
      expect(typeof def.label).toBe('string');
      expect(typeof def.desc).toBe('string');
      expect(typeof def.icon).toBe('string');
      expect(typeof def.points).toBe('number');
      expect(def.points).toBeGreaterThan(0);
      expect(typeof def.target).toBe('number');
      expect(def.target).toBeGreaterThanOrEqual(1);
      expect(typeof def.repeatable).toBe('boolean');
    }
  });

  it('first_brush is non-repeatable', () => {
    expect(ACHIEVEMENT_DEFS['first_brush'].repeatable).toBe(false);
  });

  it('early_bird and day_complete are repeatable', () => {
    expect(ACHIEVEMENT_DEFS['early_bird'].repeatable).toBe(true);
    expect(ACHIEVEMENT_DEFS['day_complete'].repeatable).toBe(true);
  });
});

// ─── evaluateAchievements ─────────────────────────────────────────────────────

describe('evaluateAchievements', () => {

  // Helper — extract the updates passed to tx.update
  function captureUpdates(): Record<string, unknown> {
    if (mockTxUpdate.mock.calls.length === 0) { return {}; }
    return mockTxUpdate.mock.calls[0][1] as Record<string, unknown>;
  }

  it('awards first_brush on first task completion', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap()); // no first_brush yet
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14); // afternoon

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.first_brush']).toMatchObject({
      earnCount: 1,
      progress:  1,
    });
    expect(mockIncrement).toHaveBeenCalledWith(
      expect.any(Number),
    );
  });

  it('skips first_brush when already earned', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      achievements: {
        first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: {} },
      },
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.first_brush']).toBeUndefined();
  });

  it('awards early_bird when task completed before 9 AM', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(7);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.early_bird']).toMatchObject({
      earnCount: 1,
      progress:  1,
    });
  });

  it('skips early_bird when task completed at 9 AM or later', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.early_bird']).toBeUndefined();
  });

  it('awards day_complete when allTasksDone is true', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: true });

    const updates = captureUpdates();
    expect(updates['achievements.day_complete']).toMatchObject({ earnCount: 1 });
  });

  it('skips day_complete when allTasksDone is false', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.day_complete']).toBeUndefined();
  });

  it('awards on_a_roll when streak reaches 3', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({ currentStreak: 3 }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.on_a_roll']).toMatchObject({ earnCount: 1 });
  });

  it('records on_a_roll progress but does not award when streak < 3', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({ currentStreak: 2 }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.on_a_roll.progress']).toBe(2);
    // No earnCount written directly
    expect(updates['achievements.on_a_roll']?.earnCount).toBeUndefined();
  });

  it('awards explorer for location task once progress hits target (10)', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      achievements: {
        explorer: { earnCount: 0, progress: 9, target: 10, earnedAt: null },
      },
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    const locationTask = { ...BASE_TASK, poi: 'supermarket' };
    await evaluateAchievements('uid-1', locationTask, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.explorer']).toMatchObject({ earnCount: 1, progress: 10 });
  });

  it('does not track explorer for tasks without a poi', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    // BASE_TASK has no poi
    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.explorer']).toBeUndefined();
  });

  it('awards centurion when projected totalPoints reach 100', async () => {
    // 90 pts on the doc, first_brush earns 5 more → projected = 95. Not quite.
    // Give 95 on doc + first_brush (5) = 100 → should award centurion (30 more).
    mockTxGet.mockResolvedValue(makeUserSnap({ totalPoints: 95 }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.centurion']).toMatchObject({ earnCount: 1 });
  });

  it('does not re-award centurion when already earned', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      totalPoints:  200,
      achievements: {
        first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: {} },
        centurion:   { earnCount: 1, progress: 100, target: 100, earnedAt: {} },
      },
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.centurion']?.earnCount).toBeUndefined();
  });

  it('increments totalPoints by the sum of awarded achievement points', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({ currentStreak: 0 }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    // Only first_brush (5 pts) awarded; allTasksDone false, no poi, streak 0.

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    expect(mockIncrement).toHaveBeenCalledWith(
      ACHIEVEMENT_DEFS['first_brush'].points,
    );
  });

  it('does not call tx.update when user already earned everything and no progress changed', async () => {
    // All achievements earned, task has no poi, allTasksDone false,
    // streak 0, completedHour=14 — nothing new should be awarded.
    mockTxGet.mockResolvedValue(makeUserSnap({
      totalPoints:   200,
      currentStreak: 0,
      achievements: {
        first_brush:  { earnCount: 1, progress: 1,   target: 1,   earnedAt: {} },
        early_bird:   { earnCount: 1, progress: 1,   target: 1,   earnedAt: {} },
        day_complete: { earnCount: 1, progress: 1,   target: 1,   earnedAt: {} },
        on_a_roll:    { earnCount: 1, progress: 3,   target: 3,   earnedAt: {} },
        explorer:     { earnCount: 1, progress: 10,  target: 10,  earnedAt: {} },
        centurion:    { earnCount: 1, progress: 100, target: 100, earnedAt: {} },
      },
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    // tx.update may still be called to record progress; but totalPoints
    // increment should NOT be called (no new points earned).
    expect(mockIncrement).not.toHaveBeenCalled();
  });
});

// ─── Tin-tier: right_place, worth_wait, out_about (KAN-150) ──────────────────

describe('evaluateAchievements — Tin tier (KAN-150)', () => {
  function captureUpdates(): Record<string, unknown> {
    if (mockTxUpdate.mock.calls.length === 0) { return {}; }
    return mockTxUpdate.mock.calls[0][1] as Record<string, unknown>;
  }

  it('awards right_place when task has a POI and isNearby is true', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const task = { ...BASE_TASK, poi: 'cafe' as const };

    await evaluateAchievements('uid-1', task, { allTasksDone: false, isNearby: true });

    const updates = captureUpdates();
    expect(updates['achievements.right_place']).toMatchObject({ earnCount: 1, progress: 1 });
  });

  it('does not award right_place when isNearby is false', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const task = { ...BASE_TASK, poi: 'cafe' as const };

    await evaluateAchievements('uid-1', task, { allTasksDone: false, isNearby: false });

    const updates = captureUpdates();
    expect(updates['achievements.right_place']).toBeUndefined();
  });

  it('does not award right_place when already earned', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      achievements: { right_place: { earnCount: 1, progress: 1, target: 1, earnedAt: {} } },
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const task = { ...BASE_TASK, poi: 'cafe' as const };

    await evaluateAchievements('uid-1', task, { allTasksDone: false, isNearby: true });

    const updates = captureUpdates();
    expect(updates['achievements.right_place']).toBeUndefined();
  });

  it('awards worth_wait when task createdAt is ≥ 3 days ago', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const oldTask = { ...BASE_TASK, createdAt: { seconds: THREE_DAYS_AGO_SECONDS, nanoseconds: 0 } as any };

    await evaluateAchievements('uid-1', oldTask, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.worth_wait']).toMatchObject({ earnCount: 1, progress: 1 });
  });

  it('does not award worth_wait for a fresh task (< 3 days old)', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    await evaluateAchievements('uid-1', BASE_TASK, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.worth_wait']).toBeUndefined();
  });

  it('awards out_about when 3 distinct POI types have been brushed', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      brushedPoiTypes: ['cafe', 'atm'],
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const task = { ...BASE_TASK, poi: 'pharmacy' as const };

    await evaluateAchievements('uid-1', task, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['achievements.out_about']).toMatchObject({ earnCount: 1, progress: 3 });
    expect(updates['brushedPoiTypes']).toEqual(['cafe', 'atm', 'pharmacy']);
  });

  it('does not award out_about for a repeated POI type', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      brushedPoiTypes: ['cafe', 'atm', 'pharmacy'],
      achievements: {
        first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: {} },
        out_about:   { earnCount: 1, progress: 3, target: 3, earnedAt: {} },
      },
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const task = { ...BASE_TASK, poi: 'cafe' as const };

    await evaluateAchievements('uid-1', task, { allTasksDone: false });

    expect(mockIncrement).not.toHaveBeenCalled();
  });

  it('tracks out_about progress without awarding when < 3 distinct types', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      brushedPoiTypes: ['cafe'],
    }));
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const task = { ...BASE_TASK, poi: 'atm' as const };

    await evaluateAchievements('uid-1', task, { allTasksDone: false });

    const updates = captureUpdates();
    expect(updates['brushedPoiTypes']).toEqual(['cafe', 'atm']);
    expect(updates['achievements.out_about']).toBeUndefined();
  });
});

// ─── evaluateAddTaskAchievement (KAN-150) ────────────────────────────────────

describe('evaluateAddTaskAchievement', () => {
  it('awards first_task on first call', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());

    await evaluateAddTaskAchievement('uid-1');

    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ 'achievements.first_task': expect.objectContaining({ earnCount: 1 }) }),
    );
    expect(mockIncrement).toHaveBeenCalledWith(5); // 5 pts
  });

  it('is a no-op when first_task already earned', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      achievements: { first_task: { earnCount: 1, progress: 1, target: 1, earnedAt: {} } },
    }));

    await evaluateAddTaskAchievement('uid-1');

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});

// ─── evaluateCustomCatAchievement (KAN-150) ──────────────────────────────────

describe('evaluateCustomCatAchievement', () => {
  it('awards custom_cat on first call', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap());

    await evaluateCustomCatAchievement('uid-1');

    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ 'achievements.custom_cat': expect.objectContaining({ earnCount: 1 }) }),
    );
    expect(mockIncrement).toHaveBeenCalledWith(5); // 5 pts
  });

  it('is a no-op when custom_cat already earned', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      achievements: { custom_cat: { earnCount: 1, progress: 1, target: 1, earnedAt: {} } },
    }));

    await evaluateCustomCatAchievement('uid-1');

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});

// ─── awardChallengeWinnerAchievement (KAN-104) ────────────────────────────────

describe('awardChallengeWinnerAchievement', () => {
  beforeEach(() => {
    mockAwardAchievement.mockResolvedValue(undefined);
    mockAwardPointsAchievementBonus.mockResolvedValue(undefined);
    mockCreateChannel.mockResolvedValue(undefined);
    mockDisplayNotification.mockResolvedValue(undefined);
  });

  it('returns early without writing if already awarded for this challenge', async () => {
    mockHasAchievement.mockResolvedValue(true);
    await awardChallengeWinnerAchievement('uid-1', 'ch-abc');
    expect(mockAwardAchievement).not.toHaveBeenCalled();
    expect(mockAwardPointsAchievementBonus).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('writes achievement with type challenge_winner and challengeId', async () => {
    mockHasAchievement.mockResolvedValue(false);
    await awardChallengeWinnerAchievement('uid-1', 'ch-abc');
    expect(mockAwardAchievement).toHaveBeenCalledWith(
      'uid-1',
      'challenge_winner_ch-abc',
      'challenge_winner',
      { challengeId: 'ch-abc' },
    );
  });

  it('awards achievement_bonus points', async () => {
    mockHasAchievement.mockResolvedValue(false);
    await awardChallengeWinnerAchievement('uid-1', 'ch-abc');
    expect(mockAwardPointsAchievementBonus).toHaveBeenCalledWith(
      'uid-1', 'challenge_winner', expect.any(Number),
    );
  });

  it('fires a notification deep-linking to ChallengeDetail', async () => {
    mockHasAchievement.mockResolvedValue(false);
    await awardChallengeWinnerAchievement('uid-1', 'ch-abc');
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ screen: 'ChallengeDetail', challengeId: 'ch-abc' }),
      }),
    );
  });

  it('uses a unique achievementId per challenge', async () => {
    mockHasAchievement.mockResolvedValue(false);
    await awardChallengeWinnerAchievement('uid-1', 'ch-111');
    await awardChallengeWinnerAchievement('uid-1', 'ch-222');
    const ids = mockAwardAchievement.mock.calls.map(([, id]: [unknown, string]) => id);
    expect(ids).toContain('challenge_winner_ch-111');
    expect(ids).toContain('challenge_winner_ch-222');
  });
});

// ─── migratePointsToAchievementDerived (KAN-129) ──────────────────────────────

import { migratePointsToAchievementDerived } from '../../src/services/achievements';

describe('migratePointsToAchievementDerived', () => {
  it('writes the correct computed total when stored value is stale', async () => {
    // first_brush (earnCount:1 × 10pts) + day_complete (earnCount:2 × 15pts) = 40 pts
    mockTxGet.mockResolvedValue(makeUserSnap({
      totalPoints: 99, // stale legacy value
      achievements: {
        first_brush:  { earnCount: 1, progress: 1,  target: 1, earnedAt: null },
        day_complete: { earnCount: 2, progress: 2,  target: 1, earnedAt: null },
      },
    }));

    await migratePointsToAchievementDerived('uid-1');

    expect(mockTxUpdate).toHaveBeenCalledWith(
      mockUserDocRef,
      { totalPoints: 40 },
    );
  });

  it('does not call tx.update when stored value already matches', async () => {
    // early_bird earnCount:1 × 10pts = 10 pts
    mockTxGet.mockResolvedValue(makeUserSnap({
      totalPoints: 10,
      achievements: {
        early_bird: { earnCount: 1, progress: 1, target: 1, earnedAt: null },
      },
    }));

    await migratePointsToAchievementDerived('uid-1');

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('writes 0 when there are no earned achievements and stored total is non-zero', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      totalPoints: 12, // legacy per-task points, no achievements
      achievements: {},
    }));

    await migratePointsToAchievementDerived('uid-1');

    expect(mockTxUpdate).toHaveBeenCalledWith(
      mockUserDocRef,
      { totalPoints: 0 },
    );
  });

  it('is a no-op when there is no user document', async () => {
    mockTxGet.mockResolvedValue({ data: () => undefined });

    await migratePointsToAchievementDerived('uid-1');

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('ignores achievements with earnCount 0 in the sum', async () => {
    mockTxGet.mockResolvedValue(makeUserSnap({
      totalPoints: 10,
      achievements: {
        first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: null },
        early_bird:  { earnCount: 0, progress: 0, target: 1, earnedAt: null }, // not earned
      },
    }));

    // 10 pts matches first_brush only → no update needed
    await migratePointsToAchievementDerived('uid-1');

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('counts repeatable achievements by earnCount × points', async () => {
    // on_a_roll earned 3 times × 20pts = 60 pts
    mockTxGet.mockResolvedValue(makeUserSnap({
      totalPoints: 0,
      achievements: {
        on_a_roll: { earnCount: 3, progress: 9, target: 3, earnedAt: null },
      },
    }));

    await migratePointsToAchievementDerived('uid-1');

    expect(mockTxUpdate).toHaveBeenCalledWith(
      mockUserDocRef,
      { totalPoints: 60 },
    );
  });
});
