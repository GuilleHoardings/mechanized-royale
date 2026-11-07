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

        // Olive field-map backdrop
        this.cameras.main.setBackgroundColor('#1b1a12');

        // Add weathered map background
        this.createBackgroundEffects();

        // Painted stencil title
        this.createTitle();

        // Field orders menu
        this.createMenuButtons();

        // Load or create game state
        this.gameState = GameHelpers.loadGameState() || GameHelpers.getDefaultGameState();

        // Show player info with enhanced styling
        this.showPlayerInfo();
    }

    createBackgroundEffects() {
        const W = GAME_CONFIG.WIDTH;
        const H = GAME_CONFIG.HEIGHT;

        // Aged paper + survey grid and edge vignette
        const backdrop = this.add.graphics();
        CanvasTheme.paper(backdrop, 0, 0, W, H);
        CanvasTheme.grid(backdrop, 0, 0, W, H, 40, CanvasTheme.colors.lineSoft, 0.09);
        CanvasTheme.vignette(backdrop, 0, 0, W, H, 6, 0.05);

        // Framing brackets
        CanvasTheme.brackets(backdrop, 14, 14, W - 28, H - 28, CanvasTheme.colors.accent, 0.4, 16, 0);

        // Header rail
        backdrop.lineStyle(1, CanvasTheme.colors.line, 0.28);
        backdrop.lineBetween(24, 58, W - 24, 58);
        this.add.text(24, 40, 'MECHANIZED ROYALE  /  FIELD COMMAND', {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });
        this.add.text(W - 24, 40, 'ALLIED COMMAND  ·  READY', {
            fontSize: '9px',
            fill: CanvasTheme.colors.greenCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setOrigin(1, 0);

        // Footer rail
        backdrop.lineStyle(1, CanvasTheme.colors.line, 0.22);
        backdrop.lineBetween(24, H - 26, W - 24, H - 26);
        this.add.text(24, H - 20, 'WAR OFFICE ISSUE 0.1  ·  WESTERN FRONT', {
            fontSize: '8px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });
        this.add.text(W - 24, H - 20, 'AWAITING ORDERS', {
            fontSize: '8px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Soft contour lines, like a field map
        const lines = this.add.graphics();
        lines.lineStyle(1, CanvasTheme.colors.lineSoft, 0.18);
        for (let i = 0; i < 5; i++) {
            const ly = 84 + i * 150;
            lines.lineBetween(0, ly, W, ly + 30);
        }

        // Sparse dust flecks
        const particles = this.add.graphics();
        for (let i = 0; i < 18; i++) {
            const px = Math.random() * W;
            const py = Math.random() * H;
            const size = Math.random() * 1.8 + 0.8;
            particles.fillStyle(i % 5 === 0 ? CanvasTheme.colors.accent : CanvasTheme.colors.mudLight, Math.random() * 0.18 + 0.05);
            particles.fillCircle(px, py, size);
        }
    }

    createTitle() {
        const W = GAME_CONFIG.WIDTH;

        // Title plate - a riveted field-order board
        const plate = this.add.graphics();
        CanvasTheme.panel(plate, 64, 76, W - 128, 120, {
            radius: 3,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.82,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.38,
            accent: CanvasTheme.colors.accent,
            accentAlpha: 0.8,
            rivets: true,
            rivetAlpha: 0.55,
            brackets: true,
            bracketAlpha: 0.35
        });

        // Hard letterpress shadow instead of a neon glow
        this.add.text(W / 2 + 2, 119, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: '#0e0c07',
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5).setAlpha(0.55);

        // Main title
        this.add.text(W / 2, 116, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6,
            stroke: '#282315',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Subtitle + rule
        this.add.text(W / 2, 158, 'ARMOURED FIELD COMMAND  ·  1939 - 1945', {
            fontSize: '10px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 3
        }).setOrigin(0.5);

        const rule = this.add.graphics();
        CanvasTheme.rule(rule, W / 2 - 110, 174, W / 2 + 110, 174, CanvasTheme.colors.accent, 0.5);
        rule.fillStyle(CanvasTheme.colors.accent, 0.9);
        rule.fillRect(W / 2 - 2, 172, 4, 4);
    }

    createMenuButtons() {
        const buttonWidth = 220;
        const buttonHeight = 52;
        const startY = 296;
        const spacing = 66;
        const buttonX = GAME_CONFIG.WIDTH / 2 - buttonWidth / 2;

        // Field orders panel behind the menu
        const panel = this.add.graphics();
        CanvasTheme.panel(panel, buttonX - 24, startY - 62, buttonWidth + 48, spacing * 3 + buttonHeight + 44, {
            radius: 3,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.8,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.3,
            accent: CanvasTheme.colors.accent,
            accentAlpha: 0.6,
            rivets: true,
            rivetAlpha: 0.5,
            brackets: true,
            bracketAlpha: 0.3
        });

        this.add.text(buttonX - 8, startY - 50, 'FIELD ORDERS', {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });
        this.add.text(buttonX + buttonWidth + 8, startY - 50, 'ISSUED 04', {
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
            label: 'DEPLOY',
            color: CanvasTheme.colors.accent,
            hoverColor: CanvasTheme.colors.amber,
            onClick: () => this.scene.start('BattleScene', { gameState: this.gameState })
        });

        this.createMenuButton({
            x: buttonX,
            y: startY + spacing - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: 'LOADOUT',
            color: CanvasTheme.colors.blue,
            hoverColor: CanvasTheme.colors.green,
            onClick: () => this.scene.start('DeckScene', { gameState: this.gameState })
        });

        // Not implemented yet
        this.createMenuButton({
            x: buttonX,
            y: startY + spacing * 2 - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: 'RESEARCH',
            disabled: true
        });

        this.createMenuButton({
            x: buttonX,
            y: startY + spacing * 3 - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: 'SETTINGS',
            disabled: true
        });
    }

    /**
     * Draws a menu button. Disabled buttons show a "SOON" badge and ignore input.
     */
    createMenuButton({ x, y, width, height, label, color = 0x6f6748, hoverColor = null, disabled = false, onClick = null }) {
        const bg = this.add.graphics();
        this.drawCommandButton(bg, x, y, width, height, color, !disabled);

        const text = this.add.text(x + width / 2, y + height / 2, label, {
            fontSize: disabled ? '13px' : '17px',
            fill: disabled ? CanvasTheme.colors.faint : CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.ui,
            fontWeight: '700',
            letterSpacing: 3
        }).setOrigin(0.5);

        if (disabled) {
            const badgeX = x + width - 60;
            const badgeY = y + height / 2 - 8;
            const badge = this.add.graphics();
            badge.fillStyle(CanvasTheme.colors.panelStrong, 0.9);
            badge.fillRoundedRect(badgeX, badgeY, 52, 16, 2);
            badge.lineStyle(1, CanvasTheme.colors.lineSoft, 0.55);
            badge.strokeRoundedRect(badgeX, badgeY, 52, 16, 2);
            this.add.text(badgeX + 26, badgeY + 8, 'PENDING', {
                fontSize: '8px',
                fill: CanvasTheme.colors.muted,
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
            this.drawCommandButton(bg, x, y, width, height, hoverColor || color, true, true);
            text.setFill('#fff8e4');
        });

        hit.on('pointerout', () => {
            bg.clear();
            this.drawCommandButton(bg, x, y, width, height, color, true, false);
            text.setFill(CanvasTheme.colors.text);
        });

        hit.on('pointerdown', () => {
            // Brief flash effect then transition
            bg.clear();
            this.drawCommandButton(bg, x, y, width, height, hoverColor || color, true, true);
            this.time.delayedCall(100, onClick);
        });
    }

    /**
     * Draws a stamped field-order plate. Flat surfaces, a heavy dark keyline,
     * a brass order stripe and a hard drop shadow keep it period-appropriate.
     */
    drawCommandButton(graphics, x, y, width, height, color, isActive, hovered = false) {
        // Hard cast shadow
        graphics.fillStyle(0x000000, 0.34);
        graphics.fillRoundedRect(x + 3, y + 4, width, height, 2);

        // Main plate
        graphics.fillStyle(isActive
            ? (hovered ? CanvasTheme.colors.raisedAlt : CanvasTheme.colors.raised)
            : CanvasTheme.colors.deep, isActive ? 0.98 : 0.7);
        graphics.fillRoundedRect(x, y, width, height, 2);

        // Tinted order stripe across the plate
        graphics.fillStyle(color, isActive ? (hovered ? 0.22 : 0.13) : 0.05);
        graphics.fillRoundedRect(x, y, width, height, 2);

        // Left order bar
        graphics.fillStyle(isActive ? color : CanvasTheme.colors.lineSoft, isActive ? 0.95 : 0.4);
        graphics.fillRect(x + 1, y + 7, 4, height - 14);

        // Printed highlight (top edge only)
        if (isActive) {
            graphics.fillStyle(CanvasTheme.colors.lineBright, hovered ? 0.1 : 0.06);
            graphics.fillRect(x + 2, y + 2, width - 4, 2);
        }

        // Heavy outer keyline + inner rule
        graphics.lineStyle(2, CanvasTheme.colors.ink, 0.6);
        graphics.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, 2);
        graphics.lineStyle(1, isActive ? color : CanvasTheme.colors.lineSoft, isActive ? (hovered ? 0.9 : 0.65) : 0.35);
        graphics.strokeRoundedRect(x + 3.5, y + 3.5, width - 7, height - 7, 1);

        // Stamped corner ticks and a small arrow, not a glowing chevron
        if (isActive) {
            graphics.lineStyle(1, color, hovered ? 0.95 : 0.55);
            const cx = x + width - 24;
            const cy = y + height / 2;
            graphics.lineBetween(cx - 4, cy - 5, cx + 2, cy);
            graphics.lineBetween(cx + 2, cy, cx - 4, cy + 5);
            graphics.fillStyle(color, hovered ? 0.95 : 0.6);
            graphics.fillRect(x + 9, y + height - 7, 14, 2);
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
            radius: 3,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.88,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.36,
            accent: CanvasTheme.colors.amber,
            accentAlpha: 0.7,
            rivets: true,
            rivetAlpha: 0.45,
            brackets: true,
            bracketAlpha: 0.3
        });

        this.add.text(panelX + 16, panelY + 12, 'OFFICER SERVICE RECORD', {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });

        const player = this.gameState.player;
        const deck = GameHelpers.getPlayerDeck(this.gameState);

        const rows = [
            { label: 'RANK', value: `RANK ${player.progress.level}`, color: CanvasTheme.colors.text },
            { label: 'REQUISITION', value: `${player.resources.credits}`, color: CanvasTheme.colors.amberCss },
            { label: 'LOADOUT', value: `${deck.length}/${DECK_CONFIG.SIZE} CARDS`, color: CanvasTheme.colors.greenCss }
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
