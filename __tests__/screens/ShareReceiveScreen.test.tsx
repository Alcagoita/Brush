/**
 * Unit tests for src/screens/ShareReceiveScreen.tsx — KAN-90
 *
 * Covers:
 *   - Loading state while parseMessageToTask is in-flight
 *   - Confirmation state on high/medium confidence result
 *   - Failure state on low confidence result
 *   - Failure state on Cloud Function error
 *   - Save: calls addTask with correct payload, navigates to Today
 *   - Discard: navigates back
 *   - Title validation: empty title blocked, error shown
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ShareReceiveScreen from '../../src/screens/ShareReceiveScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAddTask             = jest.fn().mockResolvedValue('task-id-123');
const mockParseMessageToTask  = jest.fn();
const mockGoBack              = jest.fn();
const mockNavigate            = jest.fn();
const mockCanGoBack           = jest.fn(() => true);

jest.mock('../../src/services/auth', () => ({
  getCurrentUser: jest.fn(() => ({ uid: 'uid-test', displayName: 'Test User' })),
}));

jest.mock('../../src/services/firestore', () => ({
  addTask: jest.fn((...args: unknown[]) => mockAddTask(...args)),
}));

jest.mock('../../src/services/functions', () => ({
  parseMessageToTask: jest.fn((...args: unknown[]) => mockParseMessageToTask(...args)),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack:     mockGoBack,
    navigate:   mockNavigate,
    canGoBack:  mockCanGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams }),
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

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (props: any) => React.createElement(View, props);
  return { PoiIcon: stub, ClockIcon: stub };
});

// ─── Route params ─────────────────────────────────────────────────────────────

let mockRouteParams: { sharedText: string } = { sharedText: 'Pick up milk from Whole Foods at 5pm' };

function setSharedText(text: string) {
  mockRouteParams = { sharedText: text };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(<ShareReceiveScreen />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setSharedText('Pick up milk from Whole Foods at 5pm');
  mockCanGoBack.mockReturnValue(true);
});

// ── Loading state ──────────────────────────────────────────────────────────────

it('shows the loading state while parseMessageToTask is pending', async () => {
  // Never resolves during this test
  mockParseMessageToTask.mockReturnValue(new Promise(() => {}));

  renderScreen();

  expect(screen.getByTestId('loading-state')).toBeTruthy();
  // Loading label
  expect(screen.getByText('Parsing task…')).toBeTruthy();
  // Raw shared text shown in card
  expect(screen.getByText('Pick up milk from Whole Foods at 5pm')).toBeTruthy();
});

// ── Confirmation state ─────────────────────────────────────────────────────────

it('shows confirmation form pre-filled after high-confidence parse', async () => {
  mockParseMessageToTask.mockResolvedValue({
    title:        'Pick up milk',
    suggestedPoi: 'supermarket',
    suggestedTime: '17:00',
    confidence:   'high',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByText('AI suggestion — tap to edit')).toBeTruthy();
  });

  const titleInput = screen.getByTestId('title-input');
  expect(titleInput.props.value).toBe('Pick up milk');

  // Add task button visible
  expect(screen.getByTestId('add-task-btn')).toBeTruthy();
});

it('shows confirmation form after medium-confidence parse', async () => {
  mockParseMessageToTask.mockResolvedValue({
    title:        'Meeting at café',
    suggestedPoi: 'cafe',
    suggestedTime: null,
    confidence:   'medium',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByText('AI suggestion — tap to edit')).toBeTruthy();
  });

  const titleInput = screen.getByTestId('title-input');
  expect(titleInput.props.value).toBe('Meeting at café');
});

// ── Failure state ──────────────────────────────────────────────────────────────

it('shows failure state on low-confidence parse', async () => {
  mockParseMessageToTask.mockResolvedValue({
    title:        'Pick up milk from Whole Foods at 5pm',
    suggestedPoi: null,
    suggestedTime: null,
    confidence:   'low',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('failure-note')).toBeTruthy();
  });

  expect(
    screen.getByText("We couldn't parse a task automatically. Add the details manually."),
  ).toBeTruthy();
});

it('shows failure state when parseMessageToTask throws', async () => {
  mockParseMessageToTask.mockRejectedValue(new Error('Network error'));

  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('failure-note')).toBeTruthy();
  });
});

it('pre-fills title with truncated raw text in failure state', async () => {
  const longText = 'A'.repeat(200);
  setSharedText(longText);
  mockParseMessageToTask.mockResolvedValue({
    title: longText.slice(0, 80),
    suggestedPoi: null,
    suggestedTime: null,
    confidence: 'low',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('failure-note')).toBeTruthy();
  });

  const titleInput = screen.getByTestId('title-input');
  expect(titleInput.props.value).toHaveLength(80);
});

// ── Save ───────────────────────────────────────────────────────────────────────

it('calls addTask with correct payload and navigates to Today on confirm', async () => {
  mockParseMessageToTask.mockResolvedValue({
    title:        'Buy groceries',
    suggestedPoi: 'supermarket',
    suggestedTime: '10:00',
    confidence:   'high',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('add-task-btn')).toBeTruthy();
  });

  await act(async () => {
    fireEvent.press(screen.getByTestId('add-task-btn'));
  });

  expect(mockAddTask).toHaveBeenCalledWith('uid-test', expect.objectContaining({
    title: 'Buy groceries',
    done:  false,
    poi:   'supermarket',
    time:  '10:00',
  }));
  expect(mockNavigate).toHaveBeenCalledWith('Today');
});

it('blocks save when title is empty and shows error', async () => {
  mockParseMessageToTask.mockResolvedValue({
    title:        '',
    suggestedPoi: null,
    suggestedTime: null,
    confidence:   'high',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('add-task-btn')).toBeTruthy();
  });

  await act(async () => {
    fireEvent.press(screen.getByTestId('add-task-btn'));
  });

  expect(mockAddTask).not.toHaveBeenCalled();
  expect(screen.getByText('Title is required.')).toBeTruthy();
});

// ── Discard ────────────────────────────────────────────────────────────────────

it('calls navigation.goBack() on Discard when there is history', async () => {
  mockParseMessageToTask.mockResolvedValue({
    title: 'Task', suggestedPoi: null, suggestedTime: null, confidence: 'high',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('discard-btn')).toBeTruthy();
  });

  fireEvent.press(screen.getByTestId('discard-btn'));
  expect(mockGoBack).toHaveBeenCalled();
});

it('navigates to Today on Discard when there is no back history', async () => {
  mockCanGoBack.mockReturnValue(false);
  mockParseMessageToTask.mockResolvedValue({
    title: 'Task', suggestedPoi: null, suggestedTime: null, confidence: 'high',
  });

  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('discard-btn')).toBeTruthy();
  });

  fireEvent.press(screen.getByTestId('discard-btn'));
  expect(mockNavigate).toHaveBeenCalledWith('Today');
});
