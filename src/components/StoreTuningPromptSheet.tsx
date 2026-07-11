/**
 * StoreTuningPromptSheet — KAN-74
 *
 * Bottom-sheet prompt shown once per session when the indoor detection service
 * (KAN-73) reports `indoor_mapped`. The user can opt in ("Turn on") or dismiss
 * ("Not now").
 *
 * Animation: same pattern as ShareProfileSheet (KAN-115).
 *   Scrim:  opacity 0→1, 250ms, ease-out
 *   Sheet:  translateY(screenHeight)→0, 320ms, cubic-bezier(0.32,0.72,0,1)
 *
 * The ⚠️ battery warning is rendered as a distinct highlighted row — per the
 * KAN-74 spec it must be prominent, not a footnote.
 *
 * Note: emoji is used here as TEXT CONTENT (the ⚠️ warning character), which
 * is permitted. The rule against emoji-as-icons applies to icon/button elements.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { BuildingIcon } from './AppIcon';
import { COPY } from '../constants/copy';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StoreTuningPromptSheetProps {
  visible:   boolean;
  onTurnOn:  () => void;
  onNotNow:  () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StoreTuningPromptSheet({
  visible,
  onTurnOn,
  onNotNow,
}: StoreTuningPromptSheetProps) {
  const { palette }               = useTheme();
  const insets                    = useSafeAreaInsets();
  const { height: screenHeight }  = useWindowDimensions();

  const scrimOpacity    = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // ── Animation ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      scrimOpacity.setValue(0);
      sheetTranslateY.setValue(screenHeight);
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue:         1,
          duration:        250,
          easing:          Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue:         0,
          duration:        320,
          easing:          Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue:         0,
          duration:        200,
          easing:          Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue:         screenHeight,
          duration:        200,
          easing:          Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) { setModalVisible(false); }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, screenHeight]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTurnOn  = useCallback(() => { onTurnOn();  }, [onTurnOn]);
  const handleNotNow  = useCallback(() => { onNotNow();  }, [onNotNow]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!modalVisible) { return null; }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleNotNow}
      statusBarTranslucent>

      {/* ── Scrim ── */}
      <Animated.View
        style={[styles.scrim, { backgroundColor: palette.scrim, opacity: scrimOpacity }]}
        pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleNotNow}
          accessibilityRole="button"
          accessibilityLabel={COPY.storeTuningPromptSheet.dismissA11y}
        />
      </Animated.View>

      {/* ── Sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.bg,
            borderTopColor:  palette.line,
            paddingBottom:   insets.bottom + 16,
            transform:       [{ translateY: sheetTranslateY }],
          },
        ]}>

        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: palette.surface2 }]} />
        </View>

        {/* Icon + title */}
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWell,
              { backgroundColor: palette.accent + '22' },
            ]}>
            <BuildingIcon color={palette.accent} size={24} />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>
            Looks like you're in a mall
          </Text>
        </View>

        {/* Body copy */}
        <Text style={[styles.body, { color: palette.muted }]}>
          Switch to Store fine tuning to get alerts as you pass individual stores.
        </Text>

        {/* Battery warning — prominent per spec */}
        <View
          style={[
            styles.batteryWarning,
            {
              backgroundColor: palette.nearTint,
              borderColor:     palette.nearBorder,
            },
          ]}>
          <Text style={[styles.batteryWarningText, { color: palette.nearText }]}>
            {'⚠️  This uses more battery.'}
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.ctaGroup}>
          {/* Primary: Turn on */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaPrimary,
              { backgroundColor: palette.text, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleTurnOn}
            accessibilityRole="button"
            accessibilityLabel={COPY.storeTuningPromptSheet.turnOnA11y}>
            <Text style={[styles.ctaPrimaryLabel, { color: palette.bg }]}>
              Turn on
            </Text>
          </Pressable>

          {/* Secondary: Not now */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaSecondary,
              {
                backgroundColor: palette.surface,
                borderColor:     palette.line,
                opacity:         pressed ? 0.6 : 1,
              },
            ]}
            onPress={handleNotNow}
            accessibilityRole="button"
            accessibilityLabel={COPY.storeTuningPromptSheet.notNowA11y}>
            <Text style={[styles.ctaSecondaryLabel, { color: palette.muted }]}>
              Not now
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Scrim ──
  scrim: {
    ...StyleSheet.absoluteFill,
  },

  // ── Sheet ──
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderTopWidth:       StyleSheet.hairlineWidth,
  },

  // ── Drag handle ──
  handleRow: {
    alignItems:    'center',
    paddingTop:    10,
    paddingBottom: 4,
  },
  handle: {
    width:        36,
    height:       4,
    borderRadius: 2,
  },

  // ── Title row ──
  titleRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingHorizontal: spacing.page,
    paddingTop:        16,
    paddingBottom:     8,
  },
  iconWell: {
    width:          44,
    height:         44,
    borderRadius:   radius.heroIcon,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  title: {
    flex:       1,
    fontSize:   18,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    lineHeight: 24,
  },

  // ── Body ──
  body: {
    paddingHorizontal: spacing.page,
    fontSize:          15,
    fontFamily:        'Geist-Regular',
    lineHeight:        22,
    paddingBottom:     14,
  },

  // ── Battery warning ──
  batteryWarning: {
    marginHorizontal: spacing.page,
    borderRadius:     radius.card,
    borderWidth:      1,
    paddingHorizontal: 14,
    paddingVertical:   10,
    marginBottom:      20,
  },
  batteryWarningText: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
    lineHeight: 20,
  },

  // ── CTAs ──
  ctaGroup: {
    paddingHorizontal: spacing.page,
    gap:               10,
  },
  ctaPrimary: {
    borderRadius:   radius.ctaBtn,
    paddingVertical: 15,
    alignItems:     'center',
  },
  ctaPrimaryLabel: {
    fontSize:   16,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  ctaSecondary: {
    borderRadius:   radius.ctaBtn,
    paddingVertical: 14,
    alignItems:     'center',
    borderWidth:    1,
  },
  ctaSecondaryLabel: {
    fontSize:   16,
    fontFamily: 'Geist-Regular',
  },
});
