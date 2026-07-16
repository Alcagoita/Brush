/**
 * KAN-134 — TaskRow: brush-away sweep animation.
 *
 * Verifies:
 *  - isReduceMotionEnabled is consulted when task transitions done=false→true
 *  - isReduceMotionEnabled is NOT consulted when done=true→false (no sweep)
 *  - isReduceMotionEnabled is NOT consulted on initial render with done=true
 *  - Sweep is skipped (SVG overlay absent) when reduce-motion is enabled
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react-native';
import TaskRow from '../../src/components/TaskRow';
import { AccessibilityInfo } from 'react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      text:      '#1f1c16',
      muted:     '#8b857a',
      faint:     '#c1bbac',
      accent:    '#e8a86a',
      surface:   '#f4f2ed',
      surface2:  '#ece9e2',
      line:      'rgba(40,33,20,0.08)',
      nearTint:  '#fdf7f0',
      nearTint2: '#f9ede0',
      nearBorder:'#e8c9a0',
      nearText:  '#7a4a20',
    },
  }),
}));

jest.mock('../../src/theme/tokens', () => ({
  categories: {
    errands:  { label: 'Errands',  color: '#8b6bc4' },
    health:   { label: 'Health',   color: '#5ba87a' },
    personal: { label: 'Personal', color: '#e8a86a' },
    work:     { label: 'Work',     color: '#5b7fd4' },
  },
}));

jest.mock('../../src/components/PoiChip',     () => () => null);
jest.mock('../../src/components/BrushStroke', () => () => null);
jest.mock('../../src/components/AppIcon',     () => ({
  BuildingIcon: () => null,
  CakeIcon:     () => null,
  NavigateIcon: () => null,
}));
// KAN-279 — takeMeThere.ts pulls in poiTypeCache.ts -> maps.ts ->
// placesFunctions.ts -> @react-native-firebase/functions (native, unavailable
// under Jest). Mocked at the service boundary, same as elsewhere.
jest.mock('../../src/services/takeMeThere', () => ({
  openTakeMeThereMaps:     jest.fn().mockResolvedValue(undefined),
  getTakeMeThereA11yLabel: jest.fn(() => 'Take me there'),
}));
jest.mock('../../src/constants/copy', () => ({
  COPY: {
    taskRow: {
      brushAway: (t: string) => `Brush away ${t}`,
      unbrush:   (t: string) => `Unbrush ${t}`,
    },
  },
}));

// Stub react-native-svg so no native module is needed
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default:    ({ children, ...p }: any) => <View {...p}>{children}</View>,
    Defs:       ({ children }: any) => <>{children}</>,
    LinearGradient: ({ children }: any) => <>{children}</>,
    Rect:       (p: any) => <View testID="brushSweepRect" {...p} />,
    Stop:       () => null,
  };
});

// Reanimated shims — use the official mock.
// withTiming is overridden to NOT invoke its callback synchronously; the real
// mock fires callback(true) immediately which would call setSweeping(false)
// before React re-renders, collapsing the overlay before we can assert on it.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  Reanimated.withTiming = (toValue: any) => toValue;
  return Reanimated;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_TASK = {
  id:        'task-1',
  title:     'Buy milk',
  category:  'errands' as const,
  done:      false,
  createdAt: { toDate: () => new Date() } as any,
  date:      '2026-06-08',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TaskRow — KAN-134 brush-away sweep', () => {
  let isReduceMotionSpy: jest.SpyInstance;

  beforeEach(() => {
    isReduceMotionSpy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('consults isReduceMotionEnabled when done goes false → true', async () => {
    const { rerender } = render(
      <TaskRow task={{ ...BASE_TASK, done: false }} onToggle={jest.fn()} />,
    );

    await act(async () => {
      rerender(<TaskRow task={{ ...BASE_TASK, done: true }} onToggle={jest.fn()} />);
    });

    expect(isReduceMotionSpy).toHaveBeenCalled();
  });

  it('does NOT consult isReduceMotionEnabled on done=true → done=false', async () => {
    // Start already done, then un-complete — should not trigger sweep.
    const { rerender } = render(
      <TaskRow task={{ ...BASE_TASK, done: true }} onToggle={jest.fn()} />,
    );
    // Clear any calls that might have happened during mount
    isReduceMotionSpy.mockClear();

    await act(async () => {
      rerender(<TaskRow task={{ ...BASE_TASK, done: false }} onToggle={jest.fn()} />);
    });

    expect(isReduceMotionSpy).not.toHaveBeenCalled();
  });

  it('does NOT consult isReduceMotionEnabled when task starts already done', () => {
    render(
      <TaskRow task={{ ...BASE_TASK, done: true }} onToggle={jest.fn()} />,
    );
    expect(isReduceMotionSpy).not.toHaveBeenCalled();
  });

  it('mounts sweep overlay when reduce-motion is disabled and task completes', async () => {
    // isReduceMotionSpy already resolves false from beforeEach
    const { rerender } = render(
      <TaskRow task={{ ...BASE_TASK, done: false }} onToggle={jest.fn()} />,
    );

    await act(async () => {
      rerender(<TaskRow task={{ ...BASE_TASK, done: true }} onToggle={jest.fn()} />);
    });

    // waitFor polls until the async promise chain settles and setSweeping(true)
    // triggers a re-render that mounts the overlay
    await waitFor(() => {
      expect(screen.queryByTestId('brushSweepRect')).not.toBeNull();
    });
  });

  it('does not mount sweep overlay when reduce-motion is enabled', async () => {
    isReduceMotionSpy.mockResolvedValue(true);

    const { rerender } = render(
      <TaskRow task={{ ...BASE_TASK, done: false }} onToggle={jest.fn()} />,
    );

    await act(async () => {
      rerender(<TaskRow task={{ ...BASE_TASK, done: true }} onToggle={jest.fn()} />);
      await Promise.resolve();
    });

    // With reduce-motion on, the sweep overlay (Animated.View + Svg) never mounts
    expect(screen.queryByTestId('brushSweepRect')).toBeNull();
  });
});
