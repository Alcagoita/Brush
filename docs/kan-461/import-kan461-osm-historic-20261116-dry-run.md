# KAN-461 — OSM archive import, art_gallery, botanical_garden, bridge, church, hiking_area, historical_landmark, lake, lighthouse, museum, nature_preserve, tourist_attraction, viewpoint — DRY RUN

Run `kan461-osm-historic-20261116`, 2026-11-16T02:02:54Z. Archive `portugal-261114.osm.pbf`; served base 213,068 Overture + 24,934 curated.

| type | archive rows | import | served | served (same core name) | suspect | inside a centre | empty name |
|---|---:|---:|---:|---:|---:|---:|---:|
| `art_gallery` | 1 | **0** | 1 | 0 | 0 | 0 | 0 |
| `botanical_garden` | 7 | **3** | 4 | 0 | 0 | 0 | 0 |
| `bridge` | 32 | **20** | 8 | 0 | 4 | 0 | 0 |
| `church` | 221 | **102** | 111 | 0 | 8 | 0 | 0 |
| `hiking_area` | 91 | **53** | 31 | 0 | 7 | 0 | 0 |
| `historical_landmark` | 5,682 | **4,669** | 817 | 0 | 195 | 1 | 0 |
| `lake` | 10 | **8** | 2 | 0 | 0 | 0 | 0 |
| `lighthouse` | 1 | **0** | 1 | 0 | 0 | 0 | 0 |
| `museum` | 35 | **12** | 22 | 0 | 1 | 0 | 0 |
| `nature_preserve` | 13 | **11** | 1 | 0 | 1 | 0 | 0 |
| `tourist_attraction` | 803 | **619** | 150 | 0 | 34 | 0 | 0 |
| `viewpoint` | 3 | **1** | 2 | 0 | 0 | 0 | 0 |

## Imports by the type they are written as

| archive type | written as | rows | how |
|---|---|---:|---|
| `historical_landmark` | `historical_landmark` | 4,669 | extract |
| `tourist_attraction` | `tourist_attraction` | 619 | extract |
| `church` | `church` | 102 | extract |
| `hiking_area` | `hiking_area` | 53 | extract |
| `bridge` | `bridge` | 20 | extract |
| `museum` | `museum` | 12 | extract |
| `nature_preserve` | `nature_preserve` | 11 | extract |
| `lake` | `lake` | 8 | extract |
| `botanical_garden` | `botanical_garden` | 3 | extract |
| `viewpoint` | `viewpoint` | 1 | extract |

## Freshness of the imports (last edit in OSM, or a check_date)

| type | written with a second type | 2024 or later / checked | 2020–2023 | 2015–2019 | before 2015 |
|---|---:|---:|---:|---:|---:|
| `art_gallery` | 0 | 0 | 0 | 0 | 0 |
| `botanical_garden` | 0 | 1 | 2 | 0 | 0 |
| `bridge` | 0 | 10 | 10 | 0 | 0 |
| `church` | 13 | 55 | 40 | 7 | 0 |
| `hiking_area` | 52 | 23 | 30 | 0 | 0 |
| `historical_landmark` | 216 | 2,125 | 2,009 | 423 | 112 |
| `lake` | 0 | 7 | 0 | 1 | 0 |
| `lighthouse` | 0 | 0 | 0 | 0 | 0 |
| `museum` | 0 | 6 | 5 | 1 | 0 |
| `nature_preserve` | 0 | 5 | 3 | 3 | 0 |
| `tourist_attraction` | 12 | 239 | 282 | 98 | 0 |
| `viewpoint` | 0 | 1 | 0 | 0 | 0 |

### Parks kept as `park` on the OSM tag alone (case by case)


SQL: 25 statement(s).

## Sample `art_gallery` imports


## Sample `botanical_garden` imports

- Jardim das Conchas — 38.39513, -8.15453 (way/550469874)
- Jardim da Quinta de São Lourenço — 38.67702, -9.18510 (way/562920100)
- Quinta do Monte do Carmo — 38.70058, -9.18838 (way/673131507)

## Sample `bridge` imports

- Ponte do Cabril — 39.90538, -8.13953 (relation/10705295)
- Ponte do Sobreiro — 41.29023, -7.72088 (way/1098954170)
- Ponte dos Machados — 41.29584, -7.75887 (way/1098954171)
- Ponte Romana de Segura — 39.81741, -6.98186 (way/1131198697)
- Ponte Filipina de Carenque de Baixo — 38.75649, -9.24869 (way/1149167931)
- Ponte Medieval de Vilar de Mouros — 41.88752, -8.78925 (way/1153970513)
- Ponte Romana de Quintã — 41.28877, -7.85310 (way/1187400971)
- Ponte Pedrinha — 41.27061, -7.67283 (way/1187416645)
- Ponte de Relvas — 41.27065, -7.76093 (way/1187648100)
- Ponte de Pedra em Adoufe — 41.34965, -7.71265 (way/1187673225)
- Ponte de Vila Cova — 41.31617, -7.85651 (way/1188685254)
- Ponte Mem Gutierres — 41.57674, -8.16638 (way/1245399044)
- Ponte de Escalhão — 40.92442, -6.93946 (way/1454936178)
- Ponte sobre o Lima — 41.80935, -8.42069 (way/1473596613)
- Ponte de Pêro Soares — 40.54032, -7.33748 (way/1524314570)

## Sample `church` imports

- Igreja de Flor da Rosa — 39.30668, -7.64809 (relation/11840624)
- Igreja matriz da Lourinhã — 39.24250, -9.31268 (relation/14878403)
- Convento de Arroios — 38.73424, -9.13485 (relation/2381269)
- Igreja Matriz de Atouguia da Baleia — 39.33913, -9.32523 (way/1020786767)
- Igreja de São Tiago de Valadares — 41.14454, -7.98290 (way/1024275733)
- Igreja de Santo Apolinário — 41.07628, -7.03078 (way/108400807)
- Capela da Santa Casa da Misericórdia de Alhos Vedros — 38.65477, -9.02815 (way/1091749198)
- Igreja Românica de Boelhe — 41.13502, -8.24230 (way/1109056199)
- Igreja Paroquial de São Martinho — 41.20706, -8.28552 (way/1110817862)
- Igreja de Barcos — 41.12254, -7.60115 (way/1110820299)
- Igreja de Gândara — 41.13198, -8.27990 (way/1117622792)
- Igreja Matriz de Vila Nova de Foz Côa — 41.08295, -7.13631 (way/1120321437)
- Igreja do Salvador — 41.29919, -8.12215 (way/1120388590)
- Igreja de Santo André — 41.64667, -6.49505 (way/1125878744)
- Igreja da Misericórdia — 38.73778, -7.24010 (way/1149187918)

## Sample `hiking_area` imports

- Necrópole do Couto — 41.34343, -7.61528 (node/11037674754)
- Ecomuseu da Fábrica de Pólvora de Vale de Milhaços — 38.61976, -9.16489 (relation/10063756)
- Sítio arqueológico de Monte dos Castelinhos — 39.01219, -8.97428 (relation/11118667)
- Povoado e Estação Arqueológica de Lovelhe — 41.95209, -8.74403 (relation/20579021)
- Santuário de Endovélico de São Miguel da Mota — 38.64346, -7.44322 (way/1103428497)
- Ruínas Romanas da Quinta do Ervedal — 40.06163, -7.46972 (way/1107441660)
- Quinta do Paço — 41.73407, -8.68108 (way/1137311338)
- Buracas de Armês — 38.84787, -9.34929 (way/1137576011)
- Necrópole de Arnadelo — 41.26146, -7.78555 (way/1153256970)
- Estação arqueológica de Ferragial d'El Rei — 39.19808, -7.66189 (way/1172871627)
- Necrópole de São Miguel da Pena — 41.29058, -7.81539 (way/1188685256)
- Vale de Rodrigo 1 — 38.50894, -8.06880 (way/1295743825)
- Colónia Agrícola da Boalhosa - núcleo de Vascões — 41.91239, -8.49312 (way/1452008823)
- Mamoas do Mezio — 41.87961, -8.31322 (way/165545723)
- Alcáçova — 37.63884, -7.66420 (way/184794313)

## Sample `historical_landmark` imports

- Augusto Arruda — 37.76303, -25.64121 (node/10007083282)
- Barcos — 40.75262, -8.57210 (node/10016653620)
- Padre Aníbal do Rego Duarte — 37.75374, -25.72170 (node/10022606473)
- Bombeiros Voluntários de Redondo — 38.65170, -7.55072 (node/10022943106)
- Elevação da freguesia de Mozelos a vila — 41.00063, -8.56637 (node/10024126349)
- N. Sr. Da Veiga — 41.08481, -7.14273 (node/10033499117)
- Pelourinho — 40.98132, -7.61093 (node/10037576975)
- Alfonso IV — 41.03787, -7.16921 (node/10039721417)
- Castro — 41.61913, -6.30166 (node/10050647504)
- São Gonçalinho (Paulo Noves) — 40.64312, -8.65522 (node/10050803717)
- Paraquedistas — 40.64221, -8.64635 (node/10052116617)
- Mãe de Água da Moita — 38.65026, -8.98346 (node/10054965281)
- Ponta do António — 38.66340, -9.03455 (node/10054965306)
- Ponta da Passadeira — 38.67749, -9.04473 (node/10054965310)
- Às Gentes Da Serra — 40.19028, -8.86378 (node/10060670817)

## Sample `lake` imports

- Nora da Herdade do Malaganito — 37.75626, -7.92836 (way/1030550612)
- Nora da Herdade do Malaganito — 37.75632, -7.92856 (way/1030557152)
- Lagoa Negra — 39.75057, -8.47481 (way/1086420476)
- Fonte do Armazém — 41.14410, -8.62122 (way/253932703)
- Doca da Caldeirinha — 38.70668, -9.13831 (way/309150548)
- Lavadouros — 39.29388, -9.21592 (way/631346155)
- Fonte do Rei — 39.84242, -7.86011 (way/829213368)
- Tanque da Cadeira d’El-Rei — 39.60320, -8.42726 (way/954312363)

## Sample `lighthouse` imports


## Sample `museum` imports

- Forno de Loiça de Manuel Jacinto Carvalho — 37.71448, -25.44006 (node/13990547350)
- Casa da Memória da Medicina Sefardita - Ribeiro Sanches — 40.16894, -7.16853 (node/14321555089)
- Central térmica e de produção de energia mecânica a vapor — 38.61923, -9.16438 (relation/10090310)
- Moinho de Corroios — 38.64358, -9.14468 (relation/11936038)
- Casa de Miguel Torga — 41.26557, -7.62012 (relation/14521786)
- Domus Municipalis — 40.59284, -6.94983 (relation/8700651)
- Museu Municipal de Ourém — 39.64280, -8.59116 (relation/9319498)
- Torre das Cabaças — 39.23572, -8.68013 (way/140594737)
- Convento de São Francisco — 41.56039, -8.43857 (way/159104084)
- Moinho de Maré do Cais das Faluas — 38.70354, -8.97959 (way/307520588)
- Casa de Aquilino Ribeiro — 40.88761, -7.66776 (way/679626469)
- Casa-Museu Anselmo Braamcamp Freire — 39.23396, -8.68150 (way/772798769)

## Sample `nature_preserve` imports

- Paisagem Cultural de Sintra — 38.78739, -9.41504 (relation/19426568)
- Centro Histórico do Porto — 41.14138, -8.61254 (relation/9745063)
- Açude da Fábrica de Fiação de Tomar — 39.62022, -8.40686 (way/301860116)
- Centro Cultural da Malaposta — 38.78726, -9.17025 (way/461422532)
- Fonte dos Passarinhos — 38.81929, -9.22463 (way/461606384)
- Fonte dos Castanheiros — 38.81570, -9.22798 (way/461606386)
- Fonte dos Passarinhos — 38.81916, -9.22450 (way/461606387)
- Fonte de Castelo de Vide — 38.81566, -9.22987 (way/461606388)
- Palácio do Farrobo (restos) — 38.96991, -9.00884 (way/461669742)
- Quinta da Anunciada Velha — 39.59458, -8.44349 (way/462069419)
- Zona Especial de Proteção da Casa das Pedras — 38.68902, -9.36128 (way/555569360)

## Sample `tourist_attraction` imports

- Cruzeiro do Senhor dos Desamparados — 41.29866, -7.74034 (node/10145260592)
- Cruzeiro de Senhor da Boa Hora — 41.29678, -7.73946 (node/10145260594)
- Pelourinho de Aldeia da Mata — 39.30403, -7.73069 (node/10221758595)
- Cruzeiro do Senhor dos Aflitos — 41.26191, -7.78852 (node/10289792304)
- Pedra dos Tempários — 41.82547, -8.73514 (node/10556858272)
- Sobreiro de São Geraldo — 40.74619, -8.60650 (node/10602178880)
- Pelourinho de Ourém — 39.64293, -8.59125 (node/1069241438)
- Carro Combate 50 ton. Diesel 10,5 cm M48A5 m/1976 — 38.75515, -9.23878 (node/10732348671)
- Moinho da Tesoureira — 38.53520, -7.73820 (node/10801375504)
- Moinho do Gato — 38.54051, -7.75728 (node/10807853339)
- Embarcação Boa Esperança — 38.48905, -9.18206 (node/10968443492)
- Conjunto dos Espigueiros no Lugar do Feijoal — 41.38274, -7.70400 (node/11028107727)
- Pelourinho de Vale de Nogueiras — 41.28099, -7.67337 (node/11028318142)
- Cruzeiro de São João — 41.31566, -7.85783 (node/11034708561)
- Cruzeiro do Senhor dos Aflitos — 41.28606, -7.83193 (node/11034708562)

## Sample `viewpoint` imports

- Mirante do Fontanário — 41.26894, -8.08104 (way/183795521)
