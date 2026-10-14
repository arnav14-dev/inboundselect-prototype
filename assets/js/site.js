/* ==========================================================================
   Inbound Select — shared site motion (every marketing page)
   One curve family: expo.out for entrances, expo.inOut for the curtain.

   Page scripts register with IB.ready(function (ctx) { … }) and may add to
   ctx.hero (the hero timeline) before it plays.

   Generic hooks, usable on any page:
     [data-split="hero"]  hero headline, masked line reveal on load
     [data-hero]          hero items that fade up on load, in order
     [data-hero-media]    hero artifact/photo that rises in on load
     [data-split]         section headline, masked line reveal on scroll
     [data-reveal]        fade up on scroll (batched, once)
     [data-photo]         figure with <img>: clip reveal + inner settle + drift
     [data-count="40"]    number counts up on scroll (data-decimals, data-format="comma")
     [data-settle]        panel that scales 0.94 → 1 as it scrolls in (dark bands)
     .faq details         smooth accordion
     .close__sig i        closing signal bars rise
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var MOTION = html.classList.contains('motion');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'expo.out', duration: 1 });
  if (window.IBBrand) IBBrand.fill();

  var readyFns = [];
  var IB = window.IB = {
    $: $, $$: $$, MOTION: MOTION, lenis: null,
    ready: function (fn) { readyFns.push(fn); }
  };

  /* ---------------------------------------------------------------------
     Smooth scroll
     --------------------------------------------------------------------- */
  var lenis = null;
  if (MOTION && window.Lenis) {
    lenis = IB.lenis = window.__lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  IB.scrollTo = function (target, offset) {
    var el = typeof target === 'string' ? (target === '#top' ? document.body : $(target)) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: offset == null ? -24 : offset, duration: 1.4, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else el.scrollIntoView({ behavior: MOTION ? 'smooth' : 'auto' });
  };

  /* ---------------------------------------------------------------------
     Nav: solid after scrolling, hides going down, returns going up
     --------------------------------------------------------------------- */
  var nav = $('#nav');
  var menuBtn = $('#navMenu');
  var lastY = 0;
  function onScroll(y) {
    nav.classList.toggle('is-scrolled', y > 8);
    if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > 480 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
  }
  if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
  else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
  onScroll(window.scrollY);

  function closeMenu() { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  /* ---------------------------------------------------------------------
     Links: in-page anchors scroll smoothly; other pages get the curtain
     --------------------------------------------------------------------- */
  var curtain = $('#curtain');
  var leaving = false;

  function isInternalPage(a) {
    var href = a.getAttribute('href') || '';
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (/^(mailto:|tel:|https?:|#|javascript:)/i.test(href)) return false;
    return /\.html(#.*)?$/.test(href);
  }

  function leaveTo(url) {
    if (leaving) return;
    leaving = true;
    closeMenu();
    try { sessionStorage.setItem('ib-nav', '1'); } catch (e) {}
    if (!MOTION || !curtain) { location.href = url; return; }
    curtain.classList.add('is-on');
    gsap.fromTo(curtain, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.42, ease: 'power3.inOut',
      onComplete: function () { location.href = url; } });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute('href');
    if (href.charAt(0) === '#' && href.length > 1) {
      e.preventDefault(); closeMenu(); IB.scrollTo(href, href === '#top' ? 0 : -24); return;
    }
    if (isInternalPage(a)) {
      var here = location.pathname.split('/').pop() || 'index.html';
      var there = href.split('#')[0];
      if (there === here && href.indexOf('#') > -1) { e.preventDefault(); IB.scrollTo('#' + href.split('#')[1]); return; }
      e.preventDefault();
      leaveTo(href);
    }
  });

  // Back/forward cache: never come back to a closed curtain
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && curtain) { leaving = false; curtain.classList.remove('is-on'); gsap.set(curtain, { clipPath: 'inset(0% 0% 100% 0%)' }); html.classList.remove('is-arriving'); }
  });

  /* ---------------------------------------------------------------------
     Helpers shared with page scripts
     --------------------------------------------------------------------- */
  IB.fmt = function (sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; };

  IB.buildWave = function (el, n, seed) {
    var s = seed || 7, out = '';
    for (var i = 0; i < n; i++) {
      s = (s * 9301 + 49297) % 233280;
      var r = s / 233280;
      var env = 0.35 + 0.65 * Math.abs(Math.sin(i / n * Math.PI * 3.2 + 0.4)); // speech-like phrases
      out += '<i style="--h:' + Math.max(12, Math.round((18 + r * 82) * env)) + '%;--i:' + i + '"></i>';
    }
    el.innerHTML = out;
    return $$('i', el);
  };

  IB.splitReveal = function (el, opts) {
    opts = opts || {};
    var split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(el, { visibility: 'visible' });
    return gsap.from(split.lines, {
      yPercent: 112, duration: opts.duration || 1.15, stagger: 0.085, ease: 'expo.out',
      delay: opts.delay || 0, paused: !!opts.paused,
      scrollTrigger: opts.paused ? null : { trigger: el, start: 'top 86%', once: true },
      onComplete: function () { split.revert(); }
    });
  };

  /* Voicemail playback: the system voice reads the message while a waveform fills.
     IB.voicemail(rootEl, { text, seconds, bars }) — root contains .vm-play, .wave, .vm-time */
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    var vs = speechSynthesis.getVoices();
    var pref = ['Samantha', 'Karen', 'Moira', 'Google US English', 'Microsoft Aria'];
    for (var p = 0; p < pref.length; p++) for (var v = 0; v < vs.length; v++) if (vs[v].name.indexOf(pref[p]) === 0) return vs[v];
    for (var w = 0; w < vs.length; w++) if (/^en[-_]US/i.test(vs[w].lang)) return vs[w];
    return null;
  }
  if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () {}; }
  var activeVm = null;
  IB.voicemail = function (root, o) {
    var btn = $('.vm-play', root), waveEl = $('.wave', root), tEl = $('.vm-time', root);
    var bars = IB.buildWave(waveEl, o.bars || 46, o.seed || 23);
    var total = o.seconds || 30, playing = false, tween = null;
    function label(sec) { var m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
    function progress(f) {
      var n = Math.round(f * bars.length);
      for (var j = 0; j < bars.length; j++) bars[j].classList.toggle('on', j < n);
      if (tEl) tEl.textContent = label(f * total);
    }
    function stop() {
      playing = false; root.classList.remove('is-playing');
      if (tween) tween.kill();
      if (window.speechSynthesis) speechSynthesis.cancel();
      progress(0); if (tEl) tEl.textContent = label(total);
      if (activeVm === api) activeVm = null;
    }
    function play() {
      if (activeVm && activeVm !== api) activeVm.stop();
      activeVm = api; playing = true; root.classList.add('is-playing');
      var spoke = false;
      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        try {
          speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(o.text);
          var voice = pickVoice(); if (voice) u.voice = voice;
          u.rate = 0.94;
          u.onboundary = function (e) { if (playing) { if (tween) tween.kill(); progress(Math.min(1, (e.charIndex + 4) / o.text.length)); } };
          u.onend = function () { if (playing) { progress(1); setTimeout(stop, 500); } };
          speechSynthesis.speak(u); spoke = true;
        } catch (err) { spoke = false; }
      }
      var p = { f: 0 };
      tween = gsap.to(p, { f: 1, duration: spoke ? Math.max(6, o.text.length / 15) : 6, ease: 'none', onUpdate: function () { progress(p.f); },
        onComplete: function () { if (!spoke) setTimeout(stop, 500); } });
    }
    var api = { stop: stop, play: play };
    btn.addEventListener('click', function () { playing ? stop() : play(); });
    if (tEl) tEl.textContent = label(total);
    return api;
  };

  /* ---------------------------------------------------------------------
     FAQ accordions (works without motion too)
     --------------------------------------------------------------------- */
  $$('.faq details').forEach(function (d) {
    var sum = $('summary', d), body = $('.faq__a', d);
    if (!sum || !body) return;
    sum.addEventListener('click', function (e) {
      if (!MOTION) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: 0.45, ease: 'power3.inOut', onComplete: function () { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
        d.classList.remove('is-open');
      } else {
        d.open = true; d.classList.add('is-open');
        gsap.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', onComplete: function () { gsap.set(body, { clearProps: 'height' }); } });
      }
    });
  });

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  function boot() {
    var ctx = { hero: gsap.timeline({ paused: true }) };

    if (!MOTION) {
      $$('[data-split]').forEach(function (el) { el.style.visibility = 'visible'; });
      readyFns.forEach(function (fn) { fn(ctx); });
      return;
    }

    /* Hero: headline lines, nav, items, media */
    var heroSplit = $('[data-split="hero"]');
    if (heroSplit) ctx.hero.add(IB.splitReveal(heroSplit, { paused: true, duration: 1.25 }).play(), 0);
    ctx.hero.fromTo('#nav', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, 0.1);
    if ($('[data-hero]')) ctx.hero.to('[data-hero]', { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.3);
    if ($('[data-hero-media]')) ctx.hero.fromTo('[data-hero-media]', { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 1.4, stagger: 0.1 }, 0.35);

    readyFns.forEach(function (fn) { fn(ctx); });

    /* Arrival: curtain lifts / first visit: intro / otherwise straight in */
    var intro = $('#intro');
    if (html.classList.contains('play-intro') && intro) {
      try { sessionStorage.setItem('is-intro', '1'); } catch (e) {}
      if (lenis) lenis.stop();
      var bars = $$('.intro .ib-bar');
      gsap.timeline({ onComplete: function () { intro.remove(); if (lenis) lenis.start(); } })
        .fromTo(bars, { scaleY: 0, transformOrigin: '50% 100%', visibility: 'visible' }, { scaleY: 1, duration: 0.55, stagger: 0.07, ease: 'expo.out' }, 0.05)
        .to('.intro__mark', { y: -8, opacity: 0, duration: 0.3, ease: 'power2.in' }, '+=0.05')
        .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 0.65, ease: 'power3.inOut' }, '-=0.15')
        .add(function () { ctx.hero.play(); }, '-=0.45');
    } else {
      if (intro) intro.remove();
      if (html.classList.contains('is-arriving') && curtain) {
        gsap.timeline({ onComplete: function () { html.classList.remove('is-arriving'); curtain.classList.remove('is-on'); } })
          .fromTo(curtain, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: 'power3.inOut' }, 0)
          .add(function () { ctx.hero.play(); }, 0.15);
      } else {
        ctx.hero.play();
      }
    }

    /* Arriving with a #hash from another page */
    if (location.hash && $(location.hash)) setTimeout(function () { IB.scrollTo(location.hash); }, 900);

    /* Section headlines */
    $$('[data-split]').forEach(function (el) { if (el !== heroSplit) IB.splitReveal(el); });

    /* Fade-ups */
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, overwrite: 'auto' }); }
    });

    /* Photos: clip reveal with an inner settle, then a gentle drift */
    $$('[data-photo]').forEach(function (fig) {
      var img = $('img', fig);
      gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 84%', once: true } })
        .to(fig, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.5, ease: 'expo.out' })
        .to(img, { scale: 1.08, duration: 1.9, ease: 'expo.out' }, 0);
      gsap.fromTo(img, { yPercent: -3 }, { yPercent: 3, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* Dark bands settle into place */
    $$('[data-settle]').forEach(function (el) {
      gsap.fromTo(el, { scale: 0.94, borderRadius: 56 }, { scale: 1, borderRadius: 32, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 25%', scrub: 0.8 } });
    });

    /* Counters */
    $$('[data-count]').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count'));
      if (!to) return;
      var dec = +(el.getAttribute('data-decimals') || 0), comma = el.getAttribute('data-format') === 'comma';
      var o = { v: 0 };
      function out(v) { var s = v.toFixed(dec); if (comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return s; }
      el.textContent = out(0);
      gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top bottom', once: true },
        onUpdate: function () { el.textContent = out(o.v); } });
    });

    /* Closing signal bars */
    if ($('.close__sig')) gsap.from('.close__sig i', { scaleY: 0, transformOrigin: '50% 100%', duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.close__sig', start: 'top 85%', once: true } });


    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  // Wait for every page script to register (DOMContentLoaded) and for fonts (so lines split correctly)
  function start() { if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
