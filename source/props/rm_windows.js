/* ============================================================================
   rm_windows.js  -  arched library-hall windows, curtains and their animation
   ES5, plain JS. Uses only: K, R, clamp, bay, rmRng (see rm_common.js / page helpers).
   Global names: rmArchWindow, rmCurtains, rmWindowDyn, rmWinGeom, rmWinIn, rmWinInOuter.
   All art coordinates are integer art pixels; (0,0) is the canvas top-left.
   Palette: sky = ink, n1, n2 (n3 only in the moon halo); stone s1-s4/st; lattice b2/b3;
   lit windows g1-g3; moon p2-p4 with s3 craters; clouds n2; stars n4/p3/p4; drapes r1-r3; rod g1-g3.

   ---------------------------------------------------------------------------
   rmArchWindow(c, x, y, w, h, kind, seed)            [static, draw once]
     c      2D context.
     x, y   TOP-LEFT of the outer stone frame (the keystone's top edge is row y).
     w, h   size of the frame box. Designed for w 30-40 / h 56-72, scales from
            w 26 up to w 48 (h should be >= w*1.5 and >= 52).
            The box x..x+w-1, y..y+h-1 contains everything except:
              - the sill overhangs 2 px on each side (columns x-2 and x+w+1),
              - the sill shadow: two ink rows right under the box (row y+h solid
                over columns x+1..x+w-2, row y+h+1 every other column over
                x+2..x+w-3).
              Nothing else is painted outside the box (no glow, no light beam).
              Exact painted extent = returned `ext` = columns x-2..x+w+1, rows y..y+h+1.
     kind   'city'  : night sky (ink in the arch, n1 in the upper pane, n2 below the
                      lower bar after a 2-row ordered-dither step hidden by the bar),
                      crescent moon (p3/p4) with a faint halo (n2 disc, sparse n3
                      dots on its rim), two-layer skyline (n1 far, ink near) with a
                      few lit windows (g3/g2/g1), 2 horizontal bars + 1 vertical bar
                      + round fan lattice in the arch.
            'tower' : large pale moon (p3/p4, s3 craters) with halo, three layers
                      of hills (s1, st, ink), a lone wizard tower with one lit
                      window (g3), 1 horizontal bar + 1 vertical bar + fan lattice,
                      and two faint cloud wisps below the moon (animated by
                      rmWindowDyn). Sky: ink in the arch, flat n1 below the transom.
            (anything else is treated as 'city')
     seed   integer; fixes skyline, star positions, which side the moon is on
            (seed odd = moon in the left pane, even = right pane), etc.
     Anatomy (outer stone frame): ink-ish outline, lit upper-left edges, voussoir
       joints around the arch, block joints down the jambs, a 2 px protruding
       keystone, a 4 px projecting sill (3 rows lit top / face / outline).
       Frame thickness fr = clamp(round(w/8),3,6); the arch is a true semicircle
       of outer radius w/2.
     Returns { gx, gy, gw, gh, kind, stars, clouds, mask, seed, x, y, w, h, ext }
       gx,gy,gw,gh  absolute glass RECTANGLE: gx = x+fr, gw = w-2*fr, gy = y+2+fr
                    (top of the arch apex), gy+gh = first row of the sill. The
                    visible glass is the rectangle with a semicircular top
                    (radius gw/2) so its top corners are stone.
       kind         'city' | 'tower'
       stars        [{x,y,ph,per,big}] absolute pixel of each star; ph radians,
                    per ms (6000-13000), big = may show as a plus shape. Always
                    on open sky with its neighbourhood (1 px; 3 px for 'big' ones)
                    clear of lattice, moon, moon halo and silhouettes.
       clouds       [] for 'city'; for 'tower' 2 wisps {y,x0,len,per,streaks}, where
                    streaks = [{dy,s,len,col}] are solid 1 px rows (col is a palette key)
                    forming a tapered lens around row y; per = ms per 1 px of drift.
       mask         flat array gw*gh (index (py-gy)*gw+(px-gx)):
                    1 = open sky pixel (stars and clouds may draw here),
                    2 = moon disc + 1 px rim (no stars; clouds would be allowed over it, but
                        the two wisps hang below the halo, so they never reach it),
                    0 = stone / lattice / silhouette (nothing animated draws here).
       ext          {x0,y0,x1,y1} true painted extent incl. sill overhang and
                    shadow (x1,y1 exclusive).
   ---------------------------------------------------------------------------
   rmCurtains(c, x, y, w, h)                          [static, draw after the window]
     (x,y,w,h) = the frame box passed to rmArchWindow. Draws wine-red (r1,r2,r3)
     drapes, tied back with gold bands, left and right, a gold (g2,g3) rod and two
     ball finials. Overlaps the frame by 2 px on each side.
     Painted extent: columns x-10 .. x+w+9, rows y-6 .. y+h+2
       (drapes x-8 .. x+1 and x+w-2 .. x+w+7 = 8 px outside the box; the rod
        y-5..y-4 runs x-6..x+w+5 and its ball finials (x-10..x-7, x+w+6..x+w+9,
        rows y-6..y-3) cap its ends over the drapes' outer edges; hem y+h+2).
     Together with the window the whole assembly occupies columns x-10 .. x+w+9
     (the sill's x-2..x+w+1 lies inside that), rows y-6 .. y+h+1/+2.
     Returns nothing.
   ---------------------------------------------------------------------------
   rmWindowDyn(c, win, now)                           [animated, every frame]
     win = the object returned by rmArchWindow, now = ms. Draws ONLY animated
     pixels, on top of the (re-blitted) static scene: twinkling stars (a slow
     n4 -> p3 -> p4 swell, never fully off, periods 6-13 s, a plus shape at the very
     peak for the 'big' ones; ~5 pixel changes per second in a 34x66 window) and,
     for kind 'tower', the drifting cloud wisps (n2 on the n1 sky, 1 px per 3.3-5 s,
     wrapped around the glass). Everything is clipped by win.mask, so it never touches
     the lattice, silhouettes or stone (mask 0); stars additionally keep off the moon (mask 2).
     Returns nothing.
   ============================================================================ */

/* ---- geometry ------------------------------------------------------------ */
function rmWinGeom(x, y, w, h) {
  var kt = 2, fr = clamp(Math.round(w / 8), 3, 6), sillH = 4, ro = w / 2;
  var g = { x: x, y: y, w: w, h: h, kt: kt, fr: fr, sillH: sillH, ro: ro, ri: ro - fr,
            cx: x + w / 2, cy: y + kt + ro, gx: x + fr, gy: y + kt + fr, gw: w - 2 * fr };
  g.gh = y + h - sillH - g.gy;
  return g;
}
/* pixel (px,py) inside the glass (rectangle with semicircular top)? */
function rmWinIn(g, px, py) {
  if (px < g.gx || px >= g.gx + g.gw || py < g.gy || py >= g.gy + g.gh) return false;
  var yc = py + 0.5;
  if (yc >= g.cy) return true;
  var dx = px + 0.5 - g.cx, dy = yc - g.cy;
  return dx * dx + dy * dy <= g.ri * g.ri;
}
/* pixel inside the outer stone shape (arch + jambs, without keystone and sill)? */
function rmWinInOuter(g, px, py) {
  if (px < g.x || px >= g.x + g.w || py < g.y + g.kt || py >= g.y + g.h - g.sillH) return false;
  var yc = py + 0.5;
  if (yc >= g.cy) return true;
  var dx = px + 0.5 - g.cx, dy = yc - g.cy;
  return dx * dx + dy * dy <= g.ro * g.ro;
}

/* ---- the window ---------------------------------------------------------- */
function rmArchWindow(c, x, y, w, h, kind, seed, moon) {
  kind = kind === 'tower' ? 'tower' : 'city';
  var withMoon = moon !== false;                     /* false: moonless sky (the one Moon is visible in another window) */
  seed = seed | 0;
  var g = rmWinGeom(x, y, w, h);
  var rng = rmRng(seed * 7919 + (kind === 'tower' ? 31 : 17));
  var gx = g.gx, gy = g.gy, gw = g.gw, gh = g.gh, gb = gy + gh, cx = g.cx, cy = g.cy;
  var mask = [], i, j, px, py, k;
  for (i = 0; i < gw * gh; i++) mask[i] = 0;
  for (py = gy; py < gb; py++) for (px = gx; px < gx + gw; px++) mask[(py - gy) * gw + (px - gx)] = rmWinIn(g, px, py) ? 1 : 0;
  function inG(qx, qy) { return rmWinIn(g, qx, qy); }
  function outer(qx, qy) { return rmWinInOuter(g, qx, qy); }
  function put(qx, qy, col) { if (!inG(qx, qy)) return; R(c, qx, qy, 1, 1, col); mask[(qy - gy) * gw + (qx - gx)] = 0; }
  function soft(qx, qy, col) { if (!inG(qx, qy)) return; R(c, qx, qy, 1, 1, col); }
  function open(qx, qy) { return qx >= gx && qx < gx + gw && qy >= gy && qy < gb && mask[(qy - gy) * gw + (qx - gx)] === 1; }
  function halo(mx, my, rm, r1, r2) {  /* faint stepped halo, integer pixels only: sparse n3 just outside the moon disc rm, n2 beyond */
    var rc = Math.ceil(r2);
    for (var dy = -rc - 1; dy <= rc; dy++) for (var dx = -rc - 1; dx <= rc; dx++) {
      var d = Math.sqrt((dx + 0.5) * (dx + 0.5) + (dy + 0.5) * (dy + 0.5)), hx = mx + dx, hy = my + dy;
      if (d <= r1) soft(hx, hy, d > rm && bay(hx, hy) < 0.25 ? K('n3') : K('n2'));
      else if (d <= r2) soft(hx, hy, K('n2'));
    }
  }
  function killDisc(mx, my, r) {       /* moon disc: no stars here (mask 2), but clouds may pass in front of it */
    for (var dy = -r; dy < r; dy++) for (var dx = -r; dx < r; dx++)
      if (Math.sqrt((dx + 0.5) * (dx + 0.5) + (dy + 0.5) * (dy + 0.5)) <= r && inG(mx + dx, my + dy)) mask[(my + dy - gy) * gw + (mx + dx - gx)] = 2;
  }

  /* -- 1. stone frame ----------------------------------------------------- */
  function edge(qx, qy) { return outer(qx, qy) && (!outer(qx - 1, qy) || !outer(qx + 1, qy) || !outer(qx, qy - 1) || !outer(qx, qy + 1)); }
  var fy1 = y + h - g.sillH;
  for (py = y + g.kt; py < fy1; py++) for (px = x; px < x + w; px++) {
    if (!outer(px, py) || inG(px, py)) continue;
    var col;
    if (edge(px, py)) col = K('st');
    else if (edge(px - 1, py) || edge(px, py - 1)) col = K('s3');
    else if (inG(px + 1, py) || inG(px, py + 1)) col = K('s1');
    else if (inG(px - 1, py) || inG(px, py - 1)) col = K('s3');
    else if (edge(px + 1, py) || edge(px, py + 1)) col = K('s1');
    else col = K('s2');
    R(c, px, py, 1, 1, col);
  }
  /* voussoir joints (radial) around the arch */
  var rm = (g.ro + g.ri) / 2, nj = Math.max(5, Math.round(Math.PI * rm / 7));
  if (nj % 2 === 0) nj++;
  for (k = 1; k < nj; k++) {
    var th = Math.PI * k / nj;
    for (var rr = g.ri; rr <= g.ro; rr += 0.3) {
      var jx = Math.floor(cx + rr * Math.cos(th)), jy = Math.floor(cy - rr * Math.sin(th));
      if (jy >= Math.floor(cy)) continue;
      if (outer(jx, jy) && !inG(jx, jy) && !edge(jx, jy) && !(inG(jx + 1, jy) || inG(jx, jy + 1))) R(c, jx, jy, 1, 1, K('s1'));
    }
  }
  /* block joints down the jambs (left and right offset against each other) */
  for (var side = 0; side < 2; side++) {
    for (py = Math.floor(cy) + 4 + side * 3; py < fy1 - 3; py += 7) for (px = x + 1; px < x + w - 1; px++) {
      if ((side === 0) !== (px + 0.5 < cx)) continue;
      if (outer(px, py) && !inG(px, py) && !edge(px, py) && !(inG(px + 1, py) || inG(px, py + 1) || inG(px - 1, py))) R(c, px, py, 1, 1, K('s1'));
    }
  }

  /* -- 2. sky, moon, silhouettes ------------------------------------------ */
  /* lattice layout (needed to place sky bands, moon and skyline) */
  var barW = (gw & 1) ? 3 : 2, bx0 = gx + ((gw - barW) >> 1);
  var t0 = Math.round(cy) - 1;                      /* transom rows t0, t0+1 */
  var t1 = -1;                                       /* lower bar rows t1, t1+1 ('city' only) */
  if (kind === 'city') t1 = t0 + 2 + Math.round((gb - t0 - 2) * 0.5) - 1;
  var moonLeft = (seed & 1) === 1;
  var paneTop = t0 + 2, paneBot = (kind === 'city' ? t1 : gb);     /* upper rect pane rows [paneTop, paneBot) */
  var leftC = gx + Math.round((bx0 - gx) / 2), rightC = bx0 + barW + Math.round((gx + gw - bx0 - barW) / 2);
  /* sky: solid ink in the arch (the transom hides the step), n1 in the pane below it. 'city' steps to n2
     just under the lower bar (two dithered rows, so the lattice hides the change); 'tower' stays n1 down
     to the hills. n3 never appears in the plain sky: only in the moon halo and the lit windows. */
  for (py = gy; py < gb; py++) for (px = gx; px < gx + gw; px++) {
    if (!inG(px, py)) continue;
    var skyCol;
    if (py < paneTop) skyCol = K('ink');
    else if (kind === 'city') {
      var dd0 = py - (t1 + 2);
      skyCol = dd0 < 0 ? K('n1') : dd0 === 0 ? (bay(px, py) < 0.5 ? K('n1') : K('n2')) : dd0 === 1 ? (bay(px, py) < 0.25 ? K('n1') : K('n2')) : K('n2');
    } else skyCol = K('n1');
    R(c, px, py, 1, 1, skyCol);
  }
  var ph1, ph2, ph3, ph4, topsA = [], topsB = [], topsC = [], tcx = 0;   /* tower-window hills, computed before the moon */
  var mr, mcx, mcy, mhr;                              /* moon radius, centre, outer halo radius */
  if (kind === 'city') {
    mr = clamp(Math.round(gw * 0.15), 3, 5);
    mcx = moonLeft ? leftC : rightC;
    mcy = paneTop + Math.round((paneBot - paneTop) * 0.42);
    mhr = mr + 2.6;
    if (withMoon) {
      halo(mcx, mcy, mr, mr + 0.8, mhr);
      for (j = -mr - 1; j <= mr; j++) for (i = -mr - 1; i <= mr; i++) {
        var d1 = Math.sqrt((i + 0.5) * (i + 0.5) + (j + 0.5) * (j + 0.5));
        var d2 = Math.sqrt((i + 0.5 - mr * 0.62) * (i + 0.5 - mr * 0.62) + (j + 0.5 + mr * 0.22) * (j + 0.5 + mr * 0.22));
        if (d1 <= mr && d2 > mr * 0.9) soft(mcx + i, mcy + j, d1 > mr - 1.1 && i > 0 ? K('p3') : K('p4'));
      }
      killDisc(mcx, mcy, mr + 1);
    }
  } else {
    mr = clamp(Math.round(gw * 0.17), 4, 8);
    mcx = moonLeft ? leftC : rightC;
    ph1 = rng() * 6.28; ph2 = rng() * 6.28; ph3 = rng() * 6.28; ph4 = rng() * 6.28;
    tcx = moonLeft ? gx + Math.round(gw * 0.72) : gx + Math.round(gw * 0.27);
    var hw = Math.round(gw * 0.42);
    for (i = 0; i < gw; i++) {
      topsA[i] = Math.max(2, Math.round(gh * 0.21 + 3 * Math.sin(i * 0.27 + ph1) + 2 * Math.sin(i * 0.63 + ph2)));
      topsB[i] = Math.max(2, Math.round(gh * 0.135 + 2.2 * Math.sin(i * 0.33 + ph3) + 1.4 * Math.sin(i * 0.81 + ph4)));
      var u = (gx + i - tcx) / hw;
      topsC[i] = Math.max(2, Math.round(3 + 4 * Math.max(0, 1 - u * u) + 0.9 * Math.sin(i * 0.9 + ph1)));
    }
    mhr = mr + 3.4;
    mcy = paneTop + mr + 4;
    if (withMoon) {
      halo(mcx, mcy, mr, mr + 1.2, mhr);
      var hx = mcx - mr * 0.35, hy = mcy - mr * 0.35;
      for (j = -mr; j < mr; j++) for (i = -mr; i < mr; i++) {
        var dd = Math.sqrt((i + 0.5) * (i + 0.5) + (j + 0.5) * (j + 0.5));
        if (dd > mr) continue;
        var dh = Math.sqrt((mcx + i + 0.5 - hx) * (mcx + i + 0.5 - hx) + (mcy + j + 0.5 - hy) * (mcy + j + 0.5 - hy));
        var mc = dh < mr * 0.72 ? K('p4') : K('p3');
        if (dd > mr - 1.05 && (i + j) > 0 && dh >= mr * 0.72) mc = K('p2');
        soft(mcx + i, mcy + j, mc);
      }
      var cr = [[0.3, 0.22, 2, 2], [-0.52, 0.42, 2, 1], [-0.18, -0.5, 1, 1], [0.56, -0.2, 1, 1], [0.08, 0.62, 1, 1]];
      for (i = 0; i < cr.length; i++) {
        var cxp = mcx + Math.round(cr[i][0] * mr), cyp = mcy + Math.round(cr[i][1] * mr);
        for (j = 0; j < cr[i][3]; j++) for (k = 0; k < cr[i][2]; k++) {
          var qd = Math.sqrt((cxp + k - mcx + 0.5) * (cxp + k - mcx + 0.5) + (cyp + j - mcy + 0.5) * (cyp + j - mcy + 0.5));
          if (qd < mr - 1.2) soft(cxp + k, cyp + j, K('s3'));
        }
      }
      killDisc(mcx, mcy, mr + 1);
    }
  }

  /* layers of silhouettes: heights above the glass bottom per column */
  function layer(tops, col) {
    for (var cc = 0; cc < gw; cc++) for (var hh = 1; hh <= tops[cc]; hh++) put(gx + cc, gb - hh, col);
  }
  function buildings(minH, maxH, minW, maxW, towers) {
    var out = [], bx = -Math.floor(rng() * 3), tops = [], q, r, b;
    for (q = 0; q < gw; q++) tops[q] = 0;
    while (bx < gw) {
      var bw = minW + Math.floor(rng() * (maxW - minW + 1)), bh = minH + Math.floor(rng() * (maxH - minH + 1));
      var rv = rng(), type = 'flat';
      if (towers && rv < 0.22 && bw >= 3) { type = 'spire'; if (bw % 2 === 0) bw++; bh += 2; }
      else if (rv < 0.5) type = 'gable';
      else if (rv < 0.7 && bw >= 3) type = 'crenel';
      out.push({ x0: bx, w: bw, h: bh, type: type });
      for (q = 0; q < bw; q++) {
        var cc = bx + q; if (cc < 0 || cc >= gw) continue;
        var add = 0;
        if (type === 'crenel') add = (q % 2 === 0) ? 1 : 0;
        else if (type === 'gable') add = Math.max(0, Math.min(3, Math.floor(bw / 2)) - Math.floor(Math.abs(q - (bw - 1) / 2)));
        else if (type === 'spire') { var dm = Math.abs(q - (bw - 1) / 2); add = dm === 0 ? 5 : dm === 1 ? 2 : 0; }
        tops[cc] = Math.max(tops[cc], bh + add);
      }
      bx += bw;
    }
    return { b: out, tops: tops };
  }
  function windowsOn(bl, col, n) {
    var cand = [];
    for (var q = 0; q < bl.b.length; q++) { var bb = bl.b[q]; if (bb.w >= 3 && bb.h >= 5 && bb.x0 >= 0 && bb.x0 + bb.w <= gw) cand.push(bb); }
    for (var m = 0; m < n && cand.length; m++) {
      var pick = cand.splice(Math.floor(rng() * cand.length), 1)[0];
      var wx = pick.x0 + 1 + Math.floor(rng() * (pick.w - 2)), wh = 1 + Math.floor(rng() * (pick.h - 3));
      put(gx + wx, gb - 1 - wh, col);
    }
  }
  var maxNear = (kind === 'city' ? gb - t1 - 4 : 14);
  if (kind === 'city') {
    var far = buildings(6, Math.max(7, maxNear - 2), 4, 8, false);
    layer(far.tops, K('n1'));
    windowsOn(far, K('g1'), 2);
    var near = buildings(4, Math.max(6, maxNear - 5), 3, 6, true);
    layer(near.tops, K('ink'));
    windowsOn(near, K('g3'), 3 + (gw > 26 ? 1 : 0));
    windowsOn(near, K('g2'), 1);
  } else {
    layer(topsA, K('s1'));
    layer(topsB, K('st'));
    layer(topsC, K('ink'));
    /* the wizard tower */
    var tw = gw >= 34 ? 7 : 5, tcol = tcx - Math.floor(tw / 2);
    var hillTop = topsC[tcx - gx], sh = clamp(Math.round(gh * 0.26), 10, 20);
    var baseRow = gb - hillTop;                       /* first row above the hill top */
    for (j = 0; j < sh + hillTop; j++) {              /* shaft, flared foot (runs down into the hill) */
      var jj = j - hillTop, wj = (jj < 3 && jj >= -1) ? tw + 2 : tw, oj = wj > tw ? 1 : 0;
      for (i = 0; i < wj; i++) put(tcol - oj + i, gb - 1 - j, K('ink'));
    }
    var topRow = baseRow - 1 - sh;                    /* balcony row */
    for (i = -1; i <= tw; i++) put(tcol + i, topRow, K('ink'));
    var rw = tw, rowRoof = topRow - 1;
    while (rw >= 1) {
      for (k = 0; k < 2; k++) {
        for (i = 0; i < rw; i++) put(tcx - Math.floor(rw / 2) + i, rowRoof, K('ink'));
        rowRoof--;
      }
      rw -= 2;
    }
    put(tcx, rowRoof, K('ink')); put(tcx, rowRoof - 1, K('ink'));     /* finial */
    var wy = baseRow - 1 - Math.round(sh * 0.62);
    put(tcx, wy, K('g3')); put(tcx, wy - 1, K('g3'));
  }

  /* -- 3. reveal shadow (top / left inner edge) ---------------------------- */
  for (py = gy; py < gb; py++) for (px = gx; px < gx + gw; px++) {
    if (!inG(px, py)) continue;
    if (!inG(px, py - 1) || !inG(px - 1, py)) put(px, py, K('st'));
  }

  /* -- 4. lattice ----------------------------------------------------------- */
  var LL = K('b3'), LD = K('b2'), LF = K('b3');
  function vbar(py0, py1) {
    for (var yy = py0; yy < py1; yy++) for (var q = 0; q < barW; q++) put(bx0 + q, yy, q === 0 ? LL : LD);
  }
  function hbar(yy) {
    for (var xx = gx; xx < gx + gw; xx++) { put(xx, yy, LL); put(xx, yy + 1, LD); }
  }
  var rings = [Math.round(g.ri * 0.55)];             /* round fan: one ring + two 45 degree spokes */
  for (py = gy; py < t0; py++) for (px = gx; px < gx + gw; px++) {
    var rd = Math.sqrt((px + 0.5 - cx) * (px + 0.5 - cx) + (py + 0.5 - cy) * (py + 0.5 - cy));
    if (Math.abs(rd - rings[0]) < 0.55) put(px, py, LF);
  }
  var spokes = [0.7854, 2.3562];
  for (j = 0; j < spokes.length; j++) {
    for (var sr = rings[0]; sr <= g.ri; sr += 0.35) {
      var sx = Math.floor(cx + sr * Math.cos(spokes[j])), sy = Math.floor(cy - sr * Math.sin(spokes[j]));
      if (sy < t0) put(sx, sy, LF);
    }
  }
  vbar(gy, gb);
  hbar(t0);
  if (kind === 'city') hbar(t1);

  /* -- 5. keystone ---------------------------------------------------------- */
  var kw = (w & 1) ? 7 : 6, kx0 = Math.round(cx - kw / 2), kh = g.kt + g.fr + 2, kfull = g.kt + g.fr;
  function inKey(ii, jj) {
    if (jj < 0 || jj >= kh) return false;
    if (jj < kfull) return ii >= 0 && ii < kw;
    return ii >= 1 && ii < kw - 1;
  }
  for (j = 0; j < kh; j++) for (i = 0; i < kw; i++) {
    if (!inKey(i, j)) continue;
    var kc;
    if (!inKey(i - 1, j) || !inKey(i + 1, j) || !inKey(i, j - 1) || !inKey(i, j + 1)) kc = K('st');
    else if (j === 1) kc = K('s4');
    else if (i === 1) kc = K('s4');
    else if (!inKey(i + 2, j) || !inKey(i, j + 2)) kc = K('s2');
    else kc = K('s3');
    R(c, kx0 + i, y + j, 1, 1, kc);
  }
  R(c, kx0 + (kw >> 1) - 1, y + g.kt + 2, (kw & 1) ? 1 : 2, 1, K('s1'));          /* carved notch */
  for (i = 0; i < kw; i++) for (j = kfull; j < kh; j++) if (inKey(i, j) && inG(kx0 + i, y + j)) mask[(y + j - gy) * gw + (kx0 + i - gx)] = 0;
  /* mask: keystone tab and reveal ring are not sky */

  /* -- 6. sill and its shadow ------------------------------------------------ */
  var sy0 = y + h - g.sillH, sx0 = x - 2, sw = w + 4;
  R(c, sx0, sy0, sw, g.sillH, K('s2'));
  R(c, sx0, sy0, sw, 1, K('s3'));
  R(c, sx0 + 1, sy0, 2, 1, K('s4'));
  R(c, sx0, sy0 + g.sillH - 1, sw, 1, K('st'));
  R(c, sx0, sy0 + 1, 1, g.sillH - 1, K('st')); R(c, sx0 + sw - 1, sy0 + 1, 1, g.sillH - 1, K('st'));
  R(c, sx0 + 1, sy0 + g.sillH - 2, sw - 2, 1, K('s1'));
  /* shadow on the wall: one solid ink row, then a half-density row (every other column), both a little narrower than the box */
  R(c, x + 1, y + h, w - 2, 1, K('ink'));
  for (i = x + 2; i < x + w - 2; i++) if (((i - x) & 1) === 0) R(c, i, y + h + 1, 1, 1, K('ink'));

  /* -- 7. stars (animated by rmWindowDyn) and clouds -------------------------- */
  var stars = [], tries = 0, want = clamp(Math.round(gw * gh / 150) + (withMoon ? 0 : 3), 7, 22), skyLimit = gy + Math.round(gh * (kind === 'city' ? 0.6 : 0.66));
  function clearR(qx, qy, rad) {
    for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) if (!open(qx + dx, qy + dy)) return false;
    return true;
  }
  function nearMoon(qx, qy, rad) {                   /* stars keep out of the moon's halo too */
    if (!withMoon) return false;
    var ddx = qx + 0.5 - mcx - 0.5, ddy = qy + 0.5 - mcy - 0.5;
    return Math.sqrt(ddx * ddx + ddy * ddy) <= mhr + rad;
  }
  while (stars.length < want && tries++ < 800) {
    var sx2 = gx + 1 + Math.floor(rng() * (gw - 2)), sy2 = gy + 1 + Math.floor(rng() * (skyLimit - gy - 1));
    var ph = rng() * 6.2832, per = 6000 + Math.floor(rng() * 7000), big = rng() < 0.3;
    if (!clearR(sx2, sy2, big ? 3 : 1) || nearMoon(sx2, sy2, big ? 3 : 1)) continue;
    var near2 = false;
    for (i = 0; i < stars.length; i++) if (Math.abs(stars[i].x - sx2) < 5 && Math.abs(stars[i].y - sy2) < 5) near2 = true;
    if (near2) continue;
    stars.push({ x: sx2, y: sy2, ph: ph, per: per, big: big });
  }
  /* clouds ('tower' only): two thin lens-shaped wisps, solid (no dither holes), tapered ends.
     Rows lie in the n1/n2 sky below the moon's halo, clear of the transom, above the far hills. */
  var clouds = [];
  if (kind === 'tower') {
    var cA = mcy + Math.ceil(mhr) + 3, cyl = [cA, Math.min(cA + 6, gb - 12)];     /* both wisps hang below the moon's halo */
    for (k = 0; k < 2; k++) {
      var cl = 15 + Math.floor(rng() * 8);
      clouds.push({ y: cyl[k], x0: Math.floor(rng() * (gw + cl)), len: cl, per: 3300 + Math.floor(rng() * 1700),
        streaks: [{ dy: -1, s: Math.round(cl * 0.35), len: Math.round(cl * 0.30), col: 'n2' },
                  { dy: 0, s: 0, len: cl, col: 'n2' },
                  { dy: 1, s: Math.round(cl * 0.15), len: Math.round(cl * 0.6), col: 'n2' }] });
    }
  }
  return { gx: gx, gy: gy, gw: gw, gh: gh, kind: kind, stars: stars, clouds: clouds, mask: mask, seed: seed,
           x: x, y: y, w: w, h: h, ext: { x0: x - 2, y0: y, x1: x + w + 2, y1: y + h + 2 } };
}

/* ---- curtains ------------------------------------------------------------ */
function rmCurtains(c, x, y, w, h) {
  var top = y - 3, hem = y + h + 2, hh = hem - top + 1;
  var dw = 10, tieW = 5, hemW = 9, tieF = 0.56;
  var rodL = x - 6, rodR = x + w + 6;            /* the ball finials cap the rod ends, 2 px over the drapes' outer edges */
  function widthAt(f) {
    var e = f < tieF ? (tieF - f) / tieF : (f - tieF) / (1 - tieF);
    return Math.round(tieW + ((f < tieF ? dw : hemW) - tieW) * Math.pow(e, 1.5));
  }
  for (var side = 0; side < 2; side++) {
    var dir = side === 0 ? 1 : -1, xo = side === 0 ? x - 8 : x + w + 7;     /* outer edge column */
    for (var r = 0; r < hh; r++) {
      var f = r / (hh - 1), wr = widthAt(f), ry = top + r;
      for (var k = 0; k < wr; k++) {
        var u = ((k + 0.5) / wr) * 4 + Math.sin(r * 0.28 + side * 2) * 0.12, fold = Math.floor(u), ph = u - fold, col;
        if (ph < 0.5 || k === 0 || k === wr - 1) col = K('r1');
        else col = K('r2');
        /* sheen: broken 1 px r3 dashes on the crest of two folds, mostly above the tie */
        if (col === K('r2') && ph > 0.62 && ph < 0.85 && (fold === 1 || fold === 2) && f < tieF + 0.08 && ((r + fold * 3 + side * 2) % 9) < 3) col = K('r3');
        if (r === 0 || r === hh - 1) col = K('r1');
        if (r >= hh - 4 && col === K('r2')) col = (r === hh - 4 || ph < 0.7) ? K('r2') : K('r1');
        /* pleated hem: valley columns end one row higher */
        if (r === hh - 1 && ph < 0.5) continue;
        R(c, xo + dir * k, ry, 1, 1, col);
      }
    }
    /* tie-back: a gold band with a short tassel */
    var tr = top + Math.round(tieF * (hh - 1)), tl = tieW + 2, tx0 = dir > 0 ? xo - 1 : xo - tl + 2;
    R(c, tx0, tr, tl, 1, K('g3')); R(c, tx0, tr + 1, tl, 1, K('g2'));
    var kx = dir > 0 ? tx0 + tl - 1 : tx0;
    R(c, kx, tr + 2, 1, 2, K('g2')); R(c, kx, tr + 4, 1, 1, K('g1'));
  }
  /* rod and finials */
  R(c, rodL, y - 5, rodR - rodL, 1, K('g2'));
  R(c, rodL, y - 4, rodR - rodL, 1, K('g1'));
  var fin = [['.', 'b', 'b', '.'], ['a', 'a', 'b', 'c'], ['b', 'b', 'b', 'c'], ['.', 'c', 'c', '.']];
  var fcol = { a: K('g3'), b: K('g2'), c: K('g1') };
  for (var fj = 0; fj < 4; fj++) for (var fi = 0; fi < 4; fi++) {
    var ch = fin[fj][fi]; if (ch === '.') continue;
    R(c, rodL - 4 + fi, y - 6 + fj, 1, 1, fcol[ch]);
    R(c, rodR + 3 - fi, y - 6 + fj, 1, 1, fcol[ch === 'a' ? 'b' : ch]);
  }
}

/* ---- animation ------------------------------------------------------------ */
function rmWindowDyn(c, win, now) {
  now = now || 0;
  var i, j, k, s, v, col;
  function pix(px, py, col2) { R(c, px, py, 1, 1, col2); }
  /* stars: slow swell n4 -> p3 -> p4 (never off); big ones flash a plus at the very peak */
  for (i = 0; i < win.stars.length; i++) {
    s = win.stars[i];
    v = Math.sin(now / s.per * 6.2832 + s.ph);
    if (s.big && v > 0.93) {
      pix(s.x, s.y, K('p4'));
      pix(s.x - 1, s.y, K('p3')); pix(s.x + 1, s.y, K('p3')); pix(s.x, s.y - 1, K('p3')); pix(s.x, s.y + 1, K('p3'));
      continue;
    }
    pix(s.x, s.y, v > 0.85 ? K('p4') : v > 0.3 ? K('p3') : K('n4'));
  }
  /* cloud wisps: solid rows drifting right 1 px per 3.3-5 s; only where the mask says open sky,
     so they pass behind the lattice, tower, hills and moon */
  for (i = 0; i < win.clouds.length; i++) {
    var cl = win.clouds[i], span = win.gw + cl.len;
    var off = Math.floor(now / cl.per);
    var x0 = win.gx - cl.len + (((cl.x0 + off) % span) + span) % span;
    for (j = 0; j < cl.streaks.length; j++) {
      var st = cl.streaks[j], py = cl.y + st.dy;
      if (py < win.gy || py >= win.gy + win.gh) continue;
      for (k = 0; k < st.len; k++) {
        var px = x0 + st.s + k;
        if (px < win.gx || px >= win.gx + win.gw) continue;
        if (win.mask[(py - win.gy) * win.gw + (px - win.gx)] === 0) continue;
        pix(px, py, K(st.col));
      }
    }
  }
}
