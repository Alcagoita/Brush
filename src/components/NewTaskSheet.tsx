/**
 * NewTaskSheet — KAN-143
 *
 * POI-first bottom sheet for creating a new task.
 * "Add task" is disabled until both title and POI are set.
 *
 * Animations (Reanimated):
 *   Open:  sheet translateY 105% → 0, 320ms cubic-bezier(0.32,0.72,0,1)
 *          scrim opacity 0 → 0.4, 250ms linear
 *   Close: reverse
 *
 * Dismiss: scrim tap · ✕ button · drag handle (>80 px or velocity >0.5)
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
import { useTheme } from '../theme';
import { categories } from '../theme/tokens';
import { PoiType, CategoryKey, Category, POI_CATALOG } from '../types';
import { addTask } from '../services/firestore';
import { CloseIcon, PoiIcon } from './AppIcon';
import { navigateTo } from '../navigation/navigationRef';
import { todayISO } from '../utils/date';
import { COPY } from '../constants/copy';
import RotatingTitlePlaceholder from './RotatingTitlePlaceholder';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_H = Dimensions.get('window').height;

const POI_TILE_WIDTH = 72;

// ─── Imperative handle ────────────────────────────────────────────────────────

export interface NewTaskSheetHandle {
  hide: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewTaskSheetProps {
  visible: boolean;
  uid: string;
  onClose: () => void;
  onTaskAdded?: () => void;
  customCategories?: Category[];
}

// ─── POI Tile (shared within this module) ────────────────────────────────────

interface PoiTileProps {
  type: PoiType;
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

function PoiTile({ type, label, selected, onPress, palette }: PoiTileProps) {
  const iconColor = selected ? palette.nearText : palette.muted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.poiTile,
        {
          backgroundColor: selected ? palette.nearTint2  : palette.surface,
          borderColor:     selected ? palette.nearBorder : palette.line,
        },
      ]}>
      <PoiIcon type={type} color={iconColor} size={22} />
      <Text style={[styles.poiTileLabel, { color: iconColor }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const NewTaskSheet = forwardRef<NewTaskSheetHandle, NewTaskSheetProps>(
  function NewTaskSheet({ visible, uid, onClose, onTaskAdded, customCategories = [] }, ref) {
    const { palette } = useTheme();

    // Form state
    const [title,    setTitle]    = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [poi,      setPoi]      = useState<PoiType | null>(null);
    const [submitting, setSubmitting] = useState(false);
    // Rotating title placeholder freezes permanently once the user taps the field (KAN-148).
    const [titleFocused, setTitleFocused] = useState(false);

    const [mounted, setMounted] = useState(false);
    const titleRef = useRef<TextInput>(null);

    const onCloseRef      = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const onTaskAddedRef  = useRef(onTaskAdded);
    useEffect(() => { onTaskAddedRef.current = onTaskAdded; }, [onTaskAdded]);

    // ── Reanimated ──
    const translateY   = useSharedValue(SCREEN_H);
    const scrimOpacity = useSharedValue(0);
    const dragOffset   = useSharedValue(0);

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value + dragOffset.value }],
    }));
    const scrimStyle = useAnimatedStyle(() => ({
      opacity: scrimOpacity.value,
    }));

    const resetForm = useCallback(() => {
      setTitle('');
      setCategory(null);
      setPoi(null);
      setSubmitting(false);
      setTitleFocused(false);
      dragOffset.value = 0;
    }, [dragOffset]);

    useImperativeHandle(ref, () => ({
      hide: () => {
        setMounted(false);
        resetForm();
        onCloseRef.current();
      },
    }), [resetForm]);

    const openAnimation = useCallback(() => {
      translateY.value   = withTiming(0,   { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) });
      scrimOpacity.value = withTiming(0.4, { duration: 250, easing: Easing.linear });
    }, [translateY, scrimOpacity]);

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

    const handleClose = useCallback(() => {
      dragOffset.value = 0;
      closeAnimation();
    }, [closeAnimation, dragOffset]);

    const handleCloseRef = useRef(handleClose);
    useEffect(() => { handleCloseRef.current = handleClose; }, [handleClose]);

    useEffect(() => {
      if (visible) {
        translateY.value = SCREEN_H;
        setMounted(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => {
      if (mounted && visible) {
        openAnimation();
        setTimeout(() => titleRef.current?.focus(), 280);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

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

    const canSubmit = title.trim().length > 0 && poi !== null;

    const handleSubmit = useCallback(async () => {
      const trimmed = title.trim();
      if (!trimmed || !poi || !uid || submitting) { return; }

      setSubmitting(true);
      try {
        await addTask(uid, {
          title:    trimmed,
          category: category ?? 'personal',
          done:     false,
          date:     todayISO(),
          poi,
        });
        setMounted(false);
        resetForm();
        onCloseRef.current();
        onTaskAddedRef.current?.();
      } catch (err) {
        console.warn('[NewTaskSheet] addTask failed', err);
        setSubmitting(false);
      }
    }, [title, category, poi, uid, submitting, resetForm]);

    const handleMoreDetails = useCallback(() => {
      handleClose();
      setTimeout(() => navigateTo('TaskForm', {
        uid,
        initialTitle: title.trim() || undefined,
        initialPoi:   poi ?? undefined,
      }), 80);
    }, [handleClose, uid, title, poi]);

    if (!mounted) { return null; }

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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          pointerEvents="box-none">

          <Animated.View
            style={[styles.sheet, { backgroundColor: palette.bg }, sheetStyle]}>

            {/* Drag handle */}
            <View style={styles.handleWrap} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: palette.faint }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: palette.text }]}>
                {COPY.newTaskSheet.title}
              </Text>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: palette.surface }]}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <CloseIcon color={palette.muted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>

              {/* ── Title ── */}
              <View style={styles.fieldPad}>
                <View style={styles.titleInputWrap}>
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
                    value={title}
                    onChangeText={setTitle}
                    onFocus={() => setTitleFocused(true)}
                    returnKeyType="default"
                    maxLength={200}
                    accessibilityLabel={COPY.newTaskSheet.title}
                  />
                  {/* Rotating example placeholder — hides once focused or once there's a value */}
                  {!titleFocused && title.length === 0 && (
                    <RotatingTitlePlaceholder
                      examples={COPY.newTaskSheet.titleExamples}
                      active={!titleFocused}
                      style={[styles.titlePlaceholder, { color: palette.muted }]}
                    />
                  )}
                </View>
              </View>

              {/* ── POI question ── */}
              <View style={styles.questionRow}>
                <Text style={[styles.questionLabel, { color: palette.text }]}>
                  {COPY.newTaskSheet.poiQuestion}
                </Text>
              </View>

              {/* ── "Swipe for more" hint — right-aligned, no "Quick picks" sublabel ── */}
              <View style={styles.swipeHintRow}>
                <Text style={[styles.quickPicksHint, { color: palette.faint }]}>Swipe for more</Text>
              </View>

              {/* ── POI carousel ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
                snapToInterval={POI_TILE_WIDTH + 10}
                decelerationRate="fast"
                style={styles.carouselMask}>
                {POI_CATALOG.map(({ type, label }) => (
                  <PoiTile
                    key={type}
                    type={type}
                    label={label}
                    selected={poi === type}
                    onPress={() => setPoi(prev => prev === type ? null : type)}
                    palette={palette}
                  />
                ))}
              </ScrollView>

              {/* ── Category question (optional) ── */}
              <View style={styles.questionRow}>
                <Text style={[styles.questionLabel, { color: palette.text }]}>
                  {COPY.newTaskSheet.catQuestion}
                </Text>
                <Text style={[styles.questionOptional, { color: palette.faint }]}>
                  {COPY.newTaskSheet.catOptional}
                </Text>
              </View>
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
                          backgroundColor: active ? palette.text : palette.surface,
                          borderColor:     active ? palette.text : palette.line,
                        },
                      ]}
                      onPress={() => setCategory(active ? null : key)}
                      accessibilityRole="radio"
                      accessibilityLabel={cat.label}
                      accessibilityState={{ selected: active }}>
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.categoryLabel, { color: active ? palette.bg : palette.text }]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
                {customCategories.map(cat => {
                  const active = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: active ? palette.text : palette.surface,
                          borderColor:     active ? palette.text : palette.line,
                        },
                      ]}
                      onPress={() => setCategory(active ? null : cat.id)}
                      accessibilityRole="radio"
                      accessibilityLabel={cat.name}
                      accessibilityState={{ selected: active }}>
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.categoryLabel, { color: active ? palette.bg : palette.text }]}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── CTA row ── */}
              <View style={styles.ctaRow}>
                <Pressable
                  style={[styles.ctaGhost, { borderColor: palette.line }]}
                  onPress={handleMoreDetails}
                  accessibilityRole="button"
                  accessibilityLabel="More details">
                  <Text style={[styles.ctaGhostLabel, { color: palette.muted }]}>
                    {COPY.newTaskSheet.moreDetails}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.ctaSubmit,
                    {
                      backgroundColor: canSubmit && !submitting
                        ? palette.text
                        : palette.surface2,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || submitting}
                  accessibilityRole="button"
                  accessibilityLabel={COPY.newTaskSheet.cta}
                  accessibilityState={{ disabled: !canSubmit || submitting }}>
                  <Text style={[
                    styles.ctaSubmitLabel,
                    { color: canSubmit && !submitting ? palette.bg : palette.muted },
                  ]}>
                    {submitting ? COPY.newTaskSheet.ctaSubmitting : COPY.newTaskSheet.cta}
                  </Text>
                </Pressable>
              </View>

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
    alignItems:    'center',
    paddingTop:     8,
    paddingBottom:  4,
  },
  handle: {
    width:        36,
    height:        4,
    borderRadius:  2,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 22,
    paddingTop:         8,
    paddingBottom:     14,
  },
  headerTitle: {
    fontSize:      17,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
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
  fieldPad: {
    paddingHorizontal: 22,
  },
  titleInputWrap: {
    position: 'relative',
  },
  titleInput: {
    fontSize:          16,
    fontFamily:        'Geist-Regular',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      12,
    borderWidth:        1,
  },
  // Overlays the TextInput at the same inset the native placeholder would
  // sit at (border width + input padding) — see RotatingTitlePlaceholder.
  titlePlaceholder: {
    position:          'absolute',
    left:               17,
    top:                15,
    right:              17,
    fontSize:           16,
    fontFamily:        'Geist-Regular',
  },
  // Sentence-case conversational question labels (KAN-148) — replace the
  // old all-caps micro-labels now that fields read as questions, not forms.
  questionRow: {
    flexDirection:     'row',
    alignItems:        'baseline',
    paddingHorizontal: 22,
    paddingTop:        20,
    paddingBottom:     10,
  },
  questionLabel: {
    fontSize:      15,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: -0.15,
  },
  questionOptional: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  swipeHintRow: {
    flexDirection:     'row',
    justifyContent:    'flex-end',
    paddingHorizontal: 22,
    marginBottom:       8,
  },
  quickPicksHint: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
  },
  carouselMask: {
    // Soft fade on edges via paddingHorizontal on the content and overflow
  },
  carousel: {
    paddingHorizontal: 22,
    gap:               10,
    paddingBottom:      4,
  },
  poiTile: {
    width:          POI_TILE_WIDTH,
    borderRadius:   14,
    borderWidth:     1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             6,
    paddingTop:     12,
    paddingBottom:  10,
    paddingHorizontal: 4,
  },
  poiTileLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    letterSpacing: 0.01,
  },
  categoryRow: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    gap:                8,
    paddingHorizontal: 22,
  },
  categoryPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                6,
    paddingHorizontal: 12,
    paddingVertical:    8,
    borderRadius:      9999,
    borderWidth:        1,
  },
  categoryDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  ctaRow: {
    flexDirection:     'row',
    gap:               10,
    paddingHorizontal: 22,
    paddingTop:        24,
  },
  ctaGhost: {
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderRadius:      12,
    borderWidth:        1,
    alignItems:        'center',
    justifyContent:    'center',
  },
  ctaGhostLabel: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
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
