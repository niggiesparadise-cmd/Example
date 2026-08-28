"""Measurement-driven page layout and the density solver (sections E and F).

Automatic flow layouts are the main cause of sparse pages, so nothing here is
left to the browser: every module's height is measured first, modules are then
packed into columns in reading order, and the leftover vertical space is
actively spent — first widening the gaps, then letting stretchable cards
breathe — until the page reaches the 80–92 % utilisation band.  Whatever slack
cannot be spent is reported, so the author adds information rather than the
engine adding padding.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from .theme import Theme


@dataclass
class Placement:
    mod: Dict
    x: float
    y: float
    w: float
    h: float
    span: int
    col: int
    stretch: float = 0.0     # extra height absorbed as internal padding

    @property
    def bottom(self) -> float:
        return self.y + self.h + self.stretch


@dataclass
class PageLayout:
    index: int
    spec: Dict
    placements: List[Placement] = field(default_factory=list)
    fill: float = 0.0          # fraction of the content box covered by cards
    vertical: float = 0.0      # fraction of content height actually reached
    bands: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    slack: float = 0.0         # mm of space that could not be spent
    warnings: List[str] = field(default_factory=list)


# --------------------------------------------------------------------------
def _split_ordered(heights: Sequence[float], n_cols: int) -> List[List[int]]:
    """Split an ordered run of modules into n balanced columns, keeping order.

    Reading order is preserved (newspaper columns), which matters more for a
    revision sheet than perfectly equal column heights.
    """
    k = len(heights)
    if k == 0:
        return [[] for _ in range(n_cols)]
    if n_cols == 1:
        return [list(range(k))]

    best: Optional[Tuple[tuple, List[int]]] = None

    def rec(start: int, col: int, cuts: List[int]):
        nonlocal best
        if col == n_cols - 1:
            groups = []
            prev = 0
            for c in cuts:
                groups.append(list(range(prev, c)))
                prev = c
            groups.append(list(range(prev, k)))
            col_h = [sum(heights[i] for i in g) for g in groups]
            tall = max(col_h)
            # On a tie, fill the earlier columns first: a lone card must land
            # in the left column, never leave a hole where the reader starts.
            score = (tall, tuple(-c for c in col_h))
            if best is None or score < best[0]:
                best = (score, list(cuts))
            return
        for c in range(start, k + 1):
            rec(c, col + 1, cuts + [c])

    rec(0, 0, [])
    cuts = best[1] if best else []
    groups, prev = [], 0
    for c in cuts:
        groups.append(list(range(prev, c)))
        prev = c
    groups.append(list(range(prev, k)))
    return groups


def _bands_of(mods: Sequence[Dict], n_cols: int) -> List[Tuple[bool, List[int]]]:
    """Group modules into full-width bands and multi-column runs."""
    out: List[Tuple[bool, List[int]]] = []
    run: List[int] = []
    for i, m in enumerate(mods):
        full = int(m.get("span", 1)) >= n_cols
        if full:
            if run:
                out.append((False, run))
                run = []
            out.append((True, [i]))
        else:
            run.append(i)
    if run:
        out.append((False, run))
    return out


# --------------------------------------------------------------------------
def layout_page(theme: Theme, index: int, spec: Dict, mods: List[Dict],
                heights: List[float], n_cols: int) -> PageLayout:
    """Place one page's modules and actively spend the leftover height.

    Slack is distributed *per column*, not per page, so every column reaches
    the foot of the sheet.  A page-wide justification leaves one column short
    and produces exactly the ragged empty corner section T calls a failure.
    """
    g = theme.geom
    top = spec.get("_content_top", g.margin_top)
    avail_h = g.height - g.margin_bottom - top
    page = PageLayout(index=index, spec=spec)

    bands = _bands_of(mods, n_cols)

    # ---- 1. natural geometry ---------------------------------------------
    band_layout: List[Dict] = []
    for is_full, idxs in bands:
        if is_full:
            i = idxs[0]
            band_layout.append({"full": True, "cols": [[i]], "nat": heights[i]})
        else:
            hs = [heights[i] for i in idxs]
            groups = _split_ordered(hs, n_cols)
            cols = [[idxs[j] for j in grp] for grp in groups]
            nat = max((sum(heights[i] for i in c) + g.v_gap * max(0, len(c) - 1))
                      for c in cols) if cols else 0.0
            band_layout.append({"full": False, "cols": cols, "nat": nat})

    n_band_gaps = max(0, len(band_layout) - 1)
    natural = sum(b["nat"] for b in band_layout) + n_band_gaps * g.v_gap
    slack = avail_h - natural

    # ---- 2a. over-full page: close the gaps before anything spills --------
    min_gap = 1.4
    tight_gap = g.v_gap
    if slack < 0:
        gap_slots = n_band_gaps
        for b in band_layout:
            if not b["full"]:
                gap_slots += max(0, max((len(c) for c in b["cols"]), default=1) - 1)
        recoverable = (g.v_gap - min_gap) * gap_slots
        take = min(-slack, recoverable)
        if gap_slots:
            tight_gap = g.v_gap - take / gap_slots
        # recompute the natural band heights at the tighter gap
        for b in band_layout:
            if not b["full"]:
                b["nat"] = max(
                    (sum(heights[i] for i in c) + tight_gap * max(0, len(c) - 1))
                    for c in b["cols"])
        natural = sum(b["nat"] for b in band_layout) + n_band_gaps * tight_gap
        slack = avail_h - natural
        if slack < -0.5:
            page.warnings.append(
                f"page {index+1}: content exceeds the sheet by {-slack:.0f}mm even at "
                f"minimum spacing — move a module to another page")

    # ---- 2. share the slack between bands, then hand it to their columns --
    band_gap = tight_gap
    if slack > 0.2 and n_band_gaps:
        add = min((g.v_gap_max - tight_gap), slack * 0.35 / n_band_gaps)
        band_gap = tight_gap + add
        slack -= add * n_band_gaps

    weights = [max(b["nat"], 1.0) for b in band_layout]
    wsum = sum(weights) or 1.0
    targets = [b["nat"] + (slack * w / wsum if slack > 0 else 0.0)
               for b, w in zip(band_layout, weights)]

    stretch: Dict[int, float] = {}
    gaps: Dict[Tuple[int, int], float] = {}
    residual = 0.0

    for bi, b in enumerate(band_layout):
        target = targets[bi]
        for ci, col in enumerate(b["cols"]):
            nat = sum(heights[i] for i in col) + tight_gap * max(0, len(col) - 1)
            extra = max(0.0, target - nat)
            n_gaps = max(0, len(col) - 1)
            gap = tight_gap
            if extra > 0.05 and n_gaps:
                add = min(g.v_gap_max - tight_gap, extra / n_gaps)
                gap = tight_gap + add
                extra -= add * n_gaps
            gaps[(bi, ci)] = gap
            if extra > 0.05:
                flex = [i for i in col if mods[i].get("stretch", True)
                        and mods[i].get("type") != "diagram"]
                cap = sum(min(heights[i] * 0.20, 11.0) for i in flex)
                take = min(extra, cap)
                if cap > 0:
                    for i in flex:
                        stretch[i] = stretch.get(i, 0.0) + take * (
                            min(heights[i] * 0.20, 11.0) / cap)
                extra -= take
            residual = max(residual, extra)

    # ---- 3. absolute placement -------------------------------------------
    y = top
    for bi, b in enumerate(band_layout):
        band_bottom = y
        for ci, col in enumerate(b["cols"]):
            gap = gaps[(bi, ci)]
            cy = y
            for i in col:
                h = heights[i] + stretch.get(i, 0.0)
                span = min(int(mods[i].get("span", 1)), n_cols)
                x = g.margin_x if b["full"] else g.col_x(ci, n_cols)
                w = g.span_w(n_cols, n_cols) if b["full"] else g.span_w(span, n_cols)
                page.placements.append(
                    Placement(mods[i], x, cy, w, heights[i], span, ci,
                              stretch.get(i, 0.0)))
                cy += h + gap
            band_bottom = max(band_bottom, cy - gap)
        y = band_bottom + band_gap

    # ---- 4. metrics -------------------------------------------------------
    content_area = g.content_w * avail_h
    card_area = sum(p.w * (p.h + p.stretch) for p in page.placements)
    page.fill = card_area / content_area if content_area else 0.0
    bottom = max((p.bottom for p in page.placements), default=top)
    page.vertical = (bottom - top) / avail_h if avail_h else 0.0
    page.slack = max(0.0, avail_h - (bottom - top)) + residual

    thirds = []
    for t in range(3):
        a = top + avail_h * t / 3
        bnd = top + avail_h * (t + 1) / 3
        covered = 0.0
        for p in page.placements:
            lo, hi = max(a, p.y), min(bnd, p.bottom)
            if hi > lo:
                covered += p.w * (hi - lo)
        thirds.append(covered / (g.content_w * avail_h / 3))
    page.bands = tuple(thirds)

    if n_cols > 1:
        for bi, b in enumerate(band_layout):
            if b["full"]:
                continue
            empty = [ci for ci, c in enumerate(b["cols"]) if not c]
            if empty and any(b["cols"]):
                titles = [mods[i].get("title", "?") for c in b["cols"] for i in c]
                page.warnings.append(
                    f"page {index+1}: '{titles[0]}' sits alone across a row — "
                    f"{len(empty)} column(s) left blank beside it; add a companion "
                    f"module or give it span: {n_cols}")

    d = theme.density
    if page.fill < d.hard_min:
        page.warnings.append(f"page {index+1}: fill {page.fill:.0%} below hard minimum "
                             f"{d.hard_min:.0%} — add modules")
    elif page.fill < d.target_min:
        page.warnings.append(f"page {index+1}: fill {page.fill:.0%} under target "
                             f"{d.target_min:.0%}")
    if page.fill > 0.97:
        page.warnings.append(f"page {index+1}: fill {page.fill:.0%} — risk of crowding")
    if thirds[2] < d.bottom_band_min:
        page.warnings.append(f"page {index+1}: bottom third only {thirds[2]:.0%} covered")
    if residual > 12:
        page.warnings.append(f"page {index+1}: {residual:.0f}mm of height could not be "
                             f"filled — add a module")
    return page


def overflow_check(theme: Theme, page: PageLayout) -> List[str]:
    """Cards must not collide or run off the sheet."""
    g = theme.geom
    errs = []
    limit = g.height - g.margin_bottom
    for p in page.placements:
        if p.bottom > limit + 0.6:
            errs.append(f"page {page.index+1}: '{p.mod.get('title','?')}' overflows by "
                        f"{p.bottom - limit:.1f}mm")
    ps = page.placements
    for i in range(len(ps)):
        for j in range(i + 1, len(ps)):
            a, b = ps[i], ps[j]
            ox = min(a.x + a.w, b.x + b.w) - max(a.x, b.x)
            oy = min(a.bottom, b.bottom) - max(a.y, b.y)
            if ox > 0.5 and oy > 0.5:
                errs.append(f"page {page.index+1}: '{a.mod.get('title','?')}' overlaps "
                            f"'{b.mod.get('title','?')}' by {oy:.1f}mm")
    return errs
