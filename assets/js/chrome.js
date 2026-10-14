// Shared site chrome: nav, mobile sheet, page-transition curtain and footer.
// Usage (synchronous, so nothing flashes):
//   <body>  <script src="assets/js/chrome.js"></script>   ...   <script>IBChrome.footer()</script>
// The current page comes from <html data-page="…">.
(function () {
  var page = document.documentElement.getAttribute('data-page') || '';

  var LINKS = [
    { id: 'how', href: 'how-it-works.html', label: 'How it works' },
    { id: 'agencies', href: 'agencies.html', label: 'Agencies' },
    { id: 'agents', href: 'agents.html', label: 'Agents' },
    { id: 'callbacks', href: 'callback-requests.html', label: 'Callback Requests' },
    { id: 'pricing', href: 'pricing.html', label: 'Pricing' },
    { id: 'trust', href: 'trust.html', label: 'Trust' }
  ];

  var ARROW = '<svg class="arr" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';

  function cur(id) { return id === page ? ' aria-current="page"' : ''; }

  function nav() {
    var links = LINKS.map(function (l) { return '<a href="' + l.href + '" class="link-u"' + cur(l.id) + '>' + l.label + '</a>'; }).join('');
    var sheet = LINKS.map(function (l) { return '<a href="' + l.href + '"' + cur(l.id) + '>' + l.label + '</a>'; }).join('');
    return '' +
      '<div class="curtain" id="curtain" aria-hidden="true"></div>' +
      '<a class="skip" href="#main">Skip to content</a>' +
      '<header class="nav" id="nav">' +
        '<div class="nav__in">' +
          '<a href="index.html" class="nav__logo" aria-label="Inbound Select home"><span data-logo="full"></span></a>' +
          '<nav class="nav__links" aria-label="Primary">' + links + '</nav>' +
          '<div class="nav__cta">' +
            '<a href="signin.html" class="nav__signin link-u"' + cur('signin') + '>Sign in</a>' +
            '<a href="demo.html" class="btn btn--sm"' + cur('demo') + '>Book a demo</a>' +
          '</div>' +
          '<button class="nav__menu" id="navMenu" aria-label="Open menu" aria-expanded="false"><i></i><i></i></button>' +
        '</div>' +
        '<div class="nav__sheet" id="navSheet">' + sheet +
          '<a href="signin.html">Sign in</a>' +
          '<a href="demo.html" class="btn">Book a demo</a>' +
        '</div>' +
      '</header>';
  }

  function footer() {
    var html = '' +
      '<footer class="foot">' +
        '<div class="wrap">' +
          '<div class="foot__top">' +
            '<div class="foot__brand">' +
              '<span data-logo="full" class="foot__logo"></span>' +
              '<p>Software insurance agencies run their inbound calls on.</p>' +
            '</div>' +
            '<div class="foot__cols">' +
              '<div><h4>Product</h4>' +
                '<a href="how-it-works.html" class="link-u">How it works</a>' +
                '<a href="callback-requests.html" class="link-u">Callback Requests</a>' +
                '<a href="pricing.html" class="link-u">Pricing</a>' +
                '<a href="app.html" class="link-u">Product tour</a></div>' +
              '<div><h4>Company</h4>' +
                '<a href="agencies.html" class="link-u">For agencies</a>' +
                '<a href="agents.html" class="link-u">For agents</a>' +
                '<a href="trust.html" class="link-u">Trust</a>' +
                '<a href="demo.html" class="link-u">Book a demo</a></div>' +
              '<div><h4>Contact</h4>' +
                '<a href="mailto:support@inboundselect.com" class="link-u">support@inboundselect.com</a>' +
                '<a href="tel:+17272482830" class="link-u">+1 727 248 2830</a>' +
                '<span>East Lansing, Michigan</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="foot__base">' +
            '<span>© 2026 Inbound Select LLC</span>' +
            '<span>Product previews use sample data.</span>' +
            '<span><a href="trust.html#privacy" class="link-u">Privacy</a> · <a href="trust.html#terms" class="link-u">Terms</a></span>' +
          '</div>' +
        '</div>' +
      '</footer>';
    var s = document.currentScript;
    if (s) s.insertAdjacentHTML('beforebegin', html); else document.body.insertAdjacentHTML('beforeend', html);
    if (window.IBBrand) IBBrand.fill();
  }

  window.IBChrome = { footer: footer, arrow: ARROW, links: LINKS, page: page };

  var me = document.currentScript;
  if (me) me.insertAdjacentHTML('beforebegin', nav());
  else document.body.insertAdjacentHTML('afterbegin', nav());
  if (window.IBBrand) IBBrand.fill();
})();
