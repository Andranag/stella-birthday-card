// Disney Birthday Card - Interactive Book Navigation

class BookNavigation {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.slide');
        this.totalSlides = this.slides.length;
        this.isAnimating = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        this.init();
    }

    init() {
        this.createNavigationButtons();
        this.createBookmark();
        this.addEventListeners();
        this.updateProgress();
        this.showSlide(0);
        this.addSparkles();
    }

    createNavigationButtons() {
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-button prev';
        prevBtn.innerHTML = '«';
        prevBtn.setAttribute('aria-label', 'Previous page');
        document.body.appendChild(prevBtn);

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-button next';
        nextBtn.innerHTML = '»';
        nextBtn.setAttribute('aria-label', 'Next page');
        document.body.appendChild(nextBtn);
    }

    createBookmark() {
        const bookmark = document.createElement('div');
        bookmark.className = 'bookmark';
        bookmark.setAttribute('aria-label', 'Bookmark');
        document.body.appendChild(bookmark);
    }

    addEventListeners() {
        // Navigation buttons
        document.querySelector('.nav-button.prev').addEventListener('click', () => this.previousSlide());
        document.querySelector('.nav-button.next').addEventListener('click', () => this.nextSlide());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.previousSlide();
                    break;
                case 'ArrowRight':
                    this.nextSlide();
                    break;
                case 'Home':
                    this.goToSlide(0);
                    break;
                case 'End':
                    this.goToSlide(this.totalSlides - 1);
                    break;
            }
        });

        // Touch/swipe navigation
        const container = document.getElementById('swipe-container');
        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });

        // Mouse wheel navigation
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
                this.nextSlide();
            } else {
                this.previousSlide();
            }
        }, { passive: false });

        // Sound buttons
        document.querySelectorAll('.text-to-sound').forEach(button => {
            button.addEventListener('click', (e) => this.playSound(e));
        });

        // Hint buttons
        document.querySelectorAll('.peek-hint').forEach(button => {
            button.addEventListener('click', (e) => this.toggleHint(e));
        });
    }

    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
    }

    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.previousSlide();
            }
        }
    }

    showSlide(index) {
        if (this.isAnimating || index < 0 || index >= this.totalSlides) return;

        this.isAnimating = true;

        // Hide all slides
        this.slides.forEach((slide, i) => {
            slide.style.display = 'none';
            slide.classList.remove('active');
        });

        // Show current slide with animation
        const currentSlideEl = this.slides[index];
        currentSlideEl.style.display = 'grid';
        currentSlideEl.classList.add('turning');

        setTimeout(() => {
            currentSlideEl.classList.remove('turning');
            currentSlideEl.classList.add('active');
            this.isAnimating = false;
        }, 800);

        this.currentSlide = index;
        this.updateProgress();
        this.updateNavigationButtons();
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.showSlide(this.currentSlide + 1);
        }
        // Removed looping - stay at last page
    }

    previousSlide() {
        if (this.currentSlide > 0) {
            this.showSlide(this.currentSlide - 1);
        }
        // Removed looping - stay at first page
    }

    goToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.showSlide(index);
        }
    }

    updateProgress() {
        const progress = ((this.currentSlide + 1) / this.totalSlides) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
    }

    updateNavigationButtons() {
        const prevBtn = document.querySelector('.nav-button.prev');
        const nextBtn = document.querySelector('.nav-button.next');

        // Update button states based on current position
        if (this.currentSlide === 0) {
            prevBtn.style.opacity = '0.5';
        } else {
            prevBtn.style.opacity = '1';
        }

        if (this.currentSlide === this.totalSlides - 1) {
            nextBtn.style.opacity = '0.5';
        } else {
            nextBtn.style.opacity = '1';
        }
    }

    playSound(e) {
        const button = e.target;
        const soundFile = button.getAttribute('data-sound');
        
        if (soundFile) {
            // Create audio element
            const audio = new Audio(soundFile);
            audio.play().catch(err => {
                console.log('Audio play failed:', err);
            });

            // Visual feedback
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
            }, 200);
        }
    }

    toggleHint(e) {
        const button = e.target;
        const isSpoiler = button.getAttribute('data-label') === 'spoiler';
        
        if (isSpoiler) {
            // Toggle spoiler visibility
            if (button.style.opacity === '0.3') {
                button.style.opacity = '1';
                button.style.filter = 'none';
            } else {
                button.style.opacity = '0.3';
                button.style.filter = 'blur(4px)';
            }
        }

        // Visual feedback
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 200);
    }

    addSparkles() {
        // Add random sparkle effects to create Disney magic
        setInterval(() => {
            if (Math.random() > 0.7) {
                this.createSparkle();
            }
        }, 2000);
    }

    createSparkle() {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * window.innerWidth + 'px';
        sparkle.style.top = Math.random() * window.innerHeight + 'px';
        sparkle.style.animationDelay = Math.random() * 2 + 's';
        
        document.body.appendChild(sparkle);

        // Remove sparkle after animation
        setTimeout(() => {
            sparkle.remove();
        }, 2000);
    }
}

// Page turn effects
class PageTurnEffects {
    constructor() {
        this.init();
    }

    init() {
        this.addPageCurlEffect();
        this.addBookSoundEffects();
    }

    addPageCurlEffect() {
        // Add subtle page curl animation on hover
        const slides = document.querySelectorAll('.slide');
        slides.forEach(slide => {
            slide.addEventListener('mouseenter', () => {
                slide.style.transform = 'rotateY(2deg)';
            });

            slide.addEventListener('mouseleave', () => {
                slide.style.transform = 'rotateY(0deg)';
            });
        });
    }

    addBookSoundEffects() {
        // Create page turn sound effect (using Web Audio API for simple sound)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        window.playPageTurnSound = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        };
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const bookNav = new BookNavigation();
    const pageEffects = new PageTurnEffects();

    // Add page turn sound to navigation
    const originalNextSlide = bookNav.nextSlide.bind(bookNav);
    const originalPrevSlide = bookNav.previousSlide.bind(bookNav);
    
    bookNav.nextSlide = () => {
        if (window.playPageTurnSound) {
            window.playPageTurnSound();
        }
        originalNextSlide();
    };
    
    bookNav.previousSlide = () => {
        if (window.playPageTurnSound) {
            window.playPageTurnSound();
        }
        originalPrevSlide();
    };

    // Make bookNav globally accessible for debugging
    window.bookNav = bookNav;
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 1s ease-in';
        document.body.style.opacity = '1';
    }, 100);
});
