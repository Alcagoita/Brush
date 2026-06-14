import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { StarIcon } from './AppIcon';
import { useTheme } from '../theme/ThemeContext';
import type { Tier } from '../constants/tiers';

export interface TierMedalProps {
  tier: Tier;
  /** True = current rank (solid coin, no ring). */
  earned?: boolean;
  /** Ring fill fraction 0..1; null = no ring. Pass null when earned=true. */
  pct?: number | null;
  /** Outer bounding box. 96 for Achievements hero, 92 for Profile card. */
  size?: number;
}

export default function TierMedal({ tier, earned = false, pct = null, size = 96 }: TierMedalProps) {
  const { palette } = useTheme();
  const showRing = !earned && pct != null;

  // Ring geometry
  const strokeWidth = 5;
  const r           = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  // Coin diameter: subtract ring + gap on both sides when ring is present
  const ringGap    = 7;
  const coinSize   = showRing ? size - (strokeWidth + ringGap) * 2 : size;
  const coinOffset = (size - coinSize) / 2;
  const emblemSize = Math.round(coinSize * 0.42);

  const coinBg     = earned ? `${tier.color}1f` : `${tier.color}10`;
  const coinBorder = earned ? tier.color        : `${tier.color}66`;

  return (
    <View style={{ width: size, height: size }}>
      {showRing && (
        <Svg
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
          // Rotate so arc starts at top
          viewBox={`0 0 ${size} ${size}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        >
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={palette.ringTrack}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Fill arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={tier.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference * (pct ?? 0)} ${circumference}`}
          />
        </Svg>
      )}

      {/* Coin disc */}
      <View
        style={[
          styles.coin,
          {
            width:        coinSize,
            height:       coinSize,
            borderRadius: coinSize / 2,
            top:          coinOffset,
            left:         coinOffset,
            backgroundColor: coinBg,
            borderColor:     coinBorder,
          },
        ]}
      >
        <StarIcon color={tier.color} size={emblemSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    position:       'absolute',
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
