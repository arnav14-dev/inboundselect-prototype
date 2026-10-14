/* ==========================================================================
   Inbound Select — Agencies page
   1 · Launchpad checklist that ticks through once when scrolled into view
   2 · Money-flow diagram: paths routed from the live layout, drawn once on entry
   3 · Agency with your own brand: accent colour swatches
   ========================================================================== */
IB.ready(function (ctx) {
  'use strict';
  var $ = IB.$, $$ = IB.$$, MOTION = IB.MOTION;

  /* ---------------------------------------------------------------------
     1 · Launchpad
     --------------------------------------------------------------------- */
  var lp = $('#lp');
  var steps = $$('#lpSteps .tstep');
  var ring = $('#lpRing'), pctEl = $('#lpPct');
  var CIRC = 2 * Math.PI * 25, N = steps.length;
  var prog = { v: 0 };

  function setProg(v) {
    ring.style.strokeDashoffset = (CIRC * (1 - v)).toFixed(2);
    pctEl.textContent = Math.round(v * 100);
  }
  function stepState(s, cls) { s.classList.remove('is-run', 'is-done', 'is-live'); if (cls) s.classList.add(cls); }
  function lpFinal() {
    steps.forEach(function (s) { stepState(s, 'is-done'); });
    prog.v = 1; setProg(1);
    lp.classList.add('is-done');
  }
  function lpPlay() {
    // Plays once. Each step spins briefly, then ticks; the last one (approval) takes a breath longer.
    // After that the card rests in its finished state.
    var tl = gsap.timeline({ delay: 0.35 }), t = 0;
    steps.forEach(function (s, i) {
      var hold = i === N - 1 ? 0.95 : 0.34;
      tl.call(function () { stepState(s, 'is-run'); }, null, t)
        .call(function () { stepState(s, 'is-done'); }, null, t + hold)
        .to(prog, { v: (i + 1) / N, duration: 0.55, ease: 'expo.out', onUpdate: function () { setProg(prog.v); } }, t + hold);
      t += hold + 0.14;
    });
    tl.call(function () { lp.classList.add('is-done'); }, null, t + 0.15);
  }

  /* ---------------------------------------------------------------------
     2 · Where the money goes
     Nodes are laid out by CSS grid; edges are routed from their boxes so the
     diagram reflows from a row (desktop) to a column (mobile).
     --------------------------------------------------------------------- */
  var flow = $('#flow'), svg = $('#flowSvg');
  var NS = 'http://www.w3.org/2000/svg';
  var ORDER = ['e1', 'e2', 'e3', 'e4'];
  var E = {};
  ORDER.forEach(function (id) {
    // line: the stroke that draws in; tip: the same path, unstroked, carrying the arrowhead
    var line = document.createElementNS(NS, 'path');
    var tip = document.createElementNS(NS, 'path');
    line.setAttribute('class', 'flow__line');
    tip.setAttribute('class', 'flow__tip');
    tip.setAttribute('marker-end', 'url(#flowArrow)');
    svg.appendChild(line); svg.appendChild(tip);
    E[id] = { line: line, tip: tip, lbl: $('[data-edge="' + id + '"]', flow) };
  });
  var mqCol = window.matchMedia('(max-width: 900px)');

  function box(name) {
    var el = $('[data-node="' + name + '"]', flow);
    var l = el.offsetLeft, t = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
    return { l: l, t: t, r: l + w, b: t + h, cx: l + w / 2, cy: t + h / 2 };
  }

  // Orthogonal polyline with softly rounded corners
  function pathD(pts, rad) {
    var s = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var r = Math.min(rad, d1 / 2, d2 / 2);
      var ax = p1[0] - (p1[0] - p0[0]) / d1 * r, ay = p1[1] - (p1[1] - p0[1]) / d1 * r;
      var bx = p1[0] + (p2[0] - p1[0]) / d2 * r, by = p1[1] + (p2[1] - p1[1]) / d2 * r;
      s += ' L' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
    }
    var e = pts[pts.length - 1];
    return s + ' L' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
  }

  function longest(pts) {
    var best = null, bl = -1;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > bl) { bl = len; best = { a: a, b: b, len: len, h: a[1] === b[1] }; }
    }
    return best;
  }

  function layoutFlow() {
    var A = box('agents'), G = box('agency'), U = box('us'), K = box('cb');
    var W = flow.offsetWidth, H = flow.offsetHeight, g = 8;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var R = {};
    if (!mqCol.matches) {
      R.e1 = { pts: [[A.r + g, A.cy], [G.l - g - 2, G.cy]], mode: 'h' };
      R.e2 = { pts: [[G.r + g, G.cy], [U.l - g - 2, U.cy]], mode: 'h' };
      R.e3 = { pts: [[K.l - g, K.cy], [G.cx, K.cy], [G.cx, G.b + g + 2]], mode: 'vl' };
      R.e4 = { pts: [[K.r + g, K.cy], [U.cx, K.cy], [U.cx, U.b + g + 2]], mode: 'vr' };
    } else {
      var x = A.l + 28, ch = W - 22;
      R.e1 = { pts: [[x, A.b + g], [x, G.t - g - 2]], mode: 'vr' };
      R.e2 = { pts: [[x, G.b + g], [x, U.t - g - 2]], mode: 'vr' };
      R.e3 = { pts: [[K.r + g, K.cy], [ch, K.cy], [ch, G.cy], [G.r + g + 2, G.cy]], mode: 'pill' };
      R.e4 = { pts: [[x, K.t - g], [x, U.b + g + 2]], mode: 'vr' };
    }
    ORDER.forEach(function (id) {
      var r = R[id], e = E[id], d = pathD(r.pts, 14);
      e.line.setAttribute('d', d); e.tip.setAttribute('d', d);
      var seg = longest(r.pts);
      var mx = (seg.a[0] + seg.b[0]) / 2, my = (seg.a[1] + seg.b[1]) / 2;
      e.lbl.className = 'flow__lbl' + (e.lbl.classList.contains('flow__lbl--pct') ? ' flow__lbl--pct' : '') + ' is-' + r.mode;
      e.lbl.style.left = mx + 'px';
      e.lbl.style.top = my + 'px';
      if (r.mode === 'h') e.lbl.style.setProperty('--w', Math.max(120, seg.len - 36) + 'px');
      else if (r.mode === 'vr') e.lbl.style.setProperty('--w', Math.max(100, W - mx - 16 - (mqCol.matches ? 44 : 0)) + 'px');
    });
  }
  layoutFlow();
  if (window.ResizeObserver) new ResizeObserver(function () { layoutFlow(); }).observe(flow);
  else window.addEventListener('resize', layoutFlow);
  window.addEventListener('load', layoutFlow);

  function flowFinal() {
    flow.classList.remove('is-pre');
    ORDER.forEach(function (id) { E[id].tip.classList.add('is-on'); });
  }

  /* ---------------------------------------------------------------------
     3 · Agency with your own brand: swatches
     --------------------------------------------------------------------- */
  var bp = $('#bp'), sws = $$('.bp-sw');
  sws.forEach(function (b) {
    var c = b.getAttribute('data-acc');
    $('i', b).style.background = c;
    b.addEventListener('click', function () {
      sws.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      bp.style.setProperty('--acc', c);
    });
  });

  /* ---------------------------------------------------------------------
     Motion
     --------------------------------------------------------------------- */
  if (!MOTION) { lpFinal(); flowFinal(); return; }

  // Launchpad ticks through once it is comfortably in view
  ScrollTrigger.create({ trigger: lp, start: 'top 72%', once: true, onEnter: lpPlay });

  // Flow: nodes rise, each path draws once and gets its arrowhead, labels settle. Then it rests.
  var nodes = $$('.fnode', flow), lbls = ORDER.map(function (id) { return E[id].lbl; });
  var note = $('.flow-callout', flow);
  flow.classList.add('is-pre');
  gsap.set(nodes, { opacity: 0, y: 14 });
  gsap.set(lbls, { opacity: 0 });
  gsap.set(note, { opacity: 0, y: 16 });
  ScrollTrigger.create({
    trigger: flow, start: 'top 74%', once: true,
    onEnter: function () {
      layoutFlow();
      var tl = gsap.timeline();
      tl.to(nodes, { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, 0);
      ORDER.forEach(function (id) {
        var p = E[id].line, L = p.getTotalLength();
        gsap.set(p, { strokeDasharray: L + 1, strokeDashoffset: L + 1 });
      });
      flow.classList.remove('is-pre');
      ORDER.forEach(function (id, i) {
        var p = E[id].line, tip = E[id].tip;
        tl.to(p, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', onComplete: function () {
          gsap.set(p, { clearProps: 'strokeDasharray,strokeDashoffset' });
          tip.classList.add('is-on');
        } }, 0.35 + i * 0.18);
        tl.to(E[id].lbl, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.9 + i * 0.18);
      });
      tl.to(note, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, 1.5);
    }
  });
});
