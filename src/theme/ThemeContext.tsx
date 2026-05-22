/**
 * ThemeContext.tsx — Light / dark mode provider.
 *
 * Priority chain (highest → lowest):
 *   1. User's explicit preference stored in Firestore (/users/{uid}.darkMode)
 *   2. Device OS appearance (Appearance API)
 *
 * Usage:
 *   const { palette, dark, setDark } = useTheme();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { darkPalette, lightPalette, Palette } from './tokens';

// ─── Context shape ────────────────────────────────────────────────────────────

interface ThemeContextValue {
  /** Current resolved palette (light or dark). */
  palette: Palette;
  /** Whether dark mode is active. */
  dark: boolean;
  /** Toggle dark mode and persist the preference to Firestore. */
  setDark: (value: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Helper ───────────────────────────────────────────────────────────────────

function deviceIsDark(): boolean {
  return Appearance.getColorScheme() === 'dark';
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with the device preference; we'll override with Firestore value once loaded.
  const [dark, setDarkState] = useState<boolean>(deviceIsDark());

  /**
   * Guards against a race condition where the Firestore load completes AFTER
   * the user has already explicitly toggled the theme. Without this flag the
   * async getDoc could revert a user-initiated change.
   *
   * Timeline without guard:
   *   t=0  mount → start loading Firestore pref (saved: light)
   *   t=1  user taps toggle → setDark(true) → state = dark
   *   t=2  getDoc resolves → state reverts to light  ← bug
   *
   * With guard: t=2 getDoc sees userHasExplicitlySet=true and no-ops.
   */
  const userHasExplicitlySet = useRef(false);

  // ── Load saved preference from Firestore on mount ──
  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    const userRef = doc(getFirestore(), 'users', uid);
    getDoc(userRef)
      .then(snapshot => {
        // If the user toggled before the load finished, respect their choice.
        if (userHasExplicitlySet.current) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (typeof data?.darkMode === 'boolean') {
            setDarkState(data.darkMode);
          }
        }
      })
      .catch(() => {
        // Non-critical — fall back to device preference silently.
      });
  }, []);

  // ── Keep in sync with OS-level changes (e.g. auto dark mode at sunset) ──
  useEffect(() => {
    const listener = Appearance.addChangeListener(
      ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
        // When signed in, Firestore is the source of truth — ignore OS-level
        // changes to avoid overriding the user's saved preference.
        // When signed out there is no saved preference, so follow the OS.
        const uid = getAuth().currentUser?.uid;
        if (!uid) {
          setDarkState(colorScheme === 'dark');
        }
      },
    );
    return () => listener.remove();
  }, []);

  // ── Persist preference ──
  const setDark = useCallback(async (value: boolean) => {
    userHasExplicitlySet.current = true;
    setDarkState(value);
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(
        doc(getFirestore(), 'users', uid),
        { darkMode: value },
        { merge: true },
      );
    } catch {
      // Preference update is best-effort; local state already applied.
    }
  }, []);

  const palette: Palette = dark ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({ palette, dark, setDark }),
    [palette, dark, setDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current theme palette and helpers.
 * Must be used inside <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used inside <ThemeProvider>');
  }
  return ctx;
}
