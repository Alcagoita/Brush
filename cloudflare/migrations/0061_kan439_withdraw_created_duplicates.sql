-- KAN-439. Withdraw 58 curated rows this ticket created in error on
-- 2026-10-23, before anyone is shown the same shop twice.
--
-- THE MISTAKE. `import_mall_tenants.placements` decided "do we already hold
-- this tenant" with an exact folded-name match, while the comparison that
-- produced the list matches confidently at 0.86. Every tenant falling between
-- the two was written a second time. A venue inside a mall carries the mall,
-- the city and its own shop word in its name, so that gap is wide:
--
--   listed `CTT`               we already held `Loja CTT`
--   listed `Aldo`              we already held `Aldo, Amoreiras Shopping`
--   listed `ALAIN AFFLELOU`    we already held `Alain Afflelou Óptico`
--   listed `Gleba – Quiosque`  we already held `Gleba`
--   listed `Bertrand Livreiros` we already held `Bertrand`
--
-- It was found by verifying through `POST /poi/nearby` after writing, not by
-- reasoning about the code — the same way the four UCI cinema rows surfaced.
-- `import_mall_tenants` now uses the comparison's own test, with a regression
-- test that names this date.
--
-- DELIBERATELY NOT IN THIS LIST: the units the owner ruled ARE separate, which
-- a loose name test also flags. `Auchan Ótica`, `Auchan Saúde e Bem Estar`,
-- `Auchan Tecnologia`, `Auchan Gourmet`, `Mango Man`, `Mango Teen`,
-- `Zara Home`, `Companhia`, `Boutique dos Relógios Plus`,
-- `Carrossel Experience`, `O meu Olá`, `Tramas Home` and `Holmes Place SPA`
-- all stay — the operator lists them, so we hold them.
--
-- A curated row is withdrawn with `status = 'removed'`, which nearby's
-- `status = 'active'` filter honours. Nothing is deleted, and the row keeps
-- its provenance.
UPDATE curated_poi
   SET status = 'removed',
       removed_at = '2026-10-23',
       removed_by = 'kan-439-mall-tenants',
       removal_reason = 'KAN-439: created in error; this tenant was already held under another name'
 WHERE status = 'active'
   AND poi_id IN (
    'mall:ubbo:alain-afflelou',
    'mall:ubbo:capri',
    'mall:ubbo:ctt',
    'mall:ubbo:don-ciccio',
    'mall:ubbo:gleba-quiosque',
    'mall:ubbo:holmes-place',
    'mall:ubbo:iservices',
    'mall:ubbo:jeronymo',
    'mall:ubbo:kidzania',
    'mall:ubbo:levi-s',
    'mall:ubbo:lifephone',
    'mall:ubbo:meo',
    'mall:ubbo:mr-blue',
    'mall:ubbo:multiopticas',
    'mall:ubbo:neoon',
    'mall:ubbo:nos',
    'mall:ubbo:opticalia',
    'mall:ubbo:oriente-se',
    'mall:ubbo:outlet-el-corte-ingles',
    'mall:ubbo:portugalia',
    'mall:ubbo:prazeres-picanha',
    'mall:ubbo:primor',
    'mall:ubbo:punto-roma',
    'mall:ubbo:sical-quiosque',
    'mall:ubbo:sport-zone',
    'mall:ubbo:taco-bell',
    'mall:ubbo:talho-burger',
    'mall:ubbo:tgb-the-good-burger',
    'mall:ubbo:valores',
    'mall:ubbo:wok-to-walk',
    'mall:ubbo:zippy',
    'mall:amoreiras:activobank',
    'mall:amoreiras:aldo',
    'mall:amoreiras:amoreiras-360o-panoramic-view',
    'mall:amoreiras:anselmo-rosa-joalheiro',
    'mall:amoreiras:bertrand-livreiros',
    'mall:amoreiras:block-house',
    'mall:amoreiras:ctt',
    'mall:amoreiras:dim-sum',
    'mall:amoreiras:ecco',
    'mall:amoreiras:flying-tiger',
    'mall:amoreiras:fnac',
    'mall:amoreiras:intimissimi',
    'mall:amoreiras:iservices',
    'mall:amoreiras:joshua-s-shoarma',
    'mall:amoreiras:la-creperie',
    'mall:amoreiras:levi-s',
    'mall:amoreiras:meo',
    'mall:amoreiras:nos',
    'mall:amoreiras:poke-house',
    'mall:amoreiras:polo-ralph-lauren',
    'mall:amoreiras:proshop-surfwear',
    'mall:amoreiras:sebago',
    'mall:amoreiras:serra-da-estrela',
    'mall:amoreiras:sport-zone',
    'mall:amoreiras:timberland',
    'mall:amoreiras:vista-alegre',
    'mall:amoreiras:weeel'
  );
