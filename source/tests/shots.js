// usage: node shots.js <index.html> <outPrefix> [w] [h]
const { chromium } = require('playwright');
(async () => {
  const [,, file, prefix, w='1920', h='1080'] = process.argv;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.type()+': '+m.text()); });
  p.on('pageerror', e => errs.push('pageerror: '+e.message));
  await p.goto('file://' + file);
  await p.waitForTimeout(400);
  const shot = async (name) => { await p.waitForTimeout(250); await p.screenshot({ path: `${prefix}_${name}.png` }); };
  for (const tab of ['publications', 'projects', 'links']) {
    await p.evaluate(t => { location.hash = t; }, tab);
    await p.waitForTimeout(300);
    await shot(`${tab}_expanded`);
    await p.evaluate(() => window.scrollTo(0, 700));
    await p.waitForTimeout(300);
    await shot(`${tab}_scrolled`);
  }
  async function modal(tab, sel, name) {
    await p.evaluate(t => { location.hash = t; }, tab);
    await p.waitForTimeout(250);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click(sel);
    await p.waitForTimeout(600);
    await shot(name);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
  }
  await modal('publications', '[data-id="pub-01"]', 'modal_pub01');
  await modal('publications', '[data-id="pub-03"]', 'modal_pub03');
  await modal('publications', '[data-id="pub-07"]', 'modal_pub07');
  await modal('projects', '[data-id="proj-01"]', 'modal_proj01');
  await modal('projects', '[data-id="proj-02"]', 'modal_proj02');
  await modal('projects', '[data-id="proj-05"]', 'modal_proj05');
  await modal('projects', '[data-id="proj-03"]', 'modal_proj03');
  console.log('errors/warnings:', errs.length ? errs : 'none');
  await b.close();
})();
