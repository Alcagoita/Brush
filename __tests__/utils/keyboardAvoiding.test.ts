import { getScreenKeyboardAvoidingBehavior } from '../../src/utils/keyboardAvoiding';

describe('getScreenKeyboardAvoidingBehavior', () => {
  it('uses padding on iOS', () => {
    expect(getScreenKeyboardAvoidingBehavior('ios')).toBe('padding');
  });

  it('returns undefined on Android — native windowSoftInputMode="adjustResize" already handles it; a KeyboardAvoidingView behavior on top double-compensates', () => {
    expect(getScreenKeyboardAvoidingBehavior('android')).toBeUndefined();
  });

  it('returns undefined for an unrecognized platform string', () => {
    expect(getScreenKeyboardAvoidingBehavior('windows')).toBeUndefined();
  });
});
