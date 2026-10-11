/* ============================================================================
   rm_furniture.js  -  furniture props of the scholars' library hall (ES5)

   Needs only the page helpers K, R, clamp, bay and rmHalo (rm_common.js).
   Public globals: rmLectern, rmGlobe, rmGlobeDyn, rmOrb, rmBanner, rmFloorStack,
   rmFloorStackDyn.  Private globals: rmFurPen, rmGloCache, rmGloEllipse, rmGloBuild.

   Conventions (all functions)
   - Integer art pixels, palette colours only (K(...)), no antialiasing, deterministic
     (no random or clock calls; the animated ones derive everything from 'now' in ms).
   - Light comes from the upper left: lit edges are on the left/top, shade on the
     right/bottom.  Each prop casts a soft drop shadow made of 50 % ink pixels
     (c.globalAlpha is set to 0.5 for them and the caller's value is restored); these
     are the only translucent pixels.  Everything on the props themselves is opaque
     palette.
   - Props stay quieter than the cat: dark outlines (b1/ink), gold only as thin
     trim or small accents, bright tones (p4, r3, n4, g3) only as 1-2 px accents.
   - Transparent outside their silhouette: draw them over the wall / floor.
   - Every function returns the bounding box it may touch: {x, y, w, h}; nothing is
     painted outside that box (checked over many arguments and times).

   rmLectern(c, x, y)                                         [static]
     Wooden reading lectern: back rail carrying an inkwell with a white quill (right)
     and a rolled scroll with a rolled end and red tie (left), a slanted desk
     (trapezoid, wider at the front) with a big open book (p3 pages with a 1 px p4 lit
     top edge on the left page, text lines b2/b3, red drop cap, r2 ribbon bookmark that
     ends on the lip in a forked tail, gold clasp), a front lip with four brass studs,
     an apron with a carved arcade panel and a turned pedestal on a stepped foot with
     two feet.
     (x,y) = BOTTOM-CENTER on the floor: x is the symmetry column (the body spans
     x-14 .. x+14, lip 29 px wide), y is the lowest solid row (the feet).
     Size 31 x 42 (body 29 x 41; the quill tip is the top row, row y+1 only holds the
     floor shadow).  Returns {x: x-15, y: y-40, w: 31, h: 42}.

   rmGlobe(c, x, y)                                           [static]
     Armillary sphere on a wooden tripod: a meridian ring (circle, radius 9), a flat
     horizon ring and a 25 degree tilted equatorial ring (both ellipses, radii 9 x 4) in
     brass (g2 with g3 on the lit upper-left arcs, a 1 px g1 shadow only under the
     meridian and the front halves; the back halves are plain g2 for depth), a polar
     axis with bright ends, a 7 px earth (n4/n3 lit, only a few n2 pixels, ez glint)
     that no ring covers, and three tiny star dots in open spots of the cage (two p4,
     one ez); hub, two front legs and a rear leg in wood.
     (x,y) = BOTTOM-CENTER on the floor: x symmetry column, y lowest solid row (feet,
     the feet are at x-8 and x+8), row y+1 floor shadow.  Size 25 x 34, the sphere is
     21 px high.  Returns {x: x-12, y: y-32, w: 25, h: 34}.

   rmGlobeDyn(c, x, y, now)                                   [animated, every frame]
     Same (x,y) as rmGlobe, call it AFTER rmGlobe (it draws over it).  A 2 px highlight
     (head p4, tail g3) travels along the tilted equatorial ring, one whole pixel
     every 667 ms (1.5 px/s, the ring is 36 px long: one lap in 24 s).  It skips the
     ring pixels that the earth would cover.  Draws only on ring pixels, inside the
     rmGlobe box.  Returns the rmGlobe box.

   rmOrb(c, x, y, now)                                        [animated, every frame]
     Small floating magical orb, 11 px across (radius 5): ed outline, ey body, ez lit
     upper left, n4 reflected light at the lower right, p4 highlight.  Around it a
     dithered halo (ed r=14 + ey r=9 via rmHalo) that breathes between two densities
     every 2 s, two orbiting sparkles (ez in front, n4 behind, hidden behind the orb)
     and two rising motes (p4 -> ez -> n4, 4 s life).  The orb bobs -1/0/+1 px on a 5 s
     cycle (whole pixels, 2 px range); the halo stays put so the dither does not
     shimmer; sparkles move in 200 ms steps.
     (x,y) = CENTRE of the orb at rest.  Not static: draw it every frame, after the
     wall (it paints opaque dither pixels over whatever is below).  Everything lies
     in x-13 .. x+13, y-13 .. y+13.  Returns {x: x-13, y: y-13, w: 27, h: 27}.

   rmBanner(c, x, y, w, h)                                    [static]
     Heraldic hanging banner: iron rod with two ball finials (gold tip), cloth tabs
     over the rod, gold top band, wine-red cloth (r2 field, r1 shade folds, one
     short r3 highlight in the top 11 rows of a single fold) with two vertical creases,
     one checkered row (r1/r2) at the start of the hem shade and solid r1 below it
     (no other dither), gold side trim, swallowtail hem with gold fringe, and a gold
     sigil: 5-point star over a crescent over an open book (flat bottom, 1 px spine,
     one text dash per page).  (x,y) = TOP-LEFT of the box; w 16..30 (best 20..26,
     clamped), h 40..70 (best 48..60, clamped).  Box = exactly w x h: body is
     (w-1) x (h-1); the last column and the last row hold only the 50 % drop shadow
     (lower right); the lowest solid row is y+h-2.  The sigil (book width 7..13) scales
     with w; the interior is w-9 (w >= 20) or w-7 px wide.
     Returns {x, y, w, h} with the clamped w, h.

   rmFloorStack(c, x, y, seed)                                [static]
     Stack of four tomes: a big spine-out book, a fore-edge-out book, a third closed
     book and an open book on top with a brass dish and an unlit candle stub.  seed
     (optional integer, default 0) picks one of 3 colourways (wine/leather/blue,
     blue/leather/wine, leather/wine/teal).
     (x,y) = BOTTOM-CENTER on the floor, x symmetry column, y lowest solid row, row
     y+1 floor shadow.  Size 23 x 19.  Returns {x: x-11, y: y-17, w: 23, h: 19}.

   rmFloorStackDyn(c, x, y, now)                              [animated, optional]
     Same (x,y) as rmFloorStack, call it AFTER it: a 2 x 3 px flickering flame (f2/
     f3/f4) on the candle stub, changing in whole-pixel steps every 250 ms.  It sits
     just above the rmFloorStack box.  Returns {x: x+3, y: y-20, w: 2, h: 3}.
   ============================================================================ */

/* ---- private helpers (prefix rmFur) ---- */
function rmFurPen(c, ox, oy) {
  var d = {};
  d.p = function (x, y, k) { c.fillStyle = K(k); c.fillRect(ox + x, oy + y, 1, 1); };
  d.r = function (x, y, w, h, k) { if (w > 0 && h > 0) { c.fillStyle = K(k); c.fillRect(ox + x, oy + y, w, h); } };
  d.spr = function (x, y, rows, map) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j].charAt(i);
      if (ch !== '.' && ch !== ' ') d.p(x + i, y + j, map[ch]);
    }
  };
  d.sh = function (x, y, w, h) {
    var a0 = c.globalAlpha;
    c.globalAlpha = 0.5; c.fillStyle = K('ink'); c.fillRect(ox + x, oy + y, w, h); c.globalAlpha = a0;
  };
  return d;
}

/* ===================== rmLectern ===================== */
function rmLectern(c, x, y) {
  var d = rmFurPen(c, x - 15, y - 40), lx, ly, i, dp;
  var wood = { o: 'b1', a: 'b2', b: 'b3', c: 'b4' };

  /* floor shadow */
  d.sh(5, 41, 22, 1); d.sh(24, 40, 5, 1);

  /* base, pedestal (rows 31..40) */
  d.spr(0, 31, [
    '........ocbbbbbbbbbbbao........',
    '............ocbbbao............',
    '..........ocbbbbbbaao..........',
    '..........ocbbbbbaaao..........',
    '...........obbbbbaao...........',
    '.............obbao.............',
    '.........ocbbbbbbbbbao.........',
    '......occbbbbbbbbbbbbbaao......',
    '......obbbbbbbbbbbbbbbaao......',
    '......oaao...........oaao......'
  ], wood);

  /* desk lip + carved panel (rows 21..30) */
  d.spr(0, 21, [
    '.occccccccccccccccccccccccccco.',
    '.obbbbbbbbbbbbbbbbbbbbbbbbbaao.',
    '.ooooooooooooooooooooooooooooo.',
    '.....oaaaaaaaaaaaaaaaaaaao.....',
    '.....ocbbbbbbbbbbbbbbbbbao.....',
    '.....ocbbooooooooooooobbao.....',
    '.....ocbboaaaaaaaaaaabbbao.....',
    '.....ocbboaaaaaaaaaaabbbao.....',
    '.....ocbbocccccccccccbbbao.....',
    '.....oaaaaaaaaaaaaaaaaaaao.....'
  ], wood);
  /* carved motif in the panel */
  for (i = 11; i <= 19; i += 4) { d.p(i, 27, 'b4'); d.p(i - 1, 28, 'b4'); d.p(i + 1, 28, 'b3'); d.p(i, 28, 'b1'); }
  /* brass studs on the lip */
  d.p(3, 22, 'g2'); d.p(11, 22, 'g2'); d.p(19, 22, 'g1'); d.p(27, 22, 'g1');

  /* rail (rows 7..9) */
  d.r(4, 7, 23, 1, 'b1');
  d.r(3, 8, 1, 2, 'b1'); d.r(27, 8, 1, 2, 'b1');
  d.r(4, 8, 23, 1, 'b4'); d.r(4, 9, 22, 1, 'b3'); d.p(26, 9, 'b2');

  /* slanted desk top: a trapezoid, wider at the front (rows 10..20) */
  for (ly = 10; ly <= 20; ly++) {
    var xo = 3 - Math.round((ly - 10) * 0.2);
    d.p(xo, ly, 'b1'); d.p(30 - xo, ly, 'b1');
    d.r(xo + 1, ly, 29 - 2 * xo, 1, 'b3');
    d.p(xo + 1, ly, 'b4'); d.p(29 - xo, ly, 'b2');
  }
  d.r(4, 10, 23, 1, 'b2');

  /* ---- open book ---- */
  function dip(l) { return Math.abs(l - 15) <= 1 ? 1 : 0; }
  for (lx = 5; lx <= 25; lx++) {
    dp = dip(lx);
    var top = 10 + dp, bot = 17 + dp, dl = Math.abs(lx - 15), pc;
    for (ly = top; ly <= bot; ly++) {
      if (lx === 15) pc = 'p1';
      else if (dl === 1 || lx === 25) pc = 'p2';
      else pc = (lx < 15 && ly === top && lx >= 6) ? 'p4' : 'p3';   /* p4 only as the 1 px lit top edge of the left page */
      d.p(lx, ly, pc);
    }
    d.p(lx, bot + 1, 'p2'); d.p(lx, bot + 2, 'r1');
  }
  d.r(4, 10, 1, 9, 'r2'); d.p(4, 19, 'r1'); d.r(26, 10, 1, 10, 'r1');
  var TXT = { L: ['..xxx.xx', 'xxxx.xxx', 'xx.xxxx.'], R: ['.xxxx.xx', 'xxx.xxxx', 'xxxx.xx.'] };
  for (i = 0; i < 3; i++) {
    var ty = 12 + 2 * i;
    for (var k = 0; k < 8; k++) {
      var cl = 6 + k, cr = 17 + k;
      if (TXT.L[i].charAt(k) === 'x') d.p(cl, ty + dip(cl), i === 0 ? 'b2' : 'b3');
      if (TXT.R[i].charAt(k) === 'x') d.p(cr, ty + dip(cr), i === 0 ? 'b2' : 'b3');
    }
  }
  d.r(6, 12, 2, 2, 'r2');
  /* ribbon + clasp */
  d.r(15, 11, 1, 11, 'r2'); d.p(14, 22, 'r2'); d.p(16, 22, 'r1');          /* ribbon ends on the lip with a forked tail */
  d.spr(26, 14, ['ab', 'bc', 'bc'], { a: 'g3', b: 'g2', c: 'g1' });

  /* ---- scroll (left of the rail): rolled end at the left, red tie ---- */
  d.spr(4, 4, [
    '.xwWwwwrwwx',
    'yWxwwwwrwwx',
    'yxxxxxxsxxy',
    '.yyyyyyyyy.'
  ], { W: 'p4', w: 'p3', x: 'p2', y: 'p1', r: 'r2', s: 'r1' });

  /* ---- inkwell + quill (right of the rail) ---- */
  d.spr(22, 4, [
    '.sss.',
    '.okk.',
    'oabbo',
    'oaaao'
  ], { s: 's2', o: 'ink', k: 'st', a: 'b1', b: 'b3' });
  d.spr(23, 0, [
    '....ws',
    '...wxs',
    '..wxs.',
    '.wxs..',
    'wx....'
  ], { w: 'p4', x: 'p2', s: 's4' });
  return { x: x - 15, y: y - 40, w: 31, h: 42 };
}

/* ===================== armillary sphere ===================== */
var rmGloCache = null;

/* closed 8-connected pixel path of a (rotated) ellipse; every point carries the
   outward normal (nx,ny), a light term lit (1 = faces the light at the upper left)
   and the local parameter t. */
function rmGloEllipse(cx, cy, rx, ry, phiDeg) {
  var phi = phiDeg * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi), N = 720, pts = [], i, last = null;
  for (i = 0; i < N; i++) {
    var t = i * 2 * Math.PI / N, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    var px = Math.round(cx + ex * cp - ey * sp), py = Math.round(cy + ex * sp + ey * cp);
    if (!last || last.x !== px || last.y !== py) {
      var nxl = Math.cos(t) / rx, nyl = Math.sin(t) / ry;
      var nx = nxl * cp - nyl * sp, ny = nxl * sp + nyl * cp, nl = Math.sqrt(nx * nx + ny * ny) || 1;
      last = { x: px, y: py, t: t, lit: -(nx + ny) / (nl * 1.4142) };
      pts.push(last);
    }
  }
  if (pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) pts.pop();
  var out = [], prev = null, n = pts.length;
  for (i = 0; i < n; i++) {
    var b = pts[i], e = pts[(i + 1) % n];
    if (prev && Math.abs(prev.x - e.x) === 1 && Math.abs(prev.y - e.y) === 1 &&
        Math.abs(prev.x - b.x) + Math.abs(prev.y - b.y) === 1 && Math.abs(e.x - b.x) + Math.abs(e.y - b.y) === 1) continue;
    out.push(b); prev = b;
  }
  return out;
}

function rmGloBuild() {
  if (rmGloCache) return rmGloCache;
  var cx = 12, cy = 10;
  rmGloCache = {
    cx: cx, cy: cy,
    mer: rmGloEllipse(cx, cy, 9, 9, 0),
    hor: rmGloEllipse(cx, cy, 9, 4, 0),
    ecl: rmGloEllipse(cx, cy, 9, 4, 25),
    /* the 7 x 7 earth, top-left at (cx-3, cy-3): n4 lit rim, ez glint, n3 body, few n2 */
    earth: [
      '..433..',
      '.4z333.',
      '4433333',
      '4333333',
      '3333332',
      '.33332.',
      '..3322.'
    ]
  };
  return rmGloCache;
}

function rmGlobe(c, x, y) {
  var G = rmGloBuild(), d = rmFurPen(c, x - 12, y - 32), i, p, cx = G.cx, cy = G.cy;
  var wood = { o: 'b1', a: 'b2', b: 'b3', c: 'b4', g: 'g2', h: 'g3', i: 'g1' };
  var occ = {};
  function mark(l) { for (var k = 0; k < l.length; k++) occ[l[k].x + ',' + l[k].y] = 1; }
  mark(G.mer); mark(G.hor); mark(G.ecl);

  /* floor shadow */
  d.sh(4, 33, 19, 1); d.sh(22, 32, 3, 1);

  /* ---- tripod: rear leg, front legs, brace, hub ---- */
  d.r(11, 25, 4, 5, 'b1'); d.r(12, 25, 2, 5, 'b2'); d.r(12, 25, 1, 5, 'b3'); d.r(11, 30, 4, 1, 'b1');
  var LX = [10, 9, 8, 7, 6, 5, 4, 4];
  for (var k = 0; k < LX.length; k++) {
    var ly = 25 + k, lxL = LX[k], lxR = 24 - lxL;
    d.p(lxL - 1, ly, 'b1'); d.p(lxL, ly, 'b4'); d.p(lxL + 1, ly, 'b3');
    d.p(lxR + 1, ly, 'b1'); d.p(lxR, ly, 'b3'); d.p(lxR - 1, ly, 'b2');
  }
  d.p(3, 32, 'b1'); d.p(21, 32, 'b1'); d.p(4, 32, 'b1'); d.p(20, 32, 'b1');
  d.spr(9, 21, [
    '.ihhgi.',
    '..ocbo.',
    '.ocbbao',
    '.obbaao',
    '..oaao.'
  ], wood);

  /* ---- sphere: back halves, axis, earth, front halves ---- */
  /* shadow: 1 px g1 to the lower right (only for the meridian and the front halves);
     lit: g3 on the upper-left arcs, otherwise g2.  Back halves are plain g2 (depth). */
  function ring(list, shadow, lit) {
    var k, q;
    if (shadow) for (k = 0; k < list.length; k++) { q = list[k]; if (!occ[(q.x + 1) + ',' + (q.y + 1)]) d.p(q.x + 1, q.y + 1, 'g1'); }
    for (k = 0; k < list.length; k++) { q = list[k]; d.p(q.x, q.y, lit && q.lit > 0.5 ? 'g3' : 'g2'); }
  }
  function half(list, test) {
    var out = [];
    for (var j = 0; j < list.length; j++) if (test(list[j])) out.push(list[j]);
    return out;
  }
  var back = function (q) { return Math.sin(q.t) < 0; }, front = function (q) { return Math.sin(q.t) >= 0; };
  ring(G.mer, true, true); ring(half(G.hor, back), false, false); ring(half(G.ecl, back), false, false);
  /* polar axis (no shadow: thin and diagonal) */
  var ax0 = [8, 20], ax1 = [16, 0], steps = 20;
  for (i = 0; i <= steps; i++) {
    p = [Math.round(ax0[0] + (ax1[0] - ax0[0]) * i / steps), Math.round(ax0[1] + (ax1[1] - ax0[1]) * i / steps)];
    d.p(p[0], p[1], (i < 2 || i > steps - 2) ? 'g3' : 'g2');
  }
  /* earth: 7 x 7 sphere, lit from the upper left; shade side n3 with only a few n2 pixels */
  d.spr(cx - 3, cy - 3, G.earth, { '4': 'n4', 'z': 'ez', '3': 'n3', '2': 'n2' });
  ring(half(G.hor, front), true, true); ring(half(G.ecl, front), true, true);
  /* star dots: two p4 and one ez, on empty pixels between the rings (never on a ring pixel) */
  var st = [[16, 5, 'p4'], [11, 17, 'p4'], [7, 9, 'ez']];
  for (i = 0; i < st.length; i++) if (!occ[st[i][0] + ',' + st[i][1]]) d.p(st[i][0], st[i][1], st[i][2]);
  return { x: x - 12, y: y - 32, w: 25, h: 34 };
}

function rmGlobeDyn(c, x, y, now) {
  var G = rmGloBuild(), L = G.ecl, n = L.length;
  var idx = Math.floor(now * 3 / 2000) % n, ox = x - 12, oy = y - 32;
  var h = L[idx], t = L[(idx + n - 1) % n];
  /* a back-half pixel covered by the earth sprite is not lit */
  function ok(q) {
    if (Math.sin(q.t) >= 0) return true;
    var ex = q.x - (G.cx - 3), ey = q.y - (G.cy - 3);
    return !(ey >= 0 && ey < 7 && ex >= 0 && ex < 7 && G.earth[ey].charAt(ex) !== '.');
  }
  if (ok(t)) R(c, ox + t.x, oy + t.y, 1, 1, K('g3'));
  if (ok(h)) R(c, ox + h.x, oy + h.y, 1, 1, K('p4'));
  return { x: ox, y: oy, w: 25, h: 34 };
}

/* ===================== rmOrb ===================== */
function rmOrb(c, x, y, now) {
  var TAU = Math.PI * 2, i;
  var bob = Math.round(Math.sin(TAU * now / 5000));
  var lvl = Math.sin(TAU * now / 4000 + 0.8) > 0 ? 1 : 0;
  var cy = y + bob;
  /* halo: fixed centre (only the orb bobs), two dither densities */
  rmHalo(c, x, y, 14, K('ed'), lvl ? 1.5 : 1.15);
  rmHalo(c, x, y, 9, K('ey'), lvl ? 1.5 : 1.1);

  var tq = Math.floor(now / 200) * 200;               /* sparkles move in 200 ms steps */
  function orbiter(rx, ry, phiDeg, per, ph, front) {
    var a = TAU * tq / per + ph, phi = phiDeg * Math.PI / 180, ex = rx * Math.cos(a), ey = ry * Math.sin(a);
    var dx = Math.round(ex * Math.cos(phi) - ey * Math.sin(phi)), dy = Math.round(ex * Math.sin(phi) + ey * Math.cos(phi));
    var isFront = Math.sin(a) >= 0;
    if (isFront !== front) return;
    if (!isFront && dx * dx + dy * dy <= 20) return;     /* hidden behind the orb */
    R(c, x + dx, cy + dy, 1, 1, K(isFront ? 'ez' : 'n4'));
  }
  orbiter(9, 3, -25, 15000, 0, false);
  orbiter(7, 2.4, 30, 20000, 2.4, false);

  /* orb: disc of radius 5 (11 px), light from the upper left */
  var r = 5, dx, dy, k, inD = function (ax, ay) { return ax * ax + ay * ay <= r * r + r; };
  for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
    if (!inD(dx, dy)) continue;
    if (!inD(dx - 1, dy) || !inD(dx + 1, dy) || !inD(dx, dy - 1) || !inD(dx, dy + 1)) { k = 'ed'; }
    else {
      var b2 = (-dx * 0.62 - dy * 0.78) / r, rad = Math.sqrt(dx * dx + dy * dy);
      if (b2 > 0.5 || (b2 > 0.38 && bay(x + dx, cy + dy) < 0.5)) k = 'ez';
      else if (b2 < -0.28 && rad > 2.6) k = (b2 < -0.4 || bay(x + dx, cy + dy) < 0.5) ? 'n4' : 'ey';
      else k = 'ey';
    }
    R(c, x + dx, cy + dy, 1, 1, K(k));
  }
  R(c, x - 2, cy - 2, 2, 1, K('p4')); R(c, x - 2, cy - 1, 1, 1, K('p4'));

  orbiter(9, 3, -25, 15000, 0, true);
  orbiter(7, 2.4, 30, 20000, 2.4, true);
  /* two rising motes */
  var motes = [[0, -2], [2000, 3]];
  for (i = 0; i < 2; i++) {
    var u = ((tq + motes[i][0]) % 4000) / 4000;
    if (u >= 0.92) continue;
    var my = cy - 6 - Math.round(u * 6), mx = x + motes[i][1] + Math.round(Math.sin(u * TAU * 1.5 + i * 2) * 1.6);
    R(c, mx, my, 1, 1, K(u < 0.3 ? 'p4' : u < 0.6 ? 'ez' : 'n4'));
  }
  return { x: x - 13, y: y - 13, w: 27, h: 27 };
}

/* ===================== rmBanner ===================== */
function rmBanner(c, x, y, w, h) {
  w = clamp(Math.round(w), 16, 30); h = clamp(Math.round(h), 40, 70);
  var M = {}, i, j, lx, ly;
  function P(px, py, k) {
    if (px < 0 || py < 0 || px > w - 2 || py > h - 2) return;
    c.fillStyle = K(k); c.fillRect(x + px, y + py, 1, 1); M[px + ',' + py] = 1;
  }
  function S(px, py, rows, map) {
    for (var b = 0; b < rows.length; b++) for (var a = 0; a < rows[b].length; a++) {
      var ch = rows[b].charAt(a); if (ch !== '.') P(px + a, py + b, map[ch]);
    }
  }
  var m = w >= 20 ? 3 : 2, cl = m, cw = w - 1 - 2 * m; if (cw % 2 === 0) cw--;
  var cr = cl + cw - 1, mid = cl + (cw - 1) / 2, half = (cw - 1) / 2;
  var tw = cw >= 15 ? 2 : 1, iw = cw - 2 * tw, B = h - 4, topY = 3;
  var dn = clamp(Math.round(cw * 0.42), 4, 9);
  function yb(col) { return B - Math.round(dn * (1 - Math.abs(col - mid) / half)); }
  var span0 = 7, span1 = yb(mid);
  /* fold map over the interior columns: 0 lit, 1 base, 2 shade */
  var fold = [], cr1 = Math.round(iw * 0.3), cr2 = Math.round(iw * 0.72);
  for (i = 0; i < iw; i++) fold[i] = 1;
  fold[0] = 0;
  for (j = 0; j < 2; j++) {
    var cc = j ? cr2 : cr1;
    if (cc - 1 >= 0) fold[cc - 1] = 0;
    fold[cc] = 2; if (cc + 1 < iw) fold[cc + 1] = 2;
  }
  var bw = Math.min(13, iw - 2); if (bw % 2 === 0) bw--; bw = Math.max(bw, 5);
  var hw = (bw - 1) / 2, withMoon = iw >= 9, sigH = withMoon ? 18 : 6;
  var sy = span0 + Math.round((span1 - span0 - sigH) * 0.4) + 1;
  var z0 = Math.max(span0 + Math.round((B - span0) * 0.62), sy + sigH + 1);   /* hem shade starts here */
  /* cloth colours per fold type (0 lit, 1 base, 2 shade) above / below the shade line.
     Only ONE lit fold (the one in front of the first crease) carries the bright r3
     highlight, and only for its top 11 rows; every other lit fold is plain r2. */
  var UP = ['r2', 'r2', 'r1'], LO = ['r2', 'r1', 'r1'];
  var hiFold = cr1 - 1 >= 0 ? cr1 - 1 : 0, hiEnd = span0 + 10;

  for (var col = cl; col <= cr; col++) {
    var xc = col - cl, bottom = yb(col);
    for (ly = topY; ly <= bottom; ly++) {
      var k;
      if (ly === 3) k = 'r1';
      else if (ly === 4) k = (xc % 4 === 1) ? 'g3' : 'g2';
      else if (ly === 5) k = 'g1';
      else if (ly === 6) k = 'r1';
      else if (xc < tw) k = xc === 0 ? 'g2' : 'r1';
      else if (xc >= cw - tw) k = xc === cw - 1 ? 'g1' : 'r1';
      else {
        var f = fold[xc - tw], tz = ly - z0;
        if (tz < 0) k = (xc - tw === hiFold && ly <= hiEnd) ? 'r3' : UP[f];
        else if (tz === 0) k = f === 1 ? (((col + ly) & 1) ? 'r1' : 'r2') : LO[f];   /* one clean checker row */
        else k = LO[f];
      }
      if (ly === bottom && ly > 6) k = 'g2';
      P(col, ly, k);
    }
    if (xc % 2 === 0) { P(col, bottom + 1, 'g2'); P(col, bottom + 2, 'g3'); }
  }
  /* rod, loops, finials */
  for (lx = 2; lx <= w - 4; lx++) { P(lx, 1, 's2'); P(lx, 2, 's1'); }
  for (lx = cl + 1; lx + 1 <= cr; lx += 5) { P(lx, 2, 'r2'); P(lx + 1, 2, 'r1'); }
  var fin = ['.g.', 'hmd', 'mmd', '.d.'], fm = { g: 'g2', h: 's3', m: 's2', d: 's1' };
  S(0, 0, fin, fm); S(w - 4, 0, fin, fm);

  /* sigil: 5-point star over a crescent bowl, above an open book */
  if (withMoon) {
    S(mid - 2, sy, [
      '..3..',
      '..3..',
      '33333',
      '.333.',
      '.3.3.'
    ], { '3': 'g3' });
    S(mid - 3, sy + 6, [
      '3.....3',
      '32...23',
      '.33333.',
      '..222..'
    ], { '3': 'g3', '2': 'g2' });
    sy += 12;
  }
  /* open book: shallow V top edge (spine 1 px lower), flat bottom, 1 px spine, one text dash per page */
  var dipW = Math.max(1, Math.floor(hw / 3));
  for (var dx = -hw; dx <= hw; dx++) {
    var ad = Math.abs(dx), ty = ad <= dipW ? 1 : 0, bt = 4, px = mid + dx;
    if (dx === 0) { for (ly = ty; ly <= bt; ly++) P(px, sy + ly, 'g1'); continue; }
    for (ly = ty; ly < bt; ly++) P(px, sy + ly, 'g3');
    if (ad >= 2 && ad <= hw - 1) P(px, sy + 2, 'g2');
    P(px, sy + bt, 'g1');
    if (ad === hw) for (ly = ty + 1; ly < bt; ly++) P(px, sy + ly, 'g2');
  }

  /* drop shadow on the wall: 1 px to the lower right */
  var a0 = c.globalAlpha;
  c.globalAlpha = 0.5; c.fillStyle = K('ink');
  for (var key in M) {
    var q = key.split(','), sx = +q[0] + 1, sy2 = +q[1] + 1;
    if (sx > w - 1 || sy2 > h - 1 || M[sx + ',' + sy2]) continue;
    c.fillRect(x + sx, y + sy2, 1, 1);
  }
  c.globalAlpha = a0;
  return { x: x, y: y, w: w, h: h };
}

/* ===================== rmFloorStack ===================== */
function rmFloorStack(c, x, y, seed) {
  var d = rmFurPen(c, x - 11, y - 17), i;
  var ways = [
    [{ hi: 'r2', mid: 'r1', lo: 'ink', band: 'g2' }, { hi: 'b4', mid: 'b3', lo: 'b1' }, { hi: 'n3', mid: 'n2', lo: 'ink', band: 'g2' }],
    [{ hi: 'n3', mid: 'n2', lo: 'ink', band: 'g2' }, { hi: 'b4', mid: 'b3', lo: 'b1' }, { hi: 'r2', mid: 'r1', lo: 'ink', band: 'g2' }],
    [{ hi: 'b4', mid: 'b3', lo: 'b1', band: 'g2' }, { hi: 'r2', mid: 'r1', lo: 'ink' }, { hi: 'ey', mid: 'ed', lo: 'ink', band: 'g3' }]
  ];
  var cw = ways[((seed | 0) % 3 + 3) % 3];
  /* floor shadow */
  d.sh(2, 18, 20, 1); d.sh(22, 17, 1, 1);
  function spineBook(x0, x1, y0, y1, cv, plate) {
    d.r(x0, y0, x1 - x0 + 1, y1 - y0 + 1, cv.mid);
    d.r(x0, y0, x1 - x0 + 1, 1, cv.hi);
    d.r(x0, y1, x1 - x0 + 1, 1, cv.lo);
    d.r(x0, y0 + 1, 1, y1 - y0 - 1, cv.hi); d.r(x1, y0 + 1, 1, y1 - y0, cv.lo);
    if (cv.band) {
      d.r(x0 + 3, y0 + 1, 1, y1 - y0 - 1, cv.band); d.r(x1 - 3, y0 + 1, 1, y1 - y0 - 1, cv.band);
      if (plate) { var cxm = Math.round((x0 + x1) / 2); d.r(cxm - 2, y0 + 1, 5, 2, cv.band); d.p(cxm - 1, y0 + 2, cv.lo); d.p(cxm + 1, y0 + 2, cv.lo); }
    }
  }
  function edgeBook(x0, x1, y0, y1, cv) {
    d.r(x0, y0, x1 - x0 + 1, 1, cv.hi);
    for (var yy = y0 + 1; yy < y1; yy++) d.r(x0 + 1, yy, x1 - x0 - 1, 1, (yy - y0) % 2 ? 'p3' : 'p2');
    d.r(x0, y1, x1 - x0 + 1, 1, cv.lo);
    d.r(x0, y0 + 1, 1, y1 - y0 - 1, cv.mid); d.r(x1, y0 + 1, 1, y1 - y0 - 1, cv.mid);
    d.p(x1, y1 - 1, cv.lo);
  }
  spineBook(1, 21, 13, 17, cw[0], true);
  edgeBook(3, 19, 9, 12, cw[1]);
  spineBook(4, 17, 6, 8, cw[2], false);
  /* open book on top */
  d.r(4, 3, 7, 1, 'p4'); d.r(11, 3, 7, 1, 'p3');
  d.r(4, 4, 7, 1, 'p3'); d.r(11, 4, 7, 1, 'p2');
  d.r(3, 5, 16, 1, 'r1'); d.p(11, 3, 'p1'); d.p(11, 4, 'p1');
  d.p(5, 4, 'b3'); d.p(6, 4, 'b3'); d.p(8, 4, 'b3'); d.p(13, 4, 'b3'); d.p(15, 4, 'b3');
  /* candle stub in a brass dish */
  d.r(13, 2, 5, 1, 'g2'); d.p(13, 2, 'g3'); d.p(17, 2, 'g1');
  d.r(14, 0, 2, 2, 'p3'); d.p(14, 0, 'p4'); d.p(15, 1, 'p2'); d.p(15, 0, 'b1');
  return { x: x - 11, y: y - 17, w: 23, h: 19 };
}

/* flame for the candle stub of rmFloorStack (optional, call every frame) */
function rmFloorStackDyn(c, x, y, now) {
  var ox = x - 11, oy = y - 17, v = Math.floor(now / 250) % 7;      /* a calm 250 ms step */
  var h = (v * 5 + 3) % 3;
  R(c, ox + 14, oy - 1, 2, 1, K('f3'));
  if (h === 0) { R(c, ox + 14, oy - 2, 1, 1, K('f4')); R(c, ox + 15, oy - 2, 1, 1, K('f3')); R(c, ox + 15, oy - 3, 1, 1, K('f2')); }
  else if (h === 1) { R(c, ox + 14, oy - 2, 1, 1, K('f3')); R(c, ox + 15, oy - 2, 1, 1, K('f4')); R(c, ox + 14, oy - 3, 1, 1, K('f2')); }
  else { R(c, ox + 14, oy - 2, 2, 1, K('f4')); R(c, ox + 14 + (v & 1), oy - 3, 1, 1, K('f2')); }
  return { x: ox + 14, y: oy - 3, w: 2, h: 3 };
}
