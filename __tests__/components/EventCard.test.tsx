import { render, screen } from '@testing-library/react-native';
import React from 'react';
import EventCard from '../../src/components/EventCard';
import { Event } from '../../src/types';

const mockEvent: Event = {
  id: '1',
  title: 'Team Standup',
  description: 'Daily sync with the engineering team',
  date: '2026-05-20',
  startTime: '09:00',
  endTime: '09:30',
  color: '#6366f1',
};

describe('EventCard', () => {
  it('renders the event title', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('Team Standup')).toBeTruthy();
  });

  it('renders the event description when provided', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('Daily sync with the engineering team')).toBeTruthy();
  });

  it('renders the time range', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('09:00 — 09:30')).toBeTruthy();
  });

  it('does not render description when not provided', () => {
    const eventWithoutDescription: Event = { ...mockEvent, description: undefined };
    render(<EventCard event={eventWithoutDescription} />);
    expect(screen.queryByText('Daily sync with the engineering team')).toBeNull();
  });
});
