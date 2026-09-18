# KAN-453 — Foursquare archive preflight, PT

Generated 2026-09-18T11:37Z by `cloudflare/extraction/preflight_foursquare_archive.py`. Measurement only: nothing was written to D1 or R2.

## Inputs

- Foursquare archive: `country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv` — 396,749 rows (sha256 `82b04934657742e497ba7832a8fab81aa09fb4703958b63cd3e92fa25ab33b98`).
- Overture base: `overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv` — 215,695 promoted of 350,415 rows under the committed overrides (pending 90,532, promoted 215,695, rejected 44,188).
- Curated rows of the candidate types (active): 3.
- MULTIBANCO: not read. `atm` is excluded from recovery, so no archive row is compared against it.
- Matcher: `supplement_osm_pois.names_match` (name_similarity ≥ 0.72 within 75 m, or a single shared identity token within 20 m). Same-name served places between 75 m and 400 m are reported as suspect, never as matched.

## Mapping used

An archive row is typed the way `classify_and_load.py` types it: its Foursquare category ids against the **primary** `category_id` of each `poiTypeCategories.json` entry (`build_reverse_map`), then the explicit-ATM and financial-service name rules that move a row out of `bank`. Category `also` ids are what `category_ids.py` extracts on but the classifier never reads; they are counted here and not typed.

| type | primary Foursquare leaf | rows typed by primary id | rows carrying only an `also` id |
|---|---|---:|---:|
| `viewpoint` | Scenic Lookout | 1,585 | 0 |
| `tourist_attraction` | Attraction | 97 | 0 |
| `hiking_area` | Hiking Trail | 583 | 0 |
| `plaza` | Plaza | 1,132 | 117 |
| `botanical_garden` | Botanical Garden | 34 | 1,102 |
| `bridge` | Bridge | 355 | 0 |
| `marina` | Harbor or Marina | 336 | 0 |
| `surf_spot` | Surf Spot | 343 | 0 |
| `lighthouse` | Lighthouse | 138 | 0 |
| `waterfall` | Waterfall | 102 | 0 |
| `hot_spring` | Hot Spring | 90 | 0 |
| `island` | Island | 67 | 0 |
| `bank` | Bank | 3,771 | 0 |

Bank rows the classifier itself moves elsewhere (not counted as `bank` above): `atm` 41, `currency_exchange` 12, `financial_service` 39, `money_transfer` 26.

## Per type

"served today" is what the base holds under this type name (Overture promoted + active curated); a match may land on another type in the same family, so it is context, not a denominator.

| type | served today | archive rows | matched | unique | suspect | matched % |
|---|---:|---:|---:|---:|---:|---:|
| `viewpoint` | 0 | 1,585 | 369 | 989 | 227 | 23% |
| `tourist_attraction` | 0 | 97 | 10 | 76 | 11 | 10% |
| `hiking_area` | 198 | 583 | 101 | 415 | 67 | 17% |
| `plaza` | 491 | 1,132 | 378 | 555 | 199 | 33% |
| `botanical_garden` | 44 | 34 | 11 | 16 | 7 | 32% |
| `bridge` | 189 | 355 | 92 | 203 | 60 | 26% |
| `marina` | 95 | 336 | 28 | 223 | 85 | 8% |
| `surf_spot` | 128 | 343 | 93 | 161 | 89 | 27% |
| `lighthouse` | 68 | 138 | 51 | 67 | 20 | 37% |
| `waterfall` | 41 | 102 | 15 | 72 | 15 | 15% |
| `hot_spring` | 20 | 90 | 9 | 68 | 13 | 10% |
| `island` | 2 | 67 | 6 | 49 | 12 | 9% |
| `bank` | 1,970 | 3,771 | 1,081 | 1,876 | 814 | 29% |

### `viewpoint` — 1,585 rows

Matched against: overture historical_landmark 285, overture church 25, overture mountain 15, overture park 9, overture beach 9, overture hiking_area 6, overture lake 6, overture nature_preserve 4, overture museum 3, overture cultural_center 3, overture plaza 2, overture river 1, overture lighthouse 1.

Suspect because: same name beyond the matcher radius 130, no name signal 44, same name as a served place of another kind 30, archive twin within 20 m 8, coordinates shared with 1 other archive row(s) 7, name is the locality 6, empty name 2.

Same name beyond the matcher radius, by served type: overture historical_landmark 55, overture church 11, overture restaurant 11, overture beach 8, overture park 8, overture bar 6, overture cultural_center 5, overture mountain 5, overture museum 3, overture hiking_area 2, overture bakery 2, overture school 2, overture theatre 1, overture gym 1, overture campground 1, overture plaza 1, overture veterinary_care 1, overture marina 1, overture music_venue 1, overture store 1, overture community_center 1, overture bridge 1, overture yoga_studio 1, overture river 1.

Same name as a served place of another kind, by served type: overture cafe 11, overture restaurant 8, overture store 4, overture bar 3, overture school 1, overture bank 1, overture gym 1, overture supermarket 1.

#### Already served (matched) — sample of 30 of 369

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b0588a2f964a5201cd122e3 | Cristo Rei | Capela Cristo Rei | overture church | 59 | 0.90 | KAN-388 match: overture church |
| 4bb624302f70c9b6adef8430 | Jardim do Torel | Jardim do Torel | overture park | 35 | 1.00 | KAN-388 match: overture park |
| 4c9a1ba3db10b60c0fb08f6d | Cabo Girão | Cabo Girão | overture historical_landmark | 33 | 1.00 | KAN-388 match: overture historical_landmark |
| 4cc7fb6573fd6dcb6a331986 | Parque Eólico De Serra Do Sicó (Pombal€ | Parque Eólico De Serra Do Sicó (Pombal€ | overture park | 3 | 1.00 | KAN-388 match: overture park |
| 4d1f7ea5b69c6dcba2b26795 | Miradouro do Pico dos Barcelos | Pico dos Barcelos | overture historical_landmark | 50 | 0.90 | KAN-388 match: overture historical_landmark |
| 4d3c4634557d6dcbc1313944 | Largo do Lazareto | Largo do Lazareto | overture historical_landmark | 17 | 1.00 | KAN-388 match: overture historical_landmark |
| 4e209265ae6015b2129ccdf6 | Estrada Do Desespero - A Saga Continua | Estrada Do Desespero - A Saga Continua | overture historical_landmark | 25 | 1.00 | KAN-388 match: overture historical_landmark |
| 4eaa74ff490158448981254a | Miradouro Panorâmico Nazaré | Miradouro Da Nazare | overture historical_landmark | 45 | 0.78 | KAN-388 match: overture historical_landmark |
| 4ec91bab30f8b09c0de188ed | Penedo do Lexim | Penedo de Lexim | overture historical_landmark | 31 | 0.90 | KAN-388 match: overture historical_landmark |
| 4fd0fdaae4b087c0c32c680e | Moínho A-de-Mourão | Moinho de A-do-Mourão | overture historical_landmark | 61 | 0.90 | KAN-388 match: overture historical_landmark |
| 509ce243e4b0383a0d143e36 | Miradouro António Nogueira | Miradouro Antonio Nogueira - Coimbra | overture historical_landmark | 17 | 0.90 | KAN-388 match: overture historical_landmark |
| 50f24ceee4b0d0766203799b | Salto da Ribeira | Miradouro do Salto da Ribeira | overture historical_landmark | 28 | 0.90 | KAN-388 match: overture historical_landmark |
| 51976179498eb4bdf348f454 | Moinho do Frade | Moinho Do Frade | overture historical_landmark | 22 | 1.00 | KAN-388 match: overture historical_landmark |
| 52a9a369498e8621724aadca | Torre | Torre | overture historical_landmark | 3 | 1.00 | KAN-388 match: overture historical_landmark |
| 5308d9e011d27285e8643808 | Miradouro da Condessa de Seisal | Miradouro da Condessa de Seisal | overture historical_landmark | 0 | 1.00 | KAN-388 match: overture historical_landmark |
| 53f37629498efa18a80d7abd | Pico do Meio Dia | Pico do Meio Dia | overture historical_landmark | 8 | 1.00 | KAN-388 match: overture historical_landmark |
| 545fa4da498e128ccacb6edc | Cruz Alta do Bussaco | Cruz Alta do Bussaco | overture historical_landmark | 0 | 1.00 | KAN-388 match: overture historical_landmark |
| 55575c3a498ec3f82abbe751 | Radar Metereológico de Arouca | Radar Metereológico de Arouca | overture historical_landmark | 0 | 1.00 | KAN-388 match: overture historical_landmark |
| 574f09a5498e08ba1cf76474 | Cruzeiro do Burgo | Cruzeiro do Burgo | overture historical_landmark | 4 | 1.00 | KAN-388 match: overture historical_landmark |
| 5766ad57498e2c1f93d8bb7b | Miradouro Viewpoint | Miradouro Viewpoint | overture historical_landmark | 1 | 1.00 | KAN-388 match: overture historical_landmark |
| 57d9cbd6498e5450762125d9 | Miradouro da Pederneira | Pederneira | overture historical_landmark | 73 | 0.90 | KAN-388 match: overture historical_landmark |
| 58ac73cc2948b344b7c98750 | Miradouro N.ª Sr.ª da Conceição | Miradouro   Nossa Sra. Conceição. Tabuaço | overture historical_landmark | 26 | 0.78 | KAN-388 match: overture historical_landmark |
| 5beedf4a446ea6002c0f6a32 | Pedra da Nau | Pedra da Nau | overture historical_landmark | 64 | 1.00 | KAN-388 match: overture historical_landmark |
| 5f81a9133454f95f3a1c94be | Capela Miradouro Sagrada Familia | Capela Miradouro Sagrada Familia | overture church | 64 | 1.00 | KAN-388 match: overture church |
| 628b888a32e77a3660299d2a | Nossa Senhora da Pedra | Nossa Senhora da Pedra | overture church | 11 | 1.00 | KAN-388 match: overture church |
| 62c34aa0d22de103d6763c3c | Miradouro de Água de Pau | Miradouro Panorâmico De Água De Pau | overture nature_preserve | 55 | 0.81 | KAN-388 match: overture nature_preserve |
| 641840b825ded537dfabf871 | Miradour Do Carreiro De Sao Marcos | Carreiro De São Marcos | overture historical_landmark | 44 | 0.90 | KAN-388 match: overture historical_landmark |
| 65a2c63c39480471e440cbbc | Miradouro Da Serretinha Feteira | Miradouro da Serretinha | overture historical_landmark | 33 | 0.90 | KAN-388 match: overture historical_landmark |
| 663cb4dd9e6dde08e4dcb23f | Miradouro Da Ferraria | Miradouro da Ilha Sabrina | overture historical_landmark | 20 | 0.74 | KAN-388 match: overture historical_landmark |
| 6908c743bb03440cec513d06 | Miradouro De Teixeirô | Miradouro de Teixeirô | overture historical_landmark | 14 | 1.00 | KAN-388 match: overture historical_landmark |

#### Unique — sample of 30 of 989

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4c112bc56b7e2d7fb3d22835 | Grutas de Mira de Aire | Porto de Mós | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 4c9df1b6ca44236af7722599 | Moaz | Vinhais | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 4e061ad8aeb74c399107a5be | Miradouro de São Domingos | Armamar Municipality | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 4ec7a15c5c5ce271bdb59aab | Quinta Das Antas |  | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 4fb627a9e4b02861a85c4697 | Achada do Teixeira | Santana | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 4fc75bd6e4b0b4b93fa9e636 | Usseira |  | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 50e22240e4b0a78b099209e3 | Spot do Diogo e da Beatrysa | Lisboa | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 5214e2a911d28fa15c933d38 | Geodätischer Punkt auf dem Pico da Boneca | Santana | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 5226ab5311d20ab924b7ca81 | Miradouro Sequeira Paula | Palmela | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 526d2e6211d2e1b5fdf4d8c1 | Miradouro do Massapez |  | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 5366850f498e76b3a9b5d099 | Cabo da Roca |  | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 53c28ece498e27df06e9f981 | Pico Juliana View Point |  | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 55f1c3d7498eab446d60a8dd | castro do vale das aguias |  | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 56606781498ea18d8aa935d9 | Miradouro das Pedras Negras | São Vicente Ferreira | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 593d5498cf72a04ed1b4853d | Miradouro da Bandeirinha | Porto | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 59b174bb1f8ed60cb2cf7210 | Miradouro do Forno | Monsanto | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 5aac0d5c4c954c318f501cb2 | Ponta Do Trovao | Peniche | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 5e4592d8850a7a000884fd1c | Miradouro da Graça | Lisboa | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 61765d5a4362d943b1e13056 | Miradouro Secreto | Vila Nova de Gaia | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 621136f43ca66250960af3a9 | Miradouro Cabeço do Resto | Ilha | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 629630ce3886b51f9de2a65b | Miradouro do Lombo da Quinta | Funchal | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 62af85098a270f44053b024e | Fajã da Arruda | São Vicente | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 633c4f311eb2ce1a098d86ba | Miradouro do Cruzeiro | Santana | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 646c957976795576ba57b293 | miradouro do pico celeiro | Praia da Vitória | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 65edaa33998a41135bf0fb7c | Albufeira Panoramic View | Albufeira | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 66b4ca42673bc36bed0ab741 | Miradouro Ilhéu Da Vila | Vila Franca do Campo | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 66ce20235ab0ea5753a9856b | Miradoiro Do Sino Dos Mouros | Moledo | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 69f4d574958f375a69e2df97 | Miradouro da Ponte da Arrábida | Porto | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 6a11bcd4b01b4c5cbe95f9ce | Ermida Do Sepulcro E Cruz | Luso | Landmarks and Outdoors > Other Great Outdoors | no served counterpart within 400 m |
| 6a7873abd49e580256143e25 | Pico dos Sete Pés | Santa Cruz Das Flores | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |

#### Suspect — sample of 30 of 227

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4bcf6205a8b3a593611d625f | Largo Portas do Sol | Toranja - Portas do Sol | overture store | 23 | 0.75 | same name as a served place of another kind: overture store at 23 m |
| 4c03acea6c349c748261750c | Castelo de Palmela | Castelo de Palmela | overture historical_landmark | 107 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 107 m |
| 4d55459d96ed548164ca0670 | Varandas de Avô | Varandas de Avô | overture cafe | 3 | 1.00 | same name as a served place of another kind: overture cafe at 3 m |
| 4d6b9e082ea9b1f7b1bad228 | Miradouro da Penha de França | Penha de França | overture historical_landmark | 75 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 75 m |
| 4e2bf1cca809f1b164151cac | A Memória | Pico Da Memória | overture park | 116 | 0.75 | same name beyond the matcher radius: overture park at 116 m |
| 4e7ca7158231041a4df9f182 | Miradouro do Moinho | Bar Moinho Miradouro | overture bar | 142 | 0.90 | same name beyond the matcher radius: overture bar at 142 m |
| 4e91cedff5b9f8967d3147bd | Miradouro |  |  |  |  | no name signal (only type words) |
| 4f9c09f1e4b0edc561183ad2 | Miradouro |  |  |  |  | no name signal (only type words) |
| 5030cfe8e4b08362161f2007 | Miradouro Despe-te Que Te Suas | Miradouro Despe-te que Suas | overture historical_landmark | 93 | 0.95 | same name beyond the matcher radius: overture historical_landmark at 93 m |
| 5038fa88e4b0361aeba36ae8 | São Salvador do Mundo | Miradouro de São Salvador do Mundo | overture historical_landmark | 265 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 265 m |
| 50718271e4b0d7b67f8b0514 | Miradouro Barragem Maranhão | Barragem do Maranhão | overture historical_landmark | 337 | 0.72 | same name beyond the matcher radius: overture historical_landmark at 337 m |
| 513b6f53e4b012e809897309 | Miradouro do Castelo | Miradouro do Castelo | overture restaurant | 17 | 1.00 | no name signal (only type words) |
| 51bfacdc498e8d96e78cb7fc | Miradouro das Neves | Miradouro Das Neves, São Gonçalo, Funchal, Madeira | overture historical_landmark | 250 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 250 m |
| 52196bd711d2c0f21ab39320 | Miradouro de São Silvestre | Miradouro de São Silvestre | overture historical_landmark | 81 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 81 m |
| 525d6c9711d29fff87a76305 | Miradouro Norte | Miradouro do Norte | overture historical_landmark | 88 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 88 m |
| 541c4f50498e78ca0860df89 | vista |  |  |  |  | no name signal (only type words) |
| 54d3a370498e826e4611c479 | Último banco do Cais |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 55b755c4498ecfd66d044df0 | Miradouro Ponta do Castelo | Miradouro Ponta do Castelo | overture historical_landmark | 165 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 165 m |
| 58ab26389c954845fa701f1b | Torre Do Relógio | Torre do Relógio de Meda | overture historical_landmark | 246 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 246 m |
| 5c5f01558afbe0003abc8d32 | Miradouro |  |  |  |  | no name signal (only type words) |
| 5d89cc5626fc6a000802270a | Miradouro Do Farol |  |  |  |  | no name signal (only type words) |
| 5e341bff98782900085a87c2 | Miradouro da Tabaiba | Miradouro da Tabaiba | overture gym | 4 | 1.00 | same name as a served place of another kind: overture gym at 4 m |
| 5f2d8dd58aaf610785573702 | Miradouro Do Pico Do Facho | Miradouro do Pico do Facho | overture historical_landmark | 112 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 112 m |
| 60bcfdc7ef29715bc37f6147 | Miradouro Keil do Amaral | Anfiteatro Keil do Amaral | overture park | 128 | 0.78 | same name beyond the matcher radius: overture park at 128 m |
| 60ffefc6ef388a51de3a3bae | Pontal Da Carrapateira Ponto H |  |  |  |  | archive twin within 20 m: 60ffeec9bda9723afaf46a83 |
| 61e9a361c5a42856896c2512 | Miradouro do Peneco | Elevador do Peneco | overture hiking_area | 78 | 0.76 | same name beyond the matcher radius: overture hiking_area at 78 m |
| 6501c2c97798215483db1b94 | Miradouro De São Brás | Miradouro | overture historical_landmark | 92 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 92 m |
| 667170603560c74e9da82465 | miradouro |  |  |  |  | no name signal (only type words) |
| 681cab543ed75e6b5883d82d | Miradouro Do Mercado Municipal D. Pedro V | Mercado Municipal D. Pedro V | overture supermarket | 38 | 0.90 | same name as a served place of another kind: overture supermarket at 38 m |
| 6835f5022be5a703c12ca814 | Miradouro de Santa Cruz | Igreja de Santa Cruz | overture church | 207 | 0.79 | same name beyond the matcher radius: overture church at 207 m |

### `tourist_attraction` — 97 rows

Matched against: overture amusement_park 7, overture park 2, overture zoo 1.

Suspect because: same name beyond the matcher radius 10, same name as a served place of another kind 1.

Same name beyond the matcher radius, by served type: overture cafe 3, overture amusement_park 3, overture plaza 2, overture park 1, overture school 1.

Same name as a served place of another kind, by served type: overture cafe 1.

#### Already served (matched) — sample of 10 of 10

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 522b2730bce6542a51122e74 | Parque Infantil Serafina | Parque Infantil Serafina | overture amusement_park | 0 | 1.00 | KAN-388 match: overture amusement_park |
| 5247fb6c11d21ab05806f7ca | Morangos Fun Park | Morangos FunPark | overture amusement_park | 13 | 0.97 | KAN-388 match: overture amusement_park |
| 55859856498e487d3db103b6 | Parque Arqueológico  do Vale do Terva | Parque Arqueológico  do Vale do Terva | overture park | 2 | 1.00 | KAN-388 match: overture park |
| 55f45135498e2e2de2aaec29 | Woop | Woop Family Entertainment Center | overture amusement_park | 0 | 0.90 | KAN-388 match: overture amusement_park |
| 58c03ab1d25ded0ed42d86f7 | Parque Infantil Vila Pouca Aguiar | Parque Infantil Praça João Paulo II Vila Pouca De Aguiar | overture park | 20 | 0.74 | KAN-388 match: overture park |
| 5b4b2ab36eda02002c68cdc5 | Vrum - Escolinha De Trânsito | Vrum | overture amusement_park | 66 | 0.90 | KAN-388 match: overture amusement_park |
| 5cea75be3731ee002cf08f7b | Burros Do Magoito | Burros do Magoito | overture zoo | 17 | 1.00 | KAN-388 match: overture zoo |
| 5d20d9c879ad5e0023e6c45e | Eborakids | EboraKids | overture amusement_park | 16 | 1.00 | KAN-388 match: overture amusement_park |
| 5d34a14b1e51a6000813b3cd | Monkey Park | MonkeyPark | overture amusement_park | 38 | 0.95 | KAN-388 match: overture amusement_park |
| 5d384a2960344000083f675b | Jurassic River | Jurassic River | overture amusement_park | 9 | 1.00 | KAN-388 match: overture amusement_park |

#### Unique — sample of 30 of 76

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4ec51328722ececf19d64b14 | Praça do Vapor | Matosinhos | Landmarks and Outdoors > Monument | no served counterpart within 400 m |
| 4f20329de4b03c0ea05c01d2 | Tribo dos Reguilas | Faro | Landmarks and Outdoors > Park > Playground | no served counterpart within 400 m |
| 4fabf1dde4b09ddd00d3759f | Parque Infantil do Covelo |  | Landmarks and Outdoors > Park > Playground | no served counterpart within 400 m |
| 4ffe764ae4b0190ba1d23cbf | Aqualandia |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 4ffe7703e4b07827a7609ffe | Slow River |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 5150d9e8e4b0f160ab1838a1 | Fabrica dos Tomates | Ordem | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 51605ef6498e5d9d9eeca3fd | A Quintinha |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 51867f4d498eeceb0423a2a3 | Parque Aventura da Lipor |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 520d5d1011d2bc1eeb18863a | Jubilo Carrossel |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 5235a3c711d2b264068d1ebb | Gymboree |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 5262c36c498e1970c4be3764 | Caixa Magica |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 527596bd498e60799b3ae29c | Carros De Choque |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 528fb05611d28cc557819423 | Funny City | Braga | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 52e3db5f498e5c1a4413cd8e | Gargalhadas |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 52ee6a92498e06529e625fdc | Escola de Transito de Tavira |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 536e5d6b498ec624754a5c91 | Space Radical Kids | Carnaxide | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 55046b35498e6047d439582b | Play4Fun | Barreiro | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 552ab6e3498e28d03963a674 | SMALAND |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 560fb1d4498e7c964acbb656 | Mundo do Leo | Valongo | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 57385e98498e45fcea8b6ba2 | Ateliê de Festas | Ermesinde | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 577135a8498e8a8a973d0dc7 | Aqua Show |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 57a0cd0a38fae1de78f624ba | KIDU | Maia | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 5975135af0ca95364b6d2bd6 | Parque De Atraçoēs | Alcobaça | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 5e24ea9e293a0a000840e6b7 | Parque De Diversões Sac | Santo António dos Cavaleiros | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 5e4a779680695b00099ceec5 | Parque Infantil | Rio Tinto | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 60c4ea80b95b3e705e0da186 | Rodagigante |  | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 685c76d32649211586737fec | Scad Dive | Albufeira | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 6862d4fc8075390e466717e8 | Escadas Da Pedrosa | Vila Nova de Gaia | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 6923543d18a1dd4f17fecc51 | Mural Dos Fadistas | Lisboa | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |
| 69c811101bba1e2bcaf21dbe | Baloiço De Côta | Cota | Arts and Entertainment > Amusement Park > Attraction | no served counterpart within 400 m |

#### Suspect — sample of 11 of 11

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4e9974a7be7b1a0d64d0c41a | Carreiros do Monte | Café do Monte | overture cafe | 207 | 0.77 | same name beyond the matcher radius: overture cafe at 207 m |
| 51d88e44498ef5f354c17b0e | Tasquinhas de Monte Real | Tasquinhas de Monte Real | overture amusement_park | 80 | 1.00 | same name beyond the matcher radius: overture amusement_park at 80 m |
| 520a04ee498e5527b6dbc422 | Zoomarine Pirate Bay | Zoomarine Bar | overture cafe | 93 | 0.73 | same name beyond the matcher radius: overture cafe at 93 m |
| 521a023011d248390816dcd4 | Zoomarine Carrocel | Zoomarine Bar | overture cafe | 73 | 0.77 | same name as a served place of another kind: overture cafe at 73 m |
| 52b72bee498e96709cbaa1a7 | Praça da Liberdade | Praça da Liberdade | overture plaza | 86 | 1.00 | same name beyond the matcher radius: overture plaza at 86 m |
| 5589b1e8498ec950a0d7a195 | Roda Gigante Boavista | Rotunda da Boavista | overture plaza | 182 | 0.75 | same name beyond the matcher radius: overture plaza at 182 m |
| 55da1ad4498efb58d81c5586 | Parque De Abrantes | Parque Radical de Abrantes | overture park | 328 | 0.82 | same name beyond the matcher radius: overture park at 328 m |
| 571d10af498ef32d7cacb015 | Parque Infantil do Açude | Parque Infantil do Açude | overture amusement_park | 87 | 1.00 | same name beyond the matcher radius: overture amusement_park at 87 m |
| 5ba80812c5b11c002c9865e7 | Roda Gigante Cais de Gaia | Churraria Cais de Gaia | overture cafe | 159 | 0.72 | same name beyond the matcher radius: overture cafe at 159 m |
| 5d3c3c21f2d14000076ee169 | Academia Do Sorriso | Academia do Sorriso - Centro de Estudos e Explicações, Lda | overture school | 87 | 0.90 | same name beyond the matcher radius: overture school at 87 m |
| 62693b59b842314d08063d8a | Anima Park | Anima Park | overture amusement_park | 147 | 1.00 | same name beyond the matcher radius: overture amusement_park at 147 m |

### `hiking_area` — 583 rows

Matched against: overture hiking_area 75, overture historical_landmark 10, overture park 4, overture nature_preserve 3, overture waterfall 2, overture beach 2, overture mountain 1, overture amusement_park 1, overture golf_course 1, overture cultural_center 1, overture church 1.

Suspect because: same name beyond the matcher radius 49, no name signal 10, same name as a served place of another kind 4, coordinates shared with 2 other archive row(s) 2, coordinates shared with 1 other archive row(s) 1, archive twin within 20 m 1.

Same name beyond the matcher radius, by served type: overture hiking_area 16, overture historical_landmark 8, overture beach 7, overture nature_preserve 5, overture restaurant 3, overture church 3, overture waterfall 1, overture marina 1, overture bakery 1, overture pharmacy 1, overture cafe 1, overture park 1, overture plaza 1.

Same name as a served place of another kind, by served type: overture cafe 2, overture laundry 1, overture restaurant 1.

#### Already served (matched) — sample of 30 of 101

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b0588a7f964a520b3d222e3 | Passeio Marítimo de Belém | Passeio Marítimo de Belém | overture hiking_area | 3 | 1.00 | KAN-388 match: overture hiking_area |
| 4c4dbf091b8e1b8d28971f26 | Casa Da Montanha | Casa da Montanha | overture hiking_area | 1 | 1.00 | KAN-388 match: overture hiking_area |
| 4cb99d6d4495721e3c444b7a | Oitavos Dunes Golf | Oitavos Dunes Golf Course | overture golf_course | 36 | 0.90 | KAN-388 match: overture golf_course |
| 4d57fb7dde8f6dcba7eb0591 | Paredão de Cascais | Paredão de Cascais | overture hiking_area | 3 | 1.00 | KAN-388 match: overture hiking_area |
| 4d60fc03d7206ea8a450fbf1 | Pedra Amarela | Pedra Amarela | overture hiking_area | 4 | 1.00 | KAN-388 match: overture hiking_area |
| 4d70ec70cbc58cfa21807972 | Passeio Pedonal Ericeira Sul - Foz do Lizandro | Passeio Pedonal Ericeira Sul - Foz do Lizandro | overture hiking_area | 5 | 1.00 | KAN-388 match: overture hiking_area |
| 4e4cdd83149563bcf30674a6 | Passeio Ribeirinho de Vila Franca de Xira | Passeio Ribeirinho de Vila Franca de Xira | overture hiking_area | 0 | 1.00 | KAN-388 match: overture hiking_area |
| 4efc8ace7ee59da371f6f941 | A Cova do Lobisomem | A Cova do Lobisomem | overture hiking_area | 3 | 1.00 | KAN-388 match: overture hiking_area |
| 4f660cd4e4b09ff9bdf825c3 | Passadiço Ambiental Do Gameiro | Passadiço Ambiental do Gameiro | overture hiking_area | 2 | 1.00 | KAN-388 match: overture hiking_area |
| 50229f1fe4b0f1c4845d39d0 | Trilho da Cascata Ribeira do Rosal | Trilho da Cascata Ribeira do Rosal | overture hiking_area | 3 | 1.00 | KAN-388 match: overture hiking_area |
| 51691b66e4b0fc9f2d07cf0a | leonte | leonte | overture hiking_area | 2 | 1.00 | KAN-388 match: overture hiking_area |
| 517114a8e4b081c3bab18d01 | Mata da Nossa Senhora do Castelo | Mata da Nossa Senhora do Castelo | overture hiking_area | 0 | 1.00 | KAN-388 match: overture hiking_area |
| 519258e2498ea8029d32db37 | Escadas do Barredo | Escadas do Barredo | overture historical_landmark | 24 | 1.00 | KAN-388 match: overture historical_landmark |
| 51990409498e47b466cbbd72 | Lagoa das Furnas Trail | Lagoa das Furnas - All Around Trail | overture hiking_area | 3 | 0.80 | KAN-388 match: overture hiking_area |
| 51d407dc498e003d2a9c114a | Promenade Funchal - Câmara de Lobos | Promenade Funchal - Câmara de Lobos | overture hiking_area | 4 | 1.00 | KAN-388 match: overture hiking_area |
| 5207720811d2fe4488ce387a | Passadiço das Sete Cidades | Passadiço das Sete Cidades | overture hiking_area | 0 | 1.00 | KAN-388 match: overture hiking_area |
| 521864d011d2bc4357ba0b4c | Barrocal | Parque do Barrocal | overture park | 4 | 0.90 | KAN-388 match: overture park |
| 521e142b498e02f1955e72e4 | Reserva natural da Lagoa de Sto.  André e Sancha | Reserva natural da Lagoa de Sto. André e Sancha | overture hiking_area | 3 | 1.00 | KAN-388 match: overture hiking_area |
| 5239b7ac11d2ab476410f6b6 | Trilho Castrejo | Trilho Castrejo | overture hiking_area | 2 | 1.00 | KAN-388 match: overture hiking_area |
| 53243eb9498ed923ef162457 | Cascata do Barbelote | Cascata do Barbelote | overture nature_preserve | 75 | 1.00 | KAN-388 match: overture nature_preserve |
| 5350ec41498edf1b0f3ad8bc | lalim | Sociedade Filarmónica de Lalim | overture cultural_center | 50 | 0.90 | KAN-388 match: overture cultural_center |
| 5356f2a2498e265aa8500761 | III Trail Viver Pereira | III Trail Viver Pereira | overture hiking_area | 3 | 1.00 | KAN-388 match: overture hiking_area |
| 536e5d68498ef9317d6eeadd | Trilho Das Cascatas | Trilho das Cascatas | overture hiking_area | 0 | 1.00 | KAN-388 match: overture hiking_area |
| 558b117e498ed500ec0431e6 | Minas dos Carris | Minas dos Carris | overture nature_preserve | 30 | 1.00 | KAN-388 match: overture nature_preserve |
| 57a61b1c498ebb2200d14e41 | Trilho Ponte De Nosso Senhor | Trilho Ponte de Nosso Senhor | overture hiking_area | 26 | 1.00 | KAN-388 match: overture hiking_area |
| 59aed9a4febf314589db508a | TVD PR4 - Rota do Castro do Zambujal | TVD PR4 - Rota do Castro do Zambujal | overture hiking_area | 0 | 1.00 | KAN-388 match: overture hiking_area |
| 59cd2450efa82a74516dc54e | Escadas do Caminho Novo | Escada do Caminho Novo | overture historical_landmark | 30 | 0.98 | KAN-388 match: overture historical_landmark |
| 5aca27f260d11b0132a3a56d | Serra Devassa Trail | Serra Devassa Trail | overture hiking_area | 3 | 1.00 | KAN-388 match: overture hiking_area |
| 5b9bd7bc5455b20039858536 | Aqueduto do Carvão | Aqueduto do Carvão | overture hiking_area | 27 | 1.00 | KAN-388 match: overture hiking_area |
| 5cdebf90646e3800393a2421 | PR1.2 Vereda do Pico Ruivo | PR1.2 Vereda do Pico Ruivo | overture hiking_area | 1 | 1.00 | KAN-388 match: overture hiking_area |

#### Unique — sample of 30 of 415

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4c35a83eed37a5936cce7003 | Lisboa Camping | Lisboa | Landmarks and Outdoors > Campground | no served counterpart within 400 m |
| 4d2871ae342d6dcbc256f8ca | Risco |  | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 4e315e3f88775a302cf49fdb | Levada Castelejo |  | Landmarks and Outdoors > Canal | no served counterpart within 400 m |
| 4e4b8ef1b61c745d8af0bac5 | PR18 Levada do Rei | Quebradas | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 4e5a54aa7d8b966a15d47ff5 | Ecopista Valença Monçao | Valença | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 4fcd0c73e4b093c385c51b73 | Treino Lunar |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 508df6d7e4b086e59b0e9720 | Camminho Pedestre |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 50a8fecbe4b0034096fa82c6 | Tunel de S. Martinho |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 52020d1c498e097cf309e1ac | Caminho do Poço das Alagoínhas |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 5332ca91498e23ff6c58c744 | perdido na geira | Terras De Bouro | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 5361213e498e9238b56fbd99 | Percurso do Castelo de Aboim da Nobrega |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 53de23a2498e3083a4d10edf | Caminho da Fajã Grande à Fajãzinha |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 56df0e20498e58891ca2715e | Ciclovia |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 578f283f498e1f07b897e0e2 | Tussen de kurkbomen en de koeien |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 595533246e465061c4322fb2 | PTM PR1 - A Rocha Delicada | Mexilhoeira Grande | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 595637b92e26800edbb016e5 | PR1.3 Vereda da Encumeada | Curral das Freiras | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 59aedb01d8fe7a0d13db884c | Grande Rota das Linhas de Torres - Forte de S. Vicente | Torres Vedras | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 5af33e82bfc6d0002cbabee9 | SNT PR5 - Quintas | Sintra | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 5afef0ab628c83002ce27fc5 | GVA PR3 - Rota dos Penedos Mouros | Nespereira | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 5b84682b97cf5a002c294591 | The cliff walk from oura beach all the way to the old town | Albufeira | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 5cba02266e465000398ffa77 | Passadiços do Sistelo | Álvora | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 610ff924eb517629e3a4459f | Cavalum Trail |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 63c96c8ef99a0045dc070e53 | pr6.2 | Calheta | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 644545c470fb514c04c2a75e | Miradouro Trilho João Azinheiro |  | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 645be240b441a536cbb3e64f | Rua De São Francisco De Borja | Porto | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 645fcb85c3ea987a1a506b34 | Caminho Da Oliveirinha | Ponte de Lima | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 653f86fa647cf66b4e8c15e9 | Ponta Da Piedade Walkway Entry | Lagos | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 65ad043023b98453fe8286db | Escarpa das Fontainhas | Porto | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 65f5cc7f74656a3b1685fdd5 | Passadiços da Ribeira do Espírito Santo | Arcozelo | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 680cdbddcad9200c258c1ab7 | Passadiças Das Escarpas Do Corgo | Vila Real | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |

#### Suspect — sample of 30 of 67

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4c31ef107cc0c9b62b71ef9a | Praia da Ursa | Praia da Ursa | overture beach | 83 | 1.00 | same name beyond the matcher radius: overture beach at 83 m |
| 4c5c4d0b2815c92881a6b167 | Caldeira Velha | Caldeira velha | overture nature_preserve | 109 | 1.00 | same name beyond the matcher radius: overture nature_preserve at 109 m |
| 4d29cf0cc406721e2f557eb6 | Paradela - Ecopista | Paradela eco café | overture cafe | 60 | 0.76 | same name as a served place of another kind: overture cafe at 60 m |
| 4d31c306c6cba35de7451a7a | Monsanto | Monsanto Village Portugal | overture historical_landmark | 159 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 159 m |
| 4d321ea4d585a0902b4ca4cd | Promenade do Porto Santo | Praia do Porto Santo | overture beach | 158 | 0.82 | same name beyond the matcher radius: overture beach at 158 m |
| 4e31b32622719b7d2719f546 | Pedra da Mua | Monumento Natural da Pedra da Mua | overture historical_landmark | 82 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 82 m |
| 4e8c9a90722e0db2303175b2 | Regoufe | Regoufe | overture historical_landmark | 374 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 374 m |
| 4fd8c56ce4b0eb57b471db76 | Caminho dos Pastorinhos | Vila Dos 3 Pastorinhos | overture church | 339 | 0.76 | same name beyond the matcher radius: overture church at 339 m |
| 50296deae4b0888d1667da48 | Marginal da Torreira | Marina da Torreira | overture marina | 340 | 0.95 | same name beyond the matcher radius: overture marina at 340 m |
| 504758d7e4b0aa9a7090247c | Chafé | Farmácia de Chafé | overture pharmacy | 283 | 0.90 | same name beyond the matcher radius: overture pharmacy at 283 m |
| 50670aede4b029655bdc62ef | Escada dos Guindais | Tasquinha dos Guindais | overture restaurant | 28 | 0.73 | same name as a served place of another kind: overture restaurant at 28 m |
| 51291f74e4b0e836edb4ed4c | Run Sintra | Regional Sintra | overture restaurant | 374 | 0.72 | same name beyond the matcher radius: overture restaurant at 374 m |
| 51ded139498e304400b1f86b | Levada Velha | Levada Velha | overture hiking_area | 189 | 1.00 | no name signal (only type words) |
| 5218c90211d2b4b463c0173d | Trilho Serra devassa |  |  |  |  | coordinates shared with 2 other archive row(s) |
| 5218ca4d11d2c8ab91469090 | Trilho Mata Do Canário |  |  |  |  | coordinates shared with 2 other archive row(s) |
| 5231ddde498ef98d28bb2341 | Pia Do urso | Pia do Urso | overture nature_preserve | 113 | 1.00 | same name beyond the matcher radius: overture nature_preserve at 113 m |
| 52502d8f498e146fc03c43ad | Um De Nós |  |  |  |  | no name signal (only type words) |
| 539daad9498ed490cdf2049d | Faial da Terra | Clube Desportivo do Faial da Terra | overture cafe | 195 | 0.90 | same name beyond the matcher radius: overture cafe at 195 m |
| 540af957498e05abd2ce62a9 | LGA PR1 - Sete Vales Suspensos | LGA PR1 - Sete Vales Suspensos | overture hiking_area | 352 | 1.00 | same name beyond the matcher radius: overture hiking_area at 352 m |
| 55e9fad5498e5724103f1d83 | Eco Caminho | Eco Caminho | overture hiking_area | 249 | 1.00 | same name beyond the matcher radius: overture hiking_area at 249 m |
| 5647bf7f498e15acb49e7f51 | Escadas da Vitória | Escadas das verdades | overture hiking_area | 376 | 0.74 | same name beyond the matcher radius: overture hiking_area at 376 m |
| 5b93e47ae1f228002cdfe916 | Passadiços de Alvor (Ao Sabor da Maré) | Passadiços de Alvor | overture hiking_area | 244 | 0.90 | same name beyond the matcher radius: overture hiking_area at 244 m |
| 5cc3308159c423002ccb4761 | Caminhos do Lagoas Park | Jardim do Lagoas Park | overture park | 226 | 0.77 | same name beyond the matcher radius: overture park at 226 m |
| 5f2c0c9b907b4716093b0411 | Levada |  |  |  |  | no name signal (only type words) |
| 5f2c285835e0cf22a5774b11 | Levada |  |  |  |  | no name signal (only type words) |
| 5f72d4bc727d78778ca49b0a | Miradura da Falesia | Praia da Falésia | overture beach | 346 | 0.80 | same name beyond the matcher radius: overture beach at 346 m |
| 62a0edecad667926ba9af9c4 | Paredão da Costa de Caparica | Praia da Costa da Caparica | overture beach | 380 | 0.85 | same name beyond the matcher radius: overture beach at 380 m |
| 6606d78f6b570b6db57a1eec | Passadiços Do Pereiro |  |  |  |  | archive twin within 20 m: 6606d74d57de177eae640068 |
| 67bb284b24864a448153cd15 | Levada Dos Ilhéus |  |  |  |  | no name signal (only type words) |
| 6a520c98ab33386ede6d5f0f | Levada Nova |  |  |  |  | no name signal (only type words) |

### `plaza` — 1,132 rows

Matched against: overture plaza 286, overture historical_landmark 55, overture church 18, overture park 11, overture museum 4, overture beach 2, overture art_gallery 1, overture botanical_garden 1.

Suspect because: same name beyond the matcher radius 109, same name as a served place of another kind 51, no name signal 18, coordinates shared with 1 other archive row(s) 15, coordinates shared with 2 other archive row(s) 3, archive twin within 20 m 3.

Same name beyond the matcher radius, by served type: overture plaza 45, overture historical_landmark 15, overture restaurant 9, overture school 4, overture cafe 4, overture church 4, overture gas 3, overture museum 3, overture supermarket 3, overture beach 2, overture bar 2, overture pharmacy 2, overture bus 1, overture cemetery 1, overture bank 1, overture store 1, overture movie_theater 1, overture library 1, overture casino 1, overture financial_service 1, overture cultural_center 1, overture bakery 1, overture park 1, overture veterinary_care 1, overture music_venue 1.

Same name as a served place of another kind, by served type: overture restaurant 17, overture cafe 10, overture store 5, overture school 4, overture bar 3, overture bank 2, overture supermarket 2, overture butcher 2, overture pharmacy 2, overture gym 2, overture bus 1, overture tea 1.

#### Already served (matched) — sample of 30 of 378

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b641830f964a520bd9e2ae3 | Largo de São Gonçalinho | Capela de São Gonçalinho | overture church | 25 | 0.85 | KAN-388 match: overture church |
| 4bb89274b35776b0b800c901 | Passeio Infante Dom Henrique | Passeio Infante Dom Henrique | overture plaza | 4 | 1.00 | KAN-388 match: overture plaza |
| 4c851f782f1c236aa99e5143 | Praça Dr. Francisco Sá Carneiro (Praça Velasquez) | Praça Velasquez | overture plaza | 13 | 0.90 | KAN-388 match: overture plaza |
| 4ca5fc457334236a59211b58 | Meia Lua | Meia-Lua | overture plaza | 13 | 1.00 | KAN-388 match: overture plaza |
| 4cb981f3dd41a35dc807e2a0 | Praça De Santa Iria | Praça De Santa Iria | overture plaza | 36 | 1.00 | KAN-388 match: overture plaza |
| 4ceec22362ef6dcb1ea7fa59 | Praça de D. João I | Praça Dom João I | overture historical_landmark | 1 | 0.85 | KAN-388 match: overture historical_landmark |
| 4d9cbe4183f36ea8b58ca894 | Largo do Souto | Largo do Souto | overture park | 0 | 1.00 | KAN-388 match: overture park |
| 4def7aaa7d8bb02cbefa9271 | Praça Marquês De Marialva | Praça Marquês De Marialva | overture plaza | 4 | 1.00 | KAN-388 match: overture plaza |
| 4e0ae10d45ddb226bd89ae63 | Rotunda do Freixo | Rotunda do Freixo | overture plaza | 0 | 1.00 | KAN-388 match: overture plaza |
| 4e8a09ab550321f42ec09a11 | Largo do Barão de Quintela | Largo do Barão de Quintela | overture plaza | 15 | 1.00 | KAN-388 match: overture plaza |
| 4f2a4bfde4b0d077549c427d | Largo de Alvide | Largo de Alvide | overture plaza | 0 | 1.00 | KAN-388 match: overture plaza |
| 4f44db96e4b006c94be546ac | Largo do Laranjal | Largo do Laranjal | overture plaza | 0 | 1.00 | KAN-388 match: overture plaza |
| 4f770a11e4b0294fd3b5e00d | Largo Dom Dinis | Largo Dom Dinis | overture plaza | 0 | 1.00 | KAN-388 match: overture plaza |
| 4fdf58b1e4b0e598b70d1b96 | Largo Eirós | Largo Eirós | overture plaza | 0 | 1.00 | KAN-388 match: overture plaza |
| 4ff73139e4b024f559eccd64 | Praça das Cardosas | Praça das Cardosas | overture plaza | 7 | 1.00 | KAN-388 match: overture plaza |
| 502c148fe4b0761d92b9220d | Largo Dos Navegantes | Largo dos Navegantes | overture plaza | 0 | 1.00 | KAN-388 match: overture plaza |
| 50380cb3e4b00554dde4b32e | Praça da República | Praça da República | overture plaza | 51 | 1.00 | KAN-388 match: overture plaza |
| 508697c3e4b016e352c3dcf6 | Praça de Lisboa | Praça de Lisboa | overture plaza | 4 | 1.00 | KAN-388 match: overture plaza |
| 50e9dd06c84c5561ef4da396 | Largo D. Gualdim Pais | Largo D. Gualdim Pais | overture plaza | 3 | 1.00 | KAN-388 match: overture plaza |
| 511d6181e4b02ff4e8445fd8 | Cruz da Pedra | Cruz da Pedra | overture plaza | 2 | 1.00 | KAN-388 match: overture plaza |
| 514f120be4b0404032f62182 | Largo da Luz | Largo da Luz | overture church | 51 | 1.00 | KAN-388 match: overture church |
| 51613727498ea7a80507e679 | Praça Guilhermina Suggia | Praça Guilhermina Suggia | overture plaza | 51 | 1.00 | KAN-388 match: overture plaza |
| 5221f49811d2d4b0d497797e | Praça Almada Negreiros | Praça Almada Negreiros | overture plaza | 2 | 1.00 | KAN-388 match: overture plaza |
| 54637376498e7ab0f0851437 | Praça da Portagem | Praça da Portagem | overture plaza | 13 | 1.00 | KAN-388 match: overture plaza |
| 57881711498e97f50e209619 | Largo do Colégio | Igreja do Colégio | overture historical_landmark | 27 | 0.73 | KAN-388 match: overture historical_landmark |
| 5a91d1b4d1a40270d1200019 | Largo Dr. Tito Fontes | Largo Dr. Tito Fontes | overture plaza | 15 | 1.00 | KAN-388 match: overture plaza |
| 5b8c2f56491be700399332b4 | Praça Jacob Rodrigues Pereira | Praça Jacob Rodrigues Pereira | overture plaza | 4 | 1.00 | KAN-388 match: overture plaza |
| 5d5005fa0a529f0008558857 | Largo do Corpo Santo | Casa do Corpo Santo | overture museum | 9 | 0.82 | KAN-388 match: overture museum |
| 5fbdd5ddd7afd00db058fca7 | Praça da Portela | Praça da Portela | overture plaza | 12 | 1.00 | KAN-388 match: overture plaza |
| 63b2e23927911461214f1ecc | Largo De Misericordia | Igreja da Misericórdia | overture church | 65 | 0.74 | KAN-388 match: overture church |

#### Unique — sample of 30 of 555

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4c597ebf7b049521abea881f | Praça Parque Itália | Porto | Travel and Transportation > Parking | no served counterpart within 400 m |
| 4d2db2772afa5941fd721bb3 | Praça 5 de Outubro | Torres Novas | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4d321fc6d585a090be4ca4cd | Largo das Palmeiras | Porto Santo | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4d51ddb0dcce224b8b8fe61b | Praceta Manuel Ma Barbosa Du Bocage |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4e314b0bc65b93ca1a42be4a | Largo de São Sebastião da Pedreira | Lisboa | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4e465e22aeb70e74f492b38b | Praça Professor Egas Moniz | Ferreira do Zêzere Municipalit | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4e57eff0887710a8481db826 | Pátio Júlio Simões | Loures | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4e75207d483b0cf5ec9df0d9 | Adro Da Igreja |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4f65fa46e4b02cbb80668449 | Rua Gil Eanes | Porto | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 4f8aa19be4b0af04c19ad3ff | Largo Dr. Cunha Reis | Vila do Conde | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 5036165de4b074a234daabf6 | Agua Reves |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 504b4c48f1369314305fc232 | Largo Coronel Baptista Coelho | Santo Tirso | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 51d0265e498ebe6bf556dddc | Estátua Sra das Seixas |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 52172bc011d219e53fe9499c | Largo Artur Barreto |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 5218be1811d2a6c2de98b48c | Travessa do Mascarenhas |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 521e754d498e40831882e870 | Praça 24 de junho |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 55ce19d3498e87a836004877 | portas da cidade |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 55e23797498e6ef8dc742a47 | Largo da Carvalhosa |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 56997ef5498ebc18ba42072d | Praceta de Moçamedes |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 56e43ef1498e40af971182e1 | Largo da Igreja | Mosteiros | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 5718c535498e932745f8727a | Largo Manuel Emídio da Silva |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 5798e73d498edb20b67ce931 | rotunda do barco |  | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 5d27636006e5220030142c62 | Praça Sérgio Vieira de Mello | Porto Salvo | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 5d4eb05b29474e00083bfb66 | Rotunda das Sardinhas | Setúbal | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 5e1f18c2477b080007c71087 | Praça Da República - Benavente | Benavente | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 6308458b8b23eb7bd9b11bcd | Plaza Del Comercio Lisboa Portugal | Lisboa | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 64611848cbed0f3da657cf59 | Praça Do Mercado | Aveiro | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 65f45466032a6522311f5af6 | Praça Patrão Joaquim Lopes | Olhão | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 694fb31cc058231ac2b91359 | Largo Palmira Milheiro | Porto | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |
| 69f9b42f4bcb5f20c163077c | Praceta Da Primavera | Setúbal | Landmarks and Outdoors > Plaza | no served counterpart within 400 m |

#### Suspect — sample of 30 of 199

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b804cf6f964a520d46530e3 | Largo de S. Francisco | Jardim do Largo de São Francisco | overture plaza | 210 | 0.77 | same name beyond the matcher radius: overture plaza at 210 m |
| 4ba2c10df964a5205e1638e3 | Casa da Guia | Paladar da Guia | overture restaurant | 52 | 0.74 | same name as a served place of another kind: overture restaurant at 52 m |
| 4c6b39db9669e21e5ebdaa51 | Sete Rios | Terminal Rodoviario de Sete Rios | overture bus | 106 | 0.90 | same name beyond the matcher radius: overture bus at 106 m |
| 4c7e4a75b7fbef3b87db3a14 | Largo da Boa-Hora à Ajuda | A Funerária da Boa-Hora e Ajuda | overture cemetery | 79 | 0.75 | same name beyond the matcher radius: overture cemetery at 79 m |
| 4c8fe722b6d1a1430132bf0f | Largo do Passeio Alegre | Passeio Alegre | overture beach | 168 | 0.90 | same name beyond the matcher radius: overture beach at 168 m |
| 4c9e298b8afca0932de8fd15 | Praça Guilherme Gomes Fernandes | Praca 63 | overture restaurant | 16 | 0.72 | same name as a served place of another kind: overture restaurant at 16 m |
| 4d7e6557f635236a97146716 | Lg. Raphael Bordallo Pinheiro | Museu Bordalo Pinheiro | overture museum | 344 | 0.72 | same name beyond the matcher radius: overture museum at 344 m |
| 4df6732fb0fba21ee54c1e35 | Largo da Paz | Largo da Paz | overture plaza | 298 | 1.00 | coordinates shared with 1 other archive row(s) |
| 4e202e30ae6015b212983264 | Terreiro da Sé | Terreiro | overture restaurant | 326 | 0.90 | same name beyond the matcher radius: overture restaurant at 326 m |
| 4eb59b5de5fa17fc86daa8f0 | Portas Fronhas | Portas Fronhas | overture plaza | 147 | 1.00 | same name beyond the matcher radius: overture plaza at 147 m |
| 4f57436de4b0be1ce2f6a673 | Rossio | Rossio Megastore Sapataria | overture store | 22 | 0.90 | no name signal (only type words) |
| 4f5b57eee4b053fd67966f36 | Largo de São João Nepomuceno | Largo de São João Nepomuceno | overture plaza | 346 | 1.00 | same name beyond the matcher radius: overture plaza at 346 m |
| 4f7eb26fe4b0d9edea700b34 | Pessegueiro do Vouga | Igreja Paroquial de Pessegueiro do Vouga | overture church | 129 | 0.90 | same name beyond the matcher radius: overture church at 129 m |
| 4fc7af08e4b057f64a708804 | Largo dos Loios | Largo do Limoeiro | overture plaza | 179 | 0.81 | same name beyond the matcher radius: overture plaza at 179 m |
| 4fce7c39e4b0e42eec80cb85 | Praça 25 de Abril | Praça 25 De Abril Alcobaça | overture plaza | 105 | 0.90 | same name beyond the matcher radius: overture plaza at 105 m |
| 501122bbe4b06fc7cdb40800 | Largo dos Laranjais | Largo Do Laranjais | overture plaza | 252 | 0.90 | same name beyond the matcher radius: overture plaza at 252 m |
| 50281d29e4b0db2acb2faeb8 | Praça de Goa | Praça De Goa | overture bakery | 184 | 1.00 | same name beyond the matcher radius: overture bakery at 184 m |
| 503d5bd5e4b08a07264333ea | Mercês | Igreja Paroquial das Mercês | overture church | 140 | 0.90 | same name beyond the matcher radius: overture church at 140 m |
| 508e582ae4b01167ec4a2810 | Arquinho | Farmácia do Arquinho | overture pharmacy | 98 | 0.90 | same name beyond the matcher radius: overture pharmacy at 98 m |
| 50a3c3dfe4b0da0c1ea6dc04 | Flamenga | Flamvet - Clinica Veterinaria da Flamenga | overture veterinary_care | 172 | 0.90 | same name beyond the matcher radius: overture veterinary_care at 172 m |
| 50d7be25e4b07954410d04db | Largo da Feira |  |  |  |  | coordinates shared with 2 other archive row(s) |
| 510a738fe4b022878c7a4304 | Praça Viscondessa dos Olivais | Praça Viscondessa dos Olivais | overture plaza | 130 | 1.00 | same name beyond the matcher radius: overture plaza at 130 m |
| 51b0ea3f498e6599c0f32564 | Largo de São Miguel | Largo de São Martinho | overture historical_landmark | 187 | 0.75 | same name beyond the matcher radius: overture historical_landmark at 187 m |
| 53402911498e9a1a61a53b59 | Largo da Alfândega | Gare da Alfandega | overture restaurant | 63 | 0.86 | same name as a served place of another kind: overture restaurant at 63 m |
| 544691ec498eb09091d9a50c | Praça da República |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 5567aa9f498e74fae657a5bd | Praça do Coreto | Praça | overture cafe | 223 | 0.90 | same name beyond the matcher radius: overture cafe at 223 m |
| 5ccec05825ecca002c46d5ac | Praca do Povo | Praça do Povo | overture plaza | 76 | 1.00 | same name beyond the matcher radius: overture plaza at 76 m |
| 5d7d12ef16a27b0008981120 | Rotunda Nossa Senhora dos Remédios | Paróquia de Nossa Senhora dos Remédios | overture church | 189 | 0.86 | same name beyond the matcher radius: overture church at 189 m |
| 60f4720245ca6e6886869a3e | Largo do Picadeiro | Largo do Carmo | overture historical_landmark | 342 | 0.81 | same name beyond the matcher radius: overture historical_landmark at 342 m |
| 6528852c56a8bc2362cf88e1 | Praça Do Emigrante | Praça do Emigrante | overture plaza | 92 | 1.00 | same name beyond the matcher radius: overture plaza at 92 m |

### `botanical_garden` — 34 rows

Matched against: overture botanical_garden 7, overture historical_landmark 2, overture park 1, overture art_gallery 1.

Suspect because: same name beyond the matcher radius 4, same name as a served place of another kind 2, no name signal 1.

Same name beyond the matcher radius, by served type: overture botanical_garden 2, overture plaza 1, overture historical_landmark 1.

Same name as a served place of another kind, by served type: overture store 2.

#### Already served (matched) — sample of 11 of 11

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4c30c67e09a99c7463250b2a | Jardim do Cerco | Jardim do Cerco | overture park | 37 | 1.00 | KAN-388 match: overture park |
| 4c8b582be51e6dcb8e7671de | Jardim Botânico da Ajuda | Jardim Botânico da Ajuda | overture botanical_garden | 43 | 1.00 | KAN-388 match: overture botanical_garden |
| 4d85ec61f1e56ea8c148938a | Jardim Botânico de Madeira | Jardim Botânico de Madeira | overture botanical_garden | 0 | 1.00 | KAN-388 match: overture botanical_garden |
| 53501a52498edc226ed29d98 | Jardim botânico | Covilhã, Jardim Botânico | overture botanical_garden | 15 | 0.90 | KAN-388 match: overture botanical_garden |
| 560fdfa8498ebe207a6f6818 | Estufa Fria de Massamá | Estufa Fria de Massamá | overture botanical_garden | 3 | 1.00 | KAN-388 match: overture botanical_garden |
| 599eeabea22db7126299b2e0 | Jardim Botânico De Queluz | Jardim Botânico de Queluz | overture botanical_garden | 0 | 1.00 | KAN-388 match: overture botanical_garden |
| 5b30ec46f5e9d7002c4a521b | Garden Palacio Nacional de Sintra | Palácio Nacional de Sintra | overture historical_landmark | 31 | 0.90 | KAN-388 match: overture historical_landmark |
| 5b81acca01bc5a002c9bb5ec | Mata-Jardim José do Canto | Mata Jardim José do Canto | overture botanical_garden | 15 | 1.00 | KAN-388 match: overture botanical_garden |
| 5e43eca0e2da4a0008958208 | Grená Parque | Grená Parque | overture botanical_garden | 3 | 1.00 | KAN-388 match: overture botanical_garden |
| 68495f6aba854b2ddc6f540f | Jardim Do Miradouro Ponta Do Sossego | Miradouro da Ponta do Sossego | overture historical_landmark | 60 | 0.80 | KAN-388 match: overture historical_landmark |
| 69209d65cb863575ffcf667e | Jardim da Quinta das Cruzes | Museu Quinta das Cruzes | overture art_gallery | 50 | 0.76 | KAN-388 match: overture art_gallery |

#### Unique — sample of 16 of 16

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4bd60d759649ce7223d6511d | Quinta Splendida Wellness & Botanical Garden Hotel | Canico | Travel and Transportation > Lodging > Hotel | no served counterpart within 400 m |
| 532f644d498e3577d9b4dc84 | salmadeira | Lisboa | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 53dcf617498efb390498581b | Quinta Do Mangueiral |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 53fb4478498e8bbd72eba48c | Pólo-ecológico dos Bombeiros Voluntários |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 546b2cee498e769bed632990 | Reserva Botânica de Cambarinho |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 54700d03498e96a8900c0d02 | motoclube dogsland |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 55cb08af498e7a3a980118e9 | Our beautiful garden |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 5756f7ed498e24587cfe223f | Quevedo Port Wine - Quinta Vale d'Agodinho |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 57839d9ecd1018ed2a503055 | Ribeira do Guilherme |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 58c3e8965804ea5c14522406 | Horto Municipal do Porto |  | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 5d36b898e5768900072a3730 | A Horta | Arcos de Valdevez | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 60e5c9e0d336720ed204c667 | Jardim das Plantas Indígenas da Madeira | São Vicente | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 66ba2c514a9755191a492dac | Jardim Clássico | Coimbra | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 66ba2cfed47fc334ceb43ed0 | Estufa Tropical | Coimbra | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 67f7b6c1a6d79a04f32176de | Jardim Botânico Da Ribeira Do Guilherme | Nordeste | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |
| 69c3dfb768137b7b068052bc | Estufa Fria | Коимбра | Landmarks and Outdoors > Botanical Garden | no served counterpart within 400 m |

#### Suspect — sample of 7 of 7

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b0588a2f964a5200ad122e3 | Jardim Botânico | Jardim Botânico da Universidade de Lisboa | overture botanical_garden | 115 | 0.90 | no name signal (only type words) |
| 4c1e013bb306c928846166b7 | Jardim Botânico de Coimbra | Jardim Botânico da Universidade de Coimbra | overture botanical_garden | 240 | 0.76 | same name beyond the matcher radius: overture botanical_garden at 240 m |
| 4c94aa1238dd8cfaafdcca62 | Jardim Botânico Tropical | Jardim Botânico Tropical | overture botanical_garden | 158 | 1.00 | same name beyond the matcher radius: overture botanical_garden at 158 m |
| 55360a1b498ef72a26605078 | Praça 9 De Abril | Praça de Nove de Abril | overture plaza | 297 | 0.79 | same name beyond the matcher radius: overture plaza at 297 m |
| 58c2e934dad26331b8fe7f61 | Agrijardim | Agrijardim - Viveiro e Centro de Jardinagem | overture store | 34 | 0.90 | same name as a served place of another kind: overture store at 34 m |
| 613a51025bb4517acdded8e2 | Porto Bonsai | Porto Bonsai | overture store | 7 | 1.00 | same name as a served place of another kind: overture store at 7 m |
| 6863fe853d6e8317cc0c8312 | Jardim Da Ponta Da Madrugada | Miradouro da Ponta da Madrugada | overture historical_landmark | 94 | 0.81 | same name beyond the matcher radius: overture historical_landmark at 94 m |

### `bridge` — 355 rows

Matched against: overture bridge 75, overture historical_landmark 13, overture lake 2, overture river 1, overture hiking_area 1.

Suspect because: same name beyond the matcher radius 39, no name signal 13, coordinates shared with 1 other archive row(s) 4, same name as a served place of another kind 3, coordinates shared with 2 other archive row(s) 1.

Same name beyond the matcher radius, by served type: overture bridge 21, overture church 4, overture historical_landmark 4, overture museum 2, overture beach 2, overture school 1, overture park 1, overture pharmacy 1, overture supermarket 1, overture art_gallery 1, overture bus 1.

Same name as a served place of another kind, by served type: overture restaurant 2, overture cafe 1.

#### Already served (matched) — sample of 30 of 92

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b98bea8f964a520d04d35e3 | Viaduto Duarte Pacheco | Viaduto Duarte Pacheco | overture bridge | 21 | 1.00 | KAN-388 match: overture bridge |
| 4ba12230f964a5200d9b37e3 | Ponte Velha do Rio Lima | Ponte Velha do Rio Lima | overture bridge | 0 | 1.00 | KAN-388 match: overture bridge |
| 4bf2637e55c7c9b6d4096204 | Ponte de Mosteirô | Ponte de Mosteirô | overture bridge | 63 | 1.00 | KAN-388 match: overture bridge |
| 4c9b6dff80958cfa575f4bd4 | Ponte da Varela | Ponte da Varela | overture bridge | 3 | 1.00 | KAN-388 match: overture bridge |
| 4cc2c63c7ed8ef3b217112a0 | Ponte Euro 2004 | Ponte Euro 2004 | overture bridge | 4 | 1.00 | KAN-388 match: overture bridge |
| 4d49fa6548a06dcb7da175a2 | Ponte São João | Ponte de São João | overture bridge | 49 | 0.90 | KAN-388 match: overture bridge |
| 4da1e9157ccc816ee8ec5c7b | Ponte De Pedra | Ponte de Pedra | overture bridge | 3 | 1.00 | KAN-388 match: overture bridge |
| 4e54d6656284ed0e1c19b116 | Ponte da Ribeira dos Milagres | Ponte da Ribeira dos Milagres | overture bridge | 2 | 1.00 | KAN-388 match: overture bridge |
| 4e91ce828b81c6df6633c385 | Ponte De Mizarela | Ponte De Mizarela | overture bridge | 2 | 1.00 | KAN-388 match: overture bridge |
| 4ea04b935503d0070b161ce9 | Ponte da Lagoncinha | Ponte de Lagoncinha | overture bridge | 68 | 0.90 | KAN-388 match: overture bridge |
| 4f5a30dee4b0b310dee1ae6c | Caldeira da Moita | Caldeira da Moita | overture bridge | 0 | 1.00 | KAN-388 match: overture bridge |
| 50116ccae4b06b8dcaebf9ea | porta do soar | Porta do Soar | overture historical_landmark | 26 | 1.00 | KAN-388 match: overture historical_landmark |
| 5038e1d4e4b00c877acbbe75 | Açude Do furadoro | Açude do furadoro | overture bridge | 2 | 1.00 | KAN-388 match: overture bridge |
| 503a20a1e4b0ef4fd2b52e1c | Ponte do Ervedal | Ponte de Ervedal | overture bridge | 69 | 0.90 | KAN-388 match: overture bridge |
| 5047a575e4b04515207347b2 | Ponte Romana de Alvarenga | Ponte rodoviária de Alvarenga | overture bridge | 14 | 0.85 | KAN-388 match: overture bridge |
| 50c72ad8e4b0916ff8ddf283 | Ponte do Bairro dos Anjos | Ponte do Bairro dos Anjos | overture bridge | 0 | 1.00 | KAN-388 match: overture bridge |
| 5141d0b5e4b01f9f608b8c51 | Ponte Rio Tua | Ponte Rio Tua | overture bridge | 3 | 1.00 | KAN-388 match: overture bridge |
| 51f8f0d1498e905501141b48 | Ponte Nova | Ponte Nova | overture bridge | 3 | 1.00 | KAN-388 match: overture bridge |
| 51fa70c5498e840a1ef24335 | Ponte Nova | Ponte Nova | overture bridge | 2 | 1.00 | KAN-388 match: overture bridge |
| 521ce06511d26750ecfccd1b | Ponte da Ferradosa | Ponte da Ferradosa | overture bridge | 14 | 1.00 | KAN-388 match: overture bridge |
| 52d6d142498e4862eb86fb4e | barragem do sordo | Barragem do Sordo | overture lake | 53 | 1.00 | KAN-388 match: overture lake |
| 52ee32dc11d27e6ce65597d7 | Ponte Românica de Gimonde | Ponte de Gimonde | overture bridge | 53 | 0.78 | KAN-388 match: overture bridge |
| 52f3c1b6498e29ae93e7387d | Ponte Marco de Canavezes | Ponte Marco de Canavezes | overture bridge | 3 | 1.00 | KAN-388 match: overture bridge |
| 5308e7b8498e90f74210362b | Ponte de D. Luís l | Ponte de D. Luís l | overture bridge | 0 | 1.00 | KAN-388 match: overture bridge |
| 5933fbd7724750442ff1bc18 | Ponte Pedonal (Ponte Metálica da Régua) | Ponte Metálica da Régua | overture bridge | 20 | 0.90 | KAN-388 match: overture bridge |
| 59a14d2d75cb8c77a81c03c2 | Ponte Das Tábuas | Ponte das Tábuas | overture historical_landmark | 5 | 1.00 | KAN-388 match: overture historical_landmark |
| 59b81b0728122f42d2557466 | Ponte De Aljezur | Ponte de Aljezur | overture bridge | 2 | 1.00 | KAN-388 match: overture bridge |
| 606890292abbae017bc4da32 | Ponte De Espindo | Ponte de Espindo | overture bridge | 50 | 1.00 | KAN-388 match: overture bridge |
| 60b8b7f9e1d4ff1de4f6882b | Ponte Romana De Dorna | Ponte de Dorna | overture bridge | 2 | 0.80 | KAN-388 match: overture bridge |
| 615842fa4adc9105eaa59149 | Ponte Gonçalo Ribeiro Telles | Ponte Gonçalo Ribeiro Telles | overture bridge | 2 | 1.00 | KAN-388 match: overture bridge |

#### Unique — sample of 30 of 203

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4b0588a2f964a5201dd122e3 | Ponte 25 de Abril | Lisboa | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 4c2e346de760c9b681324649 | Eixo Norte-Sul | Lisboa | Travel and Transportation > Road | no served counterpart within 400 m |
| 4e353c8a1838f85189a4107c | Ponte sobre o Rio Arda | Arouca | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 4e4fd88a2271a1bdc3e3b89b | Eolicas | Figueira da Foz | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 4e9023cf6da174e28e233599 | Ponte, Rio Zêzere | Ferreira do Zêzere | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 5006b83fe4b0a7faa62acfe0 | Ponte S. João |  | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 50f45c6be4b08c7d035ef3ae | Viaduto de Santa Apolónia | Lisboa | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 510fe8ece4b0bdbf0ea2710d | Ponte da Fraternidade |  | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 529222e6498ec4d4c6506c1a | Ponte do arco |  | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 55bfad96498e258482ea3607 | Polderado |  | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 56e9ab4acd10c13d8f6fd903 | Ponte De Esmojães |  | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 5777822a498e9a303d16e007 | Ponte Luís I, Porto, Portekiz | Porto,Portekiz | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 5af1b96964c8e1002c02c37e | Ponte São João | Aveiro | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 5ccd961d0d173f002c8c5c70 | Viaduto Pedonal dos Navegantes | Paço de Arcos | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 5de1849caf03f30008ab0c36 | Ponte da Linha Vermelha | Lisboa | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 5f2e87798fe8c0522195f903 | Ponte da Várzea Carreira | Vila de Rei | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 5fbce1c31c139a74d0dd3959 | Ponte Ferroviária de Tavira | Tavira | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 61f2d66f2ef44e2845045be5 | Quinta do Lago Bridge | Almancil | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 627d49c21f78e5235637b4b7 | Ponte Autoestradal A8 (Murteira) | Murteira | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 62b71979607df17f028572b0 | Ponte Maat | Lisboa | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 634167d69e16da5b5e256f22 | Ponte Miguel Torga | Canelas | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 64a9b0ef57485560e872601e | Ponte Fives-Lille De Caminha | Caminha | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 662bb85356ede324a36bfa6e | Ribeira De Terges E Cobres | Alcaria Ruiva | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 666c80bf0ddeef14e8465c15 | Ponte A8 - Alfeizerão | Alfeizerão | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 667fc125ba0a1d6b66be5f88 | Ponte Romana Da Pedreira | Cerdal | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 668d6a679c85337e843af460 | Passadiços do Távora | Vila da Ponte | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 6737224d9b8ce9222c5b4ace | Old Stone Bridge | São Vicente | Landmarks and Outdoors > Historic and Protected Site | no served counterpart within 400 m |
| 6737302e8ca41b15a30cb9b3 | Ponte Santa Marta | Cascais | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 68207e428ae0fb2e5e8674b5 | Ponte Cais Do Côjo | Aveiro | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |
| 693ec66a588de974d11f1505 | Ponte De Samuel | Pindelo | Landmarks and Outdoors > Bridge | no served counterpart within 400 m |

#### Suspect — sample of 30 of 60

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4bc068792a89ef3b2c75f088 | River View | River View | overture restaurant | 15 | 1.00 | same name as a served place of another kind: overture restaurant at 15 m |
| 4c5288f294790f476ff4d5a2 | Ponte do Freixo | Ponte do Freixo | overture bridge | 209 | 1.00 | same name beyond the matcher radius: overture bridge at 209 m |
| 4cfe46d9feec6dcb17f95636 | Ponte Velha |  |  |  |  | no name signal (only type words) |
| 4d5ffdb11496370425fede94 | Ponte de Arame | Ponte de Arame | overture bridge | 193 | 1.00 | same name beyond the matcher radius: overture bridge at 193 m |
| 4dac77520cb6a89c6297ce04 | Ponte das Três Entradas | EI. da Ponte das Três Entradas | overture school | 160 | 0.90 | same name beyond the matcher radius: overture school at 160 m |
| 4e63587d52b1260c13832dd9 | Ponte de D. Maria | Ponte D. Maria | overture bridge | 245 | 0.90 | same name beyond the matcher radius: overture bridge at 245 m |
| 4efcaa9693ad9a2798f2d8ca | Ponte Rainha Santa | Ponte Rainha Santa Isabel | overture bridge | 115 | 0.90 | same name beyond the matcher radius: overture bridge at 115 m |
| 4f311512e4b09c40b36adfd3 | Ponte do rio Leno |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 4fdc96b1e4b09473e17c2864 | Ponte de Fão | Ponte de Fão | overture bridge | 170 | 1.00 | coordinates shared with 1 other archive row(s) |
| 5033a086e4b09f23f12c280f | Ponte de Vila Nova de Milfontes | Ponte de Vila Nova de Milfontes | overture bridge | 159 | 1.00 | same name beyond the matcher radius: overture bridge at 159 m |
| 5079954ae4b08ed647931d92 | Ponte dos Arcos | Ponte dos Arcos | overture bridge | 205 | 1.00 | same name beyond the matcher radius: overture bridge at 205 m |
| 508dd29be4b07f1e6455d69a | Túnel da costa | Tunel da Costa | overture bridge | 110 | 1.00 | same name beyond the matcher radius: overture bridge at 110 m |
| 50c23732e4b0661cb380f7bf | Ponte dos Arcos | Ponte dos Arcos | overture bridge | 141 | 1.00 | same name beyond the matcher radius: overture bridge at 141 m |
| 50e1c65be4b00e617d12f3d1 | Viaduto |  |  |  |  | no name signal (only type words) |
| 510b318be4b03a1164e6344b | Ponte da Praia Fluvial |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 51d0bf2b498ea57f0018fe36 | Ponte da Carpinteira | Ponte da Carpinteira | overture bridge | 309 | 1.00 | same name beyond the matcher radius: overture bridge at 309 m |
| 51d2ee3e498e86dbe21d2365 | Ponte do Bico | Praia Fluvial Ponte do Bico | overture beach | 142 | 0.90 | same name beyond the matcher radius: overture beach at 142 m |
| 5238843911d2f2f3e693cd22 | Ponte Nova |  |  |  |  | no name signal (only type words) |
| 5299f248498e42dd978df4e4 | Mosteiro De Fráguas | ADCR Mosteiro de Fráguas | overture cafe | 57 | 0.90 | same name as a served place of another kind: overture cafe at 57 m |
| 531b0228498ef517331863e4 | viaduto corujeira | Corujeira | overture art_gallery | 265 | 0.90 | same name beyond the matcher radius: overture art_gallery at 265 m |
| 53eed49d498eaf9ba699ec60 | Ponte do Porto |  |  |  |  | no name signal (only type words) |
| 5485737c498e36f1d88995f5 | Bateiras | Bateiras | overture historical_landmark | 174 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 174 m |
| 55468630498e6091e239faa7 | porto çarşı | Porto Cathedral | overture church | 296 | 0.72 | same name beyond the matcher radius: overture church at 296 m |
| 56ba058e498e00093a8523bd | Ponte da Ribeira |  |  |  |  | no name signal (only type words) |
| 572dd436498e9106dc0fcd65 | Ponte |  |  |  |  | no name signal (only type words) |
| 61ace6498720ab376911cc25 | Ponte Romana De Vila Formosa | Ponte Romana de Vila Formosa | overture bridge | 179 | 1.00 | same name beyond the matcher radius: overture bridge at 179 m |
| 67d94bfb80451f5a22daeb8a | Guadiana International Bridge | Guadiana International Bridge | overture bridge | 230 | 1.00 | same name beyond the matcher radius: overture bridge at 230 m |
| 68571ba6250da6428e3cf66d | Passadiço De Santa Eulália | Praia de Santa Eulália | overture beach | 301 | 0.83 | same name beyond the matcher radius: overture beach at 301 m |
| 68e13e2a46e5a741f35c2bce | Passadiços de Santa Comba Dão | Paroquia de Santa Comba Dao | overture church | 370 | 0.79 | same name beyond the matcher radius: overture church at 370 m |
| 6a11b7e880cac8145318fb3f | Viaduto Pedonal S. Domingos de Benfica | Igreja Paroquial de Sao Domingos de Benfica | overture church | 357 | 0.72 | same name beyond the matcher radius: overture church at 357 m |

### `marina` — 336 rows

Matched against: overture marina 11, overture beach 6, overture historical_landmark 3, overture park 3, overture river 2, overture lake 1, overture church 1, overture surf_spot 1.

Suspect because: same name beyond the matcher radius 51, same name as a served place of another kind 18, no name signal 10, empty name 3, name is the locality 2, coordinates shared with 1 other archive row(s) 1.

Same name beyond the matcher radius, by served type: overture restaurant 10, overture marina 9, overture beach 7, overture historical_landmark 5, overture bar 3, overture school 2, overture church 2, overture music_venue 2, overture theatre 1, overture mini_market 1, overture bakery 1, overture lake 1, overture museum 1, overture community_center 1, overture hiking_area 1, overture cafe 1, overture bank 1, overture rv_park 1, overture store 1.

Same name as a served place of another kind, by served type: overture restaurant 13, overture bar 2, overture gym 1, overture cafe 1, overture store 1.

#### Already served (matched) — sample of 28 of 28

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4bd784b65cf276b01b899b00 | Marina do Freixo | Marina do Freixo( Cais de embarque de embarcações Maritimo Turisticas). | overture marina | 26 | 0.90 | KAN-388 match: overture marina |
| 4c2251a29a67a593624cdc87 | Cais da Ribeira | Praça da Ribeira | overture historical_landmark | 54 | 0.84 | KAN-388 match: overture historical_landmark |
| 4c57f8ee2308be9a733e5a6c | Porto de recreio da Calheta | Porto de Recreio da Calheta | overture marina | 20 | 1.00 | KAN-388 match: overture marina |
| 4c6baff59669e21e317cab51 | Marina de Albufeira | Marina de Albufeira | overture marina | 33 | 1.00 | KAN-388 match: overture marina |
| 4c7aceb83badb1f720615354 | Porto das Pipas | Porto das Pipas | overture marina | 3 | 1.00 | KAN-388 match: overture marina |
| 4d1be0daf8ca236a6ccdf130 | Marina de Faro | Faro Marina | overture marina | 63 | 0.90 | KAN-388 match: overture marina |
| 4d1fa6025acaa35db677c135 | Marina de Vila do Conde | Marina de Vila do Conde | overture marina | 6 | 1.00 | KAN-388 match: overture marina |
| 4d610b659f67f04d65fc7ffb | Marina da Póvoa | Marina da Póvoa de Varzim | overture marina | 62 | 0.90 | KAN-388 match: overture marina |
| 4d6926e31a88b1f70661275d | Marina De Alvor | Marina Do Alvor - Alvor | overture marina | 74 | 0.78 | KAN-388 match: overture marina |
| 4d861aaed5fab60c8a95049c | Clube Nautico de Crestuma | Esteiro de Crestuma | overture beach | 69 | 0.73 | KAN-388 match: overture beach |
| 4df25a91b0fb807158be1581 | Barragem de Santa Clara | Barragem de Santa Clara | overture lake | 2 | 1.00 | KAN-388 match: overture lake |
| 4e0add977d8bc5cb4354fa0e | Barragem de Crestuma-Lever | Barragem de Crestuma-Lever | overture historical_landmark | 10 | 1.00 | KAN-388 match: overture historical_landmark |
| 4e0f6345483bc2b5f48b696f | Marina de Tróia | Peninsula de Troia | overture beach | 20 | 0.73 | KAN-388 match: overture beach |
| 4e23665b3151306f89290cdf | Cais da Silveira | Cais da Silveira | overture beach | 30 | 1.00 | KAN-388 match: overture beach |
| 4e25fd9bb3ad5b077c95b497 | Porto das Cinco Ribeiras | Zona Balnear das Cinco Ribeiras | overture beach | 34 | 0.76 | KAN-388 match: overture beach |
| 4e35492b14952ff6cbc61b28 | Trafaria | Igreja de São Pedro da Trafaria | overture church | 27 | 0.90 | KAN-388 match: overture church |
| 4e4513fbb0fb71d219899bbd | Marina de Ponta Delgada | Marina Ponta Delgada | overture marina | 38 | 0.90 | KAN-388 match: overture marina |
| 4e48e3f6887781a619ca1463 | Porto de Pesca de Quarteira | Porto de pesca de Quarteira | overture marina | 17 | 1.00 | KAN-388 match: overture marina |
| 4eabb0ca4690ef1f6c6713b5 | Cais da Estiva | Cais da Estiva | overture historical_landmark | 15 | 1.00 | KAN-388 match: overture historical_landmark |
| 4fe16df0e4b0675748605584 | Vega de Terron | Vega de Terrón | overture river | 36 | 1.00 | KAN-388 match: overture river |
| 503a3f98e4b06ee16eae4eec | Cais do Caniçal | Piscinas do Caniçal | overture beach | 52 | 0.82 | KAN-388 match: overture beach |
| 504c6be3e4b03e4ad9a91247 | Marina Senhora Da Ribeira | Praia Fluvial Senhora da Ribeira | overture beach | 52 | 0.77 | KAN-388 match: overture beach |
| 50c33ebde4b02d3a8560a596 | Sítio das Hortas | Sitio das Hortas | overture park | 40 | 1.00 | KAN-388 match: overture park |
| 519d29f3498ed806422fef3c | Ribeira da Aldeia | Cais Da Ribeira Da Aldeia | overture park | 26 | 0.90 | KAN-388 match: overture park |
| 520784f211d26505edf7e4b6 | Porto da Ribeirinha (zona de lazer) | Porto da Ribeirinha | overture park | 0 | 0.90 | KAN-388 match: overture park |
| 55af6cdc498e9758ef390ac3 | Marina Vila do Porto | Marina de Vila do Porto | overture marina | 32 | 0.90 | KAN-388 match: overture marina |
| 55c3679d498ebebb4bbe4f4a | Doca de Alcântara | Porto De Alcântara | overture river | 54 | 0.80 | KAN-388 match: overture river |
| 5cd71fefd41bb7002b61a6bc | Portinho do Jardim do Mar | Portinho do Jardim do Mar | overture surf_spot | 0 | 1.00 | KAN-388 match: overture surf_spot |

#### Unique — sample of 30 of 223

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4beb37ec9ab3b7137ddbb549 | Clube Fluvial Vilacondense | Vila do Conde | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4c4dd4edfb742d7fe6ac602d | Porto De São Roque | Almas | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4d47f689ea3f37042f40250a | Terminal Eurominas | Setubal | Travel and Transportation > Boat or Ferry | no served counterpart within 400 m |
| 4d5c20c79ac9a093f7396d94 | Terminal Fluvial de Belém | Lisboa | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4d73b5daf7c38cfa6372ba3d | Terminal Fluvial da Trafaria | Trafaria | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4df38755fa76abc3d86d1b4b | Porto das Capelas |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4e343022227111ae7696b305 | Porto Da Arrifana - Festa Dos Pescadores | Aljezur | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4e4d98bb18a8af30fd6bdb1e | Porto de Lagos | Lagos | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4ecba9185c5cfb26b524ac63 | Clube Naval De Lisboa | Lisboa | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4f9fa6fbe4b08f8515629a72 | Porto de Recreio Santa Cruz | Santa Cruz | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4fb81415e4b088e27d49445c | Quinta Madre Deus |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 4ff6a673e4b04619c71a7564 | Cais Do Pinhão | Pinhão | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 502cdae3e4b06a779cdd22df | Porto Da Silveira |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 502fdf96e4b0543f995d4e6e | Porto Da Prainha |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 506b1ee5e4b0670d3feb0ccb | Iatestore |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 50798a42e4b0e1f138210c65 | Zona Ribeirinha | Montijo | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 5172fe5febca8d688ca20420 | Bass Catch in Santa Clara | Odemira | Landmarks and Outdoors > Lake | no served counterpart within 400 m |
| 51897e677dd22031ed6a3543 | Edifício da Capitania Marina do Parque das Nações | Lisboa | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 519b6226498eb307e118e0ac | Porto do Arnel |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 51b9b123498e140f68bf5f45 | Sardoura Docks |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 521a092811d28f3e25bfbb79 | Aquaglide |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 53820758498ea82192d67d62 | Porto Carvoeiro |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 53f859d2498eb0ce54e1df15 | Porto das Manadas |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 5404ac53498e6650fccb6caf | Pontão da Aldeia da Estrela | Estrela | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 5428776c498eb1712debf17a | neustriano |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 554cbe99498e50850e320be2 | Marina do Clube Náutico - Montargil | Montargil | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 55679063498e2513bbc6b118 | Travessa Do Outeirinho |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 55d72b18498eeeda0709d044 | catamaran vertigem azul |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 58b3486925911e5ade5b1299 | Leixoes Ancorage |  | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |
| 68ac5848af204c5c29818589 | Porto De Pescas | Vila Franca Do Campo | Landmarks and Outdoors > Harbor or Marina | no served counterpart within 400 m |

#### Suspect — sample of 30 of 85

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4aeb3f09f964a52014c021e3 | Marina de Vilamoura | Mayflower - Marina de Vilamoura | overture restaurant | 62 | 0.90 | same name as a served place of another kind: overture restaurant at 62 m |
| 4b0588a2f964a52040d122e3 | Marina de Cascais | Marina de Cascais | overture marina | 135 | 1.00 | same name beyond the matcher radius: overture marina at 135 m |
| 4b9e6fb6f964a5209fe336e3 | Clube Naval de Sesimbra | Clube Naval de Sesimbra | overture gym | 15 | 1.00 | same name as a served place of another kind: overture gym at 15 m |
| 4c2e6d5266e40f47df38c08b | Cais de Gaia | Churraria Cais de Gaia | overture cafe | 71 | 0.90 | same name as a served place of another kind: overture cafe at 71 m |
| 4c5c7d9e6ebe2d7f733bd02e | Cais do Porto Santo | Praia do Porto Santo | overture beach | 198 | 0.87 | no name signal (only type words) |
| 4c5e76da7735c9b6190b9272 | Marina do Porto Santo | Marina Porto Santo | overture marina | 145 | 0.90 | same name beyond the matcher radius: overture marina at 145 m |
| 4c6add323fa82c7a9d0119a6 | Marina de Portimão | Marina de Portimão  | overture bar | 261 | 1.00 | same name beyond the matcher radius: overture bar at 261 m |
| 4d41d23900e8a35d6be807fb | Marina do Parque das Nações | Marina Parque das Nações | overture marina | 236 | 0.90 | same name beyond the matcher radius: overture marina at 236 m |
| 4dbd1a666e810768bf6f508d | Marina Alhandra | Alhandra | overture historical_landmark | 309 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 309 m |
| 4dbdec6fb3dcc563f2dc8bac | Porto da Caloura | Bar Caloura | overture restaurant | 8 | 0.72 | same name as a served place of another kind: overture restaurant at 8 m |
| 4ded041fe4cd5dfe5a5ceef4 | Porto De Pesca | Porto de Pesca | overture store | 0 | 1.00 | no name signal (only type words) |
| 4dfe417f2271043ca8096b28 | Clube Náutico de Paço de Arcos | Praia de Paço de Arcos | overture beach | 237 | 0.73 | same name beyond the matcher radius: overture beach at 237 m |
| 4e03e62018a877730b758763 | Cais das Pedras | Taberna Cais das Pedras | overture restaurant | 25 | 0.90 | same name as a served place of another kind: overture restaurant at 25 m |
| 4e4e44df2271a1bdc3ccf26b | Moinho das Freiras | Túnel Moinho das Freiras | overture hiking_area | 325 | 0.90 | same name beyond the matcher radius: overture hiking_area at 325 m |
| 4ff8ad2ce4b0887e5555c4a0 | Ппц |  |  |  |  | empty name |
| 50081f80e4b0431e7f335811 | Grupo Naval de Olhão | Grupo Naval de Olhão | overture restaurant | 4 | 1.00 | same name as a served place of another kind: overture restaurant at 4 m |
| 501be916e4b02f1fd3d0e23e | Marina da Fuzeta | Praia da Fuseta | overture beach | 272 | 0.77 | same name beyond the matcher radius: overture beach at 272 m |
| 5021526490e709ccb57caa36 | Fajã do Ouvidor | Fajã do Ouvidor | overture historical_landmark | 390 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 390 m |
| 502c3016e4b0b8173734ff94 | Porto dos Terreiros | Snack Bar Do Porto Dos TERREIROS | overture restaurant | 95 | 0.90 | same name beyond the matcher radius: overture restaurant at 95 m |
| 50375e64e4b0fc35e34a372b | Cais |  |  |  |  | no name signal (only type words) |
| 50381556e4b0b35a24cfab7f | Porto da Feteira | Paróquia da Feteira | overture church | 126 | 0.74 | same name beyond the matcher radius: overture church at 126 m |
| 503e31cde4b06abc4a6f65aa | Marina Vila Nova Cerveira | Casa Benfica Vila Nova de Cerveira | overture restaurant | 113 | 0.75 | same name beyond the matcher radius: overture restaurant at 113 m |
| 5064618fe4b0b0ae35ceaad8 | Приморская |  |  |  |  | empty name |
| 51bc87e8498e16bff88b6102 | Clube Nautico De Tavira | Clube Náutico de Tavira | overture school | 83 | 1.00 | same name beyond the matcher radius: overture school at 83 m |
| 520f7a6211d2f34d734021a2 | Octopus dive center | Octopus Diving Center | overture store | 6 | 0.90 | same name as a served place of another kind: overture store at 6 m |
| 5263079d498edab2d6702c9d | Marina de Rio Caldo | Marina Bar | overture restaurant | 11 | 0.72 | same name as a served place of another kind: overture restaurant at 11 m |
| 526e448f11d2cb741fd79046 | Cais de Vila Velha de Rodão | O Cais | overture restaurant | 1 | 0.72 | same name as a served place of another kind: overture restaurant at 1 m |
| 52efa13b11d2cf1a5c1288f0 | Doca dos Olivais | Finanças Dos Olivais | overture bank | 330 | 0.78 | same name beyond the matcher radius: overture bank at 330 m |
| 5f37c2a62470c50d99c85e98 | Marina Da Afurada | O Forninho Da Afurada | overture restaurant | 384 | 0.74 | same name beyond the matcher radius: overture restaurant at 384 m |
| 68baba35fd16d56ff7e8f370 | Marina Vila Real De Santo António Porto De Recreio De Vila Real De Santo António | VILA REAL DE SANTO ANTONIO | overture store | 196 | 0.90 | same name beyond the matcher radius: overture store at 196 m |

### `surf_spot` — 343 rows

Matched against: overture beach 47, overture surf_spot 38, overture campground 2, overture historical_landmark 1, overture church 1, overture hiking_area 1, overture nature_preserve 1, overture mountain 1, overture amusement_park 1.

Suspect because: same name beyond the matcher radius 50, same name as a served place of another kind 26, archive twin within 20 m 5, no name signal 4, empty name 2, coordinates shared with 1 other archive row(s) 1, name is the locality 1.

Same name beyond the matcher radius, by served type: overture beach 19, overture surf_spot 10, overture gym 9, overture restaurant 4, overture store 4, overture cafe 2, overture historical_landmark 1, overture campground 1.

Same name as a served place of another kind, by served type: overture gym 10, overture store 6, overture restaurant 5, overture bar 3, overture school 2.

#### Already served (matched) — sample of 30 of 93

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b9f4648f964a5208d1a37e3 | Praia da Poça | Praia da Poça | overture beach | 13 | 1.00 | KAN-388 match: overture beach |
| 4ba10689f964a520499037e3 | Cabo da Roca | Cabo da Roca - Most Western point in Europe | overture historical_landmark | 16 | 0.90 | KAN-388 match: overture historical_landmark |
| 4c07d774708c2d7f6292ca63 | Fonte da Telha | Praia da Fonte da Telha | overture beach | 68 | 0.90 | KAN-388 match: overture beach |
| 4c23951a11de20a1a2aa86ce | Praia das Milícias | Praia das Milícias | overture beach | 13 | 1.00 | KAN-388 match: overture beach |
| 4c42d43ca5c5ef3b0097b06f | Praia da Rainha | Praia da Rainha | overture beach | 63 | 1.00 | KAN-388 match: overture beach |
| 4c445eb156a7ef3bd43dce21 | Praia Azul | Praia Azul Sul | overture beach | 67 | 0.90 | KAN-388 match: overture beach |
| 4c8cfeecd5049c748c444c6a | Paredes de Vitória | Paredes de Vitória | overture beach | 9 | 1.00 | KAN-388 match: overture beach |
| 4daad924a86e771ea72c4226 | Praia da Vieirinha | Praia da Vieirinha | overture beach | 0 | 1.00 | KAN-388 match: overture beach |
| 4dbc3d224df044e524de8fda | Praia de Paramos | Praia de Paramos | overture beach | 59 | 1.00 | KAN-388 match: overture beach |
| 4e350b33ae60d86c3abbc725 | Praia Da Capela | Praia da Capela | overture surf_spot | 0 | 1.00 | KAN-388 match: overture surf_spot |
| 4fb75333e4b0abf74f007d9f | Oporto Surfcamp | Oporto Surf Camp | overture surf_spot | 11 | 0.97 | KAN-388 match: overture surf_spot |
| 4fd0dbb5e4b0d62a04a5c5f4 | Praia da Ladeira (Norte) | Praia da Ladeira Norte | overture beach | 13 | 1.00 | KAN-388 match: overture beach |
| 4fec9a4939506eff0226c39d | Liga MEO Pro Surf  - Praia do Cabedelo | Liga MEO Pro Surf  - Praia do Cabedelo | overture beach | 0 | 1.00 | KAN-388 match: overture beach |
| 4ff18662d63ed400f57a0937 | Camping Orbitur de Valado | Camping Orbitur Valado | overture campground | 68 | 0.90 | KAN-388 match: overture campground |
| 50155b86e4b0b186e5462e13 | Praia de Afife | Praia de Afife | overture beach | 15 | 1.00 | KAN-388 match: overture beach |
| 502018d8e4b0112a67f81217 | Carrapateira Surfing Club Bar | Carrapateira Surfing Club Bar | overture surf_spot | 2 | 1.00 | KAN-388 match: overture surf_spot |
| 51d9a7a9498e309c6ed2d31a | Praia Aguçadoura - escolinha | Praia Aguçadoura - escolinha | overture surf_spot | 3 | 1.00 | KAN-388 match: overture surf_spot |
| 51fa44e4498eefe89a1d3a9a | VIP Torre Comporta Beach | VIP Torre Comporta Beach | overture surf_spot | 3 | 1.00 | KAN-388 match: overture surf_spot |
| 5353d65211d2e8996ab27708 | miradouro da maravilha | Miradouro da Maravilha | overture surf_spot | 2 | 1.00 | KAN-388 match: overture surf_spot |
| 544cd283498ee0bc25b2f411 | santa iria | Santa Iria | overture surf_spot | 4 | 1.00 | KAN-388 match: overture surf_spot |
| 54acd3c8498e329012dc481a | Ripar Surf School & Surf Camp | Ripar Surf School and Camp | overture surf_spot | 54 | 0.87 | KAN-388 match: overture surf_spot |
| 552ff7c7498e3e975d32e2bc | The Atlantic Ocean | The Atlantic Ocean | overture surf_spot | 0 | 1.00 | KAN-388 match: overture surf_spot |
| 5580af46498e942cd2165cee | Praia do Cascais | Praia do Cascais | overture surf_spot | 1 | 1.00 | KAN-388 match: overture surf_spot |
| 581f74f316dbbc451bf5924e | Praia do Canal | Praia do canal | overture beach | 51 | 1.00 | KAN-388 match: overture beach |
| 593bb58c0457b735c9c6c70d | Associação De Surf De Aveiro | Associação Surf Aveiro | overture surf_spot | 0 | 0.90 | KAN-388 match: overture surf_spot |
| 59ca360b6cf01a14b8501219 | Amado Surf School | Amado Surf School | overture surf_spot | 0 | 1.00 | KAN-388 match: overture surf_spot |
| 59e604ec26659b7e9b78671f | MadSea - Bodyboard & More | MadSea | overture mountain | 9 | 0.90 | KAN-388 match: overture mountain |
| 6148e62c1cce11025df87bc9 | Academia Do Surf | Academia do Mar | overture amusement_park | 24 | 0.84 | KAN-388 match: overture amusement_park |
| 6451abf5aed68036d75f1b4a | Watergliders - Santa Barbara Surf School Azores | Santa Barbara Surf School Azores | overture surf_spot | 30 | 0.90 | KAN-388 match: overture surf_spot |
| 7c573554942e4f8d461d546e | Ecosurfcamp | Ecosurfcamp | overture campground | 2 | 1.00 | KAN-388 match: overture campground |

#### Unique — sample of 30 of 161

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 1365cb711dcd4b8b6f533ffe | Search School | Costa da Caparica | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 3507054e1ddf4acbabda703a | Villa Ana Margarida by Nature | Ericeira | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 4c93801b72dd224bb2059191 | Onda Livre |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 4d3abdfa34ee3704b3f77a9b | Praia dos Coxos | Ribamar | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 4d64f96889238cfa9f429336 | Escola de Vela da Lagoa | Foz do Arelho | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 4df1f27fe4cda09e6d9c89cc | Escola Rui Meira | Lagoa de Albufeira | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 4f7c8853e4b032c26c670a0a | Baja De Peniche Surfcamp |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 502e331de4b0bde725cb2d01 | Praia de Porto Mós |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 5070bec5e4b0245aeb6b0873 | Praia D'el Rey | Óbidos | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 52ab758611d2718d2156916a | Ericeira |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 52b0769211d279ae95f9b872 | PortugalSurfCamp | Baleia/Barril | Sports and Recreation | no served counterpart within 400 m |
| 5607ee90498e2ffed341f2d9 | North Atlantic Ocean |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 561b976f498e0094cabcb88c | Zarautz |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 561b97f4498e0c5c4e5ff731 | Zarautz |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 56331da2498e640928ceadbc | Cantinho Da Baia |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 56fcf66f498ee94bbd7a3eb0 | Le Transat |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 579545ed498e7662388c36e2 | praia do bom sucesso |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 5798981f498e69e03ad3cc7c | Surf Milfontes | Vila Nova de Milfontes | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 57c413be498e726a0b917638 | SurfDream |  | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 5969e102356b4912177267fc | FY Surf School | Almada | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 5980f4871bc70436f8626602 | Anchorpoint Surfschool | Águas Férreas | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 59a093d775cb8c77a8f04eb6 | West Soul Surf Camp | Torres Vedras | Community and Government > Residential Building > Apartment or Condo | no served counterpart within 400 m |
| 5bb0bb272b9844002c96638e | Praia Da Etar | Espinho | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 5cab8d14e65d0c002c9505c1 | Atlantic Ocean | Ovar | Landmarks and Outdoors > Beach | no served counterpart within 400 m |
| 60968ce3c3d8de6165c183c1 | Way 2 Surf | Almada | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 60f6cad714289913ecb07982 | Boarder Club Portugal | Costa de Caparica | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| 688e7d86ec3654621b59d234 | Seixal Beach | Porto Moniz | Landmarks and Outdoors > Beach | no served counterpart within 400 m |
| 6a59f8445bea561dc911fed8 | Stru Surf School | Vila Nova de Gaia | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| a956a290a56b44bcc83be109 | Janga Surfcamp | Figueira da Foz | Landmarks and Outdoors > Surf Spot | no served counterpart within 400 m |
| b055941521eb4bb66deb6d1f | Haliotis Surf Adventures | Peniche | Community and Government > Education | no served counterpart within 400 m |

#### Suspect — sample of 30 of 89

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4b570f03f964a520bc2428e3 | Praia de Carcavelos | Praia de Carcavelos | overture beach | 349 | 1.00 | same name beyond the matcher radius: overture beach at 349 m |
| 4b9e8f78f964a52038ef36e3 | Praia da Torre | Restaurante Praia Caffe | overture restaurant | 20 | 0.72 | same name as a served place of another kind: overture restaurant at 20 m |
| 4bf81e7fb182c9b6b3e4765a | Praia do Magoito | Praia do Magoito | overture beach | 300 | 1.00 | same name beyond the matcher radius: overture beach at 300 m |
| 4c59e0bad3aee21eea556955 | Praia da Nazaré | Praia da Nazaré | overture beach | 318 | 1.00 | same name beyond the matcher radius: overture beach at 318 m |
| 4c5c177d94fd0f474794c745 | Ribeira d'Ilhas | Praia de Ribeira d'Ilhas | overture beach | 92 | 0.90 | no name signal (only type words) |
| 4c5d77127735c9b6310a8f72 | Praia da Murtinheira | Praia da Murtinheira | overture surf_spot | 325 | 1.00 | same name beyond the matcher radius: overture surf_spot at 325 m |
| 4c612d3cde6920a1ac9e9764 | Praia De Vale Figueira | Praia de Vale Figueira | overture beach | 136 | 1.00 | same name beyond the matcher radius: overture beach at 136 m |
| 4d959bb62bd6f04d02b72150 | Surfguiding Peniche | Surfguiding Peniche | overture store | 53 | 1.00 | same name as a served place of another kind: overture store at 53 m |
| 4dd62d29d4c05d5096c9dcec | Lufi Surf School | Lufi Surf School | overture school | 0 | 1.00 | same name as a served place of another kind: overture school at 0 m |
| 4e0603c6ae60a90eabbfcf47 | Praia Do Navio | Restaurante O Navio | overture restaurant | 12 | 0.72 | same name as a served place of another kind: overture restaurant at 12 m |
| 4e15c82eb61c42e7c54e27e2 | Praia do Poço da Cruz | Poço da Cruz | overture surf_spot | 108 | 0.90 | same name beyond the matcher radius: overture surf_spot at 108 m |
| 4f4911ede4b0b0b99acefc6a | Praia de Vila Praia de Âncora |  |  |  |  | name is the locality |
| 4ff757aae4b0f08304f78725 | cedovem | Cedovem | overture surf_spot | 105 | 1.00 | same name beyond the matcher radius: overture surf_spot at 105 m |
| 503cdc96e4b094c614715741 | Praia da Ponta Ruiva | Praia da Ponta Ruiva | overture beach | 169 | 1.00 | same name beyond the matcher radius: overture beach at 169 m |
| 50436607e4b04fbe538f7a85 | Global Surf School | Global Surf School and Camp | overture gym | 92 | 0.90 | same name beyond the matcher radius: overture gym at 92 m |
| 5068668319a9e193b1659c2c | Escola de Surf Grande Onda | Escola de Surf Grande Onda | overture surf_spot | 286 | 1.00 | same name beyond the matcher radius: overture surf_spot at 286 m |
| 50d5fe3ce4b07954352fe81a | Praia Da Conceição | Ribeira da praia da Conceicao | overture beach | 106 | 0.90 | same name beyond the matcher radius: overture beach at 106 m |
| 51c74f9c498ee246c10eb554 | Pedra Branca | Pedra Branca | overture surf_spot | 212 | 1.00 | same name beyond the matcher radius: overture surf_spot at 212 m |
| 53680094498e667ce90100a0 | Город Назаре |  |  |  |  | empty name |
| 540c7d5a498e9abf6730c083 | Costa Di Caparica | Orbitur Costa de Caparica | overture campground | 152 | 0.76 | same name beyond the matcher radius: overture campground at 152 m |
| 5416f6a1498e6856c659e6da | Escola de Surf de Peniche | Peniche | overture restaurant | 392 | 0.90 | same name beyond the matcher radius: overture restaurant at 392 m |
| 575aad0b498e75665d517ae3 | Blue ocean Surf School | Ericeira Blue Ocean Surf School | overture school | 72 | 0.90 | same name as a served place of another kind: overture school at 72 m |
| 59564de22955136020d8782f | Aloha Surf School | Aloha Surf Sup School | overture gym | 210 | 0.89 | same name beyond the matcher radius: overture gym at 210 m |
| 5b8c1eee4c954c002c453da9 | ElementFish Surfcamp |  |  |  |  | archive twin within 20 m: 595827d1018cbb38478a3aa5 |
| 5c0f98dc81a0ea002c3c6f51 | Linha de Onda | Linha de Onda | overture gym | 34 | 1.00 | same name as a served place of another kind: overture gym at 34 m |
| 5d95c52d177828000851c641 | Salty Wave Surf School | Salty Wave Surf School - Porto | overture surf_spot | 129 | 0.90 | same name beyond the matcher radius: overture surf_spot at 129 m |
| 5f490e747f26de4dae583971 | DuckDive Surf & SUP School | Duckdive | overture gym | 15 | 0.90 | same name as a served place of another kind: overture gym at 15 m |
| 60fa9dbba79c8f5d1a16c6db | Surf4 You | Surf4 You | overture gym | 77 | 1.00 | archive twin within 20 m: 60f957d43a551302c7425bc8 |
| 61363ffa85c80f73bec6aa6a | Wanted Surf School | Mowzes Surf School | overture gym | 385 | 0.78 | same name beyond the matcher radius: overture gym at 385 m |
| 648de484afef212cb48a09e4 | Tsunami Surf School | Tsunami Surf School | overture gym | 9 | 1.00 | archive twin within 20 m: 53e8ae57498e230096ed4d89 |

### `lighthouse` — 138 rows

Matched against: overture lighthouse 35, overture historical_landmark 12, overture beach 2, overture church 1, overture museum 1.

Suspect because: same name beyond the matcher radius 11, no name signal 5, same name as a served place of another kind 2, empty name 2.

Same name beyond the matcher radius, by served type: overture lighthouse 4, overture historical_landmark 3, overture restaurant 2, overture park 1, overture butcher 1.

Same name as a served place of another kind, by served type: overture bar 1, overture restaurant 1.

#### Already served (matched) — sample of 30 of 51

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4ba10689f964a520499037e3 | Cabo da Roca | Cabo da Roca - Most Western point in Europe | overture historical_landmark | 16 | 0.90 | KAN-388 match: overture historical_landmark |
| 4bf028a070779521f2573e7c | Cabo Raso | Farol do Cabo Raso | overture historical_landmark | 50 | 0.90 | KAN-388 match: overture historical_landmark |
| 4c2c72a677cfe21edefdb5f1 | Farol dos Capelinhos | Vulcão dos Capelinhos | overture historical_landmark | 74 | 0.83 | KAN-388 match: overture historical_landmark |
| 4c333b2116adc928203ec39c | Cabo Carvoeiro | Cabo Carvoeiro | overture historical_landmark | 10 | 1.00 | KAN-388 match: overture historical_landmark |
| 4dab1cfcfa8cc7649744ab31 | Farol de Felgueiras | Farol de Felgueiras | overture lighthouse | 2 | 1.00 | KAN-388 match: overture lighthouse |
| 4ddebe01c65bb2aa73976f5b | Farol de Esposende | Farol de Esposende | overture historical_landmark | 67 | 1.00 | KAN-388 match: overture historical_landmark |
| 4df7ed8062e1bb821b5d0d7f | Pilotos | Pilotos | overture lighthouse | 0 | 1.00 | KAN-388 match: overture lighthouse |
| 4dfdf904d164848a03fab16a | Miradouro da Vigia das Baleias | Miradouro da Vigia das Baleias | overture historical_landmark | 41 | 1.00 | KAN-388 match: overture historical_landmark |
| 4dfdfa25b61c84188ef20cb1 | Farol da Ponta do Cintrão | Farol da Ponta do Cintrão | overture lighthouse | 21 | 1.00 | KAN-388 match: overture lighthouse |
| 4e6ccde6e4cd4bedebc5c5d5 | Farol Cabo Mondego | Farol do Cabo Mondego | overture lighthouse | 17 | 0.90 | KAN-388 match: overture lighthouse |
| 4f0f2c9ce4b023b37a92ff40 | Farol de Vila Nova Milfontes | Farol de Vila Nova Milfontes | overture lighthouse | 9 | 1.00 | KAN-388 match: overture lighthouse |
| 4f25909be4b006e5c34c254d | Marégrafo da Praia das Fontainhas | Praia das Fontainhas | overture beach | 37 | 0.90 | KAN-388 match: overture beach |
| 4fabd050e4b0420128484523 | Farol de Sesimbra | Farol de Sesimbra | overture lighthouse | 9 | 1.00 | KAN-388 match: overture lighthouse |
| 4fea0d44a17c0739a868b43e | Farol de São Miguel | Farol de São Miguel | overture historical_landmark | 13 | 1.00 | KAN-388 match: overture historical_landmark |
| 50179413e4b072c4c0478d77 | Farol de São Lourenço | Farol da Ponta de São Lourenço | overture lighthouse | 63 | 0.82 | KAN-388 match: overture lighthouse |
| 505db2ece4b023e43ffc2ff5 | Farol da Aguda | Farol da Aguda | overture lighthouse | 20 | 1.00 | KAN-388 match: overture lighthouse |
| 51eaaaac498eca0bd66b1ce3 | Farol do Albarnaz | Phare d'Albarnaz | overture lighthouse | 28 | 0.79 | KAN-388 match: overture lighthouse |
| 520a2baa11d2c854b404bdce | Farol Da Ponta Do Carapacho | Farol da Ponta do Carapacho | overture lighthouse | 6 | 1.00 | KAN-388 match: overture lighthouse |
| 5427242d498e786c48187a85 | Farol Santa Clara | Farol de Santa Clara | overture lighthouse | 5 | 0.90 | KAN-388 match: overture lighthouse |
| 542743ea498efb9f08a6371c | Farol da Ribeirinha | Farol da Ponta da Ribeirinha | overture lighthouse | 37 | 0.81 | KAN-388 match: overture lighthouse |
| 542828db498e58df08cf420a | Farol | Farol do Ilhéu Chão | overture lighthouse | 17 | 0.90 | KAN-388 match: overture lighthouse |
| 5645d937498e6d752a7c1e1c | Forte de São Miguel Arcanjo | Forte de São Miguel Arcanjo | overture lighthouse | 5 | 1.00 | KAN-388 match: overture lighthouse |
| 573332b9498e098bef2edac6 | Farol da Ponta das Lajes | Farol da Ponta das Lajes | overture lighthouse | 28 | 1.00 | KAN-388 match: overture lighthouse |
| 577d45ab498e49f9751d3289 | Farol da Cabo da Roca | Farol DO Cabo da Roca | overture historical_landmark | 2 | 0.90 | KAN-388 match: overture historical_landmark |
| 598da853dd12f8153aea326f | Farolim De Santa Catarina | Farolim de Santa Catarina | overture lighthouse | 59 | 1.00 | KAN-388 match: overture lighthouse |
| 59b43b3d0d173f341f294e55 | Farol do Cabo Espichel | Farol do Cabo Espichel | overture historical_landmark | 6 | 1.00 | KAN-388 match: overture historical_landmark |
| 5b86b362c036350039175274 | Farol de Serrata | Farol de Serrata | overture lighthouse | 34 | 1.00 | KAN-388 match: overture lighthouse |
| 5f3eba554578c16ed316b169 | Farol De Mama | Farol da Mama | overture lighthouse | 12 | 0.90 | KAN-388 match: overture lighthouse |
| 6417031fb6cf5138d1eff080 | Farol De Peniche | Farol de Peniche | overture historical_landmark | 14 | 1.00 | KAN-388 match: overture historical_landmark |
| 6a73a5df4c07115e3b220f40 | Farol da Ponta Negra | Phare de Ponta Negra | overture lighthouse | 15 | 0.80 | KAN-388 match: overture lighthouse |

#### Unique — sample of 30 of 67

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 278c6e66352640aacf7076b2 | Isabel Pinheiro | Braga | Business and Professional Services > Legal Service > Law Office | no served counterpart within 400 m |
| 4bb8704853649c74810447fb | Cabo Mondego | Figueira da Foz | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 4c65932e7abde21e20166168 | Torre De Vigia | Casal do Monte | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 4cee969262ef6dcbc6b7f959 | Farol do Cabo Sardão | Cavaleiro | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 4d9b73d0b2aaa093c5a87082 | Farolins da Barra do Douro | Porto | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 4e88732829c2057e36147340 | Forte de São Lourenço do Bugio | Oeiras | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 4f40c372e4b0bf54c93d478f | Ponta do Altar | Portimão | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 503a73eae4b096b491d68155 | Farol da Assenta | Assenta | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 513a1dc4e4b0bcfbb712ff95 | Moinho Macop |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 520d22a7498e9f389f43aecc | Serviços Florestais |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 5216337811d244df281cd035 | Curva Sentido Unico ZEN | Cbr | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 522cafb4498e7b8dcd0085e6 | Salva Vida |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 528660f5498e020a864d5549 | Kaatjes Coimbraanse Binnenspeeltuin |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 531f3488498e31b0ab927186 | Farol de São Jorge | Santana | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 535a36d4498e79495b9f7890 | farol de berlengas |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 54036dfd498ef5279c9e687f | Farol da Barra | Aveiro | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 543026f9498ecc238f90a9a2 | Farol da Ponta da Piedade | Lagos | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 55a400a1498e1813260ce716 | vila do bispo |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 5632371d498ecb20f6614881 | Torre do Sinal | Leça da Palmeira | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 56ee9033498ef70097746abb | Pontão figueira da foz |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 5916bdb4d552c72b8c4585d8 | Cabo Espichel | Sesimbra | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 5bf1f056ee7120002c9d2c24 | Peniche, Portugal | Peniche | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 5f6b68aaa6207b36666af747 | Farol de Lagos Molhe Este |  | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 619fb36fbe47d6168ba84d29 | Farolim Ponta Do Norte | Вила-ду-Порту | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 6416fd2a6ffffc1168480bc1 | Farol da Nazaré Pontão Norte | Nazaré | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 65ede69f9ec58320c964bf2b | Farol da Albufeira | Albufeira | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 664e08ccc83e9e71624aafa8 | Farolim De Vila Real De San Antonio | Vila Real Santo António | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 66e71e35fa4d9220c8a7da06 | farol de quarteria | Quarteira | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 687a3aa578246123750e403d | Farol, Mohle Exterior Head | Viana do Castelo | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |
| 6a6f7eb3e1106037ebe9c520 | Farol de Gonçalo Velho | Vila do Porto | Landmarks and Outdoors > Lighthouse | no served counterpart within 400 m |

#### Suspect — sample of 20 of 20

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4bbc950ee436ef3bd8af5664 | Farol do Penedo da Saudade | Farol Penedo da Saudade | overture lighthouse | 177 | 0.90 | same name beyond the matcher radius: overture lighthouse at 177 m |
| 4c4dbf801b8e1b8d4a582026 | Praia da Aguda | Peixaria Mar Da Aguda | overture bar | 71 | 0.74 | same name as a served place of another kind: overture bar at 71 m |
| 4db408434b226b343d85122f | Farol De Santo Antonio | Farol de Santo Antonio | overture lighthouse | 84 | 1.00 | same name beyond the matcher radius: overture lighthouse at 84 m |
| 4e46f78e7d8b91a065970620 | Farol |  |  |  |  | no name signal (only type words) |
| 4e5d18fcb0fbc0acda3c45b6 | Farol da Quinta do Lorde | Quinta do Lorde | overture restaurant | 59 | 0.90 | same name as a served place of another kind: overture restaurant at 59 m |
| 4f08747de4b039f5acf01ba1 | Farol de Cacilhas | Restaurante Farol de Cacilhas | overture restaurant | 190 | 0.90 | same name beyond the matcher radius: overture restaurant at 190 m |
| 4f6f439be4b01489bb48dbe2 | Farol da Ponta da Ilha | Restaurante Ponta da Ilha | overture restaurant | 139 | 0.72 | same name beyond the matcher radius: overture restaurant at 139 m |
| 5038b857e4b0901d6bcd49d9 | Farol |  |  |  |  | no name signal (only type words) |
| 504770e8e4b0428321006eb3 | Farol das Berlengas | Faroleiro das Berlengas | overture historical_landmark | 300 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 300 m |
| 51c725f4498e5d4dfc303d13 | Farol da Ponta do Altar | Farol da Ponta do Altar | overture historical_landmark | 106 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 106 m |
| 51dd3d3c498ec8f2d835ab6a | Маяк |  |  |  |  | empty name |
| 51efc7a6498e15896089a6ff | Farol da Garça | Farol de Ponta Garça | overture lighthouse | 230 | 0.82 | same name beyond the matcher radius: overture lighthouse at 230 m |
| 521f5c6b11d2224d066e0a4a | Farol Da Ponta Dos Rosais | Ponta Dos Rosais | overture park | 250 | 0.90 | same name beyond the matcher radius: overture park at 250 m |
| 52a0d019498e039a49217727 | Farol de Aveiro Molhe Sul | Farol de Aveiro Molhe Sul | overture lighthouse | 284 | 1.00 | same name beyond the matcher radius: overture lighthouse at 284 m |
| 54281dc8498e2fd8aae2fb92 | Farol |  |  |  |  | no name signal (only type words) |
| 59a2dbf958002c3c1fec0f4a | Farol |  |  |  |  | no name signal (only type words) |
| 59fd72b248b04e100db3c8ac | 罗卡角 |  |  |  |  | empty name |
| 5d6fedebf3456d00083c2a00 | Farol Das Contendas | Farol das Contendas | overture historical_landmark | 313 | 1.00 | same name beyond the matcher radius: overture historical_landmark at 313 m |
| 5f5108e88c025038f4992377 | Ponto Novo |  |  |  |  | no name signal (only type words) |
| 66c60984fd002e4d2a0f606a | Farol da Azeda | Talho da Azedaa | overture butcher | 99 | 0.76 | same name beyond the matcher radius: overture butcher at 99 m |

### `waterfall` — 102 rows

Matched against: overture waterfall 9, overture hiking_area 3, overture historical_landmark 2, overture river 1.

Suspect because: same name beyond the matcher radius 10, no name signal 3, coordinates shared with 1 other archive row(s) 2.

Same name beyond the matcher radius, by served type: overture waterfall 5, overture nature_preserve 1, overture park 1, overture historical_landmark 1, overture hiking_area 1, overture beach 1.

#### Already served (matched) — sample of 15 of 15

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4e563a45227140cf12f19bdd | Queda do Vigario | Queda do Vigario | overture river | 0 | 1.00 | KAN-388 match: overture river |
| 4efc8f9ebe7bd3135a9020e1 | Cascata Água d'Alto | Cascata Água D'Alto | overture waterfall | 2 | 1.00 | KAN-388 match: overture waterfall |
| 5193997e498e6e1c7609f246 | Cascata de Galegos da Serra | Cascata de Galegos da Serra | overture waterfall | 33 | 1.00 | KAN-388 match: overture waterfall |
| 57b0735c498e76b3c2a70bfe | Poço Negro | Poço Negro | overture hiking_area | 7 | 1.00 | KAN-388 match: overture hiking_area |
| 5835857904f4d70f948f4440 | Miradouro da Garganta Funda | Miradouro Da Garganta Funda | overture historical_landmark | 22 | 1.00 | KAN-388 match: overture historical_landmark |
| 59c27011e2d4aa205bdbdade | Cascata Da Portela Do Homem | Cascata De Portela Do Homem | overture hiking_area | 21 | 0.90 | KAN-388 match: overture hiking_area |
| 5cb5f820ccad6b002ce4313a | Cascata De Fervença | Cascata De Fervença | overture waterfall | 0 | 1.00 | KAN-388 match: overture waterfall |
| 5f75bb16f67dea050f259a81 | Cascatas De Fecha De Berjas | Cascata de Fecha de Barjas | overture historical_landmark | 47 | 0.94 | KAN-388 match: overture historical_landmark |
| 5f81bf540349b662d36b5e75 | Cascata dos Anjos | Cascata dos Anjos | overture waterfall | 23 | 1.00 | KAN-388 match: overture waterfall |
| 60ad4e94f0495e1dbd02c0a4 | Cascata do Aveiro | Cascata Do Aveiro | overture waterfall | 53 | 1.00 | KAN-388 match: overture waterfall |
| 613733ee3d1d2148d86e66b6 | Poço Da Gola | Poço da Gola | overture hiking_area | 47 | 1.00 | KAN-388 match: overture hiking_area |
| 644d5e6767a13234b0de8cfe | Cascata do Limbo | Cascata do Limbo | overture waterfall | 3 | 1.00 | KAN-388 match: overture waterfall |
| 6457e7c2cf41a31e7ac23ea1 | Cascata Do Boição | Cascata do Boição | overture waterfall | 31 | 1.00 | KAN-388 match: overture waterfall |
| 6835f55a9809623cb34aea92 | Cascata Da Lara | Cascata Da Grova Bade | overture waterfall | 45 | 0.72 | KAN-388 match: overture waterfall |
| 69fb302f912eeb636d766f56 | Cascata De Leonte | Cascata de Leonte | overture waterfall | 10 | 1.00 | KAN-388 match: overture waterfall |

#### Unique — sample of 30 of 72

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4d2871ae342d6dcbc256f8ca | Risco |  | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 4f5cbf7be4b008b1577d0e24 | Fraga da Pena | Pardieiros | Landmarks and Outdoors > River | no served counterpart within 400 m |
| 532afc27498e9908ae2fa32b | Salto do Cagarrão |  | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 53f0f709498e27814c53b888 | Cascata do Poço do Bacalhau |  | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 5773f43e498eee5ebded445d | Океан, возле house Eвы |  | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 597e1a330e5da85ede40914e | Canyoning Diver Lanhoso | Póvoa de Lanhoso | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 5b182d7abcbf7a002c3ced64 | Cascata Da Ribeira Quente | Povoação | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 60b4f5a8dedd364c6c7cfd97 | Cascata Agua d'Alto | Santana | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 628bb9cc5c1b7c47467e92ba | Cascata do Lombinho | Ribeira da Janela | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 629257eec27d1c51408c1a0d | Cascata do Paúl do Mar | Paúl do Mar | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 62a4d30f0592fb6c2b62bf93 | Madre da Levada dos Tornos | Boaventura | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 6342e240be7fa671bb629992 | Canyoning Ribeiro Frio | Machico | Landmarks and Outdoors > Rock Climbing Spot | no served counterpart within 400 m |
| 63efbfd770b5011f4239f547 | Cascata da Soninha | São Vicente | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 644b7a2e5d753f739234ece0 | Cascata da Ribeira da Pedra Branca | Seixal | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 659c0a87c36e1c62654a6e57 | Pego Da Rainha | Envendos | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 65e897c1877f992c89cad223 | Cascata da Ribeira das Cales | Funchal | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 65f4613b3f2dd627fdab3f08 | Cascata do Rio dos Mouros | Condeixa-A-Velha | Landmarks and Outdoors > Hiking Trail | no served counterpart within 400 m |
| 663f65eaad567666f66baaaa | cascatas das cinci rodas | Cinfães | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 672278aab7ea6b0e1e8da298 | Viewpoint Salto Da Farinha Cascata Cascata Do Salto Da Farinha | Nordeste | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 67227c89cffaf934aa51a2ac | Cascata Do Homem | Ribeira Grande | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 673a01e95c99cf5c602843fe | Queda De Água Do Salto Da Farinha | Nordeste | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 6747590cba16443a11030fc8 | Cascata do Córrego da Furna | Porto Moniz | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 67475a332ff4396f67e40c80 | Cascata do Córrego da Pedra | Porto Moniz | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 67656805d3ac945800a4c6c1 | Waterfall Nastasya | Porto Moniz | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 681b6bb92385a80f93e49fb3 | Green Water Wall |  | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 683b2e0eff05167fdc6b0323 | Cascata do Pisão | Funchal | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 689dc42572ba9d4d19537d2c | Cascata En Levada Dos Cedros | Porto Moniz | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 6991a98a013d9c406139fe23 | Cascata Do Chouso | Caldas de São Jorge | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 6a78a8ac4c9d496395257795 | Cascata Portal do Paraíso | Lajes Das Flores | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |
| 6a78c640d3b29778e2d1d3e7 | Cascata da Ribeira do Ferreiro | Lajes Das Flores | Landmarks and Outdoors > Waterfall | no served counterpart within 400 m |

#### Suspect — sample of 15 of 15

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4e4bbf1aa8097d9c84bf201f | Salto do Cabrito | Salto Do Cabrito, Sao Miguel | overture waterfall | 227 | 0.90 | same name beyond the matcher radius: overture waterfall at 227 m |
| 577861ae498ecadab64176ae | Cascata da Ribeira dos Caldeirões | Parque Natural da Ribeira dos Caldeirões | overture nature_preserve | 237 | 0.82 | same name beyond the matcher radius: overture nature_preserve at 237 m |
| 5aec482e6bd36b002c68ea10 | Cascata Da Ribeira Das Quelhas | Cascatas Da Ribeira De Quelhas | overture waterfall | 328 | 0.93 | same name beyond the matcher radius: overture waterfall at 328 m |
| 5c6887e6e17910002cbe8a59 | 25 Fontes | 25 Fontes | overture waterfall | 174 | 1.00 | same name beyond the matcher radius: overture waterfall at 174 m |
| 6096835f48b58b66bd585830 | Cascatas do Lago de Valinhas | Valinhas | overture park | 333 | 0.90 | same name beyond the matcher radius: overture park at 333 m |
| 60ce5929bd0eee4f6dcc7c38 | Levada Nova |  |  |  |  | no name signal (only type words) |
| 62bf4c511c14f156cc441623 | Cascata Do Caldeirão | Barragem do Caldeirão | overture historical_landmark | 266 | 0.73 | same name beyond the matcher radius: overture historical_landmark at 266 m |
| 63f7ecc8bc97af583231de1f | Véu da Noiva | Véu da Noiva | overture waterfall | 109 | 1.00 | same name beyond the matcher radius: overture waterfall at 109 m |
| 644b7de6aed68036d77c6ee6 | Cascata Do Risco | Risco | overture hiking_area | 128 | 0.90 | same name beyond the matcher radius: overture hiking_area at 128 m |
| 644fff900305367f9585d6da | cascata do penedo furado |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 645000062e96003256eeae1e | cascata do penedo furado |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 64e8bfa7be99270679b69af6 | Fragas de Carcavelos | Fragas de Carcavelos | overture beach | 163 | 1.00 | same name beyond the matcher radius: overture beach at 163 m |
| 663e16196d0e2156c9cb8720 | Waterfall |  |  |  |  | no name signal (only type words) |
| 67ac8ae4bc69c86be7c8184f | Cascata Pedra Da Frida | Cascata da Pedra Ferida | overture waterfall | 248 | 0.84 | same name beyond the matcher radius: overture waterfall at 248 m |
| 69986c9d2e53186f3f4be05b | Cascata Pequena |  |  |  |  | no name signal (only type words) |

### `hot_spring` — 90 rows

Matched against: overture hot_spring 5, overture spa 3, overture historical_landmark 1.

Suspect because: same name beyond the matcher radius 9, same name as a served place of another kind 2, coordinates shared with 1 other archive row(s) 1, empty name 1.

Same name beyond the matcher radius, by served type: overture spa 2, overture historical_landmark 2, overture church 1, overture nature_preserve 1, overture hot_spring 1, overture bar 1, overture music_venue 1.

Same name as a served place of another kind, by served type: overture restaurant 1, overture bar 1.

#### Already served (matched) — sample of 9 of 9

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 0c543a36b2674f25ff058916 | Empresa das Caldas da Saude S.A. | Termas das Caldas da Saúde | overture spa | 19 | 0.81 | KAN-388 match: overture spa |
| 4de947667d8b02ee9f2bd4d2 | Termas de São Jorge | Termas de S. Jorge | overture spa | 6 | 0.94 | KAN-388 match: overture spa |
| 4df2498545dd4e26933bf667 | Água Dr. Miguel Henrique | Água Dr. Miguel Henrique | overture hot_spring | 0 | 1.00 | KAN-388 match: overture hot_spring |
| 4e15e2c71495a0bf953bb6e7 | Poça da Dona Beija | Poça da Dona Beija | overture hot_spring | 13 | 1.00 | KAN-388 match: overture hot_spring |
| 4f9bba1fe4b09fef530e034e | Termas de Caldelas | Termas de Caldelas | overture spa | 3 | 1.00 | KAN-388 match: overture spa |
| 4fbe4fe1e4b01fc167dc31b7 | Cucos - Torres Vedras | Cucos - Torres Vedras | overture hot_spring | 0 | 1.00 | KAN-388 match: overture hot_spring |
| 50e5d187e4b03cb7f4e3c557 | Campo Fumarolico das Caldeiras da Lagoa Furnas | Campo Fumarolico das Caldeiras da Lagoa Furnas | overture hot_spring | 0 | 1.00 | KAN-388 match: overture hot_spring |
| 67c6dca8598f570fb994a1e1 | Termas de Monção | Termas de Monção | overture hot_spring | 58 | 1.00 | KAN-388 match: overture hot_spring |
| 6862ca0c17a1cf3721960d33 | Fumarolas Lagoa Das Furnas | Caldeiras da Lagoa das Furnas | overture historical_landmark | 27 | 0.76 | KAN-388 match: overture historical_landmark |

#### Unique — sample of 30 of 68

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 17a397ee29d34bc52dd1243d | Termas Sulfurosas de Alcafache, S.A. | Alcafache | Business and Professional Services > Health and Beauty Service > Spa | no served counterpart within 400 m |
| 25a1e700f31f407113959c38 | Companhia das Águas Medicinais da Felgueira S.A. | Canas de Senhorim | Business and Professional Services > Health and Beauty Service > Spa | no served counterpart within 400 m |
| 4d85eef9f1e56ea87676938a | Termas Chaves | Chaves | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 4dd92b6eb0fb8af380b03423 | Águas da Pocinha | Caldas da Rainha | Landmarks and Outdoors > Scenic Lookout | no served counterpart within 400 m |
| 4de9094752b1741cdb11aae8 | Parque Terra Nostra | Furnas | Landmarks and Outdoors > Park | no served counterpart within 400 m |
| 4df24747fa76abc3d8683669 | Água do Padre José | Furnas | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 4e3015ced4c058fdbefa01e8 | Mata Nacional dos Medos | Almada | Landmarks and Outdoors > Park | no served counterpart within 400 m |
| 4ed2553abe7b9eece2444659 | Carvalhelhos |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 4f662fa0e4b09ff9be1ddf56 | Lombadas |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 4f8d7af5e4b009dda3ef8f5f | Carvalhelhos |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 4fa691b4e4b00cad8a0e37c0 | Fonte dos Olhos | Melides | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 4ff5d028e4b009b18e8cf79e | Edukart | Yellow Book | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 500be520e4b0c262438f8b30 | Fonte De Vila Do rei |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 502bd757e4b06a8c8413917e | Fonte da Ladeira dos Envendos |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 502fec33e4b00d67eeda10ba | Caldas de Carlão |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 50f16da8e4b0c0d3a6d80b77 | Caldas do Moledo |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 51c1b8fa498ed3ccc1a6189b | Termas de Cabeço de Vide |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 5308cb49498e4d1e0a2f131e | Monte da pedra |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 5324d702498e89a9939fc76b | fonte samil |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 5370e9b711d2607cd12335cf | SALUS |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 55b20f8d498e9b791508445e | Fonte do Passo |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 55df76c8498e2abd15286cc5 | Caldasde São Lourenço |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 566303e7498ee75e94cb27c1 | Caldeiras das Furnas | Furnas | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 56c9e76ecd1080d7a47bf594 | Fonte Preciosa |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 56ca185c498e8a0c74c50714 | Fonte Grande Alcalina |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 56ca1c79498eb620bdbfb6aa | Fonte D. Maria Pia |  | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 62bdfec6fdf04bc7948339e2 | Empresa das Águas Minero-Medicinais de Caldelas - Sociedade Anónima | Lisboa | Business and Professional Services > Health and Beauty Service > Spa | no served counterpart within 400 m |
| 66fd2c8dfa5fa8514e2a1970 | Zona Balnear Da Foz Das Coelhas | Nordeste | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| 684adbc27de5595fa968cce0 | Caldeira Grande | Furnas | Landmarks and Outdoors > Hot Spring | no served counterpart within 400 m |
| f9c33f5de589469879dfafd9 | Sociedade das Termas de Monchique Ii | Monchique | Business and Professional Services > Health and Beauty Service > Spa | no served counterpart within 400 m |

#### Suspect — sample of 13 of 13

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 2b503386f590495a8e90c2e6 | Sociedade de Turismo de Santa Maria da Feira S.A. | Igreja Matriz de Santa Maria da Feira | overture church | 148 | 0.73 | same name beyond the matcher radius: overture church at 148 m |
| 4b0588a3f964a5207fd122e3 | Garden Spa | Garden Spa | overture spa | 101 | 1.00 | same name beyond the matcher radius: overture spa at 101 m |
| 4c5c4d0b2815c92881a6b167 | Caldeira Velha | Caldeira velha | overture nature_preserve | 109 | 1.00 | same name beyond the matcher radius: overture nature_preserve at 109 m |
| 4d7cdb5f136bf04d7d40668d | Hotel Bienestar Termas de Monção | Termas de Monção | overture hot_spring | 195 | 0.90 | same name beyond the matcher radius: overture hot_spring at 195 m |
| 4df249c17d8b18e1722a50df | Água da Prata | Água da Prata | overture bar | 80 | 1.00 | same name beyond the matcher radius: overture bar at 80 m |
| 4fa02c97e4b074330422aae4 | Termas da Ferraria | Restaurante Da Ferraria | overture restaurant | 16 | 0.72 | same name as a served place of another kind: overture restaurant at 16 m |
| 4fbf724ce4b0cd44129e7889 | Furna do Enxofre | Furna Do Enxofre Caldeira, Graciosa | overture historical_landmark | 93 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 93 m |
| 50156ebae4b0be9af5dad733 | Fonte de Águas Quentes das  Termas de São Pedro do Sul | Festival da Água - Termas de São Pedro do Sul | overture music_venue | 325 | 0.75 | same name beyond the matcher radius: overture music_venue at 325 m |
| 501667fee4b0260c42edf056 | Termas do Cró |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 5130f6d0e4b0a0026a28c967 | Termas do carapacho | Termas do Carapacho | overture spa | 376 | 1.00 | same name beyond the matcher radius: overture spa at 376 m |
| 518be973498e7ebec3d58647 | Где-то на берегу океана |  |  |  |  | empty name |
| 519f357f498ec30978d1c06b | Caldas | Memórias nas Caldas | overture bar | 6 | 0.90 | same name as a served place of another kind: overture bar at 6 m |
| 5798db3c498ee504e5b07b95 | Ruínas Do Antigo Balneário Termal Do Cró | Ruínas do Antigo Balneário Termal | overture historical_landmark | 246 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 246 m |

### `island` — 67 rows

Matched against: overture beach 4, overture church 1, overture historical_landmark 1.

Suspect because: same name beyond the matcher radius 6, no name signal 2, coordinates shared with 1 other archive row(s) 2, name is the locality 1, empty name 1.

Same name beyond the matcher radius, by served type: overture beach 5, overture restaurant 1.

#### Already served (matched) — sample of 6 of 6

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4c319dd366e40f475748c58b | Ilha de Tavira | Ilha de Tavira | overture beach | 31 | 1.00 | KAN-388 match: overture beach |
| 4c9ddf99ca44236a19cf2499 | Ilha Deserta | Ilha Deserta | overture beach | 4 | 1.00 | KAN-388 match: overture beach |
| 51ec1962498ec6c2e4e5de4c | Ilha Deserta | Ilha Deserta | overture beach | 4 | 1.00 | KAN-388 match: overture beach |
| 51fe3f8c498edc757a472239 | Corvo | Igreja Matriz do Corvo | overture church | 59 | 0.90 | KAN-388 match: overture church |
| 5f2aaa4c1007ac701aeacfe0 | Ilha de Faro | Ilha de Faro | overture beach | 67 | 1.00 | KAN-388 match: overture beach |
| 6a2a7de93bd7572895b0a920 | Ilhéu De Cima | Farol do Ilhéu de Cima | overture historical_landmark | 16 | 0.90 | KAN-388 match: overture historical_landmark |

#### Unique — sample of 30 of 49

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 4c5017b01886c9b698921928 | Ilha da Berlenga | Peniche | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 4c6a943c3bad2d7fe8b7b2ee | Ilha da Armona | Olhão Municipality | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 4c7fd27be63376b02a9ba13d | Pico | Portugal | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 4e4fa33f45ddff0031c223af | Ilhéu da Viúva | Santana | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 5017947fe4b0a0721f8ad9fe | Deserta Grande |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 50c346b9e4b00ce4a445cfe8 | Casal D'Alvaro | Águeda | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 513c74c9e4b05d5c31ad7fac | Ilha da Morraçeira |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 5144c093e4b0b6e40a0c1df3 | Casal da Fonte |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 51c0e061498e29e850169a78 | Casa da Ilha da Armona | Ilha da Armona, Olhão | Travel and Transportation > Lodging > Vacation Rental | no served counterpart within 400 m |
| 525d367211d20416c70a5603 | Relax |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 52cbf42a498e1c17396da62c | Ilha de São Miguel | Ponta Delgado | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 53dbfa19498e6dfadda82a67 | Açores |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 54391059498e5113f87bf090 | Em alto mar |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 55972237498e7e817f3cc047 | Valinha |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 56f7f754498e310539835d44 | Urbanização Campos Verdes |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 57950d19498e68dfd62a7ff9 | Ilha russa de troia | Setubal | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 589738f38ae36338500878ac | Coitos |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 591276cab6eedb0a04f572f0 | salinas de aveiro | aveiro | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 5c75c79567af3a002ca685c1 | Ilha De Cash | Gião | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 5cd86207c9f907002cbc09dc | Ilhéu Mole | Porto Moniz | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 5ceae799b399f7002c850aa5 | Ilha dos Amores | Oeiras | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 5cfff3bf97e16900259ed778 | Capim Canela | Gião | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 5d0a41a335517500302c9f9c | Ze. Asteolo | Moreira | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 60fba57ca5281a69206050ea | Fars Iran | Faro | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 61030f93e052015f728bbe5f | Beato Island | Lisboa | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 64aa822deb4f164bf413e6b3 | Deserta | Lagoa | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 64f47f846efeb05c11629bd1 | Ilheu Das Mocas |  | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 67c4661cc32f28051fe6be9a | Ilheu de Santa Cruz | Santa Cruz | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 692aded56f4cf132fac2feed | Ilhas Azores | Lajes | Landmarks and Outdoors > Island | no served counterpart within 400 m |
| 6a720038363bcd3a9f767f87 | Ilhéu do Romeiro | Vila do Porto | Landmarks and Outdoors > Other Great Outdoors | no served counterpart within 400 m |

#### Suspect — sample of 12 of 12

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 4c03f4baf56c2d7fe88f1d66 | Porto Santo |  |  |  |  | name is the locality |
| 4c39fb886ec69c748e1805a9 | Ilha da Fuseta | Ilha Da Fuseta-Olhão | overture beach | 119 | 0.90 | same name beyond the matcher radius: overture beach at 119 m |
| 4c6ba2ce9c76d13a50984e0f | Ilha do Farol | Restaurante / Bar Mar de Sta Maria Associação da Ilha do Farol | overture restaurant | 208 | 0.90 | no name signal (only type words) |
| 5027e171e4b00b8fab8d4a19 | Ilha Dos Amores | Ilha Dos Amores - Praia Do Castelo | overture beach | 159 | 0.90 | same name beyond the matcher radius: overture beach at 159 m |
| 5220cb9511d2113fc43917d4 | Ilha da Culatra | A Taska da Culatra | overture restaurant | 333 | 0.73 | same name beyond the matcher radius: overture restaurant at 333 m |
| 5246f2d7498eb270b7d50904 | Praia do Homem Nu | Praia do Homem Nu | overture beach | 234 | 1.00 | same name beyond the matcher radius: overture beach at 234 m |
| 52815a2c11d2fd347523d0ed | A Ilha | Ilha Ciao Bella | overture restaurant | 9 | 0.72 | no name signal (only type words) |
| 5973675246e1b64b6b0f7bfd | Hangares | Ilha dos Hangares | overture beach | 123 | 0.90 | same name beyond the matcher radius: overture beach at 123 m |
| 5c75c75ad03360002ce7ccee | Ilha De Coin |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 5cc9e1e3270ee7003916e8f7 | Islands |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 62e51cb19986576c1beeed01 | Ilha Da Fuseta | Praia da Fuzeta | overture beach | 319 | 0.76 | same name beyond the matcher radius: overture beach at 319 m |
| 68bc99f7385c220ed14d24dc | Мадейра |  |  |  |  | empty name |

### `bank` — 3,771 rows

Matched against: overture bank 1,074, overture post 5, curated bank 1, overture currency_exchange 1.

Suspect because: defunct brand name 443, same name beyond the matcher radius 264, coordinates shared with 1 other archive row(s) 59, same name as a served place of another kind 24, archive twin within 20 m 14, coordinates shared with 2 other archive row(s) 5, no name signal 3, coordinates shared with 3 other archive row(s) 2.

Same name beyond the matcher radius, by served type: overture bank 194, overture store 14, overture restaurant 8, overture historical_landmark 7, overture church 6, overture supermarket 5, overture bakery 3, overture cafe 3, overture park 3, overture school 2, overture music_venue 2, overture gas 2, overture bar 2, overture nature_preserve 1, curated bank 1, overture amusement_park 1, overture gym 1, overture florist 1, overture library 1, overture theatre 1, overture river 1, overture post 1, overture veterinary_care 1, overture cemetery 1, overture plaza 1, overture bridge 1.

Same name as a served place of another kind, by served type: overture store 9, overture restaurant 4, overture bakery 2, overture plaza 1, overture historical_landmark 1, overture school 1, overture beach 1, overture gas 1, overture spa 1, overture mini_market 1, overture church 1, overture music_venue 1.

#### Already served (matched) — sample of 30 of 1,081

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 16f80fdcf19a1174ae221173 | Banco Montepio | Banco Montepio | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 3a06fa81f07ad914edabd66f | Banco Montepio | Banco Montepio | overture bank | 23 | 1.00 | KAN-388 match: overture bank |
| 3b3846719a64d6f823eff994 | Banco Montepio | Banco Montepio | overture bank | 2 | 1.00 | KAN-388 match: overture bank |
| 4b67c13cac6abe4e930dffd8 | Banco Montepio | Banco Montepio | overture bank | 29 | 1.00 | KAN-388 match: overture bank |
| 4d885c82d9305941cf00c769 | Millenium BCP (Quinta das Conchas) | Millenium BCP (Quinta das Conchas) | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 4da0457ebb206ea8968cd7fd | Millennium BCP | Millennium BCP | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 4dbdaa3e4b222080d3aee855 | Banco Montepio | Banco Montepio | overture bank | 24 | 1.00 | KAN-388 match: overture bank |
| 4dedf9ca52b13dda25ec65e9 | Caixa Geral de Depósitos | Caixa Geral de Depósitos | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 4ec23b2861af06192c548366 | Millennium Bcp Estefânia | Millennium Bcp Estefânia | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 4ee5de050e61681b9788386c | Santander Totta | Santander Totta | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 4fed8fa7e4b0ac0d2e8a70c5 | Millennium BCP - Foz | Millennium BCP - Foz | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 4ff2aef2e4b0044cf019adb9 | Banco Montepio | Banco Montepio | overture bank | 4 | 1.00 | KAN-388 match: overture bank |
| 504759e6e4b09309f71ad6be | Santander Totta | Santander Totta | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 52598bd911d2c92f29737e5f | Montepio | Banco Montepio | overture bank | 21 | 0.90 | KAN-388 match: overture bank |
| 53391af5498e2879f7d9a0d6 | Deutsche Bank | Deutsche Bank | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 53749a74498edc3b78706504 | Caixa Geral Depositos Rebordosa | Caixa Geral Depositos Rebordosa | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 53da32e1498e723a09e19082 | Caixa Geral de Depósitos (Columbano) | Caixa Geral de Depósitos (Columbano) | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 623bb19d0b95857f170e043f | Banco Montepio | Banco Montepio | overture bank | 67 | 1.00 | KAN-388 match: overture bank |
| 623bb19e0c305439aafdde18 | Banco Montepio | Banco Montepio | overture bank | 10 | 1.00 | KAN-388 match: overture bank |
| 623bb1b104dc985f54904c58 | Banco Montepio | Banco Montepio | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 623bb1bc96e2321ccb2e6912 | Banco Montepio | Banco Montepio | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 623bb1c4002bfb70985896da | Banco Montepio | Banco Montepio | overture bank | 10 | 1.00 | KAN-388 match: overture bank |
| 623bb1d09e4cc65f12a74840 | Banco Montepio | Banco Montepio | overture bank | 5 | 1.00 | KAN-388 match: overture bank |
| 623cf15279aadf08225ae543 | Banco Montepio | Banco Montepio | overture bank | 1 | 1.00 | KAN-388 match: overture bank |
| 623cf16ebe9e5b59bd577a13 | Banco Montepio | Banco Montepio | overture bank | 7 | 1.00 | KAN-388 match: overture bank |
| 6250f664f8a266118712d00a | Banco Montepio | Banco Montepio | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| 7f16d2c9efba4334da7c5ec5 | Novo Banco, Bucelas | novobanco Bucelas | overture bank | 23 | 0.97 | KAN-388 match: overture bank |
| 8902d89b6600612d2dcbdf6e | Banco Montepio | Banco Montepio | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| b25eae7a7df84e23a6c6f046 | Société Générale | Société Générale | overture bank | 0 | 1.00 | KAN-388 match: overture bank |
| fdf9588e4be0439029de3a8d | Banco BPI | Banco BPI | overture bank | 0 | 1.00 | KAN-388 match: overture bank |

#### Unique — sample of 30 of 1,876

| fsq_place_id | name | locality | Foursquare label | note |
|---|---|---|---|---|
| 0f3bd1e39afe466894458b8e | Novo Banco | Lordelo | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 23fa50362742b5c310c1a20e | Banco Montepio | Samora correia | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4d2daa41feaaa1cd5175ea90 | Novo Banco | Aveiro | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4d52a557747f6dcbaa20cfd4 | Santander Totta | Quinta do Conde | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4e36d488091acf697d03b835 | Millennium BCP | Guimarães | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4ea01bc602d54bd975d49303 | Santander Totta | Caminha | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4ea03dace5fa13c70e6be569 | Cgd Valença | Valença | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4eba8909cc21a9a7a1e9750c | Millenium BCP | Paredes | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4f464f03e4b00441a3625a7f | Caixa Agrícola de Salir | Salir | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4fc97df3e4b0b3f167185358 | Montepio Geral |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4fda4595e4b017a343f4e13a | Millenium BCP - Coimbrões |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 4ffaa547e4b0fe7c228175a9 | Santander Totta | Santa Cruz | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 503a71b0e4b08256fbbc8b2d | montepio |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 50551972e4b0e7a977d642b3 | BancoBIC | Porto | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 50a25f41e4b0bc18dedd1495 | Crédito Agricola |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 50bc8129e4b01518223c47ae | Millennium BCP | Porto | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 512c9d97e4b055b6b472886c | Novo Banco | Carnide | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 513fa9e7e4b040803b393c5e | Banco BPI | Coimbra | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 517654f8e4b0d22e511836d8 | BPI |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 5240031011d211d463a600a1 | Caixa Geral Depositos | Caminha | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 53540543498e79f744c35cc0 | peromo | maximinos | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 54a16bdd498e8a88a0b7b85b | Novo Banco |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 552ce063498e1b499260c245 | CGD | Fajã De Cima | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 56eea4b4498e0ec383e40593 | montepio |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 572c96b3498e6a242203137b | CGD |  | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 57d13b81498ef566a9153d94 | CA Crédito Agrícola | Olhão | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 5b696de4f427de003963c9a3 | Santander Totta | Cascais | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 660d1e70d86866445d94981d | Millennium bcp | Mealhada | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 91b6eeea4f9d4dfbd7019347 | Novo Banco, Nogueira-Braga | Braga | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |
| 9be17dc381534ed899936bcd | Caixa de Credito Agricola Mutuo de Aljustrel e Almodôvar, Crl | Aljustrel | Business and Professional Services > Financial Service > Banking and Finance > Bank | no served counterpart within 400 m |

#### Suspect — sample of 30 of 814

| fsq_place_id | archive name | served name | source / type | m | sim | note |
|---|---|---|---|---:|---:|---|
| 131d725c5af317df56fdcda0 | Banco Montepio | Banco Montepio | overture bank | 119 | 1.00 | same name beyond the matcher radius: overture bank at 119 m |
| 365f2e6ac4a06cc18da6b0a0 | Banco Montepio | Banco Montepio | overture bank | 126 | 1.00 | same name beyond the matcher radius: overture bank at 126 m |
| 4d55374548ea6ea89274d2a3 | Banco Popular |  |  |  |  | defunct brand name: banco popular → Santander (2018) |
| 4d76d1cef3572c0ff9bf036c | BANIF São Martinho |  |  |  |  | defunct brand name: banif → Santander (2015) |
| 4d89e053bc848cfa10dbcb2b | BES |  |  |  |  | defunct brand name: bes → Novo Banco (2014) |
| 4e294824d22d848a146b6ec6 | Banif Maia |  |  |  |  | defunct brand name: banif → Santander (2015) |
| 4e8a0a1b02d5abeb1f611e95 | Deutche Bank, 5 de Outubro |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 4e9ab7239adf277db7c89abf | BES Reguengos Monsaraz |  |  |  |  | defunct brand name: bes → Novo Banco (2014) |
| 4f33fba0e4b0cd90f7124e25 | Banco Espírito Santo (Sede) |  |  |  |  | defunct brand name: banco espirito santo → Novo Banco (2014) |
| 4fa56fdde4b089a95a586918 | BES - Cedofeita |  |  |  |  | defunct brand name: bes → Novo Banco (2014) |
| 4fc38eb1e4b0bb643fe4bac5 | Banif |  |  |  |  | defunct brand name: banif → Santander (2015) |
| 4fdb5ce2d5fbc8d7acce7000 | Banco Espírito Santo |  |  |  |  | defunct brand name: banco espirito santo → Novo Banco (2014) |
| 502a55f1e4b0e1a0d370e564 | Barclays Avenida |  |  |  |  | defunct brand name: barclays → Bankinter (2016) |
| 5044cb2be4b0aa9bdcfa7f5f | BPN |  |  |  |  | defunct brand name: bpn → ABANCA (2012) |
| 508c2a53e4b03c5c3a2b33b8 | Millenium BCP Amial | Amial | overture historical_landmark | 221 | 0.90 | same name beyond the matcher radius: overture historical_landmark at 221 m |
| 509ceacee4b0c4d83b26543f | Banif |  |  |  |  | defunct brand name: banif → Santander (2015) |
| 50bf2980e4b06e3ca6d99d37 | Banco BIC Vila Praia De Âncora | novobanco Vila Praia da Âncora | overture bank | 337 | 0.83 | same name beyond the matcher radius: overture bank at 337 m |
| 512e19d9e4b0f94739caac72 | Banif |  |  |  |  | defunct brand name: banif → Santander (2015) |
| 515c639de4b0e4dc2fa4d7ef | Barclays Carregado |  |  |  |  | defunct brand name: barclays → Bankinter (2016) |
| 5183c3e3498e0bfd1b63a6f1 | Banco Popular |  |  |  |  | defunct brand name: banco popular → Santander (2018) |
| 5190fb91498e977f6064713a | BES Castro Daire | CMC - Castro Daire | overture theatre | 322 | 0.81 | defunct brand name: bes → Novo Banco (2014) |
| 527cf10f11d24b9ee17bb400 | Banco BES |  |  |  |  | defunct brand name: bes → Novo Banco (2014) |
| 54d0b619498e9591c58d5e03 | Banco Montepio | Banco Montepio | overture bank | 272 | 1.00 | same name beyond the matcher radius: overture bank at 272 m |
| 5730433e498e47f58419a827 | BPI Quinta Do Conde | Pano Branco Quinta do Conde | overture store | 64 | 0.74 | same name as a served place of another kind: overture store at 64 m |
| 581afccf58bdcf185e98e987 | CGD Agência Praça Da Alegria | Praça da Alegria | overture plaza | 115 | 0.90 | same name beyond the matcher radius: overture plaza at 115 m |
| 591f0db82d2fd91380ecdf7b | Bankinter | Bankinter | overture bank | 125 | 1.00 | same name beyond the matcher radius: overture bank at 125 m |
| 5f34164d6419c108d285fdf7 | Novo Banco |  |  |  |  | coordinates shared with 1 other archive row(s) |
| 623bb1930b95857f170debf4 | Banco Montepio | Banco Montepio | overture bank | 193 | 1.00 | same name beyond the matcher radius: overture bank at 193 m |
| 623bb1cdd5af040e51f7f659 | Banco Montepio | Banco Montepio | overture bank | 170 | 1.00 | same name beyond the matcher radius: overture bank at 170 m |
| 7a82c205748948555639dd16 | Finibanco S.A. |  |  |  |  | defunct brand name: finibanco → Montepio (2011) |

## `poi_source_correction` rows keyed on Foursquare ids

| fsq_place_id | visible | name_override | review_note | in archive as | bucket | what KAN-433 would need |
|---|---:|---|---|---|---|---|
| 46e421197ffd4f74e3ea1a26 | 0 |  | Venue closed; paired OSM node/5381704191 is excluded. | not a candidate-type row | — | nothing — the row is outside the recovery scope; the correction stays as the record of a past decision |
| 4c291f8a9eb195219ea92959 | 0 |  | Replaced by OSM node/5381704347 Jet7. | not a candidate-type row | — | nothing — the row is outside the recovery scope; the correction stays as the record of a past decision |
| 5d65267d486e48000891c68d | 0 |  | Replaced by OSM way/1183904594, approved name Lagar. | not a candidate-type row | — | nothing — the row is outside the recovery scope; the correction stays as the record of a past decision |
| c86d182b907f439eeccd2fc0 | 0 |  | Replaced by OSM node/5381704212 Carnes Simões. | not a candidate-type row | — | nothing — the row is outside the recovery scope; the correction stays as the record of a past decision |
| e4eb1689e21f4a413995156f | 0 |  | Replaced by OSM way/1183904594, approved name Lagar. | not a candidate-type row | — | nothing — the row is outside the recovery scope; the correction stays as the record of a past decision |

## Reading the numbers

Three things the counts above do not say on their own.

**"Matched" undercounts duplicates for outdoor features.** The KAN-388 matcher
was measured on shops, at 75 m. Viewpoints, trails and harbours are geocoded
loosely by both sources — a "Miradouro do Castelo" 180 m from Overture's
"Miradouro do Castelo" is the same lookout — so the *same name beyond the
matcher radius* suspects (viewpoint 130, plaza 109, marina 51, surf_spot 50,
hiking_area 49, bridge 39) are mostly duplicates the matcher's radius is too
tight to see. KAN-433 should treat that bucket as *skip*, not as *import*,
and not loosen the matcher to reach it: the KAN-444 ladder already showed that
a wider radius needs a shared distinctive word, and this preflight applies
that guard to the far bucket already.

**The landmark family is wide on purpose, and it has a known false positive.**
A viewpoint matched to an Overture `church` (25), an island to `Igreja Matriz
do Corvo`, a surf spot to a `beach` (47): the first two are a chapel or church
*named after* the place, which the app would show once either way; the last
is a real question — Overture serves the beach, not a surf spot, and a
"go surfing" task tagged `surf_spot` will not find a `beach` row. Those 47 are
listed under `surf_spot` and need a decision, not an import rule.

**"Unique" is not "real".** The 30-row samples are the point of this report:
each type's unique bucket carries a visible share of things that are not
places of that type (a cave under `viewpoint`, kids' play centres under
`tourist_attraction`, streets and villages under `plaza`, surf schools and
`Zarautz` — in Spain — under `surf_spot`, `Fars Iran` and `Relax` under
`island`). The suspect rules catch the mechanical cases (no name signal,
toponym, shared coordinates); they cannot catch a wrong-but-plausible name.
Import of any type below means import of its unique bucket *with* the
hand-check the sample shows is needed.

## Findings the ticket did not anticipate

1. **`category_ids.py` extracts on `also` ids that `classify_and_load.py`
   never classifies.** `build_reverse_map` reads only the primary
   `category_id`. For this list it matters twice: `botanical_garden` has 34
   archive rows by its own leaf and **1,102 more** carrying only `Garden` /
   `Sculpture Garden` (the "776 botanical gardens" of the provisional gap
   list was this), and `plaza` has 117 `Pedestrian Plaza`-only rows. Those
   1,219 rows were extracted, then skipped as untyped. Whether `Garden`
   should be `botanical_garden`, `park`, or nothing is a mapping decision
   that precedes any import.
2. **Foursquare's `Attraction` is not a tourist attraction.** Its full path is
   `Arts and Entertainment > Amusement Park > Attraction`: the 97 rows are
   bumper cars, indoor play centres, Gymboree, a ferris wheel. Ten of them
   match Overture `amusement_park`/`park`/`zoo` rows. The `tourist_attraction`
   "hard gap" (0 in Overture) is a mapping error on our side, not a gap.
3. **The "377 mosques" did not come from this archive.** The archive holds
   17 rows under `Mosque`; the classifier produces 17 mosques from it. The
   number must have come from another source or an earlier name rule; there
   is nothing to recover and nothing to let go here.
4. **443 of the archive's bank rows carry a brand that stopped trading
   between 2011 and 2018** (Banif, BES, BPN, Finibanco, Barclays, Banco
   Popular, Deutsche Bank retail). `brandDictionary.json` folds each into its
   successor, so an importer would silently create a "Santander" from a
   2014 BANIF check-in. That is the clearest sign that the archive's bank
   layer is a decade old: Portuguese banks closed roughly four in ten
   branches over the same period, and a row with no served counterpart is
   as likely to be a closed branch as a missing one.
5. **`poi_source_correction` has five Foursquare-keyed rows, none in a
   candidate type.** All are `visible = 0` from the KAN-386 OSM replacement
   work. KAN-433 has nothing to re-point; they stay as the record of a past
   decision. Any importer should still honour them as a skip-list.
6. **Curated rows of the candidate types: 3.** The curated layer is not a
   factor for these types today.

## Recommendation per type

| type | archive | unique | recommendation |
|---|---:|---:|---|
| `viewpoint` | 1,585 | 989 | **Import**, after skipping the 130 far same-name rows and the 44 no-signal rows. This is the one genuine hard gap: Overture has no viewpoint category and files the ones it has as `historical_landmark`/`mountain`. The unique sample is overwhelmingly real "Miradouro de …" names with a small tail of noise (a cave, a geodetic marker, a private "spot"). Expect to hand-drop roughly one in ten. |
| `tourist_attraction` | 97 | 76 | **Do not import.** Wrong leaf — see finding 2. If the app wants an "attraction" type, it needs a different source and a different definition. |
| `hiking_area` | 583 | 415 | **Import**, with the far bucket skipped. Overture already serves 198 trails and matched 75 of ours; the unique rows are PR-coded trails, levadas and passadiços that Overture lacks. Noise is campsites, cycle paths and one Dutch sentence — visible in the sample, hand-droppable. |
| `plaza` | 1,132 | 555 | **Needs a closer look.** The rows are mostly real squares (Largo/Praça/Terreiro), so the "1,000 plazas" are not a classifier artefact — Foursquare users check in at squares. The question is whether a plaza is an errand place at all: Overture serves 491 already, matched 286 of ours, and the unique sample is one-third streets, roundabouts, car parks and villages. If plazas stay a taggable type, import only names beginning with a square word (praça, largo, terreiro, rossio, campo) and skip the rest. |
| `botanical_garden` | 34 | 16 | **Import the 16**, and decide the `Garden` mapping first (finding 1). 1,102 gardens sit untyped in the archive; most are municipal gardens Overture serves as `park`. |
| `bridge` | 355 | 203 | **Import**, far bucket skipped. Real bridges, thirteen "Ponte Romana" among them — those are distinct places and the distance keeps them apart. |
| `marina` | 336 | 223 | **Import with care.** Foursquare's leaf is "Harbor or Marina": fishing ports, docks and quays alongside marinas. The unique rows are real waterfront places; whether a fishing port answers a `marina` task is the app's call. The 18 "same name as a served place of another kind" rows are restaurants and clubs named after the harbour — skip. |
| `surf_spot` | 343 | 161 | **Needs a closer look.** Two things are tangled: 47 surf spots Overture serves as `beach` (decision: is a served beach enough?), and a unique bucket that is half surf *schools* and camps (businesses, some with no fixed spot) plus `Atlantic Ocean` ×3 and `Zarautz` ×2. If imported, restrict to names that are beaches or breaks, not schools. |
| `lighthouse` | 138 | 67 | **Import.** Overture has 35 of ours; the unique rows are "Farol de …" names. Small, clean. |
| `waterfall` | 102 | 72 | **Import.** Clean names (cascata, poço), Overture thin. |
| `hot_spring` | 90 | 68 | **Needs a closer look.** The leaf is used for mineral-water springs (`Fonte …`) and for the spa companies that run them (`Sociedade das Termas de Monchique II`, `Empresa das Águas …`). Perhaps twenty are hot springs a person can visit. Hand-pick rather than import. |
| `island` | 67 | 49 | **Do not import as-is.** Half the unique bucket is not an island (`Fars Iran`, `Relax`, `Urbanização Campos Verdes`, `Ilha De Cash`); the real ones (Berlenga, Armona, São Miguel, Deserta) are a dozen and can be hand-entered as curated rows if the type is wanted. |
| `bank` | 3,771 | 1,876 | **Do not import blind.** The gap is real — rural branches of Montepio, CGD, BCP, BPI and Crédito Agrícola with no served counterpart — but the layer is stale (finding 4) and there is no way, from the archive alone, to tell a missing branch from a closed one. If KAN-433 imports banks, it should be brand-dictionary rows only, never a defunct name, and with an explicit "unverified since 2020" mark that KAN-458's OSM-fallback measurement or a branch-locator check can later clear. `atm` stays excluded; the 41 bank rows the classifier itself retypes to `atm` go with it. |

## What KAN-433 should carry from here

* Skip-list, in order: `poi_source_correction` Foursquare ids (5); every
  archive row in a *matched* bucket; every *same name beyond the matcher
  radius* row; every *defunct brand* row.
* Provenance on each curated row: `origin_source = foursquare_os_places`,
  `origin_id = fsq_place_id`, `origin_licence = Apache-2.0`, `import_run_id`
  = this report's run. The unique index from KAN-452 makes a re-run a no-op.
* Re-run this preflight after the import: every imported row must then land
  in *matched*, and the unique count for each imported type must drop to the
  hand-dropped noise and nothing else. That is the duplicate-rate check
  KAN-433's acceptance asks for, measured rather than assumed.
