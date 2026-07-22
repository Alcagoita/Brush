import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme';
import { PoiIcon } from '../../components/AppIcon';
import type { PoiType } from '../../types';
import { styles } from './styles';

interface PoiTileProps {
  type: PoiType;
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
  /** Live tile width from getPoiTileWidth(useWindowDimensions().width) — kept
   *  out of the static StyleSheet so rotation/split-screen/fold reflow it. */
  width: number;
}

export function PoiTile({ type, label, selected, onPress, palette, width }: PoiTileProps) {
  const iconColor = selected ? palette.nearText : palette.muted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.poiTile,
        {
          width,
          backgroundColor: selected ? palette.nearTint2  : palette.surface2,
          borderColor:     selected ? palette.nearBorder : palette.line,
        },
      ]}>
      <PoiIcon type={type} color={iconColor} size={20} />
      <Text style={[styles.poiTileLabel, { color: iconColor }]}>{label}</Text>
    </Pressable>
  );
}
