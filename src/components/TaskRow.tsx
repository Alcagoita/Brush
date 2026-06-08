/**
 * TaskRow — KAN-15 / KAN-13
 *
 * Layout:
 *   [checkbox 22×22] [title + chips]           [time]
 *
 * Interactions (KAN-13):
 *   - Tap the checkbox circle  → onToggle (marks done/undone)
 *   - Tap the title/chips area → onPress  (opens edit form)
 *
 * Checkbox states:
 *   unchecked — transparent fill, 1.5px text-colored border
 *   checked   — faint fill, no visible border
 */

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../theme';
import { categories } from '../theme/tokens';
import PoiChip from './PoiChip';
import BrushStroke from './BrushStroke';
import { BuildingIcon } from './AppIcon';
import { COPY } from '../constants/copy';
import { Task, Category } from '../types';

interface TaskRowProps {
  task: Task;
  /** Currently active (nearby) POI type string — null until KAN-22 wires geolocation. */
  nearbyPoiType?: string | null;
  /** Tap on checkbox — toggles done state. */
  onToggle: (taskId: string, done: boolean) => void;
  /** Tap on row body — opens the edit form (KAN-13). Optional; row body is non-interactive if omitted. */
  onPress?: (task: Task) => void;
  /** Custom categories from Firestore — used to resolve non-built-in category IDs (KAN-61). */
  customCategories?: Category[];
}

/** Fallback for tasks whose category ID doesn't match any known category. */
const FALLBACK_CAT = { color: '#8a8a85', label: 'Other' };

export default function TaskRow({ task, nearbyPoiType = null, onToggle, onPress, customCategories = [] }: TaskRowProps) {
  const { palette } = useTheme();
  const builtIn = categories[task.category as keyof typeof categories];
  const custom  = customCategories.find(c => c.id === task.category);
  const cat     = builtIn
    ? { color: builtIn.color, label: builtIn.label }
    : custom
    ? { color: custom.color,  label: custom.name }
    : FALLBACK_CAT;

  // ── Checkbox fill animation ──
  const fillProgress = useSharedValue(task.done ? 1 : 0);
  useEffect(() => {
    fillProgress.value = withTiming(task.done ? 1 : 0, { duration: 200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.done]);

  // ── Brushstroke animation (KAN-109) ──
  // titleDisplayWidth is regular React state so BrushStroke re-renders with the
  // correct SVG width after onLayout fires.
  // titleWidth is the same value as a shared value so the animated-style worklet
  // (which runs on the UI thread) can read it without JS ↔ UI thread crossing.
  const [titleDisplayWidth, setTitleDisplayWidth] = useState(0);
  const titleWidth  = useSharedValue(0);
  const strokeScale = useSharedValue(task.done ? 1 : 0);

  useEffect(() => {
    if (task.done) {
      strokeScale.value = withTiming(1, {
        duration: 380,
        easing:   Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      // Snap back instantly when un-completing a task
      strokeScale.value = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.done]);

  // Simulates transformOrigin: 'left center' by compensating for RN's
  // centre-based scaleX with a matching translateX.
  //
  // Android note: scaleX: 0 at mount zeroes the GPU layer and can prevent
  // repaints during animation. Pairing with opacity: s avoids this — the
  // layer is invisible either way, but opacity keeps it repaint-eligible.
  const animatedStrokeStyle = useAnimatedStyle(() => {
    const s = strokeScale.value;
    const w = titleWidth.value;
    return {
      opacity: s,
      transform: [
        { translateX: -(w / 2) * (1 - s) },
        { scaleX: s },
      ],
    };
  });

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fillProgress.value,
    transform: [{ scale: 0.55 + fillProgress.value * 0.1 }],
  }));

  // ── Brush-away wash animation (KAN-134) ──────────────────────────────────────
  // Fires only on false → true transition. Skipped if reduce-motion is on.
  const sweepProgress = useSharedValue(0);
  const rowWidth      = useSharedValue(0);
  const [sweeping, setSweeping] = useState(false);
  const prevDoneRef   = useRef(task.done);

  useEffect(() => {
    if (task.done && !prevDoneRef.current) {
      AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
        if (reduced) {
          prevDoneRef.current = task.done;
          return;
        }
        setSweeping(true);
        sweepProgress.value = 0;
        sweepProgress.value = withTiming(1, {
          duration: 660,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }, (finished) => {
          if (finished) { runOnJS(setSweeping)(false); }
        });
      });
    }
    prevDoneRef.current = task.done;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.done]);

  // scaleX anchored to left edge via translateX compensation.
  const sweepStyle = useAnimatedStyle(() => {
    const p     = sweepProgress.value;
    const scale = interpolate(p, [0, 0.58, 1], [0, 1, 1]);
    const w     = rowWidth.value;
    return {
      opacity:   interpolate(p, [0, 0.01, 0.58, 1], [0, 0.9, 0.9, 0]),
      transform: [
        { translateX: -(w / 2) * (1 - scale) },
        { scaleX: scale },
      ],
    };
  });

  return (
    <View
      style={[styles.row, { borderBottomColor: palette.line }]}
      onLayout={e => { rowWidth.value = e.nativeEvent.layout.width; }}>

      {/* ── Checkbox — toggles done ── */}
      <Pressable
        onPress={() => onToggle(task.id, !task.done)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityLabel={task.done ? COPY.taskRow.unbrush(task.title) : COPY.taskRow.brushAway(task.title)}
        accessibilityState={{ checked: task.done }}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
        <View style={[styles.checkbox, { borderColor: task.done ? palette.faint : palette.text }]}>
          <Animated.View
            style={[styles.checkboxFill, { backgroundColor: palette.faint }, fillStyle]}
          />
        </View>
      </Pressable>

      {/* ── Body: title + chips + time — opens edit form ── */}
      <Pressable
        style={({ pressed }) => [styles.body, { opacity: pressed && onPress ? 0.65 : 1 }]}
        onPress={onPress ? () => onPress(task) : undefined}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={onPress ? `Edit ${task.title}` : task.title}>

        <View style={styles.content}>
          {/* Title + brushstroke overlay */}
          <View style={styles.titleWrapper}>
            <Text
              style={[styles.title, { color: task.done ? palette.muted : palette.text }]}
              numberOfLines={2}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                titleWidth.value = w;
                setTitleDisplayWidth(w);
              }}>
              {task.title}
            </Text>
            {/* Animated brushstroke — replaces text-decoration: line-through.
                Only mounted when task.done so un-completing causes an instant
                unmount (no fade-out animation needed per spec). */}
            {task.done && (
              <Animated.View
                pointerEvents="none"
                style={[styles.strokeOverlay, animatedStrokeStyle]}>
                <BrushStroke width={titleDisplayWidth} color={palette.accent} />
              </Animated.View>
            )}
          </View>

          <View style={styles.chips}>
            {/* Category chip */}
            <View
              style={[
                styles.catChip,
                {
                  backgroundColor: cat.color + '1a',
                  borderColor:     cat.color + '40',
                },
              ]}>
              <Text style={[styles.catLabel, { color: cat.color }]}>
                {cat.label}
              </Text>
            </View>

            {/* POI chip */}
            {task.poi && (
              <PoiChip
                poi={task.poi}
                isNearby={task.poi === nearbyPoiType}
              />
            )}

            {/* Store chip (KAN-76) — shown when a specific store is tagged */}
            {task.store && (
              <View
                style={[
                  styles.storeChip,
                  { backgroundColor: palette.surface, borderColor: palette.line },
                ]}>
                <BuildingIcon color={palette.accent} size={10} />
                <Text
                  style={[styles.storeChipLabel, { color: palette.muted }]}
                  numberOfLines={1}>
                  {task.store.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Scheduled time */}
        {task.time ? (
          <Text style={[styles.time, { color: palette.muted }]}>
            {task.time}
          </Text>
        ) : null}
      </Pressable>

      {/* Brush-away wash — peach gradient sweep L→R on task completion (KAN-134) */}
      {sweeping && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { zIndex: 3 }, sweepStyle]}>
          <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id={`brushSweep_${task.id}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0"   stopColor={palette.nearTint}  stopOpacity="1" />
                <Stop offset="0.6" stopColor={palette.nearTint2} stopOpacity="1" />
                <Stop offset="1"   stopColor={palette.accent}    stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#brushSweep_${task.id})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 14,
    gap:            12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width:          22,
    height:         22,
    borderRadius:   11,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkboxFill: {
    width:        22,
    height:       22,
    borderRadius: 11,
  },
  body: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  content: {
    flex: 1,
    gap:  6,
  },
  titleWrapper: {
    position: 'relative',
  },
  strokeOverlay: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    // No overflow: 'hidden' — on Android it clips incorrectly when combined
    // with scaleX/translateX transforms.
  },
  title: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    alignItems:    'center',
    gap:           6,
  },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      9999,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  catLabel: {
    fontSize:   11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  time: {
    fontSize:    12,
    fontFamily:  'Geist-Regular',
    fontVariant: ['tabular-nums'],
    alignSelf:   'flex-start',
    paddingTop:  1,
  },
  // ── Store chip (KAN-76) ──
  storeChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      9999,
    borderWidth:       StyleSheet.hairlineWidth,
    maxWidth:          140,
  },
  storeChipLabel: {
    fontSize:   11,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
    flexShrink: 1,
  },
});
