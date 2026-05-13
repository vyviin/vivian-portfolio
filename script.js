/**
 * VIVIAN YANG PORTFOLIO — main.js
 * Handles: video hover interaction, page transitions, mobile tap
 */

(function () {
    'use strict';
  
    /* ── Page-transition fade-in ──────────────────────── */
    const overlay = document.getElementById('pageTransition');
  
    /* ── Only run video logic on the home page ────────── */
    const isHome = document.body.classList.contains('home-page');
  
    if (isHome) {
      initHeroVideo();
    }
  
    initPageTransitions();
    showMobileHint();
  
    /* ===================================================
       HERO VIDEO HOVER INTERACTION
    =================================================== */
    function initHeroVideo() {
      const zone      = document.getElementById('hoverZone');
      const video     = document.getElementById('heroVideo');
      const bgStatic  = document.getElementById('bgStatic');
      const bgVideo   = document.getElementById('bgVideo');
  
      if (!zone || !video || !bgStatic || !bgVideo) return;
  
      let hasPlayed   = false;
      let isMobile    = window.matchMedia('(hover: none)').matches;
  
      /* Preload the video as soon as possible */
      video.load();
  
      /* ── Transition to video ── */
      function showVideo() {
        if (hasPlayed) return; /* Only play once */
        hasPlayed = true;
  
        bgVideo.classList.add('active');
        /* Slight delay so the cross-fade looks intentional */
        setTimeout(() => {
          video.currentTime = 0;
          video.play().catch(() => {});
        }, 150);
      }
  
      /* ── Transition back to static image ── */
      function showStatic(immediate) {
        const delay = immediate ? 0 : 600;
        setTimeout(() => {
          bgVideo.classList.remove('active');
        }, delay);
      }
  
      /* ── Desktop: mouse enter/leave ── */
      zone.addEventListener('mouseenter', () => {
        if (!hasPlayed) showVideo();
      });
  
      /* ── On video end: hold last frame briefly, then revert ── */
      video.addEventListener('ended', () => {
        /* Hold the last frame for 2 s then smoothly revert */
        setTimeout(() => {
          showStatic(false);
        }, 2000);
      });
  
      /* ── Mobile: single tap toggles video ── */
      if (isMobile) {
        zone.addEventListener('click', () => {
          if (!hasPlayed) {
            showVideo();
          }
        });
      }
  
      /* ── Reinit if window resizes between mobile/desktop ── */
      window.matchMedia('(hover: none)').addEventListener('change', (e) => {
        isMobile = e.matches;
      });
    }
  
    /* ===================================================
       PAGE TRANSITIONS (fade out → navigate)
    =================================================== */
    function initPageTransitions() {
      if (!overlay) return;
  
      /* Intercept all same-origin navigation links */
      document.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href');
        /* Only handle relative links to our pages */
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;
  
        link.addEventListener('click', (e) => {
          /* Don't intercept modifier-key clicks (new tab etc.) */
          if (e.ctrlKey || e.metaKey || e.shiftKey) return;
  
          e.preventDefault();
          overlay.classList.add('fade-out');
  
          setTimeout(() => {
            window.location.href = href;
          }, 480);
        });
      });
    }
  
    /* ===================================================
       MOBILE HINT — brief ripple to hint at the secret zone
    =================================================== */
    function showMobileHint() {
      if (!isHome) return;
      const zone = document.getElementById('hoverZone');
      if (!zone) return;
  
      const isTouchDevice = window.matchMedia('(hover: none)').matches;
      if (!isTouchDevice) return;
  
      /* Show hint after 2 seconds on mobile */
      setTimeout(() => {
        zone.classList.add('hint');
        setTimeout(() => zone.classList.remove('hint'), 2200);
      }, 2000);
    }
  
  })();