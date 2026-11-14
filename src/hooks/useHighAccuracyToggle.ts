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
import { highAccuracyGeneration, noteHighAccuracyChange } from '../services/highAccuracy';

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

  // The last value known to be saved. A failed save goes back to this, not
  // to "the opposite of what was tried", which is wrong once two saves overlap.
  const confirmedRef = useRef(false);
  // Saves run one after another, in the order the user flipped the switch.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const latestOpRef = useRef(0);

  useEffect(() => {
    if (!uid) { return; }
    const readGeneration = highAccuracyGeneration();
    getHighAccuracyPref(uid)
      .then(value => {
        // The user flipped the switch while this read was in flight: their
        // choice is newer than what was read.
        if (highAccuracyGeneration() !== readGeneration) { return; }
        confirmedRef.current = value;
        if (mountedRef.current) { setEnabled(value); }
      })
      .catch(err => console.warn('[useHighAccuracyToggle] initial load failed', err));
  }, [uid]);

  const toggle = useCallback((value: boolean) => {
    if (!uid) { return Promise.resolve(); }
    noteHighAccuracyChange();
    const op = ++latestOpRef.current;
    setEnabled(value);
    setTrackingAccuracy(value ? 'fine' : 'coarse');
    const run = saveChainRef.current.then(async () => {
      try {
        await setHighAccuracyPref(uid, value);
        confirmedRef.current = value;
      } catch (err) {
        console.warn('[useHighAccuracyToggle] save failed', err);
        // A newer flip is queued behind this one and will settle the state.
        if (op !== latestOpRef.current) { return; }
        // Not saved: put the switch and the watcher back on what is saved,
        // so what the screen says matches what the app does.
        const saved = confirmedRef.current;
        setTrackingAccuracy(saved ? 'fine' : 'coarse');
        if (mountedRef.current) { setEnabled(saved); }
      }
    });
    saveChainRef.current = run;
    return run;
  }, [uid]);

  return { enabled, toggle };
}
