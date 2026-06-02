/**
 * battery.ts — Cross-platform battery level monitoring (KAN-52).
 *
 * Uses react-native's built-in NativeModules — no third-party library needed.
 * On Android: reads BatteryManager via DeviceBattery native module.
 * On iOS: reads UIDevice.batteryLevel via the same interface.
 *
 * The module exposes:
 *   getBatteryLevel()   — one-shot read (0.0–1.0)
 *   useBatteryLevel()   — React hook that updates on every level change event
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { useEffect, useState } from 'react';

// ─── Threshold ────────────────────────────────────────────────────────────────

/**
 * Battery level below which geofence monitoring is paused when the user
 * has enabled the "Pause nearby alerts on low battery" toggle (KAN-52).
 *
 * Value: 0.20 = 20%. Documented here so it can be changed in one place.
 */
export const LOW_BATTERY_THRESHOLD = 0.20;

// ─── Native module access ─────────────────────────────────────────────────────

// React Native exposes battery info via the DeviceBattery native module on
// both platforms. If unavailable (e.g. simulator), we fall back to 1.0 (full).
const { RNCDeviceBattery } = NativeModules;

const BATTERY_LEVEL_EVENT = 'RNCDeviceBattery_batteryLevelDidChange';

/**
 * One-shot battery level read.
 * Returns a value between 0.0 (empty) and 1.0 (full).
 * Returns 1.0 if the native module is unavailable (simulator / test).
 */
export async function getBatteryLevel(): Promise<number> {
  if (!RNCDeviceBattery) {
    // Simulator or test environment — return full battery so the guard never fires.
    return 1.0;
  }
  try {
    const level = await RNCDeviceBattery.getBatteryLevel();
    return typeof level === 'number' ? level : 1.0;
  } catch {
    return 1.0;
  }
}

/**
 * React hook that provides the current battery level and updates whenever
 * the battery level changes.
 *
 * Returns 1.0 until the first native event fires or a read completes.
 */
export function useBatteryLevel(): number {
  const [level, setLevel] = useState(1.0);

  useEffect(() => {
    // Read the current level immediately on mount.
    getBatteryLevel().then(setLevel);

    if (!RNCDeviceBattery) { return; }

    // Subscribe to ongoing level change events.
    const emitter      = new NativeEventEmitter(RNCDeviceBattery);
    const subscription = emitter.addListener(
      BATTERY_LEVEL_EVENT,
      (newLevel: number) => { setLevel(newLevel); },
    );

    return () => subscription.remove();
  }, []);

  return level;
}

/**
 * Returns true when the low-battery pause should be active.
 * Extracted as a pure helper so it is easy to unit-test.
 */
export function shouldPauseForBattery(level: number, pauseEnabled: boolean): boolean {
  return pauseEnabled && level < LOW_BATTERY_THRESHOLD;
}
