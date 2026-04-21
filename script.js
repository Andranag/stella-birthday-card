/* 
   script.js  Birthday Story Interactive
   Features: horizontal slide layout builder,
   swipe + scroll + keyboard navigation,
   typewriter effect, music toggle.
 */

(function () {
  "use strict";

  /*  DOM refs  */
  const container = document.getElementById("swipe-container");
  const prevBtn   = document.getElementById("prev-page");
  const nextBtn   = document.getElementById("next-page");
  const indicator = document.getElementById("top-indicator");
  const progressFill = document.getElementById("progress-fill");
  const storyEl   = document.getElementById("story");

  /*  Slides  */
  const slides = Array.from(container.querySelectorAll(".slide"));
  const total  = slides.length;
  let current  = 0;
  let isAnimating = false;

  container.style.width = `${total * 100}vw`;

  /* 
     LAYOUT BUILDER
     Wraps each gift-article's content into
     a three-column grid:
       [left video] [text block] [right video]
     Runs once at startup  does NOT touch
     non-gift slides (header, footer).
   */
  function buildLayouts() {
    slides.forEach((slide) => {
      /* Skip non-gift slides */
      if (!slide.classList.contains("gift-article")) return;
      /* Skip already-processed or special-layout slides */
      if (slide.querySelector(".slide-layout"))    return;

      /* Collect direct children */
      const children = Array.from(slide.childNodes).filter(
        (n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
      );

      /* Separate text nodes from gift-img containers */
      const textEls  = [];
      const videoEls = [];

      children.forEach((el) => {
        if (el.nodeType === Node.ELEMENT_NODE && el.classList.contains("gift-img")) {
          videoEls.push(el);
        } else if (el.nodeType === Node.ELEMENT_NODE) {
          textEls.push(el);
        }
      });

      /* Build text wrapper */
      const textWrap = document.createElement("div");
      textWrap.className = "slide-text";
      textEls.forEach((el) => textWrap.appendChild(el));

      /* Build layout wrapper */
      const layout = document.createElement("div");
      layout.className = "slide-layout";

      const leftSlot  = document.createElement("div");
      leftSlot.className = "slide-video-left";

      const rightSlot = document.createElement("div");
      rightSlot.className = "slide-video-right";

      if (videoEls.length === 0) {
        layout.classList.add("no-video");
        layout.appendChild(textWrap);
      } else if (videoEls.length === 1) {
        layout.classList.add("one-video");
        leftSlot.appendChild(videoEls[0]);
        rightSlot.appendChild(document.createElement("div")); /* empty placeholder */
        layout.appendChild(leftSlot);
        layout.appendChild(textWrap);
        layout.appendChild(rightSlot);
      } else {
        /* Two or more videos: first goes left, second goes right */
        layout.classList.add("two-video");
        leftSlot.appendChild(videoEls[0]);
        rightSlot.appendChild(videoEls[1]);
        /* Any extra videos go below the layout (rare) */
        const extras = videoEls.slice(2);
        layout.appendChild(leftSlot);
        layout.appendChild(textWrap);
        layout.appendChild(rightSlot);
        if (extras.length) {
          layout.classList.add("with-extras");
          const extrasContainer = document.createElement("div");
          extrasContainer.className = "extras-row";
          extras.forEach((v) => {
            extrasContainer.appendChild(v);
          });
          layout.appendChild(extrasContainer);
        }
      }

      /* Clear slide and re-attach */
      slide.innerHTML = "";
      slide.appendChild(layout);
    });
  }

  buildLayouts();

  /* 
     NAVIGATION
   */
  function goTo(index) {
    if (isAnimating || index < 0 || index >= total) return;
    isAnimating = true;

    const leaving = current;
    slides[index].scrollTop = 0;
    current = index;
    container.style.transform = `translateX(-${current * 100}vw)`;

    updateNav();

    /* Kiss emoji effect */
    if (slides[current] === kissSlide) startKisses();
    else if (slides[leaving] === kissSlide) stopKisses();

    /* Inspector scan text effect - only manual trigger via R2-D2 button */
    else if (slides[leaving] === inspectorSlide) {
      stopScan();
    }

    /* Final slide video with audio */
    if (slides[current] === finalSlide) startFinalVideo();
    else if (slides[leaving] === finalSlide) stopFinalVideo();

    /* Dance section background song */
    if (isInDanceSection(slides[current]) && !isInDanceSection(slides[leaving])) startDanceMusic();
    else if (!isInDanceSection(slides[current]) && isInDanceSection(slides[leaving])) stopDanceMusic();

    /* Sad section background song */
    if (isInSadSection(slides[current]) && !isInSadSection(slides[leaving])) startSadMusic();
    else if (!isInSadSection(slides[current]) && isInSadSection(slides[leaving])) stopSadMusic();

    /* Stop any text-to-sound audio on the slide we are leaving */
    slides[leaving].querySelectorAll(".text-to-sound").forEach(btn => {
      const src = btn.dataset.sound;
      if (src && soundCache[src]) {
        soundCache[src].pause();
        soundCache[src].currentTime = 0;
      }
      btn.classList.remove("playing");
    });

    /* Reset peek hints on the slide we are leaving */
    slides[leaving].querySelectorAll(".peek-hint.revealed").forEach(btn => {
      btn.classList.remove("revealed");
      if (btn.firstChild) btn.firstChild.textContent = btn.dataset.label || "spoiler";
    });

    container.addEventListener("transitionend", function onEnd() {
      container.removeEventListener("transitionend", onEnd);
      isAnimating = false;
    }, { once: true });
  }

  function updateNav() {
    indicator.textContent = `${current + 1} / ${total}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
    if (progressFill) {
      const progress = ((current + 1) / total) * 100;
      progressFill.style.width = `${progress}%`;
    }
  }

  /* Buttons */
  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));

  /*  Keyboard  */
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown")  goTo(current + 1);
    if (e.key === "ArrowLeft"  || e.key === "ArrowUp")    goTo(current - 1);

    /* Dev feature: Press 'G' to jump to a specific slide */
    if (e.key === "g" || e.key === "G") {
      showJumpModal();
    }
  });

  /* Custom jump modal */
  const jumpModal = document.getElementById('jump-modal');
  const jumpInput = document.getElementById('jump-input');
  const jumpTotal = document.getElementById('jump-total');
  const jumpCancel = document.getElementById('jump-cancel');
  const jumpConfirm = document.getElementById('jump-confirm');

  function showJumpModal() {
    jumpTotal.textContent = total;
    jumpInput.value = current + 1;
    jumpModal.style.display = 'flex';
    jumpInput.focus();
    jumpInput.select();
  }

  function hideJumpModal() {
    jumpModal.style.display = 'none';
  }

  function confirmJump() {
    const num = parseInt(jumpInput.value, 10) - 1;
    if (num >= 0 && num < total) {
      goTo(num);
      hideJumpModal();
    } else {
      jumpInput.style.borderColor = '#e74c3c';
      setTimeout(() => {
        jumpInput.style.borderColor = '';
      }, 1000);
    }
  }

  jumpCancel.addEventListener('click', hideJumpModal);
  jumpConfirm.addEventListener('click', confirmJump);
  jumpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmJump();
    if (e.key === 'Escape') hideJumpModal();
  });
  jumpModal.addEventListener('click', (e) => {
    if (e.target === jumpModal) hideJumpModal();
  });

  /*  Wheel / Trackpad scroll  */
  let scrollCooldown = false;

  storyEl.addEventListener("wheel", (e) => {
    const slide    = slides[current];
    const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 5;
    const atTop    = slide.scrollTop <= 5;

    const goingDown = e.deltaY > 0;
    const goingUp   = e.deltaY < 0;

    if ((goingDown && !atBottom) || (goingUp && !atTop)) return;
    if (scrollCooldown) return;

    e.preventDefault();
    scrollCooldown = true;
    setTimeout(() => { scrollCooldown = false; }, 800);

    if (goingDown) goTo(current + 1);
    else           goTo(current - 1);
  }, { passive: false });

  /*  Touch / Swipe  */
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved  = false;

  storyEl.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved  = false;
  }, { passive: true });

  storyEl.addEventListener("touchmove", () => { touchMoved = true; }, { passive: true });

  storyEl.addEventListener("touchend", (e) => {
    if (!touchMoved) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) * 1.4 && Math.abs(dx) > 40) {
      if (dx < 0) goTo(current + 1);
      else        goTo(current - 1);
    }
  }, { passive: true });

  /* 
     CONTEXT COMPASS NAVIGATION
   */
  document.querySelectorAll('.compass-sections li').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetSlide = parseInt(item.dataset.slide, 10);
      const slideNum = Math.min(targetSlide - 1, total - 1);
      if (slideNum >= 0) {
        goTo(slideNum);
      }
    });
  });

  /* 
     MUSIC TOGGLE
   */
  const musicBtn = document.createElement("button");
  musicBtn.id = "music-btn";
  musicBtn.setAttribute("aria-label", "Toggle background music");
  musicBtn.setAttribute("aria-pressed", "false");
  musicBtn.textContent = "🎵";
  document.body.appendChild(musicBtn);

  let audio = null, musicPlaying = false;

  musicBtn.addEventListener("click", () => {
    if (!audio) {
      audio = new Audio("assets/music/Making Today A Perfect Day.mp3");
      audio.loop   = true;
      audio.volume = 0.35;
    }
    if (musicPlaying) {
      audio.pause();
      musicPlaying = false;
      musicBtn.textContent = "🎵";
      musicBtn.classList.remove("playing");
      musicBtn.setAttribute("aria-pressed", "false");
    } else {
      audio.play()
        .then(() => {
          musicPlaying = true;
          musicBtn.textContent = "🔊";
          musicBtn.classList.add("playing");
          musicBtn.setAttribute("aria-pressed", "true");
        })
        .catch(() => {
          musicBtn.title = "Add assets/music/Making Today A Perfect Day.mp3 to enable music!";
        });
    }
  });

  /*  Swipe / scroll hint  */
  const hint = document.createElement("div");
  hint.id = "swipe-hint";
  hint.innerHTML = `<span>👆</span> Swipe, scroll or use arrows`;
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 3500);

  /* 
     KISS EMOJI BURST  #kiss-again-slide
   */
  const kissSlide  = document.getElementById("kiss-again-slide");
  let   kissTimers = [];

  function spawnKiss() {
    const el = document.createElement("span");
    el.className   = "kiss-float";
    el.textContent = ["💋", "😘", "💋", "💋", "😘"][Math.floor(Math.random() * 5)];

    el.style.left   = Math.random() * 90 + 5 + "%";
    el.style.bottom = Math.random() * 30 + 5 + "%";

    kissSlide.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function startKisses() {
    stopKisses();
    /* Initial burst */
    for (let i = 0; i < 6; i++) {
      kissTimers.push(setTimeout(spawnKiss, i * 120));
    }
    /* Continuous drizzle */
    kissTimers.push(setInterval(spawnKiss, 500));
  }

  function stopKisses() {
    kissTimers.forEach(clearTimeout);
    kissTimers.forEach(clearInterval);
    kissTimers = [];
    kissSlide.querySelectorAll(".kiss-float").forEach(el => el.remove());
  }

  /* 
     FINAL SLIDE VIDEO — plays audio only when on the slide
   */
  const finalSlide = document.getElementById("final-slide");
  const finalVideo = finalSlide ? finalSlide.querySelector(".gift-video") : null;

  function startFinalVideo() {
    if (finalVideo) finalVideo.play().catch(() => {});
  }

  function stopFinalVideo() {
    if (finalVideo) { finalVideo.pause(); finalVideo.currentTime = 0; }
  }

  /* 
     DANCE SECTION SONG — plays across slides #dance-section-start to #dance-section-end
   */
  const danceSectionStart = document.getElementById("dance-section-start");
  const danceSectionEnd   = document.getElementById("dance-section-end");
  const danceSectionIdxStart = slides.indexOf(danceSectionStart);
  const danceSectionIdxEnd   = slides.indexOf(danceSectionEnd);
  const danceSectionAudio = new Audio("assets/music/put your head on my shoulder.mp3");
  danceSectionAudio.loop   = true;
  danceSectionAudio.volume = 0.7;

  function isInDanceSection(slide) {
    const idx = slides.indexOf(slide);
    return idx >= danceSectionIdxStart && idx <= danceSectionIdxEnd;
  }

  function startDanceMusic() {
    danceSectionAudio.play().catch(() => {});
  }

  function stopDanceMusic() {
    danceSectionAudio.pause();
    danceSectionAudio.currentTime = 0;
  }

  /* 
     SAD SECTION SONG - plays across slides #sad-section-start to #sad-section-end
   */
  const sadSectionStart = document.getElementById("sad-section-start");
  const sadSectionEnd   = document.getElementById("sad-section-end");
  const sadSectionIdxStart = slides.indexOf(sadSectionStart);
  const sadSectionIdxEnd   = slides.indexOf(sadSectionEnd);
  const sadSectionAudio = new Audio("assets/music/sad caroll.mp3");
  sadSectionAudio.loop   = true;
  sadSectionAudio.volume = 0.7;

  function isInSadSection(slide) {
    const idx = slides.indexOf(slide);
    return idx >= sadSectionIdxStart && idx <= sadSectionIdxEnd;
  }

  function startSadMusic() {
    sadSectionAudio.play().catch(() => {});
  }

  function stopSadMusic() {
    sadSectionAudio.pause();
    sadSectionAudio.currentTime = 0;
  }

  const inspectorSlide = document.getElementById("inspector-slide");
  let   scanTimers     = [];
  let   scanIndex      = 0;

  const scanLines = [
    "[ INITIATING PROTOCOL... ]",
    "[ SCANNING SUBJECT DATABASE ]",
    ">> SEARCHING: great smile... ✓",
    ">> SEARCHING: kind soul... ✓",
    ">> SEARCHING: heart of gold... ✓",
    ">> SEARCHING: infectious laugh... ✓",
    ">> SEARCHING: sharp wit... ✓",
    ">> SEARCHING: warm eyes... ✓",
    ">> SEARCHING: unmatched sex appeal... ✓",
    ">> SEARCHING: good sense of humor... ✓",
    ">> SEARCHING: emotionally mature... ✓",
    ">> SEARCHING: has chest hair... ✓",
    "[ CROSS-REFERENCING PARAMETERS ]",
    ">> MATCH CONFIDENCE: 99.9%",
    "[ WARNING: SUBJECT IS TOO CHARMING ]",
    "[ ALERT: HEART RATE SPIKE DETECTED ]",
    "[ ANALYSIS COMPLETE ]",
    "[ TARGET ACQUIRED! ]",
  ];

  function spawnScanLine() {
    const el = document.createElement("span");
    el.className   = "scan-float";
    el.textContent = scanLines[scanIndex % scanLines.length];
    scanIndex++;

    /* Alternate between left edge and right edge, never over the centre text */
    const onLeft = scanIndex % 2 === 0;
    if (onLeft) {
      el.style.left = (Math.random() * 18) + "%";
    } else {
      el.classList.add("scan-right");
    }

    /* Pick a Y slot that doesn't collide with any currently visible float */
    const slotH   = 11;  /* percent — min gap between floats */
    const minTop  = 5;
    const maxTop  = 88;
    const slots   = Math.floor((maxTop - minTop) / slotH);
    const occupied = Array.from(
      inspectorSlide.querySelectorAll(".scan-float")
    ).map(f => parseFloat(f.style.top));

    let top = minTop + Math.floor(Math.random() * slots) * slotH;
    for (let tries = 0; tries < slots; tries++) {
      const conflict = occupied.some(y => Math.abs(y - top) < slotH);
      if (!conflict) break;
      top = minTop + ((Math.floor((top - minTop) / slotH) + 1) % slots) * slotH;
    }

    el.style.top = top + "%";

    inspectorSlide.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function startScan() {
    stopScan();
    scanIndex = 0;
    spawnScanLine();
    scanTimers.push(setInterval(spawnScanLine, 900));
  }

  function stopScan() {
    scanTimers.forEach(clearInterval);
    scanTimers.forEach(clearTimeout);
    scanTimers = [];
    inspectorSlide.querySelectorAll(".scan-float").forEach(el => el.remove());
  }

  /* 
     PEEK HINTS  spoiler / reference / check out
     Hides the text inside .peek-hint elements
     and shows a toggle button to reveal/hide it.
     Resets to hidden whenever you navigate away.
   */
  function initPeekHints() {
    document.querySelectorAll(".peek-hint").forEach(btn => {
      const label        = btn.dataset.label || "spoiler";
      const originalHTML = btn.innerHTML;

      // For simple-question: start blank, show ? on reveal
      if (btn.classList.contains("simple-question")) {
        const textSpan = document.createElement("span");
        textSpan.className = "peek-text";
        textSpan.innerHTML = '<span class="purple-q">?</span>';
        btn.appendChild(textSpan);

        btn.addEventListener("click", () => {
          btn.classList.toggle("revealed");
        });
        return;
      }

      // Regular peek-hint buttons
      const textSpan = document.createElement("span");
      textSpan.className = "peek-text";
      textSpan.innerHTML = originalHTML;

      btn.innerHTML = label;
      btn.setAttribute("aria-label", `Reveal ${label}`);
      btn.appendChild(textSpan);

      function updateBtn() {
        const revealed = btn.classList.contains("revealed");
        btn.firstChild.textContent = revealed ? "hide" : label;
      }

      btn.addEventListener("click", () => {
        btn.classList.toggle("revealed");
        updateBtn();
      });
    });
  }

  initPeekHints();

  /* ════════════════════════════════════════════
     TEXT TO SOUND — clickable sound elements
  ════════════════════════════════════════════ */
  const soundCache = {};

  function getSound(src) {
    if (!soundCache[src]) {
      const a = new Audio(src);
      a.volume = 0.7;
      soundCache[src] = a;
    }
    return soundCache[src];
  }

  document.querySelectorAll(".text-to-sound").forEach(p => {
    const src = p.dataset.sound;
    if (!src) return;
    p.addEventListener("click", () => {
      /* Stop any other text-to-sound audio currently playing */
      Object.entries(soundCache).forEach(([url, audio]) => {
        if (url !== src && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });

      const audio = getSound(src);
      audio.currentTime = 0;
      audio.play().catch(() => {});
      p.classList.remove("playing");
      void p.offsetWidth;
      p.classList.add("playing");
      p.addEventListener("animationend", () => p.classList.remove("playing"), { once: true });

      /* Trigger scanning effect for inspector gadget button (detective theme) */
      if (src.includes("inspector gadget.mp3")) {
        startScan();
        /* Auto-stop scan after the audio finishes playing */
        audio.addEventListener("ended", () => {
          setTimeout(stopScan, 2000); // Let final scan lines finish before stopping
        }, { once: true });
      }
    });
  });

  /* ── Init ─────────────────────────────────── */
  updateNav();

})();
