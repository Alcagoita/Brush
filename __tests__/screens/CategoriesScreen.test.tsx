/**
 * Unit tests for src/screens/CategoriesScreen.tsx — KAN-16
 *
 * Covers:
 *   - Renders the 4 built-in categories
 *   - Built-in rows have no Edit/Delete actions
 *   - Custom categories (from mock subscription) render with Edit / × delete
 *   - Empty state shown when no custom categories
 *   - "Add Category" button opens the sheet
 *   - Sheet: validates empty name
 *   - Sheet: calls addCategory with correct data on save
 *   - Sheet: closes on Cancel
 *   - Edit: pre-fills the form with existing values; calls updateCategory on save
 *   - Delete: confirmation alert → calls deleteCategory on confirm
 *   - Color picker: 18 swatches rendered; swatch selection; hex input
 *   - Location type: quick-pick chips; Google Places search + result selection
 */

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetCategories  = jest.fn();
const mockAddCategory    = jest.fn();
const mockUpdateCategory = jest.fn();
const mockDeleteCategory = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  getCategories:  (...args: unknown[]) => mockGetCategories(...args),
  addCategory:    (...args: unknown[]) => mockAddCategory(...args),
  updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
}));

const mockSearchPlaceTypes = jest.fn();

jest.mock('../../src/services/maps', () => ({
  searchPlaceTypes: (...args: unknown[]) => mockSearchPlaceTypes(...args),
  placeTypeLabel:   (type: string) =>
    type === 'gym' ? 'Gym' :
    type === 'atm' ? 'ATM' :
    type === 'cafe' ? 'Café' :
    type === 'supermarket' ? 'Supermarket' :
    type === 'pharmacy' ? 'Pharmacy' :
    type === 'restaurant' ? 'Restaurant' :
    type,
  PlaceTypeSuggestion: {},   // re-export type — no runtime value needed
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

import CategoriesScreen, { CATEGORY_COLORS } from '../../src/screens/CategoriesScreen';
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
 * Renders the screen with a given set of custom categories, flushing the
 * one-shot getCategories() fetch (KAN-218) before returning.
 */
async function renderWith(customCategories: Category[] = []) {
  mockGetCategories.mockResolvedValue(customCategories);
  const utils = render(<CategoriesScreen />);
  await act(async () => {});
  return utils;
}

/** Opens the sheet (Add or Edit) and waits for it to appear. */
async function openAddSheet() {
  fireEvent.press(screen.getByRole('button', { name: 'Add category' }));
  await waitFor(() => screen.getByText('New Category'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('CategoriesScreen — render', () => {
  it('renders the screen title', async () => {
    await renderWith();
    expect(screen.getByText('Categories')).toBeTruthy();
  });

  it('renders the BUILT-IN section header', async () => {
    await renderWith();
    expect(screen.getByText('BUILT-IN')).toBeTruthy();
  });

  it('renders all 4 built-in category names', async () => {
    await renderWith();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Errands')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('renders the CUSTOM section header', async () => {
    await renderWith();
    expect(screen.getByText('CUSTOM')).toBeTruthy();
  });

  it('shows empty state when no custom categories exist', async () => {
    await renderWith([]);
    expect(screen.getByText('No custom categories yet')).toBeTruthy();
  });

  it('renders a custom category name', async () => {
    await renderWith([CUSTOM_CATEGORY]);
    expect(screen.getByText('Shopping')).toBeTruthy();
  });

  it('renders the Add Category button', async () => {
    await renderWith();
    expect(screen.getByRole('button', { name: 'Add category' })).toBeTruthy();
  });
});

// ── Built-in row constraints ──────────────────────────────────────────────────

describe('CategoriesScreen — built-in rows', () => {
  it('does not show Edit button for built-in categories', async () => {
    await renderWith();
    expect(screen.queryByRole('button', { name: 'Edit Work' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit Health' })).toBeNull();
  });

  it('does not show Delete button for built-in categories', async () => {
    await renderWith();
    expect(screen.queryByRole('button', { name: 'Delete Work' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete Personal' })).toBeNull();
  });
});

// ── Custom row actions ────────────────────────────────────────────────────────

describe('CategoriesScreen — custom row actions', () => {
  it('shows Edit button for a custom category', async () => {
    await renderWith([CUSTOM_CATEGORY]);
    expect(screen.getByRole('button', { name: 'Edit Shopping' })).toBeTruthy();
  });

  it('shows × Delete button for a custom category', async () => {
    await renderWith([CUSTOM_CATEGORY]);
    expect(screen.getByRole('button', { name: 'Delete Shopping' })).toBeTruthy();
  });
});

// ── Add category ──────────────────────────────────────────────────────────────

describe('CategoriesScreen — add category', () => {
  it('opens the sheet when Add Category is pressed', async () => {
    await renderWith();
    await openAddSheet();
    expect(screen.getByText('New Category')).toBeTruthy();
  });

  it('shows a name error when saving with empty name', async () => {
    await renderWith();
    await openAddSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));
    expect(screen.getByText('Please enter a category name.')).toBeTruthy();
  });

  it('calls addCategory with trimmed name and selected options on save', async () => {
    mockAddCategory.mockResolvedValueOnce('new-id');
    await renderWith();
    await openAddSheet();

    fireEvent.changeText(screen.getByLabelText('Category name'), '  Fitness  ');
    fireEvent.press(screen.getByRole('radio', { name: 'Café' }));

    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(mockAddCategory).toHaveBeenCalledWith('test-uid', {
        name:  'Fitness',
        color: expect.any(String),
        poi:   'cafe',
      }),
    );
  });

  it('closes the sheet on Cancel', async () => {
    await renderWith();
    await openAddSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('New Category')).toBeNull(),
    );
  });
});

// ── Edit category ─────────────────────────────────────────────────────────────

describe('CategoriesScreen — edit category', () => {
  it('opens the sheet with "Edit Category" title', async () => {
    await renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Shopping' }));
    await waitFor(() =>
      expect(screen.getByText('Edit Category')).toBeTruthy(),
    );
  });

  it('pre-fills the name field with the existing name', async () => {
    await renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Shopping' }));
    await waitFor(() => screen.getByText('Edit Category'));
    expect(screen.getByLabelText('Category name').props.value).toBe('Shopping');
  });

  it('calls updateCategory with new data on save', async () => {
    mockUpdateCategory.mockResolvedValueOnce(undefined);
    await renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Shopping' }));
    await waitFor(() => screen.getByText('Edit Category'));

    fireEvent.changeText(screen.getByLabelText('Category name'), 'Groceries');

    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

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
  it('shows a confirmation alert when × is pressed', async () => {
    await renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Delete Shopping' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Category',
      expect.stringContaining('Shopping'),
      expect.any(Array),
    );
  });

  it('calls deleteCategory when the user confirms', async () => {
    mockDeleteCategory.mockResolvedValueOnce(undefined);
    await renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Delete Shopping' }));

    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const deleteBtn = alertButtons.find(b => b.text === 'Delete');
    deleteBtn?.onPress?.();

    expect(mockDeleteCategory).toHaveBeenCalledWith('test-uid', 'custom-1');
  });

  it('does not call deleteCategory when the user cancels', async () => {
    await renderWith([CUSTOM_CATEGORY]);
    fireEvent.press(screen.getByRole('button', { name: 'Delete Shopping' }));

    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const cancelBtn = alertButtons.find(b => b.text === 'Cancel');
    cancelBtn?.onPress?.();

    expect(mockDeleteCategory).not.toHaveBeenCalled();
  });
});

// ── Color picker ──────────────────────────────────────────────────────────────

describe('CategoriesScreen — color picker', () => {
  it('renders 18 colour swatches', async () => {
    await renderWith();
    await openAddSheet();
    expect(CATEGORY_COLORS).toHaveLength(18);
    // Each swatch has accessibilityRole="radio"
    const swatches = screen.getAllByRole('radio').filter(el =>
      el.props.accessibilityLabel?.startsWith('Color #'),
    );
    expect(swatches).toHaveLength(18);
  });

  it('selects a swatch and updates the colour', async () => {
    mockAddCategory.mockResolvedValueOnce('id');
    await renderWith();
    await openAddSheet();

    // Tap the red swatch (#e05252)
    fireEvent.press(screen.getByRole('radio', { name: 'Color #e05252' }));
    fireEvent.changeText(screen.getByLabelText('Category name'), 'Red Cat');

    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(mockAddCategory).toHaveBeenCalledWith('test-uid',
        expect.objectContaining({ color: '#e05252' }),
      ),
    );
  });

  it('hex input updates colour when valid', async () => {
    mockAddCategory.mockResolvedValueOnce('id');
    await renderWith();
    await openAddSheet();

    fireEvent.changeText(screen.getByLabelText('Custom hex colour'), '#123456');
    fireEvent.changeText(screen.getByLabelText('Category name'), 'Custom');

    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(mockAddCategory).toHaveBeenCalledWith('test-uid',
        expect.objectContaining({ color: '#123456' }),
      ),
    );
  });

  it('invalid hex does not change the saved colour', async () => {
    mockAddCategory.mockResolvedValueOnce('id');
    await renderWith();
    await openAddSheet();

    // Enter an invalid hex — colour stays at whatever the first swatch is
    fireEvent.changeText(screen.getByLabelText('Custom hex colour'), '#gg0000');
    fireEvent.changeText(screen.getByLabelText('Category name'), 'Bad Hex');

    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() => {
      const call = mockAddCategory.mock.calls[0][1] as { color: string };
      // Color should NOT be the invalid value
      expect(call.color).not.toBe('#gg0000');
      expect(call.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

// ── Location type ─────────────────────────────────────────────────────────────

describe('CategoriesScreen — location type', () => {
  it('renders the None chip and the 4 quick-pick chips', async () => {
    await renderWith();
    await openAddSheet();
    expect(screen.getByRole('radio', { name: 'None' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'ATM' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Café' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Supermarket' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Pharmacy' })).toBeTruthy();
  });

  it('selecting a quick-pick chip saves that POI type', async () => {
    mockAddCategory.mockResolvedValueOnce('id');
    await renderWith();
    await openAddSheet();

    fireEvent.changeText(screen.getByLabelText('Category name'), 'Meds');
    fireEvent.press(screen.getByRole('radio', { name: 'Pharmacy' }));

    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(mockAddCategory).toHaveBeenCalledWith('test-uid',
        expect.objectContaining({ poi: 'pharmacy' }),
      ),
    );
  });

  it('None chip saves null POI', async () => {
    mockAddCategory.mockResolvedValueOnce('id');
    await renderWith();
    await openAddSheet();

    fireEvent.changeText(screen.getByLabelText('Category name'), 'Work');
    // ATM is currently active after pressing it; then go back to None
    fireEvent.press(screen.getByRole('radio', { name: 'ATM' }));
    fireEvent.press(screen.getByRole('radio', { name: 'None' }));

    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(mockAddCategory).toHaveBeenCalledWith('test-uid',
        expect.objectContaining({ poi: null }),
      ),
    );
  });

  it('renders a location type search input', async () => {
    await renderWith();
    await openAddSheet();
    expect(screen.getByLabelText('Search location type')).toBeTruthy();
  });

  it('typing in search calls searchPlaceTypes after debounce', async () => {
    mockSearchPlaceTypes.mockResolvedValueOnce([
      { type: 'gym', label: 'Gym' },
    ]);
    await renderWith();
    await openAddSheet();

    fireEvent.changeText(screen.getByLabelText('Search location type'), 'gym');

    // Fast-forward past the 350ms debounce
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockSearchPlaceTypes).toHaveBeenCalledWith('gym');
  });

  it('search results appear and can be selected', async () => {
    mockSearchPlaceTypes.mockResolvedValueOnce([
      { type: 'gym',        label: 'Gym' },
      { type: 'restaurant', label: 'Restaurant' },
    ]);
    mockAddCategory.mockResolvedValueOnce('id');
    await renderWith();
    await openAddSheet();

    fireEvent.changeText(screen.getByLabelText('Search location type'), 'gym');
    await act(async () => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gym' })).toBeTruthy());

    // Tap the Gym result
    fireEvent.press(screen.getByRole('button', { name: 'Gym' }));

    // Save
    fireEvent.changeText(screen.getByLabelText('Category name'), 'Fitness');
    fireEvent.press(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() =>
      expect(mockAddCategory).toHaveBeenCalledWith('test-uid',
        expect.objectContaining({ poi: 'gym' }),
      ),
    );
  });

  it('does not call searchPlaceTypes for empty input', async () => {
    await renderWith();
    await openAddSheet();

    fireEvent.changeText(screen.getByLabelText('Search location type'), '');
    await act(async () => { jest.advanceTimersByTime(400); });

    expect(mockSearchPlaceTypes).not.toHaveBeenCalled();
  });
});

// ─── KAN-57 / KAN-58 — CategoriesUiState error branch & retry ───────────────

describe('CategoriesScreen — KAN-57 / KAN-58 UiState error branch & retry', () => {
  it('shows a user-friendly error message when the fetch rejects', async () => {
    mockGetCategories.mockRejectedValue(new Error('Firestore unavailable'));

    render(<CategoriesScreen />);
    await act(async () => {});

    expect(screen.getByText('Could not load categories. Check your connection.')).toBeTruthy();
  });

  it('shows a "Try again" button in the error state', async () => {
    mockGetCategories.mockRejectedValue(new Error('Network error'));

    render(<CategoriesScreen />);
    await act(async () => {});

    expect(screen.getByLabelText('Try again')).toBeTruthy();
  });

  it('does not show custom category rows in the error state', async () => {
    mockGetCategories.mockRejectedValue(new Error('Network error'));

    render(<CategoriesScreen />);
    await act(async () => {});

    expect(screen.queryByLabelText('My Category category')).toBeNull();
  });

  it('re-fetches and shows categories when "Try again" is pressed after recovery', async () => {
    mockGetCategories
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([{ id: 'cat-gym', name: 'Gym', color: '#ff0000', poi: null, isBuiltIn: false }]);

    render(<CategoriesScreen />);
    await act(async () => {});

    expect(screen.getByLabelText('Try again')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Try again'));
    });

    expect(screen.getByText('Gym')).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });
});
