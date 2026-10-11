"""Nine-slice and UI sprites. All grids are generated here and exported as character rows."""
from artlib import *

CARD_H = 88   # card height in sprite pixels (scroll and tome cards)


# ----------------------------------------------------------------------------
# generic bevel frame (buttons, plates, plaques, tab plates)
# layers: list of (top, left, bottom, right) palette keys from the outside in; last entry is the face
# ----------------------------------------------------------------------------
def frame(N, layers, chamfer=1, face=None):
    cv = Cv(N, N)
    for y in range(N):
        for x in range(N):
            dt, dl, db, dr = y, x, N - 1 - y, N - 1 - x
            d = min(dt, dl, db, dr)
            # chamfered corners
            skip = False
            for (cx, cy) in ((x, y), (N - 1 - x, y), (x, N - 1 - y), (N - 1 - x, N - 1 - y)):
                if cx + cy < chamfer:
                    skip = True
            if skip:
                continue
            if d < len(layers):
                t, l, b, r = layers[d]
                if dt == d and dl == d:
                    k = t if dt <= dl else l
                elif dt == d and dr == d:
                    k = r if x >= N - 1 - y else t
                    k = r
                elif db == d and dl == d:
                    k = l
                elif db == d and dr == d:
                    k = b
                elif dt == d:
                    k = t
                elif dl == d:
                    k = l
                elif db == d:
                    k = b
                else:
                    k = r
            else:
                k = face
            cv.set(x, y, k)
    return cv


def layer(k):
    return (k, k, k, k)


def bev(hi, lo):
    return (hi, hi, lo, lo)


def make_frames():
    out = {}
    # gold button
    out['btn'] = frame(9, [layer('ink'), bev('g3', 'g1')], chamfer=1, face='g2')
    # navy tab plate (raised) and lowered
    out['tab'] = frame(9, [layer('ink'), bev('n3', 'n1')], chamfer=1, face='n2')
    out['tabon'] = frame(9, [layer('ink'), bev('n1', 'n3')], chamfer=1, face='n1')
    # parchment label plate
    out['plate'] = frame(9, [layer('b1'), bev('p4', 'p2')], chamfer=1, face='p3')
    # red close button
    out['btnred'] = frame(9, [layer('ink'), bev('r3', 'r1')], chamfer=1, face='r2')
    # heading plaque: ink outline, gold rim, ink line, navy face
    out['plaque'] = frame(
        13,
        [layer('ink'), bev('g3', 'g1'), layer('g2'), layer('ink'), bev('n1', 'n3')],
        chamfer=2, face='n2')
    return out


# ----------------------------------------------------------------------------
# scroll (nine-slice 40x40; slices top 12, right 8, bottom 12, left 8)
# ----------------------------------------------------------------------------
def scroll():
    W, H = 40, 40
    cv = Cv(W, H)
    prof = ['b1', 'p4', 'p4', 'p3', 'p3', 'p3', 'p2', 'p2', 'p1', 'p1', 'b1']   # cylinder, lit from above
    # sheet first (the rolls cover its ends)
    cv.rect(3, 9, 36, 30, 'p3')
    for y in range(9, 31):
        cv.set(3, y, 'b1')
        cv.set(4, y, 'p1')
        cv.set(5, y, 'p2')
        cv.set(36, y, 'b1')
        cv.set(35, y, 'p1')
        cv.set(34, y, 'p2')
    # top roll
    for i, k in enumerate(prof):
        cv.hline(4, 35, i, k)
    # shadow of the roll on the sheet
    cv.hline(6, 33, 11, 'p2')
    # bottom roll (same cylinder, plus a deep shadow row)
    for i, k in enumerate(prof):
        cv.hline(4, 35, 28 + i, k)
    cv.hline(4, 35, 39, 'b1')
    cv.hline(4, 35, 38, 'b2')
    # end caps (disc seen from the side, with a spiral line)
    capL = [
        "..ll",
        ".lkj",
        "ljjj",
        "ljhj",
        "ljhi",
        "ljhi",
        "lihi",
        "lihh",
        ".lhh",
        ".lmh",
        "..ll",
    ]
    tone = {'k': 'j', 'j': 'i', 'i': 'h', 'h': 'm', 'm': 'l', 'l': 'l'}
    for top in (0, 28):
        for dy, row in enumerate(capL):
            for dx, ch in enumerate(row):
                if ch == '.':
                    continue
                cv.set(dx, top + dy, LEGEND[ch])
                # right cap: mirrored, one tone darker (light comes from the upper left)
                cv.set(W - 1 - dx, top + dy, LEGEND[tone[ch]])
    # bottom cap tidy-up for the extra rows
    for dx in range(4):
        cv.set(dx, 39, None)
        cv.set(W - 1 - dx, 39, None)
    cv.set(2, 38, 'b1')
    cv.set(3, 38, 'b1')
    cv.set(36, 38, 'b1')
    cv.set(37, 38, 'b1')
    cv.set(2, 39, None)
    cv.set(3, 39, 'b1')
    cv.set(36, 39, 'b1')
    cv.set(37, 39, None)
    return cv


def seal():
    """Red wax seal, 12x12."""
    cv = Cv(12, 12)
    import math
    for y in range(12):
        for x in range(12):
            dx, dy = x - 5.5, y - 5.5
            r = math.hypot(dx, dy)
            if r <= 5.6:
                cv.set(x, y, 'r2')
    # irregular edge nibbles
    for (x, y) in [(0, 4), (11, 7), (5, 0), (7, 11)]:
        cv.set(x, y, None)
    cv.outline('r1')
    # embossed ring and cross
    for y in range(12):
        for x in range(12):
            if cv.get(x, y) == 'r2':
                r = math.hypot(x - 5.5, y - 5.5)
                if 3.0 <= r <= 3.9:
                    cv.set(x, y, 'r1' if (x + y) > 11 else 'r3')
    cv.pts([(5, 5), (6, 5), (5, 6), (6, 6)], 'r3')
    cv.pts([(6, 6)], 'r1')
    return cv


# ----------------------------------------------------------------------------
# tome cover (nine-slice 48 x CARD_H; slices top 12, right 14, bottom 12, left 16)
# cover roles: W outline, X shadow, Y base, Z highlight (remapped per colorway)
# ----------------------------------------------------------------------------
def tome():
    """Nine-slice 50 x CARD_H; slices top 12, right 14, bottom 12, left 20.
    Everything inside the stretched columns (20..35) is uniform horizontally."""
    W, H = 50, CARD_H
    cv = Cv(W, H)
    CW, CH = 46, H - 4            # cover size
    # page block behind the cover, offset down and right
    cv.rect(3, 3, W - 2, H - 2, 'p3')
    for x in range(CW, W - 1):
        cv.vline(x, 3, H - 2, 'p3' if (x - CW) % 2 == 1 else 'p2')
    for y in range(CH, H - 1):
        cv.hline(3, W - 2, y, 'p3' if (y - CH) % 2 == 1 else 'p2')
    cv.vline(CW, 3, H - 2, 'p4')
    cv.hline(3, W - 2, CH, 'p4')
    # cover
    cv.rect(0, 0, CW - 1, CH - 1, 'cm')
    cv.hline(0, CW - 1, 0, 'co')
    cv.hline(0, CW - 1, CH - 1, 'co')
    cv.vline(0, 0, CH - 1, 'co')
    cv.vline(CW - 1, 0, CH - 1, 'co')
    cv.hline(1, CW - 2, 1, 'ch')
    cv.vline(1, 1, CH - 2, 'ch')
    cv.hline(1, CW - 2, CH - 2, 'cd')
    cv.vline(CW - 2, 1, CH - 2, 'cd')
    # chamfered cover corners
    for (x, y) in [(0, 0), (1, 0), (0, 1), (CW - 1, 0), (CW - 2, 0), (CW - 1, 1),
                   (0, CH - 1), (1, CH - 1), (0, CH - 2), (CW - 1, CH - 1), (CW - 2, CH - 1), (CW - 1, CH - 2)]:
        cv.set(x, y, None)
    for (x, y) in [(2, 0), (1, 1), (0, 2), (CW - 3, 0), (CW - 2, 1), (CW - 1, 2),
                   (2, CH - 1), (1, CH - 2), (0, CH - 3), (CW - 3, CH - 1), (CW - 2, CH - 2), (CW - 1, CH - 3)]:
        cv.set(x, y, 'co')
    # spine: darker leather with raised gold bands and stitch marks
    cv.rect(2, 2, 11, CH - 3, 'cd')
    cv.vline(2, 2, CH - 3, 'cm')
    for y in range(16, CH - 10, 16):
        cv.hline(1, 12, y - 1, 'co')
        cv.hline(1, 12, y, 'g3')
        cv.hline(1, 12, y + 1, 'g2')
        cv.hline(1, 12, y + 2, 'g1')
        cv.hline(1, 12, y + 3, 'co')
        for sy in (y - 5, y + 8):
            cv.pts([(4, sy), (9, sy)], 'cm')
    cv.vline(11, 1, CH - 2, 'co')
    cv.vline(12, 1, CH - 2, 'g2')
    cv.vline(13, 1, CH - 2, 'cd')
    # inner gold frame (its vertical lines sit inside the left and right slices)
    x0, x1, y0, y1 = 18, 40, 6, CH - 7
    cv.hline(x0, x1, y0, 'g2')
    cv.hline(x0, x1, y1, 'g1')
    cv.vline(x0, y0, y1, 'g2')
    cv.vline(x1, y0, y1, 'g1')
    cv.hline(x0 + 1, x1 - 1, y0 + 1, 'cd')
    cv.vline(x0 + 1, y0 + 1, y1 - 1, 'cd')
    cv.hline(x0, x1, y0 - 1, 'cd')
    cv.hline(x0 + 1, x1 - 1, y1 + 1, 'ch')
    cv.vline(x1 + 1, y0 + 1, y1, 'ch')
    # corner brackets (gold); arms stay inside the corner slices
    def bracket(cx, cy, sx, sy, armh, armv):
        for i in range(armh):
            x = cx + sx * i
            cv.set(x, cy, 'g3')
            cv.set(x, cy + sy, 'g2')
            cv.set(x, cy + 2 * sy, 'g1')
        for j in range(armv):
            y = cy + sy * j
            cv.set(cx, y, 'g3')
            cv.set(cx + sx, y, 'g2')
            cv.set(cx + 2 * sx, y, 'g1')
        cv.set(cx + 3 * sx, cy + 3 * sy, 'g3')
        cv.set(cx + 2 * sx, cy + 2 * sy, 'g1')
        for t in range(3):
            cv.set(cx + sx * armh, cy + sy * t, 'co')
            cv.set(cx + sx * t, cy + sy * armv, 'co')
    bracket(3, 3, 1, 1, 15, 13)
    bracket(CW - 4, 3, -1, 1, 6, 13)
    bracket(3, CH - 4, 1, -1, 15, 13)
    bracket(CW - 4, CH - 4, -1, -1, 6, 13)
    # metal clasp wrapping the fore-edge, with a red gem
    cx0, cx1, cy0, cy1 = 39, 48, 36, 51
    cv.rect(cx0, cy0, cx1, cy1, 's2')
    cv.hline(cx0, cx1, cy0, 'ink')
    cv.hline(cx0, cx1, cy1, 'ink')
    cv.vline(cx0, cy0, cy1, 'ink')
    cv.vline(cx1, cy0, cy1, 'ink')
    cv.hline(cx0 + 1, cx1 - 1, cy0 + 1, 's4')
    cv.vline(cx0 + 1, cy0 + 1, cy1 - 1, 's3')
    cv.hline(cx0 + 1, cx1 - 1, cy1 - 1, 's1')
    cv.vline(cx1 - 1, cy0 + 1, cy1 - 1, 's1')
    cv.hline(cx0 + 2, cx1 - 2, cy0 + 3, 'ink')
    cv.hline(cx0 + 2, cx1 - 2, cy1 - 3, 'ink')
    cv.vline(cx0 + 2, cy0 + 3, cy1 - 3, 'ink')
    cv.vline(cx1 - 2, cy0 + 3, cy1 - 3, 'ink')
    cv.rect(cx0 + 3, cy0 + 4, cx1 - 3, cy1 - 4, 'r2')
    cv.hline(cx0 + 3, cx1 - 3, cy0 + 4, 'r3')
    cv.vline(cx0 + 3, cy0 + 4, cy1 - 4, 'r3')
    cv.hline(cx0 + 3, cx1 - 3, cy1 - 4, 'r1')
    cv.vline(cx1 - 3, cy0 + 5, cy1 - 4, 'r1')
    cv.set(cx0 + 4, cy0 + 5, 'p4')
    cv.pts([(cx0 + 1, cy0 + 1), (cx1 - 1, cy0 + 1), (cx0 + 1, cy1 - 1), (cx1 - 1, cy1 - 1)], 's4')
    # outline around the silhouette (page block included)
    cv.outline('co')
    return cv


# ----------------------------------------------------------------------------
# signpost: arrow board (nine-slice 36 x 46; slices top 5, right 18, bottom 5, left 6), post tile, plaque
# ----------------------------------------------------------------------------
BOARD_W, BOARD_H, TIP = 36, 46, 18


def plank():
    """Arrow board. Nine-slice 36x46: left 6, right 18 (tip), top 5, bottom 5.
    The middle columns (6..17) are uniform horizontally so that stretching stays clean."""
    W, H = BOARD_W, BOARD_H
    mask = [[False] * W for _ in range(H)]
    for x in range(W):
        if x < W - TIP:
            top, bot = 0, H - 1
        else:
            i = x - (W - TIP)
            top = int(i * (H / 2 - 1) / (TIP - 1))
            bot = H - 1 - top
        for y in range(top, bot + 1):
            mask[y][x] = True
    d = dist_map(mask)
    cv = Cv(W, H)
    mid = H / 2
    for y in range(H):
        for x in range(W):
            if not mask[y][x]:
                continue
            dd = d[y][x]
            if dd == 1:
                k = 'b1'
            elif dd == 2:
                k = 'b4' if y < mid else 'b1'
            else:
                k = 'b2'
            cv.set(x, y, k)
    for y in range(2, H - 2):
        if cv.get(1, y) == 'b2':
            cv.set(1, y, 'b4' if y < mid else 'b2')
    # wood grain: full-width streaks (through the stretched middle) and short streaks near the ends
    for gy in (9, 16, 22, 29, 36):
        for x in range(W):
            if cv.get(x, gy) == 'b2' and (x >= 6 and x <= 17 or x < 6 and gy in (9, 29) or x >= 18 and gy in (16, 36)):
                cv.set(x, gy, 'b3')
    for (gx0, gx1, gy) in [(3, 5, 13), (19, 24, 12), (19, 22, 33), (2, 5, 40)]:
        for x in range(gx0, gx1 + 1):
            if cv.get(x, gy) == 'b2':
                cv.set(x, gy, 'b3')
    # nail heads (only in the end slices)
    def nail(nx, ny):
        cv.pts([(nx - 1, ny), (nx - 1, ny + 1), (nx, ny - 1), (nx + 1, ny - 1), (nx + 2, ny), (nx + 2, ny + 1),
                (nx, ny + 2), (nx + 1, ny + 2)], 'b1')
        cv.pts([(nx, ny), (nx + 1, ny), (nx, ny + 1), (nx + 1, ny + 1)], 's3')
        cv.set(nx, ny, 's4')
        cv.set(nx + 1, ny + 1, 's1')
    nail(3, 6)
    nail(3, 38)
    nail(21, 22)
    return cv


def post():
    cv = Cv(14, 24)
    cv.rect(0, 0, 13, 23, 'b2')
    cv.vline(0, 0, 23, 'b1')
    cv.vline(13, 0, 23, 'b1')
    cv.vline(1, 0, 23, 'b4')
    cv.vline(2, 0, 23, 'b3')
    cv.vline(12, 0, 23, 'b1')
    cv.vline(11, 0, 23, 'b2')
    # grain streaks (vertical, broken)
    for x, (a, b) in {4: (2, 12), 6: (9, 21), 8: (0, 8), 9: (14, 23), 10: (4, 17)}.items():
        cv.vline(x, a, b, 'b3')
    cv.pts([(5, 5), (5, 6), (7, 15), (7, 16), (10, 21)], 'b1')
    return cv


def mound():
    """Stone foot for the post, 24x8."""
    cv = Cv(24, 8)
    rows = [
        "....########........",
        "..##3444444423##....",
    ]
    cv = Cv(24, 8)
    prof = [(8, 15), (5, 18), (3, 20), (1, 22), (0, 23), (0, 23), (0, 23), (0, 23)]
    for y, (a, b) in enumerate(prof):
        for x in range(a, b + 1):
            cv.set(x, y, 's2')
    cv.outline('ink')
    for y, (a, b) in enumerate(prof):
        if y in (0, 1, 2, 3):
            cv.hline(a + 1, a + 3, y, 's3')
        cv.set(b, y, 's1')
        cv.set(b - 1, y, 's1')
    cv.hline(0, 23, 7, 's1')
    cv.pts([(10, 3), (11, 3), (15, 5), (6, 5), (7, 5), (18, 4)], 's3')
    cv.pts([(12, 1), (13, 1)], 's3')
    return cv


# ----------------------------------------------------------------------------
# book frame for the project modal (nine-slice 40x40, all slices 12)
# ----------------------------------------------------------------------------
def book():
    N = 40
    cv = Cv(N, N)
    S = 12
    for y in range(N):
        for x in range(N):
            dt, dl, db, dr = y, x, N - 1 - y, N - 1 - x
            d = min(dt, dl, db, dr)
            # chamfer
            sk = False
            for (cx, cy) in ((x, y), (N - 1 - x, y), (x, N - 1 - y), (N - 1 - x, N - 1 - y)):
                if cx + cy < 2:
                    sk = True
            if sk:
                continue
            if d == 0:
                k = 'b1'
            elif d == 1:
                k = 'b4' if (dt == 1 or dl == 1) and not (db == 1 or dr == 1) else 'b2'
            elif d <= 7:
                k = 'b3'
                # leather grain only inside the corner slices (edge slices are stretched)
                in_corner = (x < S or x >= N - S) and (y < S or y >= N - S)
                if in_corner and (x * 7 + y * 3) % 11 == 0:
                    k = 'b2'
                if in_corner and (x * 5 + y * 9) % 13 == 0:
                    k = 'b4'
            elif d == 8:
                k = 'b2'
            elif d == 9:
                k = 'g2'
            elif d == 10:
                k = 'g1'
            elif d == 11:
                k = 'p1'       # inner recess shadow
            else:
                k = 'p3'
            cv.set(x, y, k)
    # recess highlight on the lower-right inside
    for y in range(S, N - S):
        cv.set(N - S, y, 'p2') if False else None
    # gold corner caps
    def cap(cx, cy, sx, sy):
        for i in range(8):
            for j in range(3):
                x, y = cx + sx * i, cy + sy * j
                cv.set(x, y, 'g3' if j == 0 else ('g2' if j == 1 else 'g1'))
                x, y = cx + sx * j, cy + sy * i
                cv.set(x, y, 'g3' if j == 0 else ('g2' if j == 1 else 'g1'))
        cv.set(cx, cy, 'g3')
        cv.set(cx + sx, cy + sy, 'g2')
        for k in range(3):
            cv.set(cx + sx * 8, cy + sy * k, 'ink')
            cv.set(cx + sx * k, cy + sy * 8, 'ink')
    cap(2, 2, 1, 1)
    cap(N - 3, 2, -1, 1)
    cap(2, N - 3, 1, -1)
    cap(N - 3, N - 3, -1, -1)
    # rivets
    for (x, y) in [(4, 4), (N - 5, 4), (4, N - 5), (N - 5, N - 5)]:
        cv.set(x, y, 'g1')
    for (x, y) in [(3, 3), (N - 4, 3), (3, N - 4), (N - 4, N - 4)]:
        cv.set(x, y, 'ink') if False else None
    cv.outline('ink')
    return cv


# ----------------------------------------------------------------------------
# UI sprites
# ----------------------------------------------------------------------------
def close_x():
    cv = Cv(11, 11)
    for i in range(9):
        for (dx, dy) in ((0, 0), (1, 0)):
            cv.set(1 + i + dx, 1 + i + dy, 'p4')
            cv.set(8 - i + dx, 1 + i + dy, 'p4')
    cv.outline('ink')
    return cv


def ext_arrow():
    """External-link arrow (up and right); colour role Z is remapped per context."""
    cv = Cv(9, 9)
    for x in range(3, 9):
        cv.set(x, 0, 'ch')
        cv.set(x, 1, 'ch')
    for y in range(0, 6):
        cv.set(7, y, 'ch')
        cv.set(8, y, 'ch')
    for i in range(0, 7):
        cv.set(1 + i, 7 - i, 'ch')
        cv.set(2 + i, 7 - i, 'ch')
    cv.set(0, 8, 'ch')
    cv.set(1, 8, 'ch')
    return cv


def gem():
    return Cv.from_rows([
        "...l...",
        "..lgl..",
        ".lgggl.",
        "lgggffl",
        ".lffel.",
        "..lel..",
        "...l...",
    ])


def thumb_grip():
    return Cv.from_rows([
        "ggggggg",
        "eeeeeee",
        ".......",
        "ggggggg",
        "eeeeeee",
        ".......",
        "ggggggg",
        "eeeeeee",
    ])


def sb_up():
    return Cv.from_rows([
        "...k...",
        "..kkk..",
        ".kkkkk.",
        "kkkkkkk",
    ])


def sb_down():
    return Cv.from_rows([
        "kkkkkkk",
        ".kkkkk.",
        "..kkk..",
        "...k...",
    ])


# ----------------------------------------------------------------------------
# stone tile (32x32): running-bond bricks with mortar; very low contrast
# ----------------------------------------------------------------------------
def stone():
    N = 32
    cv = Cv(N, N)
    for y in range(N):
        for x in range(N):
            cv.set(x, y, 'st')
    bh, bw = 8, 16
    for row in range(N // bh):
        y0 = row * bh
        off = 0 if row % 2 == 0 else bw // 2
        cv.hline(0, N - 1, y0, 'ink')
        for bx in range(-1, N // bw + 1):
            x0 = bx * bw + off
            if 0 <= x0 < N:
                cv.vline(x0, y0, y0 + bh - 1, 'ink')
            # brick highlight (top/left), subtle
            for x in range(x0 + 1, x0 + bw - 1):
                if 0 <= x < N and y0 + 1 < N:
                    cv.set(x, y0 + 1, 's1')
            for y in range(y0 + 1, y0 + bh - 1):
                if 0 <= x0 + 1 < N:
                    cv.set(x0 + 1, y, 's1')
    # speckles
    import random
    rnd = random.Random(7)
    for _ in range(26):
        x, y = rnd.randrange(N), rnd.randrange(N)
        if cv.get(x, y) == 'st':
            cv.set(x, y, 's1' if rnd.random() < 0.6 else 'ink')
    return cv


def favicon():
    cv = Cv(16, 16)
    # tiny round-bottom flask
    rows = [
        "......lnnl......",
        "......lnnl......",
        ".....#4##4#.....",
        "......#44#......",
        "......#44#......",
        ".....##44##.....",
        "....#4dcccd#....",
        "...#4dcccccc#...",
        "..#4dcccccccc#..",
        "..#4dccccccbb#..",
        "..#4cccccccbb#..",
        "..#dccccccbbb#..",
        "...#cccccbbb#...",
        "....#cccbbb#....",
        ".....#bbbb#.....",
        "......####......",
    ]
    return Cv.from_rows(rows)


def cursor_arrow():
    """Pointer arrow, 12x19; the hot spot is the tip (0, 0)."""
    cv = Cv(12, 19)
    # filled shape: a head with a tail, drawn row by row
    rows = [
        "#...........",
        "##..........",
        "#k#.........",
        "#kk#........",
        "#kkk#.......",
        "#kkkk#......",
        "#kkkkk#.....",
        "#kkkkkk#....",
        "#kkkkkkk#...",
        "#kkkkkkkk#..",
        "#kkkkkkkkk#.",
        "#kkkkkk#####",
        "#kkk#kk#....",
        "#kk#.#kk#...",
        "#k#..#kk#...",
        "##....#kk#..",
        "#.....#kk#..",
        "......#kk#..",
        ".......##...",
    ]
    return Cv.from_rows(rows)


def cursor_hand():
    """Pointing hand with a cuff, 16x18; the hot spot is the tip of the index finger (7, 0)."""
    rows = [
        ".....####.......",
        "....#kkkk#......",
        "....#kkkk#......",
        "....#kkkk#......",
        "....#kkkk#......",
        "....#kkkk#......",
        "....#kkkk#####..",
        "....#kkkk#kk#kk#",
        ".####kkkk#kk#kk#",
        "#kkk#kkkkkkkkkk#",
        "#kkkkkkkkkkkkkk#",
        ".#kkkkkkkkkkkkk#",
        ".#kkkkkkkkkkkk#.",
        "..#kkkkkkkkkkk#.",
        "...#kkkkkkkkk#..",
        "...#bbbbbbbbb#..",
        "...#bcbcbcbcb#..",
        "...###########..",
    ]
    return Cv.from_rows(rows)


def build():
    out = {}
    fr = make_frames()
    for k, cv in fr.items():
        out['f_' + k] = cv.rows()
    out['scroll'] = scroll().rows()
    out['seal'] = seal().rows()
    out['tome'] = tome().rows()
    out['plank'] = plank().rows()
    out['post'] = post().rows()
    out['mound'] = mound().rows()
    out['book'] = book().rows()
    out['close'] = close_x().rows()
    out['ext'] = ext_arrow().rows()
    out['gem'] = gem().rows()
    out['grip'] = thumb_grip().rows()
    out['sbup'] = sb_up().rows()
    out['sbdown'] = sb_down().rows()
    out['stone'] = stone().rows()
    out['favicon'] = favicon().rows()
    out['cur_arrow'] = cursor_arrow().rows()
    out['cur_hand'] = cursor_hand().rows()
    return out
