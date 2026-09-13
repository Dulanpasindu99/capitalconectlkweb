/*
 * Auto-hiding header: any real scroll down fully slides it up out of view
 * (past the top edge of the browser viewport, not just fading in place);
 * any real scroll up brings it fully back down to its default position.
 * This is a two-state swap (fully shown / fully hidden) — the CSS
 * transition on `.header` is what produces the slow, smooth slide between
 * those two states. Pure position slide only, no opacity/fade. Always fully
 * visible near the top of the page.
 *
 * The header does NOT start hiding on the very first scroll down — it takes
 * HIDE_AFTER_SCROLLS separate downward scroll gestures (wheel ticks/swipes)
 * before it starts sliding up, giving the visitor a moment to begin reading
 * before the nav goes away. Scrolling back up always reveals it immediately
 * (no such delay), and that grace period resets every time the header is
 * fully visible again (back near the top, or after an up-scroll reveal).
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
 *     the just-finished scroll isn't misread as a fresh gesture.
 *
 * NOTE: the transition always plays — it is not dropped for
 * prefers-reduced-motion. This is a deliberate call for this specific
 * effect (a single, plain position slide, not parallax/zoom/rotation-style
 * motion): the feature reads as "broken" (no felt animation at all) when
 * the transition is removed for anyone whose browser/OS reports reduced
 * motion, which defeats the purpose of building it. See CLAUDE.md if this
 * needs revisiting.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  let header = null;
  let hidden = false;
  let downScrollCount = 0;
  let lastY = 0;
  let suspended = false;

  function setHidden(next) {
    if (!header || next === hidden) return;
    hidden = next;
    header.classList.toggle('is-header-hidden', hidden);
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
      // gesture in either direction.
      lastY = Math.max(0, window.scrollY);
      downScrollCount = 0;
    }
  };

  NS.initHeaderScroll = function initHeaderScroll() {
    if (NS._headerScrollDone) return;

    header = document.querySelector('.header');
    if (!header) return;
    NS._headerScrollDone = true;

    const REVEAL_AT_TOP = 40; // always fully visible within this many px of the top
    // A real scroll (one wheel tick, one trackpad swipe, one arrow-key
    // press) easily clears this — it's just big enough to ignore jitter
    // (momentum micro-events, fractional-pixel scroll on some trackpads).
    const HIDE_THRESHOLD = 18;
    // Number of separate downward scroll gestures required before the
    // header starts hiding (the first HIDE_AFTER_SCROLLS - 1 are ignored).
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
        return;
      }

      if (delta > HIDE_THRESHOLD) {
        if (!hidden) {
          downScrollCount += 1;
          if (downScrollCount >= HIDE_AFTER_SCROLLS) {
            setHidden(true);
          }
        }
      } else if (delta < -HIDE_THRESHOLD) {
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
