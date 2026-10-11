/* ---- Application ------------------------------------------------------ */
var root = document.documentElement;
var TABS = ['publications', 'projects', 'links', 'cat'];
function $(id) { return document.getElementById(id); }
var hdr = $('site-header'), bar = $('hdr-bar'), main = $('main');
var overlay = $('overlay'), modal = $('modal');
var EXT_SR = '<span class="sr-only"> (opens in a new tab)</span>';

/* ---------- text helpers ---------- */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* Whitelist: everything is escaped except <i>, </i>, <b>, </b>. */
function rich(s) { return esc(s).replace(/&lt;(\/?)(i|b)&gt;/g, '<$1$2>'); }
function plain(s) { return String(s).replace(/<\/?(?:i|b)>/g, ''); }
function mk(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

/* ---------- pixel unit ---------- */
function setPx() {
  var px = Math.max(2, Math.round(window.innerWidth / 640));
  root.style.setProperty('--px', px + 'px');
  root.style.setProperty('--fs-name', (8 * (px + 1)) + 'px');
  root.style.setProperty('--fs-role', (8 * Math.max(2, Math.round((px + 1) / 2))) + 'px');
  /* Press Start 2P is drawn on an 8-pixel grid, so it is sharpest when each font pixel covers a whole
     number of device pixels. From px 4 on (CSS width of 2240 or more) the navigation text is made about
     one sixth smaller and snapped to such a size; below that it is 8 * px as before. */
  var dpr = window.devicePixelRatio || 1;
  var nav = px >= 4 ? 8 * Math.max(3, Math.round(px * dpr * 5 / 6)) / dpr : 8 * px;
  root.style.setProperty('--fs-nav', nav + 'px');
  setCursors(px);
  return px;
}
/* Optional pixel cursors (arrow and pointing hand); standard cursors remain the fallback. */
function setCursors(px) {
  if (typeof PAL === 'undefined' || !PAL.ink) return;
  var k = Math.max(2, Math.min(5, px - 1));
  root.style.setProperty('--cur-arrow', 'url("' + spriteDataURI('cur_arrow', { scale: k }) + '") 0 0, default');
  root.style.setProperty('--cur-hand', 'url("' + spriteDataURI('cur_hand', { scale: k }) + '") ' + (7 * k) + ' 0, pointer');
}

/* ---------- sprites to CSS ---------- */
function installSprites() {
  readPalette();
  var s = root.style;
  s.setProperty('--bi-scroll', spriteURI('scroll'));
  for (var i = 0; i < TOME_COLORWAYS.length; i++) {
    s.setProperty('--bi-tome' + i, spriteURI('tome', { remap: TOME_COLORWAYS[i] }));
  }
  s.setProperty('--bi-book', spriteURI('book'));
  s.setProperty('--bi-btn', spriteURI('f_btn'));
  s.setProperty('--bi-tab', spriteURI('f_tab'));
  s.setProperty('--bi-tabon', spriteURI('f_tabon'));
  s.setProperty('--bi-plate', spriteURI('f_plate'));
  s.setProperty('--bi-btnred', spriteURI('f_btnred'));
  s.setProperty('--bi-plaque', spriteURI('f_plaque'));
  s.setProperty('--bi-plankR', spriteURI('plank'));
  s.setProperty('--bi-plankL', spriteURI('plank', { flip: true }));
  s.setProperty('--img-post', spriteURI('post'));
  s.setProperty('--img-mound', spriteURI('mound'));
  s.setProperty('--img-stone', spriteURI('stone'));
  s.setProperty('--img-grip', spriteURI('grip'));
  s.setProperty('--img-up', spriteURI('sbup'));
  s.setProperty('--img-down', spriteURI('sbdown'));
  var link = mk('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = spriteDataURI('favicon');
  document.head.appendChild(link);
}

/* ---------- header ---------- */
function buildHeader() {
  var name = DATA.header.name;
  var h1 = $('hdr-name');
  var m = /^(.*?,)\s*(.+)$/.exec(name);
  var compact = $('hdr-compact');
  if (m) {
    h1.innerHTML = '<span class="nm">' + esc(m[1]) + '</span><span class="role"> ' + esc(m[2]) + '</span>';
    compact.innerHTML = h1.innerHTML;
  } else {
    h1.textContent = name;
    compact.textContent = name;
  }
  var ul = $('hdr-lines');
  DATA.header.lines.forEach(function (ln) {
    var li = mk('li');
    var a = mk('a', 'hdr-link');
    a.href = ln.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = spriteSVG('gem', 'gem') + '<span class="t"></span>' + EXT_SR;
    a.querySelector('.t').textContent = ln.text;
    li.appendChild(a);
    ul.appendChild(li);
  });
}

/* ---------- paragraphs, bullet items, labels ---------- */
function renderText(container, text, lang) {
  var list = null;
  String(text).split(/\n\s*\n/).forEach(function (para) {
    para = para.trim();
    if (!para) return;
    if (para.indexOf('• ') === 0) {
      if (!list) {
        list = mk('ul', 'bul');
        if (lang) list.lang = lang;
        container.appendChild(list);
      }
      var li = mk('li');
      li.innerHTML = spriteSVG('gem', 'bgem') + '<span></span>';
      li.lastChild.innerHTML = rich(para.slice(2));
      list.appendChild(li);
    } else {
      list = null;
      var p = mk('p');
      if (lang) p.lang = lang;
      p.innerHTML = rich(para).replace(/^([A-Z]{3,}(?: [A-Z]{3,})*[.:])(\s)/, '<span class="plabel">$1</span>$2');
      container.appendChild(p);
    }
  });
}
function label(text) { var h = mk('h3', 'label'); h.innerHTML = spriteSVG('gem', 'lgem'); h.appendChild(document.createTextNode(text)); return h; }

/* ---------- cards ---------- */
function buildPublications() {
  var ul = $('grid-publications');
  DATA.publications.forEach(function (p) {
    var li = mk('li');
    var b = mk('button', 'card card--scroll glow');
    b.type = 'button';
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('aria-label', plain(p.fullTitle));
    b.dataset.id = p.id;
    var tx = mk('span', 'card-text');
    if (p.titleEn) tx.lang = 'sl';
    tx.innerHTML = rich(p.shortTitle);
    b.appendChild(tx);
    b.insertAdjacentHTML('beforeend', spriteSVG('seal', 'seal'));
    b.addEventListener('click', function () { openModal('pub', p, b); });
    li.appendChild(b);
    ul.appendChild(li);
  });
}
function buildProjects() {
  var ul = $('grid-projects');
  DATA.projects.forEach(function (p, i) {
    var li = mk('li');
    var b = mk('button', 'card card--tome glow');
    b.type = 'button';
    b.dataset.v = String(i % 4);
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('aria-label', plain(p.title));
    b.dataset.id = p.id;
    var plate = mk('span', 'plate');
    var tx = mk('span', 'card-text');
    tx.innerHTML = rich(p.title);
    plate.appendChild(tx);
    b.appendChild(plate);
    b.addEventListener('click', function () { openModal('proj', p, b); });
    li.appendChild(b);
    ul.appendChild(li);
  });
}

/* ---------- links: signposts ---------- */
function buildLinks() {
  var wrap = $('signs');
  DATA.links.forEach(function (sec, si) {
    var s = mk('section', 'sign');
    s.setAttribute('aria-labelledby', 'sign-h-' + si);
    var pl = mk('div', 'plaque');
    var h3 = mk('h3');
    h3.id = 'sign-h-' + si;
    h3.textContent = sec.heading;
    pl.appendChild(h3);
    s.appendChild(pl);
    var ul = mk('ul', 'boards');
    ul.setAttribute('role', 'list');
    sec.items.forEach(function (it, i) {
      var li = mk('li');
      var a = mk('a', 'board glow ' + (i % 2 === 0 ? 'board--r' : 'board--l'));
      a.href = it.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = '<span class="b-text"><span class="b-title"></span><span class="b-sub"></span></span>' +
        spriteSVG('ext', 'b-ext', { remap: { ch: 'g3' } }) + EXT_SR;
      a.querySelector('.b-title').textContent = it.title;
      a.querySelector('.b-sub').textContent = it.subtitle;
      li.appendChild(a);
      ul.appendChild(li);
    });
    s.appendChild(ul);
    wrap.appendChild(s);
  });
}

/* ---------- modal ---------- */
var opener = null;
function closeButton() {
  var b = mk('button', 'close glow');
  b.type = 'button';
  b.setAttribute('aria-label', 'Close');
  b.innerHTML = spriteSVG('close', '');
  b.addEventListener('click', closeModal);
  return b;
}
function titleBlock(title, titleEn) {
  var head = mk('div', 'modal-head');
  var box = mk('div', 'modal-titles');
  var h2 = mk('h2', 'modal-title');
  h2.id = 'modal-title';
  if (titleEn) h2.lang = 'sl';
  h2.innerHTML = rich(title);
  box.appendChild(h2);
  if (titleEn) {
    var en = mk('p', 'modal-title-en');
    en.innerHTML = rich(titleEn);
    box.appendChild(en);
  }
  head.appendChild(box);
  head.appendChild(closeButton());
  return head;
}
function copyCitation(btn, text) {
  var lab = btn.querySelector('.lab');
  var status = modal.querySelector('.copy-status');
  var done = function (ok) {
    lab.textContent = ok ? 'Copied' : 'Copy failed';
    if (status) status.textContent = ok ? 'Citation copied to the clipboard' : 'Copying failed';
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { lab.textContent = 'Copy citation'; if (status) status.textContent = ''; }, 2000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
  } else {
    done(fallbackCopy(text));
  }
}
function fallbackCopy(text) {
  var prev = document.activeElement;
  var ta = mk('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.setAttribute('aria-hidden', 'true');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  var host = modal.contains(prev) ? modal : document.body;
  host.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  var ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  host.removeChild(ta);
  if (prev && prev.focus) prev.focus({ preventScroll: true });
  return ok;
}
function buildPub(p) {
  var frag = document.createDocumentFragment();
  frag.appendChild(titleBlock(p.fullTitle, p.titleEn));
  var body = mk('div', 'modal-body');
  body.tabIndex = -1;
  body.appendChild(label('Citation (APA 7)'));
  var cit = mk('p', 'citation');
  cit.innerHTML = rich(p.citation);
  body.appendChild(cit);
  var actions = mk('div', 'actions');
  var copy = mk('button', 'btn glow');
  copy.type = 'button';
  copy.innerHTML = '<span class="btn-text lab">Copy citation</span>';
  copy.addEventListener('click', function () { copyCitation(copy, plain(p.citation)); });
  var open = mk('a', 'btn btn--link glow');
  open.href = p.href;
  open.target = '_blank';
  open.rel = 'noopener noreferrer';
  open.innerHTML = '<span class="btn-text">Open article<span class="u"></span></span>' +
    spriteSVG('ext', '', { remap: { ch: 'ink' } }) + EXT_SR;
  open.querySelector('.u').textContent = p.href;
  actions.appendChild(copy);
  actions.appendChild(open);
  body.appendChild(actions);
  if (p.abstractLang === 'sl') {
    body.appendChild(label('Abstract (Slovenian, original)'));
    var box = mk('div', 'text');
    renderText(box, p.abstract, 'sl');
    body.appendChild(box);
    body.appendChild(label('English translation (machine-generated)'));
    var box2 = mk('div', 'text');
    renderText(box2, p.abstractEn || '', 'en');
    body.appendChild(box2);
  } else {
    body.appendChild(label('Abstract'));
    var box3 = mk('div', 'text');
    renderText(box3, p.abstract, null);
    body.appendChild(box3);
  }
  var status = mk('p', 'sr-only copy-status');
  status.setAttribute('role', 'status');
  body.appendChild(status);
  frag.appendChild(body);
  return frag;
}
function buildProj(p) {
  var frag = document.createDocumentFragment();
  frag.appendChild(titleBlock(p.title, null));
  var body = mk('div', 'modal-body');
  body.tabIndex = -1;
  var facts = [
    [p.kind === 'program' ? 'Program leader' : 'Project leader', p.leader],
    ['Period', p.period],
    ['Funder', p.funder],
    ['Code', p.code]
  ].filter(function (f) { return f[1]; });
  var dl = mk('dl', 'facts');
  facts.forEach(function (f) {
    var dt = mk('dt');
    dt.textContent = f[0];
    var dd = mk('dd');
    dd.textContent = f[1];
    dl.appendChild(dt);
    dl.appendChild(dd);
  });
  body.appendChild(dl);
  if (p.abstract) {
    body.appendChild(label('Abstract'));
    var box = mk('div', 'text');
    renderText(box, p.abstract, null);
    body.appendChild(box);
  }
  frag.appendChild(body);
  return frag;
}

function setInert(on) {
  [hdr, main, document.querySelector('.skip')].forEach(function (n) {
    if (!n) return;
    if (on) { n.setAttribute('inert', ''); n.setAttribute('aria-hidden', 'true'); }
    else { n.removeAttribute('inert'); n.removeAttribute('aria-hidden'); }
  });
}
function openModal(kind, item, from) {
  if (!overlay.hidden) return;
  opener = from;
  modal.className = 'modal modal--' + kind;
  modal.textContent = '';
  modal.appendChild(kind === 'pub' ? buildPub(item) : buildProj(item));
  overlay.hidden = false;
  root.classList.add('modal-open');
  setInert(true);
  var body = modal.querySelector('.modal-body');
  body.scrollTop = 0;
  body.focus({ preventScroll: true });
}
function closeModal() {
  if (overlay.hidden) return;
  overlay.hidden = true;
  root.classList.remove('modal-open');
  setInert(false);
  modal.textContent = '';
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  opener = null;
}
function focusables() {
  return Array.prototype.filter.call(
    modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    function (n) { return n.getClientRects().length > 0; });
}
function onModalKey(e) {
  if (overlay.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
  if (e.key !== 'Tab') return;
  var f = focusables();
  if (!f.length) { e.preventDefault(); return; }
  var first = f[0], last = f[f.length - 1], a = document.activeElement;
  if (e.shiftKey && (a === first || !modal.contains(a))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (a === last || !modal.contains(a))) { e.preventDefault(); first.focus(); }
}
var downOnOverlay = false;
overlay.addEventListener('pointerdown', function (e) { downOnOverlay = e.target === overlay; });
overlay.addEventListener('click', function (e) {
  if (e.target === overlay && downOnOverlay) closeModal();
  downOnOverlay = false;
});
document.addEventListener('keydown', onModalKey);

/* ---------- tabs and hash ---------- */
var currentTab = null, pendingFocus = false;
function tabFromHash() {
  var h = location.hash.replace(/^#/, '');
  return TABS.indexOf(h) >= 0 ? h : null;
}
function selectTab(name, opts) {
  opts = opts || {};
  TABS.forEach(function (n) {
    var on = n === name;
    var tb = $('tab-' + n);
    tb.setAttribute('aria-selected', on ? 'true' : 'false');
    tb.tabIndex = on ? 0 : -1;
    $('panel-' + n).hidden = !on;
  });
  currentTab = name;
  main.setAttribute('data-tab', name);
  if (opts.focus) $('tab-' + name).focus();
  if (opts.scroll !== false) {
    // the cat room folds the header to the compact bar so that the scene gets the whole area
    void main.offsetHeight;
    window.scrollTo(0, name === 'cat' ? hdrD : 0);
  }
  updateHeader();
  if (typeof catSelect === 'function') catSelect(name === 'cat');
}
function goTab(name, focus) {
  if (tabFromHash() === name) { selectTab(name, { focus: focus }); }
  else { pendingFocus = !!focus; location.hash = name; }
}
window.addEventListener('hashchange', function () {
  var n = tabFromHash();
  if (!n) return;
  closeModal();
  selectTab(n, { focus: pendingFocus });
  pendingFocus = false;
});
function buildTabs() {
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tb) {
    tb.querySelector('.tab-ico').innerHTML = spriteSVG(tb.dataset.sprite, '');
    tb.addEventListener('click', function () { goTab(tb.dataset.tab, false); });
  });
  document.querySelector('.tabs').addEventListener('keydown', function (e) {
    var tb = e.target.closest ? e.target.closest('.tab') : null;
    if (!tb) return;
    var idx = TABS.indexOf(tb.dataset.tab), n;
    if (e.key === 'ArrowRight') n = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (idx + TABS.length - 1) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    else return;
    e.preventDefault();
    goTab(TABS[n], true);
  });
  document.querySelector('.skip').addEventListener('click', function (e) {
    e.preventDefault();
    main.focus();
  });
}

/* ---------- header: scrolls away with the page, then sticks as the compact bar ----------
   The header is in the page flow (constant height) and sticky with a negative offset, so its
   upper part (name and institution lines) leaves the screen at the speed of the scroll and the
   bar with the tabs stays. The small name is shown in the bar once the header is stuck; the two
   thresholds differ (hysteresis) so that this switch cannot flicker. Nothing here changes the
   header or document height. */
var hdrD = 0, hdrC = 0, stuck = false, ticking = false;
function measureHeader() {
  var was = hdr.classList.contains('is-stuck');
  hdr.classList.remove('is-stuck');
  var hb = hdr.getBoundingClientRect(), bb = bar.getBoundingClientRect();
  hdrD = Math.max(0, Math.round(bb.top - hb.top));
  hdrC = Math.round(hb.height) - hdrD;
  hdr.classList.toggle('is-stuck', was);
  fitCompact();
  root.style.setProperty('--hdr-d', hdrD + 'px');
  root.style.setProperty('--hdr-c', hdrC + 'px');
}
/* The small name in the compact bar is shown only when it fits in the space next to the tabs. */
function fitCompact() {
  var cmp = $('hdr-compact');
  cmp.classList.remove('is-off');
  if (!stuck || getComputedStyle(cmp).display === 'none') return;
  cmp.classList.toggle('is-off', cmp.scrollHeight > cmp.clientHeight + 1 || cmp.scrollWidth > cmp.clientWidth + 1);
}
function updateHeader() {
  var y = window.pageYOffset || root.scrollTop || 0;
  var next = stuck ? (y > hdrD - 56) : (y >= hdrD - 16);
  if (next !== stuck) {
    stuck = next;
    hdr.classList.toggle('is-stuck', stuck);
    fitCompact();
  }
}
window.addEventListener('scroll', function () {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(function () { ticking = false; updateHeader(); });
}, { passive: true });
window.addEventListener('resize', function () { setPx(); measureHeader(); updateHeader(); if (currentTab === 'cat') window.scrollTo(0, hdrD); });
if (window.ResizeObserver) {
  new ResizeObserver(function () { measureHeader(); updateHeader(); if (currentTab === 'cat') window.scrollTo(0, hdrD); }).observe(hdr);
}

/* ---------- start ---------- */
installSprites();
setPx();
buildHeader();
buildTabs();
buildPublications();
buildProjects();
buildLinks();
var initial = tabFromHash() || 'publications';
measureHeader();                      // before the first tab is shown, so that the cat room is laid out once
selectTab(initial, { scroll: false });
if (!tabFromHash()) { try { history.replaceState(null, '', '#' + initial); } catch (e) { /* ignore */ } }
measureHeader();
if (initial === 'cat') window.scrollTo(0, hdrD);
updateHeader();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () { measureHeader(); updateHeader(); });
}
