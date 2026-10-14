/* ==========================================================================
   Inbound Select — Agents page
   1 · Hero: the incoming-call card arrives after the photo
   2 · A shift: the hairline draws from step to step
   3 · Talk-time explainer: pick a plan, drag the talk time, see the charge
   ========================================================================== */
IB.ready(function (ctx) {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  /* ---------------------------------------------------------------------
     3 · Talk-time explainer
     --------------------------------------------------------------------- */
  var MAX = 180;
  var tt = $('#tt'), track = $('#ttTrack'), range = $('#ttRange');
  var clockEl = $('#ttClock'), amtEl = $('#ttAmt'), whyEl = $('#ttWhy'), recEl = $('#ttRec'), markL = $('#ttMarkL');
  var seg = $('#ttSeg'), segBtns = $$('.seg__b', seg);
  var plan = { s: 60, p: 35 }, talk = 72, charged = null, shown = { v: 35 }, intro = null;

  function money(v) { return v.toFixed(2); }
  function clock(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function spoken(s) {
    var m = Math.floor(s / 60), r = s % 60, out = [];
    if (m) out.push(m + (m === 1 ? ' minute' : ' minutes'));
    if (r || !m) out.push(r + (r === 1 ? ' second' : ' seconds'));
    return out.join(' ');
  }

  function showAmount(to, instant) {
    if (instant || !MOTION) { gsap.killTweensOf(shown); shown.v = to; amtEl.textContent = money(to); return; }
    gsap.to(shown, { v: to, duration: 0.75, ease: 'power3.out', overwrite: true,
      onUpdate: function () { amtEl.textContent = money(shown.v); } });
  }

  function render(o) {
    o = o || {};
    var isC = talk >= plan.s;
    track.style.setProperty('--t', (talk / MAX).toFixed(4));
    clockEl.textContent = clock(talk);
    range.setAttribute('aria-valuetext', spoken(talk));
    if (isC) whyEl.textContent = 'The call reached ' + plan.s + ' seconds, so your ' + plan.s + 's plan applies.';
    else if (talk === 0) whyEl.textContent = 'The caller hung up straight away. Nothing is charged.';
    else whyEl.textContent = 'The call ended at ' + clock(talk) + ', before your ' + plan.s + 's plan. Nothing is charged.';
    if (isC !== charged || o.plan) {
      tt.classList.toggle('is-charged', isC);
      showAmount(isC ? plan.p : 0, o.instant);
    }
    charged = isC;
  }

  function setPlan(btn, o) {
    var i = segBtns.indexOf(btn);
    plan = { s: +btn.getAttribute('data-s'), p: +btn.getAttribute('data-p') };
    segBtns.forEach(function (b) { var on = b === btn; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    seg.style.setProperty('--i', i);
    track.style.setProperty('--p', (plan.s / MAX).toFixed(4));
    markL.textContent = plan.s + 's';
    recEl.textContent = '$' + money(plan.p);
    render({ plan: true, instant: o && o.instant });
  }

  function stopIntro() { if (intro) { intro.kill(); intro = null; } }

  segBtns.forEach(function (b) {
    b.addEventListener('click', function () { stopIntro(); setPlan(b); });
  });
  // Arrow keys move through the plans, as in any radio group
  seg.addEventListener('keydown', function (e) {
    var cur = segBtns.indexOf(document.activeElement);
    if (cur < 0) return;
    var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    var next = segBtns[(cur + d + segBtns.length) % segBtns.length];
    next.focus(); stopIntro(); setPlan(next);
  });

  range.addEventListener('input', function () { stopIntro(); talk = +range.value; render(); });
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { range.addEventListener(ev, stopIntro, { passive: true }); });

  setPlan(segBtns[1], { instant: true });

  /* ---------------------------------------------------------------------
     Motion
     --------------------------------------------------------------------- */
  if (!MOTION) return;

  // 1 · the incoming call settles onto the photo after it arrives
  ctx.hero.fromTo('.ring-card', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 1.05);

  // 2 · the shift's hairline draws from step to step
  var shiftLines = $$('#shift .shift__ln');
  var vertical = window.matchMedia('(max-width: 760px)').matches;
  gsap.set(shiftLines, vertical ? { scaleY: 0 } : { scaleX: 0 });
  ScrollTrigger.create({ trigger: '#shift', start: 'top 82%', once: true, onEnter: function () {
    gsap.to(shiftLines, { scaleX: 1, scaleY: 1, duration: 0.7, stagger: 0.14, ease: 'power2.inOut', delay: 0.25 });
  } });

  // 3 · on first view, a call plays out: the talk time runs past the plan
  talk = 0; range.value = 0; render({ instant: true });
  ScrollTrigger.create({ trigger: tt, start: 'top 68%', once: true, onEnter: function () {
    var o = { v: 0 };
    intro = gsap.to(o, { v: 72, duration: 2.8, delay: 0.4, ease: 'power1.inOut',
      onUpdate: function () { var v = Math.round(o.v); if (v !== talk) { talk = v; range.value = v; render(); } },
      onComplete: function () { intro = null; } });
  } });
});
