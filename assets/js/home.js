/* ==========================================================================
   Inbound Select — home page modules
   ========================================================================== */
IB.ready(function (ctx) {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  /* ---------------------------------------------------------------------
     Hero ticket — one call's life, looping calmly
     --------------------------------------------------------------------- */
  var CALLS = [
    { city: 'Tampa, FL', st: 'FL', product: 'Final expense', num: '(813) •••-••47', time: '2:14 PM', id: 'IS-24021',
      offered: ['DW', 'MR', 'KO', 'PN', 'AL', 'JB'], win: 0, winner: 'Dana Whitfield', accept: '2.8s', plan: 60, price: '$35.00' },
    { city: 'Columbus, OH', st: 'OH', product: 'Medicare', num: '(614) •••-••02', time: '2:16 PM', id: 'IS-24027',
      offered: ['RS', 'TB', 'EM', 'LC'], win: 2, winner: 'Elena Marsh', accept: '3.6s', plan: 60, price: '$30.00' },
    { city: 'Phoenix, AZ', st: 'AZ', product: 'Final expense', num: '(480) •••-••19', time: '2:19 PM', id: 'IS-24031',
      offered: ['PN', 'SH', 'KO', 'GW', 'DW'], win: 0, winner: 'Priya Natarajan', accept: '1.9s', plan: 90, price: '$45.00' }
  ];

  var tk = {
    card: $('#ticket'), sig: $('#tkSig'), status: $('#tkStatus'), time: $('#tkTime'),
    city: $('#tkCity'), product: $('#tkProduct'), num: $('#tkNum'), state: $('#tkState'),
    avs: $('#tkAvs'), accept: $('#tkAccept'), timer: $('#tkTimer'),
    planS: $('#tkPlanS'), planP: $('#tkPlanP'), id: $('#tkId'),
    t1: $('.tstep[data-step="1"] .tstep__txt'), t2: $('#tkOfferTxt'), t3: $('#tkWinTxt'), t4: $('#tkConnTxt'),
    steps: $$('.tstep', $('#ticket')), bill: $$('#tkBill .bill-row')
  };
  IB.buildWave($('#tkWave'), 14, 3);

  function stepState(i, cls) { var s = tk.steps[i]; s.classList.remove('is-run', 'is-done', 'is-live'); if (cls) s.classList.add(cls); }

  function fillTicket(c) {
    tk.city.textContent = c.city; tk.product.textContent = c.product; tk.num.textContent = c.num;
    tk.time.textContent = c.time; tk.state.textContent = c.st;
    tk.accept.textContent = c.accept; tk.id.textContent = c.id;
    tk.t1.textContent = 'Detect the caller’s state';
    tk.t2.textContent = 'Offer to licensed agents';
    tk.t3.textContent = 'First to accept';
    tk.t4.textContent = 'Connect';
    tk.planS.textContent = c.plan + 's'; tk.planP.textContent = c.price; tk.timer.textContent = '00:00';
    tk.status.textContent = 'Incoming call'; tk.sig.classList.add('sig--ring');
    var show = window.matchMedia('(max-width: 640px)').matches ? 3 : 4;
    tk.avs.innerHTML = c.offered.slice(0, show).map(function (a) { return '<i class="av">' + a + '</i>'; }).join('') +
      (c.offered.length > show ? '<i class="av av--more">+' + (c.offered.length - show) + '</i>' : '');
    tk.steps.forEach(function (_, i) { stepState(i, null); });
  }

  var noteShown = false;
  function showNote() {
    if (noteShown) return; noteShown = true;
    var note = $('#heroNote'), arrow = $('#noteArrow'), head = $('#noteHead');
    var L = arrow.getTotalLength(), H = head.getTotalLength();
    gsap.set(arrow, { strokeDasharray: L + 1, strokeDashoffset: L + 1 });
    gsap.set(head, { strokeDasharray: H + 1, strokeDashoffset: H + 1 });
    gsap.timeline()
      .fromTo($('figcaption', note), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.9 })
      .to(arrow, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, '-=0.5')
      .to(head, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, '-=0.1');
  }

  function ticketTimeline(c) {
    var tl = gsap.timeline(), avs;
    tl.call(function () { fillTicket(c); avs = $$('.av', tk.avs); gsap.set(avs, { scale: 0.4, opacity: 0 }); avs = avs.filter(function (a) { return !a.classList.contains('av--more'); }); gsap.set($$('.av--more', tk.avs), { scale: 0.4, opacity: 0 }); })
      .set(tk.bill, { opacity: 0.32 })
      .fromTo(tk.card, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8 })
      // 1 · state detected
      .call(function () { stepState(0, 'is-run'); }, null, '+=0.35')
      .call(function () { stepState(0, 'is-done'); tk.t1.textContent = 'State detected'; }, null, '+=0.6')
      .fromTo(tk.state, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' }, '<')
      // 2 · offered to every licensed, free agent at once
      .call(function () { stepState(1, 'is-run'); tk.t2.textContent = 'Offered to ' + c.offered.length + ' licensed agents'; }, null, '+=0.25')
      .add(function () { gsap.to($$('.av', tk.avs), { scale: 1, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'back.out(1.6)' }); }, '<0.05')
      .call(function () { stepState(1, 'is-done'); }, null, '+=1')
      // 3 · first to accept
      .call(function () { stepState(2, 'is-run'); }, null, '+=0.2')
      .call(function () {
        tk.t3.innerHTML = '<b>' + c.winner + '</b> accepted';
        stepState(2, 'is-done');
        avs.forEach(function (a, i) { a.classList.toggle('is-win', i === c.win); a.classList.toggle('is-lose', i !== c.win); });
        tk.status.textContent = 'Connected'; tk.sig.classList.remove('sig--ring');
        showNote();
      }, null, '+=0.85')
      // 4 · connected, talk time runs
      .call(function () { stepState(3, 'is-live'); tk.t4.textContent = 'Connected'; }, null, '+=0.35');
    var clock = { s: 0 };
    tl.to(clock, { s: c.plan + 6, duration: 2.8, ease: 'power1.inOut', onUpdate: function () { tk.timer.textContent = IB.fmt(clock.s); } }, '<0.2')
      // plan reached → itemised
      .to(tk.bill, { opacity: 1, duration: 0.6, stagger: 0.14, ease: 'power2.out' }, '-=0.5')
      .to({}, { duration: 2.6 })
      .to(tk.card, { opacity: 0, y: -14, duration: 0.55, ease: 'power2.in' });
    return tl;
  }

  var heroLoop = null, callIdx = 0;
  function runHero() {
    var tl = ticketTimeline(CALLS[callIdx % CALLS.length]);
    tl.eventCallback('onComplete', function () { callIdx++; runHero(); });
    heroLoop = tl;
  }

  function staticTicket() {
    var c = CALLS[0];
    fillTicket(c);
    tk.steps.forEach(function (_, i) { stepState(i, i === 3 ? 'is-live' : 'is-done'); });
    $$('.av:not(.av--more)', tk.avs).forEach(function (a, i) { a.classList.toggle('is-win', i === c.win); a.classList.toggle('is-lose', i !== c.win); });
    tk.status.textContent = 'Connected'; tk.sig.classList.remove('sig--ring'); tk.timer.textContent = '01:06';
    tk.t1.textContent = 'State detected'; tk.t2.textContent = 'Offered to 6 licensed agents';
    tk.t3.innerHTML = '<b>' + c.winner + '</b> accepted'; tk.t4.textContent = 'Connected';
  }

  /* ---------------------------------------------------------------------
     How a call moves — auto-advancing steps with a product frame
     --------------------------------------------------------------------- */
  var stepBtns = $$('#steps .step');
  var views = $$('.fv');
  var crumbs = ['Numbers', 'Routing', 'Live calls', 'Calls'];
  var STEP_S = 6.5;
  var cur = 0, progress = null, inView = false, viewAnim = null;
  IB.buildWave($('#recWave'), 72, 11);

  function playView(i) {
    var v = views[i];
    if (viewAnim) viewAnim.kill();
    var tl = gsap.timeline();
    var kids = $$('.fv__head, .nrow, .elig__h, .elig__r, .oc, .rec, .tl li, .items__r, .fv__foot', v);
    tl.fromTo(kids, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.045, ease: 'expo.out' });
    if (i === 1) tl.fromTo($$('.ok, .no', v), { scale: 0 }, { scale: 1, duration: 0.45, stagger: 0.03, ease: 'back.out(2)' }, 0.25);
    if (i === 2) {
      var offer = $('.offer', v);
      offer.classList.remove('is-done'); v.classList.remove('is-connected');
      gsap.set($$('.oc__t i', v), { scaleX: 1 });
      tl.to($$('.oc__t i', v), { scaleX: 0.9, duration: 2.6, ease: 'none' }, 0.3)
        .call(function () { offer.classList.add('is-done'); }, null, 2.9)
        .call(function () { v.classList.add('is-connected'); }, null, 3.3);
    }
    if (i === 3) {
      var bars = $$('#recWave i');
      bars.forEach(function (b) { b.classList.remove('on'); });
      var p = { k: 0 };
      tl.to(p, { k: bars.length, duration: 4.2, ease: 'none', onUpdate: function () {
        var n = Math.floor(p.k);
        for (var j = 0; j < bars.length; j++) bars[j].classList.toggle('on', j < n);
      } }, 0.5);
    }
    viewAnim = tl;
  }

  function staticView(i) {
    if (i === 2) { $('.offer').classList.add('is-done'); views[2].classList.add('is-connected'); }
    if (i === 3) $$('#recWave i').forEach(function (b, j) { b.classList.toggle('on', j < 30); });
  }

  function runProgress() {
    if (progress) progress.kill();
    var bar = $('.step__bar i', stepBtns[cur]);
    progress = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: STEP_S, ease: 'none', paused: !inView,
      onComplete: function () { setStep((cur + 1) % stepBtns.length, true); } });
  }

  function setStep(i, animate) {
    if (i === cur && animate) return;
    var prev = views[cur], next = views[i];
    stepBtns.forEach(function (b, k) {
      b.classList.toggle('is-active', k === i);
      b.setAttribute('aria-selected', String(k === i));
      gsap.set($('.step__bar i', b), { scaleX: 0 });
    });
    $('#frameCrumb').textContent = crumbs[i];
    if (animate && MOTION) {
      gsap.to(prev, { opacity: 0, y: -8, duration: 0.35, ease: 'power2.in', onComplete: function () { prev.classList.remove('is-active'); gsap.set(prev, { y: 0 }); } });
      next.classList.add('is-active');
      gsap.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.2, ease: 'power2.out' });
      gsap.delayedCall(0.2, function () { playView(i); });
    } else {
      views.forEach(function (v, k) { v.classList.toggle('is-active', k === i); gsap.set(v, { opacity: k === i ? 1 : 0 }); });
      if (MOTION) playView(i); else staticView(i);
    }
    cur = i;
    if (MOTION) runProgress();
  }
  stepBtns.forEach(function (b, k) { b.addEventListener('click', function () { setStep(k, true); }); });

  /* ---------------------------------------------------------------------
     Callback Request voicemail
     --------------------------------------------------------------------- */
  var vm = $('#vm');
  IB.voicemail(vm, { seconds: 38, bars: 46, seed: 23,
    text: 'Hi, I saw your advert about Medicare plans. I turn sixty-five in March and I\'m not sure where to start. Could someone call me back? Thank you.' });
  $('#vmBuy').addEventListener('click', function () { vm.classList.toggle('is-taken'); });

  /* ---------------------------------------------------------------------
     Statement — words light up as you read
     --------------------------------------------------------------------- */
  var stmt = $('#statement');
  stmt.innerHTML = stmt.textContent.trim().split(/\s+/).map(function (w) {
    return '<span class="w' + (/^(right|now,)$/.test(w) ? ' em' : '') + '">' + w + '</span>';
  }).join(' ');

  if (!MOTION) { staticTicket(); setStep(0, false); return; }

  /* Hero stage + ticket loop join the hero timeline */
  ctx.hero.fromTo('.hero__stage', { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 1.4 }, 0.35)
          .add(runHero, 1.1);

  function syncStack() { var st = $('.ticket-stack'); if (st) st.style.height = tk.card.offsetHeight + 'px'; }
  syncStack(); window.addEventListener('resize', syncStack);

  ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top',
    onToggle: function (s) { if (heroLoop) s.isActive ? heroLoop.play() : heroLoop.pause(); } });

  gsap.to($$('.w', stmt), { opacity: 1, stagger: 0.12, ease: 'none',
    scrollTrigger: { trigger: stmt, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });

  setStep(0, false);
  ScrollTrigger.create({ trigger: '.how__body', start: 'top 75%', end: 'bottom 20%',
    onToggle: function (s) { inView = s.isActive; if (progress) inView ? progress.play() : progress.pause(); } });
  gsap.fromTo('[data-frame]', { y: 60, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 1.4,
    scrollTrigger: { trigger: '.how__body', start: 'top 82%', once: true } });

  gsap.fromTo('#vm', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.3, scrollTrigger: { trigger: '.cb__stage', start: 'top 78%', once: true } });
  gsap.fromTo('.vm--ghost', { y: 30, opacity: 0 }, { y: 0, opacity: function (i) { return i ? 0.75 : 0.45; }, duration: 1.3, stagger: 0.1, delay: 0.15,
    scrollTrigger: { trigger: '.cb__stage', start: 'top 78%', once: true } });
});
