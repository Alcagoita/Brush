/**
 * KAN-514 — the mall Nearby card: the centre, a row per task with the place
 * and its floor (never a distance), and "Try another place" per row.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightPalette, darkPalette } from '../../src/theme/tokens';

jest.mock('../../src/theme', () => ({
  useTheme: () => ({ palette: jest.requireActual('../../src/theme/tokens').lightPalette }),
}));
jest.mock('../../src/components/AppIcon', () => ({ PoiIcon: () => null }));

import MallNearbyCard from '../../src/components/MallNearbyCard';
import type { MallRow } from '../../src/services/mallSuggestions';
import type { Task } from '../../src/types';

function task(id: string, title: string, poi: string): Task {
  return { id, title, poi, category: 'errands', done: false, date: '2026-11-14', createdAt: {} } as unknown as Task;
}

const ROWS: MallRow[] = [
  {
    task: task('coffee', 'Coffee beans', 'cafe'),
    candidates: [{ key: 'unit:pans', name: 'Café Pans', floors: ['0'], poiType: 'cafe' }],
  },
  {
    task: task('shirt', 'Buy a white shirt', 'store'),
    candidates: [
      { key: 'brand:Zara', name: 'Zara', floors: ['1'], poiType: 'store' },
      { key: 'brand:Mango', name: 'Mango', floors: ['2'], poiType: 'store' },
    ],
  },
  {
    task: task('acai', 'Açaí bowl', 'restaurant'),
    candidates: [{ key: 'brand:OAKBERRY', name: 'OAKBERRY', floors: ['0', '2'], poiType: 'restaurant' }],
  },
  {
    task: task('snack', 'Snack', 'cafe'),
    candidates: [{ key: 'unit:kiosk', name: 'Kiosk', floors: [], poiType: 'cafe' }],
  },
];

describe('MallNearbyCard', () => {
  it('shows the centre, the count, and each place with its floor — no distance anywhere', () => {
    render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);

    expect(screen.getByText("While you're at Alma Shopping")).toBeTruthy();
    expect(screen.getByText('4 waiting here')).toBeTruthy();
    expect(screen.getByText('Café Pans · Floor 0')).toBeTruthy();
    expect(screen.getByText('Zara · Floor 1')).toBeTruthy();
    expect(screen.getByText('OAKBERRY · Floors 0 and 2')).toBeTruthy();
    expect(screen.getByText('Kiosk')).toBeTruthy();
    expect(screen.queryByText(/\d+\s?(m|km)\b/)).toBeNull();
  });

  it('offers "Try another place" only on a row with two or more places', () => {
    render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);
    expect(screen.getAllByText('Try another place')).toHaveLength(1);
    expect(screen.getByLabelText('Try another place for Buy a white shirt')).toBeTruthy();
  });

  it('swaps only that row, and wraps after the last place', () => {
    render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);
    const button = screen.getByLabelText('Try another place for Buy a white shirt');

    fireEvent.press(button);
    expect(screen.getByText('Mango · Floor 2')).toBeTruthy();
    expect(screen.queryByText('Zara · Floor 1')).toBeNull();
    expect(screen.getByText('Café Pans · Floor 0')).toBeTruthy();

    fireEvent.press(button);
    expect(screen.getByText('Zara · Floor 1')).toBeTruthy();
  });

  it('starts over on a new entry (remount)', () => {
    const { unmount } = render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);
    fireEvent.press(screen.getByLabelText('Try another place for Buy a white shirt'));
    unmount();

    render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);
    expect(screen.getByText('Zara · Floor 1')).toBeTruthy();
  });

  it('renders nothing, and says so, when the centre solves no open task', () => {
    const onHasContent = jest.fn();
    render(<MallNearbyCard centreName="Alma Shopping" rows={[]} onHasContent={onHasContent} />);
    expect(screen.queryByTestId('mall-nearby-card')).toBeNull();
    expect(onHasContent).toHaveBeenLastCalledWith(false);
  });

  it('defines its own colours in both themes', () => {
    for (const palette of [lightPalette, darkPalette]) {
      for (const token of ['mallTint', 'mallTint2', 'mallBorder', 'mallText', 'mallAccent'] as const) {
        expect(palette[token]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
    expect(lightPalette.mallTint).not.toBe(lightPalette.nearTint);
  });
});
