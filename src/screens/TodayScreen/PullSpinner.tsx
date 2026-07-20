/**
 * PullSpinner — KAN-288.
 *
 * The loading indicator for pull-to-refresh, owned by us rather than by
 * RefreshControl.
 *
 * Why not the native one: RefreshControl's spinner is drawn by Android's
 * SwipeRefreshLayout, and in this screen it consistently retracted a second
 * or two into the fetch even with `refreshing` still true. Memoising the
 * element and awaiting the real work both failed to hold it. Rather than
 * keep guessing at a native control we cannot drive from JS, this renders
 * the indicator directly — the same approach Reddit and others take for
 * exactly this reason. What we render, we control: it is on screen for
 * precisely as long as `visible` is true.
 *
 * RefreshControl stays mounted for the GESTURE (overscroll detection and the
 * drag feel); this owns what the user looks at while waiting.
 *
 * Fabric-safe per KAN-157: the only animated property is `rotate`, a
 * transform, driven on the native thread. No layout property animates per
 * frame.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { RefreshIcon } from '../../components/AppIcon';

const SIZE = 30;

export interface PullSpinnerProps {
  visible: boolean;
  /** Distance from the top of the screen — where the list's content starts. */
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
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { return; }

    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    // Stopping on hide matters: a loop left running holds the native driver
    // awake and keeps this screen doing work after the refresh has finished.
    return () => { loop.stop(); };
  }, [visible, spin]);

  if (!visible) { return null; }

  const rotate = spin.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <View style={[styles.puck, { backgroundColor, borderColor }]}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <RefreshIcon color={color} size={16} />
        </Animated.View>
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
    // Above the list and the ring section, below the blocking overlay (100).
    zIndex:     60,
  },
  puck: {
    width:          SIZE,
    height:         SIZE,
    borderRadius:   SIZE / 2,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
