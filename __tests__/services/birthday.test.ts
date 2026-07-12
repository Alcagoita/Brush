/**
 * KAN-248 — birthday.ts: import-event birthday detection.
 */

import { textLooksLikeBirthday, isBirthdayEvent } from '../../src/services/birthday';

describe('textLooksLikeBirthday', () => {
  it('matches "birthday" case-insensitively', () => {
    expect(textLooksLikeBirthday('Sarah\'s Birthday')).toBe(true);
    expect(textLooksLikeBirthday('BIRTHDAY PARTY')).toBe(true);
    expect(textLooksLikeBirthday('john birthday')).toBe(true);
  });

  it('matches "aniversário" with or without the accent', () => {
    expect(textLooksLikeBirthday('Aniversário da Maria')).toBe(true);
    expect(textLooksLikeBirthday('aniversario do joao')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(textLooksLikeBirthday('Team standup')).toBe(false);
    expect(textLooksLikeBirthday('Dentist appointment')).toBe(false);
  });

  it('does not match empty text', () => {
    expect(textLooksLikeBirthday('')).toBe(false);
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

  it('falls back to the description heuristic when the title has no match', () => {
    expect(isBirthdayEvent('Dinner', undefined, 'Happy Birthday Maria!')).toBe(true);
    expect(isBirthdayEvent('Dinner', undefined, 'Aniversário do João')).toBe(true);
  });

  it('is false when neither title nor description match', () => {
    expect(isBirthdayEvent('Dinner', undefined, 'bring wine')).toBe(false);
  });

  it('is false when description is undefined and title has no match', () => {
    expect(isBirthdayEvent('Dinner', undefined, undefined)).toBe(false);
  });

  it('title match wins even if description does not match', () => {
    expect(isBirthdayEvent('Maria\'s Birthday', undefined, 'bring wine')).toBe(true);
  });
});
