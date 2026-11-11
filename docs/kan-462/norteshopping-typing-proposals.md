# NorteShopping — typing proposals (KAN-462, 2026-11-11)

`resolve_mall_types.py` typed 209 of 279 tenants from evidence (a ruling, a row
held elsewhere in Portugal under one type set, or OSM). These are the other 70,
plus six evidence typings that are plainly wrong.

**Accepted by the owner 2026-11-11** and written to `tenant_type_overrides.json`.
The "Not known" table at the end was answered as recorded in `decisions.md`
(NorteShopping, ruled 2026-11-11); the proposals there stood where no answer
was given.

Format: `poi_type` / `store_kind` (+ extra types).

## Proposed with confidence

| tenant | proposal | basis |
|---|---|---|
| ACASCATA | restaurant | held row `Cascata Norteshopping` is a restaurant |
| ACP | store / auto_parts_and_supply | brand set held at Leiria and Amoreiras; KAN-500 retypes every branch |
| AMORINO – GELATO AL NATURALE | ice_cream | gelato chain |
| ARCÁDIA – NESCAFÉ | cafe | coffee counter |
| Arcádia – Roastelier by Nescafé | cafe | coffee counter |
| B STRONG KIDS | store / shoes | same set as `B STRONG` |
| CAFÉ JERONYMO | cafe | held row is a cafe |
| CAFÉ JOYEUX | cafe | |
| CALVIN KLEIN JEANS | store / clothing | |
| CINEMAS NOS | movie_theater | held row |
| COLUNEX | store / mattress | |
| Dyson | store / electronics | |
| Florista Luciano Arte Flores | florist | OSM florist |
| GRAFIPRONTO | store / copy_shop | OSM copyshop |
| GUACAMOLE GMG | restaurant | OSM restaurant |
| H&M | store / clothing | |
| HAPPY FOOD | restaurant | |
| INÊS PEREIRA CABELEIREIROS | hairdresser | OSM hairdresser |
| Jo Malone | store / beauty | OSM beauty |
| JUST IN CASE | store / phone | OSM phone accessories |
| LEITARIA DA QUINTA DO PAÇO | bakery + cafe | same shape as Maria Croissant |
| MALVÓN | restaurant | empanadas |
| MANUEL ALVES SAPATARIAS | store / shoes | OSM shoes |
| MaxMara | store / womens_clothing | |
| MCDONALD’S | restaurant | held row |
| MEO 2 | store / phone | same set as `MEO` |
| Miss Pavlova | bakery + cafe | held row is a bakery |
| MOLDURA MINUTO | store / arts_and_crafts | framing shop |
| MONTBLANC | store / fashion_accessories | |
| MR. PARKING / STARWASH | car_wash | car-park car wash |
| Nata Sweet Nata | bakery + cafe | |
| NICI | store / toys | plush toys |
| NORTH FACE | store / clothing | same set as `THE NORTH FACE` |
| NOTE! | store / books | stationery and books |
| NOVA CÂMBIOS | currency_exchange | OSM bureau_de_change |
| NP4GAME | store / video_game | OSM video_games |
| NUTRYSTORE | store / vitamins_and_supplements | OSM nutrition_supplements |
| O Quiosque | store / newspaper_and_magazines | OSM newsagent |
| PIZZA HUT DELIVERY | restaurant | same set as `PIZZA HUT` |
| PORTUGÁLIA BALCÃO | restaurant | OSM restaurant |
| Q Store | store / clothing | |
| RECREIO INFANTIL – NORTELAND | playground | children's play area |
| RELLENO | restaurant | |
| RT FOCACCIAS BY REITORIA | restaurant | |
| SOLÁRIO PAREDÃO | beauty_salon | tanning |
| TALHO DO MERCADO | restaurant | held row is a restaurant (food-court grill, not a butcher) |
| TIENDA ANIMAL | store / pet | |
| TOP COSTURA | clothing_repair | alterations |
| UNIKE Jewellery | store / jewelry | OSM jewelry |
| VICTORIA’S SECRET | store / lingerie | |
| VILANOVA | store / fashion_accessories | OSM fashion_accessories |
| VISTA ALEGRE | store / home | porcelain |
| WELL’S ÓPTICA | store / eyewear_and_optician | |
| WIZINK | bank | OSM bank |
| WOO | store / phone | telecom shop |
| WTF | store / phone | telecom shop |
| YORN | store / phone | telecom shop |

## Corrections to evidence typings that are wrong

The evidence came from rows we hold elsewhere in Portugal, so those branches
carry the same wrong set. Correcting it here only would break "a brand carries
the same type set in every branch"; the national fix belongs in a follow-up.

| tenant | evidence said | proposal |
|---|---|---|
| FLYING TIGER | florist | store / gift |
| MAC | historical_landmark | store / beauty |
| ZARA HOME | store / clothing | store / home |
| OTRO Perfume Concept | spa | store / beauty |
| TWINSET | store / fashion_accessories | store / womens_clothing |
| TERESINHA CARTEIRAS | store / clothing | store / handbag |

## Not known — need a person

| tenant | what I can tell |
|---|---|
| Lindt, LÄDERACH, Arcádia – Galleria | chocolate shops. Every Lindt we hold is `bakery`; there is no chocolate store kind |
| Chaviarte, CHAVIARTE PREMIUM, Point Fort Fichet | keys and locks; Mister Minit was ruled `shoe_repair` |
| WELL’S | Sonae health and beauty chain; `store / drugstore`? |
| IUMAN | unknown |
| Mimo.Cool | unknown |
| QUAD | unknown |
| SMOLL REPUBLIC | OSM says jewelry |
| Fabric Store | clothing or fabric? |
| Elements | OSM says jewelry |
| HeyDoc | OSM says beauty |
