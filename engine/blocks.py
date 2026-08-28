# -*- coding: utf-8 -*-
"""Subject-agnostic diagram primitives for the notebook engine.

Every block returns an SVG string that inherits the engine's .d-* / chart
classes, so diagrams always sit inside the notebook's visual language.
"""
from math import sin, cos, radians

# ── generic helpers ────────────────────────────────────────────────────────
def underline(color_cls=""):
    return (f'<svg class="ul {color_cls}" viewBox="0 0 320 8" preserveAspectRatio="none" '
            f'aria-hidden="true"><path d="M3 6C48 2 96 8 146 4.4S258 1.5 317 5.5"/></svg>')

def rough(fid, freq=.024, scale=2.0, seed=11):
    return (f'<filter id="{fid}" x="-6%" y="-6%" width="112%" height="112%">'
            f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="2" seed="{seed}" result="n"/>'
            f'<feDisplacementMap in="SourceGraphic" in2="n" scale="{scale}" '
            f'xChannelSelector="R" yChannelSelector="G"/></filter>')

def marker(mid, fill):
    return (f'<marker id="{mid}" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="6.5" '
            f'markerHeight="6.5" orient="auto-start-reverse">'
            f'<path d="M1 1.5 L11 6 L1 10.5 Z" fill="{fill}"/></marker>')

def vbar(x, w, y0, y1, r=3.5):
    if abs(y1 - y0) < 1: return ""
    if y1 < y0:
        return (f'M{x} {y0} L{x} {y1+r} Q{x} {y1} {x+r} {y1} L{x+w-r} {y1} '
                f'Q{x+w} {y1} {x+w} {y1+r} L{x+w} {y0} Z')
    return (f'M{x} {y0} L{x} {y1-r} Q{x} {y1} {x+r} {y1} L{x+w-r} {y1} '
            f'Q{x+w} {y1} {x+w} {y1-r} L{x+w} {y0} Z')

def hseg(x0, x1, y, h, r=4, left=False, right=False):
    rl, rr = (r if left else 0), (r if right else 0)
    return (f'M{x0+rl} {y} H{x1-rr} '
            + (f'Q{x1} {y} {x1} {y+rr} V{y+h-rr} Q{x1} {y+h} {x1-rr} {y+h}' if rr else f'V{y+h}')
            + f' H{x0+rl} '
            + (f'Q{x0} {y+h} {x0} {y+h-rl} V{y+rl} Q{x0} {y} {x0+rl} {y}' if rl else f'V{y}')
            + ' Z')

# ── 1. STACKED-LABEL STRUCTURE (chemistry, but also any vertical chain) ────
def ladder(rows, doubles=(), highlight=None, hcolor="teal", label="",
           row_h=27, top=22, cx=78, width=156):
    h = top + (len(rows) - 1) * row_h + 20
    o = [f'<svg viewBox="0 0 {width} {h}" role="img" aria-label="{label}">']
    if highlight is not None:
        y = top + highlight * row_h
        w = max(42, len(rows[highlight]) * 7.6)
        o.append(f'<rect class="hl-{hcolor}" x="{cx-w/2:.0f}" y="{y-12:.0f}" '
                 f'width="{w:.0f}" height="18" rx="6" ry="5"/>')
    o.append('<g class="d-bond">')
    for i in range(len(rows) - 1):
        y1, y2 = top + i * row_h + 5, top + (i + 1) * row_h - 14
        if i in doubles:
            o.append(f'<path d="M{cx-3} {y1} V{y2}"/><path d="M{cx+3} {y1} V{y2}"/>')
        else:
            o.append(f'<path d="M{cx} {y1} V{y2}"/>')
    o.append('</g>')
    for i, r in enumerate(rows):
        o.append(f'<text class="d-t" x="{cx}" y="{top + i*row_h}">{r}</text>')
    o.append('</svg>')
    return "".join(o)

def alkene_trans(left_top, left_bot, right_top, right_bot, caption="", hcolor="violet"):
    """A drawn C=C with substituents — geometry that a stacked ladder cannot show."""
    return ('<svg viewBox="0 0 140 118" role="img" aria-label="trans alkene">'
            f'<rect class="hl-{hcolor}" x="44" y="46" width="52" height="21" rx="6" ry="5"/>'
            '<g class="d-bond">'
            '<path d="M42 51 L28 38"/><path d="M42 64 L28 78"/>'
            '<path d="M98 51 L112 38"/><path d="M98 64 L112 78"/>'
            '<path d="M58 54 H82"/><path d="M58 60 H82"/>'
            '</g>'
            '<text class="d-t" x="50" y="61">C</text><text class="d-t" x="90" y="61">C</text>'
            f'<text class="d-t" x="25" y="34" text-anchor="end">{left_top}</text>'
            f'<text class="d-t" x="25" y="87" text-anchor="end">{left_bot}</text>'
            f'<text class="d-t" x="115" y="34" text-anchor="start">{right_top}</text>'
            f'<text class="d-t" x="115" y="87" text-anchor="start">{right_bot}</text>'
            f'<text class="d-sm" x="70" y="108">{caption}</text>'
            '</svg>')

# ── 2. RADIAL CYCLE (any n-station loop: metabolic, project, hydrological…) ─
def cycle_wheel(stations, steps, centre, entry=None, notes=(),
                W=1000, H=756, cx=500, cy=402, R=262):
    """stations: [(name, sub)] clockwise from 12 o'clock.
       steps:    [(n, [enzyme lines], [product line, colour])] between stations."""
    n = len(stations)
    astep = 360 / n
    o = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{centre[1]} cycle diagram">',
         '<defs>', rough("rw", .022, 2.0, 11),
         marker("awT", "var(--teal)"), '</defs>']
    P = lambda r, t: (cx + r*sin(radians(t)), cy - r*cos(radians(t)))

    o.append('<g filter="url(#rw)" fill="none" stroke-linecap="round">')
    o.append('<g stroke="var(--teal)" stroke-width="2.4" marker-end="url(#awT)">')
    gap = 15.5
    for i in range(n):
        a0, a1 = i*astep + gap, (i+1)*astep - gap
        x0, y0 = P(R, a0); x1, y1 = P(R, a1)
        o.append(f'<path d="M{x0:.1f} {y0:.1f} A{R} {R} 0 0 1 {x1:.1f} {y1:.1f}"/>')
    o.append('</g><g stroke="var(--ink-3)" stroke-width="1.2" opacity=".7">')
    for i in range(n):
        a = i*astep + astep/2
        x0, y0 = P(R+14, a); x1, y1 = P(R+34, a)
        o.append(f'<path d="M{x0:.1f} {y0:.1f} L{x1:.1f} {y1:.1f}"/>')
    o.append('</g>')
    o.append(f'<circle cx="{cx}" cy="{cy}" r="122" stroke="var(--b-teal)" stroke-width="1.6" stroke-dasharray="6 6"/>')
    if entry:
        o.append(f'<rect x="{cx-102}" y="26" width="204" height="48" rx="13" ry="10" '
                 f'fill="var(--w-teal)" stroke="var(--teal)" stroke-width="1.8"/>')
        o.append(f'<path d="M{cx+66} 78 C{cx+78} 104 {cx+82} 128 {cx+83} 150" '
                 f'stroke="var(--teal)" stroke-width="2.6" marker-end="url(#awT)"/>')
    o.append('<g fill="var(--w-teal)" stroke="var(--b-teal)" stroke-width="1.6">')
    for i in range(n):
        x, y = P(R, i*astep)
        o.append(f'<rect x="{x-70:.1f}" y="{y-23:.1f}" width="140" height="46" rx="11" ry="9"/>')
    o.append('</g><g fill="var(--teal)" stroke="none">')
    for i in range(n):
        x, y = P(R+52, i*astep + astep/2)
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="13"/>')
    o.append('</g></g>')

    o.append('<g text-anchor="middle" fill="var(--ink)">')
    if entry:
        o.append(f'<text class="d-name" x="{cx}" y="{48}">{entry[0]}</text>')
        o.append(f'<text class="d-sub" x="{cx}" y="{64}" fill="var(--ink-3)">{entry[1]}</text>')
    for i, (nm, sub) in enumerate(stations):
        x, y = P(R, i*astep)
        o.append(f'<text class="d-name" x="{x:.1f}" y="{y-2:.1f}">{nm}</text>')
        o.append(f'<text class="d-sub" x="{x:.1f}" y="{y+13:.1f}" fill="var(--ink-3)">{sub}</text>')
    for i, (num, _, _) in enumerate(steps):
        x, y = P(R+52, i*astep + astep/2)
        o.append(f'<text class="d-num" x="{x:.1f}" y="{y+4.5:.1f}" fill="var(--paper)">{num}</text>')
    o.append(f'<text class="d-micro" x="{cx}" y="{cy-38}" fill="var(--ink-3)">{centre[0]}</text>')
    o.append(f'<text class="d-disp" x="{cx}" y="{cy}" fill="var(--teal)">{centre[1]}</text>')
    o.append(f'<text class="d-hand" x="{cx}" y="{cy+26}" fill="var(--ink-2)">{centre[2]}</text>')
    o.append(f'<text class="d-hand" x="{cx}" y="{cy+46}" fill="var(--ochre)">{centre[3]}</text>')
    o.append('</g>')

    for i, (num, enz, prod) in enumerate(steps):
        a = i*astep + astep/2
        right = sin(radians(a)) > 0.02
        x, y = P(R+72, a)
        anchor, dx = ("start", 10) if right else ("end", -10)
        lines = list(enz) + ([prod[0]] if prod else [])
        y0 = y - (len(lines)-1)*8.5
        o.append(f'<g text-anchor="{anchor}">')
        for j, ln in enumerate(lines):
            is_prod = prod and j == len(lines)-1
            cls = "d-out" if is_prod else "d-enz"
            fill = prod[1] if is_prod else "var(--teal)"
            o.append(f'<text class="{cls}" x="{x+dx:.1f}" y="{y0 + j*17:.1f}" fill="{fill}">{ln}</text>')
        o.append('</g>')
    for (nx, ny, anchor, fill, txt) in notes:
        o.append(f'<text class="d-hand" x="{nx}" y="{ny}" text-anchor="{anchor}" fill="{fill}">{txt}</text>')
    o.append('</svg>')
    return "".join(o)

# ── 3. SPINE MAP (inputs below / outputs above a shared backbone) ──────────
def spine_map(nodes, W=900, H=330, spine_y=170):
    o = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="inputs and outputs around a pathway">',
         '<defs>', rough("rs", .03, 1.6, 4),
         marker("awV", "var(--violet)"), marker("awG", "var(--green)"), '</defs>']
    xs = [W*(i+0.5)/len(nodes) for i in range(len(nodes))]
    o.append('<g filter="url(#rs)" fill="none" stroke-linecap="round">')
    o.append(f'<path d="M30 {spine_y} H{W-30}" stroke="var(--b-teal)" stroke-width="1.8" stroke-dasharray="8 7"/>')
    o.append('<g stroke="var(--violet)" stroke-width="1.9" marker-end="url(#awV)">')
    for x, nd in zip(xs, nodes):
        if nd.get("up"): o.append(f'<path d="M{x:.0f} {spine_y-22} V{spine_y-70}"/>')
    o.append('</g><g stroke="var(--green)" stroke-width="1.9" marker-end="url(#awG)">')
    for x, nd in zip(xs, nodes):
        if nd.get("down"): o.append(f'<path d="M{x:.0f} {spine_y+92} V{spine_y+26}"/>')
    o.append('</g><g fill="var(--w-teal)" stroke="var(--b-teal)" stroke-width="1.6">')
    for x in xs:
        o.append(f'<rect x="{x-74:.0f}" y="{spine_y-21}" width="148" height="42" rx="10" ry="8"/>')
    o.append('</g></g><g text-anchor="middle">')
    for x, nd in zip(xs, nodes):
        o.append(f'<text class="d-name" x="{x:.0f}" y="{spine_y+5}" fill="var(--ink)">{nd["name"]}</text>')
        for j, ln in enumerate(nd.get("up", [])):
            fill = "var(--violet)" if j == 0 else "var(--ink-2)"
            o.append(f'<text class="d-out" x="{x:.0f}" y="{spine_y-108+j*17:.0f}" fill="{fill}">{ln}</text>')
        for j, ln in enumerate(nd.get("down", [])):
            fill = "var(--green)" if j == 0 else "var(--ink-2)"
            cls = "d-hand" if ln.startswith("★") else "d-out"
            o.append(f'<text class="{cls}" x="{x:.0f}" y="{spine_y+112+j*17:.0f}" fill="{fill}">{ln}</text>')
    o.append('</g></svg>')
    return "".join(o)

# ── 4. DIVERGING BARS + CUMULATIVE PROFILE ─────────────────────────────────
def energy_profile(steps, unit="kJ · mol⁻¹", t1="", t2="", fs=1.35,
                   W=900, hi=32.0, lo=-36.0, cum_lo=-84.0):
    PX0, PX1 = 74, 880
    SLOT = (PX1-PX0)/len(steps); BW = SLOT*0.52
    AY0, AY1 = 30, 196
    BY0, BY1 = 250, 372
    yA = lambda v: AY0 + (hi-v)/(hi-lo)*(AY1-AY0)
    yB = lambda v: BY0 + (0-v)/(0-cum_lo)*(BY1-BY0)
    o = [f'<svg viewBox="0 0 {W} 416" style="--fs:{fs}" role="img" aria-label="per-step and cumulative free energy">']
    o.append('<g class="ax-grid">')
    for g in (30,20,10,0,-10,-20,-30): o.append(f'<path d="M{PX0} {yA(g):.1f} H{PX1}"/>')
    for g in (0,-20,-40,-60,-80):      o.append(f'<path d="M{PX0} {yB(g):.1f} H{PX1}"/>')
    o.append(f'</g><g class="ax-zero"><path d="M{PX0} {yA(0):.1f} H{PX1}"/></g>')
    o.append('<g class="ax-t" text-anchor="end">')
    for g in (30,20,10,0,-10,-20,-30):
        o.append(f'<text x="{PX0-7}" y="{yA(g)+3.4:.1f}">{g:+d}</text>' if g else f'<text x="{PX0-7}" y="{yA(g)+3.4:.1f}">0</text>')
    for g in (0,-20,-40,-60,-80): o.append(f'<text x="{PX0-7}" y="{yB(g)+3.4:.1f}">{g}</text>')
    o.append('</g>')
    for i,(num,ab,v) in enumerate(steps):
        c = PX0 + SLOT*i + SLOT/2; x = c - BW/2
        if abs(v) < .05:
            o.append(f'<path class="bar zero" d="M{x:.1f} {yA(0)-1.4:.1f} h{BW:.1f} v2.8 h-{BW:.1f} Z"/>')
            o.append(f'<text class="bar-lab" x="{c:.1f}" y="{yA(0)-7:.1f}">≈ 0</text>')
        else:
            o.append(f'<path class="bar {"pos" if v>0 else "neg"}" d="{vbar(x,BW,yA(0),yA(v))}">'
                     f'<title>Step {num}: {v:+.1f}</title></path>')
            ly = yA(v)-6 if v>0 else yA(v)+13
            o.append(f'<text class="bar-lab" x="{c:.1f}" y="{ly:.1f}">{v:+.1f}</text>')
    run, cum = 0.0, []
    for _,_,v in steps: run += v; cum.append(run)
    pts = [(PX0, yB(0))] + [(PX0+SLOT*i+SLOT/2, yB(c)) for i,c in enumerate(cum)]
    o.append('<path class="cum-line" d="M' + ' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts) + '"/>')
    for i,(x,y) in enumerate(pts):
        o.append(f'<circle class="cum-dot" cx="{x:.1f}" cy="{y:.1f}" r="3.8"/>')
    o.append(f'<text class="cum-end" x="{pts[-1][0]:.1f}" y="{pts[-1][1]-11:.1f}">{cum[-1]:.1f}</text>')
    o.append(f'<text class="cum-start" x="{PX0+6}" y="{yB(0)-8:.1f}">start</text>')
    o.append('<g text-anchor="middle">')
    for i,(num,ab,v) in enumerate(steps):
        c = PX0 + SLOT*i + SLOT/2
        o.append(f'<text class="ax-n" x="{c:.1f}" y="392">{num}</text>')
        o.append(f'<text class="ax-a" x="{c:.1f}" y="406">{ab}</text>')
    o.append('</g>')
    o.append(f'<text class="ch-t" x="0" y="14">{t1}</text>')
    o.append(f'<text class="ch-u" x="{W}" y="14" text-anchor="end">{unit}</text>')
    o.append(f'<text class="ch-t" x="0" y="236">{t2}</text>')
    o.append('<g><rect class="sw neg" x="470" y="5" width="9" height="9" rx="2"/>'
             '<text class="lg-t" x="484" y="13">exergonic</text>'
             '<rect class="sw pos" x="560" y="5" width="9" height="9" rx="2"/>'
             '<text class="lg-t" x="574" y="13">endergonic</text></g>')
    o.append('</svg>')
    return "".join(o)

# ── 5. VALUE LADDER (potentials, pH, energy levels, timelines…) ────────────
def value_ladder(items, brackets, title, lo, hi, W=900, H=372, fs=1.35,
                 AX=306, Y0=40, Y1=326, nudge=None):
    nudge = nudge or {}
    yE = lambda e: Y0 + (e-lo)/(hi-lo)*(Y1-Y0)
    o = [f'<svg viewBox="0 0 {W} {H}" style="--fs:{fs}" role="img" aria-label="{title}">',
         '<defs>', marker("awE", "var(--ink-3)"), '</defs>']
    o.append(f'<g class="ax-grid"><path d="M{AX} {Y0} V{Y1}"/></g>')
    o.append(f'<path class="e-arrow" d="M58 {Y0+16} V{Y1-8}" marker-end="url(#awE)"/>')
    for e, name, val, hl in items:
        y = yE(e); ly = y + nudge.get(e, 0)
        o.append(f'<path class="e-tick" d="M{AX-9} {y:.1f} H{AX+9}"/>')
        o.append(f'<circle class="e-dot {hl or ""}" cx="{AX}" cy="{y:.1f}" r="4.4"/>')
        o.append(f'<text class="e-name" x="{AX-18}" y="{ly+3.4:.1f}" text-anchor="end">{name}</text>')
        o.append(f'<text class="e-val" x="{AX+20}" y="{ly+3.4:.1f}">{val}</text>')
    for bx, e1, e2, cls, lines, ty in brackets:
        y1, y2 = yE(e1), yE(e2)
        o.append(f'<path class="brk {cls}" d="M{bx} {y1:.1f} H{bx+8} V{y2:.1f} H{bx}"/>')
        for j, (txt, tc) in enumerate(lines):
            o.append(f'<text class="{tc}" x="{bx+16}" y="{ty + j*16}">{txt}</text>')
    o.append(f'<text class="ch-t" x="0" y="14">{title}</text>')
    o.append('</svg>')
    return "".join(o)

# ── 6. STACKED COMPARISON BARS ─────────────────────────────────────────────
def stacked_bars(rows, total, title, unit, ticks, W=900, H=196, fs=1.35):
    X0, X1 = 132, 872
    xC = lambda v: X0 + v/total*(X1-X0)
    o = [f'<svg viewBox="0 0 {W} {H}" style="--fs:{fs}" role="img" aria-label="{title}">']
    o.append('<g class="ax-grid">')
    for t in ticks: o.append(f'<path d="M{xC(t):.1f} 30 V{H-28}"/>')
    o.append('</g><g class="ax-t" text-anchor="middle">')
    for t in ticks: o.append(f'<text x="{xC(t):.1f}" y="24">{t}</text>')
    o.append('</g>')
    for label, y, segs in rows:
        o.append(f'<text class="row-lab" x="{X0-12}" y="{y+22}" text-anchor="end">{label}</text>')
        run = 0
        for j,(nm,v,slot) in enumerate(segs):
            x0, x1 = xC(run), xC(run+v)
            gapv = 2 if j < len(segs)-1 else 0
            o.append(f'<path class="seg s{slot}" d="{hseg(x0,x1-gapv,y,32,4,j==0,j==len(segs)-1)}">'
                     f'<title>{nm}: {v}</title></path>')
            o.append(f'<text class="seg-val" x="{(x0+x1-gapv)/2:.1f}" y="{y-5}">{v}</text>')
            run += v
        lx = X0
        for nm,v,slot in segs:
            o.append(f'<rect class="sw s{slot}" x="{lx}" y="{y+43}" width="9" height="9" rx="2"/>')
            o.append(f'<text class="lg-t" x="{lx+14}" y="{y+51}">{nm}</text>')
            lx += 26 + len(nm)*5.6
    o.append(f'<text class="ch-t" x="0" y="12">{title}</text>')
    o.append(f'<text class="ch-u" x="{W}" y="12" text-anchor="end">{unit}</text>')
    o.append('</svg>')
    return "".join(o)

# ── 7. LINEAR PROCESS FLOW ────────────────────────────────────────────────
def arrow_svg(cls=""):
    return (f'<svg class="arw {cls}" viewBox="0 0 22 11" aria-hidden="true">'
            f'<path d="M1 5.5C7 4 12 7 18 5.5"/><path d="M14 3L19.5 5.5L14 8"/></svg>')

# ── 8. PROCESS FLOW (linear mechanism: in → machine → out, with side flows) ─
def process_flow(stages, inputs=(), outputs=(), footer=(), W=900, H=214):
    """stages: [(x0,x1,label,sublabel,kind)] kind in {'box','machine'}
       inputs/outputs: [(x, text, colour)] drawn above / below the machine."""
    o = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="process flow">',
         '<defs>', rough("rf", .03, 1.5, 9), marker("awF", "var(--ink-3)"),
         marker("awI", "var(--teal)"), '</defs>']
    MY0, MY1 = 62, 132
    o.append('<g filter="url(#rf)" fill="none" stroke-linecap="round">')
    for x0, x1, lab, sub, kind in stages:
        if kind == "machine":
            o.append(f'<rect x="{x0}" y="{MY0-16}" width="{x1-x0}" height="{MY1-MY0+32}" '
                     f'rx="14" ry="11" fill="var(--w-teal)" stroke="var(--teal)" stroke-width="1.9"/>')
        else:
            o.append(f'<rect x="{x0}" y="{MY0}" width="{x1-x0}" height="{MY1-MY0}" '
                     f'rx="11" ry="9" fill="var(--w-ochre)" stroke="var(--b-ochre)" stroke-width="1.6"/>')
    for i in range(len(stages)-1):
        a, b = stages[i][1], stages[i+1][0]
        o.append(f'<path d="M{a+8} {(MY0+MY1)/2} H{b-10}" stroke="var(--ink-3)" '
                 f'stroke-width="1.8" marker-end="url(#awF)"/>')
    for x, txt, col in inputs:
        o.append(f'<path d="M{x} 26 V{MY0-22}" stroke="var(--teal)" stroke-width="1.5" marker-end="url(#awI)"/>')
    for x, txt, col in outputs:
        o.append(f'<path d="M{x} {MY1+18} V{MY1+48}" stroke="{col}" stroke-width="1.5" marker-end="url(#awF)"/>')
    o.append('</g><g text-anchor="middle">')
    for x0, x1, lab, sub, kind in stages:
        cx = (x0+x1)/2
        o.append(f'<text class="d-name" x="{cx}" y="{(MY0+MY1)/2 - 2}" fill="var(--ink)">{lab}</text>')
        if sub:
            o.append(f'<text class="d-sub" x="{cx}" y="{(MY0+MY1)/2 + 14}" fill="var(--ink-3)">{sub}</text>')
    for x, txt, col in inputs:
        o.append(f'<text class="d-out" x="{x}" y="18" fill="{col}">{txt}</text>')
    for x, txt, col in outputs:
        o.append(f'<text class="d-out" x="{x}" y="{MY1+62}" fill="{col}">{txt}</text>')
    for x, txt, col in footer:
        o.append(f'<text class="d-hand" x="{x}" y="{H-6}" fill="{col}">{txt}</text>')
    o.append('</g></svg>')
    return "".join(o)
