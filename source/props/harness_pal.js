/* Test harness only: palette and drawing helpers that the page itself provides. */
var PAL = {"ink": "#0b0e16", "st": "#151b28", "s1": "#1e2535", "s2": "#46536c", "s3": "#8895ae", "s4": "#cfd8e8", "n1": "#0e2644", "n2": "#12355b", "n3": "#2b64b3", "n4": "#5ea4f0", "g1": "#7a5416", "g2": "#b8892b", "g3": "#e2b957", "p1": "#a88a58", "p2": "#d3ba84", "p3": "#ecdca8", "p4": "#faf1cf", "b1": "#2b180c", "b2": "#5a361b", "b3": "#82522a", "b4": "#ad7640", "r1": "#5c0f18", "r2": "#a8232b", "r3": "#e4504a", "f0": "#6b3216", "f1": "#a65a26", "f2": "#d1823c", "f3": "#ebaa5e", "f4": "#f8d391", "ey": "#2fb2a4", "ed": "#0f6f6e", "ez": "#8fe6d6", "pk": "#e68f88"};
function K(key) { return PAL[key]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rgbOf(col) { return [parseInt(col.substr(1, 2), 16), parseInt(col.substr(3, 2), 16), parseInt(col.substr(5, 2), 16)]; }
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
var BAYER8 = (function () { var m = [[0]]; for (var n = 1; n < 8; n *= 2) { var k = m.length, nm = []; for (var y = 0; y < 2 * k; y++) { nm[y] = []; for (var x = 0; x < 2 * k; x++) nm[y][x] = m[y % k][x % k] * 4 + (y < k ? (x < k ? 0 : 2) : (x < k ? 3 : 1)); } m = nm; } return m; })();
function bay(x, y) { return (BAYER8[y & 7][x & 7] + 0.5) / 64; }
function catEllipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (var y = -ry; y <= ry; y++) {
    var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
    if (w > 0) c.fillRect(cx - w, cy + y, 2 * w, 1);
  }
}
