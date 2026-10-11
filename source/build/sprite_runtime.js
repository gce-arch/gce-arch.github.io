/* ---- Sprite renderer -------------------------------------------------
   A sprite is an array of equal-length strings (a character grid). LEGEND maps a
   character to a palette key; the palette itself lives in the CSS custom
   properties on :root (--ink, --s1, ...). Every sprite is rendered to SVG with
   merged horizontal runs of equal color (shape-rendering: crispEdges).
   -------------------------------------------------------------------- */
var PAL = {};
function readPalette() {
  var cs = getComputedStyle(document.documentElement);
  Object.keys(LEGEND).forEach(function (ch) {
    var k = LEGEND[ch];
    var v = cs.getPropertyValue('--' + k).trim();
    if (v) PAL[k] = v;
  });
}
function sprW(name) { return SPR[name][0].length; }
function sprH(name) { return SPR[name].length; }
function mirrorRows(rows) {
  return rows.map(function (r) { return r.split('').reverse().join(''); });
}
function spriteRows(name, flip) {
  return flip ? mirrorRows(SPR[name]) : SPR[name];
}
function spritePaths(rows, remap) {
  var out = {}, order = [];
  for (var y = 0; y < rows.length; y++) {
    var r = rows[y], x = 0;
    while (x < r.length) {
      var ch = r.charAt(x);
      if (ch === '.') { x++; continue; }
      var x2 = x + 1;
      while (x2 < r.length && r.charAt(x2) === ch) x2++;
      var key = LEGEND[ch];
      if (remap && remap[key]) key = remap[key];
      var col = PAL[key] || '#f0f';
      if (!out[col]) { out[col] = []; order.push(col); }
      out[col].push('M' + x + ' ' + y + 'h' + (x2 - x) + 'v1h-' + (x2 - x) + 'z');
      x = x2;
    }
  }
  return order.map(function (c) { return '<path fill="' + c + '" d="' + out[c].join('') + '"/>'; }).join('');
}
/* Inline SVG for use inside the page (sized through --sw/--sh and --px). */
function spriteSVG(name, cls, opt) {
  opt = opt || {};
  var rows = spriteRows(name, opt.flip), w = rows[0].length, h = rows.length;
  return '<svg class="spr' + (cls ? ' ' + cls : '') + '" style="--sw:' + w + ';--sh:' + h +
    '" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' +
    spritePaths(rows, opt.remap) + '</svg>';
}
/* SVG document of a sprite (with an intrinsic size, so CSS slices are counted in sprite pixels). */
function spriteDoc(name, opt) {
  opt = opt || {};
  var rows = spriteRows(name, opt.flip), w = rows[0].length, h = rows.length, k = opt.scale || 1;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w * k) + '" height="' + (h * k) +
    '" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges">' + spritePaths(rows, opt.remap) + '</svg>';
}
function spriteDataURI(name, opt) { return 'data:image/svg+xml,' + encodeURIComponent(spriteDoc(name, opt)); }
/* CSS url() value for border-image / background-image sources. */
function spriteURI(name, opt) { return 'url("' + spriteDataURI(name, opt) + '")'; }
