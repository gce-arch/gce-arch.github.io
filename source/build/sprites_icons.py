"""Tab icons: mana potion, health potion, quest journal. Canvas 28x28."""
import math
from artlib import *

W = H = 28


def sphere_halfs(R, y0, y1, cy):
    """Half widths of a circle of radius R centered at row-center cy, for rows y0..y1."""
    out = []
    for y in range(y0, y1 + 1):
        dy = y + 0.5 - cy
        v = R * R - dy * dy
        out.append(max(0, int(round(math.sqrt(v)))) if v > 0 else 0)
    return out


def paint_flask(cv, ox, oy, rows_halfs, liq_top, liq, air, glint_cut):
    """rows_halfs: list of (row, halfwidth); local frame is 24 wide, centre between columns 11 and 12."""
    n = max(r for r, _ in rows_halfs) + 1
    mask = [[False] * 24 for _ in range(n)]
    for r, hw in rows_halfs:
        for x in range(12 - hw, 12 + hw):
            mask[r][x] = True
    d = dist_map(mask)
    lo, hi, base = liq
    air_fill, air_glint = air
    for y in range(n):
        xs = [x for x in range(24) if mask[y][x]]
        if not xs:
            continue
        xl, xr = xs[0], xs[-1]
        for x in range(xl, xr + 1):
            dd = d[y][x]
            dl = x - xl + 1
            dr = xr - x + 1
            db = 1
            yy = y
            while yy + 1 < n and mask[yy + 1][x]:
                yy += 1
                db += 1
            du = 1
            yy = y
            while yy - 1 >= 0 and mask[yy - 1][x]:
                yy -= 1
                du += 1
            if dd == 1:
                k = 'ink'
            elif dd == 2:
                # glass rim: light on the upper left, mid-tone elsewhere
                k = 's4' if (x < 12 and y < glint_cut) else 's3'
                if (x >= 12 and y < glint_cut - 4):
                    k = 's3'
            else:
                if y >= liq_top:
                    if y == liq_top:
                        k = hi
                    elif dl in (3, 4) and du > 2:
                        k = hi
                    elif dr in (3, 4) or db in (3, 4):
                        k = lo
                    else:
                        k = base
                else:
                    k = air_glint if dl == 3 else air_fill
            cv.set(ox + x, oy + y, k)


def cork(cv, ox, oy, y0, y1, hw, cols=('b3', 'b4', 'b2')):
    cb, chl, csh = cols
    for y in range(y0, y1 + 1):
        for x in range(12 - hw, 12 + hw):
            if y == y0 or x == 12 - hw or x == 11 + hw:
                k = 'b1'
            elif x == 12 - hw + 1 or y == y0 + 1:
                k = chl
            elif x == 11 + hw - 1:
                k = csh
            else:
                k = cb
            cv.set(ox + x, oy + y, k)


def mana():
    cv = Cv(W, H)
    rows = {}
    rows[5] = 6
    rows[6] = 6
    for r in (7, 8):
        rows[r] = 4
    for r, hw in zip(range(9, 26), sphere_halfs(9, 9, 25, 17)):
        rows[r] = max(hw, 4)
    paint_flask(cv, 2, 1, sorted(rows.items()), liq_top=11, liq=('n2', 'n4', 'n3'), air=('s2', 's3'), glint_cut=20)
    ox, oy = 2, 1
    # glass lip (flange) painted by hand so it reads as glass, not as a black bar
    for r in (5, 6):
        cv.set(ox + 6, oy + r, 'ink')
        cv.set(ox + 17, oy + r, 'ink')
        cv.set(ox + 7, oy + r, 's4')
        cv.set(ox + 16, oy + r, 's3')
    cv.set(ox + 7, oy + 5, 'ink')
    cv.set(ox + 16, oy + 5, 'ink')
    cv.hline(ox + 6, ox + 17, oy + 7, 'ink')
    cv.set(ox + 7, oy + 7, 's3')
    cv.set(ox + 16, oy + 7, 's3')
    cork(cv, ox, oy, 0, 6, 4)
    cv.pts([(ox + 10, oy + 2), (ox + 13, oy + 4), (ox + 11, oy + 5)], 'b2')
    # glints, bubbles
    cv.pts([(ox + 6, oy + 15), (ox + 6, oy + 16), (ox + 7, oy + 14)], 's4')
    cv.pts([(ox + 7, oy + 21), (ox + 8, oy + 22)], 's4')
    cv.pts([(ox + 15, oy + 20), (ox + 16, oy + 19)], 'n4')
    cv.pts([(ox + 12, oy + 22)], 'n4')
    cv.pts([(ox + 14, oy + 15)], 's4')
    cv.pts([(ox + 10, oy + 9), (ox + 10, oy + 10)], 's3')
    # magic sparkles
    for (sx, sy, k) in [(25, 4, 'n4'), (3, 9, 's4')]:
        cv.pts([(sx - 1, sy), (sx + 1, sy), (sx, sy - 1), (sx, sy + 1)], k)
        cv.set(sx, sy, 's4')
    return cv


def health():
    cv = Cv(W, H)
    rows = {}
    rows[4] = 6
    rows[5] = 6
    rows[6] = 4
    for r, hw in zip(range(7, 27), sphere_halfs(10, 7, 26, 17)):
        rows[r] = max(hw, 4)
    paint_flask(cv, 2, 1, sorted(rows.items()), liq_top=13, liq=('r1', 'r3', 'r2'), air=('s2', 's3'), glint_cut=21)
    ox, oy = 2, 1
    # gold collar
    for r, (a, b, c) in enumerate([('g3', 'g2', 'g1')]):
        pass
    cv.hline(ox + 6, ox + 17, oy + 4, 'g3')
    cv.hline(ox + 6, ox + 17, oy + 5, 'g2')
    cv.pts([(ox + 6, oy + 4), (ox + 6, oy + 5), (ox + 17, oy + 4), (ox + 17, oy + 5)], 'ink')
    cv.pts([(ox + 7, oy + 4), (ox + 8, oy + 4)], 'p4')
    cv.hline(ox + 7, ox + 16, oy + 5, 'g2')
    cv.pts([(ox + 15, oy + 5), (ox + 16, oy + 5)], 'g1')
    cv.hline(ox + 8, ox + 15, oy + 6, 'ink')
    cv.pts([(ox + 8, oy + 6), (ox + 15, oy + 6)], 'ink')
    cv.hline(ox + 9, ox + 14, oy + 6, 'g1')
    # red wax cap over the cork
    cap = {0: (9, 14), 1: (8, 15), 2: (8, 15), 3: (7, 16)}
    for y, (a, b) in cap.items():
        for x in range(a, b + 1):
            if y == 0 or x == a or x == b:
                k = 'ink' if (x in (a, b) or y == 0) else 'r2'
            else:
                k = 'r2'
            cv.set(ox + x, oy + y, k)
    cv.hline(ox + 9, ox + 14, oy + 0, 'r1')
    cv.hline(ox + 10, ox + 13, oy + 1, 'r3')
    cv.pts([(ox + 9, oy + 1), (ox + 9, oy + 2), (ox + 10, oy + 2)], 'r3')
    cv.hline(ox + 8, ox + 15, oy + 3, 'r2')
    cv.pts([(ox + 7, oy + 3), (ox + 16, oy + 3)], 'ink')
    cv.pts([(ox + 13, oy + 3), (ox + 14, oy + 3), (ox + 15, oy + 3)], 'r1')
    cv.pts([(ox + 15, oy + 2)], 'r1')
    # cross emblem
    cx, cy = ox + 14, oy + 18
    cv.pts([(cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)], 'p4')
    cv.set(cx, cy, 'p3')
    cv.pts([(cx + 1, cy + 2), (cx + 2, cy + 1)], 'r1')
    # glints, bubbles
    cv.pts([(ox + 5, oy + 15), (ox + 5, oy + 16), (ox + 6, oy + 14)], 's4')
    cv.pts([(ox + 7, oy + 22), (ox + 8, oy + 23)], 's4')
    cv.pts([(ox + 17, oy + 21)], 'r3')
    cv.pts([(ox + 10, oy + 22)], 'r3')
    cv.pts([(ox + 9, oy + 8), (ox + 9, oy + 9)], 's3')
    return cv


def journal():
    cv = Cv(W, H)
    # page block (offset down-right behind the cover)
    cv.rect(5, 4, 24, 24, 'p3')
    cv.vline(24, 5, 24, 'p2')
    cv.hline(6, 24, 24, 'p2')
    cv.vline(23, 5, 23, 'p4')
    cv.hline(6, 23, 23, 'p4')
    for y in (8, 11, 14, 17, 20):
        cv.set(24, y, 'p1')
    for x in (9, 12, 15, 18, 21):
        cv.set(x, 24, 'p1')
    # cover
    cv.rect(3, 2, 22, 22, 'b3')
    cv.hline(3, 22, 2, 'b4')
    cv.vline(3, 2, 22, 'b4')
    cv.hline(4, 22, 22, 'b2')
    cv.vline(22, 3, 22, 'b2')
    cv.vline(21, 3, 21, 'b2')
    cv.hline(4, 21, 21, 'b2')
    # spine band (left) with raised gold bands
    cv.rect(4, 3, 7, 20, 'b2')
    cv.vline(4, 3, 20, 'b3')
    cv.vline(7, 3, 20, 'b1')
    for y in (6, 11, 16):
        cv.hline(4, 7, y, 'g3')
        cv.hline(4, 7, y + 1, 'g1')
    # gold inner frame
    for x in range(10, 20):
        cv.set(x, 5, 'g2')
        cv.set(x, 19, 'g1')
    for y in range(5, 20):
        cv.set(10, y, 'g2')
        cv.set(19, y, 'g1')
    cv.rect(11, 6, 18, 18, 'b3')
    cv.hline(11, 18, 6, 'b4')
    cv.vline(11, 6, 18, 'b4')
    # blue gem (diamond) set in gold
    gx, gy = 14, 12
    diamond = [(0, -4), (-1, -3), (0, -3), (1, -3), (-2, -2), (-1, -2), (0, -2), (1, -2), (2, -2),
               (-3, -1), (-2, -1), (-1, -1), (0, -1), (1, -1), (2, -1), (3, -1),
               (-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0),
               (-2, 1), (-1, 1), (0, 1), (1, 1), (2, 1), (-1, 2), (0, 2), (1, 2), (0, 3)]
    for dx, dy in diamond:
        cv.set(gx + dx, gy + dy, 'n3')
    for dx, dy in [(-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0), (-2, 1), (-1, 1), (0, 1), (1, 1), (2, 1),
                   (-1, 2), (0, 2), (1, 2), (0, 3)]:
        cv.set(gx + dx, gy + dy, 'n2')
    for dx, dy in [(0, -3), (-1, -2), (0, -2), (-2, -1), (-1, -1)]:
        cv.set(gx + dx, gy + dy, 'n4')
    cv.pts([(gx - 1, gy - 2), (gx - 1, gy - 1)], 's4')
    gem_cells = set((gx + dx, gy + dy) for dx, dy in diamond)
    for (x, y) in list(gem_cells):
        for dx, dy in N4:
            q = (x + dx, y + dy)
            if q not in gem_cells:
                cv.set(q[0], q[1], 'g1')
    cv.pts([(gx, gy - 5), (gx + 4, gy - 1)], 'g3')
    # metal corner caps (gold) on the cover corners
    for (x0, y0, sx, sy) in [(3, 2, 1, 1), (22, 2, -1, 1), (3, 22, 1, -1), (22, 22, -1, -1)]:
        cv.pts([(x0, y0), (x0 + sx, y0), (x0 + 2 * sx, y0), (x0, y0 + sy), (x0, y0 + 2 * sy), (x0 + sx, y0 + sy)], 'g3')
        cv.pts([(x0 + 2 * sx, y0 + sy), (x0 + sx, y0 + 2 * sy), (x0 + 3 * sx, y0), (x0, y0 + 3 * sy)], 'g2')
    # clasp strap + buckle plate on the right edge
    cv.rect(19, 12, 25, 14, 'b2')
    cv.hline(19, 25, 12, 'b3')
    cv.hline(19, 25, 14, 'b1')
    cv.rect(22, 10, 25, 16, 'g2')
    cv.vline(22, 10, 16, 'g3')
    cv.hline(23, 25, 16, 'g1')
    cv.vline(25, 10, 16, 'g1')
    cv.rect(23, 12, 24, 14, 'b1')
    # ribbon bookmark hanging from the pages
    cv.rect(12, 23, 13, 26, 'r2')
    cv.vline(12, 23, 26, 'r3')
    cv.pts([(12, 27), (13, 26)], 'r1')
    cv.set(13, 27, None)
    cv.outline('b1')
    return cv


def cat():
    """Cat face icon; the rows are produced by catexport.py (numpy) and read from catdata.json."""
    import json, os
    d = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'catdata.json')))
    return Cv.from_rows(d['icon'])


ICONS = {'mana': mana, 'health': health, 'journal': journal, 'cat': cat}
