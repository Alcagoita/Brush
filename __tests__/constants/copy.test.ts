import { COPY, setCopyLanguage } from '../../src/constants/copy';

describe('COPY — pt-PT localized count strings', () => {
  beforeEach(() => {
    setCopyLanguage('pt-PT');
  });

  afterEach(() => {
    setCopyLanguage('en');
  });

  it('uses singular and plural forms for Today and Nearby labels', () => {
    expect(COPY.today.leftCount(1)).toBe('Falta 1');
    expect(COPY.today.leftCount(4)).toBe('Faltam 4');
    expect(COPY.today.nearbyCount(1)).toBe('1 local');
    expect(COPY.today.nearbyCount(3)).toBe('3 locais');
    expect(COPY.nearbyCard.headerLabel).toBe('Na proximidade');
    expect(COPY.nearbyCard.placesCount(1)).toBe('1 local');
    expect(COPY.nearbyCard.placesCount(2)).toBe('2 locais');
  });

  it('keeps Brush in English and localizes achievements tiers', () => {
    expect(COPY.achievements.earnedSection(3)).toBe('DESBLOQUEADAS · 3');
    expect(COPY.achievements.onItsWay('Bronze')).toBe(' · Bronze está perto');
    expect(COPY.achievements.tierLabel('Tin')).toBe('Estanho');
    expect(COPY.achievements.tierLabel('Silver')).toBe('Prata');
    expect(COPY.achievements.tierLabel('Vibranium')).toBe('Vibrânio');
    expect(COPY.achievements.catalogue.firstBrushLabel).toBe('Primeira Brush');
    expect(COPY.achievements.catalogue.firstBrushCondition).toBe('Brush away a tua primeira tarefa');
    expect(COPY.achievements.catalogue.explorerCondition).toBe('Brush 10 tarefas ligadas a localizações');
  });

  it('localizes the mall snapshot row copy', () => {
    setCopyLanguage('en');
    expect(COPY.mallSnapshot.rowLabel).toBe('Activate Mall mode');
    expect(COPY.mallSnapshot.rowSublabel).toBe("Download this mall's places so I can help you faster without a signal.");
    setCopyLanguage('pt-PT');
    expect(COPY.mallSnapshot.rowLabel).toBe('Activar modo Shopping');
    expect(COPY.mallSnapshot.rowSublabel).toBe('Descarregue os locais deste Shopping para que eu te ajude mais rapidamente e sem internet.');
  });
});
