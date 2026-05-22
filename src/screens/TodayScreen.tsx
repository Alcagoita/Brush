/**
 * TodayScreen — KAN-45
 *
 * Layout (top → bottom):
 *   1. Sticky Header (zIndex 3)           — avatar, greeting, bell
 *   2. Collapsible Ring Section (zIndex 2) — scroll-driven A→B collapse
 *   3. Nearby Card placeholder             — KAN-46 will replace
 *   4. Task list placeholder               — KAN-15 will replace
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
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme/tokens';
import Header from '../components/Header';
import ProgressRing from '../components/ProgressRing';
import { subscribeToTasksForDate } from '../services/firestore';
import { Task } from '../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const SCROLL_RANGE = 170;

const RING_REST = 246;
const RING_COLLAPSED = 112;
const STROKE_REST = 14;
const STROKE_COLLAPSED = 10;
const RING_LEFT_REST = (SCREEN_W - RING_REST) / 2;
const RING_LEFT_COLLAPSED = 22;

const SECTION_H_REST = 320;
const SECTION_H_COLLAPSED = 150;
const RING_TOP_REST = (SECTION_H_REST - RING_REST) / 2;
const RING_TOP_COLLAPSED = (SECTION_H_COLLAPSED - RING_COLLAPSED) / 2;

// Caption fades over k 0→0.625 (scrollY 0→106)
const CAPTION_FADE_END = SCROLL_RANGE * 0.625;
// Counter fades in over k 0.45→0.91 (scrollY 76.5→154.7)
const COUNTER_FADE_START = SCROLL_RANGE * 0.45;
const COUNTER_FADE_END = SCROLL_RANGE * 0.91;

// ─── Date helpers ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { palette } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const now = new Date();
  const weekday = WEEKDAYS[now.getDay()];
  const weekdayShort = WEEKDAYS_SHORT[now.getDay()];
  const month = MONTHS[now.getMonth()];

  const user = getAuth().currentUser;
  const uid = user?.uid;
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';

  // ── Live task subscription ──
  useEffect(() => {
    if (!uid) return;
    return subscribeToTasksForDate(uid, todayISO(), setTasks);
  }, [uid]);

  // ── Collapsed state for text changes ──
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      setCollapsed(value > SCROLL_RANGE * 0.5);
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  // ── Progress ──
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const nearbyCount = tasks.filter(t => t.poi).length;

  // ── Animated interpolations ──
  const ringSize = scrollY.interpolate({
    inputRange: [0, SCROLL_RANGE],
    outputRange: [RING_REST, RING_COLLAPSED],
    extrapolate: 'clamp',
  });
  const ringStroke = scrollY.interpolate({
    inputRange: [0, SCROLL_RANGE],
    outputRange: [STROKE_REST, STROKE_COLLAPSED],
    extrapolate: 'clamp',
  });
  const ringLeft = scrollY.interpolate({
    inputRange: [0, SCROLL_RANGE],
    outputRange: [RING_LEFT_REST, RING_LEFT_COLLAPSED],
    extrapolate: 'clamp',
  });
  const ringTop = scrollY.interpolate({
    inputRange: [0, SCROLL_RANGE],
    outputRange: [RING_TOP_REST, RING_TOP_COLLAPSED],
    extrapolate: 'clamp',
  });
  const sectionHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_RANGE],
    outputRange: [SECTION_H_REST, SECTION_H_COLLAPSED],
    extrapolate: 'clamp',
  });
  const captionOpacity = scrollY.interpolate({
    inputRange: [0, CAPTION_FADE_END],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const counterOpacity = scrollY.interpolate({
    inputRange: [COUNTER_FADE_START, COUNTER_FADE_END],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>

      {/* ── Sticky header (zIndex 3) ── */}
      <View style={styles.stickyHeader}>
        <Header displayName={displayName} hasUnread={false} />
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}>

        {/* ── Collapsible ring section ── */}
        <Animated.View
          style={[
            styles.ringSection,
            {
              height: sectionHeight,
              backgroundColor: palette.bg,
              borderBottomColor: palette.line,
            },
          ]}>

          {/* Ring — absolutely positioned, animates left/top/size */}
          <Animated.View
            style={{ position: 'absolute', left: ringLeft, top: ringTop }}>
            <ProgressRing
              progress={progress}
              diameter={ringSize}
              strokeWidth={ringStroke}
            />
          </Animated.View>

          {/* Caption — fades out over k 0→0.625 */}
          <Animated.View
            style={[styles.captionWrap, { opacity: captionOpacity }]}
            pointerEvents="none">
            <Text style={[styles.weekday, { color: palette.text }]}>
              {collapsed ? weekdayShort : weekday}
            </Text>
            <Text style={[styles.subLabel, { color: palette.muted }]}>
              {collapsed ? month : `${month} · ${nearbyCount} nearby`}
            </Text>
          </Animated.View>

          {/* Split counter — fades in over k 0.45→0.91 */}
          <Animated.View
            style={[
              styles.counterWrap,
              {
                opacity: counterOpacity,
                left: RING_LEFT_COLLAPSED + RING_COLLAPSED + 16,
                top: RING_TOP_COLLAPSED + RING_COLLAPSED / 2 - 20,
              },
            ]}
            pointerEvents="none">
            <Text style={[styles.counterDone, { color: palette.text }]}>
              {doneTasks}
            </Text>
            <Text style={[styles.counterSep, { color: palette.faint }]}>/</Text>
            <Text style={[styles.counterTotal, { color: palette.muted }]}>
              {totalTasks}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* ── Nearby card placeholder (KAN-46) ── */}
        <View
          style={[
            styles.placeholderCard,
            { backgroundColor: palette.surface, borderColor: palette.line },
          ]}>
          <Text style={[styles.placeholderLabel, { color: palette.muted }]}>
            Nearby card — coming in KAN-46
          </Text>
        </View>

        {/* ── Task list (KAN-15 will upgrade to full TaskRow components) ── */}
        <View style={[styles.section, { borderTopColor: palette.line }]}>
          <Text style={[styles.sectionTitle, { color: palette.muted }]}>TODAY</Text>
          {tasks.length === 0 ? (
            <Text style={[styles.empty, { color: palette.muted }]}>
              No tasks for today
            </Text>
          ) : (
            tasks.map(task => (
              <View
                key={task.id}
                style={[styles.taskRow, { borderBottomColor: palette.line }]}>
                <View
                  style={[
                    styles.taskDot,
                    { backgroundColor: task.done ? palette.faint : palette.accent },
                  ]}
                />
                <Text
                  style={[
                    styles.taskTitle,
                    {
                      color: task.done ? palette.muted : palette.text,
                      textDecorationLine: task.done ? 'line-through' : 'none',
                    },
                  ]}>
                  {task.title}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomPad} />
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  stickyHeader: { zIndex: 3 },
  scrollContent: { paddingTop: 0 },
  ringSection: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  captionWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  weekday: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  subLabel: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    marginTop: 2,
  },
  counterWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  counterDone: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
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
  placeholderCard: {
    marginHorizontal: spacing.page,
    marginTop: 16,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
  },
  placeholderLabel: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: spacing.page,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    paddingVertical: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Geist-Regular',
  },
  bottomPad: { height: 80 },
});
