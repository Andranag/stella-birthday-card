/* ─────────────────────────────────────────
   script.js — Birthday Story Interactive
   Features: horizontal slide layout builder,
   swipe + scroll + keyboard navigation,
   typewriter effect, music toggle.
───────────────────────────────────────── */

(function () {
  "use strict";

  /* ── DOM refs ─────────────────────────────── */
  const container = document.getElementById("swipe-container");
  const prevBtn   = document.getElementById("prev-page");
  const nextBtn   = document.getElementById("next-page");
  const indicator = document.getElementById("page-indicator");
  const storyEl   = document.getElementById("story");

  /* ── Slides ───────────────────────────────── */
  const slides = Array.from(container.querySelectorAll(".slide"));
  const total  = slides.length;
  let current  = 0;
  let isAnimating = false;

  container.style.width = `${total * 100}vw`;

  /* ════════════════════════════════════════════
     LAYOUT BUILDER
     Wraps each gift-article's content into
     a three-column grid:
       [left video] [text block] [right video]
     Runs once at startup — does NOT touch
     special slides (header, footer,
     dance-collage, search-scene).
  ════════════════════════════════════════════ */
  function buildLayouts() {
    slides.forEach((slide) => {
      /* Skip non-gift slides */
      if (!slide.classList.contains("gift-article")) return;
      /* Skip already-processed or special-layout slides */
      if (slide.querySelector(".slide-layout"))    return;
      if (slide.querySelector(".dance-collage"))   return;
      if (slide.querySelector(".search-scene"))    return;

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

  /* ════════════════════════════════════════════
     NAVIGATION
  ════════════════════════════════════════════ */
  function goTo(index) {
    if (isAnimating || index < 0 || index >= total) return;
    isAnimating = true;

    slides[index].scrollTop = 0;
    current = index;
    container.style.transform = `translateX(-${current * 100}vw)`;

    scheduleTypewriter(slides[current]);
    updateNav();

    /* Trigger search scene if applicable */
    const searchSlide = document.querySelector(".search-scene")?.closest(".slide");
    const searchSpawn = document.getElementById("search-spawn");
    if (searchSlide && slides[index] === searchSlide && searchSpawn && searchSpawn.textContent.trim() === "") {
      setTimeout(typeSearchLinesBetter, 650);
    }

    container.addEventListener("transitionend", function onEnd() {
      container.removeEventListener("transitionend", onEnd);
      isAnimating = false;
    }, { once: true });
  }

  function updateNav() {
    indicator.textContent = `${current + 1} / ${total}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
  }

  /* Buttons */
  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));

  /* ── Keyboard ─────────────────────────────── */
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown")  goTo(current + 1);
    if (e.key === "ArrowLeft"  || e.key === "ArrowUp")    goTo(current - 1);
  });

  /* ── Wheel / Trackpad scroll ──────────────── */
  let scrollCooldown = false;

  storyEl.addEventListener("wheel", (e) => {
    /* Ignore vertical scrolling within a slide that has overflow */
    const slide = slides[current];
    const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 5;
    const atTop    = slide.scrollTop <= 5;

    const goingDown = e.deltaY > 0;
    const goingUp   = e.deltaY < 0;

    /* Only change slide when at the edge of scroll */
    if ((goingDown && !atBottom) || (goingUp && !atTop)) return;
    if (scrollCooldown) return;

    e.preventDefault();
    scrollCooldown = true;
    setTimeout(() => { scrollCooldown = false; }, 800);

    if (goingDown) goTo(current + 1);
    else           goTo(current - 1);
  }, { passive: false });

  /* ── Touch / Swipe ────────────────────────── */
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

  /* ════════════════════════════════════════════
     TYPEWRITER EFFECT
  ════════════════════════════════════════════ */
  const typedSlides = new Set();

  function scheduleTypewriter(slide) {
    if (typedSlides.has(slide)) return;
    typedSlides.add(slide);

    // Get elements in order: h1, h2, then p elements
    const headers = Array.from(slide.querySelectorAll("h1, h2"));
    const paragraphs = Array.from(slide.querySelectorAll("p"));
    const els = [...headers, ...paragraphs];
    
    if (!els.length) return;

    // Store original text and keep elements visible but empty (preserve space)
    els.forEach(el => {
      const originalText = el.textContent;
      el.setAttribute('data-original-text', originalText);
      el.textContent = "";
    });

    // Start sequential typewriter
    setTimeout(() => {
      typeSequentialElements(els, 0);
    }, 500);
  }

  function typeSequentialElements(elements, elementIndex) {
    if (elementIndex >= elements.length) return;

    const currentEl = elements[elementIndex];
    const originalText = currentEl.getAttribute('data-original-text');
    
    if (!originalText || !originalText.trim()) {
      typeSequentialElements(elements, elementIndex + 1);
      return;
    }

    // Make current element visible
    currentEl.style.visibility = "visible";
    // Type the current element
    typeSingleElement(currentEl, originalText, 0, () => {
      // Remove cursor when done
      currentEl.classList.remove("typewriter-cursor");
      
      // Pause before next element
      setTimeout(() => {
        typeSequentialElements(elements, elementIndex + 1);
      }, 800);
    });
  }

  function typeSingleElement(el, text, charIndex, done) {
    if (charIndex >= text.length) {
      if (done) done();
      return;
    }
    
    el.textContent = text.slice(0, charIndex + 1);
    const speed = /[.!?]/.test(text[charIndex]) ? 0 : 50;
    setTimeout(() => typeSingleElement(el, text, charIndex + 1, done), speed);
  }

  /* ── Search scene special typewriter ─────── */
  function typeSearchLinesBetter() {
    const searchSpawn = document.getElementById('search-spawn');
    if (!searchSpawn) return;

    const lines = [
      'Searching social media...',
      'Checking dating apps...',
      'Looking through contacts...',
      'Found it! Instagram profile located!'
    ];

    // Clear and prepare the container
    searchSpawn.innerHTML = '';
    searchSpawn.style.whiteSpace = 'pre-line';
    searchSpawn.style.textAlign = 'left';

    let lineIndex = 0;
    let charIndex = 0;
    let currentText = '';

    const typeWriter = () => {
      if (lineIndex < lines.length) {
        const currentLine = lines[lineIndex];
        
        if (charIndex < currentLine.length) {
          // Add character by character
          currentText += currentLine[charIndex];
          searchSpawn.textContent = currentText;
          charIndex++;
          
          // Slower speed for reading (120ms per character)
          setTimeout(typeWriter, 120);
        } else {
          // Line complete, add newline and move to next line
          currentText += '\n';
          searchSpawn.textContent = currentText;
          lineIndex++;
          charIndex = 0;
          
          // Pause between lines (800ms for reading)
          setTimeout(typeWriter, 800);
        }
      } else {
        // Animation complete, keep text visible
        setTimeout(() => {
          currentText = '';
          searchSpawn.textContent = currentText;
          lineIndex = 0;
          charIndex = 0;
          typeWriter(); // Restart animation
        }, 2000);
      }
    };

    typeWriter();
  }

  /* ════════════════════════════════════════════
     MUSIC TOGGLE
  ════════════════════════════════════════════ */
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

  /* ── Swipe / scroll hint ──────────────────── */
  const hint = document.createElement("div");
  hint.id = "swipe-hint";
  hint.innerHTML = `<span>👆</span> Swipe, scroll or use arrows`;
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 3500);

  /* ── Init ─────────────────────────────────── */
  updateNav();
  setTimeout(() => scheduleTypewriter(slides[0]), 350);

})();