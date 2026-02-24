/**
 * Solarsol — script.js
 *
 * Scroll animations are handled by AOS (Animate On Scroll) library.
 * All data-aos attributes in the HTML control which elements animate
 * and when. AOS.init() at the bottom configures global behaviour.
 */

(function () {
    'use strict';

    /* ================================================
       NAVBAR — scroll style + mobile toggle
    ================================================ */
    var navbar      = document.getElementById('navbar');
    var hamburger   = document.getElementById('hamburger');
    var navLinks    = document.getElementById('navLinks');
    var navBackdrop = document.getElementById('navBackdrop');
    var backTop     = document.getElementById('backTop');
    var scrollHint  = document.querySelector('.scroll-hint');

    // Declared here so handleScroll → updateActiveLink can use them safely
    // (if declared later, var-hoisting leaves them undefined when handleScroll
    //  is called immediately, causing a TypeError that aborts the whole IIFE)
    var sections   = document.querySelectorAll('section[id]');
    var navAnchors = document.querySelectorAll('.nav-link');

    // Guard: if core nav elements are missing, skip all nav logic
    if (!navbar || !hamburger || !navLinks) {
        console.warn('Solarsol: navbar elements not found.');
    } else {

        /* ── Scroll handler ── */
        function handleScroll() {
            var y = window.pageYOffset || document.documentElement.scrollTop;

            navbar.classList.toggle('scrolled', y > 60);

            if (backTop)     backTop.classList.toggle('show',   y > 400);
            if (scrollHint)  scrollHint.classList.toggle('hidden', y > 100);

            updateActiveLink(y);
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // run once on load

        /* ── Open / close helpers ── */
        function openMenu() {
            hamburger.classList.add('open');
            hamburger.setAttribute('aria-expanded', 'true');
            navLinks.classList.add('open');
            if (navBackdrop) navBackdrop.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            navLinks.classList.remove('open');
            if (navBackdrop) navBackdrop.classList.remove('show');
            document.body.style.overflow = '';
        }

        /* ── Hamburger click ── */
        hamburger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (navLinks.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        /* ── Backdrop click ── */
        if (navBackdrop) {
            navBackdrop.addEventListener('click', closeMenu);
        }

        /* ── Close when a nav link is tapped ── */
        navLinks.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', closeMenu);
        });

        /* ── Close on any outside click (keyboard / mouse) ── */
        document.addEventListener('click', function (e) {
            if (navLinks.classList.contains('open') &&
                !navLinks.contains(e.target) &&
                !hamburger.contains(e.target)) {
                closeMenu();
            }
        });

        /* ── Close with Escape key ── */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && navLinks.classList.contains('open')) {
                closeMenu();
                hamburger.focus();
            }
        });

    } // end nav guard

    /* ================================================
       SMOOTH SCROLL
    ================================================ */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = this.getAttribute('href');
            if (id === '#') return;
            var target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            var top = target.getBoundingClientRect().top + window.pageYOffset - 76;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });

    if (backTop) {
        backTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ================================================
       ACTIVE NAV LINK
    ================================================ */
    function updateActiveLink(scrollY) {
        var y = (scrollY || window.pageYOffset) + 110;
        sections.forEach(function (sec) {
            var top = sec.offsetTop;
            var h   = sec.offsetHeight;
            var id  = sec.getAttribute('id');
            var lnk = document.querySelector('.nav-link[href="#' + id + '"]');
            if (lnk && y >= top && y < top + h) {
                navAnchors.forEach(function (a) { a.classList.remove('active'); });
                lnk.classList.add('active');
            }
        });
    }

    /* ================================================
       PROJECT FILTER
    ================================================ */
    var filterBtns = document.querySelectorAll('.filter-btn');
    var projCards  = document.querySelectorAll('.proj-card');

    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var filter = this.getAttribute('data-filter');
            filterBtns.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            projCards.forEach(function (card) {
                var match = filter === 'all' || card.getAttribute('data-category') === filter;
                card.style.opacity       = match ? '1'       : '0.25';
                card.style.transform     = match ? 'scale(1)' : 'scale(0.97)';
                card.style.pointerEvents = match ? 'all'     : 'none';
            });
        });
    });

    /* ================================================
       TESTIMONIALS SLIDER
    ================================================ */
    var track    = document.getElementById('testiTrack');
    var dotsWrap = document.getElementById('testiDots');
    var prevBtn  = document.getElementById('testiPrev');
    var nextBtn  = document.getElementById('testiNext');
    var cards    = track ? track.querySelectorAll('.testi-card') : [];

    var current   = 0;
    var autoTimer = null;

    function getVisible() {
        if (window.innerWidth < 768) return 1;
        if (window.innerWidth < 992) return 2;
        return 3;
    }

    function maxIdx() {
        return Math.max(0, cards.length - getVisible());
    }

    function buildDots() {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = '';
        var total = maxIdx() + 1;
        for (var i = 0; i < total; i++) {
            var dot = document.createElement('button');
            dot.className = 'testi-dot' + (i === current ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            (function (idx) {
                dot.addEventListener('click', function () { goTo(idx); resetAuto(); });
            })(i);
            dotsWrap.appendChild(dot);
        }
    }

    function goTo(idx) {
        current = Math.max(0, Math.min(idx, maxIdx()));
        var cardW  = cards[0] ? cards[0].offsetWidth : 0;
        var offset = current * (cardW + 24);
        if (track) track.style.transform = 'translateX(-' + offset + 'px)';
        dotsWrap && dotsWrap.querySelectorAll('.testi-dot').forEach(function (d, i) {
            d.classList.toggle('active', i === current);
        });
        if (prevBtn) { prevBtn.disabled = current === 0; prevBtn.style.opacity = current === 0 ? '0.35' : '1'; }
        if (nextBtn) { nextBtn.disabled = current >= maxIdx(); nextBtn.style.opacity = current >= maxIdx() ? '0.35' : '1'; }
    }

    function nextSlide() { goTo(current >= maxIdx() ? 0 : current + 1); }
    function prevSlide() { goTo(current <= 0 ? maxIdx() : current - 1); }
    function startAuto() { autoTimer = setInterval(nextSlide, 5500); }
    function resetAuto() { clearInterval(autoTimer); startAuto(); }

    if (prevBtn) prevBtn.addEventListener('click', function () { prevSlide(); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { nextSlide(); resetAuto(); });

    // Touch swipe
    var touchX = 0;
    if (track) {
        track.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
        track.addEventListener('touchend',   function (e) {
            var diff = touchX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) { diff > 0 ? nextSlide() : prevSlide(); resetAuto(); }
        }, { passive: true });
    }

    // Keyboard
    document.addEventListener('keydown', function (e) {
        var sec = document.getElementById('testimonials');
        if (!sec) return;
        var r = sec.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
            if (e.key === 'ArrowLeft')  { prevSlide(); resetAuto(); }
            if (e.key === 'ArrowRight') { nextSlide(); resetAuto(); }
        }
    });

    // Resize
    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            buildDots();
            goTo(Math.min(current, maxIdx()));
        }, 180);
    });

    buildDots();
    goTo(0);
    startAuto();

    /* ================================================
       CONTACT FORM
    ================================================ */
    var form      = document.getElementById('contactForm');
    var submitBtn = document.getElementById('submitBtn');

    if (form && submitBtn) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name  = document.getElementById('fname').value.trim();
            var email = document.getElementById('femail').value.trim();

            if (!name)  { shakeField('fname');  return; }
            if (!email) { shakeField('femail'); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { shakeField('femail'); return; }

            var orig = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML =
                '<svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
                '<span>Sending…</span>';

            setTimeout(function () {
                submitBtn.innerHTML =
                    '<svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px">' +
                    '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' +
                    '<span>Message Sent!</span>';
                submitBtn.style.background  = '#16a34a';
                submitBtn.style.borderColor = '#16a34a';
                form.reset();

                setTimeout(function () {
                    submitBtn.innerHTML = orig;
                    submitBtn.style.background  = '';
                    submitBtn.style.borderColor = '';
                    submitBtn.disabled = false;
                }, 5000);
            }, 1800);
        });
    }

    function shakeField(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.add('shake');
        el.addEventListener('animationend', function () { el.classList.remove('shake'); }, { once: true });
        el.focus();
    }

    /* ================================================
       FOOTER YEAR
    ================================================ */
    var copy = document.getElementById('copyright');
    if (copy) copy.innerHTML = copy.innerHTML.replace(/\d{4}/, new Date().getFullYear());

    /* ================================================
       AOS — ANIMATE ON SCROLL INITIALISATION
       Initialised here (inside IIFE, after DOM is fully
       parsed) so AOS can correctly measure all element
       positions at startup.
    ================================================ */
    function initAOS() {
        if (typeof AOS === 'undefined') {
            // AOS CDN failed to load — strip data-aos so the
            // CSS safety-net (html:not(.aos-initialized)) keeps
            // every element visible instead of leaving them hidden.
            document.querySelectorAll('[data-aos]').forEach(function (el) {
                el.removeAttribute('data-aos');
            });
            return;
        }

        AOS.init({
            duration:        750,
            easing:          'ease-out-cubic',
            once:            true,   // animate once per element
            offset:          70,     // px from bottom of viewport before trigger
            delay:           0,      // default (overridden per element via data-aos-delay)
            anchorPlacement: 'top-bottom',
        });

        // After all images/fonts have loaded, recalculate element
        // positions so elements that shifted layout animate correctly.
        window.addEventListener('load', function () {
            AOS.refresh();
        });
    }

    initAOS();

})();
