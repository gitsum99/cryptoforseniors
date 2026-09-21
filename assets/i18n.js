/* Shared presentation-only language support. No wallet or trading operations. */
(function () {
  'use strict';
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const names = {
    en:'English',fr:'Français',es:'Español',hr:'Hrvatski',tl:'Filipino',ja:'日本語',
    'zh-cn':'中文（简体）','zh-tw':'中文（繁體）',ar:'العربية',no:'Norsk',sv:'Svenska',
    az:'Azərbaycanca',uk:'Українська',nl:'Nederlands',fa:'فارسی',de:'Deutsch',
    ro:'Română',pl:'Polski',sq:'Shqip',fi:'Suomi',is:'Íslenska',pt:'Português',
    it:'Italiano',rm:'Rumantsch',sw:'Kiswahili',ha:'Hausa',yo:'Yorùbá',zu:'isiZulu',
    am:'አማርኛ',so:'Soomaali',ln:'Lingála'
  };
  const labels = {
    en:'Language',fr:'Langue',es:'Idioma',hr:'Jezik',tl:'Wika',ja:'言語',
    'zh-cn':'语言','zh-tw':'語言',ar:'اللغة',no:'Språk',sv:'Språk',az:'Dil',
    uk:'Мова',nl:'Taal',fa:'زبان'
  };
  function normalize(value) {
    if (typeof value !== 'string') return 'en';
    const code = value.trim().toLowerCase().replace(/_/g, '-');
    if (own(names, code)) return code;
    if (/^zh-(tw|hk|mo|hant)(-|$)/.test(code)) return 'zh-tw';
    if (/^zh($|-)/.test(code)) return 'zh-cn';
    if (/^(nb|nn)(-|$)/.test(code)) return 'no';
    if (/^fil(-|$)/.test(code)) return 'tl';
    const base = code.split('-')[0];
    return own(names, base) ? base : 'en';
  }
  function saved() {
    try { return normalize(localStorage.getItem('cfs-lang')); }
    catch (_) { return 'en'; }
  }
  function select(value) {
    const code = normalize(value);
    try { localStorage.setItem('cfs-lang', code); } catch (_) { /* Private storage may be disabled. */ }
    const selector = document.getElementById('lang');
    selector.value = code;
    selector.setAttribute('aria-label', labels[code] || window.CFS_TRANSLATIONS?.[code]?.language || labels.en);
    document.documentElement.lang = code;
    document.documentElement.dir = ['ar', 'fa'].includes(code) ? 'rtl' : 'ltr';
    const heading = document.getElementById('troilHeading');
    if (heading) heading.textContent = window.CFS_TRANSLATIONS?.[code]?.troilHeading || heading.dataset.original;
    queueMicrotask(() => {
      const title = document.querySelector('h1');
      if (title?.textContent) document.title = title.textContent;
    });
    return code;
  }
  function extend(page, table, pageNames, back) {
    const additions = window.CFS_TRANSLATIONS || {};
    for (const [code, name] of Object.entries(names)) {
      if (pageNames && !own(pageNames, code)) pageNames[code] = name;
      if (!own(table, code)) {
        const entry = additions[code]?.[page];
        table[code] = Array.isArray(entry) ? entry.slice() : {...(entry || {})};
      }
      if (back && !own(back, code)) back[code] = additions[code]?.back || back.en;
    }
    // Resolve individual missing or blank strings to English, never the previous language.
    for (const code of Object.keys(table)) {
      const entry = table[code];
      table[code] = new Proxy(entry, {
        get(target, key, receiver) {
          if (key === 'name' && page === 'main') return target.name || names[code];
          const value = Reflect.get(target, key, receiver);
          if ((value === undefined || value === null || value === '') && code !== 'en') return table.en[key];
          return value;
        }
      });
    }
  }
  function populate(selector) {
    const present = new Set(Array.from(selector.options, option => option.value));
    for (const [code, name] of Object.entries(names)) {
      if (!present.has(code)) selector.add(new Option(name, code));
    }
  }
  window.CFSI18n = Object.freeze({normalize, saved, select, extend, populate});
})();
