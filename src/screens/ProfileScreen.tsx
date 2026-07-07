/**
 * ProfileScreen — KAN-112 / KAN-137
 *
 * Sections:
 *   1. Identity card — avatar (60px, initial letter, camera badge), name/username/email, edit
 *   2. Share my profile row → Share sheet (KAN-115)
 *   3. Points hero card — TierMedal(92px) + lifetime total + streak chip (KAN-137)
 *   4. Achievements card — horizontal medal strip, "See all" → KAN-114
 *   5. Settings entry row → KAN-113
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
  BuildingIcon,
} from '../components/AppIcon';
import Avatar from '../components/Avatar';
import LoadingDots from '../components/LoadingDots';
import { useMallSnapshotToggle } from '../hooks/useMallSnapshotToggle';
import {
  getUserPointsSummary,
  updateDisplayName,
  getUser,
  updateUsername,
  checkUsernameAvailable,
  validateUsername,
  USERNAME_COOLDOWN_DAYS,
} from '../services/firestore';
import type { AchievementsMap } from '../types';
import { buildAchievementCatalogue } from '../components/AchievementTile';
import { deriveTierStanding } from '../constants/tiers';
import TierMedal from '../components/TierMedal';
import ShareProfileSheet from '../components/ShareProfileSheet';
import { COPY } from '../constants/copy';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();
  // Read live inside the component (KAN-252) — COPY is language-dynamic, a
  // module-scope read would freeze this list in whatever language was active
  // on first import.
  const V1_ACHIEVEMENTS = buildAchievementCatalogue();

  const currentUser  = getAuth().currentUser;
  const uid          = currentUser?.uid;
  const userPhotoURL = currentUser?.photoURL ?? null;

  // ── Mall snapshot toggle (KAN-237) ────────────────────────────────────────
  const { enabled: mallSnapshotEnabled, loading: mallSnapshotLoading, toggle: toggleMallSnapshot } = useMallSnapshotToggle();

  // ── Live data ──────────────────────────────────────────────────────────────
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [achievements,  setAchievements]  = useState<AchievementsMap>({});

  // One-shot fetch, re-run on every focus so returning from Today after
  // earning points/achievements shows current data (KAN-218).
  useFocusEffect(useCallback(() => {
    if (!uid) { return; }
    getUserPointsSummary(uid).then(({ totalPoints: tp, currentStreak: cs, achievements: ach }) => {
      setTotalPoints(tp);
      setCurrentStreak(cs);
      setAchievements(ach);
    }).catch(err => console.warn('[ProfileScreen] points summary', err));
  }, [uid]));

  // ── Username ───────────────────────────────────────────────────────────────
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!uid) { return; }
    getUser(uid).then(u => setCurrentUsername(u?.username));
  }, [uid]);

  // ── Share sheet ───────────────────────────────────────────────────────────
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  // ── Inline edit ───────────────────────────────────────────────────────────
  const [editOpen,        setEditOpen]        = useState(false);
  const [editingField,    setEditingField]    = useState<'name' | 'username' | null>(null);

  // Name edit
  const [nameValue,    setNameValue]    = useState(currentUser?.displayName ?? '');
  const [savingName,   setSavingName]   = useState(false);
  const nameInputRef     = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);

  // Username edit
  const [usernameValue,   setUsernameValue]   = useState('');
  const [usernameError,   setUsernameError]   = useState('');
  const [savingUsername,  setSavingUsername]  = useState(false);
  const [cooldownDays,    setCooldownDays]    = useState<number | null>(null);

  const openEditField = (
    field: 'name' | 'username',
    ref: React.RefObject<TextInput | null>,
  ) => {
    setNameValue(currentUser?.displayName ?? '');
    setUsernameValue(currentUsername ?? '');
    setUsernameError('');
    setEditOpen(true);
    setEditingField(field);
    // Wait for all in-flight animations (e.g. share sheet close) to finish
    // before focusing — avoids focus racing with a still-visible modal.
    InteractionManager.runAfterInteractions(() => {
      ref.current?.focus();
    });
  };

  const openEdit         = () => openEditField('name',     nameInputRef);
  const openEditUsername = () => openEditField('username', usernameInputRef);

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
    if (fmtErr) { setUsernameError(fmtErr); return; }
    if (trimmed === currentUsername) { return; }
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
  const { nextTier, maxed, bandPct, toGo } = deriveTierStanding(totalPoints);

  // KAN-129: achievements is now AchievementsMap — keyed by AchievementType.
  const earnedCount = V1_ACHIEVEMENTS.filter(
    d => (achievements[d.type as keyof typeof achievements]?.earnCount ?? 0) > 0,
  ).length;

  // Multi-earn counts per type (for the ×N badge)
  const earnedCountMap: Record<string, number> = {};
  for (const [type, entry] of Object.entries(achievements)) {
    if (entry && entry.earnCount > 0) { earnedCountMap[type] = entry.earnCount; }
  }

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
                    ref={usernameInputRef}
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
                  <Text style={[styles.editFieldHint, { color: palette.danger }]}>{usernameError}</Text>
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
                      // handleSaveUsername calls closeEdit() on success.
                      // On any failure it sets usernameError and returns early,
                      // keeping the panel open so the user can correct input.
                      await handleSaveUsername();
                    } else {
                      closeEdit();
                    }
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
          onPress={() => setShareSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Share my profile">
          <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
            <ShareIcon color={palette.muted} size={20} />
          </View>
          <Text style={[styles.shareRowLabel, { color: palette.text }]}>Share my profile</Text>
          <ChevronRightIcon color={palette.faint} size={18} />
        </Pressable>

        {/* ── 2c. Mall snapshot toggle (KAN-237) ── */}
        <View style={[styles.shareRow, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
            <BuildingIcon color={palette.muted} size={20} />
          </View>
          <View style={styles.mallRowTextCol}>
            <Text style={[styles.shareRowLabel, { color: palette.text }]}>{COPY.mallSnapshot.rowLabel}</Text>
            <Text style={[styles.mallRowSublabel, { color: palette.muted }]}>{COPY.mallSnapshot.rowSublabel}</Text>
          </View>
          {mallSnapshotLoading ? (
            <View style={styles.mallRowLoading} importantForAccessibility="no-hide-descendants">
              <LoadingDots color={palette.accent} size={6} />
            </View>
          ) : (
            <Switch
              value={mallSnapshotEnabled}
              onValueChange={toggleMallSnapshot}
              trackColor={{ false: palette.surface2, true: palette.accent }}
              thumbColor={palette.bg}
              accessibilityLabel={COPY.mallSnapshot.rowLabel}
            />
          )}
        </View>
        {mallSnapshotLoading ? (
          <Text style={[styles.mallDownloadingLabel, { color: palette.muted }]}>
            {COPY.mallSnapshot.downloadingLabel}
          </Text>
        ) : null}

        {/* ── Section label ── */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>
          POINTS &amp; ACHIEVEMENTS
        </Text>

        {/* ── 3. Points hero card (KAN-137) ── */}
        <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <View style={styles.heroContentRow}>

            {/* Left column */}
            <View style={styles.heroLeft}>
              <Text style={[styles.totalPtsLabel, { color: palette.muted }]}>TOTAL POINTS</Text>
              <Text
                style={[styles.totalPtsNumber, { color: palette.text }]}
                accessibilityLabel={`${totalPoints} points`}>
                {totalPoints}
              </Text>
              <Text style={[styles.toGoCaption, { color: palette.muted }]}>
                {maxed ? (
                  <>{'Top tier · '}<Text style={{ color: nextTier.color, fontWeight: '600', fontFamily: 'Geist-SemiBold' }}>{nextTier.name}</Text></>
                ) : (
                  <><Text style={{ color: nextTier.color, fontWeight: '600', fontFamily: 'Geist-SemiBold', fontVariant: ['tabular-nums'] }}>{toGo} pts</Text>{` to ${nextTier.name}`}</>
                )}
              </Text>

              {currentStreak > 0 ? (
                <View style={[styles.streakChip, { backgroundColor: palette.nearTint, borderColor: palette.nearBorder }]}>
                  <FlameIcon color={palette.nearText} size={16} />
                  <Text style={[styles.streakText, { color: palette.nearText }]}>
                    <Text style={{ fontWeight: '600', fontFamily: 'Geist-SemiBold', fontVariant: ['tabular-nums'] }}>
                      {currentStreak}
                    </Text>
                    {'-day streak'}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Right column — TierMedal */}
            <TierMedal
              tier={nextTier}
              earned={maxed}
              pct={maxed ? null : bandPct}
              size={92}
            />
          </View>
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
              onPress={() => navigation.navigate('Achievements')}
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
              const earned    = (achievements[def.type as keyof typeof achievements]?.earnCount ?? 0) > 0;
              const earnCount = earnedCountMap[def.type] ?? 0;
              return (
                <View key={def.type} style={styles.medalItem}>
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
          onPress={() => navigation.navigate('Settings')}
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

      {/* ── Share profile sheet (KAN-115) ── */}
      <ShareProfileSheet
        visible={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        onSetUsername={openEditUsername}
        displayName={displayName}
        username={currentUsername}
        totalPoints={totalPoints}
        photoURL={userPhotoURL}
      />
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
    width:          44,
    height:         44,
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

  // ── Mall snapshot toggle row (KAN-237) ──
  mallRowTextCol: {
    flex: 1,
    gap:  2,
  },
  mallRowSublabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
  mallRowLoading: {
    width:          51, // matches native Switch footprint so the row doesn't reflow
    alignItems:     'center',
    justifyContent: 'center',
  },
  mallDownloadingLabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    marginTop:  -8,
    marginLeft: 4,
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

  // ── Points hero card (KAN-137) ──
  heroCard: {
    borderRadius: 20,
    padding:      18,
    borderWidth:  1,
  },
  heroContentRow: {
    flexDirection: 'row',
    gap:           16,
    alignItems:    'center',
  },
  heroLeft: {
    flex:     1,
    minWidth: 0,
  },
  totalPtsLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 1.65,
    textTransform: 'uppercase',
  },
  totalPtsNumber: {
    fontSize:      56,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    lineHeight:    56,
    letterSpacing: -2.24,
    fontVariant:   ['tabular-nums'],
    marginTop:     8,
  },
  toGoCaption: {
    fontSize:   12.5,
    fontFamily: 'Geist-Regular',
    marginTop:  8,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            8,
    alignSelf:     'flex-start',
    marginTop:     14,
    paddingTop:    7,
    paddingBottom: 7,
    paddingLeft:   10,
    paddingRight:  12,
    borderRadius:  999,
    borderWidth:   1,
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
