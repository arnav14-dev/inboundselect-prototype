/* ==========================================================================
   Callback Requests — the board, which is the hero media (filters with a FLIP
   reorder, voicemails that read themselves aloud with a read-along transcript,
   take), and the 75/25 split.
   ========================================================================== */
IB.ready(function (ctx) {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  var list = $('#lstList');
  if (list) board();
  split();

  function board() {
    var rows = $$('.lst', list);
    var countEl = $('#boardCount'), emptyEl = $('#boardEmpty');

    /* ---------------------------------------------------------------
       Voicemails: one plays at a time (IB.voicemail handles that).
       The transcript opens while it plays; words light as they're read.
       --------------------------------------------------------------- */
    rows.forEach(function (row, i) {
      var q = $('.lst__q', row);
      var text = q.textContent.replace(/\s+/g, ' ').trim();
      var starts = [], pos = 0;
      q.innerHTML = text.split(' ').map(function (w) {
        starts.push(pos); pos += w.length + 1;
        return '<span class="w">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
      }).join(' ');
      var words = $$('.w', q);

      row._vm = IB.voicemail(row, { text: text, seconds: +row.getAttribute('data-len') || 30, bars: 30, seed: 17 + i * 13 });

      var bars = $$('.wave i', row), tEl = $('.vm-time', row);
      new MutationObserver(function () {
        var on = 0;
        for (var j = 0; j < bars.length; j++) if (bars[j].classList.contains('on')) on++;
        var at = on / bars.length * text.length;
        for (var k = 0; k < words.length; k++) words[k].classList.toggle('on', starts[k] < at);
      }).observe(tEl, { childList: true, characterData: true, subtree: true });

      var take = $('.lst__take', row);
      take.addEventListener('click', function () {
        var on = row.classList.toggle('is-taken');
        take.setAttribute('aria-pressed', String(on));
        if (on && MOTION) gsap.fromTo(take, { scale: 0.95 }, { scale: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform' });
      });
    });

    /* ---------------------------------------------------------------
       Filters: age (single choice) and product (toggle, none = all)
       --------------------------------------------------------------- */
    var filt = { age: 'all', prod: null };
    var ageChips = $$('[data-f-age]'), prodChips = $$('[data-f-prod]');

    ageChips.forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-f-age');
        if (v === filt.age) return;
        filt.age = v;
        ageChips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        apply(true);
      });
    });
    prodChips.forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-f-prod');
        filt.prod = filt.prod === v ? null : v;
        prodChips.forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-f-prod') === filt.prod)); });
        apply(true);
      });
    });

    function matches(r) {
      return (filt.age === 'all' || r.getAttribute('data-age') === filt.age) &&
             (!filt.prod || r.getAttribute('data-product') === filt.prod);
    }
    function isShown(r) { return !r.classList.contains('is-gone') && !r.classList.contains('is-leaving'); }
    function setCount(n) {
      countEl.textContent = n + (n === 1 ? ' listing' : ' listings');
      emptyEl.hidden = n > 0;
    }
    function settleLeaving() {
      $$('.lst.is-leaving', list).forEach(function (r) {
        r.classList.remove('is-leaving'); r.classList.add('is-gone'); r.style.top = '';
        gsap.set(r, { clearProps: 'opacity,transform' });
      });
    }

    function apply(animate) {
      var next = rows.filter(matches);
      rows.forEach(function (r) { if (next.indexOf(r) < 0 && r.classList.contains('is-playing')) r._vm.stop(); });
      setCount(next.length);

      if (!MOTION || !animate) {
        rows.forEach(function (r) { r.classList.toggle('is-gone', next.indexOf(r) < 0); });
        return;
      }

      // First: where every visible row sits right now (mid-flight transforms included)
      var lr = list.getBoundingClientRect();
      var shown = rows.filter(isShown);
      var first = shown.map(function (r) { return r.getBoundingClientRect().top; });
      gsap.killTweensOf(rows); gsap.killTweensOf(list);
      settleLeaving();

      var leaving = shown.filter(function (r) { return next.indexOf(r) < 0; });
      var staying = shown.filter(function (r) { return next.indexOf(r) > -1; });
      var entering = next.filter(function (r) { return shown.indexOf(r) < 0; });

      // Leaving rows lift out of the flow but stay exactly where they were
      leaving.forEach(function (r) {
        r.classList.add('is-leaving');
        r.style.top = (first[shown.indexOf(r)] - lr.top) + 'px';
        gsap.set(r, { y: 0 });
      });
      entering.forEach(function (r) { r.classList.remove('is-gone'); });
      if (staying.length) gsap.set(staying, { clearProps: 'transform,opacity' });
      list.style.height = '';
      var h1 = list.offsetHeight;

      // Last, invert, play
      staying.forEach(function (r) {
        var dy = first[shown.indexOf(r)] - r.getBoundingClientRect().top;
        if (Math.abs(dy) > 0.5) gsap.fromTo(r, { y: dy }, { y: 0, duration: 0.9, ease: 'expo.out', clearProps: 'transform' });
      });
      if (leaving.length) gsap.to(leaving, { opacity: 0, y: -8, duration: 0.3, ease: 'power2.out', onComplete: settleLeaving });
      if (entering.length) gsap.fromTo(entering, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.14, clearProps: 'transform,opacity' });
      gsap.fromTo(list, { height: lr.height }, { height: h1, duration: 0.9, ease: 'expo.out', onComplete: function () { list.style.height = ''; } });
    }

    setCount(rows.length);

    /* Rows settle in, one after another, as the board arrives: with the hero
       when the board is on screen at load, otherwise when it scrolls in */
    if (MOTION) {
      var settle = { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out', clearProps: 'transform,opacity' };
      if (list.getBoundingClientRect().top < window.innerHeight) {
        ctx.hero.fromTo(rows, { opacity: 0, y: 16 }, settle, 0.7);
      } else {
        settle.scrollTrigger = { trigger: list, start: 'top 86%', once: true };
        gsap.fromTo(rows, { opacity: 0, y: 16 }, settle);
      }
    }
  }

  /* ---------------------------------------------------------------
     The split: the bar fills and the shares count up, once.
     The finished 75 / 25 is in the HTML, and nothing is zeroed until the
     moment the figure enters, so it never rests on 0.
     --------------------------------------------------------------- */
  function split() {
    var cut = $('#cut');
    if (!cut || !MOTION) return;
    var segs = $$('.cut__bar i', cut), nums = $$('[data-to]', cut);
    ScrollTrigger.create({ trigger: cut, start: 'top 95%', once: true, onEnter: function () {
      var tl = gsap.timeline();
      tl.fromTo(segs[0], { scaleX: 0 }, { scaleX: 1, duration: 1.7, ease: 'expo.out' }, 0)
        .fromTo(segs[1], { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: 'expo.out' }, 0.35);
      nums.forEach(function (n) {
        var o = { v: 0 }, to = +n.getAttribute('data-to');
        n.textContent = '0';
        tl.to(o, { v: to, duration: 1.4, ease: 'expo.out', onUpdate: function () { n.textContent = Math.round(o.v); } }, 0);
      });
    } });
  }
});
