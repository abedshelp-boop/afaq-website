/* ═══════════════════════════════════════════
   AFAQ — Homepage JS
   Lenis + GSAP ScrollTrigger + Canvas Frames
   Circle-wipe reveal + section choreography
   ═══════════════════════════════════════════ */

'use strict';

/* ── 0. Register GSAP ── */
gsap.registerPlugin(ScrollTrigger);

/* ── Clear stuck page-flip overlay on back-button ── */
window.addEventListener('pageshow', () => {
  const overlay = document.getElementById('page-flip-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.clipPath = 'polygon(0 0, 0 0, 0 100%, 0 100%)';
  }
});

/* ── 1. Lenis Smooth Scroll ── */
const lenis = new Lenis({
  duration: 1.0,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1.8,
  touchMultiplier: 2
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ── 2. Canvas Frame Animation ── */
const TOTAL_FRAMES = 121;
const FRAME_SPEED = 2.0;
const IMAGE_SCALE = 0.85;
const WATERMARK_CROP = 0.06; // crop bottom 6% to hide Kling AI watermark

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const frames = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let currentFrame = 0;
let bgColor = '#dcdcdc'; // will be sampled from frames

const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      frames[i] = img;
      loadedCount++;
      if (loaderFill) {
        loaderFill.style.width = Math.round((loadedCount / TOTAL_FRAMES) * 100) + '%';
      }
      resolve();
    };
    img.onerror = () => {
      loadedCount++;
      resolve();
    };
    img.src = 'frames/frame_' + String(i + 1).padStart(4, '0') + '.webp';
  });
}

/* ── Background Color Sampling ── */
function sampleBgColor(img) {
  try {
    const sc = document.createElement('canvas');
    sc.width = img.naturalWidth;
    sc.height = img.naturalHeight;
    const sCtx = sc.getContext('2d');
    sCtx.drawImage(img, 0, 0);

    // Sample 4 corners (stay away from edges to avoid artifacts)
    const inset = 8;
    const pixels = [
      sCtx.getImageData(inset, inset, 1, 1).data,
      sCtx.getImageData(img.naturalWidth - inset, inset, 1, 1).data,
      sCtx.getImageData(inset, img.naturalHeight - inset, 1, 1).data,
      sCtx.getImageData(img.naturalWidth - inset, img.naturalHeight - inset, 1, 1).data
    ];

    const r = Math.round(pixels.reduce((s, p) => s + p[0], 0) / 4);
    const g = Math.round(pixels.reduce((s, p) => s + p[1], 0) / 4);
    const b = Math.round(pixels.reduce((s, p) => s + p[2], 0) / 4);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  } catch (e) {
    return bgColor; // fallback to current
  }
}

function updatePageBgColor(color) {
  bgColor = color;
  document.body.style.backgroundColor = color;
  const canvasWrap = document.getElementById('canvas-wrap');
  if (canvasWrap) canvasWrap.style.backgroundColor = color;
  const heroSection = document.getElementById('hero-standalone');
  if (heroSection) heroSection.style.backgroundColor = color;
  // Update the footer too
  const footer = document.querySelector('footer');
  if (footer) footer.style.backgroundColor = color;
}

/* ── Canvas Rendering ── */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame);
}

function drawFrame(index) {
  const img = frames[index];
  if (!img) return;

  const cw = canvas.width / (window.devicePixelRatio || 1);
  const ch = canvas.height / (window.devicePixelRatio || 1);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // Crop bottom portion to remove watermark
  const srcH = ih * (1 - WATERMARK_CROP);

  // Cover-fit the cropped source into canvas with padding
  const scale = Math.max(cw / iw, ch / srcH) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = srcH * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  // Fill with sampled bg color (seamless blend)
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);

  // Draw only top (1 - WATERMARK_CROP) of source image
  ctx.drawImage(img, 0, 0, iw, srcH, dx, dy, dw, dh);

  // Sample bg color every 20 frames
  if (index % 20 === 0) {
    const newColor = sampleBgColor(img);
    if (newColor !== bgColor) {
      updatePageBgColor(newColor);
    }
  }
}

function hideLoader() {
  if (loaderEl) {
    loaderEl.classList.add('hidden');
  }
}

/* ── 3. Circle-Wipe Hero Reveal ── */
const heroSection = document.getElementById('hero-standalone');
const canvasWrap = document.getElementById('canvas-wrap');

function updateCircleWipe(progress) {
  if (!canvasWrap || !heroSection) return;

  // Phase A: Circle opens (0% → 8% scroll)
  // Phase B: Circle stays open (8% → 45%)
  // Phase C: Circle closes (45% → 55%)
  // Phase D: Fully closed (55%+)

  let radius;
  if (progress <= 0.005) {
    // Not scrolled yet — canvas hidden
    radius = 0;
    heroSection.style.opacity = '1';
  } else if (progress < 0.08) {
    // Opening: map 0.005-0.08 → radius 0% to 75%
    const openProgress = (progress - 0.005) / 0.075;
    radius = openProgress * 75;
    heroSection.style.opacity = String(Math.max(0, 1 - progress * 14));
  } else if (progress < 0.45) {
    // Fully open
    radius = 75;
    heroSection.style.opacity = '0';
  } else if (progress < 0.55) {
    // Closing: map 0.45-0.55 → radius 75% to 0%
    const closeProgress = (progress - 0.45) / 0.1;
    radius = 75 * (1 - closeProgress);
    heroSection.style.opacity = '0';
  } else {
    // Fully closed
    radius = 0;
    heroSection.style.opacity = '0';
  }

  canvasWrap.style.clipPath = 'circle(' + radius + '% at 50% 50%)';
}

/* ── 4. GSAP Section Animation System ── */
const sections = document.querySelectorAll('.scroll-section');
const sectionTimelines = new Map();

function setupSectionAnimations() {
  sections.forEach((section) => {
    const type = section.dataset.animation;
    const persist = section.dataset.persist === 'true';
    const children = section.querySelectorAll(
      '.section-label, .section-heading, .section-body, .feature-icon, .feature-title, .feature-text, .feature-card, .stat-item, .cta-heading, .cta-sub, .cta-buttons'
    );

    if (children.length === 0) return;

    const tl = gsap.timeline({ paused: true });

    switch (type) {
      case 'fade-up':
        tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
        break;
      case 'slide-left':
        tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
        break;
      case 'slide-right':
        tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
        break;
      case 'scale-up':
        tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
        break;
      case 'rotate-in':
        tl.from(children, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' });
        break;
      case 'stagger-up':
        tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
        break;
      case 'clip-reveal':
        tl.from(children, { clipPath: 'inset(100% 0 0 0)', opacity: 0, stagger: 0.15, duration: 1.2, ease: 'power4.inOut' });
        break;
      default:
        tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
    }

    sectionTimelines.set(section, { tl, persist, played: false });
  });
}

const EXIT_RANGE = 4; // last 4% of range: section slides up and fades out

function updateSections(progress) {
  const pct = progress * 100;

  sections.forEach((section) => {
    const enter = parseFloat(section.dataset.enter);
    const leave = parseFloat(section.dataset.leave);
    const persist = section.dataset.persist === 'true';

    const shouldShow = pct >= enter && (pct <= leave || persist);

    if (shouldShow) {
      section.classList.add('visible');
      if (section.querySelector('.stats-grid')) playCounters();

      // Pin to viewport center with position: fixed
      section.style.position = 'fixed';
      section.style.top = '50%';
      section.style.left = '0';
      section.style.zIndex = '4';

      // Slide-up exit: during the last EXIT_RANGE% before leave, slide up and fade
      const exitStart = leave - EXIT_RANGE;
      if (!persist && pct > exitStart && pct <= leave) {
        const exitProgress = (pct - exitStart) / EXIT_RANGE; // 0 → 1
        const slideUp = exitProgress * 150; // px to slide up
        const fadeOut = 1 - exitProgress;
        section.style.transform = 'translateY(calc(-50% - ' + slideUp + 'px))';
        section.style.opacity = String(fadeOut);
      } else {
        section.style.transform = 'translateY(-50%)';
        section.style.opacity = '1';
      }

      // Play GSAP timeline
      const data = sectionTimelines.get(section);
      if (data && !data.played) {
        data.tl.play();
        data.played = true;
      }
    } else {
      section.classList.remove('visible');
      if (section.querySelector('.stats-grid')) resetCounters();
      section.style.position = 'absolute';
      section.style.opacity = '0';
      section.style.top = '0';
      section.style.left = '0';
      section.style.zIndex = '';
      section.style.transform = 'translateY(-50%)';

      // Reverse timeline (unless persist)
      const data = sectionTimelines.get(section);
      if (data && data.played && !data.persist) {
        data.tl.reverse();
        data.played = false;
      }
    }
  });
}

/* ── 5. GSAP Scroll-Driven Marquee ── */
function initMarquee() {
  const marqueeTrack = document.getElementById('marquee-track');
  const marqueeWrap = document.getElementById('marquee-wrap');
  const scrollContainer = document.getElementById('scroll-container');

  if (!marqueeTrack || !scrollContainer) return;

  // Scroll-driven horizontal movement
  gsap.to(marqueeTrack, {
    xPercent: -25,
    ease: 'none',
    scrollTrigger: {
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true
    }
  });

  // Visibility is controlled in the main onUpdate
}

/* ── 7. GSAP Counter Animations ── */
let countersPlayed = false;
let counterAnims = [];

function playCounters() {
  if (countersPlayed) return;
  countersPlayed = true;
  document.querySelectorAll('.stat-number[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 2000;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(ease * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    const raf = requestAnimationFrame(tick);
    counterAnims.push(raf);
  });
}

function resetCounters() {
  countersPlayed = false;
  counterAnims.forEach(id => cancelAnimationFrame(id));
  counterAnims = [];
  document.querySelectorAll('.stat-number[data-count]').forEach(el => {
    el.textContent = '0';
  });
}

function initCounters() {
  // Triggered from updateSections when the stats section enters/leaves view
}

/* ── 8. Main Scroll Controller ── */
function initScrollAnimation() {
  const scrollContainer = document.getElementById('scroll-container');

  setupSectionAnimations();

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;

      // Frame scrubbing with speed multiplier
      const accelerated = Math.min(progress * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accelerated * TOTAL_FRAMES), TOTAL_FRAMES - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }

      // Circle-wipe
      updateCircleWipe(progress);

      // Section visibility + GSAP animations
      updateSections(progress);

      // Marquee visibility (synced with stats section, 62%–98%)
      const marquee = document.getElementById('marquee-wrap');
      if (marquee) {
        if (progress > 0.62 && progress < 0.98) {
          marquee.classList.add('visible');
        } else {
          marquee.classList.remove('visible');
        }
      }
    }
  });

  // Init GSAP-driven marquee + counters
  initMarquee();
  initCounters();
}

/* ── 9. Two-phase Preload ── */
async function preload() {
  // Phase 1: load first 10 frames quickly
  await Promise.all(Array.from({ length: 10 }, (_, i) => loadFrame(i)));

  // Sample bg color from first frame
  if (frames[0]) {
    const initialColor = sampleBgColor(frames[0]);
    updatePageBgColor(initialColor);
  }

  // First frames ready — hide loader, show canvas, start animation
  resizeCanvas();
  hideLoader();
  drawFrame(0);
  initScrollAnimation();

  // Position all sections immediately
  updateSections(0);

  // Phase 2: load remaining frames in background
  for (let i = 10; i < TOTAL_FRAMES; i++) {
    await loadFrame(i);
  }
}

window.addEventListener('resize', resizeCanvas);
preload();

/* ── 10. Book Cursor ── */
const cursorEl = document.getElementById('cursor');
let mx = -100, my = -100;
let cx = -100, cy = -100;

document.addEventListener('mousemove', (e) => {
  mx = e.clientX;
  my = e.clientY;
});

function animateCursor() {
  cx += (mx - cx) * 0.18;
  cy += (my - cy) * 0.18;
  if (cursorEl) {
    cursorEl.style.left = cx + 'px';
    cursorEl.style.top = cy + 'px';
  }
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Hover detection
document.querySelectorAll('a, button, [onclick], .feature-card').forEach((el) => {
  el.addEventListener('mouseenter', () => cursorEl && cursorEl.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursorEl && cursorEl.classList.remove('hover'));
});

// MutationObserver for dynamic elements
const cursorObserver = new MutationObserver(() => {
  document.querySelectorAll('a, button, [onclick]').forEach((el) => {
    if (!el._cursorBound) {
      el._cursorBound = true;
      el.addEventListener('mouseenter', () => cursorEl && cursorEl.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursorEl && cursorEl.classList.remove('hover'));
    }
  });
});
cursorObserver.observe(document.body, { childList: true, subtree: true });

// Click animation
document.addEventListener('mousedown', () => cursorEl && cursorEl.classList.add('click'));
document.addEventListener('mouseup', () => cursorEl && cursorEl.classList.remove('click'));

document.addEventListener('click', () => {
  if (cursorEl) {
    cursorEl.textContent = '📗';
    setTimeout(() => { cursorEl.textContent = '📖'; }, 350);
  }
});

/* ── 12. Page-flip Transition ── */
const flipOverlay = document.getElementById('page-flip-overlay');

function doPageFlip(href) {
  if (!flipOverlay) { window.location.href = href; return; }
  flipOverlay.style.transition = 'none';
  flipOverlay.style.opacity = '1';
  flipOverlay.style.clipPath = 'polygon(0 0, 0 0, 0 100%, 0 100%)';

  requestAnimationFrame(() => {
    flipOverlay.style.transition = 'clip-path 0.45s cubic-bezier(0.77,0,0.18,1)';
    flipOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
    setTimeout(() => { window.location.href = href; }, 460);
  });
}

document.querySelectorAll('a[href]').forEach((a) => {
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    doPageFlip(href);
  });
});

/* ── 13. Nav Scroll Effect ── */
const nav = document.getElementById('nav');
if (nav) {
  lenis.on('scroll', ({ scroll }) => {
    if (scroll > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

/* ── 14. Hamburger Menu ── */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');
let menuOpen = false;

function toggleMenu() {
  menuOpen = !menuOpen;
  burger?.classList.toggle('open', menuOpen);
  mobileMenu?.classList.toggle('open', menuOpen);
  burger?.setAttribute('aria-expanded', menuOpen);
  if (menuOpen) lenis.stop(); else lenis.start();
}

burger?.addEventListener('click', toggleMenu);

mobileMenu?.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', () => {
    if (menuOpen) toggleMenu();
  });
});

/* ── 15. Active Nav Link ── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-links a').forEach((a) => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});
