class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Initialize debug panel for menu
        this.initializeDebugPanel();

        // Make this scene accessible to HTML buttons
        window.currentScene = this;
        if (window.refreshSpeedButtonState) {
            window.refreshSpeedButtonState();
        }

        // Enhanced background with gradient effect
        this.cameras.main.setBackgroundColor('#0f172a');

        // Add animated background particles
        this.createBackgroundEffects();

        // Title with glow effect
        this.createTitle();

        // Menu buttons with modern styling
        this.createMenuButtons();

        // Load or create game state
        this.gameState = GameHelpers.loadGameState() || GameHelpers.getDefaultGameState();

        // Show player info with enhanced styling
        this.showPlayerInfo();
    }

    createBackgroundEffects() {
        // Create subtle floating particles
        const particles = this.add.graphics();
        particles.setAlpha(0.3);

        // Draw some static decorative elements
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * GAME_CONFIG.WIDTH;
            const y = Math.random() * GAME_CONFIG.HEIGHT;
            const size = Math.random() * 3 + 1;
            particles.fillStyle(0x60a5fa, Math.random() * 0.3 + 0.1);
            particles.fillCircle(x, y, size);
        }

        // Add decorative lines
        const lines = this.add.graphics();
        lines.lineStyle(1, 0x3d5a80, 0.2);
        for (let i = 0; i < 5; i++) {
            const y = 100 + i * 150;
            lines.lineBetween(0, y, GAME_CONFIG.WIDTH, y + 50);
        }
    }

    createTitle() {
        // Glow effect
        const titleGlow = this.add.text(GAME_CONFIG.WIDTH / 2, 100, 'MECHANIZED ROYALE', {
            fontSize: '48px',
            fill: '#60a5fa',
            fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
            letterSpacing: 6
        }).setOrigin(0.5);
        titleGlow.setAlpha(0.4);
        titleGlow.setBlendMode(Phaser.BlendModes.ADD);

        // Main title with gradient-like effect using stroke
        const title = this.add.text(GAME_CONFIG.WIDTH / 2, 100, 'MECHANIZED ROYALE', {
            fontSize: '48px',
            fill: '#f1f5f9',
            fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
            letterSpacing: 6,
            stroke: '#3b82f6',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Subtle animation on glow
        this.tweens.add({
            targets: titleGlow,
            alpha: 0.6,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle with modern styling
        this.add.text(GAME_CONFIG.WIDTH / 2, 155, 'Clash Royale meets World of Tanks', {
            fontSize: '16px',
            fill: '#94a3b8',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic'
        }).setOrigin(0.5);
    }

    createMenuButtons() {
        const buttonY = 320;
        const buttonSpacing = 70;
        const buttonWidth = 200;
        const buttonHeight = 55;

        // Play button - primary action with glow
        const playButtonBg = this.add.graphics();
        this.drawModernButton(playButtonBg, GAME_CONFIG.WIDTH / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 0x3b82f6, true);

        const playButton = this.add.rectangle(GAME_CONFIG.WIDTH / 2, buttonY, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.01); // Invisible hitbox

        const playText = this.add.text(GAME_CONFIG.WIDTH / 2, buttonY, '▶  BATTLE', {
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        playButton.on('pointerdown', () => {
            // Brief flash effect then transition
            playButtonBg.clear();
            this.drawModernButton(playButtonBg, GAME_CONFIG.WIDTH / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 0x93c5fd, true);
            this.time.delayedCall(100, () => {
                this.scene.start('BattleScene', { gameState: this.gameState });
            });
        });

        playButton.on('pointerover', () => {
            playButtonBg.clear();
            this.drawModernButton(playButtonBg, GAME_CONFIG.WIDTH / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 0x60a5fa, true);
        });

        playButton.on('pointerout', () => {
            playButtonBg.clear();
            this.drawModernButton(playButtonBg, GAME_CONFIG.WIDTH / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 0x3b82f6, true);
        });

        // Research button (disabled)
        const researchButtonBg = this.add.graphics();
        this.drawModernButton(researchButtonBg, GAME_CONFIG.WIDTH / 2 - buttonWidth / 2, buttonY + buttonSpacing - buttonHeight / 2, buttonWidth, buttonHeight, 0x475569, false);

        this.add.text(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing - 8, '🔬  RESEARCH', {
            fontSize: '16px',
            fill: '#64748b',
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5);

        this.add.text(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing + 10, 'Coming Soon', {
            fontSize: '11px',
            fill: '#94a3b8',
            fontFamily: 'Arial',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Settings button (disabled)
        const settingsButtonBg = this.add.graphics();
        this.drawModernButton(settingsButtonBg, GAME_CONFIG.WIDTH / 2 - buttonWidth / 2, buttonY + buttonSpacing * 2 - buttonHeight / 2, buttonWidth, buttonHeight, 0x475569, false);

        this.add.text(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing * 2 - 8, '⚙  SETTINGS', {
            fontSize: '16px',
            fill: '#64748b',
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5);

        this.add.text(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing * 2 + 10, 'Coming Soon', {
            fontSize: '11px',
            fill: '#94a3b8',
            fontFamily: 'Arial',
            fontStyle: 'italic'
        }).setOrigin(0.5);
    }

    drawModernButton(graphics, x, y, width, height, color, isActive) {
        // Outer glow for active buttons
        if (isActive) {
            graphics.fillStyle(color, 0.3);
            graphics.fillRoundedRect(x - 4, y - 4, width + 8, height + 8, 14);
        }

        // Main button background
        graphics.fillStyle(color, isActive ? 1 : 0.5);
        graphics.fillRoundedRect(x, y, width, height, 10);

        // Inner highlight
        if (isActive) {
            graphics.fillStyle(0xffffff, 0.1);
            graphics.fillRoundedRect(x + 2, y + 2, width - 4, height / 2 - 4, 8);
        }

        // Border
        graphics.lineStyle(2, isActive ? 0x60a5fa : 0x475569, isActive ? 0.6 : 0.3);
        graphics.strokeRoundedRect(x, y, width, height, 10);
    }

    showPlayerInfo() {
        // Player info panel - positioned below title area
        const panelWidth = 180;
        const panelHeight = 90;
        const panelX = GAME_CONFIG.WIDTH / 2 - panelWidth / 2;
        const panelY = 530;

        // Panel background
        const infoPanelBg = this.add.graphics();
        infoPanelBg.fillStyle(0x1e293b, 0.9);
        infoPanelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        infoPanelBg.lineStyle(1, 0x3d5a80, 0.5);
        infoPanelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

        // Player level and XP
        const player = this.gameState.player;

        // Level with icon
        this.add.text(panelX + 12, panelY + 15, `⭐ Level ${player.progress.level}`, {
            fontSize: '15px',
            fill: '#f1f5f9',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        });

        // Credits with icon
        this.add.text(panelX + 12, panelY + 38, `💰 ${player.resources.credits}`, {
            fontSize: '13px',
            fill: '#fbbf24',
            fontFamily: 'Arial',
            fontWeight: '600'
        });

        // Tanks unlocked with icon
        this.add.text(panelX + 12, panelY + 60, `🛡️ ${player.tanks.length} Tanks`, {
            fontSize: '13px',
            fill: '#4ade80',
            fontFamily: 'Arial',
            fontWeight: '600'
        });
    }

    // Debug Panel Methods for Menu Scene
    initializeDebugPanel() {
        this.debugUpdateTimer = 0;
        this.debugUpdateInterval = 500; // Update every 500ms for menu (less frequent)

        // Start debug updates
        this.time.addEvent({
            delay: this.debugUpdateInterval,
            callback: this.updateDebugPanel,
            callbackScope: this,
            loop: true
        });
    }

    updateDebugPanel() {
        // Check if debug panel exists and is visible
        if (!window.debugPanel) return;

        try {
            // Game State
            window.debugPanel.updateValue('debug-scene', this.scene.key);
            window.debugPanel.updateValue('debug-time', '-');
            window.debugPanel.updateValue('debug-paused', 'Menu');

            // Player Stats (from game state)
            if (this.gameState && this.gameState.player) {
                window.debugPanel.updateValue('debug-player-energy', '-');
                window.debugPanel.updateValue('debug-player-tanks', this.gameState.player.tanks.length);
                window.debugPanel.updateValue('debug-player-hand', '-');
            }

            // AI Stats
            window.debugPanel.updateValue('debug-ai-energy', '-');
            window.debugPanel.updateValue('debug-ai-tanks', '-');
            window.debugPanel.updateValue('debug-ai-strategy', '-');
            window.debugPanel.updateValue('debug-ai-rush', '-');

            // Battle Stats
            window.debugPanel.updateValue('debug-total-tanks', '-');
            window.debugPanel.updateValue('debug-projectiles', '-');
            window.debugPanel.updateValue('debug-buildings', '-');

            // Performance
            window.debugPanel.updateValue('debug-fps', this.game.loop.actualFps.toFixed(1));
            const objectCount = this.children.list.length;
            window.debugPanel.updateValue('debug-objects', objectCount);

            // Memory usage (if available)
            if (performance.memory) {
                const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
                window.debugPanel.updateValue('debug-memory', `${memoryMB} MB`);
            } else {
                window.debugPanel.updateValue('debug-memory', 'N/A');
            }

            // Tower Status
            window.debugPanel.updateValue('debug-player-towers', '-');
            window.debugPanel.updateValue('debug-ai-towers', '-');

            // Deployment Zones
            window.debugPanel.updateValue('debug-player-expanded', '-');
            window.debugPanel.updateValue('debug-ai-expanded', '-');

            window.debugPanel.updateValue('debug-speed', '-');

        } catch (error) {
            console.warn('Debug panel update error in menu:', error);
        }
    }

    // Dummy method for row numbers toggle (not applicable in menu)
    toggleRowNumbers() {
        console.log('Row numbers toggle not available in menu scene');
    }
}
