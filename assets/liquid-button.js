(() => {
  const buttons = Array.from(document.querySelectorAll('.btn'));
  if (!buttons.length) return;

  const PROXIMITY = 180;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function resetButton(button) {
    button.classList.remove('is-near');
    button.style.removeProperty('--tilt-x');
    button.style.removeProperty('--tilt-y');
    button.style.removeProperty('--liquid-x');
    button.style.removeProperty('--liquid-y');
    button.style.removeProperty('--liquid-intensity');
  }

  function handlePointerMove(event) {
    const { clientX, clientY } = event;

    buttons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const proximity = Math.max(0, Math.min(1, 1 - distance / PROXIMITY));

      if (proximity <= 0.01) {
        resetButton(button);
        return;
      }

      const localX = clamp(clientX - rect.left, 0, rect.width);
      const localY = clamp(clientY - rect.top, 0, rect.height);

      button.style.setProperty('--tilt-x', `${deltaX * 0.08 * proximity}px`);
      button.style.setProperty('--tilt-y', `${deltaY * 0.08 * proximity}px`);
      button.style.setProperty('--liquid-x', `${localX}px`);
      button.style.setProperty('--liquid-y', `${localY}px`);
      button.style.setProperty('--liquid-intensity', proximity.toFixed(3));
      button.classList.add('is-near');
    });
  }

  function handlePointerOut(event) {
    if (event.relatedTarget === null) {
      buttons.forEach(resetButton);
    }
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerout', handlePointerOut);
  window.addEventListener('scroll', () => buttons.forEach(resetButton), { passive: true });
})();
