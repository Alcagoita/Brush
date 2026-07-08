import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { StarIcon } from './AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { TIERS, deriveTierStanding } from '../constants/tiers';
import { COPY } from '../constants/copy';

interface TierLadderProps {
  points: number;
}

export default function TierLadder({ points }: TierLadderProps) {
  const { palette } = useTheme();
  const { tierIdx } = deriveTierStanding(points);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TIERS.map((tier, i) => {
        const isNext  = i === tierIdx;
        const isEarned = points >= tier.at && !isNext;

        const colBg     = isNext   ? `${tier.color}14`
                        : isEarned ? `${tier.color}0a`
                        : 'transparent';
        const colBorder = isNext   ? `${tier.color}59`
                        : isEarned ? `${tier.color}2e`
                        : palette.line;

        const coinBg     = isEarned ? `${tier.color}1f` : 'transparent';
        const coinBorder = (isEarned || isNext) ? tier.color : `${tier.color}33`;
        const coinOpacity = (isEarned || isNext) ? 1 : 0.5;

        const nameColor   = (isEarned || isNext) ? palette.text  : palette.muted;
        const threshLabel = tier.at === 0 ? 'Start' : `${tier.at.toLocaleString()} pts`;

        return (
          <View
            key={tier.name}
            style={[
              styles.column,
              { backgroundColor: colBg, borderColor: colBorder },
            ]}
          >
            <View
              style={[
                styles.miniCoin,
                { backgroundColor: coinBg, borderColor: coinBorder, opacity: coinOpacity },
              ]}
            >
              <StarIcon color={tier.color} size={14} />
            </View>
            <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
              {COPY.achievements.tierLabel(tier.name)}
            </Text>
            <Text style={[styles.threshold, { color: palette.muted }]} numberOfLines={1}>
              {threshLabel}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap:           8,
    paddingHorizontal: 2,
  },
  column: {
    width:          80,
    borderRadius:   13,
    paddingTop:     11,
    paddingBottom:  10,
    paddingHorizontal: 6,
    alignItems:     'center',
    gap:            7,
    borderWidth:    1,
  },
  miniCoin: {
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
  },
  name: {
    fontSize:      11,
    fontWeight:    '500',
    letterSpacing: 0,
  },
  threshold: {
    fontSize:      10.5,
    fontVariant:   ['tabular-nums'],
  },
});
