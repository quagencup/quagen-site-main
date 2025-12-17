// js/card-click.js

class CardClickHandler {
    constructor() {
        this.overlay = null;
        this.currentExpandedCard = null;
        this.currentTypingTimer = null;
        this.init();
        this.initCommunicationCards(); // Initialize communication cards
    }

    init() {
        // Create the dark blurred overlay once
        this.createOverlay();

        // Attach click listeners to all profile cards
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Let normal links inside card work normally
                if (e.target.closest('a')) return;

                e.stopPropagation();
                this.expandCard(card);
            });
        });
    }

    /* ----------------------------------------------
   Communication Cards (accordion-style)
---------------------------------------------- */
initCommunicationCards() {
    const commCards = document.querySelectorAll('.comm-card');

    commCards.forEach(card => {
        const link = card.dataset.link;
        const openBtn = card.querySelector('.comm-open-btn');

        // Clicking the card: toggle accordion
        card.addEventListener('click', (e) => {
            // If click is on the "Open" button or inside a link, don't toggle accordion
            if (e.target.closest('.comm-open-btn') || e.target.closest('a')) {
                return;
            }

            // Make it accordion style: only one expanded at a time
            const alreadyExpanded = card.classList.contains('comm-expanded');

            // Collapse all cards first
            document.querySelectorAll('.comm-card.comm-expanded')
                .forEach(c => c.classList.remove('comm-expanded'));

            // If this wasn't already expanded, expand it
            if (!alreadyExpanded) {
                card.classList.add('comm-expanded');
            }
        });

        // Clicking the "Open" button: open link in new tab
        if (openBtn && link) {
            openBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // don't toggle accordion
                window.open(link, '_blank', 'noopener,noreferrer');
            });
        }

        // Pointer cursor for entire card
        card.style.cursor = 'pointer';
    });
}
    /* ----------------------------------------------
       Profile Popup Logic (Existing System)
    ---------------------------------------------- */

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'card-overlay';
        document.body.appendChild(this.overlay);

        // Clicking overlay closes popup
        this.overlay.addEventListener('click', () => this.closeCard());

        // ESC key closes popup
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentExpandedCard) {
                this.closeCard();
            }
        });
    }

    expandCard(originalCard) {
        // Close any existing popup
        this.closeCard();

        const profileImg = originalCard.querySelector('.profile-img');
        const nameTag = originalCard.querySelector('.name-tag');
        const socialLinks = originalCard.querySelector('.social-links');

        if (!profileImg || !nameTag) {
            console.warn("Card missing .profile-img or .name-tag");
            return;
        }

        // Use data-description
        const description = originalCard.dataset.description?.trim()
            || "This user has not added a profile description yet.";

        // Roles → pills for popup
        const rolesRaw = (originalCard.dataset.roles || '').trim();
        let rolesHTML = '';

        if (rolesRaw) {
            const roles = rolesRaw.split(',')
                .map(role => role.trim())
                .filter(Boolean);

            if (roles.length > 0) {
                rolesHTML =
                    `<div class="role-pills-expanded">
                        ${roles.map(r => `<span class="role-pill">${r}</span>`).join('')}
                     </div>`;
            }
        }

        // Build socials
        let socialLinksHTML = "";
        if (socialLinks) {
            const links = socialLinks.querySelectorAll('.social-link');
            if (links.length > 0) {
                socialLinksHTML = `<div class="social-links-expanded">`;
                links.forEach(link => {
                    const img = link.querySelector('img');
                    if (!img) return;

                    socialLinksHTML += `
                        <a href="${link.href}" target="_blank"
                           rel="noopener noreferrer"
                           class="social-link-expanded">
                           <img src="${img.src}" alt="${img.alt}">
                        </a>
                    `;
                });
                socialLinksHTML += `</div>`;
            }
        }

        // Build expanded popup card
        const expandedCard = document.createElement("div");
        expandedCard.className = "card-expanded";

        expandedCard.innerHTML = `
            <div class="card-expanded-inner">
                <div class="card-bg-blur"></div>

                <div class="card-expanded-content">
                    <div class="profile-row-expanded">
                        <img src="${profileImg.src}"
                             alt="${profileImg.alt}"
                             class="profile-img-expanded">
                        
                        <div class="name-tag-expanded">
                            ${nameTag.innerHTML}
                        </div>
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

        // Close when clicking outside popup
        expandedCard.addEventListener("click", (e) => {
            if (!e.target.closest(".card-expanded-inner")) {
                this.closeCard();
            }
        });

        document.body.appendChild(expandedCard);

        this.overlay.classList.add("active");
        this.currentExpandedCard = expandedCard;

        document.body.style.overflow = "hidden";

        // Start typing text animation
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

        if (this.currentExpandedCard) {
            document.body.removeChild(this.currentExpandedCard);
            this.currentExpandedCard = null;
        }

        this.overlay?.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// Initialize after DOM loads
document.addEventListener("DOMContentLoaded", () => {
    new CardClickHandler();
});
