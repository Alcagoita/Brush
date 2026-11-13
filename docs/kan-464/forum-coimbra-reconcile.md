# Forum Coimbra reconcile — KAN-464, applied 2026-11-13

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0072_kan464_forum_coimbra.sql`, and verified through `POST /poi/nearby`: all 127 listed units are served, and none of the 27 withdrawn rows is.

## Inputs

* `mall_lists/forum_coimbra.txt` — the operator's 127 units, read from forum-coimbra.com 2026-11-13 (each card's `data-floor` is its map tab: floor = data-floor − 1)
* `mall_lists/forum_coimbra_types.tsv` — the typing of every unit, with its evidence
* held rows inside the 65 m buffer of OSM `way/37079296` (Overture and curated)
* far rows: within Coimbra carrying "Forum Coimbra" in name or address
* OSM shops in the same box, to place the units we did not hold

## Withdrawn (27)

| row | name | why |
|---|---|---|
| `2a701726-ef0e-4aa2-8068-086983359cc9` | Hanami Sushi | listed 'Hanami Sushi' pinned 4597 m outside Forum Coimbra; the unit is served from a row inside |
| `2c5e7d34-3c4c-49e9-bb8b-1d2007a10231` | McDonald's - Coimbra Forum | listed "McDonald's" pinned 325 m outside Forum Coimbra; the unit is served from a row inside |
| `61c4d086-075f-41f6-914c-2696157dcc9b` | COIMBRA SC FORUM COIMBRA | Forum Coimbra's address but not on its tenant list, pinned 900 m outside |
| `90f85758-7a5b-4f9f-91cd-2440b4ed4e7e` | McDonald's fórum coimbra | listed "McDonald's" pinned 1012 m outside Forum Coimbra; the unit is served from a row inside |
| `d450216d-78da-462c-8297-d20fbba751d3` | Pandora | listed 'Pandora' pinned 101 m outside Forum Coimbra; the unit is served from a row inside |
| `dd550490-c361-440c-824d-b16e6c9bc49b` | Lego | listed 'LEGO' pinned 101 m outside Forum Coimbra; the unit is served from a row inside |
| `f9cb17ec-e639-44c7-90be-fcad53baad5a` | Forum Coimbra | Forum Coimbra's address but not on its tenant list, pinned 153 m outside |
| `0cef97ae-12cb-4bc7-80c0-1a049c2702e7` | Claire's | not on the Forum Coimbra tenant list |
| `1db94e1a-732b-4f75-8cc7-6b3349c415cf` | Carlos Santos Hair Shop | not on the Forum Coimbra tenant list |
| `295a9038-eb6f-42cc-8982-18a654220612` | Nike | not on the Forum Coimbra tenant list |
| `43c8947d-0abd-469c-99a7-f4f56c32bb08` | The Body Shop | not on the Forum Coimbra tenant list |
| `53c5a180-4466-4232-9fa8-f3ab35a37c42` | Courir | not on the Forum Coimbra tenant list |
| `75a4f2a8-5909-4ba2-8185-5ace857515ac` | M&M Flowers - Florista | not on the Forum Coimbra tenant list |
| `77c64ed5-77cf-4f81-9290-bb7141d3973e` | Redken | not on the Forum Coimbra tenant list |
| `8d7f2d7c-4a2e-4f4e-8704-256c08b359d0` | Oysho | not on the Forum Coimbra tenant list |
| `8f271335-6616-468c-aba9-e07d7b4bdc54` | EcoCarWash Coimbra | not on the Forum Coimbra tenant list |
| `95865d4a-549d-430e-b381-dd69a4898903` | Mille Paste | not on the Forum Coimbra tenant list |
| `9e28ebd8-064d-4ecf-a300-5f7e65384789` | Ponto CTT | not on the Forum Coimbra tenant list |
| `b0314cf7-5827-4d62-9580-be0d83933e49` | Lanidor Kids, Forum Coimbra | not on the Forum Coimbra tenant list |
| `d181e8bc-0a69-4b67-ad0c-37e08a0ec888` | Restaurante Tun Fon | not on the Forum Coimbra tenant list |
| `dadf10fe-7145-4463-a067-155e0bae10f0` | Talho Burger Coimbra | not on the Forum Coimbra tenant list |
| `e022f6d9-e37b-4b64-a181-85160ad7f8e8` | A Loja do Gato Preto | not on the Forum Coimbra tenant list |
| `eae28d57-b630-436b-b554-2d268c682489` | CTT | not on the Forum Coimbra tenant list |
| `efa4dcf4-8d0d-41c0-a75c-3b7b26a0b9d3` | Douglas | not on the Forum Coimbra tenant list |
| `f9e2b609-b69c-46da-bdab-65152d86e3d9` | Hussel | not on the Forum Coimbra tenant list |
| `cae27ddf-59f5-4ee2-a085-dad2d5929cdc` | IKEA | not on the Forum Coimbra tenant list |
| `c45eb93f-3030-4c85-aa62-abf210d174f2` | The North Face Coimbra | same shop as listed 'The North Face', a second row 46 m out on the centre's street number (withdrawn after the plan, in the same migration) |

## Kept — neighbours (2)

* Decathlon Coimbra (`store`)
* Galp (`gas`)

## Held — the row answering each unit, given the list's type and floor (76)

| listed | held row |
|---|---|
| A Tabacaria | A Tabacaria |
| Alentejo | Alentejo Pão Azeite Alho |
| Benetton | United Colors of Benetton |
| Bershka | Bershka |
| BERTRAND | Livraria Bertrand |
| Boutique dos Relógios | Boutique dos Relógios |
| Brasil ao Peso / Grelhados & Cª | Grelhados & Cª. |
| Burger King | Burger King |
| CALZEDONIA | Calzedonia |
| CEX | CeX |
| Chimarrão | Chimarrão Coimbra |
| Cinemas NOS | Cinemas NOS Forum Coimbra |
| Continente | Continente |
| Cortes de Lisboa | Cortes de Lisboa |
| Ericeira | Ericeira Surf Shop |
| Farmácia do Forum | Farmácia do Forum |
| Flying Tiger | Flying Tiger Copenhagen |
| FNAC | FNAC |
| Frango da Guia | Sr. Frango da Guia |
| FUXIA | Fuxia Forum Coimbra |
| GANT | GANT Coimbra |
| GÓIS JOALHEIROS | Gois Time and Secrets |
| GUESS | GUESS |
| H&M | H&M |
| H3 | H3 Hambúrguer Gourmet |
| Hanami Sushi | Hanami Sushi Forum Coimbra |
| I Services | iServices Forum Coimbra |
| INTIMISSIMI | Intimissimi |
| INTIMISSIMI UOMO | IUMAN Intimissimi Uomo |
| Italian Republic | Italian Republic |
| JD SPORTS | JD Sports |
| Jean Louis David | Jean Louis David Forum Coimbra |
| Joshua’s Shoarma Grill | Joshua's Shoarma Forum |
| KFC | KFC |
| KIKO MILANO | Kiko Milano |
| LACOSTE | Lacoste |
| Lefties | Lefties |
| Levi's | Levi's |
| Lion of Porches | Lion of Porches |
| Mais Optica | Mais Optica |
| Mango | Mango |
| MANIA POKE BOWLS | Mania Poké Bowls |
| Massimo Dutti | Massimo Dutti |
| Mau Feitio | Mau Feitio |
| McDonald's | McDonald's |
| MISAKO | MISAKO |
| Multiópticas | MultiOpticas |
| NESPRESSO | Nespresso |
| O Boticário | O Boticário |
| OLÁ | Olá |
| Pans & Company | Pans & Company |
| Parfois | Parfois |
| Perfumes&Companhia | Perfumes & Companhia |
| Pizza Hut | Pizza Hut |
| PRIMARK | Primark |
| Pull&Bear | Pull & Bear |
| RITUALS | Rituals |
| SACOOR | Sacoor Brothers |
| Samsonite | Samsonite |
| SICAL | Sical |
| SNIPES | SNIPES |
| SPRINGFIELD | Springfield |
| STRADIVARIUS | Stradivarius, Coimbra Forum |
| SUBWAY | Subway |
| SUNGLASS HUT | Sunglass Hut |
| Taco Bell | Taco Bell Forum Coimbra |
| Tezenis | Tezenis |
| The North Face | The North Face Coimbra |
| TIFFOSI DENIM & KIDS | Tiffosi |
| TIMBERLAND | Timberland |
| TOUS | Tous Jewelry |
| Triumph | Triumph |
| VITAMINAS | Vitaminas Forum Coimbra |
| WORTEN | Worten |
| XTREME | Xtreme |
| ZARA | Zara |

## Written into curated_poi (51)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| Adidas | `mall:forum_coimbra:adidas` | osm | 1 | store / sports |
| Aldo | `mall:forum_coimbra:aldo` | osm | 1 | store / shoes |
| Arcádia | `mall:forum_coimbra:arcadia` | osm | 0 | bakery |
| Bifanas de Vendas Novas | `mall:forum_coimbra:bifanas-de-vendas-novas` | osm | 2 | restaurant |
| Bijou Brigitte | `mall:forum_coimbra:bijou-brigitte` | osm | 1 | store / jewelry |
| BIMBA Y LOLA | `mall:forum_coimbra:bimba-y-lola` | osm | 1 | store / clothing |
| Bitoque no Ponto | `mall:forum_coimbra:bitoque-no-ponto` | osm | 2 | restaurant |
| Celeiro | `mall:forum_coimbra:celeiro` | osm | 0 | supermarket |
| Chicco | `mall:forum_coimbra:chicco` | osm | 0 | store / clothing |
| Clínica de Santa Madalena | `mall:forum_coimbra:clinica-de-santa-madalena` | centre | 0 | clinic |
| CORTEFIEL | `mall:forum_coimbra:cortefiel` | osm | 1 | store / clothing |
| Dreams For You | `mall:forum_coimbra:dreams-for-you` | osm | 1 | store / jewelry |
| Fitness Factory | `mall:forum_coimbra:fitness-factory` | centre | 2 | gym |
| INVEJA | `mall:forum_coimbra:inveja` | osm | 2 | restaurant |
| iStore | `mall:forum_coimbra:istore` | osm | 0 | store / electronics |
| LEGO | `mall:forum_coimbra:lego` | centre | 0 | store / toys |
| Loja do Benfica | `mall:forum_coimbra:loja-do-benfica` | centre | 0 | store / club_store |
| Lugar da Jóia | `mall:forum_coimbra:lugar-da-joia` | osm | 0 | store / jewelry |
| MEO | `mall:forum_coimbra:meo` | osm | 0 | store / phone |
| MISTER MINIT | `mall:forum_coimbra:mister-minit` | osm | 0 | shoe_repair |
| NAILS 4' US | `mall:forum_coimbra:nails-4-us` | centre | 1 | nail_salon |
| Nicola | `mall:forum_coimbra:nicola` | osm | 2 | cafe |
| Norauto | `mall:forum_coimbra:norauto` | osm | 1 | store / auto_parts_and_supply |
| NOS | `mall:forum_coimbra:nos` | osm | 0 | store / phone |
| Nova Câmbios | `mall:forum_coimbra:nova-cambios` | osm | 0 | currency_exchange |
| ORO VIVO | `mall:forum_coimbra:oro-vivo` | osm | 0 | store / jewelry |
| Pandora | `mall:forum_coimbra:pandora` | osm | 1 | store / jewelry |
| Pluricosmética | `mall:forum_coimbra:pluricosmetica` | osm | 0 | store / beauty |
| Portugália | `mall:forum_coimbra:portugalia` | osm | 2 | restaurant |
| PRIMOR | `mall:forum_coimbra:primor` | osm | 1 | store / beauty |
| PUNT ROMA | `mall:forum_coimbra:punt-roma` | osm | 1 | store / womens_clothing |
| Quiosque VIIM | `mall:forum_coimbra:quiosque-viim` | centre | 1 | cafe |
| Salsa | `mall:forum_coimbra:salsa` | osm | 1 | store / clothing |
| SAMSUNG | `mall:forum_coimbra:samsung` | osm | 0 | store / electronics |
| SEASIDE | `mall:forum_coimbra:seaside` | osm | 0 | store / shoes |
| Sisley | `mall:forum_coimbra:sisley` | osm | 1 | store / clothing |
| Skechers | `mall:forum_coimbra:skechers` | osm | 0 | store / shoes |
| Sopas&Sopas | `mall:forum_coimbra:sopas-sopas` | osm | 2 | restaurant |
| Suits Inc | `mall:forum_coimbra:suits-inc` | osm | 1 | store / clothing |
| Swarovski | `mall:forum_coimbra:swarovski` | osm | 1 | store / jewelry |
| Tea Shop | `mall:forum_coimbra:tea-shop` | centre | 0 | tea |
| Tomatino | `mall:forum_coimbra:tomatino` | osm | 2 | restaurant |
| Viagens ABREU | `mall:forum_coimbra:viagens-abreu` | osm | 0 | travel_agency |
| Vícios Urbanos | `mall:forum_coimbra:vicios-urbanos` | osm | 1 | tobacco / newspaper_and_magazines |
| Vodafone | `mall:forum_coimbra:vodafone` | osm | 0 | store / phone |
| Wells Ótica | `mall:forum_coimbra:wells-otica` | osm | 0 | store / eyewear_and_optician |
| WOK TO WALK | `mall:forum_coimbra:wok-to-walk` | osm | 2 | restaurant |
| WOMEN’SECRET | `mall:forum_coimbra:women-secret` | osm | 1 | store / clothing |
| Xiaomi | `mall:forum_coimbra:xiaomi` | osm | 0 | store / electronics |
| ZARA HOME | `mall:forum_coimbra:zara-home` | osm | 1 | store / home |
| ZIPPY | `mall:forum_coimbra:zippy` | osm | 0 | store / clothing |
