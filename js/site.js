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

  /* 静かに動き出し、静かに止まる(0〜1)。ページの終わりの波が、触れたあとのうねりの計算に使う。
     次元の図形(dim.js)にも同じ名前の関数があるが、あちらは引数が3つの別物。ここから消さないこと */
  function ss(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * x * (x * (x * 6 - 15) + 10); }

  /* ---------- ページの終わりを流れる線 ----------
     波の中を、藍の一本が通っている。藍の一本は、いちばん素直な波だけでできている。
     ほかの線は、それに細かな揺れと、線ごとのずれが足されている。
     触れると、そこからうねりが左右へ渡り、通ったあとの線は藍の一本にそろう。しばらくして、また波に戻る。 */
  function flow() {
    var cv = document.getElementById('flow');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    /* 色は、この絵が置かれた場所の指定に従う(墨の地では明るい線になる) */
    var CS = getComputedStyle(cv), AI = (CS.getPropertyValue('--ai') || '').trim() || '#0a4ea0', LINE = (CS.getPropertyValue('--flow-line') || '').trim() || '26,34,56';
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
        ctx.strokeStyle = i === KEY ? AI : 'rgba(' + LINE + ',' + (0.12 + 0.2 * (1 - Math.abs(u) * 2)).toFixed(3) + ')';
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
      }
      if (!doc.classList.contains('card') || !document.querySelector('.mc')) { go(); return; }

      /* 名刺の挨拶: 点が転がってきて、丸い窓に開き、ご本人が現れる → 窓が点に閉じ、線が立ち、名刺になる → 小さくお辞儀 → 「はじめまして。」 → 言葉は退き、名刺は残って、サイトが始まる。
         触れる・スクロールする・キーを押すと、待たずに先へ進む */
      var left = false, evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
      function leave() {
        if (left) return; left = true;
        clearTimeout(timer);
        evs.forEach(function (ev) { window.removeEventListener(ev, leave); });
        doc.classList.add('met');
        setTimeout(go, 420);
        setTimeout(function () { doc.classList.remove('card'); doc.classList.remove('meet'); doc.classList.remove('met'); }, 1300);
      }
      doc.classList.add('greeted');   /* 挨拶をした印。名刺を、あとからもう一度登場させないため */
      window.__ksMeet = performance.now();   /* 挨拶の始まりの時刻(冒頭の図形 dim.js が、同じ時計で動くため) */
      doc.classList.add('meet');
      try { if (!/[?&]card=1/.test(location.search)) sessionStorage.setItem('ks-met', '1'); } catch (e) { /* 記録できなくても続ける */ }
      /* 確認用の指定: ?cardms=4600 で「はじめまして。」のあとの間を変える */
      var ms = doc.classList.contains('o7') ? 7800 : 6300, qp = /[?&]cardms=(\d{3,5})/.exec(location.search);   /* 点が構造になり、球になって、ご本人になる挨拶(o7)は、1.5秒長い */
      if (qp) ms = +qp[1];
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
      b: "J-SOXの構築・運用を見直したく、ご連絡しました。\n文書化や評価の進め方について、あらためて整理したいと考えています。\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    },
    fraud: {
      s: "ご相談：不正の調査と再発防止について",
      b: "不正の調査と再発防止について、ご連絡しました。\n事実関係の確認と、今後の進め方について、ご相談したいと考えています。\n\n一度、状況をお伝えしたうえで、ご相談できれば幸いです。"
    },
    close: {
      s: "ご相談：経理・決算業務の負荷の軽減について",
      b: "経理・決算の業務負荷を減らしたく、ご連絡しました。\n決算期に業務が重なりやすく、進め方を見直したいと考えています。\n\n現状の業務の流れを見ていただき、改善の余地についてご相談できれば幸いです。"
    },
    audit: {
      s: "ご相談：監査対応の資料収集の効率化について",
      b: "監査対応の資料収集を効率化したく、ご連絡しました。\n監査法人からのご依頼資料について、準備の進め方を見直したいと考えています。\n\n資料の集め方や管理の方法について、ご相談できれば幸いです。"
    },
    m365: {
      s: "ご相談：ExcelやMicrosoft 365の活用について",
      b: "ExcelやMicrosoft 365を活用したく、ご連絡しました。\n集計や転記の作業について、いまある環境を活かして効率化できないかと考えています。\n\n現状の作業を見ていただき、できることをご相談できれば幸いです。"
    },
    ai: {
      s: "ご相談：AIの実務への導入について",
      b: "AIを実務に導入したく、ご連絡しました。\n具体的なツールは未定ですが、経理・バックオフィスの業務で、AIを使える場面を知りたいと考えています。\n\n現状の業務の流れを見ていただき、活用の可能性についてご相談できれば幸いです。"
    },
    ipo: {
      s: "ご相談：IPO準備の進め方について",
      b: "IPO準備の進め方を整理したく、ご連絡しました。\n上場準備の課題について、優先順位と進め方を整理したいと考えています。\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
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

  /* ページを移るとき、触れた場所を次のページへ渡す(次のページが、そこから丸く開く)。キーボードで選んだときは、その項目のまん中 */
  function handoff() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null, r, x, y;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin || (a.pathname === location.pathname && a.hash)) return;
      r = a.getBoundingClientRect();
      x = e.clientX || r.left + r.width / 2; y = e.clientY || r.top + r.height / 2;
      try { sessionStorage.setItem('ks-vt', (x / window.innerWidth * 100).toFixed(1) + ',' + (y / window.innerHeight * 100).toFixed(1)); } catch (err) { /* 渡せなくても、まん中から開く */ }
    }, true);
  }

  /* ボタンに触れた位置を覚える(そこから、丸く色が開く。マウスのときだけ) */
  function iris() {
    document.addEventListener('pointerover', function (e) {
      var b = e.pointerType !== 'touch' && e.target && e.target.closest ? e.target.closest('.btn, .nav .ask') : null, r;
      if (!b) return;
      r = b.getBoundingClientRect(); if (!r.width || !r.height) return;
      b.style.setProperty('--px', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      b.style.setProperty('--py', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, true);
  }
  function start() { flow(); reveal(); menu(); bar(); spy(); contact(); handoff(); iris(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
