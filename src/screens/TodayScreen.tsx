/**
 * TodayScreen — KAN-45
 *
 * Pure rendering component (KAN-59). All data state, Firestore subscriptions,
 * proximity engine, and battery monitoring are owned by useTodayScreen.
 * This file contains only:
 *   - Auth / display-name derivation
 *   - Reanimated scroll/animation logic
 *   - JSX render
 *
 * Layout (top → bottom):
 *   1. Sticky Header (zIndex 3)           — avatar, greeting, bell
 *   2. Collapsible Ring Section (zIndex 2) — scroll-driven A→B collapse
 *   3. Nearby Card                        — KAN-46
 *   4. Task list                          — KAN-15
 *
 * Scroll collapse:  k = clamp(scrollY / 170, 0, 1)
 *
 * k=0 (rest)        k=1 (collapsed)
 * diameter  246     112
 * stroke     14      10
 * left       (screen–246)/2    22
 * height    320     150
 * caption   opaque  transparent   (fades over k 0→0.625)
 * counter   hidden   visible       (fades over k 0.45→0.91)
 *
 * Animation: react-native-reanimated — all interpolations run on the UI thread.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { PlusIcon } from '../components/AppIcon';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme/tokens';
import Header from '../components/Header';
import ProgressRing from '../components/ProgressRing';
import TaskRow from '../components/TaskRow';
import NearbyCard from '../components/NearbyCard';
import NewTaskSheet, { NewTaskSheetHandle } from '../components/NewTaskSheet';
import StoreTuningPromptSheet from '../components/StoreTuningPromptSheet';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTodayScreen } from '../hooks/useTodayScreen';
import { subscribeToIncomingSharedTasks } from '../services/sharing';
import { subscribeToCurrentStreak } from '../services/firestore';
import { COPY } from '../constants/copy';

// ─── Layout constants ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const SCROLL_RANGE = 170;

const RING_REST      = 246;
const RING_COLLAPSED = 112;
const STROKE_REST      = 14;
const STROKE_COLLAPSED = 10;
const RING_LEFT_REST      = (SCREEN_W - RING_REST) / 2;
const RING_LEFT_COLLAPSED = 22;

const SECTION_H_REST      = 320;
const SECTION_H_COLLAPSED = 150;
const RING_TOP_REST      = (SECTION_H_REST      - RING_REST)      / 2;
const RING_TOP_COLLAPSED = (SECTION_H_COLLAPSED - RING_COLLAPSED) / 2;

// Caption fades over k 0→0.625 (scrollY 0→106)
const CAPTION_FADE_END = SCROLL_RANGE * 0.625;
// Counter fades in over k 0.45→0.91 (scrollY 76.5→154.7)
const COUNTER_FADE_START = SCROLL_RANGE * 0.45;
const COUNTER_FADE_END   = SCROLL_RANGE * 0.91;

// ─── Date helpers ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ index, faint }: { index: number; faint: string }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700 + index * 50 }),
        withTiming(0.3, { duration: 700 + index * 50 }),
      ),
      -1,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.skeletonRow, style]}>
      <View style={[styles.skeletonDot,  { backgroundColor: faint }]} />
      <View style={[styles.skeletonLine, { backgroundColor: faint }]} />
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList, 'Today'>;

export default function TodayScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();

  // ── Auth / display info ──────────────────────────────────────────────────────
  const user        = getAuth().currentUser;
  const uid         = user?.uid;
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';

  // ── ViewModel hook (KAN-59) ──────────────────────────────────────────────────
  const {
    tasksState,
    retryKey: _retryKey,   // consumed by the hook; exposed only for error UI
    setRetryKey,
    nearbyPoiType,
    nearbyPlace,
    poiPlaces,
    trackingPaused,
    storeTuningActive,
    showStoreTuningPrompt,
    onStoreTuningTurnOn,
    onStoreTuningNotNow,
    sheetVisible,
    setSheetVisible,
    customCategories,
    tasks,
    effectiveTasks,
    totalTasks,
    doneTasks,
    progress,
    nearbyCount,
    handleToggle,
  } = useTodayScreen(uid);

  // ── Shared-task inbox count (KAN-87) — drives bell badge ────────────────────
  const [inboxCount, setInboxCount] = useState(0);
  useEffect(() => {
    if (!uid) { return; }
    return subscribeToIncomingSharedTasks(
      uid,
      tasks => setInboxCount(tasks.length),
      err => console.warn('[TodayScreen] inbox subscription error', err),
    );
  }, [uid]);

  // ── Current streak (KAN-134) — drives streak chip in header ──────────────────
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!uid) { return; }
    return subscribeToCurrentStreak(
      uid,
      s => setStreak(s),
      err => console.warn('[TodayScreen] streak subscription error', err),
    );
  }, [uid]);

  // ── Sheet ref + auto-close on new task ────────────────────────────────────────
  // Kept in the screen because sheetRef is a UI element ref, not data state.
  const sheetRef        = useRef<NewTaskSheetHandle>(null);
  const prevTasksLenRef = useRef(0);

  useEffect(() => {
    if (sheetVisible && tasks.length > prevTasksLenRef.current) {
      sheetRef.current?.hide();
    }
    prevTasksLenRef.current = tasks.length;
  }, [tasks, sheetVisible]);

  // ── Date display ──────────────────────────────────────────────────────────────
  const now     = new Date();
  const weekday = WEEKDAYS[now.getDay()];
  const month   = MONTHS[now.getMonth()];
  const day     = now.getDate();

  // ── Reanimated scroll value ───────────────────────────────────────────────────
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // ── Derived values (UI thread) ────────────────────────────────────────────────
  const ringSize: SharedValue<number> = useDerivedValue(() =>
    interpolate(scrollY.value, [0, SCROLL_RANGE], [RING_REST, RING_COLLAPSED], Extrapolation.CLAMP),
  );
  const ringStroke: SharedValue<number> = useDerivedValue(() =>
    interpolate(scrollY.value, [0, SCROLL_RANGE], [STROKE_REST, STROKE_COLLAPSED], Extrapolation.CLAMP),
  );

  // ── Progress counters ─────────────────────────────────────────────────────────
  const pct       = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const remaining = totalTasks - doneTasks;

  // ── Animated styles (UI thread) ───────────────────────────────────────────────
  const sectionStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, SCROLL_RANGE], [SECTION_H_REST, SECTION_H_COLLAPSED], Extrapolation.CLAMP),
  }));

  const ringWrapStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: interpolate(scrollY.value, [0, SCROLL_RANGE], [RING_LEFT_REST, RING_LEFT_COLLAPSED], Extrapolation.CLAMP),
    top:  interpolate(scrollY.value, [0, SCROLL_RANGE], [RING_TOP_REST,  RING_TOP_COLLAPSED],  Extrapolation.CLAMP),
  }));

  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, CAPTION_FADE_END], [1, 0], Extrapolation.CLAMP),
  }));

  // Both the compact ring caption and the progress panel fade in together.
  const counterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COUNTER_FADE_START, COUNTER_FADE_END], [0, 1], Extrapolation.CLAMP),
  }));

  // ── Haptic feedback at full collapse ──────────────────────────────────────────
  const hapticFired = useSharedValue(false);
  useAnimatedReaction(
    () => scrollY.value >= SCROLL_RANGE,
    (isCollapsed) => {
      if (isCollapsed && !hapticFired.value) {
        hapticFired.value = true;
        runOnJS(Vibration.vibrate)(Platform.OS === 'android' ? 10 : 1);
      }
      if (!isCollapsed) {
        hapticFired.value = false;
      }
    },
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>

      {/* ── Sticky header (zIndex 3) ── */}
      <View style={styles.stickyHeader}>
        <Header
          displayName={displayName}
          photoURL={user?.photoURL}
          hasUnread={inboxCount > 0}
          socialBadge={inboxCount}
          streak={streak}
          onAvatarPress={() => navigation.navigate('Profile')}
          onBellPress={() => navigation.navigate('SharedTaskInbox')}
          onPeoplePress={() => navigation.navigate('SocialHub')}
          onAchievementsPress={() => navigation.navigate('Achievements')}
        />
      </View>

      {/* ── Scroll area — ring section overlaid on ScrollView ── */}
      <View style={styles.scrollArea}>

        {/*
          The ScrollView fills the entire scrollArea (absoluteFill).
          paddingTop = SECTION_H_REST means content always starts 320px down,
          directly below where the ring section sits at rest. As the ring
          section collapses by SCROLL_RANGE (170px), content scrolls up the
          same distance — they stay in perfect alignment throughout.
          Content height is now STABLE (ring section is outside ScrollView),
          so scrollY can always reach SCROLL_RANGE.
        */}
        <Animated.ScrollView
          style={StyleSheet.absoluteFill}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: palette.bg }]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={1}
          onScroll={scrollHandler}>

          {/* ── Nearby card (KAN-46 / KAN-52 / KAN-74) ── */}
          <NearbyCard
            tasks={effectiveTasks}
            nearbyPoiType={nearbyPoiType}
            nearbyPlace={nearbyPlace}
            poiPlaces={poiPlaces}
            trackingPaused={trackingPaused}
            storeTuningActive={storeTuningActive}
          />

          {/* ── Task list ── */}
          <View style={[styles.section, { borderTopColor: palette.line }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.muted }]}>
                {`TODAY · `}
                <Text style={[styles.sectionTitleCount, { color: palette.text }]}
                  accessibilityLabel={COPY.progress.ringA11y(doneTasks, totalTasks)}>
                  {`${doneTasks}/${totalTasks}`}
                </Text>
              </Text>
              {remaining > 0 && (
                <Text style={[styles.sectionTitleRight, { color: palette.muted }]}>
                  {`${remaining} left`}
                </Text>
              )}
            </View>

            {tasksState.status === 'loading' ? (
              // Skeleton rows while Firestore loads
              [0, 1, 2].map(i => (
                <SkeletonRow key={i} index={i} faint={palette.faint} />
              ))
            ) : tasksState.status === 'error' ? (
              // Error state — show message + retry button (KAN-58)
              <View style={styles.errorWrap}>
                <Text
                  style={[styles.empty, { color: palette.muted }]}
                  accessibilityRole="alert">
                  {tasksState.message || 'Could not load tasks. Please try again.'}
                </Text>
                <Pressable
                  onPress={() => setRetryKey(k => k + 1)}
                  style={[styles.retryBtn, { borderColor: palette.line }]}
                  accessibilityRole="button"
                  accessibilityLabel="Try again">
                  <Text style={[styles.retryLabel, { color: palette.text }]}>Try again</Text>
                </Pressable>
              </View>
            ) : tasks.length === 0 ? (
              <Text style={[styles.empty, { color: palette.muted }]}>
                {COPY.emptyState.todayNoTasks}
              </Text>
            ) : (
              effectiveTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  nearbyPoiType={nearbyPoiType}
                  onToggle={handleToggle}
                  onPress={t => navigation.navigate('TaskForm', { uid: uid ?? '', task: t })}
                  customCategories={customCategories}
                />
              ))
            )}
          </View>

          <View style={styles.bottomPad} />
        </Animated.ScrollView>

        {/* ── Collapsible ring section — absolutely positioned ON TOP of ScrollView ── */}
        <Animated.View
          style={[
            styles.ringSection,
            sectionStyle,
            { backgroundColor: palette.bg, borderBottomColor: palette.line },
          ]}>

          {/* Ring — absolutely positioned within section, animates left/top/size */}
          <Animated.View style={ringWrapStyle}>
            <ProgressRing
              progress={progress}
              diameter={ringSize}
              strokeWidth={ringStroke}
            />
          </Animated.View>

          {/* Caption — fades out over k 0→0.625 */}
          <Animated.View
            style={[styles.captionWrap, captionStyle]}
            pointerEvents="box-none">
            <Text style={[styles.captionLabel, { color: palette.muted }]}>
              {weekday.toUpperCase()}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Calendar', { initialDate: todayISO() })}
              accessibilityRole="button"
              accessibilityLabel="Open calendar">
              <Text style={[styles.captionDay, { color: palette.text }]}>
                {day}
              </Text>
            </Pressable>
            <Text style={[styles.captionSub, { color: palette.muted }]}>
              {`${month} · `}
              <Text style={[styles.captionSubBold, { color: palette.text }]}>
                {`${nearbyCount} nearby`}
              </Text>
            </Text>
          </Animated.View>

          {/* Compact ring caption — fades in with the progress panel */}
          <Animated.View
            style={[styles.ringCaption, counterStyle]}
            pointerEvents="none">
            <Text style={[styles.ringCaptionDay3, { color: palette.muted }]}>
              {weekday.slice(0, 3).toUpperCase()}
            </Text>
            <Text style={[styles.ringCaptionNum, { color: palette.text }]}>
              {day}
            </Text>
            <Text style={[styles.ringCaptionMonth, { color: palette.muted }]}>
              {month}
            </Text>
          </Animated.View>

          {/* Progress panel — fades in over k 0.45→0.91 */}
          <Animated.View
            style={[styles.progressWrap, counterStyle]}
            accessibilityLabel={COPY.progress.ringA11y(doneTasks, totalTasks)}
            accessibilityRole="text"
            pointerEvents="none">
            <Text style={[styles.progressLabel, { color: palette.muted }]}>
              PROGRESS
            </Text>
            <View style={styles.fractionRow}>
              <Text style={[styles.counterDone, { color: palette.text }]}>
                {doneTasks}
              </Text>
              <Text style={[styles.counterSep, { color: palette.faint }]}>/</Text>
              <Text style={[styles.counterTotal, { color: palette.muted }]}>
                {totalTasks}
              </Text>
            </View>
            <Text style={[styles.progressSub, { color: palette.muted }]}>
              {`${pct}% complete · ${remaining} left`}
            </Text>
          </Animated.View>
        </Animated.View>

      </View>

      {/* ── Add-task FAB (KAN-51) ── */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: palette.accent },
          pressed && styles.fabPressed,
        ]}
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Add task">
        <PlusIcon color="#FFFFFF" size={24} />
      </Pressable>

      {/* ── New-task bottom sheet (KAN-51) ── */}
      <NewTaskSheet
        ref={sheetRef}
        visible={sheetVisible}
        uid={uid ?? ''}
        onClose={() => setSheetVisible(false)}
        customCategories={customCategories}
      />

      {/* ── Store fine tuning opt-in prompt (KAN-74 / KAN-75) ── */}
      <StoreTuningPromptSheet
        visible={showStoreTuningPrompt}
        onTurnOn={onStoreTuningTurnOn}
        onNotNow={onStoreTuningNotNow}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:         { flex: 1 },
  stickyHeader: { zIndex: 3 },
  // scrollArea fills all space below the sticky header. The ring section
  // is absolutely positioned at top:0 of scrollArea (zIndex 2), and the
  // ScrollView is absoluteFill behind it with paddingTop = SECTION_H_REST.
  scrollArea:   { flex: 1 },
  scrollContent: {
    // paddingTop = SECTION_H_REST ensures content always starts exactly where
    // the ring section ends at rest. As the ring section collapses by
    // SCROLL_RANGE (= 170), content scrolls up the same distance → perfect sync.
    paddingTop: SECTION_H_REST,
  },
  ringSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  captionWrap: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  captionDay: {
    fontSize: 80,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
    lineHeight: 88,
  },
  captionSub: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    marginTop: 4,
  },
  captionSubBold: {
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  // ── Compact ring caption (fades in when collapsed) ──
  ringCaption: {
    position: 'absolute',
    left: RING_LEFT_COLLAPSED,
    top:  RING_TOP_COLLAPSED,
    width:  RING_COLLAPSED,
    height: RING_COLLAPSED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCaptionDay3: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: 1.2,
  },
  ringCaptionNum: {
    fontSize: 32,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    lineHeight: 36,
    marginTop: 1,
  },
  ringCaptionMonth: {
    fontSize: 9,
    fontFamily: 'Geist-Regular',
    marginTop: 1,
  },
  // ── Progress panel (fades in when collapsed) ──
  progressWrap: {
    position: 'absolute',
    left: RING_LEFT_COLLAPSED + RING_COLLAPSED + 16,
    top:  RING_TOP_COLLAPSED,
    height: RING_COLLAPSED,
    justifyContent: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  fractionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  counterDone: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  counterSep: {
    fontSize: 20,
    fontFamily: 'Geist-Regular',
  },
  counterTotal: {
    fontSize: 20,
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
  },
  progressSub: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    marginTop: 3,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: spacing.page,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: 1,
  },
  sectionTitleCount: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  sectionTitleRight: {
    fontSize: 11,
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    paddingVertical: 8,
  },
  // ── Error retry (KAN-58) ──
  errorWrap: {
    gap: 10,
  },
  retryBtn: {
    alignSelf:         'flex-start',
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:       8,
    borderWidth:        1,
  },
  retryLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },
  // ── Skeleton ──
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  skeletonDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
  },
  skeletonLine: {
    flex: 1,
    height: 14,
    borderRadius: 7,
  },
  // Extra bottom padding ensures the user can always scroll SCROLL_RANGE (170px)
  // even with a short task list.
  bottomPad: { height: 220 },
  // ── Add-task FAB ──
  fab: {
    position:     'absolute',
    right:         20,
    bottom:        20,
    zIndex:         5,
    width:          56,
    height:         56,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:   '#e8a86a',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius:  18,
    elevation:      8,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
});
