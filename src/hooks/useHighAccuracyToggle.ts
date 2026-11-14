/**
 * useHighAccuracyToggle — KAN-515
 *
 * Profile's "High accuracy" / "Alta precisão" switch. On: the location
 * watcher runs at fine accuracy everywhere (KAN-55's `fine`); off: coarse.
 * It applies immediately and is saved, so it survives a restart
 * (useTodayScreenData restores it from the same preference at start).
 *
 * The app never turns it on by itself and never asks: it's the user's choice
 * (owner, 2026-11-14). It replaced the "Activate Mall mode" row; that row's
 * snapshot hook (useMallSnapshotToggle, KAN-237) stays in the codebase,
 * unused, until the post-testing decision.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { setTrackingAccuracy } from '../services/geolocation';
import { getHighAccuracyPref, setHighAccuracyPref } from '../services/firestore';

export interface HighAccuracyToggleState {
  enabled: boolean;
  toggle: (value: boolean) => Promise<void>;
}

export function useHighAccuracyToggle(): HighAccuracyToggleState {
  const uid = getAuth().currentUser?.uid ?? '';
  const [enabled, setEnabled] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!uid) { return; }
    getHighAccuracyPref(uid)
      .then(value => { if (mountedRef.current) { setEnabled(value); } })
      .catch(err => console.warn('[useHighAccuracyToggle] initial load failed', err));
  }, [uid]);

  const toggle = useCallback(async (value: boolean) => {
    if (!uid) { return; }
    setEnabled(value);
    setTrackingAccuracy(value ? 'fine' : 'coarse');
    try {
      await setHighAccuracyPref(uid, value);
    } catch (err) {
      // Not saved: put the switch and the watcher back where they were, so
      // what the screen says matches what the app does.
      console.warn('[useHighAccuracyToggle] save failed', err);
      setTrackingAccuracy(value ? 'coarse' : 'fine');
      if (mountedRef.current) { setEnabled(!value); }
    }
  }, [uid]);

  return { enabled, toggle };
}
