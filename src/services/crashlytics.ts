/**
 * crashlytics.ts — Thin wrapper around Firebase Crashlytics.
 *
 * Centralises crash reporting so we can swap the provider (e.g. Sentry)
 * without touching call sites across the app.
 */

import crashlytics from '@react-native-firebase/crashlytics';

/**
 * Record a non-fatal error with an optional user-readable context string.
 * Silently swallows any reporting failure so crash reporters never cause crashes.
 */
export function recordError(error: Error, context?: string): void {
  try {
    if (context) {
      crashlytics().log(context);
    }
    crashlytics().recordError(error);
  } catch {
    // Crash reporting must never crash the app.
  }
}

/**
 * Attach the Firebase Auth uid as a Crashlytics user identifier so crash
 * reports can be correlated with a specific account.
 * Pass `null` on sign-out to clear the identifier.
 */
export function setCrashlyticsUser(uid: string | null): void {
  try {
    crashlytics().setUserId(uid ?? '');
  } catch {
    // ignore
  }
}

/**
 * Log a breadcrumb message that will appear in the crash report timeline.
 */
export function logBreadcrumb(message: string): void {
  try {
    crashlytics().log(message);
  } catch {
    // ignore
  }
}
