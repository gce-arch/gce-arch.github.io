"""The five poses. Each pose is a list of layers (name, Mass) plus a head transform and metadata."""
import math
import numpy as np
from catlib import *
from cathead import render_head, render_ear, render_eyes
from catbody import Mass

CW, CH = 128, 100


def E(cx, cy, rx, ry, rot=0.0, depth=None, gamma=0.5):
    return Prim(cx, cy, rx, ry, rot, depth, gamma)


def pad_set(cx, cy, k=1.0, rot=0.0, key='b2'):
    """Paw sole seen from the front: one main pad and three toe beans, rotated by rot."""
    c, s = math.cos(rot), math.sin(rot)

    def at(dx, dy):
        return (cx + (dx * c - dy * s) * k, cy + (dx * s + dy * c) * k)
    out = []
    x, y = at(0, 0.8)
    out.append((x, y, 2.5 * k, 1.9 * k, rot, key))
    for dx, dy in ((-3.1, -2.2), (0.0, -3.5), (3.1, -2.2)):
        x, y = at(dx, dy)
        out.append((x, y, 1.15 * k, 1.25 * k, rot, key))
    return out


def head_layers(xf, seed=1, whiskers=True):
    return dict(
        ear_l=render_ear(xf, CW, CH, 'l'),
        ear_r=render_ear(xf, CW, CH, 'r'),
        head=render_head(xf, CW, CH, seed=seed, whiskers=whiskers),
        eyes_open=render_eyes(xf, CW, CH, 'open'),
        eyes_half=render_eyes(xf, CW, CH, 'half'),
        eyes_closed=render_eyes(xf, CW, CH, 'closed'),
    )


# --------------------------------------------------------------------------------------------
def pose_loaf():
    L = []
    tail = chain([(14, 84, 5.2), (9, 90, 4.8), (14, 95, 4.4), (30, 96.5, 4.0), (47, 95.5, 3.6)], step=0.4, depth_k=0.9)
    L.append(('tail', Mass(tail, seed=11, phi=0.2, la=5, lb=1.5, tip=(40, 96, 1.0, 0.0),
                           bars=[([(19, 90), (21, 96)], 1.2, 0.8, 'f1'), ([(27, 93), (28, 98)], 1.2, 0.8, 'f1')])))
    body = [E(52, 68, 40, 23, depth=20), E(30, 71, 25, 21, depth=18), E(78, 71, 22, 20, depth=18)]
    L.append(('body', Mass(body, white=[(88, 78, 12, 15, 0)], seed=3, phi=0.15,
                           bars=[([(17, 62), (14, 70), (16, 79)], 1.4, 0.8, 'f1'),
                                 ([(26, 56), (23, 64), (24, 72)], 1.4, 0.8, 'f1'),
                                 ([(35, 53), (33, 60)], 1.3, 0.8, 'f1'),
                                 ([(60, 54), (58, 62), (59, 70)], 1.4, 0.8, 'f1'),
                                 ([(68, 58), (66, 66)], 1.2, 0.8, 'f1'),
                                 ([(44, 82), (43, 88)], 1.2, 0.8, 'f1'),
                                 ([(54, 82), (53, 88)], 1.2, 0.8, 'f1')])))
    paw2 = [E(86, 87, 12, 5.2, depth=5), E(96, 88, 10, 4.6, depth=4.6)]
    L.append(('paw2', Mass(paw2, white=[(100, 88, 11, 7, 0)], seed=5, phi=0.0,
                           toes=[([(101, 85.5), (101, 91)], 0.9, 0.9, 'f1')])))
    paw1 = [E(101, 86, 14, 5.6, depth=5.2), E(112, 87, 6, 4.8, depth=4.6)]
    L.append(('paw1', Mass(paw1, white=[(110, 87, 12, 8, 0)], seed=6, phi=0.0,
                           toes=[([(112, 84), (112, 90)], 0.9, 0.9, 'f1'), ([(115.5, 84), (116, 90)], 0.9, 0.9, 'f1')])))
    xf = Xf(90, 40, 0.05, 0.9)
    meta = dict(name='loaf', label='The cat is loafing.', eye='open', shadow=(62, 92, 54, 4),
                order=['tail', 'body', 'paw2', 'ear_l', 'ear_r', 'head', 'eyes', 'paw1'],
                br=66, lift=['ear_l', 'ear_r', 'head', 'eyes'], eyes=['open', 'half'], zzz=None,
                sway=dict(layer='tail', ax='y', base='left', amp=2, per=7000), bob=[])
    return L, xf, meta


# --------------------------------------------------------------------------------------------
def pose_side():
    """Lying on its side, forepaws raised near the face, hind feet at the bottom, tail hanging."""
    L = []
    tail = chain([(108, 66, 5.4), (115, 73, 5.0), (118, 83, 4.6), (116, 92, 4.2), (110, 97, 3.8)], step=0.4, depth_k=0.9)
    L.append(('tail', Mass(tail, seed=12, phi=1.4, la=5, lb=1.5, tip=(114.5, 92.0, -0.55, 0.83),
                           bars=[([(114, 76), (119, 77)], 1.2, 0.8, 'f1'), ([(116, 84), (121, 85)], 1.2, 0.8, 'f1')])))
    body = [E(66, 66, 42, 25, -0.08, depth=21), E(88, 68, 24, 24, depth=19), E(46, 62, 20, 22, depth=18)]
    L.append(('body', Mass(body, white=[(66, 80, 30, 13, -0.05)], seed=4, phi=-0.2,
                           bars=[([(98, 52), (102, 62), (100, 72)], 1.4, 0.8, 'f1'),
                                 ([(88, 46), (92, 56)], 1.3, 0.8, 'f1'),
                                 ([(78, 44), (80, 52)], 1.2, 0.8, 'f1'),
                                 ([(104, 70), (108, 78)], 1.3, 0.8, 'f1')])))
    shin1 = chain([(84, 76, 8.0), (78, 87, 6.2)], step=0.4)
    L.append(('foot1', Mass(shin1 + [E(76, 91, 9, 5.5, depth=5)], white=[(76, 91, 10, 7, 0)], seed=7, phi=1.4,
                            pads=pad_set(75.5, 91, 0.9, 0.2))))
    shin2 = chain([(98, 78, 8.0), (93, 88, 6.0)], step=0.4)
    L.append(('foot2', Mass(shin2 + [E(91, 93, 9, 5.2, depth=5)], white=[(91, 93, 10, 7, 0)], seed=8, phi=1.4,
                            pads=pad_set(91, 93, 0.9, -0.1))))
    pawA = chain([(64, 55, 6.8), (58, 49, 6.2)], step=0.4) + [E(54, 46, 8.5, 7, -0.4, depth=7)]
    L.append(('pawA', Mass(pawA, white=[(53, 45, 8, 7, 0)], seed=9, phi=-0.6)))
    pawB = chain([(64, 70, 6.4), (58, 69, 5.8)], step=0.4) + [E(52, 67, 9, 6.5, 0.2, depth=6.5)]
    L.append(('pawB', Mass(pawB, white=[(52, 67, 9, 7, 0)], seed=10, phi=-0.2, pads=pad_set(51.5, 67.5, 0.95, 0.15))))
    xf = Xf(27, 51, -1.0, 0.86)
    meta = dict(name='side', label='The cat is lying on its side.', eye='half', shadow=(66, 93, 52, 4), whiskers=False,
                order=['tail', 'body', 'foot1', 'foot2', 'ear_l', 'ear_r', 'head', 'eyes', 'pawA', 'pawB'],
                br=66, lift=['ear_l', 'ear_r', 'head', 'eyes', 'pawA', 'pawB'], eyes=['half', 'closed'], zzz=[34, 32],
                sway=dict(layer='tail', ax='x', base='top', amp=2, per=6400), bob=['pawB'])
    return L, xf, meta


# --------------------------------------------------------------------------------------------
def pose_back():
    """Asleep on its back: belly up, hind legs in the air on the left, head resting on the right."""
    L = []
    tail = chain([(8, 78, 5.4), (4, 68, 5.0), (3, 56, 4.6), (6, 46, 4.2), (12, 40, 3.8)], step=0.4, depth_k=0.9)
    L.append(('tail', Mass(tail, seed=13, phi=1.6, la=5, lb=1.5, tip=(8.5, 43.0, 0.72, -0.69),
                           bars=[([(0, 60), (6, 61)], 1.2, 0.8, 'f1'), ([(0, 52), (6, 53)], 1.2, 0.8, 'f1')])))
    body = [E(48, 76, 38, 18, depth=18), E(50, 70, 30, 13, depth=13)]
    L.append(('body', Mass(body, white=[(46, 70, 16, 8, 0), (62, 74, 9, 7, 0)], seed=5, phi=0.0, ragged=0.6,
                           bars=[([(22, 86), (25, 92)], 1.3, 0.8, 'f1'), ([(38, 90), (40, 95)], 1.3, 0.8, 'f1'),
                                 ([(66, 88), (68, 94)], 1.3, 0.8, 'f1'), ([(30, 60), (32, 66)], 1.2, 0.8, 'f1')])))
    leg1 = chain([(22, 74, 8.0), (19, 62, 6.2), (17, 50, 5.4)], step=0.4)
    L.append(('leg1', Mass(leg1 + [E(17, 45, 6.6, 6, depth=6)], white=[(17, 45, 9, 10, 0)], seed=14, phi=1.5,
                           pads=pad_set(17, 45.5, 0.95, 0.15))))
    leg2 = chain([(35, 72, 7.4), (32, 60, 5.8), (31, 50, 5.0)], step=0.4)
    L.append(('leg2', Mass(leg2 + [E(31, 45, 6.2, 5.6, depth=6)], white=[(31, 45, 8, 9, 0)], seed=15, phi=1.5,
                           pads=pad_set(31, 45.5, 0.9, -0.1))))
    arm1 = chain([(64, 68, 6.5), (71, 62, 6.0)], step=0.4)
    L.append(('arm1', Mass(arm1 + [E(75, 59, 8.0, 6.6, 0.5, depth=6.6)], white=[(76, 58, 7, 6, 0)], seed=16, phi=-0.6)))
    arm2 = [E(76, 87, 8.6, 6.0, 0.2, depth=6)]
    L.append(('arm2', Mass(arm2, white=[(76, 87, 8, 6, 0)], seed=17, phi=0.0)))
    xf = Xf(101, 66, 0.28, 0.9)
    meta = dict(name='back', label='The cat is asleep on its back.', eye='closed', shadow=(54, 95, 50, 4), whiskers=True,
                order=['tail', 'leg1', 'leg2', 'body', 'arm2', 'ear_l', 'ear_r', 'head', 'eyes', 'arm1'],
                br=76, lift=['ear_l', 'ear_r', 'head', 'eyes', 'arm1'], eyes=['closed'], zzz=[104, 40],
                sway=dict(layer='tail', ax='x', base='bottom', amp=3, per=6000), bob=['leg2'])
    return L, xf, meta


# --------------------------------------------------------------------------------------------
def pose_sprawl():
    """Sprawled out: one forepaw stretched far to the left, hind legs spread to the right."""
    L = []
    tail = chain([(100, 74, 5.2), (107, 82, 4.8), (110, 90, 4.4), (107, 96, 4.0)], step=0.4, depth_k=0.9)
    L.append(('tail', Mass(tail, seed=18, phi=1.2, la=5, lb=1.5, tip=(109.5, 90.5, -0.4, 0.92),
                           bars=[([(105, 80), (111, 81)], 1.2, 0.8, 'f1')])))
    body = [E(70, 64, 42, 26, 0.12, depth=22), E(94, 70, 22, 22, depth=19), E(48, 62, 22, 22, depth=19)]
    L.append(('body', Mass(body, white=[(68, 70, 28, 15, 0.1)], seed=6, phi=0.1,
                           bars=[([(96, 52), (100, 62), (98, 72)], 1.4, 0.8, 'f1'),
                                 ([(86, 46), (90, 56)], 1.3, 0.8, 'f1'),
                                 ([(76, 44), (78, 52)], 1.2, 0.8, 'f1')])))
    hind1 = chain([(94, 66, 9), (108, 68, 6.8), (117, 71, 5.8)], step=0.4)
    L.append(('hind1', Mass(hind1 + [E(120, 72, 7, 5.6, depth=5.5)], white=[(120, 72, 9, 7, 0)], seed=19, phi=0.2,
                            pads=pad_set(120, 72.5, 0.9, 1.4))))
    hind2 = chain([(86, 77, 8.4), (90, 85, 6.6)], step=0.4)
    L.append(('hind2', Mass(hind2 + [E(88, 91, 8, 5.2, depth=5.5)], white=[(88, 91, 9, 8, 0)], seed=20, phi=1.4,
                            pads=pad_set(88, 91.5, 0.9, 0.1))))
    arm = chain([(46, 64, 7.6), (30, 70, 6.2), (17, 74, 5.4)], step=0.4)
    L.append(('arm', Mass(arm + [E(9, 74.5, 7, 5.8, depth=5.5)], white=[(9, 74.5, 10, 8, 0)], seed=21, phi=0.2,
                          pads=pad_set(9, 75, 0.95, -1.4))))
    paw2 = [E(54, 70, 8, 6.5, 0.2, depth=6.5)]
    L.append(('paw2', Mass(paw2, white=[(54, 70, 7, 5, 0)], seed=22, phi=0.0)))
    xf = Xf(30, 41, -0.22, 0.88)
    meta = dict(name='sprawl', label='The cat is sprawled out.', eye='half', shadow=(66, 92, 52, 4),
                order=['tail', 'hind2', 'body', 'hind1', 'ear_l', 'ear_r', 'head', 'eyes', 'arm', 'paw2'],
                br=64, lift=['ear_l', 'ear_r', 'head', 'eyes'], eyes=['half', 'closed'], zzz=[14, 28],
                sway=dict(layer='tail', ax='x', base='top', amp=2, per=7000), bob=['arm'])
    return L, xf, meta


# --------------------------------------------------------------------------------------------
def pose_sit():
    """Sitting upright, seen from the front; tail curled up on the right."""
    L = []
    tail = chain([(88, 90, 5.0), (100, 90, 5.0), (109, 82, 4.7), (111, 71, 4.3), (107, 62, 3.8)], step=0.4, depth_k=0.9)
    L.append(('tail', Mass(tail, seed=23, phi=1.2, la=5, lb=1.5, tip=(110.5, 68.0, -0.35, -0.94),
                           bars=[([(104, 86), (106, 92)], 1.2, 0.8, 'f1'), ([(110, 78), (115, 79)], 1.2, 0.8, 'f1')])))
    body = [E(64, 70, 22, 26, depth=19), E(64, 80, 28, 17, depth=18), E(40, 82, 14, 13, depth=13), E(88, 82, 14, 13, depth=13)]
    L.append(('body', Mass(body, white=[(64, 64, 12, 24, 0)], seed=7, phi=1.57,
                           bars=[([(40, 76), (36, 82), (38, 90)], 1.4, 0.8, 'f1'), ([(88, 76), (92, 82), (90, 90)], 1.4, 0.8, 'f1'),
                                 ([(46, 62), (42, 70)], 1.2, 0.8, 'f1'), ([(82, 62), (86, 70)], 1.2, 0.8, 'f1')])))
    legL = chain([(54, 64, 6.4), (53, 78, 5.8), (53, 88, 5.4)], step=0.4)
    L.append(('legL', Mass(legL + [E(53, 91, 7.6, 4.8, depth=5)], white=[(53, 88, 9, 9, 0)], seed=24, phi=1.57,
                           toes=[([(51, 90), (51, 94)], 0.9, 0.9, 'f1'), ([(54.5, 90), (54.5, 94.5)], 0.9, 0.9, 'f1')])))
    legR = chain([(74, 64, 6.4), (75, 78, 5.8), (75, 88, 5.4)], step=0.4)
    L.append(('legR', Mass(legR + [E(75, 91, 7.6, 4.8, depth=5)], white=[(75, 88, 9, 9, 0)], seed=25, phi=1.57,
                           toes=[([(73, 90), (73, 94)], 0.9, 0.9, 'f1'), ([(76.5, 90), (76.5, 94.5)], 0.9, 0.9, 'f1')])))
    xf = Xf(64, 36, 0.0, 0.95)
    meta = dict(name='sit', label='The cat is sitting.', eye='open', shadow=(64, 95, 40, 4),
                order=['tail', 'body', 'legL', 'legR', 'ear_l', 'ear_r', 'head', 'eyes'],
                br=56, lift=['ear_l', 'ear_r', 'head', 'eyes'], eyes=['open', 'half'], zzz=None,
                sway=dict(layer='tail', ax='x', base='bottom', amp=3, per=5200), bob=[])
    return L, xf, meta


POSES = ['loaf', 'side', 'back', 'sprawl', 'sit']


def render_pose(layers, xf, meta, eye=None):
    out = {}
    for name, m in layers:
        im, F = m.render(CW, CH)
        im.despeckle()
        out[name] = im
    hl = head_layers(xf, whiskers=meta.get('whiskers', True))
    for k in ('ear_l', 'ear_r', 'head'):
        out[k] = hl[k]
    out['eyes_open'], out['eyes_half'], out['eyes_closed'] = hl['eyes_open'], hl['eyes_half'], hl['eyes_closed']
    out['eyes'] = hl['eyes_' + (eye or meta['eye'])]
    return out


def compose(out, order):
    im = Img(CW, CH)
    for k in order:
        if k in out:
            im.stamp(out[k])
    return im
