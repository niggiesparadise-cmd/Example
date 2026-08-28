#!/usr/bin/env python3
"""Build every content document and assert the visual QC passes.

This is the check the brief's section S describes, made mechanical: render,
rasterise, measure, and fail loudly rather than assuming the first layout was
acceptable.  Run it after any change to the engine or to a content file.

    python selfcheck.py            # build + audit everything
    python selfcheck.py --png      # also write page images
"""
import argparse
import sys
import time
from pathlib import Path

from engine.audit import audit_pdf, report
from engine.cli import build_theme, load_doc
from engine.render import Notebook, rasterize

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
OUT = ROOT / "out"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--png", action="store_true", help="also rasterise pages")
    ap.add_argument("--dpi", type=int, default=110)
    args = ap.parse_args()

    docs = sorted(CONTENT.glob("*.yaml"))
    if not docs:
        print("no content documents found")
        return 1

    failures = 0
    for src in docs:
        t0 = time.time()
        doc = load_doc(src)
        theme = build_theme(doc)
        pdf = OUT / f"{src.stem}.pdf"
        rend = Notebook(theme, doc).build(pdf)
        hard = [w for w in rend.warnings
                if "overflow" in w or "runs past" in w or "overlaps" in w
                or "exceeds the sheet" in w]
        audits = audit_pdf(pdf, theme, rend.pages, layout_errors=hard)
        bad = sum(1 for a in audits if not a.ok)
        failures += bad

        print(f"\n=== {src.name} -> {pdf.relative_to(ROOT)} "
              f"({len(rend.pages)} pages, {time.time()-t0:.1f}s)")
        for w in rend.warnings:
            if w not in hard:
                print(f"  ! {w}")
        print(report(audits))
        if args.png:
            made = rasterize(pdf, OUT / "png" / src.stem, dpi=args.dpi)
            print(f"  wrote {len(made)} page images")

    print(f"\n{'FAILED' if failures else 'ALL DOCUMENTS PASS'}"
          f"{f' — {failures} page(s)' if failures else ''}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
