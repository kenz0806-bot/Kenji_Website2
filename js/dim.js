/* 冒頭の名刺と、原則の「次元の形」を動かす。
   ・冒頭: 名刺が、要の点の上に一点で立ち、ゆっくり揺れる。指やマウスのほうを向く。スクロールには、揺れで応える。
     何もしなくても、自分で演じる(映画のように): ルーペが名刺の中を巡る → くるりと一回転 → 裏(中身の全体)を見せる → お辞儀 → くり返し。
     名刺の中身は、ご本人の顔(青写真の色調)と仕掛け(歯車、めぐる点)。指やマウスの近くだけ、丸いルーペ(拡大、目盛り、位置の数字つき)を通して見える。
   ・原則: ページを一緒に下りてきた藍の点が、線を離れて舞台に入り、線 → 面 → 立体 → 4次元 と開いて構造になる(Key Structure)。
     そのあと、点そのものがふくらんで球になり(Keep it Simple)、また点に戻って、線へ帰る。
     もとになる形は4次元の立方体(頂点16・辺32)。3D用の部品は使わず、平面に写して描く。
     画面に入ると自分で動き、見えているあいだ、ゆっくり繰り返す。画面は留めない。スクロールにも手を加えない。
   動きを減らす設定では、どちらも動かさずに見せる。 */
(function () {
  'use strict';
  if (!window.requestAnimationFrame) return;
  var doc = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 確認用: ?dim=0.6 のように、ひとめぐりの中の位置(0〜1)を指定すると、原則の場面をその瞬間で止めて見られる */
  var fz = /[?&]dim=([\d.]+)/.exec(location.search), FZ = fz ? Math.min(1, +fz[1]) : -1;

  /* ---- 形の定義: 頂点は (±1, ±1, ±1, ±1) の4つ組(16個)。辺は、座標が一つだけ違う頂点どうし(32本) ---- */
  var N = 4, NV = 1 << N, V = [], E = [], i, j, k, v;
  for (i = 0; i < NV; i++) { v = []; for (k = 0; k < N; k++) v.push(i >> k & 1 ? 1 : -1); V.push(v); }
  for (i = 0; i < NV; i++) for (k = 0; k < N; k++) { j = i ^ (1 << k); if (i < j) E.push([i, j, k]); }
  function points() { var p = []; for (var n = 0; n < NV; n++) p.push({ x: 0, y: 0, d: 0, gx: 0, gy: 0 }); return p; }
  function ss(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  /* 静かに動きだし、静かに止まる(0〜1) */
  function sm(u) { u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * u * (u * (6 * u - 15) + 10); }
  /* 勢いよく開き、少し行きすぎてから納まる(0〜1。途中で約1.05まで) */
  function pop(x) { var u = x - 1; return 1 + 2.2 * u * u * u + 1.2 * u * u; }
  function rot(t, a, b, ang) { var c = Math.cos(ang), s = Math.sin(ang), x = t[a], y = t[b]; t[a] = x * c - y * s; t[b] = x * s + y * c; }
  var tN = [0, 0, 0, 0];
  /* 回す面(軸の組)。はじめの2つは、向き(左右・上下)。あとの2つは、4つ目の軸を見える向きへ傾けるためのもの */
  var ROT = [[0, 2], [1, 2], [0, 3], [1, 3]];
  /* 4次元を3次元へ写すときの遠近の強さと、奥行きへの効き具合(軸の番号で引く) */
  var PER = [0, 0, 0, .32], DEP = [0, 0, 0, .22];
  /* 線の太さと濃さ。もとの立体(はじめの3本)を主役に、4本目は少し細く淡く */
  var AXW = [1.3, 1.3, 1.3, 1.08], AXA = [1, 1, 1, .9];
  /* 奥行きの層(奥から手前へ7つ)と、手前の線のまわりを抜く幅 */
  var LAY = 7, HALO = [0, .5, .9, 1.3, 1.7, 2, 2.3], lay = [];
  for (i = 0; i < LAY; i++) { lay.push([]); for (k = 0; k < N; k++) lay[i].push([]); }
  var KR = 3.6, KEY = '#8fb9f2';                /* 藍の点の半径と色(墨の地の上) */

  /* 形を平面に写す。s: 4本の軸の開き具合 / an: 回す角度(ROT の順) / cx, cy, rad: 置く場所と大きさ / floor: 床までの距離
     あわせて、真上からの光で床に落ちる影(平面図)の位置も求める */
  function project(P, s, an, cx, cy, rad, floor) {
    var nrm = 0, f, x, y, z, d, n, q, g, t = tN, uc = Math.cos(an[1]), us = Math.sin(an[1]);
    for (q = 0; q < N; q++) nrm += s[q] * s[q];
    nrm = Math.sqrt(nrm); if (nrm < 1) nrm = 1;
    for (n = 0; n < NV; n++) {
      for (q = 0; q < N; q++) t[q] = V[n][q] * s[q] / nrm;
      for (q = 0; q < ROT.length; q++) if (an[q]) rot(t, ROT[q][0], ROT[q][1], an[q]);
      d = 0;
      for (q = N - 1; q > 2; q--) { d += t[q] * DEP[q]; f = 1 / (1 - t[q] * PER[q]); for (g = 0; g < q; g++) t[g] *= f; }   /* 4次元 → 3次元 */
      x = t[0]; y = t[1]; z = t[2];
      f = 1 / (1 - z * .2);                                                                                         /* 3次元 → 平面 */
      P[n].x = cx + x * f * rad; P[n].y = cy - y * f * rad; P[n].d = z * .62 + d;
      g = y * uc + z * us + floor; y -= g * uc; z -= g * us;                                                          /* 床へまっすぐ下ろす */
      f = 1 / (1 - z * .2);
      P[n].gx = cx + x * f * rad; P[n].gy = cy - y * f * rad;
    }
  }
  /* 線の形を描く(画面は消さない。藍の点は別に描く)。奥行きを伝える手がかりを重ねる:
     ・奥の線は細く淡く、手前は太く濃く  ・手前の線のまわりを細く抜き、奥の線が後ろを通って見えるようにする(同じ層の線どうしは抜かない)
     ・床に、形の影(平面図)を落とす  ・開いたばかりの軸は、藍に光ってから落ち着く
     act: 軸ごとの「開いている最中」の度合い(0〜1) / q: 画質(2 = すべて, 1 = 床の影を省く, 0 = 抜きも省く) / fade: 全体の濃さ(球に替わるとき、淡くなる) */
  function paint(ctx, P, s, act, q, fade) {
    var n, k, e, A, B, al, d, L, hw, arr, solid = Math.min(1, s[2]), any, r, g, b, t;
    if (fade < .004) return;
    ctx.lineCap = 'round';
    /* 床の影 */
    if (q > 1 && solid > .02) {
      ctx.beginPath();
      for (n = 0; n < E.length; n++) { e = E[n]; if (s[e[2]] < .02) continue; A = P[e[0]]; B = P[e[1]]; ctx.moveTo(A.gx, A.gy); ctx.lineTo(B.gx, B.gy); }
      ctx.strokeStyle = 'rgba(143,185,242,' + (.15 * solid * fade).toFixed(3) + ')'; ctx.lineWidth = .8; ctx.stroke();
    }
    /* 辺を、奥行きの層と軸に分ける */
    for (L = 0; L < LAY; L++) for (k = 0; k < N; k++) lay[L][k].length = 0;
    for (n = 0; n < E.length; n++) {
      e = E[n]; if (s[e[2]] < .004) continue;
      d = (P[e[0]].d + P[e[1]].d) * .5;
      L = Math.floor((d + .86) / 1.72 * LAY); L = L < 0 ? 0 : L >= LAY ? LAY - 1 : L;
      lay[L][e[2]].push(e);
    }
    for (L = 0; L < LAY; L++) {
      d = L / (LAY - 1);
      hw = q > 0 ? HALO[L] * solid : 0;
      if (hw > .2) {
        any = false; ctx.beginPath();
        for (k = 0; k < N; k++) { arr = lay[L][k]; for (n = 0; n < arr.length; n++) { e = arr[n]; A = P[e[0]]; B = P[e[1]]; ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); any = true; } }
        if (any) { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = fade; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2 + hw * 2; ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      for (k = 0; k < N; k++) {
        arr = lay[L][k]; if (!arr.length) continue;
        t = act[k];
        al = (.2 + .74 * d) * AXA[k] * Math.min(1, s[k] * 4) * (1 + t * .8); if (al > 1) al = 1; al *= fade;
        r = Math.round(214 - 64 * t); g = Math.round(228 - 30 * t); b = Math.round(247 + 8 * t);
        ctx.beginPath();
        for (n = 0; n < arr.length; n++) { e = arr[n]; A = P[e[0]]; B = P[e[1]]; ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
        if (q > 0 && (t > .05 || L >= LAY - 2)) {   /* 開いたばかりの線と、いちばん手前の線に、淡い光 */
          ctx.strokeStyle = 'rgba(143,185,242,' + (al * (.1 + .22 * t)).toFixed(3) + ')'; ctx.lineWidth = AXW[k] * (4 + 3 * t); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + al.toFixed(3) + ')';
        ctx.lineWidth = AXW[k] * (.74 + .56 * d) * (1 + t * .3);
        ctx.stroke();
      }
    }
    /* 頂点。奥は小さく淡く */
    for (L = 0; L < 3; L++) {
      ctx.beginPath(); any = false;
      for (n = 1; n < NV; n++) {
        d = P[n].d; k = d < -.2 ? 0 : d < .2 ? 1 : 2; if (k !== L) continue;
        r = 1.2 + .55 * L; ctx.moveTo(P[n].x + r, P[n].y); ctx.arc(P[n].x, P[n].y, r, 0, 6.2832); any = true;
      }
      if (any) { ctx.fillStyle = 'rgba(238,243,249,' + ((.5 + .22 * L) * fade).toFixed(3) + ')'; ctx.fill(); }
    }
  }
  /* 藍の点(平らな丸)。最初の一点であり、最後に残る点でもある */
  function dot(ctx, x, y, r, a) {
    if (a < .004) return;
    ctx.globalAlpha = a > 1 ? 1 : a; ctx.fillStyle = KEY;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
  }

  /* ---- 球: 藍の点がふくらんだ姿 ----
     面の上に、点をほぼ等しい間隔で並べる(ひまわりの種と同じ並び)。光の当たる側の点は大きく明るく、陰の側は小さく淡く描く。
     縁に近い点は、薄くつぶれて見える(丸い面に乗っているため)。胴には、光の側から陰の側へ淡いぼかし。縁には細い光。裏側の点は描かない */
  var BK = .2, BF = Math.sqrt(1 - BK * BK);          /* 遠近の強さと、輪郭がちょうど半径に来るための係数 */
  var LX = -.46, LY = .62, LZ = .64, BG = 5, bx = [], lats = {};
  i = Math.sqrt(LX * LX + LY * LY + LZ * LZ); LX /= i; LY /= i; LZ /= i;
  for (k = 0; k < BG; k++) bx.push([]);
  function lattice(n) {
    if (lats[n]) return lats[n];
    var a = new Float32Array(n * 3), m, y, r, ph;
    for (m = 0; m < n; m++) { y = 1 - 2 * (m + .5) / n; r = Math.sqrt(1 - y * y); ph = m * 2.399963; a[m * 3] = Math.cos(ph) * r; a[m * 3 + 1] = y; a[m * 3 + 2] = Math.sin(ph) * r; }
    lats[n] = a; return a;
  }
  /* 胴と縁の光。a: 濃さ */
  function body(ctx, cx, cy, R, a) {
    var g;
    if (a < .004 || R < .5) return;
    g = ctx.createRadialGradient(cx - R * .36, cy - R * .42, R * .04, cx - R * .1, cy - R * .12, R * 1.12);
    g.addColorStop(0, 'rgba(206,224,248,' + (.6 * a).toFixed(3) + ')'); g.addColorStop(.42, 'rgba(143,185,242,' + (.25 * a).toFixed(3) + ')');
    g.addColorStop(.82, 'rgba(70,110,190,' + (.075 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(60,96,170,' + (.12 * a).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();
    if (R < 6) return;
    g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    g.addColorStop(0, 'rgba(214,228,247,' + (.7 * a).toFixed(3) + ')'); g.addColorStop(.5, 'rgba(143,185,242,' + (.22 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(143,185,242,' + (.1 * a).toFixed(3) + ')');
    ctx.strokeStyle = g; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(cx, cy, R - .45, 0, 6.2832); ctx.stroke();
  }
  /* 球を描く。B, n: 点の並びと数 / sz: 点の間隔(いまの半径での) / yaw, pit: 向き / a: 胴の濃さ / dk: 点の濃さ / step: 2 なら点を半分に(重い端末) */
  function ball(ctx, cx, cy, R, B, n, sz, yaw, pit, a, dk, step) {
    var m, x, y, z, t, l, r, f, q, u, arr, sq, an, c1 = Math.cos(yaw), s1 = Math.sin(yaw), c2 = Math.cos(pit), s2 = Math.sin(pit), rk = step > 1 ? 1.3 : 1;
    body(ctx, cx, cy, R, a);
    if (dk < .01) return;
    for (q = 0; q < BG; q++) bx[q].length = 0;
    for (m = 0; m < n; m += step) {
      x = B[m * 3]; y = B[m * 3 + 1]; z = B[m * 3 + 2];
      t = x * c1 - z * s1; z = x * s1 + z * c1; x = t;
      t = y * c2 - z * s2; z = y * s2 + z * c2; y = t;
      if (z < .02) continue;
      l = x * LX + y * LY + z * LZ; if (l < 0) l = 0;
      f = BF / (1 - z * BK);
      q = Math.floor(l * BG); if (q >= BG) q = BG - 1;
      bx[q].push(cx + x * R * f, cy - y * R * f, sz * (.1 + .29 * Math.pow(l, .9)) * rk, z, Math.atan2(-y, x));
    }
    for (q = 0; q < BG; q++) {
      arr = bx[q]; if (!arr.length) continue; u = (q + .5) / BG;
      ctx.fillStyle = 'rgba(' + Math.round(150 + 80 * u) + ',' + Math.round(190 + 46 * u) + ',' + Math.round(242 + 6 * u) + ',' + ((.3 + .66 * u) * dk).toFixed(3) + ')';
      ctx.beginPath();
      for (m = 0; m < arr.length; m += 5) {
        r = arr[m + 2]; sq = .28 + .72 * arr[m + 3]; an = arr[m + 4];
        ctx.moveTo(arr[m] - Math.sin(an) * r, arr[m + 1] + Math.cos(an) * r);
        ctx.ellipse(arr[m], arr[m + 1], r * sq, r, an, 1.5708, 7.854);
      }
      ctx.fill();
    }
  }
  /* 球が床に落とす影(やわらかな楕円)と、平面図の輪 */
  function ballFloor(ctx, cx, cy, R, rad, pit, floor, a) {
    var us = Math.sin(pit), f = 1 / (1 + floor * us * BK), y = cy + floor * Math.cos(pit) * f * rad, rx = R * f * 1.12, ry = Math.max(1, R * us * f * 1.12), g;
    if (a < .004 || R < 1) return;
    ctx.save(); ctx.translate(cx, y); ctx.scale(1, ry / rx);
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(6,10,22,' + (.5 * a).toFixed(3) + ')'); g.addColorStop(.6, 'rgba(6,10,22,' + (.2 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(6,10,22,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(143,185,242,' + (.15 * a).toFixed(3) + ')'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.ellipse(cx, y, R * f, Math.max(.5, R * us * f), 0, 0, 6.2832); ctx.stroke();
  }
  /* 点が、ページの線と図形のあいだを渡る。ゆるい弧を描き、短い尾を引く(目で追えるように)。e: 進み具合(0〜1) */
  function cross(ctx, W, H, x0, y0, x1, y1, e) {
    var mx = (x0 + x1) / 2, my = Math.min(y0, y1) - Math.min(120, Math.abs(x1 - x0) * .16 + 24), n, u, a, lx, ly, qx, qy, v;
    function at(q) { v = 1 - q; qx = v * v * x0 + 2 * v * q * mx + q * q * x1; qy = v * v * y0 + 2 * v * q * my + q * q * y1; }
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round'; ctx.lineWidth = 1.2;
    at(Math.max(0, e - .2)); lx = qx; ly = qy;
    for (n = 1; n <= 8; n++) {
      u = Math.max(0, e - .2 + .2 * n / 8); at(u); a = .5 * n / 8 * Math.sin(Math.PI * e);
      ctx.strokeStyle = 'rgba(143,185,242,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(qx, qy); ctx.stroke(); lx = qx; ly = qy;
    }
    at(e); dot(ctx, qx, qy, KR, 1);
  }
  /* ページの線の上の点の、いまの位置(描く面 cv の中の座標)。線が無ければ null */
  function lineAt(cv) {
    var th = window.__ksThread, q = th && th.at(), r;
    if (!q) return null;
    r = cv.getBoundingClientRect();
    return { x: q.x - r.left, y: q.y - r.top, run: q.run };
  }
  /* 線の上の点を借りる(on = true)、返す(false)。返すときに高さ y(画面の座標)を添えると、点はそこから線の上を走って追いつく */
  function lend(on, y) { var th = window.__ksThread; if (th) th.lend(on, y); }
  function fit(cv, ctx, box) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(box.width), h = Math.round(box.height);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h];
  }
  /* 画面に見えているあいだだけ動かす。gone: 画面から出たときに呼ぶ(省いてよい) */
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
    var hero = document.querySelector('.hero.hx');
    var card = hero && hero.querySelector('.mc-card'), shadow = hero && hero.querySelector('.mc-shadow');
    if (!card) return;
    var hand = card.parentNode, plan = card.querySelector('.mc-plan'), read = card.querySelector('.mc-read'), btn = hero.querySelector('.hero-act .btn');
    var ret = card.querySelector('.mc-ret');
    var LR = 17, SPIN = 1150, FLIP = 700, HOLD = 2600, readTxt = '', i;
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
    var SHOW = ['tourA', 'spin', 'tourB', 'back', 'bow'], GAP = { tourA: 2200, spin: 2600, tourB: 2200, back: 2400, bow: 3400 };
    /* ルーペの道すじ: [時刻(ミリ秒), 横, 縦, 半径, 倍率, 顔を見せるか(0〜1)]。
       はじめは小さな点として名刺の端から滑ってきて、止まった所で大きな丸い窓に開き、ご本人を見せる。そのあと、ふつうの大きさに戻って中を巡る */
    var TOUR = {
      tourA: [[0, .03, .5, 2.2, 1.6, 0], [550, .29, .5, 2.2, 1.6, 1], [1050, .29, .5, 26, 2.2, 1], [2700, .29, .5, 26, 2.32, 1],
              [3200, .5, .47, 17, 1.6, 0], [3900, .5, .47, 17, 1.6, 0], [4450, .82, .4, 17, 1.6, 0], [5650, .81, .41, 17, 1.6, 0],
              [6200, .88, .79, 17, 1.6, 0], [7050, .88, .79, 17, 1.6, 0]],
      tourB: [[0, .1, .87, 17, 1.6, 0], [450, .12, .87, 17, 1.6, 0], [2300, .66, .87, 17, 1.6, 0], [2700, .66, .87, 17, 1.6, 0],
              [3250, .29, .5, 26, 2.2, 1], [4800, .29, .5, 26, 2.32, 1]]
    };
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
    if (!doc.classList.contains('pre') && !doc.classList.contains('go')) hand.classList.add('in');
    hand.addEventListener('animationend', function (ev) {
      if (ev.target !== hand) return;
      if (ev.animationName === 'present') hand.classList.add('in');        /* 出そろった */
      else if (ev.animationName === 'nod') hand.classList.remove('nod');
    });
  })();

  /* ================= 冒頭の挨拶: 点が、構造になり、球になって、ご本人になる =================
     要の点の上に、形が一点で立つ。軸が一本ずつ弾んで開き(線 → 面 → 立体 → 4次元)、回りながら育つ。
     4本そろうと、点そのものがふくらんで、構造をのみこみ、球になる(原則の場面と同じ球)。球は回りながら止まり、
     平らにほどけて、ご本人の顔になる(球の点が、写真の明るさを点の大きさに置き換えた点描に並び直る)。
     そのあと写真の丸い窓に替わり(CSS)、窓は点に閉じて、同じ点から名刺が立つ。3D用の部品は使わない。
     確認用: ?open=iris で以前の挨拶。?card=1&cardms=99999&o7t=1.6 で、挨拶を1.6秒目で止める */
  (function () {
    var mc = document.querySelector('.mc'), me = mc && mc.querySelector('.mc-me'), img = me && me.querySelector('img'), keyEl = mc && mc.querySelector('.mc-key');
    if (!doc.classList.contains('o7')) return;
    var cv = document.createElement('canvas'), ctx = cv.getContext ? cv.getContext('2d') : null;
    if (!mc || !img || !ctx || reduce || !doc.classList.contains('card')) { doc.classList.remove('o7'); return; }   /* 描けないときは、以前の挨拶で */
    cv.className = 'mc-cv'; cv.setAttribute('aria-hidden', 'true');
    mc.insertBefore(cv, me.nextSibling);
    var fq = /[?&]o7t=([\d.]+)/.exec(location.search), FT = fq ? +fq[1] : -1;
    /* 形は、4本の軸を、点から上へ等しい角度でひろげたもの(4次元の立方体を、角を下にして立体に写した姿) */
    var TH = 54.74 * Math.PI / 180, ST = Math.sin(TH), CT = Math.cos(TH), ORD = [0, 2, 1, 3], ca = [0, 0, 0, 0], sa = [0, 0, 0, 0], PIT = .3;
    /* 時刻(秒。挨拶の始まりから): 点が着く .75 → 軸が .16秒おきに開く → 1.5 から球へふくらむ → 2.12 で球 → 回りながら止まり、
       2.3 から顔へほどける → 2.76 で顔 → 写真に替わりながら消える */
    var T0 = .75, STEP = .16, DUR = .34, T_M = 1.5, T_S = 2.12, T_Z = 2.46, T_K = 2.3, T_F = 2.76, T_END = 3.12;
    var P = points(), s = [0, 0, 0, 0], act = [0, 0, 0, 0];
    var W = 0, H = 0, D = 0, x0 = 0, y0 = 0, yb = 0, len = 0, pad = 0, RS = 0, G = 0, BN = 0, BL = null, face = null, t0 = 0, done = false;
    function fitCv() {
      var ks = keyEl ? keyEl.offsetWidth : 10, dpr = Math.min(2, window.devicePixelRatio || 1);
      D = me.offsetWidth; pad = Math.max(30, Math.min(96, (mc.offsetWidth - D) / 2));
      W = Math.round(D + pad * 2); H = Math.round(D + 34 + ks + 10);
      cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.style.marginLeft = (-W / 2) + 'px'; cv.style.bottom = (-(ks + 10)) + 'px';
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      yb = H - (ks + 10); x0 = W / 2; y0 = yb + ks / 2;      /* yb: 丸い窓の下端。(x0, y0): 要の点の中心 */
      len = D * .9 / (4 * CT);
      RS = D / 2 - 1; G = Math.max(4.4, D / 48);              /* 球の半径(丸い窓と同じ)と、顔の点描の点の間隔 */
      BN = Math.round(6.2832 * RS * RS / (.866 * G * G)); BL = lattice(BN);
    }
    /* 球の点が、顔のどこへ降りるかを決める。球を平らにほどく(面積を保ったまま円に開く)と、点は円の中にむらなく並ぶ。
       その位置の写真の明るさを、点の大きさに置き換える(明るいところほど大きな点)。写真の切り取り方は、丸い窓(CSS)と同じ。
       face: 点ごとに [横, 縦(窓の中心から), 点の半径]。半径が -1 の点は、球の裏側(顔には使わない) */
    function halftone() {
      if (face || !D || !BL || !img.complete || !img.naturalWidth) return;
      try {
        var oc = document.createElement('canvas'), o = oc.getContext('2d'), n = Math.round(D), sc, dw, dh, data, m, x, y, z, t, q, r, ix, iy, lum;
        var out = new Float32Array(BN * 3), c2 = Math.cos(PIT), s2 = Math.sin(PIT);
        oc.width = oc.height = n;
        sc = Math.max(n / img.naturalWidth, n / img.naturalHeight); dw = img.naturalWidth * sc; dh = img.naturalHeight * sc;
        o.drawImage(img, (n - dw) * .5, (n - dh) * .24, dw, dh);
        data = o.getImageData(0, 0, n, n).data;
        for (m = 0; m < BN; m++) {
          x = BL[m * 3]; y = BL[m * 3 + 1]; z = BL[m * 3 + 2];
          t = y * c2 - z * s2; z = y * s2 + z * c2; y = t;
          if (z <= .02) { out[m * 3 + 2] = -1; continue; }
          q = Math.sqrt(x * x + y * y); r = q > 1e-6 ? Math.sqrt(1 - z) / q : 0;           /* 面積を保って円へ: 中心からの距離を √(1 − z) に */
          x *= r * RS; y *= -r * RS;
          ix = Math.min(n - 1, Math.max(0, Math.round(D / 2 + x))); iy = Math.min(n - 1, Math.max(0, Math.round(D / 2 + y)));
          t = (iy * n + ix) * 4;
          lum = (data[t] * .299 + data[t + 1] * .587 + data[t + 2] * .114) / 255;
          r = G * .58 * Math.pow(lum, .8);
          out[m * 3] = x; out[m * 3 + 1] = y; out[m * 3 + 2] = r < .4 ? 0 : r;
        }
        face = out;
      } catch (e) { face = null; }   /* 写真を読めないときは、点描を省いて、球から写真へ */
    }
    function shape(t) {
      var k, x, n, q, vx, vy, vz, f, u = t - T0, psi = 1.0 * u + .7 * u * u;
      for (k = 0; k < N; k++) {
        x = (t - T0 - k * STEP) / DUR; x = x < 0 ? 0 : x > 1 ? 1 : x;
        s[k] = pop(x); act[k] = x > 0 && x < 1 ? Math.min(1, x * 6) * Math.pow(1 - x, 1.5) : 0;
        ca[k] = Math.cos(ORD[k] * 1.5708 + psi) * ST; sa[k] = Math.sin(ORD[k] * 1.5708 + psi) * ST;
      }
      for (n = 0; n < NV; n++) {
        vx = vy = vz = 0;
        for (q = 0; q < N; q++) if (V[n][q] > 0) { vx += s[q] * ca[q]; vy += s[q] * CT; vz += s[q] * sa[q]; }
        f = 1 / (1 - vz * .07);
        P[n].x = x0 + vx * len * f; P[n].y = y0 - vy * len * f; P[n].d = vz / 1.9;
      }
    }
    /* 球と、顔へほどける点。e: ふくらみ具合 / yaw: 向き / kf: 顔への進み具合 / af: 全体の濃さ */
    function globe(e, yaw, kf, af) {
      var R = KR + (RS - KR) * e, cy = y0 + (yb - RS - y0) * e, sz = G * 1.414 * R / RS, sh = ss(5, 30, R);
      var m, x, y, z, t, l, r, f, q, u, arr, sq, an, X, Y, rf, c1 = Math.cos(yaw), s1 = Math.sin(yaw), c2 = Math.cos(PIT), s2 = Math.sin(PIT), dk = ss(22, 64, R) * af;
      body(ctx, x0, cy, R, sh * (1 - kf) * af);
      dot(ctx, x0, cy, R, (1 - sh) * af);
      if (dk < .01) return;
      for (q = 0; q < BG; q++) bx[q].length = 0;
      for (m = 0; m < BN; m++) {
        rf = face ? face[m * 3 + 2] : -1;
        if (kf >= 1 && rf <= 0) continue;
        x = BL[m * 3]; y = BL[m * 3 + 1]; z = BL[m * 3 + 2];
        t = x * c1 - z * s1; z = x * s1 + z * c1; x = t;
        t = y * c2 - z * s2; z = y * s2 + z * c2; y = t;
        if (z < .02) continue;
        l = x * LX + y * LY + z * LZ; if (l < 0) l = 0;
        f = BF / (1 - z * BK);
        X = x0 + x * R * f; Y = cy - y * R * f; r = sz * (.1 + .29 * Math.pow(l, .9)); sq = .28 + .72 * z; an = Math.atan2(-y, x);
        if (kf > 0) {
          if (rf < 0) r *= 1 - kf;                                  /* 顔に使わない点は、消える */
          else { X += (x0 + face[m * 3] - X) * kf; Y += (cy + face[m * 3 + 1] - Y) * kf; r += (rf - r) * kf; sq += (1 - sq) * kf; l += (1 - l) * kf; }
          if (r < .15) continue;
        }
        q = Math.floor(l * BG); if (q >= BG) q = BG - 1;
        bx[q].push(X, Y, r, sq, an);
      }
      for (q = 0; q < BG; q++) {
        arr = bx[q]; if (!arr.length) continue; u = (q + .5) / BG;
        ctx.fillStyle = 'rgba(' + Math.round(150 + 80 * u) + ',' + Math.round(190 + 46 * u) + ',' + Math.round(242 + 6 * u) + ',' + ((.3 + .66 * u) * dk).toFixed(3) + ')';
        ctx.beginPath();
        for (m = 0; m < arr.length; m += 5) {
          r = arr[m + 2]; an = arr[m + 4];
          ctx.moveTo(arr[m] - Math.sin(an) * r, arr[m + 1] + Math.cos(an) * r);
          ctx.ellipse(arr[m], arr[m + 1], r * arr[m + 3], r, an, 1.5708, 7.854);
        }
        ctx.fill();
      }
    }
    function draw(t) {
      var la, u;
      ctx.clearRect(0, 0, W, H);
      if (t < T0) return;
      la = 1 - ss(T_M + .04, T_M + .42, t);                    /* 線は、球にのみこまれて淡くなる */
      if (la > 0) { shape(Math.min(t, T_M + .42)); paint(ctx, P, s, act, 1, la); }
      if (t < T_M) { dot(ctx, x0, y0, KR, 1); return; }
      u = (t - T_M) / (T_Z - T_M); u = u > 1 ? 1 : u;
      globe(1 - Math.pow(1 - Math.min(1, (t - T_M) / (T_S - T_M)), 3), -1.25 * Math.pow(1 - u, 3), face ? ss(T_K, T_F, t) : 0,
            t < T_F ? 1 : Math.max(0, 1 - (t - T_F) / (T_END - T_F)));
    }
    function finish() { done = true; ctx.clearRect(0, 0, W, H); cv.style.display = 'none'; }
    function frame(now) {
      if (done) return;
      var t = (now - t0) / 1000;
      if (!doc.classList.contains('meet') || doc.classList.contains('met') || t >= T_END) { finish(); return; }   /* 触れて先へ進んだら、すぐに引く */
      if (!face) halftone();
      draw(t);
      requestAnimationFrame(frame);
    }
    function start() {
      if (t0 || done) return;
      fitCv(); if (!D) { finish(); return; }
      halftone(); if (!face) img.addEventListener('load', halftone);
      if (FT >= 0) {   /* 確認用: 指定の時刻の一コマで止める(ページのほかの動きも、同じ時刻で止める) */
        t0 = 1;
        requestAnimationFrame(function () {
          try { document.getAnimations().forEach(function (an) { an.pause(); an.currentTime = FT * 1000; }); } catch (e) { /* 止められなくても、図形は描く */ }
          halftone(); draw(FT);
        });
        return;
      }
      t0 = window.__ksMeet || performance.now();
      requestAnimationFrame(frame);
    }
    if (doc.classList.contains('meet')) start();
    else new MutationObserver(function (m, ob) { if (doc.classList.contains('meet')) { ob.disconnect(); start(); } }).observe(doc, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ================= 原則: 一緒に下りてきた点が、構造になり、球になって、また点に戻る =================
     1. ページの左(または右)の線を下りてきた藍の点が、舞台のまん中あたりまで来ると、線を離れて舞台へ入る。
     2. 点から線が伸び(1次元)、面に開き(2次元)、立体になり(3次元)、4つ目の軸が開く(4次元)。ここまでが Key Structure。
     3. 点そのものがふくらんで、構造をのみこみ、球になる。ここが Keep it Simple。球は、光を受けてゆっくり回る。
     4. 球は点に戻る。読む人がそこにいるあいだは 2 からくり返し、先へ進むと、点は線へ帰る。
     スクロールの量には連動させない(きっかけにするだけ)。線が無いとき(線を出さない環境)は、その場で 2 から始める。 */
  (function () {
    var stage = document.getElementById('stage');
    var cv = stage && stage.querySelector('.stage-cv'), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    if (!ctx || reduce) return;                /* 動きを減らす設定では、ふつうの節として表示する */
    var pin = stage.querySelector('.stage-pin');
    doc.classList.add('stage-on');
    /* 原則の一文を、一文字ずつに分ける(一文字ずつ跳ねて灯すため)。単語の途中では折り返さない。読み上げ用には、元の文をそのまま残す */
    var big = stage.querySelector('.ks-big');
    (function () {
      var lines = big ? big.querySelectorAll('.l') : [], n, k, m, src, frag, word, idx, nd, txt, c;
      if (!lines.length) return;
      var sr = document.createElement('span'); sr.className = 'ks-sr'; sr.textContent = big.textContent.replace(/\s+/g, ' ').trim();
      for (n = 0; n < lines.length; n++) {
        src = lines[n]; frag = document.createDocumentFragment(); word = null; idx = 0;
        for (k = 0; k < src.childNodes.length; k++) {
          nd = src.childNodes[k]; txt = nd.textContent;
          for (m = 0; m < txt.length; m++) {
            if (txt.charAt(m) === ' ') { if (word) idx += 2; word = null; frag.appendChild(document.createTextNode(' ')); continue; }
            if (!word) { word = document.createElement('span'); word.className = 'w'; frag.appendChild(word); }
            c = document.createElement('span'); c.className = nd.nodeType === 1 ? 'ch cap' : txt.charAt(m) === '.' ? 'ch end' : 'ch'; c.style.setProperty('--i', idx++); c.textContent = txt.charAt(m);
            word.appendChild(c);
          }
        }
        src.textContent = ''; src.appendChild(frag); src.setAttribute('aria-hidden', 'true'); src.classList.add('l' + (n + 1));
      }
      big.insertBefore(sr, big.firstChild);
    })();
    function bounce(c) { stage.classList.remove(c); void stage.offsetWidth; stage.classList.add(c); }
    /* 一文を灯す(1 = 1行目まで, 2 = 2行目まで)。一度灯った言葉は、消さない */
    function light(n) { if (n <= lit) return; lit = n; stage.classList.add('s-key'); if (n > 1) stage.classList.add('s-simple'); }
    /* 時刻表(秒)。点 .45 → 線 → 面 → 立体 → 4次元(4.5秒まで)。4次元のまま2秒。1.4秒でふくらんで球。球のまま3.4秒。
       .9秒で点に戻り、ひと呼吸おいて、はじめから(ひとめぐり12.9秒) */
    var OPN = [[.45, 1.25], [1.3, 2.2], [2.25, 3.35], [3.4, 4.5]];
    var T_M0 = 6.5, T_M1 = 7.9, T_C0 = 11.3, T_C1 = 12.2, T_LOOP = 12.9, FLOOR = 1.36;
    var T_IN = 1, T_FOLD = .5, T_OUT = .85;       /* 線から舞台へ入る時間、たたむ時間、線へ帰る時間 */
    var P = points(), s = [0, 0, 0, 0], act = [0, 0, 0, 0], an = [0, 0, 0, 0];
    var W = 0, H = 0, cx = 0, cy = 0, rad = 0, RS = 0, BN = 0, BS = 0, BL = null;
    var clock = 0, started = false, px = 0, py = 0, pxT = 0, pyT = 0, last = 0, lit = 0, b1 = false, b2 = false, quality = 2, slow = 0;
    var mode = 0, mt = 0, fx = 0, fy = 0, dirty = false;   /* mode: 0 = 点は線の上 / 1 = 舞台へ入る / 2 = 演じる / 3 = たたむ / 4 = 線へ帰る */
    function size() {
      var b = fit(cv, ctx, pin.getBoundingClientRect()); W = b[0]; H = b[1];
      if (W >= 1000) { cx = W * .725; cy = H * .46; rad = Math.min(W * (W >= 1200 ? .165 : .15), H * .27); }      /* 言葉は左、形は右。下に、床の影のぶんの余白 */
      else if (W >= 700) { cx = W * .5; cy = H * .32; rad = Math.min(W * .21, H * .175); }                        /* 形は上、言葉は下 */
      else { cx = W * .5; cy = H * .31; rad = Math.min(W * .3, H * .165); }
      RS = rad * .96;
      BS = Math.max(8.5, Math.min(13, RS / 15)); BN = Math.round(12.566 * RS * RS / (.866 * BS * BS)); BL = lattice(BN);
    }
    /* ひとめぐりの中の時刻 t の姿を描く。g: たたみ具合(1 = そのまま, 0 = 点までたたむ) */
    function scene(t, g) {
      var k, x, mm, cc, la, e, kx, ky, R, sh, pit = .36 + py * .45;
      /* 開くのは1本目(線)から順に。線は静かに伸び、面から先は弾んで開く */
      for (k = 0; k < N; k++) {
        x = (t - OPN[k][0]) / (OPN[k][1] - OPN[k][0]); x = x < 0 ? 0 : x > 1 ? 1 : x;
        s[k] = (k ? pop(x) : x * x * (3 - 2 * x)) * g;
        act[k] = k && x > 0 && x < 1 ? Math.min(1, x * 6) * Math.pow(1 - x, 1.5) : 0;
      }
      mm = (t - T_M0) / (T_M1 - T_M0); mm = mm < 0 ? 0 : mm > 1 ? 1 : mm;      /* 球へ */
      cc = (t - T_C0) / (T_C1 - T_C0); cc = cc < 0 ? 0 : cc > 1 ? 1 : cc;      /* 点へ戻る */
      /* 開いていない軸は回さない。立体になってから、向きを変えはじめる。4つ目の軸は、開くとゆっくり裏返りつづける */
      an[0] = s[2] * (.62 + t * .2 + px * .7); an[1] = s[2] * pit;
      an[2] = s[3] * (t - OPN[3][0]) * .5; an[3] = s[3] * .32;
      project(P, s, an, cx, cy, rad, FLOOR);
      ctx.clearRect(0, 0, W, H); dirty = true;
      la = 1 - ss(.05, .6, mm);                                                 /* 線は、球にのみこまれて淡くなる */
      paint(ctx, P, s, act, quality, la);
      if (mm <= 0) { dot(ctx, P[0].x, P[0].y, KR, 1); }
      else {
        /* 点は、形の角からまん中へ寄り、そこでふくらむ。ふくらむにつれて、平らな丸に陰影がついて球になる */
        e = ss(0, .36, mm); kx = P[0].x + (cx - P[0].x) * e; ky = P[0].y + (cy - P[0].y) * e;
        x = (mm - .14) / .86; x = x < 0 ? 0 : x;
        R = KR + (RS - KR) * pop(x * x * (3 - 2 * x)) * (1 - sm(cc)) * g;      /* 静かに動きだし、勢いよくふくらみ、少し行きすぎて納まる */
        sh = ss(5, 30, R);
        ballFloor(ctx, cx, cy, R, rad, pit, FLOOR, ss(RS * .2, RS * .8, R) * (1 - .4 * la));
        ball(ctx, kx, ky, R, BL, BN, BS * R / RS, .62 + t * .23 + px * .7, pit, sh, ss(22, 64, R), quality > 0 ? 1 : 2);
        dot(ctx, kx, ky, R, 1 - sh);
      }
      /* 線が引かれたら1行目、立体へ開きはじめたら2行目が、一文字ずつ跳ねて灯る(はじまりから約3.5秒で一文がそろう)。一度灯った言葉は、繰り返しても消さない。
         そのあとは、4次元まで開いた瞬間に1行目が、球になった瞬間に2行目が、もう一度弾む(くり返すたびに。言葉と形の呼吸を合わせる) */
      if (lit < 1 && t >= 1.3) light(1);
      if (lit < 2 && t >= 2.6) light(2);
      if (t < .4) { b1 = false; b2 = false; }
      if (!b1 && lit >= 1 && t >= OPN[3][1] - .08 && t < T_M0) { b1 = true; bounce('b1'); }
      if (!b2 && lit >= 2 && t >= T_M1 - .12 && t < T_C0) { b2 = true; bounce('b2'); }
    }
    function fly(x0, y0, x1, y1, e) { cross(ctx, W, H, x0, y0, x1, y1, e); dirty = true; }
    function line() { return lineAt(cv); }
    /* 点を線へ返して、休む。y: 返す高さ(画面の座標。添えると、点はそこから線の上を走って追いつく) */
    function rest(y) { if (mode) { mode = 0; lend(false, y); } if (dirty) { ctx.clearRect(0, 0, W, H); dirty = false; } }
    /* 舞台の大きさが少しでも変わったら、描く面を合わせ直す(合っていないと、球が縦や横に伸びて見える) */
    function watch(fn) {
      if (!('ResizeObserver' in window)) { onResize(fn); return; }
      new ResizeObserver(function () { var r = pin.getBoundingClientRect(); if (Math.round(r.width) !== W || Math.round(r.height) !== H) fn(); }).observe(pin);
    }
    size();
    if (FZ >= 0) {
      /* 確認用: ?dim=0.6 で、その瞬間の姿。&fly=0.5 を足すと、点が線から舞台へ渡る途中(0〜1)。
         &hop=9999,470 で、文字が跳ねている途中の一コマ(1行目・2行目それぞれの、動きはじめからのミリ秒) */
      var fq = /[?&]fly=([\d.]+)/.exec(location.search);
      var still = function () {
        if (fq) fly(Math.max(11, W * .03), H * .5, cx, cy, sm(+fq[1])); else scene(FZ * T_LOOP, 1);
      };
      still(); watch(function () { size(); still(); });
      var hq = /[?&]hop=(\d{1,5}),(\d{1,5})/.exec(location.search);
      if (hq && big && big.getAnimations) {
        Array.prototype.forEach.call(big.querySelectorAll('.ch'), function (c) {
          var T = +hq[c.parentNode.parentNode.classList.contains('l2') ? 2 : 1];
          c.getAnimations().forEach(function (a) { a.pause(); a.currentTime = T; });
        });
      }
      return;
    }
    var kick = runner(stage, function (now) {
      var dt = last ? Math.min(100, now - last) : 16, e = 1 - Math.exp(-dt / 260), tp, u, ty;
      /* 描く手間を自分で測り、重い端末では、床の影、線の抜きと球の点の半分、の順に省く */
      if (last && quality > 0 && mode === 2) { slow += dt > 34 ? 1 : slow > 0 ? -.5 : 0; if (slow > 45) { quality--; slow = 0; } }
      last = now; dt /= 1000;
      px += (pxT - px) * e; py += (pyT - py) * e;
      tp = line();
      if (mode === 0) {
        if (!tp) { if (started) { mode = 2; clock = .3; } }                                 /* 線が無いときは、その場で始める */
        else if (tp.y > H * .28 && tp.y < H * .72) { mode = 1; mt = 0; fx = tp.x; fy = tp.y; lend(true); }
        if (mode === 0) { if (dirty) { ctx.clearRect(0, 0, W, H); dirty = false; } return; }
      }
      if (mode === 1) {                                                                    /* 点が、線を離れて舞台へ入る */
        mt += dt; u = Math.min(1, mt / T_IN); fly(fx, fy, cx, cy, sm(u));
        if (u >= 1) { mode = 2; clock = .3; }
        return;
      }
      if (mode === 2) {                                                                    /* 演じる。読む人が先へ進んだら、たたんで帰る */
        clock += dt; if (clock >= T_LOOP) clock -= T_LOOP;
        scene(clock, 1);
        if (tp && (tp.y < H * .05 || tp.y > H * .95)) { mode = 3; mt = 0; }
        return;
      }
      if (mode === 3) {
        mt += dt; u = Math.min(1, mt / T_FOLD); scene(clock, 1 - sm(u));
        if (u >= 1) { mode = 4; mt = 0; }
        return;
      }
      mt += dt; u = Math.min(1, mt / T_OUT);                                               /* 点が、線へ帰る */
      if (!tp) { rest(); return; }
      ty = tp.y < 0 ? 0 : tp.y > H ? H : tp.y;
      fly(cx, cy, tp.x, ty, sm(u));
      if (u >= 1) rest(cv.getBoundingClientRect().top + ty);
    }, function () { rest(); if (started) light(2); });   /* 画面から出るときに、言葉がまだ灯っていなければ灯しておく(戻ってきたときに読めるように) */
    /* 形が画面に3割ほど入ったかどうか(線が無いときの、始める合図) */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        started = true; io.disconnect();
        setTimeout(function () { light(2); }, 4500);     /* 形が始まらないまま読まれているときも、言葉は灯す */
      }, { threshold: .3 });
      io.observe(pin);
    } else started = true;
    watch(function () { size(); kick(); });
    pin.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') return;
      var r = pin.getBoundingClientRect(); pxT = (ev.clientX - r.left) / r.width - .5; pyT = (ev.clientY - r.top) / r.height - .5;
    }, { passive: true });
    pin.addEventListener('pointerleave', function () { pxT = 0; pyT = 0; });
  })();

  /* ================= 下層ページの冒頭: 点が墨の地を渡り、止まって、球に開く =================
     ページの線の先頭にいる藍の点が、線を離れて墨の地を渡り、止まって、ふくらんで球になる
     (映画の題字映像にある「点が画面を横切り、丸く開く」型。図柄は写していない)。球は、光を受けてゆっくり回る。
     読み進めると、球は点に戻って線へ帰り、読む人と一緒に下りていく。いちばん上へ戻ると、また球に開く。
     スクロールの量には連動させない(きっかけにするだけ)。動きを減らす設定では、出さない。
     確認用: ?ph=0.6 で、球に開く途中(0〜1)。?ph=fly0.5 で、点が渡る途中(0〜1) */
  (function () {
    var hero = document.querySelector('.page-hero');
    if (!hero || reduce) return;
    var cv = document.createElement('canvas'), ctx = cv.getContext ? cv.getContext('2d') : null;
    if (!ctx) return;
    cv.className = 'ph-cv'; cv.setAttribute('aria-hidden', 'true');
    hero.appendChild(cv);
    doc.classList.add('ph-on');
    var T_IN = 1.05, T_BLOOM = 1.1, T_FOLD = .45, T_OUT = .8, PIT = .34;
    var EXT = 96;        /* 描く面は、冒頭の下へこれだけはみ出させてある(CSS)。線の先頭が冒頭の少し下にあるページでも、点がとぎれずに渡れるように */
    var W = 0, H = 0, HC = 0, cx = 0, cy = 0, RS = 0, BN = 0, BS = 0, BL = null;
    var mode = 0, mt = 0, fx = 0, fy = 0, clock = 0, last = 0, dirty = false, born = performance.now();   /* mode は、原則の場面と同じ(0 = 点は線の上 … 4 = 線へ帰る) */
    var inn = hero.querySelector('.page-hero-in') || hero;
    /* 球の置き場所を決める。言葉(見出しと説明)の右に空きが十分あれば、そこに大きく。なければ、言葉の下の右の端に小さく置く
       (言葉には重ねない。下に置くときの余白は CSS が足す。画面が狭いときは、はじめから下) */
    function size() {
      var hr = hero.getBoundingClientRect(), cs = getComputedStyle(inn), wr = inn.getBoundingClientRect().right - (parseFloat(cs.paddingRight) || 0) - hr.left;
      var low = getComputedStyle(cv).getPropertyValue('--narrow').trim() === '1', tr = 0, kids = inn.children, i, k, rs, rg, room, b;
      if (!low && document.createRange) {
        for (i = 0; i < kids.length; i++) {
          rg = document.createRange(); rg.selectNodeContents(kids[i]); rs = rg.getClientRects();
          for (k = 0; k < rs.length; k++) if (rs[k].width > 1 && rs[k].right - hr.left > tr) tr = rs[k].right - hr.left;
        }
        room = (wr - tr - 48) / 2; low = room < 80;
      }
      if (hero.classList.contains('ph-low') !== low) hero.classList.toggle('ph-low', low);
      b = fit(cv, ctx, cv.getBoundingClientRect()); W = b[0]; HC = b[1]; H = HC - EXT;
      if (low) { RS = Math.max(36, Math.min(56, W * .07)); cx = wr - RS; cy = H - 30 - RS; }
      else { RS = Math.min(H * .3, 190, room); cx = wr - RS; cy = H * .5; }
      BS = Math.max(5.5, Math.min(13, RS / 12)); BN = Math.round(12.566 * RS * RS / (.866 * BS * BS)); BL = lattice(BN);
    }
    /* 球を描く。t: 開きはじめてからの秒 / g: たたみ具合(1 = そのまま, 0 = 点まで) */
    function globe(t, g) {
      var x = Math.min(1, t / T_BLOOM), R = KR + (RS - KR) * pop(x * x * (3 - 2 * x)) * g, sh = ss(5, 30, R);
      ctx.clearRect(0, 0, W, HC); dirty = true;
      ball(ctx, cx, cy, R, BL, BN, BS * R / RS, .5 + t * .22, PIT, sh, ss(RS * .35, RS * .8, R), 1);
      dot(ctx, cx, cy, R, 1 - sh);
    }
    function rest(y) { if (mode) { mode = 0; lend(false, y); } if (dirty) { ctx.clearRect(0, 0, W, HC); dirty = false; } }
    size();
    var fq = /[?&]ph=(fly)?([\d.]+)/.exec(location.search);
    function still() { if (fq[1]) { cross(ctx, W, HC, Math.max(11, W * .05), H - 2, cx, cy, sm(+fq[2])); } else globe(+fq[2] * T_BLOOM + (+fq[2] >= 1 ? 3 : 0), 1); }
    function watch(fn) {
      if (!('ResizeObserver' in window)) { onResize(fn); return; }
      new ResizeObserver(function () { var r = cv.getBoundingClientRect(); if (Math.round(r.width) !== W || Math.round(r.height) !== HC) fn(); }).observe(cv);
    }
    if (fq) { still(); watch(function () { size(); still(); }); return; }
    var kick = runner(hero, function (now) {
      var dt = last ? Math.min(100, now - last) : 16, tp = lineAt(cv), u, ty; last = now; dt /= 1000;
      if (mode === 0) {
        /* 点が線の先頭(冒頭の下の端)にいて、ページを開いてから少したっていたら、渡りはじめる。線が無いときは、その場で開く */
        if (now - born < 700) return;
        if (!tp) { if (now - born > 1400) { mode = 2; clock = 0; } }
        else if (tp.run < 24) { mode = 1; mt = 0; fx = tp.x; fy = Math.min(tp.y, HC - 2); lend(true); }
        if (mode === 0) { if (dirty) { ctx.clearRect(0, 0, W, HC); dirty = false; } return; }
      }
      if (mode === 1) {                                                   /* 点が、線を離れて墨の地を渡る */
        mt += dt; u = Math.min(1, mt / T_IN); cross(ctx, W, HC, fx, fy, cx, cy, sm(u)); dirty = true;
        if (u >= 1) { mode = 2; clock = 0; }
        return;
      }
      if (mode === 2) {                                                   /* 球に開いて、回る。読み進めたら、たたんで帰る */
        clock += dt; globe(clock, 1);
        if (tp && tp.run > 70) { mode = 3; mt = 0; }
        return;
      }
      if (mode === 3) {
        mt += dt; u = Math.min(1, mt / T_FOLD); globe(clock, 1 - sm(u));
        if (u >= 1) { mode = 4; mt = 0; }
        return;
      }
      mt += dt; u = Math.min(1, mt / T_OUT);                              /* 点が、線へ帰る */
      if (!tp) { rest(); return; }
      ty = tp.y < 0 ? 0 : tp.y > HC ? HC : tp.y;
      cross(ctx, W, HC, cx, cy, tp.x, ty, sm(u)); dirty = true;
      if (u >= 1) rest(cv.getBoundingClientRect().top + ty);
    }, function () { rest(); });
    watch(function () { size(); kick(); });
  })();
})();
