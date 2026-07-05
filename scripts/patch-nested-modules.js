#!/usr/bin/env node
// Patches node_modules files that either:
//   (a) patch-package cannot target (nested node_modules), or
//   (b) are better expressed as simple text replacements.
// Run after patch-package in postinstall.

const fs = require('fs');
const path = require('path');

function patchFile(filePath, patches) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[patch-nested] WARNING: ${filePath} not found, skipping`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of patches) {
    if (content.includes(to)) continue; // already patched
    if (!content.includes(from)) {
      console.error(`[patch-nested] ERROR: expected string not found in ${path.basename(filePath)}:\n  ${from.slice(0, 80)}`);
      process.exit(1);
    }
    content = content.replaceAll(from, to);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`[patch-nested] Patched ${filePath}`);
  }
}

// npm's hoisting of expo-constants (nested under expo/node_modules/ vs
// top-level node_modules/) isn't stable across installs — it flips depending
// on what else is in the dependency tree (e.g. adding expo-asset moved it to
// top-level). Patch whichever copy actually exists so this doesn't silently
// stop working next time `npm install` re-hoists things.
const EXPO_CONSTANTS_CANDIDATES = [
  path.join(__dirname, '..', 'node_modules', 'expo-constants', 'scripts', 'get-app-config-android.gradle'),
  path.join(__dirname, '..', 'node_modules', 'expo', 'node_modules', 'expo-constants', 'scripts', 'get-app-config-android.gradle'),
].filter(fs.existsSync);

const NODE_BINARY_BLOCK =
  'def localProps = new Properties()\n' +
  'def localPropsFile = new File(rootProject.projectDir, "local.properties")\n' +
  'if (localPropsFile.exists()) { localPropsFile.withInputStream { localProps.load(it) } }\n' +
  'def nodeBinary = localProps.getProperty("NODE_BINARY", "node")\n';

// Fix: react-native-share-menu Android SDK levels (upstream ships with API 29/SDK 29; we target 36)
// and iOS module import path (bare import fails with use_frameworks! :linkage => :static).
const SHARE_MENU_ROOT = path.join(__dirname, '..', 'node_modules', 'react-native-share-menu');

patchFile(path.join(SHARE_MENU_ROOT, 'android', 'build.gradle'), [
  ['compileSdkVersion 29\n    buildToolsVersion "29.0.2"', 'compileSdkVersion 36'],
  ['minSdkVersion 16', 'minSdkVersion 24'],
  ['targetSdkVersion 29', 'targetSdkVersion 36'],
]);

patchFile(path.join(SHARE_MENU_ROOT, 'ios', 'ShareMenuManager.m'), [
  ['#import "RNShareMenu-Swift.h"', '#import <RNShareMenu/RNShareMenu-Swift.h>'],
]);

// Fix: expo-constants get-app-config-android.gradle uses hardcoded "node" —
// replace with NODE_BINARY from local.properties. Patch every copy present
// (see EXPO_CONSTANTS_CANDIDATES comment above — hoisting isn't stable).
for (const expoConstantsPath of EXPO_CONSTANTS_CANDIDATES) {
  patchFile(expoConstantsPath, [
    // Insert local.properties reader block after the Os import
    [
      'import org.apache.tools.ant.taskdefs.condition.Os\n\n\ndef expoConstantsDir',
      'import org.apache.tools.ant.taskdefs.condition.Os\n\n' + NODE_BINARY_BLOCK + '\ndef expoConstantsDir',
    ],
    // Fix hardcoded "node" in providers.exec commandLine
    [
      '  commandLine("node", "-e", "console.log(require(\'path\').dirname(require.resolve(\'expo-constants/package.json\')));")' ,
      '  commandLine(nodeBinary, "-e", "console.log(require(\'path\').dirname(require.resolve(\'expo-constants/package.json\')));")' ,
    ],
    // Fix hardcoded ["node"] fallback in nodeExecutableAndArgs
    [
      'def nodeExecutableAndArgs = config.nodeExecutableAndArgs ?: ["node"]',
      'def nodeExecutableAndArgs = config.nodeExecutableAndArgs ?: [nodeBinary]',
    ],
  ]);
}
