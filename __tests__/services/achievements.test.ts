/**
 * Unit tests for src/services/achievements.ts (KAN-32).
 *
 * Covers:
 *   checkAndAwardDailyComplete
 *     - returns early without writing if achievement already exists
 *     - calls awardAchievement with correct achievementId, type, and metadata
 *     - fires a notifee notification after awarding
 *     - creates Android channel before firing notification
 *     - does NOT create channel or notify if already awarded (early return)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockHasAchievement  = jest.fn();
const mockAwardAchievement = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  hasAchievement:  (...args: unknown[]) => mockHasAchievement(...args),
  awardAchievement: (...args: unknown[]) => mockAwardAchievement(...args),
}));

const mockCreateChannel        = jest.fn();
const mockDisplayNotification  = jest.fn();

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:        (...args: unknown[]) => mockCreateChannel(...args),
    displayNotification:  (...args: unknown[]) => mockDisplayNotification(...args),
  },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// ─── Import (after mocks) ─────────────────────────────────────────────────────

import { checkAndAwardDailyComplete } from '../../src/services/achievements';

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAwardAchievement.mockResolvedValue(undefined);
  mockCreateChannel.mockResolvedValue(undefined);
  mockDisplayNotification.mockResolvedValue(undefined);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkAndAwardDailyComplete', () => {
  it('returns early without writing if achievement already exists', async () => {
    mockHasAchievement.mockResolvedValue(true);

    await checkAndAwardDailyComplete('uid-1', '2026-05-29');

    expect(mockAwardAchievement).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('calls awardAchievement with correct achievementId, type, and metadata (base)', async () => {
    mockHasAchievement.mockResolvedValue(false);

    await checkAndAwardDailyComplete('uid-1', '2026-05-29');

    expect(mockAwardAchievement).toHaveBeenCalledWith(
      'uid-1',
      'daily_complete_2026-05-29',
      'daily_complete',
      { date: '2026-05-29' },
    );
  });

  it('includes totalTasks and totalPoints in metadata when provided', async () => {
    mockHasAchievement.mockResolvedValue(false);

    await checkAndAwardDailyComplete('uid-1', '2026-05-29', 5, 5);

    expect(mockAwardAchievement).toHaveBeenCalledWith(
      'uid-1',
      'daily_complete_2026-05-29',
      'daily_complete',
      { date: '2026-05-29', totalTasks: 5, totalPoints: 5 },
    );
  });

  it('fires a notifee notification after awarding', async () => {
    mockHasAchievement.mockResolvedValue(false);

    await checkAndAwardDailyComplete('uid-1', '2026-05-29');

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        body:  expect.any(String),
        data:  expect.objectContaining({ screen: 'Today' }),
      }),
    );
  });

  it('creates the Android achievement channel before firing notification', async () => {
    mockHasAchievement.mockResolvedValue(false);

    await checkAndAwardDailyComplete('uid-1', '2026-05-29');

    // Channel must be created before the notification fires.
    const createOrder  = mockCreateChannel.mock.invocationCallOrder[0];
    const notifyOrder  = mockDisplayNotification.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(notifyOrder);
    expect(mockCreateChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'achievements' }),
    );
  });

  it('does NOT notify on a second call for the same date (already awarded)', async () => {
    // First call — awards and notifies.
    mockHasAchievement.mockResolvedValueOnce(false);
    await checkAndAwardDailyComplete('uid-1', '2026-05-29');
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);

    // Second call — already awarded.
    mockHasAchievement.mockResolvedValueOnce(true);
    await checkAndAwardDailyComplete('uid-1', '2026-05-29');
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1); // still 1
  });
});
