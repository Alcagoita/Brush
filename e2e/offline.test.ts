/**
 * E2E tests — Airplane-mode / offline-first flow (KAN-227)
 *
 * Prerequisites:
 *   - App built with `npm run e2e:build:ios` or `e2e:build:android`
 *   - Firebase Auth + Firestore emulators running:
 *       `firebase emulators:start --only auth,firestore`
 *   - USE_EMULATOR set to true in src/config/env.ts
 *
 * Network simulation: Detox has no cross-platform "toggle real OS airplane
 * mode" API. This suite uses `device.setURLBlacklist(['.*'])` instead — the
 * standard Detox pattern for simulating network failure by blocking all
 * outgoing requests at the native layer. This is enough to exercise
 * Firestore's offline persistence and this app's offline queue/retry paths,
 * but it does NOT flip the OS network-interface state that
 * @react-native-community/netinfo reads — so NetworkBanner (driven by
 * NetInfo) will NOT necessarily show "offline" under this simulation. See
 * docs/offline-gaps.md for the full explanation and what this suite does
 * and doesn't prove.
 *
 * Flow covered (per KAN-227 AC):
 *   1. Sign in (online), land on Today
 *   2. Go offline (setURLBlacklist)
 *   3. Create a task (quick-add sheet) — works offline via Firestore's
 *      local-first optimistic writes
 *   4. Brush it away — ring/progress updates immediately, offline
 *   5. Kill the app while still offline (device.launchApp({ newInstance: true }))
 *   6. Relaunch — the brushed task and ring state must survive the kill
 *      (this is the "no data loss across app kill while offline" AC)
 *   7. Go back online (clear the URL blacklist)
 *   8. Confirm no error state / the app doesn't get stuck — a background
 *      Firestore sync is expected to reconcile automatically; this suite
 *      doesn't assert a specific "synced" indicator since none exists in
 *      the UI today (see docs/offline-gaps.md).
 */

import { by, device, element, expect, waitFor } from 'detox';

const testEmail = `e2e-offline-${Date.now()}@brush-test.com`;
const testPassword = 'Test1234!';
const taskTitle = 'Buy milk offline test';

async function signUpAndLandOnToday() {
  await element(by.text("Don't have an account? Sign up")).tap();
  await element(by.label('Email address')).tap();
  await element(by.label('Email address')).typeText(testEmail);
  await element(by.label('Password')).tap();
  await element(by.label('Password')).typeText(testPassword);
  await element(by.label('Create account')).tap();

  // Today is the landing screen after login (see CLAUDE.md).
  await waitFor(element(by.label('Add task')))
    .toBeVisible()
    .withTimeout(10000);
}

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
  await signUpAndLandOnToday();
});

afterAll(async () => {
  // Always restore network access, even if an assertion above failed.
  await device.setURLBlacklist([]);
  await device.terminateApp();
});

describe('Airplane-mode / offline-first flow', () => {
  it('goes offline', async () => {
    await device.setURLBlacklist(['.*']);
  });

  it('creates a task while offline', async () => {
    await element(by.label('Add task')).tap();
    await element(by.label('What do you need?')).tap();
    await element(by.label('What do you need?')).typeText(taskTitle);
    await element(by.label('Market')).tap(); // POI quick-pick, matches CATEGORY_POI_MAP
    await element(by.label('Add it')).tap();

    await waitFor(element(by.text(taskTitle)))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('brushes the task away while offline and the ring updates immediately', async () => {
    await element(by.label(`Brush away ${taskTitle}`)).tap();

    // The checkbox becomes an "Unbrush" action once done — proves the local
    // optimistic state committed without any network round-trip.
    await waitFor(element(by.label(`Unbrush ${taskTitle}`)))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('survives an app kill while still offline — no data loss', async () => {
    // Cold relaunch — Firestore's on-device cache (CACHE_SIZE_UNLIMITED,
    // src/services/firebase.ts) and the auth session must both survive this.
    await device.launchApp({ newInstance: true });

    await waitFor(element(by.label(`Unbrush ${taskTitle}`)))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('goes back online without erroring or getting stuck', async () => {
    await device.setURLBlacklist([]);

    // No explicit "synced" indicator exists in the UI today — this just
    // confirms the app is still responsive and the brushed task is still
    // shown correctly once connectivity returns.
    await waitFor(element(by.label(`Unbrush ${taskTitle}`)))
      .toBeVisible()
      .withTimeout(10000);
  });
});
