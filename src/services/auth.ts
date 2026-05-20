import auth from '@react-native-firebase/auth';

export const signInWithEmail = (email: string, password: string) =>
  auth().signInWithEmailAndPassword(email, password);

export const signUpWithEmail = (email: string, password: string) =>
  auth().createUserWithEmailAndPassword(email, password);

export const signOut = () => auth().signOut();

export const getCurrentUser = () => auth().currentUser;
