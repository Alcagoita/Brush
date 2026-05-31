module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-calendars|react-native-safe-area-context|react-native-swipe-gestures|recyclerlistview|memoize-one|react-native-reanimated|react-native-svg)/)',
  ],
};
