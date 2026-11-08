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

        // Aged field-map paper backdrop
        this.cameras.main.setBackgroundColor('#cbb98d');

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

        // Aged paper sheet with a survey grid, like a map board on a desk
        const backdrop = this.add.graphics();
        CanvasTheme.paper(backdrop, 0, 0, W, H);
        CanvasTheme.grid(backdrop, 0, 0, W, H, 40, CanvasTheme.colors.paperEdge, 0.11);
        CanvasTheme.vignette(backdrop, 0, 0, W, H, 6, 0.05);

        // Double ink frame with a stitched inner rule
        backdrop.lineStyle(2, CanvasTheme.colors.ink, 0.55);
        backdrop.strokeRect(14, 14, W - 28, H - 28);
        CanvasTheme.stitchBorder(backdrop, 20, 20, W - 40, H - 40, CanvasTheme.colors.ink, 0.28, 6, 4);

        // Header rail
        backdrop.lineStyle(1, CanvasTheme.colors.ink, 0.5);
        backdrop.lineBetween(24, 58, W - 24, 58);
        this.add.text(24, 40, 'MECHANIZED ROYALE  /  FIELD COMMAND', {
            fontSize: '9px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });
        this.add.text(W - 24, 40, 'ALLIED COMMAND  ·  READY', {
            fontSize: '9px',
            fill: CanvasTheme.colors.oliveInkCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setOrigin(1, 0);

        // Footer rail
        backdrop.lineStyle(1, CanvasTheme.colors.ink, 0.42);
        backdrop.lineBetween(24, H - 26, W - 24, H - 26);
        this.add.text(24, H - 20, 'WAR OFFICE ISSUE 0.1  ·  WESTERN FRONT', {
            fontSize: '8px',
            fill: CanvasTheme.colors.inkFaint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });
        this.add.text(W - 24, H - 20, 'AWAITING ORDERS', {
            fontSize: '8px',
            fill: CanvasTheme.colors.inkFaint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Soft contour lines, like a field map
        const lines = this.add.graphics();
        lines.lineStyle(1, CanvasTheme.colors.paperEdge, 0.34);
        for (let i = 0; i < 5; i++) {
            const ly = 84 + i * 150;
            lines.lineBetween(0, ly, W, ly + 30);
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

    createTitle() {
        const W = GAME_CONFIG.WIDTH;

        // Title plate - a typed order docket pasted onto the map board
        const plate = this.add.graphics();
        CanvasTheme.sheet(plate, 64, 76, W - 128, 120, {
            radius: 1,
            fill: CanvasTheme.colors.paperLight,
            edge: CanvasTheme.colors.paperEdge,
            ink: CanvasTheme.colors.ink,
            shadowAlpha: 0.22,
            accent: CanvasTheme.colors.stamp,
            accentAlpha: 0.75,
            stitches: false
        });

        // Letterpress title, printed in black ink
        this.add.text(W / 2 + 2, 119, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: CanvasTheme.colors.ink,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5).setAlpha(0.16);

        this.add.text(W / 2, 116, 'MECHANIZED ROYALE', {
            fontSize: '40px',
            fill: CanvasTheme.colors.inkText,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 6
        }).setOrigin(0.5);

        // Subtitle + typed rule
        this.add.text(W / 2, 158, 'ARMOURED FIELD COMMAND  ·  1939 - 1945', {
            fontSize: '10px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 3
        }).setOrigin(0.5);

        const rule = this.add.graphics();
        CanvasTheme.stitch(rule, W / 2 - 120, 174, W / 2 + 120, 174, CanvasTheme.colors.ink, 0.42, 5, 3);
        rule.fillStyle(CanvasTheme.colors.stamp, 0.85);
        rule.fillRect(W / 2 - 2, 172, 4, 4);

        // Red rubber stamp in the lower-right corner of the docket, clear of
        // the title so it stays legible on the narrow portrait canvas.
        const stampX = W - 64 - 84 - 12;
        const stampY = 177;
        CanvasTheme.stampBox(plate, stampX, stampY, 84, 16, CanvasTheme.colors.stamp, 0.62);
        this.add.text(stampX + 42, stampY + 8, 'RESTRICTED', {
            fontSize: '9px',
            fill: CanvasTheme.colors.stampCss,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 2
        }).setOrigin(0.5).setAlpha(0.82);
    }

    createMenuButtons() {
        const buttonWidth = 220;
        const buttonHeight = 52;
        const startY = 296;
        const spacing = 66;
        const buttonX = GAME_CONFIG.WIDTH / 2 - buttonWidth / 2;

        // Field orders docket behind the menu
        const panel = this.add.graphics();
        CanvasTheme.sheet(panel, buttonX - 24, startY - 62, buttonWidth + 48, spacing * 3 + buttonHeight + 44, {
            radius: 1,
            fill: CanvasTheme.colors.paperLight,
            edge: CanvasTheme.colors.paperEdge,
            ink: CanvasTheme.colors.ink,
            shadowAlpha: 0.2,
            accent: CanvasTheme.colors.ink,
            accentAlpha: 0.28
        });

        this.add.text(buttonX - 8, startY - 50, 'FIELD ORDERS', {
            fontSize: '9px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });
        this.add.text(buttonX + buttonWidth + 8, startY - 50, 'ISSUED 04', {
            fontSize: '9px',
            fill: CanvasTheme.colors.inkFaint,
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
            color: CanvasTheme.colors.oliveInk,
            hoverColor: CanvasTheme.colors.stamp,
            onClick: () => this.scene.start('BattleScene', { gameState: this.gameState })
        });

        this.createMenuButton({
            x: buttonX,
            y: startY + spacing - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight,
            label: 'LOADOUT',
            color: CanvasTheme.colors.oliveInk,
            hoverColor: CanvasTheme.colors.stamp,
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
     * Draws a menu button. Disabled buttons show a "PENDING" stamp and ignore input.
     */
    createMenuButton({ x, y, width, height, label, color = 0x746444, hoverColor = null, disabled = false, onClick = null }) {
        const bg = this.add.graphics();
        this.drawCommandButton(bg, x, y, width, height, color, !disabled);

        const text = this.add.text(x + width / 2, y + height / 2, label, {
            fontSize: disabled ? '13px' : '17px',
            fill: disabled ? CanvasTheme.colors.inkFaint : CanvasTheme.colors.inkText,
            fontFamily: CanvasTheme.fonts.ui,
            fontWeight: '700',
            letterSpacing: 3
        }).setOrigin(0.5);

        if (disabled) {
            const badgeX = x + width - 66;
            const badgeY = y + height / 2 - 9;
            const badge = this.add.graphics();
            CanvasTheme.stampBox(badge, badgeX, badgeY, 54, 18, CanvasTheme.colors.inkFaint, 0.5);
            this.add.text(badgeX + 27, badgeY + 9, 'PENDING', {
                fontSize: '8px',
                fill: CanvasTheme.colors.inkFaint,
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
            text.setFill(CanvasTheme.colors.paperLight);
        });

        hit.on('pointerout', () => {
            bg.clear();
            this.drawCommandButton(bg, x, y, width, height, color, true, false);
            text.setFill(CanvasTheme.colors.inkText);
        });

        hit.on('pointerdown', () => {
            // Brief flash effect then transition
            bg.clear();
            this.drawCommandButton(bg, x, y, width, height, hoverColor || color, true, true);
            text.setFill(CanvasTheme.colors.paperLight);
            this.time.delayedCall(100, onClick);
        });
    }

    /**
     * Draws a stamped field-order strip: card stock, an ink keyline, a coloured
     * order bar and a typed arrow. Flat, pressed and period-appropriate.
     */
    drawCommandButton(graphics, x, y, width, height, color, isActive, hovered = false) {
        // Hard cast shadow
        graphics.fillStyle(CanvasTheme.colors.ink, 0.22);
        graphics.fillRoundedRect(x + 2, y + 3, width, height, 1);

        // Main card stock
        graphics.fillStyle(hovered ? color : CanvasTheme.colors.paperLight, hovered ? 0.92 : 1);
        graphics.fillRoundedRect(x, y, width, height, 1);

        // Aged tint over the stock
        graphics.fillStyle(CanvasTheme.colors.paperShade, isActive ? (hovered ? 0.08 : 0.16) : 0.1);
        graphics.fillRoundedRect(x, y, width, height, 1);

        // Left order bar
        graphics.fillStyle(isActive ? color : CanvasTheme.colors.inkFaint, isActive ? 0.9 : 0.35);
        graphics.fillRect(x + 1, y + 7, 4, height - 14);

        // Ink keyline + inner rule
        graphics.lineStyle(1, CanvasTheme.colors.ink, isActive ? 0.7 : 0.35);
        graphics.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, 1);
        graphics.lineStyle(1, CanvasTheme.colors.ink, isActive ? 0.22 : 0.12);
        graphics.strokeRoundedRect(x + 3.5, y + 3.5, width - 7, height - 7, 0);

        // Stamped arrow and order tick
        if (isActive) {
            const ink = hovered ? CanvasTheme.colors.paperLight : CanvasTheme.colors.ink;
            graphics.lineStyle(1, ink, hovered ? 0.9 : 0.6);
            const cx = x + width - 24;
            const cy = y + height / 2;
            graphics.lineBetween(cx - 4, cy - 5, cx + 2, cy);
            graphics.lineBetween(cx + 2, cy, cx - 4, cy + 5);
            graphics.fillStyle(ink, hovered ? 0.9 : 0.55);
            graphics.fillRect(x + 9, y + height - 8, 14, 2);
        }
    }

    showPlayerInfo() {
        // Service record docket - positioned below the menu buttons
        const panelWidth = 260;
        const panelHeight = 104;
        const panelX = GAME_CONFIG.WIDTH / 2 - panelWidth / 2;
        const panelY = 540;

        // Paper form with a typed header and ruled rows
        const infoPanelBg = this.add.graphics();
        CanvasTheme.sheet(infoPanelBg, panelX, panelY, panelWidth, panelHeight, {
            radius: 1,
            fill: CanvasTheme.colors.paperLight,
            edge: CanvasTheme.colors.paperEdge,
            ink: CanvasTheme.colors.ink,
            shadowAlpha: 0.2,
            accent: CanvasTheme.colors.stamp,
            accentAlpha: 0.55
        });

        this.add.text(panelX + 16, panelY + 12, 'OFFICER SERVICE RECORD', {
            fontSize: '9px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });

        const player = this.gameState.player;
        const deck = GameHelpers.getPlayerDeck(this.gameState);

        const rows = [
            { label: 'RANK', value: `RANK ${player.progress.level}`, color: CanvasTheme.colors.inkText },
            { label: 'REQUISITION', value: `${player.resources.credits}`, color: CanvasTheme.colors.oliveInkCss },
            { label: 'LOADOUT', value: `${deck.length}/${DECK_CONFIG.SIZE} CARDS`, color: CanvasTheme.colors.inkTextDim }
        ];

        rows.forEach((row, index) => {
            const rowY = panelY + 36 + index * 22;
            if (index > 0) {
                CanvasTheme.rule(infoPanelBg, panelX + 16, rowY - 7, panelX + panelWidth - 16, rowY - 7, CanvasTheme.colors.ink, 0.18);
            }
            this.add.text(panelX + 16, rowY, row.label, {
                fontSize: '9px',
                fill: CanvasTheme.colors.inkFaint,
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
