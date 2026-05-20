import { Event, toDateString } from '../types';

function getTodayString() {
  return toDateString(new Date().toISOString().split('T')[0]);
}

function getOffsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateString(d.toISOString().split('T')[0]);
}

export const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Team Standup',
    description: 'Daily sync with the engineering team',
    date: getTodayString(),
    startTime: '09:00',
    endTime: '09:30',
    color: '#6366f1',
  },
  {
    id: '2',
    title: 'Design Review',
    description: 'Review new UI mockups for Agenda',
    date: getTodayString(),
    startTime: '11:00',
    endTime: '12:00',
    color: '#0f9b8e',
  },
  {
    id: '3',
    title: 'Lunch with Sara',
    date: getTodayString(),
    startTime: '13:00',
    endTime: '14:00',
    color: '#f59e0b',
  },
  {
    id: '4',
    title: 'Sprint Planning',
    description: 'Plan tasks for the upcoming sprint',
    date: getOffsetDate(1),
    startTime: '10:00',
    endTime: '11:30',
    color: '#e94560',
  },
  {
    id: '5',
    title: 'Doctor Appointment',
    date: getOffsetDate(3),
    startTime: '15:00',
    endTime: '16:00',
    color: '#10b981',
  },
];
