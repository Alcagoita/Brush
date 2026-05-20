import firestore from '@react-native-firebase/firestore';
import { Event, DateString, toDateString } from '../types';

const eventsCollection = (userId: string) =>
  firestore().collection('users').doc(userId).collection('events');

/** Real-time listener for events on a given date. Returns an unsubscribe function. */
export function subscribeToDateEvents(
  userId: string,
  date: DateString,
  onNext: (events: Event[]) => void,
  onError: (error: Error) => void,
): () => void {
  return eventsCollection(userId)
    .where('date', '==', date)
    .orderBy('startTime', 'asc')
    .onSnapshot(
      // Serve from the local cache first so the UI renders instantly,
      // then applies server updates as they arrive.
      { includeMetadataChanges: false },
      snapshot => {
        const events: Event[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Event, 'id'>),
          date: toDateString(doc.data().date as string),
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
  return eventsCollection(userId)
    .onSnapshot(
      { includeMetadataChanges: false },
      snapshot => {
        const events: Event[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Event, 'id'>),
          date: toDateString(doc.data().date as string),
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
  await eventsCollection(userId).add({
    ...event,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  await eventsCollection(userId).doc(eventId).delete();
}
