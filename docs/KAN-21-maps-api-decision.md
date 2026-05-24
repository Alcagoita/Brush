# KAN-21 — Maps / Places API Decision

## Decision

**Google Places API (New) via REST — no embedded native Maps SDK for v1.0.**

## Rationale

| Concern | Choice | Reasoning |
|---|---|---|
| In-app map rendering | ❌ Not needed | The "Open in Maps" CTA deep-links to the device's native Maps app. No MapView required in v1.0. |
| POI search | Google Places API (New) REST | Official, well-documented, supports all 4 POI types we need. |
| Geofencing | react-native-background-geolocation | Handled separately in KAN-22; no dependency on Maps SDK. |
| SDK weight | Avoided | `react-native-maps` + Google Maps SDK adds ~10 MB+ to the binary. Skipping it keeps the app lean. |

## Alternatives Considered

| Option | Verdict | Reason skipped |
|---|---|---|
| `react-native-maps` + Google Maps SDK | Skipped | Unnecessary for v1.0 — we never render a MapView. |
| Foursquare Places API | Skipped | Google Places has superior coverage and matches the Google Maps deep-link target. |
| OpenStreetMap / Overpass | Skipped | No ATM/pharmacy category support; data quality inconsistent in some locales. |
| Apple Maps / MapKit JS | Skipped | Android-incompatible; no cross-platform REST API for nearby search. |

## API Used

**Google Places API (New)** — `POST https://places.googleapis.com/v1/places:searchNearby`

- Field mask: `places.id,places.displayName,places.location` (minimises billing)
- Rank preference: `DISTANCE` (closest first)
- Max results: 5 per query (we only show the nearest one per POI type)

## POI Type → Google Places Type Mapping

| App type | `includedTypes` value |
|---|---|
| `atm` | `atm` |
| `cafe` | `cafe` |
| `supermarket` | `supermarket` |
| `pharmacy` | `pharmacy` |

## Deep-link Strategy

| Platform | URL scheme |
|---|---|
| Android | `geo:0,0?q={lat},{lng}({label})` — opens Google Maps or system default |
| iOS | `maps://?daddr={lat},{lng}` — Apple Maps; falls back to `maps.google.com` |

## API Key Setup (for new developers)

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new API key for the **Agenda** project.
3. Enable the **Places API (New)** at: https://console.cloud.google.com/apis/library/places.googleapis.com
4. Restrict the key to the **Places API (New)** only.
5. Copy `src/config/keys.example.ts` → `src/config/keys.ts`.
6. Paste the key into `keys.ts`. This file is gitignored and **must never be committed**.

## API Key Security

The key lives in the compiled JS bundle and can be extracted from a released APK/IPA.
This is acceptable for development and internal testing. The following **must be done
before any public release**:

| # | Action | Where |
|---|---|---|
| 1 | **Add Android app restriction** — lock key to the app's bundle ID (`com.agenda`) + SHA-1 signing fingerprint | Cloud Console → Credentials → Edit key → Application restrictions |
| 2 | **Add iOS app restriction** — lock key to bundle ID (`com.agenda`) | Same page → iOS apps |
| 3 | **Set a daily quota cap** — e.g. 1,000 Nearby Search calls/day to bound worst-case billing if the key leaks | Cloud Console → APIs & Services → Places API (New) → Quotas |
| 4 | **Enable billing alerts** — set a budget alert at a comfortable threshold (e.g. $10/month) | Cloud Console → Billing → Budgets & alerts |
| 5 | **Rotate key if ever committed to git** — even briefly; treat a committed key as compromised | Create new key, delete old |

> **Long-term option:** Route Places API calls through a Firebase Cloud Function so the
> key never leaves the server. This is a Sprint 2+ backlog item.

## Files Created / Modified

| File | Change |
|---|---|
| `src/services/maps.ts` | NEW — Places nearby search, `openInMaps`, `formatDistance`, `getDistanceMeters` |
| `src/config/keys.example.ts` | NEW — API key template (no real key, safe to commit) |
| `src/config/keys.ts` | NEW (gitignored) — holds the real key |
| `.gitignore` | Added `src/config/keys.ts` |
