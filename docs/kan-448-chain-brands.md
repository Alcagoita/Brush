# KAN-448 — Chains decide their own type and kinds

`Decathlon Albufeira` sits at 37.128150, -8.283346. It is the Decathlon; you
can stand in it. Overture said `school` at 0.97 confidence, and until this
change production agreed, because promotion trusted the category, typed the
row `school`, looked up brands *for schools*, found none, and served an
unbranded school nobody searching for Decathlon would ever see.

That was the loud case. The quiet one was worse: 140 store chains in
production, and for 102 of them the branches disagreed on what the chain
sells, because each branch took its kind from whatever category Meta gave
that one row. NOS had twelve kinds including opticians and pet supplies.
Leroy Merlin sold pet supplies at one branch. Bricomarché was `any`.

## The principle

A store appearing under several kinds is fine. A store not appearing at all
is not. A chain's kinds are the chain's, on every branch.

## The rules

For a row whose name carries a known store chain:

1. **The chain's kinds, all of them, as a union.** Decathlon is `sports` +
   `bicycle` everywhere. A brand listed under two kinds used to resolve to
   *nothing* — that ambiguity is how chains came to take their kind from the
   category. Category-derived kinds on a branded row are replaced, not
   merged: that is what takes `pet` off Leroy Merlin.
2. **The chain overrules the category only when the category is generic or
   non-commercial** — `shopping`, `shopping_center`, `school`, `beach`,
   `parking`, a bus or train station, community services. A commercial
   category is never overruled: `Nespresso` boutiques are cafés, `C&A Guest
   House` is a hostel, `Café Decathlon` is a café. Parks, venues and
   landmarks are not overridable either; they get named after sponsors.
3. **A chain matches anywhere in the name unless a venue word contradicts
   it** (KAN-455). `Loja MEO Braga`, `Ópticas MultiOpticas Faro`, `Armazém
   Conforama Palmela`, `The Phone House` are all real branches, so the brand
   need not lead the name. But another word of the name may say the place is
   something else — `Tasquinha O Salsa` is a tasca, `Cafetaria LIDL Sesimbra`
   a café, `Wok to Walk IKEA Matosinhos` a restaurant, `Óptica Vodafone` an
   optician, `Parque Infantil Decathlon` a playground — and then the chain
   is refused. The words are one data file, `cloudflare/src/venueWords.json`:
   a word carries a `poi_type` (contradicts a chain of another type) or a
   `store_kind` (contradicts a chain that is not a store or lacks that
   kind); a word not in the file is neutral, so `loja`, `armazém`, `outlet`,
   `galerias`, `store`, `house` fit every store and `óptica` fits an optician
   chain. The same file carries the category words of rule 4. Every form
   check of `brand_form_matches` still applies — the ampersand rule keeps
   `C.A. Residência Sénior` from being C&A. The non-store fallback of rule 6
   (supermarket, bank, pharmacy chains in generic categories) is different:
   there the brand must lead the name, because a supermarket's or bank's
   name is borrowed by everything around it — `Washy Continente`, `Centro
   Comercial Continente`, `Loja CTT`, `Clube Millenniumbcp` — and none of
   those carries a venue word.
4. **When the name agrees with the category, the category is right.** `IKEA
   Parking` is the car park. `Escola Decathlon` would be a school.
5. **A generic-word brand matches only when it is the whole name.** `Casa` is
   a homeware chain and also the first word of 586 Portuguese shops that are
   not — `Casa do Rum`, `Casa dos Óculos`, `Casa das Fardas`. A padded match
   made every one of them a home store, and 146 of them were in production
   that way. They are unresolved now, which is what they are.
6. **Supermarket, bank, pharmacy and fuel chains** sitting in generic shopping
   become what they are: Minipreço is a supermarket wherever it is. 123
   supermarket and 175 bank rows in Portugal. **Only when the brand leads
   the name** (KAN-455, see rule 3): `Cafetaria LIDL Sesimbra` is the café,
   not the Lidl. `atlantico` and `big` are generic words here as `casa` is
   in rule 5; `salsa` and `humana` joined rule 5 too.

## Filling the dictionary from the data

The root cause of the mixed kinds was two dictionaries. `brandDictionary.json`
knew Calzedonia was a brand; `storeSubtypeDictionary.json` — the only one
carrying kinds — did not list it. So a chain was recognised as a brand and
then typed by the row.

`discover_store_chains.py` proposes chains from a country's archive on three
measured conditions: the name's first two words repeat at least three times
over store and `shopping` rows; the head is not a generic shop word (`Loja
da …` repeats 134 times because Portuguese repeats, and its categories
scatter); and the top typed category holds at least 60% of the typed rows —
a chain's categories cluster, a description's do not. The majority category
is the kind.

On Portugal that proposed 637 chains over 5,918 rows. 82 were reviewed in
and added, with display names fixed where the two-word head truncated one
(`United Colors` → `United Colors of Benetton`) and kinds folded onto the
app's 22 (`childrens_clothing` → `clothing`, which is also what Calzedonia
is). The proposal is `kan-448/chains-PT.tsv`; the ones left out were
descriptions (`Consultório Veterinário`, `Pet Shop`), a majority category
that was wrong (`5àsec` is a dry cleaner, not electronics), or a kind the app
has no word for (Audika, Celeiro, Samsonite). The rule proposes; a person
approves; the dictionary is the source of truth from then on. Nothing is
typed by repetition at promotion time.

Also fixed while there: Hush Puppies had no kind entry and was `lingerie` in
production through a category; it is shoes.

### Concentration is measured on the kind, not the category (KAN-457)

`Ale-Hop` has 24 branches in the Portugal archive under eight categories:
`flowers_and_gifts_shop` 10, `gift_shop` 7, then one each of souvenir,
fashion accessories, hobby, department store, office equipment, convenience
store and generic `shopping`. Measured on the raw category the top one held
7 of 12 typed store rows — 58%, under the bar — and the rule did not propose
it, so every branch took its kind from its own row. Rua do Ouro was a gift
shop; Faro was a florist.

The rule now measures concentration on the mapped kind, the `(poi_type,
store_kind)` the category map gives each row. Meta files one chain's
branches under sibling categories that all mean the same thing to us — seven
categories map to `home`, six to `hardware`, five to `electronics` — and a
chain counted on the raw category looked scattered when its kind was not.
Two refinements come with it:

* **An umbrella row does not disagree with a leaf under it.** In Meta's tree
  `flowers_and_gifts_shop` sits over `florist` and `gift_shop`; 2,328
  Portuguese rows are filed at the umbrella, most of them florists, so the
  map says `florist`. A row filed there is counted with the leading store
  leaf when that leaf descends from it, and as its own bucket — diluting —
  otherwise. The tree is read from the archive's own `category_path`;
  nothing is configured. Ale-Hop's ten umbrella rows join its seven gift
  rows: 17 of 22, 77%.
* **A chain of florists is not a store chain.** The umbrella rows put
  `Florista Jardim` and eighty of its kind into the row set; a head whose
  majority is not a store is dropped, exactly as cafés are.

The raw breakdown stays in the TSV (`categories`), so a reviewer sees what
was folded. On Portugal the change proposes 659 chains against 637: 34 new,
12 gone. The twelve are descriptions the umbrella rows now dilute (`Jardim
da`, `Horto do`, `Ponto de`) or honestly mixed (`Natura Selection` is 6
clothing, 3 accessories, 2 gifts); none was in the dictionary. The new
proposal is `kan-448/chains-PT-mapped-kind.tsv`; the additions reviewed in
were Ale-Hop (`gift`, a kind the app did not have — `gift_shop` rows were
already served with it and the app could not label them) and four beauty
chains the category had already typed right on every branch: Pluricosmética,
Equivalenza, Flormar, Kiehl's.

Promotion learned one thing to make Faro a gift shop: a chain **refines** an
umbrella bucket when its kind is one of the bucket's children
(`UMBRELLA_CATEGORY_KINDS`). That is not rule 2 being bent — `flowers_and_gifts`
is not a commercial category that was wrong, it is Meta saying "flowers or
gifts" and the chain saying which. The one Ale-Hop filed as a
`convenience_store` stays a mini-market; rule 2 holds. Prod is corrected by
`migrations/0043_chain_discovery_mapped_kind.sql`, 22 rows, generated with
`--after 0041` so it names only what 0041 does not.

## What it does to Portugal

* 1,875 production rows corrected by `migrations/0041_chain_brands_decide_kinds.sql`,
  every statement naming its row — 24 re-typed (three Decathlons among them),
  the rest re-kinded. (Regenerated under KAN-455: the original's 1,887 rows
  held seven retypes the rule 6 fallback read out of the middle of a name —
  `Cafetaria LIDL Sesimbra`, `Snack Bar O Celeiro`, `Atlântico pizzaria` —
  and rule 6 now requires the brand to lead the name, as rule 3 does.) Rows a reviewed batch already decided are left to the
  batch; the chain rule gets no second opinion on them. Generated by `backfill_chain_brands.py` from the
  archive and prod state, executes nothing itself, idempotent. The state it
  corrects is `kan-448/prod-brand-audit-2026-09-15.tsv`.
* Generic-shopping residual: 4,123 → 4,205. Up, and honestly: 146 `Casa …`
  rows were promoted as home stores on the word alone and are now pending,
  while 65 rows the old rule could not type are promoted — 36 supermarkets,
  12 banks, 17 stores.
* Per-chain consistency: every promoted Decathlon, Worten, Leroy Merlin,
  Sport Zone, Calzedonia branch in Portugal now carries the same kind set.

## What it does not do

The long tail of unbranded shops is unchanged. `Charcutaria Central` and
`Lídia Rodrigues` are exactly as unresolved as they were; this is about the
chains people search for by name.
