# Offline / airplane-mode behavior — KAN-227

Verification pass over what already works offline, what doesn't, and what's deliberately deferred. This is a snapshot, not a living doc — re-verify before relying on it if the underlying code has moved on.

## What already works offline (no new plumbing needed)

Firestore offline persistence is enabled with an unlimited on-device cache (`src/services/firebase.ts`, `cacheSizeBytes: CACHE_SIZE_UNLIMITED`). All local-first writes go through `Timestamp.now()` (not `serverTimestamp()`), so they commit immediately without waiting on a round-trip — verified in `__tests__/services/offlineFirst.test.ts`.

- **Task create / edit / brush (mark done) / delete** — work fully offline, survive an app kill, and sync automatically once connectivity returns. Covered end-to-end by `e2e/offline.test.ts`.
- **Progress ring / streak** — derived from local task state, updates immediately offline.
- **Outdoor proximity search queueing** — if `searchNearbyPlaces` fails while offline, the search is queued (`src/services/proximity.ts`, KAN-205) and flushed automatically on reconnect via a `NetInfo` listener. Covered by `__tests__/services/proximityOfflineQueue.test.ts`.

## What breaks offline

| Feature | File | What happens |
|---|---|---|
| **Initial sign-in** | `src/screens/LoginScreen.tsx` (Firebase Auth) | Auth itself requires a network round-trip. A user who has never signed in before cannot get into the app offline. Once signed in at least once, the session persists and subsequent app launches work offline. |
| **Task import (Google Tasks / Calendar)** | `src/services/import.ts` | `googleFetch()` calls straight to Google's API with an OAuth bearer token — no offline queueing. Offline, the request fails and the import flow times out (30s hard timeout, KAN-92). |
| **Free-text POI type search** | `src/services/functions.ts`, `searchPlaceTypes()` | Falls back to `confidence: 'low'` when the API is unreachable rather than failing hard — degrades gracefully, but the suggestion quality drops. |
| **Nearby-zone / hero card on cold start offline** | `src/services/proximity.ts` | If the app is launched fresh while offline (no prior search this session), `runProximitySearch` has nothing cached to show — the hero/nearby card simply doesn't appear until a search succeeds. This is the gap flagged during KAN-227 review. **Deliberately not fixed here** — the real fix is a local POI cache (KAN-228, "habitat POI cache") feeding a cache-backed proximity check (KAN-229), both later in the Sprint 16 queue by design (cache before proximity surgery). |
| **Challenges / social notifications** | `src/services/challenges.ts`, `src/services/firestore/social.ts` | The Firestore writes themselves work offline (challenge created, follow request created locally). The server-side Cloud Functions that fire the *notification* to the other party (`onChallengeNotifications`, `onFollowRequest`, `onSharedTaskCreated`) only run once the write reaches the server — so the other user won't be notified until the device reconnects. Not a data-loss risk, just delayed delivery. |

## Network banner behavior

`src/components/NetworkBanner.tsx` is purely informational — confirmed via source read, not just intent. It renders an amber alert banner when `NetInfo`'s `isConnected`/`isInternetReachable` report false, and otherwise renders `null`. No `disabled` state, no modal, no overlay blocking other UI. A full search of `src/screens` for network-gated `disabled` props found none — every existing `disabled` usage is tied to local in-flight state (`submitting`, `loading`, etc.), never to network state. **AC "network banner informs, never blocks" is already satisfied by the existing code**, not something this ticket needed to add.

## A note on the E2E suite's network simulation

`e2e/offline.test.ts` uses `device.setURLBlacklist(['.*'])`, Detox's standard cross-platform pattern for simulating network failure — there is no reliable, cross-platform Detox API to toggle real OS-level airplane mode. This is enough to exercise Firestore's offline persistence and this app's own offline-queue/retry logic, but it does **not** change the OS network-interface state that `@react-native-community/netinfo` reads. Concretely: under `setURLBlacklist`, `NetworkBanner` may not show "offline" even though requests are being blocked, since NetInfo still sees a live network interface. If a future ticket needs to verify NetworkBanner's actual visibility end-to-end, that requires either a real device in real airplane mode or a mocked NetInfo module injected into the Detox build — out of scope here.

## Pre-existing E2E suite staleness (found in passing, not fixed here)

`e2e/auth.test.ts` and `e2e/events.test.ts` reference UI that no longer exists in the current app: `"Add new event"`, an `AddEventModal`, and landing on a `CalendarScreen` after login. The current app has no "events" concept — it's Today-screen task creation via `NewTaskSheet`, and CLAUDE.md confirms Today (not Calendar) is the post-login landing screen. The native iOS workspace is still named `Agenda.xcworkspace` and the existing test emails use `@agenda-test.com` — all consistent with these two files predating the app's pivot from a generic calendar/agenda concept to Brush's task-brushing model. Since these tests can't be executed in this environment to confirm they currently fail, this is reported rather than fixed — flagging as a separate follow-up rather than expanding this ticket's scope.
