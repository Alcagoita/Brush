// Side-effect import: registers the RNFBAuth native module so getAuth() works.
import '@react-native-firebase/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth/lib/modular';

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(getAuth(), email, password);

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(getAuth(), email, password);

export const signOut = () => firebaseSignOut(getAuth());

export const getCurrentUser = () => getAuth().currentUser;
