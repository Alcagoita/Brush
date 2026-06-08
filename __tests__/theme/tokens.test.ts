/**
 * KAN-133 — Brand warm-up: light theme token values.
 *
 * Verifies that the light palette was updated to warm-toned values
 * and that the dark palette is unaffected.
 */

import { lightPalette, darkPalette } from '../../src/theme/tokens';

describe('KAN-133 — light palette warm-toned tokens', () => {
  it('bg is updated to #fdfcfa', () => {
    expect(lightPalette.bg).toBe('#fdfcfa');
  });

  it('surface is updated to #f4f2ed', () => {
    expect(lightPalette.surface).toBe('#f4f2ed');
  });

  it('surface2 is updated to #ece9e2', () => {
    expect(lightPalette.surface2).toBe('#ece9e2');
  });

  it('line rgba has warm brown tint (40,33,20)', () => {
    expect(lightPalette.line).toBe('rgba(40,33,20,0.08)');
  });

  it('text is updated to #1f1c16', () => {
    expect(lightPalette.text).toBe('#1f1c16');
  });

  it('muted is updated to #8b857a', () => {
    expect(lightPalette.muted).toBe('#8b857a');
  });

  it('faint is updated to #c1bbac', () => {
    expect(lightPalette.faint).toBe('#c1bbac');
  });

  it('ringFill is peach (#db9657) — was near-black', () => {
    expect(lightPalette.ringFill).toBe('#db9657');
  });
});

describe('KAN-133 — dark palette unchanged', () => {
  it('dark bg is unchanged', () => {
    expect(darkPalette.bg).toBe('#0e0e0c');
  });

  it('dark ringFill is still near-white', () => {
    expect(darkPalette.ringFill).toBe('#f6f5f2');
  });

  it('dark surface is unchanged', () => {
    expect(darkPalette.surface).toBe('#171715');
  });
});
