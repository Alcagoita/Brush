/**
 * ErrandBundleCard — KAN-235.
 *
 * Quiet row below NearbyCard, shown only when a bundle exists (absence is
 * the default, same as ContextChip). Tap opens a sheet (Modal + Animated
 * opacity/translateY only — Fabric-safe, same pattern as ContextChip.tsx)
 * listing the bundled tasks with their candidate place + distance. A small
 * dismiss control hides this specific bundle for the rest of the day.
 *
 * KAN-283: the sheet's one action hands the whole cluster to Maps as an
 * ordered walk. Each listed stop can be left out first, down to a floor of
 * MIN_BUNDLE_TASKS — below two there's no route to hand off, and opening a
 * single place is already one tap away in the Nearby list, which is why
 * there's no anchor-only action here any more.
 *
 * Copy reveals opportunity, never schedules — no ordering, no urgency.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
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
import { CheckIcon, CloseIcon, PinIcon } from './AppIcon';
import { openMultiStopDirections, formatDistance } from '../services/maps';
import { getLastSearchCoords } from '../services/proximity';
import { orderStopsNearestFirst } from '../services/routeHandoff';
import { logTap } from '../services/analytics';
import { MIN_BUNDLE_TASKS } from '../services/errandBundles';
import type { ErrandBundle } from '../services/errandBundles';
import type { ClusterLeisureSuggestion } from '../services/clusterLeisure';
import { COPY } from '../constants/copy';

export interface ErrandBundleCardProps {
  bundle: ErrandBundle;
  onDismiss: () => void;
  /** KAN-293 — a leisure place among the stops, or null/undefined for none. */
  leisure?: ClusterLeisureSuggestion | null;
  /** Called when the user accepts the leisure invitation. Creating the task is
   *  the screen's job (it owns the uid); the card only asks. */
  onKeepLeisureInMind?: (suggestion: ClusterLeisureSuggestion) => void;
}

export default function ErrandBundleCard({
  bundle,
  onDismiss,
  leisure,
  onKeepLeisureInMind,
}: ErrandBundleCardProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [sheetOpen, setSheetOpen]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // KAN-283 — stops the user has chosen to leave out of THIS route. Purely
  // in-the-moment: nothing is persisted, and reopening the sheet starts
  // clean (see the sheetOpen effect below). Excluding a stop never touches
  // the bundle itself, so the card line and the box's own behaviour are
  // unaffected — it only narrows what gets handed to Maps.
  const [excludedTaskIds, setExcludedTaskIds] = useState<ReadonlySet<string>>(() => new Set());

  // KAN-293 — whether the leisure invitation has been accepted in this sheet.
  const [leisureKept, setLeisureKept] = useState(false);

  const scrimOpacity    = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (sheetOpen) {
      // KAN-283 — each opening starts from the full cluster. Leaving a stop
      // out is a decision about this moment, not a preference to remember.
      setExcludedTaskIds(new Set());
      setLeisureKept(false);
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

  const activeEntries = useMemo(
    () => bundle.entries.filter(entry => !excludedTaskIds.has(entry.task.id)),
    [bundle.entries, excludedTaskIds],
  );

  // A route needs two places, so the last two selected can't be unselected.
  // This locks the SELECTED boxes only — an unselected stop must stay
  // tappable, otherwise dropping to two would strand the user there with no
  // way back up.
  const canDeselect = activeEntries.length > MIN_BUNDLE_TASKS;

  const handleToggleStop = (taskId: string) => {
    logTap('errand_bundle_toggle_stop');
    setExcludedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);       // re-including is always allowed
      } else {
        const activeCount = bundle.entries.length - prev.size;
        if (activeCount <= MIN_BUNDLE_TASKS) { return prev; }
        next.add(taskId);
      }
      return next;
    });
  };

  // Hand the cluster to Maps as one ordered walk, using the places the
  // proximity engine already resolved (bundle.entries[].place): no new
  // resolution, no API call from this path.
  //
  // Origin is the position that proximity tick searched from — the exact
  // point these places' distances were measured against, so ordering from
  // anything else would contradict what the sheet is showing. If it's
  // unavailable there's no honest origin to route from, so the action is
  // hidden rather than guessed (see routeStops).
  // Memoised: this card sits on the animation-heavy Today screen and
  // re-renders with it, while the ordering only changes when the kept stops
  // or the search position do.
  const routeOrigin = getLastSearchCoords();
  const routeStops = useMemo(
    () => (routeOrigin && activeEntries.length >= MIN_BUNDLE_TASKS
      ? orderStopsNearestFirst(routeOrigin, activeEntries, entry => entry.place)
      : null),
    [routeOrigin?.lat, routeOrigin?.lng, activeEntries],
  );

  // KAN-293 — quiet confirmation that the invitation was accepted, so the
  // button can't be tapped twice into two identical tasks. In-the-moment
  // only, like excludedTaskIds: reopening the sheet starts clean.
  const handleKeepLeisure = () => {
    if (!leisure || leisureKept) { return; }
    logTap('errand_bundle_leisure_keep');
    setLeisureKept(true);
    onKeepLeisureInMind?.(leisure);
  };

  const handleLeisureTickets = () => {
    const url = leisure?.place.website;
    if (!url) { return; }
    logTap('errand_bundle_leisure_tickets');
    Linking.openURL(url).catch(err => {
      console.warn('[ErrandBundleCard] leisure website open failed', err);
    });
  };

  const handleOpenAllStops = () => {
    if (!routeOrigin || !routeStops) { return; }
    logTap('errand_bundle_open_all_stops');
    openMultiStopDirections(routeOrigin, routeStops.map(entry => entry.place)).catch(err => {
      console.warn('[ErrandBundleCard] openMultiStopDirections failed', err);
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
              {/* KAN-283 — every stop stays listed; unselected ones just fade
                  back. Toggling only narrows what's handed to Maps: it never
                  completes, deletes or dismisses the task. */}
              {bundle.entries.map(({ task, place }) => {
                const selected = !excludedTaskIds.has(task.id);
                // Only a selected box can be locked, and only at the floor.
                const locked = selected && !canDeselect;
                return (
                  <Pressable
                    key={task.id}
                    testID={`errand-bundle-stop-${task.id}`}
                    style={[
                      styles.row,
                      { borderTopColor: palette.line },
                      !selected && { backgroundColor: palette.surface2 },
                    ]}
                    onPress={() => handleToggleStop(task.id)}
                    disabled={locked}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: locked }}
                    accessibilityLabel={locked
                      ? COPY.errandBundle.deselectStopDisabledA11y
                      : selected
                        ? COPY.errandBundle.deselectStopA11y(task.title)
                        : COPY.errandBundle.selectStopA11y(task.title)}>
                    <View
                      style={[
                        styles.checkbox,
                        selected
                          ? { backgroundColor: locked ? palette.faint : palette.accent, borderColor: locked ? palette.faint : palette.accent }
                          : { borderColor: palette.faint },
                      ]}>
                      {selected && <CheckIcon color={palette.bg} size={12} />}
                    </View>
                    <View style={styles.rowText}>
                      <Text
                        style={[styles.rowTitle, { color: selected ? palette.text : palette.muted }]}
                        numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text
                        style={[styles.rowSub, { color: selected ? palette.muted : palette.faint }]}
                        numberOfLines={1}>
                        {`${place.name} · ${formatDistance(place.distanceMeters)}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* KAN-293 — the leisure companion line. Sits BELOW the stop list
                and outside it on purpose: it is not a stop, has no checkbox,
                and never joins the route or the "N of these" count. It states
                a fact and offers; accepting creates an ordinary task. */}
            {leisure && (
              <View
                testID="errand-bundle-leisure"
                style={[styles.leisure, { borderTopColor: palette.line }]}>
                <Text style={[styles.leisureLine, { color: palette.text }]}>
                  {leisure.type === 'park'
                    ? COPY.errandBundle.leisureParkLine(leisure.place.name)
                    : COPY.errandBundle.leisureOtherLine(leisure.place.name)}
                </Text>
                <View style={styles.leisureActions}>
                  <Pressable
                    testID="errand-bundle-leisure-keep"
                    style={[styles.leisureBtn, { borderColor: palette.line }]}
                    onPress={handleKeepLeisure}
                    disabled={leisureKept}
                    accessibilityRole="button"
                    accessibilityLabel={COPY.errandBundle.leisureKeepInMindA11y(leisure.place.name)}>
                    <Text style={[styles.leisureBtnLabel, { color: leisureKept ? palette.faint : palette.text }]}>
                      {COPY.errandBundle.leisureKeepInMind}
                    </Text>
                  </Pressable>
                  {/* Rendered only when OSM already had a site for this place.
                      No lookup ever happens to find one — absent means absent. */}
                  {leisure.place.website && (
                    <Pressable
                      testID="errand-bundle-leisure-tickets"
                      style={[styles.leisureBtn, { borderColor: palette.line }]}
                      onPress={handleLeisureTickets}
                      accessibilityRole="button"
                      accessibilityLabel={COPY.errandBundle.leisureGetTicketsA11y(leisure.place.name)}>
                      <Text style={[styles.leisureBtnLabel, { color: palette.text }]}>
                        {COPY.errandBundle.leisureGetTickets}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {leisureKept && (
                  <Text style={[styles.leisureConfirm, { color: palette.muted }]}>
                    {COPY.errandBundle.leisureKeptConfirmation(leisure.place.name)}
                  </Text>
                )}
              </View>
            )}

            {/* KAN-283 — the cluster as one ordered walk, and the sheet's
                only action. Opening a single place is already one tap away
                in the Nearby list, so there's no anchor-only button here. */}
            {routeStops && (
              <Pressable
                testID="errand-bundle-open-all"
                style={[styles.mapsBtn, { backgroundColor: palette.surface2 }]}
                onPress={handleOpenAllStops}
                accessibilityRole="button"
                accessibilityLabel={COPY.errandBundle.openAllInMapsA11y(routeStops.length)}>
                <Text style={[styles.mapsLabel, { color: palette.text, fontVariant: ['tabular-nums'] }]}>
                  {COPY.errandBundle.openAllInMaps(routeStops.length)}
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
    // Bleeds the unselected row's grey slightly past the text on both sides
    // without shifting where the text sits (KAN-283).
    paddingHorizontal: 10,
    marginHorizontal:  -10,
  },
  checkbox: {
    width:          18,
    height:         18,
    borderRadius:   radius.checkbox,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
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

  // KAN-293 — separated from the stop list by a divider, so it reads as an
  // aside rather than another stop. No tint, no accent: an invitation should
  // not compete with the errands the user actually came here for.
  leisure: {
    marginHorizontal: spacing.page,
    marginTop:        14,
    paddingTop:       14,
    borderTopWidth:   1,
    gap:              10,
  },
  leisureLine: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    lineHeight: 19,
  },
  leisureActions: {
    flexDirection: 'row',
    gap:           8,
  },
  leisureBtn: {
    paddingHorizontal: 14,
    height:            36,
    borderRadius:      radius.chip,
    borderWidth:       1,
    alignItems:        'center',
    justifyContent:    'center',
  },
  leisureBtnLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  leisureConfirm: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
});
