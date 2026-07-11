import { addDoc, Timestamp } from '@react-native-firebase/firestore';
import { poiInferenceMissesRef } from './refs';

/**
 * Record a phrase whose local POI inference returned no suggestion.
 *
 * The document intentionally stores only the failed sentence plus timestamp so
 * we can improve the offline dictionary without retaining user identifiers in
 * the payload itself.
 */
export async function logPoiInferenceMiss(uid: string, sentence: string): Promise<void> {
  const trimmed = sentence.trim().slice(0, 200);
  if (!uid || trimmed.length === 0) { return; }

  await addDoc(poiInferenceMissesRef(uid), {
    sentence: trimmed,
    createdAt: Timestamp.now(),
  });
}
