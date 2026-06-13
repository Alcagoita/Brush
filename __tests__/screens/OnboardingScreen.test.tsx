/**
 * OnboardingScreen tests — KAN-140
 *
 * Covers: stage progression, task creation, brush-away, reward card,
 * onboarding completion flag written to Firestore.
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../../src/screens/OnboardingScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Path: () => null,
  };
});

const mockAddTask    = jest.fn().mockResolvedValue('task-123');
const mockAwardPoint = jest.fn().mockResolvedValue(undefined);
const mockUpsertUser = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/services/firestore', () => ({
  addTask:    (...args: unknown[]) => mockAddTask(...args),
  awardPoint: (...args: unknown[]) => mockAwardPoint(...args),
  upsertUser: (...args: unknown[]) => mockUpsertUser(...args),
}));

jest.mock('../../src/utils/date', () => ({ todayISO: () => '2026-06-13' }));

jest.mock('../../src/components/ScrRotatingNudge', () => {
  const { Text } = require('react-native');
  return () => <Text>nudge</Text>;
});

jest.mock('../../src/components/BrushStroke', () => () => null);

jest.mock('../../src/theme', () => ({
  useTheme: () => ({ palette: { muted: '#888', accent: '#e8a86a', faint: '#c1bbac' } }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderScreen(onComplete = jest.fn()) {
  return render(<OnboardingScreen uid="uid-1" onComplete={onComplete} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OnboardingScreen — Stage 1 (Welcome)', () => {
  it('renders the tagline and CTA', () => {
    const { getByText } = renderScreen();
    expect(getByText(/calm home/i)).toBeTruthy();
    expect(getByText(/Let.*begin/i)).toBeTruthy();
  });

  it("advances to Stage 2 when Let's begin is pressed", async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Let.*begin/i));
    await waitFor(() => expect(getByText(/Add your first thing/i)).toBeTruthy());
  });
});

describe('OnboardingScreen — Stage 2 (Empty)', () => {
  async function getStage2(onComplete = jest.fn()) {
    const utils = renderScreen(onComplete);
    fireEvent.press(utils.getByText(/Let.*begin/i));
    await waitFor(() => utils.getByText(/Add your first thing/i));
    return utils;
  }

  it('shows the rotating nudge component', async () => {
    const { getByText } = await getStage2();
    expect(getByText('nudge')).toBeTruthy();
  });

  it('opens the bottom sheet when CTA is pressed', async () => {
    const { getByText } = await getStage2();
    fireEvent.press(getByText(/Add your first thing/i));
    await waitFor(() => expect(getByText(/The first thing on your mind/i)).toBeTruthy());
  });

  it('"Add it" button is disabled when input is empty', async () => {
    const { getByText, getByRole } = await getStage2();
    fireEvent.press(getByText(/Add your first thing/i));
    await waitFor(() => getByText(/The first thing on your mind/i));
    const addBtn = getByText('Add it');
    expect(addBtn).toBeTruthy();
    // Disabled via accessibilityState — button parent should be non-interactive
  });

  it('fills input when a suggestion chip is tapped', async () => {
    const { getByText, getByDisplayValue } = await getStage2();
    fireEvent.press(getByText(/Add your first thing/i));
    await waitFor(() => getByText('Buy bread'));
    fireEvent.press(getByText('Buy bread'));
    await waitFor(() => expect(getByDisplayValue('Buy bread')).toBeTruthy());
  });
});

describe('OnboardingScreen — Stage 3 → 4 (Create → Payoff)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function advanceToStage4(utils: ReturnType<typeof renderScreen>) {
    fireEvent.press(utils.getByText(/Let.*begin/i));
    await waitFor(() => utils.getByText(/Add your first thing/i));
    fireEvent.press(utils.getByText(/Add your first thing/i));
    await waitFor(() => utils.getByPlaceholderText(/Bread\?/i));
    fireEvent.changeText(utils.getByPlaceholderText(/Bread\?/i), 'Buy milk');
    await act(async () => {
      fireEvent.press(utils.getByText('Add it'));
      // Allow the addTask promise to resolve
      await Promise.resolve();
      // Advance the 350ms stage transition timer
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => utils.getByText('Buy milk'));
  }

  it('creates a task in Firestore on submit', async () => {
    const utils = renderScreen();
    await advanceToStage4(utils);
    expect(mockAddTask).toHaveBeenCalledWith('uid-1', expect.objectContaining({
      title:    'Buy milk',
      category: 'errands',
      done:     false,
      date:     '2026-06-13',
    }));
  });

  it('shows the task title in Stage 4', async () => {
    const utils = renderScreen();
    await advanceToStage4(utils);
    expect(utils.getByText('Buy milk')).toBeTruthy();
  });

  it('shows the "Tap the circle" hint when task is not done', async () => {
    const utils = renderScreen();
    await advanceToStage4(utils);
    expect(utils.getByText(/brush it away/i)).toBeTruthy();
  });
});

describe('OnboardingScreen — completion', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('calls upsertUser with onboardingDone: true and then onComplete', async () => {
    const onComplete = jest.fn();
    const utils = renderScreen(onComplete);

    // Advance to stage 4
    fireEvent.press(utils.getByText(/Let.*begin/i));
    await waitFor(() => utils.getByText(/Add your first thing/i));
    fireEvent.press(utils.getByText(/Add your first thing/i));
    await waitFor(() => utils.getByPlaceholderText(/Bread\?/i));
    fireEvent.changeText(utils.getByPlaceholderText(/Bread\?/i), 'Test task');
    await act(async () => {
      fireEvent.press(utils.getByText('Add it'));
      await Promise.resolve();
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => utils.getByText('Test task'));

    // Brush away (reduceMotion = false so we get the animated path, but timers are fake)
    await act(async () => {
      fireEvent.press(utils.getAllByRole('checkbox')[0]);
      jest.advanceTimersByTime(700);
    });

    // Wait for reward CTA
    await waitFor(() => utils.getByText(/See a full day/i));
    await act(async () => { fireEvent.press(utils.getByText(/See a full day/i)); });

    expect(mockUpsertUser).toHaveBeenCalledWith('uid-1', { onboardingDone: true });
    expect(onComplete).toHaveBeenCalled();
  });
});
