-- KAN-464 review. Mall rows written since KAN-439 carry no brand.
--
-- import_mall_tenants.py wrote curated_poi rows without the brand column, and
-- backfill_brands.py cannot reach them: it walks hex id prefixes and every id
-- here starts "mall:". So the 852 active mall rows had brand NULL and
-- brand-aware nearby could not match them. The writer now sets the brand;
-- this sets it on the 230 existing rows the shared catalogue matches, computed
-- with the same function (import_mall_tenants.brand_for -> find_brand).
-- Kiko Ourivesarias, a jeweller, is not KIKO MILANO and is left unbranded.
--
-- Idempotent.
UPDATE curated_poi SET brand = '100 Montaditos', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:100-montaditos', 'mall:way-1466236773');
UPDATE curated_poi SET brand = 'ActivoBank', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:pt-38.767734--9.098023');
UPDATE curated_poi SET brand = 'Adidas', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:adidas', 'mall:forum_coimbra:adidas');
UPDATE curated_poi SET brand = 'Adolfo Dominguez', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:adolfo-dominguez', 'mall:way-1057099023');
UPDATE curated_poi SET brand = 'Aldo', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:aldo', 'mall:forum_coimbra:aldo', 'mall:leiriashopping:aldo', 'mall:way-1057099011');
UPDATE curated_poi SET brand = 'Auchan', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:auchan-gourmet');
UPDATE curated_poi SET brand = 'Auchan Tecnologia', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:auchan-tecnologia', 'mall:ubbo:auchan-tecnologia');
UPDATE curated_poi SET brand = 'Banco BPI', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:way-1057242948');
UPDATE curated_poi SET brand = 'Bertrand', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:nova_arcada:bertrand-livreiros', 'mall:way-1057242987');
UPDATE curated_poi SET brand = 'Bijou Brigitte', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:bijou-brigitte', 'mall:forum_coimbra:bijou-brigitte', 'mall:leiriashopping:bijou-brigitte', 'mall:via-catarina:bijou-brigitte');
UPDATE curated_poi SET brand = 'Bimba y Lola', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:bimba-y-lola');
UPDATE curated_poi SET brand = 'Bluebird', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:ubbo:bluebird');
UPDATE curated_poi SET brand = 'Boutique dos Relógios', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:boutique-dos-relogios-plus', 'mall:leiriashopping:boutique-dos-relogios', 'mall:norteshopping:boutique-dos-relogios-plus', 'mall:way-1465714971', 'mall:way-1465714973');
UPDATE curated_poi SET brand = 'Burger King', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:ubbo:burger-king', 'mall:via-catarina:burger-king');
UPDATE curated_poi SET brand = 'C&A', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:c-a');
UPDATE curated_poi SET brand = 'Calzedonia', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:calzedonia', 'mall:way-1528273000');
UPDATE curated_poi SET brand = 'Cash Converters', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:ubbo:cash-converters');
UPDATE curated_poi SET brand = 'CeX', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:cex');
UPDATE curated_poi SET brand = 'Celeiro', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:celeiro', 'mall:norteshopping:celeiro', 'mall:nova_arcada:celeiro');
UPDATE curated_poi SET brand = 'Chicco', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:chicco');
UPDATE curated_poi SET brand = 'Continente', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:continente');
UPDATE curated_poi SET brand = 'Cortefiel', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:cortefiel', 'mall:forum_coimbra:cortefiel', 'mall:nova_arcada:cortefiel', 'mall:ubbo:cortefiel', 'mall:way-1465610342');
UPDATE curated_poi SET brand = 'Decenio', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:decenio', 'mall:leiriashopping:decenio', 'mall:way-1528272955');
UPDATE curated_poi SET brand = 'Delta The Coffee House Experience', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:delta-coffee-house-experience');
UPDATE curated_poi SET brand = 'Desigual', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:desigual');
UPDATE curated_poi SET brand = 'Douglas', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:douglas', 'mall:amoreiras:douglas');
UPDATE curated_poi SET brand = 'Equivalenza', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:equivalenza', 'mall:braga_parque:equivalenza', 'mall:norteshopping:equivalenza');
UPDATE curated_poi SET brand = 'Ericeira Surf & Skate', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:ericeira-surf-skate');
UPDATE curated_poi SET brand = 'Espaço Casa', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:nova_arcada:espaco-casa');
UPDATE curated_poi SET brand = 'Fitness Factory', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:fitness-factory');
UPDATE curated_poi SET brand = 'Flormar', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:flormar');
UPDATE curated_poi SET brand = 'Galp', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:pt-38.768169--9.099201');
UPDATE curated_poi SET brand = 'Gant', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:gant');
UPDATE curated_poi SET brand = 'H3', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:nova_arcada:h3-new-hamburgology', 'mall:ubbo:h3', 'mall:way-1057098935');
UPDATE curated_poi SET brand = 'Intimissimi', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:intimissimi-uomo', 'mall:norteshopping:intimissimi-uomo', 'mall:nova_arcada:intimissimi', 'mall:ubbo:iuman-intimissimi-uomo', 'mall:via-catarina:intimissimi', 'mall:via-catarina:iuman-intimissimi-uomo');
UPDATE curated_poi SET brand = 'JD Sports', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:way-1464456937');
UPDATE curated_poi SET brand = 'KFC', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:kfc');
UPDATE curated_poi SET brand = 'Kiko', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:kiko-milano', 'mall:ubbo:kiko-milano');
UPDATE curated_poi SET brand = 'Kiwoko', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:pt-38.767518--9.098747', 'mall:ubbo:kiwoko');
UPDATE curated_poi SET brand = 'Lanidor', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:lanidor-kids');
UPDATE curated_poi SET brand = 'Lefties', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:lefties');
UPDATE curated_poi SET brand = 'Levi''s', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:levi-s-store');
UPDATE curated_poi SET brand = 'Lion of Porches', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:lion-of-porches', 'mall:amoreiras:lion-of-porches', 'mall:leiriashopping:lion-of-porches', 'mall:norteshopping:lion-of-porches', 'mall:way-1057099000', 'mall:way-1465610336');
UPDATE curated_poi SET brand = 'MEO', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:meo', 'mall:norteshopping:meo-2', 'mall:nova_arcada:meo');
UPDATE curated_poi SET brand = 'Mango', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:mango-man', 'mall:ubbo:mango-man', 'mall:ubbo:mango-teen', 'mall:way-1528272968');
UPDATE curated_poi SET brand = 'McDonald''s', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:mcdonald-s', 'mall:leiriashopping:mcdonald-s');
UPDATE curated_poi SET brand = 'Merrell', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:merrell', 'mall:braga_parque:merrell-cat', 'mall:ubbo:merrell-cat');
UPDATE curated_poi SET brand = 'Millennium bcp', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:pt-38.767522--9.098781');
UPDATE curated_poi SET brand = 'Mr. Blue', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:leiriashopping:mr-blue', 'mall:way-1528273011');
UPDATE curated_poi SET brand = 'NOS', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:nos', 'mall:forum_coimbra:nos', 'mall:leiriashopping:nos', 'mall:norteshopping:nos', 'mall:nova_arcada:nos', 'mall:via-catarina:nos', 'mall:way-1528273037');
UPDATE curated_poi SET brand = 'New Yorker', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:via-catarina:new-yorker');
UPDATE curated_poi SET brand = 'Normal', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:normal', 'mall:leiriashopping:normal', 'mall:nova_arcada:normal');
UPDATE curated_poi SET brand = 'Novo Banco', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:novo-banco');
UPDATE curated_poi SET brand = 'O Boticário', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:nova_arcada:o-boticario', 'mall:way-1466202932');
UPDATE curated_poi SET brand = 'Oro Vivo', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:oro-vivo', 'mall:forum_coimbra:oro-vivo', 'mall:norteshopping:oro-vivo', 'mall:way-1057242979');
UPDATE curated_poi SET brand = 'Pandora', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:pandora', 'mall:leiriashopping:pandora', 'mall:way-1466236791');
UPDATE curated_poi SET brand = 'Perfumes & Companhia', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:nova_arcada:perfumes-companhia', 'mall:via-catarina:perfumes-companhia');
UPDATE curated_poi SET brand = 'Pizza Hut', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:pizza-hut-delivery', 'mall:via-catarina:pizza-hut-fatias');
UPDATE curated_poi SET brand = 'Pluricosmética', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:pluricosmetica', 'mall:braga_parque:pluricosmetica', 'mall:forum_coimbra:pluricosmetica', 'mall:leiriashopping:pluricosmetica', 'mall:nova_arcada:pluricosmetica', 'mall:pt-38.768116--9.099264', 'mall:ubbo:pluricosmetica', 'mall:via-catarina:pluricosmetica', 'mall:way-1528273016');
UPDATE curated_poi SET brand = 'Portugália', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:portugalia', 'mall:norteshopping:portugalia-balcao');
UPDATE curated_poi SET brand = 'Primor', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:primor', 'mall:forum_coimbra:primor', 'mall:nova_arcada:primor', 'mall:way-1465600660');
UPDATE curated_poi SET brand = 'Quebramar', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:quebramar', 'mall:norteshopping:quebramar', 'mall:way-1465610326', 'mall:way-1528272992');
UPDATE curated_poi SET brand = 'Rituals', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:rituals');
UPDATE curated_poi SET brand = 'Sacoor Brothers', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:sacoor-brothers');
UPDATE curated_poi SET brand = 'Salsa', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:salsa', 'mall:forum_coimbra:salsa', 'mall:leiriashopping:salsa', 'mall:way-1528272954');
UPDATE curated_poi SET brand = 'Samsung', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:samsung', 'mall:norteshopping:samsung');
UPDATE curated_poi SET brand = 'Scalpers', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:scalpers', 'mall:norteshopping:scalpers');
UPDATE curated_poi SET brand = 'Seaside', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:seaside', 'mall:braga_parque:seaside', 'mall:forum_coimbra:seaside', 'mall:nova_arcada:seaside', 'mall:way-1465600630', 'mall:way-1528272917');
UPDATE curated_poi SET brand = 'Sfera', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:way-1465600628');
UPDATE curated_poi SET brand = 'Skechers', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:skechers', 'mall:forum_coimbra:skechers', 'mall:leiriashopping:skechers', 'mall:ubbo:skechers', 'mall:way-1057242957', 'mall:way-1464595750');
UPDATE curated_poi SET brand = 'Snipes', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:ubbo:snipes-2');
UPDATE curated_poi SET brand = 'Solinca', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:solinca');
UPDATE curated_poi SET brand = 'Swarovski', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:swarovski', 'mall:amoreiras:swarovski', 'mall:braga_parque:swarovski', 'mall:forum_coimbra:swarovski', 'mall:leiriashopping:swarovski', 'mall:pt-38.767599--9.097919');
UPDATE curated_poi SET brand = 'Swatch', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:way-1466122908');
UPDATE curated_poi SET brand = 'Taco Bell', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:nova_arcada:taco-bell', 'mall:via-catarina:taco-bell', 'mall:way-1057098962');
UPDATE curated_poi SET brand = 'Timberland', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:timberland');
UPDATE curated_poi SET brand = 'Vilanova', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:vilanova', 'mall:norteshopping:vilanova', 'mall:nova_arcada:vilanova', 'mall:ubbo:vilanova', 'mall:via-catarina:vilanova');
UPDATE curated_poi SET brand = 'Vitaminas', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:vitaminas', 'mall:way-1528272894');
UPDATE curated_poi SET brand = 'Vodafone', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:vodafone', 'mall:amoreiras:vodafone', 'mall:forum_coimbra:vodafone', 'mall:leiriashopping:vodafone', 'mall:norteshopping:vodafone', 'mall:nova_arcada:vodafone', 'mall:ubbo:vodafone', 'mall:via-catarina:vodafone', 'mall:way-1466122902', 'mall:way-1528273038');
UPDATE curated_poi SET brand = 'Wells', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:wells-otica', 'mall:forum_coimbra:wells-otica', 'mall:ubbo:wells', 'mall:via-catarina:wells', 'mall:way-1528273029-otica');
UPDATE curated_poi SET brand = 'Wok to Walk', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:wok-to-walk');
UPDATE curated_poi SET brand = 'Worten', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:alma_shopping:worten', 'mall:leiriashopping:worten-mobile', 'mall:norteshopping:worten', 'mall:norteshopping:worten-2', 'mall:ubbo:worten', 'mall:ubbo:worten-mobile');
UPDATE curated_poi SET brand = 'Xiaomi', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:xiaomi', 'mall:leiriashopping:xiaomi-store', 'mall:way-1466236792');
UPDATE curated_poi SET brand = 'Zara', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:zara', 'mall:way-1057242989');
UPDATE curated_poi SET brand = 'Zara Home', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:amoreiras:zara-home', 'mall:braga_parque:zara-home', 'mall:forum_coimbra:zara-home');
UPDATE curated_poi SET brand = 'Zippy', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:braga_parque:zippy', 'mall:forum_coimbra:zippy', 'mall:leiriashopping:zippy', 'mall:nova_arcada:zippy', 'mall:way-1057242995', 'mall:way-1528273022');
UPDATE curated_poi SET brand = 'Zu', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:norteshopping:zu');
UPDATE curated_poi SET brand = 'iServices', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:way-1057098972');
UPDATE curated_poi SET brand = 'iStore', updated_at = '2026-11-13', updated_by = 'kan-464-review' WHERE poi_id IN ('mall:forum_coimbra:istore', 'mall:leiriashopping:istore', 'mall:nova_arcada:istore', 'mall:ubbo:istore', 'mall:way-1057098978');
