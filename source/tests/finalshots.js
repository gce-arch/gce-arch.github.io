const { chromium } = require('playwright');
(async () => {
  const [,, file, outdir] = process.argv;
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await c.newPage();
  const errs = []; p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file); await p.waitForTimeout(600);
  await p.screenshot({ path: `${outdir}/1_header_and_publications.png` });
  await p.evaluate(() => window.scrollTo(0, 120)); await p.waitForTimeout(250);
  await p.screenshot({ path: `${outdir}/2_header_scrolling_120px.png` });
  await p.goto('file://' + file + '#cat'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${outdir}/3_cat_room_loaf.png` });
  const click = async () => { const box = await p.evaluate(() => { const r = document.getElementById('cat-stage').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height*0.62]; }); await p.mouse.click(box[0], box[1]); };
  for (let i = 0; i < 10 && (await p.evaluate(() => document.getElementById('cat-stage').dataset.pose)) !== 'back'; i++) { await click(); await p.waitForTimeout(1400); }
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${outdir}/4_cat_room_asleep_on_back.png` });
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
