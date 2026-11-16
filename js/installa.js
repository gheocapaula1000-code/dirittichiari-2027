/*! DirittiOk — banner e guida «Installa l'app».
 * Android/Chromium: beforeinstallprompt + pulsante Installa.
 * iPhone/iPad Safari: foglio Condividi → Aggiungi alla schermata Home.
 * Mai se già installata (display-mode standalone / navigator.standalone).
 * Banner solo su home e risultati, non sopra la nav né sul banner di aggiornamento;
 * chiudibile, ricordato 7 giorni. CTA anche in footer e in hero. */
(function (w) {
  'use strict';
  var KEY = 'dc2027:installa-dismiss:v1.5';
  var RESHOW = 7 * 24 * 60 * 60 * 1000;
  var deferred = null;
  var installed = false;
  var sheetOpen = false;

  function i18n() { return w.DC_i18n || { t: function (k) { return k; }, rich: function (k) { return k; }, current: function () { return 'it'; } }; }
  function t(k, p) { return i18n().t(k, p); }

  function isStandalone() {
    var nav = w.navigator || {};
    if (nav.standalone === true) return true;
    if (typeof w.matchMedia !== 'function') return false;
    return ['standalone', 'fullscreen', 'minimal-ui'].some(function (m) {
      return w.matchMedia('(display-mode: ' + m + ')').matches;
    });
  }
  function isIos() {
    var nav = w.navigator || {};
    var ua = nav.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua)) return true;
    return /Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1;
  }
  /** Chrome/Edge/Samsung su Android: mostriamo il banner anche se beforeinstallprompt non arriva. */
  function isAndroid() {
    var ua = (w.navigator && w.navigator.userAgent) || '';
    return /Android/i.test(ua);
  }
  function preview() {
    try {
      var v = new URLSearchParams(w.location.search).get('installa');
      return v === 'ios' || v === 'android' ? v : null;
    } catch (e) { return null; }
  }
  function surface() {
    if (installed || isStandalone()) return 'none';
    var pv = preview();
    if (pv) return pv;
    if (w.self !== w.top) return 'none';
    if (isIos()) return 'ios';
    if (deferred) return 'android';
    if (isAndroid()) return 'android'; // fallback visibile se l'evento nativo non parte
    return 'none';
  }
  function dismissedRecently() {
    try {
      var n = Number(w.localStorage.getItem(KEY) || '');
      return Number.isFinite(n) && n > 0 && (Date.now() - n) < RESHOW;
    } catch (e) { return false; }
  }
  function routeKey() {
    var p = (w.location.pathname || '/').replace(/\/index\.html$/i, '/');
    p = p.replace(/^\/(en|bn)(?=\/|$)/, '');
    p = p.replace(/\/+$/, '') || '/';
    return p;
  }
  function bannerAllowedRoute() {
    var p = routeKey();
    return p === '/' || p === '/risultati';
  }
  function updateOpen() {
    var el = document.getElementById('update-banner');
    return !!(el && !el.hidden && el.getAttribute('hidden') == null);
  }
  function shouldShowBanner() {
    if (surface() === 'none') return false;
    if (!bannerAllowedRoute()) return false;
    if (dismissedRecently()) return false;
    if (updateOpen()) return false;
    return true;
  }
  function shouldShowCta() { return surface() !== 'none'; }

  var SHARE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="m8 7 4-4 4 4"/><path d="M7 11v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8"/></svg>';
  var MENU = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';
  function stepsHtml() {
    var android = surface() !== 'ios';
    var p = android ? 'install.android_step' : 'install.step';
    var icon = android ? MENU : SHARE;
    return [1, 2, 3].map(function (n) {
      var extra = n === 1 ? ' ' + icon : '';
      return '<li><span class="n">' + n + '</span><span><strong>' + escapeHtml(t(p + n + '_title')) + '</strong>' + extra +
        '<br><span class="muted">' + escapeHtml(t(p + n + '_body')) + '</span></span></li>';
    }).join('');
  }

  function fillBanner() {
    var el = document.getElementById('install-banner');
    if (!el) return;
    if (!shouldShowBanner()) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('has-install'); return; }
    var s = surface();
    var cta = s === 'ios' ? t('install.cta_ios') : t('install.cta_short');
    el.hidden = false;
    document.body.classList.add('has-install');
    el.innerHTML =
      '<p><strong>' + escapeHtml(t('install.banner_title')) + '</strong> ' + escapeHtml(t('install.banner_lead')) + '</p>' +
      '<div class="install-banner-actions">' +
        '<button type="button" class="btn btn-primary" data-install-cta>' + escapeHtml(cta) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-install-dismiss aria-label="' + escapeHtml(t('install.dismiss_aria')) + '">' + escapeHtml(t('install.dismiss')) + '</button>' +
      '</div>';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function syncCtas() {
    var show = shouldShowCta();
    document.querySelectorAll('[data-install-cta], [data-install-slot]').forEach(function (node) {
      if (node.closest && node.closest('#install-banner')) return;
      if (node.hasAttribute('data-install-slot')) {
        node.hidden = !show;
        if (show && !node.querySelector('button, a')) {
          var s = surface();
          var label = s === 'ios' ? t('install.cta_ios') : t('install.cta');
          node.innerHTML = '<button type="button" class="btn btn-ghost" data-install-cta>' + escapeHtml(label) + '</button>';
        }
        if (!show) node.innerHTML = '';
      } else {
        node.hidden = !show;
        if (show && node.tagName === 'BUTTON' && !node.closest('#install-banner')) {
          var s2 = surface();
          if (!node.dataset.keepLabel) node.textContent = s2 === 'ios' ? t('install.cta_ios') : t('install.cta');
        }
      }
    });
    var foot = document.getElementById('install-footer');
    if (foot) foot.hidden = !show;
  }

  async function onCta() {
    var s = surface();
    if (s === 'ios') { openSheet(); return; }
    if (s === 'android' && deferred && deferred.prompt) {
      var ev = deferred;
      deferred = null;
      try {
        await ev.prompt();
        var c = ev.userChoice ? await ev.userChoice : null;
        if (c && c.outcome === 'accepted') installed = true;
      } catch (e) { /* rifiutato */ }
      refresh();
      return;
    }
    if (s === 'android') openSheet();
  }
  function dismissBanner() {
    try { w.localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* privato */ }
    refresh();
  }
  function openSheet() {
    closeSheet();
    sheetOpen = true;
    var d = document.createElement('div');
    d.id = 'install-sheet';
    d.className = 'install-sheet';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-labelledby', 'install-sheet-title');
    d.innerHTML =
      '<button type="button" class="install-sheet-backdrop" tabindex="-1" aria-hidden="true" data-install-close></button>' +
      '<div class="install-sheet-dlg">' +
        '<div class="install-sheet-head">' +
          '<h2 id="install-sheet-title">' + escapeHtml(t('install.sheet_title')) + '</h2>' +
          '<button type="button" class="icon-btn" data-install-close aria-label="' + escapeHtml(t('install.close')) + '">×</button>' +
        '</div>' +
        '<p class="muted">' + escapeHtml(t('install.sheet_intro')) + '</p>' +
        '<ol class="install-steps">' + stepsHtml() + '</ol>' +
        '<button type="button" class="btn btn-primary btn-block" data-install-close>' + escapeHtml(t('install.got_it')) + '</button>' +
      '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-install-close]') || ev.target === d.querySelector('.install-sheet-backdrop')) closeSheet();
    });
    var closeBtn = d.querySelector('.icon-btn');
    if (closeBtn) closeBtn.focus();
    document.addEventListener('keydown', onEsc);
  }
  function onEsc(ev) { if (ev.key === 'Escape') closeSheet(); }
  function closeSheet() {
    sheetOpen = false;
    document.removeEventListener('keydown', onEsc);
    var d = document.getElementById('install-sheet');
    if (d) d.remove();
  }
  function refresh() {
    fillBanner();
    syncCtas();
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-install-cta]');
    if (btn) { ev.preventDefault(); onCta(); return; }
    if (ev.target.closest('[data-install-dismiss]')) { ev.preventDefault(); dismissBanner(); }
  });

  w.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    deferred = ev;
    refresh();
  });
  w.addEventListener('appinstalled', function () {
    installed = true;
    deferred = null;
    closeSheet();
    refresh();
  });
  try {
    var media = w.matchMedia && w.matchMedia('(display-mode: standalone)');
    if (media && media.addEventListener) media.addEventListener('change', refresh);
  } catch (e) { /* vecchi browser */ }

  w.DCInstalla = {
    refresh: refresh,
    surface: surface,
    isStandalone: isStandalone,
    isIos: isIos,
    isAndroid: isAndroid,
    shouldShowBanner: shouldShowBanner,
    shouldShowCta: shouldShowCta
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})(window);
