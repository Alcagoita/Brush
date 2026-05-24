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
 *   Close: reverse — used for user-initiated dismiss (Cancel, ×, scrim, drag).
 *          For post-submit close, hide() is called imperatively.
 *
 * Drag-to-dismiss: PanResponder on the drag handle only. Dragging down > 80px
 * (or velocity > 0.5) triggers close; releasing earlier springs back to 0.
 *
 * Dismiss triggers: scrim tap · X button · Cancel button · drag handle
 *
 * Time picker: native DateTimePicker — material dialog on Android,
 *              inline spinner on iOS.
 *
 * Imperative handle (NewTaskSheetHandle): exposes hide() so TodayScreen can
 * close the sheet the moment it confirms the task is in the list.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
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

// ─── Imperative handle ────────────────────────────────────────────────────────

export interface NewTaskSheetHandle {
  /** Instantly hides the sheet and resets its form state. */
  hide: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewTaskSheetProps {
  visible: boolean;
  uid: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const NewTaskSheet = forwardRef<NewTaskSheetHandle, NewTaskSheetProps>(
  function NewTaskSheet({ visible, uid, onClose }, ref) {
    const { palette, dark } = useTheme();

    // Form state
    const [title,    setTitle]    = useState('');
    const [category, setCategory] = useState<CategoryKey>('personal');
    const [poi,      setPoi]      = useState<PoiType | null>(null);
    const [time,     setTime]     = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Time picker state
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [timeDate, setTimeDate] = useState<Date>(() => {
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

    // ── Reset form ──
    // Stable: dragOffset is a SharedValue (stable reference).
    const resetForm = useCallback(() => {
      setTitle('');
      setCategory('personal');
      setPoi(null);
      setTime('');
      setSubmitting(false);
      setShowTimePicker(false);
      dragOffset.value = 0;
    }, [dragOffset]);

    // ── Imperative handle — lets TodayScreen call sheet.hide() ──
    // hide() does an instant close: no animation, just clear state + notify parent.
    // This is the primary post-submit dismiss path; animation is kept for
    // user-initiated dismissal (Cancel, ×, scrim tap, drag).
    useImperativeHandle(ref, () => ({
      hide: () => {
        setMounted(false);
        resetForm();
        onCloseRef.current();
      },
    }), [resetForm]);

    // ── Open / close animations (for user-initiated dismiss only) ──
    const openAnimation = useCallback(() => {
      translateY.value   = withTiming(0,   { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) });
      scrimOpacity.value = withTiming(0.4, { duration: 250, easing: Easing.linear });
    }, [translateY, scrimOpacity]);

    // doClose is stable: resetForm stable + onCloseRef is a ref (stable).
    const doClose = useCallback(() => {
      setMounted(false);
      resetForm();
      onCloseRef.current();
    }, [resetForm]);

    const closeAnimation = useCallback(() => {
      scrimOpacity.value = withTiming(0,        { duration: 250, easing: Easing.linear });
      translateY.value   = withTiming(SCREEN_H, { duration: 280, easing: Easing.bezier(0.32, 0.72, 0, 1) });
      setTimeout(doClose, 300);
    }, [translateY, scrimOpacity, doClose]);

    // ── User-initiated close handler ──
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
    // After addTask() confirms, close immediately without going through
    // animation chains. TodayScreen also calls sheetRef.hide() when the task
    // appears in the Firestore snapshot — belt and suspenders.
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
        // Confirmed — hide immediately.
        setMounted(false);
        resetForm();
        onCloseRef.current();
      } catch (err) {
        console.warn('[NewTaskSheet] addTask failed', err);
        setSubmitting(false);
      }
    }, [title, category, poi, time, uid, submitting, resetForm]);

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
        {/* KAV enabled on iOS only; Android uses windowSoftInputMode=adjustResize */}
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
                  const active    = poi === type;
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

              {/* Native time picker */}
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

                  {/* On iOS the spinner renders inline — wrap it so it shares the
                      app's surface background and border, blending with the form. */}
                  <View
                    style={[
                      styles.pickerWrap,
                      Platform.OS === 'ios' && {
                        backgroundColor: palette.surface,
                        borderColor:     palette.line,
                      },
                    ]}>
                    <DateTimePicker
                      value={timeDate}
                      mode="time"
                      is24Hour
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      // themeVariant ensures the Android dialog respects the app's
                      // light/dark setting instead of always using the system default.
                      themeVariant={dark ? 'dark' : 'light'}
                      // accentColor tints the selected time, OK button, and clock
                      // hands to the app's peach accent on both platforms.
                      accentColor={palette.accent}
                      // textColor controls spinner-wheel text on iOS (ignored on Android).
                      textColor={palette.text}
                      onValueChange={(_evt, date) => {
                        // Android: dialog closes on OK — hide the picker.
                        // iOS:     spinner fires on every scroll — keep open.
                        if (Platform.OS === 'android') { setShowTimePicker(false); }
                        setTimeDate(date);
                        const h = date.getHours();
                        const m = date.getMinutes();
                        // Guard: DateTimePicker always returns a valid Date, but
                        // validate the range so the data layer stays clean if the
                        // time field is ever replaced with a free-text input.
                        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
                          setTime(
                            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                          );
                        }
                      }}
                      onDismiss={() => setShowTimePicker(false)}
                    />
                  </View>
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
  },
);

export default NewTaskSheet;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  kavContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 11,
  },
  sheet: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight:            '90%',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius:  24,
    elevation:     24,
  },
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
  titleInput: {
    fontSize:      16,
    fontFamily:    'Geist-Regular',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:   12,
    borderWidth:     1,
  },
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
  // Wraps the DateTimePicker on iOS so it inherits the form surface colour.
  // On Android the picker is a system dialog so the wrapper has no styling.
  pickerWrap: {
    marginHorizontal: 22,
    marginTop:         8,
    borderRadius:     12,
    borderWidth:       1,
    overflow:         'hidden',
    // borderColor / backgroundColor injected inline (iOS only)
    borderColor:      'transparent',
  },
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
