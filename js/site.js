/* 佐藤健司公認会計士事務所 サイトの試作の部品(2026-11-20)。見えたら一度だけ現れる／明るい地と暗い地／差し色の見比べ／携帯の目次／手で描いた線 */
(function () {
  'use strict';
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function all(s) { return [].slice.call(document.querySelectorAll(s)); }

  /* 手で描いた線: 見出しの枠と本文の枠をつないだ段の形を、少しだけ揺らして描く(毎回同じ揺れ) */
  function rnd(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
  function path(pts, r) {
    var d = '', i, k, a, b, n, t;
    for (i = 0; i < pts.length - 1; i++) {
      a = pts[i]; b = pts[i + 1]; n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 56));
      for (k = 0; k <= n; k++) { if (i > 0 && k === 0) continue; t = k / n;
        d += (d ? ' L' : 'M') + (a[0] + (b[0] - a[0]) * t + (r() - .5) * 1.8).toFixed(1) + ' ' + (a[1] + (b[1] - a[1]) * t + (r() - .5) * 1.8).toFixed(1); }
    }
    return d;
  }
  function draw(h, anim) {
    var hh = h.querySelector('.hh'), hb = h.querySelector('.hb'); if (!hh || !hb) return;
    var R = h.getBoundingClientRect(), A = hh.getBoundingClientRect(), B = hb.getBoundingClientRect();
    var ax0 = A.left - R.left, ax1 = A.right - R.left, ay0 = A.top - R.top, ay1 = A.bottom - R.top, bx0 = B.left - R.left, bx1 = B.right - R.left, by0 = B.top - R.top, by1 = B.bottom - R.top;
    var mid = (ay1 + by0) / 2;
    var pts = [[ax0, mid], [ax0, ay0], [ax1, ay0], [ax1, mid], [bx1, mid], [bx1, by1], [bx0, by1], [bx0, mid], [ax0 + 3, mid + .6]];
    var svg = h.querySelector('svg.ink'), NS = 'http://www.w3.org/2000/svg';
    if (!svg) { svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'ink'); svg.setAttribute('aria-hidden', 'true'); svg.appendChild(document.createElementNS(NS, 'path')); h.appendChild(svg); }
    var p = svg.firstChild; p.setAttribute('d', path(pts, rnd(+h.getAttribute('data-seed') || 7)));
    p.style.setProperty('--len', Math.ceil(p.getTotalLength()));
    if (anim && !h.classList.contains('drawn')) requestAnimationFrame(function () { requestAnimationFrame(function () { h.classList.add('drawn'); }); });
  }

  /* 見えたら、一度だけ */
  var els = all('[data-io]');
  function on(e) { e.classList.add('in'); if (e.classList.contains('hand')) draw(e, true); }
  if (!('IntersectionObserver' in window)) els.forEach(on);
  else { var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { on(x.target); io.unobserve(x.target); } }); }, { threshold: .1 }); els.forEach(function (e) { io.observe(e); }); }
  var hands = all('.hand');
  function redraw() { hands.forEach(function (h) { draw(h, false); }); }
  redraw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(redraw, 150); });

  /* MODE: 明るい地と暗い地 */
  var TONES = ['dark', 'light', 'paper'];
  function setTone(t) { if (TONES.indexOf(t) < 0) t = 'dark'; if (t === 'dark') root.removeAttribute('data-tone'); else root.setAttribute('data-tone', t); store('tone', t);
    all('[data-tone-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tone-btn') === t)); }); setTimeout(redraw, 50); }
  all('[data-tone-btn]').forEach(function (b) { b.addEventListener('click', function () { setTone(b.getAttribute('data-tone-btn')); }); });
  all('[data-tone-cycle]').forEach(function (b) { b.addEventListener('click', function () { var c = root.getAttribute('data-tone') || 'dark'; setTone(TONES[(TONES.indexOf(c) + 1) % TONES.length]); }); });
  setTone(root.getAttribute('data-tone') || 'dark');

  /* 差し色の見比べ(試作だけ) */
  function setAcc(a) { if (a === 'fuji') root.removeAttribute('data-acc'); else root.setAttribute('data-acc', a); store('acc', a);
    all('[data-acc-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-acc-btn') === a)); }); }
  all('[data-acc-btn]').forEach(function (b) { b.addEventListener('click', function () { setAcc(b.getAttribute('data-acc-btn')); }); });
  setAcc(root.getAttribute('data-acc') || 'fuji');

  /* 携帯の目次 */
  var mb = document.querySelector('.menu'), dr = document.querySelector('.drawer');
  function closeDr() { if (!dr || !dr.classList.contains('open')) return; dr.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); mb.textContent = 'Menu'; document.body.style.overflow = ''; }
  if (mb && dr) {
    mb.addEventListener('click', function () { var o = dr.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? 'Close' : 'Menu'; document.body.style.overflow = o ? 'hidden' : ''; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDr(); });
  }

  /* スマホの下の細い帯: 冒頭(一画面目)を過ぎたら出す。結びのお問い合わせ・結びの一覧が見えている間は引っ込める */
  var sb = document.querySelector('.sbar');
  if (sb && 'IntersectionObserver' in window) {
    var first = document.querySelector('main .hero, main .kv, main .dh, main .ph1'), seen = new Set();
    var away = all('.cta, footer');
    var upd = function () { root.classList.toggle('sb-on', !(first && seen.has(first)) && !away.some(function (e) { return seen.has(e); })); };
    var sio = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) seen.add(x.target); else seen.delete(x.target); }); upd(); }, { threshold: 0 });
    if (first) sio.observe(first); away.forEach(function (e) { sio.observe(e); });
  }

  /* Page Top: Safari では空の目印(#top)へ移らないことがあるので、押したら先頭へ動かす(2026-11-20 本番の試験で見つけた) */
  all('a.totop').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var r = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { window.scrollTo({ top: 0, behavior: r ? 'auto' : 'smooth' }); } catch (x) { window.scrollTo(0, 0); }
      var m = document.getElementById('main'); if (m) { try { m.focus({ preventScroll: true }); } catch (x) { /* 古いブラウザ */ } }
    });
  });

  /* よくあるご質問: 開け閉めを、静かに伸び縮みさせる */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  all('.fq details').forEach(function (dt) {
    var sm = dt.querySelector('summary'), body = dt.querySelector('summary + *'); if (!sm || !body || !body.animate || reduce) return;
    sm.addEventListener('click', function (e) {
      e.preventDefault();
      if (dt.open) {
        var a = body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 400, easing: 'cubic-bezier(.22,.61,.36,1)' });
        body.style.overflow = 'hidden'; a.onfinish = function () { dt.open = false; body.style.overflow = ''; };
      } else {
        dt.open = true; var h = body.offsetHeight; body.style.overflow = 'hidden';
        var b = body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.22,.61,.36,1)' });
        b.onfinish = function () { body.style.overflow = ''; };
      }
    });
  });

  /* 画面の移り変わり: サイトの中のページへ移るとき、幕を静かに降ろしてから移る。次の画面では幕が上がる */
  function lift() { root.classList.remove('pt-out'); if (root.classList.contains('pt-in')) { requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('pt-go'); root.classList.remove('pt-in'); setTimeout(function () { root.classList.remove('pt-go'); }, 1300); }); }); } }
  lift();
  window.addEventListener('pageshow', function (e) { if (e.persisted) { root.classList.remove('pt-out', 'pt-in', 'pt-go'); } });
  document.addEventListener('click', function (e) {
    if (reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
    var href = a.getAttribute('href');
    if (!href || a.target === '_blank' || a.hasAttribute('download') || /^(https?:|mailto:|tel:|#)/.test(href) || /\.pdf($|#)/.test(href)) return;
    var u; try { u = new URL(href, location.href); } catch (x) { return; }   /* SVG の中のリンクは a.href が文字でないので、href の文字から作る */
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) { closeDr(); return; }   /* 同じページの中の移動は、幕を降ろさない */
    e.preventDefault(); closeDr();
    try { sessionStorage.setItem('pt', '1'); } catch (x) { /* 幕は出ないが、移動はする */ }
    root.classList.add('pt-out');
    setTimeout(function () { location.href = u.href; }, 520);
  });
})();
