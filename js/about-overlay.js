(function () {
  "use strict";

  /* ---------------------------------------------------------
     ABOUT OVERLAY (open / close / scroll lock)
  --------------------------------------------------------- */
  var overlay = document.getElementById("aboutOverlay");
  var overlayScroll = document.getElementById("aboutOverlayScroll");
  var portalTrigger = document.getElementById("aboutPortalTrigger");
  var altTriggers = document.querySelectorAll("[data-open-portal]");
  var closeBtns = overlay ? overlay.querySelectorAll("[data-close-overlay]") : [];

  function openAboutOverlay() {
    if (!overlay) return;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("about-overlay-open");
    if (overlayScroll) overlayScroll.scrollTop = 0;
  }

  function closeAboutOverlay() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("about-overlay-open");
    closeExpandedCard();
    closeProjectModal();
  }

  if (portalTrigger) {
    portalTrigger.addEventListener("click", openAboutOverlay);
    portalTrigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        openAboutOverlay();
      }
    });
  }
  altTriggers.forEach(function (el) {
    el.addEventListener("click", openAboutOverlay);
  });
  closeBtns.forEach(function (el) {
    el.addEventListener("click", closeAboutOverlay);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.getElementById("projectModal") &&
        document.getElementById("projectModal").classList.contains("is-open")) {
      closeProjectModal();
      return;
    }
    if (isCardExpanded()) {
      closeExpandedCard(true);
      return;
    }
    if (overlay && overlay.classList.contains("is-open")) {
      closeAboutOverlay();
    }
  });

  /* ---------------------------------------------------------
     BIOLINK-STYLE CARD EXPAND (Founders / Mods / Admins /
     Project Managers / Developers / Testers)
  --------------------------------------------------------- */
  var cardOverlay, cardExpanded, cardExpandedContent, cardBgBlur;

  function buildCardOverlayDom() {
    cardOverlay = document.createElement("div");
    cardOverlay.className = "card-overlay";

    cardExpanded = document.createElement("div");
    cardExpanded.className = "card-expanded";

    var inner = document.createElement("div");
    inner.className = "card-expanded-inner";

    cardBgBlur = document.createElement("div");
    cardBgBlur.className = "card-bg-blur";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "about-overlay-close card-expanded-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", function () { closeExpandedCard(true); });

    cardExpandedContent = document.createElement("div");
    cardExpandedContent.className = "card-expanded-content";

    inner.appendChild(cardBgBlur);
    inner.appendChild(closeBtn);
    inner.appendChild(cardExpandedContent);
    cardExpanded.appendChild(inner);

    document.body.appendChild(cardOverlay);
    document.body.appendChild(cardExpanded);

    cardOverlay.addEventListener("click", function () { closeExpandedCard(true); });
  }

  function isCardExpanded() {
    return !!(cardOverlay && cardOverlay.classList.contains("active"));
  }

  // navigate=true means "the user actively closed this" (X button,
  // backdrop click, Escape) so we should also update the URL back.
  function closeExpandedCard(navigate) {
    if (!cardOverlay) return;
    cardOverlay.classList.remove("active");
    cardExpanded.style.display = "none";
    if (typeof window.stopQuagenHoverPreview === "function") {
      window.stopQuagenHoverPreview();
    }
    if (navigate && /^\/@/.test(window.location.pathname)) {
      try { history.pushState({ quagenProfile: null }, "", "/"); }
      catch (err) { /* file:// pages block pushState — safe to ignore */ }
    }
  }

  function getCardHandle(cardEl) {
    var fromAttr = (cardEl.getAttribute("data-display") || "").trim();
    if (fromAttr) return fromAttr.replace(/^@/, "");

    var nameTitle = cardEl.querySelector(".name-title");
    if (!nameTitle) return "";
    // First child span is always the handle, regardless of whether
    // i18n.js has stripped its data-i18n attribute after translating.
    var handleEl = nameTitle.querySelector("span");
    var raw = (handleEl ? handleEl.textContent : nameTitle.textContent).trim();
    return raw.replace(/^@/, "");
  }

  function openExpandedCard(cardEl, opts) {
    opts = opts || {};
    if (!cardOverlay) buildCardOverlayDom();

    // Don't rely on the implicit mouseleave to stop the card's
    // hover-preview music — the browser doesn't always re-check
    // hover state just because new content now covers the cursor
    // without the mouse actually moving. Stop it explicitly so the
    // main track reliably resumes the moment a profile opens.
    if (typeof window.stopQuagenHoverPreview === "function") {
      window.stopQuagenHoverPreview();
    }

    var img = cardEl.querySelector(".profile-img");
    var nameTitle = cardEl.querySelector(".name-title");
    var roleTag = cardEl.querySelector(".role-tag");
    var socialLinks = cardEl.querySelectorAll(".social-links a");
    var description = cardEl.getAttribute("data-description") || "";

    // Use this profile's own photo (blurred) as the page backdrop
    // instead of one static image for every profile.
    if (img && img.getAttribute("src")) {
      cardBgBlur.style.backgroundImage = 'url("' + img.getAttribute("src") + '")';
    }

    cardExpandedContent.innerHTML = "";

    var profileRow = document.createElement("div");
    profileRow.className = "profile-row-expanded";

    if (img) {
      var imgExp = document.createElement("img");
      imgExp.className = "profile-img-expanded";
      imgExp.src = img.getAttribute("src");
      imgExp.alt = img.getAttribute("alt") || "";
      profileRow.appendChild(imgExp);
    }

    var nameWrap = document.createElement("div");
    if (nameTitle) {
      var h2 = document.createElement("h2");
      h2.className = "name-title";
      h2.innerHTML = nameTitle.innerHTML;
      nameWrap.appendChild(h2);
    }
    if (roleTag) {
      var span = document.createElement("div");
      span.className = roleTag.className;
      span.textContent = roleTag.textContent;
      nameWrap.appendChild(span);
    }
    profileRow.appendChild(nameWrap);
    cardExpandedContent.appendChild(profileRow);

    if (description) {
      var descBox = document.createElement("div");
      descBox.className = "discord-section";
      descBox.textContent = description;
      cardExpandedContent.appendChild(descBox);
    }

    if (socialLinks && socialLinks.length) {
      var socialWrap = document.createElement("div");
      socialWrap.className = "social-links-expanded";
      socialLinks.forEach(function (a) {
        var link = document.createElement("a");
        link.className = "social-link-expanded";
        link.href = a.getAttribute("href");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        var img2 = a.querySelector("img");
        if (img2) {
          var clonedImg = document.createElement("img");
          clonedImg.src = img2.getAttribute("src");
          clonedImg.alt = img2.getAttribute("alt") || "";
          link.appendChild(clonedImg);
        }
        socialWrap.appendChild(link);
      });
      cardExpandedContent.appendChild(socialWrap);
    }

    cardExpanded.style.display = "flex";
    cardOverlay.classList.add("active");

    var handle = getCardHandle(cardEl);
    if (handle && !opts.skipNavigate) {
      try { history.pushState({ quagenProfile: handle }, "", "/@" + handle); }
      catch (err) { /* file:// pages block pushState — safe to ignore */ }
    }
  }

  function findCardByHandle(handle) {
    var cards = document.querySelectorAll(".card");
    for (var i = 0; i < cards.length; i++) {
      if (getCardHandle(cards[i]).toLowerCase() === handle.toLowerCase()) return cards[i];
    }
    return null;
  }

  document.addEventListener("click", function (e) {
    var card = e.target.closest ? e.target.closest(".card") : null;
    if (!card) return;
    // Ignore clicks that landed directly on a social icon link
    if (e.target.closest(".social-links")) return;
    openExpandedCard(card);
  });

  // Support the browser back/forward buttons for /@handle links.
  window.addEventListener("popstate", function () {
    var match = window.location.pathname.match(/^\/@([\w.\-]+)\/?$/);
    if (!match) {
      closeExpandedCard(false);
      return;
    }
    var card = findCardByHandle(match[1]);
    if (card) {
      openAboutOverlay();
      openExpandedCard(card, { skipNavigate: true });
    }
  });

  // Deep link support: if the page is loaded directly at
  // quagen.lol/@handle, open straight to that profile.
  // NOTE: this only works if your host is configured to serve
  // index.html for unknown paths (SPA-style fallback routing) —
  // otherwise the host will 404 before this script ever runs.
  (function openFromDeepLinkOnLoad() {
    var match = window.location.pathname.match(/^\/@([\w.\-]+)\/?$/);
    if (!match) return;
    var card = findCardByHandle(match[1]);
    if (!card) return;
    openAboutOverlay();
    openExpandedCard(card, { skipNavigate: true });
  })();

  /* ---------------------------------------------------------
     PROJECT GALLERY -> PROJECT MODAL
  --------------------------------------------------------- */
  var projectModal = document.getElementById("projectModal");
  var projectModalBody = document.getElementById("projectModalBody");
  var projectCloseBtns = projectModal ? projectModal.querySelectorAll("[data-close-project]") : [];

  function openProjectModal(tile) {
    if (!projectModal || !projectModalBody) return;

    var title = tile.getAttribute("data-title") || "";
    var image = tile.getAttribute("data-image") || "";
    var desc = tile.getAttribute("data-desc") || "";
    var devs = tile.getAttribute("data-developers") || "";
    var contributors = tile.getAttribute("data-contributors") || "";
    var link = tile.getAttribute("data-link") || "";
    var status = tile.getAttribute("data-status") || "";

    var devTags = devs.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var contribTags = contributors.split(",").map(function (s) { return s.trim(); }).filter(Boolean);

    projectModalBody.innerHTML =
      '<div class="pm-thumb"><img src="' + image + '" alt=""></div>' +
      '<h2 class="pm-title">' + title + (status ? ' <span class="project-tile-status">' + status + '</span>' : '') + '</h2>' +
      '<p class="pm-desc">' + desc + '</p>' +
      '<div class="pm-meta">' +
        (devTags.length ? '<div class="pm-meta-row"><strong>Developers</strong><div class="pm-tags">' +
          devTags.map(function (d) { return '<span class="pm-tag">' + d + '</span>'; }).join("") +
          '</div></div>' : '') +
        (contribTags.length ? '<div class="pm-meta-row"><strong>Contributors</strong><div class="pm-tags">' +
          contribTags.map(function (c) { return '<span class="pm-tag">' + c + '</span>'; }).join("") +
          '</div></div>' : '') +
      '</div>' +
      (link ? '<a class="pm-link" href="' + link + '" target="_blank" rel="noopener noreferrer">View Project</a>' : '');

    projectModal.classList.add("is-open");
    projectModal.setAttribute("aria-hidden", "false");
  }

  function closeProjectModal() {
    if (!projectModal) return;
    projectModal.classList.remove("is-open");
    projectModal.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("click", function (e) {
    var tile = e.target.closest ? e.target.closest(".project-tile") : null;
    if (!tile) return;
    if (!tile.hasAttribute("data-title")) return; // plain link tile (e.g. Communications) — let it navigate
    e.preventDefault();
    openProjectModal(tile);
  });

  projectCloseBtns.forEach(function (el) {
    el.addEventListener("click", closeProjectModal);
  });


  var ROUTED_SECTION_IDS = ["about", "help", "changelog", "tos", "privacy", "status"];

  var backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "section-back-btn";
  backBtn.textContent = "← Back to About";
  document.body.appendChild(backBtn);

  function syncWithCurrentSection() {
    var hash = window.location.hash.replace("#", "").trim();
    var current = ROUTED_SECTION_IDS.indexOf(hash) !== -1 ? hash : "about";

    backBtn.classList.toggle("is-visible", current !== "about");

    if (current !== "about") {
      closeAboutOverlay();
      closeProjectModal();
    }
  }

  backBtn.addEventListener("click", function () {
    window.location.hash = "#about";
  });

  var statusBtn = document.querySelector("[data-open-status]");
  if (statusBtn) {
    statusBtn.addEventListener("click", function () {
      window.location.hash = "#status";
    });
  }

  window.addEventListener("hashchange", syncWithCurrentSection);
  syncWithCurrentSection();

})();