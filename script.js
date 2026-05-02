/* ================================================================
   DISNEY FAIRYTALE STORYBOOK  —  script.js
   Two-page spread · Disney book cover · Enchanted night sky
   ================================================================ */

(function () {
  'use strict';

  const BOOKMARK_KEY    = 'stella_bday_bookmark';
  const UNLOCKED_KEY    = 'stella_bday_unlocked';

  /* ── State ─────────────────────────────────────────────────── */
  let allSlides   = [];   // every .slide.gift-article element in the document
  let slides      = [];   // active slide set for the current viewport
  let spreads     = [];   // [[cover], [s1,s2], [s3,s4], ...]
  let chapters    = [];   // rhythm markers derived from "Almost..." pages
  let curSpread   = 0;    // desktop: current spread index
  let curSlide    = 0;    // mobile:  current slide index (0 = cover)
  let currentAudio = null;
  let playingBtn   = null;
  let navDirection = 'forward';
  const MOBILE_SEQUENTIAL_SKIP_SLIDES = new Set([2, 3]);
  const _bgTracks = {
    dance: { audio: null, src: 'assets/music/put your head on my shoulder.mp3', vol: 0.35 },
  };
  let _pageTurnAudio  = null;
  let _ambientStarted = false;

  function hasUnlockedStory() {
    return localStorage.getItem(UNLOCKED_KEY) === '1';
  }

  function markUnlocked() {
    if (hasUnlockedStory()) return;
    localStorage.setItem(UNLOCKED_KEY, '1');
    document.body.classList.remove('story-locked');
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  const isMobile = () => window.innerWidth < 640;

  function getSlidesForViewport() {
    const mobile = isMobile();
    return allSlides.filter(slide => {
      if (mobile) return !slide.classList.contains('desktop-only-slide');
      return !slide.classList.contains('mobile-only-slide');
    });
  }

  function refreshSlidesForViewport() {
    slides = getSlidesForViewport();
    buildSpreads();
    buildChapters();
    buildContentsPages();
  }

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

  // Utility: Get current slide index
  function getCurrentSlideIndex() {
    return isMobile() ? curSlide : spreadToFirstSlide(curSpread);
  }

  function getSlideHeading(slide) {
    const h = slide?.querySelector('h1, h2');
    return h ? h.textContent.trim().replace(/\s+/g, ' ') : '';
  }

  function nextMobileSlideIndex(fromIndex) {
    let nextIndex = Math.min(fromIndex + 1, slides.length - 1);
    while (nextIndex < slides.length - 1 && MOBILE_SEQUENTIAL_SKIP_SLIDES.has(nextIndex)) nextIndex++;
    return nextIndex;
  }

  function prevMobileSlideIndex(fromIndex) {
    let prevIndex = Math.max(fromIndex - 1, 0);
    while (prevIndex > 0 && MOBILE_SEQUENTIAL_SKIP_SLIDES.has(prevIndex)) prevIndex--;
    return prevIndex;
  }

  function buildChapters() {
    chapters = slides
      .map((slide, index) => ({ slide, index, title: getSlideHeading(slide) }))
      .filter(({ index, title }) => index > 0 && /^Almost\b/i.test(title) && !/^Almost like\b/i.test(title))
      .map((chapter, idx) => ({ ...chapter, number: idx + 1 }));

    chapters.forEach(({ slide, number }) => {
      slide.classList.add('chapter-page');
      slide.dataset.chapter = String(number);
    });
  }

  function formatContentsTitle(title) {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[.!?]+$/g, '')
      .trim();
  }

  function setContentsListStart(list, start) {
    list.start = start;
    list.style.counterReset = `contents ${start - 1}`;
  }

  function fillContentsPage(slide, entries, startNumber) {
    const list = slide.querySelector('.contents-list');
    if (!list) return;
    list.replaceChildren();
    setContentsListStart(list, startNumber);

    entries.forEach(({ title, page }) => {
      const item = document.createElement('li');
      const titleSpan = document.createElement('span');
      const pageSpan = document.createElement('span');
      titleSpan.textContent = title;
      pageSpan.textContent = String(page);
      item.append(titleSpan, pageSpan);
      list.appendChild(item);
    });
  }

  function buildContentsPages() {
    const contentsPages = slides.filter(slide => slide.classList.contains('contents-page'));
    if (!contentsPages.length) return;

    const entries = chapters.map(({ title, index }) => ({
      title: formatContentsTitle(title),
      page: index,
    }));

    if (contentsPages.length === 1) {
      fillContentsPage(contentsPages[0], entries, 1);
      return;
    }

    const perPage = Math.ceil(entries.length / contentsPages.length);
    contentsPages.forEach((slide, pageIndex) => {
      const start = pageIndex * perPage;
      fillContentsPage(slide, entries.slice(start, start + perPage), start + 1);
    });
  }

  function getCurrentChapter() {
    const idx = isMobile()
      ? curSlide
      : (spreads[curSpread] || []).reduce((max, slide) => Math.max(max, slides.indexOf(slide)), getCurrentSlideIndex());
    let current = null;
    chapters.forEach(chapter => {
      if (chapter.index <= idx) current = chapter;
    });
    return current;
  }

  // Utility: Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /* ── Init ──────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    allSlides = Array.from(document.querySelectorAll('.slide.gift-article'));
    if (!allSlides.length) return;

    refreshSlidesForViewport();
    injectDynamicStyles();
    buildBookDOM();
    setupAriaLabels();
    setupSpoilers();
    setupAudio();
    setupSwipe();
    setupKeyboard();
    setupNavButtons();
    setupCoverKeyTracker();
    setupJumpModal();
    setupHelpModal();
    buildNavPanel();
    setupToastContainer();
    setupSwipeHints();
    setupBookmark();
    setupHelpFab();

    if (!hasUnlockedStory()) document.body.classList.add('story-locked');
    else document.body.classList.remove('story-locked');

    // Pause / resume background tracks when the tab is hidden or shown
    document.addEventListener('visibilitychange', () => {
      Object.values(_bgTracks).forEach(t => {
        if (!t.audio) return;
        document.hidden ? t.audio.pause() : t.audio.play().catch(() => {});
      });
    });

    // Start at cover
    curSpread = 0; curSlide = 0;
    render(false);

    let wasMobile = isMobile();
    window.addEventListener('resize', debounce(() => {
      const nowMobile = isMobile();
      if (nowMobile === wasMobile) return;
      const currentSlide = wasMobile ? slides[curSlide] : slides[spreadToFirstSlide(curSpread)];
      wasMobile = nowMobile;
      returnAllToContainer();
      refreshSlidesForViewport();
      rebuildNavPanel();
      const nextIndex = slides.indexOf(currentSlide);
      curSlide = nextIndex >= 0 ? nextIndex : Math.min(curSlide, slides.length - 1);
      curSpread = slideIndexToSpread(curSlide);
      render(false);
    }, 150));

    if (new URLSearchParams(window.location.search).has('visualAudit')) {
      window.__STELLA_VISUAL_AUDIT__ = {
        count: () => slides.length,
        jump: index => {
          if (index < 0 || index >= slides.length) return false;
          stopCurrentAudio();
          navDirection = index > getCurrentSlideIndex() ? 'forward' : 'backward';
          if (isMobile()) curSlide = index;
          else {
            curSpread = slideIndexToSpread(index);
            curSlide = index;
          }
          render(false);
          return true;
        },
      };
    }
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

  /* ── Auto-generate ARIA labels ─────────────────────────────── */
  function setupAriaLabels() {
    // Add role="article" to all slide elements for semantic structure
    document.querySelectorAll('.slide.gift-article:not([role])').forEach(slide => {
      slide.setAttribute('role', 'article');
      
      // Add aria-labelledby to associate slide with its heading
      const heading = slide.querySelector('h1, h2');
      if (heading && !heading.id) {
        const headingId = `slide-heading-${Math.random().toString(36).substr(2, 9)}`;
        heading.id = headingId;
        slide.setAttribute('aria-labelledby', headingId);
      }
    });

    // Add aria-labels to text-to-sound buttons that don't have them
    document.querySelectorAll('.text-to-sound:not([aria-label])').forEach(btn => {
      const sound = btn.getAttribute('data-sound');
      if (sound) {
        const fileName = sound.split('/').pop().replace('.mp3', '').replace('.ogg', '');
        btn.setAttribute('aria-label', `Play ${fileName}`);
      }
    });

    document.querySelectorAll('.peek-hint').forEach(btn => updateSpoilerA11y(btn, false));

    // Ensure videos have proper accessibility attributes and lazy loading
    document.querySelectorAll('video.gift-video').forEach(video => {
      if (!video.hasAttribute('aria-hidden')) {
        // Videos are decorative/animated, already described by parent aria-label
        video.setAttribute('aria-hidden', 'true');
      }
      // Add lazy loading for performance
      if (!video.hasAttribute('loading')) {
        video.setAttribute('loading', 'lazy');
      }
    });
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
    updateBookmarkBtn();
    syncNavPanel();
    announceSlide();
    updateAriaCurrent();

  }

  /* Mobile: single page in right slot */
  function renderMobile(animate = true) {
    const coverView  = document.getElementById('cover-view');
    const spreadView = document.getElementById('spread-view');

    if (curSlide === 0) {
      returnAllToContainer();
      coverView.classList.add('active');
      spreadView.classList.remove('active');
      return;
    }

    const incomingSlide = slides[curSlide];
    const useFade = incomingSlide?.dataset.transition === 'fade';

    /* Animate exit of current page before swapping */
    if (animate) {
      const isForward = navDirection === 'forward';
      const exitPage  = document.getElementById('page-right');
      const openBook  = document.getElementById('open-book');
      if (exitPage && openBook) {
        document.querySelectorAll('.page-exit-clone').forEach(c => c.remove());
        const rect     = exitPage.getBoundingClientRect();
        const bookRect = openBook.getBoundingClientRect();
        const clone    = exitPage.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('page-exit-clone');
        clone.style.position = 'absolute';
        clone.style.top      = (rect.top  - bookRect.top)  + 'px';
        clone.style.left     = (rect.left - bookRect.left) + 'px';
        clone.style.width    = rect.width  + 'px';
        clone.style.height   = rect.height + 'px';
        openBook.appendChild(clone);
        requestAnimationFrame(() => {
          clone.classList.add(useFade ? 'exit-fade-out' : (isForward ? 'mobile-exit-forward' : 'mobile-exit-backward'));
        });
        clone.addEventListener('animationend', () => clone.remove(), { once: true });
      }
    }

    returnAllToContainer();
    coverView.classList.remove('active');
    spreadView.classList.add('active');

    const rightSlot = document.getElementById('right-slot');
    const slide = slides[curSlide];
    if (slide) {
      reorderSlideElements(slide);
      slide.classList.add('active', 'in-page');
      rightSlot.appendChild(slide);
      if (useFade) {
        rightSlot.classList.add('page-fade-in');
        rightSlot.addEventListener('animationend', () => rightSlot.classList.remove('page-fade-in'), { once: true });
      }
      playVideos(slide);
    }

    const numEl = document.querySelector('.right-num');
    if (numEl) numEl.textContent = `p. ${curSlide}`;
  }

  /* Desktop: two-page spread */
  function renderDesktop(animate = true) {
    const coverView  = document.getElementById('cover-view');
    const spreadView = document.getElementById('spread-view');

    if (curSpread === 0) {
      returnAllToContainer();
      coverView.classList.add('active');
      spreadView.classList.remove('active');
      return;
    }

    const spread    = spreads[curSpread];
    const useFade   = spread?.some(s => s?.dataset.transition === 'fade');

    /* Animate exit of the old page before swapping content */
    if (animate) {
      const isForward   = navDirection === 'forward';
      const exitPageId  = isForward ? 'page-right' : 'page-left';
      const exitPage    = document.getElementById(exitPageId);
      const openBook    = document.getElementById('open-book');
      if (exitPage && openBook) {
        // Remove any stale clone
        document.querySelectorAll('.page-exit-clone').forEach(c => c.remove());
        const rect     = exitPage.getBoundingClientRect();
        const bookRect = openBook.getBoundingClientRect();
        const clone    = exitPage.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('page-exit-clone');
        clone.style.position = 'absolute';
        clone.style.top      = (rect.top  - bookRect.top)  + 'px';
        clone.style.left     = (rect.left - bookRect.left) + 'px';
        clone.style.width    = rect.width  + 'px';
        clone.style.height   = rect.height + 'px';
        openBook.appendChild(clone);
        requestAnimationFrame(() => {
          clone.classList.add(useFade ? 'exit-fade-out' : (isForward ? 'exit-forward' : 'exit-backward'));

          if (!useFade) {
            // Stationary page flex — mimics spine compression during the turn
            const stationaryId = isForward ? 'page-left' : 'page-right';
            const stationary   = document.getElementById(stationaryId);
            if (stationary) {
              stationary.classList.remove('page-spine-flex', 'flex-left', 'flex-right');
              void stationary.offsetWidth;
              stationary.classList.add('page-spine-flex', isForward ? 'flex-left' : 'flex-right');
              stationary.addEventListener('animationend',
                () => stationary.classList.remove('page-spine-flex', 'flex-left', 'flex-right'),
                { once: true });
            }
          }
        });
        clone.addEventListener('animationend', () => clone.remove(), { once: true });
      }
    }

    returnAllToContainer();
    coverView.classList.remove('active');
    spreadView.classList.add('active');

    const leftSlot  = document.getElementById('left-slot');
    const rightSlot = document.getElementById('right-slot');

    if (spread[0]) {
      reorderSlideElements(spread[0]);
      spread[0].classList.add('active', 'in-page');
      leftSlot.appendChild(spread[0]);
      if (useFade) {
        leftSlot.classList.add('page-fade-in');
        leftSlot.addEventListener('animationend', () => leftSlot.classList.remove('page-fade-in'), { once: true });
      }
      playVideos(spread[0]);
    }

    if (spread[1]) {
      reorderSlideElements(spread[1]);
      spread[1].classList.add('active', 'in-page');
      rightSlot.appendChild(spread[1]);
      if (useFade) {
        rightSlot.classList.add('page-fade-in');
        rightSlot.addEventListener('animationend', () => rightSlot.classList.remove('page-fade-in'), { once: true });
      }
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

  /* Reorder elements within a slide: h2 → video → p/list → audio → spoiler */
  function reorderSlideElements(slide) {
    if (slide.classList.contains('title-page')) return;

    // Get elements - audio inside h2 stays there (part of title)
    const h2 = slide.querySelector('h2');
    const video = slide.querySelector('.gift-img');
    const paragraphs = Array.from(slide.querySelectorAll(':scope > p'));
    const lists = Array.from(slide.querySelectorAll(':scope > ul, :scope > ol'));
    const logo = slide.querySelector('.storybook-logo');
    // Only standalone audio (direct child of slide, not inside h2)
    const standaloneAudios = Array.from(slide.querySelectorAll(':scope > .text-to-sound'));
    const spoilers = Array.from(slide.querySelectorAll(':scope > .peek-hint'));

    // Build ordered array
    const ordered = [];
    if (h2) ordered.push(h2);           // h2 with nested audio stays at top
    if (video) ordered.push(video);     // video second
    paragraphs.forEach(p => ordered.push(p)); // paragraphs third, preserving order
    lists.forEach(list => ordered.push(list)); // contents/list pages stay under their headings
    standaloneAudios.forEach(btn => ordered.push(btn)); // all standalone audio fourth
    spoilers.forEach(btn => ordered.push(btn));         // all spoilers last
    if (logo) ordered.push(logo);       // title-page logo stays last

    // Re-append in order
    ordered.forEach(el => slide.appendChild(el));
  }

  /* Move all in-page slides back to #swipe-container */
  function returnAllToContainer() {
    const container = document.getElementById('swipe-container');
    if (!container) return;
    document.querySelectorAll('#left-slot > .slide.in-page, #right-slot > .slide.in-page').forEach(s => {
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

      if (!v._observed) {
        v._observed = true;

        v.addEventListener('error', () => {
          v.classList.add('video-error');
          v.closest('.gift-img')?.classList.add('video-error');
        });

        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              v.play().catch(() => v.classList.add('video-error'));
            } else {
              v.pause();
            }
          });
        }, { threshold: 0.5 });

        observer.observe(v);
      }
    });
  }

  /* ── Navigation ────────────────────────────────────────────── */
  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      playingBtn?.classList.remove('playing');
      currentAudio = null;
      playingBtn = null;
    }
  }

  function stopBgTrack(key) {
    const t = _bgTracks[key];
    if (!t.audio) return;
    t.audio.pause(); t.audio.currentTime = 0; t.audio = null;
  }

  function startBgTrack(key) {
    const t = _bgTracks[key];
    if (t.audio) return;
    t.audio = new Audio(t.src);
    t.audio.loop = true; t.audio.volume = t.vol;
    t.audio.play().catch(() => {});
  }

  function playPageTurnSound() {
    try {
      if (!_pageTurnAudio) {
        _pageTurnAudio = new Audio('assets/music/page-turn-sound-effect.mp3');
        _pageTurnAudio.volume = 0.35;
      }
      _pageTurnAudio.currentTime = 0;
      _pageTurnAudio.play().catch(() => {});
    } catch (_) {}
  }

  function startAmbient() {
    if (_ambientStarted) return;
    _ambientStarted = true;
    try {
      const ctx        = new (window.AudioContext || window.webkitAudioContext)();
      const seconds    = 30;
      const buf        = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data       = buf.getChannelData(0);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
        b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
        data[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) / 9;
        b6 = w * 0.115926;
      }
      const src  = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lpf  = ctx.createBiquadFilter();
      lpf.type            = 'lowpass';
      lpf.frequency.value = 160;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 4);
      src.connect(lpf); lpf.connect(gain); gain.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  function next(fromLock = false) {
    const onCover = isMobile() ? curSlide === 0 : curSpread === 0;
    if (onCover && !fromLock && !hasUnlockedStory()) return;
    stopCurrentAudio();
    navDirection = 'forward';
    if (isMobile()) {
      if (curSlide < slides.length - 1) {
        const nextIndex = nextMobileSlideIndex(curSlide);
        if (nextIndex !== curSlide) { playPageTurnSound(); startAmbient(); curSlide = nextIndex; render(); }
      }
    } else {
      if (curSpread < spreads.length - 1) {
        playPageTurnSound(); startAmbient();
        curSpread++;
        curSlide = spreadToFirstSlide(curSpread);
        render();
      }
    }
  }

  function prev() {
    stopCurrentAudio();
    navDirection = 'backward';
    if (isMobile()) {
      if (curSlide > 0) {
        const prevIndex = prevMobileSlideIndex(curSlide);
        if (prevIndex !== curSlide) { playPageTurnSound(); startAmbient(); curSlide = prevIndex; render(); }
      }
    } else {
      if (curSpread > 0) {
        playPageTurnSound(); startAmbient();
        curSpread--;
        curSlide = spreadToFirstSlide(curSpread);
        render();
      }
    }
  }

  function goTo(slideIndex) {
    if (slideIndex < 0 || slideIndex >= slides.length) return;
    const currentIdx = getCurrentSlideIndex();
    if (slideIndex === currentIdx) return;
    stopCurrentAudio();
    navDirection = slideIndex > currentIdx ? 'forward' : 'backward';
    playPageTurnSound(); startAmbient();
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
    const bar   = document.getElementById('progress-bar');
    if (!fill || !bar) return;
    const total = slides.length - 1;
    const idx   = getCurrentSlideIndex();
    const percent = total > 0 ? (idx / total) * 100 : 100;
    fill.style.width = percent + '%';
    bar.setAttribute('aria-valuenow', Math.round(percent));
    document.documentElement.style.setProperty('--story-progress', percent.toFixed(2));
    document.documentElement.style.setProperty('--story-progress-pct', `${percent}%`);
  }

  function announceSlide() {
    const announcer = document.getElementById('sr-announcer');
    if (!announcer) return;
    const total = slides.length - 1;
    const idx = getCurrentSlideIndex();
    const message = idx === 0 ? 'Cover page' : `Slide ${idx} of ${total}`;
    announcer.textContent = message;
  }

  function updateAriaCurrent() {
    // Remove aria-current from all slides
    slides.forEach(slide => slide.removeAttribute('aria-current'));
    
    // Add aria-current to active slide(s)
    if (isMobile()) {
      const activeSlide = slides[curSlide];
      if (activeSlide) activeSlide.setAttribute('aria-current', 'page');
    } else {
      const spread = spreads[curSpread];
      if (spread[0]) spread[0].setAttribute('aria-current', 'page');
      if (spread[1]) spread[1].setAttribute('aria-current', 'page');
    }
  }

  function updateCounter() {
    const el = document.getElementById('top-indicator');
    if (!el) return;
    const chapter = getCurrentChapter();
    const chapterHTML = chapter ? `<span class="top-chapter">${chapter.title}</span>` : '';
    if (isMobile()) {
      const count = curSlide === 0 ? 'Cover' : `${curSlide} / ${slides.length - 1}`;
      el.innerHTML = `<span class="top-count">${count}</span>${chapterHTML}`;
    } else {
      if (curSpread === 0) {
        el.innerHTML = '<span class="top-count">Cover</span>';
      } else {
        const sp    = spreads[curSpread];
        const left  = (curSpread - 1) * 2 + 1;
        const right = sp[1] ? (curSpread - 1) * 2 + 2 : null;
        const count = right ? `${left}-${right} / ${slides.length - 1}` : `${left} / ${slides.length - 1}`;
        el.innerHTML = `<span class="top-count">${count}</span>${chapterHTML}`;
      }
    }
  }

  function setupNavButtons() {
    document.getElementById('prev-page')?.addEventListener('click', prev);
    document.getElementById('next-page')?.addEventListener('click', next);
  }

  /* ── Floating key follows cursor on cover ──────────────────── */
  function setupCoverKeyTracker() {
    // Append the key clone directly to <body> so position:fixed works correctly —
    // position:fixed is broken inside CSS-transformed ancestors like #book-cover.
    let floatingKey = document.getElementById('floating-key');
    if (!floatingKey) {
      floatingKey = document.createElement('div');
      floatingKey.id = 'floating-key';
      floatingKey.setAttribute('aria-hidden', 'true');
      floatingKey.innerHTML =
        '<svg viewBox="0 0 20 40" xmlns="http://www.w3.org/2000/svg">' +
          '<line x1="10" y1="2"  x2="10" y2="26" stroke="rgba(201,160,48,.88)" stroke-width="2.2" stroke-linecap="round"/>' +
          '<line x1="10" y1="7"  x2="15" y2="7"  stroke="rgba(201,160,48,.88)" stroke-width="2"   stroke-linecap="round"/>' +
          '<line x1="10" y1="13" x2="14" y2="13" stroke="rgba(201,160,48,.88)" stroke-width="2"   stroke-linecap="round"/>' +
          '<circle cx="10" cy="33" r="6"   fill="none" stroke="rgba(201,160,48,.88)" stroke-width="2.2"/>' +
          '<circle cx="10" cy="33" r="2.4" fill="rgba(201,160,48,.55)"/>' +
        '</svg>';
      document.body.appendChild(floatingKey);
    }

    let raf = 0, mx = window.innerWidth / 2, my = window.innerHeight / 2;
    function setPos() {
      document.documentElement.style.setProperty('--key-x', mx + 'px');
      document.documentElement.style.setProperty('--key-y', my + 'px');
      raf = 0;
    }
    function onMove(e) {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(setPos);
    }
    function onTouch(e) {
      if (e.touches.length) {
        mx = e.touches[0].clientX;
        my = e.touches[0].clientY;
        if (!raf) raf = requestAnimationFrame(setPos);
      }
    }
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('touchmove', onTouch, { passive: true });
    setPos();
  }

  function updateNavButtons() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const atStart = isMobile() ? curSlide === 0                    : curSpread === 0;
    const atEnd   = isMobile() ? curSlide >= slides.length - 1     : curSpread >= spreads.length - 1;
    if (prevBtn) prevBtn.disabled = atStart;
    if (nextBtn) nextBtn.disabled = atEnd;
    document.body.classList.toggle('on-cover', atStart && !hasUnlockedStory());
    if (atStart) {
      document.querySelector('.cover-lock-wrap')?.classList.remove('unlocking');
    }
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

    const lockWrap = cover.querySelector('.cover-lock-wrap');

    // Already unlocked — remove the lock entirely
    if (lockWrap && hasUnlockedStory()) {
      lockWrap.remove();
    }

    // Lock mechanic: only the lock unlocks the book
    function unlockBook(lockWrap) {
      if (lockWrap.classList.contains('unlocking')) return;
      // Swap floating clone out, restore original key so keyInsertAndTurn plays
      const floatingKey = document.getElementById('floating-key');
      if (floatingKey) floatingKey.style.display = 'none';
      const origKey = lockWrap.querySelector('.cover-key-icon');
      if (origKey) origKey.style.visibility = 'visible';
      lockWrap.classList.add('unlocking');
      markUnlocked();
      setTimeout(() => lockWrap?.remove(), 1150);
      setTimeout(() => next(true), 1050);
    }

    if (lockWrap && !hasUnlockedStory()) {
      lockWrap.addEventListener('click', e => {
        e.stopPropagation();
        unlockBook(lockWrap);
      });
      lockWrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          unlockBook(lockWrap);
        }
      });
    }

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
    spine.innerHTML = '<div class="spine-ornament">And then & the End</div>';

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
      <div class="cover-frame-outer" aria-hidden="true"></div>
      <div class="cover-frame-inner" aria-hidden="true"></div>
      <div class="cover-corner tl" aria-hidden="true">❧</div>
      <div class="cover-corner tr" aria-hidden="true">❧</div>
      <div class="cover-corner bl" aria-hidden="true">❧</div>
      <div class="cover-corner br" aria-hidden="true">❧</div>
      <div class="cover-star-field" aria-hidden="true">${generateCoverStars(30)}</div>
      <div class="cover-body">
        <div class="cover-name">Andreas Anagnostou</div>
        <div class="cover-divider"></div>
        <div class="cover-title-main">
          <span>And then</span>
          <span class="cover-title-amp">&amp;</span>
          <span>the End</span>
        </div>
        <div class="cover-divider"></div>
        <img class="cover-storybook-logo" src="assets/images/walt disney logo transparent cropped.png" alt="Walt Disney logo" />
      </div>
      <div class="cover-castle-wrap" aria-hidden="true">${buildCastleSVG()}</div>
      <div class="cover-open-hint" aria-hidden="true">✦ open the book ✦</div>
      <div class="cover-lock-wrap" role="button" tabindex="0" aria-label="Unlock the book" title="Open the book">
        <svg class="cover-lock-icon" viewBox="0 0 44 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" overflow="visible">
          <defs>
            <linearGradient id="claspMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stop-color="rgba(245,205,75,.96)"/>
              <stop offset="45%"  stop-color="rgba(201,160,48,.92)"/>
              <stop offset="100%" stop-color="rgba(125,95,22,.88)"/>
            </linearGradient>
            <linearGradient id="haspMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stop-color="rgba(230,190,60,.95)"/>
              <stop offset="50%"  stop-color="rgba(185,145,38,.88)"/>
              <stop offset="100%" stop-color="rgba(145,110,28,.90)"/>
            </linearGradient>
          </defs>
          <!-- Hasp arm: extends left over cover face, pivots at right end on unlock -->
          <g class="lock-shackle">
            <rect x="-26" y="32" width="32" height="12" rx="3.5"
                  fill="url(#haspMetal)" stroke="rgba(255,220,80,.58)" stroke-width="1"/>
            <ellipse cx="-20" cy="38" rx="7" ry="5.5"
                     fill="url(#haspMetal)" stroke="rgba(255,220,80,.58)" stroke-width="1"/>
            <ellipse cx="-20" cy="38" rx="2.8" ry="2.2" fill="rgba(0,0,0,.32)"/>
          </g>
          <!-- Plate drop shadow -->
          <rect x="5" y="5" width="36" height="72" rx="5.5" fill="rgba(0,0,0,.42)"/>
          <!-- Main clasp plate -->
          <rect x="3" y="3" width="36" height="72" rx="5.5"
                fill="url(#claspMetal)" stroke="rgba(255,225,90,.70)" stroke-width="1.2"/>
          <!-- Inner engraved border -->
          <rect x="7" y="7" width="28" height="64" rx="3.5"
                fill="none" stroke="rgba(255,215,70,.25)" stroke-width=".9"/>
          <!-- Corner rivets -->
          <circle cx="11" cy="12" r="2.5" fill="rgba(255,240,130,.65)" stroke="rgba(130,100,24,.55)" stroke-width=".8"/>
          <circle cx="33" cy="12" r="2.5" fill="rgba(255,240,130,.65)" stroke="rgba(130,100,24,.55)" stroke-width=".8"/>
          <circle cx="11" cy="68" r="2.5" fill="rgba(255,240,130,.65)" stroke="rgba(130,100,24,.55)" stroke-width=".8"/>
          <circle cx="33" cy="68" r="2.5" fill="rgba(255,240,130,.65)" stroke="rgba(130,100,24,.55)" stroke-width=".8"/>
          <!-- Scroll ornaments -->
          <path d="M14 21 Q22 16 30 21" fill="none" stroke="rgba(255,215,70,.50)" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M14 57 Q22 62 30 57" fill="none" stroke="rgba(255,215,70,.50)" stroke-width="1.4" stroke-linecap="round"/>
          <!-- Keyhole escutcheon ring -->
          <circle cx="22" cy="39" r="8.5" fill="rgba(0,0,0,.18)" stroke="rgba(255,215,70,.42)" stroke-width="1.2"/>
          <!-- Keyhole -->
          <circle cx="22" cy="37" r="5" fill="rgba(14,8,32,.90)"/>
          <path d="M19.2 41 H24.8 L23.5 48 Q22 50 20.5 48 Z" fill="rgba(14,8,32,.90)"/>
        </svg>
        <!-- Key: tip at top, ring at bottom — rises up into keyhole on unlock -->
        <svg class="cover-key-icon" viewBox="0 0 20 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <line x1="10" y1="2"  x2="10" y2="26" stroke="rgba(201,160,48,.88)" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="10" y1="7"  x2="15" y2="7"  stroke="rgba(201,160,48,.88)" stroke-width="2"   stroke-linecap="round"/>
          <line x1="10" y1="13" x2="14" y2="13" stroke="rgba(201,160,48,.88)" stroke-width="2"   stroke-linecap="round"/>
          <circle cx="10" cy="33" r="6"   fill="none"                stroke="rgba(201,160,48,.88)" stroke-width="2.2"/>
          <circle cx="10" cy="33" r="2.4" fill="rgba(201,160,48,.55)"/>
        </svg>
      </div>
    `;
  }

  function generateCoverStars(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      const x   = (Math.random() * 80 + 5).toFixed(1);
      const y   = (Math.random() * 72 + 4).toFixed(1);
      const s   = (Math.random() * 0.45 + 0.22).toFixed(2);
      const del = (Math.random() * 4).toFixed(2);
      const dur = (Math.random() * 2.5 + 1.8).toFixed(2); // 1.8–4.3s: each star its own rhythm
      html += `<span class="c-star" style="left:${x}%;top:${y}%;width:${s}em;height:${s}em;animation-delay:${del}s;animation-duration:${dur}s"></span>`;
    }
    return html;
  }

  function buildCastleSVG() {
    /* Disney-style multi-tower castle silhouette */
    return `<svg viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg" fill="rgba(214,173,58,0.46)">
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
      <path d="M133 120 L133 94 Q140 78 147 94 L147 120 Z" fill="rgba(18,10,30,0.34)"/>
      <!-- Windows -->
      <ellipse cx="140" cy="48" rx="4"   ry="5"   fill="rgba(0,0,0,0.22)"/>
      <ellipse cx="106" cy="65" rx="3"   ry="4"   fill="rgba(0,0,0,0.20)"/>
      <ellipse cx="174" cy="65" rx="3"   ry="4"   fill="rgba(0,0,0,0.20)"/>
      <ellipse cx="54"  cy="78" rx="2.5" ry="3.5" fill="rgba(0,0,0,0.18)"/>
      <ellipse cx="226" cy="78" rx="2.5" ry="3.5" fill="rgba(0,0,0,0.18)"/>
      <ellipse cx="21"  cy="92" rx="2"   ry="3"   fill="rgba(0,0,0,0.15)"/>
      <ellipse cx="259" cy="92" rx="2"   ry="3"   fill="rgba(0,0,0,0.15)"/>
      <!-- Tiny flag pennants on spires -->
      <polygon points="140,0 146,4 140,8"  fill="rgba(255,216,92,0.72)"/>
      <polygon points="106,13 112,17 106,21" fill="rgba(255,216,92,0.56)"/>
      <polygon points="174,13 180,17 174,21" fill="rgba(255,216,92,0.56)"/>
    </svg>`;
  }

  /* ── Jump Modal ────────────────────────────────────────────── */
  function setupJumpModal() {
    const modal   = document.getElementById('jump-modal');
    const input   = document.getElementById('jump-input');
    const confirm = document.getElementById('jump-confirm');
    const cancel  = document.getElementById('jump-cancel');
    const counter = document.getElementById('top-indicator');

    const tot = document.getElementById('jump-total');
    if (tot) tot.textContent = slides.length - 1;

    if (counter) {
      counter.style.pointerEvents = 'auto';
      counter.style.cursor = 'pointer';
      counter.title = 'Click to jump to slide (G)';
      counter.addEventListener('click', openJumpModal);
    }

    // Page-number labels at the bottom of each page also open the modal
    document.querySelectorAll('.left-num, .right-num').forEach(el => {
      el.title = 'Click to jump to page (G)';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', openJumpModal);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openJumpModal(); } });
    });

    confirm?.addEventListener('click', () => {
      const val = parseInt(input?.value, 10);
      if (!isNaN(val) && val >= 1 && val <= slides.length - 1) {
        goTo(val); // val is 1-indexed: slide #1 = slides[1]
        closeJumpModal();
        showToast(`Jumped to slide ${val}`, 'success');
      } else {
        shakeEl(input);
        showToast('Invalid slide number', 'error');
      }
    });

    cancel?.addEventListener('click', closeJumpModal);
    modal?.addEventListener('click', e => { if (e.target === modal) closeJumpModal(); });
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirm?.click();
      if (e.key === 'Escape') closeJumpModal();
    });

    // Focus trap: keep Tab cycling within modal while open
    modal?.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const focusable = [input, cancel, confirm].filter(Boolean);
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });
  }

  function openJumpModal() {
    if (document.body.classList.contains('on-cover') || document.body.classList.contains('story-locked')) return;
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

  /* ── Help Modal ─────────────────────────────────────────────── */
  function setupHelpModal() {
    const modal = mk('div', { id: 'help-modal', 'aria-hidden': 'true', role: 'dialog', 'aria-labelledby': 'help-title' });
    modal.innerHTML = `
      <div class="help-content">
        <h2 id="help-title">⌨️ Keyboard Shortcuts</h2>
        <ul class="help-list">
          <li><kbd>←</kbd> <kbd>→</kbd> Navigate slides</li>
          <li><kbd>↑</kbd> <kbd>↓</kbd> Navigate slides</li>
          <li><kbd>Home</kbd> Go to first slide</li>
          <li><kbd>End</kbd> Go to last slide</li>
          <li><kbd>G</kbd> Jump to slide</li>
          <li><kbd>N</kbd> Toggle navigation panel</li>
          <li><kbd>Space</kbd> Play/pause audio</li>
          <li><kbd>M</kbd> Mute/unmute audio</li>
          <li><kbd>S</kbd> Toggle spoiler</li>
          <li><kbd>B</kbd> Bookmark page</li>
          <li><kbd>?</kbd> <kbd>/</kbd> Show this help</li>
          <li><kbd>Esc</kbd> Close modals</li>
        </ul>
        <button id="help-close" class="help-close" aria-label="Close help">✕</button>
      </div>
    `;
    document.body.appendChild(modal);
    
    const close = document.getElementById('help-close');
    close?.addEventListener('click', closeHelpModal);
    modal?.addEventListener('click', e => { if (e.target === modal) closeHelpModal(); });
  }

  function toggleHelpModal() {
    if (document.body.classList.contains('story-locked')) return;
    const modal = document.getElementById('help-modal');
    if (modal?.style.display === 'flex') {
      closeHelpModal();
    } else {
      openHelpModal();
    }
  }

  function openHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
      modal.style.display = 'flex';
      const close = document.getElementById('help-close');
      requestAnimationFrame(() => close?.focus());
    }
  }

  function closeHelpModal() {
    const m = document.getElementById('help-modal');
    if (m) m.style.display = 'none';
  }

  /* ── Bookmark ───────────────────────────────────────────────── */
  function getBookmark() {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (raw === null) return null;
    const idx = parseInt(raw, 10);
    return (!isNaN(idx) && idx > 0 && idx < slides.length) ? idx : null;
  }

  function updateBookmarkBtn() {
    const btn = document.getElementById('bookmark-btn');
    if (!btn) return;
    const saved = getBookmark();
    const cur   = getCurrentSlideIndex();
    const marked = saved !== null && saved === cur;
    btn.classList.toggle('bookmarked', marked);
    btn.setAttribute('aria-label', marked ? 'Remove bookmark' : 'Bookmark this page');
    btn.title = marked ? 'Remove bookmark (B)' : 'Bookmark this page (B)';
  }

  function toggleBookmark() {
    if (document.body.classList.contains('on-cover')) return;
    const idx   = getCurrentSlideIndex();
    const saved = getBookmark();
    if (saved === idx) {
      localStorage.removeItem(BOOKMARK_KEY);
      updateBookmarkBtn();
      showToast('Bookmark removed', 'info');
    } else {
      localStorage.setItem(BOOKMARK_KEY, idx);
      updateBookmarkBtn();
      showToast(`Bookmark saved — page ${idx}`, 'success');
    }
  }

  function showBookmarkPrompt(idx) {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const DURATION = 8000;
    const toast = mk('div', { class: 'toast bookmark-prompt', role: 'alert' });
    toast.innerHTML = `
      <span>🔖</span>
      <span>Continue from page&nbsp;<strong>${idx}</strong>?</span>
      <button class="bookmark-go">Go&nbsp;→</button>
      <button class="bookmark-dismiss" aria-label="Dismiss">✕</button>
      <div class="toast-progress" style="animation-duration:${DURATION}ms"></div>
    `;
    container.appendChild(toast);
    const timer = setTimeout(() => toast.remove(), DURATION);
    toast.querySelector('.bookmark-go').addEventListener('click', () => {
      clearTimeout(timer); toast.remove(); goTo(idx);
    });
    toast.querySelector('.bookmark-dismiss').addEventListener('click', () => {
      clearTimeout(timer); toast.remove();
    });
  }

  function setupBookmark() {
    const btn = document.getElementById('bookmark-btn');
    if (!btn) return;
    btn.addEventListener('click', toggleBookmark);
    const saved = getBookmark();
    if (saved !== null) setTimeout(() => showBookmarkPrompt(saved), 1200);
  }

  function setupHelpFab() {
    document.getElementById('help-fab')?.addEventListener('click', toggleHelpModal);
  }

  /* ── Toast Notifications ─────────────────────────────────────── */
  function setupToastContainer() {
    const container = mk('div', { class: 'toast-container' });
    document.body.appendChild(container);
  }

  function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const toast = mk('div', { class: `toast ${type}` });
    
    let icon = '';
    switch (type) {
      case 'success': icon = '✓'; break;
      case 'error': icon = '✕'; break;
      case 'info': icon = 'ℹ'; break;
    }
    
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Remove toast after animation completes
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /* ── Swipe Hints (Mobile) ─────────────────────────────────────── */
  function setupSwipeHints() {
    if (!isMobile()) return;
    
    const hint = mk('div', { class: 'swipe-hint' });
    hint.innerHTML = `
      <div class="swipe-hint-left">Prev</div>
      <div class="swipe-hint-right">Next</div>
    `;
    document.body.appendChild(hint);
    
    // Hide hints after user navigates
    let hasNavigated = false;
    const hideHints = () => {
      if (!hasNavigated) {
        hint.classList.add('hidden');
        hasNavigated = true;
      }
    };
    
    document.getElementById('prev-page')?.addEventListener('click', hideHints);
    document.getElementById('next-page')?.addEventListener('click', hideHints);
    document.body.addEventListener('touchend', hideHints, { passive: true });
  }

  /* ── Nav Panel ─────────────────────────────────────────────── */
  function buildNavPanel() {
    const overlay = mk('div', { id: 'nav-overlay' });
    overlay.addEventListener('click', closeNavPanel);
    document.body.appendChild(overlay);

    const toggle = mk('button', { id: 'nav-toggle', 'aria-label': 'Open navigation', 'aria-expanded': 'false', title: 'Navigation (N)' });
    toggle.innerHTML = '<span class="nav-toggle-icon">📖</span>';
    toggle.addEventListener('click', () => {
      toggleNavPanel();
      // Remove attention animation after first interaction
      toggle.classList.remove('has-attention');
    });
    document.body.appendChild(toggle);

    // Add first-time attention animation
    const hasVisited = localStorage.getItem('storybook-visited');
    if (!hasVisited) {
      toggle.classList.add('has-attention');
      localStorage.setItem('storybook-visited', 'true');
    }

    const panel = mk('aside', { id: 'nav-panel', 'aria-hidden': 'true' });

    // Header
    const header = mk('div', { class: 'np-header' });
    header.innerHTML = `<span class="np-title">✦ Story Navigation ✦</span><button id="nav-close" class="np-close" aria-label="Close">✕</button>`;
    panel.appendChild(header);
    header.querySelector('#nav-close').addEventListener('click', closeNavPanel);

    // Focus trap: keep Tab cycling within panel while open
    panel.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll('button, input');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });

    // Search
    const searchSec = mk('section', { class: 'np-section' });
    searchSec.innerHTML = '<h4 class="np-section-title">🔍 Search Slides</h4>';
    const searchInput = mk('input', { type: 'search', id: 'np-search', class: 'np-search', placeholder: 'Type heading or slide #…', autocomplete: 'off' });
    searchSec.appendChild(searchInput);
    panel.appendChild(searchSec);

    let chapterList = null;
    if (chapters.length) {
      const chapterSec = mk('section', { class: 'np-section np-chapters-section' });
      chapterSec.innerHTML = `<h4 class="np-section-title">Contents <span class="np-total">${chapters.length} chapters</span></h4>`;
      chapterList = mk('ol', { class: 'np-chapter-list', id: 'np-chapter-list' });

      chapters.forEach(chapter => {
        const li = mk('li', { class: 'np-chapter-item' });
        const btn = mk('button', { class: 'np-chapter-btn', 'data-si': chapter.index });
        btn.innerHTML = `
          <span class="np-chapter-num">${chapter.number}</span>
          <span class="np-chapter-copy">
            <span class="np-chapter-label">${chapter.title}</span>
            <span class="np-chapter-page">page ${chapter.index}</span>
          </span>`;
        btn.addEventListener('click', () => { goTo(chapter.index); closeNavPanel(); });
        li.appendChild(btn);
        chapterList.appendChild(li);
      });

      chapterSec.appendChild(chapterList);
      panel.appendChild(chapterSec);
    }

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
    setupNavHover(toggle, panel);

    // Live search with debouncing
    const debouncedSearch = debounce(() => {
      const q = searchInput.value.trim().toLowerCase();
      let matchCount = 0;
      
      slideList.querySelectorAll('.np-slide-item').forEach((li, i) => {
        const lbl = li.querySelector('.np-slide-label')?.textContent.toLowerCase() || '';
        const matches = q ? (lbl.includes(q) || String(i).includes(q)) : true;
        li.hidden = !matches;
        if (matches && q) matchCount++;
      });

      chapterList?.querySelectorAll('.np-chapter-item').forEach(li => {
        const lbl = li.querySelector('.np-chapter-label')?.textContent.toLowerCase() || '';
        const page = li.querySelector('.np-chapter-btn')?.dataset.si || '';
        li.hidden = q ? !(lbl.includes(q) || page.includes(q)) : false;
      });
      
      // Update result count
      const resultCount = panel.querySelector('.search-result-count');
      if (resultCount) {
        resultCount.textContent = q ? `${matchCount} result${matchCount !== 1 ? 's' : ''}` : '';
      }
    }, 200);
    
    searchInput.addEventListener('input', debouncedSearch);
    
    // Add result count display
    const searchSecHeader = searchSec.querySelector('.np-section-title');
    if (searchSecHeader) {
      const resultCount = mk('span', { class: 'search-result-count' });
      searchSecHeader.appendChild(resultCount);
    }
  }

  function rebuildNavPanel() {
    ['nav-overlay', 'nav-toggle', 'nav-panel'].forEach(id => document.getElementById(id)?.remove());
    buildNavPanel();
  }

  function setupNavHover(toggle, panel) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let closeTimer = null;
    const cancelClose = () => {
      clearTimeout(closeTimer);
      closeTimer = null;
    };
    const scheduleClose = () => {
      cancelClose();
      closeTimer = setTimeout(() => {
        if (!toggle.matches(':hover') && !panel.matches(':hover')) closeNavPanel({ focusToggle: false });
      }, 280);
    };

    toggle.addEventListener('mouseenter', () => {
      if (document.body.classList.contains('story-locked')) return;
      cancelClose();
      openNavPanel({ focusPanel: false });
      toggle.classList.remove('has-attention');
    });
    toggle.addEventListener('mouseleave', scheduleClose);
    panel.addEventListener('mouseenter', cancelClose);
    panel.addEventListener('mouseleave', scheduleClose);
  }

  function toggleNavPanel() {
    if (document.body.classList.contains('story-locked')) return;
    document.getElementById('nav-panel')?.classList.contains('open') ? closeNavPanel() : openNavPanel();
  }
  function openNavPanel({ focusPanel = true } = {}) {
    document.getElementById('nav-panel')?.classList.add('open');
    document.getElementById('nav-overlay')?.classList.add('visible');
    document.getElementById('nav-panel')?.setAttribute('aria-hidden', 'false');
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Close navigation');
      navToggle.classList.remove('has-attention');
    }
    const icon = document.querySelector('#nav-toggle .nav-toggle-icon');
    if (icon) icon.textContent = '✕';
    syncNavPanel();
    
    // Focus first interactive element in panel
    if (focusPanel) {
      const firstFocusable = document.querySelector('#nav-panel button, #nav-panel input');
      if (firstFocusable) {
        requestAnimationFrame(() => firstFocusable.focus());
      }
    }
  }
  function closeNavPanel({ focusToggle = true } = {}) {
    document.getElementById('nav-panel')?.classList.remove('open');
    document.getElementById('nav-overlay')?.classList.remove('visible');
    document.getElementById('nav-panel')?.setAttribute('aria-hidden', 'true');
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) { navToggle.setAttribute('aria-expanded', 'false'); navToggle.setAttribute('aria-label', 'Open navigation'); }
    const icon = document.querySelector('#nav-toggle .nav-toggle-icon');
    if (icon) icon.textContent = '📖';
    
    // Return focus to toggle button
    if (focusToggle) requestAnimationFrame(() => navToggle?.focus());
  }

  function syncNavPanel() {
    const currentSi = getCurrentSlideIndex();
    const currentChapter = getCurrentChapter();
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
    document.querySelectorAll('.np-chapter-btn').forEach(btn => {
      const si = parseInt(btn.dataset.si, 10);
      btn.classList.toggle('active', currentChapter?.index === si);
    });
    if (document.getElementById('nav-panel')?.classList.contains('open')) {
      document.querySelector('.np-slide-btn.active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ── Audio ─────────────────────────────────────────────────── */
  function setupAudio() {
    document.querySelectorAll('.text-to-sound[data-sound]').forEach(btn => {
      btn.setAttribute('aria-pressed', 'false');
      let audio = null;
      let progressEl = null;
      
      btn.addEventListener('click', e => {
        e.stopPropagation(); // prevent cover's click-to-open

        // Stop whichever was playing
        if (currentAudio && playingBtn !== btn) {
          currentAudio.pause(); currentAudio.currentTime = 0;
          playingBtn?.classList.remove('playing');
          playingBtn?.setAttribute('aria-pressed', 'false');
          const oldProgress = playingBtn?.querySelector('.audio-progress');
          if (oldProgress) oldProgress.remove();
          currentAudio = null; playingBtn = null;
        }

        if (!audio) {
          audio = new Audio(btn.dataset.sound);
          
          audio.addEventListener('error', () => {
            btn.classList.add('audio-error');
            btn.setAttribute('aria-label', 'Audio failed to load');
            shakeEl(btn);
          });
          
          // Update progress bar
          audio.addEventListener('timeupdate', () => {
            if (progressEl && audio.duration) {
              const percent = (audio.currentTime / audio.duration) * 100;
              progressEl.style.width = `${percent}%`;
            }
          });
          
          audio.addEventListener('ended', () => {
            btn.classList.remove('playing');
            btn.setAttribute('aria-pressed', 'false');
            if (progressEl) progressEl.remove();
            if (currentAudio === audio) { currentAudio = null; playingBtn = null; }
          });
        }

        if (audio.paused) {
          audio.play()
            .then(() => {
              btn.classList.add('playing');
              btn.setAttribute('aria-pressed', 'true');
              currentAudio = audio; playingBtn = btn;
              
              // Create progress element
              if (!progressEl) {
                progressEl = mk('div', { class: 'audio-progress' });
                btn.appendChild(progressEl);
              }
            })
            .catch(() => {
              btn.classList.add('audio-error');
              shakeEl(btn);
            });
        } else {
          audio.pause();
          audio.currentTime = 0;
          btn.classList.remove('playing');
          btn.setAttribute('aria-pressed', 'false');
          if (progressEl) progressEl.remove();
          if (currentAudio === audio) { currentAudio = null; playingBtn = null; }
        }
      });
    });
  }

  /* ── Spoilers ───────────────────────────────────────────────── */
  function setupSpoilers() {
    document.querySelectorAll('.peek-hint').forEach(btn => {
      btn.dataset.revealed = 'false';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-expanded', 'false');
      updateSpoilerA11y(btn, false);
      btn.addEventListener('click', () => {
        const revealed = btn.dataset.revealed === 'true' ? 'false' : 'true';
        btn.dataset.revealed = revealed;
        btn.setAttribute('aria-pressed', revealed);
        btn.setAttribute('aria-expanded', revealed);
        updateSpoilerA11y(btn, revealed === 'true');
      });
    });
  }

  function updateSpoilerA11y(btn, revealed) {
    const text = btn.textContent.trim().replace(/\s+/g, ' ');
    btn.setAttribute('aria-label', revealed
      ? `Spoiler revealed. ${text}. Activate to hide spoiler.`
      : 'Spoiler hidden. Tap to reveal.');
  }

  /* ── Swipe & Wheel ─────────────────────────────────────────── */
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

    // Wheel scroll navigates slides
    let wheelTimeout = null;
    root.addEventListener('wheel', e => {
      e.preventDefault();
      if (wheelTimeout) return;
      wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 400);
      e.deltaY > 0 ? next() : prev();
    }, { passive: false });
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
          modalOpen ? closeJumpModal() : navOpen ? closeNavPanel() : closeHelpModal(); break;
        case 'g': case 'G': if (!navOpen && !document.body.classList.contains('story-locked')) openJumpModal(); break;
        case 'n': case 'N':
          if (document.body.classList.contains('story-locked')) break;
          toggleNavPanel();
          document.getElementById('nav-toggle')?.classList.remove('has-attention');
          break;
        case 'Home': e.preventDefault(); goTo(0); break;
        case 'End':
          if (document.body.classList.contains('story-locked')) break;
          e.preventDefault(); goTo(slides.length - 1); break;
        case '?': case '/': if (!navOpen && !document.body.classList.contains('story-locked')) toggleHelpModal(); break;
        case ' ': case 'Space':
          // Space to toggle audio on current slide
          if (!modalOpen && !navOpen) {
            e.preventDefault();
            const currentSlide = slides[getCurrentSlideIndex()];
            const audioBtn = currentSlide?.querySelector('.text-to-sound');
            if (audioBtn) audioBtn.click();
          }
          break;
        case 'm': case 'M':
          // M to mute/unmute audio
          if (!modalOpen && !navOpen) {
            e.preventDefault();
            if (currentAudio) {
              currentAudio.muted = !currentAudio.muted;
              showToast(currentAudio.muted ? 'Audio muted' : 'Audio unmuted', 'info');
            }
          }
          break;
        case 's': case 'S':
          // S to toggle spoiler on current slide
          if (!modalOpen && !navOpen) {
            e.preventDefault();
            const currentSlide = slides[getCurrentSlideIndex()];
            const spoilerBtn = currentSlide?.querySelector('.peek-hint');
            if (spoilerBtn) {
              spoilerBtn.click();
              const revealed = spoilerBtn.dataset.revealed === 'true';
              showToast(revealed ? 'Spoiler revealed' : 'Spoiler hidden', 'info');
            }
          }
          break;
        case 'b': case 'B':
          if (!modalOpen && !navOpen) toggleBookmark();
          break;
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

/* ── Help Modal ── */
#help-modal {
  position: fixed;
  inset: 0;
  background: rgba(8, 2, 26, 0.85);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}
.help-content {
  background: linear-gradient(165deg, #180640 0%, #100328 50%, #080118 100%);
  border: 2px solid rgba(201,160,48,0.52);
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  position: relative;
}
#help-title {
  color: #FFE888;
  font-family: 'Marck Script', cursive;
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  text-align: center;
}
.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.help-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  color: #FBF4E0;
  font-size: 0.95rem;
  border-bottom: 1px solid rgba(201,160,48,0.15);
}
.help-list li:last-child {
  border-bottom: none;
}
.help-list kbd {
  background: rgba(201,160,48,0.2);
  border: 1px solid rgba(201,160,48,0.4);
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-family: monospace;
  font-size: 0.85rem;
  color: #FFE888;
  margin-right: 0.25rem;
}
.help-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: rgba(201,160,48,0.7);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s;
}
.help-close:hover {
  color: #FFE888;
}
.help-close:focus-visible {
  outline: 2px solid #FFE888;
  outline-offset: 2px;
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
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: .64rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 1px;
  white-space: nowrap;
  color: #F0C050 !important; text-shadow: none !important;
  background: linear-gradient(145deg, #2A0E50 0%, #3E1A6A 40%, #2A0E50 100%);
  border-radius: inherit;
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
  content: '\u266A';
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  font-size: 1.15em;
  color: rgba(106,72,0,.85);
  animation: noteBounce 0.5s ease-in-out infinite;
  pointer-events: none;
  z-index: 2;
}
.text-to-sound.playing::before {
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
  position: fixed; top: 7px; left: 16px; z-index: 1100;
  width: 52px; height: 52px; border-radius: 50%;
  border: 2px solid rgba(201,160,48,.55); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.35rem; line-height: 1;
  background: linear-gradient(145deg, #1E0848, #2D1060);
  color: #F0C050;
  box-shadow: 0 4px 20px rgba(0,0,0,.55), 0 0 16px rgba(201,160,48,.20);
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), border-color .2s ease, box-shadow .22s ease;
  backdrop-filter: blur(8px);
  animation: fabPopIn 0.4s cubic-bezier(.34,1.56,.64,1) 0.3s both;
}
#nav-toggle:hover { transform: scale(1.1) rotate(-5deg); border-color: rgba(201,160,48,.85); }
#nav-toggle:active { transform: scale(.94); transition-duration: .08s !important; }

/* ── Nav toggle first-time attention ring ── */
#nav-toggle.has-attention {
  animation: navAttention 2s ease-in-out 3;
}
@keyframes navAttention {
  0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,.55), 0 0 16px rgba(201,160,48,.20); }
  50% { box-shadow: 0 4px 24px rgba(0,0,0,.6), 0 0 28px rgba(201,160,48,.45), 0 0 48px rgba(201,160,48,.15); }
}

/* ── Nav panel ── */
#nav-panel {
  position: fixed; top: 0; left: -340px; bottom: 0;
  width: 320px; max-width: 88vw; z-index: 1000;
  display: flex; flex-direction: column; overflow: hidden;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(140,95,40,.05) 28px,rgba(140,95,40,.05) 29px),
    radial-gradient(ellipse at 10% 5%,rgba(200,155,70,.18) 0%,transparent 50%),
    linear-gradient(165deg,#FAF0D8,#F2E4BC 55%,#EBD5A0);
  border-right: 4px solid #E5CFA0;
  outline: 2px solid rgba(201,160,48,.38); outline-offset: -10px;
  box-shadow: 8px 0 60px rgba(0,0,0,.55);
  transition: left .38s cubic-bezier(.22,.85,.32,1);
}
#nav-panel.open { left: 0; }
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
  #nav-toggle { top:7px; left:14px; width:46px; height:46px; font-size:1.2rem; }
  #prev-page, #next-page { width:32px; height:52px; font-size:1.1rem; }
}
    `;
    document.head.appendChild(s);
  }

})();
