// Global RNFB mocks — @react-native-firebase/app has no usable Jest (node)
// environment: it either falls back to the 'firebase' web SDK's ESM build
// (which Jest can't parse) or tries to reach a native module that doesn't
// exist under Jest, depending on which sub-package loads it first. Any test
// file that pulls in the src/services/firestore barrel transitively requires
// @react-native-firebase/auth and @react-native-firebase/analytics, so both
// are mocked here once instead of in every test file.
//
// Individual test files can still override these with their own
// jest.mock('@react-native-firebase/auth', ...) calls when they need
// specific currentUser/analytics behavior — a local jest.mock() takes
// precedence over this file for that test file.

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  connectAuthEmulator: jest.fn(),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({ logEvent: jest.fn(() => Promise.resolve()) })),
}));
