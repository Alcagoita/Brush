/**
 * Shared stroke props + base icon prop types used by every icon in this
 * directory. Style spec (applies to every icon here):
 *   • 24 × 24 viewBox, rendered at whatever size the caller passes
 *   • fill="none"
 *   • stroke="currentColor" → passed as `color` prop
 *   • strokeWidth 1.6  (1.8 for BellIcon emphasis)
 *   • strokeLinecap="round" · strokeLinejoin="round"
 *   • No gradients, no shadows, no multi-weight strokes
 *   • Exception: tiny solid accent dots/wheels use fill=color, stroke="none"
 *
 * Closest reference: Lucide / Feather — hairline geometric outline aesthetic.
 */

export const S = {
  strokeLinecap:  'round'  as const,
  strokeLinejoin: 'round'  as const,
};

export interface IconProps {
  color: string;
  size?: number;
}
