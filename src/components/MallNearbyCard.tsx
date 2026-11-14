/**
 * MallNearbyCard — KAN-514
 *
 * What Today shows instead of NearbyCard while the user is inside a shopping
 * centre (KAN-513). Each row is an open task the centre can solve: the task,
 * then the place and its FLOOR — never a distance. GPS can't tell floors
 * apart under a roof, and many units sit on the centre's own coordinate, so a
 * distance here would be invented (docs/KAN-512-mall-floors.md).
 *
 * Layout mirrors NearbyCard (1 px border, no shadow, PoiIcon tiles, Geist) in
 * its own colour family (`mall*` tokens). No floor section headers: rows are
 * sorted lowest floor first and each carries its own floor, so a row that
 * swaps to another floor never jumps section.
 *
 * "Try another place" lives on each row and swaps that row only, wrapping
 * after the last candidate. The choice is held in component state for this
 * visit — Today remounts the card per centre, so the next entry starts over,
 * and nothing is ever stored (no place is pinned).
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius } from '../theme/tokens';
import { PoiIcon } from './AppIcon';
import { COPY } from '../constants/copy';
import { formatFloors, nextCandidateIndex, type MallRow } from '../services/mallSuggestions';

interface MallNearbyCardProps {
  centreName: string;
  rows: MallRow[];
  /** Same contract as NearbyCard: tells Today whether the card shows anything. */
  onHasContent?: (has: boolean) => void;
}

function MallRowView({ row, isLast }: { row: MallRow; isLast: boolean }) {
  const { palette } = useTheme();
  // The chosen place is held by its stable key, not its position: Today
  // rebuilds the candidates when tasks or the inventory change, and an index
  // would then point at a different place. A key no longer offered falls
  // back to the first candidate.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const found = selectedKey == null ? -1 : row.candidates.findIndex(c => c.key === selectedKey);
  const index = found < 0 ? 0 : found;
  const candidate = row.candidates[index];
  const floorLine = formatFloors(candidate.floors, COPY.mallNearbyCard);
  const placeLine = floorLine ? `${candidate.name} · ${floorLine}` : candidate.name;

  return (
    <View
      style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.mallTint2 }]}
      accessible={false}>
      <View style={[styles.tile, { backgroundColor: palette.mallTint2 }]}>
        <PoiIcon type={candidate.poiType} color={palette.mallAccent} size={20} />
      </View>
      <View style={styles.rowText}>
        <Text
          style={[styles.taskTitle, { color: palette.text }]}
          numberOfLines={2}
          accessibilityLabel={COPY.mallNearbyCard.rowA11y(row.task.title, placeLine)}>
          {row.task.title}
        </Text>
        <Text style={[styles.placeLine, { color: palette.mallAccent }]} numberOfLines={1}>
          {placeLine}
        </Text>
        {row.candidates.length > 1 && (
          <Pressable
            style={({ pressed }) => [
              styles.tryAnother,
              { borderColor: palette.mallBorder, opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => setSelectedKey(row.candidates[nextCandidateIndex(index, row.candidates.length)].key)}
            accessibilityRole="button"
            accessibilityLabel={COPY.mallNearbyCard.tryAnotherPlaceA11y(row.task.title)}>
            <Text style={[styles.tryAnotherLabel, { color: palette.mallText }]}>
              {COPY.mallNearbyCard.tryAnotherPlace}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function MallNearbyCard({ centreName, rows, onHasContent }: MallNearbyCardProps) {
  const { palette } = useTheme();
  const hasContent = rows.length > 0;
  useEffect(() => { onHasContent?.(hasContent); }, [hasContent, onHasContent]);
  if (!hasContent) { return null; }

  return (
    <View
      style={[styles.card, { backgroundColor: palette.mallTint, borderColor: palette.mallBorder }]}
      testID="mall-nearby-card">
      <Text style={[styles.title, { color: palette.mallText }]} numberOfLines={2}>
        {COPY.mallNearbyCard.title(centreName)}
      </Text>
      <Text style={[styles.count, { color: palette.mallAccent }]}>
        {COPY.mallNearbyCard.waitingHere(rows.length)}
      </Text>
      {rows.map((row, i) => (
        <MallRowView key={row.task.id} row={row} isLast={i === rows.length - 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth:  StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop:   14,
    paddingBottom: 4,
  },
  title: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  count: {
    fontSize:    12,
    fontFamily:  'Geist-Regular',
    fontVariant: ['tabular-nums'],
    marginTop:   2,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    paddingVertical: 10,
    gap:           12,
  },
  tile: {
    width:          36,
    height:         36,
    borderRadius:   radius.listIcon,
    alignItems:     'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  taskTitle: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  placeLine: {
    fontSize:    12,
    fontFamily:  'Geist-Regular',
    fontVariant: ['tabular-nums'],
    marginTop:   2,
  },
  tryAnother: {
    alignSelf:       'flex-start',
    marginTop:       6,
    borderRadius:    radius.chip,
    borderWidth:     StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    // 44×44 is the smallest comfortable touch target.
    minHeight:       44,
    minWidth:        44,
    alignItems:      'center',
    justifyContent:  'center',
  },
  tryAnotherLabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
});
