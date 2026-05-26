/**
 * ProfileScreen — placeholder for the Profile / Menu tab.
 * Full UI is in the backlog; this ensures the tab shell works now.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import { signOut } from '../services/auth';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const { palette, dark, setDark } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>

        <Text style={[styles.title, { color: palette.text }]}>Profile</Text>

        {/* Spacer keeps title centred */}
        <View style={styles.navBtn} />
      </View>

      {/* ── Content ── */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.sub, { color: palette.muted }]}>
          Full UI coming in a future sprint
        </Text>

        {/* Categories — KAN-16 */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: palette.surface2 }]}
          onPress={() => navigation.navigate('Categories')}
          accessibilityRole="button"
          accessibilityLabel="Manage categories">
          <Text style={[styles.btnText, { color: palette.text }]}>
            🗂  Manage Categories
          </Text>
        </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Top bar ──
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Content ──
  content: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               16,
    paddingHorizontal: spacing.page,
  },
  sub: {
    fontSize:     14,
    fontFamily:   'Geist-Regular',
    marginBottom: 8,
  },
  btn: {
    width:             '100%',
    paddingVertical:   14,
    paddingHorizontal: 20,
    borderRadius:      12,
    alignItems:        'center',
  },
  btnText: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
});
