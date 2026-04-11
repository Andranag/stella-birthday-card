const swipeContainer = document.getElementById('swipe-container')
const slides = swipeContainer ? Array.from(swipeContainer.querySelectorAll('.slide')) : []
const prevBtn = document.getElementById('prev-page')
const nextBtn = document.getElementById('next-page')
const pageIndicator = document.getElementById('page-indicator')

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
    }

    activeSlideIndex = index
    const nextSlide = slides[activeSlideIndex]
    if (nextSlide) nextSlide.classList.add('is-active')
    resumeSlideGifs(activeSlideIndex)
    updateScrollableSlides()
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
