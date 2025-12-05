class AudioManager {
    constructor() {
        this.anthem = new Audio('replace with github link after upload');
        this.anthem.loop = true;
        this.anthem.volume = 20; // Set anthem volume to 20%
        this.isMuted = false;
        this.isInitialized = false;
        this.init();
    }

    init() {
        this.createMuteButton();
        
        // Initialize audio on first user interaction
        document.addEventListener('click', () => this.initAudio(), { once: true });
    }
    
    createMuteButton() {
        const muteButton = document.createElement('button');
        muteButton.className = 'mute-button';
        muteButton.innerHTML = '🔊';
        muteButton.title = 'Mute/Unmute Audio';
        
        muteButton.addEventListener('click', () => this.toggleMute());
        document.body.appendChild(muteButton);
        
        this.muteButton = muteButton;
    }
    
    initAudio() {
        if (!this.isInitialized) {
            this.anthem.play().catch(error => {
                console.log("Audio autoplay failed:", error);
            });
            this.isInitialized = true;
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.anthem.pause();
            this.muteButton.innerHTML = '🔇';
            this.muteButton.classList.add('muted');
            this.muteButton.title = 'Unmute Audio';
        } else {
            if (this.isInitialized) {
                this.anthem.play().catch(error => {
                    console.log("Audio play failed:", error);
                });
            }
            this.muteButton.innerHTML = '🔊';
            this.muteButton.classList.remove('muted');
            this.muteButton.title = 'Mute Audio';
        }
        
        // Notify profile music player about mute state
        if (window.profileMusicPlayer) {
            window.profileMusicPlayer.setMuted(this.isMuted);
        }
    }
    
    getMuteState() {
        return this.isMuted;
    }
}

