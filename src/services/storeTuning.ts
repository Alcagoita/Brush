/**
 * storeTuning.ts — KAN-74
 *
 * Session-level state machine for the "Store fine tuning" feature.
 *
 * ── What it does ─────────────────────────────────────────────────────────────
 * When the indoor detection service (KAN-73) reports `indoor_mapped`, this
 * module decides whether to show the opt-in prompt, auto-activate, or stay
 * silent, based on the user's stored preference and battery state.
 *
 * ── State machine ─────────────────────────────────────────────────────────────
 *
 *   off ──(indoor_mapped, eligible)──→ prompt_shown
 *         ↑                                 │
 *   (outdoor)           (Turn on) ──────────┤
 *         │             (Not now) ──────────┘
 *         │
 *   off ←─┴── active ←──(Turn on from prompt)
 *
 *   Eligibility for showing the prompt:
 *     • locationContext === 'indoor_mapped'
 *     • storeTuningEnabled !== false  (not explicitly disabled in settings)
 *     • prompt not already shown this session
 *     • NOT (lowBatteryPause === true AND batteryLevel < 0.20)
 *
 *   Battery suppression path: prompt not shown; `onLowBatterySuppress` fires
 *   once to let the caller show a toast.
 *
 * ── Session semantics ─────────────────────────────────────────────────────────
 * `_promptShownThisSession` is a module-level flag that resets only when
 * `startStoreTuning()` / `stopStoreTuning()` is called. This ensures the
 * prompt fires at most once per app session (or per LocationProvider mount).
 *
 * ── Testability ───────────────────────────────────────────────────────────────
 * All inputs (context, prefs, battery) are explicit parameters on
 * `onLocationContextChange()` — no hidden calls to Date.now() or native APIs.
 * The `getBatteryLevel` dependency is injectable via `__setBatteryGetter`.
 */

import type { LocationContext } from './geolocation';
import type { StoreTuningState } from '../types';
import { LOW_BATTERY_THRESHOLD } from './battery';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoreTuningCallbacks {
  /** Called whenever the state machine transitions. */
  onStateChange: (state: StoreTuningState) => void;
  /**
   * Called once when the prompt would have shown but was suppressed due to
   * low battery. Caller should display a brief toast.
   */
  onLowBatterySuppress: () => void;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _callbacks: StoreTuningCallbacks | null = null;
let _state: StoreTuningState = 'off';
let _promptShownThisSession = false;
let _lowBatterySuppressedThisSession = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the service for the current app session.
 * Resets session flags and registers callbacks.
 * Returns a cleanup function — call on unmount or sign-out.
 */
export function startStoreTuning(callbacks: StoreTuningCallbacks): () => void {
  _reset();
  _callbacks = callbacks;
  return stopStoreTuning;
}

/**
 * React to a change in LocationContext (called by the outdoor engine /
 * indoor detection consumer on every context transition).
 *
 * @param context            Current location context from KAN-73
 * @param storeTuningEnabled Firestore preference (undefined = never set, true = on, false = opted out)
 * @param lowBatteryPause    User's low-battery pause preference (KAN-52)
 * @param batteryLevel       Current battery level 0.0–1.0
 */
export function onLocationContextChange(
  context: LocationContext,
  storeTuningEnabled: boolean | undefined,
  lowBatteryPause: boolean,
  batteryLevel: number,
): void {
  if (!_callbacks) { return; }

  // Returning outdoors → deactivate if currently active.
  if (context === 'outdoor') {
    if (_state === 'active') {
      _setState('off');
    }
    return;
  }

  // Only `indoor_mapped` triggers the prompt — unmapped malls get no prompt.
  if (context !== 'indoor_mapped') { return; }

  // Already showing prompt or active — nothing to do.
  if (_state !== 'off') { return; }

  // User explicitly disabled Store fine tuning in settings.
  if (storeTuningEnabled === false) { return; }

  // Prompt already shown once this session — don't show again.
  if (_promptShownThisSession) { return; }

  // Battery suppression: low battery + user opted in to low-battery pause.
  if (lowBatteryPause && batteryLevel < LOW_BATTERY_THRESHOLD) {
    if (!_lowBatterySuppressedThisSession) {
      _lowBatterySuppressedThisSession = true;
      _callbacks.onLowBatterySuppress();
    }
    return;
  }

  // Show prompt.
  _promptShownThisSession = true;
  _setState('prompt_shown');
}

/**
 * User tapped "Turn on" — activate Store fine tuning.
 * Call this from the prompt sheet's primary CTA handler.
 */
export function activateStoreTuning(): void {
  _setState('active');
}

/**
 * User tapped "Not now" — dismiss the prompt for this session.
 * Call this from the prompt sheet's secondary CTA / close handler.
 */
export function dismissStoreTuning(): void {
  _setState('off');
}

/**
 * Stop the service and reset all session state.
 */
export function stopStoreTuning(): void {
  _reset();
}

/** Expose current state for assertions (test-only). */
export function __getCurrentState(): StoreTuningState {
  return _state;
}

/** Expose the session prompt flag (test-only). */
export function __wasPromptShownThisSession(): boolean {
  return _promptShownThisSession;
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function _reset(): void {
  _callbacks                       = null;
  _state                           = 'off';
  _promptShownThisSession          = false;
  _lowBatterySuppressedThisSession = false;
}

function _setState(next: StoreTuningState): void {
  if (_state === next) { return; }
  _state = next;
  _callbacks?.onStateChange(next);
}
