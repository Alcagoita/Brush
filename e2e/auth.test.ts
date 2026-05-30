/**
 * E2E tests — Authentication flow
 *
 * Prerequisites:
 *   - App built with `npm run e2e:build:ios` or `e2e:build:android`
 *   - Firebase Auth emulator running: `firebase emulators:start --only auth`
 *   - USE_EMULATOR set to true in src/config/env.ts
 *
 * Tests cover:
 *   1. App launches and shows LoginScreen
 *   2. Sign-up creates an account and navigates to CalendarScreen
 *   3. Sign-out returns to LoginScreen
 *   4. Sign-in with existing credentials navigates to CalendarScreen
 *   5. Wrong password shows an error alert
 */

import { by, device, element, expect, waitFor } from 'detox';

// Unique email per test run to avoid conflicts in the Auth emulator.
const testEmail = `e2e-${Date.now()}@agenda-test.com`;
const testPassword = 'Test1234!';
const wrongPassword = 'WrongPass!';

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
});

afterAll(async () => {
  await device.terminateApp();
});

describe('Authentication', () => {
  it('shows the Login screen on first launch', async () => {
    await expect(element(by.text('Brush'))).toBeVisible();
    await expect(element(by.text('Sign in to continue'))).toBeVisible();
    await expect(element(by.label('Email address'))).toBeVisible();
    await expect(element(by.label('Password'))).toBeVisible();
    await expect(element(by.label('Sign in'))).toBeVisible();
  });

  it('switches between sign-in and sign-up modes', async () => {
    await element(by.text("Don't have an account? Sign up")).tap();
    await expect(element(by.text('Create your account'))).toBeVisible();
    await expect(element(by.label('Create account'))).toBeVisible();

    await element(by.text('Already have an account? Sign in')).tap();
    await expect(element(by.text('Sign in to continue'))).toBeVisible();
  });

  it('creates a new account and navigates to the Calendar', async () => {
    // Switch to sign-up
    await element(by.text("Don't have an account? Sign up")).tap();

    // Fill in credentials
    await element(by.label('Email address')).tap();
    await element(by.label('Email address')).typeText(testEmail);
    await element(by.label('Password')).tap();
    await element(by.label('Password')).typeText(testPassword);

    // Submit
    await element(by.label('Create account')).tap();

    // Should land on CalendarScreen
    await waitFor(element(by.text('Brush')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.label('Add new event'))).toBeVisible();
    await expect(element(by.label('Sign out'))).toBeVisible();
  });

  it('signs out and returns to LoginScreen', async () => {
    await element(by.label('Sign out')).tap();
    await waitFor(element(by.text('Sign in to continue')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('signs in with valid credentials and navigates to Calendar', async () => {
    await element(by.label('Email address')).tap();
    await element(by.label('Email address')).clearText();
    await element(by.label('Email address')).typeText(testEmail);
    await element(by.label('Password')).tap();
    await element(by.label('Password')).clearText();
    await element(by.label('Password')).typeText(testPassword);
    await element(by.label('Sign in')).tap();

    await waitFor(element(by.label('Add new event')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('shows an error alert on wrong password', async () => {
    // Sign out first
    await element(by.label('Sign out')).tap();
    await waitFor(element(by.text('Sign in to continue'))).toBeVisible().withTimeout(5000);

    // Attempt sign-in with wrong password
    await element(by.label('Email address')).tap();
    await element(by.label('Email address')).typeText(testEmail);
    await element(by.label('Password')).tap();
    await element(by.label('Password')).typeText(wrongPassword);
    await element(by.label('Sign in')).tap();

    // Expect an alert with authentication error
    await waitFor(element(by.text('Authentication Error')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('OK')).tap();
  });
});
