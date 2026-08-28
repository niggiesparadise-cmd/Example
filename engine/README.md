# Academic Visual Notebook Engine

A subject-agnostic system for generating dense, printable A4 revision sheets that
look like a carefully kept handwritten notebook. It carries no subject knowledge —
content modules supply that.

```
engine/notebook.css   the design system: page, module bed, modules, type, tables
engine/blocks.py      diagram primitives that emit SVG in the engine's visual language
engine/build.py       assembles content + engine into one HTML file and an A4 PDF,
                      then runs the quality-control checks
content/<topic>.py    the only file that changes between subjects
```

## Build

```
python3 engine/build.py <content-module> <out-basename> "<Title>"
```

Writes `<out-basename>.html` (a self-contained artifact) and `<out-basename>.pdf`
(A4, one PDF page per `.page`, no reflow), then prints a QC table.

## The three ideas that make it work

**The page paints its own paper.** Warm ivory plus the graph-paper grid are a
background on `.page` itself, not on a container inside it, so the grid reaches all
four edges. Print uses `@page{margin:0}`, so the printed sheet and the screen sheet
are the same object — nothing reflows between them.

**Every module is a wash.** `.m` and its colour variants fill at 6–10 % opacity, so
the grid reads straight through. Nothing in the system paints an opaque panel;
borders carry the definition instead of fills.

**Pages are composed, not flowed.** Each `.page` is a fixed 210 × 297 mm box with a
12-column `.bed`. Because the bed is constrained (`min-height:0`), content that does
not fit is *detectable* rather than silently pushed off, which is what makes the QC
loop possible.

## Quality control

`build.py` reports, per page:

| Column | Meaning | Target |
|---|---|---|
| `overflow` | px by which the bed exceeds the sheet | `0` |
| `fill%` | how far down the bed the last module reaches | 94–107 |
| `util%` | share of 10 mm cells carrying ink | higher is denser |
| `paper` | modal page colour | warm, never `#FFFFFF` |
| `grid` | grid present in all four edge bands | `True` |

`util%` is a guide, not a goal: pages built around line diagrams score lower because
a diagram's bounding box is mostly empty by design. Read it together with `fill%`.

## Composition vocabulary

- **Page** — `.page` › `.page__head` · `.bed` · `.page__foot`
- **Bed** — `.c1`…`.c12` column spans; `.stack` and `.row` for nesting
- **Module** — `.m` plus `.m--teal|green|ochre|orange|rust|violet|red|bare`,
  `.m__tag` for the small caps label, `.m--tiltl/r` for a degree of hand-placed skew
- **Type** — `.t1` display · `.t2` section · `.t3` module heading · `.p` body ·
  `.hand` annotation · `.note` marginalia · `.eq` typeset equation
- **Data** — `table`, `.tiles`/`.tile`, `.calc` (Given → Formula → Substitute →
  Calculate → Result → Interpret), `.flow`/`.chip`/`.pill`

## Diagram primitives

`ladder`, `alkene_trans` (stacked-label structures), `cycle_wheel` (any n-station
loop), `spine_map` (inputs below / outputs above a backbone), `process_flow`
(in → machine → out with side flows), `energy_profile` (diverging bars over a
cumulative line), `value_ladder` (any quantity on a real axis), `stacked_bars`.

Charts scale their own type through `--fs`, set per instance to roughly
`viewBox width ÷ rendered width`, so a chart stays legible in a narrow column.

## Colour is an information system

teal = core concept · green = mechanism, accepted · ochre = important value or
procedure · orange = section identity · violet = deeper explanation · rust =
consequence, caution · red = error, warning. Chart marks use a separate CVD-validated
palette (`--c1/--c2/--c3`, `--c-neg/--c-pos`) because page hues are too muted to
carry data.

## Porting to another subject

Write `content/<topic>.py` exposing `PAGES` — a list of HTML strings, one per sheet.
Nothing in `notebook.css` or `blocks.py` needs to change. Diagram choice follows the
subject: mechanisms and pathways for the sciences, timelines and cause–effect maps
for history, decision trees for law, architecture diagrams and complexity plots for
computing.
