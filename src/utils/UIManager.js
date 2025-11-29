/**
 * UIManager - Handles complex UI components for Tank Tactics
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
    createEnhancedBattleResultScreen(result, battleStats, gameState, overtimeActive, buildings) {
        // Modern dark overlay with gradient effect
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(UI_COLORS.GAME_OVER.OVERLAY_COLOR, 0.1);
        overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        overlay.setScrollFactor(0);
        overlay.setDepth(1100);
        
        // Add subtle vignette effect
        const vignette = this.scene.add.graphics();
        vignette.setScrollFactor(0);
        vignette.setDepth(1100);
        // Draw concentric ellipses for vignette effect
        const centerX = GAME_CONFIG.WIDTH / 2;
        const centerY = GAME_CONFIG.HEIGHT / 2;
        const maxRadiusX = GAME_CONFIG.WIDTH / 2;
        const maxRadiusY = GAME_CONFIG.HEIGHT / 2;
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            const alpha = 0.10 + (i / steps) * 0.25; // 0.10 to 0.35
            const radiusX = maxRadiusX - (i * maxRadiusX * 0.15);
            const radiusY = maxRadiusY - (i * maxRadiusY * 0.15);
            vignette.fillStyle(0x000000, alpha);
            vignette.fillEllipse(centerX, centerY, radiusX * 2, radiusY * 2);
        }
        // Smooth fade in with better readability
        this.scene.tweens.add({
            targets: [overlay, vignette],
            alpha: 0.85,
            duration: 600,
            ease: 'Cubic.easeOut'
        });
        
        // Result container - positioned slightly higher to prevent bottom overflow
        const container = this.scene.add.container(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 20);
        container.setScrollFactor(0);
        container.setDepth(1101);
        
        // Determine final result and colors
        const finalResult = this._determineFinalResult(result, buildings);
        const { accentColor, resultTitleColor, titleText } = this._getResultColors(finalResult);
        
        // Create the result card background
        this._createResultCard(container);
        
        // Add title
        this._createTitle(container, titleText, resultTitleColor);
        
        // Add statistics
        this._createStatistics(container, battleStats);
        
        // Add bottom section (duration, rewards, overtime)
        this._createBottomSection(container, battleStats, finalResult, resultTitleColor, overtimeActive);
        
        // Add continue button
        const continueButton = this._createContinueButton(container, resultTitleColor, accentColor);
        
        // Animate container entrance
        this._animateContainerEntrance(container);
        
        // Add wait message and setup click handling
        this._setupClickHandling(overlay, container, finalResult, gameState, battleStats, continueButton);
    }

    /**
     * Determines the final battle result based on building health
     */
    _determineFinalResult(result, buildings) {
        if (result === 'victory' || result === 'defeat') {
            return result;
        }
        
        if (result === 'time') {
            const playerBase = buildings.find(b => b.isPlayerBase);
            const enemyBase = buildings.find(b => !b.isPlayerBase);
            
            if (!playerBase && !enemyBase) {
                return 'draw';
            } else if (!playerBase) {
                return 'defeat';
            } else if (!enemyBase) {
                return 'victory';
            } else {
                // Compare base health percentages
                const playerHealthPercent = playerBase.health / playerBase.maxHealth;
                const enemyHealthPercent = enemyBase.health / enemyBase.maxHealth;
                
                if (playerHealthPercent > enemyHealthPercent) {
                    return 'victory';
                } else if (enemyHealthPercent > playerHealthPercent) {
                    return 'defeat';
                } else {
                    return 'draw';
                }
            }
        }
        
        return result;
    }

    /**
     * Gets colors and title text based on result
     */
    _getResultColors(result) {
        let accentColor, resultTitleColor, titleText;
        
        if (result === 'victory') {
            accentColor = UI_COLORS.GAME_OVER.VICTORY.ACCENT;
            resultTitleColor = UI_COLORS.GAME_OVER.VICTORY.PRIMARY;
            titleText = 'Victory';
        } else if (result === 'defeat') {
            accentColor = UI_COLORS.GAME_OVER.DEFEAT.ACCENT;
            resultTitleColor = UI_COLORS.GAME_OVER.DEFEAT.PRIMARY;
            titleText = 'Defeat';
        } else {
            accentColor = UI_COLORS.GAME_OVER.DRAW.ACCENT;
            resultTitleColor = UI_COLORS.GAME_OVER.DRAW.PRIMARY;
            titleText = 'Draw';
        }
        
        return { accentColor, resultTitleColor, titleText };
    }

    /**
     * Creates the result card background
     */
    _createResultCard(container) {
        const resultCard = this.scene.add.graphics();
        
        // Outer glow effect
        resultCard.fillStyle(0x3d5a80, 0.3);
        resultCard.fillRoundedRect(-290, -270, 580, 520, 24);
        
        // Main card background with gradient effect
        resultCard.fillStyle(UI_COLORS.GAME_OVER.CARD_BACKGROUND, 0.98);
        resultCard.fillRoundedRect(-280, -260, 560, 500, 20);
        
        // Inner highlight for depth
        resultCard.fillStyle(0xffffff, 0.02);
        resultCard.fillRoundedRect(-278, -258, 556, 250, 18);
        
        // Modern border with glow
        resultCard.lineStyle(2, UI_COLORS.GAME_OVER.CARD_BORDER, 0.6);
        resultCard.strokeRoundedRect(-280, -260, 560, 500, 20);
        
        container.add(resultCard);
    }

    /**
     * Creates the title text
     */
    _createTitle(container, titleText, titleColor) {
        // Glow effect behind title
        const titleGlow = this.scene.add.text(0, -200, titleText, {
            fontSize: '48px',
            fill: titleColor,
            fontFamily: 'Arial',
            fontWeight: '700'
        }).setOrigin(0.5);
        titleGlow.setAlpha(0.3);
        titleGlow.setBlendMode(Phaser.BlendModes.ADD);
        container.add(titleGlow);
        
        // Main title
        const title = this.scene.add.text(0, -200, titleText, {
            fontSize: '48px',
            fill: titleColor,
            fontFamily: 'Arial',
            fontWeight: '700'
        }).setOrigin(0.5);
        container.add(title);
        
        // Subtle pulsing animation on the glow
        this.scene.tweens.add({
            targets: titleGlow,
            alpha: 0.5,
            scaleX: 1.05,
            scaleY: 1.05,
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
        this._displayStats(statsContainer, playerStats, -200);
        this._displayStats(statsContainer, aiStats, 40);
    }

    /**
     * Adds section headers for player and AI stats
     */
    _addSectionHeaders(statsContainer) {
        // Decorative line above player stats
        const playerLine = this.scene.add.graphics();
        playerLine.lineStyle(2, 0x60a5fa, 0.5);
        playerLine.lineBetween(-200, -55, -40, -55);
        statsContainer.add(playerLine);
        
        const playerHeader = this.scene.add.text(-120, -40, '⚔ PLAYER', {
            fontSize: '16px',
            fill: '#60a5fa',
            fontFamily: 'Arial',
            fontWeight: '700',
            letterSpacing: 2
        }).setOrigin(0.5);
        statsContainer.add(playerHeader);
        
        // Decorative line above AI stats
        const aiLine = this.scene.add.graphics();
        aiLine.lineStyle(2, 0xf87171, 0.5);
        aiLine.lineBetween(40, -55, 200, -55);
        statsContainer.add(aiLine);
        
        const aiHeader = this.scene.add.text(120, -40, '🤖 OPPONENT', {
            fontSize: '16px',
            fill: '#f87171',
            fontFamily: 'Arial',
            fontWeight: '700',
            letterSpacing: 2
        }).setOrigin(0.5);
        statsContainer.add(aiHeader);
    }

    /**
     * Displays stats with generous spacing
     */
    _displayStats(statsContainer, stats, baseX) {
        stats.forEach((stat, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = baseX + (col * 100);
            const y = 0 + (row * 45);
            
            // Background card for each stat
            const statBg = this.scene.add.graphics();
            statBg.fillStyle(0xffffff, 0.03);
            statBg.fillRoundedRect(x - 5, y - 8, 90, 38, 6);
            statsContainer.add(statBg);
            
            const label = this.scene.add.text(x, y, stat.label, {
                fontSize: '11px',
                fill: '#94a3b8',
                fontFamily: 'Arial',
                fontWeight: '500'
            }).setOrigin(0, 0.5);
            statsContainer.add(label);
            
            const value = this.scene.add.text(x, y + 18, stat.value.toString(), {
                fontSize: '18px',
                fill: '#f1f5f9',
                fontFamily: 'Arial',
                fontWeight: '700'
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
        
        // Battle duration with icon
        const battleDuration = (battleStats.battle.endTime - battleStats.battle.startTime) / 1000;
        const durationText = `${Math.floor(battleDuration / 60)}:${(battleDuration % 60).toFixed(0).padStart(2, '0')}`;
        
        // Duration background
        const durationBg = this.scene.add.graphics();
        durationBg.fillStyle(0xffffff, 0.05);
        durationBg.fillRoundedRect(-60, -12, 120, 30, 6);
        bottomContainer.add(durationBg);
        
        const duration = this.scene.add.text(0, 3, `⏱ ${durationText}`, {
            fontSize: '20px',
            fill: '#e2e8f0',
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5);
        bottomContainer.add(duration);
        
        // Rewards with enhanced styling
        this._addRewards(bottomContainer, result, resultTitleColor);
        
        // Overtime indicator with glow
        if (overtimeActive) {
            const overtimeBg = this.scene.add.graphics();
            overtimeBg.fillStyle(0xfb923c, 0.2);
            overtimeBg.fillRoundedRect(-50, 50, 100, 28, 6);
            bottomContainer.add(overtimeBg);
            
            const overtimeText = this.scene.add.text(0, 64, '⚡ OVERTIME', {
                fontSize: '14px',
                fill: '#fb923c',
                fontFamily: 'Arial',
                fontWeight: '700',
                letterSpacing: 1
            }).setOrigin(0.5);
            bottomContainer.add(overtimeText);
            
            // Pulse animation for overtime
            this.scene.tweens.add({
                targets: [overtimeBg, overtimeText],
                alpha: 0.7,
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
            // Rewards background with glow
            const rewardsBg = this.scene.add.graphics();
            rewardsBg.fillStyle(0x4ade80, 0.15);
            rewardsBg.fillRoundedRect(-100, 25, 200, 32, 8);
            bottomContainer.add(rewardsBg);
            
            const rewardsText = this.scene.add.text(0, 41, '🏆 +100 XP  •  💰 +50 Credits', {
                fontSize: '14px',
                fill: '#4ade80',
                fontFamily: 'Arial',
                fontWeight: '600'
            }).setOrigin(0.5);
            bottomContainer.add(rewardsText);
        } else if (result === 'defeat') {
            const consolationBg = this.scene.add.graphics();
            consolationBg.fillStyle(0x94a3b8, 0.1);
            consolationBg.fillRoundedRect(-50, 25, 100, 32, 8);
            bottomContainer.add(consolationBg);
            
            const consolationText = this.scene.add.text(0, 41, '📖 +25 XP', {
                fontSize: '14px',
                fill: '#94a3b8',
                fontFamily: 'Arial',
                fontWeight: '500'
            }).setOrigin(0.5);
            bottomContainer.add(consolationText);
        }
    }

    /**
     * Creates the continue button
     */
    _createContinueButton(container, resultTitleColor, accentColor) {
        const bottomContainer = container.list.find(child => child.y === 100);
        
        const continueButton = this.scene.add.container(0, 90);
        continueButton.setAlpha(0.3);
        bottomContainer.add(continueButton);
        
        // Button background with gradient effect
        const buttonBg = this.scene.add.graphics();
        buttonBg.fillStyle(accentColor, 0.2);
        buttonBg.fillRoundedRect(-70, -18, 140, 36, 18);
        buttonBg.lineStyle(2, accentColor, 0.6);
        buttonBg.strokeRoundedRect(-70, -18, 140, 36, 18);
        continueButton.add(buttonBg);
        
        // Button text
        const buttonText = this.scene.add.text(0, 0, '▶ Continue', {
            fontSize: '16px',
            fill: resultTitleColor,
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5);
        continueButton.add(buttonText);
        
        // Gentle pulse animation
        this.scene.tweens.add({
            targets: continueButton,
            scaleX: 1.05,
            scaleY: 1.05,
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
        const waitMessage = this.scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'Please wait...', {
            fontSize: '14px',
            fill: UI_COLORS.GAME_OVER.TEXT.MUTED,
            fontFamily: 'Arial',
            alpha: 0.8
        }).setOrigin(0.5);
        waitMessage.setScrollFactor(0);
        waitMessage.setDepth(1102);
        
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
        const readyMessage = this.scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'Click anywhere to continue', {
            fontSize: '14px',
            fill: UI_COLORS.GAME_OVER.TEXT.PRIMARY,
            fontFamily: 'Arial',
            alpha: 0
        }).setOrigin(0.5);
        readyMessage.setScrollFactor(0);
        readyMessage.setDepth(1102);
        
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
