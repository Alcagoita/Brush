/**
 * OnboardingScreen — KAN-140
 *
 * 5-stage guided first-run experience:
 *   Stage 1 (welcome)  — wordmark + tagline + "Let's begin"
 *   Stage 2 (empty)    — rotating nudges + "Add your first thing"
 *   Stage 3 (create)   — bottom sheet to capture first task
 *   Stage 4 (post)     — brush-away the task, earn Day 1 reward (+10 pts)
 *   Stage 5 (full)     — transition to the real app (AppNavigator)
 *
 * Light-mode only. All tokens are hardcoded to the light palette per spec.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
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
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScrRotatingNudge, { NudgeMessage } from '../components/ScrRotatingNudge';
import BrushStroke from '../components/BrushStroke';
import { awardPoint, upsertUser } from '../services/firestore';
import { addTask } from '../services/firestore';
import { todayISO } from '../utils/date';

// ─── Design tokens (light-mode only per spec) ─────────────────────────────────

const T = {
  bg:         '#fdfcfa',
  surface:    '#f4f2ed',
  surface2:   '#ece9e2',
  text:       '#1f1c16',
  muted:      '#8b857a',
  faint:      '#c1bbac',
  line:       'rgba(31,28,22,0.08)',
  accent:     '#e8a86a',
  nearTint:   '#fdf7f0',
  nearTint2:  '#f9ede0',
  nearBorder: '#e8c9a0',
  nearText:   '#7a4a20',
};

// ─── Onboarding message set (KAN-140 — 6 messages) ───────────────────────────

const ONBOARDING_NUDGES: NudgeMessage[] = [
  { text: 'Don’t you feel the need for bread?',              poi: 'supermarket', color: '#8b6bc4' },
  { text: 'Maybe today it’s a good day for coffee outside.', poi: 'cafe',        color: '#e8a86a' },
  { text: 'This is the week to go to the post office.',                                              },
  { text: 'What a lovely day to do some sport outside.'                                              },
  { text: 'That errand you’ve been putting off? Still there.'                                   },
  { text: 'There’s probably something in the fridge that needs replacing.', poi: 'supermarket', color: '#8b6bc4' },
];

const SUGGESTION_CHIPS = ['Buy bread', 'Coffee outside', 'Post office', 'Groceries', 'Go for a run'];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Amber swipe underline beneath the wordmark. */
function BrushWordmark({ size = 66 }: { size?: number }) {
  const lineH = size * 0.06;
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Geist-SemiBold', fontSize: size, color: T.text, letterSpacing: -size * 0.03 }}>
        Brush
      </Text>
      <Svg width={size * 0.9} height={lineH + 4} viewBox={`0 0 ${size * 0.9} ${lineH + 4}`} style={{ marginTop: -4 }}>
        <Path
          d={`M 2 ${lineH} Q ${size * 0.45} 2 ${size * 0.9 - 2} ${lineH}`}
          stroke={T.accent}
          strokeWidth={lineH}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

/** Amber flame icon for the reward card. */
function FlameIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2C12 2 8 7 8 11C8 13.21 9.79 15 12 15C14.21 15 16 13.21 16 11C16 7 12 2 12 2ZM12 13C10.9 13 10 12.1 10 11C10 9.17 11.23 7.14 12 5.84C12.77 7.14 14 9.17 14 11C14 12.1 13.1 13 12 13ZM5 19C5 16.24 7.35 14 10.27 14H13.73C16.65 14 19 16.24 19 19V22H5V19Z"
        fill={T.accent}
      />
    </Svg>
  );
}

/** Down-arrow bobbing hint. */
function BobbingArrow({ visible, reduceMotion }: { visible: boolean; reduceMotion: boolean }) {
  const bobY = useSharedValue(0);

  useEffect(() => {
    if (!visible || reduceMotion) { bobY.value = 0; return; }
    bobY.value = withRepeat(
      withSequence(
        withTiming( 4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [visible, reduceMotion, bobY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : bobY.value }],
  }));

  if (!visible) { return null; }

  return (
    <Animated.View style={[{ alignItems: 'center', marginTop: 12 }, style]}>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M7 10L12 15L17 10H7Z" fill={T.muted} />
      </Svg>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

interface Props {
  uid: string;
  onComplete: () => void;
}

type Stage = 'welcome' | 'empty' | 'create' | 'post' | 'full';

export default function OnboardingScreen({ uid, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [stage, setStage]             = useState<Stage>('welcome');
  const [taskTitle, setTaskTitle]     = useState('');
  const [taskDone, setTaskDone]       = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [titleWidth, setTitleWidth]   = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── Stage 1 entrance ───────────────────────────────────────────────────────
  const welcomeY   = useSharedValue(13);
  const welcomeOp  = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => setReduceMotion(v))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (stage === 'welcome') {
      welcomeOp.value = withTiming(1, { duration: 500 });
      welcomeY.value  = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    }
  }, [stage, welcomeOp, welcomeY]);

  const welcomeStyle = useAnimatedStyle(() => ({
    opacity:   welcomeOp.value,
    transform: [{ translateY: reduceMotion ? 0 : welcomeY.value }],
  }));

  // ── Sheet slide ────────────────────────────────────────────────────────────
  const sheetY  = useSharedValue(800);
  const scrimOp = useSharedValue(0);

  const openSheet = useCallback(() => {
    setSheetVisible(true);
    scrimOp.value = withTiming(1, { duration: 250 });
    sheetY.value  = withTiming(0, {
      duration: 340,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
    });
    setTimeout(() => inputRef.current?.focus(), 320);
  }, [scrimOp, sheetY]);

  const closeSheet = useCallback(() => {
    Keyboard.dismiss();
    scrimOp.value = withTiming(0, { duration: 200 });
    sheetY.value  = withTiming(800, { duration: 280 }, () => {
      runOnJS(setSheetVisible)(false);
    });
  }, [scrimOp, sheetY]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOp.value }));

  // ── Brush-away sweep & stroke ──────────────────────────────────────────────
  const sweepProgress  = useSharedValue(0);
  const strokeScale    = useSharedValue(0);
  const fillProgress   = useSharedValue(0);
  const rowWidth       = useSharedValue(0);

  const sweepStyle = useAnimatedStyle(() => {
    const p     = sweepProgress.value;
    const scale = interpolate(p, [0, 0.58, 1], [0, 1, 1]);
    const w     = rowWidth.value;
    return {
      opacity:   interpolate(p, [0, 0.01, 0.58, 1], [0, 0.9, 0.9, 0]),
      transform: [{ translateX: -(w / 2) * (1 - scale) }, { scaleX: scale }],
    };
  });

  const strokeStyle = useAnimatedStyle(() => {
    const s = strokeScale.value;
    const w = titleWidth;
    return {
      opacity:   s,
      transform: [{ translateX: -(w / 2) * (1 - s) }, { scaleX: s }],
    };
  });

  const fillStyle = useAnimatedStyle(() => ({
    opacity:   fillProgress.value,
    transform: [{ scale: 0.55 + fillProgress.value * 0.1 }],
  }));

  // ── Reward card slide-up ───────────────────────────────────────────────────
  const rewardY  = useSharedValue(200);
  const rewardOp = useSharedValue(0);
  const flameS   = useSharedValue(0);

  const showReward = useCallback(() => {
    setRewardVisible(true);
    rewardOp.value = withTiming(1, { duration: 300 });
    rewardY.value  = withSpring(0, { damping: 18, stiffness: 120 });
    flameS.value   = withDelay(150, withSpring(1, { damping: 10, stiffness: 150 }));
  }, [rewardOp, rewardY, flameS]);

  const rewardCardStyle = useAnimatedStyle(() => ({
    opacity:   rewardOp.value,
    transform: [{ translateY: rewardY.value }],
  }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flameS.value }] }));

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddTask = useCallback(async () => {
    if (!taskTitle.trim()) { return; }
    Keyboard.dismiss();
    closeSheet();

    try {
      const id = await addTask(uid, {
        title:    taskTitle.trim(),
        category: 'errands',
        date:     todayISO(),
      });
      setCreatedTaskId(id);
    } catch {
      // Non-critical — onboarding proceeds even if Firestore write fails
    }

    setTimeout(() => setStage('post'), 350);
  }, [taskTitle, uid, closeSheet]);

  const handleBrushAway = useCallback(async () => {
    if (taskDone) { return; }

    if (reduceMotion) {
      setTaskDone(true);
      setTimeout(showReward, 200);
      return;
    }

    sweepProgress.value = 0;
    sweepProgress.value = withTiming(1, {
      duration: 660,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

    setTimeout(() => {
      setTaskDone(true);
      fillProgress.value = withTiming(1, { duration: 200 });
      strokeScale.value  = withTiming(1, { duration: 380, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    }, 120);

    setTimeout(() => {
      showReward();
      if (createdTaskId) {
        awardPoint(uid, createdTaskId, taskTitle).catch(() => {});
      }
    }, 640);
  }, [taskDone, reduceMotion, sweepProgress, fillProgress, strokeScale, showReward, uid, createdTaskId, taskTitle]);

  const handleComplete = useCallback(async () => {
    try {
      await upsertUser(uid, { onboardingDone: true });
    } catch {
      // Non-critical
    }
    onComplete();
  }, [uid, onComplete]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderStage1() {
    return (
      <View style={[styles.fill, { backgroundColor: T.bg, paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <Animated.View style={[{ alignItems: 'center' }, welcomeStyle]}>
            <Text style={styles.eyebrow}>BRUSH AWAY</Text>
            <BrushWordmark size={66} />
            <Text style={styles.tagline}>
              A calm home for the things your days keep quietly asking for.
            </Text>
          </Animated.View>
        </View>

        <View style={[styles.bottomPad, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            style={styles.inkBtn}
            onPress={() => setStage('empty')}
            accessibilityRole="button"
            accessibilityLabel="Let's begin">
            <Text style={styles.inkBtnText}>Let’s begin</Text>
          </Pressable>
          <Text style={styles.reassurance}>No setup. No tour. Just your day.</Text>
        </View>
      </View>
    );
  }

  function renderStage2() {
    return (
      <View style={[styles.fill, { backgroundColor: T.bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.stage2Header}>
          <BrushWordmark size={23} />
          <Text style={[styles.dateText, { fontVariant: ['tabular-nums'] }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Rotating nudge */}
        <View style={styles.nudgeArea}>
          <ScrRotatingNudge messages={ONBOARDING_NUDGES} pace={5} showCategoryIcon />
        </View>

        {/* CTA */}
        <View style={[styles.bottomPad, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            style={styles.accentBtn}
            onPress={openSheet}
            accessibilityRole="button"
            accessibilityLabel="Add your first thing">
            <Text style={styles.accentBtnText}>+ Add your first thing</Text>
          </Pressable>
          <Text style={styles.helperText}>
            Those are just passing thoughts. Add what’s actually yours.
          </Text>
        </View>

        {/* Bottom sheet + scrim */}
        {sheetVisible && (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
            </Animated.View>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none">
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <Animated.View
                  style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, sheetStyle]}>
                  {/* Handle */}
                  <View style={styles.sheetHandle} />

                  <Text style={styles.sheetEyebrow}>The first thing on your mind…</Text>

                  <TextInput
                    ref={inputRef}
                    style={styles.sheetInput}
                    placeholder="Buy bread? Coffee outside? Go for a run?"
                    placeholderTextColor={T.faint}
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    onSubmitEditing={handleAddTask}
                    returnKeyType="done"
                    autoCapitalize="sentences"
                    autoCorrect
                  />

                  {/* Suggestion chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <View style={styles.chipRow}>
                      {SUGGESTION_CHIPS.map(chip => (
                        <Pressable
                          key={chip}
                          style={({ pressed }) => [
                            styles.chip,
                            taskTitle === chip && styles.chipSelected,
                            { transform: [{ scale: pressed ? 0.97 : 1 }] },
                          ]}
                          onPress={() => { setTaskTitle(chip); inputRef.current?.focus(); }}>
                          <Text style={[
                            styles.chipText,
                            taskTitle === chip && styles.chipTextSelected,
                          ]}>
                            {chip}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Footer */}
                  <View style={styles.sheetFooter}>
                    <Text style={styles.sheetHelper}>
                      Time &amp; place can wait. Just get it out of your head.
                    </Text>
                    <Pressable
                      style={[styles.addBtn, !taskTitle.trim() && styles.addBtnDisabled]}
                      onPress={handleAddTask}
                      disabled={!taskTitle.trim()}
                      accessibilityRole="button"
                      accessibilityLabel="Add task">
                      <Text style={[styles.addBtnText, !taskTitle.trim() && styles.addBtnTextDisabled]}>
                        Add it
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            </KeyboardAvoidingView>
          </>
        )}
      </View>
    );
  }

  function renderStage4() {
    return (
      <View style={[styles.fill, { backgroundColor: T.bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.stage4Header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={[styles.dateHeading, { fontVariant: ['tabular-nums'] }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <BrushWordmark size={23} />
        </View>

        {/* Section label */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>TODAY</Text>
          <Text style={styles.sectionCount}>
            {taskDone ? '1 / 1 done' : '0 / 1'}
          </Text>
        </View>

        {/* Task row */}
        <View
          style={[styles.taskRow, { borderTopColor: T.line, borderBottomColor: T.line }]}
          onLayout={e => { rowWidth.value = e.nativeEvent.layout.width; }}>

          {/* Brush-away wash overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.washOverlay, sweepStyle]}
            pointerEvents="none"
          />

          <Pressable
            onPress={handleBrushAway}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: taskDone }}>
            <View style={[styles.checkbox, { borderColor: taskDone ? T.faint : T.text }]}>
              <Animated.View style={[styles.checkboxFill, fillStyle]} />
            </View>
          </Pressable>

          <View style={styles.taskBody}>
            <View
              style={styles.titleWrapper}
              onLayout={e => setTitleWidth(e.nativeEvent.layout.width)}>
              <Text style={[styles.taskTitle, { color: taskDone ? T.muted : T.text }]}>
                {taskTitle || 'Your task'}
              </Text>
              {titleWidth > 0 && (
                <Animated.View style={[StyleSheet.absoluteFill, strokeStyle]} pointerEvents="none">
                  <BrushStroke width={titleWidth} color={T.accent} />
                </Animated.View>
              )}
            </View>
            <Text style={styles.taskMeta}>
              <Text style={{ color: '#8b6bc4' }}>• </Text>Errands
            </Text>
          </View>
        </View>

        {/* Bobbing hint */}
        {!taskDone && (
          <View style={styles.hintRow}>
            <BobbingArrow visible reduceMotion={reduceMotion} />
            <Text style={styles.hintText}>
              Tap the circle to <Text style={{ color: T.text, fontFamily: 'Geist-Medium' }}>brush it away.</Text>
            </Text>
          </View>
        )}

        {/* Reward card */}
        {rewardVisible && (
          <Animated.View
            style={[styles.rewardCard, { bottom: insets.bottom + 22 }, rewardCardStyle]}>
            {/* Soft bleed circle */}
            <View style={styles.rewardBleed} />

            <Animated.View style={[styles.flameBox, flameStyle]}>
              <FlameIcon size={24} />
            </Animated.View>

            <View style={styles.rewardBody}>
              <Text style={styles.rewardHeadline}>That’s one. Brushed away.</Text>
              <Text style={styles.rewardCaption}>
                Day 1 of your streak starts here. That’s the whole app, really — see it, pass it, let it go.
              </Text>
            </View>

            <View style={styles.pointsPill}>
              <Text style={[styles.pointsText, { fontVariant: ['tabular-nums'] }]}>+10</Text>
            </View>
          </Animated.View>
        )}

        {/* CTA once reward is visible */}
        {rewardVisible && (
          <View style={[styles.fullDayCta, { bottom: insets.bottom + 22 + 110 }]}>
            <Pressable
              style={styles.inkBtn}
              onPress={handleComplete}
              accessibilityRole="button"
              accessibilityLabel="See a full day">
              <Text style={styles.inkBtnText}>See a full day →</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // ── Top-level render ───────────────────────────────────────────────────────

  if (stage === 'welcome') { return renderStage1(); }
  if (stage === 'empty' || stage === 'create') { return renderStage2(); }
  if (stage === 'post') { return renderStage4(); }

  // Stage 'full' — hand off to parent which will unmount this screen
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill:          { flex: 1 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  bottomPad:     { paddingHorizontal: 22 },

  eyebrow: {
    fontFamily:    'Geist-Medium',
    fontSize:      12.5,
    letterSpacing: 0.3 * 12.5,
    color:         T.muted,
    marginBottom:  18,
  },
  tagline: {
    fontFamily: 'Geist-Regular',
    fontSize:   17,
    color:      T.muted,
    maxWidth:   280,
    textAlign:  'center',
    marginTop:  18,
    lineHeight: 26,
  },
  reassurance: {
    fontFamily: 'Geist-Regular',
    fontSize:   13,
    color:      T.muted,
    textAlign:  'center',
    marginTop:  14,
  },

  inkBtn: {
    backgroundColor: T.text,
    borderRadius:    16,
    height:          54,
    alignItems:      'center',
    justifyContent:  'center',
  },
  inkBtnText: {
    fontFamily: 'Geist-SemiBold',
    fontSize:   16,
    color:      T.bg,
  },

  accentBtn: {
    backgroundColor: T.accent,
    borderRadius:    16,
    height:          54,
    alignItems:      'center',
    justifyContent:  'center',
  },
  accentBtnText: {
    fontFamily: 'Geist-SemiBold',
    fontSize:   16,
    color:      T.bg,
  },
  helperText: {
    fontFamily: 'Geist-Regular',
    fontSize:   12.5,
    color:      T.faint,
    textAlign:  'center',
    marginTop:  12,
  },

  // Stage 2
  stage2Header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 22,
    paddingTop:     12,
    paddingBottom:  8,
  },
  dateText: {
    fontFamily: 'Geist-Regular',
    fontSize:   13,
    color:      T.muted,
  },
  nudgeArea: {
    flex: 1,
    justifyContent: 'center',
  },

  // Bottom sheet
  scrim: {
    backgroundColor: 'rgba(31,28,22,0.34)',
    zIndex: 10,
  },
  sheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: T.bg,
    borderTopLeftRadius:  26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop:      14,
    zIndex:          20,
  },
  sheetHandle: {
    width:           38,
    height:          4,
    borderRadius:    2,
    backgroundColor: T.faint,
    alignSelf:       'center',
    marginBottom:    18,
  },
  sheetEyebrow: {
    fontFamily: 'Geist-Regular',
    fontSize:   13,
    color:      T.muted,
    marginBottom: 12,
  },
  sheetInput: {
    fontFamily:    'Geist-Medium',
    fontSize:      24,
    color:         T.text,
    letterSpacing: 24 * -0.02,
    borderBottomWidth: 1.5,
    borderBottomColor: T.surface2,
    paddingVertical:   10,
    backgroundColor:   'transparent',
    marginBottom:      18,
  },
  chipScroll: { marginBottom: 18 },
  chipRow: {
    flexDirection: 'row',
    gap:           8,
    paddingRight:  22,
  },
  chip: {
    backgroundColor: T.surface,
    borderWidth:     1,
    borderColor:     T.line,
    borderRadius:    9999,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  chipSelected: {
    backgroundColor: T.text,
    borderColor:     T.text,
  },
  chipText: {
    fontFamily: 'Geist-Regular',
    fontSize:   14,
    color:      T.text,
  },
  chipTextSelected: { color: T.bg },
  sheetFooter: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            12,
  },
  sheetHelper: {
    fontFamily: 'Geist-Regular',
    fontSize:   12.5,
    color:      T.faint,
    flex:       1,
  },
  addBtn: {
    backgroundColor: T.accent,
    borderRadius:    12,
    paddingHorizontal: 20,
    paddingVertical:   12,
    minWidth:        150,
    alignItems:      'center',
  },
  addBtnDisabled: { backgroundColor: T.surface2 },
  addBtnText: {
    fontFamily: 'Geist-SemiBold',
    fontSize:   15,
    color:      T.bg,
  },
  addBtnTextDisabled: { color: T.muted },

  // Stage 4
  stage4Header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-end',
    paddingHorizontal: 22,
    paddingTop:     20,
    paddingBottom:  16,
  },
  greeting: {
    fontFamily: 'Geist-Regular',
    fontSize:   12,
    color:      T.muted,
  },
  dateHeading: {
    fontFamily:    'Geist-Medium',
    fontSize:      22,
    color:         T.text,
    letterSpacing: 22 * -0.02,
  },
  sectionRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical:   10,
  },
  sectionLabel: {
    fontFamily:    'Geist-Medium',
    fontSize:      11,
    letterSpacing: 11 * 0.16,
    color:         T.muted,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontFamily: 'Geist-Regular',
    fontSize:   13,
    color:      T.muted,
    fontVariant: ['tabular-nums'],
  } as object,
  taskRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 22,
    paddingVertical:   14,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow:          'hidden',
  },
  checkbox: {
    width:        22,
    height:       22,
    borderRadius: 11,
    borderWidth:  1.5,
    marginRight:  14,
    alignItems:   'center',
    justifyContent: 'center',
    overflow:     'hidden',
  },
  checkboxFill: {
    width:           16,
    height:          16,
    borderRadius:    8,
    backgroundColor: T.faint,
  },
  taskBody:    { flex: 1 },
  titleWrapper: { position: 'relative' },
  taskTitle: {
    fontFamily: 'Geist-Regular',
    fontSize:   16,
    lineHeight: 22,
    color:      T.text,
  },
  taskMeta: {
    fontFamily:  'Geist-Regular',
    fontSize:    12,
    color:       T.muted,
    marginTop:   4,
  },
  washOverlay: {
    borderRadius: 4,
    overflow:     'hidden',
    backgroundColor: T.nearTint2,
  },
  hintRow: {
    alignItems: 'center',
    marginTop:  20,
  },
  hintText: {
    fontFamily: 'Geist-Regular',
    fontSize:   14,
    color:      T.muted,
    marginTop:  8,
  },

  // Reward card
  rewardCard: {
    position:        'absolute',
    left:            18,
    right:           18,
    backgroundColor: T.nearTint,
    borderWidth:     1,
    borderColor:     T.nearBorder,
    borderRadius:    22,
    flexDirection:   'row',
    alignItems:      'center',
    padding:         16,
    overflow:        'hidden',
  },
  rewardBleed: {
    position:        'absolute',
    top:             -40,
    right:           -40,
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: T.nearTint2,
    opacity:         0.6,
  },
  flameBox: {
    width:           46,
    height:          46,
    borderRadius:    12,
    backgroundColor: T.bg,
    borderWidth:     1,
    borderColor:     T.nearBorder,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
  },
  rewardBody:    { flex: 1 },
  rewardHeadline: {
    fontFamily:  'Geist-SemiBold',
    fontSize:    16,
    color:       T.text,
    marginBottom: 4,
  },
  rewardCaption: {
    fontFamily: 'Geist-Regular',
    fontSize:   13,
    color:      T.nearText,
    lineHeight: 18,
  },
  pointsPill: {
    backgroundColor: T.bg,
    borderWidth:     1,
    borderColor:     T.nearBorder,
    borderRadius:    9999,
    paddingHorizontal: 10,
    paddingVertical:   4,
    marginLeft:      10,
  },
  pointsText: {
    fontFamily:  'Geist-SemiBold',
    fontSize:    13,
    color:       T.nearText,
  },
  fullDayCta: {
    position:        'absolute',
    left:            22,
    right:           22,
  },
});
