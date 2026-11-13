# Forum Algarve reconcile — KAN-466, applied 2026-11-13

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0075_kan466_algarve.sql`, and verified through `POST /poi/nearby`: all 117 listed units are served, and none of the 29 withdrawn rows is.

## Inputs

* `mall_lists/forum_algarve.txt` — 117 units from forumalgarve.net (floor = data-floor − 2: the map tabs are Piso -1, 0, 1)
* `mall_lists/forum_algarve_types.tsv`
* held rows inside the 50 m buffer of OSM `way/182734578`
* far rows carrying "Forum Algarve" / "km 103", minus Gymnasium Faro
* OSM shops in the same box

## Withdrawn (29)

| row | name | why |
|---|---|---|
| `77b359ec-3a1d-442b-bc43-e67caf045f6f` | Boutique Nespresso | same shop as listed 'Nespresso', held twice; the other row kept |
| `924027f0-b8cf-4232-9996-68d020473505` | Stradivarius, Faro | same shop as listed 'Stradivarius', held twice; the other row kept |
| `a975ca4b-7d04-4d8b-a207-6d1374a7ffd9` | Burger King | same shop as listed 'Burger King', held twice; the other row kept |
| `465b1e5a-4f41-4a93-a677-23f506682f9c` | Óptica Auchan Faro | same shop as listed 'Auchan Faro', held twice; the other row kept |
| `1526c245-cc65-4889-840f-684f0707a45e` | Sabores do Churrasco | listed 'Sabores do Churrasco' pinned 1429 m outside Forum Algarve; the unit is served from a row inside |
| `6333d985-76b7-4730-ae47-52949135e828` | Aldo, Forum Algarve | listed 'Aldo' pinned 898 m outside Forum Algarve; the unit is served from a row inside |
| `71663177-5571-4751-96c0-d65dddd78179` | FARO SC FORUM ALGARVE | Forum Algarve's address but not on its tenant list, pinned 9508 m outside |
| `b5d89d6a-efdd-4455-b942-91a914f527ea` | Faro Forum Algarve | listed 'Auchan Faro' pinned 1453 m outside Forum Algarve; the unit is served from a row inside |
| `c14d248d-3348-4ea4-9f0b-07d1a2466a21` | GANT Faro | listed 'Gant' pinned 1580 m outside Forum Algarve; the unit is served from a row inside |
| `e8f50a91-63d7-4bcb-8836-36b6e811abb8` | FNAC Faro | listed 'FNAC' pinned 5097 m outside Forum Algarve; the unit is served from a row inside |
| `e89fbfc8-6a94-4375-9e46-a9bef1dfadbd` | OPTICALIA FORUM ALGARVE em Faro | Forum Algarve's address but not on its tenant list, pinned 679 m outside |
| `094674ef-cede-48a3-a6f6-7d29e8685e2c` | Redken | not on the Forum Algarve tenant list |
| `0e1c6df5-9857-4b23-8770-a3bbd67828f0` | Imaginarium | not on the Forum Algarve tenant list |
| `0fa3e9a4-adac-43db-8e40-b77bfee14b36` | O Dogao_Faro | not on the Forum Algarve tenant list |
| `0fa6502c-153e-4d18-9dbd-a6f46aa59c1d` | Jean Louis David | not on the Forum Algarve tenant list |
| `1eb428e3-e7a0-4c12-af4e-36f473d4d6c7` | Courir | not on the Forum Algarve tenant list |
| `3c422b5a-725c-49c5-93ae-661f5560f7ad` | llaollao | not on the Forum Algarve tenant list |
| `684225a7-5dd3-4caa-a3e0-5a01b644addd` | Happy Family | not on the Forum Algarve tenant list |
| `68733002-beda-4c62-9ae5-e14f4808f228` | Il Café Di Roma | not on the Forum Algarve tenant list |
| `6876ba6d-492e-4376-9ae6-a2b5fe2fd4c3` | A Loja do Gato Preto | not on the Forum Algarve tenant list |
| `94396384-72fb-40a3-9128-c968f62b5d6c` | Geox | not on the Forum Algarve tenant list |
| `9fd9d773-0037-4cf0-9f90-77628571393c` | Jumbo de Faro | not on the Forum Algarve tenant list |
| `a65fd759-7ad1-43f7-9f18-3c7ba7808089` | QUICK PICK | not on the Forum Algarve tenant list |
| `b0ee0cf1-8fba-4de5-ba28-b15455d544b5` | Relógios e Joias PT | not on the Forum Algarve tenant list |
| `b3d32505-a1c8-4f86-aac0-b42e4e571021` | Foot Locker | not on the Forum Algarve tenant list |
| `d1bafc87-cff9-4485-a468-2a0c9647ab28` | The Body Shop | not on the Forum Algarve tenant list |
| `d38b7682-79ca-4a64-a5f6-d345c1a8a97f` | The world needs natas | not on the Forum Algarve tenant list |
| `d68b58eb-c16e-4142-b059-44170eef7693` | Bubble Spot | not on the Forum Algarve tenant list |
| `f10557c8-f86e-4a2c-9562-2b897bf01267` | Claire's | not on the Forum Algarve tenant list |

## Kept — neighbours (3)

* Wash.ME - Faro - Lidl (`laundry`)
* Diocese do Algarve (`church`)
* Sabor Carioca Salgados (`restaurant`)

## Held — the row answering each unit, given the list's type and floor (61)

| listed | held row |
|---|---|
| 1920 Barber Shop | 1920 Barber Shop |
| Auchan Faro | Auchan |
| Bershka | Bershka |
| Burger King | Burger King |
| C&A | C&A |
| Café do Lado | Café do Lado |
| Calzedonia | Calzedonia |
| Celeiro | Celeiro |
| Chamaquito | Chamaquito |
| Cinemas NOS | Cinemas NOS Forum Algarve |
| Cortefiel / Women'Secret | Cortefiel |
| Doner Kebab Al Sultão | Doner Kebab Al Sultao |
| Douglas | Douglas |
| Farmácia Baptista | Farmácia Baptista |
| Flying Tiger | Flying Tiger Copenhagen |
| FNAC | Fnac |
| GMS Store | GMS Store |
| Guess | GUESS |
| H3 | H3 Hambúrguer Gourmet |
| Intimissimi | Intimissimi |
| JD Sports | JD Sports |
| Joshua's Shoarma | Joshua's Shoarma Grill |
| KFC | KFC |
| Lacoste | Lacoste Forum Algarve |
| Lefties | Lefties |
| Levi's Store | Levi's |
| Livraria Bertrand | Bertrand |
| Loja das Sopas | Loja das Sopas |
| Mais Óptica | Mais Optica |
| Mango | Mango |
| Massimo Dutti | Massimo Dutti |
| McDonald's | McDonald's |
| MEO | Loja MEO |
| Mr. Blue | Mr. Blue Fórum Algarve |
| MultiOpticas | MultiOpticas |
| Nespresso | Nespresso Boutique |
| Oysho | Oysho |
| Pandora | Pandora |
| Pans & Company | Pans & Company |
| Parfois | Parfois |
| Pizza Hut | Pizza Hut |
| Portugália Balcão | Portugalia Forum Algarve |
| Pull & Bear | Pull & Bear |
| Rituals | Rituals |
| Sabores do Churrasco | Sabores do Churrasco |
| Skechers | Skechers Forum Algarve |
| Snipes | SNIPES |
| Sportzone | Sport Zone |
| Springfield | Springfield |
| Starbucks | Starbucks |
| Stradivarius | Stradivarius |
| Swarovski | Swarovski |
| Talho Burger | Talho Burger Forum Algarve |
| Terra Pura | Terra Pura Faro |
| Tiffosi | Tiffosi |
| Timberland | Timberland Forum Algarve |
| Tous | Tous |
| Triumph | Triumph |
| Vans | Vans Forum Algarve |
| Wok to Walk | Wok to Walk Forum Algarve |
| Zara | Zara |

## Written into curated_poi (56)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| ACP | `mall:forum_algarve:acp` | centre | 0 | store / auto_parts_and_supply |
| Alberto Oculista | `mall:forum_algarve:alberto-oculista` | centre | 0 | store / eyewear_and_optician |
| Aldo | `mall:forum_algarve:aldo` | osm | 1 | store / shoes |
| Arcádia | `mall:forum_algarve:arcadia` | centre | 0 | bakery |
| Baja Fresh | `mall:forum_algarve:baja-fresh` | centre | 1 | restaurant |
| Bifanas de Vendas Novas | `mall:forum_algarve:bifanas-de-vendas-novas` | centre | 1 | restaurant |
| Blue Banana | `mall:forum_algarve:blue-banana` | centre | 0 | store / clothing |
| Blue Lavandaria | `mall:forum_algarve:blue-lavandaria` | centre | -1 | laundry |
| Boutique dos Relógios | `mall:forum_algarve:boutique-dos-relogios` | centre | 0 | store / jewelry |
| Centro Xogo | `mall:forum_algarve:centro-xogo` | centre | 1 | store / toys |
| CeX | `mall:forum_algarve:cex` | centre | 0 | store / electronics |
| Delta Espresso | `mall:forum_algarve:delta-espresso` | centre | 1 | cafe |
| Diana Studio | `mall:forum_algarve:diana-studio` | centre | 0 | nail_salon |
| Eco Car Wash | `mall:forum_algarve:eco-car-wash` | centre | -1 | car_wash |
| Emma | `mall:forum_algarve:emma` | centre | 0 | store / mattress |
| Equivalenza | `mall:forum_algarve:equivalenza` | osm | 0 | store / beauty |
| Ericeira Surf & Skate | `mall:forum_algarve:ericeira-surf-skate` | centre | 1 | store / sports |
| Fotosport | `mall:forum_algarve:fotosport` | centre | 0 | store / photography_store_and_services |
| Gant | `mall:forum_algarve:gant` | osm | 1 | store / clothing |
| Hanami Sushi | `mall:forum_algarve:hanami-sushi` | centre | 1 | restaurant |
| Hawkers | `mall:forum_algarve:hawkers` | centre | 0 | store / sunglasses |
| Hey Doc | `mall:forum_algarve:hey-doc` | centre | 0 | store / beauty |
| Kiko Milano | `mall:forum_algarve:kiko-milano` | osm | 0 | store / beauty |
| Love N'Roll | `mall:forum_algarve:love-n-roll` | centre | 1 | ice_cream |
| Mayoral | `mall:forum_algarve:mayoral` | centre | 0 | store / clothing |
| Mister Minit | `mall:forum_algarve:mister-minit` | osm | 0 | shoe_repair |
| Mundo do Café | `mall:forum_algarve:mundo-do-cafe` | centre | 0 | cafe |
| Nata Lisboa | `mall:forum_algarve:nata-lisboa` | centre | 0 | cafe |
| NOS | `mall:forum_algarve:nos` | osm | 0 | store / phone |
| O Boticário | `mall:forum_algarve:o-boticario` | osm | 0 | store / beauty |
| O Melhor Croissant da Rua | `mall:forum_algarve:o-melhor-croissant-da-rua` | centre | 0 | cafe |
| O Seu Bitoque | `mall:forum_algarve:o-seu-bitoque` | centre | 1 | restaurant |
| Paco Martinez | `mall:forum_algarve:paco-martinez` | centre | 0 | store / handbag |
| Paulo Miranda Joalheiro | `mall:forum_algarve:paulo-miranda-joalheiro` | centre | 0 | store / jewelry |
| Pluricosmética | `mall:forum_algarve:pluricosmetica` | centre | 1 | store / beauty |
| Poke House | `mall:forum_algarve:poke-house` | centre | 1 | restaurant |
| Presse Linha | `mall:forum_algarve:presse-linha` | centre | 1 | store / newspaper_and_magazines |
| Primor | `mall:forum_algarve:primor` | osm | 1 | store / beauty |
| Salsa | `mall:forum_algarve:salsa` | centre | 1 | store / clothing |
| Samsung | `mall:forum_algarve:samsung` | osm | 0 | store / electronics |
| Santander Totta | `mall:forum_algarve:santander-totta` | osm | 0 | bank |
| Seeds | `mall:forum_algarve:seeds` | centre | 0 | florist |
| Sergent Major | `mall:forum_algarve:sergent-major` | centre | 0 | store / childrens_clothing |
| Taco Bell | `mall:forum_algarve:taco-bell` | centre | 1 | restaurant |
| Tomatino | `mall:forum_algarve:tomatino` | osm | 1 | restaurant |
| Top Atlântico | `mall:forum_algarve:top-atlantico` | centre | 0 | travel_agency |
| Unicâmbio | `mall:forum_algarve:unicambio` | centre | 0 | currency_exchange |
| Viagens Abreu | `mall:forum_algarve:viagens-abreu` | osm | 0 | travel_agency |
| Vista Alegre | `mall:forum_algarve:vista-alegre` | centre | 0 | store / home |
| Vitaminas | `mall:forum_algarve:vitaminas` | osm | 1 | restaurant |
| Vodafone | `mall:forum_algarve:vodafone` | osm | 0 | store / phone |
| Volto Drive | `mall:forum_algarve:volto-drive` | centre | -1 | car_rental |
| Wiñk | `mall:forum_algarve:wink` | centre | 0 | nail_salon |
| Worten Mobile | `mall:forum_algarve:worten-mobile` | osm | 0 | phone_repair / electronics |
| Zara Home | `mall:forum_algarve:zara-home` | osm | 0 | store / home |
| Zippy | `mall:forum_algarve:zippy` | osm | 1 | store / clothing |
