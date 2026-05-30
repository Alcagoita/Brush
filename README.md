# Brush

A location-aware to-do app for iOS and Android built with React Native.  
When you're near a Point of Interest tied to one of your tasks, the app surfaces a hero alert and offers a one-tap "Open in Maps" route.

---

## Tech Stack

- **Framework**: React Native 0.85
- **Auth**: Firebase Authentication (email/password, Google, Apple)
- **Database**: Firebase Firestore
- **Push notifications**: Firebase Cloud Messaging + Notifee
- **Geolocation**: react-native-geolocation-service
- **Maps**: Google Maps / Google Places API
- **Font**: Geist

---

## Getting Started

### Prerequisites

- Node >= 22.11.0
- Ruby (for CocoaPods)
- Xcode 15+ (iOS)
- Android Studio (Android)
- [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)

### Install dependencies

```sh
npm install
```

### iOS — install native deps

```sh
bundle install
bundle exec pod install
```

### Run

```sh
# iOS
npm run ios

# Android
npm run android

# Metro (separate terminal)
npm start
```

---

## Firebase Setup

### Android

Place `google-services.json` in `android/app/`.

### iOS

Place `GoogleService-Info.plist` in `ios/Agenda/`.

---

## Authentication Setup

### Email / Password

Enable in Firebase Console → Authentication → Sign-in method → Email/Password.

---

### Google Sign-In

**Firebase Console**
1. Authentication → Sign-in method → Google → Enable
2. Copy the **Web client ID** — it must match the `webClientId` in `src/services/auth.ts`

**Android** — no extra steps. `google-services.json` already contains the OAuth config.

**iOS**
1. Open `ios/Agenda.xcworkspace` in Xcode
2. Add the **reversed client ID** from `GoogleService-Info.plist` as a URL scheme:  
   Project → Info → URL Types → `+` → paste `REVERSED_CLIENT_ID` value

---

### Apple Sign-In (iOS only)

**Apple Developer Account**
1. Certificates, Identifiers & Profiles → Identifiers → select your App ID
2. Enable **Sign in with Apple** → Save

**Xcode**
1. Open `ios/Agenda.xcworkspace`
2. Select the `Agenda` target → **Signing & Capabilities**
3. Click **+ Capability** → add **Sign in with Apple**

**Firebase Console**
1. Authentication → Sign-in method → Apple → Enable
2. No extra keys needed — the `identityToken` from the device is verified server-side

> Apple Sign-In is only required for iOS App Store submissions that include other third-party social sign-in options. The button is hidden on Android automatically.

---

## Project Structure

```
src/
  screens/        — LoginScreen, TodayScreen, CalendarScreen, …
  components/     — ProgressRing, NearbyCard, TaskRow, PoiChip, …
  theme/          — tokens.ts, ThemeContext.tsx
  services/       — auth.ts, firestore.ts, geolocation.ts, maps.ts
  navigation/     — AppNavigator.tsx, navigationRef.ts
  hooks/          — useAuth.ts, useFCM.ts
  types/          — index.ts
docs/
  design/         — design handoff files
```

---

## Branching (Gitflow)

| Branch type | Cut from | Merges into | Naming |
|-------------|----------|-------------|--------|
| Feature | `develop` | `develop` | `KAN-XX-short-description` |
| Bugfix | `develop` | `develop` | `bugfix/short-description` |
| Release | `develop` | `main` + `develop` | `release/X.Y.Z` |
| Hotfix | `main` | `main` + `develop` | `hotfix/short-description` |

---

## Troubleshooting

- **Metro cache issues**: `npm start -- --reset-cache`
- **iOS build errors**: `bundle exec pod install --repo-update`
- **Android build errors**: `cd android && ./gradlew clean`
