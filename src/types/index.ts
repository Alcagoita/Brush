export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  color: string;
}

export type MarkedDates = Record<string, { marked: boolean; dotColor: string }>;
