const { chromium } = require('playwright');
(async () => {
  const [,, file, outdir] = process.argv;
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const errs = [];
  for (const [w, h, dpr, name] of [[1920,1080,1,'1920x1080'],[1280,720,1,'1280x720'],[2560,1440,1.5,'2560x1440at150'],[1000,700,1,'1000x700'],[800,900,1,'800x900'],[390,844,2,'390x844'],[1440,900,2,'1440x900retina'],[3440,1440,1,'3440x1440ultrawide']]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); const p = await c.newPage();
    p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(name + ': ' + m.text()); }); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('file://' + file + '#cat'); await p.waitForTimeout(1600);
    const info = await p.evaluate(() => { const cv = document.getElementById('cat-canvas'); return [cv.width, cv.height]; });
    console.log(name, JSON.stringify(info));
    await p.screenshot({ path: `${outdir}/${name}.png` });
    await c.close();
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
