/**
 * NearbyCard — KAN-46
 *
 * Two states driven by `nearbyPoiType`:
 *
 * IDLE (nearbyPoiType === null)
 *   Header: "NEARBY"
 *   Body:   List of undone POI tasks sorted by distance (ascending).
 *           Each row: 36×36 surface2 icon tile | title + place/distance | chevron
 *           Shows nothing if the user has no open POI tasks today.
 *
 * HERO (nearbyPoiType !== null)
 *   Header: "NEARBY · NOW" + pulsing 6 px accent dot
 *   Hero block (nearTint bg, nearBorder border):
 *     - Decorative halo circle (top-right, nearTint2, opacity 0.7)
 *     - 46×46 accent icon tile with expanding-ring halo animation
 *     - Distance + place name (11 px / 600 / uppercase / nearText)
 *     - Task title (17 px / 500)
 *     - "Open in Maps" CTA (full-width, bg=text, color=bg, radius 12)
 *   "Also close" subsection: remaining undone POI tasks (same idle-row style)
 *
 * Animations (reanimated):
 *   scr-pulse: dot scales 1→0.5→1, opacity 1→0.45→1, 1.6 s ease-in-out ∞
 *   scr-halo:  expanding ring around icon tile, 2.2 s ease-out ∞
 */

import React, { useEffect } from 'react';
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
  tasks:          Task[];
  /** Google Places primary type string (built-in or custom), or null. */
  nearbyPoiType:  string | null;
  nearbyPlace:    NearbyPlace | null;
  poiPlaces:      PlacesMap;
  /**
   * When true the proximity engine is paused due to low battery (KAN-52).
   * The card header changes to reflect the paused state; the idle/hero body
   * is hidden to avoid showing stale place data while monitoring is off.
   */
  trackingPaused?: boolean;
}

// ─── Pulsing dot (header) ─────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const cfg = { duration: 800, easing: Easing.inOut(Easing.ease) };
    scale.value   = withRepeat(withSequence(withTiming(1, cfg), withTiming(0.5, cfg)), -1);
    opacity.value = withRepeat(withSequence(withTiming(1, cfg), withTiming(0.45, cfg)), -1);
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

// ─── Halo animation (hero icon) ───────────────────────────────────────────────

function HaloIcon({
  poiType,
  accentColor,
}: {
  poiType:     string;
  accentColor: string;
}) {
  const { palette } = useTheme();
  const ringScale   = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0.8);

  useEffect(() => {
    ringScale.value   = withRepeat(
      withTiming(1.6, { duration: 2200, easing: Easing.out(Easing.ease) }),
      -1,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 0 }),
        withTiming(0,   { duration: 2200, easing: Easing.out(Easing.ease) }),
      ),
      -1,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    position:  'absolute' as const,
    width:     46,
    height:    46,
    borderRadius: radius.heroIcon,
    borderWidth: 2,
    borderColor: accentColor,
    transform: [{ scale: ringScale.value }],
    opacity:   ringOpacity.value,
  }));

  return (
    <View style={styles.haloWrapper}>
      <Animated.View style={ringStyle} />
      <View
        style={[
          styles.heroIconTile,
          { backgroundColor: accentColor + '33' }, // ~20% opacity tint
        ]}>
        <PoiIcon type={poiType} color={accentColor} size={22} />
      </View>
    </View>
  );
}

// ─── Idle row ─────────────────────────────────────────────────────────────────

function IdleRow({
  task,
  place,
}: {
  task:  Task;
  place: NearbyPlace | undefined;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.idleRow, { borderBottomColor: palette.line }]}>
      {/* Icon tile */}
      <View style={[styles.idleIconTile, { backgroundColor: palette.surface2 }]}>
        {task.poi
          ? <PoiIcon type={task.poi} color={palette.muted} size={20} />
          : <PoiIcon type="atm"      color={palette.muted} size={20} />
        }
      </View>

      {/* Text */}
      <View style={styles.idleContent}>
        <Text
          style={[styles.idleTitle, { color: palette.text }]}
          numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={[styles.idleSub, { color: palette.muted }]} numberOfLines={1}>
          {place
            ? `${place.name} · ${formatDistance(place.distanceMeters)}`
            : task.poi ? placeTypeLabel(task.poi) : ''}
        </Text>
      </View>

      {/* Chevron */}
      <ChevronRightIcon color={palette.faint} size={18} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NearbyCard({
  tasks,
  nearbyPoiType,
  nearbyPlace,
  poiPlaces,
  trackingPaused = false,
}: NearbyCardProps) {
  const { palette } = useTheme();

  // Only undone tasks with a POI field.
  const poiTasks = tasks.filter(t => !t.done && t.poi != null);

  // Nothing to show — no POI tasks today.
  if (poiTasks.length === 0) { return null; }

  // ── Low-battery paused state (KAN-52) ──────────────────────────────────────
  // Show a subtle indicator instead of the normal card body so the user knows
  // why nearby alerts are not firing. Do not show stale place distances.
  if (trackingPaused) {
    return (
      <View style={[styles.card, { marginHorizontal: spacing.page, marginTop: 16 }]}>
        <View style={styles.header}>
          <Text style={[styles.headerLabel, { color: palette.muted }]}>NEARBY</Text>
        </View>
        <View
          style={[
            styles.pausedBanner,
            { backgroundColor: palette.surface, borderColor: palette.line },
          ]}>
          <Text style={[styles.pausedText, { color: palette.muted }]}>
            Nearby alerts paused — low battery
          </Text>
        </View>
      </View>
    );
  }

  const isHero = nearbyPoiType !== null && nearbyPlace !== null;

  // Hero task: the one matching the active POI type.
  const heroTask = isHero
    ? poiTasks.find(t => t.poi === nearbyPoiType) ?? null
    : null;

  // "Also close" list: remaining undone POI tasks (everything except the hero).
  const alsoClose = isHero
    ? poiTasks.filter(t => t !== heroTask)
    : poiTasks;

  // Sort idle/also-close rows by known distance ascending; unknowns at end.
  const sortedAlsoClose = [...alsoClose].sort((a, b) => {
    const da = a.poi ? poiPlaces[a.poi]?.distanceMeters ?? Infinity : Infinity;
    const db = b.poi ? poiPlaces[b.poi]?.distanceMeters ?? Infinity : Infinity;
    return da - db;
  });

  return (
    <View style={[styles.card, { marginHorizontal: spacing.page, marginTop: 16 }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        {isHero && <PulsingDot color={palette.accent} />}
        <Text style={[styles.headerLabel, { color: palette.muted }]}>
          {isHero ? 'NEARBY · NOW' : 'NEARBY'}
        </Text>
      </View>

      {/* ── Hero block ── */}
      {isHero && heroTask && nearbyPlace && (
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
            style={[
              styles.decHalo,
              { backgroundColor: palette.nearTint2 },
            ]}
            pointerEvents="none"
          />

          {/* Icon + text row */}
          <View style={styles.heroRow}>
            <HaloIcon poiType={nearbyPoiType} accentColor={palette.accent} />

            <View style={styles.heroText}>
              <Text style={[styles.heroDistance, { color: palette.nearText }]}>
                {formatDistance(nearbyPlace.distanceMeters).toUpperCase()}
                {'  '}
                <Text style={styles.heroPlaceName}>
                  {nearbyPlace.name.toUpperCase()}
                </Text>
              </Text>
              <Text
                style={[styles.heroTitle, { color: palette.text }]}
                numberOfLines={2}>
                {heroTask.title}
              </Text>
            </View>
          </View>

          {/* Open in Maps CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: palette.text, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() =>
              openInMaps(nearbyPlace.lat, nearbyPlace.lng, nearbyPlace.name)
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${nearbyPlace.name} in Maps`}>
            <Text style={[styles.ctaLabel, { color: palette.bg }]}>
              Open in Maps
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Idle rows / "Also close" ── */}
      {sortedAlsoClose.length > 0 && (
        <View style={[styles.idleSection, isHero ? styles.alsoCloseSection : undefined]}>
          {isHero && (
            <Text style={[styles.alsoCloseLabel, { color: palette.muted }]}>
              ALSO CLOSE
            </Text>
          )}
          {sortedAlsoClose.map(task => (
            <IdleRow
              key={task.id}
              task={task}
              place={task.poi ? poiPlaces[task.poi] : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    // No background/border — sections within have their own styling
  },

  // ── Header ──
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginBottom:   10,
  },
  headerLabel: {
    fontSize:     11,
    fontWeight:   '600',
    fontFamily:   'Geist-SemiBold',
    letterSpacing: 1.2,
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
    letterSpacing:  0.8,
  },
  heroPlaceName: {
    fontWeight:   '600',
    fontFamily:   'Geist-SemiBold',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize:   17,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
    lineHeight: 22,
  },
  ctaButton: {
    borderRadius:   radius.ctaBtn,
    paddingVertical: 12,
    alignItems:     'center',
  },
  ctaLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Low-battery paused banner (KAN-52) ──
  pausedBanner: {
    borderRadius:    radius.card,
    borderWidth:     StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pausedText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  // ── Idle rows ──
  idleSection:      {},
  alsoCloseSection: { marginTop: 4 },
  alsoCloseLabel: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  1,
    marginBottom:   8,
  },
  idleRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 10,
    gap:             12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },
});
