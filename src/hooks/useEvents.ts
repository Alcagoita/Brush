import { useEffect, useState } from 'react';
import { Event, DateString } from '../types';
import {
  subscribeToAllEventDates,
  subscribeToDateEvents,
} from '../services/events';

/** Real-time events for a specific date. */
export function useEvents(userId: string | null, date: DateString) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    return subscribeToDateEvents(
      userId,
      date,
      newEvents => {
        setEvents(newEvents);
        setLoading(false);
      },
      err => {
        setError(err);
        setLoading(false);
      },
    );
  }, [userId, date]);

  return { events, loading, error };
}

/** Real-time list of all events (used to build calendar dot markers). */
export function useAllEvents(userId: string | null) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      return;
    }

    return subscribeToAllEventDates(
      userId,
      setEvents,
      err => console.warn('[useAllEvents]', err.message),
    );
  }, [userId]);

  return events;
}
