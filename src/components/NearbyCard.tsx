/**
 * NearbyCard — KAN-46
 *
 * Pure visual component. Rendered by TodayScreen when the proximity service
 * sets nearbyPoiType via a geofence entry event.
 *
 * HERO (any POI place is < HERO_RADIUS_M away)
 *   Header: "NEARBY · NOW" + pulsing 6 px accent dot
 *   Horizontal paging carousel — one card per POI type in the hero zone:
 *     - Decorative halo circle (top-right, nearTint2, opacity 0.7)
 *     - 46×46 accent icon tile with expanding-ring halo animation
 *     - Distance + place name (11 px / 600 / uppercase / nearText)
 *     - Task title (17 px / 500)
 *     - "Open in Maps" CTA (full-width, bg=text, color=bg, radius 12)
 *   "Also close" subsection: remaining undone POI tasks in grey zone
 *
 * GREY-ONLY (places between 100 m and 400 m, none in hero zone)
 *   Header: "NEARBY"
 *   List of approaching POI tasks with place + distance
 *
 * Animations (Reanimated 3 — runs on UI thread via JSI, zero JS involvement):
 *   scr-pulse: dot scales 1→0.5→1, opacity 1→0.45→1, 1.6 s ease-in-out ∞
 *   scr-halo:  expanding ring around icon tile, 2.2 s ease-out ∞
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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

// Distance threshold that separates the orange hero zone from the grey zone.
const HERO_RADIUS_M = 100;

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

// ─── Single hero card (one slide in the carousel) ────────────────────────────

function HeroCard({
  poiType,
  task,
  place,
}: {
  poiType: string;
  task:    Task;
  place:   NearbyPlace;
}) {
  const { palette } = useTheme();

  return (
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
        <HaloIcon poiType={poiType} accentColor={palette.accent} />

        <View style={styles.heroText}>
          <Text style={[styles.heroDistance, { color: palette.nearText }]}>
            {formatDistance(place.distanceMeters).toUpperCase()}
            {'  '}
            <Text style={styles.heroPlaceName}>
              {place.name.toUpperCase()}
            </Text>
          </Text>
          <Text
            style={[styles.heroTitle, { color: palette.text }]}
            numberOfLines={2}>
            {task.title}
          </Text>
        </View>
      </View>

      {/* Open in Maps CTA */}
      <Pressable
        style={({ pressed }) => [
          styles.ctaButton,
          { backgroundColor: palette.text, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={() => openInMaps(place.lat, place.lng, place.name)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${place.name} in Maps`}>
        <Text style={[styles.ctaLabel, { color: palette.bg }]}>Open in Maps</Text>
      </Pressable>
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

function NearbyCard({
  tasks,
  nearbyPoiType,
  poiPlaces,
  storeTuningActive = false,
}: NearbyCardProps) {
  const { palette } = useTheme();

  // Full-bleed slide width — read from the live window so it stays correct
  // across orientation / multi-window changes (not frozen at import time).
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = windowWidth - spacing.page * 2;

  // Active carousel page — updated once per swipe settle (cheap; not per-frame).
  const [activeIndex, setActiveIndex] = React.useState(0);
  const onCarouselScroll = React.useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
      setActiveIndex(prev => (prev === idx ? prev : idx));
    },
    [slideWidth],
  );

  const poiTasks = tasks.filter(t => !t.done && t.poi != null);
  if (poiTasks.length === 0) { return null; }

  // One carousel entry per POI type that has a place within the hero zone.
  // First undone task for each type wins the card.
  const heroEntries = poiTasks.reduce<Array<{ task: Task; place: NearbyPlace; poiType: string }>>(
    (acc, t) => {
      if (!t.poi) { return acc; }
      const place = poiPlaces[t.poi];
      if (!place || place.distanceMeters >= HERO_RADIUS_M) { return acc; }
      if (acc.find(e => e.poiType === t.poi)) { return acc; }
      acc.push({ task: t, place, poiType: t.poi });
      return acc;
    },
    [],
  );

  const isHero = heroEntries.length > 0 || nearbyPoiType !== null;

  // Grey-zone tasks: have a known nearby place but are NOT already in the hero carousel.
  const heroPoiTypes = new Set(heroEntries.map(e => e.poiType));
  const greyTasks = poiTasks.filter(t => {
    if (!t.poi || heroPoiTypes.has(t.poi)) { return false; }
    return !!poiPlaces[t.poi];
  });

  // Nothing to show at all — hide.
  if (!isHero && greyTasks.length === 0) { return null; }

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

      {/* ── Hero carousel (orange, < 100 m) ── */}
      {heroEntries.length > 0 && (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={onCarouselScroll}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}>
            {heroEntries.map(({ task, place, poiType }) => (
              <View key={poiType} style={{ width: slideWidth }}>
                <HeroCard poiType={poiType} task={task} place={place} />
              </View>
            ))}
          </ScrollView>

          {/* Page indicator — only when there's more than one slide. The active
              dot widens into a pill; inactive dots are faint. */}
          {heroEntries.length > 1 && (
            <View style={styles.dotsRow} testID="nearby-page-dots">
              {heroEntries.map(({ poiType }, i) => {
                const active = i === Math.min(activeIndex, heroEntries.length - 1);
                return (
                  <View
                    key={poiType}
                    testID={`nearby-page-dot${active ? '-active' : ''}`}
                    style={[
                      styles.dot,
                      active && styles.dotActive,
                      { backgroundColor: active ? palette.accent : palette.nearBorder },
                    ]}
                  />
                );
              })}
            </View>
          )}
        </>
      )}

      {/* ── Grey rows: approaching but not yet in hero zone ── */}
      {greyTasks.length > 0 && (
        <View style={[styles.listSection, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          {isHero && (
            <Text style={[styles.listSectionLabel, { color: palette.muted }]}>ALSO CLOSE</Text>
          )}
          {greyTasks.map((task, index) => (
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

// Memoized so unrelated TodayScreen re-renders (points/inbox badge, scroll
// layout) don't rebuild the card and restart its animations — it re-renders
// only when its own props (tasks / nearby data) change (KAN-156).
export default React.memo(NearbyCard);

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

  // ── Hero carousel ──
  carousel: {
    marginBottom: 10,
  },
  carouselContent: {
    // no extra padding — each slide is full-width via an inline width
  },
  // ── Page indicator dots ──
  dotsRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            5,
    marginBottom:   12,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  dotActive: {
    width: 16,
  },

  // ── Hero block (single card inside carousel) ──
  heroBlock: {
    borderRadius: radius.card,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      16,
    overflow:     'hidden',
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
    fontVariant:   ['tabular-nums'],
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
    borderRadius:      radius.card,
    borderWidth:       1,
    overflow:          'hidden',
    paddingTop:        12,
    paddingHorizontal: 16,
    paddingBottom:     4,
  },
  listSectionLabel: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: 1,
    marginBottom:  8,
  },
  idleRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 12,
    gap:             14,
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
