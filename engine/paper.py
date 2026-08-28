"""The permanent paper layer and the document stylesheet.

Section C is the load-bearing rule of the whole system: the warm graph-paper
ground is a *background layer*, not a decorative rectangle behind the content.
It is emitted once per page as a full-bleed vector SVG at z-index 0 and every
card sits on top of it with a translucent fill, so the grid stays visible
through the content, between the cards and out to all four page edges.
"""
import base64
import math
from pathlib import Path
from typing import List

from .sketch import rng, smooth_path, jitter_points, densify, _fmt
from .theme import Theme, rgba, mix

FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"

_FONT_FACES = [
    # family,                file,                      weight,  style
    ("Caveat",               "Caveat[wght].ttf",        "400 700", "normal"),
    ("Patrick Hand",         "PatrickHand-Regular.ttf", "400",     "normal"),
    ("Source Sans 3",        "SourceSans3[wght].ttf",   "200 900", "normal"),
    ("IBM Plex Mono",        "IBMPlexMono-Regular.ttf", "400",     "normal"),
    ("IBM Plex Mono",        "IBMPlexMono-SemiBold.ttf", "600",    "normal"),
]


def font_css(embed: bool = False) -> str:
    """@font-face rules for the OFL text faces.

    `embed=True` base64-inlines the files so a saved .html is portable on its
    own; the default references them by file:// URL, which renders far faster
    and still produces a PDF with the subsets fully embedded.
    """
    out = []
    for family, fname, weight, style in _FONT_FACES:
        p = FONT_DIR / fname
        if not p.exists():
            continue
        if embed:
            b64 = base64.b64encode(p.read_bytes()).decode("ascii")
            src = f"url(data:font/ttf;base64,{b64}) format('truetype')"
        else:
            src = f"url('file://{p.as_posix()}') format('truetype')"
        out.append(
            f"@font-face{{font-family:'{family}';font-weight:{weight};"
            f"font-style:{style};font-display:block;src:{src};}}"
        )
    return "\n".join(out)


# --------------------------------------------------------------------------
# paper layer
# --------------------------------------------------------------------------
def paper_svg(theme: Theme, page_index: int = 0) -> str:
    """Full-bleed warm graph paper: stock, vignette, grid, fibre grain."""
    p = theme.paper
    g = theme.geom
    W, H = g.width, g.height
    r = rng(theme.seed + page_index * 977)

    parts: List[str] = []
    parts.append(
        f'<svg class="paper" xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {_fmt(W)} {_fmt(H)}" preserveAspectRatio="none" '
        f'width="100%" height="100%">'
    )
    # --- warm stock, slightly uneven so it reads as paper not as a fill ----
    parts.append(
        f'<defs>'
        f'<radialGradient id="vig{page_index}" cx="50%" cy="46%" r="76%">'
        f'<stop offset="0%" stop-color="{p.base}" stop-opacity="0"/>'
        f'<stop offset="62%" stop-color="{mix(p.base, p.base_edge, .55)}" stop-opacity="{p.vignette_alpha*.35:g}"/>'
        f'<stop offset="100%" stop-color="{p.base_edge}" stop-opacity="{p.vignette_alpha:g}"/>'
        f'</radialGradient></defs>'
    )
    parts.append(f'<rect width="{_fmt(W)}" height="{_fmt(H)}" fill="{p.base}"/>')

    # --- graph grid: every line, edge to edge, behind everything -----------
    minor, major_n = p.grid_minor_mm, p.grid_major_every
    minor_v, minor_h, major_v, major_h = [], [], [], []
    n_v = int(math.floor(W / minor))
    for i in range(0, n_v + 1):
        x = i * minor
        (major_v if i % major_n == 0 else minor_v).append(
            f"M {_fmt(x)} 0 L {_fmt(x)} {_fmt(H)}")
    n_h = int(math.floor(H / minor))
    for j in range(0, n_h + 1):
        y = j * minor
        (major_h if j % major_n == 0 else minor_h).append(
            f"M 0 {_fmt(y)} L {_fmt(W)} {_fmt(y)}")
    parts.append(
        f'<path d="{" ".join(minor_v + minor_h)}" stroke="{p.grid_minor_color}" '
        f'stroke-width="{p.grid_minor_w:g}" stroke-opacity="{p.grid_minor_alpha:g}" fill="none"/>'
    )
    parts.append(
        f'<path d="{" ".join(major_v + major_h)}" stroke="{p.grid_major_color}" '
        f'stroke-width="{p.grid_major_w:g}" stroke-opacity="{p.grid_major_alpha:g}" fill="none"/>'
    )

    # --- vignette above the grid so edges look like aged stock -------------
    parts.append(f'<rect width="{_fmt(W)}" height="{_fmt(H)}" fill="url(#vig{page_index})"/>')

    # --- paper fibre grain -------------------------------------------------
    grain = []
    for _ in range(p.grain_count):
        x, y = r.uniform(0, W), r.uniform(0, H)
        rad = r.uniform(0.05, 0.30)
        grain.append(f'<circle cx="{_fmt(x)}" cy="{_fmt(y)}" r="{rad:.2f}"/>')
    parts.append(
        f'<g fill="#7A6A4C" fill-opacity="{p.grain_alpha:g}" shape-rendering="auto">'
        + "".join(grain) + "</g>"
    )

    # --- a couple of very faint warm blotches, like handled paper ----------
    blot = []
    for _ in range(3):
        cx, cy = r.uniform(10, W - 10), r.uniform(20, H - 20)
        rr = r.uniform(28, 52)
        blot.append(
            f'<circle cx="{_fmt(cx)}" cy="{_fmt(cy)}" r="{_fmt(rr)}" fill="#C9B punch"/>'
            .replace("#C9B punch", p.base_edge)
        )
    parts.append(f'<g fill-opacity="0.05" shape-rendering="auto">' + "".join(blot) + "</g>")

    parts.append("</svg>")
    return "".join(parts)


def punched_holes(theme: Theme, page_index: int) -> str:
    """Optional ring-binder holes; keeps the sheet reading as a real notebook."""
    g = theme.geom
    r = rng(theme.seed + 31 + page_index)
    out = []
    for cy in (58.0, 148.5, 239.0):
        cy += r.uniform(-0.6, 0.6)
        out.append(
            f'<g><circle cx="6.2" cy="{_fmt(cy)}" r="2.5" fill="{theme.paper.base_edge}" '
            f'fill-opacity="0.55"/>'
            f'<circle cx="6.2" cy="{_fmt(cy)}" r="2.5" fill="none" stroke="#8C7A52" '
            f'stroke-opacity="0.30" stroke-width="0.25"/></g>'
        )
    return (f'<svg class="holes" xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {_fmt(g.width)} {_fmt(g.height)}" preserveAspectRatio="none" '
            f'width="100%" height="100%">' + "".join(out) + "</svg>")


# --------------------------------------------------------------------------
# stylesheet
# --------------------------------------------------------------------------
def stylesheet(theme: Theme) -> str:
    t, c, g, pa = theme.type, theme.card, theme.geom, theme.paper
    accent_vars = "\n".join(
        f"  --a-{k}: {v};\n  --w-{k}: {rgba(v, c.fill_alpha)};\n"
        f"  --ws-{k}: {rgba(v, c.fill_alpha_strong)};\n  --e-{k}: {rgba(v, c.edge_alpha)};"
        for k, v in theme.accents.items()
    )
    return f"""
:root {{
  --paper: {pa.base};
  --ink: {t.ink};
  --ink-soft: {t.ink_soft};
  --font-hand: {t.hand};
  --font-hand-alt: {t.hand_alt};
  --font-body: {t.body};
  --font-mono: {t.mono};
{accent_vars}
}}

* {{ box-sizing: border-box; }}
html, body {{ margin:0; padding:0; background: var(--paper); }}
body {{
  font-family: var(--font-body);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums lining-nums;
}}

@page {{ size: {g.width:g}mm {g.height:g}mm; margin: 0; }}

/* ---------------------------------------------------------------- page */
.page {{
  position: relative;
  width: {g.width:g}mm;
  height: {g.height:g}mm;
  overflow: hidden;
  background: var(--paper);
  page-break-after: always;
  break-after: page;
}}
.page:last-child {{ page-break-after: auto; break-after: auto; }}
.page > .paper, .page > .holes {{
  position: absolute; inset: 0; z-index: 0; display: block;
  width: 100%; height: 100%;
}}
.page > .holes {{ z-index: 1; }}
.layer {{ position: absolute; inset: 0; z-index: 2; }}

/* --------------------------------------------------------------- header */
.masthead {{ position: absolute; left: {g.margin_x:g}mm; right: {g.margin_x:g}mm; }}
.doc-title {{
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: {t.title_pt:g}pt;
  line-height: .92;
  letter-spacing: .1mm;
  color: var(--ink);
  margin: 0;
  transform: rotate(-.45deg);
  transform-origin: left center;
}}
.doc-title .tint {{ color: var(--a-orange); }}
.kicker {{
  font-family: var(--font-hand-alt);
  font-size: {t.kicker_pt:g}pt;
  color: var(--ink-soft);
  letter-spacing: .18mm;
  margin: 0;
}}
.rule-sketch {{ display:block; width:100%; height:2.4mm; color: var(--a-orange); }}
.rule-sketch svg {{ width:100%; height:100%; display:block; }}

/* ---------------------------------------------------------------- cards */
.card {{
  position: absolute;
  padding: {c.pad_y:g}mm {c.pad_x:g}mm {c.pad_y + .4:g}mm;
  border-radius: {c.radius:g}mm;
  background: var(--card-wash);
  /* the wash is the only fill — the grid must remain visible through it */
}}
.card > .sketch-edge {{
  position: absolute; inset: 0; z-index: -1; overflow: visible;
  width: 100%; height: 100%; pointer-events: none;
}}
.card.plain-edge {{ border: {c.edge_w:g}mm solid var(--card-edge); }}
.card-head {{
  display: flex; align-items: baseline; gap: 1.6mm;
  margin: 0 0 {c.head_gap:g}mm 0;
}}
.card-title {{
  font-family: var(--font-hand);
  font-weight: 700;
  font-size: {t.section_pt:g}pt;
  line-height: 1.0;
  color: var(--card-accent);
  position: relative;
  display: inline-block;
  white-space: nowrap;
}}
.card-title .ul {{
  position: absolute; left: 0; right: 0; bottom: -1.5mm; height: 1.5mm;
  color: var(--card-accent); opacity: .85;
}}
.card-title .ul svg {{ width: 100%; height: 100%; display: block; }}
.card-tag {{
  font-family: var(--font-body); font-weight: 600;
  font-size: {t.micro_pt:g}pt; letter-spacing: .28mm; text-transform: uppercase;
  color: var(--card-accent); opacity: .72; white-space: nowrap;
}}
.card-sub {{
  font-family: var(--font-hand-alt); font-size: {t.small_pt+.4:g}pt;
  color: var(--ink-soft); margin: -.6mm 0 1mm;
}}

/* --------------------------------------------------------------- bodies */
.card p {{ margin: 0 0 1.1mm; font-size: {t.body_pt:g}pt; line-height: {t.body_lh:g}; }}
.card p:last-child {{ margin-bottom: 0; }}
.card b, .card strong {{ font-weight: 700; color: var(--ink); }}
.card em {{ font-style: italic; }}
.hl {{
  background: var(--card-hl);
  padding: 0 .5mm; border-radius: .6mm;
  box-decoration-break: clone; -webkit-box-decoration-break: clone;
}}
.term {{ font-weight: 700; color: var(--card-accent); }}
.num {{ font-family: var(--font-mono); font-weight: 600; font-size: {t.body_pt-.35:g}pt; }}

ul.bul, ol.bul {{ margin: 0; padding: 0; list-style: none; }}
ul.bul > li, ol.bul > li {{
  position: relative; padding-left: 3.4mm; margin-bottom: .85mm;
  font-size: {t.body_pt:g}pt; line-height: {t.body_lh:g};
}}
ul.bul > li:last-child, ol.bul > li:last-child {{ margin-bottom: 0; }}
ul.bul > li::before {{
  content: ""; position: absolute; left: .7mm; top: 1.5mm;
  width: 1.25mm; height: 1.25mm; border-radius: 50% 40% 55% 45%;
  background: var(--card-accent); opacity: .78;
}}
ol.bul {{ counter-reset: n; }}
ol.bul > li {{ padding-left: 4.4mm; }}
ol.bul > li::before {{
  counter-increment: n; content: counter(n);
  position: absolute; left: 0; top: -.15mm;
  font-family: var(--font-hand); font-weight: 700;
  font-size: {t.body_pt+2.4:g}pt; line-height: 1.15;
  color: var(--card-accent); opacity: .9;
}}
.tick > li::before {{
  content: ""; width: 1.9mm; height: 1.1mm; border-radius: 0; background: none;
  border-left: .3mm solid var(--card-accent); border-bottom: .3mm solid var(--card-accent);
  transform: rotate(-45deg); left: .5mm; top: 1.1mm; opacity: .85;
}}
.cross > li::before {{
  content: "\\00d7"; background: none; width: auto; height: auto;
  font-family: var(--font-body); font-weight: 700; font-size: {t.body_pt:g}pt;
  color: var(--a-red); left: .5mm; top: -.2mm; opacity: .9;
}}

/* --------------------------------------------------------------- chips */
.chips {{ display: flex; flex-wrap: wrap; gap: 1.1mm; margin: .4mm 0 0; }}
.chip {{
  font-size: {t.micro_pt+.3:g}pt; line-height: 1.15;
  padding: .5mm 1.3mm; border-radius: 1mm .8mm 1.1mm .9mm;
  border: .22mm solid var(--card-edge);
  background: var(--card-wash-strong);
  white-space: nowrap;
}}
.chip .k {{ font-weight: 600; color: var(--card-accent); }}
.chip .v {{ font-family: var(--font-mono); font-weight: 600; }}

.stats {{ display: flex; gap: 1.6mm; }}
.stat {{ flex: 1; text-align: center; padding: .8mm .6mm 1mm; border-radius: 1.2mm;
  background: var(--card-wash-strong); border: .22mm solid var(--card-edge); }}
.stat .v {{ font-family: var(--font-hand); font-weight: 700; font-size: {t.body_pt+7:g}pt;
  line-height: .95; color: var(--card-accent); display: block; }}
.stat .l {{ font-size: {t.micro_pt:g}pt; line-height: 1.15; color: var(--ink-soft); display: block;
  margin-top: .5mm; }}

/* --------------------------------------------------------------- tables */
table.nb {{
  width: 100%; border-collapse: collapse; font-size: {t.small_pt:g}pt;
  line-height: 1.22; background: none;
}}
table.nb th {{
  font-family: var(--font-body); font-weight: 700; text-align: left;
  font-size: {t.small_pt-.15:g}pt;
  padding: .9mm 1.2mm; color: var(--ink);
  background: var(--card-wash-strong);
  border-bottom: .3mm solid var(--card-edge);
}}
table.nb td {{
  padding: .75mm 1.2mm; vertical-align: top;
  border-bottom: .18mm solid {rgba('#8C7A52', .30)};
}}
table.nb tr:last-child td {{ border-bottom: none; }}
table.nb tbody tr:nth-child(even) td {{ background: {rgba('#8C7A52', .045)}; }}
table.nb td.k {{ font-weight: 600; color: var(--ink); }}
table.nb td.n, table.nb th.n {{ font-family: var(--font-mono); font-weight: 500;
  font-size: {t.small_pt-.3:g}pt; white-space: nowrap; }}
table.nb .pos {{ color: var(--a-green); font-weight: 700; }}
table.nb .neg {{ color: var(--a-red); font-weight: 700; }}

/* ------------------------------------------------------------- formulas */
.formula {{ margin: .6mm 0; }}
.fx {{
  font-family: 'Source Sans 3', serif; font-size: {t.body_pt+1.2:g}pt;
  text-align: center; margin: .9mm 0; line-height: 1.25;
}}
.fx i, .var {{ font-style: italic; font-family: 'Source Sans 3', serif; }}
.fx .op {{ padding: 0 .7mm; }}
.frac {{ display: inline-block; vertical-align: -0.45em; text-align: center; margin: 0 .6mm; }}
.frac > span {{ display: block; padding: 0 .8mm; }}
.frac > span.den {{ border-top: .22mm solid var(--ink); padding-top: .2mm; }}
.calc-step {{ display: grid; grid-template-columns: 15mm 1fr; gap: .6mm 1.4mm;
  align-items: baseline; }}
.calc-step .lbl {{ font-family: var(--font-hand-alt); font-size: {t.small_pt:g}pt;
  color: var(--card-accent); text-align: right; }}
.calc-step .val {{ font-family: var(--font-mono); font-size: {t.small_pt+.2:g}pt; }}
.answer {{
  display: inline-block; margin-top: .8mm; padding: .8mm 2mm;
  font-family: var(--font-mono); font-weight: 600; font-size: {t.body_pt+1:g}pt;
  background: var(--card-wash-strong); border: .3mm solid var(--card-edge);
  border-radius: 1.2mm .9mm 1.3mm 1mm;
}}

/* ------------------------------------------------------------- diagrams */
.diagram {{ width: 100%; display: block; }}
.diagram svg {{ width: 100%; height: auto; display: block; overflow: visible; }}
.dg-label {{ font-family: var(--font-hand-alt); }}
.dg-body {{ font-family: var(--font-body); }}
.dg-mono {{ font-family: var(--font-mono); }}
.caption {{
  font-family: var(--font-hand-alt); font-size: {t.small_pt:g}pt;
  color: var(--ink-soft); margin-top: 1mm; text-align: center;
}}

/* ------------------------------------------------------------ marginalia */
.margin-note {{
  font-family: var(--font-hand-alt); font-size: {t.small_pt+.3:g}pt;
  color: var(--card-accent); line-height: 1.22;
}}
.footer {{
  position: absolute; left: {g.margin_x:g}mm; right: {g.margin_x:g}mm;
  bottom: {g.margin_bottom - 5.6:g}mm;
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: var(--font-hand-alt); font-size: {t.micro_pt+.5:g}pt;
  color: {rgba(t.ink_soft, .78)}; z-index: 3;
}}
.footer .src {{ font-family: var(--font-body); font-size: {t.micro_pt-.2:g}pt; opacity: .8; }}
.folio {{ font-family: var(--font-hand); font-weight: 700; font-size: {t.body_pt+2:g}pt;
  color: {rgba(t.ink_soft, .8)}; }}
"""
