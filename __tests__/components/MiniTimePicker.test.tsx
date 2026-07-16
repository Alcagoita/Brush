import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MiniTimePicker from '../../src/components/MiniTimePicker';

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      surface: '#f6f5f1',
      line:    '#ddd',
      muted:   '#999',
      text:    '#111',
      accent:  '#e8a86a',
      onAccent: '#fff',
    },
  }),
}));

function mockHour12(hour12: boolean) {
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(((..._args: ConstructorParameters<typeof Intl.DateTimeFormat>) => ({
    resolvedOptions: () => ({ hour12 }),
  })) as unknown as typeof Intl.DateTimeFormat);
}

describe('MiniTimePicker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a 24-hour column when the device prefers 24h', () => {
    mockHour12(false);
    render(<MiniTimePicker value="09:30" onChange={jest.fn()} />);
    expect(screen.getByTestId('time-hour24-9')).toBeTruthy();
    expect(screen.getByTestId('time-hour24-23')).toBeTruthy();
    expect(screen.queryByTestId('time-meridiem-AM')).toBeNull();
  });

  it('renders 12-hour columns with AM/PM when the device prefers 12h', () => {
    mockHour12(true);
    render(<MiniTimePicker value="14:00" onChange={jest.fn()} />);
    expect(screen.getByTestId('time-hour12-2')).toBeTruthy();
    expect(screen.getByTestId('time-meridiem-AM')).toBeTruthy();
    expect(screen.getByTestId('time-meridiem-PM')).toBeTruthy();
    expect(screen.queryByTestId('time-hour24-14')).toBeNull();
  });

  it('selecting an hour in 24h mode calls onChange with the new hour, keeping the minute', () => {
    mockHour12(false);
    const onChange = jest.fn();
    render(<MiniTimePicker value="09:30" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('time-hour24-14'));
    expect(onChange).toHaveBeenCalledWith('14:30');
  });

  it('selecting a minute calls onChange with the new minute, keeping the hour', () => {
    mockHour12(false);
    const onChange = jest.fn();
    render(<MiniTimePicker value="09:30" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('time-minute-45'));
    expect(onChange).toHaveBeenCalledWith('09:45');
  });

  it('in 12h mode, selecting PM converts the stored 24h value correctly', () => {
    mockHour12(true);
    const onChange = jest.fn();
    // 09:15 -> 9 AM. Switching to PM should produce 21:15.
    render(<MiniTimePicker value="09:15" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('time-meridiem-PM'));
    expect(onChange).toHaveBeenCalledWith('21:15');
  });

  it('in 12h mode, selecting hour 12 with AM maps to 00 (midnight), not 12', () => {
    mockHour12(true);
    const onChange = jest.fn();
    render(<MiniTimePicker value="01:00" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('time-hour12-12'));
    expect(onChange).toHaveBeenCalledWith('00:00');
  });

  it('defaults to the current hour and :00 when value is null', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T09:00:00'));
    try {
      mockHour12(false);
      const onChange = jest.fn();
      render(<MiniTimePicker value={null} onChange={onChange} />);
      const nowHour = new Date().getHours();
      expect(screen.getByTestId(`time-hour24-${nowHour}`)).toBeTruthy();
      fireEvent.press(screen.getByTestId('time-minute-5'));
      expect(onChange).toHaveBeenCalledWith(`${String(nowHour).padStart(2, '0')}:05`);
    } finally {
      jest.useRealTimers();
    }
  });
});
