const swipeContainer = document.getElementById('swipe-container')
const slides = swipeContainer ? Array.from(swipeContainer.querySelectorAll('.slide')) : []
const prevBtn = document.getElementById('prev-page')
const nextBtn = document.getElementById('next-page')
const pageIndicator = document.getElementById('page-indicator')

const quizForm = document.getElementById('quiz-form')
const quizAnswer = document.getElementById('quiz-answer')
const quizFeedback = document.getElementById('quiz-feedback')
const quizQuestion = document.getElementById('quiz-question')

const QUIZ_STEPS = [
    {
        question: 'What’s my favorite ice cream flavor?',
        answers: ['vanilla'],
    },
    {
        question: 'What’s my favorite color?',
        answers: ['cypress'],
    },
    {
        question: 'What’s my favorite food?',
        answers: ['mousakas'],
    },
]

let quizStepIndex = 0

const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const slideTypingState = new Map()

const STORY_TYPING_SPEED = {
    charMs: 32,
    spaceMs: 14,
    lineGapMs: 420,
    slideStartDelayMs: 120,
}

let searchSpawnIntervalId = null

function startSearchSpawn(slide) {
    const target = document.getElementById('search-spawn')
    if (!slide || !target) return

    const lines = ['and you were looking...', 'and looking...', 'still looking...', '...and looking...']
    let i = 0

    target.textContent = ''
    target.classList.remove('search-spawn')

    const tick = () => {
        target.textContent = lines[i % lines.length]
        target.classList.remove('search-spawn')
        void target.offsetWidth
        target.classList.add('search-spawn')
        i += 1
    }

    tick()
    searchSpawnIntervalId = window.setInterval(tick, 1100)
}

function stopSearchSpawn() {
    if (searchSpawnIntervalId != null) {
        window.clearInterval(searchSpawnIntervalId)
        searchSpawnIntervalId = null
    }
}

function getStoryTypingElements(slide) {
    if (!slide) return []
    return Array.from(slide.querySelectorAll('h1, h2, h3, h4, p'))
        .filter((el) => !el.classList.contains('typewriter'))
}

function getOrCreateTypingState(slide) {
    if (!slideTypingState.has(slide)) {
        slideTypingState.set(slide, { timeouts: [], isTyping: false })
    }
    return slideTypingState.get(slide)
}

function clearSlideTyping(slide) {
    if (!slide) return
    const state = slideTypingState.get(slide)
    if (!state) return
    state.timeouts.forEach((id) => window.clearTimeout(id))
    state.timeouts = []
    state.isTyping = false
}

function prepareStoryElements() {
    slides.forEach((slide) => {
        getStoryTypingElements(slide).forEach((el) => {
            if (el.dataset.twFullText != null) return
            el.dataset.twFullText = el.textContent || ''
            if (!prefersReducedMotion) {
                el.textContent = ''
            }
        })
    })
}

function resetStoryElements(slide) {
    if (!slide) return
    getStoryTypingElements(slide).forEach((el) => {
        if (el.dataset.twFullText == null) return
        if (!prefersReducedMotion) {
            el.textContent = ''
        } else {
            el.textContent = el.dataset.twFullText
        }
    })
}

function typeTextIntoElement(el, fullText, state, onDone) {
    if (prefersReducedMotion) {
        el.textContent = fullText
        onDone()
        return
    }
    el.textContent = ''
    let i = 0
    const step = () => {
        if (!state.isTyping) return
        i += 1
        el.textContent = fullText.slice(0, i)
        if (i >= fullText.length) {
            const doneId = window.setTimeout(onDone, 380)
            state.timeouts.push(doneId)
            return
        }
        const delay = fullText[i - 1] === ' ' ? STORY_TYPING_SPEED.spaceMs : STORY_TYPING_SPEED.charMs
        const id = window.setTimeout(step, delay)
        state.timeouts.push(id)
    }
    step()
}

function startStoryTypingForSlide(slide) {
    if (!slide) return
    clearSlideTyping(slide)
    const state = getOrCreateTypingState(slide)
    state.isTyping = true

    const elements = getStoryTypingElements(slide)
        .filter((el) => (el.dataset.twFullText != null ? el.dataset.twFullText.trim().length > 0 : (el.textContent || '').trim().length > 0))

    if (prefersReducedMotion) {
        elements.forEach((el) => {
            const text = el.dataset.twFullText != null ? el.dataset.twFullText : (el.textContent || '')
            el.textContent = text
        })
        return
    }

    let idx = 0
    const next = () => {
        if (!state.isTyping) return
        const el = elements[idx]
        if (!el) return
        const fullText = el.dataset.twFullText != null ? el.dataset.twFullText : (el.textContent || '')
        typeTextIntoElement(el, fullText, state, () => {
            idx += 1
            if (idx < elements.length) {
                const id = window.setTimeout(next, STORY_TYPING_SPEED.lineGapMs)
                state.timeouts.push(id)
            }
        })
    }
    next()
}

function armTypingForSlide(slide) {
    if (!slide) return
    slide.dataset.twArmed = 'true'
}

function disarmTypingForSlide(slide) {
    if (!slide) return
    slide.dataset.twArmed = 'false'
}

function isTypingArmedForSlide(slide) {
    return !!slide && slide.dataset.twArmed === 'true'
}

function normalizeQuizAnswer(value) {
    return (value || '').trim().toLowerCase()
}

function renderQuizStep() {
    const step = QUIZ_STEPS[quizStepIndex]
    if (quizQuestion && step) quizQuestion.textContent = step.question
    if (quizFeedback) quizFeedback.textContent = `Question ${quizStepIndex + 1} of ${QUIZ_STEPS.length}`
    if (quizAnswer) {
        quizAnswer.value = ''
        quizAnswer.focus()
    }
}

function setLockedState(isLocked) {
    document.body.classList.toggle('is-locked', isLocked)
    if (isLocked) {
        if (quizAnswer) quizAnswer.focus()
    }
}

function unlockQuizGate() {
    setLockedState(false)
    updateScrollableSlides(true)
    updateNav()
}

const tapRevealGifts = Array.from(document.querySelectorAll('.gift-img'))

const giftSections = Array.from(document.querySelectorAll('.gift-section'))

function clearInlineRevealImage(gift) {
    gift.style.removeProperty('--reveal-image')
}

function setCacheBustedRevealImage(gift) {
    const raw = window.getComputedStyle(gift).getPropertyValue('--reveal-image').trim()
    if (!raw) return
    const match = /url\((['"]?)(.*?)\1\)/.exec(raw)
    if (!match) return
    const baseUrl = match[2].split('?')[0]
    gift.style.setProperty('--reveal-image', `url("${baseUrl}?v=${Date.now()}")`)
}

function applyHintVisibility() {
    document.querySelectorAll('.gift-hint').forEach((hint) => hint.classList.remove('is-hidden'))
}

function wrapGiftSectionText() {
    giftSections.forEach((section) => {
        const directGiftImages = Array.from(section.children).filter((el) => el.classList && el.classList.contains('gift-img'))
        if (directGiftImages.length !== 1) return

        if (section.querySelector(':scope > .gift-text')) return

        const wrapper = document.createElement('div')
        wrapper.className = 'gift-text'

        Array.from(section.children).forEach((child) => {
            if (child === directGiftImages[0]) return
            wrapper.appendChild(child)
        })

        section.appendChild(wrapper)
    })
}

wrapGiftSectionText()
applyHintVisibility()

prepareStoryElements()
slides.forEach((slide) => resetStoryElements(slide))

setLockedState(true)
renderQuizStep()

if (quizForm) {
    quizForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const answer = normalizeQuizAnswer(quizAnswer ? quizAnswer.value : '')
        const step = QUIZ_STEPS[quizStepIndex]
        const ok = step ? step.answers.includes(answer) : false
        if (ok) {
            quizStepIndex += 1
            if (quizStepIndex >= QUIZ_STEPS.length) {
                if (quizFeedback) quizFeedback.textContent = 'Unlocked. Happy birthday :)'
                unlockQuizGate()
            } else {
                renderQuizStep()
            }
        } else {
            quizStepIndex = 0
            if (quizFeedback) quizFeedback.textContent = 'Nope — try again.'
            if (quizAnswer) quizAnswer.select()
            renderQuizStep()
        }
    })
}

function toggleGiftReveal(gift) {
    const nextState = !gift.classList.contains('revealed')
    if (nextState) {
        clearInlineRevealImage(gift)
        gift.classList.add('revealed')
        setCacheBustedRevealImage(gift)
    } else {
        gift.classList.remove('revealed')
        clearInlineRevealImage(gift)
    }
    gift.dataset.wasRevealed = gift.classList.contains('revealed') ? 'true' : 'false'
    updateScrollableSlides()

    if (nextState) {
        const slide = gift.closest('.slide')
        if (slide && isTypingArmedForSlide(slide)) {
            disarmTypingForSlide(slide)
            window.setTimeout(() => startStoryTypingForSlide(slide), STORY_TYPING_SPEED.slideStartDelayMs)
        }
    }
}

tapRevealGifts.forEach((gift) => {
    gift.classList.add('tap-reveal')

    gift.addEventListener('pointerup', (e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleGiftReveal(gift)
    })
})

let activeSlideIndex = -1

function suspendSlideGifs(index) {
    const slide = slides[index]
    if (!slide) return
    const gifts = Array.from(slide.querySelectorAll('.gift-img'))
    gifts.forEach((gift) => {
        gift.classList.remove('revealed')
        clearInlineRevealImage(gift)
        gift.dataset.wasRevealed = 'false'
    })
}

function resumeSlideGifs(index) {
    const slide = slides[index]
    if (!slide) return
    const gifts = Array.from(slide.querySelectorAll('.gift-img'))
    gifts.forEach((gift) => {
        gift.dataset.wasRevealed = gift.classList.contains('revealed') ? 'true' : 'false'
    })
}

function snapshotSlideGifState(index) {
    const slide = slides[index]
    if (!slide) return
    const gifts = Array.from(slide.querySelectorAll('.gift-img'))
    gifts.forEach((gift) => {
        gift.dataset.wasRevealed = gift.classList.contains('revealed') ? 'true' : 'false'
    })
}

function suspendAllOffscreenSlides(activeIndex) {
    slides.forEach((_, i) => {
        if (i !== activeIndex) {
            suspendSlideGifs(i)
        }
    })
}

function setActiveSlide(index) {
    if (index === activeSlideIndex) return

    if (activeSlideIndex >= 0) {
        const prevSlide = slides[activeSlideIndex]
        if (prevSlide) prevSlide.classList.remove('is-active')
        suspendSlideGifs(activeSlideIndex)
        if (prevSlide) {
            clearSlideTyping(prevSlide)
            resetStoryElements(prevSlide)
            disarmTypingForSlide(prevSlide)
        }
        stopSearchSpawn()
    }

    activeSlideIndex = index
    const nextSlide = slides[activeSlideIndex]
    if (nextSlide) nextSlide.classList.add('is-active')
    resumeSlideGifs(activeSlideIndex)
    updateScrollableSlides()
    if (nextSlide) {
        resetStoryElements(nextSlide)
        armTypingForSlide(nextSlide)
        const hasGifts = !!nextSlide.querySelector('.gift-img')
        if (!hasGifts) {
            disarmTypingForSlide(nextSlide)
            window.setTimeout(() => startStoryTypingForSlide(nextSlide), STORY_TYPING_SPEED.slideStartDelayMs)
        }

        if (nextSlide.querySelector('#search-spawn')) {
            startSearchSpawn(nextSlide)
        }
    }
}

function updateScrollableSlides(fullRecompute = false) {
    if (fullRecompute) {
        slides.forEach((slide) => {
            slide.classList.remove('is-scrollable')
        })

        slides.forEach((slide) => {
            if (slide.scrollHeight > slide.clientHeight) {
                slide.classList.add('is-scrollable')
            }
        })
        return
    }

    const slide = slides[activeSlideIndex]
    if (!slide) return

    slide.classList.remove('is-scrollable')
    if (slide.scrollHeight > slide.clientHeight) {
        slide.classList.add('is-scrollable')
    }
}

function getCurrentIndex() {
    if (!swipeContainer) return 0
    const pageWidth = swipeContainer.clientWidth || window.innerWidth
    return Math.round(swipeContainer.scrollLeft / pageWidth)
}

function updateNav() {
    const index = getCurrentIndex()
    const total = slides.length || 1
    if (pageIndicator) pageIndicator.textContent = `${index + 1} / ${total}`
    if (prevBtn) prevBtn.disabled = index <= 0
    if (nextBtn) nextBtn.disabled = index >= total - 1

    setActiveSlide(index)
}

function goToIndex(index) {
    if (!swipeContainer) return
    const clamped = Math.max(0, Math.min(index, slides.length - 1))
    const pageWidth = swipeContainer.clientWidth || window.innerWidth
    swipeContainer.scrollTo({ left: clamped * pageWidth, behavior: 'smooth' })
}

if (prevBtn) prevBtn.addEventListener('click', () => goToIndex(getCurrentIndex() - 1))
if (nextBtn) nextBtn.addEventListener('click', () => goToIndex(getCurrentIndex() + 1))

let navRafPending = false
function scheduleNavUpdate() {
    if (navRafPending) return
    navRafPending = true
    window.requestAnimationFrame(() => {
        navRafPending = false
        updateNav()
    })
}

if (swipeContainer) swipeContainer.addEventListener('scroll', scheduleNavUpdate, { passive: true })

window.addEventListener('resize', () => {
    updateScrollableSlides(true)
    updateNav()
})

if (swipeContainer) {
    swipeContainer.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return

        const index = getCurrentIndex()
        const currentSlide = slides[index]
        if (!currentSlide) return

        const canScrollVertically = currentSlide.scrollHeight > currentSlide.clientHeight
        if (canScrollVertically) {
            const atTop = currentSlide.scrollTop <= 0
            const atBottom = currentSlide.scrollTop + currentSlide.clientHeight >= currentSlide.scrollHeight - 1

            if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
                return
            }
        }

        e.preventDefault()
        swipeContainer.scrollBy({ left: e.deltaY, behavior: 'smooth' })
    }, { passive: false })
}

updateScrollableSlides(true)
updateNav()

snapshotSlideGifState(getCurrentIndex())
suspendAllOffscreenSlides(getCurrentIndex())
