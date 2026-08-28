"""Command line: build a content document into a visual notebook."""
import argparse
import sys
from pathlib import Path

import yaml

from .audit import audit_pdf, report
from .render import Notebook, rasterize
from .theme import DEFAULT, Theme
from dataclasses import replace


def load_doc(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def build_theme(doc: dict) -> Theme:
    t = DEFAULT
    style = doc.get("style") or {}
    if "seed" in style:
        t = replace(t, seed=int(style["seed"]))
    if "columns" in doc:
        t = t.with_columns(int(doc["columns"]))
    paper = style.get("paper") or {}
    if paper:
        t = replace(t, paper=replace(t.paper, **paper))
    card = style.get("card") or {}
    if card:
        t = replace(t, card=replace(t.card, **card))
    typo = style.get("type") or {}
    if typo:
        t = replace(t, type=replace(t.type, **typo))
    geom = style.get("geom") or {}
    if geom:
        t = replace(t, geom=replace(t.geom, **geom))
    return t


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="notebook", description=__doc__)
    ap.add_argument("content", type=Path, help="content YAML")
    ap.add_argument("-o", "--out", type=Path, default=None, help="output PDF")
    ap.add_argument("--html", type=Path, default=None, help="also write the HTML")
    ap.add_argument("--png", type=Path, default=None, help="rasterise pages into this dir")
    ap.add_argument("--dpi", type=int, default=110)
    ap.add_argument("--audit", action="store_true", help="run the visual QC pass")
    ap.add_argument("--json", action="store_true", help="emit the audit as JSON")
    ap.add_argument("--strict", action="store_true",
                    help="exit non-zero if any page fails QC")
    args = ap.parse_args(argv)

    doc = load_doc(args.content)
    theme = build_theme(doc)
    out = args.out or Path("out") / (args.content.stem + ".pdf")
    nb = Notebook(theme, doc)
    rend = nb.build(out, args.html)

    print(f"built {out}  ({len(rend.pages)} pages)")
    for w in rend.warnings:
        print(f"  ! {w}")
    if args.png:
        made = rasterize(out, args.png, dpi=args.dpi)
        print(f"rasterised {len(made)} page images -> {args.png}")

    failed = 0
    if args.audit or args.strict or args.json:
        hard = [w for w in rend.warnings
                if 'overflow' in w or 'runs past' in w or 'overlaps' in w
                or 'exceeds the sheet' in w]
        audits = audit_pdf(out, theme, rend.pages, layout_errors=hard)
        print(report(audits, as_json=args.json))
        failed = sum(1 for a in audits if not a.ok)
    return 1 if (args.strict and failed) else 0


if __name__ == "__main__":
    sys.exit(main())
