/* Robust controller for the tool card carousel.
   The existing app.js remains the owner of panel switching. */
(function () {
    'use strict';

    function init() {
        const carousel = document.querySelector('[data-card-carousel]');
        if (!carousel || carousel.dataset.cardMenuReady === 'true') return;

        const cards = Array.from(carousel.querySelectorAll('.menu-tab.tool-card'));
        const prev = document.querySelector('[data-card-prev]');
        const next = document.querySelector('[data-card-next]');
        const dotsHost = document.querySelector('[data-card-dots]');
        if (!cards.length) return;

        carousel.dataset.cardMenuReady = 'true';

        let active = Math.max(0, cards.findIndex(c => c.classList.contains('active')));
        let pointerStartX = 0;
        let dragging = false;
        let suppressClickUntil = 0;
        let syncFrame = 0;
        let idleTimer = null;
        const dots = [];

        function normalize(index) {
            return (index % cards.length + cards.length) % cards.length;
        }

        function relativePosition(index) {
            let pos = index - active;
            if (pos > cards.length / 2) pos -= cards.length;
            if (pos < -cards.length / 2) pos += cards.length;
            return pos;
        }

        function render() {
            cards.forEach((card, index) => {
                const pos = relativePosition(index);
                card.classList.remove(
                    'card-pos-left-2', 'card-pos-left', 'card-pos-center',
                    'card-pos-right', 'card-pos-right-2', 'card-pos-hidden'
                );
                const classes = {
                    '-2': 'card-pos-left-2',
                    '-1': 'card-pos-left',
                    '0': 'card-pos-center',
                    '1': 'card-pos-right',
                    '2': 'card-pos-right-2'
                };
                card.classList.add(classes[String(pos)] || 'card-pos-hidden');
                card.setAttribute('aria-current', index === active ? 'true' : 'false');
            });
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === active);
                dot.setAttribute('aria-current', index === active ? 'true' : 'false');
            });
        }

        function sync() {
            const current = cards.findIndex(c => c.classList.contains('active'));
            if (current >= 0) active = current;
            render();
        }

        function scheduleSync() {
            cancelAnimationFrame(syncFrame);
            syncFrame = requestAnimationFrame(sync);
        }

        function activate(index) {
            const target = cards[normalize(index)];
            if (!target) return;
            if (target === cards[active]) {
                render();
                return;
            }
            target.click();
            scheduleSync();
        }

        function nextCard() { activate(active + 1); }
        function previousCard() { activate(active - 1); }

        function stopIdle() {
            if (idleTimer) clearInterval(idleTimer);
            idleTimer = null;
        }

        function startIdle() {
            stopIdle();
            if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
            idleTimer = setInterval(nextCard, 6500);
        }

        function restartIdle() { startIdle(); }

        cards.forEach((card, index) => {
            card.setAttribute(
                'aria-label',
                card.querySelector('strong')?.textContent?.trim() || `Tool ${index + 1}`
            );

            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    card.click();
                    scheduleSync();
                }
            });

            card.addEventListener('click', event => {
                if (Date.now() < suppressClickUntil) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    return;
                }
                scheduleSync();
                restartIdle();
            }, true);
        });

        if (dotsHost) {
            dotsHost.replaceChildren();
            cards.forEach((card, index) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'tool-card-dot';
                dot.setAttribute(
                    'aria-label',
                    `Show ${card.querySelector('strong')?.textContent?.trim() || `tool ${index + 1}`}`
                );
                dot.addEventListener('click', () => {
                    activate(index);
                    restartIdle();
                });
                dotsHost.appendChild(dot);
                dots.push(dot);
            });
        }

        prev?.addEventListener('click', event => {
            event.preventDefault();
            previousCard();
            restartIdle();
        });

        next?.addEventListener('click', event => {
            event.preventDefault();
            nextCard();
            restartIdle();
        });

        carousel.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            pointerStartX = event.clientX;
            dragging = true;
            carousel.classList.add('is-dragging');
            carousel.setPointerCapture?.(event.pointerId);
            stopIdle();
        });

        carousel.addEventListener('pointerup', event => {
            if (!dragging) return;
            const distance = event.clientX - pointerStartX;
            dragging = false;
            carousel.classList.remove('is-dragging');

            if (Math.abs(distance) < 48) {
                startIdle();
                return;
            }

            suppressClickUntil = Date.now() + 350;
            distance < 0 ? nextCard() : previousCard();
            restartIdle();
        });

        carousel.addEventListener('pointercancel', () => {
            dragging = false;
            carousel.classList.remove('is-dragging');
            restartIdle();
        });

        carousel.addEventListener('mouseenter', stopIdle);
        carousel.addEventListener('mouseleave', startIdle);
        carousel.addEventListener('focusin', stopIdle);
        carousel.addEventListener('focusout', event => {
            if (!carousel.contains(event.relatedTarget)) startIdle();
        });

        document.addEventListener('keydown', event => {
            const el = document.activeElement;
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) ||
                el?.isContentEditable;
            if (typing) return;

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                nextCard();
                restartIdle();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                previousCard();
                restartIdle();
            }
        });

        // Keep the carousel synchronized if app.js changes .active.
        const observer = new MutationObserver(scheduleSync);
        cards.forEach(card => observer.observe(card, {
            attributes: true,
            attributeFilter: ['class']
        }));

        render();
        startIdle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();