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

  var PROPER_NOUNS = [
    "Assegno Unico e Universale",
    "Assegno Unico",
    "Carta «Dedicata a te»",
    "Carta \"Dedicata a te\"",
    "DirittiChiari",
    "DirittiOk",
    "Pi.Gi Service",
    "NASpI",
    "ARERA",
    "INPS",
    "ISEE",
    "DSU",
    "ADI",
    "SFL",
    "CAF",
    "AUU",
    "IMU",
    "TARI",
    "MEF",
    "SPID",
    "CIE",
    "CNS"
  ];
  var NOUN_RE = new RegExp("(?<!\\w)(" + PROPER_NOUNS.map(function (t) {
    return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("|") + ")(?!\\w)", "g");
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TITLE: 1, TEXTAREA: 1 };
  function protectHtml(html) {
    if (!html) return html;
    return String(html).split(/(<[^>]+>)/).map(function (part, i, arr) {
      if (part.charAt(0) === "<") return part;
      var depth = 0;
      for (var j = 0; j < i; j++) {
        var p = arr[j];
        if (p.charAt(0) !== "<") continue;
        var m = p.match(/^<\/?([a-zA-Z0-9:-]+)/);
        if (!m) continue;
        var name = m[1].toUpperCase();
        if (p.indexOf("</") === 0) {
          if (SKIP_TAGS[name]) depth = Math.max(0, depth - 1);
        } else if (SKIP_TAGS[name] && !/\/>$/.test(p)) {
          depth++;
        }
      }
      if (depth) return part;
      var prev = i ? arr[i - 1] : "";
      if (prev.charAt(0) === "<" && prev.indexOf("</") !== 0 &&
          (/translate=["']no["']/.test(prev) || /\bnotranslate\b/.test(prev))) {
        return part;
      }
      NOUN_RE.lastIndex = 0;
      return part.replace(NOUN_RE, '<span class="notranslate" translate="no">$1</span>');
    }).join("");
  }
  function protectIn(root) {
    if (!root || !root.querySelectorAll) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS[p.tagName]) return NodeFilter.FILTER_REJECT;
        if (p.closest('[translate="no"], .notranslate')) return NodeFilter.FILTER_REJECT;
        NOUN_RE.lastIndex = 0;
        return NOUN_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var value = node.nodeValue;
      NOUN_RE.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var last = 0;
      var re = new RegExp(NOUN_RE.source, "g");
      var m;
      while ((m = re.exec(value))) {
        if (m.index > last) frag.appendChild(document.createTextNode(value.slice(last, m.index)));
        var span = document.createElement("span");
        span.className = "notranslate";
        span.setAttribute("translate", "no");
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last === 0) return;
      if (last < value.length) frag.appendChild(document.createTextNode(value.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }
  function rich(key, params) {
    var s = t(key, params);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var h = langPath(href);
      var extra = /^https?:/i.test(h) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + h + '"' + extra + '>' + label + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return protectHtml(s);
  }
  w.DC_i18n = { t: t, rich: rich, langPath: langPath, current: current, setLang: setLang, langFromPath: langFromPath, protectHtml: protectHtml, protectIn: protectIn };
})(typeof window !== 'undefined' ? window : self);
