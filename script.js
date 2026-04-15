const swipeContainer = document.getElementById("swipe-container");
const slides = swipeContainer
  ? Array.from(swipeContainer.querySelectorAll(".slide"))
  : [];
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageIndicator = document.getElementById("page-indicator");

const quizForm = document.getElementById("quiz-form");
const quizAnswer = document.getElementById("quiz-answer");
const quizFeedback = document.getElementById("quiz-feedback");
const quizQuestion = document.getElementById("quiz-question");
const scheduleIdle = (fn) => {
  if ("requestIdleCallback" in window) return requestIdleCallback(fn);
  return setTimeout(fn, 0);
};
const QUIZ_STORAGE_KEY = "stella_bday_unlocked";

const QUIZ_STEPS = [
  { question: "What's my favorite ice cream flavor?", answers: ["vanilla", "tiramisu", "bubblegum", "strawberry"] },
  { question: "What's my favorite color?", answers: ["cypress", "green", "blue", "purple", "red", "yellow", "orange", "black"] },
  { question: "What's my favorite food?", answers: ["mousakas", "mousaka"] },
];

let quizStepIndex = 0;
let activeSlideIndex = -1;

const prefersReducedMotion = false;

const slideTypingState = new Map();

const TYPING = {
  charMs: 32,
  spaceMs: 14,
  lineGapMs: 420,
  startDelayMs: 120,
};

let searchSpawnIntervalId = null;
let againFillIntervalId = null;

// ─── Progress bar ─────────────────────────────────────────────────────────────

const progressBar = document.createElement("div");
progressBar.id = "story-progress";
document.body.appendChild(progressBar);

function updateProgressBar(index) {
  const total = slides.length;
  if (total <= 1) {
    progressBar.style.width = "100%";
    return;
  }
  progressBar.style.width = `${(index / (total - 1)) * 100}%`;
}

// ─── Search spawn ─────────────────────────────────────────────────────────────

function clearSearchStamps() {
  document.querySelector(".search-scene .search-stamps")?.remove();
}

function stopSearchSpawn() {
  clearInterval(searchSpawnIntervalId);
  searchSpawnIntervalId = null;
  clearSearchStamps();
  const target = document.getElementById("search-spawn");
  if (target) target.style.display = "";
}

function startSearchSpawn(slide) {
  const target = document.getElementById("search-spawn");
  if (!slide || !target) return;
  const wrapper = target.closest(".search-lines");
  if (!wrapper || searchSpawnIntervalId != null) return;

  wrapper.classList.remove("is-hidden");
  target.style.display = "none";

  const container = document.createElement("div");
  container.className = "search-stamps";
  wrapper.appendChild(container);

  const lines = [
    "So, you were searching...",
    "and searching...",
    "still searching...",
    "searching far...",
    "and searching wide...",
  ];
  let i = 0;

  const tick = () => {
    if (!slide.isConnected) {
      clearSearchStamps();
      return;
    }
    if (i >= 5) {
      clearInterval(searchSpawnIntervalId);
      searchSpawnIntervalId = null;
      return;
    }

    const stamp = document.createElement("div");
    stamp.className = "search-stamp";
    stamp.textContent = lines[i % lines.length];
    stamp.style.setProperty("--r", `${-10 + Math.random() * 20}deg`);

    const alignRight = Math.random() > 0.5;
    stamp.style.alignSelf = alignRight ? "flex-end" : "flex-start";
    stamp.style[alignRight ? "marginRight" : "marginLeft"] =
      `${Math.round(Math.random() * 56)}px`;
    container.appendChild(stamp);
    while (container.children.length > 10)
      container.removeChild(container.firstChild);
    i++;
  };

  tick();
  searchSpawnIntervalId = setInterval(tick, 2400);
}

// ─── Again fill (kiss slide) ──────────────────────────────────────────────────

function clearAgainStamps() {
  document
    .getElementById("kiss-again-slide")
    ?.querySelector(".again-stamps")
    ?.remove();
}

function stopAgainFill() {
  clearInterval(againFillIntervalId);
  againFillIntervalId = null;
  const slide = document.getElementById("kiss-again-slide");
  if (slide) {
    slide.dataset.againArmed = "false";
    slide.dataset.againFilled = "false";
  }
  clearAgainStamps();
}

function armAgainFill(slide) {
  if (!slide) return;
  clearAgainStamps();
  slide.dataset.againArmed = "true";
  slide.dataset.againFilled = "false";
}

function startAgainFill(slide) {
  if (
    !slide ||
    slide.dataset.againArmed !== "true" ||
    slide.dataset.againFilled === "true"
  )
    return;
  slide.dataset.againFilled = "true";

  const container = document.createElement("div");
  container.className = "again-stamps";
  slide.prepend(container);

  let i = 0;
  const tick = () => {
    if (!slide.isConnected) {
      clearAgainStamps();
      return;
    }
    if (i >= 52) {
      clearInterval(againFillIntervalId);
      againFillIntervalId = null;
      return;
    }

    const stamp = document.createElement("div");
    stamp.className = "again-stamp";
    stamp.textContent = "💋";
    stamp.style.setProperty("--x", `${8 + Math.random() * 84}%`);
    stamp.style.setProperty("--y", `${8 + Math.random() * 84}%`);
    stamp.style.setProperty("--r", `${-22 + Math.random() * 44}deg`);
    stamp.style.opacity = String(0.65 + Math.random() * 0.3);
    container.appendChild(stamp);
    i++;
  };

  tick();
  againFillIntervalId = setInterval(tick, 150);
}

// ─── Typing helpers ───────────────────────────────────────────────────────────

function getOrCreateTypingState(slide) {
  if (!slideTypingState.has(slide)) {
    slideTypingState.set(slide, {
      timeouts: [],
      isTyping: false,
      plan: null,
      index: 0,
      danceIndex: 0,
    });
  }
  return slideTypingState.get(slide);
}

function clearSlideTyping(slide) {
  if (!slide) return;
  const state = slideTypingState.get(slide);
  if (!state) return;
  state.timeouts.forEach(clearTimeout);
  state.timeouts = [];
  state.isTyping = false;
  state.plan = null;
  state.index = 0;
  state.danceIndex = 0;
}

function isDanceSkillsSlide(slide) {
  return !!slide?.querySelector("#gift-img-dance-skills");
}
function isFirstGiftSlide(slide) {
  return slide?.id === "first-gift-slide";
}
function isGiftRevealed(giftEl) {
  return !!giftEl?.classList?.contains("revealed");
}
function isTypingElementDone(el) {
  return (el?.textContent || "").trim().length > 0;
}

function armTypingForSlide(slide) {
  if (slide) slide.dataset.twArmed = "true";
}
function disarmTypingForSlide(slide) {
  if (slide) slide.dataset.twArmed = "false";
}
function isTypingArmedForSlide(slide) {
  return slide?.dataset.twArmed === "true";
}

function getStoryTypingElements(slide) {
  if (!slide) return [];
  const isStorySlide = !!slide.querySelector("#gift-img-story");
  return Array.from(slide.querySelectorAll("h1, h2, h3, h4, p"))
    .filter((el) => !el.classList.contains("typewriter"))
    .filter(
      (el) => !(isFirstGiftSlide(slide) && el.classList.contains("gift-hint")),
    )
    .filter((el) => !(isStorySlide && el.classList.contains("gift-hint")));
}

function prepareStoryElementsForSlide(slide) {
  if (!slide) return;
  if (slide.dataset.twPrepared === "true") return;
  slide.dataset.twPrepared = "true";

  getStoryTypingElements(slide).forEach((el) => {
    if (el.dataset.twFullText != null) return;

    el.dataset.twFullText = el.textContent || "";

    if (!prefersReducedMotion) {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        el.dataset.twMinHeight = String(rect.height);
        el.style.minHeight = `${rect.height}px`;
      }
      el.textContent = "";
    }
  });
}

function resetStoryElements(slide) {
  if (!slide) return;

  getStoryTypingElements(slide).forEach((el) => {
    if (el.dataset.twFullText == null) return;

    if (!prefersReducedMotion) {
      const full = el.dataset.twFullText;
      el.textContent = full;

      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        el.dataset.twMinHeight = String(rect.height);
        el.style.minHeight = `${rect.height}px`;
      }

      el.textContent = "";
    } else {
      el.textContent = el.dataset.twFullText;
    }
  });
}

function resetFirstGiftSlideText(slide) {
  if (!isFirstGiftSlide(slide)) return;
  const title = slide.querySelector(".first-gift-text .gift-title");
  if (title?.dataset.twFullText != null) {
    title.textContent = prefersReducedMotion ? title.dataset.twFullText : "";
  }
}

function resetDanceSkillsText(slide) {
  if (!isDanceSkillsSlide(slide)) return;
  const state = getOrCreateTypingState(slide);
  state.danceIndex = 0;
  Array.from(slide.querySelectorAll(".dance-text .gift-title")).forEach(
    (el) => {
      if (el.dataset.twFullText == null)
        el.dataset.twFullText = el.textContent || "";
      if (!prefersReducedMotion) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          el.dataset.twMinHeight = String(rect.height);
          el.style.minHeight = `${rect.height}px`;
        }
        el.textContent = "";
      }
    },
  );
}

function typeTextIntoElement(el, fullText, state, onDone) {
  if (prefersReducedMotion) {
    el.textContent = fullText;
    onDone();
    return;
  }
  el.textContent = "";
  let i = 0;
  const step = () => {
    if (!state.isTyping) return;
    el.textContent = fullText.slice(0, ++i);
    if (i >= fullText.length) {
      const id = setTimeout(() => {
        const slide = el.closest?.(".slide");
        if (
          slide?.id === "kiss-again-slide" &&
          el === slide.querySelector("h2.gift-title")
        ) {
          if (
            isGiftRevealed(slide.querySelector("#gift-img-kiss6")) &&
            isGiftRevealed(slide.querySelector("#gift-img-kiss7"))
          ) {
            startAgainFill(slide);
          }
        }
        const searchScene = slide?.querySelector(".search-scene");
        const triggerEl = searchScene?.previousElementSibling;

        if (
          slide &&
          triggerEl &&
          el === triggerEl &&
          slide.querySelector("#search-spawn") &&
          searchSpawnIntervalId == null
        ) {
          setTimeout(() => startSearchSpawn(slide), 120);
        }
        onDone();
      }, 380);
      state.timeouts.push(id);
      return;
    }
    const id = setTimeout(
      step,
      fullText[i - 1] === " " ? TYPING.spaceMs : TYPING.charMs,
    );
    state.timeouts.push(id);
  };
  step();
}

function buildSlideTypingPlan(slide) {
  if (!slide) return [];
  const nodes = Array.from(
    slide.querySelectorAll("h1, h2, h3, h4, p, .gift-img"),
  );

  const findNextGift = (startIdx) => {
    for (let i = startIdx + 1; i < nodes.length; i++) {
      if (nodes[i]?.classList?.contains("gift-img")) return nodes[i];
    }
    return null;
  };

  return nodes
    .filter(
      (node) =>
        !node.classList.contains("gift-img") &&
        !node.classList.contains("typewriter"),
    )
    .filter(
      (node) =>
        !(isFirstGiftSlide(slide) && node.classList.contains("gift-hint")),
    )
    .filter(
      (node) =>
        !(
          slide.querySelector("#gift-img-story") &&
          node.classList.contains("gift-hint")
        ),
    )
    .map((node) => {
      if (node.dataset.twFullText == null)
        node.dataset.twFullText = node.textContent || "";
      return { el: node };
    });
}

function runTypingAdvance(slide, elements, state) {
  const advance = () => {
    if (!state.isTyping) return;
    const next = elements.find((it) => !isTypingElementDone(it.el));
    if (!next) {
      state.isTyping = false;
      return;
    }
    const fullText = next.el.dataset.twFullText ?? (next.el.textContent || "");
    typeTextIntoElement(next.el, fullText, state, () => {
      state.index++;
      state.timeouts.push(setTimeout(advance, TYPING.lineGapMs));
    });
  };
  advance();
}

function startStoryTypingForSlide(slide) {
  if (!slide) return;
  clearSlideTyping(slide);
  const state = getOrCreateTypingState(slide);
  state.isTyping = true;
  state.plan = buildSlideTypingPlan(slide)
    .filter(Boolean)
    .filter(
      (item) =>
        (item.el.dataset.twFullText ?? item.el.textContent ?? "").trim()
          .length > 0,
    );
  if (prefersReducedMotion) {
    state.plan.forEach(({ el }) => {
      el.textContent = el.dataset.twFullText ?? el.textContent;
    });
    return;
  }
  runTypingAdvance(slide, state.plan, state);
}

function continueStoryTypingForSlide(slide) {
  if (!slide) return;
  const state = getOrCreateTypingState(slide);
  if (!state.plan?.length || prefersReducedMotion || state.isTyping) return;
  state.isTyping = true;
  runTypingAdvance(slide, state.plan, state);
}

function maybeTypeNextDanceLine(slide) {
  if (!isDanceSkillsSlide(slide) || prefersReducedMotion) return;
  const state = getOrCreateTypingState(slide);
  if (state.isTyping) return;
  const lines = Array.from(slide.querySelectorAll(".dance-text .gift-title"));
  const revealed = slide.querySelectorAll(".gift-img.revealed").length;
  if (revealed <= state.danceIndex || state.danceIndex >= lines.length) return;

  const el = lines[state.danceIndex];
  if (!el) return;
  const fullText = el.dataset.twFullText ?? el.textContent ?? "";
  state.isTyping = true;
  updateScrollableSlides();
  typeTextIntoElement(el, fullText, state, () => {
    state.danceIndex++;
    state.isTyping = false;
    updateScrollableSlides();
    state.timeouts.push(
      setTimeout(() => maybeTypeNextDanceLine(slide), TYPING.lineGapMs),
    );
  });
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function normalizeQuizAnswer(value) {
  return (value || "").trim().toLowerCase();
}

function renderQuizStep() {
  const step = QUIZ_STEPS[quizStepIndex];
  if (quizQuestion && step) quizQuestion.textContent = step.question;
  if (quizFeedback)
    quizFeedback.textContent = `Question ${quizStepIndex + 1} of ${QUIZ_STEPS.length}`;
  if (quizAnswer) {
    quizAnswer.value = "";
    quizAnswer.focus();
  }
}

function setLockedState(isLocked) {
  document.body.classList.toggle("is-locked", isLocked);
  if (isLocked && quizAnswer) quizAnswer.focus();
}

function isUnlocked() {
  try {
    return window.localStorage.getItem(QUIZ_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function unlockQuizGate() {
  try {
    window.localStorage.setItem(QUIZ_STORAGE_KEY, "true");
  } catch {
    /* ignore */
  }
  setLockedState(false);
  updateScrollableSlides(true);
  updateNav();
}

if (quizForm) {
  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const answer = normalizeQuizAnswer(quizAnswer?.value);
    const step = QUIZ_STEPS[quizStepIndex];
    if (step?.answers.includes(answer)) {
      quizStepIndex++;
      if (quizStepIndex >= QUIZ_STEPS.length) {
        if (quizFeedback)
          quizFeedback.textContent = "Unlocked. Happy birthday 🎂";
        unlockQuizGate();
      } else {
        renderQuizStep();
      }
    } else {
      // Wrong answer: stay on the same question, don't reset to step 0
      if (quizFeedback) quizFeedback.textContent = "Nope — try again.";
      quizAnswer?.select();
    }
  });
}

// ─── Gift reveal ──────────────────────────────────────────────────────────────

function getRevealImageUrl(gift) {
  const raw =
    window.getComputedStyle(gift).getPropertyValue("--reveal-image") || "";
  const m = raw.match(/url\((['"]?)(.*?)\1\)/);
  return m?.[2] || "";
}

function prefetchRevealImagesForSlide(slide) {
  if (!slide) return;

  const gifts = Array.from(slide.querySelectorAll(".gift-img"));
  gifts.forEach((gift) => {
    const url = getRevealImageUrl(gift);
    if (!url) return;

    if (gift.dataset.revealPrefetched === "true") return;
    gift.dataset.revealPrefetched = "true";

    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
  });
}

function waitForFirstRevealImage(slide, timeoutMs = 800) {
  if (!slide) return Promise.resolve();

  const firstGift = slide.querySelector(".gift-img");
  if (!firstGift) return Promise.resolve();

  const url = getRevealImageUrl(firstGift);
  if (!url) return Promise.resolve();

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    const img = new Image();
    img.onload = finish;
    img.onerror = finish;
    img.src = url;

    setTimeout(finish, timeoutMs);
  });
}

function fitGiftToRevealImage(gift) {
  if (!gift?.classList.contains("revealed")) return;
  const url = getRevealImageUrl(gift);
  if (!url) return;
  const cached = gift.dataset.revealAr;
  if (cached) {
    const slide = gift.closest?.(".slide");
    if (slide && isDanceSkillsSlide(slide))
      gift.style.setProperty("--gift-ar", cached);
    gift.style.aspectRatio = cached;
    updateScrollableSlides();
    return;
  }

  const img = new Image();
  img.onload = () => {
    if (!gift.classList.contains("revealed")) return;
    const slide = gift.closest?.(".slide");
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return;

    if (slide && isDanceSkillsSlide(slide)) {
      const ar = `${w0} / ${h0}`;
      gift.dataset.revealAr = ar;
      gift.style.setProperty("--gift-ar", ar);
      gift.style.aspectRatio = ar; // optional but consistent
      updateScrollableSlides();
      return;
    }

    const ratio = w0 / h0;
    const maxW = Math.min(window.innerWidth * 0.9, 520);
    const maxH = Math.min(window.innerHeight * 0.52, 520);
    let w = maxW,
      h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }

    gift.style.width = `${Math.round(w)}px`;
    gift.style.height = "auto";
    const ar = `${w0} / ${h0}`;
    gift.dataset.revealAr = ar;
    gift.style.aspectRatio = ar;
    updateScrollableSlides();
  };
  img.src = url;
}

// ─── Slide management ─────────────────────────────────────────────────────────

function suspendSlideGifs(index) {
  slides[index]?.querySelectorAll(".gift-img").forEach((gift) => {
    gift.classList.remove("revealed");
    gift.style.removeProperty("--reveal-image");
  });
}

function setActiveSlide(index) {
  if (index === activeSlideIndex) return;

  if (activeSlideIndex >= 0) {
    const prev = slides[activeSlideIndex];
    prev?.classList.remove("is-active");
    suspendSlideGifs(activeSlideIndex);
    if (prev) {
      clearSlideTyping(prev);
      resetStoryElements(prev);
      disarmTypingForSlide(prev);
    }
    stopSearchSpawn();
    stopAgainFill();
  }

  activeSlideIndex = index;
  const next = slides[activeSlideIndex];
  next?.classList.add("is-active");

  scheduleIdle(() => prefetchRevealImagesForSlide(next));
  scheduleIdle(() => prefetchRevealImagesForSlide(slides[index + 1]));

  updateScrollableSlides();

  if (next) {
    const shouldType = next?.id !== "header";
    if (shouldType) {
      prepareStoryElementsForSlide(next);
      resetStoryElements(next);

      revealAllGiftsForSlide(next);

      waitForFirstRevealImage(next).then(() => {
        armTypingForSlide(next);
        startStoryTypingForSlide(next);
      });
    }

    if (next.id === "kiss-again-slide") armAgainFill(next);

    const searchTarget = next.querySelector("#search-spawn");
    if (searchTarget) {
      stopSearchSpawn();
      searchTarget.textContent = "";
      searchTarget.closest(".search-lines")?.classList.add("is-hidden");
    }
  }
}

function updateScrollableSlides(fullRecompute = false) {
  const targets = fullRecompute
    ? slides
    : [slides[activeSlideIndex]].filter(Boolean);
  targets.forEach((slide) => {
    slide.style.removeProperty("--nav-safe-pad");
    slide.classList.toggle(
      "is-scrollable",
      slide.scrollHeight > slide.clientHeight,
    );
  });
}

function getCurrentIndex() {
  const pageWidth = swipeContainer?.clientWidth || window.innerWidth;
  return Math.round((swipeContainer?.scrollLeft || 0) / pageWidth);
}

function updateNav() {
  const index = getCurrentIndex();
  const total = slides.length || 1;
  if (pageIndicator) pageIndicator.textContent = `${index + 1} / ${total}`;
  if (prevBtn) prevBtn.disabled = index <= 0;
  if (nextBtn) nextBtn.disabled = index >= total - 1;
  updateProgressBar(index);
  setActiveSlide(index);
}

function goToIndex(index) {
  if (!swipeContainer) return;
  const pageWidth = swipeContainer.clientWidth || window.innerWidth;
  swipeContainer.scrollTo({
    left: Math.max(0, Math.min(index, slides.length - 1)) * pageWidth,
    behavior: "smooth",
  });
}

prevBtn?.addEventListener("click", () => goToIndex(getCurrentIndex() - 1));
nextBtn?.addEventListener("click", () => goToIndex(getCurrentIndex() + 1));

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown")
    goToIndex(getCurrentIndex() + 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowUp")
    goToIndex(getCurrentIndex() - 1);
});

let navRafPending = false;
swipeContainer?.addEventListener(
  "scroll",
  () => {
    if (navRafPending) return;
    navRafPending = true;
    requestAnimationFrame(() => {
      navRafPending = false;
      updateNav();
    });
  },
  { passive: true },
);

window.addEventListener("resize", () => {
  updateScrollableSlides(true);
  updateNav();
});

if (swipeContainer) {
  swipeContainer.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const slide = slides[getCurrentIndex()];
      if (slide) {
        const canScroll = slide.scrollHeight > slide.clientHeight;
        if (canScroll) {
          const atTop = slide.scrollTop <= 0;
          const atBottom =
            slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 1;
          if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return;
        }
      }
      e.preventDefault();
      swipeContainer.scrollBy({ left: e.deltaY, behavior: "smooth" });
    },
    { passive: false },
  );
}

// ─── DOM prep ─────────────────────────────────────────────────────────────────

function revealAllGiftsForSlide(slide) {
  if (!slide) return;
  const gifts = Array.from(slide.querySelectorAll(".gift-img"));
  gifts.forEach((gift) => {
    if (gift.classList.contains("revealed")) return;
    gift.classList.add("revealed");
    fitGiftToRevealImage(gift);
  });
  updateScrollableSlides();
}

function wrapGiftArticleText() {
  document.querySelectorAll(".gift-article").forEach((article) => {
    const directGifts = Array.from(article.children).filter((el) =>
      el.classList?.contains("gift-img"),
    );
    if (article.querySelector(":scope > .gift-text")) return;

    if (directGifts.length === 1) {
      const wrapper = document.createElement("div");
      wrapper.className = "gift-text";
      Array.from(article.children).forEach((child) => {
        if (child !== directGifts[0]) wrapper.appendChild(child);
      });
      article.appendChild(wrapper);
      article.classList.add("has-gift-text");
    } else if (directGifts.length === 2) {
      if (article.id === "first-date-lift-slide") return;
      if (
        article.querySelector(
          ":scope > .dance-collage, :scope > .search-scene, :scope > .float-text",
        )
      )
        return;

      const wrapper = document.createElement("div");
      wrapper.className = "gift-text";
      Array.from(article.children).forEach((child) => {
        if (child !== directGifts[0] && child !== directGifts[1])
          wrapper.appendChild(child);
      });
      article.insertBefore(wrapper, directGifts[1]);
      article.classList.add("has-gift-text", "two-gift-horizontal");
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

wrapGiftArticleText();
document
  .querySelectorAll(".gift-hint")
  .forEach((h) => h.classList.remove("is-hidden"));
document
  .querySelectorAll(".gift-img.revealed")
  .forEach((gift) => fitGiftToRevealImage(gift));

if (isUnlocked()) {
  setLockedState(false);
} else {
  setLockedState(true);
  renderQuizStep();
}

updateScrollableSlides(true);
updateNav();
suspendSlideGifs(getCurrentIndex() === -1 ? 0 : getCurrentIndex());
