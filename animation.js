// One greeting: an opening pass, then scroll-driven particles in the same section.
(() => {
  'use strict';
  const root = document.documentElement;
  const hero = document.querySelector('.intro-screen');
  const stage = document.querySelector('.hello-stage');
  const heading = document.getElementById('hello-title');
  const canvas = document.getElementById('hello-particles');
  const orb = document.querySelector('.orbit-mark');
  if (!hero || !stage || !heading || !canvas || !orb) {
    root.classList.remove('intro-pending');
    return;
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d');
  const source = document.createElement('canvas');
  const paint = source.getContext('2d', { willReadFrequently:true });
  if (!ctx || !paint) { root.classList.remove('intro-pending'); return; }

  const padding = 64, readPause = 700, rollDuration = 4200, settleDuration = 1200;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  let width = 0, height = 0, points = [], geometry = null, sampleStep = 3;
  let frame = 0, previous = null, elapsed = 0, visible = false;
  let ready = false, failed = false, resizeTimer;
  let introComplete = !root.classList.contains('intro-pending');
  let currentProgress = introComplete ? 1 : 0, targetProgress = 1;
  let scrollEnergy = 0, lastScroll = window.scrollY;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
  }

  function restoreText() {
    ctx.clearRect(0, 0, width, height);
    stage.classList.remove('fx-ready');
  }

  function revealPortfolio(immediate = false) {
    if (introComplete) return;
    introComplete = true;
    restoreText();
    // The greeting keeps its exact position. Only the surrounding portfolio fades in.
    if (!immediate && !motion.matches) root.classList.add('intro-revealing');
    root.classList.remove('intro-pending');
    window.scrollTo({ top:0, left:0, behavior:'instant' });
    currentProgress = 1;
    updateScrollTarget();
    setTimeout(() => root.classList.remove('intro-revealing'), 900);
  }

  function failOpen() {
    failed = true;
    stop();
    restoreText();
    revealPortfolio(true);
    root.classList.remove('intro-pending', 'intro-revealing');
    orb.classList.remove('is-visible');
  }
  function safePrepare() { try { prepare(); } catch { failOpen(); } }
  function safeRender(time) { try { render(time); } catch { failOpen(); } }

  function positionMark(progress) {
    const t = ease(progress);
    const { stageLeft, stageTop, stageWidth, stageHeight, heroWidth, markSize } = geometry;
    const startY = -markSize;
    const endY = stageTop + stageHeight + (markSize < 60 ? 46 : 53);
    const sway = Math.min(84, stageWidth * .12) * Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI);
    const x = heroWidth / 2 + sway;
    const y = startY + (endY - startY) * t;
    orb.style.transform = `translate3d(${x - markSize / 2}px, ${y - markSize / 2}px, 0) rotate(${t * 1080 - (1 - t) * 28}deg)`;
    return { x:x - stageLeft + padding, y:y - stageTop + padding };
  }

  function prepare() {
    if (failed) return;
    stop();
    ready = false;
    restoreText();
    orb.classList.remove('is-visible');
    if (motion.matches) { revealPortfolio(true); return; }
    if (!root.classList.contains('intro-pending') && !introComplete) revealPortfolio(true);
    const box = stage.getBoundingClientRect();
    const heroBox = hero.getBoundingClientRect();
    geometry = {
      stageLeft:box.left - heroBox.left,
      stageTop:box.top - heroBox.top,
      stageWidth:box.width,
      stageHeight:box.height,
      heroWidth:heroBox.width,
      heroHeight:heroBox.height,
      heroTop:heroBox.top + window.scrollY,
      markSize:orb.offsetWidth
    };
    width = Math.ceil(box.width + padding * 2);
    height = Math.ceil(box.height + padding * 2);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = source.width = Math.round(width * dpr);
    canvas.height = source.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint.fillStyle = '#eae8e2';
    paint.textAlign = 'center';
    paint.textBaseline = 'alphabetic';
    const style = getComputedStyle(heading);
    paint.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ('letterSpacing' in paint) paint.letterSpacing = style.letterSpacing;

    heading.querySelectorAll('span').forEach(line => {
      const rect = line.getBoundingClientRect();
      const metrics = paint.measureText(line.textContent);
      const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
      const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
      const baseline = rect.top - box.top + padding + (parseFloat(style.lineHeight) - ascent - descent) / 2 + ascent;
      paint.fillText(line.textContent, width / 2, baseline);
    });

    const pixels = paint.getImageData(0, 0, source.width, source.height).data;
    points = [];
    sampleStep = box.width < 650 ? 2 : 2.7;
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const index = (Math.min(source.height - 1, Math.floor(y * dpr)) * source.width + Math.min(source.width - 1, Math.floor(x * dpr))) * 4;
        if (pixels[index + 3] > 70) {
          points.push({ ox:x, oy:y, x, y, vx:0, vy:0, size:.55 + ((x * 17 + y * 13) % 10) / 13 });
        }
      }
    }
    ready = true;
    updateScrollTarget();
    if (introComplete) currentProgress = targetProgress;
    positionMark(currentProgress);
    if (introComplete || elapsed >= readPause) orb.classList.add('is-visible');
    start();
  }

  function start() {
    if (frame || !ready || !visible || failed || document.hidden || motion.matches) return;
    previous = null;
    frame = requestAnimationFrame(safeRender);
  }

  function render(time) {
    frame = 0;
    if (!visible || document.hidden || motion.matches) { previous = null; return; }
    if (!introComplete && !root.classList.contains('intro-pending')) revealPortfolio(true);
    const milliseconds = previous === null ? 16.67 : Math.min(time - previous, 40);
    previous = time;
    const delta = Math.min(milliseconds / 16.67, 2);
    let influence;

    if (!introComplete) {
      elapsed += milliseconds;
      currentProgress = clamp((elapsed - readPause) / rollDuration);
      influence = 1 - ease(clamp((currentProgress - .9) / .1));
    } else {
      const before = currentProgress;
      currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-milliseconds / 100));
      if (Math.abs(targetProgress - currentProgress) < .0001) currentProgress = targetProgress;
      scrollEnergy *= Math.exp(-milliseconds / 200);
      influence = clamp(Math.abs(currentProgress - before) * 110 + scrollEnergy);
    }
    const center = positionMark(currentProgress);
    if (!introComplete && elapsed < readPause) {
      frame = requestAnimationFrame(safeRender);
      return;
    }
    orb.classList.add('is-visible');
    const radius = geometry.markSize * 1.65;
    const active = [];

    for (const p of points) {
      const dx = p.x - center.x, dy = p.y - center.y;
      const distance = Math.hypot(dx, dy);
      if (distance < radius && influence > 0) {
        const nx = distance > .01 ? dx / distance : 1;
        const ny = distance > .01 ? dy / distance : 0;
        const force = Math.pow(1 - distance / radius, 2) * 6.5 * influence;
        // Radial repulsion plus a small tangential push gives the trail a rolling motion.
        p.vx += (nx * force - ny * force * .38) * delta;
        p.vy += (ny * force + nx * force * .38 + force * .2) * delta;
      }
      p.vx = (p.vx + (p.ox - p.x) * .016 * delta) * Math.pow(.89, delta);
      p.vy = (p.vy + (p.oy - p.y) * .016 * delta) * Math.pow(.89, delta);
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      if (Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy) > .45) active.push(p);
      else if (Math.abs(p.vx) + Math.abs(p.vy) < .05) { p.x = p.ox; p.y = p.oy; p.vx = 0; p.vy = 0; }
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    const cell = sampleStep + .7;
    for (const p of active) ctx.rect(p.ox - cell / 2, p.oy - cell / 2, cell, cell);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#eae8e2';
    ctx.beginPath();
    for (const p of active) {
      ctx.moveTo(p.x + p.size, p.y);
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    }
    ctx.fill();
    // Switch only after a complete canvas frame exists; no blank heading during loading.
    stage.classList.add('fx-ready');

    if (!introComplete && currentProgress === 1 &&
      (active.length === 0 || elapsed >= readPause + rollDuration + settleDuration)) {
      revealPortfolio();
    }
    // Sleep when still; scrolling wakes the effect in either direction.
    if (introComplete && active.length === 0 && scrollEnergy < .001 &&
      Math.abs(targetProgress - currentProgress) < .0001) {
      restoreText();
      previous = null;
      return;
    }
    frame = requestAnimationFrame(safeRender);
  }

  function updateScrollTarget() {
    if (!geometry) return;
    // Retrace the entrance as the greeting scrolls upward, then roll down on return.
    targetProgress = 1 - clamp((window.scrollY - geometry.heroTop) / (geometry.heroHeight * .65));
  }
  window.addEventListener('scroll', () => {
    updateScrollTarget();
    if (introComplete) {
      scrollEnergy = clamp(scrollEnergy + Math.abs(window.scrollY - lastScroll) / 90);
      start();
    }
    lastScroll = window.scrollY;
  }, { passive:true });

  document.querySelector('.skip-link')?.addEventListener('click', () => revealPortfolio(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !introComplete) revealPortfolio(true);
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) start(); else stop();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
  motion.addEventListener('change', safePrepare);
  let lastWidth = 0, lastHeight = 0;
  const resize = new ResizeObserver(entries => {
    const rect = entries[0].contentRect;
    if (Math.abs(rect.width - lastWidth) < 1 && Math.abs(rect.height - lastHeight) < 1) return;
    lastWidth = rect.width;
    lastHeight = rect.height;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(safePrepare, 100);
  });
  resize.observe(hero);
  Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1800))])
    .then(safePrepare).catch(failOpen);
  document.fonts.ready.then(() => { if (ready) safePrepare(); }).catch(failOpen);
})();
