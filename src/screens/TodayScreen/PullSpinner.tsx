/**
 * PullSpinner — KAN-298.
 *
 * Android's native RefreshControl spinner can retract while `refreshing` is
 * still true on this screen. The pull gesture stays native, but the waiting
 * indicator is rendered here with Brush's loading dots so its lifetime follows
 * `visible` exactly.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import LoadingDots from '../../components/LoadingDots';

const WIDTH = 72;
const HEIGHT = 38;

export interface PullSpinnerProps {
  visible: boolean;
  top: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

export default function PullSpinner({
  visible,
  top,
  color,
  backgroundColor,
  borderColor,
}: PullSpinnerProps) {
  if (!visible) { return null; }

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <View style={[styles.puck, { backgroundColor, borderColor }]}>
        <LoadingDots color={color} size={7} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position:   'absolute',
    left:       0,
    right:      0,
    alignItems: 'center',
    zIndex:     120,
  },
  puck: {
    width:          WIDTH,
    height:         HEIGHT,
    borderRadius:   HEIGHT / 2,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#000000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.18,
    shadowRadius:   4,
    elevation:      4,
  },
});
