/* UI-only card menu controller. It never changes panel logic; it only drives
   presentation by clicking the existing .menu-tab elements. */
(function () {
    'use strict';

    function init() {
        const carousel = document.querySelector('[data-card-carousel]');
        if (!carousel) return;

        const cards = Array.from(carousel.querySelectorAll('.menu-tab'));
        const prev = document.querySelector('[data-card-prev]');
        const next = document.querySelector('[data-card-next]');
        const dotsHost = document.querySelector('[data-card-dots]');
        if (!cards.length) return;

        let active = Math.max(0, cards.findIndex(card => card.classList.contains('active')));
        let pointerStartX = 0;
        let dragging = false;
        let suppressClick = false;
        let syncFrame = 0;

        cards.forEach((card, index) => {
            card.setAttribute('aria-label', card.querySelector('strong')?.textContent || 'Tool');
            card.setAttribute('aria-current', index === active ? 'true' : 'false');

            card.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    card.click();
                }
            });
        });

        if (dotsHost) {
            cards.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'tool-card-dot';
                dot.setAttribute('aria-label', 'Show tool ' + (index + 1));
                dot.addEventListener('click', function () {
                    selectIndex(index);
                    restartIdle();
                });
                dotsHost.appendChild(dot);
            });
        }

        const dots = dotsHost ? Array.from(dotsHost.children) : [];

        function normalize(index) {
            const total = cards.length;
            return (index % total + total) % total;
        }

        function relativePosition(index) {
            const total = cards.length;
            let pos = index - active;
            if (pos > total / 2) pos -= total;
            if (pos < -total / 2) pos += total;
            return pos;
        }

        function render() {
            cards.forEach((card, index) => {
                const pos = relativePosition(index);
                card.classList.remove('card-pos-left-2', 'card-pos-left', 'card-pos-center', 'card-pos-right', 'card-pos-right-2', 'card-pos-hidden');
                if (pos === 0) card.classList.add('card-pos-center');
                else if (pos === -1) card.classList.add('card-pos-left');
                else if (pos === 1) card.classList.add('card-pos-right');
                else if (pos === -2) card.classList.add('card-pos-left-2');
                else if (pos === 2) card.classList.add('card-pos-right-2');
                else card.classList.add('card-pos-hidden');
                card.setAttribute('aria-current', index === active ? 'true' : 'false');
            });

            dots.forEach((dot, index) => dot.classList.toggle('active', index === active));
        }

        function selectIndex(index) {
            const target = cards[normalize(index)];
            if (!target) return;
            if (target === cards[active]) {
                render();
                return;
            }
            target.click();
            requestAnimationFrame(function () {
                syncFromExistingState();
            });
        }

        function nextCard() { selectIndex(active + 1); }
        function previousCard() { selectIndex(active - 1); }

        function syncFromExistingState() {
            const current = cards.findIndex(card => card.classList.contains('active'));
            if (current >= 0) active = current;
            render();
        }

        function scheduleSync() {
            cancelAnimationFrame(syncFrame);
            syncFrame = requestAnimationFrame(syncFromExistingState);
        }

        cards.forEach(card => {
            card.addEventListener('click', function (event) {
                if (suppressClick) {
                    event.preventDefault();
                    event.stopPropagation();
                    suppressClick = false;
                    return;
                }
                scheduleSync();
            });
        });

        if (prev) prev.addEventListener('click', function () { previousCard(); restartIdle(); });
        if (next) next.addEventListener('click', function () { nextCard(); restartIdle(); });

        // Pointer events cover mouse + touch in modern Chrome. Using a single
        // input path prevents touchend and pointerup from advancing twice.
        carousel.addEventListener('pointerdown', function (event) {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            pointerStartX = event.clientX;
            dragging = true;
            suppressClick = false;
            carousel.classList.add('is-dragging');
            if (carousel.setPointerCapture) {
                try { carousel.setPointerCapture(event.pointerId); } catch (_) {}
            }
        });

        carousel.addEventListener('pointerup', function (event) {
            if (!dragging) return;
            const distance = event.clientX - pointerStartX;
            dragging = false;
            carousel.classList.remove('is-dragging');
            if (Math.abs(distance) < 48) return;

            // Prevent the synthetic click that follows a swipe from selecting
            // another card and making the transition appear to jump.
            suppressClick = true;
            if (distance < 0) nextCard(); else previousCard();
            restartIdle();
            window.setTimeout(function () { suppressClick = false; }, 0);
        });

        carousel.addEventListener('pointercancel', function () {
            dragging = false;
            carousel.classList.remove('is-dragging');
        });

        let idleTimer = null;
        function stopIdle() {
            if (idleTimer) clearInterval(idleTimer);
            idleTimer = null;
        }
        function startIdle() {
            stopIdle();
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            idleTimer = setInterval(function () {
                nextCard();
            }, 5200);
        }
        function restartIdle() { startIdle(); }

        carousel.addEventListener('mouseenter', stopIdle);
        carousel.addEventListener('mouseleave', startIdle);
        carousel.addEventListener('focusin', stopIdle);
        carousel.addEventListener('focusout', function (event) {
            if (!carousel.contains(event.relatedTarget)) startIdle();
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowRight') nextCard();
            if (event.key === 'ArrowLeft') previousCard();
        });

        render();
        startIdle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
