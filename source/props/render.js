// usage: node render.js <out.png> <W> <H> <scale> "<js statements; use c, W, H, NOW>" [--times 0,300,600] [--bg #hex] file1.js file2.js ...
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const args = process.argv.slice(2);
  const out = args[0], W = +args[1], H = +args[2], scale = +args[3], code = args[4];
  let times = [0], bg = '#0e2644'; const files = [];
  for (let i = 5; i < args.length; i++) {
    if (args[i] === '--times') times = args[++i].split(',').map(Number);
    else if (args[i] === '--bg') bg = args[++i];
    else files.push(path.resolve(args[i]));
  }
  const dir = __dirname;
  const srcs = ['harness_pal.js', 'rm_common.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).concat(files.map(f => fs.readFileSync(f, 'utf8')));
  const html = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#000;display:flex;gap:8px;padding:8px"><div id=row style="display:flex;gap:8px"></div><script>
${srcs.join('\n')}
var BG = ${JSON.stringify(bg)}; var TIMES = ${JSON.stringify(times)};
var row = document.getElementById('row'); var err = [];
TIMES.forEach(function (NOW) {
  var cv = document.createElement('canvas'); cv.width = ${W}; cv.height = ${H};
  cv.style.cssText = 'width:${W * scale}px;height:${H * scale}px;image-rendering:pixelated';
  row.appendChild(cv); var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = BG; c.fillRect(0, 0, ${W}, ${H});
  var W = ${W}, H = ${H};
  try { (function () { ${code} })(); } catch (e) { err.push(String(e && e.stack || e)); }
});
document.title = err.length ? 'ERR ' + err[0] : 'ok';
</script>`;
  const tmp = path.join(dir, '_h_' + path.basename(out) + '.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Math.min(8000, (W * scale + 8) * times.length + 8), height: H * scale + 16 } });
  const msgs = []; p.on('pageerror', e => msgs.push(e.message)); p.on('console', m => { if (m.type() === 'error') msgs.push(m.text()); });
  await p.goto('file://' + tmp); await p.waitForTimeout(100);
  const title = await p.title();
  await p.screenshot({ path: out, fullPage: true });
  await b.close(); fs.unlinkSync(tmp);
  console.log(title === 'ok' && !msgs.length ? 'rendered ' + out : 'PROBLEM: ' + title + ' ' + msgs.join(' | '));
})();
