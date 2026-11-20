# KAN-433 — Foursquare tourism import, PT, Tier 1 — DRY RUN

Run `kan461-fsq-outings-20261115`, generated 2026-11-15T19:06Z by `cloudflare/extraction/import_foursquare_tourism.py`. Nothing was written to D1 or R2; this is what `--emit` would do.

## Inputs

- Foursquare archive: `country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv` — 396,749 rows (sha256 `82b04934657742e497ba7832a8fab81aa09fb4703958b63cd3e92fa25ab33b98`); 41,186 distinct rows carry an in-scope leaf.
- Leaf → type map: `docs/kan-461/leaf-type-map-outings.json` (7 leaf rules, 0 suffix rules, 1 tier-2 leaves).
- Overture base: `overture-country-sources/PT/7ac6dab3-15fe-4992-aba9-a227daaed380.csv` — 213,068 promoted of 350,415 rows under the committed overrides.
- Curated rows (active, all types): 21,313.
- MULTIBANCO: 1 distinct name(s) read; 0 row(s) fetched as possible name matches.
- Foursquare-keyed `poi_source_correction` rows honoured: 6.
- Matcher: `supplement_osm_pois.names_match` within 75 m, type-blind, against every served row. Same name 75–400 m away is skipped as suspect. Distance alone never skips.

## Totals

| | rows |
|---|---:|
| **would insert** | **3,959** |
| skipped — noise leaf | 12,693 |
| skipped — parent-only leaf | 2,726 |
| skipped — tier 2 leaf | 62 |
| skipped — unmapped leaf | 18,444 |
| skipped — empty name | 8 |
| skipped — matched | 2,353 |
| skipped — matched (translated) | 15 |
| skipped — weak name | 135 |
| skipped — suspect | 749 |
| skipped — in-batch duplicate | 42 |
| in-scope rows, total | 41,186 |

SQL: 20 statement(s), 1,493,461 bytes (19 `curated_poi` + 1 `curated_poi_attribute`), largest 79,978 bytes (cap 80,000). Rows with a second type (written as `curated_poi_attribute` `poi_type`): 39.

## Would insert, by our type

| primary_poi_type | rows | + as second type |
|---|---:|---:|
| `park` | 1,291 | 4 |
| `viewpoint` | 951 | 1 |
| `plaza` | 634 | 10 |
| `beach` | 579 | 4 |
| `playground` | 504 | 21 |

## Per leaf

A row with several in-scope leaves counts under each, so columns sum past the distinct totals above. Skip reasons that are the same for every row of a leaf (tier 2, noise, parent, excluded, unmapped) show the leaf's whole count.

| leaf | kind | our type(s) | rows | would insert | noise leaf | parent-only leaf | tier 2 leaf | unmapped leaf | empty name | matched | matched (translated) | weak name | suspect | in-batch duplicate |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Scenic Lookout | tier1 | `viewpoint` | 1,585 | 951 | 0 | 0 | 0 | 0 | 2 | 476 | 1 | 48 | 97 | 10 |
| Park | tier1 | `park` | 1,295 | 679 | 0 | 0 | 0 | 0 | 1 | 385 | 1 | 22 | 198 | 9 |
| Garden | tier1 | `park` | 1,022 | 636 | 0 | 0 | 0 | 0 | 0 | 267 | 3 | 17 | 95 | 4 |
| Beach | tier1 | `beach` | 1,464 | 583 | 0 | 0 | 0 | 0 | 5 | 617 | 9 | 31 | 214 | 5 |
| Plaza | tier1 | `plaza` | 1,132 | 564 | 0 | 0 | 0 | 0 | 0 | 458 | 1 | 13 | 90 | 6 |
| Playground | tier1 | `playground` | 795 | 523 | 0 | 0 | 0 | 0 | 0 | 198 | 0 | 7 | 60 | 7 |
| Pedestrian Plaza | tier1 | `plaza` | 122 | 80 | 0 | 0 | 0 | 0 | 0 | 27 | 0 | 0 | 12 | 3 |
| Island | tier2 |  | 67 | 0 | 0 | 0 | 62 | 0 | 0 | 2 | 0 | 1 | 2 | 0 |
| Dog Park | unmapped |  | 231 | 10 | 0 | 0 | 0 | 206 | 0 | 12 | 0 | 1 | 2 | 0 |
| National Park | unmapped |  | 47 | 5 | 0 | 0 | 0 | 42 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nudist Beach | unmapped |  | 25 | 5 | 0 | 0 | 0 | 19 | 0 | 0 | 0 | 0 | 1 | 0 |
| Bathing Area | unmapped |  | 116 | 3 | 0 | 0 | 0 | 111 | 0 | 2 | 0 | 0 | 0 | 0 |
| Roof Deck | unmapped |  | 88 | 3 | 0 | 0 | 0 | 84 | 0 | 1 | 0 | 0 | 0 | 0 |
| Picnic Area | unmapped |  | 26 | 2 | 0 | 0 | 0 | 24 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoo Exhibit | unmapped |  | 14 | 2 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 1 | 0 |
| Prayer Room | unmapped |  | 166 | 1 | 0 | 0 | 0 | 165 | 0 | 0 | 0 | 0 | 0 | 0 |
| Outdoor Sculpture | unmapped |  | 164 | 1 | 0 | 0 | 0 | 160 | 0 | 3 | 0 | 0 | 0 | 0 |
| Escape Room | unmapped |  | 36 | 1 | 0 | 0 | 0 | 35 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tunnel | unmapped |  | 30 | 1 | 0 | 0 | 0 | 29 | 0 | 0 | 0 | 0 | 0 | 0 |
| State or Provincial Park | unmapped |  | 23 | 1 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bike Trail | unmapped |  | 22 | 1 | 0 | 0 | 0 | 21 | 0 | 0 | 0 | 0 | 0 | 0 |
| Natural Park | unmapped |  | 18 | 1 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| Urban Park | unmapped |  | 16 | 1 | 0 | 0 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dam | unmapped |  | 13 | 1 | 0 | 0 | 0 | 11 | 0 | 1 | 0 | 0 | 0 | 0 |
| Disc Golf Course | unmapped |  | 2 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Church | unmapped |  | 3,284 | 0 | 0 | 0 | 0 | 3,276 | 0 | 7 | 1 | 0 | 0 | 0 |
| Night Club | unmapped |  | 1,395 | 0 | 0 | 0 | 0 | 1,395 | 0 | 0 | 0 | 0 | 0 | 0 |
| Historic and Protected Site | unmapped |  | 1,311 | 0 | 0 | 0 | 0 | 1,276 | 0 | 27 | 1 | 1 | 6 | 0 |
| Art Gallery | unmapped |  | 891 | 0 | 0 | 0 | 0 | 890 | 0 | 1 | 0 | 0 | 0 | 0 |
| Music Venue | unmapped |  | 644 | 0 | 0 | 0 | 0 | 642 | 0 | 1 | 0 | 0 | 1 | 0 |
| Campground | unmapped |  | 622 | 0 | 0 | 0 | 0 | 612 | 0 | 8 | 0 | 0 | 2 | 0 |
| Monument | unmapped |  | 610 | 0 | 0 | 0 | 0 | 578 | 0 | 29 | 1 | 0 | 2 | 0 |
| Museum | unmapped |  | 584 | 0 | 0 | 0 | 0 | 579 | 0 | 1 | 0 | 0 | 4 | 0 |
| Hiking Trail | unmapped |  | 583 | 0 | 0 | 0 | 0 | 554 | 0 | 24 | 0 | 0 | 5 | 0 |
| Concert Hall | unmapped |  | 427 | 0 | 0 | 0 | 0 | 427 | 0 | 0 | 0 | 0 | 0 | 0 |
| River | unmapped |  | 390 | 0 | 0 | 0 | 0 | 355 | 0 | 32 | 0 | 0 | 3 | 0 |
| Mountain | unmapped |  | 371 | 0 | 0 | 0 | 0 | 344 | 0 | 26 | 0 | 0 | 1 | 0 |
| Soccer Stadium | unmapped |  | 368 | 0 | 0 | 0 | 0 | 368 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bridge | unmapped |  | 355 | 0 | 0 | 0 | 0 | 348 | 0 | 6 | 0 | 0 | 1 | 0 |
| History Museum | unmapped |  | 352 | 0 | 0 | 0 | 0 | 348 | 0 | 3 | 0 | 0 | 1 | 0 |
| Surf Spot | unmapped |  | 343 | 0 | 0 | 0 | 0 | 259 | 0 | 61 | 1 | 4 | 18 | 0 |
| Harbor or Marina | unmapped |  | 336 | 0 | 0 | 0 | 0 | 327 | 0 | 7 | 0 | 1 | 1 | 0 |
| Theater | unmapped |  | 321 | 0 | 0 | 0 | 0 | 321 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lake | unmapped |  | 301 | 0 | 0 | 0 | 0 | 290 | 0 | 10 | 0 | 0 | 1 | 0 |
| Movie Theater | unmapped |  | 282 | 0 | 0 | 0 | 0 | 282 | 0 | 0 | 0 | 0 | 0 | 0 |
| Public Art | unmapped |  | 247 | 0 | 0 | 0 | 0 | 247 | 0 | 0 | 0 | 0 | 0 | 0 |
| Strip Club | unmapped |  | 234 | 0 | 0 | 0 | 0 | 234 | 0 | 0 | 0 | 0 | 0 | 0 |
| Performing Arts Venue | unmapped |  | 200 | 0 | 0 | 0 | 0 | 200 | 0 | 0 | 0 | 0 | 0 | 0 |
| Castle | unmapped |  | 185 | 0 | 0 | 0 | 0 | 176 | 0 | 6 | 0 | 0 | 3 | 0 |
| Amusement Park | unmapped |  | 181 | 0 | 0 | 0 | 0 | 171 | 0 | 10 | 0 | 0 | 0 | 0 |
| Pool Hall | unmapped |  | 181 | 0 | 0 | 0 | 0 | 181 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fair | unmapped |  | 161 | 0 | 0 | 0 | 0 | 161 | 0 | 0 | 0 | 0 | 0 | 0 |
| Stadium | unmapped |  | 161 | 0 | 0 | 0 | 0 | 161 | 0 | 0 | 0 | 0 | 0 | 0 |
| Art Museum | unmapped |  | 160 | 0 | 0 | 0 | 0 | 159 | 0 | 1 | 0 | 0 | 0 | 0 |
| Stable | unmapped |  | 160 | 0 | 0 | 0 | 0 | 159 | 0 | 1 | 0 | 0 | 0 | 0 |
| Water Park | unmapped |  | 142 | 0 | 0 | 0 | 0 | 142 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lighthouse | unmapped |  | 138 | 0 | 0 | 0 | 0 | 127 | 0 | 11 | 0 | 0 | 0 | 0 |
| Nature Preserve | unmapped |  | 115 | 0 | 0 | 0 | 2 | 101 | 0 | 12 | 0 | 0 | 0 | 0 |
| Street Art | unmapped |  | 107 | 0 | 0 | 0 | 0 | 107 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rock Club | unmapped |  | 102 | 0 | 0 | 0 | 0 | 102 | 0 | 0 | 0 | 0 | 0 | 0 |
| Waterfall | unmapped |  | 102 | 0 | 0 | 0 | 0 | 99 | 0 | 3 | 0 | 0 | 0 | 0 |
| Attraction | unmapped |  | 97 | 0 | 0 | 0 | 0 | 95 | 0 | 2 | 0 | 0 | 0 | 0 |
| Internet Cafe | unmapped |  | 95 | 0 | 0 | 0 | 0 | 95 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fountain | unmapped |  | 94 | 0 | 0 | 0 | 0 | 91 | 0 | 3 | 0 | 0 | 0 | 0 |
| Arcade | unmapped |  | 92 | 0 | 0 | 0 | 0 | 90 | 0 | 2 | 0 | 0 | 0 | 0 |
| Shrine | unmapped |  | 92 | 0 | 0 | 0 | 0 | 91 | 0 | 1 | 0 | 0 | 0 | 0 |
| Comedy Club | unmapped |  | 90 | 0 | 0 | 0 | 0 | 90 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hot Spring | unmapped |  | 90 | 0 | 0 | 0 | 0 | 87 | 0 | 3 | 0 | 0 | 0 | 0 |
| Exhibit | unmapped |  | 86 | 0 | 0 | 0 | 0 | 86 | 0 | 0 | 0 | 0 | 0 | 0 |
| Sculpture Garden | unmapped |  | 84 | 0 | 0 | 0 | 0 | 78 | 0 | 5 | 0 | 0 | 1 | 0 |
| Bowling Alley | unmapped |  | 75 | 0 | 0 | 0 | 0 | 75 | 0 | 0 | 0 | 0 | 0 | 0 |
| Casino | unmapped |  | 70 | 0 | 0 | 0 | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 0 |
| Temple | unmapped |  | 70 | 0 | 0 | 0 | 0 | 70 | 0 | 0 | 0 | 0 | 0 | 0 |
| Indie Movie Theater | unmapped |  | 69 | 0 | 0 | 0 | 0 | 69 | 0 | 0 | 0 | 0 | 0 | 0 |
| Science Museum | unmapped |  | 64 | 0 | 0 | 0 | 0 | 63 | 0 | 1 | 0 | 0 | 0 | 0 |
| Palace | unmapped |  | 62 | 0 | 0 | 0 | 0 | 61 | 0 | 1 | 0 | 0 | 0 | 0 |
| Dive Spot | unmapped |  | 57 | 0 | 0 | 0 | 0 | 57 | 0 | 0 | 0 | 0 | 0 | 0 |
| Gaming Cafe | unmapped |  | 52 | 0 | 0 | 0 | 0 | 52 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rock Climbing Spot | unmapped |  | 47 | 0 | 0 | 0 | 0 | 47 | 0 | 0 | 0 | 0 | 0 | 0 |
| Jazz and Blues Venue | unmapped |  | 45 | 0 | 0 | 0 | 0 | 45 | 0 | 0 | 0 | 0 | 0 | 0 |
| Cave | unmapped |  | 44 | 0 | 0 | 0 | 0 | 44 | 0 | 0 | 0 | 0 | 0 | 0 |
| Go Kart Track | unmapped |  | 40 | 0 | 0 | 0 | 0 | 40 | 0 | 0 | 0 | 0 | 0 | 0 |
| Amphitheater | unmapped |  | 37 | 0 | 0 | 0 | 0 | 37 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tennis Stadium | unmapped |  | 37 | 0 | 0 | 0 | 0 | 37 | 0 | 0 | 0 | 0 | 0 | 0 |
| Botanical Garden | unmapped |  | 34 | 0 | 0 | 0 | 0 | 31 | 0 | 2 | 0 | 0 | 1 | 0 |
| Basketball Stadium | unmapped |  | 32 | 0 | 0 | 0 | 0 | 31 | 0 | 1 | 0 | 0 | 0 | 0 |
| Indie Theater | unmapped |  | 32 | 0 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 |
| Memorial Site | unmapped |  | 31 | 0 | 0 | 0 | 0 | 31 | 0 | 0 | 0 | 0 | 0 | 0 |
| Monastery | unmapped |  | 30 | 0 | 0 | 0 | 0 | 30 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mini Golf Course | unmapped |  | 28 | 0 | 0 | 0 | 0 | 28 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hockey Stadium | unmapped |  | 27 | 0 | 0 | 0 | 0 | 27 | 0 | 0 | 0 | 0 | 0 | 0 |
| Volcano | unmapped |  | 27 | 0 | 0 | 0 | 0 | 27 | 0 | 0 | 0 | 0 | 0 | 0 |
| Aquarium | unmapped |  | 26 | 0 | 0 | 0 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| Circus | unmapped |  | 26 | 0 | 0 | 0 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoo | unmapped |  | 25 | 0 | 0 | 0 | 0 | 24 | 0 | 1 | 0 | 0 | 0 | 0 |
| Windmill | unmapped |  | 24 | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 0 | 0 | 0 | 0 |
| Party Center | unmapped |  | 23 | 0 | 0 | 0 | 0 | 23 | 0 | 0 | 0 | 0 | 0 | 0 |
| Psychic and Astrologer | unmapped |  | 22 | 0 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| Football Stadium | unmapped |  | 19 | 0 | 0 | 0 | 0 | 19 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mosque | unmapped |  | 17 | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| Salsa Club | unmapped |  | 17 | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country Dance Club | unmapped |  | 16 | 0 | 0 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| Laser Tag Center | unmapped |  | 16 | 0 | 0 | 0 | 0 | 14 | 0 | 2 | 0 | 0 | 0 | 0 |
| Roller Rink | unmapped |  | 11 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| Planetarium | unmapped |  | 10 | 0 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| Track Stadium | unmapped |  | 10 | 0 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| Boat Launch | unmapped |  | 8 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| Synagogue | unmapped |  | 8 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| Picnic Shelter | unmapped |  | 6 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| Buddhist Temple | unmapped |  | 5 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| Opera House | unmapped |  | 5 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| Carnival | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| VR Cafe | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| Baseball Stadium | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country Club | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mountain Hut | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ticket Seller | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dance Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Disc Golf | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Kingdom Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nature Trail | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rugby Stadium | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ruin | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bingo Center | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Community Garden | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Drive-in Theater | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Erotic Museum | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fort | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| General Entertainment | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hindu Temple | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Terreiro | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tower | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Arts and Entertainment | parent |  | 2,183 | 9 | 0 | 2,157 | 0 | 11 | 0 | 4 | 0 | 0 | 2 | 0 |
| Spiritual Center | parent |  | 384 | 0 | 0 | 365 | 0 | 16 | 0 | 3 | 0 | 0 | 0 | 0 |
| Landmarks and Outdoors | parent |  | 207 | 0 | 0 | 205 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Other Great Outdoors | noise |  | 1,999 | 31 | 1,826 | 4 | 3 | 87 | 0 | 35 | 0 | 1 | 12 | 0 |
| Neighborhood | noise |  | 1,877 | 6 | 1,841 | 1 | 0 | 13 | 0 | 6 | 0 | 3 | 7 | 0 |
| Field | noise |  | 1,045 | 5 | 1,016 | 0 | 0 | 18 | 0 | 4 | 0 | 0 | 2 | 0 |
| Farm | noise |  | 1,949 | 3 | 1,928 | 1 | 0 | 16 | 0 | 1 | 0 | 0 | 0 | 0 |
| Forest | noise |  | 63 | 2 | 55 | 0 | 0 | 5 | 0 | 1 | 0 | 0 | 0 | 0 |
| Structure | noise |  | 3,274 | 1 | 3,252 | 5 | 0 | 10 | 0 | 3 | 0 | 0 | 3 | 0 |
| City | noise |  | 1,790 | 1 | 1,782 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 1 | 0 |
| Village | noise |  | 599 | 1 | 593 | 0 | 0 | 3 | 0 | 1 | 0 | 0 | 1 | 0 |
| Waterfront | noise |  | 40 | 1 | 32 | 0 | 0 | 3 | 0 | 2 | 0 | 0 | 2 | 0 |
| Tree | noise |  | 37 | 1 | 34 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| Reservoir | noise |  | 14 | 1 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Canal Lock | noise |  | 10 | 1 | 3 | 0 | 0 | 4 | 0 | 2 | 0 | 0 | 0 | 0 |
| Town | noise |  | 310 | 0 | 307 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 0 | 0 |
| Well | noise |  | 74 | 0 | 71 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| States and Municipalities | noise |  | 48 | 0 | 48 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Canal | noise |  | 36 | 0 | 19 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bay | noise |  | 25 | 0 | 24 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hill | noise |  | 9 | 0 | 8 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| County | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pass | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| State | noise |  | 3 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pond | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

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

Would-insert rows with a served landmark or venue (not a business) within 25 m whose name the matcher cannot pair. The contract imports them — different names are different places, distance alone never removes — and the Worker's read-time suppression is exact-name too. Some are real neighbours (a statue by a church); the ones that are the same place under another language or alias ("Mosteiro dos Jerónimos" / "Jerónimos Monastery") are what this list is for — what the translation step above did not pair. 501 row(s); a seeded hand-check sample of 50:

| fsq_place_id | name | our type(s) | served neighbour | translated (archive ↔ served) |
|---|---|---|---|---|
| 4c874c2cb504a1439249b51c | Jardins do Casino | park | overture:933ba4bd-b95a-4268-87f9-e3c6089c0ca6 "Jardins Casino Estoril" (casino) at 24 m | casino gardens ↔ casino estoril gardens |
| 4d4d86c81a2d721e9d3e981d | Espaço de Jogo e Recreio do Rossio | playground | overture:91577085-4763-4dc1-b754-40aec475585f "Parque Infantil Touro Encarnado" (playground) at 25 m | espaco jogo recreio rossio ↔ encarnado infantil park touro |
| 4d4ed41b20d3236a0b859f28 | Jardim d'Algodeia | park | overture:5cd748e9-29bb-4b5d-ab46-29493e012678 "Jardim Da Algodeia ( Campo Dos Arcos )" (park) at 19 m | algodeia d garden ↔ algodeia arcos campo garden |
| 4d51ddb0dcce224b8b8fe61b | Praceta Manuel Ma Barbosa Du Bocage | plaza | overture:79c674a5-dbaf-47e8-ae18-797a42eee432 "Igreja Carta Viva " (church) at 17 m | barbosa bocage du ma manuel praceta ↔ carta church viva |
| 4da33d369aa4721e87b01f1a | Parque Infantil do Jardim Marquês de Marialva | playground | overture:f22e1fe7-bd23-42a3-95f2-004ee17057a3 "Cinema City Campo Pequeno" (movie_theater) at 11 m | garden infantil marialva marques park ↔ campo cinema city pequeno |
| 4dcc3a5052b19dd12dccfbb7 | Praça da República | plaza | overture:22d58cb5-c6c8-44d2-9298-c96173b8e4f8 "Campo da Mata" (stadium) at 18 m | republica square ↔ campo mata |
| 4e2bf66de4cd3bc1669aad52 | Praia Nossa Sra. da Guia | beach | curated:fsq:4fb28454e4b002c22889408b "Molhe de Vila do Conde" (lighthouse) at 0 m | beach guia lady our ↔ conde molhe vila |
| 4e3eb96c483b04e17aa695df | Jardim D. Beatriz | park | overture:ea4ab02b-f543-4534-8635-3a8b9b80cec5 "Praça Multiusos das Furnas" (plaza) at 0 m | beatriz d garden ↔ furnas multiusos square |
| 4e3edee8d4c058f9dc183a84 | Piscina Freitas | beach | overture:d9d4a630-3b4c-4e7b-b9fa-dfe773615b82 "Jardim Antonio Borges" (botanical_garden) at 18 m | freitas piscina ↔ antonio borges garden |
| 4e4e3ed6b0fb088f3c0a1d6b | Miradouro Serra Boa Viagem | viewpoint, park | overture:d376e867-ffd1-40cb-972c-408046c49876 "Bandeira, Figueira da Foz" (mountain) at 5 m | boa mountains viagem viewpoint ↔ bandeira figueira foz |
| 4e5c16b4183883e00c04c3ae | Praca Dr Eugenio Dias | plaza | curated:fsq:5214893d11d2832c559a26c5 "Centro de Interpretação das Linhas de Torres" (historical_landmark) at 0 m | day dr eugenio square ↔ center interpretacao linhas torres |
| 4e6289a3ae60e9edf5cd3280 | Portela do Vade | viewpoint | overture:a16781fe-df73-449f-8c56-3fb48541a1ce "FUNERÁRIA do VADE" (cemetery) at 18 m | portela vade ↔ funeraria vade |
| 4e6b906cd22d0e4cf688cf4e | Cruz Alta | viewpoint | overture:8511dce7-ee82-437a-8540-01ae3b6ff41a "High Cross" (historical_landmark) at 3 m | alta cruz ↔ cross high |
| 4e82211d5c5c535c6e0b5828 | Matagal Sao Roque | park | overture:f1a8e548-90cc-4be1-841e-713ac6ea2dbd "Alamos Igreja" (church) at 2 m | matagal roque saint ↔ alamos church |
| 4f01d32b61af974bcfd44b82 | pancolla | viewpoint | overture:a1b0e614-d740-4e50-95a5-556225b9d883 "7. Postigo do Pelourinho" (historical_landmark) at 17 m | pancolla ↔ 7 pillory postigo |
| 4fdd322be4b09d4fcc71fe06 | Largo Marquês de Pombal | plaza | curated:fsq:6463b21889c6fd6b933c1812 "Half Owl - Bordalo II" (historical_landmark) at 13 m | marques pombal square ↔ bordalo half ii owl |
| 5009c5f0e4b0bfba220903da | Largo Gaspar Moreira | plaza | overture:f9250991-bda8-41e9-8e93-3f5a544272ed "Largo de Camões" (plaza) at 0 m | gaspar moreira square ↔ camoes square |
| 50339a45e4b0943846191794 | Largo Estevão Torres | park | overture:c809f7c9-7d43-43a1-a61d-d272f6a4666e "Casa da Árvore" (cultural_center) at 20 m | estevao square torres ↔ arvore casa |
| 504755fae4b09930b536c63c | Jardim Poeta Pardal | park | overture:40d03a21-cec3-4ab8-a2e9-18552778ace8 "Comunidade Cristã Renovada de Quarteira" (church) at 10 m | garden pardal poeta ↔ comunidade crista quarteira renovada |
| 504a8d92e4b05ebf6d057ac4 | Praça Dom Afonso III | plaza | curated:fsq:50d45c0ae4b0d876e0ed8e58 "Castelo de Faro" (historical_landmark) at 8 m | afonso dom iii square ↔ castle faro |
| 50e22240e4b0a78b099209e3 | Spot do Diogo e da Beatrysa | viewpoint | overture:6c2299f1-63ba-4a94-94f4-638b8d9badf9 "Hermitage of the Ascensión of Christ" (church) at 7 m | beatrysa diogo spot ↔ ascension christ hermitage |
| 5159570be4b03f6bcb641c98 | Miradouro de S. Roque | viewpoint, park | curated:fsq:51595e51e4b0a71b12dd65c3 "Solar de Pregais" (historical_landmark) at 0 m | roque s viewpoint ↔ pregais solar |
| 5169c42ae4b0a2ef22f4c4a8 | Largo Do Correio Mor | plaza | overture:79b81dd7-8b26-4c63-a3f6-04530c6a72f1 "Penafiel Palace" (historical_landmark) at 1 m | correio mor square ↔ palace penafiel |
| 51cffd858bbdc3138592809c | Jardim Central | park | curated:osm:way/105613413 "Jardim dos Patos" (park) at 12 m | central garden ↔ garden patos |
| 51fd0e4a498e836675bc9573 | Alta da Santa Catarina | viewpoint | overture:ffa81682-f520-4682-82c2-6e8b01238966 "Saint Catherine's Heights" (historical_landmark) at 0 m | alta catarina saint ↔ catherine heights s saint |
| 52161dd811d2d4dc716aebd8 | Miradouro do Teleférico das Achadas da Cruz | viewpoint | overture:c728e6db-28fb-44a1-a598-771b65d2a929 "Vereda do Calhau" (hiking_area) at 24 m | achadas cruz teleferico viewpoint ↔ calhau vereda |
| 5218be1811d2a6c2de98b48c | Travessa do Mascarenhas | plaza | curated:fsq:1b1aea3b0af7427a1e3fd084 "Centro Dramático de Évora" (theatre) at 15 m | mascarenhas travessa ↔ center dramatico evora |
| 522af2cd11d2ce5e8ad3117b | Parque Infantil Pequenos & Graudos | playground | curated:osm:way/544994078 "Parque da Quinta Nova" (park) at 24 m | graudos infantil park pequenos ↔ new park quinta |
| 522cbd9111d27b8443274342 | Parque de Lazer da Ínsua | park | curated:fsq:512fa892e4b0551c9fd683f5 "Rio Ave" (river) at 3 m | insua lazer park ↔ ave river |
| 53ba5e2a498e3b8ad1fe2e52 | hotel Solverde Swimmingpool | beach | overture:fa026e95-5553-4fd1-b845-1f0e03d5170a "Praia Nova" (beach) at 17 m | hotel solverde swimmingpool ↔ beach new |
| 5511638f498ef5b1e1f57122 | blaho. | park | overture:a1b0e614-d740-4e50-95a5-556225b9d883 "7. Postigo do Pelourinho" (historical_landmark) at 21 m | blaho ↔ 7 pillory postigo |
| 5612b321498ee7c68cb82d5e | Largo Padre Américo | plaza | overture:a9830221-3e83-4fc9-a7a0-9d8dd50cd929 "Igreja da Misericórdia de Penafiel" (church) at 14 m | americo padre square ↔ church misericordia penafiel |
| 571a8b26cd1060aeef3d725d | Parque dos Aromas | park | overture:6ab725a4-1c26-407a-9f5b-7b29c4301892 "A Partilha Associação De Moradores Do Bairro Do Zambujal" (cultural_center) at 17 m | aromas park ↔ associacao bairro moradores partilha zambujal |
| 57f62ced498eb2f12b82c698 | Kissing Point | viewpoint | curated:fsq:5cdeab8c9be522002c02abca "PR1 Vereda do Areeiro" (hiking_area) at 18 m | kissing point ↔ areeiro pr1 vereda |
| 5964b2e7e2da1953803b6b82 | Rua Queiroz Ribeiro | plaza | curated:fsq:533d6418498e5b43d151b9cb "Cineteatro de Cerveira" (music_venue) at 13 m | queiroz ribeiro rua ↔ cerveira cineteatro |
| 5a09bf800457b708958b0e39 | Miradouro da Negra | viewpoint | overture:407076a2-5437-4cd5-9108-a23dcf9bc47a "Echoo Forest" (campground) at 13 m | negra viewpoint ↔ echoo forest |
| 5b1183a2916bc1002c92e878 | Praça Alexandre Herculano | plaza | overture:5d5ae543-48cb-4ceb-aded-37464179ac6a "Rotunda Marques de Pombal" (historical_landmark) at 9 m | alexandre herculano square ↔ marques pombal rotunda |
| 5b3010646fa81f002cc92ebc | Largo Mártires Da Pátria | park | overture:2007a989-8619-4bd8-8426-f5253f879443 "Ermida de Nossa Senhora dos Martires" (church) at 1 m | martires patria square ↔ hermitage lady martires our |
| 5d594c31351ab8000703ff1b | Jardim Conde de Ferreira | park | overture:823e27f2-e6eb-40f6-96f9-68a9b81967c0 "Lions Clube de Oeiras" (night_club) at 19 m | conde ferreira garden ↔ club lions oeiras |
| 5e19c16a70fc820007843b4e | Miradouro deSenhora da Penha | viewpoint | overture:161d6414-262d-4fae-bffc-011aac425b96 "Capela de Nossa Senhora de Penha" (church) at 0 m | desenhora penha viewpoint ↔ chapel lady our penha |
| 60400ba721b50c7af6e54752 | Jardim Nuno Álvares | park | overture:7d6be445-170f-4039-9f5c-9ac9ed46a02c "Jardim de Santos" (park) at 3 m | alvares garden nuno ↔ garden saints |
| 62893b3c6d44b136d70068a0 | Praceta dos Cardais | viewpoint | overture:d8b4cc1e-cefe-4f1a-99eb-345cc9550de8 "Miradouro dos Cardais" (historical_landmark) at 9 m | cardais praceta ↔ cardais viewpoint |
| 6308458b8b23eb7bd9b11bcd | Plaza Del Comercio Lisboa Portugal | plaza | curated:fsq:569ad8f6498e2d32d4200b61 "Kalimodjo" (night_club) at 20 m | comercio del lisboa plaza portugal ↔ kalimodjo |
| 6464c5b5cf01c415e09b6dd7 | Av. De Ramos Pinto | plaza | overture:f0fdccd5-d0d0-46b6-9e51-df599cac425c "Cantina Ferreira, Porto" (historical_landmark) at 22 m | av pinto ramos ↔ cantina ferreira harbor |
| 65ef12166c26e665436f668d | Rua São Gonçalo De Lagos | plaza | overture:157eedc0-8c69-4879-8308-dadf17331f33 "Vanilla Journey, Lda." (water_park) at 5 m | goncalo lagos rua saint ↔ journey lda vanilla |
| 6854ecdf9d094cb962002464 | Thomé de Castro Sucessores | beach | overture:f2476f12-238d-4b7a-a080-b70f0601817d "Jardim Silvestre Ribeiro" (historical_landmark) at 5 m | hillfort sucessores thome ↔ garden ribeiro silvestre |
| 68d4b172de5942aa9f8426c3 | Maria A Coelho Mariano | park | curated:fsq:5974f226d41bb7405a30832d "Lick" (historical_landmark) at 23 m | coelho maria mariano ↔ lick |
| 691328b2b5c8af46ed92cffe | Jardim Da Pérgola | park | overture:4f34109a-da2e-42aa-aef2-71adcafbcafe "Avenida da Praia" (beach) at 15 m | garden pergola ↔ avenida beach |
| b4492964d9f9461014f71493 | Parque Funny City | park | overture:7a117400-92bf-47f5-8782-2abefd44a079 "Merkatuno PT" (park) at 15 m | city funny park ↔ merkatuno pt |
| c55ec24b8b29497050aa6004 | Albufeira do Azibo | park | overture:262cf612-b2c6-4aed-b1da-93181a72625a "Rede de Museus Municipais de Macedo de Cavaleiros" (museum) at 17 m | albufeira azibo ↔ cavaleiros macedo municipais museus rede |

## Fuzzy far names — imported, for curation

Would-insert rows whose nearest served row 75–400 m away scores between 0.72 and 0.9 on name_similarity — the rung the preflight counted as suspect and this importer does not (see `SAME_NAME_SIMILARITY`). 278 row(s); first 20:

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
| 4c5ef599d25320a16717ca7a | Promenade do Lido | plaza | overture:20460fe1-b889-46f9-976a-2fd2ff86ca70 "Praia do Lido" (beach) at 164 m, sim 0.73 |
| 4c61c2afde1b2d7f6aabe070 | Largo do município de Silves | plaza | overture:67e3d990-e5cf-4ba3-8d20-7b7d44ade8c1 "Arquivo Municipal de Silves" (museum) at 92 m, sim 0.76 |
| 4c657714e2ee9c74af622d2f | Praia Vale do Garrão | beach | overture:7d23b4b0-3bfa-45cd-81ab-7d94703704b7 "Praia do Garrão" (beach) at 200 m, sim 0.86 |
| 4c7582fcb474a1cd0b7db9bf | Praia de Alcochete | beach | overture:facbe356-473e-48e8-afb8-8d654ffa9f0e "Praia Fluvial De Alcochete" (beach) at 226 m, sim 0.82 |
| 4c7d2fb5d461a143c5587cf5 | Miradouro de Sao Martinho do Porto | viewpoint | overture:f8501baf-eb99-4b37-9433-17c6fe2195f0 "Igreja de São Martinho do Porto" (church) at 295 m, sim 0.86 |
| 4c7e4a75b7fbef3b87db3a14 | Largo da Boa-Hora à Ajuda | plaza | overture:517f3978-f48b-4c63-8f53-79e5c5f5da81 "A Funerária da Boa-Hora e Ajuda" (cemetery) at 79 m, sim 0.75 |
| 4ca6f0928882199c058743d4 | Parque da Cidade | park | curated:osm:way/138749827 "Parque da Avenida" (park) at 165 m, sim 0.79 |
| 4cb1b26ec5e6a1cd2d9edff6 | Parque de Albarquel | park | overture:c408f551-8ab5-4201-b6a4-1a856227c48e "Parque Urbano de Albarquel" (park) at 100 m, sim 0.84 |
| 4cbf6d8e0cc4b7132fb9ecf7 | Jardim da Quinta das Laranjeiras | park | overture:5c5976d6-b00a-4ad1-8673-dbbedd0456fd "Campo de Futsal da Quinta das Laranjeiras" (park) at 77 m, sim 0.77 |

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

### Scenic Lookout — 951 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d947f8f3048b1f78c073264 | Caracol da Graça | Lisboa | 38.71621 | -9.13198 | viewpoint |
| 4e1b0bfe2271aba9379b0874 | Centro de Interpretação da Batalha do Vimeiro | Lourinhã | 39.24078 | -9.30944 | viewpoint |
| 4e62135a483bd9a97426e60d | Santuário Nossa Sra Dá Carvalha |  | 41.00804 | -7.38973 | viewpoint |
| 4ec7a15c5c5ce271bdb59aab | Quinta Das Antas |  | 41.10115 | -8.00456 | viewpoint |
| 4f5cde73e4b03a6a12bc7cd7 | Coreto do Jardim da Estrela | Lisboa | 38.71521 | -9.15934 | viewpoint |
| 4f7f3a5ee4b04fb0c3ce09b6 | Miradouro Santiago Litem |  | 39.83031 | -8.57801 | viewpoint |
| 4fdde10fe4b057598b9fb091 | Miradouro Serra e Mar |  | 32.80086 | -17.11815 | viewpoint |
| 512f53d9e4b00bf9ae8101a7 | Miradouro De Ribeira De Abade |  | 41.13345 | -8.56950 | viewpoint |
| 516a0d8ee4b0befe00ee5f96 | Miradouro Portagens |  | 38.67484 | -9.17368 | viewpoint |
| 52058448498e862a7377fb0d | Alqueidão Da Serra |  | 39.61411 | -8.77082 | viewpoint |
| 53b04e54498eec2a46cc0615 | santa marta da falperra |  | 41.52255 | -8.38840 | viewpoint |
| 5789ca8a498e19416f6ffe5b | Varanda de Gevim - Mirante |  | 40.10219 | -8.23497 | viewpoint |
| 57f4ecb7498e75c6300e69d8 | Miradouro Natural Arrábida Fóssil da Caparica |  | 38.63332 | -9.21617 | viewpoint |
| 5a082852c47cf973cfc3cbe3 | Miradouro do Chão dos Louros | São Vicente | 32.76158 | -17.01599 | viewpoint |
| 5f2542839c300b4d5bed0375 | Miradouro Do Barreiro | Fenais da Luz | 37.82840 | -25.64181 | viewpoint |
| 60ba52ffe1d4ff1de47f9de9 | Miradouro dos Ingleses | Santo António da Serra | 32.72779 | -16.81627 | viewpoint |
| 6307435945482d225a820919 | Miradouro do Caniçal | Machico | 32.74919 | -16.70667 | viewpoint |
| 6347f86e8eb751625fe8a01b | Miradouro Maria Augusta De Castro | Angra Do Heroísmo | 38.64704 | -27.12067 | viewpoint |
| 662a5cad8ca9dc05522f9019 | Miradouro Fora Da 222 | Tendais | 40.99291 | -8.03330 | viewpoint |
| 694fe36ff9899931455e77cd | Miradouro Da Praia Da Olinda | Vila do Conde | 41.35141 | -8.75520 | viewpoint |

### Park — 679 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b0588a3f964a5205ad122e3 | Jardim de Seteais | Sintra | 38.79658 | -9.39903 | park |
| 4d1f16698629224b28940887 | Parque Felício Loureiro | Sintra | 38.75301 | -9.26114 | park |
| 4d331fb85c2db60c2353c86c | Parque Catarina Eufémia | Baixa da Banheira | 38.66478 | -9.04192 | park |
| 4df63aaa52b100c2d8036c97 | Parque N.ª Sr.ª das Dores | Trofa | 41.33654 | -8.55946 | park |
| 4e2b0b2e1f6ebe54424f1ccc | Ecopista |  | 42.02808 | -8.63745 | park |
| 4e35772552b17fb1c607ed40 | Parque Do Sub-Paço | Arganil, Coimbra | 40.21781 | -8.05071 | park |
| 4e4a9d51a80997a2dbf45809 | Gruta Romantica | Furnas | 37.77088 | -25.31431 | park |
| 4e888be5dab41f4aaf7a1f43 | Parque Centro Águeda |  | 40.57089 | -8.44642 | park |
| 4f4d1b3ce4b051dc480bb1cb | Parque de Lazer das Camélias | Braga | 41.54079 | -8.42446 | park |
| 4f7072d7e4b0463c96622ec2 | Parque de Merendas de Serradela |  | 41.65775 | -8.07495 | park |
| 4fcb39a3e4b0ee2f3a9faa32 | Parque Mandanelho | Oliveira do Hospital | 40.33177 | -7.86701 | park |
| 50c4b12ee4b0e12108a6658f | Parque de merendas |  | 39.64262 | -8.28764 | park |
| 5124c3b4e4b06607176ef0d2 | Parqje MiraMaia | Maia | 41.23239 | -8.62338 | park |
| 51f4444d498e4a9a14d3b6c6 | Santa Ana Do Monte | Vila Verde | 41.73412 | -8.36580 | park |
| 53e7dc2b498e03a758f4c184 | rua comercio |  | 40.49852 | -7.89916 | park |
| 596a47603b4e003a5c05795b | Parque De Caravanas E Autocaravanas | Aveiro | 40.64372 | -8.65896 | park |
| 59de2e4d9411f27585aff6fe | Parque Merendas |  | 37.71589 | -25.48889 | park |
| 5c0bea78c4df1d002c20e00d | Circuito De Mini Golfe | Condeixa-a-Nova | 40.11214 | -8.49060 | park |
| 631cc4ba5a504b674368e415 | Area De Serviço De Autocaravanas Abrantes | Abrantes | 39.45352 | -8.19077 | park |
| 66ba4cf2e3e0e33867b932b2 | Area De Autocaravanas Foz Do Sizandro | São Pedro da Cadeira | 39.10307 | -9.39777 | park |

### Garden — 636 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 2aa8b09aa11047130e34a96e | Teresa F Manso Data | Faro | 37.01737 | -7.92828 | park |
| 4d63f2b8bd25370454a1d3c5 | Jardins Garcia de Orta | Lisboa | 38.77192 | -9.09226 | park |
| 4d6a8be04c4637049d95b1b3 | Jardim da Alta de Lisboa | Lisboa | 38.77992 | -9.14885 | park |
| 4e1b59eeae60ddb8f6521e1d | Budens Garten | Vila do Bispo | 37.08588 | -8.83118 | park |
| 4e55056752b14687067a8182 | Jardim dos Poetas | Ponte da Barca | 41.80882 | -8.41987 | park |
| 4e6b08a5a809290268479092 | Jardim Quatro Estradas - cruzamento |  | 32.71428 | -16.81626 | park |
| 4e8c6f15d3e303e9db7b71a3 | Praca S. João Bosco | Lisboa | 38.71415 | -9.16931 | park, plaza |
| 4f243a88e4b006e5c1ebd5f9 | Mata da Madre de Deus | Lisboa | 38.73074 | -9.11137 | park |
| 500c5078e4b000b8d9b4a524 | Quintal da Rita | Lisboa | 38.72337 | -9.13399 | park |
| 501bc9b5e4b03f362b6a1bab | Jardim Lionesa |  | 41.21413 | -8.62277 | park |
| 50609a57e4b0432830490567 | Parque da Liberdade | Torres Novas | 39.48116 | -8.53431 | park |
| 5215db48498e04b769a85df1 | Jardim Passeio Mestre De Avis | Avis | 39.05190 | -7.89162 | park |
| 523203d911d2ff5c5816affa | Mata Do Paraiso |  | 38.87764 | -9.08384 | park |
| 532ef8f2498e0f24d578c4df | Praça de Antonio Justino de Oliveira |  | 41.82569 | -7.33488 | park |
| 59eca481b2958f5a4fc6f9e0 | Jardim Das Artes | Covilhã | 40.27177 | -7.49841 | park |
| 5eb26f9cb827960008b45075 | HSG Husqvarna Ponta Delgada | Ponta Delgada | 37.74134 | -25.67560 | park |
| 5eb2752f4d54010008c36a93 | José Maria da Costa Lima  Husqvarna  Barcelos | Barcelos | 41.53121 | -8.62858 | park |
| 5fedcc4d4838d2298b49b3d9 | Jardim dos Sentidos | Santa Cruz | 32.64136 | -16.83191 | park |
| 692d8dc2156bf30e10d4ca14 | Jardim Da Burra | Lisboa | 38.71304 | -9.16011 | park |
| f496d1b7e89e45627b526055 | Viveiro dos Poetas - Comércio e Produção de Plantas, Unipessoal | Vila Real | 41.31703 | -7.72969 | park |

### Beach — 583 would insert, sample of 20

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
| 501aacb6e4b0a74d2bd6180a | Rio cabril praia fluvial |  | 41.70955 | -8.03700 | beach |
| 502b7d52e4b00613e8454f59 | Praia da Ladeira (Sul) | Vila do Conde | 41.34365 | -8.75403 | beach |
| 51545d76e4b0b8a533a91128 | Rocha de Baixo |  | 32.83223 | -16.92728 | beach |
| 53219215498e6b844df2d9c6 | Paredão Costa da Caparica |  | 39.01660 | -8.96554 | beach |
| 53b7dbe0498eeed934b23f5b | Lagoa de Santo André |  | 38.11236 | -8.78627 | beach |
| 5597d5cc498e6d86ef002af6 | Beach Club Le Meridien |  | 37.12264 | -8.59617 | beach |
| 57af6b47498efdacaf7cc730 | praia S. Telheiral |  | 37.02818 | -8.97063 | beach |
| 5cc55c447564f7002c15ba7c | Praia Da Balaia | Olhos de Água | 37.08798 | -8.21163 | beach |
| 649d7abfcefdd95c314e7116 | Praia Das Costas Do Lajão | Odemira | 37.51470 | -8.79026 | beach |
| 64da041e4d51f777b3578b93 | Praia De Vale De Janelas | Amoreira | 39.39836 | -9.27739 | beach |
| 66c2030608d50d4b55636624 | Beach Estudantes | Lagos | 37.09723 | -8.66820 | beach |

### Plaza — 564 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c61c2afde1b2d7f6aabe070 | Largo do município de Silves | Silves | 37.18883 | -8.43978 | plaza |
| 4da5af5f7ccc816efefaab7b | Avenida Miguel Fernandes Beja |  | 38.01506 | -7.86611 | plaza |
| 4daae4b4f7b145b37019d857 | Centro Civico da Ponta do Pargo |  | 32.81123 | -17.24418 | plaza |
| 4e45139052b18fcc79a23a78 | Alameda de Arouca | Arouca | 40.92911 | -8.24740 | plaza |
| 4e7278bac65bf4cc2d193e48 | Ficton | Tondela | 40.51868 | -8.08762 | plaza |
| 4e8238900039119b09746f81 | Largo Cândido dos Reis | Santarém | 39.23373 | -8.68602 | plaza |
| 4e996a7a4690ec5f627bfb1a | Terreiro Das Almas | Nelas | 40.47357 | -7.91711 | plaza |
| 4ee4a5887ee50feb348126df | Largo da Estação | Cascais | 38.70027 | -9.41850 | plaza |
| 4f070400e4b0c3ff826360b3 | Praça de Tiananman | Porto | 41.17792 | -8.59463 | plaza |
| 4fa6f974e4b0fed482f7dee2 | Travessa do Convento das Bernardas | Lisboa | 38.70688 | -9.15793 | plaza |
| 4fc139017bebf637c20cb225 | Festas da Sé | Funchal | 32.64892 | -16.90837 | plaza |
| 502c23d3e4b0b7c94c491377 | Praça Do Municipio |  | 39.05310 | -7.43901 | plaza |
| 518ee0bd498e744b80ab66d4 | Rotunda Sul | Fátima | 39.62715 | -8.66586 | plaza |
| 51e1bada498eb5940e8f1db8 | Largo da Igreja de Mira d'Aire |  | 39.54225 | -8.71474 | plaza |
| 52cfcc59498e436ca63b5a14 | praca luis de camoes | Vila Real | 41.29732 | -7.74567 | plaza |
| 54136d6e498eb7150f65fc2c | Parque Da Vila | Penafiel | 41.19912 | -8.29150 | plaza, playground |
| 58ff0e6c340a584040ffad02 | Praca dos Três Caninhos | Loule | 37.08203 | -8.10736 | plaza |
| 63244739e00c5a3df912054d | Largo do Município | Amares | 41.63046 | -8.35677 | plaza |
| 645fd2644b78b701c84e4c0c | Largo Capitão José De Magelhães | Ponte de Lima | 41.76854 | -8.58215 | plaza |
| 66e854804bf0cd0dd9cf796e | Praca Do Muncipio | Peso da Régua | 41.16200 | -7.79000 | plaza |

### Playground — 523 would insert, sample of 20

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
| 4e845ac27ee6358aac850f5f | Parque Infantil das Patameiras | Odivelas | 38.78244 | -9.18688 | playground |
| 4ead5cebd3e32ee0de4dd971 | Parque Infantil do Mercado de Fátima |  | 39.62865 | -8.66758 | playground |
| 4fc0c815e4b02db73de60a8d | Trakinokândia | Frielas | 38.82311 | -9.14674 | playground |
| 4fd86eeae4b0ec3e9c3efee9 | Parque Infantil de Pedrogão Grande | Pedrógão Grande | 39.91910 | -8.14468 | playground |
| 504f8015e4b0f716846c9c75 | Parque Infantil Da Quintinha |  | 38.86134 | -9.06993 | playground |
| 51fd7642498e474401392769 | Parque Infantil Alcaria da Serra |  | 38.20156 | -7.74397 | playground |
| 5227858911d2823efa07d1cb | Parque Infantil Santa Teresinha | Estombar | 37.14431 | -8.48916 | playground |
| 5397896d498ef452b154da63 | WIFI Room - Residência ISCTE-IUL | Lisbon | 38.72070 | -9.11761 | playground |
| 57e7b226498e3f24983711dd | Kids Fun | Maia | 41.25763 | -8.64911 | playground |
| 5d7cb818cfb4f80008181454 | Parque Infantil Soeiro Pereira Gomes | Alhandra | 38.92758 | -9.00631 | playground |
| 687604304d911005ba65d3f8 | Parque Infantil Da Lançada | Sarilhos Grandes | 38.68668 | -8.95582 | playground |
| 69d2451d346c9d1c55d971b3 | Parque Infantil Do Bairro Dos Pescadores | Setúbal | 38.52670 | -8.90264 | playground |

### Pedestrian Plaza — 80 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c5ef599d25320a16717ca7a | Promenade do Lido | Funchal | 32.63702 | -16.93496 | plaza |
| 5401a8e2498ee424eeca5f8e | alto da lixa | Amarante | 41.31326 | -8.17953 | plaza |
| 54155c99498eec6ac4961ec5 | Lavadouro Público | Guimarães | 41.44165 | -8.29002 | plaza |
| 545e1379498e95315955cc29 | Placa da Estalagem | Vila Real de Santo António | 37.19606 | -7.41612 | plaza |
| 5464c4a9498e6665f12e8342 | Largo de Alberto Pimentel |  | 41.14999 | -8.61498 | plaza |
| 54b02dbd498e7274a6b42efb | Escadinhas das Olarias | Lisbon | 38.71938 | -9.13473 | plaza |
| 55da1a06498e4af8efbe64ec | Passeio dos Sombras |  | 38.72863 | -27.06124 | plaza |
| 56a60891498e6ee2fcdfd149 | Largo Aljubarrota | Vila Nova de Gaia | 41.13728 | -8.61775 | plaza |
| 585c68f0727ba373f28cc88a | Travessa Vila União | Coimbra | 40.20130 | -8.41542 | plaza |
| 586d450e730a9256e05d0468 | Rua Da Graça |  | 39.82925 | -7.49476 | plaza |
| 58d4ffe726032752d7aac6ea | Vereda Ribeiro Francês | Gaula | 32.68124 | -16.80025 | plaza |
| 5b8e93b38194fc0039c88471 | Rua do Comércio | Guarda | 40.53885 | -7.26738 | plaza |
| 5d330ef610b4e60007741110 | Rua Da Alfandega | Porto | 41.14070 | -8.61454 | plaza |
| 645be4095d753f7392bac410 | Rua dos Canastreiros | Porto | 41.14065 | -8.61282 | plaza |
| 64650a779d8ea73da34b6e6e | Rua Da Assunção | Porto | 41.14584 | -8.61387 | plaza |
| 65ef1114aa1bc627cf16e043 | Rua Da Igreja Velha | Albufeira | 37.08700 | -8.25100 | plaza |
| 65f1d92b1d7c256132947f79 | Rua Dos Pioneiros | Hangares | 36.98656 | -7.85499 | plaza |
| 65f1e7a7f45b7e566f14908e | Rua L. Galvão | Ilha do Farol | 36.97481 | -7.86550 | plaza |
| 65f3236055dc1e01dd64de02 | Rua Garrett | Lagos | 37.10235 | -8.67351 | plaza |
| 6828e690eee8474a2313799f | Tejo Promenade | Lisboa | 38.69675 | -9.18772 | plaza |

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

### in-batch duplicate — 42, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4d989de6744f37046c24f357 | Play Zone | Braga | Playground | same place as fsq:4d98993297d06ea8d53f370b |
| 4da9aa961e72c1ab9be0a543 | Praia Do Marreco | Matosinhos | Beach | same place as fsq:4c42f0b6af052d7f93a67f79 |
| 5071c438e4b09a19d8279cd6 | Parque Infantil | Amadora | Playground | same place as fsq:4f9b164de4b065054b490c38 |
| 510552f1e4b0584e328f1e53 | Louresland |  | Playground | same place as fsq:510429e0e4b05ec8583f676c |
| 51595810e4b0967e32a6eb6e | Souto de S. Roque |  | Park | same place as fsq:5159570be4b03f6bcb641c98 |
| 529b4145498e2a6420c91e0a | Miradouro das minas de água |  | Scenic Lookout | same place as fsq:5290adc9498e8e4964079bf1 |
| 5752fa34498e40d2ebe5b0a9 | Jardim Garcia de Orta | Lissabon | Garden, Park | same place as fsq:4d63f2b8bd25370454a1d3c5 |
| 5827169088a1a041b7ad30a4 | Largo Padre Américo | Penafiel | Pedestrian Plaza | same place as fsq:5612b321498ee7c68cb82d5e |
| 598c421d9411f22af3e61a54 | Parque Infantil Jardim Fialho De Almeida | Lissabon | Playground | same place as fsq:517937eae4b022af574e9446 |
| 59931755da708031509e3ba8 | Poça Dia Frades | Velas | Beach | same place as fsq:59931711da5e56097ecfd4f6 |
| 608ac44b2e10434bd9214392 | Palhal Do Mourao | Águeda | Park | same place as fsq:608ac3de006bc4496cd2cf51 |
| 60ffefc6ef388a51de3a3bae | Pontal Da Carrapateira Ponto H | Bordeira | Scenic Lookout | same place as fsq:60ffeec9bda9723afaf46a83 |
| 62361d55b4a05c1399d869df | Miradouro da Portelinha | Machico | Scenic Lookout | same place as fsq:60ba4becef29715bc3d15ebf |
| 629b24a696b6de2fcbc2e336 | Miradouro Terras de Fora | Arco de São Jorge | Scenic Lookout | same place as fsq:6295fd7379ea822db6ece884 |
| 65edf717598c430d67fc772b | Esplanada Dr. Frutuoso Da Silva | Albufeira | Pedestrian Plaza | same place as fsq:62a46acd3036be4081550bbb |
| 66311c71d603b1533267fdb2 | Observation Deck |  | Scenic Lookout | same place as fsq:66311be8a52fc7214914fc5e |
| 66cde1d8a58bad634771c305 | Miradouro Da Ponta Do Queimado | Angra do Heroísmo | Scenic Lookout | same place as fsq:6478daa90b1549285dedcd29 |
| 691328ee3c83f71d8bc16eb5 | Jardim da Pérgola | Porto | Garden, Park | same place as fsq:691328b2b5c8af46ed92cffe |
| 695fdb8747000466c65462bc | Freddy's Ice Cream Park | Cascais | Playground | same place as fsq:695fdb0154ef4d65a9c4a834 |
| 69d23ada14de63536401b394 | Parque Lúdico Dos Vidais | Setúbal | Playground | same place as fsq:6978961ac98a37327458f352 |
