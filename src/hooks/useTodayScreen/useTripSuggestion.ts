/**
 * useTripSuggestion — KAN-245
 *
 * Owns the calendar signal's lifecycle on the Today screen: fetches
 * upcoming calendar events once, runs detectCalendarSignal against known
 * areas (trip destinations + mall name — the only "known areas" with
 * human-readable names, since the ambient habitat pool has none to match
 * calendar text against) and the permanent dismissal store, and exposes
 * the single current card (or null).
 *
 * Never during the first session, and never if the calendar read fails
 * (permission denied, no calendars) — fails silent, same as every other
 * best-effort signal in this app.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchCalendarEvents } from '../../services/calendar';
import {
  detectCalendarSignal,
  getDismissedSignalIds,
  dismissSignal,
  CALENDAR_SIGNAL_LOOKAHEAD_DAYS,
} from '../../services/tripSuggestions';
import type { CalendarSuggestion } from '../../services/tripSuggestions';
import type { Trip, MallSnapshot } from '../../types';

function knownAreaNames(trips: Trip[], mallSnapshot: MallSnapshot | null): string[] {
  const names = trips.map(t => t.destination);
  if (mallSnapshot) { names.push(mallSnapshot.name); }
  return names;
}

export function useTripSuggestion(
  isFirstSession: boolean,
  trips: Trip[],
  mallSnapshot: MallSnapshot | null,
): { suggestion: CalendarSuggestion | null; dismiss: () => void } {
  const [suggestion, setSuggestion] = useState<CalendarSuggestion | null>(null);

  useEffect(() => {
    if (isFirstSession) {
      // useFirstSessionGate starts false and may resolve to true after this
      // effect already ran once and fetched a candidate — clear it so a
      // suggestion fetched during that initial false window never lingers
      // once the session is identified as the first one.
      setSuggestion(null);
      return;
    }
    let cancelled = false;

    fetchCalendarEvents(CALENDAR_SIGNAL_LOOKAHEAD_DAYS)
      .then(events => {
        if (cancelled) { return; }
        const dismissedIds = getDismissedSignalIds();
        setSuggestion(detectCalendarSignal(events, knownAreaNames(trips, mallSnapshot), dismissedIds));
      })
      .catch(() => {
        // Permission denied / no calendars / read failure — no card, no retry loop.
      });

    return () => { cancelled = true; };
  // Runs once per session (mount + when the first-session gate resolves),
  // not on every trips/mallSnapshot change — re-fetching the device
  // calendar on every Firestore refresh would be wasteful for a signal
  // that only needs to fire once anyway.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstSession]);

  const dismiss = useCallback(() => {
    if (!suggestion) { return; }
    dismissSignal(suggestion.signalId);
    setSuggestion(null);
  }, [suggestion]);

  return { suggestion, dismiss };
}
