# KAN-439 — typing the 186 units no source can place

Each needs a real `poi_type` and, where it is a shop, a specific `store_kind`
— **no bare `store`**. Three tiers of evidence, strongest first.

**The operator category is the weakest evidence and is used last.** It is a
marketing grouping, not a type: `Serviços` covers a barber, a car wash and a
currency exchange.


## Tier 1 — 67 names we already hold elsewhere in Portugal, one type

Typed from our own production rows, not from the operator.

| unit | centre | our type elsewhere | store_kind | rows in PT |
|---|---|---|---|---|
| `1920 Barber Shop` | UBBO | `barber` | — | 1 |
| `Açaí Natura` | Amoreiras | `restaurant` | — | 4 |
| `Adolfo Dominguez` | Amoreiras | `store` | `clothing` | 8 |
| `Alentejo` | UBBO | `restaurant` | — | 3 |
| `Ana Joalheiros` | UBBO | `store` | `jewelry` | 1 |
| `Bifanas de Vendas Novas` | UBBO | `restaurant` | — | 8 |
| `Bitoque no Ponto` | UBBO | `restaurant` | — | 3 |
| `Blue Kids` | UBBO | `store` | `clothing` | 4 |
| `BlueBird` | UBBO | `store` | `jewelry` | 6 |
| `Casa do Sono` | UBBO | `store` | `mattress` | 2 |
| `Casa Simões` | Amoreiras | `store` | `arts_and_crafts` | 1 |
| `Cash Converters` | UBBO | `store` | `clothing` | 6 |
| `Cata Vassalo` | Amoreiras | `store` | `jewelry` | 1 |
| `Claudie Pierlot` | Amoreiras | `store` | `womens_clothing` | 2 |
| `ColchãoNet` | UBBO | `store` | `mattress` | 1 |
| `Cort&Cose` | UBBO | `store` | `clothing` | 1 |
| `Cortefiel` | UBBO | `store` | `clothing` | 9 |
| `Delícias do Bairro` | UBBO | `cafe` | — | 1 |
| `Delta Espresso` | Amoreiras | `cafe` | — | 4 |
| `Dez Prá Uma` | Amoreiras | `restaurant` | — | 1 |
| `Douglas` | Amoreiras | `store` | `beauty` | 25 |
| `Espadim 1985` | Amoreiras | `store` | `antique` | 1 |
| `Fábrica dos Óculos` | UBBO | `store` | `eyewear_and_optician` | 4 |
| `Farmácia Reis Barata` | UBBO | `pharmacy` | — | 2 |
| `Fotosport` | UBBO | `store` | `photography_store_and_services` | 3 |
| `Gleba` | Amoreiras | `bakery` | — | 1 |
| `Globe` | Amoreiras | `store` | `womens_clothing` | 2 |
| `H3` | UBBO | `restaurant` | — | 6 |
| `Hurley` | Amoreiras | `store` | `clothing` | 2 |
| `Instanta` | Amoreiras | `store` | `photography_store_and_services` | 4 |
| `ISTO.` | Amoreiras | `store` | `clothing` | 2 |
| `Italian Republic` | UBBO | `restaurant` | — | 14 |
| `KIKO MILANO` | UBBO | `store` | `beauty` | 45 |
| `La Casa de las Carcasas` | Amoreiras | `store` | `phone` | 22 |
| `Liberjóia` | UBBO | `store` | `jewelry` | 1 |
| `Lion of Porches` | Amoreiras | `store` | `clothing` | 7 |
| `Lusitania` | Amoreiras | `restaurant` | — | 1 |
| `Maje` | Amoreiras | `store` | `womens_clothing` | 4 |
| `Mandarim` | UBBO | `store` | `home` | 1 |
| `Mediterrâneo` | UBBO | `restaurant` | — | 3 |
| `Merrell` | Amoreiras | `store` | `shoes` | 2 |
| `Mister Minit` | UBBO | `store` | `hardware` | 1 |
| `Monkey Brain` | Amoreiras | `cafe` | — | 1 |
| `Motocard` | UBBO | `store` | `motorsports` | 1 |
| `Noon` | Amoreiras | `store` | `womens_clothing` | 2 |
| `Pet's Park` | UBBO | `store` | `pet` | 1 |
| `Pet's Park` | Amoreiras | `store` | `pet` | 1 |
| `Poke House` | UBBO | `restaurant` | — | 4 |
| `Real Transfer` | UBBO | `money_transfer` | — | 1 |
| `Sabor Gaúcho` | Amoreiras | `restaurant` | — | 5 |
| `Sacoor Brothers` | Amoreiras | `store` | `clothing` | 17 |
| `Scalpers` | Amoreiras | `store` | `clothing` | 10 |
| `Skechers` | UBBO | `store` | `shoes` | 3 |
| `Stone by Stone` | UBBO | `store` | `jewelry` | 15 |
| `Suits Inc` | UBBO | `store` | `clothing` | 5 |
| `Sunglass Hut` | Amoreiras | `store` | `eyewear_and_optician` | 34 |
| `Swarovski` | Amoreiras | `store` | `jewelry` | 4 |
| `Teresa Alecrim` | Amoreiras | `store` | `fabric` | 1 |
| `The Cut` | Amoreiras | `restaurant` | — | 1 |
| `Tomatino` | Amoreiras | `restaurant` | — | 6 |
| `Tudo4Mobile` | UBBO | `store` | `phone` | 3 |
| `Unicâmbio` | UBBO | `currency_exchange` | — | 6 |
| `VisionLab` | UBBO | `store` | `eyewear_and_optician` | 1 |
| `Vodafone` | UBBO | `store` | `phone` | 24 |
| `Vodafone` | Amoreiras | `store` | `phone` | 24 |
| `Weeel` | UBBO | `ice_cream` | — | 2 |
| `Wickett Jones` | Amoreiras | `store` | `womens_clothing` | 1 |
| `Women'secret` | UBBO | `store` | `clothing` | 2 |
| `Women'secret` | Amoreiras | `store` | `clothing` | 2 |
| `Yellow Metric` | Amoreiras | `laundry` | — | 1 |

## Tier 2 — 8 names we hold under MORE than one type

Our own data disagrees with itself, so these need a choice.

| unit | centre | types we hold | operator category |
|---|---|---|---|
| `Casa da Sorte` | UBBO | `lottery`(1), `restaurant`(1) | Serviços |
| `Laranjinha` | Amoreiras | `cafe`(1), `restaurant`(1), `school`(1), `store`(1) | Crianças |
| `Maria Croissant` | UBBO | `bakery`(1), `cafe`(1) | Restauração |
| `Nespresso` | Amoreiras | `cafe`(13), `restaurant`(1), `store`(5), `supermarket`(1) | Alimentação |
| `Padaria do Bairro` | UBBO | `bakery`(6), `cafe`(1) | Cafetaria, Gelataria e Doçaria, Restauração |
| `Pluricosmética` | UBBO | `spa`(1), `store`(21) | Perfumaria e Cosmética |
| `Santini` | Amoreiras | `butcher`(1), `ice_cream`(6) | Alimentação |
| `Wiñk` | UBBO | `pharmacy`(1), `spa`(3), `store`(1) | Beleza e Saúde |
| `Wiñk` | Amoreiras | `pharmacy`(1), `spa`(3), `store`(1) | Beleza e Saúde |

## Tier 3 — 101 names with no row anywhere in Portugal

Nothing in our data to copy. Next evidence is OSM by brand; the
operator category is the fallback after that.

| unit | centre | operator category |
|---|---|---|
| `100 Gramas` | Amoreiras | Restaurantes |
| `Acium` | UBBO | Acessórios de Moda e Bijuteria |
| `Agência Abreu` | UBBO | Cultura e Lazer |
| `Agência Abreu` | Amoreiras | Cultura e Lazer |
| `Allways` | Amoreiras | Restaurantes |
| `Arara` | UBBO | Cafetaria, Gelataria e Doçaria, Restauração |
| `Aurya` | UBBO | Perfumaria e Cosmética |
| `Automóvel Club de Portugal` | Amoreiras | Serviços |
| `AWA Massage` | UBBO | Saúde e Bem-Estar |
| `BACHIYO` | UBBO | Cafetaria, Gelataria e Doçaria, Quiosques, Restauração |
| `BAEBE` | Amoreiras | Beleza e Saúde |
| `Balthazar por Confeitaria Nacional` | Amoreiras | Alimentação |
| `Barber Best Boss` | UBBO | Serviços |
| `Belle Vogue` | UBBO | Moda Feminina |
| `Beontime` | UBBO | Ourivesaria, Joalharia e Relojoaria |
| `Big Foot` | Amoreiras | Crianças |
| `Botaminuto` | Amoreiras | Serviços |
| `Braza` | UBBO | Restauração |
| `Bricolage` | Amoreiras | Casa e Decoração |
| `Brownie` | Amoreiras | Moda e Acessórios |
| `Bubbles Company` | Amoreiras | Moda e Acessórios |
| `Cantê` | Amoreiras | Crianças |
| `Capela das Amoreiras` | Amoreiras | Serviços |
| `Car Wash & Spa` | UBBO | Serviços |
| `Cloud House Vaper Store` | UBBO | Serviços |
| `Delta Coffee House Experience` | Amoreiras | Alimentação |
| `DIGI` | UBBO | Eletrodomésticos, Telecomunicações e Informática |
| `Dom Gelato` | UBBO | Cafetaria, Gelataria e Doçaria |
| `Elements 75'80` | Amoreiras | Moda e Acessórios |
| `Emma` | UBBO | Decoração, Casa e Bricolage |
| `Espiral Relojoaria` | Amoreiras | Moda e Acessórios |
| `Euro Sofás` | UBBO | Decoração, Casa e Bricolage |
| `Favorite People` | Amoreiras | Crianças |
| `Figu` | UBBO | Acessórios de Moda e Bijuteria |
| `Fireaway Pizza` | UBBO | Restauração |
| `Food&More` | UBBO | Restauração |
| `Georgia Brigadeiros` | UBBO | Restauração |
| `Glo – Quiosque` | UBBO | Livraria, Tabacaria e Papelaria |
| `Gold Suisse` | UBBO | Serviços |
| `Gold Suisse` | Amoreiras | Serviços |
| `Grace Hair` | UBBO | Serviços |
| `GreenKiss` | Amoreiras | Moda e Acessórios |
| `Hair & Body` | UBBO | Perfumaria e Cosmética |
| `Happy Faces` | Amoreiras | Crianças |
| `HOSS Intropia` | Amoreiras | Moda e Acessórios |
| `ibeauty Cosmetics` | Amoreiras | Beleza e Saúde |
| `IQOS Store` | Amoreiras | Tecnologia e Telecomunicações |
| `Japon Market` | UBBO | Cafetaria, Gelataria e Doçaria |
| `Joana Reymão Nogueira doçarias` | Amoreiras | Alimentação |
| `JOSE LUIS Joyerías` | UBBO | Acessórios de Moda e Bijuteria, Ourivesaria, Joalharia e Relojoaria |
| `Kivet` | UBBO | Animais, Plantas e Flores, Serviços |
| `Knot` | Amoreiras | Crianças |
| `Le Laboratoire` | Amoreiras | Beleza e Saúde |
| `Local Your Healthy Kitchen` | Amoreiras | Restaurantes |
| `Lola Casademunt` | Amoreiras | Moda e Acessórios |
| `M.A.C` | Amoreiras | Beleza e Saúde |
| `MCS Men` | UBBO | Desporto, Moda Feminina, Moda Masculina |
| `Merrell CAT` | UBBO | Desporto, Moda Feminina, Moda Masculina, Sapataria |
| `Migacho` | Amoreiras | Moda e Acessórios |
| `Mobile Fix` | UBBO | Eletrodomésticos, Telecomunicações e Informática, Serviços |
| `Monster Cookies – Quiosque` | UBBO | Cafetaria, Gelataria e Doçaria, Quiosques |
| `Morena Rosa` | UBBO | Animais, Plantas e Flores |
| `MWash Auto SPA` | UBBO | Serviços |
| `MyForce` | UBBO | Serviços |
| `Nails4'Us` | UBBO | Perfumaria e Cosmética, Serviços |
| `Nails4’Us` | Amoreiras | Beleza e Saúde |
| `NaturaPura` | Amoreiras | Crianças |
| `New Story` | UBBO | Acessórios de Moda e Bijuteria |
| `NovaCâmbios` | Amoreiras | Serviços |
| `O Lisboeta` | Amoreiras | Alimentação |
| `Oakberry` | UBBO | Alimentação |
| `Oakberry` | Amoreiras | Alimentação |
| `Oakberry Truck` | UBBO | Cafetaria, Gelataria e Doçaria, Restauração |
| `Olhar de Prata` | Amoreiras | Moda e Acessórios |
| `ONLY` | UBBO | Moda Feminina |
| `Ortopedia.pt` | UBBO | Saúde e Bem-Estar |
| `PACOMARTINEZ` | UBBO | Acessórios de Moda e Bijuteria |
| `Parmeggiana & Cia` | Amoreiras | Restaurantes |
| `Pés de Cereja` | Amoreiras | Crianças |
| `Presse Linha` | UBBO | Cultura e Lazer |
| `Presse Linha` | Amoreiras | Cultura e Lazer |
| `Ramen Go` | UBBO | Restauração |
| `Raquel Poço Jewellery` | Amoreiras | Moda e Acessórios |
| `ROCK'S` | UBBO | Moda Feminina, Moda Infantil, Moda Masculina |
| `Sandro` | Amoreiras | Moda e Acessórios |
| `Sanjugo` | Amoreiras | Restaurantes |
| `Security Center` | Amoreiras | Serviços |
| `Shades World` | UBBO | Acessórios de Moda e Bijuteria, Ótica |
| `Simple Eco Wash` | Amoreiras | Serviços |
| `Simple & Fast – Oficina Auto` | Amoreiras | Serviços |
| `SL Benfica` | UBBO | Desporto |
| `SmashVille` | Amoreiras | Restaurantes |
| `Soya Express` | Amoreiras | Restaurantes |
| `Sporting` | UBBO | Desporto |
| `Street Smash Burgers` | UBBO | Restauração |
| `Suco Bagaço` | UBBO | Cafetaria, Gelataria e Doçaria |
| `Tabink` | UBBO | Livraria, Tabacaria e Papelaria |
| `Tip Top Tailor` | UBBO | Moda Feminina, Moda Masculina |
| `Top Atlântico` | UBBO | Cultura e Lazer |
| `Top Atlântico` | Amoreiras | Cultura e Lazer |
| `U Chá` | Amoreiras | Alimentação |
| `UZO` | UBBO | Eletrodomésticos, Telecomunicações e Informática |
| `Verde Côco` | Amoreiras | Restaurantes |
| `Viagens El Corte Inglés` | Amoreiras | Cultura e Lazer |
| `Vilanova` | UBBO | Acessórios de Moda e Bijuteria |
| `WOO` | UBBO | Eletrodomésticos, Telecomunicações e Informática |
| `ZooJoy` | UBBO | Brinquedos, Prendas e Brindes |

## A caveat on tier 1

Copying our own types inherits our own mistakes. Two are visible in the table
already: `Cash Converters` is held as `clothing` when it is a second-hand
electronics chain, and `Santini` appears once as `butcher` when it is an ice
cream maker. Tier 1 is the strongest evidence available, not a guarantee —
it still wants a read before it is written.

