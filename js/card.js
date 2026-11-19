/* 佐藤健司公認会計士事務所 — 冒頭の名刺の動き(新コンセプトの試作)
   いまの本番サイトの名刺を、そのまま使う。この下の「冒頭: 名刺が、一点の上で演じる」は、本番の js/dim.js から機械的に取り出したもの。
   名刺は、金の点の上に一点で立ち、ゆっくり揺れ、指やマウスのほうを向く。触れた所だけ、丸いルーペを通して設計図(裏)が見える。
   何もしなくても、自分で演じる: ルーペが中を巡る → 一回転 → 裏を見せる → お辞儀。動きを減らす設定では、動かさない。 */
(function () {
  'use strict';
  if (!window.requestAnimationFrame) return;
  var doc = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function runner(el, frame, gone) {
    var raf = 0, seen = false;
    function loop(now) { raf = 0; frame(now); if (seen && !document.hidden) raf = requestAnimationFrame(loop); }
    function kick() { if (!raf && seen && !document.hidden) raf = requestAnimationFrame(loop); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (!seen && gone) gone(); kick(); }, { rootMargin: '15% 0px' }).observe(el);
    else { seen = true; kick(); }
    document.addEventListener('visibilitychange', kick);
    return kick;
  }
  function onResize(fn) {
    var lw = window.innerWidth, lh = window.innerHeight;
    window.addEventListener('resize', function () {
      /* スマホで住所欄が出入りするだけの高さの変化では、作り直さない */
      if (window.innerWidth === lw && Math.abs(window.innerHeight - lh) < 120) return;
      lw = window.innerWidth; lh = window.innerHeight; fn();
    });
  }

  /* ================= 冒頭: 名刺が、一点の上で演じる ================= */
  (function () {
    var hero = document.querySelector('#top');
    var card = hero && hero.querySelector('.mc-card'), shadow = hero && hero.querySelector('.mc-shadow');
    if (!card) return;
    var hand = card.parentNode, plan = card.querySelector('.mc-plan'), read = card.querySelector('.mc-read'), btn = hero.querySelector('.act .btn');
    var ret = card.querySelector('.mc-ret');
    var LR = 17, SPIN = 1700, FLIP = 700, HOLD = 2600, readTxt = '', i;
    function ease(u) { return u * u * u * (u * (6 * u - 15) + 10); }            /* 静かに動きだし、静かに止まる。行き過ぎない */
    var FACE = { x: .191, y: .465 };                                             /* 名刺の中の、顔のある位置 */
    /* ルーペの位置(名刺の中の 0〜1)と半径(名刺の幅に対する%)、倍率を置く。f が 1 のときは、窓のまん中に顔を見せる。
       のぞいている位置を mm で出す(名刺は 91 × 55 mm) */
    function setLens(x, y, r, mg, f) {
      var st = plan.style, t, fx = x + (FACE.x - x) * (f || 0), fy = y + (FACE.y - y) * (f || 0);
      st.setProperty('--x1', (x * 100).toFixed(2) + '%'); st.setProperty('--y1', (y * 100).toFixed(2) + '%'); st.setProperty('--r1', (+r).toFixed(2));
      st.setProperty('--fx', (fx * 100).toFixed(2) + '%'); st.setProperty('--fy', (fy * 100).toFixed(2) + '%'); st.setProperty('--mg', (mg || 1.6).toFixed(3));
      if (!read) return;
      t = Math.max(0, Math.min(91, fx * 91)).toFixed(1) + ' , ' + Math.max(0, Math.min(55, fy * 55)).toFixed(1);
      if (t !== readTxt) { readTxt = t; read.textContent = t; }
    }
    /* 確認用: ?lens=0.42,0.5 で、ルーペを名刺の中のその位置(0〜1)に出したままにする(&iris=1 を足すと、顔を見せる大きな窓)。?spin=0.5 で、一回転の途中(0〜1)で止める */
    var lz = /[?&]lens=([\d.]+),([\d.]+)/.exec(location.search), sz = /[?&]spin=([\d.]+)/.exec(location.search), su;
    if (lz && plan) {
      if (/[?&]iris=1/.test(location.search)) setLens(.29, .5, 26, 2.2, 1); else setLens(+lz[1], +lz[2], LR, 1.6, 0);
      plan.style.visibility = 'visible'; if (ret) ret.classList.add('lock');
    }
    if (sz) {
      su = Math.min(1, +sz[1]);
      card.style.transform = 'rotateX(5deg) rotateY(' + (-6 + 360 * ease(su)).toFixed(2) + 'deg) rotateZ(-.4deg) scale(' + (1 - .1 * Math.sin(Math.PI * su)).toFixed(3) + ')';
    }
    if (reduce || lz || sz) return;              /* 動きを減らす設定と、確認用の指定では、動かさない */

    /* 名刺の中の仕掛け: 歯車と、円の上をめぐる要の点。名刺が回るあいだと、ルーペが歯車をのぞいているあいだは、速く回る */
    var gearEls = document.querySelectorAll('#mc-bp [data-gear]'), gears = [], ga = 0, gs = 1;
    for (i = 0; i < gearEls.length; i++) gears.push({ el: gearEls[i], c: gearEls[i].getAttribute('data-c'), k: +gearEls[i].getAttribute('data-k'), o: +gearEls[i].getAttribute('data-o') });
    function turn(dt, fast) {
      gs += ((fast ? 8 : 1) - gs) * (1 - Math.exp(-dt / 240));
      ga = (ga + dt * .024 * gs) % 43200;
      for (var n = 0; n < gears.length; n++) gears[n].el.setAttribute('transform', 'rotate(' + (gears[n].o + ga * gears[n].k).toFixed(2) + ' ' + gears[n].c + ')');
    }

    var px = 0, py = 0, pxT = 0, pyT = 0, last = 0, heroH = hero.offsetHeight || 1;
    var sy = window.pageYOffset || 0, rk = 0, rkv = 0;                             /* スクロールへの揺れ(角度と、その速さ) */
    var L = { tx: .5, ty: .5, x: .5, y: .5, r: 0, rT: 0, mg: 1.6, f: 0, auto: false, used: 0, shown: false };   /* ルーペ */
    /* 自分で演じる順番(映画のように、止まる所と、すばやく移る所を交互に置く)。
       ルーペが中を巡る(顔 → 名前 → 歯車 → 紋) → くるりと一回転 → ルーペが一文をなぞって顔へ → 裏(中身の全体)を見せる → お辞儀 → はじめへ */
    var SHOW = ['bow'], GAP = { tourA: 3600, spin: 4200, tourB: 3600, back: 3800, bow: 9000 };
    /* ルーペの道すじ: [時刻(ミリ秒), 横, 縦, 半径, 倍率, 顔を見せるか(0〜1)]。
       はじめは小さな点として名刺の端から滑ってきて、止まった所で大きな丸い窓に開き、ご本人を見せる。そのあと、ふつうの大きさに戻って中を巡る */
    var TOUR = {
      tourA: [[0, .03, .5, 2.2, 1.6, 0], [550, .29, .5, 2.2, 1.6, 1], [1050, .29, .5, 26, 2.2, 1], [2700, .29, .5, 26, 2.32, 1],
              [3200, .5, .47, 17, 1.6, 0], [3900, .5, .47, 17, 1.6, 0], [4450, .82, .4, 17, 1.6, 0], [5650, .81, .41, 17, 1.6, 0],
              [6200, .88, .79, 17, 1.6, 0], [7050, .88, .79, 17, 1.6, 0]],
      tourB: [[0, .1, .87, 17, 1.6, 0], [450, .12, .87, 17, 1.6, 0], [2300, .66, .87, 17, 1.6, 0], [2700, .66, .87, 17, 1.6, 0],
              [3250, .29, .5, 26, 2.2, 1], [4800, .29, .5, 26, 2.32, 1]]
    };
    Object.keys(TOUR).forEach(function (k) { TOUR[k].forEach(function (q) { q[0] = Math.round(q[0] * 1.45); }); });
    var A = { kind: '', t0: 0, path: null }, si = 0, at = 0, began = false;        /* いま演じているもの、次の番号、次に始める時刻 */
    var zoom = 1, locked = false, ltx = .5, lty = .5, still = 0;                    /* 寄り(カメラが近づく)と、ピント合わせ */
    function glint() { hand.classList.remove('glint'); void hand.offsetWidth; hand.classList.add('glint'); setTimeout(function () { hand.classList.remove('glint'); }, 1000); }
    function done(now, gap) { if (A.kind === 'spin' || A.kind === 'back') glint(); A.kind = ''; at = now + gap; }
    function lensTo(x, y) { if (L.r < .4) { L.x = x; L.y = y; } L.tx = x; L.ty = y; L.rT = LR; }
    function lensOff() { if (!L.auto) L.rT = 0; }
    function nod() { hand.classList.remove('nod'); void hand.offsetWidth; hand.classList.add('nod'); }
    function start(kind, now) {
      at = 0; A.kind = kind; A.t0 = now;
      if (TOUR[kind]) {
        if (!plan) { done(now, 400); return; }
        A.path = TOUR[kind]; L.auto = true; L.x = L.tx = A.path[0][1]; L.y = L.ty = A.path[0][2]; L.r = L.rT = A.path[0][3]; L.mg = A.path[0][4]; L.f = A.path[0][5];
      } else if (kind === 'bow') {
        nod(); if (btn) { btn.classList.remove('ping'); void btn.offsetWidth; btn.classList.add('ping'); }
        done(now, GAP.bow);
      } else { L.auto = false; L.rT = 0; }                                         /* spin / back */
    }
    /* 名刺が出そろい、挨拶が済み、冒頭が見えているあいだだけ演じる。だれかが触れているあいだは、待つ */
    function auto(now, q) {
      if (!hand.classList.contains('in') || doc.classList.contains('card') || q >= .25) { at = 0; return; }
      if (A.kind) return;
      if (!at) { at = now + (began ? 1500 : 700); began = true; return; }       /* はじめの一拍(顔)は、名刺が出そろってすぐに */
      if (now < at) return;
      if ((L.rT && !L.auto) || now - L.used < 4000) { at = now + 2500; return; }
      start(SHOW[si], now); si = (si + 1) % SHOW.length;
    }

    var kick = runner(hero, function (now) {
      var dt = last ? Math.min(100, now - last) : 16, e = 1 - Math.exp(-dt / 220), a = now * .001, ds = dt / 1000; last = now;
      px += (pxT - px) * e; py += (pyT - py) * e;
      var y = window.pageYOffset || 0, q = y / (heroH * .9); q = q < 0 ? 0 : q > 1 ? 1 : q;   /* 読み進めた割合 */
      /* スクロールに、揺れで応える。動かした分だけ押され、ばねで戻る(足もとは点の上から動かない) */
      var dy = y - sy; sy = y; if (dy > 300 || dy < -300) dy = 0;                  /* 目次からの移動のような大きな飛びは数えない */
      rkv += dy * .5; rkv += (-52 * rk - 5.4 * rkv) * ds; rk += rkv * ds;
      if (rk > 15) { rk = 15; rkv = 0; } else if (rk < -15) { rk = -15; rkv = 0; }
      auto(now, q);
      /* 一回転(すばやく回って、ぴたりと止まる)と、裏を見せる所作。裏は、名刺の中身。回るあいだは、わずかに小さくなる(角が、上下の文字にかからないように) */
      var spin = 0, lift = 0, fast = false, t = now - A.t0, u;
      if (A.kind === 'spin') {
        u = t / SPIN; fast = true;
        if (u >= 1) done(now, GAP.spin); else { spin = 360 * ease(u); lift = Math.sin(Math.PI * u); }
      } else if (A.kind === 'back') {
        if (t < FLIP) { u = t / FLIP; spin = 180 * ease(u); lift = Math.sin(Math.PI * u) * .6; fast = true; }
        else if (t < FLIP + HOLD) spin = 180;
        else if (t < FLIP * 2 + HOLD) { u = (t - FLIP - HOLD) / FLIP; spin = 180 + 180 * ease(u); lift = Math.sin(Math.PI * u) * .6; fast = true; }
        else done(now, GAP.back);
      }
      /* ふだんは少し斜め。釣り合いを取るように、ゆっくり大きく揺れる。指やマウスがあれば、そちらを向く。読み進めると、奥へ倒れて少し遠ざかる */
      var sway = -6 + px * 34 + Math.sin(a * .5) * 8 + Math.sin(a * 1.13 + 1) * 2.5, ry = sway + spin;
      var rx = 5 - py * 20 + Math.cos(a * .41) * 3 + q * 20 + rk, rz = -.4 + px * 2.2 + Math.sin(a * .67) * .9;
      /* ルーペが顔に止まっているあいだ、名刺がわずかに近づく(カメラの寄り) */
      zoom += ((L.auto && L.shown && L.x < .34 && L.y < .7 ? 1.045 : 1) - zoom) * (1 - Math.exp(-dt / 420));
      card.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + ((1 - q * .1) * (1 - lift * .1) * zoom).toFixed(3) + ')';
      card.style.setProperty('--sx', (50 - sway * 2.6).toFixed(1) + '%');           /* 映り込みの位置 */
      if (shadow) {
        var c = Math.abs(Math.cos(ry * Math.PI / 180));                            /* 横を向くほど、影は細くなる */
        shadow.style.transform = 'translateX(' + (-sway * 1.2).toFixed(1) + 'px) scaleX(' + ((1 - q * .2) * (.16 + .84 * c)).toFixed(3) + ')';
        shadow.style.setProperty('--so', (.7 - q * .5).toFixed(2));
      }
      if (plan) lens(now, dt);
      if (L.shown || spin) turn(dt, fast || (L.shown && L.x > .66 && L.y < .64));
    });
    function lens(now, dt) {
      if (L.auto) {
        var t = now - A.t0, P = A.path, n = P.length - 1, j = 0, u, k;
        if (t >= P[n][0]) { L.auto = false; L.rT = 0; done(now, GAP[A.kind] || 2200); }
        else {
          while (j < n - 1 && t >= P[j + 1][0]) j++;
          u = (t - P[j][0]) / (P[j + 1][0] - P[j][0]); k = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
          L.tx = P[j][1] + (P[j + 1][1] - P[j][1]) * k; L.ty = P[j][2] + (P[j + 1][2] - P[j][2]) * k;
          L.r = L.rT = P[j][3] + (P[j + 1][3] - P[j][3]) * k; L.mg = P[j][4] + (P[j + 1][4] - P[j][4]) * k; L.f = P[j][5] + (P[j + 1][5] - P[j][5]) * k;
        }
      }
      var e1 = 1 - Math.exp(-dt / (L.auto ? 34 : 95));                             /* 窓は、指やマウスを少し遅れて追う */
      L.x += (L.tx - L.x) * e1; L.y += (L.ty - L.y) * e1;
      if (!L.auto) {                                                                /* 指やマウスで動かすときは、ふつうの大きさと倍率に戻す */
        var e2 = 1 - Math.exp(-dt / 170);
        L.r += (L.rT - L.r) * e2; L.mg += (1.6 - L.mg) * e2; L.f += (0 - L.f) * e2;
      }
      if (L.r < .2 && !L.rT) {
        if (L.shown) { L.shown = false; plan.style.visibility = 'hidden'; locked = false; still = 0; if (ret) ret.classList.remove('lock'); }
        return;
      }
      if (!L.shown) { L.shown = true; plan.style.visibility = 'visible'; }
      setLens(L.x, L.y, L.r, L.mg, L.f);
      /* ピント合わせ: ルーペが止まって少しすると、四隅の枠が締まる。動きだすと、ほどける */
      var moving = Math.abs(L.tx - ltx) + Math.abs(L.ty - lty) > .0012 || Math.abs(L.tx - L.x) + Math.abs(L.ty - L.y) > .012; ltx = L.tx; lty = L.ty;
      still = moving || !L.rT || L.r < 12 ? 0 : still + dt;
      if (ret && (still > 130) !== locked) { locked = still > 130; ret.classList.toggle('lock', locked); }
    }
    /* 指やマウスが名刺の上にあるあいだ、ルーペがそこへ付いていく(回っているあいだは出さない)。自分で巡っている途中なら、そこで譲る */
    function point(ev) {
      if (!plan || A.kind === 'spin' || A.kind === 'back' || !hand.classList.contains('in')) return;
      var c = card.getBoundingClientRect(), x = (ev.clientX - c.left) / c.width, y = (ev.clientY - c.top) / c.height;
      if (x > -.05 && x < 1.05 && y > -.08 && y < 1.08) {
        if (L.auto) { L.auto = false; A.kind = ''; at = 0; }
        L.used = last || 1; lensTo(x, y); kick();
      } else lensOff();
    }
    onResize(function () { heroH = hero.offsetHeight || 1; kick(); });
    hero.addEventListener('pointermove', function (ev) {
      var r = hero.getBoundingClientRect(); pxT = (ev.clientX - r.left) / r.width - .5; pyT = ev.pointerType === 'touch' ? 0 : (ev.clientY - r.top) / r.height - .5;
      point(ev);
    }, { passive: true });
    hero.addEventListener('pointerdown', point, { passive: true });
    hero.addEventListener('pointerup', function (ev) { if (ev.pointerType === 'touch') lensOff(); });
    hero.addEventListener('pointerleave', function () { pxT = 0; pyT = 0; lensOff(); });
    hero.addEventListener('pointercancel', function () { pxT = 0; pyT = 0; lensOff(); });
    /* 名刺に触れると、小さくお辞儀を返す */
    card.addEventListener('click', function () { if (!hand.classList.contains('in')) return; L.used = last || 1; nod(); });
    if (btn) btn.addEventListener('animationend', function (ev) { if (ev.animationName === 'ping') btn.classList.remove('ping'); });
    /* 挨拶も登場もなかったとき(ページ内の場所へ直接来たときなど)は、最初から出そろった扱いにする */
    /* 試作: 名刺は、はじまりの合図(html に go が付く)で、点 → 線 → 面 と立つ。合図なしで出すときは、KSCard.ready() */
    window.KSCard = { ready: function () { hand.classList.add('in'); kick(); } };
    hand.addEventListener('animationend', function (ev) {
      if (ev.target !== hand) return;
      if (ev.animationName === 'present') hand.classList.add('in');        /* 出そろった */
      else if (ev.animationName === 'nod') hand.classList.remove('nod');
    });
  })();

})();
