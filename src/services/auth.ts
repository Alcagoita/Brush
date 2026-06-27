// Side-effect import: registers the RNFBAuth native module so getAuth() works.
import '@react-native-firebase/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithCredential,
} from '@react-native-firebase/auth/lib/modular';
import { GoogleAuthProvider, OAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GOOGLE_OAUTH_WEB_CLIENT_ID } from '../config/keys';

// Scopes added in KAN-84: tasks.readonly and calendar.readonly for the import connectors.
GoogleSignin.configure({
  webClientId: GOOGLE_OAUTH_WEB_CLIENT_ID,
  scopes: [
    'https://www.googleapis.com/auth/tasks.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
});

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(getAuth(), email, password);

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(getAuth(), email, password);

export const signOut = () => firebaseSignOut(getAuth());

/**
 * Full logout flow (KAN-20):
 *  1. Stop the proximity monitoring engine so geofence callbacks don't fire
 *     after the user's uid is no longer valid.
 *  2. Sign out of Firebase Auth — onAuthStateChanged fires with null, and
 *     AppShell swaps to LoginScreen automatically. No explicit navigation needed.
 *
 * Import lazily to avoid a circular-dependency: auth ← proximity ← firestore ← auth.
 */
export async function logout(): Promise<void> {
  // Lazy require so Jest (CommonJS) and Metro (ESM) both resolve correctly,
  // and to avoid a potential circular-dependency at module load time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resetProximityState } = require('./proximity') as typeof import('./proximity');
  resetProximityState();
  await firebaseSignOut(getAuth());
}

export const getCurrentUser = () => getAuth().currentUser;

/**
 * Sign in with Google via Firebase credential.
 * Triggers the native Google account picker, then exchanges the idToken
 * for a Firebase credential and signs in.
 */
export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success' || !response.data.idToken) {
    const err = new Error('SIGN_IN_CANCELLED') as any;
    err.code = 'SIGN_IN_CANCELLED';
    throw err;
  }
  const googleCredential = GoogleAuthProvider.credential(response.data.idToken);
  return signInWithCredential(getAuth(), googleCredential);
};

/**
 * Sign in with Apple ID via Firebase credential (iOS only).
 * Requests the user's full name and email, then exchanges the identity token
 * for a Firebase OAuthProvider credential and signs in.
 */
export const signInWithApple = async () => {
  const appleAuthRequest = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });

  if (!appleAuthRequest.identityToken) {
    throw new Error('Apple sign-in failed — no identity token returned.');
  }

  const provider = new OAuthProvider('apple.com');
  const appleCredential = provider.credential({
    idToken: appleAuthRequest.identityToken,
    rawNonce: appleAuthRequest.nonce,
  });

  return signInWithCredential(getAuth(), appleCredential);
};
