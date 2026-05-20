import { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return auth().onAuthStateChanged(newUser => {
      setUser(newUser);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
