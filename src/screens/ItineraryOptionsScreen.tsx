/**
 * ItineraryOptionsScreen — KAN-281
 *
 * Resolves a destination for every open POI task, orders them into one
 * multi-stop route (greedy nearest-neighbor from the current position),
 * and presents it as two option cards — "On foot" and "By car" — sharing
 * the exact same stops/order, differing only in the Maps travel mode.
 *
 * Doctrine: reveal facts freely, order stops on request only, judge/command
 * never. Cards state facts (stop names, distances) — never "best" /
 * "optimal" / "recommended". No route state is stored anywhere; tasks
 * complete only by brushing, same as always.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, PoiIcon } from '../components/AppIcon';
import { COPY } from '../constants/copy';
import { todayISO } from '../utils/date';
import { getTasksForDate } from '../services/firestore';
import { getPositionLowAccuracy } from '../services/geolocation';
import { getLastSearchCoords } from '../services/proximity';
import { openMultiStopDirections, formatDistance } from '../services/maps';
import { resolveTripDestinations, planTrip, type TripPlan } from '../services/oneTripForAll';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ItineraryOptions'>;

function stopLine(stop: TripPlan['stops'][number]): string {
  return stop.place.source === 'learned'
    ? COPY.itineraryOptionsScreen.destinationLearned(stop.place.name)
    : COPY.itineraryOptionsScreen.destinationWithDistance(stop.place.name, formatDistance(stop.place.distanceMeters));
}

export default function ItineraryOptionsScreen() {
  const { palette } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = getAuth().currentUser?.uid;
      if (!uid) { if (!cancelled) { setLoading(false); } return; }

      try {
        const coords = getLastSearchCoords() ?? await getPositionLowAccuracy();
        const tasks = await getTasksForDate(uid, todayISO());
        const { resolved, excludedCount } = await resolveTripDestinations(tasks, coords, uid);
        const tripPlan = planTrip(coords, resolved, excludedCount);
        if (!cancelled) { setPlan(tripPlan); setOrigin(coords); }
      } catch {
        if (!cancelled) { setPlan({ stops: [], excludedCount: 0, totalDistanceMeters: 0 }); }
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openCard = (travelMode: 'walking' | 'driving') => {
    if (!plan || plan.stops.length === 0 || !origin) { return; }
    openMultiStopDirections(origin, plan.stops.map(s => s.place), travelMode).catch(() => {});
  };

  const totalKm = plan ? (plan.totalDistanceMeters / 1000).toFixed(1) : '0.0';

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
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={palette.accent} />
          <Text style={[styles.loadingLabel, { color: palette.muted }]}>{COPY.itineraryOptionsScreen.loadingLabel}</Text>
        </View>
      ) : !plan || plan.stops.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={[styles.emptyText, { color: palette.muted }]}>{COPY.itineraryOptionsScreen.emptyStateBody}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          {(['walking', 'driving'] as const).map((travelMode) => (
            <Pressable
              key={travelMode}
              testID={`itinerary-card-${travelMode}`}
              onPress={() => openCard(travelMode)}
              style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}
              accessibilityRole="button"
              accessibilityLabel={COPY.itineraryOptionsScreen.openInMapsA11y(
                travelMode === 'walking' ? COPY.itineraryOptionsScreen.onFootLabel : COPY.itineraryOptionsScreen.byCarLabel,
              )}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  {travelMode === 'walking' ? COPY.itineraryOptionsScreen.onFootLabel : COPY.itineraryOptionsScreen.byCarLabel}
                </Text>
                <Text style={[styles.cardStopsCount, { color: palette.muted }]}>
                  {COPY.itineraryOptionsScreen.stopsCount(plan.stops.length)}
                </Text>
              </View>

              {plan.stops.map((stop, i) => (
                <View key={stop.task.id} style={styles.stopRow}>
                  <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
                    <PoiIcon type={stop.task.poi ?? ''} color={palette.muted} size={16} />
                  </View>
                  <Text style={[styles.stopLabel, { color: palette.text }]} numberOfLines={1}>
                    {i + 1}. {stopLine(stop)}
                  </Text>
                </View>
              ))}

              <Text style={[styles.totalDistance, { color: palette.muted }]}>
                {COPY.itineraryOptionsScreen.totalDistance(totalKm)}
              </Text>

              {plan.excludedCount > 0 && (
                <Text style={[styles.exclusionLine, { color: palette.faint }]}>
                  {COPY.itineraryOptionsScreen.exclusionLine(plan.excludedCount)}
                </Text>
              )}
            </Pressable>
          ))}
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

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: spacing.page },
  loadingLabel: { fontSize: 14, fontFamily: 'Geist-Regular' },
  emptyText: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center' },

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
  iconTile: { width: 28, height: 28, borderRadius: radii.listIcon, alignItems: 'center', justifyContent: 'center' },
  stopLabel: { flex: 1, fontSize: 14, fontFamily: 'Geist-Regular' },

  totalDistance: { fontSize: 13, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },
  exclusionLine: { fontSize: 12, fontFamily: 'Geist-Regular' },
});
