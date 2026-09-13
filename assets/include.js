/*
 * Lightweight HTML component loader (no framework, no build step).
 *
 * Usage in a page:  <div data-include="header"></div>
 *   -> replaced with the contents of  partials/header.html
 *
 * After all partials are injected, this orchestrator initialises the
 * progressive-enhancement effect scripts (liquid button/banner, WhatsApp
 * widget) so they can bind to elements that live inside the injected markup.
 *
 * NOTE: partials are fetched over HTTP, so the site must be served by a web
 * server (e.g. `python -m http.server 8000`). Opening the .html files directly
 * with file:// will block the fetch and the shared header/footer/widget will
 * not appear.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  function initEnhancements() {
    ['initLiquidButtons', 'initLiquidBanner', 'initWhatsApp', 'initHeaderScroll', 'initScrollReveal'].forEach((fn) => {
      try {
        if (typeof NS[fn] === 'function') NS[fn]();
      } catch (err) {
        console.error(`[include] ${fn} failed:`, err);
      }
    });

    // Footer copyright year: always the current year, no manual updates.
    // The static "2026" in partials/footer.html is only a no-JS fallback.
    const footerYear = document.getElementById('footer-year');
    if (footerYear) footerYear.textContent = new Date().getFullYear();

    document.dispatchEvent(new CustomEvent('components:loaded'));
  }

  function loadIncludes() {
    const nodes = Array.from(document.querySelectorAll('[data-include]'));
    return Promise.all(
      nodes.map((node) => {
        const name = node.getAttribute('data-include');
        return fetch(`partials/${name}.html`, { cache: 'no-cache' })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then((html) => {
            node.outerHTML = html;
          })
          .catch((err) => {
            console.error(`[include] Failed to load partial "${name}":`, err);
          });
      })
    );
  }

  function start() {
    loadIncludes().then(initEnhancements);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
