# vivian-portfolio

Personal portfolio site for Vivian Yang. Fully static — **no framework, no build tool, no npm/node_modules**. Just plain HTML/CSS/JS served as-is (e.g. GitHub Pages). Fonts: Cormorant Garamond (display/serif) + DM Sans (body), loaded from Google Fonts CDN.

## Files

- `index.html` — home page (hero, 杨 glyph mosaic, water ripple layer, day/night toggle)
- `projects.html` — projects page: currently one line on a blank page ("This page is currently being revamped, check back soon"). The owner will bring real project content later — don't invent placeholder projects. The old grid/card CSS is kept in `style.css` for when they arrive.
- `hello.html` + `hello.js` — "say hello" page: origami note + star jar, backed by Supabase; this is what the nav's "connect" link points to
- `style.css` — single global stylesheet for all pages
- `script.js` — shared site JS: day/night theme toggle, nav (scroll surface + logo hover), particle page transitions, home-page water ripples + 杨 glyph mosaic (loaded on every page)
- `favicon.PNG` — hand-drawn sun, 256×256 (resized down from a 2000px original); also used as the link-preview image (`og:image`)
- `chibiv.PNG` — chibi drawing, **not referenced anywhere yet** — kept on purpose as a possible future hand-drawn touch

There is no `main.js` — `index.html`/`projects.html`/`hello.html` all load `script.js`. Footer markup is hardcoded inline in each page.

## Palette, nav and buttons

- One warm hue at three depths: **petal** `#e8c4be` (marks and particles: the 杨 mosaic, "Vivian.", the logo's period, the active-nav underline, the "Say hello" underline), **rose** `#a0574f` as `--color-accent` (hovers, labels; at night the accent is petal itself), **dusk** `#2c1f1d` (text in day mode, card/dialog surfaces at night). Page background `#f8f4f1` by day, `#120c0b`/`#17100f` by night. Hairlines and shadows use dusk-tinted `--hairline-rgb`/`--shadow-rgb`, not black. Use `--accent-rgb` instead of hardcoding rgba accent values.
- No petal period after page titles or the projects line — the owner decided only "Vivian." and the vy. logo carry the petal dot.
- One nav style on every page: transparent, gaining a blurred surface (`nav.is-scrolled`, toggled in `initNav()`) once the page scrolls. There are no `.dark` variants anymore. The vy. logo's letters (`.nav-logo .g`) lift one after another on hover.
- `--ease-settle` (`cubic-bezier(0.2, 0.7, 0.2, 1)`) is the one easing curve for choreographed motion; springs stay exclusive to the mosaic. Primary button: dusk fill → accent on hover, arrow nudges right.

## Page transitions

`initPageTransitions()` in `script.js`: clicking an internal link turns the current page's headline (the element marked `data-tx-word` — `.hero-name`, the projects line, hello's `.section-title`) into petal particles (tiny 杨s) that drift out of focus while `<main>` blurs out; nav and footer never move. Particle positions are handed to the next page via `sessionStorage` (`vy-tx`, plus a `vy-tx-at` timestamp). The inline `<head>` snippet on every page reads that timestamp and adds `tx-in` + `tx-arrived` to `<html>` before first paint, so `<main>` starts hidden (no flash). On arrival the particles scatter, gather on the new headline left to right (staying soft), and the real headline pulls into focus underneath as they dissolve. **The particle version plays once per session** (the first internal page change, flagged by `vy-tx-seen` in `sessionStorage`; a page refresh clears the flag, so the next change plays the particles again); every page change after that is a quick blur out (160ms) / blur in (260ms) of `<main>` — `vy-tx` is set to `'quick'` and the same `tx-in` class hides `<main>` until it eases in. This is deliberate: a ~1.5s flourish on every click turns the signature moment into a toll, and it competes with the 杨 mosaic. Clicking another link while any transition is running skips straight to that page. Every page needs exactly one `data-tx-word` headline. Reduced motion skips all of it. The old white `.page-transition` overlay is gone.

## Type system

Every piece of text uses one of four styles — keep it that way when adding anything:

- **Display** — Cormorant Garamond Light; only for the hero name ("Vivian.") and page titles (`.section-title`).
- **Large** — DM Sans Regular 24 (e.g. `.card-title`).
- **Body** — DM Sans Regular 16, usually in `--text-muted` (hero eyebrow/intro, page subtitles).
- **Small** — DM Sans 14; Regular for nav, labels, captions, footer; Medium (500) for buttons.

Rules: **sentence case everywhere** (capitalize the first word and proper nouns — no all-lowercase, no Title Case, no `text-transform`); **no letter-spacing** on text; **no italics**; hierarchy through size and color only (`--text-strong`, `--text-muted`, petal for marks). Exceptions: the "vy." logo keeps its italic serif (it's a logo, not text), and the note text inside hello's composer/read cards keeps Cormorant 22 as part of the origami-note look. The hero intro is one sentence the owner wrote — don't reword it.

## Link previews

Each page's `<head>` has a meta description plus Open Graph/Twitter tags (`og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`), so links shared on LinkedIn/iMessage/etc. render a preview. `og:url`/`og:image` are absolute URLs on the GitHub Pages address, `https://vyviin.github.io/vivian-portfolio/` — update them if the site ever moves to a custom domain. Duplicated per page like the theme snippet (no build step).

## Motion & accessibility

- `prefers-reduced-motion: reduce` is honored: in `script.js`, the mosaic drops its ambient sway and the load/theme-toggle gusts (motion the visitor causes — cursor push, tap — still works); in `style.css`, the hero/card entrance animations become instant, and the particle page transition is skipped entirely. The CSS rule is **deliberately scoped to specific selectors, not a global `*` rule** — `hello.js` waits on `animationend`/`transitionend` for the origami fold and star flight.
- A `pageshow` listener in `initPageTransitions()` resets a page restored from the back/forward cache — otherwise pressing Back after clicking a link could show the page still blurred out under the particle canvas.
- Touch: since phones have no hover, a tap on the mosaic pushes nearby points outward from the finger (`burst()` in `initGlyphMosaic()`).

## Local dev

No build step — just open the HTML files, or serve the directory for a URL-based origin (needed for `hello.html`'s Supabase fetches to behave like production). **Browser caching bites hard during active CSS/JS iteration** — a plain `python3 -m http.server` will often keep serving a stale `style.css` after edits even on a manual refresh. If you spin up a local server for testing, prefer sending `Cache-Control: no-store` (a handler subclassing `http.server.SimpleHTTPRequestHandler` and overriding `end_headers()` works fine) rather than the plain server, and always hard-refresh (Cmd+Shift+R) if something looks unchanged before assuming the code is wrong.

## Site-wide day/night theme

- CSS custom properties in `:root` (`style.css`) define light-mode tokens (`--surface-hero`, `--surface-inner`, `--surface-card`, `--text-strong`, `--text-muted`, `--hairline-rgb`, `--hero-ink-rgb`, etc.); `[data-theme="night"]` overrides them.
- Toggled via a `.theme-toggle` button in the nav on every page, persisted to `localStorage` (`theme` key), applied by `initThemeToggle()` in `script.js`.
- An inline `<script>` in every page's `<head>` (before the `style.css` `<link>`) reads `localStorage` and sets `data-theme="night"` on `<html>` synchronously, to avoid a flash of the wrong theme on load. If nothing is stored yet (a first-time visitor), it falls back to a **time-of-day default** — night from 19:00–07:00 local time — instead of always defaulting to light; the moment a visitor uses the toggle, their explicit choice is persisted and wins on every future visit regardless of the time. The same snippet also adds the page-transition arrival classes (see "Page transitions"). It is duplicated in all three pages' `<head>`s (no shared file to import from, per the no-build-step constraint) — keep them in sync if it changes.
- The home hero used to force a dark background in both themes (a deliberate exception); it doesn't anymore — `--surface-hero` now flips with `[data-theme="night"]` like every other surface, and hero text/nav/button colors use the `--hero-ink-rgb` token (an rgb triplet, same pattern as `--hairline-rgb`) instead of a hardcoded cream value, so they read correctly in both themes.

## 杨 glyph mosaic (`index.html` hero only)

The hero's decorative centerpiece is the character **杨** (the site owner's surname), rendered as hundreds of tiny copies of itself:

1. A large 杨 is drawn once to an off-screen `<canvas>` in Noto Sans SC (weight 900, loaded via Google Fonts' `text=` subsetting param so only that one glyph downloads).
2. Its pixel data is sampled on a grid (`GRID_STEP` in `initGlyphMosaic()`, `script.js`) — every point landing inside a stroke becomes a seed for one tiny 杨.
3. Every frame, each point is redrawn on the visible `#glyphCanvas`: it eases back toward its seed position (a light spring), has a small ambient sway so it's never fully static, and is pushed aside when the cursor passes near, settling back after. Independent per-point springs, not a connected chain/mesh — cheaper than simulating constraints across ~700 points for a visually equivalent "reacts, then settles" feel.

Sound: a single continuous, quiet **brown-noise water murmur** (not discrete notes/clicks) — one looping buffer, started once and never restarted, run through a narrow highpass+lowpass band with one slow LFO for a gentle breathing swell. Only its gain moves, driven every frame by proximity to the character + cursor speed (silent at rest, eases up while brushing through, eases back down). **Hard platform constraint, not a bug**: browsers refuse to unlock any Web Audio context before the user's first click/keydown/touch/pointerdown anywhere on the page — moving the cursor alone can never produce sound on a fresh page load, in any browser, and there's no code-side way around this. `unlockAudio()` creates the context eagerly on script load and resumes it on the first real gesture (which a drag's initial press already satisfies).

Clicking the theme toggle also sends a one-shot velocity "gust" through every point (`triggerGust()`, returned by `initGlyphMosaic()` and wired up in `initThemeToggle()`'s click handler).

If you touch hero sizing: **verify empirically with Playwright** (`page.locator(...).boundingBox()`, check `document.documentElement.scrollHeight` vs viewport height) across a range of real viewport sizes, not by hand-deriving pixel math.

Removed in this project's history: the original wind-chimes feature (cherry-blossom branch + 5 hanging tube images + per-chime spring) — superseded by the above, and its leftover `chime-branch.png`/`chime-tube-*.png` art has since been deleted from the repo too; an unlisted "vy." logo easter egg (media-mode background photo/video toggle) — fully deleted, do not resurrect either. Also deleted: `connect.html` (an orphaned contact-links page — the footer on every page already carries the same four links) and the dead `footer.js`. All recoverable from git history if ever needed.

## Water ripples (`index.html` only)

The home page is a still surface: `initWater()` in `script.js` draws into `#waterCanvas` (fixed, full-viewport, `z-index: 1`, behind the hero and footer). Moving the cursor leaves a faint wake that spreads a short way and settles within about a second; a click (not on a link/button) drops one small ring.

- It's a real 2D wave-equation height field on a coarse grid (one cell = 3 CSS px). The canvas bitmap *is* the grid; CSS stretches it to the viewport and browser smoothing softens it. Edges have a sponge band so ripples don't bounce off the window.
- Lit like sun on a pool floor from the upper left: highlight on slopes facing the light, soft shade (dusk by day, black by night) on slopes facing away, and a faint petal line where ripples focus light. It must work in **both themes** — the owner rejected an earlier wind/particle idea partly because it only looked good at night.
- **Deliberately very subtle.** The owner iterated it down twice ("way too dramatic", then "still more subtle"): strength eases in with cursor speed (`speed / (speed + 7)`), so a very slow drift barely marks the surface, and a flick is capped. Don't turn it up without being asked.
- 杨 keeps its own cursor push/spring exactly as before (the owner explicitly didn't want that replaced). The only link: the mosaic offsets each point's *drawing* by the water slope beneath it (`water.slopeAt()`, `REFRACT`), so passing ripples bend it slightly. Physics untouched.
- The simulation sleeps (nothing computed, canvas cleared) once the water is still. Reduced motion halves the ripple strength; it's visitor-caused motion, so it isn't removed.
- The 杨 mask is sampled only after Noto Sans SC loads (`document.fonts.load`, 1.5s cap) — sampling immediately on a first visit traced a thinner fallback font and left 杨 sparse.

## "Say hello" page — origami note + star jar (`hello.html` / `hello.js`)

Flow: pick one of 4 pastel colors → tap the paper (expands center-screen, background blurs) → write a note (centered contenteditable div, not a `<textarea>` — see below) → "done" folds the paper into a star (pure CSS animation, no external assets) and flies it into the jar → click any star (yours or another visitor's) to reread it. The composer/paper sits on the **left** and the jar on the **right** in `.hello-layout` — deliberately, so the fold→star→jar flight (computed dynamically from the jar's actual `getBoundingClientRect()` in `hello.js`, not a hardcoded direction) travels left-to-right, matching reading order.

- Backed by **Supabase** (table `jar_messages`: `id`, `created_at`, `color_key` ∈ `{pink,lemon,mint,sky}`, `body` 1–280 chars via CHECK constraint). RLS: public `select` and `insert` only — no `update`/`delete` for anon, so a bad/test message can only be removed via the Supabase dashboard (Table Editor), not from the client.
- `SUPABASE_URL`/`SUPABASE_ANON_KEY` are hardcoded at the top of `hello.js` — this is intentional and safe (the anon/public key is meant to be client-visible; RLS is the actual access boundary). **Never put the Supabase secret/service-role key here** — that bypasses RLS entirely and must never touch client-side code.
- The message box is a `contenteditable` div (not `<textarea>`) specifically so it can be centered both horizontally *and* vertically via flexbox on a wrapper — centering a `<textarea>`'s content that way doesn't work. Hard line breaks are blocked (`Enter` prevented, paste sanitized to plain text) because inserted `<div>`/`<br>` children would break that centering trick.
- The animation always plays on "done" regardless of whether the Supabase save succeeds — they're kicked off concurrently (`Promise.all`) so the ~1s fold animation hides normal network latency; a save failure reopens the composer with the text preserved and shows an inline error instead of losing the draft.
