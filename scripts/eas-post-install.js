/**
 * eas-post-install.js
 *
 * Runs on EAS Build after `npm install`, before the native build.
 * Swaps Firebase SDK config files to match the build profile:
 *
 *   production  → brush-away     (PROD Firebase project)
 *   dev/staging → brush-away-dev (DEV Firebase project — default committed state)
 *
 * The committed google-services.json / GoogleService-Info.plist already point
 * to brush-away-dev, so dev/staging builds are a no-op.
 * Production builds overwrite them with the -prod variants.
 *
 * EAS sets EAS_BUILD_PROFILE automatically to the profile name.
 */

const fs   = require('fs');
const path = require('path');

const KNOWN_PROFILES = new Set(['development', 'staging', 'production']);

const profile = process.env.EAS_BUILD_PROFILE ?? '';

if (!KNOWN_PROFILES.has(profile)) {
  console.error(`[eas-post-install] ERROR: unknown EAS_BUILD_PROFILE="${profile}". Expected one of: ${[...KNOWN_PROFILES].join(', ')}`);
  process.exit(1);
}

const root = path.join(__dirname, '..');

if (profile === 'production') {
  console.log('[eas-post-install] profile=production — switching to PROD Firebase config (brush-away)');

  const androidSrc  = path.join(root, 'android', 'app', 'google-services-prod.json');
  const androidDest = path.join(root, 'android', 'app', 'google-services.json');
  fs.copyFileSync(androidSrc, androidDest);
  console.log('[eas-post-install] Android: google-services-prod.json → google-services.json');

  const iosSrc  = path.join(root, 'ios', 'Brush', 'GoogleService-Info-Prod.plist');
  const iosDest = path.join(root, 'ios', 'Brush', 'GoogleService-Info.plist');
  fs.copyFileSync(iosSrc, iosDest);
  console.log('[eas-post-install] iOS: GoogleService-Info-Prod.plist → GoogleService-Info.plist');

  console.log('[eas-post-install] Done. Native build will use brush-away (PROD).');
} else {
  console.log(`[eas-post-install] profile=${profile} — keeping DEV Firebase config (brush-away-dev)`);
}
