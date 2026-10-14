/* ==========================================================================
   Inbound Select — Book a demo
   Slot picker (next 10 weekdays, times in ET), chips, gentle validation and
   the booked state. Nothing leaves the browser: this is a prototype.
   ========================================================================== */
IB.ready(function () {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  var form = $('#bkForm'), done = $('#bkDone'), bk = $('#bk');
  if (!form) return;

  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MOL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------------------------------------------------------------------
     Slots: the next 10 weekdays from today, 9:30 am – 4:30 pm ET
     --------------------------------------------------------------------- */
  // "Today" is taken in Eastern Time, since every slot is in ET
  function todayET() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = +p.value; });
      if (o.year && o.month && o.day) return new Date(o.year, o.month - 1, o.day);
    } catch (e) {}
    var t = new Date(); t.setHours(0, 0, 0, 0); return t;
  }
  var today = todayET();
  var days = [], d = new Date(today);
  while (days.length < 10) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  var TIMES = [];
  for (var m = 9 * 60 + 30; m <= 16 * 60 + 30; m += 30) TIMES.push(m);

  function timeLabel(min) {
    var h = Math.floor(min / 60), mm = min % 60, ap = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 || 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  }
  // Deterministic "already booked" slots per day, so the grid feels real
  function taken(day, i) {
    var s = day.getFullYear() * 372 + day.getMonth() * 31 + day.getDate();
    var r = (s * 9301 + (i + 3) * 49297) % 233280 / 233280;
    return r < 0.3;
  }

  var DEFAULT_DAY = 1, DEFAULT_TIME = 14 * 60 + 30;  // e.g. Thu 15 Oct · 2:30 pm, when today is Tue 13 Oct
  var sel = { day: DEFAULT_DAY, time: DEFAULT_TIME };
  var daysEl = $('#days'), timesEl = $('#times');

  daysEl.innerHTML = days.map(function (day, i) {
    return '<button type="button" class="day" data-i="' + i + '" aria-pressed="false" aria-label="' + WDL[day.getDay()] + ' ' + day.getDate() + ' ' + MOL[day.getMonth()] + '">' +
      '<span class="day__w">' + WD[day.getDay()] + '</span><span class="day__d">' + day.getDate() + '</span></button>';
  }).join('');
  var first = days[0], last = days[days.length - 1];
  $('#slotMonth').textContent = first.getMonth() === last.getMonth()
    ? MOL[first.getMonth()] + ' ' + first.getFullYear()
    : MOL[first.getMonth()] + ' – ' + MOL[last.getMonth()] + ' ' + last.getFullYear();

  function renderTimes(animate) {
    var day = days[sel.day];
    timesEl.innerHTML = TIMES.map(function (t, i) {
      var off = taken(day, i) && !(sel.day === DEFAULT_DAY && t === DEFAULT_TIME);
      return '<button type="button" class="tm" data-t="' + t + '" aria-pressed="' + (t === sel.time && !off) + '"' + (off ? ' disabled aria-label="' + timeLabel(t) + ', taken"' : '') + '>' + timeLabel(t) + '</button>';
    }).join('');
    // keep the chosen time only if it is free on the new day
    var still = $('.tm[data-t="' + sel.time + '"]', timesEl);
    if (!still || still.disabled) sel.time = null;
    $('#dayLabel').textContent = WDL[day.getDay()] + ' ' + day.getDate() + ' ' + MOL[day.getMonth()];
    if (animate && MOTION) gsap.fromTo($$('.tm', timesEl), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.015, ease: 'expo.out' });
  }

  function summary() {
    var day = days[sel.day];
    return WD[day.getDay()] + ' ' + day.getDate() + ' ' + MO[day.getMonth()];
  }
  function renderSum(animate) {
    var s = $('#slotSum');
    var txt = sel.time == null ? 'Pick a time for ' + summary() : summary() + ' · ' + timeLabel(sel.time) + ' ET · 30 min';
    if (s.textContent === txt) return;
    s.textContent = txt;
    s.classList.toggle('is-empty', sel.time == null);
    if (animate && MOTION) gsap.fromTo(s, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.42, ease: 'expo.out' });
  }

  function selectDay(i, animate) {
    sel.day = i;
    $$('.day', daysEl).forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
    renderTimes(animate);
    renderSum(animate);
  }
  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (!b) return;
    var i = +b.getAttribute('data-i');
    if (i !== sel.day) selectDay(i, true);
  });
  timesEl.addEventListener('click', function (e) {
    var b = e.target.closest('.tm'); if (!b || b.disabled) return;
    sel.time = +b.getAttribute('data-t');
    $$('.tm', timesEl).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    renderSum(true);
    if (tried) check('slot');
  });
  selectDay(DEFAULT_DAY, false);

  /* ---------------------------------------------------------------------
     Chips
     --------------------------------------------------------------------- */
  $$('.chips', form).forEach(function (g) {
    var single = g.hasAttribute('data-single');
    g.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      var on = c.getAttribute('aria-pressed') !== 'true';
      if (single) $$('.chip', g).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      c.setAttribute('aria-pressed', String(single ? true : on));
      var f = g.closest('[data-f]').getAttribute('data-f');
      if (tried || bad[f]) check(f);
    });
  });
  function chipVals(id) { return $$('#' + id + ' .chip[aria-pressed="true"]').map(function (c) { return c.getAttribute('data-v'); }); }

  /* ---------------------------------------------------------------------
     States: codes or names, previewed as state chips
     --------------------------------------------------------------------- */
  var STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
  var BY_NAME = {};
  Object.keys(STATES).forEach(function (k) { BY_NAME[STATES[k].toLowerCase()] = k; });

  function parseStates(v) {
    var out = [];
    function add(c) { if (out.indexOf(c) < 0) out.push(c); }
    v.split(/[,;\/\n]+|\s+and\s+|\s*&\s*/i).forEach(function (part) {
      part = part.trim().replace(/\.$/, '');
      if (!part) return;
      if (BY_NAME[part.toLowerCase()]) { add(BY_NAME[part.toLowerCase()]); return; }
      part.split(/\s+/).forEach(function (tok) {
        var t = tok.toUpperCase().replace(/[^A-Z]/g, '');
        if (t.length === 2 && STATES[t]) add(t);
        else if (BY_NAME[tok.toLowerCase()]) add(BY_NAME[tok.toLowerCase()]);
      });
    });
    return out;
  }

  var stIn = $('#fStates'), stPrev = $('#statesPrev'), stHint = $('#statesHint'), lastStates = '';
  function renderStates() {
    var codes = parseStates(stIn.value), key = codes.join(',');
    if (key === lastStates) return;
    var before = lastStates ? lastStates.split(',') : [];
    lastStates = key;
    stPrev.innerHTML = codes.map(function (c) {
      return '<span class="st"' + (before.indexOf(c) > -1 ? ' style="animation:none"' : '') + '>' + c + '</span>';
    }).join('');
    stHint.textContent = codes.length ? codes.length + (codes.length === 1 ? ' state' : ' states') : 'Two-letter codes or full names, separated by commas.';
  }
  stIn.addEventListener('input', renderStates);

  /* ---------------------------------------------------------------------
     Validation: quiet until you try to book, then helpful as you fix things
     --------------------------------------------------------------------- */
  var tried = false, bad = {};
  var RULES = {
    name: function () { return $('#fName').value.trim().length >= 2 ? '' : 'Add your name so we know who we’re meeting.'; },
    agency: function () { return $('#fAgency').value.trim().length >= 2 ? '' : 'Add your agency’s name.'; },
    email: function () {
      var v = $('#fEmail').value.trim();
      if (!v) return 'Add a work email for the invite.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'That email looks incomplete.';
    },
    phone: function () {
      var n = $('#fPhone').value.replace(/\D/g, '').length;
      if (!n) return 'Add a number we can reach you on.';
      return n >= 10 ? '' : 'That number looks a little short.';
    },
    agents: function () { return chipVals('cAgents').length ? '' : 'Pick the range closest to your team.'; },
    products: function () { return chipVals('cProducts').length ? '' : 'Pick at least one product.'; },
    states: function () { return parseStates(stIn.value).length ? '' : 'Add at least one state, like FL or Georgia.'; },
    slot: function () { return sel.time != null ? '' : 'Pick a time that suits you.'; }
  };
  var MSG = { name: 'mName', agency: 'mAgency', email: 'mEmail', phone: 'mPhone', agents: 'mAgents', products: 'mProducts', states: 'mStates', slot: 'mSlot' };

  function holder(f) { return f === 'slot' ? $('.slot__foot') : $('[data-f="' + f + '"]', form); }
  function check(f) {
    var msg = RULES[f](), h = holder(f), box = $('#' + MSG[f] + ' span');
    if (msg) box.textContent = msg;
    h.classList.toggle('is-bad', !!msg);
    var input = $('.input', h);
    if (input) input.setAttribute('aria-invalid', String(!!msg));
    bad[f] = !!msg;
    return !msg;
  }

  [['fName', 'name'], ['fAgency', 'agency'], ['fEmail', 'email'], ['fPhone', 'phone'], ['fStates', 'states']].forEach(function (p) {
    var el = $('#' + p[0]);
    // after the first attempt (or once a field has shown a message), fix-as-you-type
    el.addEventListener('input', function () { if (tried || bad[p[1]]) check(p[1]); });
    // before that, only speak up on blur when something was typed and looks wrong
    el.addEventListener('blur', function () { if (tried || el.value.trim()) check(p[1]); });
  });

  // Tidy a ten-digit US number on blur
  $('#fPhone').addEventListener('blur', function () {
    var dg = this.value.replace(/\D/g, '');
    if (dg.length === 11 && dg.charAt(0) === '1') dg = dg.slice(1);
    if (dg.length === 10) this.value = '(' + dg.slice(0, 3) + ') ' + dg.slice(3, 6) + '-' + dg.slice(6);
  });

  /* ---------------------------------------------------------------------
     Submit → booked
     --------------------------------------------------------------------- */
  var btn = $('#bkSubmit');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    tried = true;
    var order = ['name', 'agency', 'email', 'phone', 'agents', 'products', 'states', 'slot'];
    var firstBad = null;
    order.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f; });
    if (firstBad) {
      var h = holder(firstBad);
      var target = firstBad === 'slot' ? $('#times') : ($('.input', h) || $('.chip', h));
      var r = h.getBoundingClientRect();
      if (r.top < 90 || r.bottom > window.innerHeight - 40) IB.scrollTo(h, -140);
      if (target && target.focus) setTimeout(function () { target.focus({ preventScroll: true }); }, MOTION ? 500 : 0);
      return;
    }
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    setTimeout(showDone, MOTION ? 900 : 0);
  });

  function fillDone() {
    var day = days[sel.day];
    $('#doneWhen').innerHTML = summary() + ', <span class="nw">' + timeLabel(sel.time) + ' ET.</span>';
    $('#dAgency').textContent = $('#fAgency').value.trim();
    $('#dAgents').textContent = chipVals('cAgents')[0];
    $('#dProducts').textContent = chipVals('cProducts').join(', ');
    $('#dStates').textContent = parseStates(stIn.value).join(' ');

    // A real calendar file, built in the browser
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var ymd = day.getFullYear() + pad(day.getMonth() + 1) + pad(day.getDate());
    var start = ymd + 'T' + pad(Math.floor(sel.time / 60)) + pad(sel.time % 60) + '00';
    var endM = sel.time + 30;
    var end = ymd + 'T' + pad(Math.floor(endM / 60)) + pad(endM % 60) + '00';
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Inbound Select//Demo booking//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:demo-' + Date.now() + '@inboundselect.com',
      'DTSTAMP:' + now,
      'DTSTART;TZID=America/New_York:' + start,
      'DTEND;TZID=America/New_York:' + end,
      'SUMMARY:Inbound Select demo',
      'DESCRIPTION:Thirty minutes with the Inbound Select team. Bring your products\\, your states and your prices.',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var cal = $('#doneCal');
    if (cal.dataset.url) URL.revokeObjectURL(cal.dataset.url);
    cal.dataset.url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    cal.href = cal.dataset.url;
  }

  function drawCheck() {
    var c = $('.done__check circle'), p = $('.done__check path');
    var L = c.getTotalLength ? c.getTotalLength() : 214, P = p.getTotalLength ? p.getTotalLength() : 40;
    if (!MOTION) { gsap.set([c, p], { strokeDasharray: 'none', strokeDashoffset: 0 }); return; }
    gsap.set(c, { strokeDasharray: L + 1, strokeDashoffset: L + 1 });
    gsap.set(p, { strokeDasharray: P + 1, strokeDashoffset: P + 1 });
    gsap.timeline({ delay: 0.25 })
      .to(c, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' })
      .to(p, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, '-=0.25');
  }

  function swap(from, to, after) {
    var h1 = bk.offsetHeight;
    if (!MOTION) {
      from.hidden = true; to.hidden = false;
      if (after) after();
      return;
    }
    gsap.to(from, { opacity: 0, y: -10, duration: 0.42, ease: 'power2.in', onComplete: function () {
      from.hidden = true; gsap.set(from, { clearProps: 'opacity,transform' });
      to.hidden = false;
      var h2 = bk.offsetHeight;
      gsap.fromTo(bk, { height: h1, overflow: 'hidden' }, { height: h2, duration: 0.8, ease: 'expo.out',
        onComplete: function () { gsap.set(bk, { clearProps: 'height,overflow' }); ScrollTrigger.refresh(); } });
      gsap.fromTo(to, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.08, ease: 'expo.out' });
      if (after) after();
    } });
  }

  function showDone() {
    fillDone();
    swap(form, done, function () {
      btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
      drawCheck();
      done.focus({ preventScroll: true });
      if (bk.getBoundingClientRect().top < 60 || bk.getBoundingClientRect().top > window.innerHeight * 0.5) IB.scrollTo(bk, -110);
    });
  }

  $('#doneEdit').addEventListener('click', function () {
    swap(done, form, function () {
      var b = $('.tm[aria-pressed="true"]', timesEl) || $('.day[aria-pressed="true"]', daysEl);
      IB.scrollTo($('.slot'), -110);
      if (b) setTimeout(function () { b.focus({ preventScroll: true }); }, MOTION ? 600 : 0);
    });
  });
});
