import { TIERS, deriveTierStanding } from '../../src/constants/tiers';

describe('TIERS', () => {
  it('has 6 tiers in ascending threshold order', () => {
    expect(TIERS).toHaveLength(6);
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].at).toBeGreaterThan(TIERS[i - 1].at);
    }
  });

  it('starts at 0 (Tin) and ends at 3000 (Vibranium)', () => {
    expect(TIERS[0].at).toBe(0);
    expect(TIERS[5].at).toBe(3000);
  });
});

describe('deriveTierStanding', () => {
  it('0 pts → Tin (tierIdx=1), bandPct=0, toGo=50', () => {
    const s = deriveTierStanding(0);
    expect(s.tierIdx).toBe(1);
    expect(s.curTier.name).toBe('Tin');
    expect(s.nextTier.name).toBe('Bronze');
    expect(s.bandPct).toBeCloseTo(0);
    expect(s.toGo).toBe(50);
    expect(s.maxed).toBe(false);
  });

  it('4 pts → Tin, bandPct ≈ 0.08, toGo=46', () => {
    const s = deriveTierStanding(4);
    expect(s.tierIdx).toBe(1);
    expect(s.bandPct).toBeCloseTo(4 / 50);
    expect(s.toGo).toBe(46);
  });

  it('50 pts → Bronze (tierIdx=2)', () => {
    const s = deriveTierStanding(50);
    expect(s.tierIdx).toBe(2);
    expect(s.curTier.name).toBe('Bronze');
    expect(s.nextTier.name).toBe('Silver');
  });

  it('500 pts → Gold (tierIdx=4), bandPct=0', () => {
    const s = deriveTierStanding(500);
    expect(s.tierIdx).toBe(4);
    expect(s.curTier.name).toBe('Gold');
    expect(s.bandPct).toBeCloseTo(0);
  });

  it('3000 pts → maxed, bandPct=1, toGo=0', () => {
    const s = deriveTierStanding(3000);
    expect(s.maxed).toBe(true);
    expect(s.bandPct).toBe(1);
    expect(s.toGo).toBe(0);
  });

  it('bandPct is within-band, not points/nextThreshold', () => {
    // 200 pts is exactly Bronze→Silver floor.
    // Next threshold is Gold at 500.
    // Band = Silver(200) → Gold(500), span=300.
    // At 350 pts: bandPct = (350-200)/300 = 0.5
    const s = deriveTierStanding(350);
    expect(s.curTier.name).toBe('Silver');
    expect(s.bandPct).toBeCloseTo(0.5);
    // NOT 350/500 = 0.7
    expect(s.bandPct).not.toBeCloseTo(350 / 500);
  });

  it('points above max → maxed=true, toGo=0', () => {
    const s = deriveTierStanding(5000);
    expect(s.maxed).toBe(true);
    expect(s.toGo).toBe(0);
  });
});
