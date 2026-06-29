"""Renderização do laudo NR-12 em PDF (reportlab).

Monta o documento: faixa de título + Parecer (corpo) + Identificação + Anexo 1
(máquinas) + Anexo 2 (consolidação + gráfico de rosca) + Anexo 3
(não-conformidades agrupadas por item da norma) + Anexo 4 (ART). Rodapé com
numeração de páginas em todas as folhas.
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
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
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
RISK_COLOR = {"low": "#7F8C8D", "medium": "#D4AC0D", "high": "#E67E22", "critical": "#C0392B"}


def _esc(t) -> str:
    """Escapa &, <, > para não quebrar a marcação do Paragraph."""
    return _xml_escape(str(t if t is not None else ""))


class NumberedCanvas(canvas.Canvas):
    """Canvas que escreve o rodapé (linha + identificação + 'Página X de Y')
    em todas as folhas — só dá pra saber o total no fim, daí o dois-passos."""

    def __init__(self, *args, footer="", **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_states = []
        self._footer = footer

    def showPage(self):
        self._saved_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved_states)
        for state in self._saved_states:
            self.__dict__.update(state)
            self._draw_footer(total)
            super().showPage()
        super().save()

    def _draw_footer(self, total):
        w, _ = self._pagesize
        self.setStrokeColor(NAVY)
        self.setLineWidth(0.5)
        self.line(2 * cm, 1.4 * cm, w - 2 * cm, 1.4 * cm)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.grey)
        self.drawString(2 * cm, 1.0 * cm, self._footer)
        self.drawRightString(w - 2 * cm, 1.0 * cm, f"Página {self._pageNumber} de {total}")


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("TituloBand", parent=s["Title"], textColor=colors.white, fontSize=16, alignment=0))
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


def _title_block(report: dict, s, width):
    band = Table([[Paragraph("LAUDO TÉCNICO — NR-12", s["TituloBand"])]], colWidths=[width])
    band.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    num = report.get("report_number") or "(sem número)"
    meta = Paragraph(
        f"Laudo nº {num} &nbsp;·&nbsp; revisão {report.get('version')} "
        f"&nbsp;·&nbsp; situação: {report.get('status')}", s["Sub"])
    return [band, Spacer(1, 6), meta, Spacer(1, 4)]


def _donut(dash: dict):
    """Gráfico de rosca da consolidação por máquina (centralizado)."""
    conformes = int(dash.get("machines_compliant") or 0)
    nao_aplica = int(dash.get("machines_not_applicable") or 0)
    total = int(dash.get("machines_total") or 0)
    com_nc = max(0, total - conformes - nao_aplica)
    data = [conformes, com_nc, nao_aplica]
    if sum(data) == 0:
        return None
    labels = ["Conformes", "Com não-conformidade", "NR-12 não se aplica"]
    cols = [colors.HexColor("#2E8B57"), colors.HexColor("#C0392B"), colors.HexColor("#95A5A6")]

    d = Drawing(460, 200)
    d.hAlign = "CENTER"
    pie = Pie()
    pie.x, pie.y = 30, 22
    pie.width = pie.height = 160
    pie.data = data
    pie.innerRadiusFraction = 0.55  # rosca
    pie.slices.strokeColor = colors.white
    pie.slices.strokeWidth = 1
    for i in range(len(data)):
        pie.slices[i].fillColor = cols[i]
    d.add(pie)

    leg = Legend()
    leg.x, leg.y = 230, 130
    leg.fontName, leg.fontSize = "Helvetica", 9
    leg.dxTextSpace, leg.deltay = 6, 18
    leg.colorNamePairs = [(cols[i], f"{labels[i]}: {data[i]}") for i in range(len(data))]
    d.add(leg)
    return d


def _render_norma(out, s, texto):
    """Acrescenta a `out` o texto da norma em negrito + aspas, com as alíneas
    (a, b, c...) estruturadas (recuo, marcador pendente, espaçamento)."""
    texto = (texto or "").strip()
    partes = re.split(r"(?:^|(?<=\s))([a-z])\)\s", texto)
    intro = _esc(partes[0].strip())
    alineas = [(partes[i], _esc(partes[i + 1].strip())) for i in range(1, len(partes) - 1, 2)]
    if not alineas:
        out.append(Paragraph(f'<b>"{intro}"</b>', s["Norma"]))
        return
    out.append(Paragraph(f'<b>"{intro}</b>', s["Norma"]))
    for j, (letra, txt) in enumerate(alineas):
        fecha = '"' if j == len(alineas) - 1 else ""
        out.append(Paragraph(f"<b>{letra}) {txt}{fecha}</b>", s["Alinea"]))


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

    # ---- Faixa de título ----
    story += _title_block(report, s, doc.width)

    # ---- Corpo (parecer) ----
    corpo = report.get("final_text") or report.get("ai_generated_text") or "(parecer ainda não gerado)"
    story.append(Paragraph("1. Parecer Técnico", s["H"]))
    for par in [p.strip() for p in corpo.split("\n") if p.strip()]:
        story.append(Paragraph(_esc(par), s["Body"]))

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
            Paragraph(_esc(m.get("tag")), s["Cell"]),
            Paragraph(_esc(m.get("type")), s["Cell"]),
            Paragraph(_esc(m.get("manufacturer")), s["Cell"]),
            Paragraph(_esc(m.get("model")), s["Cell"]),
            Paragraph(_esc(m.get("location")), s["Cell"]),
            Paragraph("aplica" if m.get("nr_applies") else f"não ({_esc(m.get('exclusion_code'))})", s["Cell"]),
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

    # ---- Anexo 2: consolidação + gráfico ----
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
        story.append(Spacer(1, 6))
        story.append(Paragraph("Distribuição das máquinas", s["Cell"]))
        story.append(grafico)

    # ---- Anexo 3: não-conformidades agrupadas por item da norma ----
    story.append(PageBreak())
    story.append(Paragraph("Anexo 3 — Não-Conformidades e Planos de Ação", s["H"]))
    grupos = dossier.get("anexo3_nonconformities") or []
    if not grupos:
        story.append(Paragraph("Nenhuma não-conformidade registrada.", s["Body"]))
    for g in grupos:
        bloco = [Paragraph(f"<b>Item {g.get('norm_number')}</b>", s["Body"])]
        _render_norma(bloco, s, g.get("norm_text"))
        bloco.append(Spacer(1, 2))
        bloco.append(Paragraph("<b>Falhas encontradas:</b>", s["Cell"]))
        for f in g.get("failures") or []:
            ap = f.get("action_plan") or {}
            risco = RISK_PT.get(f.get("risk_level"), f.get("risk_level"))
            cor = RISK_COLOR.get(f.get("risk_level"), "#000000")
            bloco.append(Paragraph(
                f'• <b>{_esc(f.get("machine_tag"))}</b> '
                f'(risco <font color="{cor}"><b>{risco}</b></font>): {_esc(f.get("justification"))}',
                s["Cell"]))
            bloco.append(Paragraph(
                f'&nbsp;&nbsp;&nbsp;<i>Plano de ação:</i> {_esc(ap.get("description") or "—")} '
                f'(situação: {_esc(ap.get("status") or "—")})', s["Cell"]))
            fotos = f.get("photos") or []
            if fotos:
                bloco.append(Paragraph(f"&nbsp;&nbsp;&nbsp;<i>Evidências:</i> {len(fotos)} foto(s).", s["Cell"]))
            bloco.append(Spacer(1, 5))
        bloco.append(Spacer(1, 10))
        story.append(KeepTogether(bloco))

    # ---- Anexo 4: ART ----
    art = dossier.get("anexo4_art") or {}
    story.append(Paragraph("Anexo 4 — ART", s["H"]))
    if art:
        story.append(_kv_table([("Número da ART", art.get("number")), ("Arquivo", art.get("pdf_path"))]))
    else:
        story.append(Paragraph("ART não anexada a esta inspeção.", s["Body"]))

    footer = f"Laudo NR-12 · {company.get('name') or '—'} · revisão {report.get('version')}"
    doc.build(story, canvasmaker=lambda *a, **k: NumberedCanvas(*a, footer=footer, **k))
    return buf.getvalue()
