/**
 * Unit tests for src/components/TaskRow.tsx — KAN-61
 *
 * Covers:
 *   - Built-in category chip renders correctly
 *   - Custom category ID resolved from customCategories prop
 *   - Fallback 'Other' chip shown for orphaned/unknown category IDs
 *   - Built-in categories still work when customCategories prop is provided
 *   - Strikethrough applied when task is done
 *   - onToggle callback fired on press
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TaskRow from '../../src/components/TaskRow';
import type { Task, Category } from '../../src/types';
import { Timestamp } from '@react-native-firebase/firestore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fdfdfb', surface: '#f6f5f1', surface2: '#efeeea',
      line: 'rgba(20,20,18,0.08)', text: '#1a1a18', muted: '#8a8a85',
      faint: '#bdbdb7', accent: '#e8a86a',
    },
  }),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('../../src/components/PoiChip', () => 'PoiChip');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_TASK: Task = {
  id: 'task-1',
  title: 'Buy groceries',
  category: 'errands',
  done: false,
  createdAt: { toDate: () => new Date() } as unknown as Timestamp,
  date: '2026-05-31',
};

const CUSTOM_CATEGORIES: Category[] = [
  { id: 'custom-gym',    name: 'Gym',    color: '#ff6b6b', poi: null, isBuiltIn: false },
  { id: 'custom-study',  name: 'Study',  color: '#4ecdc4', poi: null, isBuiltIn: false },
];

const onToggle = jest.fn();

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('TaskRow — category colour (KAN-60)', () => {
  it('applies the category brand colour to the chip label text', () => {
    render(<TaskRow task={BASE_TASK} onToggle={onToggle} />);
    // Errands colour is #8b6bc4 (muted purple) per tokens.ts.
    const label = screen.getByText('Errands');
    const styles = [label.props.style].flat();
    const hasColor = styles.some((s: any) => s?.color === '#8b6bc4');
    expect(hasColor).toBe(true);
  });

  it('applies a different colour for a different category', () => {
    render(<TaskRow task={{ ...BASE_TASK, category: 'health' }} onToggle={onToggle} />);
    // Health colour is #5ba87a (sage) per tokens.ts.
    const label = screen.getByText('Health');
    const styles = [label.props.style].flat();
    const hasColor = styles.some((s: any) => s?.color === '#5ba87a');
    expect(hasColor).toBe(true);
  });
});

describe('TaskRow — built-in categories', () => {
  it('renders the task title', () => {
    render(<TaskRow task={BASE_TASK} onToggle={onToggle} />);
    expect(screen.getByText('Buy groceries')).toBeTruthy();
  });

  it('renders the built-in category label', () => {
    render(<TaskRow task={BASE_TASK} onToggle={onToggle} />);
    expect(screen.getByText('Errands')).toBeTruthy();
  });

  it('renders Work label for work category', () => {
    render(<TaskRow task={{ ...BASE_TASK, category: 'work' }} onToggle={onToggle} />);
    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('renders Health label for health category', () => {
    render(<TaskRow task={{ ...BASE_TASK, category: 'health' }} onToggle={onToggle} />);
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('renders Personal label for personal category', () => {
    render(<TaskRow task={{ ...BASE_TASK, category: 'personal' }} onToggle={onToggle} />);
    expect(screen.getByText('Personal')).toBeTruthy();
  });
});

describe('TaskRow — custom categories (KAN-61)', () => {
  it('renders custom category name when ID matches customCategories prop', () => {
    render(
      <TaskRow
        task={{ ...BASE_TASK, category: 'custom-gym' }}
        onToggle={onToggle}
        customCategories={CUSTOM_CATEGORIES}
      />,
    );
    expect(screen.getByText('Gym')).toBeTruthy();
  });

  it('renders second custom category correctly', () => {
    render(
      <TaskRow
        task={{ ...BASE_TASK, category: 'custom-study' }}
        onToggle={onToggle}
        customCategories={CUSTOM_CATEGORIES}
      />,
    );
    expect(screen.getByText('Study')).toBeTruthy();
  });

  it('shows fallback "Other" chip for unknown/orphaned category ID', () => {
    render(
      <TaskRow
        task={{ ...BASE_TASK, category: 'deleted-category-id' }}
        onToggle={onToggle}
        customCategories={CUSTOM_CATEGORIES}
      />,
    );
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('shows fallback "Other" when customCategories is empty and category is unknown', () => {
    render(
      <TaskRow
        task={{ ...BASE_TASK, category: 'unknown-id' }}
        onToggle={onToggle}
        customCategories={[]}
      />,
    );
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('built-in categories still resolve correctly when customCategories prop is provided', () => {
    render(
      <TaskRow
        task={{ ...BASE_TASK, category: 'work' }}
        onToggle={onToggle}
        customCategories={CUSTOM_CATEGORIES}
      />,
    );
    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('prefers built-in over custom if IDs collide', () => {
    const colliding: Category[] = [
      { id: 'work', name: 'My Work Override', color: '#000', poi: null, isBuiltIn: false },
    ];
    render(
      <TaskRow
        task={{ ...BASE_TASK, category: 'work' }}
        onToggle={onToggle}
        customCategories={colliding}
      />,
    );
    // Built-in 'Work' takes priority
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.queryByText('My Work Override')).toBeNull();
  });
});

describe('TaskRow — done state', () => {
  it('applies strikethrough when task is done', () => {
    render(<TaskRow task={{ ...BASE_TASK, done: true }} onToggle={onToggle} />);
    const title = screen.getByText('Buy groceries');
    expect(title.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textDecorationLine: 'line-through' }),
      ]),
    );
  });

  it('does not apply strikethrough when task is not done', () => {
    render(<TaskRow task={BASE_TASK} onToggle={onToggle} />);
    const title = screen.getByText('Buy groceries');
    const styles = [title.props.style].flat();
    const hasStrikethrough = styles.some(
      (s: any) => s?.textDecorationLine === 'line-through',
    );
    expect(hasStrikethrough).toBe(false);
  });
});

describe('TaskRow — interaction', () => {
  it('calls onToggle with taskId and toggled done value when pressed', () => {
    render(<TaskRow task={BASE_TASK} onToggle={onToggle} />);
    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy groceries' }));
    expect(onToggle).toHaveBeenCalledWith('task-1', true);
  });

  it('calls onToggle with false when task is already done', () => {
    render(<TaskRow task={{ ...BASE_TASK, done: true }} onToggle={onToggle} />);
    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy groceries' }));
    expect(onToggle).toHaveBeenCalledWith('task-1', false);
  });
});
