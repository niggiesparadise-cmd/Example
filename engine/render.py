"""Browser-backed rendering pipeline.

Two passes through headless Chromium.  The first measures every module at the
exact width it will occupy; the second lays the measured cards down at absolute
positions on the paper.  Nothing is left to automatic flow, so page fill is a
number the engine controls rather than an accident of the content length.
"""
import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

from playwright.sync_api import sync_playwright

from . import blocks, paper
from .layout import PageLayout, Placement, layout_page, overflow_check
from .sketch import rng, underline, _fmt
from .theme import Theme, rgba

CHROME_CANDIDATES = [
    os.environ.get("NOTEBOOK_CHROME", ""),
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
]


def _chrome() -> Optional[str]:
    for c in CHROME_CANDIDATES:
        if c and Path(c).exists():
            return c
    for c in ("chromium", "chromium-browser", "google-chrome"):
        p = shutil.which(c)
        if p:
            return p
    return None


def _find_chrome_glob() -> Optional[str]:
    root = Path("/opt/pw-browsers")
    if root.exists():
        for p in sorted(root.glob("chromium-*/chrome-linux/chrome")):
            return str(p)
    return None


# --------------------------------------------------------------------------
def head(theme: Theme, embed_fonts: bool = True) -> str:
    return (f"<!doctype html><html><head><meta charset='utf-8'>"
            f"<style>{paper.font_css(embed_fonts)}</style>"
            f"<style>{paper.stylesheet(theme)}</style>")


def masthead_html(theme: Theme, page_spec: Dict, seed: int) -> str:
    title = page_spec.get("title", "")
    kicker = page_spec.get("kicker", "")
    accent = page_spec.get("accent", "orange")
    parts = ['<div class="masthead" style="top:%gmm">' % theme.geom.margin_top]
    if kicker:
        parts.append(f'<p class="kicker">{blocks.inline(kicker)}</p>')
    if title:
        parts.append(f'<h1 class="doc-title">{blocks.inline(title)}</h1>')
    parts.append(
        f'<span class="rule-sketch" style="color:{theme.accent(accent)}">'
        f'{underline(theme.geom.content_w, seed + 3, amp=0.55, thickness=0.9)}</span>'
    )
    if page_spec.get("standfirst"):
        parts.append(
            f'<p style="margin:1.1mm 0 0;font-size:{theme.type.small_pt+.5:g}pt;'
            f'line-height:1.25;color:{theme.type.ink_soft}">'
            f'{blocks.inline(page_spec["standfirst"])}</p>')
    parts.append("</div>")
    return "".join(parts)


def footer_html(theme: Theme, page_spec: Dict, index: int, total: int,
                doc: Dict) -> str:
    left = page_spec.get("footer", doc.get("footer", ""))
    src = doc.get("source_note", "")
    return (f'<div class="footer"><span>{blocks.inline(left)}'
            f'{"  ·  " if left and src else ""}<span class="src">'
            f'{blocks.inline(src)}</span></span>'
            f'<span class="folio">{index + 1} / {total}</span></div>')


# --------------------------------------------------------------------------
@dataclass
class Rendered:
    html: str
    pages: List[PageLayout]
    warnings: List[str]


class Notebook:
    """Compiles a content document into a laid-out visual notebook."""

    def __init__(self, theme: Theme, doc: Dict):
        self.theme = theme
        self.doc = doc
        self.pages_spec: List[Dict] = doc["pages"]
        self.columns = int(doc.get("columns", theme.geom.columns))

    # -- pass 1 ------------------------------------------------------------
    def _measure_html(self) -> Tuple[str, List[Tuple[int, int, float]]]:
        """Render every module and masthead at its final width for measuring."""
        t = self.theme
        out = [head(t), "<style>",
               ".measure{padding:0;margin:0;}",
               ".probe{position:relative;margin:4mm 0;}",
               ".measure .card{position:relative!important;left:auto!important;"
               "top:auto!important;transform:none!important;}",
               ".measure .masthead{position:relative!important;left:auto!important;"
               "right:auto!important;top:auto!important;}",
               "</style></head><body class='measure'>"]
        index: List[Tuple[int, int, float]] = []
        for pi, ps in enumerate(self.pages_spec):
            cols = int(ps.get("columns", self.columns))
            mw = t.geom.content_w
            out.append(f'<div class="probe" id="mh{pi}" style="width:{mw:g}mm">'
                       f'{masthead_html(t, ps, t.seed + pi * 31)}</div>')
            for mi, mod in enumerate(ps.get("modules", [])):
                span = min(int(mod.get("span", 1)), cols)
                w = t.geom.span_w(span, cols)
                seed = t.seed + pi * 1013 + mi * 37
                out.append(
                    f'<div class="probe" id="m{pi}_{mi}" style="width:{w:g}mm">'
                    f'{blocks.render_module(t, mod, w, seed)}</div>')
                index.append((pi, mi, w))
        out.append("</body></html>")
        return "".join(out), index

    def measure(self, page) -> Tuple[Dict[Tuple[int, int], float], Dict[int, float]]:
        html, index = self._measure_html()
        page.set_content(html, wait_until="load")
        page.evaluate("document.fonts.ready")
        data = page.evaluate("""() => {
          const px2mm = 25.4 / 96;
          const out = {mods:{}, heads:{}};
          document.querySelectorAll('.probe').forEach(el => {
            const inner = el.firstElementChild;
            const h = inner.getBoundingClientRect().height * px2mm;
            if (el.id.startsWith('mh')) out.heads[el.id.slice(2)] = h;
            else out.mods[el.id.slice(1)] = h;
          });
          return out;
        }""")
        mods = {}
        for k, v in data["mods"].items():
            pi, mi = k.split("_")
            mods[(int(pi), int(mi))] = float(v)
        heads = {int(k): float(v) for k, v in data["heads"].items()}
        return mods, heads

    # -- pass 2 ------------------------------------------------------------
    def compose(self, mod_h: Dict[Tuple[int, int], float],
                head_h: Dict[int, float]) -> Rendered:
        t = self.theme
        g = t.geom
        pages: List[PageLayout] = []
        warnings: List[str] = []
        body = [head(t), "</head><body>"]
        total = len(self.pages_spec)

        for pi, ps in enumerate(self.pages_spec):
            cols = int(ps.get("columns", self.columns))
            mods = ps.get("modules", [])
            for mi, m in enumerate(mods):
                m["_mi"] = mi
            hs = [mod_h[(pi, mi)] for mi in range(len(mods))]
            spec = dict(ps)
            gap_after_head = ps.get("head_gap", 3.6)
            spec["_content_top"] = g.margin_top + head_h.get(pi, 22.0) + gap_after_head
            pl = layout_page(t, pi, spec, mods, hs, cols)
            warnings += pl.warnings
            warnings += overflow_check(t, pl)
            pages.append(pl)

            body.append(f'<section class="page" id="page{pi}">')
            body.append(paper.paper_svg(t, pi))
            if self.doc.get("holes", True):
                body.append(paper.punched_holes(t, pi))
            body.append('<div class="layer">')
            body.append(masthead_html(t, ps, t.seed + pi * 31))
            for p in pl.placements:
                seed = t.seed + pi * 1013 + p.mod.get("_mi", 0) * 37
                h = p.h + p.stretch
                card = blocks.render_module(t, p.mod, p.w, seed)
                pad = t.card.pad_y + p.stretch / 2
                style = (f"left:{p.x:.3f}mm;top:{p.y:.3f}mm;width:{p.w:.3f}mm;"
                         f"height:{h:.3f}mm;padding-top:{pad:.3f}mm;"
                         f"padding-bottom:{pad + .4:.3f}mm;")
                edge = (blocks.sketch_edge(t, p.w, h, seed + 91)
                        if t.card.sketch_border else "")
                card = card.replace('<div class="card"', f'<div class="card"', 1)
                card = card.replace('style="', f'style="{style}', 1)
                card = card.replace(">", ">" + edge, 1)
                body.append(card)
            body.append("</div>")
            body.append(footer_html(t, ps, pi, total, self.doc))
            body.append("</section>")
        body.append("</body></html>")
        return Rendered("".join(body), pages, warnings)

    # -- driver ------------------------------------------------------------
    def build(self, out_pdf: Path, html_path: Optional[Path] = None,
              verify: bool = True) -> Rendered:
        exe = _chrome() or _find_chrome_glob()
        if not exe:
            raise RuntimeError("no Chromium binary found; set NOTEBOOK_CHROME")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=exe, args=["--no-sandbox"])
            page = browser.new_page(viewport={"width": 1200, "height": 1600})
            mod_h, head_h = self.measure(page)
            rend = self.compose(mod_h, head_h)
            if html_path:
                Path(html_path).write_text(rend.html, encoding="utf-8")
            page.set_content(rend.html, wait_until="load")
            page.evaluate("document.fonts.ready")
            if verify:
                rend.warnings += self._verify(page)
            Path(out_pdf).parent.mkdir(parents=True, exist_ok=True)
            page.pdf(path=str(out_pdf), width=f"{self.theme.geom.width}mm",
                     height=f"{self.theme.geom.height}mm", print_background=True,
                     margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
                     prefer_css_page_size=True)
            browser.close()
        return rend

    def _verify(self, page) -> List[str]:
        """Confirm the real DOM matches the geometry the solver assumed."""
        data = page.evaluate("""() => {
          const px2mm = 25.4/96, out = [];
          document.querySelectorAll('.page').forEach((pg, pi) => {
            const pr = pg.getBoundingClientRect();
            pg.querySelectorAll('.card').forEach(c => {
              const r = c.getBoundingClientRect();
              let inner = 0;
              c.childNodes.forEach(n => {
                if (n.nodeType === 1 && !n.classList.contains('sketch-edge')) {
                  const b = n.getBoundingClientRect();
                  inner = Math.max(inner, b.bottom - r.top);
                }
              });
              out.push({p: pi, t: (c.querySelector('.card-title')||{}).textContent || '?',
                        h: (r.height)*px2mm, need: inner*px2mm,
                        bottom: (r.bottom - pr.top)*px2mm});
            });
          });
          return out;
        }""")
        errs = []
        limit = self.theme.geom.height - self.theme.geom.margin_bottom
        pad = self.theme.card.pad_y
        for d in data:
            if d["need"] > d["h"] - pad * 0.8:
                errs.append(f"page {d['p']+1}: card '{d['t'][:28]}' content exceeds box "
                            f"by {d['need'] - d['h']:.1f}mm")
            if d["bottom"] > limit + 0.8:
                errs.append(f"page {d['p']+1}: card '{d['t'][:28]}' runs past the bottom "
                            f"margin ({d['bottom']:.1f}mm > {limit:.1f}mm)")
        return errs


# --------------------------------------------------------------------------
def rasterize(pdf: Path, out_dir: Path, dpi: int = 110,
              pages: Optional[Sequence[int]] = None) -> List[Path]:
    import pymupdf
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf)
    made = []
    for i, pg in enumerate(doc):
        if pages is not None and i not in pages:
            continue
        pix = pg.get_pixmap(dpi=dpi)
        p = out_dir / f"page{i+1:02d}.png"
        pix.save(p)
        made.append(p)
    doc.close()
    return made
