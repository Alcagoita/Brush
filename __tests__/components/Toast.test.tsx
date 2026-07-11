/**
 * KAN-149 — Toast component unit tests.
 * KAN-244 — optional action button.
 *
 * Covers:
 *   - Renders nothing when there's no message
 *   - Renders the message and announces it for screen readers
 *   - Auto-dismisses after ~2.5s, clearing the store
 *   - A new message while one is showing resets the dismiss timer
 *   - An action-bearing toast renders the action button, fires onPress and
 *     hides on tap, and gets a longer auto-dismiss window
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Toast from '../../src/components/Toast';
import { useToastStore } from '../../src/store/toastStore';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: { surface: '#f6f5f1', text: '#1a1a18', accent: '#e8a86a' },
  }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  useToastStore.setState({ message: null, action: null });
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

  // KAN-244 — action button
  it('renders the action button when the toast has one', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Invitation', { label: 'Show me', onPress: jest.fn() }); });
    expect(screen.getByRole('button', { name: 'Show me' })).toBeTruthy();
  });

  it('tapping the action fires onPress and hides the toast', () => {
    const onPress = jest.fn();
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Invitation', { label: 'Show me', onPress }); });

    fireEvent.press(screen.getByRole('button', { name: 'Show me' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().message).toBeNull();
    expect(useToastStore.getState().action).toBeNull();
  });

  it('still hides the toast even when onPress throws', () => {
    const onPress = jest.fn(() => { throw new Error('boom'); });
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Invitation', { label: 'Show me', onPress }); });

    expect(() => fireEvent.press(screen.getByRole('button', { name: 'Show me' }))).toThrow('boom');

    expect(useToastStore.getState().message).toBeNull();
    expect(useToastStore.getState().action).toBeNull();
  });

  it('a plain toast (no action) renders no action button', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Just a message'); });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('an action-bearing toast stays past the plain ~2.5s dismiss window', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Invitation', { label: 'Show me', onPress: jest.fn() }); });

    act(() => { jest.advanceTimersByTime(2500); });

    expect(useToastStore.getState().message).toBe('Invitation');
  });

  it('an action-bearing toast auto-dismisses after its longer window', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Invitation', { label: 'Show me', onPress: jest.fn() }); });

    act(() => { jest.advanceTimersByTime(4500); });
    act(() => { jest.advanceTimersByTime(250); }); // fade-out animation callback

    expect(useToastStore.getState().message).toBeNull();
  });

  it('re-showing the same message with an action added resets the timer to the longer window', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Same text'); });

    // Just under the plain 2.5s window.
    act(() => { jest.advanceTimersByTime(2000); });

    // Same message text, but now with an action — must not inherit the
    // already-running plain-dismiss timer.
    act(() => { useToastStore.getState().showToast('Same text', { label: 'Show me', onPress: jest.fn() }); });

    act(() => { jest.advanceTimersByTime(500); }); // 2500ms since first show — old plain timer would fire here
    expect(useToastStore.getState().message).toBe('Same text'); // would have fired under the old bug

    act(() => { jest.advanceTimersByTime(4000); }); // 4500ms since the action was added (2000 + 500 + 4000)
    act(() => { jest.advanceTimersByTime(250); }); // fade-out animation callback
    expect(useToastStore.getState().message).toBeNull();
  });

  it('re-showing the same message with an action added re-announces for screen readers', () => {
    render(<Toast />);
    act(() => { useToastStore.getState().showToast('Same text'); });
    (AccessibilityInfo.announceForAccessibility as jest.Mock).mockClear();

    act(() => { useToastStore.getState().showToast('Same text', { label: 'Show me', onPress: jest.fn() }); });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Same text');
  });
});
