/**
 * MiniTimePicker — a compact, in-app-styled time picker (KAN-280).
 *
 * Same rationale as MiniCalendar: replaces the native
 * @react-native-community/datetimepicker modal with scrollable columns that
 * match the rest of the app's design language (Geist type, theme palette,
 * rounded cells) instead of OS chrome.
 *
 * Value/onChange always use 24-hour "HH:MM" — the app's persisted Task.time
 * format. Display defaults to the device's 12h/24h preference (via
 * Intl.DateTimeFormat) but a small in-picker toggle lets the user override it
 * for the current session (component state only — no settings store exists
 * for a preference this granular).
 *
 * Per KAN-157: never animate layout props (top/left/width/height) per frame
 * on Fabric — ShadowTree commit freeze/crash risk. Every animation below
 * drives only transform/opacity.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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

function fireRowHaptic(): void {
  Vibration.vibrate(Platform.OS === 'android' ? 8 : 1);
}

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const CENTER_ROW_OFFSET = Math.floor(VISIBLE_ROWS / 2);

// ─── Format toggle geometry (KAN-280 polish) ───────────────────────────────────
// Superscript-style cluster: both labels sit at the same anchor and diverge
// purely via transform (translate + scale) — Fabric-safe per the note above.
// Tuned empirically for a 15px base / 11px exponent pairing; nudge on sight.
const TOGGLE_BASE_W = 52;
const TOGGLE_BASE_H = 26;
const TOGGLE_EXP_SCALE = 11 / 15;
const TOGGLE_EXP_DX = 34;   // exponent sits this far right of the base's left edge
const TOGGLE_ANCHOR_TOP = 13; // base's resting top offset — leaves room for the exponent to rise above it
const TOGGLE_EXP_DY = -TOGGLE_ANCHOR_TOP; // raises the exponent's center to the base pill's top edge

function Row({
  testID,
  label,
  isSelected,
  onPress,
  index,
  scrollY,
  palette,
}: {
  testID: string;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  index: number;
  scrollY: Animated.SharedValue<number>;
  palette: ReturnType<typeof useTheme>['palette'];
}) {
  // Fades a non-selected row toward `faint` the further it drifts from the
  // scroll's center line — purely decorative, never touches layout.
  const fadeStyle = useAnimatedStyle(() => {
    const centerIndex = scrollY.value / ROW_HEIGHT + CENTER_ROW_OFFSET;
    const distance = Math.min(Math.abs(index - centerIndex), 2);
    return { opacity: interpolate(distance, [0, 2], [1, 0.45], Extrapolation.CLAMP) };
  });

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={4}
      style={[styles.row, isSelected && { backgroundColor: palette.accent }]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}>
      <Animated.Text style={[
        styles.rowLabel,
        { color: isSelected ? palette.onAccent : palette.text },
        !isSelected && fadeStyle,
      ]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

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
  const initialOffset = Math.max(0, selectedIndex - CENTER_ROW_OFFSET) * ROW_HEIGHT;
  const scrollY = useSharedValue(initialOffset);
  const lastHapticIndex = useSharedValue(Math.round(initialOffset / ROW_HEIGHT));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      const idx = Math.round(e.contentOffset.y / ROW_HEIGHT);
      if (idx !== lastHapticIndex.value) {
        lastHapticIndex.value = idx;
        runOnJS(fireRowHaptic)();
      }
    },
  });

  // Commits whichever row lands at the center line once the scroll settles —
  // covers both a momentum fling and a slow drag with no momentum.
  function commitNearestRow(offsetY: number) {
    const idx = Math.min(Math.max(Math.round(offsetY / ROW_HEIGHT), 0), items.length - 1);
    onSelect(items[idx]);
  }

  return (
    <Animated.ScrollView
      style={styles.column}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={a11yLabel}
      // Android disables scrolling on a nested ScrollView by default when an
      // ancestor (TaskFormScreen's body) scrolls the same direction — this is
      // what makes the picker un-scrollable on device despite working fine
      // in tests/iOS. Opts this inner scroll back in.
      nestedScrollEnabled
      snapToInterval={ROW_HEIGHT}
      decelerationRate="fast"
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      onMomentumScrollEnd={(e) => commitNearestRow(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => commitNearestRow(e.nativeEvent.contentOffset.y)}
      contentOffset={{ x: 0, y: initialOffset }}>
      {items.map((n, i) => (
        <Row
          key={n}
          testID={`${testIDPrefix}-${n}`}
          label={formatLabel(n)}
          isSelected={i === selectedIndex}
          onPress={() => onSelect(n)}
          index={i}
          scrollY={scrollY}
          palette={palette}
        />
      ))}
    </Animated.ScrollView>
  );
}

function FormatToggle({
  hour12Mode,
  onToggle,
  palette,
}: {
  hour12Mode: boolean;
  onToggle: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}) {
  // 0 → "12h" is the base (selected); 1 → "24h" is the base.
  const t = useSharedValue(hour12Mode ? 0 : 1);

  useEffect(() => {
    t.value = withTiming(hour12Mode ? 0 : 1, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [hour12Mode, t]);

  const slot12Style = useAnimatedStyle(() => {
    const baseness = 1 - t.value;
    return {
      transform: [
        { translateX: interpolate(baseness, [0, 1], [TOGGLE_EXP_DX, 0], Extrapolation.CLAMP) },
        { translateY: interpolate(baseness, [0, 1], [TOGGLE_EXP_DY, 0], Extrapolation.CLAMP) },
        { scale: interpolate(baseness, [0, 1], [TOGGLE_EXP_SCALE, 1], Extrapolation.CLAMP) },
      ],
    };
  });
  const pill12Style = useAnimatedStyle(() => ({
    opacity: interpolate(1 - t.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const slot24Style = useAnimatedStyle(() => {
    const baseness = t.value;
    return {
      transform: [
        { translateX: interpolate(baseness, [0, 1], [TOGGLE_EXP_DX, 0], Extrapolation.CLAMP) },
        { translateY: interpolate(baseness, [0, 1], [TOGGLE_EXP_DY, 0], Extrapolation.CLAMP) },
        { scale: interpolate(baseness, [0, 1], [TOGGLE_EXP_SCALE, 1], Extrapolation.CLAMP) },
      ],
    };
  });
  const pill24Style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Pressable
      onPress={onToggle}
      style={styles.formatToggle}
      hitSlop={{ top: 4, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="button"
      testID="time-format-toggle"
      accessibilityLabel={COPY.timePicker.clockFormatA11y(hour12Mode ? '12' : '24', hour12Mode ? '24' : '12')}>
      <Animated.View style={[styles.formatSlot, slot12Style]}>
        <Animated.View style={[styles.formatPill, { backgroundColor: palette.accent }, pill12Style]} />
        <Text style={[styles.formatLabel, { color: hour12Mode ? palette.onAccent : palette.muted }]}>12h</Text>
      </Animated.View>
      <Animated.View style={[styles.formatSlot, slot24Style]}>
        <Animated.View style={[styles.formatPill, { backgroundColor: palette.accent }, pill24Style]} />
        <Text style={[styles.formatLabel, { color: !hour12Mode ? palette.onAccent : palette.muted }]}>24h</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function MiniTimePicker({ value, onChange }: MiniTimePickerProps) {
  const { palette } = useTheme();
  const deviceHour12 = useMemo(detectHour12, []);
  const [hour12Override, setHour12Override] = useState<boolean | null>(null);
  const hour12Mode = hour12Override ?? deviceHour12;

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
      <FormatToggle
        hour12Mode={hour12Mode}
        onToggle={() => setHour12Override(!hour12Mode)}
        palette={palette}
      />
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
        {/* Gone entirely (not hidden/grayed) in 24h mode — the columns
            re-center in the freed space via `columns`'s justifyContent. */}
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
  formatToggle: {
    alignSelf: 'flex-end',
    width: TOGGLE_BASE_W + TOGGLE_EXP_DX,
    height: TOGGLE_ANCHOR_TOP + TOGGLE_BASE_H,
    marginBottom: 8,
  },
  formatSlot: {
    position: 'absolute',
    top: TOGGLE_ANCHOR_TOP,
    left: 0,
    width: TOGGLE_BASE_W,
    height: TOGGLE_BASE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatPill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.chip,
  },
  formatLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: 0.3,
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
