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
        // Printed paper card stock, like a field-manual equipment card.
        graphics.clear();
        graphics.fillStyle(CanvasTheme.colors.paperLight, 1);
        graphics.fillRoundedRect(0, 0, 100, 80, 1);

        // Aged tint over the stock
        graphics.fillStyle(CanvasTheme.colors.paperShade, 0.18);
        graphics.fillRoundedRect(0, 0, 100, 80, 1);

        // Art well - recessed field-manual illustration box
        graphics.fillStyle(CanvasTheme.colors.paperDeep, 0.32);
        graphics.fillRoundedRect(5, 19, 90, 42, 1);
        graphics.lineStyle(1, CanvasTheme.colors.ink, 0.4);
        graphics.strokeRoundedRect(5, 19, 90, 42, 1);

        // Neutral stamped strip; per-card type colour is layered in BattleScene
        graphics.fillStyle(CanvasTheme.colors.stamp, 0.55);
        graphics.fillRoundedRect(9, 6, 82, 2, 1);

        // Name plate - ruled paper strip
        graphics.fillStyle(CanvasTheme.colors.paperShade, 0.75);
        graphics.fillRoundedRect(4, 61, 92, 15, 1);
        graphics.lineStyle(1, CanvasTheme.colors.ink, 0.3);
        graphics.strokeRoundedRect(4, 61, 92, 15, 1);

        // Outer ink keyline + inner double rule
        graphics.lineStyle(1, CanvasTheme.colors.ink, 0.72);
        graphics.strokeRoundedRect(0.5, 0.5, 99, 79, 1);
        graphics.lineStyle(1, CanvasTheme.colors.ink, 0.22);
        graphics.strokeRoundedRect(2.5, 2.5, 95, 75, 0);
        graphics.generateTexture('card_bg', 100, 80);

        graphics.clear();
        graphics.fillStyle(CanvasTheme.colors.paperLight, 1);
        graphics.fillRect(0, 0, 200, 40);
        graphics.lineStyle(1, CanvasTheme.colors.ink, 0.6);
        graphics.strokeRect(0.5, 0.5, 199, 39);
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
        // Match the aged paper dossier theme used by the HTML chrome
        this.cameras.main.setBackgroundColor('#cbb98d');

        const width = 300;
        const height = 10;
        const x = (GAME_CONFIG.WIDTH - width) / 2;
        const y = GAME_CONFIG.HEIGHT / 2 + 40;

        this.createBackgroundEffects();

        // Typed dispatch slip above the title
        const slip = this.add.graphics();
        CanvasTheme.sheet(slip, GAME_CONFIG.WIDTH / 2 - 82, GAME_CONFIG.HEIGHT / 2 - 162, 164, 24, {
            radius: 1,
            fill: CanvasTheme.colors.paperLight,
            edge: CanvasTheme.colors.paperEdge,
            ink: CanvasTheme.colors.ink,
            shadowAlpha: 0.16,
            accent: CanvasTheme.colors.stamp,
            accentAlpha: 0.6
        });
        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 150, 'ALLIED FIELD COMMAND', {
            fontFamily: CanvasTheme.fonts.mono,
            fontSize: '10px',
            fill: CanvasTheme.colors.inkMuted,
            letterSpacing: 1
        }).setOrigin(0.5);

        // Letterpress title with a hard ink shadow (no neon glow)
        this.add.text(GAME_CONFIG.WIDTH / 2 + 2, GAME_CONFIG.HEIGHT / 2 - 98, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: CanvasTheme.colors.ink,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5).setAlpha(0.14);

        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 100, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: CanvasTheme.colors.inkText,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5);

        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 66, 'ARMOURED FIELD COMMAND', {
            fontSize: '11px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 4
        }).setOrigin(0.5);

        // Loading docket
        const panelX = x - 16;
        const panelY = y - 32;
        const panelW = width + 32;
        const panelH = 88;
        const barPanel = this.add.graphics();
        CanvasTheme.sheet(barPanel, panelX, panelY, panelW, panelH, {
            radius: 1,
            fill: CanvasTheme.colors.paperLight,
            edge: CanvasTheme.colors.paperEdge,
            ink: CanvasTheme.colors.ink,
            shadowAlpha: 0.2,
            accent: CanvasTheme.colors.ink,
            accentAlpha: 0.3
        });

        this.add.text(panelX + 18, panelY + 13, 'PREPARING THE FRONT', {
            fontSize: '9px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });

        const statusText = this.add.text(panelX + panelW - 18, panelY + 13, 'STAND BY', {
            fontSize: '9px',
            fill: CanvasTheme.colors.oliveInkCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Bar container - an inked gauge
        const barContainer = this.add.graphics();
        barContainer.fillStyle(CanvasTheme.colors.paperShade, 0.9);
        barContainer.fillRoundedRect(x, y, width, height, 1);
        barContainer.lineStyle(1, CanvasTheme.colors.ink, 0.6);
        barContainer.strokeRoundedRect(x, y, width, height, 1);

        // Loading bar fill
        const fillBar = this.add.graphics();

        // Percentage text
        const percentText = this.add.text(GAME_CONFIG.WIDTH / 2, y + 26, '0%', {
            fontSize: '11px',
            fill: CanvasTheme.colors.inkTextDim,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0.5);

        // Footer
        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'WAR OFFICE ISSUE 0.1  /  AWAITING ORDERS', {
            fontSize: '9px',
            fill: CanvasTheme.colors.inkFaint,
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

                // Main fill - olive ink with a stamped leading edge
                fillBar.fillStyle(CanvasTheme.colors.oliveInk, 0.92);
                fillBar.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * progress), height - 4);

                // Darker leading edge
                if (progress > 0.04) {
                    const fillWidth = (width - 4) * progress;
                    fillBar.fillStyle(CanvasTheme.colors.stamp, 0.85);
                    fillBar.fillRect(x + 2 + Math.max(0, fillWidth - 18), y + 2, Math.min(18, fillWidth), height - 4);
                    fillBar.fillStyle(CanvasTheme.colors.paperLight, 0.14);
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
        CanvasTheme.grid(paper, 0, 0, W, H, 40, CanvasTheme.colors.paperEdge, 0.1);
        CanvasTheme.vignette(paper, 0, 0, W, H, 5, 0.05);

        // Double ink frame with a stitched inner rule
        paper.lineStyle(2, CanvasTheme.colors.ink, 0.55);
        paper.strokeRect(14, 14, W - 28, H - 28);
        CanvasTheme.stitchBorder(paper, 20, 20, W - 40, H - 40, CanvasTheme.colors.ink, 0.26, 6, 4);

        // Soft contour lines, like a field map
        const lines = this.add.graphics();
        lines.lineStyle(1, CanvasTheme.colors.paperEdge, 0.32);
        for (let i = 0; i < 5; i++) {
            const ly = 70 + i * 150;
            lines.lineBetween(0, ly, W, ly + 26);
        }

        // Sparse dust and ink flecks
        const particles = this.add.graphics();
        for (let i = 0; i < 20; i++) {
            const px = Math.random() * W;
            const py = Math.random() * H;
            const size = Math.random() * 1.6 + 0.7;
            particles.fillStyle(i % 6 === 0 ? CanvasTheme.colors.stamp : CanvasTheme.colors.ink,
                Math.random() * 0.12 + 0.04);
            particles.fillCircle(px, py, size);
        }
    }
}
