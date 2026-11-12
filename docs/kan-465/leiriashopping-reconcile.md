# LeiriaShopping reconcile — KAN-465, applied 2026-11-12

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0069_kan465_leiriashopping.sql`, and verified through `POST /poi/nearby`: all 122 listed units are served, and none of the 25 withdrawn rows is.

## Inputs

* `mall_lists/leiriashopping.txt` — the operator's 122 units, supplied by the owner 2026-11-12
* `mall_lists/leiriashopping_types.tsv` — the typing of every unit, with its evidence
* held rows inside the 55 m buffer of OSM `way/192124002` (Overture and curated)
* far rows: within ~5 km carrying "Leiria Shopping" / "LeiriaShopping" in name or address, minus Leiridance (*atrás do*), Try Moto and a Worten outlet on Quinta do Seminário
* OSM shops in the same box, to place the units we did not hold

## Withdrawn (25)

| row | name | why |
|---|---|---|
| `ba63f1df-735c-4a94-b57f-6dfc54dfd481` | NKiosk Nespresso | same shop as listed 'Nespresso', held twice; the other row kept |
| `00ae5bb5-0e10-4694-b387-6cb641d63a1e` | Ornimundo | LeiriaShopping's address but not on its tenant list, pinned 1141 m outside |
| `31277bbb-cc9f-4797-b373-85dd39047183` | McDonald's leiriashopping | listed "McDonald's" pinned 630 m outside LeiriaShopping; the unit is served from a row inside |
| `33f1dba6-02dd-4937-9b2a-522abee2b4ed` | Widex Centro Auditivo Leiria Shopping | LeiriaShopping's address but not on its tenant list, pinned 168 m outside |
| `3696b5e1-36be-4acd-ab16-0cf1f3ff5450` | Levi's | listed 'Levi’s Store' pinned 162 m outside LeiriaShopping; the unit is served from a row inside |
| `463da883-378c-45a9-b756-b2ca21254848` | Pandora | listed 'Pandora' pinned 163 m outside LeiriaShopping; the unit is served from a row inside |
| `561d43ab-0501-4e04-a1ec-ddbed7db017f` | LEIRIA SC LEIRIA SHOPPING | LeiriaShopping's address but not on its tenant list, pinned 2199 m outside |
| `c195f3d9-a269-4d6d-a450-5cda98b9a767` | McDonald's - LeiriaShopping | listed "McDonald's" pinned 1847 m outside LeiriaShopping; the unit is served from a row inside |
| `c3924a7e-14f2-4446-9e9e-038928235144` | QUIOSQUE QSTORE LEIRIA SHOPPING | LeiriaShopping's address but not on its tenant list, pinned 376 m outside |
| `db4ca1f1-53e0-4b50-9ffb-7ab83e03c895` | Croissanteria Meia Lua | LeiriaShopping's address but not on its tenant list, pinned 2330 m outside |
| `ece1a21b-4b4e-40f2-8a94-34ab0d81ebde` | Flying Tiger Copenhagen | listed 'Flying Tiger' pinned 739 m outside LeiriaShopping; the unit is served from a row inside |
| `1bb8c1e0-1a46-45b7-90b4-97b53b5a2d2c` | Geox | not on the LeiriaShopping tenant list |
| `3f8f3032-fb85-4869-a7af-8da4c64e9a2c` | Sushi-Leiria DiscoClub | not on the LeiriaShopping tenant list |
| `762f0385-c89a-49d3-9fb7-93b0a5abb846` | My Tags | not on the LeiriaShopping tenant list |
| `77b1b30e-9dcd-4ff6-bea2-1f6e24fc2c4d` | Douglas | not on the LeiriaShopping tenant list |
| `80aeff37-1c99-461b-bea2-7c91eda20452` | Samsonite | not on the LeiriaShopping tenant list |
| `8731acef-42f9-4581-ab0a-1b111b546bee` | Cineplace Portugal | not on the LeiriaShopping tenant list |
| `9a7af2b5-7dae-4215-a275-bf6fa4516130` | Domundo | not on the LeiriaShopping tenant list |
| `abe65c74-364d-4429-8c7a-8a12a6d85e59` | Eurekakids | not on the LeiriaShopping tenant list |
| `ad05b060-aec4-477f-ae21-46f3290cf4a7` | A Loja do Gato Preto | not on the LeiriaShopping tenant list |
| `b7a98c5a-f003-43de-8b1b-4af9cceb5708` | 5àSec | not on the LeiriaShopping tenant list |
| `ebf0cda6-b88c-49d1-8e20-1ea73b3535b1` | Sunglass Hut | not on the LeiriaShopping tenant list |
| `cc1ec9cb-0a84-4a4c-88e4-73ea04152034` | Claire's | not on the LeiriaShopping tenant list |
| `fsq:506f310ee4b0f7e685db38b7` | Igreja de S. Pedro | not on the LeiriaShopping tenant list |
| `fsq:522b6f1311d235eba4fd4491` | Cineplace LeiriaShopping | not on the LeiriaShopping tenant list |

## Kept — neighbours (6)

* C&A (`store`)
* Galp (`gas`)
* Colshop (`store`)
* Amazon Locker - Andre (`post`)
* JEEP LPM LEIRIA (`store`)
* Sports Direct (`store`)

## Held — the row answering each unit, given the list's type and floor (66)

| listed | held row |
|---|---|
| Amados Cabeleireiros | Amados Cabeleireiros |
| Bershka | Bershka |
| BlueBird | Bluebird LeiriaShopping - Relógios e Joias |
| Brasa Rio | Brasa Rio |
| BStrong | BStrong |
| Burger King | Burger King |
| Calzedonia | Calzedonia |
| Celeiro | Celeiro |
| Continente | Continente |
| Cortes de Lisboa | Cortes de Lisboa |
| Equivalenza | Equivalenza |
| Espaço Come | Espaço Come |
| Espaco Nicola | Espaço Nicola |
| Farmácia Maio | Farmácia Maio |
| Flying Tiger | Flying Tiger Copenhagen |
| Fnac | Fnac |
| Gráfia | Gráfia |
| Guess | GUESS |
| H3 - New Hamburgology | H3 Hambúrguer Gourmet |
| Hanami Sushi | Hanami Sushi Leiria Shopping |
| H&M | H&M |
| Intimissimi | Intimissimi |
| JD Sports | JD Sports |
| Joshua's Shoarma | Joshua's Shoarma Grill |
| La Casa de Las Carcasas | La Casa de las Carcasas |
| Lanidor | Lanidor Woman |
| Leitão com Pão | Leitão Com Pão |
| Lojas das Sopas | Loja das Sopas |
| Mais Óptica | Mais Optica |
| Mango | Mango |
| Massimo Dutti | Massimo Dutti |
| MEO | Loja MEO |
| MO | MO |
| MultiOpticas | MultiOpticas |
| Natura | Natura |
| Nespresso | Nespresso |
| NOTE | note! Leiria - LeiriaShopping |
| O Boticário | O Boticário, LeiriaShopping |
| Olá | Olá |
| Oysho | Oysho |
| Pans & Company | Pans and Company |
| Parfois | Parfois |
| Perfumes & Companhia | Perfumes & Companhia |
| Pizza Hut | Pizza Hut |
| Plush | Plush Gift |
| Portugália Balcão | Portugália |
| Pull & Bear | Pull&Bear |
| Quebramar | Quebramar |
| Sacoor Brothers | Sacoor Brothers |
| Sport Zone | Sport Zone Leiria |
| Springfield | Springfield |
| Stradivarius | Stradivarius |
| Subway | Subway Leiria Shopping |
| Tezenis | Tezenis, LeiriaShopping |
| Tienda Animal | Tiendanimal |
| Tiffosi | Tiffosi |
| Timberland | Timberland Leiria Shopping |
| Tous | Tous |
| Triumph | Triumph |
| Tutto Chicco | Chicco |
| Vet Shopping | VetShopping |
| Vitaminas | Restaurante Vitaminas & Companhia |
| Well's | WELLS LEIRIA SHOPPING |
| Wok to Walk | Wok to Walk Leiria Shopping |
| Worten | Worten - Leiria |
| Zara | Zara |

## Written into curated_poi (56)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| 2life | `mall:leiriashopping:2life` | centre | 0 | store / pawn |
| Açaí Natura | `mall:leiriashopping:acai-natura` | osm | 0 | restaurant |
| Acium | `mall:leiriashopping:acium` | centre | 0 | store / jewelry |
| Agência Abreu | `mall:leiriashopping:agencia-abreu` | osm | 0 | travel_agency |
| Aldo | `mall:leiriashopping:aldo` | osm | 1 | store / shoes |
| Bagga | `mall:leiriashopping:bagga` | centre | 0 | cafe |
| Beontime | `mall:leiriashopping:beontime` | centre | 1 | store / watch |
| Bijou Brigitte | `mall:leiriashopping:bijou-brigitte` | osm | 0 | store / jewelry |
| Boutique dos Relógios | `mall:leiriashopping:boutique-dos-relogios` | centre | 0 | store / jewelry |
| CeX | `mall:leiriashopping:cex` | centre | 0 | store / electronics |
| Chaviarte Express | `mall:leiriashopping:chaviarte-express` | centre | 0 | shoe_repair |
| Cinemas NOS | `mall:leiriashopping:cinemas-nos` | centre | 1 | movie_theater |
| Decenio | `mall:leiriashopping:decenio` | centre | 1 | store / clothing |
| Digi | `mall:leiriashopping:digi` | centre | 0 | store / phone |
| Druni | `mall:leiriashopping:druni` | centre | 0 | store / beauty |
| Ericeira | `mall:leiriashopping:ericeira` | centre | 0 | store / sports |
| Feu Vert | `mall:leiriashopping:feu-vert` | centre | 0 | store / auto_parts_and_supply |
| Flormar | `mall:leiriashopping:flormar` | centre | 1 | store / beauty |
| Giovanni Galli | `mall:leiriashopping:giovanni-galli` | centre | 1 | store / mens_clothing |
| HeyDoc | `mall:leiriashopping:heydoc` | centre | 0 | store / beauty |
| Ice It | `mall:leiriashopping:ice-it` | centre | 1 | ice_cream |
| Intimissimi Uomo | `mall:leiriashopping:intimissimi-uomo` | osm | 0 | store / clothing |
| IQOS | `mall:leiriashopping:iqos` | centre | 0 | tobacco |
| IServices | `mall:leiriashopping:iservices` | centre | 0 | phone_repair |
| iStore | `mall:leiriashopping:istore` | centre | 0 | store / electronics |
| Italian Republic | `mall:leiriashopping:italian-republic` | centre | 1 | restaurant |
| Just in Case | `mall:leiriashopping:just-in-case` | centre | 0 | store / phone |
| KFC | `mall:leiriashopping:kfc` | centre | 1 | restaurant |
| Kiko Milano | `mall:leiriashopping:kiko-milano` | centre | 0 | store / beauty |
| Kiko Ourivesarias | `mall:leiriashopping:kiko-ourivesarias` | centre | 0 | store / jewelry |
| Lefties | `mall:leiriashopping:lefties` | centre | 1 | store / clothing |
| Levi’s Store | `mall:leiriashopping:levi-s-store` | osm | 0 | store / clothing |
| Lion Of Porches | `mall:leiriashopping:lion-of-porches` | centre | 1 | store / clothing |
| Magnolia | `mall:leiriashopping:magnolia` | centre | 0 | store / jewelry |
| McDonald's | `mall:leiriashopping:mcdonald-s` | osm | 1 | restaurant |
| Mollaris | `mall:leiriashopping:mollaris` | centre | 0 | clinic |
| Mr-Blue | `mall:leiriashopping:mr-blue` | centre | 0 | store / clothing |
| Mr. Wash | `mall:leiriashopping:mr-wash` | centre | -1 | car_wash |
| Normal | `mall:leiriashopping:normal` | osm | 1 | store / discount_store |
| NOS | `mall:leiriashopping:nos` | centre | 0 | store / phone |
| Opticalia | `mall:leiriashopping:opticalia` | centre | 1 | store / eyewear_and_optician |
| Pandora | `mall:leiriashopping:pandora` | osm | 0 | store / jewelry |
| Pluricosmética | `mall:leiriashopping:pluricosmetica` | centre | 0 | store / beauty |
| Salsa | `mall:leiriashopping:salsa` | centre | 0 | store / clothing |
| Skechers | `mall:leiriashopping:skechers` | osm | 0 | store / shoes |
| Suits Inc. | `mall:leiriashopping:suits-inc` | centre | 0 | store / clothing |
| Swarovski | `mall:leiriashopping:swarovski` | osm | 0 | store / jewelry |
| Tomatino | `mall:leiriashopping:tomatino` | centre | 1 | restaurant |
| Unicâmbio | `mall:leiriashopping:unicambio` | centre | 0 | currency_exchange |
| UpStyle | `mall:leiriashopping:upstyle` | centre | 0 | store / clothing |
| Vodafone | `mall:leiriashopping:vodafone` | osm | 0 | store / phone |
| Wiñk | `mall:leiriashopping:wink` | centre | 0 | nail_salon |
| Women’secret | `mall:leiriashopping:women-secret` | osm | 1 | store / clothing |
| Worten Mobile | `mall:leiriashopping:worten-mobile` | osm | 0 | phone_repair / electronics |
| Xiaomi Store | `mall:leiriashopping:xiaomi-store` | centre | 0 | store / electronics |
| Zippy | `mall:leiriashopping:zippy` | centre | 0 | store / clothing |
