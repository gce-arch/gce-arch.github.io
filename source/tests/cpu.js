const { chromium } = require('playwright');
(async () => {
  const [,, file] = process.argv;
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  for (const [w, h, dpr] of [[1920,1080,1],[2560,1440,1.5],[1280,720,1]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); const p = await c.newPage();
    await p.goto('file://' + file + '#cat'); await p.waitForTimeout(1500);
    const cdp = await c.newCDPSession(p); await cdp.send('Performance.enable');
    const m0 = await cdp.send('Performance.getMetrics'); const g = (m, n) => m.metrics.find(x => x.name === n).value;
    await p.waitForTimeout(6000);
    const m1 = await cdp.send('Performance.getMetrics');
    const task = g(m1, 'TaskDuration') - g(m0, 'TaskDuration'), script = g(m1, 'ScriptDuration') - g(m0, 'ScriptDuration'), t = g(m1, 'Timestamp') - g(m0, 'Timestamp');
    console.log(`${w}x${h}@${dpr}: main-thread busy ${(task / t * 100).toFixed(1)}%  script ${(script / t * 100).toFixed(1)}%  (${(script / t / 15 * 1000).toFixed(2)} ms script per frame at 15 fps)`);
    await c.close();
  }
  await b.close();
})();
