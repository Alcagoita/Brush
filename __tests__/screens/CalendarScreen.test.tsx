import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import CalendarScreen from '../../src/screens/CalendarScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Today: 2026-05-20 — May 28 has no mock events and needs no navigation
const TODAY = '2026-05-20';
const EMPTY_DAY = '2026-05-28';

describe('CalendarScreen', () => {
  it('renders the app header title', () => {
    render(<CalendarScreen />);
    expect(screen.getByText('Agenda')).toBeTruthy();
  });

  it('renders the calendar header', () => {
    render(<CalendarScreen />);
    expect(screen.getByTestId('calendar.header')).toBeTruthy();
  });

  it('shows "Today" label when current day is selected by default', () => {
    render(<CalendarScreen />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders the FAB add button', () => {
    render(<CalendarScreen />);
    expect(screen.getByText('+')).toBeTruthy();
  });

  it('FAB has correct accessibility label and role', () => {
    render(<CalendarScreen />);
    expect(screen.getByRole('button', { name: 'Add new event' })).toBeTruthy();
  });

  it('shows events for today on initial load', () => {
    render(<CalendarScreen />);
    expect(screen.getByText('Team Standup')).toBeTruthy();
    expect(screen.getByText('Design Review')).toBeTruthy();
    expect(screen.getByText('Lunch with Sara')).toBeTruthy();
  });

  it('shows event times correctly', () => {
    render(<CalendarScreen />);
    expect(screen.getByText('09:00 — 09:30')).toBeTruthy();
    expect(screen.getByText('11:00 — 12:00')).toBeTruthy();
  });

  it('shows events sorted by start time', () => {
    render(<CalendarScreen />);
    const times = screen
      .getAllByText(/^\d{2}:\d{2} — \d{2}:\d{2}$/)
      .map(el => el.props.children as string);
    const sorted = [...times].sort();
    expect(times).toEqual(sorted);
  });

  it('shows empty state with date context when a day with no events is selected', () => {
    render(<CalendarScreen />);
    fireEvent.press(screen.getByTestId(`calendar.day_${EMPTY_DAY}`));
    expect(screen.getByText('No events for May 28')).toBeTruthy();
  });

  it('updates the event list when a different day is selected', () => {
    render(<CalendarScreen />);
    expect(screen.getByText('Team Standup')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`calendar.day_${EMPTY_DAY}`));
    expect(screen.queryByText('Team Standup')).toBeNull();
  });

  it('shows today\'s date label as "Today"', () => {
    render(<CalendarScreen />);
    fireEvent.press(screen.getByTestId(`calendar.day_${TODAY}`));
    expect(screen.getByText('Today')).toBeTruthy();
  });
});
