# The design system

The rules the engine enforces, and why each one exists. Everything here is
expressed as a token in `engine/theme.py`, so the system can be retuned without
touching layout, content or diagram code.

## 1. Paper is a layer, not a decoration

The single load-bearing rule. The warm graph ground is emitted **once per page
as a full-bleed vector SVG at z-index 0**, and every other element sits on top of
it. It is never a rectangle drawn behind a content area.

| Token | Value | Why |
|---|---|---|
| `base` | `#F2E8D3` | warm ivory; pure white is a failure condition |
| `base_edge` | `#E4D6B9` | browner toward the edges, like handled stock |
| `grid_minor_mm` | 5.0 mm | true graph-paper square |
| `grid_major_every` | 5 (25 mm) | the heavier line every fifth square |
| `grid_minor_w / alpha` | 0.16 mm / 0.33 | hairline, low contrast, still legible |
| `grid_major_w / alpha` | 0.24 mm / 0.50 | structure without competing with content |
| `grain_count / alpha` | 520 / 0.055 | deterministic fibre specks |

The grid is drawn as explicit `<path>` lines rather than a CSS repeating
gradient, so it stays vector in the PDF and crisp at any zoom. Ring-binder holes
and an edge vignette complete the sheet.

## 2. Cards are washes, not panels

A card is a translucent highlighter mark over the paper. Fill sits at **8.5 %**
(11.5 % for emphasis) — inside the 5–12 % band the brief asks for — and the
border is allowed to be much stronger than the fill.

The audit proves this rather than asserting it: it measures the grid's
on-line-versus-mid-cell contrast **inside** card areas and **outside** them. In
the shipped documents the ratio runs **0.65–0.90**, i.e. the graph paper is still
plainly visible through every card.

No gradients, no glassmorphism, no shadows, no opaque colour blocks. The border
is a hand-drawn double stroke generated at the card's final size, with slightly
unequal corner radii and a rotation of at most ±0.16°.

## 3. Three typographic layers

| Level | Face | Size | Use |
|---|---|---|---|
| 1 — page title | Caveat 700 | 33 pt | marker lettering, rotated −0.45° |
| 2 — card headings | Caveat 700 | 14 pt | coloured, over a wobbled underline |
| 3 — body | Source Sans 3 | 8 pt / 1.30 | compact academic prose |
| data | IBM Plex Mono | 7.7 pt | figures, thresholds, code, doses |

Not everything is handwritten. Formulas, tables, doses and code are set in
precise type — the handwriting carries the *voice*, the typesetting carries the
*data*. All four faces are SIL Open Font Licence and are vendored in
`assets/fonts/`, so a build is reproducible offline and the PDF is self-contained.

## 4. Colour is an information system

| Accent | Hex | Meaning |
|---|---|---|
| green | `#4E7A46` | correct, accepted, positive mechanism |
| teal | `#2E6E71` | core concept, neutral scientific information |
| ochre | `#9C7A24` | procedure, important note, secondary information |
| orange | `#B5652B` | section identity, emphasis |
| violet | `#67518C` | deeper mechanism, special concept |
| red | `#A4442F` | warning, error, critical issue |
| blue | `#35618E` | data, measurement, reference values |

All muted; nothing near neon. Each module type carries a semantic default, so a
page is colour-coded correctly without the author choosing.

## 5. Density is solved, not hoped for

Target band **80–92 %** of the content box, hard floor 72 %, bottom third at
least 55 % covered.

The solver spends leftover height in a fixed order — inter-card gaps up to a
9 mm cap, then stretchable cards up to 20 % of their height (11 mm max) — and
distributes it **per column**, so every column reaches the foot of the sheet. A
page-wide justification is what leaves one ragged empty corner.

What it will not do is invent padding. Slack it cannot legitimately spend is
reported as *"add a module"*; content that will not fit is reported as *"move a
module"*. Both name the page and the millimetres, so the fix is mechanical.

It also flags a module left alone across a row, which is the most common way a
half-page hole appears.

## 6. Vertical distribution

Content is authored as many small modules rather than a few large ones, laid out
in bands: full-width modules break the page into bands, and each band splits into
balanced columns **in reading order**. On a tie the earlier column is filled
first, so a lone card can never land on the right leaving the left blank.

## 7. Hand-drawn, deterministically

Every wobble is seeded from `theme.seed`, so a document renders identically on
every run — diffable output, no rendering lottery.

- Strokes: polylines are resampled, perturbed, then smoothed through a
  Catmull-Rom to cubic conversion, so they read as pen lines rather than noise.
- Arrows: two short strokes for the head, never a filled triangle.
- Rectangles: unequal corner radii, jittered edges.
- Underlines: a wobbled path scaled to the heading's own width.

Amplitudes are small (0.15–0.6 mm) — enough to remove the machine-plotted look,
never enough to cost alignment or legibility.

## 8. Diagrams belong to the notebook

Ten generators, all subject-agnostic:

| Kind | Shape of the idea |
|---|---|
| `feedback_loop` | a regulated variable with opposing correction arms |
| `flow` | a procedure or algorithm, with side annotations |
| `cycle` | a recurring process |
| `curves` | any x/y relationship, with bands and peak markers |
| `scale` | graded thresholds and reference ranges |
| `hierarchy` | classifications and causal breakdowns |
| `timeline` | events, staging, historical sequence |
| `compare` | a two-sided contrast |
| `triage` | severity bands each selecting an action, over a common base |
| `custom` | author-supplied SVG in millimetre coordinates |

Diagram height is capped rather than scaled from the width, so a wide card cannot
turn a small diagram into a mostly-empty rectangle — and where a diagram is the
page's primary object it can be given an explicit height, which is distributed
into the boxes rather than into air.
