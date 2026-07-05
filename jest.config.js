module.exports = {
  preset: '@react-native/jest-preset',
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-firebase|@react-native-google-signin|react-native-calendars|react-native-safe-area-context|react-native-swipe-gestures|recyclerlistview|memoize-one|react-native-reanimated|react-native-worklets|react-native-svg|@react-navigation|@notifee|@invertase)/)',
  ],
  // Exclude e2e tests — they require a running device/emulator and are not
  // part of the unit test suite.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
  ],
  moduleNameMapper: {
    // Binary model asset — stub so Jest doesn't try to parse it as a module.
    '\\.tflite$': '<rootDir>/__mocks__/tfliteAsset.js',
  },
};
