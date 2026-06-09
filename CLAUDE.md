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
- **Sprint 8** — 🚧 In Progress (v0.8.0)

---

## Sprint 8 — Active Sprint Detail

11 tickets across two independent epics. Run both tracks in parallel.

- **Track A — Today Screen Redesign** (4 tickets, KAN-130 Epic)
- **Track B — Notifications & Re-engagement** (7 tickets, KAN-118 Epic)

### Shared infrastructure (do first in Track B)

Before starting any notification ticket, establish the shared `userPreferences` Firestore schema:

```ts
// Firestore: users/{uid}/userPreferences
interface UserPreferences {
  exitPrompt:             boolean;   // KAN-119
  eodReminder:            { enabled: boolean; time: string; }; // KAN-120 — "21:00"
  streakReminder:         boolean;   // KAN-121
  achievementNudges:      boolean;   // KAN-122
  weeklyRecap:            boolean;   // KAN-123
  reengagementReminders:  boolean;   // KAN-124
  friendActivity:         boolean;   // KAN-125
  lastOpenedAt:           Timestamp; // required by KAN-124 — update on every foreground
  lastReengagementNudge:  Timestamp; // set after KAN-124 sends
  lastAchievementNudgeDate: string;  // "YYYY-MM-DD"
}
```

**KAN-80 (Notification Preferences screen)** must exist for all toggle UIs. Confirm KAN-113 (Settings screen, Sprint 7) is merged before wiring toggles.

### Track A — Today Screen Redesign

| Key | Title | Depends on |
|-----|-------|------------|
| KAN-131 | Bug: missing 1px border on Nearby card | — |
| KAN-133 | Brand warm-up: tokens, peach ring arc + dot, header declutter | — |
| KAN-132 | Nearby card: idle state redesign | — |
| KAN-134 | Today screen: streak chip + brush-away animation | KAN-133 |

KAN-131 and KAN-133 start day 1. KAN-132 is independent. KAN-134 requires KAN-133 (`nearTint`, `nearTint2`, `accent` tokens).

#### KAN-131 · Bug: Nearby card list container missing 1px border

The `NearbyCard` list container is missing `borderWidth: 1, borderColor: t.line`. In dark mode `surface (#171715)` and `bg (#0e0e0c)` are indistinguishable without it.

```tsx
listContainer: {
  backgroundColor: t.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: t.line,
  overflow: 'hidden',
},
```

#### KAN-133 · Brand warm-up: tokens, peach ring arc + dot, header declutter

**1. Light theme token update** (dark theme unchanged):

| Token | Old | New |
|---|---|---|
| `bg` | `#fdfdfb` | `#fdfcfa` |
| `surface` | `#f6f5f1` | `#f4f2ed` |
| `surface2` | `#efeeea` | `#ece9e2` |
| `line` | `rgba(20,20,18,0.08)` | `rgba(40,33,20,0.08)` |
| `text` | `#1a1a18` | `#1f1c16` |
| `muted` | `#8a8a85` | `#8b857a` |
| `faint` | `#bdbdb7` | `#c1bbac` |
| `ringFill` | `#1a1a18` | `oklch(0.73 0.115 62)` (soft peach) |

> Background stays `#fdfcfa`. Do not introduce a peach page background.

**2. Progress ring: peach arc + brand dot** (react-native-svg):

```tsx
const tipAngle = 2 * Math.PI * pct;
const tipX = size / 2 + r * Math.cos(tipAngle);
const tipY = size / 2 + r * Math.sin(tipAngle);
const tipR = stroke * 0.72;

<Circle cx={tipX} cy={tipY} r={tipR + 3} fill={t.ringFill} opacity={0.15} />
<Circle cx={tipX} cy={tipY} r={tipR} fill={t.ringFill} />
```

SVG is already rotated −90deg so `cos(0)` = 12 o'clock. Dot present at 0% and 100%.

**3. Top bar declutter:** Remove borders from right-side icon buttons, set `backgroundColor: 'transparent'`. People button → existing Friends screen (not a new sheet). Bell unread dot: `7px, t.accent, 2px bg-ring shadow`.

> Design files contain a "Share my profile" popup — ignore it entirely.

#### KAN-132 · Nearby card: idle state redesign

High-fidelity rebuild of the Nearby card idle state. Active/hero state is out of scope.

- Wrapper margin: `14px 22px 0`
- Header: `"NEARBY"` — 11px, weight 500, `textTransform: 'uppercase'`, `letterSpacing: 1.76`, `color: t.muted`. Right: `"{N} place(s)"` — 12px, `t.muted`
- List container: `surface` bg, `borderRadius: 16`, `borderWidth: 1, borderColor: t.line`, `overflow: 'hidden'`
- Row: `gap: 14, paddingHorizontal: 16, paddingVertical: 12`. Divider: `hairlineWidth` between rows only. Icon tile: 36×36, `borderRadius: 10`, `surface2`. Distance: `fontVariant: ['tabular-nums']`. Chevron: `ChevronRight size={14} strokeWidth={1.8} color={t.faint}`
- Data: filter `!task.done && task.poi`, sort ascending by `distanceTo(task.poi)`, re-sort live
- Card hidden when 0 rows
- Design ref: `design_handoff_nearby_card/nearby-card-reference.html`

#### KAN-134 · Streak chip + brush-away completion animation

Depends on KAN-133 for token values.

**1. Streak chip** — inline pill after name in header (renders only when `streak > 0`):
- `height: 19, paddingLeft: 6, paddingRight: 7, borderRadius: 999, backgroundColor: t.nearTint`
- Flame icon: 12px, `fill: t.accent`. Number: 12px/600, `t.nearText`, tabular nums
- Taps to Achievements screen (KAN-114)

**2. Brush-away wash** — peach gradient sweeping L→R on task completion (false→true only):
- Phase 0→0.58: `scaleX` 0→1, `opacity` 0.9 (sweep reveals)
- Phase 0.58→1: `scaleX` stays 1, `opacity` 0.9→0 (fade out)
- Gradient: `[t.nearTint, t.nearTint2, t.accent]` L→R
- Duration: 660ms, `Easing.bezier(0.4, 0, 0.2, 1)`
- `AccessibilityInfo.isReduceMotionEnabled()` → skip entirely
- Requires `react-native-linear-gradient` or `expo-linear-gradient`

### Track B — Notifications & Re-engagement

| Key | Title | Type | Depends on |
|-----|-------|------|------------|
| KAN-120 | End-of-day check-in | Local | — |
| KAN-121 | Streak at risk | Local | — |
| KAN-123 | Weekly recap | Local | — |
| KAN-119 | Exit prompt | Local + geofence | KAN-56 + KAN-75 |
| KAN-122 | Achievement nudge | Local + event | KAN-110 |
| KAN-124 | Re-engagement: 3-day lapse | Firebase Cloud Function | `lastOpenedAt` |
| KAN-125 | Friend activity | Cloud Function | ⛔ Blocked: KAN-101 |

**Start order:** KAN-120 / KAN-121 / KAN-123 in parallel → KAN-119 + KAN-122 → KAN-124 → KAN-125 (only if KAN-101 merged).

#### KAN-120 · End-of-day check-in

Scheduled local notification at user-configurable time (default 9 PM). Fires only when ≥1 incomplete location-tagged task remains.

- Copy (1 task): `"How'd the brushing go today? You've still got 1 task on your list."`
- Copy (multiple): `"How'd the brushing go today? [X] tasks still waiting."`
- Settings: `userPreferences.eodReminder.enabled` + `userPreferences.eodReminder.time`
- Tapping opens Today screen

#### KAN-121 · Streak at risk

Local notification at 8 PM when `streak ≥ 3` AND 0 tasks brushed today.

- Copy: `"Your [X]-day streak ends at midnight — brush something away."`
- Settings: `userPreferences.streakReminder`

#### KAN-123 · Weekly recap

Repeating local notification every Sunday at 7 PM. Fires if app opened ≥1 time that week.

- Copy (≥1 task): `"You brushed away [X] tasks this week. [streak suffix if streak ≥ 3]"`
- Copy (0 tasks): `"Fresh week ahead — time to start brushing."`
- Weekly count = tasks with `completedAt` within Mon–Sun
- Settings: `userPreferences.weeklyRecap`

#### KAN-119 · Exit prompt

Fires when user leaves a POI zone with an incomplete task tagged to that location. Requires KAN-56 (outdoor geofence) and KAN-75 (indoor proximity).

- Debounce: min 5 min inside zone before exit counts. Max 1 per task per day
- Copy (with name): `"Left [Store Name] — did you brush it away?"`
- Copy (without): `"Did you brush it away while you were there?"`
- Quick action: `"Yes, brushed ✓"` marks task complete without opening app
- Payload must carry `taskId`
- Settings: `userPreferences.exitPrompt`

#### KAN-122 · Achievement nudge

Fires when any achievement crosses "1 away" threshold after task completion. Max 1 nudge per day. Requires KAN-110 (achievement progress in `user.achievements[id].progress`).

- Copy is achievement-specific (day complete, early bird, on a roll, explorer, centurion)
- `lastAchievementNudgeDate` prevents multiple per day
- Tapping opens Achievements screen (KAN-114) scrolled to relevant badge
- Settings: `userPreferences.achievementNudges`

#### KAN-124 · Re-engagement: 3-day lapse nudge

**Cannot be a local notification.** Firebase Cloud Function + FCM/APNs required.

- Function name: `onUserInactive`, schedule: daily
- Query: `lastOpenedAt < now - 3d AND lastOpenedAt >= now - 4d`
- Skip if `lastReengagementNudge` set within last 24h or `reengagementReminders === false`
- Respect FCM quiet hours: no delivery 10 PM – 8 AM local time
- Copy: `"Your list is waiting — brush something away."`
- `lastOpenedAt` must be written on every app foreground event
- Settings: `userPreferences.reengagementReminders`

#### KAN-125 · Friend activity — ⛔ Blocked on KAN-101

Do not start until KAN-101 (sharing/friends feature) is confirmed merged. If not merged during Sprint 8, defer to Sprint 9.

When unblocked: Firebase Cloud Function on `task.completedAt` writes. Max 1 per friend per day. Task content never included.

- Copy (full list): `"@username just brushed their whole list. Your turn."`
- Copy (session): `"@username is on a brushing run. Keep up."`
- Settings: `userPreferences.friendActivity`

### Out of scope for Sprint 8

- KAN-126 — Morning location preview (open architectural questions, defer to Sprint 9)
- KAN-127 — 7-day lapse re-engagement (depends on KAN-124, defer to Sprint 9)
- Achievement unlock push notifications
- Notification permission request flow / onboarding prompt
- Rich push (image attachments)
