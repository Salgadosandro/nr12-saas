--
-- Seed dos planos (ADR 0008). Valores em centavos, BRL. Ajustáveis sem deploy.
-- Os dois modelos são ALTERNATIVOS (o cliente escolhe um).
-- Checkout monta o preço inline (price_data), então stripe_price_id fica nulo.
--
insert into public.plans (code, name, type, amount_cents, currency, interval) values
  ('sub_anual',   'Assinatura anual',     'subscription', 100000, 'brl', 'year'),   -- R$ 1.000,00/ano
  ('por_maquina', 'Avulso por máquina',   'per_machine',    1500, 'brl', null)      -- R$ 15,00/máquina
on conflict (code) do update
  set name = excluded.name,
      type = excluded.type,
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      interval = excluded.interval;
