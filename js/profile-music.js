class ProfileMusicPlayer {
    constructor() {
        this.currentAudio = null;
        this.audioCache = new Map();
        this.isMuted = false;
        this.init();
        
        // Make this globally accessible for audio manager
        window.profileMusicPlayer = this;
    }

    init() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const profileImg = card.querySelector('.profile-img');
            if (profileImg) {
                const musicPath = card.dataset.music;
                if (musicPath) {
                    // Preload audio
                    this.preloadAudio(musicPath);
                    
                    // Add hover event listeners
                    card.addEventListener('mouseenter', () => {
                        this.playMusic(musicPath);
                    });
                }
            }
        });
    }

    preloadAudio(musicPath) {
        if (!this.audioCache.has(musicPath)) {
            const audio = new Audio(musicPath);
            audio.preload = 'auto';
            audio.volume = 0.25; // Set volume to 25% to not be too loud
            audio.loop = true;
            this.audioCache.set(musicPath, audio);
        }
    }

    playMusic(musicPath) {
        if (this.isMuted) return;
        
        this.stopMusic();
        
        const audio = this.audioCache.get(musicPath);
        if (audio) {
            this.currentAudio = audio;
            audio.currentTime = 0;
            audio.play().catch(error => {
                console.log("Audio play failed:", error);
            });
        }
    }

    stopMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }
    
    setMuted(muted) {
        this.isMuted = muted;
        if (muted && this.currentAudio) {
            this.stopMusic();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfileMusicPlayer();
    new AudioManager();
});