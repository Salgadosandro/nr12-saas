--
-- Seed da NR-12 (dado de referência, compartilhado por todos os tenants)
--
-- Camada: standards -> standard_versions -> standard_sections.
-- Os standard_items (cláusulas 12.x.y e subitens a/b/c) entram depois,
-- aninhados em cada section.
--
-- Fonte: NR-12, redação da Portaria SEPRT n.º 916, de 30/07/2019 (sumário).
-- Idempotente: pode rodar de novo (ON CONFLICT DO NOTHING).
-- UUIDs fixos para que os items possam referenciar as sections com estabilidade.
--

-- ===== Norma =====
insert into standards (id, code, title) values
  ('12000000-0000-0000-0000-000000000000', 'NR-12',
   'Segurança no Trabalho em Máquinas e Equipamentos')
on conflict do nothing;

-- ===== Versão (redação vigente) =====
insert into standard_versions
  (id, standard_id, version_label, source_portaria_number, source_issuing_body,
   source_signed_date, status)
values
  ('12000000-0000-0000-0000-000000000019',
   '12000000-0000-0000-0000-000000000000',
   'Portaria SEPRT 916/2019', 'SEPRT 916', 'SEPRT', '2019-07-30', 'published')
on conflict do nothing;

-- ===== Sections: 18 módulos (corpo) =====
insert into standard_sections
  (id, standard_version_id, section_type, code, title, position)
values
  ('12000000-0000-0000-0001-000000000001', '12000000-0000-0000-0000-000000000019', 'module', '12.1',  'Princípios gerais', 1),
  ('12000000-0000-0000-0001-000000000002', '12000000-0000-0000-0000-000000000019', 'module', '12.2',  'Arranjo físico e instalações', 2),
  ('12000000-0000-0000-0001-000000000003', '12000000-0000-0000-0000-000000000019', 'module', '12.3',  'Instalações e dispositivos elétricos', 3),
  ('12000000-0000-0000-0001-000000000004', '12000000-0000-0000-0000-000000000019', 'module', '12.4',  'Dispositivos de partida, acionamento e parada', 4),
  ('12000000-0000-0000-0001-000000000005', '12000000-0000-0000-0000-000000000019', 'module', '12.5',  'Sistemas de segurança', 5),
  ('12000000-0000-0000-0001-000000000006', '12000000-0000-0000-0000-000000000019', 'module', '12.6',  'Dispositivos de parada de emergência', 6),
  ('12000000-0000-0000-0001-000000000007', '12000000-0000-0000-0000-000000000019', 'module', '12.7',  'Componentes pressurizados', 7),
  ('12000000-0000-0000-0001-000000000008', '12000000-0000-0000-0000-000000000019', 'module', '12.8',  'Transportadores de materiais', 8),
  ('12000000-0000-0000-0001-000000000009', '12000000-0000-0000-0000-000000000019', 'module', '12.9',  'Aspectos ergonômicos', 9),
  ('12000000-0000-0000-0001-000000000010', '12000000-0000-0000-0000-000000000019', 'module', '12.10', 'Riscos adicionais', 10),
  ('12000000-0000-0000-0001-000000000011', '12000000-0000-0000-0000-000000000019', 'module', '12.11', 'Manutenção, inspeção, preparação, ajuste, reparo e limpeza', 11),
  ('12000000-0000-0000-0001-000000000012', '12000000-0000-0000-0000-000000000019', 'module', '12.12', 'Sinalização', 12),
  ('12000000-0000-0000-0001-000000000013', '12000000-0000-0000-0000-000000000019', 'module', '12.13', 'Manuais', 13),
  ('12000000-0000-0000-0001-000000000014', '12000000-0000-0000-0000-000000000019', 'module', '12.14', 'Procedimentos de trabalho e segurança', 14),
  ('12000000-0000-0000-0001-000000000015', '12000000-0000-0000-0000-000000000019', 'module', '12.15', 'Projeto, fabricação, importação, venda, locação, leilão, cessão a qualquer título e exposição', 15),
  ('12000000-0000-0000-0001-000000000016', '12000000-0000-0000-0000-000000000019', 'module', '12.16', 'Capacitação', 16),
  ('12000000-0000-0000-0001-000000000017', '12000000-0000-0000-0000-000000000019', 'module', '12.17', 'Outros requisitos específicos de segurança', 17),
  ('12000000-0000-0000-0001-000000000018', '12000000-0000-0000-0000-000000000019', 'module', '12.18', 'Disposições finais', 18)
on conflict do nothing;

-- ===== Sections: 12 anexos =====
insert into standard_sections
  (id, standard_version_id, section_type, code, title, position)
values
  ('12000000-0000-0000-0002-000000000001', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO I',    'Requisitos para o uso de detectores de presença optoeletrônicos', 19),
  ('12000000-0000-0000-0002-000000000002', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO II',   'Conteúdo programático da capacitação', 20),
  ('12000000-0000-0000-0002-000000000003', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO III',  'Meios de acesso a máquinas e equipamentos', 21),
  ('12000000-0000-0000-0002-000000000004', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO IV',   'Glossário', 22),
  ('12000000-0000-0000-0002-000000000005', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO V',    'Motosserras', 23),
  ('12000000-0000-0000-0002-000000000006', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO VI',   'Máquinas para panificação e confeitaria', 24),
  ('12000000-0000-0000-0002-000000000007', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO VII',  'Máquinas para açougue, mercearia, bares e restaurantes', 25),
  ('12000000-0000-0000-0002-000000000008', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO VIII', 'Prensas e similares', 26),
  ('12000000-0000-0000-0002-000000000009', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO IX',   'Injetora de materiais plásticos', 27),
  ('12000000-0000-0000-0002-000000000010', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO X',    'Máquinas para fabricação de calçados e afins', 28),
  ('12000000-0000-0000-0002-000000000011', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO XI',   'Máquinas e implementos para uso agrícola e florestal', 29),
  ('12000000-0000-0000-0002-000000000012', '12000000-0000-0000-0000-000000000019', 'annex', 'ANEXO XII',  'Equipamentos de guindar para elevação de pessoas e realização de trabalho em altura', 30)
on conflict do nothing;

-- ===========================================================================
-- standard_items
-- (só requisitos: o módulo 12.1, puramente principiológico, não gera itens)
-- ===========================================================================

-- ===== Itens do módulo 12.2 — Arranjo físico e instalações =====
-- section_id = 12000000-0000-0000-0001-000000000002
insert into standard_items
  (id, standard_section_id, parent_item_id, number, text, position)
values
  ('12020000-0000-0000-0000-000000000001', '12000000-0000-0000-0001-000000000002', null,
   '12.2.1', 'Nos locais de instalação de máquinas e equipamentos, as áreas de circulação devem ser devidamente demarcadas em conformidade com as normas técnicas oficiais.', 1),
  ('12020000-0000-0000-0000-000000000002', '12000000-0000-0000-0001-000000000002', '12020000-0000-0000-0000-000000000001',
   '12.2.1.1', 'É permitida a demarcação das áreas de circulação utilizando-se marcos, balizas ou outros meios físicos.', 2),
  ('12020000-0000-0000-0000-000000000003', '12000000-0000-0000-0001-000000000002', '12020000-0000-0000-0000-000000000001',
   '12.2.1.2', 'As áreas de circulação devem ser mantidas desobstruídas.', 3),
  ('12020000-0000-0000-0000-000000000004', '12000000-0000-0000-0001-000000000002', null,
   '12.2.2', 'A distância mínima entre máquinas, em conformidade com suas características e aplicações, deve resguardar a segurança dos trabalhadores durante sua operação, manutenção, ajuste, limpeza e inspeção, e permitir a movimentação dos segmentos corporais, em face da natureza da tarefa.', 4),
  ('12020000-0000-0000-0000-000000000005', '12000000-0000-0000-0001-000000000002', null,
   '12.2.3', 'As áreas de circulação e armazenamento de materiais e os espaços em torno de máquinas devem ser projetados, dimensionados e mantidos de forma que os trabalhadores e os transportadores de materiais, mecanizados e manuais, movimentem-se com segurança.', 5),
  ('12020000-0000-0000-0000-000000000006', '12000000-0000-0000-0001-000000000002', null,
   '12.2.4', 'O piso do local de trabalho onde se instalam máquinas e equipamentos e das áreas de circulação deve ser resistente às cargas a que está sujeito e não oferecer riscos de acidentes.', 6),
  ('12020000-0000-0000-0000-000000000007', '12000000-0000-0000-0001-000000000002', null,
   '12.2.5', 'As ferramentas utilizadas no processo produtivo devem ser organizadas e armazenadas ou dispostas em locais específicos para essa finalidade.', 7),
  ('12020000-0000-0000-0000-000000000008', '12000000-0000-0000-0001-000000000002', null,
   '12.2.6', 'As máquinas estacionárias devem possuir medidas preventivas quanto à sua estabilidade, de modo que não basculem e não se desloquem intempestivamente por vibrações, choques, forças externas previsíveis, forças dinâmicas internas ou qualquer outro motivo acidental.', 8),
  ('12020000-0000-0000-0000-000000000009', '12000000-0000-0000-0001-000000000002', '12020000-0000-0000-0000-000000000008',
   '12.2.6.1', 'As máquinas estacionárias instaladas a partir da Portaria SIT n.º 197/2010 devem respeitar os requisitos necessários fornecidos pelos fabricantes ou, na falta desses, o projeto elaborado por profissional legalmente habilitado quanto à fundação, fixação, amortecimento e nivelamento.', 9),
  ('12020000-0000-0000-0000-000000000010', '12000000-0000-0000-0001-000000000002', null,
   '12.2.7', 'Nas máquinas móveis que possuem rodízios, pelo menos dois deles devem possuir travas.', 10),
  ('12020000-0000-0000-0000-000000000011', '12000000-0000-0000-0001-000000000002', null,
   '12.2.8', 'As máquinas, as áreas de circulação, os postos de trabalho e quaisquer outros locais em que possa haver trabalhadores devem ficar posicionados de modo que não ocorra transporte e movimentação aérea de materiais sobre os trabalhadores.', 11),
  ('12020000-0000-0000-0000-000000000012', '12000000-0000-0000-0001-000000000002', '12020000-0000-0000-0000-000000000011',
   '12.2.8.1', 'É permitido o transporte de cargas em teleférico nas áreas internas e externas à edificação fabril, desde que não haja postos de trabalho sob o seu percurso, exceto os indispensáveis para sua inspeção e manutenção, conforme esta NR e a NR-35.', 12),
  ('12020000-0000-0000-0000-000000000013', '12000000-0000-0000-0001-000000000002', null,
   '12.2.9', 'Nos casos em que houver regulamentação específica ou NR setorial estabelecendo requisitos para sinalização, arranjos físicos, circulação e armazenamento, prevalecerá a regulamentação específica ou a NR setorial.', 13)
on conflict do nothing;
