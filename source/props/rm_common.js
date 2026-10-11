/* Shared by the room props (also part of the page). */
function rmRng(seed) {
  var s = (seed | 0) * 2654435761 % 4294967296 + 12345;
  return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
/* Dithered disc: colour col at the centre fading out to nothing at radius r (ordered dither, 1 px cells). */
function rmHalo(c, cx, cy, r, col, strength) {
  c.fillStyle = col;
  for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
    var d = Math.sqrt(x * x + y * y) / r;
    if (d >= 1) continue;
    var a = (1 - d) * (1 - d) * strength;
    if (bay(cx + x, cy + y) < a) c.fillRect(cx + x, cy + y, 1, 1);
  }
}
