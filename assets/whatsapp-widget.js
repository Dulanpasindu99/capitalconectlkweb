(function(){
  const widget = document.querySelector('.whatsapp-widget');
  if(!widget) return;

  const toggle = widget.querySelector('.whatsapp-toggle');
  const panel = widget.querySelector('.whatsapp-panel');
  const closeBtn = widget.querySelector('.whatsapp-close');
  const cta = widget.querySelector('.whatsapp-panel__cta');
  const toggleIcon = toggle.querySelector('.toggle-icon');
  const toggleCopy = toggle.querySelector('.toggle-copy');
  const waLink = widget.getAttribute('data-wa-link');

  if(waLink && cta){
    cta.setAttribute('href', waLink);
  }

  const collapseRange = 180;
  const collapsedShadow = '0 18px 36px rgba(18,140,126,.32)';
  const collapsedIconShadow = '0 6px 14px rgba(0,0,0,.16)';
  const collapsedIconBg = 'rgba(255,255,255,.18)';
  let rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  let collapsedSize = 3.25 * rootFontSize;
  let collapsedIconSize = 2.4 * rootFontSize;
  let collapsedRadius = collapsedSize / 2;
  let expandedWidth = 0;
  let expandedHeight = 0;
  let expandedPaddingY = 0;
  let expandedPaddingX = 0;
  let expandedGap = 0;
  let expandedRadius = 999;
  let expandedShadow = getComputedStyle(toggle).boxShadow;
  let expandedJustify = getComputedStyle(toggle).justifyContent || 'flex-start';
  let expandedIconSize = 0;
  let expandedIconShadow = getComputedStyle(toggleIcon).boxShadow;
  let expandedIconBg = getComputedStyle(toggleIcon).backgroundColor;
  let collapseProgress = 0;
  let pendingProgress = 0;
  let frameId = null;

  const collapseQuery = window.matchMedia('(max-width: 640px)');
  let collapseActive = !collapseQuery.matches;

  function clearProgressStyles(){
    widget.style.removeProperty('--wa-collapse-progress');
    toggle.style.removeProperty('--wa-toggle-width');
    toggle.style.removeProperty('--wa-toggle-height');
    toggle.style.removeProperty('--wa-toggle-padding-y');
    toggle.style.removeProperty('--wa-toggle-padding-x');
    toggle.style.removeProperty('--wa-toggle-gap');
    toggle.style.removeProperty('--wa-toggle-radius');
    toggle.style.removeProperty('--wa-toggle-justify');
    toggle.style.removeProperty('--wa-toggle-copy-opacity');
    toggle.style.removeProperty('--wa-toggle-copy-shift');
    toggle.style.removeProperty('--wa-toggle-copy-visibility');
    toggle.style.boxShadow = '';
    toggleIcon.style.removeProperty('--wa-toggle-icon-size');
    toggleIcon.style.removeProperty('--wa-toggle-icon-shadow');
    toggleIcon.style.removeProperty('--wa-toggle-icon-bg');
    if(toggleCopy){
      toggleCopy.style.pointerEvents = '';
    }
  }

  function captureExpandedMetrics(){
    const stored = {
      width: toggle.style.getPropertyValue('--wa-toggle-width'),
      height: toggle.style.getPropertyValue('--wa-toggle-height'),
      paddingY: toggle.style.getPropertyValue('--wa-toggle-padding-y'),
      paddingX: toggle.style.getPropertyValue('--wa-toggle-padding-x'),
      gap: toggle.style.getPropertyValue('--wa-toggle-gap'),
      radius: toggle.style.getPropertyValue('--wa-toggle-radius'),
      justify: toggle.style.getPropertyValue('--wa-toggle-justify'),
      copyOpacity: toggle.style.getPropertyValue('--wa-toggle-copy-opacity'),
      copyShift: toggle.style.getPropertyValue('--wa-toggle-copy-shift'),
      copyVisibility: toggle.style.getPropertyValue('--wa-toggle-copy-visibility'),
      boxShadow: toggle.style.boxShadow,
      iconSize: toggleIcon.style.getPropertyValue('--wa-toggle-icon-size'),
      iconShadow: toggleIcon.style.getPropertyValue('--wa-toggle-icon-shadow'),
      iconBg: toggleIcon.style.getPropertyValue('--wa-toggle-icon-bg'),
      pointerEvents: toggleCopy ? toggleCopy.style.pointerEvents : undefined
    };

    clearProgressStyles();

    const toggleStyles = getComputedStyle(toggle);
    const iconStyles = getComputedStyle(toggleIcon);
    expandedJustify = toggleStyles.justifyContent || 'flex-start';
    expandedShadow = toggleStyles.boxShadow;
    expandedGap = parseFloat(toggleStyles.columnGap || toggleStyles.gap) || 0;
    expandedPaddingY = parseFloat(toggleStyles.paddingTop) || 0;
    expandedPaddingX = parseFloat(toggleStyles.paddingLeft) || 0;
    expandedRadius = parseFloat(toggleStyles.borderTopLeftRadius) || 999;
    const rect = toggle.getBoundingClientRect();
    expandedWidth = rect.width;
    expandedHeight = rect.height;
    const iconRect = toggleIcon.getBoundingClientRect();
    expandedIconSize = iconRect.width;
    expandedIconShadow = iconStyles.boxShadow;
    expandedIconBg = iconStyles.backgroundColor;

    if(stored.width) toggle.style.setProperty('--wa-toggle-width', stored.width);
    if(stored.height) toggle.style.setProperty('--wa-toggle-height', stored.height);
    if(stored.paddingY) toggle.style.setProperty('--wa-toggle-padding-y', stored.paddingY);
    if(stored.paddingX) toggle.style.setProperty('--wa-toggle-padding-x', stored.paddingX);
    if(stored.gap) toggle.style.setProperty('--wa-toggle-gap', stored.gap);
    if(stored.radius) toggle.style.setProperty('--wa-toggle-radius', stored.radius);
    if(stored.justify) toggle.style.setProperty('--wa-toggle-justify', stored.justify);
    if(stored.copyOpacity) toggle.style.setProperty('--wa-toggle-copy-opacity', stored.copyOpacity);
    if(stored.copyShift) toggle.style.setProperty('--wa-toggle-copy-shift', stored.copyShift);
    if(stored.copyVisibility) toggle.style.setProperty('--wa-toggle-copy-visibility', stored.copyVisibility);
    if(stored.boxShadow) toggle.style.boxShadow = stored.boxShadow;
    if(stored.iconSize) toggleIcon.style.setProperty('--wa-toggle-icon-size', stored.iconSize);
    if(stored.iconShadow) toggleIcon.style.setProperty('--wa-toggle-icon-shadow', stored.iconShadow);
    if(stored.iconBg) toggleIcon.style.setProperty('--wa-toggle-icon-bg', stored.iconBg);
    if(toggleCopy && stored.pointerEvents !== undefined){
      toggleCopy.style.pointerEvents = stored.pointerEvents;
    }
  }

  function applyProgress(progress){
    if(!collapseActive){
      clearProgressStyles();
      widget.classList.remove('is-scrolled');
      collapseProgress = 0;
      return;
    }

    collapseProgress = progress;
    widget.style.setProperty('--wa-collapse-progress', progress.toFixed(3));
    const inverse = 1 - progress;
    const width = collapsedSize + (expandedWidth - collapsedSize) * inverse;
    const height = collapsedSize + (expandedHeight - collapsedSize) * inverse;
    const paddingY = expandedPaddingY * inverse;
    const paddingX = expandedPaddingX * inverse;
    const gap = expandedGap * inverse;
    const radius = collapsedRadius * progress + expandedRadius * inverse;
    const iconSize = collapsedIconSize * progress + expandedIconSize * inverse;
    const iconShadow = progress > 0.8 ? collapsedIconShadow : expandedIconShadow;
    const iconBg = progress > 0.8 ? collapsedIconBg : expandedIconBg;
    const boxShadow = progress > 0.8 ? collapsedShadow : expandedShadow;
    const justify = progress > 0.75 ? 'center' : expandedJustify;

    toggle.style.setProperty('--wa-toggle-width', `${width}px`);
    toggle.style.setProperty('--wa-toggle-height', `${height}px`);
    toggle.style.setProperty('--wa-toggle-padding-y', `${paddingY}px`);
    toggle.style.setProperty('--wa-toggle-padding-x', `${paddingX}px`);
    toggle.style.setProperty('--wa-toggle-gap', `${gap}px`);
    toggle.style.setProperty('--wa-toggle-radius', `${radius}px`);
    toggle.style.setProperty('--wa-toggle-justify', justify);
    toggle.style.boxShadow = boxShadow;
    toggleIcon.style.setProperty('--wa-toggle-icon-size', `${iconSize}px`);
    toggleIcon.style.setProperty('--wa-toggle-icon-shadow', iconShadow);
    toggleIcon.style.setProperty('--wa-toggle-icon-bg', iconBg);
    const copyOpacity = Math.max(0, Math.min(1, inverse * 1.2));
    toggle.style.setProperty('--wa-toggle-copy-opacity', copyOpacity.toString());
    const copyShift = `${-12 * progress}px`;
    toggle.style.setProperty('--wa-toggle-copy-shift', copyShift);
    toggle.style.setProperty('--wa-toggle-copy-visibility', progress > 0.98 ? 'hidden' : 'visible');
    if(toggleCopy){
      toggleCopy.style.pointerEvents = progress > 0.98 ? 'none' : '';
    }
    widget.classList.toggle('is-scrolled', progress > 0.02);
  }

  function scheduleProgress(progress){
    pendingProgress = collapseActive ? Math.max(0, Math.min(1, progress)) : 0;
    if(frameId) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      applyProgress(pendingProgress);
    });
  }

  function updateScrollState(){
    if(!collapseActive){
      scheduleProgress(0);
      return;
    }
    if(toggle.getAttribute('aria-expanded') === 'true'){
      scheduleProgress(0);
      return;
    }
    const target = Math.max(0, Math.min(1, window.scrollY / collapseRange));
    scheduleProgress(target);
  }

  function syncCollapseMode(){
    collapseActive = !collapseQuery.matches;
    if(!collapseActive){
      collapseProgress = 0;
      pendingProgress = 0;
      if(frameId){
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      clearProgressStyles();
      widget.classList.remove('is-scrolled');
      return;
    }
    captureExpandedMetrics();
    updateScrollState();
  }

  if(collapseQuery.addEventListener){
    collapseQuery.addEventListener('change', syncCollapseMode);
  } else if(collapseQuery.addListener){
    collapseQuery.addListener(syncCollapseMode);
  }

  function openPanel(){
    if(panel.hasAttribute('data-closing')){
      panel.removeAttribute('data-closing');
    }
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      widget.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      scheduleProgress(0);
      updateScrollState();
    });
  }

  function closePanel(){
    widget.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('data-closing', 'true');
    updateScrollState();
    setTimeout(() => {
      if(panel.getAttribute('data-closing') === 'true'){
        panel.hidden = true;
        panel.removeAttribute('data-closing');
      }
    }, 220);
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if(expanded){
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener('click', closePanel);

  if(cta){
    cta.addEventListener('click', () => {
      closePanel();
    });
  }

  document.addEventListener('click', (event) => {
    if(!widget.contains(event.target) && toggle.getAttribute('aria-expanded') === 'true'){
      closePanel();
    }
  });

  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true'){
      closePanel();
    }
  });

  window.addEventListener('scroll', updateScrollState, {passive: true});
  window.addEventListener('resize', () => {
    rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    collapsedSize = 3.25 * rootFontSize;
    collapsedIconSize = 2.4 * rootFontSize;
    collapsedRadius = collapsedSize / 2;
    syncCollapseMode();
  });

  window.addEventListener('load', () => {
    syncCollapseMode();
  });

  syncCollapseMode();
})();
