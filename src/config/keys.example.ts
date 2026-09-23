/**
 * keys.example.ts — legacy local config template.
 *
 * No mobile source imports keys.ts anymore. The public OAuth client ID lives
 * in oauthClient.ts, and internal Places credentials never enter this folder.
 *
 * The Trip Planner's radius preview (KAN-321) uses react-native-maps instead
 * of a Google Static Maps key — see app.json's react-native-maps plugin
 * entry for the Android Maps SDK key (Android has no non-Google native map
 * provider; iOS uses Apple Maps by default, no key needed).
 */

export {};
