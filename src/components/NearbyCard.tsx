/**
 * NearbyCard — KAN-46
 *
 * Pure visual component. Rendered by TodayScreen when the proximity service
 * (useTodayScreen) sets nearbyPoiType via a geofence entry event.
 *
 * Renders null when nearbyPoiType is null — the service decides when to show.
 *
 * HERO (nearbyPoiType !== null)
 *   Header: "NEARBY · NOW" + pulsing 6 px accent dot
 *   Hero block (nearTint bg, nearBorder border):
 *     - Decorative halo circle (top-right, nearTint2, opacity 0.7)
 *     - 46×46 accent icon tile with expanding-ring halo animation
 *     - Distance + place name (11 px / 600 / uppercase / nearText)
 *     - Task title (17 px / 500)
 *     - "Open in Maps" CTA (full-width, bg=text, color=bg, radius 12)
 *   "Also close" subsection: remaining undone POI tasks
 *
 * Animations (Reanimated 3 — runs on UI thread via JSI, zero JS involvement):
 *   scr-pulse: dot scales 1→0.5→1, opacity 1→0.45→1, 1.6 s ease-in-out ∞
 *   scr-halo:  expanding ring around icon tile, 2.2 s ease-out ∞
 *
 * NOTE: RN Animated.loop with useNativeDriver:true was the original
 * implementation but caused the JS thread to freeze in New Architecture
 * (Bridgeless mode). Reanimated 3 withRepeat runs on the UI thread and
 * does not involve JS at all after setup.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme/tokens';
import { NearbyPlace, openInMaps, formatDistance, placeTypeLabel } from '../services/maps';
import { PlacesMap } from '../services/proximity';
import { Task } from '../types';
import { ChevronRightIcon, PoiIcon } from './AppIcon';

// ─── Props ────────────────────────────────────────────────────────────────────

interface NearbyCardProps {
  tasks:         Task[];
  nearbyPoiType: string | null;
  nearbyPlace:   NearbyPlace | null;
  /** Nearest known place per POI type from the proximity service. */
  poiPlaces:     PlacesMap;
  /**
   * When true Store fine tuning is active (KAN-74).
   * A small indicator appears in the header.
   */
  storeTuningActive?: boolean;
}

// ─── Pulsing dot (header) ─────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    const duration = 800;
    const easing   = Easing.inOut(Easing.ease);
    scale.value   = withRepeat(withSequence(
      withTiming(0.5, { duration, easing }),
      withTiming(1,   { duration, easing }),
    ), -1);
    opacity.value = withRepeat(withSequence(
      withTiming(0.45, { duration, easing }),
      withTiming(1,    { duration, easing }),
    ), -1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulsingDot, { backgroundColor: color }, style]} />
  );
}

// ─── Halo icon tile with expanding ring ──────────────────────────────────────

function HaloIcon({
  poiType,
  accentColor,
}: {
  poiType:     string;
  accentColor: string;
}) {
  const ringScale   = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    const duration = 2200;
    const easing   = Easing.out(Easing.ease);
    ringScale.value   = withRepeat(withSequence(
      withTiming(1.55, { duration, easing }),
      withTiming(1,    { duration: 0 }),
    ), -1);
    ringOpacity.value = withRepeat(withSequence(
      withTiming(0, { duration, easing }),
      withTiming(0, { duration: 0 }),
    ), -1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity:   ringOpacity.value,
  }));

  return (
    <View style={styles.haloWrapper}>
      <Animated.View
        style={[
          styles.haloRing,
          { borderColor: accentColor },
          ringStyle,
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.heroIconTile,
          { backgroundColor: accentColor + '33' },
        ]}>
        <PoiIcon type={poiType} color={accentColor} size={22} />
      </View>
    </View>
  );
}

// ─── Also-close row ───────────────────────────────────────────────────────────

function AlsoCloseRow({
  task,
  place,
  isFirst,
}: {
  task:    Task;
  place:   NearbyPlace | undefined;
  isFirst: boolean;
}) {
  const { palette } = useTheme();

  return (
    <View style={[
      styles.idleRow,
      !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
    ]}>
      <View style={[styles.idleIconTile, { backgroundColor: palette.surface2 }]}>
        <PoiIcon type={task.poi ?? 'atm'} color={palette.muted} size={20} />
      </View>

      <View style={styles.idleContent}>
        <Text style={[styles.idleTitle, { color: palette.text }]} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={[styles.idleSub, { color: palette.muted }]} numberOfLines={1}>
          {place
            ? `${place.name} · ${formatDistance(place.distanceMeters)}`
            : task.poi ? placeTypeLabel(task.poi) : ''}
        </Text>
      </View>

      <ChevronRightIcon color={palette.faint} size={14} strokeWidth={1.8} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NearbyCard({
  tasks,
  nearbyPoiType,
  nearbyPlace,
  poiPlaces,
  storeTuningActive = false,
}: NearbyCardProps) {
  const { palette } = useTheme();

  const poiTasks = tasks.filter(t => !t.done && t.poi != null);
  if (poiTasks.length === 0) { return null; }

  const isHero  = nearbyPoiType !== null;
  const heroTask = isHero ? (poiTasks.find(t => t.poi === nearbyPoiType) ?? null) : null;

  // Show only when the proximity service found at least one place in range.
  const hasNearbyData = isHero || poiTasks.some(t => t.poi && poiPlaces[t.poi]);
  if (!hasNearbyData) { return null; }

  // Hero mode: all tasks except the hero go in "Also Close".
  // Grey-only mode: all POI tasks that have a known nearby place.
  const listTasks = isHero
    ? poiTasks.filter(t => t !== heroTask)
    : poiTasks.filter(t => t.poi && poiPlaces[t.poi]);

  return (
    <View style={[styles.card, { marginHorizontal: spacing.page, marginTop: 14 }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isHero && <PulsingDot color={palette.accent} />}
          <Text style={[styles.headerLabel, { color: palette.muted }]}>
            {isHero ? 'NEARBY · NOW' : 'NEARBY'}
          </Text>
        </View>

        {storeTuningActive && (
          <Text style={[styles.tuningLabel, { color: palette.accent }]}>
            Store tuning on
          </Text>
        )}
      </View>

      {/* ── Hero block (orange, < 100 m) ── */}
      {isHero && heroTask && (
        <View
          style={[
            styles.heroBlock,
            {
              backgroundColor: palette.nearTint,
              borderColor:     palette.nearBorder,
            },
          ]}>

          {/* Decorative halo circle — top-right */}
          <View
            style={[styles.decHalo, { backgroundColor: palette.nearTint2 }]}
            pointerEvents="none"
          />

          {/* Icon + text row */}
          <View style={styles.heroRow}>
            <HaloIcon poiType={nearbyPoiType!} accentColor={palette.accent} />

            <View style={styles.heroText}>
              {nearbyPlace && (
                <Text style={[styles.heroDistance, { color: palette.nearText }]}>
                  {formatDistance(nearbyPlace.distanceMeters).toUpperCase()}
                  {'  '}
                  <Text style={styles.heroPlaceName}>
                    {nearbyPlace.name.toUpperCase()}
                  </Text>
                </Text>
              )}
              <Text
                style={[styles.heroTitle, { color: palette.text }]}
                numberOfLines={2}>
                {heroTask.title}
              </Text>
            </View>
          </View>

          {/* Open in Maps CTA — only when coordinates available */}
          {nearbyPlace && (
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: palette.text, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => openInMaps(nearbyPlace.lat, nearbyPlace.lng, nearbyPlace.name)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${nearbyPlace.name} in Maps`}>
              <Text style={[styles.ctaLabel, { color: palette.bg }]}>Open in Maps</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Grey rows: "Also Close" in hero mode, all results in grey-only mode ── */}
      {listTasks.length > 0 && (
        <View style={[styles.listSection, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          {isHero && (
            <Text style={[styles.listSectionLabel, { color: palette.muted }]}>ALSO CLOSE</Text>
          )}
          {listTasks.map((task, index) => (
            <AlsoCloseRow
              key={task.id}
              task={task}
              place={task.poi ? poiPlaces[task.poi] : undefined}
              isFirst={index === 0}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {},

  // ── Header ──
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  headerLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 1.76,
  },
  tuningLabel: {
    fontSize:      10,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.5,
  },
  pulsingDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },

  // ── Hero block ──
  heroBlock: {
    borderRadius: radius.card,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      16,
    overflow:     'hidden',
    marginBottom: 12,
  },
  decHalo: {
    position:     'absolute',
    width:        140,
    height:       140,
    borderRadius: 70,
    top:          -40,
    right:        -40,
    opacity:      0.7,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           14,
    marginBottom:  14,
  },
  haloWrapper: {
    width:          46,
    height:         46,
    alignItems:     'center',
    justifyContent: 'center',
  },
  haloRing: {
    position:     'absolute',
    width:        46,
    height:       46,
    borderRadius: radius.heroIcon,
    borderWidth:  1.5,
  },
  heroIconTile: {
    width:          46,
    height:         46,
    borderRadius:   radius.heroIcon,
    alignItems:     'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap:  4,
  },
  heroDistance: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: 0.8,
  },
  heroPlaceName: {
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize:   17,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
    lineHeight: 22,
  },
  ctaButton: {
    borderRadius:    radius.ctaBtn,
    paddingVertical: 12,
    alignItems:      'center',
  },
  ctaLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Grey rows (also close / approaching) ──
  listSection: {
    borderRadius: radius.card,
    borderWidth:  1,
    overflow:     'hidden',
    paddingTop:   12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  listSectionLabel: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: 1,
    marginBottom:  8,
  },
  idleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 12,
    gap:            14,
  },
  idleIconTile: {
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  idleContent: {
    flex: 1,
    gap:  2,
  },
  idleTitle: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },
  idleSub: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    marginTop:  1,
  },
});
