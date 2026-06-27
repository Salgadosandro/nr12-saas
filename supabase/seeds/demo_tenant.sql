--
-- Seed de DEMONSTRAÇÃO (tenant de teste = conta A "Minha Consultoria de Teste")
-- NÃO é dado de produção — serve para exercitar a API do laudo ponta a ponta.
-- Depende: conta A (d9ebe275...), cliente "Cliente do A", e a norma já semeada.
-- Idempotente (ON CONFLICT DO NOTHING). Referencia itens da norma pelo número.
--

-- ===== checklist_template: "Checklist NR-12 — Prensa" =====
insert into checklist_templates (id, account_id, standard_version_id, name) values
  ('c7000000-0000-0000-0000-000000000001',
   'd9ebe275-b388-49ae-a476-96343b6c7a4a',
   '12000000-0000-0000-0000-000000000019',
   'Checklist NR-12 — Prensa')
on conflict do nothing;

-- ===== seções do template (espelham 12.3, 12.4, 12.5 da norma) =====
insert into checklist_template_sections (id, checklist_template_id, standard_section_id) values
  ('c7000000-0000-0000-0001-000000000003', 'c7000000-0000-0000-0000-000000000001',
   (select id from standard_sections where code = '12.3')),
  ('c7000000-0000-0000-0001-000000000004', 'c7000000-0000-0000-0000-000000000001',
   (select id from standard_sections where code = '12.4')),
  ('c7000000-0000-0000-0001-000000000005', 'c7000000-0000-0000-0000-000000000001',
   (select id from standard_sections where code = '12.5'))
on conflict do nothing;

-- ===== itens do template (selecionam standard_items pelo número) =====
insert into checklist_template_items (id, checklist_template_section_id, standard_item_id) values
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000003', (select id from standard_items where number = '12.3.5')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000004', (select id from standard_items where number = '12.4.1')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000004', (select id from standard_items where number = '12.4.2')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000004', (select id from standard_items where number = '12.4.3')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000004', (select id from standard_items where number = '12.4.5')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000005', (select id from standard_items where number = '12.5.1')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000005', (select id from standard_items where number = '12.5.7')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000005', (select id from standard_items where number = '12.5.8')),
  (gen_random_uuid(), 'c7000000-0000-0000-0001-000000000005', (select id from standard_items where number = '12.5.9'))
on conflict do nothing;
