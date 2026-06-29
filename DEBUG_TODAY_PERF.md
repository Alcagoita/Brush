# Today Screen Performance Bug — Debug Handoff

Status: **UNRESOLVED**. Root cause not yet pinned. This file captures everything
learned so a fresh session can continue without re-deriving it.

Branch: `KAN-107-offline-scenario-tests` (work done on top of it; NOT committed).
Device: Pixel (`HT76T0209136`), Android, package `com.brush`.
Stack: RN **0.85.3**, New Architecture (Fabric) **ON**, react-native-svg **15.15.5**,
react-native-reanimated **3.19.5** (patched, see `patches/`).

---

## Symptoms (as reported by user)

1. **Today screen locks.** After it opens, only the **FAB** and **scroll** work.
   All other touches dead (top Header icons, task rows, etc.). FAB works = JS is
   NOT hard-pegged at that moment (FAB onPress is local setState and runs).
2. **New Task sheet close → ~7s freeze.** Open the New Task sheet, close it
   WITHOUT creating anything → app stalls ~7s before scroll works again.
   Reproducible, independent of the list contents. **Separate bug** from #1.
3. User insists the problem is **inside the Today scroll/list**, not splash,
   not the background engines. Confirmed by bisect (below).

These appear to be **multiple independent problems** on one screen.

---

## What is CONFIRMED

- **List lock (#1) = per-row `react-native-svg` (`PoiIcon`).**
  Bisect: stripping the Today list to Header+FAB only → everything works.
  Adding back the FlatList with **dumb `<Text>` rows** → works. Adding back the
  real `TaskRow` → locks. Stripping `TaskRow` to a fully static row → works.
  Adding `PoiChip` back (which renders `PoiIcon`, an SVG) → **locks again**.
  Removing just `<PoiIcon>` from `PoiChip` (keep label) → **list responsive**.
  → With **<10 tasks**, a handful of static SVG icons locks the list. Abnormal
  for these versions, but reproducible.
- **Engines are NOT the list cause.** With ALL location/proximity/indoor/store-
  tuning/battery/wear/achievements disabled (`DEBUG_DISABLE_BACKGROUND`), the
  full UI still locked. With engines ON but UI stripped to Header+FAB, all fine.
- **Sheet 7s freeze (#2) is NOT the SVG icons.** Removing `PoiIcon` from the
  sheet's POI radio tiles did **not** change the 7s freeze. Root still unknown.
- **JS-thread profile during a lock** (`simpleperf`, comm `mqt_v_js`) shows
  continuous **`YogaLayoutableShadowNode::ensureYogaChildrenLookFine`,
  `RawPropsParser::at`, `folly::dynamic` alloc/free churn** → continuous
  ShadowTree commits (re-render / layout storm), heavy malloc churn, RES grows.

## What is RULED OUT

- Not the background engines (location/proximity/etc).
- Not the NearbyCard, not the collapsible ring overlay (both kept OFF during the
  list bisect; list still locked from `TaskRow`/`PoiIcon`).
- Not `PoiChip`'s `PulsingDot` animation (replaced with static dot; still locked
  → it was the `PoiIcon` SVG, not the animation).
- Not the `BrushStroke`/sweep SVG specifically (they were gated off and the list
  still locked via `PoiIcon`) — but they are ALSO react-native-svg and should be
  treated as suspect for the same cost.
- Sheet 7s: not the sheet's SVG icons.

## Open hypotheses / next steps

1. **react-native-svg 15.15.5 + RN 0.85 Fabric mount cost.** <10 static SVGs
   locking is the core mystery. Next: minimal repro — a bare screen with N
   `<Svg>` icons, measure mount time vs N. Try bumping/pinning react-native-svg,
   or check its GitHub issues for RN 0.85 / Fabric mount regressions. Consider
   replacing the `AppIcon`/`PoiIcon` SVG primitive app-wide with an icon FONT or
   pre-rendered PNGs if it's a library regression.
2. **Sheet 7s freeze (#2) — UNPROFILED.** Was about to capture per-thread CPU
   during a user-driven open→close when the app was killed. DO THIS FIRST next
   session: sample `mqt_v_js` / `RenderThread` / main during the 7s. Decides
   JS render-storm vs layout/paint vs keyboard. Suspects: TextInput/keyboard
   dismiss, reanimated close animation + setTimeout(doClose,300), `resetForm`
   (5 setStates), TodayScreen re-render on `sheetVisible=false` re-rendering the
   FlatList (`listHeader`/footer are fresh JSX each render → not memoized →
   FlatList re-renders).
3. Why does the SVG-removed list work but FAB-only also worked — confirm whether
   the list lock is mount-time only (clears after settle) vs persistent. User
   saw a transient "header dead then I can use the app now" once.

---

## Current working-tree state (NOT committed — debug scaffolding in place)

Debug flags currently set:

- `src/hooks/useTodayScreen.ts`
  - `const DEBUG_DISABLE_BACKGROUND = false;` (engines ON). Set `true` to kill
    all location/proximity/indoor/storeTuning/battery/wear/achievements.
- `src/screens/TodayScreen.tsx`
  - `DEBUG_SHOW_LIST = true` / `DEBUG_SHOW_NEARBY = false` / `DEBUG_SHOW_RING = false`
  - `DEBUG_SIMPLE_ROWS = false` (true → render dumb `<Text>` rows instead of TaskRow)
  - `DEBUG_MINIMAL` derived = `!SHOW_LIST && !SHOW_RING`. When true → only Header+FAB.
- `src/components/TaskRow.tsx`
  - `const DEBUG_TASKROW_LIGHT = true;` → early-returns a fully static row
    (+ animated checkbox fill + PoiChip), skipping onLayout / BrushStroke / sweep.
- `src/components/PoiChip.tsx`
  - `PulsingDot` (infinite reanimated pulse) replaced with static `StaticDot`.
    `PoiIcon` restored.
- `src/components/NewTaskSheet.tsx` — `PoiIcon` restored (no debug change left).

**To restore production behaviour:** set `DEBUG_DISABLE_BACKGROUND=false` (already),
`DEBUG_SHOW_LIST/NEARBY/RING=true`, `DEBUG_SIMPLE_ROWS=false`,
`DEBUG_TASKROW_LIGHT=false`, and decide whether to keep `StaticDot`.

### Non-debug changes also made this session (review separately)

- `src/screens/TodayScreen.tsx`: list converted from `Animated.ScrollView` +
  `.map()` to **`Animated.FlatList`** (virtualization). Header/empty/footer moved
  to ListHeader/Empty/Footer. Per-row `nearbyPoiType` narrowed (only matching row
  gets non-null). **Keep** — sound improvement, but `listHeader`/footer are fresh
  JSX each render (not memoized) → may cause FlatList re-renders (see hypothesis 2).
- `src/hooks/useTodayScreen.ts`: `handleToggle` stabilized — reads `tasks` via
  `latestTasksRef` and `nearbyPoiType` via new `nearbyPoiTypeRef`; deps now `[uid]`.
  **Keep.**
- `src/screens/SplashScreen.tsx`: (user said forget splash, but changes are in tree)
  - `revealClipStyle` (animated `width`, a layout prop) → `revealMaskStyle`
    (translateX mask). Removes per-frame Yoga layout. **Keep.**
  - `runCycle` no longer self-reschedules (one-shot, removed `cycleTimerRef`).
  - Added `BOOT_HARD_TIMEOUT_MS = 8000` + boot-safety effect calling `markReady`.
  - NOTE: in automated relaunch tests the splash sometimes did NOT hand off to
    Today within ~30s; needs verification. The splash per-frame `width` animation
    was independently confirmed (via simpleperf + forcing reduce-motion → CPU
    dropped to 0) to peg `mqt_v_js`. May be a 3rd, splash-only issue.

---

## Commands cheat-sheet

```bash
# Bundle JS (release) + build debug APK + install
cd /Users/olegario.nascimento/Brush
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
( cd android && ./gradlew assembleDebug )
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch / stop
adb shell monkey -p com.brush -c android.intent.category.LAUNCHER 1
adb shell am force-stop com.brush

# Per-thread CPU (find the pegged thread)
adb shell top -H -b -n 1 | grep -iE "mqt_v_js|RenderThread| com.brush "

# JS-thread sampling profile (debuggable app, no root needed)
adb shell "simpleperf record --app com.brush -g -f 2000 -o /data/local/tmp/p.perf --duration 5"
adb shell "simpleperf report -i /data/local/tmp/p.perf --comms mqt_v_js --sort symbol -n" | head -25

# Live view tree (find touch-blocking overlay). Fails with "could not get idle
# state" if UI never settles (itself a signal of continuous churn).
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml

# Screenshot
adb exec-out screencap -p > /tmp/s.png

# Crash / error logs (release build strips console.log; use AndroidRuntime/Crashlytics)
adb logcat -d | grep -iE "FATAL|AndroidRuntime|ExceptionsManager|ReactNativeJS"
```

### Per-thread CPU sampler for the 7s sheet-close (DO THIS NEXT)

```bash
PID=$(adb shell pidof com.brush | tr -d '\r')
for i in $(seq 1 30); do
  adb shell top -H -b -n 1 -p $PID 2>/dev/null \
    | grep -iE "mqt_v_js|RenderThread|com.brush" \
    | awk -v t=$i '{printf "[%s] %s %s%%\n", t, $NF, $9}'
done
# Open the New Task sheet, then close it (no create) during the loop. Watch
# which thread spikes for ~7s: mqt_v_js = JS render storm; RenderThread/main =
# layout/paint; near-zero = blocked on something off-thread.
```

---

## Key files

- `src/screens/TodayScreen.tsx` — Today screen (FlatList, ring overlay, FAB).
- `src/hooks/useTodayScreen.ts` — data + all background engines.
- `src/components/TaskRow.tsx` — per-row UI (reanimated + SVG; the list killer).
- `src/components/PoiChip.tsx` — renders `PoiIcon` (the confirmed list SVG cost).
- `src/components/AppIcon.tsx` — `PoiIcon`/icon set, all `react-native-svg`.
- `src/components/NewTaskSheet.tsx` — the sheet whose close freezes ~7s.
- `src/screens/SplashScreen.tsx` — splash (separate per-frame-width issue).

## Memory note for next session

This session burned many cycles guessing before measuring. **Measure first**:
simpleperf the JS thread and sample per-thread CPU during the exact 7s window
BEFORE forming hypotheses. The list lock is `react-native-svg` mount cost
(confirmed by bisect); the sheet 7s is still unprofiled.
