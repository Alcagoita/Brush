/**
 * useFirstSessionGate — KAN-245
 *
 * "Never during the first session (let the user learn the core first)."
 * On mount, checks the user doc's `firstSessionSeenAt`. If unset, this IS
 * that first session — returns true and stamps the field so every session
 * after this one returns false. A dedicated one-shot fetch (not folded into
 * useTodayScreenData's boot/fetch dual-path) — small, decoupled, and this
 * flag only needs to be read/written once per user, ever.
 */

import { useEffect, useState } from 'react';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { getUser, upsertUser, serverTimestamp } from '../../services/firestore';

export function useFirstSessionGate(uid: string | undefined): boolean {
  const [isFirstSession, setIsFirstSession] = useState(false);

  useEffect(() => {
    if (!uid) { return; }
    let cancelled = false;

    getUser(uid)
      .then(user => {
        if (cancelled) { return; }
        if (!user?.firstSessionSeenAt) {
          setIsFirstSession(true);
          // serverTimestamp() returns a FieldValue, not a real Timestamp —
          // upsertUser's plain User-shaped param type doesn't know Firestore
          // resolves it server-side on write, same gap every other
          // serverTimestamp() caller in this codebase works around.
          upsertUser(uid, {
            firstSessionSeenAt: serverTimestamp() as unknown as FirebaseFirestoreTypes.Timestamp,
          }).catch(() => {});
        }
      })
      .catch(() => {
        // Fails closed to "not first session" — a transient read error
        // shouldn't permanently block suggestions from ever appearing.
      });

    return () => { cancelled = true; };
  }, [uid]);

  return isFirstSession;
}
