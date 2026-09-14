/*
 * Auto-hiding header with a two-stage scroll response.
 *
 * Stage 1 — compact (on the FIRST real downward scroll away from the top):
 *   the header narrows. It keeps the same centered position, so both ends
 *   pull inward — the logo/title on the left move closer to the first nav
 *   link, and the "Book a Call" button on the right moves closer to the
 *   last nav link. This is a pure CSS width change (`.is-header-compact`),
 *   animated by the `width` transition on `.header` in styles.css.
 *
 * Stage 2 — hide (on the HIDE_AFTER_SCROLLS-th, currently 3rd, downward
 *   scroll): the already-narrowed header fully slides up out of view (past
 *   the top edge of the viewport — a plain position slide via
 *   `.is-header-hidden`, no fade). So the sequence going down the page is:
 *   1st scroll narrows, 2nd holds, 3rd slides the narrowed bar up.
 *
 * Both stages use the same transition timing (see `.header` in styles.css)
 * so they feel like one coherent motion. Scrolling back UP always reveals
 * the header immediately (still narrowed); it only returns to full width
 * once you are back near the very top of the page. Near the top it is always
 * fully shown and full width.
 *
 * Exposes window.CCLK.initHeaderScroll(); assets/include.js calls it once,
 * after the shared header partial (partials/header.html) has been injected.
 * Also exposes two small hooks assets/nav-scroll.js uses so a deliberate
 * nav-link click doesn't leave the header hidden after the resulting
 * (potentially long) programmatic scroll:
 *   - CCLK.revealHeader() — force the header visible right now.
 *   - CCLK.setHeaderAutoHideSuspended(bool) — while true, scroll events are
 *     ignored for hide/show purposes (a long smooth-scroll animation fires
 *     many scroll events with large deltas, which would otherwise trigger
 *     the normal auto-hide logic mid-navigation). Turning it back off
 *     resyncs `lastY` to the current position first, so the tail end of
 *     the just-finished scroll isn't misread as a fresh gesture, and syncs
 *     the compact state to where the page actually ended up.
 *
 * NOTE: the transitions always play — they are not dropped for
 * prefers-reduced-motion. This is a deliberate call for this specific
 * effect (a plain width change plus a plain position slide, not
 * parallax/zoom/rotation-style motion): the feature reads as "broken" (no
 * felt animation at all) when the transition is removed for anyone whose
 * browser/OS reports reduced motion, which defeats the purpose of building
 * it. See CLAUDE.md if this needs revisiting.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  const REVEAL_AT_TOP = 40; // always fully shown + full width within this many px of the top

  let header = null;
  let hidden = false;
  let compact = false;
  let downScrollCount = 0;
  let lastY = 0;
  let suspended = false;

  function setHidden(next) {
    if (!header || next === hidden) return;
    hidden = next;
    header.classList.toggle('is-header-hidden', hidden);
  }

  function setCompact(next) {
    if (!header || next === compact) return;
    compact = next;
    header.classList.toggle('is-header-compact', compact);
  }

  NS.revealHeader = function revealHeader() {
    downScrollCount = 0;
    setHidden(false);
  };

  NS.setHeaderAutoHideSuspended = function setHeaderAutoHideSuspended(next) {
    suspended = !!next;
    if (!suspended) {
      // Resuming: treat the current position as a fresh baseline so the
      // last leg of the scroll that just finished isn't counted as a new
      // gesture in either direction, and match the compact state to where
      // the page actually ended up (narrowed if we are away from the top).
      lastY = Math.max(0, window.scrollY);
      downScrollCount = 0;
      setCompact(lastY > REVEAL_AT_TOP);
    }
  };

  NS.initHeaderScroll = function initHeaderScroll() {
    if (NS._headerScrollDone) return;

    header = document.querySelector('.header');
    if (!header) return;
    NS._headerScrollDone = true;

    // A real scroll (one wheel tick, one trackpad swipe, one arrow-key
    // press) easily clears this — it's just big enough to ignore jitter
    // (momentum micro-events, fractional-pixel scroll on some trackpads).
    const HIDE_THRESHOLD = 18;
    // Number of separate downward scroll gestures before the header hides.
    // The 1st scroll only narrows it (stage 1); hiding starts on this count.
    const HIDE_AFTER_SCROLLS = 3;

    lastY = window.scrollY;
    let ticking = false;

    function update() {
      ticking = false;
      if (suspended) return;

      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastY;
      lastY = currentY;

      if (currentY <= REVEAL_AT_TOP) {
        downScrollCount = 0;
        setHidden(false);
        setCompact(false);
        return;
      }

      if (delta > HIDE_THRESHOLD) {
        // Any real downward scroll away from the top narrows the header
        // (stage 1). The 3rd such scroll also hides it (stage 2).
        setCompact(true);
        if (!hidden) {
          downScrollCount += 1;
          if (downScrollCount >= HIDE_AFTER_SCROLLS) {
            setHidden(true);
          }
        }
      } else if (delta < -HIDE_THRESHOLD) {
        // Scroll up reveals immediately; it stays narrowed until we are
        // back near the top (handled by the REVEAL_AT_TOP branch above).
        downScrollCount = 0;
        setHidden(false);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  };
})();
