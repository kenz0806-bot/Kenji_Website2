/* 佐藤健司公認会計士事務所 — 新コンセプトの試作(版3)の動き
   考え方はひとつ: 散らかったものが、金の点(起点)のまわりで、整った構造になる。
   ・冒頭: 散らかった粒と字と名刺が、金の点のまわりで揃う(はじめの一度だけ)
   ・業務の選択画面: 窓の中に、選んだ業務の構造。業務を替えるたび、粒は散らかって、次の構造に整う
   ・ページの切り替え: 押した場所から金の点 → 4列の格子がシャッターのように閉じる → 行き先の題が大きく横切る → 下へ抜けて開く
   ・業務の詳細は、いまの専用ページの文(js/data.js)から組み立てる。#名前 で行き来でき、「戻る」も効く
   地の色は場面ごとの帯で、スクロールと一緒に動く(ここでは色を替えない)。動きを減らす設定では、切り替えも図も、動かさずに結果だけを出す。 */
(function () {
  'use strict';
  /* MPA: 本番の候補(ページごとのファイル)。中身は最初からページに書いてあり、data.js は読まない。ページの題は nav.js(KST) から */
  var MPA = !window.KSD, NAV = window.KST || {};
  var doc = document.documentElement, body = document.body, D = window.KSD || { pages: {} }, fig = window.KSFig;
  var mm = window.matchMedia ? function (q) { return matchMedia(q).matches; } : function () { return false; };
  var reduce = mm('(prefers-reduced-motion: reduce)'), fine = mm('(hover: hover) and (pointer: fine)');
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  /* 書体の指定(Google Fonts の CSS)は、画面を止めないよう、あとから読み込む(head の link#gf)。
     その指定が入り、いま使う書体が届くのを待つ。指定は長くても4秒、書体は、そこから長くても cap ミリ秒まで(cap を省くと、届くまで) */
  var gfCss = new Promise(function (res) {
    var l = document.getElementById('gf');
    function ok() { return !l || (l.rel === 'stylesheet' && !!l.sheet); }
    if (ok()) { res(); return; }
    l.addEventListener('load', function () { if (ok()) res(); else setTimeout(function () { if (ok()) res(); }, 80); });
    l.addEventListener('error', res); setTimeout(function () { if (l.rel !== 'stylesheet') l.rel = 'stylesheet'; res(); }, 4000);      /* 先読みの合図が来ない古いブラウザーでも、指定は必ず入れる */
  });
  function fontsIn(cap) {
    return gfCss.then(function () {
      return new Promise(function (res) {
        if (!(document.fonts && document.fonts.ready)) { res(); return; }
        if (cap) setTimeout(res, cap);
        setTimeout(function () { void document.body.offsetHeight; document.fonts.ready.then(res); }, 0);      /* いちど寸法を測らせて、書体の読み込みを始めさせてから待つ */
      });
    });
  }
  var home = $('#home'), dv = $('#dv'), tr = $('.tr'), cnt = $('.cnt b'), cntBox = $('.cnt'), rail = $('.rail');
  var ORDER = ['jsox-ipo', 'internal-audit', 'fraud-investigation', 'closing-improvement', 'outside-cfo', 'aup', 'ai'];
  var HOME = home ? $$('.sc[id]', home).map(function (s) { return s.id; }) : [];      /* トップページの場面(並びの順。先頭は top) */
  var view = home ? 'home' : 'dv', slug = !home && dv ? dv.getAttribute('data-slug') || '' : '', homeY = 0, homeFrom = '', cameFrom = null, busy = false, scene = null, formNow = '', io = null, watched = [], rafP = 0, heroLive = true, booted = false, ptr = false, heroHold = true;
  /* 業務ごとの構造(粒の形)。一覧の順と、詳細ページごと。SC は、形ごとの大きさの加減 */
  var SHAPE = ['grid', 'helix', 'rings', 'cone', 'wave', 'globe', 'tess', 'net'];
  var SHAPE_OF = { 'jsox-ipo': 'grid', 'internal-audit': 'rings', 'fraud-investigation': 'cone', 'closing-improvement': 'wave', 'outside-cfo': 'globe', 'aup': 'tess', 'ai': 'net' };
  var SC = { tess: 0.62, grid: 0.9, wave: 0.95, cone: 0.88, helix: 0.94 };
  if (!home && !dv) return;
  try { history.scrollRestoration = 'manual'; } catch (e) { /* 古い環境は、そのまま */ }

  /* ---------- 粒の図の置き場所(場面ごと)。画面の上の位置で返す ---------- */
  /* 粒をうすくする場所: 小さな文字の行(場面の左上からの位置で持つ。1.5秒ごとに測り直す) */
  function avoidOf(sc, sel) {
    var c = sc._av, now = performance.now(), r, out, rg;
    if (c && now - c.t < 1500) return c.list;
    r = sc.getBoundingClientRect(); out = []; rg = document.createRange();
    $$(sel, sc).forEach(function (el) {
      var list, i, j, q, m;
      rg.selectNodeContents(el); list = rg.getClientRects();
      for (i = 0; i < list.length; i++) {
        q = list[i]; if (q.width < 3 || q.height < 3) continue;
        for (m = null, j = 0; j < out.length; j++) if (Math.abs(out[j][1] - (q.top - r.top)) < 5 && q.left - r.left < out[j][0] + out[j][2] + 40 && q.right - r.left > out[j][0] - 40) { m = out[j]; break; }
        if (m) { j = Math.max(m[0] + m[2], q.right - r.left); m[0] = Math.min(m[0], q.left - r.left); m[2] = j - m[0]; m[3] = Math.max(m[3], q.height); }
        else out.push([q.left - r.left, q.top - r.top, q.width, q.height]);
      }
    });
    sc._av = { t: now, list: out }; return out;
  }
  function anchorOf(sc) {
    return function () {
      var W = doc.clientWidth || window.innerWidth, H = window.innerHeight, w = $('.w', sc).getBoundingClientRect(), r = sc.getBoundingClientRect(), k = sc.getAttribute('data-fig'), lb = $('.lb', sc), b, a, c, x, y, R, lh, sm = W < 761, q;
      b = lb ? lb.getBoundingClientRect() : w;
      if (sc.id === 'top') {                                      /* 「Key」のすぐ後ろ(Key ＝ 要の点) */
        a = $('.big > span', sc).getBoundingClientRect(); lh = a.height;
        x = a.right + lh * 0.46; y = a.top + lh * 0.52; return { x: x, y: y, R: Math.max(20, Math.min(lh * 0.58, (W - x - 12) / 3.15)), avoid: avoidOf(sc, '.eb'), ox: r.left, oy: r.top };
      }
      if (sc.id === 'services') {                               /* 窓のまん中。窓の外には描かない */
        a = pk.rect(); if (a) return { x: a[0] + a[2] / 2, y: a[1] + a[3] / 2, R: Math.min(a[2], a[3]) * 0.3 * (SC[pk.form()] || 1) };      /* 額縁なし: 窓で切り取らず、大きく */
      }
      if (sc.id === 'message') {                                 /* 広い画面は左の2列、スマホは札と文のあいだ */
        a = { avoid: avoidOf(sc, '.ms p'), ox: r.left, oy: r.top };
        c = $('.mf', sc);
        if (c) { c = c.getBoundingClientRect(); a.x = c.left + c.width / 2; a.y = c.top + c.height / 2; a.R = c.width * (sm ? 0.42 : 0.4); return a; }   /* お顔があれば、銀河はお顔のまわりを巡る */
        if (sm) { a.x = W * 0.5; a.y = (b.bottom + $('.ms', sc).getBoundingClientRect().top) / 2 + 6; a.R = W * 0.085; }
        else { a.x = w.left + w.width * 0.25; a.y = r.top + r.height * 0.5; a.R = Math.min(w.width * 0.068, H * 0.1); }
        return a;
      }
      if (k === 'board') {                                        /* 社外監査役: 見出しの下の広い空きいっぱいに(額縁なし)。金の点は、いちばん上のまん中 */
        a = $('.hx', sc).getBoundingClientRect(); c = $('.tx', sc).getBoundingClientRect(); q = c.top - a.bottom;
        return { x: sm ? W * 0.5 : w.left + w.width * 0.5, y: a.bottom + q * 0.04, R: Math.max(40, Math.min(q * 0.385, W * (sm ? 0.3 : 0.26))) };
      }
      if (k === 'ks') {                                           /* 文のない場所に置く(本文の後ろには来ない) */
        a = $('.hd', sc).getBoundingClientRect(); c = $('.act', sc).getBoundingClientRect();
        /* お顔の星: 金の点は胸もと(ネクタイの結び目)。お顔はその上に広がるので、置き場所を、空いた所の下寄りにする */
        if (sm) { R = Math.min(70, (c.top - a.bottom - 16) / 3.2); return { x: W * 0.5, y: (a.bottom + c.top) / 2 + R * 1.5, R: R }; }
        y = r.bottom - 34; R = Math.max(12, Math.min(104, (y - c.bottom - 30) / 3.1, w.width * 0.095)); return { x: w.left + w.width * 0.25, y: (c.bottom + y) / 2 + 4 + R * 1.5, R: R };
      }
      if (sc.classList.contains('ft')) { a = $('.foot', sc).getBoundingClientRect(); return { x: a.left + 4, y: a.top - 14, R: 40 }; }      /* 結びの一行の帯(ふつうは、ここが「いまの場面」になることはない) */
      if (sc.classList.contains('dvh') && k !== 'dust') return sm ? { x: w.right - 62, y: r.top + 168, R: 34 * (SC[k] || 1) } : { x: w.right - w.width * 0.1, y: r.top + Math.min(250, r.height * 0.36), R: Math.min(W * 0.055, 84) * (SC[k] || 1) };   /* 詳細の冒頭: 右上に、その業務の構造 */
      /* 読む場面: 金の点は、札の頭の点から離れて、読んでいる行の高さまで、少し遅れて付いてくる(場面の中だけ。下の端の手前で止まる)。
         スマホでは、本文の左の余白を通る(本文に重ならない) */
      a = lb ? getComputedStyle(lb) : null; x = a ? parseFloat(a.paddingLeft) || 0 : 0; y = a ? parseFloat(a.paddingTop) || 0 : 0; c = a ? parseFloat(a.paddingBottom) || 0 : 0;
      x = b.left + x + 4; y = b.top + y + (b.height - y - c) / 2;
      c = window.pageYOffset;
      q = null;      /* 版32: 金の玉がペンになって走る動きは、やめた(マーカーは、自分で引かれる) */
      if (q) {                                                             /* マーカーを引くあいだ: 金の玉は、ペン。一句の頭へ飛び、線の先頭に乗って走る */
        if (sc._fx == null) { sc._fx = x; sc._fy = y + c; }
        sc._fx += (q.x - sc._fx) * 0.34; sc._fy += (q.y + c - sc._fy) * 0.34; sc._ty = sc._fy;
        return { x: sc._fx, y: sc._fy - c, R: 40 };
      }
      R = Math.max(y, Math.min(H * 0.42, r.bottom - 70));                  /* 目あての高さ(画面の上から): 札より上には行かず、場面の下の端の手前で止まる */
      a = 0;
      if (pointAt && sc.contains(pointAt) && performance.now() - pointAtT > 450) { a = pointAt.getBoundingClientRect(); R = Math.max(y, Math.min(a.top + Math.min(a.height / 2, 18), r.bottom - 70)); a = 1; }      /* マウスが少し止まった行・書いている欄を、指す */
      /* 読む高さが少し変わるたびには追わない。いる場所から 130px 以上離れたときだけ、新しい場所へ静かに移る(指す行は、すぐに) */
      if (sc._ty == null || Math.abs(sc._ty - (R + c)) > H * 1.5) sc._ty = sc._fy = R + c;
      else if (Math.abs(sc._ty - (R + c)) > 130 || a) sc._ty = R + c;
      sc._fy += (sc._ty - sc._fy) * 0.05;
      if (sm && sc._fy - c > y + 6) x = w.left + 5;
      else if (sm) x += (w.left + 5 - x) * Math.min(1, (sc._fy - c - y) / 6);
      if (sc._fx == null) sc._fx = x; else sc._fx += (x - sc._fx) * 0.055;      /* 横も、なめらかに(ペンの役を終えたら、静かに左へ戻る) */
      return { x: sc._fx, y: sc._fy - c, R: 40 };
    };
  }

  /* ペンの場所: マーカーの線の先頭(画面の上の場所)。合図(t)から 0.32秒で一句の頭へ着き、0.46秒で引き、少し留まってから離れる。
     線の進み方は、CSS のマーカーと同じ曲線(cubic-bezier(.75, 0, .2, 1)) */
  function bez(p0) {
    var lo = 0, hi = 1, t = 0.5, i, xx;
    for (i = 0; i < 14; i++) { t = (lo + hi) / 2; xx = 3 * (1 - t) * (1 - t) * t * 0.75 + 3 * (1 - t) * t * t * 0.2 + t * t * t; if (xx < p0) lo = t; else hi = t; }
    return 3 * (1 - t) * t * t + t * t * t;
  }
  function penAt(m) {
    var now = performance.now(), rs, i, L = 0, d, q;
    if (now - m.t > 1350) return null;
    rs = m.el.getClientRects(); if (!rs.length) return null;
    for (i = 0; i < rs.length; i++) L += rs[i].width;
    d = (m.t1 ? bez(Math.min(1, (now - m.t1) / 460)) : 0) * L;
    for (i = 0; i < rs.length; i++) { q = rs[i]; if (d <= q.width || i === rs.length - 1) return { x: q.left + Math.min(d, q.width), y: q.top + q.height * 0.76 }; d -= q.width; }
    return null;
  }

  /* ---------- 場面の見張り: 線を引く・見出しを出す / 地の色・図の姿・番号を替える ---------- */
  function figOf(sc) { return sc.id === 'services' ? pk.form() : (sc.getAttribute('data-fig') || 'dust'); }
  /* 寄り添う星と、押した瞬間の光の色は、いま下にある地の色に合わせる */
  function tone(th) { body.className = th === 'l' ? 't-l' : ''; }
  function enter(sc, jump) {
    var th = sc.getAttribute('data-th') || 'd', f = figOf(sc), list, i;
    if (scene === sc) return;
    scene = sc; collect(sc); document.dispatchEvent(new CustomEvent('ks:scene', { detail: sc.id || '' }));
    if (!ptr) tone(th);
    if (fig) { fig.theme(th); fig.anchor(anchorOf(sc), jump); if (f !== formNow && (booted || sc.id !== 'top')) { formNow = f; fig.to(f); } }
    list = view === 'home' ? $$('.sc', home) : null;
    i = list ? list.indexOf(sc) + 1 : ORDER.indexOf(slug) + 1;
    if (cntBox) cntBox.style.visibility = i > 0 ? '' : 'hidden';                                  /* 番号は、順番のあるページ(トップページの場面と、業務の詳細)だけ */
    if (cnt && i > 0) cntBox.lastChild.nodeValue = ' / ' + two(list ? list.length : ORDER.length);
    if (cnt && i > 0 && cnt.textContent !== two(i)) {
      cnt.textContent = two(i);
      if (!reduce && cnt.animate) cnt.animate([{ transform: 'translateX(-70%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.15,1)' });
    }
    heroLive = sc.id === 'top';
    pk.live(sc.id === 'services' && view === 'home');
  }
  /* 現れるときの「少しの散らかり」: 要素ごとに、ずれと傾きを決めておく(毎回同じ値。CSS の tidyIn が、そこから所定の位置へ整える) */
  function scatter(root) {
    var r = 7;
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280 - 0.5; }
    $$('.blk .bd, .rows, .cols3, .facts, .pr', root).forEach(function (box) {
      [].slice.call(box.children).forEach(function (el, i) {
        el.style.setProperty('--jx', (rnd() * 18).toFixed(1) + 'px'); el.style.setProperty('--jy', (92 + rnd() * 44).toFixed(1) + 'px'); el.style.setProperty('--jr', (rnd() * 3).toFixed(2) + 'deg');   /* 下から、せり上がってくる */
        if (!el.style.getPropertyValue('--n')) el.style.setProperty('--n', i);
      });
    });
  }
  function watch(jump) {
    var root = view === 'home' ? home : dv, scs = $$('.sc', root), blocks = $$('.blk', root), mid = window.innerHeight / 2, best = null;
    scatter(root);
    if (io) io.disconnect(); watched = scs;
    if (!('IntersectionObserver' in window)) { scs.concat(blocks).forEach(function (s) { s.classList.add('in'); }); enter(scs[0], true); return; }
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.id === 'work') tidy(900); } });
    }, { threshold: 0.04, rootMargin: '0px 0px -8% 0px' });
    scs.concat(blocks).forEach(function (s) { s.classList.remove('in'); if (s.id === 'top' && heroHold) return; io.observe(s); });      /* 冒頭は、はじまりの合図で出す */
    scs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) best = s; });
    scene = null; enter(best || scs[0], jump);
  }
  /* いまの場面は、画面の真ん中の線がどの場面の上にあるかで決める。位置を直接はかる。
     (IntersectionObserver の rootMargin は、ほかのサイトの枠の中では無視され、次の場面が少し見えただけで地の色が替わってしまう) */
  function pick() {
    var mid = window.innerHeight / 2, i, r;
    rafP = 0;
    for (i = 0; i < watched.length; i++) { r = watched[i].getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { enter(watched[i]); return; } }
  }
  function onMove() { if (!rafP) rafP = requestAnimationFrame(pick); }
  window.addEventListener('scroll', onMove, { passive: true }); window.addEventListener('resize', onMove);

  /* ---------- 業務の詳細を組み立てる(文は data.js のまま) ---------- */
  function chunks(parts) {
    var out = [];
    parts.forEach(function (p) { var m = /^(.*?)(（[^）]+）)$/.exec(p); if (m && m[1]) { out.push(m[1], m[2]); } else out.push(p); });
    return out.map(function (p, n) { return '<span class="nb" style="--n:' + n + '"><span>' + esc(p) + '</span></span>'; }).join('');
  }
  /* リンクの行(文は data.js のまま): 試作の中の場面・詳細ページへは、幕の切り替えで移る(data-go)。いまのサイトや外のサイトは、別の窓で開く */
  function lk(x) { return x.to ? '<a class="lk" href="#' + esc(x.to) + '" data-go>' + esc(x.x) + '</a>' : '<a class="lk" href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.x) + '</a>'; }
  /* 行は、文字列・リンクだけの行・文の途中にリンクがある行({s: […]})のどれか。中身(val)は、1行か、行の並び(改行でつなぐ) */
  function ln(x) { return typeof x === 'string' ? esc(x) : (x.s ? x.s.map(ln).join('') : lk(x)); }
  function val(v) { return typeof v === 'string' ? esc(v) : (Array.isArray(v) ? v.map(ln).join('<br>') : ln(v)); }
  /* 表の行: 見出しと中身。中身が箇条書きのときは、前後の文も添える。key は強調する行、id は「その行へ」の行き先 */
  function row(x) {
    var ex = x[2] || {}, v = x[1], dd;
    dd = v && v.ul ? (v.pre ? '<p>' + esc(v.pre) + '</p>' : '') + '<ul class="li2">' + v.ul.map(function (y) { return '<li>' + val(y) + '</li>'; }).join('') + '</ul>' + (v.post ? '<p>' + esc(v.post) + '</p>' : '') : val(v);
    return '<div' + (ex.key ? ' class="key"' : '') + (ex.id ? ' data-at-id="' + esc(ex.id) + '"' : '') + '><dt>' + esc(x[0]) + '</dt><dd>' + dd + '</dd></div>';
  }
  /* 書類の終わりのボタン: PDF(いまのサイトのPDFを、別の窓で開く)・共有・印刷と、添えた一文。共有の画面が無いブラウザーでは、本番と同じく「リンクをコピー」 */
  function acts(a) {
    return '<div class="g blk hx"><span class="c-1"></span><div class="c-234 bd"><p class="acts"><a class="pill" href="' + esc(a.pdf.u) + '" target="_blank" rel="noopener">' + esc(a.pdf.x) + '</a>'
      + (a.share ? '<button class="pill" type="button" data-share="' + esc(a.pdf.u) + '">' + esc(navigator.share ? a.share : 'リンクをコピー') + '</button>' : '')
      + (a.print ? '<button class="pill only-desk" type="button" data-print>' + esc(a.print) + '</button>' : '') + '</p>'
      + (a.note ? '<p class="notes">' + esc(a.note) + '</p>' : '') + '</div></div>';
  }
  /* 「担当」: 略歴の場面と同じ部品(輪の中のお顔・お名前・よみ)に、紹介の文を続ける */
  function who(w) {
    return '<div class="g blk hx"><p class="lb c-1">' + esc(w.h) + '</p><div class="c-234 bd"><div class="who"><img src="img/profile.jpg" width="480" height="640" alt="' + esc(w.alt) + '" loading="lazy"><p><b>' + esc(w.n) + '</b><span>' + esc(w.y) + '</span></p></div>'
      + '<div class="pp">' + w.p.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div></div></div>';
  }
  /* 詳細の終わりの案内: 本番の詳細ページの末尾と同じ、一文と「お問い合わせ」のボタン(版38で「相談する」から変更) */
  function cta(c) {
    return '<div class="g blk hx"><span class="c-1"></span><div class="c-234 bd"><div class="say">' + c.l.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>'
      + '<p class="act"><a class="btn" href="#' + esc(c.to) + '" data-go>' + esc(c.b) + '</a></p></div></div>';
  }
  function block(b) {
    if (b.t === 'g') return '<p class="gh">' + esc(b.x) + '</p>';
    if (b.t === 'p') return '<div class="pp">' + b.l.map(function (x) { return '<p>' + ln(x) + '</p>'; }).join('') + '</div>';
    if (b.t === 'ul') return '<ul class="li">' + b.i.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (b.t === 'rows') return '<dl class="rw2">' + b.r.map(row).join('') + '</dl>';
    if (b.t === 'ul2') return '<ul class="li2">' + b.i.map(function (x) { return '<li>' + val(x) + '</li>'; }).join('') + '</ul>';
    if (b.t === 'note') return '<div class="fn">' + b.l.map(function (x) { return '<p>' + ln(x) + '</p>'; }).join('') + '</div>';
    if (b.t === 'one') return '<div class="one">' + b.l.map(function (x) { return '<p>' + ln(x) + '</p>'; }).join('') + '</div>';
    if (b.t === 'news') return '<dl class="rw2">' + b.i.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd><b class="nh">' + esc(x[1]) + '</b>' + val(x[2]) + '</dd></div>'; }).join('') + '</dl>';
    if (b.t === 'act') return '<p class="act"><a class="btn" href="#' + esc(b.to) + '" data-go>' + esc(b.b) + '</a>' + (b.n ? '<span class="note">' + esc(b.n) + '</span>' : '') + '</p>';
    if (b.t === 'tbl') return '<table class="tb"><thead><tr>' + b.h.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>'
      + b.r.map(function (r) { return '<tr>' + r.map(function (c, i) { var o = typeof c === 'string' ? { x: c } : c; return '<td data-th="' + esc(b.h[i]) + '"' + (o.pc ? ' class="' + esc(o.pc) + '"' : '') + '>' + esc(o.x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    if (b.t === 'steps') return '<ol class="st">' + b.s.map(function (x, n) { return '<li><b>' + two(n + 1) + '</b><h4>' + esc(x[0]) + '</h4>' + (x[1] ? '<p>' + esc(x[1]) + '</p>' : '') + '</li>'; }).join('') + '</ol>';
    if (b.t === 'fee') return (b.r.length ? '<div class="fe">' + b.r.map(function (x) { return '<div><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' : '') + (b.n.length ? '<div class="fn">' + b.n.map(function (x) { return '<p>' + ln(x) + '</p>'; }).join('') + '</div>' : '');
    if (b.t === 'faq') return '<div class="fq">' + b.q.map(function (x) { return '<details><summary>' + esc(x[0]) + '</summary><p>' + esc(x[1]) + '</p></details>'; }).join('') + '</div>';
    return '';
  }
  /* ページの種類(k): 無し=業務の詳細 / doc=書類(候補者プロフィール・回覧用の1枚・成果物の見本) / news=お知らせの一覧 / all=実務支援の一覧 / lost=ページが見つからないとき。
     どれも同じ骨組み(紺の冒頭に題と前書き、生成りの帯に、左に見出し・右に中身)に載せる */
  function render(s) {
    var p = D.pages[s], k = p.k || 'svc', svc = k === 'svc', nx = svc ? ORDER[(ORDER.indexOf(s) + 1) % ORDER.length] : '', h, bk, was = cameFrom;
    /* 戻り先: 業務の詳細は、業務の選択画面。そのほかは、来たところ(別の詳細や書類から来たときは、そのページ。そうでなければ、もとの場面) */
    if (svc) bk = { to: 'services', x: '実務支援' };
    else if (k === 'lost') bk = null;
    else if (was && was !== s && D.pages[was] && D.pages[was].k !== 'lost') bk = { to: was, x: titleOf(was) };
    else bk = { to: p.back, x: titleOf(p.back) };
    h = '<header class="sc dvh' + (svc ? '' : ' dvh-q') + '" data-th="d" data-fig="' + (svc ? (SHAPE_OF[s] || 'tess') : 'dust') + '"><div class="w">' + $('.bar', home).outerHTML
      + '<p class="bk">' + (bk ? '<a class="lb back" href="#' + esc(bk.to) + '" data-go>' + esc(bk.x) + '</a>' : '<span class="lb" aria-hidden="true"></span>') + '</p>'
      + '<h1 class="hd' + (k === 'doc' || k === 'lost' ? ' doc' : '') + '">' + chunks(p.t) + '</h1>'
      + (p.ks ? '<p class="ksl">' + esc(p.ks) + '</p>' : '')
      + (p.lead.length ? '<div class="lead2">' + p.lead.map(function (x) { return '<p>' + ln(x) + '</p>'; }).join('') + '</div>' : '')
      + (p.jump ? '<div class="jump">' + p.jump.map(function (g) { return '<p><b>' + esc(g.g) + '</b><span class="ji">' + g.i.map(function (i) { return '<a href="#' + esc(s) + '" data-jump="' + esc(i.id) + '">' + esc(i.x) + '</a>'; }).join('') + '</span></p>'; }).join('') + '</div>' : '')
      + (p.btn ? '<p class="act"><a class="btn" href="#' + esc(p.btn.to) + '" data-go>' + esc(p.btn.x) + '</a></p>' : '')
      + '</div></header>';
    if (p.s.length || p.act || p.who || p.cta) {
      h += '<section class="sc dvs" data-th="l" data-fig="dust"><div class="w">'
        + p.s.map(function (x) { return (x.g ? '<p class="pil">' + esc(x.g) + '</p>' : '') + '<div class="g blk hx"' + (x.id ? ' data-sec="' + esc(x.id) + '"' : '') + '>' + (x.h ? '<p class="lb c-1">' + esc(x.h) + '</p>' : '<span class="c-1"></span>') + '<div class="c-234 bd">' + x.b.map(block).join('') + '</div></div>'; }).join('')
        + (p.act ? acts(p.act) : '') + (p.who ? who(p.who) : '') + (p.cta ? cta(p.cta) : '')
        + '</div></section>';
    }
    /* 終わり: 業務の詳細は、次の業務へ。そのほかは、トップページと同じ結びの一行 */
    h += svc ? '<a class="sc nx" href="#' + nx + '" data-go data-th="d" data-fig="dust"><div class="w"><p class="lb">実務支援</p><p class="to"><span>' + esc(D.pages[nx].t.join('')) + '</span></p></div></a>'
      : '<footer class="sc ft" data-th="d" data-fig="dust"><div class="w">' + $('.foot', home).outerHTML + '</div></footer>';
    dv.innerHTML = h; slug = s; dv.setAttribute('data-back', bk ? bk.to : 'top'); dv.setAttribute('data-k', k);
  }
  /* 書類の題は、いちばん長い行が、ちょうど幅に収まる大きさまで小さくする(行の途中で折れて、一字だけ落ちるのを防ぐ) */
  /* 版40: 業務ページ(右上に粒の構造があるページ)の題。題の箱は、CSS で構造の列の手前までにしてある。
     語のまとまり(.nb)がその幅に収まらないときだけ、収まる大きさまで字を小さくする(761px 以上) */
  function fitSvc() {
    var sc = $('.dvh', dv), h = sc ? $('.hd', sc) : null, k, cs, w, m = 0;
    if (!h || dv.hidden || h.classList.contains('doc')) return;
    h.style.fontSize = '';
    k = sc.getAttribute('data-fig');
    if (!k || k === 'dust' || window.innerWidth < 761) return;
    cs = getComputedStyle(h); w = h.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    $$('.nb > span', h).forEach(function (n) { m = Math.max(m, n.getBoundingClientRect().width); });
    if (w > 0 && m > w) h.style.fontSize = Math.floor(parseFloat(cs.fontSize) * w / m * 98) / 100 + 'px';
  }
  function fit() {
    fitSvc();
    var h = $('.hd.doc', dv), m = 0, w, cs;
    if (!h || dv.hidden) return;
    h.style.fontSize = '';
    cs = getComputedStyle(h); w = h.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    $$('.nb > span', h).forEach(function (n) { m = Math.max(m, n.getBoundingClientRect().width); });
    if (w > 0 && m > w) h.style.fontSize = Math.floor(parseFloat(cs.fontSize) * w / m * 98) / 100 + 'px';
  }
  window.addEventListener('resize', fit);
  fontsIn().then(fit);
  function titleOf(name) {
    var el;
    if (D.pages[name]) return D.pages[name].t.join(D.pages[name].k ? ' ' : '');
    el = document.getElementById(name); return el ? (el.getAttribute('data-t') || '') : '';
  }

  /* ---------- 行き先を出す(幕の下で) ---------- */
  function show(name, at) {
    var el;
    if (D.pages[name]) {
      if (view === 'home') { homeY = window.pageYOffset; homeFrom = scene ? scene.id : ''; }      /* トップページのどこから出たかを、控える */
      cameFrom = view === 'dv' ? slug : null;                                                       /* 別の詳細や書類から来たときは、そのページ */
      render(name); home.hidden = true; dv.hidden = false; view = 'dv'; window.scrollTo(0, 0); fit();
      el = at ? $('[data-at-id="' + at + '"]', dv) : null;                                           /* 行き先に「その行へ」の指定があれば、その行まで進める */
      if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - Math.min(170, window.innerHeight * 0.24)));
    } else {
      dv.hidden = true; home.hidden = false;
      el = document.getElementById(name);
      if (view === 'dv' && homeY && name === homeFrom) window.scrollTo(0, homeY);                   /* 出てきた場面へ戻るときは、出てきた場所へ */
      else window.scrollTo(0, el && name !== 'top' ? el.getBoundingClientRect().top + window.pageYOffset : 0);
      view = 'home';
    }
    formNow = ''; watch(true);
    document.dispatchEvent(new Event('ks:shown'));
  }

  /* ---------- ページの切り替え ---------- */
  function go(name, pt, quiet, at) {
    var cols, n, T = 340, ST = 52, title, tt, dl, ln, W = window.innerWidth, H = window.innerHeight, e1 = 'cubic-bezier(.7,0,.2,1)', e2 = 'cubic-bezier(.2,.8,.15,1)', tCover, tOpen, p2, anims = [];
    if (busy || (!D.pages[name] && HOME.indexOf(name) < 0)) return;
    if (!quiet) { try { history.pushState(null, '', '#' + name); } catch (e) { /* 履歴に残せない環境でも、切り替えは行う */ } }
    if (reduce || !tr || !tr.animate) { show(name, at); return; }
    busy = true; title = titleOf(name); pt = pt || { x: W / 2, y: H / 2 };
    cols = $$('.tr > i').filter(function (c) { return c.offsetWidth > 0; }); n = cols.length; tt = $('.tr-t'); dl = $('.tr-d'); ln = $('.tr-l');
    tCover = T + ST * (n - 1); tOpen = tCover + (title ? 400 : 120);
    tr.classList.add('on');
    function A(el, kf, o) { o.fill = 'forwards'; var a = el.animate(kf, o); anims.push(a); return a; }
    if (fig) { formNow = 'gather'; fig.to('gather', { swirl: 1.5 }); }
    /* 金の点: 押した場所から、まん中へ */
    var fs = title ? Math.min(W * 0.095, W * 0.84 / title.length) : 0, ly = H / 2 + fs * 0.74;
    ln.style.top = ly + 'px';
    A(dl, [{ transform: 'translate(' + pt.x + 'px,' + pt.y + 'px) scale(.5)', opacity: 1 }, { transform: 'translate(' + W / 2 + 'px,' + ly + 'px) scale(1.4)', opacity: 1 }], { duration: tCover, easing: e1 });
    cols.forEach(function (c, i) { A(c, [{ transform: 'translateY(-101%)' }, { transform: 'translateY(0)' }], { duration: T, delay: i * ST, easing: e1 }); });
    if (title) {
      tt.textContent = title; tt.style.fontSize = fs + 'px';
      A(tt, [{ opacity: 0, transform: 'translateX(14%) skewX(-8deg)' }, { opacity: 1, transform: 'none' }], { duration: 430, delay: tCover - 170, easing: e2 });
      A(ln, [{ transform: 'scaleX(0)', transformOrigin: '0 50%' }, { transform: 'scaleX(1)', transformOrigin: '0 50%' }], { duration: 430, delay: tCover - 170, easing: e2 });
    }
    setTimeout(function () { show(name, at); }, tCover + 40);
    setTimeout(function () {
      /* 開く: 格子は下へ抜ける。題は左へ、金の点は、行き先の図の起点へ */
      p2 = fig ? fig.point() : { x: W / 2, y: H / 2 };
      cols.forEach(function (c, i) { A(c, [{ transform: 'translateY(0)' }, { transform: 'translateY(101%)' }], { duration: T, delay: i * ST, easing: e1 }); });
      if (title) {
        A(tt, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-12%) skewX(8deg)' }], { duration: 300, easing: 'cubic-bezier(.6,0,.9,.4)' });
        A(ln, [{ transform: 'scaleX(1)', transformOrigin: '100% 50%' }, { transform: 'scaleX(0)', transformOrigin: '100% 50%' }], { duration: 380, easing: e1 });
      }
      A(dl, [{ transform: getComputedStyle(dl).transform, opacity: 1 }, { transform: 'translate(' + p2.x + 'px,' + p2.y + 'px) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(' + p2.x + 'px,' + p2.y + 'px) scale(1)', opacity: 0 }], { duration: tCover + 80, easing: e2 });
      setTimeout(function () { anims.forEach(function (a) { a.cancel(); }); tr.classList.remove('on'); busy = false; }, tCover + 120);
    }, tOpen);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null, r, x = e.clientX, y = e.clientY, h, u, ref;
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    h = a.getAttribute('href');
    if (!x && !y) { r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    if (a.hasAttribute('data-go') && h.charAt(0) === '#') { e.preventDefault(); go(h.slice(1), { x: x, y: y }, false, a.getAttribute('data-at')); return; }
    /* 本番の候補: ほかのページへは、幕を閉じてから移る(開くのは、移った先のページ)。別の窓・ダウンロード・外のサイトは、そのまま */
    if (!MPA || a.target || a.hasAttribute('download')) return;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin || !/(^|\/)([\w\-]+\.html)?$/.test(u.pathname)) return;
    if (u.pathname === location.pathname) {                                                  /* 同じページの中: トップページの場面は幕の切り替えで、そのほかはふつうに進む */
      if (home && u.hash.length > 1 && HOME.indexOf(u.hash.slice(1)) >= 0) { e.preventDefault(); go(u.hash.slice(1), { x: x, y: y }); }
      return;
    }
    e.preventDefault();
    try { ref = document.referrer ? new URL(document.referrer) : null; } catch (err) { ref = null; }
    /* 「戻る」で、来たページへ戻るときは、ブラウザーの「戻る」と同じにする(読んでいた場所に戻れる) */
    if (a.classList.contains('back') && ref && ref.origin === location.origin && ref.pathname === u.pathname && history.length > 1) leave(function () { history.back(); }, navTitle(u), { x: x, y: y });
    else leave(function () { location.href = u.href; }, navTitle(u), { x: x, y: y });
  });
  window.addEventListener('popstate', function () { go(location.hash.slice(1) || 'top', null, true); });
  document.addEventListener('keydown', function (e) {
    var b;
    if (e.key !== 'Escape' || view !== 'dv') return;
    if (!MPA) { go(dv.getAttribute('data-back') || 'services'); return; }
    b = $('.dv .back'); if (b) b.click();
  });

  /* ---------- 本番の候補: ページを移るときの幕(閉じるのは、いまのページ。開くのは、移った先のページ) ---------- */
  function pageKey(u) { var f = u.pathname.split('/').pop(); return f === 'index.html' ? '' : f; }
  function navTitle(u) { var f = pageKey(u); return f ? (NAV[f] || '') : (u.hash.length > 1 ? (NAV[u.hash] || '') : ''); }
  var gone = [], safe = 0;
  function cols4() { return $$('.tr > i').filter(function (c) { return c.offsetWidth > 0; }); }
  function leave(then, title, pt) {
    var cols, n, T = 340, ST = 52, W = window.innerWidth, H = window.innerHeight, e1 = 'cubic-bezier(.7,0,.2,1)', e2 = 'cubic-bezier(.2,.8,.15,1)', tt = $('.tr-t'), dl = $('.tr-d'), ln = $('.tr-l'), fs, ly, tCover;
    if (busy) return;
    try { sessionStorage.setItem('ks2-tr', title || ''); } catch (err) { /* 覚えられなくても、移る(移った先は、幕なしで出る) */ }
    if (reduce || !tr || !tr.animate) { then(); return; }
    busy = true; cols = cols4(); n = cols.length; tCover = T + ST * (n - 1);
    function A(el, kf, o) { o.fill = 'forwards'; gone.push(el.animate(kf, o)); }
    tr.classList.add('on');
    if (fig) { formNow = 'gather'; fig.to('gather', { swirl: 1.5 }); }
    fs = title ? Math.min(W * 0.095, W * 0.84 / title.length) : 0; ly = H / 2 + fs * 0.74; ln.style.top = ly + 'px';
    A(dl, [{ transform: 'translate(' + pt.x + 'px,' + pt.y + 'px) scale(.5)', opacity: 1 }, { transform: 'translate(' + W / 2 + 'px,' + ly + 'px) scale(1.4)', opacity: 1 }], { duration: tCover, easing: e1 });
    cols.forEach(function (c, i) { A(c, [{ transform: 'translateY(-101%)' }, { transform: 'translateY(0)' }], { duration: T, delay: i * ST, easing: e1 }); });
    if (title) {
      tt.textContent = title; tt.style.fontSize = fs + 'px';
      A(tt, [{ opacity: 0, transform: 'translateX(14%) skewX(-8deg)' }, { opacity: 1, transform: 'none' }], { duration: 430, delay: tCover - 170, easing: e2 });
      A(ln, [{ transform: 'scaleX(0)', transformOrigin: '0 50%' }, { transform: 'scaleX(1)', transformOrigin: '0 50%' }], { duration: 430, delay: tCover - 170, easing: e2 });
    }
    setTimeout(function () {
      then();
      safe = setTimeout(function () { if (!document.hidden) uncover(title); }, 4000);      /* 移れなかったときは、幕を開けて、このページに戻す */
    }, tCover + (title ? 300 : 60));
  }
  /* 移った先で、幕を開ける: 閉じた幕と題から始めて、格子は下へ抜け、題は左へ、金の点は、このページの図の起点へ */
  function uncover(title) {
    var cols = cols4(), T = 340, ST = 52, W = window.innerWidth, H = window.innerHeight, e1 = 'cubic-bezier(.7,0,.2,1)', tt = $('.tr-t'), dl = $('.tr-d'), ln = $('.tr-l'), fs, ly, p2, tCover = T + ST * (cols.length - 1), anims = [];
    clearTimeout(safe); gone.forEach(function (a) { a.cancel(); }); gone = [];
    if (!tr) { doc.classList.remove('trin'); return; }
    function A(el, kf, o) { o.fill = 'forwards'; anims.push(el.animate(kf, o)); }
    tr.classList.add('on'); doc.classList.remove('trin');
    if (reduce || !tr.animate) { tr.classList.remove('on'); busy = false; return; }
    busy = true;
    fs = title ? Math.min(W * 0.095, W * 0.84 / title.length) : 0; ly = H / 2 + fs * 0.74; ln.style.top = ly + 'px';
    tt.textContent = title || ''; tt.style.fontSize = fs + 'px';
    cols.forEach(function (c) { A(c, [{ transform: 'translateY(0)' }, { transform: 'translateY(0)' }], { duration: 1 }); });
    if (title) { A(tt, [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: 'none' }], { duration: 1 }); A(ln, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(1)' }], { duration: 1 }); }
    setTimeout(function () {
      anims.forEach(function (a) { a.cancel(); }); anims = [];
      p2 = fig ? fig.point() : { x: W / 2, y: H / 2 };
      cols.forEach(function (c, i) { A(c, [{ transform: 'translateY(0)' }, { transform: 'translateY(101%)' }], { duration: T, delay: i * ST, easing: e1 }); });
      if (title) {
        A(tt, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-12%) skewX(8deg)' }], { duration: 300, easing: 'cubic-bezier(.6,0,.9,.4)' });
        A(ln, [{ transform: 'scaleX(1)', transformOrigin: '100% 50%' }, { transform: 'scaleX(0)', transformOrigin: '100% 50%' }], { duration: 380, easing: e1 });
      }
      A(dl, [{ transform: 'translate(' + W / 2 + 'px,' + ly + 'px) scale(1.4)', opacity: 1 }, { transform: 'translate(' + p2.x + 'px,' + p2.y + 'px) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(' + p2.x + 'px,' + p2.y + 'px) scale(1)', opacity: 0 }], { duration: tCover + 80, easing: 'cubic-bezier(.2,.8,.15,1)' });
      setTimeout(function () { anims.forEach(function (a) { a.cancel(); }); tr.classList.remove('on'); busy = false; }, tCover + 120);
    }, title ? 260 : 80);
  }
  /* 「戻る」で、閉じた幕のまま残っていたページに戻ってきたとき(ブラウザーが前のページを覚えていたとき)は、ここで開ける */
  window.addEventListener('pageshow', function (e) {
    var t = '';
    if (!e.persisted || !tr || !tr.classList.contains('on')) return;
    try { t = sessionStorage.getItem('ks2-tr') || ''; sessionStorage.removeItem('ks2-tr'); } catch (err) { /* そのまま */ }
    busy = false; uncover(t);
  });
  window.addEventListener('pagehide', function () { clearTimeout(safe); });
  /* 下層ページの「戻る」: 本番の候補では、来たページ(ほかの詳細や書類)が分かれば、その名前と行き先にする。業務の詳細は、いつも業務の選択画面へ */
  function fixBack() {
    var b = $('.dv .back'), ref, f;
    if (!b || dv.getAttribute('data-k') === 'svc') return;
    try { ref = document.referrer ? new URL(document.referrer) : null; } catch (err) { return; }
    if (!ref || ref.origin !== location.origin || ref.pathname === location.pathname) return;
    f = pageKey(ref);
    if (f && NAV[f] && f !== '404.html') { b.setAttribute('href', f); b.textContent = NAV[f]; }
  }
  /* 下層ページの中の操作: 目次(その節へ進む)・印刷・共有(共有の画面が無ければ、リンクをコピー。本番の「共有する」と同じ順) */
  dv.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-jump], [data-print], [data-share]') : null, el, url, label, say, copy;
    if (!t) return;
    if (t.hasAttribute('data-jump')) {
      e.preventDefault(); el = $('[data-sec="' + t.getAttribute('data-jump') + '"]', dv);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset - 20);
      return;
    }
    if (t.hasAttribute('data-print')) {
      try { window.print(); } catch (err) { /* 印刷の画面を出せない環境(確認用ページの枠の中など)では、何もしない */ }
      return;
    }
    url = t.getAttribute('data-share'); label = t.getAttribute('data-label') || t.textContent; t.setAttribute('data-label', label);
    say = function (x) { t.textContent = x; setTimeout(function () { t.textContent = label; }, 2400); };
    copy = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { say('リンクをコピーしました'); }, function () { window.open(url, '_blank', 'noopener'); });
      else window.open(url, '_blank', 'noopener');
    };
    if (!navigator.share) { copy(); return; }
    navigator.share({ title: titleOf(slug), url: url }).catch(function (err) { if (err && err.name === 'AbortError') return; copy(); });      /* AbortError: 共有の画面を閉じただけ */
  });

  /* ---------- 「複雑な業務を」: 一字ずつ、ばらばらの向きから一列に整える ---------- */
  $$('[data-jumble]').forEach(function (el) {
    var s = el.textContent, h = '', r = 11, n;
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280 - 0.5; }
    for (n = 0; n < s.length; n++) h += '<span class="j" style="--n:' + n + ';--jx:' + (rnd() * 0.5).toFixed(2) + 'em;--jy:' + (rnd() * 0.9).toFixed(2) + 'em;--jr:' + Math.round(rnd() * 56) + 'deg">' + s.charAt(n) + '</span>';
    el.setAttribute('aria-label', s); el.innerHTML = h;
  });
  /* 触ると、もう一度散らかって、また整う図。マウスでは、手に取った板のように、向きが少し傾く */
  var demo = $('#demo');
  if (demo && fine && !reduce) {
    demo.addEventListener('pointermove', function (e) { var r = demo.getBoundingClientRect(); demo.style.transform = 'perspective(900px) rotateY(' + (((e.clientX - r.left) / r.width - 0.5) * 9).toFixed(2) + 'deg) rotateX(' + (-((e.clientY - r.top) / r.height - 0.5) * 7).toFixed(2) + 'deg)'; });
    demo.addEventListener('pointerleave', function () { demo.style.transform = ''; });
  }
  function tidy(ms) { if (demo) setTimeout(function () { demo.classList.remove('mess'); }, ms); }
  if (demo && !reduce) {
    if ('IntersectionObserver' in window) demo.classList.add('mess');
    var again = function () { if (demo.classList.contains('mess')) return; demo.classList.add('mess'); tidy(520); };
    demo.addEventListener('pointerenter', again); demo.addEventListener('click', again); demo.addEventListener('focus', again);
  }

  /* ---------- 触れた場所から塗りが広がる / 近づくと寄ってくるボタン ---------- */
  document.addEventListener('pointerover', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.btn, .row') : null, r;
    if (!b) return;
    r = b.getBoundingClientRect(); if (!r.width) return;
    b.style.setProperty('--px', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    b.style.setProperty('--py', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, true);
  if (fine && !reduce) {
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest ? e.target.closest('.btn, .bar .ask') : null, r;
      if (!b) return;
      r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.08).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.12).toFixed(1) + 'px)';
    }, { passive: true });
    document.addEventListener('pointerout', function (e) { var b = e.target.closest ? e.target.closest('.btn, .bar .ask') : null; if (b && !b.contains(e.relatedTarget)) b.style.transform = ''; }, true);
  }

  /* ---------- 巨大な標語: 一字ずつが、マウスの近さで太さと幅を変える。何もしなくても、ゆっくり波打つ ---------- */
  var L = $$('.big i'), wd = [], wg = [], pmx = -1, pmy = -1, lt = 0, BIG = $('.big'), bx = 1.4, by = 2.4, brx = 0, bry = 0;
  L.forEach(function (el, i) { wd.push(112); wg.push(800); el.style.setProperty('--n', i); });
  function type(now) {
    requestAnimationFrame(type);
    if (!heroLive || view !== 'home' || document.hidden) return;
    var sm = window.innerWidth < 761, base = sm ? 100 : 112, amp = sm ? 4 : 6, t = now / 1000, i, r, d, k, a, b, reach;
    for (i = 0; i < 0; i++) {      /* 版39: 字の太さと幅は、版32から CSS で固定している(見た目に効かない)ので、毎コマの書き込みをやめた */
      a = base + amp * Math.sin(t * 0.9 - i * 0.5); b = 790 + 70 * Math.sin(t * 0.9 - i * 0.5);
      if (pmx >= 0) {
        r = L[i].getBoundingClientRect(); reach = r.height * 1.5; d = Math.hypot(pmx - (r.left + r.width / 2), pmy - (r.top + r.height / 2)); k = d < reach ? 1 - d / reach : 0; k = k * k * (3 - 2 * k);
        a = a + (sm ? 3 : 6) * k; b = b + 50 * k;      /* マウスの近くの字は、ほんの少しだけ、ゆっくりふくらむ(品よく) */
      }
      wd[i] += (a - wd[i]) * 0.06; wg[i] += (b - wg[i]) * 0.06;
      L[i].style.setProperty('--wd', wd[i].toFixed(1)); L[i].style.setProperty('--wg', Math.round(wg[i]));
    }
    if (BIG) {
      var ex, ey, ry = 0, rx = 0;
      /* 光は左上から一つ: 影(字の厚み)は、いつも右下へ。マウスや時間で、伸び方だけが少し変わる */
      if (pmx >= 0) { ex = 1.4 - ((pmx / window.innerWidth) - 0.5) * 1.6; ey = 2.4 - ((pmy / window.innerHeight) - 0.5) * 1.4; ry = ((pmx / window.innerWidth) - 0.5) * 9; rx = -((pmy / window.innerHeight) - 0.5) * 6; }
      else { ex = 1.4 + 0.5 * Math.sin(t * 0.32); ey = 2.4 + 0.5 * Math.cos(t * 0.27); }
      bx += (ex - bx) * 0.08; by += (ey - by) * 0.08; brx += (rx - brx) * 0.08; bry += (ry - bry) * 0.08;
      /* 版39: 影の伸び(--ex・--ey)も、版32から影そのものを外しているので、書かない */
      BIG.style.transform = Math.abs(brx) + Math.abs(bry) > 0.05 ? 'perspective(1600px) rotateX(' + brx.toFixed(2) + 'deg) rotateY(' + bry.toFixed(2) + 'deg)' : '';
    }
    lt = now;
  }
  if (L.length && !reduce) {
    requestAnimationFrame(type);
    if (fine) {
      $('#top').addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { pmx = e.clientX; pmy = e.clientY; } }, { passive: true });
      $('#top').addEventListener('pointerleave', function () { pmx = -1; });
    }
  }

  /* ---------- 寄り添う星: 濃い芯と光条(c1)、少し遅れてついてくる淡いにじみ(c2)、速く動いたときの尾(c3) ---------- */
  if (fine && !reduce) {
    var c1 = document.createElement('i'), c2 = document.createElement('i'), c3 = document.createElement('i'), cx = 0, cy = 0, rx = 0, ry = 0, tx = 0, ty = 0, seen = false, rafC = 0;
    c1.className = 'cur'; c1.innerHTML = '<b></b>'; c2.className = 'cur-r'; c3.className = 'cur-t'; c1.setAttribute('aria-hidden', 'true'); c2.setAttribute('aria-hidden', 'true'); c3.setAttribute('aria-hidden', 'true'); body.appendChild(c2); body.appendChild(c3); body.appendChild(c1);
    var big = function (el) {
      var on = !!(el && el.closest && el.closest('a, button, .demo, summary')), hot = !!(el && el.closest && el.closest('.btn, .ask, .mark')), sc = el && el.closest ? el.closest('.sc') : null;
      if (sc) tone(sc.getAttribute('data-th') || 'd');
      c1.classList.toggle('hv', on); c2.classList.toggle('hv', on); c1.classList.toggle('hot', hot); c2.classList.toggle('hot', hot); c3.classList.toggle('hot', hot);
      c2.classList.toggle('mg', !on && !!(el && el.closest && el.closest('#top, #message, #contact, .dvh')));      /* 銀河・お顔・KS・詳細の冒頭の図の上: 押すと粒が集まる */
    };
    var tickC = function () {
      cx += (tx - cx) * 0.5; cy += (ty - cy) * 0.5; rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
      c1.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)'; c2.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      /* 尾: 星から、遅れてくるにじみのほうへ。速く動くほど長く濃く、止まれば消える */
      var dx = rx - cx, dy = ry - cy, d = Math.sqrt(dx * dx + dy * dy);
      c3.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) rotate(' + Math.atan2(dy, dx).toFixed(3) + 'rad) scaleX(' + (Math.min(d, 130) / 100).toFixed(3) + ')'; c3.style.opacity = seen ? Math.min(1, Math.max(0, (d - 6) / 60)).toFixed(3) : 0;
      rafC = Math.abs(tx - rx) + Math.abs(ty - ry) > 0.2 ? requestAnimationFrame(tickC) : 0;
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; ptr = true; cx = rx = tx; cy = ry = ty; c1.classList.add('on'); c2.classList.add('on'); }
      big(e.target);
      if (!rafC) rafC = requestAnimationFrame(tickC);
    }, { passive: true });
    var refresh = function () { big(seen ? document.elementFromPoint(tx, ty) : null); };
    window.addEventListener('scroll', refresh, { passive: true }); document.addEventListener('ks:shown', function () { setTimeout(refresh, 60); });
    window.addEventListener('pointerdown', function () { c1.classList.add('dn'); c2.classList.add('dn'); }); window.addEventListener('pointerup', function () { c1.classList.remove('dn'); c2.classList.remove('dn'); });
    doc.addEventListener('pointerleave', function () { seen = false; ptr = false; if (scene) tone(scene.getAttribute('data-th') || 'd'); c1.classList.remove('on'); c2.classList.remove('on'); c3.style.opacity = 0; });
  }

  /* ---------- 押した瞬間の手ごたえ: 金の衝撃の輪と星のまたたき、粒が弾け飛ぶ ---------- */
  function shot(x, y, power) {
    var s;
    if (reduce) return;
    s = document.createElement('div'); s.className = 'shot'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = '<i></i>';
    s.style.transform = 'translate(' + x + 'px,' + y + 'px)'; body.appendChild(s);
    setTimeout(function () { s.remove(); }, 560);
    if (fig && fig.blast) fig.blast(x, y, power * 0.4);      /* 粒は、少し揺れるだけ */
  }
  /* マウスは押した瞬間に、指は軽く叩いたときに(スクロールの指の動きでは出さない) */
  window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && !e.button) shot(e.clientX, e.clientY, e.target.closest && e.target.closest('a, button') ? 1.25 : 0.8); }, { passive: true });
  document.addEventListener('click', function (e) { if (e.pointerType && e.pointerType !== 'mouse' && (e.clientX || e.clientY)) shot(e.clientX, e.clientY, 1.1); }, true);

  /* ---------- 背表紙の点 ---------- */
  window.addEventListener('scroll', function () {
    var m = doc.scrollHeight - window.innerHeight;
    if (rail) rail.style.setProperty('--p', m > 0 ? Math.min(1, window.pageYOffset / m).toFixed(4) : 0);
  }, { passive: true });

  /* ---------- 業務の選択画面 ----------
     窓の中に、選んだ業務の構造。業務を替えるたび、粒は散らかって、金の点のまわりで次の構造に整う。
     名前・対象・課題・目指す状態は、下の一覧(.pk-src)の行から、そのまま写す。見えている間は、数秒ごとに自分で次へ進む(選んだら止まる) */
  var pk = (function () {
    var sec = $('#services'), src = sec ? $('.pk-src', sec) : null, rows = src ? $$('.row', src) : [], n = rows.length, cur = 0, timer = 0, auto = !reduce, live = false, hold = false, T = 6500;
    var el, win, panels, slots, no, grp = [], h, sx = 0, sy = 0, down = false, swiped = false, hud, tt, marks, tpos = n * 4, TW = 56, tp = '', ti, autoAt = -1e9, prev = 0, press = false, sb = -1, sbAt = 0;      /* autoAt・prev: 自分で進んだ時刻と、その前の業務。press: 指やマウスを置いている最中。sb・sbAt: 置いた瞬間に見えていた業務と、その時刻 */
    /* 一覧では、かっこ書きを除いた短い名前で(「AUP業務（合意された手続）」→「AUP業務」) */
    function brief(rn) { var c = rn.cloneNode(true); $$('.nb', c).forEach(function (x) { x.parentNode.removeChild(x); }); return c.textContent; }
    if (!n) return { form: function () { return 'dust'; }, live: function () {}, rect: function () { return null; } };
    rows.forEach(function (r, i) { var lb = r.closest('ul').previousElementSibling; if (!grp.length || grp[grp.length - 1].el !== lb) grp.push({ el: lb, name: lb.textContent, from: i }); });
    for (ti = 0; ti < n * 8; ti++) tp += '<span>' + two(ti % n + 1) + '</span>';      /* 番号の帯(8周ぶん) */
    h = '<div class="g pk-top"><p class="lb c-12">' + esc(sec.getAttribute('data-t')) + '</p><p class="pk-no c-34" aria-hidden="true"><b>01</b>/ ' + two(n) + '</p></div>'
      + '<div class="g pk-main"><div class="c-12 pk-ww"><a class="pk-win" data-go tabindex="-1" aria-hidden="true" href="' + rows[0].getAttribute('href') + '"><span class="pk-hud"></span><span class="pk-tape"><span class="pk-tt">' + tp + '</span></span></a>'
      + '<button class="pk-nav pk-prev" type="button" aria-label="前の業務"></button><button class="pk-nav pk-next" type="button" aria-label="次の業務"></button></div><div class="c-34 pk-ps">';
    rows.forEach(function (r, i) {
      h += '<div class="pk-p' + (i ? '' : ' on') + '"><a class="pk-name" style="--i:0" href="' + r.getAttribute('href') + '" data-go>' + $('.rn', r).innerHTML + '<span class="pk-go" aria-hidden="true"></span></a><p class="pk-for" style="--i:1">' + esc($('.rw', r).textContent) + '</p><dl class="pk-st" style="--i:2">'
        + $$('.rx > span', r).map(function (x) { var t = $('i', x).textContent; return '<div><dt>' + esc(t) + '</dt><dd>' + esc(x.textContent.slice(t.length)) + '</dd></div>'; }).join('') + '</dl><a class="pk-more" style="--i:3" href="' + r.getAttribute('href') + '" data-go>詳細<span aria-hidden="true"></span></a></div>';
    });
    h += '</div></div><div class="g pk-roster"><p class="pk-hint c-all">業務を選ぶと、上の表示が切り替わります。</p>';
    grp.forEach(function (q, gi) {
      var to = gi + 1 < grp.length ? grp[gi + 1].from : n, i;
      h += '<div class="' + (gi % 2 ? 'c-34' : 'c-12') + ' pk-g"><p class="pk-gl">' + esc(q.name) + '</p><div class="pk-sl">';
      for (i = q.from; i < to; i++) h += '<button class="pk-s" type="button" aria-pressed="' + (i ? 'false' : 'true') + '" data-i="' + i + '"><b>' + two(i + 1) + '</b>' + esc(brief($('.rn', rows[i]))) + '</button>';
      h += '</div></div>';
    });
    el = document.createElement('div'); el.className = 'pk'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', sec.getAttribute('data-t')); el.innerHTML = h + '</div>';
    src.parentNode.insertBefore(el, src); src.hidden = true;
    win = $('.pk-win', el); panels = $$('.pk-p', el); slots = $$('.pk-s', el); no = $('.pk-no b', el); el.style.setProperty('--pk-t', T + 'ms');
    hud = $('.pk-hud', el); tt = $('.pk-tt', el); marks = $$('span', tt);
    function gname(i) { var k, v = grp[0].name; for (k = 0; k < grp.length; k++) if (i >= grp[k].from) v = grp[k].name; return v; }
    function tape(quick) {
      var k;
      if (quick) tt.style.transition = 'none';
      tt.style.transform = 'translateX(' + (-(tpos + 0.5) * TW) + 'px)';
      if (quick) { void tt.offsetWidth; tt.style.transition = ''; }
      for (k = 0; k < marks.length; k++) marks[k].classList.toggle('on', k === tpos);
      hud.textContent = gname(cur);
    }
    tt.addEventListener('transitionend', function () { if (tpos < n * 2 || tpos >= n * 6) { tpos = n * 4 + cur; tape(true); } });      /* 端に近づいたら、まん中の同じ番号へ、気づかれないように戻す */
    tape(true);

    function arm() {
      clearTimeout(timer); el.classList.remove('auto');
      if (!auto || !live || hold || press || document.hidden) return;
      void el.offsetWidth; el.classList.add('auto');                    /* 一覧の金の線を、はじめから伸ばす */
      timer = setTimeout(function () { prev = cur; autoAt = performance.now(); set(cur + 1, 1, false); }, T);
    }
    function set(i, dir, user) {
      i = (i % n + n) % n;
      if (user) { auto = false; sb = -1; autoAt = -1e9; }               /* ご自分で選んだら、自分で進むのはやめる(控えていた「見えていた業務」も、ここで捨てる) */
      if (i !== cur) {
        panels[cur].classList.remove('on'); slots[cur].setAttribute('aria-pressed', 'false');
        tpos += dir > 0 ? (i - cur + n) % n : -((cur - i + n) % n);
        cur = i; panels[cur].classList.add('on'); slots[cur].setAttribute('aria-pressed', 'true');
        win.setAttribute('href', rows[cur].getAttribute('href')); no.textContent = two(cur + 1); tape(false);
        if (!reduce && no.animate) no.animate([{ transform: 'translateY(' + (dir > 0 ? 70 : -70) + '%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.15,1)' });
        if (fig && live) { formNow = SHAPE[cur % SHAPE.length]; fig.to(formNow, { swirl: 1.15 }); fig.turn(dir); }
      }
      arm();
    }
    /* 一覧で選んだら、変わった窓と業務名が画面に入るところまで、なめらかに戻す(スマホでは一覧が窓の下にあり、押しても上が変わるだけで、変化が見えないため)。
       押したときだけ動く(スクロールの量には連動しない) */
    slots.forEach(function (b) { b.addEventListener('click', function () {
      var i = +b.getAttribute('data-i'), r = $('.pk-ww', el).getBoundingClientRect();
      set(i, i >= cur ? 1 : -1, true);
      if (r.top < 0) window.scrollTo({ top: window.pageYOffset + r.top - 14, behavior: reduce ? 'auto' : 'smooth' });
    }); });
    /* 押そうと決めたときに見えていた業務を返す。指やマウスを置いた瞬間のもの(sb)。それが無ければ(キーボードなど)、いまのもの。
       自分で次へ進んだ直後(0.6秒以内)は、進む前の業務とみなす(押そうと決めてから指が届くまでのあいだに、業務が替わってしまうため) */
    function seen() { return performance.now() - autoAt < 600 ? prev : cur; }
    function aim() { var s = (sb >= 0 && performance.now() - sbAt < 1200) ? sb : seen(); sb = -1; autoAt = -1e9; return s; }
    $('.pk-prev', el).addEventListener('click', function () { set(aim() - 1, -1, true); });
    $('.pk-next', el).addEventListener('click', function () { set(aim() + 1, 1, true); });
    el.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { e.preventDefault(); set(cur - 1, -1, true); } else if (e.key === 'ArrowRight') { e.preventDefault(); set(cur + 1, 1, true); } });
    /* 横になぞって替える(縦のスクロールは、そのまま通す) */
    /* 指やマウスを置いている最中は、自分では進まない(置いてから離すまでのあいだに業務が替わると、違う業務を押したことになるため)。
       置いた瞬間に見えていた業務を、控えておく */
    el.addEventListener('pointerdown', function (e) {
      press = true; sb = seen(); sbAt = performance.now(); arm();
      if (e.target.closest('.pk-ww, .pk-ps') && !e.target.closest('.pk-nav')) { down = true; sx = e.clientX; sy = e.clientY; }
    }, { passive: true });
    function release() { if (press) { press = false; arm(); } }
    window.addEventListener('pointercancel', function () { down = false; release(); }, { passive: true });
    window.addEventListener('pointerup', function (e) {
      var dx, dy;
      if (!down) { release(); return; }
      down = false; dx = e.clientX - sx; dy = e.clientY - sy;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) { swiped = true; setTimeout(function () { swiped = false; }, 400); set(aim() + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, true); }
      release();
    }, { passive: true });
    /* 業務名や窓を押したときは、押そうと決めたときに見えていた業務の詳細を開く。
       自分で次へ進んだ直後に押されても、意図と違う詳細が開かない(指で操作する画面では、上に乗せて止めることができないため) */
    el.addEventListener('click', function (e) {
      var a, was, s;
      if (swiped) { e.preventDefault(); e.stopPropagation(); return; }
      a = e.target.closest ? e.target.closest('a.pk-name, a.pk-win, a.pk-more') : null;
      if (!a) return;
      s = aim();
      if (s !== cur) {
        was = a.getAttribute('href'); a.setAttribute('href', rows[s].getAttribute('href'));
        setTimeout(function () { a.setAttribute('href', was); }, 0);
      }
    }, true);
    /* マウスが上にある間と、キーボードで操作している間は、自分では進まない。窓の上では、見る向きが少し変わる */
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hold = true; arm(); } });
    el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hold = false; if (fig) fig.view(0, 0); arm(); } });
    el.addEventListener('focusin', function () { hold = true; arm(); }); el.addEventListener('focusout', function () { hold = false; arm(); });
    document.addEventListener('visibilitychange', arm);
    if (fig && fine && !reduce) $('.pk-ww', el).addEventListener('pointermove', function (e) {
      var r = win.getBoundingClientRect();
      if (e.pointerType === 'mouse' && r.width) fig.view(((e.clientX - r.left) / r.width - 0.5) * 0.9, ((e.clientY - r.top) / r.height - 0.5) * 0.45);
    }, { passive: true });
    return {
      form: function () { return SHAPE[cur % SHAPE.length]; },
      live: function (v) { if (v !== live) { live = v; arm(); } },
      rect: function () { var r; if (view !== 'home') return null; r = win.getBoundingClientRect(); return r.width ? [r.left + 1, r.top + 1, r.width - 2, r.height - 2] : null; }
    };
  })();
  if (fig) fig.window(function () { return null; });      /* 額縁と窓は、やめた(ご指摘「実務支援も、額縁いらんかも」)。構造は、場面の中に、そのまま浮かぶ */

  /* ---------- 帯の境目のふくらみ: 速くスクロールすると大きくふくらみ、止まると弾んで戻る ---------- */
  if (!reduce) (function () {
    var a = 36, va = 0, ly = window.pageYOffset, lt = performance.now(), run = 0, shown = 36;
    function tick(now) {
      var y = window.pageYOffset, v = Math.abs(y - ly) / Math.max(8, now - lt) * 16.7, target = 36 + Math.min(40, v * 1.3);
      ly = y; lt = now;
      va = va * 0.8 + (target - a) * 0.1; a += va;
      if (Math.abs(a - shown) > 0.4) { shown = a; doc.style.setProperty('--arc', Math.max(10, a).toFixed(1) + 'px'); }
      run = Math.abs(va) > 0.05 || Math.abs(target - a) > 0.5 ? requestAnimationFrame(tick) : 0;
    }
    window.addEventListener('scroll', function () { if (!run) { lt = performance.now(); ly = window.pageYOffset; run = requestAnimationFrame(tick); } }, { passive: true });
  })();

  /* ---------- 場面の番号: 大きな線書きの数字を、札のすぐ下に(冒頭と、業務の選択画面には置かない) ---------- */
  if (home) $$('.sc', home).forEach(function (sc, i) {
    var lb = $('.lb', sc), b;
    if (!i || !lb || sc.id === 'services') return;
    b = document.createElement('span'); b.className = 'bn' + (sc.id === 'principles' ? ' bn-r' : ''); b.setAttribute('aria-hidden', 'true'); b.textContent = two(i + 1); lb.appendChild(b);
  });

  /* ---------- 代表あいさつ: お顔が、金の点から「にゅっ」と出る。お顔の場所が画面にしっかり入ったら、一度だけ ---------- */
  (function () {
    var mf = $('#message .mf'), ob;
    if (!mf) return;
    if (reduce || !('IntersectionObserver' in window)) { mf.classList.add('on'); return; }
    ob = new IntersectionObserver(function (es) {
      if (!es[es.length - 1].isIntersecting) return;
      ob.disconnect();
      (function wait(t0) {
        var r = mf.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, q = fig ? fig.point() : null;
        if (!q || Math.hypot(q.x - cx, q.y - cy) < 8 || performance.now() - t0 > 1600) { mf.classList.add('on'); if (fig && fig.blast) fig.blast(cx, cy, 0.8); if (fig && fig.sparks) setTimeout(function () { fig.sparks(cx, cy, 18, 1.25); }, 180); return; }
        requestAnimationFrame(function () { wait(t0); });
      })(performance.now());
    }, { threshold: 0.45 });
    ob.observe(mf);
  })();

  /* ---------- 読み進めるほど、集まる ----------
     場面に入ると、その場面の大きな番号(線書き)に、下から金が満ちる。見た場面は、このタブを閉じるまで金のまま。
     広い画面では、背表紙に場面ごとの点が並び、見た場面は金になる。点に触れると場面の名前、押すとその場面へ */
  var SEEN = {}, rdots = [], pointAt = null, pointAtT = 0, markTo = null;
  try { SEEN = JSON.parse(sessionStorage.getItem('ks2-seen') || '{}') || {}; } catch (e) { SEEN = {}; }
  function collect(sc) {
    var bn;
    if (view !== 'home' || !sc.id) return;
    if (!SEEN[sc.id]) { SEEN[sc.id] = 1; try { sessionStorage.setItem('ks2-seen', JSON.stringify(SEEN)); } catch (e) { /* 覚えられなくても、続ける */ } }
    bn = $('.bn', sc); if (bn) bn.classList.add('got');
    railDots();
    if (sc.id === 'contact' && !FIN && HOME.every(function (id) { return id === 'ask' || SEEN[id]; })) setTimeout(reward, 950);
  }
  /* 読了のごほうび: すべての場面を読んでから「ご連絡」に着いた人にだけ、一度。金の玉から火花、背表紙の点が上から順に弾み、「お問い合わせ」に金の輪 */
  var FIN = 0;
  try { FIN = sessionStorage.getItem('ks2-fin') === '1' ? 1 : 0; } catch (e) { FIN = 0; }
  function reward() {
    var b = $('#contact .act .btn'), q, r;
    return;      /* 版30: 読み終えたときのごほうび(弾み・火花)は、やめた(スマートに) */
    FIN = 1; try { sessionStorage.setItem('ks2-fin', '1'); } catch (e) { /* 覚えられなくても、続ける */ }
    doc.classList.add('fin'); setTimeout(function () { doc.classList.remove('fin'); }, 2800);
    if (fig) { q = fig.point(); if (fig.pop) fig.pop(1.3); if (fig.blast) fig.blast(q.x, q.y, 0.9); if (fig.sparks) fig.sparks(q.x, q.y, 28, 1.5); }
    if (b && fig && fig.sparks) setTimeout(function () { r = b.getBoundingClientRect(); fig.sparks(r.left + r.width / 2, r.top + r.height / 2, 14, 1.15); }, 480);
  }
  function railDots() { rdots.forEach(function (d) { d[0].classList.toggle('seen', !!SEEN[d[1].id]); d[0].classList.toggle('now', scene === d[1]); }); if (rail) rail.classList.toggle('dvv', view !== 'home'); }
  function railPos() {
    var m = doc.scrollHeight - window.innerHeight;
    if (view !== 'home') return;
    rdots.forEach(function (d) { var y = d[1].getBoundingClientRect().top + window.pageYOffset; d[0].style.top = (m > 0 ? Math.min(1, Math.max(0, y / m)) * 100 : 0).toFixed(3) + '%'; });
  }
  (function () {
    var tr = rail ? $('i', rail) : null;
    if (home) $$('.sc[id]', home).forEach(function (sc) { var bn = $('.bn', sc); if (bn && SEEN[sc.id]) bn.classList.add('got', 'now'); });      /* 前に見た場面は、はじめから金(満ちる動きは出さない) */
    if (!tr || !home) return;
    $$('.sc[id]', home).forEach(function (sc) {
      var a = document.createElement('a'), t = sc.getAttribute('data-t') || '佐藤健司公認会計士事務所';
      a.className = 'rd'; a.href = '#' + sc.id; a.setAttribute('data-go', ''); a.setAttribute('data-t', t); a.setAttribute('tabindex', '-1');
      a.style.setProperty('--i', rdots.length); tr.appendChild(a); rdots.push([a, sc]);
    });
    railPos(); railDots();
    window.addEventListener('resize', railPos); document.addEventListener('ks:shown', function () { setTimeout(function () { railPos(); railDots(); }, 60); });
    fontsIn().then(railPos);
    setTimeout(railPos, 1500);
  })();
  /* マウスを乗せた行: 金の点がその行を指し、行がうすく金に照らされる(いま読んでいる所が分かる) */
  if (fine && !reduce) document.addEventListener('pointerover', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('.field, .dvs .rw2 > div, .facts > div, .dvs .li li, .dvs .li2 li, .dvs .pp p, .cols3 > div, .dvs details, .dvs .fe > div, .dvs .st li, .pr li') : null;
    if (t === pointAt) return;
    if (pointAt) pointAt.classList.remove('rdg');
    pointAt = t; pointAtT = performance.now(); if (t && !t.classList.contains('field')) t.classList.add('rdg');      /* rdg: 読んでいる行(名前の pt は、もとから別の部品に使われている) */
  }, true);

  /* ---------- ご相談フォーム: 入力が済んだ欄に、金の玉が灯る。必須の3つがそろうと、送信のボタンが金の輪で応える。書いている欄を、金の玉が指す ----------
     入力の確かめと送信は、いままでどおり js/form.js が行う。ここは、見た目の合図だけ */
  (function () {
    var form = $('#askForm'), ask = $('#ask'), need;
    if (!form) return;
    need = [['#f-name', /\S/], ['#f-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/], ['#f-message', /\S/]].map(function (x) { var el = $(x[0], form); return el ? [el, x[1]] : null; }).filter(Boolean);
    function check() {
      var all = need.length > 0, b, r;
      need.forEach(function (x) { var ok = x[1].test(x[0].value || ''), f = x[0].closest('.field'); if (f) f.classList.toggle('ok', ok); if (!ok) all = false; });
      if (all && !form.classList.contains('ready') && fig && fig.sparks) { b = $('.ask-send', form); if (b) { r = b.getBoundingClientRect(); fig.sparks(r.left + r.width / 2, r.top + r.height / 2, 10, 0.8); } }
      form.classList.toggle('ready', all);
    }
    form.addEventListener('input', check); form.addEventListener('change', check);
    if (ask) ask.addEventListener('click', function () { setTimeout(check, 80); });      /* ご相談の例を押すと、文例が入る(その分も数える) */
    form.addEventListener('focusin', function (e) { var f = e.target.closest ? e.target.closest('.field') : null; if (!f) return; if (pointAt) pointAt.classList.remove('rdg'); pointAt = f; pointAtT = 0; });
    form.addEventListener('focusout', function () { if (pointAt && pointAt.classList.contains('field')) pointAt = null; });
    check();
  })();

  /* ---------- 大事な一句に、金のマーカーが「しゃっ」と引かれる(読んでいる高さ＝画面のまん中あたりに来たら、一度だけ) ----------
     文は変えない。本文の中の一句を、そのまま印で囲むだけ。場面ごとに一か所まで */
  /* 2色: 金(g) は、思い・約束。藍(b) は、事実・数字 */
  var MARKS = [
    ['auditor', '会計・監査・内部統制の経験をもとに関わります', 'g'], ['auditor', '上場企業の監査の統括主査', 'b'],
    ['work', '設計から運用まで一貫して支援します', 'g'],      /* 藍は事実・数字だけ(「判断できる構造に組み直す」は事実ではないので、引かない) */
    ['message', '約9年在籍しました', 'b'], ['message', '高く跳ぶためのセーフティーネットです', 'g'], ['message', '困りごとが「助かった」に変わる瞬間', 'g'],
    ['profile', '弱い部分は仕組みで補う', 'g'], ['profile', 'グロース市場からプライム市場まで', 'b'],      /* 売上規模の数字は載せない(2026-11-14 のご指示)。規模は、市場の区分で伝える */
    ['principles', '必要のない支援は、勧めない。', 'g'],
    ['terms', '最初から最後まで、代表の佐藤が担当します。', 'g'], ['terms', '公認会計士登録番号 40449', 'b'], ['terms', '診断だけで終えていただいて構いません', 'g'],
    ['contact', '30〜60分のオンライン相談は、無料です。', 'b'], ['contact', '通常、3営業日以内にご返信いたします。', 'b']
  ];
  function markUp(sc, phrase, col) {
    var tw = document.createTreeWalker(sc, NodeFilter.SHOW_TEXT, null), t, i, m, rest;
    while ((t = tw.nextNode())) {
      i = t.nodeValue.indexOf(phrase);
      if (i < 0 || (t.parentNode.closest && t.parentNode.closest('a, button, mark, .hd, script'))) continue;
      rest = t.splitText(i); rest.splitText(phrase.length);
      m = document.createElement('mark'); m.className = 'mk' + (col === 'b' ? ' mk-b' : ''); rest.parentNode.insertBefore(m, rest); m.appendChild(rest);
      return m;
    }
    return null;
  }
  (function () {
    var list = [], ob;
    if (!home) return;
    MARKS.forEach(function (p) { var sc = document.getElementById(p[0]), m = sc ? markUp(sc, p[1], p[2]) : null; if (m) list.push(m); });
    if (!list.length) return;
    if (reduce || !('IntersectionObserver' in window)) { list.forEach(function (m) { m.classList.add('on'); }); return; }
    ob = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var mt;
        if (!e.isIntersecting) return;
        ob.unobserve(e.target); mt = { el: e.target, t: performance.now(), t1: 0 }; markTo = mt;      /* 金の玉が、その一句の頭へ飛ぶ(ペン) */
        setTimeout(function () { e.target.classList.add('on'); mt.t1 = performance.now(); }, 320);      /* 着いたら、線の先頭に乗って「シャッ」 */
        setTimeout(function () {                                                                         /* 引き終わりに、小さな火花と弾み */
          var rs = e.target.getClientRects(), q = rs[rs.length - 1];
          if (!fig || !q || markTo !== mt) return;
          if (fig.pop) fig.pop(0.4);
          if (fig.sparks && scene && scene.contains(e.target) && scene.getAttribute('data-fig') === 'dust') fig.sparks(q.right, q.top + q.height * 0.76, 6, 0.55);
        }, 800);
      });
    }, { rootMargin: '-38% 0px -42% 0px' });
    list.forEach(function (m) { ob.observe(m); });
  })();

  /* ---------- いつも見える「お問い合わせ」(版37で「相談する」から変更。お顔は版36で外した): トップの冒頭を過ぎると、右下に出る。
     相談の場面(ご連絡・ご相談フォーム)や、上の帯の「お問い合わせ」が見えているときは、重ならないように引っ込む ---------- */
  (function () {
    var fab = document.createElement('a'), seen = new Set(), ob, mine;
    fab.className = 'fab'; fab.setAttribute('aria-label', 'お問い合わせ');
    fab.innerHTML = '<span class="fab-me" aria-hidden="true"><img src="' + (MPA && !home && location.pathname.indexOf('404') >= 0 ? '/' : '') + 'img/profile.jpg" width="480" height="640" alt="" decoding="async"></span><span class="fab-t">お問い合わせ</span>';
    if (home) { fab.setAttribute('href', '#contact'); fab.setAttribute('data-go', ''); }
    else if (MPA) fab.setAttribute('href', (location.pathname.indexOf('404') >= 0 ? '/' : './') + '#contact');
    else { fab.setAttribute('href', '#contact'); fab.setAttribute('data-go', ''); }
    body.appendChild(fab);
    if (!('IntersectionObserver' in window)) { fab.classList.add('on'); return; }
    ob = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      show(seen.size === 0);
    }, { threshold: 0 });
    mine = function () {
      ob.disconnect(); seen.clear();
      $$('#contact, #ask, .bar .ask, .dv .say, .act .btn').forEach(function (el) { if (el.offsetParent !== null || el.getClientRects().length) ob.observe(el); });
    };
    mine(); document.addEventListener('ks:shown', function () { setTimeout(mine, 50); });
    /* 区切りの合図: 業務を見終えて代表あいさつへ入るとき・お取引の条件を読み終えてお知らせへ入るときに、一度だけ「ニュッ」と弾む(相談を考える、ちょうどその時に) */
    var nudged = {};
    document.addEventListener('ks:scene', function (e) {
      var id = e.detail;
      if ((id !== 'message' && id !== 'news') || nudged[id] || reduce || !fab.classList.contains('on')) return;
      nudged[id] = 1; fab.classList.remove('nudge'); void fab.offsetWidth; fab.classList.add('nudge');
      setTimeout(function () { fab.classList.remove('nudge'); }, 1100);
    });
    var born = false, flying = false, me = $('.fab-me', fab), lx = 0, ly = 0, gx = 0, gy = 0, lr = 0, nod = 0;
    function show(v) {
      if (!v) { fab.classList.remove('on'); return; }
      if (fab.classList.contains('on') || flying) return;
      if (born || reduce || !fig || !fab.animate) { born = true; fab.classList.add('on'); return; }
      /* はじめて: 金の点 → 弧を描いて右下へ → ふくらんで、お顔に */
      flying = true;
      var q = fig.point(), tx = fab.offsetLeft + me.offsetLeft + me.offsetWidth / 2, ty = fab.offsetTop + me.offsetTop + me.offsetHeight / 2, o = document.createElement('i');
      o.className = 'orb-fly'; o.setAttribute('aria-hidden', 'true'); body.appendChild(o);
      o.animate([{ transform: 'translate(' + q.x + 'px,' + q.y + 'px) scale(1)' }, { transform: 'translate(' + ((q.x + tx) / 2) + 'px,' + (Math.min(q.y, ty) - 90) + 'px) scale(1.5)', offset: 0.5 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(2.9)' }],
        { duration: 950, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).onfinish = function () {
        born = true; flying = false; fab.classList.add('born'); fab.classList.toggle('on', seen.size === 0); if (fig.sparks) fig.sparks(tx, ty, 12, 0.9);
        setTimeout(function () { o.remove(); }, 120);
      };
    }
    function look() {
      lx += (gx - lx) * 0.12; ly += (gy - ly) * 0.12;
      me.style.transform = 'perspective(260px) rotateY(' + lx.toFixed(2) + 'deg) rotateX(' + ly.toFixed(2) + 'deg)';
      lr = Math.abs(gx - lx) + Math.abs(gy - ly) > 0.05 ? requestAnimationFrame(look) : 0;
    }
    if (!reduce) {
      window.addEventListener('pointermove', function (e) {
        var r, dx, dy, d, k;
        if (e.pointerType !== 'mouse' || !fab.classList.contains('on')) return;
        r = me.getBoundingClientRect(); dx = e.clientX - (r.left + r.width / 2); dy = e.clientY - (r.top + r.height / 2); d = Math.hypot(dx, dy) || 1; k = Math.min(1, d / 500);
        gx = dx / d * 24 * k; gy = -dy / d * 18 * k; if (!lr) lr = requestAnimationFrame(look);
      }, { passive: true });
      var lsy = window.pageYOffset;
      window.addEventListener('scroll', function () {
        var v = window.pageYOffset - lsy; lsy = window.pageYOffset;
        if (fine) return;
        gy = Math.max(-16, Math.min(16, -v * 0.5)); if (!lr) lr = requestAnimationFrame(look);
        clearTimeout(nod); nod = setTimeout(function () { gy = 0; if (!lr) lr = requestAnimationFrame(look); }, 140);
      }, { passive: true });
    }
  })();

  /* ---------- 代表あいさつ: 文が、淡い色から濃い色へ、読む順に満ちていく(読む位置へ、目を連れていく) ----------
     これから読む文は淡く、読む位置まで来た文は濃く。読む位置(画面の上から6割)までは速く満ち、その先は読む速さより少し速く進む。
     スクロールを止めていても、見えている所までは自分で進む(待たせない)。文は変えない(一字ずつ、印で包むだけ) */
  (function () {
    var ps = $$('#message .ms p'), msg = document.getElementById('message'), C = [], n = 0, raf = 0, last = 0, seen = false;
    if (!ps.length || !msg || reduce || !('IntersectionObserver' in window)) return;
    ps.forEach(function (p) {
      var tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null), nodes = [], t;
      while ((t = tw.nextNode())) if (/\S/.test(t.nodeValue)) nodes.push(t);
      nodes.forEach(function (t) {
        var f = document.createDocumentFragment();
        Array.from(t.nodeValue).forEach(function (ch) { var sp = document.createElement('span'); sp.className = 'ch'; sp.textContent = ch; f.appendChild(sp); C.push({ el: sp, p: p, top: 0 }); });
        t.parentNode.replaceChild(f, t);
      });
    });
    function measure() {
      var lp = null, pr = null;
      C.forEach(function (c) { if (c.p !== lp) { lp = c.p; pr = lp.getBoundingClientRect(); } c.top = c.el.getBoundingClientRect().top - pr.top; });
    }
    function count(limit) {                     /* 画面の上から limit までにある字の数(読む順に並んでいるので、いまの位置から先を数える) */
      var i, r = null, lp = null;
      for (i = Math.floor(n); i < C.length; i++) { if (C[i].p !== lp) { lp = C[i].p; r = lp.getBoundingClientRect(); } if (r.top + C[i].top >= limit) break; }
      return i;
    }
    function tick(now) {
      var dt = Math.max(0, Math.min(0.3, (now - last) / 1000)), H = window.innerHeight, target, lim, to, i;   /* 描画がゆっくりな端末でも、進みが遅れない。はじめの一こまは、時刻が前後して負になることがあるので、0 で止める */
      raf = 0; last = now;
      if (!seen || n >= C.length) return;
      /* 読む位置(画面の上から 62%)までは、スクロールに付いて浮かび上がる。その先は、読む速さより少し速く、自分で進む(止まって読んでいても、先の文が待っている) */
      target = count(H * 0.58); lim = Math.max(target, count(H * 0.9));
      /* 速さ: 読む位置までは、1秒に約36字(ひと息で1行ほど)。その先は、読む速さ(1秒に約9字)。一度に大きく進んだときだけ、遅れた分に応じて少し急ぐ(待たせない) */
      to = Math.max(n, Math.min(lim, n + (n < target ? 56 + Math.max(0, target - n - 140) * 0.45 : 16) * dt + 0.0001));
      for (i = Math.floor(n); i < Math.floor(to); i++) C[i].el.classList.add('lit');
      n = to; raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && seen && n < C.length) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    measure(); window.addEventListener('resize', measure); fontsIn().then(measure);
    new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (seen) setTimeout(measure, 1200); kick(); }, { threshold: 0 }).observe(msg);
    document.addEventListener('ks:shown', function () { setTimeout(function () { measure(); kick(); }, 80); });
  })();

  /* ---------- 見出しの要の一語・手書きの丸・背の大きな標語(文は変えない。いまある字を、印で包むだけ) ---------- */
  function wrapText(root, word, make) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), t, i, rest, el;
    while ((t = tw.nextNode())) {
      i = t.nodeValue.indexOf(word);
      if (i < 0 || (t.parentNode.closest && t.parentNode.closest('script, .kw, .hc'))) continue;
      rest = t.splitText(i); rest.splitText(word.length);
      el = make(); rest.parentNode.insertBefore(el, rest); el.insertBefore(rest, el.firstChild);
      return el;
    }
    return null;
  }
  if (home) (function () {
    var msg = document.getElementById('message'), bt;
    /* 1. 要の一語(場面ごとに一つ) */
    [['auditor', '経験'], ['work', '仕組み'], ['contact', 'ご相談']].forEach(function (p) {
      var h = $('#' + p[0] + ' .hd');
      if (h) wrapText(h, p[1], function () { var e = document.createElement('em'); e.className = 'kw'; return e; });
    });
    /* 2. 「無料」を、手書きの丸で囲む(相談のボタンのすぐ横。場面が出たあとに、一度だけ引かれる) */
    $$('.act .note', home).forEach(function (n) {
      wrapText(n, '無料', function () {
        var e = document.createElement('span'); e.className = 'hc';
        e.innerHTML = '<svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M13 31C6 13 37 3 62 5C87 7 98 18 93 31C88 44 60 48 36 46C15 44 3 35 9 22C14 12 31 6 52 6"/></svg>';
        return e;
      });
    });
    /* 3. (版24で外した)代表あいさつの背の、大きな線書きの標語。線だけで書いた大きな字は、やめる(ご指摘「このデザインダサい」) */
  })();

  /* ---------- 銀河は、マウスの位置で、少し向きを変える(のぞき込む感じ) ---------- */
  if (fig && fine && !reduce) ['#top', '#message'].forEach(function (id) {
    var sc = $(id);
    if (!sc) return;
    sc.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') fig.view((e.clientX / window.innerWidth - 0.5) * 0.5, (e.clientY / window.innerHeight - 0.5) * 0.5); }, { passive: true });
    sc.addEventListener('pointerleave', function () { fig.view(0, 0); });
  });

  /* ---------- はじまり ---------- */
  /* 名刺の挨拶(はじめての訪問のときだけ。進め方は、本番の js/site.js と同じ):
     金の点が転がってきて止まる → 丸い窓に開いて、ご本人 → 点に閉じる → 同じ点から名刺が立つ → 「はじめまして。」 → 言葉は退き、名刺は残る。
     粒が銀河になったあとに始める(始まりを二重にしない)。名刺の場所が画面に見えてから始める(スマホでは、名刺は少し下にあるため)。
     挨拶のあいだも、ほかの部分は読めるし、スクロールもできる(本番と違い、挨拶が済むまで隠しているものは無いので、途中で切り上げる必要がない) */
  function met() { try { return sessionStorage.getItem('ks2-met') === '1'; } catch (e) { return false; } }
  function greet(delay) {
    var mc = $('.mc'), started = false, t0 = performance.now(), ob = null;
    function leave() {
      try { sessionStorage.setItem('ks2-met', '1'); } catch (e) { /* 覚えられなくても、続ける */ }      /* 「お見せした」と覚えるのは、挨拶が最後まで済んだとき(途中で読み込み直しになったら、次にもう一度お見せする) */
      doc.classList.add('met');
      setTimeout(function () { doc.classList.add('go'); }, 420);
      setTimeout(function () { doc.classList.remove('card'); doc.classList.remove('meet'); doc.classList.remove('met'); if (window.KSCard) window.KSCard.ready(); }, 1300);
    }
    function start() {
      if (started) return;
      started = true; if (ob) ob.disconnect();
      setTimeout(function () { doc.classList.add('meet'); setTimeout(leave, 4400); }      /* お写真の場面を外したぶん、短い */, Math.max(0, delay - (performance.now() - t0)));
    }
    doc.classList.add('card'); doc.classList.add('greeted');
    if (mc && 'IntersectionObserver' in window) { ob = new IntersectionObserver(function (es) { if (es[es.length - 1].isIntersecting) start(); }, { threshold: 0.6 }); ob.observe(mc); }
    else start();
  }
  function begin(wait) {
    var top = $('#top');
    wait = wait || 0; booted = true; heroHold = false;
    if (!reduce && view === 'home' && $('.mc-me') && !met()) greet(1000 + wait); else doc.classList.add('go');      /* はじめての訪問は、名刺の挨拶。二度目からは、名刺だけが立つ(go)。冒頭の絞りを見たかどうかとは、別に覚える */
    top.style.setProperty('--d0', wait + 'ms'); top.classList.add('in');
    if (!fig || view !== 'home' || scene !== top) { if (fig && scene) { formNow = figOf(scene); fig.to(formNow); } return; }
    formNow = 'chaos'; fig.to('chaos', { swirl: 0 });
    setTimeout(function () { if (scene === top && formNow === 'chaos') { formNow = 'gather'; fig.to('gather', { swirl: 1.4 }); } }, 650 + wait);
    setTimeout(function () { if (scene === top && formNow === 'gather') { formNow = figOf(top); fig.to(formNow, { swirl: 1.2 }); } }, 1500 + wait);   /* 一点から、銀河が渦を巻いて広がる */
  }
  /* 冒頭の絞り(はじめの一度だけ): 金の点が左から走り、その点から画面が丸く開く */
  function intro(done) {
    var seen = false, o, d, u, p, W = window.innerWidth, t0, dur = 620, open = 600, gone = false, R = Math.hypot(W, window.innerHeight);
    try { seen = sessionStorage.getItem('ks2-in') === '1'; } catch (e) { /* 覚えられなくても、続ける */ }
    if (reduce || seen || !fig || window.pageYOffset > 8 || view !== 'home' || doc.classList.contains('trin')) { doc.classList.remove('pre'); done(0); return; }      /* ほかのページから幕で移ってきたときは、絞りを重ねない */
    o = document.createElement('div'); o.className = 'intro'; o.setAttribute('aria-hidden', 'true'); d = document.createElement('i'); u = document.createElement('u'); o.appendChild(u); o.appendChild(d); body.appendChild(o); doc.classList.remove('pre');
    setTimeout(function () { end(); }, 2800);   /* 何かあっても、幕は必ず上がる */
    function end() { if (gone) return; gone = true; try { sessionStorage.setItem('ks2-in', '1'); } catch (e) { /* 覚えられなくても、続ける */ } o.remove();['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.removeEventListener(ev, end); }); }
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, end, { passive: true }); });
    t0 = performance.now(); done(600);
    (function f(now) {
      if (gone) return;
      p = fig.point(); var t = now - t0, k = Math.min(1, t / dur), e = 1 - Math.pow(1 - k, 3), x = -20 + (p.x + 20) * e, r;
      d.style.transform = 'translate(' + x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)'; u.style.top = p.y + 'px'; u.style.transform = 'scaleX(' + (x / W).toFixed(4) + ')';
      if (t > dur) {
        r = R * Math.pow(Math.min(1, (t - dur) / open), 2.2);
        o.style.webkitMaskImage = o.style.maskImage = 'radial-gradient(circle at ' + p.x.toFixed(1) + 'px ' + p.y.toFixed(1) + 'px, transparent ' + r.toFixed(1) + 'px, #000 ' + (r + 1.5).toFixed(1) + 'px)';
        d.style.opacity = u.style.opacity = String(Math.max(0, 1 - (t - dur) / 220));
      }
      if (t > dur + open) { end(); return; }
      requestAnimationFrame(f);
    })(t0);
  }

  var first = location.hash.slice(1), arrive = doc.classList.contains('trin') ? (doc.getAttribute('data-trt') || '') : null;
  if (!home) {                                                                                        /* 本番の候補の下層ページ: 中身は書いてある。見張りを始め、題の大きさを合わせ、「戻る」を整える */
    doc.classList.remove('pre'); heroHold = false; booted = true;
    if (!navigator.share) $$('[data-share]', dv).forEach(function (b) { b.textContent = 'リンクをコピー'; });
    fixBack(); watch(true); fit();
    if (fig && scene) { formNow = figOf(scene); fig.to(formNow, { swirl: 0 }); }
    if (arrive !== null) uncover(arrive);
  }
  else if (first && (D.pages[first] || HOME.indexOf(first) > 0)) { doc.classList.remove('pre'); heroHold = false; show(first); booted = true; if (window.KSCard) window.KSCard.ready(); if (fig && scene) { formNow = figOf(scene); fig.to(formNow, { swirl: 0 }); } }
  else {
    watch(true);
    var started = false, kickoff = function () { if (started) return; started = true; if (fig && scene === $('#top')) fig.anchor(anchorOf($('#top')), true); intro(begin); };      /* 冒頭にいるときだけ、冒頭の場所へ(開き直して途中の場面から始まるときは、その場面のまま) */
    fontsIn(1500).then(kickoff); setTimeout(kickoff, 5600);   /* 文字の読み込みを待つのは、書体の指定が入ってから、長くても1.5秒まで(指定が届かないときも、5.6秒で始める) */
  }
  if (home && arrive !== null) uncover(arrive);                                                       /* ほかのページから幕で移ってきたときは、ここで開ける */
})();
