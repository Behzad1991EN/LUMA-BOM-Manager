from __future__ import annotations

import sys

import pdfplumber


def lines(path: str, page_number: int) -> None:
    with pdfplumber.open(path) as pdf:
        words = pdf.pages[page_number - 1].extract_words(
            x_tolerance=1,
            y_tolerance=2,
            extra_attrs=["fontname", "size", "non_stroking_color"],
        )
    groups: list[list[dict]] = []
    for word in words:
        if not groups or abs(groups[-1][0]["top"] - word["top"]) > 0.5:
            groups.append([word])
        else:
            groups[-1].append(word)
    print(f"\n{path} page {page_number}")
    for group in groups:
        text = " ".join(word["text"] for word in group)
        print(
            f"top={group[0]['top']:.2f} x={group[0]['x0']:.2f}-{group[-1]['x1']:.2f} "
            f"size={group[0]['size']:.2f} {text}"
        )


if __name__ == "__main__":
    lines(sys.argv[1], int(sys.argv[2]))
