/**
 * KAN-133 — ProgressRing: brand dot at arc tip.
 *
 * The ring now renders three animated circles:
 *   1. Track (background ring)
 *   2. Progress arc
 *   3. Brand dot halo (opacity 0.15)
 *   4. Brand dot core (solid)
 *
 * Verifies that the two dot circles are present and use palette.ringFill.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      ringTrack: 'rgba(20,20,18,0.08)',
      ringFill:  '#db9657',
    },
  }),
}));

// Minimal reanimated mock — returns plain objects for animatedProps.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule:              true,
    default:                 { View, createAnimatedComponent: (c: unknown) => c },
    useSharedValue:          (v: unknown) => ({ value: v }),
    useAnimatedProps:        (fn: () => unknown) => fn(),
    withTiming:              (v: unknown) => v,
    useEffect:               require('react').useEffect,
  };
});

// Mock react-native-svg: render Circle as a View-like stub that accepts data-testid.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const stub  = (name: string) => (props: Record<string, unknown>) =>
    React.createElement('View', { testID: name, ...props });
  return {
    __esModule: true,
    default:    stub('Svg'),
    Circle:     stub('Circle'),
  };
});

import ProgressRing from '../../src/components/ProgressRing';

// ─── Tests ────────────────────────────────────────────────────────────────────
// Geometry props (diameter/strokeWidth) are now fixed plain numbers — the
// scroll collapse is a parent transform, not per-frame SVG geometry.

describe('ProgressRing — KAN-133 brand dot', () => {
  it('renders four Circle elements (track, arc, halo dot, core dot)', () => {
    const { UNSAFE_getAllByProps } = render(
      <ProgressRing
        progress={0.5}
        diameter={120}
        strokeWidth={10}
      />,
    );
    // All Circle stubs will have testID="Circle"
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles.length).toBe(4);
  });

  it('halo dot has opacity 0.15', () => {
    const { UNSAFE_getAllByProps } = render(
      <ProgressRing
        progress={0.5}
        diameter={120}
        strokeWidth={10}
      />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    // Halo is the 3rd circle (index 2)
    expect(circles[2].props.opacity).toBe(0.15);
  });

  it('halo and core dots use palette.ringFill as fill', () => {
    const { UNSAFE_getAllByProps } = render(
      <ProgressRing
        progress={0.5}
        diameter={120}
        strokeWidth={10}
      />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles[2].props.fill).toBe('#db9657');
    expect(circles[3].props.fill).toBe('#db9657');
  });

  it('core dot is present at 0% progress (resting at 12 o\'clock)', () => {
    const { UNSAFE_getAllByProps } = render(
      <ProgressRing
        progress={0}
        diameter={120}
        strokeWidth={10}
      />,
    );
    const circles = UNSAFE_getAllByProps({ testID: 'Circle' });
    expect(circles[3]).toBeDefined();
    // Geometry is now a direct prop (static render — no animatedProps).
    // At 0%: angle=0 → cos(0)=1
    // cx = d/2 + DOT_PADDING + r*cos(0) = 60 + 12 + 55 = 127
    expect(circles[3].props.cx).toBeCloseTo(127, 0);
  });
});
