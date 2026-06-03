/**
 * ProfileScreen — Profile / settings tab.
 *
 * KAN-29: Notification preferences section.
 * Shows per-POI-type geofence radius controls. Changes are persisted to
 * Firestore via setPoiPreference and reflected in the proximity engine in real
 * time (proximity.ts listens to subscribeToPoiPreferences and invalidates its
 * place cache on every change).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { ChevronLeftIcon, GridIcon, LogOutIcon, MoonIcon, PoiIcon, SunIcon } from '../components/AppIcon';
import { logout } from '../services/auth';
import { subscribeToPoiPreferences, setPoiPreference, subscribeToCategories, subscribeLowBatteryPausePref, setLowBatteryPausePref } from '../services/firestore';
import { placeTypeLabel } from '../services/maps';
import { Category, POI_GEOFENCE_RADIUS } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Step size for the radius stepper (metres). */
const STEP = 25;
/** Minimum geofence radius a user can set. */
const MIN_RADIUS = 25;
/** Maximum geofence radius a user can set. */
const MAX_RADIUS = 500;
/**
 * Default radius for custom (non-built-in) POI types — matches
 * DEFAULT_GEOFENCE_RADIUS in proximity.ts so the stepper initialises at the
 * same value the engine would use before the user saves a preference.
 */
const DEFAULT_CUSTOM_RADIUS = 75;

/** Built-in POI types — always shown; used to deduplicate custom category rows. */
const BUILTIN_POI_TYPES = new Set(['atm', 'pharmacy', 'cafe', 'supermarket']);

/** Fixed rows for the 4 built-in POI types. */
const POI_ROWS: { type: string; label: string }[] = [
  { type: 'atm',         label: 'ATM' },
  { type: 'pharmacy',    label: 'Pharmacy' },
  { type: 'cafe',        label: 'Café' },
  { type: 'supermarket', label: 'Supermarket' },
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

  // ── Custom categories ──────────────────────────────────────────────────────
  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToCategories(uid, cats => {
      setCustomCategories(cats);
    });
  }, [uid]);

  /**
   * All POI rows to display: the 4 built-ins first, then one row per unique
   * custom poi type that the user has assigned to at least one of their
   * custom categories. Built-in types are deduplicated so a custom "ATM"
   * category doesn't produce a duplicate row.
   */
  const allPoiRows = useMemo<{ type: string; label: string }[]>(() => {
    const seen = new Set<string>(BUILTIN_POI_TYPES);
    const custom: { type: string; label: string }[] = [];
    for (const cat of customCategories) {
      if (cat.poi && !seen.has(cat.poi)) {
        seen.add(cat.poi);
        custom.push({ type: cat.poi, label: placeTypeLabel(cat.poi) });
      }
    }
    return [...POI_ROWS, ...custom];
  }, [customCategories]);

  // ── Low-battery pause preference (KAN-52) ─────────────────────────────────
  const [lowBatteryPause, setLowBatteryPause] = useState(false);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeLowBatteryPausePref(uid, setLowBatteryPause);
  }, [uid]);

  // ── Logout (KAN-20) ────────────────────────────────────────────────────────
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              // Navigation back to LoginScreen is handled automatically by
              // onAuthStateChanged → AppShell swaps to <LoginScreen />.
              // The NavigationContainer is unmounted, so no back-gesture is possible.
            } catch (err) {
              console.warn('[ProfileScreen] logout failed', err);
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  }, []);

  function handleLowBatteryToggle(value: boolean): void {
    // Optimistic update
    setLowBatteryPause(value);
    if (!uid) { return; }
    setLowBatteryPausePref(uid, value).catch(err =>
      console.warn('[ProfileScreen] setLowBatteryPausePref failed', err),
    );
  }

  // ── Stepper handler ────────────────────────────────────────────────────────
  function handleRadiusChange(poiType: string, delta: number): void {
    const current = poiRadii[poiType] ?? DEFAULT_RADII[poiType] ?? DEFAULT_CUSTOM_RADIUS;
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
          <GridIcon color={palette.muted} size={20} />
          <Text style={[styles.btnText, { color: palette.text }]}>
            Manage Categories
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

          {allPoiRows.map(({ type, label }, idx) => {
            const r = poiRadii[type] ?? DEFAULT_RADII[type] ?? DEFAULT_CUSTOM_RADIUS;
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

                  {/* Icon tile — matches the 36×36 idleIconTile pattern from NearbyCard */}
                  <View style={[styles.poiIconTile, { backgroundColor: palette.surface2 }]}>
                    <PoiIcon type={type} color={palette.muted} size={20} />
                  </View>
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

        {/* ── Battery (KAN-52) ── */}
        <View style={[styles.section, { backgroundColor: palette.surface2 }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Battery
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>
                Pause nearby alerts on low battery
              </Text>
              <Text style={[styles.toggleSub, { color: palette.muted }]}>
                Alerts pause when battery drops below 20%
              </Text>
            </View>
            <Switch
              value={lowBatteryPause}
              onValueChange={handleLowBatteryToggle}
              trackColor={{ false: palette.line, true: palette.accent }}
              thumbColor={palette.bg}
              accessibilityLabel="Pause nearby alerts on low battery"
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* ── Appearance ── */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: palette.surface2 }]}
          onPress={() => setDark(!dark)}
          accessibilityRole="button"
          accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark
            ? <SunIcon  color={palette.muted} size={20} />
            : <MoonIcon color={palette.muted} size={20} />
          }
          <Text style={[styles.btnText, { color: palette.text }]}>
            {dark ? 'Light mode' : 'Dark mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: palette.surface2 }, loggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={loggingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out">
          <LogOutIcon color={palette.accent} size={20} />
          <Text style={[styles.btnText, { color: palette.accent }]}>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </Text>
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
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingVertical:   14,
    paddingHorizontal: 20,
    borderRadius:      radii.ctaBtn,
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
  // 36×36 icon tile — matches the idleIconTile pattern used throughout the app
  // (NearbyCard, NewTaskSheet). Always use PoiIcon inside this tile; never emoji.
  poiIconTile: {
    width:          36,
    height:         36,
    borderRadius:   radii.listIcon, // 10
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    10,
  },
  poiLabel: {
    flex:       1,
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── Toggle row (KAN-52) ──
  toggleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 10,
    gap: 12,
  },
  toggleText: {
    flex: 1,
    gap:  2,
  },
  toggleLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },
  toggleSub: {
    fontSize:   12,
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
