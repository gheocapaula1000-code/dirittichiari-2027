/*! DirittiOk — runtime i18n (catalogo in js/messages.js, lingua dall'URL). */
(function (w) {
  'use strict';
  function langFromPath(p) {
    p = (p || (w.location && w.location.pathname) || '/').replace(/\/index\.html$/i, '/');
    if (p === '/en' || p.indexOf('/en/') === 0) return 'en';
    if (p === '/bn' || p.indexOf('/bn/') === 0) return 'bn';
    return 'it';
  }
  function current() { return w.DC_LANG || langFromPath(); }
  function setLang(l) { w.DC_LANG = (l === 'en' || l === 'bn') ? l : 'it'; }
  function pack(lang) {
    const all = w.DC_MSG || {};
    return all[lang] || all.it || {};
  }
  function t(key, params) {
    const p = pack(current());
    let s = p[key];
    if (s == null) s = (pack('it')[key]);
    if (s == null) s = key;
    if (params) {
      s = String(s).replace(/\{([a-zA-Z0-9_]+)\}/g, function (m, k) {
        return Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m;
      });
    }
    return s;
  }
  function langPath(path, lang) {
    lang = lang || current();
    if (!path || /^(https?:|mailto:|tel:|#)/i.test(path)) return path;
    if (path.charAt(0) !== '/') return path;
    var prefix = lang === 'it' ? '' : '/' + lang;
    if (path === '/') return prefix || '/';
    if (prefix && (path === prefix || path.indexOf(prefix + '/') === 0)) return path;
    return prefix + path;
  }
  function rich(key, params) {
    var s = t(key, params);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var h = langPath(href);
      var extra = /^https?:/i.test(h) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + h + '"' + extra + '>' + label + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }
  w.DC_i18n = { t: t, rich: rich, langPath: langPath, current: current, setLang: setLang, langFromPath: langFromPath };
})(typeof window !== 'undefined' ? window : self);
