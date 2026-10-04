# KAN-439 — the 14 UBBO units whose only operator category is `Serviços`

`Serviços` types nothing by itself: a barber, a car wash, a currency exchange
and a key cutter all carry it. Every one of these rows still needs a real
`poi_type` and, where it is a shop, a specific `store_kind` — **no bare
`store`**.

Proposals below come from our own vocabulary (`poiTypeCategories.json`, and
the `store_kind` values live in production), never from the operator's words.
**Four are unknown and want the owner's answer.**

| unit | proposed `poi_type` | `store_kind` | confidence |
|---|---|---|---|
| 1920 Barber Shop | `hair_care` | — | high |
| Barber Best Boss | `hair_care` | — | high |
| Grace Hair | `hair_care` | — | high |
| Car Wash & Spa | `car_wash` | — | high |
| MWash Auto SPA | `car_wash` | — | high |
| Mister Minit | `shoe_repair` | — | high — also cuts keys |
| Real Transfer | `money_transfer` | — | high |
| Unicâmbio | `currency_exchange` | — | high |
| Casa da Sorte | `lottery` | — | medium — a lottery agent? |
| Cloud House Vaper Store | `store` | `e_cigarette` | medium |
| **Cort&Cose** | `clothing_repair`? | — | **unknown** — reads as "cut & sew" |
| **Gold Suisse** | `store` | `jewelry`? | **unknown** — gold dealer; buying or selling changes the answer |
| **MyForce** | ? | ? | **unknown** |
| **Wiñk** | `beauty_salon`? | — | **unknown** — a lash and brow bar? |

## A type we do not have

There is no `barber` in our 115 types — `hair_care` is the nearest, and it
also covers salons. Three of the 14 are barbers. If a barber should be
taggable separately from a salon, that is **a type to add**, which is the
settled answer here rather than dropping or mistyping a real place
(`travel_agency` and `copy_shop` were added in KAN-435 for exactly this).

Not proposing it unasked: three units is thin evidence, and the question is
whether a user would tag "barber" differently from "hairdresser".

## The other 83

They carry a usable operator category and map without a judgement call —
`Restauração` (14), `Eletrodomésticos, Telecomunicações e Informática` (6),
`Acessórios de Moda e Bijuteria` (5), and so on. The mapping itself still
needs writing and reviewing before any row is created; this document is only
about the 14 that no category can answer.
