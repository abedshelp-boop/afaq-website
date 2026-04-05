/* ═══════════════════════════════════════════
   AFAQ — Sub-pages JS (pages.js)
   Lenis + Book Cursor + Page-flip Sound
   ═══════════════════════════════════════════ */

'use strict';

/* ── Clear stuck page-flip overlay on back-button ── */
window.addEventListener('pageshow', () => {
  const ov = document.getElementById('page-flip-overlay');
  if (ov) {
    ov.style.opacity = '0';
    ov.style.clipPath = 'polygon(0 0, 0 0, 0 100%, 0 100%)';
  }
});

/* ── 1. Lenis ── */
const lenis = new Lenis({
  duration: 0.6,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

/* ── 2. Book Cursor ── */
const cursor = document.getElementById('cursor');
let mx = -100, my = -100, cx = -100, cy = -100;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

function animateCursor() {
  cx += (mx - cx) * 0.18;
  cy += (my - cy) * 0.18;
  if (cursor) { cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px'; }
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button, [onclick], input, textarea, select, .course-card, .feature-card, .price-card, .filter-btn, .team-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursor?.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor?.classList.remove('hover'));
});

document.addEventListener('mousedown', () => cursor?.classList.add('click'));
document.addEventListener('mouseup',   () => cursor?.classList.remove('click'));

document.addEventListener('click', () => {
  if (cursor) {
    cursor.textContent = '📗';
    setTimeout(() => { cursor.textContent = '📖'; }, 350);
  }
});

/* ── 4. Page-flip navigation transition ── */
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
  a.addEventListener('click', e => { e.preventDefault(); doPageFlip(href); });
});

/* ── 5. Nav scroll effect ── */
const nav = document.getElementById('nav');
if (nav) {
  lenis.on('scroll', ({ scroll }) => {
    nav.classList.toggle('scrolled', scroll > 50);
  });
}

/* ── 6. Hamburger menu ── */
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
mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { if (menuOpen) toggleMenu(); }));

/* ── 7. Scroll-reveal ── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('revealed'); revealObs.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── 8. Active nav link ── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || href === '../' + currentPage) a.classList.add('active');
});

/* ── 9. Contact form (Web3Forms) ── */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = contactForm.querySelector('.form-submit');
    const originalText = btn.textContent;
    btn.textContent = 'Skickar…';
    btn.disabled = true;

    const data = new FormData(contactForm);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        contactForm.style.display = 'none';
        const success = document.getElementById('form-success');
        if (success) success.style.display = 'block';
      } else {
        btn.textContent = 'Försök igen';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = 'Fel — försök igen';
      btn.disabled = false;
    }
    setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 4000);
  });
}

/* ── 10. Course filter ── */
const filterBtns = document.querySelectorAll('.filter-btn');
const courseCards = document.querySelectorAll('.course-card[data-category]');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.filter;
    courseCards.forEach(card => {
      const show = cat === 'alla' || card.dataset.category === cat;
      card.style.display = show ? '' : 'none';
    });
  });
});

/* ── 11. Pricing toggle ── */
const pricingToggle = document.getElementById('pricing-toggle');
const monthlyPrices = document.querySelectorAll('[data-monthly]');
const yearlyPrices  = document.querySelectorAll('[data-yearly]');

if (pricingToggle) {
  let isYearly = false;
  pricingToggle.addEventListener('click', () => {
    isYearly = !isYearly;
    pricingToggle.classList.toggle('yearly', isYearly);
    monthlyPrices.forEach(el => { el.style.display = isYearly ? 'none' : ''; });
    yearlyPrices.forEach(el => { el.style.display = isYearly ? '' : 'none'; });
    document.querySelectorAll('.toggle-label').forEach((l, i) => {
      l.style.color = (i === 0 && !isYearly) || (i === 1 && isYearly) ? 'var(--green)' : '';
    });
  });
}

/* ── 12. Rules sidebar active state ── */
const ruleGroups = document.querySelectorAll('.rule-group');
const ruleNavLinks = document.querySelectorAll('.rules-nav a');

if (ruleGroups.length && ruleNavLinks.length) {
  const ruleObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        ruleNavLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  ruleGroups.forEach(g => ruleObs.observe(g));

  /* Smooth-scroll rules nav links via Lenis */
  ruleNavLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) lenis.scrollTo(target, { offset: -100 });
    });
  });
}
