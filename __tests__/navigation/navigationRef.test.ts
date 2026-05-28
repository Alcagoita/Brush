/**
 * KAN-28 — navigationRef unit tests.
 *
 * Covers:
 *   - navigateTo calls navigate when the ref is ready
 *   - navigateTo is a no-op when the ref is not ready (container not yet mounted)
 *   - navigateTo forwards params to navigate
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate  = jest.fn();
const mockIsReady   = jest.fn();

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    navigate:  (...args: unknown[]) => mockNavigate(...args),
    isReady:   ()                   => mockIsReady(),
  }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { navigateTo } from '../../src/navigation/navigationRef';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('navigateTo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls navigate with the screen name when the ref is ready', () => {
    mockIsReady.mockReturnValue(true);

    navigateTo('Today');

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Today', undefined);
  });

  it('forwards optional params to navigate', () => {
    mockIsReady.mockReturnValue(true);

    navigateTo('Calendar', { initialDate: '2026-05-29' });

    expect(mockNavigate).toHaveBeenCalledWith('Calendar', { initialDate: '2026-05-29' });
  });

  it('is a no-op when the navigation container is not ready', () => {
    mockIsReady.mockReturnValue(false);

    navigateTo('Today');

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
