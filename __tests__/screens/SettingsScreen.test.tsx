/**
 * SettingsScreen tests — KAN-113
 *
 * Covers:
 *   - All 5 sections render (TASKS, APPEARANCE, LOCATION & BATTERY, IMPORT TASKS, ACCOUNT)
 *   - Settings rows: Manage Categories, Notification Preferences, Dark mode,
 *     Pause nearby alerts, import rows, Sign out
 *   - Dark mode toggle calls setDark
 *   - Low battery toggle: optimistic update + Firestore write
 *   - Notification Preferences item count: base 4 + custom category pois
 *   - Sign out triggers confirmation Alert
 *   - Back navigation
 *   - Footer renders app version
 *   - Firestore subscriptions are cleaned up on unmount
 */

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeLowBatteryPausePref = jest.fn();
const mockSetLowBatteryPausePref       = jest.fn();
const mockSubscribeToCategories        = jest.fn();
const mockLogout                       = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeLowBatteryPausePref: (...args: unknown[]) => mockSubscribeLowBatteryPausePref(...args),
  setLowBatteryPausePref:       (...args: unknown[]) => mockSetLowBatteryPausePref(...args),
  subscribeToCategories:        (...args: unknown[]) => mockSubscribeToCategories(...args),
}));

jest.mock('../../src/services/auth', () => ({
  logout: (...args: unknown[]) => mockLogout(...args),
}));

jest.mock('../../src/services/import', () => ({
  importFromGoogleTasks:    jest.fn(),
  importFromGoogleCalendar: jest.fn(),
  importFromReminders:      jest.fn(),
  importFromCalendar:       jest.fn(),
}), { virtual: true });

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({
    currentUser: { uid: 'test-uid', email: 'test@example.com', displayName: 'Jane Doe' },
  }),
}));

const mockGoBack   = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockSetDark = jest.fn();
let mockDark = false;
jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg:       '#fff',
      surface:  '#f6f5f1',
      surface2: '#efeeea',
      text:     '#1a1a18',
      muted:    '#8a8a85',
      faint:    '#bdbdb7',
      line:     'rgba(20,20,18,0.08)',
      accent:   '#e8a86a',
    },
    dark:    mockDark,
    setDark: mockSetDark,
  }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: Stub,
    Circle: Stub, Path: Stub, Rect: Stub, Line: Stub, Polygon: Stub,
  };
});

jest.mock('../../src/components/AppIcon', () => ({
  BatteryIcon:      () => null,
  BellIcon:         () => null,
  CalendarIcon:     () => null,
  ChevronLeftIcon:  () => null,
  ChevronRightIcon: () => null,
  GridIcon:         () => null,
  ListCheckIcon:    () => null,
  LogOutIcon:       () => null,
  MoonIcon:         () => null,
  SunIcon:          () => null,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import SettingsScreen from '../../src/screens/SettingsScreen';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noopUnsub = jest.fn();

function setupDefaultMocks() {
  mockSubscribeLowBatteryPausePref.mockReturnValue(noopUnsub);
  mockSubscribeToCategories.mockReturnValue(noopUnsub);
  mockSetLowBatteryPausePref.mockResolvedValue(undefined);
  mockLogout.mockResolvedValue(undefined);
}

function firePausePref(value: boolean) {
  const call = mockSubscribeLowBatteryPausePref.mock.calls[0];
  if (call) { act(() => { call[1](value); }); }
}

function fireCategories(items: object[]) {
  const call = mockSubscribeToCategories.mock.calls[0];
  if (call) { act(() => { call[1](items); }); }
}

function renderScreen() {
  return render(<SettingsScreen />);
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('SettingsScreen — KAN-113: rendering', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders without crashing', () => {
    renderScreen();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders TASKS section label', () => {
    renderScreen();
    expect(screen.getByText('TASKS')).toBeTruthy();
  });

  it('renders APPEARANCE section label', () => {
    renderScreen();
    expect(screen.getByText('APPEARANCE')).toBeTruthy();
  });

  it('renders LOCATION & BATTERY section label', () => {
    renderScreen();
    expect(screen.getByText('LOCATION & BATTERY')).toBeTruthy();
  });

  it('renders IMPORT TASKS section label', () => {
    renderScreen();
    expect(screen.getByText('IMPORT TASKS')).toBeTruthy();
  });

  it('renders ACCOUNT section label', () => {
    renderScreen();
    expect(screen.getByText('ACCOUNT')).toBeTruthy();
  });

  it('renders the footer with app version', () => {
    renderScreen();
    expect(screen.getByText(/Brush Away · v/)).toBeTruthy();
  });
});

// ─── TASKS section ────────────────────────────────────────────────────────────

describe('SettingsScreen — KAN-113: TASKS section', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders Manage Categories row', () => {
    renderScreen();
    expect(screen.getByLabelText('Manage Categories')).toBeTruthy();
  });

  it('navigates to Categories when Manage Categories is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Manage Categories'));
    expect(mockNavigate).toHaveBeenCalledWith('Categories');
  });

  it('renders Notification Preferences row', () => {
    renderScreen();
    expect(screen.getByLabelText('Notification Preferences')).toBeTruthy();
  });

  it('shows base count of 4 items when no custom categories', () => {
    renderScreen();
    fireCategories([]);
    expect(screen.getByText('4 items')).toBeTruthy();
  });

  it('adds custom poi types to the item count', () => {
    renderScreen();
    fireCategories([
      { id: 'cat1', name: 'Gym', color: '#fff', poi: 'gym',        isBuiltIn: false },
      { id: 'cat2', name: 'Bar', color: '#fff', poi: 'bar',        isBuiltIn: false },
      { id: 'cat3', name: 'Spa', color: '#fff', poi: 'gym',        isBuiltIn: false }, // duplicate poi
      { id: 'cat4', name: 'Sup', color: '#fff', poi: 'supermarket', isBuiltIn: false }, // already built-in
    ]);
    // unique new pois: gym, bar → +2 → total 6
    expect(screen.getByText('6 items')).toBeTruthy();
  });

  it('does not add built-in poi types from custom categories', () => {
    renderScreen();
    fireCategories([
      { id: 'c1', name: 'Drugstore', color: '#fff', poi: 'pharmacy', isBuiltIn: false },
    ]);
    expect(screen.getByText('4 items')).toBeTruthy();
  });
});

// ─── APPEARANCE section ───────────────────────────────────────────────────────

describe('SettingsScreen — KAN-113: APPEARANCE section', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); mockDark = false; });

  it('renders Dark mode row', () => {
    renderScreen();
    expect(screen.getByText('Dark mode')).toBeTruthy();
  });

  it('calls setDark when dark mode switch is toggled', () => {
    renderScreen();
    const toggle = screen.getByLabelText('Dark mode toggle');
    fireEvent(toggle, 'valueChange', true);
    expect(mockSetDark).toHaveBeenCalledWith(true);
  });
});

// ─── LOCATION & BATTERY section ───────────────────────────────────────────────

describe('SettingsScreen — KAN-113: LOCATION & BATTERY section', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders Pause nearby alerts row', () => {
    renderScreen();
    expect(screen.getByText('Pause nearby alerts on low battery')).toBeTruthy();
  });

  it('subscribes to low battery pref on mount', () => {
    renderScreen();
    expect(mockSubscribeLowBatteryPausePref).toHaveBeenCalledWith(
      'test-uid',
      expect.any(Function),
    );
  });

  it('reflects the stored pref value', () => {
    renderScreen();
    firePausePref(true);
    const toggle = screen.getByLabelText('Pause nearby alerts on low battery toggle');
    expect(toggle.props.value).toBe(true);
  });

  it('calls setLowBatteryPausePref when toggle is pressed', async () => {
    renderScreen();
    const toggle = screen.getByLabelText('Pause nearby alerts on low battery toggle');
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });
    expect(mockSetLowBatteryPausePref).toHaveBeenCalledWith('test-uid', true);
  });
});

// ─── IMPORT TASKS section ─────────────────────────────────────────────────────

describe('SettingsScreen — KAN-113: IMPORT TASKS section', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders at least one import row', () => {
    renderScreen();
    // Platform.OS is 'ios' in Jest — Reminders and Calendar
    const rows = screen.queryAllByRole('button');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('renders Google Tasks row on android', () => {
    const original = require('react-native').Platform.OS;
    Object.defineProperty(require('react-native').Platform, 'OS', { value: 'android', writable: true });
    try {
      renderScreen();
      expect(screen.getByLabelText('Google Tasks')).toBeTruthy();
    } finally {
      Object.defineProperty(require('react-native').Platform, 'OS', { value: original, writable: true });
    }
  });
});

// ─── ACCOUNT section ──────────────────────────────────────────────────────────

describe('SettingsScreen — KAN-113: ACCOUNT section', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders Sign out row', () => {
    renderScreen();
    expect(screen.getByLabelText('Sign out')).toBeTruthy();
  });

  it('shows a confirmation Alert when Sign out is pressed', () => {
    const spy = jest.spyOn(Alert, 'alert');
    renderScreen();
    fireEvent.press(screen.getByLabelText('Sign out'));
    expect(spy).toHaveBeenCalledWith(
      'Sign out',
      expect.any(String),
      expect.any(Array),
    );
  });

  it('calls logout when the destructive Alert button is confirmed', async () => {
    let confirmCb: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = (buttons as any[])?.find(b => b.style === 'destructive');
      confirmCb = destructive?.onPress;
    });
    renderScreen();
    fireEvent.press(screen.getByLabelText('Sign out'));
    await act(async () => { confirmCb?.(); });
    expect(mockLogout).toHaveBeenCalled();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('SettingsScreen — KAN-113: navigation', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('calls goBack when Back button is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ─── Subscription cleanup ─────────────────────────────────────────────────────

describe('SettingsScreen — KAN-113: subscription lifecycle', () => {
  it('unsubscribes from both subscriptions on unmount', () => {
    jest.clearAllMocks();
    const unsubPause = jest.fn();
    const unsubCats  = jest.fn();
    mockSubscribeLowBatteryPausePref.mockReturnValue(unsubPause);
    mockSubscribeToCategories.mockReturnValue(unsubCats);
    mockSetLowBatteryPausePref.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);

    const { unmount } = renderScreen();
    unmount();

    expect(unsubPause).toHaveBeenCalledTimes(1);
    expect(unsubCats).toHaveBeenCalledTimes(1);
  });
});
