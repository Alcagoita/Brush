-- KAN-517. Strada Outlet: the floor each listed unit's own page states,
-- written onto the row that answers it. Evidence: mall_lists/strada_floors.tsv.
-- Floors only: no row added, withdrawn or retyped. Idempotent.
-- Held: Café do Ponto and Ponto do Café. The site has Café do Ponto twice
-- (Piso 1, Piso 2) and Ponto do Café on Piso 2; OSM puts our two rows the
-- other way round. A person decides.

UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd0e1b94d-f53f-4f1c-8d13-cb67c901a799';  -- ANI+
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '154d60f3-fff2-40ec-9aba-616c4b986810';  -- A Padaria Portuguesa
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '4e9f482c-4986-4710-8314-6e6a61e25a5d';  -- Ana Joalheiros
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '6fb296ad-ef84-4cb5-96ad-0daa8b3ec7f0';  -- Balcão Portugália
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '5c2737f7-81aa-43dc-839e-4bce059647a0';  -- Benfica Official Outlet
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f696a458-fb21-405d-b96d-80bfe071da64';  -- BigFoot Sport
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '30b8da53-2e6f-43f7-a1c5-3c246167b5c4';  -- Blue Kids
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '85c58389-1ce2-48f0-98cb-1e7987b07e53';  -- Burger King
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6dc1c6b8-6560-42ab-941d-6817b768956a';  -- C&A
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '438c7086-44da-4510-94e6-e6214f47d4f2';  -- Celeiro
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'e8d4f845-d7a2-493c-aad8-b9783db38fc5';  -- Cinemas NOS
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '527ee5da-1944-4b1b-9357-40f73d72b968';  -- Companhia
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6f095e7a-3c6d-4d76-b14c-4d9c4a004479';  -- Daily Planet
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '36a43176-dcf8-4ce8-8404-8be78c2f8565';  -- Farmácia Tanara
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9c196d85-d0a3-4ac0-b651-83fc710c60a7';  -- Fifty factory By Grupo Cortefiel
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '8f633214-512a-452d-b4cc-3d067ba6c1c5';  -- Guess
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '6b59b116-d7f9-4e28-88f7-9466a0ae59d5';  -- H3
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '487fd9b8-17e8-4bb1-9c60-6c4cc8ff18a5';  -- iServices
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '5771c70a-1d6c-4780-b62c-85599d48fee4';  -- Joshua's Shoarma
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '70581b0d-a5cc-44b6-8fb1-a50275570498';  -- Kiko Milano
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '4e1c98c6-2892-4420-b61d-f72f292ec3a5';  -- Lanidor
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '13371d50-c20e-4b14-bf0e-817ed3bc27e7';  -- Lefties
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '018dbe0d-39f9-433f-9539-3e7a40633247';  -- Lion of Porches
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'c6034eee-e10f-4c73-99d9-0989e514b64b';  -- McDonald's
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '05665b5c-0ffc-4bda-8dac-978ee08ecb7e';  -- Meo
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '9f0955e0-2f53-4f62-bcf5-5653c9184231';  -- Mr. Pizza/Ice It
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9fe8cff5-0430-44e6-a37e-f4919b90385c';  -- MultiOpticas
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f42e23f8-3e09-4446-a717-e90f510baf35';  -- Nike
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'c8601aeb-35fc-4e67-99de-1dfdfec24d65';  -- O Boticário
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f0de7bb6-1667-4563-b781-aacb5d7c7edd';  -- Parfois
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '19fa8139-1fce-495a-b076-cafc209d28be';  -- Perfumes & Companhia
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'ccd22065-acf4-4c32-904d-3f900ec57b7e';  -- Pingo Doce
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'd90b4974-d21a-4685-abc9-760183d0a280';  -- Pizza Hut
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '960997f5-c248-4fb0-84bb-d4cc82a96164';  -- Poké House
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '151f472d-704b-41f7-8c69-c5ee08585838';  -- Puma
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'e35c4af4-f233-4326-b84f-1d3a7ce86443';  -- Sacoor
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '649c2f3a-99e2-43ed-a771-da0468bfcc3d';  -- Shampoo & Cia
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'd34b9464-3e1a-46f3-9737-5d83771e5ec0';  -- Taco Bell
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '625798cc-b4dc-481a-b662-af00481b6512';  -- Tefal
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'eda467c4-6a63-4b6e-ad0c-6aa83ccd1984';  -- The Body Shop
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'fa8bcc99-c1b0-4ecb-86b7-a342326f3b18';  -- Tiffosi
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '99ffda47-5eeb-4aa6-b54b-5baeca3cf372';  -- Timberland
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '06984de0-b5b0-4dce-a296-55764244fb53';  -- Tomatino
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f1f096e8-fab1-4e39-8fc4-0db186b9a1dd';  -- Triumph
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6e07f5c7-bc9b-46ac-8348-be5726a9bc67';  -- United Colors of Benetton
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'dbb1e7de-3fca-4860-afc5-4486eef047ac';  -- Vivagym
UPDATE overture_poi SET floor = '2', updated_at = '2026-11-14' WHERE overture_id = '546cfa11-d300-48fb-b5ae-9c70aac2ad6e';  -- Wok To Walk
