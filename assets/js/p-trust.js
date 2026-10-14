/* ==========================================================================
   Trust — the statement settles in with the site's standard motion: its rows
   fade up in order (0.08 apart, expo.out) as the panel reaches 85% of the
   viewport, and the total ticks over as the footer comes into view.
   The finished statement is in the HTML, so without JS or with reduced motion
   it is simply there, and nothing is hidden or zeroed until its trigger fires.
   ========================================================================== */
IB.ready(function () {
  'use strict';
  var $ = IB.$, $$ = IB.$$;
  var ledger = $('#ledger');
  if (!ledger || !IB.MOTION) return;

  var stage = ledger.closest('.ledger-stage') || ledger;
  var rows = $$('.lg__row', ledger);

  // Triggered by the panel's top, so the rows are still below the fold while they wait
  gsap.fromTo(rows, { opacity: 0, y: 18 }, {
    opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity',
    scrollTrigger: { trigger: stage, start: 'top 85%', once: true }
  });

  var tot = $('[data-total]', ledger);
  if (!tot) return;
  var to = parseFloat(tot.getAttribute('data-total'));
  function money(v) { return '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  ScrollTrigger.create({ trigger: tot, start: 'top 85%', once: true, onEnter: function () {
    var o = { v: 0 };
    tot.textContent = money(0);
    gsap.to(o, { v: to, duration: 1.2, delay: 0.25, ease: 'expo.out',
      onUpdate: function () { tot.textContent = money(o.v); },
      onComplete: function () { tot.textContent = money(to); } });
  } });
});
