/* 一本の線。
   藍の点(KS の紋の「要」)が、読み進めるのに合わせてページを下り、通ったあとに一本の線を残す。
   「仕組みは、一本の線でつながっている」を、そのまま形にしたもの。トップページの冒頭で、名刺を支えている点と同じ点。
   線は余白だけを通り、文章には重ねない。スクロールそのものには手を加えない(点が少し遅れて追うだけ)。
   トップページの「原則」と、下層ページの冒頭では、この点が線を離れて形や球になり、また線へ帰る(js/dim.js)。
   動きを減らす設定では出さない。 */
(function () {
  'use strict';
  var main = document.getElementById('top');
  if (!main || !document.createElementNS || !window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* 線の終わり: トップページは「ご連絡」の見出し。ほかのページは、最後の節の見出し */
  var first = main.querySelector('.sec'), endH = document.querySelector('#contact .sec-h h2');
  if (!endH) { var hsAll = main.querySelectorAll('.sec .sec-h h2'); endH = hsAll[hsAll.length - 1]; }
  if (!first || !endH) return;
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'thread'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  var g = document.createElementNS(NS, 'g'); svg.appendChild(g);
  var ring = document.createElementNS(NS, 'circle'); ring.setAttribute('r', 3.5); ring.setAttribute('class', 'thread-ring'); svg.appendChild(ring);   /* 着いたときの合図 */
  var dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 3.5); dot.setAttribute('class', 'thread-dot'); svg.appendChild(dot);
  main.appendChild(svg);

  var dotInk = false, dotX = 0;
  var arrived = false;
  var pieces = [], y0 = 0, yE = 0, topDoc = 0, cur = -1, drawn = 0, raf = 0, last = 0, builtW = 0, builtH = 0;

  function rectIn(el, mr) { var r = el.getBoundingClientRect(); return { t: r.top - mr.top, b: r.bottom - mr.top, l: r.left - mr.left }; }
  /* 節の中身の上端・下端(余白を除く) */
  function inner(el, mr) {
    var t = Infinity, b = -Infinity, c = el.children, i, r;
    for (i = 0; i < c.length; i++) { r = c[i].getBoundingClientRect(); if (!r.height) continue; t = Math.min(t, r.top - mr.top); b = Math.max(b, r.bottom - mr.top); }
    return { t: t, b: b };
  }
  var inks = [];   /* 濃い帯(原則)の上下。この中では、線と点を明るい色にする */
  function inInk(y) { for (var i = 0; i < inks.length; i++) if (y > inks[i][0] && y < inks[i][1]) return true; return false; }
  function piece(all) {
    /* 帯の境目をまたぐ線は、そこで分ける */
    var cuts = [], i, k, y;
    for (i = 0; i < inks.length; i++) for (k = 0; k < 2; k++) { y = inks[i][k]; if (y > all[0].y + 1 && y < all[all.length - 1].y - 1) cuts.push(y); }
    cuts.sort(function (a, b) { return a - b; });
    var rest = all, c, n, f, mid;
    for (c = 0; c < cuts.length; c++) {
      for (n = 1; n < rest.length && rest[n].y < cuts[c]; n++);
      f = (cuts[c] - rest[n - 1].y) / (rest[n].y - rest[n - 1].y);
      mid = { x: rest[n - 1].x + (rest[n].x - rest[n - 1].x) * f, y: cuts[c] };
      one(rest.slice(0, n).concat([mid])); rest = [mid].concat(rest.slice(n));
    }
    one(rest);
  }
  function one(pts) {
    var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1), len = [0], i, dx, dy;
    for (i = 1; i < pts.length; i++) {
      d += 'L' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1);
      dx = pts[i].x - pts[i - 1].x; dy = pts[i].y - pts[i - 1].y; len.push(len[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    var p = document.createElementNS(NS, 'path'), L = len[len.length - 1];
    if (inInk((pts[0].y + pts[pts.length - 1].y) / 2)) p.setAttribute('class', 'on-ink');
    p.setAttribute('d', d); p.style.strokeDasharray = L + ' ' + (L + 2); p.style.strokeDashoffset = L;
    g.appendChild(p);
    pieces.push({ el: p, pts: pts, len: len, L: L, a: pts[0].y, b: pts[pts.length - 1].y, off: L });
  }
  function down(x, a, b) { for (var y = a; y < b; y += 480) piece([{ x: x, y: y }, { x: x, y: Math.min(b, y + 480) }]); }
  function sweep(xa, ya, xb, yb) {   /* 余白を、左右の端から端へ渡る(縦に出て、縦に入る) */
    var h = yb - ya, pts = [], i, t, u, n = 56;
    for (i = 0; i <= n; i++) {
      t = i / n; u = 1 - t;
      pts.push({
        x: u * u * u * xa + 3 * u * u * t * xa + 3 * u * t * t * xb + t * t * t * xb,
        y: u * u * u * ya + 3 * u * u * t * (ya + h * .55) + 3 * u * t * t * (yb - h * .55) + t * t * t * yb
      });
    }
    piece(pts);
  }

  function build() {
    var mr = main.getBoundingClientRect(), W = main.clientWidth, wrap = (first.closest && first.closest('.wrap')) || first.parentNode;
    builtW = W; builtH = main.offsetHeight;
    topDoc = mr.top + (window.pageYOffset || 0);
    var cl = rectIn(wrap, mr).l + parseFloat(getComputedStyle(wrap).paddingLeft || 0);
    var xL = Math.max(11, cl - 28), xR = W - xL;
    var eh = rectIn(endH, mr);
    var hero = main.querySelector('.hero, .page-hero');
    y0 = hero ? rectIn(hero, mr).b : 0;   /* 線は、冒頭の下の端から降りてくる(冒頭がこの中に無いページでは、いちばん上から) */
    var lh = parseFloat(getComputedStyle(endH).lineHeight) || (eh.b - eh.t);
    yE = eh.t + Math.min(eh.b - eh.t, lh) / 2;   /* 見出しの1行目の高さの中央で止まる */
    while (g.firstChild) g.removeChild(g.firstChild);
    pieces = [];
    inks = [];
    var bi = main.querySelectorAll('.band-ink'), q, br;
    for (q = 0; q < bi.length; q++) { br = rectIn(bi[q], mr); inks.push([br.t, br.b]); }
    /* 渡る場所: 実務支援 → 代表あいさつ、略歴 → 原則。余白が足りないときは渡らない。必ず左で終わるよう、2回そろうときだけ渡る */
    var cross = [], pairs = [['services', 'message'], ['profile', 'principles']], i, a, b, ia, ib, gap;
    for (i = 0; i < pairs.length; i++) {
      a = document.getElementById(pairs[i][0]); b = document.getElementById(pairs[i][1]);
      if (!a || !b) continue;
      ia = inner(a, mr); ib = inner(b, mr); gap = ib.t - ia.b;
      if (gap >= 84) cross.push({ a: ia.b + gap * .1, b: ib.t - gap * .1 });
    }
    if (cross.length % 2) cross.pop();
    var x = xL, y = y0;
    for (i = 0; i < cross.length; i++) {
      down(x, y, cross[i].a);
      sweep(x, cross[i].a, x === xL ? xR : xL, cross[i].b);
      x = x === xL ? xR : xL; y = cross[i].b;
    }
    down(x, y, yE);
    svg.style.height = builtH + 'px';
    cur = -1; frame(0);
  }

  function at(p, y) {   /* その高さでの、線上の位置と長さ */
    var pts = p.pts, lo = 0, hi = pts.length - 1, m, f;
    while (hi - lo > 1) { m = (lo + hi) >> 1; if (pts[m].y <= y) lo = m; else hi = m; }
    f = pts[hi].y === pts[lo].y ? 0 : (y - pts[lo].y) / (pts[hi].y - pts[lo].y);
    return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * f, l: p.len[lo] + (p.len[hi] - p.len[lo]) * f };
  }
  function paint() {
    var i, p, off, x = null;
    for (i = 0; i < pieces.length; i++) {
      p = pieces[i];
      off = drawn >= p.b ? 0 : drawn <= p.a ? p.L : p.L - at(p, drawn).l;
      if (off !== p.off) { p.off = off; p.el.style.strokeDashoffset = off; }
      if (x === null && cur <= p.b) x = at(p, Math.max(cur, p.a)).x;
    }
    if (x === null && pieces.length) x = pieces[pieces.length - 1].pts[pieces[pieces.length - 1].pts.length - 1].x;
    var ink = inInk(cur);
    if (ink !== dotInk) { dotInk = ink; dot.setAttribute('class', ink ? 'thread-dot on-ink' : 'thread-dot'); }
    dotX = x || 0;
    dot.setAttribute('transform', 'translate(' + dotX.toFixed(1) + ' ' + cur.toFixed(1) + ')');
  }
  function frame(now) {
    raf = 0;
    var target = (window.pageYOffset || 0) + window.innerHeight * .55 - topDoc;
    target = target < y0 ? y0 : target > yE ? yE : target;
    if (cur < 0) cur = target;                       /* 開いた直後は、その場所から始める */
    else {
      var dt = now - last; if (!(dt > 0)) dt = 16;   /* 描画が間引かれても、時間どおりに追いつく */
      cur += (target - cur) * (1 - Math.exp(-dt / 120));
      if (Math.abs(target - cur) < .4) cur = target;
    }
    last = now;
    if (cur > drawn) drawn = cur;                    /* 線は、進んだぶんだけ残る */
    paint();
    if (!arrived && cur >= yE - .5 && pieces.length) {   /* 「ご連絡」に着いたら、一度だけ輪がひろがる */
      arrived = true;
      var lp = pieces[pieces.length - 1].pts; ring.setAttribute('cx', lp[lp.length - 1].x); ring.setAttribute('cy', yE);
      svg.setAttribute('class', 'thread arrived');
    }
    if (cur !== target) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  var rt = 0;
  function rebuild() {
    clearTimeout(rt);
    rt = setTimeout(function () { if (main.clientWidth !== builtW || Math.abs(main.offsetHeight - builtH) > 2) build(); }, 160);
  }
  build();
  /* トップページの「原則」の場面と、下層ページの冒頭が、この点を借りていく(点が線を離れて形や球になり、また線へ帰る)。
     at: 点のいまの位置(画面の座標)と、線の先頭から進んだ長さ(run)。 lend: 貸しているあいだ、線の上の点を隠す。返すときに高さ(画面の座標)を添えると、
     点はその高さから線の上を走って、読んでいる位置へ追いつく(返ってきた点が、とぎれずに続いて見えるように) */
  window.__ksThread = {
    at: function () { if (cur < 0 || !pieces.length) return null; var r = main.getBoundingClientRect(); return { x: r.left + dotX, y: r.top + cur, run: cur - y0 }; },
    lend: function (on, y) {
      dot.style.visibility = on ? 'hidden' : '';
      if (on || y == null || !pieces.length) return;
      y -= main.getBoundingClientRect().top; cur = y < y0 ? y0 : y > yE ? yE : y;
      paint(); kick();
    }
  };
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', rebuild);
  window.addEventListener('load', rebuild);
  if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(main);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
})();

/* 上の目次が墨の地(各ページの冒頭・原則)に重なっているあいだ、目次の色を墨に合わせる。
   画面の上から12%(目次の高さを含む帯)に墨の地がかかっているかを、位置から直接たしかめる。
   位置で見るので、このページが別のページの中に埋め込まれて表示されるとき(試作の確認画面など)も、同じ結果になる */
(function () {
  'use strict';
  var inks = document.querySelectorAll('.band-ink, .hero.hx, .page-hero'), head = document.querySelector('.head');
  if (!inks.length || !window.requestAnimationFrame) return;
  var raf = 0, was = null;
  function check() {
    raf = 0;
    /* 横向きのスマホなど、画面が低いときは、目次のすぐ下までを帯にする(12%では目次の高さに届かないため) */
    var band = Math.max(window.innerHeight * .12, head ? head.getBoundingClientRect().bottom + 8 : 0), on = false, i, r;
    for (i = 0; i < inks.length && !on; i++) { r = inks[i].getBoundingClientRect(); on = r.height > 0 && r.top < band && r.bottom > 0; }
    if (on !== was) { was = on; document.documentElement.classList.toggle('on-ink', on); }
  }
  function ask() { if (!raf) raf = requestAnimationFrame(check); }
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);
  window.addEventListener('load', ask);
  check();
})();

/* ご本人の顔(丸い窓)。画面に入ると、藍の点から開く。一度だけ。動きを減らす設定では、はじめから開いたまま */
(function () {
  'use strict';
  var els = document.querySelectorAll('[data-face]');
  if (!els.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('faces');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.75 });
  for (var i = 0; i < els.length; i++) io.observe(els[i]);
})();
