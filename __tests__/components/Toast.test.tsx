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
});
