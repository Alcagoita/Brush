/**
 * WCAG contrast-ratio regression test for src/theme/tokens.ts.
 *
 * Locks in the ratios fixed by KAN-258 so a future palette edit can't
 * silently regress dark-mode elevation/readability. Light palette is
 * intentionally softer by design (KAN-258 note) — its thresholds are set
 * to the palette's current baseline, not full AA, so this only guards
 * against further erosion.
 */

import { lightPalette, darkPalette } from '../../src/theme/tokens';

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Flattens an rgba(...) string onto an opaque hex background. */
function blendOntoBg(rgba: string, bgHex: string): string {
  const match = rgba.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
  if (!match) throw new Error(`Unparseable color: ${rgba}`);
  const [, r, g, b, a] = match.map(Number);
  const [br, bgG, bb] = hexToRgb(bgHex);
  const blend = (fg: number, bgChannel: number) => Math.round(fg * a + bgChannel * (1 - a));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(blend(r, br))}${toHex(blend(g, bgG))}${toHex(blend(b, bb))}`;
}

describe('darkPalette contrast (KAN-258)', () => {
  const p = darkPalette;

  it('text and nearText read at ≥4.5:1 on every surface they appear on', () => {
    expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.text, p.surface2)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.nearText, p.nearTint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.nearText, p.nearTint2)).toBeGreaterThanOrEqual(4.5);
  });

  it('muted reads at ≥4.5:1 on bg, surface, and surface2', () => {
    expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.muted, p.surface2)).toBeGreaterThanOrEqual(4.5);
  });

  it('faint reads at ≥3:1 on bg', () => {
    expect(contrastRatio(p.faint, p.bg)).toBeGreaterThanOrEqual(3);
  });

  it('nearBorder (interactive border) reads at ≥3:1 vs its adjacent surfaces', () => {
    expect(contrastRatio(p.nearBorder, p.nearTint)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.nearBorder, p.nearTint2)).toBeGreaterThanOrEqual(3);
  });

  it('surface is distinguishable from bg (only elevation cue with shadows banned)', () => {
    expect(contrastRatio(p.surface, p.bg)).toBeGreaterThanOrEqual(1.2);
  });

  it('line is visibly present on both bg and surface', () => {
    expect(contrastRatio(blendOntoBg(p.line, p.bg), p.bg)).toBeGreaterThan(1.3);
    expect(contrastRatio(blendOntoBg(p.line, p.surface), p.surface)).toBeGreaterThan(1.3);
  });

  it('ringTrack renders visibly on bg, including on OLED-black', () => {
    expect(contrastRatio(blendOntoBg(p.ringTrack, p.bg), p.bg)).toBeGreaterThan(1.3);
  });
});

describe('lightPalette contrast (baseline, unchanged by KAN-258)', () => {
  const p = lightPalette;

  it('text and nearText stay at ≥4.5:1', () => {
    expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.text, p.surface2)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.nearText, p.nearTint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.nearText, p.nearTint2)).toBeGreaterThanOrEqual(4.5);
  });

  it('muted stays at its current (intentionally soft) baseline, no further erosion', () => {
    expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(3.5);
    expect(contrastRatio(p.muted, p.surface)).toBeGreaterThanOrEqual(3.2);
    expect(contrastRatio(p.muted, p.surface2)).toBeGreaterThanOrEqual(3);
  });
});
