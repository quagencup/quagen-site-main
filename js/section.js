// js/section.js

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = Array.from(document.querySelectorAll(".side-link, .top-nav-link"));
  const sections = Array.from(document.querySelectorAll("section.content-section"));

  // Optional side-nav pieces (only if your HTML has them)
  const sideNav = document.getElementById("sideNav") || document.querySelector(".side-nav");
  const navToggle = document.getElementById("navToggle") || document.querySelector("[data-nav-toggle]");

  /* =======================
     SECTION SHOW / HIDE
  ======================== */
  function getValidSectionId(requestedId) {
    const clean = (requestedId || "").trim();
    if (!clean) return "about";
    const exists = sections.some((s) => s && s.id === clean);
    return exists ? clean : "about";
  }

  function showSection(sectionId) {
    const targetId = getValidSectionId(sectionId);

    sections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === targetId);
    });

    navLinks.forEach((link) => {
      const href = (link.getAttribute("href") || "").trim();
      const idFromHref = href.startsWith("#") ? href.slice(1).trim() : "";
      const idFromData = (link.dataset.section || link.dataset.sectionLink || "").trim();
      const match = (idFromData || idFromHref) === targetId;
      link.classList.toggle("active", match);
      link.setAttribute("aria-current", match ? "page" : "false");
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
     OPTIONAL SIDE NAV TOGGLE
  ======================== */
  function setSideNavOpen(open) {
    if (!sideNav || !navToggle) return;
    sideNav.classList.toggle("open", open);
    sideNav.setAttribute("aria-hidden", open ? "false" : "true");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function toggleSideNav() {
    if (!sideNav) return;
    setSideNavOpen(!sideNav.classList.contains("open"));
  }

  if (navToggle) {
    navToggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggleSideNav();
    });
  }

  // Links: update hash (hashchange will switch sections)
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = (link.getAttribute("href") || "").trim();
      const dataSection = (link.dataset.section || link.dataset.sectionLink || "").trim();
      const targetId = dataSection || (href.startsWith("#") ? href.slice(1).trim() : "");

      // External links should behave normally
      if (!targetId) return;
      if (!href.startsWith("#") && !dataSection) return;

      e.preventDefault();
      window.location.hash = "#" + targetId;
      setSideNavOpen(false);
    });
  });

  /* =======================
     TEAM SUBNAV + SEARCH
  ======================== */
  const teamSearch = document.getElementById("teamSearch");
  const subnavBtns = Array.from(document.querySelectorAll("#team .subnav-btn"));
  const subContents = Array.from(document.querySelectorAll("#team .sub-content"));

  function getActiveTeamCards() {
    const activeSub = document.querySelector("#team .sub-content.active") || subContents[0];
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
      const haystack = `${display} ${nameText} ${roleText}`.trim();
      card.style.display = !q || haystack.includes(q) ? "" : "none";
    });
  }

  subnavBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = (btn.dataset.subTarget || "").trim();
      if (!targetId) return;

      subnavBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      subContents.forEach((sc) => sc.classList.toggle("active", sc.id === targetId));
      applyTeamSearchFilter();
    });
  });

  teamSearch?.addEventListener("input", applyTeamSearchFilter);
  applyTeamSearchFilter();

  /* =======================
     PROJECT FILTERS + SEARCH
  ======================== */
  const projectBtns = Array.from(document.querySelectorAll("#projects .project-filter-btn"));
  const projectCards = Array.from(document.querySelectorAll("#projects .project-card"));
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
    btn.addEventListener("click", (e) => {
      e.preventDefault();
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
  const commCards = Array.from(document.querySelectorAll("#communications .comm-card"));
  commCards.forEach((card, index) => {
    // fade-in if CSS uses this class
    window.setTimeout(() => card.classList.add("comm-visible"), 120 * index);

    const url = card.dataset.link;
    if (!url) return;

    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    const openCardLink = () => window.open(url, "_blank", "noopener");

    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      openCardLink();
    });

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

    window.setTimeout(() => {
      toast.classList.add("toast-hide");
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
  }

  const helpForm = document.getElementById("helpForm");
  helpForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Help request sent. We’ll review it soon.", "success");
    helpForm.reset();
  });
});