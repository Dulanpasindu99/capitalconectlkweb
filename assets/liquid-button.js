(() => {
  const buttons = Array.from(document.querySelectorAll('.btn'));
  if (!buttons.length) return;

  const PROXIMITY = 180;
  const VIBRATE_TRIGGER = 0.65;
  const VIBRATE_RESET = 0.25;
  const VIBRATE_CLASS = 'vibrate-once';

  const requestButtons = buttons.filter((button) => button.dataset.cta === 'request-call');
  const requestStates = new WeakMap();

  requestButtons.forEach((button) => {
    requestStates.set(button, { ready: true, vibrating: false });
    button.addEventListener('animationend', (event) => {
      if (event.animationName !== 'buttonVibrate') return;
      button.classList.remove(VIBRATE_CLASS);
      const state = requestStates.get(button);
      if (!state) return;
      state.vibrating = false;
    });
  });

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function triggerVibrate(button) {
    const state = requestStates.get(button);
    if (!state || state.vibrating || !state.ready) return;
    state.vibrating = true;
    state.ready = false;
    button.classList.add(VIBRATE_CLASS);
  }

  function resetRequestState(button) {
    const state = requestStates.get(button);
    if (!state) return;
    state.ready = true;
    state.vibrating = false;
    button.classList.remove(VIBRATE_CLASS);
  }

  function resetButton(button) {
    button.classList.remove('is-near');
    button.style.removeProperty('--tilt-x');
    button.style.removeProperty('--tilt-y');
    button.style.removeProperty('--liquid-x');
    button.style.removeProperty('--liquid-y');
    button.style.removeProperty('--liquid-intensity');
    resetRequestState(button);
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

      if (requestStates.has(button)) {
        const state = requestStates.get(button);
        if (proximity > VIBRATE_TRIGGER) {
          triggerVibrate(button);
        } else if (proximity < VIBRATE_RESET && !state.vibrating) {
          state.ready = true;
        }
      }
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
