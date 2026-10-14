/* ==========================================================================
   How it works — page modules
   1. The life of a call: a scrubbed rail, nodes that light as you pass,
      and one small artifact per stage that settles in once.
   2. What the agent sees: the incoming-call card (the page's one
      interactive moment). Ringing → Accept → Connecting → Connected,
      or Pass → Still ringing → Another agent accepted, or 40s → expired.
   ========================================================================== */
IB.ready(function () {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  // Waveforms used by the artifacts and the card
  $$('[data-wave]').forEach(function (el) {
    IB.buildWave(el, +el.getAttribute('data-wave'), +(el.getAttribute('data-seed') || 7));
  });

  /* ---------------------------------------------------------------------
     1 · The life of a call
     --------------------------------------------------------------------- */
  var stages = $$('.lc__stage');

  // Per-stage artifact choreography (runs once, when the stage arrives)
  var ART = {
    ring: function (a, tl) {
      tl.from($$('.lc-big, .lc-kv, .lc-card__f', a), { opacity: 0, y: 8, duration: 0.8, stagger: 0.08 }, 0.3);
    },
    state: function (a, tl) {
      tl.from($('.lc-state__num', a), { opacity: 0, x: -8, duration: 0.8 }, 0.3)
        .fromTo($('.lc-state__arr path', a), { strokeDashoffset: 48 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 0.55)
        .from($('.lc-state__st', a), { opacity: 0, scale: 0.7, duration: 0.6, ease: 'back.out(2)' }, 1.05)
        .from($('.lc-state + .lc-kv', a), { opacity: 0, y: 6, duration: 0.7 }, 1.3);
    },
    checks: function (a, tl) {
      var rows = $$('.tstep', a), pill = $('.lc-elig', a), foot = $('.lc-card__f', a);
      rows.forEach(function (r) { r.classList.remove('is-done'); });
      gsap.set([pill, foot], { opacity: 0 });
      rows.forEach(function (r, i) {
        var t = 0.45 + i * 0.3;
        tl.call(function () { r.classList.add('is-run'); }, null, t)
          .call(function () { r.classList.remove('is-run'); r.classList.add('is-done'); }, null, t + 0.26);
      });
      var end = 0.45 + rows.length * 0.3 + 0.1;
      tl.fromTo(pill, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, end)
        .to(foot, { opacity: 1, duration: 0.7 }, end + 0.1);
    },
    offer: function (a, tl) {
      // all rows arrive together: that is the point
      tl.from($$('.lc-offer li', a), { opacity: 0, x: -10, duration: 0.8, stagger: 0 }, 0.35)
        .fromTo($('.lc-bar i', a), { scaleX: 1 }, { scaleX: 0.93, duration: 2.8, ease: 'none' }, 0.35)
        .from($('.lc-card__f', a), { opacity: 0, duration: 0.7 }, 0.8);
    },
    accept: function (a, tl) {
      tl.from($('.lc-who .av', a), { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, 0.3)
        .from($$('.lc-who > div, .lc-who .wave, .lc-script, .lc-card__f', a), { opacity: 0, y: 8, duration: 0.8, stagger: 0.08 }, 0.4);
    },
    outcome: function (a, tl) {
      var chips = $$('.lc-out', a), on = $('.lc-out.is-on', a);
      on.classList.remove('is-on');
      tl.from(chips, { opacity: 0, y: 6, duration: 0.6, stagger: 0.04 }, 0.3)
        .call(function () { on.classList.add('is-on'); }, null, 1.05)
        .from($('.lc-prem', a), { opacity: 0, y: 8, duration: 0.7 }, 1.2);
    },
    receipt: function (a, tl) {
      tl.from($$('.lc-li', a), { opacity: 0, y: 8, duration: 0.7, stagger: 0.09 }, 0.3)
        .from($('.lc-card__h .pill', a), { opacity: 0, scale: 0.8, duration: 0.5, ease: 'back.out(2)' }, 0.95);
    },
    callback: function (a, tl) {
      tl.from($$('.lc-cb__who, .lc-cb__msg', a), { opacity: 0, y: 8, duration: 0.8, stagger: 0.08 }, 0.3);
    }
  };

  if (!MOTION) {
    stages.forEach(function (s) { s.classList.add('is-on'); });
  } else {
    stages.forEach(function (s, i) {
      var node = $('.lc__node', s), next = stages[i + 1];

      // The node lights when the rail's leading edge (62% down the viewport) reaches it
      ScrollTrigger.create({
        trigger: node, start: 'center 62%',
        onEnter: function () { s.classList.add('is-on'); },
        onLeaveBack: function () { s.classList.remove('is-on'); }
      });

      // The rail fills from this node to the next, scrubbed with the scroll
      var fill = $('.lc__seg i', s);
      if (fill && next) {
        gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none',
          scrollTrigger: { trigger: node, start: 'center 62%', endTrigger: $('.lc__node', next), end: 'center 62%', scrub: 0.3 } });
      }

      // The artifact settles in once
      var art = $('.lc__art', s), key = s.getAttribute('data-stage');
      var tl = gsap.timeline({ paused: true });
      tl.to(art, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, 0);
      if (ART[key]) ART[key](art, tl);
      ScrollTrigger.create({ trigger: s, start: 'top 74%', once: true, onEnter: function () { tl.play(); } });
    });
  }

  /* ---------------------------------------------------------------------
     2 · The incoming-call card
     --------------------------------------------------------------------- */
  var card = $('#ac');
  if (!card) return;

  var WINDOW = 40, C = 2 * Math.PI * 28;
  var SIG = '<span class="sig sig--ring" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  var ringFg = $('#acRing'), ringN = $('#acN'), seg = $('#acSeg'), thumb = $('.ac-seg__thumb', seg), opts = $$('.ac-seg__o', seg);
  var hint = $('#acHint'), st = $('#acSt');
  var vRing = $('[data-v="ring"]', card), vLive = $('[data-v="live"]', card);
  var timer = $('#acTimer'), bar = $('#acBar'), plL = $('#acPlL'), plR = $('#acPlR');
  var plan = { s: 60, p: 35 }, left = WINDOW, talkT = 0, visible = false, state = 'ringing', timers = [];

  ringFg.style.strokeDasharray = C.toFixed(2);

  function setRing(sec) {
    ringFg.style.strokeDashoffset = (C * (1 - sec / WINDOW)).toFixed(2);
    ringN.textContent = Math.max(0, Math.ceil(sec - 0.001));
    card.classList.toggle('is-low', sec <= 10 && sec > 0);
  }

  /* plan picker */
  function placeThumb() {
    var on = $('.ac-seg__o[aria-checked="true"]', seg);
    if (!on || !on.offsetWidth) return;
    thumb.style.width = on.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + (on.offsetLeft - 3) + 'px)';
  }
  function choose(o, focus) {
    opts.forEach(function (x) { var on = x === o; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
    plan = { s: +o.getAttribute('data-s'), p: +o.getAttribute('data-p') };
    hint.textContent = 'Charged only if talk time reaches ' + plan.s + 's';
    placeThumb();
    if (focus) o.focus();
  }
  seg.addEventListener('click', function (e) {
    var o = e.target.closest('.ac-seg__o');
    if (o && state === 'ringing') choose(o);
  });
  seg.addEventListener('keydown', function (e) {
    var i = opts.indexOf(document.activeElement), d = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1;
    if (!d || i < 0 || state !== 'ringing') return;
    e.preventDefault();
    choose(opts[(i + d + opts.length) % opts.length], true);
  });
  placeThumb();
  requestAnimationFrame(function () { seg.classList.add('ready'); });
  window.addEventListener('resize', placeThumb);

  /* states */
  function setState(s) { state = s; card.setAttribute('data-state', s); }
  function status(html, cls) {
    st.className = 'ac__st' + (cls ? ' ' + cls : '');
    st.innerHTML = html;
    if (MOTION) gsap.fromTo(st, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.42, ease: 'expo.out', overwrite: true });
  }
  function later(fn, ms) { timers.push(setTimeout(fn, MOTION ? ms : 0)); }
  function show(view) {
    var live = view === 'live';
    vLive.setAttribute('aria-hidden', String(!live)); vLive.inert = !live;
    vRing.setAttribute('aria-hidden', String(live)); vRing.inert = live;
  }

  /* One clock for the card. It counts real seconds, but only while the card
     is on screen, and clamps long frames (hidden tab, slow device) so time
     never jumps. Reduced motion: the ring holds at 40 and nothing ticks. */
  function frame(time, dtMs) {
    if (!visible) return;
    var dt = Math.min(dtMs, 100) / 1000;
    if (state === 'ringing') {
      left = Math.max(0, left - dt); setRing(left);
      if (left <= 0) expire();
    } else if (state === 'live') {
      talkT += dt; renderLive(talkT);
    }
  }
  function expire() {
    if (state !== 'ringing') return;
    setState('expired'); card.classList.add('is-locked');
    status('<span class="ac__st-ic" aria-hidden="true"></span><span><b>Nobody accepted in 40 seconds.</b> The caller can leave a message for Callback Requests.</span>', 'is-amber');
  }

  /* connected: talk time against the chosen plan */
  function renderLive(t) {
    timer.textContent = IB.fmt(t);
    var f = Math.min(1, t / plan.s), reached = t >= plan.s;
    bar.style.transform = 'scaleX(' + f.toFixed(4) + ')';
    card.classList.toggle('is-reached', reached);
    plR.textContent = reached ? 'Reached · $' + plan.p + ' will be charged' : Math.ceil(plan.s - t) + 's to go';
  }
  function goLive() {
    setState('live');
    plL.textContent = 'Plan ' + plan.s + 's · $' + plan.p;
    show('live');
    talkT = MOTION ? 0 : plan.s + 6;
    renderLive(talkT);
  }

  $('#acAccept').addEventListener('click', function () {
    if (state !== 'ringing') return;
    setState('connecting'); card.classList.add('is-locked');
    status(SIG + '<span>Connecting…</span>');
    later(goLive, 1300);
  });

  $('#acPass').addEventListener('click', function () {
    if (state !== 'ringing') return;
    setState('passing'); card.classList.add('is-locked');
    status(SIG + '<span>Still ringing for the 5 other agents…</span>', 'is-muted');
    later(function () {
      setState('taken');
      status('<i class="av" aria-hidden="true">MR</i><span><b>Another agent accepted.</b> Marcus Reed took the call. You’re still available.</span>');
    }, 1900);
  });

  $('#acSkip').addEventListener('click', function () {
    if (state !== 'live') return;
    talkT += talkT < plan.s - 6 ? (plan.s - 4 - talkT) : 30;
    renderLive(talkT);
  });

  $('#acReset').addEventListener('click', function () {
    timers.forEach(clearTimeout); timers = [];
    card.classList.remove('is-locked', 'is-reached', 'is-low');
    st.innerHTML = ''; st.className = 'ac__st';
    show('ring'); setState('ringing');
    bar.style.transform = 'scaleX(0)'; timer.textContent = '00:00';
    choose(opts[1]);
    left = WINDOW; talkT = 0; setRing(left);
  });

  // The clock runs only while the card can be seen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.35 }).observe(card);
  } else visible = true;
  setRing(left);
  if (MOTION) gsap.ticker.add(frame);
});
