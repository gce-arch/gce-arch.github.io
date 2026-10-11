import sys
sys.path.insert(0, '../build')
from artlib import PALETTE
def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def cr(a, b):
    la, lb = lum(PALETTE[a]), lum(PALETTE[b])
    if la < lb: la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)
pairs = [
 ('card title / modal body / citation', 'b1', 'p3', 4.5),
 ('titleEn (secondary) on parchment', 'b2', 'p3', 4.5),
 ('modal labels, facts dt, paragraph labels', 'r1', 'p3', 4.5),
 ('header name on navy (large)', 'p4', 'n2', 3.0),
 ('header role (gold) on navy (large)', 'g3', 'n2', 3.0),
 ('header lines on navy', 'p3', 'n2', 4.5),
 ('header lines hover (gold) on navy', 'g3', 'n2', 4.5),
 ('header link underline (n4) on navy [non-text]', 'n4', 'n2', 3.0),
 ('tab label on tab plate', 'p4', 'n2', 4.5),
 ('active tab label (gold) on lowered plate', 'g3', 'n1', 4.5),
 ('board title on wood', 'p4', 'b2', 4.5),
 ('board subtitle (gold) on wood', 'g3', 'b2', 4.5),
 ('plaque heading on navy', 'p4', 'n2', 3.0),
 ('button text on gold', 'ink', 'g2', 4.5),
 ('button text on gold (hover brightness ignored)', 'ink', 'g3', 4.5),
 ('close X on red', 'p4', 'r2', 3.0),
 ('plate text on tome label plate', 'b1', 'p3', 4.5),
 ('focus ring on navy', 'p4', 'n2', 3.0),
 ('focus ring (modal, ink) on parchment', 'ink', 'p3', 3.0),
 ('body text on dark stone (noscript/misc)', 'p3', 'st', 4.5),
]
bad = 0
for n, f, b, need in pairs:
    r = cr(f, b); ok = r >= need
    bad += (not ok)
    print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f}:1 (need {need})  {n}  [{f} on {b}]")
print('failures:', bad)
