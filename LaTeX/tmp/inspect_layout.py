from __future__ import annotations

import collections
import sys

import pdfplumber


def describe(path: str, pages: list[int]) -> None:
    print(f"\n=== {path} ===")
    with pdfplumber.open(path) as pdf:
        for page_number in pages:
            page = pdf.pages[page_number - 1]
            print(f"\nPAGE {page_number}: {page.width:.2f} x {page.height:.2f}")
            print("IMAGES")
            for image in page.images:
                print(
                    "  ",
                    {
                        key: round(image[key], 2) if isinstance(image.get(key), float) else image.get(key)
                        for key in ("x0", "top", "x1", "bottom", "width", "height", "name")
                    },
                )
            print("WORDS")
            words = page.extract_words(
                x_tolerance=1,
                y_tolerance=2,
                keep_blank_chars=False,
                extra_attrs=["fontname", "size", "non_stroking_color"],
            )
            for word in words:
                print(
                    f"  {word['text']!r:<32} "
                    f"x={word['x0']:6.1f}-{word['x1']:6.1f} "
                    f"top={word['top']:6.1f}-{word['bottom']:6.1f} "
                    f"font={word['fontname']} size={word['size']:.2f} "
                    f"color={word['non_stroking_color']}"
                )
            print("RECTS", len(page.rects), "CURVES", len(page.curves), "LINES", len(page.lines))


if __name__ == "__main__":
    describe(sys.argv[1], [int(value) for value in sys.argv[2:]])
