// js/card-click.js

class CardClickHandler {
    constructor() {
        this.overlay = null;
        this.currentExpandedCard = null;

        
        // e.g. 'https://api.quagen.lol' or 'https://your-app.onrender.com'
        this.apiBaseUrl = 'https://api.quagen.lol';

        this.init();
    }

    init() {
        // Create the dark blurred overlay once
        this.createOverlay();

        // Attach click listeners to all profile cards
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                // If the user clicks a real link inside the card,
                // let the link work normally (open Discord/Roblox).
                if (e.target.closest('a')) return;

                e.stopPropagation();
                this.expandCard(card);
            });
        });
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'card-overlay';
        document.body.appendChild(this.overlay);

        // Clicking the overlay closes the popup
        this.overlay.addEventListener('click', () => {
            this.closeCard();
        });

        // Pressing Escape also closes the popup
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentExpandedCard) {
                this.closeCard();
            }
        });
    }

    expandCard(originalCard) {
        // Close any already-open popup
        this.closeCard();

        // Grab data from the small card
        const profileImg = originalCard.querySelector('.profile-img');
        const nameTag = originalCard.querySelector('.name-tag');
        const socialLinks = originalCard.querySelector('.social-links');

        if (!profileImg || !nameTag) {
            console.warn('Card is missing .profile-img or .name-tag');
            return;
        }

        // Unique key per profile for server-side view counting
        const profileKey = profileImg.dataset.profileId || profileImg.alt || 'defaultProfile';

        // Build socials HTML for expanded view
        let socialLinksHTML = '';
        if (socialLinks) {
            const links = socialLinks.querySelectorAll('.social-link');
            if (links.length > 0) {
                socialLinksHTML = '<div class="social-links-expanded">';
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
                socialLinksHTML += '</div>';
            }
        }

        // Create expanded card wrapper
        const expandedCard = document.createElement('div');
        expandedCard.className = 'card-expanded';

        // Initial view count shown as "..." until server responds
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

                    <section class="discord-section">
                        <p>Connect with me and see more details about this profile.</p>
                    </section>

                    ${socialLinksHTML}

                    <div class="stats-expanded">
                        <span class="view-counter">
                            <img src="assets/viewsicon.png" alt="Views" class="view-icon">
                            <span class="view-count-number">...</span>
                        </span>
                        <span class="close-hint">Click Outside or Press Esc</span>
                    </div>
                </div>
            </div>
        `;

        // Close when clicking outside the inner panel
        expandedCard.addEventListener('click', (e) => {
            if (!e.target.closest('.card-expanded-inner')) {
                this.closeCard();
            }
        });

        // Add popup to DOM
        document.body.appendChild(expandedCard);

        // Activate overlay & store reference
        this.overlay.classList.add('active');
        this.currentExpandedCard = expandedCard;

        // Prevent background scrolling
        document.body.style.overflow = 'hidden';

        // 🔐 Ask your Node API to count + return secure views
        const apiUrl = `${this.apiBaseUrl}/api/profile-view`;

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: profileKey })
        })
        .then(res => res.json())
        .then(data => {
            const span = expandedCard.querySelector('.view-count-number');
            if (!span) return;

            if (data && data.ok && typeof data.totalViews === 'number') {
                span.textContent = data.totalViews;
            } else {
                span.textContent = '—';
            }
        })
        .catch(err => {
            console.error('View API error:', err);
            const span = expandedCard.querySelector('.view-count-number');
            if (span) span.textContent = '—';
        });
    }

    closeCard() {
        if (this.currentExpandedCard) {
            document.body.removeChild(this.currentExpandedCard);
            this.currentExpandedCard = null;
        }

        if (this.overlay) {
            this.overlay.classList.remove('active');
        }

        // Re-enable scrolling
        document.body.style.overflow = '';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CardClickHandler();
});
