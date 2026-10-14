// Runs in <head> before first paint: motion preference, first-visit intro (home
// only) and the page-transition curtain for arrivals from another page.
(function (d) {
  d.classList.replace('no-js', 'js');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.classList.add(reduce ? 'reduce' : 'motion');
  if (reduce) return;
  try {
    var q = location.search;
    var arriving = sessionStorage.getItem('ib-nav') === '1';
    if (arriving) { d.classList.add('is-arriving'); sessionStorage.removeItem('ib-nav'); }
    var home = d.getAttribute('data-page') === 'home';
    if (home && !arriving && (/[?&]intro\b/.test(q) || (!sessionStorage.getItem('is-intro') && !/[?&]nointro/.test(q)))) d.classList.add('play-intro');
  } catch (e) {}
})(document.documentElement);
