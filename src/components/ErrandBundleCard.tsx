/**
 * ErrandBundleCard — KAN-235.
 *
 * Quiet row below NearbyCard, shown only when a bundle exists (absence is
 * the default, same as ContextChip). Tap opens a sheet (Modal + Animated
 * opacity/translateY only — Fabric-safe, same pattern as ContextChip.tsx)
 * listing the bundled tasks with their candidate place + distance, and
 * "Open in Maps" for the anchor. A small dismiss control hides this
 * specific bundle for the rest of the day.
 *
 * Copy reveals opportunity, never schedules — no ordering, no urgency.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { CloseIcon, PinIcon, ChevronRightIcon } from './AppIcon';
import { openInMaps, formatDistance } from '../services/maps';
import { logTap } from '../services/analytics';
import type { ErrandBundle } from '../services/errandBundles';
import { COPY } from '../constants/copy';

export interface ErrandBundleCardProps {
  bundle: ErrandBundle;
  onDismiss: () => void;
}

export default function ErrandBundleCard({ bundle, onDismiss }: ErrandBundleCardProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [sheetOpen, setSheetOpen]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const scrimOpacity    = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (sheetOpen) {
      setModalVisible(true);
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

  const anchorName = bundle.anchor.name;
  const taskCount   = bundle.entries.length;

  const handleOpenAnchor = () => {
    logTap('errand_bundle_open_maps');
    openInMaps(bundle.anchor.lat, bundle.anchor.lng, anchorName).catch(err => {
      console.warn('[ErrandBundleCard] openInMaps failed', err);
    });
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
        <Pressable
          style={styles.cardMain}
          onPress={() => { logTap('errand_bundle_open_sheet'); setSheetOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={COPY.errandBundle.cardA11y(taskCount, anchorName)}>
          <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
            <PinIcon color={palette.muted} size={18} />
          </View>
          <Text style={[styles.cardText, { color: palette.text }]} numberOfLines={2}>
            {COPY.errandBundle.cardLine(taskCount, anchorName)}
          </Text>
        </Pressable>
        <Pressable
          style={styles.dismissBtn}
          onPress={() => { logTap('errand_bundle_dismiss'); onDismiss(); }}
          hitSlop={7}
          accessibilityRole="button"
          accessibilityLabel={COPY.errandBundle.dismissA11y}>
          <CloseIcon color={palette.faint} size={14} />
        </Pressable>
      </View>

      {modalVisible && (
        <Modal visible={modalVisible} transparent animationType="none" onRequestClose={() => setSheetOpen(false)} statusBarTranslucent>
          <Animated.View style={[styles.scrim, { backgroundColor: palette.scrim, opacity: scrimOpacity }]} pointerEvents="box-none">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSheetOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={COPY.errandBundle.closeSheetA11y}
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
              <Text style={[styles.headerTitle, { color: palette.text }]}>{COPY.errandBundle.sheetTitle(anchorName)}</Text>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: palette.surface2 }]}
                onPress={() => setSheetOpen(false)}
                hitSlop={7}
                accessibilityRole="button"
                accessibilityLabel={COPY.errandBundle.closeA11y}>
                <CloseIcon color={palette.muted} size={16} />
              </Pressable>
            </View>

            <Text style={[styles.intro, { color: palette.muted }]}>{COPY.errandBundle.sheetIntro}</Text>

            <ScrollView style={styles.list}>
              {bundle.entries.map(({ task, place }) => (
                <View key={task.id} style={[styles.row, { borderTopColor: palette.line }]}>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>{task.title}</Text>
                    <Text style={[styles.rowSub, { color: palette.muted }]} numberOfLines={1}>
                      {`${place.name} · ${formatDistance(place.distanceMeters)}`}
                    </Text>
                  </View>
                  <ChevronRightIcon color={palette.faint} size={14} strokeWidth={1.8} />
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.mapsBtn, { backgroundColor: palette.surface2 }]}
              onPress={handleOpenAnchor}
              accessibilityRole="button"
              accessibilityLabel={COPY.errandBundle.openAnchorInMaps(anchorName)}>
              <Text style={[styles.mapsLabel, { color: palette.text }]}>
                {COPY.errandBundle.openAnchorInMaps(anchorName)}
              </Text>
            </Pressable>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  spacing.page,
    marginTop:         14,
    padding:           12,
    borderRadius:      radius.card,
    borderWidth:       1,
    gap:               10,
  },
  cardMain: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    minWidth:       0,
  },
  iconTile: {
    width:          36,
    height:         36,
    borderRadius:   radius.listIcon,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  cardText: {
    flex:        1,
    fontSize:    13,
    fontFamily:  'Geist-Regular',
    lineHeight:  18,
    fontVariant: ['tabular-nums'],
  },
  dismissBtn: {
    width:          30,
    height:         30,
    alignItems:     'center',
    justifyContent: 'center',
  },

  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    maxHeight:            '80%',
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
    paddingBottom:     8,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  closeBtn:    { width: 30, height: 30, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },

  intro: {
    fontSize:          14,
    fontFamily:        'Geist-Regular',
    paddingHorizontal: spacing.page,
    paddingBottom:     14,
  },

  list: {
    paddingHorizontal: spacing.page,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap:            10,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  rowSub:   { fontSize: 13, fontFamily: 'Geist-Regular', marginTop: 2, fontVariant: ['tabular-nums'] },

  mapsBtn: {
    alignItems:        'center',
    justifyContent:    'center',
    height:            48,
    borderRadius:      radius.ctaBtn,
    marginHorizontal:  spacing.page,
    marginTop:         14,
  },
  mapsLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
});
