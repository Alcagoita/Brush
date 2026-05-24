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
 *   Close: reverse of open
 *
 * Drag-to-dismiss: PanResponder on the drag handle only. Dragging down > 80px
 * (or velocity > 0.5) triggers close; releasing earlier springs back to 0.
 *
 * Dismiss triggers: scrim tap · X button · Cancel button · drag handle
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../theme';
import { categories } from '../theme/tokens';
import { PoiType, CategoryKey } from '../types';
import { addTask } from '../services/firestore';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_H       = Dimensions.get('window').height;
const CLOSE_AFTER_MS = 300;

const POI_OPTIONS: { type: PoiType; label: string; icon: string }[] = [
  { type: 'atm',         label: 'ATM',      icon: '💳' },
  { type: 'cafe',        label: 'Café',     icon: '☕' },
  { type: 'supermarket', label: 'Market',   icon: '🛒' },
  { type: 'pharmacy',    label: 'Pharmacy', icon: '💊' },
];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

/** 16 × 16 "×" icon for the close button. */
function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="6"  y1="6"  x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18" y1="6"  x2="6"  y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** 18 × 18 clock icon for the time field. */
function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="12" x2="12" y2="7"  stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="12" x2="16" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* circle drawn as a path element would need Path — approximate with viewBox offset */}
    </Svg>
  );
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

  // Controls whether the Modal is mounted (unmount only after exit animation).
  const [mounted, setMounted] = useState(false);

  const titleRef = useRef<TextInput>(null);

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

  // ── Open / close animations ──
  const openAnimation  = useCallback(() => {
    translateY.value   = withTiming(0,   { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) });
    scrimOpacity.value = withTiming(0.4, { duration: 250, easing: Easing.linear });
  }, [translateY, scrimOpacity]);

  const closeAnimation = useCallback((callback?: () => void) => {
    translateY.value   = withTiming(SCREEN_H, { duration: 280, easing: Easing.bezier(0.32, 0.72, 0, 1) });
    scrimOpacity.value = withTiming(0,        { duration: 250, easing: Easing.linear });
    setTimeout(() => callback?.(), CLOSE_AFTER_MS);
  }, [translateY, scrimOpacity]);

  // ── Reset form when sheet is dismissed ──
  const resetForm = useCallback(() => {
    setTitle('');
    setCategory('personal');
    setPoi(null);
    setTime('');
    setSubmitting(false);
    dragOffset.value = 0;
  }, [dragOffset]);

  const handleClose = useCallback(() => {
    dragOffset.value = 0;
    closeAnimation(() => {
      setMounted(false);
      resetForm();
      onClose();
    });
  }, [closeAnimation, resetForm, onClose, dragOffset]);

  // Keep a stable ref to handleClose so the PanResponder can call it.
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
      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                returnKeyType="done"
                onSubmitEditing={isValid ? handleSubmit : undefined}
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
              {POI_OPTIONS.map(({ type, label, icon }) => {
                const active = poi === type;
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
                    <Text style={styles.poiIcon}>{icon}</Text>
                    <Text style={[
                      styles.poiLabel,
                      { color: active ? palette.nearText : palette.muted },
                    ]}>
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
              <View style={[
                styles.timeRow,
                { backgroundColor: palette.surface, borderColor: palette.line },
              ]}>
                <ClockIcon color={palette.faint} />
                <TextInput
                  style={[styles.timeInput, { color: palette.text }]}
                  placeholder="e.g. 14:00"
                  placeholderTextColor={palette.muted}
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="done"
                  // TODO(KAN-51): wire to platform native time picker in production
                />
              </View>
            </View>

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
    letterSpacing:  1.76,   // 0.16em at 11px
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
  poiIcon: {
    fontSize: 22,
  },
  poiLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },

  // ── Time input ──
  timeRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    borderRadius:   12,
    borderWidth:     1,
  },
  timeInput: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
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
