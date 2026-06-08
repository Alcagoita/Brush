/**
 * __tests__/services/storeTuning.test.ts — KAN-74
 *
 * Unit tests for the Store fine tuning session state machine.
 * All inputs are passed explicitly — no native APIs are called.
 */

import {
  startStoreTuning,
  stopStoreTuning,
  activateStoreTuning,
  dismissStoreTuning,
  onLocationContextChange,
  __getCurrentState,
  __wasPromptShownThisSession,
} from '../../src/services/storeTuning';

// LOW_BATTERY_THRESHOLD is 0.20 (20 %)
const FULL_BATTERY    = 1.0;
const LOW_BATTERY     = 0.15; // below threshold
const OK_BATTERY      = 0.50; // above threshold

describe('storeTuning', () => {
  let onStateChange:       jest.Mock;
  let onLowBatterySuppress: jest.Mock;

  beforeEach(() => {
    onStateChange        = jest.fn();
    onLowBatterySuppress = jest.fn();
    startStoreTuning({ onStateChange, onLowBatterySuppress });
  });

  afterEach(() => {
    stopStoreTuning();
  });

  // ── 1. Initial state ────────────────────────────────────────────────────────

  it('starts in off state', () => {
    expect(__getCurrentState()).toBe('off');
    expect(onStateChange).not.toHaveBeenCalled();
  });

  // ── 2. No-op when stopped ───────────────────────────────────────────────────

  it('ignores onLocationContextChange calls after stop', () => {
    stopStoreTuning();
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(onStateChange).not.toHaveBeenCalled();
  });

  // ── 3. indoor_mapped → prompt_shown ────────────────────────────────────────

  it('transitions off → prompt_shown on first indoor_mapped detection', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');
    expect(onStateChange).toHaveBeenCalledWith('prompt_shown');
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });

  it('shows prompt when storeTuningEnabled is undefined (never set)', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');
  });

  it('shows prompt when storeTuningEnabled is true (already opted in)', () => {
    onLocationContextChange('indoor_mapped', true, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');
  });

  // ── 4. Suppressed when storeTuningEnabled === false ─────────────────────────

  it('suppresses prompt when storeTuningEnabled === false (user opted out)', () => {
    onLocationContextChange('indoor_mapped', false, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('off');
    expect(onStateChange).not.toHaveBeenCalled();
  });

  // ── 5. Prompt shown only once per session ───────────────────────────────────

  it('does not show the prompt a second time in the same session', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');

    // Dismiss and trigger indoor_mapped again
    dismissStoreTuning();
    expect(__getCurrentState()).toBe('off');

    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    // Still off — prompt was already shown this session
    expect(__getCurrentState()).toBe('off');
    expect(onStateChange).toHaveBeenCalledTimes(2); // prompt_shown + off; no third call
  });

  // ── 6. Battery suppression ──────────────────────────────────────────────────

  it('suppresses prompt on low battery when lowBatteryPause is enabled', () => {
    onLocationContextChange('indoor_mapped', undefined, true, LOW_BATTERY);
    expect(__getCurrentState()).toBe('off');
    expect(onStateChange).not.toHaveBeenCalled();
    expect(onLowBatterySuppress).toHaveBeenCalledTimes(1);
  });

  it('does not suppress on low battery if lowBatteryPause is disabled', () => {
    onLocationContextChange('indoor_mapped', undefined, false, LOW_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');
    expect(onLowBatterySuppress).not.toHaveBeenCalled();
  });

  it('does not suppress on OK battery even if lowBatteryPause is enabled', () => {
    onLocationContextChange('indoor_mapped', undefined, true, OK_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');
    expect(onLowBatterySuppress).not.toHaveBeenCalled();
  });

  it('fires onLowBatterySuppress only once per session even with repeated context calls', () => {
    onLocationContextChange('indoor_mapped', undefined, true, LOW_BATTERY);
    onLocationContextChange('indoor_mapped', undefined, true, LOW_BATTERY);
    onLocationContextChange('indoor_mapped', undefined, true, LOW_BATTERY);
    expect(onLowBatterySuppress).toHaveBeenCalledTimes(1);
  });

  // ── 7. indoor_unmapped does not trigger the prompt ─────────────────────────

  it('does not show the prompt for indoor_unmapped context', () => {
    onLocationContextChange('indoor_unmapped', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('off');
    expect(onStateChange).not.toHaveBeenCalled();
  });

  // ── 8. activateStoreTuning ──────────────────────────────────────────────────

  it('transitions prompt_shown → active when user taps Turn on', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');

    activateStoreTuning();
    expect(__getCurrentState()).toBe('active');
    expect(onStateChange).toHaveBeenLastCalledWith('active');
  });

  // ── 9. dismissStoreTuning ───────────────────────────────────────────────────

  it('transitions prompt_shown → off when user taps Not now', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    dismissStoreTuning();
    expect(__getCurrentState()).toBe('off');
    expect(onStateChange).toHaveBeenLastCalledWith('off');
  });

  // ── 10. Outdoor context deactivates when active ─────────────────────────────

  it('deactivates (active → off) when context returns to outdoor', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    activateStoreTuning();
    expect(__getCurrentState()).toBe('active');

    onLocationContextChange('outdoor', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('off');
    expect(onStateChange).toHaveBeenLastCalledWith('off');
  });

  it('does not fire callback when returning outdoor from off state', () => {
    // State is already off; returning outdoor should be a no-op
    onLocationContextChange('outdoor', undefined, false, FULL_BATTERY);
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('does not fire callback when returning outdoor from prompt_shown state', () => {
    // prompt_shown → outdoor: state stays prompt_shown (no auto-deactivate for prompt)
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');

    onLocationContextChange('outdoor', undefined, false, FULL_BATTERY);
    // Only 'active' is auto-deactivated; prompt_shown is left as-is
    // (the sheet's "Not now" / close handler handles dismissal)
    expect(__getCurrentState()).toBe('prompt_shown');
    expect(onStateChange).toHaveBeenCalledTimes(1); // only the initial prompt_shown
  });

  // ── 11. No duplicate state transitions ─────────────────────────────────────

  it('does not fire callback if state is already off when dismissing', () => {
    dismissStoreTuning(); // state is already 'off'
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('does not fire callback if activating while already active', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    activateStoreTuning();
    const callCount = onStateChange.mock.calls.length;

    activateStoreTuning(); // already active
    expect(onStateChange).toHaveBeenCalledTimes(callCount);
  });

  // ── 12. Session reset ───────────────────────────────────────────────────────

  it('resets session flags on startStoreTuning (new session)', () => {
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(__wasPromptShownThisSession()).toBe(true);

    // Simulate a new session
    startStoreTuning({ onStateChange, onLowBatterySuppress });
    expect(__wasPromptShownThisSession()).toBe(false);
    expect(__getCurrentState()).toBe('off');

    // Prompt should show again in the new session
    onLocationContextChange('indoor_mapped', undefined, false, FULL_BATTERY);
    expect(__getCurrentState()).toBe('prompt_shown');
  });
});
