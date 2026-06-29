--
-- Migration 0008 — foguinho (risco do item por Wilson) + problemas típicos
--
-- (1) nc_item_foguinho: quão problemático é um item da norma. Taxa de NC =
--     k/n (k = respostas non_compliant, n = respostas totais do item). Em vez da
--     taxa crua (que mente em amostra pequena: "1 de 1 = 100%"), usa o LIMITE
--     INFERIOR de Wilson (95%): puxa o número pra baixo quando há pouca evidência
--     e o deixa subir conforme a base cresce. Mapeado em 5 foguinhos (faixas 0,2).
--     z = 1,96 -> z² = 3,8416.
--
-- (2) nc_common_problems: problemas típicos já encontrados naquele item (da base
--     de conhecimento), para sugerir o que verificar/marcar. Ordenado por frequência.
--
-- Ambas SECURITY INVOKER (default) -> respeitam o RLS (só a conta do chamador).
--

create or replace function public.nc_item_foguinho(
  p_standard_item_id uuid,
  p_machine_type_id  uuid default null
)
returns table (n bigint, k bigint, rate numeric, wilson_lb numeric, flames int)
language sql
stable
as $$
  with base as (
    select a.status
    from public.answers a
    join public.checklist_template_items cti on cti.id = a.checklist_template_item_id
    join public.checklists c on c.id = a.checklist_id
    left join public.machines mac on mac.id = c.machine_id
    left join public.machine_models mdl on mdl.id = mac.machine_model_id
    where cti.standard_item_id = p_standard_item_id
      and (p_machine_type_id is null or mdl.machine_type_id = p_machine_type_id)
  ),
  agg as (
    select count(*)::numeric as n,
           count(*) filter (where status = 'non_compliant')::numeric as k
    from base
  ),
  wilson as (
    select n, k,
      case when n = 0 then 0 else k / n end as p,
      case when n = 0 then 0
        else ( (k/n) + 3.8416/(2*n)
                - 1.96 * sqrt( ((k/n)*(1-(k/n)))/n + 3.8416/(4*n*n) )
              ) / (1 + 3.8416/n)
      end as lb
    from agg
  )
  select
    n::bigint, k::bigint,
    round(p, 3)  as rate,
    round(lb, 3) as wilson_lb,
    case when n = 0   then 0
         when lb < 0.2 then 1
         when lb < 0.4 then 2
         when lb < 0.6 then 3
         when lb < 0.8 then 4
         else 5
    end as flames
  from wilson;
$$;

create or replace function public.nc_common_problems(
  p_standard_item_id uuid,
  p_machine_type_id  uuid default null,
  p_limit            int  default 5
)
returns table (problem_text text, vezes bigint, risco_comum text)
language sql
stable
as $$
  select
    k.problem_text,
    count(*) as vezes,
    mode() within group (order by k.risk_level) as risco_comum
  from public.knowledge_entries k
  where k.standard_item_id = p_standard_item_id
    and (p_machine_type_id is null or k.machine_type_id = p_machine_type_id)
  group by k.problem_text
  order by vezes desc
  limit p_limit;
$$;
