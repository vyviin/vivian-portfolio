/**
 * VIVIAN YANG PORTFOLIO — script.js
 *
 * All pages:
 *   • Day/night theme toggle → persisted via localStorage, swaps CSS vars
 *   • Nav                    → blurred surface once scrolled; vy. letters lift on hover
 *   • Link clicks            → particle page transition (headline → particles → next headline)
 *
 * Home page only:
 *   • 杨 glyph mosaic         → hundreds of tiny 杨s sampled from a real
 *     rendered glyph, each a spring-back point that reacts to the cursor
 *     and settles; a soft brown-noise water murmur swells with proximity
 *     + cursor speed; click the theme toggle for a one-shot "gust"
 *   • Water                  → the hero is a still surface; moving the cursor
 *     leaves a faint ripple wake (wave simulation, lit like a pool floor)
 */

(function () {
  'use strict';

  const body    = document.body;
  const isHome  = body.classList.contains('home-page');
  // Visitors who ask their OS for reduced motion get no automatic motion
  // (no ambient sway, no load/theme gusts). Motion they cause themselves —
  // pushing the cursor through 杨, tapping it — still works.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let triggerGust = null; // assigned by initGlyphMosaic() on the home page
  let water = null;       // assigned by initWater() on the home page; the mosaic reads its slope

  /* ===================================================
     1.  THEME TOGGLE  (day/night, site-wide, persisted)
  =================================================== */
  function initThemeToggle() {
    const KEY  = 'theme';
    const root = document.documentElement;
    const toggle = document.getElementById('themeToggle');

    function isNight() { return root.getAttribute('data-theme') === 'night'; }

    function applyIcon() {
      if (!toggle) return;
      const icon = toggle.querySelector('.theme-toggle-icon');
      if (icon) icon.textContent = isNight() ? '☀' : '☾';
      toggle.setAttribute('aria-pressed', String(isNight()));
    }

    function setTheme(night) {
      if (night) root.setAttribute('data-theme', 'night');
      else root.removeAttribute('data-theme');
      try { localStorage.setItem(KEY, night ? 'night' : 'day'); } catch (e) {}
      applyIcon();
    }

    applyIcon(); // sync icon with whatever the inline head-script already set

    if (!toggle) return;
    toggle.addEventListener('click', () => {
      setTheme(!isNight());
      if (isHome && typeof triggerGust === 'function') {
        triggerGust();
      }
    });
  }

  /* ===================================================
     2.  杨 GLYPH MOSAIC  (home hero only)
  =================================================== */
  let audioCtx = null;
  let masterShelf = null;

  /* Create the AudioContext as early as possible (page load, no gesture
     needed). Browsers still enforce their own autoplay policy underneath
     this — a context created with no prior interaction starts 'suspended'
     in most first-time sessions and can only be resumed from a real
     click/keydown/touch, which is what the listeners below do. There's no
     way to bypass that from code; this just removes every bit of friction
     the platform doesn't force us to keep. */
  (function initAudioContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      audioCtx = new AC();
      masterShelf = audioCtx.createBiquadFilter();
      masterShelf.type = 'highshelf';
      masterShelf.frequency.value = 1200;
      masterShelf.gain.value = 0;
      masterShelf.connect(audioCtx.destination);
    } catch (e) {}
  })();

  function unlockAudio() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  }
  ['click', 'keydown', 'touchend', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });

  function initGlyphMosaic() {
    const glyphBox = document.getElementById('glyphBox');
    const canvas = document.getElementById('glyphCanvas');
    if (!glyphBox || !canvas) return null;

    const ctx = canvas.getContext('2d');
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    const BEAD_CHAR = '杨';
    const LOGICAL_SIZE = 300; // fixed coordinate space; canvas is scaled to fit whatever box size renders
    const GRID_STEP = 10;     // sampling pitch — bigger = fewer, more spaced-out tiny glyphs
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const GLYPH_COLOR = '#e8c4be'; // petal — same as the hero's own name-accent dot

    let points = [];

    // A large 杨 is rendered off-screen once to sample which points fall
    // inside a stroke; a tiny 杨 is drawn at each one every frame below.
    function buildMask() {
      maskCanvas.width = LOGICAL_SIZE;
      maskCanvas.height = LOGICAL_SIZE;
      maskCtx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
      maskCtx.fillStyle = '#000';
      maskCtx.textAlign = 'center';
      maskCtx.textBaseline = 'middle';
      maskCtx.font = '900 ' + Math.round(LOGICAL_SIZE * 0.9) + 'px "Noto Sans SC"';
      // 0.68, not the geometric center — measured empirically (Playwright,
      // scanning actual canvas ink vs. font-metric center) that this glyph's
      // real ink sits well above the font's own vertical-middle at 0.54,
      // leaving a ~65px gap between the visible character and the box's
      // bottom edge that CSS alignment alone can't see or fix.
      maskCtx.fillText(BEAD_CHAR, LOGICAL_SIZE / 2, LOGICAL_SIZE * 0.68);
      const data = maskCtx.getImageData(0, 0, LOGICAL_SIZE, LOGICAL_SIZE).data;

      points = [];
      for (let x = GRID_STEP / 2; x < LOGICAL_SIZE; x += GRID_STEP) {
        for (let y = GRID_STEP / 2; y < LOGICAL_SIZE; y += GRID_STEP) {
          const idx = ((y | 0) * LOGICAL_SIZE + (x | 0)) * 4;
          if (data[idx + 3] > 120) {
            const jx = (Math.random() - 0.5) * GRID_STEP * 0.12;
            const jy = (Math.random() - 0.5) * GRID_STEP * 0.12;
            points.push({
              bx: x + jx, by: y + jy, // rest ("seed") position each point eases back toward
              x: x + jx, y: y + jy,   // current position
              vx: 0, vy: 0,
              phase: Math.random() * Math.PI * 2,
              rot: (Math.random() - 0.5) * 6,
              size: 8 + Math.random() * 4.5,
              color: GLYPH_COLOR
            });
          }
        }
      }
    }
    // Sample only once Noto Sans SC has arrived (at most 1.5s). Sampling
    // straight away on a first visit traced a thinner fallback font and
    // left 杨 sparse. The load gust plays as soon as the points exist.
    const glyphFont = document.fonts && document.fonts.load
      ? document.fonts.load('900 270px "Noto Sans SC"', BEAD_CHAR)
      : Promise.resolve();
    Promise.race([glyphFont, new Promise((r) => setTimeout(r, 1500))])
      .catch(() => {})
      .then(() => { buildMask(); gust(); });

    function resizeCanvas() {
      const rect = glyphBox.getBoundingClientRect();
      canvas.width = Math.round(rect.width * DPR);
      canvas.height = Math.round(rect.height * DPR);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* ---------- ambient water sound: one continuous, quiet murmur ----------
       Brown noise (a leaky random-walk integrator, not filtered white
       noise) — its steep natural rolloff is what sounds like a low, soft
       murmur instead of a hiss. Narrow highpass+lowpass band, one slow
       shallow LFO for an unhurried breathing swell. Only the gain moves,
       driven every frame by proximity + cursor speed (see step() below) —
       silent at rest, easing up while brushing through, easing back down. */
    let ambient = null;
    (function initAmbient() {
      if (!audioCtx) return;
      const dur = 6;
      const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * dur), audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + white * 0.02) / 1.02; // leaky integrator — brown/red noise
        data[i] = last * 3.6;
      }

      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 90; // just enough to strip true sub-bass rumble

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 650; // narrow — this is what removes any hissy/staticky character
      lp.Q.value = 0.5;

      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.045; // very slow, unhurried breathing
      const lfoDepth = audioCtx.createGain();
      lfoDepth.gain.value = 90;
      lfo.connect(lfoDepth);
      lfoDepth.connect(lp.frequency);

      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;

      src.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      gain.connect(masterShelf);
      src.start();
      lfo.start();

      ambient = { gain };
    })();

    const mouse = { x: -9999, y: -9999, active: false };
    let mouseSpeed = 0; // smoothed frame-to-frame speed, drives the ambient sound's volume
    let lastFrameMouseX = null;
    let lastFrameMouseY = null;

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * LOGICAL_SIZE;
      mouse.y = ((e.clientY - r.top) / r.height) * LOGICAL_SIZE;
      mouse.active = true;
    });
    canvas.addEventListener('pointerleave', () => { mouse.active = false; });
    canvas.addEventListener('pointerdown', (e) => {
      unlockAudio();
      // Touch has no hover, so a tap pushes the nearby points outward
      // from the finger instead — the phone version of brushing through.
      if (e.pointerType !== 'mouse') {
        const r = canvas.getBoundingClientRect();
        burst(((e.clientX - r.left) / r.width) * LOGICAL_SIZE,
              ((e.clientY - r.top) / r.height) * LOGICAL_SIZE);
      }
    });

    const TAP_RADIUS = 70;
    const TAP_STRENGTH = 9;
    function burst(x, y) {
      points.forEach((p) => {
        const dx = p.x - x, dy = p.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < TAP_RADIUS && dist > 0.001) {
          const f = (1 - dist / TAP_RADIUS) * TAP_STRENGTH;
          p.vx += (dx / dist) * f;
          p.vy += (dy / dist) * f;
        }
      });
    }

    /* ---------- independent per-point spring physics ----------
       Each point eases back toward its own seed position (a light spring),
       has a small ambient sway so it's never fully static, and gets pushed
       aside when the cursor passes near, settling back after. */
    const SPRING_K = 0.02;
    const SPRING_DAMPING = 0.86;
    const MOUSE_RADIUS = 26;
    const MOUSE_STRENGTH = 6;
    const AMBIENT_AMP = reduceMotion ? 0 : 0.5;
    const WIND_PROX_RADIUS = 45; // wider halo than the physics push — the sound swells before the points visibly react
    const WIND_MAX_GAIN = 0.2;
    const REFRACT = 10; // px of apparent shift per unit of water-surface slope

    function step(t) {
      const rect = canvas.getBoundingClientRect();
      const scale = (rect.width / LOGICAL_SIZE) * DPR;
      const toLogical = LOGICAL_SIZE / rect.width;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

      let nearestDist = Infinity;

      points.forEach((p) => {
        const targetX = p.bx + Math.sin(t * 0.0012 + p.phase) * AMBIENT_AMP;
        const targetY = p.by + Math.cos(t * 0.0015 + p.phase) * AMBIENT_AMP;

        let fx = (targetX - p.x) * SPRING_K;
        let fy = (targetY - p.y) * SPRING_K;

        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < nearestDist) nearestDist = dist;
          if (dist < MOUSE_RADIUS && dist > 0.001) {
            const f = (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH;
            fx += (dx / dist) * f;
            fy += (dy / dist) * f;
          }
        }

        p.vx = (p.vx + fx) * SPRING_DAMPING;
        p.vy = (p.vy + fy) * SPRING_DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        // Ripples passing under 杨 bend it slightly, like something seen
        // through water. Drawing offset only; the physics above is untouched.
        let rx = 0, ry = 0;
        const sl = water && water.slopeAt(rect.left + p.x / toLogical, rect.top + p.y / toLogical);
        if (sl) { rx = sl[0] * REFRACT * toLogical; ry = sl[1] * REFRACT * toLogical; }

        ctx.save();
        ctx.translate(p.x + rx, p.y + ry);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.font = '600 ' + p.size + 'px "Noto Sans SC"';
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(BEAD_CHAR, 0, 0);
        ctx.restore();
      });

      // continuous ambient level — proximity to the character × how fast
      // the cursor is actually moving, smoothed every frame; silent at
      // rest, swells while brushing through, eases back down, never a
      // hard on/off.
      if (mouse.active) {
        if (lastFrameMouseX === null) { lastFrameMouseX = mouse.x; lastFrameMouseY = mouse.y; }
        const frameSpeed = Math.hypot(mouse.x - lastFrameMouseX, mouse.y - lastFrameMouseY);
        lastFrameMouseX = mouse.x; lastFrameMouseY = mouse.y;
        mouseSpeed += (frameSpeed - mouseSpeed) * 0.25;
      } else {
        lastFrameMouseX = null; lastFrameMouseY = null;
        mouseSpeed *= 0.9;
      }
      if (ambient) {
        const proximity = mouse.active ? Math.max(0, 1 - nearestDist / WIND_PROX_RADIUS) : 0;
        const speedFactor = Math.min(1, mouseSpeed / 5);
        const target = proximity * (0.08 + speedFactor * 0.92) * WIND_MAX_GAIN;
        ambient.gain.gain.setTargetAtTime(Math.max(0.0001, target), audioCtx.currentTime, 0.28);
      }

      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    /* One-shot gust impulse across every point — used both as the
       theme-toggle hook below AND, once, as the reveal animation right
       after the page loads (called once the font is in, above), so 杨 visibly
       settles into shape on first load instead of appearing fully formed
       from frame one. */
    function gust() {
      if (reduceMotion) return;
      points.forEach((p) => {
        p.vx += (Math.random() - 0.5) * 10;
        p.vy += (Math.random() - 0.5) * 10;
      });
    }

    return gust;
  }

  /* ===================================================
     2b. WATER  (home only)
     The hero is a still surface. Moving the cursor presses it down along
     its path; the ripples spread a short way and settle within about a
     second. A click drops one small ring.
     • A height field on a coarse grid (one cell = 3 CSS px), stepped with
       the 2D wave equation. #waterCanvas is the grid's own size, stretched
       by CSS, so the browser's smoothing turns cells into soft ripples.
     • Lit like sun on a pool floor, from the upper left: slopes facing the
       light get a highlight, slopes facing away get soft shade, and where
       ripples focus light they leave a faint petal line.
     • Strength eases in with cursor speed, so a very slow drift barely
       marks the surface and a flick is capped. Kept deliberately faint.
     • Sleeps (no simulation, canvas cleared) whenever the water is still.
  =================================================== */
  function initWater() {
    const canvas = document.getElementById('waterCanvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const root = document.documentElement;
    const isNight = () => root.getAttribute('data-theme') === 'night';

    const CELL = 3, C2 = 0.22, DAMP = 0.972, SPONGE = 10;
    let W = 0, H = 0, cols = 0, rows = 0, h, v, damp, img;
    let awake = 0; // frames left to simulate

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cols = Math.max(3, Math.ceil(W / CELL)); rows = Math.max(3, Math.ceil(H / CELL));
      canvas.width = cols; canvas.height = rows;
      h = new Float32Array(cols * rows); v = new Float32Array(cols * rows); damp = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        // a soft sponge at the edges absorbs ripples instead of bouncing them back
        const d = Math.min(i, j, cols - 1 - i, rows - 1 - j);
        const e = d < SPONGE ? Math.pow(1 - d / SPONGE, 2) : 0;
        damp[j * cols + i] = DAMP * (1 - 0.12 * e);
      }
      img = ctx.createImageData(cols, rows);
      awake = 0;
    }
    resize();
    window.addEventListener('resize', resize);

    function press(x, y, amount, r) {
      const gi = x / CELL, gj = y / CELL, rc = Math.ceil((2 * r) / CELL);
      for (let j = Math.max(1, (gj | 0) - rc); j <= Math.min(rows - 2, (gj | 0) + rc); j++)
        for (let i = Math.max(1, (gi | 0) - rc); i <= Math.min(cols - 2, (gi | 0) + rc); i++) {
          const dx = (i - gi) * CELL, dy = (j - gj) * CELL;
          v[j * cols + i] -= amount * Math.exp(-(dx * dx + dy * dy) / (r * r));
        }
      awake = 150;
    }

    function stepWater() {
      for (let j = 1; j < rows - 1; j++) {
        let k = j * cols + 1;
        for (let i = 1; i < cols - 1; i++, k++)
          v[k] = (v[k] + C2 * (h[k - 1] + h[k + 1] + h[k - cols] + h[k + cols] - 4 * h[k])) * damp[k];
      }
      for (let k = 0; k < h.length; k++) h[k] += v[k];
    }

    const sat = (x, max) => max * (1 - Math.exp(-x / max)); // soft ceiling: never harsh
    function render() {
      const night = isNight(), d = img.data;
      const L = night ? [245, 232, 228] : [255, 255, 255]; // light
      const S = night ? [0, 0, 0] : [44, 31, 29];          // shade (dusk by day)
      const P = night ? [232, 196, 190] : [214, 160, 152]; // focus lines (petal)
      const kL = night ? 1.0 : 1.9, mL = night ? 0.16 : 0.36;
      const kS = night ? 1.1 : 0.45, mS = night ? 0.22 : 0.08;
      const kP = night ? 9 : 10, mP = night ? 0.19 : 0.17;
      for (let j = 1; j < rows - 1; j++) {
        let k = j * cols + 1, o = k * 4;
        for (let i = 1; i < cols - 1; i++, k++, o += 4) {
          const lit = (h[k + 1] - h[k - 1] + h[k + cols] - h[k - cols]) * 0.7;
          const foc = -(h[k - 1] + h[k + 1] + h[k - cols] + h[k + cols] - 4 * h[k]);
          let r = 0, g = 0, b = 0, a = 0;
          if (lit > 0.002) { a = sat(lit * kL, mL); r = L[0]; g = L[1]; b = L[2]; }
          else if (lit < -0.002) { a = sat(-lit * kS, mS); r = S[0]; g = S[1]; b = S[2]; }
          if (foc > 0.001) { // petal focus line composited over the light/shade
            const pa = sat(foc * kP, mP), na = pa + a * (1 - pa);
            r = (P[0] * pa + r * a * (1 - pa)) / na;
            g = (P[1] * pa + g * a * (1 - pa)) / na;
            b = (P[2] * pa + b * a * (1 - pa)) / na;
            a = na;
          }
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a * 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    const last = { x: 0, y: 0, t: 0, on: false };
    window.addEventListener('pointermove', (e) => {
      const x = e.clientX, y = e.clientY, now = performance.now();
      if (last.on && now - last.t < 120) {
        const dx = x - last.x, dy = y - last.y, dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const speed = dist / Math.max(1, (now - last.t) / 16.67); // px per frame
          const ease = speed / (speed + 7);
          const amt = Math.min(speed, 12) * ease * 0.0024 * (reduceMotion ? 0.5 : 1);
          // stamp along the path so a sweep leaves a continuous wake, not dots
          const steps = Math.max(1, Math.ceil(dist / 4)), each = amt * (dist / steps) / 4;
          for (let s = 1; s <= steps; s++) press(last.x + (dx * s) / steps, last.y + (dy * s) / steps, each, 8);
        }
      }
      last.x = x; last.y = y; last.t = now; last.on = true;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { last.on = false; });
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('a, button')) return;
      press(e.clientX, e.clientY, 0.09, 7);
    });

    function frame() {
      requestAnimationFrame(frame);
      if (!awake || document.hidden) return;
      stepWater();
      render();
      if (--awake === 0) { h.fill(0); v.fill(0); ctx.clearRect(0, 0, cols, rows); }
    }
    requestAnimationFrame(frame);

    return {
      // surface slope under a viewport point; the mosaic uses it to look refracted
      slopeAt(x, y) {
        if (!awake) return null;
        const i = Math.round(x / CELL), j = Math.round(y / CELL);
        if (i < 1 || j < 1 || i >= cols - 1 || j >= rows - 1) return null;
        const k = j * cols + i;
        return [h[k + 1] - h[k - 1], h[k + cols] - h[k - cols]];
      },
    };
  }

  /* ===================================================
     3.  NAV  (blurred surface once scrolled; logo letters lift on hover)
  =================================================== */
  function initNav() {
    const nav = document.getElementById('mainNav');
    if (nav) {
      const sync = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
      sync();
      window.addEventListener('scroll', sync, { passive: true });
    }

    // vy. — the three letters lift one after another, left to right, on
    // the shared easing curve.
    const logo = document.querySelector('.nav-logo');
    if (!logo || reduceMotion) return;
    const lift = () => {
      logo.querySelectorAll('.g').forEach((g, i) => {
        if (!g.animate) return;
        g.animate(
          [{ transform: 'none' }, { transform: 'translateY(-0.14em) rotate(-5deg)', offset: 0.4 }, { transform: 'none' }],
          { duration: 560, delay: i * 70, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
        );
      });
    };
    logo.addEventListener('pointerenter', lift);
    logo.addEventListener('focus', lift);
  }

  /* ===================================================
     4.  PAGE TRANSITIONS
     The headline you're leaving breaks into petal particles (tiny 杨s)
     that drift out of focus while the page blurs out. Their positions are
     handed to the next page through sessionStorage; there they scatter,
     gather on that page's headline ([data-tx-word]) left to right, and
     the real headline pulls into focus underneath as they dissolve.
     The particles play once per session (the first page change, re-armed
     by a refresh); after
     that a page change is a quick blur out/in of <main>, so the effect
     stays a moment instead of a toll on every click. Clicking again while
     a transition runs skips straight to the new page.
     Nav and footer never move. Reduced motion → plain navigation.
  =================================================== */
  const TX_KEY = 'vy-tx';
  const TX_AT  = 'vy-tx-at'; // read by the inline <head> script to hide content before first paint
  const TX = { exit: 320, wordOut: 120, stagger: 180, travel: 580, xfade: 300, focus: 460, reveal: 0.75 };
  const TX_MAXN = 320;
  const TX_SEEN = 'vy-tx-seen';               // set once the particle version has played this session
  const TX_QUICK = { out: 160, in: 260 };     // every page change after the first
  const SPR_BASE = 48, SPR_PAD = 75;
  const SPR_LEVELS = [0, 2, 4.5, 8, 12, 17, 23, 30]; // pre-blurred sprite levels
  const MAXL = SPR_LEVELS.length - 1;
  const SOFT = 2.5;  // particles stay this soft while gathering; the real text does the final focus pull
  const PETAL = '#e8c4be';
  const CJK = '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const easeIn = (t) => t * t * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const sprites = new Map();
  function spritesFor(color) {
    let set = sprites.get(color);
    if (set) return set;
    const W = SPR_BASE + SPR_PAD * 2;
    set = SPR_LEVELS.map((b) => {
      const c = document.createElement('canvas');
      c.width = c.height = W;
      const x = c.getContext('2d');
      x.font = '600 ' + SPR_BASE + 'px ' + CJK;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = color;
      if (b === 0) x.fillText('杨', W / 2, W / 2);
      else { x.shadowColor = color; x.shadowBlur = b; x.shadowOffsetX = W * 2; x.fillText('杨', W / 2 - W * 2, W / 2); }
      return c;
    });
    sprites.set(color, set);
    return set;
  }

  function drawSprite(ctx, set, level, x, y, size, rot, alpha) {
    if (alpha <= 0.003) return;
    level = Math.max(0, Math.min(MAXL, level));
    const i = Math.min(MAXL - 1, Math.floor(level)), f = level - i;
    const W = set[0].width * (size / SPR_BASE);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (f < 0.99) { ctx.globalAlpha = alpha * (1 - f); ctx.drawImage(set[i], -W / 2, -W / 2, W, W); }
    if (f > 0.01) { ctx.globalAlpha = alpha * f; ctx.drawImage(set[i + 1], -W / 2, -W / 2, W, W); }
    ctx.restore();
  }

  function txCanvas() {
    const cv = document.createElement('canvas');
    cv.className = 'tx-canvas';
    cv.setAttribute('aria-hidden', 'true');
    cv.width = Math.round(window.innerWidth * DPR);
    cv.height = Math.round(window.innerHeight * DPR);
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { cv, ctx };
  }

  // Sample a headline into points from each character's real on-screen
  // box (viewport coordinates), keeping each text node's color.
  function sampleText(root, maxN) {
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const S = 2, items = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      if (!text.trim()) continue;
      const cs = getComputedStyle(node.parentElement);
      const fs = parseFloat(cs.fontSize) || 16;
      const chars = [];
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      for (let i = 0; i < text.length; i++) {
        if (/\s/.test(text[i])) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const cr = range.getBoundingClientRect();
        if (!cr.width) continue;
        chars.push({ ch: text[i], left: cr.left, top: cr.top, h: cr.height });
        l = Math.min(l, cr.left); t = Math.min(t, cr.top); r = Math.max(r, cr.right); b = Math.max(b, cr.bottom);
      }
      if (!chars.length) continue;
      const pad = Math.ceil(fs * 0.3);
      const ox = Math.floor(l - pad), oy = Math.floor(t - pad);
      const W = Math.ceil(r - l + pad * 2), H = Math.ceil(b - t + pad * 2);
      const c = document.createElement('canvas');
      c.width = W * S; c.height = H * S;
      const x = c.getContext('2d');
      x.scale(S, S);
      x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      x.fillStyle = '#000';
      x.textBaseline = 'alphabetic';
      const m = x.measureText('Hg'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      chars.forEach((ch) => {
        const top = ch.top - oy;
        const base = asc && desc ? top + (ch.h - (asc + desc)) / 2 + asc : top + ch.h * 0.8;
        x.fillText(ch.ch, ch.left - ox, base);
      });
      const data = x.getImageData(0, 0, W * S, H * S).data;
      let ink = 0;
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (data[(py * S * W * S + px * S) * 4 + 3] > 128) ink++;
      if (ink) items.push({ data, W, H, ox, oy, fs, ink, color: cs.color });
    }
    if (!items.length) return [];
    // same number of points per glyph whatever the size
    const k = Math.sqrt(items.reduce((a, it) => a + it.ink / (it.fs * it.fs), 0) / maxN);
    const pts = [];
    items.forEach((it) => {
      const step = Math.max(1.4, k * it.fs);
      const size = Math.max(2.5, Math.min(14, step * 1.35));
      for (let py = step / 2; py < it.H; py += step)
        for (let px = step / 2; px < it.W; px += step)
          if (it.data[((py * S | 0) * it.W * S + (px * S | 0)) * 4 + 3] > 128)
            pts.push({ x: px + it.ox, y: py + it.oy, color: it.color, size });
    });
    return pts;
  }

  let leaving = false;
  let arriving = false;
  let exitCanvas = null;

  const seenParticles = () => { try { return sessionStorage.getItem(TX_SEEN) === '1'; } catch (err) { return true; } };

  // After the first page change: <main> blurs out, the next page blurs in.
  function quickLeave(href, main) {
    leaving = true;
    main.style.transition = `filter ${TX_QUICK.out}ms cubic-bezier(0.4, 0, 1, 1), opacity ${TX_QUICK.out}ms cubic-bezier(0.4, 0, 1, 1)`;
    main.style.filter = 'blur(6px)';
    main.style.opacity = '0';
    setTimeout(() => {
      if (!leaving) return;
      try {
        sessionStorage.setItem(TX_KEY, 'quick');
        sessionStorage.setItem(TX_AT, String(Date.now()));
      } catch (err) { /* storage blocked: the next page just loads normally */ }
      window.location.href = href;
    }, TX_QUICK.out);
  }

  function leaveTo(href) {
    const word = document.querySelector('[data-tx-word]');
    const main = document.querySelector('main');
    if (reduceMotion || !word || !main) { window.location.href = href; return; }
    if (seenParticles()) { quickLeave(href, main); return; }
    const pts = sampleText(word, TX_MAXN);
    if (!pts.length) { window.location.href = href; return; }
    leaving = true;
    try { sessionStorage.setItem(TX_SEEN, '1'); } catch (err) { /* fine: it just plays again */ }

    const unit = Math.min(window.innerWidth, 1200) / 960;
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const lift = Math.max(6, unit * 12);
    const R = Math.max(28, unit * 90);
    const parts = pts.map((pt) => {
      // exhale: break outward from the headline's center, loosely
      const a = Math.atan2(pt.y - cy, pt.x - cx) + (Math.random() - 0.5) * 1.6;
      const r = R * (0.25 + Math.random() * 0.35);
      return { sx: pt.x, sy: pt.y, dx: Math.cos(a) * r, dy: Math.sin(a) * r - lift, c0: pt.color, s: pt.size,
               rot: (Math.random() - 0.5) * 6 * Math.PI / 180 }; // same ±3° as the mosaic
    });

    word.style.transition = `opacity ${TX.wordOut}ms linear`;
    word.style.opacity = '0';
    main.style.transition = `filter ${TX.exit}ms cubic-bezier(0.4, 0, 1, 1), opacity ${TX.exit}ms cubic-bezier(0.4, 0, 1, 1)`;
    main.style.filter = `blur(${Math.max(4, unit * 10)}px)`;
    main.style.opacity = '0';

    exitCanvas = txCanvas();
    const { ctx } = exitCanvas;
    const petal = spritesFor(PETAL);
    const t0 = performance.now();
    function frame(now) {
      if (!leaving) return;
      const k = clamp01((now - t0) / TX.exit), e = easeOut(k);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts.forEach((p) => {
        const x = p.sx + p.dx * e, y = p.sy + p.dy * e, level = MAXL * e;
        drawSprite(ctx, spritesFor(p.c0), level, x, y, p.s, p.rot, 1);
        drawSprite(ctx, petal, level, x, y, p.s, p.rot, e); // shifts to petal as it drifts
      });
      if (k < 1) { requestAnimationFrame(frame); return; }
      try {
        sessionStorage.setItem(TX_KEY, JSON.stringify(parts.map((p) => [
          Math.round((p.sx + p.dx) * 10) / 10, Math.round((p.sy + p.dy) * 10) / 10,
          Math.round(p.s * 100) / 100, Math.round(p.rot * 1000) / 1000,
        ])));
        sessionStorage.setItem(TX_AT, String(Date.now()));
      } catch (err) { /* storage blocked: the next page just loads normally */ }
      window.location.href = href;
    }
    requestAnimationFrame(frame);
  }

  function arrive() {
    const root = document.documentElement;
    if (!root.classList.contains('tx-in')) return;
    let raw = null;
    try {
      raw = sessionStorage.getItem(TX_KEY);
      sessionStorage.removeItem(TX_KEY);
      sessionStorage.removeItem(TX_AT);
    } catch (err) { raw = null; }

    const main = document.querySelector('main');
    const word = document.querySelector('[data-tx-word]');

    if (raw === 'quick' && main && !reduceMotion) {
      // <main> is hidden and blurred by html.tx-in; ease it back in.
      main.style.transition = `filter ${TX_QUICK.in}ms var(--ease-settle), opacity ${TX_QUICK.in}ms ease`;
      void main.offsetWidth;
      root.classList.remove('tx-in');
      setTimeout(() => { main.style.transition = ''; }, TX_QUICK.in + 40);
      return;
    }

    let stored = null;
    try { stored = JSON.parse(raw || 'null'); } catch (err) { stored = null; }
    if (!Array.isArray(stored) || !stored.length || !main || !word || reduceMotion) {
      root.classList.remove('tx-in');
      return;
    }
    arriving = true;

    const unit = Math.min(window.innerWidth, 1200) / 960;
    const R = Math.max(28, unit * 90);
    let parts = stored.map(([x, y, s, rot]) => ({ ex: x, ey: y, s0: s, rot }));
    const { cv, ctx } = txCanvas();
    const petal = spritesFor(PETAL);
    const w = window.innerWidth, h = window.innerHeight;

    // Hold the soft petal haze exactly where the last page left it (drawn
    // now, so the very first paint already includes it) until the
    // headline's font is ready to be sampled.
    let holding = true;
    function hold() {
      if (!holding) return;
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => drawSprite(ctx, petal, MAXL, p.ex, p.ey, p.s0, p.rot, 1));
      requestAnimationFrame(hold);
    }
    hold();

    const cleanup = () => {
      holding = false;
      arriving = false;
      cv.remove();
      root.classList.remove('tx-in');
      [main, word].forEach((el) => { el.style.transition = ''; el.style.opacity = ''; el.style.filter = ''; });
    };

    const cs = getComputedStyle(word);
    const fontLoad = document.fonts && document.fonts.load
      ? document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} 40px ${cs.fontFamily}`, word.textContent)
      : Promise.resolve();
    Promise.race([fontLoad, new Promise((r) => setTimeout(r, 700))]).catch(() => {}).then(() => {
      try { gather(); } catch (err) { cleanup(); }
    });

    function gather() {
      holding = false;
      const dst = sampleText(word, TX_MAXN);
      if (!dst.length) { cleanup(); return; }
      while (parts.length < dst.length) parts.push({ ...parts[(Math.random() * parts.length) | 0] });

      // Left side of the old headline feeds the left side of the new one,
      // and particles land in reading order.
      parts.sort((a, b) => a.ex - b.ex);
      const tg = dst.slice().sort((a, b) => a.x - b.x);
      const minX = tg[0].x, span = Math.max(1, tg[tg.length - 1].x - minX);
      parts.forEach((p, i) => {
        const g = tg[Math.floor(i * tg.length / parts.length)];
        p.tx = g.x; p.ty = g.y; p.c1 = g.color; p.s1 = g.size;
        p.delay = TX.stagger * (g.x - minX) / span;
        const qa = Math.random() * Math.PI * 2, qr = R * (0.5 + Math.random() * 0.7);
        p.qx = Math.cos(qa) * qr; p.qy = Math.sin(qa) * qr; // mid-flight scatter
      });

      // Keep the headline hidden and soft, release the rest of the page.
      word.style.transition = 'none';
      word.style.opacity = '0';
      word.style.filter = `blur(${Math.max(3, unit * 8)}px)`;
      main.style.transition = 'none';
      main.style.opacity = '0';
      main.style.filter = `blur(${Math.max(4, unit * 10)}px)`;
      root.classList.remove('tx-in');
      void main.offsetWidth;
      main.style.transition = 'filter 480ms var(--ease-settle) 60ms, opacity 400ms ease 60ms';
      main.style.filter = 'blur(0px)';
      main.style.opacity = '1';

      const revealAt = TX.stagger + TX.travel * TX.reveal;
      const t0 = performance.now();
      function frame(now) {
        const t = now - t0;
        ctx.clearRect(0, 0, w, h);
        const xf = clamp01((t - revealAt) / TX.xfade);
        const alpha = 1 - easeInOut(xf);
        parts.forEach((p) => {
          const e = easeInOut(clamp01((t - p.delay) / TX.travel));
          const bump = Math.sin(Math.PI * e); // spread out mid-flight, gather back in to land
          const x = p.ex + (p.tx - p.ex) * e + p.qx * bump;
          const y = p.ey + (p.ty - p.ey) * e + p.qy * bump;
          const level = MAXL - (MAXL - SOFT) * easeOut(e);
          const size = p.s0 + (p.s1 - p.s0) * e;
          drawSprite(ctx, petal, level, x, y, size, p.rot, alpha);
          if (e > 0.01) drawSprite(ctx, spritesFor(p.c1), level, x, y, size, p.rot, alpha * e); // takes on the headline's color
        });
        if (xf < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      // As the soft particles gather, the real headline emerges under them
      // and pulls into focus.
      setTimeout(() => {
        word.style.transition = `opacity ${TX.xfade}ms ease, filter ${TX.focus}ms var(--ease-settle)`;
        word.style.opacity = '1';
        word.style.filter = 'blur(0px)';
      }, revealAt);
      setTimeout(cleanup, revealAt + TX.focus + 60);
    }
  }

  function initPageTransitions() {
    // A refresh counts as starting over: the next page change gets the particles again.
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.type === 'reload') sessionStorage.removeItem(TX_SEEN);
    } catch (err) { /* no-op */ }

    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;
      link.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        // A second click mid-transition skips the rest of it.
        if (leaving || arriving) { leaving = false; window.location.href = href; return; }
        leaveTo(href);
      });
    });

    // Back/forward can restore a page from the browser's cache exactly as
    // it was left: blurred out with the particle canvas on top. Reset it.
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      leaving = false;
      if (exitCanvas) { exitCanvas.cv.remove(); exitCanvas = null; }
      document.querySelectorAll('main, [data-tx-word]').forEach((el) => {
        el.style.transition = 'none'; el.style.opacity = ''; el.style.filter = '';
      });
    });

    arrive();
  }

  /* ── Boot (runs last, once every function above is declared) ── */
  initThemeToggle();
  initNav();
  initPageTransitions();
  if (isHome) {
    water = initWater();
    triggerGust = initGlyphMosaic();
  }

})();
