/**
 * ErrandBundleCard — KAN-235.
 *
 * Covers: card renders the task-count/anchor line, tap opens a sheet listing
 * every bundled task with its place + distance, and the dismiss control
 * calls onDismiss without opening the sheet.
 *
 * KAN-283 adds the cluster route handoff and per-stop removal — see the
 * describe blocks at the bottom.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ErrandBundleCard from '../../src/components/ErrandBundleCard';
import { COPY } from '../../src/constants/copy';
import type { ErrandBundle } from '../../src/services/errandBundles';
import type { ClusterLeisureSuggestion } from '../../src/services/clusterLeisure';
import type { Task } from '../../src/types';

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc', line: 'rgba(20,20,18,0.08)',
      scrim: 'rgba(0,0,0,0.4)',
    },
  }),
}));

jest.mock('../../src/theme/tokens', () => ({
  radius:  { card: 16, listIcon: 10, chip: 9999, ctaBtn: 12, checkbox: 6 },
  spacing: { page: 22 },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const mock = (name: string) => () => React.createElement(Text, null, name);
  return { CheckIcon: mock('CheckIcon'), CloseIcon: mock('CloseIcon'), PinIcon: mock('PinIcon'), ChevronRightIcon: mock('ChevronRightIcon') };
});

const mockOpenMultiStopDirections = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/maps', () => ({
  openMultiStopDirections: (...args: unknown[]) => mockOpenMultiStopDirections(...args),
  formatDistance: (m: number) => `${Math.round(m)} m`,
  // Real geometry — routeHandoff's ordering is what the KAN-283 assertions
  // below are actually checking, so it must not be stubbed. Flat-earth
  // approximation is plenty at these few-hundred-metre distances.
  getDistanceMeters: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.round(Math.hypot(lat2 - lat1, lng2 - lng1) * 111_000),
}));

// KAN-283 — the card imports MIN_BUNDLE_TASKS from errandBundles (one source
// of truth for the two-stop floor), which pulls in expo-sqlite for its
// dismissal table. Only the module needs stubbing, not the constant.
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync:   jest.fn(),
    getAllSync: jest.fn(() => []),
    runSync:    jest.fn(),
  })),
}));

// KAN-283 — the card reads the last proximity search position to route from.
// proximity.ts pulls in notifee (native, unavailable under Jest), so mock at
// the service boundary.
const mockGetLastSearchCoords = jest.fn<{ lat: number; lng: number } | null, []>();
jest.mock('../../src/services/proximity', () => ({
  getLastSearchCoords: () => mockGetLastSearchCoords(),
}));

const mockLogTap = jest.fn();
jest.mock('../../src/services/analytics', () => ({
  logTap: (...args: unknown[]) => mockLogTap(...args),
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return { id: 't1', title: 'Get cash', category: 'errands', done: false, poi: 'atm', date: '2026-07-06', createdAt: {} as Task['createdAt'], ...overrides };
}

function makeBundle(): ErrandBundle {
  return {
    anchor: { placeId: 'anchor-1', name: 'Mercado da Vila', lat: 1, lng: 2, distanceMeters: 300 },
    entries: [
      { task: makeTask({ id: 't1', title: 'Get cash' }), place: { placeId: 'p1', name: 'ATM Central', lat: 1, lng: 2, distanceMeters: 250 }, distanceToAnchorMeters: 50 },
      { task: makeTask({ id: 't2', title: 'Buy stamps', poi: 'post' }), place: { placeId: 'p2', name: 'Post Office', lat: 1, lng: 2, distanceMeters: 320 }, distanceToAnchorMeters: 90 },
    ],
    totalWalkDistanceMeters: 140,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLastSearchCoords.mockReturnValue({ lat: 0, lng: 0 });
});

describe('ErrandBundleCard', () => {
  it('shows the card line with task count and anchor name', () => {
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    expect(screen.getByText(COPY.errandBundle.cardLine(2, 'Mercado da Vila'))).toBeTruthy();
  });

  it('opens the sheet on tap, listing every bundled task with its place and distance', async () => {
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });

    expect(screen.getByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeTruthy();
    expect(screen.getByText('Get cash')).toBeTruthy();
    expect(screen.getByText('ATM Central · 250 m')).toBeTruthy();
    expect(screen.getByText('Buy stamps')).toBeTruthy();
    expect(screen.getByText('Post Office · 320 m')).toBeTruthy();
  });

  it('calls onDismiss without opening the sheet when the dismiss control is pressed', () => {
    const onDismiss = jest.fn();
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByLabelText(COPY.errandBundle.dismissA11y));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeNull();
  });

  it('closes the sheet when the close button is pressed', async () => {
    jest.useFakeTimers();
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });
    expect(screen.getByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.closeA11y));
    });
    act(() => { jest.advanceTimersByTime(200); });
    expect(screen.queryByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeNull();
    jest.useRealTimers();
  });

  it('closes the sheet when the scrim is pressed', async () => {
    jest.useFakeTimers();
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });
    expect(screen.getByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.closeSheetA11y));
    });
    act(() => { jest.advanceTimersByTime(200); });
    expect(screen.queryByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeNull();
    jest.useRealTimers();
  });
});

// ─── KAN-283: cluster route handoff ───────────────────────────────────────────

/**
 * Distinct coordinates, deliberately built out of visiting order, so the
 * greedy ordering has something real to prove. Origin is (0, 0):
 *   Far   (0.003, 0) ~333 m
 *   Mid   (0.002, 0) ~222 m
 *   Near  (0.001, 0) ~111 m
 * Nearest-first from the origin therefore yields Near -> Mid -> Far.
 */
function makeSpreadBundle(): ErrandBundle {
  const entry = (id: string, title: string, name: string, lat: number, distanceMeters: number) => ({
    task: makeTask({ id, title }),
    place: { placeId: `p-${id}`, name, lat, lng: 0, distanceMeters },
    distanceToAnchorMeters: distanceMeters,
  });
  return {
    anchor: { placeId: 'anchor-1', name: 'Mercado da Vila', lat: 0.002, lng: 0, distanceMeters: 222 },
    entries: [
      entry('t3', 'Far task', 'Far Place', 0.003, 333),
      entry('t1', 'Near task', 'Near Place', 0.001, 111),
      entry('t2', 'Mid task', 'Mid Place', 0.002, 222),
    ],
    totalWalkDistanceMeters: 222,
  };
}

async function openSheet(bundle: ErrandBundle) {
  render(<ErrandBundleCard bundle={bundle} onDismiss={jest.fn()} />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(bundle.entries.length, bundle.anchor.name)));
  });
}

describe('ErrandBundleCard — cluster route handoff (KAN-283)', () => {
  it('offers the all-stops action for a multi-stop cluster', async () => {
    await openSheet(makeSpreadBundle());
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(3))).toBeTruthy();
  });

  it('hands every stop to Maps in greedy nearest-first order from the user', async () => {
    await openSheet(makeSpreadBundle());
    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-open-all'));
    });

    expect(mockOpenMultiStopDirections).toHaveBeenCalledTimes(1);
    const [origin, stops] = mockOpenMultiStopDirections.mock.calls[0];
    expect(origin).toEqual({ lat: 0, lng: 0 });
    // Reordered from the bundle's own Far/Near/Mid declaration order.
    expect(stops.map((s: { name: string }) => s.name)).toEqual(['Near Place', 'Mid Place', 'Far Place']);
  });

  it('routes to the cluster\'s own already-resolved places — never a fresh lookup', async () => {
    // The coordinates handed to Maps must be exactly the ones the bundle
    // already carried (AC: no new resolution from this path).
    const bundle = makeSpreadBundle();
    await openSheet(bundle);
    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-open-all'));
    });

    const [, stops] = mockOpenMultiStopDirections.mock.calls[0];
    const bundleCoords = bundle.entries.map(e => ({ lat: e.place.lat, lng: e.place.lng }));
    for (const stop of stops as { lat: number; lng: number }[]) {
      expect(bundleCoords).toContainEqual({ lat: stop.lat, lng: stop.lng });
    }
  });

  it('offers no route action at all below two stops — a single place is the Nearby list\'s job', async () => {
    // Unreachable in practice (computeErrandBundles enforces MIN_BUNDLE_TASKS)
    // but guarded: one stop is not a route, and there is deliberately no
    // anchor-only fallback here any more.
    const bundle = makeSpreadBundle();
    const single: ErrandBundle = { ...bundle, entries: [bundle.entries[0]] };

    await openSheet(single);

    expect(screen.queryByTestId('errand-bundle-open-all')).toBeNull();
  });
});


describe('ErrandBundleCard — selecting which stops to include (KAN-283)', () => {
  const stopA11y = (id: string) => screen.getByTestId(`errand-bundle-stop-${id}`);

  it('starts with every stop selected', async () => {
    await openSheet(makeSpreadBundle());

    for (const id of ['t1', 't2', 't3']) {
      expect(stopA11y(id).props.accessibilityState).toMatchObject({ checked: true });
    }
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(3))).toBeTruthy();
  });

  it('keeps an unselected stop listed, and drops it from the route', async () => {
    await openSheet(makeSpreadBundle());
    await act(async () => { fireEvent.press(stopA11y('t1')); }); // 'Near task'

    // Still shown — just no longer part of the walk.
    expect(screen.getByText('Near task')).toBeTruthy();
    expect(stopA11y('t1').props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(2))).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-open-all'));
    });
    const [, stops] = mockOpenMultiStopDirections.mock.calls[0];
    expect(stops.map((s: { name: string }) => s.name)).toEqual(['Mid Place', 'Far Place']);
  });

  it('re-selecting a stop puts it back in the route', async () => {
    await openSheet(makeSpreadBundle());
    await act(async () => { fireEvent.press(stopA11y('t1')); });
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(2))).toBeTruthy();

    await act(async () => { fireEvent.press(stopA11y('t1')); });

    expect(stopA11y('t1').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(3))).toBeTruthy();
  });

  it('locks the remaining boxes once only two are selected', async () => {
    await openSheet(makeSpreadBundle());
    await act(async () => { fireEvent.press(stopA11y('t1')); });

    // The two still selected can no longer be unselected...
    for (const id of ['t2', 't3']) {
      expect(stopA11y(id).props.accessibilityState).toMatchObject({ checked: true, disabled: true });
    }
    await act(async () => { fireEvent.press(stopA11y('t2')); });
    expect(stopA11y('t2').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(2))).toBeTruthy();
  });

  it('leaves the unselected box tappable at the floor, so the user can come back up', async () => {
    // Otherwise dropping to two would strand them with every box inert.
    await openSheet(makeSpreadBundle());
    await act(async () => { fireEvent.press(stopA11y('t1')); });

    expect(stopA11y('t1').props.accessibilityState).toMatchObject({ checked: false, disabled: false });

    await act(async () => { fireEvent.press(stopA11y('t1')); });
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(3))).toBeTruthy();
  });

  it('re-enables every box as soon as three are selected again', async () => {
    await openSheet(makeSpreadBundle());
    await act(async () => { fireEvent.press(stopA11y('t1')); });
    expect(stopA11y('t2').props.accessibilityState).toMatchObject({ disabled: true });

    await act(async () => { fireEvent.press(stopA11y('t1')); }); // back to three

    for (const id of ['t1', 't2', 't3']) {
      expect(stopA11y(id).props.accessibilityState).toMatchObject({ checked: true, disabled: false });
    }
  });

  it('never completes or dismisses the task it leaves out', async () => {
    const onDismiss = jest.fn();
    render(<ErrandBundleCard bundle={makeSpreadBundle()} onDismiss={onDismiss} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(3, 'Mercado da Vila')));
    });
    await act(async () => { fireEvent.press(stopA11y('t1')); });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(mockOpenMultiStopDirections).not.toHaveBeenCalled();
  });

  it('selects everything again when the sheet is reopened', async () => {
    jest.useFakeTimers();
    render(<ErrandBundleCard bundle={makeSpreadBundle()} onDismiss={jest.fn()} />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(3, 'Mercado da Vila')));
    });
    await act(async () => { fireEvent.press(stopA11y('t1')); });
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(2))).toBeTruthy();

    act(() => { fireEvent.press(screen.getByLabelText(COPY.errandBundle.closeA11y)); });
    act(() => { jest.advanceTimersByTime(200); });
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(3, 'Mercado da Vila')));
    });

    // Nothing was persisted — all three are selected again.
    expect(stopA11y('t1').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(3))).toBeTruthy();
    jest.useRealTimers();
  });
});

// ─── KAN-293 — leisure companion line ─────────────────────────────────────────

/** A leisure suggestion as findClusterLeisure would return one. */
function makeLeisure(overrides: Partial<ClusterLeisureSuggestion> = {}): ClusterLeisureSuggestion {
  return {
    place: { placeId: 'park-1', name: 'Central Park', lat: 1, lng: 2, distanceMeters: 90 },
    type: 'park',
    distanceToStopMeters: 60,
    ...overrides,
  };
}

async function openSheetWithLeisure(props: Partial<React.ComponentProps<typeof ErrandBundleCard>> = {}) {
  render(
    <ErrandBundleCard
      bundle={makeBundle()}
      onDismiss={jest.fn()}
      leisure={makeLeisure()}
      {...props}
    />,
  );
  await act(async () => {
    fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
  });
}

describe('ErrandBundleCard — leisure companion line (KAN-293)', () => {
  it('says nothing at all when there is no leisure place', async () => {
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });
    expect(screen.queryByTestId('errand-bundle-leisure')).toBeNull();
  });

  it('invites a walk for a park', async () => {
    await openSheetWithLeisure();
    expect(screen.getByText(COPY.errandBundle.leisureParkLine('Central Park'))).toBeTruthy();
  });

  it('uses the plainer line for a museum — no walk framing', async () => {
    await openSheetWithLeisure({
      leisure: makeLeisure({
        type: 'museum',
        place: { placeId: 'm-1', name: 'The History Museum', lat: 1, lng: 2, distanceMeters: 80 },
      }),
    });
    expect(screen.getByText(COPY.errandBundle.leisureOtherLine('The History Museum'))).toBeTruthy();
  });

  it('does not count the leisure place as a route stop until accepted', async () => {
    await openSheetWithLeisure();
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(2))).toBeTruthy();
  });

  it('adds the leisure place to this Maps handoff only after accepting it', async () => {
    const bundle = makeSpreadBundle();
    const leisure = makeLeisure({
      place: { placeId: 'park-1', name: 'Central Park', lat: 0.0025, lng: 0, distanceMeters: 260 },
    });

    render(<ErrandBundleCard bundle={bundle} onDismiss={jest.fn()} leisure={leisure} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(3, 'Mercado da Vila')));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-open-all'));
    });
    expect(mockOpenMultiStopDirections.mock.calls[0][1].map((s: { name: string }) => s.name))
      .toEqual(['Near Place', 'Mid Place', 'Far Place']);
    mockOpenMultiStopDirections.mockClear();

    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-leisure-keep'));
    });

    expect(screen.getByText(COPY.errandBundle.openAllInMaps(4))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-open-all'));
    });

    const [, stops] = mockOpenMultiStopDirections.mock.calls[0];
    expect(stops.map((s: { name: string }) => s.name)).toEqual([
      'Near Place',
      'Mid Place',
      'Central Park',
      'Far Place',
    ]);
  });

  it('confirms quietly once kept, and cannot be kept twice', async () => {
    await openSheetWithLeisure();

    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-leisure-keep'));
    });
    expect(screen.getByText(COPY.errandBundle.leisureKeptConfirmation('Central Park'))).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-leisure-keep'));
    });
    expect(screen.getAllByText(COPY.errandBundle.openAllInMaps(3))).toHaveLength(1);
  });

  it('never completes or dismisses anything when the invitation is accepted', async () => {
    const onDismiss = jest.fn();
    await openSheetWithLeisure({ onDismiss });

    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-leisure-keep'));
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText('Get cash')).toBeTruthy();
    expect(screen.getByText('Buy stamps')).toBeTruthy();
  });

  it('offers no ticket link when the cached place has no website', async () => {
    await openSheetWithLeisure();
    expect(screen.queryByTestId('errand-bundle-leisure-tickets')).toBeNull();
  });

  it('offers the ticket link only when the cache already holds a URL, and opens it externally', async () => {
    await openSheetWithLeisure({
      leisure: makeLeisure({
        place: {
          placeId: 'aq-1', name: 'City Aquarium', lat: 1, lng: 2, distanceMeters: 70,
          website: 'https://aquarium.example',
        },
        type: 'aquarium',
      }),
    });

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-leisure-tickets'));
    });

    expect(openURL).toHaveBeenCalledWith('https://aquarium.example');
    openURL.mockRestore();
  });

  it('starts fresh on reopen — a kept invitation does not linger as kept', async () => {
    await openSheetWithLeisure();

    await act(async () => {
      fireEvent.press(screen.getByTestId('errand-bundle-leisure-keep'));
    });
    expect(screen.getByText(COPY.errandBundle.leisureKeptConfirmation('Central Park'))).toBeTruthy();

    jest.useFakeTimers();
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.closeA11y));
      jest.runAllTimers();
    });
    jest.useRealTimers();

    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });
    expect(screen.queryByText(COPY.errandBundle.leisureKeptConfirmation('Central Park'))).toBeNull();
    expect(screen.getByText(COPY.errandBundle.openAllInMaps(2))).toBeTruthy();
  });
});
