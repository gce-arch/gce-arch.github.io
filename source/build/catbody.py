"""Body parts of the cat: fur-shaded masses (torso, limbs, tail) built from ellipsoids, with cream
patches, tabby bars, paw pads and a dark tail tip. Everything is authored in canvas coordinates."""
import math
import numpy as np
from catlib import *
from cathead import GINGER, GINGER_TH, WHITE, WHITE_TH, q_ell

DARK = ['b1', 'b1', 'b2', 'b3']


class Mass:
    """A single layer: prims + cream regions + bars + optional dark tip."""

    def __init__(self, prims, white=(), bars=(), tip=None, seed=1, phi=0.0, noise=0.06,
                 toes=(), pads=(), la=6.0, lb=1.7, white_all=False, tip_ramp=DARK, ragged=0.3):
        self.prims = prims
        self.white = list(white)      # (cx, cy, rx, ry, rot) cream regions (ellipses)
        self.bars = list(bars)        # (pts, w0, w1, key) tabby bars
        self.tip = tip                # (cx, cy, r) dark tail tip: pixels within r of (cx, cy) or beyond
        self.seed, self.phi, self.noise = seed, phi, noise
        self.toes = list(toes)        # (pts, w0, w1, key) lines drawn on top (toe separations)
        self.pads = list(pads)        # (cx, cy, rx, ry, rot, key) ellipses drawn on top (paw pads)
        self.la, self.lb = la, lb
        self.white_all = white_all
        self.ragged = ragged
        self.tip_ramp = tip_ramp

    def render(self, W, H, outline=True):
        F = Field(self.prims, W, H)
        X, Y = F.X, F.Y
        bay = bayer(W, H)
        n = dash_noise(X, Y, self.phi, self.la, self.lb, self.seed) - 0.5
        n2 = dash_noise(X, Y, self.phi + 1.3, self.la * 0.6, self.lb * 0.8, self.seed + 5) - 0.5
        noise = self.noise * n + 0.4 * self.noise * n2
        s = F.shade + noise + np.clip(F.ny, 0, 1) * 0.08 * (F.z < 3.0)
        dith = (bay - 0.5) * 0.05
        lv = quant(s + dith, GINGER_TH)
        out = np.array([KI[k] for k in GINGER])[lv]
        # cream regions
        w = np.full(X.shape, -1.0)
        for (cx, cy, rx, ry, rot) in self.white:
            w = np.maximum(w, 1 - q_ell(X, Y, cx, cy, rx, ry, rot))
        if self.white_all:
            w = np.full(X.shape, 1.0)
        tw = smooth(w / 0.5)
        white = (tw + n * self.ragged) > (bay * 0.7 + 0.12)
        lw = quant(0.58 + 0.42 * np.clip(F.shade + 0.5 * noise, 0, 1) + dith * 0.6, WHITE_TH)
        out = np.where(white, np.array([KI[k] for k in WHITE])[lw], out)
        # dark tail tip
        if self.tip is not None:
            cx, cy, dx, dy = self.tip
            # signed position along the tail direction (dx, dy): beyond the tip start => dark
            t = (X - cx) * dx + (Y - cy) * dy
            wt = smooth(t / 3.5 + 0.5)
            dk = (wt + n * 0.4) > (bay * 0.8 + 0.1)
            ld = quant(0.15 + 0.85 * np.clip(F.shade, 0, 1) + dith, [0.30, 0.55, 0.85])
            out = np.where(dk, np.array([KI[k] for k in self.tip_ramp])[ld], out)
        im = Img(W, H)
        im.put(F.mask, out)
        m = F.mask
        for (pts, w0, w1, key) in self.bars:
            d = stripe_dist(X, Y, pts, w0, w1)
            sel = (d < 0) & m & ~white
            im.a[sel] = KI[key]
        for (cx, cy, rx, ry, rot, key) in self.pads:
            q = q_ell(X, Y, cx, cy, rx, ry, rot)
            im.a[(q < 1) & m] = KI[key]
        for (pts, w0, w1, key) in self.toes:
            d = stripe_dist(X, Y, pts, w0, w1)
            im.a[(d < 0) & m] = KI[key]
        if outline:
            im.outline(lambda k: 'f0')
        return im, F
