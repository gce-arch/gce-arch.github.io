/* ---- Room: layout of the scholars' hall, baked scene, moving parts -------------------------
   roomBuild(L) draws everything that does not move onto L.bg once per layout; roomBack and roomFront
   draw the moving parts each frame (behind and in front of the cat). The props are the rm* functions
   above. The width of the room decides how many of them fit (L.tier: 3 wide, 2 medium, 1 narrow). */
function roomBuild(L) {
  var W = L.LW, H = L.LH, cx = L.cx, fy = L.floorY, wallY = L.wallY, i, x, y;
  var bg = document.createElement('canvas');
  bg.width = W; bg.height = H;
  var c = bg.getContext('2d', { willReadFrequently: true });
  var scratch = document.createElement('canvas').getContext('2d');
  var tier = W >= 330 ? 3 : W >= 250 ? 2 : 1;
  var catL = cx - 66, catR = cx + 66, lz = catL - 14, rz = W - 14 - catR;
  var D = L.dyn = { wins: [], flames: [], glows: [], orbs: [], globes: [], stacks: [], motes: [], beam: null, yarn: { x: Math.min(cx + 76, W - 8), y: fy + 6 } };
  L.tier = tier;
  rmLtRingPut.t = null;                                  // forget the halo rings of the previous layout

  /* geometry: everything is relative to the cat (cx, catL, catR), the floor (fy) and the wall base (wallY) */
  var tall = tier === 1 && wallY >= 132;                  // a narrow room with a tall wall has room for the chandelier above the window
  var winTop = tall ? 44 : 20, winH = clamp(wallY - 26 - winTop, 52, 72), winW = clamp(Math.round(winH * 0.52), 28, 40);
  var wxA = tier === 1 ? cx - (winW >> 1) : Math.max(18, catL - 14 - winW), wxB = catR + 14;
  var shelfH = clamp(wallY + 8 - 22, 66, 100), shelfRoom = wxA - 10 - 6 - 14;
  var shelfW = Math.min(clamp(Math.round(lz * 0.4), 30, 46), shelfRoom);
  var hasShelf = tier >= 2 && shelfW >= 28 && wallY >= 70;
  var scW = clamp(Math.round(rz * 0.34), 30, 42), scX = W - 16 - scW;
  var hasRack = tier >= 3 && scX >= wxB + winW + 12 && wallY >= 70;
  var fb = wallY + 26;                                    // feet of the props that stand on the floor in front of the wall
  var cdx = Math.max(26, Math.round(wxA + winW / 2)), lecX = Math.min(W - 30, wxB + (winW >> 1));
  var gx = hasRack ? scX + (scW >> 1) : W - 24;
  var hasGlobe = tier >= 2 && gx - 13 >= lecX + 16;

  function lit(prop, r, s, sel) {      // bake the glow behind a light prop, then draw the prop; register its flames
    var ret = prop(scratch);
    ret.flames.forEach(function (f, k) {
      D.flames.push(f);
      if (!sel || sel.indexOf(k) >= 0) { D.glows.push({ x: f.x, y: f.y - 2, r: r }); rmGlowStatic(c, f.x, f.y - 2, r, s); }
    });
    prop(c);
    return ret;
  }
  function windowAt(x, kind, seed, moon) {
    var win = rmArchWindow(c, x, winTop, winW, winH, kind, seed, moon);
    rmCurtains(c, x, winTop, winW, winH);
    D.wins.push(win);
    return win;
  }

  /* surfaces */
  rmWall(c, W, wallY, 1);
  rmCeiling(c, W, 2);
  rmWainscot(c, W, wallY);
  rmFloor(c, W, H, wallY, 3);
  if (tier >= 2) { rmPillar(c, 2, 16, wallY + 6, 12); rmPillar(c, W - 14, 16, wallY + 6, 12); }

  /* windows: 'city' on the left, 'tower' on the right (one centered window in the narrow room) */
  D.beam = { x0: wxA + 2, x1: wxA + winW - 2, y0: winTop + winH + 6 };
  /* there is one Moon: it shines in the 'tower' window only (the one window of the narrow room is the tower window) */
  if (tier === 1) windowAt(wxA, 'tower', 23, true);
  else { windowAt(wxA, 'city', 11, false); windowAt(wxB, 'tower', 23, true); }

  /* light from above: a chandelier on the ceiling arch (or two sconces on a short narrow wall) */
  if (tier > 1 || tall) lit(function (cc) { return rmChandelier(cc, cx, 3, tier === 1 ? 36 : 44); }, 16, 0.25, [0, 2, 5]);
  else [wxA - 22, wxA + winW + 22].forEach(function (sx) { lit(function (cc) { return rmSconce(cc, sx, winTop + 22); }, 12, 0.3); });

  /* banners in the wall gaps beside the chandelier; in the narrow room along the edges */
  if (tier >= 2) {
    var gl0 = wxA + winW + 10, gl1 = cx - 24, gr0 = cx + 24, gr1 = wxB - 10, bw = Math.min(22, gl1 - gl0 - 2);
    if (bw >= 16) { rmBanner(c, gl0 + ((gl1 - gl0 - bw) >> 1), 16, bw, 50); rmBanner(c, gr0 + ((gr1 - gr0 - bw) >> 1), 16, bw, 50); }
  } else if (W >= 136 && wallY >= 118) {
    rmBanner(c, 5, 22, 18, 44); rmBanner(c, W - 23, 22, 18, 44);
  }

  /* bookcase and ladder on the left, scroll rack and potion shelf */
  if (hasShelf) {
    rmShelf(c, 14, wallY + 8 - shelfH, shelfW, shelfH, 3);
    if (shelfW >= 36) rmLadder(c, 10, wallY + 8 - shelfH + 8, shelfH - 12, 1);
  }
  if (hasRack) rmScrollWall(c, scX, winTop, scW, Math.min(winH, 66), 5);
  if (tier >= 2) {
    var py = Math.min(62, fy - 90);                      // keep the bottles clear of the cat's ears and of the chandelier
    if (py >= 51) rmPotionShelf(c, cx - 20, py, 40, 2);
  } else if (tall && W >= 150) {
    var py1 = winTop + winH + 26;
    if (py1 + 8 <= fy - 84) rmPotionShelf(c, cx - 16, py1, 32, 2);
    else if (wxA - 10 >= 40) rmPotionShelf(c, 6, winTop + winH - 30, 32, 2);
  }
  if (tier >= 3 && W >= 420 && hasShelf && hasRack) {    // wide rooms: a lit sconce in each bare bay
    [Math.round((14 + shelfW + wxA - 9) / 2), Math.round((wxB + winW + 9 + scX) / 2)].forEach(function (sx) { lit(function (cc) { return rmSconce(cc, sx, winTop + 22); }, 12, 0.3); });
  }

  /* rug (the cat's shadow and the cat are drawn over it) */
  var rx = clamp(Math.round(W * 0.4), 62, 104), ry = Math.min(clamp(Math.round((H - wallY) * 0.36), 12, 26), Math.max(16, H - fy - 10));
  var rcy = Math.min(fy + 3, H - ry - 3);
  rmRug(c, cx, rcy, rx, ry, 4);

  /* floor props */
  if (tier >= 2) {
    rmLightPool(c, cdx, fb + 1, 20, 6, 0.12);
    lit(function (cc) { return rmCandelabra(cc, cdx, fb); }, 15, 0.3);
    rmLectern(c, lecX, fb);
    if (hasGlobe) {
      rmGlobe(c, gx, fb + 6); D.globes.push({ x: gx, y: fb + 6 });
      D.orbs.push({ x: gx, y: wallY - 12 });
    } else if (lecX + 22 <= W - 14) D.orbs.push({ x: lecX + 22, y: wallY - 12 });
    if (tier >= 3 && cdx - 30 > 52) { rmFloorStack(c, 40, fy + 14, 1); D.stacks.push({ x: 40, y: fy + 14 }); }
  } else {
    D.orbs.push({ x: Math.min(W - 16, wxA + winW + 26), y: winTop + (winH >> 1) });
  }

  /* vignette */
  var id = c.getImageData(0, 0, W, H), dd = id.data, ink = rgbOf(K('ink'));
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var nx = (x - W / 2) / (W / 2), ny = (y - H / 2) / (H / 2), rr = Math.sqrt(nx * nx + ny * ny) / 1.25;
    var t = clamp((rr - 0.5) / 0.5, 0, 1) * 3, qi = Math.floor(t);
    var al = Math.min(3, qi + (bay(x, y) < t - qi ? 1 : 0)) * 0.2;
    if (al > 0) {
      var o = (y * W + x) * 4;
      dd[o] = dd[o] * (1 - al) + ink[0] * al; dd[o + 1] = dd[o + 1] * (1 - al) + ink[1] * al; dd[o + 2] = dd[o + 2] * (1 - al) + ink[2] * al;
    }
  }
  c.putImageData(id, 0, 0);
  L.bg = bg;

  /* dust drifting down from the window along the wall */
  D.beam.h = wallY - 18 - D.beam.y0;
  var sd = 7;
  function lcg() { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; }
  for (i = 0; i < 8; i++) D.motes.push({ x: lcg(), y: lcg(), vx: (lcg() - 0.5) * 0.9, vy: (lcg() - 0.6) * 0.5, ph: lcg() * 6.28 });
}

function roomBack(c, L, now, still) {
  var D = L.dyn, i;
  D.wins.forEach(function (w) { rmWindowDyn(c, w, now); });
  if (!still && D.beam.h > 4) {
    var b = D.beam, t = now / 1000, w = b.x1 - b.x0 + 16, h = b.h;
    c.fillStyle = K('n4');
    D.motes.forEach(function (m) {
      var x = ((m.x * w + m.vx * t * 4) % w + w) % w, y = ((m.y * h + m.vy * t * 3) % h + h) % h;
      if (Math.sin(t * 1.3 + m.ph) > -0.1) c.fillRect(Math.round(b.x0 - 4 + x + y * 0.3), Math.round(b.y0 + y), 1, 1);
    });
  }
  for (i = 0; i < D.glows.length; i++) rmGlowFlicker(c, D.glows[i].x, D.glows[i].y, D.glows[i].r, now, i);
  for (i = 0; i < D.flames.length; i++) rmFlame(c, D.flames[i].x, D.flames[i].y, now, i);
  D.globes.forEach(function (g) { rmGlobeDyn(c, g.x, g.y, now); });
  D.stacks.forEach(function (g) { rmFloorStackDyn(c, g.x, g.y, now); });
  D.orbs.forEach(function (o) { rmOrb(c, o.x, o.y, now); });
}

function roomFront(c, L, now, still) {
  var y0 = L.dyn.yarn.y, x0 = L.dyn.yarn.x, dx, dy;
  for (dy = -5; dy <= 5; dy++) for (dx = -5; dx <= 5; dx++) {
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > 5.3) continue;
    var col = K('r2');
    if (dx + dy < -2 && d < 4.2) col = K('r3');
    if (dx + dy > 3 || d > 4.7) col = K('r1');
    if (((dx * 2 - dy * 3 + 30) % 5) === 0 && d < 4.7) col = K('r1');
    R(c, x0 + dx, y0 + dy, 1, 1, col);
  }
  for (dx = 0; dx < 13; dx++) R(c, x0 - 6 - dx, y0 + 4 + Math.round(Math.sin(dx / 2.2) * 1.4), 1, 1, K('r2'));
}
