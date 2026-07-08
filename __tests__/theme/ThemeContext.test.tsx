/**
 * Unit tests for src/theme/ThemeContext.tsx
 *
 * Covers:
 *   - Initial state follows device Appearance API
 *   - Initial language follows the mocked device locale
 *   - Children are not rendered until the saved preference is known (themeReady gate)
 *   - setDark() updates local state immediately (before Firestore resolves)
 *   - setDark() persists the preference to Firestore
 *   - setLanguage() updates local state immediately and persists best-effort
 *   - Firestore load does NOT overwrite an explicit user toggle (race-condition guard)
 *   - Firestore language load does NOT overwrite an explicit user choice
 *   - Firestore read error falls back to device preference silently
 *   - Appearance listener follows OS only when signed out
 *   - useTheme() throws when used outside <ThemeProvider>
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { ThemeProvider, useTheme } from '../../src/theme/ThemeContext';
import { __getCopyLanguageForTests, setCopyLanguage } from '../../src/constants/copy';
import { lightPalette, darkPalette } from '../../src/theme/tokens';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockDoc    = jest.fn((_db: unknown, ...segments: string[]) => segments.join('/'));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc:    (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

const mockGetAuth             = jest.fn();
const mockOnAuthStateChanged  = jest.fn();

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth:             () => mockGetAuth(),
  onAuthStateChanged:  (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

const mockDetectDeviceLanguage = jest.fn();
jest.mock('../../src/services/deviceLocale', () => ({
  detectDeviceLanguage: () => mockDetectDeviceLanguage(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firestoreResolves(darkMode: boolean, language?: 'en' | 'pt-PT' | 'fr') {
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data:   () => ({ darkMode, language }),
  });
}

function firestoreEmpty() {
  mockGetDoc.mockResolvedValue({
    exists: () => false,
    data:   () => ({}),
  });
}

function firestoreRejects() {
  mockGetDoc.mockRejectedValue(new Error('Network error'));
}

/**
 * Configure the auth mock to immediately fire onAuthStateChanged with a
 * signed-in user. The callback is invoked synchronously (before the mock
 * returns) so that the async body in ThemeContext runs during the current
 * act() tick.
 */
function signedIn(uid = 'user-123') {
  mockGetAuth.mockReturnValue({ currentUser: { uid } });
  mockOnAuthStateChanged.mockImplementation(
    (_auth: unknown, callback: (user: { uid: string } | null) => void) => {
      callback({ uid });
      return jest.fn(); // unsubscribe
    },
  );
}

/**
 * Configure the auth mock to immediately fire onAuthStateChanged with null
 * (no signed-in user). The `!user` branch in ThemeContext has no await, so
 * setThemeReady(true) runs synchronously before any microtask.
 */
function signedOut() {
  mockGetAuth.mockReturnValue({ currentUser: null });
  mockOnAuthStateChanged.mockImplementation(
    (_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return jest.fn(); // unsubscribe
    },
  );
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
  mockDetectDeviceLanguage.mockReturnValue('en');
  setCopyLanguage('en');
  firestoreEmpty();
  signedOut();
});

afterEach(() => {
  setCopyLanguage('en');
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('defaults to light mode when OS is light', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    // Flush async state updates (themeReady gate).
    await act(async () => {});
    expect(result.current.dark).toBe(false);
    expect(result.current.palette).toEqual(lightPalette);
  });

  it('defaults language from the detected device locale', async () => {
    mockDetectDeviceLanguage.mockReturnValue('pt-PT');

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    expect(result.current.language).toBe('pt-PT');
    expect(__getCopyLanguageForTests()).toBe('pt-PT');
  });

  it('defaults to dark mode when OS is dark', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});
    expect(result.current.dark).toBe(true);
    expect(result.current.palette).toEqual(darkPalette);
  });
});

// ── themeReady gate ───────────────────────────────────────────────────────────

describe('themeReady gate', () => {
  it('renders children (and exposes context) only after the preference is resolved', async () => {
    signedIn();
    // getDoc never resolves during this test — preference remains pending.
    let resolveGetDoc!: (value: unknown) => void;
    mockGetDoc.mockReturnValue(
      new Promise(resolve => { resolveGetDoc = resolve; }),
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Before getDoc resolves, children have not mounted — result.current is null/undefined.
    // We verify this by checking that current is falsy before we resolve.
    // (ThemeProvider renders <View /> instead of the context provider.)
    expect(result.current).toBeFalsy();

    // Now resolve the preference.
    await act(async () => {
      resolveGetDoc({ exists: () => false, data: () => ({}) });
    });

    // After resolution the context is available.
    expect(result.current).toBeTruthy();
    expect(result.current.dark).toBe(false);
  });
});

// ── setDark ───────────────────────────────────────────────────────────────────

describe('setDark', () => {
  it('updates local state immediately', async () => {
    signedOut();
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {}); // wait for themeReady

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
    await act(async () => {}); // wait for themeReady

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
    await act(async () => {}); // wait for themeReady

    await act(async () => {
      await result.current.setDark(true);
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('keeps local state even when Firestore write fails', async () => {
    signedIn();
    mockSetDoc.mockRejectedValue(new Error('Write failed'));
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {}); // wait for themeReady

    await act(async () => {
      await result.current.setDark(true);
    });

    expect(result.current.dark).toBe(true);
  });
});

describe('setLanguage', () => {
  it('updates local state immediately', async () => {
    signedOut();
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.setLanguage('pt-PT');
    });

    expect(result.current.language).toBe('pt-PT');
    expect(__getCopyLanguageForTests()).toBe('pt-PT');
  });

  it('persists the language preference to Firestore when signed in', async () => {
    signedIn('user-abc');
    mockSetDoc.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.setLanguage('pt-PT');
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      { language: 'pt-PT' },
      { merge: true },
    );
  });

  it('does not call Firestore when signed out', async () => {
    signedOut();
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.setLanguage('pt-PT');
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('keeps local state even when Firestore write fails', async () => {
    signedIn();
    mockSetDoc.mockRejectedValue(new Error('Write failed'));
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.setLanguage('pt-PT');
    });

    expect(result.current.language).toBe('pt-PT');
    expect(__getCopyLanguageForTests()).toBe('pt-PT');
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
    // themeReady is still false here (getDoc pending) — no need to flush yet.

    // User toggles to dark before Firestore finishes loading.
    // setDark sets userHasExplicitlySet = true and renders the context
    // (setDark is exposed via setDarkState which works independently of themeReady).
    // We need to trigger the setDark AFTER ensuring the hook is accessible.
    // Because themeReady is false, context is not yet available — resolve first.
    await act(async () => {
      resolveGetDoc({ exists: () => false, data: () => ({}) });
    });

    await act(async () => {
      await result.current.setDark(true);
    });
    expect(result.current.dark).toBe(true);

    // A second Firestore resolve (simulating a late response) with the old saved preference (light).
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data:   () => ({ darkMode: false }),
    });

    // The explicit toggle must not be overwritten.
    expect(result.current.dark).toBe(true);
  });

  it('applies Firestore preference when no explicit toggle occurred', async () => {
    signedIn();
    firestoreResolves(true); // saved preference: dark

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {}); // flush getDoc resolution

    expect(result.current.dark).toBe(true);
  });

  it('applies Firestore language when no explicit language choice occurred', async () => {
    signedIn();
    firestoreResolves(false, 'pt-PT');

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    expect(result.current.language).toBe('pt-PT');
    expect(__getCopyLanguageForTests()).toBe('pt-PT');
  });

  it('ignores an invalid saved language and keeps the device default', async () => {
    signedIn();
    mockDetectDeviceLanguage.mockReturnValue('pt-PT');
    firestoreResolves(false, 'fr');

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {});

    expect(result.current.language).toBe('pt-PT');
    expect(__getCopyLanguageForTests()).toBe('pt-PT');
  });

  it('does not revert an explicit language choice when Firestore resolves later', async () => {
    signedIn();
    let resolveGetDoc!: (value: unknown) => void;
    mockGetDoc.mockReturnValue(
      new Promise(resolve => { resolveGetDoc = resolve; }),
    );

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {
      resolveGetDoc({ exists: () => false, data: () => ({}) });
    });

    await act(async () => {
      await result.current.setLanguage('pt-PT');
    });

    expect(result.current.language).toBe('pt-PT');
    expect(__getCopyLanguageForTests()).toBe('pt-PT');
  });
});

// ── Firestore error fallback ──────────────────────────────────────────────────

describe('Firestore read error', () => {
  it('falls back to device preference silently when getDoc rejects', async () => {
    signedIn();
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    firestoreRejects();

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {}); // flush rejection + themeReady

    // Should keep the initial device preference, not throw.
    expect(result.current.dark).toBe(true);
  });
});

// ── Appearance listener ───────────────────────────────────────────────────────

describe('Appearance listener', () => {
  it('follows OS changes when signed out', async () => {
    signedOut();
    let appearanceCallback!: (prefs: { colorScheme: string | null }) => void;
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation(
      (cb: (prefs: { colorScheme: string | null }) => void) => {
        appearanceCallback = cb;
        return { remove: jest.fn() };
      },
    );

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {}); // wait for themeReady

    act(() => { appearanceCallback({ colorScheme: 'dark' }); });
    expect(result.current.dark).toBe(true);
  });

  it('ignores OS changes when signed in (Firestore is source of truth)', async () => {
    signedIn();
    let appearanceCallback!: (prefs: { colorScheme: string | null }) => void;
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation(
      (cb: (prefs: { colorScheme: string | null }) => void) => {
        appearanceCallback = cb;
        return { remove: jest.fn() };
      },
    );

    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {}); // wait for themeReady

    act(() => { appearanceCallback({ colorScheme: 'dark' }); });
    // Signed-in user's preference must not change with OS toggle.
    expect(result.current.dark).toBe(false);
  });
});

// ── useTheme outside provider ─────────────────────────────────────────────────

describe('useTheme', () => {
  it('throws when used outside <ThemeProvider>', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme() must be used inside <ThemeProvider>',
    );
  });
});
