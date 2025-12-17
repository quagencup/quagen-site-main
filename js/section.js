// js/section.js

document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("navToggle");
  const sideNav = document.getElementById("sideNav");
  const sideLinks = Array.from(document.querySelectorAll(".side-link"));
  const sections = Array.from(document.querySelectorAll("section.content-section"));

  // Footer / global buttons
  const openStatusBtn = document.querySelector("[data-open-status]");

  // Hide these from sidebar (but they still exist as sections)
  const HIDDEN_FROM_SIDENAV = new Set(["changelog", "privacy", "tos", "status"]);

  /* =======================
     SECTION SHOW / HIDE
  ======================== */

  function showSection(sectionId) {
    const targetId = (sectionId || "about").trim() || "about";

    // Toggle active section
    sections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === targetId);
    });

    // Highlight active sidebar link
    sideLinks.forEach((link) => {
      const idFromData = (link.dataset.section || "").trim();
      const href = (link.getAttribute("href") || "").trim();
      const idFromHref = href.startsWith("#") ? href.slice(1).trim() : "";
      const match = idFromData === targetId || idFromHref === targetId;
      link.classList.toggle("active", match);
    });
  }

  function showSectionFromHash() {
    const hash = window.location.hash.replace("#", "").trim();
    showSection(hash || "about");
  }

  // Initial load + hash changes
  showSectionFromHash();
  window.addEventListener("hashchange", showSectionFromHash);

  /* =======================
     SIDE NAV TOGGLE
  ======================== */

  function setSideNavOpen(open) {
    if (!sideNav || !navToggle) return;
    sideNav.classList.toggle("open", open);
    sideNav.setAttribute("aria-hidden", open ? "false" : "true");
    navToggle.classList.toggle("glow", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function toggleSideNav() {
    if (!sideNav) return;
    setSideNavOpen(!sideNav.classList.contains("open"));
  }

  navToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleSideNav();
  });

  // Tab key opens/closes nav (if not focused in a field)
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;

    const active = document.activeElement;
    const isField =
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable);

    if (isField) return;

    if (!e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleSideNav();

      const isOpen = sideNav && sideNav.classList.contains("open");
      if (isOpen && sideLinks.length > 0) sideLinks[0].focus();
      else if (!isOpen && navToggle) navToggle.focus();
    }
  });

  // Sidebar links (set hash, hashchange handles switching)
  sideLinks.forEach((link) => {
    const idFromData = (link.dataset.section || "").trim();
    const href = (link.getAttribute("href") || "").trim();
    const idFromHref = href.startsWith("#") ? href.slice(1).trim() : "";
    const id = (idFromData || idFromHref).trim();

    // Remove hidden from sidebar
    if (HIDDEN_FROM_SIDENAV.has(id)) {
      link.remove();
      return;
    }

    link.addEventListener("click", (e) => {
      e.preventDefault();

      let targetId = (link.dataset.section || "").trim();
      if (!targetId) {
        const href = (link.getAttribute("href") || "").trim();
        if (href.startsWith("#")) targetId = href.slice(1).trim();
      }

      if (targetId) window.location.hash = "#" + targetId;
      setSideNavOpen(false);
      navToggle?.focus?.();
    });
  });

  /* =======================
     GLOBAL IN-PAGE LINKS
     Supports:
     - <a href="#tos">
     - <a data-section-link="tos" href="#tos">
  ======================== */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = (a.getAttribute("href") || "").trim();
    const dataSection = (a.dataset.sectionLink || "").trim();

    const targetId =
      dataSection || (href.startsWith("#") ? href.slice(1).trim() : "");

    if (!targetId) return;

    // allow normal behavior for external links
    if (!href.startsWith("#") && !dataSection) return;

    // ignore empty hashes
    if (targetId === "!" || targetId === "#") return;

    e.preventDefault();
    window.location.hash = "#" + targetId;
    setSideNavOpen(false);
  });

  /* =======================
     FOOTER SYSTEM STATUS BTN
  ======================== */
  openStatusBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "#status";
    setSideNavOpen(false);
  });

  /* =======================
     TEAM SUBNAV + SEARCH
  ======================== */
  const teamSearch = document.getElementById("teamSearch");
  const subnavBtns = document.querySelectorAll("#teams .subnav-btn");
  const subContents = document.querySelectorAll("#teams .sub-content");

  function getActiveTeamCards() {
    const activeSub = document.querySelector("#teams .sub-content.active");
    if (!activeSub) return [];
    return Array.from(activeSub.querySelectorAll(".card"));
  }

  function applyTeamSearchFilter() {
    const qRaw = (teamSearch?.value || "").toLowerCase().trim();
    const q = qRaw.startsWith("@") ? qRaw.slice(1) : qRaw;

    const cards = getActiveTeamCards();
    cards.forEach((card) => {
      const display = (card.dataset.display || "").toLowerCase();
      const nameText = (card.querySelector(".name-title")?.textContent || "").toLowerCase();
      const roleText = (card.querySelector(".role-tag")?.textContent || "").toLowerCase();
      const haystack = `${display} ${nameText} ${roleText}`;

      card.style.display = !q || haystack.includes(q) ? "" : "none";
    });
  }

  subnavBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = (btn.dataset.subTarget || "").trim();

      subnavBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      subContents.forEach((sc) => {
        sc.classList.toggle("active", sc.id === targetId);
      });

      applyTeamSearchFilter();
    });
  });

  teamSearch?.addEventListener("input", applyTeamSearchFilter);
  applyTeamSearchFilter();

  /* =======================
     PROJECT FILTERS + SEARCH
  ======================== */
  const projectBtns = document.querySelectorAll("#projects .project-filter-btn");
  const projectCards = document.querySelectorAll("#projects .project-card");
  const projectSearch = document.getElementById("projectSearch");

  let currentProjectFilter = "all";

  function normalizeStatusList(raw) {
    const s = (raw || "").trim().toLowerCase();
    if (!s) return ["active"];
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  function applyProjectFilters() {
    const q = (projectSearch?.value || "").trim().toLowerCase();

    projectCards.forEach((card) => {
      const statuses = normalizeStatusList(card.dataset.status);
      const title = (card.dataset.title || card.querySelector(".about-card-title")?.textContent || "").toLowerCase();
      const tags = (card.dataset.tags || "").toLowerCase();

      const statusMatch = currentProjectFilter === "all" || statuses.includes(currentProjectFilter);
      const searchMatch = !q || title.includes(q) || tags.includes(q);

      card.style.display = statusMatch && searchMatch ? "" : "none";
    });
  }

  projectBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      projectBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentProjectFilter = (btn.dataset.filter || "all").toLowerCase();
      applyProjectFilters();
    });
  });

  projectSearch?.addEventListener("input", applyProjectFilters);
  applyProjectFilters();

  /* =======================
     COMMUNICATION CARDS
  ======================== */
  const commCards = document.querySelectorAll("#communications .comm-card");

  commCards.forEach((card, index) => {
    setTimeout(() => card.classList.add("comm-visible"), 120 * index);

    const url = card.dataset.link;
    if (!url) return;

    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    const openCardLink = () => window.open(url, "_blank", "noopener");

    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      openCardLink();
    });

    const btn = card.querySelector(".comm-open-btn");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCardLink();
      });
    }

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCardLink();
      }
    });
  });

  /* =======================
     TOAST + HELP FORM
  ======================== */
  const toastContainer = document.getElementById("toastContainer");

  function showToast(message, type = "info") {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add("toast-visible");

    setTimeout(() => {
      toast.classList.add("toast-hide");
      setTimeout(() => toast.remove(), 220);
    }, 2600);
  }

  const helpForm = document.getElementById("helpForm");
  helpForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Help request sent. We’ll review it soon.", "success");
    helpForm.reset();
  });
});
