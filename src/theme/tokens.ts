/**
 * tokens.ts — Single source of truth for all design tokens.
 *
 * Rules:
 *  - Never hardcode a color, font size, spacing value or radius anywhere else.
 *  - Always consume via useTheme() so light/dark switching works automatically.
 */

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
} as const;

export const darkPalette = {
  bg:         '#0e0e0c',
  surface:    '#171715',
  surface2:   '#1f1f1d',
  line:       'rgba(255,255,255,0.08)',
  text:       '#f6f5f2',
  muted:      '#8a8a85',
  faint:      '#525250',
  ringTrack:  'rgba(255,255,255,0.07)',
  ringFill:   '#f6f5f2',
  accent:     '#d4955a',   // oklch(0.72 0.14 65)
  nearTint:   '#2a1e12',   // oklch(0.22 0.045 65)
  nearTint2:  '#362514',   // oklch(0.27 0.06 65)
  nearBorder: '#6b4020',   // oklch(0.42 0.10 65)
  nearText:   '#dba87a',   // oklch(0.86 0.10 65)
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
};

// ─── Category colors ──────────────────────────────────────────────────────────

export const categories = {
  work:     { label: 'Work',     color: '#5b7fd4' }, // oklch(0.62 0.12 250) soft blue
  health:   { label: 'Health',   color: '#5ba87a' }, // oklch(0.62 0.12 165) sage
  errands:  { label: 'Errands',  color: '#8b6bc4' }, // oklch(0.62 0.12 305) muted purple
  personal: { label: 'Personal', color: '#e8a86a' }, // oklch(0.66 0.13 70)  peach
} as const;

export type CategoryKey = keyof typeof categories;

// ─── Typography ───────────────────────────────────────────────────────────────

export const fonts = {
  family: 'Geist',
  fallback: 'System',
  weights: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
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
