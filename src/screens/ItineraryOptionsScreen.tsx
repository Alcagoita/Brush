/**
 * ItineraryOptionsScreen — KAN-281
 *
 * Resolves a destination for every open POI task, orders them into one
 * multi-stop route (greedy nearest-neighbor from the current position),
 * and presents it as a single card. Travel mode (walking/driving/etc.) is
 * picked by the user inside Maps, not pre-judged here.
 *
 * Doctrine: reveal facts freely, order stops on request only, judge/command
 * never. Cards state facts (stop names, distances) — never "best" /
 * "optimal" / "recommended". No route state is stored anywhere; tasks
 * complete only by brushing, same as always.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, PoiIcon, RefreshIcon, ShoppingBagIcon } from '../components/AppIcon';
import LoadingDots from '../components/LoadingDots';
import { COPY } from '../constants/copy';
import { refreshMallsIfDue } from '../services/habitatCache';
import { openMultiStopDirections, formatDistance } from '../services/maps';
import {
  getLocalTripAlternativeCount,
  planLocalTripAlternative,
  planTripAroundFarTask,
  type TripPlan,
} from '../services/oneTripForAll';
import { findMallOption, type MallOption } from '../services/mallRoute';
import { useToastStore } from '../store/toastStore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Task } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ItineraryOptions'>;
type Route = RouteProp<RootStackParamList, 'ItineraryOptions'>;

function stopLine(stop: TripPlan['stops'][number]): string {
  return stop.place.source === 'learned'
    ? COPY.itineraryOptionsScreen.destinationLearned(stop.place.name)
    : COPY.itineraryOptionsScreen.destinationWithDistance(stop.place.name, formatDistance(stop.place.distanceMeters));
}

/** A reordering of the same venues is not an alternative route. */
function hasNewStop(current: TripPlan, candidate: TripPlan): boolean {
  const currentPlaceIds = new Set(current.stops.map(stop => stop.place.internalId));
  return candidate.stops.some(stop => !currentPlaceIds.has(stop.place.internalId));
}

export default function ItineraryOptionsScreen() {
  const { palette } = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const [positionLoading, setPositionLoading] = useState(true);
  const [walkingLoading, setWalkingLoading] = useState(true);
  const [mallLoading, setMallLoading] = useState(true);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [mallOption, setMallOption] = useState<MallOption | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [tasksForRefresh, setTasksForRefresh] = useState<Task[]>([]);
  const [localAlternativeCount, setLocalAlternativeCount] = useState(0);
  const [localAlternativeIndex, setLocalAlternativeIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRotation = useRef(new Animated.Value(0)).current;
  const requestId = useRef(0);
  const mallSweep = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const requestIdRef = requestId;
    const currentRequest = ++requestId.current;
    setPositionLoading(true);
    setWalkingLoading(true);
    setMallLoading(true);
    setPlan(null);
    setMallOption(null);
    setOrigin(null);
    const coords = params.origin;
    setOrigin(coords);
    setPositionLoading(false);

    const cachedMall = findMallOption(coords, null);
    setMallOption(cachedMall);
    const sweep = refreshMallsIfDue(coords.lat, coords.lng);
    mallSweep.current = sweep;
    const clearSweep = () => { if (mallSweep.current === sweep) { mallSweep.current = null; } };
    sweep.then(clearSweep, clearSweep);
    sweep
      .then(() => { if (!cancelled && requestId.current === currentRequest) { setMallOption(findMallOption(coords, null)); } })
      .catch(() => {});

    setTasksForRefresh(params.tasks);
    void planTripAroundFarTask(params.tasks, coords, params.farTaskIds)
      .then(tripPlan => {
        if (cancelled || requestId.current !== currentRequest) { return; }
        setPlan(tripPlan);
        setLocalAlternativeCount(getLocalTripAlternativeCount(params.tasks, coords));
        setLocalAlternativeIndex(0);
      })
      .catch(() => { if (!cancelled && requestId.current === currentRequest) { setPlan({ stops: [], excludedCount: params.tasks.length, totalDistanceMeters: 0 }); } })
      .finally(() => { if (!cancelled && requestId.current === currentRequest) { setWalkingLoading(false); } });
    setMallLoading(false);
    return () => { cancelled = true; ++requestIdRef.current; };
  }, [params]);

  const openCard = () => {
    if (!plan || plan.stops.length === 0 || !origin) { return; }
    openMultiStopDirections(origin, plan.stops.map(s => s.place)).catch(() => {
      useToastStore.getState().showToast(COPY.itineraryOptionsScreen.mapsOpenFailed);
    });
  };

  const openMallCard = () => {
    if (!mallOption || !origin) { return; }
    // Single destination, no waypoints/ordering — reuses the same
    // multi-stop opener with a one-element stops array.
    openMultiStopDirections(origin, [mallOption]).catch(() => {
      useToastStore.getState().showToast(COPY.itineraryOptionsScreen.mapsOpenFailed);
    });
  };

  /** Retry both suggestions; use the local walking cycle when it has another venue set. */
  const refreshRoute = async () => {
    if (!origin || refreshing || (plan?.stops.length && localAlternativeCount <= 1)) { return; }
    const currentRequest = ++requestId.current;
    setRefreshing(true);
    setWalkingLoading(true);
    setMallLoading(true);
    setPlan(null);
    setMallOption(null);

    refreshRotation.setValue(0);
    Animated.timing(refreshRotation, {
      toValue: -1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    const walkingSearch = (async () => {
      try {
        if (plan?.stops.length && localAlternativeCount > 1) {
          // A reordering of the same venues is not a new walking route.
          let nextIndex = (localAlternativeIndex + 1) % localAlternativeCount;
          let nextPlan = planLocalTripAlternative(tasksForRefresh, origin, nextIndex);
          if (!hasNewStop(plan, nextPlan)) {
            nextIndex = (nextIndex + 1) % localAlternativeCount;
            nextPlan = planLocalTripAlternative(tasksForRefresh, origin, nextIndex);
          }
          if (requestId.current === currentRequest) {
            setPlan(hasNewStop(plan, nextPlan) ? nextPlan : plan);
            setLocalAlternativeIndex(nextIndex);
          }
        } else {
          const nextPlan = await planTripAroundFarTask(tasksForRefresh, origin, params.farTaskIds);
          if (requestId.current === currentRequest) {
            setPlan(nextPlan);
            setLocalAlternativeCount(getLocalTripAlternativeCount(tasksForRefresh, origin));
            setLocalAlternativeIndex(0);
          }
        }
      } catch {
        if (requestId.current === currentRequest) {
          setPlan({ stops: [], excludedCount: tasksForRefresh.length, totalDistanceMeters: 0 });
        }
      } finally {
        if (requestId.current === currentRequest) { setWalkingLoading(false); }
      }
    })();
    const mallSearch = (mallSweep.current ?? refreshMallsIfDue(origin.lat, origin.lng))
      .catch(() => {})
      .then(() => { if (requestId.current === currentRequest) { setMallOption(findMallOption(origin, null)); } })
      .finally(() => { if (requestId.current === currentRequest) { setMallLoading(false); } });

    // A stalled provider must never trap the screen in its loading state.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled([walkingSearch, mallSearch]),
      new Promise<void>(resolve => { timeout = setTimeout(resolve, 15_000); }),
    ]);
    if (timeout) { clearTimeout(timeout); }
    if (requestId.current === currentRequest) {
      ++requestId.current;
      setWalkingLoading(false);
      setMallLoading(false);
      setRefreshing(false);
    }
  };

  const totalKm = plan ? (plan.totalDistanceMeters / 1000).toFixed(1) : '0.0';
  const hasWalkingPlan = (plan?.stops.length ?? 0) > 0;
  const hasContent = hasWalkingPlan || mallOption !== null;
  const loading = positionLoading || (!hasContent && (walkingLoading || mallLoading));
  const refreshDisabled = !origin || refreshing || (hasWalkingPlan && localAlternativeCount <= 1);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={COPY.itineraryOptionsScreen.backA11y}>
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>{COPY.itineraryOptionsScreen.screenTitle}</Text>
        <Pressable
          testID="refresh-itinerary-button"
          style={styles.navBtn}
          onPress={refreshRoute}
          disabled={refreshDisabled}
          accessibilityRole="button"
          accessibilityLabel={COPY.itineraryOptionsScreen.refreshA11y}
          accessibilityState={{ disabled: refreshDisabled }}>
          <Animated.View
            testID="refresh-itinerary-icon"
            style={{
              transform: [{
                rotate: refreshRotation.interpolate({
                  inputRange: [-1, 0],
                  outputRange: ['-360deg', '0deg'],
                }),
              }],
            }}>
            <RefreshIcon color={refreshDisabled ? palette.faint : palette.text} size={20} />
          </Animated.View>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <LoadingDots color={palette.accent} />
          <Text style={[styles.loadingLabel, { color: palette.muted }]}>{COPY.itineraryOptionsScreen.loadingLabel}</Text>
        </View>
      ) : !hasContent ? (
        <View style={styles.loadingWrap}>
          <Text style={[styles.emptyText, { color: palette.muted }]}>{COPY.itineraryOptionsScreen.emptyStateBody}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          {hasWalkingPlan && <Pressable
            testID="itinerary-card"
            onPress={openCard}
            style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}
            accessibilityRole="button"
            accessibilityLabel={COPY.itineraryOptionsScreen.openInMapsA11y}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>{COPY.itineraryOptionsScreen.cardLabel}</Text>
              <Text style={[styles.cardStopsCount, { color: palette.muted }]}>
                {COPY.itineraryOptionsScreen.stopsCount(plan?.stops.length ?? 0)}
              </Text>
            </View>

            {plan?.stops.map((stop, i) => (
              <View key={stop.task.id} style={styles.stopRow}>
                <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
                  <PoiIcon type={stop.task.poi ?? ''} color={palette.muted} size={20} />
                </View>
                <Text style={[styles.stopLabel, { color: palette.text }]} numberOfLines={1}>
                  <Text style={styles.stopNumber}>{i + 1}.</Text> {stopLine(stop)}
                </Text>
              </View>
            ))}

            <Text style={[styles.totalDistance, { color: palette.muted }]}>
              {COPY.itineraryOptionsScreen.totalDistance(totalKm)}
            </Text>

            {(plan?.excludedCount ?? 0) > 0 && (
              <Text style={[styles.exclusionLine, { color: palette.faint }]}>
                {COPY.itineraryOptionsScreen.exclusionLine(plan?.excludedCount ?? 0)}
              </Text>
            )}
          </Pressable>}

          {/* KAN-282 — mall card, only when a qualifying destination mall is
              in range. Always below the stop-by-stop card: tinted AND first
              would read as "recommended", which the doctrine bans. */}
          {mallOption && (
            <Pressable
              testID="mall-card"
              onPress={openMallCard}
              style={[styles.mallCard, { backgroundColor: palette.nearTint, borderColor: palette.nearBorder }]}
              accessibilityRole="button"
              accessibilityLabel={COPY.itineraryOptionsScreen.mallCardA11y(mallOption.name)}
              accessibilityHint={COPY.itineraryOptionsScreen.mallOpenInMapsA11y}>
              <View style={[styles.mallIconTile, { backgroundColor: palette.accent + '33' }]}>
                <ShoppingBagIcon color={palette.accent} size={22} />
              </View>
              <View style={styles.mallTextWrap}>
                {/* nearText is designed to pair with nearTint/nearBorder in
                    both palettes (see ContextChip) — no runtime contrast
                    check needed, the token pairing already guarantees it. */}
                <Text style={[styles.mallTitle, { color: palette.nearText }]}>
                  {COPY.itineraryOptionsScreen.mallCardTitle}
                </Text>
                <Text style={[styles.mallSubtitle, { color: palette.muted }]} numberOfLines={1}>
                  {COPY.itineraryOptionsScreen.mallCardSubtitle(mallOption.name)}
                </Text>
                <Text style={[styles.mallDistance, { color: palette.muted }]}>
                  {COPY.itineraryOptionsScreen.mallCardDistance(formatDistance(mallOption.distanceMeters))}
                </Text>
              </View>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },

  // Absolutely positioned over the full screen (not just the area below
  // topBar) so it centers on the true screen middle — centering only within
  // the post-topBar flex space visibly sits low and reads as an error state.
  loadingWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: spacing.page,
  },
  loadingLabel: { fontSize: 14, fontFamily: 'Geist-Regular' },
  emptyText: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center' },
  retryLabel: { fontSize: 14, fontWeight: '600', fontFamily: 'Geist-SemiBold' },

  content: { paddingHorizontal: spacing.page, paddingTop: 16, gap: 12 },

  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  cardStopsCount: { fontSize: 13, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },

  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconTile: { width: 36, height: 36, borderRadius: radii.listIcon, alignItems: 'center', justifyContent: 'center' },
  stopLabel: { flex: 1, fontSize: 14, fontFamily: 'Geist-Regular' },
  stopNumber: { fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },

  totalDistance: { fontSize: 13, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },
  exclusionLine: { fontSize: 12, fontFamily: 'Geist-Regular' },

  // ── Mall card (KAN-282) ──
  mallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 16,
  },
  mallIconTile: {
    width: 46, height: 46, borderRadius: radii.heroIcon,
    alignItems: 'center', justifyContent: 'center',
  },
  mallTextWrap: { flex: 1, gap: 2 },
  mallTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  mallSubtitle: { fontSize: 13, fontFamily: 'Geist-Regular' },
  mallDistance: { fontSize: 12, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },

  // ── TEMPORARY debug list (KAN-282) — remove once detection bug is fixed ──
});
