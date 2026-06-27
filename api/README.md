# API de Laudos NR-12 (FastAPI)

Camada de **lógica pesada** do laudo (IA + PDF + regras). Todo o CRUD vive no
Supabase (PostgREST + RLS) — esta API só faz o que o banco não faz.
Contrato: [`../docs/api/01-contract.md`](../docs/api/01-contract.md).

## Rodar localmente

```powershell
cd C:\Users\Sandro\Desktop\Claude\nr12-saas\api

# 1) ambiente virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2) dependências
pip install -r requirements.txt

# 3) variáveis de ambiente
copy .env.example .env
# edite o .env e preencha SUPABASE_ANON_KEY (Settings > API Keys no dashboard)

# 4) subir o servidor (reinicia ao salvar)
uvicorn app.main:app --reload
```

- Health check: http://127.0.0.1:8000/health
- Docs interativas (Swagger): http://127.0.0.1:8000/docs

## Estrutura

```
app/
  main.py            app FastAPI + CORS + rotas
  config.py          variáveis de ambiente (tipadas)
  supabase.py        cliente Supabase escopado ao usuário (RLS)
  auth.py            valida o JWT -> CurrentUser (via Depends)
  schemas.py         modelos Pydantic
  routers/reports.py os 5 endpoints do laudo
```
