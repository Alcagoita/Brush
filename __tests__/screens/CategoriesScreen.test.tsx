/**
 * Unit tests for src/screens/CategoriesScreen.tsx — KAN-16
 *
 * Covers:
 *   - Renders the 4 built-in categories
 *   - Built-in rows have no Edit/Delete actions
 *   - Custom categories (from mock subscription) render with Edit/Delete
 *   - Empty state shown when no custom categories
 *   - "Add Category" button opens the sheet
 *   - Sheet: validates empty name
 *   - Sheet: calls addCategory with correct data on save
 *   - Sheet: closes on Cancel
 *   - Edit: pre-fills the form with existing values; calls updateCategory on save
 *   - Delete: confirmation alert → calls deleteCategory on confirm
 */

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToCategories = jest.fn();
const mockAddCategory            = jest.fn();
const mockUpdateCategory         = jest.fn();
const mockDeleteCategory         = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToCategories: (...args: unknown[]) => mockSubscribeToCategories(...args),
  addCategory:           (...args: unknown[]) => mockAddCategory(...args),
  updateCategory:        (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory:        (...args: unknown[]) => mockDeleteCategory(...args),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

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
      ringTrack:  'rgba(20,20,18,0.08)',
      ringFill:   '#1a1a18',
      accent:     '#e8a86a',
      nearTint:   '#fdf7f0',
      nearTint2:  '#f9ede0',
      nearBorder: '#e8c9a0',
      nearText:   '#7a4a20',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => ({
  ChevronLeftIcon: () => null,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import CategoriesScreen from '../../src/screens/CategoriesScreen';
import type { Category } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CUSTOM_CATEGORY: Category = {
  id:        'custom-1',
  name:      'Shopping',
  color:     '#5b7fd4',
  poi:       'supermarket',
  isBuiltIn: false,
};

/**
 * Renders the screen with a given set of custom categories.
 * The subscription mock calls its callback synchronously.
 */
function renderWith(customCategories: Category[] = []) {
  mockSubscribeToCategories.mockImplementation((_uid: string, cb: (cats: Category[]) => void) => {
    cb(customCategories);
    return jest.fn(); // unsubscribe
  });
  return render(<CategoriesScreen />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('CategoriesScreen — render', () => {
  it('renders the screen title', () => {
    renderWith();
    expect(screen.getByText('Categories')).toBeTruthy();
  });

  it('renders the BUILT-IN section header', () => {
    renderWith();
    expect(screen.getByText('BUILT-IN')).toBeTruthy();
  });

  it('renders all 4 built-in category names', () => {
    renderWith();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Errands')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('renders the CUSTOM section header', () => {
    renderWith();
    expect(screen.getByText('CUSTOM')).toBeTruthy();
  });

  it('shows empty state when no custom categories exist', () => {
    renderWith([]);
    expect(screen.getByText('No custom categories yet')).toBeTruthy();
  });

  it('renders a custom category name', () => {
    renderWith([CUSTOM_CATEGORY]);
    expect(screen.getByText('Shopping')).toBeTruthy();
  });

  it('renders the Add Category button', () => {
    renderWith();
    expect(screen.getByRole('button', { name: 'Add category' })).toBeTruthy();
  });
});

// ── Built-in row constraints ──────────────────────────────────────────────────

describe('CategoriesScreen — built-in rows', () => {
  it('does not show Edit button for built-in categories', () => {
    renderWith();
    expect(screen.queryByRole('button', { name: 'Edit Work' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit Health' })).toBeNull();
  });

  it('does not show Delete button for built-in categories', () => {
    renderWith();
    expect(screen.queryByRole('button', { name: 'Delete Work' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete Personal' })).toBeNull();
  });
});

// ── Custom row actions ────────────────────────────────────────────────────────

describe('CategoriesScreen — custom row actions', () => {
  it('shows Edit button for a custom category', () => {
    renderWith([CUSTOM_CATEGORY]);
    expect(screen.getByRole('button', { name: 'Edit Shopping' })).toBeTruthy();
  });

  it('shows Delete button for a custom category', () => {
    renderWith([CUSTOM_CATEGORY]);
    expect(screen.getByRole('button', { name: 'Delete Shopping' })).toBeTruthy();
  });
});

// ── Add category ──────────────────────────────────────────────────────────────

describe('CategoriesScreen — add category', () => {
  it('opens the sheet when Add Category is pressed', async () => {
    renderWith();
    fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() =>
      expect(screen.getByText('New Category')).toBeTruthy(),
    );
  });

  it('shows a name error when saving with empty name', async () => {
    renderWith();
    fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => screen.getByText('New Category'));
    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));
    expect(screen.getByText('Please enter a category name.')).toBeTruthy();
  });

  it('calls addCategory with trimmed name and selected options on save', async () => {
    mockAddCategory.mockResolvedValueOnce('new-id');
    renderWith();
    fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => screen.getByText('New Category'));

    fireEvent.changeText(screen.getByLabelText('Category name'), '  Fitness  ');
    fireEvent.press(screen.getByRole('radio', { name: 'Café' }));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save category' }));
    });

    await waitFor(() =>
      expect(mockAddCategory).toHaveBeenCalledWith('test-uid', {
        name:  'Fitness',
        color: expect.any(String),
        poi:   'cafe',
      }),
    );
  });

  it('closes the sheet on Cancel', async () => {
    renderWith();
    fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => screen.getByText('New Category'));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('New Category')).toBeNull(),
    );
  });
});

// ── Edit category ─────────────────────────────────────────────────────────────

describe('CategoriesScreen — edit category', () => {
  it('opens the sheet with "Edit Category" title', async () => {
    renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Shopping' }));
    await waitFor(() =>
      expect(screen.getByText('Edit Category')).toBeTruthy(),
    );
  });

  it('pre-fills the name field with the existing name', async () => {
    renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Shopping' }));
    await waitFor(() => screen.getByText('Edit Category'));
    expect(screen.getByLabelText('Category name').props.value).toBe('Shopping');
  });

  it('calls updateCategory with new data on save', async () => {
    mockUpdateCategory.mockResolvedValueOnce(undefined);
    renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Shopping' }));
    await waitFor(() => screen.getByText('Edit Category'));

    fireEvent.changeText(screen.getByLabelText('Category name'), 'Groceries');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save category' }));
    });

    await waitFor(() =>
      expect(mockUpdateCategory).toHaveBeenCalledWith(
        'test-uid',
        'custom-1',
        expect.objectContaining({ name: 'Groceries' }),
      ),
    );
  });
});

// ── Delete category ───────────────────────────────────────────────────────────

describe('CategoriesScreen — delete category', () => {
  it('shows a confirmation alert when Delete is pressed', () => {
    renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Delete Shopping' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Category',
      expect.stringContaining('Shopping'),
      expect.any(Array),
    );
  });

  it('calls deleteCategory when the user confirms', () => {
    mockDeleteCategory.mockResolvedValueOnce(undefined);
    renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Delete Shopping' }));

    // Simulate pressing the "Delete" button in the Alert
    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const deleteBtn = alertButtons.find(b => b.text === 'Delete');
    deleteBtn?.onPress?.();

    expect(mockDeleteCategory).toHaveBeenCalledWith('test-uid', 'custom-1');
  });

  it('does not call deleteCategory when the user cancels', () => {
    renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Delete Shopping' }));

    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const cancelBtn = alertButtons.find(b => b.text === 'Cancel');
    cancelBtn?.onPress?.();

    expect(mockDeleteCategory).not.toHaveBeenCalled();
  });
});
