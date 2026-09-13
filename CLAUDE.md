# CLAUDE.md

Guidance for working in this repository.

## What this is

**Capital Connect LK** — a small marketing/landing website for a Sri Lankan
"investor introductions" program (connects founders with investors on a
success-only fee basis). It is a **static site**: hand-written HTML, one CSS
file, and a few vanilla-JS scripts. **No framework, no bundler, no package
manager, no dependencies to install.**

Shared UI (header, footer, WhatsApp widget) is factored into **HTML partials**
that are loaded at runtime by a tiny vanilla-JS include system — so there is
still no build step, but common components live in exactly one place.

Production domain: `https://capitalconnectlk.info/`

## Repository layout

```
capitalconectlkweb/
├── index.html               # Home / landing page (page-specific sections only)
├── contact.html             # Intake form page (page-specific form only)
├── styles.css               # ALL shared styling (single file, no framework)
├── sitemap.xml              # SEO sitemap (lists the two real pages)
├── logo.png                 # Logo (used everywhere; also og:image + JSON-LD logo)
├── partials/                # Shared components — injected via data-include (SEE BELOW)
│   ├── header.html            # Site header + nav + "Book a Call" CTA
│   ├── footer.html            # Site footer + disclaimer + social
│   └── whatsapp-widget.html   # Floating WhatsApp chat widget markup
├── assets/
│   ├── include.js             # Component loader + effect orchestrator (loads partials, then inits effects)
│   ├── liquid-button.js       # Pointer-proximity "liquid"/tilt effect for .btn
│   ├── liquid-banner.js       # Pointer-follow glow effect for the .banner CTA block
│   └── whatsapp-widget.js     # WhatsApp widget behaviour (open/close + mobile collapse)
└── CLAUDE.md                # This file
```

Only two real pages exist: `index.html` and `contact.html`.

## Component system (IMPORTANT — read before editing shared UI)

Header, footer, and the WhatsApp widget are **no longer duplicated** in each
page. Each page contains a placeholder:

```html
<div data-include="header"></div>
<div data-include="footer"></div>
<div data-include="whatsapp-widget"></div>
```

`assets/include.js` runs on `DOMContentLoaded`, fetches `partials/<name>.html`
for every `[data-include]` element, replaces the placeholder with the partial's
markup, and **then** initialises the effect scripts (so they bind to buttons /
widget markup that lives inside the injected partials).

**To change a header/footer/widget → edit the file in `partials/` ONCE.** Do not
paste that markup back into the pages.

### How the JS is wired
The effect scripts do **not** auto-run. Each defines an init function on a
shared `window.CCLK` namespace:

| Script | Exposes | Binds to |
|---|---|---|
| `assets/liquid-button.js` | `CCLK.initLiquidButtons()` | all `.btn` |
| `assets/liquid-banner.js` | `CCLK.initLiquidBanner()` | `.banner` (no-op if absent) |
| `assets/whatsapp-widget.js` | `CCLK.initWhatsApp()` | `.whatsapp-widget` |
| `assets/header-scroll.js` | `CCLK.initHeaderScroll()` | `.header` |

`assets/include.js` calls all four (guarded, once) after partials are injected,
then dispatches a `components:loaded` event on `document`. Each init is
idempotent (guarded by a `_*Done` flag) so calling twice is safe.

Load order in each page's `<head>` (all `defer`, order matters — include.js
last):

```html
<script src="assets/liquid-button.js" defer></script>
<script src="assets/liquid-banner.js" defer></script>
<script src="assets/whatsapp-widget.js" defer></script>
<script src="assets/header-scroll.js" defer></script>
<script src="assets/include.js" defer></script>
```

### Header shape + auto-hide-on-scroll
The header (`partials/header.html`) is a fully rounded pill (`border-radius:999px`
in `styles.css`, `.header`). `assets/header-scroll.js` hides it as you scroll
down and reveals it as you scroll up — **continuously and proportionally to
scroll distance**, not as a binary show/hide snap. It tracks a `progress`
value (0 = fully shown, 1 = fully hidden) that increases/decreases with every
pixel scrolled, written each frame to a `--header-hide` CSS custom property on
`.header`. `styles.css` reads that variable directly:
`transform: translate3d(0, calc(var(--header-hide) * -130%), 0)`, plus a
short (`.2s`) transition that only smooths the gap *between* animation
frames — the header's position is otherwise driven by how far you've
actually scrolled, the same technique `assets/whatsapp-widget.js` uses for
its own scroll-linked mobile collapse (`--wa-collapse-progress`). This is
what makes the motion feel tied to the scroll gesture (like iOS Safari's URL
bar) instead of a fixed-duration open/close animation that plays the same way
regardless of how far or fast you scrolled.

**Pure slide, no fade.** `.header` has no `opacity` tied to `--header-hide` —
only `transform` moves. Don't reintroduce an opacity fade here without being
asked; it was deliberately removed in favor of a plain up/down slide.

Constants (top of `assets/header-scroll.js`):
- `REVEAL_AT_TOP` (40px) — always fully visible within this many px of the top.
- `HIDE_DISTANCE` (260px) — how much scrolling it takes to go from fully
  shown to fully hidden. Raise this for a slower, more gradual reveal; lower
  it for a snappier one. A single normal scroll tick (~100–150px) should
  only partially hide the header, not snap it fully away — if a future
  change makes that happen again, `HIDE_DISTANCE` is too small relative to
  typical scroll deltas.
- `HIDDEN_CLASS_AT` (0.92) — progress beyond which the `is-header-hidden`
  class is added, purely to set `pointer-events: none` once the header has
  slid far enough off-screen to be effectively gone (so it can't intercept
  clicks up there while hidden).

**Important:** the hide/show logic itself always runs — it is *not* gated
behind `prefers-reduced-motion` in JS. A browser/OS (or automated test
environment) reporting reduced motion would otherwise disable the whole
feature, which reads as "the animation doesn't work" rather than "reduced
motion." Instead, `prefers-reduced-motion: reduce` is handled purely in CSS
(`styles.css`, the media query on `.header`): those users still get the
show/hide state change, just with the `transition` dropped (an instant snap
instead of an animated slide). If you ever need to gate a scroll effect on
reduced motion again, do it in the CSS transition, not by skipping the JS
state change.

### Logo treatment
The logo renders as a plain `<img class="logo-image">` — no background box,
padding, border-radius, or shadow — directly before the "Capital Connect LK"
text, in the header, the contact page's form-card header, and the footer. The
**one exception** is the footer: `logo.png`'s mark is dark ink on a transparent
background, which would nearly disappear on the footer's dark navy background,
so `.footer .logo-image` (in `styles.css`) keeps a small white backing (no
shadow) just there. Header and the contact-page card sit on light glass
backgrounds, so the raw PNG shows cleanly with no backing needed.

### Mobile header/CTA: scale down, never wrap to a second line
On narrow viewports the site name and the "Book a Call" / "Request a Call"
buttons must stay on one line each — never break into two lines — by scaling
down together as the viewport narrows. This applies in **two** places that
both use the same `.logo` / `.logo-image` / `.site-title` / `.btn.small`
markup pattern:
- The shared header (`partials/header.html`) — rules under `.header` in the
  `@media (max-width: 520px)` block in `styles.css`.
- The contact page's own form-card header (`.form-head` in `contact.html`,
  markup local to that page, not the shared partial) — a matching
  `@media (max-width: 520px)` block in `contact.html`'s inline `<style>`.

Both use `white-space: nowrap` plus `clamp()`-based font-size/padding/gap so
text shrinks fluidly instead of wrapping, down to a 320px-wide viewport.
**If you add a third place with this same logo+title+button pattern, mirror
these rules there too** — the fix is not automatically shared, since
`contact.html`'s `.form-head` markup is standalone (see the "Repeatable edit
rules" exception below).

Note also: `.btn` (all buttons, everywhere) got `white-space: nowrap` added
as part of this fix, so button labels never break mid-word. This is safe
everywhere in the current layout — buttons either sit in a `flex-wrap: wrap`
container (the whole button drops to the next line if it doesn't fit, e.g.
`.actions`) or have comfortable room (footer, form). If you add a button
inside a *tight, non-wrapping* flex row in the future, make sure there's
enough space or add a `clamp()` shrink like the header's, rather than
removing the global `nowrap`.

## Running locally

Partials are fetched over HTTP, so you **must** serve the folder — opening the
`.html` files directly with `file://` blocks the fetch and the shared
header/footer/widget will not appear (`include.js` logs a clear error in that
case).

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`. Any static server works (`npx serve`,
VS Code Live Server, etc.). Verified working: both pages render, all three
partials inject, form progress bar updates, WhatsApp widget opens/closes, and
there are no console errors.

## Deployment

Static hosting — deploy by uploading the files as-is (no build). The host must
serve over HTTP(S) (any real static host does) so the partials can be fetched.
Shared components load client-side via `fetch`, so keep the `partials/` folder
alongside the pages. There is no CI/build config; publishing = copying these
files to the web root.

## Architecture & conventions

- **Styling lives in `styles.css`** and is shared by both pages. `contact.html`
  additionally has a page-specific `<style>` block in its `<head>` for the
  intake form's "liquid glass" look — that form styling is NOT in `styles.css`.
- **Design system** is defined as CSS custom properties in `:root` at the top of
  `styles.css` (brand blue `--brand:#0A84FF`, `--brand-2:#5AC8FA`, glass cards,
  radii, shadows). Reuse these tokens instead of hard-coding colors.
- **Visual language:** Apple-style "liquid glass" — frosted `backdrop-filter`
  blur, soft gradients, animated background glow blobs, rounded pills, and lots
  of `@keyframes` animations (bottom of `styles.css`).
- **Fonts:** Satoshi, imported via `@import` from `fonts.cdnfonts.com` at the top
  of `styles.css`. Both pages `preconnect` to `fonts.cdnfonts.com`.
- **JS is progressive enhancement.** Each effect script guards for a missing
  target and is idempotent. The visual design works with JS disabled; only the
  shared header/footer/widget (which are JS-injected) and hover effects require
  JS. Scripts use `defer`.
- **Icons** are inline SVG (no icon library).
- **Responsive** breakpoints are at the bottom of `styles.css`: `1040px`,
  `920px`, `520px`. Nav hides below `520px`; the WhatsApp widget collapses to a
  circle below `640px` (handled in JS via `matchMedia`).

## Key components / where things live

| Feature | File(s) |
|---|---|
| Home hero, fees cards, "how it works" steps, about grid | `index.html` |
| Fee model copy (5% / 3% / 1% tiers, LKR amounts) | `index.html` `#fees` section |
| Intake form + progress bar | `contact.html` (form + inline `<script>` at bottom) |
| Form submission backend | `formsubmit.co` → `capitalconnectlk@gmail.com` |
| Site header / nav / "Book a Call" | `partials/header.html` |
| Footer / disclaimer / social | `partials/footer.html` |
| Floating WhatsApp chat widget | `partials/whatsapp-widget.html` + `assets/whatsapp-widget.js` + `.whatsapp-*` CSS |
| Button hover "liquid" effect | `assets/liquid-button.js` + `.btn` CSS |
| CTA banner glow-follow effect | `assets/liquid-banner.js` + `.banner` CSS |
| Header shape (fully rounded) + auto-hide-on-scroll | `assets/header-scroll.js` + `.header`/`.is-header-hidden` CSS |
| Component injection / init orchestration | `assets/include.js` |
| SEO: structured data (JSON-LD) | `index.html` `<head>` (Organization, WebSite, FAQPage) |

### Intake form
`contact.html` posts to **FormSubmit**
(`https://formsubmit.co/capitalconnectlk@gmail.com`, `method="POST"`). Hidden
fields set the email subject/template and disable captcha (`_captcha=false`).
The progress bar is driven by the inline script at the bottom of `contact.html`:
it counts filled `[data-progress-field]` inputs and updates the `--progress`
width. **If you add/remove form fields, mark them with `data-progress-field`**
to keep the progress meter accurate.

### WhatsApp widget
Target number is set in ONE place: the `data-wa-link="https://wa.me/94723652618"`
attribute on `.whatsapp-widget` in `partials/whatsapp-widget.html` (the JS copies
it onto the "Open WhatsApp" CTA).

## Repeatable edit rules

1. **Shared header/footer/widget = edit the file in `partials/` once.** No page
   duplicates them anymore; there is nothing to keep in sync across pages.
   **Exception:** `contact.html` has its own second, unrelated logo+title+CTA
   row — `.form-head` inside the intake form card — styled by that page's own
   inline `<style>` block, not by `partials/header.html`/`styles.css`. It is
   *not* wired through the include system. A change to the shared header's
   look (e.g. logo treatment, mobile scaling) does not automatically apply to
   `.form-head` — update both if the change should apply to both.
2. Reuse `:root` CSS variables and existing classes (`.btn`, `.card`,
   `.section`, `.container`, `.caption`, `.eyebrow`) rather than inventing new
   styles.
3. Buttons that should get the vibrate/liquid CTA effect use
   `class="btn" data-cta="request-call"`. Keep that attribute for CTAs.
4. Shared-partial links use root-relative paths (`/#fees`, `/contact.html`) so
   they resolve identically from every page. In-page anchors that live in a
   page's own static content (e.g. the hero's `#process` button on the home
   page) stay bare so smooth-scroll works.
5. To change the contact email, update: the FormSubmit action URL in
   `contact.html`, the `mailto:` in `partials/footer.html`, and the `mailto:` in
   `partials/whatsapp-widget.html`. (All three currently use
   `capitalconnectlk@gmail.com`.)
6. When you add a real page, add it to `sitemap.xml` and give it the five
   `<script defer>` tags (see load order above) plus the three `data-include`
   placeholders.
7. Effect scripts must stay idempotent and expose their `CCLK.init*` function;
   don't make them auto-run — `include.js` owns initialisation timing.

## Known tradeoffs / things to be aware of

- **`file://` won't work.** Because partials load via `fetch`, double-clicking a
  page to open it locally shows the page without header/footer/widget. Always
  serve over HTTP (see "Running locally").
- **Shared UI is JS-injected**, so JS-disabled clients and non-JS crawlers won't
  see the header nav, footer disclaimer, or widget. The primary indexable
  content (H1, hero copy, section headings, FAQ/Org JSON-LD) stays in static
  HTML, so this is fine for SEO on modern crawlers; keep any future
  must-be-crawlable content in the page body, not in a partial.
- **Third-party runtime dependencies:** the Satoshi font (`fonts.cdnfonts.com`)
  and the form backend (`formsubmit.co`) are external services loaded at
  runtime with no local fallback. Form submissions leave the site to FormSubmit.
- **`og:image` uses `logo.png`.** For richer social previews, add a dedicated
  wide hero image (e.g. `og-hero.jpg`, ~1200×630) and point `og:image` at it.

## Recently cleaned up (was broken before the restructure)

- Removed duplicate `<title>`/`<meta description>` in `index.html` and the
  leftover "underutilized rooftops" copy from an unrelated template (the
  `/* RooftopMoney */` CSS comment was renamed too).
- Deleted unused placeholder `assets/logo.svg` (every page uses `logo.png`).
- `sitemap.xml` now lists the two real pages instead of five non-existent URLs.
- `og:image` and JSON-LD `logo` now point at the existing `logo.png` (were
  `og-hero.jpg` / `logo-512.png`, which didn't exist).
- Removed the dead "progress demo" script in `contact.html` (targeted a
  non-existent `#next`).
- Unified the contact email to `capitalconnectlk@gmail.com` everywhere (the
  WhatsApp note on `contact.html` previously used `hello@capitalconnectlk.info`).
- Extracted the duplicated header/footer/widget into `partials/` (see above).
- Made the header a fully rounded pill and added the scroll-hide/show
  behaviour (`assets/header-scroll.js`); fixed a bug where the JS disabled
  itself entirely under `prefers-reduced-motion` instead of just softening
  the animation in CSS (see "Header shape + auto-hide-on-scroll" above).
- Removed the white background/padding/shadow behind the logo everywhere
  except the footer, where it's needed for contrast (see "Logo treatment").
- Fixed the header title/CTA wrapping to two lines on narrow phones (both the
  shared header and `contact.html`'s separate `.form-head`) by scaling text
  down with `clamp()` instead of letting it wrap (see "Mobile header/CTA"
  above).
- Rebuilt the header's hide/show from a binary class-toggle (a single small
  scroll delta snapped it straight to fully hidden) into a continuous,
  scroll-distance-driven `--header-hide` progress value, so it slides
  gradually in proportion to how far you've scrolled instead of vanishing
  after one wheel-tick (see "Header shape + auto-hide-on-scroll" above).
- Removed the header's opacity fade entirely — it's now a pure position
  slide (`transform` only), per explicit request.

## Git / project notes

- Default branch: `main`. History shows small iterative PRs; keep changes small
  and focused to match.
- No tests, linters, or formatters are configured. Before committing, serve the
  site and eyeball both pages (header/footer/widget inject, form progress works,
  WhatsApp opens, no console errors).
