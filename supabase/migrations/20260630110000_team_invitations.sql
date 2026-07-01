--
-- Migration 0013 — Equipe: convite de inspetores
--
-- Permite que o dono da conta convide inspetores para usar o app mobile.
-- Fluxo: owner cria convite → Supabase envia email com magic link →
--        inspetor aceita → handle_new_user detecta convite pendente →
--        inspetor é vinculado à conta do dono automaticamente.
--

-- 1. Adicionar email aos profiles (necessário para mostrar email no painel de equipe)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Preenche com o email dos usuários existentes via auth.users (SECURITY DEFINER)
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE u.id = p.id AND p.email IS NULL;
EXCEPTION WHEN others THEN NULL;
END;
$$;

-- 2. Relaxar o check de role para aceitar 'inspector'
ALTER TABLE public.account_members
  DROP CONSTRAINT IF EXISTS account_members_role_check;

ALTER TABLE public.account_members
  ADD CONSTRAINT account_members_role_check
  CHECK (role IN ('owner', 'inspector'));

-- 3. Tabela de convites
CREATE TABLE IF NOT EXISTS public.account_invitations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  email         text NOT NULL,
  invited_by    uuid NOT NULL REFERENCES auth.users(id),
  token         uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  created_at    timestamptz DEFAULT now() NOT NULL,
  expires_at    timestamptz DEFAULT now() + interval '7 days' NOT NULL,
  accepted_at   timestamptz,
  UNIQUE (account_id, email)
);

CREATE INDEX account_invitations_email_idx ON public.account_invitations (email);
CREATE INDEX account_invitations_account_id_idx ON public.account_invitations (account_id);

-- 4. RLS em account_invitations
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members of account can view invites" ON public.account_invitations
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT public.current_account_ids()));

CREATE POLICY "members of account can insert invites" ON public.account_invitations
  FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT public.current_account_ids()));

CREATE POLICY "members of account can delete invites" ON public.account_invitations
  FOR DELETE TO authenticated
  USING (account_id IN (SELECT public.current_account_ids()));

-- 5. Atualizar handle_new_user para detectar convite pendente por email
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  pending account_invitations%ROWTYPE;
BEGIN
  -- Cria o perfil (sempre)
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Verifica se há um convite pendente para este email
  SELECT * INTO pending
  FROM account_invitations
  WHERE email = new.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Vincula o inspetor à conta do dono (ignora se já existe)
    INSERT INTO account_members (account_id, user_id, role)
    VALUES (pending.account_id, new.id, 'inspector')
    ON CONFLICT (user_id) DO NOTHING;

    -- Marca o convite como aceito
    UPDATE account_invitations
    SET accepted_at = now()
    WHERE id = pending.id;
  END IF;

  RETURN new;
END;
$$;
