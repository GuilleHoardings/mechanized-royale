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
        // Modern dark overlay with blur effect simulation
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(UI_COLORS.GAME_OVER.OVERLAY_COLOR, 0.1);
        overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        overlay.setScrollFactor(0);
        overlay.setDepth(100);
        
        // Smooth fade in with better readability
        this.scene.tweens.add({
            targets: overlay,
            alpha: 0.8,
            duration: 800,
            ease: 'Cubic.easeOut'
        });
        
        // Result container
        const container = this.scene.add.container(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
        container.setScrollFactor(0);
        container.setDepth(101);
        
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
        
        // Readable background - better opacity for text clarity
        resultCard.fillStyle(UI_COLORS.GAME_OVER.CARD_BACKGROUND, 0.95);
        resultCard.fillRoundedRect(-300, -280, 600, 560, 20);
        
        // Very subtle border for clean look
        resultCard.lineStyle(1, UI_COLORS.GAME_OVER.CARD_BORDER, 0.3);
        resultCard.strokeRoundedRect(-300, -280, 600, 560, 20);
        
        container.add(resultCard);
    }

    /**
     * Creates the title text
     */
    _createTitle(container, titleText, titleColor) {
        const title = this.scene.add.text(0, -220, titleText, {
            fontSize: '48px',
            fill: titleColor,
            fontFamily: 'Arial',
            fontWeight: '300',
            alpha: 0.95
        }).setOrigin(0.5);
        container.add(title);
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
        const playerHeader = this.scene.add.text(-120, -40, 'Player', {
            fontSize: '18px',
            fill: UI_COLORS.GAME_OVER.TEXT.SECONDARY,
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5);
        statsContainer.add(playerHeader);
        
        const aiHeader = this.scene.add.text(120, -40, 'AI Opponent', {
            fontSize: '18px',
            fill: UI_COLORS.GAME_OVER.TEXT.SECONDARY,
            fontFamily: 'Arial',
            fontWeight: '600'
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
            const y = 0 + (row * 40);
            
            const label = this.scene.add.text(x, y, stat.label, {
                fontSize: '12px',
                fill: UI_COLORS.GAME_OVER.TEXT.MUTED,
                fontFamily: 'Arial'
            }).setOrigin(0, 0.5);
            statsContainer.add(label);
            
            const value = this.scene.add.text(x, y + 18, stat.value.toString(), {
                fontSize: '16px',
                fill: UI_COLORS.GAME_OVER.TEXT.PRIMARY,
                fontFamily: 'Arial',
                fontWeight: '600'
            }).setOrigin(0, 0.5);
            statsContainer.add(value);
        });
    }

    /**
     * Creates the bottom section with duration, rewards, and overtime info
     */
    _createBottomSection(container, battleStats, result, resultTitleColor, overtimeActive) {
        const bottomContainer = this.scene.add.container(0, 160);
        container.add(bottomContainer);
        
        // Battle duration
        const battleDuration = (battleStats.battle.endTime - battleStats.battle.startTime) / 1000;
        const durationText = `${Math.floor(battleDuration / 60)}:${(battleDuration % 60).toFixed(0).padStart(2, '0')}`;
        const duration = this.scene.add.text(0, 0, durationText, {
            fontSize: '18px',
            fill: UI_COLORS.GAME_OVER.TEXT.PRIMARY,
            fontFamily: 'Arial',
            fontWeight: '500'
        }).setOrigin(0.5);
        bottomContainer.add(duration);
        
        // Rewards
        this._addRewards(bottomContainer, result, resultTitleColor);
        
        // Overtime indicator
        if (overtimeActive) {
            const overtimeText = this.scene.add.text(0, 70, 'Overtime', {
                fontSize: '14px',
                fill: UI_COLORS.GAME_OVER.TEXT.OVERTIME,
                fontFamily: 'Arial',
                fontWeight: '600'
            }).setOrigin(0.5);
            bottomContainer.add(overtimeText);
        }
    }

    /**
     * Adds reward text based on result
     */
    _addRewards(bottomContainer, result, resultTitleColor) {
        if (result === 'victory') {
            const rewardsText = this.scene.add.text(0, 35, '+100 XP  •  +50 Credits', {
                fontSize: '16px',
                fill: resultTitleColor,
                fontFamily: 'Arial',
                fontWeight: '500'
            }).setOrigin(0.5);
            bottomContainer.add(rewardsText);
        } else if (result === 'defeat') {
            const consolationText = this.scene.add.text(0, 35, '+25 XP', {
                fontSize: '16px',
                fill: UI_COLORS.GAME_OVER.TEXT.SECONDARY,
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
        const bottomContainer = container.list.find(child => child.y === 160);
        
        const continueButton = this.scene.add.container(0, 110);
        continueButton.setAlpha(0.3); // Start dimmed to indicate not yet clickable
        bottomContainer.add(continueButton);
        
        // Button text
        const buttonText = this.scene.add.text(0, 0, 'Continue', {
            fontSize: '18px',
            fill: resultTitleColor,
            fontFamily: 'Arial',
            fontWeight: '500'
        }).setOrigin(0.5);
        continueButton.add(buttonText);
        
        // Subtle underline
        const buttonUnderline = this.scene.add.graphics();
        buttonUnderline.lineStyle(2, accentColor, 0.8);
        buttonUnderline.moveTo(-35, 15);
        buttonUnderline.lineTo(35, 15);
        buttonUnderline.strokePath();
        continueButton.add(buttonUnderline);
        
        // Gentle fade animation
        this.scene.tweens.add({
            targets: [buttonText, buttonUnderline],
            alpha: 0.7,
            duration: 2000,
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
        const waitMessage = this.scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 50, 'Please wait...', {
            fontSize: '14px',
            fill: UI_COLORS.GAME_OVER.TEXT.MUTED,
            fontFamily: 'Arial',
            alpha: 0.8
        }).setOrigin(0.5);
        waitMessage.setScrollFactor(0);
        waitMessage.setDepth(102);
        
        // Make interactive areas
        overlay.setInteractive();
        container.setInteractive(new Phaser.Geom.Rectangle(-300, -280, 600, 560), Phaser.Geom.Rectangle.Contains);
        
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
        const readyMessage = this.scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 50, 'Click anywhere to continue', {
            fontSize: '14px',
            fill: UI_COLORS.GAME_OVER.TEXT.PRIMARY,
            fontFamily: 'Arial',
            alpha: 0
        }).setOrigin(0.5);
        readyMessage.setScrollFactor(0);
        readyMessage.setDepth(102);
        
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
