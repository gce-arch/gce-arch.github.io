"""Assemble the self-contained index.html from template, fonts, sprites, DATA, and app code."""
import re, sys, json, os, importlib
from artlib import PALETTE, LEGEND, TOME_COLORWAYS, check_rows

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.dirname(HERE)
PROMPT = os.path.join(WORK, 'content', 'claude_code_prompt_gce-arch.md')
BODY = os.environ.get('BODYFONT', 'vt323')
OUT = os.environ.get('OUT', os.path.join(WORK, 'out', 'index.html'))

def read(p, mode='r'):
    with open(p, mode) as f:
        return f.read()

# ---- DATA block: copied from section 12 of the prompt, unchanged ----
prompt = read(PROMPT)
sec = prompt[prompt.index('## 12. Data block'):prompt.index('## 13. Verification')]
m = re.search(r"```js\n(const DATA = \{.*?\n\};)\n```", sec, re.S)
data_block = m.group(1)
data_js = (
    "/* =====================================================================\n"
    "   EDIT CONTENT HERE\n"
    "   All text on the page comes from the DATA object below. Edit the strings and\n"
    "   save the file; no other part of the page needs to change.\n"
    "   Fields in header: name, lines[{text, href}].\n"
    "   Fields in publications: id, shortTitle, fullTitle, titleEn (optional), citation, href,\n"
    "     abstractLang (\"en\" or \"sl\"), abstract, abstractEn (only when abstractLang is \"sl\").\n"
    "   Fields in projects: id, kind (\"project\" or \"program\"), title, leader, period,\n"
    "     funder (optional), code (optional), abstract (optional).\n"
    "   Fields in links: heading, items[{title, subtitle, href}].\n"
    "   In citation, abstract, abstractEn, and titles, only <i> and <b> are allowed as tags.\n"
    "   In abstracts, paragraphs are separated by a blank line; a paragraph that starts\n"
    "   with \"• \" is shown as a list item.\n"
    "   ===================================================================== */\n"
    + data_block + "\n")

# ---- sprites ----
import preview
spr = preview.collect()
for k, v in spr.items():
    check_rows(k, v)
lines = []
lines.append("/* ---- Sprite data -------------------------------------------------------\n"
             "   Every sprite is a character grid. LEGEND maps each character to a palette key;\n"
             "   the palette is defined as CSS custom properties (see :root). '.' is transparent.\n"
             "   Cover roles co/cd/cm/ch are remapped per tome colorway (TOME_COLORWAYS).\n"
             "   ------------------------------------------------------------------ */")
lines.append("var LEGEND = " + json.dumps(LEGEND, separators=(',', ':')) + ";")
lines.append("var TOME_COLORWAYS = " + json.dumps(TOME_COLORWAYS, separators=(',', ':')) + ";")
lines.append("var SPR = {")
names = list(spr.keys())
for i, name in enumerate(names):
    rows = spr[name]
    lines.append("  %s: [" % name)
    for j, r in enumerate(rows):
        lines.append('    "%s"%s' % (r, ',' if j < len(rows) - 1 else ''))
    lines.append("  ]%s" % (',' if i < len(names) - 1 else ''))
lines.append("};")
sprites_js = "\n".join(lines)

# ---- fonts ----
def face(family, weight, b64path):
    return ('@font-face{font-family:"%s";font-style:normal;font-weight:%d;font-display:block;'
            'src:url(data:font/woff2;base64,%s) format("woff2")}' % (family, weight, read(b64path).strip()))
fonts = [face('Press Start 2P', 400, os.path.join(WORK, 'fonts', 'pressstart.b64'))]
if BODY == 'vt323':
    fonts.append(face('VT323', 400, os.path.join(WORK, 'fonts', 'vt323.b64')))
    body_family = '"VT323", ui-monospace, "Courier New", monospace'
else:
    fonts.append(face('Pixelify Sans', 400, os.path.join(WORK, 'fonts', 'pixelify400.b64')))
    fonts.append(face('Pixelify Sans', 700, os.path.join(WORK, 'fonts', 'pixelify700.b64')))
    body_family = None
fonts_css = "\n".join(fonts)

# ---- assemble ----
t = read(os.path.join(HERE, 'template.html'))
t = t.replace('/*@@FONTS@@*/', fonts_css)
t = t.replace('/*@@PALETTE@@*/', "\n  ".join("--%s: %s;" % (k, v) for k, v in PALETTE.items()))
if body_family:
    t = t.replace('--ff-body: "Pixelify Sans", ui-monospace, "Courier New", monospace;', '--ff-body: %s;' % body_family)
t = t.replace('//@@DATA@@', data_js)
runtime = read(os.path.join(HERE, 'sprite_runtime.js'))
app = read(os.path.join(HERE, 'app.js'))
t = t.replace('//@@SPRITES@@', "(function () {\n'use strict';\n" + sprites_js)
cat_json = read(os.path.join(HERE, 'catdata.json')).strip()
cat_js = read(os.path.join(HERE, 'cat.js'))
cat_data = ("/* ---- Cat artwork ---------------------------------------------------------\n"
            "   Run-length rows ('<char><count>', '/' between rows, '.' transparent; chars as in LEGEND).\n"
            "   Each pose is a stack of layers that the cat room moves or swaps by whole pixels. */\n"
            "var CAT = " + cat_json + ";")
t = t.replace('//@@RUNTIME@@', runtime)
t = t.replace('//@@CAT@@', cat_data)
t = t.replace('//@@CATJS@@', cat_js)
def strip_js(text):
    """Remove block comments, whole-line // comments, and blank lines (the prop files carry long API notes)."""
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    out = []
    for ln in text.split('\n'):
        t = ln.strip()
        if not t or t.startswith('//'):
            continue
        out.append(ln.rstrip())
    return '\n'.join(out)

ROOT_PARTS = ['rm_common.js', 'rm_shell.js', 'rm_windows.js', 'rm_shelves.js', 'rm_light.js', 'rm_furniture.js']
room_js = ("/* ---- Room props (rm*): drawn in code, one function per object; see room.js for the layout ---- */\n"
           + "\n".join(strip_js(read(os.path.join(WORK, 'props', n))) for n in ROOT_PARTS) + "\n" + read(os.path.join(HERE, 'room.js')))
t = t.replace('//@@ROOMJS@@', room_js)
t = t.replace('//@@APP@@', app + "\n})();")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    f.write(t)
print("wrote", OUT, "%.1f KB" % (len(t.encode('utf-8')) / 1024), "body font:", BODY)
