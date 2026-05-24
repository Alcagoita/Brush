/**
 * NewTaskSheet — KAN-51
 *
 * Slide-up bottom sheet for creating a new task, triggered by the FAB on the
 * Today screen. Manages its own form state; writes directly to Firestore via
 * addTask() and lets the TodayScreen's live subscription pick up the result.
 *
 * Animations (reanimated):
 *   Open:  sheet  translateY 600 → 0,  320ms cubic-bezier(0.32, 0.72, 0, 1)
 *          scrim  opacity    0   → 0.4, 250ms linear
 *   Close: sheet translateY 0 → 600, 280ms — completion callback via runOnJS
 *
 * Drag-to-dismiss: PanResponder on the drag handle only. Dragging down > 80px
 * (or velocity > 0.5) triggers close; releasing earlier springs back to 0.
 *
 * Dismiss triggers: scrim tap · X button · Cancel button · drag handle
 *
 * Time picker: native DateTimePicker (dialog on Android, spinner on iOS).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme';
import { categories } from '../theme/tokens';
import { PoiType, CategoryKey } from '../types';
import { addTask } from '../services/firestore';
import { CloseIcon, ClockIcon, PoiIcon } from './AppIcon';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_H = Dimensions.get('window').height;

const POI_OPTIONS: { type: PoiType; label: string }[] = [
  { type: 'atm',         label: 'ATM'      },
  { type: 'cafe',        label: 'Café'     },
  { type: 'supermarket', label: 'Market'   },
  { type: 'pharmacy',    label: 'Pharmacy' },
];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewTaskSheetProps {
  visible: boolean;
  uid: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewTaskSheet({ visible, uid, onClose }: NewTaskSheetProps) {
  const { palette } = useTheme();

  // Form state
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState<CategoryKey>('personal');
  const [poi,      setPoi]      = useState<PoiType | null>(null);
  const [time,     setTime]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeDate,       setTimeDate]       = useState<Date>(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  });

  // Controls whether the Modal is mounted (unmount only after exit animation).
  const [mounted, setMounted] = useState(false);

  const titleRef = useRef<TextInput>(null);

  // ── onClose ref — always points to the current prop, never stale ──
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ── Reanimated shared values ──
  const translateY   = useSharedValue(SCREEN_H);
  const scrimOpacity = useSharedValue(0);
  const dragOffset   = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragOffset.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  // ── Reset form when sheet is dismissed ──
  // NOTE: resetForm is stable (dragOffset is a SharedValue — stable reference).
  const resetForm = useCallback(() => {
    setTitle('');
    setCategory('personal');
    setPoi(null);
    setTime('');
    setSubmitting(false);
    setShowTimePicker(false);
    dragOffset.value = 0;
  }, [dragOffset]);

  // ── Cleanup that runs after the close animation completes ──
  // Stable: depends only on resetForm (stable) and onCloseRef (a ref — stable).
  const doClose = useCallback(() => {
    setMounted(false);
    resetForm();
    onCloseRef.current();
  }, [resetForm]);

  // ── Open animation ──
  const openAnimation = useCallback(() => {
    translateY.value   = withTiming(0,   { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) });
    scrimOpacity.value = withTiming(0.4, { duration: 250, easing: Easing.linear });
  }, [translateY, scrimOpacity]);

  // ── Close animation ──
  // Uses withTiming's completion callback + runOnJS so doClose always fires
  // on the JS thread when the animation finishes — more reliable than setTimeout
  // on the New Architecture.
  //
  // closeAnimation is stable: translateY/scrimOpacity are SharedValues,
  // doClose is stable → no stale-closure risk.
  const closeAnimation = useCallback(() => {
    scrimOpacity.value = withTiming(0, { duration: 250, easing: Easing.linear });
    const finish = runOnJS(doClose);
    translateY.value = withTiming(
      SCREEN_H,
      { duration: 280, easing: Easing.bezier(0.32, 0.72, 0, 1) },
      (finished) => {
        'worklet';
        if (finished) finish();
      },
    );
  }, [translateY, scrimOpacity, doClose]);

  // ── Unified close handler — stable (all deps are stable) ──
  const handleClose = useCallback(() => {
    dragOffset.value = 0;
    closeAnimation();
  }, [closeAnimation, dragOffset]);

  // Stable ref so PanResponder always calls the latest handleClose.
  const handleCloseRef = useRef(handleClose);
  useEffect(() => { handleCloseRef.current = handleClose; }, [handleClose]);

  // ── Mount/unmount driven by visible prop ──
  useEffect(() => {
    if (visible) {
      translateY.value = SCREEN_H;  // start off-screen before mount
      setMounted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Play open animation once mounted and visible ──
  useEffect(() => {
    if (mounted && visible) {
      openAnimation();
      setTimeout(() => titleRef.current?.focus(), 280);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ── Drag-to-dismiss via PanResponder on the drag handle ──
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  (_, g) => g.dy > 3,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) dragOffset.value = g.dy;
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80 || g.vy > 0.5) {
        handleCloseRef.current();
      } else {
        dragOffset.value = withSpring(0, { stiffness: 300, damping: 30 });
      }
    },
    onPanResponderTerminate: () => {
      dragOffset.value = withSpring(0, { stiffness: 300, damping: 30 });
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // ── Submit ──
  // handleClose is now stable, so including it in deps is safe.
  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || !uid || submitting) { return; }

    setSubmitting(true);
    try {
      await addTask(uid, {
        title:    trimmed,
        category,
        done:     false,
        date:     todayISO(),
        ...(poi  ? { poi }               : {}),
        ...(time.trim() ? { time: time.trim() } : {}),
      });
      handleClose();
    } catch (err) {
      console.warn('[NewTaskSheet] addTask failed', err);
      setSubmitting(false);
    }
  }, [title, category, poi, time, uid, submitting, handleClose]);

  // ── Time picker change ──
  const handleTimeChange = useCallback((_event: any, selectedDate?: Date) => {
    // Android: dialog auto-dismisses — always hide the picker.
    // iOS:     spinner stays open so user can keep scrolling;
    //          they close it by tapping "Done" (rendered below).
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setTimeDate(selectedDate);
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      setTime(`${h}:${m}`);
    }
  }, []);

  if (!mounted) { return null; }

  const isValid = title.trim().length > 0;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}>

      {/* ── Scrim ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
        pointerEvents="box-only">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* ── Sheet ── */}
      {/* KeyboardAvoidingView is enabled on iOS only.
          On Android, windowSoftInputMode="adjustResize" (AndroidManifest) handles
          keyboard avoidance at the OS level — enabling KAV on Android causes the
          sheet to jump when the keyboard slides in, conflicting with the reanimated
          translateY animation. */}
      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        pointerEvents="box-none">

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: palette.bg },
            sheetStyle,
          ]}>

          {/* Drag handle */}
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: palette.faint }]} />
          </View>

          {/* Header row */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: palette.text }]}>
              New task
            </Text>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: palette.surface }]}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <CloseIcon color={palette.muted} />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* ── Title ── */}
            <Text style={[styles.fieldLabel, { color: palette.muted }]}>TITLE</Text>
            <View style={styles.fieldPad}>
              <TextInput
                ref={titleRef}
                style={[
                  styles.titleInput,
                  {
                    backgroundColor: palette.surface,
                    borderColor:     palette.line,
                    color:           palette.text,
                  },
                ]}
                placeholder="What do you need to do?"
                placeholderTextColor={palette.muted}
                value={title}
                onChangeText={setTitle}
                returnKeyType="default"
                maxLength={200}
              />
            </View>

            {/* ── Category ── */}
            <Text style={[styles.fieldLabel, { color: palette.muted }]}>CATEGORY</Text>
            <View style={styles.categoryRow}>
              {(Object.keys(categories) as CategoryKey[]).map(key => {
                const cat    = categories[key];
                const active = category === key;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: active ? palette.text    : palette.surface,
                        borderColor:     active ? palette.text    : palette.line,
                      },
                    ]}
                    onPress={() => setCategory(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={[
                      styles.categoryLabel,
                      { color: active ? palette.bg : palette.text },
                    ]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Point of Interest (optional) ── */}
            <Text style={[styles.fieldLabel, { color: palette.muted }]}>
              POINT OF INTEREST
              <Text style={[styles.fieldLabelOptional, { color: palette.faint }]}>
                {' '}(OPTIONAL)
              </Text>
            </Text>
            <View style={styles.poiGrid}>
              {POI_OPTIONS.map(({ type, label }) => {
                const active   = poi === type;
                const iconColor = active ? palette.nearText : palette.muted;
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.poiTile,
                      {
                        backgroundColor: active ? palette.nearTint2  : palette.surface,
                        borderColor:     active ? palette.nearBorder : palette.line,
                      },
                    ]}
                    onPress={() => setPoi(active ? null : type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}>
                    <PoiIcon type={type} color={iconColor} size={22} />
                    <Text style={[styles.poiLabel, { color: iconColor }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Time (optional) ── */}
            <Text style={[styles.fieldLabel, { color: palette.muted }]}>
              TIME
              <Text style={[styles.fieldLabelOptional, { color: palette.faint }]}>
                {' '}(OPTIONAL)
              </Text>
            </Text>
            <View style={styles.fieldPad}>
              {/* Tapping opens the native time picker */}
              <Pressable
                style={[
                  styles.timeRow,
                  { backgroundColor: palette.surface, borderColor: palette.line },
                ]}
                onPress={() => setShowTimePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Choose time">
                <ClockIcon color={time ? palette.accent : palette.faint} />
                <Text
                  style={[
                    styles.timeText,
                    { color: time ? palette.text : palette.muted },
                  ]}>
                  {time || 'Tap to choose'}
                </Text>
                {!!time && (
                  <Pressable
                    onPress={() => { setTime(''); setShowTimePicker(false); }}
                    hitSlop={8}
                    accessibilityLabel="Clear time">
                    <CloseIcon color={palette.muted} size={16} />
                  </Pressable>
                )}
              </Pressable>
            </View>

            {/* Native time picker — Android: modal dialog; iOS: inline spinner */}
            {showTimePicker && (
              <>
                {Platform.OS === 'ios' && (
                  <View style={styles.iosDoneRow}>
                    <Pressable
                      onPress={() => setShowTimePicker(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Done">
                      <Text style={[styles.iosDoneLabel, { color: palette.accent }]}>
                        Done
                      </Text>
                    </Pressable>
                  </View>
                )}
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              </>
            )}

            {/* ── CTA row ── */}
            <View style={styles.ctaRow}>
              {/* Cancel */}
              <Pressable
                style={[styles.ctaCancel, { borderColor: palette.line }]}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel">
                <Text style={[styles.ctaCancelLabel, { color: palette.text }]}>
                  Cancel
                </Text>
              </Pressable>

              {/* Add task */}
              <Pressable
                style={[
                  styles.ctaSubmit,
                  {
                    backgroundColor: isValid && !submitting ? palette.text : palette.surface2,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                accessibilityRole="button"
                accessibilityLabel="Add task"
                accessibilityState={{ disabled: !isValid || submitting }}>
                <Text style={[
                  styles.ctaSubmitLabel,
                  { color: isValid && !submitting ? palette.bg : palette.muted },
                ]}>
                  {submitting ? 'Adding…' : 'Add task'}
                </Text>
              </Pressable>
            </View>

            {/* Bottom safe-area spacer */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Scrim ──
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },

  // ── KeyboardAvoidingView container ──
  kavContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 11,
  },

  // ── Sheet panel ──
  sheet: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight:            '90%',
    // Shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius:  24,
    elevation:     24,
  },

  // ── Drag handle ──
  handleWrap: {
    alignItems:     'center',
    paddingTop:      8,
    paddingBottom:   4,
  },
  handle: {
    width:        36,
    height:        4,
    borderRadius:  2,
  },

  // ── Header ──
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop:      8,
    paddingBottom:  14,
  },
  headerTitle: {
    fontSize:      17,
    fontWeight:    '500',
    fontFamily:    'Geist-Regular',
    letterSpacing: -0.17,
  },
  closeBtn: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Form ──
  formScroll: {
    flexGrow: 0,
  },
  fieldLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  1.76,
    paddingTop:    20,
    paddingBottom: 10,
    paddingHorizontal: 22,
  },
  fieldLabelOptional: {
    letterSpacing: 1.76,
    fontWeight:    '500',
    fontFamily:    'Geist-SemiBold',
  },
  fieldPad: {
    paddingHorizontal: 22,
  },

  // ── Title input ──
  titleInput: {
    fontSize:      16,
    fontFamily:    'Geist-Regular',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:   12,
    borderWidth:     1,
  },

  // ── Category pills ──
  categoryRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             8,
    paddingHorizontal: 22,
  },
  categoryPill: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             6,
    paddingHorizontal: 12,
    paddingVertical:    8,
    borderRadius:   9999,
    borderWidth:     1,
  },
  categoryDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },

  // ── POI grid ──
  poiGrid: {
    flexDirection:  'row',
    gap:            10,
    paddingHorizontal: 22,
  },
  poiTile: {
    flex:           1,
    aspectRatio:    1,
    borderRadius:   14,
    borderWidth:     1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             4,
    paddingVertical: 10,
  },
  poiLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },

  // ── Time row (Pressable) ──
  timeRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    paddingHorizontal: 14,
    paddingVertical:   14,
    borderRadius:   12,
    borderWidth:     1,
  },
  timeText: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },

  // ── iOS "Done" row above the spinner ──
  iosDoneRow: {
    alignItems:     'flex-end',
    paddingHorizontal: 22,
    paddingTop:      8,
  },
  iosDoneLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── CTA row ──
  ctaRow: {
    flexDirection:  'row',
    gap:            10,
    paddingHorizontal: 22,
    paddingTop:     24,
  },
  ctaCancel: {
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderRadius:   12,
    borderWidth:     1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaCancelLabel: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },
  ctaSubmit: {
    flex:           1,
    paddingVertical: 14,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaSubmitLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  bottomSpacer: {
    height: 28,
  },
});
