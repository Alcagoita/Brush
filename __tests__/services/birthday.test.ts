/**
 * KAN-248 — birthday.ts: import-event birthday detection.
 */

import { titleLooksLikeBirthday, isBirthdayEvent } from '../../src/services/birthday';

describe('titleLooksLikeBirthday', () => {
  it('matches "birthday" case-insensitively', () => {
    expect(titleLooksLikeBirthday('Sarah\'s Birthday')).toBe(true);
    expect(titleLooksLikeBirthday('BIRTHDAY PARTY')).toBe(true);
    expect(titleLooksLikeBirthday('john birthday')).toBe(true);
  });

  it('matches "aniversário" with or without the accent', () => {
    expect(titleLooksLikeBirthday('Aniversário da Maria')).toBe(true);
    expect(titleLooksLikeBirthday('aniversario do joao')).toBe(true);
  });

  it('does not match an unrelated title', () => {
    expect(titleLooksLikeBirthday('Team standup')).toBe(false);
    expect(titleLooksLikeBirthday('Dentist appointment')).toBe(false);
  });

  it('does not match an empty title', () => {
    expect(titleLooksLikeBirthday('')).toBe(false);
  });
});

describe('isBirthdayEvent', () => {
  it('is true when eventType is "birthday", regardless of title', () => {
    expect(isBirthdayEvent('Team standup', 'birthday')).toBe(true);
  });

  it('falls back to the title heuristic when eventType is absent', () => {
    expect(isBirthdayEvent('Maria\'s Birthday', undefined)).toBe(true);
    expect(isBirthdayEvent('Team standup', undefined)).toBe(false);
  });

  it('falls back to the title heuristic when eventType is present but not "birthday"', () => {
    expect(isBirthdayEvent('Aniversário do João', 'default')).toBe(true);
    expect(isBirthdayEvent('Team standup', 'default')).toBe(false);
  });
});
