const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);
// Bundle the on-device POI classifier model (KAN-196) as an asset.
defaultConfig.resolver.assetExts.push('tflite');

const config = {};

module.exports = mergeConfig(defaultConfig, config);
