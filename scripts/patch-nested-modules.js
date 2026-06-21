#!/usr/bin/env node
// Patches nested node_modules that patch-package cannot target.
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

const EXPO_CONSTANTS_PATH = path.join(
  __dirname, '..', 'node_modules', 'expo', 'node_modules', 'expo-constants',
  'scripts', 'get-app-config-android.gradle'
);

const NODE_BINARY_BLOCK =
  'def localProps = new Properties()\n' +
  'def localPropsFile = new File(rootProject.projectDir, "local.properties")\n' +
  'if (localPropsFile.exists()) { localPropsFile.withInputStream { localProps.load(it) } }\n' +
  'def nodeBinary = localProps.getProperty("NODE_BINARY", "node")\n';

// Fix: expo/node_modules/expo-constants get-app-config-android.gradle
// Uses hardcoded "node" — replace with NODE_BINARY from local.properties.
patchFile(EXPO_CONSTANTS_PATH, [
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
