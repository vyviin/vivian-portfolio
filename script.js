/**
 * VIVIAN YANG PORTFOLIO — script.js
 *
 * All pages:
 *   • Day/night theme toggle → persisted via localStorage, swaps CSS vars
 *   • Link clicks            → fade-out transition before navigating
 *
 * Home page only:
 *   • 杨 glyph mosaic         → hundreds of tiny 杨s sampled from a real
 *     rendered glyph, each a spring-back point that reacts to the cursor
 *     and settles; a soft brown-noise water murmur swells with proximity
 *     + cursor speed; click the theme toggle for a one-shot "gust"
 */

(function () {
  'use strict';

  const body    = document.body;
  const overlay = document.getElementById('pageTransition');
  const isHome  = body.classList.contains('home-page');
  let triggerGust = null; // assigned by initGlyphMosaic() on the home page

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
    buildMask();

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
    canvas.addEventListener('pointerdown', unlockAudio);

    /* ---------- independent per-point spring physics ----------
       Each point eases back toward its own seed position (a light spring),
       has a small ambient sway so it's never fully static, and gets pushed
       aside when the cursor passes near, settling back after. */
    const SPRING_K = 0.02;
    const SPRING_DAMPING = 0.86;
    const MOUSE_RADIUS = 26;
    const MOUSE_STRENGTH = 6;
    const AMBIENT_AMP = 0.5;
    const WIND_PROX_RADIUS = 45; // wider halo than the physics push — the sound swells before the points visibly react
    const WIND_MAX_GAIN = 0.2;

    function step(t) {
      const rect = canvas.getBoundingClientRect();
      const scale = (rect.width / LOGICAL_SIZE) * DPR;
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

        ctx.save();
        ctx.translate(p.x, p.y);
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
       after the page loads (called immediately below), so 杨 visibly
       settles into shape on first load instead of appearing fully formed
       from frame one. */
    function gust() {
      points.forEach((p) => {
        p.vx += (Math.random() - 0.5) * 10;
        p.vy += (Math.random() - 0.5) * 10;
      });
    }
    gust();

    return gust;
  }

  /* ===================================================
     3.  PAGE TRANSITIONS  (fade-white on navigate)
  =================================================== */
  function initPageTransitions() {
    if (!overlay) return;

    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;

      link.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        overlay.classList.add('fade-out');
        setTimeout(() => { window.location.href = href; }, 480);
      });
    });
  }

  /* ── Boot (runs last, once every function above is declared) ── */
  initThemeToggle();
  initPageTransitions();
  if (isHome) {
    triggerGust = initGlyphMosaic();
  }

})();
