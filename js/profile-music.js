// js/profile-music.js

document.addEventListener("DOMContentLoaded", () => {
    // =====================================================
    // GLOBAL AUDIO BUS (controls global + per-card mute)
    // =====================================================
    class GlobalAudioBus {
        constructor() {
            this.globalMuted = false;
            this.cardMuted = new WeakMap(); // card -> bool
            this.cardAudios = new Map();    // card -> audio
            this.otherAudios = new Set();   // anthem etc.
            this.listeners = [];
        }

        onChange(fn) {
            if (typeof fn === "function") {
                this.listeners.push(fn);
            }
        }

        _emit() {
            this.listeners.forEach(fn => {
                try { fn(this); } catch (_) {}
            });
        }

        registerCardAudio(cardEl, audio) {
            if (!cardEl || !audio) return;
            this.cardAudios.set(cardEl, audio);
            this._syncAudioForCard(cardEl, audio);
        }

        registerOtherAudio(audio) {
            if (!audio) return;
            this.otherAudios.add(audio);
            audio.muted = this.globalMuted;
        }

        // main sync
        _syncAll() {
            this.cardAudios.forEach((audio, card) => {
                this._syncAudioForCard(card, audio);
            });

            this.otherAudios.forEach(audio => {
                audio.muted = this.globalMuted;
            });

            this._emit();
        }

        _syncAudioForCard(card, audio) {
            const cardMute = !!this.cardMuted.get(card);
            audio.muted = this.globalMuted || cardMute;
        }

        toggleGlobalMuted() {
            this.globalMuted = !this.globalMuted;
            this._syncAll();
        }

        setGlobalMuted(val) {
            this.globalMuted = !!val;
            this._syncAll();
        }

        isGlobalMuted() {
            return this.globalMuted;
        }

        toggleCardMuted(card) {
            if (!card) return;
            const current = !!this.cardMuted.get(card);
            this.cardMuted.set(card, !current);
            const audio = this.cardAudios.get(card);
            if (audio) {
                this._syncAudioForCard(card, audio);
            }
            this._emit();
        }

        setCardMuted(card, val) {
            if (!card) return;
            this.cardMuted.set(card, !!val);
            const audio = this.cardAudios.get(card);
            if (audio) {
                this._syncAudioForCard(card, audio);
            }
            this._emit();
        }

        isCardMuted(card) {
            return !!this.cardMuted.get(card);
        }
    }

    if (!window.GlobalAudioController) {
        window.GlobalAudioController = new GlobalAudioBus();
    }
    const bus = window.GlobalAudioController;

    // =====================================================
    // GLOBAL MUTE BUTTON (top-right)
    // =====================================================
    const globalMuteBtn = document.getElementById("globalMuteBtn");

    function updateGlobalMuteButton() {
        if (!globalMuteBtn) return;
        const img = globalMuteBtn.querySelector("img");
        const muted = bus.isGlobalMuted();

        globalMuteBtn.classList.toggle("muted", muted);
        globalMuteBtn.setAttribute("aria-pressed", muted ? "true" : "false");

        if (img) {
            img.src = muted
                ? "assets/extraicons/muteicon.png"
                : "assets/extraicons/unmuteicon.png";
        }
    }

    if (globalMuteBtn) {
        globalMuteBtn.addEventListener("click", () => {
            bus.toggleGlobalMuted();
            updateGlobalMuteButton();
            updateAllCardMuteButtonsVisuals();
        });
    }

    bus.onChange(() => {
        updateGlobalMuteButton();
        updateAllCardMuteButtonsVisuals();
    });

    // =====================================================
    // CARD AUDIO + PER-CARD MUTE
    // =====================================================
    const musicCards = document.querySelectorAll(".card[data-music]");

    function setupCardAudio(card) {
        const src = card.dataset.music;
        if (!src) return;

        const audio = new Audio(src);
        audio.loop = true;
        audio.volume = 0.6;

        bus.registerCardAudio(card, audio);

        // click card to play/pause (ignore buttons/links)
        card.addEventListener("click", (e) => {
            if (e.target.closest(".card-mute-btn")) return;
            if (e.target.closest("a")) return;

            if (audio.paused) {
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
        });

        const muteBtn = card.querySelector("[data-card-mute]");
        if (muteBtn) {
            const img = muteBtn.querySelector("img");

            function updateCardMuteButtonVisual() {
                const muted = bus.isCardMuted(card) || bus.isGlobalMuted();
                muteBtn.classList.toggle("muted", muted);
                muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
                if (img) {
                    img.src = muted
                        ? "assets/extraicons/muteicon.png"
                        : "assets/extraicons/unmuteicon.png";
                }
            }

            muteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                bus.toggleCardMuted(card);
                updateCardMuteButtonVisual();
            });

            updateCardMuteButtonVisual();
            bus.onChange(updateCardMuteButtonVisual);
        }
    }

    function updateAllCardMuteButtonsVisuals() {
        const cards = document.querySelectorAll(".card[data-music]");
        cards.forEach(card => {
            const muteBtn = card.querySelector("[data-card-mute]");
            if (!muteBtn) return;
            const img = muteBtn.querySelector("img");
            const muted = bus.isCardMuted(card) || bus.isGlobalMuted();
            muteBtn.classList.toggle("muted", muted);
            muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
            if (img) {
                img.src = muted
                    ? "assets/extraicons/muteicon.png"
                    : "assets/extraicons/unmuteicon.png";
            }
        });
    }

    musicCards.forEach(setupCardAudio);
    updateGlobalMuteButton();
});
