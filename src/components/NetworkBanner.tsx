/**
 * NetworkBanner — Displays a sticky banner when the device has no internet
 * connectivity, warning the user that Firestore changes may not sync.
 *
 * KAN-236: when offline and the habitat cache has never been seeded anywhere
 * (fresh install/new phone — the only case where the location feature is
 * actually broken, not just quiet), the banner swaps in a more specific
 * message instead of the generic one. Everywhere else offline (inside or
 * beyond cached coverage) the generic banner is enough — see proximity.ts's
 * offline branch for the separate one-time "beyond coverage" toast.
 *
 * hasCachedPlaces() opens/queries SQLite, so it must never run during
 * render (the first call can synchronously create the DB + schema) — it's
 * deferred to a post-commit effect. The generic banner renders immediately
 * on going offline; the effect then swaps in the more specific copy a tick
 * later if the cache turns out to be empty.
 *
 * Uses @react-native-community/netinfo to monitor connection state.
 * Renders nothing when the device is online.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTheme } from '../theme';
import { hasCachedPlaces } from '../services/habitatCache';
import { COPY } from '../constants/copy';

export default function NetworkBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const { palette } = useTheme();

  // Show the banner only when we are confident the device is offline.
  // `null` means the state is not yet known — we stay silent in that case.
  const offline = isConnected === false || isInternetReachable === false;

  const [noCacheYet, setNoCacheYet] = useState(false);

  useEffect(() => {
    if (!offline) {
      setNoCacheYet(false);
      return;
    }
    setNoCacheYet(!hasCachedPlaces());
  }, [offline]);

  if (!offline) {
    return null;
  }

  const message = noCacheYet ? COPY.offline.noCacheYetBanner : COPY.offline.genericBanner;

  return (
    <View
      style={[styles.banner, { backgroundColor: palette.accent }]}
      accessibilityRole="alert"
      accessibilityLabel={message}>
      <Text style={[styles.text, { color: palette.bg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
