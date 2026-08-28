# -*- coding: utf-8 -*-
"""Build + quality-control loop for the academic notebook engine.

  python3 engine/build.py <content-module> <out-basename> "<Title>"

Emits a self-contained HTML artifact and a print-identical A4 PDF, then
reports, per page, whether the module bed overflows the sheet and how much
of the sheet actually carries content.
"""
import sys, os, re, subprocess, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCRATCH = "/tmp/claude-0/-home-user-Example/540244d8-757a-56b7-9eb5-4b0ad93837e6/scratchpad"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

GOOGLE = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
          'family=Caveat+Brush&family=Kalam:wght@300;400;700&'
          'family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&'
          'family=IBM+Plex+Serif:ital,wght@0,400;0,500;1,400&display=swap">')

def build(mod_name, out_base, title):
    sys.path.insert(0, os.path.join(ROOT, "content"))
    mod = __import__(mod_name)
    css = open(os.path.join(HERE, "notebook.css"), encoding="utf-8").read()
    pages = '<div class="sheets">' + "\n".join(mod.PAGES) + "</div>"

    # 1 — the artifact: single file, no doctype/html/body wrapper
    art = f"<title>{title}</title>\n{GOOGLE}\n<style>\n{css}\n</style>\n{pages}\n"
    art_path = os.path.join(ROOT, out_base + ".html")
    open(art_path, "w", encoding="utf-8").write(art)

    # 2 — the print source: identical, but with fonts served from disk
    pdf_src = (f'<!doctype html><html><head><meta charset="utf-8">'
               f'<title>{title}</title><link rel="stylesheet" href="fonts-local.css">'
               f'<style>\n{css}\n</style></head><body>{pages}</body></html>')
    src_path = os.path.join(SCRATCH, out_base + "-print.html")
    open(src_path, "w", encoding="utf-8").write(pdf_src)

    # 3 — render
    pdf_tmp = os.path.join(SCRATCH, out_base + ".pdf")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
                    "--virtual-time-budget=12000", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf_tmp}", "file://" + src_path],
                   capture_output=True)
    import pymupdf
    d = pymupdf.open(pdf_tmp)
    d.set_metadata({"title": title, "subject": getattr(mod, "SUBJECT", title),
                    "keywords": getattr(mod, "KEYWORDS", "")})
    pdf_path = os.path.join(ROOT, out_base + ".pdf")
    d.save(pdf_path)
    return art_path, src_path, pdf_path, d.page_count

def qc_overflow(src_path):
    """Ask the browser how much each module bed overflows its sheet."""
    html = open(src_path, encoding="utf-8").read()
    probe = """<script>window.addEventListener('load',function(){
  var out=[];
  document.querySelectorAll('.page').forEach(function(p,i){
    var bed=p.querySelector('.bed');
    // true overflow: content taller than the space the sheet gives the bed
    var over = bed ? Math.max(bed.scrollHeight - bed.clientHeight, 0) : 0;
    // lowest painted pixel inside the sheet, relative to the sheet box
    var pr=p.getBoundingClientRect(), low=0;
    p.querySelectorAll('.bed > *').forEach(function(el){
      var r=el.getBoundingClientRect(); low=Math.max(low, r.bottom-pr.top);
    });
    var bh = bed?bed.clientHeight:1;
    out.push({page:i+1, over:over, bedH:bh, fill:Math.round(low/bh*100)});
  });
  document.body.innerHTML='<pre id=Q>'+JSON.stringify(out)+'</pre>';});</script>"""
    probe_path = src_path.replace(".html", "-probe.html")
    open(probe_path, "w", encoding="utf-8").write(html.replace("</body>", probe + "</body>"))
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
                        "--virtual-time-budget=9000", "--window-size=1200,1000",
                        "--dump-dom", "file://" + probe_path], capture_output=True, text=True)
    m = re.search(r'<pre id="Q">(.*?)</pre>', r.stdout, re.S)
    return json.loads(m.group(1)) if m else []

def qc_density(pdf_path):
    import pymupdf, numpy as np
    d = pymupdf.open(pdf_path); rep = []
    for i in range(d.page_count):
        pm = d[i].get_pixmap(dpi=100)
        a = np.frombuffer(pm.samples, dtype=np.uint8).reshape(pm.height, pm.width, pm.n)[:, :, :3].astype(int)
        fl = (a[:, :, 0] << 16) | (a[:, :, 1] << 8) | a[:, :, 2]
        v, c = np.unique(fl, return_counts=True); p = int(v[c.argmax()])
        paper = np.array([(p >> 16) & 255, (p >> 8) & 255, p & 255])
        ink = np.abs(a - paper).max(axis=2) > 60          # excludes grid + washes
        ch, cw = pm.height // 28, pm.width // 20
        occ = np.array([[ink[r*ch:(r+1)*ch, c2*cw:(c2+1)*cw].mean() > 0.003
                         for c2 in range(20)] for r in range(28)])
        rows = np.where(occ.any(axis=1))[0]
        # grid must survive at all four edges
        edges = [a[0:16, :, :], a[-16:, :, :], a[:, 0:16, :], a[:, -16:, :]]
        grid_ok = all(e.reshape(-1, 3).std(axis=0).max() > 1.5 for e in edges)
        rep.append(dict(page=i+1, util=round(occ.mean()*100, 1),
                        last=round(((rows.max()+1)/28*100) if len(rows) else 0, 1),
                        paper="#%02X%02X%02X" % tuple(paper), grid_edges=grid_ok))
    return rep

if __name__ == "__main__":
    mod, base, title = sys.argv[1], sys.argv[2], sys.argv[3]
    art, src, pdf, n = build(mod, base, title)
    ov = qc_overflow(src); de = qc_density(pdf)
    print(f"built {n} pages -> {os.path.basename(pdf)}\n")
    print(f"{'pg':>3} {'overflow':>9} {'fill%':>6} {'util%':>7} {'paper':>8} {'grid':>6}  status")
    print("-" * 72)
    bad = 0
    for o, e in zip(ov, de):
        flags = []
        if o["over"] > 2:    flags.append(f"OVERFLOW {o['over']}px")
        if o["fill"] < 94:   flags.append(f"short fill {o['fill']}%")
        if e["util"] < 62:   flags.append("sparse")
        if not e["grid_edges"]: flags.append("NO EDGE GRID")
        bad += bool(flags)
        print(f"{e['page']:>3} {o['over']:>8}px {o['fill']:>6} {e['util']:>7.1f} "
              f"{e['paper']:>8} {str(e['grid_edges']):>6}  {' · '.join(flags) or 'ok'}")
    import numpy as np
    print("-" * 72)
    print(f"mean utilization {np.mean([e['util'] for e in de]):.1f}%  ·  pages needing work: {bad}/{n}")
