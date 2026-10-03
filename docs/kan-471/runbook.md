# KAN-471 — review log

## Second owner review, 2026-10-03

### Withdrawn (migration 0052, applied and verified)

| id | name | why |
|---|---|---|
| `37fe6a62` | Rua Azores Park | not a place we serve (Ponta Delgada, confidence 0.52) |
| `0dbe7be0` | Badoca Park | duplicate of the park, 3.9 km away |
| `13db4597` | Badoka Safari Park | duplicate, 21.2 km, Grândola |
| `ce3d793b` | Badoca Safari Park | duplicate, 83.4 km, filed in Lisboa |
| `1bd142b2` | Badoca Safari Park | duplicate, 86.1 km, filed in Lisboa |

`Badoca Safari Park` arrived **five** times, not four. The one kept is
`0e2b3245`, filed as `zoo`, confidence 1.00, at 38.04158,-8.74450 in Vila Nova
de Santo André — the actual park. Verified through `POST /poi/nearby`: none of
the four copies is served at its own coordinates, and the real park still is.

**Two more share the name and were NOT withdrawn**, because they are a
different claim and want their own decision:

* `54eeb83d` `Badoca Safari Park`, category `amusement_park`, 5.1 km away,
  confidence 0.99 — never reached the naming review.
* `d064f951` `Badoka Park`, category `petting_zoo`, **100.9 km** away in Lagos,
  confidence 0.72.

### Held out pending a type decision

A row filed as the wrong kind of place must not be given a name for that kind —
calling a restaurant `Praia de …` would dress it up as a beach. These three are
excluded from the naming review (`detect_english_names.WRONG_TYPE`) and need a
retype decision, which is not this ticket's scope:

| id | name | served as | where | confidence |
|---|---|---|---|---|
| `3cd36123` | Sabor Pesca Beach | `beach` | 41.17766,-7.11198 — Torre de Moncorvo, on the river Sabor | 0.74 |
| `0498f5da` | Beach Side | `beach` | 37.11892,-8.54120 — Portimão, by Praia da Rocha | 0.73 |
| `b17d0862` | Boom Lake | `lake` | 39.96981,-7.18500 — Idanha-a-Nova | 0.81 |

`Boom Lake` is almost certainly the reservoir at the Boom Festival site: the
festival is held at Idanha-a-Nova on the Marechal Carmona reservoir, and these
coordinates sit on it. The recorded Portuguese name is the reservoir's
(`Albufeira de Idanha-a-Nova` / `Albufeira Marechal Carmona`), not "Boom Lake",
which looks like a festival-era label. Owner's call.

### Rules added

* `Church of …` translates the COMPLETE name, not only the descriptor:
  `Church of Our Lady of the Glory` is `Igreja de Nossa Senhora da Glória`,
  `Church of the Sacred Heart` is `Igreja do Sagrado Coração`.
* Twelve names confirmed by hand in `src/nativeNameOverrides.json`, which
  outranks every rule — `Castle of the Knights Templar, Tomar, Portugal` is
  `Castelo de Tomar`, which nothing derives.
* Eight more names confirmed as the place's own and left alone.
* A name carrying a parenthetical is flagged: `OH (Open Heart church)` had come
  out as `Igreja de OH (Open Coração`, the lexicon having translated inside the
  bracket.
