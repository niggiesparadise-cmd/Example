# -*- coding: utf-8 -*-
"""Krebs-cycle content for the notebook engine. Content only — no styling."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))
from blocks import (underline, ladder, alkene_trans, cycle_wheel, spine_map,
                    energy_profile, value_ladder, stacked_bars, arrow_svg, process_flow)

EYEBROW = "Biochemistry · Central Metabolism"
TOTAL   = 9

def page(n, section, bed):
    return f'''<section class="page">
<div class="page__head"><span class="eyebrow">{EYEBROW}</span><span class="eyebrow">Sheet {n} / {TOTAL} · {section}</span></div>
<div class="bed">{bed}</div>
<div class="page__foot"><span>The Krebs Cycle — revision notebook</span><span>{n}</span></div>
</section>'''

def h2(txt, mod=""):
    return f'<div class="c12 m m--bare"><h2 class="t2 {mod}">{txt}</h2>{underline(mod)}</div>'

# ═══════════════ 1 · FOUNDATIONS ═══════════════
P1 = page(1, "Foundations", f'''
<div class="c12 m m--bare" style="margin-bottom:2px">
  <h1 class="t1">The Krebs Cycle</h1>{underline()}
  <p class="hand" style="margin-top:2px">also the <span class="mk--teal mk">citric acid cycle</span> · the <span class="mk--teal mk">tricarboxylic acid (TCA) cycle</span> — the hub where every fuel the body burns finally converges</p>
</div>

<div class="c7 m m--teal m--tiltl">
  <span class="m__tag">Definition</span>
  <p class="lead">A closed loop of <b>eight enzyme-catalysed reactions</b> that completely oxidises the acetyl group of acetyl-CoA to <b>two molecules of CO<sub>2</sub></b>, capturing the released electrons as <span class="k-ochre">NADH</span> and <span class="k-ochre">FADH<sub>2</sub></span> and one high-energy phosphate as <span class="k-ochre">GTP</span>.</p>
  <p class="hand" style="margin-top:4px">The loop rebuilds its own starting material, oxaloacetate, so it acts <em>catalytically</em> and is never consumed. One oxaloacetate can carry an unlimited number of acetyl groups to CO<sub>2</sub>.</p>
</div>
<div class="c5 m">
  <span class="m__tag">Key facts</span>
  <ul class="li li--teal">
    <li><b>Where</b> mitochondrial matrix — except succinate dehydrogenase, which is embedded in the inner membrane</li>
    <li><b>Turns per glucose</b> 2</li>
    <li><b>8 steps</b> · 4 oxidations · 2 decarboxylations · 1 substrate-level phosphorylation</li>
    <li><b>Regulated at</b> steps 1, 3 and 4 — the three irreversible ones</li>
    <li><b>Described by</b> Hans Krebs, 1937 · Nobel Prize 1953</li>
  </ul>
</div>

<div class="c7 stack">
  <div class="eq"><span class="eq__k">Net equation — one turn</span>
  Acetyl-CoA + 3 NAD<sup>+</sup> + FAD + GDP + P<sub>i</sub> + 2 H<sub>2</sub>O<br>
  &nbsp;&nbsp;→ 2 CO<sub>2</sub> + 3 NADH + 3 H<sup>+</sup> + FADH<sub>2</sub> + GTP + CoA-SH</div>
  <div class="m m--ochre">
    <span class="m__tag">Why three names</span>
    <p class="p"><b>Krebs cycle</b> honours its discoverer. <b>Citric acid cycle</b> names the first product. <b>Tricarboxylic acid cycle</b> describes citrate's three −COO<sup>−</sup> groups. All three mean the same pathway.</p>
  </div>
</div>
<div class="c5 stack">
  <div class="m m--rust">
    <span class="m__tag">Common misreading</span>
    <p class="hand hand--sm">The cycle <b>never touches O<sub>2</sub></b>. Oxygen is consumed downstream at Complex IV. The cycle is aerobic <em>by dependence, not by chemistry</em> — without the chain to regenerate NAD<sup>+</sup> and FAD it stalls within seconds.</p>
  </div>
  <div class="m m--green">
    <span class="m__tag">Why it matters</span>
    <p class="p">Carbohydrate, fat and protein all converge on acetyl-CoA. Whatever you eat, this is where its carbon is finally oxidised and its electrons harvested.</p>
  </div>
</div>

<div class="c12 m m--bare" style="padding-top:0">
  <span class="m__tag" style="color:var(--ochre)">Ledger for one turn</span>
  <div class="tiles">
    <div class="tile tile--ochre"><div class="tile__v">3</div><div class="tile__l">NADH</div></div>
    <div class="tile tile--ochre"><div class="tile__v">1</div><div class="tile__l">FADH<sub>2</sub></div></div>
    <div class="tile tile--ochre"><div class="tile__v">1</div><div class="tile__l">GTP</div></div>
    <div class="tile tile--rust"><div class="tile__v">2</div><div class="tile__l">CO<sub>2</sub></div></div>
    <div class="tile"><div class="tile__v">8</div><div class="tile__l">e<sup>−</sup> out</div></div>
    <div class="tile"><div class="tile__v">4</div><div class="tile__l">oxidations</div></div>
    <div class="tile tile--violet"><div class="tile__v">10</div><div class="tile__l">ATP equiv</div></div>
    <div class="tile tile--violet"><div class="tile__v">20</div><div class="tile__l">per glucose</div></div>
  </div>
</div>

<div class="c4 m m--violet">
  <span class="m__tag">All roads lead here</span>
  <ul class="li li--violet">
    <li><b>Carbohydrate</b> → pyruvate → acetyl-CoA</li>
    <li><b>Fat</b> → β-oxidation → acetyl-CoA</li>
    <li><b>Protein</b> → carbon skeletons → acetyl-CoA, α-KG, succinyl-CoA, fumarate, OAA</li>
    <li><b>Ketone bodies</b> → acetyl-CoA</li>
  </ul>
</div>
<div class="c4 m">
  <span class="m__tag">Orientation · the three stages</span>
  <ul class="li">
    <li><b>1 · Glycolysis</b> cytosol — glucose to pyruvate</li>
    <li><b>2 · Link + Krebs</b> matrix — carbon fully oxidised, electrons captured</li>
    <li><b>3 · Chain</b> inner membrane — electrons cashed into ATP</li>
  </ul>
  <p class="note">↳ The cycle is stage 2 of 3. It harvests; it does not mint.</p>
</div>
<div class="c4 m m--ochre">
  <span class="m__tag">Exam point</span>
  <p class="p">The cycle turns <b>twice</b> per glucose because glycolysis yields two pyruvate. Every per-turn figure must be doubled before it can be quoted per glucose.</p>
  <p class="hand hand--sm" style="margin-top:4px">3 NADH · 1 FADH<sub>2</sub> · 1 GTP per turn ⇒ <span class="k-violet">6 · 2 · 2</span> per glucose.</p>
</div>

<div class="c12 m">
  <span class="m__tag">Compartmentation · what has to cross the inner membrane</span>
  <div class="row" style="gap:12px">
    <ul class="li li--teal" style="flex:1 1 0">
      <li><b>Pyruvate</b> in, on the mitochondrial pyruvate carrier</li>
      <li><b>Citrate</b> out, on the tricarboxylate carrier, to supply cytosolic acetyl-CoA</li>
      <li><b>Malate / aspartate</b> both ways, to move reducing equivalents inward</li>
    </ul>
    <ul class="li li--rust" style="flex:1 1 0">
      <li><b>Acetyl-CoA cannot cross</b> — it is made and consumed inside, or exported disguised as citrate</li>
      <li><b>NADH cannot cross</b> — hence the shuttles, and hence 30 vs 32 ATP per glucose</li>
      <li><b>CoA and NAD<sup>+</sup> pools are separate</b> on the two sides of the membrane</li>
    </ul>
  </div>
</div>

<div class="c12 m m--teal">
  <span class="m__tag">Key takeaway</span>
  <p class="hand">The Krebs cycle is not primarily an ATP factory — it makes just one nucleotide triphosphate per turn. It is an <span class="mk">electron harvester</span> and a <span class="mk">biosynthetic roundabout</span>: its true output is reduced coenzyme for the respiratory chain, and its intermediates are the raw material for fats, haem, amino acids and glucose.</p>
</div>
''')

# ═══════════════ 2 · THE WHEEL ═══════════════
STATIONS = [("Oxaloacetate","4 C"),("Citrate","6 C"),("Isocitrate","6 C"),
            ("α-Ketoglutarate","5 C"),("Succinyl-CoA","4 C"),("Succinate","4 C"),
            ("Fumarate","4 C"),("Malate","4 C")]
STEPS = [
  ("1",["citrate synthase"],            ("+ H₂O → CoA-SH","var(--ink-3)")),
  ("2",["aconitase"],                   ("via cis-aconitate","var(--ink-3)")),
  ("3",["isocitrate","dehydrogenase"],  ("NADH + CO₂","var(--ochre)")),
  ("4",["α-ketoglutarate","dehydrogenase"],("NADH + CO₂","var(--ochre)")),
  ("5",["succinyl-CoA","synthetase"],   ("GTP → ATP","var(--ochre)")),
  ("6",["succinate","dehydrogenase"],   ("FADH₂ · Complex II","var(--ochre)")),
  ("7",["fumarase"],                    ("+ H₂O","var(--ink-3)")),
  ("8",["malate","dehydrogenase"],      ("NADH","var(--ochre)")),
]
WHEEL = cycle_wheel(
    STATIONS, STEPS,
    centre=("TCA · CITRIC ACID","KREBS","mitochondrial matrix","× 2 turns per glucose"),
    entry=("Acetyl-CoA","the universal 2-carbon fuel"),
    notes=[(884,232,"end","var(--rust)","irreversible"),
           (884,596,"end","var(--ink-3)","only membrane-bound step"),
           (116,596,"start","var(--ochre)","★ rate-limiting")])

LINKFLOW = process_flow(
  stages=[(24,190,"Pyruvate","3 C · from glycolysis","box"),
          (250,610,"Pyruvate dehydrogenase complex","E1 decarboxylase · E2 transacetylase · E3 dehydrogenase","machine"),
          (672,876,"Acetyl-CoA","2 C · enters the wheel","box")],
  inputs=[(350,"CoA-SH","var(--teal)"),(500,"NAD\u207a","var(--teal)")],
  outputs=[(360,"CO\u2082","var(--rust)"),(510,"NADH + H\u207a","var(--ochre)")],
  footer=[(430,"irreversible \u2014 the committed step into the cycle","var(--rust)")])

P2 = page(2, "The Wheel", f'''
{h2("The wheel")}
<div class="c12 fig" style="margin-top:-6px;max-width:91%;margin-left:auto;margin-right:auto">{WHEEL}
  <figcaption class="fig__cap">Eight steps, four oxidations, two carbons in and two carbons out. Enzyme names sit outside the ring; what each step releases is printed beneath them in ochre.</figcaption>
</div>

<div class="c4 m m--violet">
  <span class="m__tag">Reading the wheel</span>
  <ul class="li li--violet">
    <li><b>Teal ring</b> the carbon skeleton, always 4 → 6 → 5 → 4</li>
    <li><b>Ochre labels</b> energy leaving as reduced coenzyme</li>
    <li><b>Two CO<sub>2</sub></b> leave at steps 3 and 4 only</li>
  </ul>
</div>
<div class="c4 m m--green">
  <span class="m__tag">Order mnemonic</span>
  <p class="hand"><span class="k-teal">C</span>itrate <span class="k-teal">I</span>s <span class="k-teal">K</span>rebs' <span class="k-teal">S</span>tarting <span class="k-teal">S</span>ubstrate <span class="k-teal">F</span>or <span class="k-teal">M</span>aking <span class="k-teal">O</span>xaloacetate</p>
  <p class="note">Citrate · Isocitrate · α-Ketoglutarate · Succinyl-CoA · Succinate · Fumarate · Malate · Oxaloacetate</p>
</div>
<div class="c4 m m--ochre">
  <span class="m__tag">Where the energy goes</span>
  <p class="p">3 NADH × 2.5 + 1 FADH<sub>2</sub> × 1.5 + 1 GTP = <b class="k-violet">10 ATP per turn</b>, so <b class="k-violet">20 ATP per glucose</b> come from the cycle alone.</p>
</div>

{h2("Step zero — the link reaction", "t2--rust")}
<div class="c12 fig" style="margin-top:-4px">{LINKFLOW}</div>

<div class="c4 m m--rust">
  <span class="m__tag">Three enzymes, one machine</span>
  <ul class="li li--rust">
    <li><b>E1</b> pyruvate dehydrogenase — decarboxylates, needs TPP</li>
    <li><b>E2</b> transacetylase — swings the acetyl group on a lipoamide arm</li>
    <li><b>E3</b> dehydrogenase — re-oxidises lipoamide, hands electrons to NAD<sup>+</sup></li>
  </ul>
</div>
<div class="c4 m m--ochre">
  <span class="m__tag">Five cofactors, all needed</span>
  <p class="hand"><span class="k-rust">T</span>hiamine pyrophosphate · <span class="k-rust">L</span>ipoamide · <span class="k-rust">C</span>oA-SH · <span class="k-rust">F</span>AD · <span class="k-rust">N</span>AD<sup>+</sup></p>
  <p class="hand hand--sm" style="margin-top:3px"><em>“Tender Loving Care For Nancy”</em></p>
  <p class="note">↳ Three are vitamin-derived — why deficiency hits this step first.</p>
</div>
<div class="c4 m m--teal">
  <span class="m__tag">Why it is the point of no return</span>
  <p class="p">Once pyruvate is decarboxylated its carbons can never return to glucose. This single irreversible step is the reason <b>fatty acids cannot be converted to glucose</b> in humans.</p>
</div>
''')

# ═══════════════ 3 · THE EIGHT STEPS ═══════════════
ROWS = [
 ("1","Acetyl-CoA + oxaloacetate + H<sub>2</sub>O → <b>citrate</b> + CoA-SH","citrate synthase",
  "Claisen condensation; hydrolysis of the thioester bond supplies the driving force","—","−32.2","k-rust"),
 ("2","Citrate ⇌ <em>cis</em>-aconitate ⇌ <b>isocitrate</b>","aconitase",
  "Dehydration then rehydration on the opposite face; Fe–S cluster. Moves the −OH onto a carbon that <em>can</em> be oxidised","—","+13.3",""),
 ("3","Isocitrate + NAD<sup>+</sup> → <b>α-ketoglutarate</b> + CO<sub>2</sub>","isocitrate dehydrogenase",
  "Oxidative decarboxylation via an oxalosuccinate intermediate — <span class='k-ochre'>rate-limiting</span>",
  "<span class='k-ochre'>NADH</span> · <span class='k-rust'>CO<sub>2</sub></span>","−20.9","k-rust"),
 ("4","α-Ketoglutarate + NAD<sup>+</sup> + CoA-SH → <b>succinyl-CoA</b> + CO<sub>2</sub>","α-ketoglutarate dehydrogenase complex",
  "Oxidative decarboxylation; mechanistically a twin of the PDH complex — the same five cofactors",
  "<span class='k-ochre'>NADH</span> · <span class='k-rust'>CO<sub>2</sub></span>","−33.5","k-rust"),
 ("5","Succinyl-CoA + GDP + P<sub>i</sub> → <b>succinate</b> + GTP + CoA-SH","succinyl-CoA synthetase",
  "The cycle's only <span class='k-ochre'>substrate-level phosphorylation</span> — thioester energy captured directly as a nucleotide triphosphate",
  "<span class='k-ochre'>GTP</span>","−2.9",""),
 ("6","Succinate + FAD → <b>fumarate</b> + FADH<sub>2</sub>","succinate dehydrogenase (Complex II)",
  "FAD is used because the C−C dehydrogenation is not energetic enough to reduce NAD<sup>+</sup>; electrons pass straight to ubiquinone",
  "<span class='k-ochre'>FADH<sub>2</sub></span>","≈ 0",""),
 ("7","Fumarate + H<sub>2</sub>O → <b>L-malate</b>","fumarase",
  "Stereospecific <em>trans</em> hydration — produces only the L isomer, never D","—","−3.8",""),
 ("8","L-Malate + NAD<sup>+</sup> → <b>oxaloacetate</b> + NADH + H<sup>+</sup>","malate dehydrogenase",
  "Alcohol oxidised to a ketone, regenerating the acceptor and closing the loop","<span class='k-ochre'>NADH</span>","+29.7",""),
]
TBODY = "".join(
 f'<tr><td class="st">{a}</td><td>{b}</td><td><b>{c}</b></td><td>{d}</td><td>{e}</td><td class="n {g}">{f}</td></tr>'
 for a,b,c,d,e,f,g in ROWS)

CARBONS = ('<div class="flow">'
  '<span class="pill">4 C</span><span class="hand hand--sm" style="color:var(--teal)">+2 C</span>'
  + arrow_svg() + '<span class="pill">6 C</span>' + arrow_svg() + '<span class="pill">6 C</span>'
  + arrow_svg("arw--rust") + '<span class="pill pill--rust">− CO<sub>2</sub></span><span class="pill">5 C</span>'
  + arrow_svg("arw--rust") + '<span class="pill pill--rust">− CO<sub>2</sub></span><span class="pill">4 C</span>'
  + arrow_svg() + '<span class="pill">4 C</span>' + arrow_svg() + '<span class="pill">4 C</span>'
  + arrow_svg() + '<span class="pill">4 C</span>' + arrow_svg() + '<span class="pill">4 C</span></div>')

P3 = page(3, "The Reactions", f'''
{h2("The eight steps")}
<div class="c12 m" style="padding:5px 6px 6px">
  <table><thead><tr><th>#</th><th>Reaction</th><th>Enzyme</th><th>Chemistry</th><th>Yield</th><th style="text-align:right">ΔG°′</th></tr></thead>
  <tbody>{TBODY}</tbody></table>
  <p class="note">ΔG°′ in kJ·mol<sup>−1</sup> at standard conditions (Lehninger values; texts vary by a few kJ). Steps <span class="k-rust">1, 3 and 4</span> are strongly exergonic and effectively irreversible — they are the cycle's control points.</p>
</div>

<div class="c6 m m--teal">
  <span class="m__tag">Why step 8 runs uphill</span>
  <p class="p">Malate dehydrogenase has ΔG°′ = <b>+29.7 kJ·mol<sup>−1</sup></b> — thermodynamically it should run backwards. It does not, because citrate synthase consumes oxaloacetate the instant it appears, holding matrix [OAA] below <b>~1 µM</b>.</p>
  <p class="hand" style="margin-top:4px">The cycle is <span class="mk">pulled forward by product removal</span>, not pushed by each step. Coupling, not brute force.</p>
</div>
<div class="c6 m m--violet">
  <span class="m__tag">Four kinds of chemistry, that is all</span>
  <ul class="li li--violet">
    <li><b>Condensation</b> step 1 — builds the six-carbon skeleton</li>
    <li><b>Isomerisation</b> step 2 — relocates one hydroxyl</li>
    <li><b>Oxidative decarboxylation</b> steps 3, 4 — the two CO<sub>2</sub> and two of the NADH</li>
    <li><b>Oxidation / hydration</b> steps 6–8 — rebuild oxaloacetate and take the last NADH</li>
  </ul>
  <p class="note">↳ Step 5 is the outlier: the one place the cycle makes a phosphate bond directly.</p>
</div>

{h2("Following the carbons", "t2--rust")}
<div class="c12 m m--bare" style="padding:0">{CARBONS}</div>
<div class="c7 m m--rust">
  <span class="m__tag">The subtlety examiners love</span>
  <p class="p">The two CO<sub>2</sub> released in a given turn are <b>not</b> the two carbons that just arrived as acetyl-CoA. Isotope labelling shows both released carbons originate from the <b>oxaloacetate</b> already in the cycle: C4 of oxaloacetate becomes C1 of α-ketoglutarate and leaves at step 4. The acetyl carbons are retained in the four-carbon skeleton and leave on <em>later</em> turns.</p>
  <p class="note">↳ Carbon bookkeeping balances every turn (2 in, 2 out) — but the individual atoms do not.</p>
</div>
<div class="c5 stack">
  <div class="m m--ochre">
    <span class="m__tag">Where each product appears</span>
    <ul class="li">
      <li><b>NADH</b> steps 3, 4, 8</li>
      <li><b>FADH<sub>2</sub></b> step 6 only</li>
      <li><b>GTP</b> step 5 only</li>
      <li><b>CO<sub>2</sub></b> steps 3, 4 only</li>
      <li><b>H<sub>2</sub>O consumed</b> steps 1, 7</li>
    </ul>
  </div>
  <div class="m m--green">
    <span class="m__tag">Cofactor check</span>
    <p class="p">Only two steps need anything exotic: aconitase carries an <b>Fe–S cluster</b>, and α-KG dehydrogenase needs the same <b>five cofactors</b> as PDH. Everything else runs on NAD<sup>+</sup>, FAD, CoA and water.</p>
  </div>
</div>
''')

# ═══════════════ 4 · THE MOLECULES ═══════════════
MOLS = [
 (1,"Oxaloacetate","4 C",["COO⁻","C=O","CH₂","COO⁻"],(),1,"rust","ketone","rust","regenerated every turn"),
 (2,"Citrate","6 C",["COO⁻","CH₂","HO—C—COO⁻","CH₂","COO⁻"],(),2,"green","3° alcohol","green","tertiary · not oxidisable"),
 (3,"cis-Aconitate","6 C",["COO⁻","CH₂","C—COO⁻","CH","COO⁻"],(2,),None,"teal","enzyme-bound","teal","bound intermediate"),
 (4,"Isocitrate","6 C",["COO⁻","CH₂","CH—COO⁻","CHOH","COO⁻"],(),3,"green","2° alcohol","green","secondary · now oxidisable"),
 (5,"α-Ketoglutarate","5 C",["COO⁻","C=O","CH₂","CH₂","COO⁻"],(),1,"rust","α-keto acid","rust","first CO₂ has left"),
 (6,"Succinyl-CoA","4 C",["COO⁻","CH₂","CH₂","C=O","S—CoA"],(),4,"ochre","thioester","ochre","the energy store"),
 (7,"Succinate","4 C",["COO⁻","CH₂","CH₂","COO⁻"],(),None,"teal","symmetric","teal","no chiral centre left"),
 (8,"Fumarate","4 C",None,(),None,"violet","alkene","violet","trans only · not maleate"),
 (9,"L-Malate","4 C",["COO⁻","HO—CH","CH₂","COO⁻"],(),1,"green","L only","green","water added across C=C"),
]
def molcard(m):
    n,name,c,rows,dbl,hl,hc,tag,tagc,note = m
    svg = (alkene_trans("⁻OOC","H","H","COO⁻","trans (E)") if rows is None
           else ladder(rows, dbl, hl, hc, name, row_h=23, top=17, cx=70, width=140))
    return (f'<figure class="c4 m fig fig--mol" style="padding:3px 3px 4px">'
            f'<div style="display:flex;align-items:baseline;gap:4px;justify-content:center">'
            f'<span style="font-family:var(--f-display);font-size:14px;color:var(--teal)">{n}</span>'
            f'<span style="font-size:11px;font-weight:600;color:var(--ink)">{name}</span>'
            f'<span style="font-family:var(--f-serif);font-size:9.4px;font-style:italic;color:var(--ink-3)">{c}</span></div>'
            f'{svg}'
            f'<figcaption class="fig__cap" style="margin-top:0;font-size:9.8px;line-height:1.2">'
            f'<span style="display:block;font-family:var(--f-sans);font-size:7.8px;font-weight:600;'
            f'letter-spacing:.1em;text-transform:uppercase;color:var(--{tagc})">{tag}</span>{note}</figcaption></figure>')

P4 = page(4, "The Molecules", f'''
{h2("Nine molecules", "t2--green")}
<div class="c8 m m--bare" style="padding:0">
  <p class="p">Every intermediate is a short carbon chain capped with carboxylates. Only one group changes at each step — follow the highlight and the cycle becomes a single running edit to one molecule.</p>
</div>
<div class="c4 m m--bare" style="padding:0">
  <div style="display:flex;flex-wrap:wrap;gap:6px 10px;font-size:9.4px;color:var(--ink-2)">
    <span><i style="display:inline-block;width:13px;height:9px;border-radius:3px;background:var(--mk-green);vertical-align:middle"></i> hydroxyl</span>
    <span><i style="display:inline-block;width:13px;height:9px;border-radius:3px;background:var(--mk-rust);vertical-align:middle"></i> carbonyl</span>
    <span><i style="display:inline-block;width:13px;height:9px;border-radius:3px;background:var(--mk-ochre);vertical-align:middle"></i> thioester</span>
    <span><i style="display:inline-block;width:13px;height:9px;border-radius:3px;background:var(--mk-violet);vertical-align:middle"></i> double bond</span>
  </div>
</div>
{"".join(molcard(m) for m in MOLS)}

<div class="c7 m m--teal">
  <span class="m__tag">Why step 2 exists — an entire enzyme to move one hydroxyl</span>
  <div class="row" style="align-items:center;gap:8px">
    <div style="flex:0 0 100px">{ladder(["COO⁻","CH₂","HO—C—COO⁻","CH₂","COO⁻"],(),2,"green","citrate",row_h=19,top=15,cx=52,width=104)}</div>
    <div style="flex:0 0 34px">{arrow_svg()}</div>
    <div style="flex:0 0 100px">{ladder(["COO⁻","CH₂","CH—COO⁻","CHOH","COO⁻"],(),3,"green","isocitrate",row_h=19,top=15,cx=52,width=104)}</div>
    <div style="flex:1 1 auto;min-width:0">
      <p class="p">Citrate is a dead end: its hydroxyl sits on a carbon carrying <b>no hydrogen</b>, and an alcohol cannot be oxidised to a carbonyl without a hydrogen to remove. Aconitase dehydrates to <em>cis</em>-aconitate and rehydrates the other way round, moving the −OH to the neighbouring carbon. Isocitrate is a <b>secondary</b> alcohol — and step 3 can proceed.</p>
    </div>
  </div>
</div>
<div class="c5 m m--violet">
  <span class="m__tag">Ogston's puzzle · 1948</span>
  <p class="p">Citrate is achiral and looks symmetric — two identical −CH<sub>2</sub>COO<sup>−</sup> arms. Yet labelling shows the cycle always attacks <em>the same arm</em>, the one from oxaloacetate. Ogston resolved it: an enzyme binding a <b>prochiral</b> substrate at <b>three points</b> tells two identical-looking groups apart, because only one orientation fits.</p>
</div>

<div class="c6 m m--ochre">
  <span class="m__tag">Why thioesters</span>
  <p class="p">An oxygen ester is stabilised by resonance. Sulfur's 3p orbitals overlap poorly with carbon's 2p, so a <b>thioester gets almost none of that stabilisation</b> and hydrolyses with ΔG°′ ≈ <b>−31 kJ·mol<sup>−1</sup></b> — on a par with ATP.</p>
  <p class="note">↳ Cashed twice: at step 1, and again at step 5.</p>
</div>
<div class="c6 m m--green">
  <span class="m__tag">Stereospecificity</span>
  <p class="p">Fumarase adds water <em>anti</em> across the double bond and accepts only the <em>trans</em> isomer, so the product is exclusively <b>L-malate</b> — maleate is not a substrate.</p>
  <p class="note">↳ Succinate is <b>symmetric</b> — where the acetyl carbons lose their identity.</p>
</div>
''')

# ═══════════════ 5 · ENERGETICS ═══════════════
ESTEPS = [("1","CS",-32.2),("2","ACO",13.3),("3","IDH",-20.9),("4","KGDH",-33.5),
          ("5","SCS",-2.9),("6","SDH",0.0),("7","FUM",-3.8),("8","MDH",29.7)]
CH_A = energy_profile(ESTEPS, t1="Standard free-energy change per step",
                      t2="Cumulative free energy through one turn")
CH_B = value_ladder(
  [(-0.38,"α-ketoglutarate + CO₂ / isocitrate","−0.38",None),
   (-0.32,"NAD⁺ / NADH","−0.32","ochre"),
   (-0.22,"FAD / FADH₂  (free flavin)","−0.22",None),
   (-0.17,"oxaloacetate / malate","−0.17",None),
   (0.031,"fumarate / succinate","+0.031","rust"),
   (0.045,"ubiquinone / ubiquinol","+0.045","rust"),
   (0.254,"cytochrome c  Fe³⁺ / Fe²⁺","+0.254",None),
   (0.816,"½ O₂ / H₂O","+0.816","teal")],
  [(520,-0.32,0.816,"ochre",[("NADH → O₂","brk-h ochre"),
                             ("ΔE°′ = 1.14 V · ΔG°′ = −219 kJ·mol⁻¹","brk-t"),
                             ("≈ 2.5 ATP","brk-t strong")],118),
   (578,0.031,0.816,"rust", [("succinate → O₂","brk-h rust"),
                             ("ΔE°′ = 0.79 V · ΔG°′ = −152 kJ·mol⁻¹","brk-t"),
                             ("≈ 1.5 ATP","brk-t strong")],268)],
  "Standard reduction potential  E°′ / volts", -0.45, 0.90,
  nudge={-0.22:-4,-0.17:6,0.031:-7,0.045:11})

CH_C = stacked_bars(
   [("by stage", 44, [("Glycolysis",7,1),("Link reaction",5,2),("Krebs cycle",20,3)]),
    ("by carrier",118,[("Substrate-level",4,1),("NADH",25,2),("FADH₂",3,3)])],
   32, "Where the 32 ATP per glucose come from", "ATP · glucose⁻¹", (0,8,16,24,32))

P5 = page(5, "Energetics", f'''
{h2("The energy landscape", "t2--ochre")}
<div class="c12 fig" style="max-width:96%;margin:0 auto">{CH_A}
  <figcaption class="fig__cap">Three steps do nearly all the thermodynamic work. Step 8 climbs 29.7 kJ·mol<sup>−1</sup> back up and still runs forward, because citrate synthase keeps oxaloacetate scarce.</figcaption>
</div>

<div class="c4 m">
  <span class="m__tag">What ΔG°′ does not tell you</span>
  <p class="p">Standard values assume 1 M of everything at pH 7 — conditions no cell meets. In a working mitochondrion only steps <b>1, 3 and 4</b> stay far from equilibrium; the other five sit near ΔG ≈ 0.</p>
  <p class="hand hand--sm" style="margin-top:3px"><span class="mk">A reaction at equilibrium cannot control flux — only a displaced one can.</span></p>
</div>
<div class="c4 m m--teal">
  <span class="m__tag">Net for one turn</span>
  <div class="eq" style="font-size:10.4px;padding:3px 6px">Σ ΔG°′ = <b>−50.3 kJ·mol<sup>−1</sup></b></div>
  <p class="p" style="margin-top:3px">Barely one ATP's worth of free energy. Almost everything useful leaves as <b>reduced coenzyme</b> — the cycle is a harvester, not a mint.</p>
</div>
<div class="c4 m m--violet">
  <span class="m__tag">Reading the lower panel</span>
  <p class="p">The running total falls steeply through steps 1–4, flattens across 5–7, then climbs at step 8 — the cycle descends into an energy well and pays a little back to close the loop.</p>
</div>

{h2("Where the ATP comes from", "t2--violet")}
<div class="c12 fig">{CH_C}
  <figcaption class="fig__cap">Liver and heart, using the malate–aspartate shuttle. The same glucose yields 30 ATP in brain and skeletal muscle.</figcaption>
</div>

<div class="c7 m m--teal">
  <span class="m__tag">Worked example · ATP per glucose</span>
  <div class="calc">
    <div class="calc__r"><div class="calc__k">Given</div><div class="calc__v">1 glucose, liver, malate–aspartate shuttle. P/O <b>2.5</b> per NADH, <b>1.5</b> per FADH<sub>2</sub></div></div>
    <div class="calc__r"><div class="calc__k">Formula</div><div class="calc__v">ATP = ATP<sub>SLP</sub> + 2.5·<em>n</em>(NADH) + 1.5·<em>n</em>(FADH<sub>2</sub>)</div></div>
    <div class="calc__r"><div class="calc__k">Substitute</div><div class="calc__v">Glycolysis 2 ATP + 2 NADH · Link ×2 → 2 NADH · Krebs ×2 → 6 NADH + 2 FADH<sub>2</sub> + 2 GTP &nbsp;⇒&nbsp; <b>SLP 4 · NADH 10 · FADH<sub>2</sub> 2</b></div></div>
    <div class="calc__r"><div class="calc__k">Calculate</div><div class="calc__v">4 + (10 × 2.5) + (2 × 1.5) = 4 + 25 + 3</div></div>
    <div class="calc__r"><div class="calc__k">Result</div><div class="calc__v calc__v--out">32 ATP per glucose</div></div>
    <div class="calc__r"><div class="calc__k">Interpret</div><div class="calc__v">The cycle supplies <b>20 of the 32</b> yet mints only 2 directly. <b>30</b> in brain and muscle, where the glycerol-3-phosphate shuttle delivers cytosolic NADH as FADH<sub>2</sub>.</div></div>
  </div>
</div>
<div class="c5 stack">
  <div class="m m--ochre">
    <span class="m__tag">Read both bars together</span>
    <p class="p">The cycle contributes <b>20 of the 32</b> — but on the second bar, <b>25 of the 32</b> arrive as NADH and only <b>4</b> by direct phosphorylation.</p>
  </div>
  <div class="m m--rust">
    <span class="m__tag">Why the numbers are not integers</span>
    <p class="p">Older texts said 3 ATP per NADH. Proton counting gives ≈ <b>10 H<sup>+</sup> pumped per NADH</b> and <b>4 H<sup>+</sup> per ATP</b> including transport, hence <b>2.5</b> — a ratio, not a stoichiometry.</p>
  </div>
</div>
''')

# ═══════════════ 6 · REDOX &amp; YIELD ═══════════════
P6 = page(6, "Redox &amp; Yield", f'''
{h2("Why FADH₂ is worth less", "t2--rust")}
<div class="c12 fig">{CH_B}
  <figcaption class="fig__cap">Electrons only fall from a more negative couple to a more positive one. The size of the fall sets the ATP yield.</figcaption>
</div>

<div class="c6 m m--rust">
  <span class="m__tag">The answer everyone asks for</span>
  <p class="p">Fumarate/succinate sits at <b>+0.031 V</b> — about <b>0.35 V more positive</b> than NAD<sup>+</sup>/NADH. Succinate <b>cannot</b> reduce NAD<sup>+</sup>: the electrons would have to run uphill.</p>
  <p class="p">So succinate dehydrogenase uses a tightly bound <b>FAD</b> and passes its electrons to ubiquinone at +0.045 V, entering the chain <em>past</em> Complex I. One proton-pumping site is skipped and the yield falls from ≈ 2.5 ATP to ≈ 1.5.</p>
</div>
<div class="c6 m m--ochre">
  <span class="m__tag">The formula behind the ladder</span>
  <div class="eq eq--ochre" style="font-size:10.8px;padding:4px 6px">ΔG°′ = −<em>n</em>FΔE°′<br><span style="font-size:9.6px;color:var(--ink-3)"><em>n</em> = 2 electrons · F = 96.5 kJ·V<sup>−1</sup>·mol<sup>−1</sup></span></div>
  <p class="p" style="margin-top:4px">A 1 V drop across two electrons releases ≈ 193 kJ·mol<sup>−1</sup>. Every yield figure on these sheets follows from that one relation — the potentials are measured, the ATP counts are derived.</p>
</div>

{h2("Getting cytosolic electrons in", "t2--green")}
<div class="c12 m m--bare" style="padding:0">
  <p class="p">Glycolysis makes NADH in the cytosol, but the inner membrane is impermeable to it. Two shuttles move the <em>reducing equivalents</em> instead of the molecule — and which one a tissue uses decides whether glucose is worth 30 ATP or 32.</p>
</div>
<div class="c6 m m--green">
  <span class="m__tag">Malate–aspartate shuttle</span>
  <ul class="li li--green">
    <li>Cytosolic NADH reduces oxaloacetate to malate; malate crosses and is re-oxidised <b>back to NADH</b> inside</li>
    <li>Aspartate and α-ketoglutarate carry the carbon skeletons back out</li>
    <li><b>Yield preserved</b> — 2.5 ATP per cytosolic NADH</li>
    <li>Used by <b>liver, kidney and heart</b></li>
  </ul>
</div>
<div class="c6 m m--ochre">
  <span class="m__tag">Glycerol-3-phosphate shuttle</span>
  <ul class="li">
    <li>Cytosolic NADH reduces DHAP to glycerol-3-phosphate</li>
    <li>A membrane-bound flavoenzyme re-oxidises it, handing electrons to <b>FAD, then ubiquinone</b></li>
    <li><b>Yield lost</b> — 1.5 ATP per cytosolic NADH, because Complex I is bypassed</li>
    <li>Used by <b>brain and skeletal muscle</b>; fast, and irreversible</li>
  </ul>
</div>

<div class="c12 m">
  <span class="m__tag">Every carrier the cycle produces, and what it is worth</span>
  <table><thead class="th--ochre"><tr><th>Carrier</th><th>Made at</th><th>Enters the chain at</th><th>Complexes that pump</th><th style="text-align:right">ATP</th></tr></thead><tbody>
    <tr><td><b>NADH</b></td><td>steps 3, 4, 8 (and the link reaction)</td><td>Complex I</td><td>I, III, IV</td><td class="n">≈ 2.5</td></tr>
    <tr><td><b>FADH<sub>2</sub></b></td><td>step 6, on succinate dehydrogenase</td><td>ubiquinone, via Complex II</td><td>III, IV</td><td class="n">≈ 1.5</td></tr>
    <tr><td><b>GTP</b></td><td>step 5, substrate-level</td><td>—</td><td>none</td><td class="n">1</td></tr>
  </tbody></table>
  <p class="note">↳ Complex II is the only one of the four that pumps no protons — it is an entry point, not a pump. That single fact is the whole 2.5-versus-1.5 story.</p>
</div>

<div class="c12 m m--teal">
  <span class="m__tag">Putting the two pages together</span>
  <p class="p">Every ATP figure quoted for glucose is really three separate claims: how many reduced carriers are made (fixed by the chemistry), how far their electrons fall (fixed by the potentials above), and how efficiently the proton gradient is converted (the P/O ratio). <span class="mk">Change the shuttle and only the second claim moves</span> — which is the whole difference between 30 and 32.</p>
</div>
''')

# ═══════════════ 7 · CONTROL ═══════════════
P7 = page(7, "Control", f'''
{h2("Three valves, one signal", "t2--violet")}
<div class="c12 m m--bare" style="padding:0">
  <p class="lead">Unlike glycolysis, the cycle has no single committed step. It is governed by <span class="mk">substrate supply and product inhibition</span> at the three irreversible reactions — and every input reduces to one question: <em>does the cell need energy right now?</em></p>
</div>

<div class="c4 m m--violet m--tiltl">
  <span class="m__tag">Valve 1 · step 1</span><h3 class="t3">Citrate synthase</h3>
  <ul class="li li--down"><li>ATP, NADH</li><li>succinyl-CoA (product-like)</li><li>citrate (own product)</li><li>long-chain acyl-CoA</li></ul>
  <p class="note">Mostly limited by how much acetyl-CoA and oxaloacetate are available.</p>
</div>
<div class="c4 m m--violet">
  <span class="m__tag">Valve 2 · step 3 · rate-limiting</span><h3 class="t3">Isocitrate dehydrogenase</h3>
  <ul class="li li--up"><li>ADP, Ca<sup>2+</sup></li></ul>
  <ul class="li li--down" style="margin-top:3px"><li>ATP, NADH</li></ul>
  <p class="note">The true throttle — allosterically sensitive to ADP, so it reads the energy charge directly.</p>
</div>
<div class="c4 m m--violet m--tiltr">
  <span class="m__tag">Valve 3 · step 4</span><h3 class="t3">α-KG dehydrogenase</h3>
  <ul class="li li--up"><li>Ca<sup>2+</sup></li></ul>
  <ul class="li li--down" style="margin-top:3px"><li>succinyl-CoA, NADH, ATP</li></ul>
  <p class="note">Inhibited by its own product — the same logic as the PDH complex it resembles.</p>
</div>

<div class="c6 m">
  <span class="m__tag">Upstream gate · covalent control</span>
  <h3 class="t3">The PDH complex is switched, not throttled</h3>
  <p class="p"><b>PDH kinase</b> phosphorylates and <b>switches it OFF</b> — activated by ATP, NADH and acetyl-CoA (plenty of fuel already). <b>PDH phosphatase</b> dephosphorylates and <b>switches it ON</b> — activated by Ca<sup>2+</sup> and, in adipose tissue, insulin.</p>
  <p class="note">↳ Allostery tunes the cycle; phosphorylation gates what enters it.</p>
</div>
<div class="c6 m m--ochre">
  <span class="m__tag">The rule that covers all of it</span>
  <p class="hand">High <span class="k-ochre">NADH / NAD<sup>+</sup></span> and high <span class="k-ochre">ATP / ADP</span> ⇒ the cycle slows.</p>
  <p class="hand" style="margin-top:3px">Ca<sup>2+</sup> — the signal that muscle is contracting — opens <span class="mk">three enzymes at once</span> (PDH, IDH, α-KGDH), so ATP supply rises exactly when demand does.</p>
</div>

<div class="c5 m m--teal">
  <span class="m__tag">Why regulation sits where it does</span>
  <ul class="li li--teal">
    <li>Steps <b>1, 3, 4</b> are far from equilibrium — displaced reactions can carry control</li>
    <li>Steps <b>2, 5, 6, 7, 8</b> sit near ΔG ≈ 0 — they follow, they do not lead</li>
    <li>Control is therefore <b>distributed</b>, not vested in one committed step as in glycolysis</li>
  </ul>
</div>
<div class="c7 m m--ochre">
  <span class="m__tag">Contrast · glycolysis</span>
  <p class="p">Glycolysis has one dominant valve, phosphofructokinase-1, and a clear committed step. The cycle has none: it is paced by <b>how fast the respiratory chain removes NADH</b>. Regulation here is a consequence of demand, not a decision point.</p>
  <p class="note">↳ Which is why “what is the rate-limiting step of the TCA cycle?” has a softer answer than the same question about glycolysis.</p>
</div>
<div class="c12 m">
  <span class="m__tag">Signal summary</span>
  <table><thead class="th--violet"><tr><th>Signal</th><th>Means</th><th>Effect on the cycle</th></tr></thead><tbody>
    <tr><td><b>↑ ADP</b></td><td>energy is being spent</td><td>activates IDH — <span class="k-green">speeds up</span></td></tr>
    <tr><td><b>↑ Ca<sup>2+</sup></b></td><td>muscle is contracting</td><td>activates PDH, IDH, α-KGDH — <span class="k-green">speeds up</span></td></tr>
    <tr><td><b>↑ ATP</b></td><td>energy is plentiful</td><td>inhibits CS and IDH — <span class="k-red">slows</span></td></tr>
    <tr><td><b>↑ NADH</b></td><td>chain cannot keep up</td><td>inhibits CS, IDH, α-KGDH — <span class="k-red">slows</span></td></tr>
    <tr><td><b>↑ succinyl-CoA</b></td><td>downstream backlog</td><td>inhibits CS and α-KGDH — <span class="k-red">slows</span></td></tr>
  </tbody></table>
</div>

<div class="c12 m m--violet">
  <span class="m__tag">Scenario · what happens in the first seconds of a sprint</span>
  <div class="row" style="gap:12px">
    <ul class="li li--violet" style="flex:1 1 0">
      <li><b>0 s</b> — myosin ATPase consumes ATP; ADP and P<sub>i</sub> rise in the matrix</li>
      <li><b>Instantly</b> — Ca<sup>2+</sup> released for contraction also floods the matrix</li>
      <li><b>Ca<sup>2+</sup> opens three enzymes</b> — PDH phosphatase switches PDH on; IDH and α-KGDH are activated directly</li>
    </ul>
    <ul class="li li--violet" style="flex:1 1 0">
      <li><b>ADP relieves inhibition</b> of isocitrate dehydrogenase, and drives ATP synthase directly</li>
      <li><b>NADH is consumed faster</b> by the chain, lifting product inhibition on all three valves</li>
      <li><b>Net effect</b> — flux can rise many-fold within seconds, with no change in enzyme amount and no hormone involved</li>
    </ul>
  </div>
  <p class="note">↳ The same Ca<sup>2+</sup> signal that orders the contraction also pays for it. Supply and demand share one messenger.</p>
</div>

<div class="c12 m m--green">
  <span class="m__tag">Putting it together</span>
  <p class="p">The cycle has no master switch because it does not need one. Every regulator is either a <b>product</b> (NADH, succinyl-CoA, citrate) or a <b>proxy for demand</b> (ADP, Ca<sup>2+</sup>). Supply therefore tracks demand automatically, and the respiratory chain — by consuming NADH — sets the pace of everything upstream of it. <span class="mk">Stop the chain and the cycle stops within seconds</span>, not because oxygen is a substrate, but because NAD<sup>+</sup> never comes back.</p>
</div>
''')

# ═══════════════ 8 · CONNECTIONS ═══════════════
MAP = spine_map([
 dict(name="Citrate", up=["exported to cytosol","fatty acid &amp;","cholesterol synthesis"]),
 dict(name="α-Ketoglutarate", up=["glutamate","amino acids, purines,","GABA, glutathione"],
      down=["glutamate · glutamine","transamination /","glutamate dehydrogenase"]),
 dict(name="Succinyl-CoA", up=["δ-aminolaevulinate","porphyrins →","haem"],
      down=["propionyl-CoA","odd-chain fatty acids,","Val · Ile · Met · Thr (B₁₂)"]),
 dict(name="Oxaloacetate", up=["PEP → gluconeogenesis","aspartate → pyrimidines,","urea cycle"],
      down=["pyruvate + CO₂","pyruvate carboxylase, biotin","★ the main top-up reaction"]),
])

P8 = page(8, "Connections", f'''
{h2("An amphibolic roundabout", "t2--green")}
<div class="c12 m m--bare" style="padding:0">
  <p class="p"><b>Amphibolic</b> = catabolic and anabolic at once. Intermediates are constantly withdrawn for biosynthesis (<span class="k-violet">cataplerosis</span>) and must be replaced (<span class="k-green">anaplerosis</span>) or the wheel runs dry.</p>
</div>
<div class="c12 fig">{MAP}
  <figcaption class="fig__cap"><span class="k-violet">▲ violet — carbon leaves for biosynthesis</span> &nbsp;·&nbsp; <span class="k-green">▲ green — carbon is replaced</span></figcaption>
</div>

<div class="c6 m m--green">
  <span class="m__tag">Anaplerotic · filling the cycle</span>
  <table><thead><tr><th>Reaction</th><th>Enters as</th><th>Note</th></tr></thead><tbody>
    <tr><td><b>Pyruvate carboxylase</b><br>pyruvate + CO<sub>2</sub> → OAA</td><td>oxaloacetate</td><td>Biotin; activated by acetyl-CoA. <b>The main one</b></td></tr>
    <tr><td><b>Glutamate dehydrogenase</b> / transaminases</td><td>α-ketoglutarate</td><td>Links amino-acid nitrogen to the cycle</td></tr>
    <tr><td><b>Propionyl-CoA pathway</b></td><td>succinyl-CoA</td><td>Odd-chain fats, Val/Ile/Met/Thr; needs B<sub>12</sub></td></tr>
    <tr><td><b>Aspartate transamination</b></td><td>oxaloacetate</td><td>Reversible; ties into the urea cycle</td></tr>
  </tbody></table>
</div>
<div class="c6 m m--violet">
  <span class="m__tag">Cataplerotic · drawing on the cycle</span>
  <table><thead class="th--violet"><tr><th>Intermediate</th><th>Leaves to make</th><th>Note</th></tr></thead><tbody>
    <tr><td><b>Citrate</b></td><td>fatty acids, cholesterol</td><td>Citrate shuttle carries acetyl units to the cytosol</td></tr>
    <tr><td><b>α-Ketoglutarate</b></td><td>glutamate, GABA, purines, glutathione</td><td>The nitrogen gateway</td></tr>
    <tr><td><b>Succinyl-CoA</b></td><td>haem</td><td>Condenses with glycine to δ-aminolaevulinate</td></tr>
    <tr><td><b>Oxaloacetate</b></td><td>glucose, aspartate, pyrimidines</td><td>Via PEP carboxykinase into gluconeogenesis</td></tr>
  </tbody></table>
</div>

<div class="c7 m m--rust">
  <span class="m__tag">Clinical consequence · why fats burn in the flame of carbohydrates</span>
  <p class="p">Acetyl-CoA <b>cannot</b> replenish oxaloacetate — it only consumes it. In starvation or uncontrolled diabetes, oxaloacetate is drained into gluconeogenesis; the cycle cannot keep pace with the acetyl-CoA arriving from fat breakdown, and the surplus is diverted into <b>ketone bodies</b>.</p>
  <p class="p">The same arithmetic explains why <b>fatty acids cannot be converted to glucose</b> in humans: both acetyl carbons are lost as CO<sub>2</sub> before oxaloacetate is regenerated, so there is no net gain to feed gluconeogenesis.</p>
</div>
<div class="c5 stack">
  <div class="m m--violet">
    <span class="m__tag">How acetyl units actually get out</span>
    <p class="p">Acetyl-CoA cannot cross the inner membrane, so it leaves <b>disguised as citrate</b>. In the cytosol, ATP-citrate lyase splits citrate back into acetyl-CoA and oxaloacetate; the oxaloacetate returns as malate or pyruvate. This <b>citrate shuttle</b> is how every fatty acid you synthesise gets its carbon.</p>
  </div>
  <div class="m m--ochre">
    <span class="m__tag">Balance rule</span>
    <p class="hand">Every intermediate withdrawn must be replaced. Withdraw without topping up and flux collapses — the cycle is <span class="mk">catalytic, not stoichiometric</span>.</p>
  </div>
  <div class="m m--teal">
    <span class="m__tag">Three words to be able to define</span>
    <ul class="li li--teal">
      <li><b>Amphibolic</b> serving catabolism and anabolism simultaneously</li>
      <li><b>Anaplerotic</b> a reaction that replenishes a cycle intermediate</li>
      <li><b>Cataplerotic</b> withdrawal of an intermediate for biosynthesis</li>
    </ul>
  </div>
</div>
''')

# ═══════════════ 9 · CLINICAL & RECAP ═══════════════
P9 = page(9, "Clinical &amp; Recap", f'''
{h2("Where the wheel jams", "t2--red")}
<div class="c7 m" style="padding:5px 6px 6px">
  <table><thead class="th--red"><tr><th>Agent</th><th>Target</th><th>Consequence</th></tr></thead><tbody>
    <tr><td><b>Fluoroacetate</b><br>(rodenticide 1080)</td><td><b>aconitase</b> — step 2</td><td>Converted in the cell to fluorocitrate, which blocks the enzyme: “lethal synthesis”. Citrate accumulates; the cycle halts</td></tr>
    <tr><td><b>Arsenite</b> &amp; trivalent arsenicals</td><td><b>lipoamide</b> — PDH and α-KGDH</td><td>Binds the two neighbouring thiols of dihydrolipoamide, disabling both complexes at once</td></tr>
    <tr><td><b>Malonate</b></td><td><b>succinate dehydrogenase</b> — step 6</td><td>Classic competitive inhibitor and structural analogue of succinate; Krebs's own evidence that the pathway is a cycle</td></tr>
    <tr><td><b>3-Nitropropionic acid</b></td><td><b>succinate dehydrogenase</b> — irreversible</td><td>Selective striatal degeneration; used experimentally to model Huntington disease</td></tr>
    <tr><td><b>Thiamine (B<sub>1</sub>) deficiency</b></td><td><b>TPP-dependent enzymes</b> — PDH, α-KGDH, transketolase</td><td>Pyruvate cannot enter the cycle → lactic acidosis. Wet and dry beriberi, Wernicke encephalopathy, Korsakoff syndrome</td></tr>
  </tbody></table>
  <p class="note">Neurons and cardiac myocytes fail first — highest oxidative demand, least glycolytic reserve.</p>
</div>
<div class="c5 stack">
  <div class="m m--violet">
    <span class="m__tag">Oncometabolites · cycle enzymes as tumour suppressors</span>
    <ul class="li li--violet">
      <li><b>IDH1 / IDH2</b> — a neomorphic activity converts α-KG into <b>D-2-hydroxyglutarate</b>, blocking α-KG-dependent dioxygenases and driving hypermethylation. Gliomas, AML, chondrosarcoma</li>
      <li><b>SDH (A–D)</b> — succinate accumulates; hereditary paraganglioma, phaeochromocytoma, GIST, with pseudohypoxia via HIF-1α</li>
      <li><b>FH</b> — fumarate accumulates and succinates cysteines, aconitase included; hereditary leiomyomatosis and renal cell carcinoma</li>
    </ul>
  </div>
  <div class="m m--green">
    <span class="m__tag">Inherited defects &amp; immunometabolism</span>
    <ul class="li li--green">
      <li><b>PDH deficiency</b> — congenital lactic acidosis; a ketogenic diet helps because ketones enter downstream of the block</li>
      <li><b>MDH2 mutations</b> — early-onset encephalopathy, refractory epilepsy, raised lactate</li>
      <li><b>Activated macrophages</b> deliberately break the cycle so succinate drives IL-1β and citrate becomes anti-inflammatory <b>itaconate</b></li>
    </ul>
  </div>
</div>

<div class="c12 m m--red">
  <span class="m__tag">Six things people get wrong</span>
  <div class="row" style="gap:12px">
    <ul class="li li--red" style="flex:1 1 0">
      <li><b>“The cycle uses oxygen.”</b> It does not. O<sub>2</sub> is the final acceptor at Complex IV; the cycle depends on that only to get NAD<sup>+</sup> and FAD back</li>
      <li><b>“NADH gives 3 ATP, FADH<sub>2</sub> gives 2.”</b> Old integer P/O ratios. Current values are <b>2.5</b> and <b>1.5</b></li>
      <li><b>“GTP counts as two ATP.”</b> One GTP ≡ one ATP — nucleoside diphosphate kinase interconverts them freely</li>
    </ul>
    <ul class="li li--red" style="flex:1 1 0">
      <li><b>“The acetyl carbons leave as that turn's CO<sub>2</sub>.”</b> They do not — the released carbons come from oxaloacetate</li>
      <li><b>“Acetyl-CoA can be turned into glucose.”</b> Not in humans. Both carbons are lost as CO<sub>2</sub> before oxaloacetate is regenerated</li>
      <li><b>“Succinate dehydrogenase sits in the matrix.”</b> It is the one cycle enzyme bound to the inner membrane — it <em>is</em> Complex II</li>
    </ul>
  </div>
</div>

<div class="c12 m m--teal">
  <span class="m__tag" style="font-size:9px">One-glance recap</span>
  <div class="row" style="gap:14px;align-items:flex-start">
    <div style="flex:1.05 1 0">
      <span class="m__tag" style="color:var(--teal)">Key numbers</span>
      <table style="font-size:9.8px"><tbody>
        <tr><td>Steps · oxidations · decarboxylations</td><td class="n">8 · 4 · 2</td></tr>
        <tr><td>Per turn</td><td class="n">3 NADH · 1 FADH<sub>2</sub> · 1 GTP · 2 CO<sub>2</sub></td></tr>
        <tr><td>ATP per turn</td><td class="n">10</td></tr>
        <tr><td>Turns per glucose</td><td class="n">2</td></tr>
        <tr><td>ATP per glucose, from the cycle</td><td class="n">20</td></tr>
        <tr><td>ATP per glucose, total</td><td class="n">30–32</td></tr>
        <tr><td>Rate-limiting enzyme</td><td class="n">isocitrate dehydrogenase</td></tr>
      </tbody></table>
    </div>
    <div style="flex:1 1 0">
      <span class="m__tag" style="color:var(--teal)">Formulas worth memorising</span>
      <div class="eq" style="font-size:9.8px;padding:4px 6px">Acetyl-CoA + 3 NAD<sup>+</sup> + FAD + GDP + P<sub>i</sub> + 2 H<sub>2</sub>O → 2 CO<sub>2</sub> + 3 NADH + 3 H<sup>+</sup> + FADH<sub>2</sub> + GTP + CoA-SH</div>
      <div class="eq eq--ochre" style="font-size:9.8px;padding:4px 6px;margin-top:4px">ATP = ATP<sub>SLP</sub> + 2.5 <em>n</em>(NADH) + 1.5 <em>n</em>(FADH<sub>2</sub>)</div>
      <div class="eq eq--rust" style="font-size:9.8px;padding:4px 6px;margin-top:4px">Pyruvate + CoA-SH + NAD<sup>+</sup> → Acetyl-CoA + CO<sub>2</sub> + NADH</div>
    </div>
    <div style="flex:1 1 0">
      <span class="m__tag" style="color:var(--teal)">The three valves</span>
      <ul class="li li--teal" style="font-size:10px">
        <li><b>Citrate synthase</b> — off with ATP, NADH, succinyl-CoA, citrate</li>
        <li><b>Isocitrate dehydrogenase</b> — on with ADP and Ca<sup>2+</sup>, off with ATP and NADH</li>
        <li><b>α-KG dehydrogenase</b> — on with Ca<sup>2+</sup>, off with succinyl-CoA, NADH, ATP</li>
      </ul>
      <p class="hand hand--sm" style="margin-top:4px;color:var(--ink)">Final takeaway — the cycle is an <span class="mk">electron harvester</span> and a <span class="mk">biosynthetic roundabout</span>, not an ATP factory.</p>
    </div>
  </div>
</div>

<div class="c12 m m--bare" style="padding:0">
  <span class="m__tag">Sources consulted</span>
  <p style="font-size:8.4px;line-height:1.5;color:var(--ink-3);margin:0">
  Chandel N. S. et al., <em>Biochemistry, Citric Acid Cycle</em> and <em>Physiology, Krebs Cycle</em>, StatPearls · Jakubowski &amp; Flatt, <em>Reactions of the Citric Acid Cycle</em>, LibreTexts · <em>Krebs cycle carbons</em>, Proteopedia · Yang M. et al., <em>Oncometabolites: linking altered metabolism with cancer</em>, J Clin Invest 2013 · Ternette N. et al., <em>Inhibition of mitochondrial aconitase by succination in fumarate hydratase deficiency</em> · Ait-El-Mkadem S. et al., <em>Mutations in MDH2 cause early-onset severe encephalopathy</em> · Ryan D. G. &amp; O'Neill L. A. J., <em>Coupling Krebs cycle metabolites to signalling in immunity and cancer</em>. Standard free-energy values follow Nelson &amp; Cox, <em>Lehninger Principles of Biochemistry</em>; reduction potentials are the standard tabulated values.</p>
</div>
''')

PAGES = [P1, P2, P3, P4, P5, P6, P7, P8, P9]
