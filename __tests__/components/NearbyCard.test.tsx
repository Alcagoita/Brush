/**
 * KAN-60 — NearbyCard component tests.
 *
 * Covers:
 *   - Returns null when there are no undone POI tasks (nothing to show)
 *   - Idle state: renders "NEARBY" header, idle task rows
 *   - Hero state: renders "NEARBY · NOW", place name, task title
 *   - Paused state: renders the low-battery banner (trackingPaused=true)
 *   - "Open in Maps" CTA present in hero state
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NearbyCard from '../../src/components/NearbyCard';
import type { Task } from '../../src/types';
import { Timestamp } from '@react-native-firebase/firestore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc',
      line: '#ddd', accent: '#e8a86a',
      nearTint: '#fdf7f0', nearTint2: '#f9ede0',
      nearBorder: '#e8c9a0', nearText: '#7a4a20',
    },
  }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const noop = () => {};
  return {
    __esModule: true,
    default:          { View, createAnimatedComponent: (c: unknown) => c },
    useSharedValue:   (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat:       (v: unknown) => v,
    withSequence:     (...args: unknown[]) => args[0],
    withTiming:       (v: unknown) => v,
    Easing:           { inOut: () => noop, out: () => noop, ease: noop },
  };
});

jest.mock('../../src/services/maps', () => ({
  formatDistance: (m: number) => `${m} m`,
  placeTypeLabel: (t: string) => t === 'pharmacy' ? 'Pharmacy' : t,
  openInMaps:     jest.fn(),
}));

jest.mock('../../src/components/AppIcon', () => ({
  ChevronRightIcon: () => null,
  PoiIcon:          () => null,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id:        'task-1',
  title:     'Pick up prescription',
  category:  'health',
  done:      false,
  poi:       'pharmacy',
  date:      '2026-06-01',
  createdAt: { toDate: () => new Date() } as unknown as Timestamp,
  ...overrides,
});

const NEARBY_PLACE = {
  placeId:        'place-1',
  name:           'Whole Foods',
  lat:            37.7749,
  lng:            -122.4194,
  distanceMeters: 60,
};

const EMPTY_PLACES = {};
const PLACES_MAP   = { pharmacy: NEARBY_PLACE };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NearbyCard — no POI tasks', () => {
  it('renders nothing when there are no undone POI tasks', () => {
    const { toJSON } = render(
      <NearbyCard
        tasks={[makeTask({ poi: undefined })]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when all POI tasks are done', () => {
    const { toJSON } = render(
      <NearbyCard
        tasks={[makeTask({ done: true })]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});

describe('NearbyCard — idle state', () => {
  it('renders the "NEARBY" header when no POI is active', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={PLACES_MAP}
      />,
    );
    expect(screen.getByText('NEARBY')).toBeTruthy();
  });

  it('renders the task title as an idle row', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={PLACES_MAP}
      />,
    );
    expect(screen.getByText('Pick up prescription')).toBeTruthy();
  });

  it('does NOT render "NEARBY · NOW" in idle state', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={PLACES_MAP}
      />,
    );
    expect(screen.queryByText('NEARBY · NOW')).toBeNull();
  });
});

describe('NearbyCard — hero state', () => {
  it('renders "NEARBY · NOW" when a POI is active', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType="pharmacy"
        nearbyPlace={NEARBY_PLACE}
        poiPlaces={PLACES_MAP}
      />,
    );
    expect(screen.getByText('NEARBY · NOW')).toBeTruthy();
  });

  it('renders the nearby place name in the hero block', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType="pharmacy"
        nearbyPlace={NEARBY_PLACE}
        poiPlaces={PLACES_MAP}
      />,
    );
    // Place name appears in the hero distance label (uppercased)
    expect(screen.getByText(/WHOLE FOODS/i)).toBeTruthy();
  });

  it('renders the task title in the hero block', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType="pharmacy"
        nearbyPlace={NEARBY_PLACE}
        poiPlaces={PLACES_MAP}
      />,
    );
    expect(screen.getByText('Pick up prescription')).toBeTruthy();
  });

  it('renders the "Open in Maps" CTA button', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType="pharmacy"
        nearbyPlace={NEARBY_PLACE}
        poiPlaces={PLACES_MAP}
      />,
    );
    expect(screen.getByLabelText('Open Whole Foods in Maps')).toBeTruthy();
  });
});

describe('NearbyCard — KAN-131: idle list container border', () => {
  it('applies borderWidth:1 and borderColor:palette.line to the idle container', () => {
    const { UNSAFE_getAllByType } = render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={PLACES_MAP}
      />,
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');
    const allViews = UNSAFE_getAllByType(View);

    // Find the container that has both the line border colour and the surface background
    // (set via inline style — palette values come from the mock: line=#ddd, surface=#f6f5f1)
    const container = allViews.find(v => {
      const flat = [v.props.style].flat(Infinity).filter(Boolean) as Record<string, unknown>[];
      return (
        flat.some(s => s.borderColor === '#ddd') &&
        flat.some(s => s.backgroundColor === '#f6f5f1')
      );
    });

    expect(container).toBeDefined();
  });

  it('idle container also has borderRadius:16 and overflow:hidden', () => {
    const { UNSAFE_getAllByType } = render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={PLACES_MAP}
      />,
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');
    const allViews = UNSAFE_getAllByType(View);

    // StyleSheet.create values are resolved in the test renderer — find the view
    // that carries the listContainer static styles together with the inline border colour
    const container = allViews.find(v => {
      const flat = [v.props.style].flat(Infinity).filter(Boolean) as Record<string, unknown>[];
      return flat.some(s => s.borderColor === '#ddd');
    });

    expect(container).toBeDefined();
    // The StyleSheet entry includes borderRadius and overflow
    const flat = [container!.props.style].flat(Infinity).filter(Boolean) as Record<string, unknown>[];
    const merged = Object.assign({}, ...flat);
    expect(merged.borderRadius).toBe(16);
    expect(merged.overflow).toBe('hidden');
  });

  it('hero "also close" section does NOT receive the idle border container', () => {
    const heroTask  = makeTask({ id: 'hero',  poi: 'pharmacy' });
    const alsoClose = makeTask({ id: 'also',  poi: 'supermarket', title: 'Buy groceries' });

    const { UNSAFE_getAllByType } = render(
      <NearbyCard
        tasks={[heroTask, alsoClose]}
        nearbyPoiType="pharmacy"
        nearbyPlace={NEARBY_PLACE}
        poiPlaces={{ pharmacy: NEARBY_PLACE }}
      />,
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require('react-native');
    const allViews = UNSAFE_getAllByType(View);

    // In hero mode no view should combine surface background + line border (listContainer)
    const hasIdleContainer = allViews.some(v => {
      const flat = [v.props.style].flat(Infinity).filter(Boolean) as Record<string, unknown>[];
      return (
        flat.some(s => s.borderColor === '#ddd') &&
        flat.some(s => s.backgroundColor === '#f6f5f1')
      );
    });

    expect(hasIdleContainer).toBe(false);
  });
});

describe('NearbyCard — paused state (KAN-52)', () => {
  it('renders the low-battery paused banner when trackingPaused is true', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
        trackingPaused
      />,
    );
    expect(screen.getByText('Nearby alerts paused — low battery')).toBeTruthy();
  });

  it('does NOT show idle rows when paused', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
        trackingPaused
      />,
    );
    expect(screen.queryByText('Pick up prescription')).toBeNull();
  });
});
