document.addEventListener('DOMContentLoaded', () => {
  // DOM queries
  const section = document.querySelector('.cinema-scroll');
  const root = document.documentElement;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const track = document.querySelector('.sights-track');
  const controls = document.querySelector('.sights-controls');
  const prevBtn = document.querySelector('.sight-prev');
  const nextBtn = document.querySelector('.sight-next');
  const originalSightCards = Array.from(track.querySelectorAll('.sight-card'));

  // State
  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetScroll = 0;
  let smoothScroll = 0;
  let initialized = false;
  let rafPending = false;
  let sightCards = [];
  const originalSightCount = originalSightCards.length;
  let activeSight = originalSightCount;

  // Exact math helpers
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const smoothstep = (e0, e1, v) => {
    const x = clamp((v - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const segmentInOut = (s, a, b, c, d) => {
    const enter = smoothstep(a, b, s);
    const exit = smoothstep(c, d, s);
    return { enter, exit, active: enter * (1 - exit) };
  };
  const getScrollDistance = () =>
    clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight);

  // Initialize infinite sights slider with clones
  function initInfiniteSlider() {
    const beforeClones = originalSightCards.map((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      return clone;
    });

    const afterClones = originalSightCards.map((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      return clone;
    });

    for (let i = beforeClones.length - 1; i >= 0; i--) {
      track.insertBefore(beforeClones[i], track.firstChild);
    }
    afterClones.forEach((clone) => track.appendChild(clone));

    sightCards = Array.from(track.querySelectorAll('.sight-card'));
    activeSight = originalSightCount;

    sightCards.forEach((card, index) => {
      card.addEventListener('click', () => {
        activeSight = index;
        updateSliderShift(true);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeSight = index;
          updateSliderShift(true);
        }
      });
    });

    track.addEventListener('transitionend', handleLoopBoundary);

    prevBtn.addEventListener('click', () => {
      activeSight--;
      updateSliderShift(true);
    });

    nextBtn.addEventListener('click', () => {
      activeSight++;
      updateSliderShift(true);
    });

    updateSliderShift(false);
  }

  function updateActiveCardClasses() {
    sightCards.forEach((card, idx) => {
      const isCurrent = idx === activeSight;
      card.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        card.setAttribute('aria-current', 'true');
      } else {
        card.removeAttribute('aria-current');
      }
    });
  }

  function updateSliderShift(animate = true) {
    if (!sightCards.length) return;
    const currentCard = sightCards[activeSight];
    if (!currentCard) return;

    if (!animate) {
      track.classList.add('is-jumping');
    } else {
      track.classList.remove('is-jumping');
    }

    const shiftPx = -currentCard.offsetLeft;
    root.style.setProperty('--sights-shift', `${shiftPx}px`);

    if (!animate) {
      void track.offsetHeight;
      track.classList.remove('is-jumping');
    }

    updateActiveCardClasses();
  }

  function handleLoopBoundary() {
    if (activeSight >= originalSightCount * 2) {
      track.classList.add('is-jumping');
      activeSight -= originalSightCount;
      const currentCard = sightCards[activeSight];
      if (currentCard) {
        root.style.setProperty('--sights-shift', `${-currentCard.offsetLeft}px`);
      }
      void track.offsetHeight;
      track.classList.remove('is-jumping');
      updateActiveCardClasses();
    } else if (activeSight < originalSightCount) {
      track.classList.add('is-jumping');
      activeSight += originalSightCount;
      const currentCard = sightCards[activeSight];
      if (currentCard) {
        root.style.setProperty('--sights-shift', `${-currentCard.offsetLeft}px`);
      }
      void track.offsetHeight;
      track.classList.remove('is-jumping');
      updateActiveCardClasses();
    }
  }

  // Pointer move handler for smooth mouse parallax
  window.addEventListener('pointermove', (e) => {
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    targetMouseX = clamp((e.clientX - halfW) / halfW, -1, 1);
    targetMouseY = clamp((e.clientY - halfH) / halfH, -1, 1);
  });

  // Smooth navigation link handling
  document.querySelectorAll('.site-nav a, .site-logo').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = link.getAttribute('href');
      if (!target || !target.startsWith('#')) return;
      e.preventDefault();
      const maxScroll = Math.max(1, section.offsetHeight - window.innerHeight);
      if (target === '#cinema') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (target === '#bridge') {
        window.scrollTo({ top: maxScroll * 0.44, behavior: 'smooth' });
      } else if (target === '#bazaar') {
        window.scrollTo({ top: maxScroll * 0.78, behavior: 'smooth' });
      } else if (target === '#routes') {
        window.scrollTo({ top: maxScroll, behavior: 'smooth' });
      }
    });
  });

  const noteBtn = document.querySelector('.note-button');
  if (noteBtn) {
    noteBtn.addEventListener('click', () => {
      const maxScroll = Math.max(1, section.offsetHeight - window.innerHeight);
      window.scrollTo({ top: maxScroll, behavior: 'smooth' });
    });
  }

  window.addEventListener('resize', () => {
    updateSliderShift(false);
  });

  // Main cinematic RAF animation loop
  function tick() {
    const maxScroll = Math.max(1, section.offsetHeight - window.innerHeight);
    targetScroll = getScrollDistance();

    const isReduced = reducedMotionQuery.matches;

    if (isReduced) {
      smoothScroll = targetScroll;
      mouseX = 0;
      mouseY = 0;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.1);
      mouseX = lerp(mouseX, targetMouseX, 0.08);
      mouseY = lerp(mouseY, targetMouseY, 0.08);
    }

    const s = clamp(smoothScroll / maxScroll, 0, 1);

    // Mouse custom properties
    root.style.setProperty('--mx', mouseX.toFixed(4));
    root.style.setProperty('--my', mouseY.toFixed(4));

    // Screen segments
    const s1 = segmentInOut(s, 0, 0, 0.16, 0.32);
    const s2 = segmentInOut(s, 0.22, 0.35, 0.58, 0.70);
    const s3 = segmentInOut(s, 0.62, 0.76, 1.0, 1.0);

    // 1. Hero Title & Intro Copy (Screen 1)
    const titleY = lerp(0, -140, smoothstep(0, 0.32, s)) + mouseY * -15;
    const titleScale = lerp(1, 0.88, smoothstep(0, 0.32, s));
    const titleOpacity = s1.active;
    root.style.setProperty('--title-y', `${titleY.toFixed(2)}px`);
    root.style.setProperty('--title-scale', titleScale.toFixed(4));
    root.style.setProperty('--title-opacity', titleOpacity.toFixed(4));

    const introCopyY = lerp(0, -70, smoothstep(0, 0.26, s)) + mouseY * -10;
    const introCopyOpacity = 1 - smoothstep(0.06, 0.24, s);
    root.style.setProperty('--intro-copy-y', `${introCopyY.toFixed(2)}px`);
    root.style.setProperty('--intro-copy-opacity', introCopyOpacity.toFixed(4));

    // Splitframes (parting foreground rocks/walls)
    const splitProgress = smoothstep(0.06, 0.38, s);
    const splitLeftX = -50 + lerp(0, -28, splitProgress);
    const splitLeftY = lerp(0, 35, splitProgress) + mouseY * 12;
    const splitLeftScale = lerp(1, 1.25, splitProgress);
    root.style.setProperty('--split-left-x', `calc(${splitLeftX.toFixed(2)}% + ${(mouseX * -18).toFixed(2)}px)`);
    root.style.setProperty('--split-left-y', `${splitLeftY.toFixed(2)}px`);
    root.style.setProperty('--split-left-scale', splitLeftScale.toFixed(4));

    const splitRightX = -50 + lerp(0, 28, splitProgress);
    const splitRightY = lerp(0, 35, splitProgress) + mouseY * 12;
    const splitRightScale = lerp(1, 1.25, splitProgress);
    root.style.setProperty('--split-right-x', `calc(${splitRightX.toFixed(2)}% + ${(mouseX * 18).toFixed(2)}px)`);
    root.style.setProperty('--split-right-y', `${splitRightY.toFixed(2)}px`);
    root.style.setProperty('--split-right-scale', splitRightScale.toFixed(4));

    // Bridge foreground
    const bridgeProgress = smoothstep(0.08, 0.42, s);
    const bridgeScale = lerp(1.02, 1.34, bridgeProgress);
    const bridgeY = lerp(0, 30, bridgeProgress) + mouseY * 10;
    root.style.setProperty('--bridge-scale', bridgeScale.toFixed(4));
    root.style.setProperty('--bridge-y', `${bridgeY.toFixed(2)}px`);
    root.style.setProperty('--bridge-x', `calc(-50% + ${(mouseX * -14).toFixed(2)}px)`);

    // 2. Story Panel 2 & Frame Two river close-up (Screen 2)
    const frame2Scale = lerp(1.06, 1.22, smoothstep(0.25, 0.65, s));
    const frame2Y = -50 + lerp(0, -15, smoothstep(0.25, 0.65, s));
    root.style.setProperty('--frame2-opacity', s2.active.toFixed(4));
    root.style.setProperty('--frame2-scale', frame2Scale.toFixed(4));
    root.style.setProperty('--frame2-x', `calc(-50% + ${(mouseX * -15).toFixed(2)}px)`);
    root.style.setProperty('--frame2-y', `calc(${frame2Y.toFixed(2)}% + ${(mouseY * -12).toFixed(2)}px)`);

    const panel2Y = lerp(58, -15, smoothstep(0.22, 0.55, s));
    root.style.setProperty('--panel2-opacity', s2.active.toFixed(4));
    root.style.setProperty('--panel2-y', `calc(-50% + ${panel2Y.toFixed(2)}px)`);

    // 3. Back stack & Bazaar (Screen 3)
    const backScale = lerp(0.76, 1.0, smoothstep(0.35, 0.75, s));
    const backY = lerp(0, -35, smoothstep(0.35, 0.75, s)) + mouseY * 8;
    root.style.setProperty('--back-scale', backScale.toFixed(4));
    root.style.setProperty('--back-x', `${(mouseX * 12).toFixed(2)}px`);
    root.style.setProperty('--back-y', `${backY.toFixed(2)}px`);

    const fourY = lerp(10, -2, smoothstep(0.2, 0.7, s));
    const fourScale = lerp(0.78, 0.96, smoothstep(0.2, 0.7, s));
    root.style.setProperty('--four-y', `${fourY.toFixed(2)}vh`);
    root.style.setProperty('--four-scale', fourScale.toFixed(4));

    const bazaarY = lerp(20, 0, smoothstep(0.45, 0.8, s));
    const bazaarBrightness = lerp(1, 1.08, smoothstep(0.5, 0.85, s));
    const bazaarSaturation = lerp(1, 1.15, smoothstep(0.5, 0.85, s));
    root.style.setProperty('--bazaar-y', `${bazaarY.toFixed(2)}vh`);
    root.style.setProperty('--bazaar-brightness', bazaarBrightness.toFixed(4));
    root.style.setProperty('--bazaar-saturation', bazaarSaturation.toFixed(4));

    // Story Panel 3 (Bazaar)
    const panel3Opacity = smoothstep(0.65, 0.78, s);
    const panel3Y = lerp(58, 0, smoothstep(0.65, 0.78, s));
    root.style.setProperty('--panel3-opacity', panel3Opacity.toFixed(4));
    root.style.setProperty('--panel3-y', `calc(-50% + ${panel3Y.toFixed(2)}px)`);

    // Sights slider & controls
    const sightsProgress = smoothstep(0.68, 0.88, s);
    if (s > 0.65) {
      root.style.setProperty('--sights-visibility', 'visible');
      const enterX = lerp(120, 0, sightsProgress);
      root.style.setProperty('--sights-enter-x', `${enterX.toFixed(2)}vw`);
    } else {
      root.style.setProperty('--sights-visibility', 'hidden');
      root.style.setProperty('--sights-enter-x', '420vw');
    }

    const controlsOpacity = smoothstep(0.82, 0.94, s);
    root.style.setProperty('--sights-controls-opacity', controlsOpacity.toFixed(4));
    if (s > 0.82) {
      controls.classList.add('is-ready');
    } else {
      controls.classList.remove('is-ready');
    }

    // Atmospheric Shade gradient
    const shadeTopAlpha = lerp(0, 0.28, s2.active);
    const shadeMidAlpha = lerp(0, 0.12, s2.active);
    const shadeBottomAlpha = lerp(0, 0.45, s2.active);
    root.style.setProperty('--shade-top-alpha', shadeTopAlpha.toFixed(4));
    root.style.setProperty('--shade-mid-alpha', shadeMidAlpha.toFixed(4));
    root.style.setProperty('--shade-bottom-alpha', shadeBottomAlpha.toFixed(4));

    requestAnimationFrame(tick);
  }

  // Initialize
  initInfiniteSlider();
  requestAnimationFrame(tick);
});
