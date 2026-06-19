# Modelo de Dados — Conceitual e Lógico

## Modelo conceitual (ERD)

```mermaid
erDiagram
    ACCOUNTS ||--o{ ACCOUNT_MEMBERS : "tem"
    ACCOUNTS ||--o{ CLIENTS : "gerencia"
    CLIENTS ||--o{ MACHINES : "possui"
    MACHINES ||--o{ INSPECTIONS : "tem historico de"
    INSPECTIONS ||--o{ NON_CONFORMITIES : "encontra"
    NON_CONFORMITIES ||--o| ACTION_PLANS : "gera"
    RISK_MATRIX_RULES }o--|| NON_CONFORMITIES : "classifica"

    ACCOUNTS {
        uuid id PK
        text name
        int default_validity_months
        timestamptz created_at
    }
    ACCOUNT_MEMBERS {
        uuid id PK
        uuid account_id FK
        uuid user_id FK "auth.users"
        text role
    }
    CLIENTS {
        uuid id PK
        uuid account_id FK
        text name
        text cnpj
        timestamptz deleted_at
    }
    MACHINES {
        uuid id PK
        uuid account_id FK
        uuid client_id FK
        text tag
        text manufacturer
        timestamptz deleted_at
    }
    INSPECTIONS {
        uuid id PK
        uuid account_id FK
        uuid machine_id FK
        text status
        date inspection_date
        date valid_until
        jsonb raw_whatsapp_payload
        text ai_generated_text
        text final_report_text
        timestamptz deleted_at
    }
    NON_CONFORMITIES {
        uuid id PK
        uuid account_id FK
        uuid inspection_id FK
        text description
        text probability
        text severity
        text risk_level
    }
    ACTION_PLANS {
        uuid id PK
        uuid account_id FK
        uuid non_conformity_id FK
        text description
        text responsible_name
        date due_date
    }
    RISK_MATRIX_RULES {
        text probability PK
        text severity PK
        text risk_level
    }
```

## Entidades — descrição conceitual

| Entidade | Descrição | Pertence a um tenant? |
|---|---|---|
| `accounts` | Uma conta = um tenant = uma consultoria/engenheiro assinante do produto. | É o próprio tenant |
| `account_members` | Usuários (Supabase Auth) vinculados a uma conta. v1: todo membro é `owner`. | Sim |
| `clients` | Empresa cliente da consultoria, dona das máquinas inspecionadas. | Sim |
| `machines` | Máquina/equipamento de um cliente, sujeita a inspeção NR-12. | Sim |
| `inspections` | Uma inspeção realizada numa máquina, com ciclo de vida próprio. | Sim |
| `non_conformities` | Item de não-conformidade encontrado numa inspeção. | Sim |
| `action_plans` | Ação corretiva simples associada a uma não-conformidade. | Sim |
| `risk_matrix_rules` | Tabela de referência global (não tenant-scoped) que mapeia Probabilidade x Severidade → Nível de Risco. | Não — é dado de referência compartilhado |

## Por que `account_id` aparece em quase toda tabela

Ver [ADR 0002](../adr/0002-postgres-supabase-multi-tenant-rls.md): é deliberado.
Mesmo `non_conformities` e `action_plans`, que poderiam derivar o tenant
via join (`non_conformity → inspection → machine → client → account`),
carregam `account_id` diretamente. Isso existe **só** para que as
políticas de RLS sejam uma comparação direta, não uma cadeia de joins.

## Ciclo de vida de `inspections.status`

```
rascunho ──────▶ em_revisao ──────▶ finalizado
   ▲                                    
   │                                    
(criado pelo n8n a partir              (estado terminal — qualquer
 do payload do WhatsApp)                correção gera observação nova,
                                         não reabre o registro)
```

`vencido` **não é um estado armazenado** — é derivado em tempo de
consulta comparando `valid_until` com a data atual (ex: numa view ou
no filtro do dashboard). Isso evita um job/cron que precisaria
"andar" pelas linhas só para mudar um status; a "vencida-ice" é uma
função do tempo, não um evento que aconteceu na inspeção.
