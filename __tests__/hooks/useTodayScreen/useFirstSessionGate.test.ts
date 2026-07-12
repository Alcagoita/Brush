/**
 * KAN-245 — useFirstSessionGate: "never during the first session" gate for
 * contextual trip suggestions.
 */

const mockGetUser = jest.fn();
const mockUpsertUser = jest.fn().mockResolvedValue(undefined);
const mockServerTimestamp = jest.fn().mockReturnValue('SERVER_TIMESTAMP');

jest.mock('../../../src/services/firestore', () => ({
  getUser: (...args: unknown[]) => mockGetUser(...args),
  upsertUser: (...args: unknown[]) => mockUpsertUser(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useFirstSessionGate } from '../../../src/hooks/useTodayScreen/useFirstSessionGate';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useFirstSessionGate', () => {
  it('returns false when uid is undefined', () => {
    const { result } = renderHook(() => useFirstSessionGate(undefined));
    expect(result.current).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns true and stamps firstSessionSeenAt when the user has never had one', async () => {
    mockGetUser.mockResolvedValue({ uid: 'u1', email: 'a@b.com', displayName: 'A', darkMode: false });

    const { result } = renderHook(() => useFirstSessionGate('u1'));

    await waitFor(() => expect(result.current).toBe(true));
    expect(mockUpsertUser).toHaveBeenCalledWith('u1', { firstSessionSeenAt: 'SERVER_TIMESTAMP' });
  });

  it('returns false and does not write when firstSessionSeenAt is already set', async () => {
    mockGetUser.mockResolvedValue({
      uid: 'u1', email: 'a@b.com', displayName: 'A', darkMode: false,
      firstSessionSeenAt: { seconds: 1, nanoseconds: 0 },
    });

    const { result } = renderHook(() => useFirstSessionGate('u1'));

    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(result.current).toBe(false);
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it('fails closed (false) when the user fetch errors', async () => {
    mockGetUser.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useFirstSessionGate('u1'));

    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(result.current).toBe(false);
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it('does not update state after unmount', async () => {
    let resolveGetUser: (v: unknown) => void = () => {};
    mockGetUser.mockReturnValue(new Promise(resolve => { resolveGetUser = resolve; }));

    const { unmount } = renderHook(() => useFirstSessionGate('u1'));
    unmount();
    resolveGetUser({ uid: 'u1', email: 'a@b.com', displayName: 'A', darkMode: false });

    // No assertion needed beyond "doesn't throw" — the cancelled guard
    // prevents a setState-after-unmount warning/crash.
    await Promise.resolve();
  });
});
