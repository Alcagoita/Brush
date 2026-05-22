/**
 * ProfileScreen — placeholder for the Profile / Menu tab.
 * Full UI is in the backlog; this ensures the tab shell works now.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { signOut } from '../services/auth';

export default function ProfileScreen() {
  const { palette, dark, setDark } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: palette.surface2 }]}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <Text style={[styles.backText, { color: palette.text }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.label, { color: palette.text }]}>Profile</Text>
      <Text style={[styles.sub, { color: palette.muted }]}>
        Full UI coming in a future sprint
      </Text>

      {/* Theme toggle — useful for testing KAN-47 until a proper UI exists */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: palette.surface2 }]}
        onPress={() => setDark(!dark)}
        accessibilityRole="button"
        accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <Text style={[styles.btnText, { color: palette.text }]}>
          {dark ? '☀️  Light mode' : '🌙  Dark mode'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: palette.surface2 }]}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out">
        <Text style={[styles.btnText, { color: palette.accent }]}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 22,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },
  label: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  sub: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    marginBottom: 8,
  },
  btn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
});
