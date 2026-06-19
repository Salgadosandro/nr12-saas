# -*- coding: utf-8 -*-
"""Gera o guia 'Database Design & Architecture' (metodologia + checklist +
passo a passo), pensado pra orientar futuras entregas/gigs deste tipo.
Mesma linha visual dos outros PDFs de gig do Sandro (reportlab, A4,
acento azul escuro/claro)."""

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

OUT_DIR = r"C:\Users\Sandro\Desktop\Claude\nr12-saas\banco-de-dados"
OUT_FILE = os.path.join(OUT_DIR, "guia-database-design-gig.pdf")

NAVY = colors.HexColor("#163B5C")
BLUE = colors.HexColor("#3AA0CC")
LIGHT_BG = colors.HexColor("#EEF5F9")
GREY = colors.HexColor("#555555")

styles = {
    "title": ParagraphStyle("Title", fontName="Helvetica-Bold", fontSize=24,
                             leading=28, textColor=NAVY, alignment=TA_CENTER),
    "subtitle": ParagraphStyle("Subtitle", fontName="Helvetica-Oblique",
                                fontSize=12.5, leading=17, textColor=GREY,
                                alignment=TA_CENTER, spaceAfter=4),
    "meta": ParagraphStyle("Meta", fontName="Helvetica", fontSize=9.5,
                            leading=13, textColor=GREY, alignment=TA_CENTER),
    "h1": ParagraphStyle("H1", fontName="Helvetica-Bold", fontSize=15,
                          leading=19, textColor=NAVY, spaceBefore=4,
                          spaceAfter=8),
    "h2": ParagraphStyle("H2", fontName="Helvetica-Bold", fontSize=11.5,
                          leading=15, textColor=NAVY, spaceBefore=10,
                          spaceAfter=4),
    "body": ParagraphStyle("Body", fontName="Helvetica", fontSize=10,
                            leading=14.5, textColor=colors.black,
                            alignment=TA_LEFT, spaceAfter=6),
    "bullet": ParagraphStyle("Bullet", fontName="Helvetica", fontSize=10,
                              leading=14, textColor=colors.black,
                              leftIndent=4),
    "cellhdr": ParagraphStyle("CellHdr", fontName="Helvetica-Bold",
                               fontSize=9, leading=12, textColor=colors.white),
    "cell": ParagraphStyle("Cell", fontName="Helvetica", fontSize=9,
                            leading=12.5, textColor=colors.black),
    "footer": ParagraphStyle("Footer", fontName="Helvetica-Oblique",
                              fontSize=8.5, leading=11, textColor=GREY,
                              alignment=TA_CENTER),
}


def p(text, style="body"):
    return Paragraph(text, styles[style])


def section_table(headers, rows, col_widths):
    data = [[p(h, "cellhdr") for h in headers]]
    for row in rows:
        data.append([p(c, "cell") for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD8E0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def hr():
    return HRFlowable(width="100%", thickness=0.8, color=BLUE,
                       spaceBefore=4, spaceAfter=12)


story = []

# ---------- Capa ----------
story.append(Spacer(1, 5 * cm))
story.append(p("Guia de Entrega", "title"))
story.append(p("Database Design &amp; Architecture", "title"))
story.append(Spacer(1, 0.5 * cm))
story.append(p(
    "Metodologia profissional para projetar e documentar bancos de dados — "
    "do levantamento de requisitos ao schema pronto para implementação",
    "subtitle"))
story.append(Spacer(1, 1.2 * cm))
story.append(p(
    "Baseado no Marco 1 do projeto <b>NR-12 SaaS</b> — use como referência "
    "para qualquer projeto/cliente futuro deste tipo de entrega.", "meta"))
story.append(p("Sandro Abreu — Engenharia de Dados &amp; Automação", "meta"))
story.append(PageBreak())

# ---------- Por que documentar antes de codar ----------
story.append(p("Por que documentar antes de codar", "h1"))
story.append(hr())
story.append(p(
    "Uma entrega de <b>Database Design</b> profissional não é só um arquivo "
    ".sql no final. É um pacote de documentos que prova, pro cliente e pra "
    "qualquer dev que entrar no projeto depois, que o schema foi "
    "<i>desenhado</i> — não improvisado. Esse é o diferencial que separa um "
    "freelancer comum de uma entrega de consultoria.", "body"))

beneficios = [
    "Menos retrabalho: decisões erradas custam muito mais caro depois que "
    "o schema já tem dado de produção em cima.",
    "Confiança do cliente: ele vê o raciocínio, não só o resultado.",
    "Vira ativo reutilizável: o mesmo pacote de documentos serve de "
    "template pro próximo projeto.",
    "Handoff sem dor: outro dev (ou você mesmo, 6 meses depois) entende o "
    "schema sem precisar perguntar nada.",
]
story.append(ListFlowable(
    [ListItem(p(b, "bullet")) for b in beneficios],
    bulletType="bullet", start="•", leftIndent=14, bulletFontSize=10,
))
story.append(Spacer(1, 8))

story.append(p(
    "Decisões técnicas não-óbvias (ex: \"por que multi-tenant via Row Level "
    "Security e não schema por cliente?\") ficam registradas em "
    "<b>ADRs (Architecture Decision Records)</b> — um arquivo curto por "
    "decisão, com contexto, decisão e consequências. Nunca se edita um ADR "
    "aceito: se a decisão muda, escreve-se um novo ADR que substitui o "
    "anterior.", "body"))
story.append(PageBreak())

# ---------- Pacote de documentação ----------
story.append(p("O Pacote de Documentação", "h1"))
story.append(hr())
story.append(p(
    "Estes são os documentos que toda entrega de Database Design deve "
    "conter. Não são burocracia — cada um responde uma pergunta específica "
    "que, se não for respondida agora, vira retrabalho depois.", "body"))

doc_rows = [
    ["1", "Requirements Doc", "Regras de negócio (requisitos funcionais e "
     "não-funcionais), restrições do domínio.",
     "Define o que o schema PRECISA suportar antes de desenhar qualquer "
     "tabela."],
    ["2", "Modelo Conceitual (ERD)", "Entidades e relacionamentos, em alto "
     "nível, sem detalhe de implementação.",
     "Permite alinhar com o cliente sem exigir conhecimento técnico de SQL."],
    ["3", "Modelo Lógico", "Atributos, tipos, chaves, cardinalidade de cada "
     "relacionamento.", "É a ponte entre o conceitual e o SQL real."],
    ["4", "Naming Conventions", "Padrão de nomenclatura de tabelas, colunas, "
     "constraints e índices.", "Consistência: qualquer dev novo entende sem "
     "perguntar."],
    ["5", "Dicionário de Dados", "Tabela por tabela, coluna por coluna: "
     "tipo, nulidade, default, descrição, regra.", "É a referência única de "
     "verdade sobre o schema — a primeira coisa que se consulta."],
    ["6", "Estratégia de Segurança / Acesso", "Como o isolamento de dados é "
     "garantido (RLS em multi-tenant, ou controle de acesso em geral).",
     "Crítico em qualquer SaaS — mostra que segurança foi desenhada, não "
     "improvisada."],
    ["7", "ADRs", "Registro de decisões técnicas não-óbvias, com o porquê.",
     "Evita retrabalho e discussões repetidas; profissionaliza a entrega."],
]
story.append(section_table(
    ["#", "Documento", "O que contém", "Por que importa"],
    doc_rows, [1.1 * cm, 3.6 * cm, 6.3 * cm, 6.0 * cm]))
story.append(PageBreak())

# ---------- Passo a passo ----------
story.append(p("Passo a Passo do Processo", "h1"))
story.append(hr())

passos = [
    ("1. Discovery / entrevista de requisitos",
     "Perguntas-chave pro cliente: Quem vai usar o sistema? É multi-tenant "
     "(vários clientes isolados) ou single-tenant? Quais são as entidades "
     "principais do domínio? Quais regras de negócio variam de cliente pra "
     "cliente (ex: prazos, classificações)? Existe algum dado sensível ou "
     "regulado?"),
    ("2. Esboçar o modelo conceitual (ERD)",
     "Desenhar entidades e relacionamentos em alto nível e validar com o "
     "cliente ANTES de detalhar tipos e constraints — é muito mais barato "
     "corrigir um ERD do que um schema já implementado."),
    ("3. Detalhar o modelo lógico",
     "Atributos de cada entidade, tipos de dado, chaves primárias/"
     "estrangeiras, cardinalidade exata de cada relacionamento."),
    ("4. Definir naming conventions",
     "Decidir uma vez por projeto (singular/plural, snake_case, padrão de "
     "FK, como tratar enums) e documentar — depois é só seguir."),
    ("5. Escrever o dicionário de dados completo",
     "Cobrir cada tabela e cada coluna sem exceção, incluindo o porquê de "
     "decisões não-óbvias (ex: por que um campo é nullable)."),
    ("6. Desenhar a estratégia de segurança/RLS",
     "Se multi-tenant: políticas de Row Level Security por tabela, função "
     "auxiliar de \"conta atual\", e um plano de teste de isolamento. Se "
     "não for multi-tenant: estratégia de controle de acesso equivalente."),
    ("7. Registrar os ADRs das decisões não-óbvias",
     "Toda escolha que alguém vai perguntar \"por que assim?\" no futuro "
     "merece um ADR — não é preciso um pra cada detalhe pequeno."),
    ("8. Revisão final com o cliente + handoff",
     "Apresentar o pacote completo, capturar ajustes, e só então gerar as "
     "migrations SQL reais (DDL + políticas + dados de seed)."),
]
for titulo, desc in passos:
    story.append(p(titulo, "h2"))
    story.append(p(desc, "body"))
story.append(PageBreak())

# ---------- Checklist rápido ----------
story.append(p("Checklist Rápido de Entrega", "h1"))
story.append(hr())
story.append(p(
    "Use esta lista por projeto — marque conforme for entregando.", "body"))

checklist_items = [
    "Requirements doc revisado com o cliente",
    "ERD conceitual validado antes de detalhar",
    "Modelo lógico completo (tipos, chaves, cardinalidade)",
    "Naming conventions documentadas e aplicadas em 100% do schema",
    "Dicionário de dados sem nenhuma coluna sem descrição",
    "Estratégia de RLS/segurança desenhada e testada manualmente",
    "Todas as decisões não-óbvias registradas em ADR",
    "Migrations SQL geradas a partir da documentação (não o contrário)",
]
story.append(ListFlowable(
    [ListItem(p(c, "bullet")) for c in checklist_items],
    bulletType="bullet", start="[ ]", leftIndent=14, bulletFontSize=10,
))
story.append(Spacer(1, 14))

story.append(p("Estimativa de Esforço por Etapa", "h2"))
esforco_rows = [
    ["Discovery + requirements", "2-4h"],
    ["Modelo conceitual + lógico (ERD)", "3-5h"],
    ["Naming conventions", "0.5-1h"],
    ["Dicionário de dados", "3-6h (depende do nº de tabelas)"],
    ["Estratégia de RLS/segurança", "3-5h (multi-tenant) / 1-2h (simples)"],
    ["ADRs", "1-3h"],
    ["Revisão com cliente + ajustes", "1-2h"],
]
story.append(section_table(
    ["Etapa", "Tempo estimado"], esforco_rows, [11 * cm, 6 * cm]))
story.append(PageBreak())

# ---------- Tiers de gig ----------
story.append(p("Como Empacotar Como Gig no Fiverr", "h1"))
story.append(hr())
story.append(p(
    "Sugestão de estrutura de tiers, no mesmo padrão usado na gig de "
    "automação n8n (Basic/Standard/Premium) — <b>ajustar valores conforme "
    "escopo real e mercado antes de publicar</b>.", "body"))

tier_rows = [
    ["Basic", "Requirements doc + ERD conceitual + dicionário de dados "
     "básico (até ~6 tabelas)", "sugestão: a validar"],
    ["Standard", "Tudo do Basic + naming conventions + modelo lógico "
     "completo + ADRs das decisões principais", "sugestão: a validar"],
    ["Premium", "Tudo do Standard + estratégia de RLS/segurança + script "
     "SQL (DDL) pronto pra rodar + 1 rodada de revisão ao vivo",
     "sugestão: a validar"],
]
story.append(section_table(
    ["Tier", "Entregáveis", "Preço"], tier_rows, [2.6 * cm, 11 * cm, 3.4 * cm]))
story.append(Spacer(1, 10))
story.append(p(
    "Referência interna: a gig de automação n8n está precificada em "
    "Basic $150 / Standard $350 / Premium $700 — use como ponto de partida "
    "pra calibrar esta, mas o escopo de Database Design tende a ter menos "
    "horas de execução recorrente (não há manutenção contínua como em "
    "automação), então o preço pode ser mais baixo ou estruturado como "
    "entrega única.", "body"))
story.append(PageBreak())

# ---------- Referência ----------
story.append(p("Projeto de Referência", "h1"))
story.append(hr())
story.append(p(
    "O pacote completo de documentação já foi produzido, seguindo "
    "exatamente este processo, em "
    "<b>nr12-saas/docs/database/</b> e <b>nr12-saas/docs/adr/</b> "
    "(projeto NR-12 SaaS). Use esses arquivos como amostra/portfolio real "
    "ao oferecer esta gig — e também como modelo de estrutura de pastas "
    "pra replicar em cada novo projeto:", "body"))

estrutura = [
    "docs/database/01-requirements.md",
    "docs/database/02-data-model.md (ERD em Mermaid)",
    "docs/database/03-naming-conventions.md",
    "docs/database/04-data-dictionary.md",
    "docs/database/05-row-level-security.md",
    "docs/adr/0001, 0002, 0003...",
]
story.append(ListFlowable(
    [ListItem(p(e, "bullet")) for e in estrutura],
    bulletType="bullet", start="•", leftIndent=14, bulletFontSize=10,
))
story.append(Spacer(1, 10))
story.append(p(
    "Quando os próximos marcos do projeto (Backend/API, Automação n8n, "
    "Frontend, Pagamentos) forem concluídos, repita este mesmo formato de "
    "guia em pastas equivalentes — cada marco do projeto técnico vira sua "
    "própria gig documentada.", "body"))

story.append(Spacer(1, 1.5 * cm))
story.append(p(
    f"Gerado como parte do projeto NR-12 SaaS — pasta nr12-saas/banco-de-dados/",
    "footer"))


def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    doc = SimpleDocTemplate(
        OUT_FILE, pagesize=A4,
        leftMargin=2.2 * cm, rightMargin=2.2 * cm,
        topMargin=2.2 * cm, bottomMargin=2.2 * cm,
        title="Guia de Entrega - Database Design & Architecture",
        author="Sandro Abreu",
    )
    doc.build(story)
    print(f"PDF gerado: {OUT_FILE}")


if __name__ == "__main__":
    build()
