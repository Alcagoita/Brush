# NorteShopping reconcile — KAN-462, applied 2026-11-11

Produced by `cloudflare/extraction/reconcile_mall_list.py`, applied as migration `0065_kan462_norteshopping.sql`, and verified through `POST /poi/nearby`: all 279 listed units are served, and none of the 65 withdrawn rows is.

## Inputs

* `mall_lists/norteshopping.txt` — the operator's 279 units, supplied by the owner 2026-11-11
* `mall_lists/norteshopping_types.tsv` — the typing of every unit, with its evidence
* held rows inside the 50 m buffer of OSM `relation/16708133` (Overture and curated)
* far rows: anything within about 2 km carrying the centre's own address (`Norteshopping`, `Norte Shopping`, `Rua Sara Afonso`), minus `Staples`, whose address says *junto ao* (next to)
* OSM shops in the same box, to place the units we did not hold

## Withdrawn (65)

| row | name | why |
|---|---|---|
| `55612802-cff6-4e77-ae60-84b77382db09` | Pull & Bear | same shop as listed 'PULL & BEAR', held twice; the other row kept |
| `5c06ea11-eeff-4ad8-94b5-e35c1890e7b4` | SAT MATOSINHOS CONTINENTE BOM DIA NORTESHOPPING | same shop as listed 'CONTINENTE BOM DIA', held twice; the other row kept |
| `5daf0ea4-9fff-4c32-a41c-247b045ba07b` | José Luís Jóias | same shop as listed 'JOSE LUIS JOYERÍAS', held twice; the other row kept |
| `aaa2b359-ceaa-4dfb-94ae-3607b976b0f5` | Rock'N'Bowl Arcade | same shop as listed 'ROCK’N’BOWL', held twice; the other row kept |
| `b5743a47-6776-4be3-aad5-9bb7d57cbd9e` | Hackett | same shop as listed 'HACKETT LONDON', held twice; the other row kept |
| `c5fd8a01-ff62-4bc5-824c-f3006a740e84` | FNAC Norte Shopping | same shop as listed 'FNAC', held twice; the other row kept |
| `c8e90aab-ced1-4223-b166-0794bb8b5fb1` | Bershka | same shop as listed 'BERSHKA', held twice; the other row kept |
| `cce1f001-5305-4c68-b4c4-129502f2119a` | Original Levi`s Store, NorteShopping | same shop as listed 'LEVI’S', held twice; the other row kept |
| `f778b751-8703-49f2-9a79-7df58207b92a` | adidas Store Porto | same shop as listed 'ADIDAS', held twice; the other row kept |
| `ff7aaad3-d346-420c-a644-3cd014093497` | Farmácia do NorteShopping / Porto | same shop as listed 'Farmácia Ferreira da Silva', held twice; the other row kept |
| `025f7ce4-eda5-4092-924e-c8397c70c382` | GANT Norteshopping | listed 'GANT' pinned 132 m outside NorteShopping; the unit is held inside |
| `0bed7609-7a52-4511-bf94-d4e3bccb6338` | FNAC Norte Shopping | listed 'FNAC' pinned 1679 m outside NorteShopping; the unit is held inside |
| `1e0ae791-be18-43e4-b028-d1be1d4dec14` | Pepe Jeans | listed 'PEPE JEANS' pinned 291 m outside NorteShopping; the unit is held inside |
| `3163d247-a937-4f29-a654-df04d2601d1e` | SEPHORA | listed 'SEPHORA' pinned 1682 m outside NorteShopping; the unit is held inside |
| `3e0ba5f3-b369-42c9-a749-cb0475e98889` | MultiExpress NorteShopping | NorteShopping's address but not on its tenant list, pinned 77 m outside |
| `5f78811d-3736-4cd0-b7e9-470b22ae232f` | Flying Tiger Copenhagen | listed 'FLYING TIGER' pinned 1656 m outside NorteShopping; the unit is held inside |
| `ac891ca0-3d9c-4c59-818f-cea51c666228` | L'Occitane en Provence - Porto | NorteShopping's address but not on its tenant list, pinned 1787 m outside |
| `ad45cab6-88ed-49ff-88a1-61887824fc7a` | Tiger, Norteshopping | listed 'FLYING TIGER' pinned 594 m outside NorteShopping; the unit is held inside |
| `b7270120-c6f0-4e8b-bcce-4af23308bd7b` | Zenith Brunch & Cocktails - Norteshopping | NorteShopping's address but not on its tenant list, pinned 132 m outside |
| `c008d6e0-430e-4298-b02c-2070bd3a7d03` | ECCO Porto Norteshopping | listed 'ECCO' pinned 132 m outside NorteShopping; the unit is held inside |
| `d0946e1a-652c-4051-b3c2-7934162fa89a` | A Cascata | listed 'ACASCATA' pinned 1962 m outside NorteShopping; the unit is held inside |
| `edf91e03-c7d9-4861-8e1e-10564fb1fe67` | BOSS Store | listed 'BOSS' pinned 1044 m outside NorteShopping; the unit is held inside |
| `f59870f3-3039-456b-9782-5a77830bc228` | Tezenis | listed 'TEZENIS' pinned 1768 m outside NorteShopping; the unit is held inside |
| `5e89c753-f88b-4a18-8225-f765b1a3ccb5` | Ópticas GrandOptical NorteShopping Porto | listed 'GRANDOPTICAL' pinned 669 m outside NorteShopping; the unit is held inside |
| `061254b8-5023-45f5-9cba-38f6bad7f492` | Tino González NorteShopping | not on the NorteShopping tenant list |
| `0a75c07f-b9cd-4282-a865-c60cae1e4313` | Chimarrão | not on the NorteShopping tenant list |
| `0e0d10d9-1dbc-44e8-96fd-77aa58a78230` | United Colors of Benetton | not on the NorteShopping tenant list |
| `1629fc68-85c9-48b1-930a-7c1d53c3725b` | A Loja do Gato Preto | not on the NorteShopping tenant list |
| `20b3ac7c-aafb-4a13-b2a1-353a6dd5e74b` | Hussel | not on the NorteShopping tenant list |
| `25582d29-bb52-4267-9e33-bfec59009b93` | McCafé | not on the NorteShopping tenant list |
| `25686089-9f66-468d-afad-d88e0a7ad441` | Nice Things Paloma S. | not on the NorteShopping tenant list |
| `26c93c88-3267-4e46-9349-2ecbbed858fc` | Pura - Gourmet Salads | not on the NorteShopping tenant list |
| `2b7f7449-4048-43a1-9836-c27d2c497c4a` | :slow | not on the NorteShopping tenant list |
| `2b80e625-46c8-4ef4-8af8-e5170e9db653` | Elena Mirò | not on the NorteShopping tenant list |
| `3722e1b9-d6b6-460a-9591-ac825ecb490f` | Pasta Caffé | not on the NorteShopping tenant list |
| `3d61fc31-a06e-487a-86bc-30a1cb01c8d2` | Serra da Estrela - Cantinho Regional | not on the NorteShopping tenant list |
| `3f4e267b-dcfb-4deb-9cb8-1e9af05e2948` | PORTO SC NORTE SHOPPING | not on the NorteShopping tenant list |
| `419938e7-6944-45b0-8e5b-97ee832585f4` | Helpdesk da Sonae | not on the NorteShopping tenant list |
| `480b74fa-a988-4851-b063-9af24effaf14` | Pico Tango | not on the NorteShopping tenant list |
| `4c16210b-b2df-4fc0-8b2f-af5b6b2b6ab2` | Time To Be | not on the NorteShopping tenant list |
| `4f65d103-cf7a-47f4-ae1a-c4ef2b384706` | World Bowling - Entretenimento e Lazer | not on the NorteShopping tenant list |
| `60e79c1f-efd3-4a2a-a6f0-0f1a1cf6cca2` | Prénatal | not on the NorteShopping tenant list |
| `6a0e44ce-3270-4b91-8b55-db04669a5937` | MATOSINHOS | not on the NorteShopping tenant list |
| `78c5d03e-6938-4ac2-a488-94f93d39d4ce` | Clarks | not on the NorteShopping tenant list |
| `7a79130c-e038-4079-b70c-f64f98cc666a` | okaidi | not on the NorteShopping tenant list |
| `9217716c-7323-4f26-908b-7d5b8f87711a` | Dielmar | not on the NorteShopping tenant list |
| `92d1b95a-d59f-41a0-912d-4a2b19ccf653` | Rádio Popular | not on the NorteShopping tenant list |
| `930c9893-0e11-4037-8603-36f8a1c91b47` | Américo Tavar NorteShopping | not on the NorteShopping tenant list |
| `971ca849-b606-4236-b38d-77d22104b195` | LAO BAO - asian flavours | not on the NorteShopping tenant list |
| `9eef95b2-de24-410d-891d-9d61ea1834fe` | Real Transfer | not on the NorteShopping tenant list |
| `9efca98b-eb58-43d3-926d-cca971282915` | Teatro Rivoli-Porto | not on the NorteShopping tenant list |
| `ac62ee47-dcd3-42bd-b478-1c8f65f1df41` | Lanidor Woman | not on the NorteShopping tenant list |
| `b106243a-f90e-494f-9080-9cdfc32b8104` | Casa Ferreira | not on the NorteShopping tenant list |
| `b3c3340b-b445-43cc-8032-80db2df98ccb` | G-Star RAW Store | not on the NorteShopping tenant list |
| `cad30e92-6610-49d2-b477-596369b9f46d` | Bubbles & Pearls | not on the NorteShopping tenant list |
| `d888ce79-c6d7-4667-af25-ce473807bc80` | Steaks and Beer House | not on the NorteShopping tenant list |
| `e9ac95b5-93d9-4842-aa04-d89169a7b4f7` | Redken | not on the NorteShopping tenant list |
| `ed6025c2-f1ce-40df-a6e1-1c6b1a224999` | Nicethings Porto | not on the NorteShopping tenant list |
| `f5fd5e48-b562-4105-b874-802fa6f227b6` | Loja IQOS Norteshopping | not on the NorteShopping tenant list |
| `fece4d6a-eea7-4c28-bb4f-ae0571ea48c6` | InMocion Sport | not on the NorteShopping tenant list |
| `fsq:4cdbe54dfc97370489cbd105` | Galeria de Arte Loja NS | not on the NorteShopping tenant list |
| `fsq:4db825280f2cc703c4f31ee4` | Silo - Espaço Cultural | not on the NorteShopping tenant list |
| `fsq:4ec51328722ececf19d64b14` | Praça do Vapor | not on the NorteShopping tenant list |
| `fsq:57e1d493498e05a911f87c0b` | SALA - 5 | not on the NorteShopping tenant list |
| `fsq:5e01432b4b610c0008cb545b` | Sala Xvision | not on the NorteShopping tenant list |

## Kept — neighbours on other streets (6)

* Galp (`gas`)
* Nortejóias (`store`)
* Clinicanimal (`veterinary_care`)
* Bossê Tattoo (`tattoo`)
* Ponto CTT (`post`)
* Staples — *junto ao Norte Shopping*, left out of the far set

## Held — the row answering each unit, given the list's type and floor (153)

| listed | held row |
|---|---|
| 5 À SEC | 5àsec |
| Açaí Concept | Açai Concept |
| ACASCATA | Cascata Norteshopping |
| ACTIVOBANK | Activobank - Norte Shopping (Matosinhos) |
| ADIDAS | adidas |
| Adolfo Dominguez | Adolfo Domínguez |
| ALDO | Aldo |
| Arcádia – Galleria | Arcadia Casa do Chocolate |
| AREA | Area |
| B STRONG | BStrong |
| BERSHKA | Bershka |
| BERTRAND LIVREIROS | Bertrand |
| BIMBA Y LOLA | Bimba y Lola |
| BLUEBIRD – Relógios e Joias | Bluebird |
| BODEGÃO | O Bodegão |
| BOSS | BOSS Store |
| BOWLS | Bowls |
| BURGER KING | Burger King |
| CAFÉ JERONYMO | Jeronymo |
| CALVIN KLEIN JEANS | Calvin Klein |
| CALZEDONIA | Calzedonia |
| CHICCO | Chicco |
| CINEMAS NOS | Cinemas NOS NorteShopping |
| COLUNEX | Colunex Portuguesa |
| CONTINENTE BOM DIA | Continente Bom Dia NorteShopping |
| CORTEFIEL | Cortefiel |
| CTT-CORREIOS DE PORTUGAL | Loja CTT |
| daTerra | daTerra |
| DAVID ROSAS | David Rosas |
| DECENIO | Decenio |
| DOUGLAS | Douglas NorteShopping |
| FALCONERI | Falconeri |
| Farmácia Ferreira da Silva | Farmácia Ferreira da Silva |
| FLYING TIGER | Flying Tiger Copenhagen |
| FNAC | Fnac |
| Fogo de Chão | Fogo de Chão Norte Shopping |
| FOTOSPORT | Fotosport, NorteShopping |
| FRED PERRY AUTHENTIC STORE | Fred Perry |
| FURLA | Furla |
| FUXIA | Fuxia NorteShopping |
| GEOX | Geox |
| GRANDOPTICAL | Opticas GrandOptical NorteShopping Porto |
| GUESS | GUESS |
| H&M | H&M |
| H3 – NEW HAMBURGOLOGY | H3 Hambúrguer Gourmet |
| HÄAGEN-DAZS | Häagen-Dazs |
| HACKETT LONDON | Hackett London |
| Hummy | Hummy NorteShopping |
| INTIMISSIMI | Intimissimi |
| ISERVICES | IServices |
| ISTORE | iStore Norte Shopping - Apple Premium Reseller & Authorized Service Provider |
| ITALIAN REPUBLIC | Italian Republic |
| JACADI | Jacadi |
| JD SPORTS | JD Sports |
| JEAN LOUIS DAVID | Cabeleireiro Jean Louis David |
| JOSE LUIS JOYERÍAS | Jose Luis Jewelry |
| JOSHUA’S SHOARMA | Joshua's Shoarma Grill |
| KFC | KFC |
| KIKO MAKE UP MILANO | Kiko Milano |
| Labrador | Labrador |
| LACOSTE | Lacoste |
| LEFTIES | Lefties |
| LEGO | LEGO® Store NorteShopping Porto |
| LEITARIA DA QUINTA DO PAÇO | Leitaria da Quinta do Paço (NorteShopping) |
| LEVI’S | Levi's |
| LI YUAN | Li Yuan |
| Lindt | Boutique Lindt /Store NorteShopping |
| LOJA DAS SOPAS | Loja das Sopas |
| M – JÓIAS EM AÇO | M Jóias em Aço |
| MAC | MAC Cosmetics |
| MAIS ÓPTICA | Mais Optica |
| Maje | Maje |
| MALANDRINHO DO POMBAL | Malandrinho de Pombal |
| MANGO | Mango |
| MASSIMO DUTTI | Massimo Dutti |
| MaxMara | Weekend Max Mara |
| MAYORAL | Mayoral - Loja de Roupa Infantil e Bebés |
| MCDONALD’S | McDonald's |
| MEO | Loja MEO |
| MERRELL | Merrell |
| MIIT | Miit |
| MISAKO | MISAKO |
| Miss Pavlova | Miss Pavlova |
| MONTBLANC | Montblanc |
| MR. BLUE | Mr. Blue |
| MR. PARKING / STARWASH | Mr. Parking |
| MULTIOPTICAS | Ópticas MultiOpticas NorteShopping |
| Nata Sweet Nata | Nata Sweet Nata |
| NESPRESSO | Nespresso |
| NIKE | Nike |
| NOORI SUSHI | Noori Sushi |
| NORTH FACE | The North Face Norteshopping Porto |
| NOS | Loja NOS |
| NOTE! | note! Norteshopping - Matosinhos |
| O BOTICÁRIO | O Boticário |
| OLÁ | Olá |
| ONE | ONE Watch Company - NorteShopping |
| OYSHO | Oysho |
| PACOMARTINEZ | Paco Martinez |
| PANDORA | Pandora |
| PANS & COMPANY | Pans & Company |
| Papelaria Sousa Ribeiro | Papelaria Sousa Ribeiro |
| PARFOIS | Parfois |
| PEPE JEANS | Pepe Jeans |
| PERFUMES & COMPANHIA | Perfumes & Companhia |
| PIZZA HUT | Pizza Hut |
| PLURICOSMÉTICA | Pluricosmética |
| Poke House | Poke House - Norte Shopping |
| Polo Ralph Lauren | Polo Ralph Lauren Porto |
| Presunto e Ovo | Presunto & Ovo |
| PRIMARK | Primark |
| PULL & BEAR | Pull&Bear |
| Q Store | QSTORE NORTESHOPPING |
| Q’T-SHIRT | q't-shirt! |
| RITUALS | Rituals |
| ROCK’N’BOWL | Rock'n'Bowl |
| SACOOR BROTHERS | Sacoor Brothers |
| SALSA JEANS | Salsa |
| SAMSONITE | Samsonite |
| SEPHORA | Sephora |
| SHIBUI SUSHI | Shibui Sushi |
| SOLINCA HEALTH & FITNESS CLUB | Solinca |
| SPORT ZONE | Sport Zone |
| SPRINGFIELD | Springfield |
| SR.FRANGO DA GUIA | Sr. Frango da Guia |
| STARBUCKS | Starbucks |
| STONE BY STONE | Stone by Stone |
| STRADIVARIUS | Stradivarius |
| SUNGLASS HUT | Sunglass Hut |
| SWAROVSKI | Swarovski Boutique Norte Shopping |
| SWATCH | Swatch |
| Taco Bell | Taco Bell NorteShopping |
| TALHO DO MERCADO | Talho do Mercado Norteshopping |
| TAVERNA DO ALHO | Taverna do Alho |
| TERESINHA CARTEIRAS | Teresinha |
| TEZENIS | Tezenis |
| THE BODY SHOP | The Body Shop |
| TIENDA ANIMAL | Tiendanimal |
| TIFFOSI | Tiffosi |
| TOMMY HILFIGER | Tommy Hilfiger |
| TOP COSTURA | Topcostura |
| TOUS | Tous Jewelry |
| TRIUMPH | Triumph Lingerie - Norte Shopping Senhora da Hora |
| TWINSET | Twinset Porto |
| VISTA ALEGRE | Vista Alegre |
| Weeel | Weeel Frozen Yogurt |
| WELL’S | Well's |
| WELL’S ÓPTICA | WELLS ÓTICA MATOSINHOS NORTESHOPPING |
| WOK TO WALK | Wok to Walk Norteshopping |
| WOMEN’SECRET | Women'secret, Norteshopping |
| WORTEN MOBILE | Worten Mobile |
| ZARA HOME | Zara Home |
| ZIPPY KIDSTORE | Zippy Kidstore |

## Written into curated_poi (126)

| listed | id | placed by | floor | type |
|---|---|---|---|---|
| 100 MONTADITOS | `mall:norteshopping:100-montaditos` | osm | 1 | restaurant |
| A CALDEIRA | `mall:norteshopping:a-caldeira` | osm | 0 | restaurant |
| Abbraccio | `mall:norteshopping:abbraccio` | osm | 0 | ice_cream |
| ACP | `mall:norteshopping:acp` | osm | 0 | store / auto_parts_and_supply |
| AGÊNCIA ABREU | `mall:norteshopping:agencia-abreu` | osm | 0 | travel_agency |
| AMORINO – GELATO AL NATURALE | `mall:norteshopping:amorino-gelato-al-naturale` | centre | 1 | ice_cream |
| ARCÁDIA – NESCAFÉ | `mall:norteshopping:arcadia-nescafe` | centre | -4 | cafe |
| Arcádia – Roastelier by Nescafé | `mall:norteshopping:arcadia-roastelier-by-nescafe` | centre | 1 | cafe |
| B STRONG KIDS | `mall:norteshopping:b-strong-kids` | osm | 0 | store / shoes |
| BAGGA | `mall:norteshopping:bagga` | osm | 0 | cafe |
| BARBOUR | `mall:norteshopping:barbour` | osm | 1 | store / clothing |
| BOUTIQUE DOS RELÓGIOS PLUS | `mall:norteshopping:boutique-dos-relogios-plus` | osm | 0 | store / jewelry |
| Braza | `mall:norteshopping:braza` | osm | 1 | restaurant |
| BROWNIE | `mall:norteshopping:brownie` | osm | 1 | store / clothing |
| CAFÉ JOYEUX | `mall:norteshopping:cafe-joyeux` | centre | 0 | cafe |
| CAFÉ PANS | `mall:norteshopping:cafe-pans` | osm | 0 | cafe |
| Cata Vassalo | `mall:norteshopping:cata-vassalo` | centre | 0 | store / jewelry |
| CELEIRO | `mall:norteshopping:celeiro` | osm | 0 | supermarket |
| CENTROXOGO | `mall:norteshopping:centroxogo` | centre | 0 | store / toys |
| Chaviarte | `mall:norteshopping:chaviarte` | centre | 0 | shoe_repair |
| CHAVIARTE PREMIUM | `mall:norteshopping:chaviarte-premium` | centre | 0 | shoe_repair |
| Claudie Pierlot | `mall:norteshopping:claudie-pierlot` | osm | 1 | store / womens_clothing |
| Clínica Fnac | `mall:norteshopping:clinica-fnac` | osm | 0 | phone_repair |
| Confeitaria Moura | `mall:norteshopping:confeitaria-moura` | osm | 0 | bakery |
| CONTINENTE | `mall:norteshopping:continente` | centre | 0 | supermarket |
| CREMOSI | `mall:norteshopping:cremosi` | osm | 0 | ice_cream |
| Desigual | `mall:norteshopping:desigual` | osm | 1 | store / clothing |
| Dyson | `mall:norteshopping:dyson` | centre | 0 | store / electronics |
| ECCO | `mall:norteshopping:ecco` | osm | 1 | store / shoes |
| Elements | `mall:norteshopping:elements` | osm | 1 | store / jewelry |
| EQUIVALENZA | `mall:norteshopping:equivalenza` | osm | 0 | store / beauty |
| ERICEIRA SURF & SKATE | `mall:norteshopping:ericeira-surf-skate` | osm | 0 | store / sports |
| Fabric Store | `mall:norteshopping:fabric-store` | centre | 1 | store / home |
| FCPORTO STORE | `mall:norteshopping:fcporto-store` | osm | 0 | store / sports |
| FLORES CONTINENTE | `mall:norteshopping:flores-continente` | centre | 0 | florist |
| Florista Luciano Arte Flores | `mall:norteshopping:florista-luciano-arte-flores` | osm | 0 | florist |
| GANT | `mall:norteshopping:gant` | osm | 1 | store / clothing |
| GIOVANNI GALLI | `mall:norteshopping:giovanni-galli` | osm | 1 | store / mens_clothing |
| Gold Suisse | `mall:norteshopping:gold-suisse` | osm | 0 | store / pawn |
| GRAFIPRONTO | `mall:norteshopping:grafipronto` | osm | 0 | store / copy_shop |
| GUACAMOLE GMG | `mall:norteshopping:guacamole-gmg` | osm | 1 | restaurant |
| HAPPY FOOD | `mall:norteshopping:happy-food` | centre | 0 | restaurant |
| Hawkers | `mall:norteshopping:hawkers` | osm | 0 | store / eyewear_and_optician |
| HEBE GYROS | `mall:norteshopping:hebe-gyros` | osm | 1 | restaurant |
| HeyDoc | `mall:norteshopping:heydoc` | osm | 0 | store / beauty |
| HOFF | `mall:norteshopping:hoff` | osm | 1 | store / shoes |
| HOSS INTROPIA | `mall:norteshopping:hoss-intropia` | osm | 1 | store / womens_clothing |
| INÊS PEREIRA CABELEIREIROS | `mall:norteshopping:ines-pereira-cabeleireiros` | osm | 0 | hairdresser |
| INTIMISSIMI UOMO | `mall:norteshopping:intimissimi-uomo` | osm | 0 | store / clothing |
| IUMAN | `mall:norteshopping:iuman` | centre | 0 | store / mens_clothing |
| JACK & JONES | `mall:norteshopping:jack-jones` | centre | 1 | store / mens_clothing |
| Jo Malone | `mall:norteshopping:jo-malone` | osm | 1 | store / beauty |
| JOCORUM TABACARIAS | `mall:norteshopping:jocorum-tabacarias` | osm | 0 | tobacco |
| JUST IN CASE | `mall:norteshopping:just-in-case` | osm | 0 | store / phone |
| LA CASA DE LAS CARCASAS | `mall:norteshopping:la-casa-de-las-carcasas` | centre | 0 | phone_repair / phone |
| LÄDERACH | `mall:norteshopping:laderach` | centre | 0 | bakery |
| LARANJINHA | `mall:norteshopping:laranjinha` | osm | 0 | store / childrens_clothing |
| LION OF PORCHES | `mall:norteshopping:lion-of-porches` | osm | 1 | store / clothing |
| LUGAR DA JÓIA | `mall:norteshopping:lugar-da-joia` | osm | 0 | store / jewelry |
| Maldito | `mall:norteshopping:maldito` | osm | 1 | restaurant |
| MALVÓN | `mall:norteshopping:malvon` | centre | 1 | restaurant |
| MANUEL ALVES SAPATARIAS | `mall:norteshopping:manuel-alves-sapatarias` | centre | 0 | store / shoes |
| MARIA MARCELINO | `mall:norteshopping:maria-marcelino` | osm | 1 | store / clothing |
| MEO 2 | `mall:norteshopping:meo-2` | osm | 0 | store / phone |
| Mimo.Cool | `mall:norteshopping:mimo-cool` | centre | 0 | store / childrens_clothing |
| MOLDURA MINUTO | `mall:norteshopping:moldura-minuto` | osm | 0 | store / arts_and_crafts |
| MyForce | `mall:norteshopping:myforce` | centre | 0 | car_repair |
| NATURA | `mall:norteshopping:natura` | centre | 0 | store / clothing |
| NATURAPURA | `mall:norteshopping:naturapura` | osm | 0 | store / childrens_clothing |
| NICI | `mall:norteshopping:nici` | osm | 0 | store / toys |
| NOS | `mall:norteshopping:nos` | osm | 0 | store / phone |
| NOVA CÂMBIOS | `mall:norteshopping:nova-cambios` | osm | 0 | currency_exchange |
| NP4GAME | `mall:norteshopping:np4game` | osm | 0 | store / video_game |
| NUTRIBIO | `mall:norteshopping:nutribio` | centre | 0 | store / drugstore |
| NUTRYSTORE | `mall:norteshopping:nutrystore` | osm | 0 | store / vitamins_and_supplements |
| O Forno do leitão do Zé | `mall:norteshopping:o-forno-do-leitao-do-ze` | osm | 1 | restaurant |
| O Quiosque | `mall:norteshopping:o-quiosque` | osm | 1 | store / newspaper_and_magazines |
| OAKBERRY | `mall:norteshopping:oakberry` | osm | 1 | juice |
| OMNIA | `mall:norteshopping:omnia` | centre | 0 | store / jewelry |
| Opatra London | `mall:norteshopping:opatra-london` | osm | 1 | beauty_salon |
| ORO VIVO | `mall:norteshopping:oro-vivo` | osm | 0 | store / jewelry |
| OTRO Perfume Concept | `mall:norteshopping:otro-perfume-concept` | osm | 1 | store / beauty |
| PANDA CANTINA | `mall:norteshopping:panda-cantina` | centre | 0 | restaurant |
| PEDRO DEL HIERRO | `mall:norteshopping:pedro-del-hierro` | osm | 1 | store / womens_clothing |
| PIZZA HUT DELIVERY | `mall:norteshopping:pizza-hut-delivery` | centre | 0 | restaurant |
| PLOOM | `mall:norteshopping:ploom` | centre | 0 | tobacco |
| Point Fort Fichet | `mall:norteshopping:point-fort-fichet` | centre | 0 | shoe_repair |
| PORTUGÁLIA BALCÃO | `mall:norteshopping:portugalia-balcao` | osm | 1 | restaurant |
| PROF | `mall:norteshopping:prof` | osm | 0 | store / shoes |
| QUAD | `mall:norteshopping:quad` | centre | 1 | store / sports |
| QUEBRAMAR | `mall:norteshopping:quebramar` | osm | 1 | store / clothing |
| RECREIO INFANTIL – NORTELAND | `mall:norteshopping:recreio-infantil-norteland` | centre | 0 | playground |
| RELLENO | `mall:norteshopping:relleno` | centre | 1 | restaurant |
| RITUAL CAFFÉ | `mall:norteshopping:ritual-caffe` | centre | 0 | cafe |
| ROBERTO VERINO | `mall:norteshopping:roberto-verino` | osm | 1 | store / clothing |
| RT FOCACCIAS BY REITORIA | `mall:norteshopping:rt-focaccias-by-reitoria` | centre | 1 | restaurant |
| SAMSUNG | `mall:norteshopping:samsung` | osm | 0 | store / electronics |
| Sandro | `mall:norteshopping:sandro` | osm | 1 | store / clothing |
| SANJŪGO | `mall:norteshopping:sanjugo` | centre | 1 | restaurant |
| Santa Francesinha By Cufra | `mall:norteshopping:santa-francesinha-by-cufra` | osm | 1 | restaurant |
| Scalpers | `mall:norteshopping:scalpers` | osm | 1 | store / clothing |
| SMASHVILLE | `mall:norteshopping:smashville` | centre | 1 | restaurant |
| SMOLL REPUBLIC | `mall:norteshopping:smoll-republic` | osm | 0 | store / jewelry |
| SOLÁRIO PAREDÃO | `mall:norteshopping:solario-paredao` | osm | -3 | beauty_salon |
| Steve Madden | `mall:norteshopping:steve-madden` | osm | 1 | store / shoes |
| SUITS INC | `mall:norteshopping:suits-inc` | osm | 1 | store / clothing |
| SUZYPETROS | `mall:norteshopping:suzypetros` | centre | 0 | store / beauty |
| Tea Shop | `mall:norteshopping:tea-shop` | osm | 0 | tea |
| THE NORTH FACE | `mall:norteshopping:the-north-face` | osm | 1 | store / clothing |
| TIMBERLAND | `mall:norteshopping:timberland` | centre | 1 | store / clothing |
| TOMATINO | `mall:norteshopping:tomatino` | osm | 1 | restaurant |
| Top Atlântico | `mall:norteshopping:top-atlantico` | osm | 0 | travel_agency |
| UNIKE Jewellery | `mall:norteshopping:unike-jewellery` | osm | 1 | store / jewelry |
| VICTORIA’S SECRET | `mall:norteshopping:victoria-s-secret` | osm | 0 | store / lingerie |
| VILANOVA | `mall:norteshopping:vilanova` | osm | 0 | store / fashion_accessories |
| VITAMINAS | `mall:norteshopping:vitaminas` | osm | 1 | restaurant |
| VODAFONE | `mall:norteshopping:vodafone` | osm | 0 | store / phone |
| WIÑK | `mall:norteshopping:wink` | osm | 0 | nail_salon |
| WIZINK | `mall:norteshopping:wizink` | osm | 0 | bank |
| WOO | `mall:norteshopping:woo` | osm | 0 | store / phone |
| WORTEN | `mall:norteshopping:worten` | centre | 0 | phone_repair / electronics |
| WORTEN | `mall:norteshopping:worten-2` | centre | 0 | phone_repair / electronics |
| WTF | `mall:norteshopping:wtf` | osm | 0 | store / phone |
| YORN | `mall:norteshopping:yorn` | osm | 0 | store / phone |
| ZARA | `mall:norteshopping:zara` | osm | 1 | store / clothing |
| ZU | `mall:norteshopping:zu` | centre | 0 | store / pet |
