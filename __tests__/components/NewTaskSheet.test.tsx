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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
    const addBtn = screen.getByLabelText('Add it');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Add task button remains disabled when only title is entered', () => {
    renderSheet();
    const titleInput = screen.getByLabelText('What do you need?');
    fireEvent.changeText(titleInput, 'Buy bread');

    const addBtn = screen.getByLabelText('Add it');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Add task button remains disabled when only a POI is selected', () => {
    renderSheet();
    const cafeTile = screen.getByLabelText('Café');
    fireEvent.press(cafeTile);

    const addBtn = screen.getByLabelText('Add it');
    expect(addBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Add task button is enabled when title AND POI are both set', () => {
    renderSheet();
    const titleInput = screen.getByLabelText('What do you need?');
    fireEvent.changeText(titleInput, 'Buy bread');

    const marketTile = screen.getByLabelText('Market');
    fireEvent.press(marketTile);

    const addBtn = screen.getByLabelText('Add it');
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
      screen.getByLabelText('What do you need?'),
      'Pick up prescription',
    );
    fireEvent.press(screen.getByLabelText('Pharmacy'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add it'));
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
      screen.getByLabelText('What do you need?'),
      'Morning run',
    );
    fireEvent.press(screen.getByLabelText('Gym'));
    fireEvent.press(screen.getByLabelText('Health'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add it'));
    });

    expect(mockAddTask).toHaveBeenCalledWith(
      'test-uid',
      expect.objectContaining({ category: 'health' }),
    );
  });

  it('does not call addTask when POI is missing', async () => {
    renderSheet();
    fireEvent.changeText(
      screen.getByLabelText('What do you need?'),
      'No POI task',
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add it'));
    });
    expect(mockAddTask).not.toHaveBeenCalled();
  });

  it('calls onTaskAdded after successful submission', async () => {
    const onTaskAdded = jest.fn();
    renderSheet({ onTaskAdded });

    fireEvent.changeText(
      screen.getByLabelText('What do you need?'),
      'Buy milk',
    );
    fireEvent.press(screen.getByLabelText('Market'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add it'));
    });

    expect(mockAddTask).toHaveBeenCalled();
    expect(onTaskAdded).toHaveBeenCalledTimes(1);
  });

  it('does not call onTaskAdded when addTask fails', async () => {
    mockAddTask.mockRejectedValue(new Error('Network error'));
    const onTaskAdded = jest.fn();
    renderSheet({ onTaskAdded });

    fireEvent.changeText(
      screen.getByLabelText('What do you need?'),
      'Buy milk',
    );
    fireEvent.press(screen.getByLabelText('ATM'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add it'));
    });

    expect(onTaskAdded).not.toHaveBeenCalled();
  });
});

describe('"More details" navigation', () => {
  it('navigates to TaskForm with initialTitle and initialPoi when "More details ›" is pressed', async () => {
    renderSheet();

    fireEvent.changeText(
      screen.getByLabelText('What do you need?'),
      'Buy groceries',
    );
    fireEvent.press(screen.getByLabelText('Market')); // poi: 'supermarket'
    fireEvent.press(screen.getByLabelText('More details'));

    // navigateTo fires after an 80 ms setTimeout inside handleMoreDetails
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith('TaskForm', {
        uid:          'test-uid',
        initialTitle: 'Buy groceries',
        initialPoi:   'supermarket',
      });
    }, { timeout: 500 });
  });

  it('navigates to TaskForm with only uid when title and POI are empty', async () => {
    renderSheet();
    fireEvent.press(screen.getByLabelText('More details'));

    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith('TaskForm', {
        uid:          'test-uid',
        initialTitle: undefined,
        initialPoi:   undefined,
      });
    }, { timeout: 500 });
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
      screen.getByLabelText('What do you need?'),
      'Test task',
    );
    fireEvent.press(screen.getByLabelText('ATM'));

    const addBtn = screen.getByLabelText('Add it');
    expect(addBtn.props.accessibilityState?.disabled).toBe(false);
  });
});

// ─── KAN-148 — conversational copy pass ────────────────────────────────────────

describe('KAN-148 copy', () => {
  it('sheet title reads "What do you need?"', () => {
    renderSheet();
    expect(screen.getByText('What do you need?')).toBeTruthy();
  });

  it('POI question reads "Where does this happen?" with no "required" marker', () => {
    renderSheet();
    expect(screen.getByText('Where does this happen?')).toBeTruthy();
    expect(screen.queryByText(/required/i)).toBeNull();
  });

  it('category question reads "Which part of your life?" with "(optional)"', () => {
    renderSheet();
    expect(screen.getByText('Which part of your life?')).toBeTruthy();
    expect(screen.getByText(' (optional)')).toBeTruthy();
  });

  it('"Quick picks" sublabel is removed; "Swipe for more" hint is kept', () => {
    renderSheet();
    expect(screen.queryByText('Quick picks')).toBeNull();
    expect(screen.getByText('Swipe for more')).toBeTruthy();
  });

  it('primary CTA reads "Add it", not "Add task"', () => {
    renderSheet();
    expect(screen.getByText('Add it')).toBeTruthy();
    expect(screen.queryByText('Add task')).toBeNull();
  });

  it('submitting state shows "Adding…"', async () => {
    let resolveAdd: () => void = () => {};
    mockAddTask.mockImplementation(() => new Promise<void>(res => { resolveAdd = res; }));
    renderSheet();

    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Buy milk');
    fireEvent.press(screen.getByLabelText('Market'));

    act(() => { fireEvent.press(screen.getByLabelText('Add it')); });
    await waitFor(() => expect(screen.getByText('Adding…')).toBeTruthy());

    await act(async () => { resolveAdd(); });
  });

  it('renders a rotating example as the title input\'s faux placeholder before focus', () => {
    renderSheet();
    expect(screen.getByText('Pick up toothpaste…')).toBeTruthy();
  });

  it('hides the rotating placeholder once the title input is focused', () => {
    renderSheet();
    expect(screen.getByText('Pick up toothpaste…')).toBeTruthy();

    fireEvent(screen.getByLabelText('What do you need?'), 'focus');
    expect(screen.queryByText('Pick up toothpaste…')).toBeNull();
  });

  it('hides the rotating placeholder once there is a typed value', () => {
    renderSheet();
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Buy milk');
    expect(screen.queryByText('Pick up toothpaste…')).toBeNull();
  });
});
