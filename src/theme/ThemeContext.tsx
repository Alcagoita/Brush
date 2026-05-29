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
import { Appearance, ColorSchemeName, View } from 'react-native';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth/lib/modular';
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
  // Start with the device preference; overridden with the Firestore value
  // before children are rendered (see themeReady below).
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

  /**
   * Set to true once we have resolved the user's saved preference (or
   * determined there is none). Children are not rendered until this is true,
   * which prevents the light→dark colour flash on cold start.
   *
   * With Firestore offline persistence, the getDoc resolves from the
   * on-device cache in < 50 ms, so the gate is imperceptible.
   */
  const [themeReady, setThemeReady] = useState(false);

  // ── Load saved preference from Firestore ──────────────────────────────────
  //
  // Uses onAuthStateChanged instead of reading currentUser synchronously.
  // Firebase Auth rehydrates from the device keychain asynchronously; there is
  // a brief window at cold start where currentUser is null even for a signed-in
  // user. onAuthStateChanged fires as soon as auth state is known (still fast —
  // it reads from the local cache) and guarantees we never miss the uid.
  useEffect(() => {
    // Track whether we have processed the first auth event. Subsequent events
    // (e.g. the user signs out while the screen is mounted) are ignored — the
    // Appearance listener handles the signed-out case from that point on.
    // Using a flag rather than calling unsubscribeAuth() inside the callback
    // avoids a variable-assignment race when the callback fires synchronously.
    let authLoaded = false;

    const unsubscribeAuth = onAuthStateChanged(getAuth(), async user => {
      if (authLoaded) { return; }
      authLoaded = true;

      if (!user) {
        // No signed-in user → no Firestore preference → device theme is fine.
        setThemeReady(true);
        return;
      }

      try {
        const snapshot = await getDoc(doc(getFirestore(), 'users', user.uid));
        // If the user toggled before the load finished, respect their choice.
        if (!userHasExplicitlySet.current && snapshot.exists()) {
          const data = snapshot.data();
          if (typeof data?.darkMode === 'boolean') {
            setDarkState(data.darkMode);
          }
        }
      } catch {
        // Non-critical — fall back to device preference silently.
      } finally {
        setThemeReady(true);
      }
    });

    return unsubscribeAuth;
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

  // Block the first paint until the saved preference is known.
  // Renders a solid backdrop in the OS-inferred background colour so the
  // screen is never white — just invisible for the ~50 ms the cache read takes.
  if (!themeReady) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
  }

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
