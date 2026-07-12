import { Platform } from 'react-native';

/**
 * Android's AndroidManifest.xml sets windowSoftInputMode="adjustResize" —
 * the OS already shrinks the Activity window when the keyboard opens, and
 * repaints the freed space correctly on close. Returning a KeyboardAvoidingView
 * behavior ('height') on top of that double-compensates: RN shrinks its own
 * box again inside the already-shrunk window, which both over-shifts content
 * upward and, worse, sometimes fails to fully unwind on keyboard close,
 * leaving a stray unpainted strip at the bottom (the OS window's own
 * background, not the app's). Returning undefined here makes
 * KeyboardAvoidingView a no-op wrapper on Android, letting the native
 * resize be the single source of truth — this is a global fix: every screen
 * that calls this function is affected by the same double-compensation bug.
 */
export function getScreenKeyboardAvoidingBehavior(
  os: 'ios' | 'android' | string = Platform.OS,
): 'padding' | undefined {
  if (os === 'ios') { return 'padding'; }
  return undefined;
}
