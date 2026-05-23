/**
 * TaskRow — KAN-15
 *
 * Layout:
 *   [checkbox 22×22] [title + chips]           [time]
 *
 * Checkbox states:
 *   unchecked — transparent fill, 1.5px text-colored border
 *   checked   — faint fill, no visible border
 *
 * Chips below title:
 *   Category chip — tinted with the category's brand color
 *   POI chip      — PoiChip component (active state wired in KAN-46)
 *
 * Toggle interaction:
 *   Tapping anywhere on the row calls onToggle(taskId, !done).
 *   KAN-14 will add optimistic updates and haptic feedback on top of this.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { categories } from '../theme/tokens';
import PoiChip from './PoiChip';
import { PoiType, Task } from '../types';

interface TaskRowProps {
  task: Task;
  /** Currently active (nearby) POI type — null until KAN-22 wires geolocation. */
  nearbyPoiType?: PoiType | null;
  onToggle: (taskId: string, done: boolean) => void;
}

export default function TaskRow({ task, nearbyPoiType = null, onToggle }: TaskRowProps) {
  const { palette } = useTheme();
  const cat = categories[task.category];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: palette.line, opacity: pressed ? 0.65 : 1 },
      ]}
      onPress={() => onToggle(task.id, !task.done)}
      accessibilityRole="checkbox"
      accessibilityLabel={task.title}
      accessibilityState={{ checked: task.done }}>

      {/* ── Checkbox ── */}
      <View
        style={[
          styles.checkbox,
          task.done
            ? { backgroundColor: palette.faint, borderColor: palette.faint }
            : { backgroundColor: 'transparent', borderColor: palette.text },
        ]}
      />

      {/* ── Content: title + chips ── */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: task.done ? palette.muted : palette.text,
              textDecorationLine: task.done ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.chips}>
          {/* Category chip */}
          <View
            style={[
              styles.catChip,
              {
                backgroundColor: cat.color + '1a', // ~10% opacity tint
                borderColor:     cat.color + '40', // ~25% opacity border
              },
            ]}>
            <Text style={[styles.catLabel, { color: cat.color }]}>
              {cat.label}
            </Text>
          </View>

          {/* POI chip — isNearby driven by KAN-22/KAN-46 */}
          {task.poi && (
            <PoiChip
              poi={task.poi}
              isNearby={task.poi === nearbyPoiType}
            />
          )}
        </View>
      </View>

      {/* ── Scheduled time ── */}
      {task.time ? (
        <Text style={[styles.time, { color: palette.muted }]}>
          {task.time}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Geist-Regular',
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  time: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
    alignSelf: 'flex-start',
    paddingTop: 1,
  },
});
