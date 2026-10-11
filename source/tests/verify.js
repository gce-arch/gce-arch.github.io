// Full verification suite. usage: node verify.js <index.html> <prompt.md>
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const vm = require('vm');
const path = require('path');

const FILE = process.argv[2];
const PROMPT = process.argv[3];
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass, detail }); console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -- ' + detail : '')); };

// ---- DATA from the source file (the same object the page uses) ----
const src = fs.readFileSync(FILE, 'utf8');
const dataStart = src.indexOf('const DATA = {');
const dataEnd = src.indexOf('\n};', dataStart) + 3;
const DATA = vm.runInNewContext(src.slice(dataStart, dataEnd) + '\nDATA');
// DATA from the prompt (section 12), to confirm the page copy is identical
const prompt = fs.readFileSync(PROMPT, 'utf8');
const m = /```js\n(const DATA = \{[\s\S]*?\n\};)\n```/.exec(prompt.slice(prompt.indexOf('## 12. Data block')));
ok('DATA block in page is byte-identical to section 12', src.includes(m[1]), '');
const DATA12 = vm.runInNewContext(m[1] + '\nDATA');
ok('DATA counts 11 / 17 / 3', DATA.publications.length === 11 && DATA.projects.length === 17 && DATA.links.length === 3, '');

(async () => {
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });

  // ===== 1. source search for external references =====
  const patterns = [['<link', /<link/g], ['<script src', /<script[^>]*\ssrc=/g], ['@import', /@import/g], ['url(http', /url\(\s*["']?https?:/g], ['src="http', /src\s*=\s*["']https?:/g], ['href="http outside DATA', null]];
  for (const [n, re] of patterns) {
    if (!re) continue;
    const found = (src.match(re) || []).length;
    ok(`source has no "${n}"`, found === 0, `${found} found`);
  }
  // external URLs must only appear inside the DATA block
  const outsideData = src.slice(0, dataStart) + src.slice(dataEnd);
  const urls = outsideData.match(/https?:\/\/[^\s"'`)<]+/g) || [];
  const allowed = urls.filter(u => /w3\.org\/2000\/svg/.test(u));
  ok('no external URL outside DATA (SVG namespace excepted)', urls.length === allowed.length, JSON.stringify(urls.filter(u => !/w3\.org/.test(u)).slice(0, 5)));

  // ===== 2. network log (file:// and http://) =====
  {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const p = await ctx.newPage();
    const reqs = [];
    p.on('request', r => reqs.push(r.url()));
    await p.goto('file://' + FILE);
    await p.waitForTimeout(600);
    // exercise: open every modal once and switch tabs
    for (const t of ['projects', 'links', 'publications']) { await p.evaluate(h => { location.hash = h; }, t); await p.waitForTimeout(100); }
    await p.click('[data-id="pub-01"]'); await p.waitForTimeout(200); await p.keyboard.press('Escape');
    const nonFile = reqs.filter(u => !u.startsWith('file://') && !u.startsWith('data:'));
    const dataReqs = reqs.filter(u => u.startsWith('data:')).length;
    ok('file://: request log contains only the file itself', reqs.filter(u => u.startsWith('file://')).length === 1 && nonFile.length === 0, `requests=${reqs.length} (data: ${dataReqs}) ${nonFile.join(',')}`);
    await ctx.close();
  }
  {
    const server = http.createServer((req, res) => {
      if (req.url === '/' || req.url.startsWith('/index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(FILE)); }
      else { res.writeHead(404); res.end('nf'); }
    });
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const p = await ctx.newPage();
    const reqs = [];
    p.on('request', r => reqs.push(r.url()));
    await p.goto(`http://127.0.0.1:${port}/`);
    await p.waitForTimeout(600);
    const non = reqs.filter(u => !u.startsWith('data:'));
    ok('http://: request log contains only the document', non.length === 1 && non[0] === `http://127.0.0.1:${port}/`, non.join(','));
    await ctx.close();
    server.close();
  }

  // ===== 3. page behaviors at 1920x1080 =====
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) consoleMsgs.push(msg.type() + ': ' + msg.text()); });
  page.on('pageerror', e => consoleMsgs.push('pageerror: ' + e.message));
  await page.goto('file://' + FILE);
  await page.waitForTimeout(600);

  // --- data integrity ---
  const counts = await page.evaluate(() => ({
    pubs: document.querySelectorAll('#grid-publications .card').length,
    projs: document.querySelectorAll('#grid-projects .card').length,
    signs: document.querySelectorAll('.sign').length,
    boards: Array.from(document.querySelectorAll('.sign')).map(s => s.querySelectorAll('.board').length),
    h1: document.querySelectorAll('h1').length,
    h1text: document.querySelector('h1').textContent,
    lines: Array.from(document.querySelectorAll('#hdr-lines a')).map(a => ({ t: a.querySelector('.t').textContent, h: a.getAttribute('href'), tg: a.target, rel: a.rel, sr: a.textContent.includes('(opens in a new tab)') })),
    title: document.title, lang: document.documentElement.lang,
    meta: !!document.querySelector('meta[name=description]'), vp: !!document.querySelector('meta[name=viewport]'),
  }));
  ok('11 publication cards, 17 project cards', counts.pubs === 11 && counts.projs === 17, `${counts.pubs}/${counts.projs}`);
  ok('3 signposts with 3, 1, and 5 boards', counts.signs === 3 && JSON.stringify(counts.boards) === '[3,1,5]', JSON.stringify(counts.boards));
  ok('single h1 equals header.name', counts.h1 === 1 && counts.h1text === DATA.header.name, counts.h1text);
  ok('header lines: 4 links, new tab, noopener noreferrer, SR text', counts.lines.length === 4 && counts.lines.every((l, i) => l.h === DATA.header.lines[i].href && l.tg === '_blank' && /noopener/.test(l.rel) && /noreferrer/.test(l.rel) && l.sr), '');
  ok('title, lang, description, viewport', counts.title === 'Gregor Čehovin – Publications and projects' && counts.lang === 'en' && counts.meta && counts.vp, counts.title);

  // every href in DATA present in the DOM (header, publication modal, boards)
  const hrefsDom = new Set();
  for (const l of counts.lines) hrefsDom.add(l.h);
  const boardHrefs = await page.evaluate(() => Array.from(document.querySelectorAll('.board')).map(a => a.getAttribute('href')));
  boardHrefs.forEach(h => hrefsDom.add(h));
  const boardRels = await page.evaluate(() => Array.from(document.querySelectorAll('.board')).every(a => a.target === '_blank' && /noopener/.test(a.rel) && /noreferrer/.test(a.rel) && a.textContent.includes('(opens in a new tab)')));
  ok('boards: new tab + rel + SR text', boardRels, '');
  const cardTitles = await page.evaluate(() => Array.from(document.querySelectorAll('#grid-publications .card')).map(b => ({ al: b.getAttribute('aria-label'), hp: b.getAttribute('aria-haspopup'), tag: b.tagName, tx: b.querySelector('.card-text').textContent })));
  const strip = s => s.replace(/<\/?[ib]>/g, '');
  ok('pub cards: <button>, aria-haspopup=dialog, accessible name = fullTitle, text = shortTitle', cardTitles.every((c, i) => c.tag === 'BUTTON' && c.hp === 'dialog' && c.al === strip(DATA.publications[i].fullTitle) && c.tx === strip(DATA.publications[i].shortTitle)), '');
  const projCards = await page.evaluate(() => Array.from(document.querySelectorAll('#grid-projects .card')).map(b => ({ al: b.getAttribute('aria-label'), tx: b.querySelector('.card-text').textContent, v: b.dataset.v })));
  ok('project cards: names/titles in source order, 4 cover cycle fixed', projCards.every((c, i) => c.al === DATA.projects[i].title && c.tx === DATA.projects[i].title && c.v === String(i % 4)), '');

  // open each publication modal and check content; collect hrefs
  const pubChecks = [];
  for (const pub of DATA.publications) {
    await page.evaluate(() => { location.hash = 'publications'; });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click(`[data-id="${pub.id}"]`);
    await page.waitForTimeout(60);
    const r = await page.evaluate(() => {
      const mo = document.getElementById('modal');
      const labels = Array.from(mo.querySelectorAll('.label')).map(l => l.textContent);
      const a = mo.querySelector('a.btn');
      return {
        role: mo.getAttribute('role'), modal: mo.getAttribute('aria-modal'), lb: mo.getAttribute('aria-labelledby'),
        h2: mo.querySelector('#modal-title').textContent, h2tag: mo.querySelector('#modal-title').tagName,
        en: (mo.querySelector('.modal-title-en') || {}).textContent || null,
        cit: mo.querySelector('.citation').textContent, citItalics: Array.from(mo.querySelectorAll('.citation i')).length,
        labels, href: a.getAttribute('href'), linkText: a.textContent, tg: a.target, rel: a.rel,
        paras: Array.from(mo.querySelectorAll('.text')).map(t => t.textContent),
        copy: mo.querySelector('button.btn').textContent,
        active: document.activeElement.className, inModal: mo.contains(document.activeElement),
        htmlOverflow: getComputedStyle(document.documentElement).overflow,
      };
    });
    hrefsDom.add(r.href);
    const exp = DATA.publications.find(x => x.id === pub.id);
    let good = r.role === 'dialog' && r.modal === 'true' && r.h2 === strip(exp.fullTitle) && r.h2tag === 'H2' && r.lb === 'modal-title' && r.cit === strip(exp.citation) && r.href === exp.href && r.linkText.includes(exp.href) && r.tg === '_blank' && /noopener/.test(r.rel) && r.inModal && r.htmlOverflow === 'hidden';
    if (exp.titleEn) good = good && r.en === exp.titleEn;
    else good = good && r.en === null;
    if (exp.abstractLang === 'sl') {
      good = good && JSON.stringify(r.labels) === JSON.stringify(['Citation (APA 7)', 'Abstract (Slovenian, original)', 'English translation (machine-generated)']) && r.paras[0] === exp.abstract && r.paras[1] === exp.abstractEn;
    } else {
      good = good && JSON.stringify(r.labels) === JSON.stringify(['Citation (APA 7)', 'Abstract']) && r.paras[0] === exp.abstract.replace(/<\/?[ib]>/g, '');
    }
    pubChecks.push([pub.id, good]);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(40);
  }
  ok('11 publication modals: heading, titleEn, citation, buttons, href, labels, abstract(s)', pubChecks.every(c => c[1]), pubChecks.filter(c => !c[1]).map(c => c[0]).join(','));

  // project modals
  const projChecks = [];
  for (const pr of DATA.projects) {
    await page.evaluate(() => { location.hash = 'projects'; });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click(`[data-id="${pr.id}"]`);
    await page.waitForTimeout(60);
    const r = await page.evaluate(() => {
      const mo = document.getElementById('modal');
      return {
        h2: mo.querySelector('#modal-title').textContent,
        dt: Array.from(mo.querySelectorAll('dt')).map(d => d.textContent), dd: Array.from(mo.querySelectorAll('dd')).map(d => d.textContent),
        labels: Array.from(mo.querySelectorAll('.label')).map(l => l.textContent),
        text: (mo.querySelector('.text') || {}).textContent || null,
        paraCount: mo.querySelectorAll('.text p, .text li').length,
        bold: mo.querySelectorAll('.text b').length, li: mo.querySelectorAll('.text li').length,
        cls: mo.className,
      };
    });
    const expDt = [pr.kind === 'program' ? 'Program leader' : 'Project leader', 'Period'].concat(pr.funder ? ['Funder'] : []).concat(pr.code ? ['Code'] : []);
    const expDd = [pr.leader, pr.period].concat(pr.funder ? [pr.funder] : []).concat(pr.code ? [pr.code] : []);
    let good = r.h2 === pr.title && JSON.stringify(r.dt) === JSON.stringify(expDt) && JSON.stringify(r.dd) === JSON.stringify(expDd) && /modal--proj/.test(r.cls);
    if (pr.abstract) {
      const paras = pr.abstract.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      good = good && JSON.stringify(r.labels) === JSON.stringify(['Abstract']) && r.paraCount === paras.length;
      good = good && r.text === paras.map(s => s.replace(/<\/?[ib]>/g, '').replace(/^• /, '')).join('');
    } else {
      good = good && r.labels.length === 0 && r.text === null;
    }
    projChecks.push([pr.id, good]);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(40);
  }
  ok('17 project modals: facts, leader label, abstract only when present, paragraph/list structure', projChecks.every(c => c[1]), projChecks.filter(c => !c[1]).map(c => c[0]).join(','));
  // special content structure
  await page.evaluate(() => { location.hash = 'projects'; });
  await page.click('[data-id="proj-02"]'); await page.waitForTimeout(60);
  const li2 = await page.evaluate(() => ({ li: document.querySelectorAll('#modal .bul li').length, gems: document.querySelectorAll('#modal .bul li svg').length, bulletChars: Array.from(document.querySelectorAll('#modal .bul li')).some(l => l.textContent.trim().startsWith('•')) }));
  ok('proj-02: 5 bullet list items with gem sprite, no bullet character', li2.li === 5 && li2.gems === 5 && !li2.bulletChars, JSON.stringify(li2));
  await page.keyboard.press('Escape');
  await page.click('[data-id="proj-05"]'); await page.waitForTimeout(60);
  const b5 = await page.evaluate(() => ({ b: document.querySelectorAll('#modal .text b').length, li: document.querySelectorAll('#modal .bul li').length }));
  ok('proj-05: bold work-package headings (3) and 2 list items', b5.b === 3 && b5.li === 2, JSON.stringify(b5));
  await page.keyboard.press('Escape');

  hrefsDom.add(null);
  const allHrefs = [];
  DATA.header.lines.forEach(l => allHrefs.push(l.href));
  DATA.publications.forEach(p => allHrefs.push(p.href));
  DATA.links.forEach(s => s.items.forEach(i => allHrefs.push(i.href)));
  const missing = allHrefs.filter(h => !hrefsDom.has(h));
  ok(`every href from section 12 is present (${allHrefs.length})`, missing.length === 0, missing.join(','));

  // --- layout at 1920x1080 ---
  await page.evaluate(() => { location.hash = 'publications'; });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const lay = await page.evaluate(() => {
    const hb = document.getElementById('site-header').getBoundingClientRect().bottom;
    const cards = Array.from(document.querySelectorAll('#grid-publications .card')).map(c => c.getBoundingClientRect());
    const tops = [...new Set(cards.map(r => Math.round(r.top)))];
    const full = r => r.top >= hb - 1 && r.bottom <= innerHeight + 1;
    const rows = tops.map(t => cards.filter(r => Math.round(r.top) === t));
    return { cols: getComputedStyle(document.getElementById('grid-publications')).gridTemplateColumns.split(' ').length, fullRows: rows.filter(rw => rw.every(full)).length, hb, stuck: document.getElementById('site-header').classList.contains('is-stuck') };
  });
  ok('1920x1080 expanded header: 4 columns, >= 2 full rows visible, not stuck', lay.cols === 4 && lay.fullRows >= 2 && !lay.stuck, JSON.stringify(lay));
  await page.evaluate(() => window.scrollTo(0, 99999));
  await page.waitForTimeout(250);
  const lay2 = await page.evaluate(() => {
    const hb = document.getElementById('site-header').getBoundingClientRect().bottom;
    const cards = Array.from(document.querySelectorAll('#grid-publications .card')).map(c => c.getBoundingClientRect());
    const tops = [...new Set(cards.map(r => Math.round(r.top)))];
    const full = r => r.top >= hb - 1 && r.bottom <= innerHeight + 1;
    const rows = tops.map(t => cards.filter(r => Math.round(r.top) === t));
    return { fullRows: rows.filter(rw => rw.every(full)).length, hb, stuck: document.getElementById('site-header').classList.contains('is-stuck'), sy: scrollY };
  });
  ok('1920x1080 compact header (stuck): >= 3 full rows visible', lay2.stuck && lay2.fullRows >= 3, JSON.stringify(lay2));

  // --- font sizes at 1920x1080 ---
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const fsz = await page.evaluate(() => {
    const px = e => parseFloat(getComputedStyle(e).fontSize);
    document.querySelector('[data-id="pub-01"]').click();
    const mo = document.getElementById('modal');
    const r = { card: px(document.querySelector('.card-text')), name: px(document.querySelector('.hdr-name .nm')), role: px(document.querySelector('.hdr-name .role')), body: px(mo.querySelector('.text p')), cit: px(mo.querySelector('.citation')), h2: px(mo.querySelector('.modal-title')) };
    return r;
  });
  await page.keyboard.press('Escape');
  ok('1920x1080 font sizes: card>=26, modal body>=22, citation>=22, name 32 (was 48 px), role 16', fsz.card >= 26 && fsz.body >= 22 && fsz.cit >= 22 && fsz.name === 32 && fsz.role === 16, JSON.stringify(fsz));

  // --- header: scrolls away with the page, then sticks as the compact bar ---
  async function headerTest(w, h) {
    const c2 = await browser.newContext({ viewport: { width: w, height: h } });
    const p2 = await c2.newPage();
    await p2.goto('file://' + FILE);
    await p2.waitForTimeout(400);
    const out = [];
    for (const tab of ['publications', 'projects', 'links']) {
      await p2.evaluate(t => { location.hash = t; }, tab);
      await p2.waitForTimeout(200);
      await p2.evaluate(() => window.scrollTo(0, 0));
      await p2.waitForTimeout(150);
      const geo = await p2.evaluate(() => ({ D: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-d')), C: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-c')), E: document.getElementById('site-header').offsetHeight }));
      const maxScroll = await p2.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const heights = new Set();
      let jumps = 0, badTop = 0;
      const seq = [];
      for (let y = 0; y <= maxScroll; y += 7) seq.push(y);
      seq.push(maxScroll);
      for (let y = maxScroll; y >= 0; y -= 7) seq.push(y);
      seq.push(0);
      let prevStuck = null, switches = 0, firstStuck = null, firstUnstuck = null;
      for (let i = 0; i < seq.length; i++) {
        const y = seq[i];
        await p2.evaluate(v => window.scrollTo(0, v), y);
        await p2.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const s = await p2.evaluate(() => { const hd = document.getElementById('site-header'); return { stuck: hd.classList.contains('is-stuck'), sy: Math.round(scrollY), dh: document.documentElement.scrollHeight, top: Math.round(hd.getBoundingClientRect().top), hh: hd.offsetHeight }; });
        heights.add(s.dh);
        if (Math.abs(s.sy - y) > 1) jumps++;
        if (Math.abs(s.top + Math.min(s.sy, geo.D)) > 1) badTop++;      // header top = -min(scrollY, D)
        if (prevStuck !== null && s.stuck !== prevStuck) { switches++; if (s.stuck && firstStuck === null) firstStuck = y; if (!s.stuck && firstUnstuck === null) firstUnstuck = y; }
        prevStuck = s.stuck;
      }
      out.push({ tab, maxScroll, D: geo.D, C: geo.C, E: geo.E, docHeights: heights.size, switches, jumps, badTop, firstStuck, firstUnstuck });
    }
    await c2.close();
    return out;
  }
  for (const [w, h] of [[1920, 1080], [1280, 600], [1280, 720], [390, 844]]) {
    const r = await headerTest(w, h);
    for (const t of r) {
      const pass = t.docHeights === 1 && t.jumps === 0 && t.badTop === 0 && t.switches === 2 && t.firstStuck !== null && t.firstUnstuck !== null && t.firstUnstuck < t.firstStuck && t.firstStuck <= t.D;
      ok(`header ${w}x${h} ${t.tab}: scrolls away 1:1 (top = -min(scrollY, D)), constant doc height, no jump, 2 stuck switches (hysteresis ${t.firstUnstuck} < ${t.firstStuck} <= D=${t.D})`, pass, JSON.stringify(t));
    }
  }
  {
    // the collapse is complete within D px of scrolling, much sooner than a fixed collapse threshold
    const geoAt = async (w, h) => { const c2 = await browser.newContext({ viewport: { width: w, height: h } }); const p2 = await c2.newPage(); await p2.goto('file://' + FILE); await p2.waitForTimeout(400); const g = await p2.evaluate(() => ({ D: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-d')), E: document.getElementById('site-header').offsetHeight })); await c2.close(); return g; };
    const g19 = await geoAt(1920, 1080), g12 = await geoAt(1280, 720);
    ok('header fully compact after <= 190 px (1920x1080) and <= 130 px (1280x720) of scrolling', g19.D <= 190 && g12.D <= 130, JSON.stringify({ g19, g12 }));
  }

  // --- keyboard: tab order, tabs arrows, modal trap, focus restore ---
  const kpage = await ctx.newPage();
  await kpage.goto('file://' + FILE);
  await kpage.waitForTimeout(400);
  const seqFocus = [];
  {
    const page = kpage;
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
    seqFocus.push(await page.evaluate(() => { const a = document.activeElement; return a.className.split(' ')[0] + ':' + (a.textContent || '').trim().slice(0, 22); }));
  }
  }
  ok('Tab order: skip link, 4 header lines, tab (roving), cards', /skip/.test(seqFocus[0]) && seqFocus.slice(1, 5).every(s => /^hdr-link/.test(s)) && /^tab:/.test(seqFocus[5]) && /^card/.test(seqFocus[6]), seqFocus.join(' | '));
  await kpage.close();
  // arrow keys on tabs
  await page.focus('#tab-publications');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  let st = await page.evaluate(() => ({ hash: location.hash, sel: document.querySelector('.tab[aria-selected=true]').dataset.tab, foc: document.activeElement.id, vis: Array.from(document.querySelectorAll('.panel')).filter(p => !p.hidden).map(p => p.id) }));
  const t1 = st.hash === '#projects' && st.sel === 'projects' && st.foc === 'tab-projects' && st.vis.join() === 'panel-projects';
  await page.keyboard.press('End'); await page.waitForTimeout(150);
  st = await page.evaluate(() => ({ hash: location.hash, foc: document.activeElement.id }));
  const t2 = st.hash === '#cat' && st.foc === 'tab-cat';
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  st = await page.evaluate(() => ({ hash: location.hash, foc: document.activeElement.id }));
  const t3 = st.hash === '#publications' && st.foc === 'tab-publications';
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
  await page.keyboard.press('Home'); await page.waitForTimeout(150);
  st = await page.evaluate(() => ({ hash: location.hash, foc: document.activeElement.id }));
  const t4 = st.hash === '#publications' && st.foc === 'tab-publications';
  const aria = await page.evaluate(() => Array.from(document.querySelectorAll('.tab')).map(t => [t.getAttribute('role'), t.getAttribute('aria-controls'), t.getAttribute('aria-selected'), t.tabIndex].join('/')).join(' '));
  ok('Tabs: ArrowLeft/Right wrap, Home, End, hash updated, roving tabindex, aria', t1 && t2 && t3 && t4, aria);
  const tablist = await page.evaluate(() => ({ tl: document.querySelector('[role=tablist]') !== null, panels: Array.from(document.querySelectorAll('[role=tabpanel]')).map(p => p.getAttribute('aria-labelledby')).join() }));
  ok('role=tablist / tabpanel + aria-labelledby (4 tabs)', tablist.tl && tablist.panels === 'tab-publications,tab-projects,tab-links,tab-cat', JSON.stringify(tablist));
  // hash on load and hashchange
  await page.goto('file://' + FILE + '#links'); await page.waitForTimeout(250);
  const hl = await page.evaluate(() => document.querySelector('.tab[aria-selected=true]').dataset.tab);
  await page.goto('file://' + FILE); await page.waitForTimeout(250);
  const hd = await page.evaluate(() => ({ sel: document.querySelector('.tab[aria-selected=true]').dataset.tab, hash: location.hash }));
  ok('initial hash #links honored; default is publications (#publications)', hl === 'links' && hd.sel === 'publications' && hd.hash === '#publications', JSON.stringify(hd));
  // switching tab scrolls to top
  await page.evaluate(() => window.scrollTo(0, 150)); await page.waitForTimeout(100);
  await page.click('#tab-projects'); await page.waitForTimeout(250);
  ok('switching tabs scrolls to top', (await page.evaluate(() => scrollY)) === 0, '');

  // modal: open with Enter, trap, Esc, restore
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.focus('#tab-publications'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  await page.focus('[data-id="pub-02"]');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const o1 = await page.evaluate(() => ({ open: !document.getElementById('overlay').hidden, inModal: document.getElementById('modal').contains(document.activeElement), bgInert: document.getElementById('main').hasAttribute('inert') && document.getElementById('site-header').hasAttribute('inert') }));
  const trail = [];
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); trail.push(await page.evaluate(() => { const a = document.activeElement; return document.getElementById('modal').contains(a) ? (a.className.split(' ')[0] || a.tagName) : 'OUTSIDE:' + a.tagName; })); }
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Shift+Tab'); trail.push(await page.evaluate(() => { const a = document.activeElement; return document.getElementById('modal').contains(a) ? (a.className.split(' ')[0] || a.tagName) : 'OUTSIDE:' + a.tagName; })); }
  ok('modal: opens with Enter, focus inside, background inert, Tab/Shift+Tab trapped', o1.open && o1.inModal && o1.bgInert && trail.every(t => !t.startsWith('OUTSIDE')), trail.join(' > '));
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const o2 = await page.evaluate(() => ({ closed: document.getElementById('overlay').hidden, id: document.activeElement.dataset.id, ov: getComputedStyle(document.documentElement).overflow, inert: document.getElementById('main').hasAttribute('inert') }));
  ok('Esc closes, focus returns to the opening card, scroll unlocked', o2.closed && o2.id === 'pub-02' && o2.ov !== 'hidden' && !o2.inert, JSON.stringify(o2));
  // click outside / close button
  await page.click('[data-id="pub-02"]'); await page.waitForTimeout(120);
  await page.mouse.click(30, 540); await page.waitForTimeout(120);
  const o3 = await page.evaluate(() => ({ closed: document.getElementById('overlay').hidden, id: document.activeElement.dataset && document.activeElement.dataset.id }));
  ok('click outside the panel closes and restores focus', o3.closed && o3.id === 'pub-02', JSON.stringify(o3));
  await page.click('[data-id="pub-02"]'); await page.waitForTimeout(120);
  await page.click('.close'); await page.waitForTimeout(120);
  const o4 = await page.evaluate(() => ({ closed: document.getElementById('overlay').hidden, id: document.activeElement.dataset && document.activeElement.dataset.id, label: null }));
  const closeName = await (async () => { await page.click('[data-id="pub-02"]'); const n = await page.evaluate(() => document.querySelector('.close').getAttribute('aria-label')); await page.keyboard.press('Escape'); return n; })();
  ok('close button works (accessible name "Close") and restores focus', o4.closed && o4.id === 'pub-02' && closeName === 'Close', closeName);
  // click inside panel must not close
  await page.click('[data-id="pub-02"]'); await page.waitForTimeout(120);
  await page.click('.modal-title'); await page.waitForTimeout(100);
  ok('click inside the panel does not close', await page.evaluate(() => !document.getElementById('overlay').hidden), '');
  // modal header stays visible while the body scrolls
  const sc = await page.evaluate(() => { const b = document.querySelector('.modal-body'); b.scrollTop = 400; const h = document.querySelector('.modal-head').getBoundingClientRect(); return { st: b.scrollTop, headTop: h.top, sh: b.scrollHeight, ch: b.clientHeight }; });
  ok('modal body scrolls internally; head (title and close) stays visible', sc.st > 0 && sc.headTop > 0, JSON.stringify(sc));
  await page.keyboard.press('Escape');

  // --- Copy citation ---
  await page.click('[data-id="pub-01"]'); await page.waitForTimeout(120);
  await page.click('button.btn'); await page.waitForTimeout(250);
  const copied = await page.evaluate(async () => ({ label: document.querySelector('button.btn').textContent, clip: await navigator.clipboard.readText().catch(e => 'ERR:' + e.message) }));
  const expCit = DATA.publications[0].citation.replace(/<\/?[ib]>/g, '');
  ok('Copy citation: label "Copied", clipboard has plain citation text (tags stripped)', copied.label === 'Copied' && copied.clip === expCit, copied.label + ' | ' + copied.clip.slice(0, 60));
  await page.waitForTimeout(2200);
  ok('Copy label reverts after about two seconds', (await page.evaluate(() => document.querySelector('button.btn').textContent)) === 'Copy citation', '');
  // fallback path
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); });
  await page.evaluate(() => navigator.permissions && 0);
  await page.click('button.btn'); await page.waitForTimeout(250);
  const fb = await page.evaluate(() => ({ label: document.querySelector('button.btn').textContent, focus: document.activeElement.className, tas: document.querySelectorAll('textarea').length }));
  ok('Copy fallback (execCommand) works when navigator.clipboard is unavailable; focus preserved; no leftover textarea', fb.label === 'Copied' && fb.tas === 0 && /btn/.test(fb.focus), JSON.stringify(fb));
  await page.keyboard.press('Escape');

  // --- glow on hover and focus-visible for each clickable kind ---
  await page.goto('file://' + FILE + '?g=1');
  await page.waitForTimeout(400);
  async function filt(sel, hover) {
    const loc = page.locator(sel).first();
    await loc.scrollIntoViewIfNeeded();
    if (hover) await loc.hover(); else { await page.mouse.move(5, 5); }
    await page.waitForTimeout(250);
    return await loc.evaluate(e => ({ f: getComputedStyle(e).filter, ts: getComputedStyle(e).textShadow, ico: (e.querySelector('.spr') ? getComputedStyle(e.querySelector('.spr')).filter : 'none') }));
  }
  await page.evaluate(() => { location.hash = 'publications'; window.scrollTo(0, 0); });
  await page.waitForTimeout(200);
  const g = {};
  g.card0 = await filt('#grid-publications .card', false);
  g.card1 = await filt('#grid-publications .card', true);
  ok('hover glow: publication card (brightness + stepped drop-shadows)', g.card0.f === 'none' && /brightness/.test(g.card1.f) && (g.card1.f.match(/drop-shadow/g) || []).length >= 4, g.card1.f.slice(0, 90));
  g.line0 = await filt('.hdr-link', false); g.line1 = await filt('.hdr-link', true);
  ok('hover glow: header line (color/text-shadow)', g.line0.ts === 'none' && g.line1.ts !== 'none', g.line1.ts.slice(0, 60));
  g.tab0 = await filt('#tab-projects', false); g.tab1 = await filt('#tab-projects', true);
  ok('hover glow: tab (plate brightness, icon glows in liquid colour)', g.tab0.f === 'none' && /brightness/.test(g.tab1.f) && /drop-shadow/.test(g.tab1.ico), g.tab1.ico.slice(0, 80));
  await page.evaluate(() => { location.hash = 'links'; });
  await page.waitForTimeout(200);
  g.board1 = await filt('.board', true);
  ok('hover glow: signpost board', /brightness/.test(g.board1.f) && /drop-shadow/.test(g.board1.f), '');
  await page.evaluate(() => { location.hash = 'projects'; window.scrollTo(0, 0); });
  await page.waitForTimeout(200);
  g.tome1 = await filt('#grid-projects .card', true);
  ok('hover glow: project card', /brightness/.test(g.tome1.f) && /drop-shadow/.test(g.tome1.f), '');
  await page.mouse.move(5, 5);
  await page.evaluate(() => { location.hash = 'publications'; window.scrollTo(0, 0); });
  await page.waitForTimeout(200);
  await page.click('[data-id="pub-01"]'); await page.waitForTimeout(150);
  await page.mouse.move(5, 5);
  const ga = await page.evaluate(() => ['.close', 'button.btn', 'a.btn'].map(s => s));
  const hov = {};
  for (const s of ['.close', 'button.btn', 'a.btn']) {
    await page.locator(s).first().hover(); await page.waitForTimeout(250);
    hov[s] = await page.locator(s).first().evaluate(e => getComputedStyle(e).filter);
  }
  ok('hover glow: close button, Copy citation, Open article', Object.values(hov).every(f => /brightness/.test(f) && /drop-shadow/.test(f)), '');
  await page.mouse.move(5, 5);
  await page.keyboard.press('Escape');
  // focus-visible glow (keyboard)
  await page.goto('file://' + FILE + '?k=1');
  await page.waitForTimeout(400);
  const kf = {};
  const keyFocus = async (n, pred) => { for (let i = 0; i < n; i++) await page.keyboard.press('Tab'); await page.waitForTimeout(250); return await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); const ico = a.querySelector && a.querySelector('.spr') ? getComputedStyle(a.querySelector('.spr')).filter : 'none'; return { cls: a.className.split(' ')[0], f: cs.filter, ts: cs.textShadow, ico, fv: a.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; }); };
  kf.line = await keyFocus(2);
  kf.tab = await keyFocus(4);
  kf.card = await keyFocus(1);
  ok('keyboard focus glow + outline: header line', kf.line.fv && kf.line.ts !== 'none' && kf.line.outline.startsWith('solid'), JSON.stringify(kf.line));
  ok('keyboard focus glow + outline: tab', kf.tab.cls === 'tab' && kf.tab.fv && /brightness/.test(kf.tab.f) && /drop-shadow/.test(kf.tab.ico), JSON.stringify(kf.tab).slice(0, 160));
  ok('keyboard focus glow + outline: card', kf.card.cls === 'card' && kf.card.fv && /drop-shadow/.test(kf.card.f) && kf.card.outline.startsWith('solid'), kf.card.cls + ' ' + kf.card.outline);

  // --- reduced motion ---
  const ctxRM = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  const prm = await ctxRM.newPage();
  await prm.goto('file://' + FILE); await prm.waitForTimeout(300);
  await prm.click('[data-id="pub-01"]'); await prm.waitForTimeout(100);
  const rm = await prm.evaluate(() => ({ modalAnim: getComputedStyle(document.getElementById('modal')).animationName, trans: getComputedStyle(document.querySelector('.close')).transitionDuration, cardTrans: getComputedStyle(document.querySelector('.card')).transitionDuration, clip: getComputedStyle(document.getElementById('modal')).clipPath }));
  const prm2 = await ctx.newPage();
  await prm2.goto('file://' + FILE); await prm2.waitForTimeout(300);
  await prm2.click('[data-id="pub-01"]'); await prm2.waitForTimeout(10);
  const nm = await prm2.evaluate(() => ({ modalAnim: getComputedStyle(document.getElementById('modal')).animationName, cardTrans: getComputedStyle(document.querySelector('.card')).transitionDuration }));
  ok('prefers-reduced-motion: reduce removes modal animation and transitions', rm.modalAnim === 'none' && /^0s/.test(rm.cardTrans) && nm.modalAnim === 'unroll' && nm.cardTrans !== '0s', JSON.stringify({ rm, nm }));
  await ctxRM.close(); await prm2.close();

  // --- fonts: no fallback glyphs (CDP platform fonts) ---
  {
    const p3 = await ctx.newPage();
    await p3.goto('file://' + FILE); await p3.waitForTimeout(300);
    await p3.evaluate(() => {
      const d = document.createElement('div'); d.id = 'fonttest';
      d.style.cssText = 'position:fixed;left:0;top:0;z-index:999;background:#fff;color:#000;font-size:24px';
      const s = 'Č č Š š Ž ž Ć ć Đ đ ö ü é ä è ’ “ ” – — … • · » « ×';
      d.innerHTML = '<div id="ft1" style="font-family:\'Press Start 2P\'">' + s + '</div><div id="ft2" style="font-family:\'VT323\'">' + s + '</div><div id="ft3" style="font-family:\'VT323\';font-weight:700">' + s + '</div><div id="ft4" style="font-family:\'VT323\';font-style:italic">' + s + '</div>';
      document.body.appendChild(d);
    });
    await p3.waitForTimeout(300);
    const client = await ctx.newCDPSession(p3);
    await client.send('DOM.enable'); await client.send('CSS.enable');
    const doc = await client.send('DOM.getDocument', { depth: -1 });
    const fontRes = {};
    for (const id of ['ft1', 'ft2', 'ft3', 'ft4']) {
      const q = await client.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#' + id });
      const r = await client.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
      fontRes[id] = r.fonts.map(f => `${f.familyName}${f.isCustomFont ? '(custom)' : '(SYSTEM)'}:${f.glyphCount}`);
    }
    const allCustom = Object.values(fontRes).every(arr => arr.every(s => /\(custom\)/.test(s)));
    ok('required glyphs render with the embedded fonts only (CDP platform fonts, no system fallback)', allCustom, JSON.stringify(fontRes));
    const chk = await p3.evaluate(() => ['Č', 'š', 'ž', 'ć', 'đ', 'ö', 'ü', 'é', 'ä', 'è', '’', '“', '”', '–', '—', '…', '•', '·'].map(c => [document.fonts.check('24px "Press Start 2P"', c), document.fonts.check('24px "VT323"', c)]).flat().every(Boolean));
    ok('document.fonts.check for all required glyphs', chk, '');
    await p3.screenshot({ path: path.join(path.dirname(FILE), '..', 'shots', 'fonttest.png'), clip: { x: 0, y: 0, width: 1500, height: 190 } });
    await p3.close();
  }

  // --- structure checks ---
  const struct = await page.evaluate(() => ({
    sprAriaHidden: Array.from(document.querySelectorAll('svg')).every(s => s.getAttribute('aria-hidden') === 'true'),
    svgCount: document.querySelectorAll('svg').length,
    crisp: Array.from(document.querySelectorAll('svg')).every(s => s.getAttribute('shape-rendering') === 'crispEdges'),
    emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.textContent),
    ls: (() => { try { return localStorage.length; } catch (e) { return 'n/a'; } })(),
    cookies: document.cookie,
  }));
  ok('all sprite SVGs aria-hidden + crispEdges', struct.sprAriaHidden && struct.crisp, struct.svgCount + ' svgs');
  ok('no localStorage/cookies used', struct.ls === 0 && struct.cookies === '', JSON.stringify(struct));
  const bad = (src.match(/localStorage|sessionStorage|document\.cookie|indexedDB/g) || []).length;
  ok('source does not reference localStorage/sessionStorage/cookies', bad === 0, '' + bad);
  const emojiSrc = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(src);
  ok('no emoji in the source', !emojiSrc, '');
  ok('console: no errors or warnings during load and interaction', consoleMsgs.length === 0, consoleMsgs.slice(0, 3).join(' | '));
  const size = fs.statSync(FILE).size;
  ok('index.html under 1.5 MB', size < 1.5 * 1024 * 1024, (size / 1024).toFixed(1) + ' KB');

  // ===== 4. cat tab and cat room =====
  {
    // 4a. the tab row at many widths: four tabs, the fourth icon-only, square, at the right end, nothing overflows
    const tiers = [1920, 1600, 1280, 1050, 1049, 1000, 880, 879, 800, 760, 759, 600, 390, 360];
    const bad = [];
    for (const w of tiers) {
      const c3 = await browser.newContext({ viewport: { width: w, height: 800 } });
      const p3 = await c3.newPage(); await p3.goto('file://' + FILE); await p3.waitForTimeout(300);
      const r = await p3.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.tab')).map(t => { const r = t.getBoundingClientRect(); return { id: t.id, l: r.left, r: r.right, w: r.width, h: r.height, txt: t.textContent.trim().length }; });
        const hr = document.querySelector('.hdr-inner').getBoundingClientRect();
        const cat = tabs[3];
        return { n: tabs.length, w: cat.w, h: cat.h, catSquare: Math.abs(cat.w - cat.h) <= 1.5, catRightEdge: Math.abs(cat.r - hr.right) <= 1.5, catTxt: cat.txt, ordered: tabs.every((t, i) => i === 0 || t.l >= tabs[i - 1].r - 0.5), inside: tabs.every(t => t.l >= hr.left - 1 && t.r <= hr.right + 1), overflowX: document.documentElement.scrollWidth - innerWidth, order: tabs.map(t => t.id.replace('tab-', '')).join() };
      });
      const good = r.n === 4 && r.catSquare && r.catRightEdge && r.catTxt === 0 && r.ordered && r.inside && r.overflowX <= 0 && r.order === 'publications,projects,links,cat';
      if (!good) bad.push([w, r]);
      await c3.close();
    }
    ok(`cat tab at ${tiers.length} widths (1920..360): 4 tabs in order, 4th icon-only, square, at the right end, no overflow`, bad.length === 0, JSON.stringify(bad).slice(0, 400));

    // 4b. the room fills the area below the compact header; canvas scale is a whole number of device pixels
    const roomRes = [];
    for (const [w, h, dpr] of [[1920, 1080, 1], [1280, 720, 1], [1000, 700, 1], [390, 844, 2], [1440, 900, 2], [1366, 768, 1.25]]) {
      const c4 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const p4 = await c4.newPage();
      const e4 = []; p4.on('console', m => { if (['error', 'warning'].includes(m.type())) e4.push(m.text()); }); p4.on('pageerror', e => e4.push(e.message));
      await p4.goto('file://' + FILE); await p4.waitForTimeout(300);
      await p4.click('#tab-cat'); await p4.waitForTimeout(700);
      const r = await p4.evaluate(() => {
        const hd = document.getElementById('site-header').getBoundingClientRect(), room = document.getElementById('cat-room').getBoundingClientRect();
        const cv = document.getElementById('cat-canvas'), cr = cv.getBoundingClientRect();
        const D = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-d'));
        const devScale = (cr.width / cv.width) * devicePixelRatio;
        return { hash: location.hash, sel: document.getElementById('tab-cat').getAttribute('aria-selected'), stuck: document.getElementById('site-header').classList.contains('is-stuck'), roomTop: Math.round(room.top), hdrBottom: Math.round(hd.bottom), roomBottom: Math.round(room.bottom), vh: innerHeight, sy: Math.round(scrollY), D, extra: document.documentElement.scrollHeight - innerHeight, cw: cv.width, ch: cv.height, devScale, cover: cr.width >= room.width - 1 && cr.height >= room.height - 1, pose: document.getElementById('cat-stage').dataset.pose };
      });
      const good = r.hash === '#cat' && r.sel === 'true' && r.stuck && Math.abs(r.roomTop - r.hdrBottom) <= 1 && Math.abs(r.roomBottom - r.vh) <= 1 && Math.abs(r.sy - r.D) <= 1 && r.extra <= r.D + 1 && Math.abs(r.devScale - Math.round(r.devScale)) < 0.02 && r.devScale >= 2 && r.cover && r.pose === 'loaf' && e4.length === 0;
      roomRes.push([w + 'x' + h + '@' + dpr, good, good ? '' : JSON.stringify(r) + e4.join('|')]);
      await c4.close();
    }
    ok('cat room at 6 sizes/DPRs: header compact, room fills the area below it, whole-pixel canvas scale, starts with the loaf, no errors', roomRes.every(x => x[1]), roomRes.filter(x => !x[1]).map(x => x[0] + ' ' + x[2]).join(' || '));

    // 4c. pose cycle: 5 poses, shuffled, never the same twice in a row, 30 s timer, heart on click
    const c5 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p5 = await c5.newPage();
    const e5 = []; p5.on('console', m => { if (['error', 'warning'].includes(m.type())) e5.push(m.text()); }); p5.on('pageerror', e => e5.push(e.message));
    await p5.goto('file://' + FILE + '#cat'); await p5.waitForTimeout(700);
    const clickCat = async () => { const b = await p5.evaluate(() => { const r = document.getElementById('cat-stage').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.62]; }); await p5.mouse.click(b[0], b[1]); };
    const poseNow = () => p5.evaluate(() => document.getElementById('cat-stage').dataset.pose);
    const redCount = () => p5.evaluate(() => { const cv = document.getElementById('cat-canvas'); const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(cv, 0, 0); const d = x.getImageData(0, 0, t.width, t.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 228 && d[i + 1] === 80 && d[i + 2] === 74) n++; return n; });
    const seq = [await poseNow()];
    const red0 = await redCount();
    await clickCat(); await p5.waitForTimeout(350);
    const red1 = await redCount();
    seq.push(await poseNow());
    for (let i = 0; i < 11; i++) { await p5.waitForTimeout(900); await clickCat(); await p5.waitForTimeout(80); seq.push(await poseNow()); }
    const first5 = new Set(seq.slice(0, 5));
    ok('cat: click changes the pose; five different poses in the first five; no immediate repeat in 12 changes', first5.size === 5 && seq.every((x, i) => i === 0 || x !== seq[i - 1]), seq.join('>'));
    ok('cat: a heart appears after a click (red pixels increase)', red1 - red0 >= 15, `${red0} -> ${red1}`);
    ok('cat: pose names announced politely (role=status, aria-live implied)', await p5.evaluate(() => document.getElementById('cat-status').getAttribute('role') === 'status'), '');
    ok('cat: no console errors during clicks, dissolves, and layout', e5.length === 0, e5.join('|'));
    await c5.close();

    // 4d. the 30 s timer, with a controlled clock
    const c6 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p6 = await c6.newPage();
    await p6.clock.install();
    await p6.goto('file://' + FILE + '#cat');
    await p6.clock.runFor(1500);
    const pp = () => p6.evaluate(() => document.getElementById('cat-stage').dataset.pose);
    const a0 = await pp();
    await p6.clock.runFor(26500);
    const a1 = await pp();
    await p6.clock.runFor(4000);
    const a2 = await pp();
    await p6.clock.runFor(1500);
    const a3 = await pp();
    await p6.clock.runFor(30500);
    const a4 = await pp();
    ok('cat: pose changes by itself every 30 s (unchanged at 28 s, changed at 32 s, stable at 33.5 s, changed again by 64 s)', a0 === a1 && a2 !== a1 && a3 === a2 && a4 !== a3, [a0, a1, a2, a3, a4].join('>'));
    await c6.close();

    // 4e. idle motion: the scene moves slightly, the eyes blink, and everything stops off the cat tab
    const c7 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p7 = await c7.newPage();
    await p7.goto('file://' + FILE + '#cat'); await p7.waitForTimeout(500);
    const frame = () => p7.evaluate(() => document.getElementById('cat-canvas').toDataURL());
    const f0 = await frame(); await p7.waitForTimeout(1300); const f1 = await frame();
    let blinks = 0, sawOpen = false, prev = null;
    for (let i = 0; i < 260; i++) { const e = await p7.evaluate(() => document.getElementById('cat-stage').dataset.eye); if (e === 'open' || e === 'half') sawOpen = true; if (prev !== null && prev !== 'closed' && e === 'closed') blinks++; prev = e; await p7.waitForTimeout(40); }
    ok('cat: idle animation changes the picture slowly and the eyes blink (open <-> closed)', f0 !== f1 && sawOpen && blinks >= 1, `blinks=${blinks}`);
    await p7.click('#tab-publications'); await p7.waitForTimeout(300);
    const g0 = await frame(); await p7.waitForTimeout(1500); const g1 = await frame();
    ok('cat: animation stops when another tab is selected', g0 === g1, '');
    await p7.click('#tab-cat'); await p7.waitForTimeout(700);
    const g2 = await frame(); await p7.waitForTimeout(1300); const g3 = await frame();
    ok('cat: animation resumes when the cat tab is selected again', g2 !== g3, '');
    await c7.close();

    // 4f. resizing while the room is open re-lays out without errors
    const c8 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p8 = await c8.newPage();
    const e8 = []; p8.on('console', m => { if (['error', 'warning'].includes(m.type())) e8.push(m.text()); }); p8.on('pageerror', e => e8.push(e.message));
    await p8.goto('file://' + FILE + '#cat'); await p8.waitForTimeout(500);
    const dims = [];
    for (const [w, h] of [[1920, 1080], [800, 900], [390, 844], [1280, 720]]) { await p8.setViewportSize({ width: w, height: h }); await p8.waitForTimeout(450); dims.push(await p8.evaluate(() => { const cv = document.getElementById('cat-canvas'), r = cv.getBoundingClientRect(), room = document.getElementById('cat-room').getBoundingClientRect(); return [cv.width, cv.height, r.width >= room.width - 1 && r.height >= room.height - 1]; })); }
    ok('cat: resize re-lays out (canvas size changes, still covers the room), no errors', new Set(dims.map(d => d[0] + 'x' + d[1])).size === 4 && dims.every(d => d[2]) && e8.length === 0, JSON.stringify(dims) + e8.join('|'));
    await c8.close();
  }

  // ===== 5. navigation text: sharp sizes, smaller on large screens, compact name never clipped =====
  {
    const probe = async (w, h, dpr) => {
      const c9 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const p9 = await c9.newPage(); await p9.goto('file://' + FILE + '#links'); await p9.waitForTimeout(350);
      const r = await p9.evaluate(async () => {
        await document.fonts.ready;
        const f = e => parseFloat(getComputedStyle(e).fontSize);
        const nav = f(document.querySelector('.tab-label')), card = f(document.querySelector('.tab-label')) && 0;
        const cx = document.createElement('canvas').getContext('2d');
        const asc = (font, t) => { cx.font = font; return cx.measureText(t).actualBoundingBoxAscent; };
        const cardSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs-card')) || 0;
        const cardPx = (() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;visibility:hidden;font-size:var(--fs-card)'; document.body.appendChild(d); const v = f(d); d.remove(); return v; })();
        return { nav, plaque: f(document.querySelector('.plaque h3')), compact: f(document.getElementById('hdr-compact')), devPerFontPx: nav * devicePixelRatio / 8, navCap: asc(nav + 'px "Press Start 2P"', 'H'), cardCap: asc(cardPx + 'px "VT323"', 'H'), icon: document.querySelector('.tab .spr').getBoundingClientRect().height };
      });
      await c9.close(); return r;
    };
    const a = await probe(2560, 1440, 1.5), b1 = await probe(1920, 1080, 1), c1 = await probe(2560, 1440, 1), d1 = await probe(3840, 2160, 1);
    ok('nav text on a 4K screen at 150% (CSS 2560): 26.7 px = 5 device px per font pixel (was 32 px), same for link headings and compact name', Math.abs(a.nav - 26.6667) < 0.01 && Math.abs(a.devPerFontPx - 5) < 0.001 && a.plaque === a.nav && a.compact === a.nav, JSON.stringify(a));
    ok('nav text unchanged at 1920x1080 (24 px) and whole device-pixel multiples at 2560@1, 3840@1', b1.nav === 24 && b1.plaque === 24 && c1.nav === 24 && d1.nav === 40 && Number.isInteger(c1.devPerFontPx) && Number.isInteger(d1.devPerFontPx), JSON.stringify({ b1: b1.nav, c1: c1.nav, d1: d1.nav }));
    ok('nav labels stay larger than the card text (capital height) at 2560@1.5, 2560@1, 1920, 3840', [a, c1, b1, d1].every(r => r.navCap > r.cardCap), JSON.stringify([a, c1, b1, d1].map(r => [r.navCap, r.cardCap])));
    ok('tab icons keep their size (28 art pixels)', a.icon === 28 * 4 && b1.icon === 28 * 3, JSON.stringify([a.icon, b1.icon]));
    const bad = [];
    const combos = [];
    for (let w = 360; w <= 1400; w += 40) combos.push([w, 800, 1]);
    for (const c of [[2560, 1440, 1.5], [2560, 1440, 1], [3840, 2160, 1], [1920, 1080, 1], [1920, 1080, 1.25], [1536, 864, 1.25], [1440, 900, 2], [2560, 1440, 2], [2240, 1260, 1], [2880, 1620, 1], [3440, 1440, 1], [1366, 768, 1]]) combos.push(c);
    for (const [w, h, dpr] of combos) {
      const c9 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); const p9 = await c9.newPage();
      await p9.goto('file://' + FILE); await p9.waitForTimeout(220); await p9.evaluate(() => window.scrollTo(0, 9999)); await p9.waitForTimeout(120);
      const r = await p9.evaluate(() => {
        const cmp = document.getElementById('hdr-compact'), cs = getComputedStyle(cmp), cr = cmp.getBoundingClientRect();
        const vis = cs.display !== 'none' && cs.visibility !== 'hidden';
        const inside = ['.role', '.nm'].every(sel => Array.from(cmp.querySelector(sel).getClientRects()).every(x => x.right <= cr.right + 0.5 && x.bottom <= cr.bottom + 0.5));
        const tabs = Array.from(document.querySelectorAll('.tab')).map(t => t.getBoundingClientRect()), hr = document.querySelector('.hdr-inner').getBoundingClientRect();
        return { vis, inside, tabsFit: tabs.every(t => t.right <= hr.right + 1 && t.left >= hr.left - 1), over: document.documentElement.scrollWidth - innerWidth };
      });
      if ((r.vis && !r.inside) || !r.tabsFit || r.over > 0) bad.push([w, h, dpr, r]);
      await c9.close();
    }
    ok(`compact name never clipped, tabs inside the header, no horizontal overflow (${combos.length} width/DPR combinations from 360 to 3840 px, incl. 2560 at 150%)`, bad.length === 0, JSON.stringify(bad).slice(0, 300));
  }

  // ===== 6. library-hall room: robust at many sizes, stays pinned below the compact header after resizes =====
  {
    const sizes = [[360, 640, 2], [375, 667, 2], [390, 844, 3], [430, 932, 3], [600, 800, 2], [768, 1024, 2], [800, 900, 1], [844, 390, 3], [1000, 700, 1], [1024, 768, 1], [1180, 820, 2], [1280, 600, 1], [1280, 720, 1], [1366, 768, 1], [1440, 900, 2], [1536, 864, 1.25], [1920, 1080, 1], [1920, 1200, 1], [2048, 1152, 1], [2560, 1440, 1.5], [2560, 1440, 1], [3440, 1440, 1], [3840, 2160, 1], [5120, 1440, 1]];
    const bad = [];
    for (const [w, h, dpr] of sizes) {
      const cx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const px = await cx.newPage(); const errs = [];
      px.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); }); px.on('pageerror', e => errs.push(e.message));
      await px.goto('file://' + FILE + '#cat'); await px.waitForTimeout(450);
      const r = await px.evaluate(() => {
        const room = document.getElementById('cat-room').getBoundingClientRect(), cv = document.getElementById('cat-canvas'), cr = cv.getBoundingClientRect();
        const D = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-d')), hb = document.getElementById('site-header').getBoundingClientRect().bottom;
        return { covers: cr.width >= room.width - 1 && cr.height >= room.height - 1, bottom: Math.abs(room.bottom - innerHeight) <= 1, top: Math.abs(room.top - hb) <= 1, pinned: Math.abs(scrollY - D) <= 1, dim: cv.width + 'x' + cv.height };
      });
      if (errs.length || !r.covers || !r.bottom || !r.top || !r.pinned) bad.push([w + 'x' + h + '@' + dpr, r, errs.slice(0, 2)]);
      await cx.close();
    }
    ok(`room at ${sizes.length} viewport/DPR combinations (360x640 to 5120x1440): no errors, canvas covers the stage, stage starts under the compact header and fills the screen, scroll pinned`, bad.length === 0, JSON.stringify(bad).slice(0, 500));
    // resize / rotation while on the cat tab
    const cx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const p2 = await cx2.newPage(); const e2 = [];
    p2.on('console', m => { if (['error', 'warning'].includes(m.type())) e2.push(m.text()); }); p2.on('pageerror', e => e2.push(e.message));
    await p2.goto('file://' + FILE + '#cat'); await p2.waitForTimeout(500);
    const badR = [];
    for (const [w, h] of [[1000, 700], [390, 844], [844, 390], [1920, 1080], [768, 1024], [1280, 720]]) {
      await p2.setViewportSize({ width: w, height: h }); await p2.waitForTimeout(500);
      const r = await p2.evaluate(() => { const room = document.getElementById('cat-room').getBoundingClientRect(), D = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-d')), hb = document.getElementById('site-header').getBoundingClientRect().bottom; return { top: Math.abs(room.top - hb) <= 1, bottom: Math.abs(room.bottom - innerHeight) <= 1, pinned: Math.abs(scrollY - D) <= 1 }; });
      if (!r.top || !r.bottom || !r.pinned) badR.push([w, h, r]);
    }
    ok('cat tab after resizes and rotation: header stays compact, stage keeps filling the area below it', badR.length === 0 && e2.length === 0, JSON.stringify(badR) + e2.join('|'));
    await cx2.close();
    // time cost of the animation (script time per frame at about 15 fps)
    const cx3 = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const p3 = await cx3.newPage();
    await p3.goto('file://' + FILE + '#cat'); await p3.waitForTimeout(1200);
    const cdp = await cx3.newCDPSession(p3); await cdp.send('Performance.enable');
    const gm = (m, n) => m.metrics.find(x => x.name === n).value;
    const m0 = await cdp.send('Performance.getMetrics'); await p3.waitForTimeout(4000); const m1 = await cdp.send('Performance.getMetrics');
    const scriptShare = (gm(m1, 'ScriptDuration') - gm(m0, 'ScriptDuration')) / (gm(m1, 'Timestamp') - gm(m0, 'Timestamp'));
    ok('room animation cost: script time below 5% of one core at 1920x1080 (about 15 frames per second)', scriptShare < 0.05, (scriptShare * 100).toFixed(2) + '%');
    await cx3.close();
  }

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:'); failed.forEach(f => console.log(' - ' + f.name + ' :: ' + f.detail)); }
})();
