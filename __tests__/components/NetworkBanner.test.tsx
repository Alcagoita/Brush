/**
 * KAN-236 — NetworkBanner: offline expectations messaging, state 1 & 2.
 *
 * Verifies:
 *   - renders nothing while online
 *   - offline + cache has data somewhere → generic "offline" copy (state 2:
 *     inside cached coverage, or coverage simply unknown — don't apologize)
 *   - offline + cache has nothing anywhere yet → the "still learning your
 *     area" copy (state 1: the only fully broken case)
 *   - never calls hasCachedPlaces() while online (no point paying for the
 *     DB read when the banner won't render anyway)
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NetworkBanner from '../../src/components/NetworkBanner';
import { COPY } from '../../src/constants/copy';

const mockUseNetInfo = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

const mockHasCachedPlaces = jest.fn();
jest.mock('../../src/services/habitatCache', () => ({
  hasCachedPlaces: () => mockHasCachedPlaces(),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: { bg: '#fdfcfa', accent: '#e8a86a' },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockHasCachedPlaces.mockReturnValue(true);
});

describe('NetworkBanner', () => {
  it('renders nothing while online', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true });
    render(<NetworkBanner />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not check the habitat cache while online', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true });
    render(<NetworkBanner />);
    expect(mockHasCachedPlaces).not.toHaveBeenCalled();
  });

  it('shows the generic offline copy when the cache has data somewhere', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false });
    mockHasCachedPlaces.mockReturnValue(true);

    render(<NetworkBanner />);

    expect(screen.getByText(COPY.offline.genericBanner)).toBeTruthy();
  });

  it('shows the "still learning your area" copy when the cache is empty everywhere', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false });
    mockHasCachedPlaces.mockReturnValue(false);

    render(<NetworkBanner />);

    expect(screen.getByText(COPY.offline.noCacheYetBanner)).toBeTruthy();
  });

  it('treats isInternetReachable: false as offline even when isConnected is true', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: false });
    mockHasCachedPlaces.mockReturnValue(true);

    render(<NetworkBanner />);

    expect(screen.getByText(COPY.offline.genericBanner)).toBeTruthy();
  });

  it('stays silent when connectivity state is not yet known (null)', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: null, isInternetReachable: null });
    render(<NetworkBanner />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
