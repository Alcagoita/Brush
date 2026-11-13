# Braga Parque reconcile — KAN-463, applied 2026-11-12

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0070_kan463_braga.sql (floors and types corrected by 0071_kan463_review_fixes.sql)`, and verified through `POST /poi/nearby`: all 160 listed units are served, and none of the 38 withdrawn rows is.

## Inputs

* `mall_lists/braga_parque.txt` — the operator's 160 units, read from bragaparque.pt 2026-11-12 (each store page gives the floor)
* `mall_lists/braga_parque_types.tsv` — the typing of every unit, with its evidence
* held rows inside the 50 m buffer of OSM `way/41679420` (Overture and curated)
* far rows: within Braga carrying "Braga Parque" / "Bragaparque" in name or address, minus four bakeries and three shops on other streets that only share the name
* OSM shops in the same box, to place the units we did not hold

## Withdrawn (38)

| row | name | why |
|---|---|---|
| `05ccb51a-af6b-4f22-bc81-013f3f0738be` | Vein - Sneakers Store | listed 'VEIN' pinned 357 m outside Braga Parque; the unit is served from a row inside |
| `1c73c992-b303-40db-80c0-5279ce5f53b9` | Mister Minit, Braga Parque | listed 'MISTER MINIT' pinned 356 m outside Braga Parque; the unit is served from a row inside |
| `258418cd-7ee5-4678-b9d2-f05b1a9a7928` | Lacoste | listed 'LACOSTE' pinned 651 m outside Braga Parque; the unit is served from a row inside |
| `35673b5b-8567-4466-b1d2-d1536308b168` | Salsa | listed 'SALSA' pinned 393 m outside Braga Parque; the unit is served from a row inside |
| `3ddab1d0-308d-4bf2-9d85-b8b093edec89` | Wok to Walk Braga Parque | listed 'WOK TO WALK' pinned 752 m outside Braga Parque; the unit is served from a row inside |
| `3de19e93-dc71-47f5-a4f0-2735d264c55f` | Sintety | listed 'SINTETY: LOJA DAS MALAS' pinned 402 m outside Braga Parque; the unit is served from a row inside |
| `4de25c9f-9889-491c-a790-722066abc710` | Oro Vivo Ourivesarias, Braga Parque | listed 'ORO VIVO' pinned 65 m outside Braga Parque; the unit is served from a row inside |
| `4fab07db-a290-42f8-b90c-a5931a106d01` | Rituals | listed 'RITUALS' pinned 400 m outside Braga Parque; the unit is served from a row inside |
| `5cb06fae-a17c-4510-878d-5092395b56a7` | Sunglass Hut | listed 'SUNGLASS HUT' pinned 362 m outside Braga Parque; the unit is served from a row inside |
| `61a5a192-a448-400d-8a2c-f0ce5704a670` | Lacoste Braga Parque | listed 'LACOSTE' pinned 1297 m outside Braga Parque; the unit is served from a row inside |
| `66c69446-5fa6-42c7-bc0f-00149a07a055` | Throttleman | Braga Parque's address but not on its tenant list, pinned 115 m outside |
| `7738b958-026c-472a-9a51-d163f71ce176` | Segafredo- Bragaparque | Braga Parque's address but not on its tenant list, pinned 60 m outside |
| `ad382ce2-63e4-4f11-a0e8-2a3f2f9563b7` | Ponto CTT | Braga Parque's address but not on its tenant list, pinned 50 m outside |
| `bdf92889-1649-46c7-9c7f-585d604f500b` | Lacoste Braga Parque | listed 'LACOSTE' pinned 2058 m outside Braga Parque; the unit is served from a row inside |
| `d2275318-c2db-4ded-b631-f9284c928310` | Ouro Vivo | listed 'ORO VIVO' pinned 927 m outside Braga Parque; the unit is served from a row inside |
| `ea3761b4-4ae0-42e0-9e5d-72efff99eab8` | Pepe Jeans Braga Parque | listed 'PEPE JEANS' pinned 366 m outside Braga Parque; the unit is served from a row inside |
| `f0b2d867-4f1e-4154-9ca3-61dfa6aa3880` | BRAGA SC BRAGA PARQUE | Braga Parque's address but not on its tenant list, pinned 2058 m outside |
| `f9b1ce31-82dc-4a19-890c-02f6c94e0336` | Zippy Kidstore | listed 'ZIPPY' pinned 1364 m outside Braga Parque; the unit is served from a row inside |
| `412ebd8b-3be1-48a1-88c5-31115c23f376` | Ópticas MultiOpticas Braga Parque | listed 'MULTIOPTICAS' pinned 366 m outside Braga Parque; the unit is served from a row inside |
| `d7ed0c0b-9b43-4e58-bf01-620a140c2748` | Opticalia Braga Parque | Braga Parque's address but not on its tenant list, pinned 140 m outside |
| `30c92903-a2e2-41fe-827c-fa938e8e579a` | iLook Store | not on the Braga Parque tenant list |
| `47645ad2-dde7-4db1-af2b-1ebbe0474670` | Sport Zone Braga Parque | not on the Braga Parque tenant list |
| `59068673-9723-46a0-b820-1ad5b6719a0a` | Claire's | not on the Braga Parque tenant list |
| `5aaceb58-b67d-45cb-a5a0-cebf44903d32` | Brightmobiles Braga | not on the Braga Parque tenant list |
| `5bf728f8-dd26-4d52-a43a-94c957e899a4` | MISAKO | not on the Braga Parque tenant list |
| `63b53068-01a9-4d07-92e4-c5ed7316b8af` | Nike Store | not on the Braga Parque tenant list |
| `69546eb9-b06b-4c04-9fc4-a8cc1cac44d6` | Centro Estética 4Ever | not on the Braga Parque tenant list |
| `915cb023-fc88-4a98-9a20-cc11106520ba` | Zoofeira | not on the Braga Parque tenant list |
| `9d86a3e6-9d74-47bc-b113-72cda66e6855` | Teppan Yaki | not on the Braga Parque tenant list |
| `aec6f88a-5f71-4195-9980-793502457c09` | Bezerra | not on the Braga Parque tenant list |
| `db56d296-fdd1-439a-8dc0-0825750f0526` | (Permanently Closed) Nike Store Braga | not on the Braga Parque tenant list |
| `e13fc1e3-6753-4516-a29c-14b10d850a6d` | Lanidor | not on the Braga Parque tenant list |
| `e62d6650-a827-41cd-9962-6fccc0e74317` | Urban Design Care Braga | not on the Braga Parque tenant list |
| `f5d19932-7a1c-43cb-9fc5-239a11db071f` | Powerdot | not on the Braga Parque tenant list |
| `f94064be-a369-48a1-9396-a6990379937f` | Loja das Sopas | not on the Braga Parque tenant list |
| `f9d7c428-5ea2-4b7b-912d-5ca6dcd94887` | 67 Cabeleireiros | not on the Braga Parque tenant list |
| `fsq:51a185c4498e6b547940b50a` | Sabão Rosa | not on the Braga Parque tenant list |
| `fsq:528fb05611d28cc557819423` | Funny City | not on the Braga Parque tenant list |

## Kept — neighbours (7)

* Pedro Ferreira Cabeleireiros (`hairdresser`)
* Restaurante Casa Alves (`restaurant`)
* Moeve (`gas`)
* Wash Me (`laundry`)
* Estación de servicio Cepsa (`gas`)
* A Braguista (`restaurant`)
* Posto de abastecimiento Cepsa (`gas`)

## Held — the row answering each unit, given the list's type and floor (92)

| listed | held row |
|---|---|
| BERSHKA | Bershka |
| BIMBA Y LOLA | Bimba y Lola |
| BLUEBIRD – RELÓGIOS E JOIAS | Bluebird - Watches & Jewels |
| BODEGÃO | Bodegão |
| BOSS STORE | BOSS Store |
| BOUTIQUE DOS RELÓGIOS | Boutique dos Relógios |
| BOUTIQUE NESPRESSO | Nespresso |
| BRASA RIO | Brasa Rio |
| CALZEDONIA | Calzedonia |
| CAMPO EM FLOR | Campo em Flor |
| CELEIRO | Celeiro |
| CEX | CeX |
| CHICCO | Chicco |
| CINEMAS NOS BRAGA PARQUE | Cinemas NOS Braga Parque |
| COMPANHIA | Companhia |
| CORTES DE LISBOA | Cortes de Lisboa Braga Parque |
| DECENIO | Decenio |
| DOM BRASIL | Dom Brasil |
| ERICEIRA SURF & SKATE | Ericeira Surf & Skate |
| FITNESS UP | Fitness UP Braga Parque |
| FNAC | Fnac |
| FUXIA | Fuxia Braga Parque |
| GANT | GANT Braga |
| GMS STORE - APPLE PREMIUM RESELLER | GMS Store Braga Parque |
| GUESS JEANS | GUESS |
| H&M | H&M |
| H3 HAMBÚRGUER GOURMET | H3 |
| HANAMI SUSHI | Hanami Sushi |
| INTIMISSIMI | Intimissimi |
| ISERVICES | iServices Braga Parque |
| ITALIAN REPUBLIC | Italian Republic |
| JD SPORTS | JD Sports |
| JEAN LOUIS DAVID | Jean Louis David Braga Parque |
| KFC | KFC |
| KIKO MILANO | Kiko Milano |
| KIOSKU | Kiosku |
| LACOSTE | Lacoste |
| LEFTIES | Lefties |
| LEVI'S | Levi's |
| LION OF PORCHES | Lion of Porches |
| LLAOLLAO | Llaollao |
| MANGO | Mango |
| MASSIMO DUTTI | Massimo Dutti |
| MCDONALD'S | McDonald's |
| MEO | Loja MEO |
| MR. BLUE | Lojas Mr. Blue |
| MULTIOPTICAS | Ópticas MultiOpticas Braga Parque |
| O BOTICÁRIO | O Boticário |
| OLÁ | Olá |
| ONE | One Watch Company - Braga Parque |
| OYSHO | Oysho |
| PANDORA | Pandora |
| PARFOIS | Parfois |
| PERFUMES & COMPANHIA | Perfumes & Companhia |
| PINGO DOCE | Pingo Doce |
| PIZZA HUT | Pizza Hut |
| POKE HOUSE | Poke House - Braga Parque |
| PRIMARK | Primark |
| PROF | Prof |
| PULL&BEAR | Pull & Bear |
| PUNT ROMA | Punt Roma |
| SALSA | Salsa |
| SAMSONITE | Samsonite |
| SEPHORA | Sephora |
| SPRINGFIELD | Springfield |
| STONE BY STONE | Stone by Stone |
| STRADIVARIUS | Stradivarius |
| STUDIO AUTO | Studio Auto Braga |
| TABACARIA PAIS | Tabacaria Pais |
| TACO BELL | Taco Bell |
| TEZENIS | Tezenis |
| THE BODY SHOP | The Body Shop |
| TIFFOSI | Tiffosi Braga Park |
| TIGER | Flying Tiger Copenhagen |
| TIMBERLAND | Timberland |
| TOMATINO | Tomatino |
| TOMMY HILFIGER | Tommy Hilfiger |
| TOUS | Tous Jewelry |
| TRINCAS | Trincas Braga |
| TRIUMPH | Triumph |
| UNITED COLORS OF BENETTON | United Colors of Benetton |
| URBAN PROJECT | Urban Project / Braga Parque |
| VEIN | Vein Braga Parque |
| VISTA ALEGRE ATLANTIS | Vista Alegre |
| VITAMINAS | Vitaminas Bragaparque |
| VODAFONE | Loja Vodafone Braga |
| WIDEX – ESPECIALISTAS EM AUDIÇÃO | Widex Centro Auditivo Braga Parque |
| WOK TO WALK | Wok to Walk Braga Parque |
| WOMEN´SECRET | Women's Secret |
| WORTEN MOBILE | Worten Mobile |
| ZARA MAN | ZARA |
| ZARA | Zara |

## Written into curated_poi (68)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| 2LIFE | `mall:braga_parque:2life` | centre | 1 | store / pawn |
| 5 À SEC | `mall:braga_parque:5-a-sec` | centre | 1 | laundry |
| ACIUM | `mall:braga_parque:acium` | centre | 1 | store / jewelry |
| ADIDAS | `mall:braga_parque:adidas` | osm | 2 | store / sports |
| AGÊNCIA ABREU | `mall:braga_parque:agencia-abreu` | osm | 1 | travel_agency |
| ALBERTO OCULISTA | `mall:braga_parque:alberto-oculista` | osm | 1 | store / eyewear_and_optician |
| ALDO | `mall:braga_parque:aldo` | osm | 1 | store / shoes |
| ALI BABA KEBAB HAUS | `mall:braga_parque:ali-baba-kebab-haus` | centre | 2 | restaurant |
| ARCÁDIA | `mall:braga_parque:arcadia` | osm | 2 | bakery |
| ASIÁTICO | `mall:braga_parque:asiatico` | osm | 2 | restaurant |
| AURYA | `mall:braga_parque:aurya` | osm | 1 | store / beauty |
| BEONTIME | `mall:braga_parque:beontime` | osm | 1 | store / watch |
| BIJOU BRIGITTE | `mall:braga_parque:bijou-brigitte` | osm | 1 | store / jewelry |
| BROWNIE | `mall:braga_parque:brownie` | osm | 2 | store / clothing |
| C&A | `mall:braga_parque:c-a` | osm | 1 | store / clothing |
| CASA BOLAS DE BERLIM | `mall:braga_parque:casa-bolas-de-berlim` | centre | 1 | bakery |
| CENTROXOGO | `mall:braga_parque:centroxogo` | osm | 1 | store / toys |
| CERVEJARIA BRAGA PARQUE | `mall:braga_parque:cervejaria-braga-parque` | osm | 2 | restaurant |
| CHURRASQUEIRA BRAZA | `mall:braga_parque:churrasqueira-braza` | osm | 2 | restaurant |
| CHÁLÁLA | `mall:braga_parque:chalala` | centre | 1 | tea |
| CLÍNICA DE SANTA MADALENA | `mall:braga_parque:clinica-de-santa-madalena` | centre | 1 | clinic |
| CORREIOS CTT | `mall:braga_parque:correios-ctt` | osm | 1 | post |
| ECCO | `mall:braga_parque:ecco` | osm | 1 | store / shoes |
| EQUIVALENZA | `mall:braga_parque:equivalenza` | osm | 1 | store / beauty |
| ESTÚDIO SEISSETE PROFISSIONAL | `mall:braga_parque:estudio-seissete-profissional` | osm | 2 | hairdresser |
| FOTOSPORT | `mall:braga_parque:fotosport` | osm | 1 | store / photography_store_and_services |
| FÁBRICA DOS ÓCULOS – A ORIGINAL | `mall:braga_parque:fabrica-dos-oculos-a-original` | centre | 1 | store / eyewear_and_optician |
| HUMMY | `mall:braga_parque:hummy` | osm | 2 | bakery |
| IQOS BOUTIQUE | `mall:braga_parque:iqos-boutique` | osm | 2 | tobacco |
| IUMAN | `mall:braga_parque:iuman` | centre | 1 | store / mens_clothing |
| LA CASA DE LAS CARCASAS | `mall:braga_parque:la-casa-de-las-carcasas` | osm | 2 | phone_repair / phone |
| LUGAR DA JÓIA | `mall:braga_parque:lugar-da-joia` | osm | 1 | store / jewelry |
| MAGNOLIA JEWELRY | `mall:braga_parque:magnolia-jewelry` | osm | 1 | store / jewelry |
| MALANDRINHO DE POMBAL | `mall:braga_parque:malandrinho-de-pombal` | osm | 2 | restaurant |
| MELTINO BAR & LOUNGE | `mall:braga_parque:meltino-bar-lounge` | osm | 2 | cafe |
| MERRELL CAT | `mall:braga_parque:merrell-cat` | osm | 1 | store / shoes |
| MISTER MINIT | `mall:braga_parque:mister-minit` | osm | 1 | shoe_repair |
| MUNDO DO CAFÉ DELTA | `mall:braga_parque:mundo-do-cafe-delta` | osm | 2 | cafe |
| NATA LISBOA | `mall:braga_parque:nata-lisboa` | osm | 1 | cafe |
| NATURAPURA | `mall:braga_parque:naturapura` | osm | 2 | store / childrens_clothing |
| NATURA | `mall:braga_parque:natura` | osm | 1 | store / clothing |
| NOS | `mall:braga_parque:nos` | osm | 1 | store / phone |
| NUTRYSTORE | `mall:braga_parque:nutrystore` | osm | 1 | store / vitamins_and_supplements |
| ORO VIVO | `mall:braga_parque:oro-vivo` | osm | 1 | store / jewelry |
| PACO MARTINEZ | `mall:braga_parque:paco-martinez` | osm | 1 | store / handbag |
| PAPPA'LAB - GELATARIA ARTESANAL | `mall:braga_parque:pappa-lab-gelataria-artesanal` | centre | 1 | ice_cream |
| PARQUE ESPLANADA | `mall:braga_parque:parque-esplanada` | osm | 2 | restaurant |
| PEPE JEANS | `mall:braga_parque:pepe-jeans` | osm | 1 | store / clothing |
| PLURICOSMÉTICA | `mall:braga_parque:pluricosmetica` | osm | 1 | store / beauty |
| QUAD | `mall:braga_parque:quad` | centre | 1 | store / sports |
| RITUALS | `mall:braga_parque:rituals` | osm | 1 | store / beauty |
| SACOOR | `mall:braga_parque:sacoor` | osm | 2 | store / womens_clothing |
| SEASIDE | `mall:braga_parque:seaside` | osm | 1 | store / shoes |
| SINTETY: LOJA DAS MALAS | `mall:braga_parque:sintety-loja-das-malas` | osm | 2 | store / handbag |
| SKECHERS | `mall:braga_parque:skechers` | osm | 1 | store / shoes |
| SMK | `mall:braga_parque:smk` | osm | 1 | store / clothing |
| SPORTING CLUBE DE BRAGA - LOJA OFICIAL | `mall:braga_parque:sporting-clube-de-braga-loja-oficial` | osm | 2 | store / sports |
| SUITS INC | `mall:braga_parque:suits-inc` | osm | 2 | store / clothing |
| SUNGLASS HUT | `mall:braga_parque:sunglass-hut` | osm | 1 | store / eyewear_and_optician |
| SWAROVSKI | `mall:braga_parque:swarovski` | osm | 1 | store / jewelry |
| TEA SHOP | `mall:braga_parque:tea-shop` | centre | 1 | tea |
| TOP ATLÂNTICO | `mall:braga_parque:top-atlantico` | osm | 1 | travel_agency |
| TUTTO CARS | `mall:braga_parque:tutto-cars` | osm | 2 | playground |
| UNICÂMBIO | `mall:braga_parque:unicambio` | osm | 1 | currency_exchange |
| WELLS ÓTICA | `mall:braga_parque:wells-otica` | centre | 1 | store / eyewear_and_optician |
| WIÑK | `mall:braga_parque:wink` | osm | 1 | nail_salon |
| ZARA HOME | `mall:braga_parque:zara-home` | osm | 2 | store / home |
| ZIPPY | `mall:braga_parque:zippy` | osm | 2 | store / clothing |
