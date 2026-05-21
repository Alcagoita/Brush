# Firebase Local Emulator Suite

This guide explains how to run the app against local Firebase emulators instead
of the production project. Useful for development and E2E testing.

> **Prerequisite:** `src/config/env.ts` and `src/services/firebase.ts` must exist
> (introduced in the modular API migration). Confirm with:
> ```bash
> git log --oneline develop | grep "fix(ios).*modular"
> ```
> If the command returns no output, pull the latest `develop` before continuing.

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

# Force-restart individual services without stopping everything
firebase emulators:start --only auth,firestore --force-new
```

Emulator UIs are available at **http://localhost:4000** once started.

---

## 3. Enable emulator mode in the app

Open `src/config/env.ts` and set:

```typescript
export const USE_EMULATOR: boolean = __DEV__ && true;
```

`EMULATOR_HOST` is defined in the same file and auto-resolved based on platform:

```typescript
export const EMULATOR_HOST: string = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
```

> **Important:** Set `USE_EMULATOR` back to `false` (or keep `__DEV__ && false`)
> before building a release. Never ship an app pointed at the emulator.

---

## 4. How it works

`src/services/firebase.ts` reads both flags at module load time and calls the
modular connectors before any Firebase operation:

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

> **Note:** The `e2e:*` scripts require Detox and its native dependencies to be
> set up first. See the E2E testing setup guide (or the headers of `e2e/*.test.ts`)
> for prerequisites.

---

## 6. Persisting emulator data

Emulator data is ephemeral by default — wiped when the process stops. The
`./emulator-data` directory is listed in `.gitignore` (local only).

```bash
# Save state on exit
firebase emulators:start --export-on-exit ./emulator-data

# Restore saved state on next run
firebase emulators:start --import ./emulator-data
```

---

## 7. Firestore indexes

Complex queries (multiple `where` + `orderBy` clauses) require composite
indexes. In production these are deployed via `firestore.indexes.json`. In the
emulator they can be created on the fly through the Firestore UI at
**http://localhost:4000/firestore** — click **Indexes → Add index**.

The emulator auto-creates indexes on demand, so queries that would fail in
production may succeed locally. Always test complex queries against production
(or a staging project) before shipping. To deploy indexes to production:

```bash
firebase deploy --only firestore:indexes
```

---

## Troubleshooting

### App still hits production after enabling USE_EMULATOR

Metro caches modules aggressively. Restart Metro with a clean cache:

```bash
npx react-native start --reset-cache
```

To confirm the app is connecting to the emulator, watch the Metro terminal for
the `[Firebase] Using local emulators` log line on startup, or use the network
inspector in the emulator UI at **http://localhost:4000**.

### `EADDRINUSE` on port 8080 or 9099

Another process is using the port. Find and kill it:

```bash
lsof -ti :8080 | xargs kill -9
lsof -ti :9099 | xargs kill -9
```

### Auth emulator rejects sign-in

The emulator starts empty — existing production accounts are not available.
You must **sign up first** in each fresh emulator session.

Additional Auth emulator quirks to be aware of:
- Empty passwords are accepted (unlike production which requires ≥ 6 characters)
- User UIDs are randomly generated each session unless you use `--import` to
  restore a saved snapshot — don't hardcode UIDs in tests
