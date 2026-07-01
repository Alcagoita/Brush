import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { styles } from './styles';

export function SkeletonRow({ index, faint }: { index: number; faint: string }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700 + index * 50 }),
        withTiming(0.3, { duration: 700 + index * 50 }),
      ),
      -1,
    );
    return () => { cancelAnimation(opacity); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.skeletonRow, style]}>
      <View style={[styles.skeletonDot,  { backgroundColor: faint }]} />
      <View style={[styles.skeletonLine, { backgroundColor: faint }]} />
    </Animated.View>
  );
}
