# Capital Connect LK

Marketing and investor-introductions website for **Capital Connect LK**, a
Sri Lanka–focused program that connects founders with vetted investors on a
success-only fee basis.

Live: **https://capitalconnectlk.info/**

## Overview

A hand-built **static website** — plain HTML, one CSS file, and a handful of
vanilla-JavaScript enhancement scripts. There is **no framework, no bundler,
no package manager, and no build step**: the files in this repository are the
files that ship.

Shared UI (header, footer, WhatsApp widget) is factored into HTML *partials*
that are fetched and injected client-side by a tiny include system, so common
components live in exactly one place while the site stays build-free.

## Tech

| Concern | Choice |
|---|---|
| Markup | Static HTML5, two pages (`index.html`, `contact.html`) |
| Styling | A single `styles.css` (design tokens as CSS custom properties) |
| Behaviour | Vanilla JS, one module per effect, namespaced under `window.CCLK` |
| Fonts | Inter (variable), via Google Fonts |
| Analytics | Google Analytics 4 (gtag.js) |
| Form backend | [FormSubmit](https://formsubmit.co) (no server of our own) |
| Icons | Inline SVG (no icon library) |

## Project structure

```
├── index.html               # Home / landing page
├── contact.html             # Intake form page
├── styles.css               # All shared styling
├── robots.txt               # Crawler policy + sitemap pointer
├── sitemap.xml              # SEO sitemap
├── logo.png                 # On-page logo (transparent)
├── og-image.png             # Social-share / structured-data image (solid bg)
├── partials/                # Shared components, injected via data-include
│   ├── header.html
│   ├── footer.html
│   └── whatsapp-widget.html
├── assets/                  # Enhancement scripts + the WhatsApp icon
│   ├── include.js             # Loads partials, then runs the effect inits
│   ├── liquid-button.js
│   ├── liquid-banner.js
│   ├── header-scroll.js
│   ├── nav-scroll.js
│   ├── scroll-reveal.js
│   ├── hero-typewriter.js
│   ├── whatsapp-widget.js
│   └── whatsapp-icon.svg
├── CLAUDE.md                # In-depth engineering notes / design decisions
└── README.md                # This file
```

Each effect script exposes an idempotent `CCLK.init*()` function and does
nothing on its own; `assets/include.js` injects the partials and then calls
the inits in order. Every enhancement is progressive — the page is fully
usable, readable, and styled with JavaScript disabled.

## Running locally

Partials load over HTTP, so the folder must be **served**, not opened with
`file://` (which blocks the `fetch` and hides the shared header/footer/widget).

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/>. Any static server works
(`npx serve`, VS Code Live Server, etc.).

## Deployment

Static hosting — publish by uploading the files as-is; there is no build.
The host only needs to serve the folder over HTTPS so the partials can be
fetched.

**Keep repository-only files out of the web root.** Files such as `README.md`,
`CLAUDE.md`, `.gitignore`, and any dotfiles are for the repository, not for
visitors. If your host lets you exclude paths (or you deploy from a build
output), don't serve `*.md` or dotfiles publicly.

## Security

The site is static and stores no credentials, so its attack surface is small,
but a few standard hardening measures are in place and a few are left to the
host:

**In the pages already:**
- A **Content-Security-Policy** (`<meta http-equiv>`) restricting scripts,
  styles, fonts, images and network connections to this origin plus the vetted
  third parties actually used (Google Fonts, Google Analytics, FormSubmit).
- A **`referrer` policy** of `strict-origin-when-cross-origin`.
- All outbound links use `rel="noopener noreferrer"`.
- Every resource loads over HTTPS; `upgrade-insecure-requests` is set.

**To add at the host** (these can only be set as real HTTP response headers —
a `<meta>` tag cannot set them). Recommended values:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
```

<details>
<summary>Example: Netlify / Cloudflare Pages (<code>_headers</code> file)</summary>

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
```
</details>

<details>
<summary>Example: Apache (<code>.htaccess</code>)</summary>

```apache
Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()"
```
</details>

## Notes

See [`CLAUDE.md`](CLAUDE.md) for detailed engineering notes — the component
system, each animation's design rationale, accessibility choices, and the SEO
setup.
