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

        // Load card textures that have generated metrics (card_<cardId>.png).
        // Cards without art fall back to procedural graphics, so skipping them
        // here avoids 404s for new cards that only have vector art.
        if (typeof CARDS !== 'undefined') {
            const cardMetrics = (typeof CARD_METRICS !== 'undefined') ? CARD_METRICS : null;
            Object.keys(CARDS).forEach(cardId => {
                if (!cardMetrics || cardMetrics[cardId]) {
                    this.load.image(`card_${cardId}`, `assets/tanks/card_${cardId}.png`);
                }
            });
        }

        // Load battlefield unit textures based on UNIT_METRICS registry
        if (typeof UNIT_METRICS !== 'undefined') {
            Object.keys(UNIT_METRICS).forEach(unitId => {
                this.load.image(`unit_${unitId}`, `assets/tanks/unit_${unitId}.png`);
            });
        }

        // Tower assets are now loaded from assets/towers/
        this.load.image('tower_main_base', 'assets/towers/tower_main_base.png');
        this.load.image('tower_main_turret', 'assets/towers/tower_main_turret.png');
        this.load.image('tower_side_base', 'assets/towers/tower_side_base.png');
        this.load.image('tower_side_turret', 'assets/towers/tower_side_turret.png');

        // Create fallback placeholder textures only if any tower assets failed to load
        this.load.once('complete', () => {
            const tempGraphicsManager = new GraphicsManager(this);
            tempGraphicsManager.generateNeutralTowerTextures();
        });

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



        // ---------------------------------------------------

        // UI elements
        // Card frame is generated at the size the battle hand actually uses
        // (100x80) so the border, art well and name plate keep crisp edges.
        graphics.clear();
        graphics.fillStyle(0x0b1422, 1);
        graphics.fillRoundedRect(0, 0, 100, 80, 7);

        // Top sheen
        graphics.fillStyle(0xffffff, 0.045);
        graphics.fillRoundedRect(1, 1, 98, 26, 6);

        // Art well
        graphics.fillStyle(0x111b2b, 0.92);
        graphics.fillRoundedRect(5, 19, 90, 42, 4);
        graphics.lineStyle(1, 0x3d5a80, 0.45);
        graphics.strokeRoundedRect(5, 19, 90, 42, 4);

        // Neutral accent strip; per-card type colour is layered in BattleScene
        graphics.fillStyle(0x60a5fa, 0.55);
        graphics.fillRoundedRect(9, 6, 82, 2, 1);

        // Name plate
        graphics.fillStyle(0x090f19, 0.82);
        graphics.fillRoundedRect(4, 61, 92, 15, 4);

        // Outer border + corner ticks
        graphics.lineStyle(1, 0x7da3ce, 0.45);
        graphics.strokeRoundedRect(0.5, 0.5, 99, 79, 7);
        graphics.lineStyle(2, 0x4fd1c5, 0.32);
        graphics.lineBetween(4, 4, 12, 4);
        graphics.lineBetween(4, 4, 4, 12);
        graphics.lineBetween(96, 76, 88, 76);
        graphics.lineBetween(96, 76, 96, 68);
        graphics.generateTexture('card_bg', 100, 80);

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
        // Match the dark command-console theme used by the HTML chrome
        this.cameras.main.setBackgroundColor('#0a111c');

        const width = 300;
        const height = 10;
        const x = (GAME_CONFIG.WIDTH - width) / 2;
        const y = GAME_CONFIG.HEIGHT / 2 + 40;

        this.createBackgroundEffects();

        // Status chip above the title
        const chip = this.add.graphics();
        CanvasTheme.chip(chip, GAME_CONFIG.WIDTH / 2 - 64, GAME_CONFIG.HEIGHT / 2 - 160, 128, 22, CanvasTheme.colors.accent, {
            fillAlpha: 0.12,
            strokeAlpha: 0.4,
            dot: true
        });
        this.add.text(GAME_CONFIG.WIDTH / 2 + 6, GAME_CONFIG.HEIGHT / 2 - 149, 'TACTICAL LINK', {
            fontFamily: CanvasTheme.fonts.mono,
            fontSize: '10px',
            fill: CanvasTheme.colors.accentCss,
            letterSpacing: 2
        }).setOrigin(0.5);

        // Title with glow effect
        const titleGlow = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 100, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: '#60a5fa',
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5);
        titleGlow.setAlpha(0.35);
        titleGlow.setBlendMode(Phaser.BlendModes.ADD);

        const title = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 100, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: '#e8f1fb',
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6,
            stroke: '#2563eb',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 66, 'FIELD COMMAND SYSTEM', {
            fontSize: '11px',
            fill: '#8ea3bd',
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 4
        }).setOrigin(0.5);

        // Animate title glow
        this.tweens.add({
            targets: titleGlow,
            alpha: 0.55,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Loading panel
        const panelX = x - 16;
        const panelY = y - 32;
        const panelW = width + 32;
        const panelH = 88;
        const barPanel = this.add.graphics();
        CanvasTheme.panel(barPanel, panelX, panelY, panelW, panelH, {
            radius: 10,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.9,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.3,
            accent: CanvasTheme.colors.accent,
            brackets: true,
            bracketColor: CanvasTheme.colors.accent,
            bracketAlpha: 0.45
        });

        this.add.text(panelX + 16, panelY + 12, 'INITIALIZING BATTLEFIELD', {
            fontSize: '9px',
            fill: '#8ea3bd',
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });

        const statusText = this.add.text(panelX + panelW - 16, panelY + 12, 'SECURE', {
            fontSize: '9px',
            fill: CanvasTheme.colors.greenCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Bar container
        const barContainer = this.add.graphics();
        barContainer.fillStyle(0x05080d, 0.85);
        barContainer.fillRoundedRect(x, y, width, height, 5);
        barContainer.lineStyle(1, CanvasTheme.colors.lineSoft, 0.55);
        barContainer.strokeRoundedRect(x, y, width, height, 5);

        // Loading bar fill
        const fillBar = this.add.graphics();

        // Percentage text
        const percentText = this.add.text(GAME_CONFIG.WIDTH / 2, y + 26, '0%', {
            fontSize: '11px',
            fill: '#b7c8dd',
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0.5);

        // Footer
        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'BUILD 0.1  /  AWAITING DEPLOYMENT', {
            fontSize: '9px',
            fill: '#64748b',
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setOrigin(0.5);

        // Simulate loading progress
        let progress = 0;
        const timer = this.time.addEvent({
            delay: 40,
            callback: () => {
                progress += 0.025;
                if (progress > 1) progress = 1;

                fillBar.clear();

                // Main fill
                fillBar.fillStyle(CanvasTheme.colors.blueDeep, 1);
                fillBar.fillRoundedRect(x + 2, y + 2, Math.max(0, (width - 4) * progress), height - 4, 4);

                // Brighter leading edge
                if (progress > 0.04) {
                    const fillWidth = (width - 4) * progress;
                    fillBar.fillStyle(CanvasTheme.colors.accent, 0.9);
                    fillBar.fillRoundedRect(x + 2 + Math.max(0, fillWidth - 18), y + 2, Math.min(18, fillWidth), height - 4, 4);
                    fillBar.fillStyle(0xffffff, 0.18);
                    fillBar.fillRoundedRect(x + 2, y + 2, fillWidth, 3, 2);
                }

                // Update percentage
                percentText.setText(`${Math.floor(progress * 100)}%  ·  ${progress < 1 ? 'SYNCING' : 'READY'}`);

                if (progress >= 1) {
                    timer.remove();
                    statusText.setText('ONLINE');
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
        const W = GAME_CONFIG.WIDTH;
        const H = GAME_CONFIG.HEIGHT;

        // Blueprint grid + edge vignette
        const grid = this.add.graphics();
        CanvasTheme.grid(grid, 0, 0, W, H, 40, CanvasTheme.colors.blue, 0.055);
        CanvasTheme.vignette(grid, 0, 0, W, H, 5, 0.05);

        // Soft diagonal command lines
        const lines = this.add.graphics();
        lines.lineStyle(1, CanvasTheme.colors.lineSoft, 0.12);
        for (let i = 0; i < 4; i++) {
            const ly = 90 + i * 180;
            lines.lineBetween(0, ly, W, ly + 50);
        }

        // Sparse status lights
        const particles = this.add.graphics();
        for (let i = 0; i < 18; i++) {
            const px = Math.random() * W;
            const py = Math.random() * H;
            const size = Math.random() * 1.8 + 0.8;
            particles.fillStyle(i % 4 === 0 ? CanvasTheme.colors.accent : CanvasTheme.colors.blue, Math.random() * 0.22 + 0.06);
            particles.fillCircle(px, py, size);
        }
    }
}
