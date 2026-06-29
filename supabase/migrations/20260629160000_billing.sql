--
-- Migration 0010 — billing (Stripe): plans, subscriptions, report_payments
--
-- Entitlement (direito ao PDF final): assinatura ativa OU pagamento avulso pago.
-- Ver ADR 0008. Valores em centavos (unidade mínima do Stripe).
--

-- catálogo do produto (global, leitura aberta) — valores são dado configurável
create table public.plans (
  id              uuid primary key default gen_random_uuid(),
  code            varchar not null unique,                 -- ex.: 'sub_anual', 'por_maquina'
  name            varchar not null,
  type            varchar not null check (type in ('subscription', 'per_machine')),
  amount_cents    integer not null,                        -- recorrência (sub) ou preço/máquina
  currency        varchar not null default 'brl',
  interval        varchar check (interval in ('month', 'year')),   -- só p/ subscription
  stripe_price_id varchar,                                 -- Price do Stripe (subscription)
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.plans enable row level security;
create policy plans_read on public.plans for select to authenticated using (true);

-- assinatura da conta (vínculo ao Stripe)
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  account_id             uuid not null default public.current_account_id()
                           references public.accounts(id) on delete cascade,
  plan_id                uuid references public.plans(id),
  stripe_customer_id     varchar,
  stripe_subscription_id varchar unique,
  status                 varchar not null default 'incomplete',  -- active|past_due|canceled|incomplete
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index subscriptions_account_idx on public.subscriptions (account_id);
alter table public.subscriptions enable row level security;
create policy own_account on public.subscriptions
  using (account_id in (select public.current_account_ids()))
  with check (account_id in (select public.current_account_ids()));

-- cobrança avulsa de um laudo (pay-to-unlock por máquina)
create table public.report_payments (
  id                         uuid primary key default gen_random_uuid(),
  account_id                 uuid not null default public.current_account_id()
                               references public.accounts(id) on delete cascade,
  report_id                  uuid not null references public.reports(id) on delete cascade,
  machine_count              integer not null,
  unit_amount_cents          integer not null,             -- snapshot do preço/máquina
  total_amount_cents         integer not null,
  currency                   varchar not null default 'brl',
  stripe_checkout_session_id varchar unique,
  stripe_payment_intent_id   varchar,
  status                     varchar not null default 'pending',  -- pending|paid|expired
  paid_at                    timestamptz,
  created_at                 timestamptz not null default now()
);

create index report_payments_account_idx on public.report_payments (account_id);
create index report_payments_report_idx on public.report_payments (report_id);
alter table public.report_payments enable row level security;
create policy own_account on public.report_payments
  using (account_id in (select public.current_account_ids()))
  with check (account_id in (select public.current_account_ids()));
