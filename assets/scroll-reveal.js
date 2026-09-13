/*
 * Scroll reveal: below-the-fold content fades and slides gently into view
 * the first time it scrolls into the viewport, instead of just being
 * statically present. A one-time "content loads in as you scroll" effect,
 * not a repeating scroll-linked animation (each element reveals once, then
 * stays revealed).
 *
 * Two attributes, both handled purely by CSS (see the "scroll reveal" rules
 * in styles.css) — this script only toggles a class:
 *   data-reveal        the element itself fades/slides in as a whole.
 *   data-reveal-group  the element's direct children fade/slide in
 *                      individually, staggered (nth-child transition-delay
 *                      in CSS) — for card grids/rows (fee cards, problem
 *                      tiles, process steps, about features, ...).
 *
 * Exposes window.CCLK.initScrollReveal(); assets/include.js calls it once,
 * after partials are injected (so header/footer content, if ever marked
 * with these attributes, would already be in the DOM).
 *
 * Progressive enhancement: if this script never runs (blocked, or JS
 * disabled), the <noscript> style block in each page's <head> forces all
 * data-reveal/data-reveal-group content to be visible immediately, so
 * content never silently stays hidden without JS.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  NS.initScrollReveal = function initScrollReveal() {
    if (NS._scrollRevealDone) return;

    const targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
    if (!targets.length) return;
    NS._scrollRevealDone = true;

    if (!('IntersectionObserver' in window)) {
      // No IntersectionObserver support: just show everything immediately
      // rather than leaving it permanently hidden.
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
  };
})();
