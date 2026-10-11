import sys, math
from functools import reduce
from fontTools.ttLib import TTFont
base = sys.argv[1]
def load(p): return TTFont(p)
for label, paths in [
  ("press-start-2p", ["press-start-2p/files/press-start-2p-latin-400-normal.woff2","press-start-2p/files/press-start-2p-latin-ext-400-normal.woff2"]),
  ("pixelify-400", ["pixelify-sans/files/pixelify-sans-latin-400-normal.woff2","pixelify-sans/files/pixelify-sans-latin-ext-400-normal.woff2"]),
  ("pixelify-700", ["pixelify-sans/files/pixelify-sans-latin-700-normal.woff2","pixelify-sans/files/pixelify-sans-latin-ext-700-normal.woff2"]),
  ("vt323", ["vt323/files/vt323-latin-400-normal.woff2","vt323/files/vt323-latin-ext-400-normal.woff2"]),
]:
    print("=====", label)
    for p in paths:
        f = load(f"{base}/{p}")
        cmap = f.getBestCmap()
        upm = f['head'].unitsPerEm
        os2 = f['OS/2']
        hh = f['hhea']
        print(p.split('/')[-1], "upm", upm, "glyphs", len(f.getGlyphOrder()), "cmap", len(cmap), "asc/desc", hh.ascent, hh.descent, "lineGap", hh.lineGap, "xH", getattr(os2,'sxHeight',None), "capH", getattr(os2,'sCapHeight',None))
        print("   tables:", sorted(f.keys()))
        # grid analysis from glyf outlines
        if 'glyf' in f:
            gs = f.getGlyphSet(); glyf = f['glyf']
            xs=set(); ys=set()
            for name in ['H','o','e','a','g','S','B'] if True else []:
                if name in glyf.keys():
                    g = glyf[name]
                    if g.numberOfContours>0:
                        coords = g.coordinates
                        for (x,y) in coords: xs.add(x); ys.add(y)
            def gcd_list(v):
                v=[abs(i) for i in v if i!=0]
                return reduce(math.gcd, v) if v else None
            print("   coord gcd x:", gcd_list(xs), "y:", gcd_list(ys), " sample xs:", sorted(xs)[:12])
