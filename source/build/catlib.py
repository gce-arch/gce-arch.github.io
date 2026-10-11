"""Procedural pixel-art helpers for the cat (numpy).

A form is a union of ellipsoids (a height field). Each pixel gets a surface normal from the
topmost ellipsoid, a Lambert shade from a fixed light, and the shade is quantized to a short
colour ramp. Markings, fur streaks, and outlines are added on top. Output is an integer grid of
palette indices (-1 = transparent) that is later written as character rows (see LEGEND).
"""
import math
import numpy as np
from artlib import PALETTE, LEGEND, KEY2CH

KEYS = list(PALETTE.keys())
KI = {k: i for i, k in enumerate(KEYS)}
SS = 4
LIGHT = np.array([-0.52, -0.72, 0.56])
LIGHT = LIGHT / np.linalg.norm(LIGHT)
# soft fill from below and in front (bounce from the floor): keeps undersides from going black
FILL = np.array([0.18, 0.62, 0.76])
FILL = FILL / np.linalg.norm(FILL)

BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0


def bayer(W, H, m=BAYER4):
    n = m.shape[0]
    return np.tile(m, (H // n + 1, W // n + 1))[:H, :W]


class Prim:
    """Ellipsoid: centre, semi-axes, rotation (rad, y down), height scale."""

    def __init__(self, cx, cy, rx, ry, rot=0.0, depth=None, gamma=0.5, tag=''):
        self.cx, self.cy, self.rx, self.ry, self.rot = cx, cy, rx, ry, rot
        self.depth = depth if depth is not None else min(rx, ry)
        self.gamma = gamma
        self.tag = tag


class Xf:
    """Local -> canvas similarity transform: scale, optional x mirror, rotation, translation."""

    def __init__(self, tx=0.0, ty=0.0, rot=0.0, s=1.0, mx=False):
        self.tx, self.ty, self.rot, self.s, self.mx = tx, ty, rot, s, mx
        self.c, self.sn = math.cos(rot), math.sin(rot)

    def pt(self, x, y):
        if self.mx:
            x = -x
        x *= self.s
        y *= self.s
        return (self.tx + self.c * x - self.sn * y, self.ty + self.sn * x + self.c * y)

    def inv(self, X, Y):
        dx, dy = X - self.tx, Y - self.ty
        x = (self.c * dx + self.sn * dy) / self.s
        y = (-self.sn * dx + self.c * dy) / self.s
        if self.mx:
            x = -x
        return x, y

    def ell(self, cx, cy, rx, ry, rot=0.0, depth=None, gamma=0.5, tag=''):
        X, Y = self.pt(cx, cy)
        r = (-rot if self.mx else rot) + self.rot
        return Prim(X, Y, rx * self.s, ry * self.s, r, None if depth is None else depth * self.s, gamma, tag)


def chain(pts, step=0.5, depth_k=1.0, gamma=0.5, tag=''):
    """Capsule-like form from (x, y, r) control points: spheres sampled along the polyline."""
    out = []
    for (x0, y0, r0), (x1, y1, r1) in zip(pts[:-1], pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(L / step))
        for i in range(n + 1):
            t = i / n
            r = r0 + (r1 - r0) * t
            out.append(Prim(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, 0.0, r * depth_k, gamma, tag))
    return out


class Field:
    """Rendered height field of a prim list on a W x H pixel grid.

    The silhouette is the union of the ellipsoids. Height and normal come from a smooth union
    (power mean, exponent `p`), which avoids hard creases where two forms overlap."""

    def __init__(self, prims, W, H, ss=SS, light=LIGHT, p=4.0, fill=0.34):
        self.W, self.H, self.ss = W, H, ss
        ys, xs = np.mgrid[0:H * ss, 0:W * ss]
        X = (xs + 0.5) / ss
        Y = (ys + 0.5) / ss
        ins = np.zeros(X.shape, dtype=bool)
        Sp = np.zeros(X.shape)
        Gx = np.zeros(X.shape)
        Gy = np.zeros(X.shape)
        zbest = np.full(X.shape, -1.0)
        pid = np.full(X.shape, -1, dtype=int)
        for i, pr in enumerate(prims):
            c, s = math.cos(pr.rot), math.sin(pr.rot)
            dx, dy = X - pr.cx, Y - pr.cy
            u = (dx * c + dy * s) / pr.rx
            v = (-dx * s + dy * c) / pr.ry
            q = u * u + v * v
            inside = q < 1.0
            base = np.clip(1.0 - q, 1e-4, 1.0)
            h = np.where(inside, pr.depth * base ** pr.gamma, 0.0)
            dh = -pr.depth * pr.gamma * base ** (pr.gamma - 1.0)
            gx = dh * 2.0 * (u * c / pr.rx - v * s / pr.ry)
            gy = dh * 2.0 * (u * s / pr.rx + v * c / pr.ry)
            hp1 = h ** (p - 1.0)
            Sp += hp1 * h
            Gx += np.where(inside, hp1 * gx, 0.0)
            Gy += np.where(inside, hp1 * gy, 0.0)
            ins |= inside
            upd = inside & (h > zbest)
            zbest = np.where(upd, h, zbest)
            pid = np.where(upd, i, pid)
        z = np.where(ins, Sp ** (1.0 / p), 0.0)
        den = np.maximum(z ** (p - 1.0), 1e-9)
        hx = np.where(ins, Gx / den, 0.0)
        hy = np.where(ins, Gy / den, 0.0)
        nrm = np.sqrt(hx * hx + hy * hy + 1.0)
        nxv, nyv, nzv = -hx / nrm, -hy / nrm, 1.0 / nrm
        key = np.clip(nxv * light[0] + nyv * light[1] + nzv * light[2], 0.0, 1.0)
        fil = np.clip(nxv * FILL[0] + nyv * FILL[1] + nzv * FILL[2], 0.0, 1.0)
        sh = np.clip(0.86 * key + fill * fil, 0.0, 1.0)
        b = lambda a: a.reshape(H, ss, W, ss)
        cnt = b(ins).sum(axis=(1, 3))
        self.cover = cnt / float(ss * ss)
        den_c = np.maximum(cnt, 1)
        self.shade = np.where(cnt > 0, b(np.where(ins, sh, 0.0)).sum(axis=(1, 3)) / den_c, 0.0)
        self.z = np.where(cnt > 0, b(z).sum(axis=(1, 3)) / den_c, 0.0)
        zb = b(zbest).transpose(0, 2, 1, 3).reshape(H, W, ss * ss)
        pb = b(pid).transpose(0, 2, 1, 3).reshape(H, W, ss * ss)
        k = zb.argmax(axis=2)
        self.pid = np.take_along_axis(pb, k[:, :, None], axis=2)[:, :, 0]
        self.ny = np.where(cnt > 0, b(np.where(ins, nyv, 0.0)).sum(axis=(1, 3)) / den_c, 0.0)
        self.nx = np.where(cnt > 0, b(np.where(ins, nxv, 0.0)).sum(axis=(1, 3)) / den_c, 0.0)
        self.mask = self.cover >= 0.5
        gy_, gx_ = np.mgrid[0:H, 0:W]
        self.X = gx_ + 0.5
        self.Y = gy_ + 0.5


def quant(s, th):
    lv = np.zeros(s.shape, dtype=int)
    for t in th:
        lv += (s >= t)
    return lv


def hash2(ia, ib, seed):
    h = (ia.astype(np.int64) * 374761393 + ib.astype(np.int64) * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFF) / 65536.0


def dash_noise(X, Y, phi, la, lb, seed):
    """Value noise made of dashes la long and lb wide, oriented along angle phi (rad)."""
    c, s = math.cos(phi), math.sin(phi)
    a = (X * c + Y * s) / la
    b = (-X * s + Y * c) / lb
    ib = np.floor(b)
    a = a + 0.5 * (ib % 2)
    return hash2(np.floor(a), ib, seed)


def stripe_dist(x, y, pts, w0, w1):
    """Signed distance (negative inside) to a tapered polyline stripe given in the same coordinates."""
    best = np.full(x.shape, 1e9)
    n = len(pts) - 1
    for i in range(n):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        abx, aby = bx - ax, by - ay
        L2 = abx * abx + aby * aby
        t = np.clip(((x - ax) * abx + (y - ay) * aby) / L2, 0.0, 1.0)
        px, py = ax + t * abx, ay + t * aby
        d = np.hypot(x - px, y - py)
        w = w0 + (w1 - w0) * ((i + t) / n)
        best = np.minimum(best, d - w / 2.0)
    return best


def smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


class Img:
    """Grid of palette indices; -1 is transparent."""

    def __init__(self, W, H):
        self.W, self.H = W, H
        self.a = np.full((H, W), -1, dtype=int)

    def put(self, mask, idx):
        if np.isscalar(idx):
            self.a[mask] = idx
        else:
            self.a[mask] = idx[mask]

    def outline(self, key_for, skip=()):
        a = self.a
        filled = a >= 0
        pad = np.pad(a, 1, constant_values=-1)
        out = np.full(a.shape, -1, dtype=int)
        got = np.zeros(a.shape, dtype=bool)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb = pad[1 + dy:1 + dy + a.shape[0], 1 + dx:1 + dx + a.shape[1]]
            ok = (~filled) & (nb >= 0) & (~got)
            if skip:
                ok &= ~np.isin(nb, [KI[k] for k in skip])
            out = np.where(ok, nb, out)
            got |= ok
        sel = got
        for idx in np.unique(out[sel]):
            kk = key_for(KEYS[idx])
            a[sel & (out == idx)] = KI[kk] if isinstance(kk, str) else kk

    def despeckle(self, passes=1):
        """Replace isolated pixels (all 8 neighbours share one other colour) by that colour."""
        for _ in range(passes):
            a = self.a
            H, W = a.shape
            pad = np.pad(a, 1, constant_values=-2)
            nbs = [pad[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0)]
            first = nbs[0]
            same = np.ones(a.shape, dtype=bool)
            for nb in nbs[1:]:
                same &= (nb == first)
            sel = same & (first != a) & (first >= 0) & (a >= 0)
            a[sel] = first[sel]

    def stamp(self, other, ox=0, oy=0):
        H, W = other.a.shape
        for y in range(H):
            for x in range(W):
                v = other.a[y, x]
                if v >= 0:
                    yy, xx = y + oy, x + ox
                    if 0 <= yy < self.H and 0 <= xx < self.W:
                        self.a[yy, xx] = v

    def bbox(self):
        ys, xs = np.nonzero(self.a >= 0)
        if len(ys) == 0:
            return None
        return xs.min(), ys.min(), xs.max(), ys.max()

    def crop(self):
        bb = self.bbox()
        if bb is None:
            return None, 0, 0
        x0, y0, x1, y1 = bb
        im = Img(x1 - x0 + 1, y1 - y0 + 1)
        im.a = self.a[y0:y1 + 1, x0:x1 + 1].copy()
        return im, int(x0), int(y0)

    def rows(self):
        out = []
        for y in range(self.H):
            out.append(''.join('.' if v < 0 else KEY2CH[KEYS[v]] for v in self.a[y]))
        return out


def rgb(hexs):
    return tuple(int(hexs[i:i + 2], 16) for i in (1, 3, 5))


def to_pil(img, scale=1, bg=None):
    from PIL import Image
    H, W = img.a.shape
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    for i, k in enumerate(KEYS):
        m = img.a == i
        if m.any():
            c = rgb(PALETTE[k])
            arr[m] = (c[0], c[1], c[2], 255)
    im = Image.fromarray(arr, 'RGBA')
    if scale != 1:
        im = im.resize((W * scale, H * scale), Image.NEAREST)
    if bg is not None:
        base = Image.new('RGBA', im.size, bg)
        base.alpha_composite(im)
        im = base
    return im
