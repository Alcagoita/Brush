# MAR Shopping Algarve reconcile — KAN-466, applied 2026-11-13

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0075_kan466_algarve.sql`, and verified through `POST /poi/nearby`: all 119 listed units are served, and none of the 25 withdrawn rows is.

## Inputs

* `mall_lists/mar_shopping_algarve.txt` — 88 shops and 31 restaurants from marshopping.com, each floor read from the unit page; Designer Outlet Algarve, Super Quinta and Woofland not written
* `mall_lists/mar_shopping_algarve_types.tsv`
* held rows inside the 75 m buffer of OSM `way/525348390`, minus Emotions - Coffee Shop on Av. do Algarve 2
* far rows carrying "MAR Shopping" / "Complexo Comercial IKEA"
* OSM shops in the same box

## Withdrawn (25)

| row | name | why |
|---|---|---|
| `f1546b10-249a-4866-95bd-1330fcbfabc2` | Primark | same shop as listed 'PRIMARK', held twice; the other row kept |
| `06b03e70-c903-451d-9476-848ddf80a58c` | Mcdonald's - Loulé Marshopping | listed "McDonald's" pinned 7117 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `26d4b9ca-932b-4c3c-b135-505a1511ba4c` | Häagen-Dazs | listed 'Häagen Dazs' pinned 9326 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `2b6d1d37-9080-479d-b63e-8f1faa6f9fc8` | Talho Burger MAR Shopping Algarve | listed 'TALHO BURGER' pinned 3025 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `2d00755c-3ba7-4ff6-abfa-1e2d094dcda4` | Aromas Perfumerias - Algarve Mar Shopping | listed 'AROMAS' pinned 122 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `309d8271-14ad-4276-8fcb-77a0f71f9b33` | H3 Hambúrguer Gourmet | listed 'H3' pinned 132 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `3453d04b-7a8a-4f90-9d4c-502e4335ad91` | Hanami Sushi Mar Shopping Loulé | listed 'HANAMI SUSHI' pinned 88 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `49be43d7-e7f1-4815-98ce-93ac03a20cdc` | 100 Montaditos Portugal | MAR Shopping Algarve's address but not on its tenant list, pinned 10730 m outside |
| `59388245-8a76-4dfe-ab79-5bfa5d36d8a8` | Worten - Mar Shopping Algarve | listed 'WORTEN' pinned 153 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `6f5f76b5-2813-44f4-9a12-648eff6e09a5` | Redken | MAR Shopping Algarve's address but not on its tenant list, pinned 220 m outside |
| `84dc5f7a-7144-4d4b-8a9b-5a306f6b6ba7` | Lojas Mr. Blue | listed 'MR BLUE' pinned 3087 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `9de95a39-1a11-4eaf-bce0-6ef5f1307f67` | Leonidas Mar Shopping | listed 'Leonidas' pinned 95 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `a06f09d6-3e7b-410e-bee6-ecf9d9db91e3` | Aromas PT | listed 'AROMAS' pinned 3301 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `ba4dd6bf-69b1-4faa-85c7-4f58f99a09a0` | Flying Tiger Copenhagen | listed 'FLYING TIGER COPENHAGEN' pinned 1198 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `e2f8f5d4-027a-463a-8da1-2baf0dbabba0` | Pandora | listed 'PANDORA' pinned 91 m outside MAR Shopping Algarve; the unit is served from a row inside |
| `163a60a6-5677-4d0c-bd2c-d6991d74b521` | Padaria do Bairro | not on the MAR Shopping Algarve tenant list |
| `3585b218-0f59-41ac-ae06-02dd89577c6e` | D'Berlim | not on the MAR Shopping Algarve tenant list |
| `482c2710-6ecf-4e94-88b7-34d59166f05f` | Ponto CTT | not on the MAR Shopping Algarve tenant list |
| `5188d9c1-7762-4046-b2e7-2ca081ffe296` | 100 Montaditos | not on the MAR Shopping Algarve tenant list |
| `76f5622a-3405-411f-b502-529aaceac853` | ThaiBrás-by-LeonelPereira | not on the MAR Shopping Algarve tenant list |
| `7b4bf600-b600-4eb6-9da3-b5453d4d4f21` | LOULÉ SC MAR SHOPPING ALGARVE | not on the MAR Shopping Algarve tenant list |
| `818c625d-1268-4c19-a1d6-237cfb41749f` | Nata Lisboa - Algarve | not on the MAR Shopping Algarve tenant list |
| `84b7613d-2481-4180-a4fe-c2eddb36ad2a` | Loja do Gato Preto | not on the MAR Shopping Algarve tenant list |
| `c268ad91-f985-4c30-9607-2a56770a3934` | REVOLUTION LAUNDRY | not on the MAR Shopping Algarve tenant list |
| `f942208f-178f-4dc0-bc4a-44e61d8211f8` | Calvin Klein | not on the MAR Shopping Algarve tenant list |

## Kept — neighbours (13)

* Quiksilver (`store`)
* EDJOIA Quinta do Lago (`store`)
* MultiOpticas Designer Outlet Algarve (`store`)
* Haribo (`bakery`)
* Le Creuset (`store`)
* Triumph Outlet (`store`)
* Timberland Outlet Algarve (`store`)
* Sunglass Hut (`store`)
* New Balance (`store`)
* Wash.ME - Almancil - Mar Shopping (`laundry`)
* Douglas (`store`)
* BOSS Outlet (`store`)
* American Vintage Algarve, Outlet (`store`)

## Held — the row answering each unit, given the list's type and floor (37)

| listed | held row |
|---|---|
| BERSHKA | Bershka |
| CALZEDONIA | Calzedonia |
| CELEIRO | Celeiro |
| Cinemas NOS | Cinemas NOS MAR Shopping Algarve |
| Clínica CUF Loulé | LOULÉ MAR SHOPPING |
| FARMÁCIA SILVEIRA | Farmácia Silveira Algarve |
| FLYING TIGER COPENHAGEN | Flying Tiger |
| H&M | H&M |
| IKEA | IKEA Loulé - Loja Móveis e Decoração |
| Intimissimi | Intimissimi |
| INTIMISSIMI UOMO | Intimissimi Uomo |
| KIWOKO | KIWOKO C.C. MAR SHOPPING LOULÉ |
| LEFTIES | Lefties |
| LEGO FAN FACTORY | Lego Fan Factory |
| MANGO | Mango |
| PARFOIS | Parfois |
| Pingo Doce | Pingo Doce |
| PRIMARK | Primark |
| RITUALS | Rituals |
| SEPHORA | Sephora |
| TEZENIS | Tezenis |
| TOUS | Tous |
| Bagel and Coffee Point | Bagel & Coffee Point |
| Baja Fresh | Baja Fresh |
| Franguinho do Shopping | Franguinho do Shopping |
| Häagen Dazs | Häagen-Dazs |
| KFC | KFC |
| McDonald's | McDonald's |
| My Pastta | My Pastta |
| PANS & COMPANY | Pans & Company |
| PIZZA PINO | Pizza Pino Algarve |
| PORTUGUESE LAB | Portuguese Lab |
| STARBUCKS | Starbucks |
| TALHO BURGER | Talho Burger |
| The Pizza Lab | The pizza lab' |
| VITAMINAS | Vitaminas |
| WOK TO WALK | Wok to Walk |

## Written into curated_poi (82)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| Acium | `mall:mar_shopping_algarve:acium` | centre | 0 | store / jewelry |
| ALDO | `mall:mar_shopping_algarve:aldo` | osm | 1 | store / shoes |
| AROMAS | `mall:mar_shopping_algarve:aromas` | osm | 0 | store / beauty |
| BPI | `mall:mar_shopping_algarve:bpi` | osm | 0 | bank |
| CENTROXOGO | `mall:mar_shopping_algarve:centroxogo` | osm | 0 | store / toys |
| Chicco | `mall:mar_shopping_algarve:chicco` | osm | 1 | store / clothing |
| D'Oro Jóias | `mall:mar_shopping_algarve:d-oro-joias` | centre | 0 | store / jewelry |
| DECIMAS | `mall:mar_shopping_algarve:decimas` | osm | 0 | store / sports |
| DEICHMANN | `mall:mar_shopping_algarve:deichmann` | osm | 0 | store / shoes |
| Diana Studio | `mall:mar_shopping_algarve:diana-studio` | centre | 0 | nail_salon |
| ELY Flowers | `mall:mar_shopping_algarve:ely-flowers` | centre | 0 | florist |
| Equivalenza | `mall:mar_shopping_algarve:equivalenza` | centre | 1 | store / beauty |
| EYECONIC | `mall:mar_shopping_algarve:eyeconic` | osm | 0 | store / eyewear_and_optician |
| FALA SIMPLES | `mall:mar_shopping_algarve:fala-simples` | centre | 0 | store / phone |
| FNAC | `mall:mar_shopping_algarve:fnac` | osm | 1 | store / books |
| G-Shop | `mall:mar_shopping_algarve:g-shop` | osm | 0 | store / watch |
| Gold Suisse | `mall:mar_shopping_algarve:gold-suisse` | centre | 0 | store / pawn |
| Grasshopper | `mall:mar_shopping_algarve:grasshopper` | centre | 0 | amusement_park |
| Gumania | `mall:mar_shopping_algarve:gumania` | centre | 0 | bakery |
| iStore | `mall:mar_shopping_algarve:istore` | centre | 0 | store / electronics |
| JEAN LOUIS DAVID | `mall:mar_shopping_algarve:jean-louis-david` | osm | 0 | hairdresser |
| JOSE LUIS Joyerías | `mall:mar_shopping_algarve:jose-luis-joyerias` | osm | 0 | store / jewelry |
| La Casa de las Carcasas | `mall:mar_shopping_algarve:la-casa-de-las-carcasas` | centre | 0 | phone_repair / phone |
| Maisons du Monde | `mall:mar_shopping_algarve:maisons-du-monde` | osm | 1 | store / furniture |
| MASSIMO DUTTI | `mall:mar_shopping_algarve:massimo-dutti` | osm | 0 | store / clothing |
| MAYORAL | `mall:mar_shopping_algarve:mayoral` | osm | 1 | store / clothing |
| MEO | `mall:mar_shopping_algarve:meo` | osm | 0 | store / phone |
| Midas | `mall:mar_shopping_algarve:midas` | centre | -1 | store / auto_parts_and_supply |
| Mister Minit | `mall:mar_shopping_algarve:mister-minit` | osm | 0 | shoe_repair |
| MR BLUE | `mall:mar_shopping_algarve:mr-blue` | osm | 0 | store / clothing |
| Natura | `mall:mar_shopping_algarve:natura` | osm | 0 | store / clothing |
| Normal | `mall:mar_shopping_algarve:normal` | osm | 1 | store / discount_store |
| NOS | `mall:mar_shopping_algarve:nos` | osm | 0 | store / phone |
| NOTE! | `mall:mar_shopping_algarve:note` | osm | 0 | store / books |
| O BOTICÁRIO | `mall:mar_shopping_algarve:o-boticario` | osm | 0 | store / beauty |
| Opticalia | `mall:mar_shopping_algarve:opticalia` | centre | 0 | store / eyewear_and_optician |
| ORO VIVO | `mall:mar_shopping_algarve:oro-vivo` | osm | 0 | store / jewelry |
| OYSHO | `mall:mar_shopping_algarve:oysho` | osm | 0 | store / clothing |
| PACOMARTINEZ | `mall:mar_shopping_algarve:pacomartinez` | osm | 0 | store / handbag |
| PANDORA | `mall:mar_shopping_algarve:pandora` | osm | 0 | store / jewelry |
| PLURICOSMÉTICA | `mall:mar_shopping_algarve:pluricosmetica` | osm | 0 | store / beauty |
| PULL&BEAR | `mall:mar_shopping_algarve:pull-bear` | osm | 1 | store / clothing |
| PUNT ROMA | `mall:mar_shopping_algarve:punt-roma` | osm | 0 | store / womens_clothing |
| RKS | `mall:mar_shopping_algarve:rks` | centre | 0 | store / shoes |
| SALSA | `mall:mar_shopping_algarve:salsa` | osm | 0 | store / clothing |
| Sfera | `mall:mar_shopping_algarve:sfera` | osm | 1 | store / clothing |
| SKECHERS | `mall:mar_shopping_algarve:skechers` | osm | 1 | store / shoes |
| Snipes | `mall:mar_shopping_algarve:snipes` | osm | 1 | store / shoes |
| Sol e Sal | `mall:mar_shopping_algarve:sol-e-sal` | centre | 0 | beauty_salon |
| Sport Zone | `mall:mar_shopping_algarve:sport-zone` | centre | 0 | store / sports |
| SPRINGFIELD | `mall:mar_shopping_algarve:springfield` | osm | 1 | store / clothing |
| STRADIVARIUS | `mall:mar_shopping_algarve:stradivarius` | osm | 1 | store / clothing |
| SWAROVSKI | `mall:mar_shopping_algarve:swarovski` | osm | 0 | store / jewelry |
| The Barber Company | `mall:mar_shopping_algarve:the-barber-company` | centre | 1 | barber |
| TIFFOSI | `mall:mar_shopping_algarve:tiffosi` | centre | 0 | store / clothing |
| TRAMAS | `mall:mar_shopping_algarve:tramas` | osm | 1 | store / home |
| Tuttocars | `mall:mar_shopping_algarve:tuttocars` | centre | 0 | playground |
| Viagens Abreu | `mall:mar_shopping_algarve:viagens-abreu` | osm | 0 | travel_agency |
| VODAFONE | `mall:mar_shopping_algarve:vodafone` | osm | 0 | store / phone |
| WIÑK | `mall:mar_shopping_algarve:wink` | centre | 1 | nail_salon |
| WOMEN'SECRET | `mall:mar_shopping_algarve:women-secret` | osm | 0 | store / clothing |
| WORTEN | `mall:mar_shopping_algarve:worten` | osm | 0 | phone_repair / electronics |
| XIAOMI STORE PORTUGAL | `mall:mar_shopping_algarve:xiaomi-store-portugal` | centre | 0 | store / electronics |
| ZARA | `mall:mar_shopping_algarve:zara` | osm | 0 | store / clothing |
| ZARA HOME | `mall:mar_shopping_algarve:zara-home` | osm | 0 | store / home |
| ZIPPY | `mall:mar_shopping_algarve:zippy` | osm | 0 | store / clothing |
| Açaí Bliss | `mall:mar_shopping_algarve:acai-bliss` | centre | 0 | restaurant |
| ARCÁDIA - Casa do Chocolate | `mall:mar_shopping_algarve:arcadia-casa-do-chocolate` | osm | 0 | bakery |
| Arroz com Alma | `mall:mar_shopping_algarve:arroz-com-alma` | centre | 1 | restaurant |
| BIFANAS DE VENDAS NOVAS | `mall:mar_shopping_algarve:bifanas-de-vendas-novas` | osm | 1 | restaurant |
| Carte D’Or | `mall:mar_shopping_algarve:carte-d-or` | centre | 0 | ice_cream |
| Delta Espresso | `mall:mar_shopping_algarve:delta-espresso` | centre | 0 | cafe |
| Grill & Beer | `mall:mar_shopping_algarve:grill-beer` | osm | 1 | restaurant |
| H3 | `mall:mar_shopping_algarve:h3` | osm | 1 | restaurant |
| HANAMI SUSHI | `mall:mar_shopping_algarve:hanami-sushi` | osm | 1 | restaurant |
| JOSHUA'S SHOARMA | `mall:mar_shopping_algarve:joshua-s-shoarma` | osm | 1 | restaurant |
| Le Jardin Café | `mall:mar_shopping_algarve:le-jardin-cafe` | centre | 0 | cafe |
| Leonidas | `mall:mar_shopping_algarve:leonidas` | centre | 0 | bakery |
| Loja das Sopas | `mall:mar_shopping_algarve:loja-das-sopas` | centre | 1 | restaurant |
| Poke House | `mall:mar_shopping_algarve:poke-house` | centre | 1 | restaurant |
| Portugália Balcão | `mall:mar_shopping_algarve:portugalia-balcao` | osm | 1 | restaurant |
| Weeel | `mall:mar_shopping_algarve:weeel` | centre | 0 | ice_cream |
