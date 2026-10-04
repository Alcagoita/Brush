# KAN-439 — the 14 UBBO units whose only operator category is `Serviços`

`Serviços` types nothing by itself: a barber, a car wash, a currency exchange
and a key cutter all carry it. Every one of these rows still needs a real
`poi_type` and, where it is a shop, a specific `store_kind` — **no bare
`store`**.

Proposals below come from our own vocabulary (`poiTypeCategories.json`, and
the `store_kind` values live in production), never from the operator's words.
**Four are unknown and want the owner's answer.**

| unit | `poi_type` | `store_kind` | source |
|---|---|---|---|
| 1920 Barber Shop | `barber` | — | owner — men's only |
| Barber Best Boss | `barber` | — | owner — men's only |
| Grace Hair | `hairdresser` | — | owner — unisex |
| Car Wash & Spa | `car_wash` | — | confirmed |
| MWash Auto SPA | `car_wash` | — | confirmed |
| Mister Minit | `shoe_repair` | — | owner — shoe repair and key duplication |
| Real Transfer | `money_transfer` | — | confirmed |
| Unicâmbio | `currency_exchange` | — | confirmed |
| Casa da Sorte | `lottery` | — | confirmed |
| Cloud House Vaper Store | `store` | `e_cigarette` | confirmed |
| Cort&Cose | `clothing_repair` | — | confirmed |
| Gold Suisse | `pawn`¹ | `pawn` | owner — pawn shop, buys and sells gold |
| MyForce | `car_repair` | — | owner |
| Wiñk | `beauty_salon` | — | owner |

¹ `pawn` exists as a `store_kind` (13 rows in production) but not as a
`poi_type`. Either the row is `store` + `store_kind = pawn`, or `pawn` becomes
a type of its own — one unit is thin evidence for a new type, so it goes in as
`store` + `pawn` unless the owner says otherwise.

**Key duplication has no type either.** Mister Minit does shoe repair *and*
keys; `shoe_repair` captures half of it. A `locksmith`/`key_cutting` type
would capture the other half, and "I need a spare key" is a real errand —
noted, not proposed, for the same reason as above.

## The gendered hair split already exists — the data is what is broken

The owner's recollection was right: **`barber` and `hairdresser` are separate
types and have been since KAN-401** (migration `0025_split_hair_and_beauty`):

```
barber       men's hair          Barbearia
hairdresser  hair, women/unisex  Cabeleireiro
beauty_salon / salon             full service
nail_salon
```

All of it is live. `src/types/index.ts` declares both, both are taggable, both
are in `CATEGORY_POI_MAP.personal`, and `copy.ts` has `Barbershop`/`Barbearia`
and `Hairdresser`/`Cabeleireiro`. Production holds 3,398 `barber` and 8,049
`hairdresser` rows, and `type_relation` keeps them apart —
`barber -> [barber, barber_shop]`, `hairdresser -> [hair_care, hairdresser]`,
with no edge between them.

Verified through the endpoint at UBBO, 2 km, not from SQL counts:

```
barber        20 rows      hairdresser  44 rows
salon         50 rows      nail_salon    3 rows
```

**So why it feels broken: 355 rows nationally carry BOTH `barber` and
`hairdresser`.** At UBBO that is 3 of the 20 barber results. A woman asking
for a hairdresser is offered barbershops, and a man asking for a barber is
offered women's salons — exactly the complaint.

Two different faults inside those 355:

* **genuinely both**, and correct — `Cabeleireiro barbeiro renascer de novo`,
  `Márcio de Oliveira Cabeleireiro/barbeiro`: the shop does both;
* **mistyped** — `Taveira Cabeleireiros`, `Cabeleireiro da Rita`,
  `Lúcia Cabeleireiros`, `Patricia Pierre Cabeleireiros` are hairdressers
  carrying `barber` as well; `Barbearia Ritz` is a barbershop carrying
  `hairdresser`; `Gusbarber Cabeleireiro de Homens` is men's only.

A name test separates most of them, which is what migration 0025 did — but
0025 ran against `poi` and `osm_poi`, the tables retired at KAN-442/454. The
Overture promoter decides these rows now, and it is assigning both.

**This is not KAN-439.** It is a data correction plus a promoter rule, it
affects 355 rows nationally rather than a mall, and it wants its own ticket.
Recorded here because it is why the owner saw barbers offered to women.

## The other 83

They carry a usable operator category and map without a judgement call —
`Restauração` (14), `Eletrodomésticos, Telecomunicações e Informática` (6),
`Acessórios de Moda e Bijuteria` (5), and so on. The mapping itself still
needs writing and reviewing before any row is created; this document is only
about the 14 that no category can answer.
