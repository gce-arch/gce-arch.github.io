/* ============================================================================
   rm_shell.js  -  the architecture of the scholars' hall (ES5, static art)

   Six static functions that draw the surfaces everything else stands on.  All
   pixels are opaque palette colours (no alpha, no gradients, no dither: darker
   zones are tone steps, edges are solid 1 px lines).  Every function is deterministic (same
   arguments -> same pixels), draws only inside its documented box (verified by
   _sh_test.js) and returns that box.  Light comes from the upper left: lit
   edges are left/top, shade is right/bottom.  The shell is the quiet background:
   dark stone, dark oak, no large bright or saturated areas (the brightest things
   are 1 px gold/brass accents and the rug band).

   Intended layering (back to front, all static, draw once):
     rmWall -> rmCeiling -> rmWainscot -> rmFloor -> rmPillar(s) -> props
     -> rmRug (on the floor, before the cat shadow and the cat)

   Layout for a 384 x 189 canvas with wallY = 118 (everything is relative to W,
   H and wallY, so other sizes work too):
     y   0..15   ceiling band: vault with pointed arches + oak tie-beam (rmCeiling)
     y  16..99   bare stone wall (rmWall), 84 rows = whole courses of 9-11 px
     y 100..117  panelled wainscot, 18 rows (rmWainscot); its top 4 rows are the rail
     y 118..122  skirting board, 5 rows (rmWainscot)
     y 123..188  floor, 66 rows (rmFloor)
   Things that stand on the floor against the wall have their feet at about
   y = wallY+4 (over the skirting board) .. wallY+10.

   ---------------------------------------------------------------------------
   rmWall(c, W, wallY, seed)
     Dark ashlar wall: staggered courses 9-11 px tall, blocks 18-26 px wide (the
     last block of a course overflows the right edge and is clipped), ink mortar,
     per block one of four slate/blue tones (n1 ~33 %, s1 ~32 %, st ~30 %, and a
     rare lighter n2 block ~5 % whose only highlight is a 6 px n3 glint on its top
     edge) with a 1 px lit top-left corner run and a darker bottom/right edge, a
     few specks, chips and hairline cracks.  The courses are laid out so that
     whole courses fill the visible stretch y 16 .. wallY-19 (between ceiling
     beam and wainscot rail); row 16 is an ink joint under the beam.
     Box: x 0..W-1, y 0..wallY-1 (the ceiling covers rows 0..15, the wainscot
     the last 18 rows).  seed: any integer.
     Returns {x:0, y:0, w:W, h:wallY}.

   rmCeiling(c, W, seed)
     Top band, box x 0..W-1, y 0..15 (16 rows): dark masonry vault with a row of
     shallow pointed arches (sharp apex, vertical imposts), one every 64 px.  Each
     arch is a dark recess framed by a stone rib of constant 4 px thickness: ink
     outer line, s2 lit face on the left flank / s1 shaded face on the right flank,
     s2 lit inner edge, all solid (no dither).  The rib's outer line touches the
     canvas top (y 0) at the apex.  A small gold hanging ring sits under each apex
     (ring at y 5..7).  The arches rest on a dark oak tie-beam (rows 12..15: b3 lit
     edge, b2, b1 underside; brass studs at the piers).  The beam's lower edge
     (y 15) is the line banners and chandeliers hang from; free hanging space
     starts at y = 16.
     Arch geometry for aligning other things: cx = floor(W/2); arch apexes at
     x = cx + 64*k, piers (arch joints with a brass stud) at x = cx + 32 + 64*k.
     For W = 384: apexes 0 64 128 192 256 320 (the arch at x = 0 is cut in half
     by the canvas edge and has no ring; the one at 384 is off canvas), piers
     32 96 160 224 288 352.  Only on-canvas x values are listed.  A chain can
     start at the apex ring (x = apex, y = 3).
     seed: any integer (masonry joints, beam grain).
     Returns {x:0, y:0, w:W, h:16, cx:cx, pitch:64, apex:[x...], pier:[x...]}.

   rmWainscot(c, W, wallY)
     Oak panelling over the lower wall plus the skirting board.
     Box: x 0..W-1, y wallY-18 .. wallY+4 (23 rows):
       wallY-18..wallY-15  molded rail: b4 lit edge, b3, g1 brass fillet, b1
       wallY-14..wallY-1   frame (stiles 4 px with lit/shaded edges) and sunken
                           panels 24 x 10 px, pitch 28, run centred on the canvas,
                           each with a carved lozenge; deliberately dark (b1/b2)
                           so that the ginger cat in front of it stays readable
       wallY..wallY+4      skirting board: b3 b3 b2 b2 b1 (the last row is the
                           dark line against the floor), mitre joints every 56 px
     Returns {x:0, y:wallY-18, w:W, h:23}.

   rmFloor(c, W, H, wallY, seed)
     Flagstone/parquet hybrid, box x 0..W-1, y wallY+5 .. H-1: slabs 20-26 px wide
     in staggered rows (a little wider and taller, 10-12 px, towards the viewer; the
     rows are fitted so the last one ends exactly at H-1), ink grout, 1 px lit top
     edge, tones b1 (most), b2, a cool slate st and a few plank-like slabs with two
     grain lines.  Under the skirting board: one solid ink row and one solid
     dark row.  The slab rows whose top lies below y = H-26 use darker tones
     (b2 -> b1 faces, ink bottom edge): a tone step instead of a dither ramp.
     Returns {x:0, y:wallY+5, w:W, h:H-wallY-5}.

   rmPillar(c, x, topY, botY, w)
     Stone pilaster: fluted shaft (lit left arris, period-4 flutes, shaded right
     side), gold-trimmed capital (abacus g3/g2/g1, bell with gold leaf tips,
     astragal rings) and a stepped base block.
     (x, topY) = top-left pixel, botY = LAST row (inclusive), w = 10..14 (the box
     is exactly w wide).  Capital 8 rows, base 8 rows; use botY-topY+1 >= 40.
     The last row (botY) is the lowest solid row: put it on the floor line, the
     top row (topY) just under the beam (16).  Nothing is drawn outside the box.
     Returns {x:x, y:topY, w:w, h:botY-topY+1}.

   rmRug(c, cx, cy, rx, ry, seed)
     Round rug seen at an angle: (cx, cy) = centre pixel of the ellipse, rx = 70..110
     horizontal radius, ry = 12..26 vertical radius (pixels); the ellipse covers
     cx-rx..cx+rx, cy-ry..cy+ry.  All rings are nested scanline ellipses (radii shrink
     by 1 per ring), so each ring is a clean closed contour of constant thickness:
     dark outline, gold border (g1, g2/g3 twisted-rope dashes of 2 px along the
     contour, g1), thin dark gap, woven band n2/n3 with a repeating plus-shaped
     jewel (n4 arms, g2 core) every ~10 px of the contour with n2 beads in between
     (jewels centred on the tips and on the top and bottom), n1 line, gold hairline,
     a field of n2 with a staggered lattice of small n4/n3 stars, and a subtle central
     medallion (n3 ring, n1 ring, small gold jewels and a gold lozenge).  For ry < 18
     the second gold ring and the gap are left out so a field remains.  Short fringe
     tassels (p2 with g1 knot, p1 tip) hang horizontally outwards at the two tips
     (4-5 px).  Draw before the cat's shadow; the cat lies near (cx, cy).
     Box: x cx-rx-5 .. cx+rx+5, y cy-ry .. cy+ry.
     Returns {x:cx-rx-5, y:cy-ry, w:2*rx+11, h:2*ry+1, cx:cx, cy:cy}.

   Private helpers (global because the page has no modules): rmShHash, rmShPen,
   rmShNear.
   ============================================================================ */

/* ---------- private helpers (prefix rmSh) ---------- */

/* deterministic per-pixel hash in [0,1) */
function rmShHash(x, y, s) {
  var h = ((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) & 0x7fffffff;
  h = (h ^ (h >>> 13)) & 0x7fffffff;
  h = (h * 1597) % 2147483647;
  h = (h ^ (h >>> 9)) & 0x7fffffff;
  h = (h * 3361) % 2147483647;
  return (h % 4096) / 4096;
}

/* clipped pen: returns {r(x,y,w,h,key), p(x,y,key)} limited to the box x0..x1, y0..y1 (inclusive) */
function rmShPen(c, x0, y0, x1, y1) {
  var d = {};
  d.r = function (x, y, w, h, k) {
    var ax = x < x0 ? x0 : x, ay = y < y0 ? y0 : y;
    var bx = x + w - 1 > x1 ? x1 : x + w - 1, by = y + h - 1 > y1 ? y1 : y + h - 1;
    if (bx < ax || by < ay) return;
    c.fillStyle = K(k); c.fillRect(ax, ay, bx - ax + 1, by - ay + 1);
  };
  d.p = function (x, y, k) {
    if (x < x0 || x > x1 || y < y0 || y > y1) return;
    c.fillStyle = K(k); c.fillRect(x, y, 1, 1);
  };
  return d;
}

function rmShNear(list, v, dist) {
  for (var i = 0; i < list.length; i++) if (Math.abs(list[i] - v) < dist) return true;
  return false;
}

/* ============================== rmWall ============================== */
function rmWall(c, W, wallY, seed) {
  var d = rmShPen(c, 0, 0, W - 1, wallY - 1);
  var rnd = rmRng((seed | 0) * 31 + 7);
  /* tone families: face, speckle, highlight, shade, highlight coverage */
  var fams = [
    { a: 'n1', b: 'n2', hi: 'n2', lo: 'st', cov: 1.0 },
    { a: 's1', b: 'st', hi: 's2', lo: 'st', cov: 0.4 },
    { a: 'n2', b: 'n1', hi: 'n3', lo: 'n1', cov: 0.3, topOnly: 1 },   /* rare lighter blue block: short n3 glint on the top edge only */
    { a: 'st', b: 's1', hi: 's1', lo: 'ink', cov: 1.0 }
  ];
  /* course heights: the visible stretch (y 16 .. wallY-19, between the ceiling beam and the
     wainscot rail) is filled with whole courses of 9-11 px; hidden courses above and below */
  var top = 16, bot = wallY - 18, T = Math.max(10, bot - top);
  var nC = Math.max(1, Math.round(T / 10)), hs = [], q, base = Math.floor(T / nC), rem = T - base * nC;
  for (q = 0; q < nC; q++) hs.push(base + (q < rem ? 1 : 0));
  for (q = 0; q < nC * 3; q++) {              /* shuffle +1/-1 pairs for variety, keep 9..11 and the sum */
    var ia = Math.floor(rnd() * nC), ib = Math.floor(rnd() * nC);
    if (ia !== ib && hs[ia] < 11 && hs[ib] > 9) { hs[ia]++; hs[ib]--; }
  }
  var courses = [];
  for (q = 0; q < nC; q++) courses.push(hs[q]);
  /* build the full list: two hidden courses above, the visible ones, then hidden ones below */
  var list = [10, 10].concat(courses), yTot = top + T;
  while (yTot < wallY) { list.push(10); yTot += 10; }
  var prev = [], y = -4, bi = 0, li = 0;
  while (y < wallY && li < list.length) {
    var h = list[li++];
    var joints = [];
    var x = -Math.floor(rnd() * 9);
    while (x < W) {
      var w = 18 + Math.floor(rnd() * 9), tries = 0;
      while (tries < 9 && rmShNear(prev, x + w, 5)) { w = 18 + ((w - 18 + 4) % 9); tries++; }
      /* the last block of a course simply overflows the right edge and is clipped by the pen */
      var fr = rnd(), fi = fr < 0.33 ? 0 : fr < 0.65 ? 1 : fr < 0.70 ? 2 : 3;
      var f = fams[fi];
      bi++;
      var fw = w - 1, fh = h - 1;                     /* face size (last col / row = mortar) */
      /* mortar first */
      d.r(x, y, w, h, 'ink');
      /* face */
      d.r(x, y, fw, fh, f.a);
      /* sparse specks of the neighbouring tone */
      var sx, sy;
      for (sy = 1; sy < fh - 1; sy++) for (sx = 1; sx < fw - 1; sx++) {
        if (rmShHash(x + sx, y + sy, seed + 11) < 0.013) d.p(x + sx, y + sy, f.b);
      }
      /* shade: solid bottom row and right column */
      for (sx = 0; sx < fw; sx++) d.p(x + sx, y + fh - 1, f.lo);
      for (sy = 0; sy < fh; sy++) d.p(x + fw - 1, y + sy, f.lo);
      /* lit top edge and left edge: a clean run from the top-left corner (full length when cov = 1) */
      var rt = f.topOnly ? 6 : Math.round((fw - 1) * f.cov), rl = f.topOnly ? 0 : Math.round((fh - 2) * Math.min(1, f.cov + 0.15));
      for (sx = 0; sx < rt; sx++) d.p(x + sx, y, f.hi);
      for (sy = 1; sy <= rl; sy++) d.p(x, y + sy, f.hi);
      /* chip at a corner */
      if (rnd() < 0.13) {
        var cc = Math.floor(rnd() * 3);
        if (cc === 0) { d.p(x + fw - 1, y, 'ink'); d.p(x + fw - 2, y, 'ink'); d.p(x + fw - 1, y + 1, 'ink'); d.p(x + fw - 2, y + 1, f.lo); }
        else if (cc === 1) { d.p(x + 1, y + fh - 1, 'ink'); d.p(x + 2, y + fh - 1, 'ink'); d.p(x + 1, y + fh - 2, f.lo); }
        else { d.p(x + fw - 1, y + fh - 1, 'ink'); d.p(x + fw - 2, y + fh - 1, 'ink'); d.p(x + fw - 1, y + fh - 2, 'ink'); }
      }
      /* hairline crack */
      if (rnd() < 0.08) {
        var kx = x + 4 + Math.floor(rnd() * (fw - 9)), ky = y + 1, kl = 4 + Math.floor(rnd() * 5);
        for (var t = 0; t < kl && ky < y + fh - 1; t++) {
          d.p(kx, ky, 'st');
          ky++;
          if (rnd() < 0.5) kx += rnd() < 0.5 ? -1 : 1;
          if (kx < x + 2 || kx > x + fw - 3) break;
        }
      }
      x += w; joints.push(x);
    }
    prev = joints; y += h;
  }
  /* shadow of the ceiling beam: one ink row right under it (reads as the joint under the beam) */
  d.r(0, 16, W, 1, 'ink');
  return { x: 0, y: 0, w: W, h: wallY };
}

/* ============================== rmCeiling ============================== */
function rmCeiling(c, W, seed) {
  var d = rmShPen(c, 0, 0, W - 1, 15);
  var rnd = rmRng((seed | 0) * 17 + 5);
  var cx = Math.floor(W / 2), P = 64, x, y, i;
  var SPR = 17;                       /* spring line (hidden behind the beam) */
  /* intrados / extrados of the pointed arch: half-width, apex height above SPR */
  var SI = 22, AI = 13, QX = 0.42;
  function fh(u, A) { return u >= 1 ? -1 : Math.round(A * Math.pow(1 - u, QX)); }
  /* intrados per column: recess starts at row archYi(x) (nearest apex) */
  var yiCache = {};                   /* top row of the recess per column (memoised: dist() asks a lot) */
  function archYi(px) {
    var v = yiCache[px];
    if (v === undefined) {
      var xa = cx + P * Math.round((px - cx) / P), dx = Math.abs(px - xa);
      var hi = dx <= SI ? fh(dx / SI, AI) : -1;
      v = yiCache[px] = hi >= 0 ? SPR - hi : 99;
    }
    return v;
  }
  function recess(px, py) { return py <= 11 && py >= archYi(px); }
  /* rib = band of constant thickness (RT px, Euclidean) around the recess; dist = distance to the recess (0 = recess) */
  var RT = 4;
  function dist(px, py) {
    if (recess(px, py)) return 0;
    var best = 99, qx, qy, dd;
    for (qy = -RT; qy <= RT; qy++) for (qx = -RT; qx <= RT; qx++) {
      if (recess(px + qx, py + qy)) { dd = Math.sqrt(qx * qx + qy * qy); if (dd < best) best = dd; }
    }
    return best;
  }

  /* masonry: courses of dark blocks */
  d.r(0, 0, W, 16, 'st');
  var cy0 = 0, row = 0;
  while (cy0 < 12) {
    var ch = 5 + (row % 2);
    d.r(0, cy0 + ch - 1, W, 1, 'ink');
    var jx = -Math.floor(rnd() * 12);
    while (jx < W) {
      var bw = 11 + Math.floor(rnd() * 6);
      jx += bw;
      d.r(jx - 1, cy0, 1, ch, 'ink');
      if (rnd() < 0.35) d.r(jx - bw, cy0, Math.min(bw - 2, 4), 1, 's1');
    }
    cy0 += ch; row++;
  }

  /* arches */
  var apex = [], pier = [], k, kmin = -Math.ceil(cx / P) - 1, kmax = Math.ceil((W - cx) / P) + 1;
  for (k = kmin; k <= kmax; k++) {
    var xa = cx + P * k;
    if (xa >= 0 && xa <= W - 1) apex.push(xa);
    if (xa + 32 >= 0 && xa + 32 <= W - 1) pier.push(xa + 32);
    for (x = xa - 32; x <= xa + 32; x++) {
      if (x < 0 || x >= W) continue;
      var left = x < xa;
      for (y = 0; y <= 11; y++) {
        var dd = dist(x, y);
        if (dd === 0) {
          /* recess: dark vault; one plain st row at the bottom where the beam's light reaches */
          d.p(x, y, y === 11 ? 'st' : 'ink');
        } else if (dd <= RT + 0.2) {
          /* rib: lit inner edge, face, ink outer line */
          d.p(x, y, dd <= 1.2 ? 's2' : dd > RT - 1.1 ? 'ink' : left ? 's2' : 's1');
        }
      }
    }
    /* gold hanging ring at the apex */
    if (xa >= 1 && xa <= W - 2) {
      d.p(xa - 1, 5, 'g1'); d.p(xa, 5, 'g2'); d.p(xa + 1, 5, 'g1');
      d.p(xa - 1, 6, 'g2'); d.p(xa, 6, 'ink'); d.p(xa + 1, 6, 'g1');
      d.p(xa - 1, 7, 'g1'); d.p(xa, 7, 'g1'); d.p(xa + 1, 7, 'g1');
    }
  }

  /* oak tie-beam */
  d.r(0, 12, W, 1, 'b3');
  d.r(0, 13, W, 2, 'b2');
  d.r(0, 15, W, 1, 'b1');
  for (x = 0; x < W; x++) {
    var hg = rmShHash(x >> 3, 0, seed + 2);
    if (hg < 0.35 && (x & 7) < 6) d.p(x, 13, 'b1');
    else if (hg > 0.8 && (x & 7) < 5) d.p(x, 14, 'b3');
  }
  for (i = 0; i < pier.length; i++) {
    d.p(pier[i] - 1, 13, 'g2'); d.p(pier[i], 13, 'g3'); d.p(pier[i] - 1, 14, 'g1'); d.p(pier[i], 14, 'g1');
  }
  return { x: 0, y: 0, w: W, h: 16, cx: cx, pitch: P, apex: apex, pier: pier };
}

/* ============================== rmWainscot ============================== */
function rmWainscot(c, W, wallY) {
  var y0 = wallY - 18;
  var d = rmShPen(c, 0, y0, W - 1, wallY + 4);
  var x, y;
  /* body */
  d.r(0, y0, W, 18, 'b2');
  /* molded rail */
  d.r(0, y0, W, 1, 'b4');
  d.r(0, y0 + 1, W, 1, 'b3');
  d.r(0, y0 + 2, W, 1, 'g1');
  d.r(0, y0 + 3, W, 1, 'b1');
  /* panel run centred on the canvas: stile 4 + panel 24 */
  var pitch = 28, n = Math.floor((W - 4) / pitch);
  var sx0 = Math.floor((W - (n * pitch + 4)) / 2);
  var fy = y0 + 6;                     /* panel field top row */
  var fhgt = 10;                       /* panel field rows */
  var i, j, px;
  /* stiles: lit left col, face, shaded right col (run extended to both canvas edges) */
  for (x = sx0 - pitch; x < W; x += pitch) {
    d.r(x, y0 + 4, 1, 14, 'b3');
    d.r(x + 1, y0 + 4, 2, 14, 'b2');
    d.r(x + 3, y0 + 4, 1, 14, 'b1');
  }
  /* horizontal frame rails: shadow under the molding, dark bottom row */
  d.r(0, y0 + 4, W, 1, 'b1');
  d.r(0, y0 + 16, W, 1, 'b2'); d.r(0, y0 + 17, W, 1, 'b1');
  /* panels: groove, sunken dark field, lit lip on the lower/right edge */
  for (i = -1; i <= n; i++) {
    px = sx0 + 4 + i * pitch;
    d.r(px, fy, 24, fhgt, 'b1');
    d.r(px + 1, fy + 1, 22, fhgt - 2, 'b2');
    d.r(px + 2, fy + 2, 20, fhgt - 4, 'b1');
    d.r(px + 1, fy + fhgt - 2, 22, 1, 'b3'); d.r(px + 22, fy + 1, 1, fhgt - 2, 'b3');
    d.p(px + 22, fy + fhgt - 2, 'b3');
    /* carved lozenge */
    var mx = px + 12, my = fy + 4;
    d.p(mx, my - 1, 'b3'); d.p(mx - 1, my, 'b3'); d.p(mx + 1, my, 'b3'); d.p(mx, my + 1, 'b3');
    d.p(mx, my, 'b2');
    d.r(mx - 6, my, 3, 1, 'b2'); d.r(mx + 4, my, 3, 1, 'b2');
  }
  /* skirting board */
  d.r(0, wallY, W, 2, 'b3');
  d.r(0, wallY + 2, W, 2, 'b2');
  d.r(0, wallY + 4, W, 1, 'b1');
  for (x = sx0 + 12; x < W; x += 56) d.r(x, wallY + 1, 1, 3, 'b1');
  return { x: 0, y: y0, w: W, h: 23 };
}

/* ============================== rmFloor ============================== */
function rmFloor(c, W, H, wallY, seed) {
  var fy0 = wallY + 5, T = H - fy0;
  var d = rmShPen(c, 0, fy0, W - 1, H - 1);
  var rnd = rmRng((seed | 0) * 13 + 5);
  /* face, lit top edge, shaded lower edge; "dk" = the same slab in the darker zone near the bottom */
  var tones = [
    { a: 'b2', hi: 'b3', lo: 'b1', dk: { a: 'b1', hi: 'b2', lo: 'ink' } },
    { a: 'b1', hi: 'b2', lo: 'b1', dk: { a: 'b1', hi: 'b1', lo: 'ink' } },
    { a: 'st', hi: 's1', lo: 'ink', dk: { a: 'st', hi: 'st', lo: 'ink' } },
    { a: 'b2', hi: 'b3', lo: 'b1', dk: { a: 'b1', hi: 'b2', lo: 'ink' } }
  ];
  /* whole rows that end exactly at H: row heights 10..12, slightly taller towards the viewer */
  var n = Math.max(1, Math.round(T / 10.7)), ys = [fy0], q, wsum = 0, acc = 0;
  for (q = 0; q < n; q++) wsum += 1 + (n > 1 ? 0.18 * q / (n - 1) : 0);
  for (q = 0; q < n; q++) { acc += 1 + (n > 1 ? 0.18 * q / (n - 1) : 0); ys.push(q === n - 1 ? H : fy0 + Math.round(T * acc / wsum)); }
  var prev = [], row;
  var darkY = H - 26;                       /* slab rows starting below this line use the darker tones */
  for (row = 0; row < n; row++) {
    var y = ys[row], h = ys[row + 1] - y, dark = y >= darkY;
    var joints = [], x = -Math.floor(rnd() * 12), wlo = 20 + Math.floor(row / 2);
    while (x < W) {
      var w = wlo + Math.floor(rnd() * 5), tries = 0;
      while (tries < 6 && rmShNear(prev, x + w, 6)) { w = wlo + ((w - wlo + 2) % 5); tries++; }
      var tr = rnd(), ti = tr < 0.16 ? 0 : tr < 0.70 ? 1 : tr < 0.82 ? 2 : 3, t = tones[ti], tn = dark ? t.dk : t;
      var fw = w - 1, fh = h - 1;
      d.r(x, y, w, h, 'ink');
      d.r(x, y, fw, fh, tn.a);
      /* parquet-like plank slabs: two long grain lines */
      if (ti === 3) {
        var gc = dark ? 'ink' : 'b1';
        d.r(x + 2, y + 3, fw - 6, 1, gc); d.r(x + 5, y + 6, fw - 8, 1, gc);
      }
      /* lower edge shade, lit top edge */
      d.r(x, y + fh - 1, fw, 1, tn.lo);
      d.r(x, y, fw, 1, tn.hi);
      if (row === 0) {                      /* shadow under the skirting board: solid ink row + solid dark row, no dither */
        d.r(x, y, fw, 1, 'ink');
        d.r(x, y + 1, fw, 1, ti === 2 ? 'st' : 'b1');
      }
      x += w; joints.push(x);
    }
    prev = joints;
  }
  return { x: 0, y: fy0, w: W, h: H - fy0 };
}

/* ============================== rmPillar ============================== */
function rmPillar(c, x, topY, botY, w) {
  var d = rmShPen(c, x, topY, x + w - 1, botY);
  var capH = 8, baseH = 8, i, j;
  var sx = x + 1, sw = w - 2;
  var sy0 = topY + capH, sy1 = botY - baseH;       /* shaft rows */
  /* shaft: flutes with period 4 [st groove wall, s1, lit s2, s1]; the lit wall turns s1 on the
     right 30 % (shade side); ink arris on the right edge */
  var cols = [];
  for (i = 0; i < sw - 1; i++) {
    j = (i + 3) % 4;                       /* column 0 is the lit left arris (s2), flutes start at column 1 */
    var col = i === 0 ? 's2' : j === 0 ? 'st' : j === 2 ? 's2' : 's1';
    if (col === 's2' && i > (sw - 1) * 0.7) col = 's1';
    cols.push(col);
  }
  cols.push('ink');
  for (i = 0; i < sw; i++) d.r(sx + i, sy0, 1, sy1 - sy0 + 1, cols[i]);
  /* capital shadow on the shaft top (solid ink row + one solid st row) and a solid st line at the foot */
  d.r(sx, sy0, sw, 1, 'ink');
  d.r(sx, sy0 + 1, sw, 1, 'st');
  d.r(sx, sy1, sw, 1, 'st');
  /* capital: abacus (gold), bell (stone with gold leaf tips), astragal rings */
  d.r(x, topY, w, 1, 'g3'); d.p(x, topY, 'g2'); d.p(x + w - 1, topY, 'g2');
  d.r(x, topY + 1, w, 1, 'g2'); d.p(x + w - 1, topY + 1, 'g1');
  d.r(x, topY + 2, w, 1, 'g1');
  d.r(sx, topY + 3, sw, 1, 'st');
  d.r(sx, topY + 4, sw, 1, 's1'); d.p(sx, topY + 4, 's2');
  for (i = 1; i < sw - 1; i += 2) d.p(sx + i, topY + 4, 'g1');
  d.r(sx + 1, topY + 5, sw - 2, 1, 's1'); d.p(sx + 1, topY + 5, 's2'); d.p(sx + sw - 2, topY + 5, 'st');
  d.r(sx, topY + 6, sw, 1, 'g2'); d.p(sx + sw - 1, topY + 6, 'g1');
  d.r(sx, topY + 7, sw, 1, 'g1');
  /* base: gold ring, torus, plinth */
  var by = botY - baseH + 1;
  d.r(sx, by, sw, 1, 'g2'); d.p(sx + sw - 1, by, 'g1');
  d.r(sx, by + 1, sw, 1, 'g1');
  d.r(x, by + 2, w, 1, 's2'); d.p(x + w - 1, by + 2, 's1');
  d.r(x, by + 3, w, 1, 's1'); d.p(x + w - 1, by + 3, 'st');
  d.r(x, by + 4, w, 1, 's2'); d.p(x + w - 1, by + 4, 's1');
  d.r(x, by + 5, w, 2, 's1'); d.r(x, by + 5, 1, 2, 's2'); d.r(x + w - 1, by + 5, 1, 2, 'st');
  d.r(x, by + 7, w, 1, 'st');
  return { x: x, y: topY, w: w, h: botY - topY + 1 };
}

/* ============================== rmRug ============================== */
function rmRug(c, cx, cy, rx, ry, seed) {
  var bx0 = cx - rx - 5, bx1 = cx + rx + 5;
  var d = rmShPen(c, bx0, cy - ry, bx1, cy + ry);
  var a = rx + 0.5, b = ry + 0.5, x, y, i, j, g;
  var compact = ry < 18;
  var KF = compact ? 10 : 12;                 /* geometric depth (in rings) where the field starts */
  /* scanline ellipse: half-width (in whole pixels) of the ellipse with radii A, B at row yy; -1 when the row is outside */
  function hw(A, B, yy) {
    var ay = yy < 0 ? -yy : yy;
    if (B <= 0 || ay >= B) return -1;
    return Math.floor(A * Math.sqrt(1 - (ay * ay) / (B * B)));
  }
  function inE(px, py, A, B) { var h = hw(A, B, py); return h >= 0 && (px < 0 ? -px : px) <= h; }
  /* ring depth of every pixel of one quadrant: nested scanline ellipses (a-g, b-g) -> every ring is
     a closed 8-connected contour of constant thickness (painter's algorithm, like catEllipse) */
  var dep = [];
  for (y = 0; y <= ry; y++) {
    dep[y] = [];
    for (x = 0; x <= rx; x++) {
      g = -1;
      while (g < KF && inE(x, y, a - (g + 1), b - (g + 1))) g++;
      dep[y][x] = g;
    }
  }
  function depth(px, py) { px = px < 0 ? -px : px; py = py < 0 ? -py : py; return (px > rx || py > ry) ? -1 : dep[py][px]; }
  /* ordered pixel list of ring g in the quadrant x >= 0, y >= 0 (from the tip towards the top) with the
     cumulative path length of the 8-connected contour */
  function ringList(gg) {
    var list = [], px, py, A = a - gg, B = b - gg;
    for (py = 0; py <= ry; py++) for (px = 0; px <= rx; px++) {
      if (dep[py][px] === gg) list.push({ x: px, y: py, t: Math.atan2(py / B, px / A) });
    }
    list.sort(function (p, q) { return p.t - q.t || q.x - p.x; });
    var s = 0;
    for (var m = 0; m < list.length; m++) {
      if (m > 0) { var ddx = list[m].x - list[m - 1].x, ddy = list[m].y - list[m - 1].y; s += Math.sqrt(ddx * ddx + ddy * ddy); }
      list[m].s = s;
    }
    return list;
  }
  /* special pixels, keyed by quadrant coordinates */
  var ovr = {};
  function put(px, py, col) { ovr[px + ',' + py] = col; }
  /* rope ring (logical ring 2): 2 px dashes g3 / g2 along the contour */
  var rope = ringList(2);
  for (i = 0; i < rope.length; i++) put(rope[i].x, rope[i].y, (Math.floor(rope[i].s / 2) % 2 === 0) ? 'g3' : 'g2');
  /* woven band: logical rings 5..9 (geometric 5..9, or 3..7 on compact rugs); motif = plus-shaped jewel
     (n4 arms, g2 core) every ~10 px of the middle ring, with n2 beads in between */
  var gb = compact ? 3 : 5;                    /* first band ring */
  var mid = ringList(gb + 2), up = ringList(gb + 1), dn = ringList(gb + 3);
  var Lm = mid.length ? mid[mid.length - 1].s : 1, Nq = Math.max(2, Math.round(Lm / 10)), per = Lm / Nq;
  function nearest(list, target) {
    var bi = 0, bd = 1e9, m;
    for (m = 0; m < list.length; m++) { var dd0 = Math.abs(list[m].s - target); if (dd0 < bd) { bd = dd0; bi = m; } }
    return bi;
  }
  function nearestXY(list, px, py) {
    var bi = 0, bd = 1e9, m;
    for (m = 0; m < list.length; m++) { var ex = list[m].x - px, ey = list[m].y - py, dd1 = ex * ex + ey * ey; if (dd1 < bd) { bd = dd1; bi = m; } }
    return list[bi];
  }
  for (j = 0; j < Nq; j++) { var gp = mid[nearest(mid, (j + 0.5) * per)]; put(gp.x, gp.y, 'n2'); }
  for (j = 0; j <= Nq; j++) {
    var ci = nearest(mid, j * per), cp = mid[ci], up1 = nearestXY(up, cp.x, cp.y), dn1 = nearestXY(dn, cp.x, cp.y);
    put(cp.x, cp.y, 'g2');
    if (ci > 0) put(mid[ci - 1].x, mid[ci - 1].y, 'n4');
    if (ci < mid.length - 1) put(mid[ci + 1].x, mid[ci + 1].y, 'n4');
    put(up1.x, up1.y, 'n4'); put(dn1.x, dn1.y, 'n4');
  }
  /* small star lattice in the field (staggered 14 x 8), kept clear of the border and the medallion */
  var stars = {}, lx, ly, fa = a - KF, fb = b - KF;
  function starOk(px, py) { return inE(px, py, fa, fb); }
  for (ly = -ry; ly <= ry; ly++) for (lx = -rx; lx <= rx; lx++) {
    var sc = ((lx % 14 === 0) && (ly % 8 === 0)) || (((lx + 7) % 14 === 0) && ((ly + 4) % 8 === 0));
    if (!sc) continue;
    if (!inE(lx, ly, fa - 1, fb - 1) || !starOk(lx - 1, ly) || !starOk(lx + 1, ly) || !starOk(lx, ly - 1) || !starOk(lx, ly + 1)) continue;
    if (inE(lx, ly, a * 0.58, b * 0.58)) continue;
    stars[lx + ',' + ly] = 'n4'; stars[(lx - 1) + ',' + ly] = 'n3'; stars[(lx + 1) + ',' + ly] = 'n3';
    stars[lx + ',' + (ly - 1)] = 'n3'; stars[lx + ',' + (ly + 1)] = 'n3';
  }
  /* medallion: n3 ring, n1 ring, plain n2 inside, small gold jewels and a gold lozenge in the middle */
  var ma = a * 0.5, mb = fb - 1;
  for (y = -ry; y <= ry; y++) {
    for (x = -rx; x <= rx; x++) {
      g = depth(x, y);
      if (g < 0) continue;
      var k = (compact && g > 2) ? g + 2 : g, col = 'n2';
      if (k === 0) col = 'ink';
      else if (k === 1) col = 'g1';
      else if (k === 2) col = ovr[Math.abs(x) + ',' + Math.abs(y)] || 'g2';
      else if (k === 3) col = 'g1';
      else if (k === 4) col = 'n1';
      else if (k >= 5 && k <= 9) col = ovr[Math.abs(x) + ',' + Math.abs(y)] || ((k === 5 || k === 9) ? 'n2' : 'n3');
      else if (k === 10) col = 'n1';
      else if (k === 11) col = 'g1';
      else {
        col = stars[x + ',' + y] || 'n2';
        if (inE(x, y, ma, mb)) {
          col = 'n2';
          if (!inE(x, y, ma - 1, mb - 1)) col = 'n3';
          else if (!inE(x, y, ma - 2, mb - 2)) col = 'n1';
          var ax = x < 0 ? -x : x, ay = y < 0 ? -y : y, sdx = Math.round(a * 0.3);
          if (ay <= 1 && Math.abs(ax - sdx) + ay <= 1) col = (ay === 0 && ax === sdx) ? 'g2' : 'g1';
          if (ax + ay <= 3 && ay <= 2) col = (ax + ay <= 1) ? 'g2' : 'g1';
        }
      }
      d.p(cx + x, cy + y, col);
    }
  }
  /* fringe tassels at the two tips: horizontal strands hugging the contour */
  var s, ty, ln;
  for (s = -1; s <= 1; s += 2) {
    for (ty = -4; ty <= 4; ty += 2) {
      if (Math.abs(ty) > ry) continue;
      var ex2 = hw(a, b, ty);                          /* outermost column of the rug on this row */
      ln = (ty % 4 === 0) ? 5 : 4;
      for (i = 1; i <= ln; i++) d.p(cx + s * (ex2 + i), cy + ty, i === ln ? 'p1' : (i === 1 ? 'g1' : 'p2'));
      if (ty === 0) d.p(cx + s * (ex2 + 3), cy + ty, 'p3');
    }
  }
  return { x: bx0, y: cy - ry, w: 2 * rx + 11, h: 2 * ry + 1, cx: cx, cy: cy };
}
