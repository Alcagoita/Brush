/**
 * KAN-156 — TaskRow memoization.
 *
 * The Today list re-renders on every proximity update (poiPlaces / nearby
 * changes). TaskRow is wrapped in React.memo so a parent re-render with
 * referentially-equal props does NOT rebuild the row (which would re-run its
 * shared values + SVG and drive the render storm).
 *
 * We count renders via the mocked PoiChip: TaskRow renders PoiChip exactly once
 * per render when the task has a `poi`, so the mock's call count tracks renders.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import TaskRow from '../../src/components/TaskRow';
import PoiChip from '../../src/components/PoiChip';
import type { Task } from '../../src/types';
import { Timestamp } from '@react-native-firebase/firestore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fdfdfb', surface: '#f6f5f1', surface2: '#efeeea',
      line: 'rgba(20,20,18,0.08)', text: '#1a1a18', muted: '#8a8a85',
      faint: '#bdbdb7', accent: '#e8a86a',
    },
  }),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Render counter — one call per TaskRow render (task has a poi).
jest.mock('../../src/components/PoiChip', () => jest.fn(() => null));

jest.mock('../../src/components/BrushStroke', () => ({
  __esModule: true,
  default: () => null,
}));

// KAN-279 — takeMeThere.ts pulls in poiTypeCache.ts -> maps.ts ->
// placesFunctions.ts -> @react-native-firebase/functions (native, unavailable
// under Jest). Mocked at the service boundary, same as elsewhere.
jest.mock('../../src/services/takeMeThere', () => ({
  openTakeMeThereMaps:     jest.fn().mockResolvedValue(undefined),
  getTakeMeThereA11yLabel: jest.fn(() => 'Take me there'),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TASK: Task = {
  id: 'task-1',
  title: 'Grab a coffee',
  category: 'personal',
  done: false,
  poi: 'cafe',
  createdAt: { toDate: () => new Date() } as unknown as Timestamp,
  date: '2026-06-16',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TaskRow — React.memo (KAN-156)', () => {
  beforeEach(() => (PoiChip as unknown as jest.Mock).mockClear());

  it('does NOT re-render when a parent re-renders with identical props', () => {
    const onToggle = jest.fn();
    const onPress  = jest.fn();
    const props    = { task: TASK, nearbyPoiType: null, onToggle, onPress } as const;

    const { rerender } = render(<TaskRow {...props} />);
    const afterMount = (PoiChip as unknown as jest.Mock).mock.calls.length;
    expect(afterMount).toBeGreaterThan(0);

    // Same prop references → memo should skip the re-render entirely.
    rerender(<TaskRow {...props} />);
    expect((PoiChip as unknown as jest.Mock).mock.calls.length).toBe(afterMount);
  });

  it('DOES re-render when an own prop (nearbyPoiType) changes', () => {
    const onToggle = jest.fn();
    const onPress  = jest.fn();
    const props    = { task: TASK, nearbyPoiType: null, onToggle, onPress } as const;

    const { rerender } = render(<TaskRow {...props} />);
    const afterMount = (PoiChip as unknown as jest.Mock).mock.calls.length;

    rerender(<TaskRow {...props} nearbyPoiType="cafe" />);
    expect((PoiChip as unknown as jest.Mock).mock.calls.length).toBe(afterMount + 1);
  });
});
