/*!
 * 언틸리티 — 살아 있는 배경, 웹판.
 *
 * 앱(`AlertBackdrop` + `LivingSim`)의 구조를 그대로 옮겼다:
 *   1) 굽기(bake)   — 하늘·광원·큰 구조물을 오프스크린에 한 번만 그린다. 매 프레임 비용 0.
 *   2) 살아 있는 층 — 먼지·별·새를 매 프레임 시뮬한다. 포인터에 반응하는 건 이 층이다.
 *   3) 덧입히기     — 그레인과 비네트.
 * 두 층은 같은 카메라(parallax)를 본다.
 *
 * 색은 `Untillity/BackdropTheme.swift` 의 sRGB 0..1 값을 **그대로** 옮겼다. hex 로 반올림하지 않는다.
 */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- 색 */

  const rgb = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a === undefined ? 1 : a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hex = (c) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

  /** BackdropTheme.swift 의 `palette(_ tone:)` 표. */
  const THEMES = {
    ember: {
      name: '엠버',
      scene: '화로 앞',
      blurb: '따뜻한 어둠 · 열기 아지랑이와 떠오르는 불씨',
      light: false,
      font: 'rounded',
      tones: {
        ahead:    { base: [[0.09, 0.08, 0.11], [0.16, 0.11, 0.13]], glow: [[0.55, 0.20, 0.24], [0.30, 0.18, 0.42]], accent: [1.00, 0.72, 0.16] },
        imminent: { base: [[0.12, 0.07, 0.08], [0.22, 0.10, 0.10]], glow: [[0.72, 0.24, 0.16], [0.48, 0.14, 0.24]], accent: [1.00, 0.66, 0.14] },
        started:  { base: [[0.15, 0.06, 0.07], [0.28, 0.09, 0.09]], glow: [[0.85, 0.30, 0.13], [0.62, 0.11, 0.16]], accent: [1.00, 0.55, 0.20] },
      },
      glowAlpha: [0.55, 0.50],
      ink: [1, 1, 1],
      onAccent: [0.13, 0.08, 0.05],
      living: { motes: 320, stars: 14, birds: false, flow: [0.06, 1.0], dust: [1.0, 0.70, 0.38], star: [1.0, 0.90, 0.68],
                dustAlpha: 0.85, gust: 175, drift: 50, parallax: 58, swirlR: 500, swirl: 52, pull: 13, grain: 0.05, vignette: 0.16 },
    },
    astra: {
      name: '아스트라',
      scene: '발광 성운',
      blurb: '거의 검정 · 청록 공동과 금빛 먼지 벽, 빽빽한 별밭',
      light: false,
      font: 'default',
      tones: {
        ahead:    { base: [[0.028, 0.026, 0.024], [0.066, 0.056, 0.042]], glow: [[0.34, 0.82, 0.92], [0.86, 0.66, 0.36]], accent: [0.66, 0.92, 0.97] },
        imminent: { base: [[0.038, 0.030, 0.020], [0.088, 0.064, 0.040]], glow: [[0.98, 0.80, 0.46], [0.86, 0.60, 0.30]], accent: [1.00, 0.84, 0.50] },
        started:  { base: [[0.048, 0.026, 0.018], [0.108, 0.056, 0.038]], glow: [[1.00, 0.58, 0.36], [0.80, 0.42, 0.24]], accent: [1.00, 0.64, 0.42] },
      },
      glowAlpha: [0.50, 0.38],
      ink: [1, 1, 1],
      onAccent: [0.03, 0.06, 0.08],
      living: { motes: 900, stars: 34, birds: false, flow: [0.92, 0.39], dust: [0.80, 0.76, 0.70], star: [0.96, 0.94, 0.90],
                dustAlpha: 0.9, gust: 165, drift: 60, parallax: 64, swirlR: 540, swirl: 56, pull: 14, grain: 0.06, vignette: 0.18 },
    },
    fable: {
      name: '페이블',
      scene: '저녁 하늘',
      blurb: '밑면이 노을에 물든 구름 · 지나가는 새 무리 · 달',
      light: true,
      font: 'serif',
      tones: {
        ahead:    { base: [[0.30, 0.32, 0.66], [0.76, 0.52, 0.84]], glow: [[1.00, 0.78, 0.56], [1.00, 0.55, 0.62]], accent: [1.00, 0.97, 0.90] },
        imminent: { base: [[0.34, 0.28, 0.62], [0.84, 0.48, 0.76]], glow: [[1.00, 0.70, 0.52], [1.00, 0.48, 0.60]], accent: [1.00, 0.97, 0.90] },
        started:  { base: [[0.40, 0.22, 0.54], [0.92, 0.46, 0.62]], glow: [[1.00, 0.62, 0.46], [1.00, 0.42, 0.58]], accent: [1.00, 0.97, 0.90] },
      },
      glowAlpha: [0.90, 0.78],
      ink: [1.00, 0.98, 0.94],
      onAccent: [0.34, 0.20, 0.46],
      living: { motes: 240, stars: 12, birds: true, flow: [0.55, 0.83], dust: [1.0, 0.95, 0.82], star: [1.0, 0.97, 0.90],
                dustAlpha: 0.62, gust: 150, drift: 40, parallax: 54, swirlR: 480, swirl: 50, pull: 12, grain: 0.035, vignette: 0.12 },
    },
  };

  const TONES = ['ahead', 'imminent', 'started'];
  const APRICOT = [1.0, 0.76, 0.58];

  /** 테마의 CSS 변수 묶음. 페이지가 배경 색에 맞춰 글자색을 고를 때 쓴다. */
  function tokens(theme, tone) {
    const t = THEMES[theme], p = t.tones[tone || 'ahead'];
    return {
      '--sky-top': hex(p.base[0]), '--sky-bottom': hex(p.base[1]),
      '--glow-a': hex(p.glow[0]), '--glow-b': hex(p.glow[1]),
      '--accent': hex(p.accent), '--ink': hex(t.ink), '--on-accent': hex(t.onAccent),
    };
  }

  /* ------------------------------------------------------------ 난수 */

  // 시드 난수 — 새로고침해도 같은 하늘이 나와야 한다.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* -------------------------------------------------------- 구운 그림 */

  /** 하늘 그라디언트. 페이블만 수평선에 살구 띠가 하나 더 있다 (FableTheme.sky). */
  function paintSky(g, w, h, theme, p) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    if (theme === 'fable') {
      grad.addColorStop(0, rgb(p.base[0]));
      grad.addColorStop(0.62, rgb(p.base[1]));
      grad.addColorStop(1, rgb(mix(p.base[1], APRICOT, 0.55)));
    } else {
      grad.addColorStop(0, rgb(p.base[0]));
      grad.addColorStop(1, rgb(p.base[1]));
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }

  function radial(g, x, y, r, color, alpha, stops) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    (stops || [[0, 1], [0.45, 0.42], [1, 0]]).forEach(([p, a]) => gr.addColorStop(p, rgb(color, alpha * a)));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** 엠버 — 아래에서 올라오는 화로 빛, 위쪽의 식은 빛덩이, 열기 아지랑이. */
  function bakeEmber(g, w, h, p, alpha, rand) {
    const hearth = Math.min(w, h) * 1.15;
    radial(g, w * 0.46, h * 1.08, hearth, p.glow[0], alpha[0], [[0, 1], [0.35, 0.5], [0.7, 0.14], [1, 0]]);
    radial(g, w * 0.82, h * 0.18, Math.min(w, h) * 0.72, p.glow[1], alpha[1] * 0.75);
    radial(g, w * 0.08, h * 0.62, Math.min(w, h) * 0.55, p.glow[1], alpha[1] * 0.42);
    // 아지랑이 — 바닥에서 올라오는 세로 결. 낮은 대비로 (세면 연기가 아니라 커튼으로 읽힌다).
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 13; i++) {
      const x = rand() * w, bw = 140 + rand() * 320, bh = h * (0.30 + rand() * 0.45);
      const gr = g.createLinearGradient(0, h, 0, h - bh);
      gr.addColorStop(0, rgb(p.glow[0], 0.035 + rand() * 0.035));
      gr.addColorStop(1, rgb(p.glow[0], 0));
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, h - bh * 0.42, bw * 0.5, bh * 0.58, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  /** 아스트라 — 청록 공동은 **글자 컬럼 바깥 오른쪽**에 (cavityCenter 0.74). 금빛 먼지 벽이 그것을 감싼다. */
  function bakeAstra(g, w, h, p, alpha, rand) {
    const cx = w * 0.74, cy = h * 0.5, R = Math.min(w, h);
    g.save();
    g.globalCompositeOperation = 'lighter';
    // 금빛 벽 — 덩어리를 여러 개 겹쳐 결을 만든다.
    for (let i = 0; i < 64; i++) {
      const a = rand() * Math.PI * 2, d = R * (0.34 + rand() * 0.60);
      const x = cx + Math.cos(a) * d * 1.22, y = cy + Math.sin(a) * d * 0.90;
      radial(g, x, y, R * (0.09 + rand() * 0.26), p.glow[1], alpha[1] * (0.07 + rand() * 0.16));
    }
    // 공동 — 안쪽이 밝고 가장자리가 어둡다.
    radial(g, cx, cy, R * 0.46, p.glow[0], alpha[0] * 0.95, [[0, 0.85], [0.3, 0.55], [0.62, 0.18], [1, 0]]);
    radial(g, cx - R * 0.06, cy - R * 0.05, R * 0.22, p.glow[0], alpha[0] * 0.7);
    g.restore();
    // 공동을 파먹는 어두운 결 — 곱하기로 덮는다.
    g.save();
    g.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 12; i++) {
      const a = rand() * Math.PI * 2, d = R * (0.16 + rand() * 0.46);
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8;
      const r = R * (0.05 + rand() * 0.15);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(4,4,5,${0.16 + rand() * 0.18})`);
      gr.addColorStop(1, 'rgba(4,4,5,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
  }

  /** 페이블 — 해는 수평선 아래. 원반은 없고 광채만. 구름은 **밑면이 밝다**. 박명광선은 위에서 비스듬히. */
  function bakeFable(g, w, h, p, alpha, rand) {
    const S = Math.min(w, h);
    const sunX = w * 0.30, sunY = h * 1.04;
    g.save();
    g.globalCompositeOperation = 'lighter';
    radial(g, sunX, sunY, S * 1.35, p.glow[0], alpha[0] * 0.5, [[0, 0.75], [0.3, 0.30], [0.65, 0.08], [1, 0]]);
    radial(g, w * 0.88, h * 0.78, S * 0.66, p.glow[1], alpha[1] * 0.22);
    // 박명광선 — 왼쪽 위에서 비스듬히. **아주 옅게** (세면 커튼으로 읽힌다).
    for (let i = 0; i < 4; i++) {
      const x0 = w * (0.06 + i * 0.13), spread = w * (0.035 + rand() * 0.055);
      const gr = g.createLinearGradient(x0, 0, x0 + w * 0.18, h * 0.9);
      gr.addColorStop(0, rgb([1, 1, 1], 0.030 + rand() * 0.018));
      gr.addColorStop(0.75, rgb([1, 1, 1], 0.012));
      gr.addColorStop(1, rgb([1, 1, 1], 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x0, -h * 0.1); g.lineTo(x0 + spread, -h * 0.1);
      g.lineTo(x0 + w * 0.26 + spread * 2.2, h * 1.1); g.lineTo(x0 + w * 0.26, h * 1.1);
      g.closePath(); g.fill();
    }
    g.restore();

    // 구름 한 덩이. 밑면이 노을에 물들고 윗면은 하늘색으로 죽는다. 대비는 낮게.
    const cloud = (cx, cy, scale, strength, warmth) => {
      const puffs = 6 + Math.floor(rand() * 6);
      const lit = mix([1, 0.97, 0.94], APRICOT, warmth);
      const shade = mix([0.92, 0.88, 0.95], p.base[1], 0.55);
      for (let i = 0; i < puffs; i++) {
        const k = i / (puffs - 1) - 0.5;
        const px = cx + k * scale * 2.1 + (rand() - 0.5) * scale * 0.4;
        const py = cy + Math.abs(k) * scale * 0.34 + (rand() - 0.5) * scale * 0.18;
        const r = scale * (0.55 + rand() * 0.65) * (1 - Math.abs(k) * 0.45);
        const gr = g.createRadialGradient(px, py + r * 0.42, r * 0.06, px, py, r * 1.08);
        gr.addColorStop(0, rgb(lit, strength));
        gr.addColorStop(0.42, rgb(mix(lit, shade, 0.5), strength * 0.62));
        gr.addColorStop(0.78, rgb(shade, strength * 0.22));
        gr.addColorStop(1, rgb(shade, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(px, py, r, r * 0.60, 0, 0, Math.PI * 2);
        g.fill();
      }
    };
    // 높은 새털구름 — 옅고 넓게
    cloud(w * 0.24, h * 0.13, S * 0.10, 0.16, 0.15);
    cloud(w * 0.70, h * 0.09, S * 0.09, 0.14, 0.15);
    // 달 — 구름 **뒤에** 놓으려고 여기서 그린다.
    const mx = w * 0.815, my = h * 0.175, mr = S * 0.032;
    radial(g, mx, my, mr * 6, [1, 0.97, 0.92], 0.13);
    g.fillStyle = 'rgba(255,252,243,0.90)';
    g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    // 중경 구름
    cloud(w * 0.86, h * 0.19, S * 0.075, 0.72, 0.30);
    cloud(w * 0.58, h * 0.36, S * 0.052, 0.28, 0.35);
    cloud(w * 0.14, h * 0.31, S * 0.048, 0.22, 0.30);
    // 수평선 구름 띠 — 해가 밑에서 비추므로 가장 따뜻하다
    cloud(w * 0.44, h * 0.88, S * 0.095, 0.55, 0.72);
    cloud(w * 0.06, h * 0.94, S * 0.085, 0.45, 0.70);
    cloud(w * 0.82, h * 0.97, S * 0.080, 0.38, 0.62);
    // 수평선 안개 — 아래쪽을 한 번 더 데운다
    const haze = g.createLinearGradient(0, h, 0, h * 0.62);
    haze.addColorStop(0, rgb(mix(APRICOT, [1, 1, 1], 0.25), 0.22));
    haze.addColorStop(1, rgb(APRICOT, 0));
    g.fillStyle = haze;
    g.fillRect(0, h * 0.62, w, h * 0.38);
  }

  /**
   * 별밭. **살아 있는 층이 아니라 구운 층이다** — 아스트라는 별이 16,000개라 매 프레임 그릴 수 없다.
   * 반짝이는 큰 별 몇 개만 살아 있는 층이 맡는다.
   */
  function bakeStars(g, w, h, density, color, rand) {
    const n = Math.round((w * h) / 1600 * density);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x = rand() * w, y = rand() * h;
      const u = rand();
      const r = u > 0.985 ? 1.5 + rand() * 1.1 : u > 0.88 ? 0.8 + rand() * 0.5 : 0.35 + rand() * 0.35;
      const a = (u > 0.985 ? 0.95 : u > 0.88 ? 0.55 : 0.22) * (0.5 + rand() * 0.5);
      g.fillStyle = rgb(mix(color, [1, 1, 1], rand() * 0.5), a);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  /** 글자 뒤 주머니(scrim). 방사형 — 가운데가 짙고 가장자리는 투명하다. */
  function bakeScrim(g, w, h, theme, p) {
    const c = theme === 'fable' ? mix(p.base[1], [0, 0, 0], 0.5)
            : theme === 'astra' ? mix(p.base[0], [0, 0, 0], 0.7)
            : mix(p.base[0], [0, 0, 0], 0.6);
    const a = theme === 'fable' ? 0.50 : theme === 'astra' ? 0.42 : 0.60;
    const r = Math.max(w, h) * 0.62;
    const gr = g.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, r);
    gr.addColorStop(0, rgb(c, a));
    gr.addColorStop(0.55, rgb(c, a * 0.72));
    gr.addColorStop(1, rgb(c, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }

  /* ------------------------------------------------------- 작은 그림들 */

  function moteSprite(color, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, rgb(color, 1));
    gr.addColorStop(0.35, rgb(color, 0.55));
    gr.addColorStop(1, rgb(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function starSprite(color, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const m = size / 2;
    const gr = g.createRadialGradient(m, m, 0, m, m, m * 0.28);
    gr.addColorStop(0, rgb(color, 1));
    gr.addColorStop(1, rgb(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    // 네 갈래 빛살
    g.globalCompositeOperation = 'lighter';
    [[1, 0], [0, 1]].forEach(([dx, dy]) => {
      const lg = g.createLinearGradient(m - m * dx, m - m * dy, m + m * dx, m + m * dy);
      lg.addColorStop(0, rgb(color, 0));
      lg.addColorStop(0.5, rgb(color, 0.75));
      lg.addColorStop(1, rgb(color, 0));
      g.fillStyle = lg;
      g.fillRect(m - (dx ? m : 1.1), m - (dy ? m : 1.1), dx ? size : 2.2, dy ? size : 2.2);
    });
    return c;
  }

  function grainTile(strength) {
    const n = 220;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const img = g.createImageData(n, n);
    const r = rng(7);
    for (let i = 0; i < n * n; i++) {
      const v = 128 + (r() - 0.5) * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = Math.round(strength * 255);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* ----------------------------------------------------------- 엔진 */

  function createBackdrop(canvas, opts) {
    opts = opts || {};
    let theme = opts.theme || 'ember';
    let tone = opts.tone || 'ahead';
    const scrim = opts.scrim !== false;
    const seed = opts.seed || 20260918;
    const quality = opts.quality || 1;        // 0.6 이면 먼지 60%
    const interactive = opts.interactive !== false;

    const ctx = canvas.getContext('2d', { alpha: false });
    let W = 0, H = 0, dpr = 1, pad = 0;
    let baked = null, grain = null, grainPattern = null, sprites = null;
    let motes = [], stars = [], birds = [];
    let pointer = { x: 0.5, y: 0.5, has: false };   // 0..1
    let cam = { x: 0, y: 0 };                        // 현재 카메라 (부드럽게 따라간다)
    let raf = 0, last = 0, t = 0, running = false;
    let reduced = false;
    try {
      reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { /* 지원 안 하면 그냥 움직인다 */ }

    function cfg() { return THEMES[theme].living; }
    function pal() { return THEMES[theme].tones[tone]; }

    function bake() {
      const t0 = THEMES[theme], p = pal();
      pad = Math.round(Math.max(24, cfg().parallax * 1.3));
      const bw = W + pad * 2, bh = H + pad * 2;
      baked = document.createElement('canvas');
      baked.width = Math.round(bw * dpr);
      baked.height = Math.round(bh * dpr);
      const g = baked.getContext('2d');
      g.scale(dpr, dpr);
      const rand = rng(seed + theme.length * 977);
      paintSky(g, bw, bh, theme, p);
      if (theme === 'ember') {
        bakeStars(g, bw, bh, 0.35, cfg().star, rand);
        bakeEmber(g, bw, bh, p, t0.glowAlpha, rand);
      } else if (theme === 'astra') {
        // 별밭이 먼저다 — 성운이 그 위를 덮어야 깊이가 생긴다.
        bakeStars(g, bw, bh, 2.6, cfg().star, rand);
        bakeAstra(g, bw, bh, p, t0.glowAlpha, rand);
        bakeStars(g, bw, bh, 0.5, cfg().star, rand);   // 성운 앞의 근경 별 몇 개
      } else {
        bakeFable(g, bw, bh, p, t0.glowAlpha, rand);
        bakeStars(g, bw, bh, 0.18, cfg().star, rand);  // 저녁이라 별은 아주 성기다
      }
      if (scrim) bakeScrim(g, bw, bh, theme, p);
      // 비네트
      const v = g.createRadialGradient(bw / 2, bh / 2, Math.min(bw, bh) * 0.32, bw / 2, bh / 2, Math.max(bw, bh) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(0,0,0,${cfg().vignette})`);
      g.fillStyle = v;
      g.fillRect(0, 0, bw, bh);
    }

    function seedLiving() {
      const c = cfg(), rand = rng(seed ^ 0x9e3779b9);
      // 밀도를 화면 넓이에 맞춘다. 앱의 수치는 1920×1080 기준이다 —
      // 작은 캔버스에 그대로 뿌리면 먼지가 아니라 눈보라가 된다 (실측).
      const area = Math.max(0.12, (W * H) / (1920 * 1080));
      const n = Math.max(24, Math.round(c.motes * quality * Math.min(1.25, area)));
      motes = new Array(n);
      for (let i = 0; i < n; i++) {
        motes[i] = {
          x: rand(), y: rand(),
          r: 0.35 + rand() * rand() * (theme === 'astra' ? 1.0 : 1.6),  // 큰 것이 드물게
          a: 0.12 + rand() * 0.6,
          sp: 0.25 + rand() * 1.0,
          z: 0.35 + rand() * 0.65,        // 시차 깊이
          ph: rand() * Math.PI * 2,
        };
      }
      const sn = Math.max(4, Math.round(c.stars * Math.min(1.2, area)));
      stars = new Array(sn);
      for (let i = 0; i < sn; i++) {
        stars[i] = { x: rand(), y: rand() * 0.8, s: 14 + rand() * 30, a: 0.3 + rand() * 0.6, ph: rand() * Math.PI * 2, sp: 0.4 + rand() * 0.9 };
      }
      birds = [];
      if (c.birds) {
        const flock = 9;
        for (let i = 0; i < flock; i++) {
          const k = i - (flock - 1) / 2;
          birds.push({ x: 0.5 + k * 0.035 + (rand() - 0.5) * 0.02,
                       y: 0.07 + Math.abs(k) * 0.012 + rand() * 0.03,
                       s: 0.55 + rand() * 0.4, ph: rand() * Math.PI * 2 });
        }
      }
      const cc = cfg();
      sprites = {
        dust: moteSprite(cc.dust, 24),
        star: starSprite(cc.star, 64),
        touch: moteSprite(theme === 'ember' ? [1.0, 0.86, 0.62] : theme === 'astra' ? [0.84, 0.96, 1.0] : [1.0, 0.99, 0.94], 24),
      };
      grain = grainTile(cc.grain); grainPattern = null;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      if (w === W && h === H && baked) return;
      W = w; H = h;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bake();
      seedLiving();   // 밀도가 넓이에 달려 있으므로 크기가 바뀌면 다시 뿌린다
    }

    function frame(now) {
      if (!running) return;
      raf = global.requestAnimationFrame(frame);
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      t += dt;
      draw(dt);
    }

    function draw(dt) {
      const c = cfg();
      // 카메라 — 포인터를 부드럽게 따라간다.
      const tx = (pointer.x - 0.5) * -2, ty = (pointer.y - 0.5) * -2;
      cam.x += (tx - cam.x) * Math.min(1, dt * 3.2);
      cam.y += (ty - cam.y) * Math.min(1, dt * 3.2);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(baked, -pad + cam.x * c.parallax * 0.45, -pad + cam.y * c.parallax * 0.45, W + pad * 2, H + pad * 2);

      const px = pointer.x * W, py = pointer.y * H;
      ctx.globalCompositeOperation = 'lighter';

      // --- 별. 반짝임은 위상만 다른 사인.
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        const x = s.x * W + cam.x * c.parallax * 0.8, y = s.y * H + cam.y * c.parallax * 0.8;
        ctx.globalAlpha = s.a * tw * 0.9;
        ctx.drawImage(sprites.star, x - s.s / 2, y - s.s / 2, s.s, s.s);
      }

      // --- 먼지. 흐름 + 포인터 소용돌이 + 끌림.
      const fx = c.flow[0], fy = c.flow[1];
      const swirlR = c.swirlR, reach = c.gust;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        // 흐름 (화면 비율 기준 → 픽셀)
        m.x += (fx * m.sp * c.drift * dt) / W;
        m.y -= (fy * m.sp * c.drift * dt) / H;
        // 느린 표류
        m.x += Math.sin(t * 0.21 + m.ph) * 0.00012 * m.sp;
        if (m.y < -0.05) { m.y = 1.05; m.x = (m.x + 0.37) % 1; }
        if (m.x > 1.05) m.x -= 1.1; else if (m.x < -0.05) m.x += 1.1;

        let x = m.x * W, y = m.y * H;
        // 포인터 반응 — 소용돌이(접선)와 끌림(반지름)
        if (pointer.has) {
          const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
          const d = Math.sqrt(d2) + 0.0001;
          if (d < swirlR) {
            const k = (1 - d / swirlR);
            const kk = k * k;
            const tangential = (c.swirl * kk) / d;
            x += -dy * tangential * 0.06;
            y += dx * tangential * 0.06;
            if (d < reach) {
              const pk = (1 - d / reach);
              x -= (dx / d) * c.pull * pk * pk * 0.9;
              y -= (dy / d) * c.pull * pk * pk * 0.9;
            }
          }
        }
        x += cam.x * c.parallax * m.z;
        y += cam.y * c.parallax * m.z;
        const near = pointer.has && Math.abs(x - px) < 90 && Math.abs(y - py) < 90;
        const sz = 2.0 + m.r * 4.0;      // 먼지다. 보케가 아니다
        ctx.globalAlpha = m.a * c.dustAlpha * (0.55 + 0.45 * Math.sin(t * 0.8 * m.sp + m.ph));
        ctx.drawImage(near ? sprites.touch : sprites.dust, x - sz / 2, y - sz / 2, sz, sz);
      }

      // --- 새 (페이블만). 실루엣이라 lighter 가 아니다.
      if (birds.length) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = 'rgba(30,20,44,0.8)';
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        const march = (t * 0.016) % 1.4;
        for (let i = 0; i < birds.length; i++) {
          const b = birds[i];
          const x = ((b.x + march) % 1.3 - 0.15) * W + cam.x * c.parallax * 0.9;
          const y = b.y * H + Math.sin(t * 0.5 + b.ph) * 6 + cam.y * c.parallax * 0.9;
          const s = 3.6 * b.s, flap = Math.sin(t * 6 + b.ph) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.moveTo(x - s, y + s * flap * 0.7);
          ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.35, x, y);
          ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.35, x + s, y + s * flap * 0.7);
          ctx.stroke();
        }
      }

      // --- 그레인
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.5;
      if (!grainPattern) grainPattern = ctx.createPattern(grain, 'repeat');
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    /* ---------------------------------------------------- 바깥 배선 */

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      pointer.x = (p.clientX - r.left) / r.width;
      pointer.y = (p.clientY - r.top) / r.height;
      pointer.has = true;
    };
    const onLeave = () => { pointer.has = false; pointer.x = 0.5; pointer.y = 0.5; };

    let ro = null;
    if (global.ResizeObserver) {
      ro = new ResizeObserver(() => { resize(); if (!running) draw(0); });
      ro.observe(canvas);
    } else {
      global.addEventListener('resize', resize);
    }

    if (interactive) {
      const host = opts.pointerTarget || canvas;
      host.addEventListener('pointermove', onMove, { passive: true });
      host.addEventListener('pointerleave', onLeave, { passive: true });
      host.addEventListener('touchmove', onMove, { passive: true });
    }

    // 화면 밖이면 멈춘다 — 배터리.
    let io = null;
    if (global.IntersectionObserver) {
      io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? api.start() : api.stop())); }, { threshold: 0.01 });
      io.observe(canvas);
    }

    const api = {
      get theme() { return theme; },
      get tone() { return tone; },
      setTheme(next, keepSeed) {
        if (!THEMES[next] || next === theme) return;
        theme = next;
        bake();
        if (!keepSeed) seedLiving();
        if (!running) draw(0);
      },
      setTone(next) {
        if (TONES.indexOf(next) < 0 || next === tone) return;
        tone = next;
        bake();
        if (!running) draw(0);
      },
      /** 0..1 로 긴박도를 준다. 0 여유 · 0.5 임박 · 1 시작됨. */
      setUrgency(u) { api.setTone(u > 0.66 ? 'started' : u > 0.33 ? 'imminent' : 'ahead'); },
      setPointer(nx, ny) { pointer.x = nx; pointer.y = ny; pointer.has = true; },
      start() {
        if (running) return;
        running = true; last = 0;
        if (reduced) { draw(0.016); running = false; return; }
        raf = global.requestAnimationFrame(frame);
      },
      stop() { running = false; if (raf) global.cancelAnimationFrame(raf); raf = 0; },
      resize,
      destroy() {
        api.stop();
        if (ro) ro.disconnect(); else global.removeEventListener('resize', resize);
        if (io) io.disconnect();
        if (interactive) {
          const host = opts.pointerTarget || canvas;
          host.removeEventListener('pointermove', onMove);
          host.removeEventListener('pointerleave', onLeave);
          host.removeEventListener('touchmove', onMove);
        }
      },
      tokens: () => tokens(theme, tone),
    };

    resize();
    draw(0);
    if (opts.autoStart !== false) api.start();
    return api;
  }

  global.UNBackdrop = { THEMES, TONES, createBackdrop, tokens, hex, rgb, mix };
})(window);
