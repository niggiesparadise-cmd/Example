"""Automated visual quality control (sections S and T).

The brief's failure conditions are visual, so the checks are made on rendered
pixels rather than on the source: the PDF is rasterised and each page is
measured for background warmth, grid continuity, grid visibility *through* the
cards, ink coverage, and how much of the bottom third carries information.
Layout-side numbers (fill, vertical utilisation) are folded in from the solver.
"""
import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pymupdf

from .layout import PageLayout
from .theme import Theme


@dataclass
class PageAudit:
    page: int
    white_fraction: float          # near-pure-white pixels — must be ~0
    paper_warmth: float            # mean (R-B); warm stock is clearly positive
    grid_outside: float            # grid contrast on bare paper
    grid_inside: float             # grid contrast under the cards
    grid_ratio: float              # inside/outside — cards must stay translucent
    grid_coverage: float           # fraction of the sheet carrying grid signal
    ink_total: float
    ink_bands: Tuple[float, float, float]
    fill: float = 0.0
    vertical: float = 0.0
    layout_bands: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    failures: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failures


def _grid_contrast(gray: np.ndarray, mm2px: float, spacing_mm: float,
                   mask: Optional[np.ndarray] = None, x_phase: float = 0.0) -> float:
    """Luminance dip on grid lines versus the cell centres between them.

    A visible grid makes the pixels that sit on a line measurably darker than
    the ones halfway between two lines; a card that hides the grid collapses
    that difference toward zero.
    """
    h, w = gray.shape
    step = spacing_mm * mm2px
    # x_phase keeps a sub-tile sample aligned with the page's real grid lines
    start = -(x_phase % step)
    line_x = np.round(np.arange(start, w, step)).astype(int)
    mid_x = np.round(np.arange(start + step / 2, w, step)).astype(int)
    line_x = line_x[(line_x > 1) & (line_x < w - 2)]
    mid_x = mid_x[(mid_x > 1) & (mid_x < w - 2)]
    if len(line_x) < 2 or len(mid_x) < 2:
        return 0.0
    if mask is None:
        mask = np.ones_like(gray, dtype=bool)
    on = gray[:, line_x]
    on_m = mask[:, line_x]
    off = gray[:, mid_x]
    off_m = mask[:, mid_x]
    if on_m.sum() < 50 or off_m.sum() < 50:
        return 0.0
    return float(off[off_m].mean() - on[on_m].mean())


def _card_mask(shape: Tuple[int, int], placements, mm2px: float,
               inset_mm: float = 3.0) -> np.ndarray:
    m = np.zeros(shape, dtype=bool)
    h, w = shape
    for p in placements:
        x0 = int((p.x + inset_mm) * mm2px)
        x1 = int((p.x + p.w - inset_mm) * mm2px)
        y0 = int((p.y + inset_mm) * mm2px)
        y1 = int((p.bottom - inset_mm) * mm2px)
        if x1 - x0 > 4 and y1 - y0 > 4:
            m[max(0, y0):min(h, y1), max(0, x0):min(w, x1)] = True
    return m


def audit_pdf(pdf: Path, theme: Theme, pages: Optional[List[PageLayout]] = None,
              dpi: int = 150, layout_errors: Optional[List[str]] = None) -> List[PageAudit]:
    doc = pymupdf.open(pdf)
    mm2px = dpi / 25.4
    out: List[PageAudit] = []
    d = theme.density
    for i, pg in enumerate(doc):
        pix = pg.get_pixmap(dpi=dpi)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        rgb = arr[:, :, :3].astype(np.float32)
        gray = rgb.mean(axis=2)
        h, w = gray.shape

        white = float(((rgb > 246).all(axis=2)).mean())
        warmth = float((rgb[:, :, 0] - rgb[:, :, 2]).mean())

        lay = pages[i] if pages and i < len(pages) else None
        if lay:
            inside = _card_mask(gray.shape, lay.placements, mm2px)
        else:
            inside = np.zeros_like(gray, dtype=bool)
        outside = ~inside
        # Exclude glyph pixels but keep the grid hairlines: text sits far below
        # the paper tone, a grid line only ~10 levels below it.
        paper_tone = float(np.percentile(gray, 92))
        legible = gray > (paper_tone - 30)
        g_out = _grid_contrast(gray, mm2px, theme.paper.grid_minor_mm, outside & legible)
        g_in = _grid_contrast(gray, mm2px, theme.paper.grid_minor_mm, inside & legible)
        ratio = (g_in / g_out) if g_out > 1e-6 else 0.0

        # grid coverage: does the grid signal reach every part of the sheet?
        # Tile the whole sheet and ask each tile whether the grid is present.
        # Tiles that are almost entirely overprinted cannot answer, so they are
        # excluded rather than counted as a missing grid.
        tiles, hit = 0, 0
        ts = int(25 * mm2px)
        ys = list(range(0, max(1, h - ts // 2), ts))
        xs = list(range(0, max(1, w - ts // 2), ts))
        for y in ys:
            for x in xs:
                tile = gray[y:min(y + ts, h), x:min(x + ts, w)]
                if tile.shape[0] < 8 or tile.shape[1] < 8:
                    continue
                tmask = tile > (float(np.percentile(tile, 90)) - 30)
                if tmask.mean() < 0.35:
                    continue          # too much ink here to judge
                tiles += 1
                if _grid_contrast(tile, mm2px, theme.paper.grid_minor_mm,
                                  mask=tmask, x_phase=x) > 0.55:
                    hit += 1
        coverage = hit / tiles if tiles else 0.0

        # ink = anything meaningfully darker than the local paper tone
        paper_level = np.percentile(gray, 92)
        ink = gray < (paper_level - 14)
        g = theme.geom
        top = int(g.margin_top * mm2px)
        bot = int((g.height - g.margin_bottom) * mm2px)
        body = ink[top:bot, int(g.margin_x * mm2px):int((g.width - g.margin_x) * mm2px)]
        bh = body.shape[0] // 3
        bands = tuple(float(body[k * bh:(k + 1) * bh].mean()) for k in range(3))
        ink_total = float(body.mean())

        a = PageAudit(page=i + 1, white_fraction=white, paper_warmth=warmth,
                      grid_outside=g_out, grid_inside=g_in, grid_ratio=ratio,
                      grid_coverage=coverage, ink_total=ink_total, ink_bands=bands)
        if lay:
            a.fill, a.vertical = lay.fill, lay.vertical
            a.layout_bands = lay.bands

        # ---- section T failure conditions --------------------------------
        if white > 0.02:
            a.failures.append(f"background is pure white over {white:.1%} of the page")
        if warmth < 8:
            a.failures.append(f"paper is not warm enough (R-B = {warmth:.1f})")
        if coverage < 0.98:
            a.failures.append(f"grid reaches only {coverage:.0%} of the sheet")
        if g_out < 1.0:
            a.failures.append(f"grid is too faint to read (contrast {g_out:.2f})")
        if inside.any() and ratio < 0.45:
            a.failures.append(f"cards hide the grid (inside/outside contrast {ratio:.0%})")
        if lay:
            if lay.fill < d.hard_min:
                a.failures.append(f"page is sparse: {lay.fill:.0%} filled "
                                  f"(minimum {d.hard_min:.0%})")
            elif lay.fill < d.target_min:
                a.notes.append(f"fill {lay.fill:.0%} is under the {d.target_min:.0%} target")
            if lay.fill > 0.97:
                a.notes.append(f"fill {lay.fill:.0%} — check for crowding")
            if lay.bands[2] < d.bottom_band_min:
                a.failures.append(f"bottom third carries only {lay.bands[2]:.0%} of content")
            if lay.vertical < 0.93:
                a.failures.append(f"content stops at {lay.vertical:.0%} of the page height")
        for err in (layout_errors or []):
            if err.startswith(f"page {i+1}:"):
                a.failures.append(err.split(":", 1)[1].strip())
        if bands[2] < 0.012:
            a.failures.append(f"bottom third is visually empty (ink {bands[2]:.1%})")
        if max(bands) > 0 and bands[2] < max(bands) * 0.28:
            a.notes.append("content is noticeably top-heavy")
        out.append(a)
    doc.close()
    return out


def report(audits: Sequence[PageAudit], as_json: bool = False) -> str:
    if as_json:
        return json.dumps([asdict(a) for a in audits], indent=2)
    lines = []
    head = (f"{'pg':>3} {'fill':>6} {'vert':>6} {'bands (top/mid/btm)':>22} "
            f"{'ink':>6} {'grid out/in':>12} {'cov':>5} {'white':>6}  status")
    lines.append(head)
    lines.append("-" * len(head))
    for a in audits:
        st = "OK" if a.ok else "FAIL"
        lines.append(
            f"{a.page:>3} {a.fill:>6.0%} {a.vertical:>6.0%} "
            f"{a.layout_bands[0]:>6.0%}{a.layout_bands[1]:>8.0%}{a.layout_bands[2]:>8.0%} "
            f"{a.ink_total:>6.1%} {a.grid_outside:>5.2f}/{a.grid_inside:<6.2f} "
            f"{a.grid_coverage:>5.0%} {a.white_fraction:>6.1%}  {st}"
        )
        for f in a.failures:
            lines.append(f"      ✗ {f}")
        for n in a.notes:
            lines.append(f"      · {n}")
    bad = sum(1 for a in audits if not a.ok)
    lines.append("-" * len(head))
    lines.append(f"{len(audits)} pages · {len(audits)-bad} pass · {bad} fail")
    return "\n".join(lines)
