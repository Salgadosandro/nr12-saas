--
-- Migration 0007 — sugestão de notas (decision support) + correção de RLS em view
--
-- (1) Conserta a knowledge_stats_by_item: sem security_invoker, uma view roda como
--     o DONO e IGNORA o RLS das tabelas de baixo (somaria todos os tenants). Com
--     security_invoker = on ela roda como QUEM CONSULTA, e o RLS volta a valer.
--
-- (2) Função nc_rating_suggestion: distribuição histórica das notas (probability /
--     severity) para um item da norma (e, opcionalmente, um tipo de máquina). Serve
--     de REFERÊNCIA pro engenheiro no campo — ele continua decidendo. Lê de answers,
--     então só enxerga as NCs da conta do chamador (função é SECURITY INVOKER).
--

alter view public.knowledge_stats_by_item set (security_invoker = on);

create or replace function public.nc_rating_suggestion(
  p_standard_item_id uuid,
  p_machine_type_id  uuid default null
)
returns table (dimension text, value text, n bigint, pct numeric)
language sql
stable
as $$
  with base as (
    select a.probability, a.severity
    from public.answers a
    join public.checklist_template_items cti on cti.id = a.checklist_template_item_id
    join public.checklists c on c.id = a.checklist_id
    left join public.machines mac on mac.id = c.machine_id
    left join public.machine_models mdl on mdl.id = mac.machine_model_id
    where a.status = 'non_compliant'
      and cti.standard_item_id = p_standard_item_id
      and (p_machine_type_id is null or mdl.machine_type_id = p_machine_type_id)
  ),
  contagem as (
    select 'probability' as dimension, probability as value, count(*) as n
    from base group by probability
    union all
    select 'severity' as dimension, severity as value, count(*) as n
    from base group by severity
  )
  select dimension, value, n,
         round(100.0 * n / sum(n) over (partition by dimension), 0) as pct
  from contagem
  where value is not null
  order by dimension, n desc;
$$;
