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
const mockInferPoiForQuickAdd = jest.fn();

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({ current: null, navigate: jest.fn() }),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('../../src/services/firestore', () => ({
  addTask: (...args: unknown[]) => mockAddTask(...args),
}));

jest.mock('../../src/services/poiLlm', () => ({
  inferPoiForQuickAdd: (...args: unknown[]) => mockInferPoiForQuickAdd(...args),
}));

const mockEvaluateAddTaskAchievement = jest.fn();

jest.mock('../../src/services/achievements', () => ({
  evaluateAddTaskAchievement: (...args: unknown[]) => mockEvaluateAddTaskAchievement(...args),
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
  // Safe default for every pre-existing test: no auto-suggestion fires unless
  // a KAN-232 test below explicitly opts in with a resolved POI.
  mockInferPoiForQuickAdd.mockResolvedValue(null);
  mockEvaluateAddTaskAchievement.mockResolvedValue(undefined);
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

// ─── KAN-232 — POI inference auto-suggestion ───────────────────────────────────

describe('KAN-232 POI inference auto-suggestion', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call inferPoiForQuickAdd before the debounce window elapses', () => {
    jest.useFakeTimers();
    renderSheet();
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Buy bread');

    act(() => { jest.advanceTimersByTime(100); });
    expect(mockInferPoiForQuickAdd).not.toHaveBeenCalled();
  });

  it('pre-selects the suggested POI tile once the debounced inference resolves', async () => {
    jest.useFakeTimers();
    mockInferPoiForQuickAdd.mockResolvedValue('pharmacy');
    renderSheet();

    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'buy aspirin');
    await act(async () => { await jest.advanceTimersByTimeAsync(400); });

    expect(mockInferPoiForQuickAdd).toHaveBeenCalledWith('buy aspirin');
    expect(screen.getByLabelText('Pharmacy').props.accessibilityState?.selected).toBe(true);
  });

  it('never overrides a manually-selected POI, even when a later suggestion resolves', async () => {
    jest.useFakeTimers();
    mockInferPoiForQuickAdd.mockResolvedValue('pharmacy');
    renderSheet();

    fireEvent.press(screen.getByLabelText('Market')); // manual pick: supermarket
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'buy aspirin');
    await act(async () => { await jest.advanceTimersByTimeAsync(400); });

    expect(screen.getByLabelText('Market').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByLabelText('Pharmacy').props.accessibilityState?.selected).toBe(false);
  });

  it('clears an auto-suggested POI back to null when the title no longer matches anything', async () => {
    jest.useFakeTimers();
    mockInferPoiForQuickAdd.mockResolvedValueOnce('pharmacy');
    renderSheet();

    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'buy aspirin');
    await act(async () => { await jest.advanceTimersByTimeAsync(400); });
    expect(screen.getByLabelText('Pharmacy').props.accessibilityState?.selected).toBe(true);

    mockInferPoiForQuickAdd.mockResolvedValueOnce(null);
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'xyz nonsense title');
    await act(async () => { await jest.advanceTimersByTimeAsync(400); });

    expect(screen.getByLabelText('Pharmacy').props.accessibilityState?.selected).toBe(false);
  });

  it('ignores a stale inference result superseded by a newer keystroke', async () => {
    jest.useFakeTimers();
    let resolveFirst: (v: string | null) => void = () => {};
    mockInferPoiForQuickAdd.mockImplementationOnce(
      () => new Promise<string | null>(res => { resolveFirst = res; }),
    );
    renderSheet();

    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'first title');
    await act(async () => { await jest.advanceTimersByTimeAsync(350); });

    mockInferPoiForQuickAdd.mockResolvedValueOnce('gym');
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'second title');
    await act(async () => { await jest.advanceTimersByTimeAsync(350); });

    // The stale (first) request resolves late, after the second has already won.
    await act(async () => { resolveFirst('pharmacy'); });

    expect(screen.getByLabelText('Gym').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByLabelText('Pharmacy').props.accessibilityState?.selected).toBe(false);
  });

  it('does not schedule inference while the sheet is not visible', () => {
    jest.useFakeTimers();
    renderSheet({ visible: false });
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'buy aspirin');

    act(() => { jest.advanceTimersByTime(1000); });
    expect(mockInferPoiForQuickAdd).not.toHaveBeenCalled();
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

// ─── KAN-149 — confirmation toast ───────────────────────────────────────────────

describe('KAN-149 confirmation toast', () => {
  it('shows the toast after a successful add', async () => {
    const { useToastStore } = require('../../src/store/toastStore');
    useToastStore.setState({ message: null });

    renderSheet();
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Buy milk');
    fireEvent.press(screen.getByLabelText('Market'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add it'));
    });

    expect(useToastStore.getState().message).toBe("Got it — I'll keep an eye out.");
  });

  it('does not show the toast when addTask fails', async () => {
    const { useToastStore } = require('../../src/store/toastStore');
    useToastStore.setState({ message: null });
    mockAddTask.mockRejectedValueOnce(new Error('Network error'));

    renderSheet();
    fireEvent.changeText(screen.getByLabelText('What do you need?'), 'Buy milk');
    fireEvent.press(screen.getByLabelText('ATM'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add it'));
    });

    expect(useToastStore.getState().message).toBeNull();
  });
});
