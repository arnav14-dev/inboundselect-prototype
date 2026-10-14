/* ==========================================================================
   Inbound Select — agency console (app.html)
   Hash routing, live sample data, View Transitions, one motion curve.
   Classic script; reads window.IBData from app-data.js.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.IBData, S = D.sim;
  var MQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return MQ.matches; }
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var EASE_IO = 'cubic-bezier(.65,0,.35,1)';

  /* ==========================================================================
     Utilities
     ========================================================================== */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function money(n) { var neg = n < 0; n = Math.abs(n); return (neg ? '−' : '') + '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function money0(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function tclock(ms, secs) {
    var d = new Date(ms), h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    var ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + (secs ? ':' + (s < 10 ? '0' : '') + s : '') + ' ' + ap;
  }
  function dur(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function dayLabel(ms) {
    if (ms >= D.dayStart) return 'Today';
    if (ms >= D.dayStart - 864e5) return 'Yesterday';
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function when(ms) { var d = dayLabel(ms); return d === 'Today' ? tclock(ms) : d + ', ' + tclock(ms); }
  function shortDate(ms) { return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function now() { return S.now(); }
  function weekday(ms) { return new Date(ms).toLocaleDateString('en-US', { weekday: 'short' }); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : (b || a + 's')); }
  function listAnd(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function liveDur(c) { return c.connectedAt ? Math.max(0, (now() - c.connectedAt) / 1000) : 0; }
  function ringLeft(c) { return Math.max(0, 40 - (now() - c.ts) / 1000); }

  /* Number tween (expo-out over 0.8s) */
  function tick(node, to, fmt) {
    if (!node) return;
    var from = parseFloat(node.getAttribute('data-val'));
    node.setAttribute('data-val', to);
    if (isNaN(from) || from === to || reduced()) { node.textContent = fmt(to); return; }
    var t0 = performance.now(), d = 800;
    if (node._tw) cancelAnimationFrame(node._tw);
    (function step(t) {
      var p = Math.min(1, (t - t0) / d), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      node.textContent = fmt(from + (to - from) * e);
      if (p < 1) node._tw = requestAnimationFrame(step);
    })(t0);
  }

  /* FLIP: animate children of a container from their old to their new boxes */
  function flip(container, sel, mutate) {
    var before = new Map();
    $$(sel, container).forEach(function (n) { before.set(n, n.getBoundingClientRect()); });
    mutate();
    if (reduced()) return;
    $$(sel, container).forEach(function (n) {
      var f = before.get(n), l = n.getBoundingClientRect();
      if (!f) {
        n.animate([{ opacity: 0, transform: 'translateY(-10px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE, fill: 'backwards' });
        return;
      }
      var dx = f.left - l.left, dy = f.top - l.top;
      if (Math.abs(dx) > .5 || Math.abs(dy) > .5) n.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 560, easing: EASE });
    });
  }

  /* ==========================================================================
     Icons (16px line, 1.5 stroke)
     ========================================================================== */
  var IC = {
    overview: '<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2"/><rect x="9" y="9" width="4.5" height="4.5" rx="1.2"/>',
    live: '<circle cx="8" cy="8" r="1.3"/><path d="M5.4 10.6a3.7 3.7 0 0 1 0-5.2M10.6 5.4a3.7 3.7 0 0 1 0 5.2M3.45 12.55a6.45 6.45 0 0 1 0-9.1M12.55 3.45a6.45 6.45 0 0 1 0 9.1"/>',
    calls: '<path d="M3.7 2.25h1.9l1.05 2.85-1.35 1a7.4 7.4 0 0 0 4.6 4.6l1-1.35 2.85 1.05v1.9c0 .75-.6 1.35-1.35 1.35C6.55 13.4 2.6 9.45 2.35 3.6c0-.75.6-1.35 1.35-1.35Z"/>',
    agents: '<circle cx="6" cy="5.25" r="2.4"/><path d="M1.9 13.25c.45-2.3 2.1-3.7 4.1-3.7s3.65 1.4 4.1 3.7"/><path d="M10.4 3a2.4 2.4 0 0 1 0 4.5M12 9.75c1.2.55 1.95 1.7 2.2 3.5"/>',
    callbacks: '<circle cx="4.6" cy="8.25" r="2.45"/><circle cx="11.4" cy="8.25" r="2.45"/><path d="M4.6 10.7h6.8"/>',
    billing: '<rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.75"/><path d="M1.75 6.4h12.5M4.5 10h2.5"/>',
    routing: '<circle cx="3.5" cy="8" r="1.5"/><circle cx="12.5" cy="3.75" r="1.5"/><circle cx="12.5" cy="12.25" r="1.5"/><path d="M5 8h1.3c1.7 0 2.2-.95 2.8-2.15.5-1.05 1-2.1 1.9-2.1M6.3 8c1.7 0 2.2.95 2.8 2.15.5 1.05 1 2.1 1.9 2.1"/>',
    headset: '<path d="M2.75 10.25V8a5.25 5.25 0 0 1 10.5 0v2.25"/><rect x="2" y="8.75" width="2.75" height="4" rx="1"/><rect x="11.25" y="8.75" width="2.75" height="4" rx="1"/><path d="M13.25 12.75c0 1-.9 1.75-2.25 1.75H9.25"/>',
    search: '<circle cx="7" cy="7" r="4.25"/><path d="m10.2 10.2 3.3 3.3"/>',
    calendar: '<rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.75"/><path d="M2.25 6.6h11.5M5.4 1.75v3M10.6 1.75v3"/>',
    updown: '<path d="m5.25 6 2.75-2.75L10.75 6M5.25 10 8 12.75 10.75 10"/>',
    'chevron-down': '<path d="m4.5 6.25 3.5 3.5 3.5-3.5"/>',
    'chevron-right': '<path d="m6.25 4.25 3.5 3.75-3.5 3.75"/>',
    x: '<path d="m4.25 4.25 7.5 7.5M11.75 4.25l-7.5 7.5"/>',
    check: '<path d="m3.5 8.4 2.9 2.85L12.5 5"/>',
    plus: '<path d="M8 3.25v9.5M3.25 8h9.5"/>',
    'arrow-left': '<path d="M12.75 8h-9.5M7 4.25 3.25 8 7 11.75"/>',
    'arrow-right': '<path d="M3.25 8h9.5M9 4.25 12.75 8 9 11.75"/>',
    menu: '<path d="M2.5 5.25h11M2.5 10.75h11"/>',
    play: '<path d="M5 3.4v9.2l7.6-4.6Z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="4" y="3.25" width="2.75" height="9.5" rx=".8" fill="currentColor" stroke="none"/><rect x="9.25" y="3.25" width="2.75" height="9.5" rx=".8" fill="currentColor" stroke="none"/>',
    ff: '<path d="M2.5 4.25v7.5L7.75 8Z M8.25 4.25v7.5L13.5 8Z" fill="currentColor" stroke="none"/>',
    copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.6"/><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/>',
    mail: '<rect x="2" y="3.5" width="12" height="9" rx="1.6"/><path d="m2.6 4.6 5.4 4 5.4-4"/>',
    wallet: '<path d="M2.5 4.75v6.75c0 .83.67 1.5 1.5 1.5h9a.5.5 0 0 0 .5-.5V6.25a.5.5 0 0 0-.5-.5H4a1.5 1.5 0 0 1 0-3h7.5"/><circle cx="10.75" cy="9.4" r=".8" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="8" cy="8" r="5.75"/><path d="M8 5v3.2l2 1.3"/>',
    filter: '<path d="M2.5 4.5h11M4.75 8h6.5M6.75 11.5h2.5"/>',
    info: '<circle cx="8" cy="8" r="5.75"/><path d="M8 7.25v3.5M8 5.1v.05"/>',
    refund: '<path d="M5.5 3.75 2.75 6.5 5.5 9.25"/><path d="M2.75 6.5h6.75a3.5 3.5 0 0 1 0 7H7.5"/>',
    phone: '<path d="M3.7 2.25h1.9l1.05 2.85-1.35 1a7.4 7.4 0 0 0 4.6 4.6l1-1.35 2.85 1.05v1.9c0 .75-.6 1.35-1.35 1.35C6.55 13.4 2.6 9.45 2.35 3.6c0-.75.6-1.35 1.35-1.35Z"/>',
    gcal: '<rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.75"/><path d="M2.25 6.6h11.5M5.4 1.75v3M10.6 1.75v3M5.75 10.1l1.5 1.4 3-3"/>',
    lock: '<rect x="3.25" y="7" width="9.5" height="6.75" rx="1.5"/><path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.5 0V7"/>',
    unlock: '<rect x="3.25" y="7" width="9.5" height="6.75" rx="1.5"/><path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.3-1"/>',
    note: '<path d="M3.25 2.75h9.5v10.5h-9.5z"/><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3"/>',
    voicemail: '<circle cx="4.6" cy="8.25" r="2.45"/><circle cx="11.4" cy="8.25" r="2.45"/><path d="M4.6 10.7h6.8"/>'
  };
  function ic(n, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';
  }
  function fillIcons(root) { $$('[data-ic]', root).forEach(function (n) { if (!n.firstChild) n.innerHTML = ic(n.getAttribute('data-ic')); }); }

  /* ---------- Small components ---------- */
  function sig(ring, cls) { return '<span class="sig' + (ring ? ' sig--ring' : '') + (cls ? ' ' + cls : '') + '" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'; }
  function seeded(seed) { var a = seed * 9301 + 49297; return function () { a = (a * 9301 + 49297) % 233280; return a / 233280; }; }
  function waveBars(n, seed, live) {
    var r = seeded(seed || 7), out = '';
    for (var i = 0; i < n; i++) {
      var env = Math.sin((i / n) * Math.PI) * .55 + .45;
      var h = Math.round(18 + (r() * 70 + 12) * env);
      out += '<i style="--h:' + Math.min(100, h) + '%;--i:' + i + '"></i>';
    }
    return out;
  }
  function av(a, s) { return '<span class="av" style="--s:' + (s || 24) + 'px">' + esc(a.initials) + '</span>'; }
  function st(code) { return '<span class="st">' + code + '</span>'; }
  function agentName(id) { var a = id && D.agent(id); return a ? a.name : ''; }

  function outcomePill(c) {
    if (c.status === 'ringing') return '<span class="pill pill--blue no-dot pill-sig">' + sig(true) + 'Ringing</span>';
    if (c.status === 'connected') return '<span class="pill pill--green">On call</span>';
    if (c.status === 'wrapup') return '<span class="pill">Logging outcome</span>';
    if (c.status === 'missed') return '<span class="pill pill--amber">Callback Request</span>';
    if (c.refund && c.refund.status === 'requested') return '<span class="pill pill--red">Refund requested</span>';
    if (c.refund && c.refund.status === 'approved') return '<span class="pill pill--red">Refunded</span>';
    var good = c.outcome === 'Sale' || c.outcome === 'Appointment';
    return '<span class="pill' + (good ? ' pill--green' : '') + '">' + esc(c.outcome) + '</span>';
  }
  function statusOf(a) {
    if (a.status === 'oncall') return { k: 'oncall', l: 'On a call' };
    if (a.status === 'offline') return { k: 'offline', l: 'Offline' };
    return { k: 'available', l: 'Available' };
  }
  function walletLow(a) { return a.wallet < Math.max.apply(null, a.products.map(D.minPlan)) + 10 + 15; }

  /* ==========================================================================
     Shell: nav, top bar, routing popover, mobile menu
     ========================================================================== */
  var NAV = [
    { id: 'overview', label: 'Overview', ic: 'overview' },
    { id: 'live', label: 'Live calls', ic: 'live' },
    { id: 'calls', label: 'Calls', ic: 'calls' },
    { id: 'agents', label: 'Agents', ic: 'agents' },
    { id: 'callbacks', label: 'Callback Requests', ic: 'callbacks' },
    { id: 'billing', label: 'Billing', ic: 'billing' },
    { id: 'routing', label: 'Routing', ic: 'routing' }
  ];
  var view = $('#view'), scroller = $('#scroller'), drawer = $('#drawer'), scrim = $('#scrim');

  function navHTML() {
    return '<span class="nav-ind" aria-hidden="true"></span>' + NAV.map(function (n) {
      return '<a class="nav-i" href="#/' + n.id + '" data-id="' + n.id + '">' + ic(n.ic) + '<span class="nav-l">' + n.label + '</span>' +
        (n.id === 'live' ? '<span class="nav-live" data-live-count></span>' : '') + '</a>';
    }).join('');
  }
  function setNav(id) {
    ['#nav', '#mnav'].forEach(function (s) {
      var nav = $(s); if (!nav) return;
      var cur = null;
      $$('.nav-i', nav).forEach(function (a) { var on = a.getAttribute('data-id') === id; a.classList.toggle('is-on', on); if (on) { cur = a; a.setAttribute('aria-current', 'page'); } else a.removeAttribute('aria-current'); });
      var ind = $('.nav-ind', nav);
      if (cur && ind) { ind.style.transform = 'translateY(' + cur.offsetTop + 'px)'; ind.style.height = cur.offsetHeight + 'px'; ind.classList.add('is-on'); }
    });
    var item = NAV.filter(function (n) { return n.id === id; })[0];
    $('#crumb-page').textContent = item ? item.label : '';
  }
  function updateLiveCount() {
    var live = D.liveCalls(), ringing = live.some(function (c) { return c.status === 'ringing'; });
    $$('[data-live-count]').forEach(function (n) {
      n.innerHTML = live.length ? (ringing ? sig(true) : '') + '<b>' + live.length + '</b>' : '';
      n.classList.toggle('is-ring', ringing);
    });
  }

  /* Routing on/off popover */
  function routingUI() {
    var on = S.routing();
    var b = $('#routing-btn');
    b.classList.toggle('is-paused', !on);
    $('.routing-label', b).textContent = on ? 'Routing on' : 'Routing paused';
  }
  function openPop() {
    var on = S.routing(), pop = $('#routing-pop');
    pop.innerHTML = '<div class="pop-h"><span class="live-dot' + (on ? '' : ' is-paused') + '"></span><b>' + (on ? 'Routing is on' : 'Routing is paused') + '</b></div>' +
      '<p>' + (on ? 'New calls are offered to every eligible agent the moment they ring.' : 'New calls go straight to Callback Requests until you resume.') + '</p>' +
      '<div class="pop-f"><button class="btn btn--ghost btn--sm" type="button" data-pop-close>Cancel</button>' +
      '<button class="btn btn--sm' + (on ? '' : ' btn--blue') + '" type="button" id="routing-toggle">' + (on ? 'Pause routing' : 'Resume routing') + '</button></div>';
    pop.hidden = false;
    requestAnimationFrame(function () { pop.classList.add('open'); });
    $('#routing-btn').setAttribute('aria-expanded', 'true');
    $('#routing-toggle').addEventListener('click', function () {
      S.setRouting(!on); closePop();
      toast(on ? 'Routing paused. New calls go to Callback Requests.' : 'Routing resumed.', on ? 'amber' : 'green');
    });
  }
  function closePop() {
    var pop = $('#routing-pop'); if (!pop || pop.hidden) return;
    pop.classList.remove('open'); $('#routing-btn').setAttribute('aria-expanded', 'false');
    setTimeout(function () { if (!pop.classList.contains('open')) pop.hidden = true; }, 200);
  }

  /* Agency switcher (a single sample agency) */
  function orgMenu() {
    var m = $('#org-menu');
    if (m) { m.remove(); return; }
    m = el('<div class="menu org-menu" id="org-menu" role="menu"><div class="menu-h">Agencies</div>' +
      '<button class="menu-i is-on" type="button"><span class="org-mono org-mono--sm">LS</span><span>Lakeshore Senior Benefits</span>' + ic('check', 'menu-ck') + '</button></div>');
    $('#sb').appendChild(m);
    requestAnimationFrame(function () { m.classList.add('open'); });
  }

  /* Mobile menu sheet */
  function openMenu() { var m = $('#msheet'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
  function closeMenu() { var m = $('#msheet'); if (!m) return; m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }

  /* ==========================================================================
     Router + View Transitions
     ========================================================================== */
  var R = { page: null, mode: 'agency', lastAgency: '#/overview', drawer: null };
  var PAGES = {};

  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var p = h.split('/');
    return { page: p[0] || 'overview', param: p[1] ? decodeURIComponent(p[1]) : null };
  }
  function route() {
    var r = parse();
    if (r.page === 'agent') { enterAgent(); return; }
    if (!PAGES[r.page]) r.page = 'overview';
    R.lastAgency = '#/' + r.page;
    if (R.mode === 'agent') { leaveAgent(r); return; }
    if (r.page === R.page) { applyParam(r); return; }
    swapPage(r);
  }
  /* Route change is sequential, never a crossfade: the old view fades out
     (120ms), then the new one fades in with a 6px rise (220ms, expo-out).
     Timings live in app.css (::view-transition-old/new(main-view)). The new
     page renders without its own stagger, so there is one motion, not two. */
  function swapPage(r) {
    closeMenu(); closePop(); closeMenus();
    var hadDrawer = !!R.drawer;
    if (hadDrawer) closeDrawer(true);
    var first = !R.page;
    var update = function () { renderPage(r.page, !first); };
    if (first || reduced()) { update(); applyParam(r); return; }
    if (document.startViewTransition) {
      var t = document.startViewTransition(update);
      // A newer route change skips this one; that is expected, not an error
      t.ready.catch(function () {});
      t.updateCallbackDone.then(function () { applyParam(r); });
    } else {
      if (window.gsap) {
        window.gsap.to(view, { opacity: 0, duration: .12, ease: 'power1.in', onComplete: function () { update(); applyParam(r); window.gsap.fromTo(view, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .22, ease: 'expo.out', clearProps: 'transform' }); } });
      } else { update(); applyParam(r); }
    }
  }
  function renderPage(id, quiet) {
    if (R.page && PAGES[R.page] && PAGES[R.page].unmount) PAGES[R.page].unmount();
    R.page = id;
    var P = PAGES[id];
    view.setAttribute('data-page', id);
    view.innerHTML = P.render();
    scroller.scrollTop = 0;
    if (P.mount) P.mount();
    setNav(id);
    document.title = (id === 'overview' ? '' : (NAV.filter(function (n) { return n.id === id; })[0].label + ' · ')) + 'Inbound Select — Agency console';
    if (!quiet) stagger(view);
  }
  function stagger(root) {
    if (reduced()) return;
    $$('[data-in]', root).forEach(function (n, i) {
      n.style.setProperty('--d', (i * 30) + 'ms');
      n.classList.add('in');
      n.addEventListener('animationend', function h(e) { if (e.target !== n) return; n.classList.remove('in'); n.removeEventListener('animationend', h); });
    });
  }
  function applyParam(r) {
    var P = PAGES[r.page];
    if (P && P.param) P.param(r.param);
    else if (R.drawer) closeDrawer();
  }

  /* ==========================================================================
     Drawer (right, 420px) + modal + menus
     ========================================================================== */
  function openDrawer(html, kind, id) {
    var wasOpen = drawer.classList.contains('open');
    R.drawer = { kind: kind, id: id };
    drawer.innerHTML = html;
    drawer.setAttribute('aria-hidden', 'false');
    if (!wasOpen) {
      drawer.classList.add('open'); scrim.classList.add('open');
      setTimeout(function () { try { drawer.focus({ preventScroll: true }); } catch (e) {} }, 60);
    } else if (!reduced()) {
      var b = $('.dr-body', drawer);
      if (b) b.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE });
    }
    $$('[data-close-drawer]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawerNav); });
  }
  function closeDrawer(silent) {
    stopPlayers();
    R.drawer = null;
    drawer.classList.remove('open'); scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    $$('.is-sel', view).forEach(function (n) { n.classList.remove('is-sel'); });
  }
  function closeDrawerNav() {
    if (!R.drawer) return;
    if (R.page && PAGES[R.page] && PAGES[R.page].param) location.hash = '#/' + R.page;
    else closeDrawer();
  }

  var modalRoot = $('#modal-root');
  function openModal(html, opts) {
    opts = opts || {};
    closeModal(true);
    var m = el('<div class="modal' + (opts.cls ? ' ' + opts.cls : '') + '"><div class="modal-scrim"' + (opts.locked ? '' : ' data-close-modal') + '></div>' +
      '<div class="modal-box" role="dialog" aria-modal="true"' + (opts.label ? ' aria-label="' + esc(opts.label) + '"' : '') + '>' + html + '</div></div>');
    m._locked = !!opts.locked;
    modalRoot.appendChild(m);
    $$('[data-close-modal]', m).forEach(function (b) { b.addEventListener('click', function () { closeModal(); }); });
    requestAnimationFrame(function () { m.classList.add('open'); });
    return m;
  }
  function closeModal(instant, force) {
    var m = modalRoot.firstElementChild; if (!m) return;
    if (m._locked && !force) return;
    if (instant) { m.remove(); return; }
    m.classList.remove('open'); m.classList.add('closing');
    setTimeout(function () { m.remove(); }, 220);
  }
  function modalOpen() { return !!modalRoot.firstElementChild; }

  function closeMenus() { $$('.menu.open').forEach(function (m) { m.remove(); }); }

  /* ==========================================================================
     Toasts (bottom-right, small, auto-dismiss)
     ========================================================================== */
  function toast(text, tone) {
    var host = $('#toasts');
    var t = el('<div class="toast toast--' + (tone || 'green') + '" role="status"><span class="toast-dot"></span><span class="toast-t">' + text + '</span></div>');
    host.appendChild(t);
    while (host.children.length > 3) host.firstElementChild.remove();
    requestAnimationFrame(function () { t.classList.add('in'); });
    setTimeout(function () { t.classList.remove('in'); t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 4200);
  }

  /* ==========================================================================
     OVERVIEW
     ========================================================================== */
  function greeting() { var h = new Date(now()).getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  function availCount() { return D.agents.filter(function (a) { return a.status === 'available'; }).length; }
  function ovSummary() {
    var k = D.kpis(), live = D.liveCalls().length;
    return plural(k.calls, 'call') + ' so far today, ' + k.connected + ' connected. ' +
      availCount() + ' of ' + D.agents.length + ' agents are available' + (live ? ' and ' + plural(live, 'call is', 'calls are') + ' live right now.' : '.');
  }
  var FMT = {
    int: function (v) { return Math.round(v).toLocaleString('en-US'); },
    s1: function (v) { return (Math.round(v * 10) / 10).toFixed(1); },
    money0: function (v) { return money0(v); }
  };
  function deltaHTML(key, k) {
    var lw = D.lastWeek, d, txt, good;
    if (key === 'calls') { d = (k.calls - lw.calls) / lw.calls * 100; txt = (d >= 0 ? '+' : '−') + Math.abs(Math.round(d)) + '%'; good = d >= 0; }
    if (key === 'connected') { d = k.pct - lw.pct; txt = (d >= 0 ? '+' : '−') + Math.abs(d) + ' pts'; good = d >= 0; }
    if (key === 'tta') { d = Math.round((k.tta - lw.tta) * 10) / 10; txt = (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + 's'; good = d <= 0; }
    if (key === 'billed') { d = (k.billed - lw.billed) / lw.billed * 100; txt = (d >= 0 ? '+' : '−') + Math.abs(Math.round(d)) + '%'; good = d >= 0; }
    return '<span class="pill no-dot delta ' + (good ? 'pill--green' : 'pill--red') + '">' + txt + '</span><span class="kpi-vs">vs last ' + weekday(now()) + '</span>';
  }
  function sparkSeries(key) {
    var hrs = D.hourly(), curH = new Date(now()).getHours();
    hrs = hrs.filter(function (b) { return b.h <= curH; });
    var acc = 0;
    return hrs.map(function (b) {
      if (key === 'calls') { acc += b.calls; return acc; }
      if (key === 'connected') { var t = b.con + b.miss; return t ? b.con / t : 1; }
      if (key === 'tta') return b.ttas.length ? D.median(b.ttas) : 3;
      if (key === 'billed') { acc += b.billed; return acc; }
      return 0;
    });
  }
  function spark(key) {
    var s = sparkSeries(key), W = 72, H = 24, p = 3;
    if (s.length < 2) s = [0, 0];
    var mn = Math.min.apply(null, s), mx = Math.max.apply(null, s); if (mx === mn) { mx += 1; mn -= 1; }
    var pts = s.map(function (v, i) { return [p + i * (W - 2 * p) / (s.length - 1), p + (H - 2 * p) * (1 - (v - mn) / (mx - mn))]; });
    var d = pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    var last = pts[pts.length - 1];
    var area = d + ' L' + last[0].toFixed(1) + ' ' + H + ' L' + p + ' ' + H + ' Z';
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><path class="spark-a" d="' + area + '"/><path class="spark-l" d="' + d + '"/><circle class="spark-d" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2"/></svg>';
  }
  function kpiCell(key, label, valueHTML, k) {
    return '<div class="kpi" data-k="' + key + '"><div class="kpi-top"><span class="kpi-l">' + label + '</span><span class="kpi-spark" data-spark="' + key + '">' + spark(key) + '</span></div>' +
      '<div class="kpi-v">' + valueHTML + '</div><div class="kpi-d" data-delta="' + key + '">' + deltaHTML(key, k) + '</div></div>';
  }
  function numSpan(key, v, fmt) { return '<span class="num" data-num="' + key + '" data-fmt="' + fmt + '" data-val="' + v + '">' + FMT[fmt](v) + '</span>'; }
  function kpisHTML() {
    var k = D.kpis();
    return kpiCell('calls', 'Calls today', numSpan('calls', k.calls, 'int'), k) +
      kpiCell('connected', 'Connected', numSpan('connected', k.connected, 'int') + '<span class="kpi-sub">' + numSpan('pct', k.pct, 'int') + '%</span>', k) +
      kpiCell('tta', 'Median time to accept', numSpan('tta', k.tta, 's1') + '<span class="kpi-unit">s</span>', k) +
      kpiCell('billed', 'Billed today', numSpan('billed', k.billed, 'money0'), k);
  }
  function refreshKpis() {
    var k = D.kpis();
    var map = { calls: k.calls, connected: k.connected, pct: k.pct, tta: k.tta, billed: k.billed };
    $$('[data-num]', view).forEach(function (n) { var key = n.getAttribute('data-num'); tick(n, map[key], FMT[n.getAttribute('data-fmt')]); });
    $$('[data-delta]', view).forEach(function (n) { n.innerHTML = deltaHTML(n.getAttribute('data-delta'), k); });
    $$('[data-spark]', view).forEach(function (n) { n.innerHTML = spark(n.getAttribute('data-spark')); });
  }

  /* ---------- Calls by hour (inline SVG) ---------- */
  var chartRO = null;
  function roundTop(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function hourLabel(h) { return (h % 12 || 12) + (h < 12 ? 'a' : 'p'); }
  function hourRange(h) { var f = function (x) { return (x % 12 || 12) + (x < 12 ? ' am' : ' pm'); }; return f(h) + ' – ' + f(h + 1); }
  function drawChart(grow) {
    var host = $('#chart'); if (!host) return;
    var W = Math.max(280, host.clientWidth), H = host.clientHeight || 240;
    var pl = 30, pr = 4, pt = 12, pb = 26;
    var b = D.hourly(), curH = new Date(now()).getHours();
    var mx = 0; b.forEach(function (x) { mx = Math.max(mx, x.con + x.miss); });
    var step = mx > 12 ? 4 : 2, top = Math.max(step * 3, Math.ceil((mx + 1) / step) * step);
    var iw = W - pl - pr, ih = H - pt - pb, band = iw / b.length, bw = Math.min(28, Math.max(10, band * .46));
    var y = function (v) { return pt + ih - v / top * ih; };
    var g = '';
    for (var v = 0; v <= top; v += step) {
      g += '<line class="' + (v === 0 ? 'gl0' : 'gl') + '" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/>' +
        '<text class="gy" x="' + (pl - 10) + '" y="' + (y(v) + 3.5).toFixed(1) + '">' + v + '</text>';
    }
    var bars = '', labels = '', zones = '';
    b.forEach(function (x, i) {
      var cx = pl + band * i + band / 2, bx = cx - bw / 2;
      var future = x.h > curH;
      var hc = x.con / top * ih, hm = x.miss / top * ih, gap = x.con && x.miss ? 2 : 0;
      var con = x.miss ? (hc > 0 ? 'M' + bx + ' ' + (pt + ih) + 'V' + (pt + ih - hc) + 'H' + (bx + bw) + 'V' + (pt + ih) + 'Z' : '') : roundTop(bx, pt + ih - hc, bw, hc, 4);
      var miss = roundTop(bx, pt + ih - hc - gap - hm, bw, hm, 4);
      bars += '<g class="bar' + (x.h === curH ? ' is-now' : '') + '" data-i="' + i + '" style="--d:' + (i * 45) + 'ms">' +
        (con ? '<path class="b-con" d="' + con + '"/>' : '') + (miss ? '<path class="b-miss" d="' + miss + '"/>' : '') + '</g>';
      if (future) bars += '<line class="b-future" x1="' + (cx - 3) + '" x2="' + (cx + 3) + '" y1="' + (pt + ih - .5) + '" y2="' + (pt + ih - .5) + '"/>';
      labels += '<text class="gx' + (x.h === curH ? ' is-now' : '') + (future ? ' is-future' : '') + '" x="' + cx.toFixed(1) + '" y="' + (H - 6) + '">' + hourLabel(x.h) + '</text>';
      zones += '<rect class="hz" data-i="' + i + '" x="' + (pl + band * i).toFixed(1) + '" y="' + pt + '" width="' + band.toFixed(1) + '" height="' + ih + '"/>';
    });
    host.innerHTML = '<svg class="chart-svg' + (grow && !reduced() ? ' grow' : '') + '" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Calls by hour today">' +
      g + '<line class="xh" x1="0" x2="0" y1="' + pt + '" y2="' + (pt + ih) + '"/>' + bars + labels + zones + '</svg><div class="tip" role="tooltip"></div>';
    var svg = $('svg', host), tip = $('.tip', host), xh = $('.xh', svg);
    $$('.hz', svg).forEach(function (z) {
      z.addEventListener('mouseenter', function () {
        var i = +z.getAttribute('data-i'), x = b[i], cx = pl + band * i + band / 2;
        xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); svg.classList.add('hovering');
        $$('.bar', svg).forEach(function (g2) { g2.classList.toggle('is-hot', +g2.getAttribute('data-i') === i); });
        var future = x.h > curH;
        tip.innerHTML = '<b>' + hourRange(x.h) + '</b>' + (future ? '<span class="tip-r faint">Later today</span>' :
          '<span class="tip-r"><i class="lg lg--con"></i>Connected<em>' + x.con + '</em></span><span class="tip-r"><i class="lg lg--miss"></i>Missed, then callback<em>' + x.miss + '</em></span>');
        tip.classList.add('on');
        var tw = tip.offsetWidth, left = cx + 14; if (left + tw > W) left = cx - tw - 14;
        var barTop = y(x.con + x.miss);
        tip.style.transform = 'translate(' + left + 'px,' + Math.max(0, Math.min(barTop - 10, H - tip.offsetHeight - pb)) + 'px)';
      });
    });
    svg.addEventListener('mouseleave', function () { svg.classList.remove('hovering'); tip.classList.remove('on'); $$('.bar', svg).forEach(function (g2) { g2.classList.remove('is-hot'); }); });
  }

  /* ---------- Live now feed ---------- */
  function evSteps(c) {
    var a = c.agentId ? D.agent(c.agentId) : null, s = [];
    if (c.status === 'missed' && c.missReason) s.push('Routing paused, not offered');
    else s.push(c.offeredTo ? 'Offered to ' + plural(c.offeredTo, 'licensed agent') : 'No eligible agent available');
    if (a) s.push('<b>' + esc(a.name) + '</b> accepted in ' + c.tta.toFixed(1) + 's');
    if (c.status === 'connected') s.push('Connected · <span class="mono" data-dur="' + c.id + '">' + dur(liveDur(c)) + '</span>');
    if (c.status === 'wrapup') s.push('Ended ' + dur(c.duration) + ' · logging outcome');
    if (c.status === 'completed') s.push('Ended ' + dur(c.duration) + ' · ' + esc(c.outcome) + (c.appt ? ', ' + c.appt : ''));
    if (c.status === 'missed') { if (!c.missReason) s.push('No one accepted within 40s'); s.push('Saved as a Callback Request'); }
    return s;
  }
  function evHead(c) {
    if (c.status === 'ringing') return '<span class="ev-k ev-k--ring">' + sig(true) + 'Ringing</span>';
    if (c.status === 'connected') return '<span class="ev-k ev-k--live"><span class="live-dot"></span>Connected</span>';
    if (c.status === 'missed') return '<span class="ev-k ev-k--miss"><i class="dot dot--amber"></i>Missed</span>';
    if (c.status === 'wrapup') return '<span class="ev-k"><i class="dot"></i>Wrapping up</span>';
    return '<span class="ev-k"><i class="dot"></i>Completed</span>';
  }
  function evInner(c, fromStep) {
    var steps = evSteps(c);
    return '<div class="ev-top">' + evHead(c) + '<time class="mono">' + tclock(c.ts) + '</time></div>' +
      '<div class="ev-t">' + esc(c.city) + ', ' + c.state + '<span class="ev-sep">·</span><span class="ev-p">' + c.product + '</span></div>' +
      '<ol class="ev-steps">' + steps.map(function (t, i) { return '<li' + (fromStep != null && i >= fromStep ? ' class="is-new"' : '') + '>' + t + '</li>'; }).join('') + '</ol>';
  }
  function evCard(c) {
    return '<a class="ev ev--' + c.status + '" href="#/calls/' + c.id + '" data-call="' + c.id + '" data-steps="' + evSteps(c).length + '">' + evInner(c) + '</a>';
  }
  var FEED_N = 6;
  function fillFeed() {
    var f = $('#feed'); if (!f) return;
    f.innerHTML = D.calls.slice(0, FEED_N).map(evCard).join('');
  }
  function feedUpdate(type, c) {
    var f = $('#feed'); if (!f) return;
    if (type === 'call:new') {
      flip(f, '.ev', function () {
        f.insertBefore(el(evCard(c)), f.firstChild);
        var all = $$('.ev', f); for (var i = FEED_N; i < all.length; i++) all[i].remove();
      });
      return;
    }
    var card = $('[data-call="' + c.id + '"]', f); if (!card) return;
    var prev = +card.getAttribute('data-steps'), steps = evSteps(c).length;
    card.className = 'ev ev--' + c.status;
    card.setAttribute('data-steps', steps);
    card.innerHTML = evInner(c, steps > prev ? prev : null);
  }

  /* ---------- Agents panel + states ---------- */
  function ovAgentsHTML() {
    return D.agents.map(function (a) {
      var s = statusOf(a), cur = a.currentCall && D.call(a.currentCall);
      return '<li class="ag-row"><a href="#/agents/' + a.id + '">' + av(a, 24) + '<span class="ag-n">' + esc(a.name) + '</span>' +
        '<span class="ag-s ag-s--' + s.k + '"><i class="sdot sdot--' + s.k + '"></i>' + s.l +
        (s.k === 'oncall' && cur && cur.connectedAt ? ' <span class="mono faint" data-dur="' + cur.id + '">' + dur(liveDur(cur)) + '</span>' : '') + '</span></a></li>';
    }).join('');
  }
  function ovStatesHTML() {
    var rows = D.byState(), mx = rows.length ? rows[0].n : 1;
    return rows.map(function (r, i) {
      return '<li class="sr">' + st(r.st) + '<span class="sr-n">' + r.name + '</span><span class="sr-bar"><i style="--w:' + (r.n / mx).toFixed(3) + ';--d:' + (i * 40) + 'ms"></i></span><span class="sr-c tnum">' + r.n + '</span></li>';
    }).join('');
  }
  function refreshAgentsPanel() {
    var l = $('#ov-agents'); if (l) l.innerHTML = ovAgentsHTML();
    var n = $('#ov-avail'); if (n) n.textContent = availCount() + ' available';
  }

  PAGES.overview = {
    render: function () {
      return '<div class="ph" data-in><div><h1 class="pt">' + greeting() + ', ' + D.agency.ownerFirst + '</h1><p class="ps" id="ov-sum">' + ovSummary() + '</p></div></div>' +
        '<section class="kpis" data-in aria-label="Today">' + kpisHTML() + '</section>' +
        '<div class="ov-grid">' +
          '<section class="panel ov-chart" data-in><header class="panel-h"><h2>Calls by hour</h2><div class="legend"><span><i class="lg lg--con"></i>Connected</span><span><i class="lg lg--miss"></i>Missed, then callback</span></div></header><div class="chart" id="chart"></div></section>' +
          '<aside class="feed ov-feed" data-in><header class="feed-h"><h2><span class="live-dot"></span>Live now</h2><a class="lnk" href="#/live">Live calls' + ic('arrow-right') + '</a></header><div class="feed-list" id="feed"></div></aside>' +
          '<section class="panel ov-agents" data-in><header class="panel-h"><h2>Agents</h2><span class="panel-m" id="ov-avail">' + availCount() + ' available</span></header><ul class="ag-list" id="ov-agents">' + ovAgentsHTML() + '</ul></section>' +
          '<section class="panel ov-states" data-in><header class="panel-h"><h2>Top states today</h2><span class="panel-m">By caller’s state</span></header><ul class="sr-list grow" id="ov-states">' + ovStatesHTML() + '</ul></section>' +
        '</div>';
    },
    mount: function () {
      drawChart(true);
      fillFeed();
      if (window.ResizeObserver) {
        var w0 = 0;
        chartRO = new ResizeObserver(function (e) { var w = Math.round(e[0].contentRect.width); if (w0 && w !== w0) drawChart(false); w0 = w; });
        chartRO.observe($('#chart'));
      }
    },
    unmount: function () { if (chartRO) { chartRO.disconnect(); chartRO = null; } },
    onSim: function (type, c) {
      if (type === 'call:new' || type === 'call:update' || type === 'call:done') {
        feedUpdate(type, c);
        refreshKpis();
        $('#ov-sum').textContent = ovSummary();
        if (type !== 'call:update') { drawChart(false); var s = $('#ov-states'); if (s) { s.classList.remove('grow'); s.innerHTML = ovStatesHTML(); } }
      }
      if (type === 'agent:update') { refreshAgentsPanel(); $('#ov-sum').textContent = ovSummary(); }
    }
  };

  /* ==========================================================================
     LIVE CALLS
     ========================================================================== */
  function lcInner(c) {
    var a = c.agentId && D.agent(c.agentId);
    if (c.status === 'ringing') {
      var left = ringLeft(c);
      return '<div class="lc-top"><span class="lc-k lc-k--ring">' + sig(true) + 'Ringing</span><span class="mono lc-left" data-ring-left="' + c.id + '">' + Math.ceil(left) + 's</span></div>' +
        '<div class="lc-t">' + esc(c.city) + ', ' + c.state + '</div>' +
        '<div class="lc-m">' + c.product + '<span class="ev-sep">·</span><span class="mono">' + c.masked + '</span></div>' +
        '<div class="lc-o">' + (c.offeredTo ? 'Offered to ' + plural(c.offeredTo, 'licensed agent') + (c.scripted ? ', including Dana Whitfield' : '') : 'No eligible agent available') + '</div>' +
        '<div class="lc-bar"><i data-ring-bar="' + c.id + '" style="transform:scaleX(' + (left / 40).toFixed(3) + ')"></i></div>';
    }
    if (c.status === 'connected') {
      return '<div class="lc-top"><span class="lc-k lc-k--live"><span class="live-dot"></span>Connected</span><span class="mono lc-dur" data-dur="' + c.id + '">' + dur(liveDur(c)) + '</span></div>' +
        '<div class="lc-t">' + esc(c.city) + ', ' + c.state + '</div>' +
        '<div class="lc-m">' + c.product + '<span class="ev-sep">·</span>Plan ' + c.plan.s + 's · ' + money(c.plan.p) + '</div>' +
        '<div class="lc-a">' + av(a, 22) + '<span><b>' + esc(a.name) + '</b> accepted in ' + c.tta.toFixed(1) + 's</span></div>' +
        '<div class="wave wave--live lc-wave" aria-hidden="true">' + waveBars(34, c.seed) + '</div>';
    }
    if (c.status === 'missed') {
      return '<div class="lc-top"><span class="lc-k lc-k--miss"><i class="dot dot--amber"></i>Missed</span></div>' +
        '<div class="lc-t">' + esc(c.city) + ', ' + c.state + '</div><div class="lc-o">Saved as a Callback Request</div>';
    }
    return '<div class="lc-top"><span class="lc-k"><i class="dot"></i>Ended</span><span class="mono lc-dur">' + dur(c.duration) + '</span></div>' +
      '<div class="lc-t">' + esc(c.city) + ', ' + c.state + '</div><div class="lc-o">' + (c.outcome ? esc(c.outcome) : 'Logging outcome') + '</div>';
  }
  function lcCard(c) { return '<a class="lc lc--' + c.status + '" href="#/calls/' + c.id + '" data-call="' + c.id + '">' + lcInner(c) + '</a>'; }
  var EMPTY_ART = '<div class="empty-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
  function laneCounts() {
    var r = $('#lane-ringing'), c = $('#lane-connected'); if (!r) return;
    var nr = $$('.lc--ringing', r).length, nc = $$('.lc--connected', c).length;
    $('#n-ringing').textContent = nr; $('#n-connected').textContent = nc;
    var empty = !$$('.lc', $('#board')).length;
    $('#board').classList.toggle('is-empty', empty);
    $('#live-sum').innerHTML = '<span class="ph-stat">' + (nr ? sig(true) : sig(false, 'sig--idle')) + plural(nr, 'ringing', 'ringing') + '</span><span class="ph-stat"><span class="live-dot"></span>' + nc + ' connected</span>';
  }
  PAGES.live = {
    render: function () {
      return '<div class="ph" data-in><div><h1 class="pt">Live calls</h1><p class="ps">Each call is offered to every eligible agent at once. The first to accept is connected.</p></div><div class="ph-r" id="live-sum"></div></div>' +
        '<section class="board dots" id="board" data-in>' +
          '<div class="lane lane--ringing"><header class="lane-h"><span class="lane-t">Ringing</span><span class="lane-n tnum" id="n-ringing">0</span><span class="lane-hint">40s to accept</span></header><div class="lane-b" id="lane-ringing"></div></div>' +
          '<div class="lane lane--connected"><header class="lane-h"><span class="lane-t">Connected</span><span class="lane-n tnum" id="n-connected">0</span><span class="lane-hint">Charged when talk time reaches the plan</span></header><div class="lane-b" id="lane-connected"></div></div>' +
          '<div class="board-empty">' + EMPTY_ART + '<p>Waiting for the next call</p><span>Calls appear here the moment they ring.</span></div>' +
        '</section>';
    },
    mount: function () {
      var live = D.liveCalls();
      $('#lane-ringing').innerHTML = live.filter(function (c) { return c.status === 'ringing'; }).map(lcCard).join('');
      $('#lane-connected').innerHTML = live.filter(function (c) { return c.status === 'connected'; }).map(lcCard).join('');
      laneCounts();
    },
    onSim: function (type, c) {
      var board = $('#board'); if (!board || type.indexOf('call:') !== 0) return;
      var card = $('[data-call="' + c.id + '"]', board);
      if (type === 'call:new') {
        flip(board, '.lc', function () { $('#lane-ringing').insertBefore(el(lcCard(c)), $('#lane-ringing').firstChild); laneCounts(); });
        return;
      }
      if (!card) return;
      if (c.status === 'connected' && card.classList.contains('lc--ringing')) {
        flip(board, '.lc', function () {
          card.className = 'lc lc--connected'; card.innerHTML = lcInner(c);
          $('#lane-connected').insertBefore(card, $('#lane-connected').firstChild); laneCounts();
        });
        return;
      }
      if (c.status === 'missed' || c.status === 'wrapup' || c.status === 'completed') {
        if (card._leaving) { card.innerHTML = lcInner(c); return; }
        card._leaving = true;
        card.className = 'lc lc--' + c.status + ' is-leaving'; card.innerHTML = lcInner(c);
        setTimeout(function () {
          if (!card.isConnected) return;
          var go = function () { flip(board, '.lc', function () { card.remove(); laneCounts(); }); };
          if (reduced()) return go();
          card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 320, easing: EASE_IO, fill: 'forwards' }).onfinish = go;
        }, 1800);
      }
    }
  };

  /* ==========================================================================
     CALLS + call drawer
     ========================================================================== */
  var CV = { view: 'all', f: { state: [], product: [], outcome: [] } };
  var VIEWS = [['all', 'All'], ['connected', 'Connected'], ['missed', 'Missed'], ['refund', 'Refund requested']];
  var OUTCOME_KEYS = ['Sale', 'Appointment', 'Follow up', 'Not interested', 'Client hung up', 'Dead air', 'Communication barrier', 'Wrong state', 'Callback Request', 'Live'];
  function inView(c, v) { if (v === 'connected') return D.isConnected(c); if (v === 'missed') return c.status === 'missed'; if (v === 'refund') return !!c.refund; return true; }
  function outcomeKey(c) { if (c.status === 'missed') return 'Callback Request'; if (c.status !== 'completed') return 'Live'; return c.outcome; }
  function passF(c) {
    var f = CV.f;
    if (f.state.length && f.state.indexOf(c.state) < 0) return false;
    if (f.product.length && f.product.indexOf(c.product) < 0) return false;
    if (f.outcome.length && f.outcome.indexOf(outcomeKey(c)) < 0) return false;
    return true;
  }
  function visibleCalls() { return D.calls.filter(function (c) { return inView(c, CV.view) && passF(c); }); }
  function durCell(c) {
    if (c.status === 'connected') return '<span class="live-num" data-dur="' + c.id + '">' + dur(liveDur(c)) + '</span>';
    if (c.status === 'ringing') return '<span class="faint">—</span>';
    if (c.status === 'missed') return '<span class="faint">vm ' + dur(c.vm) + '</span>';
    return dur(c.duration);
  }
  function callRow(c, cls) {
    var a = c.agentId && D.agent(c.agentId);
    var sel = R.drawer && R.drawer.kind === 'call' && R.drawer.id === c.id;
    return '<tr data-id="' + c.id + '" class="' + (sel ? 'is-sel ' : '') + (cls || '') + '" tabindex="0">' +
      '<td class="c-time mono">' + tclock(c.ts) + '</td>' +
      '<td class="c-caller mono">' + c.masked + '</td>' +
      '<td class="c-st">' + st(c.state) + '</td>' +
      '<td class="c-prod">' + c.product + '</td>' +
      '<td class="c-agent">' + (a ? '<span class="cell-ag">' + av(a, 20) + '<span>' + esc(a.name) + '</span></span>' : '<span class="faint">—</span>') + '</td>' +
      '<td class="c-tta r mono">' + (c.tta != null ? c.tta.toFixed(1) + 's' : '<span class="faint">—</span>') + '</td>' +
      '<td class="c-dur r mono">' + durCell(c) + '</td>' +
      '<td class="c-out">' + outcomePill(c) + '</td>' +
      '<td class="c-chg r tnum">' + (c.billed ? money(c.charge) : '<span class="faint">—</span>') + '</td>' +
      '<td class="c-m">' + tclock(c.ts) + ' · ' + c.state + ' · ' + c.product + (a ? ' · ' + esc(a.name) : '') + '</td>' +
    '</tr>';
  }
  function tabsHTML() {
    return VIEWS.map(function (v) {
      var n = D.calls.filter(function (c) { return inView(c, v[0]) && passF(c); }).length;
      return '<button class="tab' + (CV.view === v[0] ? ' is-on' : '') + '" type="button" role="tab" data-view="' + v[0] + '" aria-selected="' + (CV.view === v[0]) + '">' + v[1] + '<span class="tab-n tnum">' + n + '</span></button>';
    }).join('') + '<span class="tabs-ind" aria-hidden="true"></span>';
  }
  function moveTabInd(root) {
    var on = $('.tab.is-on', root), ind = $('.tabs-ind', root); if (!on || !ind) return;
    ind.style.width = on.offsetWidth + 'px'; ind.style.transform = 'translateX(' + on.offsetLeft + 'px)';
  }
  var FILTERS = {
    state: { label: 'State', opts: function () { return D.states.map(function (s) { return [s, s + ' · ' + D.geo[s].name]; }); } },
    product: { label: 'Product', opts: function () { return D.products.map(function (p) { return [p, p]; }); } },
    outcome: { label: 'Outcome', opts: function () { return OUTCOME_KEYS.map(function (o) { return [o, o === 'Live' ? 'Live now' : o]; }); } }
  };
  function chipsHTML() {
    return Object.keys(FILTERS).map(function (k) {
      var v = CV.f[k], on = v.length > 0;
      return '<span class="fchip-w"><button class="fchip' + (on ? ' is-on' : '') + '" type="button" data-f="' + k + '">' + (on ? '' : ic('plus')) + FILTERS[k].label +
        (on ? '<span class="fchip-v">' + (v.length > 2 ? v.length + ' selected' : v.join(', ')) + '</span>' : '') + '</button>' +
        (on ? '<button class="fchip-x" type="button" data-fx="' + k + '" aria-label="Clear ' + FILTERS[k].label + ' filter">' + ic('x') + '</button>' : '') + '</span>';
    }).join('');
  }
  function fillCalls(flashFresh) {
    var body = $('#cv-body'); if (!body) return;
    var list = visibleCalls(), flashed = 0;
    body.innerHTML = list.map(function (c) {
      var f = flashFresh && c.fresh && flashed < 3; if (f) flashed++;
      return callRow(c, f ? 'is-new' : '');
    }).join('');
    D.calls.forEach(function (c) { c.fresh = false; });
    $('#cv-empty').hidden = list.length > 0;
    $('#cv-n').textContent = plural(list.length, 'call');
  }
  function refreshCallsChrome() {
    var t = $('#cv-tabs'); if (t) { t.innerHTML = tabsHTML(); moveTabInd(t); }
    var f = $('#cv-chips'); if (f) f.innerHTML = chipsHTML();
  }
  function openFilterMenu(btn, key) {
    var had = $('#fmenu-' + key); closeMenus(); if (had) return;
    var F = FILTERS[key];
    var m = el('<div class="menu fmenu" id="fmenu-' + key + '" role="menu">' + F.opts().map(function (o) {
      var on = CV.f[key].indexOf(o[0]) >= 0;
      return '<button class="menu-i' + (on ? ' is-on' : '') + '" type="button" data-v="' + esc(o[0]) + '"><span class="ckb">' + ic('check') + '</span><span>' + esc(o[1]) + '</span></button>';
    }).join('') + '</div>');
    btn.parentNode.appendChild(m);
    requestAnimationFrame(function () { m.classList.add('open'); });
    m.addEventListener('click', function (e) {
      e.stopPropagation();
      var it = e.target.closest('.menu-i'); if (!it) return;
      var v = it.getAttribute('data-v'), arr = CV.f[key], i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      it.classList.toggle('is-on', i < 0);
      fillCalls(false); var t = $('#cv-tabs'); t.innerHTML = tabsHTML(); moveTabInd(t);
      // re-render the chip labels but keep this menu open under its chip
      $('#cv-chips').innerHTML = chipsHTML();
      $('[data-f="' + key + '"]', $('#cv-chips')).parentNode.appendChild(m);
    });
  }

  /* Recording players */
  var players = [];
  function stopPlayers() { players.forEach(function (p) { p.stop(); }); players = []; }
  function playerHTML(total, seed, n, cls) {
    return '<div class="player ' + (cls || '') + '" data-total="' + total + '"><button class="pl-btn" type="button" aria-label="Play">' + ic('play') + '</button>' +
      '<div class="wave pl-wave">' + waveBars(n || 64, seed) + '</div><span class="pl-t mono">' + (cls === 'player--mini' ? dur(total) : '0:00 / ' + dur(total)) + '</span></div>';
  }
  function bindPlayer(root) {
    var total = +root.getAttribute('data-total'), btn = $('.pl-btn', root), bars = $$('.wave i', root), t = $('.pl-t', root);
    var mini = root.classList.contains('player--mini');
    var pos = 0, playing = false, last = 0, raf = 0;
    function draw() {
      var n = Math.round(pos / total * bars.length);
      bars.forEach(function (b, i) { b.classList.toggle('on', i < n); });
      t.textContent = mini ? (playing || pos > 0 ? dur(pos) : dur(total)) : dur(pos) + ' / ' + dur(total);
    }
    function step(ts) { if (!playing) return; pos += (ts - last) / 1000; last = ts; if (pos >= total) { pos = total; draw(); stop(); return; } draw(); raf = requestAnimationFrame(step); }
    function play() { players.forEach(function (p) { if (p !== api) p.stop(); }); if (pos >= total) pos = 0; playing = true; last = performance.now(); btn.innerHTML = ic('pause'); btn.setAttribute('aria-label', 'Pause'); root.classList.add('is-playing'); raf = requestAnimationFrame(step); }
    function stop() { playing = false; cancelAnimationFrame(raf); btn.innerHTML = ic('play'); btn.setAttribute('aria-label', 'Play'); root.classList.remove('is-playing'); }
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (playing) stop(); else play(); });
    $('.wave', root).addEventListener('click', function (e) {
      e.stopPropagation();
      var r = this.getBoundingClientRect(); pos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total; draw();
      if (!playing) play();
    });
    var api = { stop: stop }; players.push(api); draw();
    return api;
  }

  function outcomeText(c) {
    if (c.outcome === 'Appointment') return 'Appointment' + (c.appt ? ', ' + c.appt : '');
    if (c.outcome === 'Sale') return 'Sale' + (c.premium != null ? ' · ' + money(c.premium) + '/mo premium' : '');
    return c.outcome;
  }
  function timelineHTML(c) {
    var a = c.agentId && D.agent(c.agentId), L = [];
    L.push({ t: c.ts, k: 'Received', d: 'On ' + c.line.label + ' · ' + c.line.number });
    L.push({ t: c.ts + 400, k: 'State detected (' + c.state + ')', d: esc(c.city) + ', ' + D.geo[c.state].name });
    if (c.missReason) L.push({ t: c.ts + 700, k: 'Not offered', d: 'Routing was paused' });
    else if (c.offeredTo) L.push({ t: c.ts + 700, k: 'Offered to ' + plural(c.offeredTo, 'agent'), d: 'Every eligible agent at once' });
    else L.push({ t: c.ts + 700, k: 'No eligible agent available', d: 'Nobody licensed for ' + c.state + ' was free with enough wallet balance' });
    if (c.status === 'ringing') L.push({ k: 'Ringing', d: '<span data-ring-left="' + c.id + '">' + Math.ceil(ringLeft(c)) + 's</span> left to accept', tone: 'blue', live: true });
    if (a) {
      L.push({ t: c.acceptedAt, k: 'Accepted by ' + esc(a.name) + ' · ' + c.tta.toFixed(1) + 's', d: 'Plan ' + c.plan.s + 's · ' + money(c.plan.p) });
      if (c.status === 'connected') L.push({ t: c.connectedAt, k: 'Connected · <span class="mono" data-dur="' + c.id + '">' + dur(liveDur(c)) + '</span>', d: 'Recording both sides', tone: 'green', live: true });
      else L.push({ t: c.connectedAt, k: 'Connected', d: 'Recorded on both sides' });
      if (c.status === 'wrapup' || c.status === 'completed') L.push({ t: c.endedAt, k: 'Ended ' + dur(c.duration) });
      if (c.status === 'wrapup') L.push({ k: 'Logging outcome', d: esc(a.first) + ' is choosing an outcome', live: true });
      if (c.status === 'completed') {
        L.push({ k: 'Outcome: ' + esc(outcomeText(c)), d: c.outcome === 'Appointment' && c.gcal ? 'Added to Google Calendar' : '', tone: (c.outcome === 'Sale' || c.outcome === 'Appointment') ? 'green' : '' });
        if (c.billed) L.push({ k: 'Billed', d: money(c.charge) + ' acceptance plan' + (c.recovered ? ' · contact recovered' : '') + (c.fee ? ' · ' + money(c.fee) + ' connection fee' : '') });
        else L.push({ k: 'Not billed', d: 'Ended before the ' + c.plan.s + 's plan' });
        if (c.refund) L.push({ t: c.refund.at, k: c.refund.status === 'requested' ? 'Refund requested' : c.refund.status === 'approved' ? 'Refund approved' : 'Refund declined', d: esc(c.refund.reason), tone: 'red' });
      }
    }
    if (c.status === 'missed') {
      if (!c.missReason) L.push({ t: c.ts + 40000, k: 'No one accepted within 40s' });
      L.push({ k: 'Voicemail left · ' + dur(c.vm) });
      var cb = D.callbackFor(c.id);
      L.push({ k: 'Saved as a Callback Request', d: cb ? 'Listed at ' + money(D.cbPrice(cb)) + ' · 0–7 days' : '', tone: 'amber' });
    }
    return '<ol class="tl">' + L.map(function (s, i) {
      return '<li class="tl-i' + (s.tone ? ' tl-i--' + s.tone : '') + (s.live ? ' is-live' : '') + '" style="--d:' + (i * 40) + 'ms"><span class="tl-dot"></span><div class="tl-c"><b>' + s.k + '</b>' + (s.d ? '<span>' + s.d + '</span>' : '') + '</div>' +
        (s.t ? '<time class="mono">' + tclock(s.t, true) + '</time>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function chargesHTML(c) {
    var a = c.agentId && D.agent(c.agentId), ag = D.agency.name;
    if (c.status === 'missed') return '<p class="dr-p">No charges. Calls that no one accepts are not billed.</p>';
    if (c.status === 'ringing') return '<p class="dr-p">Nothing yet. The agent who accepts picks a plan, and is charged only if talk time reaches it.</p>';
    var rows = '';
    if (c.billed) rows += '<div class="chg-r"><div><b>Acceptance plan · ' + c.plan.s + 's</b><span>Paid by ' + esc(a.name) + ' to ' + ag + '</span></div><span class="tnum">' + money(c.charge) + '</span></div>';
    else if (c.status === 'completed') rows += '<div class="chg-r"><div><b>Acceptance plan · ' + c.plan.s + 's</b><span>Not charged. Ended at ' + dur(c.duration) + ', before ' + c.plan.s + 's. ' + esc(a.first) + ' can recover the contact for ' + money(c.plan.p) + ' until midnight.</span></div><span class="faint">$0.00</span></div>';
    else rows += '<div class="chg-r"><div><b>Acceptance plan · ' + c.plan.s + 's</b><span>Charged to ' + esc(a.name) + ' if talk time reaches ' + c.plan.s + 's</span></div><span class="faint tnum">' + money(c.plan.p) + '</span></div>';
    if (c.fee) rows += '<div class="chg-r"><div><b>Connection fee</b><span>Paid by ' + ag + ' to Inbound Select</span></div><span class="tnum">' + money(c.fee) + '</span></div>';
    else if (c.status !== 'completed') rows += '<div class="chg-r"><div><b>Connection fee</b><span>Paid by ' + ag + ' to Inbound Select once the call passes 15s</span></div><span class="faint tnum">$2.50</span></div>';
    return '<div class="chg">' + rows + '</div>';
  }
  function refundHTML(c) {
    if (!c.refund) return '';
    var r = c.refund, a = D.agent(c.agentId);
    if (r.status !== 'requested') return '<div class="rf rf--done"><span class="pill ' + (r.status === 'approved' ? 'pill--red' : '') + '">' + (r.status === 'approved' ? 'Refund approved' : 'Refund declined') + '</span><span class="faint">' + (r.status === 'approved' ? money(c.charge) + ' returned to ' + esc(a.first) + '’s wallet' : 'The charge stands') + '</span></div>';
    return '<div class="rf"><div class="rf-h"><span class="pill pill--red">Refund requested</span><span class="mono rf-left" data-refund-left="' + c.id + '">' + refundLeft(c) + '</span></div>' +
      '<p class="rf-q">“' + esc(r.reason) + '”</p><span class="rf-by">' + esc(a.name) + ' · ' + money(c.charge) + ' · requested ' + tclock(r.at) + '</span>' +
      '<div class="rf-a"><button class="btn btn--ghost btn--sm" type="button" data-refund="decline" data-id="' + c.id + '">Decline</button><button class="btn btn--sm" type="button" data-refund="approve" data-id="' + c.id + '">Approve refund</button></div></div>';
  }
  function refundLeft(c) {
    var ms = c.refund.at + 48 * 3600e3 - now(); if (ms <= 0) return 'Window closed';
    var h = Math.floor(ms / 3600e3), m = Math.floor(ms % 3600e3 / 60e3);
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm left';
  }
  function callDrawerHTML(c) {
    var a = c.agentId && D.agent(c.agentId);
    var rec = c.status === 'completed' || c.status === 'wrapup' ? playerHTML(c.duration, c.seed, 64) :
      c.status === 'missed' ? playerHTML(c.vm, c.seed, 64) :
      c.status === 'connected' ? '<div class="player player--live"><span class="live-dot"></span><div class="wave wave--live pl-wave">' + waveBars(64, c.seed) + '</div><span class="pl-t mono" data-dur="' + c.id + '">' + dur(liveDur(c)) + '</span></div>' :
      '<p class="dr-p">Recording starts when an agent accepts.</p>';
    var numHTML = c.billed ? '<b class="mono">' + c.unlocked + '</b><span class="faint">' + ic('unlock') + 'Unlocked</span>'
      : '<b class="mono">' + c.masked + '</b><span class="faint">' + ic('lock') + 'Hidden until billed</span>';
    return '<header class="dr-h"><div class="dr-h-l"><span class="mono dr-id">' + c.id + '</span>' + outcomePill(c) + '</div><button class="icon-btn" type="button" data-close-drawer aria-label="Close">' + ic('x') + '</button></header>' +
      '<div class="dr-body">' +
        '<div class="dr-hero"><h2 class="dr-t">' + esc(c.caller) + '</h2><p class="dr-s">' + esc(c.city) + ', ' + c.state + '<span class="ev-sep">·</span>' + c.product + '<span class="ev-sep">·</span>' + when(c.ts) + '</p></div>' +
        refundHTML(c) +
        '<section class="dr-sec"><h3 class="dr-h3">Timeline</h3>' + timelineHTML(c) + '</section>' +
        '<section class="dr-sec"><h3 class="dr-h3">' + (c.status === 'missed' ? 'Voicemail' : 'Recording') + '</h3>' + rec + '</section>' +
        '<section class="dr-sec"><h3 class="dr-h3">Charges</h3>' + chargesHTML(c) + '</section>' +
        '<section class="dr-sec"><h3 class="dr-h3">Caller</h3><div class="kv"><span>Name</span><b>' + esc(c.caller) + '</b></div><div class="kv"><span>Number</span><span class="kv-v">' + numHTML + '</span></div>' +
          '<div class="kv"><span>Line</span><b>' + c.line.label + '</b></div></section>' +
        '<section class="dr-sec"><h3 class="dr-h3">Notes</h3>' + (c.notes ? '<p class="note-q">' + esc(c.notes) + '</p><span class="note-by">' + (a ? esc(a.name) + ' · ' : '') + tclock(c.endedAt || c.ts) + '</span>' : '<p class="dr-p faint">No notes yet.</p>') + '</section>' +
      '</div>';
  }
  function bindDrawerCommon() {
    $$('.player', drawer).forEach(function (p) { if (!p.classList.contains('player--live')) bindPlayer(p); });
    $$('[data-copy]', drawer).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-copy');
        try { navigator.clipboard.writeText(v); } catch (e) {}
        b.innerHTML = ic('check') + 'Copied'; setTimeout(function () { b.innerHTML = ic('copy') + 'Copy'; }, 1400);
      });
    });
    $$('[data-refund]', drawer).forEach(bindRefundBtn);
  }
  function bindRefundBtn(b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var c = D.call(b.getAttribute('data-id')), ok = b.getAttribute('data-refund') === 'approve';
      S.refund(c, ok);
      toast(ok ? 'Refund approved · ' + money(c.charge) + ' back to ' + agentName(c.agentId) : 'Refund declined for ' + c.id, ok ? 'green' : 'grey');
    });
  }
  function openCallDrawer(id) {
    var c = D.call(id);
    if (!c) { location.hash = '#/calls'; return; }
    stopPlayers();
    openDrawer(callDrawerHTML(c), 'call', id);
    R.drawer.status = c.status + (c.refund ? c.refund.status : '') + (c.billed ? 'b' : '');
    bindDrawerCommon();
    $$('#cv-body tr').forEach(function (tr) { tr.classList.toggle('is-sel', tr.getAttribute('data-id') === id); });
  }
  function refreshCallDrawer(c) {
    if (!R.drawer || R.drawer.kind !== 'call' || R.drawer.id !== c.id) return;
    var sig2 = c.status + (c.refund ? c.refund.status : '') + (c.billed ? 'b' : '');
    if (sig2 === R.drawer.status) return;
    var sc = $('.dr-body', drawer) ? $('.dr-body', drawer).scrollTop : 0;
    stopPlayers();
    drawer.innerHTML = callDrawerHTML(c);
    $$('[data-close-drawer]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawerNav); });
    $$('.tl-i', drawer).forEach(function (n) { n.style.animation = 'none'; });
    $('.dr-body', drawer).scrollTop = sc;
    R.drawer.status = sig2;
    bindDrawerCommon();
  }

  PAGES.calls = {
    render: function () {
      return '<div class="ph" data-in><div><h1 class="pt">Calls</h1><p class="ps">Every call today, newest first. Select one for its timeline, recording and charges.</p></div></div>' +
        '<div class="tabs" id="cv-tabs" role="tablist" data-in>' + tabsHTML() + '</div>' +
        '<div class="filters" data-in><div class="fchips" id="cv-chips">' + chipsHTML() + '</div><span class="flt-n" id="cv-n"></span></div>' +
        '<div class="tbl-wrap" data-in><table class="tbl tbl--calls"><thead><tr><th>Time</th><th>Caller</th><th>State</th><th>Product</th><th>Agent</th><th class="r">Time to accept</th><th class="r">Duration</th><th>Outcome</th><th class="r">Charge</th></tr></thead>' +
        '<tbody id="cv-body"></tbody></table><div class="tbl-empty" id="cv-empty" hidden>' + EMPTY_ART + '<p>No calls match these filters</p><button class="lnk" type="button" id="cv-clear">Clear filters</button></div></div>';
    },
    mount: function () {
      fillCalls(true);
      var tabs = $('#cv-tabs');
      requestAnimationFrame(function () { moveTabInd(tabs); });
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('.tab'); if (!b) return;
        CV.view = b.getAttribute('data-view');
        $$('.tab', tabs).forEach(function (t) { var on = t === b; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
        moveTabInd(tabs); fillCalls(false);
      });
      $('#cv-chips').addEventListener('click', function (e) {
        var x = e.target.closest('[data-fx]');
        if (x) { CV.f[x.getAttribute('data-fx')] = []; closeMenus(); fillCalls(false); refreshCallsChrome(); return; }
        var b = e.target.closest('[data-f]'); if (b) { e.stopPropagation(); openFilterMenu(b, b.getAttribute('data-f')); }
      });
      $('#cv-clear').addEventListener('click', function () { CV.f = { state: [], product: [], outcome: [] }; CV.view = 'all'; fillCalls(false); refreshCallsChrome(); });
      $('#cv-body').addEventListener('click', function (e) { var tr = e.target.closest('tr[data-id]'); if (tr) location.hash = '#/calls/' + tr.getAttribute('data-id'); });
      $('#cv-body').addEventListener('keydown', function (e) { if (e.key === 'Enter') { var tr = e.target.closest('tr[data-id]'); if (tr) location.hash = '#/calls/' + tr.getAttribute('data-id'); } });
    },
    param: function (id) { if (id) openCallDrawer(id); else if (R.drawer) closeDrawer(); },
    onSim: function (type, c) {
      if (type.indexOf('call:') !== 0) return;
      var body = $('#cv-body'); if (!body) return;
      var row = $('tr[data-id="' + c.id + '"]', body), show = inView(c, CV.view) && passF(c);
      if (type === 'call:new') {
        if (show) { body.insertBefore(el('<table><tbody>' + callRow(c, 'is-new') + '</tbody></table>').querySelector('tr'), body.firstChild); c.fresh = false; }
      } else if (row && show) {
        var nr = el('<table><tbody>' + callRow(c) + '</tbody></table>').querySelector('tr'); row.replaceWith(nr);
        if (type === 'call:done') { nr.classList.add('is-upd'); c.fresh = false; }
      } else if (row && !show) row.remove();
      else if (!row && show) { fillCalls(false); }
      var t = $('#cv-tabs'); if (t) { $$('.tab', t).forEach(function (b) { var v = b.getAttribute('data-view'); $('.tab-n', b).textContent = D.calls.filter(function (x) { return inView(x, v) && passF(x); }).length; }); }
      var list = visibleCalls(); $('#cv-n').textContent = plural(list.length, 'call'); $('#cv-empty').hidden = list.length > 0;
    }
  };

  /* ==========================================================================
     AGENTS + agent drawer + invite modal
     ========================================================================== */
  function statesChips(states, max) {
    var shown = states.slice(0, max), more = states.length - shown.length;
    return '<span class="chips">' + shown.map(st).join('') + (more > 0 ? '<span class="more">+' + more + '</span>' : '') + '</span>';
  }
  function agentRow(a) {
    var s = statusOf(a), stt = D.agentStats(a.id), cur = a.currentCall && D.call(a.currentCall), low = walletLow(a);
    var sel = R.drawer && R.drawer.kind === 'agent' && R.drawer.id === a.id;
    return '<tr data-id="' + a.id + '" tabindex="0"' + (sel ? ' class="is-sel"' : '') + '>' +
      '<td class="a-name"><span class="cell-ag">' + av(a, 28) + '<span class="a-who"><b>' + esc(a.name) + '</b><span>' + a.email + '</span></span></span></td>' +
      '<td class="a-status"><span class="a-st"><label class="switch" data-stop title="' + (s.k === 'oncall' ? 'On a call' : 'Toggle availability') + '"><input type="checkbox" data-avail="' + a.id + '"' + (s.k !== 'offline' ? ' checked' : '') + (s.k === 'oncall' ? ' disabled' : '') + '><i></i></label>' +
        '<span class="a-sl a-sl--' + s.k + '">' + s.l + (s.k === 'oncall' && cur && cur.connectedAt ? ' · <span class="mono" data-dur="' + cur.id + '">' + dur(liveDur(cur)) + '</span>' : '') + '</span></span></td>' +
      '<td class="a-states">' + statesChips(a.states, 3) + '</td>' +
      '<td class="a-prod">' + a.products.join(', ') + '</td>' +
      '<td class="r a-wallet tnum' + (low ? ' is-low' : '') + '">' + (low ? '<span class="low-tag">Low</span>' : '') + money(a.wallet) + '</td>' +
      '<td class="r tnum">' + stt.calls + '</td>' +
      '<td class="r tnum">' + Math.round(a.acceptRate * 100) + '%</td>' +
      '<td class="r mono a-last">' + (stt.last ? tclock(stt.last.ts) : '<span class="faint">—</span>') + '</td>' +
      '<td class="a-m">' + a.states.join(' ') + ' · ' + plural(stt.calls, 'call') + ' today</td>' +
    '</tr>';
  }
  function agentsSummary() {
    var c = { available: 0, oncall: 0, offline: 0 }; D.agents.forEach(function (a) { c[statusOf(a).k]++; });
    return plural(D.agents.length, 'licensed agent') + ': ' + c.available + ' available, ' + c.oncall + ' on a call, ' + c.offline + ' offline.';
  }
  function agentDrawerHTML(a) {
    var s = statusOf(a), stt = D.agentStats(a.id), low = walletLow(a);
    var mine = D.calls.filter(function (c) { return c.agentId === a.id; }).slice(0, 6);
    var plans = Object.keys(stt.plans).sort(), pmax = 1; plans.forEach(function (k) { pmax = Math.max(pmax, stt.plans[k]); });
    var need = Math.min.apply(null, a.products.map(D.minPlan)) + 10;
    return '<header class="dr-h"><div class="dr-h-l"><span class="ag-s ag-s--' + s.k + '"><i class="sdot sdot--' + s.k + '"></i>' + s.l + '</span></div><button class="icon-btn" type="button" data-close-drawer aria-label="Close">' + ic('x') + '</button></header>' +
      '<div class="dr-body">' +
        '<div class="dr-hero dr-hero--agent">' + av(a, 48) + '<div><h2 class="dr-t">' + esc(a.name) + '</h2><p class="dr-s">Licensed agent<span class="ev-sep">·</span>Joined ' + a.joined + '</p><p class="dr-s dr-s--2">' + a.email + '</p></div></div>' +
        '<div class="dr-stats"><div><span>Calls today</span><b class="tnum">' + stt.calls + '</b></div><div><span>Accept rate</span><b class="tnum">' + Math.round(a.acceptRate * 100) + '%</b></div>' +
          '<div' + (low ? ' class="is-low"' : '') + '><span>Wallet</span><b class="tnum">' + money(a.wallet) + '</b></div></div>' +
        (a.wallet < need ? '<p class="dr-warn">' + ic('info') + 'Wallet is below the lowest plan plus the $10 buffer, so ' + esc(a.first) + ' isn’t being offered calls.</p>' : low ? '<p class="dr-warn">' + ic('info') + 'Wallet is running low. ' + esc(a.first) + ' is offered calls while it covers a plan plus $10.</p>' : '') +
        '<section class="dr-sec"><h3 class="dr-h3">Licensed states</h3>' + statesChips(a.states, 99) + '<p class="dr-p faint">Calls are offered only from these states.</p></section>' +
        '<section class="dr-sec"><h3 class="dr-h3">Products</h3><div class="chips">' + a.products.map(function (p) { return '<span class="tag">' + p + '</span>'; }).join('') + '</div></section>' +
        '<section class="dr-sec"><h3 class="dr-h3">Acceptance plans today</h3>' + (plans.length ? '<ul class="pl-use">' + plans.map(function (k) {
          var q = k.split('|');
          return '<li><span class="pl-k"><b class="mono">' + q[1] + 's · $' + q[2] + '</b><span>' + q[0] + '</span></span><span class="sr-bar"><i style="--w:' + (stt.plans[k] / pmax).toFixed(3) + '"></i></span><span class="tnum">' + plural(stt.plans[k], 'call') + '</span></li>';
        }).join('') + '</ul>' : '<p class="dr-p faint">No calls yet today.</p>') + '</section>' +
        '<section class="dr-sec"><h3 class="dr-h3">Recent calls</h3>' + (mine.length ? '<ul class="mini-calls">' + mine.map(function (c) {
          return '<li><a href="#/calls/' + c.id + '"><span class="mono faint">' + tclock(c.ts) + '</span><span class="mc-t">' + esc(c.city) + ', ' + c.state + '</span>' + outcomePill(c) + '<span class="tnum mc-c">' + (c.billed ? money(c.charge) : '—') + '</span></a></li>';
        }).join('') + '</ul>' : '<p class="dr-p faint">No calls yet today.</p>') + '</section>' +
        '<section class="dr-sec"><h3 class="dr-h3">Account</h3><div class="kv"><span>Approval</span><b>Approved</b></div><div class="kv"><span>Subscription</span><b>Active</b></div><div class="kv"><span>Payments</span><b>Card on file · Stripe</b></div></section>' +
      '</div>';
  }
  function openAgentDrawer(id) {
    var a = D.agent(id); if (!a) { location.hash = '#/agents'; return; }
    openDrawer(agentDrawerHTML(a), 'agent', id);
    $$('#ag-body tr').forEach(function (tr) { tr.classList.toggle('is-sel', tr.getAttribute('data-id') === id); });
  }
  function fillAgents() { var b = $('#ag-body'); if (b) b.innerHTML = D.agents.map(agentRow).join(''); }
  function inviteModal() {
    var m = openModal(
      '<header class="modal-h"><h2>Invite an agent</h2><p>They’ll get an email to join ' + D.agency.name + ', add a card and fund their wallet.</p></header>' +
      '<div class="modal-b">' +
        '<div class="field-row"><label class="field"><span>Full name</span><input class="input" id="inv-name" placeholder="Jordan Ellis" autocomplete="off"></label>' +
        '<label class="field"><span>Email</span><input class="input" id="inv-email" type="email" placeholder="jordan@lakeshoresb.com" autocomplete="off"></label></div>' +
        '<div class="field"><span>Licensed states</span><div class="tog-chips" id="inv-states">' + D.states.map(function (s) { return '<button type="button" class="tchip" data-v="' + s + '">' + s + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><span>Products</span><div class="tog-chips" id="inv-prod">' + D.products.map(function (p, i) { return '<button type="button" class="tchip' + (i === 0 ? ' is-on' : '') + '" data-v="' + p + '">' + p + '</button>'; }).join('') + '</div></div>' +
        '<p class="modal-note">' + ic('info') + 'You have ' + D.agents.length + ' agents. Agents 11–50 are $15 each per month, so this invite adds $15/mo once they join.</p>' +
      '</div>' +
      '<footer class="modal-f"><button class="btn btn--ghost btn--sm" type="button" data-close-modal>Cancel</button><button class="btn btn--blue btn--sm" type="button" id="inv-send">' + ic('mail') + 'Send invite</button></footer>',
      { label: 'Invite an agent', cls: 'modal--sm' });
    $$('.tchip', m).forEach(function (b) { b.addEventListener('click', function () { b.classList.toggle('is-on'); }); });
    setTimeout(function () { var i = $('#inv-name'); if (i) i.focus(); }, 80);
    $('#inv-send', m).addEventListener('click', function () {
      var email = $('#inv-email').value.trim(), name = $('#inv-name').value.trim();
      if (!/.+@.+\..+/.test(email)) { var f = $('#inv-email'); f.classList.add('is-err'); f.focus(); setTimeout(function () { f.classList.remove('is-err'); }, 1200); return; }
      closeModal(); toast('Invite sent to ' + esc(name || email), 'blue');
    });
  }
  PAGES.agents = {
    render: function () {
      return '<div class="ph" data-in><div><h1 class="pt">Agents</h1><p class="ps" id="ag-sum">' + agentsSummary() + '</p></div><button class="btn btn--sm btn--ink" type="button" id="invite-btn">' + ic('plus') + 'Invite agent</button></div>' +
        '<div class="tbl-wrap" data-in><table class="tbl tbl--agents"><thead><tr><th>Agent</th><th>Availability</th><th>Licensed states</th><th>Products</th><th class="r">Wallet</th><th class="r">Calls today</th><th class="r">Accept rate</th><th class="r">Last call</th></tr></thead><tbody id="ag-body"></tbody></table></div>' +
        '<p class="foot-note" data-in>' + ic('info') + 'Agents are offered a call when they are available, approved, licensed in the caller’s state, subscribed, and their wallet covers the plan plus $10.</p>';
    },
    mount: function () {
      fillAgents();
      $('#invite-btn').addEventListener('click', inviteModal);
      var body = $('#ag-body');
      body.addEventListener('click', function (e) {
        if (e.target.closest('[data-stop]')) return;
        var tr = e.target.closest('tr[data-id]'); if (tr) location.hash = '#/agents/' + tr.getAttribute('data-id');
      });
      body.addEventListener('change', function (e) {
        var i = e.target.closest('[data-avail]'); if (!i) return;
        S.setStatus(i.getAttribute('data-avail'), i.checked ? 'available' : 'offline');
      });
      body.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var tr = e.target.closest('tr[data-id]'); if (tr) location.hash = '#/agents/' + tr.getAttribute('data-id'); } });
    },
    param: function (id) { if (id) openAgentDrawer(id); else if (R.drawer) closeDrawer(); },
    onSim: function (type, c) {
      if (type === 'agent:update' || type === 'call:done') {
        var a = type === 'agent:update' ? c : D.agent(c.agentId);
        if (a) { var row = $('#ag-body tr[data-id="' + a.id + '"]'); if (row) { var nr = el('<table><tbody>' + agentRow(a) + '</tbody></table>').querySelector('tr'); row.replaceWith(nr); } }
        $('#ag-sum').textContent = agentsSummary();
        if (a && R.drawer && R.drawer.kind === 'agent' && R.drawer.id === a.id) {
          var sc = $('.dr-body', drawer).scrollTop; drawer.innerHTML = agentDrawerHTML(a);
          $$('[data-close-drawer]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawerNav); }); $('.dr-body', drawer).scrollTop = sc;
        }
      }
    }
  };

  /* ==========================================================================
     CALLBACK REQUESTS
     ========================================================================== */
  function cbRow(cb) {
    var days = D.cbDays(cb), a = days <= 7;
    return '<li class="cb' + (cb.fresh ? ' is-new' : '') + '" data-cb="' + cb.id + '">' +
      playerHTML(cb.vm, cb.seed, 26, 'player--mini') +
      '<div class="cb-main"><div class="cb-t">' + esc(cb.city) + ', ' + cb.state + '<span class="ev-sep">·</span>' + cb.product + '</div>' +
        '<div class="cb-m"><span class="age age--' + (a ? 'a' : 'b') + '">' + (a ? '0–7 days' : '8–30 days') + '</span><span>' + (days === 0 ? 'Today, ' + tclock(cb.ts) : plural(days, 'day') + ' ago') + '</span></div></div>' +
      '<span class="cb-price tnum">' + money(D.cbPrice(cb)) + '</span>' +
      '<span class="cb-status">' + (cb.status === 'sold' ? '<span class="pill pill--green">Sold to ' + esc(cb.soldTo) + '</span>' : '<span class="pill pill--blue">Listed</span>') + '</span>' +
    '</li>';
  }
  function cbStats() {
    var listed = 0, sold = 0, share = 0;
    D.callbacks.forEach(function (cb) { if (cb.status === 'sold') { sold++; share += D.cbPrice(cb) * .75; } else listed++; });
    return { listed: listed, sold: sold, share: share };
  }
  function fillCallbacks() {
    var l = $('#cb-list'); if (!l) return;
    stopPlayers();
    l.innerHTML = D.callbacks.map(cbRow).join('');
    D.callbacks.forEach(function (cb) { cb.fresh = false; });
    $$('.player', l).forEach(bindPlayer);
    var s = cbStats();
    $('#cb-meta').textContent = s.listed + ' listed · ' + s.sold + ' sold';
    $('#cb-share').textContent = money(s.share);
    $('#cb-sold').textContent = s.sold;
  }
  function pricingHTML() {
    var P = D.cbPrices;
    return '<table class="ptbl"><thead><tr><th></th><th>0–7 days</th><th>8–30 days</th></tr></thead><tbody>' + D.products.map(function (p) {
      return '<tr><th>' + p + '</th>' + ['a', 'b'].map(function (k) {
        return '<td><span class="money-in"><span>$</span><input inputmode="decimal" data-price="' + p + '|' + k + '" value="' + P[p][k].toFixed(2) + '" aria-label="' + p + ' ' + (k === 'a' ? '0–7 days' : '8–30 days') + ' price"></span></td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  PAGES.callbacks = {
    render: function () {
      return '<div class="ph" data-in><div><h1 class="pt">Callback Requests</h1><p class="ps">Voicemails from callers no one could take in time. Your agents can buy one and call the person back.</p></div></div>' +
        '<div class="note" data-in>' + ic('info') + '<p>Listings come off the board at 90 days. When one of your agents buys a listing, the sale stays inside your agency: <b>75% to you</b>, 25% to the platform.</p></div>' +
        '<div class="cb-grid">' +
          '<section class="panel cb-panel" data-in><header class="panel-h"><h2>Listings</h2><span class="panel-m" id="cb-meta"></span></header><ul class="cb-list" id="cb-list"></ul></section>' +
          '<aside class="cb-side">' +
            '<section class="panel" data-in><header class="panel-h"><h2>Pricing by age</h2><span class="panel-m">Illustrative</span></header><div class="panel-b">' + pricingHTML() +
              '<p class="panel-note">Agents see the price before they buy. Prices drop as a voicemail ages.</p></div></section>' +
            '<section class="panel cb-earn" data-in><div class="panel-b"><div class="stat2"><span>Sold this month</span><b class="tnum" id="cb-sold">0</b></div><div class="stat2"><span>Your share (75%)</span><b class="tnum" id="cb-share">$0.00</b></div></div></section>' +
          '</aside>' +
        '</div>';
    },
    mount: function () {
      fillCallbacks();
      $$('[data-price]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var k = inp.getAttribute('data-price').split('|'), v = parseFloat(inp.value.replace(/[^0-9.]/g, ''));
          if (isNaN(v) || v < 0) v = D.cbPrices[k[0]][k[1]];
          D.cbPrices[k[0]][k[1]] = Math.round(v * 100) / 100; inp.value = D.cbPrices[k[0]][k[1]].toFixed(2);
          $$('.cb', $('#cb-list')).forEach(function (row) {
            var cb = D.callbacks.filter(function (x) { return x.id === row.getAttribute('data-cb'); })[0];
            if (cb) $('.cb-price', row).textContent = money(D.cbPrice(cb));
          });
          var s = cbStats(); $('#cb-share').textContent = money(s.share);
          toast('Callback pricing updated', 'blue');
        });
      });
    },
    unmount: function () { stopPlayers(); },
    onSim: function (type, cb) {
      if (type !== 'callback:new') return;
      var l = $('#cb-list'); if (!l) return;
      var row = el(cbRow(cb)); cb.fresh = false;
      flip(l, '.cb', function () { l.insertBefore(row, l.firstChild); });
      bindPlayer($('.player', row));
      var s = cbStats(); $('#cb-meta').textContent = s.listed + ' listed · ' + s.sold + ' sold';
    }
  };

  /* ==========================================================================
     BILLING
     ========================================================================== */
  var BV = { tab: 'items', all: false };
  function balanceHTML() {
    var B = D.billing, pct = Math.min(1, B.balance / B.threshold);
    return '<div class="card-top"><span class="kpi-l">Connection fees · balance</span><span class="pill pill--blue no-dot">Open</span></div>' +
      '<div class="big-v tnum" id="bal-v" data-val="' + B.balance + '">' + money(B.balance) + '</div>' +
      '<div class="meter"><i style="transform:scaleX(' + pct.toFixed(3) + ')"></i></div>' +
      '<div class="meter-l"><span>' + money(B.threshold - B.balance) + ' until it’s collected at ' + money0(B.threshold) + '</span><span>or on Monday</span></div>' +
      '<div class="bal-stats"><div><span>Connected calls this week</span><b class="tnum">' + B.weekCount + '</b></div><div><span>Fees this week</span><b class="tnum">' + money(B.weekCount * 2.5) + '</b></div></div>' +
      '<div class="card-f"><span>$2.50 per connected call (15s or more)</span><span>' + D.agency.card + '</span></div>';
  }
  function planHTML() {
    var P = D.billing.plan, seats = D.agents.length, extra = Math.max(0, seats - P.included), next = P.price + extra * P.perSeat;
    var nextDate = new Date(D.dayStart); nextDate.setMonth(nextDate.getMonth() + 1, 1);
    var ticks = ''; for (var i = 0; i < P.seatCap; i++) ticks += '<i class="' + (i < Math.min(seats, P.included) ? 'inc' : i < P.included ? 'free' : i < seats ? 'ext' : '') + '"></i>';
    return '<div class="card-top"><span class="kpi-l">Plan</span><span class="pill pill--green">Active</span></div>' +
      '<div class="plan-v"><span class="plan-n">Agency</span><span class="big-v tnum">$499<small>/mo</small></span></div>' +
      '<p class="plan-d">10 agents included, then $15 per agent for agents 11–50. Agents beyond 50 are free. Month to month.</p>' +
      '<div class="seats"><div class="seats-h"><span>Agent seats</span><b class="tnum">' + seats + ' <span class="faint">of ' + P.seatCap + '</span></b></div>' +
        '<div class="seat-bar" aria-hidden="true">' + ticks + '</div>' +
        '<div class="seats-l"><span><i class="sw sw--inc"></i>10 included</span><span><i class="sw sw--ext"></i>' + extra + ' × $15 = ' + money0(extra * P.perSeat) + '/mo</span></div></div>' +
      '<div class="card-f"><span>Next invoice</span><b class="tnum">' + shortDate(nextDate.getTime()) + ' · ' + money(next) + '</b></div>';
  }
  function refundRows() {
    var list = D.calls.filter(function (c) { return !!c.refund; });
    if (!list.length) return '<li class="rf-empty">No refund requests.</li>';
    return list.map(function (c) {
      var r = c.refund, a = D.agent(c.agentId);
      return '<li class="rf-row" data-call="' + c.id + '">' +
        '<div class="rf-amt tnum">' + money(c.charge) + '</div>' +
        '<div class="rf-main"><div class="rf-who">' + av(a, 20) + '<b>' + esc(a.name) + '</b><span class="ev-sep">·</span><a class="mono lnk-u" href="#/calls/' + c.id + '">' + c.id + '</a><span class="ev-sep">·</span><span class="faint">' + esc(c.city) + ', ' + c.state + '</span></div>' +
          '<p class="rf-q">“' + esc(r.reason) + '”</p></div>' +
        (r.status === 'requested' ? '<span class="mono rf-left" data-refund-left="' + c.id + '">' + refundLeft(c) + '</span>' +
          '<div class="rf-a"><button class="btn btn--ghost btn--sm" type="button" data-refund="decline" data-id="' + c.id + '">Decline</button><button class="btn btn--sm" type="button" data-refund="approve" data-id="' + c.id + '">Approve</button></div>'
          : '<span></span><div class="rf-a"><span class="pill ' + (r.status === 'approved' ? 'pill--green' : '') + '">' + (r.status === 'approved' ? 'Approved · back to wallet' : 'Declined') + '</span></div>') +
      '</li>';
    }).join('');
  }
  function ledgerHTML() {
    var B = D.billing;
    if (BV.tab === 'invoices') {
      var inv = [{ id: 'Upcoming', ts: now(), desc: 'Connection fees · this week', amount: B.balance, status: 'Open' }].concat(B.invoices);
      return '<table class="tbl tbl--ledger"><thead><tr><th>Date</th><th>Invoice</th><th>Description</th><th class="r">Amount</th><th class="r">Status</th></tr></thead><tbody>' + inv.map(function (i) {
        return '<tr class="' + (i.fresh ? 'is-new' : '') + '"><td class="mono">' + shortDate(i.ts) + '</td><td class="mono">' + i.id + '</td><td>' + i.desc + '</td><td class="r tnum">' + money(i.amount) + '</td><td class="r"><span class="pill ' + (i.status === 'Paid' ? 'pill--green' : 'pill--blue') + '">' + i.status + '</span></td></tr>';
      }).join('') + '</tbody></table>';
    }
    var items = BV.all ? B.ledger : B.ledger.slice(0, 10);
    return '<table class="tbl tbl--ledger"><thead><tr><th>Date</th><th>Call</th><th>Description</th><th class="r">Amount</th></tr></thead><tbody>' + items.map(function (l) {
      return '<tr class="' + (l.fresh ? 'is-new' : '') + (l.kind === 'collect' ? ' is-collect' : '') + '"><td class="mono">' + shortDate(l.ts) + ', ' + tclock(l.ts) + '</td><td class="mono">' + (l.callId ? '<a class="lnk-u" href="#/calls/' + l.callId + '">' + l.callId + '</a>' : '<span class="faint">—</span>') + '</td><td>' + l.desc + '</td><td class="r tnum">' + money(l.amount) + '</td></tr>';
    }).join('') + '</tbody></table>' + (B.ledger.length > 10 ? '<button class="lnk tbl-more" type="button" id="ld-more">' + (BV.all ? 'Show fewer' : 'Show all ' + B.ledger.length + ' line items') + '</button>' : '');
  }
  function fillLedger() {
    var h = $('#ledger'); if (!h) return;
    h.innerHTML = ledgerHTML();
    D.billing.ledger.forEach(function (l) { l.fresh = false; }); D.billing.invoices.forEach(function (i) { i.fresh = false; });
    var m = $('#ld-more'); if (m) m.addEventListener('click', function () { BV.all = !BV.all; fillLedger(); });
  }
  PAGES.billing = {
    render: function () {
      return '<div class="ph" data-in><div><h1 class="pt">Billing</h1><p class="ps">What you pay Inbound Select. Agents pay you directly through Stripe Connect.</p></div></div>' +
        '<div class="bill-grid">' +
          '<section class="panel card" id="bal-card" data-in>' + balanceHTML() + '</section>' +
          '<section class="panel card" data-in>' + planHTML() + '</section>' +
        '</div>' +
        '<section class="panel" data-in><header class="panel-h"><h2>Refund requests</h2><span class="panel-m">Agents can ask within 48 hours of a charge</span></header><ul class="rf-list" id="rf-list">' + refundRows() + '</ul></section>' +
        '<section class="panel ledger-p" data-in><header class="panel-h"><div class="seg-tabs" id="ld-tabs"><button type="button" class="' + (BV.tab === 'items' ? 'is-on' : '') + '" data-t="items">Line items</button><button type="button" class="' + (BV.tab === 'invoices' ? 'is-on' : '') + '" data-t="invoices">Invoices</button></div><span class="panel-m">This week</span></header><div id="ledger"></div></section>';
    },
    mount: function () {
      fillLedger();
      $$('#rf-list [data-refund]').forEach(bindRefundBtn);
      $('#ld-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return;
        BV.tab = b.getAttribute('data-t'); $$('#ld-tabs button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        fillLedger();
      });
    },
    onSim: function (type) {
      if (type === 'billing:update' || type === 'billing:collected') {
        var card = $('#bal-card'); if (!card) return;
        var v = $('#bal-v'), from = +v.getAttribute('data-val');
        card.innerHTML = balanceHTML(); var nv = $('#bal-v'); nv.setAttribute('data-val', from); nv.textContent = money(from);
        tick(nv, D.billing.balance, money);
        fillLedger();
      }
      if (type === 'refund:update') { var l = $('#rf-list'); if (l) { l.innerHTML = refundRows(); $$('[data-refund]', l).forEach(bindRefundBtn); } }
    }
  };

  /* ==========================================================================
     ROUTING
     ========================================================================== */
  function sw(on, attrs) { return '<label class="switch"><input type="checkbox"' + (on ? ' checked' : '') + ' ' + (attrs || '') + '><i></i></label>'; }
  PAGES.routing = {
    render: function () {
      var nums = D.agency.numbers.map(function (n) {
        return '<li class="rnum"><span class="mono">' + n.number + '</span><span class="rnum-l">' + n.label + '</span><span class="faint">' + n.source + '</span></li>';
      }).join('');
      var rules = [
        { t: 'Number', d: 'Calls arrive on your own numbers, from your ads and call vendors.', b: '<ul class="rnums">' + nums + '</ul>' },
        { t: 'Product', d: 'Each number carries one product, so agents know what the caller wants.', b: '<div class="rmap"><div><span class="tag">Final expense</span><span class="faint">2 numbers</span></div><div><span class="tag">Medicare</span><span class="faint">1 number</span></div></div>' },
        { t: 'States & hours', d: 'The caller’s state is detected from the number.', b: '<div class="chips">' + D.states.map(st).join('') + '</div><div class="rrow"><span>' + ic('clock') + 'Mon–Sat · 8:00 am – 8:00 pm, caller’s local time</span>' + sw(true, 'data-rt="hours"') + '</div>' },
        { t: 'Offer to all eligible agents at once', d: 'Every agent who meets all five checks is offered the call at the same moment.', b: '<ul class="checks">' + ['Available', 'Approved by you', 'Licensed in the caller’s state', 'Subscription active', 'Wallet covers the plan plus $10'].map(function (x) { return '<li>' + ic('check') + x + '</li>'; }).join('') + '</ul>' },
        { t: 'First to accept is connected', d: 'Agents have 40 seconds. They pick an acceptance plan as they accept.', b: '<div class="r40"><span class="r40-bar"><i></i></span><span class="mono">40s</span></div>' },
        { t: 'If no one accepts within 40s', d: 'The caller can leave a voicemail. It becomes a Callback Request your agents can buy.', b: '<div class="rrow"><span>' + ic('voicemail') + 'Let callers leave a voicemail</span>' + sw(true, 'data-rt="vm"') + '</div>', end: true }
      ];
      var flow = rules.map(function (r, i) {
        return '<li class="rule' + (r.end ? ' rule--end' : '') + '" data-in><span class="rule-n mono">' + (i < 9 ? '0' : '') + (i + 1) + '</span><div class="rule-c"><h3>' + r.t + '</h3><p>' + r.d + '</p><div class="rule-b">' + r.b + '</div></div></li>';
      }).join('');
      var plans = D.products.map(function (p) {
        return '<div class="plans-p"><h3>' + p + '</h3><ul>' + D.plans[p].map(function (pl, i) {
          return '<li><span class="mono">' + pl.s + 's</span><span class="tnum">' + money(pl.p) + '</span>' + sw(pl.on, 'data-plan="' + p + '|' + i + '"') + '</li>';
        }).join('') + '</ul></div>';
      }).join('');
      return '<div class="ph" data-in><div><h1 class="pt">Routing</h1><p class="ps">How a call finds an agent. Changes apply to the next call.</p></div><span class="pill no-dot">Illustrative settings</span></div>' +
        '<div class="rt-grid"><ol class="flow">' + flow + '</ol>' +
        '<aside class="rt-side"><section class="panel" data-in><header class="panel-h"><h2>Acceptance plans</h2><span class="panel-m">Set by you</span></header><div class="panel-b">' + plans +
        '<p class="panel-note">Agents choose a plan as they accept. They’re charged only if talk time reaches the plan’s seconds, and the caller’s number stays hidden until then.</p></div></section>' +
        '<section class="panel" data-in><header class="panel-h"><h2>Connected through</h2></header><ul class="integ">' +
          '<li><b>Twilio</b><span>Your own account, or a managed subaccount</span></li><li><b>Stripe Connect</b><span>Agent payments go straight to you</span></li><li><b>Google Calendar</b><span>Appointments land on the agent’s calendar</span></li><li><b>Meta Ads</b><span>Ad spend imported next to your calls</span></li>' +
        '</ul></section></aside></div>';
    },
    mount: function () {
      view.addEventListener('change', PAGES.routing._onChange = function (e) {
        var p = e.target.closest('[data-plan]');
        if (p) {
          var k = p.getAttribute('data-plan').split('|'), list = D.plans[k[0]];
          if (!p.checked && list.filter(function (x) { return x.on; }).length <= 1) { p.checked = true; toast('Keep at least one plan per product', 'amber'); return; }
          list[+k[1]].on = p.checked;
          toast(k[0] + ' · ' + list[+k[1]].s + 's plan ' + (p.checked ? 'on' : 'off'), 'blue');
          return;
        }
        if (e.target.closest('[data-rt]')) toast('Routing updated', 'blue');
      });
    },
    unmount: function () { if (PAGES.routing._onChange) view.removeEventListener('change', PAGES.routing._onChange); }
  };

  /* ==========================================================================
     AGENT VIEW (Dana Whitfield) — the presenter's interactive
     ========================================================================== */
  var dana = D.agent('dana');
  var AV = { stage: 'waiting', call: null, plan: 60, visited: false, idx: 0, available: true, saved: null, auto: null, token: 0, reached: false, step: 0, notes: '', result: null, resT: null };
  var SCRIPTED = [
    { caller: 'Margaret E.', state: 'FL', city: 'Tampa', area: 813, number: '(813) 402-1147', product: 'Final expense', offeredTo: 6 },
    { caller: 'Harold B.', state: 'GA', city: 'Savannah', area: 912, number: '(912) 638-2290', product: 'Final expense', offeredTo: 5 },
    { caller: 'Dolores K.', state: 'TX', city: 'San Antonio', area: 210, number: '(210) 714-3368', product: 'Medicare', offeredTo: 5 },
    { caller: 'Walter P.', state: 'NC', city: 'Charlotte', area: 704, number: '(704) 291-5583', product: 'Final expense', offeredTo: 4 }
  ];
  var SCRIPTS = {
    'Final expense': [
      ['Open', 'Hi, this is Dana with Lakeshore Senior Benefits. You called about final expense cover. Is now still a good time?'],
      ['Confirm', 'Can I confirm your first name, and the state you live in?'],
      ['Purpose', 'Who would you like this policy to look after? Mainly the funeral costs, or a little extra for family?'],
      ['Health', 'A few quick health questions. Any hospital stays in the last two years? Do you use tobacco?'],
      ['Quote', 'For a $10,000 policy you’d be looking at about $48 a month. Shall we get that started today?']
    ],
    'Medicare': [
      ['Open', 'Hi, this is Dana with Lakeshore Senior Benefits, about your Medicare question. Is now a good time?'],
      ['Confirm', 'Are you enrolled in Medicare Parts A and B, and which state and county do you live in?'],
      ['Needs', 'Which doctors and prescriptions matter most to you?'],
      ['Compare', 'Let me compare the plans available where you live and walk you through the two best fits.'],
      ['Next step', 'Would you like to enrol today, or book a time to go through it with family?']
    ]
  };
  var RING_C = 2 * Math.PI * 28;

  function backHref() { return AV.saved ? '#/calls' : (R.lastAgency || '#/overview'); }
  function shellSwap(fn) {
    if (reduced() || !document.startViewTransition) { fn(); return; }
    var root = document.documentElement; root.classList.add('vt-shell');
    var t = document.startViewTransition(fn);
    var done = function () { root.classList.remove('vt-shell'); };
    t.ready.catch(function () {});
    t.finished.then(done, done);
  }
  function enterAgent() {
    if (R.mode === 'agent') return;
    closeDrawer(true); closePal(); closeMenu(); closePop(); closeMenus();
    shellSwap(function () {
      R.mode = 'agent';
      document.body.classList.add('mode-agent');
      document.title = 'Dana Whitfield · Inbound Select';
      renderAgentShell();
    });
    if (!AV.visited) {
      AV.visited = true;
      AV.auto = setTimeout(function () { AV.auto = null; if (R.mode === 'agent' && AV.stage === 'waiting' && AV.available) incoming(); }, 4000);
    }
  }
  function leaveAgent(r) {
    clearTimeout(AV.auto); AV.auto = null;
    if (modalOpen()) closeModal(true, true);
    var saved = AV.saved;
    if (saved) D.calls.forEach(function (c) { c.fresh = c === saved; });
    shellSwap(function () {
      R.mode = 'agency';
      document.body.classList.remove('mode-agent');
      $('#agentv').innerHTML = '';
      R.page = null;
      renderPage(r.page, true);
      applyParam(r);
      if (saved && r.page === 'calls') {
        var row = $('#cv-body tr[data-id="' + saved.id + '"]');
        if (row) setTimeout(function () { row.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }, 300);
      }
    });
    AV.saved = null;
  }
  function renderAgentShell() {
    var v = $('#agentv');
    v.innerHTML = '<header class="ah">' +
      '<a class="ah-back" id="ah-back" href="' + backHref() + '">' + ic('arrow-left') + '<span>Back to agency view</span></a>' +
      '<div class="ah-id">' + av(dana, 32) + '<div class="ah-who"><b>Dana Whitfield</b><span>Licensed agent · ' + D.agency.name + '</span></div></div>' +
      '<div class="ah-r">' +
        '<span class="ah-states" title="Licensed states">' + dana.states.join(' · ') + '</span>' +
        '<span class="ah-wallet">' + ic('wallet') + '<span class="tnum" id="ah-wallet" data-val="' + dana.wallet + '">' + money(dana.wallet) + '</span></span>' +
        '<label class="switch switch--lab"><input type="checkbox" id="ah-avail"' + (AV.available ? ' checked' : '') + '><i></i><span class="switch-l" id="ah-avail-l">' + (AV.available ? 'Available' : 'Unavailable') + '</span></label>' +
      '</div></header>' +
      '<main class="stage dots" id="stage"><div class="stage-in" id="stage-in"></div></main>';
    $('#ah-avail').addEventListener('change', function () {
      AV.available = this.checked;
      $('#ah-avail-l').textContent = AV.available ? 'Available' : 'Unavailable';
      if (dana.status !== 'oncall') S.setStatus('dana', AV.available ? 'available' : 'offline');
      if (AV.stage === 'waiting') showStage('waiting');
    });
    var stage = AV.stage === 'outcome' ? 'connected' : AV.stage;
    showStage(stage, true);
    if (AV.stage === 'outcome' || (AV.call && AV.call.status === 'wrapup')) { AV.stage = 'connected'; openOutcome(); }
  }

  /* ---------- Stage renderers ---------- */
  function waitingHTML() {
    var s = D.agentStats('dana'), on = AV.available;
    return '<section class="aw' + (on ? '' : ' is-off') + '">' +
      '<div class="breath" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<h1 class="aw-t">' + (on ? 'Waiting for calls' : 'You’re unavailable') + '</h1>' +
      '<p class="aw-s">' + (on ? 'You’ll be offered calls from ' + listAnd(dana.states) + ' the moment they ring. The first agent to accept is connected.' : 'Switch on Available to start receiving calls.') + '</p>' +
      '<button class="btn btn--ghost btn--sm aw-sim" type="button" id="sim-call"' + (on ? '' : ' disabled') + '>' + ic('phone') + 'Simulate incoming call</button>' +
      '<dl class="aw-today"><div><dt>Calls today</dt><dd class="tnum">' + s.calls + '</dd></div><div><dt>Billed today</dt><dd class="tnum">' + money(s.billed) + '</dd></div><div><dt>Median accept</dt><dd class="tnum">' + D.median(s.ttas).toFixed(1) + 's</dd></div></dl>' +
    '</section>';
  }
  function incomingHTML() {
    var c = AV.call, plans = D.plans[c.product].filter(function (p) { return p.on; });
    if (!plans.some(function (p) { return p.s === AV.plan; })) AV.plan = plans[Math.min(1, plans.length - 1)].s;
    return '<article class="icard" id="icard">' +
      '<div class="icard-top"><span class="icard-k">' + sig(true) + 'Incoming call</span>' +
        '<div class="ring" id="ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-bg" cx="32" cy="32" r="28"/><circle class="ring-fg" id="ring-fg" cx="32" cy="32" r="28" style="stroke-dasharray:' + RING_C.toFixed(2) + ';stroke-dashoffset:0"/></svg><b class="mono" id="ring-n">40</b><span class="sr-only">seconds left to accept</span></div></div>' +
      '<h2 class="icard-t">' + c.product + '</h2>' +
      '<p class="icard-loc">' + esc(c.city) + ', ' + c.state + '<span class="ev-sep">·</span><span class="mono">' + c.masked + '</span></p>' +
      '<p class="icard-offer">Offered to you and ' + plural(c.offeredTo - 1, 'other licensed agent') + '. First to accept is connected.</p>' +
      '<div class="icard-plan" id="icard-plan"><div class="icard-plan-h"><span>Acceptance plan</span><span class="faint" id="plan-hint">Charged only if talk time reaches ' + AV.plan + 's</span></div>' +
        '<div class="seg" role="radiogroup" aria-label="Acceptance plan" id="plan-seg"><span class="seg-thumb" aria-hidden="true"></span>' + plans.map(function (p) {
          return '<button type="button" role="radio" class="seg-o' + (p.s === AV.plan ? ' is-on' : '') + '" aria-checked="' + (p.s === AV.plan) + '" data-s="' + p.s + '"><b>' + p.s + 's</b><span>' + money0(p.p) + '</span></button>';
        }).join('') + '</div></div>' +
      '<div class="icard-act" id="icard-act"><button class="btn btn--blue icard-accept" type="button" id="ic-accept">Accept</button><button class="btn btn--ghost icard-pass" type="button" id="ic-pass">Pass</button></div>' +
    '</article>';
  }
  function scriptHTML(prod) {
    return '<header class="script-h"><span class="script-k">Script</span><b>' + prod + '</b></header><ol class="script-l">' + SCRIPTS[prod].map(function (s, i) {
      return '<li class="' + (i < AV.step ? 'is-done' : i === AV.step ? 'is-cur' : '') + '" data-i="' + i + '"><span class="script-n mono">' + (i < AV.step ? ic('check') : (i + 1)) + '</span><div><b>' + s[0] + '</b><p>“' + s[1] + '”</p></div></li>';
    }).join('') + '</ol><p class="script-f">Tap a step when it’s done.</p>';
  }
  function connectedHTML() {
    var c = AV.call, p = c.plan;
    return '<div class="cx">' +
      '<article class="cx-card">' +
        '<div class="cx-top"><span class="cx-k"><span class="live-dot"></span>Connected</span><button class="cx-skip" type="button" id="cx-skip" title="Skip ahead (for demos)">' + ic('ff') + 'Skip ahead</button></div>' +
        '<div class="cx-who"><h2 class="cx-name">' + esc(c.caller) + '</h2><p class="cx-meta">' + esc(c.city) + ', ' + c.state + '<span class="ev-sep">·</span>' + c.product + '</p></div>' +
        '<div class="cx-live"><span class="cx-timer mono" id="cx-timer">' + dur(liveDur(c)) + '</span><div class="wave wave--live cx-wave" aria-hidden="true">' + waveBars(44, c.seed) + '</div></div>' +
        '<div class="cx-plan' + (AV.reached ? ' is-reached' : '') + '" id="cx-plan"><div class="cx-plan-h"><span>Plan ' + p.s + 's · ' + money(p.p) + '</span><span class="mono" id="cx-left"></span></div>' +
          '<div class="cx-bar"><i id="cx-bar"></i></div>' +
          '<div class="cx-note-row"><span class="cx-pre">Charged only if talk time reaches ' + p.s + 's</span>' +
          '<span class="cx-reached" id="cx-reached"><svg class="tick" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6"/><path d="m6.2 10.3 2.6 2.5 5-5.4"/></svg><span>Plan reached · <b>' + money(p.p) + '</b> will be charged</span></span></div></div>' +
        '<div class="kv kv--cx"><span>Number</span><span class="kv-v"><b class="mono">' + c.masked + '</b><span class="faint">' + ic('lock') + 'Shown once billed</span></span></div>' +
        '<label class="cx-notes"><span>Notes</span><textarea id="cx-notes" rows="2" placeholder="What should the agency know about this call?">' + esc(AV.notes) + '</textarea></label>' +
        '<button class="btn cx-end" type="button" id="cx-end">End call</button>' +
      '</article>' +
      '<aside class="script" id="script">' + scriptHTML(c.product) + '</aside>' +
    '</div>';
  }
  function rcRow(k, v, sub, cls) { return '<div class="rc-r' + (cls ? ' ' + cls : '') + '"><dt>' + k + '</dt><dd>' + v + '</dd>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  function receiptHTML() {
    var c = AV.call, p = c.plan, billed = c.billed;
    return '<article class="rc" id="rc">' +
      '<div class="rc-top"><svg class="tick tick--lg" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6"/><path d="m6.2 10.3 2.6 2.5 5-5.4"/></svg><div><h2 class="rc-t">Call saved</h2><p class="rc-s">' + esc(c.caller) + '<span class="ev-sep">·</span>' + esc(c.city) + ', ' + c.state + '<span class="ev-sep">·</span><span class="mono">' + dur(c.duration) + '</span></p></div></div>' +
      '<dl class="rc-l">' +
        rcRow('Acceptance plan · ' + p.s + 's', billed ? '<b class="tnum">' + money(c.charge) + '</b>' : '<span class="faint">Not charged</span>', billed ? 'From your wallet to ' + D.agency.name : 'Ended at ' + dur(c.duration) + ', before ' + p.s + 's') +
        rcRow('Wallet', '<span class="tnum faint">' + money(c.walletBefore) + '</span>' + ic('arrow-right', 'rc-arr') + '<b class="tnum" id="rc-wallet" data-val="' + c.walletBefore + '">' + money(c.walletBefore) + '</b>') +
        rcRow('Caller number', '<b class="mono rc-num" id="rc-num">' + c.masked + '</b>', billed ? '<span id="rc-num-s">Unlocking…</span>' : 'Recover the contact for ' + money(p.p) + ' until midnight', 'rc-r--num') +
        rcRow('Outcome', '<b>' + esc(outcomeText(c)) + '</b>', c.outcome === 'Appointment' && c.gcal ? ic('gcal') + 'Added to Google Calendar' : '') +
        (billed ? rcRow('Refund window', '<b>48 hours</b>', 'Request one from your calls if something was wrong') : '') +
      '</dl>' +
      '<div class="rc-f">' + (!billed ? '<button class="btn btn--ghost btn--sm" type="button" id="rc-recover">Recover contact · ' + money(p.p) + '</button>' : '') + '<button class="btn btn--sm" type="button" id="rc-done">Back to waiting</button></div>' +
    '</article>';
  }
  function resultHTML() {
    var k = AV.result;
    var t = k === 'expired' ? 'Saved as a Callback Request' : k === 'taken' ? 'Another agent accepted' : 'You passed';
    var s = k === 'expired' ? 'No one accepted within 40 seconds, so the caller left a voicemail. It’s listed under Callback Requests.' :
      k === 'taken' ? 'You passed, and another licensed agent took the call. You’re still available.' : 'The call is still ringing for the other agents. You’re still available.';
    return '<section class="res' + (k === 'expired' ? ' res--amber' : '') + '"><span class="res-ic">' + ic(k === 'expired' ? 'voicemail' : 'agents') + '</span><h2 class="res-t">' + t + '</h2><p class="res-s">' + s + '</p></section>';
  }
  var STAGES = { waiting: waitingHTML, incoming: incomingHTML, connected: connectedHTML, receipt: receiptHTML, result: resultHTML };

  function showStage(kind, instant) {
    AV.stage = kind;
    var host = $('#stage-in'); if (!host) return;
    var tok = ++AV.token, html = STAGES[kind](), old = host.firstElementChild;
    var put = function () {
      if (tok !== AV.token) return;
      host.innerHTML = html;
      var n = host.firstElementChild;
      bindStage(kind, n);
      if (!instant && !reduced()) n.animate([{ opacity: 0, transform: 'translateY(22px) scale(.975)' }, { opacity: 1, transform: 'none' }], { duration: 620, easing: EASE });
      agentTick();
    };
    if (old && !instant && !reduced()) {
      old.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px) scale(.985)' }], { duration: 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).onfinish = put;
    } else put();
  }
  function placeThumb() {
    var seg = $('#plan-seg'); if (!seg) return;
    var on = $('.seg-o.is-on', seg), th = $('.seg-thumb', seg); if (!on || !th) return;
    th.style.width = on.offsetWidth + 'px'; th.style.transform = 'translateX(' + (on.offsetLeft - 3) + 'px)';
  }
  function bindStage(kind, n) {
    if (kind === 'waiting') {
      var b = $('#sim-call', n); if (b) b.addEventListener('click', function () { clearTimeout(AV.auto); AV.auto = null; incoming(); });
    }
    if (kind === 'incoming') {
      placeThumb();
      requestAnimationFrame(function () { $('#plan-seg').classList.add('ready'); });
      $('#plan-seg').addEventListener('click', function (e) {
        var o = e.target.closest('.seg-o'); if (!o) return;
        AV.plan = +o.getAttribute('data-s');
        $$('.seg-o', this).forEach(function (x) { var on = x === o; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on); });
        $('#plan-hint').textContent = 'Charged only if talk time reaches ' + AV.plan + 's';
        placeThumb();
      });
      $('#ic-accept').addEventListener('click', acceptCall);
      $('#ic-pass').addEventListener('click', passCall);
    }
    if (kind === 'connected') {
      $('#cx-skip').addEventListener('click', skipAhead);
      $('#cx-end').addEventListener('click', endCall);
      $('#cx-notes').addEventListener('input', function () { AV.notes = this.value; });
      $('#script').addEventListener('click', function (e) {
        var li = e.target.closest('li[data-i]'); if (!li) return;
        var i = +li.getAttribute('data-i'); AV.step = i >= AV.step ? i + 1 : i;
        $('#script').innerHTML = scriptHTML(AV.call.product);
      });
    }
    if (kind === 'receipt') {
      var c = AV.call;
      if (!reduced()) $$('.rc-r', n).forEach(function (r, i) { r.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 240 + i * 70, easing: EASE, fill: 'backwards' }); });
      setTimeout(function () { tick($('#rc-wallet'), c.walletAfter, money); tick($('#ah-wallet'), dana.wallet, money); }, 520);
      if (c.billed) setTimeout(unlockNumber, 900);
      $('#rc-done').addEventListener('click', backToWaiting);
      var rec = $('#rc-recover');
      if (rec) rec.addEventListener('click', function () {
        S.recover(c);
        rec.remove();
        var pr = $('.rc-r', n); $('dd', pr).innerHTML = '<b class="tnum">' + money(c.charge) + '</b>'; $('small', pr).textContent = 'Contact recovered · from your wallet';
        tick($('#rc-wallet'), c.walletAfter, money); tick($('#ah-wallet'), dana.wallet, money);
        unlockNumber();
      });
    }
    if (kind === 'result') {
      clearTimeout(AV.resT);
      AV.resT = setTimeout(function () { if (AV.stage === 'result') backToWaiting(); }, 3200);
    }
  }
  function unlockNumber() {
    var n = $('#rc-num'), s = $('#rc-num-s'); if (!n) return;
    var c = AV.call;
    var swap = function () { n.textContent = c.unlocked; n.classList.add('is-open'); var row = n.closest('.rc-r'); var sm = $('small', row); if (sm) sm.innerHTML = ic('unlock') + 'Unlocked'; };
    if (reduced()) return swap();
    var a1 = n.animate([{ clipPath: 'inset(0 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 100%)', opacity: .4 }], { duration: 260, easing: EASE_IO, fill: 'forwards' });
    a1.onfinish = function () {
      swap();
      n.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 560, easing: EASE });
      a1.cancel();
    };
    void s;
  }

  /* ---------- Flow ---------- */
  function incoming() {
    if (!AV.available || AV.stage === 'incoming' || AV.stage === 'connected') return;
    clearTimeout(AV.resT);
    var spec = SCRIPTED[AV.idx % SCRIPTED.length]; AV.idx++;
    AV.call = S.offer({ caller: spec.caller, state: spec.state, city: spec.city, area: spec.area, number: spec.number, product: spec.product, offeredTo: spec.offeredTo });
    AV.reached = false; AV.step = 0; AV.notes = ''; AV.plan = 60;
    showStage('incoming');
  }
  function acceptCall() {
    var c = AV.call; if (!c || c.status !== 'ringing') return;
    S.accept(c, 'dana', AV.plan);
    c.connectedAt = S.now() + 1200;
    var card = $('#icard');
    card.classList.add('is-connecting');
    $('#icard-act').innerHTML = '<div class="connecting">' + sig(true) + '<span>Connecting…</span></div>';
    $('#icard-plan').classList.add('is-locked');
    setTimeout(function () { if (AV.call === c && c.status === 'connected') showStage('connected'); }, 1200);
  }
  function passCall() {
    var c = AV.call; if (!c || c.status !== 'ringing') return;
    var r = S.pass(c, 'dana');
    $('#icard').classList.add('is-connecting');
    $('#icard-act').innerHTML = '<div class="connecting connecting--muted"><span>Passing…</span></div>';
    setTimeout(function () { AV.result = r === 'taken' ? 'taken' : 'passed'; showStage('result'); }, 900);
  }
  function skipAhead() {
    var c = AV.call; if (!c || c.status !== 'connected') return;
    var d = liveDur(c), p = c.plan.s;
    var jump = d < p - 6 ? (p - 4 - d) : 30;
    S.skip(c, jump * 1000);
    agentTick();
  }
  function endCall() {
    var c = AV.call; if (!c || c.status !== 'connected') return;
    AV.notes = $('#cx-notes') ? $('#cx-notes').value : AV.notes;
    S.end(c);
    $('.cx-card').classList.add('is-ended');
    openOutcome();
  }
  function nextDays(n) {
    var out = [], d = new Date(now()); d.setHours(12, 0, 0, 0);
    while (out.length < n) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) { var wd = d.toLocaleDateString('en-US', { weekday: 'short' }); out.push({ s: wd, l: wd + ' ' + d.getDate() }); } }
    return out;
  }
  function openOutcome() {
    AV.stage = 'outcome';
    var c = AV.call, sel = null;
    var m = openModal(
      '<header class="modal-h"><h2>How did the call go?</h2><p>' + esc(c.caller) + '<span class="ev-sep">·</span>' + esc(c.city) + ', ' + c.state + '<span class="ev-sep">·</span><span class="mono">' + dur(c.duration) + '</span></p></header>' +
      '<div class="modal-b"><div class="oc-grid" role="radiogroup" aria-label="Outcome" id="oc-grid">' + D.outcomes.map(function (o) {
        return '<button type="button" role="radio" aria-checked="false" class="oc" data-o="' + o + '"><span class="oc-r"></span>' + o + '</button>';
      }).join('') + '</div><div class="oc-extra" id="oc-extra"></div></div>' +
      '<footer class="modal-f"><span class="modal-f-l">An outcome is required to finish the call.</span><button class="btn btn--blue btn--sm" type="button" id="oc-save" disabled>Save outcome</button></footer>',
      { locked: true, label: 'Log an outcome', cls: 'modal--outcome' });
    var box = $('.modal-box', m), extra = $('#oc-extra', m);
    $('#oc-grid', m).addEventListener('click', function (e) {
      var b = e.target.closest('.oc'); if (!b) return;
      sel = b.getAttribute('data-o');
      $$('.oc', this).forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on); });
      $('#oc-save', m).disabled = false;
      var h0 = box.offsetHeight, html = '';
      if (sel === 'Sale') html = '<div class="oc-x"><label class="field"><span>Monthly premium</span><span class="money-in money-in--lg"><span>$</span><input id="oc-prem" inputmode="decimal" value="48.00"></span></label><p class="oc-hint">Logged against this call for your agency’s reports.</p></div>';
      if (sel === 'Appointment') {
        var days = nextDays(4), def = days.filter(function (d) { return d.s === 'Thu'; })[0] || days[1];
        html = '<div class="oc-x"><div class="field"><span>Day</span><div class="tog-chips one" id="oc-day">' + days.map(function (d) { return '<button type="button" class="tchip' + (d === def ? ' is-on' : '') + '" data-v="' + d.s + '">' + d.l + '</button>'; }).join('') + '</div></div>' +
          '<div class="field"><span>Time</span><div class="tog-chips one" id="oc-time">' + ['10:00 am', '11:30 am', '2:30 pm', '4:00 pm'].map(function (t) { return '<button type="button" class="tchip' + (t === '2:30 pm' ? ' is-on' : '') + '" data-v="' + t + '">' + t + '</button>'; }).join('') + '</div></div>' +
          '<div class="switch-row"><span>' + ic('gcal') + 'Add to Google Calendar</span>' + sw(true, 'id="oc-gcal"') + '</div></div>';
      }
      if (extra.innerHTML === html) return;
      extra.innerHTML = html;
      $$('.tog-chips.one', extra).forEach(function (g) { g.addEventListener('click', function (ev) { var t = ev.target.closest('.tchip'); if (!t) return; $$('.tchip', g).forEach(function (x) { x.classList.toggle('is-on', x === t); }); }); });
      if (!reduced()) {
        var h1 = box.offsetHeight;
        if (h1 !== h0) box.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 380, easing: EASE });
        if (html) $('.oc-x', extra).animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 80, easing: EASE, fill: 'backwards' });
      }
    });
    $('#oc-save', m).addEventListener('click', function () {
      if (!sel) return;
      var o = { outcome: sel, notes: AV.notes };
      if (sel === 'Sale') { var v = parseFloat(($('#oc-prem').value || '').replace(/[^0-9.]/g, '')); o.premium = isNaN(v) ? null : v; }
      if (sel === 'Appointment') { o.appt = $('#oc-day .is-on').getAttribute('data-v') + ' ' + $('#oc-time .is-on').getAttribute('data-v'); o.gcal = $('#oc-gcal').checked; }
      S.save(c, o);
      AV.saved = c;
      var back = $('#ah-back'); if (back) back.setAttribute('href', backHref());
      closeModal(false, true);
      showStage('receipt');
    });
  }
  function backToWaiting() { clearTimeout(AV.resT); AV.call = null; AV.reached = false; showStage('waiting'); }

  function agentTick() {
    if (R.mode !== 'agent') return;
    var c = AV.call;
    if (AV.stage === 'incoming' && c) {
      if (c.status === 'missed') { AV.result = 'expired'; showStage('result'); return; }
      if (c.status !== 'ringing') return;
      var left = ringLeft(c), fg = $('#ring-fg'), n = $('#ring-n');
      if (fg) fg.style.strokeDashoffset = (RING_C * (1 - left / 40)).toFixed(2);
      if (n) n.textContent = Math.ceil(left);
      var ring = $('#ring'); if (ring) ring.classList.toggle('is-low', left <= 10);
    }
    if (AV.stage === 'connected' && c && c.status === 'connected') {
      var d = liveDur(c), p = c.plan.s;
      var t = $('#cx-timer'); if (t) t.textContent = dur(d);
      var bar = $('#cx-bar'); if (bar) bar.style.transform = 'scaleX(' + Math.min(1, d / p).toFixed(4) + ')';
      var lf = $('#cx-left'); if (lf) lf.textContent = d < p ? Math.ceil(p - d) + 's to go' : 'Reached at ' + dur(p);
      if (d >= p && !AV.reached) { AV.reached = true; var pl = $('#cx-plan'); if (pl) pl.classList.add('is-reached'); }
    }
  }
  function agentOnSim(type, data) {
    if (type === 'agent:update' && data && data.id === 'dana') {
      var w = $('#ah-wallet');
      if (w && AV.stage !== 'receipt') tick(w, dana.wallet, money);
    }
    if (type === 'call:update' && AV.call && data === AV.call && AV.stage === 'incoming' && data.status === 'connected' && data.agentId !== 'dana') {
      AV.result = 'taken'; showStage('result');
    }
    if (type === 'call:done' && AV.call && data === AV.call && AV.stage === 'incoming' && data.status === 'missed') {
      AV.result = 'expired'; showStage('result');
    }
  }

  /* ==========================================================================
     COMMAND PALETTE (⌘K)
     ========================================================================== */
  var PAL = { open: false, items: [], sel: 0 };
  function fuzzy(q, s) {
    q = q.toLowerCase(); var t = s.toLowerCase(), i = 0, j = 0, score = 0, last = -2, hits = [];
    while (i < q.length && j < t.length) {
      if (q[i] === t[j]) { hits.push(j); score += j === last + 1 ? 4 : 1; if (j === 0 || t[j - 1] === ' ') score += 3; last = j; i++; }
      j++;
    }
    return i === q.length ? { score: score - t.length * .02, hits: hits } : null;
  }
  function hl(s, hits) {
    if (!hits || !hits.length) return esc(s);
    var out = '', set = {}; hits.forEach(function (h) { set[h] = 1; });
    for (var i = 0; i < s.length; i++) out += set[i] ? '<mark>' + esc(s[i]) + '</mark>' : esc(s[i]);
    return out;
  }
  function palBase(q) {
    var it = [];
    NAV.forEach(function (n) { it.push({ g: 'Pages', t: n.label, ic: n.ic, go: '#/' + n.id }); });
    it.push({ g: 'Pages', t: 'Agent view', sub: 'Dana Whitfield', ic: 'headset', go: '#/agent' });
    D.calls.slice(0, q ? 60 : 5).forEach(function (c) { it.push({ g: 'Recent calls', t: c.caller + ' · ' + c.city + ', ' + c.state, sub: c.id + ' · ' + tclock(c.ts) + (c.agentId ? ' · ' + agentName(c.agentId) : '') + ' · ' + outcomeKey(c), ic: 'calls', go: '#/calls/' + c.id }); });
    if (q) D.agents.forEach(function (a) { it.push({ g: 'Agents', t: a.name, sub: a.states.join(' '), ic: 'agents', go: '#/agents/' + a.id }); });
    it.push({ g: 'Actions', t: 'Invite agent', ic: 'plus', run: function () { if (R.mode === 'agent' || R.page !== 'agents') location.hash = '#/agents'; setTimeout(inviteModal, 360); } });
    it.push({ g: 'Actions', t: S.routing() ? 'Pause routing' : 'Resume routing', ic: 'routing', run: function () { var on = S.routing(); S.setRouting(!on); toast(on ? 'Routing paused. New calls go to Callback Requests.' : 'Routing resumed.', on ? 'amber' : 'green'); } });
    return it;
  }
  function renderPal(q) {
    q = (q || '').trim();
    var items = palBase(q);
    if (q) {
      items = items.map(function (x) {
        var m = fuzzy(q, x.t), m2 = !m && x.sub ? fuzzy(q, x.sub) : null;
        if (!m && !m2) return null;
        x.hits = m ? m.hits : null; x.score = m ? m.score + 2 : m2.score - 1; return x;
      }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 12);
    }
    PAL.items = items; PAL.sel = 0;
    var list = $('#pal-list'), g = null, html = '';
    if (!items.length) html = '<div class="pal-empty">No matches for “' + esc(q) + '”</div>';
    items.forEach(function (x, i) {
      if (!q && x.g !== g) { g = x.g; html += '<div class="pal-g">' + g + '</div>'; }
      html += '<button type="button" class="pal-i' + (i === 0 ? ' is-sel' : '') + '" data-i="' + i + '" role="option">' + ic(x.ic) + '<span class="pal-t">' + hl(x.t, x.hits) + '</span>' + (x.sub ? '<span class="pal-s">' + esc(x.sub) + '</span>' : '') + (q ? '<span class="pal-k">' + x.g + '</span>' : '') + '</button>';
    });
    list.innerHTML = html;
  }
  function palSel(i) {
    var n = PAL.items.length; if (!n) return;
    PAL.sel = (i + n) % n;
    $$('.pal-i', $('#pal-list')).forEach(function (b) { b.classList.toggle('is-sel', +b.getAttribute('data-i') === PAL.sel); });
    var cur = $('.pal-i.is-sel'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function palRun(i) {
    var x = PAL.items[i]; if (!x) return;
    closePal();
    if (x.run) x.run(); else location.hash = x.go;
  }
  function openPal() {
    if (PAL.open) return; PAL.open = true;
    var p = $('#pal'); p.classList.add('open'); p.setAttribute('aria-hidden', 'false');
    var i = $('#pal-input'); i.value = ''; renderPal('');
    setTimeout(function () { i.focus(); }, 20);
  }
  function closePal() {
    if (!PAL.open) return; PAL.open = false;
    var p = $('#pal'); p.classList.remove('open'); p.setAttribute('aria-hidden', 'true');
  }

  /* ==========================================================================
     Live wiring: sim events + 4Hz tick
     ========================================================================== */
  function onTick() {
    $$('[data-dur]').forEach(function (n) { var c = D.call(n.getAttribute('data-dur')); if (c && c.status === 'connected') n.textContent = dur(liveDur(c)); });
    $$('[data-ring-left]').forEach(function (n) { var c = D.call(n.getAttribute('data-ring-left')); if (c && c.status === 'ringing') n.textContent = Math.ceil(ringLeft(c)) + 's'; });
    $$('[data-ring-bar]').forEach(function (n) { var c = D.call(n.getAttribute('data-ring-bar')); if (c && c.status === 'ringing') n.style.transform = 'scaleX(' + (ringLeft(c) / 40).toFixed(3) + ')'; });
    $$('[data-refund-left]').forEach(function (n) { var c = D.call(n.getAttribute('data-refund-left')); if (c && c.refund) n.textContent = refundLeft(c); });
    agentTick();
  }
  S.on(function (type, data) {
    if (type === 'tick') { onTick(); return; }
    if (type.indexOf('call:') === 0 || type === 'agent:update') updateLiveCount();
    if (type === 'routing') routingUI();
    if (R.mode === 'agency' && R.page && PAGES[R.page] && PAGES[R.page].onSim) PAGES[R.page].onSim(type, data);
    if (type.indexOf('call:') === 0 || type === 'refund:update') refreshCallDrawer(data);
    if (R.mode === 'agent') agentOnSim(type, data);
    if (R.mode === 'agency') {
      var quiet = R.page === 'overview' || R.page === 'live';
      if (!quiet && type === 'call:update' && data.status === 'connected' && data.agentId) toast(esc(data.caller) + ' · ' + data.state + ' connected to ' + esc(agentName(data.agentId)), 'green');
      if (!quiet && type === 'call:done' && data.status === 'missed') toast('Missed call · ' + esc(data.city) + ', ' + data.state + ' saved as a Callback Request', 'amber');
      if (type === 'billing:collected') toast('Connection fees collected · $100.00 from ' + D.agency.card, 'blue');
    }
  });

  /* ==========================================================================
     Boot
     ========================================================================== */
  function boot() {
    $('#nav').innerHTML = navHTML();
    $('#mnav').innerHTML = navHTML();
    fillIcons(document);
    if (window.IBBrand) window.IBBrand.fill();
    S.setFocusAgent('dana'); // Dana's calls come only from the agent view
    S.start();
    updateLiveCount(); routingUI();

    document.addEventListener('click', function (e) {
      var t = e.target;
      var g = t.closest('[data-go]'); if (g) { e.preventDefault(); closeMenu(); location.hash = g.getAttribute('data-go'); return; }
      if (t.closest('[data-close-menu]') || t.closest('#msheet .nav-i')) closeMenu();
      if (t.closest('[data-pop-close]')) { closePop(); return; }
      if (!t.closest('.routing')) closePop();
      if (!t.closest('.menu') && !t.closest('[data-f]') && !t.closest('#org-btn')) closeMenus();
      if (t.closest('[data-close-pal]')) closePal();
    });
    $('#routing-btn').addEventListener('click', function () { if ($('#routing-pop').hidden) openPop(); else closePop(); });
    $('#search-btn').addEventListener('click', openPal);
    $('#org-btn').addEventListener('click', function (e) { e.stopPropagation(); orgMenu(); });
    $('#menu-btn').addEventListener('click', openMenu);
    scrim.addEventListener('click', closeDrawerNav);

    var pin = $('#pal-input');
    pin.addEventListener('input', function () { renderPal(pin.value); });
    pin.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); palSel(PAL.sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palSel(PAL.sel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); palRun(PAL.sel); }
    });
    $('#pal-list').addEventListener('click', function (e) { var b = e.target.closest('.pal-i'); if (b) palRun(+b.getAttribute('data-i')); });
    $('#pal-list').addEventListener('mousemove', function (e) { var b = e.target.closest('.pal-i'); if (b && +b.getAttribute('data-i') !== PAL.sel) palSel(+b.getAttribute('data-i')); });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (PAL.open) closePal(); else openPal(); return; }
      if (e.key === 'Escape') {
        if (PAL.open) { closePal(); return; }
        if (modalOpen()) { closeModal(); return; }
        if ($('.menu.open')) { closeMenus(); return; }
        if (!$('#routing-pop').hidden) { closePop(); return; }
        if ($('#msheet').classList.contains('open')) { closeMenu(); return; }
        if (R.drawer) { closeDrawerNav(); return; }
      }
      // Presenter shortcuts in the agent view
      if (R.mode === 'agent' && !PAL.open && !/INPUT|TEXTAREA/.test((e.target.tagName || ''))) {
        if (AV.stage === 'waiting' && (e.key === 'n' || e.key === 'N')) incoming();
        if (AV.stage === 'incoming' && (e.key === 'a' || e.key === 'A')) acceptCall();
        if (AV.stage === 'connected' && (e.key === 'f' || e.key === 'F')) skipAhead();
      }
    });

    var rz = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(function () { if (R.page) setNav(R.page); var t = $('#cv-tabs'); if (t) moveTabInd(t); placeThumb(); });
    });
    window.addEventListener('hashchange', route);
    if (!location.hash) history.replaceState(null, '', '#/overview');
    route();
    document.documentElement.classList.add('is-ready');
  }
  boot();
})();
