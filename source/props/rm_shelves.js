/* ============================================================================
   rm_shelves.js  -  scholars' library props for the cat room (ES5, static art)

   Shared conventions
   - Light comes from the upper left: lit edges are on the left/top, shade on
     the right/bottom.  Every prop leaves a soft 1 px drop shadow (ink, 50 %
     alpha, globalAlpha is restored to 1) on the wall to its right and below it.
     That shadow (and the small bottle / bracket / rung shadows) are the ONLY
     translucent pixels; everything on the props themselves is opaque palette.
   - Every function draws ONLY inside its documented bounding box (the shadow is
     part of the box), uses only palette colours, only whole pixels, and is
     deterministic: the same arguments always give the same pixels.
   - Props stay quiet on purpose: dark backs (st/ink), mostly dark-body tomes,
     gold only as thin bands, bright tones (r3, n4, p4, g3) only as 1-2 px accents.
   - Every function returns the box it used: {x:, y:, w:, h:} (art pixels).
   - Props are transparent outside their silhouette, draw them over the wall.

   rmShelf(c, x, y, w, h, seed)
     Tall wooden library bookcase with carved cornice, dense rows of tomes,
     small curiosities (rolled scrolls, jar, hourglass, flat stack) and
     sometimes a cupboard with doors at the foot.
     (x,y) = top-left of the bounding box.  w = 30..56 (best 36..48),
     h = 60..110 (best 80..100).  Bounding box = exactly w x h.
     The body is (w-1) x (h-1); the LAST column (x+w-1) and the LAST row
     (y+h-1) only hold the translucent drop shadow.  The lowest solid pixel row
     is y+h-2: put that row on the floor line (y = floorLine - h + 2).
     Returns {x,y,w,h}.

   rmLadder(c, x, y, h, dir)
     Rolling library ladder: two rails with stepped lean, rungs, brass hooks
     over a short brass rail stub at the top, iron foot caps at the bottom.
     (x,y) = top-left of the bounding box.  h = 60..100 (best 70..90).
     dir (optional, default 1): 1 = the top is at the left and the feet lean
     out to the right, -1 = mirrored (top at the right, feet to the left).
     Bounding box = W x h with W = 18 + lean, lean = max(2, round(h/18)); the
     returned object carries the real W in .w.  Lowest solid row is y+h-2
     (iron caps), row y+h-1 only holds the floor shadow.
     Returns {x,y,w:W,h}.

   rmScrollWall(c, x, y, w, h, seed)
     Wooden pigeonhole rack: a grid of cubbies (about 8-10 px square, 3-4 columns) holding
     rolled scrolls seen end-on (parchment spiral ends), some with ribbons or
     wax seals, some cubbies empty and dark, a few brass label plates.
     (x,y) = top-left of the bounding box.  w = 32..44, h = 56..72
     (works for w >= 26, h >= 40).  Bounding box = exactly w x h, the last
     column / last row hold the drop shadow, lowest solid row is y+h-2.
     Returns {x,y,w,h}.

   rmPotionShelf(c, x, y, w, seed)
     Short wall shelf on two small wooden brackets with 3..6 corked potion
     bottles (red, blue, teal, amber) standing on it.
     (x,y) = top-left of the shelf BOARD (board is w x 3 px at rows y..y+2).
     w = 28..40 (works for w >= 20).  The bottles stand on row y-1 and reach up
     to 11 px (rows y-11 .. y-1); brackets hang to row y+7; row y+3 also holds
     the shadow.  Bounding box = x .. x+w-1 by y-11 .. y+7, i.e. {x:x, y:y-11,
     w:w, h:19}.  Returns that box.

   Helpers (all prefixed rmLib, private to this file): rmLibShade, rmLibRand,
   rmLibInt, rmLibSpr, rmLibTone, rmLibCornice, rmLibBase, rmLibBoard,
   rmLibRun, rmLibBookCol, rmLibBook, rmLibGapFor, rmLibRow, rmLibCurio,
   rmLibJar, rmLibBottle, rmLibDisc, rmLibScrollCell, rmLibCabinet.
   (Revision 2: plinth panels centred inside the plinth; shelf gaps are always
   filled (curiosity sized to the gap and/or a leaning book); ribbons are drawn
   on the scroll end face so the dividers cannot hide them; ladder rungs never
   straddle a lean jog; the jar is a lidded apothecary jar with a label; blue
   bottles use an n2 outline so the liquid carries the shape.)
   ========================================================================== */

/* translucent ink rectangle (used for soft shadows) */
function rmLibShade(c, x, y, w, h, a) {
  if (w <= 0 || h <= 0) return;
  c.globalAlpha = a;
  R(c, x, y, w, h, K('ink'));
  c.globalAlpha = 1;
}

/* deterministic random in [0,1) built on rmRng (never returns exactly 1) */
function rmLibRand(seed) {
  var f = rmRng(seed | 0);
  return function () { var v = f(); return v >= 0.9999 ? 0.9999 : v; };
}

/* integer in [a,b] inclusive */
function rmLibInt(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }

/* draw a character sprite: rows = array of strings, map = {char: paletteKey} */
function rmLibSpr(c, x, y, rows, map) {
  for (var j = 0; j < rows.length; j++) {
    for (var i = 0; i < rows[j].length; i++) {
      var key = map[rows[j].charAt(i)];
      if (key) { c.fillStyle = K(key); c.fillRect(x + i, y + j, 1, 1); }
    }
  }
}

/* tome colourways: i = 0 wine, 1 indigo, 2 bronze, 3 slate.
   returns [shade, body, lit, accent] palette keys; dark = darker body variant.
   The bright tones (r3, n3/n4) are kept for 1 px accents so the shelves stay
   quieter than the cat. */
function rmLibTone(i, dark) {
  var t = [
    [['b1', 'r1', 'r2', 'r3'], ['r1', 'r2', 'r2', 'r3']],
    [['n1', 'n2', 'n3', 'n4'], ['n2', 'n3', 'n3', 'n4']],
    [['b1', 'b2', 'b3', 'b4'], ['b2', 'b3', 'b4', 'b4']],
    [['ink', 's1', 's2', 's3'], ['s1', 's2', 's3', 's3']]
  ];
  return t[i][dark ? 0 : 1];
}

/* carved cornice, (x,y) top-left, w wide, ch tall (5..10) */
function rmLibCornice(c, x, y, w, ch) {
  var i, j, k;
  var dent = ch >= 7 ? 2 : 1;                       /* rows of dentil blocks */
  /* top outline and lit crown */
  R(c, x + 1, y, w - 2, 1, K('b1'));
  R(c, x, y + 1, 1, ch - 1, K('b1'));
  R(c, x + w - 1, y + 1, 1, ch - 1, K('b1'));
  R(c, x + 1, y + 1, w - 2, 1, K('b4'));
  /* dentil band: lit blocks 2 wide, 1 px dark gaps */
  for (j = 0; j < dent; j++) {
    for (i = 1; i < w - 1; i++) {
      k = (i - 1) % 3;
      var col;
      if (k === 2) col = 'b1';
      else if (j === 0) col = k === 0 ? 'b4' : 'b3';
      else col = k === 0 ? 'b3' : 'b2';
      R(c, x + i, y + 2 + j, 1, 1, K(col));
    }
  }
  /* frieze: dark band with small lit lozenges */
  var fy = y + 2 + dent;
  var fh = ch - 3 - dent;                            /* rows between dentil and bottom outline */
  if (fh > 0) {
    R(c, x + 1, fy, w - 2, fh, K('b2'));
    R(c, x + 1, fy, w - 2, 1, K('b3'));
    if (fh >= 2) {
      for (i = 3; i < w - 3; i += 6) {
        R(c, x + i, fy + 1, 1, 1, K('b4'));
        if (fh >= 3) {
          R(c, x + i - 1, fy + 2, 3, 1, K('b3'));
          R(c, x + i, fy + 2, 1, 1, K('g2'));
          if (fh >= 4) R(c, x + i, fy + 3, 1, 1, K('b3'));
        } else {
          R(c, x + i - 1, fy + 1, 1, 1, K('b3'));
          R(c, x + i + 1, fy + 1, 1, 1, K('b3'));
        }
      }
    }
  }
  R(c, x + 1, y + ch - 1, w - 2, 1, K('b1'));
}

/* plinth / base moulding, (x,y) top-left, w wide, ph tall (4..7) */
function rmLibBase(c, x, y, w, ph) {
  var j;
  R(c, x, y, 1, ph, K('b1'));
  R(c, x + w - 1, y, 1, ph, K('b1'));
  R(c, x + 1, y, w - 2, 1, K('b4'));
  R(c, x + 1, y + 1, w - 2, 1, K('b3'));
  for (j = 2; j < ph - 1; j++) R(c, x + 1, y + j, w - 2, 1, K('b2'));
  R(c, x + 1, y + ph - 1, w - 2, 1, K('b1'));
  /* shallow carved panels: 8 px wide, 4 px apart, centred, always inside the
     plinth (columns x+2 .. x+w-3) so they never touch the outline columns */
  if (ph >= 5 && w >= 16) {
    var np = Math.floor(w / 12);                       /* np*12-4 <= w-4 */
    if (np < 1) np = 1;
    var x0 = x + Math.floor((w - (np * 12 - 4)) / 2);
    for (var k = 0; k < np; k++) {
      R(c, x0 + k * 12, y + 2, 8, 1, K('b1'));
      R(c, x0 + k * 12, y + 3, 8, 1, K('b3'));
    }
  }
}

/* shelf board: 3 px thick front edge, lit on top */
function rmLibBoard(c, x0, x1, yy) {
  R(c, x0, yy, x1 - x0, 1, K('b4'));
  R(c, x0, yy + 1, x1 - x0, 1, K('b3'));
  R(c, x0, yy + 2, x1 - x0, 1, K('b2'));
}

/* ---- books -------------------------------------------------------------- */

/* a run of books that share colourway, banding and size range */
function rmLibRun(r, prevTone, maxH) {
  var tn = rmLibInt(r, 0, 3);
  if (tn === prevTone) tn = (tn + rmLibInt(r, 1, 3)) % 4;
  var pd = [0.72, 0.96, 0.5, 0.45][tn];                /* chance of the dark-body variant */
  var dark = r() < pd;
  var kind = r(), wLo, wHi;
  if (kind < 0.25) { wLo = 2; wHi = 3; }
  else if (kind < 0.75) { wLo = 3; wHi = 4; }
  else { wLo = 4; wHi = 5; }
  var hMax = Math.max(7, maxH - 1);
  var q = r(), bands = q < 0.5 ? 0 : (q < 0.78 ? 1 : (q < 0.94 ? 2 : 3));
  if (tn === 2 && bands === 0) bands = r() < 0.5 ? 1 : 2;
  if (tn === 3 && dark && bands === 0) bands = r() < 0.6 ? 1 : 2;   /* dark slate on the dark back would read as a hole */
  var tq = r();
  var t = rmLibTone(tn, dark);
  return {
    tn: tn, t: t, dark: dark, wLo: wLo, wHi: wHi,
    n: bands === 3 ? rmLibInt(r, 1, 3) : rmLibInt(r, 2, 5), hb: rmLibInt(r, 7, hMax),
    bands: bands, bandKey: r() < 0.55 ? 'g2' : 'g1', title: rmLibInt(r, 0, 2),
    tcol: tq < 0.25 ? t[3] : (tq < 0.65 ? 'p1' : 'g2')
  };
}

/* colour key of book pixel (row from top, column k) */
function rmLibBookCol(b, row, k) {
  var t = b.run.t, bw = b.w, bh = b.h, col = t[1], i;
  var darkSlate = b.run.tn === 3 && b.run.dark;         /* nearly the colour of the back: keep it readable */
  if (bw >= 3 && k === 0 && (b.lit || darkSlate)) col = t[2];
  if (k === bw - 1) col = t[0];
  /* gold bands */
  var bands = [];
  var bs = (b.plain || (b.skipBand && !darkSlate)) ? 0 : b.run.bands;
  if (bs === 1) bands = [1, bh - 3];
  else if (bs === 2) bands = [2];
  else if (bs === 3) bands = [1, 3, bh - 3];
  for (i = 0; i < bands.length; i++) {
    if (bands[i] === row) {
      col = k === bw - 1 ? 'g1' : (k === 0 && b.bandHi ? 'g3' : b.run.bandKey);
      return col;
    }
  }
  /* title marks: 1 px lighter dashes */
  if (bw >= 3 && b.run.title > 0 && k >= 1 && k <= bw - 2 && k - 1 < b.tlen) {
    var mid = bs === 0 ? Math.floor(bh / 2) : Math.floor((bh - 2) / 2) + 1;
    var tc = b.run.tcol;
    if (row === mid) return tc;
    if (b.run.title === 2 && bw >= 4 && row === mid + 2 && k - 1 < bw - 3) return tc;
  }
  return col;
}

/* draw one book: (x, yb) = left column and the row just BELOW its foot
   (the shelf board's top row); lean = signed px the top moves sideways */
function rmLibBook(c, x, yb, b, lean) {
  var top = yb - b.h;
  for (var row = 0; row < b.h; row++) {
    var off = lean ? Math.round(lean * (b.h - 1 - row) / (b.h - 1)) : 0;
    for (var k = 0; k < b.w; k++) {
      c.fillStyle = K(rmLibBookCol(b, row, k));
      c.fillRect(x + k + off, top + row, 1, 1);
    }
  }
}

/* ---- curiosities lying / standing on a shelf --------------------------- */

/* kind: 'hourglass' (5x9) 'jar' (6x7) 'scroll' (8..11 x 3 or 6) 'stack' (9..11 x 4 or 8)
   (x, yb): left column and the row just below the foot.  returns width. */
function rmLibCurio(c, r, kind, x, yb, availW) {
  var i, w;
  if (kind === 'hourglass') {
    rmLibSpr(c, x, yb - 9, [
      'GgggH',
      'spppS',
      '.sps.',
      '..q..',
      '..S..',
      '.s.s.',
      's.p.s',
      'spppS',
      'GgggH'
    ], { G: 'g3', g: 'g2', H: 'g1', s: 's2', S: 's3', p: 'p1', q: 'p2' });
    return 5;
  }
  if (kind === 'jar') {
    var hues = ['teal', 'amber', 'blue'];
    rmLibBottle(c, x, yb, 'jar', hues[rmLibInt(r, 0, 2)], 0.7, r, false);
    return 6;
  }
  if (kind === 'scroll') {
    w = availW;
    var two = r() < 0.55 && w >= 9;
    var rib = r() < 0.5 ? 'r2' : 'n3';
    var scr = function (sx, sy, len) {
      /* body, 3 px thick, left end shows the spiral */
      R(c, sx + 1, sy, len - 1, 1, K('p3'));
      R(c, sx + 1, sy + 1, len - 1, 1, K('p2'));
      R(c, sx + 1, sy + 2, len - 1, 1, K('p1'));
      R(c, sx, sy, 1, 3, K('p1'));
      R(c, sx, sy + 1, 1, 1, K('b3'));
      R(c, sx + 1, sy + 1, 1, 1, K('p1'));
      R(c, sx + len - 1, sy, 1, 3, K('p1'));
      R(c, sx + len - 1, sy + 1, 1, 1, K('p2'));
      /* ribbon tie */
      R(c, sx + len - 4, sy, 1, 3, K(rib));
      R(c, sx + len - 4, sy + 1, 1, 1, K(rib === 'r2' ? 'r3' : 'n4'));
    };
    scr(x, yb - 3, w);
    if (two) scr(x + 1, yb - 6, w - 2);
    return w;
  }
  /* stack of flat tomes */
  w = availW;
  var n = r() < 0.5 ? 2 : 1;
  var yy = yb;
  var prevTn = -1;
  for (i = 0; i < n; i++) {
    var tn = rmLibInt(r, 0, 3);
    if (tn === prevTn) tn = (tn + 1) % 4;
    prevTn = tn;
    var t = rmLibTone(tn, r() < 0.5);
    var bwid = w - (i * rmLibInt(r, 0, 2));
    var bx = x + (i === 1 ? rmLibInt(r, 0, 1) : 0);
    yy -= 4;
    R(c, bx, yy, bwid, 1, K(t[2]));            /* top cover */
    R(c, bx, yy + 1, bwid, 2, K(t[1]));
    R(c, bx, yy + 3, bwid, 1, K(t[0]));        /* bottom cover */
    R(c, bx + bwid - 3, yy + 1, 3, 2, K('p3')); /* page block on the right */
    R(c, bx + bwid - 3, yy + 2, 3, 1, K('p2'));
    R(c, bx + bwid - 3, yy, 3, 1, K(t[1]));
    R(c, bx + bwid - 3, yy + 3, 3, 1, K(t[0]));
    R(c, bx + 2, yy + 1, 1, 2, K('g2'));       /* gold band on the spine end */
  }
  return w;
}

/* ---- one shelf row of books ------------------------------------------- */

/* width of the gap that a curiosity ('' = none) plus an optional leaning book needs */
function rmLibGapFor(kind, need, leanOn) {
  if (kind) return need + 2 + (leanOn ? 3 : 0);       /* 1 px margin on each side + lean room */
  return leanOn ? 5 : 0;                               /* a book that tips into a small gap */
}

/* fill [xa, xb) with books standing on board top row yb; clear = free height.
   A gap is only ever left when it is filled: a curiosity (sized to fit), a
   leaning book, or both - never a dead hole. */
function rmLibRow(c, r, xa, xb, yb, clear, ctx) {
  var i;
  var maxH = clear - (r() < 0.2 ? 0 : 1);
  if (maxH > 13) maxH = 13;
  if (maxH < 7) maxH = 7;
  var span = xb - xa;
  var gapW = 0, side = 1, leanOn = false, kind = '', need = 0;
  if (span >= 22 && r() < 0.5) {
    side = r() < 0.65 ? 1 : -1;
    leanOn = maxH >= 8 && r() < 0.6;
    var opts = [];
    if (clear >= 10 && ctx.hg < 1) opts.push('hourglass');
    if (clear >= 8 && ctx.jar < 2) opts.push('jar', 'jar');
    opts.push('scroll', 'scroll');
    if (clear >= 9) opts.push('stack', 'stack');
    if (r() < 0.85) kind = opts[rmLibInt(r, 0, opts.length - 1)];
    need = kind === 'hourglass' ? 5 : (kind === 'jar' ? 6 :
           (kind === 'scroll' ? rmLibInt(r, 8, 10) : (kind === 'stack' ? rmLibInt(r, 9, 10) : 0)));
    gapW = rmLibGapFor(kind, need, leanOn);
    var cap = Math.floor(span * 0.55);
    while (gapW > cap && (leanOn || kind)) {            /* too wide for this bay: shrink the plan */
      if (leanOn) leanOn = false;
      else if ((kind === 'scroll' || kind === 'stack') && clear >= 8 && ctx.jar < 2) { kind = 'jar'; need = 6; }
      else { kind = ''; need = 0; }
      gapW = rmLibGapFor(kind, need, leanOn);
    }
    if (kind === 'hourglass') ctx.hg++;
    if (kind === 'jar') ctx.jar++;
  }
  var ba = xa, bb = xb;
  if (gapW) { if (side > 0) bb = xb - gapW; else ba = xa + gapW; }

  /* the leaning book (if any) is reserved first: 4..5 px wide, tall, plain wine or indigo binding */
  var leanBook = null, L = 0, leanW = 0;
  if (gapW && leanOn) {
    leanW = rmLibInt(r, 4, 5);
    var lr = rmLibRun(r, -1, maxH);
    lr.tn = rmLibInt(r, 0, 1);
    lr.t = rmLibTone(lr.tn, r() < 0.5);
    lr.bands = 0; lr.title = 1;
    var lh = rmLibInt(r, Math.max(8, maxH - 2), maxH);
    leanBook = { w: leanW, h: lh, run: lr, gb: 0, x: 0, bandHi: false, plain: true, lit: true, skipBand: true, tlen: 2 };
    L = (side > 0 ? 1 : -1) * (lh >= 11 ? 3 : 2);
  }

  var list = [], used = 0, avail = bb - ba - leanW, run = null, left = 0, prevTone = -1;
  while (avail - used >= 2) {
    var gb = 0;
    if (left <= 0) {
      run = rmLibRun(r, prevTone, maxH);
      prevTone = run.tn;
      left = run.n;
      if (list.length && r() < 0.2 && avail - used > 4) gb = 1;
    }
    var w = rmLibInt(r, run.wLo, run.wHi);
    var rem = avail - used - gb;
    if (rem < 2) break;
    if (w > rem) w = rem;
    if (rem - w === 1) w = rem;
    var dr = r(), dh = dr < 0.5 ? 0 : (dr < 0.72 ? 1 : (dr < 0.94 ? -1 : 2));
    var h = Math.max(7, Math.min(maxH, run.hb + dh));
    list.push({
      w: w, h: h, run: run, gb: gb, x: 0, bandHi: r() < 0.12, plain: false, lit: r() < 0.6, skipBand: r() < 0.2,
      tlen: Math.max(1, Math.min(w - 2, rmLibInt(r, 1, 3)))
    });
    used += w + gb;
    left--;
  }
  if (leanBook) list.push(leanBook);                    /* last = next to the gap */
  var lastIdx = list.length - 1;

  /* positions: pack away from the gap (any 1 px left over joins the gap) */
  var cx = side > 0 ? ba : bb;
  for (i = 0; i < list.length; i++) {
    if (side > 0) { cx += list[i].gb; list[i].x = cx; cx += list[i].w; }
    else { cx -= list[i].gb; cx -= list[i].w; list[i].x = cx; }
  }
  for (i = 0; i < list.length; i++) {
    rmLibBook(c, list[i].x, yb, list[i], i === lastIdx ? L : 0);
  }

  /* curiosity in the gap, clear of the leaning book's top */
  if (gapW && kind && lastIdx >= 0) {
    var gs, ge;
    if (side > 0) { gs = list[lastIdx].x + list[lastIdx].w + 1 + Math.abs(L); ge = xb; }
    else { gs = xa; ge = list[lastIdx].x - 1 - Math.abs(L); }
    var aw = ge - gs;
    if (aw >= need) {
      var px = gs + rmLibInt(r, 0, aw - need);
      return rmLibCurio(c, r, kind, px, yb, need);
    }
  }
  return 0;
}

/* ---- cupboard doors ---------------------------------------------------- */

function rmLibCabinet(c, x0, x1, y0, y1) {
  var W = x1 - x0, H = y1 - y0;
  var dw = Math.floor((W - 1) / 2);
  var xs = [x0, x1 - dw];
  R(c, x0, y0, W, H, K('b1'));
  for (var d = 0; d < 2; d++) {
    var dx = xs[d];
    R(c, dx, y0 + 1, dw, H - 1, K('b3'));
    R(c, dx, y0 + 1, dw, 1, K('b4'));
    R(c, dx, y0 + 1, 1, H - 1, K('b4'));
    R(c, dx + dw - 1, y0 + 1, 1, H - 1, K('b2'));
    R(c, dx, y0 + H - 1, dw, 1, K('b2'));
    /* sunk panel */
    R(c, dx + 2, y0 + 3, dw - 4, H - 6, K('b2'));
    R(c, dx + 2, y0 + 3, dw - 4, 1, K('b1'));
    R(c, dx + 2, y0 + 3, 1, H - 6, K('b1'));
    R(c, dx + dw - 3, y0 + 4, 1, H - 7, K('b3'));
    R(c, dx + 3, y0 + H - 4, dw - 5, 1, K('b3'));
  }
  /* brass knobs */
  var ky = y0 + Math.floor(H / 2);
  R(c, xs[0] + dw - 4, ky, 2, 2, K('g2'));
  R(c, xs[0] + dw - 4, ky, 1, 1, K('g3'));
  R(c, xs[1] + 2, ky, 2, 2, K('g2'));
  R(c, xs[1] + 2, ky, 1, 1, K('g3'));
}

/* ============================================================================
   rmShelf
   ========================================================================== */
function rmShelf(c, x, y, w, h, seed) {
  var r = rmLibRand(seed);
  var i, j;
  w = Math.max(w | 0, 26);
  h = Math.max(h | 0, 48);
  var bw = w - 1, bhh = h - 1;                        /* body size (shadow takes the last col/row) */
  var cH = h >= 84 ? 9 : (h >= 68 ? 8 : 7);          /* cornice height */
  var pH = h >= 84 ? 6 : 5;                           /* base height */
  var postW = 4;

  /* drop shadow: silhouette moved by (1,1) minus the silhouette */
  var sil = function (px, py) {
    if (py < 0 || py >= bhh) return false;
    if (py < cH || py >= bhh - pH) return px >= 0 && px < bw;
    return px >= 1 && px < bw - 1;
  };
  c.globalAlpha = 0.5;
  c.fillStyle = K('ink');
  for (j = 0; j < h; j++) {
    for (i = 0; i < w; i++) {
      if (sil(i - 1, j - 1) && !sil(i, j)) c.fillRect(x + i, y + j, 1, 1);
    }
  }
  c.globalAlpha = 1;

  /* carcass: dark inner back and posts */
  var top = y + cH, baseTop = y + h - 1 - pH;
  var ix0 = x + 1 + postW, ix1 = x + bw - 1 - postW;  /* interior columns [ix0, ix1) */
  R(c, ix0, top, ix1 - ix0, baseTop - top, K('st'));
  /* left post (lit), right post (shade) */
  R(c, x + 1, top, 1, baseTop - top, K('b1'));
  R(c, x + 2, top, 1, baseTop - top, K('b4'));
  R(c, x + 3, top, 1, baseTop - top, K('b3'));
  R(c, x + 4, top, 1, baseTop - top, K('b2'));
  R(c, x + bw - 5, top, 1, baseTop - top, K('b3'));
  R(c, x + bw - 4, top, 1, baseTop - top, K('b3'));
  R(c, x + bw - 3, top, 1, baseTop - top, K('b2'));
  R(c, x + bw - 2, top, 1, baseTop - top, K('b1'));

  /* bays */
  var bays = [[ix0, ix1]];
  if (ix1 - ix0 >= 42) {
    var mid = Math.floor((ix0 + ix1) / 2);
    bays = [[ix0, mid - 1], [mid + 1, ix1]];
    R(c, mid - 1, top, 1, baseTop - top, K('b3'));
    R(c, mid, top, 1, baseTop - top, K('b2'));
    R(c, mid + 1, top, 1, 0, K('b2'));
  }

  /* rows of shelves */
  var A = baseTop - top;
  var n = Math.max(1, Math.round((A + 3) / 14));
  while (n > 1 && (A + 3) / n < 12) n--;
  while ((A + 3) / n > 16 && n < 12) n++;
  var cab = h >= 76 && n >= 4 && r() < 0.45;

  var ctx = { hg: 0, jar: 0 };
  var cells = [];
  for (i = 0; i < n; i++) {
    var s0 = Math.round(i * (A + 3) / n), e0 = Math.round((i + 1) * (A + 3) / n);
    cells.push({ y0: top + s0, yb: top + e0 - 3, clear: e0 - s0 - 3 });
  }
  cells[n - 1].yb = baseTop;
  cells[n - 1].clear = baseTop - cells[n - 1].y0;

  for (i = 0; i < n; i++) {
    var cl = cells[i];
    var isCab = cab && i === n - 1;
    for (var b = 0; b < bays.length; b++) {
      var bx0 = bays[b][0], bx1 = bays[b][1];
      if (isCab) { rmLibCabinet(c, bx0, bx1, cl.y0, cl.yb); continue; }
      /* ceiling shadow, dithered */
      var al = [1, 0.7, 0.42, 0.2];
      for (j = 0; j < 4 && j < cl.clear; j++) {
        for (var px = bx0; px < bx1; px++) {
          if (bay(px, cl.y0 + j) < al[j]) R(c, px, cl.y0 + j, 1, 1, K('ink'));
        }
      }
      R(c, bx0, cl.y0, 1, cl.yb - cl.y0, K('ink'));       /* shadow of the post on the books */
      rmLibRow(c, r, bx0 + 1, bx1 - 1, cl.yb, cl.clear, ctx);
    }
    if (i < n - 1) rmLibBoard(c, ix0, ix1, cl.yb);
  }
  if (bays.length === 2) {
    /* keep the divider crisp over the shading */
    var m2 = bays[0][1];
    R(c, m2, top, 1, baseTop - top, K('b3'));
    R(c, m2 + 1, top, 1, baseTop - top, K('b2'));
  }

  rmLibCornice(c, x, y, bw, cH);
  rmLibBase(c, x, baseTop, bw, pH);
  return { x: x, y: y, w: w, h: h };
}

/* ============================================================================
   rmLadder
   ========================================================================== */
function rmLadder(c, x, y, h, dir) {
  var i, j;
  h = Math.max(h | 0, 40);
  dir = dir < 0 ? -1 : 1;
  var lean = Math.max(2, Math.round(h / 18));
  var RW = 14, stub = 2, W = RW + 2 * stub + lean;
  var off = function (r) {
    var o = Math.round(lean * r / (h - 3));
    return dir > 0 ? o : lean - o;
  };
  var base = x + stub;                                /* left rail column at row 0 */
  var railTop = 4, railBot = h - 4;                   /* rails occupy rows [railTop, railBot) */

  /* wall shadow on the right of the right rail, floor shadow below the feet */
  for (j = railTop; j < railBot; j++) {
    rmLibShade(c, base + off(j) + RW, y + j + 1, 1, 1, 0.45);
  }
  rmLibShade(c, base + off(h - 3) + 1, y + h - 1, RW + 1, 1, 0.5);

  /* rails */
  for (j = railTop; j < railBot; j++) {
    var o = base + off(j);
    R(c, o, y + j, 1, 1, K('b4'));
    R(c, o + 1, y + j, 1, 1, K('b3'));
    R(c, o + 2, y + j, 1, 1, K('b1'));
    R(c, o + RW - 3, y + j, 1, 1, K('b4'));
    R(c, o + RW - 2, y + j, 1, 1, K('b3'));
    R(c, o + RW - 1, y + j, 1, 1, K('b1'));
  }
  /* rungs, evenly spread from just below the hooks to just above the feet.
     A rung (2 rows + its shadow row) must not straddle a 1 px lean jog, or its
     rows would shear: nudge it by up to 2 px until all three rows share one offset. */
  var first = railTop + 7, last = railBot - 7;
  var nr = Math.max(3, Math.round((last - first) / 9) + 1);
  for (i = 0; i < nr; i++) {
    var rung = first + Math.round(i * (last - first) / (nr - 1));
    var nudge = [0, 1, -1, 2, -2];
    for (j = 0; j < nudge.length; j++) {
      var rt = rung + nudge[j];
      if (rt >= railTop + 5 && rt + 2 < railBot - 3 && off(rt) === off(rt + 1) && off(rt) === off(rt + 2)) { rung = rt; break; }
    }
    var ro = base + off(rung);
    R(c, ro + 3, y + rung, RW - 6, 1, K('b4'));
    R(c, ro + 3, y + rung + 1, RW - 6, 1, K('b2'));
    /* soft shadow under the rung */
    rmLibShade(c, ro + 3, y + rung + 2, RW - 6, 1, 0.35);
  }

  /* brass rail stub across the top and the two hooks gripping it */
  var sx = x + (dir > 0 ? 0 : lean);
  R(c, sx, y + 1, RW + 2 * stub, 1, K('g2'));
  R(c, sx, y + 2, RW + 2 * stub, 1, K('g1'));
  for (var hk = 0; hk < 2; hk++) {
    var hx = base + off(0) + (hk ? RW - 3 : 0);
    rmLibSpr(c, hx, y, [
      'GGg',
      'ggH',
      'gaH',
      'gHH'
    ], { G: 'g3', g: 'g2', H: 'g1', a: 'g1' });
  }
  /* iron foot caps */
  for (hk = 0; hk < 2; hk++) {
    var fx = base + off(h - 4) + (hk ? RW - 3 : 0);
    R(c, fx, y + h - 4, 3, 1, K('s3'));
    R(c, fx, y + h - 3, 3, 1, K('s2'));
    R(c, fx, y + h - 2, 3, 1, K('s1'));
    R(c, fx + 2, y + h - 3, 1, 2, K('st'));
  }
  return { x: x, y: y, w: W, h: h };
}

/* ============================================================================
   rmScrollWall
   ========================================================================== */

/* rolled scroll seen end-on, d = 4, 5 or 6 px across; (x,y) top-left
   deco: 0 none, 1 blue ribbon, 2 red ribbon, 3 wax seal */
function rmLibDisc(c, x, y, d, aged, deco) {
  var m = aged
    ? { o: 'b3', b: 'p1', h: 'p2', s: 'b2', t: 'p3' }
    : { o: 'p1', b: 'p2', h: 'p3', s: 'b3', t: 'p4' };
  var rows;
  if (d === 4) rows = ['.oo.', 'otbo', 'obso', '.oo.'];
  else if (d === 5) rows = ['.ooo.', 'othbo', 'obsso', 'obbso', '.ooo.'];
  else rows = ['.oooo.', 'othhbo', 'ohssbo', 'obsbbo', 'obbbso', '.oooo.'];
  rmLibSpr(c, x, y, rows, m);
  if (deco === 1 || deco === 2) {
    /* ribbon tied round the roll: a 1 px band across the whole end face, drawn
       INSIDE the disc so the cubby dividers can never paint over it; one lighter
       pixel near the top is the highlight on the knot */
    var rc = deco === 1 ? 'n3' : 'r2', rl = deco === 1 ? 'n4' : 'r3';
    var rx = x + Math.floor(d / 2);
    R(c, rx, y, 1, d, K(rc));
    R(c, rx, y + 1, 1, 1, K(rl));
  } else if (deco === 3) {
    R(c, x + d - 2, y + d - 2, 2, 2, K('r2'));
    R(c, x + d - 2, y + d - 2, 1, 1, K('r3'));
  }
}

/* one cubby interior at (cx,cy) size cw x ch */
function rmLibScrollCell(c, r, cx, cy, cw, ch) {
  R(c, cx, cy, cw, ch, K('st'));
  R(c, cx, cy, cw, 1, K('ink'));
  R(c, cx, cy, 1, ch, K('ink'));
  R(c, cx, cy + ch - 1, cw, 1, K('b1'));
  var kind = r();
  var floor = cy + ch - 1;                            /* scrolls rest on the floor row */
  var deco = function () {
    var q = r();
    return q < 0.6 ? 0 : (q < 0.73 ? 1 : (q < 0.85 ? 2 : 3));
  };
  var fit = function (d) { return Math.max(4, Math.min(d, cw - 1, ch - 2)); };
  if (kind < 0.13) return;                            /* empty and dark */
  if (kind < 0.5 || ch < 8 || cw < 7) {               /* single, as large as the cubby allows */
    var d = fit(r() < 0.65 ? 6 : 5);
    rmLibDisc(c, cx + rmLibInt(r, 1, Math.max(1, cw - d)), floor - d + 1, d, r() < 0.5, deco());
    return;
  }
  if (kind < 0.92 || ch < 9 || cw < 9) {              /* pair, side by side on the floor */
    var dp = fit(cw >= 9 ? 5 : 4);
    rmLibDisc(c, cx, floor - dp + 1, dp, r() < 0.5, deco());
    rmLibDisc(c, cx + cw - dp, floor - dp + 1, dp, r() < 0.5, deco());
    return;
  }
  /* pile of three */
  var dt = (cw >= 10 && ch >= 10) ? 5 : 4;
  rmLibDisc(c, cx + Math.floor((cw - dt) / 2), floor - 2 * dt + 2, dt, r() < 0.5, deco());
  rmLibDisc(c, cx, floor - dt + 1, dt, r() < 0.5, 0);
  rmLibDisc(c, cx + cw - dt, floor - dt + 1, dt, r() < 0.5, deco());
}

function rmScrollWall(c, x, y, w, h, seed) {
  var r = rmLibRand(seed);
  var i, j;
  w = Math.max(w | 0, 26);
  h = Math.max(h | 0, 40);
  var bw = w - 1, bh = h - 1;
  var tB = 5, bB = 4;

  /* drop shadow right and below */
  rmLibShade(c, x + bw, y + 1, 1, bh, 0.5);
  rmLibShade(c, x + 1, y + bh, bw - 1, 1, 0.5);

  /* frame */
  var ix0 = x + 3, ix1 = x + bw - 3, iy0 = y + tB, iy1 = y + bh - bB;
  R(c, x, iy0, bw, iy1 - iy0, K('b1'));
  R(c, x + 1, iy0, 1, iy1 - iy0, K('b1'));
  R(c, x + 1, iy0, 1, iy1 - iy0, K('b4'));
  R(c, x + 2, iy0, 1, iy1 - iy0, K('b3'));
  R(c, x + bw - 3, iy0, 1, iy1 - iy0, K('b3'));
  R(c, x + bw - 2, iy0, 1, iy1 - iy0, K('b2'));
  R(c, x + bw - 1, iy0, 1, iy1 - iy0, K('b1'));
  R(c, x, iy0, 1, iy1 - iy0, K('b1'));

  var iw = ix1 - ix0, ih = iy1 - iy0;
  var nc = Math.max(2, Math.round((iw + 1) / 10));
  var nr = Math.max(2, Math.round((ih + 2) / 11.4));
  var cwTotal = iw - (nc - 1);
  var chTotal = ih - (nr - 1) * 2;

  /* column / row sizes */
  var cx = [], cwid = [], p = ix0;
  for (i = 0; i < nc; i++) {
    var cw = Math.round((i + 1) * cwTotal / nc) - Math.round(i * cwTotal / nc);
    cx.push(p); cwid.push(cw); p += cw + 1;
  }
  var cy = [], chei = [];
  p = iy0;
  for (j = 0; j < nr; j++) {
    var ch = Math.round((j + 1) * chTotal / nr) - Math.round(j * chTotal / nr);
    cy.push(p); chei.push(ch); p += ch + 2;
  }

  /* wood behind the grid then the cubbies */
  R(c, ix0, iy0, iw, ih, K('b3'));
  for (j = 0; j < nr; j++) {
    for (i = 0; i < nc; i++) rmLibScrollCell(c, r, cx[i], cy[j], cwid[i], chei[j]);
  }
  /* horizontal dividers: lit top edge, shaded front */
  for (j = 0; j < nr - 1; j++) {
    var dy = cy[j] + chei[j];
    R(c, ix0, dy, iw, 1, K('b4'));
    R(c, ix0, dy + 1, iw, 1, K('b2'));
  }
  /* vertical dividers */
  for (i = 0; i < nc - 1; i++) {
    var dx = cx[i] + cwid[i];
    R(c, dx, iy0, 1, ih, K('b3'));
  }
  /* brass label plates on some dividers */
  for (j = 0; j < nr - 1; j++) {
    for (i = 0; i < nc; i++) {
      if (r() < 0.3) {
        var lx = cx[i] + Math.floor(cwid[i] / 2) - 1;
        R(c, lx, cy[j] + chei[j] + 1, 2, 1, K('g2'));
        R(c, lx + 2, cy[j] + chei[j] + 1, 1, 1, K('g1'));
      }
    }
  }

  rmLibCornice(c, x, y, bw, tB);
  rmLibBase(c, x, y + bh - bB, bw, bB);
  return { x: x, y: y, w: w, h: h };
}

/* ============================================================================
   rmPotionShelf
   ========================================================================== */

/* apothecary jar, 6x7: narrow brass lid, short neck, rounded body of liquid with
   a parchment label across the middle.  (x, yb) as for rmLibBottle; H = hue table. */
function rmLibJar(c, x, yb, H, lid) {   /* lid: true = pewter lid (for amber liquid), false = brass */
  rmLibSpr(c, x, yb - 7, [
    '.LLLL.',
    '.lllk.',
    '.oHho.',
    'oHmmdo',
    'oPPppo',
    'ommmdo',
    '.oooo.'
  ], { L: lid ? 's3' : 'g3', l: lid ? 's2' : 'g2', k: lid ? 's1' : 'g1', o: H.o, H: H.h, h: H.m, m: H.m, d: H.d, P: 'p3', p: 'p2' });
  return 6;
}

/* hue: 'red' 'blue' 'teal' 'amber'.  shapes: 'round' 6x10, 'vial' 4x10,
   'squat' 6x8, 'tall' 5x10, 'jar' 6x7 (wide brass lid).
   (x, yb): left column and the row just below the bottle's foot. */
function rmLibBottle(c, x, yb, shape, hue, level, r, shadow) {
  var H = {
    red:   { o: 'r1', m: 'r2', h: 'r3', d: 'r1', g: 'r3' },
    blue:  { o: 'n2', m: 'n3', h: 'n4', d: 'n3', g: 'ez', e: 'n1' },
    teal:  { o: 'ed', m: 'ey', h: 'ez', d: 'ed', g: 'ez' },
    amber: { o: 'g1', m: 'g2', h: 'g3', d: 'g1', g: 'g3' }
  }[hue];
  var masks = {
    round: { w: 6, h: 10, ck: 2, m: ['.####.', '.####.', '.####.', '######', '######', '######', '######', '.####.'], c0: 2 },
    vial:  { w: 4, h: 10, ck: 2, m: ['.##.', '####', '####', '####', '####', '####', '####', '####'], c0: 2 },
    squat: { w: 6, h: 8, ck: 2, m: ['.####.', '######', '######', '######', '######', '.####.'], c0: 2 },
    tall:  { w: 5, h: 11, ck: 2, m: ['.###.', '.###.', '#####', '#####', '#####', '#####', '#####', '#####', '.###.'], c0: 2 }
  };
  if (shape === 'jar') return rmLibJar(c, x, yb, H, hue === 'amber');
  var s = masks[shape];
  var top = yb - s.h;                                 /* top row of the sprite */
  var gy = top + s.ck;                                /* first glass row */
  var gm = s.m, nrows = gm.length, i, j;
  var isG = function (px, py) {
    if (py < 0 || py >= nrows || px < 0 || px >= s.w) return false;
    return gm[py].charAt(px) === '#';
  };
  /* soft shadow on the wall to the right of the glass (not on a shelf back) */
  if (shadow) {
    c.globalAlpha = 0.3; c.fillStyle = K('ink');
    for (j = 0; j < nrows; j++) for (i = 0; i < s.w; i++) {
      if (isG(i, j) && !isG(i + 1, j)) c.fillRect(x + i + 1, gy + j, 1, 1);
    }
    c.globalAlpha = 1;
  }
  /* interior rows (those with at least one non-edge glass pixel) */
  var intRows = [];
  for (j = 0; j < nrows; j++) {
    var has = false;
    for (i = 0; i < s.w; i++) if (isG(i, j) && isG(i - 1, j) && isG(i + 1, j) && isG(i, j - 1) && isG(i, j + 1)) has = true;
    if (has) intRows.push(j);
  }
  /* liquid fills the bottom rows of the interior in the wide part */
  var wide = [];
  for (j = 0; j < intRows.length; j++) wide.push(intRows[j]);
  var liquidRows = Math.max(1, Math.round(wide.length * level));
  var firstLiquid = wide[wide.length - liquidRows];
  for (j = 0; j < nrows; j++) {
    for (i = 0; i < s.w; i++) {
      if (!isG(i, j)) continue;
      var inner = isG(i - 1, j) && isG(i + 1, j) && isG(i, j - 1) && isG(i, j + 1);
      var col;
      if (!inner) {
        col = H.o;
      } else if (j >= firstLiquid) {
        col = H.m;
        if (j === firstLiquid) col = H.h;
        else if (!isG(i + 1, j) || !isG(i + 2, j)) col = H.d;
        if (j === firstLiquid + 1 && !isG(i - 2, j)) col = H.g;
      } else {
        col = H.e || 's1';                             /* empty glass above the liquid */
        if (!isG(i - 2, j) && j === intRows[0]) col = 's3';
      }
      R(c, x + i, gy + j, 1, 1, K(col));
    }
  }
  /* cork */
  var kx = x + Math.floor((s.w - 2) / 2);
  var cork = r ? r() : 0.5;
  if (cork < 0.2) { R(c, kx, top, 2, 2, K('g2')); R(c, kx, top, 2, 1, K('g3')); }
  else if (cork < 0.35) { R(c, kx, top, 2, 2, K('r2')); R(c, kx, top, 1, 1, K('r3')); }
  else { R(c, kx, top, 2, 2, K('b3')); R(c, kx, top, 2, 1, K('b4')); R(c, kx + 1, top + 1, 1, 1, K('b2')); }
  return s.w;
}

function rmPotionShelf(c, x, y, w, seed) {
  var r = rmLibRand(seed);
  var i, j;
  w = Math.max(w | 0, 20);
  /* shadow: below the board and brackets, right of the brackets */
  rmLibShade(c, x + 1, y + 3, w - 1, 1, 0.5);
  /* brackets: small inverted corbels under the board */
  var bxs = [x + 3, x + w - 8];
  for (i = 0; i < 2; i++) {
    var bx = bxs[i];
    rmLibSpr(c, bx, y + 3, [
      'BBBBb',
      '.BBbk',
      '.Bbk.',
      '..bk.',
      '..k..'
    ], { B: 'b3', b: 'b2', k: 'b1' });
    rmLibShade(c, bx + 5, y + 4, 1, 2, 0.4);
  }
  /* board */
  R(c, x, y, w, 1, K('b4'));
  R(c, x, y + 1, w, 1, K('b3'));
  R(c, x, y + 2, w, 1, K('b2'));
  R(c, x, y + 1, 1, 2, K('b4'));
  R(c, x + w - 1, y, 1, 3, K('b1'));

  /* bottles: as many as fit with 1..3 px gaps (3..6), group centred on the board */
  var shapes = ['round', 'vial', 'squat', 'tall', 'round'];
  var hues = ['red', 'blue', 'teal', 'amber'];
  var nFit = Math.max(3, Math.min(6, Math.floor((w - 2) / 6)));
  var n = Math.max(3, nFit - (r() < 0.3 ? 1 : 0));
  var items = [], total = 0, prevH = -1;
  for (i = 0; i < n; i++) {
    var sh = shapes[rmLibInt(r, 0, shapes.length - 1)];
    var sw = { round: 6, vial: 4, squat: 6, tall: 5 }[sh];
    var hu = rmLibInt(r, 0, 3);
    if (hu === prevH) hu = (hu + 1) % 4;
    if (total + sw + items.length > w - 4) break;     /* each gap is at least 1 px */
    prevH = hu;
    items.push({ sh: sh, w: sw, hue: hues[hu], lv: 0.55 + r() * 0.4, gap: 1 });
    total += sw;
  }
  var free = w - 4 - total - (items.length - 1);      /* spare px beyond 1 px gaps */
  for (i = 1; i < items.length && free > 0; i++) {    /* spread the spare px, at most 3 px per gap */
    var add = Math.min(2, free, rmLibInt(r, 0, 2));
    items[i].gap += add; free -= add;
  }
  var span = total;
  for (i = 1; i < items.length; i++) span += items[i].gap;
  var cx = x + 2 + Math.floor((w - 4 - span) / 2);
  for (i = 0; i < items.length; i++) {
    if (i > 0) cx += items[i].gap;
    rmLibBottle(c, cx, y, items[i].sh, items[i].hue, items[i].lv, r, true);
    cx += items[i].w;
  }
  return { x: x, y: y - 11, w: w, h: 19 };
}
