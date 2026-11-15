# KAN-461 — OSM archive import, cafe, bakery — DRY RUN

Run `kan461-cafe-bakery-20261115`, 2026-11-15T18:37:29Z. Archive `portugal-261114.osm.pbf`; served base 213,068 Overture + 12,883 curated.

| type | archive rows | import | served | suspect | inside a centre | empty name |
|---|---:|---:|---:|---:|---:|---:|
| `cafe` | 12,185 | **6,951** | 4,874 | 317 | 42 | 1 |
| `bakery` | 3,036 | **1,479** | 1,441 | 92 | 24 | 0 |

## Imports by the type they are written as

| archive type | written as | rows | how |
|---|---|---:|---|
| `cafe` | `cafe` | 6,951 | extract |
| `bakery` | `bakery` | 1,479 | extract |

## Freshness of the imports (last edit in OSM, or a check_date)

| type | written with a second type | 2024 or later / checked | 2020–2023 | 2015–2019 | before 2015 |
|---|---:|---:|---:|---:|---:|
| `cafe` | 348 | 2,643 | 1,757 | 1,648 | 903 |
| `bakery` | 314 | 655 | 364 | 321 | 139 |

### Parks kept as `park` on the OSM tag alone (case by case)


SQL: 36 statement(s).

## Sample `cafe` imports

- Café Bela Rosa — 38.65566, -9.02458 (node/10000004104)
- Cafetaria Pescamar — 37.10408, -8.67310 (node/10001945306)
- Cafe Coral — 41.29224, -8.72626 (node/10002876609)
- Barbossa — 32.80840, -16.96329 (node/10004400017)
- Restcafé — 38.75717, -9.15321 (node/10007441089)
- Café da Preta — 37.02431, -7.83965 (node/10009041836)
- Europa — 41.29911, -7.75097 (node/10009329107)
- 4you — 32.67680, -17.07742 (node/10009524317)
- Mr. Box Tea — 38.73466, -9.15397 (node/10009627766)
- Benji's — 37.16912, -7.51283 (node/10010084957)
- Arena Café — 38.74364, -9.14574 (node/10010979625)
- Chave Douro — 38.74071, -9.14307 (node/10010979630)
- Estação Bar — 37.03019, -7.83996 (node/10012952956)
- Pastelaria pateta — 37.10195, -8.67971 (node/10013009480)
- Hula-Hula — 41.00846, -8.64472 (node/10013556911)

## Sample `bakery` imports

- Padaria Serrana — 41.29428, -7.73921 (node/10008800914)
- Pastelaria Moderna — 41.53646, -8.59802 (node/1001108397)
- Jubileu — 41.00016, -8.56700 (node/10024126351)
- Dii SweetCake — 41.17853, -8.62435 (node/10025935287)
- Empadas da Bolhão — 41.14896, -8.60713 (node/10026761832)
- Padaria Madalena — 41.14914, -8.60704 (node/10026761834)
- Docaria Portuguesa — 41.14923, -8.60736 (node/10026861494)
- Sweet Bolhão — 41.14943, -8.60704 (node/10026861500)
- Padaria Troncal — 40.90948, -8.55947 (node/10027925135)
- Estrela do Sul — 38.64822, -9.03766 (node/10040774437)
- Pastelaria Atlântico — 41.69392, -8.82975 (node/10052445956)
- Miminhos da São — 40.53765, -7.26812 (node/10082071063)
- Doce Tentação — 38.63090, -9.15283 (node/10106973823)
- Lord — 38.63248, -9.15440 (node/10120365725)
- Padaria Pão Quente Trigal — 41.15978, -8.59251 (node/10130691581)
