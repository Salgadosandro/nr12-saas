"""Renderização do laudo NR-12 em PDF (reportlab).

Monta o documento: corpo (parecer) + Anexo 1 (máquinas) + Anexo 2 (dashboard)
+ Anexo 3 (não-conformidades) + Anexo 4 (ART). A forma será lapidada depois,
com o PDF à vista.
"""
import io
import re
from xml.sax.saxutils import escape as _xml_escape

from reportlab.graphics.charts.legends import Legend
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#163B5C")
BLUE = colors.HexColor("#3AA0CC")
LIGHT = colors.HexColor("#EAF2F8")

RISK_PT = {"low": "baixo", "medium": "médio", "high": "alto", "critical": "crítico"}


def _esc(t) -> str:
    """Escapa &, <, > para não quebrar a marcação do Paragraph."""
    return _xml_escape(str(t if t is not None else ""))


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("Titulo", parent=s["Title"], textColor=NAVY, fontSize=18, spaceAfter=4))
    s.add(ParagraphStyle("Sub", parent=s["Normal"], textColor=BLUE, fontSize=10, spaceAfter=12))
    s.add(ParagraphStyle("H", parent=s["Heading2"], textColor=NAVY, fontSize=13, spaceBefore=14, spaceAfter=6))
    s.add(ParagraphStyle("Body", parent=s["Normal"], alignment=TA_JUSTIFY, fontSize=10.5, leading=15, spaceAfter=8))
    s.add(ParagraphStyle("Cell", parent=s["Normal"], fontSize=9, leading=12))
    s.add(ParagraphStyle("Norma", parent=s["Normal"], fontSize=10, leading=14,
                         leftIndent=0.6 * cm, rightIndent=0.6 * cm, spaceBefore=4, spaceAfter=4))
    s.add(ParagraphStyle("Alinea", parent=s["Norma"], leftIndent=1.4 * cm,
                         firstLineIndent=-0.7 * cm, spaceAfter=4))
    return s


def _kv_table(rows):
    t = Table([[k, v or "—"] for k, v in rows], colWidths=[4.5 * cm, 11.5 * cm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (0, -1), NAVY),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def _donut(dash: dict):
    """Gráfico de rosca da consolidação por máquina."""
    conformes = int(dash.get("machines_compliant") or 0)
    nao_aplica = int(dash.get("machines_not_applicable") or 0)
    total = int(dash.get("machines_total") or 0)
    com_nc = max(0, total - conformes - nao_aplica)
    data = [conformes, com_nc, nao_aplica]
    if sum(data) == 0:
        return None
    labels = ["Conformes", "Com não-conformidade", "NR-12 não se aplica"]
    cols = [colors.HexColor("#2E8B57"), colors.HexColor("#C0392B"), colors.HexColor("#95A5A6")]

    d = Drawing(440, 165)
    pie = Pie()
    pie.x, pie.y = 10, 8
    pie.width = pie.height = 150
    pie.data = data
    pie.innerRadiusFraction = 0.55  # rosca
    pie.slices.strokeColor = colors.white
    pie.slices.strokeWidth = 1
    for i in range(len(data)):
        pie.slices[i].fillColor = cols[i]
    d.add(pie)

    leg = Legend()
    leg.x, leg.y = 195, 110
    leg.fontName, leg.fontSize = "Helvetica", 9
    leg.dxTextSpace, leg.deltay = 6, 16
    leg.colorNamePairs = [(cols[i], f"{labels[i]}: {data[i]}") for i in range(len(data))]
    d.add(leg)
    return d


def _render_norma(story, s, texto):
    """Renderiza o item da norma em negrito + aspas, com as alíneas estruturadas
    (recuo, marcador pendente e espaçamento), imitando o layout da norma."""
    texto = (texto or "").strip()
    partes = re.split(r"(?:^|(?<=\s))([a-z])\)\s", texto)
    intro = _esc(partes[0].strip())
    alineas = [(partes[i], _esc(partes[i + 1].strip())) for i in range(1, len(partes) - 1, 2)]
    if not alineas:
        story.append(Paragraph(f'<b>"{intro}"</b>', s["Norma"]))
        return
    story.append(Paragraph(f'<b>"{intro}</b>', s["Norma"]))
    for j, (letra, txt) in enumerate(alineas):
        fecha = '"' if j == len(alineas) - 1 else ""
        story.append(Paragraph(f"<b>{letra}) {txt}{fecha}</b>", s["Alinea"]))


def render_laudo(report: dict, dossier: dict, styles=None) -> bytes:
    s = styles or _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
        title="Laudo Técnico NR-12",
    )
    story = []
    company = dossier.get("company") or {}
    engineer = dossier.get("engineer") or {}

    # ---- Cabeçalho ----
    story.append(Paragraph("LAUDO TÉCNICO — NR-12", s["Titulo"]))
    num = report.get("report_number") or "(sem número)"
    story.append(Paragraph(
        f"Nº {num} · revisão {report.get('version')} · situação: {report.get('status')}", s["Sub"]))

    # ---- Corpo (parecer) ----
    corpo = report.get("final_text") or report.get("ai_generated_text") or "(parecer ainda não gerado)"
    story.append(Paragraph("1. Parecer Técnico", s["H"]))
    for par in [p.strip() for p in corpo.split("\n") if p.strip()]:
        story.append(Paragraph(par, s["Body"]))

    # ---- Identificação ----
    story.append(Paragraph("2. Identificação", s["H"]))
    story.append(_kv_table([
        ("Empresa", company.get("name")),
        ("CNPJ", company.get("cnpj")),
        ("Engenheiro", engineer.get("full_name") if engineer else None),
        ("CREA", engineer.get("crea") if engineer else None),
    ]))

    # ---- Anexo 1: máquinas ----
    story.append(Paragraph("Anexo 1 — Máquinas Analisadas", s["H"]))
    head = ["Tag", "Tipo", "Fabricante", "Modelo", "Local", "NR-12"]
    data = [head]
    for m in dossier.get("anexo1_machines") or []:
        data.append([
            Paragraph(str(m.get("tag") or ""), s["Cell"]),
            Paragraph(str(m.get("type") or ""), s["Cell"]),
            Paragraph(str(m.get("manufacturer") or ""), s["Cell"]),
            Paragraph(str(m.get("model") or ""), s["Cell"]),
            Paragraph(str(m.get("location") or ""), s["Cell"]),
            Paragraph("aplica" if m.get("nr_applies") else f"não ({m.get('exclusion_code')})", s["Cell"]),
        ])
    t = Table(data, colWidths=[2.6 * cm, 2.3 * cm, 2.6 * cm, 2.3 * cm, 3.2 * cm, 3 * cm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)

    # ---- Anexo 2: dashboard ----
    d = dossier.get("anexo2_dashboard") or {}
    story.append(Paragraph("Anexo 2 — Consolidação", s["H"]))
    story.append(_kv_table([
        ("Máquinas analisadas", str(d.get("machines_total", 0))),
        ("Conformes", str(d.get("machines_compliant", 0))),
        ("NR-12 não se aplica", str(d.get("machines_not_applicable", 0))),
        ("Não-conformidades", str(d.get("nonconformities", 0))),
    ]))
    grafico = _donut(d)
    if grafico is not None:
        story.append(Spacer(1, 8))
        story.append(grafico)

    # ---- Anexo 3: não-conformidades agrupadas por item da norma ----
    story.append(Paragraph("Anexo 3 — Não-Conformidades e Planos de Ação", s["H"]))
    grupos = dossier.get("anexo3_nonconformities") or []
    if not grupos:
        story.append(Paragraph("Nenhuma não-conformidade registrada.", s["Body"]))
    for g in grupos:
        story.append(Paragraph(f"<b>Item {g.get('norm_number')}</b>", s["Body"]))
        _render_norma(story, s, g.get("norm_text"))
        story.append(Spacer(1, 2))
        story.append(Paragraph("<b>Falhas encontradas:</b>", s["Cell"]))
        for f in g.get("failures") or []:
            ap = f.get("action_plan") or {}
            risco = RISK_PT.get(f.get("risk_level"), f.get("risk_level"))
            story.append(Paragraph(
                f"• <b>{_esc(f.get('machine_tag'))}</b> (risco {risco}): {_esc(f.get('justification'))}",
                s["Cell"]))
            story.append(Paragraph(
                f"&nbsp;&nbsp;&nbsp;<i>Plano de ação:</i> {_esc(ap.get('description') or '—')} "
                f"(situação: {_esc(ap.get('status') or '—')})", s["Cell"]))
            fotos = f.get("photos") or []
            if fotos:
                story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;<i>Evidências:</i> {len(fotos)} foto(s).", s["Cell"]))
            story.append(Spacer(1, 5))
        story.append(Spacer(1, 10))

    # ---- Anexo 4: ART ----
    art = dossier.get("anexo4_art") or {}
    story.append(Paragraph("Anexo 4 — ART", s["H"]))
    if art:
        story.append(_kv_table([("Número da ART", art.get("number")), ("Arquivo", art.get("pdf_path"))]))
    else:
        story.append(Paragraph("ART não anexada a esta inspeção.", s["Body"]))

    doc.build(story)
    return buf.getvalue()
