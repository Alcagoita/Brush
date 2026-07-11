import { Platform } from 'react-native';

export function getScreenKeyboardAvoidingBehavior(
  os: 'ios' | 'android' | string = Platform.OS,
): 'padding' | 'height' | undefined {
  if (os === 'ios') { return 'padding'; }
  if (os === 'android') { return 'height'; }
  return undefined;
}
