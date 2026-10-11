/* ============================================================================
   rm_light.js  -  candlelight props for the scholars' library hall (ES5)
   Uses only the page helpers K, R, clamp, bay (plus c.getImageData / c.canvas to read
   the surface under a halo, see "surface aware").  Light comes from the candles
   (warm, from above); lit edges are on the top / left, shade on the bottom / right.
   Only palette colours, only whole pixels, no alpha, deterministic (static functions
   depend only on their arguments and on the pixels they cover, animated ones only on
   now and seed).  Public globals: rmCandelabra, rmSconce, rmChandelier, rmFlame,
   rmFlames, rmGlowStatic, rmLightPool, rmGlowFlicker.  Private helpers are all named
   rmLt* (plus the function properties rmLtShapes.t, rmLtLadder.t, rmLtRgb.t,
   rmLtRingPut.t / .n, the small ring cache of rmGlowFlicker).

   Conventions
   - Integer art pixels, (0,0) = canvas top-left.  Props are transparent outside
     their silhouette: draw them over wall / floor.  Every static prop paints
     only inside the box it documents and returns that box as box:{x,y,w,h}.
   - FLAME ANCHOR {x,y}: where rmFlame is called.  x = the centre column of the
     flame, y = the LOWEST row of the flame.  The prop has already drawn the wick
     one pixel below (row y+1) and its candle's top row is y+2.  rmFlame draws
     columns x-1..x+1, rows y-5..y (so the flame is a 3 x 6 sprite).
   - Order in the scene:  rmGlowStatic / rmLightPool (baked into wall and floor, over
     whatever is there)  ->  props  ->  per frame: rmGlowFlicker, then rmFlame (flames
     last, they are the brightest pixels).  Bake the glow before the props: the glow
     does not know about props, it only knows about the pixels that are there.
   - Candles and flames are the brightest things in the hall, so the candle wax is kept
     one step below the cat's highlights: p4 only on the centre pixel of a candle's top
     row and in the flame core; the bodies are p3 (lit left column) / p2 / p1 and the
     bases p1 / b4 / b3.

   Surface aware (rmGlowStatic, rmLightPool, rmGlowFlicker, the candelabra's contact
   shadow).  They read the pixels they are about to cover with ONE getImageData per
   call (never per frame; a canvas that cannot be read, or a transparent one, counts
   as an unknown dark surface) and behave like light on a surface:
   - lines survive: near-black pixels (ink grout, mortar, outlines), every 1 px line
     that is darker than both neighbours across it (plank seams, skirting line,
     cracks) and the junctions of such lines are never overwritten, so a seam runs
     unbroken through a halo;
   - light only lightens: a dither pixel is drawn only when its colour is clearly
     lighter (8+ luminance steps) than the pixel it lands on, so highlights and lit
     edges are never dulled;
   - the ladder follows the surface: dark surfaces (stone wall, dark floor) get b2
     dots at the faint end, lighter ones (b2 planks) get g1 dots, so the halo is
     visible, with the same shape, on a blue wall, a dark floor and a mid brown floor.
   Limits: the surface is judged pixel by pixel, a prop pixel of exactly the colour of
   the surface under it cannot be told from the surface.

   ---------------------------------------------------------------------------
   rmCandelabra(c, x, y)                                           [static]
     Wrought-iron floor candelabra: stepped iron foot, stem with brass beads and
     collar, two curving 2 px arms, three brass cups, three cream pillar candles
     (melted tops, drips, wax spills), and a soft contact shadow (50 % dither of b1,
     or ink on a dark floor, beside the foot outline and in the row below it; the
     foot's own outline row stays solid).
     (x,y) = BOTTOM-CENTER: x = centre column, y = the lowest solid row of the
     foot.  Occupies columns x-11..x+11 and rows y-40..y+2 (row y+1 is the foot's
     outline, row y+2 the shadow); the flames add rows y-46..y-41, so with flames
     the box is x-11..x+11 by y-46..y+2 = 23 x 49.
     Returns {flames:[left, centre, right] each {x,y}, box:{x,y,w,h}} (box with
     flames).  Centre flame base = y-41, side flames y-34 / y-35.

   rmSconce(c, x, y)                                               [static]
     Wall sconce: tall oval iron wall plaque (warmed near the candle by g1 / b3
     dither), a wider brass ledge, a short candle with melted top.
     (x,y) = TOP-CENTER of the bracket = the top row of the candle (wick at row
     y-1).  Body: columns x-5..x+5, rows y-1..y+13 (11 wide; the last row is
     only the outline).  The flame sits above: rows y-7..y-2.
     Returns {flames:[{x:x, y:y-2}], box:{x:x-5, y:y-7, w:11, h:21}}.

   rmChandelier(c, x, y, w)                                        [static]
     Hanging iron ring chandelier: brass ceiling cap, chain, brass crown, three
     chain runs (alternating s2 / s3 links, so no link vanishes against the wall),
     an iron ring seen slightly from below (an ellipse, the near half thicker, a warm
     reflection on its near top edge beside the cups) carrying 6 brass cups with
     candle stubs at 15 + 60 i degrees, and a brass pendant.
     (x,y) = TOP-CENTER where the chain starts = the top row of the ceiling cap
     (the cap has no outline, it butts the ceiling).  w = outer width of the
     ring, clamped to 36..56 (best 40..52).  Height is always 34 rows y..y+33
     (lowest solid row y+32, row y+33 is the outline); columns
     x-(w>>1)-1..x+(w>>1)+1 (w+3 for even w).  The flames lie inside that box;
     the highest flame row is about y+6.
     Returns {flames:[6 x {x,y}] sorted left to right, bottom:y+33 (lowest painted
     row), box:{x:x-(w>>1)-1, y:y, w:2*(w>>1)+3, h:34}}.

   rmFlame(c, x, y, now, seed)                                     [animated]
     One candle flame, 3 px wide, 5..6 px tall: outer amber (g2, f3), bright core
     (f4, p4).  (x,y) = flame anchor (see above).  Draws columns x-1..x+1, rows
     y-5..y.  Four whole-pixel shapes: 0 tall (calm), 1 tip left, 2 short, 3 tip
     right.  The shape can change at most every 120 ms (<= 8 changes per second,
     measured max 6 at 15 fps); about 74 % of the time it rests in shape 0 and
     flares in short, irregular excursions (every ~2 s a block of a few seconds is
     a bit more restless).  now = ms, seed = any integer: give every flame its own
     seed so they do not flicker in unison.
     Returns the shape index 0..3.

   rmFlames(c, list, now, seed0)                                   [animated]
     Convenience: rmFlame for every {x,y} of a returned flames array, list[i]
     with seed seed0+i.  Returns nothing.

   rmGlowStatic(c, x, y, r, strength)                              [static]
     Soft warm halo made only of ordered dither: concentric bands of a sparse 25 %
     grid, a 50 % checker and warmer checker-of-checker tones (dark surfaces:
     b2 -> g1 -> g2 -> g3, lighter surfaces: g1 -> g2 -> g3, f3 only for strength
     > 0.7), so the surface texture shows through everywhere except the hot core.
     Surface aware (see above): it can be baked over wall, floor, seams and
     skirting in one call.  Bake it before the props.
     (x,y) = centre of the disc (use a flame anchor moved 2..3 px down), r = radius,
     clamped to 12..40 (also for 0, negative, NaN), strength 0.2..0.7 (clamped to
     0.05..1, NaN = 0.4; 0.2 = a faint veil, 0.45 = clear halo with a gold core,
     0.7 = bright).  Paints only pixels at a distance < r from (x,y), i.e. inside
     x-r+1..x+r-1, y-r+1..y+r-1.  The outermost band (outer 20 % of r) is always the
     sparse grid (its last 7 % thinned to 12.5 %) whatever the strength, so
     rmGlowFlicker fits every halo.  On a b2 floor, r 12, strength 0.2: about 110
     g1 dots within +-10 px.  Also remembers the halo's edge ring (a few hundred
     pixels) for rmGlowFlicker.  Returns nothing.

   rmLightPool(c, x, y, rx, ry, strength)                          [static]
     Flat elliptical warm light pool for the floor: a plateau of one dither
     level (b3 / b4 wood tones, a few g2 sparks at strength > 0.5) that steps
     down through the sparse bands to a thin dithered edge.  Never above 50 %
     coverage, so planks and seams stay readable (surface aware, see above).
     (x,y) = centre of the ellipse, rx / ry its half axes (clamped to 1..60 / 1..20,
     typ. 20..50 / 5..14), strength 0.2..0.7.  Paints inside x-rx..x+rx, y-ry..y+ry.
     Returns nothing.

   rmGlowFlicker(c, x, y, r, now, seed)                            [animated]
     Extremely subtle, 2 states switching every ~0.4-1.5 s.  In the 'on' state the
     halo edge grows 1 px outwards: the sparse grid is extended 1 px beyond r and
     the checker complement is added just inside r.  Call it per frame with the
     SAME x, y, r as the baked rmGlowStatic (r is clamped like there).  It only adds
     pixels, all inside x-r..x+r, y-r..y+r, and only where the surface still shows:
     the ring pixels were chosen at bake time (lines excluded, ladder from the
     surface); on the first 'on' frame it reads the live canvas once and drops the
     ring pixels that a prop has covered since the bake (a pixel counts as covered
     when its colour is no longer the baked surface colour, or that colour dimmed
     towards ink by a vignette), so the ring never paints over a prop, a cat or a
     curtain whatever the draw order.  After that it costs a loop over a few hundred
     pixels and no readback.  If no halo was baked for (x, y, r) it builds the ring
     from the canvas as it is on the first call.  Returns 1 if the ring was drawn,
     else 0.
   ========================================================================== */

/* ---------------------------------------------------------------- helpers */

function rmLtImul(a, b) {
  return ((a & 0xffff) * b + ((((a >>> 16) * b) & 0xffff) << 16)) | 0;
}
/* integer hash of two ints -> uint32 */
function rmLtHash(a, b) {
  var h = rmLtImul(a | 0, 0x27d4eb2d) ^ rmLtImul((b | 0) + 0x165667b1, 0x85ebca6b);
  h = rmLtImul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = rmLtImul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

/* small off-screen pixel layer (keys of palette colours) used to build props */
function rmLtLayer(x0, y0, w, h) { return { x0: x0, y0: y0, w: w, h: h, col: [] }; }
function rmLtIdx(L, x, y) {
  var ix = x - L.x0, iy = y - L.y0;
  if (ix < 0 || iy < 0 || ix >= L.w || iy >= L.h) return -1;
  return iy * L.w + ix;
}
function rmLtAdd(L, m, x, y) { var i = rmLtIdx(L, x, y); if (i >= 0) m[i] = 1; }
function rmLtHas(L, m, x, y) { var i = rmLtIdx(L, x, y); return i >= 0 && m[i] === 1; }
function rmLtRect(L, m, x, y, w, h) {
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) rmLtAdd(L, m, x + i, y + j);
}
/* horizontal span x0..x1 on row y */
function rmLtSpan(L, m, x0, x1, y) { for (var i = x0; i <= x1; i++) rmLtAdd(L, m, i, y); }
function rmLtLine(L, m, x0, y0, x1, y1) {
  var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  var err = dx + dy, e2, guard = 0;
  for (;;) {
    rmLtAdd(L, m, x0, y0);
    if ((x0 === x1 && y0 === y1) || guard++ > 400) break;
    e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
/* quadratic bezier p0,p1,p2 ([x,y]) stamped with a size x size brush (anchored top-left) */
function rmLtCurve(L, m, p0, p1, p2, size) {
  var n = 60, t, u, px, py, i, a, b;
  for (i = 0; i <= n; i++) {
    t = i / n; u = 1 - t;
    px = Math.round(u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]);
    py = Math.round(u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]);
    for (a = 0; a < size; a++) for (b = 0; b < size; b++) rmLtAdd(L, m, px + a, py + b);
  }
}
/* mirror a mask about column cx */
function rmLtMirror(L, m, cx) {
  var out = {}, k, i, x, y;
  for (k in m) {
    i = +k; x = L.x0 + (i % L.w); y = L.y0 + Math.floor(i / L.w);
    rmLtAdd(L, out, 2 * cx - x, y);
  }
  return out;
}
function rmLtMerge(a, b) { var k; for (k in b) a[k] = 1; return a; }
/* bevel shading: top/left edge = hi, bottom/right edge = lo, rest = mid */
function rmLtPaint(L, m, hi, mid, lo) {
  var k, i, x, y, up, lf, dn, rt;
  for (k in m) {
    i = +k; x = L.x0 + (i % L.w); y = L.y0 + Math.floor(i / L.w);
    up = rmLtHas(L, m, x, y - 1); lf = rmLtHas(L, m, x - 1, y);
    dn = rmLtHas(L, m, x, y + 1); rt = rmLtHas(L, m, x + 1, y);
    L.col[i] = (!up || !lf) ? hi : ((!dn || !rt) ? lo : mid);
  }
}
function rmLtSet(L, x, y, col) { var i = rmLtIdx(L, x, y); if (i >= 0) L.col[i] = col; }
/* 1 px outline on empty pixels that touch the masks (list of [mask, colourKey]) */
function rmLtOutline(L, list) {
  var add = [], i, x, y, j, m;
  for (i = 0; i < L.w * L.h; i++) {
    if (L.col[i]) continue;
    x = L.x0 + (i % L.w); y = L.y0 + Math.floor(i / L.w);
    for (j = 0; j < list.length; j++) {
      m = list[j][0];
      if (rmLtHas(L, m, x - 1, y) || rmLtHas(L, m, x + 1, y) || rmLtHas(L, m, x, y - 1) || rmLtHas(L, m, x, y + 1)) {
        add.push([i, list[j][1]]); break;
      }
    }
  }
  for (j = 0; j < add.length; j++) L.col[add[j][0]] = add[j][1];
}
function rmLtFlush(c, L) {
  var i, x, y;
  for (i = 0; i < L.w * L.h; i++) {
    if (!L.col[i]) continue;
    x = L.x0 + (i % L.w); y = L.y0 + Math.floor(i / L.w);
    R(c, x, y, 1, 1, K(L.col[i]));
  }
}

/* chain: 1 px line coloured in a repeating link cycle (written straight into the layer).
   cyc = array of colour keys; links of s1 vanish on the dark wall, so only the short vertical
   run over the ceiling uses them, every run in front of the wall alternates s2 / s3. */
function rmLtChain(L, x0, y0, x1, y1, cyc) {
  var m = {}, pts = [], k, i;
  cyc = cyc || ['s3', 's2', 's3', 's2'];
  rmLtLine(L, m, x0, y0, x1, y1);
  for (k in m) pts.push(+k);
  /* order along the line: by row, then by column towards the far end */
  pts.sort(function (a, b) {
    var ya = Math.floor(a / L.w), yb = Math.floor(b / L.w);
    if (ya !== yb) return y1 >= y0 ? ya - yb : yb - ya;
    return x1 >= x0 ? (a % L.w) - (b % L.w) : (b % L.w) - (a % L.w);
  });
  for (i = 0; i < pts.length; i++) L.col[pts[i]] = cyc[i % cyc.length];
}

/* pillar candle (3 wide) with melted top, drips, darker base.  bottom = lowest row.
   returns the top row.  seed picks drip columns/lengths.  Kept one step below the
   cat's highlights: p4 only on the centre pixel of the top row (and in the flame
   core); lit left column p3, body p2, shaded right column p1, base p1 / b4 / b3. */
function rmLtCandle(L, cx, bottom, h, seed) {
  var top = bottom - h + 1, r, c, key, shift, rnd = rmLtHash(seed, 7), ladder = ['p3', 'p2', 'p1', 'b4', 'b3'];
  var base = [0, 1, 2];     /* left (lit), centre, right (shade): ladder index at rest */
  for (r = 0; r < h; r++) {
    shift = r >= h - 2 ? 2 : (r >= h - 4 ? 1 : 0);
    for (c = 0; c < 3; c++) {
      if (r === 0) key = c === 1 ? 'p4' : 'p3';
      else key = ladder[Math.min(4, base[c] + shift)];
      rmLtSet(L, cx - 1 + c, top + r, key);
    }
  }
  /* drips: two or three streaks 2..5 px long on the upper body (lit wax, p3; p2 on the shaded side) */
  var d, col, len, k;
  for (d = 0; d < 3; d++) {
    col = (rnd >>> (d * 4)) % 3;
    if (d === 2 && ((rnd >>> 13) & 1)) continue;
    len = 2 + ((rnd >>> (d * 3 + 5)) % 4);
    if (len > h - 3) len = h - 3;
    for (k = 1; k <= len; k++) rmLtSet(L, cx - 1 + col, top + k, col === 2 ? 'p2' : 'p3');
  }
  return top;
}

/* ------------------------------------------------------------- the flame */

/* the four shapes, 6 rows top -> bottom, 3 chars: . none, g g2, o f3, y f4, w p4 */
function rmLtShapes() {
  if (!rmLtShapes.t) {
    rmLtShapes.t = [
      ['.o.', '.y.', 'oyo', 'owo', 'gwg', '.g.'],   /* 0 calm, tall */
      ['o..', 'yo.', 'oyo', 'owo', 'gwg', '.g.'],   /* 1 tip left */
      ['...', '.o.', 'oyo', 'owo', 'gwg', '.g.'],   /* 2 short */
      ['..o', '.oy', 'oyo', 'owo', 'gwg', '.g.']    /* 3 tip right */
    ];
  }
  return rmLtShapes.t;
}
function rmLtFlameState(now, seed) {
  var slot = Math.floor((now + (seed | 0) * 37) / 120);
  var g = rmLtHash(Math.floor(slot / 16), (seed | 0) * 5 + 3) & 7;
  var p = g < 2 ? 4 : 1;                      /* flag chance p/16 per slot: a gusty block or a calm one */
  var k, h;
  for (k = 0; k < 3; k++) {
    h = rmLtHash(slot - k, (seed | 0) * 7 + 1);
    if ((h & 15) < p) return 1 + ((h >>> 5) % 3);
  }
  return 0;
}
function rmFlame(c, x, y, now, seed) {
  var st = rmLtFlameState(now, seed), sh = rmLtShapes()[st], r, i, ch, col;
  x = Math.round(x); y = Math.round(y);
  for (r = 0; r < 6; r++) for (i = 0; i < 3; i++) {
    ch = sh[r].charAt(i);
    if (ch === '.') continue;
    col = ch === 'g' ? 'g2' : ch === 'o' ? 'f3' : ch === 'y' ? 'f4' : 'p4';
    R(c, x - 1 + i, y - 5 + r, 1, 1, K(col));
  }
  return st;
}
function rmFlames(c, list, now, seed0) {
  for (var i = 0; i < list.length; i++) rmFlame(c, list[i].x, list[i].y, now, (seed0 | 0) + i);
}

/* ------------------------------------------------------- halo and pool */

/* ---- surface sampling.  Light must not erase the structure it falls on, so the
   halo, the pool and the contact shadow read the pixels they are about to cover
   (one getImageData per call, never per frame) and
     - leave "line" pixels alone: near-black pixels (ink grout, mortar, outlines)
       and any 1 px line that is darker than both neighbours across it (plank
       seams, skirting line, cracks), so lines run unbroken through the light;
     - only ever lighten: a dither pixel is drawn only when its colour is at
       least 8 luminance steps lighter than what is already there, so lit edges
       and highlights are never dulled;
     - pick the ladder from the surface: dark surfaces (wall stone, dark floor,
       luminance < 52) start with b2 dots, mid surfaces (b2 planks, slate
       highlights) start with g1 dots, so a faint halo is visible on both.
   Without a canvas that can be read (or on a transparent one) the surface is
   unknown: the dark ladder is drawn everywhere. */
function rmLtRgb(key) {
  if (!rmLtRgb.t) rmLtRgb.t = {};
  var v = rmLtRgb.t[key], h;
  if (!v) { h = K(key); v = rmLtRgb.t[key] = [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  return v;
}
function rmLtLum(r, g, b) { return (r * 54 + g * 183 + b * 18) >> 8; }
function rmLtKeyLum(key) { var v = rmLtRgb(key); return rmLtLum(v[0], v[1], v[2]); }
/* read a rectangle (clipped to the canvas) once; null when the canvas cannot be read */
function rmLtSample(c, x0, y0, w, h) {
  var cv = c && c.canvas, sx, sy, x1, y1, img;
  if (!cv || !c.getImageData) return null;
  sx = Math.max(x0, 0); sy = Math.max(y0, 0);
  x1 = Math.min(x0 + w, cv.width); y1 = Math.min(y0 + h, cv.height);
  if (x1 <= sx || y1 <= sy) return null;
  try { img = c.getImageData(sx, sy, x1 - sx, y1 - sy); } catch (e) { return null; }
  return { x0: sx, y0: sy, w: x1 - sx, h: y1 - sy, d: img.data };
}
/* luminance 0..255 of a sampled pixel, -1 when outside the sample or transparent */
function rmLtAt(S, x, y) {
  if (!S) return -1;
  var ix = x - S.x0, iy = y - S.y0, i;
  if (ix < 0 || iy < 0 || ix >= S.w || iy >= S.h) return -1;
  i = (iy * S.w + ix) * 4;
  return S.d[i + 3] < 255 ? -1 : rmLtLum(S.d[i], S.d[i + 1], S.d[i + 2]);
}
/* packed 0xRRGGBB of a sampled pixel, -1 when outside the sample or transparent */
function rmLtPack(S, x, y) {
  if (!S) return -1;
  var ix = x - S.x0, iy = y - S.y0, i;
  if (ix < 0 || iy < 0 || ix >= S.w || iy >= S.h) return -1;
  i = (iy * S.w + ix) * 4;
  return S.d[i + 3] < 255 ? -1 : (S.d[i] << 16) | (S.d[i + 1] << 8) | S.d[i + 2];
}
/* is the pixel (luminance l) a 1 px line across the sample: darker by 14+ than both
   neighbours on one axis? */
function rmLtThin(S, x, y, l) {
  var a = rmLtAt(S, x - 1, y), b = rmLtAt(S, x + 1, y), u = rmLtAt(S, x, y - 1), d = rmLtAt(S, x, y + 1);
  return (a >= 0 && b >= 0 && a - l >= 14 && b - l >= 14) || (u >= 0 && d >= 0 && u - l >= 14 && d - l >= 14);
}
/* is the pixel part of a line that the light must not break?  Near-black pixels (ink),
   thin lines, and the junctions / corners where two thin lines meet (two 4-neighbours of
   about the same luminance that are lines themselves). */
function rmLtIsLine(S, x, y, l) {
  if (l < 0) return false;
  if (l < 20 || rmLtThin(S, x, y, l)) return true;
  var n = 0, i, nl, dir = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (i = 0; i < 4; i++) {
    nl = rmLtAt(S, x + dir[i][0], y + dir[i][1]);
    if (nl >= 0 && Math.abs(nl - l) <= 6 && (nl < 20 || rmLtThin(S, x + dir[i][0], y + dir[i][1], nl))) n++;
  }
  return n >= 2;
}

/* Dither ladders.  A level (1..n) gives, per pixel position (kind) of the 2x2
   ordered-dither cell, an index into the ladder's tones (-1 = leave the surface alone).  kind =
   floor(bay*4): 0 = even x / even y, 1 = odd / odd, 2 = odd x / even y, 3 = even x /
   odd y.  Kinds 0+1 and 2+3 are the two diagonal pairs, so every level is a plain
   25 % grid, a 50 % checker or a checker-of-checker: no stripes, no 75 % "hole"
   patterns.  Level 1 is a sparse grid, level 2 a checker, then the tones warm up
   diagonal pair by diagonal pair; full coverage only in the hot core.
   dark: for dark surfaces, starts with b2.  mid: the same ladder one tone up, for
   surfaces that are already as light as b2, starts with g1.  pool: wood tones. */
function rmLtLadder(kind) {
  if (!rmLtLadder.t) {
    var tones = ['b2', 'g1', 'g2', 'g3', 'f3'];
    rmLtLadder.t = {
      dark: { tones: tones, lv: [[0, -1, -1, -1], [0, 0, -1, -1], [1, 0, -1, -1], [1, 1, -1, -1], [2, 1, -1, -1], [2, 2, -1, -1],
                                 [2, 2, 0, 0], [2, 2, 1, 1], [3, 3, 1, 1], [3, 3, 2, 2], [4, 4, 3, 3]] },
      mid: { tones: tones, lv: [[1, -1, -1, -1], [1, 1, -1, -1], [2, 1, -1, -1], [2, 2, -1, -1], [2, 2, 1, 1], [3, 3, 1, 1],
                                [3, 3, 2, 2], [4, 4, 3, 3]] },
      pool: { tones: ['b3', 'b4', 'g2'], lv: [[0, -1, -1, -1], [0, 0, -1, -1], [1, 0, -1, -1], [1, 1, -1, -1], [2, 1, -1, -1]] }
    };
  }
  return rmLtLadder.t[kind];
}
/* the ladder for a surface of luminance lum (-1 = unknown) */
function rmLtHaloLadder(lum) { return rmLtLadder(lum >= 52 ? 'mid' : 'dark'); }
/* colour key for ladder level lev at pixel (px,py) over a surface of luminance lum, '' = draw nothing */
function rmLtPick(lad, lev, px, py, lum) {
  if (lev < 1) return '';
  var idx = lad.lv[Math.min(lev, lad.lv.length) - 1][Math.floor(bay(px, py) * 4)], key;
  if (idx < 0) return '';
  key = lad.tones[idx];
  return (lum >= 0 && rmLtKeyLum(key) < lum + 8) ? '' : key;
}
function rmLtR(r) { return clamp(Math.round(r) || 12, 12, 40); }       /* halo radius, also for NaN / 0 / negative */

/* ---- the ring that rmGlowFlicker animates: candidate pixels (inside r: the checker
   complement of level 1; outside r: the sparse grid, 1 px further) computed from the
   same surface sample as the baked halo and remembered per (x, y, r). */
function rmLtRing(S, x, y, r) {
  var list = [], dx, dy, d2, px, py, k, lum, col, rin = (r - 1.5) * (r - 1.5), rmid = r * r, rout = (r + 1) * (r + 1);
  for (dy = -r - 1; dy <= r + 1; dy++) for (dx = -r - 1; dx <= r + 1; dx++) {
    d2 = dx * dx + dy * dy;
    if (d2 < rin || d2 >= rout) continue;
    px = x + dx; py = y + dy; k = Math.floor(bay(px, py) * 4);
    if (d2 < rmid ? k !== 1 : k !== 0) continue;
    lum = rmLtAt(S, px, py);
    if (rmLtIsLine(S, px, py, lum)) continue;
    col = rmLtPick(rmLtHaloLadder(lum), d2 < rmid ? 2 : 1, px, py, lum);
    if (col) list.push([px, py, col, rmLtPack(S, px, py)]);
  }
  return list;
}
function rmLtRingPut(x, y, r, list) {
  if (!rmLtRingPut.t || rmLtRingPut.n > 1024) { rmLtRingPut.t = {}; rmLtRingPut.n = 0; }   /* tiny cache, reset on overflow */
  var key = x + ',' + y + ',' + r;
  if (!rmLtRingPut.t[key]) rmLtRingPut.n++;
  return (rmLtRingPut.t[key] = { list: list, ok: false });
}
function rmLtRingGet(x, y, r) { return rmLtRingPut.t ? rmLtRingPut.t[x + ',' + y + ',' + r] : undefined; }
/* does colour packed p still look like colour b of the baked surface (the surface itself, or the surface
   dimmed towards ink by a vignette)?  True when p lies on the straight line from b to ink (0 .. 70 %). */
function rmLtSameSurface(p, b) {
  var i = rmLtRgb('ink'), pr = (p >> 16) & 255, pg = (p >> 8) & 255, pb = p & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  var vr = i[0] - br, vg = i[1] - bg, vb = i[2] - bb, n = vr * vr + vg * vg + vb * vb, t, e;
  if (n < 16) return Math.abs(pr - br) + Math.abs(pg - bg) + Math.abs(pb - bb) < 12;
  t = ((pr - br) * vr + (pg - bg) * vg + (pb - bb) * vb) / n;
  if (t < -0.06 || t > 0.7) return false;
  e = Math.max(Math.abs(pr - br - t * vr), Math.abs(pg - bg - t * vg), Math.abs(pb - bb - t * vb));
  return e <= 8;
}

/* halo: soft warm light made of ordered dither only (see the header) */
function rmGlowStatic(c, x, y, r, strength) {
  x = Math.round(x); y = Math.round(y); r = rmLtR(r);
  var s = clamp(isNaN(+strength) ? 0.4 : +strength, 0.05, 1);
  var tp = clamp((3 + (s - 0.2) * 14 - 1) / 10, 0, 1);       /* peak of the intensity profile as a fraction of the ladder: 0.2 -> 0.2, 0.7 -> 0.9 */
  var S = rmLtSample(c, x - r - 2, y - r - 2, 2 * r + 5, 2 * r + 5), lad, lev, lum, col, q, u, dx, dy, px, py;
  for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
    q = 1 - Math.sqrt(dx * dx + dy * dy) / r;
    if (q <= 0) continue;
    px = x + dx; py = y + dy;
    lum = rmLtAt(S, px, py);
    if (rmLtIsLine(S, px, py, lum)) continue;
    lad = rmLtHaloLadder(lum);
    if (q < 0.07) { if (bay(px, py) < 0.125) lev = 1; else continue; }          /* tapered edge: 12.5 % */
    else if (q < 0.2) lev = 1;
    else { u = (q - 0.2) / 0.8; lev = 1 + Math.floor((lad.lv.length - 1) * tp * Math.pow(u, 1.3) + 0.0001); }
    col = rmLtPick(lad, lev, px, py, lum);
    if (col) R(c, px, py, 1, 1, K(col));
  }
  rmLtRingPut(x, y, r, rmLtRing(S, x, y, r));
}

function rmLightPool(c, x, y, rx, ry, strength) {
  x = Math.round(x); y = Math.round(y);
  rx = clamp(Math.round(rx) || 1, 1, 60); ry = clamp(Math.round(ry) || 1, 1, 20);
  var s = clamp(isNaN(+strength) ? 0.4 : +strength, 0.05, 1), lad = rmLtLadder('pool'), plate = 1.6 + s * 6;   /* 0.2 -> 2.8, 0.4 -> 4, 0.7 -> 5.8 (capped at the 5 levels) */
  var S = rmLtSample(c, x - rx - 1, y - ry - 1, 2 * rx + 3, 2 * ry + 3), dx, dy, d, f, lev, ex, ey, px, py, lum, col;
  for (dy = -ry; dy <= ry; dy++) for (dx = -rx; dx <= rx; dx++) {
    ex = dx / (rx + 0.5); ey = dy / (ry + 0.5);
    d = Math.sqrt(ex * ex + ey * ey);
    if (d >= 1) continue;
    px = x + dx; py = y + dy;
    lum = rmLtAt(S, px, py);
    if (rmLtIsLine(S, px, py, lum)) continue;
    f = d < 0.55 ? 1 : (1 - d) / 0.45;
    lev = Math.floor(Math.max(1, plate * f) + 0.0001);
    col = rmLtPick(lad, lev, px, py, lum);
    if (col) R(c, px, py, 1, 1, K(col));
  }
}

function rmGlowFlicker(c, x, y, r, now, seed) {
  x = Math.round(x); y = Math.round(y); r = rmLtR(r);
  var slot = Math.floor((now + (seed | 0) * 211) / 420), e, S, i, it, keep, v, list;
  if ((rmLtHash(slot, (seed | 0) + 91) & 3) > 1) return 0;
  e = rmLtRingGet(x, y, r);
  if (!e) {                                     /* no baked halo registered: read the ring from the canvas as it is now */
    e = rmLtRingPut(x, y, r, rmLtRing(rmLtSample(c, x - r - 2, y - r - 2, 2 * r + 5, 2 * r + 5), x, y, r));
    e.ok = true;
  } else if (!e.ok) {                           /* first frame: drop the pixels that a prop has covered since the bake */
    S = rmLtSample(c, x - r - 1, y - r - 1, 2 * r + 3, 2 * r + 3);
    if (S) {
      keep = [];
      for (i = 0; i < e.list.length; i++) {
        it = e.list[i]; v = rmLtPack(S, it[0], it[1]);
        if (v < 0 || it[3] < 0 || rmLtSameSurface(v, it[3])) keep.push(it);
      }
      e.list = keep;
    }
    e.ok = true;
  }
  list = e.list;
  for (i = 0; i < list.length; i++) R(c, list[i][0], list[i][1], 1, 1, K(list[i][2]));
  return 1;
}

/* soft contact shadow of the candelabra foot (foot row y spans x-6..x+6, its solid
   outline row y+1 is drawn by the prop): 50 % dither just beside the outline and
   under it, 25 % at the far ends.  ink on dark floors, b1 on lighter ones. */
function rmLtShadow(c, x, y) {
  var S = rmLtSample(c, x - 10, y + 1, 21, 2), px, py, dx, l, dens, key;
  for (py = y + 1; py <= y + 2; py++) for (px = x - 9; px <= x + 9; px++) {
    dx = Math.abs(px - x);
    if (py === y + 1 && dx < 7) continue;                   /* the foot's own outline stays solid */
    if (py === y + 1 && dx > 8) continue;
    dens = dx <= 7 ? 0.5 : 0.25;
    if (!(bay(px, py) < dens)) continue;
    l = rmLtAt(S, px, py);
    if (l >= 0 && l < 20) continue;                         /* already ink */
    key = l > 45 ? 'b1' : 'ink';
    R(c, px, py, 1, 1, K(key));
  }
}

/* ---------------------------------------------------------- candelabra */

function rmCandelabra(c, x, y) {
  x = Math.round(x); y = Math.round(y);
  var L = rmLtLayer(x - 12, y - 48, 25, 51), seed = (x * 31 + y * 17) | 0;
  var iron = {}, brass = {}, wax = {}, i, s;
  /* foot, stem */
  rmLtSpan(L, iron, x - 6, x + 6, y);
  rmLtSpan(L, iron, x - 5, x + 5, y - 1);
  rmLtSpan(L, iron, x - 3, x + 3, y - 2);
  rmLtSpan(L, iron, x - 2, x + 2, y - 3);
  rmLtRect(L, iron, x - 1, y - 27, 3, 24);
  /* brass: lower bead, collar, upper bead, centre cup */
  rmLtSpan(L, brass, x - 1, x + 1, y - 9);
  rmLtSpan(L, brass, x - 2, x + 2, y - 10);
  rmLtSpan(L, brass, x - 1, x + 1, y - 11);
  rmLtSpan(L, brass, x - 2, x + 2, y - 20);
  rmLtSpan(L, brass, x - 3, x + 3, y - 19);
  rmLtSpan(L, brass, x - 3, x + 3, y - 18);
  rmLtSpan(L, brass, x - 2, x + 2, y - 17);
  rmLtSpan(L, brass, x - 1, x + 1, y - 25);
  rmLtSpan(L, brass, x - 2, x + 2, y - 24);
  rmLtSpan(L, brass, x - 1, x + 1, y - 23);
  rmLtSpan(L, brass, x - 2, x + 2, y - 30);
  rmLtSpan(L, brass, x - 1, x + 1, y - 29);
  rmLtSpan(L, brass, x, x, y - 28);
  /* arms (right one built, left one mirrored), iron, 2 px brush */
  var armR = {}, armL;
  rmLtCurve(L, armR, [x + 3, y - 19], [x + 8, y - 16], [x + 8, y - 22], 2);
  armL = rmLtMirror(L, armR, x);
  /* side cups */
  var side = [-8, 8];
  for (i = 0; i < 2; i++) {
    s = side[i];
    rmLtSpan(L, brass, x + s - 2, x + s + 2, y - 24);
    rmLtSpan(L, brass, x + s - 1, x + s + 1, y - 23);
    rmLtSpan(L, brass, x + s, x + s, y - 22);
  }
  rmLtMerge(iron, armR); rmLtMerge(iron, armL);
  rmLtPaint(L, iron, 's2', 's1', 'st');
  rmLtPaint(L, brass, 'g3', 'g2', 'g1');
  /* outline (before the wax so that wax is never outlined) */
  rmLtOutline(L, [[iron, 'ink'], [brass, 'b1']]);
  /* candles */
  var tL = rmLtCandle(L, x - 8, y - 25, 7, seed + 1);
  var tC = rmLtCandle(L, x, y - 31, 9, seed + 2);
  var tR = rmLtCandle(L, x + 8, y - 25, 8, seed + 3);
  var tops = [tL, tC, tR], cxs = [x - 8, x, x + 8], flames = [];
  for (i = 0; i < 3; i++) {
    rmLtSet(L, cxs[i], tops[i] - 1, 'b1');                   /* wick */
    flames.push({ x: cxs[i], y: tops[i] - 2 });
  }
  /* wax spill on the cup rims (always on a rim pixel) */
  rmLtSet(L, x - 8 + (seed & 1 ? 2 : -2), y - 24, 'p1');
  rmLtSet(L, x + 8 + (seed & 2 ? 2 : -2), y - 24, 'p2');
  rmLtSet(L, x + (seed & 4 ? 2 : -2), y - 30, 'p1');
  rmLtFlush(c, L);
  /* contact shadow on the floor */
  rmLtShadow(c, x, y);
  return { flames: flames, box: { x: x - 11, y: y - 46, w: 23, h: 49 } };
}

/* -------------------------------------------------------------- sconce */

function rmSconce(c, x, y) {
  x = Math.round(x); y = Math.round(y);
  var L = rmLtLayer(x - 6, y - 1, 13, 16), plate = {}, brass = {}, ex, ey, fl;
  /* tall oval iron wall plaque, 7 wide, rows y..y+12 */
  for (ey = 0; ey <= 12; ey++) for (ex = -4; ex <= 4; ex++)
    if ((ex * ex) / (3.6 * 3.6) + ((ey - 6) * (ey - 6)) / (6.6 * 6.6) <= 1) rmLtAdd(L, plate, x + ex, y + ey);
  rmLtPaint(L, plate, 's2', 's1', 'st');
  /* the flame warms the plaque around the candle (g1 near, dithered b3 further out) */
  for (ey = 0; ey <= 12; ey++) for (ex = -4; ex <= 4; ex++) {
    if (!rmLtHas(L, plate, x + ex, y + ey)) continue;
    if (!(rmLtHas(L, plate, x + ex - 1, y + ey) && rmLtHas(L, plate, x + ex + 1, y + ey) &&
          rmLtHas(L, plate, x + ex, y + ey - 1) && rmLtHas(L, plate, x + ex, y + ey + 1))) continue;   /* keep the rim */
    fl = Math.sqrt(ex * ex + (ey + 2) * (ey + 2));
    if (fl < 5) rmLtSet(L, x + ex, y + ey, 'g1');
    else if (fl < 7 && bay(x + ex, y + ey) < 0.5) rmLtSet(L, x + ex, y + ey, 'b3');
  }
  rmLtSet(L, x, y + 10, 's3');                                 /* rivet */
  /* brass ledge / dish, wider than the plaque */
  rmLtSpan(L, brass, x - 4, x + 4, y + 4);
  rmLtSpan(L, brass, x - 3, x + 3, y + 5);
  rmLtSpan(L, brass, x - 2, x + 2, y + 6);
  rmLtPaint(L, brass, 'g3', 'g2', 'g1');
  rmLtOutline(L, [[plate, 'ink'], [brass, 'b1']]);
  var top = rmLtCandle(L, x, y + 3, 4, (x * 13 + y * 7) | 0);
  rmLtSet(L, x, top - 1, 'b1');                                /* wick */
  rmLtFlush(c, L);
  return { flames: [{ x: x, y: top - 2 }], box: { x: x - 5, y: y - 7, w: 11, h: 21 } };
}

/* ----------------------------------------------------------- chandelier */

function rmChandelier(c, x, y, w) {
  x = Math.round(x); y = Math.round(y);
  w = clamp(Math.round(w), 36, 56);
  var hw = w >> 1, ry = 4, yc = y + 22, rxr = hw - 1;
  var L = rmLtLayer(x - hw - 2, y - 1, 2 * hw + 5, 36);
  var iron = {}, brass = {}, ringR = {}, ring, i, t, px, py, a, b, th, cd, cm, top, k, ci;
  /* ceiling cap, chain, crown */
  rmLtSpan(L, brass, x - 2, x + 2, y);
  rmLtSpan(L, brass, x - 1, x + 1, y + 1);
  rmLtSpan(L, brass, x - 1, x + 1, y + 11);
  rmLtSpan(L, brass, x - 2, x + 2, y + 12);
  rmLtSpan(L, brass, x - 1, x + 1, y + 13);
  rmLtChain(L, x, y + 2, x, y + 10, ['s2', 's3', 's2', 's1']);          /* over the dark ceiling: s1 links read as gaps */
  /* chain runs from the crown to the ring and to the pendant */
  rmLtChain(L, x + 3, y + 14, x + rxr, yc);
  rmLtChain(L, x - 3, y + 14, x - rxr, yc);
  rmLtChain(L, x, y + 14, x, yc + ry + 2);
  /* ring: right half stamped 2 wide, 2 tall (3 tall on the near half), mirrored */
  for (i = 0; i <= 90; i++) {
    t = -Math.PI / 2 + Math.PI * i / 90;
    px = Math.round(rxr * Math.cos(t)); py = Math.round(ry * Math.sin(t));
    for (a = 0; a < 2; a++) for (b = 0; b < (py >= 1 ? 3 : 2); b++) rmLtAdd(L, ringR, x + px + a, yc + py + b);
  }
  ring = rmLtMirror(L, ringR, x); rmLtMerge(ring, ringR);
  rmLtMerge(iron, ring);
  /* pendant (rows y+29..y+32) */
  rmLtSpan(L, brass, x, x, y + 29);
  rmLtSpan(L, brass, x - 1, x + 1, y + 30);
  rmLtSpan(L, brass, x - 1, x + 1, y + 31);
  rmLtSpan(L, brass, x, x, y + 32);
  rmLtPaint(L, iron, 's2', 's1', 'st');
  rmLtPaint(L, brass, 'g3', 'g2', 'g1');
  rmLtOutline(L, [[iron, 'ink'], [brass, 'b1']]);
  for (i = x - 3; i <= x + 3; i++) { k = rmLtIdx(L, i, y - 1); if (k >= 0) L.col[k] = undefined; }   /* the cap butts the ceiling: no outline */
  /* candles on the ring: 6 positions, angles 15 + 60 i degrees, painter order back to front */
  var cand = [], flames = [];
  for (i = 0; i < 6; i++) {
    th = (15 + 60 * i) * Math.PI / 180;
    cand.push({ cx: x + Math.round(rxr * Math.cos(th)), py: yc + 1 + Math.round(ry * Math.sin(th)), s: Math.sin(th) });
  }
  cand.sort(function (p, q) { return p.s - q.s; });
  /* warm reflection of the flames on the lit top edge of the near half of the ring next to each cup */
  for (k in ring) {
    ci = +k; px = L.x0 + (ci % L.w); py = L.y0 + Math.floor(ci / L.w);
    if (L.col[ci] !== 's2' || py < yc + 1 || Math.abs(px - x) > rxr - 5) continue;     /* near half only, never the outermost columns */
    for (i = 0; i < 6; i++) if (Math.abs(px - cand[i].cx) <= 3 && Math.abs(py - cand[i].py) <= 2) { L.col[ci] = 'g1'; break; }
  }
  for (i = 0; i < 6; i++) {
    cd = cand[i]; cm = {};
    rmLtSpan(L, cm, cd.cx - 2, cd.cx + 2, cd.py - 1);
    rmLtPaint(L, cm, 'g3', 'g2', 'g1');
    rmLtSet(L, cd.cx - 2, cd.py - 2, 'b1'); rmLtSet(L, cd.cx + 2, cd.py - 2, 'b1');
    top = rmLtCandle(L, cd.cx, cd.py - 2, 5, (x * 3 + i * 11) | 0);
    rmLtSet(L, cd.cx, top - 1, 'b1');
    flames.push({ x: cd.cx, y: top - 2 });
  }
  flames.sort(function (p, q) { return p.x - q.x; });
  rmLtFlush(c, L);
  return { flames: flames, bottom: y + 33, box: { x: x - hw - 1, y: y, w: 2 * hw + 3, h: 34 } };
}
