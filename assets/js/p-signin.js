/* ==========================================================================
   Inbound Select — Sign in
   Role tabs (Agency / Agent), a gentle signal-bar loader, then the curtain
   into the product: app.html, or app.html#/agent for agents.
   ========================================================================== */
IB.ready(function (ctx) {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  var seg = $('#siSeg'), form = $('#siForm');
  if (!seg || !form) return;
  var tabs = $$('.seg__b', seg);
  // The headline is split (and later reverted) by site.js, so look the phrase up each time
  var lede = $('#siLede'), email = $('#siEmail');

  var ROLES = {
    agency: { what: 'your console.', lede: 'Routing, agents, numbers and billing for your agency.', ph: 'you@youragency.com', go: 'app.html' },
    agent: { what: 'your calls.', lede: 'Take calls, log outcomes and see each charge against the call it came from.', ph: 'you@email.com', go: 'app.html#/agent' }
  };
  var role = 'agency';

  function setRole(r, focus) {
    if (r === role) return;
    role = r;
    seg.setAttribute('data-role', r);
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-role') === r;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    form.setAttribute('aria-labelledby', r === 'agent' ? 'tabAgent' : 'tabAgency');
    email.placeholder = ROLES[r].ph;
    var what = $('#siWhat');
    var swap = function () { what = $('#siWhat'); what.textContent = ROLES[r].what; lede.textContent = ROLES[r].lede; };
    if (!MOTION) { swap(); return; }
    gsap.killTweensOf([what, lede]);
    gsap.timeline()
      .to([what, lede], { opacity: 0, y: -6, duration: 0.18, ease: 'power2.in' })
      .add(swap)
      .fromTo(what, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' })
      .fromTo(lede, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, '<0.05');
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { setRole(t.getAttribute('data-role')); });
  });
  seg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setRole(e.key === 'ArrowLeft' || e.key === 'Home' ? 'agency' : 'agent', true);
    }
  });

  /* Show / hide password */
  var pw = $('#siPw'), show = $('#siShow');
  show.addEventListener('click', function () {
    var on = pw.type === 'password';
    pw.type = on ? 'text' : 'password';
    show.textContent = on ? 'Hide' : 'Show';
    show.setAttribute('aria-pressed', String(on));
  });

  /* Forgot password: a quiet, honest note */
  var forgot = $('#siForgot'), note = $('#siNote');
  forgot.addEventListener('click', function (e) {
    e.preventDefault();
    var on = !note.classList.contains('is-on');
    note.classList.toggle('is-on', on);
    forgot.setAttribute('aria-expanded', String(on));
  });

  /* Sign in: any input works. Loader, then the curtain via site.js */
  var btn = $('#siBtn'), go = $('#siGo'), busy = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    setTimeout(function () {
      go.setAttribute('href', ROLES[role].go);
      go.click(); // site.js plays the curtain and sets the arrival flag
    }, MOTION ? 1150 : 250);
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { busy = false; btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); }
  });

  /* Ringing calls: ring times tick, and a call that reaches its 40s window is replaced */
  var waits = $$('.si__q-t');
  function label(s) { return '0:' + (s < 10 ? '0' : '') + s; }
  if (MOTION) {
    setInterval(function () {
      waits.forEach(function (t) {
        var s = +t.getAttribute('data-s') + 1;
        if (s >= 40) {
          s = 0;
          gsap.fromTo(t.parentNode, { opacity: 0.2 }, { opacity: 1, duration: 0.8, ease: 'expo.out' });
        }
        t.setAttribute('data-s', s);
        t.textContent = label(s);
      });
    }, 1000);
  }

  if (!MOTION) { gsap.set('#siCard', { opacity: 1 }); return; }

  /* Arrival: the card settles, then the ringing-calls ticket rises over the photo */
  ctx.hero.fromTo('#siCard', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 0.05)
          .fromTo('#siTk', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 0.8);
});
