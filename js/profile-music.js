// js/profile-music.js
// - Global mute button (#globalMuteBtn) mutes ONLY anthem (handled in js/audio.js by calling bus.registerAnthemAudio)
// - Card mute buttons (data-card-mute) mute ONLY that card
// - Leaving a card fades out + stops that card audio
// - Opening/closing popup (via window.CardPopupAudioHooks) stops any playing card audio

document.addEventListener("DOMContentLoaded", () => {
  // =====================================================
  // AUDIO BUS (anthem separate from per-card)
  // =====================================================
  class GlobalAudioBus {
    constructor() {
      this.anthemMuted = false;          // ONLY anthem
      this.cardMuted = new WeakMap();    // card -> bool
      this.cardAudios = new Map();       // card -> audio

      this.anthemAudio = null;           // anthem audio reference
      this.listeners = [];
    }

    onChange(fn) {
      if (typeof fn === "function") this.listeners.push(fn);
    }

    _emit() {
      this.listeners.forEach((fn) => {
        try { fn(this); } catch (_) {}
      });
    }

    // -------- Anthem (only) --------
    registerAnthemAudio(audio) {
      if (!audio) return;
      this.anthemAudio = audio;
      audio.muted = this.anthemMuted;
      this._emit();
    }

    toggleAnthemMuted() {
      this.anthemMuted = !this.anthemMuted;
      if (this.anthemAudio) this.anthemAudio.muted = this.anthemMuted;
      this._emit();
    }

    setAnthemMuted(val) {
      this.anthemMuted = !!val;
      if (this.anthemAudio) this.anthemAudio.muted = this.anthemMuted;
      this._emit();
    }

    isAnthemMuted() {
      return !!this.anthemMuted;
    }

    // -------- Cards (only) --------
    registerCardAudio(cardEl, audio) {
      if (!cardEl || !audio) return;
      this.cardAudios.set(cardEl, audio);
      this._syncCard(cardEl, audio);
      this._emit();
    }

    _syncCard(cardEl, audio) {
      const muted = !!this.cardMuted.get(cardEl);
      audio.muted = muted; // IMPORTANT: anthem mute does NOT affect cards
    }

    toggleCardMuted(cardEl) {
      if (!cardEl) return;
      const current = !!this.cardMuted.get(cardEl);
      this.cardMuted.set(cardEl, !current);
      const audio = this.cardAudios.get(cardEl);
      if (audio) this._syncCard(cardEl, audio);
      this._emit();
    }

    setCardMuted(cardEl, val) {
      if (!cardEl) return;
      this.cardMuted.set(cardEl, !!val);
      const audio = this.cardAudios.get(cardEl);
      if (audio) this._syncCard(cardEl, audio);
      this._emit();
    }

    isCardMuted(cardEl) {
      return !!this.cardMuted.get(cardEl);
    }

    // -------- Utilities --------
    stopAllCardAudio() {
      this.cardAudios.forEach((audio) => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
      });
    }

    stopCardAudio(cardEl) {
      const audio = this.cardAudios.get(cardEl);
      if (!audio) return;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {}
    }
  }

  // Create bus once
  if (!window.GlobalAudioController) {
    window.GlobalAudioController = new GlobalAudioBus();
  }
  const bus = window.GlobalAudioController;

  // =====================================================
  // GLOBAL MUTE BUTTON (top-right) -> ANTHEM ONLY
  // =====================================================
  const globalMuteBtn = document.getElementById("globalMuteBtn");

  function updateGlobalMuteButton() {
    if (!globalMuteBtn) return;
    const img = globalMuteBtn.querySelector("img");
    const muted = bus.isAnthemMuted();

    globalMuteBtn.classList.toggle("muted", muted);
    globalMuteBtn.setAttribute("aria-pressed", muted ? "true" : "false");

    if (img) {
      img.src = muted
        ? "assets/extraicons/muteicon.png"
        : "assets/extraicons/unmuteicon.png";
      img.alt = muted ? "muted" : "unmuted";
    }
  }

  if (globalMuteBtn) {
    globalMuteBtn.addEventListener("click", () => {
      bus.toggleAnthemMuted();
      updateGlobalMuteButton();
    });
  }

  bus.onChange(updateGlobalMuteButton);
  updateGlobalMuteButton();

  // =====================================================
  // Fade helper (cards)
  // =====================================================
  function fadeOutAndStop(audio, duration = 250) {
    if (!audio) return;
    const startVolume = typeof audio.volume === "number" ? audio.volume : 0.6;

    // If already paused, just reset
    if (audio.paused) {
      try { audio.currentTime = 0; } catch (_) {}
      return;
    }

    const steps = 10;
    const stepTime = Math.max(10, duration / steps);
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const next = Math.max(0, startVolume * (1 - step / steps));
      audio.volume = next;

      if (step >= steps) {
        clearInterval(interval);
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
        // reset for next play
        audio.volume = startVolume;
      }
    }, stepTime);
  }

  // =====================================================
  // CARD AUDIO + PER-CARD MUTE + LEAVE FADE
  // =====================================================
  const musicCards = document.querySelectorAll(".card[data-music]");

  function setupCardAudio(card) {
    const src = (card.dataset.music || "").trim();
    if (!src) return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.6;

    bus.registerCardAudio(card, audio);

    // Clicking the card toggles play/pause
    // Ignore mute button & links inside card
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-card-mute]")) return;
      if (e.target.closest("a")) return;

      // Only play if NOT muted for that card
      if (bus.isCardMuted(card)) return;

      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        // pause without resetting time (feels nicer)
        audio.pause();
      }
    });

    // Leaving card -> fade out and stop (your requirement)
    card.addEventListener("mouseleave", () => {
      if (!audio.paused) fadeOutAndStop(audio, 240);
    });

    // Per-card mute button
    const muteBtn = card.querySelector("[data-card-mute]");
    if (muteBtn) {
      const img = muteBtn.querySelector("img");

      function updateCardMuteButtonVisual() {
        const muted = bus.isCardMuted(card);
        muteBtn.classList.toggle("muted", muted);
        muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");

        if (img) {
          img.src = muted
            ? "assets/extraicons/muteicon.png"
            : "assets/extraicons/unmuteicon.png";
          img.alt = muted ? "muted" : "unmuted";
        }
      }

      muteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        bus.toggleCardMuted(card);

        // If muting while playing -> stop immediately (fade feels best)
        if (bus.isCardMuted(card) && !audio.paused) {
          fadeOutAndStop(audio, 200);
        }

        updateCardMuteButtonVisual();
      });

      bus.onChange(updateCardMuteButtonVisual);
      updateCardMuteButtonVisual();
    }
  }

  musicCards.forEach(setupCardAudio);

  // =====================================================
  // Hooks for popup open/close (card-click.js calls these)
  // =====================================================
  window.CardPopupAudioHooks = window.CardPopupAudioHooks || {};
  window.CardPopupAudioHooks.stopAllCards = () => bus.stopAllCardAudio();
  window.CardPopupAudioHooks.stopCard = (cardEl) => bus.stopCardAudio(cardEl);
});
