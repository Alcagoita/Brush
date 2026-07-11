/**
 * tokens.ts — Single source of truth for all design tokens.
 *
 * Rules:
 *  - Never hardcode a color, font size, spacing value or radius anywhere else.
 *  - Always consume via useTheme() so light/dark switching works automatically.
 */

import { COPY } from '../constants/copy';

// ─── Color palettes ───────────────────────────────────────────────────────────

export const lightPalette = {
  bg:         '#fdfcfa',
  surface:    '#f4f2ed',
  surface2:   '#ece9e2',
  line:       'rgba(40,33,20,0.08)',
  text:       '#1f1c16',
  muted:      '#8b857a',
  faint:      '#c1bbac',
  ringTrack:  'rgba(20,20,18,0.08)',
  ringFill:   '#db9657',   // oklch(0.73 0.115 62) soft peach
  accent:     '#e8a86a',   // oklch(0.66 0.13 65)
  nearTint:   '#fdf7f0',   // oklch(0.97 0.028 65)
  nearTint2:  '#f9ede0',   // oklch(0.94 0.05 65)
  nearBorder: '#e8c9a0',   // oklch(0.85 0.09 65)
  nearText:   '#7a4a20',   // oklch(0.42 0.13 65)
  success:    '#4caf7d',   // accepted / positive status
  danger:     '#e05252',   // declined / error status
  onAccent:   '#ffffff',   // text/icons shown on an accent-coloured surface
  scrim:      'rgba(0,0,0,0.25)', // modal/loading-overlay backdrop dim
} as const;

export const darkPalette = {
  bg:         '#0e0e0c',
  surface:    '#232321',   // oklch(0.19 0.004 95) — bg→surface≥1.2:1, the only elevation cue with shadows banned
  surface2:   '#2c2c2a',   // oklch(0.22 0.004 95) — continues the surface→surface2 luminance ladder
  line:       'rgba(255,255,255,0.13)',
  text:       '#f6f5f2',
  muted:      '#96968f',   // oklch(0.63 0.006 95) — keeps ≥4.5:1 on surface2, the tightest of the three surfaces
  faint:      '#6e6e69',   // oklch(0.47 0.006 95) — ≥3:1 on bg
  ringTrack:  'rgba(255,255,255,0.12)',
  ringFill:   '#f6f5f2',
  accent:     '#d4955a',   // oklch(0.72 0.14 65)
  nearTint:   '#2a1e12',   // oklch(0.22 0.045 65)
  nearTint2:  '#362514',   // oklch(0.27 0.06 65)
  nearBorder: '#a06f40',   // oklch(0.52 0.10 65) — ≥3:1 vs both nearTint and nearTint2
  nearText:   '#dba87a',   // oklch(0.86 0.10 65)
  success:    '#5fc090',   // accepted / positive status (brighter for dark bg)
  danger:     '#f06a6a',   // declined / error status (brighter for dark bg)
  onAccent:   '#ffffff',   // text/icons shown on an accent-coloured surface
  scrim:      'rgba(0,0,0,0.25)', // modal/loading-overlay backdrop dim
} as const;

export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  faint: string;
  ringTrack: string;
  ringFill: string;
  accent: string;
  nearTint: string;
  nearTint2: string;
  nearBorder: string;
  nearText: string;
  success: string;
  danger: string;
  onAccent: string;
  scrim: string;
};

// ─── Category colors ──────────────────────────────────────────────────────────

// Getters (KAN-252) instead of plain object literals — `label` reads live
// from COPY on every access, so every existing `categories.work.label` /
// `categories[key].label` call site across the app stays language-aware
// without any change at the call site.
export const categories = {
  get work()     { return { label: COPY.categories.work,     color: '#5b7fd4' }; }, // oklch(0.62 0.12 250) soft blue
  get health()   { return { label: COPY.categories.health,   color: '#5ba87a' }; }, // oklch(0.62 0.12 165) sage
  get errands()  { return { label: COPY.categories.errands,  color: '#8b6bc4' }; }, // oklch(0.62 0.12 305) muted purple
  get personal() { return { label: COPY.categories.personal, color: '#e8a86a' }; }, // oklch(0.66 0.13 70)  peach
};

export type CategoryKey = keyof typeof categories;

/**
 * Achievement tier badge colors (KAN-217). Fixed swatch set like `categories`
 * above — tier identity colors don't vary between light/dark mode.
 */
export const tierColors = {
  tin:        '#9b9690',
  bronze:     '#b3793f',
  silver:     '#7d93a4',
  gold:       '#c0972d',
  adamantium: '#5e788c',
  vibranium:  '#7256a6',
} as const;

/**
 * Fixed swatch set offered when a user creates a custom category (KAN-217).
 * Unlike the themed palette, these represent user-chosen category identity
 * colors — they don't vary between light/dark mode, same as `categories` above.
 */
export const categoryHues = [
  '#d4855a', // oklch(0.66 0.13 30)
  '#e8a86a', // oklch(0.66 0.13 70) — accent
  '#5ba87a', // oklch(0.62 0.12 130)
  '#5ba87a', // oklch(0.62 0.12 165)
  '#5b8fa4', // oklch(0.62 0.12 215)
  '#5b7fd4', // oklch(0.62 0.12 250)
  '#8b6bc4', // oklch(0.62 0.12 305)
  '#c45b7a', // oklch(0.62 0.12 350)
] as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const fonts = {
  family: 'Geist',
  fallback: 'System',
  weights: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
  },
  /** Single shared source of the per-weight linked font names — reference
   *  these instead of a hard-coded 'Geist-Weight' string literal in a
   *  component. Falls back to `fallback` (the platform's system font) if the
   *  named font fails to load, same as any other RN fontFamily. */
  families: {
    regular:  'Geist-Regular',
    medium:   'Geist-Medium',
    semibold: 'Geist-SemiBold',
  },
  /** Reusable font sizes — add to this instead of a raw literal in a component. */
  sizes: {
    /** Secondary/quiet row label (e.g. Calendar's "Going somewhere?" entry row). */
    label: 13.5,
  },
};

// ─── Spacing ──────────────────────────────────────────────────────────────────

/** Base unit: 4. Horizontal page margin: 22. */
export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  page: 22,   // horizontal page margin
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const radius = {
  avatar:   9999,
  chip:     9999,
  card:     16,
  heroIcon: 14,
  listIcon: 10,
  ctaBtn:   12,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

/**
 * No drop shadows anywhere — per design spec.
 * Elevation 0 for all components; use 1px border lines instead.
 */
export const elevation = 0;
