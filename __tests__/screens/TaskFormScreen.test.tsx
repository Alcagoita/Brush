/**
 * Unit tests for src/screens/TaskFormScreen.tsx — KAN-143
 *
 * Covers:
 *   - Render: create mode (heading, POI grid, category pills, helper text)
 *   - Render: edit mode (pre-populated title, "Save changes" label)
 *   - canSubmit: button disabled until title + POI both provided
 *   - POI quick-pick: selecting/deselecting tiles
 *   - Save (create): calls addTask with correct payload, navigates back
 *   - Save (edit): calls updateTask, navigates back
 *   - Delete: edit mode only, requires Alert confirmation
 *   - Go back: calls navigation.goBack
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TaskFormScreen from '../../src/screens/TaskFormScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAddTask               = jest.fn();
const mockUpdateTask            = jest.fn();
const mockDeleteTask            = jest.fn();
const mockAddCategory           = jest.fn();
const mockSubscribeToCategories = jest.fn(() => jest.fn());
const mockGoBack                = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  addTask:               jest.fn((...args: unknown[]) => mockAddTask(...args)),
  updateTask:            jest.fn((...args: unknown[]) => mockUpdateTask(...args)),
  deleteTask:            jest.fn((...args: unknown[]) => mockDeleteTask(...args)),
  addCategory:           jest.fn((...args: unknown[]) => mockAddCategory(...args)),
  subscribeToCategories: jest.fn((...args: unknown[]) => mockSubscribeToCategories(...args)),
}));

// CategoriesScreen exports CATEGORY_COLORS — provide a stub so the import resolves
jest.mock('../../src/screens/CategoriesScreen', () => ({
  CATEGORY_COLORS: ['#d4855a', '#e8a86a', '#5ba87a', '#5b7fd4', '#8b6bc4'],
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute:      () => ({ params: mockRouteParams }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    dark: false,
    palette: {
      bg:         '#fdfdfb',
      surface:    '#f6f5f1',
      surface2:   '#efeeea',
      line:       'rgba(20,20,18,0.08)',
      text:       '#1a1a18',
      muted:      '#8a8a85',
      faint:      '#bdbdb7',
      accent:     '#e8a86a',
      nearTint:   '#fdf7f0',
      nearTint2:  '#f9ede0',
      nearBorder: '#e8c9a0',
      nearText:   '#7a4a20',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (props: any) => React.createElement(View, props);
  return {
    CalendarIcon: stub,
    ClockIcon:    stub,
    CloseIcon:    stub,
    PoiIcon:      stub,
  };
});

// ─── Route params helper ──────────────────────────────────────────────────────

type RouteParams = {
  uid: string;
  task?: any;
  initialDate?: string;
  initialTitle?: string;
  initialPoi?: string;
};

let mockRouteParams: RouteParams = { uid: 'user-123' };

function setRouteParams(params: RouteParams) {
  mockRouteParams = params;
}

// ─── Task factory ─────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<any> = {}) {
  return {
    id:        'task-1',
    title:     'Buy milk',
    category:  'errands',
    done:      false,
    poi:       'supermarket',
    date:      '2026-06-03',
    createdAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscribeToCategories.mockReturnValue(jest.fn()); // unsubscribe no-op
  setRouteParams({ uid: 'user-123' });
});

// ── Create mode ───────────────────────────────────────────────────────────────

describe('TaskFormScreen — create mode', () => {
  it('renders "New task" heading', () => {
    render(<TaskFormScreen />);
    expect(screen.getByText('New task')).toBeTruthy();
  });

  it('renders the title input', () => {
    render(<TaskFormScreen />);
    expect(screen.getByPlaceholderText('What do you need to do?')).toBeTruthy();
  });

  it('renders POI quick-pick tiles (spot-check 6 of the 16)', () => {
    render(<TaskFormScreen />);
    expect(screen.getByText('ATM')).toBeTruthy();
    expect(screen.getByText('Café')).toBeTruthy();
    expect(screen.getByText('Market')).toBeTruthy();
    expect(screen.getByText('Pharmacy')).toBeTruthy();
    expect(screen.getByText('Gym')).toBeTruthy();
    expect(screen.getByText('Restaurant')).toBeTruthy();
  });

  it('renders all 4 built-in category pills', () => {
    render(<TaskFormScreen />);
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Errands')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('shows the disabled helper text when canSubmit is false', () => {
    render(<TaskFormScreen />);
    expect(screen.getByText('Add a task name and a point of interest')).toBeTruthy();
  });

  it('"Add task" button is disabled by default', () => {
    render(<TaskFormScreen />);
    const btn = screen.getByLabelText('Add task');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });
});

// ── Edit mode ────────────────────────────────────────────────────────────────

describe('TaskFormScreen — edit mode', () => {
  beforeEach(() => {
    setRouteParams({ uid: 'user-123', task: makeTask() });
  });

  it('renders "Edit task" heading', () => {
    render(<TaskFormScreen />);
    expect(screen.getByText('Edit task')).toBeTruthy();
  });

  it('pre-populates the title field', () => {
    render(<TaskFormScreen />);
    expect(
      screen.getByPlaceholderText('What do you need to do?').props.value,
    ).toBe('Buy milk');
  });

  it('"Save changes" button is labeled correctly', () => {
    render(<TaskFormScreen />);
    expect(screen.getByLabelText('Save changes')).toBeTruthy();
  });

  it('shows "Ready to add" helper when both title and POI are already set', () => {
    render(<TaskFormScreen />);
    expect(screen.getByText('Ready to add')).toBeTruthy();
  });

  it('pre-populates the notes field from existing description', () => {
    setRouteParams({
      uid:  'user-123',
      task: makeTask({ description: 'Remember to check expiry dates' }),
    });
    render(<TaskFormScreen />);
    expect(
      screen.getByPlaceholderText('Add a note, link, or reminder…').props.value,
    ).toBe('Remember to check expiry dates');
  });
});

// ── canSubmit logic ──────────────────────────────────────────────────────────

describe('TaskFormScreen — canSubmit', () => {
  it('enables "Add task" when title and POI are both provided', () => {
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Groceries',
    );
    fireEvent.press(screen.getByText('Market'));
    expect(
      screen.getByLabelText('Add task').props.accessibilityState?.disabled,
    ).toBe(false);
  });

  it('keeps "Add task" disabled when title is set but POI is not', () => {
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Groceries',
    );
    expect(
      screen.getByLabelText('Add task').props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('keeps "Add task" disabled when POI is set but title is empty', () => {
    render(<TaskFormScreen />);
    fireEvent.press(screen.getByText('ATM'));
    expect(
      screen.getByLabelText('Add task').props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('shows "Ready to add" helper once canSubmit is true', () => {
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Get cash',
    );
    fireEvent.press(screen.getByText('ATM'));
    expect(screen.getByText('Ready to add')).toBeTruthy();
  });
});

// ── POI free-text type ────────────────────────────────────────────────────────

describe('TaskFormScreen — POI free-text type', () => {
  it('renders the POI type input with the correct placeholder', () => {
    render(<TaskFormScreen />);
    expect(screen.getByPlaceholderText('bakery, florist, gym…')).toBeTruthy();
  });

  it('enables submit when title + typed POI type are both set', () => {
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Get a croissant',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('bakery, florist, gym…'),
      'bakery',
    );
    expect(
      screen.getByLabelText('Add task').props.accessibilityState?.disabled,
    ).toBe(false);
  });

  it('uses the typed type string as the poi in the addTask payload', async () => {
    mockAddTask.mockResolvedValueOnce('new-id');
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Pick up sushi',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('bakery, florist, gym…'),
      'sushi restaurant',
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ poi: 'sushi restaurant' }),
      );
    });
  });

  it('selecting a quick-pick tile clears the typed text', () => {
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('bakery, florist, gym…'),
      'florist',
    );
    fireEvent.press(screen.getByText('ATM')); // pick a quick-pick
    expect(
      screen.getByPlaceholderText('bakery, florist, gym…').props.value,
    ).toBe('');
  });

  it('typing in the free-text field deselects any quick-pick tile', async () => {
    mockAddTask.mockResolvedValueOnce('new-id');
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Task',
    );
    fireEvent.press(screen.getByText('ATM')); // select quick-pick
    fireEvent.changeText(
      screen.getByPlaceholderText('bakery, florist, gym…'),
      'bakery',
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    await waitFor(() => {
      // typed type wins — NOT 'atm'
      expect(mockAddTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ poi: 'bakery' }),
      );
    });
  });
});

// ── POI quick-pick ────────────────────────────────────────────────────────────

describe('TaskFormScreen — POI quick-pick', () => {
  it('selecting a tile includes its type in the addTask payload', async () => {
    mockAddTask.mockResolvedValueOnce('new-id');
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Groceries',
    );
    fireEvent.press(screen.getByText('Market')); // type: 'supermarket'
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ poi: 'supermarket' }),
      );
    });
  });

  it('deselecting a tile clears the POI and disables submit', () => {
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Get cash',
    );
    fireEvent.press(screen.getByText('ATM')); // select
    expect(
      screen.getByLabelText('Add task').props.accessibilityState?.disabled,
    ).toBe(false);
    fireEvent.press(screen.getByText('ATM')); // deselect
    expect(
      screen.getByLabelText('Add task').props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('selecting a second tile replaces the first', async () => {
    mockAddTask.mockResolvedValueOnce('new-id');
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Task',
    );
    fireEvent.press(screen.getByText('ATM'));       // poi: 'atm'
    fireEvent.press(screen.getByText('Pharmacy')); // switch to 'pharmacy'
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ poi: 'pharmacy' }),
      );
    });
  });
});

// ── Save — create ─────────────────────────────────────────────────────────────

describe('TaskFormScreen — save (create)', () => {
  it('calls addTask with correct payload and navigates back', async () => {
    mockAddTask.mockResolvedValueOnce('new-id');
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Walk the dog',
    );
    fireEvent.press(screen.getByText('Park'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          title:    'Walk the dog',
          category: 'personal', // default when none selected
          done:     false,
          poi:      'park',
        }),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('trims the title before saving', async () => {
    mockAddTask.mockResolvedValueOnce('new-id');
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      '  Walk the dog  ',
    );
    fireEvent.press(screen.getByText('Park'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ title: 'Walk the dog' }),
      );
    });
  });

  it('includes notes as description when set', async () => {
    mockAddTask.mockResolvedValueOnce('new-id');
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Groceries',
    );
    fireEvent.press(screen.getByText('Market'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Add a note, link, or reminder…'),
      'Milk, eggs, bread',
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Add task'));
    });
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ description: 'Milk, eggs, bread' }),
      );
    });
  });
});

// ── Save — edit ───────────────────────────────────────────────────────────────

describe('TaskFormScreen — save (edit)', () => {
  beforeEach(() => {
    setRouteParams({ uid: 'user-123', task: makeTask() });
  });

  it('calls updateTask (not addTask) and navigates back', async () => {
    mockUpdateTask.mockResolvedValueOnce(undefined);
    render(<TaskFormScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('What do you need to do?'),
      'Buy oat milk',
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Save changes'));
    });
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        'user-123',
        'task-1',
        expect.objectContaining({ title: 'Buy oat milk' }),
      );
      expect(mockAddTask).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});

// ── Go back ───────────────────────────────────────────────────────────────────

describe('TaskFormScreen — go back', () => {
  it('calls navigation.goBack when the back button is pressed', () => {
    render(<TaskFormScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ── Delete (edit mode) ────────────────────────────────────────────────────────

describe('TaskFormScreen — delete (edit mode)', () => {
  beforeEach(() => {
    setRouteParams({ uid: 'user-123', task: makeTask() });
  });

  it('shows a "Delete task" button in edit mode', () => {
    render(<TaskFormScreen />);
    expect(screen.getByLabelText('Delete task')).toBeTruthy();
  });

  it('does NOT show a "Delete task" button in create mode', () => {
    setRouteParams({ uid: 'user-123' });
    render(<TaskFormScreen />);
    expect(screen.queryByLabelText('Delete task')).toBeNull();
  });

  it('calls deleteTask + goBack after user confirms', async () => {
    mockDeleteTask.mockResolvedValueOnce(undefined);

    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_title: any, _msg: any, buttons: any[]) => {
        const destructive = buttons.find((b: any) => b.style === 'destructive');
        destructive?.onPress?.();
      });

    render(<TaskFormScreen />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete task'));
    });
    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith('user-123', 'task-1');
      expect(mockGoBack).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('does NOT call deleteTask when user cancels the confirmation', async () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_title: any, _msg: any, buttons: any[]) => {
        const cancelBtn = buttons.find((b: any) => b.style === 'cancel');
        cancelBtn?.onPress?.();
      });

    render(<TaskFormScreen />);
    fireEvent.press(screen.getByLabelText('Delete task'));
    expect(mockDeleteTask).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
