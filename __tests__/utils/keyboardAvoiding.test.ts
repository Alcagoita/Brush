import { getScreenKeyboardAvoidingBehavior } from '../../src/utils/keyboardAvoiding';

describe('getScreenKeyboardAvoidingBehavior', () => {
  it('uses padding on iOS', () => {
    expect(getScreenKeyboardAvoidingBehavior('ios')).toBe('padding');
  });

  it('disables explicit keyboard avoiding behavior on Android', () => {
    expect(getScreenKeyboardAvoidingBehavior('android')).toBeUndefined();
  });
});
