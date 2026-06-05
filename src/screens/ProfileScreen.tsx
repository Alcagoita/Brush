/**
 * ProfileScreen — KAN-18 / KAN-19
 *
 * Profile view and edit screen.
 *
 * Sections (top → bottom):
 *   1. Avatar (amber dot default; photo if set) + "Add photo" affordance
 *   2. Identity: editable Name, read-only Email
 *   3. Points & Achievements — total points (live), earned badges, "See all" → KAN-33
 *   4. Notification Preferences (per-POI radius steppers) — KAN-29
 *   5. Battery — low-battery pause toggle — KAN-52
 *   6. Appearance — dark/light mode toggle
 *   7. Sign out — KAN-20
 *
 * Design decisions (KAN-18 comments):
 *   - Avatar default is the amber dot (palette.accent, 12 px) via Avatar component.
 *     NOT a letter initial. Avatar component is shared with Header (KAN-78).
 *   - Photo upload is deferred to a future sprint. The "Add photo" affordance
 *     is visually present but shows a "coming soon" alert when tapped.
 *   - Name is editable inline: tap → TextInput appears; Save writes to both
 *     Firebase Auth (updateProfile) and Firestore (updateDisplayName).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, updateProfile } from '@react-native-firebase/auth/lib/modular';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, ChevronRightIcon, GridIcon, LogOutIcon, MoonIcon, PoiIcon, SunIcon } from '../components/AppIcon';
import Avatar from '../components/Avatar';
import { logout } from '../services/auth';
import {
  subscribeToPoiPreferences,
  setPoiPreference,
  subscribeToCategories,
  subscribeLowBatteryPausePref,
  setLowBatteryPausePref,
  updateDisplayName,
  subscribeToTotalPoints,
  subscribeToAchievements,
  getUser,
  updateUsername,
  checkUsernameAvailable,
  validateUsername,
  USERNAME_COOLDOWN_DAYS,
} from '../services/firestore';
import { placeTypeLabel } from '../services/maps';
import { Achievement, Category, POI_GEOFENCE_RADIUS } from '../types';
import ImportTasksSection from '../components/ImportTasksSection';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP           = 25;
const MIN_RADIUS     = 25;
const MAX_RADIUS     = 500;
const DEFAULT_CUSTOM_RADIUS = 75;

const BUILTIN_POI_TYPES = new Set(['atm', 'pharmacy', 'cafe', 'supermarket']);

const POI_ROWS: { type: string; label: string }[] = [
  { type: 'atm',         label: 'ATM' },
  { type: 'pharmacy',    label: 'Pharmacy' },
  { type: 'cafe',        label: 'Café' },
  { type: 'supermarket', label: 'Supermarket' },
];

// ─── Achievement metadata ─────────────────────────────────────────────────────

const ACHIEVEMENT_META: Record<string, { label: string; icon: string }> = {
  first_task:       { label: 'First task',    icon: '★' },
  daily_complete:   { label: 'Day complete',  icon: '✓' },
};

function getAchievementMeta(type: string) {
  return ACHIEVEMENT_META[type] ?? { label: type.replace(/_/g, ' '), icon: '•' };
}

// ─── AchievementBadge ─────────────────────────────────────────────────────────

interface BadgeProps {
  achievement: Achievement;
  palette:     ReturnType<typeof useTheme>['palette'];
}

function AchievementBadge({ achievement, palette }: BadgeProps) {
  const { label, icon } = getAchievementMeta(achievement.type);
  return (
    <View
      style={[styles.badge, { backgroundColor: palette.nearTint2, borderColor: palette.nearBorder }]}
      accessibilityLabel={`Achievement: ${label}`}>
      <Text style={[styles.badgeIcon, { color: palette.accent }]}>{icon}</Text>
      <Text style={[styles.badgeLabel, { color: palette.nearText }]}>{label}</Text>
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

  const currentUser  = getAuth().currentUser;
  const uid          = currentUser?.uid;
  const userEmail    = currentUser?.email ?? '';
  const userPhotoURL = currentUser?.photoURL ?? null;

  // ── Name edit ──────────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameValue,   setNameValue]   = useState(currentUser?.displayName ?? '');
  const [savingName,  setSavingName]  = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const handleEditName = () => {
    setEditingName(true);
    // Focus after next render
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleSaveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || !uid || !currentUser) { return; }
    setSavingName(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(currentUser, { displayName: trimmed });
      // Update Firestore user document
      await updateDisplayName(uid, trimmed);
      setEditingName(false);
    } catch (err) {
      console.warn('[ProfileScreen] updateDisplayName failed', err);
    } finally {
      setSavingName(false);
    }
  }, [nameValue, uid, currentUser]);

  const handleCancelName = () => {
    setNameValue(currentUser?.displayName ?? '');
    setEditingName(false);
  };

  // ── Username edit (KAN-97) ────────────────────────────────────────────────
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(undefined);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue,   setUsernameValue]   = useState('');
  const [usernameError,   setUsernameError]   = useState('');
  const [savingUsername,  setSavingUsername]  = useState(false);
  const [cooldownDays,    setCooldownDays]    = useState<number | null>(null);

  useEffect(() => {
    if (!uid) { return; }
    getUser(uid).then(userData => {
      setCurrentUsername(userData?.username);
    });
  }, [uid]);

  const handleEditUsername = () => {
    setUsernameValue(currentUsername ?? '');
    setUsernameError('');
    setEditingUsername(true);
  };

  // Local format validation only — no API calls while typing.
  const handleUsernameChange = (raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsernameValue(v);
    setUsernameError(validateUsername(v) ?? '');
  };

  // Availability checked here, once, on Save tap.
  const handleSaveUsername = async () => {
    if (!uid) { return; }
    const trimmed = usernameValue.trim();
    const fmtErr = validateUsername(trimmed);
    if (fmtErr || trimmed === currentUsername) { return; }
    setSavingUsername(true);
    setUsernameError('');
    try {
      const available = await checkUsernameAvailable(trimmed);
      if (!available) {
        setUsernameError('@' + trimmed + ' is already taken.');
        return;
      }
      await updateUsername(uid, trimmed);
      setCurrentUsername(trimmed);
      setEditingUsername(false);
      setCooldownDays(USERNAME_COOLDOWN_DAYS);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('username_cooldown:')) {
        const days = parseInt(msg.split(':')[1], 10);
        setCooldownDays(days);
        setUsernameError(`You can change your username again in ${days} day${days !== 1 ? 's' : ''}.`);
      } else {
        setUsernameError('Failed to save. Please try again.');
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const handleCancelUsername = () => {
    setEditingUsername(false);
    setUsernameError('');
  };

  const handleShareProfile = async () => {
    if (!currentUsername) { return; }
    await Share.share({
      message: `Follow me on Brush Away: https://brushaway.app/u/${currentUsername}`,
      url: `https://brushaway.app/u/${currentUsername}`,
    });
  };

  // ── Points & Achievements (KAN-19) ────────────────────────────────────────
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [achievements,  setAchievements]  = useState<Achievement[]>([]);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToTotalPoints(uid, setTotalPoints, err =>
      console.warn('[ProfileScreen] totalPoints error', err),
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToAchievements(uid, setAchievements, err =>
      console.warn('[ProfileScreen] achievements error', err),
    );
  }, [uid]);

  // ── Notification preferences ───────────────────────────────────────────────
  const [poiRadii, setPoiRadii] = useState<Record<string, number>>(DEFAULT_RADII);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToPoiPreferences(uid, prefs => {
      setPoiRadii(prev => ({ ...prev, ...prefs }));
    });
  }, [uid]);

  // ── Custom categories ──────────────────────────────────────────────────────
  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToCategories(uid, cats => setCustomCategories(cats));
  }, [uid]);

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

  // ── Low-battery pause ──────────────────────────────────────────────────────
  const [lowBatteryPause, setLowBatteryPause] = useState(false);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeLowBatteryPausePref(uid, setLowBatteryPause);
  }, [uid]);

  function handleLowBatteryToggle(value: boolean): void {
    setLowBatteryPause(value);
    if (!uid) { return; }
    setLowBatteryPausePref(uid, value).catch(err =>
      console.warn('[ProfileScreen] setLowBatteryPausePref failed', err),
    );
  }

  // ── Radius stepper ─────────────────────────────────────────────────────────
  function handleRadiusChange(poiType: string, delta: number): void {
    const current = poiRadii[poiType] ?? DEFAULT_RADII[poiType] ?? DEFAULT_CUSTOM_RADIUS;
    const next = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, current + delta));
    if (next === current) { return; }
    setPoiRadii(prev => ({ ...prev, [poiType]: next }));
    if (!uid) { return; }
    setPoiPreference(uid, poiType, next).catch(err =>
      console.warn('[ProfileScreen] setPoiPreference failed', err),
    );
  }

  // ── Notification prefs expand/collapse (KAN-80) ───────────────────────────
  // Default fully collapsed: NO rows visible until the user taps the header.
  // State is NOT persisted — resets to collapsed on every screen mount.
  const [prefsExpanded, setPrefsExpanded] = useState(false);

  const visiblePoiRows = prefsExpanded ? allPoiRows : [];
  const hiddenCount    = allPoiRows.length;

  const togglePrefs = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPrefsExpanded(prev => !prev);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
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
            } catch (err) {
              console.warn('[ProfileScreen] logout failed', err);
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

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
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Avatar section ── */}
        <View style={styles.avatarSection}>
          {/* Large amber-dot avatar (photo if set) */}
          <Avatar
            photoURL={userPhotoURL}
            size={72}
            accessibilityLabel="Profile photo"
          />

          {/* "Add photo" affordance — deferred to future sprint */}
          <Pressable
            onPress={() =>
              Alert.alert('Coming soon', 'Photo upload will be available in a future update.')
            }
            accessibilityRole="button"
            accessibilityLabel="Add photo">
            <Text style={[styles.addPhotoLabel, { color: palette.muted }]}>
              {userPhotoURL ? 'Change photo' : 'Add photo'}
            </Text>
          </Pressable>
        </View>

        {/* ── Identity card ── */}
        <View style={[styles.section, { backgroundColor: palette.surface2 }]}>

          {/* Name row */}
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, { color: palette.muted }]}>Name</Text>
            {editingName ? (
              <View style={styles.nameEditWrap}>
                <TextInput
                  ref={nameInputRef}
                  style={[styles.nameInput, { color: palette.text, borderBottomColor: palette.accent }]}
                  value={nameValue}
                  onChangeText={setNameValue}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  accessibilityLabel="Edit name"
                  maxLength={80}
                />
                <View style={styles.nameActions}>
                  <Pressable
                    onPress={handleCancelName}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel name edit">
                    <Text style={[styles.nameActionLabel, { color: palette.muted }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveName}
                    disabled={savingName || !nameValue.trim()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Save name">
                    <Text style={[
                      styles.nameActionLabel,
                      { color: savingName || !nameValue.trim() ? palette.faint : palette.accent },
                    ]}>
                      {savingName ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handleEditName}
                style={styles.identityValueRow}
                accessibilityRole="button"
                accessibilityLabel="Edit name">
                <Text style={[styles.identityValue, { color: palette.text }]}>
                  {currentUser?.displayName || '—'}
                </Text>
                <Text style={[styles.editHint, { color: palette.accent }]}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.identityDivider, { backgroundColor: palette.line }]} />

          {/* Email row — read-only */}
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, { color: palette.muted }]}>Email</Text>
            <Text style={[styles.identityValue, { color: palette.text }]} numberOfLines={1}>
              {userEmail || '—'}
            </Text>
          </View>

          <View style={[styles.identityDivider, { backgroundColor: palette.line }]} />

          {/* Username row (KAN-97) */}
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, { color: palette.muted }]}>Username</Text>
            {editingUsername ? (
              <View style={styles.nameEditWrap}>
                <View style={styles.usernameInputRow}>
                  <Text style={[styles.usernamePrefix, { color: palette.faint }]}>@</Text>
                  <TextInput
                    style={[styles.nameInput, { color: palette.text, borderBottomColor: palette.accent, flex: 1 }]}
                    value={usernameValue}
                    onChangeText={handleUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveUsername}
                    accessibilityLabel="Edit username"
                    maxLength={20}
                  />
                  {savingUsername && (
                    <ActivityIndicator size="small" color={palette.muted} style={{ marginLeft: 6 }} />
                  )}
                </View>
                {usernameError ? (
                  <Text style={[styles.usernameHint, { color: '#e05252' }]}>{usernameError}</Text>
                ) : null}
                <View style={styles.nameActions}>
                  <Pressable onPress={handleCancelUsername} hitSlop={8} accessibilityRole="button">
                    <Text style={[styles.nameActionLabel, { color: palette.muted }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveUsername}
                    disabled={savingUsername || !!usernameError || usernameValue === currentUsername}
                    hitSlop={8}
                    accessibilityRole="button">
                    <Text style={[styles.nameActionLabel, {
                      color: (savingUsername || !!usernameError || usernameValue === currentUsername)
                        ? palette.faint : palette.accent,
                    }]}>
                      {savingUsername ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={cooldownDays !== null ? undefined : handleEditUsername}
                style={styles.identityValueRow}
                accessibilityRole="button"
                accessibilityLabel="Edit username">
                <Text style={[styles.identityValue, { color: palette.text }]}>
                  {currentUsername ? `@${currentUsername}` : '—'}
                </Text>
                {cooldownDays === null ? (
                  <Text style={[styles.editHint, { color: palette.accent }]}>Edit</Text>
                ) : (
                  <Text style={[styles.editHint, { color: palette.faint }]}>
                    {cooldownDays}d cooldown
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Share my profile (KAN-97) */}
        {currentUsername ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: palette.surface2 }]}
            onPress={handleShareProfile}
            accessibilityRole="button"
            accessibilityLabel="Share my profile">
            <Text style={[styles.btnText, { color: palette.text }]}>Share my profile</Text>
          </TouchableOpacity>
        ) : null}

        {/* ── Points & Achievements (KAN-19) ── */}
        <View style={[styles.section, { backgroundColor: palette.surface2 }]}>
          {/* Header row: total points left, "See all" right */}
          <View style={styles.pointsHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Points</Text>
              <Text style={[styles.sectionSub, { color: palette.muted }]}>
                Earned by completing tasks
              </Text>
            </View>
            <View style={styles.pointsBadge}>
              <Text
                style={[styles.pointsCount, { color: palette.accent }]}
                accessibilityLabel={`${totalPoints} points`}>
                {totalPoints}
              </Text>
              <Text style={[styles.pointsUnit, { color: palette.muted }]}>pts</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.line }]} />

          {/* Achievements row */}
          <View style={styles.achievementsRow}>
            <Text style={[styles.achievementsLabel, { color: palette.muted }]}>
              Achievements
            </Text>
            {/* "See all" — navigates to KAN-33 when built */}
            <Pressable
              onPress={() => navigation.navigate('PointsHistory')}
              accessibilityRole="button"
              accessibilityLabel="See all achievements">
              <Text style={[styles.seeAllLabel, { color: palette.accent }]}>See all</Text>
            </Pressable>
          </View>

          {achievements.length === 0 ? (
            /* Empty state */
            <View style={styles.achievementsEmpty}>
              <Text style={[styles.achievementsEmptyText, { color: palette.faint }]}>
                Complete tasks to earn achievements
              </Text>
            </View>
          ) : (
            /* Earned badge chips — horizontal scroll */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeScroll}>
              {achievements.map(a => (
                <AchievementBadge key={a.id} achievement={a} palette={palette} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Navigation ── */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: palette.surface2 }]}
          onPress={() => navigation.navigate('Categories')}
          accessibilityRole="button"
          accessibilityLabel="Manage categories">
          <GridIcon color={palette.muted} size={20} />
          <Text style={[styles.btnText, { color: palette.text }]}>Manage Categories</Text>
        </TouchableOpacity>

        {/* ── Notification Preferences (KAN-29 / KAN-80 collapsible) ── */}
        <View style={[styles.section, { backgroundColor: palette.surface2 }]}>
          {/* Tappable header — toggles expand/collapse */}
          <Pressable
            onPress={togglePrefs}
            style={styles.prefHeaderRow}
            accessibilityRole="button"
            accessibilityLabel={prefsExpanded ? 'Collapse notification preferences' : 'Expand notification preferences'}
            accessibilityState={{ expanded: prefsExpanded }}>
            <View style={styles.prefHeaderText}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Notification Preferences
              </Text>
              <Text style={[styles.sectionSub, { color: palette.muted, marginBottom: 0 }]}>
                Alert radius per location type
              </Text>
            </View>
            <View style={styles.prefHeaderRight}>
              {!prefsExpanded && hiddenCount > 0 && (
                <Text style={[styles.moreLabel, { color: palette.muted }]}>
                  {hiddenCount} items
                </Text>
              )}
              {/* Rotate 90° = chevron-down (collapsed); 270° = chevron-up (expanded) */}
              <View style={{ transform: [{ rotate: prefsExpanded ? '270deg' : '90deg' }] }}>
                <ChevronRightIcon color={palette.muted} size={16} />
              </View>
            </View>
          </Pressable>

          {visiblePoiRows.map(({ type, label }, idx) => {
            const r     = poiRadii[type] ?? DEFAULT_RADII[type] ?? DEFAULT_CUSTOM_RADIUS;
            const atMin = r <= MIN_RADIUS;
            const atMax = r >= MAX_RADIUS;

            return (
              <View key={type}>
                {idx > 0 && (
                  <View style={[styles.divider, { backgroundColor: palette.line }]} />
                )}
                <View style={styles.poiRow} accessibilityLabel={`${label} notification radius`}>
                  <View style={[styles.poiIconTile, { backgroundColor: palette.surface2 }]}>
                    <PoiIcon type={type} color={palette.muted} size={20} />
                  </View>
                  <Text style={[styles.poiLabel, { color: palette.text }]}>{label}</Text>

                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepBtn, { borderColor: palette.line }, atMin && styles.stepBtnDisabled]}
                      onPress={() => handleRadiusChange(type, -STEP)}
                      disabled={atMin}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${label} radius`}>
                      <Text style={[styles.stepBtnText, { color: atMin ? palette.faint : palette.text }]}>−</Text>
                    </TouchableOpacity>

                    <Text style={[styles.radiusLabel, { color: palette.text }]} accessibilityLabel={`${r} metres`}>
                      {r} m
                    </Text>

                    <TouchableOpacity
                      style={[styles.stepBtn, { borderColor: palette.line }, atMax && styles.stepBtnDisabled]}
                      onPress={() => handleRadiusChange(type, +STEP)}
                      disabled={atMax}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${label} radius`}>
                      <Text style={[styles.stepBtnText, { color: atMax ? palette.faint : palette.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Import tasks (KAN-83) ── */}
        {uid ? <ImportTasksSection uid={uid} /> : null}

        {/* ── Battery (KAN-52) ── */}
        <View style={[styles.section, { backgroundColor: palette.surface2 }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Battery</Text>
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

        {/* ── Sign out (KAN-20) ── */}
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
  root:   { flex: 1 },

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
  scroll: { flex: 1 },
  content: {
    gap:               16,
    paddingHorizontal: spacing.page,
    paddingTop:        24,
  },

  // ── Avatar section ──
  avatarSection: {
    alignItems:   'center',
    gap:          10,
    marginBottom: 4,
  },
  addPhotoLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── Identity card ──
  section: {
    borderRadius:      radii.card,
    paddingHorizontal: spacing.page,
    paddingTop:        16,
    paddingBottom:     16,
  },
  identityRow: {
    paddingVertical: 12,
    gap:              6,
  },
  identityLabel: {
    fontSize:   12,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
    letterSpacing: 0.3,
  },
  identityValueRow: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'space-between',
  },
  identityValue: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    flex: 1,
  },
  editHint: {
    fontSize:   13,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },
  identityDivider: {
    height: StyleSheet.hairlineWidth,
  },

  // Name / Username edit
  nameEditWrap: {
    gap: 8,
  },
  usernameInputRow: {
    flexDirection:   'row',
    alignItems:      'center',
  },
  usernamePrefix: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    marginRight: 2,
  },
  usernameHint: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
  nameInput: {
    fontSize:          15,
    fontFamily:        'Geist-Regular',
    paddingVertical:   4,
    borderBottomWidth: 1,
  },
  nameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  nameActionLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },

  // ── Generic button row ──
  btn: {
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

  // ── Notification preferences ──
  // ── Notification prefs header (KAN-80) ──
  prefHeaderRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  prefHeaderText: {
    flex: 1,
  },
  prefHeaderRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  moreLabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
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
  divider: {
    height:         StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  poiRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 10,
  },
  poiIconTile: {
    width:          36,
    height:         36,
    borderRadius:   radii.listIcon,
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
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 10,
    gap:             12,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 14, fontFamily: 'Geist-Regular' },
  toggleSub:   { fontSize: 12, fontFamily: 'Geist-Regular' },

  // ── Stepper ──
  stepper: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  stepBtn: {
    width:          32,
    height:         32,
    borderRadius:   8,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnText: {
    fontSize:   18,
    fontWeight: '400',
    lineHeight: 22,
  },
  radiusLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
    minWidth:   52,
    textAlign:  'center',
  },

  // ── Points & Achievements (KAN-19) ──
  pointsHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   12,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           3,
  },
  pointsCount: {
    fontSize:    32,
    fontWeight:  '600',
    fontFamily:  'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
    lineHeight:  36,
  },
  pointsUnit: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  achievementsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  achievementsLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  seeAllLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  achievementsEmpty: {
    paddingVertical: 12,
    alignItems:      'center',
  },
  achievementsEmptyText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },
  badgeScroll: {
    gap:           8,
    paddingBottom: 8,
  },
  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                6,
    paddingHorizontal: 12,
    paddingVertical:    8,
    borderRadius:      9999,
    borderWidth:       1,
  },
  badgeIcon: {
    fontSize:   14,
    lineHeight: 18,
  },
  badgeLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
});
