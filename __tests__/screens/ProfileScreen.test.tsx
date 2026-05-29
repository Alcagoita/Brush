/**
 * KAN-29 — ProfileScreen notification preferences tests.
 *
 * Covers:
 *   - "Notification Preferences" section renders with all 4 built-in POI types
 *   - Default radii are shown before any Firestore preferences load
 *   - Stored preferences override defaults when the subscription fires
 *   - Pressing "+" increases the radius by 25 m and calls setPoiPreference
 *   - Pressing "−" decreases the radius by 25 m and calls setPoiPreference
 *   - Radius is clamped: "−" disabled at 25 m, "+" disabled at 500 m
 *   - setPoiPreference is NOT called when already at the limit
 *   - Custom categories with a poi field add extra rows
 *   - Custom categories without a poi field are not shown
 *   - Custom categories whose poi type duplicates a built-in are not doubled up
 *   - Two custom categories sharing the same poi type produce only one row
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToPoiPreferences = jest.fn();
const mockSetPoiPreference           = jest.fn();
const mockSubscribeToCategories      = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToPoiPreferences: (...args: unknown[]) => mockSubscribeToPoiPreferences(...args),
  setPoiPreference:          (...args: unknown[]) => mockSetPoiPreference(...args),
  subscribeToCategories:     (...args: unknown[]) => mockSubscribeToCategories(...args),
}));

// Maps — placeTypeLabel used to label custom poi types
jest.mock('../../src/services/maps', () => ({
  placeTypeLabel: (type: string) =>
    type === 'fitness_center' ? 'Fitness Center' :
    type === 'restaurant'     ? 'Restaurant'     :
    type === 'gym'            ? 'Gym'            :
    type,
}));

// Auth — return a fixed uid
jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
}));

// Navigation
const mockGoBack   = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

// Safe-area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Theme — minimal palette
jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg:       '#fff',
      surface2: '#eee',
      text:     '#000',
      muted:    '#999',
      faint:    '#ccc',
      line:     '#ddd',
      accent:   '#e8a86a',
    },
    dark:    false,
    setDark: jest.fn(),
  }),
}));

// AppIcon — stub all used icons; PoiIcon renders a testID so row icons are
// identifiable in tests without depending on SVG rendering.
jest.mock('../../src/components/AppIcon', () => ({
  ChevronLeftIcon: () => null,
  GridIcon:        () => null,
  LogOutIcon:      () => null,
  MoonIcon:        () => null,
  SunIcon:         () => null,
  PoiIcon:         ({ type }: { type: string }) => {
    const { View } = require('react-native');
    return <View testID={`poi-icon-${type}`} />;
  },
}));

// Auth service
jest.mock('../../src/services/auth', () => ({
  signOut: jest.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import ProfileScreen from '../../src/screens/ProfileScreen';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Capture the onUpdate callback passed to subscribeToPoiPreferences and return
 * a trigger function so tests can fire a simulated Firestore snapshot.
 */
function capturePrefsCallback(): (prefs: Record<string, number>) => void {
  let captured: ((prefs: Record<string, number>) => void) | null = null;
  mockSubscribeToPoiPreferences.mockImplementation(
    (_uid: string, onUpdate: (prefs: Record<string, number>) => void) => {
      captured = onUpdate;
      return jest.fn();
    },
  );
  return (prefs: Record<string, number>) => {
    if (captured) { act(() => { captured!(prefs); }); }
  };
}

/**
 * Capture the onUpdate callback passed to subscribeToCategories and return
 * a trigger function so tests can fire a simulated Firestore snapshot.
 */
function captureCategoriesCallback(): (cats: object[]) => void {
  let captured: ((cats: object[]) => void) | null = null;
  mockSubscribeToCategories.mockImplementation(
    (_uid: string, onUpdate: (cats: object[]) => void) => {
      captured = onUpdate;
      return jest.fn();
    },
  );
  return (cats: object[]) => {
    if (captured) { act(() => { captured!(cats); }); }
  };
}

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id:        'cat-1',
    name:      'Gym',
    color:     '#ff0000',
    poi:       'fitness_center',
    isBuiltIn: false,
    ...overrides,
  };
}

function renderScreen() {
  return render(<ProfileScreen />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProfileScreen — Notification Preferences (KAN-29)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetPoiPreference.mockResolvedValue(undefined);
    // Default: both subscriptions return a no-op unsubscribe with no snapshot.
    mockSubscribeToPoiPreferences.mockReturnValue(jest.fn());
    mockSubscribeToCategories.mockReturnValue(jest.fn());
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders the Notification Preferences section heading', () => {
    renderScreen();
    expect(screen.getByText('Notification Preferences')).toBeTruthy();
  });

  it('renders all 4 built-in POI type rows', () => {
    renderScreen();
    expect(screen.getByText('ATM')).toBeTruthy();
    expect(screen.getByText('Pharmacy')).toBeTruthy();
    expect(screen.getByText('Café')).toBeTruthy();
    expect(screen.getByText('Supermarket')).toBeTruthy();
  });

  it('shows default radii before any Firestore preference loads', () => {
    renderScreen();
    // ATM and Pharmacy default to 50 m; two instances expected.
    expect(screen.getAllByText('50 m')).toHaveLength(2);
    // Café and Supermarket default to 75 m; two instances expected.
    expect(screen.getAllByText('75 m')).toHaveLength(2);
  });

  // ── Subscription ────────────────────────────────────────────────────────────

  it('subscribes to Firestore preferences with the current user uid', () => {
    renderScreen();
    expect(mockSubscribeToPoiPreferences).toHaveBeenCalledWith(
      'test-uid',
      expect.any(Function),
    );
  });

  it('overrides defaults when Firestore preferences fire', () => {
    const firePrefs = capturePrefsCallback();
    renderScreen();
    firePrefs({ atm: 100, cafe: 150 });

    expect(screen.getByText('100 m')).toBeTruthy();
    expect(screen.getByText('150 m')).toBeTruthy();
    // Unchanged defaults are still shown.
    expect(screen.getAllByText('50 m')).toHaveLength(1); // pharmacy still 50 m
    expect(screen.getAllByText('75 m')).toHaveLength(1); // supermarket still 75 m
  });

  // ── Stepper — increase ───────────────────────────────────────────────────────

  it('increases ATM radius by 25 m when "+" is pressed', () => {
    renderScreen();
    // Before: ATM=50, Pharmacy=50 → two "50 m" labels.
    expect(screen.getAllByText('50 m')).toHaveLength(2);
    fireEvent.press(screen.getByLabelText('Increase ATM radius'));
    // After: only Pharmacy remains at 50 m; ATM moved to 75 m.
    expect(screen.getAllByText('50 m')).toHaveLength(1);
    expect(screen.getAllByText('75 m')).toHaveLength(3); // ATM + Café + Supermarket
  });

  it('calls setPoiPreference with the new radius when "+" is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Increase ATM radius'));
    expect(mockSetPoiPreference).toHaveBeenCalledWith('test-uid', 'atm', 75);
  });

  // ── Stepper — decrease ───────────────────────────────────────────────────────

  it('decreases Café radius by 25 m when "−" is pressed', () => {
    renderScreen();
    // Before: Café=75, Supermarket=75 → two "75 m" labels.
    expect(screen.getAllByText('75 m')).toHaveLength(2);
    fireEvent.press(screen.getByLabelText('Decrease Café radius'));
    // After: only Supermarket remains at 75 m; Café moved to 50 m.
    expect(screen.getAllByText('75 m')).toHaveLength(1);
    expect(screen.getAllByText('50 m')).toHaveLength(3); // ATM + Pharmacy + Café
  });

  it('calls setPoiPreference with the new radius when "−" is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Decrease Café radius'));
    expect(mockSetPoiPreference).toHaveBeenCalledWith('test-uid', 'cafe', 50);
  });

  // ── Clamping ────────────────────────────────────────────────────────────────

  it('does not decrease ATM below 25 m', () => {
    const firePrefs = capturePrefsCallback();
    renderScreen();
    firePrefs({ atm: 25 });

    fireEvent.press(screen.getByLabelText('Decrease ATM radius'));
    // setPoiPreference should NOT be called — already at minimum.
    expect(mockSetPoiPreference).not.toHaveBeenCalled();
    expect(screen.getByText('25 m')).toBeTruthy();
  });

  it('does not increase Supermarket above 500 m', () => {
    const firePrefs = capturePrefsCallback();
    renderScreen();
    firePrefs({ supermarket: 500 });

    fireEvent.press(screen.getByLabelText('Increase Supermarket radius'));
    expect(mockSetPoiPreference).not.toHaveBeenCalled();
    expect(screen.getByText('500 m')).toBeTruthy();
  });

  // ── Multiple presses ────────────────────────────────────────────────────────

  it('accumulates multiple presses correctly', () => {
    renderScreen();
    // ATM starts at 50 m — press "+" three times → 50 + 75 = 125 m.
    fireEvent.press(screen.getByLabelText('Increase ATM radius'));
    fireEvent.press(screen.getByLabelText('Increase ATM radius'));
    fireEvent.press(screen.getByLabelText('Increase ATM radius'));
    expect(screen.getByText('125 m')).toBeTruthy();
    expect(mockSetPoiPreference).toHaveBeenLastCalledWith('test-uid', 'atm', 125);
    expect(mockSetPoiPreference).toHaveBeenCalledTimes(3);
  });

  // ── Custom categories ────────────────────────────────────────────────────────

  it('subscribes to categories with the current user uid', () => {
    renderScreen();
    expect(mockSubscribeToCategories).toHaveBeenCalledWith(
      'test-uid',
      expect.any(Function),
    );
  });

  it('adds a row for a custom category that has a poi type', () => {
    const fireCategories = captureCategoriesCallback();
    renderScreen();
    fireCategories([makeCategory({ poi: 'fitness_center' })]);
    // placeTypeLabel('fitness_center') → 'Fitness Center' (mocked above)
    expect(screen.getByText('Fitness Center')).toBeTruthy();
  });

  it('does not add a row for a custom category without a poi type', () => {
    const fireCategories = captureCategoriesCallback();
    renderScreen();
    fireCategories([makeCategory({ poi: null })]);
    expect(screen.queryByText('Fitness Center')).toBeNull();
  });

  it('does not duplicate a built-in row when a custom category shares its poi type', () => {
    const fireCategories = captureCategoriesCallback();
    renderScreen();
    // 'atm' is already a built-in row — no second ATM row should appear.
    fireCategories([makeCategory({ poi: 'atm' })]);
    expect(screen.getAllByText('ATM')).toHaveLength(1);
  });

  it('shows only one row when two custom categories share the same poi type', () => {
    const fireCategories = captureCategoriesCallback();
    renderScreen();
    fireCategories([
      makeCategory({ id: 'cat-1', name: 'Gym',     poi: 'fitness_center' }),
      makeCategory({ id: 'cat-2', name: 'Pilates', poi: 'fitness_center' }),
    ]);
    expect(screen.getAllByText('Fitness Center')).toHaveLength(1);
  });

  it('custom category row defaults to 75 m (matching proximity engine default)', () => {
    const fireCategories = captureCategoriesCallback();
    renderScreen();
    // Before: Café + Supermarket show 75 m → 2 labels.
    expect(screen.getAllByText('75 m')).toHaveLength(2);
    fireCategories([makeCategory({ poi: 'restaurant' })]);
    // After: restaurant row adds a third 75 m label (DEFAULT_CUSTOM_RADIUS).
    expect(screen.getAllByText('75 m')).toHaveLength(3);
  });

  it('custom category stepper calls setPoiPreference with the correct poi type', () => {
    const fireCategories = captureCategoriesCallback();
    renderScreen();
    fireCategories([makeCategory({ poi: 'fitness_center' })]);

    // fitness_center starts at 75 m; pressing + should go to 100 m.
    fireEvent.press(screen.getByLabelText('Increase Fitness Center radius'));
    expect(mockSetPoiPreference).toHaveBeenCalledWith('test-uid', 'fitness_center', 100);
  });
});
