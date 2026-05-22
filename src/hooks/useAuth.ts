import { useEffect, useState } from 'react';
import '@react-native-firebase/auth'; // ensures native module registration
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth/lib/modular';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(getAuth(), newUser => {
      setUser(newUser);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
