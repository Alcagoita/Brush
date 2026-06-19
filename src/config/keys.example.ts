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
 */

/** Google Places API (New) key — used only for server-side REST calls in maps.ts. */
export const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';

/** Google OAuth web client ID — from google-services.json / GoogleService-Info.plist. */
export const GOOGLE_OAUTH_WEB_CLIENT_ID = 'YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID';
