/**
 * hello.js — origami note + star jar (say hello page)
 *
 * Messages are stored in Supabase so every visitor's jar is shared.
 * Fill in SUPABASE_URL / SUPABASE_ANON_KEY below (Project Settings → API)
 * after running the schema + RLS policies from the project plan.
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://suknacyowxxerwgvdhfy.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1a25hY3lvd3h4ZXJ3Z3ZkaGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTc1OTUsImV4cCI6MjEwNDU3MzU5NX0.nswLR5F75-YyXYMcebtu_nlav7CkfwmZbC65cJOIKmA';
  const MAX_LEN = 280;
  const COLOR_KEYS = ['pink', 'lemon', 'mint', 'sky'];

  let db = null;
  try {
    if (window.supabase && SUPABASE_URL.indexOf('YOUR_') === -1) {
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (e) {}

  let messages = [];
  let usedSlots = [];
  let selectedColor = 'pink';
  let pendingRetry = null;
  let lastClickedStarEl = null;

  let jarStarsEl, jarCountEl, paperEl, swatchRowEl,
      overlayEl, composeCardEl, textareaEl, charCountEl, errorEl, honeypotEl,
      closeComposeBtn, doneBtn, readCardEl, readCardBodyEl, closeReadBtn, foldStarEl;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const jarEl = document.getElementById('jar');
    if (!jarEl) return;

    jarStarsEl = document.getElementById('jarStars');
    jarCountEl = document.getElementById('jarCount');
    paperEl = document.getElementById('paper');
    swatchRowEl = document.getElementById('swatchRow');
    overlayEl = document.getElementById('helloOverlay');
    composeCardEl = document.getElementById('composeCard');
    textareaEl = document.getElementById('composerTextarea');
    charCountEl = document.getElementById('charCount');
    errorEl = document.getElementById('composerError');
    honeypotEl = document.getElementById('honeypot');
    closeComposeBtn = document.getElementById('closeComposeBtn');
    doneBtn = document.getElementById('doneBtn');
    readCardEl = document.getElementById('readCard');
    readCardBodyEl = document.getElementById('readCardBody');
    closeReadBtn = document.getElementById('closeReadBtn');
    foldStarEl = document.getElementById('foldStar');

    swatchRowEl.querySelectorAll('.swatch').forEach((btn) => {
      btn.addEventListener('click', () => selectColor(btn.dataset.color));
    });

    paperEl.addEventListener('click', openComposer);
    closeComposeBtn.addEventListener('click', closeComposer);
    doneBtn.addEventListener('click', handleDoneClick);
    closeReadBtn.addEventListener('click', closeReadCard);
    textareaEl.addEventListener('input', () => {
      updateCharCount();
      updateDoneButtonState();
    });
    // Keep the note a single wrapping block of text (no Enter-inserted
    // <div>/<br> children) so the flex vertical-centering below stays correct.
    textareaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });
    // Force plain-text paste — rich/multi-block paste would otherwise insert
    // <div>/<p> children that break the flex vertical-centering above.
    textareaEl.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[\r\n]+/g, ' ');
      document.execCommand('insertText', false, text);
    });

    loadMessages();
  }

  /* ---- data ---- */

  async function loadMessages() {
    if (!db) {
      jarCountEl.textContent = 'connect a Supabase project to enable the jar';
      return;
    }
    const { data, error } = await db.from('jar_messages').select('*').order('created_at');
    if (error) {
      jarCountEl.textContent = "couldn't load messages";
      return;
    }
    messages = data || [];
    renderJar();
  }

  async function saveMessage(bodyText, colorKey) {
    if (!db) throw new Error('Supabase is not configured yet');
    const { data, error } = await db
      .from('jar_messages')
      .insert({ body: bodyText, color_key: colorKey })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /* ---- jar rendering ---- */

  function renderJar() {
    jarStarsEl.innerHTML = '';
    usedSlots = [];
    messages.forEach((m) => createStarEl(m, nextScatterSlot()));
    updateJarCount();
  }

  function updateJarCount() {
    const n = messages.length;
    jarCountEl.textContent = n === 0
      ? 'no messages yet — be the first'
      : n + (n === 1 ? ' message' : ' messages');
  }

  function nextScatterSlot() {
    const MIN_DIST = 16;
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidate = { xPct: 15 + Math.random() * 70, yPct: 15 + Math.random() * 75 };
      const tooClose = usedSlots.some((s) => Math.hypot(s.xPct - candidate.xPct, s.yPct - candidate.yPct) < MIN_DIST);
      if (!tooClose) {
        usedSlots.push(candidate);
        return candidate;
      }
    }
    const fallback = { xPct: 15 + Math.random() * 70, yPct: 15 + Math.random() * 75 };
    usedSlots.push(fallback);
    return fallback;
  }

  function createStarEl(message, slot) {
    const colorKey = COLOR_KEYS.includes(message.color_key) ? message.color_key : 'pink';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'star';
    btn.style.left = slot.xPct + '%';
    btn.style.top = slot.yPct + '%';
    btn.style.setProperty('--star-color', 'var(--star-' + colorKey + ')');
    btn.setAttribute('aria-label', 'Read message');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="12,1 15,9 23,9 16.5,14 19,22 12,17 5,22 7.5,14 1,9 9,9" /></svg>';
    btn.addEventListener('click', () => openReadCard(message, btn));
    jarStarsEl.appendChild(btn);
    return btn;
  }

  /* ---- colour selection ---- */

  function selectColor(colorKey) {
    selectedColor = colorKey;
    swatchRowEl.querySelectorAll('.swatch').forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.color === colorKey));
    });
    paperEl.style.setProperty('--paper-color', 'var(--star-' + colorKey + ')');
  }

  /* ---- generic expand/collapse (paper→composer, star→read) ---- */

  function flipOpen(triggerEl, cardEl) {
    const rect = triggerEl.getBoundingClientRect();
    cardEl.hidden = false;
    cardEl.style.position = 'fixed';
    cardEl.style.margin = '0';
    cardEl.style.top = rect.top + 'px';
    cardEl.style.left = rect.left + 'px';
    cardEl.style.width = rect.width + 'px';
    cardEl.style.height = rect.height + 'px';
    cardEl.style.borderRadius = getComputedStyle(triggerEl).borderRadius || '4px';
    triggerEl.style.visibility = 'hidden';
    overlayEl.classList.add('is-active');

    void cardEl.offsetHeight; // force reflow so the expand below transitions

    const expandedW = Math.min(window.innerWidth * 0.9, 480);
    const expandedH = Math.min(window.innerHeight * 0.8, 560);
    cardEl.style.top = ((window.innerHeight - expandedH) / 2) + 'px';
    cardEl.style.left = ((window.innerWidth - expandedW) / 2) + 'px';
    cardEl.style.width = expandedW + 'px';
    cardEl.style.height = expandedH + 'px';
    cardEl.style.borderRadius = '8px';
  }

  function flipClose(triggerEl, cardEl, opts) {
    opts = opts || {};
    overlayEl.classList.remove('is-active');

    if (opts.skipAnimation) {
      cardEl.hidden = true;
      cardEl.classList.remove('is-folding');
      cardEl.removeAttribute('style');
      triggerEl.style.visibility = '';
      return;
    }

    const rect = triggerEl.getBoundingClientRect();
    cardEl.style.top = rect.top + 'px';
    cardEl.style.left = rect.left + 'px';
    cardEl.style.width = rect.width + 'px';
    cardEl.style.height = rect.height + 'px';
    cardEl.style.borderRadius = getComputedStyle(triggerEl).borderRadius || '4px';

    const onEnd = (e) => {
      if (e.propertyName !== 'top') return;
      cardEl.removeEventListener('transitionend', onEnd);
      cardEl.hidden = true;
      cardEl.removeAttribute('style');
      triggerEl.style.visibility = '';
    };
    cardEl.addEventListener('transitionend', onEnd);
  }

  /* ---- composer flow ---- */

  function openComposer() {
    if (pendingRetry) {
      textareaEl.textContent = pendingRetry.body;
      selectColor(pendingRetry.color_key);
    }
    flipOpen(paperEl, composeCardEl);
    updateCharCount();
    updateDoneButtonState();
    errorEl.hidden = true;
    textareaEl.focus();
  }

  function closeComposer() {
    flipClose(paperEl, composeCardEl);
    pendingRetry = null;
    textareaEl.textContent = '';
    honeypotEl.value = '';
    updateCharCount();
    updateDoneButtonState();
  }

  function updateDoneButtonState() {
    // Nothing to save yet — disable "done" instead of letting them click
    // it just to see an error.
    doneBtn.disabled = textareaEl.textContent.trim().length === 0;
  }

  function updateCharCount() {
    // contenteditable has no native maxlength — enforce it here and keep the
    // cursor at the end (acceptable: this only ever triggers right at the cap).
    if (textareaEl.textContent.length > MAX_LEN) {
      textareaEl.textContent = textareaEl.textContent.slice(0, MAX_LEN);
      const range = document.createRange();
      range.selectNodeContents(textareaEl);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const remaining = MAX_LEN - textareaEl.textContent.length;
    charCountEl.textContent = remaining;
    charCountEl.parentElement.classList.toggle('is-low', remaining <= 20);
  }

  function validateMessage(text) {
    if (!text) return { ok: false, reason: 'Write something first.' };
    if (text.length > MAX_LEN) return { ok: false, reason: 'Keep it under ' + MAX_LEN + ' characters.' };
    return { ok: true };
  }

  function handleDoneClick() {
    // Honeypot: real visitors never fill this in. Bots that auto-fill every
    // field get silently dropped — no error, no insert attempted.
    if (honeypotEl.value) {
      closeComposer();
      return;
    }

    const text = textareaEl.textContent.trim();
    const check = validateMessage(text);
    if (!check.ok) {
      errorEl.textContent = check.reason;
      errorEl.hidden = false;
      return;
    }

    // The DB's CHECK constraint is the real length gate — this is just UX.
    errorEl.hidden = true;
    doneBtn.disabled = true;
    closeComposeBtn.disabled = true;
    pendingRetry = { body: text, color_key: selectedColor };

    Promise.all([
      saveMessage(text, selectedColor),
      playFoldAndFly(composeCardEl, selectedColor)
    ])
      .then(([savedRow, slot]) => finalizeNewStar(savedRow, slot))
      .catch(handleSaveError);
  }

  function playFoldAndFly(cardEl, colorKey) {
    return new Promise((resolve) => {
      const rect = cardEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      foldStarEl.style.setProperty('--star-color', 'var(--star-' + colorKey + ')');
      foldStarEl.style.left = centerX + 'px';
      foldStarEl.style.top = centerY + 'px';
      foldStarEl.hidden = false;

      cardEl.classList.add('is-folding');
      foldStarEl.classList.add('is-emerging');

      const slot = nextScatterSlot();

      function onEmergeEnd(e) {
        if (e.animationName !== 'starEmerge') return;
        foldStarEl.removeEventListener('animationend', onEmergeEnd);

        const jarRect = jarStarsEl.getBoundingClientRect();
        const targetX = jarRect.left + jarRect.width * (slot.xPct / 100);
        const targetY = jarRect.top + jarRect.height * (slot.yPct / 100);
        const dx = targetX - centerX;
        const dy = targetY - centerY;

        foldStarEl.style.setProperty('--mid-x', (dx * 0.5) + 'px');
        foldStarEl.style.setProperty('--mid-y', (dy * 0.5 - 90) + 'px');
        foldStarEl.style.setProperty('--end-x', dx + 'px');
        foldStarEl.style.setProperty('--end-y', dy + 'px');
        foldStarEl.classList.add('is-arcing');

        // The card has visually collapsed by now — reset it instantly so the
        // paper reappears while the star is still flying to the jar.
        flipClose(paperEl, cardEl, { skipAnimation: true });
      }
      foldStarEl.addEventListener('animationend', onEmergeEnd);

      function onArcEnd(e) {
        if (e.animationName !== 'starArc') return;
        foldStarEl.removeEventListener('animationend', onArcEnd);
        foldStarEl.hidden = true;
        foldStarEl.classList.remove('is-emerging', 'is-arcing');
        ['--mid-x', '--mid-y', '--end-x', '--end-y'].forEach((p) => foldStarEl.style.removeProperty(p));
        resolve(slot);
      }
      foldStarEl.addEventListener('animationend', onArcEnd);
    });
  }

  function finalizeNewStar(savedRow, slot) {
    messages.push(savedRow);
    createStarEl(savedRow, slot);
    updateJarCount();
    pendingRetry = null;
    textareaEl.textContent = '';
    honeypotEl.value = '';
    closeComposeBtn.disabled = false;
    updateDoneButtonState();
  }

  function handleSaveError(err) {
    console.error('Failed to save message:', err);
    foldStarEl.hidden = true;
    foldStarEl.classList.remove('is-emerging', 'is-arcing');
    composeCardEl.classList.remove('is-folding');
    doneBtn.disabled = false;
    closeComposeBtn.disabled = false;
    openComposer();
    errorEl.textContent = !db
      ? "The jar isn't connected yet, so this note can't be saved — but here's the animation."
      : 'Something went wrong saving your note — try again?';
    errorEl.hidden = false;
  }

  /* ---- read-only star modal ---- */

  function openReadCard(message, starEl) {
    lastClickedStarEl = starEl;
    readCardBodyEl.textContent = message.body;
    flipOpen(starEl, readCardEl);
  }

  function closeReadCard() {
    flipClose(lastClickedStarEl, readCardEl);
  }

})();
