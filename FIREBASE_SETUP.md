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

Import instances from the central module (modular API):
```typescript
import { db, authService, storageService } from './src/services/firebase';
// or import directly:
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
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

Point the app to the emulator by setting `USE_EMULATOR = true` in `src/config/env.ts`:

```typescript
// src/config/env.ts
export const USE_EMULATOR: boolean = __DEV__ && true;  // flip to false for production
```

The emulator host is resolved automatically — `localhost` on iOS simulator, `10.0.2.2` on Android emulator. Wiring is handled in `src/services/firebase.ts` via the modular `connectAuthEmulator` / `connectFirestoreEmulator` helpers.

---

## iOS CocoaPods — Podfile patches

`@react-native-firebase` v24 with `use_frameworks! :linkage => :static` on
React Native 0.85 (New Architecture) triggers a Clang module-ownership error
during the build:

```
Declaration of 'RCTBridgeModule' must be imported from module
'RNFBApp.RNFBAppModule' before it is required
```

The `ios/Podfile` `post_install` block applies **two fixes** — both are required:

**Fix 1 — Umbrella header patch** (solves `EmitSwiftModule` failures)
Injects `#import <RNFBApp/RNFBAppModule.h>` and `#import <RNFBApp/RCTConvert+FIRApp.h>`
before the first RNFB-specific import in the generated umbrella header of each
dependent pod (Auth, Crashlytics, Firestore, Messaging, Storage).

**Fix 2 — GCC_PREFIX_HEADER** (solves ObjC `.m` compilation failures)
Writes `Pods/RNFBCompat-prefix.h` and sets it as the prefix header for every
non-`RNFBApp` RNFB pod so the same pre-import happens in every ObjC compile unit.

Both fixes are re-applied automatically on every `pod install`. Confirm by
looking for these lines in the output:

```
✔ Patched RNFBAuth-umbrella.h
✔ Patched RNFBFirestore-umbrella.h
...
✔ Written RNFBCompat-prefix.h
✔ Prefix header applied to RNFBMessaging
```

**Known working configuration:**

| Tool        | Version |
|-------------|---------|
| CocoaPods   | 1.16.x  |
| Xcode       | 16.x    |
| RN Firebase | 24.x    |
| React Native| 0.85.x  |

---

## Modular API (`@react-native-firebase` v24)

Version 24 deprecates the namespaced API (`auth()`, `firestore()`, …) in favour
of a modular API that mirrors the Firebase Web SDK. **All app code must use the
modular API** — using the old namespaced API throws a runtime error.

### Auth

The modular functions live in a sub-path. A side-effect import is also required
to register the native module:

```typescript
import '@react-native-firebase/auth';                        // registers native module
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
} from '@react-native-firebase/auth/lib/modular';
```

### Firestore

```typescript
import {
  getFirestore,
  collection, doc, addDoc, setDoc, deleteDoc,
  onSnapshot, query, where, orderBy,
  serverTimestamp, initializeFirestore,
  connectFirestoreEmulator, CACHE_SIZE_UNLIMITED,
} from '@react-native-firebase/firestore';
```

### Messaging

```typescript
import {
  getMessaging, getToken, onMessage, onTokenRefresh,
  requestPermission, setBackgroundMessageHandler,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
```

### Crashlytics

```typescript
import {
  getCrashlytics, log, recordError, setUserId,
} from '@react-native-firebase/crashlytics';
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
