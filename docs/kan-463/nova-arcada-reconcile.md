# Nova Arcada reconcile — KAN-463, applied 2026-11-12

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0070_kan463_braga.sql (types corrected by 0071_kan463_review_fixes.sql)`, and verified through `POST /poi/nearby`: all 96 listed units are served, and none of the 18 withdrawn rows is.

## Inputs

* `mall_lists/nova_arcada.txt` — the operator's 96 units, read from novaarcada.pt 2026-11-12
* `mall_lists/nova_arcada_types.tsv` — the typing of every unit, with its evidence
* held rows inside the 75 m buffer of OSM `way/55617020`, the landuse outline holding the mall and its retail park
* far rows: within Braga carrying "Nova Arcada" in name or address
* OSM shops in the same box, to place the units we did not hold

## Withdrawn (18)

| row | name | why |
|---|---|---|
| `7f06ff1e-f964-4609-8183-079e582c0299` | Burger King Nova Arcada | same shop as listed 'BURGER KING', held twice; the other row kept |
| `e46dc4b7-093f-4f29-8be6-ded04a2541e4` | Wok To Walk Nova Arcada | same shop as listed 'WOK TO WALK', held twice; the other row kept |
| `96362a30-fca1-44f4-a712-8cff2d8c1b75` | Salsa | listed 'SALSA' pinned 324 m outside Nova Arcada; the unit is served from a row inside |
| `04144c5d-2531-4647-ba63-dabc3d16c774` | A Loja do Gato Preto | not on the Nova Arcada tenant list |
| `0900120d-a6c5-4e5c-93c4-aad0ba4baef7` | Calçado Guimarães | not on the Nova Arcada tenant list |
| `145d3320-b50e-4afa-a88c-50cb48c31d72` | Sunglass Hut | not on the Nova Arcada tenant list |
| `22e9dd3d-6485-4788-af87-f7e85d87159b` | Home Nut | not on the Nova Arcada tenant list |
| `305a74b9-4c8b-4ec8-a23c-77e521aeb56a` | Cacifo Locky | not on the Nova Arcada tenant list |
| `34797d85-5f1b-4fe4-bdcf-2a44d277b5ce` | Cinemas Cineplace | not on the Nova Arcada tenant list |
| `5350c76b-fe9b-4b35-9cd9-9d9fa9ca5a7a` | Leonidas | not on the Nova Arcada tenant list |
| `592f5815-b401-402f-944c-3d3be39228e4` | MASS Perfumarias | not on the Nova Arcada tenant list |
| `8f6ca14d-fb88-4a84-b938-c542a2d063d5` | Kalorias Braga | not on the Nova Arcada tenant list |
| `909f6e66-329e-4440-bf58-3f7c495b7b24` | Kivet Clínicas Veterinarias | not on the Nova Arcada tenant list |
| `af039e79-d97b-4c65-91dc-221ed615d241` | Blukids | not on the Nova Arcada tenant list |
| `c11009d1-4dee-4363-9c6a-ec016943ac51` | DeGema Hamburgueria | not on the Nova Arcada tenant list |
| `c80c3673-be72-47a5-a853-393883cdd46e` | Agrikolage | not on the Nova Arcada tenant list |
| `e1b7a8df-eb77-4f43-b636-2c41e82aa046` | Leitão & Espumante | not on the Nova Arcada tenant list |
| `eb8e058d-9d0f-4e00-8c01-8a32914d8e18` | Nova Arcada | not on the Nova Arcada tenant list |

## Kept — neighbours (0)


## Held — the row answering each unit, given the list's type and floor (41)

| listed | held row |
|---|---|
| BERSHKA | Bershka |
| BURGER KING | Burger King |
| CONTINENTE | Continente |
| D’ORO JÓIAS | D'Oro Jóias |
| FLYING TIGER COPENHAGEN | Flying Tiger Copenhagen |
| H&M | H&M |
| HEBE GYROS | HeBe Gyros |
| IKEA | IKEA |
| JD SPORTS | JD Sports |
| JYSK | JYSK |
| KFC | KFC |
| KIKO MILANO | Kiko Milano |
| KIWOKO | Kiwoko. Mundo Animal |
| LA CASA DE LAS CARCASAS | La Casa de las Carcasas |
| LA ROTISSERIE | La Rotisserie |
| LANIDOR | Lanidor Woman |
| LEFTIES | Lefties Nova Arcada |
| LEVI’S | Levi Strauss & Co. |
| MAYORAL | Mayoral - Loja de Roupa Infantil e Bebés |
| MULTIOPTICAS | Ópticas MultiOpticas Nova Arcada Braga |
| NEW YORKER | New Yorker |
| Opticália Premium | Opticalia Nova Arcada |
| PANDORA | Pandora |
| PARFOIS | Parfois |
| PEPCO | Pepco |
| PIZZA HUT | Pizza Hut |
| PROF | PROF |
| PULL & BEAR | Pull & Bear |
| RITUALS | Rituals |
| SALSA | Salsa |
| SMK DENIM&CO. | Smk Denim&Co. |
| SPORT ZONE | Sport Zone Braga Nova Arcada |
| SPRINGFIELD | Springfield |
| STRADIVARIUS | Stradivarius |
| TENTAÇÕES DO NORTE | Tentações do Norte |
| TIFFOSI | Tiffosi |
| TOUS | Tous |
| TOYS “R” US | Toys"R"Us & Prénatal |
| VITAMINAS | Vitaminas C.C. Nova Arcada |
| WOK TO WALK | Wok to Walk |
| WORTEN | Worten |

## Written into curated_poi (55)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| 1920 Barber Shop | `mall:nova_arcada:1920-barber-shop` | centre | 0 | barber |
| Açaí Natura | `mall:nova_arcada:acai-natura` | centre | 0 | restaurant |
| ACIUM | `mall:nova_arcada:acium` | centre | 0 | store / jewelry |
| Arcádia – Casa do Chocolate | `mall:nova_arcada:arcadia-casa-do-chocolate` | centre | 1 | bakery |
| AURYA | `mall:nova_arcada:aurya` | centre | 0 | store / beauty |
| B STRONG | `mall:nova_arcada:b-strong` | centre | 1 | store / shoes |
| BERTRAND LIVREIROS | `mall:nova_arcada:bertrand-livreiros` | osm | 0 | store / books |
| CADETEWASH | `mall:nova_arcada:cadetewash` | centre | -1 | car_wash |
| Casa das Bolas de Berlim | `mall:nova_arcada:casa-das-bolas-de-berlim` | centre | 2 | bakery |
| Cavalinho | `mall:nova_arcada:cavalinho` | centre | 1 | store / handbag |
| CBWEED | `mall:nova_arcada:cbweed` | centre | 0 | store / beauty |
| CELEIRO | `mall:nova_arcada:celeiro` | osm | 0 | supermarket |
| CINEBOX PREMIUM CINEMAS | `mall:nova_arcada:cinebox-premium-cinemas` | centre | 2 | movie_theater |
| COFFEE & SOFT | `mall:nova_arcada:coffee-soft` | centre | 0 | cafe |
| COLCHAONET | `mall:nova_arcada:colchaonet` | centre | 0 | store / mattress |
| CORTEFIEL | `mall:nova_arcada:cortefiel` | osm | 1 | store / clothing |
| ESPAÇO CASA | `mall:nova_arcada:espaco-casa` | osm | 0 | store / home |
| FITNESS PARK | `mall:nova_arcada:fitness-park` | centre | 2 | gym |
| FORTE Store | `mall:nova_arcada:forte-store` | centre | 1 | store / clothing |
| FORTE STORE KIDS | `mall:nova_arcada:forte-store-kids` | centre | 1 | store / clothing |
| H3 – NEW HAMBURGOLOGY | `mall:nova_arcada:h3-new-hamburgology` | centre | 2 | restaurant |
| HIMÁ ORIENTAL TASTE | `mall:nova_arcada:hima-oriental-taste` | centre | 2 | restaurant |
| HOSPITAL TROFA SAÚDE | `mall:nova_arcada:hospital-trofa-saude` | centre | 0 | hospital |
| INTIMISSIMI | `mall:nova_arcada:intimissimi` | osm | 0 | store / clothing |
| ISERVICES | `mall:nova_arcada:iservices` | centre | 0 | phone_repair |
| ISTORE | `mall:nova_arcada:istore` | centre | 0 | store / electronics |
| Lugar da Jóia | `mall:nova_arcada:lugar-da-joia` | centre | 0 | store / jewelry |
| MAISON CROISSANT | `mall:nova_arcada:maison-croissant` | centre | 2 | bakery |
| MEO | `mall:nova_arcada:meo` | osm | 0 | store / phone |
| MIDAS | `mall:nova_arcada:midas` | osm | 0 | store / auto_parts_and_supply |
| MO | `mall:nova_arcada:mo` | centre | 0 | store / clothing |
| MUNDO DO CAFÉ | `mall:nova_arcada:mundo-do-cafe` | centre | 2 | cafe |
| NATURA | `mall:nova_arcada:natura` | centre | 0 | store / clothing |
| NORMAL | `mall:nova_arcada:normal` | osm | 0 | store / discount_store |
| NOS | `mall:nova_arcada:nos` | osm | 0 | store / phone |
| NP4GAME | `mall:nova_arcada:np4game` | centre | 0 | store / video_game |
| O BOTICÁRIO | `mall:nova_arcada:o-boticario` | osm | 0 | store / beauty |
| OAKBERRY | `mall:nova_arcada:oakberry` | centre | 2 | juice |
| PERFUMES & COMPANHIA | `mall:nova_arcada:perfumes-companhia` | centre | 0 | store / beauty |
| Playground – Luna Kids | `mall:nova_arcada:playground-luna-kids` | osm | 2 | playground |
| PLURICOSMÉTICA | `mall:nova_arcada:pluricosmetica` | centre | 0 | store / beauty |
| PRIMOR | `mall:nova_arcada:primor` | osm | 1 | store / beauty |
| SACOOR BLUE | `mall:nova_arcada:sacoor-blue` | centre | 1 | store / clothing |
| SANJAM | `mall:nova_arcada:sanjam` | centre | 0 | hairdresser |
| SEASIDE | `mall:nova_arcada:seaside` | osm | 0 | store / shoes |
| SECRET PACK | `mall:nova_arcada:secret-pack` | centre | 1 | store / gift |
| SOLÁRIO PAREDÃO | `mall:nova_arcada:solario-paredao` | centre | 2 | beauty_salon |
| Sould Park Bowling | `mall:nova_arcada:sould-park-bowling` | centre | 2 | bowling_alley |
| Taco Bell | `mall:nova_arcada:taco-bell` | osm | 2 | restaurant |
| TOMATINO | `mall:nova_arcada:tomatino` | centre | 2 | restaurant |
| VILANOVA | `mall:nova_arcada:vilanova` | centre | 1 | store / fashion_accessories |
| VIP CLINIC | `mall:nova_arcada:vip-clinic` | centre | 2 | clinic |
| VODAFONE | `mall:nova_arcada:vodafone` | osm | 0 | store / phone |
| WOMEN’SECRET | `mall:nova_arcada:women-secret` | osm | 1 | store / clothing |
| ZIPPY | `mall:nova_arcada:zippy` | osm | 1 | store / clothing |
