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
  const indicator = document.getElementById("page-indicator");
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
     special slides (header, footer,
     dance-collage, search-scene).
   */
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

    /* Inspector scan text effect */
    if (slides[current] === inspectorSlide) startScan();
    else if (slides[leaving] === inspectorSlide) stopScan();

    /* Reset peek hints on the slide we are leaving */
    slides[leaving].querySelectorAll(".peek-hint.revealed").forEach(p => {
      p.classList.remove("revealed");
      const btn = p.querySelector(".peek-btn");
      if (btn) btn.textContent = p.dataset.label || "spoiler";
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
      const slideNum = prompt(`Jump to slide (1-${total}):`, `${current + 1}`);
      if (slideNum !== null) {
        const num = parseInt(slideNum, 10) - 1;
        if (num >= 0 && num < total) {
          goTo(num);
        } else {
          alert(`Please enter a number between 1 and ${total}`);
        }
      }
    }
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
     SCAN TEXT FLOAT  #inspector-slide
   */
  const inspectorSlide = document.getElementById("inspector-slide");
  let   scanTimers     = [];
  let   scanIndex      = 0;

  const scanLines = [
    "[ INITIATING PROTOCOL... ]",
    "[ SCANNING SUBJECT DATABASE ]",
    ">> SEARCHING: great smile............. ",
    ">> SEARCHING: kind soul............... ",
    ">> SEARCHING: heart of gold........... ",
    ">> SEARCHING: infectious laugh........ ",
    ">> SEARCHING: sharp wit............... ",
    ">> SEARCHING: warm eyes............... ",
    ">> SEARCHING: unmatched sex appeal.... ",
    ">> SEARCHING: good sense of humor..... ",
    ">> SEARCHING: emotionally mature...... ",
    ">> SEARCHING: has chest hair.......... ",
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

    el.style.left = Math.random() * 60 + 5 + "%";
    el.style.top  = Math.random() * 75 + 5 + "%";

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
    document.querySelectorAll(".peek-hint").forEach(p => {
      const label       = p.dataset.label || "spoiler";
      const originalHTML = p.innerHTML;

      const btn = document.createElement("button");
      btn.className = "peek-btn";
      btn.textContent = label;
      btn.setAttribute("aria-label", `Reveal ${label}`);

      const textSpan = document.createElement("span");
      textSpan.className = "peek-text";
      textSpan.innerHTML = originalHTML;

      p.innerHTML = "";
      p.appendChild(btn);
      p.appendChild(textSpan);

      function updateBtn() {
        const revealed = p.classList.contains("revealed");
        btn.textContent = revealed ? "hide" : label;
        btn.style.opacity  = revealed ? "0.45" : "";
        btn.style.fontSize = revealed ? "0.65em" : "";
      }

      btn.addEventListener("click", () => {
        p.classList.toggle("revealed");
        updateBtn();
      });
    });
  }

  initPeekHints();

  /*  Init  */
  updateNav();

})();
