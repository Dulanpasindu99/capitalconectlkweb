/*
 * Auto-hiding header: any real scroll down fully slides it up out of view;
 * any real scroll up brings it fully back down to its default position.
 * This is a two-state swap (fully shown / fully hidden), not a value that
 * tracks scroll position 1:1 — the CSS transition on `.header` is what
 * produces the smooth slide between those two states. Pure position slide
 * only, no opacity/fade. Always fully visible near the top of the page.
 *
 * Exposes window.CCLK.initHeaderScroll(); assets/include.js calls it once,
 * after the shared header partial (partials/header.html) has been injected.
 *
 * NOTE: this always runs — it is not gated behind prefers-reduced-motion in
 * JS (a browser/OS with that flag on would otherwise disable the feature
 * entirely, which is not what "reduced motion" should mean here). Instead,
 * styles.css drops the animated transition for those users (the header still
 * hides/shows, it just snaps instantly instead of sliding) via the
 * `@media (prefers-reduced-motion: reduce)` rule on `.header`.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  NS.initHeaderScroll = function initHeaderScroll() {
    if (NS._headerScrollDone) return;

    const header = document.querySelector('.header');
    if (!header) return;
    NS._headerScrollDone = true;

    const REVEAL_AT_TOP = 40; // always fully visible within this many px of the top
    // A real scroll (one wheel tick, one trackpad swipe, one arrow-key
    // press) easily clears this — it's just big enough to ignore jitter
    // (momentum micro-events, fractional-pixel scroll on some trackpads).
    const HIDE_THRESHOLD = 18;

    let lastY = window.scrollY;
    let hidden = false;
    let ticking = false;

    function setHidden(next) {
      if (next === hidden) return;
      hidden = next;
      header.classList.toggle('is-header-hidden', hidden);
    }

    function update() {
      ticking = false;
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastY;
      lastY = currentY;

      if (currentY <= REVEAL_AT_TOP) {
        setHidden(false);
      } else if (delta > HIDE_THRESHOLD) {
        setHidden(true);
      } else if (delta < -HIDE_THRESHOLD) {
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
