# Blueprint — como reconstruir este projeto com lucidez

Este documento não descreve só **o que** existe (isso está em
[`ARCHITECTURE.md`](ARCHITECTURE.md) e nos [ADRs](adr/)); descreve **em que ordem**
e **com que método** o projeto foi construído — para que ele possa ser refeito de
forma deliberada, e para extrair as lições de engenharia e de trabalho com IA.

---

## Parte 1 — A ordem de construção (e o porquê de cada passo)

A regra que dita a ordem é **dependência**: cada camada só faz sentido depois da
que a sustenta. Construir fora de ordem gera retrabalho.

| # | Fase | Por que vem aqui |
|---|---|---|
| 0 | **Modelar o banco** (entidades → propriedades → docs) | Tudo depende do dado. Modelar primeiro evita reescrever API/telas depois. |
| 1 | **RLS + Auth + isolamento testado** | Multitenancy é fundação, não enfeite. Testar o isolamento **antes** de ter dados reais. |
| 2 | **Migrations versionadas** | Schema reproduzível do zero. "Funciona no meu banco" não basta. |
| 3 | **Backend do laudo** (o produto) | É o núcleo de valor. IA e billing constroem **em cima** dele. |
| 4 | **Camada de conhecimento (IA)** | Diferencial — mas depende dos dados que o laudo gera. |
| 5 | **Storage** (PDF/fotos) | Persistir o artefato. Depois do laudo existir. |
| 6 | **Billing (Stripe)** | Só faz sentido cobrar quando o produto funciona ponta a ponta. |
| 7 | **Testes** (RLS, integração, segurança) | Travam tudo que já existe antes de adicionar superfície. |
| 8 | **Frontend** (fundação → auth → CRUD → telas) | Consome a API pronta. Em fatias verticais. |
| 9 | **Ingestão de campo + deploy** | Alimenta a base em produção; publica. |

> Sequência declarada e marcada em [`backend-plan.md`](backend-plan.md).

---

## Parte 2 — Princípios de engenharia (os padrões que se repetem)

Estes são os "movimentos" que aparecem várias vezes. Reconhecê-los é o que torna
a reconstrução **lúcida**.

1. **Valor derivado não se guarda — se calcula.**
   - `risk_level` sai da matriz (lookup), não é digitado.
   - Estatística sai de `GROUP BY`/views, não de colunas contador (que dessincronizam).
   - *Exceção consciente:* derivado **congelado** (snapshot) quando precisa refletir
     o passado — o `risk_level` gravado no laudo, o texto em `knowledge_entries`.

2. **Snapshot vs. referência viva.** Laudo, matriz e base de conhecimento guardam
   uma **cópia** do que valia no momento — editar a fonte depois não reescreve a
   história. ([ADR 0003](adr/0003-data-driven-risk-matrix.md), [0004](adr/0004-immutable-versioning-and-freeze.md), [0007](adr/0007-knowledge-layer-embeddings.md))

3. **Embedding ≠ texto.** O vetor acha; o texto mostra. Guardar os dois lado a
   lado. A IA escreve a partir do texto recuperado (RAG), nunca decodificando o vetor.

4. **Fronteira dado/fluxo.** CRUD → Supabase direto; lógica → FastAPI. Não duplicar.

5. **Segurança no servidor, nunca no cliente.** Preços vêm do banco; o cliente não
   adultera valor. O webhook é a fonte da verdade do pagamento (assinado), não o
   retorno do navegador.

6. **Honestidade estatística.** Wilson (foguinho) e amostra mínima (sugestão de
   notas) evitam "100% de 1 caso". Melhor dizer "amostra insuficiente" do que mentir.

7. **Multitenancy por padrão.** `account_id` + RLS em toda tabela; um teste de
   **cobertura** garante que nenhuma fica de fora.

8. **Generalizar onde o futuro pede.** O motor é multi-norma (`standards`), não
   "NR-12 hardcoded" — decisão tomada no início, que paga lá na frente.

---

## Parte 3 — Método de trabalho (engenharia de prompt / como dirigir a IA)

O que fez a construção fluir — replicável em qualquer projeto com um assistente.

1. **Docs-first / ADR antes do código.** Cada decisão de arquitetura virou um ADR
   curto (contexto → decisão → consequências) **antes** de implementar. Resultado:
   o "porquê" fica registrado e o código só executa a decisão.

2. **Modelar primeiro, propriedades depois.** Definir **todas** as entidades, só
   então as propriedades, só então o código. Evita "programar enquanto pensa".

3. **Decisões explícitas, não suposições.** Toda bifurcação real (tabela dedicada
   vs. coluna, Wilson vs. simples, Next vs. Vite, assinatura vs. avulso) foi
   **apresentada com prós/contras e decidida pelo dono** — não escolhida no escuro.

4. **Fatias verticais + verificação.** Cada passo entrega algo que **funciona** e
   é **verificado na hora** (teste pytest, screenshot do preview, `curl` no
   endpoint). Nada de "construir 10 telas e torcer".

5. **Ensinar o porquê.** A cada peça, a intuição por trás (analogias: notas
   fiscais para `count`, GPS para embeddings, carteirinha/tíquete para billing).
   Aprender o conceito, não decorar o código.

6. **Commits por marco + memória.** Um commit por unidade de valor, mensagem
   descritiva; o estado do projeto registrado para retomar sem perder contexto.

7. **Testar de verdade, relatar com honestidade.** "Testado" só depois de rodar.
   Quando um teste achou um bug (token inválido virava 500), corrigir e dizer.

---

## Parte 4 — Se eu começasse de novo (checklist)

1. Escrever o **propósito** e o **glossário do domínio** (NR-12: NC, ART, laudo…).
2. Modelar **todas as entidades** → propriedades → `schema.dbml` + dicionário.
3. ADRs das decisões estruturais (RLS, tenancy, versionamento, matriz de risco).
4. Migrations 0001+ ; habilitar RLS e **testar isolamento** com 2 contas.
5. Seeds: a **norma real** + matriz de risco + 1 tenant de demonstração.
6. API do laudo (revisão → draft IA → editar → PDF) ; testar cada endpoint.
7. Camada de conhecimento (pgvector + embeddings + RAG + Wilson) ; testar.
8. Storage (PDF) + billing (entitlement + webhook) ; testar o gate.
9. Suíte de testes: RLS (cobertura), integração, **segurança** (auth/webhook/storage).
10. Frontend em fatias: fundação → auth+shell → 1º CRUD → demais telas (verificar cada uma).
11. Ingestão de campo (mobile/n8n) + deploy + hardening de produção.

> Cada item acima já tem o "como" detalhado nos docs e ADrs referenciados. Este
> blueprint é o **mapa**; eles são o **território**.
