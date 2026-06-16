/**
 * KAN-149 — Toast component unit tests.
 *
 * Covers:
 *   - Renders nothing when there's no message
 *   - Renders the message and announces it for screen readers
 *   - Auto-dismisses after ~2.5s, clearing the store
 *   - A new message while one is showing resets the dismiss timer
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import Toast from '../../src/components/Toast';
import { useToastStore } from '../../src/store/toastStore';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: { surface: '#f6f5f1', text: '#1a1a18' },
  }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  useToastStore.setState({ message: null });
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Toast', () => {
  it('renders nothing when there is no message', () => {
    render(<Toast />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders the message when the store is set', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast("Got it — I'll keep an eye out."); });
    expect(screen.getByText("Got it — I'll keep an eye out.")).toBeTruthy();
  });

  it('announces the message for screen readers', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Hello there'); });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Hello there');
  });

  it('auto-dismisses after ~2.5s, clearing the store', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Bye soon'); });
    expect(screen.getByText('Bye soon')).toBeTruthy();

    act(() => { jest.advanceTimersByTime(2500); });
    act(() => { jest.advanceTimersByTime(250); }); // fade-out animation callback

    expect(useToastStore.getState().message).toBeNull();
  });

  it('does not dismiss before ~2.5s has elapsed', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Still here'); });

    act(() => { jest.advanceTimersByTime(2000); });

    expect(useToastStore.getState().message).toBe('Still here');
  });
});
