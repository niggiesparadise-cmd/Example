"""Deterministic hand-drawn geometry.

Section Q of the brief asks for controlled imperfection: strokes that look
drawn by a careful hand rather than plotted by a machine, but never at the
cost of alignment or legibility.  Every wobble here is seeded, so a document
renders identically on every run.
"""
import math
import random
from typing import Iterable, List, Sequence, Tuple

Pt = Tuple[float, float]


def rng(seed: int) -> random.Random:
    return random.Random(seed)


def _fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def path_from(points: Sequence[Pt], close: bool = False) -> str:
    d = "M " + " L ".join(f"{_fmt(x)} {_fmt(y)}" for x, y in points)
    return d + (" Z" if close else "")


def jitter_points(points: Sequence[Pt], amp: float, r: random.Random) -> List[Pt]:
    return [(x + r.uniform(-amp, amp), y + r.uniform(-amp, amp)) for x, y in points]


def densify(points: Sequence[Pt], step: float) -> List[Pt]:
    """Resample a polyline so wobble is distributed along its length."""
    out: List[Pt] = []
    for i in range(len(points) - 1):
        (x0, y0), (x1, y1) = points[i], points[i + 1]
        seg = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(seg / step))
        for k in range(n):
            t = k / n
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    out.append(tuple(points[-1]))
    return out


def smooth_path(points: Sequence[Pt], close: bool = False) -> str:
    """Catmull-Rom -> cubic bezier, so a wobbled polyline reads as a pen line."""
    p = list(points)
    if len(p) < 3:
        return path_from(p, close)
    if close:
        p = [p[-1]] + p + [p[0], p[1]]
    else:
        p = [p[0]] + p + [p[-1]]
    d = f"M {_fmt(p[1][0])} {_fmt(p[1][1])}"
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        d += (f" C {_fmt(c1[0])} {_fmt(c1[1])}, {_fmt(c2[0])} {_fmt(c2[1])},"
              f" {_fmt(p2[0])} {_fmt(p2[1])}")
    return d + (" Z" if close else "")


def rough_line(a: Pt, b: Pt, seed: int, amp: float = 0.6, step: float = 6.0) -> str:
    r = rng(seed)
    pts = densify([a, b], step)
    pts = [pts[0]] + jitter_points(pts[1:-1], amp, r) + [pts[-1]]
    return smooth_path(pts)


def rough_polyline(points: Sequence[Pt], seed: int, amp: float = 0.6,
                   step: float = 7.0, close: bool = False) -> str:
    r = rng(seed)
    pts = densify(list(points) + ([points[0]] if close else []), step)
    pts = jitter_points(pts, amp, r)
    return smooth_path(pts, close=False)


def rough_rect(x: float, y: float, w: float, h: float, radius: float,
               seed: int, amp: float = 0.55) -> str:
    """A rounded rectangle drawn as if by hand, corners slightly unequal."""
    r = rng(seed)
    rad = [max(0.6, radius * r.uniform(0.72, 1.3)) for _ in range(4)]
    pts: List[Pt] = []
    corners = [
        (x + rad[0], y, x + w - rad[1], y),                     # top edge
        (x + w, y + rad[1], x + w, y + h - rad[2]),             # right edge
        (x + w - rad[2], y + h, x + rad[3], y + h),             # bottom edge
        (x, y + h - rad[3], x, y + rad[0]),                     # left edge
    ]
    arcs = [
        (x + w, y, x + w, y + rad[1]),
        (x + w, y + h, x + w - rad[2], y + h),
        (x, y + h, x, y + h - rad[3]),
        (x, y, x + rad[0], y),
    ]
    for i, (x0, y0, x1, y1) in enumerate(corners):
        pts += densify([(x0, y0), (x1, y1)], 9.0)
        cx, cy, ex, ey = arcs[i]
        pts += [(cx, cy), (ex, ey)]          # corner shoulder, smoothed later
    pts = jitter_points(pts, amp, r)
    return smooth_path(pts, close=True)


def rough_circle(cx: float, cy: float, rx: float, ry: float, seed: int,
                 amp: float = 0.5, n: int = 34) -> str:
    r = rng(seed)
    pts = []
    wob = r.uniform(0, math.tau)
    for i in range(n):
        t = i / n * math.tau
        rr = 1.0 + 0.012 * math.sin(3 * t + wob)
        pts.append((cx + rx * rr * math.cos(t), cy + ry * rr * math.sin(t)))
    pts = jitter_points(pts, amp, r)
    return smooth_path(pts, close=True)


def rough_arc(cx: float, cy: float, rx: float, ry: float, a0: float, a1: float,
              seed: int, amp: float = 0.45, n: int = 26) -> List[Pt]:
    r = rng(seed)
    pts = []
    for i in range(n + 1):
        t = a0 + (a1 - a0) * i / n
        pts.append((cx + rx * math.cos(t), cy + ry * math.sin(t)))
    return jitter_points(pts, amp, r)


def underline(width: float, seed: int, amp: float = 0.7, thickness: float = 1.6) -> str:
    """A wobbly marker underline as a standalone SVG (used behind headings)."""
    r = rng(seed)
    h = 6.0
    y = h * 0.55
    pts = densify([(1.0, y), (width - 1.0, y)], max(6.0, width / 9))
    pts = [(x, yy + r.uniform(-amp, amp) + math.sin(x / width * 3.1) * amp * 0.5)
           for x, yy in pts]
    d = smooth_path(pts)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_fmt(width)} {_fmt(h)}" '
            f'preserveAspectRatio="none"><path d="{d}" fill="none" stroke="currentColor" '
            f'stroke-width="{_fmt(thickness)}" stroke-linecap="round" opacity="0.55"/></svg>')


def arrow_head(tip: Pt, angle: float, size: float, seed: int) -> str:
    """Two short strokes rather than a filled triangle — pen, not clip-art."""
    r = rng(seed)
    spread = math.radians(25 + r.uniform(-4, 4))
    a = angle + math.pi
    p1 = (tip[0] + size * math.cos(a - spread), tip[1] + size * math.sin(a - spread))
    p2 = (tip[0] + size * math.cos(a + spread), tip[1] + size * math.sin(a + spread))
    return (f'M {_fmt(p1[0])} {_fmt(p1[1])} L {_fmt(tip[0])} {_fmt(tip[1])} '
            f'L {_fmt(p2[0])} {_fmt(p2[1])}')


def arrow(a: Pt, b: Pt, seed: int, amp: float = 0.5, head: float = 4.2,
          curve: float = 0.0) -> Tuple[str, str]:
    """Hand-drawn arrow shaft + head. `curve` bows the shaft sideways."""
    r = rng(seed)
    dx, dy = b[0] - a[0], b[1] - a[1]
    ang = math.atan2(dy, dx)
    if abs(curve) > 1e-6:
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        nx, ny = -math.sin(ang), math.cos(ang)
        mid = (mx + nx * curve, my + ny * curve)
        pts = densify([a, mid, b], 7.0)
        pts = smooth_path(jitter_points(pts, amp, r))
        end_ang = math.atan2(b[1] - mid[1], b[0] - mid[0])
    else:
        pts = rough_line(a, b, seed, amp)
        end_ang = ang
    return pts, arrow_head(b, end_ang, head, seed + 7)
