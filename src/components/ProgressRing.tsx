/**
 * ProgressRing — SVG circular progress indicator.
 *
 * Accepts animated values for diameter and strokeWidth so the parent can
 * drive scroll-collapse interpolations. Progress arc starts at 12 o'clock.
 */
import React from 'react';
import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

interface Props {
  /** 0–1 fraction of tasks completed. */
  progress: number;
  /** Animated diameter of the whole ring (outer edge). */
  diameter: Animated.AnimatedInterpolation<number>;
  /** Animated stroke width. */
  strokeWidth: Animated.AnimatedInterpolation<number>;
}

// react-native-svg Circle doesn't accept Animated values directly — we need
// the animated wrapper. For numeric SVG attributes we derive them from the
// Animated values via addListener + state.
export default function ProgressRing({ progress, diameter, strokeWidth }: Props) {
  const { palette } = useTheme();

  const [size, setSize] = React.useState(246);
  const [stroke, setStroke] = React.useState(14);

  React.useEffect(() => {
    const idD = (diameter as any).addListener(({ value }: { value: number }) => setSize(value));
    const idS = (strokeWidth as any).addListener(({ value }: { value: number }) => setStroke(value));
    return () => {
      (diameter as any).removeListener(idD);
      (strokeWidth as any).removeListener(idS);
    };
  }, [diameter, strokeWidth]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1));
  const center = size / 2;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      {/* Track */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={palette.ringTrack}
        strokeWidth={stroke}
        fill="none"
      />
      {/* Progress arc */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={palette.ringFill}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}
