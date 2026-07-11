/**
 * KAN-145 — CalendarRing: 5-state progress ring for the Calendar screen.
 *
 * States:
 *   no ring   — total === 0 or isFuture → renders nothing
 *   skipped   — past, 0% done, had tasks → track only, opacity 0.5
 *   partial   — 0 < done < total → partial arc, ringFill (or selected-arc tone)
 *   complete  — done === total (> 0) → closed full ring, accent, +0.5 stroke
 *
 * Plus the theme-aware selected-cell color inversion (never hard-coded white).
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Mock react-native-svg: render Circle as a View-like stub that accepts data-testid.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const stub  = (name: string) => (props: Record<string, unknown>) =>
    React.createElement('View', { testID: name, ...props });
  return {
    __esModule: true,
    default: stub('Svg'),
    Circle:  stub('Circle'),
  };
});

import CalendarRing from '../../src/components/CalendarRing';

const BASE_PROPS = {
  size: 36,
  stroke: 2.6,
  isFuture: false,
  isSelected: false,
  ringTrack: 'rgba(40,33,20,0.08)',
  ringFill: '#d9a87a',
  accent: '#e8a86a',
  selTrack: 'rgba(255,255,255,0.20)',
  selArc: 'rgba(255,255,255,0.88)',
};

describe('CalendarRing', () => {
  it('renders nothing when total is 0', () => {
    const { UNSAFE_queryAllByProps } = render(
      <CalendarRing {...BASE_PROPS} done={0} total={0} />,
    );
    expect(UNSAFE_queryAllByProps({ testID: 'Svg' }).length).toBe(0);
  });

  it('renders nothing when isFuture is true, even with tasks', () => {
    const { UNSAFE_queryAllByProps } = render(
      <CalendarRing {...BASE_PROPS} done={1} total={3} isFuture />,
    );
    expect(UNSAFE_queryAllByProps({ testID: 'Svg' }).length).toBe(0);
  });

  it('"skipped" state: track only at opacity 0.5, no arc', () => {
    const { UNSAFE_getAllByProps } = render(
      <CalendarRing {...BASE_PROPS} done={0} total={3} />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles.length).toBe(1); // track only
    expect(circles[0].props.opacity).toBe(0.5);
    expect(circles[0].props.stroke).toBe(BASE_PROPS.ringTrack);
  });

  it('partial state: track at full opacity + a dashed arc in ringFill', () => {
    const { UNSAFE_getAllByProps } = render(
      <CalendarRing {...BASE_PROPS} done={1} total={3} />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles.length).toBe(2); // track + arc
    expect(circles[0].props.opacity).toBe(1);
    expect(circles[1].props.stroke).toBe(BASE_PROPS.ringFill);
    expect(circles[1].props.strokeLinecap).toBe('round');
    expect(circles[1].props.strokeDasharray).toBeDefined();
  });

  it('complete state: closed full ring in accent, no strokeDasharray, heavier stroke', () => {
    const { UNSAFE_getAllByProps } = render(
      <CalendarRing {...BASE_PROPS} done={3} total={3} />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles.length).toBe(2); // track + closed arc
    expect(circles[1].props.stroke).toBe(BASE_PROPS.accent);
    expect(circles[1].props.strokeDasharray).toBeUndefined();
    expect(circles[1].props.strokeWidth).toBe(BASE_PROPS.stroke + 0.5);
  });

  it('selected cell in light mode uses the theme-aware inverted tones, not hard-coded white', () => {
    const { UNSAFE_getAllByProps } = render(
      <CalendarRing {...BASE_PROPS} done={1} total={3} isSelected />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles[0].props.stroke).toBe('rgba(255,255,255,0.20)');
    expect(circles[1].props.stroke).toBe('rgba(255,255,255,0.88)');
  });

  it('selected cell in dark mode uses the dark-mode inverted tones', () => {
    const { UNSAFE_getAllByProps } = render(
      <CalendarRing
        {...BASE_PROPS}
        done={1}
        total={3}
        isSelected
        selTrack="rgba(0,0,0,0.16)"
        selArc="rgba(20,18,14,0.82)"
      />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles[0].props.stroke).toBe('rgba(0,0,0,0.16)');
    expect(circles[1].props.stroke).toBe('rgba(20,18,14,0.82)');
  });

  it('a complete ring stays accent-colored even when selected', () => {
    const { UNSAFE_getAllByProps } = render(
      <CalendarRing {...BASE_PROPS} done={3} total={3} isSelected />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles[1].props.stroke).toBe(BASE_PROPS.accent);
  });
});
