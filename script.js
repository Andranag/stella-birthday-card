/* ============================================================
   ✨ Stella's Birthday Story — Script
   ============================================================ */

(function () {
  'use strict';

  // ── Elements ────────────────────────────────────────────────
  const slides        = Array.from(document.querySelectorAll('.slide'));
  const container     = document.getElementById('swipe-container');
  const progressFill  = document.getElementById('progress-fill');
  const indicator     = document.getElementById('top-indicator');
  const prevBtn       = document.getElementById('prev-page');
  const nextBtn       = document.getElementById('next-page');
  const jumpModal     = document.getElementById('jump-modal');
  const jumpInput     = document.getElementById('jump-input');
  const jumpTotal     = document.getElementById('jump-total');
  const jumpConfirm   = document.getElementById('jump-confirm');
  const jumpCancel    = document.getElementById('jump-cancel');
  const compassBtn    = document.getElementById('compass-trigger');
  const compass       = document.getElementById('context-compass');
  const tipsBar       = document.getElementById('tips-bar');

  // ── State ────────────────────────────────────────────────────
  const total       = slides.length;
  let current       = 0;
  let animating     = false;
  let activeAudio   = null;
  let activeAudioBtn= null;
  let tipIndex      = 0;

  // ── Initialise ───────────────────────────────────────────────
  function init() {
    buildStarfield();
    hideAllSlides();
    populateJumpTotal();
    setupSlideNavigation();
    setupSoundButtons();
    setupPeekHints();
    setupSimpleQuestion();
    setupJumpModal();
    setupCompass();
    setupTips();
    goTo(0, true);
  }

  // ── Starfield Canvas ─────────────────────────────────────────
  function buildStarfield() {
    const canvas = document.createElement('canvas');
    canvas.id = 'starfield';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // White star specs
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.3 + 0.15,
      a: Math.random() * 0.8 + 0.1,
      speed: Math.random() * 0.6 + 0.1,
      phase: Math.random() * Math.PI * 2
    }));

    // Gold dust specs
    const dust = Array.from({ length: 28 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.4 + 0.05,
      speed: Math.random() * 0.25 + 0.05,
      phase: Math.random() * Math.PI * 2
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.004;

      stars.forEach(s => {
        const alpha = s.a * (0.45 + 0.55 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fill();
      });

      dust.forEach(s => {
        const alpha = s.a * (0.35 + 0.65 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,197,24,${alpha.toFixed(3)})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };
    draw();
  }

  // ── Slide System ─────────────────────────────────────────────
  function hideAllSlides() {
    slides.forEach(s => {
      s.style.display     = 'none';
      s.style.opacity     = '0';
      s.style.transform   = 'translateX(0)';
      s.style.transition  = 'none';
      s.style.pointerEvents = 'none';
      s.classList.remove('cover', 'left-page', 'right-page', 'hidden');
    });
    if (jumpTotal) jumpTotal.textContent = total;
  }

  function populateJumpTotal() {
    if (jumpTotal) jumpTotal.textContent = total;
  }

  /** Go to slide index. instant = no animation (for first load) */
  function goTo(index, instant = false) {
    if (animating && !instant) return;
    if (index < 0 || index >= total) return;
    if (index === current && !instant) return;

    const prevIndex = current;
    current = index;
    animating = true;

    // Update slide classes for realistic storybook layout
    slides.forEach((slide, i) => {
      slide.classList.remove('cover', 'left-page', 'right-page', 'hidden');
      slide.style.transition = instant ? 'none' : 'all 0.6s cubic-bezier(0.42, 0, 0.18, 1)';
      
      if (i === 0 && index === 0) {
        // Big cover page - full width when it's the current slide
        slide.classList.add('cover');
        slide.style.display = 'flex';
        slide.style.opacity = '1';
        slide.style.pointerEvents = 'all';
        slide.style.width = '90%';
        slide.style.left = '50%';
        slide.style.transform = 'translateX(-50%)';
      } else if (index === 0) {
        // All other slides hidden when on cover
        slide.classList.add('hidden');
        slide.style.display = 'none';
        slide.style.opacity = '0';
        slide.style.pointerEvents = 'none';
      } else {
        // Book is open - show 2 pages per spread
        const currentPageIndex = index - 1; // Adjust for cover (slide 0)
        const leftPageIndex = Math.floor(currentPageIndex / 2) * 2 + 1;
        const rightPageIndex = leftPageIndex + 1;
        
        slide.style.width = '48%';
        slide.style.height = '90%';
        slide.style.position = 'absolute';
        
        if (i === leftPageIndex) {
          // Left page of current spread
          slide.classList.add('left-page');
          slide.style.display = 'flex';
          slide.style.opacity = '1';
          slide.style.pointerEvents = 'all';
          slide.style.left = '2%';
          slide.style.transform = 'none';
        } else if (i === rightPageIndex && rightPageIndex < slides.length) {
          // Right page of current spread
          slide.classList.add('right-page');
          slide.style.display = 'flex';
          slide.style.opacity = '1';
          slide.style.pointerEvents = 'all';
          slide.style.right = '2%';
          slide.style.transform = 'none';
        } else {
          // Hidden slides
          slide.classList.add('hidden');
          slide.style.display = 'none';
          slide.style.opacity = '0';
          slide.style.pointerEvents = 'none';
        }
      }
      
      // Reset scroll position for visible slides
      if (slide.style.display === 'flex') {
        slide.scrollTop = 0;
      }
    });

    // Update HUD
    updateHUD();
    
    // Reset animation flag
    setTimeout(() => {
      animating = false;
    }, instant ? 0 : 600);
  }

  function updateHUD() {
    // Progress
    if (progressFill) {
      progressFill.style.width = `${((current + 1) / total) * 100}%`;
    }
    // Indicator
    if (indicator) {
      indicator.textContent = `${current + 1}  /  ${total}`;
    }
    // Arrows
    if (prevBtn) prevBtn.style.opacity = current > 0         ? '1' : '0.18';
    if (nextBtn) nextBtn.style.opacity = current < total - 1 ? '1' : '0.18';
  }

  // ── Navigation ───────────────────────────────────────────────
  function setupSlideNavigation() {
    prevBtn?.addEventListener('click', () => goTo(current - 1));
    nextBtn?.addEventListener('click', () => goTo(current + 1));

    // Keyboard
    document.addEventListener('keydown', e => {
      if (jumpModal && jumpModal.style.display !== 'none') return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ':
          e.preventDefault(); goTo(current + 1); break;
        case 'ArrowLeft': case 'ArrowUp':
          e.preventDefault(); goTo(current - 1); break;
        case 'g': case 'G':
          openJump(); break;
        case 'Escape':
          closeJump(); break;
      }
    });

    // Scroll wheel navigation
    document.addEventListener('wheel', e => {
      if (jumpModal && jumpModal.style.display !== 'none') return;
      e.preventDefault();
      
      if (e.deltaY > 0) {
        // Scrolling down - go to next slide
        goTo(current + 1);
      } else if (e.deltaY < 0) {
        // Scrolling up - go to previous slide
        goTo(current - 1);
      }
    }, { passive: false });

    // Touch swipe
    let tx = 0, ty = 0;
    container?.addEventListener('touchstart', e => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    }, { passive: true });

    container?.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
        dx < 0 ? goTo(current + 1) : goTo(current - 1);
      }
    }, { passive: true });
  }

  // ── Sound Buttons ─────────────────────────────────────────────
  function setupSoundButtons() {
    document.querySelectorAll('.text-to-sound').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const src = btn.dataset.sound;
        if (!src) return;

        // Toggle off if same button
        if (activeAudio && activeAudioBtn === btn) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio   = null;
          activeAudioBtn = null;
          btn.classList.remove('playing');
          return;
        }

        // Stop previous
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudioBtn?.classList.remove('playing');
        }

        const audio = new Audio(src);
        audio.volume = 0.72;
        audio.play().catch(() => {});

        audio.addEventListener('ended', () => {
          btn.classList.remove('playing');
          if (activeAudio === audio) { activeAudio = null; activeAudioBtn = null; }
        });

        activeAudio    = audio;
        activeAudioBtn = btn;
        btn.classList.add('playing');
        spawnSparkles(btn, 6);
      });
    });
  }

  // ── Peek Hints ────────────────────────────────────────────────
  function setupPeekHints() {
    document.querySelectorAll('.peek-hint:not(.simple-question)').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.classList.contains('revealed')) return; // one-way reveal
        btn.classList.add('revealed');
        spawnSparkles(btn, 5);
      });
    });
  }

  // ── Simple Question (Slide 30 – his first message) ────────────
  function setupSimpleQuestion() {
    const btn = document.querySelector('.peek-hint.simple-question');
    if (!btn) return;
    btn.innerHTML = '<em>👁 Tap to see his very first message...</em>';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.classList.contains('revealed')) return;
      btn.innerHTML = '<em>💬 "Hey 👋 — do you know who this is?"</em>';
      btn.classList.add('revealed');
      spawnSparkles(btn, 7);
    });
  }

  // ── Sparkle Effect ────────────────────────────────────────────
  const SPARKS = ['✦', '★', '✨', '💫', '⭐', '✧', '❋'];

  function spawnSparkles(element, count = 5) {
    const rect = element.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className   = 'sparkle-particle';
        el.textContent = SPARKS[Math.floor(Math.random() * SPARKS.length)];
        el.style.cssText = [
          `left: ${cx + (Math.random() - 0.5) * 90}px`,
          `top:  ${cy + (Math.random() - 0.5) * 50}px`,
          `font-size: ${10 + Math.random() * 16}px`,
          'animation-duration: ' + (0.7 + Math.random() * 0.5) + 's'
        ].join(';');
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
      }, i * 90);
    }
  }

  // ── Jump Modal ────────────────────────────────────────────────
  function openJump() {
    if (!jumpModal) return;
    jumpModal.style.display = 'flex';
    if (jumpInput) { jumpInput.value = ''; jumpInput.focus(); }
  }

  function closeJump() {
    if (jumpModal) jumpModal.style.display = 'none';
  }

  function confirmJump() {
    const n = parseInt(jumpInput?.value, 10);
    if (!isNaN(n) && n >= 1 && n <= total) { goTo(n - 1); closeJump(); }
  }

  function setupJumpModal() {
    jumpConfirm?.addEventListener('click', confirmJump);
    jumpCancel?.addEventListener('click',  closeJump);
    jumpInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter')  confirmJump();
      if (e.key === 'Escape') closeJump();
    });
    jumpModal?.addEventListener('click', e => {
      if (e.target === jumpModal) closeJump();
    });
  }

  // ── Context Compass ───────────────────────────────────────────
  function setupCompass() {
    compassBtn?.addEventListener('click', e => {
      e.stopPropagation();
      compass?.classList.toggle('open');
    });

    document.querySelectorAll('.compass-sections li').forEach(li => {
      li.addEventListener('click', () => {
        const n = parseInt(li.dataset.slide, 10);
        if (!isNaN(n)) { goTo(n - 1); compass?.classList.remove('open'); }
      });
    });

    document.addEventListener('click', e => {
      if (!compass?.contains(e.target) && e.target !== compassBtn) {
        compass?.classList.remove('open');
      }
    });
  }

  // ── Rotating Tips ─────────────────────────────────────────────
  function setupTips() {
    if (!tipsBar) return;
    const tips = Array.from(tipsBar.querySelectorAll('span'));
    if (!tips.length) return;

    tips.forEach((s, i) => s.classList.toggle('tip-active', i === 0));

    setInterval(() => {
      tips[tipIndex].classList.remove('tip-active');
      tipIndex = (tipIndex + 1) % tips.length;
      // Brief pause then activate
      setTimeout(() => tips[tipIndex].classList.add('tip-active'), 200);
    }, 9000);
  }

  // ── Boot ──────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
