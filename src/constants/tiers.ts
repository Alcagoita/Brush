export interface Tier {
  name: string;
  at: number;
  color: string;
}

export const TIERS: Tier[] = [
  { name: 'Tin',        at: 0,    color: '#9b9690' },
  { name: 'Bronze',     at: 50,   color: '#b3793f' },
  { name: 'Silver',     at: 200,  color: '#7d93a4' },
  { name: 'Gold',       at: 500,  color: '#c0972d' },
  { name: 'Adamantium', at: 1200, color: '#5e788c' },
  { name: 'Vibranium',  at: 3000, color: '#7256a6' },
];

export function deriveTierStanding(points: number) {
  const tierIdx  = TIERS.filter(t => points >= t.at).length;
  const nextTier = TIERS[Math.min(tierIdx, TIERS.length - 1)];
  const curTier  = TIERS[tierIdx - 1] ?? { at: 0, name: '', color: '' };
  const maxed    = tierIdx >= TIERS.length;
  const span     = Math.max(nextTier.at - curTier.at, 1);
  const bandPct  = maxed ? 1 : (points - curTier.at) / span;
  const toGo     = Math.max(nextTier.at - points, 0);
  return { tierIdx, curTier, nextTier, maxed, bandPct, toGo };
}
