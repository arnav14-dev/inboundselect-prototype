/* ==========================================================================
   Inbound Select — Pricing page
   The estimator: agents, connected calls and the brand switch feed an
   itemised receipt whose amounts tick to their new values.
   ========================================================================== */
IB.ready(function () {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  /* Prices (DESIGN.md) */
  var PLATFORM = 499, BRAND = 699, INCLUDED = 10, TIER_TOP = 50, PER_AGENT = 15, PER_CALL = 2.5;

  var inA = $('#estAgents'), inC = $('#estCalls'), inB = $('#estBrand');
  if (!inA || !inC || !inB) return;
  var outA = $('#agentsOut'), outC = $('#callsOut');
  var marks = $$('#agentsScale .is-mark');
  var el = {
    rcpt: $('#rcpt'), plan: $('#rPlan'),
    platform: $('#rPlatform'), platformD: $('#rPlatformD'),
    tierRow: $('#riTier'), tier: $('#rTier'), tierD: $('#rTierD'),
    beyondRow: $('#riBeyond'), beyond: $('#rBeyond'), beyondD: $('#rBeyondD'),
    callsRow: $('#riCalls'), calls: $('#rCalls'), callsD: $('#rCallsD'),
    total: $('#rTotal')
  };

  function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  // Every real amount is a whole number of dollars ($2.50 × a multiple of 50)
  function money(n) { return '$' + comma(n) + '.00'; }

  // Track fill follows the thumb centre exactly (thumb is 22px wide)
  function fill(input) {
    var p = (input.value - input.min) / (input.max - input.min);
    input.style.setProperty('--fill', 'calc(11px + (100% - 22px) * ' + p.toFixed(4) + ')');
  }

  function compute() {
    var a = +inA.value, c = +inC.value, brand = inB.checked;
    var tierN = Math.max(0, Math.min(a, TIER_TOP) - INCLUDED);
    var beyondN = Math.max(0, a - TIER_TOP);
    var r = { a: a, c: c, brand: brand, tierN: tierN, beyondN: beyondN,
      platform: brand ? BRAND : PLATFORM, tier: tierN * PER_AGENT, calls: c * PER_CALL };
    r.total = r.platform + r.tier + r.calls;
    return r;
  }

  var shown = { platform: 0, tier: 0, calls: 0, total: 0 };
  var tween = null, lastBrand = null, printed = !MOTION;

  function paint() {
    el.platform.textContent = money(shown.platform);
    el.tier.textContent = money(shown.tier);
    el.calls.textContent = money(shown.calls);
    el.total.textContent = comma(shown.total);
  }

  function describe(r) {
    outA.textContent = r.a;
    outC.textContent = comma(r.c);
    fill(inA); fill(inC);
    marks[0].classList.toggle('is-on', r.a >= INCLUDED);
    marks[1].classList.toggle('is-on', r.a >= TIER_TOP);

    el.platformD.textContent = (r.brand ? 'Your own brand' : 'Agency') + ' · 10 agents included';
    el.tierD.textContent = r.tierN ? r.tierN + ' × $15' + (r.a > TIER_TOP ? ' · capped' : '') : 'None · your first 10 are included';
    el.beyondD.textContent = r.beyondN ? r.beyondN + (r.beyondN === 1 ? ' agent' : ' agents') + ' · no charge' : 'None';
    el.callsD.textContent = comma(r.c) + ' × $2.50';
    el.beyond.textContent = '$0.00';

    el.tierRow.classList.toggle('is-zero', !r.tierN);
    el.beyondRow.classList.toggle('is-zero', !r.beyondN);
    el.callsRow.classList.toggle('is-zero', !r.c);
    el.rcpt.classList.toggle('is-brand', r.brand);

    if (lastBrand !== null && lastBrand !== r.brand) {
      el.plan.textContent = r.brand ? 'Agency with your own brand' : 'Agency plan';
      if (MOTION) gsap.fromTo(el.plan, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.42, ease: 'expo.out' });
    }
    lastBrand = r.brand;
  }

  function update(animate, dur) {
    var r = compute();
    describe(r);
    if (!printed) return; // the first print happens when the receipt scrolls in
    var target = { platform: r.platform, tier: r.tier, calls: r.calls, total: r.total };
    if (tween) tween.kill();
    if (!animate || !MOTION) {
      for (var k in target) shown[k] = target[k];
      paint();
      return;
    }
    target.duration = dur || 0.7;
    target.ease = 'expo.out';
    target.onUpdate = paint;
    tween = gsap.to(shown, target);
  }

  inA.addEventListener('input', function () { update(true); });
  inC.addEventListener('input', function () { update(true); });
  inB.addEventListener('change', function () { update(true); });

  update(false);

  if (!MOTION) return;

  /* The receipt prints once: lines settle in, then the amounts count up */
  paint();
  var lines = $$('.ri, .rcpt__tear, .rcpt__total', el.rcpt);
  gsap.set(lines, { opacity: 0, y: 8 });
  ScrollTrigger.create({
    trigger: el.rcpt, start: 'top 78%', once: true,
    onEnter: function () {
      gsap.to(lines, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', delay: 0.15 });
      gsap.delayedCall(0.35, function () { printed = true; update(true, 1.6); });
    }
  });

  /* Plan-length bars grow when the example table arrives */
  gsap.from('.ap__bar i', { scaleX: 0, duration: 1.4, stagger: 0.12, ease: 'expo.out',
    scrollTrigger: { trigger: '.ap', start: 'top 80%', once: true } });
});
