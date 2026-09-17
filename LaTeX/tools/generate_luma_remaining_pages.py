"""Generate editable, fixed-position XeLaTeX for LUMA source pages 4--11.

The original PDF is the geometric authority.  Each word is placed at the
baseline stored in the PDF text layer, so justified spacing, superscripts,
table labels, and coloured text remain faithful without flattening the pages
to images.  Vector rectangles reproduce table bands, borders, rules, and Word
placeholder highlighting.
"""

from __future__ import annotations

from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Original" / "LUMA_ENG.pdf"
OUTPUT = ROOT / "LUMA-pages-3-10.tex"
SOURCE_PAGES = range(4, 12)


def colour_triplet(value: object) -> tuple[float, float, float]:
    """Return a PDF grayscale/RGB colour as an xcolor RGB triplet."""
    if value is None:
        return (0.0, 0.0, 0.0)
    if isinstance(value, (int, float)):
        gray = float(value)
        return (gray, gray, gray)
    values = tuple(float(component) for component in value)
    if len(values) == 1:
        return (values[0], values[0], values[0])
    if len(values) >= 3:
        return values[:3]
    raise ValueError(f"Unsupported PDF colour: {value!r}")


def font_command(font_name: str) -> str:
    """Map embedded Word/PDF font names to installed XeLaTeX families."""
    if "Helvetica" in font_name:
        family = r"\HelveticaFace"
    elif "Arial" in font_name or "Symbol" in font_name:
        family = r"\ArialFace"
    elif "Courier" in font_name:
        family = r"\CourierFace"
    elif "Times" in font_name:
        family = r"\TimesFace"
    else:
        family = r"\CalibriFace"

    style = ""
    if "Bold" in font_name:
        style += r"\bfseries"
    if "Italic" in font_name:
        style += r"\itshape"
    return family + style


def latex_escape(text: str) -> str:
    """Escape TeX syntax while retaining Unicode punctuation and symbols."""
    replacements = {
        "\\": r"\textbackslash{}",
        "{": r"\{",
        "}": r"\}",
        "#": r"\#",
        "$": r"\$",
        "%": r"\%",
        "&": r"\&",
        "_": r"\_",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(character, character) for character in text)


def same_colour(left: object, right: object) -> bool:
    return colour_triplet(left) == colour_triplet(right)


def word_baseline_from_top(page: object, word: dict[str, object]) -> float:
    """Find the PDF text matrix baseline associated with an extracted word."""
    for character in page.chars:
        if character["text"].isspace():
            continue
        if character["fontname"] != word["fontname"]:
            continue
        if abs(float(character["size"]) - float(word["size"])) > 0.02:
            continue
        if not same_colour(character.get("non_stroking_color"), word.get("non_stroking_color")):
            continue
        centre_x = (float(character["x0"]) + float(character["x1"])) / 2
        centre_y = (float(character["top"]) + float(character["bottom"])) / 2
        if not (float(word["x0"]) - 0.05 <= centre_x <= float(word["x1"]) + 0.05):
            continue
        if not (float(word["top"]) - 0.05 <= centre_y <= float(word["bottom"]) + 0.05):
            continue
        return float(page.height) - float(character["matrix"][5])
    raise RuntimeError(f"Could not resolve baseline for word {word!r}")


def fmt(value: float) -> str:
    return f"{value:.3f}"


def render_page(page: object, source_page_number: int) -> list[str]:
    output_page_number = source_page_number - 1
    lines = [
        "",
        r"\clearpage",
        "% =============================================================",
        f"% Page {output_page_number} - source PDF page {source_page_number}",
        "% Generated as editable text at the original PDF baselines.",
        "% =============================================================",
        r"\begin{tikzpicture}[remember picture,overlay]",
    ]

    # PDF rectangles are the table bands, cell borders, rules, and yellow
    # Word placeholders.  Paint them first so all text remains selectable.
    for rectangle in page.rects:
        red, green, blue = colour_triplet(rectangle.get("non_stroking_color"))
        lines.append(
            "  "
            + rf"\SourceFillRect{{{fmt(float(rectangle['x0']))}}}"
            + rf"{{{fmt(float(rectangle['top']))}}}"
            + rf"{{{fmt(float(rectangle['x1']))}}}"
            + rf"{{{fmt(float(rectangle['bottom']))}}}"
            + rf"{{{fmt(red)}}}{{{fmt(green)}}}{{{fmt(blue)}}}"
        )

    words = page.extract_words(
        extra_attrs=["fontname", "size", "non_stroking_color"],
        keep_blank_chars=False,
        use_text_flow=False,
    )
    for word in words:
        baseline_top = word_baseline_from_top(page, word)
        red, green, blue = colour_triplet(word.get("non_stroking_color"))
        command = font_command(str(word["fontname"]))
        escaped = latex_escape(str(word["text"]))
        lines.append(
            "  "
            + rf"\PlaceSourceWord{{{fmt(float(word['x0']))}}}"
            + rf"{{{fmt(baseline_top)}}}"
            + rf"{{{command}}}"
            + rf"{{{fmt(float(word['size']))}}}"
            + rf"{{{fmt(red)},{fmt(green)},{fmt(blue)}}}"
            + rf"{{{escaped}}}"
        )

    lines.extend([r"\end{tikzpicture}", r"\null"])
    return lines


def main() -> None:
    content = [
        "% This file is generated by tools/generate_luma_remaining_pages.py.",
        "% Edit wording here if desired; rerunning the generator replaces it.",
    ]
    with pdfplumber.open(SOURCE) as document:
        for source_page_number in SOURCE_PAGES:
            content.extend(render_page(document.pages[source_page_number - 1], source_page_number))
    OUTPUT.write_text("\n".join(content) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
