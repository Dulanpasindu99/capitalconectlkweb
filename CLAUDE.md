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
The three effect scripts do **not** auto-run. Each defines an init function on a
shared `window.CCLK` namespace:

| Script | Exposes | Binds to |
|---|---|---|
| `assets/liquid-button.js` | `CCLK.initLiquidButtons()` | all `.btn` |
| `assets/liquid-banner.js` | `CCLK.initLiquidBanner()` | `.banner` (no-op if absent) |
| `assets/whatsapp-widget.js` | `CCLK.initWhatsApp()` | `.whatsapp-widget` |

`assets/include.js` calls all three (guarded, once) after partials are injected,
then dispatches a `components:loaded` event on `document`. Each init is
idempotent (guarded by a `_*Done` flag) so calling twice is safe.

Load order in each page's `<head>` (all `defer`, order matters — include.js
last):

```html
<script src="assets/liquid-button.js" defer></script>
<script src="assets/liquid-banner.js" defer></script>
<script src="assets/whatsapp-widget.js" defer></script>
<script src="assets/include.js" defer></script>
```

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
6. When you add a real page, add it to `sitemap.xml` and give it the four
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

## Git / project notes

- Default branch: `main`. History shows small iterative PRs; keep changes small
  and focused to match.
- No tests, linters, or formatters are configured. Before committing, serve the
  site and eyeball both pages (header/footer/widget inject, form progress works,
  WhatsApp opens, no console errors).
