/**
 * ScrRotatingNudge — KAN-139
 *
 * Reusable atmospheric nudge rotator for empty-state screens.
 * Accepts an array of messages with optional POI icon + category colour.
 * Messages cross-fade (opacity + translateY) on a configurable pace.
 *
 * Used by:
 *   - TodayScreen empty state (KAN-139)  — 8 ambient messages, pace 5s
 *   - Onboarding Stage 2     (KAN-140)  — different message set, same component
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Text,
  View,
} from 'react-native';
import { PoiIcon } from './AppIcon';
import { useTheme } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NudgeMessage {
  text:   string;
  poi?:   string;
  color?: string;
  /** KAN-245 — when set, this message becomes tappable (e.g. the "Going somewhere soon?" slot taps into the trip flow). Absent on every other message — the rotator stays non-interactive by default. */
  onPress?: () => void;
}

interface Props {
  messages:         NudgeMessage[];
  pace?:            number;   // seconds between transitions; default 5
  showCategoryIcon?: boolean; // default true
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FADE_DURATION      = 550;
const FADE_DURATION_A11Y = 120;
const TRANSLATE_DIST     = 5;
const MIN_INTERVAL_MS    = 2200;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScrRotatingNudge({
  messages,
  pace = 5,
  showCategoryIcon = true,
}: Props) {
  const { palette } = useTheme();

  const [index,       setIndex]       = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const opacity    = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => setReduceMotion(enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length <= 1) { return; }

    const duration    = reduceMotion ? FADE_DURATION_A11Y : FADE_DURATION;
    const intervalMs  = Math.max(MIN_INTERVAL_MS, pace * 1000);

    const timer = setInterval(() => {
      const translateOut = reduceMotion ? 0 : TRANSLATE_DIST;

      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: translateOut, duration, useNativeDriver: true }),
      ]).start(() => {
        setIndex(i => (i + 1) % messages.length);
        if (!reduceMotion) {
          translateY.setValue(-TRANSLATE_DIST);
        }
        Animated.parallel([
          Animated.timing(opacity,    { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration, useNativeDriver: true }),
        ]).start();
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [messages.length, pace, reduceMotion, opacity, translateY]);

  const current = messages[index] ?? messages[0];

  const content = (
    <>
      {/* Icon slot — always reserved so text never shifts vertically */}
      <View style={{ height: 28, marginBottom: 20, alignItems: 'center', justifyContent: 'center' }}>
        {showCategoryIcon && current.poi && current.color
          ? <PoiIcon type={current.poi} color={current.color} size={27} />
          : null}
      </View>

      <Text
        style={{
          fontSize:      22,
          fontFamily:    'Geist-Regular',
          fontWeight:    '400',
          lineHeight:    33,
          color:         palette.muted,
          maxWidth:      300,
          letterSpacing: -0.22,
          textAlign:     'center',
        }}>
        {current.text}
      </Text>
    </>
  );

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, minHeight: 150 }}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ translateY }] }}>
        {current.onPress ? (
          <Pressable onPress={current.onPress} accessibilityRole="button" accessibilityLabel={current.text}>
            {content}
          </Pressable>
        ) : content}
      </Animated.View>
    </View>
  );
}
