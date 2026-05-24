/**
 * react-native.config.js
 *
 * Tells the React Native CLI where to find local font assets so they are
 * automatically copied to the native projects when you run:
 *
 *   npx react-native-asset
 *
 * This only needs to be run once after cloning, or whenever fonts change.
 * The copied files end up at:
 *   Android : android/app/src/main/assets/fonts/
 *   iOS     : ios/<AppName>/Fonts/ (also registered in Info.plist)
 */
module.exports = {
  assets: ['./src/assets/fonts/'],
};
