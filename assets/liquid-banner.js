(() => {
  const banner = document.querySelector('.banner');
  if (!banner) return;

  const PROXIMITY = 260;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function reset() {
    banner.classList.remove('is-live');
    banner.style.removeProperty('--glow-x');
    banner.style.removeProperty('--glow-y');
    banner.style.removeProperty('--glow-intensity');
    banner.style.removeProperty('--glow-translate-x');
    banner.style.removeProperty('--glow-translate-y');
  }

  function updateFromPointer(event) {
    const rect = banner.getBoundingClientRect();
    const { clientX, clientY } = event;
    const withinX = clientX >= rect.left && clientX <= rect.right;
    const withinY = clientY >= rect.top && clientY <= rect.bottom;

    if (!withinX || !withinY) {
      reset();
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const proximity = clamp(1 - distance / PROXIMITY, 0, 1);

    const xPercent = ((clientX - rect.left) / rect.width) * 100;
    const yPercent = ((clientY - rect.top) / rect.height) * 100;

    const normalizedX = clamp(deltaX / (rect.width / 2), -1, 1);
    const normalizedY = clamp(deltaY / (rect.height / 2), -1, 1);

    banner.style.setProperty('--glow-x', `${xPercent}%`);
    banner.style.setProperty('--glow-y', `${yPercent}%`);
    banner.style.setProperty('--glow-intensity', proximity.toFixed(3));
    banner.style.setProperty('--glow-translate-x', `${normalizedX * 16 * proximity}px`);
    banner.style.setProperty('--glow-translate-y', `${normalizedY * 12 * proximity}px`);

    banner.classList.add('is-live');
  }

  window.addEventListener('pointermove', updateFromPointer, { passive: true });
  banner.addEventListener('pointerleave', reset);
  window.addEventListener('scroll', reset, { passive: true });
})();
