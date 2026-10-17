"""Renderiza todas las páginas y comprueba estructura básica; la inspección visual es adicional."""
from pathlib import Path
import json
import zipfile
import fitz
ROOT = Path(__file__).resolve().parents[1]
output = ROOT / "artifacts/pdf-pages"
output.mkdir(exist_ok=True)
document = fitz.open(ROOT / "artifacts/informe-api-postman.pdf")
pages = []
for index, page in enumerate(document):
    assert abs(page.rect.width - 612) < 1 and abs(page.rect.height - 792) < 1, "Tamaño distinto de carta"
    text = page.get_text()
    assert len(text.strip()) > 40, "Página vacía o sin explicación"
    for block in page.get_text("dict")["blocks"]:
        box = fitz.Rect(block["bbox"])
        assert box.x0 >= 68 and box.x1 <= 544, f"Bloque desbordado en página {index + 1}"
        assert box.y0 >= 65 and box.y1 <= 725, f"Bloque cortado en página {index + 1}"
    page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False).save(output / f"page-{index+1:02d}.png")
    pages.append({"page": index + 1, "widthPt": page.rect.width, "heightPt": page.rect.height, "textLength": len(text), "imageCount": len(page.get_images()), "render": f"artifacts/pdf-pages/page-{index+1:02d}.png"})
with zipfile.ZipFile(ROOT / "artifacts/informe-api-postman.docx") as archive:
    xml = archive.read("word/document.xml").decode()
    assert "headerReference" not in xml and "footerReference" not in xml
    assert not any(name.startswith(("word/header", "word/footer")) for name in archive.namelist())
result = {"pageCount": len(pages), "letter": True, "noHeadersOrFooters": True, "pages": pages, "note": "Comprobaciones automáticas de estructura. La revisión visual de los renders se registra por separado en docs/quality-review.md."}
(ROOT / "evidence/pdf-review.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
