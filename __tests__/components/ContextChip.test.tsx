/**
 * ContextChip — KAN-241
 *
 * Covers the 4 offline/coverage situations (only #2/#4 render the glyph;
 * #1/#3 are absent here — #3 is NetworkBanner's job instead) plus the tap
 * sheet: last-learned date line, and the manual refresh action.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ContextChip from '../../src/components/ContextChip';
import { COPY } from '../../src/constants/copy';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc', line: 'rgba(20,20,18,0.08)',
    },
  }),
}));

jest.mock('../../src/theme/tokens', () => ({
  radius:  { chip: 9999, ctaBtn: 12 },
  spacing: { page: 22 },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const mock = (name: string) => () => React.createElement(Text, null, name);
  return {
    CloudOffIcon: mock('CloudOffIcon'),
    CloseIcon:    mock('CloseIcon'),
    RefreshIcon:  mock('RefreshIcon'),
  };
});

const mockUseOfflineCoverage = jest.fn();
jest.mock('../../src/hooks/useOfflineCoverage', () => ({
  useOfflineCoverage: () => mockUseOfflineCoverage(),
}));

const mockGetMostRecentHabitatUpdateAt = jest.fn();
const mockRefreshHabitatCacheIfStale = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/habitatCache', () => ({
  getMostRecentHabitatUpdateAt: (...args: unknown[]) => mockGetMostRecentHabitatUpdateAt(...args),
  refreshHabitatCacheIfStale: (...args: unknown[]) => mockRefreshHabitatCacheIfStale(...args),
}));

const mockGetLastSearchCoords = jest.fn();
jest.mock('../../src/services/proximity', () => ({
  getLastSearchCoords: () => mockGetLastSearchCoords(),
}));

const mockGetCategories = jest.fn().mockResolvedValue([]);
jest.mock('../../src/services/firestore', () => ({
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMostRecentHabitatUpdateAt.mockReturnValue(null);
  mockGetCategories.mockResolvedValue([]);
  mockGetLastSearchCoords.mockReturnValue({ lat: 1, lng: 2 });
});

describe('ContextChip — the 4 situations', () => {
  it('renders nothing when online (situation #1)', () => {
    mockUseOfflineCoverage.mockReturnValue({ offline: false, hasCache: false });
    render(<ContextChip />);
    expect(screen.queryByLabelText(COPY.contextChip.offlineGlyphA11y)).toBeNull();
  });

  it('renders the glyph when offline + cache covers here (situation #2)', () => {
    mockUseOfflineCoverage.mockReturnValue({ offline: true, hasCache: true });
    render(<ContextChip />);
    expect(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y)).toBeTruthy();
  });

  it('renders nothing when offline + no cache at all (situation #3 — NetworkBanner\'s job)', () => {
    mockUseOfflineCoverage.mockReturnValue({ offline: true, hasCache: false });
    render(<ContextChip />);
    expect(screen.queryByLabelText(COPY.contextChip.offlineGlyphA11y)).toBeNull();
  });

  it('renders the glyph when offline + cache exists but not here (situation #4 — same glyph as #2)', () => {
    mockUseOfflineCoverage.mockReturnValue({ offline: true, hasCache: true });
    render(<ContextChip />);
    expect(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y)).toBeTruthy();
  });
});

describe('ContextChip — tap sheet', () => {
  beforeEach(() => {
    mockUseOfflineCoverage.mockReturnValue({ offline: true, hasCache: true });
  });

  it('opens the sheet on tap, showing the title and area-agnostic body when no date is known', async () => {
    mockGetMostRecentHabitatUpdateAt.mockReturnValue(null);
    render(<ContextChip />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y));
    });

    expect(screen.getByText(COPY.contextChip.sheetTitle)).toBeTruthy();
    expect(screen.getByText(COPY.contextChip.sheetBody(undefined))).toBeTruthy();
  });

  it('shows the last-learned date when the cache has a timestamp', async () => {
    const learnedAt = new Date('2026-06-28T12:00:00').getTime();
    mockGetMostRecentHabitatUpdateAt.mockReturnValue(learnedAt);
    render(<ContextChip />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y));
    });

    const expectedDate = new Date(learnedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    expect(screen.getByText(COPY.contextChip.sheetBody(expectedDate))).toBeTruthy();
  });

  it('does not show the Refresh button while offline', async () => {
    render(<ContextChip />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y));
    });
    expect(screen.queryByLabelText(COPY.contextChip.refreshButton)).toBeNull();
  });

  it('closes the sheet when the close button is pressed', async () => {
    jest.useFakeTimers();
    render(<ContextChip />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y));
    });
    expect(screen.getByText(COPY.contextChip.sheetTitle)).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByLabelText('Close'));
    });
    act(() => { jest.advanceTimersByTime(200); }); // close animation duration
    expect(screen.queryByText(COPY.contextChip.sheetTitle)).toBeNull();
    jest.useRealTimers();
  });

  it('closes the sheet when the scrim is pressed', async () => {
    jest.useFakeTimers();
    render(<ContextChip />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y));
    });

    act(() => {
      fireEvent.press(screen.getByLabelText('Close sheet'));
    });
    act(() => { jest.advanceTimersByTime(200); });
    expect(screen.queryByText(COPY.contextChip.sheetTitle)).toBeNull();
    jest.useRealTimers();
  });
});

describe('ContextChip — Refresh (shown once back online, mid-sheet)', () => {
  it('shows the Refresh button once connectivity returns while the sheet is still open', async () => {
    mockUseOfflineCoverage.mockReturnValue({ offline: true, hasCache: true });
    const { rerender } = render(<ContextChip />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y));
    });
    expect(screen.queryByLabelText(COPY.contextChip.refreshButton)).toBeNull();

    // Connectivity resumes while the sheet is still open — the sheet must
    // not vanish (it's gated on its own open/close state, not on `offline`).
    mockUseOfflineCoverage.mockReturnValue({ offline: false, hasCache: true });
    await act(async () => { rerender(<ContextChip />); });

    expect(screen.getByText(COPY.contextChip.sheetTitle)).toBeTruthy();
    expect(screen.getByLabelText(COPY.contextChip.refreshButton)).toBeTruthy();
  });

  it('calls refreshHabitatCacheIfStale with force=true, the last search coords, and ALL_POI_TYPES ∪ custom categories', async () => {
    mockUseOfflineCoverage.mockReturnValue({ offline: false, hasCache: true });
    mockGetCategories.mockResolvedValue([{ id: 'c1', name: 'Custom', poi: 'library' }]);
    mockGetLastSearchCoords.mockReturnValue({ lat: 10, lng: 20 });

    render(<ContextChip />);
    // Force the sheet open directly isn't possible without the glyph (chip
    // is absent while online) — simulate "was offline, tapped, came back
    // online" via a rerender, matching the previous test's real user path.
    mockUseOfflineCoverage.mockReturnValue({ offline: true, hasCache: true });
    const { rerender } = render(<ContextChip />);
    await act(async () => {
      fireEvent.press(screen.getAllByLabelText(COPY.contextChip.offlineGlyphA11y)[0]);
    });
    mockUseOfflineCoverage.mockReturnValue({ offline: false, hasCache: true });
    await act(async () => { rerender(<ContextChip />); });

    await act(async () => {
      fireEvent.press(screen.getAllByLabelText(COPY.contextChip.refreshButton)[0]);
    });

    expect(mockRefreshHabitatCacheIfStale).toHaveBeenCalledWith(
      10, 20, expect.arrayContaining(['library']), true,
    );
  });

  it('does nothing when there are no last-search coords yet', async () => {
    mockGetLastSearchCoords.mockReturnValue(null);
    mockUseOfflineCoverage.mockReturnValue({ offline: true, hasCache: true });
    const { rerender } = render(<ContextChip />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.offlineGlyphA11y));
    });
    mockUseOfflineCoverage.mockReturnValue({ offline: false, hasCache: true });
    await act(async () => { rerender(<ContextChip />); });

    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.contextChip.refreshButton));
    });

    expect(mockRefreshHabitatCacheIfStale).not.toHaveBeenCalled();
  });
});
