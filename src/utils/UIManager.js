/**
 * UIManager - Handles complex UI components for Mechanized Royale
 * Extracted from BattleScene to improve code organization
 */

class UIManager {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Creates the enhanced battle result screen with statistics
     * @param {string} result - 'victory', 'defeat', or 'time'
     * @param {Object} battleStats - Battle statistics object
     * @param {Object} gameState - Current game state
     * @param {boolean} overtimeActive - Whether overtime was activated
     * @param {Array} buildings - Array of building objects to check health
     */
    /**
     * Creates the enhanced battle result screen with statistics
     * @param {string} result - 'victory', 'defeat', or 'time'
     * @param {Object} battleStats - Battle statistics object
     * @param {Object} gameState - Current game state
     * @param {boolean} overtimeActive - Whether overtime was activated
     * @param {Array} buildings - Array of building objects to check health
     * @param {string} reason - The specific reason for the game end
     */
    createEnhancedBattleResultScreen(result, battleStats, gameState, overtimeActive, buildings, reason = '') {
        const W = GAME_CONFIG.WIDTH;
        const H = GAME_CONFIG.HEIGHT;

        // Dim the battlefield behind a command-console scrim
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(UI_COLORS.GAME_OVER.OVERLAY_COLOR, 0.86);
        overlay.fillRect(0, 0, W, H);
        CanvasTheme.vignette(overlay, 0, 0, W, H, 7, 0.04);
        CanvasTheme.grid(overlay, 0, 0, W, H, 40, CanvasTheme.colors.blue, 0.035);
        CanvasTheme.brackets(overlay, 8, 8, W - 16, H - 16, CanvasTheme.colors.accent, 0.22, 24, 0);
        overlay.setScrollFactor(0);
        overlay.setDepth(2000);
        overlay.setAlpha(0);

        this.scene.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500,
            ease: 'Cubic.easeOut'
        });

        // Result container - positioned slightly higher to prevent bottom overflow
        const container = this.scene.add.container(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 20);
        container.setScrollFactor(0);
        container.setDepth(2001);

        // Determine final result and colors
        const finalResult = this._determineFinalResult(result, buildings);
        const { accent, accentColor, resultTitleColor, titleText } = this._getResultColors(finalResult);

        // Create the result card background
        this._createResultCard(container, accent);

        // Add title and reason
        this._createTitle(container, titleText, resultTitleColor, reason);

        // Add statistics
        this._createStatistics(container, battleStats);

        // Add bottom section (duration, rewards, overtime)
        this._createBottomSection(container, battleStats, finalResult, resultTitleColor, overtimeActive);

        // Add continue button
        const continueButton = this._createContinueButton(container, resultTitleColor, accent);

        // Animate container entrance
        this._animateContainerEntrance(container);

        // Add wait message and setup click handling
        this._setupClickHandling(overlay, container, finalResult, gameState, battleStats, continueButton);
    }

    /**
     * Determines the final battle result by delegating to GameHelpers.determineBattleResult().
     * This method acts as a wrapper, handling result types and using the shared helper for logic.
     */
    _determineFinalResult(result, buildings) {
        if (result === 'victory' || result === 'defeat') {
            return result;
        }

        if (result === 'time') {
            // Use shared helper with no threshold (exact comparison for time-based ending)
            const battleResult = GameHelpers.determineBattleResult(buildings);
            return battleResult || 'draw';
        }

        return result;
    }

    /**
     * Gets colors and title text based on result
     */
    _getResultColors(result) {
        let accent, accentColor, resultTitleColor, titleText;

        if (result === 'victory') {
            accent = UI_COLORS.GAME_OVER.VICTORY.GLOW;
            accentColor = UI_COLORS.GAME_OVER.VICTORY.ACCENT;
            resultTitleColor = UI_COLORS.GAME_OVER.VICTORY.PRIMARY;
            titleText = 'VICTORY';
        } else if (result === 'defeat') {
            accent = UI_COLORS.GAME_OVER.DEFEAT.GLOW;
            accentColor = UI_COLORS.GAME_OVER.DEFEAT.ACCENT;
            resultTitleColor = UI_COLORS.GAME_OVER.DEFEAT.PRIMARY;
            titleText = 'DEFEAT';
        } else {
            accent = UI_COLORS.GAME_OVER.DRAW.GLOW;
            accentColor = UI_COLORS.GAME_OVER.DRAW.ACCENT;
            resultTitleColor = UI_COLORS.GAME_OVER.DRAW.PRIMARY;
            titleText = 'DRAW';
        }

        return { accent, accentColor, resultTitleColor, titleText };
    }

    /**
     * Creates the result card background
     */
    _createResultCard(container, accent = CanvasTheme.colors.accent) {
        const resultCard = this.scene.add.graphics();

        // Outer glow effect
        resultCard.fillStyle(accent, 0.08);
        resultCard.fillRoundedRect(-286, -266, 572, 512, 20);

        // Console panel body with a tinted header band
        CanvasTheme.panel(resultCard, -280, -260, 560, 500, {
            radius: 14,
            fill: UI_COLORS.GAME_OVER.CARD_BACKGROUND,
            fillAlpha: 0.98,
            stroke: accent,
            strokeAlpha: 0.38,
            accent: accent,
            accentAlpha: 0.95,
            shadowAlpha: 0.46,
            brackets: true,
            bracketColor: accent,
            bracketAlpha: 0.32,
            bracketLength: 16
        });

        // Header band wash
        resultCard.fillStyle(accent, 0.08);
        resultCard.fillRoundedRect(-279, -259, 558, 98, 13);
        CanvasTheme.rule(resultCard, -246, -164, 246, -164, CanvasTheme.colors.line, 0.22);

        // Footer rail separating the button from the report
        CanvasTheme.rule(resultCard, -246, 224, 246, 224, CanvasTheme.colors.line, 0.14);

        container.add(resultCard);

        // Header micro-labels
        const eyebrow = this.scene.add.text(-252, -244, 'BATTLE REPORT', {
            fontSize: '8px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 3
        });
        container.add(eyebrow);

        const sector = this.scene.add.text(252, -244, 'SECTOR 07', {
            fontSize: '8px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setOrigin(1, 0);
        container.add(sector);
    }

    /**
     * Creates the title text and reason
     */
    _createTitle(container, titleText, titleColor, reason) {
        // Glow effect behind title
        const titleGlow = this.scene.add.text(0, -200, titleText, {
            fontSize: '48px',
            fill: titleColor,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 5
        }).setOrigin(0.5);
        titleGlow.setAlpha(0.35);
        if (Phaser.BlendModes) {
            titleGlow.setBlendMode(Phaser.BlendModes.ADD);
        }
        container.add(titleGlow);

        // Main title
        const title = this.scene.add.text(0, -200, titleText, {
            fontSize: '48px',
            fill: titleColor,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 5
        }).setOrigin(0.5);
        container.add(title);

        // Reason text
        if (reason) {
            const reasonText = this.scene.add.text(0, -151, reason.toUpperCase(), {
                fontSize: '9px',
                fill: CanvasTheme.colors.textDim,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 2
            }).setOrigin(0.5);
            container.add(reasonText);
        }

        // Subtle pulsing animation on the glow
        this.scene.tweens.add({
            targets: titleGlow,
            alpha: 0.55,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Creates the statistics section
     */
    _createStatistics(container, battleStats) {
        // Calculate battle statistics
        const playerAccuracy = battleStats.player.shotsFired > 0 ?
            ((battleStats.player.shotsHit / battleStats.player.shotsFired) * 100).toFixed(1) : 0;
        const aiAccuracy = battleStats.ai.shotsFired > 0 ?
            ((battleStats.ai.shotsHit / battleStats.ai.shotsFired) * 100).toFixed(1) : 0;

        // Modern statistics section with much more space
        const statsContainer = this.scene.add.container(0, -80);
        container.add(statsContainer);

        // Define stats arrays
        const playerStats = [
            { label: 'Deployed', value: battleStats.player.tanksDeployed },
            { label: 'Destroyed', value: battleStats.player.tanksDestroyed },
            { label: 'Lost', value: battleStats.player.tanksLost },
            { label: 'Accuracy', value: `${playerAccuracy}%` }
        ];

        const aiStats = [
            { label: 'Deployed', value: battleStats.ai.tanksDeployed },
            { label: 'Destroyed', value: battleStats.ai.tanksDestroyed },
            { label: 'Lost', value: battleStats.ai.tanksLost },
            { label: 'Accuracy', value: `${aiAccuracy}%` }
        ];

        // Add section headers
        this._addSectionHeaders(statsContainer);

        // Display stats
        this._displayStats(statsContainer, playerStats, -200, CanvasTheme.colors.blue);
        this._displayStats(statsContainer, aiStats, 40, CanvasTheme.colors.danger);
    }

    /**
     * Adds section headers for player and AI stats
     */
    _addSectionHeaders(statsContainer) {
        // Decorative rule above player stats
        const playerLine = this.scene.add.graphics();
        CanvasTheme.rule(playerLine, -200, -55, -40, -55, CanvasTheme.colors.blue, 0.55, 1);
        playerLine.fillStyle(CanvasTheme.colors.blue, 0.9);
        playerLine.fillRect(-200, -56, 14, 2);
        statsContainer.add(playerLine);

        const playerHeader = this.scene.add.text(-120, -41, 'PLAYER', {
            fontSize: '10px',
            fill: CanvasTheme.colors.blueCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 3
        }).setOrigin(0.5);
        statsContainer.add(playerHeader);

        // Decorative rule above AI stats
        const aiLine = this.scene.add.graphics();
        CanvasTheme.rule(aiLine, 40, -55, 200, -55, CanvasTheme.colors.danger, 0.55, 1);
        aiLine.fillStyle(CanvasTheme.colors.danger, 0.9);
        aiLine.fillRect(186, -56, 14, 2);
        statsContainer.add(aiLine);

        const aiHeader = this.scene.add.text(120, -41, 'OPPONENT', {
            fontSize: '10px',
            fill: CanvasTheme.colors.dangerCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 3
        }).setOrigin(0.5);
        statsContainer.add(aiHeader);
    }

    /**
     * Displays stats with generous spacing
     */
    _displayStats(statsContainer, stats, baseX, accent = CanvasTheme.colors.line) {
        stats.forEach((stat, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = baseX + (col * 100);
            const y = 0 + (row * 45);

            // Background cell for each stat
            const statBg = this.scene.add.graphics();
            statBg.fillStyle(0xffffff, 0.025);
            statBg.fillRoundedRect(x - 5, y - 8, 90, 38, 5);
            statBg.lineStyle(1, CanvasTheme.colors.line, 0.12);
            statBg.strokeRoundedRect(x - 5, y - 8, 90, 38, 5);
            statBg.fillStyle(accent, 0.7);
            statBg.fillRect(x - 5, y - 3, 2, 28);
            statsContainer.add(statBg);

            const label = this.scene.add.text(x + 2, y - 1, stat.label.toUpperCase(), {
                fontSize: '8px',
                fill: CanvasTheme.colors.muted,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
            }).setOrigin(0, 0.5);
            statsContainer.add(label);

            const value = this.scene.add.text(x + 2, y + 17, stat.value.toString(), {
                fontSize: '17px',
                fill: CanvasTheme.colors.text,
                fontFamily: CanvasTheme.fonts.mono,
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            statsContainer.add(value);
        });
    }

    /**
     * Creates the bottom section with duration, rewards, and overtime info
     */
    _createBottomSection(container, battleStats, result, resultTitleColor, overtimeActive) {
        const bottomContainer = this.scene.add.container(0, 100);
        container.add(bottomContainer);

        // Battle duration readout
        const battleDuration = (battleStats.battle.endTime - battleStats.battle.startTime) / 1000;
        const durationText = `${Math.floor(battleDuration / 60)}:${(battleDuration % 60).toFixed(0).padStart(2, '0')}`;

        const durationBg = this.scene.add.graphics();
        CanvasTheme.chip(durationBg, -78, -13, 156, 28, CanvasTheme.colors.blue, {
            fillAlpha: 0.08,
            strokeAlpha: 0.28,
            radius: 5
        });
        bottomContainer.add(durationBg);

        const duration = this.scene.add.text(0, 1, `DURATION  ${durationText}`, {
            fontSize: '10px',
            fill: CanvasTheme.colors.textDim,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setOrigin(0.5);
        bottomContainer.add(duration);

        // Rewards with enhanced styling
        this._addRewards(bottomContainer, result, resultTitleColor);

        // Overtime indicator
        if (overtimeActive) {
            const overtimeBg = this.scene.add.graphics();
            CanvasTheme.chip(overtimeBg, -66, 50, 132, 26, CanvasTheme.colors.amber, {
                fillAlpha: 0.14,
                strokeAlpha: 0.45,
                radius: 5
            });
            bottomContainer.add(overtimeBg);

            const overtimeText = this.scene.add.text(0, 63, 'OVERTIME ACTIVE', {
                fontSize: '9px',
                fill: CanvasTheme.colors.amberCss,
                fontFamily: CanvasTheme.fonts.mono,
                fontStyle: 'bold',
                letterSpacing: 2
            }).setOrigin(0.5);
            bottomContainer.add(overtimeText);

            // Pulse animation for overtime
            this.scene.tweens.add({
                targets: [overtimeBg, overtimeText],
                alpha: 0.65,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    /**
     * Adds reward text based on result
     */
    _addRewards(bottomContainer, result, resultTitleColor) {
        if (result === 'victory') {
            const rewardsBg = this.scene.add.graphics();
            CanvasTheme.chip(rewardsBg, -118, 25, 236, 30, CanvasTheme.colors.green, {
                fillAlpha: 0.1,
                strokeAlpha: 0.32,
                radius: 5
            });
            bottomContainer.add(rewardsBg);

            const rewardsText = this.scene.add.text(0, 40, 'VICTORY BONUS   +100 XP   ·   +50 CREDITS', {
                fontSize: '9px',
                fill: CanvasTheme.colors.greenCss,
                fontFamily: CanvasTheme.fonts.mono,
                fontStyle: 'bold',
                letterSpacing: 1
            }).setOrigin(0.5);
            bottomContainer.add(rewardsText);
        } else if (result === 'defeat') {
            const consolationBg = this.scene.add.graphics();
            CanvasTheme.chip(consolationBg, -80, 25, 160, 30, CanvasTheme.colors.line, {
                fillAlpha: 0.07,
                strokeAlpha: 0.24,
                radius: 5
            });
            bottomContainer.add(consolationBg);

            const consolationText = this.scene.add.text(0, 40, 'SERVICE RECORD   +25 XP', {
                fontSize: '9px',
                fill: CanvasTheme.colors.muted,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
            }).setOrigin(0.5);
            bottomContainer.add(consolationText);
        }
    }

    /**
     * Creates the continue button
     */
    _createContinueButton(container, resultTitleColor, accent = CanvasTheme.colors.accent) {
        const bottomContainer = container.list.find(child => child.y === 100);

        const continueButton = this.scene.add.container(0, 98);
        continueButton.setAlpha(0.3);
        bottomContainer.add(continueButton);

        // Console-style button
        const buttonBg = this.scene.add.graphics();
        CanvasTheme.panel(buttonBg, -80, -18, 160, 36, {
            radius: 6,
            fill: CanvasTheme.colors.raisedAlt,
            fillAlpha: 0.98,
            stroke: accent,
            strokeAlpha: 0.66,
            accent: accent,
            accentAlpha: 0.95,
            shadowAlpha: 0.28,
            brackets: true,
            bracketColor: accent,
            bracketAlpha: 0.32,
            bracketLength: 6
        });
        continueButton.add(buttonBg);

        // Button text
        const buttonText = this.scene.add.text(0, 0, 'CONTINUE', {
            fontSize: '11px',
            fill: resultTitleColor,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 3
        }).setOrigin(0.5);
        continueButton.add(buttonText);

        // Gentle pulse animation
        this.scene.tweens.add({
            targets: continueButton,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return continueButton;
    }

    /**
     * Animates the container entrance
     */
    _animateContainerEntrance(container) {
        container.setScale(0.9);
        container.setAlpha(0);

        this.scene.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 600,
            ease: 'Cubic.easeOut'
        });
    }

    /**
     * Sets up click handling with delay and proper cleanup
     */
    _setupClickHandling(overlay, container, result, gameState, battleStats, continueButton) {
        // Add wait message
        const waitMessage = this.scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'ESTABLISHING UPLINK...', {
            fontSize: '8px',
            fill: UI_COLORS.GAME_OVER.TEXT.MUTED,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2,
            alpha: 0.8
        }).setOrigin(0.5);
        waitMessage.setScrollFactor(0);
        waitMessage.setDepth(2002);

        // Make interactive areas
        overlay.setInteractive();
        // Use card size constants for interactive area
        const cardWidth = UI_CONFIG.GAME_OVER.CARD_WIDTH;
        const cardHeight = UI_CONFIG.GAME_OVER.CARD_HEIGHT;
        container.setInteractive(
            new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
            Phaser.Geom.Rectangle.Contains
        );

        // Click handler function
        const clickHandler = () => {
            this._handleResultScreenExit(container, overlay, result, gameState, battleStats);
        };

        // Add delayed click handling
        this.scene.time.delayedCall(UI_CONFIG.GAME_OVER.CLICK_DELAY, () => {
            this._enableClickHandling(waitMessage, overlay, container, clickHandler, continueButton);
        });
    }

    /**
     * Enables click handling after delay
     */
    _enableClickHandling(waitMessage, overlay, container, clickHandler, continueButton) {
        // Hide wait message
        this.scene.tweens.add({
            targets: waitMessage,
            alpha: 0,
            duration: 300,
            onComplete: () => waitMessage.destroy()
        });

        // Show ready message briefly
        const readyMessage = this.scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'TAP ANYWHERE OR PRESS ANY KEY TO CONTINUE', {
            fontSize: '8px',
            fill: UI_COLORS.GAME_OVER.TEXT.PRIMARY,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2,
            alpha: 0
        }).setOrigin(0.5);
        readyMessage.setScrollFactor(0);
        readyMessage.setDepth(2002);

        this.scene.tweens.add({
            targets: readyMessage,
            alpha: 0.9,
            duration: 300,
            onComplete: () => {
                // Fade it out after 2 seconds
                this.scene.time.delayedCall(2000, () => {
                    this.scene.tweens.add({
                        targets: readyMessage,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => readyMessage.destroy()
                    });
                });
            }
        });

        // Add click listeners
        overlay.once('pointerdown', clickHandler);
        container.once('pointerdown', clickHandler);
        this.scene.input.once('pointerdown', clickHandler);
        this.scene.input.keyboard.once('keydown', clickHandler);

        // Show button as clickable
        this.scene.tweens.add({
            targets: continueButton,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    /**
     * Handles the exit animation and scene transition
     */
    _handleResultScreenExit(container, overlay, result, gameState, battleStats) {
        // Smooth exit animation
        this.scene.tweens.add({
            targets: container,
            scaleX: 0.95,
            scaleY: 0.95,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                // Update player progress
                if (result === 'victory') {
                    gameState.player.experience += 100;
                    gameState.player.wins++;
                } else if (result === 'defeat') {
                    gameState.player.experience += 25;
                    gameState.player.losses++;
                }

                // Save battle statistics to game state for potential future features
                gameState.lastBattleStats = battleStats;

                this.scene.scene.start('MenuScene', { gameState: gameState });
            }
        });

        this.scene.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeIn'
        });
    }
}
