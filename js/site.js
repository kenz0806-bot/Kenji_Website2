/* 佐藤健司公認会計士事務所 — 画面の動き
   どれも「無くても読める」ことを前提にした追加の演出です。 */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 演出が途中で止まっても文字が消えたままにならないよう、時間が来たら必ず完了させる */
  function settle(root, ms) {
    if (!root || !root.getAnimations) return;
    setTimeout(function () {
      try {
        root.getAnimations({ subtree: true }).forEach(function (a) {
          if (a.playState !== 'finished') a.finish();
        });
      } catch (e) { /* 古いブラウザでは何もしない */ }
    }, ms);
  }

  /* 画面が見えている状態で ms たったら fn を呼ぶ。別のタブで開かれたときは、見えるまで時計を動かさない */
  function visibleTimeout(fn, ms) {
    function arm() { setTimeout(fn, ms); }
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', function h() {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', h); arm();
      });
    } else arm();
  }

  /* 画面が実際に描かれてから始める。見えていない(別のタブなど)あいだは待ち、見えたあとの2フレーム目で始める。
     以前は「連続2フレームが90ms未満」を条件にしていたが、遅い端末やアプリ内ブラウザでは読み込み直後のフレームが
     それより遅く、1.6秒の保険にかかって場面が出ないことがあった */
  function whenLive(fn) {
    var n = 0, done = false;
    function probe() {
      if (done) return;
      if (document.visibilityState === 'hidden') { requestAnimationFrame(probe); return; }
      if (++n < 2) { requestAnimationFrame(probe); return; }
      done = true; fn();
    }
    requestAnimationFrame(probe);
    return function cancel() { done = true; };
  }

  /* 静かに動き出し、静かに止まる(0〜1) */
  function ss(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * x * (x * (x * 6 - 15) + 10); }
  /* 早めに開いて、長く静かに納まる(0〜1) */
  function unfurl(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return ss(1 - Math.pow(1 - x, 1.5)); }

  /* ---------- 冒頭の扇 ----------
     要(かなめ)の一点が現れ、藍の一本が立ち、そこから骨が一枚ずつほどけるように開く。
     スクロールすると一本の線にたたまれる。扇に触れると、静かに閉じて、また開く。
     藍の一本だけは、扇の縁の少し先まで伸ばしてある。 */
  function fan() {
    var cv = document.getElementById('fan');
    var pr = document.getElementById('promise');
    if (!cv || !cv.getContext || !pr) return;

    var hero = cv.parentNode;
    var ctx = cv.getContext('2d');
    var AI = (getComputedStyle(doc).getPropertyValue('--ai') || '').trim() || '#0a4ea0';
    var N = 25, W = 0, H = 0;
    var g = { x: 0, y: 0, R: 0, a0: 0, span: 0 };
    var open = 1, live = false, raf = 0, seen = true, px = 0, pxT = 0, calm = 0, last = 0;

    /* 所作(ひとまとまりの動き)。'wait'=まだ描かない / 'intro'=最初に開く / 'tap'=触れられて閉じ、また開く / ''=なし */
    var act = reduce ? '' : 'wait', actAt = 0;
    var RISE_AT = 260, RISE = 900;                /* 藍の一本が立つ(ミリ秒) */
    var OPEN_AT = 980, OPEN = 2200, LAG = 500;    /* 骨が開く。外側の骨から動き、内側ほど少し遅れる */
    var FOLD = 860, FOLD_LAG = 160, HOLD = 300;   /* 触れられたとき: 閉じる→ひと呼吸おく→開く */

    function target() {
      var p = Math.min(1, Math.max(0, (window.scrollY || 0) / (H * 0.5)));
      return 1 - p * p * (3 - 2 * p);
    }

    /* いまの所作での、要・藍の一本・各骨の進み具合(どれも0〜1) */
    function pose(now) {
      var T = now - actAt, P = { dot: 1, ring: 1, rise: 1, f: null, done: true };
      if (act === 'wait') {
        P.dot = P.ring = P.rise = 0; P.done = false;
        P.f = function () { return 0; };
      } else if (act === 'intro') {
        P.dot = ss(T / 520); P.ring = ss((T - 120) / 1000); P.rise = ss((T - RISE_AT) / RISE);
        P.f = function (i) { return unfurl((T - OPEN_AT - LAG * i / (N - 2)) / OPEN); };
        P.done = T > OPEN_AT + LAG + OPEN;
      } else if (act === 'tap') {
        var U = FOLD + FOLD_LAG + HOLD;
        P.f = function (i) {
          return T < U ? 1 - ss((T - FOLD_LAG * i / (N - 2)) / FOLD)
                       : unfurl((T - U - LAG * i / (N - 2)) / OPEN);
        };
        P.done = T > U + LAG + OPEN;
      }
      return P;
    }

    function size() {
      var r = hero.getBoundingClientRect();
      var q = pr.getBoundingClientRect();
      var d = Math.min(window.devicePixelRatio || 1, 2);
      var narrow = r.width < 760;
      W = r.width; H = r.height;
      g.x = q.left - r.left + 12;
      g.y = q.top - r.top - 30;
      /* スマホでは枠に収め、広い画面では枠からはみ出す大きさにする */
      var fs = hero.querySelector('.fan-space');
      var fh = fs ? fs.getBoundingClientRect().height : 0;   /* スマホでは扇を専用の空きに収め、名前に重ねない */
      g.R = narrow ? Math.max(120, Math.min((W - g.x) * 0.9, (fh || g.y) - 54))
                   : Math.max(260, Math.min((W - g.x) * 0.6, 720));
      g.a0 = -3 * Math.PI / 180;
      g.span = (narrow ? 82 : 76) * Math.PI / 180;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      draw();
    }

    /* 描く。所作が終わっていれば true を返す */
    function draw(now) {
      now = now || performance.now();
      var P = pose(now);
      /* 開ききったあとは、骨と縁がゆっくり波打ち続ける(所作のあいだは止めておく) */
      var t = (live && !reduce) ? now / 1000 : 0;
      var amp = (live && !reduce) ? 0.012 * open * calm : 0;
      var span = g.span * open * (1 + px * 0.05);
      var tips = [], vis = [], i, j;
      for (i = 0; i < N; i++) {
        var k = i / (N - 1), f = P.f ? P.f(i) : 1;
        tips.push([
          /* 藍の一本(いちばん奥)は動かさず、ほかの骨がそこから離れていく */
          g.a0 - span * k - span * (1 - k) * (1 - f) + amp * 0.35 * Math.sin(t * 0.45 + i * 0.5),
          1 + amp * (Math.sin(t * 0.55 - i * 0.42) + 0.5 * Math.sin(t * 0.33 + i * 0.9))
        ]);
        vis.push(i === N - 1 ? 1 : Math.min(1, f * 7));   /* 藍の一本に重なっているあいだは見せない */
      }
      var spread = tips[0][0] - tips[N - 1][0];
      ctx.clearRect(0, 0, W, H);
      if (spread > 0.004) {
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(26,34,56,' + (0.24 * Math.min(1, spread / 0.14)).toFixed(3) + ')';
        [1, 0.34].forEach(function (s) {
          ctx.beginPath();
          for (j = 0; j < N; j++) {
            var r = g.R * s * (s === 1 ? tips[j][1] : 1 + (tips[j][1] - 1) * 0.4);
            var x = g.x + Math.cos(tips[j][0]) * r, y = g.y + Math.sin(tips[j][0]) * r;
            if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        });
      }
      for (i = 0; i < N; i++) {
        var lead = i === N - 1, strong = i % 6 === 0;
        var len = (lead ? 1.06 * P.rise : 1) * g.R * tips[i][1];
        if (vis[i] <= 0 || len <= 0) continue;
        ctx.beginPath(); ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x + Math.cos(tips[i][0]) * len, g.y + Math.sin(tips[i][0]) * len);
        ctx.lineWidth = lead ? 1.5 : (strong ? 1 : 0.7);
        ctx.strokeStyle = lead ? AI : 'rgba(26,34,56,' + ((strong ? 0.36 : 0.17) * vis[i]).toFixed(3) + ')';
        ctx.stroke();
      }
      /* 要: 藍の点と、閉じきらない円 */
      if (P.dot > 0) { ctx.fillStyle = AI; ctx.beginPath(); ctx.arc(g.x, g.y, 8 * P.dot, 0, Math.PI * 2); ctx.fill(); }
      if (P.ring > 0) {
        ctx.strokeStyle = AI; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(g.x, g.y, 19, -0.22 * Math.PI, (-0.22 + 1.88 * P.ring) * Math.PI); ctx.stroke();
      }
      return P.done;
    }

    /* 画面の描き直しが毎秒60回でも120回でも同じ速さになるよう、経過時間で進める */
    function ease(ms, dt) { return 1 - Math.exp(-dt / ms); }
    function loop(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      open += (target() - open) * ease(300, dt);
      px += (pxT - px) * ease(200, dt);
      calm += ((act ? 0 : 1) - calm) * ease(act ? 220 : 1500, dt);
      if (draw(now) && act) act = '';
      if (seen && !document.hidden) raf = requestAnimationFrame(loop); else last = 0;
    }
    function kick() { if (live && !raf && seen) raf = requestAnimationFrame(loop); }

    size();
    if (!reduce) {
      var begin = function () { if (act !== 'wait') return; act = 'intro'; actAt = performance.now(); kick(); };
      var cancel = whenLive(function () {
        live = true;
        /* 名刺を差し出す場面があるときは、それが済んでから開く */
        if (doc.classList.contains('card')) { document.addEventListener('ks:go', begin); setTimeout(begin, 6000); }
        else begin();
      });
      /* 見えている状態で1.4秒たっても画面が動いていなければ、動きなしで開いた扇を出す。名刺の場面もやめる */
      visibleTimeout(function () { if (!live) { cancel(); act = ''; doc.classList.remove('card'); draw(); } }, 1400);
    }
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW && window.innerWidth < 760) return;   /* 高さだけの変化は無視(スクロール中のかくつき防止) */
      lastW = window.innerWidth; size(); kick();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    window.addEventListener('scroll', kick, { passive: true });
    document.addEventListener('visibilitychange', kick);
    hero.addEventListener('pointermove', function (e) {
      if (!live) return;
      var r = hero.getBoundingClientRect();
      pxT = ((e.clientX - r.left) / r.width - 0.5) * 2; kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { pxT = 0; kick(); });
    /* 扇か要に触れると、静かに閉じて、また開く。動いている途中と、たたんだ状態では受けない */
    hero.addEventListener('click', function (e) {
      if (!live || act || open < 0.9) return;
      if (e.target.closest && e.target.closest('a, button')) return;
      var r = hero.getBoundingClientRect(), dx = e.clientX - r.left - g.x, dy = e.clientY - r.top - g.y;
      var d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      var onFan = d < g.R * 1.06 && a < g.a0 + 0.06 && a > g.a0 - g.span - 0.06;
      if (d < 46 || onFan) { act = 'tap'; actAt = performance.now(); kick(); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; kick(); }).observe(hero);
    }
  }

  /* ---------- ページの終わりを流れる線 ----------
     波の中を、藍の一本が通っている。藍の一本は、いちばん素直な波だけでできている。
     ほかの線は、それに細かな揺れと、線ごとのずれが足されている。
     触れると、そこからうねりが左右へ渡り、通ったあとの線は藍の一本にそろう。しばらくして、また波に戻る。 */
  function flow() {
    var cv = document.getElementById('flow');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var AI = (getComputedStyle(doc).getPropertyValue('--ai') || '').trim() || '#0a4ea0';
    var N = 14, KEY = N >> 1, W = 0, H = 0, q = 1, raf = 0, seen = false, live = false;
    var drops = [];        /* 触れた位置と時刻 */
    var out = [0, 0];      /* [うねりの高さ, そろい具合] を受け渡す入れ物 */

    /* 触れた点から左右へ進む「うねり」と、その通ったあとに残る「そろい」(どちらも0〜1ほど) */
    function touch(x, i, now) {
      var lift = 0, order = 0;
      var speed = Math.min(260, Math.max(120, W * 0.2)), wide0 = Math.min(120, Math.max(54, W * 0.09));
      for (var k = 0; k < drops.length; k++) {
        var age = (now - drops[k].t) / 1000 - Math.abs(i - KEY) * 0.045;   /* 藍の一本が先、ほかは少し遅れて */
        if (age <= 0) continue;
        var dist = Math.abs(x - drops[k].x), reach = speed * age, wide = wide0 * (1 + 0.42 * age);
        var a = (dist - reach) / wide, b = (dist + reach) / wide, on = ss(age / 0.7);
        lift += on * Math.exp(-age / 2.6) * (Math.exp(-a * a) + Math.exp(-b * b));
        var o = on * ss((reach - dist) / (wide * 1.6) + 0.5) * (1 - ss((age - 3.2) / 6.5));
        if (o > order) order = o;
      }
      out[0] = lift; out[1] = order;
    }

    function draw(now) {
      var s = live ? now / 1000 : 8;
      var amp = H * 0.16, rise = H * 0.13;
      while (drops.length && now - drops[0].t > 11000) drops.shift();
      var busy = drops.length > 0;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < N; i++) {
        var u = i / (N - 1) - 0.5, base = H * 0.5 + u * H * 0.34;
        var fine = i === KEY ? 0.25 : 1;   /* 細かな揺れ。藍の一本にはほとんど足さない */
        ctx.beginPath();
        for (var x = -12; x <= W + 12; x += 12) {
          var X = x * q;   /* 画面が狭くても、波がひとつ見える幅に合わせる */
          var lift = 0, loose = 1;
          if (busy) { touch(x, i, now); lift = out[0]; loose = 1 - out[1]; }
          var env = 0.62 + 0.38 * Math.sin(X * 0.0021 + s * 0.19 + 1.3);
          var y = base - rise * lift + amp * env * (
            0.58 * Math.sin(X * 0.0043 - s * 0.5 + i * 0.2 * loose) +                      /* 素直な波(左から右へ) */
            0.27 * fine * (0.1 + 0.9 * loose) * Math.sin(X * 0.0092 + s * 0.33 + i * 0.11) +   /* 細かな揺れ */
            0.3 * Math.sin(X * 0.0016 - s * 0.14 + i * 0.05 * loose));                     /* ごくゆっくりした上下 */
          if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = i === KEY ? 1.2 : 0.8;
        ctx.strokeStyle = i === KEY ? AI : 'rgba(26,34,56,' + (0.12 + 0.2 * (1 - Math.abs(u) * 2)).toFixed(3) + ')';
        ctx.stroke();
      }
    }
    function size() {
      var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      q = 1440 / Math.min(1600, Math.max(420, W));
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      draw(performance.now());
    }
    function loop(now) { raf = 0; draw(now); if (seen && !document.hidden) raf = requestAnimationFrame(loop); }
    function kick() { if (live && !raf && seen) raf = requestAnimationFrame(loop); }

    size();
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () { if (window.innerWidth === lastW) return; lastW = window.innerWidth; size(); });
    document.addEventListener('visibilitychange', kick);
    if (!reduce) whenLive(function () { live = true; kick(); });
    cv.addEventListener('click', function (e) {
      if (!live) return;
      if (drops.length > 3) drops.shift();
      drops.push({ x: e.clientX - cv.getBoundingClientRect().left, t: performance.now() });
      kick();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; kick(); }).observe(cv);
    } else { seen = true; }
  }

  /* ---------- 冒頭の文字と、各節の罫線 ---------- */
  function reveal() {
    if (reduce) { sections(); return; }
    whenLive(function () {
      if (!doc.classList.contains('pre')) { sections(); return; }   /* 時間切れや #contact への直接の訪問で外れていたら、演出なしのまま */
      var went = false;
      function go() {
        if (went) return; went = true;
        doc.classList.remove('pre');
        doc.classList.add('go');
        settle(document.querySelector('.hero, .page-hero'), 5200);
        sections();
        try { document.dispatchEvent(new Event('ks:go')); } catch (e) { /* 古いブラウザでは扇は時間で開く */ }
      }
      if (!doc.classList.contains('card') || !document.querySelector('.meishi')) { go(); return; }

      /* 名刺を差し出す: 顔を見せる → お辞儀をして差し出す → 「はじめまして。」 → 受け取られる → サイトが始まる。
         触れる・スクロールする・キーを押すと、待たずに先へ進む */
      var left = false, evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
      function leave() {
        if (left) return; left = true;
        clearTimeout(timer);
        evs.forEach(function (ev) { window.removeEventListener(ev, leave); });
        doc.classList.add('met');
        var slow = doc.classList.contains('exit-slow');
        setTimeout(go, slow ? 560 : 420);
        setTimeout(function () { doc.classList.remove('card'); doc.classList.remove('meet'); doc.classList.remove('met'); }, slow ? 1500 : 1200);
      }
      doc.classList.add('meet');
      try { if (!/[?&]card=1/.test(location.search)) sessionStorage.setItem('ks-met', '1'); } catch (e) { /* 記録できなくても続ける */ }
      /* 確認用の指定: ?cardms=4600 で「はじめまして。」のあとの間を変える、?cardexit=slow で受け取られる動きをゆっくりに */
      var ms = 4000, qp = /[?&]cardms=(\d{3,5})/.exec(location.search);
      if (qp) ms = +qp[1];
      if (/[?&]cardexit=slow/.test(location.search)) doc.classList.add('exit-slow');
      var timer = setTimeout(leave, ms);
      evs.forEach(function (ev) { window.addEventListener(ev, leave, { passive: true }); });
    });
  }

  function sections() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
        settle(e.target, 2800);
      });
    });
    var els = document.querySelectorAll('.sec, .svc');
    for (var i = 0; i < els.length; i++) io.observe(els[i]);
  }

  /* ---------- スマホの目次 ---------- */
  function menu() {
    var btn = document.getElementById('menuBtn');
    var nav = document.getElementById('nav');
    if (!btn || !nav) return;
    var label = btn.querySelector('span');
    function set(open) {
      doc.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? '閉じる' : '目次';
    }
    btn.addEventListener('click', function () { set(!doc.classList.contains('nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 760) set(false); });
  }

  /* ---------- スマホの相談ボタン: 冒頭を過ぎたら出し、連絡先の欄では引っ込める ---------- */
  function bar() {
    var b = document.getElementById('bar');
    if (!b || !('IntersectionObserver' in window)) return;
    var top = document.querySelector('.hero, .page-hero');
    var contact = document.getElementById('contact');
    var atTop = false, atContact = false;   /* 冒頭でも隠さない */
    function up() { b.classList.toggle('hide', atTop || atContact); }
    if (contact) new IntersectionObserver(function (es) { atContact = es[0].isIntersecting; up(); }).observe(contact);
    up();
  }

  /* ---------- いま読んでいる節を、目次に示す ---------- */
  function spy() {
    var nav = document.getElementById('nav');
    if (!nav || !('IntersectionObserver' in window)) return;
    var links = {}, cur = null;
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var ids = Object.keys(links); if (!ids.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (cur) cur.removeAttribute('aria-current');
        cur = links[e.target.id]; if (cur) cur.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- コピー ---------- */
  function copyText(text, btn, done, idle) {
    function ok() { btn.textContent = done; setTimeout(function () { btn.textContent = idle; }, 2200); }
    function ng() { btn.textContent = 'コピーできませんでした'; setTimeout(function () { btn.textContent = idle; }, 2600); }
    /* 新しい方式が使えないブラウザ(アプリの中のブラウザなど)では、文字を選んでコピーする古い方式を試す */
    function old() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
        document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, text.length);
        var done2 = document.execCommand('copy');
        document.body.removeChild(ta);
        if (done2) ok(); else ng();
      } catch (e) { ng(); }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, old);
      else old();
    } catch (e) { old(); }
  }

  /* ---------- ご相談フォーム ----------
     入力を確かめ、受け口(data-endpoint)へ送る。メールは受け口の側で送られる。
     受け口が未設定のときや、通信の仕組みが無い古いブラウザでは、メールでの連絡を案内する。 */
  function askForm() {
    var form = document.getElementById('askForm');
    var done = document.getElementById('askDone');
    var msg = document.getElementById('askMsg');
    if (!form || !done || !msg) return null;
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var preview = endpoint === 'preview';   /* 確認用の表示: 入力の確認までを行い、送信はしない */
    var TO_MAIL = 'お手数ですが、下のメールアドレスへ直接ご連絡ください。';
    if (!window.fetch) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        msg.textContent = 'お使いのブラウザではフォームを送信できません。' + TO_MAIL; msg.className = 'form-msg ng';
      });
      return null;
    }

    var el = {
      company: document.getElementById('f-company'),
      name: document.getElementById('f-name'),
      email: document.getElementById('f-email'),
      message: document.getElementById('f-message'),
      website: form.querySelector('[name="hp-check"]')
    };
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.textContent;
    var shownAt = Date.now(), sending = false, token = '', topic = '', lastFill = '';

    function say(t, ng) { msg.textContent = t; msg.className = 'form-msg' + (ng ? ' ng' : ''); }
    function mark(key, text) {
      var e = document.getElementById('e-' + key);
      if (!e) return;
      if (text) { e.textContent = text; e.hidden = false; el[key].setAttribute('aria-invalid', 'true'); }
      else { e.textContent = ''; e.hidden = true; el[key].removeAttribute('aria-invalid'); }
    }
    /* メールアドレス: 全角で打たれた英数字や＠は半角に直し、空白を除く */
    function tidyEmail(v) {
      try { v = v.normalize('NFKC'); } catch (e) { /* 古いブラウザではそのまま */ }
      return v.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');   /* 前後の空白だけ除く(中の空白は誤りとして知らせる) */
    }
    /* よくある打ち間違い(末尾) */
    var TYPO = {
      'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
      'gmial.com': 'gmail.com', 'gnail.com': 'gmail.com', 'yahoo.co.j': 'yahoo.co.jp', 'yahoo.cojp': 'yahoo.co.jp', 'yahoo.co.jo': 'yahoo.co.jp',
      'icloud.con': 'icloud.com', 'outlook.con': 'outlook.com', 'hotmail.con': 'hotmail.com'
    };
    function emailError(email) {
      if (!email) return 'メールアドレスをご入力ください。';
      var ok = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/.test(email)
        && email.indexOf('..') < 0 && email.charAt(0) !== '.' && email.indexOf('.@') < 0 && email.length <= 254;
      if (!ok) return 'メールアドレスの形をご確認ください。(例: name@example.co.jp)';
      var dom = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
      if (TYPO[dom]) return 'メールアドレスの末尾をご確認ください。「' + TYPO[dom] + '」の入力間違いではありませんか。';
      return '';
    }
    function check() {
      var bad = [];
      el.email.value = tidyEmail(el.email.value);
      var name = el.name.value.trim(), email = el.email.value, message = el.message.value.trim();
      mark('name', name ? '' : 'お名前をご入力ください。'); if (!name) bad.push('name');
      var e1 = emailError(email);
      mark('email', e1); if (e1) bad.push('email');
      var e2 = message.length >= 5 ? '' : 'ご相談内容をご入力ください。一文でも大丈夫です。';
      mark('message', e2); if (e2) bad.push('message');
      return bad;
    }
    el.email.addEventListener('blur', function () {
      el.email.value = tidyEmail(el.email.value);
      if (el.email.value) mark('email', emailError(el.email.value));
    });
    ['name', 'email', 'message'].forEach(function (k) {
      el[k].addEventListener('input', function () { if (el[k].getAttribute('aria-invalid')) check(); });
    });
    function newToken() {
      try {
        var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a);
        return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      } catch (e) { return String(Date.now()) + String(Math.random()).slice(2, 10); }
    }
    function fail(text) {
      sending = false; btn.disabled = false; btn.textContent = label; form.removeAttribute('aria-busy');
      say(text || '送信できませんでした。通信の状態をご確認のうえ、もう一度「' + label + '」を押してください。入力内容は残っています。うまくいかない場合は、下のメールアドレスへ直接ご連絡ください。', true);
    }

    /* 入力中は、スマホの下の固定ボタンを引っ込める(入力欄や送信ボタンと重ならないように) */
    form.addEventListener('focusin', function () { document.documentElement.classList.add('typing'); });
    form.addEventListener('focusout', function () {
      setTimeout(function () { if (!form.contains(document.activeElement)) document.documentElement.classList.remove('typing'); }, 0);
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (sending) return;                       /* 二重に送らない */
      say('');
      var bad = check();
      if (bad.length) {
        say('入力をご確認ください。', true);
        el[bad[0]].focus();
        return;
      }
      if (preview) { say('これは確認用の表示です。入力の確認までを行い、実際には送信しません。'); return; }
      if (!endpoint) { fail('送信先が設定されていないため、送れませんでした。' + TO_MAIL); return; }

      sending = true; btn.disabled = true; btn.textContent = '送信しています'; form.setAttribute('aria-busy', 'true');
      if (!token) token = newToken();            /* やり直しでも同じ番号を使い、受け口の側で重複を捨てる */
      var data = {
        company: el.company.value.trim(), name: el.name.value.trim(), email: el.email.value.trim(),
        message: el.message.value.trim(), topic: topic,
        website: el.website ? el.website.value : '', elapsed: Date.now() - shownAt, token: token
      };
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
      /* 文字として送る(事前の問い合わせ通信が要らず、受け口をそのまま呼べる) */
      fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data), redirect: 'follow', credentials: 'omit', signal: ctl ? ctl.signal : undefined
      }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (res) {
        clearTimeout(timer);
        if (res && res.ok === true) {
          sending = false; token = '';
          form.hidden = true; done.hidden = false;
          try { done.focus({ preventScroll: true }); } catch (e) { done.focus(); }
          done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
          return;
        }
        if (res && res.error === 'invalid' && res.fields) {
          for (var k in res.fields) if (el[k]) mark(k, res.fields[k]);
          fail('入力をご確認ください。');
        } else if (res && res.error === 'busy') {
          fail('ただいま送信が混み合っています。少し時間をおいて、もう一度お試しください。お急ぎの場合は、下のメールアドレスへ直接ご連絡ください。');
        } else fail();
      }).catch(function () { clearTimeout(timer); fail(); });
    });

    return {
      /* ご相談の例を選んだとき: 内容を入れて、フォームへ静かに移る */
      fill: function (text, subject) {
        topic = subject || '';
        var cur = el.message.value.trim();
        if (!cur || cur === lastFill) { el.message.value = text; lastFill = text; mark('message', ''); }
        /* 入力欄にはカーソルを移さない(スマホで、キーボードと自動入力の候補がいきなり開いてしまうため)。
           代わりに見出しへ移し、読み上げでも「フォームに来た」ことが伝わるようにする */
        var head = form.querySelector('.group-h');
        if (head) {
          head.setAttribute('tabindex', '-1');
          try { head.focus({ preventScroll: true }); } catch (e) { /* 古いブラウザでは移さない */ }
        }
        form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    };
  }

  /* ご相談の文例。画面の「ご相談の例」と同じ件数・同じ並び(直すときは、ここと index.html の両方) */
  var ASK = {
    jsox: {
      s: "ご相談：J-SOXの構築・運用の見直しについて",
      b: "J-SOXの構築・運用を見直したく、ご連絡しました。\n文書化や評価の作業に手間がかかっており、進め方を整理したいと考えています。\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    },
    close: {
      s: "ご相談：経理・決算業務の負荷の軽減について",
      b: "経理・決算の業務負荷を減らしたく、ご連絡しました。\n業務が特定の担当者に偏っており、決算のたびに作業が集中しています。\n\n現状の業務の流れを見ていただき、改善の余地についてご相談できれば幸いです。"
    },
    audit: {
      s: "ご相談：監査対応の資料収集の効率化について",
      b: "監査対応の資料収集を効率化したく、ご連絡しました。\n監査法人から依頼される資料の準備に時間がかかり、通常の業務を圧迫しています。\n\n資料の集め方や管理の方法について、ご相談できれば幸いです。"
    },
    m365: {
      s: "ご相談：ExcelやMicrosoft 365の活用について",
      b: "ExcelやMicrosoft 365を活用したく、ご連絡しました。\n手作業の集計や転記が多く、いまある環境のままで効率化できないかと考えています。\n\n現状の作業を見ていただき、できることをご相談できれば幸いです。"
    },
    ai: {
      s: "ご相談：AIの実務への導入について",
      b: "AIを実務に導入したく、ご連絡しました。\n具体的なツールは未定ですが、経理・バックオフィスの業務で、AIを使える場面を知りたいと考えています。\n\n現状の業務の流れを見ていただき、活用の可能性についてご相談できれば幸いです。"
    },
    ipo: {
      s: "ご相談：IPO準備の進め方について",
      b: "IPO準備の進め方を整理したく、ご連絡しました。\n上場準備のタスクが多く、何から手をつけるかの優先順位がつけられていません。\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    },
    cfo: {
      s: "ご相談：社外CFOについて",
      b: "社外CFOについてご相談したく、ご連絡しました。\n顧問税理士とは別に、経営・財務の視点から、継続して相談できる相手を探しています。\n\n一度、Web面談などで、お話を伺えれば幸いです。"
    },
    auditor: {
      s: "ご相談：社外監査役の候補について",
      b: "社外監査役の候補として、ご相談したく、ご連絡しました。\n会社の状況：（上場・上場準備、監査役会の構成、想定する時期など）\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    },
    director: {
      s: "ご相談：社外取締役の候補について",
      b: "社外取締役の候補として、ご相談したく、ご連絡しました。\n会社の状況：（上場・上場準備、機関設計、想定する時期など）\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    }
  };
  function contact() {
    var addr = document.getElementById('addr');
    var copy = document.getElementById('copyAddr');
    if (addr && copy) {
      copy.addEventListener('click', function () { copyText(addr.textContent.trim(), copy, 'コピーしました', 'アドレスをコピー'); });
    }

    /* ご相談の例: 押すと、その文例を「ご相談内容」に入れて、フォームへ移る */
    var asks = document.querySelectorAll('.asks button[data-ask]');
    var F = askForm();
    if (!asks.length || !F) return;

    /* 「就任のご相談」の案内(上の節)からは、社外役員の例の見出しへ */
    var jump = document.querySelectorAll('a[data-kind="director"]');
    for (var d = 0; d < jump.length; d++) {
      jump[d].addEventListener('click', function (ev) {
        var h = document.getElementById('asksBoard');
        if (!h) return;
        ev.preventDefault();
        h.setAttribute('tabindex', '-1');
        try { h.focus({ preventScroll: true }); } catch (e) { /* 古いブラウザでは移さない */ }
        h.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    }
    for (var i = 0; i < asks.length; i++) {
      asks[i].addEventListener('click', function () {
        var d = ASK[this.getAttribute('data-ask')];
        if (!d) return;
        for (var k = 0; k < asks.length; k++) asks[k].setAttribute('aria-pressed', 'false');
        this.setAttribute('aria-pressed', 'true');
        F.fill(d.b, d.s);
      });
    }
  }

  function start() { fan(); flow(); reveal(); menu(); bar(); spy(); contact(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
