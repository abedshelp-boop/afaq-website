/* ═══════════════════════════════════════════
   AFAQ — Homepage JS (Complete Rebuild)
   Lenis + GSAP ScrollTrigger + Canvas Frames
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

/* ── 1. Lenis Smooth Scroll (GSAP ticker only, NO manual RAF) ── */
const lenis = new Lenis({
  duration: 0.6,
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

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const frames = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let currentFrame = 0;

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
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function hideLoader() {
  if (loaderEl) {
    loaderEl.classList.add('hidden');
  }
}

function initScrollAnimation() {
  const scrollContainer = document.getElementById('scroll-container');

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      // Frame scrubbing with speed multiplier
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accelerated * TOTAL_FRAMES), TOTAL_FRAMES - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }

      // Section visibility
      updateSections(self.progress);

      // Marquee visibility (show after 15% scroll)
      const marquee = document.getElementById('marquee-wrap');
      if (marquee) {
        if (self.progress > 0.15) {
          marquee.classList.add('visible');
        } else {
          marquee.classList.remove('visible');
        }
      }
    }
  });
}

/* ── Section Visibility System ── */
const sections = document.querySelectorAll('.scroll-section');

function updateSections(progress) {
  const pct = progress * 100;

  sections.forEach((section) => {
    const enter = parseFloat(section.dataset.enter);
    const leave = parseFloat(section.dataset.leave);
    const persist = section.dataset.persist === 'true';

    if (pct >= enter && (pct <= leave || persist)) {
      section.classList.add('visible');
    } else {
      section.classList.remove('visible');
    }

    // Position sections vertically based on their enter point
    section.style.top = (enter / 100 * 800) + 'vh';
  });
}

/* ── Two-phase Preload ── */
async function preload() {
  // Phase 1: load first 10 frames quickly
  await Promise.all(Array.from({ length: 10 }, (_, i) => loadFrame(i)));

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

/* ── 3. Book Cursor ── */
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

/* ── 4. Page-flip Sound ── */
const flipAudio = new Audio('audio/page-flip.mp3');
flipAudio.volume = 0.4;
flipAudio.preload = 'auto';

document.addEventListener('click', () => {
  const s = flipAudio.cloneNode();
  s.volume = 0.35;
  s.play().catch(() => {});
  if (cursorEl) {
    cursorEl.textContent = '📗';
    setTimeout(() => { cursorEl.textContent = '📖'; }, 350);
  }
});

/* ── 5. Page-flip Transition ── */
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

/* ── 6. Nav Scroll Effect ── */
const nav = document.getElementById('nav');
if (nav) {
  lenis.on('scroll', ({ scroll }) => {
    if (scroll > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

/* ── 7. Hamburger Menu ── */
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

/* ── 8. Active Nav Link ── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-links a').forEach((a) => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

/* ── 9. Stats Counter Animation ── */
let statsAnimated = false;

function animateStats() {
  if (statsAnimated) return;
  statsAnimated = true;

  document.querySelectorAll('.stat-number[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

// Observe stats section for counter animation
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      animateStats();
      statsObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

const statsGrid = document.querySelector('.stats-grid');
if (statsGrid) statsObserver.observe(statsGrid);
