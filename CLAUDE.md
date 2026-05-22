# Vibe Agenda — Claude Code Project Guide

## What This App Is

Vibe Agenda is a location-aware to-do app for iOS and Android built with React Native.
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

## JIRA Workflow

- **Project key**: KAN
- **Branch naming**: `KAN-XX-short-description` (e.g. `KAN-45-today-screen-ui`)
- **Commit format**: `KAN-XX: short description` (e.g. `KAN-45: implement progress ring`)
- Linking a branch or PR with the ticket key in its name automatically closes the ticket when merged.

---

## Current Sprint — Sprint 1: Today Screen

Goal: ship a working Today screen that matches the design handoff exactly, backed by real Firebase data and live geolocation.

| # | Ticket | Summary | Notes |
|---|--------|---------|-------|
| 1 | KAN-47 | App theme system — design tokens & light/dark mode | **Start here. Everything else depends on this.** |
| 2 | KAN-11 | Define To-Do data model in Firestore | Schema first, then UI |
| 3 | KAN-17 | Navigation structure and routing | Bottom tab shell — Today + Profile |
| 4 | KAN-45 | Today screen UI — progress ring, sticky header & scroll collapse | See design spec below |
| 5 | KAN-15 | To-Do list screen UI | Task rows, checkboxes, category chips |
| 6 | KAN-14 | Mark To-Do item as done or undone | Toggle in Firestore, update progress ring |
| 7 | KAN-21 | Research and select Maps/Places API | Document choice, set up API key |
| 8 | KAN-22 | Background geolocation tracking | Permissions, background mode |
| 9 | KAN-24 | POI proximity detection and geofencing | Geofence radii: ATM/Pharmacy 50 m, Cafe/Supermarket 75 m |
| 10 | KAN-46 | Nearby card — idle state, hero alert and POI chip | See design spec below |

Everything else is in **Sprint 2 or Backlog** — do not work on those tickets this sprint.

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

## Today Screen Spec (KAN-45 + KAN-46)

Reference files: `docs/design/screen.jsx` and `docs/design/README.md`

### Screen anatomy (top to bottom)

1. **Sticky header** (`position: sticky / zIndex: 3`) — avatar circle (first letter of name), greeting ("Good morning" / name), notification bell with peach unread dot
2. **Collapsing ring section** (`position: sticky, top: headerHeight, zIndex: 2`) — scroll-driven A→B collapse
3. **Nearby card** — location-sorted POI tasks; hero alert when a POI is currently nearby
4. **To-do list** — all tasks for today

### Progress Ring (KAN-45)

Scroll-driven collapse: `k = clamp(scrollTop / 170, 0, 1)`

| Property | k=0 (rest) | k=1 (collapsed) |
|----------|-----------|-----------------|
| Ring diameter | 246px | 112px |
| Stroke width | 14px | 10px |
| Ring left offset | 75px (centered) | 22px (left) |
| Section height | 320px | 150px |
| Caption opacity | 1 | 0 (fades over k 0→0.625) |
| Split counter opacity | 0 | 1 (fades over k 0.45→0.91) |
| Weekday label | "Friday" | "Fri" |
| Sub-label | "May · 4 nearby" | "May" only |

Ring SVG: two concentric circles — track (`ringTrack`) and progress (`ringFill`). Progress arc starts at 12 o'clock (`rotate(-90deg)`), `strokeLinecap: round`.

### Nearby Card (KAN-46)

**Idle state** (no POI nearby): list of open POI tasks sorted ascending by distance. Each row: 36×36 icon tile (surface2, radius 10), task title (14px/500), place name + distance (12px/muted), chevron.

**Active/hero state** (user inside geofence): header changes to "NEARBY · NOW" with pulsing 6px peach dot. Hero block appears above the list:
- 16px rounded container, `nearTint` background, `nearBorder` border
- Decorative halo: 140×140 circle top-right, `nearTint2`, opacity 0.7
- 46×46 accent icon tile (radius 14) with `scr-halo` animation
- Distance + place label (11px/600/uppercase/nearText)
- Task title (17px/500)
- "Open in Maps" CTA button (full width, bg=text, color=bg, radius 12) — opens Google Maps: `geo:0,0?q={lat},{lng}({label})` on Android, `maps://?daddr=...` on iOS

Remaining POI tasks appear below the hero in an "Also close" subsection.

### POI Chip

Pill on task rows. Two states:
- **Default**: surface bg, line border, muted text
- **Active** (its POI is currently nearby): nearTint2 bg, nearBorder border, nearText color, pulsing 6px accent dot prepended

### Animations

```css
/* inject once globally */
scr-pulse: 1.6s ease-in-out infinite
  0%,100% { scale: 1; opacity: 1 }
  50%     { scale: 0.5; opacity: 0.45 }

scr-halo: 2.2s ease-out infinite
  0%   { box-shadow: 0 0 0 0   accent }
  70%  { box-shadow: 0 0 0 10px transparent }
  100% { box-shadow: 0 0 0 0   transparent }
```

Use React Native `Animated` API or `react-native-reanimated` for both.

---

## Firestore Data Model (KAN-11)

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

## Category → POI Type Mapping (KAN-23)

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

## Geolocation Rules (KAN-22 / KAN-24)

- Request `always` location permission (required for background geofencing)
- Only one POI is "currently nearby" at a time — if multiple geofences overlap, pick the closest
- A notification fires once per geofence entry per day; suppress if the task is already done
- On geofence entry: set `nearbyPoi` in app state, schedule a local notification, mark the alert as seen for the day in Firestore

---

## Navigation Structure (KAN-17)

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
5. **Branch from main**, name it `KAN-XX-description`, open a PR when done.
6. **One ticket per branch** — don't bundle multiple KAN tickets into one PR.
7. **Firebase rules**: Firestore reads/writes are always scoped to `/users/{uid}/...` — never read another user's data.
8. **Don't work on Backlog tickets** until they are moved to an active sprint.

---

## Sprint Boundary Rule

**Sprint 1 contains exactly 10 tickets:**
KAN-11, KAN-14, KAN-15, KAN-17, KAN-21, KAN-22, KAN-24, KAN-45, KAN-46, KAN-47.

When all 14 tickets above have been completed and their PRs merged:

1. **Stop immediately.** Do not pick up any new work.
2. **Report to the user** with this exact message:

> "Sprint 1 is complete. All 14 tickets are done. Please review the build and let me know when to start Sprint 2."

3. **Do not start Sprint 2** or any Backlog ticket until the user explicitly says so — even if the next logical task seems obvious.

This rule takes priority over any instruction to "keep going", "continue", or "do the next thing".
