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

-- ===========================================================================
-- Inspeção de demonstração: Prensa 01 inspecionada com o template Prensa
-- (reaproveita a inspeção "Inspeção de Teste" já ligada ao laudo ebcb8f39)
-- ===========================================================================

-- ----- Cadastro: local + máquina -----
insert into locations (id, client_id, name, code) values
  ('c9000000-0000-0000-0000-000000000001',
   (select id from clients where account_id='d9ebe275-b388-49ae-a476-96343b6c7a4a' and name='Cliente do A' limit 1),
   'Unidade Fabril A', 'UF-01')
on conflict do nothing;

insert into machine_types (id, name) values
  ('c9000000-0000-0000-0000-000000000011', 'Prensa')
on conflict do nothing;

insert into machine_models (id, machine_type_id, manufacturer, model_code) values
  ('c9000000-0000-0000-0000-000000000012', 'c9000000-0000-0000-0000-000000000011', 'Schuler', 'PH-100')
on conflict do nothing;

insert into machines (id, machine_model_id, location_id, tag, code, serial_number, manufacture_year) values
  ('c9000000-0000-0000-0000-000000000021', 'c9000000-0000-0000-0000-000000000012',
   'c9000000-0000-0000-0000-000000000001', 'Prensa 01', 'MQ-01', 'SN-AAA-001', 2018)
on conflict do nothing;

-- ----- Checklist aplicado: Prensa 01 na "Inspeção de Teste", template Prensa -----
insert into checklists (id, account_id, inspection_id, machine_id, checklist_template_id, status, nr_applies) values
  ('c9000000-0000-0000-0000-000000000031', 'd9ebe275-b388-49ae-a476-96343b6c7a4a',
   (select id from inspections where account_id='d9ebe275-b388-49ae-a476-96343b6c7a4a' and name='Inspeção de Teste' limit 1),
   'c9000000-0000-0000-0000-000000000021', 'c7000000-0000-0000-0000-000000000001', 'completed', true)
on conflict do nothing;

-- ----- Respostas: 1 por item do template (todas conformes inicialmente) -----
insert into answers (account_id, checklist_id, checklist_template_item_id, status)
select 'd9ebe275-b388-49ae-a476-96343b6c7a4a', 'c9000000-0000-0000-0000-000000000031', ti.id, 'compliant'
from checklist_template_items ti
join checklist_template_sections s on s.id = ti.checklist_template_section_id
where s.checklist_template_id = 'c7000000-0000-0000-0000-000000000001'
on conflict do nothing;

-- ----- Uma não-conformidade real: item 12.4.3 (bimanual sem sincronia) -----
update answers a set
  status = 'non_compliant',
  justification = 'Comando bimanual sem atuação síncrona: aceita acionamento com um dos botões travado.',
  probability = 'high', severity = 'major', risk_level = 'critical'
from checklist_template_items ti
join standard_items si on si.id = ti.standard_item_id
where a.checklist_template_item_id = ti.id
  and a.checklist_id = 'c9000000-0000-0000-0000-000000000031'
  and si.number = '12.4.3';

-- ----- Plano de ação para a não-conformidade -----
insert into action_plans (account_id, answer_id, description)
select 'd9ebe275-b388-49ae-a476-96343b6c7a4a', a.id,
  'Substituir/ajustar a interface de comando bimanual para garantir atuação síncrona (retardo <= 0,5 s), conforme item 12.4.3.'
from answers a
where a.checklist_id = 'c9000000-0000-0000-0000-000000000031' and a.status = 'non_compliant'
on conflict do nothing;

-- ===========================================================================
-- Mais máquinas, para testar o comportamento com múltiplas:
--   Prensa 02 = toda conforme | Prensa 03 = 1 NC | Prensa 04 = NR não se aplica
-- ===========================================================================

insert into machines (id, machine_model_id, location_id, tag, code, serial_number, manufacture_year) values
  ('c9000000-0000-0000-0000-000000000022', 'c9000000-0000-0000-0000-000000000012', 'c9000000-0000-0000-0000-000000000001', 'Prensa 02', 'MQ-02', 'SN-AAA-002', 2020),
  ('c9000000-0000-0000-0000-000000000023', 'c9000000-0000-0000-0000-000000000012', 'c9000000-0000-0000-0000-000000000001', 'Prensa 03', 'MQ-03', 'SN-AAA-003', 2019),
  ('c9000000-0000-0000-0000-000000000024', 'c9000000-0000-0000-0000-000000000012', 'c9000000-0000-0000-0000-000000000001', 'Prensa 04', 'MQ-04', 'SN-AAA-004', 2021)
on conflict do nothing;

-- checklists: 02 e 03 aplicam a NR
insert into checklists (id, account_id, inspection_id, machine_id, checklist_template_id, status, nr_applies) values
  ('c9000000-0000-0000-0000-000000000032', 'd9ebe275-b388-49ae-a476-96343b6c7a4a',
   (select id from inspections where account_id='d9ebe275-b388-49ae-a476-96343b6c7a4a' and name='Inspeção de Teste' limit 1),
   'c9000000-0000-0000-0000-000000000022', 'c7000000-0000-0000-0000-000000000001', 'completed', true),
  ('c9000000-0000-0000-0000-000000000033', 'd9ebe275-b388-49ae-a476-96343b6c7a4a',
   (select id from inspections where account_id='d9ebe275-b388-49ae-a476-96343b6c7a4a' and name='Inspeção de Teste' limit 1),
   'c9000000-0000-0000-0000-000000000023', 'c7000000-0000-0000-0000-000000000001', 'completed', true)
on conflict do nothing;

-- Prensa 04: excluída (12.1.4.f INMETRO) — sem respostas, o gate curto-circuita
insert into checklists (id, account_id, inspection_id, machine_id, checklist_template_id, status, nr_applies, exclusion_code, exclusion_notes) values
  ('c9000000-0000-0000-0000-000000000034', 'd9ebe275-b388-49ae-a476-96343b6c7a4a',
   (select id from inspections where account_id='d9ebe275-b388-49ae-a476-96343b6c7a4a' and name='Inspeção de Teste' limit 1),
   'c9000000-0000-0000-0000-000000000024', 'c7000000-0000-0000-0000-000000000001', 'completed', false, '12.1.4.f', 'Máquina certificada pelo INMETRO.')
on conflict do nothing;

-- respostas Prensa 02 (todas conformes)
insert into answers (account_id, checklist_id, checklist_template_item_id, status)
select 'd9ebe275-b388-49ae-a476-96343b6c7a4a', 'c9000000-0000-0000-0000-000000000032', ti.id, 'compliant'
from checklist_template_items ti
join checklist_template_sections s on s.id = ti.checklist_template_section_id
where s.checklist_template_id = 'c7000000-0000-0000-0000-000000000001'
on conflict do nothing;

-- respostas Prensa 03 (conformes, depois 1 NC no 12.5.7)
insert into answers (account_id, checklist_id, checklist_template_item_id, status)
select 'd9ebe275-b388-49ae-a476-96343b6c7a4a', 'c9000000-0000-0000-0000-000000000033', ti.id, 'compliant'
from checklist_template_items ti
join checklist_template_sections s on s.id = ti.checklist_template_section_id
where s.checklist_template_id = 'c7000000-0000-0000-0000-000000000001'
on conflict do nothing;

update answers a set
  status = 'non_compliant',
  justification = 'Proteção móvel sem dispositivo de intertravamento: a máquina opera com a proteção aberta.',
  probability = 'medium', severity = 'major', risk_level = 'high'
from checklist_template_items ti
join standard_items si on si.id = ti.standard_item_id
where a.checklist_template_item_id = ti.id
  and a.checklist_id = 'c9000000-0000-0000-0000-000000000033'
  and si.number = '12.5.7';

insert into action_plans (account_id, answer_id, description)
select 'd9ebe275-b388-49ae-a476-96343b6c7a4a', a.id,
  'Instalar dispositivo de intertravamento na proteção móvel, conforme item 12.5.7.'
from answers a
where a.checklist_id = 'c9000000-0000-0000-0000-000000000033' and a.status = 'non_compliant'
on conflict do nothing;
