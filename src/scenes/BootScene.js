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
        graphics.fillStyle(0x2d2a1c, 1);
        graphics.fillRoundedRect(0, 0, 100, 80, 3);

        // Printed card-stock highlight
        graphics.fillStyle(0xf5e6bd, 0.06);
        graphics.fillRoundedRect(1, 1, 98, 24, 2);

        // Art well - recessed field-manual illustration box
        graphics.fillStyle(0x1c1a11, 0.94);
        graphics.fillRoundedRect(5, 19, 90, 42, 2);
        graphics.lineStyle(1, 0x6f6748, 0.6);
        graphics.strokeRoundedRect(5, 19, 90, 42, 2);

        // Neutral brass strip; per-card type colour is layered in BattleScene
        graphics.fillStyle(0xc9a24b, 0.55);
        graphics.fillRoundedRect(9, 6, 82, 2, 1);

        // Name plate
        graphics.fillStyle(0x16140d, 0.88);
        graphics.fillRoundedRect(4, 61, 92, 15, 2);

        // Outer border + corner ticks
        graphics.lineStyle(2, 0x16140d, 0.55);
        graphics.strokeRoundedRect(0.5, 0.5, 99, 79, 3);
        graphics.lineStyle(1, 0xb5a578, 0.5);
        graphics.strokeRoundedRect(2.5, 2.5, 95, 75, 2);
        graphics.lineStyle(2, 0xc9a24b, 0.4);
        graphics.lineBetween(4, 4, 12, 4);
        graphics.lineBetween(4, 4, 4, 12);
        graphics.lineBetween(96, 76, 88, 76);
        graphics.lineBetween(96, 76, 96, 68);
        graphics.generateTexture('card_bg', 100, 80);

        graphics.clear();
        graphics.fillStyle(0x5b6540);
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
        // Match the olive field-dossier theme used by the HTML chrome
        this.cameras.main.setBackgroundColor('#1b1a12');

        const width = 300;
        const height = 10;
        const x = (GAME_CONFIG.WIDTH - width) / 2;
        const y = GAME_CONFIG.HEIGHT / 2 + 40;

        this.createBackgroundEffects();

        // Status chip above the title
        const chip = this.add.graphics();
        CanvasTheme.chip(chip, GAME_CONFIG.WIDTH / 2 - 74, GAME_CONFIG.HEIGHT / 2 - 160, 148, 22, CanvasTheme.colors.accent, {
            fillAlpha: 0.14,
            strokeAlpha: 0.55,
            dot: true
        });
        this.add.text(GAME_CONFIG.WIDTH / 2 + 6, GAME_CONFIG.HEIGHT / 2 - 149, 'ALLIED FIELD COMMAND', {
            fontFamily: CanvasTheme.fonts.mono,
            fontSize: '10px',
            fill: CanvasTheme.colors.accentCss,
            letterSpacing: 1
        }).setOrigin(0.5);

        // Painted stencil title with a hard letterpress shadow (no neon glow)
        this.add.text(GAME_CONFIG.WIDTH / 2 + 2, GAME_CONFIG.HEIGHT / 2 - 98, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: '#0f0d08',
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5).setAlpha(0.55);

        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 100, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6,
            stroke: '#282315',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 66, 'ARMOURED FIELD COMMAND', {
            fontSize: '11px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 4
        }).setOrigin(0.5);

        // Loading panel
        const panelX = x - 16;
        const panelY = y - 32;
        const panelW = width + 32;
        const panelH = 88;
        const barPanel = this.add.graphics();
        CanvasTheme.panel(barPanel, panelX, panelY, panelW, panelH, {
            radius: 3,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.92,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.4,
            accent: CanvasTheme.colors.accent,
            accentAlpha: 0.8,
            rivets: true,
            brackets: true,
            bracketColor: CanvasTheme.colors.accent,
            bracketAlpha: 0.4
        });

        this.add.text(panelX + 18, panelY + 13, 'PREPARING THE FRONT', {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });

        const statusText = this.add.text(panelX + panelW - 18, panelY + 13, 'STAND BY', {
            fontSize: '9px',
            fill: CanvasTheme.colors.greenCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Bar container
        const barContainer = this.add.graphics();
        barContainer.fillStyle(CanvasTheme.colors.ink, 0.9);
        barContainer.fillRoundedRect(x, y, width, height, 2);
        barContainer.lineStyle(1, CanvasTheme.colors.lineSoft, 0.7);
        barContainer.strokeRoundedRect(x, y, width, height, 2);

        // Loading bar fill
        const fillBar = this.add.graphics();

        // Percentage text
        const percentText = this.add.text(GAME_CONFIG.WIDTH / 2, y + 26, '0%', {
            fontSize: '11px',
            fill: CanvasTheme.colors.textDim,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0.5);

        // Footer
        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'WAR OFFICE ISSUE 0.1  /  AWAITING ORDERS', {
            fontSize: '9px',
            fill: CanvasTheme.colors.faint,
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

                // Main fill - olive with a brass leading edge
                fillBar.fillStyle(CanvasTheme.colors.blueDeep, 1);
                fillBar.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * progress), height - 4);

                // Brighter leading edge
                if (progress > 0.04) {
                    const fillWidth = (width - 4) * progress;
                    fillBar.fillStyle(CanvasTheme.colors.accent, 0.9);
                    fillBar.fillRect(x + 2 + Math.max(0, fillWidth - 18), y + 2, Math.min(18, fillWidth), height - 4);
                    fillBar.fillStyle(CanvasTheme.colors.lineBright, 0.16);
                    fillBar.fillRect(x + 2, y + 2, fillWidth, 3);
                }

                // Update percentage
                percentText.setText(`${Math.floor(progress * 100)}%  ·  ${progress < 1 ? 'ISSUING' : 'READY'}`);

                if (progress >= 1) {
                    timer.remove();
                    statusText.setText('READY');
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

        // Aged map paper + survey grid + edge vignette
        const paper = this.add.graphics();
        CanvasTheme.paper(paper, 0, 0, W, H);
        CanvasTheme.grid(paper, 0, 0, W, H, 40, CanvasTheme.colors.lineSoft, 0.085);
        CanvasTheme.vignette(paper, 0, 0, W, H, 5, 0.05);

        // Soft contour lines, like a field map
        const lines = this.add.graphics();
        lines.lineStyle(1, CanvasTheme.colors.lineSoft, 0.18);
        for (let i = 0; i < 5; i++) {
            const ly = 70 + i * 150;
            lines.lineBetween(0, ly, W, ly + 26);
        }

        // Sparse dust flecks
        const particles = this.add.graphics();
        for (let i = 0; i < 18; i++) {
            const px = Math.random() * W;
            const py = Math.random() * H;
            const size = Math.random() * 1.8 + 0.8;
            particles.fillStyle(i % 4 === 0 ? CanvasTheme.colors.accent : CanvasTheme.colors.mudLight, Math.random() * 0.2 + 0.05);
            particles.fillCircle(px, py, size);
        }
    }
}
