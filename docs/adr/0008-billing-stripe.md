# 0008 - Billing: assinatura OU pagamento por máquina (Stripe)

- **Status:** Aceito
- **Data:** 2026-06-29

## Contexto

O produto precisa monetizar a emissão de laudos. Duas formas de cobrança,
escolhidas como **alternativas** (o cliente opta por uma):

1. **Assinatura recorrente** — acesso à plataforma; emite laudos à vontade.
2. **Por máquina (avulso)** — o engenheiro faz a inspeção inteira, vê a prévia
   (o dossiê na tela) e, quando satisfeito, paga `nº de máquinas × preço` para
   **liberar o PDF final** (try-before-buy / pay-to-unlock).

Moeda: **BRL** (mercado brasileiro). Gateway: **Stripe** (test mode no desenvolvimento).

## Decisão

O direito a emitir o PDF final de um laudo é um **entitlement**, satisfeito por
**um de dois caminhos**:

- a conta tem uma **assinatura ativa** (`subscriptions.status = 'active'`), ou
- existe um **pagamento avulso pago** para aquele laudo (`report_payments.status = 'paid'`).

Modelado em 3 tabelas:

- `plans` — catálogo do produto (global, leitura aberta): `type`
  (`subscription` | `per_machine`), `amount_cents`, `currency`, `interval`,
  `stripe_price_id`. Valores são **dado configurável**, não chumbados em código.
- `subscriptions` — vínculo da conta ao Stripe (customer/subscription/status/
  período). RLS por conta.
- `report_payments` — cobrança avulsa de um laudo: `report_id`, `machine_count`,
  `unit_amount_cents` (snapshot do preço no momento), `total_amount_cents`,
  `stripe_checkout_session_id`, `status`. RLS por conta.

Fluxo (Stripe Checkout):
- `POST /billing/subscribe` → Checkout `mode=subscription` (usa `stripe_price_id`).
- `POST /reports/{id}/checkout` → Checkout `mode=payment`, valor inline
  `machine_count × unit_amount` (não precisa de Price pré-criado).
- `POST /billing/webhook` → fonte da verdade: em `checkout.session.completed`
  ativa a assinatura **ou** marca o `report_payment` como `paid`.
- `POST /reports/{id}/pdf` checa o entitlement; sem direito → **402 Payment Required**.

Valores em **centavos** (`amount_cents int`) — evita erro de ponto flutuante e
casa com a unidade mínima do Stripe.

## Consequências

- (+) Dois modelos sem complicar: o entitlement unifica a checagem (assinatura
  OU pagamento do laudo).
- (+) Preços ajustáveis por dado (sem deploy); snapshot do preço no pagamento
  preserva o histórico (mesmo princípio do ADR 0003/0007).
- (+) Webhook como fonte da verdade: o estado de pagamento não depende do retorno
  do navegador (que pode falhar), e sim do evento assinado do Stripe.
- (-) Exige o **Stripe CLI** (ou endpoint público) para testar o webhook local.
- (-) Prévia = dossiê na tela; um PDF "AMOSTRA" com marca d'água fica para depois.
- (-) Assinatura com **compromisso anual** (12 meses travados) não está no MVP —
  começa como recorrência simples; subscription schedules entram se necessário.
