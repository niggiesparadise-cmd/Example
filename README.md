# Academic Visual Notebook Engine

A reusable document engine that turns a plain content file into dense,
hand-drawn-looking academic revision sheets — warm graph paper, translucent
highlighter cards, handwritten headings, original vector diagrams — and then
**measures the rendered pixels** to prove the result is actually dense, actually
translucent, and actually covered in graph paper.

The visual language is fixed. The information architecture adapts to the
subject: the same engine renders endocrine pharmacology, binary search and the
Industrial Revolution without a line of code changing.

```
python -m engine.cli content/endocrine_2025.yaml -o out/endocrine_2025.pdf \
       --png out/png --audit --strict
```

| Document | Pages | Fill | Vertical use | Grid coverage |
|---|---|---|---|---|
| `content/endocrine_2025.yaml` | 11 | 82–95 % | 95–100 % | 100 % |
| `content/demo_subjects.yaml`  | 2  | 82–96 % | 95–100 % | 100 % |

---

## What is in here

```
engine/
  theme.py      design tokens — paper stock, grid, palette, type scale, density band
  paper.py      the full-bleed vector graph-paper layer + the document stylesheet
  sketch.py     seeded hand-drawn geometry: rough rects, arcs, wobbled pen arrows
  diagrams.py   10 subject-agnostic diagram kinds
  blocks.py     information modules (definition, facts, table, formula, ...)
  layout.py     measurement-driven packing and the density solver
  render.py     two-pass headless-Chromium pipeline
  audit.py      pixel-level QC against the brief's failure conditions
  cli.py        build / rasterise / audit
content/        content documents (YAML)
assets/fonts/   Caveat, Patrick Hand, Source Sans 3, IBM Plex Mono (all OFL)
docs/           the extracted design system, and source attribution
```

## Install

```bash
pip install -r requirements.txt
# Chromium: the engine looks for $NOTEBOOK_CHROME, then the Playwright browser
# directory, then chromium / google-chrome on PATH.
```

## How it works

Nothing is left to automatic flow, because automatic flow is what produces
sparse pages.

1. **Measure.** Every module is rendered in headless Chromium at exactly the
   width it will occupy, and its height is read back in millimetres.
2. **Pack.** Modules are split into columns in reading order (a balanced split
   that keeps the newspaper flow), with full-width modules acting as band
   breaks.
3. **Solve for density.** The leftover height on each *column* is spent — first
   widening the gaps up to a cap, then letting stretchable cards breathe — until
   the page reaches the 80–92 % utilisation band. Whatever cannot be spent is
   reported as *"add a module"* rather than quietly padded, and an over-full page
   is reported as *"move a module"* rather than quietly overflowing.
4. **Place.** Cards are emitted at absolute positions over the paper layer, each
   with a hand-drawn border generated at its final size.
5. **Verify.** The real DOM is re-measured to catch any card whose content
   exceeds its box or runs past the bottom margin.
6. **Audit.** The PDF is rasterised and checked on pixels (see below).

## Writing content

```yaml
title: Endocrine 2025
columns: 2
pages:
  - title: "DIABETES — {{glucose control}}"     # {{...}} tints part of the title
    kicker: "endocrine · sheet 1"
    modules:
      - type: definition
        title: "What diabetes is"
        accent: teal
        term: "Diabetes"
        body: "a syndrome with ==hyperglycaemia== as its hallmark."
        chips: [{k: "Normal glucose", v: "3.5–7 mmol/ml"}]

      - type: diagram
        kind: feedback_loop
        span: 2
        spec: { ... }
```

**Module types** — `definition`, `facts`, `note`, `mechanism`, `process` /
`steps`, `example`, `table`, `formula`, `worked`, `diagram`, `chips`, `stats`,
`exam`, `clinical`, `technical`, `mistake`, `warning`, `summary`, `takeaway`,
`source`. Each carries a default accent colour and heading tag, both overridable.

**Diagram kinds** — `feedback_loop`, `flow`, `cycle`, `curves`, `scale`,
`hierarchy`, `timeline`, `compare`, `triage`, `custom` (raw SVG in mm).

**Inline markup** — `**bold**`, `*italic*`, `==highlight==`, `` `mono` ``,
`[[term]]`, `{{tint}}`, `^sup^`, `x_sub_`, `->` becomes an arrow, `<=` becomes ≤.

## The audit

`--audit` rasterises the PDF and measures each page, so the brief's failure
conditions are checked on the *output*, not on intent:

| Check | Method | Fails when |
|---|---|---|
| Pure-white background | fraction of near-white pixels | > 2 % |
| Warm paper | mean (R − B) | < 8 |
| Grid reaches the whole sheet | 25 mm tiles, each tested for the 5 mm periodic luminance dip | < 98 % of tiles |
| Grid legible | on-line vs mid-cell contrast | < 1.0 |
| Cards stay translucent | grid contrast **inside** cards ÷ contrast **outside** | < 45 % |
| Page not sparse | card area ÷ content area | < 72 % |
| Bottom third carries content | coverage of the lowest band | < 55 % |
| Content reaches the foot | lowest card bottom ÷ available height | < 93 % |
| Nothing overflows or overlaps | DOM re-measurement | any |

`--strict` exits non-zero on any failure, so a document can be built in CI.

## Retuning the look

Every visual decision lives in `engine/theme.py`, and a document can override any
of it under `style:` without touching code:

```yaml
style:
  seed: 20250828          # all hand-drawn wobble is deterministic
  paper: { base: "#F2E8D3", grid_minor_mm: 5.0, grid_minor_alpha: 0.33 }
  card:  { fill_alpha: 0.085, edge_alpha: 0.52, jitter_deg: 0.16 }
  type:  { body_pt: 8.0, section_pt: 14.0 }
```
