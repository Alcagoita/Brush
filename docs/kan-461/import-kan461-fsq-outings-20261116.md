# KAN-433 — Foursquare tourism import, PT, Tier 1 — EMITTED

Run `kan461-fsq-outings-20261116`, generated 2026-11-16T01:17Z by `cloudflare/extraction/import_foursquare_tourism.py`. Emitted: 3,702 D1 change(s).

## Inputs

- Foursquare archive: `country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv` — 396,749 rows (sha256 `82b04934657742e497ba7832a8fab81aa09fb4703958b63cd3e92fa25ab33b98`); 41,186 distinct rows carry an in-scope leaf.
- Leaf → type map: `docs/kan-461/leaf-type-map-outings.json` (7 leaf rules, 0 suffix rules, 1 tier-2 leaves).
- Overture base: `overture-country-sources/PT/7ac6dab3-15fe-4992-aba9-a227daaed380.csv` — 213,068 promoted of 350,415 rows under the committed overrides.
- Curated rows (active, all types): 21,271.
- MULTIBANCO: 1 distinct name(s) read; 0 row(s) fetched as possible name matches.
- Foursquare-keyed `poi_source_correction` rows honoured: 6.
- Matcher: `supplement_osm_pois.names_match` within 75 m, type-blind, against every served row. Same name 75–400 m away is skipped as suspect. Distance alone never skips.

## Totals

| | rows |
|---|---:|
| **would insert** | **3,663** |
| skipped — noise leaf | 12,693 |
| skipped — parent-only leaf | 2,726 |
| skipped — tier 2 leaf | 62 |
| skipped — unmapped leaf | 18,444 |
| skipped — empty name | 8 |
| skipped — held for review | 298 |
| skipped — matched | 2,353 |
| skipped — matched (translated) | 15 |
| skipped — weak name | 135 |
| skipped — suspect | 749 |
| skipped — in-batch duplicate | 40 |
| in-scope rows, total | 41,186 |

SQL: 19 statement(s), 1,385,015 bytes (18 `curated_poi` + 1 `curated_poi_attribute`), largest 79,996 bytes (cap 80,000). Rows with a second type (written as `curated_poi_attribute` `poi_type`): 38.

## Would insert, by our type

| primary_poi_type | rows | + as second type |
|---|---:|---:|
| `park` | 1,272 | 4 |
| `viewpoint` | 940 | 1 |
| `beach` | 576 | 4 |
| `playground` | 502 | 20 |
| `plaza` | 373 | 10 |

## Per leaf

A row with several in-scope leaves counts under each, so columns sum past the distinct totals above. Skip reasons that are the same for every row of a leaf (tier 2, noise, parent, excluded, unmapped) show the leaf's whole count.

| leaf | kind | our type(s) | rows | would insert | noise leaf | parent-only leaf | tier 2 leaf | unmapped leaf | empty name | held for review | matched | matched (translated) | weak name | suspect | in-batch duplicate |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Scenic Lookout | tier1 | `viewpoint` | 1,585 | 940 | 0 | 0 | 0 | 0 | 2 | 11 | 476 | 1 | 48 | 97 | 10 |
| Park | tier1 | `park` | 1,295 | 670 | 0 | 0 | 0 | 0 | 1 | 9 | 385 | 1 | 22 | 198 | 9 |
| Garden | tier1 | `park` | 1,022 | 626 | 0 | 0 | 0 | 0 | 0 | 10 | 267 | 3 | 17 | 95 | 4 |
| Beach | tier1 | `beach` | 1,464 | 580 | 0 | 0 | 0 | 0 | 5 | 3 | 617 | 9 | 31 | 214 | 5 |
| Playground | tier1 | `playground` | 795 | 520 | 0 | 0 | 0 | 0 | 0 | 3 | 198 | 0 | 7 | 60 | 7 |
| Plaza | tier1 | `plaza` | 1,132 | 374 | 0 | 0 | 0 | 0 | 0 | 191 | 458 | 1 | 13 | 90 | 5 |
| Pedestrian Plaza | tier1 | `plaza` | 122 | 9 | 0 | 0 | 0 | 0 | 0 | 72 | 27 | 0 | 0 | 12 | 2 |
| Island | tier2 |  | 67 | 0 | 0 | 0 | 62 | 0 | 0 | 0 | 2 | 0 | 1 | 2 | 0 |
| Dog Park | unmapped |  | 231 | 10 | 0 | 0 | 0 | 206 | 0 | 0 | 12 | 0 | 1 | 2 | 0 |
| National Park | unmapped |  | 47 | 5 | 0 | 0 | 0 | 42 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nudist Beach | unmapped |  | 25 | 5 | 0 | 0 | 0 | 19 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| Bathing Area | unmapped |  | 116 | 3 | 0 | 0 | 0 | 111 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| Roof Deck | unmapped |  | 88 | 3 | 0 | 0 | 0 | 84 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Picnic Area | unmapped |  | 26 | 2 | 0 | 0 | 0 | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoo Exhibit | unmapped |  | 14 | 2 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| Prayer Room | unmapped |  | 166 | 1 | 0 | 0 | 0 | 165 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Outdoor Sculpture | unmapped |  | 164 | 1 | 0 | 0 | 0 | 160 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Escape Room | unmapped |  | 36 | 1 | 0 | 0 | 0 | 35 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tunnel | unmapped |  | 30 | 1 | 0 | 0 | 0 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| State or Provincial Park | unmapped |  | 23 | 1 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bike Trail | unmapped |  | 22 | 1 | 0 | 0 | 0 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Natural Park | unmapped |  | 18 | 1 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Urban Park | unmapped |  | 16 | 1 | 0 | 0 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dam | unmapped |  | 13 | 1 | 0 | 0 | 0 | 11 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Disc Golf Course | unmapped |  | 2 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Church | unmapped |  | 3,284 | 0 | 0 | 0 | 0 | 3,276 | 0 | 0 | 7 | 1 | 0 | 0 | 0 |
| Night Club | unmapped |  | 1,395 | 0 | 0 | 0 | 0 | 1,395 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Historic and Protected Site | unmapped |  | 1,311 | 0 | 0 | 0 | 0 | 1,276 | 0 | 0 | 27 | 1 | 1 | 6 | 0 |
| Art Gallery | unmapped |  | 891 | 0 | 0 | 0 | 0 | 890 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Music Venue | unmapped |  | 644 | 0 | 0 | 0 | 0 | 642 | 0 | 0 | 1 | 0 | 0 | 1 | 0 |
| Campground | unmapped |  | 622 | 0 | 0 | 0 | 0 | 612 | 0 | 0 | 8 | 0 | 0 | 2 | 0 |
| Monument | unmapped |  | 610 | 0 | 0 | 0 | 0 | 578 | 0 | 0 | 29 | 1 | 0 | 2 | 0 |
| Museum | unmapped |  | 584 | 0 | 0 | 0 | 0 | 579 | 0 | 0 | 1 | 0 | 0 | 4 | 0 |
| Hiking Trail | unmapped |  | 583 | 0 | 0 | 0 | 0 | 554 | 0 | 0 | 24 | 0 | 0 | 5 | 0 |
| Concert Hall | unmapped |  | 427 | 0 | 0 | 0 | 0 | 427 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| River | unmapped |  | 390 | 0 | 0 | 0 | 0 | 355 | 0 | 0 | 32 | 0 | 0 | 3 | 0 |
| Mountain | unmapped |  | 371 | 0 | 0 | 0 | 0 | 344 | 0 | 0 | 26 | 0 | 0 | 1 | 0 |
| Soccer Stadium | unmapped |  | 368 | 0 | 0 | 0 | 0 | 368 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bridge | unmapped |  | 355 | 0 | 0 | 0 | 0 | 348 | 0 | 0 | 6 | 0 | 0 | 1 | 0 |
| History Museum | unmapped |  | 352 | 0 | 0 | 0 | 0 | 348 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |
| Surf Spot | unmapped |  | 343 | 0 | 0 | 0 | 0 | 259 | 0 | 0 | 61 | 1 | 4 | 18 | 0 |
| Harbor or Marina | unmapped |  | 336 | 0 | 0 | 0 | 0 | 327 | 0 | 0 | 7 | 0 | 1 | 1 | 0 |
| Theater | unmapped |  | 321 | 0 | 0 | 0 | 0 | 321 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lake | unmapped |  | 301 | 0 | 0 | 0 | 0 | 290 | 0 | 0 | 10 | 0 | 0 | 1 | 0 |
| Movie Theater | unmapped |  | 282 | 0 | 0 | 0 | 0 | 282 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Public Art | unmapped |  | 247 | 0 | 0 | 0 | 0 | 247 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Strip Club | unmapped |  | 234 | 0 | 0 | 0 | 0 | 234 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Performing Arts Venue | unmapped |  | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Castle | unmapped |  | 185 | 0 | 0 | 0 | 0 | 176 | 0 | 0 | 6 | 0 | 0 | 3 | 0 |
| Amusement Park | unmapped |  | 181 | 0 | 0 | 0 | 0 | 171 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| Pool Hall | unmapped |  | 181 | 0 | 0 | 0 | 0 | 181 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fair | unmapped |  | 161 | 0 | 0 | 0 | 0 | 161 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Stadium | unmapped |  | 161 | 0 | 0 | 0 | 0 | 161 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Art Museum | unmapped |  | 160 | 0 | 0 | 0 | 0 | 159 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Stable | unmapped |  | 160 | 0 | 0 | 0 | 0 | 159 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Water Park | unmapped |  | 142 | 0 | 0 | 0 | 0 | 142 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lighthouse | unmapped |  | 138 | 0 | 0 | 0 | 0 | 127 | 0 | 0 | 11 | 0 | 0 | 0 | 0 |
| Nature Preserve | unmapped |  | 115 | 0 | 0 | 0 | 2 | 101 | 0 | 0 | 12 | 0 | 0 | 0 | 0 |
| Street Art | unmapped |  | 107 | 0 | 0 | 0 | 0 | 107 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rock Club | unmapped |  | 102 | 0 | 0 | 0 | 0 | 102 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Waterfall | unmapped |  | 102 | 0 | 0 | 0 | 0 | 99 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Attraction | unmapped |  | 97 | 0 | 0 | 0 | 0 | 95 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| Internet Cafe | unmapped |  | 95 | 0 | 0 | 0 | 0 | 95 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fountain | unmapped |  | 94 | 0 | 0 | 0 | 0 | 91 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Arcade | unmapped |  | 92 | 0 | 0 | 0 | 0 | 90 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| Shrine | unmapped |  | 92 | 0 | 0 | 0 | 0 | 91 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Comedy Club | unmapped |  | 90 | 0 | 0 | 0 | 0 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hot Spring | unmapped |  | 90 | 0 | 0 | 0 | 0 | 87 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Exhibit | unmapped |  | 86 | 0 | 0 | 0 | 0 | 86 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Sculpture Garden | unmapped |  | 84 | 0 | 0 | 0 | 0 | 78 | 0 | 0 | 5 | 0 | 0 | 1 | 0 |
| Bowling Alley | unmapped |  | 75 | 0 | 0 | 0 | 0 | 75 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Casino | unmapped |  | 70 | 0 | 0 | 0 | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Temple | unmapped |  | 70 | 0 | 0 | 0 | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Indie Movie Theater | unmapped |  | 69 | 0 | 0 | 0 | 0 | 69 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Science Museum | unmapped |  | 64 | 0 | 0 | 0 | 0 | 63 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Palace | unmapped |  | 62 | 0 | 0 | 0 | 0 | 61 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Dive Spot | unmapped |  | 57 | 0 | 0 | 0 | 0 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Gaming Cafe | unmapped |  | 52 | 0 | 0 | 0 | 0 | 52 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rock Climbing Spot | unmapped |  | 47 | 0 | 0 | 0 | 0 | 47 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Jazz and Blues Venue | unmapped |  | 45 | 0 | 0 | 0 | 0 | 45 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Cave | unmapped |  | 44 | 0 | 0 | 0 | 0 | 44 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Go Kart Track | unmapped |  | 40 | 0 | 0 | 0 | 0 | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Amphitheater | unmapped |  | 37 | 0 | 0 | 0 | 0 | 37 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tennis Stadium | unmapped |  | 37 | 0 | 0 | 0 | 0 | 37 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Botanical Garden | unmapped |  | 34 | 0 | 0 | 0 | 0 | 31 | 0 | 0 | 2 | 0 | 0 | 1 | 0 |
| Basketball Stadium | unmapped |  | 32 | 0 | 0 | 0 | 0 | 31 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Indie Theater | unmapped |  | 32 | 0 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Memorial Site | unmapped |  | 31 | 0 | 0 | 0 | 0 | 31 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Monastery | unmapped |  | 30 | 0 | 0 | 0 | 0 | 30 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mini Golf Course | unmapped |  | 28 | 0 | 0 | 0 | 0 | 28 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hockey Stadium | unmapped |  | 27 | 0 | 0 | 0 | 0 | 27 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Volcano | unmapped |  | 27 | 0 | 0 | 0 | 0 | 27 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Aquarium | unmapped |  | 26 | 0 | 0 | 0 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Circus | unmapped |  | 26 | 0 | 0 | 0 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoo | unmapped |  | 25 | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Windmill | unmapped |  | 24 | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Party Center | unmapped |  | 23 | 0 | 0 | 0 | 0 | 23 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Psychic and Astrologer | unmapped |  | 22 | 0 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Football Stadium | unmapped |  | 19 | 0 | 0 | 0 | 0 | 19 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mosque | unmapped |  | 17 | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Salsa Club | unmapped |  | 17 | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country Dance Club | unmapped |  | 16 | 0 | 0 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Laser Tag Center | unmapped |  | 16 | 0 | 0 | 0 | 0 | 14 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| Roller Rink | unmapped |  | 11 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Planetarium | unmapped |  | 10 | 0 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Track Stadium | unmapped |  | 10 | 0 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Boat Launch | unmapped |  | 8 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Synagogue | unmapped |  | 8 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Picnic Shelter | unmapped |  | 6 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Buddhist Temple | unmapped |  | 5 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Opera House | unmapped |  | 5 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Carnival | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| VR Cafe | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Baseball Stadium | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country Club | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mountain Hut | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ticket Seller | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dance Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Disc Golf | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Kingdom Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nature Trail | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rugby Stadium | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ruin | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bingo Center | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Community Garden | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Drive-in Theater | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Erotic Museum | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fort | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| General Entertainment | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hindu Temple | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Terreiro | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tower | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Arts and Entertainment | parent |  | 2,183 | 8 | 0 | 2,157 | 0 | 11 | 0 | 1 | 4 | 0 | 0 | 2 | 0 |
| Spiritual Center | parent |  | 384 | 0 | 0 | 365 | 0 | 16 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Landmarks and Outdoors | parent |  | 207 | 0 | 0 | 205 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Other Great Outdoors | noise |  | 1,999 | 28 | 1,826 | 4 | 3 | 87 | 0 | 3 | 35 | 0 | 1 | 12 | 0 |
| Field | noise |  | 1,045 | 5 | 1,016 | 0 | 0 | 18 | 0 | 0 | 4 | 0 | 0 | 2 | 0 |
| Neighborhood | noise |  | 1,877 | 4 | 1,841 | 1 | 0 | 13 | 0 | 2 | 6 | 0 | 3 | 7 | 0 |
| Farm | noise |  | 1,949 | 3 | 1,928 | 1 | 0 | 16 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Forest | noise |  | 63 | 2 | 55 | 0 | 0 | 5 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| City | noise |  | 1,790 | 1 | 1,782 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| Village | noise |  | 599 | 1 | 593 | 0 | 0 | 3 | 0 | 0 | 1 | 0 | 0 | 1 | 0 |
| Waterfront | noise |  | 40 | 1 | 32 | 0 | 0 | 3 | 0 | 0 | 2 | 0 | 0 | 2 | 0 |
| Tree | noise |  | 37 | 1 | 34 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| Reservoir | noise |  | 14 | 1 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Canal Lock | noise |  | 10 | 1 | 3 | 0 | 0 | 4 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| Structure | noise |  | 3,274 | 0 | 3,252 | 5 | 0 | 10 | 0 | 1 | 3 | 0 | 0 | 3 | 0 |
| Town | noise |  | 310 | 0 | 307 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| Well | noise |  | 74 | 0 | 71 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| States and Municipalities | noise |  | 48 | 0 | 48 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Canal | noise |  | 36 | 0 | 19 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bay | noise |  | 25 | 0 | 24 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hill | noise |  | 9 | 0 | 8 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| County | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pass | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| State | noise |  | 3 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pond | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Unmapped leaves — in scope, not in the map, imported nothing

| leaf | rows | paths |
|---|---:|---|
| Dog Park | 231 | Landmarks and Outdoors > Park > Dog Park |
| National Park | 47 | Landmarks and Outdoors > Park > National Park |
| Nudist Beach | 25 | Landmarks and Outdoors > Nudist Beach |
| Bathing Area | 116 | Landmarks and Outdoors > Bathing Area |
| Roof Deck | 88 | Landmarks and Outdoors > Roof Deck |
| Picnic Area | 26 | Landmarks and Outdoors > Park > Picnic Area |
| Zoo Exhibit | 14 | Arts and Entertainment > Zoo > Zoo Exhibit |
| Prayer Room | 166 | Community and Government > Spiritual Center > Prayer Room |
| Outdoor Sculpture | 164 | Arts and Entertainment > Public Art > Outdoor Sculpture |
| Escape Room | 36 | Arts and Entertainment > Escape Room |
| Tunnel | 30 | Landmarks and Outdoors > Tunnel |
| State or Provincial Park | 23 | Landmarks and Outdoors > Park > State or Provincial Park |
| Bike Trail | 22 | Landmarks and Outdoors > Bike Trail |
| Natural Park | 18 | Landmarks and Outdoors > Park > Natural Park |
| Urban Park | 16 | Landmarks and Outdoors > Park > Urban Park |
| Dam | 13 | Landmarks and Outdoors > Dam |
| Disc Golf Course | 2 | Arts and Entertainment > Disc Golf Course |
| Church | 3,284 | Community and Government > Spiritual Center > Church |
| Night Club | 1,395 | Arts and Entertainment > Night Club |
| Historic and Protected Site | 1,311 | Landmarks and Outdoors > Historic and Protected Site |
| Art Gallery | 891 | Arts and Entertainment > Art Gallery |
| Music Venue | 644 | Arts and Entertainment > Performing Arts Venue > Music Venue |
| Campground | 622 | Landmarks and Outdoors > Campground |
| Monument | 610 | Landmarks and Outdoors > Monument |
| Museum | 584 | Arts and Entertainment > Museum |
| Hiking Trail | 583 | Landmarks and Outdoors > Hiking Trail |
| Concert Hall | 427 | Arts and Entertainment > Performing Arts Venue > Concert Hall |
| River | 390 | Landmarks and Outdoors > River |
| Mountain | 371 | Landmarks and Outdoors > Mountain |
| Soccer Stadium | 368 | Arts and Entertainment > Stadium > Soccer Stadium |
| Bridge | 355 | Landmarks and Outdoors > Bridge |
| History Museum | 352 | Arts and Entertainment > Museum > History Museum |
| Surf Spot | 343 | Landmarks and Outdoors > Surf Spot |
| Harbor or Marina | 336 | Landmarks and Outdoors > Harbor or Marina |
| Theater | 321 | Arts and Entertainment > Performing Arts Venue > Theater |
| Lake | 301 | Landmarks and Outdoors > Lake |
| Movie Theater | 282 | Arts and Entertainment > Movie Theater |
| Public Art | 247 | Arts and Entertainment > Public Art |
| Strip Club | 234 | Arts and Entertainment > Strip Club |
| Performing Arts Venue | 200 | Arts and Entertainment > Performing Arts Venue |
| Castle | 185 | Landmarks and Outdoors > Castle |
| Amusement Park | 181 | Arts and Entertainment > Amusement Park |
| Pool Hall | 181 | Arts and Entertainment > Pool Hall |
| Fair | 161 | Arts and Entertainment > Fair |
| Stadium | 161 | Arts and Entertainment > Stadium |
| Art Museum | 160 | Arts and Entertainment > Museum > Art Museum |
| Stable | 160 | Landmarks and Outdoors > Stable |
| Water Park | 142 | Arts and Entertainment > Water Park |
| Lighthouse | 138 | Landmarks and Outdoors > Lighthouse |
| Nature Preserve | 115 | Landmarks and Outdoors > Nature Preserve |
| Street Art | 107 | Arts and Entertainment > Public Art > Street Art |
| Rock Club | 102 | Arts and Entertainment > Performing Arts Venue > Music Venue > Rock Club |
| Waterfall | 102 | Landmarks and Outdoors > Waterfall |
| Attraction | 97 | Arts and Entertainment > Amusement Park > Attraction |
| Internet Cafe | 95 | Arts and Entertainment > Internet Cafe |
| Fountain | 94 | Landmarks and Outdoors > Fountain |
| Arcade | 92 | Arts and Entertainment > Arcade |
| Shrine | 92 | Community and Government > Spiritual Center > Shrine |
| Comedy Club | 90 | Arts and Entertainment > Comedy Club |
| Hot Spring | 90 | Landmarks and Outdoors > Hot Spring |
| Exhibit | 86 | Arts and Entertainment > Exhibit |
| Sculpture Garden | 84 | Landmarks and Outdoors > Sculpture Garden |
| Bowling Alley | 75 | Arts and Entertainment > Bowling Alley |
| Casino | 70 | Arts and Entertainment > Casino |
| Temple | 70 | Community and Government > Spiritual Center > Temple |
| Indie Movie Theater | 69 | Arts and Entertainment > Movie Theater > Indie Movie Theater |
| Science Museum | 64 | Arts and Entertainment > Museum > Science Museum |
| Palace | 62 | Landmarks and Outdoors > Palace |
| Dive Spot | 57 | Landmarks and Outdoors > Dive Spot |
| Gaming Cafe | 52 | Arts and Entertainment > Gaming Cafe |
| Rock Climbing Spot | 47 | Landmarks and Outdoors > Rock Climbing Spot |
| Jazz and Blues Venue | 45 | Arts and Entertainment > Performing Arts Venue > Music Venue > Jazz and Blues Venue |
| Cave | 44 | Landmarks and Outdoors > Cave |
| Go Kart Track | 40 | Arts and Entertainment > Go Kart Track |
| Amphitheater | 37 | Arts and Entertainment > Performing Arts Venue > Amphitheater |
| Tennis Stadium | 37 | Arts and Entertainment > Stadium > Tennis Stadium |
| Botanical Garden | 34 | Landmarks and Outdoors > Botanical Garden |
| Basketball Stadium | 32 | Arts and Entertainment > Stadium > Basketball Stadium |
| Indie Theater | 32 | Arts and Entertainment > Performing Arts Venue > Indie Theater |
| Memorial Site | 31 | Landmarks and Outdoors > Memorial Site |
| Monastery | 30 | Community and Government > Spiritual Center > Monastery |
| Mini Golf Course | 28 | Arts and Entertainment > Mini Golf Course |
| Hockey Stadium | 27 | Arts and Entertainment > Stadium > Hockey Stadium |
| Volcano | 27 | Landmarks and Outdoors > Volcano |
| Aquarium | 26 | Arts and Entertainment > Aquarium |
| Circus | 26 | Arts and Entertainment > Circus |
| Zoo | 25 | Arts and Entertainment > Zoo |
| Windmill | 24 | Landmarks and Outdoors > Windmill |
| Party Center | 23 | Arts and Entertainment > Party Center |
| Psychic and Astrologer | 22 | Arts and Entertainment > Psychic and Astrologer |
| Football Stadium | 19 | Arts and Entertainment > Stadium > Football Stadium |
| Mosque | 17 | Community and Government > Spiritual Center > Mosque |
| Salsa Club | 17 | Arts and Entertainment > Salsa Club |
| Country Dance Club | 16 | Arts and Entertainment > Country Dance Club |
| Laser Tag Center | 16 | Arts and Entertainment > Laser Tag Center |
| Roller Rink | 11 | Arts and Entertainment > Roller Rink |
| Planetarium | 10 | Arts and Entertainment > Planetarium |
| Track Stadium | 10 | Arts and Entertainment > Stadium > Track Stadium |
| Boat Launch | 8 | Landmarks and Outdoors > Boat Launch |
| Synagogue | 8 | Community and Government > Spiritual Center > Synagogue |
| Picnic Shelter | 6 | Landmarks and Outdoors > Picnic Shelter |
| Buddhist Temple | 5 | Community and Government > Spiritual Center > Buddhist Temple |
| Opera House | 5 | Arts and Entertainment > Performing Arts Venue > Opera House |
| Carnival | 4 | Arts and Entertainment > Carnival |
| VR Cafe | 4 | Arts and Entertainment > VR Cafe |
| Baseball Stadium | 3 | Arts and Entertainment > Stadium > Baseball Stadium |
| Country Club | 3 | Arts and Entertainment > Country Club |
| Mountain Hut | 3 | Landmarks and Outdoors > Mountain Hut |
| Ticket Seller | 3 | Arts and Entertainment > Ticket Seller |
| Dance Hall | 2 | Arts and Entertainment > Dance Hall |
| Disc Golf | 2 | Arts and Entertainment > Disc Golf |
| Kingdom Hall | 2 | Community and Government > Spiritual Center > Kingdom Hall |
| Nature Trail | 2 | Landmarks and Outdoors > Nature Trail |
| Rugby Stadium | 2 | Arts and Entertainment > Stadium > Rugby Stadium |
| Ruin | 2 | Landmarks and Outdoors > Ruin |
| Bingo Center | 1 | Arts and Entertainment > Bingo Center |
| Community Garden | 1 | Landmarks and Outdoors > Garden > Community Garden |
| Drive-in Theater | 1 | Arts and Entertainment > Movie Theater > Drive-in Theater |
| Erotic Museum | 1 | Arts and Entertainment > Museum > Erotic Museum |
| Fort | 1 | Landmarks and Outdoors > Fort |
| General Entertainment | 1 | Arts and Entertainment > General Entertainment |
| Hindu Temple | 1 | Community and Government > Spiritual Center > Hindu Temple |
| Terreiro | 1 | Community and Government > Spiritual Center > Terreiro |
| Tower | 1 | Landmarks and Outdoors > Tower |

## Weak-name skips — an owner decision the contract did not cover

The dedupe contract says name match + distance, nothing about rows with no usable name. These rows are skipped by the preflight's name-quality flags and listed so the owner can flip them: a name that is only its type word ("Castelo", "Igreja") or only its town names nothing the matcher could dedupe later.

- type words only: 122
- locality only: 13

## Matched through translation — hand-check sample

Rows skipped because their name, with landmark words mapped to English through `docs/kan-433/landmark-terms.json` and function words dropped, matches a served landmark's translated name within 25 m. 15 row(s); a seeded sample of 15 for a person to check — any pair here that is NOT the same place is a bug in the term table or the step.

| fsq_place_id | archive name | served name | served type | m | translated (archive ↔ served) |
|---|---|---|---|---:|---|
| 4bc1ef0aabf495213da1c193 | Palácio de Monserrate | Park and Palace of Monserrate | historical_landmark | 11 | monserrate palace ↔ monserrate palace park |
| 4c71059ed97fa14395bdf7ca | Praia da Amoreira | Amoreira Beach, Aljezur, Algarve | beach | 12 | amoreira beach ↔ algarve aljezur amoreira beach |
| 4c7574c4b474a1cd2c54b9bf | Praia das Adegas | Adegas Beach | beach | 22 | adegas beach ↔ adegas beach |
| 4d1a06a56d10370498f14bbd | Praia de Galápos | Galapos beach | beach | 22 | beach galapos ↔ beach galapos |
| 4dd98f131838b8561d1c9097 | Praia do Fuzelhas | Praia de Fuzelhas em Matosinhos | beach | 7 | beach fuzelhas ↔ beach fuzelhas matosinhos |
| 4eefa62ae300215596024ed1 | Jardim do Carregal | Jardim no Carregal, em Porto, Portugal | botanical_garden | 9 | carregal garden ↔ carregal garden harbor portugal |
| 5152da7ce4b008e06241bbd5 | Jardim Botânico do Faial | Botanical Garden of Faial | botanical_garden | 16 | botanico faial garden ↔ botanical faial garden |
| 53cd3b2b498e64dd2100fe09 | Praia Pedra da Eira | Pedra D'eira Beach | beach | 22 | beach eira pedra ↔ beach d eira pedra |
| 567d9af6498e888ed31a0593 | Praia do Patacho | Beach Patacho | beach | 6 | beach patacho ↔ beach patacho |
| 56f94705498e695190c5d3f5 | Praia da Cala | Praia Ponta Grande Cala | beach | 22 | beach cala ↔ beach cala grande ponta |
| 57652c43cd1069907000d963 | Ermida da Guia | Ermida da Senhora da Guia | church | 13 | guia hermitage ↔ guia hermitage lady |
| 57c2f3bf498e5ecea838e4fa | Praia fluvial de Ereira | Ereira Beach | beach | 4 | beach ereira fluvial ↔ beach ereira |
| 652f871e766e4c904d5bde17 | Sanctuary of Our Lady of Sameiro | Santuário do Sameiro | church | 6 | lady our sameiro sanctuary ↔ sameiro sanctuary |
| 67125e3e7074bb2198b9f03f | Algés Beach | Praia De Algés | beach | 7 | alges beach ↔ alges beach |
| 6744caf9e70401447ffed189 | Praça de República | Praça Da República Em Portimão | stadium | 8 | republica square ↔ portimao republica square |

## Served landmark within 25 m under another name — imported, for curation

Would-insert rows with a served landmark or venue (not a business) within 25 m whose name the matcher cannot pair. The contract imports them — different names are different places, distance alone never removes — and the Worker's read-time suppression is exact-name too. Some are real neighbours (a statue by a church); the ones that are the same place under another language or alias ("Mosteiro dos Jerónimos" / "Jerónimos Monastery") are what this list is for — what the translation step above did not pair. 455 row(s); a seeded hand-check sample of 50:

| fsq_place_id | name | our type(s) | served neighbour | translated (archive ↔ served) |
|---|---|---|---|---|
| 4c09074a340720a12b028493 | Praça São João Baptista | plaza | overture:eba5a310-2fd0-4546-9c36-1b7614939aa8 "Skate Na Praça Da Liberdade" (plaza) at 17 m | baptista joao saint square ↔ liberdade skate square |
| 4d1e00a48629224b1937fe86 | Praia Fluvial de Oleiros | beach | overture:d89cf819-3e5c-4753-9545-dd4a66d658fd "Praia Fluvial do Açude Pinto" (beach) at 20 m | beach fluvial oleiros ↔ acude beach fluvial pinto |
| 4d62fd6857616dcb7484a2f3 | Praça do Município | plaza | curated:fsq:4b0588a2f964a52029d122e3 "Pelourinho de Lisboa" (historical_landmark) at 1 m | municipio square ↔ lisboa pillory |
| 4d697afe1a88b1f7e6e02b5d | Largo D. Manuel I | plaza | curated:fsq:4f18247fe4b0b4cc23b873cd "Charlotte's Handmade Glass Beads Accesories" (art_gallery) at 7 m | d i manuel square ↔ accesories beads charlotte glass handmade s |
| 4da33d369aa4721e87b01f1a | Parque Infantil do Jardim Marquês de Marialva | playground | overture:f22e1fe7-bd23-42a3-95f2-004ee17057a3 "Cinema City Campo Pequeno" (movie_theater) at 11 m | garden infantil marialva marques park ↔ campo cinema city pequeno |
| 4dc2b563ae60966750b058ea | Devesa | park | curated:fsq:52484484498ebd3dfc16f16c "Cine-teatro João Costa" (movie_theater) at 15 m | devesa ↔ cinema costa joao theater |
| 4dc52fb6d4c0ad9c0f809bd2 | Largo de Pardilhó | plaza | curated:fsq:5b70055122d4900039797455 "Igreja De São Pedro, Pardilhó" (church) at 19 m | pardilho square ↔ church pardilho pedro saint |
| 4dd93bd652b1a5c644782056 | Miradouro de santa iria | viewpoint | overture:bd37377f-ca76-4a97-bc2c-173ff6e43ac7 "Furnas, São Miguel, The Azores" (historical_landmark) at 8 m | iria saint viewpoint ↔ azores furnas miguel saint |
| 4e2bf66de4cd3bc1669aad52 | Praia Nossa Sra. da Guia | beach | curated:fsq:4fb28454e4b002c22889408b "Molhe de Vila do Conde" (lighthouse) at 0 m | beach guia lady our ↔ conde molhe vila |
| 4e46b0207d8b91a065922bf9 | Ponta da Atalaia | viewpoint | overture:5a98a91d-3f09-440a-9e41-35d29765c43d "Casa Vila Adentro Aljezur" (historical_landmark) at 9 m | atalaia ponta ↔ adentro aljezur casa vila |
| 4e5c16b4183883e00c04c3ae | Praca Dr Eugenio Dias | plaza | curated:fsq:5214893d11d2832c559a26c5 "Centro de Interpretação das Linhas de Torres" (historical_landmark) at 0 m | day dr eugenio square ↔ center interpretacao linhas torres |
| 4e7d1b454901fe93d7bc0329 | Campo do Seco | plaza | overture:f6d9b588-b890-4cd4-95b7-a0ef1c3040cb "Campo Seco Refojos Basto" (plaza) at 0 m | campo seco ↔ basto campo refojos seco |
| 4f22c562e4b01dc949da0fb0 | Play | playground | curated:fsq:4ee3706c775b86c403335e19 "SCC" (stadium) at 7 m | play ↔ scc |
| 4f4a47f7e4b002a2ad6906e9 | Largo D. João III | park | curated:osm:way/273593994 "Jardim do Largo de Dom João III" (park) at 17 m | d iii joao square ↔ dom garden iii joao square |
| 4f6f542ce4b05c9c2c92f6af | Parque Infantil de Ermesinde | park | curated:fsq:4f64aba1e4b045fbd3ed764d "Praça Da Cultura" (lake) at 4 m | ermesinde infantil park ↔ cultura square |
| 4fae81c0e4b08a88c5cde0d3 | Praia Bom Successo | beach | overture:bfd91f49-0992-4fd2-8d75-9c623fe9f2e5 "Lagoa de Obidos" (beach) at 22 m | beach bom successo ↔ lagoon obidos |
| 4fd7d7abe4b0f564e741607e | Largo Rodrigo de Freitas | park | curated:fsq:4aa8605a95d344bc134fffa2 "O Telhadinho - Actividades Hoteleiras" (night_club) at 18 m | freitas rodrigo square ↔ actividades hoteleiras telhadinho |
| 501bca1be4b0a40d086aa301 | Praça Dr. Alberto do Vale | plaza | overture:5c2aae6a-4837-484c-b0ab-b2ae758c7ee6 "Solar da Praça" (historical_landmark) at 1 m | alberto dr square vale ↔ solar square |
| 502a1f83e4b07c2bad9c83ab | Jardim da igreja | park | overture:6ee195c0-a96d-4733-b226-f4587b9c5cbb "Santos Populares - Arraial Arroios" (music_venue) at 9 m | church garden ↔ arraial arroios populares saints |
| 5037bca3e4b021b33beebb16 | Parque Natural de Montorros | park | overture:d48a5580-932b-4837-b6b5-fdb8a12dfa4b "Parque Natural dos Montorros em Vila Nova de Cerveira" (park) at 0 m | montorros natural park ↔ cerveira montorros natural new park vila |
| 505f4bd7e4b0a05446fbaf2c | Parque Infantil da Rua de Bissau | playground | overture:c8575f2f-ae7e-4008-bec4-e04dc2e5bc8d "Adalmada Cruz De Pau" (church) at 22 m | bissau infantil park rua ↔ adalmada cruz pau |
| 50cf4f22e4b01c69f7301278 | Zona Verde - ESTGA | park | overture:1e15d04f-a4ca-4053-a84a-69914440312c "Auditório Estga" (theatre) at 21 m | estga verde zona ↔ auditorio estga |
| 50f1ba84e4b0c0524847c6d9 | Singing in The Rain | playground | overture:81c87879-ca5b-4ba3-8930-c36b5537c9c8 "Capela do Rato" (church) at 15 m | in rain singing ↔ chapel rato |
| 5159570be4b03f6bcb641c98 | Miradouro de S. Roque | viewpoint, park | curated:fsq:51595e51e4b0a71b12dd65c3 "Solar de Pregais" (historical_landmark) at 0 m | roque s viewpoint ↔ pregais solar |
| 51c75c1a498e6709a2566fc8 | Jardim das Oliveiras | park | overture:012f66db-8977-402c-b73b-988626332efb "Praça dos Leões" (plaza) at 5 m | garden oliveiras ↔ leoes square |
| 51e82768498e92b567ad75ab | Miradouro do Torel | viewpoint | overture:52065611-f1ed-402a-87e2-e2f310ffe540 "Jardim do Torel" (park) at 9 m | torel viewpoint ↔ garden torel |
| 51fd0e4a498e836675bc9573 | Alta da Santa Catarina | viewpoint | overture:ffa81682-f520-4682-82c2-6e8b01238966 "Saint Catherine's Heights" (historical_landmark) at 0 m | alta catarina saint ↔ catherine heights s saint |
| 52037a0c8bbdfb886164c13e | OldTimer Tours | viewpoint | overture:0ae80c6f-2779-421b-89d0-0b521f5075f3 "Fortress of Sao Tiago" (historical_landmark) at 2 m | oldtimer tours ↔ fortress saint tiago |
| 520aa259498e447ab8d6420b | Largo da Viscondessa | plaza | curated:fsq:510e94d4e4b0f2f1ae8b8203 "s.bras" (historical_landmark) at 23 m | square viscondessa ↔ bras s |
| 52b8c642498ed5d17d537ddb | Taguscruises Boat Tours | viewpoint | curated:fsq:516d107ee4b086022b375b67 "Igreja do Convento do Bom Sucesso" (church) at 20 m | boat taguscruises tours ↔ bom church convent sucesso |
| 53ba5e2a498e3b8ad1fe2e52 | hotel Solverde Swimmingpool | beach | overture:fa026e95-5553-4fd1-b845-1f0e03d5170a "Praia Nova" (beach) at 17 m | hotel solverde swimmingpool ↔ beach new |
| 53c174bf498e4eed22cdf309 | Largo Dr. António H. de Melo | plaza | overture:504f9709-2106-45bd-917a-84752c0846a2 "Igreja Matriz de Águeda" (church) at 3 m | antonio dr h melo square ↔ agueda church mother |
| 53c4f649498e4a41986fa140 | Orchidea Garden | park | overture:3dd03700-e390-4053-8e78-c1f9aae5f2ae "Santa Cruz Madeira" (historical_landmark) at 6 m | garden orchidea ↔ cruz madeira saint |
| 5596d3a2498e0197b47c8301 | Deák tér, Porto | park | overture:9c9d15ff-fd3f-40de-9646-8bed41206d81 "Oporto" (historical_landmark) at 3 m | deak harbor ter ↔ oporto |
| 5666bc15498e31604640ff40 | Miradouros do Paredão | viewpoint | overture:42fa63bb-30ca-478c-8905-afb8600f2b88 "Montado do Paredão Sul" (historical_landmark) at 24 m | miradouros paredao ↔ montado paredao sul |
| 56b10b5b498e22d23318a589 | Jardim de Canelas | park | curated:osm:way/194800955 "Jardim de São João Baptista" (park) at 16 m | canelas garden ↔ baptista garden joao saint |
| 574edb17498e09ada4279b92 | Monte S. Gregório | park | overture:02d9f5a9-907e-463b-8798-d36fad453fdf "Capela de São Gregório" (church) at 19 m | gregorio mount s ↔ chapel gregorio saint |
| 57f62ced498eb2f12b82c698 | Kissing Point | viewpoint | curated:fsq:5cdeab8c9be522002c02abca "PR1 Vereda do Areeiro" (hiking_area) at 18 m | kissing point ↔ areeiro pr1 vereda |
| 58e0df1c9f8b867ea06e0b69 | TimeOut Playground | playground | overture:40ae4d3e-a26e-4106-87b4-4b7068eec1f5 "Praça de Dom Luís I" (plaza) at 20 m | playground timeout ↔ dom i luis square |
| 59de2e4d9411f27585aff6fe | Parque Merendas | park | overture:1e1160dd-dce9-4182-9a71-fdd0e23f8f71 "Mare Nostrum" (park) at 12 m | merendas park ↔ mare nostrum |
| 5a66f1c00457b75950de63c8 | Largo Da Sé | plaza | overture:987e0b29-4302-4ced-be4a-633ad06a5088 "Fado & Fado" (music_venue) at 14 m | cathedral square ↔ fado fado |
| 5d052e398c9f41002382929d | Parque Infantil De Belas | playground | overture:95b6b87d-6768-41ee-81cb-586995ac9fb7 "Serra da Carregueira" (historical_landmark) at 2 m | belas infantil park ↔ carregueira mountains |
| 5f23eddebc42a35d3fdd932f | Parque Infantil Homem Do Leme | playground | curated:osm:way/478335004 "Jardim do Homem do Leme" (park) at 20 m | homem infantil leme park ↔ garden homem leme |
| 5f74c2f0ee61ef117f787d48 | Areal De Espadanedo | beach | overture:6a131464-7eb1-48a6-9e7b-9b9e06cde8bf "Praia Da Granja" (beach) at 13 m | areal espadanedo ↔ beach granja |
| 63de751f5d455207cfe9a6a8 | Largo De São Vicente | plaza | overture:4d3a65d5-a327-47d9-86e9-2dfcb38dda10 "Museu São Vicente de Fora" (museum) at 20 m | saint square vicente ↔ fora museum saint vicente |
| 63eacbaec85d45fd374577b6 | Sociedad Agro Alimentar da Mascata | park | overture:f1b65b05-9b86-40b6-bf4f-ec4cd6461c74 "Igreja Matriz de Sardoal" (church) at 18 m | agro alimentar mascata sociedad ↔ church mother sardoal |
| 6514b463c3b57923f4d4ccb5 | Largo 1• De Deziembro | plaza | curated:fsq:513df2a9e4b0a2c5a0009368 "Cerca Primitiva" (museum) at 15 m | 1 deziembro square ↔ cerca primitiva |
| 65edf80a74a3dc2bdf5cc61d | Praça Miguel Bombarda | plaza | overture:d36ee5c1-52d8-4dba-8eb3-b464d919dea5 "Museu Arte Sacra de Albufeira" (museum) at 12 m | bombarda miguel square ↔ albufeira art museum sacra |
| 6823480d667ab476acdc5b5e | Jardim Augusto Rosa | park | curated:fsq:63e267efad6b54475343b31a "Busto De Augusto Rosa" (historical_landmark) at 18 m | augusto garden rosa ↔ augusto busto rosa |
| f8e97cba3eb5442fc0f2b5a4 | Diabos e Bruxinhas - Entretenimentos e Eventos Infantis | park | overture:5b757dc6-4a6f-43f6-b997-d2e82881fa47 "La Movida Beach" (night_club) at 1 m | bruxinhas diabos entretenimentos eventos infantis ↔ beach la movida |

## Fuzzy far names — imported, for curation

Would-insert rows whose nearest served row 75–400 m away scores between 0.72 and 0.9 on name_similarity — the rung the preflight counted as suspect and this importer does not (see `SAME_NAME_SIMILARITY`). 266 row(s); first 20:

| fsq_place_id | name | our type(s) | nearest fuzzy far name |
|---|---|---|---|
| 4b0588a9f964a5201ad322e3 | Parque do Alvito | park | overture:87bf7e8c-d0b7-4dc9-8610-22cbd0146702 "Parque Infantil do Alvito" (playground) at 314 m, sim 0.78 |
| 4b804cf6f964a520d46530e3 | Largo de S. Francisco | plaza | overture:405351c4-a274-42be-9919-0aedf0274469 "Jardim do Largo de São Francisco" (plaza) at 210 m, sim 0.77 |
| 4b9d255cf964a520cb9336e3 | Jardim de Sta. Bárbara | park | overture:7a5c1e98-1927-42f6-839e-38aaaff72649 "Atelier Jardim de Santa Bárbara" (museum) at 162 m, sim 0.81 |
| 4bb237a542959c741088202c | Jardim S. Lázaro | park | overture:af7ebac3-0fcd-4169-8e49-78f58e6aa39d "Jardim De S. Lázaro, Porto" (park) at 81 m, sim 0.77 |
| 4bcdcae8cc8cd13a6b18c3cf | Praia de São Pedro de Moel | beach | curated:osm:way/203467481 "Parque de São Pedro de Moel" (park) at 149 m, sim 0.87 |
| 4bd722675631c9b61a09a730 | Passeio das Tágides | park | curated:fsq:5cd44454fc9e94002c252ac9 "Lago das Tagides" (historical_landmark) at 281 m, sim 0.80 |
| 4c07a33b8a81c9b6307a2790 | Praia da Sacor | beach | overture:3988be21-04b9-4218-803a-38db2f0db2cc "Praia da Memória" (beach) at 88 m, sim 0.73 |
| 4c1b89913b2ab7133a2a3325 | Jardim do Solar dos Zagallos | park | overture:5b589fa7-0101-4ff2-8a50-75e8906428ab "Solar Dos Zagalos" (historical_landmark) at 79 m, sim 0.76 |
| 4c261a25c11dc9b644462824 | Praia da Morena | beach | overture:ba8b4f34-a675-4b33-b25b-7913a861e9c3 "Praia do Rei" (beach) at 348 m, sim 0.74 |
| 4c513fcc0ef3a5936970ac7b | Praia da Bela Vista | beach | overture:e954d8d0-6dc3-4c9a-a357-750e2f00ed3f "Praia Naturista da Bela Vista" (beach) at 244 m, sim 0.79 |
| 4c5e61886ebe2d7facb1d52e | Parque Municipal Guarda | park | curated:fsq:4de894dc45dde4a28d533dab "Estádio Municipal da Guarda" (stadium) at 247 m, sim 0.72 |
| 4c61c2afde1b2d7f6aabe070 | Largo do município de Silves | plaza | overture:67e3d990-e5cf-4ba3-8d20-7b7d44ade8c1 "Arquivo Municipal de Silves" (museum) at 92 m, sim 0.76 |
| 4c657714e2ee9c74af622d2f | Praia Vale do Garrão | beach | overture:7d23b4b0-3bfa-45cd-81ab-7d94703704b7 "Praia do Garrão" (beach) at 200 m, sim 0.86 |
| 4c7582fcb474a1cd0b7db9bf | Praia de Alcochete | beach | overture:facbe356-473e-48e8-afb8-8d654ffa9f0e "Praia Fluvial De Alcochete" (beach) at 226 m, sim 0.82 |
| 4c7d2fb5d461a143c5587cf5 | Miradouro de Sao Martinho do Porto | viewpoint | overture:f8501baf-eb99-4b37-9433-17c6fe2195f0 "Igreja de São Martinho do Porto" (church) at 295 m, sim 0.86 |
| 4c7e4a75b7fbef3b87db3a14 | Largo da Boa-Hora à Ajuda | plaza | overture:517f3978-f48b-4c63-8f53-79e5c5f5da81 "A Funerária da Boa-Hora e Ajuda" (cemetery) at 79 m, sim 0.75 |
| 4ca6f0928882199c058743d4 | Parque da Cidade | park | curated:osm:way/138749827 "Parque da Avenida" (park) at 165 m, sim 0.79 |
| 4cb1b26ec5e6a1cd2d9edff6 | Parque de Albarquel | park | overture:c408f551-8ab5-4201-b6a4-1a856227c48e "Parque Urbano de Albarquel" (park) at 100 m, sim 0.84 |
| 4cbf6d8e0cc4b7132fb9ecf7 | Jardim da Quinta das Laranjeiras | park | overture:5c5976d6-b00a-4ad1-8673-dbbedd0456fd "Campo de Futsal da Quinta das Laranjeiras" (park) at 77 m, sim 0.77 |
| 4d1f16698629224b28940887 | Parque Felício Loureiro | park | curated:osm:relation/19690620 "Parque Urbano Felício Loureiro" (park) at 361 m, sim 0.87 |

## In-batch name near-misses — both imported, for curation

Kept rows sharing a normalised name 75–400 m apart. Under the contract both import (a name match needs the distance too); 6 pair(s), first 20:

| fsq_place_id | fsq_place_id | name | m |
|---|---|---|---:|
| 50d3ff97f31ce011b26ac55d | 50d5ce30e0e29b5b596ab90e | Parque Infantil | 300 |
| 4f9fbdb0e4b03a4a3f524e09 | 515322ffe4b0ed45ab518d81 | Praça Dr. António Padinha | 383 |
| 5406ee16498ecc1608139879 | 5406ee8f498e121490c90bd8 | Praia fluvial das flores | 89 |
| 55c87378498e81ab690c5376 | 594e70ea2496235e425b99af | Praia Fluvial das Minas de São Domingos | 225 |
| 592dce428d0a535029227a68 | 592dcffbc8b2fb4f2571fa62 | Cabeco Da Ponta | 104 |
| 6a34d871c899021bc00fda6a | 6a34d968723dd632c9358fa2 | Parque Infantil Da Algodeia | 214 |

## Samples of would-insert rows, per leaf

### Scenic Lookout — 940 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d947f8f3048b1f78c073264 | Caracol da Graça | Lisboa | 38.71621 | -9.13198 | viewpoint |
| 4e1b0bfe2271aba9379b0874 | Centro de Interpretação da Batalha do Vimeiro | Lourinhã | 39.24078 | -9.30944 | viewpoint |
| 4e62135a483bd9a97426e60d | Santuário Nossa Sra Dá Carvalha |  | 41.00804 | -7.38973 | viewpoint |
| 4ec96e11b634b2fd76c19fed | Sra. Da Encarnaçao |  | 40.16047 | -8.86924 | viewpoint |
| 4f6f2584e4b0a235d8317a1f | Cabeço da Neve |  | 40.55365 | -8.18254 | viewpoint |
| 4f927764e4b00fe65e5d568c | Miradouro Da Atalaia |  | 38.70839 | -8.92154 | viewpoint |
| 4ffc4070e4b0f8c151b255f1 | Monte de Santa Luzia | Parede | 38.69411 | -9.35530 | viewpoint |
| 51566d69e4b0a92e80d12b2a | Biatch |  | 41.09548 | -8.65830 | viewpoint |
| 517d62a3498e982bba4f3e7f | Miradouro Varanda dos Carqueijais |  | 40.27323 | -7.44658 | viewpoint |
| 520f5dbf11d24d6197f68de6 | Mirante de Linhares |  | 40.53033 | -7.45005 | viewpoint |
| 53efdc0f498e92f15f35c116 | Vale Formoso |  | 37.16059 | -7.65946 | viewpoint |
| 58049e8438fa14afcdbce3f7 | Casinha Dos Aviões |  | 41.72247 | -8.82819 | viewpoint |
| 59171c22c8772e6942f2a0ee | Miradouro da Boa Vista | Lamego | 41.11119 | -7.83037 | viewpoint |
| 5aac0d5c4c954c318f501cb2 | Ponta Do Trovao | Peniche | 39.37076 | -9.38498 | viewpoint |
| 5f3e9cf524b6ac29b3999952 | Miradouro Da Preguiça | Velas | 38.67957 | -28.21085 | viewpoint |
| 6141e82e554a3e5aab6f9ecd | Birdwatching - Foz Da Ribeira De Figueiró | Amieira do Tejo | 39.54201 | -7.81282 | viewpoint |
| 63848926a8609662826cf98b | Miradouro Dos Barros | Лиссабон | 38.71838 | -9.13125 | viewpoint |
| 63f3ba9527a28a67e5ee30f7 | Miradouro Pico do Fortim | Porto da Cruz | 32.77559 | -16.82710 | viewpoint |
| 663fa5b19b4700188366270e | Miradouro Da Falésia Do Carvoeiro | Carvoeiro | 37.09321 | -8.46742 | viewpoint |
| 69f6377d9c089b739b9c1003 | Miradouro Águas Do Tua |  | 41.21563 | -7.41984 | viewpoint |

### Park — 670 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b0588a3f964a5205ad122e3 | Jardim de Seteais | Sintra | 38.79658 | -9.39903 | park |
| 4d20a0b56e8c37043f17fb9f | Parque Canal de São Roque | Aveiro | 40.64337 | -8.65728 | park |
| 4d39a939bf6d5481ae87c5e1 | Parque de Merendas da Comenda | Setúbal | 38.54471 | -9.05332 | park |
| 4df76c6db61c40d585ec9524 | Reserva Florestal dos Mistérios de São João |  | 38.41772 | -28.36082 | park |
| 4e2c6043d164223a698b8ce8 | Parque Urbano de S. Mamede | Matosinhos | 41.19677 | -8.60126 | park |
| 4e374a901f6ebc502cdfaf6a | Campo De São Paulo | Almada | 38.67979 | -9.16428 | park |
| 4e4e3ed6b0fb088f3c0a1d6b | Miradouro Serra Boa Viagem | Figueira da Foz | 40.20239 | -8.87987 | viewpoint, park |
| 4e898fc461af8a2835aab836 | Parque Merendas Vila Franca Beira | Oliveira do Hospital | 40.43973 | -7.86534 | park |
| 4f4e1684e4b0ca29924be4df | Parque General Vassalo e Silva | Oeiras | 38.70816 | -9.23123 | park |
| 4f743814e4b0bb6ea1dab3aa | Parque Municipal de Santa Cruz | Santa Cruz | 39.13107 | -9.38116 | park |
| 4fccc963e4b093c3859326bb | Parque Verde Mondim | Mondim de Basto | 41.41078 | -7.95647 | park |
| 50f1aa46e4b0e33ec4ea749a | Quinta da Junta |  | 32.72444 | -16.84213 | park |
| 514d9ef1e4b0be82f9a22ac8 | mata das mestras |  | 39.46962 | -9.04806 | park |
| 5208f13b11d252a894d4c831 | Jardim de Salto |  | 41.63925 | -7.94950 | park |
| 54860e70498ed8a19e7930af | Arraial das ermidas | Coimbra | 40.30679 | -8.12987 | park |
| 59eca481b2958f5a4fc6f9e0 | Jardim Das Artes | Covilhã | 40.27177 | -7.49841 | park |
| 5b241400811045002cedb7df | Festa Do Morango De Azeitão | Setúbal | 38.54436 | -9.02820 | park |
| 5d0a6acb838e59002c92fe75 | Parque João José Luiz | Castelo de Vide | 39.41397 | -7.45350 | park |
| 642da93408eb6c3626e6f5f2 | Parque Verde Da Vala Dos Amiais | Torres Vedras | 39.09967 | -9.25932 | park |
| 676e91fb82adc66dcc391f95 | Parque De Autocaravanas Óbidos | Óbidos | 39.35594 | -9.15688 | park |

### Garden — 626 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 2aa8b09aa11047130e34a96e | Teresa F Manso Data | Faro | 37.01737 | -7.92828 | park |
| 4d63f2b8bd25370454a1d3c5 | Jardins Garcia de Orta | Lisboa | 38.77192 | -9.09226 | park |
| 4d6a8be04c4637049d95b1b3 | Jardim da Alta de Lisboa | Lisboa | 38.77992 | -9.14885 | park |
| 4e25632718388c58be2b0f62 | Quinta das Palmeiras | Farrobo | 33.06028 | -16.33687 | park |
| 4e5a518262e1de72f6fd1294 | Parque Urbano Quinta de S.Mateus |  | 40.28930 | -8.70403 | park |
| 4e6e3fe314955284ba9bde90 | Jardim Quinta Das Campainhas | Lisbon | 38.76689 | -9.16285 | park |
| 4e903d1002d5ee38b6b066cb | Largo De S. Brás |  | 37.12878 | -7.64761 | park |
| 4ef72fcf775b54cdb446a960 | Villa Costa |  | 41.63012 | -8.43120 | park |
| 4f3bb5a7e4b08ca0e812c2f3 | Jardim do Alto de Santo Amaro | Lisboa | 38.70437 | -9.18455 | park |
| 50154218e4b0073bd0c264c4 | Jardins de Ponte de Lima |  | 41.76200 | -8.58335 | park |
| 5028c68de4b0235588587887 | Jardim da Câmara Sátão |  | 40.71552 | -7.74563 | park |
| 50718b65e4b08143e90427bc | Roseiral | Arco de São Jorge | 32.82537 | -16.95119 | park |
| 522b208011d2d4537d43dc61 | Talude |  | 38.81129 | -9.11484 | park |
| 52449558498e4c8996981241 | hyde park |  | 38.56678 | -7.90194 | park |
| 539b76a9498eae48dd87d9dc | bailarico da aldeia |  | 37.72425 | -8.78102 | park |
| 5b3f2d9a16fa04002cf5c188 | Romantic Garden | Lisbon | 38.71270 | -9.13363 | park |
| 5eb275312281c60008692941 | Garagem Nova - João, Lopes & Oterelo Husqvarna Monção | Moncao | 42.06861 | -8.48389 | park |
| 5eb28508597345000885fe60 | MS Pedrosa Husqvarna Pombal | Pombal | 40.01878 | -8.68884 | park |
| 60bf8fe7027e130bf225c791 | Jardim Mário Soares | Lisboa | 38.75473 | -9.15242 | park |
| 7ec044c825b14c2823905dae | Teleflora-Exportação, Importação e Negócios de Flores | Lisboa | 38.75506 | -9.15384 | park |

### Beach — 580 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4bcdcae8cc8cd13a6b18c3cf | Praia de São Pedro de Moel | Marinha Grande | 39.75545 | -9.03221 | beach |
| 4c77e8cc9f51a0935788b627 | Praia fluvial de Almaceda | Almaceda | 40.04494 | -7.76690 | beach |
| 4c7fd8c3dc018cfa4429b76c | Praia do Pinhão | Lagos | 37.09561 | -8.67046 | beach |
| 4dd925c51f6ee146834c3e19 | Praia do Infante | Costa de Caparica, Setúbal | 38.60022 | -9.20906 | beach |
| 4e148bc0d4c023f7053ffffd | Funinha Caves | Caldas da Rainha | 39.35675 | -9.39036 | beach |
| 4e2ad88f52b1b8f1985a6494 | Praia do Teimoso | Figueira da Foz | 40.17611 | -8.89737 | beach |
| 4e426d521838ada3db5ca0d3 | Praia De Alfarim |  | 38.46141 | -9.19181 | beach |
| 4e5bb63062e1de72f70ec0e8 | Praia da Boa Nova |  | 41.21931 | -8.71422 | beach |
| 4e903e2429c2117fa3bb52d8 | Praia de Porto de Barcas - Praia Grande |  | 39.22941 | -9.33976 | beach |
| 50224f16e4b0da2fd1ecbc8a | Praia Fluvial de Piódão |  | 40.22949 | -7.82630 | beach |
| 502f62d2e4b060c1a55a497c | Praia do Porto das Carretas |  | 38.07581 | -8.77895 | beach |
| 5159cc5ae4b041a9aa6d1094 | Praia dos Estudantes | Lagos | 37.09746 | -8.69294 | beach |
| 53611498498ebd97994889e5 | WindSpirit Club Kite & Sup Beach Spot | Praia Da fonte Da Telha | 38.57804 | -9.19800 | beach |
| 53c6803e498e8f97383501e6 | estou na praia, não digam que não |  | 38.75011 | -9.13057 | beach |
| 55a69323498e608a38f914c9 | Eurotel Beach Café |  | 37.17305 | -7.49728 | beach |
| 57c4281e498e83e89fb3affe | Lagoa Lajes do Pico | Lajes Do Pico | 38.39785 | -28.25332 | beach |
| 5d3f21ea5b48d50008de57e5 | Praia Da Pedra Da Bica |  | 37.53280 | -8.78615 | beach |
| 64ce2fe12d82ba4709999437 | Praia da Biarritz | Gafanha da Encarnação | 40.62842 | -8.74517 | beach |
| 64e0daef80ef56679a53f08b | Praia Da Boneca | Lagos | 37.08407 | -8.66711 | beach |
| 670e9c012841a92b1a884e02 | Casa Dunas | Olhão | 37.01730 | -7.80110 | beach |

### Playground — 520 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c06ae60a0129c743b60d2c9 | Timex | Sobreda | 38.63643 | -9.19034 | playground |
| 4c71805bfa49a1cd921da9e3 | Alampada Parque Infantil |  | 40.25274 | -7.49915 | playground |
| 4d98993297d06ea8d53f370b | Party Zone |  | 41.55245 | -8.42298 | playground |
| 4d9caabcbaae5481419be064 | Parque Infantil Do Gimnodesportivo |  | 38.87798 | -9.07452 | playground |
| 4df64d316284fefe8fcb9143 | Park Quintas Pina | Almada | 38.59769 | -9.18151 | playground |
| 4e2834d5a809ec0663eb71ff | Funland | Seixal | 38.60596 | -9.09412 | playground |
| 4e36c7f018a82fdd65843899 | BRISOL Playground | Santa Cruz | 32.69061 | -16.77634 | playground |
| 4e550f9ed22dad218e045163 | Parque Infantil | Castanheira do Ribatejo | 38.99411 | -8.97387 | playground |
| 4e860c0c469035fb8be4ddb8 | Parque Infantil De Sto Ovideo |  | 41.11789 | -8.60806 | playground |
| 4eb02ef093ad8dcab7257aec | Parque Infantil Jardim da Estrela | Lisboa | 38.71478 | -9.15795 | playground |
| 4fd245dde4b06836037d7286 | Parque Infantil dos Chorões |  | 40.85564 | -8.37775 | playground |
| 4fdccd10e4b018d078bc90ca | Parque Infantil Cruzado Osberno |  | 38.72533 | -9.11642 | playground |
| 5054518ce4b0719d67a5df89 | Parque Infantil do Bairro Nova Sintra | Póvoa de Varzim | 41.37998 | -8.75229 | playground |
| 520f8e87498edf17255a9ca9 | Parque Infantil | Grândola | 38.17396 | -8.56477 | playground |
| 522b2787498e6c517d5947df | Parquinho | Odivelas | 38.78142 | -9.19152 | playground |
| 540547417fc64d55b99ccf25 | Fabrigimno - Fabricação de Material de Desporto | Alverca do Ribatejo | 38.89122 | -9.05560 | playground |
| 58e0df1c9f8b867ea06e0b69 | TimeOut Playground | Lissabon | 38.70728 | -9.14664 | playground |
| 5d9136929923820008f8d8f7 | Parque Infantil D. Afonso Henriques | Lisboa | 38.73745 | -9.13276 | playground |
| 68f788c0a8365e1a9b7807b1 | Parque Infantil Rua Eng. Américo | Porto Moniz | 32.86758 | -17.16825 | playground |
| 69e8ae505ddcd71d4fb17cde | Parque Infantil Da Tebaida | Setúbal | 38.52906 | -8.88383 | playground |

### Plaza — 374 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c4a3ded959220a1532dd40d | Campo de São Francisco | Ponta Delgada | 37.73779 | -25.67249 | plaza |
| 4d35c675c6cba35d04983f7a | Praça 5 de Outubro | Cascais | 38.69696 | -9.42038 | plaza |
| 4dc52fb6d4c0ad9c0f809bd2 | Largo de Pardilhó | Pardilhó | 40.79647 | -8.62470 | plaza |
| 4e676c387d8b084ac7508f5d | Largo de Jesus | Lisboa | 38.71208 | -9.15036 | plaza |
| 4e93581729c27df46905136c | Praça da Republica | Couço | 38.98764 | -8.28506 | plaza |
| 4f18cf95e4b0b62f9ab24017 | Praceta Mário Henrique Leiria | Alfornelos | 38.76125 | -9.20416 | plaza |
| 4f2da8fee4b094acc4fc48f9 | Praça 5 De Outubro | Caldas Da Rainha | 39.40349 | -9.13646 | plaza |
| 4f9c0dd1e4b03d83ec74618d | Largo da Freiria |  | 40.21078 | -8.42881 | plaza |
| 50576a6ee4b0001ed529b97c | Largo Barão de S. Martinho | Braga | 41.55089 | -8.42323 | plaza |
| 507d9f0445b0db68338edc2b | Largo da Feira de Paredes | Paredes | 41.20407 | -8.32921 | plaza |
| 51324acbe4b00e1a657a1b1f | Largo da Picaria |  | 41.40972 | -8.51871 | plaza |
| 52bdb65d498ed3ee29073adb | Largo António Joaquim Correia | Setubal | 38.52277 | -8.90033 | plaza |
| 56d843b7cd1086c7ff34b646 | Praceta Mario Botas |  | 38.75401 | -9.27849 | plaza |
| 5721f453498e576799dbfdc2 | Praça Ramiro Pinto de Meireles | Paredes | 41.20655 | -8.33249 | plaza |
| 5991e9804febd5423ed21fa8 | Largo  Conselheiro Antonio Candido | Madalena | 41.26843 | -8.07480 | plaza |
| 5eef403c4f80b40008204c71 | Largo João de Deus | Abrantes | 39.46240 | -8.19744 | plaza |
| 62fb8c22c5b85e5b7ef5648d | Praça dom dinis | Trancoso | 40.77853 | -7.34949 | plaza |
| 66e854804bf0cd0dd9cf796e | Praca Do Muncipio | Peso da Régua | 41.16200 | -7.79000 | plaza |
| 673f8136fc8a31395d2255c5 | Largo Machado | Lisboa | 38.74706 | -9.13965 | plaza |
| 69860a7adfe7ea214835ec1c | Praça Ayrton Cena | Alcabideche | 38.75240 | -9.38864 | plaza |

### Pedestrian Plaza — 9 would insert, sample of 9

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 5464c4a9498e6665f12e8342 | Largo de Alberto Pimentel |  | 41.14999 | -8.61498 | plaza |
| 546f3286498e96a88ffdde45 | Alameda General Humberto Delgado |  | 42.07929 | -8.48027 | plaza |
| 5518157a498e2dd5c06149cb | Passadiço Moínho do Cabo |  | 38.65923 | -9.08337 | plaza |
| 56a60891498e6ee2fcdfd149 | Largo Aljubarrota | Vila Nova de Gaia | 41.13728 | -8.61775 | plaza |
| 645d4b804e67d0287f4d691c | Largo De Miguel Bombardo | Vila Nova de Gaia | 41.13750 | -8.61253 | plaza |
| 645fdbc455fc495e0e4a8dff | Alameda De São João | Ponte de Lima | 41.77000 | -8.58449 | plaza |
| 65edfed43942206c024c048c | Largo Cais Herculano | Albufeira | 37.08707 | -8.24996 | plaza |
| 66bd28d2acb8a660d097000a | Praça Da Igreja | Celeirós | 41.24199 | -7.55740 | plaza |
| 672f943280e2c512f7838c56 | Praça Da República | Azeitão | 38.51900 | -9.01279 | plaza |

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

### tier 2 leaf — 62, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4c6a943c3bad2d7fe8b7b2ee | Ilha da Armona | Olhão Municipality | Island | Island (tier2) |
| 4e418f8762843d0c833ac5a3 | Ilha de Cabanas | Tavira | Island | Island (tier2) |
| 5017944de4b033fdaf8480c8 | Ilhas Desertas |  | Island, Nature Preserve | Island (tier2), Nature Preserve (unmapped) |
| 50256b15e4b06e6f053101ba | Ilha do Vale Manso | Abrantes | Island | Island (tier2) |
| 50c346b9e4b00ce4a445cfe8 | Casal D'Alvaro | Águeda | Island | Island (tier2) |
| 513c74c9e4b05d5c31ad7fac | Ilha da Morraçeira |  | Island | Island (tier2) |
| 5220cb9511d2113fc43917d4 | Ilha da Culatra | Olhão | Island | Island (tier2) |
| 525d367211d20416c70a5603 | Relax |  | Island | Island (tier2) |
| 52abc8d611d21901685357b5 | Mekan 10 & 33 & 63 & 27 |  | Island | Island (tier2) |
| 54391059498e5113f87bf090 | Em alto mar |  | Island | Island (tier2) |
| 56f7f754498e310539835d44 | Urbanização Campos Verdes |  | Island | Island (tier2) |
| 57950d19498e68dfd62a7ff9 | Ilha russa de troia | Setubal | Island | Island (tier2) |
| 5973675246e1b64b6b0f7bfd | Hangares | Faro | Island | Island (tier2) |
| 5c75c75ad03360002ce7ccee | Ilha De Coin | Gião | Island | Island (tier2) |
| 5ceae799b399f7002c850aa5 | Ilha dos Amores | Oeiras | Island | Island (tier2) |
| 61557e7c07f22f635c4df043 | São Jorge |  | Island | Island (tier2) |
| 62c2b4bc75b49a7dc9d79e7e | Ilhéus Das Cabras | Angra do Heroísmo | Island | Island (tier2) |
| 6a2a7de93bd7572895b0a920 | Ilhéu De Cima | Porto Santo | Island | Island (tier2) |
| 6a6dfad09b1b6f1dc2139ce6 | Santa Maria | Vila do Porto | Island | Island (tier2) |
| 6a720038363bcd3a9f767f87 | Ilhéu do Romeiro | Vila do Porto | Island, Other Great Outdoors | Island (tier2), Other Great Outdoors (noise) |

### unmapped leaf — 18,444, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 2eb8fd7e3d6e415ea5993f5a | Rampa Clube | Porto | Night Club | Night Club (unmapped) |
| 4cc93e684650a35d372c8d1e | Casa Museu Teixeira Lopes |  | History Museum | History Museum (unmapped) |
| 4ce6e4ef678aa09346fbdeea | Teatro-Estúdio Mário Viegas |  | Theater | Theater (unmapped) |
| 4df2421a1f6e818dadfbe00c | Campiferias | Vila Nova de Milfontes | Campground | Campground (unmapped) |
| 4e44f4d61495455b10d38a3f | PRINCE Tennis Academy @ Sheraton Algarve Pine Cliffs | Albufeira | Tennis Stadium | Tennis Stadium (unmapped) |
| 4e5e9073a809fd79d29aaaa8 | Dog |  | Dog Park | Dog Park (unmapped) |
| 4ea6cdaf6c255b8d9db84be6 | Anagon |  | Performing Arts Venue | Performing Arts Venue (unmapped) |
| 4f0f2cd1e4b0ac27398dcb4f | Insectozoo (Museu de Insectos Sociais) | Cuba | Museum | Museum (unmapped) |
| 4f43b31be4b0899cce7cb912 | Campo Bom Jardim Ponte Frielas |  | Soccer Stadium | Soccer Stadium (unmapped) |
| 501d2ac2e4b0f5050be15c1b | Cantinho Dos Ingleses |  | Surf Spot | Surf Spot (unmapped) |
| 5032cfd8e4b04dcc1ba67313 | Assembleia de Deus rua 18 | São Lourenço Da Mata | Church | Church (unmapped) |
| 50fd671be4b01d6668ed8ec3 | Serra da Arrábida | Setúbal | Mountain | Mountain (unmapped) |
| 52ea40fb498e7ad065a23200 | Feira dos Trinta |  | Fair | Fair (unmapped) |
| 534c4ba2498e16359c2f541f | Igreja Nossa Senhora da Graça | Mondim de Basto | Church | Church (unmapped) |
| 550e5a9f498e2a7e904b0fad | Clube 810 - DJ Boot |  | Night Club | Night Club (unmapped) |
| 57446ccf498e6ad558b4d17c | Estádio do Oliveira do Douro | Vila Nova de Gaia | Soccer Stadium | Soccer Stadium (unmapped) |
| 5afedbd74940bc002cf8aeaf | PLM PR3 - Percurso Pedestre na Serra de São Luís | Palmela | Hiking Trail | Hiking Trail (unmapped) |
| 64ce52fea720221fa3565c08 | Igreja Paroquial Do Junqueira | Junqueira | Church | Church (unmapped) |
| 65eb5581e780981689f911fc | Arco Da Rua Monsenhor Boto | Faro | Historic and Protected Site | Historic and Protected Site (unmapped) |
| 68e26be442ca043929df92cd | Igreja de Vila Pouca de Aguiar | Vila Pouca de Aguiar | Church | Church (unmapped) |

### empty name — 8, sample of 8

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4ff8adede4b0f331635bb678 | Иаксик |  | Scenic Lookout |  |
| 515d42a2e4b0d709edeaafe5 | На Океане |  | Beach |  |
| 51d9c910498eee6a285961be | Пляяяж!))))) |  | Beach |  |
| 522608bc11d26d866a7dabe2 | Океян |  | Beach |  |
| 53e5b881498e6a14dc180205 | Белые пески |  | Beach |  |
| 5dace87151d9b400086f2fc0 | Матошинас Пляж | Matosinhos | Beach |  |
| 66295e5dfce85d5090a99444 | Парк Санта Катаріна | Funchal | Park |  |
| 683c81c4c02943682c49d3e0 | 이름 없는 전망대 | Aljezur | Scenic Lookout |  |

### held for review — 298, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4d18c91f81cea35dc91af0ec | Avenida António Augusto Aguiar | Lisboa | Park | a street, roundabout or estate name under a place leaf |
| 4e0502231495e0c5a5d2df0c | Febres | Cantanhede | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4e0545ef8877394591d8931c | Rua Antonio Alrixo | Oeiras | Garden | a street, roundabout or estate name under a place leaf |
| 4e614bc0483bd9a973d458cf | Quintela de Baixo | Braga | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4e919b9d29c2117fa440de2b | Coreto | Loures | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4eab20e882312ec2f6cd6c67 | Paraíso, Delães | Vila Nova de Famalicão | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4ee355c46da14e7d989a83df | Negrais | Sintra | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4eff9c8b02d580f8efbb2830 | Esplanada António Silva Guimarães | Figueira da Foz | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4f2863397beb6b2df86b446b | Rua Capitão José Pacheco | Setúbal | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4fd66034e4b02bbdc6d00e94 | Bairro Do Frei Aleixo |  | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 4fe04d90e4b0ac20bec7a932 | Plaza De La Ribera |  | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 50361a41e4b0006c00955704 | Bairro Nova Sintra | Póvoa de Varzim | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 5210a54c11d230adcd12d56d | Mercado do Tapado |  | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 5259eaef498e5d8e7e0bde36 | Pinheiro |  | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 53b9bae5498e1170f3228e4c | Cantanhede, Portugal |  | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 5499f8f0498e9c099edcdc3d | 3 Estrelas |  | Pedestrian Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 57d5c8b2cd1076ef2a0f95f3 | Rua 25 de Abril | Lagos | Pedestrian Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 5d6670b6228cfc0008c3c6fb | Coreto | Nordeste | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 6107e8964fe40b1660520e23 | Pelourinho De Beja | Beja | Plaza | plaza whose name is not a square (street, roundabout, village, event) |
| 6464c5b5cf01c415e09b6dd7 | Av. De Ramos Pinto | Vila Nova de Gaia | Pedestrian Plaza | plaza whose name is not a square (street, roundabout, village, event) |

### matched — 2,353, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4b9d0b10f964a520c78a36e3 | Praia do Almograve | Almograve | Beach | overture:da813561-248d-4049-bba9-4d815373f7fa "Bar da Praia do Almograve" (bar) at 13 m, sim 0.90 |
| 4c445d0f56a7ef3b163dce21 | Praia do Forno | Vila do Conde | Beach | overture:bb6deafa-ad56-4246-8a16-335e9ac0e81f "Praia do Forno" (beach) at 67 m, sim 1.00 |
| 4c4b2950f7cc1b8dac53803f | Praia Fluvial dos Olhos d'Água | Alcanena | Beach, River | overture:a79a9fdf-6420-408f-9a7f-408e92625c27 "Praia Fluvial dos Olhos d' Água" (beach) at 0 m, sim 1.00 |
| 4cadec9c632b37046e6e6b6e | Alameda D. Afonso Henriques | Lisboa | Garden, Plaza | overture:ebf67cfe-5245-48e0-9307-e2e0db3ace33 "Alameda" (historical_landmark) at 64 m, sim 0.90 |
| 4d286800b818a35d63c7948a | Rabaçal | Rabaçal | Scenic Lookout | curated:fsq:4d838b795e70224b83e1f908 "Casa do Rabaçal" (hiking_area) at 22 m, sim 0.90 |
| 4d542eabbbbf3704f9a93d78 | Parque florestal do Fontelo | Viseu | Park | overture:9bcbd634-f6f1-4691-8eba-599719aa3067 "Parque Florestal do Fontelo" (park) at 39 m, sim 1.00 |
| 4d8fae3fd08559418cdf1387 | Largo do Limoeiro | Lisboa | Plaza | overture:48082b8f-7ef6-46e4-809e-6744b474a495 "Largo do Limoeiro" (plaza) at 13 m, sim 1.00 |
| 4dbed4bb4b222080d3c92b1a | Largo de São Cristovão | Lisboa | Plaza | overture:bd323739-7537-4484-a5e7-e10bf21deb8d "Escadinhas de São Cristovão" (historical_landmark) at 28 m, sim 0.73 |
| 4de1263be4cd846e409aaf13 | Skate Park da Maia | Maia | Park | overture:06b2cd85-fd47-401d-896e-a47fdfaa4658 "Skate Park da Maia" (park) at 0 m, sim 1.00 |
| 4e3b30aa814ddc29c4253f47 | Largo dos Carvalhinhos | Felgueiras | Plaza | overture:3dbe9580-e40f-426d-835b-70e60056f89e "Cafe dos Carvalhinhos" (restaurant) at 73 m, sim 0.84 |
| 4e46e73845dd2955e59ea42c | Jardim Afonso de Albuquerque | Lisboa | Garden, Park, Plaza | overture:fc515adc-1495-41cd-b72f-ed4a47e67d07 "Praça Afonso de Albuquerque" (historical_landmark) at 30 m, sim 0.84 |
| 4e7f02d2b6342b7532aba8bc | Praia Do Túnel | Albufeira | Beach | overture:711325a8-5ddf-4484-9c36-ef1beb1e620c "Esplanada do Túnel" (restaurant) at 47 m, sim 0.75 |
| 4ffad876e4b0cfb3712cc39b | Parque da Cidade | Castelo Branco | Park | overture:601f6cdd-d9d7-48c5-8ef6-628b0a7b609b "Parque da Cidade" (park) at 12 m, sim 1.00 |
| 501dd2f8e4b00558f2767a3a | Baixa da Ribeirinha |  | Beach | overture:217c3a0d-5367-42ce-814d-8f5d9d038432 "Baixa da Ribeirinha" (beach) at 4 m, sim 1.00 |
| 50d08478e4b00db5a34f7332 | Meio Da Baía |  | Beach | overture:548beb72-52b9-41cc-9cc5-07555ddb497a "Meio da Baía" (beach) at 4 m, sim 1.00 |
| 51e98f03498e46950d174721 | Mercado Fusão | Lisboa | Plaza | overture:e393e9e6-2a1b-48c9-9402-af1bfd652ec2 "Mercado de Fusao" (historical_landmark) at 39 m, sim 0.90 |
| 53c0535a498e9b8b5d291b18 | Largo de Santo António | Alcains | Plaza | overture:9a30c447-7f34-4fbc-b15a-a62ad52a0dbf "Largo de Santo António" (plaza) at 0 m, sim 1.00 |
| 5b783a731543c7002c1d336c | Parque de Lazer de Macieira da Lixa | Felgueiras | Park, River | overture:f3b9e914-6f49-472e-bc04-484a36a54b3e "Parque de Lazer de Macieira da Lixa" (park) at 3 m, sim 1.00 |
| 5c83cb785c6838002c579fce | Parque De Merendas De Quinchães | Fafe | Park, River | curated:fsq:5c83cb785c6838002c579fce "Parque De Merendas De Quinchães" (river) at 0 m, sim 1.00 |
| 5eb3d9ac4bf8dd0008e361eb | Motocastelo Husqvarna Castelo Branco | Castelo Branco | Garden | overture:1c3a7539-b0e7-457b-8df0-590787d198dc "Motocastelo Husqvarna Castelo Branco" (store) at 4 m, sim 1.00 |

### matched (translated) — 15, sample of 15

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4bc1ef0aabf495213da1c193 | Palácio de Monserrate | Sintra | Garden, Historic and Protected Site, Monument | overture:d42064f4-d155-4ae9-9ded-b5a1ea598527 "Park and Palace of Monserrate" (historical_landmark) at 11 m |
| 4c71059ed97fa14395bdf7ca | Praia da Amoreira | Aljezur | Beach, Surf Spot | overture:e86a6488-1be9-478b-8f3d-0ac0899c853e "Amoreira Beach, Aljezur, Algarve" (beach) at 12 m |
| 4c7574c4b474a1cd2c54b9bf | Praia das Adegas | Odeceixe | Beach | overture:8aa1561c-31f7-4de1-b469-576d173b23dd "Adegas Beach" (beach) at 22 m |
| 4d1a06a56d10370498f14bbd | Praia de Galápos | Setúbal | Beach | overture:6b56dbe6-4254-46af-b223-6c82eee31a5b "Galapos beach" (beach) at 22 m |
| 4dd98f131838b8561d1c9097 | Praia do Fuzelhas | Matosinhos | Beach | overture:dc36b5da-259c-4cbb-afb2-31fbcf37c32b "Praia de Fuzelhas em Matosinhos" (beach) at 7 m |
| 4eefa62ae300215596024ed1 | Jardim do Carregal | Porto | Garden | overture:7c62ce11-e2e9-403a-96af-6cd55cf827d6 "Jardim no Carregal, em Porto, Portugal" (botanical_garden) at 9 m |
| 5152da7ce4b008e06241bbd5 | Jardim Botânico do Faial | Horta | Garden | overture:65b92370-526e-4166-a1bf-2f327360e678 "Botanical Garden of Faial" (botanical_garden) at 16 m |
| 53cd3b2b498e64dd2100fe09 | Praia Pedra da Eira |  | Beach | overture:7fd4362c-ef19-4fda-afb3-8f64696fc8bd "Pedra D'eira Beach" (beach) at 22 m |
| 567d9af6498e888ed31a0593 | Praia do Patacho | Vilanova de Milfontes | Beach | overture:ad6902dc-87a7-4d61-a3e0-1508b60df62a "Beach Patacho" (beach) at 6 m |
| 56f94705498e695190c5d3f5 | Praia da Cala |  | Beach | overture:5c8d7b23-b229-4080-97d2-b1bcacba80f4 "Praia Ponta Grande Cala" (beach) at 22 m |
| 57652c43cd1069907000d963 | Ermida da Guia | Horta | Church, Scenic Lookout | overture:201a7aca-2092-4527-86ef-48ee6acf58a5 "Ermida da Senhora da Guia" (church) at 13 m |
| 57c2f3bf498e5ecea838e4fa | Praia fluvial de Ereira | Ereira | Beach | overture:aab32928-57cf-426d-b37f-72018fd52542 "Ereira Beach" (beach) at 4 m |
| 652f871e766e4c904d5bde17 | Sanctuary of Our Lady of Sameiro | Braga | Park | overture:e21b2a87-2dd7-4c46-a9bd-3a79b7e00149 "Santuário do Sameiro" (church) at 6 m |
| 67125e3e7074bb2198b9f03f | Algés Beach | Algés | Beach | overture:fdd24941-972f-41fc-9a17-3447f716562a "Praia De Algés" (beach) at 7 m |
| 6744caf9e70401447ffed189 | Praça de República | Portimão | Plaza | overture:6e164d05-7ca4-4522-b402-ea2041917ba5 "Praça Da República Em Portimão" (stadium) at 8 m |

### weak name — 135, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4b847c05f964a520333831e3 | Terreiro | Leiria | Plaza | type words only |
| 4bd746c8f645c9b61b97a5e0 | Jardim | Lisboa | Playground, Plaza | type words only |
| 4d68ec2a4c463704a8ba9ab3 | Praia da Ponte |  | Beach | type words only |
| 4dbc50d893a08f9274bad4da | Salir do Porto | Salir do Porto | Beach | locality only |
| 4df919f6c65b6739205e99ce | Spot | Sintra | Playground | type words only |
| 4dfe1a727d8b3050801a4991 | Praia da Marina | Loulé | Beach | type words only |
| 4e491c8caeb70e74f4b65f0b | Spot | Loulé | Beach | type words only |
| 4e831407d22d58ee81e30550 | Jardim | Coimbra | Park | type words only |
| 4e996cc46c252a15c16b5e83 | Praia Velha | Esposende | Beach | type words only |
| 4f80aaade4b0bc14174cbb4c | Parque |  | Park | type words only |
| 4f944087e4b04c3ffa6a6a48 | Piscina Natural |  | Beach | type words only |
| 50006b67011cc53433cf82b5 | Terreiro | Brotas | Plaza | type words only |
| 519f3f8d498ed846e3603b36 | Jardim Municipal |  | Garden | type words only |
| 51e9bef4498e2c4c74eafeee | Ilha do farol | Olhao | Beach | type words only |
| 5350019b11d2e2ba1dffabb0 | Jardim das Ondas |  | Garden | type words only |
| 58f389e1e65d0c4b189ed38f | Praia Velha | Paço de Arcos | Beach | type words only |
| 5dc7482d5f909d00070c9f6e | Plaza | Lisboa | Plaza | type words only |
| 663f90e2264d3a260e6b475e | Aussichtspunkt | Santa Cruz | Scenic Lookout | type words only |
| 666ade704d275561647a4fd0 | Jardim da Ribeira | Viseu | Garden | type words only |
| 69e356dbd6c0ae097aea9f94 | Aussichtspunkt | Alferce | Scenic Lookout | type words only |

### suspect — 749, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4b570f03f964a520bc2428e3 | Praia de Carcavelos | Carcavelos | Beach, Surf Spot | same name 349 m from overture:8218706a-840c-46c9-a0b7-cb2f822b1949 "Praia de Carcavelos" (beach) |
| 4c2239d199282d7f1ac266b0 | Jardim Soares dos Reis | Vila Nova Gaia | Garden | same name 145 m from overture:ac825f2b-8ccc-46a7-9cae-48a2656f149a "Jardim Soares Dos Reis" (park) |
| 4c640d3d86b6be9acafd8f34 | Miradouro da Nazaré | Nazaré | Scenic Lookout | same name 167 m from overture:a6a0928e-6650-44f4-9d75-72fdda97b298 "Miradouro" (historical_landmark) |
| 4d1f18bbc03c5941607e47cc | Praia da Gambôa | Peniche | Beach | same name 90 m from overture:95de60bd-31c6-4500-bcc1-a4133e5e2e27 "Praia da Gambôa" (beach) |
| 4d93a2549ef2721e58d2c3d2 | Santa Maria do Monte |  | Scenic Lookout | same name 202 m from overture:3f02b9d4-4eab-4524-bdea-31bac133f618 "Centro Cultural, Rec. e Desp. de Santa Maria do Monte" (cultural_center) |
| 4dea4e4222713dd9738f26b8 | Matinha de Queluz | Sintra | Field, Park | same name 142 m from overture:dbe5e688-75ac-4aa8-ba63-a67d91220f98 "Mata de Queluz" (park) |
| 4df4f81db61cbd3ec020837a | Praia do Ancão | Almancil | Beach | same name 366 m from curated:fsq:644b8cb8cd112c6c438d9f5c "Passadico da Praia do Ancão" (hiking_area) |
| 4e272050fa7682ed23083c59 | Parque Municipal da Moita | Moita | Park | same name 120 m from overture:a867dbab-3e00-4c51-b06b-71489dcea63b "Parque Municipal da Moita" (park) |
| 4edf3817775bb52b6d89fb2f | Jardim Do Poço Bispo | Lisboa | Garden | same name 276 m from overture:40397f00-4881-42f8-b8fc-80370a5aa818 "Restaurante Jardim Poço Bispo" (restaurant) |
| 4f0974a5e4b0fcefa995522d | Campo Martires da Patria | Porto | Plaza | same name 159 m from overture:71e515bb-e96d-4bbf-b582-f8b41cfa8d79 "Campo Martires da Patria" (plaza) |
| 4f79d35de4b0488e311ad791 | Caxinas |  | Beach | same name 98 m from overture:89aa4f11-f16f-4b90-9ac9-7e8f3da4b0ef "Fidelidade Loja Caxinas" (financial_service) |
| 505f1c83e4b0a707685af7ef | Parque da Cidade | Vale de Cambra | Park | same name 246 m from curated:fsq:5071abcee4b015d0505e608d "Vias Variantes Ao Parque Da Cidade" (hiking_area) |
| 51e9bef3498e7a6eb19fa497 | Parque da Freguesia de Esgueira |  | Playground | same name 171 m from overture:a95fcfca-d9dd-4966-9e51-4c25c443bde4 "Esgueira" (bakery) |
| 52054d7911d2676ed9bab8c7 | Relógio Sortelha | Sortelha | Plaza | same name 162 m from overture:17b8e80c-c20f-4740-a2ba-553a61f71c6f "Sortelha" (historical_landmark) |
| 524ffef311d23977d9e7e47b | Chafariz Dos Canos |  | Plaza | same name 188 m from overture:7c10fbd5-00a6-41b7-8e85-6a287c17d266 "Chafariz dos Canos" (historical_landmark) |
| 5748929238fa56ed2ab8c97c | Praia Do Fontao |  | Beach | same name 156 m from overture:6b12c0dd-daca-4372-bc40-b744ecae10e3 "Praia do Funtão" (beach) |
| 5aeed2740dd31f0024a12cd7 | Parque Infantil Vale Das Flores | Coimbra | Playground | same name 358 m from overture:469b7a24-7929-4add-a72c-6e66890fe4ea "Vale das Flores" (florist) |
| 62f790c18c0264558f793677 | Spot Autocaravanismo Praia De Sao Torpes | Sines | Park | same name 122 m from overture:4eb3949c-d9e0-47fd-aaa6-26dd8a8e14ca "Praia de São Torpes" (beach) |
| 646a1a6bee3fbc55a3961aa4 | fajã d'além | Velas | Beach | same name 247 m from overture:c300440e-1dae-43e1-b759-bd20338e2ee0 "Fajã d'Alem" (historical_landmark) |
| 681cbdb0d714a54b594ed090 | Mirador Do Coimbra | Coimbra | Scenic Lookout | same name 330 m from overture:ff3f2916-b916-4da3-a0c3-33b0bc4b9247 "Coimbra" (restaurant) |

### in-batch duplicate — 40, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4d989de6744f37046c24f357 | Play Zone | Braga | Playground | same place as fsq:4d98993297d06ea8d53f370b |
| 4da9aa961e72c1ab9be0a543 | Praia Do Marreco | Matosinhos | Beach | same place as fsq:4c42f0b6af052d7f93a67f79 |
| 5071c438e4b09a19d8279cd6 | Parque Infantil | Amadora | Playground | same place as fsq:4f9b164de4b065054b490c38 |
| 510552f1e4b0584e328f1e53 | Louresland |  | Playground | same place as fsq:510429e0e4b05ec8583f676c |
| 51595810e4b0967e32a6eb6e | Souto de S. Roque |  | Park | same place as fsq:5159570be4b03f6bcb641c98 |
| 51ae24e5498e7f759ae2f50c | Parque Infantil Colinas do Cruzeiro |  | Playground | same place as fsq:4f538a97e4b063296e307d9e |
| 529b4145498e2a6420c91e0a | Miradouro das minas de água |  | Scenic Lookout | same place as fsq:5290adc9498e8e4964079bf1 |
| 57af824d498e4b8b751659e4 | Jardim de São Sebastião |  | Park | same place as fsq:57af81bb498e68c2f3d3ac23 |
| 598c421d9411f22af3e61a54 | Parque Infantil Jardim Fialho De Almeida | Lissabon | Playground | same place as fsq:517937eae4b022af574e9446 |
| 59931755da708031509e3ba8 | Poça Dia Frades | Velas | Beach | same place as fsq:59931711da5e56097ecfd4f6 |
| 5d38bc5dc75f6e0007b7e5cf | Praça Dr. Gaspar Moreira | Santa Maria da Feira | Plaza | same place as fsq:5009c5f0e4b0bfba220903da |
| 608ac44b2e10434bd9214392 | Palhal Do Mourao | Águeda | Park | same place as fsq:608ac3de006bc4496cd2cf51 |
| 608ac54b7e99835cb09af665 | Palhal Do Mourao | Fermentelos | Park | same place as fsq:608ac3de006bc4496cd2cf51 |
| 62361d55b4a05c1399d869df | Miradouro da Portelinha | Machico | Scenic Lookout | same place as fsq:60ba4becef29715bc3d15ebf |
| 629b24a696b6de2fcbc2e336 | Miradouro Terras de Fora | Arco de São Jorge | Scenic Lookout | same place as fsq:6295fd7379ea822db6ece884 |
| 653541a62efb8b1c8a62cb81 | baloiço panorâmico de sesimbra | Sesimbra | Scenic Lookout | same place as fsq:62a9f5da8a270f440580979c |
| 66311c71d603b1533267fdb2 | Observation Deck |  | Scenic Lookout | same place as fsq:66311be8a52fc7214914fc5e |
| 66cde1d8a58bad634771c305 | Miradouro Da Ponta Do Queimado | Angra do Heroísmo | Scenic Lookout | same place as fsq:6478daa90b1549285dedcd29 |
| 691328ee3c83f71d8bc16eb5 | Jardim da Pérgola | Porto | Garden, Park | same place as fsq:691328b2b5c8af46ed92cffe |
| 695fdb8747000466c65462bc | Freddy's Ice Cream Park | Cascais | Playground | same place as fsq:695fdb0154ef4d65a9c4a834 |
