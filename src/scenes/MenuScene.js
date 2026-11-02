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
        const W = GAME_CONFIG.WIDTH;
        const H = GAME_CONFIG.HEIGHT;

        // Blueprint grid and edge vignette
        const backdrop = this.add.graphics();
        CanvasTheme.grid(backdrop, 0, 0, W, H, 40, CanvasTheme.colors.blue, 0.055);
        CanvasTheme.vignette(backdrop, 0, 0, W, H, 6, 0.05);

        // Framing brackets
        CanvasTheme.brackets(backdrop, 14, 14, W - 28, H - 28, CanvasTheme.colors.accent, 0.35, 16, 0);

        // Header rail
        backdrop.lineStyle(1, CanvasTheme.colors.line, 0.2);
        backdrop.lineBetween(24, 58, W - 24, 58);
        this.add.text(24, 40, 'MECHANIZED ROYALE / COMMAND', {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });
        this.add.text(W - 24, 40, 'LINK ONLINE', {
            fontSize: '9px',
            fill: CanvasTheme.colors.greenCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setOrigin(1, 0);

        // Footer rail
        backdrop.lineStyle(1, CanvasTheme.colors.line, 0.16);
        backdrop.lineBetween(24, H - 26, W - 24, H - 26);
        this.add.text(24, H - 20, 'BUILD 0.1  ·  SECTOR 07', {
            fontSize: '8px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });
        this.add.text(W - 24, H - 20, 'STANDBY', {
            fontSize: '8px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Soft diagonal command lines
        const lines = this.add.graphics();
        lines.lineStyle(1, CanvasTheme.colors.lineSoft, 0.14);
        for (let i = 0; i < 4; i++) {
            const ly = 110 + i * 160;
            lines.lineBetween(0, ly, W, ly + 46);
        }

        // Sparse status lights
        const particles = this.add.graphics();
        for (let i = 0; i < 18; i++) {
            const px = Math.random() * W;
            const py = Math.random() * H;
            const size = Math.random() * 1.8 + 0.8;
            particles.fillStyle(i % 5 === 0 ? CanvasTheme.colors.accent : CanvasTheme.colors.blue, Math.random() * 0.18 + 0.05);
            particles.fillCircle(px, py, size);
        }
    }

    createTitle() {
        const W = GAME_CONFIG.WIDTH;

        // Title plate
        const plate = this.add.graphics();
        CanvasTheme.panel(plate, 74, 76, W - 148, 120, {
            radius: 12,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.72,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.28,
            accent: CanvasTheme.colors.accent,
            accentAlpha: 0.65,
            brackets: true,
            bracketAlpha: 0.35
        });

        // Glow effect
        const titleGlow = this.add.text(W / 2, 116, 'MECHANIZED ROYALE', {
            fontSize: '44px',
            fill: '#60a5fa',
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5);
        titleGlow.setAlpha(0.35);
        titleGlow.setBlendMode(Phaser.BlendModes.ADD);

        // Main title
        const title = this.add.text(W / 2, 116, 'MECHANIZED ROYALE', {
            fontSize: '44px',
            fill: '#e8f1fb',
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6,
            stroke: '#2563eb',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Subtle animation on glow
        this.tweens.add({
            targets: titleGlow,
            alpha: 0.55,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle + rule
        this.add.text(W / 2, 158, 'TACTICAL ARMOURED COMMAND', {
            fontSize: '10px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 4
        }).setOrigin(0.5);

        const rule = this.add.graphics();
        CanvasTheme.rule(rule, W / 2 - 90, 174, W / 2 + 90, 174, CanvasTheme.colors.accent, 0.4);
        rule.fillStyle(CanvasTheme.colors.accent, 0.8);
        rule.fillCircle(W / 2, 174, 2);
    }

    createMenuButtons() {
        const buttonWidth = 220;
        const buttonHeight = 52;
        const startY = 296;
        const spacing = 66;
        const buttonX = GAME_CONFIG.WIDTH / 2 - buttonWidth / 2;

        // Operations panel behind the menu
        const panel = this.add.graphics();
        CanvasTheme.panel(panel, buttonX - 24, startY - 62, buttonWidth + 48, spacing * 3 + buttonHeight + 44, {
            radius: 14,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.7,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.24,
            accent: CanvasTheme.colors.blue,
            accentAlpha: 0.5,
            brackets: true,
            bracketAlpha: 0.3
        });

        this.add.text(buttonX - 8, startY - 50, 'OPERATIONS', {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });
        this.add.text(buttonX + buttonWidth + 8, startY - 50, '4 AVAILABLE', {
            fontSize: '9px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Primary actions
        this.createMenuButton({
            x: buttonX,
            y: startY - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: '▶  BATTLE',
            color: 0x3b82f6,
            hoverColor: 0x60a5fa,
            onClick: () => this.scene.start('BattleScene', { gameState: this.gameState })
        });

        this.createMenuButton({
            x: buttonX,
            y: startY + spacing - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: '▤  DECK',
            color: 0x8b5cf6,
            hoverColor: 0xa78bfa,
            onClick: () => this.scene.start('DeckScene', { gameState: this.gameState })
        });

        // Not implemented yet
        this.createMenuButton({
            x: buttonX,
            y: startY + spacing * 2 - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: '⌬  RESEARCH',
            disabled: true
        });

        this.createMenuButton({
            x: buttonX,
            y: startY + spacing * 3 - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: '⚙  SETTINGS',
            disabled: true
        });
    }

    /**
     * Draws a menu button. Disabled buttons show a "SOON" badge and ignore input.
     */
    createMenuButton({ x, y, width, height, label, color = 0x475569, hoverColor = null, disabled = false, onClick = null }) {
        const bg = this.add.graphics();
        this.drawModernButton(bg, x, y, width, height, color, !disabled);

        const text = this.add.text(x + width / 2, y + height / 2, label, {
            fontSize: disabled ? '14px' : '18px',
            fill: disabled ? '#64748b' : '#e8f1fb',
            fontFamily: CanvasTheme.fonts.ui,
            fontWeight: '700',
            letterSpacing: 2
        }).setOrigin(0.5);

        if (disabled) {
            const badgeX = x + width - 48;
            const badgeY = y + height / 2 - 8;
            const badge = this.add.graphics();
            badge.fillStyle(0x334155, 0.9);
            badge.fillRoundedRect(badgeX, badgeY, 40, 16, 8);
            badge.lineStyle(1, CanvasTheme.colors.line, 0.25);
            badge.strokeRoundedRect(badgeX, badgeY, 40, 16, 8);
            this.add.text(badgeX + 20, badgeY + 8, 'SOON', {
                fontSize: '8px',
                fill: '#8ea3bd',
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
            }).setOrigin(0.5);
            return;
        }

        const hit = this.add.rectangle(x + width / 2, y + height / 2, width, height)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.01); // Invisible hitbox

        hit.on('pointerover', () => {
            bg.clear();
            this.drawModernButton(bg, x, y, width, height, hoverColor || color, true, true);
            text.setFill('#ffffff');
        });

        hit.on('pointerout', () => {
            bg.clear();
            this.drawModernButton(bg, x, y, width, height, color, true, false);
            text.setFill('#e8f1fb');
        });

        hit.on('pointerdown', () => {
            // Brief flash effect then transition
            bg.clear();
            this.drawModernButton(bg, x, y, width, height, hoverColor || color, true, true);
            this.time.delayedCall(100, onClick);
        });
    }

    drawModernButton(graphics, x, y, width, height, color, isActive, hovered = false) {
        // Outer glow for active buttons
        if (isActive) {
            graphics.fillStyle(color, hovered ? 0.26 : 0.14);
            graphics.fillRoundedRect(x - 4, y - 4, width + 8, height + 8, 13);
        }

        // Drop shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(x + 2, y + 3, width, height, 9);

        // Main button background
        graphics.fillStyle(isActive ? CanvasTheme.colors.raised : CanvasTheme.colors.deep, isActive ? 0.96 : 0.7);
        graphics.fillRoundedRect(x, y, width, height, 9);

        // Tinted inner glass
        graphics.fillStyle(color, isActive ? (hovered ? 0.3 : 0.18) : 0.06);
        graphics.fillRoundedRect(x, y, width, height, 9);

        // Left accent bar
        graphics.fillStyle(isActive ? (hovered ? 0xffffff : color) : 0x475569, isActive ? 0.9 : 0.4);
        graphics.fillRoundedRect(x + 1, y + 7, 3, height - 14, 2);

        // Inner highlight
        if (isActive) {
            graphics.fillStyle(0xffffff, 0.05);
            graphics.fillRoundedRect(x + 2, y + 2, width - 4, height / 2 - 4, 7);
        }

        // Border
        graphics.lineStyle(1, isActive ? color : 0x475569, isActive ? (hovered ? 0.9 : 0.55) : 0.3);
        graphics.strokeRoundedRect(x, y, width, height, 9);

        // Right chevron
        if (isActive) {
            graphics.lineStyle(2, color, hovered ? 0.95 : 0.6);
            const cx = x + width - 22;
            const cy = y + height / 2;
            graphics.lineBetween(cx - 4, cy - 5, cx + 2, cy);
            graphics.lineBetween(cx + 2, cy, cx - 4, cy + 5);
        }
    }

    showPlayerInfo() {
        // Player info panel - positioned below the menu buttons
        const panelWidth = 260;
        const panelHeight = 104;
        const panelX = GAME_CONFIG.WIDTH / 2 - panelWidth / 2;
        const panelY = 540;

        // Panel background
        const infoPanelBg = this.add.graphics();
        CanvasTheme.panel(infoPanelBg, panelX, panelY, panelWidth, panelHeight, {
            radius: 12,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.82,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.28,
            accent: CanvasTheme.colors.amber,
            accentAlpha: 0.55,
            brackets: true,
            bracketAlpha: 0.3
        });

        this.add.text(panelX + 16, panelY + 12, 'OPERATOR DOSSIER', {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });

        const player = this.gameState.player;
        const deck = GameHelpers.getPlayerDeck(this.gameState);

        const rows = [
            { label: 'LEVEL', value: `LV ${player.progress.level}`, color: CanvasTheme.colors.text },
            { label: 'CREDITS', value: `${player.resources.credits}`, color: CanvasTheme.colors.amberCss },
            { label: 'DECK', value: `${deck.length}/${DECK_CONFIG.SIZE} CARDS`, color: CanvasTheme.colors.greenCss }
        ];

        rows.forEach((row, index) => {
            const rowY = panelY + 36 + index * 22;
            if (index > 0) {
                CanvasTheme.rule(infoPanelBg, panelX + 16, rowY - 7, panelX + panelWidth - 16, rowY - 7, CanvasTheme.colors.line, 0.14);
            }
            this.add.text(panelX + 16, rowY, row.label, {
                fontSize: '9px',
                fill: CanvasTheme.colors.faint,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
            });
            this.add.text(panelX + panelWidth - 16, rowY, row.value, {
                fontSize: '11px',
                fill: row.color,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
            }).setOrigin(1, 0);
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
                window.debugPanel.updateValue('debug-player-tanks', GameHelpers.getPlayerDeck(this.gameState).length);
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
