/**
 * keys.example.ts — API key template.
 *
 * How to set up:
 *   1. Copy this file to src/config/keys.ts
 *   2. Replace 'YOUR_GOOGLE_PLACES_API_KEY' with your real key.
 *   3. keys.ts is gitignored — it will never be committed.
 *
 * How to obtain a key:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create a new API key under the "Agenda" project.
 *   3. Restrict the key to "Places API (New)" only.
 *   4. Optionally add an Android/iOS app restriction to lock it to the bundle ID.
 *
 * Enabled APIs (must be active in the Cloud Console for the key to work):
 *   - Places API (New)  →  https://console.cloud.google.com/apis/library/places.googleapis.com
 *
 * Static map preview (maps.ts's buildStaticMapPreviewUrl, used by the Trip
 * Planner) needs its own pair of keys — an Android-app-restricted key and an
 * iOS-app-restricted key — instead of the plain GOOGLE_PLACES_API_KEY above.
 * A plain `fetch()`-style REST call carries no app signature, so an
 * Android/iOS-app-restricted key rejects it with a silent 403; the Static
 * Maps request going out through <Image> IS a real app request the
 * restriction can verify, so each platform needs its matching key:
 *   1. Create two more keys under the same project.
 *   2. Restrict each to "Maps Static API" only.
 *   3. Restrict one to "Android apps" (package name + SHA-1), the other to
 *      "iOS apps" (bundle ID).
 *   - Maps Static API  →  https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
 */

/** Google Places API (New) key — used only for server-side REST calls in maps.ts. */
export const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';

/** Google Maps Static API key, restricted to the Android app (package + SHA-1) in Cloud Console. */
export const GOOGLE_MAPS_STATIC_ANDROID_API_KEY = 'YOUR_GOOGLE_MAPS_STATIC_ANDROID_API_KEY';

/** Google Maps Static API key, restricted to the iOS app (bundle ID) in Cloud Console. */
export const GOOGLE_MAPS_STATIC_IOS_API_KEY = 'YOUR_GOOGLE_MAPS_STATIC_IOS_API_KEY';

/** Google OAuth web client ID — from google-services.json / GoogleService-Info.plist. */
export const GOOGLE_OAUTH_WEB_CLIENT_ID = 'YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID';
