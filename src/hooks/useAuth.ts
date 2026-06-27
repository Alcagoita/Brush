import { useEffect, useState } from 'react';
import '@react-native-firebase/auth'; // ensures native module registration
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth/lib/modular';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { setCrashlyticsUser } from '../services/crashlytics';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(getAuth(), async newUser => {
      // Await the ID token before clearing `loading` so the Firestore SDK has
      // the auth token in its cache by the time any subscription fires.
      // Without this, every subscription on cold-start races the token and
      // produces a PERMISSION_DENIED warning on its first attempt.
      try {
        if (newUser) {
          await newUser.getIdToken();
        }
      } catch (err) {
        console.warn('[useAuth] getIdToken failed', err);
      }

      setCrashlyticsUser(newUser?.uid ?? null);
      setUser(newUser);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
