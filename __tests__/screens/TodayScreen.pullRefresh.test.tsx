import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { darkPalette, lightPalette } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/tokens';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockOnPullRefresh = jest.fn();
const mockHandleToggle = jest.fn();

let mockTheme: { palette: Palette; dark: boolean; language: 'en' | 'pt-PT' } = {
  palette: lightPalette,
  dark:    false,
  language:'en' as const,
};

const TASK = {
  id:        'task-1',
  title:     'Buy milk',
  category:  'errands' as const,
  done:      false,
  date:      '2026-06-01',
  createdAt: { toDate: () => new Date() } as any,
};

const DEFAULT_HOOK_RETURN = {
  tasks:                 [TASK],
  isLoading:             false,
  isRefreshing:          false,
  error:                 null,
  refresh:               mockRefresh,
  nearbyPoiType:         null,
  poiPlaces:             {},
  placeContext:          null,
  storeTuningActive:     false,
  showStoreTuningPrompt: false,
  onStoreTuningTurnOn:   jest.fn(),
  onStoreTuningNotNow:   jest.fn(),
  customCategories:      [],
  totalTasks:            1,
  doneTasks:             0,
  progress:              0,
  nearbyCount:           0,
  totalPoints:           0,
  inboxCount:            0,
  socialUnreadCount:     0,
  handleToggle:          mockHandleToggle,
  permissionGranted:     true,
  nearbyReady:           false,
  refreshProximity:      jest.fn(),
  isPullRefreshing:      false,
  showThrottleNotice:    false,
  onPullRefresh:         mockOnPullRefresh,
  errandBundle:          null,
  errandBundleLeisure:   null,
  dismissErrandBundle:   jest.fn(),
  tripSuggestion:        null,
  dismissTripSuggestion: jest.fn(),
};

let mockHookReturn = { ...DEFAULT_HOOK_RETURN };

jest.mock('../../src/hooks/useTodayScreen', () => ({
  useTodayScreen: () => mockHookReturn,
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'u1', displayName: 'Test', email: 'test@test.com' } }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, push: mockPush }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@react-navigation/native-stack', () => ({}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView, FlatList, Image } = require('react-native');
  const noop = () => {};
  const Animated = {
    View,
    Text,
    ScrollView,
    FlatList,
    Image,
    createAnimatedComponent: (c: unknown) => c,
  };
  return {
    __esModule:               true,
    default:                  Animated,
    useSharedValue:           (v: unknown) => ({ value: v }),
    useDerivedValue:          (fn: () => unknown) => ({ value: fn() }),
    useAnimatedStyle:         () => ({}),
    useAnimatedScrollHandler: () => noop,
    useAnimatedReaction:      noop,
    withTiming:               (v: unknown) => v,
    withRepeat:               (v: unknown) => v,
    withSequence:             (...args: unknown[]) => args[0],
    interpolate:              (_v: unknown, _i: unknown[], o: unknown[]) => o[0],
    Extrapolation:            { CLAMP: 'clamp' },
    Easing:                   { inOut: () => 'ease-in-out', cubic: 'cubic' },
    runOnJS:                  (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock('../../src/components/LoadingDots', () => {
  const { View } = require('react-native');
  return function MockLoadingDots({ color, size }: { color: string; size: number }) {
    return <View testID="loading-dots" style={{ backgroundColor: color, width: size }} />;
  };
});

jest.mock('../../src/components/Header', () => () => null);
jest.mock('../../src/components/ProgressRing', () => () => null);
jest.mock('../../src/components/NearbyCard', () => () => null);
jest.mock('../../src/components/ErrandBundleCard', () => () => null);
jest.mock('../../src/components/TripSuggestionCard', () => () => null);
jest.mock('../../src/components/NetworkBanner', () => () => null);
jest.mock('../../src/components/ContextChip', () => () => null);
jest.mock('../../src/components/NewTaskSheetHost', () => () => null);
jest.mock('../../src/components/StoreTuningPromptSheet', () => () => null);
jest.mock('../../src/components/ScrRotatingNudge', () => ({ __esModule: true, default: () => null }));
jest.mock('../../src/components/AppIcon', () => ({
  ChevronRightIcon: () => null,
  NavigateIcon:    () => null,
  PlusIcon:        () => null,
}));
jest.mock('../../src/components/TaskRow', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockTaskRow({ task, onToggle }: any) {
    return (
      <TouchableOpacity testID={`task-row-${task.id}`} onPress={() => onToggle(task.id, !task.done)}>
        <Text>{task.title}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../src/services/taskMutationSignal', () => ({
  consumeTasksDirty: jest.fn(() => false),
}));
import TodayScreen from '../../src/screens/TodayScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockTheme = {
    palette: lightPalette,
    dark:    false,
    language:'en',
  };
  mockHookReturn = { ...DEFAULT_HOOK_RETURN };
});

describe('TodayScreen pull-refresh indicator', () => {
  it('does not render the custom pull-refresh dots when not refreshing', () => {
    render(<TodayScreen />);

    expect(screen.queryByTestId('pull-refresh-loader')).toBeNull();
    expect(screen.queryByTestId('loading-dots')).toBeNull();
  });

  it('renders the light-theme pull-refresh dots while refreshing', () => {
    mockHookReturn = { ...DEFAULT_HOOK_RETURN, isPullRefreshing: true };

    render(<TodayScreen />);

    const dotsStyle = StyleSheet.flatten(screen.getByTestId('loading-dots').props.style);
    expect(screen.getByTestId('pull-refresh-loader')).toBeTruthy();
    expect(dotsStyle.backgroundColor).toBe(lightPalette.pullRefreshIndicator);
  });

  it('renders the dark-theme pull-refresh dots while refreshing', () => {
    mockTheme = {
      palette: darkPalette,
      dark:    true,
      language:'en',
    };
    mockHookReturn = { ...DEFAULT_HOOK_RETURN, isPullRefreshing: true };

    render(<TodayScreen />);

    const dotsStyle = StyleSheet.flatten(screen.getByTestId('loading-dots').props.style);
    expect(screen.getByTestId('pull-refresh-loader')).toBeTruthy();
    expect(dotsStyle.backgroundColor).toBe(darkPalette.pullRefreshIndicator);
  });
});
