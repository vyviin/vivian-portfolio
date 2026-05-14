/**
 * VIVIAN YANG PORTFOLIO — main.js
 *
 * Homepage only:
 *   • "vy." logo click  → toggles  body.media-mode
 *   • In media-mode     → hover zone activates, video plays once on hover
 *   • Video ends        → holds last frame 2s, then crossfades back to photo
 *   • Toggle off        → photo + video fade out, resets video for next time
 *
 * All pages:
 *   • Link clicks       → fade-out transition before navigating
 */

(function () {
  'use strict';

  const body    = document.body;
  const overlay = document.getElementById('pageTransition');
  const isHome  = body.classList.contains('home-page');

  /* ── Boot ─────────────────────────────────────── */
  if (isHome) {
    initLogoToggle();
    initVideoHover();
  }
  initPageTransitions();

  /* ===================================================
     1.  LOGO TOGGLE  (vy. click → media-mode on/off)
  =================================================== */
  function initLogoToggle() {
    const btn = document.getElementById('logoToggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const entering = !body.classList.contains('media-mode');

      if (entering) {
        body.classList.add('media-mode');
        /* Preload video the moment Media Mode is entered */
        const video = document.getElementById('heroVideo');
        if (video) video.load();
      } else {
        exitMediaMode();
      }
    });
  }

  /* ===================================================
     2.  VIDEO HOVER  (only fires while in media-mode)
  =================================================== */
  function initVideoHover() {
    const zone     = document.getElementById('hoverZone');
    const video    = document.getElementById('heroVideo');
    const bgVideo  = document.getElementById('bgVideo');

    if (!zone || !video || !bgVideo) return;

    /* State resets each time media-mode is entered */
    let hasPlayed = false;
    let endTimer  = null;

    /* ── Play video (once per media-mode session) ── */
    function triggerVideo() {
      if (!body.classList.contains('media-mode')) return;
      if (hasPlayed) return;
      hasPlayed = true;

      bgVideo.classList.add('active');
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 120);
    }

    /* ── After video ends: hold 2 s, fade back to photo ── */
    video.addEventListener('ended', () => {
      clearTimeout(endTimer);
      endTimer = setTimeout(() => {
        bgVideo.classList.remove('active');
        /* Keep hasPlayed = true so it doesn't replay on re-hover */
      }, 2000);
    });

    /* ── Desktop hover ── */
    zone.addEventListener('mouseenter', triggerVideo);

    /* ── Mobile tap ── */
    zone.addEventListener('click', triggerVideo);

    /* ── Reset state whenever media-mode is toggled ──
       We listen for class changes via a MutationObserver so
       exitMediaMode() can cleanly reset without tight coupling. */
    new MutationObserver(() => {
      if (!body.classList.contains('media-mode')) {
        /* Media Mode was just turned OFF — reset for next session */
        clearTimeout(endTimer);
        hasPlayed = false;
        video.pause();
        video.currentTime = 0;
        bgVideo.classList.remove('active');
      }
    }).observe(body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ===================================================
     3.  EXIT MEDIA MODE  (logo re-click or programmatic)
  =================================================== */
  function exitMediaMode() {
    /* Remove media-mode — MutationObserver in initVideoHover handles cleanup */
    body.classList.remove('media-mode');
  }

  /* ===================================================
     4.  PAGE TRANSITIONS  (fade-white on navigate)
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

})();