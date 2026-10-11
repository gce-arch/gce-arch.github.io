"""The cat's head: a golden-shaded British/Scottish-straight type. One model, placed with a
similarity transform (position, roll, scale, mirror) so every pose reuses it.

Local frame (units = pixels at scale 1): origin at the centre of the face, x right, y down.
Parts returned as separate images so they can be animated: ear_l, ear_r (behind the head),
head (fur, nose, mouth, markings), eyes (open / half / closed overlays).
"""
import math
import numpy as np
from catlib import *

GINGER = ['f1', 'f2', 'f3', 'f4']
GINGER_TH = [0.38, 0.66, 0.90]
WHITE = ['p1', 'p2', 'p3', 'p4']
WHITE_TH = [0.40, 0.64, 0.82]


def q_ell(xl, yl, cx, cy, rx, ry, rot=0.0):
    dx, dy = xl - cx, yl - cy
    c, s = math.cos(rot), math.sin(rot)
    u = (dx * c + dy * s) / rx
    v = (-dx * s + dy * c) / ry
    return u * u + v * v


def tri_mask(xl, yl, a, b, c):
    def sgn(p, q, x, y):
        return (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1])
    d1 = sgn(a, b, xl, yl)
    d2 = sgn(b, c, xl, yl)
    d3 = sgn(c, a, xl, yl)
    neg = (d1 < 0) | (d2 < 0) | (d3 < 0)
    pos = (d1 > 0) | (d2 > 0) | (d3 > 0)
    return ~(neg & pos)


def fur_levels(F, ramp_ids, th, noise, white_ramp=None, white=None, dither=None):
    """Quantize shade (+noise) to ramp indices; optional white-fur override."""
    s = F.shade + noise
    # bounce light on lower edges
    s = s + np.clip(F.ny, 0, 1) * 0.10 * (F.z < 3.2)
    dith = (bayer(F.W, F.H) - 0.5) * 0.08
    lv = quant(s + dith, th)
    out = np.array([KI[k] for k in ramp_ids])[lv]
    if white is not None:
        lw = quant(0.58 + 0.42 * np.clip(s, 0, 1) + dith * 0.6, WHITE_TH)
        wout = np.array([KI[k] for k in WHITE])[lw]
        out = np.where(white, wout, out)
    return out


def head_prims(xf):
    return [
        xf.ell(0, -3.0, 20.0, 18.4, depth=12, tag='cranium'),
        xf.ell(-17.0, 0.5, 8.4, 9.4, depth=9, tag='temple'),
        xf.ell(17.0, 0.5, 8.4, 9.4, depth=9, tag='temple'),
        xf.ell(-12.8, 7, 11.8, 11, depth=11, tag='cheek'),
        xf.ell(12.8, 7, 11.8, 11, depth=11, tag='cheek'),
        xf.ell(0, 12.0, 14, 9.5, depth=9, tag='jaw'),
        xf.ell(0, 8.5, 9.5, 7.2, depth=11, tag='muzzle'),
    ]


EAR_BASE = (14.0, -14.4)
EAR_PTS = [(0.0, 0.0, 5.9), (2.0, -4.4, 4.1), (3.5, -8.4, 1.5)]


def ear_pts(side, drot=0.0, dy=0.0):
    sx = -1 if side == 'l' else 1
    c, s = math.cos(drot), math.sin(drot)
    out = []
    for (x, y, r) in EAR_PTS:
        xr = x * c - y * s
        yr = x * s + y * c
        out.append((sx * (EAR_BASE[0] + xr), EAR_BASE[1] + yr + dy, r))
    return out


def ear_prims(xf, side, dy=0.0, drot=0.0):
    pts = [(*xf.pt(x, y), r * xf.s) for (x, y, r) in ear_pts(side, drot, dy)]
    return chain(pts, step=0.4, depth_k=0.9, gamma=0.6, tag='ear')


def render_ear(xf, W, H, side, dy=0.0, drot=0.0, seed=3):
    F = Field(ear_prims(xf, side, dy, drot), W, H)
    xl, yl = xf.inv(F.X, F.Y)
    sx = -1 if side == 'l' else 1
    n = dash_noise(F.X, F.Y, 1.2, 3.0, 1.1, seed) - 0.5
    idx = fur_levels(F, GINGER, GINGER_TH, 0.10 * n)
    im = Img(W, H)
    im.put(F.mask, idx)
    # inner ear: a tapered pink stripe along the ear axis, nudged toward the face
    p = ear_pts(side, drot, dy)
    axis = [(x - sx * 0.9, y + 1.3) for (x, y, r) in p]
    axis = [axis[0], axis[1], (axis[2][0], axis[2][1] + 2.4)]
    d = stripe_dist(xl, yl, axis, 4.6, 1.0)
    inner = (d < 0) & F.mask
    im.put(inner, np.where(F.shade > 0.62, KI['pk'], KI['f3']))
    im.put(inner & (d < -1.2), np.where(F.shade > 0.5, KI['pk'], KI['pk']))
    im.outline(lambda k: 'f0')
    return im


def render_head(xf, W, H, seed=1, phi=0.9, whiskers=True):
    F = Field(head_prims(xf), W, H)
    xl, yl = xf.inv(F.X, F.Y)
    n = dash_noise(F.X, F.Y, phi, 5.0, 1.6, seed) - 0.5
    n2 = dash_noise(F.X, F.Y, phi + 1.4, 3.0, 1.2, seed + 7) - 0.5
    noise = 0.11 * n + 0.04 * n2
    bay = bayer(W, H)
    # white fur: muzzle, lower cheeks, jaw
    w = np.maximum.reduce([
        (yl - (3.4 + 0.052 * xl * xl)) / 3.2,
        1 - q_ell(xl, yl, 0, 10.4, 10.0, 7.8),
        (yl - 16.2) / 2.5,
    ])
    tw = smooth(w / 0.45)
    white = (tw + n * 0.3) > (bay * 0.7 + 0.12)
    idx = fur_levels(F, GINGER, GINGER_TH, noise, white=white)
    im = Img(W, H)
    im.put(F.mask, idx)
    m = F.mask

    def paint_stripe(pts, w0, w1, key, only_ginger=True):
        d = stripe_dist(xl, yl, pts, w0, w1)
        sel = (d < 0) & m
        if only_ginger:
            sel &= ~white
        im.a[sel] = KI[key]

    # forehead "M" and brow stripes
    paint_stripe([(0, -18.0), (0, -9.5)], 1.7, 1.0, 'f1')
    paint_stripe([(-5.0, -17.2), (-6.2, -9.8)], 1.5, 0.9, 'f1')
    paint_stripe([(5.0, -17.2), (6.2, -9.8)], 1.5, 0.9, 'f1')
    paint_stripe([(0, -18.0), (0, -12.5)], 1.2, 0.9, 'f0')
    # mascara lines running back from the eyes and faint cheek bars
    paint_stripe([(-16.4, -1.2), (-21.5, 1.0)], 1.2, 0.8, 'f1')
    paint_stripe([(16.4, -1.2), (21.5, 1.0)], 1.2, 0.8, 'f1')
    paint_stripe([(-24.0, 5.0), (-19.5, 7.0)], 1.1, 0.8, 'f1')
    paint_stripe([(24.0, 5.0), (19.5, 7.0)], 1.1, 0.8, 'f1')
    # nose and mouth
    nose = tri_mask(xl, yl, (-2.9, 3.4), (2.9, 3.4), (0, 6.9))
    im.a[nose & m] = KI['pk']
    top = nose & m & (yl < 4.4)
    im.a[top] = KI['f1']
    d = stripe_dist(xl, yl, [(0, 6.8), (0, 8.4), (-3.2, 9.6)], 1.0, 0.8)
    im.a[(d < 0) & m] = KI['f0']
    d = stripe_dist(xl, yl, [(0, 8.4), (3.2, 9.6)], 1.0, 0.8)
    im.a[(d < 0) & m] = KI['f0']
    # whisker pad dots
    for sx in (-1, 1):
        for (px, py) in ((4.8, 8.4), (6.8, 9.6), (5.2, 10.8)):
            dd = np.hypot(xl - sx * px, yl - py)
            im.a[(dd < 0.55) & m & white] = KI['p2']
    im.outline(lambda k: 'f0')
    # whiskers: thin cream lines that leave the cheeks (drawn outside the silhouette only)
    for sx in ((-1, 1) if whiskers else ()):
        for pts in (((21.0, 7.6), (27.0, 6.4), (35.0, 4.4)), ((21.5, 10.4), (28.0, 10.6), (36.0, 12.0)), ((20.5, 13.0), (26.0, 14.6), (32.0, 18.2))):
            P = [(sx * x, y) for x, y in pts]
            d = stripe_dist(xl, yl, P, 0.95, 0.8)
            im.a[(d < 0) & (im.a < 0)] = KI['p3']
    return im


IRIS = dict(cx=10.6, cy=-2.2, rx=5.3, ry=5.5)


def render_eyes(xf, W, H, state='open', look=(0.0, 0.0)):
    """Eye overlay. state: open | half | closed. look: pupil offset in local units.
    Iris gradient and highlights follow the light (canvas space); pupil, lids follow the head."""
    X, Y = np.meshgrid(np.arange(W) + 0.5, np.arange(H) + 0.5)
    xl, yl = xf.inv(X, Y)
    im = Img(W, H)
    S = xf.s
    for side in (-1, 1):
        cx, cy, rx, ry = side * IRIS['cx'], IRIS['cy'], IRIS['rx'], IRIS['ry']
        q = q_ell(xl, yl, cx, cy, rx, ry)
        wx, wy = xf.pt(cx, cy)                      # iris centre in canvas space
        t = (Y - wy) / (ry * S)                      # vertical position in canvas space
        if state in ('open', 'half'):
            iris = q < 1.0
            col = np.full(X.shape, KI['ey'])
            col = np.where(t > 0.30, KI['ez'], col)
            col = np.where(t < -0.42, KI['ed'], col)
            ring = q > 0.58
            col = np.where(ring & (t < 0.45), KI['ed'], col)
            col = np.where(ring & (t >= 0.45) & (q > 0.8), KI['ey'], col)
            pq = q_ell(xl, yl, cx + look[0], cy + 0.4 + look[1], 1.95, 3.9)
            col = np.where(pq < 1.0, KI['ink'], col)
            hl = (np.abs(X - (wx - 2.1 * S)) < 1.0) & (np.abs(Y - (wy - 2.4 * S)) < 1.0)
            col = np.where(hl, KI['p4'], col)
            hl2 = (np.abs(X - (wx + 2.4 * S)) < 0.55) & (np.abs(Y - (wy + 2.6 * S)) < 0.55)
            col = np.where(hl2, KI['p4'], col)
            if state == 'half':
                lid_y = cy - 0.05 * ry
                edge = (np.abs(yl - lid_y) < 0.9) & (q < 1.35)
                im.a[iris] = col[iris]
                im.a[(yl < lid_y) & iris] = KI['f2']
                im.a[edge & (q < 1.35)] = KI['f0']
                im.a[(np.abs(yl - (lid_y - 1.8)) < 0.7) & (q < 1.0)] = KI['f1']
            else:
                im.a[iris] = col[iris]
                lid = (q > 0.74) & (q < 1.6) & (yl < cy - 0.35 * ry)
                im.a[lid] = KI['f0']
        else:
            d = stripe_dist(xl, yl, [(cx - rx - 0.3, cy - 0.6), (cx - rx * 0.5, cy + 1.7), (cx, cy + 2.4),
                                     (cx + rx * 0.5, cy + 1.7), (cx + rx + 0.3, cy - 0.6)], 1.5, 1.5)
            im.a[d < 0] = KI['f0']
    return im
