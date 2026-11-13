# AlgarveShopping reconcile — KAN-466, applied 2026-11-13

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0075_kan466_algarve.sql`, and verified through `POST /poi/nearby`: all 116 listed units are served, and none of the 29 withdrawn rows is.

## Inputs

* `mall_lists/algarveshopping.txt` — 116 units from algarveshopping.pt (Century 21 held out)
* `mall_lists/algarveshopping_types.tsv`
* held rows inside the 50 m buffer of OSM `relation/7759235` (outer ring)
* far rows carrying "AlgarveShopping", minus the Albufeira Terrace Mundo do Café
* OSM shops in the same box

## Withdrawn (29)

| row | name | why |
|---|---|---|
| `352aed3d-1328-4a9f-b157-809e2b53389a` | Albufeira Algarveshopping | AlgarveShopping's address but not on its tenant list, pinned 100 m outside |
| `45526f9e-bd51-4974-901d-247332e42f40` | Salsa | listed 'SALSA JEANS' pinned 926 m outside AlgarveShopping; the unit is served from a row inside |
| `50b03708-6385-4c3c-90a3-b03a4209af21` | Leonidas AlgarveShopping | listed 'LEONIDAS' pinned 1861 m outside AlgarveShopping; the unit is served from a row inside |
| `6fb85483-157e-45d0-a6f7-5d956342d5a4` | Bluebird AlgarveShopping - Relógios e Joias | listed 'BLUEBIRD' pinned 1251 m outside AlgarveShopping; the unit is served from a row inside |
| `805fe1c4-0ea6-4505-bf16-5ee93ca929ee` | H&M, Algarve Shopping | AlgarveShopping's address but not on its tenant list, pinned 1702 m outside |
| `9c9c864b-84aa-49eb-b4c2-43215947b586` | Lojas Mr. Blue | listed 'MR. BLUE' pinned 1919 m outside AlgarveShopping; the unit is served from a row inside |
| `a4cd64cd-d2b9-4eb9-a57b-7b14a1292b28` | Abbraccio - gelato e caffè | AlgarveShopping's address but not on its tenant list, pinned 3439 m outside |
| `aea85bc6-553a-49fb-b047-638b22fe0992` | Timberland® - Guia | listed 'TIMBERLAND' pinned 7687 m outside AlgarveShopping; the unit is served from a row inside |
| `bd0b5ca6-7275-497f-8db6-84c9f15c8228` | ALBUFEIRA SC ALGARVE SHOPPING | AlgarveShopping's address but not on its tenant list, pinned 5045 m outside |
| `c62b2330-3a6d-4059-ae92-50274e044ce3` | FNAC Algarve Shopping | listed 'FNAC' pinned 1529 m outside AlgarveShopping; the unit is served from a row inside |
| `c7acfac2-5438-48df-bb3e-147816728849` | Calzedonia | listed 'CALZEDONIA' pinned 942 m outside AlgarveShopping; the unit is served from a row inside |
| `d1ac1d0c-fcc7-4c71-87a3-2cb4aaf6e3c1` | Pizza Hut | listed 'PIZZA HUT' pinned 5330 m outside AlgarveShopping; the unit is served from a row inside |
| `164b33f6-b9e8-4e34-ab89-6c231fa38f29` | Bertrand | not on the AlgarveShopping tenant list |
| `18366472-bbcf-4380-a593-831c66aa3341` | Restaurante O Aurelio | not on the AlgarveShopping tenant list |
| `293b08b5-330a-463e-a146-3de884d9c083` | note! Guia | not on the AlgarveShopping tenant list |
| `41f89613-7cd2-48b0-bafa-d83cdc0226ab` | Mango | not on the AlgarveShopping tenant list |
| `564a1817-43a3-48dd-8d22-f3a0fe6e2c90` | Cineplace | not on the AlgarveShopping tenant list |
| `7518ee22-d899-4022-b7a2-fb0a4da0a213` | Ray-Ban | not on the AlgarveShopping tenant list |
| `7753f5ca-b93d-40fe-8721-e34505501a5a` | Equivalenza AlgarveShopping | not on the AlgarveShopping tenant list |
| `77738a8c-ffa0-4dcf-982c-cfea07e85820` | Joshua's Shoarma Grill | not on the AlgarveShopping tenant list |
| `78cee2a4-c18c-4478-a4f4-0d046852952e` | Happy Family | not on the AlgarveShopping tenant list |
| `7bf075bf-ac1e-4846-8f33-e6e074cfac21` | made/in | not on the AlgarveShopping tenant list |
| `7f6da2cc-dbed-4c01-aaec-5af6164fc682` | Hussel | not on the AlgarveShopping tenant list |
| `a8360cd9-6cfb-4ce5-9e95-aad7c37d207c` | New Game | not on the AlgarveShopping tenant list |
| `ca1bc2fc-0c3d-4500-ae50-fa9ffed0a943` | G-Star RAW Store | not on the AlgarveShopping tenant list |
| `cc66d7af-3e56-47bb-a49b-12defe7ccf5f` | Pepe Jeans, Algarveshopping | not on the AlgarveShopping tenant list |
| `d712916b-e40a-4931-9261-f12dfadb01b2` | Superdry | not on the AlgarveShopping tenant list |
| `f98938e6-8ebb-42af-b44b-db791a8e524b` | The Body Shop | not on the AlgarveShopping tenant list |
| `ffd3baf3-a38b-451f-b887-4fe47d3094ee` | GUIA DELIVERY | not on the AlgarveShopping tenant list |

## Kept — neighbours (0)


## Held — the row answering each unit, given the list's type and floor (50)

| listed | held row |
|---|---|
| ALENTEJO / BIFANAS DE VENDAS NOVAS | Alentejo - Pão, Azeite & Alho |
| BERSHKA | Bershka |
| BURGER KING | Burger King |
| CALZEDONIA | Calzedonia |
| CAROLL | Caroll |
| CONTINENTE | Continente |
| DOUGLAS | Douglas |
| ERICEIRA SURF & SKATE | Ericeira Surf Shop |
| FLYING TIGER | Tiger |
| FNAC | FNAC |
| GIOVANNI GALLI | Giovanni Galli |
| GUESS | GUESS |
| H&M | H&M |
| H3 – NEW HAMBURGOLOGY | H3 Hambúrguer Gourmet |
| iServices | iServices Algarve Shopping |
| JD SPORTS | JD Sports |
| KFC | KFC |
| KIKO MILANO | Kiko Milano |
| LA CASA DE LAS CARCASAS | La Casa de las Carcasas |
| Le Croissant | Le Croissant Guia |
| LEONIDAS | LEONIDAS ALGARVE SHOPPING |
| LEVI’S | Levi's Store |
| MASSIMO DUTTI | Massimo Dutti |
| MCDONALD’S | McDonald's |
| MEO | Loja MEO |
| MULTIOPTICAS | MultiOpticas |
| NOS | Loja NOS |
| O Seu Bitoque / Poke&Wok | O Seu Bitoque |
| OLÁ | Olá |
| OYSHO | Oysho |
| PANDORA | Pandora |
| PANS & COMPANY | Pans & Company |
| PARFOIS | Parfois |
| PERFUMES & COMPANHIA | Perfumes e Companhia, AlgarveShopping |
| PIZZA HUT | Pizza Hut |
| PORTUGÁLIA BALCÃO | Portugália Balcão |
| PULL & BEAR | Pull & Bear |
| SALSA JEANS | Salsa |
| SEPHORA | Sephora |
| SPORT ZONE | Sport Zone Algarve Shopping |
| SPRINGFIELD | Springfield |
| SUNGLASS HUT | Sunglass Hut |
| SWAROVSKI | Swarovski Boutique C.C.Algarve |
| TEZENIS | Tezenis |
| TIMBERLAND | Timberland - Algarve Shopping |
| TOUS | Tous |
| TOYS “R” US | Toys"R"Us |
| TRIUMPH | Triumph Lingerie |
| WORTEN MOBILE | Worten Mobile |
| ZARA | Zara |

## Written into curated_poi (66)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| 1920 BARBER SHOP | `mall:algarveshopping:1920-barber-shop` | osm | 0 | barber |
| Açaí Algarve Express | `mall:algarveshopping:acai-algarve-express` | centre | 0 | restaurant |
| AGÊNCIA ABREU | `mall:algarveshopping:agencia-abreu` | osm | 0 | travel_agency |
| ALDO | `mall:algarveshopping:aldo` | osm | 0 | store / shoes |
| ALI BABA KEBAB HAUS | `mall:algarveshopping:ali-baba-kebab-haus` | centre | 1 | restaurant |
| Arcádia | `mall:algarveshopping:arcadia` | centre | 0 | bakery |
| BEONTIME | `mall:algarveshopping:beontime` | centre | 1 | store / watch |
| BLUEBIRD | `mall:algarveshopping:bluebird` | centre | 0 | store / jewelry |
| BOUTIQUE DOS RELÓGIOS | `mall:algarveshopping:boutique-dos-relogios` | centre | 0 | store / jewelry |
| BRIGHTMOBILES | `mall:algarveshopping:brightmobiles` | centre | 0 | store / phone |
| C&A | `mall:algarveshopping:c-a` | osm | 1 | store / clothing |
| CAFÉ PANS | `mall:algarveshopping:cafe-pans` | centre | 0 | cafe |
| CARILOR | `mall:algarveshopping:carilor` | centre | 0 | store / jewelry |
| Cavalinho | `mall:algarveshopping:cavalinho` | centre | 0 | store / handbag |
| CELEIRO | `mall:algarveshopping:celeiro` | osm | 0 | supermarket |
| Clínica CUF Guia – AlgarveShopping | `mall:algarveshopping:clinica-cuf-guia-algarveshopping` | centre | 1 | clinic |
| CORTEFIEL | `mall:algarveshopping:cortefiel` | centre | 1 | store / clothing |
| Decenio | `mall:algarveshopping:decenio` | centre | 1 | store / clothing |
| ECCO | `mall:algarveshopping:ecco` | osm | 0 | store / shoes |
| Farmácia do Shopping | `mall:algarveshopping:farmacia-do-shopping` | osm | 0 | pharmacy |
| INTIMISSIMI | `mall:algarveshopping:intimissimi` | centre | 0 | store / clothing |
| ISTORE | `mall:algarveshopping:istore` | centre | 0 | store / electronics |
| ITALIAN REPUBLIC | `mall:algarveshopping:italian-republic` | centre | 1 | restaurant |
| IUMAN Intimissimi Uomo | `mall:algarveshopping:iuman-intimissimi-uomo` | centre | 0 | store / mens_clothing |
| JEAN LOUIS DAVID | `mall:algarveshopping:jean-louis-david` | osm | 0 | hairdresser |
| JOSE LUIS JOALHARIAS | `mall:algarveshopping:jose-luis-joalharias` | centre | 1 | store / jewelry |
| Lefties | `mall:algarveshopping:lefties` | centre | 0 | store / clothing |
| LION OF PORCHES | `mall:algarveshopping:lion-of-porches` | centre | 1 | store / clothing |
| LOJA DAS BAÍNHAS | `mall:algarveshopping:loja-das-bainhas` | centre | 0 | clothing_repair |
| Mayoral | `mall:algarveshopping:mayoral` | centre | 1 | store / clothing |
| MISTER MINIT | `mall:algarveshopping:mister-minit` | osm | 0 | shoe_repair |
| MR. BLUE | `mall:algarveshopping:mr-blue` | centre | 0 | store / clothing |
| MUNDO DO CAFÉ | `mall:algarveshopping:mundo-do-cafe` | centre | 1 | cafe |
| NATURA | `mall:algarveshopping:natura` | centre | 0 | store / clothing |
| O BOTICÁRIO | `mall:algarveshopping:o-boticario` | osm | 0 | store / beauty |
| OPTICÁLIA | `mall:algarveshopping:opticalia` | osm | 0 | store / eyewear_and_optician |
| ORO VIVO | `mall:algarveshopping:oro-vivo` | centre | 0 | store / jewelry |
| PACO MARTINEZ | `mall:algarveshopping:paco-martinez` | centre | 1 | store / handbag |
| PANELA DA SOPA/DOM BACALHAU | `mall:algarveshopping:panela-da-sopa-dom-bacalhau` | centre | 1 | restaurant |
| PLURICOSMÉTICA | `mall:algarveshopping:pluricosmetica` | centre | 1 | store / beauty |
| Poke House | `mall:algarveshopping:poke-house` | centre | 1 | restaurant |
| PRIMOR | `mall:algarveshopping:primor` | osm | 0 | store / beauty |
| Q.B. CONCEPT | `mall:algarveshopping:q-b-concept` | centre | 1 | restaurant |
| QUEBRAMAR | `mall:algarveshopping:quebramar` | centre | 1 | store / clothing |
| QUICK PICK | `mall:algarveshopping:quick-pick` | centre | 0 | lottery / tobacco |
| Quiosque Le Croissant | `mall:algarveshopping:quiosque-le-croissant` | centre | 0 | bakery |
| REAL TRANSFER | `mall:algarveshopping:real-transfer` | centre | 0 | money_transfer |
| RITUALS | `mall:algarveshopping:rituals` | centre | 0 | store / beauty |
| SAMSONITE | `mall:algarveshopping:samsonite` | osm | 0 | store / handbag |
| SKECHERS | `mall:algarveshopping:skechers` | osm | 1 | store / shoes |
| SOULD PARK | `mall:algarveshopping:sould-park` | centre | 0 | amusement_park |
| STRADIVARIUS | `mall:algarveshopping:stradivarius` | osm | 1 | store / clothing |
| SUITS INC | `mall:algarveshopping:suits-inc` | centre | 0 | store / clothing |
| Taco Bell | `mall:algarveshopping:taco-bell` | osm | 1 | restaurant |
| TECHNOLOGY & ACCESSORIES | `mall:algarveshopping:technology-accessories` | centre | 0 | store / electronics |
| TIFFOSI | `mall:algarveshopping:tiffosi` | centre | 1 | store / clothing |
| Tramas Home | `mall:algarveshopping:tramas-home` | centre | 0 | store / home |
| UltraWash | `mall:algarveshopping:ultrawash` | centre | -1 | car_wash |
| VILANOVA ACCESSORIES | `mall:algarveshopping:vilanova-accessories` | centre | 1 | store / fashion_accessories |
| VISTA ALEGRE | `mall:algarveshopping:vista-alegre` | centre | 0 | store / home |
| VITAMINAS | `mall:algarveshopping:vitaminas` | osm | 1 | restaurant |
| VODAFONE | `mall:algarveshopping:vodafone` | osm | 0 | store / phone |
| WOMEN’SECRET | `mall:algarveshopping:women-secret` | osm | 1 | store / clothing |
| WORTEN | `mall:algarveshopping:worten` | osm | 0 | phone_repair / electronics |
| XIAOMI STORE PORTUGAL | `mall:algarveshopping:xiaomi-store-portugal` | centre | 0 | store / electronics |
| ZARA HOME | `mall:algarveshopping:zara-home` | osm | 1 | store / home |
