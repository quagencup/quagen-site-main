// js/card-click.js
class CardClickHandler {
  constructor() {
    this.overlay = null;
    this.currentExpandedCard = null;
    this.currentTypingTimer = null;
    this.lastOpenedOriginalCard = null;

    this.init();
    this.initCommunicationCards();
  }

  init() {
    this.createOverlay();

    const cards = document.querySelectorAll(".card");
    cards.forEach((card) => {
      card.addEventListener("click", (e) => {
        // allow links to work
        if (e.target.closest("a")) return;
        // ignore card mute button clicks
        if (e.target.closest("[data-card-mute]")) return;

        e.stopPropagation();
        this.expandCard(card);
      });
    });
  }

  initCommunicationCards() {
    const commCards = document.querySelectorAll(".comm-card");

    commCards.forEach((card) => {
      const link = card.dataset.link;
      const openBtn = card.querySelector(".comm-open-btn");

      card.addEventListener("click", (e) => {
        if (e.target.closest(".comm-open-btn") || e.target.closest("a")) return;

        const alreadyExpanded = card.classList.contains("comm-expanded");
        document
          .querySelectorAll(".comm-card.comm-expanded")
          .forEach((c) => c.classList.remove("comm-expanded"));

        if (!alreadyExpanded) card.classList.add("comm-expanded");
      });

      if (openBtn && link) {
        openBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          window.open(link, "_blank", "noopener,noreferrer");
        });
      }

      card.style.cursor = "pointer";
    });
  }

  createOverlay() {
    this.overlay = document.createElement("div");
    this.overlay.className = "card-overlay";
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener("click", () => this.closeCard());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.currentExpandedCard) this.closeCard();
    });
  }

  expandCard(originalCard) {
    // close any existing popup
    this.closeCard();

    // ---- Notify music system popup is open for THIS card
    document.dispatchEvent(
      new CustomEvent("cardpopup:open", { detail: { card: originalCard } })
    );
    this.lastOpenedOriginalCard = originalCard;

    const profileImg = originalCard.querySelector(".profile-img");
    const nameTag = originalCard.querySelector(".name-tag");
    const socialLinks = originalCard.querySelector(".social-links");

    if (!profileImg || !nameTag) {
      console.warn("Card missing .profile-img or .name-tag");
      return;
    }

    const description =
      originalCard.dataset.description?.trim() ||
      "This user has not added a profile description yet.";

    const rolesRaw = (originalCard.dataset.roles || "").trim();
    let rolesHTML = "";
    if (rolesRaw) {
      const roles = rolesRaw
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      if (roles.length) {
        rolesHTML = `
          <div class="role-pills-expanded">
            ${roles.map((r) => `<span class="role-pill">${r}</span>`).join("")}
          </div>
        `;
      }
    }

    let socialLinksHTML = "";
    if (socialLinks) {
      const links = socialLinks.querySelectorAll(".social-link");
      if (links.length) {
        socialLinksHTML = `<div class="social-links-expanded">`;
        links.forEach((link) => {
          const img = link.querySelector("img");
          if (!img) return;
          socialLinksHTML += `
            <a href="${link.href}" target="_blank" rel="noopener noreferrer" class="social-link-expanded">
              <img src="${img.src}" alt="${img.alt}">
            </a>
          `;
        });
        socialLinksHTML += `</div>`;
      }
    }

    const expandedCard = document.createElement("div");
    expandedCard.className = "card-expanded";

    expandedCard.innerHTML = `
      <div class="card-expanded-inner">
        <div class="card-bg-blur"></div>

        <div class="card-expanded-content">
          <div class="profile-row-expanded">
            <img src="${profileImg.src}" alt="${profileImg.alt}" class="profile-img-expanded">
            <div class="name-tag-expanded">${nameTag.innerHTML}</div>
          </div>

          ${rolesHTML}

          <section class="discord-section">
            <p>
              <span class="typed-description"></span>
              <span class="typing-cursor">|</span>
            </p>
          </section>

          ${socialLinksHTML}

          <div class="stats-expanded">
            <span class="close-hint">Click Outside or Press Esc</span>
          </div>
        </div>
      </div>
    `;

    expandedCard.addEventListener("click", (e) => {
      if (!e.target.closest(".card-expanded-inner")) this.closeCard();
    });

    document.body.appendChild(expandedCard);
    this.overlay.classList.add("active");
    this.currentExpandedCard = expandedCard;

    document.body.style.overflow = "hidden";
    this.startTypingAnimation(expandedCard, description);
  }

  startTypingAnimation(expandedCard, fullText) {
    if (this.currentTypingTimer) clearInterval(this.currentTypingTimer);

    const target = expandedCard.querySelector(".typed-description");
    if (!target) return;

    target.textContent = "";
    let index = 0;

    this.currentTypingTimer = setInterval(() => {
      if (!this.currentExpandedCard || !document.body.contains(target)) {
        clearInterval(this.currentTypingTimer);
        return;
      }
      if (index >= fullText.length) {
        clearInterval(this.currentTypingTimer);
        return;
      }
      target.textContent += fullText.charAt(index);
      index++;
    }, 25);
  }

  closeCard() {
    if (this.currentTypingTimer) {
      clearInterval(this.currentTypingTimer);
      this.currentTypingTimer = null;
    }

    // ---- Notify music system popup is closing for that card
    if (this.lastOpenedOriginalCard) {
      document.dispatchEvent(
        new CustomEvent("cardpopup:close", { detail: { card: this.lastOpenedOriginalCard } })
      );
      this.lastOpenedOriginalCard = null;
    }

    if (this.currentExpandedCard) {
      document.body.removeChild(this.currentExpandedCard);
      this.currentExpandedCard = null;
    }

    this.overlay?.classList.remove("active");
    document.body.style.overflow = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CardClickHandler();
});
