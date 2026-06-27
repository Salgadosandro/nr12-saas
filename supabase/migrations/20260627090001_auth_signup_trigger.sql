--
-- Migration 0002 — trigger de signup no Auth
--
-- Quando um usuário se cadastra (insert em auth.users), cria automaticamente
-- o registro em public.profiles. A FUNÇÃO public.handle_new_user() é criada na
-- migration 0001 (está no schema public, então o pg_dump a capturou); o TRIGGER
-- mora em auth.users (schema auth), fora do dump de public — por isso é
-- versionado aqui, à parte.
--
-- Depende de: 0001 (função public.handle_new_user + tabela public.profiles).
--

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
