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

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { categories } from '../theme/tokens';
import PoiChip from './PoiChip';
import BrushStroke from './BrushStroke';
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
  const animatedStrokeStyle = useAnimatedStyle(() => {
    const s = strokeScale.value;
    const w = titleWidth.value;
    return {
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

  return (
    <View
      style={[styles.row, { borderBottomColor: palette.line }]}>

      {/* ── Checkbox — toggles done ── */}
      <Pressable
        onPress={() => onToggle(task.id, !task.done)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark ${task.title} as ${task.done ? 'undone' : 'done'}`}
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
          </View>
        </View>

        {/* Scheduled time */}
        {task.time ? (
          <Text style={[styles.time, { color: palette.muted }]}>
            {task.time}
          </Text>
        ) : null}
      </Pressable>
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
    overflow: 'hidden',
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
});
