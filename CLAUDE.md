# vivian-portfolio

Personal portfolio site for Vivian Yang. Fully static — **no framework, no build tool, no npm/node_modules**. Just plain HTML/CSS/JS served as-is (e.g. GitHub Pages). Fonts: Cormorant Garamond (display/serif) + DM Sans (body), loaded from Google Fonts CDN.

## Files

- `index.html` — home page (hero, 杨 glyph mosaic, day/night toggle)
- `projects.html` — projects page (currently a "revamp in progress" placeholder)
- `connect.html` — simple contact links (email/linkedin/github/instagram); no longer linked from the nav (see below), reachable only by direct URL
- `hello.html` + `hello.js` — "say hello" page: origami note + star jar, backed by Supabase; this is what the nav's "connect" link now points to
- `style.css` — single global stylesheet for all pages
- `script.js` — shared site JS: day/night theme toggle, page-transition fades, home-page 杨 glyph mosaic (loaded on every page)
- `chime-branch.png`, `chime-tube-1.png` … `chime-tube-5.png` — hand-drawn wind-chime artwork from the retired chimes feature — **unused**, kept in the repo but not referenced anywhere
- `favicon.PNG`, `chibiv.PNG` — misc image assets
- `footer.js` — **dead code**, not referenced anywhere (footer markup is hardcoded inline in each HTML page instead)

There is no `main.js` — `index.html`/`projects.html`/`connect.html`/`hello.html` all load `script.js`.

## Local dev

No build step — just open the HTML files, or serve the directory for a URL-based origin (needed for `hello.html`'s Supabase fetches to behave like production). **Browser caching bites hard during active CSS/JS iteration** — a plain `python3 -m http.server` will often keep serving a stale `style.css` after edits even on a manual refresh. If you spin up a local server for testing, prefer sending `Cache-Control: no-store` (a handler subclassing `http.server.SimpleHTTPRequestHandler` and overriding `end_headers()` works fine) rather than the plain server, and always hard-refresh (Cmd+Shift+R) if something looks unchanged before assuming the code is wrong.

## Site-wide day/night theme

- CSS custom properties in `:root` (`style.css`) define light-mode tokens (`--surface-hero`, `--surface-inner`, `--surface-card`, `--text-strong`, `--text-muted`, `--hairline-rgb`, `--hero-ink-rgb`, etc.); `[data-theme="night"]` overrides them.
- Toggled via a `.theme-toggle` button in the nav on every page, persisted to `localStorage` (`theme` key), applied by `initThemeToggle()` in `script.js`.
- An inline `<script>` in every page's `<head>` (before the `style.css` `<link>`) reads `localStorage` and sets `data-theme="night"` on `<html>` synchronously, to avoid a flash of the wrong theme on load. If nothing is stored yet (a first-time visitor), it falls back to a **time-of-day default** — night from 19:00–07:00 local time — instead of always defaulting to light; the moment a visitor uses the toggle, their explicit choice is persisted and wins on every future visit regardless of the time. This same snippet is duplicated in all four pages' `<head>`s (no shared file to import from, per the no-build-step constraint) — keep them in sync if it changes.
- The home hero used to force a dark background in both themes (a deliberate exception); it doesn't anymore — `--surface-hero` now flips with `[data-theme="night"]` like every other surface, and hero text/nav/button colors use the `--hero-ink-rgb` token (an rgb triplet, same pattern as `--hairline-rgb`) instead of a hardcoded cream value, so they read correctly in both themes.

## 杨 glyph mosaic (`index.html` hero only)

The hero's decorative centerpiece is the character **杨** (the site owner's surname), rendered as hundreds of tiny copies of itself:

1. A large 杨 is drawn once to an off-screen `<canvas>` in Noto Sans SC (weight 900, loaded via Google Fonts' `text=` subsetting param so only that one glyph downloads).
2. Its pixel data is sampled on a grid (`GRID_STEP` in `initGlyphMosaic()`, `script.js`) — every point landing inside a stroke becomes a seed for one tiny 杨.
3. Every frame, each point is redrawn on the visible `#glyphCanvas`: it eases back toward its seed position (a light spring), has a small ambient sway so it's never fully static, and is pushed aside when the cursor passes near, settling back after. Independent per-point springs, not a connected chain/mesh — cheaper than simulating constraints across ~700 points for a visually equivalent "reacts, then settles" feel.

Sound: a single continuous, quiet **brown-noise water murmur** (not discrete notes/clicks) — one looping buffer, started once and never restarted, run through a narrow highpass+lowpass band with one slow LFO for a gentle breathing swell. Only its gain moves, driven every frame by proximity to the character + cursor speed (silent at rest, eases up while brushing through, eases back down). **Hard platform constraint, not a bug**: browsers refuse to unlock any Web Audio context before the user's first click/keydown/touch/pointerdown anywhere on the page — moving the cursor alone can never produce sound on a fresh page load, in any browser, and there's no code-side way around this. `unlockAudio()` creates the context eagerly on script load and resumes it on the first real gesture (which a drag's initial press already satisfies).

Clicking the theme toggle also sends a one-shot velocity "gust" through every point (`triggerGust()`, returned by `initGlyphMosaic()` and wired up in `initThemeToggle()`'s click handler).

If you touch hero sizing: **verify empirically with Playwright** (`page.locator(...).boundingBox()`, check `document.documentElement.scrollHeight` vs viewport height) across a range of real viewport sizes, not by hand-deriving pixel math.

Removed in this project's history: the original wind-chimes feature (cherry-blossom branch + 5 hanging tube images + per-chime spring, `chime-branch.png`/`chime-tube-*.png`) — superseded by the above; an unlisted "vy." logo easter egg (media-mode background photo/video toggle) — fully deleted, do not resurrect either.

## "Say hello" page — origami note + star jar (`hello.html` / `hello.js`)

Flow: pick one of 4 pastel colors → tap the paper (expands center-screen, background blurs) → write a note (centered contenteditable div, not a `<textarea>` — see below) → "done" folds the paper into a star (pure CSS animation, no external assets) and flies it into the jar → click any star (yours or another visitor's) to reread it. The composer/paper sits on the **left** and the jar on the **right** in `.hello-layout` — deliberately, so the fold→star→jar flight (computed dynamically from the jar's actual `getBoundingClientRect()` in `hello.js`, not a hardcoded direction) travels left-to-right, matching reading order.

- Backed by **Supabase** (table `jar_messages`: `id`, `created_at`, `color_key` ∈ `{pink,lemon,mint,sky}`, `body` 1–280 chars via CHECK constraint). RLS: public `select` and `insert` only — no `update`/`delete` for anon, so a bad/test message can only be removed via the Supabase dashboard (Table Editor), not from the client.
- `SUPABASE_URL`/`SUPABASE_ANON_KEY` are hardcoded at the top of `hello.js` — this is intentional and safe (the anon/public key is meant to be client-visible; RLS is the actual access boundary). **Never put the Supabase secret/service-role key here** — that bypasses RLS entirely and must never touch client-side code.
- The message box is a `contenteditable` div (not `<textarea>`) specifically so it can be centered both horizontally *and* vertically via flexbox on a wrapper — centering a `<textarea>`'s content that way doesn't work. Hard line breaks are blocked (`Enter` prevented, paste sanitized to plain text) because inserted `<div>`/`<br>` children would break that centering trick.
- The animation always plays on "done" regardless of whether the Supabase save succeeds — they're kicked off concurrently (`Promise.all`) so the ~1s fold animation hides normal network latency; a save failure reopens the composer with the text preserved and shows an inline error instead of losing the draft.
