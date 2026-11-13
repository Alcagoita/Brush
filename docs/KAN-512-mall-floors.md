# KAN-512 — In a shopping centre, the floor leads

Discovery note. Answers the ticket's questions 1–8, makes the distance
decision, and lists the follow-up tickets. Nothing here is shipped code.

Status: **approved by the owner** (2026-11-13). Follow-ups filed.

## What is true today (measured, not assumed)

| Fact | Evidence |
|---|---|
| The Worker already serves `floor` on every nearby row. | `cloudflare/src/index.ts:1242-1248`, `:1392`, `:1424`. Live `POST /poi/nearby` at Alma Shopping, 250 m: 82 rows, floors `2`×26, `1`×20, `3`×14, `0`×7, `4`×2, null×13. |
| **The app ignores it.** | No `floor` field in `src/types`, `habitatCache.ts` (no column), `NearbyCard.tsx`, or `proximity.ts`. |
| The null floors are street places, not mall units. | All 13 nulls at Alma are Overture rows round the stadium (`Mr.Pizza Solum`, `Marisqueira do Estádio`, …). Every curated (operator-list) row there has a floor. |
| **28% of Alma's served rows sit on the centre's own coordinate.** | 23 of 82 rows have exactly `40.2044068, -8.4077033` (the footprint centroid) and `distanceMeters: 0`. These are listed tenants that no source could place (`decisions.md`, THE rule, point 1). A distance to them is invented. |
| Floor vocabulary across all 17 lists. | `Piso 0` 779, `Piso 1` 726, `Piso 2` 378, empty 369, `Piso 3` 46, `Piso 4` 26, `Piso -1` 21, `Piso 0/-1/1 GARE` 35, then single figures from `-4` to `6`. |
| "Mall" today means a **toggle**, not a place. | Lantern Mall state (`lantern.ts:132`) comes only from a `MallSnapshot` (KAN-237): the user turns on "Activate Mall mode" in Profile, the app downloads a 400 m nearby circle (capped 50 per type), and Mall state holds while within 400 m of the mall's centre. One mall at a time. |
| A second, older indoor path still exists. | `indoorDetection.ts` (GPS degraded + a `shopping_mall` within 300 m) starts `indoorProximity.ts` (KAN-75): 15 s polling, **10 m store alerts**, matching on `placeId`. It calls `searchNearbyPlaces` and matches a stored place id — both against current rules (no Google in runtime, no pinned places). |
| `footprints.json` is extraction-only. | Read by `mall_tenants.py`; nothing in `src/` or `cloudflare/src/` loads it. 13 centres have outlines. |

The ticket's Café Pans example does not hold at Alma: the list has
`Café Pans|Piso 0` and `Pans & Company|Piso 3`, two brands. Real
several-floor cases do exist: `OAKBERRY` (Colombo, Piso 0 and 2),
`PORTELA CAFÉS` (Vasco da Gama, Piso 2 and -1), `NOS` (Vasco da Gama,
Piso 0 and -1).

## Decisions

### 1. When are we in a centre?

**When the settled position is inside the centre's strict footprint outline.**
Not the 400 m snapshot circle, not "GPS got worse", not a POI count.

- The footprint is a building outline, so a dense high street can never pass
  for a centre, which was KAN-382's worry.
- **Enter** on the first settled fix inside the strict outline.
  **Leave** on the first settled fix outside the outline *plus a 30 m buffer*.
  The gap stops the street door from flapping. A surface car park is outside,
  and that's correct: from there the user is walking towards the centre, not
  in it. Underground car parks are usually inside the outline.
- Entering a centre is **automatic and needs no prompt.** It only changes
  presentation (floor instead of distance), costs no extra battery, and
  claims nothing new. KAN-382's opt-in prompt is dropped. The Profile toggle
  ("Activate Mall mode") goes: its copy uses the banned word "mode", and
  KAN-382's inventory download replaces what it did.
- Centres with no footprint behave as they do today (outdoor rules).
  Footprints are added as each centre is reconciled.
- KAN-55's fine accuracy stays as it is. It does not decide anything here:
  better horizontal accuracy still can't tell one floor from another.

### 2. What the Nearby card says, and when distance is shown

**Decision: a unit of the centre you are in never shows a distance. It shows
its floor.** Distance stays, unchanged, for every place outside that centre.

Why:
- For 28% of the rows (Alma) the coordinate *is* the centre's centroid, so any
  distance is made up. The app never lies.
- Where a unit does have a real coordinate, GPS under a roof drifts by tens of
  metres and has no notion of floor. "40 m" to a shop two floors up is wrong
  in the way that matters.
- The floor is the one thing that is always true and gets a person there:
  centre signage is numbered the same way.

Retail-park units (Nova Arcada's IKEA, MAR's IKEA) follow the same rule in v1:
they are on the operator's list, so they belong to the centre and show
`Piso 0`. Showing a distance for them would need a flag saying the
coordinate is real and not the centroid. **Open question for the owner**, not
needed for v1.

### 3. Ordering

**We never assume the user's floor.** We don't ask (friction, and it's stale
after one escalator) and we don't infer it from the last brush (a guess
presented as knowledge).

Inside a centre, Nearby **sorts matches by floor, lowest first** (`-1, 0, 1,
2 …`), and each row carries its own floor ("Zara · Floor 1"). There are no
floor section headers: a row can swap to another floor (decision 4b), and a
header would make it jump section under the user's thumb. Within a floor,
the task list's own order holds. Sorting is a way of reading, not a
proximity claim: it's how the centre's own directory is laid out. Units with
no floor come last. The sort runs when the card loads; a swapped row keeps
its position until the next entry.

### 4. Two Nearby cards, one per context (owner, 2026-11-13)

Detection (decision 1) picks the card. The two never show together.

| Context | Card | Shows |
|---|---|---|
| Outside any centre | `NearbyCard`, **unchanged** | Closest match as hero (≤ 100 m), "also close" 100–400 m, distances |
| Inside a centre | **new `MallNearbyCard`** | The centre's name, every matching task in the centre, sorted by floor, the floor on each row, "Try another place" per row, **no distance** |

- Inside a centre, **the whole centre is "here".** `HERO_RADIUS_M` and
  `NEARBY_RADIUS` don't apply to the centre's own units.
- "N waiting" is allowed on the mall card because the count comes from the
  downloaded inventory, which is verifiable.
- **Its own colour.** The mall card gets its own token family in
  `src/theme/tokens.ts`, parallel to `nearTint / nearTint2 / nearBorder /
  nearText`: `mallTint`, `mallTint2`, `mallBorder`, `mallText`, `mallAccent`,
  light and dark, consumed through `useTheme()`. The hue must not collide with
  the category colours (blue 250, sage 165, purple 305, peach 65–70). Final
  values are set in the design pass for ticket D; the dark `mallBorder` keeps
  the ≥ 3:1 contrast rule `nearBorder` already follows.
- The same structure as `NearbyCard` (1 px border, no shadow, the `PoiIcon`
  tile pattern, Geist, tabular numerals on the floor number). Only the palette
  and the content differ.
- Places outside the centre are not shown while inside it, because the
  outdoor card doesn't render there. The mall card has no "also close"
  section (owner approved the mockup without one, 2026-11-13).
- Store-level notifications inside a centre stay off (KAN-382, unchanged).
  With foreground-only location, "the app changes" means the mall card is
  what Today shows when opened inside a centre; nothing is pushed.

### 4b. "Try another place" on each row (owner, 2026-11-13)

Each suggestion on the mall card has its own **"Try another place"** /
**"Tentar outro local"** (the existing `nearbyCard.tryAnotherPlace` strings),
not one button for the whole card.

- Shown only when the centre holds **at least two different places** that
  solve that task.
- Tapping it swaps **that row only** to the next candidate's name and floor;
  other rows don't move. It wraps round after the last one, as `NearbyCard`'s
  `handleTryAnother` does.
- Candidates: every unit in the centre matching the task (type, subtype,
  brand), learned brand first, then floor ascending.
- Brand-required tasks (Gym, Bank, Store once KAN-368 lands) rotate only
  within that brand.
- Units of the **same brand count as one candidate** (decision 6), so the
  button moves to a different place, never to the same brand's other floor.
- The choice is **for this visit only**: it resets on the next entry and is
  never stored, so no place is ever pinned.
- Accessibility label names the task ("Try another place for Buy a white
  shirt").

### 5. Floor wording

- Stored value: **one integer-like string** (`"-1"`, `"0"`, `"2"`). KAN-503
  normalises the 135 curated rows that still store `"Piso N"`. The Worker
  already serves this shape for Overture rows.
- Displayed: **pt-PT `Piso 2`, en `Floor 2`**, using the operator's number.
  `0` stays `0`, and isn't translated to "ground floor", because the signs
  in the centre say 0. Negative floors read as written: `Piso -1` / `Floor -1`.
- `Piso R` is stored as `0` (existing ruling). Zone words (`GARE`) are dropped,
  as in the mall-list README.
- Sentence case; no banned words.

### 6. One brand on several floors

A brand's units in one centre are **one suggestion**, not several, and the
row lists **every distinct floor, lowest first**: `Pisos -1 e 2` /
`Floors -1 and 2`. Today's data never has more than two. If a third
appears, show the first two and `+1`.

### 7. Offline

KAN-382's venue inventory must carry **`floor` and the footprint outline**,
so detection (decision 1) and the card (decision 2) both work with no signal.
`habitat_places` needs a `floor` column. KAN-382's inventory replaces the
KAN-237 snapshot, which only holds a 400 m nearby circle capped at 50 per type:
not every tenant of a 279-unit centre fits in it.

Offline works once the centre has been downloaded, which needs a signal at
least once. A first-ever visit with no signal and no earlier download still
shows nothing. Prefetching nearby centres in the background, as the
habitat prefetch already learns the 5 km around the user, covers most of
those; it belongs in KAN-382.

### 8. Places with no floor

- **Outside a centre:** unchanged. Name plus distance.
- **Inside a centre, unit with no floor:** name only, no floor after it,
  sorted last. The Lantern already names the centre, and the app shows
  nothing rather than a placeholder or a guessed floor.

## Mock copy

Inside Alma Shopping, Lantern in Mall state.

| | en | pt-PT |
|---|---|---|
| Centre card title | While you're at Alma Shopping | Enquanto estás no Alma Shopping |
| Count line | 3 waiting here | 3 à espera aqui |
| Row, with floor | Zara · Floor 1 | Zara · Piso 1 |
| Row button | Try another place | Tentar outro local |
| Row, several floors | OAKBERRY · Floors 0 and 2 | OAKBERRY · Pisos 0 e 2 |
| Row, no floor | Zara | Zara |
Outside any centre: the existing `NearbyCard`, unchanged (`Pharmacy · 60 m`).

The title reuses the existing `mallSheetTitle` strings. Check the pt-PT
article ("no"/"na") per centre name before shipping; a gender-neutral
fallback is `Enquanto estás em {name}`, which the sheet already uses.

## Later options, not needed now

Indoor positioning (beacons, Wi-Fi fingerprinting, barometric altitude) would
be the only way to know the user's floor and to order by it. Nothing above
needs it. Revisit only if users ask for "what's on my floor".

## Follow-up tickets

| # | Ticket | Kind | Depends on |
|---|---|---|---|
| A | **KAN-503** (existed): one floor format | data | — |
| B | **KAN-382** (rewritten 2026-11-13): paginated venue inventory carrying `floor` + footprint; offline cache (`floor` column); replaces KAN-237 snapshot; drop the opt-in prompt | Worker + app data | A |
| C | **KAN-513**: centre detection by footprint, enter/leave hysteresis; Lantern Mall state automatic; remove the Profile toggle; exposes "inside centre X" for the card switch | app logic | B |
| D | **KAN-514**: new `MallNearbyCard` with its own `mall*` tokens (light + dark), floor rows, no distance, floor grouping, several-floor brands, copy en + pt-PT; Today renders it inside a centre and `NearbyCard` only outside | app UI + tokens + copy | C |
| E | **KAN-515**: retire the KAN-75 indoor engine (`indoorDetection` → `indoorProximity`): Google lookup, `placeId` match, 10 m alerts, Store fine tuning prompt | app cleanup | — |

Jira links: KAN-503 blocks KAN-382 blocks KAN-513 blocks KAN-514; KAN-512
relates to all five. All under epic KAN-72, in the backlog.

Dependencies recorded: KAN-503 (floor format), KAN-382 (offline inventory),
KAN-301 (Lantern Mall state), KAN-55 (accuracy mode, unchanged), plus
KAN-237 and KAN-75 (superseded by B/C and retired by E).
