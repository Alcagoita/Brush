/**
 * MiniCalendar — a compact, in-app-styled single-month date picker.
 *
 * Replaces the native @react-native-community/datetimepicker modal (Android's
 * default Material dialog, iOS's native inline UIKit widget) with a grid that
 * matches the rest of the app's design language (Geist type, theme palette,
 * rounded cells) — same visual family as CalendarScreen's day grid, without
 * the rings/tasks/achievements it doesn't need here.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, ChevronRightIcon } from './AppIcon';
import { COPY } from '../constants/copy';

export interface MiniCalendarProps {
  /** Selected date (YYYY-MM-DD), or null if none picked yet. */
  value: string | null;
  onChange: (iso: string) => void;
  /** Dates before this (YYYY-MM-DD) are shown but not selectable. */
  minimumDate?: string;
}

function toDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  if (m < 1)  { m = 12; y -= 1; }
  if (m > 12) { m = 1;  y += 1; }
  return { year: y, month: m };
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth  = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) { cells.push(null); }
  for (let d = 1; d <= daysInMonth; d++) { cells.push(d); }
  while (cells.length % 7 !== 0) { cells.push(null); }
  return cells;
}

export default function MiniCalendar({ value, onChange, minimumDate }: MiniCalendarProps) {
  const { palette } = useTheme();

  const initial = value ?? minimumDate ?? toDateISO(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  const [initY, initM] = initial.split('-').map(Number);
  const [displayYear, setDisplayYear]   = useState(initY);
  const [displayMonth, setDisplayMonth] = useState(initM);

  const grid = useMemo(() => buildGrid(displayYear, displayMonth), [displayYear, displayMonth]);
  const monthLabel = COPY.calendar.monthNamesFull[displayMonth - 1];

  return (
    <View style={[styles.root, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => { const { year, month } = shiftMonth(displayYear, displayMonth, -1); setDisplayYear(year); setDisplayMonth(month); }}
          hitSlop={8}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel={COPY.calendar.previousMonthA11y}>
          <ChevronLeftIcon color={palette.muted} size={16} />
        </Pressable>
        <Text style={[styles.navLabel, { color: palette.text }]}>{monthLabel} {displayYear}</Text>
        <Pressable
          onPress={() => { const { year, month } = shiftMonth(displayYear, displayMonth, 1); setDisplayYear(year); setDisplayMonth(month); }}
          hitSlop={8}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel={COPY.calendar.nextMonthA11y}>
          <ChevronRightIcon color={palette.muted} size={16} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {COPY.calendar.weekdayLabels.map((label, i) => (
          <Text key={i} style={[styles.weekdayLabel, { color: palette.muted }]}>{label}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((day, i) => {
          if (day === null) { return <View key={`pad-${i}`} style={styles.cell} />; }
          const iso = toDateISO(displayYear, displayMonth, day);
          const isSelected = iso === value;
          const isDisabled = !!minimumDate && iso < minimumDate;
          return (
            <Pressable
              key={iso}
              disabled={isDisabled}
              onPress={() => onChange(iso)}
              style={[
                styles.cell,
                styles.cellPressable,
                isSelected && { backgroundColor: palette.accent },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}>
              <Text style={[
                styles.cellDay,
                { color: isSelected ? palette.onAccent : isDisabled ? palette.faint : palette.text },
              ]}>
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 14, fontWeight: '500', fontFamily: 'Geist-Medium' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    width: CELL_SIZE, textAlign: 'center',
    fontSize: 10, fontFamily: 'Geist-Regular', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  cellPressable: { borderRadius: CELL_SIZE / 2 },
  cellDay: { fontSize: 13.5, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },
});
