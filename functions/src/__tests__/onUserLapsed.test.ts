/**
 * KAN-127 — onUserLapsed helpers unit tests
 *
 * Tests the pure helpers (shouldSendLapseNudge) and per-user processLapsedUser
 * logic in isolation by mocking firebase-admin.
 *
 * The onUserLapsed scheduled function itself is not unit-tested here —
 * it is exercised against the Firebase emulator in integration tests.
 */

import {
  shouldSendLapseNudge,
  processLapsedUser,
} from '../onUserLapsed';

// ─── shouldSendLapseNudge ─────────────────────────────────────────────────────

describe('shouldSendLapseNudge', () => {
  const nudgeTimestamp = { toMillis: () => Date.now() - 4 * 24 * 60 * 60 * 1000 };

  it('returns false when reengagementChurned is true', () => {
    expect(shouldSendLapseNudge({
      reengagementChurned: true,
      lastReengagementNudge: nudgeTimestamp,
    })).toBe(false);
  });

  it('returns false when lastReengagementNudge is absent (3-day nudge never sent)', () => {
    expect(shouldSendLapseNudge({})).toBe(false);
  });

  it('returns false when lastReengagementNudge is null', () => {
    expect(shouldSendLapseNudge({ lastReengagementNudge: null })).toBe(false);
  });

  it('returns true when 3-day nudge was sent and not yet churned', () => {
    expect(shouldSendLapseNudge({ lastReengagementNudge: nudgeTimestamp })).toBe(true);
  });

  it('returns false when reengagementReminders is explicitly false', () => {
    expect(shouldSendLapseNudge({
      reengagementReminders: false,
      lastReengagementNudge: nudgeTimestamp,
    })).toBe(false);
  });

  it('returns true when reengagementChurned is explicitly false', () => {
    expect(shouldSendLapseNudge({
      reengagementChurned: false,
      lastReengagementNudge: nudgeTimestamp,
    })).toBe(true);
  });

  it('returns true when prefs have lastReengagementNudge and no churn field', () => {
    expect(shouldSendLapseNudge({ lastReengagementNudge: nudgeTimestamp })).toBe(true);
  });
});

// ─── processLapsedUser ────────────────────────────────────────────────────────

describe('processLapsedUser', () => {
  const UID = 'user-lapsed-123';

  const mockSet  = jest.fn().mockResolvedValue(undefined);
  const mockSend = jest.fn();

  const nudgeTimestamp = { toMillis: () => Date.now() - 4 * 24 * 60 * 60 * 1000 };

  function makeDb(prefs: Record<string, unknown>, tokens: string[]) {
    return {
      collection: () => ({
        doc: () => ({
          collection: (subCol: string) => ({
            doc: () => ({
              get: jest.fn().mockResolvedValue({ data: () => prefs }),
              set: mockSet,
            }),
            get: jest.fn().mockResolvedValue({
              empty: tokens.length === 0,
              docs:  tokens.map(t => ({ id: t })),
            }),
          }),
        }),
      }),
    } as unknown as import('firebase-admin').firestore.Firestore;
  }

  function makeMessaging() {
    return { send: mockSend } as unknown as import('firebase-admin').messaging.Messaging;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue('msg-id');
  });

  it('returns false when reengagementChurned is true', async () => {
    const result = await processLapsedUser(
      UID,
      makeDb({ reengagementChurned: true, lastReengagementNudge: nudgeTimestamp }, ['tok']),
      makeMessaging(),
    );
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns false when lastReengagementNudge is absent', async () => {
    const result = await processLapsedUser(UID, makeDb({}, ['tok']), makeMessaging());
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns false when user has no registered tokens', async () => {
    const result = await processLapsedUser(
      UID,
      makeDb({ lastReengagementNudge: nudgeTimestamp }, []),
      makeMessaging(),
    );
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('returns true and sends when eligible', async () => {
    const result = await processLapsedUser(
      UID,
      makeDb({ lastReengagementNudge: nudgeTimestamp }, ['tok-abc']),
      makeMessaging(),
    );
    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const [msg] = mockSend.mock.calls[0];
    expect(msg.token).toBe('tok-abc');
    expect(msg.notification.body).toBe(
      "It's been a week. Your tasks haven't gone anywhere — brush when you're ready.",
    );
  });

  it('sends to every registered token', async () => {
    await processLapsedUser(
      UID,
      makeDb({ lastReengagementNudge: nudgeTimestamp }, ['t1', 't2', 't3']),
      makeMessaging(),
    );
    expect(mockSend).toHaveBeenCalledTimes(3);
    const sentTokens = mockSend.mock.calls.map((c: unknown[]) => (c[0] as { token: string }).token);
    expect(sentTokens).toEqual(expect.arrayContaining(['t1', 't2', 't3']));
  });

  it('sets data.screen = Today and filterToday = true', async () => {
    await processLapsedUser(
      UID,
      makeDb({ lastReengagementNudge: nudgeTimestamp }, ['tok']),
      makeMessaging(),
    );
    const [msg] = mockSend.mock.calls[0];
    expect(msg.data.screen).toBe('Today');
    expect(msg.data.filterToday).toBe('true');
  });

  it('stamps reengagementChurned: true with merge:true after sending', async () => {
    await processLapsedUser(
      UID,
      makeDb({ lastReengagementNudge: nudgeTimestamp }, ['tok']),
      makeMessaging(),
    );
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [data, opts] = mockSet.mock.calls[0];
    expect(data).toEqual({ reengagementChurned: true });
    expect(opts).toEqual({ merge: true });
  });

  it('stamps churn even when one token send fails', async () => {
    mockSend
      .mockRejectedValueOnce(new Error('messaging/invalid-registration-token'))
      .mockResolvedValueOnce('msg-id');

    const result = await processLapsedUser(
      UID,
      makeDb({ lastReengagementNudge: nudgeTimestamp }, ['bad', 'good']),
      makeMessaging(),
    );
    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it('does not stamp when skipped (no tokens)', async () => {
    await processLapsedUser(
      UID,
      makeDb({ lastReengagementNudge: nudgeTimestamp }, []),
      makeMessaging(),
    );
    expect(mockSet).not.toHaveBeenCalled();
  });
});
