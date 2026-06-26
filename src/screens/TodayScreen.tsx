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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Easing,
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
import NetworkBanner from '../components/NetworkBanner';
import NewTaskSheetHost from '../components/NewTaskSheetHost';
import { useNewTaskSheetStore } from '../store/newTaskSheetStore';
import StoreTuningPromptSheet from '../components/StoreTuningPromptSheet';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTodayScreen } from '../hooks/useTodayScreen';
import { COPY } from '../constants/copy';
// ─── Layout constants ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const SCROLL_RANGE = 170; // SECTION_H_REST − SECTION_H_COLLAPSED (declared below)

const RING_REST      = 246;
const RING_COLLAPSED = 112;
const STROKE_REST      = 14;
const RING_LEFT_REST      = (SCREEN_W - RING_REST) / 2;
const RING_LEFT_COLLAPSED = 22;

const SECTION_H_REST      = 320;
const SECTION_H_COLLAPSED = 150;
const RING_TOP_REST      = (SECTION_H_REST      - RING_REST)      / 2;
const RING_TOP_COLLAPSED = (SECTION_H_COLLAPSED - RING_COLLAPSED) / 2;

// ── 2-state collapse (KAN-157) ──────────────────────────────────────────────────
// Two positions only: rest (scroll 0 → 60%) and collapsed (60 → 100%). A single
// `collapseT` (0↔1) animates between them on the UI thread; everything is a
// composite-only transform/opacity interpolation of it.
const COLLAPSE_THRESHOLD = 0.6; // fraction of SCROLL_RANGE that triggers collapse

/**
 * DEBUG bisect toggles for the Today scroll block. Add parts back one at a time
 * to isolate what locks the screen. Restore by setting all three true.
 */
const DEBUG_SHOW_LIST    = true;  // the FlatList of TaskRows
const DEBUG_SHOW_NEARBY  = true;  // the NearbyCard (list header)
const DEBUG_SHOW_RING    = true;  // the collapsible ring overlay
const DEBUG_SIMPLE_ROWS  = false; // render dumb <Text> rows instead of <TaskRow>
const DEBUG_MINIMAL = !DEBUG_SHOW_LIST && !DEBUG_SHOW_RING;

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
    poiPlaces,
    storeTuningActive,
    showStoreTuningPrompt,
    onStoreTuningTurnOn,
    onStoreTuningNotNow,
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


  // ── New Task sheet open trigger ───────────────────────────────────────────────
  // Visibility lives in useNewTaskSheetStore, NOT screen state. `openSheet` is
  // read via getState() (no subscription) so opening never re-renders this
  // screen; the sheet itself is rendered by NewTaskSheetHost which subscribes.
  const openSheet = useCallback(() => useNewTaskSheetStore.getState().open(), []);

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

  // ── 2-state collapse (KAN-157) ────────────────────────────────────────────────
  // A single `collapseT` (0 = rest, 1 = collapsed) animates between the two
  // positions, entirely on the UI thread (withTiming inside a derived value),
  // ONLY when the scroll crosses the 60% threshold. No JS round-trip, no
  // per-frame layout — every dependent style below is a composite-only
  // transform/opacity interpolation of collapseT.
  const collapseT = useDerivedValue(() =>
    withTiming(scrollY.value >= SCROLL_RANGE * COLLAPSE_THRESHOLD ? 1 : 0, {
      duration: 240,
      easing: Easing.inOut(Easing.cubic),
    }),
  );

  // `collapsed` mirrors the state in JS — used only for caption pointerEvents and
  // the one-shot haptic. The animation itself never touches JS.
  const [collapsed, setCollapsed] = useState(false);
  useAnimatedReaction(
    () => scrollY.value >= SCROLL_RANGE * COLLAPSE_THRESHOLD,
    (isCollapsed, prev) => {
      if (isCollapsed !== prev) {
        runOnJS(setCollapsed)(isCollapsed);
        if (isCollapsed) { runOnJS(Vibration.vibrate)(Platform.OS === 'android' ? 10 : 1); }
      }
    },
  );

  const ringWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(collapseT.value, [0, 1], [0, RING_LEFT_COLLAPSED - RING_LEFT_REST]) },
      { translateY: interpolate(collapseT.value, [0, 1], [0, RING_TOP_COLLAPSED - RING_TOP_REST]) },
      { scale:      interpolate(collapseT.value, [0, 1], [1, RING_COLLAPSED / RING_REST]) },
    ],
  }));
  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(collapseT.value, [0, 1], [1, SECTION_H_COLLAPSED / SECTION_H_REST]) }],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseT.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  const collapsedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseT.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // ── Progress counters ─────────────────────────────────────────────────────────
  const pct       = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const remaining = totalTasks - doneTasks;

  // ── Task display order: undone first, done at bottom ─────────────────────────
  // Memoized so a nearby-data change (which leaves `tasks` untouched) doesn't
  // produce a new array identity and re-render every memoized TaskRow (KAN-156).
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => {
      if (a.done === b.done) { return 0; }
      return a.done ? 1 : -1;
    }),
    [tasks],
  );

  // Stable row-press handler — an inline arrow here would change identity every
  // render and defeat React.memo on TaskRow.
  const handleTaskPress = useCallback(
    (t: typeof tasks[number]) => navigation.navigate('TaskForm', { uid: uid ?? '', task: t }),
    [navigation, uid],
  );

  // ── Empty state flag ──────────────────────────────────────────────────────────
  const isEmpty = !isLoading && !error && tasks.length === 0;

  // ── Virtualized task list (KAN-157 follow-up) ─────────────────────────────────
  // Post-rollover (KAN-146) the Today list can hold every undone task carried
  // forward from past days — potentially dozens. Rendering them all eagerly in a
  // .map() inside a ScrollView meant every proximity tick re-rendered the whole
  // animation-heavy list, saturating the JS thread (buttons dead). FlatList
  // virtualizes: only on-screen rows mount, and stable props keep React.memo
  // intact so a location update never re-renders rows it didn't change.
  const renderTask = useCallback(
    ({ item }: { item: typeof tasks[number] }) => (
      DEBUG_SIMPLE_ROWS ? (
        <View style={styles.rowPad}>
          <Text style={{ color: palette.text, paddingVertical: 14 }}>{item.title}</Text>
        </View>
      ) : (
      <View style={styles.rowPad}>
        <TaskRow
          task={item}
          // Narrow the prop: only the matching row ever sees a non-null type, so
          // every other row keeps a stable `null` across location ticks and its
          // memo holds (no re-render).
          nearbyPoiType={item.poi && item.poi === nearbyPoiType ? nearbyPoiType : null}
          onToggle={handleToggle}
          onPress={handleTaskPress}
          customCategories={customCategories}
        />
      </View>
      )
    ),
    [nearbyPoiType, handleToggle, handleTaskPress, customCategories, palette.text],
  );

  const keyExtractor = useCallback((t: typeof tasks[number]) => t.id, []);

  const listHeader = useMemo(() => (
    <>
      {/* ── Nearby card (KAN-46 / KAN-52 / KAN-74) ── */}
      {DEBUG_SHOW_NEARBY && (
      <NearbyCard
        tasks={sortedTasks}
        nearbyPoiType={nearbyPoiType}
        poiPlaces={poiPlaces}
        storeTuningActive={storeTuningActive}
        onRefreshLocation={refreshProximity}
      />
      )}

      {/* ── Task list section header ── */}
      <View style={[styles.sectionHeaderBlock, { borderTopColor: palette.line }]}>
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
      </View>
    </>
  ), [
    sortedTasks, nearbyPoiType, poiPlaces, storeTuningActive,
    permissionGranted, nearbyCount, isLoading,
    palette, doneTasks, totalTasks, remaining,
  ]);

  const listEmpty = isLoading ? (
    <View style={styles.rowPad}>
      {[0, 1, 2].map(i => (
        <SkeletonRow key={i} index={i} faint={palette.faint} />
      ))}
    </View>
  ) : error ? (
    <View style={[styles.rowPad, styles.errorWrap]}>
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
  ) : null;

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

      {/* ── Offline banner — below app bar ── */}
      <NetworkBanner />

      {/* ── Scroll area — ring section overlaid on content ── */}
      {(DEBUG_SHOW_LIST || DEBUG_SHOW_RING) && (
      <View style={styles.scrollArea}>

        {DEBUG_SHOW_LIST && (isEmpty ? (
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
                onPress={openSheet}
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
          <Animated.FlatList
            style={StyleSheet.absoluteFill}
            contentContainerStyle={[
              styles.scrollContent,
              { backgroundColor: palette.bg },
            ]}
            data={isLoading || error ? [] : sortedTasks}
            renderItem={renderTask}
            keyExtractor={keyExtractor}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={<View style={styles.bottomPad} />}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
          />
        ))}

        {/* ── Collapsible ring section — absolutely positioned ON TOP of content ── */}
        {/*                                                                         */}
        {/* 3-STATE SNAP (KAN-157): the header has three fixed layouts (rest /      */}
        {/* middle / collapsed) selected by `stage`. Nothing animates per frame —   */}
        {/* a stage change swaps to a different set of STATIC styles. This removes  */}
        {/* the per-frame layout/commit work that froze the thread on scroll.       */}
        {/*                                                                         */}
        {/* pointerEvents="box-none" lets scroll gestures pass through to the      */}
        {/* ScrollView while still allowing the day-number Pressable to work.       */}
        {DEBUG_SHOW_RING && (
        <View
          pointerEvents="box-none"
          style={styles.ringSection}>

          {/* Background fill + bottom border — collapses via scaleY (composite) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ringBg,
              bgStyle,
              { backgroundColor: palette.bg, borderBottomColor: palette.line },
            ]}
          />

          {/* Ring — rendered once at rest size; scaled/translated per stage */}
          <Animated.View style={[styles.ringWrap, ringWrapStyle]} pointerEvents="none">
            <ProgressRing
              progress={progress}
              diameter={RING_REST}
              strokeWidth={STROKE_REST}
            />
          </Animated.View>

          {/* Full caption — fades out as the header collapses */}
          <Animated.View
            style={[styles.captionWrap, captionStyle]}
            pointerEvents={collapsed ? 'none' : 'box-none'}>
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

          {/* Compact caption — fades in when collapsed */}
          <Animated.View style={[styles.ringCaption, collapsedStyle]} pointerEvents="none">
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

          {/* Progress panel — fades in when collapsed */}
          <Animated.View
            style={[styles.progressWrap, collapsedStyle]}
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
        )}

      </View>
      )}

      {/* ── Add-task FAB (KAN-51) — hidden on empty state (CTA replaces it) ── */}
      {(!isEmpty || DEBUG_MINIMAL) && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: palette.accent },
            pressed && styles.fabPressed,
          ]}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel="Add task">
          <PlusIcon color={palette.onAccent} size={24} />
        </Pressable>
      )}

      {/* ── New-task bottom sheet (KAN-51) ── */}
      {/* Rendered through a store-subscribed host so open/close never re-renders
          TodayScreen — only the host re-renders on a visibility toggle. */}
      <NewTaskSheetHost
        uid={uid ?? ''}
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
      {isLoading && !DEBUG_MINIMAL && (
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
    height: SECTION_H_REST,      // fixed; collapse is a scaleY transform
    transformOrigin: 'top',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ringWrap: {
    position: 'absolute',
    left: RING_LEFT_REST,        // fixed rest position; stage moves it via translate
    top: RING_TOP_REST,
    transformOrigin: 'top left', // scale shrinks toward the top-left corner
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
  sectionHeaderBlock: {
    marginTop: 24,
    paddingHorizontal: spacing.page,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  // Per-row horizontal padding — replaces the wrapping `section` View now that
  // rows are FlatList items rather than children of a single padded container.
  rowPad: {
    paddingHorizontal: spacing.page,
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
  // Clears the floating add-task FAB at the end of the list.
  bottomPad: { height: 96 },
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
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
});
