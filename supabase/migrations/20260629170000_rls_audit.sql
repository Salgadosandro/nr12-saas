--
-- Migration 0011 — auditoria de RLS (cobertura de segurança)
--
-- Função que lista tabelas BASE de `public` que estão SEM row-level security
-- ou SEM nenhuma política. O teste de segurança exige que ela volte VAZIA —
-- assim, se alguém criar uma tabela nova e esquecer o RLS, o pytest acusa.
--
-- SECURITY DEFINER para enxergar o catálogo; só expõe nomes de tabela (não dado).
--
create or replace function public.rls_audit()
returns table (table_name text, rls_enabled boolean, policy_count bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.relname::text, c.relrowsecurity, count(p.polname)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname, c.relrowsecurity
  having c.relrowsecurity = false or count(p.polname) = 0
  order by c.relname;
$$;
