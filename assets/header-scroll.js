/*
 * Auto-hiding header: smoothly slides up and fades out when the visitor
 * scrolls down, and slides back down into view when they scroll up. Always
 * visible near the top of the page.
 *
 * Exposes window.CCLK.initHeaderScroll(); assets/include.js calls it once,
 * after the shared header partial (partials/header.html) has been injected.
 *
 * NOTE: the hide/show behaviour always runs — it is not gated behind
 * prefers-reduced-motion in JS (a browser/OS with that flag on would
 * otherwise disable the feature entirely, which is not what "reduced
 * motion" should mean here). Instead, styles.css softens *how* the state
 * change looks for those users (fade only, no slide) via the
 * `@media (prefers-reduced-motion: reduce)` rule on `.header`.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  NS.initHeaderScroll = function initHeaderScroll() {
    if (NS._headerScrollDone) return;

    const header = document.querySelector('.header');
    if (!header) return;
    NS._headerScrollDone = true;

    const REVEAL_AT_TOP = 40; // always show header within this many px of the top
    const HIDE_THRESHOLD = 6; // ignore sub-pixel/trackpad jitter

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

      if (currentY <= REVEAL_AT_TOP) {
        setHidden(false);
      } else if (delta > HIDE_THRESHOLD) {
        setHidden(true);
      } else if (delta < -HIDE_THRESHOLD) {
        setHidden(false);
      }

      lastY = currentY;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  };
})();
