# Via Catarina reconcile — KAN-462, applied 2026-11-12

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0066_kan462_via_catarina.sql`, and verified through `POST /poi/nearby`: all 76 listed units are served, and none of the 19 withdrawn rows is.

## Inputs

* `mall_lists/via_catarina.txt` — the operator's 76 units, supplied by the owner 2026-11-12
* `mall_lists/via_catarina_types.tsv` — the typing of every unit, with its evidence
* held rows inside the 30 m buffer of OSM `way/365658312` (Overture and curated)
* far rows: anything within about 2 km carrying the centre's own address (`Via Catarina`, `ViaCatarina`), minus the `Cristina Soares` row 522 m away, which is the brand's Rua do Almada shop
* OSM shops in the same box, to place the units we did not hold

## Withdrawn (19)

| row | name | why |
|---|---|---|
| `bc3a3201-ddab-4b16-a670-dd8c0a5b22f5` | CeX | same shop as listed 'CEX', held twice; the other row kept |
| `403451f4-be24-4964-bd99-f75213a8a101` | Cristina Soares | listed 'CRISTINA SOARES' pinned 146 m outside Via Catarina Shopping; the unit is held inside |
| `415cc33e-6b18-4a28-8a6b-a8738fd489dc` | Loja NOS | listed 'NOS' pinned 364 m outside Via Catarina Shopping; the unit is held inside |
| `c96f0b4d-77d0-4890-b8e9-a1842468d239` | Restaurante O Pátio | listed 'O Pátio' pinned 804 m outside Via Catarina Shopping; the unit is held inside |
| `165819f5-8b17-4a6b-96fb-41c5b8570fc4` | Body Shop | not on the Via Catarina Shopping tenant list |
| `1a25ae18-4306-42cc-9273-1bf9eceae062` | PORTO SC VIA CATARINA | not on the Via Catarina Shopping tenant list |
| `35be12aa-c397-4389-8339-c23e010b0495` | Talho Burger Via Catarina | not on the Via Catarina Shopping tenant list |
| `3f98eebd-a4ef-474b-a1aa-1beb8919560e` | beAuthentique Jewellery - Jóias Aço Inoxidável | not on the Via Catarina Shopping tenant list |
| `4b9f2486-ca4a-465a-ad28-370e073edf76` | Tapioca | not on the Via Catarina Shopping tenant list |
| `566d6dd7-6922-4690-b7b2-57d94c89dc13` | Loja das Sopas | not on the Via Catarina Shopping tenant list |
| `6e818727-f1aa-4ae8-a6ec-9044d1e4d919` | Indi Go by Real Indiana | not on the Via Catarina Shopping tenant list |
| `90cca4e1-d74b-4ff1-b352-945e486a014e` | Hussel | not on the Via Catarina Shopping tenant list |
| `a6854833-3805-41e2-a135-eb243a9ad967` | Stuppendo | not on the Via Catarina Shopping tenant list |
| `ba37e3b5-350b-488f-b771-bd0d52e0db30` | Salsa | not on the Via Catarina Shopping tenant list |
| `bc5ed047-aff4-4189-84dd-bcc28cc9b338` | Escola de Yôga Antigo | not on the Via Catarina Shopping tenant list |
| `d34fde1d-f6e5-4364-ac54-ee150ac9b34d` | Tiffosi | not on the Via Catarina Shopping tenant list |
| `dd26e425-0cf2-4b23-9213-980a14aaeaea` | LIFT Rooftop Via Catarina | not on the Via Catarina Shopping tenant list |
| `e7ab6ff9-21a2-40bf-ba00-63ab3fb2790b` | Companhia das Sandes | not on the Via Catarina Shopping tenant list |
| `fsq:50fe8e4be4b0d5fd1b214ebc` | houdini art crime | not on the Via Catarina Shopping tenant list |

## Kept — neighbours on other streets (53)

* Kiko Milano (`store`)
* Indian Grocery and Halal Shop (`supermarket`)
* Para Sempre Tattoos (`tattoo`)
* ocla_tattoo (`tattoo`)
* Oblivion Shop (`store`)
* 100 Culpa (`restaurant`)
* Original Eco Mercado (`restaurant`)
* Amadeu Carneiro (`store`)
* Dola Dyana Souvenirs Mercearia (`store`)
* BOHO - Eat, drink n’ dance (`restaurant`)
* Perfumaria Dubai (`store`)
* Walkstore (`store`)
* KristinaDuarteStudio (`salon`)
* LAMEIRINHO - Porto (`store`)
* Fruta Da D. Ermelinda (`supermarket`)
* Espaço Fábrica (`store`)
* AndrÉ Silva Tattoo Porto (`tattoo`)
* Flormar (`store`)
* DanSendo Studio (`gym`)
* Pollux (`store`)
* Rituals (`store`)
* Lucinda Maia Cabeleireiros (`hairdresser`)
* Ministry Of Port (`supermarket`)
* RoofTop Sta. Catarina (`bar`)
* Courir (`store`)
* Retrozão & Companhia (`store`)
* Estetica feminina&masculina (`salon`)
* CODE (`store`)
* Holmes Place (`gym`)
* BMCPharma (`spa`)
* Nuances & Glamour (`salon`)
* Helena Araújo Abreu-  Advogados (`spa`)
* Graça Batista Joias (`store`)
* Real Santa Catarina (`bakery`)
* SNIPES (`store`)
* Bolli (`store`)
* Ativo Kids (`store`)
* Fábrica da Nata (`bakery`)
* Sportino (`store`)
* Ale-Hop (`store`)
* Farggi (`restaurant`)
* ECCO Porto (`store`)
* Fernanda Araujo Nails (`salon`)
* Panda Bento- Sushi take-away (`restaurant`)
* Fashion Makers Studio (`store`)
* Lavandaria Marlinwash (`laundry`)
* Fazteaobife (`restaurant`)
* Paula Teixeira Cabeleireiros (`hairdresser`)
* Bellamamamia's Porto (`restaurant`)
* Bárbara Penaforte (`art_gallery`)
* Adidas Santa Catarina (`store`)
* Ópticas MultiOpticas R. Santa Catarina Porto (`store`)
* Cristina Soares, 522 m away — the brand's Rua do Almada shop, left out of the far set

## Held — the row answering each unit, given the list's type and floor (36)

| listed | held row |
|---|---|
| ALI BABA KEBAB HAUS | Ali Baba Kebab Haus |
| BERTRAND LIVREIROS | Livraria Bertrand |
| BOTICÁRIO | O boticário |
| CALZEDONIA | Calzedonia |
| CELEIRO | Celeiro Via Catarina |
| CEX | CeX |
| CONTINENTE BOM DIA | Continente |
| CORTEFIEL | Cortefiel |
| FLYING TIGER COPENHAGEN | Flying Tiger Copenhagen |
| H&M | H&M |
| H3 – NEW HAMBURGOLOGY | H3 Hambúrguer Gourmet |
| KIKO MILANO | Kiko Store |
| LEVI’S | Levi's |
| MCDONALD’S | McDonald's Via Catarina |
| MEO | Loja MEO |
| MORGAN DE TOI | Morgan |
| MR. BLUE | Loja Mr. Blue |
| NATURA | Natura Selection, Via Catarina |
| New Era | New Era |
| NORSEC/TOP COSTURA | Norsec Via Catarina Shopping |
| O Pátio | O Patio |
| OLÁ | Olá |
| PACOMARTINEZ | Paco Martinez |
| PANS & COMPANY | Pans & Company |
| PIZZA HUT | Pizza Hut ViaCatarina |
| Sabores do Porto | Sabores do Porto |
| SPORT ZONE | Sport Zone Via Catarina |
| SPRINGFIELD | Springfield |
| STONE BY STONE | Stone by Stone |
| SUNGLASS HUT | Sunglass Hut |
| TOMATINO | Tomatino |
| TRIUMPH | Triumph Lingerie - Porto |
| VITAMINAS | Vitaminas Via Catarina |
| WOK TO WALK | Wok to Walk Via Catarina Shopping |
| WOMEN’SECRET | Women'secret |
| WORTEN | Worten |

## Written into curated_poi (40)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| DE CAFÉ | `mall:via-catarina:de-cafe` | centre | 1 | cafe |
| Açaí Concept | `mall:via-catarina:acai-concept` | centre | 4 | restaurant |
| BIJOU BRIGITTE | `mall:via-catarina:bijou-brigitte` | osm | 2 | store / jewelry |
| BIJUFA | `mall:via-catarina:bijufa` | centre | 1 | store / jewelry |
| Braza | `mall:via-catarina:braza` | centre | 4 | restaurant |
| BRIGHTMOBILES | `mall:via-catarina:brightmobiles` | centre | 1 | store / phone |
| BURGER KING | `mall:via-catarina:burger-king` | osm | 4 | restaurant |
| CBWEED | `mall:via-catarina:cbweed` | centre | 4 | store / beauty |
| CHOCOLATE ROSA | `mall:via-catarina:chocolate-rosa` | centre | 4 | bakery |
| COORDENADA PERFEITA | `mall:via-catarina:coordenada-perfeita` | osm | 4 | store / copy_shop |
| CRISTINA SOARES | `mall:via-catarina:cristina-soares` | centre | 3 | store / clothing |
| FASHION PHONE | `mall:via-catarina:fashion-phone` | centre | 1 | phone_repair / phone |
| INTIMISSIMI | `mall:via-catarina:intimissimi` | centre | 2 | store / clothing |
| IUMAN INTIMISSIMI UOMO | `mall:via-catarina:iuman-intimissimi-uomo` | centre | 2 | store / mens_clothing |
| JOCORUM TABACARIAS | `mall:via-catarina:jocorum-tabacarias` | centre | 4 | tobacco |
| LOS TAKITOS | `mall:via-catarina:los-takitos` | centre | 4 | restaurant |
| MAGNOLIA SILVER JEWELLERY | `mall:via-catarina:magnolia-silver-jewellery` | centre | 2 | store / jewelry |
| MAIS ÓPTICA | `mall:via-catarina:mais-optica` | osm | 1 | store / eyewear_and_optician |
| MISAKO | `mall:via-catarina:misako` | centre | 2 | store / jewelry |
| NACO | `mall:via-catarina:naco` | centre | 3 | beauty_salon |
| NATA7 | `mall:via-catarina:nata7` | osm | 4 | bakery |
| NEW YORKER | `mall:via-catarina:new-yorker` | osm | 2 | store / clothing |
| NOS | `mall:via-catarina:nos` | osm | 1 | store / phone |
| ORIENTAL | `mall:via-catarina:oriental` | centre | 5 | restaurant |
| PERFUMES & COMPANHIA | `mall:via-catarina:perfumes-companhia` | osm | 3 | store / beauty |
| Pizza Hut Fatias | `mall:via-catarina:pizza-hut-fatias` | osm | 4 | restaurant |
| PLURICOSMÉTICA | `mall:via-catarina:pluricosmetica` | centre | 1 | store / beauty |
| Poké House | `mall:via-catarina:poke-house` | osm | 4 | restaurant |
| REAL TRANSFER | `mall:via-catarina:real-transfer` | osm | 1 | money_transfer |
| SAMSONITE | `mall:via-catarina:samsonite` | centre | 2 | store / handbag |
| SANTINI | `mall:via-catarina:santini` | centre | 2 | ice_cream |
| SECRET PACK | `mall:via-catarina:secret-pack` | centre | 1 | store / gift |
| SENZI | `mall:via-catarina:senzi` | centre | 3 | store / fashion_accessories |
| STREET SMASH BURGER | `mall:via-catarina:street-smash-burger` | centre | 4 | restaurant |
| Taco Bell | `mall:via-catarina:taco-bell` | osm | 4 | restaurant |
| UNDER BLUE | `mall:via-catarina:under-blue` | centre | 3 | store / clothing |
| ViaCarWash | `mall:via-catarina:viacarwash` | centre | 6 | car_wash |
| VILANOVA | `mall:via-catarina:vilanova` | osm | 2 | store / fashion_accessories |
| VODAFONE | `mall:via-catarina:vodafone` | osm | 1 | store / phone |
| WELLS | `mall:via-catarina:wells` | osm | 1 | store / drugstore |
