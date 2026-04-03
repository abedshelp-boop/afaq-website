/* ═══════════════════════════════════════════
   AFAQ — Homepage JS (app.js)
   Lenis + GSAP ScrollTrigger + Canvas Frames
   Book Cursor + Page-flip Sound
   ═══════════════════════════════════════════ */

'use strict';

/* ── 0. Register GSAP plugins ── */
gsap.registerPlugin(ScrollTrigger);

/* ── 1. Lenis smooth scroll ── */
const lenis = new Lenis({
  duration: 0.6,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1.8,
  touchMultiplier: 2,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Connect Lenis to GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ── 2. Book Cursor ── */
const cursor = document.getElementById('cursor');
let mx = -100, my = -100;
let cx = -100, cy = -100;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
});

// Smooth cursor follow
function animateCursor() {
  cx += (mx - cx) * 0.18;
  cy += (my - cy) * 0.18;
  if (cursor) {
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
  }
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Hover state
document.querySelectorAll('a, button, [onclick], .course-card, .feature-card, .price-card, .filter-btn').forEach(el => {
  el.addEventListener('mouseenter', () => cursor && cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('hover'));
});

// Observer for dynamically created elements
const cursorObserver = new MutationObserver(() => {
  document.querySelectorAll('a, button, [onclick]').forEach(el => {
    if (!el._cursorBound) {
      el._cursorBound = true;
      el.addEventListener('mouseenter', () => cursor && cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('hover'));
    }
  });
});
cursorObserver.observe(document.body, { childList: true, subtree: true });

// Click state
document.addEventListener('mousedown', () => cursor && cursor.classList.add('click'));
document.addEventListener('mouseup', () => cursor && cursor.classList.remove('click'));

/* ── 3. Page-flip Sound ── */
const flipAudio = new Audio('audio/page-flip.mp3');
flipAudio.volume = 0.4;
flipAudio.preload = 'auto';

document.addEventListener('click', () => {
  const s = flipAudio.cloneNode();
  s.volume = 0.35;
  s.play().catch(() => {});
  // Book cursor react
  if (cursor) {
    cursor.textContent = '📗';
    setTimeout(() => { cursor.textContent = '📖'; }, 350);
  }
});

/* ── 4. Page-flip swipe transition ── */
const overlay = document.getElementById('page-flip-overlay');

function doPageFlip(href) {
  if (!overlay) { window.location.href = href; return; }
  overlay.style.transition = 'none';
  overlay.style.opacity = '1';
  overlay.style.clipPath = 'polygon(0 0, 0 0, 0 100%, 0 100%)';

  requestAnimationFrame(() => {
    overlay.style.transition = 'clip-path 0.45s cubic-bezier(0.77,0,0.18,1)';
    overlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
    setTimeout(() => { window.location.href = href; }, 460);
  });
}

document.querySelectorAll('a[href]').forEach(a => {
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
  a.addEventListener('click', e => {
    e.preventDefault();
    doPageFlip(href);
  });
});

/* ── 5. Canvas Frame Animation ── */
const canvas = document.getElementById('hero-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const TOTAL_FRAMES = 121;
  const FRAME_PATH = 'frames/frame_';
  const images = [];
  let loadedCount = 0;
  let currentFrame = 0;
  const loadingEl = document.getElementById('canvas-loading');

  function padNum(n) {
    return String(n).padStart(4, '0');
  }

  // Resize canvas to fill viewport
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    drawFrame(currentFrame);
  }

  window.addEventListener('resize', resizeCanvas);

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;

    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale, sh = ih * scale;
    const ox = (cw - sw) / 2, oy = (ch - sh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, ox, oy, sw, sh);
  }

  // Preload all frames
  function preload() {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH + padNum(i) + '.webp';
      img.onload = () => {
        loadedCount++;
        if (loadedCount === 1) {
          // First frame ready — show it and hide the loading overlay
          resizeCanvas();
          if (loadingEl) {
            loadingEl.classList.add('hidden');
            // Remove from DOM after fade-out so it doesn't interfere
            loadingEl.addEventListener('transitionend', () => {
              loadingEl.style.display = 'none';
            }, { once: true });
          }
          initScrollTrigger();
        }
        // Redraw if this is the currently displayed frame
        if (i - 1 === currentFrame) {
          drawFrame(currentFrame);
        }
      };
      img.onerror = () => {
        // Count errors too so we don't stall on missing frames
        loadedCount++;
        if (loadedCount === 1 && loadingEl) {
          loadingEl.classList.add('hidden');
        }
      };
      images.push(img);
    }
  }

  function initScrollTrigger() {
    // canvas-wrap is already position:sticky — no GSAP pin needed (avoids DOM conflicts)
    gsap.to({ frame: 0 }, {
      frame: TOTAL_FRAMES - 1,
      snap: 'frame',
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero-section',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
      },
      onUpdate() {
        const f = Math.round(this.targets()[0].frame);
        if (f !== currentFrame) {
          currentFrame = f;
          drawFrame(f);
        }
      },
    });

    // Hero text appears after first third of scroll
    ScrollTrigger.create({
      trigger: '#hero-section',
      start: '30% top',
      onEnter: () => {
        document.querySelector('.hero-tagline')?.classList.add('visible');
        document.querySelector('.hero-sub')?.classList.add('visible');
      },
      onLeaveBack: () => {
        document.querySelector('.hero-tagline')?.classList.remove('visible');
        document.querySelector('.hero-sub')?.classList.remove('visible');
      },
    });

    // Scroll hint hides on scroll
    ScrollTrigger.create({
      trigger: '#hero-section',
      start: '5% top',
      onEnter: () => document.querySelector('.scroll-hint')?.classList.add('hidden'),
      onLeaveBack: () => document.querySelector('.scroll-hint')?.classList.remove('hidden'),
    });
  }

  // Set canvas dimensions immediately so the loading overlay sits on correct background
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  preload();
}

/* ── 6. Nav scroll effect ── */
const nav = document.getElementById('nav');
if (nav) {
  lenis.on('scroll', ({ scroll }) => {
    if (scroll > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

/* ── 7. Hamburger menu ── */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');
let menuOpen = false;

function toggleMenu() {
  menuOpen = !menuOpen;
  burger?.classList.toggle('open', menuOpen);
  mobileMenu?.classList.toggle('open', menuOpen);
  if (menuOpen) lenis.stop(); else lenis.start();
}

burger?.addEventListener('click', toggleMenu);

// Close on link click
mobileMenu?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    if (menuOpen) toggleMenu();
  });
});

/* ── 8. Scroll-reveal for sections below hero ── */
const reveals = document.querySelectorAll('.reveal');
if (reveals.length) {
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('revealed'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  reveals.forEach(el => revealObs.observe(el));
}

/* ── 9. Mark active nav link ── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});
