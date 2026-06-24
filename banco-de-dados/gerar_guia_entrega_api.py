# -*- coding: utf-8 -*-
"""Gera o playbook 'Entrega de Backend & API com Supabase' — checklist por
fases, com a documentacao profissional embutida em cada fase. Pensado pra
seguir em projetos de cliente (gigs). Mesmo estilo dos outros guias."""

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

OUT = r"C:\Users\Sandro\Desktop\Claude\nr12-saas\banco-de-dados\guia-entrega-api-supabase.pdf"
NAVY = colors.HexColor("#163B5C")
BLUE = colors.HexColor("#3AA0CC")
LIGHT = colors.HexColor("#EEF5F9")
DOCBG = colors.HexColor("#FBF3E6")
GREY = colors.HexColor("#555555")

S = {
    "title": ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=22,
                            leading=26, textColor=NAVY, alignment=TA_CENTER),
    "sub": ParagraphStyle("s", fontName="Helvetica-Oblique", fontSize=12,
                          leading=16, textColor=GREY, alignment=TA_CENTER),
    "meta": ParagraphStyle("m", fontName="Helvetica", fontSize=9.5,
                           leading=13, textColor=GREY, alignment=TA_CENTER),
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=15,
                         leading=19, textColor=NAVY, spaceBefore=6, spaceAfter=6),
    "phase": ParagraphStyle("ph", fontName="Helvetica-Bold", fontSize=13,
                            leading=17, textColor=colors.white),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11,
                         leading=14, textColor=NAVY, spaceBefore=7, spaceAfter=3),
    "body": ParagraphStyle("b", fontName="Helvetica", fontSize=10, leading=14.5,
                           textColor=colors.black, alignment=TA_LEFT, spaceAfter=5),
    "bul": ParagraphStyle("bul", fontName="Helvetica", fontSize=9.7, leading=13.5,
                          textColor=colors.black, leftIndent=2),
    "doc": ParagraphStyle("doc", fontName="Helvetica", fontSize=9.7, leading=13.5,
                          textColor=colors.HexColor("#7A4E0B"), leftIndent=4),
    "ch": ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, leading=12,
                         textColor=colors.white),
    "cell": ParagraphStyle("c", fontName="Helvetica", fontSize=9, leading=12.5,
                           textColor=colors.black),
    "foot": ParagraphStyle("f", fontName="Helvetica-Oblique", fontSize=8.5,
                           leading=11, textColor=GREY, alignment=TA_CENTER),
    "code": ParagraphStyle("code", fontName="Courier", fontSize=8.5, leading=12,
                           textColor=colors.HexColor("#10324F"),
                           backColor=LIGHT, leftIndent=6, rightIndent=6,
                           spaceBefore=2, spaceAfter=2, borderPadding=4),
}


def P(t, s="body"):
    return Paragraph(t, S[s])


def hr():
    return HRFlowable(width="100%", thickness=0.8, color=BLUE,
                      spaceBefore=2, spaceAfter=10)


def phase_bar(text):
    t = Table([[P(text, "phase")]], colWidths=[16.6 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def doc_box(text):
    t = Table([[P("<b>Documento desta fase:</b> " + text, "doc")]],
              colWidths=[16.6 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DOCBG),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0C58A")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def steps(items):
    return ListFlowable([ListItem(P(i, "bul")) for i in items],
                        bulletType="bullet", start="[ ]", leftIndent=14,
                        bulletFontSize=9)


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


story = []

# ---------- capa ----------
story.append(Spacer(1, 4 * cm))
story.append(P("Entrega de Backend &amp; API com Supabase", "title"))
story.append(P("Playbook + checklist para projetos de cliente (gigs)", "sub"))
story.append(Spacer(1, 0.7 * cm))
story.append(P("Cada fase entrega <b>software funcionando</b> E um "
               "<b>documento profissional</b> — a documentação está embutida "
               "no fluxo, não no fim.", "meta"))
story.append(P("Stack: Supabase (Postgres + Auth + RLS + Edge Functions). "
               "Sandro Abreu — Engenharia de Dados &amp; Automação", "meta"))
story.append(PageBreak())

# ---------- por que ----------
story.append(P("Por que seguir um método", "h1"))
story.append(hr())
story.append(P("Cliente não paga caro por código — paga por <b>confiança</b>: "
               "que o dado dele está seguro, que a entrega funciona e que ele "
               "não fica dependente de você. Um processo repetível com "
               "documentação em cada etapa é o que transforma um freelancer "
               "em uma entrega de consultoria — e é o que justifica preço "
               "premium e torna o handover trivial.", "body"))
story.append(P("Regra de ouro: <b>nunca documente no fim.</b> Cada fase "
               "produz seu documento enquanto a decisão está fresca. No fim, "
               "a documentação já existe.", "body"))

story.append(P("Visão geral das fases", "h2"))
story.append(tbl(
    ["Fase", "Objetivo", "Documento produzido"],
    [["0. Discovery", "Entender o problema e montar o terreno", "Requirements doc"],
     ["1. Modelagem", "Desenhar os dados (docs-first)", "ERD, dicionário, convenções, ADRs"],
     ["2. Schema", "Criar as tabelas (SQL versionado)", "Migrations + README de setup"],
     ["3. Segurança", "Auth + RLS (isolamento)", "Estratégia de RLS + teste"],
     ["4. API", "Expor e a lógica de negócio", "Mapa 'onde mora cada regra'"],
     ["5. Integrações", "IA, pagamentos, webhooks", "Doc das Edge Functions"],
     ["6. Entrega", "Handover pro cliente", "README de handover"]],
    [2.6 * cm, 7.0 * cm, 7.0 * cm]))
story.append(PageBreak())

# ---------- FASE 0 ----------
story.append(phase_bar("FASE 0 — Discovery &amp; Setup"))
story.append(Spacer(1, 6))
story.append(P("Objetivo: entender o problema do cliente e preparar o "
               "terreno antes de qualquer código.", "body"))
story.append(steps([
    "Reunião de kickoff: quem usa? é multi-tenant (vários clientes isolados)? "
    "quais entidades e regras de negócio? algum dado sensível/regulado?",
    "Definir o escopo do MVP — cortar o que não é essencial pra v1.",
    "Criar a org/projeto no Supabase — <b>idealmente na conta do cliente</b> "
    "(billing e propriedade dele desde o dia 1).",
    "Criar o repositório Git + estrutura de pastas (docs/, supabase/migrations/).",
]))
story.append(doc_box("<b>Requirements doc</b> — requisitos funcionais e "
                     "não-funcionais, restrições do domínio. É o que o schema "
                     "precisa suportar."))
story.append(Spacer(1, 10))

# ---------- FASE 1 ----------
story.append(phase_bar("FASE 1 — Modelagem de dados (docs-first)"))
story.append(Spacer(1, 6))
story.append(P("Objetivo: desenhar os dados antes do SQL. O schema é "
               "consequência da modelagem, não o contrário.", "body"))
story.append(steps([
    "Definir <b>todas as entidades</b> (nível conceitual) antes de pensar em propriedades.",
    "Definir propriedades, tipos, chaves e relações de cada entidade.",
    "Fechar as convenções de nomenclatura (singular/plural, snake_case, FKs, enums).",
    "Registrar cada decisão não-óbvia em um <b>ADR</b> (por que X e não Y).",
    "Desenhar no <b>dbdiagram.io</b> (DBML) pra validar visualmente e com o cliente.",
]))
story.append(doc_box("<b>Modelo de dados (ERD)</b>, <b>dicionário de dados</b> "
                     "(tabela por tabela, coluna por coluna), <b>convenções de "
                     "nomenclatura</b> e os <b>ADRs</b> das decisões."))
story.append(PageBreak())

# ---------- FASE 2 ----------
story.append(phase_bar("FASE 2 — Schema (SQL versionado)"))
story.append(Spacer(1, 6))
story.append(P("Objetivo: transformar o desenho em tabelas reais, de forma "
               "reproduzível.", "body"))
story.append(steps([
    "Traduzir o DBML em SQL, <b>camada por camada</b> (referência -> cadastro "
    "-> transacional), respeitando as dependências de FK.",
    "Rodar no SQL Editor do Supabase (ou via supabase CLI).",
    "Versionar como <b>migrations no Git</b> (supabase/migrations/NNNN_*.sql) — "
    "é a sua 'receita' pra levantar o mesmo banco em qualquer projeto/cliente.",
    "Semear os dados de referência (ex: catálogos, tabelas fixas).",
    "Tipos: uuid PK com default gen_random_uuid(); timestamptz default now(); "
    "enums como text + check.",
]))
story.append(doc_box("<b>Migrations versionadas</b> (o próprio SQL é "
                     "documentação executável) + <b>README de setup</b> (como "
                     "subir o banco do zero)."))
story.append(Spacer(1, 10))

# ---------- FASE 3 ----------
story.append(phase_bar("FASE 3 — Segurança (Auth + RLS)"))
story.append(Spacer(1, 6))
story.append(P("Objetivo: garantir que cada um só acessa o que é seu. "
               "Em multi-tenant, isto é obrigatório.", "body"))
story.append(steps([
    "Configurar o <b>Supabase Auth</b> (sign-up / login).",
    "<b>Ligar RLS em TODAS as tabelas</b> (secure by default — o Supabase "
    "alerta se uma tabela do public ficar sem RLS).",
    "Tabelas de <b>referência</b> (globais): política de leitura aberta pra "
    "autenticados; escrita só por service_role.",
    "Tabelas do <b>tenant</b>: políticas de isolamento (helper que resolve "
    "'minhas contas' via auth.uid()).",
    "<b>Testar o isolamento</b>: 2 contas fake; confirmar que A não vê dado de B.",
]))
story.append(P("Lembrete: RLS = negar por padrão; cada política é uma "
               "<b>chave</b> que abre uma porta específica. service_role "
               "(admin) ignora o RLS — use só no servidor, nunca no client.", "body"))
story.append(doc_box("<b>Estratégia de RLS</b> (quais tabelas são referência "
                     "vs tenant, o padrão de política) + <b>plano de teste de "
                     "isolamento</b>."))
story.append(PageBreak())

# ---------- FASE 4 ----------
story.append(phase_bar("FASE 4 — A API e a lógica de negócio"))
story.append(Spacer(1, 6))
story.append(P("Objetivo: expor os dados e colocar as regras nos lugares "
               "certos. No Supabase você quase não escreve API de CRUD.", "body"))
story.append(steps([
    "A <b>API REST é auto-gerada</b> (PostgREST) a partir do schema — não "
    "escreva controllers de CRUD à mão.",
    "Regras de <b>integridade</b> (ex: campo obrigatório condicional): "
    "constraints / CHECK no banco.",
    "Regras <b>reativas</b> (ex: imutabilidade, cálculo de campo): triggers + funções.",
    "Operações <b>transacionais complexas</b>: funções Postgres expostas como RPC.",
    "Testar os endpoints (leitura/escrita) com um usuário autenticado.",
]))
story.append(doc_box("<b>Mapa 'onde mora cada regra de negócio'</b> — o que "
                     "está no banco (constraint/trigger/função) vs o que está "
                     "em Edge Function. Auditável."))
story.append(Spacer(1, 10))

# ---------- FASE 5 ----------
story.append(phase_bar("FASE 5 — Lógica de servidor &amp; integrações"))
story.append(Spacer(1, 6))
story.append(P("Objetivo: o que precisa de servidor de verdade (segredos, "
               "serviços externos).", "body"))
story.append(steps([
    "<b>Edge Functions</b> (TypeScript) para: IA, Stripe, webhooks, n8n, e "
    "qualquer coisa que use chave secreta.",
    "Nunca expor a <b>service_role</b> no client — ela vive só no servidor.",
    "No navegador use a chave <b>anon</b> — ela é segura porque o RLS protege.",
    "Validar cada integração ponta a ponta.",
]))
story.append(doc_box("<b>Doc das Edge Functions / integrações</b> — o que "
                     "cada função faz, quais segredos usa, e o fluxo."))
story.append(Spacer(1, 10))

# ---------- FASE 6 ----------
story.append(phase_bar("FASE 6 — Entrega &amp; handover"))
story.append(Spacer(1, 6))
story.append(P("Objetivo: passar pro cliente de forma limpa, sem deixá-lo "
               "dependente de você.", "body"))
story.append(steps([
    "Revisar a documentação final (já produzida nas fases anteriores).",
    "Garantir que as migrations sobem do <b>zero num projeto limpo</b> "
    "(reprodutibilidade real).",
    "Transferir o projeto / confirmar que o <b>billing e a propriedade são do cliente</b>.",
    "Entregar o <b>README de handover</b>: como rodar, deployar e manter.",
]))
story.append(doc_box("<b>README de handover</b> — visão geral, como subir o "
                     "ambiente, deploy, e onde está cada coisa."))
story.append(PageBreak())

# ---------- checklist resumido ----------
story.append(P("Checklist resumido (marque por projeto)", "h1"))
story.append(hr())
checklist = [
    "Kickoff + requirements doc revisado com o cliente",
    "Projeto Supabase na conta do cliente + repo Git criado",
    "Todas as entidades definidas (conceitual) antes das propriedades",
    "Dicionário de dados + convenções + ADRs escritos",
    "DBML validado no dbdiagram.io",
    "Schema em SQL, camada por camada, versionado como migrations",
    "Dados de referência semeados",
    "Auth configurado",
    "RLS ligado em TODAS as tabelas",
    "Referência: leitura aberta; tenant: isolamento",
    "Isolamento testado com 2 contas",
    "Regras de negócio no lugar certo (banco vs Edge Function) + documentadas",
    "Edge Functions / integrações (IA, Stripe, webhooks) testadas",
    "Migrations sobem do zero num projeto limpo",
    "Projeto transferido / billing do cliente + README de handover",
]
story.append(ListFlowable([ListItem(P(c, "bul")) for c in checklist],
                          bulletType="bullet", start="[ ]", leftIndent=14,
                          bulletFontSize=9))
story.append(PageBreak())

# ---------- referencia rapida ----------
story.append(P("Referência rápida", "h1"))
story.append(hr())

story.append(P("Onde mora cada regra (mapa mental Spring -> Supabase)", "h2"))
story.append(tbl(
    ["No Spring você faria...", "No Supabase fica..."],
    [["@Repository (CRUD)", "API REST automática (PostgREST)"],
     ["Spring Security / filtros", "RLS policies (por linha)"],
     ["@Service: validação", "CHECK / constraints + triggers"],
     ["@Service: operação transacional", "função Postgres (RPC)"],
     ["chamar API externa / segredos", "Edge Function (server-side)"]],
    [8.3 * cm, 8.3 * cm]))
story.append(Spacer(1, 8))

story.append(P("Padrão de política RLS", "h2"))
story.append(P("Referência (leitura aberta):", "body"))
story.append(P('create policy "ref_read" on standards<br/>'
               '&nbsp;&nbsp;for select to authenticated using (true);', "code"))
story.append(P("Raiz do tenant (comparação direta):", "body"))
story.append(P('create policy "own" on clients for select<br/>'
               '&nbsp;&nbsp;using (account_id in (select current_account_ids()));', "code"))
story.append(P("Filha (join até a raiz):", "body"))
story.append(P('create policy "own" on locations for select using (<br/>'
               '&nbsp;&nbsp;exists (select 1 from clients c<br/>'
               '&nbsp;&nbsp;&nbsp;&nbsp;where c.id = locations.client_id<br/>'
               '&nbsp;&nbsp;&nbsp;&nbsp;and c.account_id in (select current_account_ids())));', "code"))
story.append(Spacer(1, 8))
story.append(P("Princípios que não mudam", "h2"))
story.append(ListFlowable([ListItem(P(c, "bul")) for c in [
    "Documente em cada fase, nunca só no fim.",
    "RLS ligado em tudo; abrir portas só com políticas.",
    "service_role só no servidor; anon no navegador (RLS protege).",
    "Migrations versionadas = handover trivial e zero lock-in (é Postgres puro).",
    "Cliente dono do projeto/billing desde o começo.",
]], bulletType="bullet", start="-", leftIndent=14, bulletFontSize=9))

story.append(Spacer(1, 1.0 * cm))
story.append(P("Playbook de entrega — Supabase API. Use como checklist a cada projeto.", "foot"))


def build():
    doc = SimpleDocTemplate(OUT, pagesize=A4,
                            leftMargin=2.2 * cm, rightMargin=2.2 * cm,
                            topMargin=2.0 * cm, bottomMargin=1.8 * cm,
                            title="Guia de Entrega - Backend & API com Supabase",
                            author="Sandro Abreu")
    doc.build(story)
    print("PDF:", OUT)


if __name__ == "__main__":
    build()
