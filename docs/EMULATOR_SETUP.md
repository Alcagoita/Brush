# Firebase Local Emulator Suite

This guide explains how to run the app against local Firebase emulators instead
of the production project. Useful for development and E2E testing.

---

## Why use the emulator?

- No cost — reads/writes don't hit production quotas
- Safe — test destructive operations (delete user, wipe collection) without risk
- Fast — no network latency
- Required for E2E tests (Detox)

---

## 1. Install the Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

---

## 2. Start the emulators

```bash
# Auth + Firestore only (enough for most development)
firebase emulators:start --only auth,firestore

# All services used by the app
firebase emulators:start --only auth,firestore,storage
```

Emulator UIs are available at **http://localhost:4000** once started.

---

## 3. Enable emulator mode in the app

Open `src/config/env.ts` and set:

```typescript
export const USE_EMULATOR: boolean = __DEV__ && true;
```

> **Important:** Set this back to `false` (or keep `__DEV__ && false`) before
> building a release. Never ship an app pointed at the emulator.

---

## 4. How it works

`src/services/firebase.ts` reads the `USE_EMULATOR` flag at module load time
and calls the modular connectors before any Firebase operation:

```typescript
import { connectAuthEmulator } from '@react-native-firebase/auth/lib/modular';
import { connectFirestoreEmulator } from '@react-native-firebase/firestore';

if (USE_EMULATOR) {
  connectAuthEmulator(getAuth(), `http://${EMULATOR_HOST}:9099`);
  connectFirestoreEmulator(getFirestore(), EMULATOR_HOST, 8080);
}
```

The host is resolved per platform:

| Platform          | Host        |
|-------------------|-------------|
| iOS Simulator     | `localhost` |
| Android Emulator  | `10.0.2.2`  |

---

## 5. E2E tests

Detox E2E tests require the emulators to be running before the test suite
starts. See the test file headers for the exact set of services needed:

```bash
# Auth tests
firebase emulators:start --only auth

# Event tests
firebase emulators:start --only auth,firestore
```

Then run the tests:

```bash
npm run e2e:build:ios
npm run e2e:test:ios
```

---

## 6. Resetting emulator data

Emulator data is ephemeral by default — it is wiped when the process stops.
To persist data between sessions use the `--export-on-exit` / `--import` flags:

```bash
# Save state on exit
firebase emulators:start --export-on-exit ./emulator-data

# Restore saved state
firebase emulators:start --import ./emulator-data
```

---

## Troubleshooting

### App still hits production after enabling USE_EMULATOR

Metro caches modules aggressively. Restart Metro with a clean cache:

```bash
npx react-native start --reset-cache
```

### `EADDRINUSE` on port 8080 or 9099

Another process is using the port. Find and kill it:

```bash
lsof -ti :8080 | xargs kill -9
lsof -ti :9099 | xargs kill -9
```

### Auth emulator rejects sign-in

The emulator starts empty. You must **sign up first** — existing production
accounts are not available in the emulator.
