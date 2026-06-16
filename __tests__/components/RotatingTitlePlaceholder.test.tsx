/**
 * KAN-148 — RotatingTitlePlaceholder unit tests.
 *
 * Covers:
 *   - Renders the first example initially
 *   - Rotates to the next example after the interval, while active
 *   - Stops rotating once `active` goes false (permanent freeze)
 *   - Reduced motion: shows the first example statically, no interval
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import RotatingTitlePlaceholder from '../../src/components/RotatingTitlePlaceholder';

const EXAMPLES = ['First example…', 'Second example…', 'Third example…'];

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('RotatingTitlePlaceholder', () => {
  it('renders the first example initially', () => {
    render(<RotatingTitlePlaceholder examples={EXAMPLES} active />);
    expect(screen.getByText('First example…')).toBeTruthy();
  });

  it('rotates to the next example after the interval while active', async () => {
    render(<RotatingTitlePlaceholder examples={EXAMPLES} active intervalMs={4000} />);
    await act(async () => { await Promise.resolve(); }); // flush isReduceMotionEnabled

    act(() => { jest.advanceTimersByTime(4000); });
    act(() => { jest.advanceTimersByTime(250); }); // fade-out then fade-in callback

    expect(screen.getByText('Second example…')).toBeTruthy();
  });

  it('does not rotate when active is false from the start', async () => {
    render(<RotatingTitlePlaceholder examples={EXAMPLES} active={false} intervalMs={4000} />);
    await act(async () => { await Promise.resolve(); });

    act(() => { jest.advanceTimersByTime(10000); });

    expect(screen.getByText('First example…')).toBeTruthy();
  });

  it('freezes on the current example once active flips to false mid-rotation', async () => {
    const { rerender } = render(
      <RotatingTitlePlaceholder examples={EXAMPLES} active intervalMs={4000} />,
    );
    await act(async () => { await Promise.resolve(); });

    act(() => { jest.advanceTimersByTime(4000); });
    act(() => { jest.advanceTimersByTime(250); });
    expect(screen.getByText('Second example…')).toBeTruthy();

    rerender(<RotatingTitlePlaceholder examples={EXAMPLES} active={false} intervalMs={4000} />);
    act(() => { jest.advanceTimersByTime(10000); });

    // Stays on "Second example…" — never advances after active goes false.
    expect(screen.getByText('Second example…')).toBeTruthy();
  });

  it('shows the first example statically with reduced motion, no rotation', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<RotatingTitlePlaceholder examples={EXAMPLES} active intervalMs={4000} />);
    await act(async () => { await Promise.resolve(); });

    act(() => { jest.advanceTimersByTime(10000); });

    expect(screen.getByText('First example…')).toBeTruthy();
  });
});
