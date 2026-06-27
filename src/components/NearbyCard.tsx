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

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme/tokens';

import { NearbyPlace, openInMaps, formatDistance, placeTypeLabel } from '../services/maps';
import { PlacesMap } from '../services/proximity';
import { Task } from '../types';
import { ChevronRightIcon, PoiIcon, RefreshIcon } from './AppIcon';

// Distance threshold that separates the orange hero zone from the grey zone.
const HERO_RADIUS_M = 100;

// ─── Props ────────────────────────────────────────────────────────────────────

interface NearbyCardProps {
  tasks:         Task[];
  nearbyPoiType: string | null;
  /** All nearby places per POI type from the proximity service, ordered nearest-first. */
  poiPlaces:     PlacesMap;
  /**
   * When true Store fine tuning is active (KAN-74).
   * A small indicator appears in the header.
   */
  storeTuningActive?: boolean;
  /** Called when user taps the refresh button in the header. */
  onRefreshLocation?: () => Promise<boolean>;
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
  places,
}: {
  poiType: string;
  task:    Task;
  places:  NearbyPlace[];
}) {
  const { palette } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset to nearest whenever the full result set changes (new proximity search).
  // Keying on the joined placeId list catches replacements at any position,
  // including when places[0] stays the same but other slots change.
  const placesSignature = places.map(p => p.placeId).join(',');
  React.useEffect(() => {
    setCurrentIndex(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesSignature]);

  const place = places[Math.min(currentIndex, places.length - 1)];
  if (!place) { return null; }

  const handleTryAnother = () => {
    setCurrentIndex(i => (i + 1) % places.length);
  };

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

      {/* "Try another place" — only when 2+ POIs found */}
      {places.length > 1 && (
        <Pressable
          style={({ pressed }) => [
            styles.tryAnotherBtn,
            { borderColor: palette.nearBorder, opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={handleTryAnother}
          accessibilityRole="button"
          accessibilityLabel="Try another place">
          <Text style={[styles.tryAnotherLabel, { color: palette.nearText }]}>
            Try another place
          </Text>
        </Pressable>
      )}
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
    <Pressable
      style={({ pressed }) => [
        styles.idleRow,
        !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
        { opacity: pressed && !!place ? 0.65 : 1 },
      ]}
      onPress={place ? () => openInMaps(place.lat, place.lng, place.name) : undefined}
      accessibilityRole={place ? 'button' : 'text'}
      accessibilityLabel={place ? `Open ${place.name} in Maps` : task.title}>
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
    </Pressable>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function NearbyCard({
  tasks,
  nearbyPoiType,
  poiPlaces,
  storeTuningActive = false,
  onRefreshLocation,
}: NearbyCardProps) {

  const { palette } = useTheme();

  // ── Refresh animation ────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [refreshResult, setRefreshResult]   = useState<'ok' | 'fail' | null>(null);
  const spinAngle      = useSharedValue(0);
  const feedbackOpacity = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinAngle.value}deg` }],
  }));
  const feedbackStyle = useAnimatedStyle(() => ({ opacity: feedbackOpacity.value }));

  const handleRefresh = React.useCallback(async () => {
    if (isRefreshing || !onRefreshLocation) { return; }
    setIsRefreshing(true);
    setRefreshResult(null);
    feedbackOpacity.value = 0;
    spinAngle.value = 0;
    spinAngle.value = withRepeat(
      withTiming(-360, { duration: 700, easing: Easing.linear }),
      -1,
      false,
    );
    const ok = await onRefreshLocation();
    cancelAnimation(spinAngle);
    spinAngle.value = withTiming(
      Math.floor(spinAngle.value / -360) * -360,
      { duration: 150 },
    );
    setRefreshResult(ok ? 'ok' : 'fail');
    setIsRefreshing(false);
    feedbackOpacity.value = withTiming(1, { duration: 150 }, () => {
      feedbackOpacity.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing, onRefreshLocation]);

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
  const heroEntries = poiTasks.reduce<Array<{ task: Task; places: NearbyPlace[]; poiType: string }>>(
    (acc, t) => {
      if (!t.poi) { return acc; }
      const places = poiPlaces[t.poi];
      if (!places?.length || places[0].distanceMeters >= HERO_RADIUS_M) { return acc; }
      if (acc.find(e => e.poiType === t.poi)) { return acc; }
      acc.push({ task: t, places, poiType: t.poi });
      return acc;
    },
    [],
  );

  const isHero = heroEntries.length > 0 || nearbyPoiType !== null;

  // Grey-zone tasks: have a known nearby place but are NOT already in the hero carousel.
  const heroPoiTypes = new Set(heroEntries.map(e => e.poiType));
  const greyTasks = poiTasks.filter(t => {
    if (!t.poi || heroPoiTypes.has(t.poi)) { return false; }
    return !!poiPlaces[t.poi]?.length;
  });

  // Nothing to show at all — hide.
  // Guard on actual content, not the isHero flag: nearbyPoiType can be set
  // but have no matching task (or poiPlaces empty), which would leave an
  // empty header. Content is the source of truth for visibility.
  if (heroEntries.length === 0 && greyTasks.length === 0) { return null; }

  const totalPlaces = heroEntries.length + greyTasks.length;

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

        <View style={styles.headerRight}>
          {storeTuningActive && (
            <Text style={[styles.tuningLabel, { color: palette.accent }]}>
              Store tuning on
            </Text>
          )}
          <Animated.Text style={[styles.feedbackLabel, { color: refreshResult === 'ok' ? palette.accent : palette.muted }, feedbackStyle]}>
            {refreshResult === 'ok' ? 'Updated' : 'Failed'}
          </Animated.Text>
          <Text style={[styles.placesCount, { color: palette.muted }]}>
            {totalPlaces === 1 ? '1 place' : `${totalPlaces} places`}
          </Text>
          {onRefreshLocation && (
            <Pressable
              onPress={handleRefresh}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Refresh location">
              <Animated.View style={spinStyle}>
                <RefreshIcon color={palette.muted} size={14} />
              </Animated.View>
            </Pressable>
          )}
        </View>
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
            {heroEntries.map(({ task, places, poiType }) => (
              <View key={poiType} style={{ width: slideWidth }}>
                <HeroCard poiType={poiType} task={task} places={places} />
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
              place={task.poi ? poiPlaces[task.poi]?.[0] : undefined}
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
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  tuningLabel: {
    fontSize:      10,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.5,
  },
  placesCount: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
  },
  feedbackLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
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
  tryAnotherBtn: {
    marginTop:     8,
    borderRadius:  radius.ctaBtn,
    paddingVertical: 10,
    alignItems:    'center',
    borderWidth:   StyleSheet.hairlineWidth,
  },
  tryAnotherLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
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
