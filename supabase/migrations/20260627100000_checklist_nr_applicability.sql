--
-- Migration 0003 — gate de aplicabilidade da NR-12 por máquina
--
-- Antes do checklist de conformidade, o engenheiro avalia se a NR-12 se aplica
-- à máquina (NR-12 itens 12.1.3 / 12.1.4: exportação, tração humana/animal,
-- exposição em museu/feira, eletrodoméstico, equipamento estático, ferramenta
-- portátil tipo-C, máquina certificada pelo INMETRO). Se a norma NÃO se aplica,
-- a máquina é excluída logo no início e o checklist de conformidade não é
-- preenchido.
--
-- Isto é um resultado no nível da MÁQUINA-na-inspeção (tabela `checklists`),
-- distinto de `answers.status = 'not_applicable'` (um item específico não cabe,
-- mas a norma se aplica à máquina).
--
-- Alimenta o Anexo 2 do laudo: "máquinas onde a NR-12 não se aplica" =
-- checklists com nr_applies = false.
--

alter table public.checklists
  add column nr_applies boolean not null default true,
  add column exclusion_code varchar,
  add column exclusion_notes text;

comment on column public.checklists.nr_applies is
  'A NR-12 se aplica a esta máquina? Se false, foi excluída (12.1.3/12.1.4) e o checklist de conformidade não é aplicado.';
comment on column public.checklists.exclusion_code is
  'Código do item da norma que isenta a máquina (ex: 12.1.4.c), quando nr_applies = false. Texto livre para rastreio direto na norma.';
comment on column public.checklists.exclusion_notes is
  'Comprovação da exclusão (ex: nº do certificado INMETRO, prova de exportação).';

-- Consistência: se a norma não se aplica, o código de exclusão é obrigatório;
-- se se aplica, os campos de exclusão ficam nulos.
alter table public.checklists
  add constraint chk_checklists_exclusion check (
    (nr_applies = true  and exclusion_code is null)
    or
    (nr_applies = false and exclusion_code is not null)
  );
