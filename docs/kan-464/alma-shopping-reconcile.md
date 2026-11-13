# Alma Shopping reconcile — KAN-464, applied 2026-11-13

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0073_kan464_alma_shopping.sql`, and verified through `POST /poi/nearby`: all 97 listed units are served, and none of the 29 withdrawn rows is.

## Inputs

* `mall_lists/alma_shopping.txt` — the operator's 97 units, read from almashopping.pt 2026-11-13 (name, category and "Piso N Loja M" are in each card's markup)
* `mall_lists/alma_shopping_types.tsv` — the typing of every unit, with its evidence; `alma_shopping_operator_categories.tsv` holds the operator's categories
* held rows inside the 40 m buffer of OSM `way/174739239` (Overture and curated)
* far rows: within Coimbra carrying "Alma Shopping", "Dolce Vita" (its old name) or "Humberto Delgado 207" in name or address, minus a football academy named Dolce Vita
* OSM shops in the same box, to place the units we did not hold

## Withdrawn (29)

| row | name | why |
|---|---|---|
| `03c50d37-ada2-4771-96c6-b12733240c12` | Staza Sapataria | listed 'Staza' pinned 1116 m outside Alma Shopping; the unit is served from a row inside |
| `0c1ad305-cbad-486c-91da-f000aacfaea8` | Bluebird Alma Shopping - Relógios e Joias | listed 'BlueBird' pinned 449 m outside Alma Shopping; the unit is served from a row inside |
| `1f61dc61-9d9a-41a5-b28b-0b80513d98cd` | Decenio | listed 'Decenio' pinned 223 m outside Alma Shopping; the unit is served from a row inside |
| `5340cec3-3193-427e-b53e-edceda6ae45e` | Go Gym Coimbra | listed 'Go Gym' pinned 57 m outside Alma Shopping; the unit is served from a row inside |
| `5bc6540c-ce3d-4f0d-a9cb-5b6e9a0fbd8e` | Carlos Santos - Hairshop, Dolce Vita Coimbra | Alma Shopping's address but not on its tenant list, pinned 896 m outside |
| `89af00a1-4497-49e0-8c1e-d3f1ddea5e7f` | Box Jumbo, Dolce Vita Coimbra | Alma Shopping's address but not on its tenant list, pinned 896 m outside |
| `f5686225-6932-4d94-a0e5-b59a74de2384` | Zara Home, Dolce Vita Coimbra | Alma Shopping's address but not on its tenant list, pinned 896 m outside |
| `002a02e7-0266-4890-aca8-e7726e8b8993` | Sunglass Hut | not on the Alma Shopping tenant list |
| `06ca2faa-c111-497b-b9a7-abdbb4c7aabd` | Stradivarius, Coimbra | not on the Alma Shopping tenant list |
| `3ea7fc3f-971b-4f32-8f81-4d267b0b3b2f` | Góis | not on the Alma Shopping tenant list |
| `42c9aaaa-4aaa-4ef0-a40e-464e08d7234f` | Devernois Coimbra | not on the Alma Shopping tenant list |
| `4a440bc3-7599-4117-a1ed-53236e40d694` | Casa das Peles, Dolce Vita Coimbra | not on the Alma Shopping tenant list |
| `4bc28df9-c10a-497e-b282-f50046cee60a` | COIMBRA SC ALMA SHOPPING | not on the Alma Shopping tenant list |
| `56902aa4-8a2a-434c-8aee-4e0bf6f2686f` | Oysho | not on the Alma Shopping tenant list |
| `5ddc4ce4-35dd-4288-9be9-91097511dce5` | Claire's | not on the Alma Shopping tenant list |
| `60edaafd-88f2-489a-88ad-3ade8990ee68` | Bershka | not on the Alma Shopping tenant list |
| `88bb7a88-ef99-42eb-ab7c-3ada4fb3ba09` | Pull & Bear | not on the Alma Shopping tenant list |
| `91bd64fe-030e-43d6-8584-8bb4022be3ed` | Chicco | not on the Alma Shopping tenant list |
| `91d33ee7-6062-41c8-88f9-cb9a351a7919` | Foot Locker | not on the Alma Shopping tenant list |
| `9a239128-a1c3-4374-acb5-33c42db33edc` | Zara | not on the Alma Shopping tenant list |
| `b76319a8-e3c6-4212-8d7f-64330fdfb127` | United Colors of Benetton | not on the Alma Shopping tenant list |
| `bc736eb9-a8a0-44ab-83f1-1f0345d098f2` | Cacifo Locky | not on the Alma Shopping tenant list |
| `d12913b1-bccd-4333-8630-009bb9e481a6` | Urban Trend | not on the Alma Shopping tenant list |
| `d5dc48df-c1c2-4a2f-a0e1-ed2f1632bab9` | Sushi Gourmet | not on the Alma Shopping tenant list |
| `dbe61c0e-835c-44d8-98d5-f9bcd22ae31f` | That Kids | not on the Alma Shopping tenant list |
| `e38ce0a8-5b49-462d-8ab7-97db2a3f5373` | Massimo Dutti | not on the Alma Shopping tenant list |
| `6882ea93-9162-49be-8e42-c26da8a0f0d8` | Mais Óptica | not on the Alma Shopping tenant list |
| `78b9661d-611b-4973-8bab-ce84a1209724` | JD Sports | same shop as listed 'JD Sports', a second row 39 m out (withdrawn after the plan, in the same migration) |
| `d4701a45-e225-49fb-b175-7d1de0fcd90f` | Scalpers | at Loja 116, one of the centre's own units, and not on its tenant list (withdrawn after the plan) |

## Kept — neighbours (5)

* Lavandaria Lavesec (`laundry`)
* Sugar Daddy - Ice Cream & Co. (`ice_cream`)
* 2o Jardim Escola Joao De Deus Coimbra (`school`)
* Mr.Pizza Solum Coimbra (`restaurant`)
* Quadrar - Construção e Promoção Imobiliária (`historical_landmark`)

## Held — the row answering each unit, given the list's type and floor (49)

| listed | held row |
|---|---|
| 5 à Sec e 5 à Fil | 5àsec |
| Activo Bank | ActivoBank - Alma Shopping (Coimbra) |
| Auchan | Auchan |
| Bertrand | Livraria Bertrand |
| Bitoque no Ponto | Bitoque No Ponto |
| BlueBird | Bluebird |
| Boutique dos Relógios | Boutique dos Relógios |
| BStrong | BStrong |
| Burger King | Burger King Alma Shopping |
| Celeiro Dieta | Celeiro |
| Cex We Buy | CeX |
| Cinemas NOS | Cinemas NOS Alma Shopping |
| Companhia | Companhia das Sandes |
| Florista Tina | Florista Tina |
| GEOX | Geox |
| H3 | H3 Hambúrguer Gourmet |
| Intimissimi | Intimissimi |
| JD Sports | JD Sports |
| KFC | KFC |
| La Casa de Las Carcasas | La Casa de las Carcasas |
| Lanidor | Lanidor Woman |
| Leonidas | LEONIDAS COIMBRA |
| Llao Llao | llaollao |
| MEO | Loja MEO |
| Mr. Blue | Mr. Blue |
| MultiOpticas | MultiOpticas |
| NOS | Loja NOS |
| Pandora | Pandora |
| Pans & Company | Pans and Company |
| Parfois | Parfois |
| Pepco | Pepco COIMBRA, Alma Shopping Coimbra R. General Humberto Delgado 202/211, Loja nº 244 |
| Perfeit’Olhar | Perfeit'Olhar Coimbra |
| Perfumes & Companhia | Perfumes & Companhia |
| Pizza Hut | Pizza Hut |
| Portugália | Portugália - Balcão |
| Sacoor Brothers | Sacoor Brothers |
| Samsonite | Samsonite |
| Sfera | Sfera |
| Sport Zone | Sport Zone |
| Springfield | Springfield |
| The Body Shop | The Body Shop |
| Tiendanimal | Tiendanimal |
| Tiffosi | Tiffosi Alma Shopping |
| Tiger | Flying Tiger Copenhagen |
| Tous | Tous Jewelry |
| Triumph | Triumph |
| Vitaminas | Vitaminas Alma Shopping |
| Worten Mobile | Worten - Mobile Coimbra Estádio |
| Zippy | Zippy Kidstore |

## Written into curated_poi (48)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| Acium | `mall:alma_shopping:acium` | centre | 2 | store / jewelry |
| Alberto Oculista | `mall:alma_shopping:alberto-oculista` | osm | 2 | store / eyewear_and_optician |
| Alentejo | `mall:alma_shopping:alentejo` | osm | 3 | restaurant |
| Braza | `mall:alma_shopping:braza` | centre | 4 | restaurant |
| Café Pans | `mall:alma_shopping:cafe-pans` | centre | 0 | cafe |
| Calzedonia | `mall:alma_shopping:calzedonia` | osm | 2 | store / clothing |
| Centroxogo | `mall:alma_shopping:centroxogo` | centre | 0 | store / toys |
| CHAVIARTE | `mall:alma_shopping:chaviarte` | centre | 0 | shoe_repair |
| Cidália Cabeleireiros | `mall:alma_shopping:cidalia-cabeleireiros` | osm | 0 | hairdresser |
| Coffee House | `mall:alma_shopping:coffee-house` | centre | 3 | cafe |
| Cortefiel | `mall:alma_shopping:cortefiel` | osm | 2 | store / clothing |
| Decenio | `mall:alma_shopping:decenio` | centre | 1 | store / clothing |
| Delta Espresso | `mall:alma_shopping:delta-espresso` | centre | 2 | cafe |
| Douglas | `mall:alma_shopping:douglas` | centre | 1 | store / beauty |
| Equivalenza | `mall:alma_shopping:equivalenza` | osm | 2 | store / beauty |
| Feu Vert | `mall:alma_shopping:feu-vert` | osm | 1 | store / auto_parts_and_supply |
| Fotosport | `mall:alma_shopping:fotosport` | centre | 0 | store / photography_store_and_services |
| Giovanni Galli | `mall:alma_shopping:giovanni-galli` | centre | 1 | store / mens_clothing |
| Go Gym | `mall:alma_shopping:go-gym` | centre | 1 | gym |
| I Love Kebab | `mall:alma_shopping:i-love-kebab` | centre | 3 | restaurant |
| Ink House | `mall:alma_shopping:ink-house` | centre | 0 | store / office_equipment |
| iServices | `mall:alma_shopping:iservices` | centre | 2 | phone_repair |
| Kung Fu Noodle | `mall:alma_shopping:kung-fu-noodle` | centre | 4 | restaurant |
| Lanidor Kids | `mall:alma_shopping:lanidor-kids` | osm | 2 | store / clothing |
| Lion of Porches | `mall:alma_shopping:lion-of-porches` | centre | 1 | store / clothing |
| Mayoral | `mall:alma_shopping:mayoral` | osm | 2 | store / clothing |
| McDonald’s | `mall:alma_shopping:mcdonald-s` | osm | 3 | restaurant |
| MO | `mall:alma_shopping:mo` | centre | 2 | store / clothing |
| Natura | `mall:alma_shopping:natura` | centre | 1 | store / clothing |
| New Home Decor | `mall:alma_shopping:new-home-decor` | centre | 2 | store / home |
| Normal | `mall:alma_shopping:normal` | osm | 2 | store / discount_store |
| Pluricosmética | `mall:alma_shopping:pluricosmetica` | osm | 0 | store / beauty |
| Primor | `mall:alma_shopping:primor` | osm | 1 | store / beauty |
| Quebramar | `mall:alma_shopping:quebramar` | centre | 1 | store / clothing |
| Quiosque dos Sabores | `mall:alma_shopping:quiosque-dos-sabores` | centre | 2 | cafe |
| Salsa | `mall:alma_shopping:salsa` | centre | 1 | store / clothing |
| Seaside | `mall:alma_shopping:seaside` | centre | 1 | store / shoes |
| Solinca | `mall:alma_shopping:solinca` | centre | 1 | gym |
| Staza | `mall:alma_shopping:staza` | osm | 2 | store / shoes |
| Swarovski | `mall:alma_shopping:swarovski` | centre | 1 | store / jewelry |
| Tomatino | `mall:alma_shopping:tomatino` | osm | 3 | restaurant |
| Viagens Abreu | `mall:alma_shopping:viagens-abreu` | osm | 2 | travel_agency |
| Vilanova | `mall:alma_shopping:vilanova` | centre | 1 | store / fashion_accessories |
| Vista Alegre | `mall:alma_shopping:vista-alegre` | osm | 2 | store / home |
| Vodafone | `mall:alma_shopping:vodafone` | osm | 2 | store / phone |
| Wall Street English | `mall:alma_shopping:wall-street-english` | centre | 1 | school |
| Women’Secret | `mall:alma_shopping:women-secret` | osm | 2 | store / clothing |
| Worten | `mall:alma_shopping:worten` | osm | 1 | phone_repair / electronics |
