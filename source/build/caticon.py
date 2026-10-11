"""28x28 tab icon: the cat's face, front view, clean 3-tone shading, outlined in ink like the other
tab icons. Silhouette and shading come from the head model; features are placed by hand."""
import math
from catlib import *
from cathead import head_prims, ear_prims, GINGER, q_ell, tri_mask

W = H = 28


def build_icon(s=0.52, cx=14.0, cy=15.0):
    xf = Xf(cx, cy, 0.0, s)
    im = Img(W, H)
    # ears
    for side in ('l', 'r'):
        F = Field(ear_prims(xf, side), W, H)
        lv = quant(F.shade, [0.50, 0.80])
        idx = np.array([KI['f1'], KI['f2'], KI['f3']])[lv]
        im.put(F.mask, idx)
    # head
    F = Field(head_prims(xf), W, H)
    xl, yl = xf.inv(F.X, F.Y)
    lv = quant(F.shade, [0.42, 0.80])
    idx = np.array([KI['f1'], KI['f2'], KI['f3']])[lv]
    # cream muzzle (shield), two tones
    w = np.maximum((yl - (4.4 + 0.05 * xl * xl)) / 3.0, (yl - 15.5) / 2.5)
    cream = w > 0.0
    cidx = np.where(F.shade > 0.55, KI['p4'], KI['p3'])
    idx = np.where(cream, cidx, idx)
    im.put(F.mask, idx)
    return im, xf


def hand_features(im):
    a = im.a

    def put(x, y, k):
        if 0 <= x < W and 0 <= y < H:
            a[y, x] = KI[{'x': 'ey', 'y': 'ed', 'z': 'ez', 'l': 'b1'}.get(k, k)]
    # inner ears
    for (x, y) in ((6, 5), (7, 6), (7, 5), (21, 5), (20, 6), (20, 5)):
        put(x, y, 'pk')
    # forehead stripes
    for y in (5, 6, 7):
        put(13, y, 'f0'); put(14, y, 'f0')
    for y in (6, 7):
        put(10, y, 'f1'); put(17, y, 'f1')
    # eyes: 6x6 irises, left centre (9.5, 14), right (18.5, 14) -> columns 7..12 and 15..20
    for ex in (7, 15):
        rows = {
            11: (1, 4), 12: (0, 5), 13: (0, 5), 14: (0, 5), 15: (0, 5), 16: (1, 4),
        }
        for y, (x0, x1) in rows.items():
            for x in range(x0, x1 + 1):
                k = 'x'
                if y == 11: k = 'y'
                elif y == 12: k = 'y' if x in (0, 5) else 'x'
                elif y == 16: k = 'z'
                elif y == 15: k = 'z' if x in (1, 2, 3, 4) else 'x'
                put(ex + x, y, k)
        # pupil (2 wide, 4 tall) and highlight
        px = ex + 2
        for y in (12, 13, 14, 15):
            put(px, y, 'ink'); put(px + 1, y, 'ink')
        put(ex + 1, 12, 'p4')
    # nose and mouth
    put(13, 18, 'pk'); put(14, 18, 'pk')
    put(13, 19, 'l'); put(14, 19, 'l')
    put(12, 20, 'l'); put(15, 20, 'l')
    # whisker dots
    for (x, y) in ((9, 19), (18, 19)):
        put(x, y, 'p2')


if __name__ == '__main__':
    import sys
    from PIL import Image
    im, xf = build_icon()
    hand_features(im)
    im.outline(lambda k: 'ink')
    sheet = Image.new('RGBA', (28 * 10 * 2 + 60, 28 * 10 + 20), (18, 53, 91, 255))
    sheet.alpha_composite(to_pil(im, 10), (10, 10))
    sheet.alpha_composite(to_pil(im, 3), (28 * 10 + 30, 10))
    sheet.alpha_composite(to_pil(im, 2), (28 * 10 + 30 + 100, 10))
    sheet.save('../shots/icon_test.png')
    print('ok')
