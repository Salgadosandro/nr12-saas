"""Geração do rascunho do parecer (corpo do laudo) via Claude.

Recebe o dossiê montado e devolve o texto do parecer. A IA escreve só a
narrativa do corpo — os anexos são renderizados à parte, a partir do dado.
"""
import anthropic
from fastapi import HTTPException

from ..config import settings

MODEL = "claude-opus-4-8"

SYSTEM = """Você é engenheiro(a) de segurança do trabalho, especialista na NR-12 \
(Segurança no Trabalho em Máquinas e Equipamentos).

Sua tarefa: redigir APENAS o texto do CORPO do laudo técnico (o parecer), em \
português técnico, claro e objetivo, a partir dos dados estruturados da inspeção.

Estruture em parágrafos cobrindo, nesta ordem:
1. A importância de verificar a adequação de máquinas e equipamentos à NR-12.
2. Uma descrição sucinta do processo de inspeção realizado.
3. A análise consolidada dos resultados (total de máquinas, conformes, casos em \
que a norma não se aplica e número de não-conformidades).
4. A análise de cada não-conformidade: a máquina, o item da norma infringido, o \
risco associado e a ação corretiva recomendada.

Regras estritas:
- Baseie-se EXCLUSIVAMENTE nos dados fornecidos. Não invente máquinas, números, \
itens da norma nem datas.
- Não gere tabelas nem reproduza os anexos (são produzidos à parte).
- Não use marcadores de preenchimento (placeholders) como [inserir...].
- Escreva como um parecer pronto para o engenheiro revisar e assinar."""


def _resumo_dossie(dossier: dict) -> str:
    company = (dossier.get("company") or {}).get("name")
    eng = dossier.get("engineer") or {}
    dash = dossier.get("anexo2_dashboard") or {}
    ncs = dossier.get("anexo3_nonconformities") or []

    linhas = [
        f"Empresa inspecionada: {company}",
    ]
    if eng:
        linhas.append(f"Engenheiro responsável: {eng.get('full_name')} (CREA {eng.get('crea')})")
    linhas += [
        f"Máquinas analisadas: {dash.get('machines_total')}",
        f"Conformes: {dash.get('machines_compliant')} | "
        f"NR-12 não se aplica: {dash.get('machines_not_applicable')} | "
        f"Não-conformidades: {dash.get('nonconformities')}",
        "",
        "Não-conformidades encontradas:",
    ]
    if not ncs:
        linhas.append("(nenhuma)")
    for i, nc in enumerate(ncs, 1):
        ap = nc.get("action_plan") or {}
        linhas.append(
            f"{i}. Máquina {nc.get('machine_tag')} — item {nc.get('norm_number')} "
            f"(risco {nc.get('risk_level')}).\n"
            f"   Constatação: {nc.get('justification')}\n"
            f"   Texto da norma: {nc.get('norm_text')}\n"
            f"   Ação recomendada: {ap.get('description')}"
        )
    return "\n".join(linhas)


def draft_parecer(dossier: dict) -> str:
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY não configurada no .env")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    resumo = _resumo_dossie(dossier)

    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=10000,
            thinking={"type": "adaptive"},
            system=SYSTEM,
            messages=[{
                "role": "user",
                "content": f"Dados da inspeção:\n\n{resumo}\n\nRedija o corpo do laudo.",
            }],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=500, detail="Chave da Anthropic inválida")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Erro na API da Anthropic: {e}")

    return "".join(b.text for b in resp.content if b.type == "text").strip()
