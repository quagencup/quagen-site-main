// js/profile-music.js
document.addEventListener("DOMContentLoaded", () => {
  // ============================================
  // SETTINGS
  // ============================================
  const FADE_MS = 350;      // crossfade duration
  const LEAVE_FADE_MS = 250;
  const CARD_TARGET_VOL = 0.6;

  const ICON_MUTED = "assets/extraicons/muteicon.png";
  const ICON_UNMUTED = "assets/extraicons/unmuteicon.png";

  // ============================================
  // Small helpers
  // ============================================
  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function fadeTo(audio, targetVolume, durationMs, onDone) {
    if (!audio) return;
    const startVol = audio.volume ?? 1;
    const target = clamp01(targetVolume);

    if (durationMs <= 0) {
      audio.volume = target;
      onDone?.();
      return;
    }

    const steps = 24;
    const stepTime = durationMs / steps;
    let i = 0;

    const iv = setInterval(() => {
      i++;
      const t = i / steps;
      audio.volume = startVol + (target - startVol) * t;

      if (i >= steps) {
        clearInterval(iv);
        audio.volume = target;
        onDone?.();
      }
    }, stepTime);

    return () => clearInterval(iv);
  }

  // Unlock audio play on first user gesture (browser autoplay rules)
  let audioUnlocked = false;
  const unlock = () => { audioUnlocked = true; };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  // ============================================
  // AUDIO BUS (anthem + card states)
  // ============================================
  class GlobalAudioBus {
    constructor() {
      this.anthemMuted = false;
      this.cardMuted = new WeakMap(); // card -> bool
      this.cardAudios = new Map();    // card -> Audio
      this.anthemAudios = new Set();  // anthem audios

      this.activeCard = null;         // currently "active" card
      this._listeners = [];
    }

    onChange(fn) {
      if (typeof fn === "function") this._listeners.push(fn);
    }

    _emit() {
      this._listeners.forEach(fn => {
        try { fn(this); } catch (_) {}
      });
    }

    // ---- Anthem only ----
    registerAnthemAudio(audio) {
      if (!audio) return;
      this.anthemAudios.add(audio);
      audio.muted = this.anthemMuted;
    }

    toggleAnthemMuted() {
      this.anthemMuted = !this.anthemMuted;
      this.anthemAudios.forEach(a => (a.muted = this.anthemMuted));
      this._emit();
    }

    setAnthemMuted(val) {
      this.anthemMuted = !!val;
      this.anthemAudios.forEach(a => (a.muted = this.anthemMuted));
      this._emit();
    }

    isAnthemMuted() {
      return this.anthemMuted;
    }

    // ---- Cards ----
    registerCardAudio(card, audio) {
      if (!card || !audio) return;
      this.cardAudios.set(card, audio);
      audio.muted = !!this.cardMuted.get(card);
      this._emit();
    }

    toggleCardMuted(card) {
      if (!card) return;
      const now = !this.isCardMuted(card);
      this.cardMuted.set(card, now);
      const a = this.cardAudios.get(card);
      if (a) a.muted = now;
      this._emit();
    }

    isCardMuted(card) {
      return !!this.cardMuted.get(card);
    }

    getCardAudio(card) {
      return this.cardAudios.get(card) || null;
    }

    setActiveCard(card) {
      this.activeCard = card;
      this._emit();
    }

    getActiveCard() {
      return this.activeCard;
    }
  }

  if (!window.GlobalAudioController) {
    window.GlobalAudioController = new GlobalAudioBus();
  }
  const bus = window.GlobalAudioController;

  // ============================================
  // TOP-RIGHT MUTE BUTTON (ANTHEM ONLY)
  // ============================================
  const globalMuteBtn = document.getElementById("globalMuteBtn");

  function updateGlobalMuteButton() {
    if (!globalMuteBtn) return;
    const img = globalMuteBtn.querySelector("img");
    const muted = bus.isAnthemMuted();

    globalMuteBtn.classList.toggle("muted", muted);
    globalMuteBtn.setAttribute("aria-pressed", muted ? "true" : "false");

    if (img) img.src = muted ? ICON_MUTED : ICON_UNMUTED;
  }

  if (globalMuteBtn) {
    globalMuteBtn.addEventListener("click", () => {
      bus.toggleAnthemMuted();
      updateGlobalMuteButton();
    });
  }
  bus.onChange(updateGlobalMuteButton);
  updateGlobalMuteButton();

  // ============================================
  // CROSSFADE ENGINE
  // ============================================
  // Fade out any currently playing card audio (except keepIfCard), optionally stop/reset
  function fadeOutAllCards(exceptCard = null, duration = LEAVE_FADE_MS) {
    bus.cardAudios.forEach((audio, card) => {
      if (!audio) return;
      if (exceptCard && card === exceptCard) return;

      if (!audio.paused) {
        fadeTo(audio, 0, duration, () => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = CARD_TARGET_VOL; // restore base for next time
        });
      }
    });
  }

  function crossfadeToCard(card) {
    const nextAudio = bus.getCardAudio(card);
    if (!nextAudio) return;

    // If card is muted, do nothing (but still fade out others so it's clean)
    if (bus.isCardMuted(card)) {
      fadeOutAllCards(null, FADE_MS);
      bus.setActiveCard(card);
      return;
    }

    // Fade out all others (including previous active)
    fadeOutAllCards(card, FADE_MS);

    // Fade in this one
    try {
      // ensure it starts audible from 0
      nextAudio.volume = 0;
      if (audioUnlocked) {
        nextAudio.play().catch(() => {});
      }
      fadeTo(nextAudio, CARD_TARGET_VOL, FADE_MS);
    } catch (_) {}

    bus.setActiveCard(card);
  }

  // ============================================
  // CARDS: PLAY / FADE / POPUP LOCK
  // ============================================
  const cards = document.querySelectorAll(".card[data-music]");

  cards.forEach((card) => {
    const src = (card.dataset.music || "").trim();
    if (!src) return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = CARD_TARGET_VOL;

    bus.registerCardAudio(card, audio);

    // Track when this card's popup is open (so mouseleave doesn't instantly fade)
    let popupOpenForThisCard = false;

    // ENTER → crossfade to this card
    card.addEventListener("mouseenter", () => {
      crossfadeToCard(card);
    });

    // LEAVE → fade out ONLY if popup not open
    card.addEventListener("mouseleave", () => {
      if (popupOpenForThisCard) return;

      const a = bus.getCardAudio(card);
      if (!a || a.paused) return;

      fadeTo(a, 0, LEAVE_FADE_MS, () => {
        a.pause();
        a.currentTime = 0;
        a.volume = CARD_TARGET_VOL;
      });
    });

    // Card mute button
    const muteBtn = card.querySelector("[data-card-mute]");
    if (muteBtn) {
      const img = muteBtn.querySelector("img");

      const updateCardMuteVisual = () => {
        const muted = bus.isCardMuted(card);
        muteBtn.classList.toggle("muted", muted);
        muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
        if (img) img.src = muted ? ICON_MUTED : ICON_UNMUTED;
      };

      muteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        bus.toggleCardMuted(card);
        updateCardMuteVisual();

        // If muting the active card, fade it out
        if (bus.isCardMuted(card)) {
          const a = bus.getCardAudio(card);
          if (a && !a.paused) {
            fadeTo(a, 0, 180, () => {
              a.pause();
              a.currentTime = 0;
              a.volume = CARD_TARGET_VOL;
            });
          }
        }
      });

      bus.onChange(updateCardMuteVisual);
      updateCardMuteVisual();
    }

    // Popup open/close events from card-click.js
    document.addEventListener("cardpopup:open", (e) => {
      if (e.detail?.card !== card) return;
      popupOpenForThisCard = true;

      // When popup opens, keep this card as the active source (no fade)
      // also ensure its audio is on (if not muted)
      if (!bus.isCardMuted(card)) {
        crossfadeToCard(card);
      }
    });

    document.addEventListener("cardpopup:close", (e) => {
      if (e.detail?.card !== card) return;
      popupOpenForThisCard = false;

      // Fade out when leaving popup
      const a = bus.getCardAudio(card);
      if (a && !a.paused) {
        fadeTo(a, 0, LEAVE_FADE_MS, () => {
          a.pause();
          a.currentTime = 0;
          a.volume = CARD_TARGET_VOL;
        });
      }
    });
  });
});
