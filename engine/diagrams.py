"""Subject-agnostic hand-drawn SVG diagram library (sections I and K).

Every generator returns an SVG string whose coordinate system is millimetres,
so a diagram composes with the rest of the page geometry directly.  The visual
language is fixed — thin muted strokes, translucent node fills, handwritten
labels, restrained pen arrows — while the *structures* (loop, flow, cycle,
curve, scale, hierarchy, timeline, matrix) are generic enough to carry
chemistry, law, computer science or medicine without changing the look.
"""
import math
from dataclasses import dataclass, field
from html import escape
from typing import Dict, List, Optional, Sequence, Tuple

from . import sketch
from .sketch import _fmt, arrow, rough_circle, rough_rect, rng
from .theme import Theme, rgba

PT = 0.352778  # 1pt in mm


# --------------------------------------------------------------------------
def wrap(text: str, max_mm: float, size_pt: float, char_ratio: float = 0.50) -> List[str]:
    """Greedy word wrap using an average advance-width estimate."""
    if "\n" in text:
        out: List[str] = []
        for chunk in text.split("\n"):
            out += wrap(chunk, max_mm, size_pt, char_ratio) or [""]
        return out
    cw = size_pt * PT * char_ratio
    limit = max(4, int(max_mm / cw))
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if len(trial) <= limit or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def text_w(text: str, size_pt: float, char_ratio: float = 0.50) -> float:
    return len(text) * size_pt * PT * char_ratio


class Canvas:
    """Accumulates SVG in millimetre coordinates."""

    def __init__(self, theme: Theme, w: float, h: float, seed: int = 0):
        self.t, self.w, self.h = theme, w, h
        self.seed = theme.seed + seed
        self.body: List[str] = []
        self.defs: List[str] = []
        self._n = 0

    def nid(self) -> int:
        self._n += 1
        return self.seed + self._n * 131

    # -- primitives --------------------------------------------------------
    def add(self, s: str):
        self.body.append(s)

    def stroke(self, d: str, color: str, w: float = 0.25, opacity: float = 1.0,
               dash: str = None, cap: str = "round"):
        dash_a = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w:g}" '
                 f'stroke-opacity="{opacity:g}" stroke-linecap="{cap}" '
                 f'stroke-linejoin="round"{dash_a}/>')

    def fill(self, d: str, color: str, opacity: float = 1.0):
        self.add(f'<path d="{d}" fill="{color}" fill-opacity="{opacity:g}" stroke="none"/>')

    def text(self, x: float, y: float, s: str, size_pt: float = 7.0,
             color: str = None, anchor: str = "middle", cls: str = "dg-body",
             weight: str = "400", italic: bool = False, opacity: float = 1.0,
             rotate: float = 0.0):
        color = color or self.t.type.ink
        it = ' font-style="italic"' if italic else ""
        tr = (f' transform="rotate({rotate:g} {_fmt(x)} {_fmt(y)})"'
              if abs(rotate) > 1e-6 else "")
        self.add(
            f'<text class="{cls}" x="{_fmt(x)}" y="{_fmt(y)}" font-size="{size_pt*PT:.3f}" '
            f'fill="{color}" fill-opacity="{opacity:g}" text-anchor="{anchor}" '
            f'font-weight="{weight}"{it}{tr}>{escape(s)}</text>'
        )

    def text_block(self, x: float, y: float, lines: Sequence[str], size_pt: float,
                   lh: float = 1.18, **kw):
        step = size_pt * PT * lh
        for i, ln in enumerate(lines):
            self.text(x, y + i * step, ln, size_pt, **kw)
        return y + max(0, len(lines) - 1) * step

    def vtext_block(self, x: float, y: float, lines: Sequence[str], size_pt: float,
                    lh: float = 1.15, color: str = None, cls: str = "dg-label",
                    weight: str = "400", up: bool = True):
        """Multi-line text rotated as one block, so the lines stay parallel."""
        color = color or self.t.type.ink
        step = size_pt * PT * lh
        ang = -90 if up else 90
        off = -(len(lines) - 1) * step / 2
        body = "".join(
            f'<text class="{cls}" x="0" y="{_fmt(off + i * step)}" '
            f'font-size="{size_pt*PT:.3f}" fill="{color}" text-anchor="middle" '
            f'font-weight="{weight}">{escape(ln)}</text>'
            for i, ln in enumerate(lines)
        )
        self.add(f'<g transform="translate({_fmt(x)},{_fmt(y)}) rotate({ang})">{body}</g>')

    def arrow(self, a: Tuple[float, float], b: Tuple[float, float], color: str,
              w: float = 0.28, curve: float = 0.0, head: float = 1.5,
              dash: str = None, opacity: float = 1.0):
        s = self.nid()
        shaft, hd = arrow(a, b, s, amp=0.18, head=head, curve=curve)
        self.stroke(shaft, color, w, opacity, dash)
        self.stroke(hd, color, w, opacity)

    def node(self, x: float, y: float, w: float, h: float, label: str,
             accent: str = "teal", size_pt: float = 7.2, sub: str = None,
             strong: bool = False, radius: float = 1.6, weight: str = "600",
             cls: str = "dg-body"):
        """A translucent rounded node with a hand-drawn edge."""
        col = self.t.accent(accent)
        self.fill(rough_rect(x, y, w, h, radius, self.nid(), 0.10), col,
                  self.t.card.fill_alpha_strong if strong else self.t.card.fill_alpha)
        self.stroke(rough_rect(x, y, w, h, radius, self.nid(), 0.26), col, 0.26,
                    self.t.card.edge_alpha + (0.2 if strong else 0.0))
        lines = wrap(label, w - 2.4, size_pt)
        sub_lines = wrap(sub, w - 2.4, size_pt - 1.1) if sub else []
        lh = size_pt * PT * 1.12
        slh = (size_pt - 1.1) * PT * 1.1
        total = len(lines) * lh + len(sub_lines) * slh
        y0 = y + h / 2 - total / 2 + lh * 0.72
        yy = self.text_block(x + w / 2, y0, lines, size_pt, 1.12, cls=cls,
                             weight=weight, color=self.t.type.ink)
        if sub_lines:
            self.text_block(x + w / 2, yy + slh * 1.15, sub_lines, size_pt - 1.1, 1.1,
                            cls="dg-label", color=self.t.type.ink_soft)
        return (x + w / 2, y + h / 2)

    def render(self) -> str:
        d = f"<defs>{''.join(self.defs)}</defs>" if self.defs else ""
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_fmt(self.w)} '
                f'{_fmt(self.h)}" width="100%" preserveAspectRatio="xMidYMid meet">'
                f'{d}{"".join(self.body)}</svg>')


# --------------------------------------------------------------------------
# 1. FEEDBACK LOOP  — homeostasis, control systems, economic equilibria
# --------------------------------------------------------------------------
def feedback_loop(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    """A regulated variable in the centre with opposing correction arms.

    Height is deliberately capped rather than scaled from the width: a wide
    card must not turn a small loop into a mostly-empty rectangle (section P).
    """
    h = spec.get("height", min(max(54.0, w * 0.38), 70.0))
    c = Canvas(theme, w, h, seed=11)
    cx = w / 2
    centre = spec["centre"]
    arms = spec["arms"][:2]
    node_w = min(54.0, max(34.0, w * 0.285))
    node_h = 12.5
    arm_cx = (w * 0.185 + node_w * 0.0, w * 0.815)
    arm_cx = (max(node_w / 2 + 1.0, w * 0.20), min(w - node_w / 2 - 1.0, w * 0.80))

    cw = min(62.0, max(40.0, w * 0.30))
    ch = 14.0
    c.node(cx - cw / 2, h / 2 - ch / 2, cw, ch, centre["label"],
           centre.get("accent", "ink"), 8.6, centre.get("sub"), strong=True,
           weight="700", cls="dg-body")
    if centre.get("note"):
        lines = wrap(centre["note"], cw + 10, 6.4)
        c.text_block(cx, h / 2 + ch / 2 + 3.2, lines, 6.4, 1.12,
                     color=theme.type.ink_soft, cls="dg-label")

    for i, arm in enumerate(arms):
        left = (i == 0)
        acc = arm.get("accent", "green" if left else "orange")
        col = theme.accent(acc)
        mid_x = arm_cx[i]
        sx = mid_x - node_w / 2
        has_eff = any(a.get("effect") for a in arms)
        top_y = 5.0
        bot_y = h - node_h - (6.0 if has_eff else 1.5)
        c.text(mid_x, 3.0, arm.get("title", ""), 6.8, col, cls="dg-label", weight="700")
        c.node(sx, top_y, node_w, node_h, arm["trigger"], acc, 7.0)
        c.node(sx, bot_y, node_w, node_h, arm["effector"], acc, 7.0,
               sub=arm.get("effector_sub"), strong=True)
        # trigger -> effector (the response), bowed away from the centre
        bow = -6.0 if left else 6.0
        c.arrow((mid_x, top_y + node_h + 0.8), (mid_x, bot_y - 1.0), col, 0.32,
                curve=bow, head=1.7)
        if arm.get("via"):
            span_h = bot_y - (top_y + node_h) - 4.0
            lines = wrap(arm["via"], span_h, 6.1)[:4]
            off = (bow * 1.30) + (-3.6 if left else 3.6)
            c.vtext_block(mid_x + off, (top_y + node_h + bot_y) / 2, lines, 6.1,
                          1.12, color=col)
        # effector -> centre (the correction)
        tip_x = cx - cw / 2 - 1.4 if left else cx + cw / 2 + 1.4
        c.arrow((mid_x + (node_w / 2 + 0.6 if left else -node_w / 2 - 0.6), bot_y + node_h / 2),
                (tip_x, h / 2 + 3.0), col, 0.34, head=1.8)
        # centre -> trigger (the sensing limb)
        c.arrow((tip_x, h / 2 - 3.0),
                (mid_x + (node_w / 2 + 0.6 if left else -node_w / 2 - 0.6), top_y + node_h / 2),
                col, 0.26, head=1.5, dash="1.4 1.1", opacity=0.8)
        sign = arm.get("sign", "\u2212" if left else "+")
        c.text(tip_x + (-3.4 if left else 3.4), h / 2 + 6.0, sign, 12.0, col,
               cls="dg-body", weight="700")
        if arm.get("effect"):
            lines = wrap(arm["effect"], node_w + 10.0, 6.3)
            c.text_block(mid_x, bot_y + node_h + 3.4, lines, 6.3, 1.12,
                         color=col, cls="dg-label")
    return c.render(), h


# --------------------------------------------------------------------------
# 2. FLOW  — algorithms, treatment escalation, decision procedures
# --------------------------------------------------------------------------
def flow(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    """Vertical flow of steps, each optionally with side branches."""
    steps: List[Dict] = spec["steps"]
    gap = spec.get("gap", 4.2)
    side_w = spec.get("side_w", 0.34) * w
    main_w = w - (side_w + 5.0 if any(s.get("side") for s in steps) else 0)
    main_w = min(main_w, w)
    pad_top = 1.0
    body_pt, sub_pt = 7.4, 6.4

    heights = []
    for s in steps:
        lines = wrap(s["label"], main_w - 4.0, body_pt)
        subl = wrap(s["sub"], main_w - 4.0, sub_pt) if s.get("sub") else []
        heights.append(max(9.0, len(lines) * body_pt * PT * 1.16
                           + len(subl) * sub_pt * PT * 1.12 + 4.6))
    total = sum(heights) + gap * (len(steps) - 1) + pad_top + 2.0
    c = Canvas(theme, w, total, seed=23)
    y = pad_top
    for i, s in enumerate(steps):
        acc = s.get("accent", "teal")
        col = theme.accent(acc)
        hh = heights[i]
        c.node(0, y, main_w, hh, s["label"], acc, body_pt, s.get("sub"),
               strong=s.get("strong", False), weight="600")
        if s.get("side"):
            sx = main_w + 5.0
            sc = s.get("side_accent", acc)
            scol = theme.accent(sc)
            lines = wrap(s["side"], side_w - 1.0, 6.4)
            c.arrow((main_w + 0.6, y + hh / 2), (sx - 0.8, y + hh / 2), scol,
                    0.24, head=1.3, dash="1.2 1.0")
            c.text_block(sx, y + hh / 2 - (len(lines) - 1) * 6.4 * PT * 0.55 + 0.7,
                         lines, 6.4, 1.14, anchor="start", cls="dg-label",
                         color=scol)
        if i < len(steps) - 1:
            c.arrow((main_w / 2, y + hh + 0.5), (main_w / 2, y + hh + gap - 0.5),
                    theme.accent(steps[i + 1].get("accent", acc)), 0.34, head=1.7)
        y += hh + gap
    return c.render(), total


# --------------------------------------------------------------------------
# 3. CYCLE  — recurring processes, biochemical cycles, iterative methods
# --------------------------------------------------------------------------
def cycle(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    nodes: List[Dict] = spec["nodes"]
    h = spec.get("height", w * 0.78)
    c = Canvas(theme, w, h, seed=37)
    cx, cy = w / 2, h / 2
    rx, ry = w * 0.34, h * 0.34
    n = len(nodes)
    pos = []
    for i, nd in enumerate(nodes):
        a = -math.pi / 2 + i * math.tau / n
        pos.append((cx + rx * math.cos(a), cy + ry * math.sin(a), a))
    # arrows around the ring first, so nodes sit on top
    for i in range(n):
        a0 = pos[i][2] + 0.42
        a1 = pos[(i + 1) % n][2] - 0.42
        if a1 < a0:
            a1 += math.tau
        pts = sketch.rough_arc(cx, cy, rx, ry, a0, a1, c.nid(), 0.22, 16)
        c.stroke(sketch.smooth_path(pts), theme.accent(spec.get("ring_accent", "ochre")),
                 0.3, 0.75)
        tip = pts[-1]
        ang = math.atan2(tip[1] - pts[-2][1], tip[0] - pts[-2][0])
        c.stroke(sketch.arrow_head(tip, ang, 1.7, c.nid()),
                 theme.accent(spec.get("ring_accent", "ochre")), 0.3, 0.85)
    nw, nh = min(38.0, w * 0.30), 10.5
    for i, nd in enumerate(nodes):
        x, y, _ = pos[i]
        c.node(x - nw / 2, y - nh / 2, nw, nh, nd["label"],
               nd.get("accent", "teal"), 7.0, nd.get("sub"),
               strong=nd.get("strong", False))
    if spec.get("centre"):
        lines = wrap(spec["centre"], rx * 1.05, 7.6)
        c.text_block(cx, cy - (len(lines) - 1) * 1.4, lines, 7.6, 1.15,
                     cls="dg-label", weight="700",
                     color=theme.accent(spec.get("centre_accent", "violet")))
    return c.render(), h


# --------------------------------------------------------------------------
# 4. CURVES  — time-courses, dose-response, any x/y relationship
# --------------------------------------------------------------------------
def curves(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    h = spec.get("height", w * 0.56)
    c = Canvas(theme, w, h, seed=53)
    ml, mr, mt, mb = 11.0, spec.get("legend_w", 26.0), 4.0, 8.5
    px0, px1 = ml, w - mr
    py0, py1 = mt, h - mb
    xr = spec.get("x_range", [0, 24])
    yr = spec.get("y_range", [0, 1])
    ink = theme.type.ink

    def X(v): return px0 + (v - xr[0]) / (xr[1] - xr[0]) * (px1 - px0)
    def Y(v): return py1 - (v - yr[0]) / (yr[1] - yr[0]) * (py1 - py0)

    # axes, drawn as pen strokes
    c.stroke(sketch.rough_line((px0, py1), (px1 + 1.5, py1), c.nid(), 0.14), ink, 0.3, .8)
    c.stroke(sketch.rough_line((px0, py1), (px0, py0 - 1.0), c.nid(), 0.14), ink, 0.3, .8)
    for tick in spec.get("x_ticks", []):
        v = tick["v"] if isinstance(tick, dict) else tick
        lb = tick.get("label", str(v)) if isinstance(tick, dict) else str(v)
        c.stroke(f"M {_fmt(X(v))} {_fmt(py1)} L {_fmt(X(v))} {_fmt(py1+1.0)}", ink, 0.22, .7)
        c.text(X(v), py1 + 3.4, lb, 6.2, theme.type.ink_soft, cls="dg-mono")
    for tick in spec.get("y_ticks", []):
        v = tick["v"] if isinstance(tick, dict) else tick
        lb = tick.get("label", str(v)) if isinstance(tick, dict) else str(v)
        c.stroke(f"M {_fmt(px0-1.0)} {_fmt(Y(v))} L {_fmt(px1)} {_fmt(Y(v))}", ink,
                 0.16, .22, dash="1.2 1.4")
        c.text(px0 - 1.8, Y(v) + 0.8, lb, 6.2, theme.type.ink_soft, anchor="end", cls="dg-mono")
    c.text((px0 + px1) / 2, h - 1.2, spec.get("x_label", ""), 6.6,
           theme.type.ink_soft, cls="dg-label")
    c.text(2.6, (py0 + py1) / 2, spec.get("y_label", ""), 6.6, theme.type.ink_soft,
           cls="dg-label", rotate=-90)

    # shaded bands (e.g. a therapeutic or normal range)
    for band in spec.get("bands", []):
        col = theme.accent(band.get("accent", "green"))
        y_a, y_b = Y(band["from"]), Y(band["to"])
        c.add(f'<rect x="{_fmt(px0)}" y="{_fmt(min(y_a,y_b))}" width="{_fmt(px1-px0)}" '
              f'height="{_fmt(abs(y_b-y_a))}" fill="{col}" fill-opacity="0.10"/>')
        if band.get("label"):
            c.text(px1 - 1.0, min(y_a, y_b) + abs(y_b - y_a) / 2 + 0.7, band["label"],
                   6.2, col, anchor="end", cls="dg-label")

    ly = py0 + 1.0
    for s in spec["series"]:
        col = theme.accent(s.get("accent", "teal"))
        pts = [(X(px), Y(py)) for px, py in s["points"]]
        d = sketch.smooth_path(sketch.jitter_points(pts, 0.16, rng(c.nid())))
        c.stroke(d, col, s.get("width", 0.38), 0.95, s.get("dash"))
        if s.get("fill"):
            c.add(f'<path d="{d} L {_fmt(pts[-1][0])} {_fmt(py1)} L {_fmt(pts[0][0])} '
                  f'{_fmt(py1)} Z" fill="{col}" fill-opacity="0.08" stroke="none"/>')
        # legend entry
        c.stroke(f"M {_fmt(px1+3.0)} {_fmt(ly)} L {_fmt(px1+7.5)} {_fmt(ly)}", col, 0.42)
        lines = wrap(s["label"], mr - 9.0, 6.3)
        c.text_block(px1 + 8.6, ly + 0.9, lines, 6.3, 1.1, anchor="start",
                     cls="dg-label", color=theme.type.ink)
        ly += 1.2 + max(1, len(lines)) * 6.3 * PT * 1.15
        if s.get("peak_label"):
            i = min(range(len(pts)), key=lambda k: pts[k][1])
            c.stroke(f"M {_fmt(pts[i][0])} {_fmt(pts[i][1] - 0.8)} L "
                     f"{_fmt(pts[i][0])} {_fmt(pts[i][1] - 2.4)}", col, 0.22, 0.7)
            c.text(pts[i][0], pts[i][1] - 3.0, s["peak_label"], 6.1, col,
                   cls="dg-label", weight="600")
    return c.render(), h


# --------------------------------------------------------------------------
# 5. SCALE  — graded thresholds, classification bands, reference ranges
# --------------------------------------------------------------------------
def scale(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    bands: List[Dict] = spec["bands"]
    bar_h = spec.get("bar_h", 8.0)
    h = spec.get("height", bar_h + 17.0)
    c = Canvas(theme, w, h, seed=67)
    x = 0.0
    total = sum(b.get("weight", 1) for b in bands)
    y = 7.0
    for b in bands:
        bw = w * b.get("weight", 1) / total
        col = theme.accent(b.get("accent", "teal"))
        c.fill(rough_rect(x, y, bw, bar_h, 1.0, c.nid(), 0.14), col, 0.16)
        c.stroke(rough_rect(x, y, bw, bar_h, 1.0, c.nid(), 0.20), col, 0.26, 0.6)
        c.text(x + bw / 2, y + bar_h / 2 + 0.9, b["label"], 7.2, col,
               cls="dg-body", weight="700")
        if b.get("range"):
            c.text(x + bw / 2, y - 1.6, b["range"], 6.3, theme.type.ink_soft, cls="dg-mono")
        if b.get("note"):
            lines = wrap(b["note"], bw - 1.0, 6.2)
            c.text_block(x + bw / 2, y + bar_h + 3.2, lines, 6.2, 1.12,
                         cls="dg-label", color=theme.type.ink_soft)
        x += bw
    if spec.get("axis_label"):
        c.text(w / 2, h - 0.6, spec["axis_label"], 6.4, theme.type.ink_soft, cls="dg-label")
    if spec.get("marker"):
        m = spec["marker"]
        mx = w * m["at"]
        col = theme.accent(m.get("accent", "red"))
        c.arrow((mx, y - 5.4), (mx, y - 0.6), col, 0.34, head=1.6)
        c.text(mx, y - 6.2, m["label"], 6.4, col, cls="dg-label", weight="700")
    return c.render(), h


# --------------------------------------------------------------------------
# 6. HIERARCHY  — classifications, taxonomies, causal breakdowns
# --------------------------------------------------------------------------
def hierarchy(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    root = spec["root"]
    children: List[Dict] = spec["children"]
    n = len(children)
    gap = 2.6
    cw = (w - gap * (n - 1)) / n
    body_pt = 6.9
    leaf_pt = 6.3
    child_h = []
    for ch in children:
        items = ch.get("items", [])
        lines = sum(len(wrap("• " + it, cw - 2.6, leaf_pt)) for it in items)
        head = len(wrap(ch["label"], cw - 2.6, body_pt))
        child_h.append(head * body_pt * PT * 1.15 + lines * leaf_pt * PT * 1.22 + 4.4)
    ch_h = max(child_h) if child_h else 12.0
    root_h = 11.0
    stem = 6.5
    h = root_h + stem + ch_h + 1.5
    c = Canvas(theme, w, h, seed=83)
    rw = min(w * 0.56, 78.0)
    c.node((w - rw) / 2, 0, rw, root_h, root["label"], root.get("accent", "violet"),
           8.0, root.get("sub"), strong=True, weight="700")
    y_top = root_h + stem
    c.arrow((w / 2, root_h + 0.4), (w / 2, root_h + stem * 0.42), 
            theme.accent(root.get("accent", "violet")), 0.3, head=0)
    for i, ch in enumerate(children):
        x = i * (cw + gap)
        acc = ch.get("accent", "teal")
        col = theme.accent(acc)
        # elbow connector from the root stem
        midy = root_h + stem * 0.42
        c.stroke(sketch.rough_line((w / 2, midy), (x + cw / 2, midy), c.nid(), 0.12),
                 col, 0.26, 0.75)
        c.arrow((x + cw / 2, midy), (x + cw / 2, y_top - 0.6), col, 0.28, head=1.5)
        c.fill(rough_rect(x, y_top, cw, ch_h, 1.5, c.nid(), 0.12), col,
               theme.card.fill_alpha)
        c.stroke(rough_rect(x, y_top, cw, ch_h, 1.5, c.nid(), 0.22), col, 0.26,
                 theme.card.edge_alpha)
        yy = y_top + 3.0
        hd = wrap(ch["label"], cw - 2.6, body_pt)
        yy = c.text_block(x + cw / 2, yy, hd, body_pt, 1.15, cls="dg-body",
                          weight="700", color=col) + body_pt * PT * 1.5
        for it in ch.get("items", []):
            lines = wrap(it, cw - 3.6, leaf_pt)
            for k, ln in enumerate(lines):
                c.text(x + 1.6, yy, ("• " if k == 0 else "   ") + ln, leaf_pt,
                       theme.type.ink, anchor="start", cls="dg-body")
                yy += leaf_pt * PT * 1.22
    return c.render(), h


# --------------------------------------------------------------------------
# 7. TIMELINE  — history, staging, disease course, project phases
# --------------------------------------------------------------------------
def timeline(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    events: List[Dict] = spec["events"]
    h = spec.get("height", 30.0)
    c = Canvas(theme, w, h, seed=97)
    ax = h * 0.42
    col_axis = theme.accent(spec.get("accent", "ochre"))
    c.stroke(sketch.rough_line((1.0, ax), (w - 1.0, ax), c.nid(), 0.20), col_axis, 0.34, .9)
    c.stroke(sketch.arrow_head((w - 1.0, ax), 0.0, 2.0, c.nid()), col_axis, 0.34)
    n = len(events)
    for i, e in enumerate(events):
        x = 3.0 + (w - 8.0) * (e["at"] if "at" in e else i / max(1, n - 1))
        acc = e.get("accent", "teal")
        col = theme.accent(acc)
        c.add(f'<circle cx="{_fmt(x)}" cy="{_fmt(ax)}" r="1.15" fill="{col}" '
              f'fill-opacity="0.85"/>')
        up = (i % 2 == 0)
        ty = ax - 3.2 if up else ax + 3.0
        c.stroke(f"M {_fmt(x)} {_fmt(ax + (-1.4 if up else 1.4))} L {_fmt(x)} "
                 f"{_fmt(ty + (1.0 if up else -1.0))}", col, 0.22, .7)
        lines = wrap(e["label"], w / max(2.4, n * 0.62), 6.5)
        if up:
            c.text_block(x, ty - (len(lines) - 1) * 6.5 * PT * 1.15, lines, 6.5, 1.15,
                         cls="dg-body", weight="600", color=theme.type.ink)
        else:
            c.text_block(x, ty + 1.4, lines, 6.5, 1.15, cls="dg-body", weight="600",
                         color=theme.type.ink)
        if e.get("time"):
            c.text(x, ax + (3.0 if up else -1.9), e["time"], 6.2, col, cls="dg-mono")
    return c.render(), h


# --------------------------------------------------------------------------
# 8. COMPARE  — two-sided contrasts (any subject)
# --------------------------------------------------------------------------
def compare(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    left, right = spec["left"], spec["right"]
    gap = 5.0
    cw = (w - gap) / 2
    pt = 6.8
    def col_h(side):
        n = sum(len(wrap(i, cw - 4.0, pt)) for i in side["items"])
        return n * pt * PT * 1.30 + 9.0
    h = spec.get("height", max(col_h(left), col_h(right)))
    c = Canvas(theme, w, h, seed=113)
    for side, x in ((left, 0.0), (right, cw + gap)):
        acc = side.get("accent", "teal")
        col = theme.accent(acc)
        c.fill(rough_rect(x, 0, cw, h, 1.6, c.nid(), 0.12), col, theme.card.fill_alpha)
        c.stroke(rough_rect(x, 0, cw, h, 1.6, c.nid(), 0.22), col, 0.26,
                 theme.card.edge_alpha)
        c.text(x + cw / 2, 4.3, side["label"], 8.6, col, cls="dg-label", weight="700")
        yy = 8.4
        for it in side["items"]:
            lines = wrap(it, cw - 4.4, pt)
            for k, ln in enumerate(lines):
                if k == 0:
                    c.add(f'<circle cx="{_fmt(x+2.2)}" cy="{_fmt(yy-0.75)}" r="0.5" '
                          f'fill="{col}" fill-opacity="0.8"/>')
                c.text(x + 3.6, yy, ln, pt, theme.type.ink, anchor="start", cls="dg-body")
                yy += pt * PT * 1.30
    c.text(cw + gap / 2, h / 2 + 1.2, spec.get("vs", "vs"), 8.0,
           theme.type.ink_soft, cls="dg-label", weight="700")
    return c.render(), h


# --------------------------------------------------------------------------
# 9. TRIAGE  — severity bands that each select an action, over a common base
# --------------------------------------------------------------------------
def triage(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    """Graded categories across the top, the action each one selects below,
    and a foundation that applies to all of them (a very common teaching
    shape: severity -> intervention, on a constant baseline)."""
    bands: List[Dict] = spec["bands"]
    n = len(bands)
    gap = 3.2
    bw = (w - gap * (n - 1)) / n
    head_pt, row_pt = 8.4, 6.8
    rows_max = max(len(b.get("rows", [])) for b in bands)
    band_h = 5.6 + rows_max * row_pt * PT * 1.34 + 2.0
    arrow_h = 6.0
    act_h = 11.0
    base_h = 9.0
    foot = spec.get("footnotes", [])
    foot_h = (len(foot) * 6.1 * PT * 1.30 + 1.6) if foot else 0.0
    title_h = 6.4 if spec.get("title") else 0.0
    natural = title_h + band_h + arrow_h + act_h + 1.6 + base_h + foot_h + 1.0
    h = max(natural, float(spec.get("height", 0.0)))
    if h > natural + 0.5:                 # spend the extra on the boxes, not on air
        extra = h - natural
        band_h += extra * 0.34
        act_h += extra * 0.30
        arrow_h += extra * 0.20
        base_h += extra * 0.16
    c = Canvas(theme, w, h, seed=131)

    y = 0.0
    if spec.get("title"):
        c.text(w / 2, 4.4, spec["title"], 8.8,
               theme.accent(spec.get("accent", "teal")), cls="dg-label", weight="700")
        y = title_h

    base_y = y + band_h + arrow_h + act_h + 1.6
    # the constant foundation, drawn first so the action boxes sit on it
    base_col = theme.accent(spec.get("base_accent", "teal"))
    c.fill(rough_rect(0, base_y, w, base_h, 1.2, c.nid(), 0.14), base_col, 0.14)
    c.stroke(rough_rect(0, base_y, w, base_h, 1.2, c.nid(), 0.22), base_col, 0.26, 0.55)
    c.text(w / 2, base_y + base_h / 2 + 1.0, spec.get("base", ""), 8.0,
           theme.type.ink, cls="dg-body", weight="700")

    for i, b in enumerate(bands):
        x = i * (bw + gap)
        col = theme.accent(b.get("accent", "teal"))
        c.fill(rough_rect(x, y, bw, band_h, 1.4, c.nid(), 0.12), col,
               theme.card.fill_alpha)
        c.stroke(rough_rect(x, y, bw, band_h, 1.4, c.nid(), 0.20), col, 0.28,
                 theme.card.edge_alpha)
        rows = b.get("rows", [])
        row_step = row_pt * PT * 1.34
        block = head_pt * PT * 1.05 + 1.6 + len(rows) * row_step
        ry = y + (band_h - block) / 2 + head_pt * PT * 0.9
        c.text(x + bw / 2, ry, b["label"], head_pt, col, cls="dg-label", weight="700")
        ry += 1.6 + head_pt * PT * 0.15
        for r in rows:
            ry += row_step
            c.text(x + bw / 2, ry, r, row_pt, theme.type.ink, cls="dg-mono")
        if b.get("action"):
            ay = y + band_h + arrow_h
            c.arrow((x + bw / 2, y + band_h + 0.8), (x + bw / 2, ay - 0.8), col,
                    0.36, head=1.8)
            c.node(x + bw * 0.06, ay, bw * 0.88, act_h, b["action"],
                   b.get("action_accent", b.get("accent", "teal")), 7.6,
                   strong=True, weight="700")
        else:
            c.text(x + bw / 2, y + band_h + arrow_h + act_h / 2 + 1.2,
                   b.get("no_action", ""), 7.2, theme.accent(b.get("accent", "teal")),
                   cls="dg-label", opacity=0.85)

    fy = base_y + base_h + 3.2
    for line in foot:
        c.text(0.5, fy, line, 6.1, theme.type.ink_soft, anchor="start", cls="dg-body")
        fy += 6.1 * PT * 1.30
    return c.render(), h


# --------------------------------------------------------------------------
# 9. CUSTOM — an author-supplied SVG body in mm coordinates
# --------------------------------------------------------------------------
def custom(theme: Theme, w: float, spec: Dict) -> Tuple[str, float]:
    h = spec.get("height", w * 0.6)
    vb = spec.get("viewbox", f"0 0 {_fmt(w)} {_fmt(h)}")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="100%" '
            f'preserveAspectRatio="xMidYMid meet">{spec["svg"]}</svg>', h)


KINDS = {
    "feedback_loop": feedback_loop,
    "flow": flow,
    "cycle": cycle,
    "curves": curves,
    "scale": scale,
    "hierarchy": hierarchy,
    "timeline": timeline,
    "compare": compare,
    "triage": triage,
    "custom": custom,
}


def build(theme: Theme, kind: str, width_mm: float, spec: Dict) -> Tuple[str, float]:
    if kind not in KINDS:
        raise KeyError(f"unknown diagram kind {kind!r}; have {sorted(KINDS)}")
    return KINDS[kind](theme, width_mm, spec)
