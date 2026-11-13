# Operator tenant lists

Transcribed by hand from each shopping centre's own website. The operator is
the authority for what is inside and on which floor — see
docs/poi-classification-rules.md.

Format is `Name|Piso N`, one per line. `|` is the delimiter and cannot
appear in a name — write the brand alone (`5 À SEC`, not `5 À SEC | 5 À FIL`);
`read_tenant_list` refuses a line with an unexpected extra field. A trailing zone word (`Piso 0 GARE`)
is kept as written and ignored when reading the floor: it is the same floor
of an adjoining building, and a person finds it from the floor alone.

`Name|` — an empty second field — means the operator publishes no floor for
that unit. Write it empty rather than as a bare `Piso`, which reads as a
floor named "Piso" and is not one.

`Name|Piso N|opening` marks a unit the operator has announced but not
opened. `read_tenant_list` skips these: a shop that has not opened is a
place that does not exist, and adding it would put a point on the map for
something nobody can walk into.

**Record when each was last verified.** A stale list is worse than none —
it retires real places with false confidence.

| file | centre | covers | verified |
|---|---|---|---|
| `vasco_da_gama_eating.txt` | Centro Comercial Vasco da Gama | eating places (68) | 2026-08-31 |
| `colombo_eating.txt` | Centro Comercial Colombo | eating places (65) | 2026-08-31 |
| `vasco_da_gama_stores.txt` | Centro Comercial Vasco da Gama | shops (154) | 2026-08-31 |
| `colombo_stores.txt` | Centro Comercial Colombo | shops (235) | 2026-08-31 |
| `strada.txt` | Strada Outlet Odivelas | shops and eating (113) | 2026-09-01 |
| `ubbo_stores.txt` | UBBO (Dolce Vita Tejo), Amadora | shops and eating (246) | 2026-10-04 |
| `amoreiras.txt` | Amoreiras Shopping Center, Lisboa | shops and eating (196) | 2026-10-05 |
| `norteshopping.txt` | NorteShopping, Senhora da Hora (Matosinhos) | shops and eating (279) | 2026-11-11 |
| `via_catarina.txt` | Via Catarina Shopping, Porto | shops and eating (76) | 2026-11-12 |
| `leiriashopping.txt` | LeiriaShopping, Leiria | shops and eating (122) | 2026-11-12 |
| `braga_parque.txt` | Braga Parque, Braga | shops and eating (160) | 2026-11-12 |
| `nova_arcada.txt` | Nova Arcada, Braga | shops, eating and retail park (96) | 2026-11-12 |
| `forum_coimbra.txt` | Forum Coimbra, Coimbra | shops and eating (127) | 2026-11-13 |
| `alma_shopping.txt` | Alma Shopping (ex Dolce Vita), Coimbra | shops and eating (97) | 2026-11-13 |
| `forum_algarve.txt` | Forum Algarve, Faro | shops and eating (117) | 2026-11-13 |
| `mar_shopping_algarve.txt` | MAR Shopping Algarve, Loulé | shops (88) and eating (31) | 2026-11-13 |
| `algarveshopping.txt` | AlgarveShopping, Guia | shops and eating (116) | 2026-11-13 |

`ubbo_operator_categories.tsv` and `amoreiras_operator_categories.tsv` hold
each centre's operator categories verbatim. They are first a **helper for a
person reading an escalation** (owner, 2026-10-04), and they are the **last
resort** in `resolve_mall_types`, used only where one category implies exactly
one type — `Restauração` → `restaurant`, `Sapataria` → `store`/`shoes`.
Anything broader escalates rather than being typed: `Serviços` covers a
barber, a car wash and a currency exchange, and reading it as a type is how
`Mandarim`, a Chinese restaurant, came to be held as `store`/`home`.

A ruling by a person, a row we already hold elsewhere in Portugal, and OSM all
outrank the category, and every typed row records which of them answered it.

UBBO publishes no floor for any unit, so every floor there comes from OSM;
Amoreiras publishes one for 195 of its 196. NorteShopping publishes one for
all but 11; those are Piso 0 by the owner's ruling (2026-11-11).

A list covers only what it covers. An eating-places page says nothing about
the shops in the same centre — `mall_tenants.py` enforces that through its
`covers` argument.

## Floors do not come from OSM

OSM's `level` is internally consistent inside one building and not
comparable across buildings. Measured: Colombo agrees with the published
Piso 55 times out of 55; Vasco da Gama's level runs ONE BELOW the Piso in 30
of 35 cases. Take the floor from the list here, and use OSM only where the
operator states none — Strada publishes no floors at all, so every floor
there comes from OSM with nothing to check it against.
