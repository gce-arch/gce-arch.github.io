const { chromium } = require('playwright');
(async () => {
  const [,, file, prefix, w='1920', h='1080'] = process.argv;
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
  const errs = []; p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file + '#cat'); await p.waitForTimeout(1000);
  const seen = {};
  for (let i = 0; i < 16 && Object.keys(seen).length < 5; i++) {
    const pose = await p.evaluate(() => document.getElementById('cat-stage').dataset.pose);
    if (!seen[pose]) { seen[pose] = 1; await p.waitForTimeout(500); await p.screenshot({ path: `${prefix}_${pose}.png` }); console.log('captured', pose); }
    const box = await p.evaluate(() => { const r = document.getElementById('cat-stage').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height*0.62]; });
    await p.mouse.click(box[0], box[1]); await p.waitForTimeout(1300);
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
