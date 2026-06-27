/**
 * eas-post-install.js
 *
 * Runs on EAS Build after `npm install`, before the native build.
 * Swaps Firebase SDK config files to match the build profile:
 *
 *   production → brush-away-prod (PROD Firebase project)
 *   everything else → brush-away (QA Firebase project, default)
 *
 * EAS sets EAS_BUILD_PROFILE automatically to the profile name.
 */

const fs   = require('fs');
const path = require('path');

const profile = process.env.EAS_BUILD_PROFILE ?? '';
const isProd  = profile === 'production';

const root = path.join(__dirname, '..');

if (isProd) {
  console.log('[eas-post-install] profile=production — switching to PROD Firebase config');

  const androidSrc  = path.join(root, 'android', 'app', 'google-services-prod.json');
  const androidDest = path.join(root, 'android', 'app', 'google-services.json');
  fs.copyFileSync(androidSrc, androidDest);
  console.log('[eas-post-install] Android: google-services-prod.json → google-services.json');

  const iosSrc  = path.join(root, 'ios', 'Brush', 'GoogleService-Info-Prod.plist');
  const iosDest = path.join(root, 'ios', 'Brush', 'GoogleService-Info.plist');
  fs.copyFileSync(iosSrc, iosDest);
  console.log('[eas-post-install] iOS: GoogleService-Info-Prod.plist → GoogleService-Info.plist');

  console.log('[eas-post-install] Done. Native build will use brush-away-prod.');
} else {
  console.log(`[eas-post-install] profile=${profile || '(none)'} — keeping QA Firebase config (brush-away)`);
}
