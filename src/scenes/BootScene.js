class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Hide the loading div once Phaser starts
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }

        // Load battlefield texture
        this.load.image('battlefield', 'assets/textures/battlefield.png');

        // Create simple colored rectangles as placeholder graphics
        this.createPlaceholderAssets();
        
        // Show loading progress
        this.createLoadingBar();
    }

    createPlaceholderAssets() {
        // Create colored rectangles for tanks
        const graphics = this.add.graphics();
        
        // Light tank - green
        graphics.fillStyle(0x00ff00);
        graphics.fillRect(0, 0, 40, 20);
        graphics.generateTexture('tank_light', 40, 20);
        
        // Medium tank - blue
        graphics.clear();
        graphics.fillStyle(0x0000ff);
        graphics.fillRect(0, 0, 50, 25);
        graphics.generateTexture('tank_medium', 50, 25);
        
        // Heavy tank - red
        graphics.clear();
        graphics.fillStyle(0xff0000);
        graphics.fillRect(0, 0, 60, 30);
        graphics.generateTexture('tank_heavy', 60, 30);
        
        // Buildings
        graphics.clear();
        graphics.fillStyle(0x8b4513);
        graphics.fillRect(0, 0, 80, 60);
        graphics.generateTexture('base', 80, 60);
        
        graphics.clear();
        graphics.fillStyle(0x696969);
        graphics.fillRect(0, 0, 40, 40);
        graphics.generateTexture('bunker', 40, 40);
        
        // UI elements
        graphics.clear();
        graphics.fillStyle(0x333333);
        graphics.fillRect(0, 0, 100, 140);
        graphics.generateTexture('card_bg', 100, 140);
        
        graphics.clear();
        graphics.fillStyle(0x4a90e2);
        graphics.fillRect(0, 0, 200, 40);
        graphics.generateTexture('button', 200, 40);
        
        // Projectiles
        graphics.clear();
        graphics.fillStyle(0xffff00);
        graphics.fillCircle(0, 0, 3);
        graphics.generateTexture('bullet', 6, 6);
        
        graphics.clear();
        graphics.fillStyle(0xff8800);
        graphics.fillCircle(0, 0, 4);
        graphics.generateTexture('shell', 8, 8);
        
        graphics.destroy();

        // Create simple audio feedback (we'll use Web Audio API for simple tones)
        this.createAudioFeedback();
    }

    createAudioFeedback() {
        // We'll add simple sound effects using the Web Audio API
        // For now, we'll create placeholder functions that could play sounds
        this.registry.set('playShootSound', () => {
            // Simple shoot sound could be implemented here
            console.log('Pew!');
        });
        
        this.registry.set('playExplosionSound', () => {
            // Simple explosion sound could be implemented here
            console.log('Boom!');
        });
    }

    createLoadingBar() {
        const width = 400;
        const height = 20;
        const x = (GAME_CONFIG.WIDTH - width) / 2;
        const y = GAME_CONFIG.HEIGHT / 2;

        // Loading bar background
        const bgBar = this.add.graphics();
        bgBar.fillStyle(0x333333);
        bgBar.fillRect(x, y, width, height);

        // Loading bar fill
        const fillBar = this.add.graphics();
        fillBar.fillStyle(0x4a90e2);

        // Loading text
        const loadingText = this.add.text(GAME_CONFIG.WIDTH / 2, y - 40, 'Loading Tank Tactics...', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Simulate loading progress
        let progress = 0;
        const timer = this.time.addEvent({
            delay: 50,
            callback: () => {
                progress += 0.02;
                fillBar.clear();
                fillBar.fillStyle(0x4a90e2);
                fillBar.fillRect(x, y, width * progress, height);

                if (progress >= 1) {
                    timer.remove();
                    this.scene.start('MenuScene');
                }
            },
            loop: true
        });
    }
}
