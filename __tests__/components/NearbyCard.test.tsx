/**
 * KAN-60 — NearbyCard component tests.
 *
 * Covers:
 *   - Returns null when nearbyPoiType is null (service decides when to show)
 *   - Returns null when no matching hero task is found
 *   - Hero state: renders "NEARBY · NOW", place name, task title, CTA
 *   - "Also close" subsection shows remaining POI tasks
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

describe('NearbyCard — hidden when service has not triggered', () => {
  it('renders nothing when nearbyPoiType is null', () => {
    const { toJSON } = render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType={null}
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when all POI tasks are done (no hero task match)', () => {
    const { toJSON } = render(
      <NearbyCard
        tasks={[makeTask({ done: true })]}
        nearbyPoiType="pharmacy"
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when the active POI type has no matching task', () => {
    const { toJSON } = render(
      <NearbyCard
        tasks={[makeTask({ poi: 'supermarket' })]}
        nearbyPoiType="pharmacy"
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
      />,
    );
    expect(toJSON()).toBeNull();
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

  it('renders the "Open in Maps" CTA button when place is known', () => {
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

  it('omits the "Open in Maps" CTA when nearbyPlace is null', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType="pharmacy"
        nearbyPlace={null}
        poiPlaces={EMPTY_PLACES}
      />,
    );
    expect(screen.queryByText('Open in Maps')).toBeNull();
  });
});

describe('NearbyCard — also close section', () => {
  it('renders "ALSO CLOSE" label and the secondary task title', () => {
    const heroTask  = makeTask({ id: 'hero', poi: 'pharmacy' });
    const alsoClose = makeTask({ id: 'also', poi: 'supermarket', title: 'Buy groceries' });

    render(
      <NearbyCard
        tasks={[heroTask, alsoClose]}
        nearbyPoiType="pharmacy"
        nearbyPlace={NEARBY_PLACE}
        poiPlaces={{ pharmacy: NEARBY_PLACE }}
      />,
    );

    expect(screen.getByText('ALSO CLOSE')).toBeTruthy();
    expect(screen.getByText('Buy groceries')).toBeTruthy();
  });

  it('does not render "ALSO CLOSE" when only one POI task exists', () => {
    render(
      <NearbyCard
        tasks={[makeTask()]}
        nearbyPoiType="pharmacy"
        nearbyPlace={NEARBY_PLACE}
        poiPlaces={PLACES_MAP}
      />,
    );
    expect(screen.queryByText('ALSO CLOSE')).toBeNull();
  });
});
