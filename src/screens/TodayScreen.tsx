/**
 * TodayScreen — placeholder for KAN-45 (Today screen UI).
 * Renders the correct theme tokens so theming is verifiable now.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export default function TodayScreen() {
  const { palette } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.text }]}>Today</Text>
      <Text style={[styles.sub, { color: palette.muted }]}>
        Full UI coming in KAN-45
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  sub: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
  },
});
