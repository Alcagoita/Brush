/**
 * PlacesIKnowScreen — KAN-234
 *
 * "Places I know" — the always-on habitat area (ambient, no delete action)
 * plus every downloaded trip (dates/refresh-date/delete). Expiry framed as
 * memory, not storage. All state/logic lives in usePlacesIKnow.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, SuitcaseIcon } from '../components/AppIcon';
import { usePlacesIKnow } from '../hooks/usePlacesIKnow';
import { formatTripSizeMb } from '../services/tripDownload';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Trip } from '../types';
import { COPY } from '../constants/copy';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PlacesIKnow'>;

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatExpiry(expiresAt: number): string {
  return COPY.tripPlanner.tripRowKnownUntil(
    new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  );
}

export default function PlacesIKnowScreen() {
  const { palette } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const { loading, habitatSizeBytes, trips, refresh, refreshingTripId, refreshTrip, deleteTrip } = usePlacesIKnow();
  const [refreshing, setRefreshing] = useState(false);

  const onPullToRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const confirmDelete = (trip: Trip) => {
    Alert.alert(
      COPY.tripPlanner.deleteConfirmTitle(trip.destination),
      COPY.tripPlanner.deleteConfirmBody,
      [
        { text: COPY.tripPlanner.deleteCancelAction, style: 'cancel' },
        { text: COPY.tripPlanner.deleteConfirmAction, style: 'destructive', onPress: () => deleteTrip(trip) },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.navBtn}
          // Not goBack() — the only entry point is TripPlanner's post-download
          // "done" flow (navigation.navigate('PlacesIKnow')), so goBack() would
          // land back on the just-finished download screen instead of Calendar.
          onPress={() => navigation.navigate('Calendar')}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>{COPY.tripPlanner.placesIKnowTitle}</Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullToRefresh} tintColor={palette.accent} />}>

          {/* Always-on habitat row — ambient, no delete action */}
          <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
              <SuitcaseIcon color={palette.muted} size={20} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>{COPY.tripPlanner.habitatRowLabel}</Text>
              <Text style={[styles.rowSub, { color: palette.muted }]} numberOfLines={1}>
                {COPY.tripPlanner.habitatRowSub} · {formatTripSizeMb(habitatSizeBytes)}
              </Text>
            </View>
          </View>

          {trips.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.muted }]}>{COPY.tripPlanner.placesIKnowEmpty}</Text>
          ) : (
            trips.map(trip => (
              <View key={trip.id} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
                  <SuitcaseIcon color={palette.muted} size={20} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>{trip.destination}</Text>
                  <Text style={[styles.rowSub, { color: palette.muted }]} numberOfLines={1}>
                    {trip.startDate && trip.endDate
                      ? COPY.tripPlanner.tripRowDates(formatDateShort(trip.startDate), formatDateShort(trip.endDate))
                      : COPY.tripPlanner.tripRowNoDates}
                    {' · '}{formatExpiry(trip.expiresAt)}
                  </Text>
                </View>
                {refreshingTripId === trip.id ? (
                  <ActivityIndicator color={palette.muted} size="small" />
                ) : (
                  <>
                    <Pressable
                      onPress={() => refreshTrip(trip)}
                      hitSlop={8}
                      style={styles.actionBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Refresh ${trip.destination}`}>
                      <Text style={[styles.actionLabel, { color: palette.accent }]}>Refresh</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(trip)}
                      hitSlop={8}
                      style={styles.actionBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${trip.destination}`}>
                      <Text style={[styles.deleteX, { color: palette.muted }]}>×</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ))
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

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.page, paddingTop: 16, gap: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radii.card, borderWidth: 1, padding: 12,
  },
  iconTile: { width: 36, height: 36, borderRadius: radii.listIcon, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontFamily: 'Geist-Medium', fontWeight: '500' },
  rowSub: { fontSize: 12, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },

  actionBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  actionLabel: { fontSize: 13, fontFamily: 'Geist-Medium', fontWeight: '500' },
  deleteX: { fontSize: 22, lineHeight: 22 },

  emptyText: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center', marginTop: 24 },
});
