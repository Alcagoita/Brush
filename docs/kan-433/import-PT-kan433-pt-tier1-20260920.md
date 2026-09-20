# KAN-433 — Foursquare tourism import, PT, Tier 1 — EMITTED

Run `kan433-pt-tier1-20260920`, generated 2026-09-20T00:45Z by `cloudflare/extraction/import_foursquare_tourism.py`. Emitted: 9,790 D1 change(s).

## Inputs

- Foursquare archive: `country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv` — 396,749 rows (sha256 `82b04934657742e497ba7832a8fab81aa09fb4703958b63cd3e92fa25ab33b98`); 41,186 distinct rows carry an in-scope leaf.
- Leaf → type map: `docs/kan-433/leaf-type-map.json` (52 leaf rules, 2 suffix rules, 8 tier-2 leaves).
- Overture base: `overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv` — 215,560 promoted of 350,415 rows under the committed overrides.
- Curated rows (active, all types): 481.
- MULTIBANCO: 1 distinct name(s) read; 0 row(s) fetched as possible name matches.
- Foursquare-keyed `poi_source_correction` rows honoured: 5.
- Matcher: `supplement_osm_pois.names_match` within 75 m, type-blind, against every served row. Same name 75–400 m away is skipped as suspect. Distance alone never skips.

## Totals

| | rows |
|---|---:|
| **would insert** | **9,498** |
| skipped — noise leaf | 12,693 |
| skipped — parent-only leaf | 2,726 |
| skipped — tier 2 leaf | 6,983 |
| skipped — unmapped leaf | 3,081 |
| skipped — empty name | 33 |
| skipped — matched | 4,921 |
| skipped — matched (translated) | 60 |
| skipped — weak name | 118 |
| skipped — suspect | 977 |
| skipped — in-batch duplicate | 96 |
| in-scope rows, total | 41,186 |

SQL: 47 statement(s), 3,610,810 bytes (46 `curated_poi` + 1 `curated_poi_attribute`), largest 79,971 bytes (cap 80,000). Rows with a second type (written as `curated_poi_attribute` `poi_type`): 239.

## Would insert, by our type

| primary_poi_type | rows | + as second type |
|---|---:|---:|
| `church` | 1,858 | 30 |
| `historical_landmark` | 1,587 | 111 |
| `night_club` | 899 | 4 |
| `music_venue` | 734 | 4 |
| `art_gallery` | 536 | 7 |
| `museum` | 433 | 18 |
| `hiking_area` | 430 | 4 |
| `stadium` | 364 | 1 |
| `campground` | 353 | 0 |
| `mountain` | 290 | 7 |
| `river` | 278 | 5 |
| `marina` | 236 | 4 |
| `amusement_park` | 210 | 3 |
| `bridge` | 207 | 6 |
| `lake` | 197 | 4 |
| `surf_spot` | 159 | 1 |
| `movie_theater` | 127 | 5 |
| `theatre` | 121 | 10 |
| `water_park` | 88 | 8 |
| `nature_preserve` | 79 | 7 |
| `waterfall` | 72 | 3 |
| `hot_spring` | 68 | 0 |
| `lighthouse` | 66 | 2 |
| `casino` | 51 | 0 |
| `botanical_garden` | 17 | 0 |
| `aquarium` | 13 | 0 |
| `zoo` | 12 | 0 |
| `mosque` | 9 | 1 |
| `synagogue` | 4 | 0 |

## Per leaf

A row with several in-scope leaves counts under each, so columns sum past the distinct totals above. Skip reasons that are the same for every row of a leaf (tier 2, noise, parent, excluded, unmapped) show the leaf's whole count.

| leaf | kind | our type(s) | rows | would insert | noise leaf | parent-only leaf | tier 2 leaf | unmapped leaf | empty name | matched | matched (translated) | weak name | suspect | in-batch duplicate |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Church | tier1 | `church` | 3,284 | 1,770 | 0 | 0 | 0 | 0 | 3 | 1,300 | 24 | 4 | 163 | 20 |
| Night Club | tier1 | `night_club` | 1,395 | 903 | 0 | 0 | 0 | 0 | 1 | 416 | 0 | 17 | 47 | 11 |
| Historic and Protected Site | tier1 | `historical_landmark` | 1,311 | 751 | 0 | 0 | 0 | 0 | 7 | 419 | 7 | 16 | 104 | 7 |
| Art Gallery | tier1 | `art_gallery` | 891 | 543 | 0 | 0 | 0 | 0 | 0 | 305 | 2 | 0 | 38 | 3 |
| Music Venue | tier1 | `music_venue` | 644 | 466 | 0 | 0 | 0 | 0 | 0 | 144 | 0 | 4 | 27 | 3 |
| Hiking Trail | tier1 | `hiking_area` | 583 | 434 | 0 | 0 | 0 | 0 | 0 | 105 | 0 | 10 | 33 | 1 |
| Monument | tier1 | `historical_landmark` | 610 | 380 | 0 | 0 | 0 | 0 | 1 | 180 | 4 | 2 | 38 | 5 |
| Campground | tier1 | `campground` | 622 | 353 | 0 | 0 | 0 | 0 | 2 | 201 | 5 | 0 | 60 | 1 |
| Mountain | tier1 | `mountain` | 371 | 297 | 0 | 0 | 0 | 0 | 3 | 48 | 0 | 2 | 21 | 0 |
| River | tier1 | `river` | 390 | 282 | 0 | 0 | 0 | 0 | 1 | 79 | 1 | 0 | 25 | 2 |
| Concert Hall | tier1 | `music_venue` | 427 | 274 | 0 | 0 | 0 | 0 | 0 | 133 | 0 | 1 | 16 | 3 |
| Museum | tier1 | `museum` | 584 | 244 | 0 | 0 | 0 | 0 | 0 | 274 | 11 | 0 | 53 | 2 |
| Harbor or Marina | tier1 | `marina` | 336 | 240 | 0 | 0 | 0 | 0 | 3 | 50 | 0 | 10 | 33 | 0 |
| Soccer Stadium | tier1 | `stadium` | 368 | 214 | 0 | 0 | 0 | 0 | 1 | 126 | 0 | 1 | 24 | 2 |
| Bridge | tier1 | `bridge` | 355 | 213 | 0 | 0 | 0 | 0 | 0 | 96 | 2 | 13 | 30 | 1 |
| Public Art | tier1 | `historical_landmark` | 247 | 211 | 0 | 0 | 0 | 0 | 0 | 27 | 0 | 0 | 9 | 0 |
| Lake | tier1 | `lake` | 301 | 200 | 0 | 0 | 0 | 0 | 0 | 68 | 0 | 1 | 30 | 2 |
| Surf Spot | tier1 | `surf_spot` | 343 | 160 | 0 | 0 | 0 | 0 | 2 | 127 | 2 | 5 | 44 | 3 |
| History Museum | tier1 | `museum` | 352 | 140 | 0 | 0 | 0 | 0 | 0 | 169 | 2 | 1 | 38 | 2 |
| Amusement Park | tier1 | `amusement_park` | 181 | 133 | 0 | 0 | 0 | 0 | 0 | 35 | 0 | 1 | 12 | 0 |
| Movie Theater | tier1 | `movie_theater` | 282 | 132 | 0 | 0 | 0 | 0 | 0 | 127 | 0 | 1 | 11 | 11 |
| Theater | tier1 | `theatre` | 321 | 131 | 0 | 0 | 0 | 0 | 0 | 170 | 0 | 1 | 17 | 2 |
| Water Park | tier1 | `water_park` | 142 | 96 | 0 | 0 | 0 | 0 | 1 | 29 | 0 | 6 | 10 | 0 |
| Nature Preserve | tier1 | `nature_preserve` | 115 | 85 | 0 | 0 | 0 | 0 | 0 | 22 | 0 | 1 | 6 | 1 |
| Castle | tier1 | `historical_landmark` | 185 | 82 | 0 | 0 | 0 | 0 | 1 | 76 | 2 | 2 | 20 | 2 |
| Stadium | tier1 | `stadium` | 161 | 82 | 0 | 0 | 0 | 0 | 0 | 67 | 0 | 1 | 10 | 1 |
| Attraction | tier1 | `amusement_park` | 97 | 80 | 0 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 6 | 0 |
| Waterfall | tier1 | `waterfall` | 102 | 75 | 0 | 0 | 0 | 0 | 0 | 15 | 0 | 3 | 7 | 2 |
| Lighthouse | tier1 | `lighthouse` | 138 | 68 | 0 | 0 | 0 | 0 | 2 | 54 | 1 | 5 | 8 | 0 |
| Hot Spring | tier1 | `hot_spring` | 90 | 68 | 0 | 0 | 0 | 0 | 1 | 14 | 0 | 0 | 7 | 0 |
| Fountain | tier1 | `historical_landmark` | 94 | 65 | 0 | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 3 | 2 |
| Shrine | tier1 | `church`, `historical_landmark` | 92 | 63 | 0 | 0 | 0 | 0 | 0 | 20 | 0 | 1 | 7 | 1 |
| Sculpture Garden | tier1 | `historical_landmark` | 84 | 59 | 0 | 0 | 0 | 0 | 0 | 17 | 0 | 2 | 6 | 0 |
| Art Museum | tier1 | `museum` | 160 | 55 | 0 | 0 | 0 | 0 | 0 | 92 | 2 | 0 | 10 | 1 |
| Casino | tier1 | `casino` | 70 | 51 | 0 | 0 | 0 | 0 | 1 | 16 | 0 | 1 | 1 | 0 |
| Temple | tier1 | `church`, `historical_landmark` | 70 | 47 | 0 | 0 | 0 | 0 | 1 | 16 | 0 | 0 | 6 | 0 |
| Palace | tier1 | `historical_landmark` | 62 | 39 | 0 | 0 | 0 | 0 | 0 | 16 | 0 | 0 | 4 | 3 |
| Science Museum | tier1 | `museum` | 64 | 27 | 0 | 0 | 0 | 0 | 0 | 34 | 0 | 0 | 3 | 0 |
| Tennis Stadium | tier1 | `stadium` | 37 | 27 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 3 | 0 |
| Windmill | tier1 | `historical_landmark` | 24 | 19 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 1 |
| Botanical Garden | tier1 | `botanical_garden` | 34 | 17 | 0 | 0 | 0 | 0 | 0 | 13 | 0 | 1 | 1 | 2 |
| Hockey Stadium | tier1 | `stadium` | 27 | 15 | 0 | 0 | 0 | 0 | 0 | 9 | 0 | 2 | 1 | 0 |
| Aquarium | tier1 | `aquarium` | 26 | 13 | 0 | 0 | 0 | 0 | 0 | 10 | 0 | 1 | 1 | 1 |
| Basketball Stadium | tier1 | `stadium` | 32 | 12 | 0 | 0 | 0 | 0 | 0 | 16 | 0 | 1 | 3 | 0 |
| Zoo | tier1 | `zoo` | 25 | 12 | 0 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 2 | 0 |
| Monastery | tier1 | `historical_landmark`, `church` | 30 | 11 | 0 | 0 | 0 | 0 | 0 | 14 | 1 | 0 | 4 | 0 |
| Football Stadium | tier1 | `stadium` | 19 | 11 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 |
| Mosque | tier1 | `mosque` | 17 | 10 | 0 | 0 | 0 | 0 | 1 | 4 | 0 | 1 | 1 | 0 |
| Track Stadium | tier1 | `stadium` | 10 | 5 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 1 | 0 |
| Synagogue | tier1 | `synagogue` | 8 | 4 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |
| Baseball Stadium | tier1 | `stadium` | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Rugby Stadium | tier1 | `stadium` | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ruin | tier1 | `historical_landmark` | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Erotic Museum | tier1 | `museum` | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tower | tier1 | `historical_landmark` | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fort | tier1 | `historical_landmark` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| Scenic Lookout | tier2 |  | 1,585 | 54 | 0 | 0 | 1,466 | 0 | 0 | 54 | 1 | 2 | 8 | 0 |
| Beach | tier2 |  | 1,464 | 41 | 0 | 0 | 1,328 | 0 | 0 | 66 | 1 | 4 | 24 | 0 |
| Park | tier2 |  | 1,295 | 16 | 0 | 0 | 1,248 | 0 | 0 | 21 | 0 | 1 | 9 | 0 |
| Playground | tier2 |  | 795 | 10 | 0 | 0 | 782 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Garden | tier2 |  | 1,022 | 9 | 0 | 0 | 1,001 | 0 | 0 | 6 | 1 | 0 | 5 | 0 |
| Plaza | tier2 |  | 1,132 | 2 | 0 | 0 | 1,120 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| Island | tier2 |  | 67 | 2 | 0 | 0 | 65 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pedestrian Plaza | tier2 |  | 122 | 0 | 0 | 0 | 121 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| Performing Arts Venue | unmapped |  | 200 | 13 | 0 | 0 | 0 | 172 | 0 | 14 | 0 | 0 | 1 | 0 |
| Outdoor Sculpture | unmapped |  | 164 | 8 | 0 | 0 | 2 | 142 | 0 | 11 | 1 | 0 | 0 | 0 |
| Street Art | unmapped |  | 107 | 6 | 0 | 0 | 0 | 100 | 0 | 1 | 0 | 0 | 0 | 0 |
| Rock Club | unmapped |  | 102 | 5 | 0 | 0 | 0 | 91 | 0 | 4 | 0 | 0 | 2 | 0 |
| Bathing Area | unmapped |  | 116 | 4 | 0 | 0 | 3 | 107 | 0 | 1 | 0 | 0 | 0 | 1 |
| Exhibit | unmapped |  | 86 | 4 | 0 | 0 | 0 | 80 | 0 | 2 | 0 | 0 | 0 | 0 |
| Rock Climbing Spot | unmapped |  | 47 | 4 | 0 | 0 | 0 | 43 | 0 | 0 | 0 | 0 | 0 | 0 |
| Prayer Room | unmapped |  | 166 | 3 | 0 | 0 | 1 | 161 | 0 | 1 | 0 | 0 | 0 | 0 |
| Indie Movie Theater | unmapped |  | 69 | 3 | 0 | 0 | 0 | 55 | 0 | 10 | 0 | 0 | 1 | 0 |
| National Park | unmapped |  | 47 | 3 | 0 | 0 | 5 | 37 | 0 | 2 | 0 | 0 | 0 | 0 |
| Picnic Area | unmapped |  | 26 | 3 | 0 | 0 | 2 | 20 | 0 | 1 | 0 | 0 | 0 | 0 |
| State or Provincial Park | unmapped |  | 23 | 3 | 0 | 0 | 1 | 18 | 0 | 1 | 0 | 0 | 0 | 0 |
| Bike Trail | unmapped |  | 22 | 3 | 0 | 0 | 1 | 18 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dog Park | unmapped |  | 231 | 2 | 0 | 0 | 25 | 204 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fair | unmapped |  | 161 | 2 | 0 | 0 | 0 | 156 | 0 | 3 | 0 | 0 | 0 | 0 |
| Stable | unmapped |  | 160 | 2 | 0 | 0 | 1 | 156 | 0 | 1 | 0 | 0 | 0 | 0 |
| Amphitheater | unmapped |  | 37 | 2 | 0 | 0 | 0 | 34 | 0 | 1 | 0 | 0 | 0 | 0 |
| Indie Theater | unmapped |  | 32 | 2 | 0 | 0 | 0 | 29 | 0 | 1 | 0 | 0 | 0 | 0 |
| Tunnel | unmapped |  | 30 | 2 | 0 | 0 | 1 | 27 | 0 | 0 | 0 | 0 | 0 | 0 |
| Opera House | unmapped |  | 5 | 2 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 |
| Strip Club | unmapped |  | 234 | 1 | 0 | 0 | 0 | 231 | 0 | 2 | 0 | 0 | 0 | 0 |
| Comedy Club | unmapped |  | 90 | 1 | 0 | 0 | 0 | 88 | 0 | 1 | 0 | 0 | 0 | 0 |
| Roof Deck | unmapped |  | 88 | 1 | 0 | 0 | 4 | 83 | 0 | 0 | 0 | 0 | 0 | 0 |
| Cave | unmapped |  | 44 | 1 | 0 | 0 | 0 | 43 | 0 | 0 | 0 | 0 | 0 | 0 |
| Memorial Site | unmapped |  | 31 | 1 | 0 | 0 | 0 | 28 | 0 | 2 | 0 | 0 | 0 | 0 |
| Volcano | unmapped |  | 27 | 1 | 0 | 0 | 0 | 25 | 0 | 1 | 0 | 0 | 0 | 0 |
| Circus | unmapped |  | 26 | 1 | 0 | 0 | 0 | 25 | 0 | 0 | 0 | 0 | 0 | 0 |
| Party Center | unmapped |  | 23 | 1 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| Zoo Exhibit | unmapped |  | 14 | 1 | 0 | 0 | 2 | 10 | 0 | 0 | 0 | 0 | 1 | 0 |
| Dam | unmapped |  | 13 | 1 | 0 | 0 | 2 | 9 | 0 | 1 | 0 | 0 | 0 | 0 |
| Planetarium | unmapped |  | 10 | 1 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| Buddhist Temple | unmapped |  | 5 | 1 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ticket Seller | unmapped |  | 3 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pool Hall | unmapped |  | 181 | 0 | 0 | 0 | 0 | 181 | 0 | 0 | 0 | 0 | 0 | 0 |
| Internet Cafe | unmapped |  | 95 | 0 | 0 | 0 | 0 | 95 | 0 | 0 | 0 | 0 | 0 | 0 |
| Arcade | unmapped |  | 92 | 0 | 0 | 0 | 2 | 90 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bowling Alley | unmapped |  | 75 | 0 | 0 | 0 | 0 | 74 | 0 | 1 | 0 | 0 | 0 | 0 |
| Dive Spot | unmapped |  | 57 | 0 | 0 | 0 | 0 | 56 | 0 | 0 | 0 | 0 | 0 | 1 |
| Gaming Cafe | unmapped |  | 52 | 0 | 0 | 0 | 0 | 52 | 0 | 0 | 0 | 0 | 0 | 0 |
| Jazz and Blues Venue | unmapped |  | 45 | 0 | 0 | 0 | 0 | 44 | 0 | 1 | 0 | 0 | 0 | 0 |
| Go Kart Track | unmapped |  | 40 | 0 | 0 | 0 | 0 | 40 | 0 | 0 | 0 | 0 | 0 | 0 |
| Escape Room | unmapped |  | 36 | 0 | 0 | 0 | 1 | 35 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mini Golf Course | unmapped |  | 28 | 0 | 0 | 0 | 0 | 28 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nudist Beach | unmapped |  | 25 | 0 | 0 | 0 | 6 | 19 | 0 | 0 | 0 | 0 | 0 | 0 |
| Psychic and Astrologer | unmapped |  | 22 | 0 | 0 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| Natural Park | unmapped |  | 18 | 0 | 0 | 0 | 1 | 16 | 0 | 1 | 0 | 0 | 0 | 0 |
| Salsa Club | unmapped |  | 17 | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country Dance Club | unmapped |  | 16 | 0 | 0 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| Laser Tag Center | unmapped |  | 16 | 0 | 0 | 0 | 2 | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| Urban Park | unmapped |  | 16 | 0 | 0 | 0 | 1 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |
| Roller Rink | unmapped |  | 11 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| Boat Launch | unmapped |  | 8 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| Picnic Shelter | unmapped |  | 6 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| Carnival | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| VR Cafe | unmapped |  | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country Club | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| Mountain Hut | unmapped |  | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dance Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Disc Golf | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Disc Golf Course | unmapped |  | 2 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Kingdom Hall | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nature Trail | unmapped |  | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bingo Center | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Community Garden | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Drive-in Theater | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| General Entertainment | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hindu Temple | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Terreiro | unmapped |  | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Arts and Entertainment | parent |  | 2,183 | 4 | 0 | 2,157 | 15 | 3 | 0 | 3 | 0 | 0 | 1 | 0 |
| Spiritual Center | parent |  | 384 | 4 | 0 | 365 | 2 | 1 | 0 | 10 | 0 | 0 | 2 | 0 |
| Landmarks and Outdoors | parent |  | 207 | 1 | 0 | 205 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Other Great Outdoors | noise |  | 1,999 | 40 | 1,826 | 4 | 69 | 19 | 0 | 24 | 0 | 1 | 16 | 0 |
| Canal | noise |  | 36 | 13 | 19 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 0 | 0 |
| Field | noise |  | 1,045 | 11 | 1,016 | 0 | 10 | 6 | 0 | 1 | 0 | 1 | 0 | 0 |
| Neighborhood | noise |  | 1,877 | 4 | 1,841 | 1 | 21 | 0 | 0 | 5 | 0 | 2 | 3 | 0 |
| Canal Lock | noise |  | 10 | 4 | 3 | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Structure | noise |  | 3,274 | 3 | 3,252 | 5 | 6 | 0 | 0 | 7 | 0 | 0 | 1 | 0 |
| Farm | noise |  | 1,949 | 3 | 1,928 | 1 | 4 | 11 | 0 | 1 | 0 | 0 | 1 | 0 |
| City | noise |  | 1,790 | 2 | 1,782 | 0 | 2 | 0 | 0 | 0 | 0 | 3 | 1 | 0 |
| Village | noise |  | 599 | 1 | 593 | 0 | 3 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| Town | noise |  | 310 | 1 | 307 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| Well | noise |  | 74 | 1 | 71 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| Forest | noise |  | 63 | 1 | 55 | 0 | 3 | 1 | 0 | 1 | 1 | 0 | 1 | 0 |
| Waterfront | noise |  | 40 | 1 | 32 | 0 | 5 | 0 | 0 | 1 | 0 | 1 | 0 | 0 |
| Tree | noise |  | 37 | 1 | 34 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bay | noise |  | 25 | 1 | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| States and Municipalities | noise |  | 48 | 0 | 48 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Reservoir | noise |  | 14 | 0 | 13 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Hill | noise |  | 9 | 0 | 8 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| County | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pass | noise |  | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| State | noise |  | 3 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Country | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pond | noise |  | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

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

## Matched through translation — hand-check sample

Rows skipped because their name, with landmark words mapped to English through `docs/kan-433/landmark-terms.json` and function words dropped, matches a served landmark's translated name within 25 m. 60 row(s); a seeded sample of 50 for a person to check — any pair here that is NOT the same place is a bug in the term table or the step.

| fsq_place_id | archive name | served name | served type | m | translated (archive ↔ served) |
|---|---|---|---|---:|---|
| 07ef0d96941647670c086753 | Igreja Baptista | Igreja Evangélica Baptista de Elvas | church | 9 | baptista church ↔ baptista church elvas evangelical |
| 0d813091090e4ae18a517402 | Parque de Campismo de Porto Covo | Camping Porto Covo | campground | 17 | camping covo harbor park ↔ camping covo harbor |
| 2bc1f5e596114b971ca78d5b | Museu Municipal Leonel Trindade | Leonel Trindade Municipal Museum | museum | 14 | leonel municipal museum trindade ↔ leonel municipal museum trindade |
| 4b0588a3f964a52093d122e3 | Casa-Museu Medeiros e Almeida | Medeiros & Almeida Museum | art_gallery | 4 | almeida casa medeiros museum ↔ almeida medeiros museum |
| 4b7a8c17f964a520a5302fe3 | Mosteiro dos Jerónimos | Jerónimos Monastery | church | 12 | jeronimos monastery ↔ jeronimos monastery |
| 4bc1ef0aabf495213da1c193 | Palácio de Monserrate | Park and Palace of Monserrate | historical_landmark | 11 | monserrate palace ↔ monserrate palace park |
| 4c5288f294790f476ff4d5a2 | Ponte do Freixo | Freixo Bridge | bridge | 23 | bridge freixo ↔ bridge freixo |
| 4c71059ed97fa14395bdf7ca | Praia da Amoreira | Amoreira Beach, Aljezur, Algarve | beach | 12 | amoreira beach ↔ algarve aljezur amoreira beach |
| 4d0ca2b45c46a0933d8809b4 | Igreja de Santo Ildefonso | Church of Saint Ildefonso | church | 20 | church ildefonso saint ↔ church ildefonso saint |
| 4e133aece4cdef074b830576 | Casa de Francisco e Jacinta | Casa Jacinta E Francisco Marto | church | 17 | casa francisco jacinta ↔ casa francisco jacinta marto |
| 4e34231a1f6efba2411e5d84 | Igreja da Misericordia | Church of the Misericordia | church | 21 | church misericordia ↔ church misericordia |
| 4e9abf589adf277db7cb5650 | Ponte da Régua | Ponte Rodoviaria da Regua | bridge | 13 | bridge regua ↔ bridge regua rodoviaria |
| 4f48c51be4b072f5aacecb28 | Igreja Adventista Central | Igreja Adventista do Setimo Dia Lisboa Central | church | 24 | adventista central church ↔ adventista central church dia lisboa setimo |
| 4f6f5483e4b08d8da78cd054 | Forte de Nossa Senhora de Porto Salvo (Giribita) | Forte da Giribita | historical_landmark | 5 | fort giribita harbor lady our salvo ↔ fort giribita |
| 5028d7c5e4b031f7a2f64ea4 | Camping de Covas | Parque Campismo Covas | campground | 14 | camping covas ↔ camping covas park |
| 502e331de4b0bde725cb2d01 | Praia de Porto Mós | Porto De Mós | beach | 18 | beach harbor mos ↔ harbor mos |
| 50c6289590e732743b1105b3 | Igreja Evangélica Batista | Primeira Igreja Evangelica Batista de Setubal | church | 14 | batista church evangelical ↔ batista church evangelical primeira setubal |
| 51475ae2e4b0853bfff86a94 | Igreja de São Miguel | Church São Miguel | church | 6 | church miguel saint ↔ church miguel saint |
| 51bc8bf1498e9198b5cc3544 | Centro Cultural Naraze | Cultural Center of Nazaré | cultural_center | 12 | center cultural naraze ↔ center cultural nazare |
| 52af8f4b11d278d814fad25f | Igreja Godim | Igreja de São José de Godim | church | 23 | church godim ↔ church godim jose saint |
| 53556cf1498eaca19c5c13c2 | Mosteiro longos vales | Longos Vales Monastery | church | 12 | longos monastery vales ↔ longos monastery vales |
| 55577723498e636be8cf5817 | Galeria Olga Santos | Olga Santos Arquitectura e Galeria de Arte | art_gallery | 7 | gallery olga saints ↔ arquitectura art gallery olga saints |
| 557c5bf8498e430a491459b4 | Igreja de Santo Antão | Santo Antão Church | church | 12 | antao church saint ↔ antao church saint |
| 569186a8498e1cf94b60c933 | igreja maceda | Igreja Paroquial de Sao Pedro de Maceda | church | 9 | church maceda ↔ church maceda parish pedro saint |
| 5761e5ba498e137c568bb286 | Parque de campismo da Calheta Fajã Grande | Camping Calheta | campground | 11 | calheta camping faja grande park ↔ calheta camping |
| 57652c43cd1069907000d963 | Ermida da Guia | Ermida da Senhora da Guia | church | 13 | guia hermitage ↔ guia hermitage lady |
| 585f96aa03e29a1f507b290d | A Igreja de Jesus Cristo dos Santos dos Ultimos Dias | The Church of Jesus Christ of Latter-day Saints | church | 16 | christ church day jesus latter saints ↔ christ church day jesus latter saints |
| 5896e8839c439d22b7879aed | Tejo Ward - The Church of Jesus Christ of Latter-day Saints | Igreja de Jesus Cristo dos Últimos Dias | church | 8 | christ church day jesus latter saints tejo ward ↔ christ church day jesus latter |
| 58f643ed3731ee6491dbd42d | Museu da Saúde | Saúde Museum | museum | 12 | museum saude ↔ museum saude |
| 59e24636829b0c7848f49292 | Igreja Da Lupa | Lapa Church | church | 10 | church lupa ↔ church lapa |
| 5bd72d732632ec002cd73022 | Anta Da Foz Do Rio Frio | Foz do Rio Frio dolmen | historical_landmark | 11 | dolmen foz frio river ↔ dolmen foz frio river |
| 5d46a55c95cf6f0008d0db14 | A Igreja De Jesus Cristo Dos Santos Dos Últimos Dias | The Church of Jesus Christ of Latter-day Saints | church | 8 | christ church day jesus latter saints ↔ christ church day jesus latter saints |
| 5d5abfce912a95000778240a | Igreja Nossa Senhora Do Carmo | Igreja do Carmo | cemetery | 15 | carmo church lady our ↔ carmo church |
| 61c6f819e565fe05c73366e8 | Igreja Canedo | Igreja Paroquial de São Pedro de Canedo | church | 18 | canedo church ↔ canedo church parish pedro saint |
| 6353dfd6e724416aed5d9b80 | Museu Militar Da Madeira | Madeira Military Museum | museum | 25 | madeira militar museum ↔ madeira military museum |
| 6520381f1f561b61591a5ab9 | Igreja De Santa Cruz | Church of Santa Cruz | church | 24 | church cruz saint ↔ church cruz saint |
| 65302caef80806527b7bd8df | Palacio Belmarco | Belmarço Palace | historical_landmark | 7 | belmarco palace ↔ belmarco palace |
| 65f734feaeaa5442ab89bebe | Church Of Carrapateira | Igreja Matriz da Carrapateira | historical_landmark | 11 | carrapateira church ↔ carrapateira church mother |
| 66c60984fd002e4d2a0f606a | Farol da Azeda | Azeda Lighthouse | historical_landmark | 6 | azeda lighthouse ↔ azeda lighthouse |
| 68729f935ce7d33d7a0ec5fa | Belem Tower | Torre de Belém | historical_landmark | 15 | belem tower ↔ belem tower |
| 68bfe1c80005dc01f215739b | Banana Museum Of Madeira (Bam) | Museu da Banana da Madeira - BAM | museum | 18 | bam banana madeira museum ↔ bam banana madeira museum |
| 6a74c665ffc47864189687ee | Oliva Art Center | Centro de Arte Oliva | museum | 17 | art center oliva ↔ art center oliva |
| 6a74caeec5fb9f02d8c55147 | A Igreja de Jesus Cristo dos Santos dos Últimos Dias | The Church of Jesus Christ of Latter-day Saints | church | 0 | christ church day jesus latter saints ↔ christ church day jesus latter saints |
| 6a750669c5fb9f02d8cdfae3 | A Igreja de Jesus Cristo dos Santos dos Últimos Dias | The Church of Jesus Christ of Latter-day Saints | church | 0 | christ church day jesus latter saints ↔ christ church day jesus latter saints |
| 6a754d7fc5fb9f02d8d66c89 | Municipal Museum of Faro | Museu Municipal de Faro | museum | 3 | faro municipal museum ↔ faro municipal museum |
| 6a758d98c5fb9f02d8e08065 | Melgaço Museum of Cinema | Museu do Cinema de Melgaço | museum | 4 | cinema melgaco museum ↔ cinema melgaco museum |
| 6a758f24c5fb9f02d8e0b973 | Arquivo Histórico Municipal | Museu Municipal e Arquivo Histórico de Valongo | museum | 11 | arquivo historico municipal ↔ arquivo historico municipal museum valongo |
| 6a758fecc5fb9f02d8e0d4a3 | National Palace of Sintra | Palácio Nacional de Sintra | historical_landmark | 8 | national palace sintra ↔ national palace sintra |
| 6a759916c5fb9f02d8e257b1 | Museum of Sacred Art | Museu de Arte Sacra | museum | 5 | art museum sacred ↔ art museum sacra |
| 6a7a4b773f0a8f28b8d32a41 | Sacred Art Museum of Funchal | Museu Arte Sacra Funchal | museum | 17 | art funchal museum sacred ↔ art funchal museum sacra |

## Served landmark within 25 m under another name — imported, for curation

Would-insert rows with a served landmark or venue (not a business) within 25 m whose name the matcher cannot pair. The contract imports them — different names are different places, distance alone never removes — and the Worker's read-time suppression is exact-name too. Some are real neighbours (a statue by a church); the ones that are the same place under another language or alias ("Mosteiro dos Jerónimos" / "Jerónimos Monastery") are what this list is for — what the translation step above did not pair. 1,355 row(s); a seeded hand-check sample of 50:

| fsq_place_id | name | our type(s) | served neighbour | translated (archive ↔ served) |
|---|---|---|---|---|
| 4b5bc4c2f964a520161529e3 | Pop | night_club | overture:8a58ee0b-d77d-4dd6-b5d8-e13f95d076ad "Bar Discoteca Dona Urraca" (night_club) at 10 m | pop ↔ bar discoteca dona urraca |
| 4c103dfa81e976b069ec0eeb | [kõ.pa.'ni.a] | night_club | overture:d07352e3-a46e-4779-af8e-1813ba456455 "Companhia Club" (night_club) at 24 m | ko ni pa ↔ club companhia |
| 4d4f0edf23a76dcbf8b866dc | Igreja Sagrado Coração de Jesus | church | overture:d94c279d-0963-4b3f-9930-add910a4e76b "IDFC - Patriarcado de Lisboa" (church) at 2 m | church coracao jesus sagrado ↔ idfc lisboa patriarcado |
| 4d4fc014e027548182b299b6 | Madeira Story Center | museum | overture:7847523a-3c2f-429f-ab5a-21b7c5f8263c "DJ SIL" (music_venue) at 19 m | center madeira story ↔ dj sil |
| 4d80e8d2a4e237042659becc | Vila Louize | night_club | overture:99b9103c-ddd8-41b8-9077-9562db91b316 "Vizinhos" (art_gallery) at 22 m | louize vila ↔ vizinhos |
| 4dbcbf744df044e524ed2884 | Massas Cafe | night_club | overture:b4ea2c61-f39e-4fd0-9567-4db63f219668 "Missão Adonai Coimbra" (church) at 23 m | cafe massas ↔ adonai coimbra missao |
| 4de1bb63e4cd056f74344510 | NB Discoteca | night_club | overture:544f28d7-88c4-4b84-ad8d-07779f29b2d4 "NB Club Figueira \| Figueira da Foz" (night_club) at 17 m | discoteca nb ↔ club figueira figueira foz nb |
| 4dfe417f2271043ca8096b28 | Clube Náutico de Paço de Arcos | marina | overture:5f4b4dcc-acae-4e6a-92ae-4052cfeff395 "Paço De Arcos, Centro Náutico" (beach) at 9 m | arcos club nautico palace ↔ arcos center nautico palace |
| 4e4f05ae2271a1bdc3d94575 | Aos Marinheiros da Grande Guerra | historical_landmark | overture:f437d322-ddd8-4bf5-84b9-34616ea1f6c2 "Santuário da Esperança" (church) at 8 m | aos grande guerra marinheiros ↔ esperanca sanctuary |
| 4e58be51aeb7d78d9f6ccdb2 | Nelo Summer Challenge | marina | overture:d103a0e3-f985-4085-8dfc-0817d5b8f66a "Skate Park da Póvoa de Varzim" (park) at 5 m | challenge nelo summer ↔ park povoa skate varzim |
| 4e6b3c20d22d0e4cf662d567 | Pç. Joaquim António de Aguiar | historical_landmark | curated:fsq:1b1aea3b0af7427a1e3fd084 "Centro Dramático de Évora" (theatre) at 19 m | aguiar antonio joaquim pc ↔ center dramatico evora |
| 4e84b3447ee6dd97bfb2da35 | Capela da Nossa Senhora da Gloria | church | overture:a695c7a1-04d3-4cac-bd28-7a214d1be5b3 "Irmandade De Nossa Senhora Da Gloria do Cardal" (church) at 0 m | chapel gloria lady our ↔ cardal gloria irmandade lady our |
| 4ec581e96c254debeb5b3f20 | Igreja Das Taipas | church | overture:5daf2c82-c9c0-440e-9ecc-f4be7e1f5c4c "World of Discoveries" (museum) at 9 m | church taipas ↔ discoveries world |
| 4ede71f8e5fa78b172e242c6 | Futebol Clube Dos Flamengos | stadium | overture:c8873a86-b17e-4b3a-a9eb-610e0045a695 "Tuna e Grupo Folclórico Juvenil dos Flamengos" (cultural_center) at 3 m | club flamengos futebol ↔ flamengos folclorico grupo juvenil tuna |
| 4f37ff2fe4b0d9574d982d12 | Foz Rio Mondego | river | overture:d221672b-9073-4a77-9246-db6fc639e9a4 "Praça Da Europa" (plaza) at 25 m | foz mondego river ↔ europa square |
| 4f50beb7e4b044219026ab92 | Pelourinho de Veiros | historical_landmark | overture:98063811-b515-4631-95c6-e50432ab1ab7 "Sociedade Filarmónica Veirense" (music_venue) at 7 m | pillory veiros ↔ filarmonica sociedade veirense |
| 4f563a17e4b0ed29b78f01a6 | Igreja Barro | church | overture:4a056117-3e78-45bd-aede-9862c231e6d2 "Zi Bar Lounge" (night_club) at 6 m | barro church ↔ bar lounge zi |
| 4facc60ee4b01d34f67fb584 | 4A | amusement_park | overture:2b433037-a9f8-4004-88e6-94974a82ccd4 "Alameda Residence" (historical_landmark) at 23 m | 4a ↔ alameda residence |
| 50212d11e4b0aa8c327978de | Ingres dos Clérigos de São Pedro | historical_landmark | overture:86391f9e-2d50-437e-9dcb-8751cd71a4da "Igreja de São Pedro (Amarante)" (church) at 8 m | clerigos ingres pedro saint ↔ amarante church pedro saint |
| 5025a83ae4b08c739b0d1439 | Igreja da Piedade | church | overture:bb476a7c-23fa-4279-b8a0-1550c9cac715 "Paróquias do Porto Santo" (church) at 14 m | church piedade ↔ harbor paroquias saint |
| 509c6f0ee4b0bbf7753d2524 | Play CS | casino | overture:b10bacb3-bfb8-4b66-9ae2-71d755bf332b "Igreja Metodista Wesleyana" (church) at 20 m | cs play ↔ church metodista wesleyana |
| 50e6cccce4b06958b0945a30 | SHOWS | music_venue | overture:de031d68-26e9-45ab-a884-48cde98c454c "MEALHADA Parque Temático" (amusement_park) at 21 m | shows ↔ mealhada park tematico |
| 514096b0e4b0da62c6115000 | mitico sotao, se é que me entendes belhote ;D | night_club | overture:1d51e196-8526-41e7-b9b3-5fe04ca5ed9b "Largo 2 de Agosto" (park) at 24 m | belhote cathedral d entendes me mitico que sotao ↔ 2 agosto square |
| 5195514c498e4eb3884ebe09 | Indoor Soccer Olival | stadium | overture:5bf03039-664f-4993-a98a-c1e7376dae70 "Speed Soccer" (stadium) at 12 m | indoor olival soccer ↔ soccer speed |
| 51ed1c98498e302638bc5aaf | Catia Viegas | art_gallery | overture:22b58b1d-865c-431d-af37-9271499e4b18 "Escadinhas da Audiência" (plaza) at 13 m | catia viegas ↔ audiencia escadinhas |
| 5218ca4d11d2c8ab91469090 | Trilho Mata Do Canário | hiking_area | overture:c56055b2-f510-4f40-a56e-600dc7167e28 "Moinhos da ribeira Funda" (hiking_area) at 2 m | canario mata trail ↔ funda moinhos ribeira |
| 522b6f1311d235eba4fd4491 | Cineplace LeiriaShopping | movie_theater | overture:8731acef-42f9-4581-ab0a-1b111b546bee "Cineplace Portugal" (movie_theater) at 22 m | cineplace leiriashopping ↔ cineplace portugal |
| 5262f88411d2cf1fc10f8250 | Atelier João Figueiredo | art_gallery | overture:f18ff39e-808a-40ab-a54f-87e7c3ca0f36 "Zmar Eco Resort & Spa" (campground) at 23 m | atelier figueiredo joao ↔ eco resort spa zmar |
| 5288340a11d24e4d138c8f00 | Thiara Club | night_club | overture:ee35fb6c-19af-4565-a2bb-b0b90995331c "Discoteca Theatro" (night_club) at 21 m | club thiara ↔ discoteca theatro |
| 53234151498eafb0086a175a | WC do King | art_gallery | overture:84777da8-d300-46c7-86da-dc7c6ee4ad70 "Estúdio King" (music_venue) at 8 m | king wc ↔ estudio king |
| 544922c1498e6a3b011431e7 | Nossa Senhora da Boa Estrela | historical_landmark | overture:78e613a0-4f78-4e9c-b0aa-399623f39fcb "Igreja de Santiago e Panteao dos Cabrais" (church) at 19 m | boa estrela lady our ↔ cabrais church panteao santiago |
| 54b8df45498e8ddf27969ee8 | Museu da FBAUP | museum | overture:a97494b1-2dde-4358-a064-9b61a8f068b4 "Paróquia Do Redentor" (church) at 21 m | fbaup museum ↔ parish redentor |
| 57487e62498ef9ed5dbf710d | Museu Arqueológico Do Fundão | museum | overture:23e8933a-db3c-4d28-b855-0b702d3ef158 "CNE - Agrupamento 120 Fundão" (church) at 7 m | arqueologico fundao museum ↔ 120 agrupamento cne fundao |
| 583698f7a913305f11b6ac74 | Estudios Nirvana | music_venue | overture:4845e614-e85c-4272-b818-9f862afe8736 "Arena Lounge, Casino Lisboa" (music_venue) at 5 m | estudios nirvana ↔ arena casino lisboa lounge |
| 587a3f9a76f2ca5827d9692c | Igreja de S. Paio | church | overture:e0415c91-771b-4088-a914-07a344618678 "Paróquia de Requeixo" (church) at 11 m | church paio s ↔ parish requeixo |
| 5abe64e591eaca443f7f2c77 | Caldeira do Mosteiro | historical_landmark | overture:69720d06-2502-4a51-83ea-b78f3ce74468 "Calmos - Caldeira do Mosteiro: Magic in the emerald of the Atlantic" (historical_landmark) at 14 m | caldeira monastery ↔ atlantic caldeira calmos emerald in magic monastery |
| 5bacafcb73fe25002cd787fc | Castelejo | historical_landmark | overture:63e928be-2d99-4a9e-9db5-baf34c4d4639 "Château Saint-Georges" (historical_landmark) at 18 m | castelejo ↔ chateau georges saint |
| 5d2a6f6975e1ab00234a5e30 | Ferro Terrace | night_club | overture:66058d84-8353-436d-8284-8415e064e74f "O Porto Re-Aparecido" (historical_landmark) at 13 m | ferro terrace ↔ aparecido harbor re |
| 60cf2380dbc9365fec91bedf | Arco de Sāo Bento | historical_landmark | overture:7c6363ed-3afd-42d1-997e-569f20e0850e "Parque da Palhavã" (park) at 14 m | arco bento saint ↔ palhava park |
| 6267e8c1cb7ce64fc6b5396d | Armazém Regimental | historical_landmark | overture:e99fadb0-c3cd-45bd-a9bb-b4eef1025935 "Igreja de São Brás" (church) at 5 m | armazem regimental ↔ bras church saint |
| 62c9733223508b6b50043a0b | Fonte dos Pisōes | historical_landmark | overture:cddf53b4-df0a-4d8e-b618-9421c433badd "Jose Manuel Guerreiro de Sousa" (historical_landmark) at 5 m | fountain pisoes ↔ guerreiro jose manuel sousa |
| 63d56d863fab49355d19d64d | Fábrica da Igreja Paroquial de Nossa Senhora Lapa da Falagueira | church | overture:8c743f2f-d9a9-42e7-9559-1a3d682f3a7b "Capela de Nossa Senhora da Conceicao da Lapa" (church) at 14 m | church fabrica falagueira lady lapa our parish ↔ chapel conceicao lady lapa our |
| 6463df6048bccb7aca4d5605 | Homenagem A D. João Evangelista De Lima Vidal | historical_landmark | overture:f96fa6ef-db67-465b-b996-fd24cb7bc49f "Igreja de Nossa Senhora da Apresentação / Igreja Paroquial da Vera-Cruz" (church) at 7 m | d evangelista homenagem joao lima vidal ↔ apresentacao church church cruz lady our parish vera |
| 66263024ad20166ad66b0869 | Eden Teatro | theatre | overture:4adafb5e-73af-413c-9cdb-0e33658ad495 "Monastery At St Jeronimos" (church) at 16 m | eden theater ↔ at jeronimos monastery saint |
| 680cde96bcec2b342f3a1f3a | Lar de Santa Estefânia | historical_landmark | overture:265bef2d-6fad-46cb-86a5-8f9c36cb854e "Igreja do Carmo" (cemetery) at 4 m | estefania lar saint ↔ carmo church |
| 69f635570fc5a5628e325472 | Centro Interpretativo Da Ordem De Avis | museum | overture:602e1c08-df47-450d-b165-1009845aa2a2 "Museu do Campo Alentejano" (museum) at 5 m | avis center interpretativo ordem ↔ alentejano campo museum |
| 6a2db698e4e6bd606e5ca14f | Grupo 267 - Escoteiros De Portugal | campground | overture:16643b8a-6cb9-42fa-8126-85ab6826eba7 "CAEG - Centro de Atividades Escotistas de Gondomar" (campground) at 10 m | 267 escoteiros grupo portugal ↔ atividades caeg center escotistas gondomar |
| 6a74c48effc4786418964332 | Centro de Interpretação da Cultura Sefardita do Nordeste | museum | overture:405fe95b-eeab-4dc6-9fbc-504d1859bedd "Centro de Arte Contemporânea Graça Morais" (museum) at 23 m | center cultura interpretacao nordeste sefardita ↔ art center contemporanea graca morais |
| 7cfacb18c19a43d5bf741895 | Paróquia de Santo Amaro | church | overture:176f845e-61a8-4db3-86d6-0bd743434fcd "Club Sport Maritimo" (stadium) at 0 m | amaro parish saint ↔ club maritime sport |
| aae296a04c8744d58630c181 | Gabriel de Freitas Caires | night_club | overture:5ed27cbc-6f1d-4d2c-96f4-88093e36a5ab "Jardin Botanique Funcha" (botanical_garden) at 12 m | caires freitas gabriel ↔ botanique funcha jardin |

## Fuzzy far names — imported, for curation

Would-insert rows whose nearest served row 75–400 m away scores between 0.72 and 0.9 on name_similarity — the rung the preflight counted as suspect and this importer does not (see `SAME_NAME_SIMILARITY`). 484 row(s); first 20:

| fsq_place_id | name | our type(s) | nearest fuzzy far name |
|---|---|---|---|
| 2e0090cac8c94237c4e25aba | Igreja Matriz de São Miguel Arcanjo | church | overture:625688bf-e994-44c5-9ed0-55cfa0650bef "Matriz São Miguel Arcanjo" (church) at 259 m, sim 0.83 |
| 3b98cc011b4a4c6968443f63 | Pároco de Unhais da Serra | church | overture:fe2ac3e5-69e0-4177-9e58-9655d258f2bc "Agrupamento 607 de Unhais da Serra" (church) at 188 m, sim 0.75 |
| 4b0588a2f964a5202cd122e3 | Chafariz da Buraca | historical_landmark | overture:c938d453-9205-4aab-a2a8-a615dc8d5771 "David da Buraca" (restaurant) at 168 m, sim 0.73 |
| 4b0588a2f964a520f6d022e3 | Bar do Rio | night_club | overture:5a6c7690-f63a-47c6-a698-d524b1a747c1 "Bar do Cais" (bar) at 159 m, sim 0.76 |
| 4b0588a3f964a52083d122e3 | Museu da Música | museum | overture:e5f2d96e-912a-49af-85c8-7d75f3090d91 "Museu Nacional da Música" (museum) at 202 m, sim 0.77 |
| 4b0588a4f964a520b9d122e3 | Galeria Pedro Serrenho | art_gallery | overture:43ec04ee-34df-4b5f-a3b2-16505b507bc6 "Galeria Pedro Cera" (art_gallery) at 281 m, sim 0.80 |
| 4b0588a7f964a52095d222e3 | Teatro Infantil de Lisboa | theatre | overture:d0d7d9a9-e96d-405f-b39a-4ff0c8d296f9 "Teatro Romano de Lisboa" (historical_landmark) at 316 m, sim 0.79 |
| 4b0588a8f964a520bfd222e3 | Cine-Teatro de Corroios | theatre | overture:eaf21b50-4f48-4d77-b8da-f15aaf6b25f4 "Oculista de Corroios" (store) at 399 m, sim 0.74 |
| 4ba0a49cf964a520897537e3 | Doca do Bom Sucesso | marina | overture:031c8108-28c3-461b-a728-e3ff87c16751 "Colégio do Bom Sucesso" (school) at 168 m, sim 0.78 |
| 4bbb94eee5b0d13a403c6e7c | Estádio Universidade de Coimbra | stadium | overture:fc945f2c-b779-4be4-8952-501a86d3eb31 "Estádio Universitário de Coimbra" (gym) at 148 m, sim 0.89 |
| 4c1e013bb306c928846166b7 | Jardim Botânico de Coimbra | botanical_garden | overture:c05b2b83-b86a-4715-aeea-debba1e8d98d "Jardim Botânico da Universidade de Coimbra" (botanical_garden) at 240 m, sim 0.76 |
| 4c3259353896e21ef065e890 | @ Adro Da Sé | music_venue | overture:66e4abc5-082f-4047-b7e9-054278aa8b3f "Penedro da Sé" (bar) at 264 m, sim 0.78 |
| 4c4807f3417b20a1459adfa9 | Estádio do Bessa XXI | stadium | overture:d8426e5c-d567-4452-803c-19a6390befe4 "Estádio do Bessa Século XXI" (stadium) at 116 m, sim 0.85 |
| 4c4c6bcb9c8d2d7f3dab666c | Teatro / Cine Estúdio do Campo Alegre | historical_landmark, theatre, movie_theater | overture:9d499a35-36d4-4386-897f-7af1d7991ccb "Teatro do Campo Alegre" (theatre) at 251 m, sim 0.77 |
| 4c4f430ba7351b8d4176d192 | Igreja Paroquial Nossa Senhora das Dores | church | overture:c9926be2-2e58-4601-bf2e-3fadf96e2032 "Centro Infantil Nossa Senhora das Dores" (school) at 107 m, sim 0.76 |
| 4c669a69e1da1b8d664f9bc3 | Claustro De Se Velha | historical_landmark, church | overture:aec59e13-5e35-4a9b-b513-9eca8dd9555b "Largo da Sé Velha" (plaza) at 274 m, sim 0.81 |
| 4c66a167aebea5934d8c73d0 | Parque de Campismo Municipal de Vila Flor | campground | overture:af49a962-f959-4254-a16c-0b63168d8406 "Parque de Campismo de Vila Flor" (campground) at 78 m, sim 0.86 |
| 4c70dee49375a093b66c0837 | Doca de Belém | marina | overture:247f9be2-b401-4fcd-9987-13599d1b3ffd "Cais de Belém" (restaurant) at 297 m, sim 0.85 |
| 4c8623ced34ca14393d44c80 | Castelo de Marvão | historical_landmark | overture:5733681d-fa25-4f6a-954a-998e46b557ec "Ca De Marvao" (store) at 321 m, sim 0.83 |
| 4c94289f72dd224b96bc9791 | Casa do Livro | night_club | overture:1a450664-f4d2-4faa-b418-ef28b40bd5aa "Casa do Carmo" (restaurant) at 87 m, sim 0.77 |

## In-batch name near-misses — both imported, for curation

Kept rows sharing a normalised name 75–400 m apart. Under the contract both import (a name match needs the distance too); 8 pair(s), first 20:

| fsq_place_id | fsq_place_id | name | m |
|---|---|---|---:|
| 4ba3f8def964a520187338e3 | f26963d4fa334d6bafbb0ce6 | Passeio Marítimo de Oeiras | 166 |
| 4d6b60dc35c9a093a46c43c7 | 55f1741c498eb7dd61db69b9 | Porto de Leixões | 305 |
| 4ec8eaa5722e1437980c292d | 512b5e33e4b051c724c711cc | Capela Nossa Sra da Guia | 143 |
| 50158171e4b035d9f526e0c2 | 51ebfb2a498efd00dffe8e6a | Rio Bestança | 213 |
| 5054f3dce4b0c3ed1ef214f0 | 5054f465e4b0150f2eaa9942 | Portas da Coroada | 208 |
| 5813875c38fa6e365ce6b75b | 581387a938fa070a18251d60 | Side Wake Lake! | 341 |
| 64bd2a6b576b0c0157375377 | 64bd2b755795ac3ff54ce5ab | Palco Jmj | 227 |
| 8c9c65b4e315408b67cb9b3f | de358d8bfb2c41147d180d3f | Igreja Peniel | 316 |

## Samples of would-insert rows, per leaf

### Church — 1,770 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d029c41c2e53704bb1eac67 | Igreja S. Lázaro |  | 41.54659 | -8.42131 | church |
| 4df22e50d1649c8a28dda7e1 | Mosteiro S. Miguel Refojos | Cabeceiras de Basto | 41.51361 | -7.99341 | church |
| 4e5513a3b0fb1e3684c9d79b | Igreja do Cercal | Santiago do Cacém | 37.80046 | -8.67244 | church |
| 4eac1212d3e3846cbd559b2e | Mosteiro de Sta. Maria de Oliveira |  | 41.40618 | -8.40301 | church |
| 4f4aafe5e4b011fb77e1cf45 | Igreja De São Sebastião | Santarém | 39.33604 | -8.93630 | church |
| 4f65fbc3e4b0fb96f72a1562 | Terceira Igreja Evangelica Baptista de Lisboa | Lisboa | 38.73399 | -9.14821 | church |
| 4fb80678e4b067320b9d74c4 | Igreja de Sao Cucufate |  | 38.29487 | -8.50867 | church |
| 50683561e4b064a76d1f77e2 | Ala Potengi |  | 40.97688 | -8.47311 | church |
| 508abb86e4b0a1c846c0fd7f | Igreja de São João de Alporão | Santarém | 39.23551 | -8.68002 | church |
| 51471519e4b075ebdb4cbd30 | Ermida Sra da Piedade |  | 40.11357 | -8.45063 | church |
| 5272da6a498e89f96aede8f6 | Igreja Paroquial Da Pesqueira |  | 41.14704 | -7.40539 | church |
| 53f9ba50498e073c7dbcd5ba | Igreja do Espírito Santo | Porto Santo | 33.05052 | -16.35160 | church |
| 54297057498e69504f4fe1d3 | igreja de valbom |  | 41.12902 | -8.56114 | church |
| 55f4379c498e4aa9fe62aadb | Igreja De Santiago |  | 38.37206 | -8.51261 | church |
| 5a513784fdb9a758f68254f0 | Igreja Da Graça | Castelo Branco | 39.82737 | -7.49283 | church |
| 5d64f0431f3014000878fd32 | Capela De Nossa Senhora Do Alívio | Anquião | 41.16300 | -7.89766 | church |
| 62f91392746a243383a8697a | Santuário De Nossa Senhora Do Porto De Ave | Taíde | 41.55774 | -8.22137 | church |
| 6425c16570f27d323298d75e | Capela Sto António Do Calvário | Espinhal | 40.01300 | -8.34764 | church |
| 64357f30f430036f2938099f | Igreja Anjos | Ponte de Lima | 41.76298 | -8.58291 | church |
| 8ea36cbac0504ab7749ac3f3 | Seminário São José | Felgueiras | 41.37857 | -8.20160 | church |

### Night Club — 903 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b5321b3f964a520d08f27e3 | Forte S. João | Vila do Conde | 41.34171 | -8.75185 | night_club |
| 4c94289f72dd224b96bc9791 | Casa do Livro | Porto | 41.14740 | -8.61431 | night_club |
| 4d7c07c873ca54814b46577c | Fashion Dance Club | Sintra | 38.92964 | -9.41700 | night_club |
| 4dcf1a91b0fb25f6e355ebd5 | Palha d' Aço | Viseu | 40.64711 | -7.91713 | night_club |
| 4e5ed4a1a8090ec2164da6ed | Smile Bar | Ovar Municipality | 40.95365 | -8.65521 | night_club |
| 4e752ad9d1643f93b1cfdf77 | Club 5 Aveiro | Aveiro | 40.63247 | -8.64587 | night_club |
| 4eea599dec6d48cacc1e649d | União Desportivo Santana | Santana | 32.80090 | -16.87954 | night_club |
| 5000c259e4b0c432ce4dc2ec | Long Beach |  | 38.57121 | -9.19496 | night_club |
| 5010bfa8e4b0073bcecc8472 | MoreClub |  | 40.67256 | -7.90153 | night_club |
| 507c53e1e889d243384583ce | Copy Dance II | Vale de Cambra | 40.86102 | -8.37840 | night_club |
| 517b2625e4b0478d08db65ec | Rodoviaria Festa! | Abrantes | 39.46035 | -8.19889 | night_club |
| 527ed4bd11d2e567d9c2d9fd | Oops | Lisboa | 38.70183 | -9.17838 | night_club |
| 5296a760498ea4362f9fbd15 | Espaço Leça Marina |  | 41.23282 | -8.57508 | night_club |
| 53112d3c498e4224155be2d4 | Night Club Spot |  | 38.05091 | -8.78991 | night_club |
| 54fdc331498ef2ecce715295 | Ginjal Terrasse | Almada | 38.68793 | -9.14885 | night_club |
| 563d2234cd10a899bbbc6b0f | Spirlet's house |  | 37.14663 | -8.64182 | night_club |
| 58152e4a38fa8201ae5e1784 | Club Kadoc | Albufeira | 37.08901 | -8.25231 | night_club |
| 587ae6db790bea41ddd3a593 | Play Club |  | 41.18312 | -8.14624 | night_club |
| 5aa1f5db77c746a7431cc967 | Leitaria Palma | Lisboa | 38.72023 | -9.13505 | night_club |
| 844594f42af74d3125494553 | Snack-Bar Tó e Guise | Viseu | 40.65655 | -7.91320 | night_club |

### Historic and Protected Site — 751 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4ca373657f84224b4604c558 | Palace Hotel do Bussaco | Luso | 40.37602 | -8.36466 | historical_landmark |
| 4e37fee9d22d4cf95ee62d36 | Vale de Janelas | Torres Vedras | 39.14261 | -9.37086 | historical_landmark |
| 4e79ff211f6e07f917f0cfcb | Instituto dos Vinhos do Douro e Porto | Porto | 41.14186 | -8.61546 | historical_landmark |
| 4f0f2ce7e4b03684a61b1946 | Torre de Menagem | Mértola | 37.63836 | -7.66373 | historical_landmark |
| 4f633281e4b045fbd2832733 | Sepultura |  | 38.79226 | -9.38870 | historical_landmark |
| 4fc168b7e4b08acecb744456 | Pinhal do Norte |  | 41.44913 | -7.25455 | historical_landmark |
| 4fdf9290e4b0a30bdf266857 | Nova Igreja De Manhente |  | 41.54825 | -8.57428 | historical_landmark |
| 502ccbb0e4b047ef993210f6 | Rua Maestro Francisco Lacerda |  | 38.68122 | -28.20578 | historical_landmark |
| 511cefbee4b077257f5b0ac5 | Ruelas |  | 41.73752 | -7.46656 | historical_landmark |
| 514dbb42e4b091940bc3606d | Torre de Menagem |  | 38.70747 | -9.13541 | historical_landmark |
| 518d22f3498e86e87f7cc289 | Escadas do Recanto | Porto | 41.14117 | -8.61761 | historical_landmark, hiking_area |
| 5271466d498ecdfe87957c97 | Centro Histórico do Porto | Porto | 41.14508 | -8.61092 | historical_landmark |
| 5415bf1d498ec48c3dcc54fc | Virtudes |  | 39.08679 | -8.82854 | historical_landmark |
| 5499acdf498eec3346007bfd | Largo da Misericórdia | Viseu | 40.65980 | -7.91189 | historical_landmark |
| 558587c0498ee2645e68cbb9 | Muralha de D. Dinis | Lisboa | 38.70864 | -9.13868 | historical_landmark |
| 59ca45480fe7a027ee69e447 | Igreja de Sao Pedro de Canaferrim | Sintra | 38.79231 | -9.38854 | historical_landmark |
| 5f464627b9d18d217025bcfd | Palacio Dos Condes De Ficalho | Serpa | 37.94483 | -7.59835 | historical_landmark |
| 65ec948b5e7f525900b314df | José Roque Junior Defensive Wall | Faro | 37.01196 | -7.93505 | historical_landmark |
| 669189d3e57c92208e330b4c | Palacete Primo Madeira | פורטו | 41.15316 | -8.63888 | historical_landmark |
| 6927198becd60f2f1b41d39a | Porta Talhada | Óbidos | 39.36288 | -9.15783 | historical_landmark |

### Art Gallery — 543 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4bca264d0687ef3b3268dbcc | ArteFacto | Lisbon | 38.71496 | -9.13095 | art_gallery |
| 4d593c618492a1436ccc2427 | Galeria 9arte | Lisboa | 38.70766 | -9.15018 | art_gallery |
| 4d6bbc0f994f224b600318eb | Contacto Directo |  | 41.16334 | -8.62661 | art_gallery |
| 4e3402b3483b5fa587523d9a | Mercado de usados na Rua do Castelo | Braga | 41.55094 | -8.42403 | art_gallery |
| 4e835d7fd22dd6a659d52627 | Flausina | Lisboa | 38.72747 | -9.12395 | art_gallery |
| 4eb1a638cc21adeaf8295983 | A Filantrópica |  | 41.36091 | -8.74551 | art_gallery |
| 4ef488d68231b0d622d943bc | Ricardo Casimiro |  | 38.71301 | -9.13001 | art_gallery |
| 4f6333a4e4b086a335ee9260 | baganha |  | 41.15191 | -8.62370 | art_gallery |
| 4fa96c7be4b06123da0b7c0f | Galeria Arte Viva | Lisboa | 38.71843 | -9.14339 | art_gallery |
| 50a53cf3e4b0566fc8226e85 | Espaço X |  | 41.14546 | -8.61132 | art_gallery |
| 50db2a05e4b0f4385ec7dc8f | Espaço Cultural |  | 41.69422 | -8.83250 | art_gallery |
| 51b704ab498e81a14ee0a65d | Made In Hollywood | Cascais | 38.69261 | -9.41924 | art_gallery |
| 5403023f498eccd895fa01a9 | Galeria de exposições | Espinho | 41.00734 | -8.64272 | art_gallery |
| 547768d6498e0698c4f9ea65 | Júlia Côta |  | 41.55198 | -8.56521 | art_gallery |
| 56a221b3498eda7b65ec2eeb | shairart.com | Braga | 41.54984 | -8.41927 | art_gallery |
| 587e76766c682b7472320f72 | Atelier de Pintura |  | 38.71067 | -9.15581 | art_gallery |
| 5fab6ba90d49d17ffbef0eb6 | The Art Gate | Lisbon | 38.71216 | -9.14268 | art_gallery |
| 68e7c1dc19b17c4d5f8d6931 | Rua Da Arte | Lisboa | 38.72658 | -9.14137 | art_gallery |
| 69a85ec97327e9548f7cc7be | Art Gallery | Lisboa | 38.71733 | -9.14149 | art_gallery |
| d939dbb4632245763c2aa5ff | Berardo Collection Museum | Sintra | 38.80323 | -9.38192 | art_gallery |

### Music Venue — 466 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4cf69a71c28df04d73eecb15 | Amigos Do Zé HQ | Oeiras Municipality | 38.71102 | -9.31487 | music_venue |
| 4d8b8d5326a36ea843240cae | Espaço Taberna das Almas | Lisboa | 38.72482 | -9.13648 | music_venue |
| 4e518fe418a8af30fda33927 | Palco de Verão da Vila Baleira | Vila Baleira | 33.05883 | -16.33532 | music_venue |
| 4e930aa2f5b95064c6e14d4f | Grupo Bell |  | 41.67340 | -6.69551 | music_venue |
| 4efe6d3493adc8245773ca06 | Clube Do miúdo |  | 38.79077 | -9.16461 | music_venue |
| 4f08d9e5e4b071c575fb372d | Radio 92,3 |  | 39.85551 | -8.55074 | music_venue |
| 4f411800e4b0085fee1f8d1b | Sede Rancho Lavradeiras de Martinho Gandra |  | 41.77848 | -8.50537 | music_venue |
| 500822fbe4b0acf3f3797713 | Myspace Pt HQ | Lisbon | 38.70258 | -9.17776 | music_venue |
| 502eeb6fe4b0f9a2dd1caee3 | NicklebackStage |  | 37.82071 | -25.53066 | music_venue |
| 50d77502e4b0a7a659e4020f | Studio T5 |  | 40.96911 | -8.49791 | music_venue |
| 524f4f6a11d2e7974cca0242 | Integr@-te |  | 40.64962 | -8.59415 | music_venue |
| 5543f014498e22de46d6c200 | Quarto Do Meio |  | 39.92089 | -8.95146 | music_venue |
| 55acf0b2498e17c489fa6fad | Groove Wood - music studio loft | Vila Nova De Gaia | 41.13650 | -8.61386 | music_venue |
| 5663704d498ea7ab9eac7c17 | Madeira dig |  | 32.73105 | -17.18269 | music_venue |
| 571885b7cd10a651ba07a8e9 | Zepplin Pub & Grill | Viseu, Portugal | 40.65803 | -7.91203 | music_venue |
| 576f8695498eb5f8a0372c83 | Associação Recreativa Malmequeres Noêda | Porto, Portugal | 41.13060 | -8.60727 | music_venue |
| 57f20b57498eda81d307bc1a | FNAC Braga | Braga, Portugal | 41.72735 | -8.16353 | music_venue |
| 5830c89c8d8e99259a958d67 | Video Games Live | Lisboa | 38.74333 | -9.14818 | music_venue |
| 5b503fe5364d97002c082717 | O TEATRÃO | Coimbra, Portugal | 40.20333 | -8.41028 | music_venue |
| 87751afddab541395d07e516 | Teatro Regional da Serra do Montemuro | Castro Daire | 40.99643 | -7.92804 | music_venue, theatre |

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

### Monument — 380 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4b0588a2f964a5202bd122e3 | Palacete dos Marqueses de Pombal | Lisbon | 38.70914 | -9.15220 | historical_landmark |
| 4dc0298b043706a0320f13d2 | Sala Staff 5Norte | Lisboa | 38.76536 | -9.10030 | historical_landmark |
| 4e9dd66377c815a0f5ebcc46 | Vilanova'z HQ ! | Vila Real de Santo António | 37.18512 | -7.45862 | historical_landmark |
| 4f4a33bbe4b0922ac7006352 | Capela De Santo Amaro |  | 41.18668 | -8.69193 | historical_landmark |
| 51588add011cb2d771c7f414 | Busto de António José de Almeida | Coimbra | 40.21371 | -8.42543 | historical_landmark |
| 58fcf209d7627e4dd35959ce | Largo Ponte Pedrina | Queluz | 38.75739 | -9.25821 | historical_landmark |
| 5932abffbfc6d012c00c9c06 | Aqui Nasceu O Benfica | Lisabon | 38.69974 | -9.20562 | historical_landmark |
| 5a5b334bb8fd9d5dbe1fe77c | Cristo Rei | Paços de Ferreira | 41.28996 | -8.42653 | historical_landmark |
| 5e46b537977b52000869e1de | Portas Da Traição | Trancoso | 40.78006 | -7.34744 | historical_landmark |
| 5f0a0e4767564371a9e97869 | Aqueduto de Óbidos | Óbidos | 39.35758 | -9.15698 | historical_landmark |
| 60b77a36d7c8b6235271ffe3 | Porta Da Vila | Óbidos | 39.35952 | -9.15779 | historical_landmark |
| 62ee4b1ef4dfac5fea827ffc | Statue Of Winston Churchill | Câmara De Lobos | 32.64809 | -16.97555 | historical_landmark |
| 645fbdca6e8cab284ecfbd9e | Monumento Ao Rei Dom Pedro | Ponte de Lima | 41.76970 | -8.58787 | historical_landmark |
| 6460f58b0a597b04d2ad47cf | Monumento Busto A Gustavo Ferreira Pinto Basto | Aveiro | 40.63888 | -8.65339 | historical_landmark |
| 65310b8ac4b6244485de5e12 | Cante Alentejano | Odemira | 37.60093 | -8.64269 | historical_landmark |
| 665c712b573653542d152bd5 | Chafariz Da Rotunda Do Milénio | castelo branco | 39.81348 | -7.50540 | historical_landmark |
| 676c060d37a78e4f77a0ab04 | Torre de Montedor | Carreço | 41.74977 | -8.87885 | historical_landmark |
| 69c7e050f35bbd7394541776 | Monumento Ao Tom Dela | Tondela | 40.50207 | -8.08181 | historical_landmark |
| 69f71db19c089b739b30f86a | Monumento a Alberto Sampaio | Guimarães | 41.44459 | -8.29354 | historical_landmark |
| 98fdcf2f907f478c59d818d8 | Museu Vivo de Vilar do Pinheiro | Vila do Conde | 41.35360 | -8.74283 | historical_landmark |

### Campground — 353 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 347f59808d3d4828a8c7c088 | Armindo Freitas Carregado | Cernache | 40.13624 | -8.48452 | campground |
| 4c50bfe8991c20a1fe19a686 | Club Campismo de Lisboa - CCL | Costa da caparica | 38.65359 | -9.24348 | campground |
| 4c56fcbbd12a20a178a965bd | Quinta da cerejeira | Ferreira do Zêzere | 39.70046 | -8.27804 | campground |
| 4dc8f31ea3a440abf28bc371 | Para Recordar - Parque de Campismo | Oliveira do Hospital | 40.31633 | -7.88534 | campground |
| 4e3aac9caeb7ec67028efe5b | Parque Campismo Sao Giao | Oliveira do Hospital | 40.34657 | -7.80777 | campground |
| 4e693330d22d3edcde01484c | PNEC |  | 38.65029 | -9.23991 | campground |
| 4f3635d3e4b0ea2d7c8e0aea | CED - Centro Escutista do Divor |  | 38.69254 | -7.93016 | campground |
| 4f761abde4b0294fd2e182bd | Sede 1093 - Chainça |  | 39.48320 | -8.20232 | campground |
| 501e70a7e4b02726421ac1f7 | Moreiras Pequenas |  | 39.58821 | -8.50703 | campground |
| 517faecde4b0b70c495cfa36 | Quinta dos Mouras |  | 38.56320 | -7.88718 | campground |
| 519bd5ec498e83c347493374 | Sede Escuteiros 1134 Sintra |  | 38.80325 | -9.38575 | campground |
| 51fe8525498e0c5e748e8180 | Parque de Campismo de Evora |  | 38.56354 | -7.92063 | campground |
| 5413b9ec498e9e1a5e137530 | aconchego |  | 41.26054 | -8.29229 | campground |
| 59862ed14aa3f81158dd2e90 | Alqueva Rural Camping Resort | Pedrogao | 38.11540 | -7.63611 | campground |
| 5a63ec61345b422e9a759e7b | Turiscampo-sociedade Empreendimentos Turísticos Parques do Algarve | Lagos | 37.10821 | -8.67118 | campground |
| 5f1b152da6c5556fd3970333 | Costasitur - Parque Autocaravanas | Vagos | 40.54929 | -8.77241 | campground |
| 6899eb94b2fdb97cdc5628a3 | Ponte Secret Garden | Santa Ovaia | 40.30709 | -7.87180 | campground |
| 7df74888d1084acabf47f0c6 | O Ribeiro dos Amieiros - Parque de Campismo | Serra | 39.59996 | -8.30048 | campground |
| e92f7c71cd8344cf1aa8b48f | Ricarlina - Unipessoal | Coimbrã | 40.21028 | -8.43016 | campground |
| fdf6bf4b937c411ca829511e | Parque de Campismo da Calheta | Calheta | 38.61336 | -27.97292 | campground |

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

### River — 282 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4cdfe68adb125481efb439ce | Praia Fluvial Alamal | Gavião | 39.48816 | -7.96753 | river |
| 4f257487e4b050258c3ea78c | Muxagata | Fornos de Algodres | 40.63089 | -7.39015 | river |
| 4f37b3a9e4b08f0099bd6f6e | Moinho Do Perigo |  | 41.83045 | -7.01075 | river |
| 4fc1fcece4b05b8503515da2 | Praia Natural do Pego |  | 40.87897 | -7.92635 | river |
| 4ffda0a2e4b03bbc7f8ed69f | Parque Lazer Rio Santa Clara |  | 40.66476 | -7.65125 | river |
| 50043e84e4b0bc5170951beb | Praia Fluvial Fraga |  | 41.16572 | -8.02390 | river |
| 5012be90e4b01be621b9490d | Sound Garden |  | 41.60143 | -8.41085 | river |
| 50251a88e4b06e6f05015be6 | Barbosa - Soalheira (Rio Paiva) |  | 40.88809 | -7.92692 | river |
| 5027c688e4b081bd6db2843e | Cais do  Rio Águeda |  | 41.02704 | -6.93059 | river |
| 50fbcd63e4b0e6d785486cce | Canal Central | Aveiro | 40.64094 | -8.65697 | river |
| 511fa070e4b0781dd665e5c9 | rio tamega |  | 41.20906 | -8.16579 | river |
| 517d5e2ae4b0514e89d16ba9 | Pista Remo Montemor-o-Velho | Montemor-o-Velho | 40.18182 | -8.62865 | river |
| 5214d8f811d21af72b9fd4a2 | Colaço |  | 40.28395 | -7.96863 | river |
| 52250ea211d2bcafc9ec26f2 | Ribeira Da Freixeira |  | 38.19971 | -8.51273 | river |
| 52c533a9498e945ca2fabb36 | Praia Fluvial de Segirei |  | 41.86576 | -7.19510 | river |
| 5353cf1b11d2ec246c2415b5 | Azenha da Portela |  | 41.30675 | -8.59302 | river |
| 5671b14238faeb2f6eb3f56b | ribeira de santa luzia | Funchal | 32.65040 | -16.90812 | river |
| 621926d8de8556236ffc99b0 | Rio Douro | Lamego | 41.11754 | -7.77785 | river |
| 640b374a446db40ec222619e | Rio Marão | Candemil | 41.24960 | -7.98662 | river |
| 661d832c4224ff14496789c3 | Tagus River | Lisboa | 38.70621 | -9.13144 | river |

### Concert Hall — 274 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4bce246b68f976b042856583 | Pavilhão Sebastianas | Freamunde | 41.28113 | -8.33232 | music_venue |
| 4e0e355145ddc2c6d175a031 | Auditorio Venepor | Maia | 41.23380 | -8.62493 | music_venue |
| 4e0e517ad4c0f6d6b3f92732 | Rock Spot | Bajouca | 39.89325 | -8.77999 | music_venue |
| 4ee3699bbe7b4845a341223b | Casa da Cultura Rio Maior - Cineteatro | Rio Maior | 39.33711 | -8.93647 | music_venue |
| 4f3f0dd6e4b045d4ebe08cfd | Tenda Carnaval Alcobaça |  | 39.54795 | -8.98059 | music_venue |
| 4f6613e6e4b08383b315b3d1 | Sociedade Musical e Desportiva de Caneças | Caneças | 38.81023 | -9.22602 | music_venue |
| 4fa6df60e4b028d55b190a97 | Sala 2 |  | 41.15866 | -8.63107 | music_venue |
| 500dca5990e7b5e8c95cb1d3 | Sobral Hotspot | Sobral de Monte Agraço | 39.01887 | -9.15225 | music_venue |
| 503d20d8e4b0ee9c6d0a8b03 | Oi |  | 40.02460 | -8.19446 | music_venue |
| 50d630fae4b021b28658fe3d | Sociedade Artística Tramagalense | Tramagal | 39.44951 | -8.24702 | music_venue |
| 50ebfc50e4b00d661c3111ed | radio foia 97.1 Fm | Monchique | 37.31860 | -8.55585 | music_venue |
| 514dc939e4b0f2f18b9498ff | bocazaparte studios |  | 41.33014 | -8.56584 | music_venue |
| 5241f52a11d2a72f2dd4677e | Anacrusa |  | 38.57414 | -9.03898 | music_venue |
| 52ab76a6498ee26b96f9c244 | Filarmónica Euterpe de Castelo Branco | Castelo Branco | 38.52544 | -28.72728 | music_venue |
| 535a75612d66474600a13d2e | Banda União Musical Paramense | Espinho | 41.00645 | -8.64430 | music_venue |
| 54027936498ed2702baf195b | Festas de S. Gens e Nossa Senhora do Rosário |  | 41.13309 | -8.24226 | music_venue |
| 55fe6dfd498ef74c26c37474 | AJEM |  | 38.74797 | -9.23659 | music_venue |
| 5c5ff74e58002c002c141569 | Casa Da Música | Gafanha da Nazaré | 40.62685 | -8.71944 | music_venue |
| 631109b10d8eb431d5da7ad5 | KALORAMA | Lisboa | 38.74817 | -9.12442 | music_venue |
| 69cdda40bd1e45ea0871bb65 | Montecore Fest | Montemor-o-Novo | 38.65011 | -8.21684 | music_venue |

### Museum — 244 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4c6fec86d7fab1f7d2b65cc9 | CISE Seia | Seia | 40.41904 | -7.71118 | museum |
| 4d7b812d79c4b1f780dfe8f2 | Museu do Vidro | Marinha Grande | 39.75076 | -8.93226 | museum, art_gallery |
| 4f0f2ccae4b040d4838a9029 | Centro de Interpretação da Gruta do Escoural | Santiago do Escoural | 38.54243 | -8.16842 | museum |
| 4f0f2cd6e4b0dd8932204130 | Museu da Água – Convento de São Francisco | Mértola | 37.63903 | -7.66229 | museum |
| 4f0f2cf9e4b08ead5f9c92f7 | Museu Municipal de Aljustrel \| Núcleo Rural de Ervidel | Ervidel | 37.96598 | -8.02569 | museum |
| 4f0f2d03e4b040d4838acda5 | Museu Municipal Severo Portela | Almodôvar | 37.51473 | -8.05820 | museum |
| 4f8d99c4e4b0003b52c68867 | Museu Etnográfico da Messejana | Aljustrel | 37.83416 | -8.24467 | museum |
| 523dc02711d20523cba6bd9b | Museu da Máquina de Escrever |  | 39.41423 | -8.48534 | museum |
| 573b470d498e642240237c14 | Museu Alfredo Bensaúde |  | 38.73560 | -9.13865 | museum |
| 5b8d19e9419a9e002cd74cb4 | Esthers Grote Kasteel |  | 38.71445 | -9.13226 | museum |
| 5ef75444d1870d0008753c78 | Jardim Palácio Mateus | Vila Real | 41.29657 | -7.71201 | museum |
| 5f42b5feee2b6c33ae00c6a5 | Museo Das Conchas | Setúbal | 38.54685 | -9.01073 | museum |
| 61420c1d375a4075361e9cbc | Casa de Lavoura e Oficina do Linho – museu etnográfico | Várzea Calde | 40.76521 | -7.87468 | museum |
| 64a6d474f533985921f11572 | Museu Municipal Do Montijo | Montijo | 38.70666 | -8.97609 | museum |
| 664cb9e457c2953150cca845 | Casa Museu Pintor Jose Cercas | Aljezur | 37.31527 | -8.80312 | museum |
| 67dfff5ea5b3ee098c5ae226 | Casa Museu De Santa Beatriz Da Silva | Campo Maior | 39.01126 | -7.07073 | museum |
| 68261b9bb6632e05544e5527 | Casa Ásia - Coleção Francisco Capelo | Lisboa | 38.71356 | -9.14378 | museum |
| 6a74fd53c5fb9f02d8cc7df4 | Islamic Museum | Tavira | 37.12590 | -7.65023 | museum |
| 6a75a961c5fb9f02d8e55ac2 | House of the Prince | Porto | 41.14077 | -8.61432 | museum |
| cac953b8c6a14e74304c3404 | Fundação Casa - Museu Maurício Penha | Sanfins do Douro | 41.29303 | -7.51976 | museum |

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

### Bridge — 213 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4d731fd827ddb60cb7a8d81b | Ponte Alcacer Do Sal | Alcácer do Sal | 38.36179 | -8.49135 | bridge |
| 4e4fd88a2271a1bdc3e3b89b | Eolicas | Figueira da Foz | 40.19652 | -8.85743 | bridge |
| 4f0c75d6e4b020a8d9abaf11 | Ponte Sofá |  | 39.73452 | -8.79288 | bridge |
| 4fa691a5e4b0fed482a34bf2 | Nandufe |  | 40.54047 | -8.07766 | bridge |
| 503618dbe4b05ec15f4c9df2 | Ponte da Amizade |  | 41.95093 | -8.74297 | bridge |
| 5041454de4b00fd08e8f17af | Ponte Sobre Linhas do Comboio | Entroncamento | 39.46205 | -8.47329 | bridge |
| 50d6df6be4b0f43844f2e6b0 | Ponte Romana |  | 37.94527 | -8.40221 | bridge |
| 5246b496498e711630898865 | Ponte De Sandomil |  | 40.37317 | -7.79904 | bridge |
| 52713ec6498e5f8e7ba8fd9f | Ponte Internacional Arbo - Melgaço |  | 42.10783 | -8.35346 | bridge |
| 533ae8e4498e041c8dbf1fa2 | A24 viaduto vila pouca aguiar | Vila Pouca de Aguiar | 41.48724 | -7.64952 | bridge |
| 591a07b6e1f0aa603afbd1fc | Ponte Ferroviária de Abrantes | Abrantes | 39.45410 | -8.18740 | bridge |
| 5d6671f557ba490008b42cc0 | Ponte Dos 7 Arcos | Nordeste | 37.83186 | -25.14495 | bridge |
| 5de1849caf03f30008ab0c36 | Ponte da Linha Vermelha | Lisboa | 38.74107 | -9.12157 | bridge |
| 5fbce1c31c139a74d0dd3959 | Ponte Ferroviária de Tavira | Tavira | 37.12940 | -7.65351 | bridge |
| 6356c03d8b71752e44737a88 | Ponte International | Arronches | 39.18089 | -7.16986 | bridge |
| 648b24853ae9c77e503731fa | Ponte De Arame | União das freguesias de Pensalvos e Parada de Monteiros | 41.57937 | -7.72228 | bridge |
| 66400820b40d0442838f7e59 | Ponte Nova Do Arade | Portimão | 37.15180 | -8.51144 | bridge |
| 666c6ef0d48dc068012aad9a | Ponte A17 - Samuel | Samuel | 40.09682 | -8.75440 | bridge |
| 671820d0c95acb7cbf3291b9 | Ponte Culatra | Faro | 36.99333 | -7.83553 | bridge |
| 69c906a91ebb7e0e4f68a261 | Ponte D' Arame | Arnóia | 41.34718 | -7.98854 | bridge |

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

### Surf Spot — 160 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4be090e54c55b6513a76eab7 | Surfcastle | Baleal | 39.37282 | -9.33585 | surf_spot |
| 4c8e21fd1992a1cddae3dafb | Praia do Medão (Supertubos) | Peniche | 39.34628 | -9.36330 | surf_spot |
| 4df36a51d1649c8a28e2d2a1 | Surfivor Surf Camp | Esmoriz | 40.96128 | -8.65184 | surf_spot |
| 4e350dc46284ea7e10fc6bde | Praia da Barrinha | Ovar | 40.95992 | -8.65036 | surf_spot |
| 4e4aafc6fa76a0c058d35797 | Praia Fluvial Soltróia |  | 38.46079 | -8.85819 | surf_spot |
| 4e58ce63d4c0ba8c119477ac | Praia Da Aguçadora |  | 41.41971 | -8.78276 | surf_spot |
| 4eb31f04722ef062599e6fd8 | Pousada Surfspirit | Peniche | 39.37448 | -9.34100 | surf_spot |
| 4fd8c234e4b04e404e2c37b3 | Windsurf www.Elisiario.com | Costa de Caparica | 38.65714 | -9.25098 | surf_spot |
| 5019567ae4b0d570769fa325 | Praia do Canal |  | 37.24557 | -8.79947 | surf_spot |
| 501d2ac2e4b0f5050be15c1b | Cantinho Dos Ingleses |  | 41.15240 | -8.67871 | surf_spot |
| 51267bc5582fad3934dd6998 | Lisbon Surf House | Caxias | 38.69884 | -9.27025 | surf_spot |
| 53a7efe5498e114951bc614e | Afife Boardriders Club - Escola de Surf (Surf School) |  | 41.78098 | -8.87011 | surf_spot |
| 53ef3edb498ec8bf75d3b008 | Coastline Algarve | Sagres | 37.01317 | -8.94201 | surf_spot |
| 55b368a8498e57943ba51a11 | Amado Beaxh |  | 37.08439 | -8.70001 | surf_spot |
| 57b20f25498e3b59e33fb68e | crazy left |  | 38.99333 | -9.42516 | surf_spot |
| 59a093d775cb8c77a8f04eb6 | West Soul Surf Camp | Torres Vedras | 39.16499 | -9.32993 | surf_spot |
| 59f45a7210345b4eb4985fa3 | AlkaSurfboards | Vila Nova de Gaia | 41.12297 | -8.66408 | surf_spot |
| 5bb608be646e380039060260 | Spot Surf School | Espinho | 41.00597 | -8.64497 | surf_spot |
| 6a59f8445bea561dc911fed8 | Stru Surf School | Vila Nova de Gaia | 41.13506 | -8.66920 | surf_spot |
| fd8171678e4342f61ff4aae9 | Lisbon Surf Camp & School | Carcavelos | 38.68167 | -9.34082 | surf_spot |

### History Museum — 140 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 3c284ae7763440d918b827dd | Cihafa- Centro de interpretação | Fornos de Algodres | 40.61670 | -7.53330 | museum |
| 4b0588a2f964a52015d122e3 | Museu Militar | Lisbon | 38.71278 | -9.12451 | historical_landmark, museum |
| 4c5c15a794fd0f47f08ec745 | Casa Museu de Arqueologia | Mogadouro | 41.34088 | -6.71563 | museum |
| 4e255780e4cda4c1ef3d13be | Casa dos Condes | Alcoutim | 37.47120 | -7.47114 | museum |
| 4e566c991f6ecd24d0130386 | Fábrica da Baleia | Lajes Do Pico | 38.40342 | -28.25528 | museum |
| 4e5ccab788775cde7b4814f8 | Casa da Cultura de Arouca | Arouca | 40.92818 | -8.24986 | museum |
| 4ea3f385490102dac33cec68 | Museu Pio Xii | Braga | 41.54564 | -8.41991 | museum |
| 4ee879ef02d5895bd74ab874 | Condeixa-a-Velha |  | 40.10757 | -8.49106 | museum |
| 4f0f2ccbe4b0a8783f152dc1 | Centro Interpretativo do Mundo Rural | Vimieiro | 38.83204 | -7.83711 | museum |
| 507ec50ee4b0225db132d955 | Museu Regimento de Sapadores Bombeiros de Lisboa | Lisboa | 38.75526 | -9.19150 | museum |
| 508264d1e4b093287bddcfa0 | Lagar de Azeite (Quinta do Marquês de Pombal) | Oeiras | 38.69343 | -9.31635 | museum |
| 51b48d99498e0d4af2d8870e | Museu Vila Flor | Vila Flor | 41.30721 | -7.15280 | museum |
| 5818bd6e38fa7cf5e45b9aba | Nucleo Museologico da Barroca |  | 38.96068 | -8.13031 | museum |
| 5862620953f5bb1926a6bac6 | Casegas |  | 40.17774 | -7.69929 | museum |
| 59d5367cfebf312ecec13fe8 | Museu Municipal | Soure | 40.05660 | -8.62625 | museum |
| 5c7fc048037be1002ce62011 | Museu Do Nordeste | Nordeste | 37.83256 | -25.14578 | museum |
| 612b83ec844b27193b1849c8 | Casa Do Tempo | Corvo | 39.67252 | -31.11129 | museum |
| 66f2d6251d804b39c5c89c3a | Museu Visigótico Santo Amaro | Beja | 38.01758 | -7.86623 | museum |
| 67fcdef8804678471f617af8 | Vista Alegre Exhibit | Lisboa | 38.70778 | -9.19856 | museum |
| 6a05ed1e2abb6a3222b80bc8 | The Drinking Experience | Vila Nova de Gaia | 41.13541 | -8.61337 | museum |

### Amusement Park — 133 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 3b61d2f16d2b49af3e74d949 | Atlantic Park | Loulé | 37.13908 | -8.02214 | amusement_park |
| 4b76bee9f964a5203c5c2ee3 | Zoomarine Algarve, Portugal | Guia-Albufeira | 37.12696 | -8.31418 | amusement_park |
| 4e382d017d8b5e9544b07c2b | RAF Park | Matosinhos | 41.22013 | -8.66223 | amusement_park |
| 4eda4dea0e011b46ee4304c5 | Il Punto Di Vista | Vila Nova de Gaia | 41.13181 | -8.60660 | amusement_park |
| 4f491943e4b0a69abce601aa | Espaço Educativo Florestal e Ambiental da Quinta da Maúnça |  | 40.55948 | -7.22066 | amusement_park |
| 4f647c32e4b014afeb1dbcb9 | Iberanime |  | 38.70270 | -9.17862 | amusement_park |
| 4f6c5e6ce4b0e3b3bbdc4b70 | Parque Infantil |  | 41.16366 | -8.58353 | amusement_park |
| 4fa50530e4b063f121caab92 | Rioland |  | 38.61275 | -9.10388 | amusement_park |
| 4fddd2e0e4b019d60756cbce | Ludopolis |  | 38.73952 | -9.31285 | amusement_park |
| 4fff5f9ce4b0bd73f9751cc9 | Fun Family Park | Tavira | 37.13370 | -7.63878 | amusement_park |
| 5053e05ce4b0e7ceb646aa97 | CALHA DO GROU | Fazendas De  Almeirim | 39.12010 | -8.60794 | amusement_park |
| 508aba0be4b09f7bb896f64f | Val de Palmela Birds | Palmela | 38.58756 | -8.91755 | amusement_park |
| 50c6cc37e4b00ecf0866cdc7 | Sono Profundo |  | 41.21964 | -8.54142 | amusement_park |
| 523d8abb498e72d5ac412c8c | Red Thunder |  | 37.09391 | -8.07322 | amusement_park |
| 524bf60d498e0678920d148e | portaventura | Tarragona | 40.70632 | -8.63016 | amusement_park |
| 56451ac3498e035a056bb8e4 | Projecto Casa Assombrada | Sintra | 38.77694 | -9.26416 | amusement_park |
| 5999a982123a1921c39c907f | Wild Snake | Loule | 37.09284 | -8.07339 | amusement_park |
| 61a8fb37f54b4d12c7bab919 | Parque do Gato Preto - Parques de Recreio | Seixosas | 37.12665 | -8.40148 | amusement_park |
| 68e2134a46e5a741f315d3f9 | Magic Park | Fundão | 40.15400 | -7.49754 | amusement_park |
| 693d8906fa9f2a028429d0d6 | Candy Fun Park | Baguim do Monte | 41.19927 | -8.54573 | amusement_park |

### Movie Theater — 132 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 3ae928f3ca53480e0b490304 | Grupo de Teatro Joana | Lisboa | 38.71243 | -9.14588 | movie_theater |
| 3e1677859814470e572d5f7b | Ar de Filmes | Lisboa | 38.71686 | -9.15264 | movie_theater |
| 4ce00bbc78ddf04d6d18a498 | Cineplace La Vie Guarda | Guarda | 40.54051 | -7.26628 | movie_theater |
| 4dbaf9d70cb691071c7eaa85 | Club Video | Funchal | 32.65639 | -16.91453 | movie_theater |
| 4e4e4e5181308c328c67aa46 | Douro Film Harvest | Alijó | 41.27588 | -7.47525 | movie_theater |
| 4e52bbf622710da1b3e25b6b | Cinema de São João Da Madeira | São João da Madeira | 40.90883 | -8.49539 | movie_theater |
| 4e5e6508d22d7239c1a1e95d | Foto Braga | Figueira da Foz | 40.14857 | -8.85298 | movie_theater |
| 4f63b979e4b03c27092236fd | Cineteatro Lagoense |  | 37.74530 | -25.57476 | movie_theater |
| 5019878fe4b03c99d0dfa2e4 | Antiga Esplanada Cineteatro |  | 39.24987 | -8.00745 | movie_theater |
| 504bf95be4b05828d1471584 | Home Cinema |  | 40.52898 | -7.27593 | movie_theater |
| 50f5802de4b046fbc8a051dd | Centro Do Cinema | Lisboa | 38.71503 | -9.14599 | movie_theater |
| 51092e22e4b09f3983bbb370 | home cinema: schindler's list |  | 41.23524 | -8.41471 | movie_theater |
| 520a34c411d2a8b4ffde229b | 21 Braga City Walk |  | 41.54543 | -8.42650 | movie_theater |
| 53c981de498e889ccf213a43 | Cine teatro celoricense |  | 41.37819 | -7.99730 | movie_theater |
| 54302788498ea11026e837a5 | cinema  Covelo Home |  | 41.19353 | -8.52682 | movie_theater |
| 56071cce498e66c67cb5543e | 7d shooting center |  | 37.09225 | -8.22789 | movie_theater |
| 5871650f0a3d541770e6dff4 | Cineteatro dos Bombeiros de Vila Praia D'Âncora |  | 41.81552 | -8.86537 | movie_theater |
| 5c1fd18e419a9e002caaeb78 | IMAX | Lisbon | 38.75550 | -9.18712 | movie_theater |
| 8a26349ec83744b5ef1a400b | Visão de Lisboa - Equipamentos Profissionais Cinematográficos | Frielas | 38.81341 | -9.14736 | movie_theater |
| 9814d84956694cfe136390cc | Stamina | Lisboa | 38.74362 | -9.14341 | movie_theater |

### Theater — 131 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 3b6e6f397c6c451e11ff599a | Teatro em Movimento | Bragança | 41.81733 | -6.76384 | theatre |
| 3cf29d0f35034dd6503f2739 | Teatro Regional da Serra do Montemuro | Gosende | 40.89671 | -7.93537 | theatre |
| 4c1e3803eac020a1bd5049c2 | Auditório Municipal Ruy de Carvalho | Oeiras | 38.72665 | -9.24166 | theatre |
| 4d1edcf9b69c6dcbe9966295 | Teatro Clube de Alpedrinha | Alpedrinha | 40.10141 | -7.46799 | theatre |
| 4e878bbaf5b966be3ecc4a37 | Noites de Poesia de Vermoim | Maia | 41.23621 | -8.61517 | theatre |
| 4e905b936da174e28e39b4e2 | Contacto - Companhia de Teatro Água Corrente de Ovar | Ovar | 40.86886 | -8.62252 | theatre |
| 4ea085b4f790341b1677c812 | Oficina de teatro | Aveiro | 40.63435 | -8.65304 | theatre |
| 4ed7c53bbe7b3567170fd42c | SDUB "Os Franceses" | Barreiro | 38.66425 | -9.07632 | theatre |
| 4f5a4c2ae4b0e4b75eed5caa | Teatrão- OMT | Coimbra | 40.19346 | -8.41194 | theatre |
| 4fb40bf0e4b06fedad828b2e | ADCR MOLELOS |  | 40.52671 | -8.09259 | theatre |
| 5076d407e4b0916c0b108e62 | circo CONTEMPORANEO DE LISBOA  headquarters |  | 38.73483 | -9.13982 | theatre |
| 50c263fbe4b0ebaba04c4a5c | Salão Nobre dos Bombeiros Voluntários de Moreira da Maia |  | 41.24741 | -8.66309 | theatre |
| 5171949c498e61d2a23607c3 | TinBra |  | 41.54609 | -8.41569 | theatre |
| 5527c4e0c1de4aaac24fa189 | Cine Aves | Santo Tirso | 41.36126 | -8.40498 | theatre |
| 55e2d07c498e3be4f9722917 | Área de Serviço - Associação de Criação Artística | Cartaxo | 39.16682 | -8.78851 | theatre |
| 595e8b5c5455b20451b65cd7 | El Penultimo Tango | Lisboa | 38.72083 | -9.14510 | theatre |
| 5f5d3487af65ef27d803aecc | Teatro | Albufeira | 37.09107 | -8.20270 | theatre |
| 6a1b20cd0151581062249af1 | Sala Estúdio Valentim De Barros | Lisboa | 38.72482 | -9.14108 | theatre |
| e5d1a04261574b03b858cea4 | Cine Cidade Nova | Fundão | 40.13696 | -7.49945 | theatre |
| eceb35e09bdc4091093267fb | Teatro dos Estudantes da Universidade de Coimbra | Coimbrã | 40.21043 | -8.42286 | theatre |

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

### Castle — 82 would insert, sample of 20

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
| 59bab03a123a196ea4831d91 | Albufreira | Albufeira | 37.09755 | -8.24596 | historical_landmark |
| 5efdfa79fca34c0008f50a64 | Castelo De Outeiro | Outeiro | 41.68307 | -6.59191 | historical_landmark |
| 5f2aaed24ca3dc5ba0d3e4e1 | Forte De Santa Cruz | Horta | 38.53143 | -28.62593 | historical_landmark |
| 61ec3e48dcebbf78e21cbf72 | Castelo Do Disney | Alcabideche | 38.76487 | -9.44392 | historical_landmark |
| 643e6c5480050d7687d80fc0 | Forte De São Luís Gonzaga | Setúbal | 38.52850 | -8.90607 | historical_landmark |
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

### Lighthouse — 68 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4e079fbbaeb74c399111b65b | Farol Ribeirinha | Horta | 38.56804 | -28.78065 | lighthouse |
| 4e2b5e2bae605c533a37a7bc | Nature | Amares | 41.63980 | -8.41572 | lighthouse |
| 4e88732829c2057e36147340 | Forte de São Lourenço do Bugio | Oeiras | 38.66025 | -9.29903 | historical_landmark, lighthouse |
| 4f28469fa17cd806fc60c99a | Farol Molho Norte | Figueira Da Foz | 40.14696 | -8.87101 | lighthouse |
| 4f5ce471e4b02628c2615dad | Molho S. Jacinto | Figueira Da Foz | 40.14452 | -8.85510 | lighthouse |
| 502671d6e4b0fe42319d7d5a | Farol Do Porto Da Horta |  | 38.53399 | -28.62135 | lighthouse |
| 503a73eae4b096b491d68155 | Farol da Assenta | Assenta | 39.05826 | -9.38076 | lighthouse |
| 51332892e4b0dc20134cc3fa | Meia Laranja |  | 40.64385 | -8.74802 | lighthouse |
| 51c085ff498e29e84c9b64aa | Farol Ponta da Ferraria | Ginetes | 37.85341 | -25.85020 | lighthouse |
| 520a6c5c11d2810177ae6616 | Farol Da Ponta Da Barca |  | 39.09241 | -28.02828 | lighthouse |
| 52c72f52498e1e47b2606755 | Alto da Montanha |  | 38.72460 | -9.22720 | lighthouse |
| 54221116498e5753bdb2a5c9 | Farol do Outão | Setúbal | 38.48857 | -8.93453 | lighthouse |
| 543026f9498ecc238f90a9a2 | Farol da Ponta da Piedade | Lagos | 37.08095 | -8.66938 | lighthouse |
| 560f0cdc498e27302df119d4 | auditorio dos bombeiros |  | 40.10815 | -8.50120 | lighthouse |
| 5f6b68aaa6207b36666af747 | Farol de Lagos Molhe Este |  | 37.09936 | -8.66566 | lighthouse |
| 642ff238d3333c4895232d7e | Farol Do Aguilhão | Vila do Conde | 41.36160 | -8.76034 | lighthouse |
| 64c4fc4550b6967cc1d6b939 | Farol Verde | Ferragudo | 37.10848 | -8.52654 | lighthouse |
| 66e71e35fa4d9220c8a7da06 | farol de quarteria | Quarteira | 37.06519 | -8.11044 | lighthouse |
| 687a3aa578246123750e403d | Farol, Mohle Exterior Head | Viana do Castelo | 41.67412 | -8.84430 | lighthouse |
| 69d7ca16b802151da1c2d7b7 | Farolim Da Praia Da Rocha | Portimão | 37.10860 | -8.52950 | lighthouse |

### Hot Spring — 68 would insert, sample of 20

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
| 4df24345b0fb807158bd7aaa | Nascente da Água do "Torno" | Furnas | 37.77057 | -25.30539 | hot_spring |
| 4df245a0ae609e69dd94e009 | Nascentes da Água das "Quenturas" | Furnas | 37.77281 | -25.30432 | hot_spring |
| 4dfbc015a809a848e969c82b | Termas Do Eirogo | Barcelos | 41.56609 | -8.59157 | hot_spring |
| 4e3015ced4c058fdbefa01e8 | Mata Nacional dos Medos | Almada | 38.61195 | -9.18792 | hot_spring |
| 4e619d6a1838ad3d0e7088c8 | Lava Pés | Furnas | 37.77031 | -25.30426 | hot_spring |
| 4ee278ca5c5cfd2133db2e9b | Jantar Do Bigode |  | 41.15065 | -8.61166 | hot_spring |
| 4ef37703f9ab42ef2e50a991 | Água Santa | Furnas | 37.77183 | -25.31481 | hot_spring |
| 4f3f9d4ae4b06010fbdf0086 | Fonte di Arunca |  | 39.83003 | -8.57695 | hot_spring |
| 4f8d7af5e4b009dda3ef8f5f | Carvalhelhos |  | 41.69636 | -7.72894 | hot_spring |
| 4ff3316ae4b04619c5ac41bf | Fonte da Pereira | Queimadela | 41.49566 | -8.13863 | hot_spring |
| 50200e70e4b0a885ae7b6243 | Fonte De Sao Pedro | Penamacor | 40.08638 | -7.23656 | hot_spring |
| 50de757be4b0bc86a025116d | Tanque da Vila | Pavia | 38.89695 | -8.03407 | hot_spring |
| 51575f46e4b04e4ae9b40263 | Água Santa |  | 37.23215 | -7.44353 | hot_spring |
| 5308cb49498e4d1e0a2f131e | Monte da pedra |  | 39.37188 | -7.75322 | hot_spring |
| 561d876f498e264bf11a9b0c | Fonte Nova |  | 39.62160 | -8.65876 | hot_spring |
| 57388191498e2f6dc6e3ff69 | Termas De Caldas De Moledo |  | 41.15468 | -7.83672 | hot_spring |
| 57651ae3498e551aa9a901f2 | Morenos | Porto Santo | 33.03934 | -16.38633 | hot_spring |
| 66fd2c8dfa5fa8514e2a1970 | Zona Balnear Da Foz Das Coelhas | Nordeste | 37.85496 | -25.29613 | hot_spring |
| 684adbc27de5595fa968cce0 | Caldeira Grande | Furnas | 37.77271 | -25.30421 | hot_spring |
| ea1535c2ec7a44ade807eaa3 | Centro Termal das Caldas Felgueira | Canas de Senhorim | 40.48592 | -7.86934 | hot_spring |

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
| 4bfe6e16f7c82d7fec898f04 | Amadeo Souza Cardoso | Amarante | 41.26880 | -8.07814 | museum |
| 4dcefd1552b1f8915ba57e9d | Tesouro - Museu da Catedral de Viseu | Viseu | 40.65975 | -7.91147 | museum |
| 4e35362d8877beb5e9a91bc0 | Museum Monte Palace | Funchal | 32.67583 | -16.90100 | museum |
| 4e735e5dfa76812398d05af1 | Museu de Arte Sacra de Moura | Moura | 38.14191 | -7.44938 | museum |
| 4e9feb3c0aaf0953316be18c | Casa Major Pessoa - Museu Arte Nova de Aveiro | Aveiro | 40.64178 | -8.65541 | museum |
| 4f9bdd1de4b0edc560f2b0e9 | Chocalhos Pardalinho | Alcacovas | 38.39285 | -8.15046 | museum |
| 509e4d38e4b04c46e90b831a | Museu de Arte Sacra | Porto | 41.40240 | -8.51075 | museum |
| 52511d4911d2cc0d59fec7f7 | Fundação Medeiros e Almeida | Lisboa | 38.72165 | -9.14918 | museum |
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

### Monastery — 11 would insert, sample of 11

| fsq_place_id | name | locality | lat | lng | our type(s) |
|---|---|---|---:|---:|---|
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

### matched — 4,921, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 0f285fe5c9174f809e456b4c | Sociedade Musical Pevidém | Guimarães | Music Venue | curated:fsq:0f285fe5c9174f809e456b4c "Sociedade Musical Pevidém" (music_venue) at 0 m, sim 1.00 |
| 4b0588a2f964a52020d122e3 | Museu e Igreja de São Roque | Lisbon | Church, Museum | overture:4a1e03dc-f818-4b39-916d-b169172298bb "Museu de São Roque" (museum) at 32 m, sim 0.80 |
| 4b0588a3f964a5206ed122e3 | Museu Condes de Castro Guimarães | Cascais | Museum | overture:7ede67d6-f04d-4a55-ae41-bde171f3daf1 "Museu Condes de Castro Guimarães" (museum) at 36 m, sim 1.00 |
| 4c4dbf091b8e1b8d28971f26 | Casa Da Montanha |  | Hiking Trail | overture:0a09b67e-f091-44d8-909a-aa108357942b "Casa da Montanha" (hiking_area) at 1 m, sim 1.00 |
| 4cb33309b4b0a35dd0195fce | Ponte Vermelha |  | Bridge | overture:75cfe2d0-8412-4ef7-aafe-591b73de67af "Ponte Vermelha" (bridge) at 51 m, sim 1.00 |
| 4cef08058604a1cdb1f0fac0 | Knock Out | Vale Figueira | Music Venue, Rock Club | overture:8024cb96-9d1b-40d8-9fe7-b52becc18b34 "Knock Out Bar" (bar) at 7 m, sim 0.90 |
| 4d4d5961a7f86ea8669235de | Estádio Armindo Carolino (Flandes) |  | Soccer Stadium | overture:66c89d9e-ae09-49ae-bfdb-543876c046f5 "Estádio Armindo Carolino" (stadium) at 0 m, sim 0.90 |
| 4da30fc4c6e96ea81e28e15d | Galeria Vantag | Porto | Art Gallery | overture:e9ae98d3-f434-41fe-bbb1-504ada06d421 "Vantag: a Loja" (art_gallery) at 2 m, sim 0.72 |
| 4dc007aca86e2f4250b7738a | Juromenha - Mirador | Juromenha | Lake | overture:9d15df71-1733-47da-9a3c-aadf456d11a3 "Juromenha - Mirador" (lake) at 0 m, sim 1.00 |
| 4e53c1d76284ca6a2f747a23 | OASIS - Parque Aquático de Galveias | Portalegre | Water Park | overture:8ffb7e24-44e9-48c3-998a-e2eca7c357f5 "Oásis Parque Aquático - Galveias" (water_park) at 32 m, sim 0.90 |
| 4e6a73eb227162c38e70d5bb | Largo da Igreja | Vila Real de Santo António | Historic and Protected Site | overture:72479928-2641-48be-a716-c16572e15ec7 "Largo da Igreja" (historical_landmark) at 0 m, sim 1.00 |
| 4ef1c8cd46901f707ed0bfd8 | Lagoa do Canário | Sete Cidades | Lake | overture:e7af626c-e4ca-489c-a8f3-a3751ebe526e "Lagoa do Canário" (lake) at 21 m, sim 1.00 |
| 5034c313e4b047ee92489d8e | Igreja de Nossa Senhora do Mar | Cabanas de Tavira | Church | overture:edda49e7-b7a9-4e92-aa10-3ffcbb6602ce "Igreja Nossa Senhora do Mar" (church) at 24 m, sim 0.90 |
| 50642062f31c6df5982d2b41 | Museu de Etnomúsica da Bairrada | Troviscal | History Museum, Museum | overture:0bd9f9fa-680e-4a04-8083-9556cea7e14f "Museu de Etnomusica da Bairrada" (museum) at 8 m, sim 1.00 |
| 516e6ebce4b0e7ecec667f72 | Praia da Almagreira | Baleal | Surf Spot | overture:89337359-6dfa-494c-a770-8898c245ed47 "Praia da Almagreira" (surf_spot) at 4 m, sim 1.00 |
| 543515f4498e511cba972738 | Maximiliano Kolbe |  | Church | overture:54f75e35-9016-4aac-a4ac-c86a4116d144 "Igreja de São Maximiliano Kolbe" (church) at 8 m, sim 0.90 |
| 5a4e25fc4b78c52e9f2ec1a2 | Igreja Matriz De Nordeste | Nordeste | Church | overture:cffe15f3-8260-4ade-9709-38dce34d10f4 "Igreja Matriz de Nordeste" (church) at 3 m, sim 1.00 |
| 5b2e3f0cf2554e0039409de3 | Faculdade de Ciências (Antiga Academia Politécnica) | Porto | Monument | overture:b5f0429e-f49c-4fce-b7cd-d91c0b8f685a "Faculdade de Ciências (Antiga Academia Politécnica)" (historical_landmark) at 0 m, sim 1.00 |
| 5f79a981624cd668fa551acf | Igreja De São Martinho Da Gândara | São Martinho da Gândara | Church | overture:f0435d72-3eda-4a1b-9bf1-734a51b7c890 "Paroquia de S. Martinho da Gândara" (church) at 17 m, sim 0.82 |
| 9cc7739221f54aa2cb11390c | Cineclube de Lisboa ABC | Lisboa | Theater | overture:b31e00c8-16a5-407e-9959-797ce6493c59 "ABC Cine-Clube de Lisboa" (movie_theater) at 5 m, sim 0.81 |

### matched (translated) — 60, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 07ef0d96941647670c086753 | Igreja Baptista | Elvas | Church | overture:4822f1cb-6841-4029-991e-47cd5b75a4b2 "Igreja Evangélica Baptista de Elvas" (church) at 9 m |
| 2bc1f5e596114b971ca78d5b | Museu Municipal Leonel Trindade | Torres Vedras | History Museum | overture:efccdd5d-69ad-4213-8a66-4f9d5df32876 "Leonel Trindade Municipal Museum" (museum) at 14 m |
| 4b7a8c17f964a520a5302fe3 | Mosteiro dos Jerónimos | Lisboa | Monastery, Monument | overture:ee495395-584e-4a19-8cc7-0274a668ea40 "Jerónimos Monastery" (church) at 12 m |
| 4c71059ed97fa14395bdf7ca | Praia da Amoreira | Aljezur | Beach, Surf Spot | overture:e86a6488-1be9-478b-8f3d-0ac0899c853e "Amoreira Beach, Aljezur, Algarve" (beach) at 12 m |
| 4e133aece4cdef074b830576 | Casa de Francisco e Jacinta | Ourém | Historic and Protected Site | overture:e1b8c4d2-4cd8-413b-a05f-f6fc07a619ec "Casa Jacinta E Francisco Marto" (church) at 17 m |
| 4e9abf589adf277db7cb5650 | Ponte da Régua | Peso da Régua | Bridge | overture:e725f8e7-d14a-4c59-b028-d201dcdebae3 "Ponte Rodoviaria da Regua" (bridge) at 13 m |
| 4f6f5483e4b08d8da78cd054 | Forte de Nossa Senhora de Porto Salvo (Giribita) | Oeiras | Historic and Protected Site | overture:6ed22c60-c77d-4266-ace5-ccbea37403ff "Forte da Giribita" (historical_landmark) at 5 m |
| 51475ae2e4b0853bfff86a94 | Igreja de São Miguel | Lisboa | Church, Historic and Protected Site | overture:cb7fbac6-6b85-47a4-b9f8-741021ffdb73 "Church São Miguel" (church) at 6 m |
| 51bc8bf1498e9198b5cc3544 | Centro Cultural Naraze | Nazaré | Art Gallery | overture:350818a5-a5ad-4a4c-ac17-6fce1cec087d "Cultural Center of Nazaré" (cultural_center) at 12 m |
| 53556cf1498eaca19c5c13c2 | Mosteiro longos vales |  | Historic and Protected Site | overture:79408aef-7c06-4de1-a9a0-97d7e4ca87bf "Longos Vales Monastery" (church) at 12 m |
| 569186a8498e1cf94b60c933 | igreja maceda |  | Church | overture:ead3edab-18af-46ac-a843-1f36afc8795a "Igreja Paroquial de Sao Pedro de Maceda" (church) at 9 m |
| 585f96aa03e29a1f507b290d | A Igreja de Jesus Cristo dos Santos dos Ultimos Dias | Linda-A-Velha | Church | overture:dd87b220-2303-49da-8057-6cec89595f81 "The Church of Jesus Christ of Latter-day Saints" (church) at 16 m |
| 58f643ed3731ee6491dbd42d | Museu da Saúde | Lisbon | History Museum | overture:61a83104-ccbc-4ad9-ba3f-e9d241caba59 "Saúde Museum" (museum) at 12 m |
| 5d46a55c95cf6f0008d0db14 | A Igreja De Jesus Cristo Dos Santos Dos Últimos Dias | Cacém | Church | overture:fd30076e-1ecd-4949-aee4-161ce421c5fa "The Church of Jesus Christ of Latter-day Saints" (church) at 8 m |
| 61c6f819e565fe05c73366e8 | Igreja Canedo | Canedo | Church | overture:50fc8929-1273-4fdd-a24b-b169a41f80b1 "Igreja Paroquial de São Pedro de Canedo" (church) at 18 m |
| 65302caef80806527b7bd8df | Palacio Belmarco | Faro | Monument | overture:9e442209-1f16-437b-96b3-da586a32214b "Belmarço Palace" (historical_landmark) at 7 m |
| 6a750669c5fb9f02d8cdfae3 | A Igreja de Jesus Cristo dos Santos dos Últimos Dias | Porto | Church | overture:dbd8a93f-caa1-4657-851a-27dc714d7917 "The Church of Jesus Christ of Latter-day Saints" (church) at 0 m |
| 6a758fecc5fb9f02d8e0d4a3 | National Palace of Sintra | Sintra | Museum | overture:8676429f-9e04-4fba-af0e-dc6c5c83939e "Palácio Nacional de Sintra" (historical_landmark) at 8 m |
| 6a759916c5fb9f02d8e257b1 | Museum of Sacred Art | Campo Maior | Museum | overture:581d64f3-6f5e-438d-880a-5051fcd969fa "Museu de Arte Sacra" (museum) at 5 m |
| 6a7a4b773f0a8f28b8d32a41 | Sacred Art Museum of Funchal | São Martinho | Art Museum | overture:e41025da-f746-4491-b422-3dd75367b72a "Museu Arte Sacra Funchal" (museum) at 17 m |

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

### suspect — 977, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4bbc950ee436ef3bd8af5664 | Farol do Penedo da Saudade | São Pedro de Moel | Lighthouse | same name 177 m from overture:8e28eb4d-0276-4ca7-9c8b-d28d860139c6 "Farol Penedo da Saudade" (lighthouse) |
| 4c6ac8360e98a59342e12759 | Estádio 1° de Maio | Braga | Soccer Stadium | same name 120 m from overture:93d1fd66-2335-4379-87e6-0d04aa69cd06 "Estádio 1º de Maio" (stadium) |
| 4d4c797ce1ec6dcb60b5d975 | Banda De Rio Tinto | Rio Tinto | Concert Hall | same name 75 m from overture:9b11b5b8-d8ba-4f8e-8528-985bac39b173 "Rio Tinto" (river) |
| 4e18207988777e96476d4c2d | Anfiteatro Da Boa Água | Sesimbra | Concert Hall | same name 85 m from overture:8f81f2b4-2c57-43ab-9246-3c8a7c786a7f "Anfiteatro da Boa Água" (music_venue) |
| 4e1f47d6e4cd0a38230a7f8c | Centro de Ciência Viva do Algarve | faro | Science Museum | same name 115 m from overture:1dcf4ead-ad12-403c-bb43-5b3c9f307dec "Algarve" (beach) |
| 4e4a964062847afcaf17e05b | Catedral De Portalegre | Portalegre | Church | same name 137 m from overture:65c23a2c-4a39-45c0-8803-38d59b52853d "Catedral de Portalegre" (church) |
| 4f0da012e4b03684a487ba6c | Auditório Municipal - Escola De Música Da Póvoa De Varzim |  | Music Venue | same name 140 m from overture:d39fc34c-0368-4235-a076-233a41eb78fb "Auditório Municipal" (music_venue) |
| 4f5beb5ae4b0c5418b2f579e | Black Guimarães |  | Night Club | same name 280 m from overture:3e0f78a5-98b6-4318-8600-ab9c77ca537f "Guimarães" (store) |
| 500fab27e4b0afaa4abe0fae | Igreja da Senhora-a-Branca | B | Church | same name 174 m from overture:78f634d4-c402-4578-977b-74fab394a0f0 "Igreja Senhora-a-Branca" (church) |
| 508bf2f6e4b0ad933bceed83 | Galeria Geraldes da Silva | Porto | Art Gallery | same name 82 m from overture:1cfb06c4-cc84-4311-b0ef-d54f6d73e1c7 "Galeria Geraldes da Silva" (art_gallery) |
| 50a14901e4b01b688816f941 | Zona Histórica de Torres Vedras | Torres Vedras | Historic and Protected Site | same name 279 m from overture:81959d2c-3119-4276-9698-c94b470ba9db "Torres vedras" (historical_landmark) |
| 5107e6e7e4b039b429adb936 | Alviobeira |  | Church | same name 290 m from overture:a0f654e7-a4eb-412a-85c7-1714a7dc88fc "Museu Rural e Etnográfico de Alviobeira" (museum) |
| 51e56842498e1bf101ca1f54 | Oficina Bartolomeu dos Santos - OBS | Tavira | Art Gallery | same name 126 m from overture:cf6aaf83-22ce-493c-b0c2-61b1ea9276f9 "OBS Oficina Bartolomeu dos Santos" (school) |
| 52a078a0498eb23c42d56b24 | Museu Oceanográfico |  | History Museum | same name 311 m from overture:772c78bb-4b58-4f65-8ac1-7225dc1d9877 "Museu Oceanográfico" (museum) |
| 5485737c498e36f1d88995f5 | Bateiras |  | Bridge | same name 174 m from overture:47c3ad1a-b161-47c6-b2a1-9a61da218860 "Bateiras" (historical_landmark) |
| 554df1dd498e1edf558191ca | Baxio Chaio |  | Historic and Protected Site | same name 268 m from overture:cd1ec39d-61cf-4576-b959-41c8cb522559 "Baxio Chaio" (historical_landmark) |
| 5d31b93ae445300008ac8761 | ESC - Espinho Surfinn Company | Espinho | Surf Spot | same name 366 m from overture:0c4ad847-46f5-4cba-ba07-f666e7de7c9e "ESC Espinhosurfinncompany" (store) |
| 67a7598d0261f34743d31106 | Castro De Chibanes | Palmela | Historic and Protected Site | same name 171 m from overture:01aa866f-3b19-42dd-8e9d-2ac1118a36d8 "Castro de Chibanes" (historical_landmark) |
| c0382c16c6414e1b191c3ab2 | Caparica Surf Academy | Costa de Caparica | Surf Spot | same name 210 m from overture:c9c55ab6-913d-433c-991f-bc6a67d107f1 "Caparica Surf Academy" (surf_spot) |
| c3cdcdc1a9994d44d4876668 | Cine Clube Avanca | Avanca | Theater | same name 352 m from overture:8501b762-af33-4c13-92f1-869963754d8b "Cine Clube de Avanca" (theatre) |

### in-batch duplicate — 96, sample of 20

| fsq_place_id | name | locality | leaves | detail |
|---|---|---|---|---|
| 4e91d0786da174e28ec63adf | Quinta da Graciosa | Anadia | Palace | same place as fsq:4e42b8d7aeb73df7d8d74e84 |
| 51c63d1c498efa7851ee5d29 | +1 club |  | Night Club | same place as fsq:4ef23b22e5e8d8d3dcdfa6aa |
| 5290df59498eb555dc370bd1 | Pecado Bar | Estarreja | Night Club | same place as fsq:4d0d3df5e6e2594138fbd901 |
| 54680d16498eab297765da65 | Sindicato - Área VIP Palco |  | Night Club | same place as fsq:52db64c5498e066d6fad2713 |
| 5578fb21498ed0b30fc700b7 | Kasa da Praia Club - Camarote VIP | Porto | Night Club | same place as fsq:530fae59498e714827382f8c |
| 567f4b88498ec1c98158eeba | Tribus Bar |  | Night Club | same place as fsq:567f4b30498ec1c9815853bc |
| 5719d4de498e80a93922b24b | Alinea A | Santo Tirso, Portugal | Music Venue | same place as fsq:5304e331498ef03546f77e4b |
| 57d56fd2498e4e908f40239e | Foz Surf Camp |  | Surf Spot | same place as fsq:55a0dce4498ee639b2500982 |
| 5b2a78df2632ec003950b419 | Christina Guerra | Lissabon | Art Gallery | same place as fsq:4b0588a4f964a520b6d122e3 |
| 5b8c1eee4c954c002c453da9 | ElementFish Surfcamp | Esposende | Surf Spot | same place as fsq:595827d1018cbb38478a3aa5 |
| 5d361e8432e4c30008cae4af | Ribeira Da Vila Do Carvalho | Covilhã | Bathing Area, Dive Spot, Nature Preserve | same place as fsq:5d361db20034290007eec4bb |
| 61081c426e277211c458eca6 | Igreja Paroquial De Marecos |  | Church | same place as fsq:61081a7cb29040498c1c1d29 |
| 645d35551369973bfb78a420 | Igreja De Santa Maria Da Graça, Sé De Setúbal |  | Church | same place as fsq:645d0d251369973bfb7802da |
| 64623e4ff1ee303261d293f7 | Capela Maria Isabel | Coimbra | Shrine | same place as fsq:6462288fc0630735c76c9472 |
| 64a9b0ef57485560e872601e | Ponte Fives-Lille De Caminha | Caminha | Bridge | same place as fsq:64a9b0bdccad871bb722cecd |
| 673f615842ad3e283e131c2d | Lago do Parque da Paz | Almada | Lake | same place as fsq:673f61578b0b3a1a2c7cdb8b |
| 681b6eadf19e284f61a2b508 | Green Water Wall |  | Waterfall | same place as fsq:681b6bb92385a80f93e49fb3 |
| 6a02398e74edbe3879398b0b | Castello Lopes Cinemas Mira Maia | Maia | Movie Theater | same place as fsq:642835642308786c7f5eac51 |
| 6a48b90615d07a2f272c91dd | Vasco Da Gama | Angra do Heroísmo | Historic and Protected Site | same place as fsq:6a48b8e4ff81ba6596227552 |
| 89f92241fa984b35f0cc0c42 | Igreja da Misericórdia de Vila Franca de Xira | Vila Franca de Xira | Monument | same place as fsq:5512b93f498eec7132855413 |
