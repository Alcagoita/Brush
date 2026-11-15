-- KAN-517. UBBO: the floor each listed unit's own page states,
-- written onto the row that answers it. Evidence: mall_lists/ubbo_floors.tsv.
-- Floors only: no row added, withdrawn or retyped. Idempotent.

UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '05cfbf06-f1ce-44f6-ad25-aa83e5a0bc65';  -- 100 Montaditos
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:1920-barber-shop';  -- 1920 Barber Shop
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '88c6b72f-b82a-4580-ae82-03c5042fdde2';  -- 5 à Sec
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:a-100';  -- A-100
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6bd7ab7c-5fe6-4cba-bd09-9a71ec088649';  -- Açaí Natura
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:acium';  -- Acium
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '05a0663f-86db-425c-924d-6e1f4156078c';  -- Action
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9532ea0a-348e-4621-9bd8-a013ebded59f';  -- Adidas
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:agencia-abreu';  -- Agência Abreu
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'e333a809-ea2b-404d-8394-e0781cbb5f8c';  -- ALAIN AFFLELOU
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f1bab406-06f4-4bf6-a1ca-b10346ece5be';  -- Aldo
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'b2822d09-14d7-4435-9543-1c55596bbe4b';  -- Ale-Hop
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:alentejo';  -- Alentejo
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd823a2e6-dd3a-4207-b8d3-a5b22ac6f5d2';  -- Amor aos Pedaços
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:ana-joalheiros';  -- Ana Joalheiros
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:arara';  -- Arara
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'f77df041-5692-4f9f-a4be-660ebc726c8a';  -- Arcádia
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'aa050475-d1b5-4b75-b00b-e80b703f7e75';  -- Auchan
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:auchan-otica';  -- Auchan Ótica
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:auchan-saude-e-bem-estar';  -- Auchan Saúde e Bem Estar
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:auchan-tecnologia';  -- Auchan Tecnologia
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:aurya';  -- Aurya
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:awa-massage';  -- AWA Massage
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:bachiyo';  -- BACHIYO
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:barber-best-boss';  -- Barber Best Boss
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:belle-vogue';  -- Belle Vogue
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:beontime';  -- Beontime
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f65a1c93-66cd-4eaf-a1ad-786a85e0759c';  -- Bershka
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9a847345-a8f2-43e2-bb31-84635d6aa0fc';  -- Bertrand
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:bifanas-de-vendas-novas';  -- Bifanas de Vendas Novas
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '64370806-d68a-4f85-bb85-9ef55d5d7a1e';  -- Bijou Brigitte
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:bitoque-no-ponto';  -- Bitoque no Ponto
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:blue-kids';  -- Blue Kids
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:bluebird';  -- BlueBird
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:braza';  -- Braza
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'ae6099bc-c594-47d4-b666-248298e72825';  -- Bubble Time
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:burger-king';  -- Burger King
UPDATE curated_poi SET floor = '-1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:cacifos-ctt-locky';  -- Cacifos CTT Locky
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'a88c9d53-9f45-48f5-83c2-6b6be603adb8';  -- Calçado Guimarães
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd09c1b6f-4d1d-4134-99a5-de4543124ac7';  -- Calzedonia
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'b75890af-9c95-4448-a739-be50b43669c8';  -- Capri
UPDATE curated_poi SET floor = '-1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:car-wash-spa';  -- Car Wash & Spa
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'f72e5b92-0c1a-4f07-966b-6b6651f18f9a';  -- Carpet Store
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '79722112-cae3-428b-9082-1acbd06a3c2d';  -- Carrossel
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:casa-da-sorte';  -- Casa da Sorte
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:casa-do-sono';  -- Casa do Sono
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '4c4c4626-38cb-44a7-a981-71bae5224b92';  -- Casa Móvil
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:cash-converters';  -- Cash Converters
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'aef09b9e-859d-4570-b81a-8ce06651ecda';  -- Celeiro
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'c00eb892-3d1d-4d39-b68d-9e64efce9ff8';  -- Celio
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '34c64e63-bb35-4f6d-a81e-71228a2ba400';  -- Centroxogo
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'dcb2b976-c665-4fd5-a37b-8cbd7982f25b';  -- CeX
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '42f6bd88-9648-4b25-95b0-29c950bf7813';  -- Chicco
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'acfbbb8f-fc80-4220-9d85-102fac63756d';  -- Chickinho
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:cloud-house-vaper-store';  -- Cloud House Vaper Store
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:colchaonet';  -- ColchãoNet
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:cort-cose';  -- Cort&Cose
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:cortefiel';  -- Cortefiel
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'ea48b567-e39c-4d43-b362-b243e51c620c';  -- CTT
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '653ae5dd-5869-4537-928a-4f17a7fe2f9b';  -- Deichmann
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:delicias-do-bairro';  -- Delícias do Bairro
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '8cc223df-031e-4e00-b766-35f7cd5a5f76';  -- Delta Espresso
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:digi';  -- DIGI
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:dom-gelato';  -- Dom Gelato
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'fd4b0b55-fc3a-4e74-8b19-d0799a224cc7';  -- Don Ciccio
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:emma';  -- Emma
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd2ba8f0c-d9de-49c2-8fa2-7672d3968aad';  -- Equivalenza
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '165aa860-fe0b-432c-b644-eb3661e95ebe';  -- Espaço Casa
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:euro-sofas';  -- Euro Sofás
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:fabrica-dos-oculos';  -- Fábrica dos Óculos
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:farmacia-reis-barata';  -- Farmácia Reis Barata
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:figu';  -- Figu
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:fireaway-pizza';  -- Fireaway Pizza
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '7876d611-5680-4978-b0de-449ed69004d2';  -- Flying Tiger Copenhagen
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'a5d253d2-91ba-45a0-9c56-bf0f0b585f7c';  -- Fnac
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f75a57cf-6a98-42d5-8baa-714a3a81ff5d';  -- Fogo de Chão
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:food-more';  -- Food&More
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'e72eecf0-df94-4386-a513-0cbf88621454';  -- Foot Locker
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:fotosport';  -- Fotosport
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '87320654-6d65-43bd-bb63-e6e7bc6212d1';  -- Fútbol Emotion
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:galeria-da-joia';  -- Galeria da Jóia
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '57e6abce-f174-4cb6-91da-86727bd8489a';  -- Gato Preto
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:georgia-brigadeiros';  -- Georgia Brigadeiros
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '0486f60e-95ac-4080-af59-19d34bb574cf';  -- Gleba – Quiosque
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:glo-quiosque';  -- Glo – Quiosque
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:gold-suisse';  -- Gold Suisse
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:grace-hair';  -- Grace Hair
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '02b268a4-e92c-4e78-adeb-c405ce65c02e';  -- H&M
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:h3';  -- H3
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:hair-body';  -- Hair & Body
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'e6d110e2-2a37-4ce3-b6ca-fb40d960b5f5';  -- Hanami Sushi
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'de29969f-d04e-457f-b5fe-29cb8ea54de9';  -- Hebe Gyros
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '0bb9cd2e-d3f5-421d-b782-7026e06a7471';  -- Holmes Place
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:holmes-place-spa';  -- Holmes Place SPA
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '685358e7-719b-46ea-87a5-e25d9a92432f';  -- Intimissimi
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '5561d6a5-2ac7-4c29-9f4e-6d98967f2ee5';  -- IQOS
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '6982f790-8d5e-4c59-a5eb-67b4a54ff441';  -- iServices
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:italian-republic';  -- Italian Republic
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:iuman-intimissimi-uomo';  -- IUMAN Intimissimi Uomo
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'a53658b0-1b95-43be-94ac-3c24eff809e0';  -- Jack & Jones
UPDATE curated_poi SET floor = '-1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:japon-market';  -- Japon Market
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '57ab6472-d567-4f67-a3d9-dd3c24968bb6';  -- JD Sports
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '53cdc55c-b89f-481b-b0e3-30d26cb37d65';  -- Jeronymo
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:jose-luis-joyerias';  -- JOSE LUIS Joyerías
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '61aada73-8c10-4066-9f40-1e06fa0aad49';  -- Joshua's Shoarma Grill
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'eca0bebf-545f-44a3-bf19-2bd72cb6c0c0';  -- KFC
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f2467971-82a7-48ae-a32a-f747eb84d0bd';  -- KIABI
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:kiko-milano';  -- KIKO MILANO
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:kivet';  -- Kivet
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:kiwoko';  -- Kiwoko
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '19955002-fd45-44e2-9b33-564f5805c8b1';  -- Kyoto
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'b2d2502a-66bb-49c5-8ec6-42dccadd81ea';  -- Lefties
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '752c7528-9337-4b0c-a363-53da369dfaaf';  -- Levi's
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:liberjoia';  -- Liberjóia
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '96531216-0ca7-41d0-a22d-f7fc1f4a4281';  -- Lifephone
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '41470852-96c6-4c5e-bed4-033f7b6e3a07';  -- llaollao
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6ddd207c-0dbd-4e73-a3ab-7041f3d22149';  -- Lugar da Jóia
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'a6a9c86a-143a-43e0-9e0f-099abbdaa436';  -- Mais Optica
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mandarim';  -- Mandarim
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd40cdd89-8681-47c8-a9c7-5ceb01469b37';  -- Mango
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mango-man';  -- Mango Man
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mango-teen';  -- Mango Teen
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:maria-croissant';  -- Maria Croissant
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '2b8d9db4-0d4b-493f-aef1-702d87369129';  -- Massimo Dutti
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6bd13db1-8912-4684-be19-ae542fb46729';  -- McDonald's
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mcs-men';  -- MCS Men
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mediterraneo';  -- Mediterrâneo
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'f35b0715-068e-46eb-b2da-59498f7b0385';  -- MEO
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:merrell-cat';  -- Merrell CAT
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '0e988379-fbc0-4c33-818b-4c7818c157fb';  -- MICO
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mister-minit';  -- Mister Minit
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mo';  -- MO
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mobile-fix';  -- Mobile Fix
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:monster-cookies-quiosque';  -- Monster Cookies – Quiosque
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:morangos-please';  -- Morangos Please
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:morena-rosa';  -- Morena Rosa
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:motocard';  -- Motocard
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd1474735-9c43-403c-9fab-b52c2c62cf50';  -- Mr. Blue
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'f303b754-2493-4650-b875-be940622c1cf';  -- MultiOpticas
UPDATE curated_poi SET floor = '-1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:mwash-auto-spa';  -- MWash Auto SPA
UPDATE curated_poi SET floor = '-1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:myforce';  -- MyForce
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:nails4-us';  -- Nails4'Us
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:natura';  -- Natura
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '05b3dbda-dc0b-4d97-8ffa-e2e914fac5ea';  -- Nespresso
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:new-story';  -- New Story
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'c1e1ab8c-8c8f-431f-9384-1f44ee0b0a49';  -- New Yorker
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '15ec0aac-0608-4513-be76-609c9f763517';  -- Normal
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'd9e92e19-05b2-4216-b1e8-b560f9cad87b';  -- NOS
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '86594c5c-4a44-4e3b-b0cf-e43a20a9e13e';  -- O Boticário
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:oakberry';  -- Oakberry
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:oakberry-truck';  -- Oakberry Truck
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '984f6c19-c440-4fa0-a0e3-5cf5e1de8e82';  -- Olá
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '3b2f09d9-737a-4cea-8c20-073ded695d66';  -- Opticália
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '83334cfa-c1aa-447c-bc0b-8d3cf0f38aba';  -- Oriente-se
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '90e01adc-dd30-401f-8cad-b2e69fa5e457';  -- Oro Vivo
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:ortopedia-pt';  -- Ortopedia.pt
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '55883504-8789-4b09-a993-db82a566f174';  -- Outlet El Corte Inglés
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'b7a3926a-4fb1-457e-962f-76eb7732c6c6';  -- Oysho
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:pacomartinez';  -- PACOMARTINEZ
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:padaria-do-bairro';  -- Padaria do Bairro
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '94db61da-75d6-43d9-95da-bb1b3c116265';  -- Pandora
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '547bf0a2-6ee3-4b39-bebc-180c3a7b67a1';  -- Pans & Company
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9ad9efac-9749-4676-8678-0257275e7745';  -- Parfois
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '08bd3f58-d71b-4ee5-b35f-9c93b3c66118';  -- Pepco
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f7b920d5-be87-4b93-b4fd-3cce0832b9a1';  -- Perfumes & Companhia
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:pet-s-park';  -- Pet's Park
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'fc556e89-4122-47e0-b62d-efb32ef82fe8';  -- Pizza Hut
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:pluricosmetica';  -- Pluricosmética
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:poke-house';  -- Poke House
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '92c7b881-3662-426d-a6a0-353b0ccf114e';  -- Portugália
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '2ac7baeb-1a21-41d0-a411-9dc23892b00a';  -- Prazeres Picanha
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:presse-linha';  -- Presse Linha
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '10791514-5ed3-48be-a3ac-f1c4401d32ce';  -- Primark
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f5d3891c-6ae1-4352-ab66-71e90f611c2b';  -- Primor
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '588c1292-334d-4555-927c-d154f7eff4b9';  -- Pull&Bear
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '56d7be9b-be20-47f5-8220-92c1fc6b597c';  -- Punto Roma
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '94df9d55-e628-484c-a6f3-93f76c5b6bec';  -- Quasi Pronti
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '705ff91b-9307-4e45-8b8e-f2d4c47ee46a';  -- Quebramar
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:ramen-go';  -- Ramen Go
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:real-transfer';  -- Real Transfer
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '27694e7c-f117-4384-8b95-6576c3aa462a';  -- Rituals
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:rock-s';  -- ROCK'S
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '2440fe79-74d2-4827-b7de-609b6b00d5d4';  -- Salsa
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '3c5b58de-9dd6-434f-8e8e-b1fd369de5de';  -- Scartezini
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'b8f5e67a-8e04-45ad-8028-4757f697b8da';  -- Seaside
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '2d077c4c-46f6-4e46-8eb2-4456b79bc8b7';  -- Sephora
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:shades-world';  -- Shades World
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'c4d9cfee-320c-41a0-affa-3157d1da7c0e';  -- Sical – Quiosque
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:skechers';  -- Skechers
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:sl-benfica';  -- SL Benfica
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:snipes-2';  -- Snipes
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '1c80773d-ebb6-4cc5-96df-963556262a1e';  -- Snipes
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'cd5b806d-f806-4890-b784-d215593ac163';  -- Sport Zone
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:sporting';  -- Sporting
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'e4cf4bf3-cd87-431d-8fc9-d45781fc3523';  -- Springfield
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'eb6683a9-e64d-4542-918e-6ed6b806b9cb';  -- Starbucks
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:stone-by-stone';  -- Stone by Stone
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '401ea62f-efc3-4827-87ae-4c7734852ea3';  -- Stradivarius
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:street-smash-burgers';  -- Street Smash Burgers
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'e0779040-ff86-4b7f-bfad-f3501bf656de';  -- Subway
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:suco-bagaco';  -- Suco Bagaço
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:suits-inc';  -- Suits Inc
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '4ca2c40a-48a7-4c26-abe8-b97a40eb4638';  -- Swarovski
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:tabink';  -- Tabink
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '60d894fd-a56c-4220-96c9-5df89f5f5940';  -- Taco Bell
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9a2de348-dcd8-4716-a3ac-ef594a8688ec';  -- Talho Burger
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'ae810e34-b8ab-4649-9258-a3d63f488d65';  -- Tezenis
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'cf8bcd0d-4f0b-4d9d-b058-418aa521c3b6';  -- TGB – The Good Burger
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd389f96a-73fa-4629-b36f-137db6120bca';  -- Tiffosi
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:tip-top-tailor';  -- Tip Top Tailor
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:top-atlantico';  -- Top Atlântico
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '41e0426b-2e3e-420b-b534-aa0cd652eba3';  -- Tous
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:tramas-home';  -- Tramas Home
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'a4aba150-c1eb-4d64-85fd-e316b12a7d9c';  -- Tramas+
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:tudo4mobile';  -- Tudo4Mobile
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:under-blue';  -- Under Blue
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:unicambio';  -- Unicâmbio
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '477cedb7-033b-4e8d-b8f3-2bccca27e239';  -- United Colors of Benetton
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:uzo';  -- UZO
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'b3f6f9e8-56c1-4182-999c-f75bb1301934';  -- Valores
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:vilanova';  -- Vilanova
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:visionlab';  -- VisionLab
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'da52359e-6bb7-46b6-bc80-b8ab7ca059ec';  -- Vitaminas
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:vodafone';  -- Vodafone
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:weeel';  -- Weeel
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:wink';  -- Wiñk
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '5b056151-cfc5-439e-9f53-b557fa730046';  -- Wok to Walk
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:women-secret';  -- Women'secret
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:woo';  -- WOO
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:worten';  -- Worten
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:worten-mobile';  -- Worten Mobile
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '773544cd-2037-4a51-80a2-bc98caf859da';  -- Zara
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = '93e2ff11-b417-41aa-b955-d2c34041147b';  -- Zippy
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:zoojoy';  -- ZooJoy
