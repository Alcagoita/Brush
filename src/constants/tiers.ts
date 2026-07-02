import { tierColors } from '../theme/tokens';

export interface Tier {
  name: string;
  at: number;
  color: string;
}

export const TIERS: Tier[] = [
  { name: 'Tin',        at: 0,    color: tierColors.tin },
  { name: 'Bronze',     at: 50,   color: tierColors.bronze },
  { name: 'Silver',     at: 200,  color: tierColors.silver },
  { name: 'Gold',       at: 500,  color: tierColors.gold },
  { name: 'Adamantium', at: 1200, color: tierColors.adamantium },
  { name: 'Vibranium',  at: 3000, color: tierColors.vibranium },
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
