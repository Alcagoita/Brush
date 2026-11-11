-- KAN-439. The operator's list is the source of truth for what is inside a
-- shopping centre, in BOTH directions (owner, 2026-10-05): "If we have 24
-- stores at Ubbo that aren't on the source of true, that's wrong."
--
-- Overture and OSM are helpers inside a centre, never sources — they answer
-- where a listed tenant is, never which tenants exist. So a served row inside
-- a centre that the operator does not list is withdrawn here.
--
-- Same tombstone as 0051-0053, 0056 and 0058: `poi_source_correction` with
-- `visible = 0`, which nearby honours. Nothing is deleted, every row keeps its
-- reviewed decision, and the withdrawal is reversible.
--
-- TWO GUARDS, both of which changed the list:
--
--  * STRICT OUTLINE ONLY. The footprint buffer exists so a listed tenant with
--    a coarse coordinate still matches; using it to remove sweeps in the
--    neighbours. `Worten` is 19 m from Amoreiras Plaza and 106 m from
--    Amoreiras Shopping Center, `Massimo Dutti` 30 m from Plaza — tenants of a
--    DIFFERENT centre in the same block — and the ring also holds street banks
--    and a charger 203 m out. None of them is touched.
--  * THE MATCHER MISSES TENANTS. `H3 Hambúrguer Gourmet` is the listed `H3`
--    and `UCI Dolce Vita Tejo` is the listed `UCI Luxe` under the centre's old
--    name. Both are kept.
--
-- A listed unit held twice keeps one row, named in the note.
--
-- `INSERT OR IGNORE`, so a re-run changes nothing.
INSERT OR IGNORE INTO poi_source_correction
  (source, source_id, visible, review_note, created_at)
VALUES
  -- Boutique dos Relógios [store]
  ('overture', '276de63d-5bca-4111-9912-e2d23142ef8e', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Convento dos Doces - UBBO Shopping [bakery]
  ('overture', '533c330b-567c-4111-8741-607932a2de62', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Courir [store]
  ('overture', 'd128fe78-91d4-4490-9d0a-ac441892cac0', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Cozinha à Bras [restaurant]
  ('overture', '878f54cb-4a36-4a83-8a2d-3bbd2a07224e', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Dilúvio Tattoo Ubbo [tattoo]
  ('overture', '899f4c3a-ce24-4d75-9ffb-c65148cebada', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Eurekakids [store]
  ('overture', '942decd9-23ce-4b37-ba36-9cdca5c4012b', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- FUBBO [restaurant]
  ('overture', '59144da8-00bc-4c81-ab01-4f88d7374b38', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Frankie Hot Dogs [restaurant]
  ('overture', '79daedad-6b0c-4812-8b23-b97ad29938a1', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Hong Sha Long [restaurant]
  ('overture', '88702c79-6f32-43df-845e-cf57292d60a6', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- La Casa de las Carcasas [store]
  ('overture', 'bca48064-f7e8-4a04-a426-ac37dd35b4d5', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- McCafé [cafe]
  ('overture', '9641d14d-9ff6-4abb-bf0b-2018035a6927', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Movefree [store]
  ('overture', 'fa649711-b2ac-43d6-aa6d-605205cb06ff', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Rio Brasil Lisboa [restaurant]
  ('overture', '5c1587a8-baee-490f-a957-d3013f40dddf', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Stefano [store]
  ('overture', '82b971d2-2ce9-42ef-a09c-81b110da0862', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Sun Planet Portugal [store]
  ('overture', 'b1b6e3dd-0f80-4cd1-b01b-fb534e828da9', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Sunglass Hut [store]
  ('overture', '701c8807-e539-428f-8435-f8d7a15e8269', 0, 'KAN-439: UBBO — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Loja CTT [post]
  ('overture', '8e4e27d2-8d33-416e-8cf6-23afef2b31d7', 0, 'KAN-439: UBBO — listed once; ''CTT (EC UBBO)'' kept; owner rule 2026-10-05', '2026-10-05'),
  -- Sical [cafe]
  ('overture', '717f169e-86e6-47ec-8cdf-72464191be8c', 0, 'KAN-439: UBBO — listed once; ''Quiosque Sical'' kept; owner rule 2026-10-05', '2026-10-05'),
  -- A Loja do Gato Preto [store]
  ('overture', '7f33d87d-f3b5-4e87-8baf-4c2f106a259d', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Beiju Tapiocaria [restaurant]
  ('overture', '4993b4dd-ad0d-442b-b103-3ae264b355c2', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Buckle [store]
  ('overture', '23dbc807-5a2a-49e6-83a0-39ed97088e7d', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Bulhosa Books & Living [store]
  ('overture', '335bf19f-a9ea-47f7-962f-ce7b7ed5104e', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Denso Fio [spa]
  ('overture', '7543e510-18e2-4ce3-aa64-4b97c095e18c', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Dreamy World [store]
  ('overture', 'adad8ac0-7d80-470e-a085-bc1f70a86bd8', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Godiva [bakery]
  ('overture', '17703c66-9189-4882-bf10-5bdaf5e9e84c', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Hussel [bakery]
  ('overture', '2a23460c-48ae-43c5-a296-28619853b33f', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- L'Occitane en Provence - Lisboa [store]
  ('overture', '03aa67a7-5a4a-4177-962c-d5a377d7e4ba', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Liu Jo [store]
  ('overture', '6f472e6d-35ec-418e-87c0-f56b172e59bb', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Loja das Sopas [restaurant]
  ('overture', 'a8b61c6d-2e85-4604-b6aa-9240002517cf', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Pull&Bear [store]
  ('overture', 'd09e6c6e-bab2-4eeb-81b4-273a01b78695', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Reposteiro Dourado [restaurant]
  ('overture', '7025e36e-d2c8-4778-b241-94d53ac930c0', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Smooy - Authentic Frozen Yogurt (iogurte gelado) [ice_cream]
  ('overture', 'a21cb633-a669-44d5-a3a5-d86dacbbb323', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- United Colors of Benetton [store]
  ('overture', '6b706129-0bf4-4eef-b770-de798e833b08', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Uterque [store]
  ('overture', '06003fa9-a6e0-437f-a86f-8db4f94a2705', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Wok to Walk Amoreiras [restaurant]
  ('overture', '9d1f2aac-955a-404a-8dd9-9ef3c949387b', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- Banco Montepio ATM [atm]
  ('overture', '216e48d3-5067-4fa4-b1e2-4233659b9926', 0, 'KAN-439: Amoreiras — not on the operator list; owner rule 2026-10-05', '2026-10-05'),
  -- CTT (EC Amoreiras) [post]
  ('overture', '2fdf0b56-da86-4e22-ad22-8971a4d63f84', 0, 'KAN-439: Amoreiras — listed once; ''Loja CTT'' kept; owner rule 2026-10-05', '2026-10-05');
