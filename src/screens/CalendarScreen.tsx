/**
 * CalendarScreen — KAN-50
 *
 * Layout (top → bottom):
 *   1. Top bar       — ← back  |  "Today" pill
 *   2. Month nav     — ‹  Month YYYY  ›
 *   3. Weekday row   — S  M  T  W  T  F  S
 *   4. Day grid      — 7-col, each cell: day number + MiniRing(18×18)
 *   5. Detail card   — selected day's large ring (52×52) + task rows
 *
 * Day cell colours (spec):
 *   selected → bg=text,    ring color=bg,     ring track=rgba(white,0.18)
 *   today    → bg=surface, ring color varies, ring track=ringTrack
 *   other    → bg=transparent
 *
 * MiniRing fill color:
 *   selected cell      → palette.bg
 *   all done  (unsel.) → palette.accent
 *   partial / no tasks → palette.text  (faint if total===0)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme/tokens';
import { subscribeToTasksForMonth } from '../services/firestore';
import { Task, MonthTasksUiState } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/AppIcon';
import { COPY } from '../constants/copy';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const CELL_W   = SCREEN_W / 7;
const CELL_H   = 66;
const RING_SM  = 18;   // grid cell ring
const RING_LG  = 52;   // detail card ring
const RING_SM_STROKE = 2.5;
const RING_LG_STROKE = 4;

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** YYYY-MM string from year + 1-based month. */
function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** YYYY-MM-DD string from year + 1-based month + day. */
function toDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Advance month by delta (−1 / +1), wrapping year correctly. */
function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  if (m < 1)  { m = 12; y -= 1; }
  if (m > 12) { m = 1;  y += 1; }
  return { year: y, month: m };
}

/**
 * Build the grid cell array for a month.
 * Returns day numbers (1-based) for real cells, null for padding cells.
 */
function buildGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth  = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) { cells.push(null); }
  for (let d = 1; d <= daysInMonth; d++) { cells.push(d); }
  while (cells.length % 7 !== 0) { cells.push(null); }
  return cells;
}

/** Pretty label for the detail card header: "MON, MAY 4". */
function formatDetailHeader(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const wd   = SHORT_WEEKDAYS[date.getDay()].toUpperCase();
  const mo   = MONTH_NAMES[m - 1].slice(0, 3).toUpperCase();
  return `${wd}, ${mo} ${d}`;
}

// ─── MiniRing ─────────────────────────────────────────────────────────────────

interface MiniRingProps {
  size:   number;
  stroke: number;
  done:   number;
  total:  number;
  color:  string;
  track:  string;
}

function MiniRing({ size, stroke, done, total, color, track }: MiniRingProps) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = total === 0 ? 0 : Math.min(done / total, 1);

  return (
    <Svg
      width={size}
      height={size}
      style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={track}
        strokeWidth={stroke}
      />
      {pct > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
        />
      )}
    </Svg>
  );
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  day:        number;
  isToday:    boolean;
  isSelected: boolean;
  done:       number;
  total:      number;
  onPress:    () => void;
}

function DayCell({ day, isToday, isSelected, done, total, onPress }: DayCellProps) {
  const { palette } = useTheme();

  // Background
  const bg =
    isSelected ? palette.text :
    isToday    ? palette.surface :
    'transparent';

  // Ring fill colour
  const allDone  = total > 0 && done === total;
  const ringColor =
    isSelected         ? palette.bg :
    allDone            ? palette.accent :
    total === 0        ? palette.faint :
                         palette.text;

  // Ring track colour
  const ringTrack = isSelected
    ? 'rgba(253,253,251,0.18)'
    : palette.ringTrack;

  // Day number text colour
  const dayColor = isSelected ? palette.bg : palette.text;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        { backgroundColor: bg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${day}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}>
      <Text style={[styles.cellDay, { color: dayColor }]}>{day}</Text>
      <MiniRing
        size={RING_SM}
        stroke={RING_SM_STROKE}
        done={done}
        total={total}
        color={ringColor}
        track={ringTrack}
      />
    </Pressable>
  );
}

// ─── DetailCard ───────────────────────────────────────────────────────────────

interface DetailCardProps {
  dateISO:  string;
  tasks:    Task[];
  isToday:  boolean;
}

function DetailCard({ dateISO, tasks, isToday }: DetailCardProps) {
  const { palette } = useTheme();
  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const allDone   = total > 0 && done === total;
  const ringColor = allDone ? palette.accent : palette.text;

  return (
    <View style={[styles.detailCard, { borderColor: palette.line, backgroundColor: palette.surface }]}>
      {/* Header row */}
      <View style={styles.detailHeader}>
        <View style={styles.detailHeaderLeft}>
          <Text style={[styles.detailDateLabel, { color: palette.muted }]}>
            {isToday ? 'TODAY · ' : ''}{formatDetailHeader(dateISO)}
          </Text>
          <Text style={[styles.detailFraction, { color: palette.text }]}>
            {done}
            <Text style={{ color: palette.faint }}> / </Text>
            <Text style={{ color: palette.muted }}>{total}</Text>
            <Text style={[styles.detailFractionSuffix, { color: palette.muted }]}>
              {' '}brushed
            </Text>
          </Text>
        </View>

        <MiniRing
          size={RING_LG}
          stroke={RING_LG_STROKE}
          done={done}
          total={total}
          color={ringColor}
          track={palette.ringTrack}
        />
      </View>

      {/* Divider */}
      <View style={[styles.detailDivider, { backgroundColor: palette.line }]} />

      {/* Task rows */}
      {total === 0 ? (
        <Text style={[styles.emptyLabel, { color: palette.muted }]}>
          {COPY.emptyState.calendarNoTasks}
        </Text>
      ) : (
        tasks.map(task => (
          <View key={task.id} style={styles.taskRow}>
            {/* Done indicator */}
            <View
              style={[
                styles.taskDot,
                task.done
                  ? { backgroundColor: palette.accent }
                  : { borderColor: palette.faint, borderWidth: 1.5 },
              ]}
            />
            <View style={styles.taskContent}>
              <Text
                style={[
                  styles.taskTitle,
                  { color: task.done ? palette.muted : palette.text },
                  task.done && styles.taskTitleDone,
                ]}
                numberOfLines={2}>
                {task.title}
              </Text>
              {task.time ? (
                <Text style={[styles.taskTime, { color: palette.muted }]}>
                  {task.time}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Nav   = NativeStackNavigationProp<RootStackParamList, 'Calendar'>;
type Route = RouteProp<RootStackParamList, 'Calendar'>;

export default function CalendarScreen() {
  const { palette } = useTheme();
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();

  const user = getAuth().currentUser;
  const uid  = user?.uid ?? '';

  // ── Initial date from params or today ──
  const initDate  = route.params?.initialDate ?? todayISO();
  const [initY, initM] = initDate.split('-').map(Number);

  const [selectedDate,   setSelectedDate]   = useState<string>(initDate);
  const [displayYear,    setDisplayYear]    = useState<number>(initY);
  const [displayMonth,   setDisplayMonth]   = useState<number>(initM);   // 1-based
  /**
   * Single discriminated union for the month's tasks (KAN-57).
   * Replaces `monthTasks: Task[]` so the loading and error states are explicit.
   */
  const [monthTasksState, setMonthTasksState] = useState<MonthTasksUiState>({ status: 'loading' });
  /** Incremented by "Try again" to re-trigger the subscription (KAN-58). */
  const [retryKey, setRetryKey] = useState(0);

  const today     = todayISO();
  const todayYear = Number(today.split('-')[0]);
  const todayMon  = Number(today.split('-')[1]);

  // ── Firestore subscription for displayed month ──
  useEffect(() => {
    if (!uid) { return; }
    const ym = toYearMonth(displayYear, displayMonth);
    setMonthTasksState({ status: 'loading' });
    return subscribeToTasksForMonth(uid, ym, (tasks) => {
      setMonthTasksState({ status: 'success', tasks });
    }, (err) => {
      console.warn('[CalendarScreen] tasks subscription error', err);
      setMonthTasksState({ status: 'error', message: 'Could not load tasks. Check your connection.' });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, displayYear, displayMonth, retryKey]);

  // Derive task array; falls back to [] when loading/errored so memos below
  // are always safe and the grid renders without data when unavailable.
  const monthTasks = monthTasksState.status === 'success' ? monthTasksState.tasks : [];

  // ── Day grid ──
  const grid = useMemo(
    () => buildGrid(displayYear, displayMonth),
    [displayYear, displayMonth],
  );

  // ── Per-day aggregates ──
  const dayStats = useMemo<Record<string, { done: number; total: number }>>(() => {
    const map: Record<string, { done: number; total: number }> = {};
    for (const t of monthTasks) {
      if (!map[t.date]) { map[t.date] = { done: 0, total: 0 }; }
      map[t.date].total += 1;
      if (t.done) { map[t.date].done += 1; }
    }
    return map;
  }, [monthTasks]);

  // ── Tasks for selected day (detail card) ──
  const selectedTasks = useMemo(
    () => monthTasks.filter(t => t.date === selectedDate).sort((a, b) => {
      const ta = a.time ?? '';
      const tb = b.time ?? '';
      return ta.localeCompare(tb);
    }),
    [monthTasks, selectedDate],
  );

  // ── Month navigation ──
  const goToPrevMonth = useCallback(() => {
    const { year, month } = shiftMonth(displayYear, displayMonth, -1);
    setDisplayYear(year);
    setDisplayMonth(month);
  }, [displayYear, displayMonth]);

  const goToNextMonth = useCallback(() => {
    const { year, month } = shiftMonth(displayYear, displayMonth, +1);
    setDisplayYear(year);
    setDisplayMonth(month);
  }, [displayYear, displayMonth]);

  const goToToday = useCallback(() => {
    setSelectedDate(today);
    setDisplayYear(todayYear);
    setDisplayMonth(todayMon);
  }, [today, todayYear, todayMon]);

  const onDayPress = useCallback((day: number) => {
    setSelectedDate(toDateISO(displayYear, displayMonth, day));
  }, [displayYear, displayMonth]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>

        <Pressable
          style={[styles.todayPill, { borderColor: palette.line }]}
          onPress={goToToday}
          accessibilityRole="button"
          accessibilityLabel="Jump to today">
          <Text style={[styles.todayPillLabel, { color: palette.text }]}>Today</Text>
        </Pressable>
      </View>

      {/* ── Month navigator ── */}
      <View style={styles.monthNav}>
        <Pressable
          onPress={goToPrevMonth}
          style={styles.monthNavBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <ChevronLeftIcon color={palette.muted} size={20} />
        </Pressable>

        <Text style={[styles.monthLabel, { color: palette.text }]}>
          {MONTH_NAMES[displayMonth - 1]} {displayYear}
        </Text>

        <Pressable
          onPress={goToNextMonth}
          style={styles.monthNavBtn}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <ChevronRightIcon color={palette.muted} size={20} />
        </Pressable>
      </View>

      {/* ── Weekday header ── */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text
            key={i}
            style={[styles.weekdayLabel, { width: CELL_W, color: palette.muted }]}>
            {label}
          </Text>
        ))}
      </View>

      {/* ── Day grid ── */}
      <View style={styles.grid}>
        {grid.map((day, i) => {
          if (day === null) {
            return <View key={`pad-${i}`} style={{ width: CELL_W, height: CELL_H }} />;
          }
          const iso     = toDateISO(displayYear, displayMonth, day);
          const stats   = dayStats[iso] ?? { done: 0, total: 0 };
          const isSel   = iso === selectedDate;
          const isTod   = iso === today;
          return (
            <DayCell
              key={iso}
              day={day}
              isToday={isTod}
              isSelected={isSel}
              done={stats.done}
              total={stats.total}
              onPress={() => onDayPress(day)}
            />
          );
        })}
      </View>

      {/* ── Detail card (scrollable) ── */}
      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={[
          styles.detailScrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.detailSectionLabel, { color: palette.muted }]}>
          TASKS
        </Text>
        {/* Error branch (KAN-58): show message + retry button */}
        {monthTasksState.status === 'error' ? (
          <View style={styles.errorWrap}>
            <Text
              style={[styles.detailEmptyText, { color: palette.muted }]}
              accessibilityRole="alert">
              {monthTasksState.message || 'Could not load tasks. Please try again.'}
            </Text>
            <Pressable
              onPress={() => setRetryKey(k => k + 1)}
              style={[styles.retryBtn, { borderColor: palette.line }]}
              accessibilityRole="button"
              accessibilityLabel="Try again">
              <Text style={[styles.retryLabel, { color: palette.text }]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <DetailCard
            dateISO={selectedDate}
            tasks={selectedTasks}
            isToday={selectedDate === today}
          />
        )}
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
  backBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  todayPill: {
    borderRadius:    9999,
    borderWidth:     1,
    paddingHorizontal: 14,
    paddingVertical:   6,
  },
  todayPillLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },

  // ── Month navigator ──
  monthNav: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical:   16,
  },
  monthNavBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Weekday row ──
  weekdayRow: {
    flexDirection: 'row',
    marginBottom:   4,
  },
  weekdayLabel: {
    textAlign:     'center',
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  0.8,
    paddingBottom:  6,
  },

  // ── Day grid ──
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
  },

  // ── Day cell ──
  cell: {
    width:          CELL_W,
    height:         CELL_H,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             4,
    borderRadius:   radius.card,
  },
  cellDay: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
    lineHeight:  16,
  },

  // ── Detail section ──
  detailScroll: {
    flex: 1,
    marginTop: 12,
  },
  detailScrollContent: {
    paddingHorizontal: spacing.page,
  },
  detailSectionLabel: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  1.2,
    marginBottom:   10,
  },
  detailEmptyText: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    paddingVertical: 12,
  },
  // ── Error retry (KAN-58) ──
  errorWrap: {
    gap: 8,
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

  // ── Detail card ──
  detailCard: {
    borderRadius:  radius.card,
    borderWidth:   StyleSheet.hairlineWidth,
    overflow:      'hidden',
    paddingHorizontal: 16,
    paddingTop:    16,
    paddingBottom: 12,
  },
  detailHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   14,
  },
  detailHeaderLeft: {
    flex: 1,
    gap:  4,
    marginRight: 16,
  },
  detailDateLabel: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  0.8,
  },
  detailFraction: {
    fontSize:   28,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
    lineHeight:  32,
  },
  detailFractionSuffix: {
    fontSize:   14,
    fontWeight: '400',
    fontFamily: 'Geist-Regular',
  },
  detailDivider: {
    height:        StyleSheet.hairlineWidth,
    marginBottom:  12,
  },

  // ── Task rows ──
  emptyLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    paddingVertical: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    paddingVertical: 10,
    gap:            12,
  },
  taskDot: {
    width:        16,
    height:       16,
    borderRadius: 8,
    marginTop:     2,
    flexShrink:   0,
  },
  taskContent: {
    flex: 1,
    gap:  2,
  },
  taskTitle: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    lineHeight: 20,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
  },
  taskTime: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
});
