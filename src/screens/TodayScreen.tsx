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
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { PlusIcon } from '../components/AppIcon';
import ScrRotatingNudge, { NudgeMessage } from '../components/ScrRotatingNudge';
import Animated, {
  cancelAnimation,
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
import { COPY } from '../constants/copy';
// ─── Layout constants ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const SCROLL_RANGE = 170; // SECTION_H_REST − SECTION_H_COLLAPSED (declared below)

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

// ─── Empty-state message set (KAN-139) ───────────────────────────────────────

const EMPTY_MESSAGES: NudgeMessage[] = [
  { text: "Nothing on today. That doesn’t mean nothing matters." },
  { text: "Don’t you feel the need for bread?",                  poi: "supermarket", color: "#8b6bc4" },
  { text: "Maybe today’s a good day for coffee outside.",        poi: "cafe",        color: "#e8a86a" },
  { text: "Might be worth grabbing some cash while you’re out.", poi: "atm",         color: "#8b6bc4" },
  { text: "Anything in the cabinet running low?",                     poi: "pharmacy",    color: "#5ba87a" },
  { text: "Something in the fridge is probably asking to be replaced.", poi: "supermarket", color: "#8b6bc4" },
  { text: "A clear day is a gift. What will you do with it?" },
  { text: "What’s the one thing future-you will thank you for?" },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    return () => { cancelAnimation(opacity); };
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
    tasks,
    isLoading,
    error,
    refresh,
    nearbyPoiType,
    nearbyPlace,
    poiPlaces,
    storeTuningActive,
    showStoreTuningPrompt,
    onStoreTuningTurnOn,
    onStoreTuningNotNow,
    sheetVisible,
    setSheetVisible,
    customCategories,
    totalTasks,
    doneTasks,
    progress,
    nearbyCount,
    totalPoints,
    inboxCount,
    handleToggle,
    permissionGranted,
    refreshProximity,
    locationUnavailable,
  } = useTodayScreen(uid);

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

  // ── ScrollView viewport height (for minHeight calculation) ───────────────────
  // Measured via onLayout so the content is always tall enough to allow the
  // full SCROLL_RANGE (170px) of scroll, even with very few tasks.
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

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

  // ── Task display order: undone first, done at bottom ─────────────────────────
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done === b.done) { return 0; }
    return a.done ? 1 : -1;
  });

  // ── Empty state flag ──────────────────────────────────────────────────────────
  const isEmpty = !isLoading && !error && tasks.length === 0;

  // ── Animated styles (UI thread) ───────────────────────────────────────────────
  // bgStyle drives the inner background only — the outer ring container has a
  // fixed height so animating it never triggers a native layout pass.
  const bgStyle = useAnimatedStyle(() => ({
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
          points={totalPoints}
          onAvatarPress={() => navigation.navigate('Profile')}
          onBellPress={() => navigation.navigate('SharedTaskInbox')}
          onPeoplePress={() => navigation.navigate('SocialHub')}
          onAchievementsPress={() => navigation.navigate('Achievements')}
        />
      </View>

      {/* ── Scroll area — ring section overlaid on content ── */}
      <View style={styles.scrollArea}>

        {isEmpty ? (
          /* ── Empty state body (KAN-139) — no scroll, nudge + CTA ── */
          <View style={[StyleSheet.absoluteFill, { paddingTop: SECTION_H_REST }]}>
            <ScrRotatingNudge messages={EMPTY_MESSAGES} pace={5} showCategoryIcon />
            <View style={styles.emptyCTAWrap}>
              <Pressable
                style={({ pressed }) => [
                  styles.emptyCTABtn,
                  { backgroundColor: palette.accent },
                  pressed && styles.emptyCTABtnPressed,
                ]}
                onPress={() => setSheetVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Add something">
                <PlusIcon color={palette.text} size={20} />
                <Text style={[styles.emptyCTALabel, { color: palette.text }]}>
                  Add something
                </Text>
              </Pressable>
              <Text style={[styles.emptyCTAHelper, { color: palette.faint }]}>
                {'Those are just passing thoughts. Add what’s actually yours.'}
              </Text>
            </View>
          </View>
        ) : (
          /*
            The ScrollView fills the entire scrollArea (absoluteFill).
            paddingTop = SECTION_H_REST means content always starts 320px down,
            directly below where the ring section sits at rest. As the ring
            section collapses by SCROLL_RANGE (170px), content scrolls up the
            same distance — they stay in perfect alignment throughout.
          */
          <Animated.ScrollView
            style={StyleSheet.absoluteFill}
            contentContainerStyle={[
              styles.scrollContent,
              {
                backgroundColor: palette.bg,
                minHeight: (scrollViewHeight || SCREEN_H) + SCROLL_RANGE,
              },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onLayout={e => setScrollViewHeight(e.nativeEvent.layout.height)}
            onScroll={scrollHandler}>

            {/* ── Nearby card (KAN-46 / KAN-52 / KAN-74) ── */}
            <NearbyCard
              tasks={sortedTasks}
              nearbyPoiType={nearbyPoiType}
              nearbyPlace={nearbyPlace}
              poiPlaces={poiPlaces}
              storeTuningActive={storeTuningActive}
            />

            {/* ── Location status row — shown when there are POI tasks but
                 no nearby place is detected. Two states:
                 · GPS off  → error message + Retry
                 · GPS on   → subtle "Refresh location" tap target             ── */}
            {permissionGranted && nearbyCount > 0 && !nearbyPoiType && !isLoading && (
              locationUnavailable ? (
                <View style={[styles.locationErrorRow, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                  <Text style={[styles.locationErrorText, { color: palette.muted }]}>
                    Location unavailable. Turn on GPS to see nearby places.
                  </Text>
                  <Pressable
                    onPress={refreshProximity}
                    accessibilityRole="button"
                    accessibilityLabel="Retry location">
                    <Text style={[styles.locationRetryLabel, { color: palette.text }]}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={refreshProximity}
                  style={[styles.refreshRow, { borderBottomColor: palette.line }]}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh location">
                  <Text style={[styles.refreshLabel, { color: palette.muted }]}>
                    Refresh location
                  </Text>
                </Pressable>
              )
            )}

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

              {isLoading ? (
                [0, 1, 2].map(i => (
                  <SkeletonRow key={i} index={i} faint={palette.faint} />
                ))
              ) : error ? (
                <View style={styles.errorWrap}>
                  <Text
                    style={[styles.empty, { color: palette.muted }]}
                    accessibilityRole="alert">
                    {error}
                  </Text>
                  <Pressable
                    onPress={refresh}
                    style={[styles.retryBtn, { borderColor: palette.line }]}
                    accessibilityRole="button"
                    accessibilityLabel="Try again">
                    <Text style={[styles.retryLabel, { color: palette.text }]}>Try again</Text>
                  </Pressable>
                </View>
              ) : (
                sortedTasks.map(task => (
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
        )}

        {/* ── Collapsible ring section — absolutely positioned ON TOP of content ── */}
        {/*                                                                         */}
        {/* ARCHITECTURE: outer container has a FIXED height (never animates).     */}
        {/* Only the inner ringBg child animates its height — because it is        */}
        {/* position:absolute it does not affect sibling layout and never triggers */}
        {/* a native layout pass. This eliminates the touch-blocking glitch that   */}
        {/* occurred when animating layout properties on the outer container.      */}
        {/*                                                                         */}
        {/* pointerEvents="box-none" lets scroll gestures pass through to the      */}
        {/* ScrollView while still allowing the day-number Pressable to work.      */}
        {/* The SVG ring and background have explicit "none" so they never block.  */}
        <View
          pointerEvents="box-none"
          style={styles.ringSection}>

          {/* Background fill + bottom border — only this animates height */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ringBg,
              bgStyle,
              { backgroundColor: palette.bg, borderBottomColor: palette.line },
            ]}
          />

          {/* Ring — absolutely positioned within section, animates left/top/size */}
          <Animated.View style={ringWrapStyle} pointerEvents="none">
            <ProgressRing
              progress={progress}
              diameter={ringSize}
              strokeWidth={ringStroke}
            />
          </Animated.View>

          {/* Caption — fades out over k 0→0.625 */}
          <Animated.View style={[styles.captionWrap, captionStyle]} pointerEvents="box-none">
            <Text style={[styles.captionLabel, { color: palette.muted }]}>
              {weekday.toUpperCase()}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Calendar')}
              accessibilityRole="button"
              accessibilityLabel={`Open calendar for ${weekday} ${day}`}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
              <Text style={[styles.captionDay, { color: palette.text }]}>
                {day}
              </Text>
            </Pressable>
            {isEmpty ? (
              <Text style={[styles.captionSub, { color: palette.muted }]}>{month}</Text>
            ) : (
              <Text style={[styles.captionSub, { color: palette.muted }]}>
                {`${month} · `}
                <Text style={[styles.captionSubBold, { color: palette.text }]}>
                  {`${nearbyCount} nearby`}
                </Text>
              </Text>
            )}
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
        </View>

      </View>

      {/* ── Add-task FAB (KAN-51) — hidden on empty state (CTA replaces it) ── */}
      {!isEmpty && (
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
      )}

      {/* ── New-task bottom sheet (KAN-51) ── */}
      <NewTaskSheet
        ref={sheetRef}
        visible={sheetVisible}
        uid={uid ?? ''}
        onClose={() => setSheetVisible(false)}
        onTaskAdded={refresh}
        customCategories={customCategories}
      />

      {/* ── Store fine tuning opt-in prompt (KAN-74 / KAN-75) ── */}
      <StoreTuningPromptSheet
        visible={showStoreTuningPrompt}
        onTurnOn={onStoreTuningTurnOn}
        onNotNow={onStoreTuningNotNow}
      />

      {/* ── Loading overlay — blocks touches until initial fetch completes ── */}
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="box-only">
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:         { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
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
    height: SECTION_H_REST,
    zIndex: 2,
    overflow: 'visible',
  },
  // Inner background — position:absolute so its animated height never causes
  // the outer ringSection (fixed height) to remeasure or block touches.
  ringBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  refreshRow: {
    paddingHorizontal: spacing.page,
    paddingVertical:   10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems:        'flex-end',
  },
  refreshLabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
  locationErrorRow: {
    marginHorizontal: spacing.page,
    marginBottom:     12,
    paddingHorizontal: 14,
    paddingVertical:   12,
    borderRadius:     radius.card,
    borderWidth:      StyleSheet.hairlineWidth,
    flexDirection:    'row',
    alignItems:       'center',
    gap:              12,
  },
  locationErrorText: {
    flex:       1,
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    lineHeight: 18,
  },
  locationRetryLabel: {
    fontSize:   13,
    fontFamily: 'Geist-SemiBold',
    fontWeight: '600',
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
  // ── Empty state CTA ──
  emptyCTAWrap: {
    paddingHorizontal: spacing.page,
    paddingBottom:     26,
  },
  emptyCTABtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    height:         54,
    borderRadius:   16,
    gap:            8,
  },
  emptyCTABtnPressed: {
    transform: [{ scale: 0.985 }],
  },
  emptyCTALabel: {
    fontSize:      16,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: -0.16,
  },
  emptyCTAHelper: {
    fontSize:   12.5,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    marginTop:  12,
  },
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
