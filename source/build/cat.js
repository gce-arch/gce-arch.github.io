/* ---- Cat room ---------------------------------------------------------------
   A pixel-art scene on a small canvas: one canvas pixel is one art pixel and the canvas is scaled by a
   whole number. CAT holds the artwork; each pose is a stack of layers (tail, body, paws, ears, head, eyes).
   Motion is made of whole-pixel moves and swaps: breathing (body stretch and head lift), blinking and
   drooping eyes, ear flicks, tail sway (row or column shear), paw bobs, sleep Zs, and a heart on click.
   A pose change dissolves through an ordered-dither mask. Under prefers-reduced-motion nothing animates
   and the pose changes only on click or Enter/Space. */
var catRoom = $('cat-room'), catStage = $('cat-stage'), catCv = $('cat-canvas'), catSay = $('cat-status');
var catCtx = catCv.getContext('2d', { willReadFrequently: true });
var catReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
var catPoses = null, catCur = 0, catSt = null, catTrans = null, catBag = [], catBagUsed = false;
var catL = null, catActive = false, catRaf = 0, catLast = 0, catNextAt = 0, catTimer = 0, catSwapTimer = 0;
var catHearts = [], catZs = [], catRgb = {}, catRO = null, catTiny = null;
var CAT_W = 128, CAT_H = 100, CAT_FLOOR = 91, CAT_EVERY = 30000, CAT_FRAME = 66;

function rnd(a, b) { return a + Math.random() * (b - a); }
var BAYER8 = (function () {
  var m = [[0]];
  for (var n = 1; n < 8; n *= 2) {
    var k = m.length, nm = [];
    for (var y = 0; y < 2 * k; y++) {
      nm[y] = [];
      for (var x = 0; x < 2 * k; x++) nm[y][x] = m[y % k][x % k] * 4 + (y < k ? (x < k ? 0 : 2) : (x < k ? 3 : 1));
    }
    m = nm;
  }
  return m;
})();
function bay(x, y) { return (BAYER8[y & 7][x & 7] + 0.5) / 64; }
function K(key) { return PAL[key]; }
function rgbOf(col) {
  var r = catRgb[col];
  if (!r) { r = catRgb[col] = [parseInt(col.substr(1, 2), 16), parseInt(col.substr(3, 2), 16), parseInt(col.substr(5, 2), 16)]; }
  return r;
}
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/* ---------- artwork: decode run-length rows into canvases ---------- */
function catDecode(g, w, h) {
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  var cx = cv.getContext('2d'), id = cx.createImageData(w, h), d = id.data, rows = g.split('/');
  for (var y = 0; y < rows.length && y < h; y++) {
    var re = /([^\d])(\d*)/g, m, x = 0;
    while ((m = re.exec(rows[y]))) {
      var n = m[2] ? +m[2] : 1;
      if (m[1] !== '.') {
        var c = rgbOf(PAL[LEGEND[m[1]]]);
        for (var i = 0; i < n && x + i < w; i++) {
          var o = (y * w + x + i) * 4;
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
      }
      x += n;
    }
  }
  cx.putImageData(id, 0, 0);
  return cv;
}
function catGrid(rows) {
  var w = rows[0].length, h = rows.length, g = [];
  rows.forEach(function (r) {
    var out = '', i = 0;
    while (i < r.length) { var j = i; while (j < r.length && r.charAt(j) === r.charAt(i)) j++; out += r.charAt(i) + (j - i > 1 ? (j - i) : ''); i = j; }
    g.push(out);
  });
  return catDecode(g.join('/'), w, h);
}
function catBuild() {
  catPoses = CAT.poses.map(function (p) {
    var q = { id: p.id, say: p.say, eye: p.eye, shadow: p.shadow, br: p.br, zzz: p.zzz, L: [], box: [999, 999, -1, -1], head: [64, 30] };
    p.L.forEach(function (l) {
      var o = { k: l.k, x: l.x, y: l.y, w: l.w, h: l.h, lf: l.lf, sw: l.sw, bs: l.bs, bb: l.bb, ear: l.ear };
      if (typeof l.g === 'string') o.cv = catDecode(l.g, l.w, l.h);
      else { o.states = {}; for (var s in l.g) o.states[s] = catDecode(l.g[s], l.w, l.h); }
      q.box[0] = Math.min(q.box[0], l.x); q.box[1] = Math.min(q.box[1], l.y);
      q.box[2] = Math.max(q.box[2], l.x + l.w); q.box[3] = Math.max(q.box[3], l.y + l.h);
      if (l.k === 'head') q.head = [l.x + (l.w >> 1), l.y];
      q.L.push(o);
    });
    return q;
  });
  var tiny = {
    za: ['#####', '...#.', '..#..', '.#...', '#####'],
    zb: ['#######', '.....#.', '....#..', '...#...', '..#....', '.#.....', '#######'],
    zc: ['##########', '##########', '......##..', '......##..', '....##....', '....##....', '..##......', '..##......', '##########', '##########'],
    heart: ['..###.###..', '.#rrr#rrr#.', '#rkrrrrrrr#', '#rrrrrrrrq#', '#rrrrrrrqq#', '.#rrrrrqq#.', '..#rrrrq#..', '...#rrq#...', '....#rq#...', '.....#.....']
  };
  catTiny = {};
  for (var n in tiny) {
    if (n === 'heart') catTiny[n] = catGrid(tiny[n]);
    else {
      catTiny[n] = catGrid(tiny[n].map(function (r) { return r.replace(/#/g, 'k'); }));
      catTiny[n + 's'] = catGrid(tiny[n]);
    }
  }
}

/* ---------- layout ---------- */
function catLayout() {
  var W = catRoom.clientWidth, H = catRoom.clientHeight;
  if (!W || !H) return false;
  var dpr = window.devicePixelRatio || 1, Wd = W * dpr, Hd = H * dpr;
  var pd = Math.floor(Math.min(0.92 * Wd / CAT_W, Hd / 165));   // about 165 to 200 art pixels from floor to ceiling
  pd = Math.max(pd, Math.max(2, Math.round(1.5 * dpr)));
  var LW = Math.ceil(Wd / pd), LH = Math.ceil(Hd / pd);
  var key = [LW, LH, pd, W, H].join('/');
  if (catL && catL.key === key) return true;
  var asp = LW / LH, f = asp >= 1.4 ? 0.82 : asp <= 0.8 ? 0.74 : 0.74 + (asp - 0.8) / 0.6 * 0.08;
  var fy = Math.min(Math.max(Math.round(LH * f), Math.min(LH - 9, 142)), LH - (CAT_H - CAT_FLOOR));   // room for a tall enough wall behind the cat
  var L = { key: key, LW: LW, LH: LH, pd: pd, dpr: dpr, scale: pd / dpr, cx: LW >> 1, floorY: fy, wallY: fy - 44 };
  L.ox = L.cx - (CAT_W >> 1);
  L.oy = fy - CAT_FLOOR;
  L.left = (W - LW * L.scale) / 2;
  L.top = (H - LH * L.scale) / 2;
  catCv.width = LW; catCv.height = LH;
  catCv.style.width = (LW * L.scale) + 'px'; catCv.style.height = (LH * L.scale) + 'px';
  catCv.style.left = L.left + 'px'; catCv.style.top = L.top + 'px';
  catCtx = catCv.getContext('2d');
  catCtx.imageSmoothingEnabled = false;
  catL = L;
  roomBuild(L);
  return true;
}

/* ---------- helpers shared with the room ---------- */
function catEllipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (var y = -ry; y <= ry; y++) {
    var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
    if (w > 0) c.fillRect(cx - w, cy + y, 2 * w, 1);
  }
}
/* ---------- animation state ---------- */
function catNewState(P, now) {
  return {
    t0: now, still: !!catReduce.matches, base: P.eye[0], baseAt: now + rnd(6500, 12000),
    blinkAt: now + rnd(1800, 4500), blinkEnd: 0, earAt: now + rnd(4000, 9000), earT: -1e9, earS: 0, zAt: now + 900,
    lookAt: now + rnd(9000, 16000), lookEnd: 0, lookDx: 1
  };
}
function catStep(P, st, now) {
  if (st.still) return;
  if (P.eye.length > 1 && now >= st.baseAt) {
    st.base = P.eye[(P.eye.indexOf(st.base) + 1) % P.eye.length];
    st.baseAt = now + rnd(5000, 11000);
  }
  if (st.base !== 'closed' && now >= st.blinkAt) { st.blinkEnd = now + 150; st.blinkAt = now + rnd(2600, 6500); }
  if (now >= st.earAt) { st.earT = now; st.earS = Math.random() < 0.5 ? 0 : 1; st.earAt = now + rnd(5500, 12000); }
  if (now >= st.lookAt) { st.lookEnd = now + rnd(1600, 3200); st.lookDx = Math.random() < 0.5 ? -1 : 1; st.lookAt = now + rnd(10000, 18000); }
}
function catEye(st, now) { return (now < st.blinkEnd && st.base !== 'closed') ? 'closed' : st.base; }

/* ---------- drawing the cat ---------- */
function catDrawPose(c, P, st, now, ox, oy) {
  var s = P.shadow;
  c.globalAlpha = 0.5; catEllipse(c, ox + s[0], oy + s[1], s[2], s[3], K('ink')); c.globalAlpha = 1;
  var tt = now - st.t0;
  var breath = st.still ? 0 : (tt % 3800) < 1900 ? 0 : 1;
  var eye = catEye(st, now), since = now - st.earT;
  var flick = !st.still && since >= 0 && (since < 110 || (since >= 220 && since < 330));
  var bob = !st.still && Math.sin(tt / 5200 * 6.2832) > 0.35;
  var look = !st.still && now < st.lookEnd ? st.lookDx : 0;
  P.L.forEach(function (l) {
    var x = ox + l.x, y = oy + l.y;
    if (look && (l.k === 'head' || l.k === 'eyes' || l.ear)) x += look;
    if (l.lf && breath) y -= 1;
    if (l.ear && flick && (l.k === 'ear_l') === (st.earS === 0)) y += 1;
    if (l.bb && bob) y -= 1;
    if (l.states) { c.drawImage(l.states[eye], x, y); return; }
    var i, j, a, u;
    if (l.bs && breath) {
      var r = clamp(P.br - l.y, 0, l.h - 1);
      c.drawImage(l.cv, 0, 0, l.w, r + 1, x, y - 1, l.w, r + 1);
      c.drawImage(l.cv, 0, r, l.w, l.h - r, x, y + r, l.w, l.h - r);
    } else if (l.sw && !st.still) {
      a = l.sw.amp * Math.sin(tt / l.sw.per * 6.2832);
      if (l.sw.ax === 'x') {
        for (j = 0; j < l.h; j++) {
          u = l.sw.base === 'top' ? j / (l.h - 1) : 1 - j / (l.h - 1);
          c.drawImage(l.cv, 0, j, l.w, 1, x + Math.round(a * Math.pow(u, 1.5)), y + j, l.w, 1);
        }
      } else {
        for (i = 0; i < l.w; i++) {
          u = l.sw.base === 'left' ? i / (l.w - 1) : 1 - i / (l.w - 1);
          c.drawImage(l.cv, i, 0, 1, l.h, x + i, y + Math.round(a * Math.pow(u, 1.5)), 1, l.h);
        }
      }
    } else c.drawImage(l.cv, x, y);
  });
}
var catBufA = null, catBufB = null, catBufO = null;
function catBuf() {
  var b = document.createElement('canvas');
  b.width = CAT_W + 32; b.height = CAT_H + 32;
  b.getContext('2d', { willReadFrequently: true });
  return b;
}
function catDissolve(c, L, now) {
  var T = catTrans, p = clamp((now - T.t0) / T.dur, 0, 1), W = CAT_W + 32, H = CAT_H + 32;
  if (!catBufA) { catBufA = catBuf(); catBufB = catBuf(); catBufO = catBuf(); }
  var a = catBufA.getContext('2d'), b = catBufB.getContext('2d'), o = catBufO.getContext('2d');
  a.clearRect(0, 0, W, H); b.clearRect(0, 0, W, H);
  catStep(catPoses[T.from], T.fromSt, now);
  catDrawPose(a, catPoses[T.from], T.fromSt, now, 16, 16);
  catDrawPose(b, catPoses[catCur], catSt, now, 16, 16);
  var da = a.getImageData(0, 0, W, H), db = b.getImageData(0, 0, W, H), out = o.createImageData(W, H);
  var e = p * p * (3 - 2 * p) * 1.02;
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    var i = (y * W + x) * 4, src = bay(x, y) < e ? db.data : da.data;
    out.data[i] = src[i]; out.data[i + 1] = src[i + 1]; out.data[i + 2] = src[i + 2]; out.data[i + 3] = src[i + 3];
  }
  o.putImageData(out, 0, 0);
  c.drawImage(catBufO, L.ox - 16, L.oy - 16);
  if (p >= 1) catTrans = null;
}
function catDrawZs(c, L, P, now) {
  var live = [];
  catZs.forEach(function (z) {
    var age = now - z.t0;
    if (age > 3600) return;
    live.push(z);
    var k = age / 3600, nm = k < 0.34 ? 'za' : k < 0.68 ? 'zb' : 'zc';
    var x = Math.round(L.ox + z.x + k * 16 + Math.sin(age / 520) * 2), y = Math.round(L.oy + z.y - k * 26);
    if (k > 0.8 && ((age / 90) | 0) % 2) return;
    c.globalAlpha = 0.7; c.drawImage(catTiny[nm + 's'], x + 1, y + 1);
    c.globalAlpha = 1;
    c.drawImage(catTiny[nm], x, y);
  });
  catZs = live;
}
function catDrawHearts(c, L, now) {
  var live = [];
  catHearts.forEach(function (h) {
    var age = now - h.t0;
    if (age > 1300) return;
    live.push(h);
    var k = age / 1300, x = Math.round(L.ox + h.x - 5 + Math.sin(age / 180) * 1.5 * (catReduce.matches ? 0 : 1)), y = Math.round(L.oy + h.y - 12 - (catReduce.matches ? 0 : k * 16));
    if (k > 0.78 && !catReduce.matches && ((age / 70) | 0) % 2) return;
    c.drawImage(catTiny.heart, x, y);
  });
  catHearts = live;
}

/* ---------- frames, changes, loop ---------- */
function catFrame(now) {
  var L = catL;
  if (!L || !catPoses) return;
  var P = catPoses[catCur], c = catCtx;
  if (!catReduce.matches && !catTrans && now >= catNextAt) catChange(false, now);
  catStep(P, catSt, now);
  c.clearRect(0, 0, L.LW, L.LH);
  c.drawImage(L.bg, 0, 0);
  roomBack(c, L, catReduce.matches ? 0 : now, catReduce.matches);
  if (catTrans) catDissolve(c, L, now);
  else catDrawPose(c, P, catSt, now, L.ox, L.oy);
  roomFront(c, L, catReduce.matches ? 0 : now, catReduce.matches);
  if (!catReduce.matches && P.zzz && catSt.base === 'closed' && !catTrans && now >= catSt.zAt) {
    catZs.push({ t0: now, x: P.zzz[0], y: P.zzz[1] });
    catSt.zAt = now + rnd(2300, 3300);
  }
  catDrawZs(c, L, P, now);
  catDrawHearts(c, L, now);
  catStage.setAttribute('data-pose', P.id);
  catStage.setAttribute('data-eye', catEye(catSt, now));
}
function catPick() {
  /* A shuffled bag: every pose once per round, never the same pose twice in a row. The first round
     leaves out the pose the cat starts in, so the first five poses are all different. */
  var first = !catBagUsed;
  if (!catBag.length) {
    catBag = [];
    catPoses.forEach(function (p, i) { if (!(first && i === catCur)) catBag.push(i); });
    for (var i = catBag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = catBag[i]; catBag[i] = catBag[j]; catBag[j] = t; }
    if (catBag.length > 1 && catBag[catBag.length - 1] === catCur) { var t2 = catBag[0]; catBag[0] = catBag[catBag.length - 1]; catBag[catBag.length - 1] = t2; }
    catBagUsed = true;
  }
  return catBag.pop();
}
function catChange(user, now) {
  var from = catCur, fromSt = catSt, next = catPick();
  if (next === from) next = (from + 1) % catPoses.length;
  catCur = next;
  catSt = catNewState(catPoses[next], now);
  catNextAt = now + CAT_EVERY;
  catZs = [];
  catTrans = catReduce.matches ? null : { fromSt: fromSt, from: from, t0: now, dur: 760 };
  if (user) {
    var P = catPoses[next];
    catHearts.push({ t0: now, x: P.head[0], y: P.head[1] });
    catSay.textContent = '';
    window.setTimeout(function () { catSay.textContent = P.say; }, 30);
  }
  if (catReduce.matches) {
    catFrame(now);
    window.clearTimeout(catSwapTimer);
    catSwapTimer = window.setTimeout(function () { catFrame(performance.now() + 5000); }, 1400);
  }
}
function catLoop(ts) {
  if (!catActive) return;
  catRaf = window.requestAnimationFrame(catLoop);
  var now = performance.now();
  if (now - catLast < CAT_FRAME - 4) return;
  catLast = now;
  catFrame(now);
}
function catStart() {
  if (!catPoses) catBuild();
  if (!catLayout()) return;
  var now = performance.now();
  if (!catSt) catSt = catNewState(catPoses[catCur], now);
  catSt.still = !!catReduce.matches;
  catNextAt = now + CAT_EVERY;
  if (catActive) { catFrame(now); return; }
  catActive = true;
  catStage.style.cursor = '';
  catSay.textContent = '';
  window.setTimeout(function () { if (catActive) catSay.textContent = catPoses[catCur].say; }, 60);
  if (catReduce.matches) catFrame(now);
  else { catLast = 0; catRaf = window.requestAnimationFrame(catLoop); }
}
function catStop() {
  catActive = false;
  window.cancelAnimationFrame(catRaf);
  window.clearTimeout(catSwapTimer);
}
function catSelect(on) { if (on) catStart(); else catStop(); }

/* ---------- interaction and housekeeping ---------- */
function catInBox(e) {
  var L = catL, P = catPoses && catPoses[catCur];
  if (!L || !P) return false;
  var r = catStage.getBoundingClientRect(), s = L.scale, pad = 6;
  var x = e.clientX - r.left - L.left, y = e.clientY - r.top - L.top;
  return x >= (L.ox + P.box[0] - pad) * s && x <= (L.ox + P.box[2] + pad) * s && y >= (L.oy + P.box[1] - pad) * s && y <= (L.oy + P.box[3] + pad) * s;
}
catStage.addEventListener('click', function (e) {
  if (!catActive) return;
  if (e.detail !== 0 && !catInBox(e)) return;   // pointer clicks count on the cat; Enter and Space always do
  catChange(true, performance.now());
});
catStage.addEventListener('pointermove', function (e) {
  catStage.style.cursor = catInBox(e) ? 'var(--cur-hand, pointer)' : 'var(--cur-arrow, default)';
});
document.addEventListener('visibilitychange', function () {
  if (!catActive) return;
  if (document.hidden) window.cancelAnimationFrame(catRaf);
  else if (!catReduce.matches) { catNextAt = performance.now() + CAT_EVERY; catLast = 0; catRaf = window.requestAnimationFrame(catLoop); }
});
function catResize() {
  if (!catActive) return;
  window.clearTimeout(catTimer);
  catTimer = window.setTimeout(function () { if (catActive && catLayout()) catFrame(performance.now()); }, 90);
}
window.addEventListener('resize', catResize);
if (window.ResizeObserver) { catRO = new ResizeObserver(catResize); catRO.observe(catRoom); }
if (catReduce.addEventListener) {
  catReduce.addEventListener('change', function () {
    if (!catActive) return;
    catStop();
    if (catReduce.matches) { catTrans = null; catHearts = []; }
    catStart();
  });
}
