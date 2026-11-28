# KAN-461 — OSM archive import, laundry, butcher, fishmonger, florist, tattoo, ice_cream — DRY RUN

Run `kan461-osm-batch1-20261122`, 2026-11-22T18:36:06Z. Archive `osm-poi.sql`; served base 213,068 Overture + 42,013 curated.

| type | archive rows | import | served | served (same core name) | suspect | inside a centre | empty name |
|---|---:|---:|---:|---:|---:|---:|---:|
| `laundry` | 923 | **600** | 284 | 0 | 34 | 5 | 0 |
| `butcher` | 919 | **647** | 248 | 0 | 24 | 0 | 0 |
| `fishmonger` | 197 | **148** | 42 | 0 | 7 | 0 | 0 |
| `florist` | 389 | **257** | 115 | 0 | 15 | 2 | 0 |
| `tattoo` | 80 | **35** | 36 | 0 | 7 | 2 | 0 |
| `ice_cream` | 2 | **1** | 1 | 0 | 0 | 0 | 0 |

## Imports by the type they are written as

| archive type | written as | rows | how |
|---|---|---:|---|
| `butcher` | `butcher` | 647 | archive |
| `laundry` | `laundry` | 600 | archive |
| `florist` | `florist` | 257 | archive |
| `fishmonger` | `fishmonger` | 148 | archive |
| `tattoo` | `tattoo` | 35 | archive |
| `ice_cream` | `ice_cream` | 1 | archive |

### Parks kept as `park` on the OSM tag alone (case by case)


SQL: 7 statement(s).

## Sample `laundry` imports

- Lavisek — 36.97459, -7.86576 (node/10009032534)
- Self service lavanderia — 40.20184, -8.41359 (node/10015953219)
- Branca de neve — 41.80361, -6.76129 (node/10021701617)
- Fast — 41.21354, -8.54880 (node/10028376419)
- Wash Station — 40.22911, -8.43885 (node/10093735658)
- Washy — 40.92594, -8.54864 (node/10102168595)
- Lavandaria Sandra & Costa — 41.55493, -8.40470 (node/10160884994)
- 5àsec — 39.10131, -9.25341 (node/10209178243)
- Self-service laundry — 38.76358, -9.17121 (node/10212597317)
- 5àsec — 38.77535, -9.34015 (node/10213605666)
- Central da Roupa — 38.63016, -9.14952 (node/10214259617)
- Wash-Up — 41.56147, -8.38291 (node/10221681110)
- 5àsec — 40.88990, -8.49083 (node/10241084482)
- 5àsec — 37.74907, -25.67590 (node/10247888694)
- La Wash — 37.74693, -25.67503 (node/10247890214)

## Sample `butcher` imports

- Talho Tomás & Filhos — 40.92561, -8.54521 (node/10002357744)
- Talho Ferreira — 40.74153, -8.64372 (node/10013451437)
- Talho do Toninho — 41.14955, -8.60719 (node/10026753901)
- José Carvalho — 40.94813, -8.56323 (node/10039016781)
- Talhos Sancarnes — 38.64871, -9.03743 (node/10040774438)
- Talho Freitas — 41.41520, -7.88111 (node/10106969146)
- NP Carnes — 38.84057, -9.16144 (node/10155643883)
- Cabrito — 41.15688, -8.60907 (node/10244446371)
- Pereira — 41.63455, -8.19219 (node/10246630917)
- Deutsche Metzgerei Vila Vita — 37.12725, -8.40121 (node/10314513110)
- Vieiras — 41.62701, -8.36587 (node/1052970581)
- Mercenaries de Nélia — 38.75357, -9.25571 (node/10709257874)
- Ralph — 38.75664, -9.25660 (node/10712040176)
- Talho Argentino — 40.00318, -8.73675 (node/10871084631)
- Gira Carnes — 40.20363, -8.40521 (node/10910523930)

## Sample `fishmonger` imports

- Peixaria Peixe Fresco — 41.00361, -8.64596 (node/10013520374)
- Peixaria Bininha — 41.14958, -8.60682 (node/10026761845)
- Peixaria Rosa Maria — 41.14979, -8.60675 (node/10026761846)
- Peixaria Ermelinda Lopes — 41.14981, -8.60681 (node/10026761847)
- Peixaria Teresa Soares da Costa — 41.14984, -8.60693 (node/10026761849)
- Ongel — 41.21347, -8.54901 (node/10028376418)
- Delícias do Mar — 38.64882, -9.03757 (node/10040774439)
- Peixaria Pinguim — 40.20970, -8.43102 (node/10720294275)
- Fish Fixe — 40.20392, -8.40522 (node/10910523929)
- A Nossa Peixaria Vale do Cobro — 38.53217, -8.86514 (node/11027834588)
- Peixaria Delmar — 41.40586, -8.36697 (node/11084012945)
- A Nossa Peixaria — 38.64458, -9.06018 (node/11175687313)
- A Nossa Peixaria — 38.52274, -8.89250 (node/11196235278)
- Caracóis Costa Azul — 38.52294, -8.89463 (node/11196392919)
- Peixaria Brazinha — 38.46609, -9.11206 (node/11232629324)

## Sample `florist` imports

- Rosinha Florista — 41.14946, -8.60717 (node/10026753903)
- Flores da Tereza — 41.14944, -8.60718 (node/10026753904)
- Flores Angelina Berta — 41.14928, -8.60726 (node/10026753905)
- Flores José Silva — 41.14931, -8.60724 (node/10026753906)
- Inês das Plantas — 41.14918, -8.60730 (node/10026753907)
- Maria Plantas — 41.14921, -8.60729 (node/10026753908)
- Florista Rosa Maria — 41.14926, -8.60705 (node/10026753910)
- Horto das Enxurreiras — 41.14913, -8.60712 (node/10026753911)
- Cindinha — 41.14918, -8.60711 (node/10026753912)
- Raízes — 41.69308, -8.82839 (node/10052445672)
- Florista S.Bento — 41.51443, -8.58434 (node/10885477024)
- Florista Tina — 40.20358, -8.40521 (node/10910523949)
- Floripétalha — 38.52478, -8.88183 (node/11034969694)
- Rosa da Avenida — 38.52534, -8.87224 (node/11043663516)
- Decoflor — 39.35705, -9.38238 (node/11055053407)

## Sample `tattoo` imports

- Studio tattoo — 40.94660, -8.54762 (node/10681085566)
- Art Shape Tattoo — 37.02324, -7.92565 (node/11407415531)
- Manuel Gabriel Tattoo — 32.64130, -16.94917 (node/11482417110)
- Carla Caroto Tattoo Studio — 32.67197, -17.06443 (node/11494839615)
- Crou Tattoo Studio — 40.65876, -7.91206 (node/11698947013)
- La Maison - Tatoo Studio — 40.64148, -8.65231 (node/11711397511)
- Off Season Tattoo Studio — 41.29903, -7.73150 (node/12051535854)
- Oásis Tattoo — 38.79864, -9.35492 (node/12189595540)
- NR Tattoo Art — 41.29790, -7.74436 (node/12426267576)
- Anatomic Tattoo & Barber Shop — 32.64798, -16.90045 (node/12643526301)
- Valgrind - The Viking Barber Tattoo Studio — 41.29982, -7.72357 (node/13504444741)
- Tattoo Domus — 41.44130, -8.29360 (node/13825178909)
- Conexão Tattoo — 38.68969, -9.33564 (node/13860775456)
- Oriente Tattoo Ink — 40.92496, -8.56171 (node/14020053201)
- Kria Walk-in Tattoo Porto — 41.14965, -8.61498 (node/14039143002)

## Sample `ice_cream` imports

- Gelataria Carte D'Or — 37.09405, -7.67756 (node/5114909839)
