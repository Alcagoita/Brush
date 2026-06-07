/**
 * ProfileScreen — KAN-112
 *
 * Full redesign. Gamification (points + achievements) is the visual centrepiece.
 * Supersedes KAN-18.
 *
 * Sections:
 *   1. Identity card — avatar (60px, initial letter, camera badge), name/username/email, edit
 *   2. Share my profile row → Share sheet (KAN-115)
 *   3. Points hero card — 116px accent ring, next-reward column, streak chip
 *   4. Achievements card — horizontal medal strip, "See all" → KAN-114
 *   5. Settings entry row → KAN-113
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, updateProfile } from '@react-native-firebase/auth/lib/modular';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlameIcon,
  LockIcon,
  MedalIcon,
  PencilIcon,
  SettingsIcon,
  ShareIcon,
  CameraIcon,
} from '../components/AppIcon';
import Avatar from '../components/Avatar';
import {
  subscribeToTotalPoints,
  subscribeToCurrentStreak,
  subscribeToAchievements,
  updateDisplayName,
  getUser,
  updateUsername,
  checkUsernameAvailable,
  validateUsername,
  USERNAME_COOLDOWN_DAYS,
} from '../services/firestore';
import type { Achievement } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// ─── Tier ladder ──────────────────────────────────────────────────────────────

const TIER_LADDER = [
  { name: 'Bronze',   at: 10  },
  { name: 'Silver',   at: 50  },
  { name: 'Gold',     at: 100 },
  { name: 'Platinum', at: 200 },
];

function getNextTier(points: number): { name: string; at: number } {
  return TIER_LADDER.find(t => points < t.at) ?? TIER_LADDER[TIER_LADDER.length - 1];
}

// ─── V1 achievement set (aligns with KAN-114) ─────────────────────────────────

const V1_ACHIEVEMENTS = [
  { id: 'day_complete', label: 'Day complete' },
  { id: 'early_bird',   label: 'Early bird'   },
  { id: 'on_a_roll',    label: 'On a roll'    },
  { id: 'explorer',     label: 'Explorer'     },
  { id: 'centurion',    label: 'Centurion'    },
];

// ─── Points ring ──────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PointsRingProps {
  progress:    number;
  size?:       number;
  strokeWidth?: number;
  accentColor: string;
  trackColor:  string;
}

function PointsRingView({
  progress,
  size        = 116,
  strokeWidth = 11,
  accentColor,
  trackColor,
}: PointsRingProps) {
  const progressSV = useSharedValue(0);
  useEffect(() => {
    progressSV.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 600 });
  }, [progress, progressSV]);

  const r            = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx            = size / 2;

  const arcProps = useAnimatedProps(() => ({
    strokeDasharray:  circumference,
    strokeDashoffset: circumference * (1 - progressSV.value),
  }));

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={cx} cy={cx} r={r}
        strokeWidth={strokeWidth} stroke={trackColor} fill="none"
      />
      <AnimatedCircle
        cx={cx} cy={cx} r={r}
        strokeWidth={strokeWidth} stroke={accentColor} fill="none"
        strokeLinecap="round"
        animatedProps={arcProps}
      />
    </Svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();

  const currentUser  = getAuth().currentUser;
  const uid          = currentUser?.uid;
  const userPhotoURL = currentUser?.photoURL ?? null;

  // ── Live data ──────────────────────────────────────────────────────────────
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [achievements,  setAchievements]  = useState<Achievement[]>([]);

  useEffect(() => {
    if (!uid) { return; }
    const u1 = subscribeToTotalPoints(uid,   setTotalPoints,   err => console.warn('[ProfileScreen] points', err));
    const u2 = subscribeToCurrentStreak(uid, setCurrentStreak, err => console.warn('[ProfileScreen] streak', err));
    const u3 = subscribeToAchievements(uid,  setAchievements,  err => console.warn('[ProfileScreen] achievements', err));
    return () => { u1(); u2(); u3(); };
  }, [uid]);

  // ── Username ───────────────────────────────────────────────────────────────
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!uid) { return; }
    getUser(uid).then(u => setCurrentUsername(u?.username));
  }, [uid]);

  // ── Inline edit ───────────────────────────────────────────────────────────
  const [editOpen,        setEditOpen]        = useState(false);
  const [editingField,    setEditingField]    = useState<'name' | 'username' | null>(null);

  // Name edit
  const [nameValue,    setNameValue]    = useState(currentUser?.displayName ?? '');
  const [savingName,   setSavingName]   = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  // Username edit
  const [usernameValue,   setUsernameValue]   = useState('');
  const [usernameError,   setUsernameError]   = useState('');
  const [savingUsername,  setSavingUsername]  = useState(false);
  const [cooldownDays,    setCooldownDays]    = useState<number | null>(null);

  const openEdit = () => {
    setNameValue(currentUser?.displayName ?? '');
    setUsernameValue(currentUsername ?? '');
    setUsernameError('');
    setEditOpen(true);
    setEditingField('name');
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingField(null);
  };

  const handleSaveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || !uid || !currentUser) { return; }
    setSavingName(true);
    try {
      await updateProfile(currentUser, { displayName: trimmed });
      await updateDisplayName(uid, trimmed);
    } catch (err) {
      console.warn('[ProfileScreen] updateDisplayName', err);
    } finally {
      setSavingName(false);
    }
  }, [nameValue, uid, currentUser]);

  const handleUsernameChange = (raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsernameValue(v);
    setUsernameError(validateUsername(v) ?? '');
  };

  const handleSaveUsername = async () => {
    if (!uid) { return; }
    const trimmed = usernameValue.trim();
    const fmtErr  = validateUsername(trimmed);
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
      closeEdit();
      setCooldownDays(USERNAME_COOLDOWN_DAYS);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('username_cooldown:')) {
        const days = parseInt(msg.split(':')[1], 10);
        setCooldownDays(days);
        setUsernameError(`You can change your username in ${days} day${days !== 1 ? 's' : ''}.`);
      } else {
        setUsernameError('Failed to save. Please try again.');
      }
    } finally {
      setSavingUsername(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const nextTier    = getNextTier(totalPoints);
  const ringProgress = nextTier.at > 0 ? Math.min(totalPoints / nextTier.at, 1) : 1;
  const ptsToGo     = Math.max(nextTier.at - totalPoints, 0);

  const earnedTypeSet = new Set<string>(achievements.map(a => a.type));
  const earnedCount   = V1_ACHIEVEMENTS.filter(d => earnedTypeSet.has(d.id)).length;

  // Multiple-earned counts (for future multi-earn badges)
  const earnedCountMap = achievements.reduce<Record<string, number>>((acc, a) => {
    const key = a.type as string;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // ── Render ─────────────────────────────────────────────────────────────────

  const displayName = currentUser?.displayName ?? '';

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
        <Text style={[styles.topBarTitle, { color: palette.text }]}>Profile</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── 1. Identity card ── */}
        <View style={[styles.identityCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <View style={styles.identityRow}>
            {/* Avatar + camera badge */}
            <View style={styles.avatarWrap}>
              <Avatar
                photoURL={userPhotoURL}
                displayName={displayName}
                size={60}
                accessibilityLabel="Profile photo"
              />
              {/* Camera badge — visible, press is no-op for v1 */}
              <View style={[styles.cameraBadge, { backgroundColor: palette.surface2, borderColor: palette.bg }]}>
                <CameraIcon color={palette.muted} size={11} />
              </View>
            </View>

            {/* Text block */}
            <View style={styles.identityTextBlock}>
              {!editOpen ? (
                <>
                  <Text style={[styles.identityName, { color: palette.text }]} numberOfLines={1}>
                    {displayName || '—'}
                  </Text>
                  {currentUsername ? (
                    <Text style={[styles.identityUsername, { color: palette.accent }]} numberOfLines={1}>
                      @{currentUsername}
                    </Text>
                  ) : null}
                  <Text style={[styles.identityEmail, { color: palette.muted }]} numberOfLines={1}>
                    {currentUser?.email ?? ''}
                  </Text>
                </>
              ) : (
                <Text style={[styles.identityEditHint, { color: palette.muted }]}>
                  Editing profile
                </Text>
              )}
            </View>

            {/* Pencil edit button */}
            <Pressable
              style={[styles.editBtn, { backgroundColor: palette.surface2, borderColor: palette.line }]}
              onPress={editOpen ? closeEdit : openEdit}
              accessibilityRole="button"
              accessibilityLabel={editOpen ? 'Close edit' : 'Edit profile'}>
              <PencilIcon color={editOpen ? palette.accent : palette.muted} size={18} />
            </Pressable>
          </View>

          {/* Inline edit panel */}
          {editOpen ? (
            <View style={[styles.editPanel, { borderTopColor: palette.line }]}>
              {/* Name field */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: palette.muted }]}>Name</Text>
                <TextInput
                  ref={nameInputRef}
                  style={[styles.editFieldInput, { color: palette.text, borderBottomColor: palette.line }]}
                  value={nameValue}
                  onChangeText={setNameValue}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onFocus={() => setEditingField('name')}
                  accessibilityLabel="Edit name"
                  maxLength={80}
                />
              </View>

              {/* Username field */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: palette.muted }]}>Username</Text>
                <View style={styles.editFieldRow}>
                  <Text style={[styles.usernameAt, { color: palette.faint }]}>@</Text>
                  <TextInput
                    style={[styles.editFieldInput, { color: palette.text, borderBottomColor: palette.line, flex: 1 }]}
                    value={usernameValue}
                    onChangeText={handleUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    editable={cooldownDays === null}
                    onFocus={() => setEditingField('username')}
                    accessibilityLabel="Edit username"
                    maxLength={20}
                  />
                  {savingUsername ? <ActivityIndicator size="small" color={palette.muted} style={{ marginLeft: 6 }} /> : null}
                </View>
                {cooldownDays !== null ? (
                  <Text style={[styles.editFieldHint, { color: palette.faint }]}>
                    {cooldownDays}d cooldown remaining
                  </Text>
                ) : usernameError ? (
                  <Text style={[styles.editFieldHint, { color: '#e05252' }]}>{usernameError}</Text>
                ) : null}
              </View>

              {/* Save / Cancel row */}
              <View style={styles.editActions}>
                <Pressable
                  onPress={closeEdit}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel">
                  <Text style={[styles.editActionLabel, { color: palette.muted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    await handleSaveName();
                    if (usernameValue !== currentUsername && !usernameError) {
                      await handleSaveUsername();
                    }
                    closeEdit();
                  }}
                  disabled={savingName || savingUsername || !nameValue.trim()}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Save profile">
                  <Text style={[styles.editActionLabel, {
                    color: (savingName || savingUsername || !nameValue.trim())
                      ? palette.faint : palette.accent,
                  }]}>
                    {savingName || savingUsername ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── 2. Share my profile row ── */}
        <Pressable
          style={[styles.shareRow, { backgroundColor: palette.surface, borderColor: palette.line }]}
          onPress={() => Alert.alert('Coming soon', 'Share sheet will be available in a future update.')}
          accessibilityRole="button"
          accessibilityLabel="Share my profile">
          <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
            <ShareIcon color={palette.muted} size={20} />
          </View>
          <Text style={[styles.shareRowLabel, { color: palette.text }]}>Share my profile</Text>
          <ChevronRightIcon color={palette.faint} size={18} />
        </Pressable>

        {/* ── Section label ── */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>
          POINTS &amp; ACHIEVEMENTS
        </Text>

        {/* ── 3. Points hero card ── */}
        <View style={[styles.heroCard, { backgroundColor: palette.surface, overflow: 'hidden' }]}>
          {/* Decorative halo */}
          <View
            style={[styles.heroHalo, { backgroundColor: palette.nearTint }]}
            pointerEvents="none"
          />

          {/* Content row */}
          <View style={styles.heroContentRow}>
            {/* Ring with centered label */}
            <View style={styles.ringWrap}>
              <PointsRingView
                progress={ringProgress}
                size={116}
                strokeWidth={11}
                accentColor={palette.accent}
                trackColor={palette.ringTrack}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <Text
                  style={[styles.ringPoints, { color: palette.accent }]}
                  accessibilityLabel={`${totalPoints} points`}>
                  {totalPoints}
                </Text>
                <Text style={[styles.ringPtsLabel, { color: palette.muted }]}>PTS</Text>
              </View>
            </View>

            {/* Reward column */}
            <View style={styles.rewardCol}>
              <Text style={[styles.nextRewardLabel, { color: palette.muted }]}>NEXT REWARD</Text>

              <View style={styles.rewardRow}>
                <View style={[styles.medalCircleSmall, { backgroundColor: palette.nearTint2, borderColor: palette.nearBorder }]}>
                  <LockIcon color={palette.faint} size={16} />
                </View>
                <Text style={[styles.rewardName, { color: palette.text }]}>
                  {nextTier.name} badge
                </Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: palette.ringTrack }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: palette.accent, width: `${Math.round(ringProgress * 100)}%` as any },
                  ]}
                />
              </View>

              <Text style={[styles.rewardCaption, { color: palette.muted }]}>
                <Text style={{ color: palette.text, fontFamily: 'Geist-SemiBold', fontWeight: '600' }}>
                  {ptsToGo} pts
                </Text>
                {' '}to go · earned by brushing away tasks
              </Text>
            </View>
          </View>

          {/* Streak chip */}
          {currentStreak > 0 ? (
            <View style={[styles.streakChip, { backgroundColor: palette.nearTint, borderColor: palette.nearBorder }]}>
              <FlameIcon color={palette.nearText} size={15} />
              <Text style={[styles.streakText, { color: palette.nearText }]}>
                <Text style={{ fontWeight: '600', fontFamily: 'Geist-SemiBold' }}>
                  {currentStreak}
                </Text>
                {'-day streak'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── 4. Achievements card ── */}
        <View style={[styles.achievementsCard, { backgroundColor: palette.surface }]}>
          {/* Header */}
          <View style={styles.achievementsHeader}>
            <Text style={[styles.achievementsTitle, { color: palette.text }]}>
              Achievements
              <Text style={{ color: palette.muted }}>{` · ${earnedCount}/${V1_ACHIEVEMENTS.length}`}</Text>
            </Text>
            <Pressable
              onPress={() => Alert.alert('Coming soon', 'Achievements screen will be available in a future update.')}
              accessibilityRole="button"
              accessibilityLabel="See all achievements">
              <Text style={[styles.seeAllLabel, { color: palette.accent }]}>See all ›</Text>
            </Pressable>
          </View>

          {/* Medal strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.medalStrip}>
            {V1_ACHIEVEMENTS.map(def => {
              const earned    = earnedTypeSet.has(def.id);
              const earnCount = earnedCountMap[def.id] ?? 0;
              return (
                <View key={def.id} style={styles.medalItem}>
                  <View style={styles.medalCircleWrap}>
                    {/* Medal circle */}
                    <View style={[
                      styles.medalCircle,
                      earned
                        ? { backgroundColor: palette.nearTint2, borderColor: palette.nearBorder }
                        : { backgroundColor: 'transparent', borderColor: palette.line },
                    ]}>
                      {earned
                        ? <MedalIcon color={palette.nearText} size={24} />
                        : <LockIcon  color={palette.faint}    size={20} />
                      }
                    </View>
                    {/* Count badge for multi-earned */}
                    {earnCount > 1 ? (
                      <View style={[styles.countBadge, { backgroundColor: palette.accent, borderColor: palette.surface }]}>
                        <Text style={styles.countBadgeText}>×{earnCount}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[styles.medalLabel, { color: earned ? palette.text : palette.faint }]}
                    numberOfLines={1}>
                    {def.label}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 5. Settings entry row ── */}
        <Pressable
          style={[styles.settingsRow, { borderColor: palette.line }]}
          onPress={() => Alert.alert('Coming soon', 'Settings screen will be available in a future update.')}
          accessibilityRole="button"
          accessibilityLabel="Settings">
          <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
            <SettingsIcon color={palette.muted} size={20} />
          </View>
          <View style={styles.settingsTextBlock}>
            <Text style={[styles.settingsTitle, { color: palette.text }]}>Settings</Text>
            <Text style={[styles.settingsSub, { color: palette.muted }]} numberOfLines={1}>
              App &amp; account
            </Text>
          </View>
          <ChevronRightIcon color={palette.faint} size={18} />
        </Pressable>

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
    width:          40,
    height:         40,
    alignItems:     'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Scroll ──
  scroll:  { flex: 1 },
  content: {
    gap:               12,
    paddingHorizontal: spacing.page,
    paddingTop:        20,
  },

  // ── Identity card ──
  identityCard: {
    borderRadius:  18,
    borderWidth:   StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical:   14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           16,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position:       'absolute',
    bottom:         0,
    right:          0,
    width:          22,
    height:         22,
    borderRadius:   11,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  identityTextBlock: {
    flex:     1,
    minWidth: 0,
    gap:      2,
  },
  identityName: {
    fontSize:      19,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: -0.4,
  },
  identityUsername: {
    fontSize:   13.5,
    fontFamily: 'Geist-Regular',
  },
  identityEmail: {
    fontSize:   12.5,
    fontFamily: 'Geist-Regular',
  },
  identityEditHint: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },
  editBtn: {
    width:        38,
    height:       38,
    borderRadius: 11,
    borderWidth:  StyleSheet.hairlineWidth,
    alignItems:   'center',
    justifyContent: 'center',
    flexShrink:   0,
  },

  // ── Edit panel ──
  editPanel: {
    marginTop:      14,
    paddingTop:     14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap:            14,
  },
  editField: {
    gap: 6,
  },
  editFieldLabel: {
    fontSize:   12,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
    letterSpacing: 0.2,
  },
  editFieldRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  usernameAt: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    marginRight: 2,
  },
  editFieldInput: {
    fontSize:          15,
    fontFamily:        'Geist-Regular',
    paddingVertical:   4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editFieldHint: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    marginTop:  4,
  },
  editActions: {
    flexDirection:  'row',
    justifyContent: 'flex-end',
    gap:            20,
    paddingTop:     2,
  },
  editActionLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },

  // ── Share row ──
  shareRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               14,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      16,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  shareRowLabel: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },

  // ── Icon tile (shared) ──
  iconTile: {
    width:          38,
    height:         38,
    borderRadius:   radii.listIcon,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.8,
    marginTop:     14,
    marginBottom:  -4,
  },

  // ── Points hero card ──
  heroCard: {
    borderRadius: 20,
    padding:      18,
  },
  heroHalo: {
    position:      'absolute',
    width:         160,
    height:        160,
    borderRadius:  80,
    top:           -48,
    right:         -48,
  },
  heroContentRow: {
    flexDirection: 'row',
    gap:           18,
    alignItems:    'center',
  },
  ringWrap: {
    width:          116,
    height:         116,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  ringCenter: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  ringPoints: {
    fontSize:    42,
    fontWeight:  '500',
    fontFamily:  'Geist-Medium',
    fontVariant: ['tabular-nums'],
    lineHeight:  44,
  },
  ringPtsLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.8,
  },
  rewardCol: {
    flex: 1,
    gap:  8,
  },
  nextRewardLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.7,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  medalCircleSmall: {
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  rewardName: {
    fontSize:   18,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  progressTrack: {
    height:       6,
    borderRadius: 999,
    overflow:     'hidden',
  },
  progressFill: {
    height:       6,
    borderRadius: 999,
  },
  rewardCaption: {
    fontSize:   12.5,
    fontFamily: 'Geist-Regular',
    lineHeight: 17,
  },
  streakChip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             5,
    alignSelf:      'flex-start',
    marginTop:      16,
    paddingTop:     7,
    paddingBottom:  7,
    paddingLeft:    10,
    paddingRight:   12,
    borderRadius:   999,
    borderWidth:    1,
  },
  streakText: {
    fontSize:   13,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },

  // ── Achievements card ──
  achievementsCard: {
    borderRadius:   20,
    paddingTop:     16,
    paddingBottom:  6,
  },
  achievementsHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 18,
    paddingBottom:     14,
  },
  achievementsTitle: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  seeAllLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  medalStrip: {
    gap:         18,
    paddingLeft: 18,
    paddingRight: 18,
    paddingBottom: 12,
  },
  medalItem: {
    width:      60,
    alignItems: 'center',
    gap:        6,
  },
  medalCircleWrap: {
    position: 'relative',
  },
  medalCircle: {
    width:          52,
    height:         52,
    borderRadius:   26,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  countBadge: {
    position:      'absolute',
    top:           -2,
    right:         -2,
    minWidth:      18,
    height:        18,
    borderRadius:  9,
    borderWidth:   2,
    alignItems:    'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countBadgeText: {
    fontSize:   9,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    color:      '#ffffff',
  },
  medalLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    minHeight:  32,
  },

  // ── Settings entry row ──
  settingsRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               14,
    paddingHorizontal: 16,
    paddingVertical:   15,
    borderRadius:      16,
    borderWidth:       StyleSheet.hairlineWidth,
    marginTop:         14,
  },
  settingsTextBlock: {
    flex: 1,
    gap:  2,
  },
  settingsTitle: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  settingsSub: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
});
