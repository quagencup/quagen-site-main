// js/audio.js
document.addEventListener("DOMContentLoaded", () => {
  class AudioManager {
    constructor() {
      this.anthem = new Audio("assets/songs/anthem.mp3");
      this.anthem.loop = true;
      this.anthem.volume = 0.2;

      this.isInitialized = false;

      // register anthem with bus (anthem ONLY)
      this.bus = window.GlobalAudioController || null;
      if (this.bus) {
        this.bus.registerAnthemAudio(this.anthem);
      }

      // play on first user interaction (autoplay rules)
      document.addEventListener("pointerdown", () => this.initAudio(), { once: true });
      document.addEventListener("keydown", () => this.initAudio(), { once: true });
    }

    initAudio() {
      if (this.isInitialized) return;
      this.isInitialized = true;

      this.anthem.play().catch((err) => {
        console.log("Audio autoplay failed:", err);
      });
    }
  }

  window.globalAudioManager = new AudioManager();
});
