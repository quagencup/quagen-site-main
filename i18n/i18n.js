/* js/i18n.js */
(function () {
  const STORAGE_KEY = "qs_lang";
  const DEFAULT_LANG = "en-US";

  const getLang = () => localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  const setLang = (l) => localStorage.setItem(STORAGE_KEY, l);

  const getDict = (l) =>
    (window.TRANSLATIONS && (window.TRANSLATIONS[l] || window.TRANSLATIONS[DEFAULT_LANG])) || {};

  const getByPath = (obj, path) =>
    (path || "")
      .split(".")
      .reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);

  function translateTextNodes(dict) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;

      // store fallback once
      if (!el.dataset.i18nFallback) el.dataset.i18nFallback = el.textContent;

      const val = getByPath(dict, key);
      el.textContent = typeof val === "string" && val.length ? val : el.dataset.i18nFallback;
    });
  }

  function translatePlaceholders(dict) {
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;

      const fbKey = "i18nFallback_placeholder";
      if (!el.dataset[fbKey]) el.dataset[fbKey] = el.getAttribute("placeholder") || "";

      const val = getByPath(dict, key);
      el.setAttribute("placeholder", typeof val === "string" && val.length ? val : el.dataset[fbKey]);
    });
  }

  function translateAttrs(dict) {
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const raw = el.getAttribute("data-i18n-attr") || "";
      raw.split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => (s || "").trim());
        if (!attr || !key) return;

        const fb = `i18nFallback_${attr}`;
        if (!el.dataset[fb]) el.dataset[fb] = el.getAttribute(attr) || "";

        const val = getByPath(dict, key);
        el.setAttribute(attr, typeof val === "string" && val.length ? val : el.dataset[fb]);
      });
    });
  }

  function translateTitle(dict) {
    const t = getByPath(dict, "meta.title");
    if (typeof t === "string" && t.length) document.title = t;
  }

  function apply(lang) {
    const dict = getDict(lang);

    translateTextNodes(dict);
    translatePlaceholders(dict);
    translateAttrs(dict);
    translateTitle(dict);

    window.dispatchEvent(new CustomEvent("qs:lang-changed", { detail: { lang } }));
  }

  function applyWhenReady(lang) {
    // translations.js is defer too, but this prevents “race” if anything changes later
    if (!window.TRANSLATIONS || !Object.keys(window.TRANSLATIONS).length) {
      setTimeout(() => applyWhenReady(lang), 10);
      return;
    }
    apply(lang);
  }

  window.I18N = {
    getLanguage() {
      return getLang();
    },
    setLanguage(lang) {
      setLang(lang);
      applyWhenReady(lang);
    },
    apply() {
      applyWhenReady(getLang());
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.I18N.apply();
  });
})();
