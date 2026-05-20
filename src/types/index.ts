// Branded type to prevent accidental use of arbitrary strings as dates.
// Always use toDateString() / fromDateString() helpers to construct values.
export type DateString = string & { readonly __brand: 'DateString' };

export function toDateString(value: string): DateString {
  return value as DateString;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: DateString; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  color: string;
}

export type MarkedDates = Record<DateString, { marked: boolean; dotColor: string }>;
