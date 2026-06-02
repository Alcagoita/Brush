/**
 * Unit tests for src/components/NewTaskSheet.tsx — KAN-61
 *
 * Covers:
 *   - All 4 built-in category pills always render
 *   - Custom categories render after built-ins when provided
 *   - No custom categories → sheet identical to before (no extra pills)
 *   - Selecting a custom category pill marks it as selected
 *   - Selecting a built-in after a custom deselects the custom
 *   - addTask is called with the correct custom category ID on submit
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NewTaskSheet from '../../src/components/NewTaskSheet';
import type { Category } from '../../src/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAddTask = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  addTask: (...args: unknown[]) => mockAddTask(...args),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    dark: false,
    palette: {
      bg: '#fdfdfb', surface: '#f6f5f1', surface2: '#efeeea',
      line: 'rgba(20,20,18,0.08)', text: '#1a1a18', muted: '#8a8a85',
      faint: '#bdbdb7', accent: '#e8a86a',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('../../src/components/AppIcon', () => ({
  CloseIcon: 'CloseIcon',
  ClockIcon: 'ClockIcon',
  PoiIcon:   'PoiIcon',
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CUSTOM_CATEGORIES: Category[] = [
  { id: 'custom-gym',   name: 'Gym',   color: '#ff6b6b', poi: null, isBuiltIn: false },
  { id: 'custom-music', name: 'Music', color: '#4ecdc4', poi: null, isBuiltIn: false },
];

function renderSheet(customCategories: Category[] = [], visible = true) {
  return render(
    <NewTaskSheet
      visible={visible}
      uid="test-uid"
      onClose={jest.fn()}
      customCategories={customCategories}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('NewTaskSheet — built-in categories', () => {
  it('renders all 4 built-in category pills', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: 'Work' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Health' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Errands' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Personal' })).toBeTruthy();
  });

  it('does not render custom pills when customCategories is empty', () => {
    renderSheet([]);
    expect(screen.queryByRole('button', { name: 'Gym' })).toBeNull();
  });
});

describe('NewTaskSheet — custom categories (KAN-61)', () => {
  it('renders custom category pills after the built-ins', () => {
    renderSheet(CUSTOM_CATEGORIES);
    expect(screen.getByRole('button', { name: 'Gym' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Music' })).toBeTruthy();
  });

  it('renders built-in pills alongside custom pills', () => {
    renderSheet(CUSTOM_CATEGORIES);
    expect(screen.getByRole('button', { name: 'Work' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gym' })).toBeTruthy();
  });

  it('custom category pill can be selected', () => {
    renderSheet(CUSTOM_CATEGORIES);
    const gymPill = screen.getByRole('button', { name: 'Gym' });
    fireEvent.press(gymPill);
    expect(gymPill.props.accessibilityState?.selected).toBe(true);
  });

  it('deselects custom pill when a built-in is selected', () => {
    renderSheet(CUSTOM_CATEGORIES);
    fireEvent.press(screen.getByRole('button', { name: 'Gym' }));
    fireEvent.press(screen.getByRole('button', { name: 'Work' }));
    expect(screen.getByRole('button', { name: 'Gym' }).props.accessibilityState?.selected).toBe(false);
    expect(screen.getByRole('button', { name: 'Work' }).props.accessibilityState?.selected).toBe(true);
  });

  it('calls addTask with the custom category ID on submit', async () => {
    mockAddTask.mockResolvedValueOnce('new-task-id');
    renderSheet(CUSTOM_CATEGORIES);

    fireEvent.changeText(screen.getByPlaceholderText('What do you need to do?'), 'Morning run');
    fireEvent.press(screen.getByRole('button', { name: 'Gym' }));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
    });

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'test-uid',
        expect.objectContaining({ category: 'custom-gym' }),
      );
    });
  });

  it('calls addTask with built-in category ID when a built-in is selected', async () => {
    mockAddTask.mockResolvedValueOnce('new-task-id');
    renderSheet(CUSTOM_CATEGORIES);

    fireEvent.changeText(screen.getByPlaceholderText('What do you need to do?'), 'Team meeting');
    fireEvent.press(screen.getByRole('button', { name: 'Work' }));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
    });

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        'test-uid',
        expect.objectContaining({ category: 'work' }),
      );
    });
  });
});
