import { getScreenKeyboardAvoidingBehavior } from '../../src/utils/keyboardAvoiding';

describe('getScreenKeyboardAvoidingBehavior', () => {
  it('uses padding on iOS', () => {
    expect(getScreenKeyboardAvoidingBehavior('ios')).toBe('padding');
  });

  it('uses height on Android', () => {
    expect(getScreenKeyboardAvoidingBehavior('android')).toBe('height');
  });
});
