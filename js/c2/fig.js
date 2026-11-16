/* 佐藤健司公認会計士事務所 — 粒の図(新コンセプトの試作 版3)
   考え方はひとつ: 散らかった粒が、金の点(起点)のまわりで、整った構造になる。
   ・冒頭と代表あいさつ: 銀河   ・業務の選択画面と業務の詳細: 業務ごとの構造   ・ご連絡: 「KS」   ・読む場面: 粒は出さない(金の点だけが、札の頭にいる)
   ・場面が替わるとき、粒は画面を飛ばない。前の場所で静かに消え、金の点だけが先へ進み、着いた場所で新しい形が現れる
   ・業務の選択画面では、窓の中だけに描く。窓の奥には星があり、業務を替えると、星が流れて向きが変わる
   動きを減らす設定では、動かさずに、でき上がりの形だけを描く。 */
(function () {
  'use strict';
  var cv = document.getElementById('fig');
  if (!cv || !cv.getContext || !window.requestAnimationFrame) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2, W = 0, H = 0, dpr = 1, N = 0, raf = 0;
  var X, Y, VX, VY, TX, TY, R1, R2, R3, RX, RY, ED, PX, PY, PZ, Z;   /* 粒ごとの値(Z: 手前ほど大きい遠近の値。立体の形のときだけ使う) */
  var form = 'chaos', theme = 'd', pTheme = 'd', anchorFn = null, partFn = null, winFn = null, hop = 0, pend = null;
  var A = { x: 0, y: 0, R: 100 }, C = { x: 0, y: 0 }, P = { x: 0, y: 0 }, off = { x: 0, y: 0 }, Rs = 100;
  var al = 0, alT = 0.7, swirl = 0, vert = 0, glow = 1, quiet = 0, hole = 0, holeS = 0;
  var mx = -9999, my = -9999, ksPts = null, ksFont = '', boing = 0, bv = 0, SP = [], trail = 0, trailT = 0;      /* boing・bv: 金の玉の弾み(ばね) */      /* TRL: 金の点の、少し前までの場所(動いたときの尾) */
  var vy = 0, vp = 0, vyT = 0, vpT = 0;                /* 見る向き(窓の上のマウスで、少し変わる) */
  var sky = 0, skyT = 0, STARS = [], clipW = false;    /* 窓の奥の星 */
  var avoid = null, aox = 0, aoy = 0;
  var calm = 1, lastSY = 0;                             /* 速いスクロールの間は 0 へ(絵を消す)。止まれば 1 へ戻る */
  var ALPHA = { chaos: 0.75, gather: 1, gal: 0.95, ks: 0.6, dust: 0.001, tess: 1, grid: 0.9, helix: 0.92, rings: 0.92, cone: 0.92, wave: 0.85, globe: 0.85, net: 0.95, board: 1 };
  /* 立体の形: 見下ろす角度と、回る速さ(0 は、ゆっくり首を振る) */
  var D3 = { grid: [0.5, 0.15], helix: [0.3, 0.2], rings: [0.45, 0.16], cone: [0.34, 0.2], wave: [0.98, 0], globe: [0.36, 0.14], net: [0.16, 0], board: [0.46, 0.13] };
  var COL = { d: '170,196,255', l: '18,71,239' };
  /* にじむ光の絵(一度だけ作る)。青白い光と、あたたかい光。手前の粒・光の波・瞬きに使う */
  function spr(rgb) {
    var c = document.createElement('canvas'), x, g;
    c.width = c.height = 64; x = c.getContext('2d'); g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.18, 'rgba(' + rgb + ',.55)'); g.addColorStop(0.45, 'rgba(' + rgb + ',.14)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
  }
  var SPC = spr('150,186,255'), SPW = spr('255,232,190'), morphT = -1e9;
  var V = [], E = [], NODE = [], LINK = [], i, j, k;
  for (i = 0; i < 16; i++) V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
  for (i = 0; i < 16; i++) for (k = 0; k < 4; k++) { j = i ^ (1 << k); if (i < j) E.push([i, j]); }
  /* 網(4つの層・16の結び目)。結び目どうしを、隣の層とすべて結ぶ */
  (function () {
    var lay = [3, 5, 5, 3], base = [0, 3, 8, 13], l, a, b;
    for (l = 0; l < 4; l++) for (a = 0; a < lay[l]; a++) NODE.push([(l - 1.5) * 0.95, (a - (lay[l] - 1) / 2) * 0.66, (a + l) % 2 ? 0.34 : -0.34]);
    for (l = 0; l < 3; l++) for (a = 0; a < lay[l]; a++) for (b = 0; b < lay[l + 1]; b++) LINK.push([base[l] + a, base[l + 1] + b]);
  })();
  var PT = []; for (i = 0; i < 16; i++) PT.push([0, 0, 1]);
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function alloc() {
    var r = rng(11), n;
    N = W < 700 ? 2200 : W < 1100 ? 3600 : 5200;
    X = new Float32Array(N); Y = new Float32Array(N); VX = new Float32Array(N); VY = new Float32Array(N); TX = new Float32Array(N); TY = new Float32Array(N);
    R1 = new Float32Array(N); R2 = new Float32Array(N); R3 = new Float32Array(N); RX = new Float32Array(N); RY = new Float32Array(N); ED = new Uint8Array(N);
    PX = new Float32Array(N); PY = new Float32Array(N); PZ = new Float32Array(N); Z = new Float32Array(N);
    for (n = 0; n < N; n++) { R1[n] = r(); R2[n] = r(); R3[n] = r(); ED[n] = Math.floor(r() * 32); X[n] = R1[n] * W; Y[n] = R2[n] * H; }
    STARS = []; for (n = 0; n < 190; n++) STARS.push([r(), r(), r(), r(), r() < 0.08 ? 1 : 0]);      /* 横・縦・奥行き・またたきの速さ・金の星か */
  }
  function size() {
    var w = document.documentElement.clientWidth || window.innerWidth, h = window.innerHeight;      /* 幅は、スクロールバーを除いた幅(含めると、バーが常に出る環境で、絵が横に縮んでずれる) */
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  /* 形ごとの、粒の置き場所(起点からの相対の場所)。形を選んだときに、一度だけ決める */
  function place() {
    var n, L, len, u, q, r, s, th, a, b, m, e, kk, rr;
    if (form === 'ks') {
      if (facePts) {                                    /* お顔の星: 暗い粒は輪郭と全体、中くらいの粒は肌、明るい粒は光の当たる所。明暗で、お顔が浮かぶ */
        for (n = 0; n < N; n++) { L = facePts[n < N * 0.5 ? 0 : n < N * 0.86 ? 1 : 2]; len = L.length / 2; u = (n * 7919) % len; RX[n] = L[u * 2]; RY[n] = L[u * 2 + 1]; }
      } else {
        L = ks(); len = L.length / 2;
        for (n = 0; n < N; n++) { u = (n * 7919) % len; RX[n] = L[u * 2] + (R1[n] - 0.5) * 0.012; RY[n] = L[u * 2 + 1] + (R2[n] - 0.5) * 0.012; }
      }
    } else if (form === 'grid') {                       /* 立体の格子: 縦・横・奥に、4×4本ずつの線 */
      for (n = 0; n < N; n++) {
        u = ED[n] % 16; q = (R3[n] * 2 - 1) * 1.15; r = ((u & 3) / 3 * 2 - 1) * 1.15; s = ((u >> 2) / 3 * 2 - 1) * 1.15; kk = n % 3;
        PX[n] = kk === 0 ? q : r; PY[n] = kk === 1 ? q : kk === 0 ? r : s; PZ[n] = kk === 2 ? q : s;
      }
    } else if (form === 'helix') {                      /* らせんの階段: 芯の柱、30の段、手すり */
      for (n = 0; n < N; n++) {
        kk = n % 20; u = R3[n];
        if (kk < 2) { PX[n] = (R1[n] - 0.5) * 0.03; PZ[n] = (R2[n] - 0.5) * 0.03; PY[n] = 1.55 - u * 3.1; }
        else if (kk < 6) { th = u * 16.3; PX[n] = Math.cos(th) * 1.3; PZ[n] = Math.sin(th) * 1.3; PY[n] = 1.37 - u * 3.1; }
        else { m = Math.floor(u * 30); th = m / 30 * 16.3 + (R2[n] - 0.5) * 0.1; r = 0.2 + R1[n] * 1.1; PX[n] = Math.cos(th) * r; PZ[n] = Math.sin(th) * r; PY[n] = 1.55 - m / 30 * 3.1; }
      }
    } else if (form === 'rings') {                      /* たがいに直交する、3つの輪 */
      for (n = 0; n < N; n++) {
        kk = n % 3; rr = (kk === 0 ? 1.55 : kk === 1 ? 1.15 : 0.75) + (R2[n] - 0.5) * 0.035; th = R1[n] * TAU; a = Math.cos(th) * rr; b = Math.sin(th) * rr; q = (R3[n] - 0.5) * 0.03;
        PX[n] = kk === 2 ? q : a; PY[n] = kk === 0 ? q : kk === 1 ? b : a; PZ[n] = kk === 1 ? q : b;
      }
    } else if (form === 'cone') {                       /* 上下ふたつの渦が、まん中の一点で出会う */
      for (n = 0; n < N; n++) {
        s = n % 13 === 0 ? 1 : R3[n]; kk = n % 2 ? 1 : -1; r = 0.03 + 1.25 * Math.pow(s, 1.25);
        th = (n % 5) * 1.2566 + s * 4.2 * kk + (R1[n] - 0.5) * (n % 13 === 0 ? TAU : 0.22 + 0.5 / (0.3 + s * 3));
        PX[n] = Math.cos(th) * r; PZ[n] = Math.sin(th) * r; PY[n] = kk * (0.04 + 1.5 * s);
      }
    } else if (form === 'wave') {                       /* 縦横の線でできた面が、ゆっくり波打つ(高さは、描くたびに決める) */
      for (n = 0; n < N; n++) { u = (Math.floor(R1[n] * 13) / 12 * 2 - 1) * 1.6; q = (R3[n] * 2 - 1) * 1.6; PX[n] = n % 2 ? u : q; PZ[n] = n % 2 ? q : u; PY[n] = 0; }
    } else if (form === 'board') {                      /* 社外監査役: 金の点(いちばん上)から、光の柱が、監査役会の輪(3席)へ、さらに取締役会の円卓(9席)へ降りる */
      for (n = 0; n < N; n++) {
        kk = n % 20; u = R3[n];
        if (kk < 7) { th = R1[n] * TAU; r = 1.3 + (R2[n] - 0.5) * 0.03; PX[n] = Math.cos(th) * r; PZ[n] = Math.sin(th) * r; PY[n] = 1.5 + (u - 0.5) * 0.02; }                 /* 円卓のふち */
        else if (kk < 9) { th = R1[n] * TAU; r = kk === 7 ? 0.5 : 0.9; PX[n] = Math.cos(th) * r; PZ[n] = Math.sin(th) * r; PY[n] = 1.5; }                                            /* 円卓の面(内がわの輪) */
        else if (kk < 11) { th = R1[n] * TAU; r = 0.42 + (R2[n] - 0.5) * 0.02; PX[n] = Math.cos(th) * r; PZ[n] = Math.sin(th) * r; PY[n] = 0.55; }                                   /* 監査役会の輪 */
        else if (kk < 15) {                                                                                                                                                         /* 監査役会の席から、取締役会の席へ降りる光(9本) */
          m = Math.floor(R1[n] * 9) % 9; a = (Math.floor(m / 3) * 3 + 1) * 0.698; th = m * 0.698;
          PX[n] = Math.cos(a) * 0.42 + (Math.cos(th) * 1.3 - Math.cos(a) * 0.42) * u + (R2[n] - 0.5) * 0.02; PZ[n] = Math.sin(a) * 0.42 + (Math.sin(th) * 1.3 - Math.sin(a) * 0.42) * u; PY[n] = 0.55 + 0.95 * u;
        }
        else if (kk < 17) { a = (Math.floor(R1[n] * 3) % 3 * 3 + 1) * 0.698; PX[n] = Math.cos(a) * 0.42 * u + (R2[n] - 0.5) * 0.02; PZ[n] = Math.sin(a) * 0.42 * u; PY[n] = 0.55 * u; }  /* 金の点から、監査役会の席へ降りる光(3本) */
        else if (kk < 18) { PX[n] = (R1[n] - 0.5) * 0.03; PZ[n] = (R2[n] - 0.5) * 0.03; PY[n] = u * 1.5; }                                                                         /* まん中の軸 */
        else { m = Math.floor(R1[n] * 12) % 12; if (m < 9) { th = m * 0.698; r = 1.3; q = 1.5; } else { th = ((m - 9) * 3 + 1) * 0.698; r = 0.42; q = 0.55; }                       /* 席(9＋3): 小さな星のかたまり */
          PX[n] = Math.cos(th) * r + (R2[n] - 0.5) * 0.11; PZ[n] = Math.sin(th) * r + (u - 0.5) * 0.11; PY[n] = q + (((n * 7) % 11) / 11 - 0.5) * 0.11; }
      }
    } else if (form === 'globe') {                      /* 緯線7本と経線12本の球 */
      for (n = 0; n < N; n++) {
        if (n % 5 < 2) { a = (Math.floor(R1[n] * 7) + 1) / 8 * Math.PI - Math.PI / 2; th = R3[n] * TAU; }
        else { th = Math.floor(R1[n] * 12) / 12 * TAU; a = (R3[n] - 0.5) * Math.PI; }
        PX[n] = Math.cos(a) * Math.cos(th) * 1.4; PY[n] = Math.sin(a) * 1.4; PZ[n] = Math.cos(a) * Math.sin(th) * 1.4;
      }
    } else if (form === 'net') {                        /* 網: 結び目と、それを結ぶ線 */
      for (n = 0; n < N; n++) {
        if (n % 6 === 0) { m = NODE[Math.floor(R1[n] * 16)]; PX[n] = m[0] + (R2[n] - 0.5) * 0.12; PY[n] = m[1] + (R3[n] - 0.5) * 0.12; PZ[n] = m[2] + ((R2[n] * 7) % 1 - 0.5) * 0.12; }
        else { e = LINK[Math.floor(R1[n] * LINK.length)]; a = NODE[e[0]]; b = NODE[e[1]]; q = R3[n]; PX[n] = a[0] + (b[0] - a[0]) * q; PY[n] = a[1] + (b[1] - a[1]) * q + (R2[n] - 0.5) * 0.012; PZ[n] = a[2] + (b[2] - a[2]) * q; }
      }
    }
  }
  /* 「KS」の字の形を、粒の置き場所に変える(字を小さな面に描いて、塗られた場所を拾う) */
  function ks() {
    var f = '900 300px Archivo, "Helvetica Neue", Arial, sans-serif', c, x, d, px, py, out = [], w = 620, h = 330, m;
    if (ksPts && ksFont === f + (document.fonts && document.fonts.check ? document.fonts.check(f) : '')) return ksPts;
    c = document.createElement('canvas'); c.width = w; c.height = h; x = c.getContext('2d');
    x.font = f; x.textBaseline = 'alphabetic'; x.fillStyle = '#000';
    try { x.fontStretch = '125%'; } catch (e) { /* 幅の指定ができない環境は、そのまま */ }
    m = x.measureText('KS').width; x.fillText('KS', (w - m) / 2, 268);
    d = x.getImageData(0, 0, w, h).data;
    for (py = 0; py < h; py += 3) for (px = 0; px < w; px += 3) if (d[(py * w + px) * 4 + 3] > 120) out.push((px - w / 2) / (h / 2), (py - h * 0.56) / (h / 2));
    if (out.length < 40) out = [0, 0, 0.1, 0, -0.1, 0, 0, 0.1, 0, -0.1];
    ksFont = f + (document.fonts && document.fonts.check ? document.fonts.check(f) : ''); ksPts = out; return out;
  }

  /* お顔の星: お写真の明るさから、粒の置き場所を決める(一度だけ)。明るい所ほど星が多い。背景は、四隅から色のなだらかな所をたどって除く */
  var facePts = null, faceImg = null, faceA = 0;      /* faceImg: 細かな星で描いたお顔の絵(一度だけ作る)。faceA: その濃さ */
  (function () {
    var el = null, im;      /* 版39: お顔の星は外した(2026-11-14「夜に見ると怖がります。だめ」)ので、作らない。読み込みのたびに、数万個の置き場所を計算していた */
    if (!el) return;
    im = new Image();
    im.onload = function () {
      try {
        var w = 150, h = 200, S = 3, c = document.createElement('canvas'), x = c.getContext('2d'), d, i, k, px, py, r, g, b, e, dx, dy, vg, fc, fx;
        var lum = new Float32Array(w * h), neu = new Uint8Array(w * h), bg = new Uint8Array(w * h), st = [], rnd = rng(77), nb;
        var DEN = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)], WANT = [24000, 24000, 12000], OUT = [[], [], []], guard;
        c.width = w; c.height = h; x.drawImage(im, 108, 24, 300, 400, 0, 0, w, h);                       /* お顔に寄せて切り取る(髪の上から、えりまで) */
        d = x.getImageData(0, 0, w, h).data;
        for (i = 0; i < w * h; i++) { r = d[i * 4]; g = d[i * 4 + 1]; b = d[i * 4 + 2]; lum[i] = (0.3 * r + 0.59 * g + 0.11 * b) / 255; neu[i] = Math.abs(r - b) < 30 ? 1 : 0; }
        [0, w - 1, Math.floor(h * 0.45) * w, Math.floor(h * 0.45) * w + w - 1].forEach(function (q) { if (lum[q] > 0.55 && neu[q]) { bg[q] = 1; st.push(q); } });
        while (st.length) {
          i = st.pop(); px = i % w; py = (i - px) / w;
          nb = [px > 0 ? i - 1 : -1, px < w - 1 ? i + 1 : -1, py > 0 ? i - w : -1, py < h - 1 ? i + w : -1];
          for (k = 0; k < 4; k++) { e = nb[k]; if (e >= 0 && !bg[e] && neu[e] && lum[e] > 0.55 && Math.abs(lum[e] - lum[i]) < 0.05) { bg[e] = 1; st.push(e); } }
        }
        for (py = 0; py < h; py++) for (px = 0; px < w; px++) {
          i = py * w + px; if (bg[i]) continue;
          dx = (px - w * 0.5) / (w * 0.5); dy = (py - h * 0.47) / (h * 0.53); vg = Math.max(0, Math.min(1, (1.03 - Math.sqrt(dx * dx + dy * dy)) / 0.24));      /* まわりは、星くずに溶ける */
          e = (px < w - 1 ? Math.abs(lum[i] - lum[i + 1]) : 0) + (py < h - 1 ? Math.abs(lum[i] - lum[i + w]) : 0);
          DEN[0][i] = ((neu[i] && lum[i] < 0.45 ? 0.55 : 0.2 + 0.2 * lum[i]) + Math.min(0.5, e * 4)) * vg;      /* 暗い星: 髪・まゆ・上着のかたまりと、輪郭の線 */
          DEN[1][i] = (neu[i] ? (lum[i] > 0.8 ? 0.35 : 0) : Math.pow(lum[i], 2)) * vg;                           /* 中くらいの星: 肌の明るさ(白いシャツは、ひかえめに) */
          DEN[2][i] = neu[i] ? 0 : Math.min(1, Math.pow(lum[i], 5) * 1.6) * vg;                                  /* 明るい星: 光の当たる所(額・鼻・ほお) */
        }
        for (k = 0; k < 3; k++) {
          guard = 0;
          while (OUT[k].length < WANT[k] && guard++ < 700000) {
            px = Math.floor(rnd() * w); py = Math.floor(rnd() * h);
            if (rnd() < DEN[k][py * w + px]) OUT[k].push((px + rnd() - w / 2) / (h / 2), (py + rnd() - h / 2) / (h / 2));
          }
        }
        /* 細かな星で描いた、お顔の絵(3万の星)。暗い星 → 中くらいの星 → 明るい星の順に、光を重ねる */
        fc = document.createElement('canvas'); fc.width = w * S; fc.height = h * S; fx = fc.getContext('2d'); fx.globalCompositeOperation = 'lighter';
        [[9000, 0, 'rgba(150,180,255,.32)', 1.3], [16000, 1, 'rgba(198,216,255,.5)', 1.5], [7000, 2, 'rgba(255,240,214,.85)', 1.7]].forEach(function (ps) {
          var cnt = 0, gd = 0, s2 = ps[3];
          fx.fillStyle = ps[2];
          while (cnt < ps[0] && gd++ < 900000) {
            px = Math.floor(rnd() * w); py = Math.floor(rnd() * h);
            if (rnd() < DEN[ps[1]][py * w + px]) { fx.fillRect((px + rnd()) * S - s2 / 2, (py + rnd()) * S - s2 / 2, s2, s2); cnt++; }
          }
        });
        if (OUT[0].length > 4000 && OUT[1].length > 4000 && OUT[2].length > 400) { facePts = OUT; faceImg = fc; if (form === 'ks') { place(); if (reduce) still(); } }
      } catch (err) { facePts = null; faceImg = null; }
    };
    im.src = el.currentSrc || el.src;
  })();

  /* 粒の目あての場所を決める */
  function aim(now) {
    var t = now / 1000, cx = P.x, cy = P.y, R = Rs, n, a, b, q, x, y, z, v, f, c1, s1, c2, s2, rad, th, e, d;
    if (form === 'tess') {                              /* 4次元の立方体(箱の中に、箱) */
      c1 = Math.cos(0.62 + t * 0.17 + vy); s1 = Math.sin(0.62 + t * 0.17 + vy); c2 = Math.cos(0.4 + t * 0.12 + vp); s2 = Math.sin(0.4 + t * 0.12 + vp);
      for (n = 0; n < 16; n++) {
        x = V[n][0]; y = V[n][1]; z = V[n][2]; v = V[n][3];
        q = x * c1 - z * s1; z = x * s1 + z * c1; x = q; q = y * c2 - v * s2; v = y * s2 + v * c2; y = q;
        q = 1.9 / (1.9 + v * 0.5); x *= q; y *= q; z *= q; f = 3.1 / (3.1 + z);
        PT[n][0] = cx + x * R * f; PT[n][1] = cy + y * R * f; PT[n][2] = f;
      }
      for (n = 0; n < N; n++) {
        e = E[ED[n]]; a = PT[e[0]]; b = PT[e[1]]; q = R3[n];
        TX[n] = a[0] + (b[0] - a[0]) * q + (R1[n] - 0.5) * 1.6; TY[n] = a[1] + (b[1] - a[1]) * q + (R2[n] - 0.5) * 1.6; Z[n] = a[2] + (b[2] - a[2]) * q;
      }
    } else if (D3[form]) {                              /* 立体の形: 縦の軸で回し、少し見下ろして、遠近をつける */
      d = D3[form]; R *= 1 + 0.035 * Math.sin(t * 0.55); a = (d[1] ? t * d[1] : Math.sin(t * 0.22) * (form === 'net' ? 0.5 : 0.4)) + vy; b = d[0] + vp;
      c1 = Math.cos(a); s1 = Math.sin(a); c2 = Math.cos(b); s2 = Math.sin(b);
      if (form === 'net') for (n = 0; n < 16; n++) {
        x = NODE[n][0]; y = NODE[n][1]; z = NODE[n][2];
        q = x * c1 - z * s1; z = x * s1 + z * c1; x = q; q = y * c2 - z * s2; z = y * s2 + z * c2; y = q; f = 3.1 / (3.1 + z);
        PT[n][0] = cx + x * R * f; PT[n][1] = cy + y * R * f; PT[n][2] = f;
      }
      for (n = 0; n < N; n++) {
        x = PX[n]; y = PY[n]; z = PZ[n];
        if (form === 'wave') y = 0.2 * Math.sin(2.1 * x + t * 0.9) + 0.13 * Math.cos(2.4 * z - t * 0.6);
        q = x * c1 - z * s1; z = x * s1 + z * c1; x = q; q = y * c2 - z * s2; z = y * s2 + z * c2; y = q; f = 3.1 / (3.1 + z);
        TX[n] = cx + x * R * f; TY[n] = cy + y * R * f; Z[n] = f;
      }
    } else if (form === 'gal') {
      /* 銀河: 3本の腕をもつ渦。粒ごとに、腕・中心からの遠さ・ばらつきが決まっている。中心に近いほど速く回る */
      holeS += (hole - holeS) * 0.08; c2 = Math.cos(-0.3 + vy * 0.7); s2 = Math.sin(-0.3 + vy * 0.7); f = Math.max(0.2, Math.min(0.62, 0.4 + vp * 0.5));      /* マウスの位置で、傾きと見下ろす角度が少し変わる */
      for (n = 0; n < N; n++) {
        q = R3[n]; rad = n % 7 === 0 ? 0.25 + q * 4.2 : n % 5 === 0 ? 0.12 + q * q * 0.9 : 0.3 + Math.pow(q, 1.35) * 3.3;      /* 外のまばらな星 / 中心のふくらみ / 腕 */
        th = (n % 3) * 2.0944 + 1.45 * Math.log(0.25 + rad) + (R1[n] - 0.5) * (n % 5 === 0 || n % 7 === 0 ? 6.2832 : 0.5 + 0.5 / (0.4 + rad)) + t * 0.11 / (0.35 + rad * 0.6);
        rad = holeS + rad * R; x = Math.cos(th) * rad; y = Math.sin(th) * rad * f + (R2[n] - 0.5) * R * 0.1;
        TX[n] = cx + x * c2 - y * s2; TY[n] = cy + x * s2 + y * c2;
      }
    } else if (form === 'ks') {
      q = R * (facePts ? 1.55 : 2.2); f = facePts ? 1 : 0;                              /* お顔のときは、金の点が胸もと(ネクタイの結び目)に来るように、上へずらす */
      for (n = 0; n < N; n++) { TX[n] = cx + RX[n] * q; TY[n] = cy + (RY[n] - f) * q; }
    } else if (form === 'gather') {
      for (n = 0; n < N; n++) { TX[n] = cx + (R1[n] - 0.5) * 5; TY[n] = cy + (R2[n] - 0.5) * 5; }
    } else {                                            /* 散らかり・ちり: 画面いっぱいに、ゆっくり漂う */
      q = form === 'chaos' ? 26 : 9;
      for (n = 0; n < N; n++) { TX[n] = R1[n] * W + Math.sin(t * (0.3 + R3[n] * 0.5) + n) * q; TY[n] = R2[n] * H + Math.cos(t * (0.25 + R1[n] * 0.5) + n * 1.7) * q; }
    }
  }

  function step() {
    var n, dx, dy, kq, d2, f, sw = swirl, rr = 96 * 96, on = mx > -999;
    for (n = 0; n < N; n++) {
      dx = TX[n] - X[n]; dy = TY[n] - Y[n]; kq = 0.03 + R3[n] * 0.045;
      VX[n] = (VX[n] + dx * kq - dy * sw * 0.014) * 0.84; VY[n] = (VY[n] + dy * kq + dx * sw * 0.014) * 0.84;
      if (on) { dx = X[n] - mx; dy = Y[n] - my; d2 = dx * dx + dy * dy; if (d2 < rr && d2 > 1) { f = (1 - d2 / rr) / Math.sqrt(d2); VX[n] += (-dy * 0.45 + dx * 0.25) * f; VY[n] += (dx * 0.45 + dy * 0.25) * f; } }      /* 杖の先(マウス)のまわりを、粒が巡る */
      X[n] += VX[n]; Y[n] += VY[n];
    }
    swirl *= 0.955; if (swirl < 0.002) swirl = 0;
  }

  function draw(now) {
    var n, s, c = COL[pTheme] || COL.d, lim1 = Math.floor(N * 0.5), lim2 = Math.floor(N * 0.86), g, r, a = al * calm * ((D3[form] || form === 'tess') && form !== 'board' ? 0.6 : 1), gold = theme === 'l' ? '168,122,30' : '214,171,76';
    var w = winFn ? winFn() : null, t = (now || 0) / 1000, st, x, kk, v, clip, z, u, wv, ph, hasP, low = W < 700, mt, rr2, ed, p1, p2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* 形が変わるあいだ(渦を巻いて集まる・押して呼び集める)は、前のコマを少し残す。粒が、光の尾を引いて構造に収まる。落ち着いたら、毎コマきれいに消す */
    trail = 0;      /* 版35: 光の尾は、やめた */
    if (trail > 0.06) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,' + (1 - 0.7 * trail).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    else ctx.clearRect(0, 0, W, H);
    /* 窓(業務の選択画面): 奥の深い色と、星。業務を替えると、星が横へ流れて、向きが変わる */
    if (w && w[1] < H && w[1] + w[3] > 0 && calm > 0.02) {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = calm;
      ctx.fillStyle = '#070b1b'; ctx.fillRect(w[0], w[1], w[2], w[3]);
      g = ctx.createRadialGradient(w[0] + w[2] * 0.5, w[1] + w[3] * 0.52, 0, w[0] + w[2] * 0.5, w[1] + w[3] * 0.52, Math.max(w[2], w[3]) * 0.62);
      g.addColorStop(0, 'rgba(46,78,170,.42)'); g.addColorStop(0.5, 'rgba(22,38,96,.26)'); g.addColorStop(1, 'rgba(7,11,27,0)');
      ctx.fillStyle = g; ctx.fillRect(w[0], w[1], w[2], w[3]);
      sky += (skyT - sky) * 0.075; v = Math.abs(skyT - sky);
      ctx.save(); ctx.beginPath(); ctx.rect(w[0], w[1], w[2], w[3]); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      for (n = 0; n < STARS.length; n++) {
        st = STARS[n]; kk = 0.25 + st[2] * 0.75; s = st[2] * 1.3 + 0.7;
        x = ((st[0] * w[2] + (sky - vy * 70) * kk) % w[2] + w[2]) % w[2];
        ctx.fillStyle = 'rgba(' + (st[4] ? '236,206,140' : '190,210,255') + ',' + ((0.25 + 0.55 * st[2]) * (0.6 + 0.4 * Math.sin(t * (0.6 + st[3]) + n))).toFixed(3) + ')';
        ctx.fillRect(w[0] + x, w[1] + st[1] * w[3], s + Math.min(46, v * 0.28 * kk), s);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    } else w = null;
    ctx.globalCompositeOperation = pTheme === 'l' ? 'source-over' : 'lighter';
    if (false && form === 'board' && pTheme !== 'l' && a > 0.01 && !hop) {      /* 版32: 淡い光の円すいは、やめた */
      g = ctx.createLinearGradient(P.x, P.y, P.x, P.y + Rs * 1.9);
      g.addColorStop(0, 'rgba(255,232,190,' + (0.15 * a).toFixed(3) + ')'); g.addColorStop(0.5, 'rgba(150,186,255,' + (0.045 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(150,186,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x - Rs * 1.45, P.y + Rs * 1.8); ctx.lineTo(P.x + Rs * 1.45, P.y + Rs * 1.8); ctx.closePath(); ctx.fill();
    }
    clip = clipW && w;
    if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(w[0], w[1], w[2], w[3]); ctx.clip(); }
    if (a > 0.01 && (D3[form] || form === 'tess') && !hop) {      /* 立体の形: 奥はうすく小さく、手前は濃く大きく(遠近で、奥行きが見える) */
      ctx.fillStyle = 'rgba(' + c + ',' + (0.26 * a).toFixed(3) + ')';
      for (n = 0; n < N; n++) if (Z[n] < 0.9) ctx.fillRect(X[n] - 0.55, Y[n] - 0.55, 1.1, 1.1);
      ctx.fillStyle = 'rgba(' + c + ',' + (0.62 * a).toFixed(3) + ')';
      for (n = 0; n < N; n++) if (Z[n] >= 0.9 && Z[n] < 1.12) ctx.fillRect(X[n] - 0.8, Y[n] - 0.8, 1.6, 1.6);
      ctx.fillStyle = 'rgba(' + c + ',' + Math.min(1, a).toFixed(3) + ')';
      for (n = 0; n < N; n++) if (Z[n] >= 1.12) ctx.fillRect(X[n] - 1.15, Y[n] - 1.15, 2.3, 2.3);
      if (false && pTheme !== 'l') {      /* 版32: 粒の構造に足した光(手前のにじむ光・構造を渡る金の光)は、やめた。点だけの、すっきりした構造に戻す */
        /* 手前の粒は、にじむ光になる(ピントの合う距離より手前は、大きく、やわらかく) */
        for (n = 0; n < N; n += low ? 3 : 2) { z = Z[n]; if (z > 1.12) { s = 5 + (z - 1.12) * 24; ctx.globalAlpha = Math.min(0.34, (z - 1.1) * 1.1) * a; ctx.drawImage(SPC, X[n] - s / 2, Y[n] - s / 2, s, s); } }
        /* 光の波: 構造の中を、金の光が渡っていく(形が落ち着いているとき) */
        if (swirl < 0.3) {
          ph = t * 1.25; hasP = form !== 'tess'; kk = low ? 0.978 : 0.97;
          for (n = 0; n < N; n++) {
            u = hasP ? PY[n] * 2.6 + PX[n] * 1.2 + PZ[n] * 0.7 : ED[n] * 0.41 + R3[n] * 1.6;
            wv = Math.sin(u * 1.5 - ph);
            if (wv > kk) { s = 4 + Z[n] * 5.5; ctx.globalAlpha = Math.min(1, (wv - kk) / (1 - kk)) * 0.5 * a; ctx.drawImage(SPW, X[n] - s / 2, Y[n] - s / 2, s, s); }
          }
        }
        ctx.globalAlpha = 1;
      }
      n = N;
    } else if (a > 0.01) {
      var af = a;
      if (form === 'ks' && faceImg && pTheme !== 'l' && !hop) {      /* お顔の星: 粒が集まり終わると、細かな星のお顔が浮かび上がる。動く粒は、その上のきらめきになる */
        faceA += ((swirl < 0.25 ? 1 : 0) - faceA) * 0.035;
        if (faceA > 0.01) { u = Rs * 1.55; ctx.globalAlpha = Math.min(1, faceA * a * 1.1); ctx.drawImage(faceImg, P.x - 0.75 * u, P.y - 2 * u, 1.5 * u, 2 * u); ctx.globalAlpha = 1; }
        af = a * (1 - 0.62 * faceA);
      } else faceA = 0;
      ctx.fillStyle = 'rgba(' + c + ',' + (0.34 * af).toFixed(3) + ')'; s = 1.25;
      for (n = 0; n < lim1; n++) ctx.fillRect(X[n] - 0.6, Y[n] - 0.6, s, s);
      ctx.fillStyle = 'rgba(' + c + ',' + (0.6 * af).toFixed(3) + ')'; s = 1.5;
      for (; n < lim2; n++) ctx.fillRect(X[n] - 0.75, Y[n] - 0.75, s, s);
      ctx.fillStyle = 'rgba(' + c + ',' + Math.min(1, 0.95 * af).toFixed(3) + ')'; s = 2;
      for (; n < N; n++) ctx.fillRect(X[n] - 1, Y[n] - 1, s, s);
      if (pTheme !== 'l' && (form === 'gal' || form === 'ks') && !hop) {
        /* 銀河・KS: ところどころの粒が、にじんで瞬く。銀河の芯には、あたたかい光のふくらみ */
        if (form === 'gal') { s = Rs * 1.5; ctx.globalAlpha = 0.3 * a; ctx.drawImage(SPW, P.x - s / 2, P.y - s / 2, s, s); }
        for (n = 0; n < N; n += low ? 19 : 14) { s = 6 + R3[n] * 9; ctx.globalAlpha = (0.14 + 0.2 * (0.5 + 0.5 * Math.sin(t * (0.9 + R1[n] * 1.6) + n))) * a; ctx.drawImage(n % 37 === 0 ? SPW : SPC, X[n] - s / 2, Y[n] - s / 2, s, s); }
        ctx.globalAlpha = 1;
      }
    }
    if (a > 0.01) {
      if (pTheme !== 'l') {                              /* ところどころに、金の粒 */
        ctx.fillStyle = 'rgba(236,200,120,' + Math.min(1, 0.9 * a).toFixed(3) + ')';
        for (n = 0; n < N; n += 37) ctx.fillRect(X[n] - 1, Y[n] - 1, 2, 2);
      }
      if (form === 'gal' && pTheme !== 'l') {             /* 銀河の中心のふくらみは、あたたかい色(中心は金、腕は青白い。奥行きと温度が出る) */
        ctx.fillStyle = 'rgba(255,232,196,' + (0.42 * a).toFixed(3) + ')';
        for (n = 0; n < N; n += 5) ctx.fillRect(X[n] - 0.7, Y[n] - 0.7, 1.4, 1.4);
      }
      /* 小さな文字の後ろでは、粒をうすくする(ふちは、ぼかして消す。四角い切れ目を見せない) */
      if (avoid && avoid.length) {
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.88)'; ctx.shadowColor = 'rgba(0,0,0,.88)'; ctx.shadowBlur = 9 * dpr;
        for (n = 0; n < avoid.length; n++) ctx.fillRect(aox + avoid[n][0] - 4, aoy + avoid[n][1] - 1, avoid[n][2] + 8, avoid[n][3] + 2);
        ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.globalCompositeOperation = pTheme === 'l' ? 'source-over' : 'lighter';
      }
    }
    /* 構造の角・網の結び目: 形が落ち着くと、はっきり見える */
    vert += (((form === 'tess' || form === 'net') && swirl < 0.25 && !hop ? 1 : 0) - vert) * 0.08;
    if (vert > 0.02 && a > 0.01) {
      ctx.fillStyle = pTheme === 'l' ? 'rgba(18,71,239,' + (vert * a).toFixed(3) + ')' : 'rgba(255,255,255,' + (vert * a).toFixed(3) + ')';
      for (n = 0; n < 16; n++) { ctx.beginPath(); ctx.arc(PT[n][0], PT[n][1], 1.6 + 1.5 * PT[n][2], 0, TAU); ctx.fill(); }
    }
    /* 構造の辺: 結び目どうしを結ぶ線が、うっすら光る(箱の中の箱・網) */
    if (vert > 0.02 && a > 0.01) {
      ed = form === 'tess' ? E : form === 'net' ? LINK : null;
      if (ed) {
        ctx.lineWidth = 1;
        for (n = 0; n < ed.length; n++) {
          p1 = PT[ed[n][0]]; p2 = PT[ed[n][1]];
          ctx.strokeStyle = (pTheme === 'l' ? 'rgba(18,71,239,' : 'rgba(190,212,255,') + (vert * a * 0.2 * (p1[2] + p2[2]) * 0.5).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
        }
      }
    }
    /* 形が替わるとき: 金の点から、光の輪が二つ、奥行きをもって広がる(起点から、構造が組み上がる) */
    mt = ((now || 0) - morphT) / 1100;
    if (mt > 0 && mt < 1 && !hop && a > 0.01 && form !== 'dust' && form !== 'chaos' && ctx.ellipse) {
      for (n = 0; n < 0; n++) {      /* 版32: 形が替わるときの光の輪は、やめた */
        u = mt - n * 0.16; if (u <= 0 || u >= 1) continue;
        rr2 = Rs * (0.15 + 1.9 * (1 - Math.pow(1 - u, 3)));
        ctx.strokeStyle = (pTheme === 'l' ? 'rgba(168,122,30,' : 'rgba(255,232,190,') + ((1 - u) * (1 - u) * (n ? 0.3 : 0.55) * a).toFixed(3) + ')';
        ctx.lineWidth = 0.8 + 3.2 * (1 - u);
        ctx.beginPath(); ctx.ellipse(P.x, P.y, rr2, rr2 * (D3[form] || form === 'gal' ? 0.36 : 1), 0, 0, TAU); ctx.stroke();
      }
    }
    if (clip) ctx.restore();
    /* 起点の点(金) */
    ctx.globalCompositeOperation = 'source-over';
    glow += ((form === 'gather' ? 1.7 : swirl > 0.3 ? 1.3 : 1) - glow) * 0.1;
    r = (W < 700 ? 5.5 : 7.5) * glow * (form === 'gal' ? 1.25 : 1);
    quiet += ((form === 'dust' || hop ? 1 : 0) - quiet) * 0.1; r = r * (1 - quiet) + 4.6 * quiet;   /* 読む場面と、移る途中では、札の頭の点より少し大きい珠に(読んでいる高さへ付いてくる) */
    orb(C.x, C.y, r * (1 + boing * 0.6));
    sparkle();
  }

  /* 金の玉: 光を受けた金の珠。左上に強い照り返しと白い反射、右下に周りから返る光の縁、中は深い金へ。
     紙の上では、紙に落ちる影。速く動くと、進む向きに少し伸び(勢い)、止まると丸に戻る。数秒ごとに、照り返しが「キラッ」と光る */
  /* 金の玉は、輪郭のない、にじんだ光。主役はサイトの中身なので、玉は目を引かない淡さにとどめる。
     紺の上: 白に近い芯から、金の光が外へ溶けていく(まわりに、ごく淡い後光)。紙の上: 紙に染みた、淡い金の灯り。
     読む場面(quiet)では、さらに淡く小さく。銀河などの見せる場面では、芯を少し強くして、十字のごく淡い光条を添える */
  function orb(x, y, r) {
    var lt = theme === 'l', q = quiet, k = 1 - 0.5 * q, g, L;
    if (lt) {
      g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      g.addColorStop(0, 'rgba(198,150,48,' + (0.5 * k).toFixed(3) + ')'); g.addColorStop(0.3, 'rgba(204,158,58,' + (0.26 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(204,158,58,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
      g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.05);
      g.addColorStop(0, 'rgba(255,240,204,' + (0.85 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(236,200,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, TAU); ctx.fill();
      return;
    }
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(x, y, 0, x, y, r * 5.2);                         /* 後光 */
    g.addColorStop(0, 'rgba(255,214,140,' + (0.26 * k).toFixed(3) + ')'); g.addColorStop(0.4, 'rgba(255,206,128,' + (0.09 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,206,128,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5.2, 0, TAU); ctx.fill();
    g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);                           /* 芯: 白に近い光が、金へ溶ける */
    g.addColorStop(0, 'rgba(255,250,236,' + (0.95 * k).toFixed(3) + ')'); g.addColorStop(0.22, 'rgba(255,236,190,' + (0.7 * k).toFixed(3) + ')'); g.addColorStop(0.55, 'rgba(240,196,110,' + (0.26 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(232,186,96,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
    if (q < 0.5) {                                                                /* 見せる場面だけ: 十字の、ごく淡い光条 */
      L = r * 9; k = (1 - q * 2) * 0.2;
      g = ctx.createLinearGradient(x - L, y, x + L, y); g.addColorStop(0, 'rgba(255,232,180,0)'); g.addColorStop(0.5, 'rgba(255,240,206,' + k.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,232,180,0)');
      ctx.fillStyle = g; ctx.fillRect(x - L, y - 0.6, L * 2, 1.2);
      L = r * 6;
      g = ctx.createLinearGradient(x, y - L, x, y + L); g.addColorStop(0, 'rgba(255,232,180,0)'); g.addColorStop(0.5, 'rgba(255,240,206,' + (k * 0.8).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,232,180,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 0.6, y - L, 1.2, L * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  /* 火花(魔法の跡): 金の細い線が、押した所・引き終えた所・お顔が生まれた所から散って、すぐ消える */
  function sparkle() {
    var i, q, k, lt = theme === 'l';
    if (!SP.length) return;
    ctx.globalCompositeOperation = lt ? 'source-over' : 'lighter'; ctx.lineCap = 'round';
    for (i = SP.length - 1; i >= 0; i--) {
      q = SP[i]; q[4] -= 1;
      if (q[4] <= 0) { SP.splice(i, 1); continue; }
      q[2] *= 0.92; q[3] = q[3] * 0.92 + 0.045; q[0] += q[2]; q[1] += q[3]; k = q[4] / q[5];
      ctx.strokeStyle = 'rgba(' + (lt ? '170,122,28' : '255,228,164') + ',' + (k * (lt ? 0.9 : 0.95)).toFixed(3) + ')'; ctx.lineWidth = 0.7 + 1.3 * k;
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - q[2] * 2.4, q[1] - q[3] * 2.4); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* 着いた: 形を替え、粒をその場に置き直して、静かに現す(画面を飛ばさない) */
  function arrive(a) {
    var n;
    hop = 0; partFn = anchorFn; pTheme = theme; Rs = A.R; P.x = C.x; P.y = C.y;
    clipW = !!(a && a.clip); avoid = a && a.avoid || null; aox = a && a.ox || 0; aoy = a && a.oy || 0; hole = a && a.hole || 0; holeS = hole;
    if (pend) { form = pend; alT = ALPHA[form]; pend = null; place(); morphT = performance.now(); }
    aim(performance.now());
    if (false && !reduce && (D3[form] || form === 'tess' || form === 'ks')) {      /* 版32: 星が集まる登場は、やめた。その場に、静かに現れる */      /* 見せる形: 画面じゅうに散った星が、渦を巻いて集まり、組み上がる */
      for (n = 0; n < N; n++) { X[n] = R1[n] * W; Y[n] = R2[n] * H * 1.2 - H * 0.1; VX[n] = 0; VY[n] = 0; }
      swirl = 1; trailT = performance.now() + 900; morphT = performance.now();
    } else {
      for (n = 0; n < N; n++) { X[n] = TX[n] + (R1[n] - 0.5) * 30; Y[n] = TY[n] + (R2[n] - 0.5) * 30; VX[n] = 0; VY[n] = 0; }
      swirl = 0;
    }
  }
  function where() {
    var a = anchorFn ? anchorFn() : null, p;
    if (a) { A.x = a.x; A.y = a.y; A.R = a.R; }
    off.x += -off.x * 0.085; off.y += -off.y * 0.085;
    C.x = A.x + off.x; C.y = A.y + off.y;
    if (hop) {                                          /* 粒は、前の場所で消えていく。金の点だけが、先へ進む */
      p = partFn ? partFn() : null;
      if (p) { P.x = p.x; P.y = p.y; avoid = p.avoid || null; aox = p.ox || 0; aoy = p.oy || 0; clipW = !!p.clip; }
      if (al < 0.03 && Math.abs(off.x) + Math.abs(off.y) < 30) arrive(a);
    } else {
      P.x = C.x; P.y = C.y; Rs += (A.R - Rs) * 0.09;
      if (a) { hole = a.hole || 0; avoid = a.avoid || null; aox = a.ox || 0; aoy = a.oy || 0; clipW = !!a.clip; }
    }
  }
  var idle = 0;      /* 版39: 粒が見えないまま過ぎたコマの数 */
  function frame(now) {
    var gone = hop || form === 'dust', sy = window.pageYOffset, fast = Math.abs(sy - lastSY) > 26;
    raf = requestAnimationFrame(frame);
    lastSY = sy; calm += ((fast ? 0 : 1) - calm) * (fast ? 0.55 : 0.1);
    idle = form === 'dust' && !hop && al < 0.004 ? idle + 1 : 0;
    where(); if (idle < 90) { aim(now); step(); }      /* 版39: 粒が見えない場面(ちり)では、消えきってしばらくしたら、粒の計算を休む。金の点(where と draw)は、そのまま動く。形のある場面に入れば、すぐ再開する */
    al += ((gone ? 0 : alT) - al) * (gone ? 0.2 : 0.07);
    vy += (vyT - vy) * 0.06; vp += (vpT - vp) * 0.06;
    bv += -boing * 0.16; bv *= 0.8; boing += bv;      /* 金の玉の弾み(ばね) */
    draw(now);
  }
  /* 動かさないときの一枚 */
  function still() {
    var n;
    off.x = 0; off.y = 0; hop = 0; partFn = anchorFn; pTheme = theme; where(); Rs = A.R; aim(0);
    for (n = 0; n < N; n++) { X[n] = TX[n]; Y[n] = TY[n]; }
    faceA = form === 'ks' ? 1 : 0; holeS = hole; al = form === 'dust' ? 0 : alT; vert = form === 'tess' || form === 'net' ? 1 : 0; glow = 1; swirl = 0; sky = skyT; calm = 1; quiet = form === 'dust' ? 1 : 0; draw(0);
  }

  window.KSFig = {
    /* 姿を変える。name: chaos, gather, gal, ks, dust, tess, grid, helix, rings, cone, wave, globe, net */
    to: function (name, o) {
      if (!ALPHA[name]) return;
      if (hop && !reduce) { pend = name; return; }      /* 移る途中なら、着いてから替える */
      form = name; alT = ALPHA[name]; swirl = o && o.swirl != null ? o.swirl : 1;
      if (false && !reduce && swirl >= 0.9 && name !== 'chaos' && name !== 'dust') {      /* 版32: 吸い込みは、やめた */      /* 粒は、いちど金の点へ吸い込まれてから、新しい構造へ組み上がる */
        var n, dx, dy;
        for (n = 0; n < N; n++) { dx = P.x - X[n]; dy = P.y - Y[n]; VX[n] += dx * 0.085 - dy * 0.045; VY[n] += dy * 0.085 + dx * 0.045; }
        trailT = performance.now() + 700; morphT = performance.now();
      }
      place(); if (reduce) still();
    },
    /* 起点の置き場所を返す関数を渡す(場面ごと)。遠くへ移るときは、粒は消えて、着いた先で現れる */
    anchor: function (fn, jump) {
      var a = fn(), d;
      if (jump || !anchorFn || reduce) { off.x = 0; off.y = 0; Rs = a.R; anchorFn = fn; partFn = fn; hop = 0; pend = null; pTheme = theme; }
      else {
        d = Math.abs(C.x - a.x) + Math.abs(C.y - a.y); off.x = C.x - a.x; off.y = C.y - a.y; anchorFn = fn;
        if (hop || d > 150) hop = 1; else { partFn = fn; pTheme = theme; }
      }
      if (reduce) still();
    },
    theme: function (t) { theme = t; if (reduce) still(); },
    /* 窓の場所を返す関数(業務の選択画面)。[左, 上, 幅, 高さ]、見えないときは null */
    window: function (fn) { winFn = fn; },
    /* 窓の上のマウスで、見る向きが少し変わる */
    view: function (y, p) { vyT = y; vpT = p; },
    /* 業務を替えたとき: 星が流れる(向きを変えた感じ) */
    turn: function (d) { skyT += d * 240; },
    /* 押した場所へ、まわりの粒を呼び集めて、渦を巻かせる(そのあと、粒はもとの構造へ戻る)。金の点も、一瞬ふくらむ */
    blast: function (x, y, power) {
      var n, dx, dy, d2, d, kk, rad = 300, rr = rad * rad, pw = (power || 1) * 34;
      if (reduce) return;
      for (n = 0; n < N; n++) {
        dx = X[n] - x; dy = Y[n] - y; d2 = dx * dx + dy * dy;
        if (d2 < rr) { d = Math.sqrt(d2) + 0.01; kk = 1 - d / rad; kk = kk * kk * pw * (0.6 + R3[n] * 0.8); VX[n] += -dx / d * kk * 0.8 - dy / d * kk * 0.55; VY[n] += -dy / d * kk * 0.8 + dx / d * kk * 0.55; }      /* 集めて、巻く */
      }
      glow = 1.9; trailT = performance.now() + 420;      /* 呼び集めるあいだも、光の尾 */
    },
    point: function () { return { x: C.x, y: C.y }; },
    /* 金の玉が、ぽんと弾む(ニュッ) */
    pop: function (k) { if (!reduce) bv += 0.32 * (k || 1); },
    /* 火花を散らす(x, y は画面の上の場所。n は本数、power は勢い) */
    sparks: function (x, y, n, power) {
      var i, a, v, life;
      return;      /* 版30: 火花は、やめた(ごちゃごちゃさせない)。呼ぶ側は、そのままでよい */
      if (reduce) return;
      for (i = 0; i < n; i++) { a = Math.random() * TAU; v = (1.4 + Math.random() * 3.6) * (power || 1); life = 16 + Math.floor(Math.random() * 16); SP.push([x, y, Math.cos(a) * v, Math.sin(a) * v - 0.6, life, life]); }
      if (SP.length > 90) SP.splice(0, SP.length - 90);
    },
    redraw: function () { if (reduce) still(); }
  };

  size(); alloc();
  window.addEventListener('resize', function () { size(); place(); if (reduce) still(); });
  if (!reduce) {
    window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { mx = e.clientX; my = e.clientY; } }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { mx = -9999; });
    raf = requestAnimationFrame(frame);
  } else window.addEventListener('scroll', function () { still(); }, { passive: true });
})();
