"""Merge fontsource latin + latin-ext files, subset, and write WOFF2 + base64."""
import sys, base64, os
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
from fontTools import subset

BASE = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

# Basic Latin, Latin-1 Supplement, Latin Extended-A, General Punctuation, plus » « · ×
UNICODES = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + list(range(0x100, 0x180))
    + list(range(0x2000, 0x2070))
    + [0xBB, 0xAB, 0xB7, 0xD7]
)

FONTS = {
    "pressstart": ["press-start-2p/files/press-start-2p-latin-400-normal.woff2",
                   "press-start-2p/files/press-start-2p-latin-ext-400-normal.woff2"],
    "pixelify400": ["pixelify-sans/files/pixelify-sans-latin-400-normal.woff2",
                    "pixelify-sans/files/pixelify-sans-latin-ext-400-normal.woff2"],
    "pixelify700": ["pixelify-sans/files/pixelify-sans-latin-700-normal.woff2",
                    "pixelify-sans/files/pixelify-sans-latin-ext-700-normal.woff2"],
    "vt323": ["vt323/files/vt323-latin-400-normal.woff2",
              "vt323/files/vt323-latin-ext-400-normal.woff2"],
}

REQUIRED = "ČčŠšŽžĆćĐđöüéäè’“”–—…•·"

for key, files in FONTS.items():
    paths = [os.path.join(BASE, f) for f in files]
    merger = Merger()
    merged = merger.merge(paths)
    tmp = os.path.join(OUT, key + "-merged.ttf")
    merged.flavor = None
    merged.save(tmp)

    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga", "calt", "locl", "mark", "mkmk"] if key != "pressstart" else ["kern"]
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17]  # keep license/copyright strings
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    opts.drop_tables += ["DSIG", "STAT", "gasp"]
    font = TTFont(tmp)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    out = os.path.join(OUT, key + ".woff2")
    font.flavor = "woff2"
    font.save(out)

    f2 = TTFont(out)
    cmap = f2.getBestCmap()
    missing = [c for c in REQUIRED if ord(c) not in cmap]
    size = os.path.getsize(out)
    names = {n.nameID: n.toUnicode() for n in f2["name"].names if n.platformID == 3}
    print(f"{key:12s} {size/1024:7.1f} KB  glyphs={len(f2.getGlyphOrder()):4d} cmap={len(cmap):4d} missing_required={missing or 'none'}")
    print("    copyright:", names.get(0), "| license:", (names.get(13) or '')[:70], "| family:", names.get(1), names.get(2))
    with open(os.path.join(OUT, key + ".b64"), "w") as fh:
        fh.write(base64.b64encode(open(out, "rb").read()).decode("ascii"))
    os.remove(tmp)
