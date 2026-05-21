import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { Event, DateString, toDateString } from '../types';

const eventsCollection = (userId: string) =>
  collection(getFirestore(), 'users', userId, 'events');

/** Real-time listener for events on a given date. Returns an unsubscribe function. */
export function subscribeToDateEvents(
  userId: string,
  date: DateString,
  onNext: (events: Event[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(
    eventsCollection(userId),
    where('date', '==', date),
    orderBy('startTime', 'asc'),
  );
  return onSnapshot(
    q,
    // Serve from the local cache first so the UI renders instantly,
    // then applies server updates as they arrive.
    { includeMetadataChanges: false },
    snapshot => {
      const events: Event[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Event, 'id'>),
        date: toDateString(d.data().date as string),
      }));
      onNext(events);
    },
    error => onError(error),
  );
}

/** Subscribe to all dates that have at least one event (for dot markers). */
export function subscribeToAllEventDates(
  userId: string,
  onNext: (events: Event[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    eventsCollection(userId),
    { includeMetadataChanges: false },
    snapshot => {
      const events: Event[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Event, 'id'>),
        date: toDateString(d.data().date as string),
      }));
      onNext(events);
    },
    error => onError(error),
  );
}

export async function addEvent(
  userId: string,
  event: Omit<Event, 'id'>,
): Promise<void> {
  await addDoc(eventsCollection(userId), {
    ...event,
    createdAt: serverTimestamp(),
  });
}

export async function deleteEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  await deleteDoc(doc(getFirestore(), 'users', userId, 'events', eventId));
}
