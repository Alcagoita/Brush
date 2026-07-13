import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';

let appCheckInitPromise: Promise<void> | null = null;

export function ensureAppCheckInitialized(): Promise<void> {
  if (appCheckInitPromise) {
    return appCheckInitPromise;
  }

  appCheckInitPromise = (async () => {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
      },
    });

    await initializeAppCheck(undefined, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  })().catch(error => {
    appCheckInitPromise = null;
    throw error;
  });

  return appCheckInitPromise;
}
