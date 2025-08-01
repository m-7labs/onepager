/**
 * PREMIUM DOMAIN SALES - ONE-PAGER TEMPLATE
 * Main JavaScript File
 * 
 * This file contains all the interactive functionality for the domain sales landing page.
 * Features include: mobile navigation, form validation, smooth scrolling, and analytics.
 */

// ==========================================================================
// GLOBAL CONFIGURATION
// ==========================================================================

const CONFIG = {
    // Animation settings
    SCROLL_OFFSET: 80,
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 150,

    // Form settings
    FORM_ENDPOINT: '/api/contact', // Replace with actual endpoint
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB

    // Validation patterns
    PATTERNS: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\+]?[\d\s\-\(\)]{10,}$/,
        name: /^[a-zA-Z\s]{2,50}$/
    },

    // Error messages
    MESSAGES: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a valid phone number',
        name: 'Please enter a valid name (2-50 characters)',
        minOffer: 'Minimum offer amount is $1,000',
        generic: 'Please correct the errors below'
    }
};

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

/**
 * Debounce function to limit the rate of function execution
 */
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

/**
 * Throttle function for scroll events
 */
function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

/**
 * Check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Smooth scroll to element
 */
function smoothScrollTo(element, offset = 0) {
    const targetPosition = element.offsetTop - offset;
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
}

/**
 * Show/hide element with animation
 */
function toggleElement(element, show) {
    if (show) {
        element.style.display = 'block';
        element.offsetHeight; // Force reflow
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    } else {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            element.style.display = 'none';
        }, CONFIG.ANIMATION_DURATION);
    }
}

// ==========================================================================
// NAVIGATION FUNCTIONALITY
// ==========================================================================

class Navigation {
    constructor() {
        this.header = document.querySelector('.header');
        this.mobileToggle = document.querySelector('.mobile-menu-toggle');
        this.navMenu = document.querySelector('.nav-menu');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.isMenuOpen = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupSmoothScrolling();
        this.setupScrollBehavior();
    }

    bindEvents() {
        // Mobile menu toggle
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Close menu when clicking nav links
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.isMenuOpen) {
                    this.toggleMobileMenu();
                }
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !this.header.contains(e.target)) {
                this.toggleMobileMenu();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.toggleMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;

        // Update ARIA attributes
        this.mobileToggle.setAttribute('aria-expanded', this.isMenuOpen);

        // Toggle classes
        this.navMenu.classList.toggle('nav-menu--open', this.isMenuOpen);
        this.mobileToggle.classList.toggle('mobile-menu-toggle--open', this.isMenuOpen);

        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
    }

    setupSmoothScrolling() {
        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        smoothScrollTo(target, CONFIG.SCROLL_OFFSET);
                    }
                });
            }
        });
    }

    setupScrollBehavior() {
        const scrollHandler = throttle(() => {
            const scrollY = window.scrollY;

            // Add/remove scrolled class for header styling
            this.header.classList.toggle('header--scrolled', scrollY > 50);

            // Update active navigation link
            this.updateActiveNavLink();
        }, 16);

        window.addEventListener('scroll', scrollHandler);
    }

    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollY = window.scrollY + CONFIG.SCROLL_OFFSET + 50;

        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        // Update active nav link
        this.navLinks.forEach(link => {
            link.classList.remove('nav-link--active');
            const href = link.getAttribute('href');
            if (href === `#${currentSection}`) {
                link.classList.add('nav-link--active');
            }
        });
    }
}

// ==========================================================================
// FORM VALIDATION & HANDLING
// ==========================================================================

class FormHandler {
    constructor() {
        this.form = document.querySelector('.contact-form');
        this.fields = {};
        this.isSubmitting = false;

        if (this.form) {
            this.init();
        }
    }

    init() {
        this.cacheFields();
        this.bindEvents();
        this.setupConditionalFields();
    }

    cacheFields() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            this.fields[input.name] = {
                element: input,
                errorElement: input.parentNode.querySelector('.form-error')
            };
        });
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        Object.values(this.fields).forEach(field => {
            field.element.addEventListener('blur', () => this.validateField(field));
            field.element.addEventListener('input', debounce(() => {
                if (field.element.classList.contains('error')) {
                    this.validateField(field);
                }
            }, CONFIG.DEBOUNCE_DELAY));
        });
    }

    setupConditionalFields() {
        const inquiryTypeSelect = this.fields.inquiryType?.element;
        const offerGroup = document.getElementById('offer-group');

        if (inquiryTypeSelect && offerGroup) {
            inquiryTypeSelect.addEventListener('change', () => {
                const shouldShow = inquiryTypeSelect.value === 'offer';
                offerGroup.style.display = shouldShow ? 'block' : 'none';

                // Update required attribute
                const offerInput = document.getElementById('offer-amount');
                if (offerInput) {
                    offerInput.required = shouldShow;
                }
            });
        }
    }

    validateField(field) {
        const { element, errorElement } = field;
        const value = element.value.trim();
        const fieldName = element.name;
        let error = '';

        // Required field validation
        if (element.required && !value) {
            error = CONFIG.MESSAGES.required;
        }
        // Email validation
        else if (fieldName === 'email' && value && !CONFIG.PATTERNS.email.test(value)) {
            error = CONFIG.MESSAGES.email;
        }
        // Phone validation
        else if (fieldName === 'phone' && value && !CONFIG.PATTERNS.phone.test(value)) {
            error = CONFIG.MESSAGES.phone;
        }
        // Name validation
        else if ((fieldName === 'firstName' || fieldName === 'lastName') && value && !CONFIG.PATTERNS.name.test(value)) {
            error = CONFIG.MESSAGES.name;
        }
        // Offer amount validation
        else if (fieldName === 'offerAmount' && value && parseInt(value) < 1000) {
            error = CONFIG.MESSAGES.minOffer;
        }

        // Update UI
        this.showFieldError(field, error);

        return !error;
    }

    showFieldError(field, error) {
        const { element, errorElement } = field;

        if (error) {
            element.classList.add('error');
            if (errorElement) {
                errorElement.textContent = error;
                errorElement.style.display = 'block';
            }
        } else {
            element.classList.remove('error');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
    }

    validateForm() {
        let isValid = true;

        Object.values(this.fields).forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        const isValid = this.validateForm();

        if (!isValid) {
            this.showFormMessage(CONFIG.MESSAGES.generic, 'error');
            return;
        }

        this.isSubmitting = true;
        const submitButton = this.form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;

        try {
            // Update button state
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            // Collect form data
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());

            // Add timestamp and source
            data.timestamp = new Date().toISOString();
            data.source = 'domain-sales-landing';
            data.domain = window.location.hostname;

            // Submit form (replace with actual endpoint)
            const response = await this.submitForm(data);

            if (response.success) {
                this.showFormMessage('Thank you! Your message has been sent. We\'ll respond within 2 hours.', 'success');
                this.form.reset();

                // Track conversion
                this.trackConversion(data.inquiryType || 'contact');
            } else {
                throw new Error(response.message || 'Submission failed');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.showFormMessage('Sorry, there was an error sending your message. Please try again or contact us directly.', 'error');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            this.isSubmitting = false;
        }
    }

    async submitForm(data) {
        // This is a placeholder - replace with actual form submission logic
        // You might want to integrate with services like Netlify Forms, Formspree, or your own API

        console.log('Form data:', data);

        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, message: 'Form submitted successfully' });
            }, 1000);
        });

        /* Example with actual API:
        const response = await fetch(CONFIG.FORM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        return await response.json();
        */
    }

    showFormMessage(message, type) {
        // Remove existing messages
        const existingMessage = this.form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `form-message form-message--${type}`;
        messageEl.textContent = message;
        messageEl.setAttribute('role', 'alert');

        // Insert message
        this.form.insertBefore(messageEl, this.form.firstChild);

        // Auto-remove success messages
        if (type === 'success') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }
    }

    trackConversion(type) {
        // Track form submissions for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_submit', {
                event_category: 'engagement',
                event_label: type,
                value: 1
            });
        }

        // Custom analytics tracking
        if (typeof analytics !== 'undefined') {
            analytics.track('Form Submitted', {
                type: type,
                domain: window.location.hostname,
                timestamp: new Date().toISOString()
            });
        }

        console.log('Conversion tracked:', type);
    }
}

// ==========================================================================
// SCROLL ANIMATIONS
// ==========================================================================

class ScrollAnimations {
    constructor() {
        this.animatedElements = document.querySelectorAll('[data-animate]');
        this.observer = null;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (this.animatedElements.length > 0) {
            this.init();
        }
    }

    init() {
        // Listen for motion preference changes
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addListener((mq) => {
            this.prefersReducedMotion = mq.matches;
            this.updateAnimationBehavior();
        });

        // Enhanced intersection observer with multiple thresholds
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
                rootMargin: '0px 0px -50px 0px'
            }
        );

        this.setupAnimationElements();
        this.animatedElements.forEach(el => {
            this.observer.observe(el);
        });
    }

    setupAnimationElements() {
        // Auto-detect elements that should be animated
        const sections = document.querySelectorAll('section');
        sections.forEach((section, index) => {
            if (!section.dataset.animate) {
                section.dataset.animate = 'fade-up';
                section.dataset.delay = index * 100;
            }
        });

        // Add stagger animation to grid items
        const grids = document.querySelectorAll('.value-grid, .features-grid, .testimonials-grid, .pricing-grid');
        grids.forEach(grid => {
            const items = grid.children;
            Array.from(items).forEach((item, index) => {
                if (!item.dataset.animate) {
                    item.dataset.animate = 'fade-up-stagger';
                    item.dataset.delay = index * 150;
                }
            });
        });
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const animationType = element.dataset.animate;
                const delay = this.prefersReducedMotion ? 0 : (element.dataset.delay || 0);

                // Apply animation based on intersection ratio for progressive reveals
                if (entry.intersectionRatio > 0.1) {
                    setTimeout(() => {
                        this.animateElement(element, animationType);
                    }, delay);

                    // Stop observing once animated
                    this.observer.unobserve(element);
                }
            }
        });
    }

    animateElement(element, type) {
        if (this.prefersReducedMotion) {
            element.classList.add('animate-in-reduced');
            return;
        }

        element.classList.add('animate-in');

        // Add specific animation classes based on type
        switch (type) {
            case 'fade-up':
                element.classList.add('fade-up');
                break;
            case 'fade-left':
                element.classList.add('fade-left');
                break;
            case 'fade-right':
                element.classList.add('fade-right');
                break;
            case 'scale-in':
                element.classList.add('scale-in');
                break;
            case 'fade-up-stagger':
                element.classList.add('fade-up-stagger');
                break;
            default:
                element.classList.add('fade-up');
        }

        // Trigger any nested animations
        this.triggerNestedAnimations(element);
    }

    triggerNestedAnimations(element) {
        const nestedElements = element.querySelectorAll('[data-nested-animate]');
        nestedElements.forEach((nested, index) => {
            setTimeout(() => {
                nested.classList.add('animate-in');
            }, index * 100);
        });
    }

    updateAnimationBehavior() {
        // Update existing animated elements based on motion preferences
        const animatedElements = document.querySelectorAll('.animate-in');
        animatedElements.forEach(el => {
            if (this.prefersReducedMotion) {
                el.classList.add('animate-in-reduced');
            } else {
                el.classList.remove('animate-in-reduced');
            }
        });
    }
}

// ==========================================================================
// LAZY LOADING MANAGER
// ==========================================================================

class LazyLoadManager {
    constructor() {
        this.images = document.querySelectorAll('img[data-src], iframe[data-src]');
        this.observer = null;
        this.init();
    }

    init() {
        // Add loading placeholder to images
        this.setupPlaceholders();

        // Create intersection observer for lazy loading
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                rootMargin: '50px 0px',
                threshold: 0.1
            }
        );

        this.images.forEach(img => {
            this.observer.observe(img);
        });

        // Preload critical images
        this.preloadCriticalImages();
    }

    setupPlaceholders() {
        this.images.forEach(img => {
            if (img.tagName === 'IMG') {
                img.style.backgroundColor = '#f0f0f0';
                img.style.minHeight = '200px';
                img.classList.add('lazy-loading');
            }
        });
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    loadImage(element) {
        const src = element.dataset.src;
        if (!src) return;

        // Create new image to preload
        const img = new Image();

        img.onload = () => {
            element.src = src;
            element.classList.remove('lazy-loading');
            element.classList.add('lazy-loaded');

            // Remove data-src attribute
            element.removeAttribute('data-src');
        };

        img.onerror = () => {
            element.classList.add('lazy-error');
        };

        img.src = src;
    }

    preloadCriticalImages() {
        // Preload hero and above-the-fold images
        const criticalImages = document.querySelectorAll('.hero img, .header img');
        criticalImages.forEach(img => {
            if (img.dataset.src) {
                this.loadImage(img);
            }
        });
    }
}

// ==========================================================================
// MICRO-INTERACTIONS MANAGER
// ==========================================================================

class MicroInteractions {
    constructor() {
        this.init();
    }

    init() {
        this.setupButtonInteractions();
        this.setupFormInteractions();
        this.setupHoverEffects();
        this.setupLoadingStates();
        this.setupRippleEffects();
    }

    setupButtonInteractions() {
        const buttons = document.querySelectorAll('.btn, button');

        buttons.forEach(button => {
            // Add ripple effect on click
            button.addEventListener('click', (e) => {
                this.createRipple(e, button);
            });

            // Add pulse effect for primary buttons
            if (button.classList.contains('btn-primary')) {
                button.addEventListener('mouseenter', () => {
                    button.classList.add('pulse-hover');
                });

                button.addEventListener('mouseleave', () => {
                    button.classList.remove('pulse-hover');
                });
            }

            // Add loading state capability
            if (button.type === 'submit') {
                this.setupLoadingButton(button);
            }
        });
    }

    createRipple(event, element) {
        const circle = document.createElement('span');
        const diameter = Math.max(element.clientWidth, element.clientHeight);
        const radius = diameter / 2;

        const rect = element.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');

        const ripple = element.querySelector('.ripple');
        if (ripple) {
            ripple.remove();
        }

        element.appendChild(circle);

        // Remove ripple after animation
        setTimeout(() => {
            if (circle.parentNode) {
                circle.remove();
            }
        }, 600);
    }

    setupFormInteractions() {
        const formInputs = document.querySelectorAll('input, textarea, select');

        formInputs.forEach(input => {
            // Focus animations
            input.addEventListener('focus', () => {
                input.parentNode.classList.add('focused');
            });

            input.addEventListener('blur', () => {
                input.parentNode.classList.remove('focused');
                if (input.value) {
                    input.parentNode.classList.add('filled');
                } else {
                    input.parentNode.classList.remove('filled');
                }
            });

            // Real-time validation feedback
            input.addEventListener('input', debounce(() => {
                this.validateFieldRealTime(input);
            }, 300));
        });
    }

    validateFieldRealTime(input) {
        const isValid = input.checkValidity();
        const parentNode = input.parentNode;

        if (input.value.length > 0) {
            if (isValid) {
                parentNode.classList.add('valid');
                parentNode.classList.remove('invalid');
            } else {
                parentNode.classList.add('invalid');
                parentNode.classList.remove('valid');
            }
        } else {
            parentNode.classList.remove('valid', 'invalid');
        }
    }

    setupHoverEffects() {
        // Card hover effects
        const cards = document.querySelectorAll('.value-item, .feature-item, .testimonial-item, .pricing-card');

        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.classList.add('hover-elevated');
            });

            card.addEventListener('mouseleave', () => {
                card.classList.remove('hover-elevated');
            });
        });

        // Link hover effects
        const links = document.querySelectorAll('a:not(.btn)');
        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.classList.add('link-hover');
            });

            link.addEventListener('mouseleave', () => {
                link.classList.remove('link-hover');
            });
        });
    }

    setupLoadingStates() {
        // Enhanced loading states for buttons
        const submitButtons = document.querySelectorAll('button[type="submit"], .btn-primary');

        submitButtons.forEach(button => {
            this.enhanceButtonLoading(button);
        });
    }

    enhanceButtonLoading(button) {
        const originalText = button.textContent;
        const originalHTML = button.innerHTML;

        // Create loading spinner
        const spinner = document.createElement('span');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
        `;

        button.setLoadingState = (loading, text = 'Loading...') => {
            if (loading) {
                button.disabled = true;
                button.classList.add('loading');
                button.innerHTML = `${spinner.outerHTML} ${text}`;
            } else {
                button.disabled = false;
                button.classList.remove('loading');
                button.innerHTML = originalHTML;
            }
        };
    }

    setupRippleEffects() {
        // Add ripple container to elements that need it
        const rippleElements = document.querySelectorAll('.btn, .nav-link, .pricing-card');

        rippleElements.forEach(element => {
            if (!element.querySelector('.ripple-container')) {
                const rippleContainer = document.createElement('div');
                rippleContainer.className = 'ripple-container';
                element.appendChild(rippleContainer);
            }
        });
    }

    setupLoadingButton(button) {
        // Enhanced submit button with progress indication
        button.addEventListener('click', (e) => {
            if (button.form && !button.form.checkValidity()) {
                return; // Let normal validation handle this
            }

            // Add loading state
            if (button.setLoadingState) {
                button.setLoadingState(true, 'Sending...');

                // Simulate progress (replace with actual form submission logic)
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += 10;
                    if (progress <= 100) {
                        button.style.setProperty('--progress', `${progress}%`);
                    } else {
                        clearInterval(progressInterval);
                    }
                }, 100);
            }
        });
    }
}

// ==========================================================================
// TESTIMONIAL CAROUSEL
// ==========================================================================

class TestimonialCarousel {
    constructor() {
        this.container = document.querySelector('.testimonials-grid');
        this.testimonials = document.querySelectorAll('.testimonial-item');
        this.currentIndex = 0;
        this.autoRotateInterval = null;
        this.isAutoRotating = true;
        this.touchStartX = 0;
        this.touchEndX = 0;

        if (this.testimonials.length > 1) {
            this.init();
        }
    }

    init() {
        this.createControls();
        this.createIndicators();
        this.bindEvents();
        this.startAutoRotate();
        this.setupAccessibility();
    }

    createControls() {
        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'carousel-controls';
        controlsWrapper.innerHTML = `
            <button class="carousel-btn carousel-btn--prev" aria-label="Previous testimonial">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            </button>
            <button class="carousel-btn carousel-btn--next" aria-label="Next testimonial">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </button>
        `;

        this.container.parentNode.insertBefore(controlsWrapper, this.container.nextSibling);

        this.prevBtn = controlsWrapper.querySelector('.carousel-btn--prev');
        this.nextBtn = controlsWrapper.querySelector('.carousel-btn--next');
    }

    createIndicators() {
        const indicatorsWrapper = document.createElement('div');
        indicatorsWrapper.className = 'carousel-indicators';

        for (let i = 0; i < this.testimonials.length; i++) {
            const indicator = document.createElement('button');
            indicator.className = `carousel-indicator ${i === 0 ? 'active' : ''}`;
            indicator.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
            indicator.dataset.index = i;
            indicatorsWrapper.appendChild(indicator);
        }

        this.container.parentNode.insertBefore(indicatorsWrapper, this.container.nextSibling);
        this.indicators = indicatorsWrapper.querySelectorAll('.carousel-indicator');
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => this.goToPrevious());
        this.nextBtn.addEventListener('click', () => this.goToNext());

        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        // Touch events for mobile swipe
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        });

        this.container.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });

        // Pause auto-rotation on hover
        this.container.addEventListener('mouseenter', () => this.stopAutoRotate());
        this.container.addEventListener('mouseleave', () => this.startAutoRotate());

        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.goToPrevious();
            if (e.key === 'ArrowRight') this.goToNext();
        });
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.goToNext();
            } else {
                this.goToPrevious();
            }
        }
    }

    goToSlide(index) {
        this.currentIndex = index;
        this.updateCarousel();
        this.restartAutoRotate();
    }

    goToNext() {
        this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
        this.updateCarousel();
        this.restartAutoRotate();
    }

    goToPrevious() {
        this.currentIndex = this.currentIndex === 0 ? this.testimonials.length - 1 : this.currentIndex - 1;
        this.updateCarousel();
        this.restartAutoRotate();
    }

    updateCarousel() {
        // Hide all testimonials
        this.testimonials.forEach((testimonial, index) => {
            testimonial.classList.toggle('active', index === this.currentIndex);
            testimonial.setAttribute('aria-hidden', index !== this.currentIndex);
        });

        // Update indicators
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentIndex);
        });

        // Announce change to screen readers
        const activeTestimonial = this.testimonials[this.currentIndex];
        const authorName = activeTestimonial.querySelector('.author-name').textContent;
        announceToScreenReader(`Now showing testimonial from ${authorName}`);
    }

    startAutoRotate() {
        if (!this.isAutoRotating) return;

        this.autoRotateInterval = setInterval(() => {
            this.goToNext();
        }, 5000);
    }

    stopAutoRotate() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
    }

    restartAutoRotate() {
        this.stopAutoRotate();
        setTimeout(() => this.startAutoRotate(), 1000);
    }

    setupAccessibility() {
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Customer testimonials carousel');
        this.container.setAttribute('tabindex', '0');
    }
}

// ==========================================================================
// COPY TO CLIPBOARD FUNCTIONALITY
// ==========================================================================

class ClipboardManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupCopyButtons();
    }

    setupCopyButtons() {
        const contactLinks = document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]');

        contactLinks.forEach(link => {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.setAttribute('aria-label', 'Copy to clipboard');
            copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                </svg>
            `;

            // Insert copy button after the link
            link.parentNode.insertBefore(copyBtn, link.nextSibling);

            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyToClipboard(link, copyBtn);
            });
        });
    }

    async copyToClipboard(link, button) {
        let textToCopy = '';

        if (link.href.startsWith('mailto:')) {
            textToCopy = link.href.replace('mailto:', '');
        } else if (link.href.startsWith('tel:')) {
            textToCopy = link.textContent.trim();
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showCopyFeedback(button, 'Copied!');
        } catch (err) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(textToCopy, button);
        }
    }

    fallbackCopyToClipboard(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showCopyFeedback(button, 'Copied!');
        } catch (err) {
            this.showCopyFeedback(button, 'Failed to copy');
        }

        document.body.removeChild(textArea);
    }

    showCopyFeedback(button, message) {
        const originalContent = button.innerHTML;
        button.innerHTML = `<span class="copy-feedback">${message}</span>`;
        button.classList.add('copy-success');

        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.remove('copy-success');
        }, 2000);
    }
}

// ==========================================================================
// PRICING CARD INTERACTIONS
// ==========================================================================

class PricingInteractions {
    constructor() {
        this.cards = document.querySelectorAll('.pricing-card');
        this.init();
    }

    init() {
        this.setupCardInteractions();
        this.setupComparisonMode();
        this.addAvailabilityIndicator();
    }

    setupCardInteractions() {
        this.cards.forEach(card => {
            // Add hover effects and selection
            card.addEventListener('mouseenter', () => this.highlightCard(card));
            card.addEventListener('mouseleave', () => this.unhighlightCard(card));
            card.addEventListener('click', () => this.selectCard(card));

            // Add focus handling for accessibility
            const ctaButton = card.querySelector('.btn');
            if (ctaButton) {
                ctaButton.addEventListener('focus', () => this.highlightCard(card));
                ctaButton.addEventListener('blur', () => this.unhighlightCard(card));
            }
        });
    }

    highlightCard(card) {
        if (!card.classList.contains('selected')) {
            card.classList.add('highlighted');
        }
    }

    unhighlightCard(card) {
        card.classList.remove('highlighted');
    }

    selectCard(card) {
        // Remove selection from other cards
        this.cards.forEach(c => c.classList.remove('selected'));

        // Add selection to current card
        card.classList.add('selected');

        // Track selection
        const cardTitle = card.querySelector('.pricing-title').textContent;
        this.trackCardSelection(cardTitle);
    }

    setupComparisonMode() {
        const pricingSection = document.querySelector('.pricing');
        if (!pricingSection) return;

        const compareBtn = document.createElement('button');
        compareBtn.className = 'btn btn-outline compare-toggle';
        compareBtn.textContent = 'Compare Options';
        compareBtn.setAttribute('aria-label', 'Toggle comparison mode');

        pricingSection.querySelector('.container').appendChild(compareBtn);

        compareBtn.addEventListener('click', () => {
            const isComparing = pricingSection.classList.toggle('comparison-mode');
            compareBtn.textContent = isComparing ? 'Exit Compare' : 'Compare Options';

            if (isComparing) {
                this.highlightDifferences();
            } else {
                this.clearDifferences();
            }
        });
    }

    highlightDifferences() {
        const features = document.querySelectorAll('.pricing-features li');
        features.forEach(feature => {
            feature.classList.add('comparison-item');
        });
    }

    clearDifferences() {
        const features = document.querySelectorAll('.pricing-features li');
        features.forEach(feature => {
            feature.classList.remove('comparison-item');
        });
    }

    addAvailabilityIndicator() {
        this.cards.forEach(card => {
            const indicator = document.createElement('div');
            indicator.className = 'availability-indicator';
            indicator.innerHTML = `
                <span class="availability-dot"></span>
                <span class="availability-text">Available Now</span>
            `;

            const header = card.querySelector('.pricing-header');
            if (header) {
                header.appendChild(indicator);
            }
        });

        // Simulate real-time updates
        this.simulateAvailabilityUpdates();
    }

    simulateAvailabilityUpdates() {
        setInterval(() => {
            const indicators = document.querySelectorAll('.availability-indicator');
            indicators.forEach(indicator => {
                indicator.classList.add('pulse');
                setTimeout(() => {
                    indicator.classList.remove('pulse');
                }, 1000);
            });
        }, 30000); // Update every 30 seconds
    }

    trackCardSelection(cardTitle) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pricing_card_selected', {
                event_category: 'engagement',
                event_label: cardTitle,
                value: 1
            });
        }
        console.log('Pricing card selected:', cardTitle);
    }
}

// ==========================================================================
// DOMAIN PREVIEW INTERACTIONS
// ==========================================================================

class DomainPreview {
    constructor() {
        this.preview = document.querySelector('.domain-preview');
        this.addressBar = document.querySelector('.address-bar .url');
        this.init();
    }

    init() {
        if (!this.preview) return;

        this.setupPreviewInteractions();
        this.addTypingAnimation();
    }

    setupPreviewInteractions() {
        this.preview.addEventListener('click', () => {
            this.preview.classList.add('preview-active');
            this.simulatePageLoad();
        });

        this.preview.addEventListener('mouseleave', () => {
            setTimeout(() => {
                this.preview.classList.remove('preview-active');
            }, 2000);
        });
    }

    addTypingAnimation() {
        const urls = [
            'https://premiumdomain.com',
            'https://premiumdomain.com/about',
            'https://premiumdomain.com/products',
            'https://premiumdomain.com/contact'
        ];

        let currentUrlIndex = 0;

        setInterval(() => {
            if (this.addressBar && !this.preview.classList.contains('preview-active')) {
                this.typeUrl(urls[currentUrlIndex]);
                currentUrlIndex = (currentUrlIndex + 1) % urls.length;
            }
        }, 4000);
    }

    typeUrl(url) {
        let currentText = '';
        let charIndex = 0;

        const typeInterval = setInterval(() => {
            currentText += url[charIndex];
            this.addressBar.textContent = currentText;
            charIndex++;

            if (charIndex >= url.length) {
                clearInterval(typeInterval);

                // Hold for a moment then clear
                setTimeout(() => {
                    if (!this.preview.classList.contains('preview-active')) {
                        this.clearUrl();
                    }
                }, 1500);
            }
        }, 100);
    }

    clearUrl() {
        let currentText = this.addressBar.textContent;

        const clearTextInterval = setInterval(() => {
            currentText = currentText.slice(0, -1);
            this.addressBar.textContent = currentText;

            if (currentText.length === 0) {
                clearInterval(clearTextInterval);
                this.addressBar.textContent = 'https://premiumdomain.com';
            }
        }, 50);
    }

    simulatePageLoad() {
        const content = this.preview.querySelector('.browser-content');
        if (!content) return;

        content.style.opacity = '0.5';

        setTimeout(() => {
            content.innerHTML = `
                <div class="preview-loaded">
                    <h3>Your Business Success</h3>
                    <p>Premium domain delivering results</p>
                    <div class="preview-metrics">
                        <span>↗ +300% Traffic</span>
                        <span>🎯 Better SEO</span>
                        <span>💼 Professional</span>
                    </div>
                </div>
            `;
            content.style.opacity = '1';
        }, 1000);
    }
}

// ==========================================================================
// PERFORMANCE & ANALYTICS
// ==========================================================================

class Analytics {
    constructor() {
        this.startTime = performance.now();
        this.init();
    }

    init() {
        this.trackPageLoad();
        this.trackScrollDepth();
        this.trackCTAClicks();
        this.trackTimeOnPage();
    }

    trackPageLoad() {
        window.addEventListener('load', () => {
            const loadTime = performance.now() - this.startTime;

            if (typeof gtag !== 'undefined') {
                gtag('event', 'page_load_time', {
                    event_category: 'performance',
                    value: Math.round(loadTime)
                });
            }

            console.log('Page load time:', Math.round(loadTime), 'ms');
        });
    }

    trackScrollDepth() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 90, 100];
        const tracked = new Set();

        const scrollHandler = throttle(() => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );

            maxScroll = Math.max(maxScroll, scrollPercent);

            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !tracked.has(milestone)) {
                    tracked.add(milestone);

                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'scroll_depth', {
                            event_category: 'engagement',
                            event_label: `${milestone}%`,
                            value: milestone
                        });
                    }
                }
            });
        }, 250);

        window.addEventListener('scroll', scrollHandler);
    }

    trackCTAClicks() {
        const ctaButtons = document.querySelectorAll('.btn-primary, .btn-secondary');

        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const buttonText = button.textContent.trim();
                const buttonPosition = this.getElementPosition(button);

                if (typeof gtag !== 'undefined') {
                    gtag('event', 'cta_click', {
                        event_category: 'engagement',
                        event_label: buttonText,
                        value: 1
                    });
                }

                console.log('CTA clicked:', buttonText, 'Position:', buttonPosition);
            });
        });
    }

    trackTimeOnPage() {
        let timeOnPage = 0;
        let isActive = true;

        const interval = setInterval(() => {
            if (isActive) {
                timeOnPage += 1;
            }
        }, 1000);

        // Track when user becomes inactive
        let inactiveTimer;
        const resetInactiveTimer = () => {
            clearTimeout(inactiveTimer);
            isActive = true;
            inactiveTimer = setTimeout(() => {
                isActive = false;
            }, 30000); // 30 seconds of inactivity
        };

        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactiveTimer, true);
        });

        // Send data when user leaves
        window.addEventListener('beforeunload', () => {
            if (typeof gtag !== 'undefined') {
                gtag('event', 'time_on_page', {
                    event_category: 'engagement',
                    value: timeOnPage
                });
            }

            clearInterval(interval);
        });
    }

    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return {
            top: rect.top + scrollTop,
            section: this.getNearestSection(element)
        };
    }

    getNearestSection(element) {
        let current = element;
        while (current && current !== document.body) {
            if (current.tagName === 'SECTION' && current.id) {
                return current.id;
            }
            current = current.parentElement;
        }
        return 'unknown';
    }
}

// ==========================================================================
// DYNAMIC PRICING CALCULATOR
// ==========================================================================

class PricingCalculator {
    constructor() {
        this.init();
    }

    init() {
        this.setupDynamicPricing();
        this.addPricingTooltips();
        this.setupCurrencyConverter();
    }

    setupDynamicPricing() {
        const priceElements = document.querySelectorAll('.pricing-price .amount');

        priceElements.forEach(priceEl => {
            const basePrice = parseInt(priceEl.textContent.replace(/[^\d]/g, ''));

            // Add market demand indicator
            this.addMarketIndicator(priceEl.closest('.pricing-card'), basePrice);

            // Simulate price fluctuations based on "demand"
            this.simulateDynamicPricing(priceEl, basePrice);
        });
    }

    addMarketIndicator(card, price) {
        const indicator = document.createElement('div');
        indicator.className = 'market-indicator';

        let indicatorText = '';
        let indicatorClass = '';

        if (price >= 25000) {
            indicatorText = '🔥 High Demand';
            indicatorClass = 'high-demand';
        } else if (price >= 2000) {
            indicatorText = '📈 Growing Interest';
            indicatorClass = 'medium-demand';
        } else {
            indicatorText = '💰 Great Value';
            indicatorClass = 'good-value';
        }

        indicator.innerHTML = `
            <span class="indicator-icon">${indicatorText.split(' ')[0]}</span>
            <span class="indicator-text">${indicatorText.split(' ').slice(1).join(' ')}</span>
        `;
        indicator.className += ` ${indicatorClass}`;

        const header = card.querySelector('.pricing-header');
        if (header) {
            header.appendChild(indicator);
        }
    }

    simulateDynamicPricing(priceEl, basePrice) {
        // Add subtle price updates to create urgency
        let currentPrice = basePrice;

        setInterval(() => {
            // Small random fluctuation (±2%)
            const fluctuation = (Math.random() - 0.5) * 0.04;
            const newPrice = Math.round(basePrice * (1 + fluctuation));

            if (newPrice !== currentPrice) {
                currentPrice = newPrice;
                this.animatePriceChange(priceEl, newPrice);
            }
        }, 30000); // Update every 30 seconds
    }

    animatePriceChange(priceEl, newPrice) {
        priceEl.classList.add('price-updating');

        setTimeout(() => {
            priceEl.textContent = newPrice.toLocaleString();
            priceEl.classList.remove('price-updating');
            priceEl.classList.add('price-updated');

            setTimeout(() => {
                priceEl.classList.remove('price-updated');
            }, 2000);
        }, 500);
    }

    addPricingTooltips() {
        const features = document.querySelectorAll('.pricing-features li');

        features.forEach(feature => {
            const tooltipData = this.getFeatureTooltip(feature.textContent);
            if (tooltipData) {
                feature.setAttribute('title', tooltipData);
                feature.classList.add('has-tooltip');
            }
        });
    }

    getFeatureTooltip(featureText) {
        const tooltips = {
            'Immediate domain transfer': 'Domain ownership transfers within 24-48 hours via secure registrar transfer process',
            'Escrow.com protection': 'Funds held securely by trusted third party until transfer completion',
            'Professional transfer assistance': 'Dedicated support specialist guides you through the entire process',
            'Free logo design consultation': 'Complimentary brand consultation with professional designer',
            'Financing options available': 'Flexible payment plans and lease-to-own programs available'
        };

        return tooltips[featureText] || null;
    }

    setupCurrencyConverter() {
        // Add currency toggle for international buyers
        const priceElements = document.querySelectorAll('.pricing-price');

        priceElements.forEach(priceContainer => {
            const currencyToggle = document.createElement('button');
            currencyToggle.className = 'currency-toggle';
            currencyToggle.textContent = 'View in EUR';
            currencyToggle.setAttribute('aria-label', 'Toggle currency display');

            let isUSD = true;
            const originalAmount = priceContainer.querySelector('.amount').textContent;

            currencyToggle.addEventListener('click', () => {
                const amountEl = priceContainer.querySelector('.amount');
                const currencyEl = priceContainer.querySelector('.currency');

                if (isUSD) {
                    // Convert to EUR (approximate)
                    const eurAmount = Math.round(parseInt(originalAmount.replace(/,/g, '')) * 0.92);
                    amountEl.textContent = eurAmount.toLocaleString();
                    currencyEl.textContent = '€';
                    currencyToggle.textContent = 'View in USD';
                } else {
                    amountEl.textContent = originalAmount;
                    currencyEl.textContent = '$';
                    currencyToggle.textContent = 'View in EUR';
                }

                isUSD = !isUSD;
            });

            priceContainer.appendChild(currencyToggle);
        });
    }
}

// ==========================================================================
// CONVERSION OPTIMIZATION COMPONENTS
// ==========================================================================

// Multi-Step Form Handler
class MultiStepForm {
    constructor() {
        this.form = document.querySelector('.contact-form.optimized');
        this.currentStep = 1;
        this.totalSteps = 3;
        this.data = {};

        if (this.form) {
            this.init();
        }
    }

    init() {
        this.bindEvents();
        this.setupInterestButtons();
        this.setupOfferSuggestions();
    }

    bindEvents() {
        const nextBtn = document.getElementById('next-step');
        const prevBtn = document.getElementById('prev-step');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevStep());
        }
    }

    setupInterestButtons() {
        const interestButtons = document.querySelectorAll('.interest-btn');
        const hiddenInput = document.getElementById('inquiry-type');

        interestButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove selection from all buttons
                interestButtons.forEach(b => b.classList.remove('selected'));

                // Select current button
                btn.classList.add('selected');

                // Update hidden input
                const value = btn.dataset.value;
                if (hiddenInput) {
                    hiddenInput.value = value;
                }

                // Show offer group if making an offer
                const offerGroup = document.getElementById('offer-group');
                if (offerGroup) {
                    offerGroup.style.display = value === 'offer' ? 'block' : 'none';
                }

                // Track selection
                this.trackInterestSelection(value);
            });
        });
    }

    setupOfferSuggestions() {
        const suggestions = document.querySelectorAll('.offer-suggestion');
        const offerInput = document.getElementById('offer-amount');

        suggestions.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                if (offerInput) {
                    offerInput.value = amount;
                    offerInput.focus();
                }

                // Visual feedback
                suggestions.forEach(s => s.style.background = '');
                btn.style.background = 'var(--color-primary)';
                btn.style.color = 'white';

                setTimeout(() => {
                    btn.style.background = '';
                    btn.style.color = '';
                }, 1000);
            });
        });
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            // Validate current step
            if (!this.validateCurrentStep()) {
                return;
            }

            this.currentStep++;
            this.updateFormDisplay();
            this.trackStepProgress();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateFormDisplay();
        }
    }

    validateCurrentStep() {
        const currentStepEl = document.querySelector(`[data-step="${this.currentStep}"]`);
        if (!currentStepEl) return true;

        const requiredFields = currentStepEl.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });

        return isValid;
    }

    updateFormDisplay() {
        // Update progress indicators
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Show/hide form steps
        document.querySelectorAll('.form-step').forEach((step, index) => {
            if (index + 1 === this.currentStep) {
                step.classList.remove('hidden');
            } else {
                step.classList.add('hidden');
            }
        });

        // Update navigation buttons
        const nextBtn = document.getElementById('next-step');
        const prevBtn = document.getElementById('prev-step');
        const submitBtn = document.querySelector('.submit-btn');

        if (prevBtn) {
            prevBtn.classList.toggle('hidden', this.currentStep === 1);
        }

        if (this.currentStep === this.totalSteps) {
            if (nextBtn) nextBtn.classList.add('hidden');
            if (submitBtn) submitBtn.classList.remove('hidden');
        } else {
            if (nextBtn) nextBtn.classList.remove('hidden');
            if (submitBtn) submitBtn.classList.add('hidden');
        }
    }

    trackInterestSelection(type) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'interest_selected', {
                event_category: 'form_interaction',
                event_label: type,
                value: 1
            });
        }
    }

    trackStepProgress() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_step_completed', {
                event_category: 'form_interaction',
                event_label: `step_${this.currentStep - 1}`,
                value: this.currentStep - 1
            });
        }
    }
}

// Countdown Timer
class CountdownTimer {
    constructor() {
        this.timer = document.getElementById('pricing-countdown');
        this.targetDate = new Date();
        this.targetDate.setDate(this.targetDate.getDate() + 2);
        this.targetDate.setHours(this.targetDate.getHours() + 14);

        if (this.timer) {
            this.init();
        }
    }

    init() {
        this.updateTimer();
        setInterval(() => this.updateTimer(), 1000);
    }

    updateTimer() {
        const now = new Date().getTime();
        const distance = this.targetDate.getTime() - now;

        if (distance < 0) {
            this.timer.innerHTML = '<div class="expired-message">Special pricing expired!</div>';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');

        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
}

// Exit Intent Handler
class ExitIntentHandler {
    constructor() {
        this.popup = document.getElementById('exit-intent-popup');
        this.hasShown = false;
        this.exitThreshold = 5; // pixels from top

        if (this.popup) {
            this.init();
        }
    }

    init() {
        document.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.setupCloseHandlers();
        this.startHoldTimer();
    }

    handleMouseLeave(e) {
        if (this.hasShown || e.clientY > this.exitThreshold) return;

        this.showPopup();
    }

    showPopup() {
        if (this.hasShown) return;

        this.hasShown = true;
        this.popup.classList.remove('hidden');

        // Track exit intent
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exit_intent_triggered', {
                event_category: 'engagement',
                value: 1
            });
        }
    }

    setupCloseHandlers() {
        const closeBtn = this.popup.querySelector('.exit-popup-close');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePopup());
        }

        // Close on backdrop click
        this.popup.addEventListener('click', (e) => {
            if (e.target === this.popup) {
                this.hidePopup();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.popup.classList.contains('hidden')) {
                this.hidePopup();
            }
        });
    }

    hidePopup() {
        this.popup.classList.add('hidden');
    }

    startHoldTimer() {
        const timerEl = document.getElementById('hold-timer');
        if (!timerEl) return;

        let minutes = 47;
        let seconds = 32;

        setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) return;
                minutes--;
                seconds = 59;
            } else {
                seconds--;
            }

            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

// Sticky Contact Bar Handler
class StickyContactBar {
    constructor() {
        this.bar = document.querySelector('.sticky-contact-bar');
        this.isVisible = false;

        if (this.bar) {
            this.init();
        }
    }

    init() {
        window.addEventListener('scroll', throttle(() => this.handleScroll(), 100));
    }

    handleScroll() {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

        if (scrollPercent > 30 && !this.isVisible) {
            this.show();
        } else if (scrollPercent <= 30 && this.isVisible) {
            this.hide();
        }
    }

    show() {
        this.isVisible = true;
        this.bar.classList.add('show');
    }

    hide() {
        this.isVisible = false;
        this.bar.classList.remove('show');
    }
}

// Enhanced Analytics for Conversion Tracking
class ConversionAnalytics {
    constructor() {
        this.conversionEvents = [];
        this.init();
    }

    init() {
        this.trackPageViews();
        this.trackButtonClicks();
        this.trackFormInteractions();
        this.trackScrollMilestones();
        this.trackTimeOnPage();
    }

    trackPageViews() {
        // Track initial page view
        this.trackEvent('page_view', {
            page_title: document.title,
            page_location: window.location.href
        });

        // Track section views
        const sections = document.querySelectorAll('section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.trackEvent('section_view', {
                        section_name: entry.target.id,
                        visibility_ratio: entry.intersectionRatio
                    });
                }
            });
        }, { threshold: 0.5 });

        sections.forEach(section => observer.observe(section));
    }

    trackButtonClicks() {
        // Track all CTA button clicks
        document.querySelectorAll('[data-track]').forEach(button => {
            button.addEventListener('click', (e) => {
                const trackingId = e.target.dataset.track;
                this.trackEvent('cta_click', {
                    button_id: trackingId,
                    button_text: e.target.textContent.trim(),
                    position: this.getElementPosition(e.target)
                });
            });
        });

        // Track pricing card interactions
        document.querySelectorAll('.pricing-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                const cardTitle = card.querySelector('.pricing-title').textContent;
                this.trackEvent('pricing_card_interaction', {
                    card_title: cardTitle,
                    card_position: index + 1
                });
            });
        });
    }

    trackFormInteractions() {
        const form = document.querySelector('.contact-form');
        if (!form) return;

        // Track form start
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.addEventListener('focus', () => {
                this.trackEvent('form_started', {
                    form_type: 'contact_form'
                });
            }, { once: true });
        }

        // Track form abandonment
        let formStarted = false;
        let formCompleted = false;

        form.addEventListener('input', () => {
            if (!formStarted) {
                formStarted = true;
                setTimeout(() => {
                    if (!formCompleted) {
                        this.trackEvent('form_abandoned', {
                            form_type: 'contact_form',
                            time_spent: '30_seconds'
                        });
                    }
                }, 30000);
            }
        });

        // Track form completion
        form.addEventListener('submit', () => {
            formCompleted = true;
            this.trackEvent('form_completed', {
                form_type: 'contact_form'
            });
        });
    }

    trackScrollMilestones() {
        let milestones = [25, 50, 75, 90, 100];
        let trackedMilestones = new Set();

        window.addEventListener('scroll', throttle(() => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );

            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
                    trackedMilestones.add(milestone);
                    this.trackEvent('scroll_milestone', {
                        milestone: milestone,
                        scroll_depth: `${milestone}%`
                    });
                }
            });
        }, 500));
    }

    trackTimeOnPage() {
        let startTime = Date.now();
        let intervals = [30, 60, 120, 300]; // seconds
        let trackedIntervals = new Set();

        setInterval(() => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);

            intervals.forEach(interval => {
                if (timeSpent >= interval && !trackedIntervals.has(interval)) {
                    trackedIntervals.add(interval);
                    this.trackEvent('time_on_page', {
                        duration: `${interval}_seconds`,
                        engagement_level: this.calculateEngagementLevel(timeSpent)
                    });
                }
            });
        }, 5000);
    }

    trackEvent(eventName, parameters = {}) {
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                ...parameters,
                timestamp: Date.now()
            });
        }

        // Custom analytics
        this.conversionEvents.push({
            event: eventName,
            parameters,
            timestamp: Date.now()
        });

        // Console logging for development
        console.log('Conversion Event:', eventName, parameters);
    }

    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return {
            x: rect.left,
            y: rect.top + scrollTop,
            section: this.getNearestSection(element)
        };
    }

    getNearestSection(element) {
        let current = element;
        while (current && current !== document.body) {
            if (current.tagName === 'SECTION' && current.id) {
                return current.id;
            }
            current = current.parentElement;
        }
        return 'unknown';
    }

    calculateEngagementLevel(timeSpent) {
        if (timeSpent >= 300) return 'high';
        if (timeSpent >= 120) return 'medium';
        if (timeSpent >= 30) return 'low';
        return 'minimal';
    }

    // Get conversion funnel data
    getConversionFunnel() {
        const funnel = {
            page_views: this.conversionEvents.filter(e => e.event === 'page_view').length,
            section_views: this.conversionEvents.filter(e => e.event === 'section_view').length,
            cta_clicks: this.conversionEvents.filter(e => e.event === 'cta_click').length,
            form_starts: this.conversionEvents.filter(e => e.event === 'form_started').length,
            form_completions: this.conversionEvents.filter(e => e.event === 'form_completed').length,
            exit_intents: this.conversionEvents.filter(e => e.event === 'exit_intent_triggered').length
        };

        // Calculate conversion rates
        funnel.cta_conversion_rate = funnel.page_views > 0 ? (funnel.cta_clicks / funnel.page_views) * 100 : 0;
        funnel.form_conversion_rate = funnel.form_starts > 0 ? (funnel.form_completions / funnel.form_starts) * 100 : 0;
        funnel.overall_conversion_rate = funnel.page_views > 0 ? (funnel.form_completions / funnel.page_views) * 100 : 0;

        return funnel;
    }
}

// Inquiry Counter Animation
class InquiryCounter {
    constructor() {
        this.counter = document.getElementById('inquiry-count');
        this.baseCount = 47;

        if (this.counter) {
            this.init();
        }
    }

    init() {
        // Simulate real-time updates
        setInterval(() => this.updateCounter(), 30000); // Every 30 seconds

        // Add random fluctuations
        setInterval(() => this.addFluctuation(), 5000); // Every 5 seconds
    }

    updateCounter() {
        // Small random increase
        if (Math.random() > 0.7) {
            this.baseCount += Math.floor(Math.random() * 3) + 1;
            this.animateCounterUpdate();
        }
    }

    addFluctuation() {
        // Temporary visual fluctuation
        const originalCount = this.counter.textContent;
        const fluctuation = Math.floor(Math.random() * 5) + 1;

        this.counter.textContent = parseInt(originalCount) + fluctuation;
        this.counter.style.color = '#ef4444';

        setTimeout(() => {
            this.counter.textContent = originalCount;
            this.counter.style.color = '';
        }, 1000);
    }

    animateCounterUpdate() {
        this.counter.style.transform = 'scale(1.1)';
        this.counter.style.color = '#ef4444';

        setTimeout(() => {
            this.counter.textContent = this.baseCount;
            this.counter.style.transform = 'scale(1)';
            this.counter.style.color = '';
        }, 300);
    }
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize core components
    new Navigation();
    new FormHandler();
    new ScrollAnimations();
    new Analytics();

    // Initialize enhanced interactive components
    new TestimonialCarousel();
    new ClipboardManager();
    new PricingInteractions();
    new DomainPreview();
    new LazyLoadManager();
    new MicroInteractions();
    new PricingCalculator();

    // Initialize conversion optimization components
    new MultiStepForm();
    new CountdownTimer();
    new ExitIntentHandler();
    new StickyContactBar();
    new ConversionAnalytics();
    new InquiryCounter();

    // Add performance monitoring
    console.log('Premium Domain Sales template with conversion optimization initialized');

    // Track initialization completion
    if (typeof gtag !== 'undefined') {
        gtag('event', 'template_initialized', {
            event_category: 'performance',
            value: 1
        });
    }
});

// ==========================================================================
// PERFORMANCE OPTIMIZATIONS
// ==========================================================================

// Preload critical resources
const preloadCriticalResources = () => {
    // Preload critical CSS if not already loaded
    const criticalStyles = [
        'css/styles.css'
    ];

    criticalStyles.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        link.onload = () => {
            link.rel = 'stylesheet';
        };
        document.head.appendChild(link);
    });
};

// Initialize performance optimizations
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadCriticalResources);
} else {
    preloadCriticalResources();
}

// Service Worker registration for offline capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// ==========================================================================
// ACCESSIBILITY ENHANCEMENTS
// ==========================================================================

// Keyboard navigation improvements
document.addEventListener('keydown', (e) => {
    // Escape key handling for modals/menus is handled in Navigation class

    // Tab trapping for mobile menu
    if (e.key === 'Tab') {
        const nav = document.querySelector('.nav-menu');
        if (nav && nav.classList.contains('nav-menu--open')) {
            const focusableElements = nav.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
});

// Announce dynamic content changes to screen readers
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Export for potential external use
window.DomainSalesTemplate = {
    CONFIG,
    Navigation,
    FormHandler,
    ScrollAnimations,
    Analytics,
    announceToScreenReader
};