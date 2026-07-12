/**
 * WhereWeveBeenScreen — KAN-257
 *
 * A humble timeline of past trips, grouped by year — destination + dates
 * only. No place data, no counts, no gamification: the app forgets the
 * detail but remembers being there. "Forget this trip" (confirm sheet)
 * permanently deletes the trip doc.
 */

import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, SuitcaseIcon } from '../components/AppIcon';
import { useWhereWeveBeen } from '../hooks/useWhereWeveBeen';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Trip } from '../types';
import { COPY } from '../constants/copy';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'WhereWeveBeen'>;
type Route = RouteProp<RootStackParamList, 'WhereWeveBeen'>;

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function WhereWeveBeenScreen() {
  const { palette } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const { loading, yearGroups, forgetTrip } = useWhereWeveBeen();
  const highlightTripId = route.params?.highlightTripId;

  const confirmForget = (trip: Trip) => {
    Alert.alert(
      COPY.whereWeveBeenScreen.forgetConfirmTitle(trip.destination),
      COPY.whereWeveBeenScreen.forgetConfirmBody,
      [
        { text: COPY.whereWeveBeenScreen.cancel, style: 'cancel' },
        { text: COPY.whereWeveBeenScreen.forgetConfirmAction, style: 'destructive', onPress: () => forgetTrip(trip) },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={COPY.whereWeveBeenScreen.backA11y}>
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>{COPY.whereWeveBeenScreen.screenTitle}</Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          {yearGroups.map(group => (
            <View key={group.year} style={styles.yearGroup}>
              <Text style={[styles.yearLabel, { color: palette.muted }]}>{group.year}</Text>
              <View style={styles.tripList}>
                {group.trips.map(trip => (
                  <View
                    key={trip.id}
                    style={[
                      styles.row,
                      { backgroundColor: palette.surface, borderColor: palette.line },
                      trip.id === highlightTripId && { borderColor: palette.accent },
                    ]}>
                    <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
                      <SuitcaseIcon color={palette.muted} size={20} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>{trip.destination}</Text>
                      <Text style={[styles.rowSub, { color: palette.muted }]} numberOfLines={1}>
                        {trip.startDate && trip.endDate
                          ? COPY.tripPlanner.tripRowDates(formatDateShort(trip.startDate), formatDateShort(trip.endDate))
                          : COPY.tripPlanner.tripRowNoDates}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => confirmForget(trip)}
                      hitSlop={8}
                      style={styles.actionBtn}
                      accessibilityRole="button"
                      accessibilityLabel={COPY.whereWeveBeenScreen.forgetTripA11y(trip.destination)}>
                      <Text style={[styles.deleteX, { color: palette.muted }]}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
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

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.page, paddingTop: 16, gap: 24 },

  yearGroup: { gap: 10 },
  yearLabel: {
    fontSize: 13, fontWeight: '600', fontFamily: 'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  tripList: { gap: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radii.card, borderWidth: 1, padding: 12,
  },
  iconTile: { width: 36, height: 36, borderRadius: radii.listIcon, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontFamily: 'Geist-Medium', fontWeight: '500' },
  rowSub: { fontSize: 12, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },

  actionBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  deleteX: { fontSize: 22, lineHeight: 22 },
});
