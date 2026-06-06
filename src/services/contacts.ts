/**
 * contacts.ts — Phone contacts discovery (KAN-99).
 *
 * Privacy contract:
 *   - Raw contact data (names, numbers, emails) is NEVER sent to the server
 *   - Each value is hashed (SHA-256) client-side before any Firestore query
 *   - Only the hashes are transmitted; the server stores uid → hash, never
 *     the original contact details
 *
 * Contacts library:
 *   Uses `react-native-contacts` when installed. The module is wrapped with a
 *   null-guard so the app degrades gracefully if the library is not yet linked.
 *   Install: npm install react-native-contacts (then rebuild iOS + Android).
 *
 * Hashing:
 *   Uses the Web Crypto API (TextEncoder + SubtleCrypto) available in Hermes
 *   (React Native ≥ 0.71). Falls back to a deterministic FNV-1a-style hash
 *   for environments where SubtleCrypto is unavailable (Jest, older engines).
 */

import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from '@react-native-firebase/firestore';

// ─── Contacts library (optional native dependency) ────────────────────────────

type ContactsModule = {
  getAll(): Promise<Array<{
    phoneNumbers: Array<{ number: string }>;
    emailAddresses: Array<{ email: string }>;
  }>>;
};

let ContactsLib: ContactsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ContactsLib = require('react-native-contacts').default ?? require('react-native-contacts');
} catch {
  // Library not installed — contacts scanning disabled.
}

export const contactsLibAvailable = ContactsLib !== null;

// ─── SHA-256 hashing ──────────────────────────────────────────────────────────

/**
 * Returns a hex SHA-256 digest of the normalised input string.
 * Uses SubtleCrypto (Web Crypto API, available in Hermes / modern RN).
 * Falls back to a simple deterministic fnv-like hash when unavailable.
 */
export async function hashContact(raw: string): Promise<string> {
  const normalised = raw.trim().toLowerCase();

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(normalised);
    const buffer  = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback: FNV-1a 32-bit (fast, deterministic, good for testing).
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalised.length; i++) {
    hash ^= normalised.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ─── Permission ───────────────────────────────────────────────────────────────

export type ContactPermissionStatus = 'granted' | 'denied' | 'unavailable';

export async function requestContactsPermission(): Promise<ContactPermissionStatus> {
  if (!ContactsLib) { return 'unavailable'; }

  const permission = Platform.OS === 'ios'
    ? PERMISSIONS.IOS.CONTACTS
    : PERMISSIONS.ANDROID.READ_CONTACTS;

  const current = await check(permission);
  if (current === RESULTS.GRANTED) { return 'granted'; }
  if (current === RESULTS.BLOCKED || current === RESULTS.UNAVAILABLE) { return 'denied'; }

  const result = await request(permission);
  return result === RESULTS.GRANTED ? 'granted' : 'denied';
}

// ─── Contact scanning + Firestore lookup ──────────────────────────────────────

export interface ContactMatch {
  uid:         string;
  username?:   string;
  displayName: string;
}

/**
 * Reads the device contacts, hashes all phone numbers and email addresses,
 * then batch-queries Firestore `userDiscovery/{hash}` for matches.
 * Returns matched Brush users — raw contact values never leave the device.
 */
export async function findContactsOnBrush(): Promise<ContactMatch[]> {
  if (!ContactsLib) { return []; }

  const contacts = await ContactsLib.getAll();
  const db = getFirestore();

  // Collect and deduplicate all normalised values to hash.
  const valuesToHash = new Set<string>();
  for (const c of contacts) {
    for (const p of c.phoneNumbers)   { if (p.number) { valuesToHash.add(p.number.replace(/\D/g, '')); } }
    for (const e of c.emailAddresses) { if (e.email)  { valuesToHash.add(e.email); } }
  }

  // Hash each value and query the discovery index.
  const hashes  = await Promise.all([...valuesToHash].map(hashContact));
  const matches: ContactMatch[] = [];
  const seen    = new Set<string>();

  await Promise.allSettled(
    hashes.map(async h => {
      const snap = await getDoc(doc(db, 'userDiscovery', h));
      if (!snap.exists()) { return; }
      const { uid } = snap.data() as { uid: string };
      if (seen.has(uid)) { return; }
      seen.add(uid);

      // Fetch display info from user doc.
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) { return; }
      const u = userSnap.data() as { displayName?: string; username?: string };
      matches.push({ uid, username: u.username, displayName: u.displayName ?? uid });
    }),
  );

  return matches;
}

// ─── userDiscovery index management ──────────────────────────────────────────

/**
 * Write the user's hashed email (and optionally phone) to the discovery index.
 * Called on sign-up and when the user enables discoverability.
 */
export async function registerInDiscovery(uid: string, email: string, phone?: string): Promise<void> {
  const db = getFirestore();
  const entries: Array<{ value: string }> = [{ value: email }];
  if (phone) { entries.push({ value: phone.replace(/\D/g, '') }); }

  await Promise.allSettled(
    entries.map(async ({ value }) => {
      const hash = await hashContact(value);
      await setDoc(doc(db, 'userDiscovery', hash), { uid });
    }),
  );
}

/**
 * Remove the user's entries from the discovery index.
 * Called when the user disables discoverability in profile settings.
 */
export async function unregisterFromDiscovery(email: string, phone?: string): Promise<void> {
  const db = getFirestore();
  const entries: Array<{ value: string }> = [{ value: email }];
  if (phone) { entries.push({ value: phone.replace(/\D/g, '') }); }

  await Promise.allSettled(
    entries.map(async ({ value }) => {
      const hash = await hashContact(value);
      await deleteDoc(doc(db, 'userDiscovery', hash));
    }),
  );
}
