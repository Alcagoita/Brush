/**
 * E2E tests — Event creation flow
 *
 * Prerequisites:
 *   - App built with `npm run e2e:build:ios` or `e2e:build:android`
 *   - Firebase Auth + Firestore emulators running:
 *       `firebase emulators:start --only auth,firestore`
 *   - USE_EMULATOR set to true in src/config/env.ts
 *
 * Tests cover:
 *   1. FAB opens AddEventModal
 *   2. Saving an event with valid data closes the modal and shows the event
 *   3. Saving without a title shows a "Missing title" alert
 *   4. Cancel closes the modal without creating an event
 */

import { by, device, element, expect, waitFor } from 'detox';

const testEmail = `e2e-events-${Date.now()}@agenda-test.com`;
const testPassword = 'Test1234!';

async function signUpAndLand() {
  await element(by.text("Don't have an account? Sign up")).tap();
  await element(by.label('Email address')).typeText(testEmail);
  await element(by.label('Password')).typeText(testPassword);
  await element(by.label('Create account')).tap();
  await waitFor(element(by.label('Add new event')))
    .toBeVisible()
    .withTimeout(10000);
}

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
  await signUpAndLand();
});

afterAll(async () => {
  await device.terminateApp();
});

beforeEach(async () => {
  // Reload the JS bundle between tests without re-launching the native app.
  await device.reloadReactNative();
  await waitFor(element(by.label('Add new event'))).toBeVisible().withTimeout(10000);
});

describe('Event creation', () => {
  it('opens AddEventModal when the FAB is tapped', async () => {
    await element(by.label('Add new event')).tap();
    await expect(element(by.text('New Event'))).toBeVisible();
    await expect(element(by.label('Event title'))).toBeVisible();
    await expect(element(by.label('Save event'))).toBeVisible();
    await expect(element(by.label('Cancel'))).toBeVisible();
  });

  it('closes the modal without creating an event when Cancel is tapped', async () => {
    await element(by.label('Add new event')).tap();
    await expect(element(by.text('New Event'))).toBeVisible();

    await element(by.label('Cancel')).tap();

    await expect(element(by.text('New Event'))).not.toBeVisible();
    await expect(element(by.label('Add new event'))).toBeVisible();
  });

  it('shows a "Missing title" alert when saving without a title', async () => {
    await element(by.label('Add new event')).tap();
    // Don't fill in a title
    await element(by.label('Save event')).tap();

    await waitFor(element(by.text('Missing title')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.text('OK')).tap();
  });

  it('creates an event and displays it in the day list', async () => {
    const eventTitle = `E2E Event ${Date.now()}`;

    await element(by.label('Add new event')).tap();

    // Fill in required fields
    await element(by.label('Event title')).tap();
    await element(by.label('Event title')).typeText(eventTitle);

    // Optionally change the start/end time
    await element(by.label('Start time')).clearText();
    await element(by.label('Start time')).typeText('10:00');
    await element(by.label('End time')).clearText();
    await element(by.label('End time')).typeText('11:00');

    await element(by.label('Save event')).tap();

    // Modal should close
    await waitFor(element(by.text('New Event')))
      .not.toBeVisible()
      .withTimeout(5000);

    // Event should appear in the list for today
    await waitFor(element(by.text(eventTitle)))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('displays event time range after creation', async () => {
    const eventTitle = `Timed Event ${Date.now()}`;

    await element(by.label('Add new event')).tap();
    await element(by.label('Event title')).typeText(eventTitle);
    await element(by.label('Start time')).clearText();
    await element(by.label('Start time')).typeText('14:00');
    await element(by.label('End time')).clearText();
    await element(by.label('End time')).typeText('15:30');
    await element(by.label('Save event')).tap();

    await waitFor(element(by.text(eventTitle))).toBeVisible().withTimeout(10000);
    await expect(element(by.text('14:00 – 15:30'))).toBeVisible();
  });
});
