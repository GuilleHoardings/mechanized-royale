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

        // Note: Tower assets are currently being generated procedurally in createPlaceholderAssets
        // due to rate limiting on asset generation. 
        // Once assets are available, uncomment the following:
        // this.load.image('tower_main_base', 'assets/towers/tower_main_base.png');
        // this.load.image('tower_main_turret', 'assets/towers/tower_main_turret.png');
        // this.load.image('tower_side_base', 'assets/towers/tower_side_base.png');
        // this.load.image('tower_side_turret', 'assets/towers/tower_side_turret.png');

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

        // Generic Base/Bunker textures (placeholders)
        graphics.clear();
        graphics.fillStyle(0x888888);
        graphics.fillRect(0, 0, 80, 60);
        graphics.generateTexture('base', 80, 60);

        graphics.clear();
        graphics.fillStyle(0x696969);
        graphics.fillRect(0, 0, 40, 40);
        graphics.generateTexture('bunker', 40, 40);

        // --- NEW TOWER ASSETS (Neutral Grey for Tinting) ---

        // Main Tower Base (Octagonal Concrete Bunker)
        graphics.clear();
        graphics.fillStyle(0x9ca3af); // Neutral Grey
        // Draw an octagon roughly
        const size = 80;
        const pts = [
            20, 0, 60, 0, 80, 20, 80, 60, 60, 80, 20, 80, 0, 60, 0, 20
        ];
        graphics.fillPoints(pts.map((p, i) => (i % 2 === 0 ? { x: p, y: pts[i + 1] } : null)).filter(p => p), true);
        // Add some "concrete" details
        graphics.fillStyle(0x4b5563);
        graphics.fillCircle(40, 40, 30);
        graphics.generateTexture('tower_main_base', 80, 80);

        // Main Tower Turret (Heavy Tank Turret style)
        graphics.clear();
        graphics.fillStyle(0x6b7280); // Darker Grey
        graphics.fillRect(10, 10, 60, 60); // Inner box
        graphics.fillStyle(0x374151); // Gunmetal
        graphics.fillRect(30, 0, 20, 40); // Barrel pointing UP (negative Y)
        graphics.fillCircle(40, 40, 20); // Cupola
        graphics.generateTexture('tower_main_turret', 80, 80);

        // Side Tower Base (Smaller Hexagon)
        graphics.clear();
        graphics.fillStyle(0x9ca3af);
        const sideSize = 60;
        // Hexagon
        const hexPts = [
            15, 0, 45, 0, 60, 30, 45, 60, 15, 60, 0, 30
        ];
        graphics.fillPoints(hexPts.map((p, i) => (i % 2 === 0 ? { x: p, y: hexPts[i + 1] } : null)).filter(p => p), true);
        graphics.generateTexture('tower_side_base', 60, 60);

        // Side Tower Turret (Smaller Gun)
        graphics.clear();
        graphics.fillStyle(0x6b7280);
        graphics.fillRect(15, 15, 30, 30);
        graphics.fillStyle(0x374151);
        graphics.fillRect(25, 5, 10, 25); // Barrel UP
        graphics.generateTexture('tower_side_turret', 60, 60);

        // ---------------------------------------------------

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
        // Match the dark blue-gray theme from MenuScene
        this.cameras.main.setBackgroundColor('#0f172a');

        // Add subtle background particles like MenuScene
        this.createBackgroundEffects();

        const width = 300;
        const height = 12;
        const x = (GAME_CONFIG.WIDTH - width) / 2;
        const y = GAME_CONFIG.HEIGHT / 2 + 40;

        // Title with glow effect (matching MenuScene style)
        const titleGlow = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 80, 'MECHANIZED ROYALE', {
            fontSize: '42px',
            fill: '#60a5fa',
            fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
            letterSpacing: 6
        }).setOrigin(0.5);
        titleGlow.setAlpha(0.4);
        titleGlow.setBlendMode(Phaser.BlendModes.ADD);

        const title = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 80, 'MECHANIZED ROYALE', {
            fontSize: '42px',
            fill: '#f1f5f9',
            fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
            letterSpacing: 6,
            stroke: '#3b82f6',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Animate title glow
        this.tweens.add({
            targets: titleGlow,
            alpha: 0.6,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Loading text with modern styling
        const loadingText = this.add.text(GAME_CONFIG.WIDTH / 2, y - 30, 'LOADING', {
            fontSize: '14px',
            fill: '#94a3b8',
            fontFamily: 'Arial',
            fontWeight: '600',
            letterSpacing: 4
        }).setOrigin(0.5);

        // Loading bar container with rounded corners and glow
        const barContainer = this.add.graphics();

        // Outer glow
        barContainer.fillStyle(0x3b82f6, 0.2);
        barContainer.fillRoundedRect(x - 4, y - 4, width + 8, height + 8, 10);

        // Background bar
        barContainer.fillStyle(0x1e293b, 1);
        barContainer.fillRoundedRect(x, y, width, height, 6);

        // Border
        barContainer.lineStyle(1, 0x3d5a80, 0.5);
        barContainer.strokeRoundedRect(x, y, width, height, 6);

        // Loading bar fill
        const fillBar = this.add.graphics();

        // Percentage text
        const percentText = this.add.text(GAME_CONFIG.WIDTH / 2, y + 30, '0%', {
            fontSize: '16px',
            fill: '#60a5fa',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Simulate loading progress
        let progress = 0;
        const timer = this.time.addEvent({
            delay: 40,
            callback: () => {
                progress += 0.025;
                if (progress > 1) progress = 1;

                fillBar.clear();

                // Gradient-like effect for the progress bar
                fillBar.fillStyle(0x3b82f6, 1);
                fillBar.fillRoundedRect(x + 2, y + 2, (width - 4) * progress, height - 4, 4);

                // Inner highlight
                if (progress > 0.1) {
                    fillBar.fillStyle(0x60a5fa, 0.4);
                    fillBar.fillRoundedRect(x + 2, y + 2, (width - 4) * progress, (height - 4) / 2, 4);
                }

                // Update percentage
                percentText.setText(Math.floor(progress * 100) + '%');

                if (progress >= 1) {
                    timer.remove();
                    // Brief delay before transitioning
                    this.time.delayedCall(200, () => {
                        this.scene.start('MenuScene');
                    });
                }
            },
            loop: true
        });
    }

    createBackgroundEffects() {
        // Create subtle floating particles (matching MenuScene)
        const particles = this.add.graphics();
        particles.setAlpha(0.3);

        for (let i = 0; i < 15; i++) {
            const x = Math.random() * GAME_CONFIG.WIDTH;
            const y = Math.random() * GAME_CONFIG.HEIGHT;
            const size = Math.random() * 2 + 1;
            particles.fillStyle(0x60a5fa, Math.random() * 0.3 + 0.1);
            particles.fillCircle(x, y, size);
        }

        // Add decorative lines
        const lines = this.add.graphics();
        lines.lineStyle(1, 0x3d5a80, 0.15);
        for (let i = 0; i < 4; i++) {
            const y = 100 + i * 180;
            lines.lineBetween(0, y, GAME_CONFIG.WIDTH, y + 40);
        }
    }
}
