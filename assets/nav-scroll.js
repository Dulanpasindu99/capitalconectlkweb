/*
 * Smooth, header-aware section navigation.
 *
 * Any same-page link whose target is a hash matching an element on the
 * current page (the header's nav, the hero's "How It Works" button,
 * contact.html's "Request a Call" -> #intake-form, ...) is intercepted.
 * The browser's own native jump-to-fragment is not used, for two reasons:
 *
 *   1. It lands the section flush with the very top of the viewport, which
 *      is right where the sticky `.header` pill sits — the section's own
 *      heading ends up hidden underneath it.
 *   2. On a fresh page load at a URL like /#fees, the native jump fires
 *      before assets/include.js's fetch() for the header/footer partials
 *      has resolved, so it's positioned against a DOM that doesn't have
 *      the header in it yet — then the header/footer inject afterward and
 *      shift everything, leaving the page looking scrolled to the wrong
 *      spot. This is what made a bookmarked/shared #fees URL look broken.
 *
 * Instead, this computes a scroll position that clears the sticky header
 * with a gap, centers the section in the space below it when the whole
 * section fits in the viewport, and animates to it smoothly — for BOTH
 * link clicks and an already-present #hash on initial load. The URL hash
 * still updates via history.pushState, so links stay shareable/bookmarkable.
 *
 * The scroll itself is NOT `window.scrollTo({behavior:'smooth'})` — the
 * native smooth scroll's duration/easing isn't controllable and reads as an
 * abrupt "jump" rather than a deliberate glide, especially over the short
 * distance between adjacent sections. animateScrollTo() below drives the
 * scroll manually frame-by-frame instead (rAF + eased interpolation), the
 * same reasoning as assets/header-scroll.js's hand-tuned transition: a
 * fixed, felt duration beats whatever a browser's built-in smoothing
 * happens to do. Duration scales with distance (clamped) so a short hop
 * between neighboring sections and a full Home-to-About trip both feel
 * proportionate rather than either too snappy or too slow.
 *
 * The header is also kept visible for the whole trip: assets/header-scroll.js's
 * own scroll-based auto-hide is suspended for the duration (a long
 * smooth-scroll fires plenty of scroll events that would otherwise trigger
 * it) and the header is forced visible immediately, so using the nav never
 * leaves the nav itself hidden right when you land somewhere. Since the
 * scroll is self-driven now, the moment to resume auto-hide is known
 * exactly (when the animation's own promise resolves) — no more polling to
 * guess whether the page has "settled."
 *
 * Progressive enhancement: styles.css sets `scroll-margin-top` on the
 * actual section targets as a plain-CSS fallback, so even without this
 * script (or without JS at all) a native jump still clears the header —
 * just without the centering, the eased animation, or the header-visible
 * guarantee.
 *
 * Exposes window.CCLK.initNavScroll(); assets/include.js calls it once,
 * after the header partial (where the nav links live) is injected and
 * after initHeaderScroll (so the reveal/suspend hooks it uses are ready).
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  const HEADER_GAP = 24; // minimum breathing room between the header and the section below it

  const MIN_DURATION = 500; // ms — floor, so even an adjacent-section hop still visibly glides
  const MAX_DURATION = 1400; // ms — ceiling, so a full top-to-bottom trip doesn't drag
  const PX_PER_MS = 1.6; // roughly how fast the glide travels; duration = distance / this, clamped

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Drives window scroll position manually, frame by frame, instead of
  // relying on the browser's own (uncontrollable-duration) smooth scroll.
  // Returns a Promise that resolves once the glide finishes — or resolves
  // early if the visitor starts scrolling by hand mid-glide, so a
  // deliberate scroll/swipe/arrow-key always wins over the programmatic one
  // rather than fighting it frame by frame.
  let activeScrollToken = 0;

  function animateScrollTo(targetY) {
    const token = ++activeScrollToken;
    const startY = window.scrollY;
    const distance = targetY - startY;

    if (Math.abs(distance) < 1) return Promise.resolve();

    const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.abs(distance) / PX_PER_MS));
    const startTime = performance.now();

    return new Promise((resolve) => {
      function cancelOnUserInput() {
        if (token !== activeScrollToken) return; // already superseded/finished
        activeScrollToken += 1; // invalidate this glide; the step loop below will stop
      }
      window.addEventListener('wheel', cancelOnUserInput, { passive: true, once: true });
      window.addEventListener('touchstart', cancelOnUserInput, { passive: true, once: true });

      function stopListening() {
        window.removeEventListener('wheel', cancelOnUserInput);
        window.removeEventListener('touchstart', cancelOnUserInput);
      }

      function step(now) {
        if (token !== activeScrollToken) {
          stopListening();
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        window.scrollTo(0, startY + distance * easeInOutCubic(t));

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          stopListening();
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  function headerBottom() {
    const header = document.querySelector('.header');
    // getBoundingClientRect().bottom already accounts for the header's own
    // `top` offset from the viewport (see .header in styles.css) — this is
    // exactly where its bottom edge sits on screen right now.
    return header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
  }

  function scrollTargetFor(el) {
    const hBottom = headerBottom();
    const rect = el.getBoundingClientRect();
    const elTop = rect.top + window.scrollY;
    const elHeight = rect.height;
    const viewportHeight = window.innerHeight;
    const canvasHeight = viewportHeight - hBottom; // visible space below the header

    // Where the section's top should land on screen (not the scrollY
    // itself) for the section to sit centered in that space — clamped so
    // it's never closer to the header than HEADER_GAP, which is what
    // naturally takes over for a section taller than the viewport (there's
    // no way to center something bigger than the screen, so it just clears
    // the header instead).
    const centeredTop = hBottom + (canvasHeight - elHeight) / 2;
    const idealTopOnScreen = Math.max(hBottom + HEADER_GAP, centeredTop);

    const target = elTop - idealTopOnScreen;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
    return Math.max(0, Math.min(target, maxScroll));
  }

  function withHeaderKeptVisible(targetY) {
    if (typeof NS.setHeaderAutoHideSuspended === 'function') NS.setHeaderAutoHideSuspended(true);
    if (typeof NS.revealHeader === 'function') NS.revealHeader();
    animateScrollTo(targetY).then(() => {
      if (typeof NS.setHeaderAutoHideSuspended === 'function') NS.setHeaderAutoHideSuspended(false);
    });
  }

  function goToTop(pushHash) {
    withHeaderKeptVisible(0);
    if (pushHash) history.pushState(null, '', '/');
  }

  function goToSection(el, hash) {
    withHeaderKeptVisible(scrollTargetFor(el));
    if (hash) history.pushState(null, '', hash);
  }

  function normalizePath(pathname) {
    return pathname === '/index.html' ? '/' : pathname;
  }

  function isCurrentPage(url) {
    if (url.origin !== location.origin) return false;
    return normalizePath(url.pathname) === normalizePath(location.pathname);
  }

  function handleClick(event) {
    const link = event.currentTarget;
    let url;
    try {
      url = new URL(link.href, location.href);
    } catch (err) {
      return;
    }

    if (link.hasAttribute('data-nav-home')) {
      if (!isCurrentPage(url)) return; // different page — let it navigate normally
      event.preventDefault();
      goToTop(true);
      return;
    }

    if (!url.hash || !isCurrentPage(url)) return; // different page, or nothing to jump to

    const target = document.querySelector(url.hash);
    if (!target) return; // hash doesn't match anything here — let the browser try

    event.preventDefault();
    goToSection(target, url.hash);
  }

  function correctInitialHash() {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (!target) return;
    // Give layout a couple of frames to settle (and the browser's own
    // native jump, if it already fired, a moment to have happened) before
    // measuring and overriding with the correct, header-aware position.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        goToSection(target, location.hash);
      });
    });
  }

  NS.initNavScroll = function initNavScroll() {
    if (NS._navScrollDone) return;
    NS._navScrollDone = true;

    document.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', handleClick);
    });

    correctInitialHash();
  };
})();
