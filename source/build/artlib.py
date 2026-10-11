"""Small pixel-art toolkit: palette, legend, canvas, helpers."""
from collections import deque

PALETTE = {
    'ink': '#0b0e16', 'st': '#151b28',
    's1': '#1e2535', 's2': '#46536c', 's3': '#8895ae', 's4': '#cfd8e8',
    'n1': '#0e2644', 'n2': '#12355b', 'n3': '#2b64b3', 'n4': '#5ea4f0',
    'g1': '#7a5416', 'g2': '#b8892b', 'g3': '#e2b957',
    'p1': '#a88a58', 'p2': '#d3ba84', 'p3': '#ecdca8', 'p4': '#faf1cf',
    'b1': '#2b180c', 'b2': '#5a361b', 'b3': '#82522a', 'b4': '#ad7640',
    'r1': '#5c0f18', 'r2': '#a8232b', 'r3': '#e4504a',
    # cat: golden-shaded coat ramp, teal eyes, pink nose and ears
    'f0': '#6b3216', 'f1': '#a65a26', 'f2': '#d1823c', 'f3': '#ebaa5e', 'f4': '#f8d391',
    'ey': '#2fb2a4', 'ed': '#0f6f6e', 'ez': '#8fe6d6', 'pk': '#e68f88',
}

# character -> palette key (cover roles co/cd/cm/ch are remapped per tome colorway)
LEGEND = {
    '#': 'ink', '~': 'st',
    '1': 's1', '2': 's2', '3': 's3', '4': 's4',
    'a': 'n1', 'b': 'n2', 'c': 'n3', 'd': 'n4',
    'e': 'g1', 'f': 'g2', 'g': 'g3',
    'h': 'p1', 'i': 'p2', 'j': 'p3', 'k': 'p4',
    'l': 'b1', 'm': 'b2', 'n': 'b3', 'o': 'b4',
    'p': 'r1', 'q': 'r2', 'r': 'r3',
    's': 'f0', 't': 'f1', 'u': 'f2', 'v': 'f3', 'w': 'f4',
    'x': 'ey', 'y': 'ed', 'z': 'ez', 'A': 'pk',
    'W': 'co', 'X': 'cd', 'Y': 'cm', 'Z': 'ch',
}
KEY2CH = {v: k for k, v in LEGEND.items()}

TOME_COLORWAYS = [
    # wine red, indigo, bronze, slate (fixed order, decoration only)
    {'co': 'b1', 'cd': 'r1', 'cm': 'r2', 'ch': 'r3'},
    {'co': 'ink', 'cd': 'n1', 'cm': 'n2', 'ch': 'n3'},
    {'co': 'b1', 'cd': 'b2', 'cm': 'b3', 'ch': 'b4'},
    {'co': 'ink', 'cd': 's1', 'cm': 's2', 'ch': 's3'},
]

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


class Cv:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [[None] * w for _ in range(h)]

    # --- basic drawing -------------------------------------------------
    def set(self, x, y, k):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = k

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.g[y][x]
        return None

    def rect(self, x0, y0, x1, y1, k):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, k)

    def hline(self, x0, x1, y, k):
        for x in range(x0, x1 + 1):
            self.set(x, y, k)

    def vline(self, x, y0, y1, k):
        for y in range(y0, y1 + 1):
            self.set(x, y, k)

    def pts(self, pts, k):
        for (x, y) in pts:
            self.set(x, y, k)

    def stamp(self, other, ox, oy, over=True):
        for y in range(other.h):
            for x in range(other.w):
                k = other.g[y][x]
                if k is not None:
                    if over or self.get(x + ox, y + oy) is None:
                        self.set(x + ox, y + oy, k)

    def outline(self, key_for, skip=()):
        """Add a 1px outline on empty pixels 4-adjacent to filled ones.
        key_for: str or function(neighbor_key) -> outline key."""
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.g[y][x] is not None:
                    continue
                nk = None
                for dx, dy in N4:
                    k = self.get(x + dx, y + dy)
                    if k is not None and k not in skip:
                        nk = k
                        break
                if nk is not None:
                    add.append((x, y, key_for(nk) if callable(key_for) else key_for))
        for x, y, k in add:
            self.g[y][x] = k

    def mirror_x(self):
        c = Cv(self.w, self.h)
        for y in range(self.h):
            c.g[y] = list(reversed(self.g[y]))
        return c

    def rows(self):
        out = []
        for y in range(self.h):
            out.append(''.join('.' if k is None else KEY2CH[k] for k in self.g[y]))
        return out

    @staticmethod
    def from_rows(rows):
        h = len(rows)
        w = len(rows[0])
        c = Cv(w, h)
        for y, r in enumerate(rows):
            assert len(r) == w, ('row length mismatch', y, len(r), w)
            for x, ch in enumerate(r):
                c.g[y][x] = None if ch == '.' else LEGEND[ch]
        return c


def mask_from_halfs(w, halfs, cx=None):
    """Symmetric silhouette from per-row half widths. Center is between columns w/2-1 and w/2."""
    h = len(halfs)
    m = [[False] * w for _ in range(h)]
    c = w // 2
    for y, hw in enumerate(halfs):
        for x in range(c - hw, c + hw):
            if 0 <= x < w:
                m[y][x] = True
    return m


def dist_map(mask):
    h, w = len(mask), len(mask[0])
    INF = 10 ** 6
    d = [[0 if not mask[y][x] else INF for x in range(w)] for y in range(h)]
    q = deque()
    for y in range(h):
        for x in range(w):
            if mask[y][x]:
                for dx, dy in N4:
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or not mask[ny][nx]:
                        d[y][x] = 1
                        q.append((x, y))
                        break
    while q:
        x, y = q.popleft()
        for dx, dy in N4:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and d[ny][nx] > d[y][x] + 1:
                d[ny][nx] = d[y][x] + 1
                q.append((nx, ny))
    return d


def check_rows(name, rows):
    w = len(rows[0])
    for i, r in enumerate(rows):
        assert len(r) == w, (name, 'row', i, 'len', len(r), 'expected', w)
        for ch in r:
            assert ch == '.' or ch in LEGEND, (name, 'bad char', ch)
