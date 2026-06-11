/**
 * KAN-124 — onUserInactive helpers unit tests
 *
 * Tests the pure helpers (isQuietHour, shouldSendNudge) and the per-user
 * processUser logic in isolation by mocking firebase-admin.
 *
 * The onUserInactive scheduled function itself is not unit-tested here
 * (it wraps Firestore queries and the firebase-functions scheduler) — it is
 * exercised in integration tests against the Firebase emulator.
 */

import {
  isQuietHour,
  shouldSendNudge,
  processUser,
  ONE_DAY_MS,
  QUIET_START,
  QUIET_END,
} from '../onUserInactive';

// ─── isQuietHour ──────────────────────────────────────────────────────────────

describe('isQuietHour', () => {
  function atUTCHour(hour: number): Date {
    const d = new Date('2024-06-09T00:00:00Z');
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  }

  it('returns true at QUIET_START (10 PM)', () => {
    expect(isQuietHour(atUTCHour(QUIET_START))).toBe(true);
  });

  it('returns true at 23:00', () => {
    expect(isQuietHour(atUTCHour(23))).toBe(true);
  });

  it('returns true at midnight', () => {
    expect(isQuietHour(atUTCHour(0))).toBe(true);
  });

  it('returns true at one hour before QUIET_END', () => {
    expect(isQuietHour(atUTCHour(QUIET_END - 1))).toBe(true);
  });

  it('returns false at QUIET_END (8 AM — first active hour)', () => {
    expect(isQuietHour(atUTCHour(QUIET_END))).toBe(false);
  });

  it('returns false at noon', () => {
    expect(isQuietHour(atUTCHour(12))).toBe(false);
  });

  it('returns false one hour before QUIET_START (21:00)', () => {
    expect(isQuietHour(atUTCHour(QUIET_START - 1))).toBe(false);
  });
});

// ─── shouldSendNudge ─────────────────────────────────────────────────────────

describe('shouldSendNudge', () => {
  const now = new Date('2024-06-09T12:00:00Z');

  it('returns true when prefs are empty (toggle defaults to enabled)', () => {
    expect(shouldSendNudge({}, now)).toBe(true);
  });

  it('returns true when reengagementReminders is true and no prior nudge', () => {
    expect(shouldSendNudge({ reengagementReminders: true }, now)).toBe(true);
  });

  it('returns false when reengagementReminders is explicitly false', () => {
    expect(shouldSendNudge({ reengagementReminders: false }, now)).toBe(false);
  });

  it('returns false when lastReengagementNudge was < 24 h ago', () => {
    const recent = { toMillis: () => now.getTime() - ONE_DAY_MS + 1 };
    expect(shouldSendNudge({ lastReengagementNudge: recent }, now)).toBe(false);
  });

  it('returns true when lastReengagementNudge was exactly 24 h ago', () => {
    const exact = { toMillis: () => now.getTime() - ONE_DAY_MS };
    expect(shouldSendNudge({ lastReengagementNudge: exact }, now)).toBe(true);
  });

  it('returns true when lastReengagementNudge was > 24 h ago', () => {
    const old = { toMillis: () => now.getTime() - ONE_DAY_MS - 3600_000 };
    expect(shouldSendNudge({ lastReengagementNudge: old }, now)).toBe(true);
  });

  it('returns true when lastReengagementNudge is null', () => {
    expect(shouldSendNudge({ lastReengagementNudge: null }, now)).toBe(true);
  });
});

// ─── processUser ─────────────────────────────────────────────────────────────

describe('processUser', () => {
  const UID = 'user-123';
  const NOW = new Date('2024-06-09T12:00:00Z');

  const mockSend = jest.fn();
  const mockSet  = jest.fn().mockResolvedValue(undefined);

  function makeDb(prefs: Record<string, unknown>, tokens: string[]) {
    return {
      collection: () => ({
        doc: () => ({
          collection: (subCol: string) => ({
            doc: () => ({
              get:  jest.fn().mockResolvedValue({ data: () => prefs }),
              set:  mockSet,
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

  it('returns false and skips send when reengagementReminders is false', async () => {
    const result = await processUser(UID, makeDb({ reengagementReminders: false }, ['tok']), makeMessaging(), NOW);
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns false and skips send when nudge was sent < 24 h ago', async () => {
    const prefs = { lastReengagementNudge: { toMillis: () => NOW.getTime() - ONE_DAY_MS + 1 } };
    const result = await processUser(UID, makeDb(prefs, ['tok']), makeMessaging(), NOW);
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns false and skips send when user has no registered tokens', async () => {
    const result = await processUser(UID, makeDb({}, []), makeMessaging(), NOW);
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('returns true and sends the nudge when eligible', async () => {
    const result = await processUser(UID, makeDb({}, ['tok-abc']), makeMessaging(), NOW);
    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const [msg] = mockSend.mock.calls[0];
    expect(msg.token).toBe('tok-abc');
    expect(msg.notification.body).toBe('Your list is waiting — brush something away.');
    expect(msg.data.screen).toBe('Today');
  });

  it('sends to every registered token', async () => {
    await processUser(UID, makeDb({}, ['t1', 't2', 't3']), makeMessaging(), NOW);
    expect(mockSend).toHaveBeenCalledTimes(3);
    const sentTokens = mockSend.mock.calls.map((c: any[]) => c[0].token);
    expect(sentTokens).toEqual(expect.arrayContaining(['t1', 't2', 't3']));
  });

  it('stamps lastReengagementNudge with merge:true after sending', async () => {
    await processUser(UID, makeDb({}, ['tok']), makeMessaging(), NOW);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [data, opts] = mockSet.mock.calls[0];
    expect(data).toHaveProperty('lastReengagementNudge');
    expect(opts).toEqual({ merge: true });
  });

  it('still stamps the date when one token send fails', async () => {
    mockSend
      .mockRejectedValueOnce(new Error('messaging/invalid-registration-token'))
      .mockResolvedValueOnce('msg-id');
    const result = await processUser(UID, makeDb({}, ['bad', 'good']), makeMessaging(), NOW);
    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it('does not stamp when skipped (no tokens)', async () => {
    await processUser(UID, makeDb({}, []), makeMessaging(), NOW);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
