/**
 * MiniTimePicker — a compact, in-app-styled time picker (KAN-280).
 *
 * Same rationale as MiniCalendar: replaces the native
 * @react-native-community/datetimepicker modal with scrollable columns that
 * match the rest of the app's design language (Geist type, theme palette,
 * rounded cells) instead of OS chrome.
 *
 * Value/onChange always use 24-hour "HH:MM" — the app's persisted Task.time
 * format. Display follows the device's 12h/24h preference automatically via
 * Intl.DateTimeFormat, with no manual toggle.
 */

import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius as radii } from '../theme/tokens';
import { COPY } from '../constants/copy';

export interface MiniTimePickerProps {
  /** Selected time ("HH:MM", 24h), or null if none picked yet. */
  value: string | null;
  onChange: (hhmm: string) => void;
}

function detectHour12(): boolean {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === true;
  } catch {
    return false;
  }
}

function to12Hour(hour24: number): { hour12: number; isPM: boolean } {
  const isPM = hour24 >= 12;
  let hour12 = hour24 % 12;
  if (hour12 === 0) { hour12 = 12; }
  return { hour12, isPM };
}

function to24Hour(hour12: number, isPM: boolean): number {
  if (hour12 === 12) { return isPM ? 12 : 0; }
  return isPM ? hour12 + 12 : hour12;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;

function Column({
  testIDPrefix,
  items,
  selectedIndex,
  onSelect,
  formatLabel,
  a11yLabel,
  palette,
}: {
  testIDPrefix: string;
  items: number[];
  selectedIndex: number;
  onSelect: (value: number) => void;
  formatLabel: (n: number) => string;
  a11yLabel: string;
  palette: ReturnType<typeof useTheme>['palette'];
}) {
  return (
    <FlatList
      style={styles.column}
      contentContainerStyle={styles.columnContent}
      data={items}
      keyExtractor={(n) => String(n)}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={a11yLabel}
      initialScrollIndex={Math.max(0, selectedIndex - Math.floor(VISIBLE_ROWS / 2))}
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      // Lists here max out at 60 rows of plain Text — trivial to mount in
      // full. Keeps every row tappable immediately (no virtualization gap on
      // first render) while still getting getItemLayout's cheap initial scroll.
      initialNumToRender={items.length}
      renderItem={({ item: n }) => {
        const isSelected = n === items[selectedIndex];
        return (
          <Pressable
            testID={`${testIDPrefix}-${n}`}
            onPress={() => onSelect(n)}
            hitSlop={4}
            style={[styles.row, isSelected && { backgroundColor: palette.accent }]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}>
            <Text style={[
              styles.rowLabel,
              { color: isSelected ? palette.onAccent : palette.text },
            ]}>
              {formatLabel(n)}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

export default function MiniTimePicker({ value, onChange }: MiniTimePickerProps) {
  const { palette } = useTheme();
  const hour12Mode = useMemo(detectHour12, []);

  const now = new Date();
  const [initHour, initMinute] = value
    ? value.split(':').map(Number)
    : [now.getHours(), 0];

  const hours24 = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const hours12 = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const { hour12, isPM } = to12Hour(initHour);

  function commit(hour24: number, minute: number) {
    onChange(`${pad2(hour24)}:${pad2(minute)}`);
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <View style={styles.columns}>
        {hour12Mode ? (
          <Column
            testIDPrefix="time-hour12"
            items={hours12}
            selectedIndex={hours12.indexOf(hour12)}
            onSelect={(h) => commit(to24Hour(h, isPM), initMinute)}
            formatLabel={(h) => pad2(h)}
            a11yLabel={COPY.timePicker.hourA11y}
            palette={palette}
          />
        ) : (
          <Column
            testIDPrefix="time-hour24"
            items={hours24}
            selectedIndex={hours24.indexOf(initHour)}
            onSelect={(h) => commit(h, initMinute)}
            formatLabel={pad2}
            a11yLabel={COPY.timePicker.hourA11y}
            palette={palette}
          />
        )}
        <Text style={[styles.colon, { color: palette.muted }]}>:</Text>
        <Column
          testIDPrefix="time-minute"
          items={minutes}
          selectedIndex={initMinute}
          onSelect={(m) => commit(hour12Mode ? to24Hour(hour12, isPM) : initHour, m)}
          formatLabel={pad2}
          a11yLabel={COPY.timePicker.minuteA11y}
          palette={palette}
        />
        {hour12Mode && (
          <View style={styles.meridiemColumn}>
            {(['AM', 'PM'] as const).map((label, i) => {
              const selected = (i === 1) === isPM;
              return (
                <Pressable
                  key={label}
                  testID={`time-meridiem-${label}`}
                  onPress={() => commit(to24Hour(hour12, i === 1), initMinute)}
                  style={[styles.meridiemBtn, selected && { backgroundColor: palette.accent }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}>
                  <Text style={[
                    styles.meridiemLabel,
                    { color: selected ? palette.onAccent : palette.text },
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 12,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  column: {
    height: ROW_HEIGHT * VISIBLE_ROWS,
    width: 52,
  },
  columnContent: {
    alignItems: 'center',
  },
  row: {
    height: ROW_HEIGHT,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.ctaBtn,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'Geist-Medium',
    fontVariant: ['tabular-nums'],
  },
  colon: {
    fontSize: 16,
    fontFamily: 'Geist-Medium',
  },
  meridiemColumn: {
    gap: 6,
  },
  meridiemBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.ctaBtn,
  },
  meridiemLabel: {
    fontSize: 12,
    fontFamily: 'Geist-Medium',
  },
});
