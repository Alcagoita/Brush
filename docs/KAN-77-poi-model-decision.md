# KAN-77 — POI Model Decision: Two Independent Fields

**Status:** Decided  
**Date:** 2026-06-07  
**Author:** Brush engineering  
**Epic:** KAN-72 · Indoor & mall mode  
**Implemented by:** KAN-73 · KAN-74 · KAN-75 · KAN-76

---

## Decision

**Option B — two independent fields** on `Task`:

| Field | Purpose | Engine |
|---|---|---|
| `poi?` | Outdoor, category-level proximity | Outdoor geofence engine (KAN-56) |
| `store?` | Indoor, named-store proximity | Indoor proximity engine (KAN-75) |

A task can have `poi` only, `store` only, both, or neither. The two fields are additive — they never conflict and require no migration.

---

## Why not Option A (discriminated union) or Option C (unified `location` field)?

**Option A** (one `poi` field with a `type` discriminator) would require migrating every existing task document and re-testing all geofence logic. The discriminator approach also entangles two fundamentally different matching algorithms (radius-from-category vs. BLE/Wi-Fi floor matching) into one code path, increasing coupling.

**Option C** (a new `location` superseding both) is premature abstraction. We do not yet know what a third location type would look like (KAN-78 smart matching is out of scope for Sprint 7). Introducing a unified model now would be speculative.

**Option B** is backward-compatible by construction. Existing outdoor logic reads `task.poi` and is never touched. Indoor logic reads `task.store`. The two engines are explicitly forbidden from running simultaneously (see KAN-75 constraint).

---

## TypeScript Types

### Extended `Task` interface additions (implemented in KAN-76)

```ts
/** /users/{uid}/tasks/{taskId} */
export interface Task {
  // ... existing fields unchanged ...

  // ── Outdoor POI (existing, unchanged) ────────────────────────────────────
  poi?:             string;   // Google Places primary type ("supermarket", "atm", …)
  poiPlaceId?:      string;   // Pinned Google Places ID
  poiAlertSeenDate?: string;  // YYYY-MM-DD — suppresses repeat alerts

  // ── Named-store / indoor (KAN-76, new) ───────────────────────────────────
  /**
   * Named store associated with this task. Set when the user tags a specific
   * store via the indoor store picker (KAN-76). Independent of `poi`.
   *
   * A task can have both `poi` and `store` — e.g. "Buy milk" tagged to
   * 'supermarket' (outdoor) AND pinned to "Whole Foods Market" (indoor).
   * The active engine decides which field to evaluate.
   */
  store?: TaskStore;
}

/** A named physical store pinned to a task (KAN-76). */
export interface TaskStore {
  /** Google Places ID for the specific store location. */
  placeId:   string;
  /** Human-readable store name shown in UI (e.g. "Whole Foods Market"). */
  name:      string;
  /**
   * Google Places primary type (e.g. "supermarket").
   * Used to derive an icon and for fallback outdoor matching.
   */
  type:      string;
  /**
   * The date (YYYY-MM-DD) on which an indoor proximity alert was last fired
   * for this task. Mirrors `poiAlertSeenDate` for the indoor path.
   */
  alertSeenDate?: string;
}
```

### No changes to `PoiPreference`, `PoiType`, or any existing constants.

---

## Firestore Schema

```
/users/{uid}
  /tasks/{taskId}
    title:             string
    category:          string
    done:              boolean
    date:              string          // "YYYY-MM-DD"
    createdAt:         Timestamp

    // Outdoor (existing — unchanged)
    poi?:              string          // "supermarket" | "atm" | "pharmacy" | "cafe" | custom
    poiPlaceId?:       string
    poiAlertSeenDate?: string

    // Indoor / named-store (new in KAN-76)
    store?: {
      placeId:         string          // Google Places ID
      name:            string          // "Whole Foods Market"
      type:            string          // "supermarket"
      alertSeenDate?:  string          // "YYYY-MM-DD"
    }
```

`store` is a map field on the task document, not a subcollection. This keeps the task readable in a single Firestore fetch and avoids subcollection fan-out on task list queries.

---

## Notification Preferences

**Outdoor (existing):** per-type radius stored in `/users/{uid}/pois/{poiType}`. No change.

**Indoor (new):** a single global indoor radius preference stored on the user document:

```ts
// Addition to the User document (KAN-75)
indoorRadiusMeters?: number;   // default: 15 m
```

Per-store or per-mall preferences are **out of scope** for Sprint 7. The architecture accommodates them later via an optional `store.radiusMeters` override field without schema changes — the engine falls back to `user.indoorRadiusMeters` if absent.

---

## Nearby Card UI

| Context | Header | Distance display | Primary label |
|---|---|---|---|
| Outdoor | `NEARBY · NOW` | `~120 m` | POI category name |
| Indoor | `NEARBY · INSIDE` | `~8 m` (floor-aware) | Store name |

The `NearbyCard` component receives a `mode: 'outdoor' | 'indoor'` prop (added in KAN-75). Indoor mode renders `store.name` as the primary label and omits the "Open in Maps" CTA (replaced with "I'm here" one-tap dismiss).

The `"NEARBY · NOW"` header changes to `"NEARBY · INSIDE"` in indoor mode. No other header variants are introduced.

---

## New Task Sheet (KAN-76)

The task creation flow gains an optional second step when a POI-capable category is selected:

1. **Outdoor tab** — existing category → POI type picker (unchanged)
2. **Named store tab** (new) — store search via Google Places → sets `task.store`

The two tabs are independent. Selecting one does not clear the other — a user can tag both. If they want only the indoor match, they leave the outdoor POI blank.

---

## Migration Strategy

**No migration required.** Existing tasks that have `poi` set continue to work exactly as before. The `store` field is optional and absent on all existing documents; its absence is handled as "no indoor tag" throughout.

The outdoor engine (KAN-56) reads only `task.poi` and is unaware of `task.store`. The indoor engine (KAN-75) reads only `task.store`. The two engines are **mutually exclusive at runtime** — only one runs depending on the environment detected by KAN-73.

| Scenario | `poi` | `store` | Outdoor engine | Indoor engine |
|---|---|---|---|---|
| Legacy task | `"supermarket"` | absent | active | inactive |
| Indoor-only task | absent | `{...}` | inactive | active |
| Dual-tagged task | `"supermarket"` | `{...}` | active (outdoor) OR inactive (indoor) | active (indoor) OR inactive (outdoor) |
| No location | absent | absent | inactive | inactive |

---

## Constraints (carried into implementation tickets)

- Indoor engine (KAN-75) and outdoor engine (KAN-56) **must never run simultaneously**. The environment detector (KAN-73) sets a single `LocationEnvironment` state: `'outdoor' | 'indoor' | 'unknown'`.
- `Task.store` (KAN-76) and `Task.poi` are **independently optional**. Neither implies the other.
- The smart AI-assisted store matching (KAN-78) is **out of scope for Sprint 7**. The `store` field shape is designed to accommodate it later (the `placeId` is the natural key for any future ML model output).
- Unmapped mall indoor mode must fall back to outdoor gracefully (KAN-75 acceptance criteria).
