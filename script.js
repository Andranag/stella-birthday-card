/* ================================================================
   DISNEY FAIRYTALE STORYBOOK  —  script.js
   Two-page spread · Disney book cover · Enchanted night sky
   ================================================================ */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let slides      = [];   // all .slide.gift-article elements
  let spreads     = [];   // [[cover], [s1,s2], [s3,s4], ...]
  let curSpread   = 0;    // desktop: current spread index
  let curSlide    = 0;    // mobile:  current slide index (0 = cover)
  let currentAudio = null;
  let playingBtn   = null;

  /* ── Chapter config ────────────────────────────────────────── */
  const CHAPTERS = [
    { id: 'header',                 icon: '🏰', label: 'Cover'      },
    { id: 'sad-section-start',      icon: '💧', label: 'Hard Times' },
    { id: 'dance-section-start',    icon: '💃', label: 'The Dance'  },
    { id: 'careless-section-start', icon: '🌙', label: 'His Place'  },
    { id: 'final-slide',            icon: '🎊', label: 'The End'    },
  ];

  /* ── Helpers ───────────────────────────────────────────────── */
  const isMobile = () => window.innerWidth < 640;

  function mk(tag, attrs = {}) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  }

  function shakeEl(node) {
    if (!node) return;
    node.style.animation = 'none';
    void node.offsetHeight;
    node.style.animation = 'sbShake 0.35s ease';
    node.addEventListener('animationend', () => { node.style.animation = ''; }, { once: true });
  }

  /* ── Init ──────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    slides = Array.from(document.querySelectorAll('.slide.gift-article'));
    if (!slides.length) return;

    buildSpreads();
    injectDynamicStyles();
    buildBookDOM();
    setupSpoilers();
    setupAudio();
    setupSwipe();
    setupKeyboard();
    setupNavButtons();
    setupJumpModal();
    buildNavPanel();

    // Start at cover
    curSpread = 0; curSlide = 0;
    render(false);
  });

  /* ── Build spreads ─────────────────────────────────────────── */
  function buildSpreads() {
    spreads = [];
    spreads.push([slides[0]]); // spread 0 = cover
    const rest = slides.slice(1);
    for (let i = 0; i < rest.length; i += 2) {
      const pair = [rest[i]];
      if (rest[i + 1]) pair.push(rest[i + 1]);
      spreads.push(pair);
    }
  }

  function slideIndexToSpread(si) {
    return si === 0 ? 0 : Math.ceil(si / 2);
  }

  function spreadToFirstSlide(sp) {
    return sp === 0 ? 0 : (sp - 1) * 2 + 1;
  }

  /* ── Render (router) ───────────────────────────────────────── */
  function render(animate = true) {
    if (isMobile()) renderMobile(animate);
    else            renderDesktop(animate);
    updateProgress();
    updateCounter();
    updateNavButtons();
    syncNavPanel();
  }

  /* Mobile: single page in right slot */
  function renderMobile() {
    returnAllToContainer();
    const coverView  = document.getElementById('cover-view');
    const spreadView = document.getElementById('spread-view');

    if (curSlide === 0) {
      coverView.classList.add('active');
      spreadView.classList.remove('active');
      return;
    }

    coverView.classList.remove('active');
    spreadView.classList.add('active');

    const rightSlot = document.getElementById('right-slot');
    const slide = slides[curSlide];
    if (slide) {
      slide.classList.add('active', 'in-page');
      rightSlot.appendChild(slide);
      playVideos(slide);
    }

    const numEl = document.querySelector('.right-num');
    if (numEl) numEl.textContent = `p. ${curSlide}`;
  }

  /* Desktop: two-page spread */
  function renderDesktop() {
    returnAllToContainer();
    const coverView  = document.getElementById('cover-view');
    const spreadView = document.getElementById('spread-view');

    if (curSpread === 0) {
      coverView.classList.add('active');
      spreadView.classList.remove('active');
      return;
    }

    coverView.classList.remove('active');
    spreadView.classList.add('active');

    const spread    = spreads[curSpread];
    const leftSlot  = document.getElementById('left-slot');
    const rightSlot = document.getElementById('right-slot');

    if (spread[0]) {
      spread[0].classList.add('active', 'in-page');
      leftSlot.appendChild(spread[0]);
      playVideos(spread[0]);
    }

    if (spread[1]) {
      spread[1].classList.add('active', 'in-page');
      rightSlot.appendChild(spread[1]);
      playVideos(spread[1]);
    } else {
      rightSlot.innerHTML = '<div class="empty-page-ornament">✦</div>';
    }

    const leftNum  = document.querySelector('.left-num');
    const rightNum = document.querySelector('.right-num');
    if (leftNum)  leftNum.textContent  = `p. ${(curSpread - 1) * 2 + 1}`;
    if (rightNum) rightNum.textContent = spread[1] ? `p. ${(curSpread - 1) * 2 + 2}` : '';

    document.getElementById('page-left').scrollTop  = 0;
    document.getElementById('page-right').scrollTop = 0;
  }

  /* Move all in-page slides back to #swipe-container */
  function returnAllToContainer() {
    const container = document.getElementById('swipe-container');
    if (!container) return;
    document.querySelectorAll('.slide.in-page').forEach(s => {
      s.classList.remove('active', 'in-page');
      container.appendChild(s);
      s.querySelectorAll('video').forEach(v => v.pause());
    });
    // Clear any empty-page ornament
    const rs = document.getElementById('right-slot');
    if (rs) rs.querySelector('.empty-page-ornament')?.remove();
  }

  function playVideos(slide) {
    slide.querySelectorAll('video').forEach(v => {
      v.currentTime = 0;
      v.play().catch(() => {});
    });
  }

  /* ── Navigation ────────────────────────────────────────────── */
  function next() {
    if (isMobile()) {
      if (curSlide < slides.length - 1) { curSlide++; render(); }
    } else {
      if (curSpread < spreads.length - 1) {
        curSpread++;
        curSlide = spreadToFirstSlide(curSpread);
        render();
      }
    }
  }

  function prev() {
    if (isMobile()) {
      if (curSlide > 0) { curSlide--; render(); }
    } else {
      if (curSpread > 0) {
        curSpread--;
        curSlide = spreadToFirstSlide(curSpread);
        render();
      }
    }
  }

  function goTo(slideIndex) {
    if (slideIndex < 0 || slideIndex >= slides.length) return;
    if (isMobile()) {
      curSlide = slideIndex;
    } else {
      curSpread = slideIndexToSpread(slideIndex);
      curSlide  = slideIndex;
    }
    render();
  }

  /* ── Progress & Counter ────────────────────────────────────── */
  function updateProgress() {
    const fill  = document.getElementById('progress-fill');
    if (!fill) return;
    const total = slides.length - 1;
    const idx   = isMobile() ? curSlide : spreadToFirstSlide(curSpread);
    fill.style.width = (total > 0 ? (idx / total) * 100 : 100) + '%';
  }

  function updateCounter() {
    const el = document.getElementById('top-indicator');
    if (!el) return;
    if (isMobile()) {
      el.textContent = curSlide === 0 ? 'Cover' : `${curSlide} / ${slides.length - 1}`;
    } else {
      if (curSpread === 0) {
        el.textContent = 'Cover';
      } else {
        const sp    = spreads[curSpread];
        const left  = (curSpread - 1) * 2 + 1;
        const right = sp[1] ? (curSpread - 1) * 2 + 2 : null;
        el.textContent = right ? `${left}–${right} / ${slides.length - 1}` : `${left} / ${slides.length - 1}`;
      }
    }
  }

  function setupNavButtons() {
    document.getElementById('prev-page')?.addEventListener('click', prev);
    document.getElementById('next-page')?.addEventListener('click', next);
  }

  function updateNavButtons() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const atStart = isMobile() ? curSlide === 0                    : curSpread === 0;
    const atEnd   = isMobile() ? curSlide >= slides.length - 1     : curSpread >= spreads.length - 1;
    if (prevBtn) prevBtn.disabled = atStart;
    if (nextBtn) nextBtn.disabled = atEnd;
  }

  /* ── Build Book DOM ────────────────────────────────────────── */
  function buildBookDOM() {
    // Hide original container
    const story = document.getElementById('story');
    if (story) story.style.display = 'none';

    const frame = mk('div', { id: 'book-frame' });

    /* ---- Cover ---- */
    const coverView = mk('div', { id: 'cover-view' });
    const cover     = mk('div', { id: 'book-cover' });
    cover.innerHTML = buildCoverHTML();
    coverView.appendChild(cover);
    frame.appendChild(coverView);

    // Move the audio button from #header into the cover's music area
    const headerSlide = document.getElementById('header');
    if (headerSlide) {
      const audioBtn   = headerSlide.querySelector('.text-to-sound');
      const musicArea  = cover.querySelector('.cover-music-area');
      if (audioBtn && musicArea) musicArea.appendChild(audioBtn);
    }

    // Click anywhere on cover = open first spread
    cover.addEventListener('click', e => {
      if (!e.target.closest('.text-to-sound')) next();
    });

    /* ---- Open book spread ---- */
    const spreadView = mk('div', { id: 'spread-view' });
    const openBook   = mk('div', { id: 'open-book' });

    // Left page
    const pageLeft = mk('div', { id: 'page-left',  class: 'book-page page-left'  });
    const leftSlot = mk('div', { id: 'left-slot',  class: 'page-slot' });
    const leftNum  = mk('div', { class: 'page-num left-num' });
    pageLeft.appendChild(leftSlot);
    pageLeft.appendChild(leftNum);

    // Spine
    const spine = mk('div', { class: 'book-spine' });
    spine.innerHTML = '<div class="spine-ornament">Stella · A Disney Fairytale</div>';

    // Right page
    const pageRight = mk('div', { id: 'page-right', class: 'book-page page-right' });
    const rightSlot = mk('div', { id: 'right-slot', class: 'page-slot' });
    const rightNum  = mk('div', { class: 'page-num right-num' });
    pageRight.appendChild(rightSlot);
    pageRight.appendChild(rightNum);

    openBook.appendChild(pageLeft);
    openBook.appendChild(spine);
    openBook.appendChild(pageRight);
    spreadView.appendChild(openBook);
    frame.appendChild(spreadView);

    document.body.appendChild(frame);
  }

  /* ── Cover HTML ────────────────────────────────────────────── */
  function buildCoverHTML() {
    return `
      <div class="cover-frame-outer"></div>
      <div class="cover-frame-inner"></div>
      <div class="cover-corner tl">❧</div>
      <div class="cover-corner tr">❧</div>
      <div class="cover-corner bl">❧</div>
      <div class="cover-corner br">❧</div>
      <div class="cover-star-field" aria-hidden="true">${generateCoverStars(30)}</div>
      <div class="cover-body">
        <div class="cover-eyebrow">Once upon a time…</div>
        <div class="cover-divider"></div>
        <div class="cover-title-main">Happy 25th Birthday</div>
        <div class="cover-name">Stella</div>
        <div class="cover-divider"></div>
        <div class="cover-subtitle">✦ A Disney Fairytale ✦</div>
        <div class="cover-music-area"></div>
      </div>
      <div class="cover-castle-wrap" aria-hidden="true">${buildCastleSVG()}</div>
      <div class="cover-open-hint">✦ open the book ✦</div>
    `;
  }

  function generateCoverStars(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      const x = (Math.random() * 80 + 5).toFixed(1);
      const y = (Math.random() * 72 + 4).toFixed(1);
      const s = (Math.random() * 0.45 + 0.22).toFixed(2);
      const d = (Math.random() * 3.5).toFixed(1);
      html += `<span class="c-star" style="left:${x}%;top:${y}%;width:${s}em;height:${s}em;animation-delay:${d}s"></span>`;
    }
    return html;
  }

  function buildCastleSVG() {
    /* Disney-style multi-tower castle silhouette */
    return `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg" fill="rgba(201,160,48,0.32)">
      <!-- Far-left tower -->
      <rect x="10" y="82" width="22" height="38"/>
      <rect x="8"  y="74" width="5"  height="9"/>
      <rect x="15" y="74" width="5"  height="9"/>
      <rect x="22" y="74" width="5"  height="9"/>
      <polygon points="21,50 10,82 32,82"/>
      <!-- Left-mid tower -->
      <rect x="40" y="65" width="28" height="55"/>
      <rect x="38" y="57" width="5"  height="9"/>
      <rect x="45" y="57" width="5"  height="9"/>
      <rect x="52" y="57" width="5"  height="9"/>
      <rect x="59" y="57" width="5"  height="9"/>
      <polygon points="54,30 40,65 68,65"/>
      <!-- Left connecting wall -->
      <rect x="68" y="88" width="22" height="32"/>
      <!-- Left-inner tower -->
      <rect x="90" y="52" width="32" height="68"/>
      <rect x="88" y="43" width="5"  height="10"/>
      <rect x="95" y="43" width="5"  height="10"/>
      <rect x="102" y="43" width="5" height="10"/>
      <rect x="109" y="43" width="5" height="10"/>
      <rect x="116" y="43" width="5" height="10"/>
      <polygon points="106,13 90,52 122,52"/>
      <!-- Centre main tower (tallest) -->
      <rect x="126" y="33" width="28" height="87"/>
      <rect x="124" y="23" width="5"  height="11"/>
      <rect x="131" y="23" width="5"  height="11"/>
      <rect x="138" y="23" width="5"  height="11"/>
      <rect x="145" y="23" width="5"  height="11"/>
      <polygon points="140,0 126,33 154,33"/>
      <!-- Right-inner tower -->
      <rect x="158" y="52" width="32" height="68"/>
      <rect x="158" y="43" width="5"  height="10"/>
      <rect x="165" y="43" width="5"  height="10"/>
      <rect x="172" y="43" width="5"  height="10"/>
      <rect x="179" y="43" width="5"  height="10"/>
      <rect x="186" y="43" width="5"  height="10"/>
      <polygon points="174,13 158,52 190,52"/>
      <!-- Right connecting wall -->
      <rect x="190" y="88" width="20" height="32"/>
      <!-- Right-mid tower -->
      <rect x="212" y="65" width="28" height="55"/>
      <rect x="212" y="57" width="5"  height="9"/>
      <rect x="219" y="57" width="5"  height="9"/>
      <rect x="226" y="57" width="5"  height="9"/>
      <rect x="233" y="57" width="5"  height="9"/>
      <polygon points="226,30 212,65 240,65"/>
      <!-- Far-right tower -->
      <rect x="248" y="82" width="22" height="38"/>
      <rect x="248" y="74" width="5"  height="9"/>
      <rect x="255" y="74" width="5"  height="9"/>
      <rect x="262" y="74" width="5"  height="9"/>
      <polygon points="259,50 248,82 270,82"/>
      <!-- Gate arch -->
      <path d="M133 120 L133 94 Q140 78 147 94 L147 120 Z"/>
      <!-- Windows -->
      <ellipse cx="140" cy="48" rx="4"   ry="5"   fill="rgba(0,0,0,0.22)"/>
      <ellipse cx="106" cy="65" rx="3"   ry="4"   fill="rgba(0,0,0,0.20)"/>
      <ellipse cx="174" cy="65" rx="3"   ry="4"   fill="rgba(0,0,0,0.20)"/>
      <ellipse cx="54"  cy="78" rx="2.5" ry="3.5" fill="rgba(0,0,0,0.18)"/>
      <ellipse cx="226" cy="78" rx="2.5" ry="3.5" fill="rgba(0,0,0,0.18)"/>
      <ellipse cx="21"  cy="92" rx="2"   ry="3"   fill="rgba(0,0,0,0.15)"/>
      <ellipse cx="259" cy="92" rx="2"   ry="3"   fill="rgba(0,0,0,0.15)"/>
      <!-- Tiny flag pennants on spires -->
      <polygon points="140,0 146,4 140,8"  fill="rgba(201,160,48,0.55)"/>
      <polygon points="106,13 112,17 106,21" fill="rgba(201,160,48,0.40)"/>
      <polygon points="174,13 180,17 174,21" fill="rgba(201,160,48,0.40)"/>
    </svg>`;
  }

  /* ── Jump Modal ────────────────────────────────────────────── */
  function setupJumpModal() {
    const modal   = document.getElementById('jump-modal');
    const input   = document.getElementById('jump-input');
    const confirm = document.getElementById('jump-confirm');
    const cancel  = document.getElementById('jump-cancel');
    const counter = document.getElementById('top-indicator');

    // Handle the double-quoted id typo in HTML: id=""jump-total""
    const tot = document.querySelector('[id*="jump-total"]');
    if (tot) tot.textContent = slides.length - 1;

    if (counter) {
      counter.style.pointerEvents = 'auto';
      counter.style.cursor = 'pointer';
      counter.title = 'Click to jump to slide (G)';
      counter.addEventListener('click', openJumpModal);
    }

    confirm?.addEventListener('click', () => {
      const val = parseInt(input?.value, 10);
      if (!isNaN(val) && val >= 1 && val <= slides.length - 1) {
        goTo(val); // val is 1-indexed: slide #1 = slides[1]
        closeJumpModal();
      } else {
        shakeEl(input);
      }
    });

    cancel?.addEventListener('click', closeJumpModal);
    modal?.addEventListener('click', e => { if (e.target === modal) closeJumpModal(); });
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirm?.click();
      if (e.key === 'Escape') closeJumpModal();
    });
  }

  function openJumpModal() {
    const modal = document.getElementById('jump-modal');
    const input = document.getElementById('jump-input');
    if (modal) {
      modal.style.display = 'flex';
      input && (input.value = '');
      requestAnimationFrame(() => input?.focus());
    }
  }

  function closeJumpModal() {
    const m = document.getElementById('jump-modal');
    if (m) m.style.display = 'none';
  }

  /* ── Nav Panel ─────────────────────────────────────────────── */
  function buildNavPanel() {
    const overlay = mk('div', { id: 'nav-overlay' });
    overlay.addEventListener('click', closeNavPanel);
    document.body.appendChild(overlay);

    const toggle = mk('button', { id: 'nav-toggle', 'aria-label': 'Open navigation', title: 'Navigation (N)' });
    toggle.innerHTML = '<span class="nav-toggle-icon">📖</span>';
    toggle.addEventListener('click', toggleNavPanel);
    document.body.appendChild(toggle);

    const panel = mk('aside', { id: 'nav-panel', 'aria-hidden': 'true' });

    // Header
    const header = mk('div', { class: 'np-header' });
    header.innerHTML = `<span class="np-title">✦ Story Navigation ✦</span><button id="nav-close" class="np-close" aria-label="Close">✕</button>`;
    panel.appendChild(header);
    header.querySelector('#nav-close').addEventListener('click', closeNavPanel);

    // Chapters
    const chapSec = mk('section', { class: 'np-section' });
    chapSec.innerHTML = '<h4 class="np-section-title">⚡ Jump to Chapter</h4>';
    const chapList = mk('ul', { class: 'np-chapter-list' });
    CHAPTERS.forEach(ch => {
      const el = document.getElementById(ch.id);
      const si = el ? slides.indexOf(el) : -1;
      if (si === -1) return;
      const li  = mk('li');
      const btn = mk('button', { class: 'np-chapter-btn', 'data-si': si });
      btn.innerHTML = `${ch.icon} ${ch.label}<span class="np-chapter-num">${si === 0 ? 'Cover' : '#' + si}</span>`;
      btn.addEventListener('click', () => { goTo(si); closeNavPanel(); });
      li.appendChild(btn); chapList.appendChild(li);
    });
    chapSec.appendChild(chapList);
    panel.appendChild(chapSec);

    // Search
    const searchSec = mk('section', { class: 'np-section' });
    searchSec.innerHTML = '<h4 class="np-section-title">🔍 Search Slides</h4>';
    const searchInput = mk('input', { type: 'search', id: 'np-search', class: 'np-search', placeholder: 'Type heading or slide #…', autocomplete: 'off' });
    searchSec.appendChild(searchInput);
    panel.appendChild(searchSec);

    // All slides
    const allSec = mk('section', { class: 'np-section np-slides-section' });
    allSec.innerHTML = `<h4 class="np-section-title">📄 All Slides <span class="np-total">${slides.length - 1} pages</span></h4>`;
    const slideList = mk('ul', { class: 'np-slide-list', id: 'np-slide-list' });

    slides.forEach((slide, i) => {
      const h    = slide.querySelector('h1, h2');
      const raw  = h ? h.textContent.trim().replace(/\s+/g, ' ') : '';
      const lbl  = raw.slice(0, 55) + (raw.length > 55 ? '…' : '');
      const li   = mk('li', { class: 'np-slide-item' });
      const btn  = mk('button', { class: 'np-slide-btn', 'data-si': i });
      btn.innerHTML = `<span class="np-slide-num">${i === 0 ? '🏰' : i}</span><span class="np-slide-label">${lbl || '…'}</span>`;
      btn.addEventListener('click', () => { goTo(i); closeNavPanel(); });
      li.appendChild(btn); slideList.appendChild(li);
    });

    allSec.appendChild(slideList);
    panel.appendChild(allSec);
    document.body.appendChild(panel);

    // Live search
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      slideList.querySelectorAll('.np-slide-item').forEach((li, i) => {
        const lbl = li.querySelector('.np-slide-label')?.textContent.toLowerCase() || '';
        li.hidden = q ? !(lbl.includes(q) || String(i).includes(q)) : false;
      });
    });
  }

  function toggleNavPanel() {
    document.getElementById('nav-panel')?.classList.contains('open') ? closeNavPanel() : openNavPanel();
  }
  function openNavPanel() {
    document.getElementById('nav-panel')?.classList.add('open');
    document.getElementById('nav-overlay')?.classList.add('visible');
    document.getElementById('nav-panel')?.setAttribute('aria-hidden', 'false');
    const icon = document.querySelector('#nav-toggle .nav-toggle-icon');
    if (icon) icon.textContent = '✕';
    syncNavPanel();
  }
  function closeNavPanel() {
    document.getElementById('nav-panel')?.classList.remove('open');
    document.getElementById('nav-overlay')?.classList.remove('visible');
    document.getElementById('nav-panel')?.setAttribute('aria-hidden', 'true');
    const icon = document.querySelector('#nav-toggle .nav-toggle-icon');
    if (icon) icon.textContent = '📖';
  }

  function syncNavPanel() {
    const currentSi = isMobile() ? curSlide : spreadToFirstSlide(curSpread);
    document.querySelectorAll('.np-slide-btn').forEach(btn => {
      const si = parseInt(btn.dataset.si, 10);
      let active = false;
      if (isMobile()) {
        active = si === curSlide;
      } else {
        const sp = spreads[curSpread];
        active = si === currentSi || (sp && sp.includes(slides[si]));
      }
      btn.classList.toggle('active', active);
    });
    if (document.getElementById('nav-panel')?.classList.contains('open')) {
      document.querySelector('.np-slide-btn.active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ── Audio ─────────────────────────────────────────────────── */
  function setupAudio() {
    document.querySelectorAll('.text-to-sound[data-sound]').forEach(btn => {
      let audio = null;
      btn.addEventListener('click', e => {
        e.stopPropagation(); // prevent cover's click-to-open

        // Stop whichever was playing
        if (currentAudio && playingBtn !== btn) {
          currentAudio.pause(); currentAudio.currentTime = 0;
          playingBtn?.classList.remove('playing');
          currentAudio = null; playingBtn = null;
        }

        if (!audio) {
          audio = new Audio(btn.dataset.sound);
          audio.addEventListener('ended', () => {
            btn.classList.remove('playing');
            if (currentAudio === audio) { currentAudio = null; playingBtn = null; }
          });
        }

        if (btn.classList.contains('playing')) {
          audio.pause(); audio.currentTime = 0; btn.classList.remove('playing');
          currentAudio = null; playingBtn = null;
        } else {
          audio.play()
            .then(() => { btn.classList.add('playing'); currentAudio = audio; playingBtn = btn; })
            .catch(() => {});
        }
      });
    });
  }

  /* ── Spoilers ───────────────────────────────────────────────── */
  function setupSpoilers() {
    document.querySelectorAll('.peek-hint').forEach(btn => {
      btn.dataset.revealed = 'false';
      btn.addEventListener('click', () => {
        btn.dataset.revealed = btn.dataset.revealed === 'true' ? 'false' : 'true';
      });
    });
  }

  /* ── Swipe ─────────────────────────────────────────────────── */
  function setupSwipe() {
    let x0 = 0, y0 = 0, t0 = 0;
    const root = document.body;
    root.addEventListener('touchstart', e => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
    }, { passive: true });
    root.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      const dt = Date.now() - t0;
      if (dt < 420 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        dx < 0 ? next() : prev();
      }
    }, { passive: true });
  }

  /* ── Keyboard ───────────────────────────────────────────────── */
  function setupKeyboard() {
    document.addEventListener('keydown', e => {
      const typing    = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
      const modalOpen = document.getElementById('jump-modal')?.style.display !== 'none';
      const navOpen   = document.getElementById('nav-panel')?.classList.contains('open');
      if (typing) return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown':
          if (!modalOpen) { e.preventDefault(); next(); } break;
        case 'ArrowLeft': case 'ArrowUp':
          if (!modalOpen) { e.preventDefault(); prev(); } break;
        case 'Escape':
          modalOpen ? closeJumpModal() : navOpen ? closeNavPanel() : null; break;
        case 'g': case 'G': if (!navOpen) openJumpModal(); break;
        case 'n': case 'N': toggleNavPanel(); break;
        case 'Home': e.preventDefault(); goTo(0); break;
        case 'End':  e.preventDefault(); goTo(slides.length - 1); break;
      }
    });
  }

  /* ── Dynamic styles (injected to avoid extra HTTP request) ─── */
  function injectDynamicStyles() {
    const s = document.createElement('style');
    s.textContent = `
/* ── Shake animation ── */
@keyframes sbShake {
  0%,100%{ transform: translateX(0); }
  20%    { transform: translateX(-7px); }
  40%    { transform: translateX(7px); }
  60%    { transform: translateX(-5px); }
  80%    { transform: translateX(5px); }
}

/* ── Spoilers ── */
.peek-hint[data-revealed="false"] {
  color: transparent !important;
  text-shadow: 0 0 8px rgba(240,192,80,.85) !important;
  user-select: none;
}
.peek-hint[data-revealed="false"] * {
  color: transparent !important;
}
.peek-hint[data-revealed="false"]::after {
  content: '✨ spoiler — tap to reveal ✨';
  display: block;
  font-size: .72rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 1.8px;
  color: #F0C050 !important; text-shadow: none !important;
}
.peek-hint[data-revealed="true"] {
  animation: spoilerReveal .3s ease both;
}
@keyframes spoilerReveal {
  from { opacity: .4; transform: scale(.97); }
  to   { opacity: 1;  transform: scale(1);   }
}

/* ── Playing audio ── */
.text-to-sound.playing {
  background: linear-gradient(180deg,#FFF3D0 0%,#F5D878 40%,#E8B830 100%) !important;
  border-color: #A07010 !important;
  box-shadow: 0 2px 0 #6A4800, 0 4px 16px rgba(201,160,48,.5), 0 0 20px rgba(255,200,40,.35), inset 0 1px 0 rgba(255,255,255,.9) !important;
}
.text-to-sound.playing::after {
  content: '';
  position: absolute; inset: 0; border-radius: inherit;
  background: repeating-linear-gradient(90deg,rgba(255,200,40,0) 0px,rgba(255,200,40,.18) 2px,rgba(255,200,40,0) 4px);
  background-size: 8px 100%;
  animation: soundWave .6s linear infinite;
  pointer-events: none;
}
@keyframes soundWave { to { background-position: 8px 0; } }

/* ── Nav overlay ── */
#nav-overlay {
  display: none; position: fixed; inset: 0; z-index: 900;
  background: rgba(4,1,16,.55); backdrop-filter: blur(4px);
  opacity: 0; transition: opacity .3s ease;
}
#nav-overlay.visible { display: block; opacity: 1; }

/* ── Nav toggle button ── */
#nav-toggle {
  position: fixed; bottom: 24px; right: 18px; z-index: 1100;
  width: 52px; height: 52px; border-radius: 50%;
  border: 2px solid rgba(201,160,48,.55); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.35rem; line-height: 1;
  background: linear-gradient(145deg, #1E0848, #2D1060);
  color: #F0C050;
  box-shadow: 0 4px 20px rgba(0,0,0,.55), 0 0 16px rgba(201,160,48,.20);
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease;
  backdrop-filter: blur(8px);
}
#nav-toggle:hover { transform: scale(1.1) rotate(-5deg); border-color: rgba(201,160,48,.85); }
#nav-toggle:active { transform: scale(.94); }

/* ── Nav panel ── */
#nav-panel {
  position: fixed; top: 0; right: -340px; bottom: 0;
  width: 320px; max-width: 88vw; z-index: 1000;
  display: flex; flex-direction: column; overflow: hidden;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(140,95,40,.05) 28px,rgba(140,95,40,.05) 29px),
    radial-gradient(ellipse at 10% 5%,rgba(200,155,70,.18) 0%,transparent 50%),
    linear-gradient(165deg,#FAF0D8,#F2E4BC 55%,#EBD5A0);
  border-left: 4px solid #E5CFA0;
  outline: 2px solid rgba(201,160,48,.38); outline-offset: -10px;
  box-shadow: -8px 0 60px rgba(0,0,0,.55);
  transition: right .38s cubic-bezier(.22,.85,.32,1);
}
#nav-panel.open { right: 0; }
#nav-panel::after {
  content: '← → keys · G to jump · N for nav';
  position: sticky; bottom: 0; display: block;
  padding: 8px 12px;
  font-family: 'Nunito',sans-serif; font-size: .6rem; font-weight: 700;
  letter-spacing: .5px; color: rgba(90,48,8,.42); text-align: center;
  background: linear-gradient(0deg,rgba(245,230,185,.98) 60%,transparent);
  pointer-events: none;
}

.np-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1.5px solid rgba(201,160,48,.38);
  background: linear-gradient(180deg,rgba(255,255,255,.25),transparent);
  flex-shrink: 0;
}
.np-title { font-family:'Marck Script',cursive; font-size:1.2rem; color:#5A3008; }
.np-close {
  width:30px; height:30px; border-radius:50%;
  border:1.5px solid rgba(201,160,48,.38);
  background:rgba(255,255,255,.38); color:#5A3008;
  font-size:.85rem; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .18s ease;
}
.np-close:hover { background:rgba(255,255,255,.7); }

#nav-panel > section:last-child { flex:1; min-height:0; display:flex; flex-direction:column; }

.np-section { padding:14px 16px; border-bottom:1px dashed rgba(201,160,48,.28); flex-shrink:0; }
.np-slides-section { flex:1; min-height:0; display:flex; flex-direction:column; border-bottom:none; }

.np-section-title {
  font-family:'Nunito',sans-serif; font-size:.66rem; font-weight:800;
  letter-spacing:2.5px; text-transform:uppercase; color:rgba(90,48,8,.62);
  margin-bottom:10px;
}
.np-total { font-weight:600; font-size:.64rem; color:rgba(90,48,8,.42); letter-spacing:1px; text-transform:none; margin-left:6px; }

.np-chapter-list { list-style:none; display:flex; flex-direction:column; gap:5px; }
.np-chapter-btn {
  width:100%; display:flex; align-items:center; justify-content:space-between;
  font-family:'Nunito',sans-serif; font-size:.88rem; font-weight:700; color:#3A1F0D;
  background:linear-gradient(135deg,rgba(255,255,255,.5),rgba(245,225,170,.42));
  border:1.5px solid rgba(201,160,48,.32); border-radius:8px;
  padding:8px 12px; cursor:pointer; text-align:left;
  transition:all .18s ease;
}
.np-chapter-btn:hover { background:linear-gradient(135deg,rgba(255,255,255,.75),rgba(245,220,150,.7)); border-color:rgba(201,160,48,.65); transform:translateX(3px); }
.np-chapter-num { font-size:.7rem; font-weight:800; color:rgba(90,48,8,.48); flex-shrink:0; margin-left:8px; }

.np-search {
  display:block; width:100%; padding:9px 12px;
  font-family:'Nunito',sans-serif; font-size:.88rem; font-weight:600; color:#3A1F0D;
  background:rgba(255,255,255,.55);
  border:1.5px solid rgba(201,160,48,.38); border-radius:8px;
  outline:none; transition:border-color .2s,box-shadow .2s;
}
.np-search:focus { border-color:rgba(201,160,48,.75); box-shadow:0 0 0 3px rgba(201,160,48,.18); }
.np-search::placeholder { color:rgba(90,48,8,.38); }

.np-slide-list {
  list-style:none; flex:1; overflow-y:auto; padding:4px 0 80px;
  scrollbar-width:thin; scrollbar-color:rgba(201,160,48,.38) transparent;
}
.np-slide-list::-webkit-scrollbar { width:4px; }
.np-slide-list::-webkit-scrollbar-thumb { background:rgba(201,160,48,.38); border-radius:4px; }
.np-slide-item[hidden] { display:none; }

.np-slide-btn {
  width:100%; display:flex; align-items:flex-start; gap:10px;
  padding:7px 14px 7px 10px; background:transparent; border:none;
  border-radius:6px; cursor:pointer; text-align:left;
  transition:background .15s ease;
}
.np-slide-btn:hover { background:rgba(201,160,48,.12); }
.np-slide-btn.active {
  background:linear-gradient(135deg,rgba(201,160,48,.22),rgba(245,220,150,.25));
  border-left:3px solid rgba(201,160,48,.72); padding-left:7px;
}
.np-slide-num {
  flex-shrink:0; font-family:'Nunito',sans-serif; font-size:.7rem; font-weight:800;
  color:rgba(90,48,8,.42); line-height:1.6; min-width:28px; text-align:right;
}
.np-slide-btn.active .np-slide-num { color:rgba(90,48,8,.72); }
.np-slide-label { font-family:'Nunito',sans-serif; font-size:.82rem; font-weight:600; color:#4A2A14; line-height:1.4; }
.np-slide-btn.active .np-slide-label { font-weight:700; color:#2E1408; }

@media (max-width:480px) {
  #nav-panel { width:290px; }
  #nav-toggle { bottom:16px; right:14px; width:46px; height:46px; font-size:1.2rem; }
}
    `;
    document.head.appendChild(s);
  }

})();
