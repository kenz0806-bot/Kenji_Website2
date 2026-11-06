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

  /* 画面が続けて描かれている(=人が見ている)ことを確かめる。確かめられたら fn を一度だけ呼ぶ */
  function whenLive(fn) {
    var last = 0, run = 0, done = false;
    function probe(ts) {
      if (done) return;
      run = (last && ts - last < 90) ? run + 1 : 0;
      last = ts;
      if (run < 2) { requestAnimationFrame(probe); return; }
      done = true; fn();
    }
    requestAnimationFrame(probe);
    return function cancel() { done = true; };
  }

  /* ---------- 冒頭の扇 ----------
     要(かなめ)の一点から骨が開き、スクロールすると一本の線にたたまれる。
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
    var open = 0, live = false, raf = 0, seen = true, px = 0, pxT = 0, snapAt = 0;

    function snapping() { return snapAt && performance.now() - snapAt < 420; }
    function target() {
      if (snapping()) return 0;   /* 要に触れると、扇がぱちんと閉じて、また開く */
      var p = Math.min(1, Math.max(0, (window.scrollY || 0) / (H * 0.5)));
      return 1 - p * p * (3 - 2 * p);
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

    function draw(now) {
      /* 開いたあとも、骨と縁がゆっくり波打ち続ける */
      var t = (live && !reduce) ? (now || performance.now()) / 1000 : 0;
      var amp = (live && !reduce) ? 0.012 * open : 0;
      var span = g.span * open * (1 + px * 0.05);
      var tips = [], i, j;
      for (i = 0; i < N; i++) {
        tips.push([
          g.a0 - span * (i / (N - 1)) + amp * 0.35 * Math.sin(t * 0.45 + i * 0.5),
          1 + amp * (Math.sin(t * 0.55 - i * 0.42) + 0.5 * Math.sin(t * 0.33 + i * 0.9))
        ]);
      }
      ctx.clearRect(0, 0, W, H);
      if (span > 0.004) {
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(26,34,56,.24)';
        [1, 0.34].forEach(function (f) {
          ctx.beginPath();
          for (j = 0; j < N; j++) {
            var r = g.R * f * (f === 1 ? tips[j][1] : 1 + (tips[j][1] - 1) * 0.4);
            var x = g.x + Math.cos(tips[j][0]) * r, y = g.y + Math.sin(tips[j][0]) * r;
            if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        });
      }
      for (i = 0; i < N; i++) {
        var lead = i === N - 1, strong = i % 6 === 0;
        var len = (lead ? 1.06 : 1) * g.R * tips[i][1];
        ctx.beginPath(); ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x + Math.cos(tips[i][0]) * len, g.y + Math.sin(tips[i][0]) * len);
        ctx.lineWidth = lead ? 1.5 : (strong ? 1 : 0.7);
        ctx.strokeStyle = lead ? AI : 'rgba(26,34,56,' + (strong ? 0.36 : 0.17) + ')';
        ctx.stroke();
      }
      /* 要: 藍の点と、閉じきらない円 */
      ctx.fillStyle = AI; ctx.beginPath(); ctx.arc(g.x, g.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = AI; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(g.x, g.y, 19, -0.22 * Math.PI, 1.66 * Math.PI); ctx.stroke();
    }

    function loop(now) {
      raf = 0;
      open += (target() - open) * (snapping() ? 0.18 : 0.055); px += (pxT - px) * 0.08;
      draw(now);
      if (seen && !document.hidden) raf = requestAnimationFrame(loop);
    }
    function kick() { if (live && !raf && seen) raf = requestAnimationFrame(loop); }

    size();
    if (reduce) { open = 1; draw(); }
    else {
      var cancel = whenLive(function () { live = true; open = 0; kick(); });
      setTimeout(function () { if (!live) { cancel(); open = 1; draw(); } }, 1400);
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
    hero.addEventListener('pointerdown', function (e) {
      if (!live) return;
      var r = hero.getBoundingClientRect(), dx = e.clientX - r.left - g.x, dy = e.clientY - r.top - g.y;
      if (dx * dx + dy * dy < 46 * 46) { snapAt = performance.now(); kick(); }
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; kick(); }).observe(hero);
    }
  }

  /* ---------- ページの終わりを流れる線 ---------- */
  function flow() {
    var cv = document.getElementById('flow');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var AI = (getComputedStyle(doc).getPropertyValue('--ai') || '').trim() || '#0a4ea0';
    var N = 14, W = 0, H = 0, raf = 0, seen = false, live = false;

    function draw(now) {
      var t = live ? now / 1600 : 5;
      var amp = H * 0.15, key = N >> 1;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < N; i++) {
        var u = i / (N - 1) - 0.5, base = H * 0.5 + u * H * 0.36;
        ctx.beginPath();
        for (var x = -12; x <= W + 12; x += 12) {
          var env = 0.6 + 0.4 * Math.sin(x * 0.0021 + t * 0.13 + 1.3);
          var y = base + amp * env * (
            0.58 * Math.sin(x * 0.0043 + t * 0.5 + i * 0.2) +
            0.27 * Math.sin(x * 0.0092 - t * 0.34 + i * 0.11) +
            0.3 * Math.sin(x * 0.0016 + t * 0.18 + i * 0.05));
          if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = i === key ? 1.2 : 0.8;
        ctx.strokeStyle = i === key ? AI : 'rgba(26,34,56,' + (0.12 + 0.2 * (1 - Math.abs(u) * 2)).toFixed(3) + ')';
        ctx.stroke();
      }
    }
    function size() {
      var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
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
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; kick(); }).observe(cv);
    } else { seen = true; }
  }

  /* ---------- 冒頭の文字と、各節の罫線 ---------- */
  function reveal() {
    if (reduce) return;
    whenLive(function () {
      if (!doc.classList.contains('pre')) return;   /* 時間切れで外れていたら、演出なしのまま */
      doc.classList.remove('pre');
      doc.classList.add('go');
      settle(document.querySelector('.hero, .page-hero'), 5200);
      sections();
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
    try { navigator.clipboard.writeText(text).then(ok, ng); } catch (e) { ng(); }
  }

  function contact() {
    var addr = document.getElementById('addr');
    var copy = document.getElementById('copyAddr');
    if (addr && copy) {
      copy.addEventListener('click', function () { copyText(addr.textContent.trim(), copy, 'コピーしました', 'アドレスをコピー'); });
    }

    var tabs = document.querySelectorAll('[data-draft]');
    var subj = document.getElementById('draftSubject');
    var body = document.getElementById('draftBody');
    var copyDraft = document.getElementById('copyDraft');
    if (!tabs.length || !subj || !body || !copyDraft) return;

    var T = {
      cfo: {
        s: '社外CFO・経営相談のご依頼',
        b: 'はじめまして。【会社名】の【氏名】と申します。\n\n事業拡大に伴い、数字に基づいた経営判断や財務戦略について継続的に相談できるパートナーを探しております。\n現在の顧問税理士とは別に、より経営・財務の視点からのアドバイスを求めており、貴事務所の社外CFOサービスに関心を持ちました。\n\n一度、Web面談等で貴事務所のサービス詳細についてお伺いできれば幸いです。'
      },
      ipo: {
        s: 'J-SOX（内部統制）構築のご相談',
        b: 'はじめまして。【会社名】の【氏名】と申します。\n\n現在、IPOによる上場を目指して準備を進めておりますが、J-SOX対応の文書化やフロー整備が遅れており、監査法人からも指摘を受けている状況です。\n専門的な知見を持つリソースが不足しているため、最短距離でクリアするためのロードマップ策定と実務支援をお願いできないでしょうか。\n\n一度、詳細をご相談させていただきたく存じます。'
      },
      ai: {
        s: 'AI活用および業務効率化のご相談',
        b: 'はじめまして。【会社名】の【氏名】と申します。\n\n貴事務所のWebサイトを拝見し、AIを活用した経理業務の効率化に興味を持ちご連絡いたしました。\n現在、経理・バックオフィス業務が属人化しており、非効率なフローが課題となっております。\n具体的なツール導入等は未定ですが、現状の業務フローを診断いただき、改善の余地やAI活用の可能性についてご提案いただけないでしょうか。'
      }
    };

    function show(k) {
      var d = T[k]; if (!d) return;
      subj.textContent = d.s; body.textContent = d.b;
      for (var i = 0; i < tabs.length; i++) tabs[i].setAttribute('aria-pressed', tabs[i].getAttribute('data-draft') === k ? 'true' : 'false');
    }
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () { show(this.getAttribute('data-draft')); });
    }
    copyDraft.addEventListener('click', function () {
      copyText('件名：' + subj.textContent + '\n\n' + body.textContent, copyDraft, 'コピーしました', '文面をコピー');
    });
    show('cfo');
  }

  function start() { fan(); flow(); reveal(); menu(); bar(); spy(); contact(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
