--
-- Migration 0004 — laudos com revisões (reports 1:N por inspeção)
--
-- O laudo evolui no tempo: emite-se uma revisão inicial (NCs abertas + plano de
-- ação) e revisões seguintes conforme os planos vão sendo executados (corrigem-se
-- primeiro as NCs de maior risco, depois as menores). Entre revisões muda APENAS
-- o estado dos planos de ação; o resto (máquinas, NCs, apreciação de risco) é fixo
-- da inspeção. Cada revisão gera seu próprio PDF (o artefato legal congelado).
--
-- Antes: reports 1:1 com a inspeção. Agora: 1:N, identificado por (inspection, version).
-- O número do laudo (report_number) se mantém entre revisões; muda só a version.
--

alter table public.reports
  add column version integer not null default 1,
  add column revision_reason text;

comment on column public.reports.version is
  'Número da revisão do laudo (1 = emissão inicial). O laudo evolui conforme os planos de ação são executados.';
comment on column public.reports.revision_reason is
  'Motivo desta revisão (ex: conclusão dos planos de maior risco, modificação da máquina, acidente). Nulo na emissão inicial.';

-- A unicidade deixa de ser por inspeção e passa a ser por (inspeção, revisão).
alter table public.reports drop constraint uq_reports_inspection;
alter table public.reports add constraint uq_reports_inspection_version unique (inspection_id, version);

-- O número do laudo se repete entre revisões; único por (conta, número, revisão).
alter table public.reports drop constraint uq_reports_account_number;
alter table public.reports add constraint uq_reports_account_number_version unique (account_id, report_number, version);
