/**
 * NetworkBanner — Displays a sticky banner when the device is offline and
 * the habitat cache has never been seeded anywhere (fresh install/new phone
 * — the only case where the location feature is actually broken, not just
 * quiet).
 *
 * KAN-241: demoted to this one case only. Offline-with-some-cache (whether
 * inside or beyond the cached area) no longer earns a full-width banner —
 * ContextChip's muted glyph is the signal there instead, and proximity.ts's
 * offline branch still fires its separate one-time "beyond coverage" toast.
 * A banner here means something is actually broken; the glyph means "just
 * so you know."
 *
 * Renders nothing when online or when the cache already has data.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { useOfflineCoverage } from '../hooks/useOfflineCoverage';
import { COPY } from '../constants/copy';

export default function NetworkBanner() {
  const { palette } = useTheme();
  const { offline, hasCache } = useOfflineCoverage();

  // hasCache === null means "not checked yet this offline period" — stay
  // silent rather than flashing the banner before the real state is known.
  if (!offline || hasCache !== false) {
    return null;
  }

  const message = COPY.offline.noCacheYetBanner;

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
