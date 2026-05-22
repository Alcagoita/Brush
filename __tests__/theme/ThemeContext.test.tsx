/**
 * Unit tests for src/theme/ThemeContext.tsx
 *
 * Covers:
 *   - Initial state follows device Appearance API
 *   - setDark() updates local state immediately (before Firestore resolves)
 *   - setDark() persists the preference to Firestore
 *   - Firestore load does NOT overwrite an explicit user toggle (race-condition guard)
 *   - Firestore read error falls back to device preference silently
 *   - Appearance listener follows OS only when signed out
 *   - useTheme() throws when used outside <ThemeProvider>
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { ThemeProvider, useTheme } from '../../src/theme/ThemeContext';
import { lightPalette, darkPalette } from '../../src/theme/tokens';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => segments.join('/'));
const mockGetFirestore = jest.fn(() => ({}));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: () => mockGetFirestore(),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

const mockGetAuth = jest.fn();
jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => mockGetAuth(),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firestoreResolves(darkMode: boolean) {
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ darkMode }),
  });
}

function firestoreEmpty() {
  mockGetDoc.mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  });
}

function firestoreRejects() {
  mockGetDoc.mockRejectedValue(new Error('Network error'));
}

function signedIn(uid = 'user-123') {
  mockGetAuth.mockReturnValue({ currentUser: { uid } });
}

function signedOut() {
  mockGetAuth.mockReturnValue({ currentUser: null });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
  firestoreEmpty();
  signedOut();
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('defaults to light mode when OS is light', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.dark).toBe(false);
    expect(result.current.palette).toEqual(lightPalette);
  });

  it('defaults to dark mode when OS is dark', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.dark).toBe(true);
    expect(result.current.palette).toEqual(darkPalette);
  });
});

// ── setDark ───────────────────────────────────────────────────────────────────

describe('setDark', () => {
  it('updates local state immediately', async () => {
    signedOut();
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.dark).toBe(false);

    await act(async () => {
      await result.current.setDark(true);
    });

    expect(result.current.dark).toBe(true);
    expect(result.current.palette).toEqual(darkPalette);
  });

  it('persists the preference to Firestore when signed in', async () => {
    signedIn('user-abc');
    mockSetDoc.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.setDark(true);
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      { darkMode: true },
      { merge: true },
    );
  });

  it('does not call Firestore when signed out', async () => {
    signedOut();
    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.setDark(true);
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('keeps local state even when Firestore write fails', async () => {
    signedIn();
    mockSetDoc.mockRejectedValue(new Error('Write failed'));
    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.setDark(true);
    });

    // Local state should still be applied despite the write error.
    expect(result.current.dark).toBe(true);
  });
});

// ── Race condition guard ──────────────────────────────────────────────────────

describe('race condition guard', () => {
  it('does not revert an explicit toggle when Firestore load resolves after setDark', async () => {
    signedIn();

    // Firestore resolves with light (saved preference) but AFTER the user toggled.
    let resolveGetDoc!: (value: unknown) => void;
    mockGetDoc.mockReturnValue(
      new Promise(resolve => { resolveGetDoc = resolve; }),
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    // User toggles to dark before Firestore finishes loading.
    await act(async () => {
      await result.current.setDark(true);
    });
    expect(result.current.dark).toBe(true);

    // Now Firestore resolves with the old saved preference (light).
    await act(async () => {
      resolveGetDoc({
        exists: () => true,
        data: () => ({ darkMode: false }),
      });
    });

    // The explicit toggle must not be overwritten.
    expect(result.current.dark).toBe(true);
  });

  it('applies Firestore preference when no explicit toggle occurred', async () => {
    signedIn();
    firestoreResolves(true); // saved preference: dark

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Wait for getDoc to resolve.
    await act(async () => {});

    expect(result.current.dark).toBe(true);
  });
});

// ── Firestore error fallback ──────────────────────────────────────────────────

describe('Firestore read error', () => {
  it('falls back to device preference silently when getDoc rejects', async () => {
    signedIn();
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    firestoreRejects();

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    // Should keep the initial device preference, not throw.
    expect(result.current.dark).toBe(true);
  });
});

// ── Appearance listener ───────────────────────────────────────────────────────

describe('Appearance listener', () => {
  it('follows OS changes when signed out', async () => {
    signedOut();
    let appearanceCallback!: (prefs: { colorScheme: string | null }) => void;
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation((cb: (prefs: {colorScheme: string | null}) => void) => {
      appearanceCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.dark).toBe(false);

    act(() => {
      appearanceCallback({ colorScheme: 'dark' });
    });

    expect(result.current.dark).toBe(true);
  });

  it('ignores OS changes when signed in (Firestore is source of truth)', async () => {
    signedIn();
    let appearanceCallback!: (prefs: { colorScheme: string | null }) => void;
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation((cb: (prefs: {colorScheme: string | null}) => void) => {
      appearanceCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.dark).toBe(false);

    act(() => {
      appearanceCallback({ colorScheme: 'dark' });
    });

    // Signed-in user's preference must not change with OS toggle.
    expect(result.current.dark).toBe(false);
  });
});

// ── useTheme outside provider ─────────────────────────────────────────────────

describe('useTheme', () => {
  it('throws when used outside <ThemeProvider>', () => {
    // Suppress the expected React error boundary console output.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme() must be used inside <ThemeProvider>',
    );
  });
});
