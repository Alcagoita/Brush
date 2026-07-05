/**
 * ContextChip — quiet header signal for the app's current context (KAN-241).
 *
 * This ticket only wires the offline-with-coverage state: a small muted
 * glyph shown next to the Today header's greeting when the device is
 * offline AND the habitat cache already has data somewhere. It replaces
 * the full-width NetworkBanner for that case — the banner now only shows
 * for the "no cache anywhere yet" case (see NetworkBanner.tsx).
 *
 *   1. Online                          → chip absent
 *   2. Offline, cache covers here      → glyph (this component)
 *   3. Offline, no cache at all        → NetworkBanner, not this component
 *   4. Offline, cache exists elsewhere → glyph (same as #2 — proximity.ts's
 *                                        own once-per-session toast covers
 *                                        the "you've wandered off" nudge)
 *
 * Tapping the glyph opens a small sheet (Modal + Animated opacity/
 * translateY only — Fabric-safe, same pattern as ShareProfileSheet.tsx)
 * showing when the area was last learned, with a manual refresh option
 * once back online. The sheet stays mounted/visible independent of the
 * chip's own offline gating so it doesn't vanish mid-interaction if
 * connectivity flips back on while it's open.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { CloudOffIcon, CloseIcon, RefreshIcon } from './AppIcon';
import { useOfflineCoverage } from '../hooks/useOfflineCoverage';
import { getMostRecentHabitatUpdateAt, refreshHabitatCacheIfStale } from '../services/habitatCache';
import { getLastSearchCoords } from '../services/proximity';
import { getCategories } from '../services/firestore';
import { ALL_POI_TYPES } from '../types';
import { COPY } from '../constants/copy';

function formatLearnedDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ContextChip() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { offline, hasCache } = useOfflineCoverage();

  const [sheetOpen, setSheetOpen]         = useState(false);
  const [modalVisible, setModalVisible]   = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const scrimOpacity    = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (sheetOpen) {
      setModalVisible(true);
      setLastUpdatedAt(getMostRecentHabitatUpdateAt());
      scrimOpacity.setValue(0);
      sheetTranslateY.setValue(screenHeight);
      Animated.parallel([
        Animated.timing(scrimOpacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scrimOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: screenHeight, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) { setModalVisible(false); }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen, screenHeight]);

  const handleRefresh = useCallback(async () => {
    const coords = getLastSearchCoords();
    if (!coords) { return; }

    setRefreshing(true);
    try {
      const uid = getAuth().currentUser?.uid;
      const categories = uid ? await getCategories(uid) : [];
      const customCategoryPoiTypes = categories.map(c => c.poi).filter((p): p is string => !!p);
      const poiTypes = [...new Set([...ALL_POI_TYPES, ...customCategoryPoiTypes])];
      await refreshHabitatCacheIfStale(coords.lat, coords.lng, poiTypes, true);
      setLastUpdatedAt(getMostRecentHabitatUpdateAt());
    } catch (err) {
      console.warn('[ContextChip] refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const showChip = offline && hasCache;

  return (
    <>
      {showChip && (
        <Pressable
          style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.line }]}
          onPress={() => setSheetOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={COPY.contextChip.offlineGlyphA11y}>
          <CloudOffIcon color={palette.muted} size={14} />
        </Pressable>
      )}

      {modalVisible && (
        <Modal visible={modalVisible} transparent animationType="none" onRequestClose={() => setSheetOpen(false)} statusBarTranslucent>
          <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents="box-none">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSheetOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
            />
          </Animated.View>

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
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: palette.surface2 }]} />
            </View>

            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: palette.text }]}>{COPY.contextChip.sheetTitle}</Text>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: palette.surface2 }]}
                onPress={() => setSheetOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <CloseIcon color={palette.muted} size={16} />
              </Pressable>
            </View>

            <Text style={[styles.body, { color: palette.muted }]}>
              {COPY.contextChip.sheetBody(lastUpdatedAt != null ? formatLearnedDate(lastUpdatedAt) : undefined)}
            </Text>

            {!offline && (
              <Pressable
                style={[styles.refreshBtn, { backgroundColor: palette.surface2, opacity: refreshing ? 0.6 : 1 }]}
                onPress={handleRefresh}
                disabled={refreshing}
                accessibilityRole="button"
                accessibilityLabel={refreshing ? COPY.contextChip.refreshingLabel : COPY.contextChip.refreshButton}>
                <RefreshIcon color={palette.text} size={16} />
                <Text style={[styles.refreshLabel, { color: palette.text }]}>
                  {refreshing ? COPY.contextChip.refreshingLabel : COPY.contextChip.refreshButton}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    width:          28,
    height:         28,
    borderRadius:   radius.chip,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderTopWidth:       StyleSheet.hairlineWidth,
  },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle:    { width: 36, height: 4, borderRadius: 2 },

  headerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.page,
    paddingTop:        16,
    paddingBottom:     14,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  closeBtn:    { width: 30, height: 30, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },

  body: {
    fontSize:          14,
    fontFamily:        'Geist-Regular',
    paddingHorizontal: spacing.page,
    paddingBottom:     20,
  },

  refreshBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    height:            48,
    borderRadius:      radius.ctaBtn,
    marginHorizontal:  spacing.page,
  },
  refreshLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
});
