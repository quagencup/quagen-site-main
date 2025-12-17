/* js/lang-dropdown.js */
(function () {
  const root = document.getElementById("langPicker");
  const btn = document.getElementById("langBtn");
  const menu = document.getElementById("langMenu");
  const flagImg = document.getElementById("langFlag");
  const labelSpan = document.getElementById("langLabel");

  if (!root || !btn || !menu) return;

  const STORAGE_KEY = "qs_lang";
  const DEFAULT_LANG = "en-US";

  const getLang = () => localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

  function isOpen() {
    return root.classList.contains("open");
  }

  function openMenu() {
    root.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    menu.hidden = false;

    // focus selected option first (better UX)
    const selected =
      menu.querySelector('.lang-option.is-selected') ||
      menu.querySelector(`.lang-option[data-lang="${getLang()}"]`) ||
      menu.querySelector(".lang-option");

    selected?.focus?.();
  }

  function closeMenu() {
    if (!isOpen()) return;
    root.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    btn.focus?.();
  }

  function toggleMenu() {
    isOpen() ? closeMenu() : openMenu();
  }

  function setSelectedUI(lang) {
    const options = menu.querySelectorAll(".lang-option");

    options.forEach((opt) => {
      const selected = opt.dataset.lang === lang;
      opt.classList.toggle("is-selected", selected);
      opt.setAttribute("aria-selected", selected ? "true" : "false");
    });

    const active = menu.querySelector(`.lang-option[data-lang="${lang}"]`);
    if (!active) return;

    const flag = active.dataset.flag || "us";

    // IMPORTANT:
    // Use the option's *current textContent* (which i18n may translate),
    // so the button label never "snaps back" to the static English dataset label.
    const label = (active.textContent || "").trim() || active.dataset.label || "";

    if (flagImg) {
      flagImg.src = `https://flagcdn.com/${flag}.svg`;
      flagImg.alt = flag.toUpperCase();
    }
    if (labelSpan && label) labelSpan.textContent = label;
  }

  // Button toggles menu
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleMenu();
  });

  // Click an option -> set language + update UI + close
  menu.addEventListener("click", (e) => {
    const opt = e.target.closest(".lang-option");
    if (!opt) return;

    const lang = opt.dataset.lang;
    if (!lang) return;

    // Set language (this updates localStorage inside i18n.js)
    window.I18N?.setLanguage?.(lang);

    // Update dropdown UI immediately
    setSelectedUI(lang);

    closeMenu();
  });

  // Close on outside click (only if open)
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    if (!root.contains(e.target)) closeMenu();
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      e.preventDefault();
      closeMenu();
    }
  });

  // Keyboard nav inside menu
  menu.addEventListener("keydown", (e) => {
    const opts = Array.from(menu.querySelectorAll(".lang-option"));
    if (!opts.length) return;

    const current = document.activeElement;
    const i = opts.indexOf(current);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      (opts[i + 1] || opts[0])?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (opts[i - 1] || opts[opts.length - 1])?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      if (current?.classList?.contains("lang-option")) {
        e.preventDefault();
        current.click();
      }
    }
  });

  // Init on load (sync UI to saved lang)
  document.addEventListener("DOMContentLoaded", () => {
    const lang = window.I18N?.getLanguage?.() || getLang();
    setSelectedUI(lang);
    menu.hidden = true;
    root.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  });

  // Sync when i18n changes language
  window.addEventListener("qs:lang-changed", (ev) => {
    const langFromEvent = ev?.detail?.lang;
    const lang = langFromEvent || window.I18N?.getLanguage?.() || getLang();
    setSelectedUI(lang);
  });
})();
