# -*- coding: utf-8 -*-
"""Gera o PDF consolidado do modelo de dados NR-12 SaaS — visão geral,
fases, entidades por camada, decisões tomadas e decisões em aberto.
Estilo alinhado aos outros PDFs do projeto (reportlab, A4, azul)."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, ListFlowable, ListItem
)

OUT = r"C:\Users\Sandro\Desktop\Claude\nr12-saas\docs\modelo-consolidado.pdf"
NAVY = colors.HexColor("#163B5C")
BLUE = colors.HexColor("#3AA0CC")
LIGHT = colors.HexColor("#EEF5F9")
GREY = colors.HexColor("#555555")

S = {
    "title": ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=23,
                             leading=27, textColor=NAVY, alignment=TA_CENTER),
    "sub": ParagraphStyle("s", fontName="Helvetica-Oblique", fontSize=12,
                          leading=16, textColor=GREY, alignment=TA_CENTER),
    "meta": ParagraphStyle("m", fontName="Helvetica", fontSize=9.5,
                           leading=13, textColor=GREY, alignment=TA_CENTER),
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=15,
                         leading=19, textColor=NAVY, spaceBefore=6, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11.5,
                         leading=15, textColor=NAVY, spaceBefore=8, spaceAfter=3),
    "body": ParagraphStyle("b", fontName="Helvetica", fontSize=10, leading=14.5,
                           textColor=colors.black, alignment=TA_LEFT, spaceAfter=5),
    "bul": ParagraphStyle("bul", fontName="Helvetica", fontSize=10, leading=14,
                          textColor=colors.black, leftIndent=2),
    "ch": ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, leading=12,
                         textColor=colors.white),
    "cell": ParagraphStyle("c", fontName="Helvetica", fontSize=9, leading=12.5,
                           textColor=colors.black),
    "foot": ParagraphStyle("f", fontName="Helvetica-Oblique", fontSize=8.5,
                           leading=11, textColor=GREY, alignment=TA_CENTER),
}


def P(t, s="body"):
    return Paragraph(t, S[s])


def hr():
    return HRFlowable(width="100%", thickness=0.8, color=BLUE,
                      spaceBefore=2, spaceAfter=10)


def tbl(headers, rows, widths):
    data = [[P(h, "ch") for h in headers]]
    for r in rows:
        data.append([P(c, "cell") for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD8E0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def bullets(items, start="•"):
    return ListFlowable([ListItem(P(i, "bul")) for i in items],
                        bulletType="bullet", start=start, leftIndent=14,
                        bulletFontSize=9)


story = []

# ---- capa ----
story.append(Spacer(1, 4.5 * cm))
story.append(P("Modelo de Dados — Consolidado", "title"))
story.append(P("NR-12 SaaS — inspeção, laudo, marketplace e inteligência", "sub"))
story.append(Spacer(1, 0.8 * cm))
story.append(P("Documento de leitura. O schema completo (todas as colunas) "
               "está em <b>docs/database/schema.dbml</b> — cole no "
               "dbdiagram.io para visualizar.", "meta"))
story.append(P("Fase atual: modelagem (entidades + propriedades). "
               "Identificadores em inglês; conteúdo em português.", "meta"))
story.append(PageBreak())

# ---- visão ----
story.append(P("1. Visão do produto", "h1"))
story.append(hr())
story.append(P("SaaS para gestão de inspeções de máquinas conforme a NR-12, "
               "com laudo assistido por IA e coleta de campo via WhatsApp. "
               "Multi-tenant (isolamento por <i>account_id</i> + RLS no "
               "Postgres/Supabase). Construído em marcos que também funcionam "
               "como gigs no Fiverr.", "body"))
story.append(P("2. As três frentes", "h2"))
story.append(tbl(
    ["Frente", "O que é", "Quando"],
    [["Fase 1 — Entrega", "O engenheiro faz inspeções, gera laudos, "
      "dashboard. É o que estamos modelando a fundo.", "Agora (v1)"],
     ["Fase 2 — Marketplace", "Empresas publicam anúncios; engenheiros dão "
      "propostas; contratação produz a entrega. Dois lados.", "Expansão"],
     ["Fase 2 — Inteligência", "Foguinhos de frequência + base de "
      "conhecimento (embeddings) com sugestões de correção.", "Expansão"]],
    [3.2 * cm, 9.3 * cm, 3.5 * cm]))
story.append(Spacer(1, 6))
story.append(P("As entidades de Fase 2 já entram no modelo (marcadas) para não "
               "precisar de migração disruptiva depois; só não são construídas "
               "no v1. Ganchos baratos já incluídos: <i>accounts.type</i>, "
               "<i>clients.linked_account_id</i>, <i>data_sharing_consent</i>.", "body"))
story.append(PageBreak())

# ---- camadas / entidades ----
story.append(P("3. Entidades por camada", "h1"))
story.append(hr())

story.append(P("Camada de referência (global — sem account_id, sem RLS de tenant)", "h2"))
story.append(bullets([
    "<b>standards</b> — a norma (NR-12, NR-10…).",
    "<b>standard_versions</b> — a redação consolidada estruturada (imutável após publicada), com a portaria de origem (nº, órgão, D.O.U.) embutida.",
    "<b>standard_sections</b> — módulo/anexo (12.1, Anexo I).",
    "<b>standard_items</b> — a cláusula (12.1.1), com sub-itens aninhados.",
    "<b>machine_types</b> → <b>machine_models</b> — hierarquia: tipo (torno) → modelo (Siemens 5123).",
    "<b>location_types</b> — categoria de local (oficina, cozinha…).",
    "<b>risk_matrix_rules</b> — matriz Probabilidade × Severidade → nível (como dado).",
]))

story.append(P("Checklist (templates — tenant)", "h2"))
story.append(bullets([
    "<b>checklist_templates</b> — molde nomeado, agnóstico de máquina, sobre uma versão da norma.",
    "<b>checklist_template_versions</b> — versão imutável (uma seleção publicada).",
    "<b>checklist_template_items</b> — a seleção: quais itens da norma entram.",
]))

story.append(P("Cadastro (tenant)", "h2"))
story.append(bullets([
    "<b>accounts</b> — o tenant (engenheiro; e empresa na Fase 2). <b>account_members</b> — usuários.",
    "<b>clients</b> — empresa inspecionada (real ou simbólica).",
    "<b>locations</b> — local de inspeção, filho do cliente, contém as máquinas.",
    "<b>machines</b> — a unidade física (model + location + nº série + ano).",
    "<b>professionals</b> — responsável técnico (CREA). <b>arts</b> — a ART.",
]))

story.append(P("Transacional (tenant)", "h2"))
story.append(bullets([
    "<b>inspections</b> — o serviço do engenheiro (1..N máquinas).",
    "<b>inspection_scope</b> — as máquinas no escopo do serviço.",
    "<b>checklists</b> — a instância por máquina (liga-se ao template pelas answers).",
    "<b>answers</b> — resposta por item (conforme / não / N-A + justificativa + risco).",
    "<b>answer_photos</b> — até 3 fotos por não-conformidade.",
    "<b>reports</b> — o laudo (co-propriedade empresa + engenheiro).",
    "<b>action_plans</b> — ação corretiva ligada a uma resposta não-conforme.",
]))

story.append(P("Fase 2", "h2"))
story.append(bullets([
    "Marketplace: <b>listings</b> (anúncio), <b>proposals</b> (proposta), <b>engagements</b> (contratação).",
    "Inteligência: <b>knowledge_entries</b> (base anonimizada + embeddings), "
    "<b>frequency_aggregates</b> (foguinhos), <b>suggestion_events</b> (feedback).",
]))
story.append(PageBreak())

# ---- decisões tomadas ----
story.append(P("4. Decisões já tomadas", "h1"))
story.append(hr())
story.append(bullets([
    "<b>Multi-tenant via RLS</b> com <i>account_id</i> denormalizado em toda tabela tenant (políticas sem join).",
    "<b>Norma versionada e imutável</b>; portarias/D.O.U. modeladas à parte (rastreabilidade legal).",
    "<b>Checklist = template (molde) + instância</b> (padrão classe/objeto). Template é <b>agnóstico de máquina</b>.",
    "<b>Checklist (instância) referencia inspection_scope</b>, não a inspeção; e liga-se ao conteúdo do template "
    "pelos <b>itens filhos</b> (via answers), não pela versão — mantendo o congelamento (itens imutáveis).",
    "<b>Inspeção = serviço</b> de um engenheiro, escopo de 1..N máquinas.",
    "<b>Não-conformidade não é entidade</b> — é uma answer com status não-conforme (+ risco, fotos, ação).",
    "<b>Matriz de risco como dado</b>; severidade por Probabilidade × Severidade.",
    "<b>Hierarquia de máquina em 3 níveis</b>: tipo → modelo → unidade (habilita análise por granularidade).",
    "<b>Validade do laudo</b> por máquina (no checklist), prazo configurável por conta.",
    "<b>Laudo precisa de empresa + engenheiro</b> (ART) — co-propriedade obrigatória.",
    "<b>Foguinhos</b> com gate de amostra mínima + estimativa de Wilson + recência; <b>k-anonimato</b> na base global.",
    "<b>Sugestões da IA</b>: sugerir, nunca aplicar; engenheiro aceita (responsabilidade técnica).",
    "<b>Stripe/pagamentos</b> adiados; <b>marketplace</b> é Fase 2 com ganchos já no modelo.",
]))
story.append(PageBreak())

# ---- decisões em aberto ----
story.append(P("5. Decisões ainda em aberto", "h1"))
story.append(hr())
story.append(tbl(
    ["Tema", "Pergunta"],
    [["Catálogo de modelos", "machine_models é global (plataforma) ou por tenant?"],
     ["Laudo × inspeção", "reports é 1:1 com a inspeção (serviço) ou consolida várias?"],
     ["ART", "1 ART por laudo, ou 1 ART cobre várias inspeções/máquinas?"],
     ["Eficácia / reinspeção", "nova inspeção ligada à anterior, ou registro de verificação no plano de ação?"],
     ["Consentimento", "no nível da conta ou do cliente? (impacta LGPD)"],
     ["Foguinhos", "valor do N mínimo (amostra) e do k-anonimato; janela de recência (12/24/36 meses)"],
     ["Contato do cliente", "campos em clients (atual) ou entidade client_contacts separada"],
     ["Conta", "precisa de desativação (is_active / soft delete)?"]],
    [4.0 * cm, 12.0 * cm]))
story.append(Spacer(1, 10))
story.append(P("Próximo passo sugerido: confirmar as propriedades do cadastro "
               "(contas, clientes, locais) e da hierarquia de máquina, depois "
               "Pessoas/ART, e então o bloco transacional fecha sem referência "
               "solta.", "body"))
story.append(Spacer(1, 1.2 * cm))
story.append(P("NR-12 SaaS — modelo consolidado · gerado na fase de modelagem", "foot"))


def build():
    doc = SimpleDocTemplate(OUT, pagesize=A4,
                            leftMargin=2.2 * cm, rightMargin=2.2 * cm,
                            topMargin=2.2 * cm, bottomMargin=2.0 * cm,
                            title="NR-12 SaaS - Modelo Consolidado",
                            author="Sandro Abreu")
    doc.build(story)
    print("PDF:", OUT)


if __name__ == "__main__":
    build()
