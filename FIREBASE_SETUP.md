# Firebase Setup Guide

## Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) — `npm install -g firebase-tools`
- [Xcode](https://developer.apple.com/xcode/) (for iOS builds)
- [Android Studio](https://developer.android.com/studio) + Android SDK (for Android builds)
- Java 17+ (required by Gradle 9.x) — `brew install openjdk@17`
- Access to the **vibe-agenda** Firebase project (request from the project owner)

---

## First-Time Setup

### 1. Login to Firebase CLI
```bash
firebase login
```

### 2. Download config files
These files contain sensitive API keys and are **not committed to git**. Download them after cloning:

```bash
# Android
firebase apps:sdkconfig ANDROID 1:463435762915:android:422f81789b25c3a09249d6 \
  --project vibe-agenda > android/app/google-services.json

# iOS
firebase apps:sdkconfig IOS 1:463435762915:ios:11415e7c9a36dc349249d6 \
  --project vibe-agenda > ios/Agenda/GoogleService-Info.plist
```

### 3. Install JS dependencies
```bash
npm install
```

### 4. Install iOS native dependencies
```bash
cd ios && LANG=en_US.UTF-8 pod install && cd ..
```

### 5. Run the app
```bash
# Android
npx react-native run-android

# iOS (always open .xcworkspace, not .xcodeproj)
npx react-native run-ios
```

---

## Switching Environments

| Environment | Firebase Project |
|---|---|
| `dev` | `vibe-agenda-dev` |
| `staging` | `vibe-agenda-staging` |
| `prod` | `vibe-agenda` |

```bash
bash scripts/switch-env.sh dev      # switch to development
bash scripts/switch-env.sh staging  # switch to staging
bash scripts/switch-env.sh prod     # switch to production
```

> ⚠️ After switching environments, re-download the config files for that project.

---

## Firebase Services

| Service | Module | Usage |
|---|---|---|
| Firestore | `@react-native-firebase/firestore` | Event data sync |
| Auth | `@react-native-firebase/auth` | User authentication |
| Storage | `@react-native-firebase/storage` | File/image attachments |
| Messaging | `@react-native-firebase/messaging` | Push notifications |

Import all services from the central module:
```typescript
import { db, authService, storageService, messaging } from './src/services/firebase';
```

### Health check on startup
```typescript
import { checkFirebaseConnection } from './src/services/firebase';

await checkFirebaseConnection((error) => {
  console.error('Firebase unavailable:', error.message);
  // show offline banner, disable sync features, etc.
});
```

---

## Local Emulator Suite

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,auth
```

Point the app to the emulator in development:
```typescript
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

if (__DEV__) {
  firestore().useEmulator('localhost', 8080);
  auth().useEmulator('http://localhost:9099');
}
```

---

## Troubleshooting

### `pod install` fails with encoding error
```bash
LANG=en_US.UTF-8 pod install
```

### Xcode build fails — "FirebaseCore not found"
Make sure you're opening `Agenda.xcworkspace` (not `Agenda.xcodeproj`):
```bash
xed ios/Agenda.xcworkspace
```

### Android build fails — "google-services.json not found"
Re-download the config file (see step 2 above). Make sure it lands in `android/app/`, not the root.

### `FirebaseApp.configure()` crash on iOS
Check that `GoogleService-Info.plist` is present in `ios/Agenda/` and is valid JSON. Re-download if in doubt.

### Android release build crashes
Firebase classes may be stripped by R8. ProGuard rules are already configured in `android/app/proguard-rules.pro`. If issues persist, verify `minifyEnabled true` is set in your release build type.

### Push notifications not working on iOS
Ensure APNs authentication key is uploaded in the Firebase console:
**Project Settings → Cloud Messaging → APNs Authentication Key**
