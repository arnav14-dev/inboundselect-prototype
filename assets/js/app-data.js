/* ==========================================================================
   Inbound Select — agency console: sample data + a small call simulation.
   Everything here is SAMPLE DATA. Seeded, so every load tells the same story.
   Exposes window.IBData (read by app.js). Classic script, no modules.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Seeded randomness ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var R = mulberry32(20261013);
  function rnd() { return R(); }
  function rf(a, b) { return a + (b - a) * rnd(); }
  function ri(a, b) { return Math.floor(rf(a, b + 1)); }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function wpick(o) { var tot = 0, k; for (k in o) tot += o[k]; var r = rnd() * tot; for (k in o) { r -= o[k]; if (r <= 0) return k; } return k; }
  function round1(n) { return Math.round(n * 10) / 10; }

  /* ---------- Clock: the sample day is today; the console opens at 2:47 pm ---------- */
  var DAY = new Date(); DAY.setHours(0, 0, 0, 0);
  var T0 = DAY.getTime();
  function at(h, m, s) { var d = new Date(T0); d.setHours(h, m, s || 0, 0); return d.getTime(); }
  var START = at(14, 47, 12);
  var clock = START;
  var HOUR = 3600e3, DAYMS = 86400e3;

  /* ---------- Agency ---------- */
  var AGENCY = {
    name: 'Lakeshore Senior Benefits',
    mono: 'LS',
    owner: 'Rachel Moreno',
    ownerFirst: 'Rachel',
    ownerInitials: 'RM',
    ownerRole: 'Owner',
    card: 'Visa •• 4242',
    // Sample lines, always shown masked
    numbers: [
      { number: '(813) •••-••90', label: 'Main line', source: 'Twilio · own account', product: 'Final expense' },
      { number: '(904) •••-••75', label: 'Meta Ads · Final expense', source: 'Twilio · own account', product: 'Final expense' },
      { number: '(407) •••-••14', label: 'Medicare line', source: 'Twilio · managed', product: 'Medicare' }
    ]
  };

  var FE = 'Final expense', MC = 'Medicare';
  var PRODUCTS = [FE, MC];
  var PLANS = {};
  PLANS[FE] = [{ s: 30, p: 20, on: true }, { s: 60, p: 35, on: true }, { s: 90, p: 45, on: true }];
  PLANS[MC] = [{ s: 30, p: 18, on: true }, { s: 60, p: 30, on: true }, { s: 90, p: 40, on: false }];
  function planFor(product, secs) {
    var list = PLANS[product];
    for (var i = 0; i < list.length; i++) if (list[i].s === secs) return { s: list[i].s, p: list[i].p };
    return { s: list[0].s, p: list[0].p };
  }
  function minPlan(product) { return PLANS[product].reduce(function (m, p) { return Math.min(m, p.p); }, 999); }

  var OUTCOMES = ['Sale', 'Appointment', 'Not interested', 'Dead air', 'Communication barrier', 'Wrong state', 'Client hung up', 'Follow up'];

  /* ---------- Geography (states the agency is licensed for) ---------- */
  var GEO = {
    FL: { name: 'Florida', cities: [['Tampa', 813], ['Orlando', 407], ['Jacksonville', 904], ['Ocala', 352], ['Sarasota', 941], ['Lakeland', 863]] },
    TX: { name: 'Texas', cities: [['Houston', 713], ['San Antonio', 210], ['El Paso', 915], ['Tyler', 903], ['Lubbock', 806]] },
    GA: { name: 'Georgia', cities: [['Macon', 478], ['Savannah', 912], ['Augusta', 706], ['Atlanta', 404]] },
    NC: { name: 'North Carolina', cities: [['Charlotte', 704], ['Greensboro', 336], ['Fayetteville', 910], ['Raleigh', 919]] },
    OH: { name: 'Ohio', cities: [['Dayton', 937], ['Toledo', 419], ['Akron', 330], ['Columbus', 614]] },
    PA: { name: 'Pennsylvania', cities: [['Allentown', 610], ['Erie', 814], ['Scranton', 570], ['Pittsburgh', 412]] },
    AZ: { name: 'Arizona', cities: [['Mesa', 480], ['Tucson', 520], ['Phoenix', 602], ['Yuma', 928]] },
    MI: { name: 'Michigan', cities: [['Flint', 810], ['Lansing', 517], ['Grand Rapids', 616], ['Detroit', 313]] },
    TN: { name: 'Tennessee', cities: [['Knoxville', 865], ['Memphis', 901], ['Chattanooga', 423]] },
    SC: { name: 'South Carolina', cities: [['Columbia', 803], ['Greenville', 864], ['Charleston', 843]] }
  };
  var STATES = ['FL', 'TX', 'GA', 'NC', 'OH', 'PA', 'AZ', 'MI', 'TN', 'SC'];
  var STATE_W = { FL: 9, TX: 7, GA: 5, NC: 4, OH: 3, PA: 3, AZ: 3, MI: 2, TN: 2, SC: 2 };

  function phone(area) {
    var ex;
    do { ex = ri(202, 989); } while (ex === 555 || ex % 100 === 11);
    var line = String(ri(1000, 9899));
    return '(' + area + ') ' + ex + '-' + line;
  }
  // Caller numbers are never shown in full, even in sample data:
  // hidden (813) •••-••47 until billed, then unlocked (813) 402-••47
  function maskNum(num) { return num.slice(0, 6) + '•••-••' + num.slice(-2); }
  function unlockNum(num) { return num.slice(0, 10) + '••' + num.slice(-2); }

  /* ---------- Agents (licensed agents at the agency) ---------- */
  function A(id, name, states, products, wallet, status, plan, rate, joined) {
    var parts = name.split(' ');
    return {
      id: id, name: name, first: parts[0],
      initials: parts[0][0] + parts[parts.length - 1].replace(/^O'/, 'O')[0],
      email: parts[0].toLowerCase() + '@lakeshoresb.com',
      states: states, products: products, wallet: wallet, status: status,
      plan: plan, acceptRate: rate, joined: joined,
      approved: true, subscribed: true, currentCall: null
    };
  }
  var AGENTS = [
    A('dana', 'Dana Whitfield', ['FL', 'GA', 'TX', 'NC'], [FE, MC], 412.50, 'available', 60, 0.94, 'Mar 2025'),
    A('marcus', 'Marcus Reed', ['FL', 'GA', 'SC', 'TN'], [FE], 286.00, 'available', 60, 0.88, 'Jan 2025'),
    A('priya', 'Priya Raman', ['TX', 'AZ', 'OH', 'MI'], [MC, FE], 534.25, 'oncall', 90, 0.91, 'Nov 2024'),
    A('luis', 'Luis Ortega', ['TX', 'AZ', 'FL'], [FE, MC], 198.50, 'available', 60, 0.86, 'Jun 2025'),
    A('keisha', 'Keisha Brown', ['FL', 'GA', 'NC', 'SC', 'TN'], [FE], 41.50, 'available', 30, 0.79, 'Aug 2025'),
    A('tom', 'Tom Kowalski', ['OH', 'PA', 'MI'], [MC], 322.00, 'available', 60, 0.83, 'Feb 2025'),
    A('hannah', 'Hannah Lindqvist', ['MI', 'OH', 'PA', 'NC'], [MC, FE], 157.75, 'offline', 60, 0.81, 'Apr 2025'),
    A('andre', 'Andre Baptiste', ['FL', 'GA', 'SC'], [FE], 268.00, 'oncall', 60, 0.89, 'Sep 2024'),
    A('mei', 'Mei Chen', ['AZ', 'TX', 'TN'], [MC], 389.50, 'available', 90, 0.92, 'May 2025'),
    A('samuel', 'Samuel Okafor', ['NC', 'SC', 'GA', 'PA', 'OH'], [FE, MC], 22.00, 'available', 30, 0.74, 'Jul 2025'),
    A('grace', "Grace O'Neill", ['PA', 'OH', 'MI', 'NC'], [MC], 245.00, 'available', 60, 0.85, 'Dec 2024'),
    A('javier', 'Javier Molina', ['FL', 'TX', 'AZ', 'GA'], [FE, MC], 176.25, 'available', 30, 0.9, 'Oct 2024')
  ];
  var AG = {}; AGENTS.forEach(function (a) { AG[a.id] = a; });

  /* ---------- Callers (first name, last initial) ---------- */
  var CALLERS = ['Harold B.', 'Dolores K.', 'Walter P.', 'Betty R.', 'Gloria M.', 'Frank D.', 'Shirley T.', 'Earl W.', 'Loretta S.',
    'Raymond H.', 'Patricia G.', 'Eugene F.', 'Barbara J.', 'Clarence V.', 'Joyce N.', 'Leonard A.', 'Evelyn C.', 'Howard L.',
    'Doris Y.', 'Gerald O.', 'Bernice Q.', 'Arthur Z.', 'Wanda U.', 'Lloyd I.', 'Carolyn F.', 'Roy M.', 'Juanita R.', 'Curtis H.',
    'Mildred P.', 'Vernon S.', 'Rosa G.', 'Calvin T.', 'Edna W.', 'Ruby L.', 'Melvin D.', 'Irene B.', 'Otis K.', 'Hazel J.',
    'Floyd N.', 'Tomás R.', 'Graciela V.', 'Thanh N.', 'Ernestine P.', 'Willie M.', 'Lucille A.', 'Delbert R.', 'Yolanda H.'];

  /* ---------- Notes bank ---------- */
  var NOTES = {
    'Sale': ['Sold $10,000 whole life. First draft on the 3rd.', 'Sold $15,000 guaranteed issue; daughter is the beneficiary.', 'Sold $8,000 level benefit. Wants the paper policy mailed.', 'Enrolled in a Medicare Advantage plan with dental, effective Nov 1.'],
    'Appointment': ['Wants her son on the call. Booked {appt}.', 'Reviewing his current policy letter first. Booked {appt}.', 'Comparing two plans with his wife. Booked {appt}.'],
    'Not interested': ['Already covered through a former employer.', 'Was looking for auto insurance.', 'Happy with current plan; no changes this year.'],
    'Dead air': ['No one on the line after the greeting.', 'Line open, no response for 40 seconds.'],
    'Communication barrier': ['Caller prefers Spanish; passed details to Luis.', 'Very poor line; caller could not hear me.'],
    'Wrong state': ['Lives in Alabama; calling from a Florida number.', 'Moved to Kentucky last year.'],
    'Client hung up': ['Hung up during the health questions.', 'Hung up after hearing the price.'],
    'Follow up': ['Needs to check the bank draft date. Follow up Friday.', 'Wants to talk it over with family first.', 'Asked for a quote by text; call back next week.']
  };
  function noteFor(o, appt) { var n = pick(NOTES[o] || ['']); return n.replace('{appt}', appt || 'Thu 2:30 pm'); }
  var APPTS = ['Thu 2:30 pm', 'Wed 11:00 am', 'Fri 10:30 am', 'Thu 4:00 pm', 'Mon 9:30 am'];

  /* ---------- Calls ---------- */
  var seq = 24000;
  var calls = [];
  var CB = {};          // callId -> callback listing
  var callbacks = [];

  function newCall(o) {
    var c = {
      id: 'IS-' + (++seq), seq: seq,
      ts: o.ts, state: o.state, city: o.city, area: o.area,
      number: o.number || phone(o.area), caller: o.caller || pick(CALLERS), product: o.product,
      line: o.product === MC ? AGENCY.numbers[2] : (rnd() < .55 ? AGENCY.numbers[0] : AGENCY.numbers[1]),
      status: 'ringing', offeredTo: o.offeredTo || 0, agentId: null, tta: null,
      acceptedAt: null, connectedAt: null, endedAt: null, duration: 0,
      plan: null, billed: false, charge: 0, fee: 0,
      outcome: null, appt: null, premium: null, gcal: false, notes: '',
      refund: null, vm: 0, recovered: false, scripted: !!o.scripted, fresh: false, seed: ri(1, 9999)
    };
    c.masked = maskNum(c.number); c.unlocked = unlockNum(c.number);
    return c;
  }

  function licensedFor(state, product) {
    return AGENTS.filter(function (a) { return a.states.indexOf(state) >= 0 && a.products.indexOf(product) >= 0; });
  }

  /* ---- 40 calls so far today, 8:00 am to 2:44 pm ---- */
  (function seedToday() {
    var HOURS = [[8, 3], [9, 5], [10, 7], [11, 7], [12, 5], [13, 7], [14, 6]];
    var times = [];
    HOURS.forEach(function (h) {
      for (var i = 0; i < h[1]; i++) times.push(at(h[0], ri(h[0] === 8 ? 4 : 0, h[0] === 14 ? 43 : 59), ri(0, 59)));
    });
    times.sort(function (a, b) { return a - b; });

    var stateBag = []; Object.keys(STATE_W).forEach(function (s) { for (var i = 0; i < STATE_W[s]; i++) stateBag.push(s); });
    shuffle(stateBag);
    var prodBag = []; for (var i = 0; i < 24; i++) prodBag.push(FE); for (i = 0; i < 16; i++) prodBag.push(MC);
    shuffle(prodBag);
    var MISSED = { 4: 1, 11: 1, 17: 1, 23: 1, 31: 1, 38: 1 };
    var bag = [];
    [['Sale', 6], ['Appointment', 7], ['Not interested', 7], ['Follow up', 5], ['Client hung up', 3], ['Dead air', 2], ['Communication barrier', 2], ['Wrong state', 2]]
      .forEach(function (p) { for (var k = 0; k < p[1]; k++) bag.push(p[0]); });
    shuffle(bag);
    var DUR = { 'Sale': [720, 1680], 'Appointment': [250, 560], 'Not interested': [45, 150], 'Follow up': [130, 380], 'Client hung up': [18, 75], 'Dead air': [32, 62], 'Communication barrier': [50, 110], 'Wrong state': [40, 95] };
    var callerBag = shuffle(CALLERS.slice());
    var refunds = 0;

    times.forEach(function (ts, i) {
      var st = stateBag[i], prod = prodBag[i];
      var lic = licensedFor(st, prod);
      if (!lic.length) { prod = FE; lic = licensedFor(st, prod); }
      var city = pick(GEO[st].cities);
      var c = newCall({ ts: ts, state: st, city: city[0], area: city[1], product: prod, caller: callerBag[i % callerBag.length] });
      c.offeredTo = Math.max(1, lic.length - ri(0, 1));
      if (MISSED[i] || !lic.length) {
        c.status = 'missed';
        c.vm = ri(16, 72);
        c.endedAt = ts + 40000 + c.vm * 1000;
      } else {
        var w = []; lic.forEach(function (a) { w.push(a); if (a.id === 'dana') w.push(a, a); });
        var ag = pick(w);
        var o = bag.pop() || 'Follow up';
        c.status = 'completed';
        c.agentId = ag.id;
        c.tta = round1(1.2 + 7.8 * Math.pow(rnd(), 1.8));
        c.acceptedAt = ts + c.tta * 1000;
        c.connectedAt = c.acceptedAt + 300;
        c.duration = ri(DUR[o][0], DUR[o][1]);
        c.endedAt = c.connectedAt + c.duration * 1000;
        var pr = rnd(); var secs = pr < .3 ? 30 : pr < .82 ? 60 : 90;
        if (ag.plan === 30 && rnd() < .6) secs = 30;
        if ((o === 'Dead air' || o === 'Wrong state') && refunds < 2) secs = 30;
        c.plan = planFor(prod, secs);
        c.outcome = o;
        if (o === 'Appointment') { c.appt = pick(APPTS); c.gcal = true; }
        if (o === 'Sale') c.premium = prod === FE ? round1(ri(3400, 9600) / 100) : pick([0, 0, 24.5, 39]);
        c.notes = noteFor(o, c.appt);
        c.fee = c.duration >= 15 ? 2.5 : 0;
        if (c.duration >= c.plan.s) { c.billed = true; c.charge = c.plan.p; }
        if ((o === 'Dead air' || o === 'Wrong state') && refunds < 2 && c.billed) {
          refunds++;
          c.refund = { status: 'requested', at: c.endedAt + ri(4, 20) * 60e3, reason: o === 'Dead air' ? 'Dead air — no one on the line after the greeting.' : 'Caller lives outside my licensed states.' };
        }
      }
      calls.push(c);
    });
    // Newest first
    calls.reverse();
    // The headline example: Dana took the 2:41 pm Tampa call in 2.8s
    var hero = calls.find(function (c) { return c.status === 'completed' && c.agentId === 'dana' && c.product === FE && c.ts < START - 330e3; });
    if (hero) {
      hero.state = 'FL'; hero.city = 'Tampa'; hero.area = 813; hero.number = '(813) 274-6618'; hero.masked = maskNum(hero.number); hero.unlocked = unlockNum(hero.number);
      hero.tta = 2.8; hero.acceptedAt = hero.ts + 2800; hero.connectedAt = hero.acceptedAt + 300; hero.offeredTo = 6;
      hero.outcome = 'Appointment'; hero.appt = 'Thu 2:30 pm'; hero.gcal = true; hero.duration = 252; hero.endedAt = hero.connectedAt + 252e3;
      hero.plan = planFor(FE, 60); hero.billed = true; hero.charge = 35; hero.fee = 2.5; hero.premium = null; hero.refund = null;
      hero.notes = 'Wants her daughter Linda on the call. Booked Thu 2:30 pm.';
    }
  })();

  /* ---- Callback listings: today's missed calls plus older voicemails ---- */
  var CB_PRICES = {};
  CB_PRICES[FE] = { a: 18, b: 9 };    // 0–7 days, 8–30 days (illustrative)
  CB_PRICES[MC] = { a: 14, b: 7 };
  var cbSeq = 1180;
  function bracketOf(days) { return days <= 7 ? 'a' : 'b'; }
  function addCallback(c, daysAgo, sold) {
    var cb = {
      id: 'CB-' + (++cbSeq), callId: c ? c.id : null,
      ts: c ? c.endedAt : clock - daysAgo * DAYMS,
      state: c.state, city: c.city, product: c.product, masked: c.masked, vm: c.vm, seed: c.seed,
      status: sold ? 'sold' : 'listed', soldTo: sold || null
    };
    callbacks.push(cb); if (c && c.id) CB[c.id] = cb;
    return cb;
  }
  calls.filter(function (c) { return c.status === 'missed'; }).forEach(function (c) { addCallback(c, 0, null); });
  (function olderListings() {
    var spec = [[1, null], [2, 'marcus'], [3, null], [5, 'keisha'], [6, null], [9, null], [12, 'marcus'], [16, null], [21, 'javier'], [27, null]];
    spec.forEach(function (s) {
      var st = wpick(STATE_W), city = pick(GEO[st].cities);
      var prod = rnd() < .6 ? FE : MC;
      var ts = T0 - s[0] * DAYMS + ri(9, 17) * HOUR + ri(0, 59) * 60e3;
      var fake = { id: null, endedAt: ts, state: st, city: city[0], product: prod, masked: maskNum(phone(city[1])), vm: ri(14, 68), seed: ri(1, 9999) };
      addCallback(fake, s[0], s[1] ? AG[s[1]].name : null);
    });
    callbacks.sort(function (a, b) { return b.ts - a.ts; });
  })();
  function cbPrice(cb) { return CB_PRICES[cb.product][bracketOf(cbDays(cb))]; }
  function cbDays(cb) { return Math.max(0, Math.floor((T0 + DAYMS - 1 - cb.ts) / DAYMS)); }

  /* ---------- Billing ---------- */
  var BILL = {
    plan: { name: 'Agency', price: 499, included: 10, perSeat: 15, seatCap: 50 },
    seats: AGENTS.length,
    threshold: 100,
    balance: 0,
    ledger: [],
    invoices: [],
    weekCount: 0
  };
  (function seedBilling() {
    var dow = (new Date(T0).getDay() + 6) % 7;   // 0 = Monday
    var mon = T0 - dow * DAYMS;                  // Monday of this week
    var running = 0;
    BILL.weekCount = 0;
    BILL.ledger.push({ ts: mon + 7 * HOUR, callId: null, desc: 'Collected on Monday · last week’s balance · ' + AGENCY.card, amount: -72.5, kind: 'collect' });
    if (dow > 0) {                               // earlier days this week, summarised
      var n = 26 + dow * 12; running = (n * 2.5) % 100; BILL.weekCount = n;
      var collections = Math.floor(n * 2.5 / 100);
      BILL.ledger.push({ ts: T0 - 5.5 * HOUR, callId: null, desc: 'Connection fees · ' + n + ' connected calls since Monday', amount: n * 2.5, kind: 'fee' });
      for (var k = 0; k < collections; k++) {
        var ts = mon + (k + 1) * (T0 - mon) / (collections + 1) + 15 * HOUR;
        BILL.ledger.push({ ts: ts, callId: null, desc: 'Collected at $100 · ' + AGENCY.card, amount: -100, kind: 'collect' });
        BILL.invoices.push({ id: 'IN-' + (3080 + k), ts: ts, desc: 'Connection fees', amount: 100, status: 'Paid' });
      }
    }
    var today = calls.filter(function (c) { return c.fee > 0; }).sort(function (a, b) { return a.endedAt - b.endedAt; });
    today.forEach(function (c) {
      running += c.fee; BILL.weekCount++;
      BILL.ledger.push({ ts: c.endedAt, callId: c.id, desc: 'Connection fee · ' + c.city + ', ' + c.state, amount: c.fee, kind: 'fee' });
      if (running >= BILL.threshold) {
        BILL.ledger.push({ ts: c.endedAt + 1000, callId: null, desc: 'Collected at $100 · ' + AGENCY.card, amount: -100, kind: 'collect' });
        BILL.invoices.push({ id: 'IN-' + (3100 + BILL.invoices.length), ts: c.endedAt + 1000, desc: 'Connection fees', amount: 100, status: 'Paid' });
        running -= BILL.threshold;
      }
    });
    BILL.balance = running;
    BILL.ledger.sort(function (a, b) { return b.ts - a.ts; });
    var oct1 = new Date(T0); oct1.setDate(1);
    var m1 = new Date(oct1); m1.setMonth(m1.getMonth() - 1);
    var m2 = new Date(oct1); m2.setMonth(m2.getMonth() - 2);
    BILL.invoices.push(
      { id: 'IN-3072', ts: mon + 7 * HOUR, desc: 'Connection fees · Monday collection', amount: 72.5, status: 'Paid' },
      { id: 'IN-3058', ts: oct1.getTime() + 9 * HOUR, desc: 'Agency plan · 12 agents', amount: 529, status: 'Paid' },
      { id: 'IN-2987', ts: m1.getTime() + 9 * HOUR, desc: 'Agency plan · 11 agents', amount: 514, status: 'Paid' },
      { id: 'IN-2911', ts: m2.getTime() + 9 * HOUR, desc: 'Agency plan · 10 agents', amount: 499, status: 'Paid' }
    );
    BILL.invoices.sort(function (a, b) { return b.ts - a.ts; });
  })();
  function addFee(c) {
    BILL.balance += c.fee; BILL.weekCount++;
    BILL.ledger.unshift({ ts: clock, callId: c.id, desc: 'Connection fee · ' + c.city + ', ' + c.state, amount: c.fee, kind: 'fee', fresh: true });
    if (BILL.balance >= BILL.threshold - 0.001) {
      BILL.balance -= BILL.threshold;
      BILL.ledger.unshift({ ts: clock + 1, callId: null, desc: 'Collected at $100 · ' + AGENCY.card, amount: -100, kind: 'collect', fresh: true });
      BILL.invoices.unshift({ id: 'IN-' + (3120 + BILL.invoices.length), ts: clock, desc: 'Connection fees', amount: 100, status: 'Paid', fresh: true });
      emit('billing:collected', { amount: 100 });
    }
    emit('billing:update');
  }

  /* ---------- Events ---------- */
  var listeners = [];
  function on(fn) { listeners.push(fn); }
  function emit(type, data) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](type, data); } catch (e) { if (window.console) console.error(e); }
    }
  }

  /* ---------- Scheduler on a sim clock (pauses while the tab is hidden) ---------- */
  var queue = [];
  function schedule(delay, fn) { var j = { at: clock + delay, fn: fn }; queue.push(j); queue.sort(function (a, b) { return a.at - b.at; }); return j; }
  function cancel(j) { var i = queue.indexOf(j); if (i >= 0) queue.splice(i, 1); }

  var state = { routing: true, focusAgent: null, running: false };
  var last = 0;
  function loop() {
    var n = performance.now();
    var d = Math.min(Math.max(n - last, 0), 1000); last = n;
    if (!document.hidden && state.running) {
      clock += d;
      while (queue.length && queue[0].at <= clock) { var j = queue.shift(); j.fn(); }
    }
    emit('tick');
  }

  /* Live randomness from here on */
  function useLiveRandom() { R = Math.random; }

  function eligible(c, exclude, countOnly) {
    var need = minPlan(c.product) + 10;
    return AGENTS.filter(function (a) {
      return a.status === 'available' && a.approved && a.subscribed && a.id !== exclude && (countOnly || a.id !== state.focusAgent) &&
        a.states.indexOf(c.state) >= 0 && a.products.indexOf(c.product) >= 0 && a.wallet >= need;
    });
  }

  function accept(c, agent, secs) {
    if (c.status !== 'ringing') return;
    if (c.job) { cancel(c.job); c.job = null; }
    c.status = 'connected';
    c.agentId = agent.id;
    c.tta = round1((clock - c.ts) / 1000);
    c.acceptedAt = clock;
    c.connectedAt = clock + 250;
    c.plan = planFor(c.product, secs || agent.plan);
    agent.status = 'oncall'; agent.currentCall = c.id;
    emit('call:update', c); emit('agent:update', agent);
    if (!c.scripted || agent.id !== 'dana') {
      c.job = schedule(rf(20000, 40000), function () { end(c); save(c, autoOutcome(c)); });
    }
  }

  function autoOutcome(c) {
    var o = wpick({ 'Follow up': 30, 'Not interested': 24, 'Appointment': 22, 'Client hung up': 12, 'Communication barrier': 6, 'Dead air': 6 });
    var r = { outcome: o };
    if (o === 'Appointment') { r.appt = pick(APPTS); r.gcal = true; }
    r.notes = noteFor(o, r.appt);
    return r;
  }

  function end(c) {
    if (c.status !== 'connected') return;
    if (c.job) { cancel(c.job); c.job = null; }
    c.endedAt = clock;
    c.duration = Math.max(0, Math.round((clock - c.connectedAt) / 1000));
    c.status = 'wrapup';
    var a = AG[c.agentId];
    if (a) { a.status = a.status === 'oncall' ? 'available' : a.status; a.currentCall = null; emit('agent:update', a); }
    emit('call:update', c);
  }

  function save(c, o) {
    if (c.status !== 'wrapup') return;
    c.outcome = o.outcome; c.appt = o.appt || null; c.premium = o.premium != null ? o.premium : null;
    c.gcal = !!o.gcal; c.notes = o.notes || '';
    c.fee = c.duration >= 15 ? 2.5 : 0;
    var a = AG[c.agentId];
    c.walletBefore = a ? a.wallet : 0;
    if (c.plan && c.duration >= c.plan.s) {
      c.billed = true; c.charge = c.plan.p;
      if (a) { a.wallet = Math.round((a.wallet - c.charge) * 100) / 100; emit('agent:update', a); }
    }
    c.walletAfter = a ? a.wallet : 0;
    c.status = 'completed'; c.fresh = true;
    emit('call:done', c);
    if (c.fee) addFee(c);
  }

  function recover(c) {
    if (c.billed || !c.plan) return;
    var a = AG[c.agentId];
    c.billed = true; c.recovered = true; c.charge = c.plan.p;
    if (a) { a.wallet = Math.round((a.wallet - c.charge) * 100) / 100; emit('agent:update', a); }
    c.walletAfter = a ? a.wallet : 0;
    emit('call:update', c);
  }

  function miss(c, why) {
    if (c.status !== 'ringing') return;
    if (c.job) { cancel(c.job); c.job = null; }
    c.status = 'missed'; c.vm = ri(16, 64); c.endedAt = clock; c.missReason = why || null; c.fresh = true;
    var cb = addCallback(c, 0, null);
    callbacks.sort(function (a, b) { return b.ts - a.ts; });
    cb.fresh = true;
    emit('call:done', c); emit('callback:new', cb);
  }

  function spawn(opts) {
    opts = opts || {};
    var st = opts.state || wpick(STATE_W);
    var prod = opts.product || (rnd() < .6 ? FE : MC);
    if (!opts.state) {
      // Prefer a state/product someone can take; missed calls still happen (about 1 in 6)
      for (var tries = 0; tries < 6 && !eligible({ state: st, product: prod }, null, true).length; tries++) {
        st = wpick(STATE_W); prod = rnd() < .6 ? FE : MC;
      }
    }
    if (!licensedFor(st, prod).length) prod = FE;
    var city = opts.city ? [opts.city, opts.area] : pick(GEO[st].cities);
    var c = newCall({ ts: clock, state: st, city: city[0], area: city[1], product: prod, caller: opts.caller, number: opts.number, scripted: opts.scripted });
    c.fresh = true;
    var el = eligible(c, null);
    c.offeredTo = opts.offeredTo || eligible(c, null, true).length;
    calls.unshift(c);
    emit('call:new', c);
    if (opts.scripted) {
      c.job = schedule(40000, function () { miss(c); });
      return c;
    }
    if (!state.routing) {
      c.offeredTo = 0;
      c.job = schedule(1800, function () { miss(c, 'Routing paused'); });
    } else if (!el.length || rnd() < 1 / 6) {
      c.job = schedule(40000, function () { miss(c); });
    } else {
      c.job = schedule(rf(2000, 6000), function () {
        var e2 = eligible(c, null);
        if (!e2.length) { c.job = schedule(34000, function () { miss(c); }); return; }
        var ag = pick(e2);
        accept(c, ag, ag.plan === 30 || rnd() < .7 ? 30 : 60);
      });
    }
    return c;
  }

  var spawnJob = null;
  function scheduleSpawn(delay) {
    if (spawnJob) cancel(spawnJob);
    spawnJob = schedule(delay != null ? delay : rf(9000, 14000), function () { spawnJob = null; spawn(); scheduleSpawn(); });
  }

  /* Calls already in progress when the console opens */
  function seedLive() {
    var p = newCall({ ts: clock - 196e3, state: 'AZ', city: 'Mesa', area: 480, product: MC, caller: 'Evelyn C.' });
    p.offeredTo = 4; p.agentId = 'priya'; p.tta = 3.1; p.acceptedAt = p.ts + 3100; p.connectedAt = p.acceptedAt + 250;
    p.status = 'connected'; p.plan = planFor(MC, 90); AG.priya.currentCall = p.id;
    var q = newCall({ ts: clock - 69e3, state: 'GA', city: 'Savannah', area: 912, product: FE, caller: 'Otis K.' });
    q.offeredTo = 5; q.agentId = 'andre'; q.tta = 2.2; q.acceptedAt = q.ts + 2200; q.connectedAt = q.acceptedAt + 250;
    q.status = 'connected'; q.plan = planFor(FE, 60); AG.andre.currentCall = q.id;
    calls.unshift(q); calls.unshift(p);
    // move them to the right place in time order (calls are newest first)
    calls.sort(function (a, b) { return b.ts - a.ts; });
    p.job = schedule(rf(26000, 34000), function () { end(p); save(p, { outcome: 'Appointment', appt: 'Fri 10:30 am', gcal: true, notes: 'Comparing two plans with her husband. Booked Fri 10:30 am.' }); });
    q.job = schedule(rf(42000, 52000), function () { end(q); save(q, { outcome: 'Follow up', notes: 'Wants to talk it over with family first.' }); });
  }

  /* ---------- Public API ---------- */
  var Sim = {
    now: function () { return clock; },
    on: on,
    emit: emit,
    start: function () {
      if (state.running) return;
      useLiveRandom();
      seedLive();
      state.running = true;
      last = performance.now();
      setInterval(loop, 250);
      document.addEventListener('visibilitychange', function () { last = performance.now(); });
      scheduleSpawn(3200);
    },
    spawn: spawn,
    setRouting: function (onOff) { state.routing = !!onOff; emit('routing', state.routing); },
    routing: function () { return state.routing; },
    setFocusAgent: function (id) { state.focusAgent = id; },
    setStatus: function (agentId, status) { var a = AG[agentId]; if (!a || a.status === 'oncall') return; a.status = status; emit('agent:update', a); },
    eligible: eligible,
    /* Agent view (scripted, driven by the presenter) */
    offer: function (o) { o.scripted = true; return spawn(o); },
    accept: function (c, agentId, secs) { accept(c, AG[agentId], secs); },
    pass: function (c, agentId) {
      var others = eligible(c, agentId);
      if (c.job) cancel(c.job);
      if (!others.length || rnd() < .15) { c.job = schedule(Math.max(0, 40000 - (clock - c.ts)), function () { miss(c); }); return 'pending'; }
      c.job = schedule(rf(700, 1400), function () { accept(c, pick(others), 60); });
      return 'taken';
    },
    expire: function (c) { miss(c); },
    end: end,
    save: save,
    recover: recover,
    skip: function (c, ms) {
      if (!c || !c.connectedAt) return;
      c.connectedAt -= ms; c.ts -= ms; c.acceptedAt -= ms;
      calls.sort(function (a, b) { return b.ts - a.ts; });
    },
    refund: function (c, ok) {
      if (!c.refund || c.refund.status !== 'requested') return;
      c.refund.status = ok ? 'approved' : 'declined';
      c.refund.decidedAt = clock;
      if (ok) { var a = AG[c.agentId]; if (a) { a.wallet = Math.round((a.wallet + c.charge) * 100) / 100; emit('agent:update', a); } }
      emit('call:update', c); emit('refund:update', c);
    }
  };

  /* ---------- Derived numbers (always computed from the shared state) ---------- */
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function isConnected(c) { return !!c.agentId && (c.status === 'connected' || c.status === 'wrapup' || (c.status === 'completed' && c.duration >= 15)); }
  function kpis() {
    var total = calls.length;
    var resolved = calls.filter(function (c) { return c.status !== 'ringing'; }).length;
    var con = calls.filter(isConnected).length;
    var ttas = calls.filter(function (c) { return c.tta != null; }).map(function (c) { return c.tta; });
    var billed = calls.reduce(function (s, c) { return s + (c.billed && !(c.refund && c.refund.status === 'approved') ? c.charge : 0); }, 0);
    return { calls: total, connected: con, pct: resolved ? Math.round(con / resolved * 100) : 0, tta: round1(median(ttas)), billed: billed };
  }
  var LAST_WEEK = { calls: 36, pct: 81, tta: 4.1, billed: 845 };
  function hourly() {
    var out = [];
    for (var h = 8; h <= 18; h++) out.push({ h: h, con: 0, miss: 0, calls: 0, ttas: [], billed: 0 });
    calls.forEach(function (c) {
      var hr = new Date(c.ts).getHours();
      var b = out[hr - 8]; if (!b) return;
      b.calls++;
      if (c.status === 'missed') b.miss++; else if (c.agentId) b.con++;
      if (c.tta != null) b.ttas.push(c.tta);
      if (c.billed) b.billed += c.charge;
    });
    return out;
  }
  function liveCalls() { return calls.filter(function (c) { return c.status === 'ringing' || c.status === 'connected'; }); }
  function byState() {
    var m = {}; calls.forEach(function (c) { m[c.state] = (m[c.state] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { st: k, name: GEO[k].name, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; });
  }
  function agentStats(id) {
    var mine = calls.filter(function (c) { return c.agentId === id; });
    var lastCall = mine.length ? mine[0] : null;
    var plans = {};
    mine.forEach(function (c) { if (!c.plan) return; var k = c.product + '|' + c.plan.s + '|' + c.plan.p; plans[k] = (plans[k] || 0) + 1; });
    return { calls: mine.length, last: lastCall, plans: plans, billed: mine.reduce(function (s, c) { return s + (c.billed ? c.charge : 0); }, 0), ttas: mine.map(function (c) { return c.tta; }) };
  }

  window.IBData = {
    agency: AGENCY, agents: AGENTS, agent: function (id) { return AG[id]; },
    calls: calls, call: function (id) { for (var i = 0; i < calls.length; i++) if (calls[i].id === id) return calls[i]; return null; },
    callbacks: callbacks, callbackFor: function (id) { return CB[id]; }, cbPrice: cbPrice, cbDays: cbDays, cbPrices: CB_PRICES,
    billing: BILL, plans: PLANS, planFor: planFor, products: PRODUCTS, outcomes: OUTCOMES, geo: GEO, states: STATES,
    kpis: kpis, lastWeek: LAST_WEEK, hourly: hourly, liveCalls: liveCalls, byState: byState, agentStats: agentStats,
    isConnected: isConnected, median: median, minPlan: minPlan, maskNum: maskNum, unlockNum: unlockNum,
    dayStart: T0, sim: Sim
  };
})();
