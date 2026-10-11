const { chromium } = require('playwright');
(async () => {
  const [,, file] = process.argv;
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file + '#cat'); await p.waitForTimeout(800);
  const snap = () => p.evaluate(() => { const cv = document.getElementById('cat-canvas'); const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; return Array.from(d); });
  let prev = await snap(); const eyes = []; let diffs = [];
  const t0 = Date.now();
  for (let i = 0; i < 80; i++) {
    await p.waitForTimeout(250);
    const cur = await snap(); let n = 0; for (let k = 0; k < cur.length; k += 4) if (cur[k] !== prev[k] || cur[k+1] !== prev[k+1] || cur[k+2] !== prev[k+2]) n++;
    diffs.push(n); prev = cur;
    eyes.push(await p.evaluate(() => document.getElementById('cat-stage').dataset.eye + ':' + document.getElementById('cat-stage').dataset.pose));
  }
  console.log('seconds', (Date.now() - t0) / 1000);
  console.log('changed px per 250ms:', diffs.join(' '));
  const seq = []; eyes.forEach(e => { if (seq[seq.length-1] !== e) seq.push(e); }); console.log('eye/pose sequence:', seq.join(' > '));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
