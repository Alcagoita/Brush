/**
 * Unit tests for src/services/crashlytics.ts
 *
 * The three public functions (recordError, setCrashlyticsUser, logBreadcrumb)
 * are thin wrappers around Firebase Crashlytics. These tests verify:
 *   - correct arguments are forwarded to the SDK
 *   - optional parameters are handled properly
 *   - SDK errors are silently swallowed (crash reporters must never crash the app)
 */

import {
  logBreadcrumb,
  recordError,
  setCrashlyticsUser,
} from '../../src/services/crashlytics';

// ─── Mock Firebase Crashlytics ────────────────────────────────────────────────

const mockLog = jest.fn();
const mockRecordError = jest.fn();
const mockSetUserId = jest.fn();

// A stable object reference so we can assert the instance is forwarded correctly.
const mockInstance = {};

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: () => mockInstance,
  log: (...args: unknown[]) => mockLog(...args),
  recordError: (...args: unknown[]) => mockRecordError(...args),
  setUserId: (...args: unknown[]) => mockSetUserId(...args),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── recordError ───────────────────────────────────────────────────────────────

describe('recordError', () => {
  it('forwards the error to Crashlytics', () => {
    const error = new Error('boom');
    recordError(error);
    expect(mockRecordError).toHaveBeenCalledTimes(1);
    expect(mockRecordError).toHaveBeenCalledWith(mockInstance, error);
  });

  it('logs context as a breadcrumb before recording when context is provided', () => {
    const error = new Error('boom');
    recordError(error, 'checkout flow');
    expect(mockLog).toHaveBeenCalledWith(mockInstance, 'checkout flow');
    expect(mockRecordError).toHaveBeenCalledWith(mockInstance, error);
  });

  it('logs context before recording the error (order matters for crash timelines)', () => {
    const callOrder: string[] = [];
    mockLog.mockImplementation(() => callOrder.push('log'));
    mockRecordError.mockImplementation(() => callOrder.push('recordError'));

    recordError(new Error('boom'), 'some context');

    expect(callOrder).toEqual(['log', 'recordError']);
  });

  it('does not call log when context is omitted', () => {
    recordError(new Error('boom'));
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('does not throw when the Crashlytics SDK throws', () => {
    mockRecordError.mockImplementation(() => {
      throw new Error('SDK unavailable');
    });
    expect(() => recordError(new Error('boom'))).not.toThrow();
  });

  it('does not throw when log throws before recordError is reached', () => {
    mockLog.mockImplementation(() => {
      throw new Error('SDK unavailable');
    });
    expect(() => recordError(new Error('boom'), 'context')).not.toThrow();
  });
});

// ── setCrashlyticsUser ────────────────────────────────────────────────────────

describe('setCrashlyticsUser', () => {
  it('sets the uid when a string is provided', () => {
    setCrashlyticsUser('user-abc-123');
    expect(mockSetUserId).toHaveBeenCalledTimes(1);
    expect(mockSetUserId).toHaveBeenCalledWith(mockInstance, 'user-abc-123');
  });

  it('sets an empty string when uid is null (clears identity on sign-out)', () => {
    setCrashlyticsUser(null);
    expect(mockSetUserId).toHaveBeenCalledWith(mockInstance, '');
  });

  it('does not throw when the Crashlytics SDK throws', () => {
    mockSetUserId.mockImplementation(() => {
      throw new Error('SDK unavailable');
    });
    expect(() => setCrashlyticsUser('user-abc-123')).not.toThrow();
  });
});

// ── logBreadcrumb ─────────────────────────────────────────────────────────────

describe('logBreadcrumb', () => {
  it('forwards the message to Crashlytics log', () => {
    logBreadcrumb('user opened settings');
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(mockInstance, 'user opened settings');
  });

  it('does not throw when the Crashlytics SDK throws', () => {
    mockLog.mockImplementation(() => {
      throw new Error('SDK unavailable');
    });
    expect(() => logBreadcrumb('user opened settings')).not.toThrow();
  });
});
