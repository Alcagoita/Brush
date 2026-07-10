import { Platform } from 'react-native';

export function getScreenKeyboardAvoidingBehavior(
  os: 'ios' | 'android' | string = Platform.OS,
): 'padding' | undefined {
  return os === 'ios' ? 'padding' : undefined;
}
