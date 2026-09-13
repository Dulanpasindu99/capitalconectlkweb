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
| `assets/scroll-reveal.js` | `CCLK.initScrollReveal()` | every `[data-reveal]`/`[data-reveal-group]` |

`assets/include.js` calls all five (guarded, once) after partials are injected,
then dispatches a `components:loaded` event on `document`. Each init is
idempotent (guarded by a `_*Done` flag) so calling twice is safe.

Load order in each page's `<head>` (all `defer`, order matters — include.js
last):

```html
<script src="assets/liquid-button.js" defer></script>
<script src="assets/liquid-banner.js" defer></script>
<script src="assets/whatsapp-widget.js" defer></script>
<script src="assets/header-scroll.js" defer></script>
<script src="assets/scroll-reveal.js" defer></script>
<script src="assets/include.js" defer></script>
```

### Header shape + auto-hide-on-scroll
The header (`partials/header.html`) is a fully rounded pill (`border-radius:999px`
in `styles.css`, `.header`). `assets/header-scroll.js` is a **two-state
swap**: a real scroll down fully hides the header (slides it up past the
top edge of the browser viewport — not a fade, not a collapse-in-place), a
real scroll up fully brings it back to its default position — not a value
that tracks scroll position 1:1. It toggles a single `is-header-hidden`
class on `.header`, and the *smoothness* comes entirely from the CSS
`transition` on `.header`'s `transform` (`.5s ease-in-out`), which animates
between the two fixed states (`translate3d(0,0,0)` shown,
`translate3d(0,-130%,0)` hidden — clear of both the header's own height and
its top margin).

**Doesn't hide on the first scroll.** Hiding only kicks in on the
`HIDE_AFTER_SCROLLS`-th (currently 3rd) separate downward scroll gesture —
the first two are ignored, giving the visitor a beat before the nav goes
away. Scrolling up always reveals immediately (no delay), and that grace
counter resets every time the header is fully visible again (back near the
top, or after an up-scroll reveal) — so it's "3 free scrolls," repeatable,
not a one-time thing per page load.

This went through a few iterations worth knowing about if you touch it
again:
- An earlier version tried a scroll-linked continuous progress value (like
  `assets/whatsapp-widget.js`'s mobile collapse, `--wa-collapse-progress`)
  so the header's position tracked scroll distance directly. That was
  explicitly reverted — it read as choppy/static rather than a fluid
  animation. **The current two-state design is deliberate; don't reintroduce
  continuous scroll-tracking without being asked.**
- `.header` has no `opacity` tied to hide/show — only `transform` moves.
  Don't reintroduce an opacity fade here either; it was deliberately removed
  in favor of a plain up/down slide.
- The transition easing went from a fast-start/long-tail curve
  (`cubic-bezier(.16,1,.3,1)`, most of the motion done in the first ~150ms
  of a 700ms transition) to a plain `ease-in-out`, which spreads the motion
  evenly across the full duration. The fast-start curve technically had a
  long transition but didn't *read* as slow, because nearly all the visible
  travel happened almost immediately. If "slow, smooth" motion is requested
  again and it doesn't feel that way, suspect the easing curve's shape
  before assuming the duration is too short.

Constants (top of `assets/header-scroll.js`):
- `REVEAL_AT_TOP` (40px) — always fully visible within this many px of the top.
- `HIDE_THRESHOLD` (18px) — minimum scroll delta in one frame to count as a
  "real" scroll gesture. Small enough that any real scroll (one wheel tick,
  one trackpad swipe, one arrow-key press) counts; large enough to ignore
  momentum jitter and fractional-pixel trackpad noise.
- `HIDE_AFTER_SCROLLS` (3) — number of separate qualifying downward scroll
  gestures required before the header starts hiding.

Transition duration/easing lives in `styles.css` on `.header` (`transition:
transform .5s ease-in-out, ...`) — that's what to tune for "faster snap" vs.
"slower glide," not the JS. See the easing note above before reaching for a
non-linear/eased-out curve here. (Went `.45s` → `.7s`/`.8s` → `.5s` across
rounds of feedback — too fast felt like a snap, too slow felt sluggish;
`.5s` with plain `ease-in-out` was the setting that landed as "smooth" without
feeling slow.)

**Important — the transition is NOT dropped for `prefers-reduced-motion`.**
An earlier version both (a) fully disabled the JS hide/show logic under
reduced motion, and later (b) kept the logic but dropped the CSS transition
(instant snap, no visible slide) for reduced-motion users. Both were tried
and both effectively meant "no animation is felt" for anyone (or any test
environment — the in-app Browser pane used for testing this site always
reports `prefers-reduced-motion: reduce`) with that flag set, which directly
contradicted repeated, explicit requests to make this animation clearly
visible. The call made here: this is a single, plain position slide (not
parallax/zoom/rotation-style motion), so the transition now always plays,
unconditionally, regardless of `prefers-reduced-motion`. If accessibility
concerns about this need revisiting, that's a product decision to raise with
whoever owns the site — don't silently reintroduce a reduced-motion
carve-out that mutes the animation; it will very likely just reproduce this
same "I can't feel it" feedback loop.

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

### "How It Works" steps
The 5-step process (`#process` in `index.html`) is a fixed-column grid, not
the auto-wrapping layout it started as. `.steps` is
`grid-template-columns:repeat(5,minmax(0,1fr))` on desktop (all 5 steps in
one row, by design — don't go back to `repeat(auto-fit,minmax(...))`, which
is what caused an uneven 4+1 wrap before), stepping down to 3 columns at
`≤1040px`, 2 at `≤920px`, and 1 at `≤520px` (same breakpoints as everywhere
else in the file).

Each `.step` card is a **vertical, centered stack** — `step-number` (a small
"Step N" pill), `step-icon` (a circular badge with an inline SVG, same
visual language as `.feature-icon` in the About section: `#0A84FF` stroke,
~1.6–1.9 stroke-width), then an `<h3>` title and a `.caption` description —
not the old horizontal `<div class="bullet">N</div><div><strong>…</strong>
<br><span>…</span></div>` layout, which caused uneven text wrapping because
title and description shared one flexible-width inline block. Keep new steps
in this same icon+h3+p shape; don't reintroduce the `<br>`-separated inline
layout.

The existing hover lift/glow (`.step:hover`) still applies; the icon also
scales slightly on hover (`.step:hover .step-icon`). If you add a 6th step
(or remove one), the `nth-child` stagger delays for `[data-reveal-group]`
in the "scroll reveal" rules below only go up to 6 — extend them if you add
more child items to any staggered group.

### Scroll reveal
Below-the-fold content fades and slides up into view the first time it
scrolls into the viewport (`assets/scroll-reveal.js`, exposed as
`CCLK.initScrollReveal()`) — a one-time "content loads in as you scroll"
effect, not a repeating scroll-linked animation. Two attributes, both styled
in `styles.css` under "scroll reveal" (the JS only toggles a class):

- `data-reveal` — the element itself fades/slides in as a whole. Used on
  section intros/single blocks: `.fees-head`, the CTA `.banner`,
  `.process-intro`, `.about-side`, and `contact.html`'s "learn more" card.
- `data-reveal-group` — the element's **direct children** fade/slide in
  individually, staggered via `nth-child` transition-delays (currently
  defined for up to 6 children). Used on card/grid rows: `.fees-grid`,
  `.problems`, `.steps`, `.about-grid`.

**Don't nest a `data-reveal`/`data-reveal-group` element inside another one.**
Both are hidden (`opacity:0`) until revealed, so a `data-reveal-group` INSIDE
a `data-reveal` parent would have its own transform stack on top of the
parent's during the transition — the `.problems` heading block was
deliberately left without its own `data-reveal` for exactly this reason
(`.problems`, which has `data-reveal-group`, lives inside it). Siblings are
fine — that's how `.fees-head` / `.fees-grid` / `.banner` and
`.process-intro` / `.steps` are set up.

The hero and header are intentionally **not** wrapped in either attribute —
above-the-fold content should be visible immediately on load, not delayed
behind a scroll trigger.

**Progressive enhancement:** if `assets/scroll-reveal.js` never runs (JS
disabled, blocked, or errors before it loads), content marked `data-reveal`/
`data-reveal-group` would otherwise stay invisible forever, since only the
JS adds the revealing class. Each page's `<head>` has a `<noscript>` block
that forces it all visible when JS is unavailable — keep that block if you
add a new page with any reveal-marked content.

Like `assets/header-scroll.js`, this does **not** gate itself behind
`prefers-reduced-motion` — consistent with this project's established
approach (see "Header shape + auto-hide-on-scroll" above): the motion here
is a small, one-time fade/8–26px slide, not parallax/zoom/rotation, so it
always plays.

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
- **Fonts:** Inter (variable font, weight range 100–900), imported via
  `@import` from Google Fonts (`fonts.googleapis.com`) at the top of
  `styles.css`. Both pages `preconnect` to `fonts.googleapis.com` and
  `fonts.gstatic.com`. Chosen deliberately for an investment/fintech site —
  it's the de facto standard sans-serif for professional finance UI (Stripe,
  Wise, and most fintech dashboards use it), highly legible at small sizes,
  and because it's a *variable* font every `font-weight` value already used
  in `styles.css` — including in-between values like `550`/`650` — renders
  as its own distinct weight rather than snapping to a handful of static
  cuts. (Previously Satoshi via `fonts.cdnfonts.com`.) The fallback stack is
  the standard system-UI one: `-apple-system, BlinkMacSystemFont, "Segoe UI",
  Roboto, Helvetica, Arial, sans-serif`.
- **No em dashes (`—`) in visible page copy.** Removed by request from all
  rendered text — titles, meta descriptions, and body copy in `index.html`
  and `contact.html` — replaced with the punctuation that reads most
  naturally in each spot (period, comma, colon, or `|` for the `contact.html`
  page-title/site-name separator). Code comments (CSS/JS) still use them
  freely; that request was about what's visible on the page, not source
  comments. Don't reintroduce `—` in new copy — use a comma, colon, period,
  or restructure the sentence instead. (Ordinary en dashes `–`, e.g. in the
  `LKR 2M – 50M` range on `index.html`, are a different character and were
  intentionally left alone — only `—` was in scope.)
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
| Below-the-fold scroll-in reveal animation | `assets/scroll-reveal.js` + `[data-reveal]`/`[data-reveal-group]` CSS |
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
6. When you add a real page, add it to `sitemap.xml` and give it the six
   `<script defer>` tags (see load order above) plus the three `data-include`
   placeholders and the `<noscript>` scroll-reveal fallback (see "Scroll
   reveal" below).
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
- Reverted the continuous scroll-distance-driven progress value (added two
  entries up) back to a two-state class-toggle — the continuous version read
  as choppy/static rather than a smooth animation. See "Header shape +
  auto-hide-on-scroll" above for the current (and intended-to-stay) design.
- Added the 3-scroll grace period before hiding starts; switched the
  transition's easing from a fast-start/long-tail curve to plain
  `ease-in-out` (the motion wasn't reading as slow even at 0.7s, because
  nearly all of it happened in the curve's first ~150ms) and lengthened it
  to `.8s`; and removed the `prefers-reduced-motion` transition drop
  entirely, since it meant no animation was felt at all in the exact
  environment (and possibly browser/OS settings) being used to test this.
- Sped the header transition back down from `.8s` to `.5s` — `.8s` (tuned
  for "slow enough to feel") ended up reading as too slow once it was
  actually smooth. Still plain `ease-in-out`.
- Swapped the typeface from Satoshi to Inter (see "Fonts" above) — a
  standard, highly-legible sans-serif for investment/fintech UI, loaded as a
  variable font so all existing (including in-between) `font-weight` values
  keep working.
- Removed every em dash (`—`) from visible page copy across `index.html` and
  `contact.html` (titles, meta descriptions, body text), replacing each with
  whichever of period/comma/colon/`|` reads most naturally in that spot (see
  the "no em dashes" bullet under "Architecture & conventions" above).
- Redesigned the "How It Works" steps from an uneven auto-wrapping grid (4
  cards on one row, 1 orphaned onto its own) into a fixed 5-column row on
  desktop (3/2/1 at smaller breakpoints), gave each step its own icon and a
  clean vertical stack (icon, title, description) instead of an inline
  `<br>`-separated layout that caused uneven text wrapping (see "'How It
  Works' steps" above).
- Added a below-the-fold scroll-reveal animation across `index.html` and
  `contact.html` (`assets/scroll-reveal.js`, `[data-reveal]`/
  `[data-reveal-group]`) — content fades/slides into view once as it scrolls
  into the viewport (see "Scroll reveal" above).

## Git / project notes

- Default branch: `main`. History shows small iterative PRs; keep changes small
  and focused to match.
- No tests, linters, or formatters are configured. Before committing, serve the
  site and eyeball both pages (header/footer/widget inject, form progress works,
  WhatsApp opens, no console errors).
