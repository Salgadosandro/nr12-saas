# Arquitetura do frontend (web)

Vite + React + TypeScript · Tailwind v4 · React Router · TanStack Query · react-i18next · Supabase.

> Regra de ouro (igual ao backend): **CRUD → Supabase direto** (PostgREST + RLS);
> **laudo / IA / billing → FastAPI** (via `lib/api.ts`, anexando o JWT).
> A UI é traduzida (PT/EN); o **conteúdo de domínio** (texto da NR-12, parecer da
> IA, nomes de clientes) permanece em português.

## Estrutura de pastas

```
src/
├─ main.tsx          # ENTRADA: providers (Query, Router, i18n)
├─ App.tsx           # define as ROTAS (URL → página)
├─ index.css         # Tailwind
│
├─ lib/              # INFRAESTRUTURA (sem React)
│  ├─ supabase.ts    #   cliente Supabase (CRUD + auth)
│  └─ api.ts         #   fetch p/ o FastAPI (anexa o JWT)
│
├─ i18n/             # INTERNACIONALIZAÇÃO
│  ├─ index.ts
│  └─ locales/ pt.json en.json
│
├─ auth/             # AUTENTICAÇÃO
│  ├─ AuthProvider.tsx   # contexto: o usuário logado
│  ├─ useAuth.ts         # hook p/ ler o usuário
│  └─ ProtectedRoute.tsx # trava: sem login → /login
│
├─ components/       # UI REUTILIZÁVEL e "burra" (sem regra de negócio)
│  ├─ ui/            #   Button, Input, Card, Table, Modal… (design system)
│  └─ layout/        #   AppLayout, Sidebar, Topbar, LanguageSwitcher
│
├─ features/         # A CARNE: um módulo do produto por pasta
│  ├─ clients/       #   api.ts · hooks.ts · ClientsPage.tsx · ClientForm.tsx · types.ts
│  ├─ inspections/
│  ├─ analysis/      #   análise das NCs (risco + plano de ação)
│  ├─ reports/       #   laudos
│  ├─ billing/
│  ├─ machines/
│  └─ dashboard/
│
├─ pages/            # páginas simples não-feature: Login, Signup, NotFound
└─ types/
   └─ database.ts    # tipos GERADOS do schema do Supabase (queries type-safe)
```

## Princípios

1. **`lib/` = encanamento.** Clientes/conexões. Nada de React; todos usam, ninguém duplica.
2. **`components/` = peças burras.** Um `<Button>` não conhece "laudo"; só sabe ser botão.
3. **`features/` = um módulo, uma pasta.** Tudo de Clientes vive em `features/clients/`. Escala sem virar espaguete.
4. **Dado ↔ tela separados.** Em cada feature: `api.ts` busca → `hooks.ts` (React Query) embrulha com cache/loading → a página só **exibe**.

## Crescimento incremental

As pastas **nascem conforme construímos** cada fatia — não criamos vazias.

- **Fase 0** ✅ fundação (Vite, Tailwind, i18n, Supabase, providers).
- **Fase 1** — `auth/`, `components/layout/`, `pages/Login` + `Signup` (auth + esqueleto).
- **Fase 2** — `features/clients/` (1º CRUD ponta a ponta).
- **Fase 3+** — inspections → analysis → reports → billing → dashboard → auxiliares.
