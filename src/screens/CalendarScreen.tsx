/**
 * CalendarScreen — KAN-50, redesigned in KAN-145
 *
 * Layout (top → bottom):
 *   1. Top bar       — ← back  |  "Calendar"  |  "Today" pill
 *   2. Month nav     — ‹  Month  ›  /  year
 *   3. Weekday row   — S  M  T  W  T  F  S
 *   4. Day grid      — 7-col, each cell: ring (CalendarRing, 36×36) overlaid
 *                       with the day number, same center point
 *   5. Hairline divider
 *   6. Detail card   — slides up + fades in on selection change. Status label
 *                       (Today / Upcoming / Day complete / Past) + date +
 *                       stats line + large ring (68×68), achievement/run
 *                       chips, full task list with BrushStroke strikethrough,
 *                       "Open today" CTA when the selected day is today.
 *
 * Ring states (see CalendarRing.tsx):
 *   no ring     — day has no tasks, or is in the future
 *   "skipped"   — past, 0% done, had tasks → track only, opacity 0.5.
 *                 Not surfaced as a label anywhere — the detail card always
 *                 says "Past" (muted), never "Skipped". A past day's stats
 *                 are locked in at query time; a task finished on a later
 *                 day no longer counts toward the day it was originally due
 *                 once it rolls forward (KAN-146) — the calendar records
 *                 daily intention, not eventual completion.
 *   partial     — 0 < done < total → partial arc, ringFill, rounded tip
 *   complete    — done === total (> 0) → closed ring, accent, bold number
 *
 * Streak chains: a thin accent tick links two adjacent 100%-complete day
 * cells (skipped in the first column of a week row — nowhere to draw it,
 * and a run never visually crosses a month boundary since only the
 * currently-displayed month's tasks are loaded).
 *
 * Achievement milestone pips/chips: achievements are stored as a single map
 * on the user doc with only the MOST RECENT earnedAt per type (no per-day
 * history for repeatable achievements). So a pip/chip can only ever mark the
 * one day each achievement type was last earned — confirmed acceptable
 * scope for this ticket.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { useTheme } from '../theme';
import { spacing, categories as builtInCategories } from '../theme/tokens';
import { getTasksForMonth, getAchievements, getCategories, setTaskDone, getTrips } from '../services/firestore';
import { Task, Category, MonthTasksUiState, AchievementsMap, Trip } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ChevronLeftIcon, ChevronRightIcon, SuitcaseIcon } from '../components/AppIcon';
import { AchievementIcon, AchievementIconKey, ACHIEVEMENT_CATALOGUE } from '../components/AchievementTile';
import BrushStroke from '../components/BrushStroke';
import CalendarRing from '../components/CalendarRing';
import { todayISO } from '../utils/date';
import { COPY } from '../constants/copy';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
// Intentionally 10 (not the standard 22 page margin) — the design handoff
// specifies "Day Grid: padding: 0 10px 8px" explicitly for this 7-column
// grid; fitting 7 ring-bearing cells comfortably needs the tighter margin.
const GRID_H_PADDING = 10;
const CELL_GAP = 2;
// 7 columns + 6 inter-column gaps must fit inside the grid's horizontal padding.
const CELL_W = (SCREEN_W - GRID_H_PADDING * 2 - CELL_GAP * 6) / 7;

const RING_SM        = 36;
const RING_SM_STROKE = 2.6;
const RING_LG        = 68;
const RING_LG_STROKE = 5.5;

// Streak chain link geometry — computed so the tick's two ends land exactly
// on the tangent of each ring (touching, never overlapping the circle).
// Cells are square (width === height === CELL_W) with CELL_GAP between them.
// In the LATER cell's own coordinate space (0 = its left edge):
//   the previous ring's right edge sits at  -(CELL_W + CELL_GAP) + CELL_W/2 + RING_R
//   this ring's left edge sits at            CELL_W/2 - RING_R
const RING_R     = RING_SM / 2;
const CHAIN_LEFT  = -(CELL_W + CELL_GAP) + CELL_W / 2 + RING_R; // distance from cell's left edge (negative — reaches into the previous cell)
const CHAIN_RIGHT = CELL_W - (CELL_W / 2 - RING_R);             // distance from cell's right edge
const CHAIN_TOP   = CELL_W / 2 - 1; // vertical center of a CELL_W-tall cell, minus half the 2px line height

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const FULL_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CARD_ANIM_MS = 300;

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

/** Pretty label for the detail card header: "Friday, May 22". */
function formatFullDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${FULL_WEEKDAYS[date.getDay()]}, ${MONTH_NAMES[m - 1]} ${d}`;
}

/** Shift an ISO date string by `delta` days (handles month/year rollover). */
function isoAddDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return toDateISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

// ─── Category color resolution (matches TaskRow.tsx) ─────────────────────────

// Matches TaskRow.tsx's FALLBACK_CAT exactly — category colors are a fixed
// design-system constant set (see theme/tokens.ts `categories`), not
// theme-dependent, so this intentionally isn't a useTheme() palette value.
const FALLBACK_CAT = { color: '#8a8a85', label: 'Other' };

function resolveCategory(task: Task, customCategories: Category[]) {
  const builtIn = builtInCategories[task.category as keyof typeof builtInCategories];
  const custom  = customCategories.find(c => c.id === task.category);
  return builtIn
    ? { color: builtIn.color, label: builtIn.label }
    : custom
    ? { color: custom.color, label: custom.name }
    : FALLBACK_CAT;
}

// ─── CalTaskRow — one task inside the detail card ────────────────────────────

interface CalTaskRowProps {
  task: Task;
  customCategories: Category[];
  isLast: boolean;
  onToggle: (taskId: string, done: boolean) => void;
  isFuture: boolean;
}

function CalTaskRow({ task, customCategories, isLast, onToggle, isFuture }: CalTaskRowProps) {
  const { palette } = useTheme();
  const cat = resolveCategory(task, customCategories);
  const [titleWidth, setTitleWidth] = useState(0);

  const handleToggle = () => {
    if (isFuture) { return; }
    onToggle(task.id, !task.done);
  };

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      style={({ pressed }) => [
        styles.taskRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
        pressed && { opacity: 0.7 },
      ]}>
      {/* Check circle */}
      <View
        style={[
          styles.checkCircle,
          task.done
            ? { backgroundColor: cat.color, borderColor: cat.color }
            : { backgroundColor: 'transparent', borderColor: palette.faint },
        ]}>
        {task.done && (
          <Svg width={10} height={10} viewBox="0 0 12 12" fill="none">
            <Path
              d="M2.5 6.5L5 9l4.5-5.5"
              stroke="#fff"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>

      {/* Title with brush strikethrough when done */}
      <View style={styles.taskTitleWrap}>
        <View
          style={styles.taskTitleInner}
          onLayout={e => setTitleWidth(e.nativeEvent.layout.width)}>
          <Text
            style={[styles.taskTitle, { color: task.done ? palette.muted : palette.text }]}
            numberOfLines={1}>
            {task.title}
          </Text>
          {task.done && titleWidth > 0 && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <BrushStroke width={titleWidth} color={palette.accent} />
            </View>
          )}
        </View>
      </View>

      {/* Category dot */}
      <View
        style={[
          styles.categoryDot,
          { backgroundColor: cat.color, opacity: task.done ? 0.4 : 0.85 },
        ]}
      />
    </Pressable>
  );
}

// ─── CalAchChip — quiet badge chip used in the detail card ───────────────────

function CalAchChip({ icon, children }: { icon: AchievementIconKey; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.achChip,
        { backgroundColor: palette.nearTint2, borderColor: palette.nearBorder },
      ]}>
      <AchievementIcon icon={icon} color={palette.nearText} size={13} />
      <Text style={[styles.achChipLabel, { color: palette.nearText }]}>{children}</Text>
    </View>
  );
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  day:         number;
  isToday:     boolean;
  isSelected:  boolean;
  isFuture:    boolean;
  done:        number;
  total:       number;
  isComplete:  boolean;
  chainsBack:  boolean;
  /** Day falls within an active Trip's date range (KAN-234) — purely decorative, never affects ring/streak math. */
  inTripRange: boolean;
  achievement: { icon: AchievementIconKey; label: string } | undefined;
  onPress:     () => void;
}

function DayCell({
  day, isToday, isSelected, isFuture, done, total, isComplete, chainsBack, inTripRange, achievement, onPress,
}: DayCellProps) {
  const { palette, dark } = useTheme();

  const bg =
    isSelected ? palette.text :
    isToday    ? palette.surface :
    'transparent';

  const dayColor = isSelected ? palette.bg : isFuture ? palette.faint : palette.text;
  const dayWeight = (isComplete || isToday || isSelected) ? '600' as const : '400' as const;

  // Halo behind the milestone pip matches whatever background sits behind it.
  const pipHalo = isSelected ? palette.text : isToday ? palette.surface : palette.bg;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.cell, { backgroundColor: bg }]}
      accessibilityRole="button"
      accessibilityLabel={`${day}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}>

      {/* Streak chain link — reaches back toward yesterday's ring */}
      {chainsBack && (
        <View
          pointerEvents="none"
          style={[styles.chainLink, { backgroundColor: palette.accent }]}
        />
      )}

      {/* Trip range band — decorative only, never touches ring/streak state (KAN-234) */}
      {inTripRange && (
        <View
          pointerEvents="none"
          style={[styles.tripBand, { backgroundColor: palette.nearBorder }]}
        />
      )}

      {/* Ring layer — absolutely centered */}
      <View style={styles.ringLayer} pointerEvents="none">
        <CalendarRing
          size={RING_SM}
          stroke={RING_SM_STROKE}
          done={done}
          total={total}
          isFuture={isFuture}
          isSelected={isSelected}
          dark={dark}
          ringTrack={palette.ringTrack}
          ringFill={palette.ringFill}
          accent={palette.accent}
        />
      </View>

      {/* Day number */}
      <Text style={[styles.cellDay, { color: dayColor, fontWeight: dayWeight }]}>{day}</Text>

      {/* Today accent dot */}
      {isToday && !isSelected && (
        <View style={[styles.todayDot, { backgroundColor: palette.accent }]} />
      )}

      {/* Milestone pip — halo is a border, not a drop shadow (no shadows rule) */}
      {achievement && !isFuture && (
        <View
          style={[
            styles.milestonePip,
            { backgroundColor: palette.accent, borderColor: pipHalo },
          ]}
        />
      )}
    </Pressable>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Nav   = NativeStackNavigationProp<RootStackParamList, 'Calendar'>;
type Route = RouteProp<RootStackParamList, 'Calendar'>;

export default function CalendarScreen() {
  const { palette, dark } = useTheme();
  const insets      = useSafeAreaInsets();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();

  const user = getAuth().currentUser;
  const uid  = user?.uid ?? '';

  const initDate  = route.params?.initialDate ?? todayISO();
  const [initY, initM] = initDate.split('-').map(Number);

  const [selectedDate, setSelectedDate] = useState<string>(initDate);
  const [displayYear,  setDisplayYear]  = useState<number>(initY);
  const [displayMonth, setDisplayMonth] = useState<number>(initM); // 1-based
  const [monthTasksState, setMonthTasksState] = useState<MonthTasksUiState>({ status: 'loading' });
  const [retryKey, setRetryKey] = useState(0);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [achievementsMap, setAchievementsMap]   = useState<AchievementsMap>({});
  const [trips, setTrips] = useState<Trip[]>([]);

  const today     = todayISO();
  const todayYear = Number(today.split('-')[0]);
  const todayMon  = Number(today.split('-')[1]);

  // ── Tasks for displayed month — one-shot fetch, re-run on focus so
  // returning from the TaskForm modal (which stays stacked above and
  // doesn't unmount this screen) shows the mutation (KAN-218 follow-up).
  // `cancelled` guards against a stale response landing after a newer
  // month has been requested, after the screen has blurred, or after
  // unmount — useFocusEffect invokes this cleanup in all three cases.
  useFocusEffect(useCallback(() => {
    if (!uid) { return; }
    const ym = toYearMonth(displayYear, displayMonth);
    let cancelled = false;
    setMonthTasksState({ status: 'loading' });
    getTasksForMonth(uid, ym)
      .then(tasks => {
        if (cancelled) { return; }
        setMonthTasksState({ status: 'success', tasks });
      })
      .catch(err => {
        if (cancelled) { return; }
        console.warn('[CalendarScreen] tasks fetch error', err);
        setMonthTasksState({ status: 'error', message: 'Could not load tasks. Check your connection.' });
      });
    return () => { cancelled = true; };
  }, [uid, displayYear, displayMonth, retryKey]));

  // Toggling a task doesn't refetch the whole month — apply the flip locally
  // (setTaskDone itself persists it) so the checkbox updates immediately.
  const handleToggleTask = useCallback((taskId: string, done: boolean) => {
    setMonthTasksState(prev => prev.status === 'success'
      ? { status: 'success', tasks: prev.tasks.map(t => t.id === taskId ? { ...t, done } : t) }
      : prev);
    setTaskDone(uid, taskId, done).catch(err => {
      console.warn('[CalTaskRow] setTaskDone failed', err);
      setMonthTasksState(prev => prev.status === 'success'
        ? { status: 'success', tasks: prev.tasks.map(t => t.id === taskId ? { ...t, done: !done } : t) }
        : prev);
    });
  }, [uid]);

  // ── Custom categories — one-shot, mirrors TaskRow's resolution. Re-run on
  // focus so a category created via TaskForm's modal shows immediately.
  useFocusEffect(useCallback(() => {
    if (!uid) { return; }
    getCategories(uid).then(setCustomCategories).catch(() => {});
  }, [uid]));

  // ── Achievements map — drives milestone pips/chips. One-shot, re-run on
  // every focus so returning from Today after unlocking one shows it (KAN-218) ──
  useFocusEffect(useCallback(() => {
    if (!uid) { return; }
    getAchievements(uid).then(setAchievementsMap).catch(err => console.warn('[CalendarScreen] achievements error', err));
  }, [uid]));

  // ── Trips — drives the trip-range band (KAN-234). One-shot, re-run on
  // every focus so a trip planned/deleted from Places I Know shows up.
  // Purely additive: only DayCell's decorative band reads this — never
  // touches dayStats/runLength/ring math.
  useFocusEffect(useCallback(() => {
    if (!uid) { return; }
    getTrips(uid).then(setTrips).catch(err => console.warn('[CalendarScreen] trips error', err));
  }, [uid]));

  // Wrapped in its own useMemo so the fallback `[]` keeps a stable identity
  // across renders — otherwise every render (even unrelated ones) would
  // create a new empty array, defeating the downstream useMemo deps below.
  const monthTasks = useMemo(
    () => (monthTasksState.status === 'success' ? monthTasksState.tasks : []),
    [monthTasksState],
  );

  // ── Day grid ──
  const grid = useMemo(
    () => buildGrid(displayYear, displayMonth),
    [displayYear, displayMonth],
  );

  // ── Per-day aggregates, keyed by ISO date ──
  const dayStats = useMemo<Record<string, { done: number; total: number }>>(() => {
    const map: Record<string, { done: number; total: number }> = {};
    for (const t of monthTasks) {
      if (!map[t.date]) { map[t.date] = { done: 0, total: 0 }; }
      map[t.date].total += 1;
      if (t.done) { map[t.date].done += 1; }
    }
    return map;
  }, [monthTasks]);

  const isDayComplete = useCallback((iso: string): boolean => {
    const s = dayStats[iso];
    return !!s && s.total > 0 && s.done === s.total;
  }, [dayStats]);

  // Length of the consecutive-complete run containing `iso` (0 if not complete).
  // Never crosses a month boundary — only the displayed month's stats are loaded.
  const runLength = useCallback((iso: string): number => {
    if (!isDayComplete(iso)) { return 0; }
    let a = iso;
    let b = iso;
    while (isDayComplete(isoAddDays(a, -1))) { a = isoAddDays(a, -1); }
    while (isDayComplete(isoAddDays(b, 1)))  { b = isoAddDays(b, 1); }
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const da = new Date(ay, am - 1, ad).getTime();
    const db = new Date(by, bm - 1, bd).getTime();
    return Math.round((db - da) / 86400000) + 1;
  }, [isDayComplete]);

  // Dated trips only — a dateless trip has nothing to mark on the Calendar.
  const datedTrips = useMemo(
    () => trips.filter((t): t is Trip & { startDate: string; endDate: string } => !!t.startDate && !!t.endDate),
    [trips],
  );
  const isInTripRange = useCallback(
    (iso: string): boolean => datedTrips.some(t => iso >= t.startDate && iso <= t.endDate),
    [datedTrips],
  );

  // ── Achievement milestones for the displayed month ──
  // Only the single most-recent earnedAt per type is available (see header note).
  const achievementsByDay = useMemo<Record<number, { icon: AchievementIconKey; label: string }>>(() => {
    const map: Record<number, { icon: AchievementIconKey; label: string }> = {};
    for (const def of ACHIEVEMENT_CATALOGUE) {
      if (def.type === 'challenge_winner') { continue; } // not part of the day-attributable V1 set
      const entry = achievementsMap[def.type];
      if (!entry?.earnedAt) { continue; }
      const d = entry.earnedAt.toDate();
      if (d.getFullYear() === displayYear && d.getMonth() + 1 === displayMonth) {
        map[d.getDate()] = { icon: def.icon, label: def.label };
      }
    }
    return map;
  }, [achievementsMap, displayYear, displayMonth]);

  // ── Tasks for selected day (detail card) ──
  const selectedTasks = useMemo(
    () => monthTasks.filter(t => t.date === selectedDate).sort((a, b) => {
      const ta = a.time ?? '';
      const tb = b.time ?? '';
      return ta.localeCompare(tb);
    }),
    [monthTasks, selectedDate],
  );

  // ── Selected-day derived state ──
  const selDone   = selectedTasks.filter(t => t.done).length;
  const selTotal  = selectedTasks.length;
  const selPct    = selTotal > 0 ? Math.round((selDone / selTotal) * 100) : 0;
  const isSelToday    = selectedDate === today;
  const isSelFuture   = selectedDate > today;
  const isSelPast     = selectedDate < today;
  const isSelComplete = selTotal > 0 && selDone === selTotal;
  const isSelZero     = selTotal > 0 && selDone === 0 && isSelPast;
  const selRun        = runLength(selectedDate);
  const selAch        = achievementsByDay[Number(selectedDate.split('-')[2])];

  // ── Detail card slide-up animation (re-triggers on selection change) ──
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    cardOpacity.setValue(0);
    cardTranslate.setValue(14);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: CARD_ANIM_MS,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: CARD_ANIM_MS,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedDate, cardOpacity, cardTranslate]);

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

  // ── Status label (detail card) ──
  const statusLabel =
    isSelToday ? 'Today' :
    isSelFuture ? 'Upcoming' :
    isSelComplete ? 'Day complete' :
    'Past';
  const statusColor =
    isSelToday ? palette.accent :
    isSelFuture ? palette.faint :
    isSelComplete ? palette.accent :
    palette.muted;

  // ── Stats line copy ──
  const statsLine =
    selTotal === 0 ? 'No tasks' :
    isSelFuture ? `${selTotal} task${selTotal === 1 ? '' : 's'} planned` :
    isSelZero ? `${selTotal} task${selTotal === 1 ? '' : 's'} · none completed` :
    `${selDone} of ${selTotal} done · ${selPct}%`;

  const detailRingColor = isSelComplete ? palette.accent : palette.text;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: palette.text }]}>Calendar</Text>

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
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <ChevronLeftIcon color={palette.muted} size={18} />
        </Pressable>

        <View style={styles.monthLabelWrap}>
          <Text style={[styles.monthLabel, { color: palette.text }]}>
            {MONTH_NAMES[displayMonth - 1]}
          </Text>
          <Text style={[styles.yearLabel, { color: palette.muted }]}>
            {displayYear}
          </Text>
        </View>

        <Pressable
          onPress={goToNextMonth}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <ChevronRightIcon color={palette.muted} size={18} />
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
            return <View key={`pad-${i}`} style={{ width: CELL_W, height: CELL_W }} />;
          }
          const iso       = toDateISO(displayYear, displayMonth, day);
          const stats      = dayStats[iso] ?? { done: 0, total: 0 };
          const isSel      = iso === selectedDate;
          const isTod      = iso === today;
          const isFut      = iso > today;
          const isComplete = stats.total > 0 && stats.done === stats.total;
          const col        = i % 7;
          const chainsBack = isComplete && col > 0 && isDayComplete(isoAddDays(iso, -1));
          const ach        = achievementsByDay[day];
          const inTrip     = isInTripRange(iso);

          return (
            <DayCell
              key={iso}
              day={day}
              isToday={isTod}
              isSelected={isSel}
              isFuture={isFut}
              done={stats.done}
              total={stats.total}
              isComplete={isComplete}
              chainsBack={chainsBack}
              inTripRange={inTrip}
              achievement={ach}
              onPress={() => onDayPress(day)}
            />
          );
        })}
      </View>

      {/* ── "Going somewhere?" persistent entry (KAN-243) — always visible, no prefill ── */}
      <Pressable
        style={[styles.tripEntryRow, { borderColor: palette.line }]}
        onPress={() => navigation.navigate('TripPlanner')}
        accessibilityRole="button"
        accessibilityLabel={COPY.tripPlanner.entryRowA11y}>
        <SuitcaseIcon color={palette.muted} size={16} />
        <Text style={[styles.tripEntryLabel, { color: palette.text }]}>{COPY.tripPlanner.entryRowLabel}</Text>
        <ChevronRightIcon color={palette.faint} size={14} strokeWidth={1.8} />
      </Pressable>

      {/* ── Hairline divider ── */}
      <View style={[styles.divider, { backgroundColor: palette.line }]} />

      {/* ── Detail card — slides up + fades in on selection change ── */}
      <View style={styles.detailArea}>
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
          <Animated.ScrollView
            style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }}
            contentContainerStyle={[
              styles.detailScrollContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}>

            {/* Header row: status/date/stats + large ring */}
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderLeft}>
                <Text style={[styles.statusLabel, { color: statusColor }]}>
                  {statusLabel}
                </Text>
                <Text style={[styles.dateLabel, { color: palette.text }]} numberOfLines={1}>
                  {formatFullDateLabel(selectedDate)}
                </Text>
                <Text style={[styles.statsLabel, { color: palette.muted }]}>
                  {statsLine}
                </Text>
              </View>

              <View style={styles.detailRingWrap}>
                <CalendarRing
                  size={RING_LG}
                  stroke={RING_LG_STROKE}
                  done={selDone}
                  total={selTotal}
                  isFuture={false}
                  isSelected={false}
                  dark={dark}
                  ringTrack={palette.ringTrack}
                  ringFill={palette.ringFill}
                  accent={palette.accent}
                />
                <View style={styles.detailRingNumberWrap}>
                  <Text style={[styles.detailRingNumber, { color: detailRingColor }]}>
                    {Number(selectedDate.split('-')[2])}
                  </Text>
                </View>
              </View>
            </View>

            {/* Achievement / run chips */}
            {(selAch || (isSelComplete && selRun >= 2)) && (
              <View style={styles.chipsRow}>
                {isSelComplete && selRun >= 2 && (
                  <CalAchChip icon="flame">{`${selRun}-day run`}</CalAchChip>
                )}
                {selAch && (
                  <CalAchChip icon={selAch.icon}>{`${selAch.label} · unlocked`}</CalAchChip>
                )}
              </View>
            )}

            {/* Task list */}
            {selTotal === 0 ? (
              <Text style={[styles.emptyLabel, { color: palette.faint }]}>
                Nothing on this day.
              </Text>
            ) : (
              <View style={[styles.taskList, { borderTopColor: palette.line }]}>
                {selectedTasks.map((task, i) => (
                  <CalTaskRow
                    key={task.id}
                    task={task}
                    customCategories={customCategories}
                    isLast={i === selectedTasks.length - 1}
                    onToggle={handleToggleTask}
                    isFuture={isSelFuture}
                  />
                ))}
              </View>
            )}

            {/* Open today CTA */}
            {isSelToday && (
              <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.openTodayBtn, { backgroundColor: palette.text }]}
                accessibilityRole="button"
                accessibilityLabel="Open today">
                <Text style={[styles.openTodayLabel, { color: palette.bg }]}>Open today</Text>
                <ChevronRightIcon color={palette.bg} size={14} strokeWidth={2} />
              </Pressable>
            )}

            {/* "Going somewhere?" CTA — future days only (KAN-243) */}
            {isSelFuture && (
              <Pressable
                onPress={() => navigation.navigate('TripPlanner', { prefillStartDate: selectedDate })}
                style={[styles.openTodayBtn, { backgroundColor: palette.text }]}
                accessibilityRole="button"
                accessibilityLabel={COPY.tripPlanner.entryRowA11yWithDate(formatFullDateLabel(selectedDate))}>
                <Text style={[styles.openTodayLabel, { color: palette.bg }]}>{COPY.tripPlanner.entryRowLabel}</Text>
                <ChevronRightIcon color={palette.bg} size={14} strokeWidth={2} />
              </Pressable>
            )}
          </Animated.ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top bar ──
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             8,
    paddingHorizontal: 14,
    paddingTop:      12,
    paddingBottom:    6,
  },
  navBtn: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex:           1,
    fontSize:       17,
    fontWeight:     '500',
    fontFamily:     'Geist-Regular',
    letterSpacing:  -0.17,
  },
  todayPill: {
    borderRadius:    9999,
    borderWidth:     1,
    paddingHorizontal: 12,
    paddingVertical:    6,
  },
  todayPillLabel: {
    fontSize:   12.5,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },

  // ── Month navigator ──
  monthNav: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop:      2,
    paddingBottom:   10,
  },
  monthLabelWrap: { alignItems: 'center' },
  monthLabel: {
    fontSize:      19,
    fontWeight:    '500',
    fontFamily:    'Geist-Regular',
    letterSpacing: -0.38,
    lineHeight:     22,
  },
  yearLabel: {
    fontSize:     11.5,
    fontFamily:   'Geist-Regular',
    marginTop:     2,
    fontVariant:  ['tabular-nums'],
  },

  // ── Weekday row ──
  weekdayRow: {
    flexDirection:    'row',
    paddingHorizontal: GRID_H_PADDING,
    paddingBottom:      3,
  },
  weekdayLabel: {
    textAlign:     'center',
    fontSize:      10,
    fontWeight:    '500',
    fontFamily:    'Geist-Regular',
    letterSpacing:  1,
    textTransform: 'uppercase',
  },

  // ── Day grid ──
  grid: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    paddingHorizontal: GRID_H_PADDING,
    paddingBottom:      8,
    gap: CELL_GAP,
  },
  cell: {
    width:          CELL_W,
    height:         CELL_W,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   11,
  },
  ringLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  cellDay: {
    fontSize:    13.5,
    fontFamily:  'Geist-Regular',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.135,
    lineHeight:  16,
  },
  todayDot: {
    position:     'absolute',
    bottom:        4,
    width:         3,
    height:        3,
    borderRadius:  1.5,
  },
  milestonePip: {
    position:     'absolute',
    top:           2,
    right:         2,
    width:         5,
    height:        5,
    borderRadius:  4.5, // (width/2 + borderWidth) so the halo border stays circular
    borderWidth:   2,
  },
  chainLink: {
    position:    'absolute',
    top:          CHAIN_TOP,
    left:         CHAIN_LEFT,
    right:        CHAIN_RIGHT,
    height:       2,
    borderRadius: 1,
    opacity:      0.4,
  },
  tripBand: {
    position:     'absolute',
    bottom:        1,
    left:          6,
    right:         6,
    height:        2,
    borderRadius:  1,
  },

  // ── "Going somewhere?" persistent entry (KAN-243) ──
  tripEntryRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    marginHorizontal:  16,
    marginBottom:      10,
    paddingVertical:   10,
    paddingHorizontal: 12,
    borderRadius:      12,
    borderWidth:       1,
  },
  tripEntryLabel: {
    flex:       1,
    fontSize:   13.5,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },

  // ── Hairline divider ──
  divider: {
    height:           StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  // ── Detail card ──
  detailArea: {
    flex: 1,
  },
  detailScrollContent: {
    paddingHorizontal: spacing.page,
  },
  errorWrap: {
    paddingHorizontal: spacing.page,
    paddingTop: 16,
    gap: 8,
  },
  detailEmptyText: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    paddingVertical: 12,
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
  detailHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            16,
    paddingTop:     16,
    paddingBottom:  12,
  },
  detailHeaderLeft: {
    flex: 1,
  },
  statusLabel: {
    fontSize:      10.5,
    fontWeight:    '500',
    fontFamily:    'Geist-Regular',
    letterSpacing:  1.26,
    textTransform: 'uppercase',
    marginBottom:   4,
  },
  dateLabel: {
    fontSize:      19,
    fontWeight:    '500',
    fontFamily:    'Geist-Regular',
    letterSpacing: -0.38,
    lineHeight:     23,
  },
  statsLabel: {
    fontSize:    12.5,
    fontFamily:  'Geist-Regular',
    marginTop:    5,
    fontVariant: ['tabular-nums'],
  },
  detailRingWrap: {
    width:  RING_LG,
    height: RING_LG,
  },
  detailRingNumberWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  detailRingNumber: {
    fontSize:      22,
    fontWeight:    '500',
    fontFamily:    'Geist-Regular',
    letterSpacing: -0.66,
    fontVariant:   ['tabular-nums'],
    lineHeight:     24,
  },

  // ── Achievement / run chips ──
  chipsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
    paddingBottom: 14,
  },
  achChip: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            7,
    paddingHorizontal: 12,
    paddingVertical:    6,
    borderRadius:      9999,
    borderWidth:        1,
  },
  achChipLabel: {
    fontSize:   12,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },

  // ── Task list ──
  emptyLabel: {
    fontSize:      14,
    fontFamily:    'Geist-Regular',
    textAlign:     'center',
    letterSpacing: -0.14,
    paddingTop:     24,
  },
  taskList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            12,
    paddingVertical: 9,
  },
  checkCircle: {
    width:          20,
    height:         20,
    borderRadius:   10,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  taskTitleWrap: {
    flex:    1,
    minWidth: 0,
  },
  taskTitleInner: {
    alignSelf: 'flex-start',
    position:  'relative',
  },
  taskTitle: {
    fontSize:      14,
    fontFamily:    'Geist-Regular',
    letterSpacing: -0.14,
    lineHeight:     18,
  },
  categoryDot: {
    width:        7,
    height:       7,
    borderRadius: 3.5,
    flexShrink:   0,
  },

  // ── Open today CTA ──
  openTodayBtn: {
    marginTop:      18,
    paddingVertical: 12,
    borderRadius:    14,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:             8,
  },
  openTodayLabel: {
    fontSize:      14,
    fontWeight:    '500',
    fontFamily:    'Geist-Regular',
    letterSpacing: -0.14,
  },
});
