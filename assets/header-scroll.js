/*
 * Auto-hiding header: slides up and fades out as the visitor scrolls down,
 * and slides back into view as they scroll up. Always fully visible near the
 * top of the page.
 *
 * The hide/reveal amount is driven continuously by how far the user has
 * actually scrolled (a "progress" value from 0 = fully shown to 1 = fully
 * hidden), the same technique assets/whatsapp-widget.js uses for its own
 * scroll-linked collapse. A short CSS transition then smooths out the gaps
 * between individual scroll/animation frames. This is what makes it feel
 * like a native app toolbar (e.g. iOS Safari's URL bar) instead of a single
 * wheel-tick snapping the header straight to fully hidden.
 *
 * Exposes window.CCLK.initHeaderScroll(); assets/include.js calls it once,
 * after the shared header partial (partials/header.html) has been injected.
 *
 * NOTE: this always runs — it is not gated behind prefers-reduced-motion in
 * JS (a browser/OS with that flag on would otherwise disable the feature
 * entirely, which is not what "reduced motion" should mean here). Instead,
 * styles.css softens *how* the state looks for those users (a plain opacity
 * cross-fade, no upward slide) via the `@media (prefers-reduced-motion:
 * reduce)` rule on `.header`.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  NS.initHeaderScroll = function initHeaderScroll() {
    if (NS._headerScrollDone) return;

    const header = document.querySelector('.header');
    if (!header) return;
    NS._headerScrollDone = true;

    const REVEAL_AT_TOP = 40; // always fully visible within this many px of the top
    const HIDE_DISTANCE = 260; // px of scrolling needed to go from fully shown to fully hidden
    const HIDDEN_CLASS_AT = 0.92; // progress beyond which pointer-events are disabled

    let lastY = window.scrollY;
    let progress = 0; // 0 = fully visible, 1 = fully hidden
    let ticking = false;

    function applyProgress(next) {
      progress = Math.max(0, Math.min(1, next));
      header.style.setProperty('--header-hide', progress.toFixed(4));
      header.classList.toggle('is-header-hidden', progress >= HIDDEN_CLASS_AT);
    }

    function update() {
      ticking = false;
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastY;
      lastY = currentY;

      if (currentY <= REVEAL_AT_TOP) {
        applyProgress(0);
        return;
      }

      applyProgress(progress + delta / HIDE_DISTANCE);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  };
})();
