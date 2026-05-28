/**
 * KAN-26 — useFCM hook tests.
 *
 * Covers:
 *   - No-op when userId is null
 *   - Permission denied → no token saved
 *   - Permission granted → token fetched and saved to Firestore
 *   - Token refresh → new token saved to Firestore
 *   - Unsubscribes from token refresh on unmount
 */

// ─── Firebase mocks ───────────────────────────────────────────────────────────

const mockRequestPermission = jest.fn();
const mockGetToken          = jest.fn();
const mockOnTokenRefresh    = jest.fn();
const mockSetDoc            = jest.fn();
const mockGetMessaging      = jest.fn(() => ({}));
const mockGetFirestore      = jest.fn();
const mockDoc               = jest.fn(() => ({ _type: 'doc' }));
const mockServerTimestamp   = jest.fn(() => 'SERVER_TIMESTAMP');

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging:          (...args: unknown[]) => mockGetMessaging(...args),
  requestPermission:     (...args: unknown[]) => mockRequestPermission(...args),
  getToken:              (...args: unknown[]) => mockGetToken(...args),
  onTokenRefresh:        (...args: unknown[]) => mockOnTokenRefresh(...args),
  AuthorizationStatus: {
    AUTHORIZED:   1,
    PROVISIONAL:  2,
    DENIED:       0,
    NOT_DETERMINED: -1,
  },
}));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    (...args: unknown[]) => mockGetFirestore(...args),
  doc:             (...args: unknown[]) => mockDoc(...args),
  setDoc:          (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: (...args: unknown[]) => mockServerTimestamp(...args),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useFCM } from '../../src/hooks/useFCM';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function grantPermission() {
  mockRequestPermission.mockResolvedValue(1); // AUTHORIZED
}

function denyPermission() {
  mockRequestPermission.mockResolvedValue(0); // DENIED
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useFCM', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
    mockGetToken.mockResolvedValue('test-fcm-token-abc123');
    mockOnTokenRefresh.mockReturnValue(jest.fn()); // returns unsubscribe fn
  });

  it('is a no-op when userId is null', async () => {
    const { unmount } = renderHook(() => useFCM(null));
    unmount();

    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('does not save a token when permission is denied', async () => {
    denyPermission();

    const { unmount } = renderHook(() => useFCM('uid-1'));
    // Let async setup() run
    await new Promise(r => setTimeout(r, 0));
    unmount();

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('fetches and saves token to Firestore when permission is granted', async () => {
    grantPermission();

    renderHook(() => useFCM('uid-42'));
    await new Promise(r => setTimeout(r, 0));

    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      { createdAt: 'SERVER_TIMESTAMP' },
    );
  });

  it('also accepts PROVISIONAL permission status', async () => {
    mockRequestPermission.mockResolvedValue(2); // PROVISIONAL

    renderHook(() => useFCM('uid-provisional'));
    await new Promise(r => setTimeout(r, 0));

    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('subscribes to token refresh and saves the new token', async () => {
    grantPermission();

    let capturedRefreshCb: ((token: string) => void) | null = null;
    mockOnTokenRefresh.mockImplementation((_msg: unknown, cb: (t: string) => void) => {
      capturedRefreshCb = cb;
      return jest.fn();
    });

    renderHook(() => useFCM('uid-refresh'));
    await new Promise(r => setTimeout(r, 0));

    // Simulate FCM rotating the token
    capturedRefreshCb!('rotated-token-xyz');
    await new Promise(r => setTimeout(r, 0));

    expect(mockSetDoc).toHaveBeenCalledTimes(2); // initial + refresh
  });

  it('unsubscribes from token refresh on unmount', async () => {
    grantPermission();
    const unsubscribe = jest.fn();
    mockOnTokenRefresh.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useFCM('uid-unmount'));
    await new Promise(r => setTimeout(r, 0));
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('re-runs setup when userId changes from null to a value', async () => {
    grantPermission();

    const { rerender } = renderHook(({ uid }) => useFCM(uid), {
      initialProps: { uid: null as string | null },
    });
    await new Promise(r => setTimeout(r, 0));

    expect(mockGetToken).not.toHaveBeenCalled();

    rerender({ uid: 'uid-late' });
    await new Promise(r => setTimeout(r, 0));

    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });
});
