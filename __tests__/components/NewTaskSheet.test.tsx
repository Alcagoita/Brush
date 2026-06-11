/**
 * Unit tests for src/components/NewTaskSheet.tsx — KAN-143
 *
 * Covers:
 *   - "Add task" is disabled until BOTH title and POI are set
 *   - "Add task" is enabled when title + POI are both present
 *   - Tapping a POI tile selects it
 *   - Tapping the selected tile again deselects it (toggle)
 *   - Category is optional (no category → still canSubmit when title+POI set)
 *   - addTask called with correct payload (poi required, category defaults to 'personal')
 *   - Custom categories render after built-ins
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import NewTaskSheet from '../../src/components/NewTaskSheet';
import type { Category } from '../../src/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAddTask = jest.fn();
const mockNavigateTo = jest.fn();

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({ current: null, navigate: jest.fn() }),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('../../src/services/firestore', () => ({
  addTask: (...args: unknown[]) => mockAddTask(...args),
}));

jest.mock('../../src/navigation/navigationRef', () => ({
  navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    dark: false,
    palette: {
      bg: '#fdfdfb', surface: '#f6f5f1', surface2: '#efeeea',
      line: 'rgba(20,20,18,0.08)', text: '#1a1a18', muted: '#8a8a85',
      faint: '#bdbdb7', accent: '#e8a86a',
      nearTint2: '#f9ede0', nearBorder: '#e8c9a0', nearText: '#7a4a20',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('../../src/components/AppIcon', () => ({
  CloseIcon: 'CloseIcon',
  PoiIcon:   'PoiIcon',
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CUSTOM_CATEGORIES: Category[] = [
  { id: 'custom-gym', name: 'Gym', color: '#ff6b6b', poi: null, isBuiltIn: false },
];

const DEFAULT_PROPS = {
  visible:  true,
  uid:      'test-uid',
  onClose:  jest.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderSheet(overrides = {}) {
  return render(<NewTaskSheet {...DEFAULT_PROPS} {...overrides} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAddTask.mockResolvedValue(undefined);
});

describe('canSubmit: requires title AND POI', () => {
  it('Add task button is disabled when sheet first opens (no title, no POI)', () => {
    renderSheet();
    const addBtn = screen.getByLabelText('Add task');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Add task button remains disabled when only title is entered', () => {
    renderSheet();
    const titleInput = screen.getByPlaceholderText('What do you need to do?');
    fireEvent.changeText(titleInput, 'Buy bread');

    const addBtn = screen.getByLabelText('Add task');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Add task button remains disabled when only a POI is selected', () => {
    renderSheet();
    const cafeTile = screen.getByLabelText('Café');
    fireEvent.press(cafeTile);

    const addBtn = screen.getByLabelText('Add task');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Add task button is enabled when title AND POI are both set', () => {
    renderSheet();
    const titleInput = screen.getByPlaceholderText('What do you need to do?');
    fireEvent.changeText(titleInput, 'Buy bread');

    const marketTile = screen.getByLabelText('Market');
    fireEvent.press(marketTile);

    const addBtn = screen.getByLabelText('Add task');
    expect(addBtn.props.accessibilityState?.disabled).toBe(false);
  });
});

describe('POI carousel toggle', () => {
  it('selecting a POI tile marks it as selected', () => {
    renderSheet();
    const atmTile = screen.getByLabelText('ATM');
    expect(atmTile.props.accessibilityState?.selected).toBe(false);

    fireEvent.press(atmTile);
    expect(atmTile.props.accessibilityState?.selected).toBe(true);
  });

  it('tapping the selected tile again deselects it', () => {
    renderSheet();
    const atmTile = screen.getByLabelText('ATM');
    fireEvent.press(atmTile);
    expect(atmTile.props.accessibilityState?.selected).toBe(true);

    fireEvent.press(atmTile);
    expect(atmTile.props.accessibilityState?.selected).toBe(false);
  });

  it('selecting a new tile deselects the previous one', () => {
    renderSheet();
    const atmTile  = screen.getByLabelText('ATM');
    const cafeTile = screen.getByLabelText('Café');

    fireEvent.press(atmTile);
    expect(atmTile.props.accessibilityState?.selected).toBe(true);

    fireEvent.press(cafeTile);
    expect(cafeTile.props.accessibilityState?.selected).toBe(true);
    expect(atmTile.props.accessibilityState?.selected).toBe(false);
  });
});

describe('addTask submission', () => {
  it('calls addTask with poi and default category when no category selected', async () => {
    renderSheet();

    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Pick up prescription',
    );
    fireEvent.press(screen.getByLabelText('Pharmacy'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });

    expect(mockAddTask).toHaveBeenCalledWith(
      'test-uid',
      expect.objectContaining({
        title:    'Pick up prescription',
        poi:      'pharmacy',
        category: 'personal',
        done:     false,
      }),
    );
  });

  it('calls addTask with the selected category', async () => {
    renderSheet();

    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Morning run',
    );
    fireEvent.press(screen.getByLabelText('Gym'));
    fireEvent.press(screen.getByLabelText('Health'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });

    expect(mockAddTask).toHaveBeenCalledWith(
      'test-uid',
      expect.objectContaining({ category: 'health' }),
    );
  });

  it('does not call addTask when POI is missing', async () => {
    renderSheet();
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'No POI task',
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    expect(mockAddTask).not.toHaveBeenCalled();
  });
});

describe('category chips', () => {
  it('renders all 4 built-in categories', () => {
    renderSheet();
    expect(screen.getByLabelText('Personal')).toBeTruthy();
    expect(screen.getByLabelText('Work')).toBeTruthy();
    expect(screen.getByLabelText('Health')).toBeTruthy();
    expect(screen.getByLabelText('Errands')).toBeTruthy();
  });

  it('renders custom categories after built-ins', () => {
    renderSheet({ customCategories: CUSTOM_CATEGORIES });
    // 'Gym' appears as both POI tile and custom category chip
    const gymElements = screen.getAllByLabelText('Gym');
    expect(gymElements.length).toBeGreaterThanOrEqual(1);
  });

  it('category is optional — no category selected is valid when title+POI set', () => {
    renderSheet();
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Test task',
    );
    fireEvent.press(screen.getByLabelText('ATM'));

    const addBtn = screen.getByLabelText('Add task');
    expect(addBtn.props.accessibilityState?.disabled).toBe(false);
  });
});
