/* 佐藤健司公認会計士事務所 — ご相談の例・ご相談フォーム・アドレスのコピー(リデザインの試作 版2。いまの本番の動きをそのまま使う)
   いまの本番サイトの動きを、そのまま使う。この下は、本番の js/site.js から機械的に取り出したもの。
   試作では、フォームの送り先を「確認用の表示」にしてある(入力の確認までを行い、送信しない)。 */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      fill: function (text, subject, quiet) {
        topic = subject || '';
        var cur = el.message.value.trim();
        if (!cur || cur === lastFill) { el.message.value = text; lastFill = text; mark('message', ''); }
        /* 入力欄にはカーソルを移さない(スマホで、キーボードと自動入力の候補がいきなり開いてしまうため)。
           代わりに見出しへ移し、読み上げでも「フォームに来た」ことが伝わるようにする */
        if (quiet) return;
        var head = document.getElementById('form');
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
      s: "ご相談：ExcelやMicrosoft 365、Google Workspaceの活用について",
      b: "ExcelやMicrosoft 365、Google Workspaceを活用したく、ご連絡しました。\n集計や転記の作業について、いまある環境を活かして効率化できないかと考えています。\n\n現状の作業を見ていただき、できることをご相談できれば幸いです。"
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
    lease: {
      s: "ご相談：新リース会計基準の導入について",
      b: "新リース会計基準の導入について、ご相談したく、ご連絡しました。\n対象となる契約の洗い出しや、影響の見積りの進め方を整理したいと考えています。\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    },
    ddppa: {
      s: "ご相談：M&Aの財務調査（DD）・PPAについて",
      b: "M&Aの財務調査（DD）またはPPAについて、ご相談したく、ご連絡しました。\n対象の会社や時期などは、あらためてお伝えします。\n\n一度、状況をお伝えしたうえで、ご相談できれば幸いです。"
    },
    cost: {
      s: "ご相談：原価計算・管理会計について",
      b: "原価計算・管理会計について、ご相談したく、ご連絡しました。\n製品や事業ごとの採算を、より正しくつかめる仕組みにしたいと考えています。\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    },
    rules: {
      s: "ご相談：社内規程の作成について",
      b: "社内規程の作成について、ご相談したく、ご連絡しました。\n上場準備などに向けて、必要な規程を整えたいと考えています。\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
    },
    auditor: {
      s: "ご相談：社外監査役の候補について",
      b: "社外監査役の候補として、ご相談したく、ご連絡しました。\n会社の状況：（上場・上場準備、監査役会の構成、想定する時期など）\n\n一度、現状をお伝えしたうえで、ご相談できれば幸いです。"
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

    /* 「就任のご相談」の案内(上の節)からは、社外監査役の例の見出しへ */
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
    /* 別のページから「contact.html#ask-xxx」で来たときは、その文例を入れておく(フォームへは移らない: 先に事実と文例を読めるように) */
    var m = (location.hash || '').match(/^#ask-(\w+)$/);
    if (m && ASK[m[1]]) {
      var b0 = document.getElementById('ask-' + m[1]);
      if (b0) { b0.setAttribute('aria-pressed', 'true'); F.fill(ASK[m[1]].b, ASK[m[1]].s, true); }
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

  contact();
})();
