// Side-effect import: registers the RNFBAuth native module so getAuth() works.
import '@react-native-firebase/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth/lib/modular';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In once at module load time.
// webClientId comes from the OAuth 2.0 client in google-services.json / GoogleService-Info.plist.
GoogleSignin.configure({
  webClientId: '818641166618-bh2ck6pb8eflqp1fkrps6o8bmkb5bktl.apps.googleusercontent.com',
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
