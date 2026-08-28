"""Design tokens for the academic visual notebook engine.

Everything visual is expressed here so a document's look can be retuned
without touching layout, content or diagram code.  Units are millimetres
unless a name says otherwise; the renderer is print-first (A4).
"""
from dataclasses import dataclass, field, replace
from typing import Dict, Tuple


# --------------------------------------------------------------------------
# colour helpers
# --------------------------------------------------------------------------
def hex_to_rgb(h: str) -> Tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgba(h: str, a: float) -> str:
    r, g, b = hex_to_rgb(h)
    return f"rgba({r},{g},{b},{a:g})"


def mix(h1: str, h2: str, t: float) -> str:
    """Linear blend between two hex colours (t=0 -> h1, t=1 -> h2)."""
    a, b = hex_to_rgb(h1), hex_to_rgb(h2)
    c = tuple(round(x + (y - x) * t) for x, y in zip(a, b))
    return "#%02X%02X%02X" % c


# --------------------------------------------------------------------------
# semantic accent palette  (section M of the design brief)
# --------------------------------------------------------------------------
#   green  : correct / accepted / positive mechanism
#   teal   : core concept / neutral scientific information
#   ochre  : procedure / important note / secondary information
#   orange : section identity / emphasis
#   violet : deeper mechanism / special concept
#   red    : warning / error / critical issue
#   blue   : data, measurement, reference values
ACCENTS: Dict[str, str] = {
    "green":  "#4E7A46",
    "teal":   "#2E6E71",
    "ochre":  "#9C7A24",
    "orange": "#B5652B",
    "violet": "#67518C",
    "red":    "#A4442F",
    "blue":   "#35618E",
    "ink":    "#33322F",
}


@dataclass(frozen=True)
class Paper:
    """The permanent background layer: warm stock + full-bleed graph grid."""
    base: str = "#F2E8D3"          # warm ivory / beige — never pure white
    base_edge: str = "#E4D6B9"     # slightly browner toward the page edges
    vignette_alpha: float = 0.34   # strength of the edge darkening
    grid_minor_mm: float = 5.0     # square spacing of the fine grid
    grid_major_every: int = 5      # a stronger line every N minor squares
    grid_minor_color: str = "#9C8A63"
    grid_major_color: str = "#8C7A52"
    grid_minor_alpha: float = 0.33
    grid_major_alpha: float = 0.50
    grid_minor_w: float = 0.16     # mm — hairlines only
    grid_major_w: float = 0.24
    grain_count: int = 520         # deterministic paper-fibre specks
    grain_alpha: float = 0.055


@dataclass(frozen=True)
class Type:
    """Three-layer typography (section L)."""
    hand: str = "'Caveat', 'Source Sans 3', sans-serif"
    hand_alt: str = "'Patrick Hand', 'Source Sans 3', sans-serif"
    body: str = "'Source Sans 3', 'DejaVu Sans', sans-serif"
    mono: str = "'IBM Plex Mono', 'DejaVu Sans Mono', monospace"

    title_pt: float = 33.0         # level 1 — page title, marker lettering
    kicker_pt: float = 9.5
    section_pt: float = 14.0       # level 2 — card headings, handwritten
    body_pt: float = 8.0           # level 3 — compact academic body text
    small_pt: float = 7.1
    micro_pt: float = 6.3
    body_lh: float = 1.30
    ink: str = "#2E2C29"           # warm near-black, like fountain-pen ink
    ink_soft: str = "#55504A"


@dataclass(frozen=True)
class Card:
    """Translucent highlighter washes (section D) — never solid UI panels."""
    fill_alpha: float = 0.085      # 5–12 % target band
    fill_alpha_strong: float = 0.115
    edge_alpha: float = 0.52       # borders may be stronger than fills
    edge_w: float = 0.30           # mm
    radius: float = 1.7            # mm
    pad_x: float = 3.0
    pad_y: float = 2.5
    head_gap: float = 1.5
    sketch_border: bool = True     # hand-drawn stroke instead of a CSS rect
    jitter_deg: float = 0.16       # controlled imperfection


@dataclass(frozen=True)
class PageGeom:
    width: float = 210.0           # A4
    height: float = 297.0
    margin_x: float = 10.0
    margin_top: float = 9.0
    margin_bottom: float = 9.5
    gutter: float = 4.6            # between columns
    v_gap: float = 3.0             # minimum gap between stacked cards
    v_gap_max: float = 9.0         # cap when justifying a short column
    columns: int = 2

    @property
    def content_w(self) -> float:
        return self.width - 2 * self.margin_x

    @property
    def content_h(self) -> float:
        return self.height - self.margin_top - self.margin_bottom

    def col_w(self, columns: int = None) -> float:
        n = columns or self.columns
        return (self.content_w - self.gutter * (n - 1)) / n

    def span_w(self, span: int, columns: int = None) -> float:
        n = columns or self.columns
        span = min(span, n)
        return self.col_w(n) * span + self.gutter * (span - 1)

    def col_x(self, index: int, columns: int = None) -> float:
        n = columns or self.columns
        return self.margin_x + index * (self.col_w(n) + self.gutter)


@dataclass(frozen=True)
class Density:
    """Section E — the page must feel filled, not padded."""
    target_min: float = 0.80
    target_max: float = 0.92
    hard_min: float = 0.72         # below this the page is a FAIL
    bottom_band_min: float = 0.55  # bottom third must carry real information


@dataclass(frozen=True)
class Theme:
    paper: Paper = field(default_factory=Paper)
    type: Type = field(default_factory=Type)
    card: Card = field(default_factory=Card)
    geom: PageGeom = field(default_factory=PageGeom)
    density: Density = field(default_factory=Density)
    accents: Dict[str, str] = field(default_factory=lambda: dict(ACCENTS))
    seed: int = 20250828

    def accent(self, name: str) -> str:
        return self.accents.get(name or "teal", self.accents["teal"])

    def wash(self, name: str, strong: bool = False) -> str:
        a = self.card.fill_alpha_strong if strong else self.card.fill_alpha
        return rgba(self.accent(name), a)

    def edge(self, name: str, alpha: float = None) -> str:
        return rgba(self.accent(name), alpha if alpha is not None else self.card.edge_alpha)

    def with_columns(self, n: int) -> "Theme":
        return replace(self, geom=replace(self.geom, columns=n))


DEFAULT = Theme()
