# KAN-433 — Foursquare tourism import, PT, Tier 1 — DRY RUN

Run `kan433-pt-tier1-20260918`, generated 2026-09-18T22:04Z by `cloudflare/extraction/import_foursquare_tourism.py`. Nothing was written to D1 or R2; this is what `--emit` would do.

## Inputs

- Foursquare archive: `country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv` — 396,749 rows (sha256 `82b04934657742e497ba7832a8fab81aa09fb4703958b63cd3e92fa25ab33b98`); 41,186 distinct rows carry an in-scope leaf.
- Leaf → type map: `docs/kan-433/leaf-type-map.json` (52 leaf rules, 2 suffix rules, 8 tier-2 leaves).
- Overture base: `overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv` — 215,698 promoted of 350,415 rows under the committed overrides.
- Curated rows (active, all types): 289.
- MULTIBANCO: 1 distinct name(s) read; 0 row(s) fetched as possible name matches.
- Foursquare-keyed `poi_source_correction` rows honoured: 5.
- Matcher: `supplement_osm_pois.names_match` within 75 m, type-blind, against every served row. Same name 75–400 m away is skipped as suspect. Distance alone never skips.

## Totals

| | rows |
|---|---:|
| **would insert** | **9,741** |
| skipped — noise leaf | 12,693 |
| skipped — parent-only leaf | 2,726 |
| skipped — tier 2 leaf | 6,983 |
| skipped — unmapped leaf | 3,081 |
| skipped — empty name | 33 |
| skipped — matched | 4,728 |
| skipped — weak name | 118 |
| skipped — suspect | 983 |
| skipped — in-batch duplicate | 100 |
| in-scope rows, total | 41,186 |

SQL: 48 statement(s), 3,710,536 bytes (47 `curated_poi` + 1 `curated_poi_attribute`), largest 79,996 bytes (cap 80,000). Rows with a second type (written as `curated_poi_attribute` `poi_type`): 244.

## Would insert, by our type

| primary_poi_type | rows | + as second type |
|---|---:|---:|
| `church` | 1,962 | 32 |
| `historical_landmark` | 1,603 | 112 |
| `night_club` | 948 | 4 |
| `music_venue` | 743 | 4 |
| `art_gallery` | 547 | 7 |
| `museum` | 446 | 18 |
| `hiking_area` | 430 | 4 |
| `campground` | 371 | 0 |
| `stadium` | 364 | 1 |
| `mountain` | 290 | 7 |
| `river` | 278 | 6 |
| `marina` | 236 | 4 |
| `amusement_park` | 211 | 3 |
| `bridge` | 209 | 6 |
| `lake` | 197 | 4 |
| `surf_spot` | 164 | 1 |
| `theatre` | 130 | 11 |
| `movie_theater` | 128 | 5 |
| `water_park` | 88 | 8 |
| `nature_preserve` | 79 | 7 |
| `waterfall` | 72 | 3 |
| `hot_spring` | 71 | 0 |
| `lighthouse` | 68 | 2 |
| `casino` | 51 | 0 |
| `botanical_garden` | 17 | 0 |
| `aquarium` | 13 | 0 |
| `zoo` | 12 | 0 |
| `mosque` | 9 | 1 |
| `synagogue` | 4 | 0 |

## Per leaf

A row with several in-scope leaves counts under each, so columns sum past the distinct totals above. Skip reasons that are the same for every row of a leaf (tier 2, noise, parent, excluded, unmapped) show the leaf's whole count.

| leaf | kind | our type(s) | rows | would insert | noise leaf | parent-only leaf | tier 2 leaf | unmapped leaf | empty name | matched | weak name | suspect | in-batch duplicate |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Church | tier1 | `church` | 3,284 | 1,875 | 0 | 0 | 0 | 0 | 3 | 1,216 | 4 | 164 | 22 |
| Night Club | tier1 | `night_club` | 1,395 | 952 | 0 | 0 | 0 | 0 | 1 | 367 | 17 | 47 | 11 |
| Historic and Protected Site | tier1 | `historical_landmark` | 1,311 | 758 | 0 | 0 | 0 | 0 | 7 | 419 | 16 | 104 | 7 |
| Art Gallery | tier1 | `art_gallery` | 891 | 554 | 0 | 0 | 0 | 0 | 0 | 296 | 0 | 38 | 3 |
| Music Venue | tier1 | `music_venue` | 644 | 474 | 0 | 0 | 0 | 0 | 0 | 136 | 4 | 27 | 3 |
| Hiking Trail | tier1 | `hiking_area` | 583 | 434 | 0 | 0 | 0 | 0 | 0 | 105 | 10 | 33 | 1 |
| Monument | tier1 | `historical_landmark` | 610 | 390 | 0 | 0 | 0 | 0 | 1 | 174 | 2 | 38 | 5 |
| Campground | tier1 | `campground` | 622 | 371 | 0 | 0 | 0 | 0 | 2 | 188 | 0 | 60 | 1 |
| Mountain | tier1 | `mountain` | 371 | 297 | 0 | 0 | 0 | 0 | 3 | 48 | 2 | 21 | 0 |
| River | tier1 | `river` | 390 | 283 | 0 | 0 | 0 | 0 | 1 | 79 | 0 | 25 | 2 |
| Concert Hall | tier1 | `music_venue` | 427 | 275 | 0 | 0 | 0 | 0 | 0 | 132 | 1 | 16 | 3 |
| Museum | tier1 | `museum` | 584 | 256 | 0 | 0 | 0 | 0 | 0 | 271 | 0 | 55 | 2 |
| Harbor or Marina | tier1 | `marina` | 336 | 240 | 0 | 0 | 0 | 0 | 3 | 50 | 10 | 33 | 0 |
| Bridge | tier1 | `bridge` | 355 | 215 | 0 | 0 | 0 | 0 | 0 | 95 | 13 | 31 | 1 |
| Soccer Stadium | tier1 | `stadium` | 368 | 214 | 0 | 0 | 0 | 0 | 1 | 126 | 1 | 24 | 2 |
| Public Art | tier1 | `historical_landmark` | 247 | 211 | 0 | 0 | 0 | 0 | 0 | 26 | 0 | 9 | 1 |
| Lake | tier1 | `lake` | 301 | 200 | 0 | 0 | 0 | 0 | 0 | 68 | 1 | 30 | 2 |
| Surf Spot | tier1 | `surf_spot` | 343 | 165 | 0 | 0 | 0 | 0 | 2 | 123 | 5 | 45 | 3 |
| History Museum | tier1 | `museum` | 352 | 142 | 0 | 0 | 0 | 0 | 0 | 169 | 1 | 38 | 2 |
| Theater | tier1 | `theatre` | 321 | 141 | 0 | 0 | 0 | 0 | 0 | 161 | 1 | 16 | 2 |
| Amusement Park | tier1 | `amusement_park` | 181 | 134 | 0 | 0 | 0 | 0 | 0 | 34 | 1 | 12 | 0 |
| Movie Theater | tier1 | `movie_theater` | 282 | 133 | 0 | 0 | 0 | 0 | 0 | 126 | 1 | 11 | 11 |
| Water Park | tier1 | `water_park` | 142 | 96 | 0 | 0 | 0 | 0 | 1 | 29 | 6 | 10 | 0 |
| Nature Preserve | tier1 | `nature_preserve` | 115 | 85 | 0 | 0 | 0 | 0 | 0 | 22 | 1 | 6 | 1 |
| Castle | tier1 | `historical_landmark` | 185 | 83 | 0 | 0 | 0 | 0 | 1 | 76 | 2 | 21 | 2 |
| Stadium | tier1 | `stadium` | 161 | 82 | 0 | 0 | 0 | 0 | 0 | 67 | 1 | 10 | 1 |
| Attraction | tier1 | `amusement_park` | 97 | 80 | 0 | 0 | 0 | 0 | 0 | 11 | 0 | 6 | 0 |
| Waterfall | tier1 | `waterfall` | 102 | 75 | 0 | 0 | 0 | 0 | 0 | 15 | 3 | 7 | 2 |
| Hot Spring | tier1 | `hot_spring` | 90 | 71 | 0 | 0 | 0 | 0 | 1 | 11 | 0 | 7 | 0 |
| Lighthouse | tier1 | `lighthouse` | 138 | 70 | 0 | 0 | 0 | 0 | 2 | 53 | 5 | 8 | 0 |
| Fountain | tier1 | `historical_landmark` | 94 | 65 | 0 | 0 | 0 | 0 | 0 | 24 | 0 | 3 | 2 |
| Shrine | tier1 | `church`, `historical_landmark` | 92 | 63 | 0 | 0 | 0 | 0 | 0 | 20 | 1 | 7 | 1 |
| Sculpture Garden | tier1 | `historical_landmark` | 84 | 59 | 0 | 0 | 0 | 0 | 0 | 17 | 2 | 6 | 0 |
| Art Museum | tier1 | `museum` | 160 | 55 | 0 | 0 | 0 | 0 | 0 | 92 | 0 | 11 | 2 |
| Casino | tier1 | `casino` | 70 | 51 | 0 | 0 | 0 | 0 | 1 | 16 | 1 | 1 | 0 |
| Temple | tier1 | `church`, `historical_landmark` | 70 | 47 | 0 | 0 | 0 | 0 | 1 | 16 | 0 | 6 | 0 |
| Palace | tier1 | `historical_landmark` | 62 | 39 | 0 | 0 | 0 | 0 | 0 | 16 | 0 | 4 | 3 |
| Science Museum | tier1 | `museum` | 64 | 27 | 0 | 0 | 0 | 0 | 0 | 34 | 0 | 3 | 0 |
| Tennis Stadium | tier1 | `stadium` | 37 | 27 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 3 | 0 |
| Windmill | tier1 | `historical_landmark` | 24 | 19 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 2 | 1 |
| Botanical Garden | tier1 | `botanical_garden` | 34 | 17 | 0 | 0 | 0 | 0 | 0 | 13 | 1 | 1 | 2 |
| Hockey Stadium | tier1 | `stadium` | 27 | 15 | 0 | 0 | 0 | 0 | 0 | 9 | 2 | 1 | 0 |
| Aquarium | tier1 | `aquarium` | 26 | 13 | 0 | 0 | 0 | 0 | 0 | 10 | 1 | 1 | 1 |
| Basketball Stadium | tier1 | `stadium` | 32 | 12 | 0 | 0 | 0 | 0 | 0 | 16 | 1 | 3 | 0 |
| Monastery | tier1 | `historical_landmark`, `church` | 30 | 12 | 0 | 0 | 0 | 0 | 0 | 14 | 0 | 4 | 0 |
| Zoo | tier1 | `zoo` | 25 | 12 | 0 | 0 | 0 | 0 | 0 | 11 | 0 | 2 | 0 |
| Football Stadium | tier1 | `stadium` | 19 | 11 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 |
| Mosque | tier1 | `mosque` | 17 | 10 | 0 | 0 | 0 | 0 | 1 | 4 | 1 | 1 | 0 |
| Track Stadium | tier1 | `stadium` | 10 | 5 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 1 | 0 |
| Synagogue | tier1 | `synagogue` | 8 | 4 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 0 |
| Baseball Stadium | tier1 | `stadium` | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rugby Stadium | tier1 | `stadium` | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ruin | tier1 | `historical_landmark` | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Erotic Museum | tier1 | `museum` | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tower | tier1 | `historical_landmark` | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fort | tier1 | `historical_landmark` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| Scenic Lookout | tier2 |  | 1,585 | 55 | 0 | 0 | 1,466 | 0 | 0 | 54 | 2 | 8 | 0 |
| Beach | tier2 |  | 1,464 | 41 | 0 | 0 | 1,328 | 0 | 0 | 66 | 4 | 25 | 0 |
| Park | tier2 |  | 1,295 | 16 | 0 | 0 | 1,248 | 0 | 0 | 21 | 1 | 9 | 0 |
| Garden | tier2 |  | 1,022 | 10 | 0 | 0 | 1,001 | 0 | 0 | 6 | 0 | 5 | 0 |
| Playground | tier2 |  | 795 | 10 | 0 | 0 | 782 | 0 | 0 | 3 | 0 | 0 | 0 |
| Plaza | tier2 |  | 1,132 | 2 | 0 | 0 | 1,120 | 0 | 0 | 10 | 0 | 0 | 0 |
| Island | tier2 |  | 67 | 2 | 0 | 0 | 65 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pedestrian Plaza | tier2 |  | 122 | 0 | 0 | 0 | 121 | 0 | 0 | 0 | 0 | 1 | 0 |
| Performing Arts Venue | unmapped |  | 200 | 13 | 0 | 0 | 0 | 172 | 0 | 14 | 0 | 1 | 0 |
| Outdoor Sculpture | unmapped |  | 164 | 9 | 0 | 0 | 2 | 142 | 0 | 11 | 0 | 0 | 0 |
| Street Art | unmapped |  | 107 | 6 | 0 | 0 | 0 | 100 | 0 | 1 | 0 | 0 | 0 |
| Rock Club | unmapped |  | 102 | 5 | 0 | 0 | 0 | 91 | 0 | 4 | 0 | 2 | 0 |
| Bathing Area | unmapped |  | 116 | 4 | 0 | 0 | 3 | 107 | 0 | 1 | 0 | 0 | 1 |
| Exhibit | unmapped |  | 86 | 4 | 0 | 0 | 0 | 80 | 0 | 2 | 0 | 0 | 0 |
| Rock Climbing Spot | unmapped |  | 47 | 4 | 0 | 0 | 0 | 43 | 0 | 0 | 0 | 0 | 0 |
| Prayer Room | unmapped |  | 166 | 3 | 0 | 0 | 1 | 161 | 0 | 1 | 0 | 0 | 0 |
| Indie Movie Theater | unmapped |  | 69 | 3 | 0 | 0 | 0 | 55 | 0 | 10 | 0 | 1 | 0 |
| National Park | unmapped |  | 47 | 3 | 0 | 0 | 5 | 37 | 0 | 2 | 0 | 0 | 0 |
| Picnic Area | unmapped |  | 26 | 3 | 0 | 0 | 2 | 20 | 0 | 1 | 0 | 0 | 0 |
| State or Provincial Park | unmapped |  | 23 | 3 | 0 | 0 | 1 | 18 | 0 | 1 | 0 | 0 | 0 |
| Bike Trail | unmapped |  | 22 | 3 | 0 | 0 | 1 | 18 | 0 | 0 | 0 | 0 | 0 |
| Dog Park | unmapped |  | 231 | 2 | 0 | 0 | 25 | 204 | 0 | 0 | 0 | 0 | 0 |
| Fair | unmapped |  | 161 | 2 | 0 | 0 | 0 | 156 | 0 | 3 | 0 | 0 | 0 |
| Stable | unmapped |  | 160 | 2 | 0 | 0 | 1 | 156 | 0 | 1 | 0 | 0 | 0 |
| Amphitheater | unmapped |  | 37 | 2 | 0 | 0 | 0 | 34 | 0 | 1 | 0 | 0 | 0 |
| Indie Theater | unmapped |  | 32 | 2 | 0 | 0 | 0 | 29 | 0 | 1 | 0 | 0 | 0 |
| Tunnel | unmapped |  | 30 | 2 | 0 | 0 | 1 | 27 | 0 | 0 | 0 | 0 | 0 |
| Opera House | unmapped |  | 5 | 2 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| Strip Club | unmapped |  | 234 | 1 | 0 | 0 | 0 | 231 | 0 | 2 | 0 | 0 | 0 |
| Comedy Club | unmapped |  | 90 | 1 | 0 | 0 | 0 | 88 | 0 | 1 | 0 | 0 | 0 |
| Roof Deck | unmapped |  | 88 | 1 | 0 | 0 | 4 | 83 | 0 | 0 | 0 | 0 | 0 |
| Cave | unmapped |  | 44 | 1 | 0 | 0 | 0 | 43 | 0 | 0 | 0 | 0 | 0 |
| Memorial Site | unmapped |  | 31 | 1 | 0 | 0 | 0 | 28 | 0 | 2 | 0 | 0 | 0 |
| Volcano | unmapped |  | 27 | 1 | 0 | 0 | 0 | 25 | 0 | 1 | 0 | 0 | 0 |
| Circus | unmapped |  | 26 | 1 | 0 | 0 | 0 | 25 | 0 | 0 | 0 | 0 | 0 |
| Party Center | unmapped |  | 23 | 1 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 |
| Zoo Exhibit | unmapped |  | 14 | 1 | 0 | 0 | 2 | 10 | 0 | 0 | 0 | 1 | 0 |
| Dam | unmapped |  | 13 | 1 | 0 | 0 | 2 | 9 | 0 | 1 | 0 | 0 | 0 |
| Planetarium | unmapped |  | 10 | 1 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 | 0 |
| Buddhist Temple | unmapped |  | 5 | 1 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| Ticket Seller | unmapped |  | 3 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| Pool Hall | unmapped |  | 181 | 0 | 0 | 0 | 0 | 181 | 0 | 0 | 0 | 0 | 0 |
| Internet Cafe | unmapped |  | 95 | 0 | 0 | 0 | 0 | 95 | 0 | 0 | 0 | 0 | 0 |
| Arcade | unmapped |  | 92 | 0 | 0 | 0 | 2 | 90 | 0 | 0 | 0 | 0 | 0 |
| Bowling Alley | unmapped |  | 75 | 0 | 0 | 0 | 0 | 74 | 0 | 1 | 0 | 0 | 0 |
| Dive Spot | unmapped |  | 57 | 0 | 0 | 0 | 0 | 56 | 0 | 0 | 0 | 0 | 1 |
| Gaming Cafe | unmapped |  | 52 | 0 | 0 | 0 | 0 | 52 | 0 | 0 | 0 | 0 | 0 |
| Jazz and Blues Venue | unmapped |  | 45 | 0 | 0 | 0 | 0 | 44 | 0 | 1 | 0 | 0 | 0 |
| Go Kart Track | unmapped |  | 40 | 0 | 0 | 0 | 0 | 40 | 0 | 0 | 0 | 0 | 0 |
| Escape Room | unmapped |  | 36 | 0 | 0 | 0 | 1 | 35 | 0 | 0 | 0 | 0 | 0 |
| Mini Golf Course | unmapped |  | 28 | 0 | 0 | 0 | 0 | 28 | 0 | 0 | 0 | 0 | 0 |
| Nudist Beach | unmapped |  | 25 | 0 | 0 | 0 | 6 | 19 | 0 | 0 | 0 | 0 | 0 |
| Psychic and Astrologer | unmapped |  | 22 | 0 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 |
| Natural Park | unmapped |  | 18 | 0 | 0 | 0 | 1 | 16 | 0 | 1 | 0 | 0 | 0 |
| Salsa Club | unmapped |  | 17 | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 |
| Country Dance Club | unmapped |  | 16 | 0 | 0 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 |
| Laser Tag Center | unmapped |  | 16 | 0 | 0 | 0 | 2 | 14 | 0 | 0 | 0 | 0 | 0 |
| Urban Park | unmapped |  | 16 | 0 | 0 | 0 | 1 | 15 | 0 | 0 | 0 | 0 | 0 |
| Roller Rink | unmapped |  | 11 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 |
| Boat Launch | unmapped |  | 8 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 |
| Picnic Shelter | unmapped |  | 6 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 |
| Carnival | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| VR Cafe | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| Country Club | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| Mountain Hut | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| Dance Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| Disc Golf | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| Disc Golf Course | unmapped |  | 2 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| Kingdom Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| Nature Trail | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| Bingo Center | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| Community Garden | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| Drive-in Theater | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| General Entertainment | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| Hindu Temple | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| Terreiro | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| Arts and Entertainment | parent |  | 2,183 | 4 | 0 | 2,157 | 15 | 3 | 0 | 3 | 0 | 1 | 0 |
| Spiritual Center | parent |  | 384 | 4 | 0 | 365 | 2 | 1 | 0 | 10 | 0 | 2 | 0 |
| Landmarks and Outdoors | parent |  | 207 | 1 | 0 | 205 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| Other Great Outdoors | noise |  | 1,999 | 40 | 1,826 | 4 | 69 | 19 | 0 | 24 | 1 | 16 | 0 |
| Canal | noise |  | 36 | 13 | 19 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 |
| Field | noise |  | 1,045 | 11 | 1,016 | 0 | 10 | 6 | 0 | 1 | 1 | 0 | 0 |
| Neighborhood | noise |  | 1,877 | 4 | 1,841 | 1 | 21 | 0 | 0 | 5 | 2 | 3 | 0 |
| Canal Lock | noise |  | 10 | 4 | 3 | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 0 |
| Structure | noise |  | 3,274 | 3 | 3,252 | 5 | 6 | 0 | 0 | 7 | 0 | 1 | 0 |
| Farm | noise |  | 1,949 | 3 | 1,928 | 1 | 4 | 11 | 0 | 1 | 0 | 1 | 0 |
| City | noise |  | 1,790 | 2 | 1,782 | 0 | 2 | 0 | 0 | 0 | 3 | 1 | 0 |
| Forest | noise |  | 63 | 2 | 55 | 0 | 3 | 1 | 0 | 1 | 0 | 1 | 0 |
| Village | noise |  | 599 | 1 | 593 | 0 | 3 | 0 | 0 | 0 | 1 | 1 | 0 |
| Town | noise |  | 310 | 1 | 307 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 |
| Well | noise |  | 74 | 1 | 71 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| Waterfront | noise |  | 40 | 1 | 32 | 0 | 5 | 0 | 0 | 1 | 1 | 0 | 0 |
| Tree | noise |  | 37 | 1 | 34 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bay | noise |  | 25 | 1 | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| States and Municipalities | noise |  | 48 | 0 | 48 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Reservoir | noise |  | 14 | 0 | 13 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hill | noise |  | 9 | 0 | 8 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| County | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pass | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| State | noise |  | 3 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pond | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Unmapped leaves — in scope, not in the map, imported nothing

| leaf | rows | paths |
|---|---:|---|
| Performing Arts Venue | 200 | Arts and Entertainment > Performing Arts Venue |
| Outdoor Sculpture | 164 | Arts and Entertainment > Public Art > Outdoor Sculpture |
| Street Art | 107 | Arts and Entertainment > Public Art > Street Art |
| Rock Club | 102 | Arts and Entertainment > Performing Arts Venue > Music Venue > Rock Club |
| Bathing Area | 116 | Landmarks and Outdoors > Bathing Area |
| Exhibit | 86 | Arts and Entertainment > Exhibit |
| Rock Climbing Spot | 47 | Landmarks and Outdoors > Rock Climbing Spot |
| Prayer Room | 166 | Community and Government > Spiritual Center > Prayer Room |
| Indie Movie Theater | 69 | Arts and Entertainment > Movie Theater > Indie Movie Theater |
| National Park | 47 | Landmarks and Outdoors > Park > National Park |
| Picnic Area | 26 | Landmarks and Outdoors > Park > Picnic Area |
| State or Provincial Park | 23 | Landmarks and Outdoors > Park > State or Provincial Park |
| Bike Trail | 22 | Landmarks and Outdoors > Bike Trail |
| Dog Park | 231 | Landmarks and Outdoors > Park > Dog Park |
| Fair | 161 | Arts and Entertainment > Fair |
| Stable | 160 | Landmarks and Outdoors > Stable |
| Amphitheater | 37 | Arts and Entertainment > Performing Arts Venue > Amphitheater |
| Indie Theater | 32 | Arts and Entertainment > Performing Arts Venue > Indie Theater |
| Tunnel | 30 | Landmarks and Outdoors > Tunnel |
| Opera House | 5 | Arts and Entertainment > Performing Arts Venue > Opera House |
| Strip Club | 234 | Arts and Entertainment > Strip Club |
| Comedy Club | 90 | Arts and Entertainment > Comedy Club |
| Roof Deck | 88 | Landmarks and Outdoors > Roof Deck |
| Cave | 44 | Landmarks and Outdoors > Cave |
| Memorial Site | 31 | Landmarks and Outdoors > Memorial Site |
| Volcano | 27 | Landmarks and Outdoors > Volcano |
| Circus | 26 | Arts and Entertainment > Circus |
| Party Center | 23 | Arts and Entertainment > Party Center |
| Zoo Exhibit | 14 | Arts and Entertainment > Zoo > Zoo Exhibit |
| Dam | 13 | Landmarks and Outdoors > Dam |
| Planetarium | 10 | Arts and Entertainment > Planetarium |
| Buddhist Temple | 5 | Community and Government > Spiritual Center > Buddhist Temple |
| Ticket Seller | 3 | Arts and Entertainment > Ticket Seller |
| Pool Hall | 181 | Arts and Entertainment > Pool Hall |
| Internet Cafe | 95 | Arts and Entertainment > Internet Cafe |
| Arcade | 92 | Arts and Entertainment > Arcade |
| Bowling Alley | 75 | Arts and Entertainment > Bowling Alley |
| Dive Spot | 57 | Landmarks and Outdoors > Dive Spot |
| Gaming Cafe | 52 | Arts and Entertainment > Gaming Cafe |
| Jazz and Blues Venue | 45 | Arts and Entertainment > Performing Arts Venue > Music Venue > Jazz and Blues Venue |
| Go Kart Track | 40 | Arts and Entertainment > Go Kart Track |
| Escape Room | 36 | Arts and Entertainment > Escape Room |
| Mini Golf Course | 28 | Arts and Entertainment > Mini Golf Course |
| Nudist Beach | 25 | Landmarks and Outdoors > Nudist Beach |
| Psychic and Astrologer | 22 | Arts and Entertainment > Psychic and Astrologer |
| Natural Park | 18 | Landmarks and Outdoors > Park > Natural Park |
| Salsa Club | 17 | Arts and Entertainment > Salsa Club |
| Country Dance Club | 16 | Arts and Entertainment > Country Dance Club |
| Laser Tag Center | 16 | Arts and Entertainment > Laser Tag Center |
| Urban Park | 16 | Landmarks and Outdoors > Park > Urban Park |
| Roller Rink | 11 | Arts and Entertainment > Roller Rink |
| Boat Launch | 8 | Landmarks and Outdoors > Boat Launch |
| Picnic Shelter | 6 | Landmarks and Outdoors > Picnic Shelter |
| Carnival | 4 | Arts and Entertainment > Carnival |
| VR Cafe | 4 | Arts and Entertainment > VR Cafe |
| Country Club | 3 | Arts and Entertainment > Country Club |
| Mountain Hut | 3 | Landmarks and Outdoors > Mountain Hut |
| Dance Hall | 2 | Arts and Entertainment > Dance Hall |
| Disc Golf | 2 | Arts and Entertainment > Disc Golf |
| Disc Golf Course | 2 | Arts and Entertainment > Disc Golf Course |
| Kingdom Hall | 2 | Community and Government > Spiritual Center > Kingdom Hall |
| Nature Trail | 2 | Landmarks and Outdoors > Nature Trail |
| Bingo Center | 1 | Arts and Entertainment > Bingo Center |
| Community Garden | 1 | Landmarks and Outdoors > Garden > Community Garden |
| Drive-in Theater | 1 | Arts and Entertainment > Movie Theater > Drive-in Theater |
| General Entertainment | 1 | Arts and Entertainment > General Entertainment |
| Hindu Temple | 1 | Community and Government > Spiritual Center > Hindu Temple |
| Terreiro | 1 | Community and Government > Spiritual Center > Terreiro |

## Weak-name skips — an owner decision the contract did not cover

The dedupe contract says name match + distance, nothing about rows with no usable name. These rows are skipped by the preflight's name-quality flags and listed so the owner can flip them: a name that is only its type word ("Castelo", "Igreja") or only its town names nothing the matcher could dedupe later.

- type words only: 99
- locality only: 19

## Served landmark within 25 m under another name — imported, for curation

Would-insert rows with a served landmark or venue (not a business) within 25 m whose name the matcher cannot pair. The contract imports them — different names are different places, distance alone never removes — and the Worker's read-time suppression is exact-name too. Some are real neighbours (a statue by a church); the ones that are the same place under another language or alias ("Mosteiro dos Jerónimos" / "Jerónimos Monastery") are what this list is for. 1,435 row(s); first 20:

| fsq_place_id | name | our type(s) | served neighbour |
|---|---|---|---|
| 12c2f65a2a1c4ee88beb6fc7 | Banda Musical de Tavira | music_venue | overture:a8f874cc-f531-4ac9-822c-8a50ef765b0c "Benamor Golf" (golf_course) at 0 m |
| 2c55a3c45d574910365f6129 | Café Snack-bar o Lacrau | night_club | overture:ff530c66-984f-4ecd-9921-ed8ce9469f48 "Parque de Campismo de Ericeira" (campground) at 0 m |
| 37d3958abfe74980d0b5874a | Letras Bar - Actividades Hoteleiras | night_club | overture:d843055a-1523-49e2-bdcd-f4c3c3c318bf "Big Bit Estúdios" (music_venue) at 0 m |
| 51507343e4b0010b70637b3e | Igreja Dos Mártires | church | overture:b5baaa63-ed22-4e3f-83be-49cc2f95b451 "Igreja Nossa Senhora da Encarnação" (church) at 0 m |
| 51bbad4d498ecd7695b3b4c4 | Filarmónica Cultural Ericeira | music_venue | overture:ff530c66-984f-4ecd-9921-ed8ce9469f48 "Parque de Campismo de Ericeira" (campground) at 0 m |
| 553cf5a5498e75511374082f | Ermelo Ponte da Barca | historical_landmark | overture:2f584065-c438-4add-a3cd-8154bd86dd7d "Parque de Campismo de Entre Ambos-os-Rios" (campground) at 0 m |
| 59aedb01d8fe7a0d13db884c | Grande Rota das Linhas de Torres - Forte de S. Vicente | hiking_area | overture:6bd6a005-a36c-4966-bad7-71f55b6f47f9 "Forte de São Vicente" (historical_landmark) at 0 m |
| 5ac332667269fe27987f4ec5 | Cave Avenida | music_venue | overture:c78f5b3a-8204-40bf-8cbd-89c41998fce0 "Museu Municipal de Viana do Castelo" (museum) at 0 m |
| 5b005684e7a2370039df2203 | Xland | amusement_park | overture:c12770fd-e89b-48c3-a2f6-76116a3f9295 "Indoor Soccer" (stadium) at 0 m |
| 6a74caeec5fb9f02d8c55147 | A Igreja de Jesus Cristo dos Santos dos Últimos Dias | church | overture:0f7bf4c9-b8d1-4c7c-9af7-49bbf8b835bf "The Church of Jesus Christ of Latter-day Saints" (church) at 0 m |
| 6a750669c5fb9f02d8cdfae3 | A Igreja de Jesus Cristo dos Santos dos Últimos Dias | church | overture:dbd8a93f-caa1-4657-851a-27dc714d7917 "The Church of Jesus Christ of Latter-day Saints" (church) at 0 m |
| 6a7530ffc5fb9f02d8d2d10d | A Igreja de Jesus Cristo dos Santos dos Últimos Dias | church | overture:3c6c0ffc-b111-4a61-8d3b-4e05b6439c03 "The Church of Jesus Christ of Latter-day Saints" (church) at 0 m |
| 7cfacb18c19a43d5bf741895 | Paróquia de Santo Amaro | church | overture:176f845e-61a8-4db3-86d6-0bd743434fcd "Club Sport Maritimo" (stadium) at 0 m |
| 8444dafba4ee4521ef315724 | Parque de Campismo da Ilha do Pessegueiro | campground | overture:dcecdb34-ba93-4f5e-816a-274b8a333b53 "Parque de Campismo Costa do Vizir" (campground) at 0 m |
| e5d1a04261574b03b858cea4 | Cine Cidade Nova | theatre | overture:d7c2b98c-7ffd-4835-a236-112961ea4833 "Parque de Campismo do Fundão" (campground) at 0 m |
| 6a754521c5fb9f02d8d54b24 | Tavira Municipal Museum | museum | overture:9a36b52a-16bc-4e95-abb0-b17418d32b85 "Museu Municipal de Tavira" (museum) at 0 m |
| 514dbb1be4b0bdec71b95ded | Galeria Quartel do 11 Setúbal | art_gallery | overture:362bfc88-f71a-4e09-924c-34eadfe7aa02 "Galeria ARDEPI" (art_gallery) at 0 m |
| 56374bf4498e17f8f1e591d9 | Georgia - Teatro Tivoli BBVA (Roteiro Paulo Segadães) | music_venue | overture:05d12390-4c01-4c93-a66b-87106140721d "Teatro Tivoli" (theatre) at 0 m |
| 563754e4498e966fcc4a158b | Nicolas Godin - Teatro Tivoli BBVA (Roteiro Rui M. A.) | music_venue | overture:05d12390-4c01-4c93-a66b-87106140721d "Teatro Tivoli" (theatre) at 0 m |
| 536f2327498e478c8046dced | Paroquia de Fatima | church | overture:3cfe66bb-7c34-42e8-91a1-a849232c2afc "Jardim do Miradouro Vila Guida" (historical_landmark) at 0 m |

## Fuzzy far names — imported, for curation

Would-insert rows whose nearest served row 75–400 m away scores between 0.72 and 0.9 on name_similarity — the rung the preflight counted as suspect and this importer does not (see `SAME_NAME_SIMILARITY`). 497 row(s); first 20:

| fsq_place_id | name | our type(s) | nearest fuzzy far name |
|---|---|---|---|
| 0298aa181fa24e52839cc3b5 | Maria I Carreira Ferreira | night_club | overture:2b5af14e-212a-435c-82c1-a98602d4c76d "Garrafeira Ferreira" (store) at 353 m, sim 0.73 |
| 05348987db7646cf327edc2d | Fábrica da Igreja de Melres | church | overture:e4469385-53a3-4fe3-9a38-50c223b3e623 "Bar Da Praia De Melres" (bar) at 111 m, sim 0.73 |
| 07ef0d96941647670c086753 | Igreja Baptista | church | overture:a278905f-e04d-4d51-91d6-c616bb454f3f "O Baptista" (bar) at 240 m, sim 0.72 |
| 111777e2e02d4c4838f7900b | Pároco de São Lourenço do Bairro | church | overture:3ba6f060-773f-4255-b3af-bd2b6cc3c251 "Centro Paroquial De São Lourenço Do Bairro" (church) at 139 m, sim 0.81 |
| 1708be39d44843b57dbb19d5 | Igreja Baptista de Loures | church | overture:a087976d-8e28-41fa-8012-e82493ee9df6 "Igreja Matriz de Loures" (church) at 250 m, sim 0.83 |
| 18efc64542254c347cf4864d | Igreja Paroquial de Bombarral | church | overture:9bafc5ae-a68b-49d7-9335-4b529726e1ad "Igreja Matriz do Bombarral" (church) at 226 m, sim 0.80 |
| 200d83a9b55f407fa1ba61bb | Igreja dos Navegantes | church | overture:46f2b22b-a362-43c2-9bc1-28816c817402 "Igreja Nosso Senhor dos Navegantes" (church) at 252 m, sim 0.76 |
| 2b503386f590495a8e90c2e6 | Sociedade de Turismo de Santa Maria da Feira S.A. | hot_spring | overture:abc71afb-971c-4767-8ce3-ccefbad13326 "Igreja Matriz de Santa Maria da Feira" (church) at 148 m, sim 0.73 |
| 2e0090cac8c94237c4e25aba | Igreja Matriz de São Miguel Arcanjo | church | overture:625688bf-e994-44c5-9ed0-55cfa0650bef "Matriz São Miguel Arcanjo" (church) at 259 m, sim 0.83 |
| 3b98cc011b4a4c6968443f63 | Pároco de Unhais da Serra | church | overture:fe2ac3e5-69e0-4177-9e58-9655d258f2bc "Agrupamento 607 de Unhais da Serra" (church) at 188 m, sim 0.75 |
| 4b0588a2f964a5202cd122e3 | Chafariz da Buraca | historical_landmark | overture:c938d453-9205-4aab-a2a8-a615dc8d5771 "David da Buraca" (restaurant) at 168 m, sim 0.73 |
| 4b0588a2f964a520f6d022e3 | Bar do Rio | night_club | overture:5a6c7690-f63a-47c6-a698-d524b1a747c1 "Bar do Cais" (bar) at 159 m, sim 0.76 |
| 4b0588a3f964a52083d122e3 | Museu da Música | museum | overture:e5f2d96e-912a-49af-85c8-7d75f3090d91 "Museu Nacional da Música" (museum) at 202 m, sim 0.77 |
| 4b0588a4f964a520b9d122e3 | Galeria Pedro Serrenho | art_gallery | overture:43ec04ee-34df-4b5f-a3b2-16505b507bc6 "Galeria Pedro Cera" (art_gallery) at 281 m, sim 0.80 |
| 4b0588a7f964a52095d222e3 | Teatro Infantil de Lisboa | theatre | overture:d0d7d9a9-e96d-405f-b39a-4ff0c8d296f9 "Teatro Romano de Lisboa" (historical_landmark) at 316 m, sim 0.79 |
| 4b0588a8f964a520bfd222e3 | Cine-Teatro de Corroios | theatre | overture:eaf21b50-4f48-4d77-b8da-f15aaf6b25f4 "Oculista de Corroios" (store) at 399 m, sim 0.74 |
| 4b7a8c17f964a520a5302fe3 | Mosteiro dos Jerónimos | historical_landmark, church | overture:cab69a00-c302-4d6c-861b-c7ab83b1d739 "Largo dos Jerónimos" (plaza) at 258 m, sim 0.78 |
| 4ba0a49cf964a520897537e3 | Doca do Bom Sucesso | marina | overture:031c8108-28c3-461b-a728-e3ff87c16751 "Colégio do Bom Sucesso" (school) at 168 m, sim 0.78 |
| 4bbb94eee5b0d13a403c6e7c | Estádio Universidade de Coimbra | stadium | overture:fc945f2c-b779-4be4-8952-501a86d3eb31 "Estádio Universitário de Coimbra" (gym) at 148 m, sim 0.89 |
| 4c1e013bb306c928846166b7 | Jardim Botânico de Coimbra | botanical_garden | overture:c05b2b83-b86a-4715-aeea-debba1e8d98d "Jardim Botânico da Universidade de Coimbra" (botanical_garden) at 240 m, sim 0.76 |

## In-batch name near-misses — both imported, for curation

Kept rows sharing a normalised name 75–400 m apart. Under the contract both import (a name match needs the distance too); 8 pair(s), first 20:

| fsq_place_id | fsq_place_id | name | m |
|---|---|---|---:|
| 8c9c65b4e315408b67cb9b3f | de358d8bfb2c41147d180d3f | Igreja Peniel | 316 |
| 4ba3f8def964a520187338e3 | f26963d4fa334d6bafbb0ce6 | Passeio Marítimo de Oeiras | 166 |
| 4d6b60dc35c9a093a46c43c7 | 55f1741c498eb7dd61db69b9 | Porto de Leixões | 305 |
| 4ec8eaa5722e1437980c292d | 512b5e33e4b051c724c711cc | Capela Nossa Sra da Guia | 143 |
| 50158171e4b035d9f526e0c2 | 51ebfb2a498efd00dffe8e6a | Rio Bestança | 213 |
| 5054f3dce4b0c3ed1ef214f0 | 5054f465e4b0150f2eaa9942 | Portas da Coroada | 208 |
| 5813875c38fa6e365ce6b75b | 581387a938fa070a18251d60 | Side Wake Lake! | 341 |
| 64bd2a6b576b0c0157375377 | 64bd2b755795ac3ff54ce5ab | Palco Jmj | 227 |

## Samples of would-insert rows, per leaf

### Church — 1,875 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 2c300ac5f0c94f31727fbfae | Congregação de Nossa Senhora da Caridade do Bom Pastor | Lisboa | 38.74384 | -9.15772 | church |
| 4ccea3f1aa25a35d2e9c210f | capela de Várzea | Arouca | 40.92381 | -8.30467 | church |
| 4df37989c65bf55ee52bc78e | Convento de Santa Clara | Funchal | 32.65253 | -16.90403 | church |
| 4e3f1383e4cdab9b935984bb | Na Sra Alumieira | Águeda | 40.51940 | -8.45699 | church |
| 4eba54a5e300cf4cac3536fe | Capela De Santa Barbara (Urgeiriça) | Canas De Senhorim | 40.51610 | -7.89695 | church |
| 4ed7ab599adf06cbf6e4e206 | Igreja De S. Domingos Viana Do Castelo | Viana do Castelo | 41.68853 | -8.83214 | church |
| 4f48c51be4b072f5aacecb28 | Igreja Adventista Central | Lisboa | 38.72733 | -9.14129 | church |
| 500eed72e4b05c6252c6b25f | Capela Catolica Dos Olivais Sul |  | 38.76302 | -9.11464 | church |
| 506c36f0e4b031a8875efba5 | Igreja Castanheira Do Ribatejo | Castanheira Do Ribatejo | 38.99290 | -8.97198 | church |
| 51c5d49e498e6e1b1a978d80 | Hermida da Guadalupe |  | 37.08318 | -8.86619 | church |
| 5318e96f498e76c1997a3c03 | Igreja Catedral da Esperança Charneca | Charneca da Caparica | 38.62902 | -9.19766 | church |
| 533abc82498e8b88480b3ff7 | Igreja de Freiriz | Vila Verde | 41.64099 | -8.50849 | church |
| 53aee3f7498eec2a46c5c1dc | Igreja Matriz da Rapa | Celorico da Beira | 40.58182 | -7.34402 | church |
| 5746e85f498e4620a8e88a07 | Igreja de S. Gens |  | 41.44650 | -8.13505 | church |
| 59b2e168c8772e6fcc12be20 | Oasis Christian Fellowship | Lagos | 37.10107 | -8.67269 | church |
| 5e11c9a5c546ca0007896d38 | Igreja Da Ordem Terceira De São Francisco | Tavira | 37.12304 | -7.65088 | church |
| 5f2ff095933f477de036e9d4 | Igreja Santo Cristo Da Misericordia | Praia da Vitória | 38.73208 | -27.05985 | church |
| 5f3bc3702cdd3072fb2045e0 | Igreja dos Biscoitos | Calheta | 38.61493 | -28.03206 | church |
| 689e34e1542fe41b5f06598c | Salão Do Reino Das Testemunhas De Jeová | Oeiras | 38.69299 | -9.30492 | church |
| d57f7c0de4c74acf01f12bc2 | Pároco de Ladoeiro | Idanha-a-Nova | 40.03904 | -7.11459 | church |

### Night Club — 952 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 29257bbe0f3347d2ed543746 | Pastelaria Snack-Bar Os Maias | Beja | 38.01378 | -7.87297 | night_club |
| 477fc963a08a4aaf849bb0d5 | Snack-Bar Come Cá | Oeiras | 38.71155 | -9.24553 | night_club |
| 4c675362e1da1b8d21ea9dc3 | Pridedisco |  | 37.09336 | -8.22781 | night_club |
| 4d0a69ea5edd5481717e059b | Ondas Do Pacifico | Sintra | 38.76157 | -9.30564 | night_club |
| 4dc47fca2271f270511550c4 | Kapott Club - Almeirim |  | 39.10355 | -8.71164 | night_club |
| 4de13c7722713271e2c87098 | Kiss | Albufeira | 37.08699 | -8.23103 | night_club |
| 4e434aed1f6e0a1ba5d041ad | Gecko Club | Loulé | 37.05011 | -8.06485 | night_club |
| 4f458ca5e4b07a63290ba36a | Kimika klub |  | 39.81745 | -7.49469 | night_club |
| 4f695d68e4b0e2bc70f9750e | Casa do Cais | Peniche | 39.35845 | -9.37271 | night_club |
| 4fe6959fe4b02e42941ea4e0 | Nightclub Maroiços |  | 38.54703 | -28.51382 | night_club |
| 50e75705e4b000d7dc7bd18f | Spring Club & Cafe | Fátima | 39.60790 | -8.65800 | night_club |
| 51bb7fe6498e04509fd26007 | Throne of RAG |  | 41.18131 | -8.59158 | night_club |
| 51e09177498eb68bf99a156d | Night City |  | 41.29527 | -7.74604 | night_club |
| 523e52d6498ec8d8e37c2c88 | R Club |  | 38.84523 | -9.35140 | night_club |
| 536b54f1498ed3110a3e5a69 | Club Noir - Alternative Sounds Club | Lisbon | 38.71166 | -9.13429 | night_club |
| 54850c82498e40c7e236ea67 | VIP bar lounge klub |  | 38.54464 | -9.01865 | night_club |
| 5691ff08f20849f7a211be67 | Bar Pub Lhá | Belmonte | 40.36085 | -7.34921 | night_club |
| 56bffeffcd10e9781d3a5117 | the arcadia |  | 38.71223 | -9.15383 | night_club |
| 64fbe424ff74713563b81471 | Sala 8 | Coimbra | 40.24218 | -8.44118 | night_club |
| c4a787b9207c42ed3604a083 | Swing - Discoteca | Porto | 41.15579 | -8.62728 | night_club |

### Historic and Protected Site — 758 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c8cb681cf3ea14301a3f751 | Elevador de Santa Luzia | Viana do Castelo | 41.69679 | -8.83029 | historical_landmark |
| 4e354d571838f85189a4add5 | Barracão Do Sal |  | 40.13750 | -8.83301 | historical_landmark |
| 4e753bec45ddd4323fa8ab56 | Quinta das Ferrarias | Roubã | 39.83515 | -8.58290 | historical_landmark |
| 4f0addc7e4b039f5af5ca6f7 | Mosteiro De S. João De Tarouca |  | 41.02307 | -7.74785 | historical_landmark |
| 4f601512e4b06b55131f640a | Bairro Arco Maria Teresa |  | 38.81522 | -9.23666 | historical_landmark |
| 4fa54c61e4b0a34ac775c9f7 | Igreja Canhoso |  | 40.28876 | -7.48583 | historical_landmark |
| 4fd21e26e4b01d563b90f78d | Igreja de serpa |  | 37.94229 | -7.59594 | historical_landmark |
| 502a85d4e4b0924c21b1e15d | Avis |  | 39.11172 | -7.87223 | historical_landmark |
| 51090c9ce4b0112c87f7144e | Centro Pedagogico Do Vinho Do Porto |  | 41.13553 | -8.62170 | historical_landmark |
| 5134e13ee4b0a2e13d168793 | Maria Mendes |  | 40.16089 | -8.19981 | historical_landmark |
| 51855a02498eaef7cdc5db02 | cristo rei |  | 41.31478 | -8.57331 | historical_landmark |
| 5258fb8511d27b94d52e19ee | Convento de Seiça |  | 40.09413 | -8.82518 | historical_landmark |
| 53f0e453498e19f83561d3e2 | Império do Lajedo |  | 39.39241 | -31.24873 | historical_landmark |
| 544c005a498e810408963001 | Sede do Rancho Folclorico de Nespereira |  | 41.00462 | -8.16591 | historical_landmark |
| 5546760e498e6e7dfc40a739 | pulo do lobo |  | 37.76249 | -7.53778 | historical_landmark |
| 59a05e9186f4cc3bed9d1ef0 | Templo das Colunas | Sintra | 38.78824 | -9.39138 | historical_landmark, church |
| 5dee5cf993de190008d3f7c2 | Alcáçova | Sintra | 38.79211 | -9.38875 | historical_landmark |
| 65e9f80645cd3924ede0e29b | Reis Magos Fort | Caniço | 32.64468 | -16.82800 | historical_landmark |
| 65f1c78236564436be00d4be | Bunker Militar |  | 36.98441 | -7.84524 | historical_landmark |
| 68135c805474ba4cc4fc3fa8 | Festival Dos Descobrimentos | Lagos | 37.09983 | -8.66967 | historical_landmark |

### Art Gallery — 554 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 35027f9d40734d0583fe2322 | Olho Azul | Lisboa | 38.73838 | -9.15093 | art_gallery |
| 4ce6c88ce888f04deb27386b | Rui Alberto |  | 41.14137 | -8.63643 | art_gallery |
| 4cf1a538cc61a35d9149169e | Comunidade Artística Limiana |  | 41.76666 | -8.58563 | art_gallery |
| 4e109f9c22713f7d7bc9d7e0 | Galeria Da Luz | Lagos | 37.08514 | -8.73618 | art_gallery |
| 4e689f09aeb75ce774b390b0 | Porta XIII |  | 41.94027 | -8.74349 | art_gallery |
| 4e7d9c9d93ad1649ca2802bd | Contacto de Autor | Porto | 41.14966 | -8.62412 | art_gallery |
| 4ed3e0e95c5c9528fd53eab7 | Da Viagem e dos Regressos | Vila Nova de Gaia | 41.12606 | -8.60567 | art_gallery |
| 4f1b5376e4b01d7c5e880eda | Atelier Ana Castaño | Lisboa | 38.70854 | -9.15125 | art_gallery |
| 4f6a1236e4b04b16fd5e14e7 | Centro Cultural Dr. Afonso Rodrigues Pereira | Lourinhã | 39.24104 | -9.31275 | art_gallery |
| 50533b67f13618780a4673fe | CNAP - Clube Nacional de Artes Plásticas | Lisboa | 38.76071 | -9.16394 | art_gallery |
| 509ea6b0e4b0fe0aa55fc907 | Carla Anjos Atelier |  | 41.20103 | -8.28819 | art_gallery |
| 516f07b0e4b0342587c6c712 | Arrear na Valadares |  | 41.17756 | -8.68280 | art_gallery |
| 534c8d70498ebc8bfac0a762 | Paulo Santos - Arte Contemporânea | Amadora | 38.77642 | -9.21847 | art_gallery |
| 5403023f498eccd895fa01a9 | Galeria de exposições | Espinho | 41.00734 | -8.64272 | art_gallery |
| 55e74ac7498e7e79c4d51ea2 | Atelier Ilha Das Cores | Troviscal | 40.49471 | -8.54458 | art_gallery |
| 57a46907498e963269840713 | The Online Artists | ferreiras-albufeira | 37.12609 | -8.23873 | art_gallery |
| 5dc6a369c6fed100083d0bd2 | 3D Fun Art | Funchal | 32.64926 | -16.91169 | art_gallery |
| 6872a42f3bd50c4ba7baaf48 | Centro Social Do Carvalhal | Comporta | 38.31136 | -8.75023 | art_gallery |
| 68ceb33f768332179e150b52 | Mark Tomaras Studio + Gallery \| Fine Art Repro Lab | Porto | 41.14995 | -8.61825 | art_gallery |
| 8a137d24f1314ab01fc74b6c | PortuGalito - Espaço de Comércio e Artes | Porto | 41.15473 | -8.61185 | art_gallery |

### Music Venue — 474 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c86494de602b1f77992be7a | Mah Studio BOX | Porto | 41.16215 | -8.60490 | music_venue |
| 4d5b0da4d6078eecf9575075 | Academia de Música de Espinho | Espinho | 41.00527 | -8.63265 | music_venue |
| 4e187382d1648b8348323072 | Coral de Letras da Universidade do Porto | Porto | 41.15259 | -8.61550 | music_venue |
| 4e736ab0b993272e522031c0 | Sociedade Filarmónica Vermoilense | Vermoil | 39.84605 | -8.65785 | music_venue |
| 4edab4af5c5c96a2feae7833 | Sede do EVPM | Porto | 41.14395 | -8.62325 | music_venue |
| 4ee8e22b61afa438e1cbc869 | MegaLive Estudio | São Paulo | 38.70837 | -9.14695 | music_venue |
| 4f21d40fe4b0b2f98cc291a7 | Escola Ana Luísa Mendonça | Oliveira De Azeméis | 40.83783 | -8.47448 | music_venue |
| 4fba0f3ae4b0d7e9f7f8606c | Rádio M80 (Fafe) |  | 41.45079 | -8.17430 | music_venue |
| 4ff9bf76e4b0956dd63126dd | Porto Sunday Sessions |  | 41.17085 | -8.68623 | music_venue |
| 50a1f513ee154ad0205314ae | Harmonia Mosteirense | Mosteiros | 37.89241 | -25.81948 | music_venue |
| 520c333e11d2a7d76f0dd265 | Arraial Popular da SFPMG |  | 38.37139 | -8.51322 | music_venue |
| 543af54d498e7f9326f03356 | pavilhão de festas dos foros de salvaterra |  | 38.99531 | -8.73663 | music_venue |
| 547a6f79498eb0840a41baee | Associação Artística Portelense | Portel | 38.30971 | -7.70402 | music_venue |
| 5635c136498e6204e170bb21 | ADAO - Associação Desenvolvimento Artes e Ofícios | Barreiro, Portugal | 38.66082 | -9.07909 | music_venue |
| 56fcd442498e43f6f1c1b592 | Festival Woodrock | Figueira da Foz, Portugal | 40.21526 | -8.88691 | music_venue |
| 573432ea498e5901a11bb954 | Galeria Zé Dos Bois | Lisbon, Portugal | 38.71106 | -9.20003 | music_venue |
| 57c689a2498e06b8fd93968e | Av Aliados | Porto, Portugal | 41.14195 | -7.95016 | music_venue |
| 57ca7eb1498ec8ada0d29e1e | Gare Porto | Porto, Portugal | 41.14195 | -7.95016 | music_venue |
| 5b1e2937a87921002c238569 | Festival Caloura Blues | Lagoa, Portugal | 40.44445 | -8.73030 | music_venue |
| 662bee1e68d0df48363010a3 | Sinoscipoa | Porto | 41.16935 | -8.61729 | music_venue |

### Hiking Trail — 434 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4db55391a86e8d270794676e | Entre Ambos Os Rios | Ponte da Barca | 41.81977 | -8.31015 | hiking_area |
| 4e315e3f88775a302cf49fdb | Levada Castelejo |  | 32.74448 | -16.86099 | hiking_area |
| 4eecf7bf775b3c580cf1170b | Pedreira Fazenda Velha |  | 39.28683 | -8.01337 | hiking_area |
| 4f874ae7e4b0abaa00b7dbd1 | Passeio Pedonal E Ciclavel Das Margens Do Ave |  | 41.34684 | -8.46967 | hiking_area |
| 4fffdc76e4b03b5b3b25ce7a | Ecopista | Corredoura | 39.59896 | -8.83373 | hiking_area, mountain |
| 501504e1e4b0ad6ab3015925 | Jogging |  | 37.08919 | -8.10684 | hiking_area |
| 506eb4ffe4b030d2b8813a16 | Pedras moinhos E Aromas De Santiago |  | 41.17612 | -8.07776 | hiking_area |
| 51d9769d498e3a08b7709cd3 | Posto Florestal Vale da Lapa |  | 32.81394 | -16.91945 | hiking_area |
| 51f54ddc498e3f4d49054311 | Ciclovia Póvoa de Varzim > Vila Nova de Famalicão |  | 41.42119 | -8.54588 | hiking_area |
| 5218ca4d11d2c8ab91469090 | Trilho Mata Do Canário | Sete Cidades | 37.83751 | -25.34798 | hiking_area |
| 541c5ba2498edf1964a7afb9 | Lapa de Santa Margarida | Setúbal | 38.50881 | -8.92848 | hiking_area |
| 58ce67dcccce316b14cacc0d | Circuito Citadino De Queijas | Queijas | 38.71771 | -9.25761 | hiking_area |
| 592ebd874c954c26fdf5740c | PS PR2 Vereda Do Pico Castelo | Porto Santo | 33.09069 | -16.32716 | hiking_area |
| 59aedb01d8fe7a0d13db884c | Grande Rota das Linhas de Torres - Forte de S. Vicente | Torres Vedras | 39.10027 | -9.26492 | hiking_area |
| 5d3dc6821f695e000889f628 | Ciclovia Em Moledo | Caminha | 41.85411 | -8.86532 | hiking_area |
| 60b13cd9091ee303c7d339ec | Acesso Pedonal Eva a Carnaxide | Carnaxide | 38.72093 | -9.24956 | hiking_area |
| 62bf5e3d8c88c7194fd3f177 | Yellow Brick Road | Leiria | 39.73905 | -8.82185 | hiking_area |
| 63d14bcca9baf063a66024d8 | Promenade Madalena do Mar | Ponta Do Sol | 32.70183 | -17.13688 | hiking_area |
| 645bffbcb441a536cb293b37 | Escadas do Monte | Vila Nova de Gaia | 41.13532 | -8.61158 | hiking_area |
| 680cdbddcad9200c258c1ab7 | Passadiças Das Escarpas Do Corgo | Vila Real | 41.29510 | -7.74239 | hiking_area |

### Monument — 390 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 165d9a270b3647d67e6c62fd | Casa dos Pimentéis | Vimioso | 41.47151 | -6.57422 | historical_landmark |
| 4d1dcd2716cfb60cbb3d4261 | Finanças de Oeiras | Oeiras | 38.68606 | -9.31295 | historical_landmark |
| 4e21c9261838712abe75ab0b | Torre De Almofala |  | 40.86989 | -6.88275 | historical_landmark |
| 4f0f2d2be4b09cff018e07f7 | Anta I de S. Gens | Nisa | 39.44778 | -7.67654 | historical_landmark |
| 503b31fce4b0c6f193ebbf0d | Arquivo Municipal de Figueira de Castelo Rodrigo |  | 40.89712 | -6.96421 | historical_landmark |
| 53c65cae498ea05b20f3b14f | Torreão das Portas da Cidade |  | 37.18880 | -8.43935 | historical_landmark |
| 57d695ed498eb2f54f0fcb1c | Pelourinho de Peroguarda | Peroguarda | 38.09156 | -8.04852 | historical_landmark |
| 59cf292c491be76b02b3a90f | Alminhas da Ponte | Porto | 41.14083 | -8.61086 | historical_landmark |
| 5dc60f6a1a71960007cbfb48 | Visigothic Wall | Lisboa | 38.71175 | -9.12990 | historical_landmark |
| 5e0df569452fe1000893c434 | Capela São Miguel | Фару | 37.01310 | -7.93463 | historical_landmark |
| 5f5cfe8bbee5030db7943ca8 | Ponte Românica Sobre O Rio Anços | Redinha | 40.00394 | -8.58325 | historical_landmark |
| 6248600a1ee5dd267ccea156 | Torre do Relógio | Albufeira | 37.08706 | -8.25207 | historical_landmark |
| 63e15b31d36e705a972b81a3 | Monumento Manuel Pinheiro Chagas | Lisboa | 38.71702 | -9.14250 | historical_landmark |
| 64466b3729d8ea2fc03214f4 | Cruzeiro De Praia De Mar | Mar | 41.57396 | -8.79820 | historical_landmark |
| 647096bdb231951de1fe33fb | Centenário Das Aparições Do Anjo Da Paz | Fátima | 39.61591 | -8.66464 | historical_landmark |
| 65f447d4e497e4341c959a8d | Busto Patrão Joaquim Lopes | Olhão | 37.02375 | -7.83880 | historical_landmark |
| 66cb84369543ea653edfbacf | Monumento aos Descobrimentos Portugueses | Cascais | 38.69656 | -9.42021 | historical_landmark |
| 68bf499a5b782c28c60e95a8 | Porta da Esquina | Portalegre | 38.88035 | -7.16848 | historical_landmark |
| 69592288b5fa9256c496039c | Monumento ao Cante Alentejano | Odemira | 37.59975 | -8.64525 | historical_landmark |
| 6a15734dbc61355640554ca6 | Igreja Do Senhor Bom Jesus De Fão | Fão | 41.51037 | -8.76755 | historical_landmark |

### Campground — 371 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 0e48046d65ca405b0e28ccb7 | Naturwaterpark - Parque de Diversões do Douro | Póvoa | 39.59976 | -8.33869 | campground |
| 36594862fd7540654cfba3b6 | Glamping Hills | Santa Comba de Rossas | 41.66875 | -6.82440 | campground |
| 4c655fa4f07e2d7f0cb09150 | Dominio Vale Do Mondego |  | 40.56150 | -7.30934 | campground |
| 4dfe1dad8877e9c47498596c | Viegas | Santarém | 39.41532 | -8.85234 | campground |
| 4e3bcaf8d22d102e852a6e61 | Vale Paraiso Camping | Nazaré | 39.62021 | -9.05708 | campground |
| 4eabdf4161af01ea2af60d10 | Clube Campismo Do Barreiro | Setúbal | 38.49498 | -9.00396 | campground |
| 4eeb089ea69dd7c5b46b7ad7 | Spot de espera pela MJ |  | 41.18479 | -8.62331 | campground |
| 4f777eb0e4b055c760bb754f | Lutomario |  | 38.73796 | -9.16599 | campground |
| 50cb0658498e9af65084b6fc | Retiro da Fraguinha | São Pedro do Sul | 40.83144 | -8.15430 | campground |
| 510482ade4b0967f79a8a4c3 | Parque de Campismo de Boticas |  | 41.57703 | -7.63229 | campground |
| 519bd5ec498e83c347493374 | Sede Escuteiros 1134 Sintra |  | 38.80325 | -9.38575 | campground |
| 534865ad498ec23f067c280d | parque de merendas Casal dos Bernardos |  | 39.73853 | -8.50504 | campground |
| 56718085498e379909d60f7c | por baixo da via rapida |  | 32.65031 | -16.92512 | campground |
| 571b3b9e498e4f08262728f6 | Centro Escutista de Guimarães |  | 41.42674 | -8.26846 | campground |
| 596fa7234b78c57f67eebbb3 | Estacao De Autocarros, Peso Da Regua | Peso da Régua | 41.15553 | -7.78035 | campground |
| 62f0df65f75ea10fa5150885 | Area De Serviço De Autocaravanas De Portel | Portel | 38.30587 | -7.70855 | campground |
| 68931a67a1d74d17dbe382a1 | Camper Parking Porto Covo | Porto Covo | 37.85387 | -8.78992 | campground |
| a64c525202db41af3b2ccff6 | Grupo Vanguarda Campismo | Sintra | 38.87269 | -9.43363 | campground |
| b0c7f1e1e0d849e4fae19fa7 | Tribunechoice | São Bartolomeu de Messines | 37.25663 | -8.28624 | campground |
| e92f7c71cd8344cf1aa8b48f | Ricarlina - Unipessoal | Coimbrã | 40.21028 | -8.43016 | campground |

### Mountain — 297 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4e411175483b72d779dc4dd5 | Penha d'Águia | Santana | 32.77932 | -16.84126 | mountain |
| 4efddefb9911b33a0f056e28 | Orvalho |  | 37.39180 | -7.99898 | mountain |
| 4f23cafde4b0008741a6ea52 | Madeiras Arouquesa Lda. |  | 41.10062 | -8.63783 | mountain |
| 4f80498ee4b0cd6f617f6bd8 | Vale Da Murta |  | 37.20255 | -7.68786 | mountain |
| 4fd497e4e4b05b989d71112e | Campeã | Vila Real | 41.28241 | -7.86370 | mountain |
| 4ff47720e4b009b18dfd8830 | Carvalhal Da Loiça |  | 40.48813 | -7.81545 | mountain |
| 5023910be4b05507eafd297f | Candal |  | 40.85322 | -8.17831 | mountain |
| 50410de4e4b0af4f7289c955 | Outeiro Sul |  | 40.85780 | -8.03388 | mountain |
| 5054830ce4b055f81b918ea7 | São Domingos da Serra |  | 41.02749 | -8.35111 | mountain |
| 50e31557e4b075c2fc8afa96 | Trevim |  | 40.25129 | -8.28035 | mountain |
| 50fd671be4b01d6668ed8ec3 | Serra da Arrábida | Setúbal | 38.47849 | -8.99411 | mountain |
| 51a5f3d9498ed3538922d468 | Serra D'Agrela |  | 41.19450 | -8.51880 | mountain |
| 5251817911d2096127fcd038 | Teleferico |  | 40.31477 | -7.57598 | mountain |
| 527785d311d299e65c3ca90a | Parque Eólico De Mendoiro | Anhões - Monção | 42.00473 | -8.42491 | mountain |
| 53374448498ecb15a0c043f2 | Ped'rios |  | 41.87090 | -8.42259 | mountain |
| 53e4e032498eed0b9f7cabab | Monte de Culcurinho |  | 40.26638 | -7.82574 | mountain |
| 5659a238498ec2d19387b352 | Feital |  | 40.74699 | -7.27741 | mountain |
| 5b9663f533e118002cabd2c2 | Poios Brancos | Manteigas | 40.33185 | -7.55855 | mountain |
| 5d939611939de0000842895c | Cow Top | Calheta | 32.75398 | -17.13317 | mountain |
| 633d29aa603c5078203c8cb1 | Pico Bica da Cana | São Vicente | 32.75607 | -17.05527 | mountain |

### River — 283 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4cdfe68adb125481efb439ce | Praia Fluvial Alamal | Gavião | 39.48816 | -7.96753 | river |
| 4f1de4b4e4b08fa66754246e | Rio Cávado |  | 41.51622 | -8.78501 | river |
| 4f257487e4b050258c3ea78c | Muxagata | Fornos de Algodres | 40.63089 | -7.39015 | river |
| 4fbcb695e4b0ac6570c20386 | Nascente do Côa | Foios | 40.35666 | -7.06755 | river |
| 4ffd9a72e4b03a789300e61b | Barragem S. Lurdes |  | 40.68386 | -7.70724 | river |
| 50043993e4b04575feede6e3 | Associação Náutica da Torreira | Murtosa | 40.76584 | -8.69747 | river, marina |
| 501140ace4b0c3be96399aae | Cascatas do Pincho |  | 41.79721 | -8.75785 | river |
| 50222d2de4b0dfad8a142144 | Rio Neiva "Boticas" |  | 41.64398 | -8.68490 | river |
| 5027535ce4b0e6861f27d316 | Praia Fluvial Do Malhadal | Proença-a-Nova | 39.74900 | -7.92518 | river |
| 50db9d00e4b03eb1a0330afd | Rio Ceira | Coimbra | 40.16129 | -8.11277 | river |
| 511ca686e4b0206f9277d095 | Nascente Do Côa | Foios | 40.27711 | -6.86895 | river |
| 516ad235e4b0184c2f18017d | Azenha do Minante |  | 41.62384 | -8.76970 | river |
| 521386ec11d2322772d067db | Praia fluvial Rio Lavradas |  | 41.82152 | -8.42056 | river |
| 522505d9498e6e13a920d869 | Ribeira St Estevao |  | 38.86251 | -8.77903 | river |
| 52b347aa11d2f8cd52ffb4b8 | Reserva Natural do Estuário do Tejo |  | 38.87892 | -8.97774 | river, nature_preserve |
| 5349dd36498e858c2f66c07e | Rio Sôr |  | 39.25182 | -8.01151 | river |
| 5665b01d498e89524ee00e0e | Cascata Bico de Água |  | 40.58274 | -8.14944 | river |
| 61961327d0d0fa3ff5185a64 | Rio Tejo | Lisboa | 38.68879 | -9.18673 | river |
| 630499b50601316edd700311 | Cascata Do Lordelo | Couto de Esteves | 40.76640 | -8.29416 | river |
| 65f5cc7f74656a3b1685fdd5 | Passadiços da Ribeira do Espírito Santo | Arcozelo | 41.06256 | -8.64378 | hiking_area, river |

### Concert Hall — 275 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b853f18f964a520a15231e3 | Rivoli Teatro Municipal | Porto | 41.14767 | -8.60932 | music_venue, theatre |
| 4e065b2e2271dfa46ba8a445 | Feira da Vinha e do Vinho | Anadia | 40.44501 | -8.43852 | music_venue |
| 4e0e355145ddc2c6d175a031 | Auditorio Venepor | Maia | 41.23380 | -8.62493 | music_venue |
| 4ee26af29a521fcbefa5c87e | Casa da Cultura |  | 38.84637 | -9.08529 | music_venue |
| 4f31cc47e4b0871fe633cf9e | Centro Cultural E Recreativo "Os Malmequeres De Lourosa" | Lourosa | 40.97187 | -8.53080 | music_venue |
| 4f6117f7e4b09a0647fedab7 | VW Black Power |  | 41.23670 | -8.59895 | music_venue |
| 4fa69ee8e4b0cfe54dc9ffc4 | Pavilhão Multiusos De Nandufe |  | 40.53819 | -8.08060 | music_venue |
| 4ff75332e4b0a7f740a370f5 | DAVID FONSECA Mar Shopping |  | 41.20259 | -8.69285 | music_venue |
| 503a5106e4b049dedbb2b6a0 | St Culterra |  | 41.35465 | -8.46041 | music_venue |
| 50d4f3bee4b0e01398a6b0fd | Circulo Católico de Operários de Barcelos | Barcelos | 41.53186 | -8.62095 | music_venue |
| 50dd95b1e4b00277a9aa9f40 | SFUS - Soc. Filarmónica União Samorense | Samora Correia | 38.93593 | -8.87281 | music_venue |
| 514cf238e4b04b4106ba9459 | AMAL | Faro | 37.01906 | -7.92770 | music_venue |
| 523b5e4111d257842fd23c0f | FUOB - Conservatório Artes e Comunicação |  | 40.50990 | -8.49234 | music_venue |
| 528df696498e990fc6dc805b | Centro Cultural Padre Carlos Alberto Guimarães |  | 38.71007 | -9.13735 | music_venue |
| 531767d7498e1ec6df2ba6e8 | Salão de Festas do Mercado Municipal | Ferreira do Alentejo | 38.05804 | -8.11969 | music_venue |
| 53ed2f91498eb8e575b16873 | surf at night |  | 40.94281 | -8.63915 | music_venue |
| 55bbf617498ecb12e35ad07f | Espaço Q | Faro | 37.01414 | -7.93397 | music_venue |
| 5b8a57bb25fb7b002c2a2f9a | Avenida Café-Concerto | Aveiro | 40.64196 | -8.64954 | music_venue |
| 625999126a53da59bb964808 | Casa das Virtudes | Faro | 37.02182 | -7.94317 | music_venue |
| 693864644e845551f82c0fcc | Presidencial Fado | Porto | 41.14578 | -8.61029 | music_venue |

### Museum — 256 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 20be6acf115147b409a8cb5a | Museu da Agricultura e do Queijo | Celorico da Beira | 40.62743 | -7.33742 | museum |
| 2defc48ce6ed40c1048ca6f9 | Museu Francisco de Lacerda | Calheta | 38.60209 | -28.02212 | museum |
| 4d38345e7ebf721e7bc76dfb | Nucleo Sportinguista De Leiria | Leiria | 39.74690 | -8.81312 | museum |
| 4d388c3615993704a289ba91 | Porta Da Barbacã | Coimbra | 40.20888 | -8.42895 | museum |
| 4f0f2cd4e4b0254b4e80d8db | Museu Aberto de Campo Maior | Campo Maior | 39.01345 | -7.07267 | museum |
| 4f0f2cefe4b00ae6bce8a271 | Museu do Regimento de Cavalaria N.º 3 | Estremoz | 38.84432 | -7.58712 | museum |
| 4f0f2cf8e4b09cff018dce23 | Museu Municipal de Aljustrel \| Núcleo da Central de Compressores de Algares | Aljustrel | 37.87266 | -8.16412 | museum |
| 4f0f2d33e4b045a5c4e82111 | Museu do Marceneiro | Évora | 38.56904 | -7.90812 | museum |
| 50afaa5d498e8cffe157c7f7 | Museu do Pão e Vinho de Favaios | Favaios | 41.26572 | -7.50093 | museum |
| 517a932c498e11ab3363b70b | Casa Da Cultura | Trofa | 41.33779 | -8.57393 | museum |
| 57ffa64c38faf57c5179d3f4 | Memorial Irmã Lúcia | Coimbra | 40.20216 | -8.40649 | museum |
| 58c95e132ec3645758350591 | Moto Clube Sintra |  | 38.79213 | -9.38006 | museum |
| 5c4779307d84970039c25639 | Uccla | Lisboa | 38.69708 | -9.19222 | museum |
| 656cb0def3a4b3021e155c5c | Urban (R)Evolution | Lisboa | 38.69754 | -9.19017 | museum |
| 663fa8981b851d63cada3a8a | Ah Amália | Armazém 15 e 16 | 38.74196 | -9.10238 | museum |
| 67e02bc1a3f11f67de6530d8 | Centro Interpretativo Das Festas Do Povo - Casa Das Flores | Campo Maior | 39.01285 | -7.07294 | museum |
| 6a74c495ffc4786418964509 | Batalha Municipal Community Museum | Batalha | 39.65748 | -8.82496 | museum |
| 6a7539d6c5fb9f02d8d3d6f1 | Casa do Moscadim | Chamusca | 39.45631 | -8.39761 | museum |
| afe3aaa70fff70499c9bfaa7 | Museu e Centro de Artes de Figueiró dos Vinhos | Figueiró dos Vinhos | 39.90266 | -8.27568 | museum |
| d69c684a0e95412f627d4c9e | Marinha - Museu Marinha - Planetário Calouste Gulbenkian | Lisboa | 38.69621 | -9.20857 | museum |

### Harbor or Marina — 240 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c9e290e03133704b6ef65d5 | Marinha da Troncalhada | Aveiro | 40.64058 | -8.66416 | marina |
| 4d3a92c80333a09392155634 | Doca de Recreio das Fontainhas | Setubal | 38.52078 | -8.89354 | marina |
| 4dac789ccda1652a2bb8d2ad | Cais Comercial da Horta | Horta | 38.53192 | -28.62115 | marina |
| 4dd15725c65bdac713a6fa99 | Marina de Sesimbra | Sesimbra | 38.43658 | -9.11423 | marina |
| 4e0ee01db61c3fe47807fec0 | Ronqueira Kayak Departure | Penacova | 40.25148 | -8.28028 | marina |
| 4e137f77d22d4014170ffeb5 | Porto Antigo | Cinfães | 41.08965 | -8.11782 | marina |
| 4e2a9f49c65bcaf4002577fb | Marina do Funchal | Funchal | 32.64563 | -16.91023 | marina |
| 4e75146388775d593dce6568 | APDL |  | 41.18677 | -8.70108 | marina |
| 4e8ef7c86da16fd9cf3e1dfb | Porto Da Calheta Do Nesquim | Cascalheira | 38.40237 | -28.08120 | marina |
| 4f082509e4b0d6422a8938c5 | Posto Nautico Novo - Clube Dos Galitos |  | 40.64122 | -8.64604 | marina |
| 4ff6a673e4b04619c71a7564 | Cais Do Pinhão | Pinhão | 41.18976 | -7.54708 | marina |
| 50381556e4b0b35a24cfab7f | Porto da Feteira |  | 38.52307 | -28.67281 | marina |
| 503911d4e4b0b15ca59419ab | Portinho do Topo |  | 38.54697 | -27.75960 | marina |
| 5073d963e4b06ca75bef8272 | BMW Sailing Academy | Lisboa | 38.69952 | -9.17908 | marina |
| 51993158498eb31b5a024881 | Porto das Ribeiras |  | 38.40591 | -28.18768 | marina |
| 51e2e3c9498e6dfbc814510d | Centro De Vela De Viana Do Castelo |  | 41.68445 | -8.83778 | marina |
| 5353b7ec498e3bdbfb74c5e7 | Barragem da Caniçada |  | 41.65677 | -8.25154 | marina |
| 535e7f28498ed17a1ea1b883 | Cais do Mancão | Murtosa | 40.76177 | -8.66024 | marina |
| 57bf30fe498e81fc99b7d211 | Portiate.com |  | 37.11578 | -8.52881 | marina |
| 680f585049dee064134eba62 | Marina Foz Do Távora | Adorigo | 41.15717 | -7.58271 | marina |

### Bridge — 215 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4cd1383d7b685481a7b2c5f8 | Ponte Do Trancão | Sacavém | 38.79820 | -9.10169 | bridge |
| 4e4674d6d22d12b08bc0ec44 | Ponte Ferreira do Zêzere - Vila do Rei | Ferreira do Zêzere Municipalit | 39.70132 | -8.26606 | bridge |
| 4ef1d5a38b81368cf795c43b | Ponte dos Regos | sete cidades | 37.85471 | -25.78817 | bridge |
| 4f57a0dde4b0f5ca244f22df | Ponte Comboio | Lares | 40.12529 | -8.77145 | bridge |
| 5022c129e4b0ee4c5ba5264e | Rio Torto | Gouveia | 40.51104 | -7.65363 | bridge |
| 502752e4e4b043587a1b7cb4 | Ponte Filipina Malhadal | Malhadal | 39.79684 | -7.95112 | bridge |
| 508613c8e4b0c5ad609adb3b | Ponte da gandra v. | vlc | 40.84915 | -8.39253 | bridge |
| 52330d4a11d2d35258481c34 | Ponte da Inha | Inha | 41.01209 | -8.46487 | bridge |
| 5246b496498e711630898865 | Ponte De Sandomil |  | 40.37317 | -7.79904 | bridge |
| 531b56ed498e8f9d90030bab | ponte romana de cepães |  | 41.42423 | -8.20427 | bridge |
| 5777822a498e9a303d16e007 | Ponte Luís I, Porto, Portekiz | Porto,Portekiz | 41.14818 | -8.64252 | bridge |
| 5d330d3165d0990008487760 | Ponte Ferroviária de Oeiras | Oeiras | 38.68777 | -9.31567 | bridge |
| 5d6671f557ba490008b42cc0 | Ponte Dos 7 Arcos | Nordeste | 37.83186 | -25.14495 | bridge |
| 5f58ace70b69a228a159992c | Ponte Ferroviára de Alcácer do Sal | Alcacér do Sal | 38.36846 | -8.52031 | bridge |
| 634167d69e16da5b5e256f22 | Ponte Miguel Torga | Canelas | 41.15226 | -7.77361 | bridge |
| 646134e4d4b7522079caad27 | Ponte Dos Botirões | Aveiro | 40.64426 | -8.65642 | bridge |
| 662bb85356ede324a36bfa6e | Ribeira De Terges E Cobres | Alcaria Ruiva | 37.83661 | -7.85922 | bridge, river |
| 66400820b40d0442838f7e59 | Ponte Nova Do Arade | Portimão | 37.15180 | -8.51144 | bridge |
| 668d73141043de23b7fe6964 | Passadiços do Távora | Vila da Ponte | 40.92017 | -7.51400 | hiking_area, bridge |
| 693ec66a588de974d11f1505 | Ponte De Samuel | Pindelo | 40.86466 | -8.44074 | bridge |

### Soccer Stadium — 214 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d282efd342d6dcb02bdf5ca | CD Candal - Estádio Rei Ramiro |  | 41.13775 | -8.62509 | stadium |
| 4df47eef45dd4e269344553d | Aliados F.C. Lordelo |  | 41.23696 | -8.43398 | stadium |
| 4e87420fd22d194bdece5ac9 | Campo da Bezerra | Porto de Mós | 39.54390 | -8.85087 | stadium |
| 4ebc2c72754a7dea1dd15bbd | Estádio dos Trambelos | Lourosa | 40.98775 | -8.54353 | stadium |
| 4f4a1b7ce4b007d390629976 | Estádio Municipal de Nogueira | Maia | 41.24161 | -8.59187 | stadium |
| 4f4a54b6e4b08334fc0ddd1e | Brufe Atlético Clube | Brufe | 41.40869 | -8.53654 | stadium |
| 4f785a55e4b063364867b21a | Estádio Municipal da Boavista | Castelo De Paiva | 41.03990 | -8.26426 | stadium |
| 4fc7187be4b08b663da85f47 | Lusitânia FC de Lourosa - Campo de Treinos |  | 40.98791 | -8.54260 | stadium |
| 4fcba3d8e4b07471e0c81c33 | Ermesinde Sport Clube | Ermesinde | 41.21912 | -8.54429 | stadium |
| 504b6350e4b0548541bcd7e0 | Olivais Moscavide |  | 38.77433 | -9.10452 | stadium |
| 5144a368e4b0dfd2cdfd81c4 | Pavilhão Bombeiros Rebordosa |  | 41.21729 | -8.41211 | stadium |
| 526ce88511d23fb78e097e43 | Campo Afonso Ramos Bandarra | Aguim | 40.41013 | -8.44813 | stadium |
| 52e3ac11498e082ef73251a3 | Estádio Municipal São Mateus (Recreio Pedroguense) |  | 39.92590 | -8.14976 | stadium |
| 534598ec498ea3a12853abdb | Campo de Jogos Bom Jesus | Ribeira Grande | 37.81341 | -25.57960 | stadium |
| 57cd5d99498ec7dfd954b03e | SL Benfica Arena | Lisbon | 38.71040 | -9.15414 | stadium |
| 57fe7d36cd10bdc1a390a2e0 | Sport Lisboa e Benfica | Lisboa | 38.75286 | -9.44351 | stadium |
| 5a4843185c68380e43e5696c | Pavilhao 1 Slb |  | 38.75149 | -9.18359 | stadium |
| 5b7c5e473fcee8003944024d | Sector 41 | Lisboa | 38.75262 | -9.18463 | stadium |
| 5d04ff53113cf1002372cc35 | Complexo Desportivo De Óbidos | Óbidos | 39.35160 | -9.15856 | stadium |
| 671e3c58e01fe03108630654 | Estádio Ur Mirense | Mira de Aire | 39.54331 | -8.70357 | stadium |

### Public Art — 211 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 50bf7bb4e4b018b4ee5eae5b | Monumento à Tauromaquia | Alhandra | 38.92643 | -9.00594 | historical_landmark |
| 5120319de4b03cb4c3e2b9b8 | Challet dos Gatos | Lisboa | 38.69764 | -9.18431 | historical_landmark |
| 51605916e4b0531a245abea5 | Biblioteca da Freguesia de Lagares |  | 41.12399 | -8.36976 | historical_landmark |
| 517fe691e4b0bcff7e17031f | 33 Atelier |  | 40.53517 | -7.26883 | historical_landmark |
| 51a79bed498e4ec6595a9e6f | Estátua da Varina | Vila Franca De Xira | 38.95395 | -8.99077 | historical_landmark |
| 51a94b5a498e902d9a72226b | Coração na Rua | Porto | 41.15660 | -8.56698 | historical_landmark |
| 51b8eb74498e58f4ba8951df | Baile Sto Antonio |  | 37.17904 | -7.45170 | historical_landmark |
| 51f1afeb498ecbcd76d7f11d | Sociedade De Artistas Estremocense | Estremoz | 38.84333 | -7.58824 | historical_landmark |
| 51f40813498e7ae2d9576515 | Capelas Imperfeitas do Mosteiro da Batalha |  | 39.70428 | -8.82776 | historical_landmark |
| 520f99cc11d203a9e30c5871 | Capeia de Alfaiates |  | 40.38753 | -6.94002 | historical_landmark |
| 526a964a11d298684a6a34c2 | EXD'13 Headquarters | Lisboa | 38.71239 | -9.14245 | historical_landmark |
| 52b9c86a498ea2f02d9fc351 | Ponte de Valença |  | 42.01133 | -8.64662 | historical_landmark |
| 52c59b1c498e73f2d429ba87 | lapinha do Somagre |  | 32.72688 | -17.15428 | historical_landmark |
| 52d6e314498e397f0c7df7e2 | Espaço Zen |  | 38.71932 | -9.41862 | historical_landmark |
| 53564d9d498eeed72bcff99d | Olaria Luis Janeiro Unipessoal, Lda | 7200-126 Corval | 38.44694 | -7.48544 | historical_landmark |
| 53d2fe36498e0f86bcd76263 | Grandiosas Festas da Vila de Lousada |  | 41.27747 | -8.28325 | historical_landmark |
| 5692c583498edd32ccd94bc8 | Rua Do Meio |  | 41.00087 | -8.60804 | historical_landmark |
| 57c3560acd101c527ded88cd | FAGAP | Armação de Pêra | 37.10189 | -8.36503 | historical_landmark |
| 5ba148e2471d6e0039633a44 | Memorial a Nelson Mandela | Funchal | 32.64658 | -16.90733 | historical_landmark |
| 65eca64aa2fb90622b5ad02e | Seahorse - Bordalo II | Faro | 37.00535 | -7.98976 | historical_landmark |

### Lake — 200 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4befef3924f19c745a27f983 | Teleski | Vieira do Minho | 41.63528 | -8.14131 | lake |
| 4d0ce24ceea9b60c4e1b5b3f | Monte Da Rocha |  | 39.02219 | -7.16964 | lake |
| 4db43b01cda1c57c8256f206 | Barragem Do Lucefecit | Alandroal Municipality | 38.63343 | -7.40771 | lake |
| 4e240867fa761d671095a034 | Barragem do Maranhão | Maranhão | 39.05643 | -7.91180 | lake, marina |
| 4e5a7fb918a8c2047519ccae | cais palafitico da barrosa (Lagoa de Óbidos) | Caldas da Rainha | 39.40588 | -9.19773 | lake |
| 4ed7c56f0e6145a391395da9 | Barragem do Roxo |  | 37.93671 | -8.08101 | lake |
| 4ee0d5eb6c2524fcddb559d9 | Lagoa de Mira | Mira | 40.41776 | -8.73624 | lake |
| 4f6e0734e4b0ac4cdad35100 | Sítio das Fontes | Lagoa | 37.16262 | -8.48600 | lake |
| 503280b2e4b0b49bb6cf00b6 | Praia Fluvial de Cambra de Baixo |  | 40.68345 | -8.16430 | lake |
| 50434d6fe4b0f306728e2467 | Barragem e acude de Cova do viriato |  | 40.31419 | -7.56406 | lake |
| 50d3cca8e4b0e8f6d60769ff | Lago da Praça Alvaro Costa Leite |  | 40.84942 | -8.39070 | lake |
| 51c69fe8498e67099b565242 | Barragem da Erada |  | 40.23051 | -7.64418 | lake |
| 5251c8e3498e70b9837159f5 | Barragem do Reguengo |  | 38.96026 | -7.29635 | lake |
| 5257d52511d294e683cb36ac | Lagoa |  | 40.64426 | -8.65641 | lake |
| 53ce659b498e0eaa7ccd9020 | Portinho Dos Bois |  | 41.86864 | -8.83815 | lake |
| 570cf78f498e709d143bd265 | Barragem da Ortiga |  | 37.98822 | -8.74213 | lake |
| 5ae04b5e83e3801fcbd6e8f9 | Lagoa | Arrabal | 39.69300 | -8.72416 | lake |
| 5f7b6a746437a030b110098a | Lagoa Funda | Lajes das Flores | 39.40601 | -31.21747 | lake |
| 61058283d3070f6308bff85b | Lagoa De Gens | Foz do Sousa | 41.11623 | -8.47264 | lake |
| 64c1513a281ecb215c882c9d | Waterval | Soajo | 41.88511 | -8.25405 | lake |

### Surf Spot — 165 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 1b00713095be4e3f0639cec5 | Kai Nui SUP & Kayak Lagos | Lagos | 37.09897 | -8.66870 | surf_spot |
| 4c6cf7573fbf76b06051411c | Sumol Surf School - Peniche Surf Camp & School | Peniche | 39.37198 | -9.33335 | surf_spot |
| 4d4d658c9ee13704672a838b | Praia do Baleal Norte (Lagido) | Peniche | 39.37290 | -9.33739 | surf_spot |
| 4df7f9d3f5b34b4683727189 | Appartement Ericeira | Ericeira | 38.98330 | -9.41667 | surf_spot |
| 4e303139b61c88c3a79fba8f | Praia da Cova de Alfarroba | Peniche | 39.36005 | -9.36301 | surf_spot |
| 4e4aafc6fa76a0c058d35797 | Praia Fluvial Soltróia |  | 38.46079 | -8.85819 | surf_spot |
| 4e58ce63d4c0ba8c119477ac | Praia Da Aguçadora |  | 41.41971 | -8.78276 | surf_spot |
| 4eaebdb402d5cf33faf4cf80 | Fun Ride Amado |  | 37.16748 | -8.90175 | surf_spot |
| 50057e43e4b09f6dc7d29f7f | mais um bocado derreto |  | 40.75230 | -8.57285 | surf_spot |
| 50095d98e4b00abeae43cd6b | Waikiki Private mertens beach |  | 37.65787 | -8.80015 | surf_spot |
| 502e331de4b0bde725cb2d01 | Praia de Porto Mós |  | 37.01653 | -8.92954 | surf_spot |
| 525abd4f11d236eef0d466e6 | Praja Vicentino |  | 37.34147 | -8.80855 | surf_spot |
| 52a339c4498eff615957f582 | Porron | Caminha | 41.84177 | -8.87219 | surf_spot |
| 55259453498e516ab176f85e | Surf Lessons Portugal | Lisbon | 38.70736 | -9.15800 | surf_spot |
| 5787aa87498e2769d1175ec0 | Surfplace |  | 38.81619 | -9.45232 | surf_spot |
| 5978f3fcaa6c9510b626be09 | Original Surf School | Vilamoura | 37.07457 | -8.12518 | surf_spot |
| 59830ae314994634276cf820 | Feel Viana Beach | Viana do Castelo | 41.67911 | -8.83158 | surf_spot |
| 5ae642f01ffed7002c40008d | The Other Guesthouse | Aljezur | 37.31462 | -8.85729 | surf_spot |
| 6523d0683e792b2adfe21f68 | Atlantic Ocean |  | 32.63741 | -16.75287 | surf_spot |
| b055941521eb4bb66deb6d1f | Haliotis Surf Adventures | Peniche | 39.35008 | -9.35872 | surf_spot |

### History Museum — 142 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 3863d151930b4f7ad4676838 | Fernando V Serrão Peralta | Póvoa da Isenta | 39.21997 | -8.74063 | museum |
| 3c284ae7763440d918b827dd | Cihafa- Centro de interpretação | Fornos de Algodres | 40.61670 | -7.53330 | museum |
| 4c57048ed12a20a1a4be65bd | Museu A Cidade do Açúcar | Funchal | 32.64806 | -16.90697 | museum |
| 4dbd8e616a23e294ba480a08 | Capela do Espirito Santo dos Mareantes | Sesimbra | 38.44386 | -9.10173 | museum |
| 4e5626b21f6ecd24d00f09b6 | Museu Judaico de Belmonte | Belmonte | 40.35863 | -7.35019 | museum |
| 4e566e07887784077061337d | Centro de Artes e Ciências do Mar | Lajes Do Pico | 38.40346 | -28.25535 | museum |
| 4e98869fe5fab92b21dad86d | Casa Municipal da Juventude | Aveiro | 40.64187 | -8.64801 | museum |
| 4ee1f577469093b9586e12be | Macinhata do Vouga - Estação Ferroviária e Museu | Macinhata do Vouga | 40.65816 | -8.47536 | museum |
| 4f00e74a8b81b0190bdea517 | Museu Municipal de Santiago do Cacém | Santiago do Cacém | 38.01665 | -8.69299 | museum |
| 505dd126e4b0c6778390b19e | Fundação Eça De Queiroz | Santa Cruz do Douro | 41.12483 | -8.00451 | museum |
| 507ec50ee4b0225db132d955 | Museu Regimento de Sapadores Bombeiros de Lisboa | Lisboa | 38.75526 | -9.19150 | museum |
| 519c81fe498ef7622548993b | Museu Etnográfico de Serpa |  | 37.94795 | -7.60137 | museum |
| 57ac9045498e8198fcb0af03 | Museu de Sines |  | 37.94843 | -8.86227 | museum |
| 5846dd69126ae832b6bd084d | Núcleo Etnográfico da Lousa |  | 39.93722 | -7.37922 | museum |
| 59a3f6816a8d862d2f5a53ed | Ruínas de Conímbriga | Condeixa-a-Nova | 40.09834 | -8.49084 | museum |
| 5bbe253e38f2160025da3916 | Museu Da Filigrana | Lisboa | 38.70988 | -9.14132 | museum |
| 60d75b209bd21a66656fcebe | Centro Interpretativo Do Vinho De Talha | Vila de Frades | 38.21424 | -7.82602 | museum |
| 6644db0a373511038ed0a38f | Historische Wassermühle | Santana | 32.80160 | -16.88528 | museum |
| 66f2d6251d804b39c5c89c3a | Museu Visigótico Santo Amaro | Beja | 38.01758 | -7.86623 | museum |
| 6945a54da0eb57433d60b85f | Horizonte de Quéops | Lisboa | 38.70705 | -9.13390 | museum |

### Theater — 141 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 07eec6cf48ae41cfb45d79f5 | Cine Teatro Caridade Moura | Mourã | 38.14264 | -7.45145 | theatre |
| 0d1b62611f094ce777766f23 | Auditório da AIRV em Viseu | Ranhados | 40.62912 | -7.87318 | theatre |
| 3b6e6f397c6c451e11ff599a | Teatro em Movimento | Bragança | 41.81733 | -6.76384 | theatre |
| 4c1e3803eac020a1bd5049c2 | Auditório Municipal Ruy de Carvalho | Oeiras | 38.72665 | -9.24166 | theatre |
| 4ce840fbb9975481ef6efb44 | Teatro Lethes | Faro | 37.01835 | -7.93181 | theatre |
| 4ce95a1c0f196dcb46574bae | Cineteatro Estarreja | Estarreja | 40.75188 | -8.57182 | music_venue, theatre, movie_theater |
| 4d44381c14aa8cfaa5eb633d | Ballet Teatro | Porto | 41.17125 | -8.61206 | theatre |
| 4e878bbaf5b966be3ecc4a37 | Noites de Poesia de Vermoim | Maia | 41.23621 | -8.61517 | theatre |
| 4ebedc46e5fae16464105185 | Cine Teatro Caracas | Oliveira de Azeméis | 40.83667 | -8.47718 | theatre |
| 4fc33e3cbb3d92c20072452d | La Marmita | Vila Nova de Gaia | 41.13678 | -8.61382 | theatre |
| 4fe62cd9e4b09198fdd0cda8 | CETA |  | 40.64401 | -8.65611 | theatre |
| 5062e967e4b03f3ec3c851b8 | Teatro do Belomonte | Porto | 41.14270 | -8.61650 | theatre |
| 52bf4ba311d2d18d31258d94 | TAS - Teatro de Bolso |  | 38.52581 | -8.89670 | theatre |
| 53066f07498e076194de4006 | Oficina de Teatro Mário Pereira | Barreiro | 38.66502 | -9.07491 | theatre |
| 553c2b61498e04e9284c62c4 | Teatro da Trindade | Porto | 41.14790 | -8.61136 | theatre |
| 59334aeb446ea63a11554695 | A Volta Ao Mundo Em Oitenta Minutos | Cascais | 38.70666 | -9.39743 | theatre |
| 62082b1df83e803e0988fb4e | Teatro Jordão | Guimarães | 41.43881 | -8.29519 | theatre |
| 87751afddab541395d07e516 | Teatro Regional da Serra do Montemuro | Castro Daire | 40.99643 | -7.92804 | music_venue, theatre |
| 948a47e61b1d4c5dcb3e51b5 | Teatro Municipal de Faro EM, T M F | Faro | 37.02660 | -7.94174 | theatre |
| d487d384118b4f7a6cac490d | A Capoeira - Companhia de Teatro de Barcelos | Barcelos | 41.53004 | -8.62129 | theatre |

### Amusement Park — 134 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 35b3ed2ff4cf424dc8e5cee9 | Funny City | Maia | 41.21111 | -8.60384 | amusement_park |
| 3b61d2f16d2b49af3e74d949 | Atlantic Park | Loulé | 37.13908 | -8.02214 | amusement_park |
| 4e2c357a7d8b7deda6d85408 | Parque Drinks |  | 40.64124 | -8.65733 | amusement_park |
| 4ed79a80b6346530d08fcfa6 | GatosParty | Vila Franca de Xira | 38.89512 | -9.03519 | amusement_park |
| 4f48f124e4b0bde5097d3021 | Escolinha do Figo (Quinta da Marinha) | Cascais | 38.70997 | -9.45567 | amusement_park |
| 4f647c32e4b014afeb1dbcb9 | Iberanime |  | 38.70270 | -9.17862 | amusement_park |
| 4f9c29a5e4b03d83ec8e1d2c | Insuflável do Quintal |  | 39.91998 | -7.44471 | amusement_park |
| 4fdcaeafe4b056ef38a303cf | Pisco Paintbal |  | 41.24257 | -8.70965 | amusement_park |
| 4ff32ec9e4b0cc077c477f19 | Academia Do Lumiar |  | 38.76874 | -9.15769 | amusement_park |
| 504ef8f0e4b03e076cc839e7 | Parque Infantil |  | 38.62096 | -8.58024 | amusement_park |
| 5053e05ce4b0e7ceb646aa97 | CALHA DO GROU | Fazendas De  Almeirim | 39.12010 | -8.60794 | amusement_park |
| 50a7df74e4b0370ed0ad0bb2 | Espaço Didático | Rio Tinto | 41.17340 | -8.56328 | amusement_park |
| 5218cdf311d203735afc6cd4 | Quinta Do Manchas | Vila Franca de Xira | 38.93467 | -9.03003 | amusement_park |
| 523d8b0a11d236ac85b1b999 | Warp 5 |  | 37.09451 | -8.07323 | amusement_park |
| 55b4fa42498e095b078ce833 | luilhas |  | 41.53812 | -8.13844 | amusement_park |
| 591c5ce8033693182d4ab34e | Parque Biológico De Ribeira De Pena | Ribeira de Pena | 41.51591 | -7.79379 | amusement_park |
| 614f408b63cc6534217e00b6 | Parque Bosque Doutor Festa | Arcozelo | 41.05327 | -8.63954 | amusement_park |
| 68c53d7c01da881588ca62be | Monkey Park | Canelas | 41.09240 | -8.59800 | amusement_park |
| 690623a8f89a2a661f8be87f | Arena Liga Portugal | Porto | 41.17342 | -8.63852 | amusement_park |
| e9cf0c3811d1434d687566fc | Chiqui Park | Matosinhos | 41.17807 | -8.68909 | amusement_park |

### Movie Theater — 133 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 34319f0cb6e9464db7b4056b | Socorama - Sociedade Comercial de Cinema | Lisboa | 38.74226 | -9.13837 | movie_theater |
| 3ae928f3ca53480e0b490304 | Grupo de Teatro Joana | Lisboa | 38.71243 | -9.14588 | movie_theater |
| 4ccc800f54f0b1f7b7f216ca | Sociedade Filarmónica Estrela Moitense | Moita | 38.65363 | -8.99156 | movie_theater |
| 4d83fd4561676dcbff9968e4 | Cineclube | Guimarães | 41.44290 | -8.29488 | movie_theater |
| 4e2dcd77aeb7e1b8af9518ea | Cine-teatro da Lousã | Lousã | 40.11244 | -8.24653 | movie_theater |
| 4e4e4e5181308c328c67aa46 | Douro Film Harvest | Alijó | 41.27588 | -7.47525 | movie_theater |
| 4e52bbf622710da1b3e25b6b | Cinema de São João Da Madeira | São João da Madeira | 40.90883 | -8.49539 | movie_theater |
| 4ec2310e7ee54e4cd3bb573b | Somnorte | Vila Nova de Gaia | 41.12093 | -8.60320 | movie_theater |
| 4feae053e4b03ec2168f9194 | Estudio Alfa - Hotel dos Cavaleiros | Torres Novas | 39.47935 | -8.53939 | movie_theater |
| 502eb00c582f12791432c834 | Cine Teatro | Quarteira | 37.07360 | -8.11056 | movie_theater |
| 50e9caade4b036fe586c5558 | Cinema |  | 41.14399 | -8.64031 | movie_theater |
| 50f5802de4b046fbc8a051dd | Centro Do Cinema | Lisboa | 38.71503 | -9.14599 | movie_theater |
| 51eef643498e04078fa5a121 | 6D Cinema |  | 37.73897 | -25.66137 | movie_theater |
| 538f1f01498e3913874a29de | Cinema Dolce Vita Ovar | Ovar | 40.88050 | -8.62882 | movie_theater |
| 53f8f867498e7a6931dc74af | Drive In | Montijo | 38.69533 | -8.94338 | movie_theater |
| 55e08477498e283124ab1e7b | Cineteatro Miramar |  | 37.81453 | -25.58039 | movie_theater |
| 57e1d493498e05a911f87c0b | SALA - 5 |  | 41.18099 | -8.65585 | movie_theater |
| 5bdd0337a2a6ce002c0711ec | Cinema Charlot | Porto | 41.15729 | -8.62801 | movie_theater |
| 8584044e7ff44461fb90e60e | Pull&Bear C.Rainha-La Vie Caldas da Rainha | Caldas da Raínha | 39.40111 | -9.13743 | movie_theater |
| 8f22d1ebf1a24af16f90a7dd | Cinemas Jumbo | Setúbal | 38.54239 | -8.88456 | movie_theater |

### Water Park — 96 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4cb047feb4b0a35d5bd947ce | Piscinas Do Fundao |  | 40.10930 | -7.48376 | water_park |
| 4e395fcb18a8d2fcc62ac1b9 | Cogumelo de Água | Sernancelhe | 40.81142 | -7.55042 | water_park |
| 4e43b9d1b61cac6fc74bca29 | Clube Paraíso | Guimarães | 41.44161 | -8.37134 | water_park |
| 4edd33167ee5e8e3ea2c9d6d | Fixelândia | Sintra | 38.77553 | -9.34091 | water_park |
| 4ef761a4e300930670165bef | Natura Clube |  | 40.26739 | -7.49832 | water_park |
| 4fc0a3d0e4b03278514fecf3 | Piscina Municipal de Rio Maior |  | 39.35564 | -8.94063 | water_park |
| 4fd5f2c8e4b03f13ed8d3a1e | Zoomarine Rapid River | Guia | 37.12483 | -8.31584 | water_park |
| 4ff0931ee4b0550dc77d429a | Piscina de Sao Pedro Esteval |  | 39.63861 | -7.83963 | water_park |
| 5017ae95e4b011b35edc58d4 | Swimningpool Bogaard |  | 37.21117 | -7.57823 | water_park |
| 5023c1c6e4b0f26d6b9b63c4 | Aquaparque |  | 37.71736 | -25.42707 | water_park |
| 50749e4a067d32a8b5ac5079 | teatromion | penedo | 41.69259 | -8.20648 | water_park |
| 51f2a681498e29de333f4ee6 | Parque Aquático Amarante | Amarante | 41.26901 | -8.07839 | water_park |
| 52f02909498ebd44fdf7c2bf | Nia's aquarium | Lisboa | 38.73140 | -9.14740 | water_park |
| 52fd13fa11d2f85b41d26f79 | Piscina Municipal de Vila Praia de Ancora |  | 41.87191 | -8.83504 | water_park |
| 53b83646498eb33cef97106b | advanced training academy |  | 41.25614 | -8.09696 | water_park |
| 55a15c67498ed70fb9916b0f | zensation spa |  | 37.08885 | -8.25370 | water_park |
| 57a07f25498ec1202c7d8359 | Piscinas Municipais de Penamacor |  | 40.18279 | -7.16331 | water_park |
| 60fad135b70b6b7ab5901d32 | praia fluvial paul | Paul | 40.20813 | -7.63664 | water_park |
| 62fe623492a47d27da7bad0c | Ottieland | Viseu | 40.67211 | -7.92260 | water_park |
| 64f1d9d51d4e8e61041be29e | Douro AquaFun | Cabeça Boa | 41.18713 | -7.11615 | water_park |

### Nature Preserve — 85 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 3c935e1895ed4c0e50fa53aa | Reserva Natural da Serra da Malcata | Sabugal | 40.35210 | -7.09273 | nature_preserve |
| 4f0f2c6be4b0d2af739e0fb0 | Ecotrails - caminhos para natureza | Odemira | 37.59741 | -8.64577 | nature_preserve |
| 502e4a49e0e22814960c0d6f | Fajã da Caldeira de Santo Cristo | Calheta | 38.62499 | -27.92826 | lake, nature_preserve |
| 5272b6f211d2d5efa1278be3 | Floresta Laurissilva |  | 32.81327 | -17.14283 | nature_preserve |
| 52b347aa11d2f8cd52ffb4b8 | Reserva Natural do Estuário do Tejo |  | 38.87892 | -8.97774 | river, nature_preserve |
| 532b1f9b498ef90c9a68d946 | Parque Natural do Alvão | Vila Real | 41.32453 | -7.88487 | river, mountain, nature_preserve |
| 53cd22b9498ec6ddfb35bb18 | lagar de São Guilherme |  | 39.63522 | -8.25784 | nature_preserve |
| 53e61f91498ec1fa4db54efc | Poldje Mira-Minde |  | 39.54116 | -8.71033 | nature_preserve |
| 5566ee0a498ee2d4fe9d5aa1 | Dolphins |  | 36.88090 | -8.60071 | nature_preserve |
| 55aa9647498eca475dda19f8 | atlantic ocean |  | 41.14805 | -8.64588 | nature_preserve |
| 560685c9498e3722852538c8 | Reserva Natural do Cavalo do Sorraia |  | 39.24710 | -8.57562 | nature_preserve |
| 5781187b498eb1d3108f4571 | Posto Vigia Boi |  | 40.49101 | -8.29749 | nature_preserve |
| 57828713498efcd104d97bc7 | Quinta Dos Bichos | Fernão Ferro | 38.58042 | -9.10987 | nature_preserve |
| 5905bcfb66f3cd3ef4332eed | Quinta Da Rocha |  | 37.10855 | -8.66054 | nature_preserve |
| 5d72a2c6ac611400083ac361 | Observatório Aves Aquáticas | Loulé | 37.09157 | -8.14261 | nature_preserve |
| 613f403a6edbf639757ff9e3 | Zona Balnear Do Caisinho | São Roque do Pico | 38.45640 | -28.15153 | nature_preserve |
| 614b28eb5ab2f23fa20200e9 | Caldeira Funda | Lajes das Flores | 39.40487 | -31.21913 | historical_landmark, nature_preserve |
| 61bf249adcb39e48e736b37a | Baloiço Da Eira Vedra | Eira Vedra | 41.65912 | -8.14020 | nature_preserve |
| 663b9d5cb60dfb7be985142f | Capa de Vesa | Silves | 37.17664 | -8.48490 | nature_preserve |
| 67f50cf2de3fe54493901e14 | Morcegário De Tróia | Carvalhal | 38.48926 | -8.89825 | nature_preserve |

### Castle — 83 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4cc428f9d43ba1436a0e65f8 | Castelo de Estremoz | Estremoz | 38.83948 | -7.58905 | historical_landmark |
| 4e7f4d39be7b6442d21dd306 | Fortaleza de São Filipe | Setúbal | 38.51769 | -8.90963 | historical_landmark |
| 50d45c0ae4b0d876e0ed8e58 | Castelo de Faro | Faro | 37.01181 | -7.93474 | historical_landmark |
| 511f8eb5e4b0c67437dbeaaf | Torre de Belém |  | 39.54917 | -9.15250 | historical_landmark |
| 515da44ee4b0944d899aa781 | Castelo de Ourique | Ourique | 37.65394 | -8.22606 | historical_landmark |
| 51c60b43498e5d271aa32f1e | Casterly Rock |  | 41.12875 | -8.63402 | historical_landmark |
| 51f57116498e69123f8016a5 | Santo Antonio Degracias |  | 40.02269 | -8.52261 | historical_landmark |
| 51ff79e5498e5101e9aeec74 | Ruínas da Calábria |  | 41.03053 | -7.01380 | historical_landmark |
| 5267dd4f11d2862051e73523 | Pinheiro |  | 41.17828 | -8.60871 | historical_landmark |
| 527dd95a11d2e9443e88c5e0 | Jamaica |  | 41.32863 | -8.72359 | historical_landmark |
| 5346d501498e5a0d4da568bc | Castelo de Penajóia | Lamego | 41.12850 | -7.85801 | historical_landmark |
| 55ab87f1498e5e476f56048a | Subida Para Castelo Dos Mouros |  | 38.79511 | -9.37860 | historical_landmark |
| 55db2feb498ee9a17c8a6b7f | Castelo e Vila Amuralhada de Ansiães |  | 41.20364 | -7.30387 | historical_landmark |
| 56017c33498e9c9587478390 | Torre de Menagem Estremoz |  | 38.84179 | -7.59222 | historical_landmark |
| 571b868f498e4066dec3b5b0 | Dešťové Království |  | 38.46227 | -28.32279 | historical_landmark |
| 59bab03a123a196ea4831d91 | Albufreira | Albufeira | 37.09755 | -8.24596 | historical_landmark |
| 5efdfa79fca34c0008f50a64 | Castelo De Outeiro | Outeiro | 41.68307 | -6.59191 | historical_landmark |
| 5f2aaed24ca3dc5ba0d3e4e1 | Forte De Santa Cruz | Horta | 38.53143 | -28.62593 | historical_landmark |
| 61ec3e48dcebbf78e21cbf72 | Castelo Do Disney | Alcabideche | 38.76487 | -9.44392 | historical_landmark |
| 65e9f80645cd3924ede0e29b | Reis Magos Fort | Caniço | 32.64468 | -16.82800 | historical_landmark |

### Stadium — 82 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b7838f4f964a5208ebd2ee3 | Pavilhão Casal Vistoso | Lisbon | 38.74320 | -9.12856 | stadium |
| 4d7ea69195c1a143a3c7d5f2 | Pavilhão Desportivo Municipal | Vila Nova de Gaia | 41.11800 | -8.57389 | stadium |
| 4de379221f6e3190cd27e28c | Pavilhão Desportivo Municipal Dr. Eduardo Mansinho | Tavira | 37.13222 | -7.64195 | stadium |
| 4dff47e6d4c00c69c14bd9a4 | Praca de Touros José Marques Simões | Arruda dos Vinhos Municipality | 38.98038 | -9.08039 | stadium |
| 4dffa6f3ae605b47b1764d39 | Fafe Ténis Atlantico-granja | Fafe Municipality | 41.44716 | -8.17746 | stadium |
| 4e18beca14957dc705dae25a | Pavilhão Desportivo | Pombal | 39.91177 | -8.63137 | stadium |
| 4e3d74e4c65b4ec275e26043 | Padroense Futebol Clube | Matosinhos | 41.18751 | -8.63459 | stadium |
| 4e4660f4c65bd6ffbe9037ad | Praça de Touros | Aldeia da Ponte | 40.42139 | -6.86669 | stadium |
| 4eec770abe7b6d62ff573549 | Pavilhão Municipal da Póvoa de Varzim | Póvoa de Varzim | 41.38841 | -8.75878 | stadium |
| 4f1b1f75e4b0d9f8b9057a0b | Leste Inferior - Flamengo |  | 42.05144 | -8.53651 | stadium |
| 4fd230e1e4b0e8273dc0ad0b | Praça de Touros do Sobral de Monte Agraço | Sobral de Monte Agraco | 39.01489 | -9.15202 | stadium |
| 50a41421e4b04e2d5c96b839 | Núcleo de Basket de Queluz |  | 38.75854 | -9.25039 | stadium |
| 50bbe881e4b0bedc1cbd7f6b | Praça de Touros de Alpalhão | Alpalhão | 39.41383 | -7.61925 | stadium |
| 5101e2fdc84c1186f1efb704 | Praça de Touros de São Jorge | Velas | 38.68532 | -28.20454 | stadium |
| 5270f3e611d2393d22b8b53b | Pavilhão Desportivo da ESDGM |  | 39.22619 | -8.68664 | stadium |
| 57f13446498e24c01fadb701 | Benfica CAMPEÃO |  | 39.75573 | -8.91347 | stadium |
| 580cc365d67c7ed8c88f078b | Pavilhão Municipal De Vila Flor | Vila Flor | 41.30562 | -7.15160 | stadium |
| 5a2c9523a35dce026f72b4a3 | Maria João Inc. | Vila Nova de Gaia | 41.12910 | -8.60350 | stadium |
| 61bf4a898b77e8217ae9ca89 | Estádio G. D. Porto D'ave | Porto d'Ave | 41.55960 | -8.23572 | stadium |
| b70b6228986842802a990b6c | Braga Municipal Stadium | Braga | 41.56251 | -8.42979 | stadium |

### Attraction — 80 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4ec51328722ececf19d64b14 | Praça do Vapor | Matosinhos | 41.18053 | -8.65628 | historical_landmark, amusement_park |
| 4ffe767fe4b0012e52fd6bbb | White Fall |  | 37.09383 | -8.07259 | amusement_park, water_park |
| 4ffe7703e4b07827a7609ffe | Slow River |  | 37.09340 | -8.07272 | amusement_park, water_park |
| 4ffe7868e4b0ca9b902d7785 | Snail |  | 37.09394 | -8.07255 | amusement_park, water_park |
| 4ffe7891e4b0ca9b902d831d | Spiral |  | 37.09407 | -8.07255 | amusement_park, water_park |
| 517948e0e4b07f115cedfbff | Parque Infantil |  | 38.04112 | -8.74178 | amusement_park |
| 51867f4d498eeceb0423a2a3 | Parque Aventura da Lipor |  | 41.19933 | -8.55185 | amusement_park |
| 51de0805498e8d6e5dff861c | Bull Area |  | 37.09054 | -8.45080 | amusement_park |
| 5233538e11d2ca05f79e4b34 | Parque Infantil Quinta Nova |  | 38.62982 | -9.19311 | amusement_park |
| 5234d93611d27df764ead59d | Aldeia do Carnaval | Ovar | 40.62714 | -8.64981 | amusement_park |
| 527596bd498e60799b3ae29c | Carros De Choque |  | 39.91404 | -7.46599 | amusement_park |
| 53ef34a3498ea42bb1112b00 | Quinta das Sobreira |  | 41.48148 | -8.43050 | amusement_park |
| 53fc8b67498e932f50fd2ade | Zoomarine T-Rex Era |  | 37.12308 | -8.31577 | amusement_park |
| 556d8538498e0442856f6993 | pulamania |  | 41.18458 | -8.68224 | amusement_park |
| 579e3300498e327385e8a20b | River Park Valada-Cartaxo | Valada | 39.07751 | -8.76127 | amusement_park |
| 5bc31630ccad6b002c4dc7f6 | Balizas | Santa Maria da Feira | 40.96506 | -8.56447 | amusement_park |
| 5e24ea9e293a0a000840e6b7 | Parque De Diversões Sac | Santo António dos Cavaleiros | 38.80564 | -9.17167 | amusement_park |
| 5e24eba37fc6dd000828eb76 | Parque De Diversões Sac | Santo António dos Cavaleiros | 38.80797 | -9.16161 | amusement_park |
| 60c4ea80b95b3e705e0da186 | Rodagigante |  | 38.69713 | -9.41953 | amusement_park |
| 69c811101bba1e2bcaf21dbe | Baloiço De Côta | Cota | 40.75455 | -7.67872 | amusement_park |

### Waterfall — 75 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d2871ae342d6dcbc256f8ca | Risco |  | 32.76022 | -17.12277 | hiking_area, waterfall |
| 4f5cbf7be4b008b1577d0e24 | Fraga da Pena | Pardieiros | 40.21832 | -7.93522 | waterfall, river |
| 5773f43e498eee5ebded445d | Океан, возле house Eвы |  | 37.08936 | -8.19358 | waterfall |
| 57a61be9498e6c05065ba8aa | Poço Azul |  | 37.85210 | -25.28822 | waterfall |
| 5b182d7abcbf7a002c3ced64 | Cascata Da Ribeira Quente | Povoação | 37.74513 | -25.30776 | waterfall |
| 60ae0fb09a7d3a59fe07fe24 | Poço das Mantas | Arcos de Valdevez | 41.88073 | -8.26846 | waterfall |
| 62596c859ef6a346eb952a49 | Cascata Das Lombadas |  | 37.79059 | -25.48098 | waterfall |
| 625a984c5fd84872a6beda8a | Cascata Do Segredo |  | 37.72209 | -25.46639 | waterfall |
| 62a4d30f0592fb6c2b62bf93 | Madre da Levada dos Tornos | Boaventura | 32.77384 | -16.99118 | waterfall |
| 646a589633be637273a804ff | Cascata Das Frechas | Praia da Vitória | 38.76905 | -27.18281 | waterfall |
| 64a03dab5e401060f853bdc1 | Esturranha | Freixieiro de Soutelo | 41.79958 | -8.79456 | waterfall |
| 659c0a87c36e1c62654a6e57 | Pego Da Rainha | Envendos | 39.57615 | -7.82135 | waterfall |
| 65be35f896c39b7c7305d6c1 | Cascata da Lage | Igreja Nova | 38.90290 | -9.29794 | waterfall |
| 65e897c1877f992c89cad223 | Cascata da Ribeira das Cales | Funchal | 32.69392 | -16.89893 | waterfall |
| 673a01e95c99cf5c602843fe | Queda De Água Do Salto Da Farinha | Nordeste | 37.85169 | -25.29457 | waterfall |
| 6747590cba16443a11030fc8 | Cascata do Córrego da Furna | Porto Moniz | 32.81442 | -17.07929 | waterfall |
| 689dc42572ba9d4d19537d2c | Cascata En Levada Dos Cedros | Porto Moniz | 32.79939 | -17.14388 | waterfall |
| 69595148dd83784d8d959237 | Cascata Dos Sonhos | Lara | 42.04652 | -8.52875 | waterfall |
| 69fc62e521fd73724f160621 | Cascata Do Zanganho | Gerês | 41.72807 | -8.16693 | waterfall |
| 6a78a90e35b6d948df0fb90a | Cascata do Rei Luminoso | Lajes Das Flores | 39.46769 | -31.25429 | waterfall |

### Hot Spring — 71 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 17a397ee29d34bc52dd1243d | Termas Sulfurosas de Alcafache, S.A. | Alcafache | 40.60612 | -7.87005 | hot_spring |
| 2b503386f590495a8e90c2e6 | Sociedade de Turismo de Santa Maria da Feira S.A. | Santa Maria da Feira | 40.92442 | -8.54341 | hot_spring |
| 4dd92b6eb0fb8af380b03423 | Águas da Pocinha | Caldas da Rainha | 39.50716 | -9.14670 | hot_spring |
| 4df243deb0fb807158bd7eef | Nascentes das Águas "Grutinha II" | Furnas | 37.77221 | -25.30510 | hot_spring |
| 4dfbc015a809a848e969c82b | Termas Do Eirogo | Barcelos | 41.56609 | -8.59157 | hot_spring |
| 4e2b522952b1b8f198609340 | Esquilo Park | Amares | 41.64020 | -8.41630 | hot_spring |
| 4e3015ced4c058fdbefa01e8 | Mata Nacional dos Medos | Almada | 38.61195 | -9.18792 | hot_spring |
| 4e7bb1998998913c83ae87cc | Bar do Smeagol | Braga | 41.54831 | -8.40455 | hot_spring |
| 4f3f9d4ae4b06010fbdf0086 | Fonte di Arunca |  | 39.83003 | -8.57695 | hot_spring |
| 4f7f0b69e4b08fc039e720be | Caldeira do Asmodeu | Furnas | 37.77287 | -25.30375 | hot_spring |
| 50156ebae4b0be9af5dad733 | Fonte de Águas Quentes das  Termas de São Pedro do Sul |  | 40.73886 | -8.09313 | hot_spring |
| 502bd757e4b06a8c8413917e | Fonte da Ladeira dos Envendos |  | 39.61682 | -7.84442 | hot_spring |
| 504f105de4b0ba7fa5b6965b | Clube de Saude |  | 41.72825 | -8.16184 | hot_spring |
| 517a92d8498ee8a7b601273a | Termas Do Peso |  | 42.10630 | -8.28262 | hot_spring |
| 51c1b8fa498ed3ccc1a6189b | Termas de Cabeço de Vide |  | 39.13434 | -7.55536 | hot_spring |
| 5203c38a498e69f182e85d59 | Banhos Publicos - Viagem Medieval |  | 40.92181 | -8.54080 | hot_spring |
| 5308cb49498e4d1e0a2f131e | Monte da pedra |  | 39.37188 | -7.75322 | hot_spring |
| 59b4454df62f2b39fda65343 | Termas Das Caldeiras | Ribeira Grande | 37.81219 | -25.51005 | hot_spring |
| 5f5e65854d7ec276b912878b | Piscinas Naturais Ponta Da Ferraria |  | 37.86063 | -25.85381 | hot_spring |
| ea1535c2ec7a44ade807eaa3 | Centro Termal das Caldas Felgueira | Canas de Senhorim | 40.48592 | -7.86934 | hot_spring |

### Lighthouse — 70 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d9b73d0b2aaa093c5a87082 | Farolins da Barra do Douro | Porto | 41.14479 | -8.67960 | lighthouse |
| 4e27f2662271752a458f45f1 | Farol de Gibalta | Oeiras | 38.70492 | -9.27485 | lighthouse |
| 4e41ec3ed22d38bfd45e2a88 | Lighthouse At The Maia |  | 36.92987 | -25.01777 | lighthouse |
| 4efe5905775bec6b42acc500 | Flamingo do campainhas |  | 40.19010 | -7.48782 | lighthouse |
| 4f40c372e4b0bf54c93d478f | Ponta do Altar | Portimão | 37.10876 | -8.52940 | lighthouse |
| 502671d6e4b0fe42319d7d5a | Farol Do Porto Da Horta |  | 38.53399 | -28.62135 | lighthouse |
| 513a1dc4e4b0bcfbb712ff95 | Moinho Macop |  | 40.30249 | -8.30603 | lighthouse |
| 51efc7a6498e15896089a6ff | Farol da Garça |  | 37.71656 | -25.36947 | lighthouse |
| 528660f5498e020a864d5549 | Kaatjes Coimbraanse Binnenspeeltuin |  | 40.21041 | -8.42980 | lighthouse |
| 54036dfd498ef5279c9e687f | Farol da Barra | Aveiro | 40.62730 | -8.64857 | lighthouse |
| 54280a70498e51a58d6759aa | Farol do cabo de Sines | Sines | 37.95962 | -8.88032 | lighthouse |
| 55a400a1498e1813260ce716 | vila do bispo |  | 37.02609 | -8.95315 | lighthouse |
| 560f0cdc498e27302df119d4 | auditorio dos bombeiros |  | 40.10815 | -8.50120 | lighthouse |
| 5bf1f056ee7120002c9d2c24 | Peniche, Portugal | Peniche | 39.35947 | -9.40852 | lighthouse |
| 65ede69f9ec58320c964bf2b | Farol da Albufeira | Albufeira | 37.08043 | -8.25859 | lighthouse |
| 660958fa4e392121e108aa84 | Farol De Barra Nova |  | 36.96331 | -7.86887 | lighthouse |
| 6688f2424126b22209d7c4fd | Farol do Bugio |  | 38.66033 | -9.29900 | lighthouse |
| 66c60984fd002e4d2a0f606a | Farol da Azeda | Setúbal | 38.53857 | -8.87849 | lighthouse |
| 687a3aa578246123750e403d | Farol, Mohle Exterior Head | Viana do Castelo | 41.67412 | -8.84430 | lighthouse |
| 69d7ca16b802151da1c2d7b7 | Farolim Da Praia Da Rocha | Portimão | 37.10860 | -8.52950 | lighthouse |

### Fountain — 65 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 57262ecf498e1fbd4233a606 | Fonte da Regaleira/Abundância | Sintra | 38.79497 | -9.39563 | historical_landmark |
| 579df582498e2ed387d9d2fe | Largo do Mideiro | Pedronhe | 40.58033 | -8.15337 | historical_landmark |
| 5805da4a38fa60355ddf8f75 | Chafariz do Anjo | Porto | 41.14295 | -8.61104 | historical_landmark |
| 5949527c35dfa71fb980ecca | Fonte da Paderna | Amoreiras-Gare | 37.70551 | -8.43669 | historical_landmark |
| 59a6f43c5d0fea42bfa0b43f | Fonte De Villa Parda | Porto | 41.15772 | -8.60737 | historical_landmark |
| 59b2d26c1499466c7a1d5eb3 | Fonte Da Praia Do Ouro | Porto | 41.14785 | -8.65010 | historical_landmark |
| 5ac5235424962304727e3eb5 | Fountain | Portimao | 37.11948 | -8.55031 | historical_landmark |
| 5b575f4cde3bbf002c0acf07 | 69 Homens de Bessines | Loures | 38.78107 | -9.09496 | historical_landmark |
| 5b72f77d2aff31002cbd08f3 | Fonte Do Fraião | Braga | 41.54160 | -8.39922 | historical_landmark |
| 5cd44454fc9e94002c252ac9 | Lago das Tagides | Лиссабон | 38.76822 | -9.09213 | historical_landmark |
| 5cf106f78a6f17002c05c526 | Fonte Nasada Bonanca | Vila Nova de Gaia | 41.14038 | -8.62430 | historical_landmark |
| 5d5d782db86a70000846d0a4 | Águas Vidago - Fonte 1 | Vidago | 41.63208 | -7.57521 | historical_landmark |
| 5e566dc1aed92c000865324a | Fonta Santa | Guimaraes | 41.43335 | -8.28895 | historical_landmark |
| 60d4bedac7642b53ed5e1909 | Fonte de São Silvestre | Luso | 40.37517 | -8.36225 | historical_landmark |
| 617fd91ab3cb0f1fdb4940e3 | Chafariz | Luso | 40.38369 | -8.37752 | historical_landmark |
| 62c9733223508b6b50043a0b | Fonte dos Pisōes | Синтра | 38.79482 | -9.39326 | historical_landmark |
| 6370b6a84fd70606d64e6060 | Fonte de Santo Elias | Luso | 40.37640 | -8.36078 | historical_landmark |
| 668d29a4bd702914c81bb18e | Fonte Da Rua Cham | פורטו | 41.14433 | -8.60897 | historical_landmark |
| 670f925953c3e425b731edff | Fonte Do Santo Antonio | Manteigas | 40.31706 | -7.57819 | historical_landmark |
| 6a1b0e8abf31c96440c07997 | Fonte de Hulsenbos | Porto | 41.14157 | -8.61847 | historical_landmark |

### Shrine — 63 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4f89889ce4b0e5ed748479ba | Monte Da Virgem |  | 41.11727 | -8.57494 | church, historical_landmark |
| 4f9d15e4e4b0b38d301095ad | Loca Do Cabeço |  | 39.62691 | -8.67028 | church, historical_landmark |
| 501d2680e4b0d8552974a06d | Santuário  N. Sra. dos Milagres |  | 39.14096 | -8.97969 | church, historical_landmark |
| 502028bde4b076c1c5406dba | Nossa Senhora da Piedade | Sanfins Do Douro | 41.29676 | -7.53335 | church, historical_landmark |
| 502bcee4e4b055c33f8ec1a2 | Igreja Nossa Senhora da Saúde | Vila Nova De Gaia | 41.05744 | -8.57528 | church, historical_landmark |
| 50473c89e4b00b4755de6468 | Santuario N.Sra. do Campo | Macedo De Cavaleiros | 41.58898 | -6.95047 | church, historical_landmark |
| 513b291de4b0b36eff9a913e | Santuário de N. Sra. da Graça | Vilar de Ferreiros | 41.41632 | -7.91610 | church, historical_landmark |
| 513f6974e4b0ef433cf373be | Santo Antão Da Barca |  | 41.26023 | -6.88111 | church, historical_landmark |
| 5165789de4b0d5f3137ef219 | Cemitério de Arcozelo | Vila Nova De Gaia | 41.04797 | -8.62765 | church, historical_landmark |
| 5218fdc311d23754228b83bb | Santuario N. Senhora Da Serra | Braganca | 41.71751 | -6.85550 | church, historical_landmark |
| 5245dd3111d274a30d1f211d | Sporting Clube De Parambos |  | 41.24103 | -7.36416 | church, historical_landmark |
| 5332ffea498ecd46c8774bf3 | Santuário do Senhor dos Milagres | Alijó | 41.38436 | -7.54570 | church, historical_landmark |
| 533edfd2498eeda272e08ff5 | santuário de s. bartolomeu |  | 41.65412 | -6.60467 | church, historical_landmark |
| 535a4927498e330b6c9a574f | N. Sra. do Socorro |  | 41.53980 | -8.56352 | church, historical_landmark |
| 53cd13f3498edc8c0e6c7811 | Cabeço de São Pedro | Lodões | 41.31046 | -7.09900 | church, historical_landmark |
| 557bfc35498e7644751e4b4a | Church of Budology | Braga | 41.55679 | -8.41479 | church, historical_landmark |
| 568d2852498edaec22d33940 | Centro Upaya | Lisboa | 38.72644 | -9.17007 | church, historical_landmark |
| 66be7c79effe95003183b4c0 | Virgem Maria | Celeirós | 41.24265 | -7.56747 | church, historical_landmark |
| 683c88abc02943682c5cf325 | Capela de Nossa Senhora do Castelo | Vila Velha de Ródão | 39.64878 | -7.69081 | church, historical_landmark |
| 6a21588e73f25866d550ace1 | Espinhoso | Candedo | 41.82052 | -7.10640 | church, historical_landmark |

### Sculpture Garden — 59 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c686006f984a59325d949f4 | Sand City | Faro | 37.12912 | -8.19895 | historical_landmark |
| 4d6944bd1a88b1f7d9fc285d | Sr. Vinho | Torres Vedras | 39.09312 | -9.25689 | historical_landmark |
| 4de76ff72271b9ccf4dc210b | P. António Barroso | Barcelos | 41.53076 | -8.63176 | historical_landmark |
| 4e50d82bb0fb088f3c2f824b | Pelourinho De S. Tomé | Arcos De Valdevez | 41.88805 | -8.43672 | historical_landmark |
| 4e6e93f8d164e01c45e1c0b9 | Rua Da Fonte Nova | Figueira da Foz | 40.18770 | -8.79235 | historical_landmark |
| 4ec19922a17c8cdeb94b013f | Igreja de São Jacinto | Vales de  Cardigos | 39.73309 | -7.97873 | historical_landmark |
| 4f9d71a5e4b02aa9c0e0db53 | Jardim das Tágides | Lisboa | 38.76952 | -9.09203 | historical_landmark |
| 500c5c7ae4b0fec2ce258b25 | rotunda luis camoes |  | 40.65238 | -7.91527 | historical_landmark |
| 501595cce4b035462a293d1b | Stone Scream |  | 40.77676 | -8.14524 | historical_landmark |
| 502c9779e4b07f4738712099 | Lenda do Lethes (poente) |  | 41.76872 | -8.58791 | historical_landmark |
| 510bd6c9e4b0ce64f601fd4f | Volta do Duche | Sintra | 38.79648 | -9.38810 | historical_landmark |
| 51635043b0ed8063a973433d | Estátua Equestre de D. Sancho II | Elvas | 38.87882 | -7.16612 | historical_landmark |
| 51a0f8b8011cc1886a6bdf1d | Estátua Equestre João Maria Ferreira do Amaral | Lisboa | 38.77117 | -9.12144 | historical_landmark |
| 5281301a11d24f3426e7d2ba | Estátua Touro | Golegã | 39.40710 | -8.47827 | historical_landmark |
| 52d73e43498ec25bb7018246 | Topik Lampulo |  | 38.77107 | -9.12162 | historical_landmark |
| 541c3f08498e98957562b408 | Nao Pisar |  | 38.70060 | -9.17635 | historical_landmark |
| 5da84588a0f6b30008f4598b | Nu Feminino | Sintra | 38.79777 | -9.38872 | historical_landmark |
| 6212633e0cab2872b6e3535c | Campus Internacional De Escultura Contemporânea | Guarda | 40.53514 | -7.27111 | historical_landmark |
| 6415a448ddbcd33f51a5f02c | Estatua do Urso | Sintra | 38.78921 | -9.41959 | historical_landmark |
| 687cdf74a4a48e1eae234dc5 | Jardim do Palácio do Estói | Faro | 37.09502 | -7.89569 | historical_landmark |

### Art Museum — 55 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b0588a3f964a52093d122e3 | Casa-Museu Medeiros e Almeida | Lisbon | 38.72161 | -9.14916 | museum |
| 4c544a3ea724e21e55e425f6 | Casa das Mudas | Calheta | 32.72306 | -17.18052 | art_gallery, museum |
| 4df266a0b0fb807158be5ec3 | Fundação Cupertino Miranda | Vila Nova de Famalicão | 41.40642 | -8.51825 | museum |
| 4e6b788218381ea1be5a5ac8 | Museu Municipal |  | 41.69336 | -8.82858 | museum |
| 4e74bba888775d593da09549 | Museu Etnográfico Dr. Lousã Henriques | Lousã | 40.11217 | -8.24526 | museum |
| 4f7717a2e4b0e0abc405d7bb | Museu dos Biscainhos | Braga | 41.55110 | -8.42951 | museum |
| 4ffd8a09e4b0cb68a2196af2 | Casa Museu Fernando Namora |  | 40.10725 | -8.50540 | museum |
| 523f217e8bbdbe83b4d2a8f0 | Futuro Perfeito / Future Perfect | Lisboa | 38.69583 | -9.19509 | historical_landmark, art_gallery, museum |
| 53135b28498e0d6cc0e51bde | Galeria Municipal Setúbal | Setúbal | 38.52233 | -8.89186 | museum |
| 54060f15498e884a9ad60821 | Museu Irmã Wilson |  | 32.65070 | -16.90322 | museum |
| 57f90d08498e44d87ccdff8f | palacete santiago |  | 41.44315 | -8.29312 | museum |
| 5a7590cbc4df1d3b102cc87b | Fabrica Das Historias | Torres Vedras | 39.09061 | -9.26090 | museum |
| 60e709ff0ef665447299f9a9 | Museu Da Música Filarmónica | Almada | 38.68270 | -9.15833 | music_venue, museum |
| 6363ba68dccc8f088602893c | Salle De D. Manuel | Lisboa | 38.72447 | -9.11413 | museum |
| 6363be82b804683231545ff1 | Coro Da Igreja Madre Deus | Lisboa | 38.72468 | -9.11374 | museum |
| 663fa8981b851d63cada3a8a | Ah Amália | Armazém 15 e 16 | 38.74196 | -9.10238 | museum |
| 69d630a282231a2ae333798c | Núcleo Museológico Das Artes Tradicionais | Ferreira do Alentejo | 38.05791 | -8.11938 | museum |
| 6f025c012062430138666103 | Casa Museu Abel Salazar | São Mamede de Infesta | 41.20389 | -8.61428 | museum |
| 7c3950c907634e0defd9d6d8 | Museu da Música Portuguesa - Casa Verdades de Faria | Monte Estoril | 38.72350 | -9.17685 | museum |
| f9e13aad6b604e72d004af24 | Lugar do Desenho - Fundação Júlio Resende | Gondomar | 41.14245 | -8.54775 | museum |

### Casino — 51 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c515435991c20a18aba9687 | Matrecos G | Lisbon | 38.71873 | -9.14397 | casino |
| 4cb885534352a1cd015386f5 | Bingo Barreirense |  | 38.65624 | -9.06071 | casino |
| 4d1cdc00c17ff04d004aca41 | Bingo Panda | Alameda | 38.74096 | -9.13452 | casino |
| 4d66283ee07aa35d2bd2a58f | Casino | Leiria | 39.74702 | -8.80463 | casino |
| 4d72eba85838a09363bd12db | Bingo Estrela da Amadora |  | 38.75106 | -9.22766 | casino |
| 4d943ee8e923721e93ad67fe | Casa da Sorte | Lisbon | 38.71285 | -9.14046 | casino |
| 4e751b08b0fb9680330daeaf | Poker Space | Penamacor Municipality | 40.11899 | -7.21594 | casino |
| 4e8894b77ee647b428b3c6d3 | Bingo do Benfica |  | 38.74723 | -9.18657 | casino |
| 509c6f0ee4b0bbf7753d2524 | Play CS |  | 40.75278 | -8.57448 | casino |
| 50bfca1de4b0362d001dad39 | casino Da Figueira Da Foz |  | 40.41925 | -7.70278 | casino |
| 50d47192e4b0dfb5bb85ede2 | Pavilhao Portuense(jogos Santa Casa) |  | 41.14608 | -8.60659 | casino |
| 51efec50498e47dccd2e862b | Saint-Tropez Van Portugal | Cascais | 38.69244 | -9.41945 | casino |
| 52770bcc498e0d297e780e1b | Quem quer ser milionario |  | 38.82747 | -9.09410 | casino |
| 531e2afa498e3dd0257199bd | Palheira do Saldanha |  | 40.35785 | -7.07107 | casino |
| 556b1ce7498e7e660782f203 | centro cultural de salir do porto |  | 39.49573 | -9.15155 | casino |
| 56eb291c38fa609a6e232959 | BIRAGA,da |  | 39.39793 | -8.22391 | casino |
| 580cc3dc38fa660272f8f6d7 | ÖZDİLEK AVM | izmir | 39.74792 | -8.80811 | casino |
| 58d05f1f5804ea0e7273d1a7 | Cartel do Norton | Coimbra | 40.19870 | -8.41045 | casino |
| 58e03a0144587f5a08d81d57 | Casino | Ponta Delgada | 37.74164 | -25.65736 | casino |
| 66464396d0783410e19718b6 | Casino Azores | Praia da Vitória | 38.73540 | -27.16025 | casino |

### Temple — 47 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c6406dce1621b8dfb532753 | Basílica de Nossa Senhora dos Mártires | Lisboa | 38.71061 | -9.14142 | church, historical_landmark |
| 4d8a4ec3401a224bca449f18 | Mansao | Braga | 41.55910 | -8.40458 | church, historical_landmark |
| 4dc8497452b1cf5c162a2cc3 | Casa do Alçada | Porto | 41.15589 | -8.61980 | church, historical_landmark |
| 4e0fb3bb22711665f6217dfa | Capela Verdelha | Vila Franca de Xira | 38.88702 | -9.04755 | church, historical_landmark |
| 4e3ec681aeb73139a18aa2d0 | Império da Caridade | Praia da Vitória | 38.73433 | -27.06319 | church, historical_landmark |
| 4e47c95c62e148603b844350 | ADEFE Europa | Arruda dos Vinhos | 38.99384 | -9.08017 | church, historical_landmark |
| 4e84e09b61af660c3b6d8ff8 | Associaçao Hindu do Porto | Vila Nova de Gaia | 41.14425 | -8.63192 | church, historical_landmark |
| 4ef70dc2722e34060efde9d2 | Cemitério de Almargem do Bispo | Sintra | 38.85063 | -9.27258 | church, historical_landmark |
| 4f5b1e44e4b008b15602dfb0 | IASD Alvalade |  | 38.75587 | -9.14346 | church, historical_landmark |
| 4fca9fdbe4b02cfd2d37e71f | Iglesia Bautista de La Capital |  | 38.73310 | -9.13577 | church, historical_landmark |
| 4feec152e4b0ad0d02a2ee38 | Missionários do Espírito Santo | Porto | 41.16250 | -8.64716 | church, historical_landmark |
| 50bccc97e4b0de82eb6deb19 | Lenha do Vitinho |  | 39.76294 | -8.92740 | church, historical_landmark |
| 50e0333ce4b0f2167a53a29b | Capela Da Senhora Da Silva |  | 41.07663 | -8.24837 | church, historical_landmark |
| 523eac4a498edca64a5eccc2 | Mosteiro De Sandim | Sandim | 41.01987 | -8.50780 | church, historical_landmark |
| 530a3037498e86b6d9081233 | Comunidade Palavra Viva | Penafiel | 41.19912 | -8.29150 | church, historical_landmark |
| 556a22e8498e32061bf66e21 | igreja evangélica assembleia de deus |  | 41.80440 | -6.77222 | church, historical_landmark |
| 55da0958498e785b4f9e5b98 | Capela Da Senhora Da Luz |  | 41.18780 | -8.49142 | church, historical_landmark |
| 59a05e9186f4cc3bed9d1ef0 | Templo das Colunas | Sintra | 38.78824 | -9.39138 | historical_landmark, church |
| 639700d5e6a78b0675c99956 | Templo Hindu | Lisboa | 38.76972 | -9.17540 | church, historical_landmark |
| 65ec7e44df8d792645854788 | Tusva | Vila Nova de Gaia | 41.10163 | -8.58969 | church, historical_landmark |

### Palace — 39 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b0588a3f964a52046d122e3 | Palácio da Pena | Sintra | 38.78733 | -9.39042 | historical_landmark |
| 4ca373657f84224b4604c558 | Palace Hotel do Bussaco | Luso | 40.37602 | -8.36466 | historical_landmark |
| 4d986f69744f37046f7fee57 | Quinta da Graciosa | Anadia | 38.71641 | -9.38316 | historical_landmark, church |
| 4e42b8d7aeb73df7d8d74e84 | Quinta da Graciosa | Anadia | 40.45360 | -8.44311 | historical_landmark, church |
| 51d98e9f498e87f089cd89ce | Palacio de Estoi | Faro | 37.09683 | -7.89581 | historical_landmark |
| 53a5ce49498eac9e64218ccd | Igreja S. Veríssimo | Amarante | 41.27002 | -8.08931 | historical_landmark |
| 53b74e82498ecdc1648434e5 | Paço dos Condes de Albuquerque |  | 41.53184 | -8.39850 | historical_landmark |
| 550f17d5498e21161fb95731 | Quinta Do Marquês |  | 39.46404 | -8.52016 | historical_landmark |
| 55b123cf498eb1284583c7f6 | Conte d'été |  | 41.52068 | -8.61567 | historical_landmark |
| 55e5e506498ec2451f36330e | Jardim das Damas do Palácio da Ajuda | Lisboa | 38.70718 | -9.19179 | historical_landmark |
| 577ccfa938fa745172656f2c | Ruca's Palacio De Gato |  | 38.72029 | -9.13205 | historical_landmark |
| 57dda8db498e666bd6c5cc41 | Cesar's Palace |  | 38.83544 | -9.09124 | historical_landmark |
| 57f41104498e13c27898f442 | #ordununkucağı• | Lizbon | 38.70675 | -9.13626 | historical_landmark |
| 596272c25c68383973e949f2 | Sim's Palácio | Lourinhã | 39.26586 | -9.33169 | historical_landmark |
| 59abdd72112c6c22feb10fd0 | Paços Novos Ou Do Castelo | Leiria | 39.74662 | -8.80950 | historical_landmark |
| 6353f4531daf301208d67a2c | Palacio Da Mitro | Lisboa | 38.73966 | -9.10314 | historical_landmark |
| 6457bc635d753f7392ee8391 | Palacio Do Rei Do Lixo | Coina | 38.60071 | -9.04392 | historical_landmark |
| 646dfabf5bde7a06f42f6223 | Mirador Porto D’alho | Abadim | 41.57977 | -7.97119 | historical_landmark |
| 6955482cf9899931456b6d55 | Palacio Dos Ornelas | Funchal | 32.64932 | -16.90897 | historical_landmark |
| 6a26be399201d13c0f410ede | Palace Pinto Leite Casa Do Campo Pequeno | Porto | 41.15151 | -8.62276 | historical_landmark |

### Science Museum — 27 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c6804a77abde21e5e6e6768 | Museu Do Sal |  | 40.10642 | -8.83302 | museum |
| 4d279ea4915fa093fc04f509 | Observatório Astronómico de Santana - Açores | Ribeira Grande | 37.81406 | -25.56861 | museum |
| 4e35362d8877beb5e9a91bc0 | Museum Monte Palace | Funchal | 32.67583 | -16.90100 | museum |
| 4f7c433fe4b0abe223765374 | Exploratório Ciência Viva |  | 40.19699 | -8.42937 | museum |
| 50940d52e4b05f8bb50813b9 | Museu Eléctrico EDP |  | 40.66322 | -7.91232 | museum |
| 51814b61498e6c75e7860ca3 | Centro Ambiental Priolo | Pedreira | 37.80155 | -25.16310 | museum |
| 524b2b7e11d2b1a750255de2 | Centro de Monitorização e Interpretação Ambiental de Vila do Conde |  | 41.34438 | -8.74536 | museum |
| 573b3619498eddadd60730ff | museu de Engenharia Civil |  | 38.73720 | -9.14016 | museum |
| 573b41ff498eddadd629bdd8 | Museu Décio Tadeu |  | 38.73553 | -9.13843 | museum |
| 5751784f38fad91fadc1c013 | Pólo museológico da água Querenca |  | 37.19883 | -7.98766 | museum |
| 58232cc3eb569a2f77797e7c | Observatório do Mar Dos Açores |  | 38.52642 | -28.62762 | museum |
| 5e19be792af59f000853212d | Galeria Da Biodiversidade | Porto | 41.15373 | -8.64257 | museum |
| 5f410c48b2432c403394d047 | Museu de História Natural e da Ciênca | Porto | 41.14639 | -8.61576 | museum |
| 607eb9c45b189d152d0e36b7 | Museu de Historia Natural | Funchal | 32.66246 | -16.89623 | museum |
| 60ef26fcd7a3997c8aa548c8 | Casa dos Vulcões | Lajido | 38.55707 | -28.42671 | museum |
| 612f838bf27870116fa0ee91 | Planet Cork | Vila Nova de Gaia | 41.13506 | -8.61305 | museum |
| 6352519868ad0c10551e2420 | Centro Nacional De Arqueologia Náutica E Subaquática | Lisboa | 38.72700 | -9.11027 | museum |
| 662b984dda4b6e6766761ef9 | Elektrizitätsmuseum | Funchal | 32.64771 | -16.90336 | museum |
| 685841f1284edb206d802379 | Casa das Aves Marinhas dos Açores | Horta | 38.52469 | -28.74674 | museum |
| 6a6c8c2c9dd10d034d418c59 | OMIC Microbial Observatory of the Azores | Povoação | 37.77336 | -25.30322 | museum |

### Tennis Stadium — 27 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c0bd406bbc676b0f0134cd5 | Lisboa Racket Centre | Lisboa | 38.75831 | -9.13460 | stadium |
| 4e44f4d61495455b10d38a3f | PRINCE Tennis Academy @ Sheraton Algarve Pine Cliffs | Albufeira | 37.09139 | -8.16876 | stadium |
| 4e47e434183849317e89f604 | Lawn Tennis Clube da Foz | Porto | 41.15088 | -8.67080 | stadium |
| 4ea19e249a527d6516b3de25 | GDOF - Campos de Ténis | Oliveira de Frades | 40.73765 | -8.17680 | stadium |
| 4ec8dc6b2c5b532d084f34ab | Ténis, Campo R3 |  | 38.70860 | -9.25416 | stadium |
| 4f647caee4b0788a8f40c675 | Corgas Tenis Club | Vila Nova de Gaia | 41.11174 | -8.60608 | stadium |
| 4f9288a8e4b020d1a28f2836 | Complexo de Ténis de Espinho | Espinho | 40.99877 | -8.62667 | stadium |
| 4fc685cde4b05effe8715384 | Lagoa da Pedra - Campo de Ténis |  | 38.72758 | -8.97421 | stadium |
| 4fde7ae8e4b057598be58f99 | ATE Academia de Ténis de Espinho | Espinho | 41.02320 | -8.64096 | stadium |
| 5045c75be4b05c606a8dbe79 | campo tenis Alva |  | 39.66688 | -9.00469 | stadium |
| 50ba0c28e4b07607377995a4 | Campo de Tenis - Vila Beatriz |  | 41.21275 | -8.55681 | stadium |
| 5245a11d11d23b788f2d5c4b | escola tenis de almada |  | 38.67120 | -9.16543 | stadium |
| 525c61fb11d2accc0f743c18 | Clube de Ténis C.C.D.B.A |  | 38.54649 | -9.03243 | stadium |
| 54c41f7a498ed3371d414a66 | Campo Ténis CRI |  | 38.64853 | -9.02148 | stadium |
| 56a3a8ed498ebb9ccb4b42ba | Talent Discover Sports Lda |  | 39.21386 | -8.61759 | stadium |
| 57585f5a498e70af116d1fda | Boa Hora Futebol Club - Ténis |  | 38.70375 | -9.18974 | stadium |
| 595b62ec033693555b86b50f | Clube da Praia | Póvoa de Varzim | 41.38746 | -8.77365 | stadium |
| 6117c9c07519122baa530d2e | Padel Arena Maia | Maia | 41.23861 | -8.69089 | stadium |
| 6255c6c33627837301a36724 | Cit Padel Amoreiras | Lisboa | 38.72596 | -9.16439 | stadium |
| 6307493ea46d5c1a594a353e | Padel Point Ermesinde | Ermesinde | 41.20535 | -8.54928 | stadium |

### Windmill — 19 would insert, sample of 19

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 5c07df8961e53b002c3eff72 | Pe Guerreiros | Lagos | 37.16588 | -8.68508 | historical_landmark |
| 5c2b6e777c891c002d1ad940 | Moinho De Silves | Silves | 37.20301 | -8.43541 | historical_landmark |
| 5db303ed556bfb0008dc255a | Windmill / Moinho De Vento | Albufeira | 37.09199 | -8.25263 | historical_landmark |
| 5f318adcb7a7675fb4da17f8 | Moinho da Encarnação | Lagos | 37.07443 | -8.76813 | historical_landmark |
| 5f453b6df568bf0ea95256be | Moinho das Manadas | Velas | 38.63262 | -28.10271 | historical_landmark |
| 60d1e61cac6f69030fd83df3 | Moinhos de vento - Porto Santo | Порту-Санту | 33.06757 | -16.31758 | historical_landmark |
| 619b807d09597f1041d9e70c | Moinho de vento do Manuel da Rita | Санта-Круш-да-Грасиоза | 39.07150 | -28.05688 | historical_landmark |
| 6313e97a0fa56b5c246e1e03 | Hotel Moinho Das Feteiras | Feteiras | 37.80646 | -25.80234 | historical_landmark |
| 64a6d8e58ea3d662b0375da4 | Moinho Do Cais | Montijo | 38.70368 | -8.97948 | historical_landmark |
| 64cf4e9791797b4c5339aa8f | Moinho de aguiar do sousa | Aguiar de Sousa | 41.12675 | -8.43901 | historical_landmark |
| 64f47bdd0b72ac136bc5db1c | Moinho Do Monte | Monte | 38.49312 | -28.53006 | historical_landmark |
| 657f2b76d6b1050febc777a6 | Moinho Giratório De Madeira Em Salão | Horta | 38.61492 | -28.65952 | historical_landmark |
| 670b8b91252b103e47144145 | Ponta Rasa | São Roque Do Pico | 38.52325 | -28.31084 | historical_landmark |
| 67164822f5356e1399e5f18a | Moinho Das Ribeiras | Lajes Do Pico | 38.40333 | -28.18967 | historical_landmark |
| 67411fe8538dd11049e9d3d5 | Moinho Do Saca | Madalena | 38.53743 | -28.52733 | historical_landmark |
| 677fc99fe6a12a50cbc1bfa3 | Topo de Serra Candeeiros | Arrimal | 39.51220 | -8.88180 | historical_landmark |
| 67e57007cd07035a08c44e45 | Moinho Do Mocho | Lisboa | 38.72901 | -9.20135 | historical_landmark |
| 68ab109e7b349c324ce2dd72 | Moinho De Água | Achada | 37.84454 | -25.26954 | historical_landmark |
| 6a67514550f180481b4b6829 | Moinho De Santa Bárbara | Ponta Delgada | 37.87701 | -25.72410 | historical_landmark |

### Botanical Garden — 17 would insert, sample of 17

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4bd60d759649ce7223d6511d | Quinta Splendida Wellness & Botanical Garden Hotel | Canico | 32.64978 | -16.83780 | botanical_garden |
| 4c1e013bb306c928846166b7 | Jardim Botânico de Coimbra | Coimbra | 40.20479 | -8.42342 | botanical_garden |
| 532f644d498e3577d9b4dc84 | salmadeira | Lisboa | 38.77868 | -9.16496 | botanical_garden |
| 53dcf617498efb390498581b | Quinta Do Mangueiral |  | 37.24029 | -8.36171 | botanical_garden |
| 53fb4478498e8bbd72eba48c | Pólo-ecológico dos Bombeiros Voluntários |  | 40.40065 | -8.12569 | botanical_garden |
| 546b2cee498e769bed632990 | Reserva Botânica de Cambarinho |  | 40.67469 | -8.20433 | botanical_garden |
| 54700d03498e96a8900c0d02 | motoclube dogsland |  | 39.92016 | -7.44475 | botanical_garden |
| 55360a1b498ef72a26605078 | Praça 9 De Abril |  | 41.16900 | -8.61145 | botanical_garden |
| 55cb08af498e7a3a980118e9 | Our beautiful garden |  | 37.10967 | -8.49292 | botanical_garden |
| 5756f7ed498e24587cfe223f | Quevedo Port Wine - Quinta Vale d'Agodinho |  | 41.13911 | -7.35684 | botanical_garden |
| 57839d9ecd1018ed2a503055 | Ribeira do Guilherme |  | 37.83472 | -25.15571 | botanical_garden |
| 58c3e8965804ea5c14522406 | Horto Municipal do Porto |  | 41.15542 | -8.55906 | botanical_garden |
| 5d36b898e5768900072a3730 | A Horta | Arcos de Valdevez | 41.90219 | -8.43299 | botanical_garden |
| 60e5c9e0d336720ed204c667 | Jardim das Plantas Indígenas da Madeira | São Vicente | 32.80370 | -17.04626 | botanical_garden |
| 66ba2c514a9755191a492dac | Jardim Clássico | Coimbra | 40.20587 | -8.42144 | botanical_garden |
| 66ba2cfed47fc334ceb43ed0 | Estufa Tropical | Coimbra | 40.20634 | -8.42174 | botanical_garden |
| 6863fe853d6e8317cc0c8312 | Jardim Da Ponta Da Madrugada | Nordeste | 37.78902 | -25.14632 | botanical_garden |

### Hockey Stadium — 15 would insert, sample of 15

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c94b196f244b1f7fc27241d | Pavilhão Infante Sagres | Porto | 41.16016 | -8.65536 | stadium |
| 4d03ac250e49721e88546c7f | Pavilhão Bernardino Coutinho |  | 41.20907 | -8.14738 | stadium |
| 4d13a7a033ac3704ee1f9856 | Pavilhão do GCOdivelas | Odivelas | 38.78582 | -9.11049 | stadium |
| 4d84902a61676dcb369574e4 | Hóquei Clube de Sintra | Sintra | 38.80457 | -9.38768 | stadium |
| 4dd004e2ae603b786d561dd0 | Biblioteca Instrução e Recreio | Nazaré | 39.58868 | -9.01819 | stadium |
| 4e73915752b145ffbfa0e06f | Pavilhão Municipal Bernardino Coutinho | Marco de Canaveses | 41.19380 | -8.14469 | stadium |
| 4e778462483b0cf5eda8575e | CACO | Lisbon | 38.72723 | -9.17291 | stadium |
| 4eb577a7775b544c274ece65 | Pavilhão Arq. Jerónimo Reis (Ac. Espinho) | Espinho | 41.01374 | -8.63915 | stadium |
| 4f37daf6e4b02a70e1ae9008 | Pavilhao Gimnodesportivo Povo de Boliqueime |  | 37.13003 | -8.15215 | stadium |
| 4f6e387ae4b09e7355613ff9 | Pavilhão do Sport Alenquer e Benfica |  | 39.04615 | -8.94181 | stadium |
| 4f89c832e4b047d84a74c67b | Pavilhão de Desportos da Candelária |  | 38.54606 | -28.64592 | stadium |
| 4fe604c4e4b0b3b9735fdf18 | Pavilhão Municipal de Vale de Cambra |  | 40.84856 | -8.39809 | stadium |
| 4fe60668e4b079b381173efd | Pavilhão Municipal de Vale de Cambra | Vale De Cambra | 40.84308 | -8.39630 | stadium |
| 5059b0b719a9d8a23270d605 | Pavilhão - Hóquei Clube de Fão | Fão | 41.50646 | -8.77454 | stadium |
| 52093eba498e5527b1bce83d | Pavilhão Municipal De Oliveira Do Hospital |  | 40.36191 | -7.85880 | stadium |

### Aquarium — 13 would insert, sample of 13

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 3a5bee010da54f656c25bed9 | Fernando Ribeiro | Barcarena | 38.74144 | -9.27094 | aquarium |
| 4c8d700cf87e224b11d03d05 | Estação Litoral da Aguda | Vila Nova de Gaia | 41.04783 | -8.65342 | aquarium |
| 503ba815e4b0b7277cdd3bb2 | Zoomarine Wonderland |  | 37.12521 | -8.31549 | aquarium |
| 5055076fe4b0c3ed1efe4983 | Rabo do João |  | 40.20965 | -8.42026 | aquarium |
| 514c71f5e4b009f28fd4f635 | Aquário do DETI |  | 40.63308 | -8.65954 | aquarium |
| 5223092611d204132237dcad | viveiro de trutas | Manteigas | 40.38268 | -7.54489 | aquarium |
| 55f1f7af498ea01ebb5069f2 | De Zuiptafel |  | 41.15088 | -8.61640 | aquarium |
| 57a86b89498ebaf1337b001e | val's pool Portugal | Castro Marim | 37.19426 | -7.48275 | aquarium |
| 58bcc8bc0b5656702e52db97 | badkamer 401 |  | 41.17800 | -8.61413 | aquarium |
| 59344615a5a3154fb119c9ea | Aquarium | Sintra | 38.79439 | -9.39568 | aquarium |
| 59c5156c3d479165760d87f2 | Aquario do porto pim | Horta | 38.52259 | -28.62843 | aquarium |
| 5aed99719411f2002c6e10d3 | Eco Arium | Vila Nova de Gaia | 41.13636 | -8.62709 | aquarium |
| 5d2715e42952970023f91848 | WildWatch | Lagoa | 37.12444 | -8.52222 | aquarium, lake |

### Basketball Stadium — 12 would insert, sample of 12

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d554b68e7f1a1cdedaef8a4 | Associação de Educação Física e Desportiva de Torres Vedras | Torres Vedras | 39.08724 | -9.25612 | stadium |
| 4da742fdf7b15dc952f68eb2 | Maria Pia Sport Club | Lisboa | 38.71902 | -9.13050 | stadium |
| 4e3b05de6284d42e3344d7b9 | Pavilhao Desportivo Nossa Senhora De Fatima | Lisboa | 38.74604 | -9.15376 | stadium |
| 4e47d79552b1bac0d988d2f9 | Pavilhão Gimnodesportivo das Meirinhas |  | 39.84104 | -8.70733 | stadium |
| 4e7cde84775b68b1860ae1a3 | Pavilhão Pêro Vaz de Caminha | Porto | 41.17695 | -8.61625 | stadium |
| 4e9b1627be7bc875aabf91e4 | Pavilhão Rui Nabeiro | Campo Maior | 39.01429 | -7.06711 | stadium |
| 4fdc8a6ae4b07b2b867f1ea9 | Pavilhão dos Desportos | Vila Real | 41.29998 | -7.74973 | stadium |
| 523c7c4011d281cb15a19f77 | Pavilhão Rainha D. Leonor |  | 39.40274 | -9.14459 | stadium |
| 588c83d3ecb67e743bdf7a76 | Pavilhão Gimnodesportivo de Albergaria dos Doze |  | 39.79829 | -8.58884 | stadium |
| 5a5e675a1108ba5892b3e4af | Pavilhão Desportivo Do Fontelo | Viseu | 40.65878 | -7.90244 | stadium |
| 5bc73af5492814002c0e10e1 | Sporting Clube Vasco Da Gama | Porto | 41.14455 | -8.60604 | stadium |
| 6370b6a0fe51283a7a47d548 | Pavilhão Do Centro Escolar Da Maia | Maia | 41.23406 | -8.63392 | stadium |

### Monastery — 12 would insert, sample of 12

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b7a8c17f964a520a5302fe3 | Mosteiro dos Jerónimos | Lisboa | 38.69790 | -9.20670 | historical_landmark, church |
| 4c669a69e1da1b8d664f9bc3 | Claustro De Se Velha |  | 40.20919 | -8.42400 | historical_landmark, church |
| 4d21d38db69c6dcb27ad7c95 | Concento da Cartuxa | Évora | 38.58076 | -7.92070 | historical_landmark, church |
| 4d35a0fdc75a6ea8cbd429ae | Igreja do Mosteiro de Santa Maria | Almoster | 39.23974 | -8.79373 | historical_landmark, church |
| 4dfdd7efc65b31579b33110a | Mosteiro de Rendufe | Rendufe | 41.63583 | -8.40548 | historical_landmark, church |
| 5381d0d8498eb7855e8878bf | Mosteiro de São Romão | Castelo da Neiva | 41.63915 | -8.77677 | historical_landmark, church |
| 5862809c6cea3f1bba87d964 | Mosteiro do Sagrado Coração de Jesus |  | 38.71271 | -9.40790 | historical_landmark, church |
| 587d28c48ae3636a095fcb9b | Casa Das Irmas Dominicanas | Fátima | 39.62890 | -8.66870 | historical_landmark, church |
| 5e14cb44a5504400086f956f | Mosteiro De Santa Maria De Belém | Лиссабон | 38.69725 | -9.20585 | historical_landmark, church |
| 60d7607b7cdd1757a585dfbf | Mosteiro Budista Sumedharama | Ericeira | 38.97775 | -9.39057 | historical_landmark, church |
| 63d509a31a5e5d3772620942 | Mosteiro Vilarinho | Vilarinho | 41.35826 | -8.33294 | historical_landmark, church |
| 64634b16a11d8d1b61b58663 | Convento do Sao Francisco | Vila Franca do Campo | 37.71606 | -25.44121 | historical_landmark, church |

### Zoo — 12 would insert, sample of 12

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c94ffe972dd224bc85d9f91 | Centro Hipico |  | 40.22053 | -8.47100 | zoo |
| 4cc45c7a38aaa093957d1262 | Centro Ciência Viva de Estremoz | Estremoz | 38.84296 | -7.58472 | zoo |
| 4d738ee4d976236a4e561679 | Zoo de Lagos | Bensafrim | 37.14506 | -8.76623 | zoo |
| 4f3a9692e4b0a81c4a2856f3 | Rota dos Cetáceos | Funchal | 32.64658 | -16.91228 | zoo |
| 501afdd9e4b039e3ad318061 | Necos Abelho |  | 39.75549 | -8.93232 | zoo |
| 50eb170be4b0f0d9f4eeb721 | Zurich |  | 40.14079 | -7.49889 | zoo |
| 51b2858d498e34b69311b852 | Colmeosa |  | 40.40732 | -8.14935 | zoo |
| 63455fa2a666d567635e9489 | Parque Animais Selvagens | Nazaré | 39.61545 | -9.07862 | zoo |
| 6485b56f318072091b427f1f | Parque ambiental do Bucheiro | Ribeira de Pena | 41.51431 | -7.79449 | zoo |
| 67445aa7509a475b3f0b0aa9 | Ilha das Aves | Ribeira Brava | 32.66404 | -17.03416 | zoo |
| 6958f5cbbd701c42c9450125 | Patudos De Vagos | Santo André de Vagos | 40.50135 | -8.68435 | zoo |
| 7e5bd98b5ff14569b344c246 | Quintinha Divertida | Setúbal | 38.54002 | -9.01251 | zoo |

### Football Stadium — 11 would insert, sample of 11

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c5370f4479fc928057a7591 | Pavilhão do SC Farense | Faro | 37.02354 | -7.92897 | stadium |
| 4cbb4ae04c60a0930d334bca | Grupo Desportivo Beira-Mar Gaiense |  | 38.67281 | -9.00596 | stadium |
| 4de513c0e4cd056f74816d1d | Campos das Camélias | Braga | 41.53899 | -8.42556 | stadium |
| 4e16de65813097715779821b | Polivalente 21 de Março | Santar | 40.57003 | -7.89681 | stadium |
| 4ea2cf848b81a02f89bb5431 | Pavilhão do Grupo Desportivo Almargense | Sintra | 38.84774 | -9.26799 | stadium |
| 52c853ca498e4e63c11a4d7d | Associação Desportiva Serpinense | Lousã | 40.15644 | -8.21245 | stadium |
| 5618dd8a498e89360d8d55e5 | Campo de Futebol Machico (Sintetico) | Machico | 32.72828 | -16.77280 | stadium |
| 5a0715a58194fc6031608983 | Lagos Football Club | Lagos | 37.11669 | -8.67878 | stadium |
| 5c5eaa857d8497002c46f10a | Montelevarenses | Sintra | 38.86109 | -9.32977 | stadium |
| 6625355924ed27210467f7b9 | Parque de Jogos Municipal de Retorta | Azurara | 41.34749 | -8.73137 | stadium |
| 69906e532cb6ca71c5f33f70 | Campo Futebol Ponta Do Sol | Ponta Do Sol | 32.70581 | -17.11755 | stadium |

### Mosque — 10 would insert, sample of 10

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4dac1bbc0cb6a89c628fb7ee | Mesquita de Lisboa | Lisbon | 38.73545 | -9.15813 | mosque |
| 4de229f71f6e3190cd091e9e | Mosteiro de Ferreira | Ferreira | 41.26508 | -8.61102 | mosque |
| 502d5d6045b0b3db9fdd4fe2 | Mesquita Of Gladius | Lisbon | 38.72584 | -9.14898 | mosque |
| 51fce280498e0dcf7e37273c | Igreja matriz / antiga mesquita |  | 37.63813 | -7.66381 | church, mosque |
| 524acc2911d2043805b231ca | Adp Fertilisers |  | 38.88042 | -9.04986 | mosque |
| 52695580498ebd566299a705 | Convento do Mando Escravelho |  | 41.17333 | -8.55635 | mosque |
| 576571f1498e91e5156c96e1 | Mesquita do Laranjeiro - Massjid Al Madinah | Almada | 38.65341 | -9.14899 | mosque |
| 576f25e7498e3df0104e2240 | Central Mosque of Lisbon | Lisboa | 38.73546 | -9.15856 | mosque |
| 6744a241d301725454ca1769 | Mesquita De Ponta Delgada Khadija Al Kubra (Ra) | Ponta Delgada | 37.74585 | -25.66043 | mosque |
| 69962d58a7e849428623cdb5 | Centro Cultural Islâmico Abdurrahman Bin Auf | Famões | 38.79818 | -9.19845 | mosque |

### Track Stadium — 5 would insert, sample of 5

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d68e437b6f46dcb30351ab2 | Pista de Atletismo da Sobreda | Almada | 38.64603 | -9.17548 | stadium |
| 4e92ece24901733aacd1134d | Pista de Atletismo Gémeos Castro | Guimarães | 41.43016 | -8.32184 | stadium |
| 4ea9accb77c850207e774a9c | 25a Baja Portalegre | Portalegre | 39.27308 | -7.42197 | stadium |
| 530a7bd711d28fff6a5226b6 | Pista Professor Moniz Pereira |  | 39.74352 | -8.80763 | stadium |
| 536faf07498e6c1fe2e12b52 | centro de lançamentos de cerveira |  | 41.95533 | -8.74425 | stadium |

### Synagogue — 4 would insert, sample of 4

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4bd71a675631c9b632f4a630 | Sinagoga, Museu Hebraico Abraham Zacuto | Tomar | 39.60327 | -8.41375 | synagogue |
| 4e46d155d22d12b08bc6f36f | Seminário Diocesano de Monção | Monção | 42.07474 | -8.47979 | synagogue |
| 4e4d2189d4c083e964928bff | Sinagoga | Castelo de Vide | 39.41754 | -7.45673 | synagogue |
| 55b76a3c498e67e9c038444a | Ebreju Anekdošu Līkums |  | 39.83104 | -7.78876 | synagogue |

### Baseball Stadium — 3 would insert, sample of 3

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4e8ccbacf790e886adbf718f | Baseball Caldas |  | 39.39423 | -9.13863 | stadium |
| 5a1c24f004d1ae4e6b3ab50a | Beisebol Sac | Frielas | 38.80716 | -9.15888 | stadium |
| 69027e5327e5d45d6018f011 | Porto Baseball Stadium |  | 41.14460 | -8.62574 | stadium |

### Rugby Stadium — 2 would insert, sample of 2

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 588cc27f45005e04ea07319d | EPC - Rugby Clube de Santarém | SANTARÉM | 39.24309 | -8.68353 | stadium |
| 67c444789bf7370400470ccb | Campo Municipal Do Outeiro | Porto | 41.17574 | -8.59250 | stadium |

### Ruin — 2 would insert, sample of 2

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 6a259faf4e34c81c52d8371a | Ruinas Das Termas Da Ladeira Da Velha | Porto Formoso | 37.82301 | -25.45740 | historical_landmark |
| 6a468111c4b29d7a6247c046 | Castelo da Rocha Negra | Horta | 38.63727 | -28.70282 | historical_landmark |

### Erotic Museum — 1 would insert, sample of 1

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 59fec1be603d2a17c4bd19c6 | Redtube Industries | Oliveira do Douro | 41.13446 | -8.58237 | museum |

### Tower — 1 would insert, sample of 1

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 6a731e275ff5977f0e16860e | Puerta Do Sol | Bragança | 41.80339 | -6.74844 | historical_landmark |

## Samples of skipped rows, per reason

### noise leaf — 12,693, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4c4eaa91db2c20a1889bc374 | PSD | Lisbon | Structure | Structure (noise) |
| 4d4d49589ee137043cbb818b | Albarraque | Sintra | City | City (noise) |
| 4de2557fd164df8574f7e179 | Silveiras |  | Other Great Outdoors | Other Great Outdoors (noise) |
| 4e3473dab61cddd1cd32d297 | Felgueiras | Felgueiras | City | City (noise) |
| 4ec51d250e617a27f9fa01c3 | Residências Da Ria | Aveiro | Structure | Structure (noise) |
| 4ee6985c99119449030e2800 | Vilar | Vila do Conde | Neighborhood | Neighborhood (noise) |
| 4f495058e4b0e4755dd94e4f | Atalaia |  | Field | Field (noise) |
| 502166f2e4b06cf841dd440c | Cascata de Pincães |  | Other Great Outdoors | Other Great Outdoors (noise) |
| 50314276e4b06a779f08721b | Pardielas |  | Field | Field (noise) |
| 5093130d498e4ddf66d94217 | Porto Mourisco |  | Other Great Outdoors | Other Great Outdoors (noise) |
| 518032bbe4b0b70c4dd07c1e | Gatões |  | City | City (noise) |
| 522cc9cc498ea7a6c5ae9741 | Quinta da Subserra |  | Farm | Farm (noise) |
| 524205d3498e85eda278fa4d | Sede de Campanha PSD Celorico de Basto |  | Structure | Structure (noise) |
| 52bb305711d29d418c1577b0 | Penalva de Alva |  | City | City (noise) |
| 537f442a498ee28323b29f2d | Além Rio | Além Rio | City | City (noise) |
| 54e4bc33498e80dff1b6bf55 | 3D Lab |  | Structure | Structure (noise) |
| 59b50f0a23a2e6344a5de1f1 | Calvário | Castro Daire | Other Great Outdoors | Other Great Outdoors (noise) |
| 5b66f64a180b9100390966de | Cascata | Nordeste | Other Great Outdoors | Other Great Outdoors (noise) |
| 5b77f72b791871002c6f211a | Vila Cova | Penafiel | Town | Town (noise) |
| 6395a7ff62eea4411ac06fd5 | Vilar do Senhor | Lavra | Neighborhood | Neighborhood (noise) |

### parent-only leaf — 2,726, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 0f37459db0a54a9884d40fbc | Experimenta Natura - Turismo de Natureza e Desportos de Aventura | Setúbal | Landmarks and Outdoors | Landmarks and Outdoors (parent) |
| 4431c680775847f888653094 | Dr.Why Portugal | Coimbrã | Arts and Entertainment | Arts and Entertainment (parent) |
| 47b08e055350464f210c129b | Lua Azul - Comércio de Arte e Produtos Similares | São Brás de Alportel | Arts and Entertainment | Arts and Entertainment (parent) |
| 4d68fed0de28224b00343dbe | Grupo Desportivo Adicense | Lisboa | Arts and Entertainment | Arts and Entertainment (parent) |
| 4dd6a38afa76ad96d110c57a | Alto das Vinhas | Sesimbra | Landmarks and Outdoors | Landmarks and Outdoors (parent) |
| 4dee67cc7d8bb216743b2d7c | Clube Recreativo do Feijó | Almada | Arts and Entertainment | Arts and Entertainment (parent) |
| 4e220485e4cdf685918bd123 | Sede do Grupo Folclórico de Santa Cristina do Couto | Santo Tirso | Arts and Entertainment | Arts and Entertainment (parent) |
| 4e585f46185089806c626bf2 | Casa do Futebol Clube do Porto de Caminha | Caminha | Arts and Entertainment | Arts and Entertainment (parent) |
| 4ed0012c30f81894addc60cb | Sociedade de Beneficência e Recreio 1º de Janeiro | Marinha Grande | Arts and Entertainment | Arts and Entertainment (parent) |
| 4ee3e980991194490093e32e | Ribeirinha |  | Arts and Entertainment | Arts and Entertainment (parent) |
| 4f5527e2e4b0bf6b602fb51b | Avenida 25 De Abril | Horta | Arts and Entertainment | Arts and Entertainment (parent) |
| 5030c3a8e4b06a779ec236c2 | Rua Candido dos Reis |  | Arts and Entertainment | Arts and Entertainment (parent) |
| 504f73e0e4b0eb5d2025f387 | jestKultura Porto HQ | Porto | Arts and Entertainment | Arts and Entertainment (parent) |
| 50d79775e4b028bbd84d544a | Rua da Barroca | Lisbon | Arts and Entertainment | Arts and Entertainment (parent) |
| 5203a608498ec44e134ec56a | CSPSPSJE |  | Spiritual Center | Spiritual Center (parent) |
| 535c2e6511d27368aff0bf43 | Pavilhão Multiusos de Belmonte |  | Arts and Entertainment | Arts and Entertainment (parent) |
| 5394a6c2498e6a4f58968c6e | mercado medieval de Vila Franca de Xira | Vila Franca de Xira | Arts and Entertainment | Arts and Entertainment (parent) |
| 54f218aa498e5d065385311b | Centro Bíblico de Esmoriz | Esmoriz | Spiritual Center | Spiritual Center (parent) |
| 64c35a65d8eec2728c89c3b7 | Cepac | Lisboa | Spiritual Center | Spiritual Center (parent) |
| a05010ab0934434ffa7bbcef | Pego Amarelo Doces&Horticolas | Aljezur | Landmarks and Outdoors | Landmarks and Outdoors (parent) |

### tier 2 leaf — 6,983, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4c5dec4f857ca5933066cecb | Praia do Furadouro | Ovar | Beach | Beach (tier2) |
| 4d2ce7cffeaaa1cd2802e490 | Largo das Belas Artes | Lisboa | Plaza | Plaza (tier2) |
| 4dbd86030437955ec04e3c8e | Parque Infantil Antuã | Estarreja | Playground | Playground (tier2) |
| 4e0502231495e0c5a5d2df0c | Febres | Cantanhede | Plaza | Plaza (tier2) |
| 4e49370ae4cd9d94fb452b40 | Parque Infantil Quinta da Rana | Cascais | Playground | Playground (tier2) |
| 4e4fc436a80997aa8a3d0401 | Praia da Boca Mar | Vila Nova de Gaia | Beach | Beach (tier2) |
| 4e8a0b6461af167722e27167 | Largo do Calhariz | Lisboa | Plaza | Plaza (tier2) |
| 4f9c09f1e4b0edc561183ad2 | Miradouro |  | Scenic Lookout | Scenic Lookout (tier2) |
| 4fc0b74ce4b07a4edd30f387 | Sundeck Altis Prime Hotel | Lisboa | Roof Deck, Scenic Lookout | Roof Deck (unmapped), Scenic Lookout (tier2) |
| 501bc9b5e4b03f362b6a1bab | Jardim Lionesa |  | Garden | Garden (tier2) |
| 514eec80e4b02f9b02c5d0fb | Vg 22 |  | Scenic Lookout | Scenic Lookout (tier2) |
| 5220cb9511d2113fc43917d4 | Ilha da Culatra | Olhão | Island | Island (tier2) |
| 5234347b11d25a1cb037596e | Parque Infantil Pedrouços | Porto | Playground | Playground (tier2) |
| 53244a61498e520c32ca8a4e | praça do bom sucesso |  | Plaza | Plaza (tier2) |
| 569d693f498e196673a5bc65 | Largo das Freiras | Ribeira Grande | Garden | Garden (tier2) |
| 58f200cf35f98318045ae429 | Rocas | Terras de Bouro | Scenic Lookout | Scenic Lookout (tier2) |
| 5d6d4c00018170000882e504 | Miradouro Da Caveira |  | Scenic Lookout | Scenic Lookout (tier2) |
| 5e2dc0df183f320008e21e79 | Parque Phive, Quinta Das Lágrimas | Coimbra | Park | Park (tier2) |
| 5e42eba07fd051000810c3a1 | Praça 5 de Outubro | Paço de Arcos | Plaza | Plaza (tier2) |
| 664c96c53029eb6998430266 | Aldeia Vinhateira De Provese De | Provesende | Scenic Lookout | Scenic Lookout (tier2) |

### unmapped leaf — 3,081, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4d4da206d6f3224be6699ea6 | Play Bowling Cascais | Murches | Bowling Alley | Bowling Alley (unmapped) |
| 4e00e76c1838cb6a1acc407d | Praça Alvisse Cadamosto | Lisboa | Dog Park | Dog Park (unmapped) |
| 4ec504adf5b9b3183fe3fe08 | Academia de Equitação Nuno Velloso | Cascais | Stable | Stable (unmapped) |
| 4f4946e4e4b0291e494f7cb2 | Santos Dog Run |  | Dog Park | Dog Park (unmapped) |
| 50197a63e4b01f45cc07edca | nykron |  | Gaming Cafe | Gaming Cafe (unmapped) |
| 503efbbee4b04f36354c05af | Salao de jogos new york |  | Pool Hall | Pool Hall (unmapped) |
| 50e79b74e4b05532364b37b5 | Auditorio da A.C.R |  | Performing Arts Venue | Performing Arts Venue (unmapped) |
| 525f207411d28dfd3d4457e5 | Academia Bilhar de Perosinho |  | Pool Hall | Pool Hall (unmapped) |
| 52b3a17b498ee845985af103 | Lui's Spa Resort |  | Comedy Club | Comedy Club (unmapped) |
| 53777cdb498ef4af739cc418 | Trofeu Urban Cup Vila de Lordelo |  | Street Art | Street Art (unmapped) |
| 55b35a07498ec2cf9f609c29 | parque Benficanino | Lisboa | Dog Park | Dog Park (unmapped) |
| 57bd929b498ef86a2eed7634 | Clubhous Núcleo De Maceira De Cambra |  | Country Dance Club | Country Dance Club (unmapped) |
| 58012a5338fa42d68a9d8196 | Capela da Misericórdia | Samora Correia | Prayer Room | Prayer Room (unmapped) |
| 58cda16eaf7d175e60ff77e9 | parque municipal de exposições |  | Exhibit | Exhibit (unmapped) |
| 5d68fd1396a6fd00084fcfc6 | Vhils & Shepard Fairey Mural | Lisbon | Street Art | Street Art (unmapped) |
| 623880a03d139866775fa6e0 | Art Corridor Lionesa | Leça do Balio | Street Art | Street Art (unmapped) |
| 667af06ef745425e6c7a7dfd | Monumento A Antônio Nobre |  | Outdoor Sculpture | Outdoor Sculpture (unmapped) |
| 672f34756c1a47330162aa91 | Cantinho Da Brincadeira | Almancil | Arcade | Arcade (unmapped) |
| 6735d8668e8d9036e9a56571 | Questroom Évora | Évora | Escape Room | Escape Room (unmapped) |
| 692195fef5c6ab43b2467f32 | Parque Infantil Grito Do Povo | Setúbal | Urban Park | Urban Park (unmapped) |

### empty name — 33, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4ec6483a49010f98cb0ae6f1 | Ботанический сад |  | Historic and Protected Site |  |
| 4f16d60ee4b019e99680e4d8 | جامع الهدى بحي الهدا |  | Mosque |  |
| 4ff8ad2ce4b0887e5555c4a0 | Ппц |  | Harbor or Marina |  |
| 4ff8aecae4b04f7678834261 | Арт Фак Йу |  | River |  |
| 5001ad27e4b0cad5168fc065 | Русская православная церковь всех святых в Португалии |  | Church |  |
| 5064618fe4b0b0ae35ceaad8 | Приморская | Porto | Harbor or Marina |  |
| 5159b0e4e4b020def6a40b9e | На Пляже |  | Surf Spot |  |
| 518be973498e7ebec3d58647 | Где-то на берегу океана |  | Hot Spring |  |
| 51ab0a2c498ec0f9f9902ba6 | Пасть Дьявола |  | Historic and Protected Site |  |
| 51cdfefb498e45e344a64dd2 | Набережная |  | Harbor or Marina |  |
| 51dd3d3c498ec8f2d835ab6a | Маяк |  | Lighthouse |  |
| 520103ee498ee0771755de46 | モラエスの生家 |  | Historic and Protected Site |  |
| 5363b612498ee44e63f3361f | пампасы! |  | Campground |  |
| 53680094498e667ce90100a0 | Город Назаре |  | Surf Spot |  |
| 536949d0498e137a41605ee9 | Замок Тамплиеров |  | Castle |  |
| 53c04e9b498e7a78c3115f25 | трахтенберг |  | Night Club |  |
| 540256cf498e9797088fca32 | рай |  | Campground |  |
| 540d659c498e7fb9023339d6 | Дом Принца |  | Historic and Protected Site |  |
| 5d299d691ce7180023f2d659 | 波立つ海の中に光る満月 | Évora | Monument |  |
| 68623b6e9b2eb1536b6426ef | Ранок-Маркізок | São Gonçalo | Mountain |  |

### matched — 4,728, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 33b50b7cbd7b433fce8ac861 | Assembleia de Deus - Comunidade Cristã Serra da Estrela | Seia | Church | overture:7e3a8259-d370-4208-80a1-1a67fc86ad68 "Comunidade Cristã Serra da Estrela" (church) at 41 m, sim 0.90 |
| 4bf7e4af5efe2d7f16a96934 | Badoca Safari Park | Vila Nova de Stº André | Park, Zoo | overture:0e2b3245-352f-43f4-a838-c552e52574d3 "Badoca Safari Park" (zoo) at 28 m, sim 1.00 |
| 4c03db4d39d476b0699e30a7 | Pico do Areeiro | Santana | Mountain, Scenic Lookout | overture:8242247d-d7c3-4e27-90b3-f334c643b2d2 "Pico do Arieiro" (mountain) at 22 m, sim 0.93 |
| 4ccda2ef566aa093e0de28fd | Paço dos Duques de Bragança | Guimarães | Historic and Protected Site, History Museum, Monument | overture:5c9527e0-54cc-4fb9-bd32-2bcd0438d52a "Paço dos Duques" (historical_landmark) at 55 m, sim 0.90 |
| 4d498c4b7d36f04de4f312e5 | Museu do Brinquedo | Funchal | Museum | overture:12f7dd89-cc8d-488e-8f14-c49c529833a9 "Museu do Brinquedo" (museum) at 5 m, sim 1.00 |
| 4d7f99699df3f04d6ffdd894 | Instituto Bíblico Português | Loures | Church | overture:05632fe8-9725-4707-a16e-8cbd90d1e971 "Instituto Bíblico Português" (school) at 19 m, sim 1.00 |
| 4db2178a5da30ffdfd1a8e9f | Estúdio 22 | Braga | Music Venue | overture:759ff726-e387-4506-b91c-440a186e44f3 "Estúdio 22" (cafe) at 20 m, sim 1.00 |
| 4dfb9905ae60c9cdd38a64a8 | Teatro Gil Vicente | Cascais | Theater | overture:ae7d8aef-7daa-41b5-9faf-029ac1d47d13 "Teatro Gil Vicente" (theatre) at 8 m, sim 1.00 |
| 4e209331ae6015b2129cd6e3 | Camping Orbitur Évora | Évora | Campground | overture:6cd52960-3041-4f05-bcc5-a1e846ec1b3e "Camping Orbitur Evora" (rv_park) at 46 m, sim 1.00 |
| 4ea33a4bd3e32e686854fb40 | Igreja do Calvário | Montemor-o-Novo | Monument | overture:73dd480d-a591-4292-adf7-99f512e7873e "Igreja do Calvário" (church) at 8 m, sim 1.00 |
| 4ec7d87a2c5b532d0712d4fc | Sociedade Filarmónica Monfortense | Monforte | Historic and Protected Site | overture:578d817f-8c4a-46cf-8ddc-9b022ca90899 "Sociedade Filarmónica Monfortense" (bar) at 9 m, sim 1.00 |
| 4f500c35e4b04976c89fba70 | Auditório | Porto | Night Club | overture:c99e382b-a8ff-4606-9e2d-2b17a2eb09d1 "Auditório" (bar) at 3 m, sim 1.00 |
| 50cc92cbe4b06f07d562b987 | Campo Da Restinga |  | Stadium | overture:06e15a85-63b2-4c1c-a103-4b11ddbf2d7d "Campo da Restinga" (stadium) at 5 m, sim 1.00 |
| 511ec4a8ebca4e0b5dea0827 | Igreja Matriz de Nossa Senhora do Rosário | Olhão | Church | overture:4dbe7731-3330-4966-83ca-e8ac4dc2e970 "Igreja Matriz de Nossa Senhora do Rosario" (church) at 20 m, sim 1.00 |
| 51fa70c5498e840a1ef24335 | Ponte Nova |  | Bridge | overture:1a46aa85-0e91-4eec-8cc4-ccbe1f89454e "Ponte Nova" (bridge) at 2 m, sim 1.00 |
| 531dac1a498ef97ee53449b9 | Igreja Santa Mª dos Olivais |  | Church | overture:dce43a41-7e36-4466-8d3a-88c97c5897c3 "Igreja de Santa Maria dos Olivais" (church) at 67 m, sim 0.88 |
| 56ca27a8498e0e3b471f5909 | Pelourinho |  | Historic and Protected Site | overture:69774fd5-50b9-4326-b5d6-e05d8c0ad956 "Pelourinho de Pedrógão Pequeno" (historical_landmark) at 36 m, sim 0.90 |
| 5d59d222158d140008bda497 | Albufissa |  | Night Club | overture:35b4c314-837c-407c-9f05-929586e6c930 "Albufissa" (bar) at 11 m, sim 1.00 |
| 5f3beda25ff75d0c3ab4438d | Arte Na Leira | Arga de Baixo | Art Gallery | overture:4794026f-a91f-409c-904e-4d51dc236e4b "Arte Na Leira" (cultural_center) at 18 m, sim 1.00 |
| 64a1e399780d075d4350bb4a | Super Bock Arena | Porto | Concert Hall | overture:ae62b69c-d0e3-4a7b-87cf-9ee7625b98dd "Super Bock Arena" (music_venue) at 30 m, sim 1.00 |

### weak name — 118, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4c5c177d94fd0f474794c745 | Ribeira d'Ilhas | Ericeira (Mafra) | Beach, Surf Spot | type words only |
| 4cfe46d9feec6dcb17f95636 | Ponte Velha | Portimão | Bridge | type words only |
| 4df2c8367d8b18e1722ce9a6 | Ponto G | Guarda | Night Club | type words only |
| 4e04db4d22715b81047623e7 | Ribeira |  | Historic and Protected Site | type words only |
| 4e55561d52b1f848a9a05a2b | Ponte Nova | Arcos De Valdevez | Bridge | type words only |
| 4e70ebe1b0fba1302a687d7b | Piscina | Peniche | Water Park | type words only |
| 4e98dfc2f79022d7ec421e76 | 112 | Lisboa | Night Club | type words only |
| 4f86e947e4b0af4fd06afcc7 | O Castelo |  | Historic and Protected Site | type words only |
| 4f88d437e4b0298189b3f1e4 | Ferreira-a-Nova | Ferreira-a-Nova | Historic and Protected Site | locality only |
| 4fd2a312e4b0b3abb2f33537 | N.b |  | Night Club | type words only |
| 50e1c65be4b00e617d12f3d1 | Viaduto | Entroncamento | Bridge | type words only |
| 51ded139498e304400b1f86b | Levada Velha |  | Canal, Hiking Trail | type words only |
| 51f30ae5498e17625abd6e8b | Bar O Castelo |  | Night Club | type words only |
| 522620b811d292ad0fd2fbe8 | Nossa Senhora do Castelo |  | Shrine | type words only |
| 5388cb40498ebf7270127f58 | Alentejo | Alentejo | Monument | locality only |
| 55cb4902498e3dfea23e3cdd | Praia | Portekiz | Aquarium | type words only |
| 586932564988da05ed784d39 | O PORTO | Oporto | Movie Theater | type words only |
| 587f8b2b117420115cf23f0d | Ponte Velha | Peniche | Bridge | type words only |
| 60ce5929bd0eee4f6dcc7c38 | Levada Nova | Ponta do Sol | Waterfall | type words only |
| 6a1575489fbcc8642ac246f7 | Doca | Fão | Harbor or Marina | type words only |

### suspect — 983, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4bbc950ee436ef3bd8af5664 | Farol do Penedo da Saudade | São Pedro de Moel | Lighthouse | same name 177 m from overture:8e28eb4d-0276-4ca7-9c8b-d28d860139c6 "Farol Penedo da Saudade" (lighthouse) |
| 4c6828def984a593071a49f4 | Palácio da Quinta da Piedade | Póvoa de Santa Iria | Historic and Protected Site, Other Great Outdoors, Park | same name 349 m from overture:c3853299-b225-499e-b9b2-7b714430bb89 "Palácio da Quinta da Piedade" (park) |
| 4d442569bf61a1cdad8305ac | História e Arte | Bragança | Art Gallery | same name 396 m from overture:6c2cd7e6-9a35-4381-b7d0-79943f44f486 "História e Arte" (art_gallery) |
| 4e0f3667b0fb59de67ddeba3 | Igreja dos Capuchinhos | Oporto | Church | same name 277 m from overture:66052525-4555-40c8-ac02-0d2965b0e54c "Igreja dos Capuchinhos no Porto" (church) |
| 4e18bed0d1648b834835e5d9 | ZD Disco Club | São Brás de Alportel | Night Club | same name 104 m from overture:f7c93a61-0781-4de1-9722-a26eab29b304 "ZD Disco Club" (night_club) |
| 4e4955bdaeb7de71b38911d3 | Capela de São Pedro de Varais | Caminha | Church | same name 78 m from overture:c0280d42-cb4e-47cc-95a5-7f855fd4faca "Capela De São Pedro De Varais" (church) |
| 4f087ccae4b0596c8eb357d8 | FACE - Museu de Espinho | Espinho | Museum | same name 216 m from overture:62ba55d0-d010-4976-b9a0-d1842d0b3558 "Espinho" (beach) |
| 4f5796296d8683efc180f174 | Muralhas da Cidade de Guimarães | Guimarães | Historic and Protected Site | same name 391 m from overture:3e0f78a5-98b6-4318-8600-ab9c77ca537f "Guimarães" (store) |
| 500d3504e4b0c2a4e1125c3f | Igreja de Jesus Cristo dos Santos dos Últimos Dias |  | Church | same name 214 m from overture:fe5600f1-a648-426f-af7f-56238d3835af "A Igreja de Jesus Cristo dos Santos dos Ultimos Dias" (church) |
| 507eac73e4b08ec3d158b9af | Milheiros de Poiares |  | Historic and Protected Site, Other Great Outdoors | same name 227 m from overture:823ee7dc-a64a-4017-b003-2ea5d5e7c887 "Escola Basica dos 2.º e 3.º Ciclos de Milheiros de Poiares" (school) |
| 509f1da5e4b01b9e4a07131d | Quilate Fashion Privé Lamego | Lamego | Night Club | same name 368 m from overture:e9a79460-40ac-4c3f-9688-e6169c7dea3c "Lamego" (store) |
| 51027512e4b09e608bb0b24f | Moinho de Maré de Corroios | Corroios | Historic and Protected Site | same name 207 m from overture:eb7456b5-6621-4fa6-a702-eb30a2b7509c "Moinho de Maré" (historical_landmark) |
| 51e07177498e834f49dd3ff7 | Gil Eannes |  | History Museum | same name 139 m from overture:cf21ff00-134f-4497-b510-cf340a3ada35 "Navio Hospital Gil Eannes" (museum) |
| 5298bc4b11d2751d68132b2b | Barragem De Veiros | Estremoz | Lake | same name 91 m from overture:f54a104e-cddd-4cc0-922f-e076f8f1b00b "Barragem de Veiros" (lake) |
| 5479faaa498ef3265fc9f0ba | Sociedade Filarmónica Boa União Montelavarense |  | Music Venue | same name 210 m from overture:4184782f-2313-4926-a939-f799dda3816d "Sociedade Filarmónica Boa União Montelavarense" (cultural_center) |
| 55215867498e60974dcb6b01 | Feira Medieval Figueira Da Foz |  | Public Art | same name 180 m from overture:3cb7c0e1-998d-4d7c-a16f-aff8ac5b8915 "Figueira da Foz" (beach) |
| 5d1fb35ae022ca00232cc41a | Quinta Do Castanheiro | Castanheira de Pêra | Campground | same name 138 m from overture:de4e8d1b-3507-4237-9789-10c0420b3cbe "Quinta do Castanheiro" (campground) |
| 6722233239d60e3f60e41e2c | Capela De São Martinho | Óbidos | Church | same name 92 m from overture:4131a319-f9d7-4cb4-86ad-905f5b3fc2bd "Capela de São Martinho" (church) |
| a85f49908911471cbd1b3ea9 | Parque Verde | Seixal | Campground | same name 126 m from overture:8f891960-a2f9-4dc7-a88a-ceedea336978 "Parque Verde" (campground) |
| ae9d882e02a545191561993c | Museu do Papel Terras de Santa Maria | Paços de Brandão | Museum | same name 176 m from overture:627776cc-1db7-49cd-bb56-8e44a6db6795 "Museu do Papel" (museum) |

### in-batch duplicate — 100, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4e91d0786da174e28ec63adf | Quinta da Graciosa | Anadia | Palace | same place as fsq:4e42b8d7aeb73df7d8d74e84 |
| 51c63d1c498efa7851ee5d29 | +1 club |  | Night Club | same place as fsq:4ef23b22e5e8d8d3dcdfa6aa |
| 52511d4911d2cc0d59fec7f7 | Fundação Medeiros e Almeida | Lisboa | Art Museum | same place as fsq:4b0588a3f964a52093d122e3 |
| 53de9c69498e2c1488d87636 | Anta de São Gens | Alpalhão | Monument | same place as fsq:4f0f2d2be4b09cff018e07f7 |
| 549fdbb8498ed7b6f8665e91 | Igreja Matriz De Buarcos |  | Historic and Protected Site | same place as fsq:4fdc80c3e4b049c33b5203e9 |
| 56373b66498e7a7653f986d2 | Bombino \| Estação Vodafone FM / Estação Ferroviária do Rossio (Joaquim Quadros) | Lisboa | Concert Hall | same place as fsq:56373a52498e53f520e02f83 |
| 56373bb4498e5885a99c2a90 | The Parrots - Ateneu Comercial de Lisboa (Joaquim Quadros) | Lisboa | Concert Hall | same place as fsq:56373ad9498ece7bc87ed8e4 |
| 57783729498ebddf8d988f46 | Vakantiebedje |  | Night Club | same place as fsq:5776dacc498e61cc05d2666f |
| 5a1a0329ad178924239c8e63 | Mombassa | Elvas | Night Club | same place as fsq:5a1a02e9a4ba7c160b934979 |
| 5a8b6961b5461859995e18d8 | Sala 14 | Vila Nova de Gaia | Movie Theater | same place as fsq:55061c24498e847a3e6f4a25 |
| 5bbbbcb7ea1e4400392456e4 | Sala 20 | Vila Nova de Gaia | Movie Theater | same place as fsq:55061c24498e847a3e6f4a25 |
| 5e336593d6a1a800077d9c40 | Sala 8 | Vila Nova de Gaia | Movie Theater | same place as fsq:572e4a6d498ed257154853bb |
| 645000062e96003256eeae1e | cascata do penedo furado | Vila de Rei | Waterfall | same place as fsq:644fff900305367f9585d6da |
| 645d101e1369973bfb7823e7 | Igreja De Santa Maria Da Graça, Sé De Setúbal | Setúbal | Church | same place as fsq:645d0d251369973bfb7802da |
| 645d35551369973bfb78a420 | Igreja De Santa Maria Da Graça, Sé De Setúbal |  | Church | same place as fsq:645d0d251369973bfb7802da |
| 66104658397c07411c3df317 | RCP - Reformed Church In Portugal | Matosinhos | Church | same place as fsq:5bf6e786cb3fd2002b62842c |
| 673f670273d9994cd417c37e | Fonte do Parque da Paz | Almada | Fountain, Lake | same place as fsq:673f670223b2cd5fb8adfea8 |
| 6908dd618eaf970c8bbc622f | Convento E Capela Santa Clara | Amarante | Historic and Protected Site | same place as fsq:5991e320112c6c6640c671c4 |
| 69b6ce5d64046d6ca0e7b3ef | Ruínas do Teatro Romano | Lisboa | Historic and Protected Site | same place as fsq:4be6ff912468c928a8f00143 |
| 6a48b90615d07a2f272c91dd | Vasco Da Gama | Angra do Heroísmo | Historic and Protected Site | same place as fsq:6a48b8e4ff81ba6596227552 |
