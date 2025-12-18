// js/audio.js

document.addEventListener("DOMContentLoaded", () => {
    class AudioManager {
        constructor() {
            this.anthem = new Audio("assets/songs/anthem.mp3");
            this.anthem.loop = true;
            this.anthem.volume = 0.2; // 20%

            this.isInitialized = false;

            // register with global bus if available
            this.bus.registerAnthemAudio(this.anthem);
            if (this.bus) {
                this.bus.registerOtherAudio(this.anthem);
            }

            // start on first click
            document.addEventListener(
                "click",
                () => this.initAudio(),
                { once: true }
            );
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
