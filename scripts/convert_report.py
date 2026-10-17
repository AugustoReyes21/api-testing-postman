"""Convierte el DOCX fuente a PDF carta sencillo con ReportLab, sin encabezados ni pies."""
from pathlib import Path
from html import escape
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph as DocxParagraph
from reportlab.pdfgen import canvas
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO

ROOT = Path(__file__).resolve().parents[1]
source = Document(ROOT / "artifacts/informe-api-postman.docx")
font_path = Path("C:/Windows/Fonts/arial.ttf")
bold_path = Path("C:/Windows/Fonts/arialbd.ttf")
if font_path.exists() and bold_path.exists():
    pdfmetrics.registerFont(TTFont("Arial", str(font_path)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(bold_path)))
    regular, bold = "Arial", "Arial-Bold"
else:
    regular, bold = "Times-Roman", "Times-Bold"
normal = ParagraphStyle("normal", fontName=regular, fontSize=11, leading=13, spaceAfter=7, alignment=4)
title = ParagraphStyle("title", parent=normal, fontName=bold, fontSize=12, leading=15, alignment=0, spaceAfter=9)
heading = ParagraphStyle("heading", parent=normal, fontName=bold, leading=13, alignment=0, spaceBefore=7, spaceAfter=7)
cell = ParagraphStyle("cell", parent=normal, fontSize=11, leading=12.5, alignment=0, spaceAfter=0)
story = []
for element in source.element.body:
    if element.tag == qn("w:p"):
        para = DocxParagraph(element, source)
        if element.xpath('.//w:br[@w:type="page"]'):
            story.append(PageBreak())
            continue
        drawings = element.xpath(".//w:drawing")
        if drawings:
            for drawing in drawings:
                embed = drawing.xpath(".//a:blip/@r:embed")[0]
                blob = source.part.related_parts[embed].blob
                extent = drawing.xpath(".//wp:extent")[0]
                width = int(extent.get("cx")) / 914400 * 72
                height = int(extent.get("cy")) / 914400 * 72
                picture = Image(BytesIO(blob), width=width, height=height)
                picture.hAlign = "CENTER"
                if story and isinstance(story[-1], Paragraph):
                    explanation = story.pop()
                    story.append(KeepTogether([explanation, picture, Spacer(1, 5)]))
                else:
                    story.extend([picture, Spacer(1, 5)])
            continue
        text = escape(para.text).replace("\n", "<br/>")
        if not text:
            continue
        style = title if para.style.name == "Title" else heading if para.style.name.startswith("Heading") else normal
        story.append(Paragraph(text, style))
    elif element.tag == qn("w:tbl"):
        table = DocxTable(element, source)
        data = [[Paragraph(escape(c.text), cell) for c in r.cells] for r in table.rows]
        cols = len(data[0])
        widths = [155, 313] if cols == 2 else [240, 56, 86, 86] if cols == 4 else [110, 110, 248] if cols == 3 else [468 / cols] * cols
        output_table = Table(data, colWidths=widths, hAlign="LEFT")
        output_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.extend([output_table, Spacer(1, 7)])
target = ROOT / "artifacts/informe-api-postman.pdf"
pdf = BaseDocTemplate(str(target), pagesize=(612, 792), leftMargin=72, rightMargin=72, topMargin=72, bottomMargin=72, author="", title="Automatización de pruebas de API con Postman", pageCompression=1)
pdf.addPageTemplates(PageTemplate(id="academico", frames=[Frame(72, 72, 468, 648, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)]))
pdf.build(story)
print(f"PDF generado desde el DOCX con ReportLab: {target.name}")
