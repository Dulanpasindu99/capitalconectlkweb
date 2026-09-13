/*
 * Hero heading "typewriter" reveal: splits a marked heading into words and
 * reveals them left to right, each transitioning from blurred/invisible to
 * sharp/visible in sequence — a typewriter-style entrance where the text
 * comes into focus as it "types" forward, instead of the whole line just
 * fading in at once.
 *
 * Usage: add data-typewriter to the element (see the hero <h1> in
 * index.html). No other markup changes needed — this script does the word
 * splitting at runtime, so the HTML stays a single normal sentence.
 *
 * Word-level, not letter-level: splitting into individual characters would
 * mean applying `filter: blur()` to dozens of tiny inline elements (more
 * DOM, choppier at small sizes) for a headline this length. Word-level
 * still reads clearly as "typing in", with far less overhead. Inline
 * markup inside the target (e.g. the "Zero" <span class="liquid-highlight">
 * gradient text) is kept whole as a single word-unit, so splitting never
 * reaches inside it and breaks its gradient text-clip.
 *
 * Exposes window.CCLK.initHeroTypewriter(); assets/include.js calls it
 * alongside the other effects. The hero itself is static markup (not an
 * injected partial), so this doesn't strictly need to wait for partials to
 * load — it's wired through the same orchestrator anyway for one
 * consistent init entry point, matching every other effect script here.
 */
(function () {
  const NS = (window.CCLK = window.CCLK || {});

  NS.initHeroTypewriter = function initHeroTypewriter() {
    if (NS._heroTypewriterDone) return;

    const targets = document.querySelectorAll('[data-typewriter]');
    if (!targets.length) return;
    NS._heroTypewriterDone = true;

    const STAGGER_MS = 70; // delay added per word — the "typing speed"; must match styles.css's 70ms

    targets.forEach((el) => {
      const originalNodes = Array.from(el.childNodes);
      let wordIndex = 0;

      function appendWord(content) {
        const span = document.createElement('span');
        span.className = 'tw-word';
        span.style.setProperty('--i', wordIndex++);
        if (typeof content === 'string') {
          span.textContent = content;
        } else {
          span.appendChild(content);
        }
        el.appendChild(span);
      }

      el.textContent = ''; // clear; originalNodes still holds live references to rebuild from

      originalNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Split on runs of whitespace, keeping the whitespace itself as
          // plain (unwrapped) text nodes so line-wrapping and spacing stay
          // exactly like normal text.
          const parts = node.textContent.split(/(\s+)/);
          parts.forEach((part) => {
            if (part === '') return;
            if (/^\s+$/.test(part)) {
              el.appendChild(document.createTextNode(part));
            } else {
              appendWord(part);
            }
          });
        } else {
          // An inline element (e.g. the "Zero" highlight span) — treat as
          // one whole word-unit; its own markup/content is untouched.
          appendWord(node);
        }
      });

      // Wait a frame so the initial (hidden/blurred) state actually paints
      // before the class flips, otherwise the browser can coalesce both
      // states into one and skip the transition entirely.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.add('is-typed');
        });
      });
    });
  };
})();
