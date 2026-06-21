document.addEventListener('DOMContentLoaded', function () {
  var body = document.body;
  var toggle = document.querySelector('.mobile-nav-toggle');
  var drawer = document.getElementById('mobileNav');
  var overlay = document.querySelector('.mobile-nav-overlay');
  var searchToggle = document.querySelector('.mobile-search-toggle');
  var searchPanel = document.getElementById('mobileSearchPanel');
  var themeToggle = document.querySelector('.mobile-theme-toggle');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    if (overlay) { overlay.hidden = false; requestAnimationFrame(function () { overlay.classList.add('open'); }); }
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    body.classList.add('mobile-nav-open');
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (overlay) {
      overlay.classList.remove('open');
      setTimeout(function () { overlay.hidden = true; }, 250);
    }
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('mobile-nav-open');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      if (drawer && drawer.classList.contains('open')) closeDrawer();
      else openDrawer();
    });
  }
  if (overlay) overlay.addEventListener('click', closeDrawer);
  if (drawer) {
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
  }

  if (searchToggle && searchPanel) {
    searchToggle.addEventListener('click', function () {
      var willShow = searchPanel.hidden;
      searchPanel.hidden = !willShow;
      searchToggle.setAttribute('aria-expanded', willShow ? 'true' : 'false');
      if (willShow) {
        var input = document.getElementById('search-input-mobile');
        if (input) input.focus();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDrawer();
      if (searchPanel && !searchPanel.hidden) {
        searchPanel.hidden = true;
        if (searchToggle) searchToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });

  function syncThemeIcon() {
    var dark = localStorage.getItem('dark-mode') === 'true';
    var light = document.getElementById('m-icon-light');
    var darkIcon = document.getElementById('m-icon-dark');
    if (light && darkIcon) {
      light.style.display = dark ? 'none' : 'inline';
      darkIcon.style.display = dark ? 'inline' : 'none';
    }
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var dark = localStorage.getItem('dark-mode') === 'true';
      var target = document.getElementById(dark ? 'icon-dark' : 'icon-light');
      if (target) target.click();
      setTimeout(syncThemeIcon, 50);
    });
  }
  syncThemeIcon();

  var mInput = document.getElementById('search-input-mobile');
  var mResults = document.getElementById('results-container-mobile');
  if (mInput && mResults) {
    var searchData = null;
    var loadFailed = false;

    function ensureData() {
      if (searchData || loadFailed) return Promise.resolve();
      return fetch('/search.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { searchData = data; })
        .catch(function () { loadFailed = true; });
    }

    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function render(query) {
      var q = query.trim().toLowerCase();
      if (!q) { mResults.style.display = 'none'; mResults.innerHTML = ''; return; }
      mResults.style.display = 'block';
      if (loadFailed) { mResults.innerHTML = "<li class='search_res' style='list-style: none;'><p>Search is unavailable.</p></li>"; return; }
      if (!searchData) { mResults.innerHTML = "<li class='search_res' style='list-style: none;'><p>Loading…</p></li>"; return; }

      var words = q.split(/\s+/);
      var hits = [];
      for (var i = 0; i < searchData.length && hits.length < 6; i++) {
        var item = searchData[i];
        var hay = ((item.title || '') + ' ' + (item.content || '')).toLowerCase();
        var matchesAll = true;
        for (var w = 0; w < words.length; w++) {
          if (hay.indexOf(words[w]) === -1) { matchesAll = false; break; }
        }
        if (matchesAll) hits.push(item);
      }

      if (!hits.length) {
        mResults.innerHTML = "<li class='search_res' style='list-style: none;'><p>No results found. Try another search.</p></li>";
        return;
      }
      mResults.innerHTML = hits.map(function (it) {
        return "<li class='search_res' style='list-style: none;'>"
          + "<a href='" + escapeHtml(it.url) + "'><p><span class='dice-index'>"
          + "<img class='twemoji' src='/assets/img/emoji/" + escapeHtml(it.index) + ".svg' alt=''></span> &nbsp;"
          + escapeHtml(it.title) + "</p></a></li>";
      }).join('');
    }

    mInput.addEventListener('input', function () {
      var val = mInput.value;
      if (!val) { render(''); return; }
      ensureData().then(function () { render(val); });
    });
  }
});
