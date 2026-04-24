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

  /** Stop all audio playback */
  function stopAllAudio() {
    // Stop the active audio from text-to-sound buttons
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudioBtn?.classList.remove('playing');
      activeAudio = null;
      activeAudioBtn = null;
    }
    
    // Stop all audio elements
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Stop all HTML5 audio/video elements that might be playing audio
    const allMedia = document.querySelectorAll('video, audio');
    allMedia.forEach(media => {
      media.pause();
      media.currentTime = 0;
    });
  }

  /** Go to slide index. instant = no animation (for first load) */
  function goTo(index, instant = false) {
    if (animating && !instant) return;
    if (index < 0 || index >= total) return;
    if (index === current && !instant) return;

    current = index;
    animating = true;

    // Stop all audio except background audio when changing slides
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
      activeAudioBtn = null;
    }
    
    // Remove playing class from all sound buttons
    document.querySelectorAll('.text-to-sound.playing').forEach(btn => {
      btn.classList.remove('playing');
    });

    // Hide only currently visible slides
    const visibleSlides = document.querySelectorAll('.slide[style*="display: flex"]');
    visibleSlides.forEach(slide => {
      slide.style.display = 'none';
      slide.style.opacity = '0';
      slide.style.pointerEvents = 'none';
    });

    // Mobile responsive: check screen width
    const isMobile = window.innerWidth <= 768;
    
    // Show slides based on book layout
    if (index === 0) {
      // Cover page - show original slide 0 content (Happy Birthday, Babe)
      if (slides[0]) {
        slides[0].style.display = 'flex';
        slides[0].style.opacity = '1';
        slides[0].style.pointerEvents = 'all';
        if (isMobile) {
          slides[0].style.setProperty('width', '90vw', 'important');
          slides[0].style.setProperty('left', '5vw', 'important');
        } else {
          slides[0].style.setProperty('width', '68vw', 'important');
          slides[0].style.setProperty('left', '16vw', 'important');
        }
        slides[0].style.setProperty('top', '5vh', 'important');
        slides[0].style.setProperty('position', 'absolute', 'important');
      }
    } else if (isMobile) {
      // Mobile: show single slide at current index (sequential navigation)
      if (slides[index]) {
        slides[index].style.display = 'flex';
        slides[index].style.opacity = '1';
        slides[index].style.pointerEvents = 'all';
        slides[index].style.setProperty('width', '90vw', 'important');
        slides[index].style.setProperty('left', '5vw', 'important');
        slides[index].style.setProperty('top', '5vh', 'important');
        slides[index].style.setProperty('position', 'absolute', 'important');
        slides[index].style.setProperty('z-index', '1', 'important');
      }
    } else {
      // Desktop: Book spread - odd page left, even page right (starting from slide 1)
      const leftPage = index % 2 === 1 ? index : index - 1;
      const rightPage = leftPage + 1;
      
      // Left page (odd number) - match cover page width
      if (slides[leftPage]) {
        slides[leftPage].style.display = 'flex';
        slides[leftPage].style.opacity = '1';
        slides[leftPage].style.pointerEvents = 'all';
        slides[leftPage].style.setProperty('width', '34vw', 'important');
        slides[leftPage].style.setProperty('left', '16vw', 'important');
        slides[leftPage].style.setProperty('top', '5vh', 'important');
        slides[leftPage].style.setProperty('position', 'absolute', 'important');
        slides[leftPage].style.setProperty('z-index', '1', 'important');
      }
      
      // Right page (even number) - match cover page width
      if (slides[rightPage]) {
        slides[rightPage].style.display = 'flex';
        slides[rightPage].style.opacity = '1';
        slides[rightPage].style.pointerEvents = 'all';
        slides[rightPage].style.setProperty('width', '34vw', 'important');
        slides[rightPage].style.setProperty('left', '50vw', 'important');
        slides[rightPage].style.setProperty('top', '5vh', 'important');
        slides[rightPage].style.setProperty('position', 'absolute', 'important');
        slides[rightPage].style.setProperty('z-index', '2', 'important');
      }
    }

    // Update HUD
    updateHUD();
    
    // Reset animation flag
    setTimeout(() => {
      // Check if we're in the sad section (from "life was not exactly fair" to "phoenix reborn")
      const sadSectionStart = document.getElementById('sad-section-start');
      const sadSectionEnd = document.getElementById('sad-section-end');
      
      if (sadSectionStart && sadSectionEnd) {
        const startIndex = Array.from(slides).indexOf(sadSectionStart);
        const endIndex = Array.from(slides).indexOf(sadSectionEnd);
        
        if (current >= startIndex && current <= endIndex) {
          // Only play if not already playing
          if (!backgroundAudio || backgroundAudio.paused) {
            playBackgroundAudio('assets/music/sad carol.mp3', 0.25, true);
          }
        } else {
          // Stop background audio when leaving the sad section
          stopBackgroundAudio();
        }
      }
      
      animating = false;
    }, instant ? 0 : 100);
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

  // Background audio for sad section
  let backgroundAudio = null;

  // Play background audio
  function playBackgroundAudio(src, volume = 0.3, loop = true) {
    // Check if background audio is already playing the same source
    if (backgroundAudio && !backgroundAudio.paused && backgroundAudio.src.includes(src)) {
      return; // Already playing, don't restart
    }
    
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
    
    backgroundAudio = new Audio(src);
    
    // Apply universal volume normalization to background audio
    const normalizedVolume = Math.min(Math.max(volume, 0.2), 0.4); // Clamp between 0.2 and 0.4
    backgroundAudio.volume = normalizedVolume;
    backgroundAudio.loop = loop;
    
    // Add audio normalization to prevent extreme volume differences
    backgroundAudio.addEventListener('loadedmetadata', () => {
      // Ensure background audio never exceeds safe limits
      if (backgroundAudio.volume > 0.4) backgroundAudio.volume = 0.4;
      if (backgroundAudio.volume < 0.2) backgroundAudio.volume = 0.2;
    }, { once: true });
    
    backgroundAudio.play();
  }

  // Stop background audio
  function stopBackgroundAudio() {
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
      backgroundAudio = null;
    }
  }

  // Stop all background audio (but keep video animations playing)
  function stopAllBackgroundAudio() {
    // Stop background audio
    stopBackgroundAudio();
    
    // Stop all audio elements
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Stop any active audio from sound buttons
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
      activeAudioBtn = null;
    }
    
    // Remove playing class from all sound buttons
    document.querySelectorAll('.text-to-sound.playing').forEach(btn => {
      btn.classList.remove('playing');
    });
  }

  // ── Navigation ───────────────────────────────────────────────
  function setupSlideNavigation() {
    const isMobile = window.innerWidth <= 768;
    const step = isMobile ? 1 : 2;
    
    prevBtn?.addEventListener('click', () => goTo(current - step));
    nextBtn?.addEventListener('click', () => goTo(current + step));

    // Keyboard
    document.addEventListener('keydown', e => {
      if (jumpModal && jumpModal.style.display !== 'none') return;
      const isMobile = window.innerWidth <= 768;
      const step = isMobile ? 1 : 2;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ':
          e.preventDefault(); goTo(current + step); break;
        case 'ArrowLeft': case 'ArrowUp':
          e.preventDefault(); goTo(current - step); break;
        case 'g': case 'G':
          openJump(); break;
        case 'Escape':
          closeJump(); break;
      }
    });

    // Wheel
    const container = document.getElementById('swipe-container');
    if (container) {
      container.addEventListener('wheel', e => {
        e.preventDefault();
        const isMobile = window.innerWidth <= 768;
        const step = isMobile ? 1 : 2;
        
        if (e.deltaY > 0) {
          // Scrolling down - go to next
          goTo(current + step);
        } else if (e.deltaY < 0) {
          // Scrolling up - go to previous
          goTo(current - step);
        }
      }, { passive: false });
    } 

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

        // Stop previous audio if playing
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudioBtn?.classList.remove('playing');
        }

        // Simple audio playback for local files
        const audio = new Audio(src);
        
        // Force immediate volume control
        const forceVolume = (audioSrc) => {
          // Aggressively reduce known loud files
          if (audioSrc.toLowerCase().includes('you found me')) {
            return 0.15; // Very low for "you found me"
          } else if (audioSrc.toLowerCase().includes('inspector gadget')) {
            return 0.2;
          } else if (audioSrc.toLowerCase().includes('one piece intro')) {
            return 0.2;
          } else if (audioSrc.toLowerCase().includes('pokemon theme')) {
            return 0.2;
          } else if (audioSrc.toLowerCase().includes('all I know is')) {
            return 0.6; // Boost quiet files
          } else if (audioSrc.toLowerCase().includes('hercules amazing')) {
            return 0.6;
          } else {
            return 0.4; // Conservative default
          }
        };
        
        // Apply forced volume immediately and repeatedly
        const targetVolume = forceVolume(src);
        audio.volume = targetVolume;
        
        // Force volume to stay low with multiple checks
        const enforceVolume = () => {
          audio.volume = targetVolume;
          if (audio.volume > targetVolume) {
            audio.volume = targetVolume;
          }
        };
        
        // Enforce volume at multiple points
        enforceVolume();
        setTimeout(enforceVolume, 100);
        setTimeout(enforceVolume, 500);
        
        audio.addEventListener('loadedmetadata', enforceVolume);
        audio.addEventListener('canplay', enforceVolume);
        
        audio.play();

        audio.addEventListener('ended', () => {
          btn.classList.remove('playing');
          activeAudio = null;
          activeAudioBtn = null;
        });

        activeAudio = audio;
        activeAudioBtn = btn;
        btn.classList.add('playing');
      });
    });
  }

  // ── Peek Hints ────────────────────────────────────────────────
  function setupPeekHints() {
    document.querySelectorAll('.peek-hint:not(.simple-question)').forEach(btn => {
      // Only initialize if not already done
      if (!btn.dataset.originalContent) {
        // Store original content and hide it initially
        const originalContent = btn.innerHTML;
        btn.dataset.originalContent = originalContent;
        btn.innerHTML = '<em>👁 Tap to reveal spoiler...</em>';
        btn.style.opacity = '0.7';
        btn.style.fontStyle = 'italic';
      }
      
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.classList.contains('revealed')) return; // one-way reveal
        btn.classList.add('revealed');
        btn.innerHTML = btn.dataset.originalContent;
        btn.style.opacity = '1';
        btn.style.fontStyle = 'normal';
        spawnSparkles(btn, 5);
      });
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
