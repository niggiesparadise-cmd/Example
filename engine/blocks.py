"""Information modules (section G).

Each module renders one translucent card.  Modules are deliberately small and
numerous — a page is built from many compact blocks rather than a few large
panels — and the set is subject-agnostic: DEFINITION, KEY FACTS, MECHANISM,
PROCESS, COMPARISON, TABLE, FORMULA, WORKED EXAMPLE, EXAM POINT, CLINICAL /
TECHNICAL NOTE, COMMON MISTAKE, SUMMARY, KEY TAKEAWAY.
"""
import html
import re
from typing import Dict, List, Optional

from . import diagrams
from .sketch import rough_rect, underline, rng, _fmt
from .theme import Theme, rgba

# --------------------------------------------------------------------------
# inline mini-markup, so content stays readable in the source YAML
#   **bold**   *italic*   ==highlight==   `mono`   [[term]]   ^sup^   _sub_
# --------------------------------------------------------------------------
_INLINE = [
    (re.compile(r"\*\*(.+?)\*\*"), r"<b>\1</b>"),
    (re.compile(r"(?<![\w*])\*([^*\n]+?)\*(?![\w*])"), r"<em>\1</em>"),
    (re.compile(r"==(.+?)=="), r'<span class="hl">\1</span>'),
    (re.compile(r"`(.+?)`"), r'<span class="num">\1</span>'),
    (re.compile(r"\[\[(.+?)\]\]"), r'<span class="term">\1</span>'),
    (re.compile(r"\{\{(.+?)\}\}"), r'<span class="tint">\1</span>'),
    (re.compile(r"\^([^\s^]+)\^"), r"<sup>\1</sup>"),
    (re.compile(r"(?<=\w)_([A-Za-z0-9,+-]+?)_"), r"<sub>\1</sub>"),
]


def inline(text: str) -> str:
    s = html.escape(str(text), quote=False)
    for rx, rep in _INLINE:
        s = rx.sub(rep, s)
    s = s.replace("-->", "&rarr;").replace("->", "&rarr;")
    # typed comparison operators become real glyphs after escaping
    return (s.replace("&lt;=", "&le;").replace("&gt;=", "&ge;")
             .replace("+/-", "&plusmn;").replace("~=", "&asymp;"))


def _accent_vars(theme: Theme, accent: str) -> str:
    col = theme.accent(accent)
    return (f"--card-accent:{col};"
            f"--card-wash:{rgba(col, theme.card.fill_alpha)};"
            f"--card-wash-strong:{rgba(col, theme.card.fill_alpha_strong)};"
            f"--card-edge:{rgba(col, theme.card.edge_alpha)};"
            f"--card-hl:{rgba(col, 0.16)};")


def card_head(theme: Theme, mod: Dict, seed: int) -> str:
    title = mod.get("title")
    if not title:
        return ""
    tag = mod.get("tag")
    if tag:
        norm = lambda t: re.sub(r"[^a-z0-9 ]+", " ", str(t).lower()).split()
        # never label a card with words its own title already says
        if " ".join(norm(tag)) in " ".join(norm(title)):
            tag = None
    ul = ""
    if mod.get("underline", True):
        ul = f'<span class="ul">{underline(120, seed, amp=0.75, thickness=1.7)}</span>'
    tag_html = f'<span class="card-tag">{html.escape(tag)}</span>' if tag else ""
    sub = f'<p class="card-sub">{inline(mod["subtitle"])}</p>' if mod.get("subtitle") else ""
    return (f'<div class="card-head"><span class="card-title">{inline(title)}{ul}</span>'
            f'{tag_html}</div>{sub}')


def wrap_card(theme: Theme, mod: Dict, body: str, seed: int,
              measure: bool = False) -> str:
    """Assemble one card: wash + hand-drawn edge + heading + body."""
    accent = mod.get("accent", "teal")
    style = _accent_vars(theme, accent)
    rot = mod.get("rotate")
    if rot is None:
        rot = rng(seed).uniform(-theme.card.jitter_deg, theme.card.jitter_deg)
    cls = "card"
    if not theme.card.sketch_border:
        cls += " plain-edge"
    extra = f"transform:rotate({rot:.3f}deg);"
    return (f'<div class="{cls}" data-mod="{mod.get("type","note")}" '
            f'style="{style}{extra}">'
            f'{card_head(theme, mod, seed)}{body}</div>')


def sketch_edge(theme: Theme, w_mm: float, h_mm: float, seed: int) -> str:
    """A hand-drawn card border, sized once the layout is known."""
    d1 = rough_rect(0.35, 0.35, w_mm - 0.70, h_mm - 0.70, theme.card.radius, seed, 0.42)
    d2 = rough_rect(0.62, 0.62, w_mm - 1.24, h_mm - 1.24, theme.card.radius, seed + 5, 0.60)
    return (f'<svg class="sketch-edge" xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {_fmt(w_mm)} {_fmt(h_mm)}" preserveAspectRatio="none">'
            f'<path d="{d1}" fill="none" stroke="var(--card-edge)" stroke-width="0.3"/>'
            f'<path d="{d2}" fill="none" stroke="var(--card-edge)" stroke-width="0.14" '
            f'stroke-opacity="0.34"/></svg>')


# --------------------------------------------------------------------------
# module bodies
# --------------------------------------------------------------------------
def _paras(items) -> str:
    if isinstance(items, str):
        items = [items]
    return "".join(f"<p>{inline(p)}</p>" for p in items)


def _list(items: List, ordered: bool = False, style: str = "") -> str:
    tag = "ol" if ordered else "ul"
    cls = "bul" + (f" {style}" if style else "")
    lis = "".join(f"<li>{inline(i)}</li>" for i in items)
    return f'<{tag} class="{cls}">{lis}</{tag}>'


def m_note(theme, mod, w, seed):
    out = ""
    if mod.get("body"):
        out += _paras(mod["body"])
    if mod.get("items"):
        out += _list(mod["items"], mod.get("ordered", False), mod.get("marker", ""))
    if mod.get("chips"):
        out += m_chips_body(mod["chips"])
    return out


def m_definition(theme, mod, w, seed):
    term = mod.get("term")
    lead = f'<p><span class="term">{inline(term)}</span> — ' if term else "<p>"
    body = mod.get("body", "")
    if isinstance(body, list):
        first, rest = body[0], body[1:]
    else:
        first, rest = body, []
    out = lead + inline(first) + "</p>" + _paras(rest)
    if mod.get("items"):
        out += _list(mod["items"], style=mod.get("marker", ""))
    if mod.get("chips"):
        out += m_chips_body(mod["chips"])
    return out


def m_chips_body(chips: List) -> str:
    out = []
    for c in chips:
        if isinstance(c, dict):
            k = f'<span class="k">{inline(c["k"])}</span> ' if c.get("k") else ""
            v = f'<span class="v">{inline(c["v"])}</span>' if c.get("v") else ""
            out.append(f'<span class="chip">{k}{v}</span>')
        else:
            out.append(f'<span class="chip">{inline(c)}</span>')
    return f'<div class="chips">{"".join(out)}</div>'


def m_chips(theme, mod, w, seed):
    pre = _paras(mod["body"]) if mod.get("body") else ""
    return pre + m_chips_body(mod.get("chips", mod.get("items", [])))


def m_stats(theme, mod, w, seed):
    cells = "".join(
        f'<div class="stat"><span class="v">{inline(s["v"])}</span>'
        f'<span class="l">{inline(s["l"])}</span></div>'
        for s in mod["items"]
    )
    pre = _paras(mod["body"]) if mod.get("body") else ""
    post = _paras(mod["footnote"]) if mod.get("footnote") else ""
    return f'{pre}<div class="stats">{cells}</div>{post}'


def m_table(theme, mod, w, seed):
    cols = mod["columns"]
    aligns = mod.get("align", [""] * len(cols))
    head = "".join(
        f'<th class="{"n" if a=="n" else ""}">{inline(c)}</th>'
        for c, a in zip(cols, aligns + [""] * len(cols))
    )
    rows = []
    for r in mod["rows"]:
        tds = []
        for i, cell in enumerate(r):
            a = aligns[i] if i < len(aligns) else ""
            cls = "k" if i == 0 and mod.get("key_first", True) else ""
            if a == "n":
                cls = (cls + " n").strip()
            tds.append(f'<td class="{cls}">{inline(cell)}</td>')
        rows.append("<tr>" + "".join(tds) + "</tr>")
    pre = _paras(mod["body"]) if mod.get("body") else ""
    post = _paras(mod["footnote"]) if mod.get("footnote") else ""
    return (f'{pre}<table class="nb"><thead><tr>{head}</tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>{post}')


def m_steps(theme, mod, w, seed):
    pre = _paras(mod["body"]) if mod.get("body") else ""
    return pre + _list(mod["items"], ordered=True)


def m_formula(theme, mod, w, seed):
    """GIVEN -> FORMULA -> SUBSTITUTION -> CALCULATION -> RESULT (section O)."""
    out = []
    if mod.get("body"):
        out.append(_paras(mod["body"]))
    if mod.get("expr"):
        out.append(f'<div class="fx">{mod["expr"]}</div>')
    rows = []
    for key in ("given", "formula", "substitution", "calculation"):
        if mod.get(key):
            vals = mod[key] if isinstance(mod[key], list) else [mod[key]]
            for i, v in enumerate(vals):
                lbl = key.upper() if i == 0 else ""
                rows.append(f'<div class="lbl">{lbl}</div><div class="val">{inline(v)}</div>')
    if rows:
        out.append(f'<div class="calc-step">{"".join(rows)}</div>')
    if mod.get("result"):
        out.append(f'<div class="answer">{inline(mod["result"])}</div>')
    if mod.get("interpretation"):
        out.append(f'<p class="margin-note" style="margin-top:1mm">'
                   f'{inline(mod["interpretation"])}</p>')
    return "".join(out)


def m_diagram(theme, mod, w, seed):
    inner = w - 2 * theme.card.pad_x
    svg, h = diagrams.build(theme, mod["kind"], inner, mod.get("spec", mod))
    cap = f'<div class="caption">{inline(mod["caption"])}</div>' if mod.get("caption") else ""
    pre = _paras(mod["body"]) if mod.get("body") else ""
    return f'{pre}<div class="diagram">{svg}</div>{cap}'


def m_callout(theme, mod, w, seed):
    return m_note(theme, mod, w, seed)


def m_source(theme, mod, w, seed):
    items = mod.get("items", [])
    lis = "".join(f'<li>{inline(i)}</li>' for i in items)
    return (f'{_paras(mod.get("body", []))}'
            f'<ul class="bul" style="font-size:6.4pt">{lis}</ul>')


# default heading tags per module type — keeps the visual grammar consistent
DEFAULT_TAG = {
    "definition": "DEFINITION",
    "mechanism": "MECHANISM",
    "process": "PROCESS",
    "example": "EXAMPLE",
    "exam": "EXAM POINT",
    "clinical": "CLINICAL NOTE",
    "technical": "TECHNICAL NOTE",
    "mistake": "COMMON MISTAKE",
    "warning": "WARNING",
    "summary": "SUMMARY",
    "takeaway": "KEY TAKEAWAY",
    "formula": "FORMULA",
    "worked": "WORKED EXAMPLE",
}
DEFAULT_ACCENT = {
    "definition": "teal",
    "facts": "teal",
    "mechanism": "violet",
    "process": "ochre",
    "example": "green",
    "exam": "ochre",
    "clinical": "violet",
    "technical": "violet",
    "mistake": "red",
    "warning": "red",
    "summary": "green",
    "takeaway": "orange",
    "formula": "blue",
    "worked": "blue",
    "table": "teal",
    "diagram": "teal",
    "stats": "blue",
    "timeline": "ochre",
}

BUILDERS = {
    "note": m_note, "definition": m_definition, "facts": m_note,
    "mechanism": m_note, "process": m_steps, "steps": m_steps,
    "example": m_note, "exam": m_note, "clinical": m_note, "technical": m_note,
    "mistake": m_note, "warning": m_note, "summary": m_note, "takeaway": m_note,
    "table": m_table, "formula": m_formula, "worked": m_formula,
    "diagram": m_diagram, "chips": m_chips, "stats": m_stats, "source": m_source,
}


def render_module(theme: Theme, mod: Dict, width_mm: float, seed: int) -> str:
    typ = mod.get("type", "note")
    if typ not in BUILDERS:
        raise KeyError(f"unknown module type {typ!r}; have {sorted(BUILDERS)}")
    mod = dict(mod)
    mod.setdefault("accent", DEFAULT_ACCENT.get(typ, "teal"))
    if "tag" not in mod and typ in DEFAULT_TAG:
        mod["tag"] = DEFAULT_TAG[typ]
    body = BUILDERS[typ](theme, mod, width_mm, seed)
    return wrap_card(theme, mod, body, seed)
