/**
 * SplashScreen unit tests — KAN-151
 *
 * Tests focus on the data-loading and store-population logic.
 * The Reanimated animation cycle is mocked (it cannot run in Jest).
 */

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/services/firestore', () => ({
  getTasksForDate:         jest.fn(),
  getUser:                 jest.fn(),
  getUserPreferences:      jest.fn(),
  getPoiPreferencesMap:    jest.fn(),
  getCategories:           jest.fn(),
  getTotalPoints:          jest.fn(),
  getInboxUnreadCount:     jest.fn(),
  loadLearnedKeywords:     jest.fn(),
  rolloverIncompleteTasks: jest.fn(),
}));

jest.mock('../../src/services/sharing', () => ({
  getIncomingSharedTasksCount: jest.fn(),
}));

jest.mock('../../src/utils/date', () => ({
  todayISO: () => '2026-06-15',
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement('svg', null, children),
    Path: () => null,
  };
});

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { useAuth } from '../../src/hooks/useAuth';
import {
  getTasksForDate,
  getUser,
  getUserPreferences,
  getPoiPreferencesMap,
  getCategories,
  getTotalPoints,
  getInboxUnreadCount,
  loadLearnedKeywords,
  rolloverIncompleteTasks,
} from '../../src/services/firestore';
import { getIncomingSharedTasksCount } from '../../src/services/sharing';
import { useAppStore } from '../../src/store/appStore';
import SplashScreen from '../../src/screens/SplashScreen';

const mockUseAuth = useAuth as jest.Mock;
const mockGetTasksForDate      = getTasksForDate      as jest.Mock;
const mockGetUser              = getUser              as jest.Mock;
const mockGetUserPreferences   = getUserPreferences   as jest.Mock;
const mockGetPoiPreferencesMap = getPoiPreferencesMap as jest.Mock;
const mockGetCategories        = getCategories        as jest.Mock;
const mockGetTotalPoints       = getTotalPoints       as jest.Mock;
const mockGetIncomingCount     = getIncomingSharedTasksCount as jest.Mock;
const mockGetInboxUnreadCount  = getInboxUnreadCount  as jest.Mock;
const mockLoadLearnedKeywords  = loadLearnedKeywords  as jest.Mock;
const mockRolloverIncompleteTasks = rolloverIncompleteTasks as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  useAppStore.setState({ bootData: null });

  mockGetTasksForDate.mockResolvedValue([]);
  mockGetUser.mockResolvedValue({ uid: 'u1', username: 'alice', onboardingDone: true });
  mockGetUserPreferences.mockResolvedValue({});
  mockGetPoiPreferencesMap.mockResolvedValue({});
  mockGetCategories.mockResolvedValue([]);
  mockGetTotalPoints.mockResolvedValue(5);
  mockGetIncomingCount.mockResolvedValue(2);
  mockGetInboxUnreadCount.mockResolvedValue(0);
  mockLoadLearnedKeywords.mockResolvedValue(undefined);
  mockRolloverIncompleteTasks.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('SplashScreen', () => {
  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user:    { uid: 'u1' },
        loading: false,
      });
    });

    it('populates the Zustand store with all 7 Firestore responses', async () => {
      const onExit = jest.fn();
      render(<SplashScreen onExit={onExit} />);

      await act(async () => { await Promise.resolve(); });

      const boot = useAppStore.getState().bootData;
      expect(boot).not.toBeNull();
      expect(boot?.ownerUid).toBe('u1');
      expect(boot?.totalPoints).toBe(5);
      expect(boot?.inboxCount).toBe(2);
      expect(boot?.userData?.username).toBe('alice');
    });

    it('fetches tasks for today\'s date', async () => {
      render(<SplashScreen onExit={jest.fn()} />);
      await act(async () => { await Promise.resolve(); });

      expect(mockGetTasksForDate).toHaveBeenCalledWith('u1', '2026-06-15');
    });

    it('rolls over incomplete tasks before fetching today\'s task list (KAN-146)', async () => {
      const callOrder: string[] = [];
      mockRolloverIncompleteTasks.mockImplementation(async () => { callOrder.push('rollover'); });
      mockGetTasksForDate.mockImplementation(async () => { callOrder.push('getTasksForDate'); return []; });

      render(<SplashScreen onExit={jest.fn()} />);
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });

      expect(mockRolloverIncompleteTasks).toHaveBeenCalledWith('u1');
      expect(callOrder).toEqual(['rollover', 'getTasksForDate']);
    });

    it('still loads today\'s data when rollover fails (non-fatal)', async () => {
      mockRolloverIncompleteTasks.mockRejectedValue(new Error('rollover boom'));

      render(<SplashScreen onExit={jest.fn()} />);
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });

      expect(mockGetTasksForDate).toHaveBeenCalledWith('u1', '2026-06-15');
      expect(useAppStore.getState().bootData).not.toBeNull();
    });

    it('calls onExit after the abort timer when rest phase is not reached', async () => {
      const onExit = jest.fn();
      render(<SplashScreen onExit={onExit} />);

      await act(async () => { await Promise.resolve(); });

      // Abort timer fires 4 s after data is ready
      act(() => { jest.advanceTimersByTime(4_100); });
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('stores boot data even when all services succeed with empty results', async () => {
      mockGetTotalPoints.mockResolvedValue(0);
      mockGetIncomingCount.mockResolvedValue(0);

      render(<SplashScreen onExit={jest.fn()} />);
      await act(async () => { await Promise.resolve(); });

      expect(useAppStore.getState().bootData?.totalPoints).toBe(0);
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
    });

    it('does not call any Firestore service', async () => {
      render(<SplashScreen onExit={jest.fn()} />);
      await act(async () => { await Promise.resolve(); });

      expect(mockGetTasksForDate).not.toHaveBeenCalled();
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockGetUserPreferences).not.toHaveBeenCalled();
      expect(mockGetPoiPreferencesMap).not.toHaveBeenCalled();
      expect(mockGetCategories).not.toHaveBeenCalled();
      expect(mockGetTotalPoints).not.toHaveBeenCalled();
      expect(mockGetIncomingCount).not.toHaveBeenCalled();
      expect(mockGetInboxUnreadCount).not.toHaveBeenCalled();
      expect(mockLoadLearnedKeywords).not.toHaveBeenCalled();
      expect(mockRolloverIncompleteTasks).not.toHaveBeenCalled();
    });

    it('does not populate the store', async () => {
      render(<SplashScreen onExit={jest.fn()} />);
      await act(async () => { await Promise.resolve(); });

      expect(useAppStore.getState().bootData).toBeNull();
    });

    it('calls onExit after the abort timer', async () => {
      const onExit = jest.fn();
      render(<SplashScreen onExit={onExit} />);

      await act(async () => { await Promise.resolve(); });
      act(() => { jest.advanceTimersByTime(4_100); });

      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('when auth is still loading', () => {
    it('does not call any Firestore service while loading', async () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      render(<SplashScreen onExit={jest.fn()} />);
      await act(async () => { await Promise.resolve(); });

      expect(mockGetTasksForDate).not.toHaveBeenCalled();
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockGetUserPreferences).not.toHaveBeenCalled();
      expect(mockGetPoiPreferencesMap).not.toHaveBeenCalled();
      expect(mockGetCategories).not.toHaveBeenCalled();
      expect(mockGetTotalPoints).not.toHaveBeenCalled();
      expect(mockGetIncomingCount).not.toHaveBeenCalled();
      expect(mockGetInboxUnreadCount).not.toHaveBeenCalled();
      expect(mockLoadLearnedKeywords).not.toHaveBeenCalled();
      expect(mockRolloverIncompleteTasks).not.toHaveBeenCalled();
    });
  });

  describe('when Firestore fetch fails', () => {
    it('calls onExit via abort timer even on error', async () => {
      mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false });
      mockGetTasksForDate.mockRejectedValue(new Error('network'));

      const onExit = jest.fn();
      render(<SplashScreen onExit={onExit} />);
      await act(async () => { await Promise.resolve(); });

      act(() => { jest.advanceTimersByTime(4_100); });
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });
});
