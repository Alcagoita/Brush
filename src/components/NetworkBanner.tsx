/**
 * NetworkBanner — Displays a sticky amber banner when the device has no
 * internet connectivity, warning the user that Firestore changes may not sync.
 *
 * Uses @react-native-community/netinfo to monitor connection state.
 * Renders nothing when the device is online.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export default function NetworkBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();

  // Show the banner only when we are confident the device is offline.
  // `null` means the state is not yet known — we stay silent in that case.
  const offline = isConnected === false || isInternetReachable === false;

  if (!offline) {
    return null;
  }

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Changes may not sync.">
      <Text style={styles.text}>⚠️  Offline — changes may not sync</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
