// Side-effect import: registers the RNFBAuth native module so getAuth() works.
import '@react-native-firebase/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth/lib/modular';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';

// Configure Google Sign-In once at module load time.
// webClientId comes from the OAuth 2.0 client in google-services.json / GoogleService-Info.plist.
GoogleSignin.configure({
  webClientId: '187550770253-p3bb919dl616s1phbl4dj8v1spbtk753.apps.googleusercontent.com',
});

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(getAuth(), email, password);

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(getAuth(), email, password);

export const signOut = () => firebaseSignOut(getAuth());

export const getCurrentUser = () => getAuth().currentUser;

/**
 * Sign in with Google via Firebase credential.
 * Triggers the native Google account picker, then exchanges the idToken
 * for a Firebase credential and signs in.
 */
export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const { data } = await GoogleSignin.signIn();
  const googleCredential = GoogleAuthProvider.credential(data?.idToken ?? null);
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
