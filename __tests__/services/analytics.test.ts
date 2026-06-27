/**
 * KAN-207 — analytics wrapper
 *
 * Verifies that logTap:
 *   - calls analytics().logEvent with the correct event name and params
 *   - never throws on async rejection
 *   - never throws on synchronous SDK error (native module not available)
 */

const mockLogEvent = jest.fn(() => Promise.resolve());
const mockAnalyticsInstance = { logEvent: mockLogEvent };

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: jest.fn(() => mockAnalyticsInstance),
}));

import { logTap } from '../../src/services/analytics';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('logTap', () => {
  it('calls analytics().logEvent with event name', () => {
    logTap('task_complete');
    expect(mockLogEvent).toHaveBeenCalledWith('task_complete', undefined);
  });

  it('passes params to logEvent', () => {
    logTap('task_create', { category: 'errands' });
    expect(mockLogEvent).toHaveBeenCalledWith('task_create', { category: 'errands' });
  });

  it('does not throw when SDK rejects asynchronously', async () => {
    mockLogEvent.mockRejectedValueOnce(new Error('SDK error'));
    expect(() => logTap('login', { method: 'email' })).not.toThrow();
    // Allow microtask to settle — rejection must be swallowed
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('does not throw when analytics() throws synchronously', () => {
    const { default: analyticsMock } = require('@react-native-firebase/analytics');
    analyticsMock.mockImplementationOnce(() => { throw new Error('Native module unavailable'); });
    expect(() => logTap('task_complete')).not.toThrow();
  });

  it('fires for every event type in the union without type error', () => {
    const events = [
      'task_complete', 'task_create', 'task_edit', 'task_delete',
      'poi_chip_tap', 'nearby_open_maps', 'nearby_refresh',
      'login', 'logout', 'share_task', 'share_profile',
      'calendar_import', 'challenge_create',
      'achievement_unlocked', 'settings_theme_toggle',
    ] as const;

    events.forEach(event => logTap(event));
    expect(mockLogEvent).toHaveBeenCalledTimes(events.length);
  });
});
