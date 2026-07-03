import { Dimensions } from 'react-native';
import { categories } from '../../theme/tokens';
import type { NudgeMessage } from '../../components/ScrRotatingNudge';

// ─── Layout constants ─────────────────────────────────────────────────────────

export const SCREEN_W = Dimensions.get('window').width;
export const SCROLL_RANGE = 170; // SECTION_H_REST − SECTION_H_COLLAPSED (declared below)

export const RING_REST      = 246;
export const RING_COLLAPSED = 112;
export const STROKE_REST      = 14;
export const RING_LEFT_REST      = (SCREEN_W - RING_REST) / 2;
export const RING_LEFT_COLLAPSED = 22;

export const SECTION_H_REST      = 320;
export const SECTION_H_COLLAPSED = 150;
export const RING_TOP_REST      = (SECTION_H_REST      - RING_REST)      / 2;
export const RING_TOP_COLLAPSED = (SECTION_H_COLLAPSED - RING_COLLAPSED) / 2;

// ── 2-state collapse (KAN-157) ──────────────────────────────────────────────────
// Two positions only: rest (scroll 0 → 60%) and collapsed (60 → 100%). A single
// `collapseT` (0↔1) animates between them on the UI thread; everything is a
// composite-only transform/opacity interpolation of it.
export const COLLAPSE_THRESHOLD = 0.6; // fraction of SCROLL_RANGE that triggers collapse

/**
 * DEBUG bisect toggles for the Today scroll block. Add parts back one at a time
 * to isolate what locks the screen. Restore by setting all three true.
 */
export const DEBUG_SHOW_LIST    = true;  // the FlatList of TaskRows
export const DEBUG_SHOW_NEARBY  = true;  // the NearbyCard (list header)
export const DEBUG_SHOW_RING    = true;  // the collapsible ring overlay
export const DEBUG_SIMPLE_ROWS  = false; // render dumb <Text> rows instead of <TaskRow>
export const DEBUG_MINIMAL = !DEBUG_SHOW_LIST && !DEBUG_SHOW_RING;

// ─── Empty-state message set (KAN-139) ───────────────────────────────────────

export const EMPTY_MESSAGES: NudgeMessage[] = [
  { text: "Nothing on today. That doesn’t mean nothing matters." },
  { text: "Don’t you feel the need for bread?",                  poi: "supermarket", color: categories.errands.color },
  { text: "Maybe today’s a good day for coffee outside.",        poi: "cafe",        color: categories.personal.color },
  { text: "Might be worth grabbing some cash while you’re out.", poi: "atm",         color: categories.errands.color },
  { text: "Anything in the cabinet running low?",                     poi: "pharmacy",    color: categories.health.color },
  { text: "Something in the fridge is probably asking to be replaced.", poi: "supermarket", color: categories.errands.color },
  { text: "A clear day is a gift. What will you do with it?" },
  { text: "What’s the one thing future-you will thank you for?" },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
