/**
 * KAN-514 — the mall Nearby card: the centre, a row per task with the place
 * and its floor (never a distance), and "Try another place" per row.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { lightPalette, darkPalette } from '../../src/theme/tokens';

/** WCAG 2 contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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

  it('keeps the chosen place when the candidates are rebuilt around it', () => {
    const { rerender } = render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);
    fireEvent.press(screen.getByLabelText('Try another place for Buy a white shirt'));
    expect(screen.getByText('Mango · Floor 2')).toBeTruthy();

    // An inventory update adds a place before the chosen one.
    const rebuilt = ROWS.map(row => row.task.id !== 'shirt' ? row : {
      ...row,
      candidates: [{ key: 'brand:Bershka', name: 'Bershka', floors: ['0'], poiType: 'store' }, ...row.candidates],
    });
    rerender(<MallNearbyCard centreName="Alma Shopping" rows={rebuilt} />);

    expect(screen.getByText('Mango · Floor 2')).toBeTruthy();
    expect(screen.queryByText('Bershka · Floor 0')).toBeNull();
  });

  it('falls back to the first place when the chosen one is no longer offered', () => {
    const { rerender } = render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);
    fireEvent.press(screen.getByLabelText('Try another place for Buy a white shirt'));

    const withoutMango = ROWS.map(row => row.task.id !== 'shirt' ? row : {
      ...row,
      candidates: row.candidates.filter(c => c.key !== 'brand:Mango'),
    });
    rerender(<MallNearbyCard centreName="Alma Shopping" rows={withoutMango} />);

    expect(screen.getByText('Zara · Floor 1')).toBeTruthy();
  });

  it('gives "Try another place" a 44×44 touch target', () => {
    render(<MallNearbyCard centreName="Alma Shopping" rows={ROWS} />);
    const style = StyleSheet.flatten(screen.getByLabelText('Try another place for Buy a white shirt').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
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

  it('keeps small text readable: ≥ 4.5:1 on both tints, in both themes', () => {
    for (const palette of [lightPalette, darkPalette]) {
      for (const tint of [palette.mallTint, palette.mallTint2]) {
        expect(contrast(palette.mallAccent, tint)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.mallText, tint)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
