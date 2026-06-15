/**
 * SplashScreen — KAN-151
 *
 * Brand moment + app data gate.
 *
 * Responsibilities:
 *   1. Play the animated wordmark (brus + custom-h SVG + amber dot + paint stroke loop)
 *   2. Resolve Firebase auth and pre-load all Today screen data into Zustand
 *   3. Exit cleanly during the stroke rest phase so Today renders instantly with no
 *      loading state of its own.
 *
 * Light mode only — no dark variant.
 * SPLASH_DUR_MS = 3000 exposed for easy timing tuning.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Image,
  LayoutChangeEvent,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/appStore';
import {
  getCategories,
  getPoiPreferencesMap,
  getTasksForDate,
  getTotalPoints,
  getUser,
  getUserPreferences,
} from '../services/firestore';
import { getIncomingSharedTasksCount } from '../services/sharing';
import { todayISO } from '../utils/date';

// ─── Timing constants ─────────────────────────────────────────────────────────

export const SPLASH_DUR_MS = 3000;

const PAINT_DUR_MS      = Math.round(SPLASH_DUR_MS * 0.38); // 1140ms — 0-38%
const HOLD_DUR_MS       = Math.round(SPLASH_DUR_MS * 0.22); // 660ms  — 38-60%
const LIFT_DUR_MS       = Math.round(SPLASH_DUR_MS * 0.16); // 480ms  — 60-76%
const LIFT_START_MS     = PAINT_DUR_MS + HOLD_DUR_MS;       // 1800ms
const REST_START_MS     = LIFT_START_MS + LIFT_DUR_MS;      // 2280ms — 76-100%
const DOT_POP_START_MS  = Math.round(SPLASH_DUR_MS * 0.72); // 2160ms — 72%
const DOT_POP_DUR_MS    = Math.round(SPLASH_DUR_MS * 0.08); // 240ms  — 72-80%
const DOT_SETTLE_DUR_MS = Math.round(SPLASH_DUR_MS * 0.10); // 300ms  — 80-90%
const ENTRANCE_DUR_MS   = 650;
/** Maximum time to wait for a rest phase after data is ready before forcing exit. */
const MAX_WAIT_AFTER_READY_MS = 4_000;

// ─── Easings ──────────────────────────────────────────────────────────────────

const PAINT_EASING    = Easing.bezier(0.5, 0.05, 0.2, 1);
const LIFT_EASING     = Easing.bezier(0.4, 0.0,  0.6, 1);
const POP_IN_EASING   = Easing.bezier(0.2, 0.7,  0.3, 1);
const POP_OUT_EASING  = Easing.bezier(0.3, 0.6,  0.4, 1);
const ENTRANCE_EASING = Easing.bezier(0.2, 0.7,  0.3, 1);

// ─── Design tokens (light only) ───────────────────────────────────────────────

const SPLASH_BG     = '#fdfcfa';
const SPLASH_TEXT   = '#1f1c16';
const SPLASH_ACCENT = '#e8a86a';

// ─── Logo constants ───────────────────────────────────────────────────────────

const LOGO_SIZE = 62;
const DOT_DIAM  = Math.round(LOGO_SIZE * 0.115); // 7px

// ─── CustomH SVG ─────────────────────────────────────────────────────────────
// Identical paths to LoginScreen — the standard Geist "h" replaced by a glyph
// whose right leg lifts off the baseline, evoking a brush being raised.

function CustomH() {
  const sw = LOGO_SIZE * 0.153; // strokeWidth ≈ 9.5px
  return (
    <Svg
      width={LOGO_SIZE * 0.64}
      height={LOGO_SIZE}
      viewBox="0 0 72 100"
      style={{ overflow: 'visible', marginLeft: -(LOGO_SIZE * 0.085) }}>
      {/* Left stem */}
      <Path
        d="M 9 6 L 9 76"
        stroke={SPLASH_TEXT}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Shoulder + lifting right leg */}
      <Path
        d="M 9 40 C 9 30 18 24 30 24 C 42 24 49 31 49 42 L 49 68 C 49 74.5 53.5 77 60 74 C 64 72 66.5 68.5 68 64"
        stroke={SPLASH_TEXT}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── SplashScreen ─────────────────────────────────────────────────────────────

interface SplashScreenProps {
  onExit: () => void;
}

export default function SplashScreen({ onExit }: SplashScreenProps) {
  const { user, loading: authLoading } = useAuth();

  // Stable ref — timers capture this so they always call the latest onExit.
  const onExitRef = useRef(onExit);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  // ── Reduced motion ─────────────────────────────────────────────────────────

  const [reducedMotion, setReducedMotion] = useState(false);

  // ── Stroke geometry (computed after wordmark layout is measured) ───────────

  type StrokeGeom = { fullW: number; h: number; left: number; top: number };
  const [strokeGeom, setStrokeGeom] = useState<StrokeGeom | null>(null);

  // ── Control refs ───────────────────────────────────────────────────────────

  const isReadyRef      = useRef(false);
  const navigatingRef   = useRef(false);
  const cycleStartedRef = useRef(false);
  const cycleTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reanimated shared values ───────────────────────────────────────────────

  const wordmarkTY     = useSharedValue(14);
  const containerFullW = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const strokeOpacity  = useSharedValue(0);
  const strokeTX       = useSharedValue(0);
  const strokeTY       = useSharedValue(0);
  const strokeRot      = useSharedValue(0);
  const dotScale       = useSharedValue(1);

  // ── Animated styles ────────────────────────────────────────────────────────

  const wordmarkStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wordmarkTY.value }],
  }));

  const strokeContainerStyle = useAnimatedStyle(() => ({
    opacity: strokeOpacity.value,
    transform: [
      { translateX: strokeTX.value },
      { translateY: strokeTY.value },
      { rotate: `${strokeRot.value}deg` },
    ],
  }));

  const revealClipStyle = useAnimatedStyle(() => ({
    width: revealProgress.value * containerFullW.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  // ── Navigation ─────────────────────────────────────────────────────────────

  const doNavigate = useCallback(() => {
    if (navigatingRef.current) { return; }
    navigatingRef.current = true;
    if (cycleTimerRef.current !== null) { clearTimeout(cycleTimerRef.current); }
    if (restTimerRef.current  !== null) { clearTimeout(restTimerRef.current);  }
    if (abortTimerRef.current !== null) { clearTimeout(abortTimerRef.current); }
    onExitRef.current();
  }, []);

  // ── Mark data ready + start abort safety timer ────────────────────────────

  const markReady = useCallback(() => {
    if (isReadyRef.current) { return; }
    isReadyRef.current = true;
    abortTimerRef.current = setTimeout(doNavigate, MAX_WAIT_AFTER_READY_MS);
  }, [doNavigate]);

  // ── Animation cycle ────────────────────────────────────────────────────────

  const runCycle = useCallback(() => {
    if (navigatingRef.current) { return; }

    // Reset to start-of-cycle values
    revealProgress.value = 0;
    strokeOpacity.value  = 1;
    strokeTX.value       = 0;
    strokeTY.value       = 0;
    strokeRot.value      = 0;
    dotScale.value       = 1;

    // Phase 1 — Paint in (0 → 1140ms): reveal stroke left to right
    revealProgress.value = withTiming(1, {
      duration: PAINT_DUR_MS,
      easing:   PAINT_EASING,
    });

    // Phase 3 — Lift away (1800 → 2280ms): fade + translate + rotate
    strokeOpacity.value = withDelay(
      LIFT_START_MS,
      withTiming(0, { duration: LIFT_DUR_MS, easing: LIFT_EASING }),
    );
    strokeTX.value = withDelay(
      LIFT_START_MS,
      withTiming(18, { duration: LIFT_DUR_MS, easing: LIFT_EASING }),
    );
    strokeTY.value = withDelay(
      LIFT_START_MS,
      withTiming(-12, { duration: LIFT_DUR_MS, easing: LIFT_EASING }),
    );
    strokeRot.value = withDelay(
      LIFT_START_MS,
      withTiming(-2, { duration: LIFT_DUR_MS, easing: LIFT_EASING }),
    );

    // Dot pop (2160 → 2700ms): scale 1 → 1.5 → 1
    dotScale.value = withDelay(
      DOT_POP_START_MS,
      withSequence(
        withTiming(1.5, { duration: DOT_POP_DUR_MS,    easing: POP_IN_EASING  }),
        withTiming(1.0, { duration: DOT_SETTLE_DUR_MS, easing: POP_OUT_EASING }),
      ),
    );

    // Navigate at rest phase start (76%) if data is ready
    restTimerRef.current = setTimeout(() => {
      if (isReadyRef.current) {
        doNavigate();
      }
    }, REST_START_MS);

    // Start next cycle unless we navigated
    cycleTimerRef.current = setTimeout(() => {
      if (restTimerRef.current !== null) { clearTimeout(restTimerRef.current); }
      runCycle();
    }, SPLASH_DUR_MS);
  }, [
    revealProgress, strokeOpacity, strokeTX, strokeTY, strokeRot, dotScale,
    doNavigate,
  ]);

  // ── Wordmark layout → stroke geometry → start cycle ───────────────────────

  const handleWordmarkLayout = useCallback((e: LayoutChangeEvent) => {
    if (cycleStartedRef.current || reducedMotion) { return; }

    const { width, height } = e.nativeEvent.layout;
    const fullW = width  * 1.40;
    const h     = fullW  * (283 / 829); // amber-stroke.png aspect ratio

    containerFullW.value = fullW;
    setStrokeGeom({
      fullW,
      h,
      left: -(width * 0.20),
      top:  height * 0.63 - h / 2, // translateY(-50%) at 63% height
    });

    cycleStartedRef.current = true;
    runCycle();
  }, [reducedMotion, containerFullW, runCycle]);

  // ── Entrance animation + reduced motion check ─────────────────────────────

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReducedMotion(enabled);
      if (enabled) {
        wordmarkTY.value = 0;
      } else {
        wordmarkTY.value = withTiming(0, {
          duration: ENTRANCE_DUR_MS,
          easing:   ENTRANCE_EASING,
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) { return; }

    let cancelled = false;

    if (!user) {
      markReady();
      return () => { cancelled = true; };
    }

    const uid = user.uid;
    Promise.all([
      getTasksForDate(uid, todayISO()),
      getUser(uid),
      getUserPreferences(uid),
      getPoiPreferencesMap(uid),
      getCategories(uid),
      getTotalPoints(uid),
      getIncomingSharedTasksCount(uid),
    ])
      .then(([tasks, userData, userPrefs, poiPrefsMap, categories, totalPoints, inboxCount]) => {
        if (cancelled) { return; }
        useAppStore.getState().setBootData({
          ownerUid: uid,
          tasks,
          userData,
          customCategories: categories,
          totalPoints,
          inboxCount,
          userPrefs,
          poiPrefsMap,
        });
        markReady();
      })
      .catch(() => {
        if (cancelled) { return; }
        // Data failed — proceed anyway; Today screen will retry its own fetch.
        markReady();
      });
    return () => { cancelled = true; };
  }, [authLoading, user, markReady]);

  // ── Timer cleanup ─────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (cycleTimerRef.current !== null) { clearTimeout(cycleTimerRef.current); }
      if (restTimerRef.current  !== null) { clearTimeout(restTimerRef.current);  }
      if (abortTimerRef.current !== null) { clearTimeout(abortTimerRef.current); }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SPLASH_BG} />

      <Animated.View style={wordmarkStyle}>
        {/*
          Wordmark container — measured via onLayout.
          Dot and stroke are absolutely positioned relative to this view.
          alignSelf: 'flex-start' ensures the container hugs the wordmark
          width so the measured size equals the wordmark bounding box.
        */}
        <View
          onLayout={handleWordmarkLayout}
          style={styles.wordmarkContainer}
        >
          {/* "brus" + custom-h row */}
          <View style={styles.wordmarkRow}>
            <Text style={styles.brusText}>brus</Text>
            <CustomH />
          </View>

          {/* Amber dot — floats where the lifted h-leg points */}
          <Animated.View
            style={[styles.dot, dotStyle]}
            accessible={false}
          />

          {/* Paint stroke overlay — revealed left to right, then lifted away */}
          {strokeGeom !== null && !reducedMotion && (
            <Animated.View
              style={[
                strokeContainerStyle,
                {
                  position: 'absolute',
                  left:   strokeGeom.left,
                  top:    strokeGeom.top,
                  width:  strokeGeom.fullW,
                  height: strokeGeom.h,
                },
              ]}
              accessible={false}
              pointerEvents="none"
            >
              {/* Clip container — width animates 0 → fullW for the L→R reveal */}
              <Animated.View
                style={[revealClipStyle, { height: strokeGeom.h, overflow: 'hidden' }]}
              >
                <Image
                  source={require('../../assets/amber-stroke.png')}
                  style={{
                    width:  strokeGeom.fullW,
                    height: strokeGeom.h,
                    transform: [{ scaleY: 1.18 }],
                  }}
                  resizeMode="stretch"
                  accessible={false}
                />
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: SPLASH_BG,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          999,
  },
  wordmarkContainer: {
    alignSelf: 'flex-start',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
  },
  brusText: {
    fontFamily:         'Geist-SemiBold',
    fontSize:           LOGO_SIZE,
    fontWeight:         '600',
    letterSpacing:      LOGO_SIZE * -0.06,
    lineHeight:         LOGO_SIZE * 1.1, // prevent clipping on Android
    color:              SPLASH_TEXT,
    includeFontPadding: false,
  },
  dot: {
    position:        'absolute',
    right:           -(LOGO_SIZE * 0.05),
    top:             LOGO_SIZE * 0.30,
    width:           DOT_DIAM,
    height:          DOT_DIAM,
    borderRadius:    DOT_DIAM / 2,
    backgroundColor: SPLASH_ACCENT,
  },
});
