/**
 * VIVIAN YANG PORTFOLIO — main.js
 */

(function () {
    'use strict';
  
    const overlay = document.getElementById('pageTransition');
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
      const logoToggle = document.getElementById('logoToggle');
  
      if (!zone || !video || !bgStatic || !bgVideo) return;
  
      let hasPlayed   = false;
      let isMobile    = window.matchMedia('(hover: none)').matches;
  
      /* Toggle Media Mode when clicking "vy." */
      if (logoToggle) {
        logoToggle.addEventListener('click', (e) => {
          e.preventDefault();
          document.body.classList.toggle('media-mode');
        });
      }

      /* Preload the video */
      video.load();
  
      /* ── Transition to video ── */
      function showVideo() {
        // Only play if media-mode is active and it hasn't played yet
        if (!document.body.classList.contains('media-mode') || hasPlayed) return; 
        
        hasPlayed = true;
        bgVideo.classList.add('active');
        
        setTimeout(() => {
          video.currentTime = 0;
          video.play().catch(() => {});
        }, 150);
      }
  
      /* ── Transition back to static image ── */
      function showStatic() {
        bgVideo.classList.remove('active');
      }
  
      /* ── Desktop: mouse enter ── */
      zone.addEventListener('mouseenter', () => {
        showVideo();
      });
  
      /* ── On video end: revert ── */
      video.addEventListener('ended', () => {
        setTimeout(() => {
          showStatic();
        }, 2000);
      });
  
      /* ── Mobile: single tap toggles video ── */
      if (isMobile) {
        zone.addEventListener('click', () => {
          showVideo();
        });
      }
    }
  
    function initPageTransitions() {
      if (!overlay) return;
      document.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;
        link.addEventListener('click', (e) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey) return;
          e.preventDefault();
          overlay.classList.add('fade-out');
          setTimeout(() => {
            window.location.href = href;
          }, 480);
        });
      });
    }
  
    function showMobileHint() {
      if (!isHome) return;
      const zone = document.getElementById('hoverZone');
      if (!zone || !window.matchMedia('(hover: none)').matches) return;
      setTimeout(() => {
        zone.classList.add('hint');
        setTimeout(() => zone.classList.remove('hint'), 2200);
      }, 2000);
    }
  
  })();