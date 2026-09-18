/* Common navigation and keyboard affordances. Saved game data is untouched. */
(function () {
  window.CA_LOCAL_PREVIEW = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var routes = [
    ['home', 'index.html', '홈'], ['solo', 'game.html', '차트 연습'],
    ['battle', 'quiz-battle.html', '4인 배틀'], ['puzzle', 'puzzle.html', '퍼즐'],
    ['learn', 'learn.html', '학습']
  ];
  var page = routes.find(function (r) { return location.pathname.endsWith('/' + r[1]); });
  var key = page ? page[0] : 'home';
  document.documentElement.dataset.page = key;
  document.documentElement.lang = 'ko';

  function ready() {
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = '<div class="site-header-inner"><a class="site-brand" href="index.html" aria-label="차트아레나 홈">'
      + '<img src="assets/logo_wordmark.png?v=3" alt="차트아레나"></a>'
      + '<nav class="site-nav" aria-label="주요 메뉴">' + routes.map(function (r) {
        return '<a href="' + r[1] + '"' + (key === r[0] ? ' aria-current="page"' : '') + '>' + r[2] + '</a>';
      }).join('') + '</nav><span class="site-caption">차트로 배우는 투자 감각</span></div>';
    document.body.prepend(header);

    // Existing data-driven controls also work with keyboard, including rerenders.
    var selector = '[data-go], [data-met], [data-dir], [data-ind], [data-bet], [data-lev], [data-go-play], .lcard, #worlds .lv:not(.locked), .tab, .bet, .lev';
    function enhance(root) {
      root.querySelectorAll(selector).forEach(function (el) {
        if (el.matches('button, input, a[href]')) return;
        el.setAttribute('role', 'button');
        el.tabIndex = el.classList.contains('locked') || el.classList.contains('dis') ? -1 : 0;
      });
    }
    enhance(document);
    new MutationObserver(function (changes) {
      if (changes.some(function (c) { return c.addedNodes.length; })) enhance(document);
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', function (e) {
      if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ') && e.target.matches(selector)
          && !e.target.matches('button, input, a[href]')) {
        e.preventDefault(); e.target.click();
      }
    });
    // Header insertion changes canvas space; use the game's existing resize path.
    window.dispatchEvent(new Event('resize'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
