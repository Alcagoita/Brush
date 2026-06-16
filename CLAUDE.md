# Brush — Claude Code Project Guide

## What This App Is

Brush is a location-aware to-do app for iOS and Android built with React Native.
Its defining feature: when the user is physically near a Point of Interest (POI) tied to one of their tasks, the app surfaces a hero alert and offers a one-tap "Open in Maps" route.

Example: the user has "Pick up groceries" tagged to Supermarket. When they walk within 75 m of a Whole Foods, the Today screen promotes that task to a hero alert and a local notification fires.

---

## Tech Stack

- **Framework**: React Native (iOS + Android)
- **Auth**: Firebase Authentication — email/password only (v1.0)
- **Database**: Firebase Firestore
- **Push notifications**: Firebase Cloud Messaging (FCM)
- **Geolocation**: react-native-background-geolocation (or equivalent)
- **Maps**: Google Maps / Google Places API (decision in KAN-21)
- **Font**: Geist (from Google Fonts, weights 400 / 500 / 600)

---

## Gitflow Branching Strategy

This project follows **standard Gitflow**. Never deviate from these rules.

| Branch type | Cut from | Merges into | Naming |
|-------------|----------|-------------|--------|
| Feature | `develop` | `develop` | `KAN-XX-short-description` |
| Release | `develop` | `main` + `develop` | `release/X.Y.Z` |
| Hotfix | `main` | `main` + `develop` | `hotfix/short-description` |

- **`main`** — production only. Never commit or branch directly from it except for hotfixes.
- **`develop`** — integration branch. All feature PRs target this.
- **Features** — always cut from `develop`, always PR back into `develop`.
- **Sprint end** — a release branch is cut from `develop`, merged into `main`, then back into `develop`.
- **If unsure which branch to use — ask before creating the branch.**

---

## JIRA Workflow

- **Project key**: KAN
- **Branch naming**: `KAN-XX-short-description` (e.g. `KAN-45-today-screen-ui`)
- **Commit format**: `KAN-XX: short description` (e.g. `KAN-45: implement progress ring`)
- Linking a branch or PR with the ticket key in its name automatically closes the ticket when merged.

### Ticket Status Rules

| Event | Transition ticket to |
|-------|----------------------|
| Starting a ticket | **In Development** |
| PR opened and waiting for review / merge | **Testing** |
| PR merged into develop | **Concluído** |

- **Always** update the Jira ticket status at each of the three transitions above.
- Never leave a ticket in **A fazer** while actively working on it.
- Never leave a ticket in **In Development** after the PR has been opened.
- Never leave a ticket in **Testing** after the PR has been merged.

---

## Design System

All screens must use these tokens. Never hardcode colors or font sizes.

### Theme Context

Expose a `useTheme()` hook that returns the palette for the current mode (light/dark). The user's preference is stored in Firestore and via `Appearance` API on device.

### Color Tokens

```ts
// Light mode
const light = {
  bg:         '#fdfdfb',
  surface:    '#f6f5f1',
  surface2:   '#efeeea',
  line:       'rgba(20,20,18,0.08)',
  text:       '#1a1a18',
  muted:      '#8a8a85',
  faint:      '#bdbdb7',
  ringTrack:  'rgba(20,20,18,0.08)',
  ringFill:   '#1a1a18',
  accent:     '#e8a86a',        // oklch(0.66 0.13 65)
  nearTint:   '#fdf7f0',        // oklch(0.97 0.028 65)
  nearTint2:  '#f9ede0',        // oklch(0.94 0.05 65)
  nearBorder: '#e8c9a0',        // oklch(0.85 0.09 65)
  nearText:   '#7a4a20',        // oklch(0.42 0.13 65)
};

// Dark mode
const dark = {
  bg:         '#0e0e0c',
  surface:    '#171715',
  surface2:   '#1f1f1d',
  line:       'rgba(255,255,255,0.08)',
  text:       '#f6f5f2',
  muted:      '#8a8a85',
  faint:      '#525250',
  ringTrack:  'rgba(255,255,255,0.07)',
  ringFill:   '#f6f5f2',
  accent:     '#d4955a',        // oklch(0.72 0.14 65)
  nearTint:   '#2a1e12',        // oklch(0.22 0.045 65)
  nearTint2:  '#362514',        // oklch(0.27 0.06 65)
  nearBorder: '#6b4020',        // oklch(0.42 0.10 65)
  nearText:   '#dba87a',        // oklch(0.86 0.10 65)
};
```

### Category Colors

```ts
const categories = {
  work:     { label: 'Work',     color: '#5b7fd4' }, // oklch(0.62 0.12 250) soft blue
  health:   { label: 'Health',   color: '#5ba87a' }, // oklch(0.62 0.12 165) sage
  errands:  { label: 'Errands',  color: '#8b6bc4' }, // oklch(0.62 0.12 305) muted purple
  personal: { label: 'Personal', color: '#e8a86a' }, // oklch(0.66 0.13 70)  peach
};
```

### Typography

- **Family**: `Geist` — load from Google Fonts. Fallback: `System`.
- **Weights**: 400 (regular), 500 (medium), 600 (semibold). No other weights.
- **Tabular numerals**: always use `fontVariant: ['tabular-nums']` on day numbers, distances, times, counters.

### Spacing

Base unit is 4. Common values: 4, 6, 8, 10, 12, 14, 16, 18, 22, 24.
**Horizontal page margin: 22.**

### Border Radius

```ts
const radius = {
  avatar:   9999,  // circle
  chip:     9999,
  card:     16,
  heroIcon: 14,
  listIcon: 10,
  ctaBtn:   12,
};
```

### Shadows

No drop shadows anywhere. Dividers are `1px solid line` only.
Sticky header gets `borderBottomWidth: 1, borderBottomColor: line` when fully collapsed.

---

## Firestore Data Model

```ts
// /users/{uid}
type User = {
  uid: string;
  email: string;
  displayName: string;
  darkMode: boolean;
  createdAt: Timestamp;
};

// /users/{uid}/tasks/{taskId}
type Task = {
  id: string;
  title: string;
  category: 'work' | 'health' | 'errands' | 'personal';
  done: boolean;
  time?: string;          // "09:30" — optional scheduled time
  poi?: PoiType;          // 'atm' | 'cafe' | 'supermarket' | 'pharmacy'
  poiPlaceId?: string;    // Google Places ID if user picked a specific place
  createdAt: Timestamp;
  completedAt?: Timestamp;
  date: string;           // "2026-05-22" — which day this task belongs to
};

type PoiType = 'atm' | 'cafe' | 'supermarket' | 'pharmacy';

// /users/{uid}/pois/{poiType}
type PoiPreference = {
  type: PoiType;
  radiusMeters: number;   // default: ATM/pharmacy=50, cafe/supermarket=75
};
```

---

## Category → POI Type Mapping

```ts
const CATEGORY_POI_MAP: Record<string, PoiType[]> = {
  errands:  ['supermarket', 'atm', 'pharmacy'],
  health:   ['pharmacy'],
  personal: ['cafe'],
  work:     [],
};

const POI_GOOGLE_TYPES: Record<PoiType, string> = {
  supermarket: 'supermarket',
  atm:         'atm',
  pharmacy:    'pharmacy',
  cafe:        'cafe',
};

const POI_GEOFENCE_RADIUS: Record<PoiType, number> = {
  atm:         50,
  pharmacy:    50,
  cafe:        75,
  supermarket: 75,
};
```

---

## Geolocation Rules

- Request `always` location permission (required for background geofencing)
- Only one POI is "currently nearby" at a time — if multiple geofences overlap, pick the closest
- A notification fires once per geofence entry per day; suppress if the task is already done
- On geofence entry: set `nearbyPoi` in app state, schedule a local notification, mark the alert as seen for the day in Firestore

---

## Navigation Structure

Bottom tab navigator with two tabs for v1.0:
1. **Today** (home, the main screen)
2. **Profile / Menu** (placeholder — full UI in backlog)

After login, always land on Today.

---

## File / Folder Conventions

```
src/
  screens/
    TodayScreen.tsx
    LoginScreen.tsx
  components/
    ProgressRing.tsx
    NearbyCard.tsx
    TaskRow.tsx
    PoiChip.tsx
    Header.tsx
  theme/
    tokens.ts        ← all color/spacing/radius constants
    ThemeContext.tsx  ← useTheme() hook
  services/
    firebase.ts      ← Firebase init
    firestore.ts     ← Firestore helpers
    geolocation.ts   ← background location + geofence logic
    maps.ts          ← Google Places calls
  types/
    index.ts         ← Task, User, PoiType, etc.
docs/
  design/            ← design handoff files (screen.jsx, README.md, screenshots/)
```

---

## Rules

1. **Always use `useTheme()`** — never hardcode a color.
2. **Tabular numerals** on any number that changes (distance, progress count, day number).
3. **No drop shadows** — use 1px borders only.
4. **Geist font** for all text. Load it once at the app root.
5. **Branch from develop**, name it `KAN-XX-description`, open a PR targeting `develop` when done.
6. **One ticket per branch** — don't bundle multiple KAN tickets into one PR.
7. **Firebase rules**: Firestore reads/writes are always scoped to `/users/{uid}/...` — never read another user's data.
8. **Don't work on Backlog tickets** until they are moved to an active sprint.
9. **Never use emoji as icons.** Always use the `PoiIcon` (or other `AppIcon` exports) component for any POI-type icon. The standard list-row tile pattern is:
   ```tsx
   <View style={{ width: 36, height: 36, borderRadius: radius.listIcon, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' }}>
     <PoiIcon type={poiType} color={palette.muted} size={20} />
   </View>
   ```
   Hero/large contexts use `size={22}`, `borderRadius: radius.heroIcon` (14), and a tinted background (`accentColor + '33'`). See `NearbyCard.tsx` for the reference implementation.
10. **Points system extensibility.** `PointsHistoryEntry.reason` is a discriminated union — currently `'task_completed'` only. When adding a new point type (e.g. streak bonus, achievement bonus):
    1. Add the new literal to the `reason` union in `src/types/index.ts`.
    2. Create a dedicated `awardPoint*` function (or an options-object overload) in `src/services/firestore.ts` — do **not** repurpose the existing `awardPoint(uid, taskId, taskTitle)` signature.
    3. Add unit tests for the new reason type in `__tests__/services/points.test.ts`.
11. **Unit tests are required for every ticket where logic is testable.** Before opening a PR, write unit tests covering the core behaviour introduced or changed. Use `@testing-library/react-native` for components and screens; plain Jest for services and utilities.
    - **Always test:** new business logic, state transitions, error paths, edge cases.
    - **Skip tests only for:** pure config changes (e.g. constant values), visual-only tweaks, or native-only code that cannot be exercised in Jest.
    - If skipping, add a comment in the PR description explaining why.
    - Tests live in `__tests__/` mirroring the `src/` structure (e.g. `src/services/auth.ts` → `__tests__/services/auth.test.ts`).
12. **One ticket at a time.** Never start a new ticket until the PR for the current one has been reviewed and merged into **develop**. After opening a PR, stop and wait for explicit confirmation before picking up the next ticket. PRs merge into develop during the sprint; develop merges into main only at sprint end.
13. **Never merge without explicit user consent.** Do not merge any PR — even with `--admin` — unless the user has explicitly said to merge in that conversation turn.
14. **Never display raw MCP tool responses.** After calling any Jira (or other MCP) tool, only report the outcome in plain text (e.g. "KAN-129 → Testing"). Never paste the raw JSON response into the conversation.

---

## Sprint 10 — Active

Locked, 15 tickets, four tracks + a bug track. All tickets labeled `sprint-10` in Jira.

- **Track A** — import connector reliability
- **Bug track** — Wear OS offline edge cases
- **Track B** — core product decisions (persistence/calendar)
- **Track C** — New Task copy direction + Tin tier achievements
- **Track D** — splash screen + app icon (brand assets)

### Status (as of last check)

| Ticket | Track | Status |
|---|---|---|
| KAN-92 | A | To Do |
| KAN-93 | A | To Do |
| KAN-94 | A | To Do |
| KAN-95 | A | To Do |
| KAN-106 | Bug | To Do |
| KAN-107 | Bug | To Do |
| KAN-146 | B | ✅ Done |
| KAN-147 | B | ✅ Done (superseded, no code) |
| KAN-144 | B | ✅ Done |
| KAN-145 | B | In Development |
| KAN-148 | C | To Do |
| KAN-149 | C | To Do |
| KAN-150 | C | To Do |
| KAN-151 | D | ✅ Done |
| KAN-152 | D | ✅ Done |

### Priority order

1. KAN-92 — import timeout (flaky connections leave button stuck loading)
2. KAN-94 — cancellation misreported as error
3. KAN-93 — retry logic, composes KAN-92 + KAN-94
4. KAN-95 — notes/description mapping, depends on KAN-84/85 merged
5. KAN-106 — Wear OS silent data loss on disconnect
6. KAN-107 — offline scenario tests, after KAN-106
7. KAN-146 — remove end-of-day cleanup (Firestore + Cloud Functions)
8. KAN-147 — Today screen two-section layout, depends on KAN-146
9. KAN-144 — POI proximity persistent tracking ✅ done
10. KAN-145 — Calendar screen redesign, most complex UI ticket
11. KAN-148 — New Task quick sheet copy
12. KAN-149 — More Details copy + confirmation toast
13. KAN-150 — Tin tier achievements
14. KAN-151 — Splash screen ✅ done
15. KAN-152 — App icon iOS + Android ✅ done

### Track A — Import connector reliability (KAN-92, 93, 94, 95)

Files: `src/services/import.ts`, `src/types/index.ts`, `src/components/ImportTasksSection.tsx`.

**KAN-92 — Import timeout (no deps).** Wrap the import call in a 30s `Promise.race` timeout (`IMPORT_TIMEOUT_MS = 30_000`). Error messages: general failure → `"Import failed. Tap to retry."`; timeout → `"Import timed out. Check your connection and try again."` Clear the `setTimeout` on unmount.

ACs: button never stuck >30s loading · distinct timeout message · retry after timeout starts fresh (no stale state) · no leaked timer.

**KAN-94 — `ImportResult.cancelled` field (no deps).** Add `cancelled: number` to `ImportResult`. In `importFromGoogleTasks`/`importFromGoogleCalendar`, catch `statusCodes.SIGN_IN_CANCELLED` and return `{ imported: 0, skipped: 0, failed: 0, cancelled: 1 }` instead of throwing; re-throw anything else. `ImportTasksSection` shows a neutral `"Import cancelled."` message (no retry button) when `cancelled > 0`.

ACs: `cancelled` field added · both Google connectors return it on scope decline · neutral UI message · unit tests for cancellation path on both connectors.

**KAN-93 — Exponential backoff retry (after KAN-92 + KAN-94).** `importWithRetry` wraps `runImportWithTimeout`; each attempt gets its own 30s window. `RETRY_DELAYS_MS = [1_000, 2_000, 4_000]` + ±300ms jitter. Skip retry entirely on cancellation or 401/403 — fail immediately. UI shows `"Retrying… (attempt N of 3)"` during backoff; after 3 failures, permanent error state with a manual "Try again" that resets the counter.

ACs: auto-retry up to 3x with correct delays · auth errors/cancellations skip retry · retry label shown · manual retry resets counter · works for both Google and EventKit connectors.

**KAN-95 — Map notes/description → `Task.description` (after KAN-84/85 merged).** Google Tasks: `item.notes?.trim() || undefined`. Google Calendar: strip HTML from `item.description` via a small `stripHtml` helper. EventKit (`importFromReminders`/`importFromCalendar`): `item.notes?.trim() || undefined` (already plain text).

ACs: all three sources map to `description` · HTML stripped for Calendar · `undefined` not `""` when source has no notes · unit tests per connector.

### Bug track — Wear OS offline (KAN-106 → KAN-107)

**KAN-106 — Watch connectivity awareness.** Kotlin, Wear OS module.
1. `CapabilityClient` listener tracks `phoneConnected`; flush pending queue on reconnect.
2. In-memory `pendingQueue` in `MarkDoneClient` — if no connected nodes, queue the task ID and set optimistic pending state instead of sending immediately.
3. `WatchTask.pendingSync: Boolean` — `TaskListScreen` shows a ⚠ icon on rows pending >5s without DataClient reconciliation.
4. "Phone disconnected" banner (muted, no action) at the top of `TaskListScreen` when unreachable.

ACs: ⚠ after 5s unreconciled · failed `sendMessage()` calls queued and retried on reconnect · disconnect banner shown · existing `wearSync` tests pass.

**KAN-107 — Offline scenario tests (after KAN-106).** Wear OS emulator + Firebase emulator suite (or mocked `WearableListenerService`/`FirebaseFirestore`). Four required cases: happy path; no connected nodes (optimistic update stays, no crash); Firestore write fails unauthenticated (watch/phone state both stay as-is); reconnect after offline (queued message delivered, watch reconciled).

ACs: ≥4 integration/instrumented tests · run in CI against Firebase emulator · PR description includes the test matrix.

### Track B — Core product (KAN-146 → KAN-147 → KAN-144 ✅ → KAN-145) — **current track**

**KAN-146 — Remove end-of-day task cleanup.** Verified: no scheduled Cloud Function archives/deletes tasks, no client-side day-boundary reset logic, no `persistent` field on the task model — codebase was already clean here.

**Scope addition confirmed with stakeholder:** the Today screen only ever fetched `getTasksForDate(uid, todayISO())` — undone tasks from previous days were never fetched at all, contradicting the "tasks persist" decision. Resolution (overrides the literal Jira ticket text "never moves... automatically" — explicit live decision from the user takes precedence): a daily **rollover** moves any undone task forward to the new day, bumping both `date` and `createdAt` to now — it is treated as a brand-new task for that day, no separate "old tasks" list or second "NEARBY" section (the existing `NearbyCard` proximity carousel remains the only "NEARBY" UI — do not duplicate it).

Implementation: `functions/src/rolloverIncompleteTasks.ts` — daily `onSchedule('5 0 * * *', ...)` Cloud Function, UTC-anchored best effort, collection-group query (`done == false`, `date < today`), batched writes. Client-side fallback `rolloverIncompleteTasks(uid)` in `src/services/firestore.ts`, called from `SplashScreen.tsx` before the boot data fetch — this one is per-user-timezone-correct (uses local `todayISO()`) and runs whichever device opens first each day; either path running first makes the other a no-op. New composite indexes added in `firestore.indexes.json` (`done`+`date`, both `COLLECTION` and `COLLECTION_GROUP` scope).

**Note for KAN-145:** ring/streak calendar history must key off `createdAt` per-day, not `date` — `date` now changes on rollover and no longer reflects a task's original day.

ACs: no scheduled midnight-clear job (replaced by rollover, which doesn't delete/archive) · no `persistent` flag on schema · delete leaves no orphaned docs · existing task tests pass · undone tasks roll forward daily and appear in Today's single list · no second "NEARBY"-labeled section added.

**KAN-147 — Today screen two-section layout ✅ Done — superseded, no code.** The literal spec (a second "NEARBY" section for undone tasks created before today) was written before KAN-146's rollover decision. Rollover already bumps any undone task's `date`/`createdAt` to today *before* the Today screen fetches data — by the time a user opens the app there is no "undone task from a previous day" left to put in a separate section; it's already a today task. Verified the single fetch (`getTasksForDate(uid, todayISO())` in both `useTodayScreen` and the SplashScreen boot path) already includes everything rolled over, renders through the existing single `TaskRow` list, and scores normally with no exclusion logic needed. Confirmed with stakeholder: do not build a second list/section — `NearbyCard`'s live GPS-proximity carousel remains the only "NEARBY"-labeled UI on the screen, untouched. Ticket closed via Jira comment, no PR.

**KAN-144 — POI proximity persistent tracking ✅ Done** (after Sprint 9 KAN-142). Fixed: geofence tracking continuing past the first POI match until the task is brushed done, with re-registration after each exit event (`expo-location` geofences are one-shot on enter). Boundary-verified at 390m/400m/410m against `NEARBY_RADIUS = 400m`.

**KAN-145 — Calendar screen redesign (after KAN-146 ring data rules confirmed).** Most complex UI ticket this sprint. Design reference: `outputs/design_handoff_calendar/` (`screen-extras.jsx` primary, `screen.jsx` tokens, `brush-icons.jsx` for `BrushStroke`/`BrushStrikeTitle`).
- `ProgressRing` SVG: `progress: number (0–1)`, `state: RingState` (`'empty' | 'partial' | 'complete' | 'past' | 'future'`), `size`, `strokeWidth` (default 4). Standard `circumference`/`dashoffset` SVG arc math, ring starts at top (-90°).
- Ring state → visuals: `future` no track fill; `empty` track only + day number; `partial` track + accent arc; `complete` solid accent + checkmark/number; `past` muted `surface2`, day number, **not** "skipped".
- `past` data rule: day has elapsed, had tasks, not all done that same day. Later completion does not retroactively close the ring.
- Streak chain: thin accent line connecting consecutive `complete` cells; gap = break.
- Milestone pips: small accent dots under the day number at 7/14/30/60/100-day streaks.
- `CalTaskRow`: completed tasks get a `BrushStroke` SVG bezier (not `textDecoration: line-through`), Reanimated `scaleX 0→1` from left, ~350ms ease-out, gated by `AccessibilityInfo.isReduceMotionEnabled()`.
- Slide-up detail card on day tap: `CalTaskRow` list (scrollable >5), `CalAchChip` row if achievements exist that day, "N tasks · M done" summary.
- Month navigation via chevrons; ring data scoped to last 90 days + current month.

ACs: all 5 ring states · `past` uses neutral label · streak chain renders correctly · milestone pips correct · slide-up card with `CalTaskRow` + `CalAchChip` · `BrushStroke` animation on completion · reduced-motion guard on all animations · month nav scopes data correctly.

### Track C — Copy & UX (KAN-148, 149, 150) — independent, parallelizable

**KAN-148 — New Task quick sheet copy.** Sheet title → `"What do you want to do?"`; POI label → `"Where does this happen?"`; category label → `"Which part of your life?"`; CTA → `"Add it"`. POI field: rotating placeholder examples (3–4 relevant to the 16 POI types), cycling on focus or every ~4s while empty. Category field: warm placeholder (e.g. "health", "errands"). Sentence case throughout.

ACs: title/labels updated · rotating POI placeholder · warm category placeholder · CTA reads "Add it" · no functional changes, labels only.

**KAN-149 — More Details copy + confirmation toast.** Title → `"Tell me more"`; POI label → `"Where does this happen?"`; category label → `"Which part of your life?"`; notes label → `"Anything else?"`; CTA → `"Add it"`. Confirmation toast after task creation (both quick sheet and More Details): `"Got it — I'll remind you when you're nearby."` (POI set) or `"Done! I'll keep track of this."` (no POI). Bottom toast, `surface` background, `text` color, 2.5s auto-dismiss, screen-reader announced.

ACs: labels updated · toast appears post-creation · copy branches on POI presence · 2.5s auto-dismiss · accessible.

**KAN-150 — Tin tier achievements.** Tin = entry tier (0 pts); tiers: Tin(0)→Bronze(50)→Silver(200)→Gold(500)→Adamantium(1200)→Vibranium(3000). Points come from achievements only, never task completion directly. 10 Tin achievements (115 pts total): First Sweep (10), Early Riser (10, before 9am), Night Owl (10, after 10pm), Consistent (15, 3-day streak), Explorer (15, 3 POI types), Quick Draw (10, create+complete <1hr), Planner (10, 5 tasks/day), Nearby (15, completed via NEARBY nudge), Weekend Warrior (10, Sat+Sun), Variety (10, 3 categories). Award logic runs server-side in a Cloud Function (`onDocumentUpdated` on task write) — never client-trusted; idempotent via `unlockedAt !== null` check. Unlock toast (bottom, brief) shows name + points.

ACs: all 10 implemented with correct criteria · server-side award, no client trust · no duplicate awards · unlock toast on award · points total visible in profile/tier screen.

### Track D — Brand assets (KAN-151, 152) ✅ Both Done

KAN-151 (splash screen) and KAN-152 (app icon) merged into develop. See commit history on `KAN-151-splash-screen` and `KAN-152-app-icon` branches for implementation details.

### Build order

```
Track A:      KAN-92 ─┐
              KAN-94 ─┴─→ KAN-93 → KAN-95 (after KAN-84/85 merged)
Bug track:    KAN-106 → KAN-107
Track B:      KAN-146 → KAN-147
              KAN-144 ✅ (done, was parallel w/ 146/147)
              KAN-145 (after KAN-146 ring data rules confirmed)
Track C:      KAN-148 / KAN-149 / KAN-150 (independent, any order)
Track D:      KAN-151 ✅ / KAN-152 ✅ (done)
```

---

## Sprint Boundary Rule

### End-of-Sprint Checklist

When all tickets in a sprint are merged into `develop`, follow these steps **in order** before declaring the sprint done:

1. Cut a `release/X.Y.Z` branch from `develop`
2. Bump the version in `package.json`
3. PR the release branch into `main`, merge with `--admin` if needed
4. Tag the release on `main`: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
5. Push the tag: `git push origin vX.Y.Z`
6. **Create a GitHub release** on the tag with full release notes — group tickets by feature area, include setup/migration notes if relevant
7. Merge the release branch back into `develop`
8. Delete the release branch
9. Remove the full sprint detail section from CLAUDE.md and mark it as ✅ Done in the Sprint History list
10. Report to the user and wait for Sprint N+1 planning

**Never skip the GitHub release.** Release notes are required for every sprint — they are the handoff document for QA, stakeholders, and future contributors.

---

## Sprint History

- **Sprint 1** — ✅ Done (v0.1.0)
- **Sprint 2** — ✅ Done (v0.2.0)
- **Sprint 3** — ✅ Done (v0.3.0)
- **Sprint 4** — ✅ Done (v0.4.0)
- **Sprint 5** — ✅ Done (v0.5.0)
- **Sprint 6** — ✅ Done (v0.6.0)
- **Sprint 7** — ✅ Done (v0.7.0)
- **Sprint 8** — ✅ Done (v0.8.0)
- **Sprint 9** — ✅ Done (v0.9.0)
