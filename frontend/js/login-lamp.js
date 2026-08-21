/**
 * Login lamp — pull-cord physics + light toggle
 * CSS scoped under .login-overlay only (does not affect admin panel).
 */
(function () {
  'use strict';

  const ROOT = document.documentElement;
  const overlay = document.getElementById('loginOverlay');
  const card = document.getElementById('js-card');
  const cord = document.getElementById('js-cord');
  const hit = document.getElementById('js-hit');
  const lampEl = document.querySelector('.login-overlay .lamp');
  const hint = document.getElementById('loginLampHint');
  const audioEl = document.getElementById('lampClickAudio');

  if (!cord || !hit || !lampEl || !card || !overlay) return;

  function setOn(v) {
    overlay.style.setProperty('--lamp-on', v);
    ROOT.style.setProperty('--lamp-on', v);
  }
  setOn('0');

  const AX = 124;
  const AY = 190;
  const REST_X = 124;
  const REST_Y = 348;
  const TRIGGER_DIST = 55;

  let dragging = false;
  let animating = false;
  let lightOn = false;
  let curX = REST_X;
  let curY = REST_Y;

  function toSVG(sx, sy) {
    const pt = lampEl.createSVGPoint();
    pt.x = sx;
    pt.y = sy;
    return pt.matrixTransform(lampEl.getScreenCTM().inverse());
  }

  function buildCord(tx, ty) {
    const dx = tx - AX;
    const dy = ty - AY;
    const sag = Math.max(4, 30 - Math.hypot(dx, dy) * 0.06);
    const c1x = AX + dx * 0.15 + sag;
    const c1y = AY + dy * 0.3 + sag;
    const c2x = AX + dx * 0.7 - sag * 0.3;
    const c2y = AY + dy * 0.72 - sag * 0.2;
    return 'M' + AX + ',' + AY + ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + tx + ',' + ty;
  }

  function updateCord(tx, ty) {
    curX = tx;
    curY = ty;
    cord.setAttribute('d', buildCord(tx, ty));
    const tension = Math.min(Math.hypot(tx - REST_X, ty - REST_Y) / 120, 1);
    cord.style.stroke = 'hsl(270, 0%, ' + Math.round(38 + tension * 52) + '%)';
  }

  function easeElastic(t) {
    if (!t || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  }

  function easeOutBounce(t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) {
      t -= 1.5 / 2.75;
      return 7.5625 * t * t + 0.75;
    }
    if (t < 2.5 / 2.75) {
      t -= 2.25 / 2.75;
      return 7.5625 * t * t + 0.9375;
    }
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  }

  function springBack(fromX, fromY, triggered) {
    if (animating) return;
    animating = true;
    const dur = triggered ? 380 : 500;
    const t0 = performance.now();
    function tick(now) {
      const t = Math.min((now - t0) / dur, 1);
      const fn = triggered ? easeElastic(t) : easeOutBounce(t);
      updateCord(fromX + (REST_X - fromX) * fn, fromY + (REST_Y - fromY) * fn);
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      updateCord(REST_X, REST_Y);
      cord.style.stroke = '';
      animating = false;
    }
    requestAnimationFrame(tick);
  }

  function client(e) {
    return e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
  }

  function onDown(e) {
    if (animating) return;
    e.preventDefault();
    dragging = true;
  }
  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const c = client(e);
    const sv = toSVG(c.x, c.y);
    updateCord(sv.x, Math.max(AY + 20, sv.y));
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    const dist = Math.hypot(curX - REST_X, curY - REST_Y);
    if (dist > TRIGGER_DIST) toggleLight();
    springBack(curX, curY, dist > TRIGGER_DIST);
  }

  [hit, cord].forEach(function (el) {
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
  });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  function playClick() {
    try {
      if (!audioEl) return;
      audioEl.currentTime = 0;
      const p = audioEl.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  }

  function toggleLight() {
    playClick();
    lightOn = !lightOn;
    setOn(lightOn ? '1' : '0');
    card.classList.toggle('is-active', lightOn);
    if (hint) hint.classList.toggle('is-hidden', lightOn);
    if (lightOn) {
      const user = document.getElementById('loginUser');
      if (user) setTimeout(function () { try { user.focus(); } catch (e) {} }, 400);
    }
  }

  function resetLamp() {
    lightOn = false;
    setOn('0');
    card.classList.remove('is-active');
    if (hint) hint.classList.remove('is-hidden');
    updateCord(REST_X, REST_Y);
    cord.style.stroke = '';
  }

  window.MLBB_loginLamp = {
    reset: resetLamp,
    turnOn: function () {
      if (!lightOn) toggleLight();
    },
    isOn: function () {
      return lightOn;
    }
  };

  const pwInput = document.getElementById('loginPass');
  const toggleBtn = document.getElementById('js-toggle-pw');
  if (pwInput && toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const show = pwInput.type === 'password';
      pwInput.type = show ? 'text' : 'password';
      toggleBtn.textContent = show ? '🙈' : '👁';
    });
  }

  if (!overlay.classList.contains('hidden')) resetLamp();
})();
