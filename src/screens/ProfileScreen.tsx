/**
 * ProfileScreen — Profile / settings tab.
 *
 * KAN-29: Notification preferences section.
 * Shows per-POI-type geofence radius controls. Changes are persisted to
 * Firestore via setPoiPreference and reflected in the proximity engine in real
 * time (proximity.ts listens to subscribeToPoiPreferences and invalidates its
 * place cache on every change).
 */
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import { signOut } from '../services/auth';
import { subscribeToPoiPreferences, setPoiPreference } from '../services/firestore';
import { POI_GEOFENCE_RADIUS } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Step size for the radius stepper (metres). */
const STEP = 25;
/** Minimum geofence radius a user can set. */
const MIN_RADIUS = 25;
/** Maximum geofence radius a user can set. */
const MAX_RADIUS = 500;

/** Ordered list of built-in POI types rendered in the preferences section. */
const POI_ROWS: { type: string; emoji: string; label: string }[] = [
  { type: 'atm',         emoji: '🏧', label: 'ATM' },
  { type: 'pharmacy',    emoji: '💊', label: 'Pharmacy' },
  { type: 'cafe',        emoji: '☕', label: 'Café' },
  { type: 'supermarket', emoji: '🛒', label: 'Supermarket' },
];

const DEFAULT_RADII: Record<string, number> = {
  atm:         POI_GEOFENCE_RADIUS.atm,
  pharmacy:    POI_GEOFENCE_RADIUS.pharmacy,
  cafe:        POI_GEOFENCE_RADIUS.cafe,
  supermarket: POI_GEOFENCE_RADIUS.supermarket,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { palette, dark, setDark } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const uid = getAuth().currentUser?.uid;

  // ── Notification preference state ──────────────────────────────────────────
  const [poiRadii, setPoiRadii] = useState<Record<string, number>>(DEFAULT_RADII);

  useEffect(() => {
    if (!uid) { return; }
    // Subscribe to Firestore — fires immediately with stored prefs, then on
    // every change. Merges into local state so only saved values override defaults.
    return subscribeToPoiPreferences(uid, prefs => {
      setPoiRadii(prev => ({ ...prev, ...prefs }));
    });
  }, [uid]);

  // ── Stepper handler ────────────────────────────────────────────────────────
  function handleRadiusChange(poiType: string, delta: number): void {
    const current = poiRadii[poiType] ?? DEFAULT_RADII[poiType] ?? MIN_RADIUS;
    const next = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, current + delta));
    if (next === current) { return; }

    // Optimistic update — subscription will confirm shortly after the write.
    setPoiRadii(prev => ({ ...prev, [poiType]: next }));

    if (!uid) { return; }
    setPoiPreference(uid, poiType, next).catch(err =>
      console.warn('[ProfileScreen] setPoiPreference failed', err),
    );
  }

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

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ── Navigation ── */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: palette.surface2 }]}
          onPress={() => navigation.navigate('Categories')}
          accessibilityRole="button"
          accessibilityLabel="Manage categories">
          <Text style={[styles.btnText, { color: palette.text }]}>
            🗂  Manage Categories
          </Text>
        </TouchableOpacity>

        {/* ── Notification Preferences (KAN-29) ── */}
        <View style={[styles.section, { backgroundColor: palette.surface2 }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Notification Preferences
          </Text>
          <Text style={[styles.sectionSub, { color: palette.muted }]}>
            Alert radius per location type
          </Text>

          {POI_ROWS.map(({ type, emoji, label }, idx) => {
            const r = poiRadii[type] ?? DEFAULT_RADII[type] ?? MIN_RADIUS;
            const atMin = r <= MIN_RADIUS;
            const atMax = r >= MAX_RADIUS;

            return (
              <View key={type}>
                {idx > 0 && (
                  <View style={[styles.divider, { backgroundColor: palette.line }]} />
                )}
                <View
                  style={styles.poiRow}
                  accessibilityLabel={`${label} notification radius`}>

                  {/* Label */}
                  <Text style={[styles.poiEmoji]}>{emoji}</Text>
                  <Text style={[styles.poiLabel, { color: palette.text }]}>{label}</Text>

                  {/* Stepper */}
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[
                        styles.stepBtn,
                        { borderColor: palette.line },
                        atMin && styles.stepBtnDisabled,
                      ]}
                      onPress={() => handleRadiusChange(type, -STEP)}
                      disabled={atMin}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${label} radius`}>
                      <Text style={[styles.stepBtnText, { color: atMin ? palette.faint : palette.text }]}>
                        −
                      </Text>
                    </TouchableOpacity>

                    <Text
                      style={[styles.radiusLabel, { color: palette.text }]}
                      accessibilityLabel={`${r} metres`}>
                      {r} m
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.stepBtn,
                        { borderColor: palette.line },
                        atMax && styles.stepBtnDisabled,
                      ]}
                      onPress={() => handleRadiusChange(type, +STEP)}
                      disabled={atMax}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${label} radius`}>
                      <Text style={[styles.stepBtnText, { color: atMax ? palette.faint : palette.text }]}>
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Appearance ── */}
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
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  content: {
    gap:               16,
    paddingHorizontal: spacing.page,
    paddingTop:        24,
  },

  // ── Generic button row ──
  btn: {
    width:             '100%',
    paddingVertical:   14,
    paddingHorizontal: 20,
    borderRadius:      radii.ctaBtn,
    alignItems:        'center',
  },
  btnText: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },

  // ── Notification preferences section ──
  section: {
    borderRadius:      radii.card,
    paddingHorizontal: spacing.page,
    paddingTop:        16,
    paddingBottom:     8,
  },
  sectionTitle: {
    fontSize:     15,
    fontWeight:   '600',
    fontFamily:   'Geist-SemiBold',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize:     13,
    fontFamily:   'Geist-Regular',
    marginBottom: 12,
  },

  // ── POI row ──
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  poiRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 10,
  },
  poiEmoji: {
    fontSize:    18,
    marginRight: 10,
  },
  poiLabel: {
    flex:       1,
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── Stepper ──
  stepper: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  stepBtn: {
    width:        32,
    height:       32,
    borderRadius: 8,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontSize:   18,
    fontWeight: '400',
    lineHeight: 22,
  },
  radiusLabel: {
    fontSize:    14,
    fontFamily:  'Geist-Medium',
    fontWeight:  '500',
    minWidth:    52,
    textAlign:   'center',
  },
});
