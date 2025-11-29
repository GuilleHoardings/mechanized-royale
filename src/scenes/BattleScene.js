class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
    }

    init(data) {
        this.gameState = data.gameState;
        this.energy = ENERGY_CONFIG.STARTING_ENERGY;
        this.maxEnergy = ENERGY_CONFIG.MAX_ENERGY;
        this.battleTime = BATTLE_CONFIG.DURATION;
        this.tanks = [];
        this.buildings = [];
        this.projectiles = [];
        
        // Tower tracking for victory conditions
        this.towerStats = {
            player: {
                towersDestroyed: 0,
                mainTowerDestroyed: false,
                leftTowerDestroyed: false,
                rightTowerDestroyed: false
            },
            enemy: {
                towersDestroyed: 0,
                mainTowerDestroyed: false,
                leftTowerDestroyed: false,
                rightTowerDestroyed: false
            }
        };
        
        // Expanded deployment zones when side towers are destroyed
        this.expandedDeploymentZones = {
            player: null, // Will be set when enemy side towers are destroyed
            enemy: null   // Will be set when player side towers are destroyed
        };
        
        // Enhanced battle statistics
        this.battleStats = {
            player: {
                tanksDeployed: 0,
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                tanksDestroyed: 0,
                tanksLost: 0,
                shotsHit: 0,
                shotsFired: 0,
                energySpent: 0,
                maxTanksAlive: 0,
                criticalHits: 0,
                buildingDamage: 0
            },
            ai: {
                tanksDeployed: 0,
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                tanksDestroyed: 0,
                tanksLost: 0,
                shotsHit: 0,
                shotsFired: 0,
                energySpent: 0,
                maxTanksAlive: 0,
                criticalHits: 0,
                buildingDamage: 0
            },
            battle: {
                startTime: 0, // Will be set in create()
                endTime: null,
                overtimeActivated: false,
                longestTankSurvival: 0,
                totalProjectilesFired: 0,
                totalDamageDealt: 0
            }
        };

        // Enhanced battle timer settings
        this.overtimeActive = false;
        this.maxOvertimeSeconds = 60;
        
        // Battle control flag
        this.battleEnded = false;
        
    // Card deck system (8-card rotation)
    this.deck = [...DEFAULT_PLAYER_DECK];
        this.hand = [];
        this.nextCardIndex = 0;
        this.initializeDeck();
        
        // Row numbers display
        this.rowNumbersVisible = false;
        this.rowNumberLabels = [];
        
        // Attack range debug display
        this.attackRangesVisible = false;
        this.attackRangeCircles = [];
        
        // Textures mode - toggles between textures and graphics for all game elements
        this.useGraphicsMode = false;

        // Simulation speed control (1x, then slower steps for analysis)
        this.simulationSpeedOptions = [1, 0.5, 0.25];
        this.simulationSpeedIndex = 0;
        this.simulationSpeed = this.simulationSpeedOptions[this.simulationSpeedIndex];
    }

    create() {
        // Initialize battle start time for statistics
        this.battleStats.battle.startTime = this.time.now;
        
        // Initialize UI Manager
        this.uiManager = new UIManager(this);
        
        // Initialize Graphics Manager
        this.graphicsManager = new GraphicsManager(this);
        
        // Initialize Combat System
        this.combatSystem = new CombatSystem(this);
        
        // Initialize AI Controller
        this.aiController = new AIController(this);
        
        // Make this scene accessible to HTML buttons
        window.currentScene = this;
        
        // Initialize debug panel
        this.initializeDebugPanel();
        this.setSimulationSpeed(this.simulationSpeed);
        
        // Background
        this.cameras.main.setBackgroundColor('#2c5234');

        // Create battlefield
        this.createBattlefield();

        // Create UI
        this.createUI();

        // Create bases
        this.createBases();

        // Start energy regeneration
        this.startEnergyRegeneration();

        // Start battle timer
        this.startBattleTimer();

        // Start AI opponent
        this.startAI();

        // Input handling - use separate handlers for preview deployment
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        
        // Deployment preview state
        this.deploymentPreview = {
            active: false,
            tankType: null,
            previewTank: null,
            previewRangeCircle: null,
            validPosition: false,
            startedInBattlefield: false,
            tileX: 0,
            tileY: 0
        };
    }

    createBattlefield() {
        // Calculate offset to center the battlefield horizontally
        const offsetX = (GAME_CONFIG.WIDTH - GAME_CONFIG.WORLD_WIDTH) / 2;
        
        // Set world bounds to match the actual battlefield size
        this.physics.world.setBounds(offsetX, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
        
        if (this.useGraphicsMode) {
            // Graphics mode - use procedural graphics for detailed grid and features
            this.createDebugBattlefield(offsetX);
        } else {
            // Texture mode - use battlefield texture
            this.battlefieldImage = this.add.image(offsetX + GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2, 'battlefield');
            this.battlefieldImage.setDisplaySize(GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
            this.battlefieldImage.setOrigin(0.5, 0.5);
            this.battlefieldImage.setDepth(-10); // Ensure battlefield is behind other elements
        }
        
        // Deployment zones with tile-based boundaries - will be drawn dynamically
        this.createDeploymentZoneGraphics();
    }

    createDebugBattlefield(offsetX) {
        // Create procedural graphics battlefield for debugging and detailed visualization
        this.battlefieldGraphics = this.add.graphics();
        this.battlefieldGraphics.setDepth(-5); // Behind deployment zones but above background
        
        // Draw tile grid
        this.battlefieldGraphics.lineStyle(1, 0x556b2f, 0.2);
        
        // Vertical tile lines
        for (let tileX = 0; tileX <= GAME_CONFIG.TILES_X; tileX++) {
            const x = offsetX + tileX * GAME_CONFIG.TILE_SIZE;
            this.battlefieldGraphics.lineBetween(x, 0, x, GAME_CONFIG.TILES_Y * GAME_CONFIG.TILE_SIZE);
        }
        
        // Horizontal tile lines
        for (let tileY = 0; tileY <= GAME_CONFIG.TILES_Y; tileY++) {
            const y = tileY * GAME_CONFIG.TILE_SIZE;
            this.battlefieldGraphics.lineBetween(offsetX, y, offsetX + GAME_CONFIG.TILES_X * GAME_CONFIG.TILE_SIZE, y);
        }

        // Center line to divide battlefield - at row 16.5 (between rows 16 and 17)
        this.battlefieldGraphics.lineStyle(3, 0x888888, 0.8);
        const centerY = 16.5 * GAME_CONFIG.TILE_SIZE;
        this.battlefieldGraphics.lineBetween(offsetX, centerY, offsetX + GAME_CONFIG.WORLD_WIDTH, centerY);

        // Add river and bridges in debug mode
        this.createRiverAndBridges(this.battlefieldGraphics, offsetX);
    }

    createRiverAndBridges(graphics, offsetX = 0) {
        // River parameters - rows 16-17
        const riverTopY = 16 * GAME_CONFIG.TILE_SIZE;
        const riverBottomY = 17 * GAME_CONFIG.TILE_SIZE;
        const riverHeight = riverBottomY - riverTopY + GAME_CONFIG.TILE_SIZE;
        const riverWidth = GAME_CONFIG.WORLD_WIDTH;

        // Draw river
        graphics.fillStyle(0x4169e1, 0.6); // Royal blue for water
        graphics.fillRect(offsetX, riverTopY, riverWidth, riverHeight);
        
        // River borders
        graphics.lineStyle(2, 0x1e3a8a, 0.8); // Darker blue borders
        graphics.lineBetween(offsetX, riverTopY, offsetX + riverWidth, riverTopY);
        graphics.lineBetween(offsetX, riverBottomY + GAME_CONFIG.TILE_SIZE, offsetX + riverWidth, riverBottomY + GAME_CONFIG.TILE_SIZE);

        // Two bridges aligned with side towers
        // Left bridge (aligned with left towers)
        const leftBridgeStartX = offsetX + BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER.LEFT.tileX * GAME_CONFIG.TILE_SIZE;
        const leftBridgeWidth = 3 * GAME_CONFIG.TILE_SIZE;
        
        // Right bridge (aligned with right towers)
        const rightBridgeStartX = offsetX + (BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER.RIGHT.tileX - 1) * GAME_CONFIG.TILE_SIZE;
        const rightBridgeWidth = 3 * GAME_CONFIG.TILE_SIZE;
        
        // Draw left bridge
        graphics.fillStyle(0x8b4513, 1.0); // Brown bridge
        graphics.fillRect(leftBridgeStartX, riverTopY, leftBridgeWidth, riverHeight);
        
        // Left bridge borders
        graphics.lineStyle(2, 0x654321);
        graphics.strokeRect(leftBridgeStartX, riverTopY, leftBridgeWidth, riverHeight);
        
        // Left bridge supports
        graphics.fillStyle(0x654321);
        for (let i = 0; i < 2; i++) {
            const supportX = leftBridgeStartX + (i + 1) * leftBridgeWidth / 3;
            graphics.fillRect(supportX - 2, riverTopY, 4, riverHeight);
        }
        
        // Draw right bridge
        graphics.fillStyle(0x8b4513, 1.0); // Brown bridge
        graphics.fillRect(rightBridgeStartX, riverTopY, rightBridgeWidth, riverHeight);
        
        // Right bridge borders
        graphics.lineStyle(2, 0x654321);
        graphics.strokeRect(rightBridgeStartX, riverTopY, rightBridgeWidth, riverHeight);
        
        // Right bridge supports
        graphics.fillStyle(0x654321);
        for (let i = 0; i < 2; i++) {
            const supportX = rightBridgeStartX + (i + 1) * rightBridgeWidth / 3;
            graphics.fillRect(supportX - 2, riverTopY, 4, riverHeight);
        }
    }

    createDeploymentZoneGraphics() {
        // Create separate graphics object for deployment zones so we can redraw them
        this.deploymentZoneGraphics = this.add.graphics();
        this.deploymentZoneLabels = []; // Track text labels for cleanup
        this.drawDeploymentZones();
    }

    drawDeploymentZones() {
        if (!this.deploymentZoneGraphics) return;
        
        // Clear existing deployment zone graphics and labels
        this.deploymentZoneGraphics.clear();
        if (this.deploymentZoneLabels) {
            this.deploymentZoneLabels.forEach(label => label.destroy());
            this.deploymentZoneLabels = [];
        }
        
        const offsetX = GameHelpers.getBattlefieldOffset();
        
        // Draw original deployment zones
        const playerZone = GameHelpers.getDeploymentZoneWorldCoords(true);
        const enemyZone = GameHelpers.getDeploymentZoneWorldCoords(false);
        
        // Player zone (bottom) - coordinates already include offset
        this.deploymentZoneGraphics.lineStyle(3, 0x4a90e2, 0.6);
        this.deploymentZoneGraphics.fillStyle(0x4a90e2, 0.1);
        this.deploymentZoneGraphics.fillRect(playerZone.x, playerZone.y, playerZone.width, playerZone.height);
        this.deploymentZoneGraphics.strokeRect(playerZone.x, playerZone.y, playerZone.width, playerZone.height);
        
        // Enemy zone (top) - coordinates already include offset
        this.deploymentZoneGraphics.lineStyle(3, 0xd22d2d, 0.6);
        this.deploymentZoneGraphics.fillStyle(0xd22d2d, 0.1);
        this.deploymentZoneGraphics.fillRect(enemyZone.x, enemyZone.y, enemyZone.width, enemyZone.height);
        this.deploymentZoneGraphics.strokeRect(enemyZone.x, enemyZone.y, enemyZone.width, enemyZone.height);
        
        // Draw expanded zones if they exist
        this.drawExpandedZones(offsetX);
    }

    drawExpandedZones(offsetX) {
        // Draw player expanded zones
        if (this.expandedDeploymentZones.player && this.expandedDeploymentZones.player.expandedAreas) {
            this.expandedDeploymentZones.player.expandedAreas.forEach(area => {
                const areaX = offsetX + area.tileX * GAME_CONFIG.TILE_SIZE;
                const areaY = area.tileY * GAME_CONFIG.TILE_SIZE;
                const areaWidth = area.tilesWidth * GAME_CONFIG.TILE_SIZE;
                const areaHeight = area.tilesHeight * GAME_CONFIG.TILE_SIZE;
                
                // Player expanded zones - brighter blue with dashed border
                this.deploymentZoneGraphics.lineStyle(3, 0x6db4ff, 0.8);
                this.deploymentZoneGraphics.fillStyle(0x6db4ff, 0.2);
                this.deploymentZoneGraphics.fillRect(areaX, areaY, areaWidth, areaHeight);
                this.deploymentZoneGraphics.strokeRect(areaX, areaY, areaWidth, areaHeight);
            });
        }
        
        // Draw AI expanded zones
        if (this.expandedDeploymentZones.enemy && this.expandedDeploymentZones.enemy.expandedAreas) {
            this.expandedDeploymentZones.enemy.expandedAreas.forEach(area => {
                const areaX = offsetX + area.tileX * GAME_CONFIG.TILE_SIZE;
                const areaY = area.tileY * GAME_CONFIG.TILE_SIZE;
                const areaWidth = area.tilesWidth * GAME_CONFIG.TILE_SIZE;
                const areaHeight = area.tilesHeight * GAME_CONFIG.TILE_SIZE;
                
                // AI expanded zones - brighter red with dashed border
                this.deploymentZoneGraphics.lineStyle(3, 0xff6b6b, 0.8);
                this.deploymentZoneGraphics.fillStyle(0xff6b6b, 0.2);
                this.deploymentZoneGraphics.fillRect(areaX, areaY, areaWidth, areaHeight);
                this.deploymentZoneGraphics.strokeRect(areaX, areaY, areaWidth, areaHeight);
            });
        }
    }

    createUI() {
        // Tank cards positioned below the base
        this.createTankCards();

        // Energy bar positioned at the very bottom, centered
        this.createEnergyBar();
        
        // Timer in top right corner
        this.createTimer();

        // AI Strategy indicator
        this.aiStrategyText = this.add.text(20, 50, 'AI: Analyzing...', {
            fontSize: '14px',
            fill: '#ffaa00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.aiStrategyText.setScrollFactor(0);

        // Back button
        const backButton = this.add.text(20, 20, '← MENU', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setInteractive();
        backButton.setScrollFactor(0);

        backButton.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    createTankCards() {
        // Position cards below the battlefield tiles (outside the game area)
        // Battlefield height is GAME_CONFIG.WORLD_HEIGHT (44 * 19 = 836px)
        const cardsY = GAME_CONFIG.WORLD_HEIGHT + UI_CONFIG.CARDS.MARGIN_BELOW_BATTLEFIELD;
        const cardWidth = UI_CONFIG.CARDS.WIDTH;
        const cardHeight = UI_CONFIG.CARDS.HEIGHT;
        const cardSpacing = UI_CONFIG.CARDS.SPACING;
        const totalWidth = (4 * cardSpacing) - (cardSpacing - cardWidth); // Account for spacing
        const startX = (GAME_CONFIG.WIDTH - totalWidth) / 2; // Center horizontally

        this.tankCards = [];
        
        // Create 4 cards from hand
        for (let index = 0; index < 4; index++) {
            const cardId = this.hand[index];
            const cardDef = CARDS[cardId];
            // Determine a representative tank type for icon rendering
            const iconTankType = cardDef.type === CARD_TYPES.TROOP
                ? TANK_DATA[cardDef.payload.tankId]?.type || TANK_TYPES.LIGHT
                : (cardDef.type === CARD_TYPES.BUILDING ? TANK_TYPES.MEDIUM : TANK_TYPES.LIGHT);
            const tankData = cardDef.type === CARD_TYPES.TROOP
                ? TANK_DATA[cardDef.payload.tankId]
                : null;
            const cardX = startX + index * cardSpacing;

            // Card background
            const card = this.add.image(cardX, cardsY, 'card_bg')
                .setDisplaySize(cardWidth, cardHeight)
                .setInteractive()
                .setOrigin(0);
            card.setScrollFactor(0);

            // Icon - use mini tank drawing; for non-troops, use representative type only for icon
            const tankIcon = this.graphicsManager.createMiniTankGraphics(
                cardX + cardWidth/2,
                cardsY + 30,
                iconTankType,
                tankData ? tankData.id : null
            );
            tankIcon.setScale(1.0); // Increased from 0.6 to 1.0 for bigger tanks
            card.tankIcon = tankIcon;

            // Cost - moved to top right corner with better styling
            const costValue = cardDef.cost;
            const costText = this.add.text(cardX + cardWidth - 8, cardsY + 8, costValue, {
                fontSize: UI_CONFIG.CARDS.COST_TEXT.FONT_SIZE,
                fill: UI_CONFIG.CARDS.COST_TEXT.COLOR,
                fontFamily: 'Arial',
                stroke: UI_CONFIG.CARDS.COST_TEXT.STROKE_COLOR,
                strokeThickness: UI_CONFIG.CARDS.COST_TEXT.STROKE_THICKNESS
            }).setOrigin(1, 0);
            costText.setScrollFactor(0);

            // Card name - positioned lower with improved styling
            const displayName = cardDef.name;
            const nameText = this.add.text(cardX + cardWidth/2, cardsY + cardHeight - 12, displayName, {
                fontSize: UI_CONFIG.CARDS.NAME_TEXT.FONT_SIZE,
                fill: UI_CONFIG.CARDS.NAME_TEXT.COLOR,
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            nameText.setScrollFactor(0);

            // Selection border (initially hidden)
            const selectionBorder = this.add.graphics();
            selectionBorder.lineStyle(UI_CONFIG.CARDS.SELECTION_BORDER_WIDTH, UI_CONFIG.CARDS.SELECTION_BORDER_COLOR);
            selectionBorder.strokeRect(cardX - 2, cardsY - 2, cardWidth + 4, cardHeight + 4);
            selectionBorder.setVisible(false);
            selectionBorder.setScrollFactor(0);

            // Store references
            card.index = index;
            card.cardId = cardId;
            card.cardDef = cardDef;
            card.cardType = cardDef.type;
            card.tankId = cardDef.type === CARD_TYPES.TROOP ? cardDef.payload.tankId : null;
            card.tankData = tankData;
            card.costText = costText;
            card.nameText = nameText;
            card.selectionBorder = selectionBorder;

            // Click handler
            card.on('pointerdown', () => {
                this.selectTankCard(index);
            });

            // Hover effects
            card.on('pointerover', () => {
                if (index !== this.selectedCard) {
                    card.setTint(0xcccccc);
                }
                
                // Cancel any pending tooltip timer
                if (this.tooltipTimer) {
                    this.tooltipTimer.destroy();
                    this.tooltipTimer = null;
                }
                
                // Add a small delay before showing tooltip to prevent rapid showing/hiding
                this.tooltipTimer = this.time.delayedCall(500, () => {
                    this.showCardTooltip(index, cardX + cardWidth/2, cardsY - 15);
                    this.tooltipTimer = null;
                });
            });

            card.on('pointerout', () => {
                if (index !== this.selectedCard) {
                    card.clearTint();
                }
                
                // Cancel any pending tooltip timer
                if (this.tooltipTimer) {
                    this.tooltipTimer.destroy();
                    this.tooltipTimer = null;
                }
                
                this.hideCardTooltip();
            });

            this.tankCards.push(card);
        }

        // Select first card by default
        this.selectTankCard(0);
    }

    createEnergyBar() {
        // Position energy bar at the bottom center
        const energyY = GAME_CONFIG.HEIGHT - 20;
        const squareSize = 18; // Size of each energy square
        const squareSpacing = 2; // Gap between squares
        const totalWidth = (this.maxEnergy * squareSize) + ((this.maxEnergy - 1) * squareSpacing);
        const barX = (GAME_CONFIG.WIDTH - totalWidth) / 2;
        const barHeight = squareSize;

        // Store energy bar configuration
        this.energyBarConfig = {
            x: barX,
            y: energyY,
            squareSize: squareSize,
            spacing: squareSpacing,
            totalWidth: totalWidth,
            height: barHeight
        };

        // Energy bar background and squares
        this.energyBarBg = this.add.graphics();
        this.energyBarBg.setScrollFactor(0);

        // Energy bar fill (will draw individual squares)
        this.energyBarFill = this.add.graphics();
        this.energyBarFill.setScrollFactor(0);

        // Energy text
        this.energyText = this.add.text(GAME_CONFIG.WIDTH / 2, energyY - 8, `${this.energy}/${this.maxEnergy}`, {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5, 1);
        this.energyText.setScrollFactor(0);

        // Update energy bar after creating
        this.updateEnergyBar();
    }

    createTimer() {
        // Timer in top right corner
        this.timerText = this.add.text(GAME_CONFIG.WIDTH - 20, 20, this.formatTime(this.battleTime), {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0);
        this.timerText.setScrollFactor(0);

        // Tower status display
        this.createTowerStatusDisplay();
    }

    createTowerStatusDisplay() {
        // Player tower status (bottom left)
        this.playerTowerStatus = this.add.text(20, GAME_CONFIG.HEIGHT - 150, '', {
            fontSize: '12px',
            fill: '#4a90e2',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.playerTowerStatus.setScrollFactor(0);

        // Enemy tower status (top left, below AI status)
        this.enemyTowerStatus = this.add.text(20, 80, '', {
            fontSize: '12px',
            fill: '#d22d2d',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        });
        this.enemyTowerStatus.setScrollFactor(0);

        this.updateTowerStatusDisplay();
    }

    updateTowerStatusDisplay() {
        const playerTowers = this.buildings.filter(b => b.isPlayerBase && b.health > 0);
        const enemyTowers = this.buildings.filter(b => !b.isPlayerBase && b.health > 0);

        // Player towers
        let playerStatus = 'PLAYER TOWERS:\n';
        playerStatus += `Destroyed: ${this.towerStats.enemy.towersDestroyed}/3\n`;
        if (playerTowers.find(t => t.towerType === 'left')) playerStatus += '● Left Tower\n';
        else playerStatus += '✗ Left Tower\n';
        if (playerTowers.find(t => t.towerType === 'right')) playerStatus += '● Right Tower\n';
        else playerStatus += '✗ Right Tower\n';
        if (playerTowers.find(t => t.isMainTower)) playerStatus += '👑 Main Tower';
        else playerStatus += '✗ Main Tower';

        // Enemy towers  
        let enemyStatus = 'ENEMY TOWERS:\n';
        enemyStatus += `Destroyed: ${this.towerStats.player.towersDestroyed}/3\n`;
        if (enemyTowers.find(t => t.towerType === 'left')) enemyStatus += '● Left Tower\n';
        else enemyStatus += '✗ Left Tower\n';
        if (enemyTowers.find(t => t.towerType === 'right')) enemyStatus += '● Right Tower\n';
        else enemyStatus += '✗ Right Tower\n';
        if (enemyTowers.find(t => t.isMainTower)) enemyStatus += '👑 Main Tower';
        else enemyStatus += '✗ Main Tower';

        this.playerTowerStatus.setText(playerStatus);
        this.enemyTowerStatus.setText(enemyStatus);
    }

    selectTankCard(index) {
        // Prevent card selection if battle has ended
        if (this.battleEnded) {
            return;
        }
        
        this.selectedCard = index;
        this.updateCardSelection();
        
        // Show selection feedback
        this.showCardSelectionFeedback(index);
    }

    updateCardSelection() {
        this.tankCards.forEach((card, index) => {
            if (index === this.selectedCard) {
                card.setTint(0xffff00);
                card.selectionBorder.setVisible(true);
            } else {
                card.clearTint();
                card.selectionBorder.setVisible(false);
            }
        });
    }

    showCardTooltip(cardIndex, x, y) {
        // Always hide any existing tooltip first to prevent overlaps
        this.hideCardTooltip();
        const cardRef = this.tankCards[cardIndex];
        const isTroop = cardRef.cardType === CARD_TYPES.TROOP;
        const tankData = isTroop ? cardRef.tankData : null;
        
        // Dynamic positioning to avoid edge clipping
        const tooltipWidth = 280;
        const tooltipHeight = 180;
        let tooltipX = x - tooltipWidth / 2;
        let tooltipY = y - tooltipHeight - 15;
        
        // Adjust if tooltip would go off screen
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + tooltipWidth > GAME_CONFIG.WIDTH - 10) {
            tooltipX = GAME_CONFIG.WIDTH - tooltipWidth - 10;
        }
        if (tooltipY < 10) tooltipY = y + 15; // Show below card if no room above
        
        this.cardTooltip = this.add.container(tooltipX, tooltipY);
        this.cardTooltip.setScrollFactor(0);
        this.cardTooltip.setDepth(100); // Ensure tooltip is on top
        
    // Enhanced tooltip background with gradient effect
        const tooltipBg = this.add.graphics();
        
        // Main background
        tooltipBg.fillStyle(0x1a1a1a, 0.95);
        tooltipBg.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);
        
    // Determine cost (troop vs non-troop) and draw border with energy accent
    const costVal = isTroop ? tankData.cost : cardRef.cardDef.cost;
    const borderColor = costVal <= this.energy ? 0x4a90e2 : 0x666666;
        tooltipBg.lineStyle(3, borderColor, 0.8);
        tooltipBg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);
        
        // Header section with type color
        const typeColors = {
            [TANK_TYPES.LIGHT]: 0x00ff88,
            [TANK_TYPES.MEDIUM]: 0xffaa00,
            [TANK_TYPES.HEAVY]: 0xff0066,
            [TANK_TYPES.TANK_DESTROYER]: 0x9900ff,
            [TANK_TYPES.ARTILLERY]: 0xffff00,
            [TANK_TYPES.FAST_ATTACK]: 0x00ccff
        };
        const headerColor = isTroop ? (typeColors[tankData.type] || 0x4a90e2) : 0x4a90e2;
        tooltipBg.fillStyle(headerColor, 0.3);
        tooltipBg.fillRoundedRect(2, 2, tooltipWidth - 4, 35, 6);
        
        // Tank name and tier
        const nameText = this.add.text(15, 12, isTroop ? `${tankData.name}` : `${cardRef.cardDef.name}`, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        const tierText = this.add.text(tooltipWidth - 15, 12, isTroop ? `Tier ${tankData.tier}` : `${cardRef.cardDef.type.toUpperCase()}`, {
            fontSize: '12px',
            fill: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(1, 0);
        
        // Tank type indicator
        const typeText = this.add.text(15, 28, isTroop ? tankData.type.toUpperCase() : cardRef.cardDef.type.toUpperCase(), {
            fontSize: '10px',
            fill: '#aaaaaa',
            fontFamily: 'Arial'
        });
        
    // Cost indicator with energy status
        const costColor = costVal <= this.energy ? '#00ff00' : '#ff6666';
        const costText = this.add.text(tooltipWidth - 15, 28, `Cost: ${costVal}`, {
            fontSize: '12px',
            fill: costColor,
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(1, 0);
        
        if (!isTroop) {
            // Simple content for spells/buildings
            const descY = 55;
            const desc = cardRef.cardDef.id === 'zap' ? `Small area damage and brief stun.`
                        : cardRef.cardDef.id === 'fireball' ? `Medium-radius area damage.`
                        : cardRef.cardDef.id === 'furnace' ? `Spawns fire spirits periodically.`
                        : `Special card.`;
            const body = this.add.text(15, descY, desc, {
                fontSize: '12px', fill: '#ffffff', fontFamily: 'Arial', wordWrap: { width: tooltipWidth - 30 }
            });
            this.cardTooltip.add([tooltipBg, nameText, tierText, typeText, costText, body]);
            this.cardTooltip.alpha = 0;
            this.tooltipFadeInTween = this.tweens.add({ targets: this.cardTooltip, alpha: 1, duration: 150 });
            return;
        }
        
        // Main stats section (troop)
        const statsY = 50;
        const leftColumnX = 15;
        const rightColumnX = 150;
        
        // Combat stats (left column)
        const combatTitle = this.add.text(leftColumnX, statsY, 'COMBAT', {
            fontSize: '11px',
            fill: '#ffaa00',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        
        const combatStats = this.add.text(leftColumnX, statsY + 15, 
            `Health: ${tankData.stats.hp}\n` +
            `Damage: ${tankData.stats.damage}\n` +
            `Range: ${tankData.stats.range}\n` +
            `Penetration: ${tankData.stats.penetration}`, {
            fontSize: '11px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            lineSpacing: 2
        });
        
        // Mobility & Armor stats (right column)
        const mobilityTitle = this.add.text(rightColumnX, statsY, 'MOBILITY & ARMOR', {
            fontSize: '11px',
            fill: '#00ccff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        
        const mobilityStats = this.add.text(rightColumnX, statsY + 15,
            `Speed: ${tankData.stats.speed}\n` +
            `Front Armor: ${tankData.stats.armor.front}\n` +
            `Side Armor: ${tankData.stats.armor.side}\n` +
            `Rear Armor: ${tankData.stats.armor.rear}`, {
            fontSize: '11px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            lineSpacing: 2
        });
        
    // Abilities section
        const abilitiesY = 120;
    if (tankData.abilities && tankData.abilities.length > 0) {
            const abilitiesTitle = this.add.text(leftColumnX, abilitiesY, 'ABILITIES', {
                fontSize: '11px',
                fill: '#ff6699',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });
            
            const abilitiesText = tankData.abilities.map(ability => {
                // Convert ability names to readable format
                return ability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }).join(', ');
            
            const abilitiesDesc = this.add.text(leftColumnX, abilitiesY + 15, abilitiesText, {
                fontSize: '10px',
                fill: '#ffccdd',
                fontFamily: 'Arial',
                wordWrap: { width: tooltipWidth - 30 }
            });
            
            this.cardTooltip.add([abilitiesTitle, abilitiesDesc]);
        }
        
        // Description at bottom
        const descY = abilitiesY + (tankData.abilities && tankData.abilities.length > 0 ? 35 : 15);
        const descText = this.add.text(leftColumnX, descY, tankData.description, {
            fontSize: '10px',
            fill: '#cccccc',
            fontFamily: 'Arial',
            fontStyle: 'italic',
            wordWrap: { width: tooltipWidth - 30 }
        });
        
        // Add all elements to container
        this.cardTooltip.add([
            tooltipBg, nameText, tierText, typeText, costText,
            combatTitle, combatStats, mobilityTitle, mobilityStats, descText
        ]);
        
        // Smooth fade-in animation
        this.cardTooltip.setAlpha(0);
        this.tooltipFadeInTween = this.tweens.add({
            targets: this.cardTooltip,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });
    }

    hideCardTooltip() {
        // Cancel any ongoing fade-in animation
        if (this.tooltipFadeInTween) {
            this.tooltipFadeInTween.destroy();
            this.tooltipFadeInTween = null;
        }
        
        // Cancel any ongoing fade-out animation
        if (this.tooltipFadeOutTween) {
            this.tooltipFadeOutTween.destroy();
            this.tooltipFadeOutTween = null;
        }
        
        if (this.cardTooltip) {
            // Immediately destroy if already fully transparent or if we need to clean up quickly
            if (this.cardTooltip.alpha === 0) {
                this.cardTooltip.destroy();
                this.cardTooltip = null;
                return;
            }
            
            // Smooth fade-out animation before destroying
            this.tooltipFadeOutTween = this.tweens.add({
                targets: this.cardTooltip,
                alpha: 0,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    if (this.cardTooltip) {
                        this.cardTooltip.destroy();
                        this.cardTooltip = null;
                    }
                    this.tooltipFadeOutTween = null;
                }
            });
        }
    }

    createBases() {
        this.createPlayerTowers();
        this.createEnemyTowers();
        this.createTowerHealthBars();
    }

    createPlayerTowers() {
        this.createTowerSet(true); // true = player towers
    }

    createEnemyTowers() {
        this.createTowerSet(false); // false = enemy towers
    }

    createTowerSet(isPlayerTeam) {
        const teamConfig = isPlayerTeam ? 
            BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER : 
            BATTLE_CONFIG.TOWERS.POSITIONS.ENEMY;

        this.createTower(teamConfig.LEFT, 'left', isPlayerTeam, false);
        this.createTower(teamConfig.RIGHT, 'right', isPlayerTeam, false);
        this.createTower(teamConfig.MAIN, 'main', isPlayerTeam, true);
    }

    createTower(positionConfig, towerType, isPlayerTeam, isMainTower) {
        // Get world position from tile coordinates
        const towerTile = GameHelpers.tileToWorld(
            positionConfig.tileX,
            positionConfig.tileY
        );
        
        // Create custom tower graphics
        const tower = this.createTowerGraphics(towerTile.worldX, towerTile.worldY, isPlayerTeam, isMainTower);
        
        // Set tower properties
        const health = isMainTower ? BATTLE_CONFIG.TOWERS.MAIN_TOWER_HEALTH : BATTLE_CONFIG.TOWERS.SIDE_TOWER_HEALTH;
        tower.health = health;
        tower.maxHealth = health;
        tower.isPlayerBase = isPlayerTeam;
        tower.isMainTower = isMainTower;
        tower.towerType = towerType;
        tower.lastShotTime = 0;
        tower.target = null;
        tower.lastTargetUpdate = 0;
        
        // Adjust position for main towers
        if (isMainTower) {
            // Move the tower half a tile up to center it
            tower.x += GAME_CONFIG.TILE_SIZE / 2;
        }
        
        // Add to buildings array
        this.buildings.push(tower);
    }

    createTowerGraphics(x, y, isPlayerTeam, isMainTower) {
        // Team colors
        const playerBaseColor = 0x4a90e2;  // Blue
        const enemyBaseColor = 0xd22d2d;   // Red
        const stoneColor = 0x888888;       // Gray stone
        const darkStone = 0x555555;        // Dark stone
        const metalColor = 0x666666;       // Metal
        const goldColor = 0xffdd00;        // Gold for main towers
        
        // Create a container for the tower
        const tower = this.add.container(x, y);
        
        // Create graphics object for drawing
        const graphics = this.add.graphics();
        
        if (isMainTower) {
            // Main Tower - Large fortress-like structure
            const size = 60; // Base size
            
            // Foundation
            graphics.fillStyle(darkStone);
            graphics.fillRect(-size/2, size/3, size, size/3);
            
            // Main structure - octagonal shape for more interesting silhouette
            graphics.fillStyle(stoneColor);
            graphics.fillCircle(0, 0, size/2.2);
            
            // Tower walls with team colors
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillCircle(0, 0, size/2.5);
            
            // Inner keep
            graphics.fillStyle(stoneColor);
            graphics.fillCircle(0, 0, size/3.5);
            
            // Golden crown for main towers
            graphics.fillStyle(goldColor);
            graphics.fillRect(-size/4, -size/2.2, size/2, size/8);
            graphics.fillTriangle(-size/4, -size/2.2, 0, -size/1.8, size/4, -size/2.2);
            
            // Battlements
            graphics.fillStyle(stoneColor);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const bx = Math.cos(angle) * size/2.8;
                const by = Math.sin(angle) * size/2.8;
                graphics.fillRect(bx - 2, by - 4, 4, 8);
            }
            
            // Command center windows
            graphics.fillStyle(0x000000);
            graphics.fillRect(-size/8, -size/8, size/4, size/8);
            graphics.fillRect(-size/12, size/12, size/6, size/12);
            
            // Flag/antenna
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillRect(-1, -size/1.8, 2, size/6);
            graphics.fillTriangle(1, -size/1.8, 1, -size/2.2, size/8, -size/2.4);
            
        } else {
            // Side Tower - Smaller defensive tower
            const size = 40; // Smaller than main tower
            
            // Foundation
            graphics.fillStyle(darkStone);
            graphics.fillRect(-size/2, size/3, size, size/4);
            
            // Main tower body
            graphics.fillStyle(stoneColor);
            graphics.fillRoundedRect(-size/2.5, -size/3, size/1.25, size * 0.8, 4);
            
            // Team color accent
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillRoundedRect(-size/3, -size/4, size/1.5, size * 0.6, 3);
            
            // Gun turret
            graphics.fillStyle(metalColor);
            graphics.fillCircle(0, -size/8, size/6);
            
            // Gun barrel
            graphics.fillStyle(darkStone);
            graphics.fillRect(size/6, -size/8 - 2, size/3, 4);
            
            // Defensive walls
            graphics.fillStyle(stoneColor);
            graphics.fillRect(-size/2.2, -size/3, 4, size/4);
            graphics.fillRect(size/2.2 - 4, -size/3, 4, size/4);
            
            // Windows/firing ports
            graphics.fillStyle(0x000000);
            graphics.fillRect(-size/8, -size/6, size/4, 3);
            graphics.fillRect(-size/12, size/12, size/6, 2);
            
            // Team banner
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillRect(-1, -size/2.5, 2, size/8);
            graphics.fillRect(1, -size/2.5, size/12, size/16);
        }
        
        // Add the graphics to the container
        tower.add(graphics);
        
        // Add depth and visual appeal
        tower.setDepth(10);
        
        return tower;
    }

    createTowerHealthBars() {
        const config = UI_CONFIG.HEALTH_BARS.TOWER;
        
        this.buildings.forEach(building => {
            // Health bar background
            const healthBg = this.add.graphics();
            healthBg.fillStyle(config.BACKGROUND_COLOR);
            healthBg.fillRect(
                building.x - config.OFFSET_X, 
                building.y - config.OFFSET_Y, 
                config.WIDTH, 
                config.HEIGHT
            );
            building.healthBg = healthBg;

            // Health bar fill
            const healthFill = this.add.graphics();
            building.healthFill = healthFill;
            
            // Health percentage text
            const healthText = this.add.text(
                building.x, 
                building.y - config.OFFSET_Y - 15, 
                `${building.health}/${building.maxHealth}`, {
                fontSize: '14px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            building.healthText = healthText;
            
            this.updateBuildingHealth(building);
        });
    }

    updateBuildingHealth(building) {
        const config = UI_CONFIG.HEALTH_BARS.TOWER;
        const healthPercent = building.health / building.maxHealth;
        
        building.healthFill.clear();
        
        // Use configured color thresholds for towers
        let healthColor;
        if (healthPercent > 0.75) {
            healthColor = config.COLORS.HIGH;
        } else if (healthPercent > 0.5) {
            healthColor = config.COLORS.MEDIUM_HIGH;
        } else if (healthPercent > 0.25) {
            healthColor = config.COLORS.MEDIUM;
        } else {
            healthColor = config.COLORS.LOW;
        }
        
        building.healthFill.fillStyle(healthColor);
        building.healthFill.fillRect(
            building.x - config.OFFSET_X, 
            building.y - config.OFFSET_Y, 
            config.WIDTH * healthPercent, 
            config.HEIGHT
        );
        
        // Update health text
        if (building.healthText) {
            building.healthText.setText(`${Math.ceil(building.health)}/${building.maxHealth}`);
            building.healthText.setFill(healthColor === config.COLORS.LOW ? '#ff0000' : '#ffffff');
        }
    }

    startEnergyRegeneration() {
        this.energyTimer = this.time.addEvent({
            delay: this.getEnergyRegenDelay(),
            callback: () => {
                if (this.energy < this.maxEnergy) {
                    this.energy = Math.min(this.energy + ENERGY_CONFIG.REGEN_RATE, this.maxEnergy);
                    this.updateEnergyBar();
                    
                    // Visual feedback for energy gain
                    this.showEnergyGainEffect();
                }
                
                // Update the delay for next tick based on current battle time
                this.energyTimer.delay = this.getEnergyRegenDelay();
            },
            loop: true
        });
    }

    getEnergyRegenDelay() {
        // Use double time rate when 60 seconds or less remain
        if (this.battleTime <= ENERGY_CONFIG.DOUBLE_TIME_THRESHOLD) {
            return ENERGY_CONFIG.DOUBLE_TIME_DELAY;
        }
        return ENERGY_CONFIG.NORMAL_TIME_DELAY;
    }

    showEnergyGainEffect() {
        // Create a small energy gain indicator positioned above the energy bar
        const config = this.energyBarConfig;
        const energyGainText = this.add.text(GAME_CONFIG.WIDTH / 2, config.y - 15, '+1', {
            fontSize: '16px',
            fill: '#00ff88',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#003322',
            strokeThickness: 2
        }).setOrigin(0.5);
        energyGainText.setScrollFactor(0);
        
        // Pulse effect on the newest energy square
        if (this.energy > 0) {
            const latestSquareIndex = this.energy - 1;
            const squareX = config.x + (latestSquareIndex * (config.squareSize + config.spacing)) + config.squareSize / 2;
            const squareY = config.y + config.squareSize / 2;
            
            // Create a temporary glow effect on the newest square
            const glowCircle = this.add.graphics();
            glowCircle.setScrollFactor(0);
            glowCircle.fillStyle(0x00ff88, 0.6);
            glowCircle.fillCircle(squareX, squareY, config.squareSize);
            
            this.tweens.add({
                targets: glowCircle,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 600,
                ease: 'Power2',
                onComplete: () => glowCircle.destroy()
            });
        }
        
        this.tweens.add({
            targets: energyGainText,
            y: energyGainText.y - 25,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => energyGainText.destroy()
        });
    }

    updateEnergyBar() {
        const config = this.energyBarConfig;
        
        // Clear previous graphics
        this.energyBarBg.clear();
        this.energyBarFill.clear();
        
        // Draw individual energy squares
        for (let i = 0; i < this.maxEnergy; i++) {
            const squareX = config.x + (i * (config.squareSize + config.spacing));
            const squareY = config.y;
            
            // Background square (empty state)
            this.energyBarBg.fillStyle(0x333333, 0.8);
            this.energyBarBg.lineStyle(1, 0x555555, 0.8);
            this.energyBarBg.fillRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 2);
            this.energyBarBg.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 2);
            
            // Filled square if we have energy for this slot
            if (i < this.energy) {
                // Gradient effect: brighter blue for current energy, slightly dimmer for reserve
                let fillColor = 0x4a90e2; // Base blue
                let alpha = 1.0;
                
                // Make the most recent energy points brighter
                if (i >= this.energy - 2 && i < this.energy) {
                    fillColor = 0x5aa3ff; // Brighter blue for recent energy
                    alpha = 1.0;
                } else {
                    alpha = 0.9; // Slightly dimmer for older energy
                }
                
                this.energyBarFill.fillStyle(fillColor, alpha);
                this.energyBarFill.lineStyle(1, 0x6bb6ff, 0.9);
                this.energyBarFill.fillRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 2);
                this.energyBarFill.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 2);
                
                // Add a small highlight for filled squares
                this.energyBarFill.fillStyle(0xffffff, 0.3);
                this.energyBarFill.fillRoundedRect(squareX + 2, squareY + 2, config.squareSize - 8, 3, 1);
            }
        }
        
        // Update energy text
        if (this.energyText) {
            this.energyText.setText(`${this.energy}/${this.maxEnergy}`);
        }
        
        // Update deployment preview if active (energy might have changed during preview)
        // Only update if deploymentPreview has been initialized
        if (this.deploymentPreview && this.deploymentPreview.active) {
            this.updateDeploymentPreview(this.deploymentPreview.tileX, this.deploymentPreview.tileY);
        }
    }

    startBattleTimer() {
        this.battleTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.battleTime--;
                this.updateTimerDisplay();
                
                if (this.battleTime <= 0) {
                    if (!this.overtimeActive) {
                        // Check if overtime is needed
                        this.checkOvertimeConditions();
                    } else {
                        // Already in overtime - check if max overtime reached
                        const overtimeSeconds = Math.abs(this.battleTime);
                        if (overtimeSeconds >= this.maxOvertimeSeconds) {
                            // Max overtime reached - end battle
                            this.endBattle('time');
                        } else {
                            // Continue checking for overtime victory conditions
                            this.checkOvertimeVictoryConditions();
                        }
                    }
                }
            },
            loop: true
        });
    }

    updateTimerDisplay() {
        let timeText;
        let timeColor = '#ffffff';
        
        if (this.overtimeActive) {
            // Overtime display
            const overtimeSeconds = Math.abs(this.battleTime);
            timeText = `+${this.formatTime(overtimeSeconds)}`;
            timeColor = '#ff4444';
            
            // Pulse effect during overtime
            this.tweens.add({
                targets: this.timerText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 200,
                yoyo: true,
                ease: 'Power2'
            });
        } else {
            timeText = this.formatTime(this.battleTime);
            
            // Change timer color when time is running low
            if (this.battleTime <= 10) {
                timeColor = '#ff0000'; // Red - Critical
                // Flash effect for last 10 seconds
                this.tweens.add({
                    targets: this.timerText,
                    alpha: 0.3,
                    duration: 500,
                    yoyo: true,
                    ease: 'Power2'
                });
            } else if (this.battleTime <= 30) {
                timeColor = '#ff0000'; // Red
            } else if (this.battleTime <= 60) {
                timeColor = '#ffff00'; // Yellow
            }
        }
        
        this.timerText.setText(timeText);
        this.timerText.setFill(timeColor);
    }

    checkOvertimeConditions() {
        const playerBase = this.buildings.find(b => b.isPlayerBase);
        const enemyBase = this.buildings.find(b => !b.isPlayerBase);
        
        // If both bases alive and health is close, activate overtime
        if (playerBase && enemyBase) {
            const playerHealthPercent = playerBase.health / playerBase.maxHealth;
            const enemyHealthPercent = enemyBase.health / enemyBase.maxHealth;
            const healthDiff = Math.abs(playerHealthPercent - enemyHealthPercent);
            
            if (healthDiff <= 0.1 && !this.overtimeActive) {
                // Health difference <= 10% - activate overtime
                this.activateOvertime();
                return;
            }
        }
        
        // No overtime needed - end battle normally
        this.endBattle('time');
    }

    activateOvertime() {
        this.overtimeActive = true;
        this.overtimeStartTime = this.time.now;
        this.maxOvertimeSeconds = 60; // 1 minute overtime max
        
        // Show overtime notification
        this.showOvertimeNotification();
        
        // Overtime timer continues counting down from 0
        this.battleTime = 0;
    }

    showOvertimeNotification() {
        const overtimeText = this.add.text(GAME_CONFIG.WIDTH / 2, 150, 'OVERTIME!', {
            fontSize: '32px',
            fill: '#ff4444',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        overtimeText.setScrollFactor(0);
        overtimeText.setDepth(50);
        
        const subtitleText = this.add.text(GAME_CONFIG.WIDTH / 2, 180, 'First to gain advantage wins!', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        subtitleText.setScrollFactor(0);
        subtitleText.setDepth(50);
        
        // Dramatic entrance animation
        this.tweens.add({
            targets: [overtimeText, subtitleText],
            scaleX: { from: 0, to: 1 },
            scaleY: { from: 0, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                // Fade out after 3 seconds
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: [overtimeText, subtitleText],
                        alpha: 0,
                        duration: 1000,
                        onComplete: () => {
                            overtimeText.destroy();
                            subtitleText.destroy();
                        }
                    });
                });
            }
        });
        
        // Screen flash effect
        const flashOverlay = this.add.graphics();
        flashOverlay.fillStyle(0xff4444, 0.3);
        flashOverlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        flashOverlay.setScrollFactor(0);
        flashOverlay.setDepth(45);
        
        this.tweens.add({
            targets: flashOverlay,
            alpha: 0,
            duration: 800,
            onComplete: () => flashOverlay.destroy()
        });
    }

    checkOvertimeVictoryConditions() {
        const playerTowers = this.buildings.filter(b => b.isPlayerBase && b.health > 0);
        const enemyTowers = this.buildings.filter(b => !b.isPlayerBase && b.health > 0);
        
        // Check for tower destruction advantage
        const playerTowersDestroyed = 3 - playerTowers.length;
        const enemyTowersDestroyed = 3 - enemyTowers.length;
        
        if (playerTowersDestroyed > enemyTowersDestroyed) {
            this.endBattle('victory'); // Player has destroyed more towers
        } else if (enemyTowersDestroyed > playerTowersDestroyed) {
            this.endBattle('defeat'); // Enemy has destroyed more towers
        } else {
            // Same number of towers destroyed, check health advantage
            const playerBase = this.buildings.find(b => b.isPlayerBase && b.isMainTower);
            const enemyBase = this.buildings.find(b => !b.isPlayerBase && b.isMainTower);
            
            if (playerBase && enemyBase) {
                const playerHealthPercent = playerBase.health / playerBase.maxHealth;
                const enemyHealthPercent = enemyBase.health / enemyBase.maxHealth;
                const healthDiff = playerHealthPercent - enemyHealthPercent;
                
                // Need at least 5% health advantage to win during overtime
                if (healthDiff >= 0.05) {
                    this.endBattle('victory'); // Player has health advantage
                } else if (healthDiff <= -0.05) {
                    this.endBattle('defeat'); // Enemy has health advantage
                }
                // If health difference is too small (< 5%), continue overtime
            }
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    onPointerDown(pointer) {
        // Prevent interactions if battle has ended
        if (this.battleEnded) {
            return;
        }
        
        // Convert screen coordinates to world coordinates
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileCoords = GameHelpers.worldToTile(worldX, worldY);
        
        // Check if click started in valid deployment area
        if (GameHelpers.isValidDeploymentTile(tileCoords.tileX, tileCoords.tileY, true, this.expandedDeploymentZones)) {
            const selectedCard = this.tankCards[this.selectedCard];
            // Only show preview for troop cards
            if (selectedCard.cardType === CARD_TYPES.TROOP) {
                this.startDeploymentPreview(tileCoords.tileX, tileCoords.tileY, selectedCard);
            }
        }
    }

    onPointerMove(pointer) {
    if (!this.deploymentPreview.active) { return; }
        
        // Convert screen coordinates to world coordinates
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileCoords = GameHelpers.worldToTile(worldX, worldY);
        
        // Update preview position
        this.updateDeploymentPreview(tileCoords.tileX, tileCoords.tileY);
    }

    onPointerUp(pointer) {
        const selectedCard = this.tankCards[this.selectedCard];
        if (selectedCard.cardType !== CARD_TYPES.TROOP) {
            // Handle spells/buildings immediately on pointer up
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            this.useNonTroopCardAt(selectedCard, worldX, worldY);
            return;
        }
        if (!this.deploymentPreview.active) { return; }
        
        // If the preview is in a valid position, deploy the tank
        if (this.deploymentPreview.validPosition) {
            const selectedCardData = this.tankCards[this.selectedCard];
            
            // Check energy when actually deploying (use card cost)
            if (this.energy >= selectedCardData.cardDef.cost) {
                const snappedPos = GameHelpers.tileToWorld(
                    this.deploymentPreview.tileX, 
                    this.deploymentPreview.tileY
                );
                
                // Swarm support (e.g., Skeleton Army)
                const payload = selectedCardData.cardDef.payload || {};
                if (payload.swarm && payload.count && selectedCardData.tankId) {
                    for (let i = 0; i < payload.count; i++) {
                        const ox = GameHelpers.randomInt(-15, 15);
                        const oy = GameHelpers.randomInt(-10, 10);
                        this.deployTank(selectedCardData.tankId, snappedPos.worldX + ox, snappedPos.worldY + oy);
                    }
                } else {
                    this.deployTank(selectedCardData.tankId, snappedPos.worldX, snappedPos.worldY);
                }
                // Deduct card cost
                this.energy -= selectedCardData.cardDef.cost;
                this.updateEnergyBar();
                
                // Cycle the used card
                this.cycleCard(this.selectedCard);
            } else {
                // Show energy warning only when actually trying to deploy
                this.showInsufficientEnergyFeedback();
            }
        }
        
        // Clean up preview
        this.endDeploymentPreview();
    }

    startDeploymentPreview(tileX, tileY, selectedCardData) {
        this.deploymentPreview.active = true;
        this.deploymentPreview.tankType = selectedCardData.tankData.type;
        this.deploymentPreview.startedInBattlefield = true;
        
        // Create preview tank graphics (semi-transparent)
        const snappedPos = GameHelpers.tileToWorld(tileX, tileY);
        this.deploymentPreview.previewTank = this.graphicsManager.createTankGraphics(
            snappedPos.worldX, 
            snappedPos.worldY, 
            selectedCardData.tankData.type, 
            true,
            selectedCardData.tankData.id
        );
        this.deploymentPreview.previewTank.setAlpha(0.7);
        this.deploymentPreview.previewTank.setDepth(15); // Above other tanks
        
        // Point the preview tank towards the enemy field
        const enemyBase = this.buildings.find(b => !b.isPlayerBase && b.isMainTower);
        if (enemyBase) {
            const initialAngle = GameHelpers.angle(snappedPos.worldX, snappedPos.worldY, enemyBase.x, enemyBase.y);
            this.deploymentPreview.previewTank.setRotation(initialAngle);
        } else {
            // If no enemy base found, face upward (towards enemy side)
            this.deploymentPreview.previewTank.setRotation(-Math.PI / 2); // -90 degrees = upward
        }
        
        // Create preview attack range circle
        this.deploymentPreview.previewRangeCircle = this.add.graphics();
        this.deploymentPreview.previewRangeCircle.setDepth(20); // Higher depth to ensure visibility
        
        this.updateDeploymentPreview(tileX, tileY);
    }

    // Use a non-troop card (spell or building) at world position
    useNonTroopCardAt(selectedCard, worldX, worldY) {
        const card = selectedCard.cardDef;
        if (!card) return;
        if (this.energy < card.cost) {
            this.showInsufficientEnergyFeedback();
            return;
        }
        // Basic placement validation
        if (!GameHelpers.isWithinBattlefieldWorld(worldX, worldY)) {
            this.showInvalidPlacementFeedback('Place inside the battlefield');
            return;
        }
        const { tileX, tileY } = GameHelpers.worldToTile(worldX, worldY);
        if (card.type === CARD_TYPES.BUILDING) {
            // Buildings must be placed in player's current deployment zones (including expansions)
            if (!GameHelpers.isValidDeploymentTile(tileX, tileY, true, this.expandedDeploymentZones)) {
                this.showInvalidPlacementFeedback('Place building on your side');
                return;
            }
        }
        if (card.type === CARD_TYPES.SPELL) {
            // Spells can be cast anywhere on battlefield, but we'll bias toward targeting enemies
            // If no enemies in radius, warn once and still allow
            const radius = card.payload?.radius || 0;
            const anyEnemyInRadius = this.tanks.concat(this.buildings).some(o => {
                if (!o || o.health <= 0) return false;
                const isEnemy = (o.isPlayerTank === false) || (!o.isPlayerTank && o.isPlayerBase === false);
                const d = GameHelpers.distance(worldX, worldY, o.x, o.y);
                return isEnemy && d <= radius;
            });
            if (radius > 0 && !anyEnemyInRadius) {
                this.showInvalidPlacementFeedback('No enemies in spell radius');
                // Still allow casting for flexibility; comment next line to block
                // return;
            }
        }
        if (card.type === CARD_TYPES.SPELL) {
            this.castSpell(card, worldX, worldY);
        } else if (card.type === CARD_TYPES.BUILDING) {
            this.placeBuilding(card, worldX, worldY);
        }
        this.energy -= card.cost;
        this.updateEnergyBar();
        this.cycleCard(this.selectedCard);
    }

    castSpell(card, x, y) {
        if (card.id === 'zap') {
            this.createSpellEffectCircle(x, y, card.payload.radius, 0x66ccff);
            this.applyAreaEffect(x, y, card.payload.radius, (target) => {
                // Only affect enemies
                const isEnemy = (target.isPlayerTank === false) || (!target.isPlayerTank && target.isPlayerBase === false);
                if (!isEnemy) return;
                target.health = Math.max(0, target.health - card.payload.damage);
                target.stunnedUntil = this.time.now + (card.payload.stunMs || 0);
                this.combatSystem.updateHealthDisplay(target);
                if (target.health <= 0) {
                    this.combatSystem.handleTargetDestruction(target, null);
                }
            });
            this.playUISound('shoot');
        } else if (card.id === 'fireball') {
            this.createSpellEffectCircle(x, y, card.payload.radius, 0xff7733);
            this.applyAreaEffect(x, y, card.payload.radius, (target) => {
                const isEnemy = (target.isPlayerTank === false) || (!target.isPlayerTank && target.isPlayerBase === false);
                if (!isEnemy) return;
                target.health = Math.max(0, target.health - card.payload.damage);
                this.combatSystem.updateHealthDisplay(target);
                if (target.health <= 0) {
                    this.combatSystem.handleTargetDestruction(target, null);
                }
            });
            this.combatSystem.showExplosionEffect(x, y, 1.2);
            this.playUISound('explosion');
        }
    }

    placeBuilding(card, x, y) {
        // Simple furnace: periodically spawns fire spirits toward enemy side
        const furnace = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(0x444444);
        g.fillRect(-12, -8, 24, 16);
        g.fillStyle(0xff5500);
        g.fillCircle(0, 0, 5);
        furnace.add(g);
    furnace.health = 400;
        furnace.maxHealth = 400;
        furnace.isPlayerBase = true; // So it can be targeted like a building
        furnace.lastShotTime = 0;
        furnace.target = null;
        furnace.lastTargetUpdate = 0;
    furnace.canShoot = false; // Decorative spawner, not a tower
        this.buildings.push(furnace);
        // Create a health bar for the building
        const config = UI_CONFIG.HEALTH_BARS.TOWER;
        const healthBg = this.add.graphics();
        healthBg.fillStyle(config.BACKGROUND_COLOR);
        healthBg.fillRect(
            furnace.x - config.OFFSET_X,
            furnace.y - config.OFFSET_Y,
            config.WIDTH,
            config.HEIGHT
        );
        furnace.healthBg = healthBg;
        const healthFill = this.add.graphics();
        furnace.healthFill = healthFill;
        const healthText = this.add.text(
            furnace.x,
            furnace.y - config.OFFSET_Y - 15,
            `${furnace.health}/${furnace.maxHealth}`,
            { fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }
        ).setOrigin(0.5);
        furnace.healthText = healthText;
        this.updateBuildingHealth(furnace);
        // Lifetime
        this.time.delayedCall(card.payload.lifetimeMs, () => {
            const idx = this.buildings.indexOf(furnace);
            if (idx >= 0) this.buildings.splice(idx, 1);
            // Clean up health UI
            if (furnace.healthBg) furnace.healthBg.destroy();
            if (furnace.healthFill) furnace.healthFill.destroy();
            if (furnace.healthText) furnace.healthText.destroy();
            furnace.destroy();
        });
        // Spawn loop
        const timer = this.time.addEvent({
            delay: card.payload.spawnIntervalMs,
            loop: true,
            callback: () => {
                if (!furnace.scene) { timer.remove(); return; }
                for (let i = 0; i < (card.payload.spawnCount || 1); i++) {
                    const spawnX = x + (i - ((card.payload.spawnCount||1)-1)/2) * 12;
                    const spawnY = y - 10;
                    this.deployTank('tank_fire_spirit', spawnX, spawnY);
                }
            }
        });
    }

    createSpellEffectCircle(x, y, radius, color) {
        const gfx = this.add.graphics();
        gfx.lineStyle(3, color, 1);
        gfx.strokeCircle(x, y, radius);
        gfx.setDepth(999);
        this.tweens.add({ targets: gfx, alpha: 0, duration: 500, onComplete: () => gfx.destroy() });
    }

    applyAreaEffect(x, y, radius, fn) {
        const all = [...this.tanks, ...this.buildings];
        for (const obj of all) {
            if (!obj || typeof obj.health !== 'number' || obj.health <= 0) continue;
            const d = GameHelpers.distance(x, y, obj.x, obj.y);
            if (d <= radius) {
                fn(obj);
            }
        }
    }

    showInvalidPlacementFeedback(message = 'Invalid placement') {
        const text = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 220, message, {
            fontSize: '14px',
            fill: '#ff6666',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        text.setScrollFactor(0);
        text.setDepth(60);
        this.tweens.add({
            targets: text,
            alpha: 0,
            duration: 700,
            delay: 600,
            onComplete: () => text.destroy()
        });
    }

    updateDeploymentPreview(tileX, tileY) {
        if (!this.deploymentPreview.active || !this.deploymentPreview.previewTank) {
            return;
        }
        
        // If coordinates are provided, update them; otherwise use stored coordinates
        if (tileX !== undefined && tileY !== undefined) {
            this.deploymentPreview.tileX = tileX;
            this.deploymentPreview.tileY = tileY;
        } else {
            // Use stored coordinates (called from energy update)
            tileX = this.deploymentPreview.tileX;
            tileY = this.deploymentPreview.tileY;
        }
        
        // Check if current position is valid
        const isValid = GameHelpers.isValidDeploymentTile(tileX, tileY, true, this.expandedDeploymentZones);
        
        // Check if there's enough energy
    const selectedCardData = this.tankCards[this.selectedCard];
    const cost = selectedCardData.cardType === CARD_TYPES.TROOP ? selectedCardData.tankData.cost : selectedCardData.cardDef.cost;
    const hasEnoughEnergy = this.energy >= cost;
        
        this.deploymentPreview.validPosition = isValid && hasEnoughEnergy;
        
        // Update preview tank position only if coordinates were provided
        if (arguments.length >= 2) {
            const snappedPos = GameHelpers.tileToWorld(tileX, tileY);
            this.deploymentPreview.previewTank.setPosition(snappedPos.worldX, snappedPos.worldY);
        }
        
        // Always update tank appearance based on validity and energy
        const snappedPos = GameHelpers.tileToWorld(tileX, tileY);
        
        if (isValid && hasEnoughEnergy) {
            // Valid position and enough energy - bright preview
            this.deploymentPreview.previewTank.setAlpha(0.8);
            // For containers, we need to tint the child graphics objects
            this.deploymentPreview.previewTank.list.forEach(child => {
                if (child.clearTint) {
                    child.clearTint();
                }
            });
        } else if (isValid && !hasEnoughEnergy) {
            // Valid position but not enough energy - very transparent
            this.deploymentPreview.previewTank.setAlpha(0.3);
            // For containers, we need to tint the child graphics objects
            this.deploymentPreview.previewTank.list.forEach(child => {
                if (child.setTint) {
                    child.setTint(0xaaaaaa); // Gray tint for insufficient energy
                }
            });
        } else {
            // Invalid position - medium transparency with red tint
            this.deploymentPreview.previewTank.setAlpha(0.5);
            // For containers, we need to tint the child graphics objects
            this.deploymentPreview.previewTank.list.forEach(child => {
                if (child.setTint) {
                    child.setTint(0xff6666); // Red tint for invalid
                }
            });
        }
        
        // Update attack range circle
        this.updatePreviewAttackRange(snappedPos.worldX, snappedPos.worldY, isValid, hasEnoughEnergy);
    }

    updatePreviewAttackRange(worldX, worldY, isValid, hasEnoughEnergy = true) {
        if (!this.deploymentPreview.previewRangeCircle) {
            return;
        }
        
    const selectedCardData = this.tankCards[this.selectedCard];
    const range = selectedCardData.tankData?.stats?.range || 0; // Only for troops
        
        this.deploymentPreview.previewRangeCircle.clear();
        
        // Draw range circle with appropriate color based on validity and energy
        let circleColor, circleAlpha;
        
        if (isValid && hasEnoughEnergy) {
            // Valid position and enough energy - green
            circleColor = 0x00ff00;
            circleAlpha = 0.3;
        } else if (isValid && !hasEnoughEnergy) {
            // Valid position but not enough energy - gray
            circleColor = 0x888888;
            circleAlpha = 0.2;
        } else {
            // Invalid position - red
            circleColor = 0xff6666;
            circleAlpha = 0.2;
        }
        
        this.deploymentPreview.previewRangeCircle.lineStyle(2, circleColor, 0.8);
        this.deploymentPreview.previewRangeCircle.fillStyle(circleColor, circleAlpha);
        if (range > 0) {
            this.deploymentPreview.previewRangeCircle.fillCircle(worldX, worldY, range);
            this.deploymentPreview.previewRangeCircle.strokeCircle(worldX, worldY, range);
        }
    }

    endDeploymentPreview() {
        if (this.deploymentPreview.previewTank) {
            this.deploymentPreview.previewTank.destroy();
            this.deploymentPreview.previewTank = null;
        }
        
        if (this.deploymentPreview.previewRangeCircle) {
            this.deploymentPreview.previewRangeCircle.destroy();
            this.deploymentPreview.previewRangeCircle = null;
        }
        
        this.deploymentPreview.active = false;
        this.deploymentPreview.validPosition = false;
        this.deploymentPreview.startedInBattlefield = false;
    }

    onBattlefieldClick(pointer) {
        // This method is now replaced by the pointer down/move/up system
        // Keeping it for backwards compatibility but it should not be called
        return;
    }

    deployTank(tankId, x, y) {
        const tankData = TANK_DATA[tankId];
        
        const tank = this.graphicsManager.createTankGraphics(x, y, tankData.type, true, tankData.id); // true = player tank
        
        // Tank properties
        tank.tankId = tankId;
        tank.tankData = tankData;
        tank.health = tankData.stats.hp;
        tank.maxHealth = tankData.stats.hp;
        tank.isPlayerTank = true;
        tank.target = null;
        tank.lastShotTime = 0;
        tank.lastTargetUpdate = 0; // For AI target selection
        
        // Pathfinding properties
        tank.path = null;
        tank.pathIndex = 0;
        tank.needsNewPath = true;

        // Face towards the enemy base initially
        const enemyBase = this.buildings.find(b => !b.isPlayerBase);
        if (enemyBase) {
            const initialAngle = GameHelpers.angle(x, y, enemyBase.x, enemyBase.y);
            tank.setRotation(initialAngle);
        } else {
            // If no enemy base found, face upward (towards enemy side)
            tank.setRotation(-Math.PI / 2); // -90 degrees = upward
        }

        // AI behavior: find best target (closest enemy or enemy base)
        this.aiController.updateTankAI(tank);

        this.tanks.push(tank);
        
        // Create health bar for tank
        this.createTankHealthBar(tank);
        
        // Create debug attack range circle if debug mode is enabled
        if (this.attackRangesVisible) {
            this.createAttackRangeCircle(tank);
        }
        
        // Update statistics
        this.battleStats.player.tanksDeployed++;
        const cost = tankData.cost;
        this.battleStats.player.energySpent += cost;
        this.playUISound('deploy');

        // Track max tanks alive
        const playerTanksAlive = this.tanks.filter(t => t.isPlayerTank && t.health > 0).length;
        if (playerTanksAlive > this.battleStats.player.maxTanksAlive) {
            this.battleStats.player.maxTanksAlive = playerTanksAlive;
        }
        
        // Notify AI of player deployment for reactive strategy
        this.aiController.notifyAIOfPlayerAction('deploy', tankData);
    }

    createTankHealthBar(tank) {
        const config = UI_CONFIG.HEALTH_BARS.TANK;
        
        const healthBg = this.add.graphics();
        healthBg.fillStyle(config.BACKGROUND_COLOR);
        healthBg.fillRect(
            tank.x - config.OFFSET_X, 
            tank.y - config.OFFSET_Y, 
            config.WIDTH, 
            config.HEIGHT
        );
        tank.healthBg = healthBg;

        const healthFill = this.add.graphics();
        tank.healthFill = healthFill;
        this.updateTankHealth(tank);
    }

    updateTankHealth(tank) {
        const config = UI_CONFIG.HEALTH_BARS.TANK;
        const healthPercent = tank.health / tank.maxHealth;
        
        tank.healthFill.clear();
        
        // Use configured color thresholds
        let healthColor;
        if (healthPercent > 0.5) {
            healthColor = config.COLORS.HIGH;
        } else if (healthPercent > 0.25) {
            healthColor = config.COLORS.MEDIUM;
        } else {
            healthColor = config.COLORS.LOW;
        }
        
        tank.healthFill.fillStyle(healthColor);
        tank.healthFill.fillRect(
            tank.x - config.OFFSET_X, 
            tank.y - config.OFFSET_Y, 
            config.WIDTH * healthPercent, 
            config.HEIGHT
        );
    }

    updateTankMovement(tank) {
        // Skip movement if stunned
        if (tank.stunnedUntil && this.time.now < tank.stunnedUntil) {
            tank.moving = false;
            return;
        }
        this.aiController.updateTankAI(tank); // Update AI targeting
        
        // If no target, don't move
        if (!tank.target) {
            tank.moving = false;
            return;
        }

        const targetPos = tank.target;
        const distance = GameHelpers.distance(tank.x, tank.y, targetPos.x, targetPos.y);
        const range = tank.tankData.stats.range;
        
        // If target is in attack range, stop moving and attack
        if (distance <= range) {
            tank.moving = false;
            tank.needsNewPath = false; // Clear path since we're in range
            return;
        }

        // Target is out of range - move toward it
        // Check if we need a new path (target changed or no path exists)
        if (tank.needsNewPath || !tank.path || tank.pathIndex >= tank.path.length) {
            const currentPos = { x: tank.x, y: tank.y };
            
            // Check if pathfinding is needed (crossing river)
            if (Pathfinding.needsPathfinding(currentPos, targetPos)) {
                try {
                    tank.path = Pathfinding.findPath(currentPos, targetPos, tank);
                } catch (error) {
                    console.warn('Pathfinding error:', error);
                    tank.path = null;
                }
            } else {
                // Simple direct movement if no river crossing needed
                tank.path = [
                    { worldX: currentPos.x, worldY: currentPos.y },
                    { worldX: targetPos.x, worldY: targetPos.y }
                ];
            }
            
            tank.pathIndex = 0;
            tank.needsNewPath = false;
            
            // If no path found, use simple direct movement as fallback
            if (!tank.path || tank.path.length === 0) {
                tank.path = [
                    { worldX: currentPos.x, worldY: currentPos.y },
                    { worldX: targetPos.x, worldY: targetPos.y }
                ];
                tank.pathIndex = 0;
            }
        }

        // Follow the path until we reach attack range
        if (tank.path && tank.pathIndex < tank.path.length) {
            const currentWaypoint = tank.path[tank.pathIndex];
            const waypointDistance = GameHelpers.distance(tank.x, tank.y, currentWaypoint.worldX, currentWaypoint.worldY);
            
            // Check if we're close enough to attack the target from current position
            const currentTargetDistance = GameHelpers.distance(tank.x, tank.y, targetPos.x, targetPos.y);
            if (currentTargetDistance <= range) {
                // In attack range now - stop moving
                tank.moving = false;
                tank.needsNewPath = false;
                return;
            }
            
            // If close enough to current waypoint, move to next one
            if (waypointDistance <= 15) {
                tank.pathIndex++;
                if (tank.pathIndex >= tank.path.length) {
                    // Reached end of path - check if we're in range
                    if (currentTargetDistance <= range) {
                        tank.moving = false;
                    } else {
                        // Still out of range, need new path
                        tank.needsNewPath = true;
                    }
                    return;
                }
            }
            
            // Move towards current waypoint
            if (tank.pathIndex < tank.path.length) {
                const waypoint = tank.path[tank.pathIndex];
                
                // Simple obstacle avoidance - check for other tanks nearby
                const avoidanceRadius = 40;
                let avoidanceX = 0;
                let avoidanceY = 0;
                
                this.tanks.forEach(otherTank => {
                    if (otherTank === tank || otherTank.health <= 0) return;
                    
                    const otherDistance = GameHelpers.distance(tank.x, tank.y, otherTank.x, otherTank.y);
                    if (otherDistance < avoidanceRadius) {
                        // Calculate avoidance vector
                        const avoidAngle = GameHelpers.angle(otherTank.x, otherTank.y, tank.x, tank.y);
                        const avoidForce = (avoidanceRadius - otherDistance) / avoidanceRadius;
                        avoidanceX += Math.cos(avoidAngle) * avoidForce * 30;
                        avoidanceY += Math.sin(avoidAngle) * avoidForce * 30;
                    }
                });

                // Calculate movement direction towards waypoint
                const targetAngle = GameHelpers.angle(tank.x, tank.y, waypoint.worldX, waypoint.worldY);
                const baseSpeed = tank.tankData.stats.speed / 60; // Convert to pixels per frame
                const speedFactor = this.simulationSpeed || 1;
                
                // Apply movement with avoidance, scaled by simulation speed factor for slow motion
                const moveX = (Math.cos(targetAngle) * baseSpeed + avoidanceX * 0.1) * speedFactor;
                const moveY = (Math.sin(targetAngle) * baseSpeed + avoidanceY * 0.1) * speedFactor;
                
                tank.x += moveX;
                tank.y += moveY;
                
                // Face movement direction (but only if moving significantly)
                if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
                    tank.setRotation(targetAngle);
                }
                
                tank.moving = true;
            }
        }
        
        // Keep tanks within battlefield bounds (account for offset)
        const offsetX = GameHelpers.getBattlefieldOffset();
        tank.x = GameHelpers.clamp(tank.x, offsetX + 20, offsetX + GAME_CONFIG.WORLD_WIDTH - 20);
        tank.y = GameHelpers.clamp(tank.y, 20, GAME_CONFIG.WORLD_HEIGHT - 20);
        
        // Update health bar position
        if (tank.healthBg) {
            tank.healthBg.clear();
            tank.healthBg.fillStyle(0x333333);
            tank.healthBg.fillRect(tank.x - 20, tank.y - 30, 40, 4);
            this.updateTankHealth(tank);
        }

        // Update selection circle position
        if (tank.selectionCircle) {
            tank.selectionCircle.clear();
            tank.selectionCircle.lineStyle(3, 0xffff00);
            tank.selectionCircle.strokeCircle(tank.x, tank.y, 35);
        }

        // Update range circle position
        if (tank.rangeCircle) {
            tank.rangeCircle.clear();
            tank.rangeCircle.lineStyle(2, 0x00ff00, 0.3);
            tank.rangeCircle.strokeCircle(tank.x, tank.y, tank.tankData.stats.range);
        }

        // Update debug attack range circle position
        this.updateAttackRangeCircle(tank);

        tank.moving = true;
    }

    startAI() {
        // AI configuration with strategic deck composition
        this.aiEnergy = ENERGY_CONFIG.STARTING_ENERGY;
        this.aiMaxEnergy = ENERGY_CONFIG.MAX_ENERGY;
        
        // Strategic AI deck - more variety and tactical choices
        this.aiDeck = [
            'tank_light_1', 'tank_light_2', 'tank_medium_1', 'tank_medium_2',
            'tank_heavy_1', 'tank_light_1', 'tank_medium_1', 'tank_light_2'
        ];
        
        // AI energy regeneration
        this.aiEnergyTimer = this.time.addEvent({
            delay: this.getEnergyRegenDelay(),
            callback: () => {
                if (this.aiEnergy < this.aiMaxEnergy) {
                    this.aiEnergy = Math.min(this.aiEnergy + ENERGY_CONFIG.REGEN_RATE, this.aiMaxEnergy);
                }
                
                // Update the delay for next tick based on current battle time
                this.aiEnergyTimer.delay = this.getEnergyRegenDelay();
            },
            loop: true
        });
    }

    updateAIStrategy() {
        // Analyze current battlefield situation
        const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const aiTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
        const playerBase = this.buildings.find(b => b.isPlayerBase);
        const aiBase = this.buildings.find(b => !b.isPlayerBase);
        
        this.aiStrategy.playerTankCount = playerTanks.length;
        this.aiStrategy.baseHealthPercent = aiBase ? aiBase.health / aiBase.maxHealth : 0;
        
        // Strategic mode switching
        if (this.aiStrategy.baseHealthPercent < 0.3) {
            // Base under threat - go defensive
            this.aiStrategy.mode = 'defensive';
            this.aiStrategy.defensiveMode = true;
            this.aiStrategy.preferredTankTypes = ['tank_heavy_1', 'tank_medium_1'];
        } else if (playerBase && playerBase.health / playerBase.maxHealth < 0.4) {
            // Player base weak - go aggressive
            this.aiStrategy.mode = 'aggressive';
            this.aiStrategy.rushMode = true;
            this.aiStrategy.preferredTankTypes = ['tank_light_1', 'tank_light_2', 'tank_medium_1'];
        } else if (this.battleTime < 60) {
            // Low time - final push
            this.aiStrategy.mode = 'aggressive';
            this.aiStrategy.rushMode = true;
            this.aiStrategy.preferredTankTypes = ['tank_medium_1', 'tank_heavy_1'];
        } else if (aiTanks.length < playerTanks.length - 1) {
            // Outnumbered - defensive play
            this.aiStrategy.mode = 'defensive';
            this.aiStrategy.preferredTankTypes = ['tank_heavy_1', 'tank_medium_1'];
        } else {
            // Balanced gameplay
            this.aiStrategy.mode = 'balanced';
            this.aiStrategy.rushMode = false;
            this.aiStrategy.defensiveMode = false;
            this.aiStrategy.preferredTankTypes = ['tank_medium_1', 'tank_light_1'];
        }
        
        // Update AI strategy display
        this.updateAIStrategyDisplay();
    }

    updateAIStrategyDisplay() {
        if (!this.aiStrategyText) return;
        
        const aiTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
        const energyStatus = this.aiEnergy >= 6 ? 'HIGH' : this.aiEnergy >= 3 ? 'MED' : 'LOW';
        
        let strategyText = `AI: ${this.aiStrategy.mode.toUpperCase()}`;
        
        if (this.aiStrategy.rushMode) {
            strategyText += ' - RUSHING!';
            this.aiStrategyText.setFill('#ff4444');
        } else if (this.aiStrategy.defensiveMode) {
            strategyText += ' - DEFENDING';
            this.aiStrategyText.setFill('#4444ff');
        } else {
            this.aiStrategyText.setFill('#ffaa00');
        }
        
        strategyText += ` | Energy: ${energyStatus} | Tanks: ${aiTanks.length}`;
        this.aiStrategyText.setText(strategyText);
    }

    shouldAIDeploy() {
        const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const aiTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
        
        // Always deploy if we have no tanks
        if (aiTanks.length === 0) return true;
        
        // Strategic deployment decisions
        switch (this.aiStrategy.mode) {
            case 'aggressive':
                // Deploy frequently when aggressive
                return this.aiEnergy >= 2 && aiTanks.length < 6;
                
            case 'defensive':
                // Deploy when outnumbered or base threatened
                return (playerTanks.length > aiTanks.length) || 
                       (this.aiEnergy >= 4 && aiTanks.length < 3);
                       
            case 'balanced':
            default:
                // Maintain tank parity, save energy for good units
                return (playerTanks.length >= aiTanks.length && this.aiEnergy >= 3) ||
                       (this.aiEnergy >= 6);
        }
    }

    aiDeployTankStrategically() {
        // Choose tank based on current strategy
        const tankId = this.chooseAITank();
        
        // Check if we got a valid tank ID
        if (!tankId) {
            console.warn('AI could not choose a tank to deploy');
            return;
        }
        
        const tankData = TANK_DATA[tankId];
        
        // Check if tank data exists
        if (!tankData) {
            console.warn('Tank data not found for ID:', tankId);
            return;
        }
        
        if (this.aiEnergy < tankData.cost) return; // Not enough energy
        
        // Strategic deployment positioning
        const deploymentPos = this.chooseAIDeploymentPosition(tankData);
        
        // Create AI tank
        this.deployAITank(tankId, deploymentPos.x, deploymentPos.y);
        this.aiEnergy -= tankData.cost;
    }

    chooseAITank() {
        // Filter deck by preferred types for current strategy
        let availableTanks = this.aiDeck.filter(tankId => {
            const tankData = TANK_DATA[tankId];
            return tankData && this.aiEnergy >= tankData.cost;
        });
        
        if (availableTanks.length === 0) {
            // Fallback to cheapest available tank
            availableTanks = this.aiDeck.filter(tankId => {
                const tankData = TANK_DATA[tankId];
                return tankData && tankData.cost <= this.aiEnergy;
            });
        }
        
        // If still no tanks available, find the absolute cheapest tank
        if (availableTanks.length === 0) {
            // Get all valid tank IDs and find the cheapest one
            const allValidTanks = this.aiDeck.filter(tankId => TANK_DATA[tankId]);
            if (allValidTanks.length > 0) {
                const cheapestTank = allValidTanks.reduce((cheapest, tankId) => {
                    const tankData = TANK_DATA[tankId];
                    const cheapestData = TANK_DATA[cheapest];
                    return tankData.cost < cheapestData.cost ? tankId : cheapest;
                });
                
                // If we can afford the cheapest tank, use it
                if (TANK_DATA[cheapestTank] && this.aiEnergy >= TANK_DATA[cheapestTank].cost) {
                    availableTanks = [cheapestTank];
                }
            }
        }
        
        // If we still have no available tanks, return null
        if (availableTanks.length === 0) {
            return null;
        }
        
        // Prefer strategy-appropriate tanks
        const preferredTanks = availableTanks.filter(tankId => 
            this.aiStrategy.preferredTankTypes.includes(tankId)
        );
        
        if (preferredTanks.length > 0) {
            // 70% chance to use preferred tank
            if (Math.random() < 0.7) {
                return preferredTanks[Math.floor(Math.random() * preferredTanks.length)];
            }
        }
        
        // Strategic tank selection based on situation
        const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const heavyPlayerTanks = playerTanks.filter(t => t.tankData.type === TANK_TYPES.HEAVY);
        
        if (heavyPlayerTanks.length > 0 && this.aiEnergy >= 4) {
            // Counter heavy tanks with medium/heavy tanks
            const counterTanks = availableTanks.filter(tankId => {
                const tankData = TANK_DATA[tankId];
                return tankData && (tankData.type === TANK_TYPES.MEDIUM || tankData.type === TANK_TYPES.HEAVY);
            });
            if (counterTanks.length > 0) {
                return counterTanks[Math.floor(Math.random() * counterTanks.length)];
            }
        }
        
        // Default random selection from available tanks
        return availableTanks[Math.floor(Math.random() * availableTanks.length)];
    }

    chooseAIDeploymentPosition(tankData) {
        const enemyZoneCoords = GameHelpers.getDeploymentZoneWorldCoords(false); // false = enemy zone
        const playerBase = this.buildings.find(b => b.isPlayerBase);
        const aiBase = this.buildings.find(b => !b.isPlayerBase);
        
        // Use original zone as base
        const zone = BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
        
        // Check if we have expanded areas available
        const expandedZones = this.expandedDeploymentZones.enemy;
        let availableAreas = [zone]; // Always include original zone
        
        if (expandedZones && expandedZones.expandedAreas) {
            availableAreas = availableAreas.concat(expandedZones.expandedAreas);
        }
        
        // Choose deployment area (prefer expanded areas for more aggressive positioning)
        let chosenArea = zone;
        if (expandedZones && expandedZones.expandedAreas.length > 0 && 
            (this.aiStrategy.mode === 'aggressive' || this.aiStrategy.rushMode)) {
            // 70% chance to use expanded area if available and in aggressive mode
            if (Math.random() < 0.7) {
                chosenArea = expandedZones.expandedAreas[Math.floor(Math.random() * expandedZones.expandedAreas.length)];
            }
        }
        
        // Get center tile of chosen deployment area
        let baseTileX = Math.floor(chosenArea.tileX + chosenArea.tilesWidth / 2);
        let baseTileY = Math.floor(chosenArea.tileY + chosenArea.tilesHeight / 2);
        
        // Strategic positioning based on tank type and strategy
        if (this.aiStrategy.mode === 'aggressive' || this.aiStrategy.rushMode) {
            // Deploy closer to player base for faster attack (further down)
            baseTileY = Math.min(baseTileY + 1, chosenArea.tileY + chosenArea.tilesHeight - 1);
        } else if (this.aiStrategy.mode === 'defensive') {
            // Deploy closer to our own base for defense (further up)
            baseTileY = Math.max(baseTileY - 1, chosenArea.tileY);
        }
        
        // Add some randomness to avoid predictable positioning
        const randomOffsetX = GameHelpers.randomInt(-2, 2);
        const randomOffsetY = GameHelpers.randomInt(-1, 1);
        
        const deployTileX = GameHelpers.clamp(
            baseTileX + randomOffsetX, 
            chosenArea.tileX, 
            chosenArea.tileX + chosenArea.tilesWidth - 1
        );
        const deployTileY = GameHelpers.clamp(
            baseTileY + randomOffsetY, 
            chosenArea.tileY, 
            chosenArea.tileY + chosenArea.tilesHeight - 1
        );
        
        // Convert tile coordinates to world coordinates
        return GameHelpers.tileToWorld(deployTileX, deployTileY);
    }

    notifyAIOfPlayerAction(action, data) {
        const currentTime = this.time.now;
        this.aiStrategy.lastPlayerAction = currentTime;
        
        if (action === 'deploy') {
            // React to player deployment
            if (data.type === TANK_TYPES.HEAVY && this.aiEnergy >= 3) {
                // Player deployed heavy tank - consider immediate counter
                const nextDeploymentDelay = GameHelpers.randomInt(1000, 2500);
                this.aiNextDeployment = Math.min(this.aiNextDeployment, currentTime + nextDeploymentDelay);
                
                // Prioritize medium/heavy tanks to counter
                this.aiStrategy.preferredTankTypes = ['tank_medium_1', 'tank_heavy_1'];
            } else if (data.cost <= 2 && this.aiEnergy >= 4) {
                // Player deployed cheap unit - might be rushing
                this.aiStrategy.preferredTankTypes = ['tank_medium_1', 'tank_light_1'];
                
                // Deploy sooner to match aggression
                const nextDeploymentDelay = GameHelpers.randomInt(1500, 3000);
                this.aiNextDeployment = Math.min(this.aiNextDeployment, currentTime + nextDeploymentDelay);
            }
        }
    }

    deployAITank(tankId, x, y) {
        const tankData = TANK_DATA[tankId];
        
        // Create tank with custom graphics
        const tank = this.graphicsManager.createTankGraphics(x, y, tankData.type, false, tankData.id); // false = AI tank
        
        // Tank properties
        tank.tankId = tankId;
        tank.tankData = tankData;
        tank.health = tankData.stats.hp;
        tank.maxHealth = tankData.stats.hp;
        tank.isPlayerTank = false; // AI tank
        tank.target = null;
        tank.lastShotTime = 0;
        tank.lastTargetUpdate = 0;
        
        // Pathfinding properties
        tank.path = null;
        tank.pathIndex = 0;
        tank.needsNewPath = true;

        // Face towards the player side initially (account for battlefield offset)
        const offsetX = GameHelpers.getBattlefieldOffset();
        const playerSideX = offsetX + GAME_CONFIG.WORLD_WIDTH / 2;
        const playerSideY = GAME_CONFIG.WORLD_HEIGHT * 3 / 4;
        const initialAngle = GameHelpers.angle(x, y, playerSideX, playerSideY);
        tank.setRotation(initialAngle);

        // AI behavior: target player base and tanks
        this.aiController.updateTankAI(tank);

        this.tanks.push(tank);
        
        // Create health bar for tank
        this.createTankHealthBar(tank);
        
        // Create debug attack range circle if debug mode is enabled
        if (this.attackRangesVisible) {
            this.createAttackRangeCircle(tank);
        }
        
        // Update AI statistics
        this.battleStats.ai.tanksDeployed++;
        this.battleStats.ai.energySpent += tankData.cost;
        
        // Track max tanks alive
        const aiTanksAlive = this.tanks.filter(t => !t.isPlayerTank && t.health > 0).length;
        if (aiTanksAlive > this.battleStats.ai.maxTanksAlive) {
            this.battleStats.ai.maxTanksAlive = aiTanksAlive;
        }
    }

    update() {
        // Stop all game updates if battle has ended
        if (this.battleEnded) {
            return;
        }
        
        // Update AI
        this.aiController.updateAI();
        
        // Update all tanks
        this.tanks.forEach(tank => {
            if (tank.health > 0) {
                this.updateTankMovement(tank);
                this.combatSystem.checkTankCombat(tank);
            }
        });

        // Update base defenses
        this.buildings.forEach(building => {
            if (building.health > 0) {
                this.updateBaseDefense(building);
                this.combatSystem.checkBaseCombat(building);
            }
        });

        // Remove destroyed tanks
        this.tanks = this.tanks.filter(tank => {
            if (tank.health <= 0) {
                // Track tank destruction statistics
                if (tank.isPlayerTank) {
                    this.battleStats.player.tanksLost++;
                    // AI gets credit for destroying player tank
                    this.battleStats.ai.tanksDestroyed++;
                } else {
                    this.battleStats.ai.tanksLost++;
                    // Player gets credit for destroying AI tank
                    this.battleStats.player.tanksDestroyed++;
                }
                
                // Create destruction effect
                this.combatSystem.showExplosionEffect(tank.x, tank.y, 1.2);
                this.playUISound('explosion');
                
                tank.destroy();
                if (tank.healthBg) tank.healthBg.destroy();
                if (tank.healthFill) tank.healthFill.destroy();
                if (tank.selectionCircle) tank.selectionCircle.destroy();
                if (tank.rangeCircle) tank.rangeCircle.destroy();
                if (tank.debugRangeCircle) {
                    tank.debugRangeCircle.destroy();
                    // Remove from the attack range circles array
                    const index = this.attackRangeCircles.indexOf(tank.debugRangeCircle);
                    if (index > -1) {
                        this.attackRangeCircles.splice(index, 1);
                    }
                }
                return false;
            }
            return true;
        });

        // Clean up any stray projectiles that might have missed their targets
        const offsetX = GameHelpers.getBattlefieldOffset();
        this.projectiles = this.projectiles.filter(projectile => {
            if (!projectile.scene || projectile.x < offsetX - 100 || projectile.x > offsetX + GAME_CONFIG.WORLD_WIDTH + 100 || 
                projectile.y < -100 || projectile.y > GAME_CONFIG.WORLD_HEIGHT + 100) {
                if (projectile.destroy) projectile.destroy();
                return false;
            }
            return true;
        });
        
        // Update debug panel
        this.updateDebugPanel();
    }

    // Debug Panel Methods
    initializeDebugPanel() {
        this.debugUpdateTimer = 0;
        this.debugUpdateInterval = 100; // Update every 100ms
    }

    updateDebugPanel() {
        // Only update debug panel periodically to avoid performance issues
        this.debugUpdateTimer += this.game.loop.delta;
        if (this.debugUpdateTimer < this.debugUpdateInterval) {
            return;
        }
        this.debugUpdateTimer = 0;

        // Check if debug panel exists and is visible
        if (!window.debugPanel) return;

        try {
            // Game State
            window.debugPanel.updateValue('debug-scene', this.scene.key);
            window.debugPanel.updateValue('debug-time', this.formatTime(this.battleTime));
            window.debugPanel.updateValue('debug-paused', this.battleEnded ? 'Yes' : 'No');

            // Player Stats
            window.debugPanel.updateValue('debug-player-energy', `${this.energy}/${this.maxEnergy}`);
            const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
            window.debugPanel.updateValue('debug-player-tanks', playerTanks.length);
            const handNames = this.hand && Array.isArray(this.hand)
                ? this.hand.map(id => CARDS?.[id]?.name || id).join(', ')
                : '-';
            window.debugPanel.updateValue('debug-player-hand', handNames);

            // AI Stats
            window.debugPanel.updateValue('debug-ai-energy', `${this.aiEnergy || 0}/${this.maxEnergy}`);
            const aiTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
            window.debugPanel.updateValue('debug-ai-tanks', aiTanks.length);
            window.debugPanel.updateValue('debug-ai-strategy', this.aiStrategy ? this.aiStrategy.mode : '-');
            window.debugPanel.updateValue('debug-ai-rush', this.aiStrategy ? (this.aiStrategy.rushMode ? 'Yes' : 'No') : '-');

            // Battle Stats
            window.debugPanel.updateValue('debug-total-tanks', this.tanks.length);
            window.debugPanel.updateValue('debug-projectiles', this.projectiles ? this.projectiles.length : 0);
            window.debugPanel.updateValue('debug-buildings', this.buildings ? this.buildings.length : 0);

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
            const playerTowersAlive = this.buildings ? this.buildings.filter(b => b.isPlayerBase && b.health > 0).length : 0;
            const aiTowersAlive = this.buildings ? this.buildings.filter(b => !b.isPlayerBase && b.health > 0).length : 0;
            window.debugPanel.updateValue('debug-player-towers', playerTowersAlive);
            window.debugPanel.updateValue('debug-ai-towers', aiTowersAlive);

            // Deployment Zones
            const playerExpanded = this.expandedDeploymentZones && this.expandedDeploymentZones.player ? 
                this.expandedDeploymentZones.player.expandedAreas?.length || 0 : 0;
            const aiExpanded = this.expandedDeploymentZones && this.expandedDeploymentZones.enemy ? 
                this.expandedDeploymentZones.enemy.expandedAreas?.length || 0 : 0;
            window.debugPanel.updateValue('debug-player-expanded', playerExpanded > 0 ? 'Yes' : 'No');
            window.debugPanel.updateValue('debug-ai-expanded', aiExpanded > 0 ? 'Yes' : 'No');
            
            // Debug Options Status
            window.debugPanel.updateValue('debug-textures-mode', this.useGraphicsMode ? 'Graphics' : 'Textures');
            window.debugPanel.updateValue('debug-row-numbers', this.rowNumbersVisible ? 'Visible' : 'Hidden');
            window.debugPanel.updateValue('debug-attack-ranges', this.attackRangesVisible ? 'Visible' : 'Hidden');
            window.debugPanel.updateValue('debug-speed', `${(this.simulationSpeed || 1).toFixed(2)}x`);

        } catch (error) {
            console.warn('Debug panel update error:', error);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getTankAtPosition(x, y) {
        // Find tank at clicked position
        for (const tank of this.tanks) {
            const distance = GameHelpers.distance(x, y, tank.x, tank.y);
            if (distance <= 30) { // Click tolerance
                return tank;
            }
        }
        return null;
    }

    initializeDeck() {
        // Ensure 8 cards
        if (!this.deck || this.deck.length !== 8) {
            this.deck = [...DEFAULT_PLAYER_DECK];
        }
        this.shuffleDeck();
        for (let i = 0; i < 4; i++) {
            this.hand.push(this.getNextCard());
        }
    }

    shuffleDeck() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        this.nextCardIndex = 0;
    }

    getNextCard(excludeSlotIndex = -1) {
        // Build list of cards currently in hand (excluding the slot being replaced)
        const cardsInHand = this.hand.filter((_, idx) => idx !== excludeSlotIndex);
        
        // Try to find a card not already in hand
        let attempts = 0;
        const maxAttempts = this.deck.length * 2; // Prevent infinite loop
        
        while (attempts < maxAttempts) {
            if (this.nextCardIndex >= this.deck.length) {
                this.shuffleDeck();
            }
            const id = this.deck[this.nextCardIndex++];
            
            // If this card is not already in hand, use it
            if (!cardsInHand.includes(id)) {
                return id;
            }
            attempts++;
        }
        
        // Fallback: if all cards are duplicates (shouldn't happen with proper deck), just return any
        if (this.nextCardIndex >= this.deck.length) {
            this.shuffleDeck();
        }
        return this.deck[this.nextCardIndex++];
    }

    cycleCard(usedCardIndex) {
        const newCardId = this.getNextCard(usedCardIndex);
        this.hand[usedCardIndex] = newCardId;
        this.updateCardDisplay(usedCardIndex);
    }

    updateCardDisplay(cardIndex) {
        if (!this.tankCards[cardIndex]) return;
        const card = this.tankCards[cardIndex];
        const cardId = this.hand[cardIndex];
        const def = CARDS[cardId];
        const tankData = def.type === CARD_TYPES.TROOP ? TANK_DATA[def.payload.tankId] : null;
        
        // Destroy old tank icon and create new one
        if (card.tankIcon) {
            card.tankIcon.destroy();
        }
        
        // Create new tank icon with updated graphics
        const cardX = card.x;
        const cardY = card.y;
        const cardWidth = UI_CONFIG.CARDS.WIDTH;
        const iconType = tankData ? tankData.type : TANK_TYPES.MEDIUM;
        const iconTankId = tankData ? tankData.id : null;
        card.tankIcon = this.graphicsManager.createMiniTankGraphics(
            cardX + cardWidth / 2,
            cardY + 30,
            iconType,
            iconTankId
        );
        card.tankIcon.setScale(1.0); // Use larger scale for better visibility
        
        // Update cost
        card.costText.setText(def.cost);
        
        // Update name
        card.nameText.setText(def.name);
        
        // Update card references
        card.cardId = cardId;
        card.cardDef = def;
        card.cardType = def.type;
        card.tankId = def.type === CARD_TYPES.TROOP ? def.payload.tankId : null;
        card.tankData = tankData;
        
        // Brief highlight animation to show card changed
        this.tweens.add({
            targets: card,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
        });
    }

    showInsufficientEnergyFeedback() {
    const selectedCard = this.tankCards[this.selectedCard];
    const cost = selectedCard.cardType === CARD_TYPES.TROOP ? selectedCard.tankData.cost : selectedCard.cardDef.cost;
    const displayName = selectedCard.cardType === CARD_TYPES.TROOP ? selectedCard.tankData.name : selectedCard.cardDef.name;
    const energyNeeded = cost - this.energy;
        
        // Flash the energy bar red
        const barWidth = 200;
        const barX = (GAME_CONFIG.WIDTH - barWidth) / 2;
        const energyY = GAME_CONFIG.HEIGHT - 20;
        
        this.energyBarFill.clear();
        this.energyBarFill.fillStyle(0xff0000);
        this.energyBarFill.fillRect(barX, energyY, barWidth * (this.energy / this.maxEnergy), 16);
        
        // Flash the selected card
        this.tweens.add({
            targets: selectedCard,
            tint: 0xff0000,
            duration: 200,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                selectedCard.clearTint();
                this.updateCardSelection(); // Restore selection highlight
                this.updateEnergyBar(); // Restore normal energy bar color
            }
        });
        
        // Enhanced error message with specific information
        const errorText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 50, 'NOT ENOUGH ENERGY!', {
            fontSize: '24px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        errorText.setScrollFactor(0);
        errorText.setDepth(100);
        
        // Detailed energy info
        const detailText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 20, 
            `${displayName} costs ${cost} energy\n` +
            `You have ${this.energy} energy\n` +
            `Need ${energyNeeded} more energy`, {
            fontSize: '14px',
            fill: '#ffaaaa',
            fontFamily: 'Arial',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        detailText.setScrollFactor(0);
        detailText.setDepth(100);
        
        // Energy regeneration timing info
        const regenRate = this.getEnergyRegenDelay() / 1000; // Convert to seconds
        const timeToEnergy = Math.ceil(energyNeeded * regenRate);
        const regenText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 15,
            `Energy regenerates every ${regenRate}s\n` +
            `${energyNeeded} energy in ~${timeToEnergy}s`, {
            fontSize: '12px',
            fill: '#cccccc',
            fontFamily: 'Arial',
            align: 'center',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        regenText.setScrollFactor(0);
        regenText.setDepth(100);
        
        // Animate all text elements
        [errorText, detailText, regenText].forEach((text, index) => {
            text.setAlpha(0);
            text.y += 20;
            
            this.tweens.add({
                targets: text,
                alpha: 1,
                y: text.y - 20,
                duration: 300,
                delay: index * 100,
                ease: 'Back.out'
            });
            
            this.tweens.add({
                targets: text,
                alpha: 0,
                y: text.y - 30,
                duration: 1000,
                delay: 2000 + index * 50,
                ease: 'Power2',
                onComplete: () => text.destroy()
            });
        });
        
        // Red flash overlay effect for emphasis
        const flashOverlay = this.add.graphics();
        flashOverlay.fillStyle(0xff0000, 0.3);
        flashOverlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        flashOverlay.setScrollFactor(0);
        flashOverlay.setDepth(95);
        
        this.tweens.add({
            targets: flashOverlay,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => flashOverlay.destroy()
        });
    }

    updateTankAI(tank) {
        if (tank.manualControl) return; // Don't override manual control
        
        const currentTime = this.time.now;
        const tankRange = tank.tankData.stats.range;
        
        // Target Retention: Check if current target is still valid
        if (tank.target && tank.target.health > 0) {
            const currentTargetDistance = GameHelpers.distance(tank.x, tank.y, tank.target.x, tank.target.y);
            
            // Keep current target if still in range
            if (currentTargetDistance <= tankRange) {
                return; // Target retained - continue attacking
            } else {
                // Target moved out of range - clear it and find new target
                tank.target = null;
                tank.needsNewPath = true;
            }
        } else if (tank.target && tank.target.health <= 0) {
            // Target destroyed - clear it and find new target
            tank.target = null;
            tank.needsNewPath = true;
        }
        
        // Target Acquisition: Find nearest enemy within attack range
        let closestEnemyInRange = null;
        let closestDistanceInRange = Infinity;
        let fallbackTarget = null; // Nearest enemy overall for movement
        let fallbackDistance = Infinity;
        
        if (tank.isPlayerTank) {
            // Player tank: target AI tanks and enemy buildings
            const enemies = [
                ...this.tanks.filter(t => !t.isPlayerTank && t.health > 0),
                ...this.buildings.filter(b => !b.isPlayerBase && b.health > 0)
            ];
            
            enemies.forEach(enemy => {
                const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
                
                // Check if enemy is within attack range
                if (distance <= tankRange) {
                    if (distance < closestDistanceInRange) {
                        closestDistanceInRange = distance;
                        closestEnemyInRange = enemy;
                    }
                }
                
                // Track closest overall for fallback movement
                if (distance < fallbackDistance) {
                    fallbackDistance = distance;
                    fallbackTarget = enemy;
                }
            });
        } else {
            // AI tank: target player tanks and player buildings
            const enemies = [
                ...this.tanks.filter(t => t.isPlayerTank && t.health > 0),
                ...this.buildings.filter(b => b.isPlayerBase && b.health > 0)
            ];
            
            enemies.forEach(enemy => {
                const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
                
                // Check if enemy is within attack range
                if (distance <= tankRange) {
                    if (distance < closestDistanceInRange) {
                        closestDistanceInRange = distance;
                        closestEnemyInRange = enemy;
                    }
                }
                
                // Track closest overall for fallback movement
                if (distance < fallbackDistance) {
                    fallbackDistance = distance;
                    fallbackTarget = enemy;
                }
            });
        }
        
        // Set target based on acquisition rules
        if (closestEnemyInRange) {
            // Found enemy in range - lock onto it
            tank.target = closestEnemyInRange;
            tank.needsNewPath = false; // Don't move, just attack
        } else if (fallbackTarget) {
            // No enemy in range - move toward nearest enemy
            tank.target = fallbackTarget;
            tank.needsNewPath = true; // Move toward target
        } else {
            // No enemies found - clear target
            tank.target = null;
            tank.needsNewPath = true;
        }
    }

    updateBaseDefense(base) {
        const currentTime = this.time.now;
        const baseRange = 200; // Base defense range
        
        // Update base target every 2 seconds or if target is destroyed
        if (currentTime - base.lastTargetUpdate > 2000 || !base.target || base.target.health <= 0) {
            base.lastTargetUpdate = currentTime;
            
            // Find closest enemy tank within range
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            if (base.isPlayerBase) {
                // Player base: target AI tanks
                const enemyTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
                enemyTanks.forEach(enemy => {
                    const distance = GameHelpers.distance(base.x, base.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= baseRange) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
            } else {
                // Enemy base: target player tanks
                const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
                playerTanks.forEach(enemy => {
                    const distance = GameHelpers.distance(base.x, base.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= baseRange) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
            }
            
            base.target = closestEnemy;
        }
    }

    playShootSound(tankType) {
        // Enhanced shooting sounds based on tank type
        switch (tankType) {
            case 'light':
                console.log('🔊 Playing: Light Tank Fire');
                // this.sound.play('lightTankFire', { volume: 0.4 });
                break;
            case 'medium':
                console.log('🔊 Playing: Medium Tank Fire');
                // this.sound.play('mediumTankFire', { volume: 0.5 });
                break;
            case 'heavy':
                console.log('🔊 Playing: Heavy Tank Fire');
                // this.sound.play('heavyTankFire', { volume: 0.6 });
                break;
            case 'artillery':
                console.log('🔊 Playing: Artillery Fire');
                // this.sound.play('artilleryFire', { volume: 0.7 });
                break;
            default:
                console.log('🔊 Playing: Tank Fire');
                // this.sound.play('tankFire', { volume: 0.5 });
        }
    }

    playUISound(action) {
        // Web Audio API sound synthesis for better compatibility
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported, sounds disabled');
                return;
            }
        }

        switch (action) {
            case 'deploy':
                this.playSynthSound([400, 600], 0.3, 0.15, 'sawtooth');
                console.log('🔊 Playing: Tank Deploy');
                break;
            case 'select':
                this.playSynthSound([800], 0.2, 0.08, 'square');
                console.log('🔊 Playing: UI Select');
                break;
            case 'error':
                this.playSynthSound([200, 150], 0.4, 0.3, 'square');
                console.log('🔊 Playing: Error Beep');
                break;
            case 'hit':
                this.playSynthSound([300, 200], 0.3, 0.1, 'sawtooth');
                break;
            case 'explosion':
                this.playExplosionSound();
                break;
            case 'shoot':
                this.playSynthSound([150, 120], 0.2, 0.05, 'sawtooth');
                break;
            case 'victory':
                this.playVictoryFanfare();
                console.log('🔊 Playing: Victory Fanfare');
                break;
            case 'defeat':
                this.playDefeatSound();
                console.log('🔊 Playing: Defeat Sound');
                break;
        }
    }

    playSynthSound(frequencies, volume = 0.3, duration = 0.2, waveType = 'sine') {
        if (!this.audioContext) return;

        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            oscillator.type = waveType;
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            const startTime = this.audioContext.currentTime + (index * 0.05);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }

    playExplosionSound() {
        if (!this.audioContext) return;

        // Create noise for explosion
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        
        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        whiteNoise.start();
        whiteNoise.stop(this.audioContext.currentTime + 0.3);
    }

    playVictoryFanfare() {
        if (!this.audioContext) return;
        const melody = [523, 659, 784, 1047]; // C, E, G, C
        melody.forEach((freq, index) => {
            setTimeout(() => {
                this.playSynthSound([freq], 0.5, 0.4, 'triangle');
            }, index * 200);
        });
    }

    playDefeatSound() {
        if (!this.audioContext) return;
        const melody = [400, 350, 300, 250]; // Descending sad melody
        melody.forEach((freq, index) => {
            setTimeout(() => {
                this.playSynthSound([freq], 0.4, 0.5, 'sawtooth');
            }, index * 300);
        });
    }

    // Enhanced Combat Feedback System
    showDamageNumber(x, y, damage, isCritical = false) {
        const color = isCritical ? '#ffff00' : '#ff4444';
        const fontSize = isCritical ? '20px' : '16px';
        const prefix = isCritical ? 'CRIT ' : '';
        
        const damageText = this.add.text(x, y, `${prefix}${Math.ceil(damage)}`, {
            fontSize: fontSize,
            fill: color,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        damageText.setDepth(1000);
        
        // Animate damage number
        this.tweens.add({
            targets: damageText,
            y: y - 40,
            alpha: 0,
            scale: isCritical ? 1.5 : 1.2,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });
    }

    showHitEffect(x, y, isArmored = false) {
        // Create hit spark effect
        const particles = this.add.graphics();
        particles.setDepth(999);
        
        const sparkColor = isArmored ? 0xffffff : 0xff8800;
        const sparkCount = isArmored ? 8 : 5;
        
        for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2;
            const speed = GameHelpers.randomInt(20, 40);
            const sparkX = x + Math.cos(angle) * 5;
            const sparkY = y + Math.sin(angle) * 5;
            
            particles.fillStyle(sparkColor);
            particles.fillCircle(sparkX, sparkY, 2);
            
            // Animate sparks
            this.tweens.add({
                targets: { x: sparkX, y: sparkY },
                x: sparkX + Math.cos(angle) * speed,
                y: sparkY + Math.sin(angle) * speed,
                duration: 300,
                ease: 'Power2',
                onUpdate: (tween) => {
                    const progress = tween.progress;
                    const alpha = 1 - progress;
                    particles.alpha = alpha;
                }
            });
        }
        
        // Remove particles after animation
        this.time.delayedCall(300, () => particles.destroy());
        
        // Play hit sound
        this.playUISound('hit');
    }

    showExplosionEffect(x, y, size = 1) {
        // Create explosion graphics
        const explosion = this.add.graphics();
        explosion.setDepth(998);
        
        // Multiple explosion rings
        const rings = [
            { radius: 20 * size, color: 0xffff00, alpha: 1 },
            { radius: 35 * size, color: 0xff8800, alpha: 0.8 },
            { radius: 50 * size, color: 0xff4400, alpha: 0.6 },
            { radius: 65 * size, color: 0x880000, alpha: 0.4 }
        ];
        
        rings.forEach((ring, index) => {
            explosion.fillStyle(ring.color, ring.alpha);
            explosion.fillCircle(x, y, ring.radius);
            
            this.tweens.add({
                targets: ring,
                radius: ring.radius * 2,
                alpha: 0,
                duration: 600 + (index * 100),
                ease: 'Power2',
                onUpdate: () => {
                    explosion.clear();
                    rings.forEach(r => {
                        explosion.fillStyle(r.color, r.alpha);
                        explosion.fillCircle(x, y, r.radius);
                    });
                }
            });
        });
        
        // Debris particles
        for (let i = 0; i < 12; i++) {
            const debris = this.add.graphics();
            debris.fillStyle(0x444444);
            debris.fillRect(x - 2, y - 2, 4, 4);
            debris.setDepth(997);
            
            const angle = (i / 12) * Math.PI * 2;
            const speed = GameHelpers.randomInt(30, 60);
            const gravity = 100;
            
            this.tweens.add({
                targets: debris,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed + gravity,
                rotation: Math.PI * 2,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => debris.destroy()
            });
        }
        
        // Remove explosion graphics after animation
        this.time.delayedCall(1000, () => explosion.destroy());
        
        // Play explosion sound
        this.playUISound('explosion');
    }

    showMuzzleFlash(tank, targetX, targetY) {
        // Calculate barrel end position
        const angle = tank.rotation;
        const barrelLength = 25; // Approximate barrel length
        const flashX = tank.x + Math.cos(angle) * barrelLength;
        const flashY = tank.y + Math.sin(angle) * barrelLength;
        
        // Create muzzle flash
        const flash = this.add.graphics();
        flash.setDepth(996);
        
        // Draw muzzle flash cone
        flash.fillStyle(0xffff99, 0.8);
        flash.fillCircle(flashX, flashY, 8);
        
        flash.fillStyle(0xffaa00, 0.6);
        flash.fillCircle(flashX, flashY, 12);
        
        // Quick flash animation
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 100,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
        
        // Create projectile trail
        this.createProjectileTrail(flashX, flashY, targetX, targetY);
        
        // Play shoot sound
        this.playUISound('shoot');
    }

    createProjectileTrail(startX, startY, endX, endY) {
        const trail = this.add.graphics();
        trail.setDepth(995);
        
        // Draw projectile line
        trail.lineStyle(2, 0xffff00, 0.8);
        trail.lineBetween(startX, startY, endX, endY);
        
        // Fade out trail quickly
        this.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => trail.destroy()
        });
    }

    showCardSelectionFeedback(cardIndex) {
        const card = this.tankCards[cardIndex];
        if (!card) return;
        
        // Create selection pulse effect
        const selectionPulse = this.add.graphics();
        selectionPulse.setScrollFactor(0);
        selectionPulse.setDepth(50);
        
        // Draw pulse circle around card (adjusted for new card size)
        const cardCenterX = card.x + UI_CONFIG.CARDS.WIDTH / 2;
        const cardCenterY = card.y + UI_CONFIG.CARDS.HEIGHT / 2;
        selectionPulse.lineStyle(4, 0x00ff00, 0.8);
        selectionPulse.strokeCircle(cardCenterX, cardCenterY, 60);
        
        // Animate pulse
        this.tweens.add({
            targets: selectionPulse,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => selectionPulse.destroy()
        });
        
        // Show brief selection info (troop vs non-troop)
        const isTroop = card.cardType === CARD_TYPES.TROOP;
        const displayName = isTroop ? card.tankData?.name : card.cardDef?.name;
        const costVal = isTroop ? card.tankData?.cost : card.cardDef?.cost;
        const canAfford = typeof costVal === 'number' ? (this.energy >= costVal) : true;
        let infoText;
        if (isTroop) {
            infoText = canAfford ?
                `${displayName} selected - Click to deploy` :
                `${displayName} selected - Need ${costVal - this.energy} more energy`;
        } else if (card.cardType === CARD_TYPES.SPELL) {
            infoText = canAfford ?
                `${displayName} selected - Click to cast` :
                `${displayName} selected - Need ${costVal - this.energy} more energy`;
        } else {
            infoText = canAfford ?
                `${displayName} selected - Click to place` :
                `${displayName} selected - Need ${costVal - this.energy} more energy`;
        }
        
        const feedbackText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 180, infoText, {
            fontSize: '14px',
            fill: canAfford ? '#00ff00' : '#ff6666',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        feedbackText.setScrollFactor(0);
        feedbackText.setDepth(50);
        
        // Fade out feedback text after 2 seconds
        this.tweens.add({
            targets: feedbackText,
            alpha: 0,
            duration: 1000,
            delay: 1500,
            ease: 'Power2',
            onComplete: () => feedbackText.destroy()
        });
        
        // Play selection sound
        this.playUISound('select');
    }

    destroyTower(tower) {
        // Update tower stats
        if (tower.isPlayerBase) {
            this.towerStats.enemy.towersDestroyed++;
            if (tower.isMainTower) {
                this.towerStats.enemy.mainTowerDestroyed = true;
            } else if (tower.towerType === 'left') {
                this.towerStats.enemy.leftTowerDestroyed = true;
                // Expand AI deployment zone when player left tower is destroyed
                this.expandDeploymentZone('enemy', 'left');
            } else if (tower.towerType === 'right') {
                this.towerStats.enemy.rightTowerDestroyed = true;
                // Expand AI deployment zone when player right tower is destroyed
                this.expandDeploymentZone('enemy', 'right');
            }
        } else {
            this.towerStats.player.towersDestroyed++;
            if (tower.isMainTower) {
                this.towerStats.player.mainTowerDestroyed = true;
            } else if (tower.towerType === 'left') {
                this.towerStats.player.leftTowerDestroyed = true;
                // Expand player deployment zone when enemy left tower is destroyed
                this.expandDeploymentZone('player', 'left');
            } else if (tower.towerType === 'right') {
                this.towerStats.player.rightTowerDestroyed = true;
                // Expand player deployment zone when enemy right tower is destroyed
                this.expandDeploymentZone('player', 'right');
            }
        }

        // Create destruction effect
        this.destroyBuilding(tower);

        // Show tower destruction notification
        this.showTowerDestroyedNotification(tower);

        // Update tower status display
        this.updateTowerStatusDisplay();

        // Check victory conditions
        this.time.delayedCall(1000, () => {
            this.checkTowerVictoryConditions();
        });
    }

    expandDeploymentZone(team, destroyedTowerSide) {
        // Expand deployment zone by 3 tiles from the river on the side where a tower was destroyed
        const isPlayer = (team === 'player');
        
        // Initialize expanded zones if not exists
        if (!this.expandedDeploymentZones[team]) {
            this.expandedDeploymentZones[team] = {
                leftSideExpanded: false,
                rightSideExpanded: false,
                expandedAreas: []
            };
        }
        
        // Mark this side as expanded
        if (destroyedTowerSide === 'left') {
            this.expandedDeploymentZones[team].leftSideExpanded = true;
        } else if (destroyedTowerSide === 'right') {
            this.expandedDeploymentZones[team].rightSideExpanded = true;
        }
        
        // Define the column range for the side tower area
        // Left side towers are around columns 2-5, right side towers are around columns 13-16
        let sideStartCol, sideEndCol;
        if (destroyedTowerSide === 'left') {
            sideStartCol = 0;
            sideEndCol = 8; // Half the battlefield width
        } else {
            sideStartCol = 9;
            sideEndCol = 17; // Other half of battlefield
        }
        
        // Create the expanded area for this side
        let expandedArea;
        if (isPlayer) {
            // Player zone expansion: 3 tiles after the river (river is 16-17, so expansion is 13-15)
            expandedArea = {
                tileX: sideStartCol,
                tileY: 13, // 3 tiles before river start (16 - 3 = 13)
                tilesWidth: sideEndCol - sideStartCol + 1,
                tilesHeight: 3 // Just 3 rows (13, 14, 15)
            };
        } else {
            // AI zone expansion: 3 tiles after the river (river is 16-17, so expansion is 18-20)  
            expandedArea = {
                tileX: sideStartCol,
                tileY: 18, // 1 tile after river end (17 + 1 = 18)
                tilesWidth: sideEndCol - sideStartCol + 1,
                tilesHeight: 3 // Just 3 rows (18, 19, 20)
            };
        }
        
        // Add this expanded area to the list
        this.expandedDeploymentZones[team].expandedAreas.push(expandedArea);
        
        // Redraw deployment zones to show the expansion
        this.drawDeploymentZones();
        
        // Update deployment area visual indicator
        this.highlightExpandedDeploymentArea(team, expandedArea);
    }

    highlightExpandedDeploymentArea(team, expandedArea) {
        const isPlayer = (team === 'player');
        
        // Create a temporary highlight overlay for the expanded area
        const offsetX = GameHelpers.getBattlefieldOffset();
        const areaX = offsetX + expandedArea.tileX * GAME_CONFIG.TILE_SIZE;
        const areaY = expandedArea.tileY * GAME_CONFIG.TILE_SIZE;
        const areaWidth = expandedArea.tilesWidth * GAME_CONFIG.TILE_SIZE;
        const areaHeight = expandedArea.tilesHeight * GAME_CONFIG.TILE_SIZE;
        
        // Create highlight graphics
        const highlight = this.add.graphics();
        highlight.fillStyle(isPlayer ? 0x44ff44 : 0xffaa44, 0.3);
        highlight.fillRect(areaX, areaY, areaWidth, areaHeight);
        highlight.lineStyle(3, isPlayer ? 0x44ff44 : 0xffaa44, 0.8);
        highlight.strokeRect(areaX, areaY, areaWidth, areaHeight);
        highlight.setDepth(1);
        
        // Pulsing animation
        this.tweens.add({
            targets: highlight,
            alpha: { from: 0.8, to: 0.3 },
            duration: 1000,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                // Fade out after pulsing
                this.tweens.add({
                    targets: highlight,
                    alpha: 0,
                    duration: 2000,
                    onComplete: () => highlight.destroy()
                });
            }
        });
    }

    showTowerDestroyedNotification(tower) {
        const isPlayerTower = tower.isPlayerBase;
        const towerName = tower.isMainTower ? 'MAIN TOWER' : 
                         tower.towerType === 'left' ? 'LEFT TOWER' : 'RIGHT TOWER';
        const message = `${isPlayerTower ? 'ENEMY' : 'PLAYER'} ${towerName} DESTROYED!`;
        const color = isPlayerTower ? '#ff4444' : '#44ff44';

        const notificationText = this.add.text(GAME_CONFIG.WIDTH / 2, 200, message, {
            fontSize: '24px',
            fill: color,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        notificationText.setScrollFactor(0);
        notificationText.setDepth(100);

        // Dramatic entrance animation
        this.tweens.add({
            targets: notificationText,
            scaleX: { from: 0, to: 1 },
            scaleY: { from: 0, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                // Fade out after 2 seconds
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: notificationText,
                        alpha: 0,
                        duration: 1000,
                        onComplete: () => notificationText.destroy()
                    });
                });
            }
        });
    }

    checkTowerVictoryConditions() {
        // Main tower destroyed = immediate victory
        if (this.towerStats.player.mainTowerDestroyed) {
            this.endBattle('victory'); // Player destroyed enemy main tower
            return;
        }
        if (this.towerStats.enemy.mainTowerDestroyed) {
            this.endBattle('defeat'); // Enemy destroyed player main tower
            return;
        }

        // No immediate victory - game continues
        // Victory will be determined by tower count at end of time
    }

    checkOvertimeConditions() {
        const playerTowersDestroyed = this.towerStats.player.towersDestroyed;
        const enemyTowersDestroyed = this.towerStats.enemy.towersDestroyed;
        
        // If towers destroyed are equal, activate overtime
        if (playerTowersDestroyed === enemyTowersDestroyed && !this.overtimeActive) {
            this.activateOvertime();
            return;
        }
        
        // End battle based on tower count
        if (playerTowersDestroyed > enemyTowersDestroyed) {
            this.endBattle('victory');
        } else {
            this.endBattle('defeat');
        }
    }

    destroyBuilding(building) {
        // Create massive destruction animation for base
        const x = building.x;
        const y = building.y;
        
        // Multiple large explosions
        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 200, () => {
                const offsetX = GameHelpers.randomInt(-30, 30);
                const offsetY = GameHelpers.randomInt(-30, 30);
                
                const explosion = this.add.graphics();
                explosion.fillStyle(0xff3300, 0.9);
                explosion.fillCircle(x + offsetX, y + offsetY, 40);
                explosion.lineStyle(6, 0xffaa00);
                explosion.strokeCircle(x + offsetX, y + offsetY, 40);
                
                this.tweens.add({
                    targets: explosion,
                    alpha: 0,
                    scaleX: 5,
                    scaleY: 5,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => explosion.destroy()
                });
            });
        }
        
        // Remove building from buildings array
        const index = this.buildings.indexOf(building);
        if (index > -1) {
            this.buildings.splice(index, 1);
        }
        
        // Fade out the building
        this.tweens.add({
            targets: [building, building.healthBg, building.healthFill, building.healthText],
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                building.destroy();
                if (building.healthBg) building.healthBg.destroy();
                if (building.healthFill) building.healthFill.destroy();
                if (building.healthText) building.healthText.destroy();
            }
        });
    }

    endBattle(result) {
        // Prevent multiple calls to endBattle
        if (this.battleEnded) return;
        this.battleEnded = true;
        
        // Clean up any active deployment preview
        this.endDeploymentPreview();
        
        // Record battle end time and finalize statistics
        this.battleStats.battle.endTime = this.time.now;
        this.battleStats.battle.overtimeActivated = this.overtimeActive;
        
        // Play result sound
        if (result === 'victory') {
            this.playUISound('victory');
        } else {
            this.playUISound('defeat');
        }
        
        // Stop all timers
        if (this.battleTimer) this.battleTimer.destroy();
        if (this.energyTimer) this.energyTimer.destroy();
        if (this.aiEnergyTimer) this.aiEnergyTimer.destroy();
        
        // Pause all game activity
        this.physics.pause();
        
        // Create enhanced victory/defeat overlay with statistics using UIManager
        this.uiManager.createEnhancedBattleResultScreen(
            result, 
            this.battleStats, 
            this.gameState, 
            this.overtimeActive, 
            this.buildings
        );
    }

    getSimulationSpeed() {
        return this.simulationSpeed || 1;
    }

    setSimulationSpeed(speed) {
        const parsedSpeed = Number(speed);
        const numericSpeed = Math.max(0.1, Number.isFinite(parsedSpeed) ? parsedSpeed : 1);
        this.simulationSpeed = numericSpeed;
        const matchedIndex = this.simulationSpeedOptions.indexOf(numericSpeed);
        if (matchedIndex !== -1) {
            this.simulationSpeedIndex = matchedIndex;
        }
        this.applySimulationSpeed();
        if (window.refreshSpeedButtonState) {
            window.refreshSpeedButtonState();
        }
        // Force immediate debug panel refresh on next frame
        if (typeof this.debugUpdateInterval === 'number') {
            this.debugUpdateTimer = this.debugUpdateInterval;
        }
        return this.simulationSpeed;
    }

    toggleSimulationSpeed() {
        if (!Array.isArray(this.simulationSpeedOptions) || this.simulationSpeedOptions.length === 0) {
            this.simulationSpeedOptions = [1];
        }
        this.simulationSpeedIndex = (this.simulationSpeedIndex + 1) % this.simulationSpeedOptions.length;
        const nextSpeed = this.simulationSpeedOptions[this.simulationSpeedIndex];
        return this.setSimulationSpeed(nextSpeed);
    }

    applySimulationSpeed() {
        const speed = this.simulationSpeed || 1;
        if (this.time) {
            this.time.timeScale = speed;
        }
        if (this.tweens) {
            this.tweens.timeScale = speed;
        }
        if (this.physics && this.physics.world) {
            this.physics.world.timeScale = speed;
        }
        if (window.debugPanel) {
            window.debugPanel.updateValue('debug-speed', `${speed.toFixed(2)}x`);
        }
    }
    
    // Row Numbers Display Methods
    toggleRowNumbers() {
        this.rowNumbersVisible = !this.rowNumbersVisible;
        
        if (this.rowNumbersVisible) {
            this.createRowNumbers();
        } else {
            this.hideRowNumbers();
        }
    }
    
    toggleAttackRanges() {
        this.attackRangesVisible = !this.attackRangesVisible;
        
        if (this.attackRangesVisible) {
            this.showAllAttackRanges();
        } else {
            this.hideAllAttackRanges();
        }
    }
    
    toggleTextures() {
        this.useGraphicsMode = !this.useGraphicsMode;
        
        // Recreate the battlefield with the new mode
        this.recreateBattlefield();
    }
    
    recreateBattlefield() {
        // Remove existing battlefield graphics/images
        // We need to be more selective to avoid destroying health bars and other UI elements
        
        // Remove battlefield image if it exists
        if (this.battlefieldImage) {
            this.battlefieldImage.destroy();
            this.battlefieldImage = null;
        }
        
        // Remove specifically the battlefield graphics object (if we have a reference to it)
        if (this.battlefieldGraphics) {
            this.battlefieldGraphics.destroy();
            this.battlefieldGraphics = null;
        }
        
        // Calculate offset to center the battlefield horizontally
        const offsetX = (GAME_CONFIG.WIDTH - GAME_CONFIG.WORLD_WIDTH) / 2;
        
        if (this.useGraphicsMode) {
            // Graphics mode - use procedural graphics for detailed grid and features
            this.createDebugBattlefield(offsetX);
        } else {
            // Texture mode - use battlefield texture
            this.battlefieldImage = this.add.image(offsetX + GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2, 'battlefield');
            this.battlefieldImage.setDisplaySize(GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
            this.battlefieldImage.setOrigin(0.5, 0.5);
            
            // Make sure battlefield is behind other elements
            this.battlefieldImage.setDepth(-10);
        }
        
        // Redraw deployment zones to ensure they appear on top
        if (this.deploymentZoneGraphics) {
            this.deploymentZoneGraphics.setDepth(5);
            this.drawDeploymentZones();
        }
    }
    
    showAllAttackRanges() {
        // Clear any existing range circles first
        this.hideAllAttackRanges();
        
        // Create range circles for all alive tanks
        this.tanks.filter(tank => tank.health > 0).forEach(tank => {
            this.createAttackRangeCircle(tank);
        });
    }
    
    createAttackRangeCircle(tank) {
        // Create a new graphics object for the range circle
        const rangeCircle = this.add.graphics();
        rangeCircle.setDepth(5); // Below tanks but above terrain
        
        // Set color based on team
        const circleColor = tank.isPlayerTank ? 
            UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.PLAYER_COLOR : 
            UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.ENEMY_COLOR;
        
        // Draw the range circle
        rangeCircle.lineStyle(
            UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.LINE_WIDTH, 
            circleColor, 
            UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.ALPHA
        );
        rangeCircle.strokeCircle(tank.x, tank.y, tank.tankData.stats.range);
        
        // Store reference on the tank and in our list
        tank.debugRangeCircle = rangeCircle;
        this.attackRangeCircles.push(rangeCircle);
    }
    
    hideAllAttackRanges() {
        // Destroy all existing range circles
        this.attackRangeCircles.forEach(circle => {
            if (circle && circle.destroy) {
                circle.destroy();
            }
        });
        this.attackRangeCircles = [];
        
        // Remove references from tanks
        this.tanks.forEach(tank => {
            if (tank.debugRangeCircle) {
                tank.debugRangeCircle = null;
            }
        });
    }
    
    updateAttackRangeCircle(tank) {
        // Update the position of a tank's debug range circle if it exists
        if (this.attackRangesVisible && tank.debugRangeCircle) {
            tank.debugRangeCircle.clear();
            
            const circleColor = tank.isPlayerTank ? 
                UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.PLAYER_COLOR : 
                UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.ENEMY_COLOR;
            
            tank.debugRangeCircle.lineStyle(
                UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.LINE_WIDTH, 
                circleColor, 
                UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES.ALPHA
            );
            tank.debugRangeCircle.strokeCircle(tank.x, tank.y, tank.tankData.stats.range);
        }
    }
    
    createRowNumbers() {
        // Clear any existing row numbers
        this.hideRowNumbers();
        
        const offsetX = GameHelpers.getBattlefieldOffset();
        
        // Create row numbers for each row of the battlefield
        for (let row = 0; row < GAME_CONFIG.TILES_Y; row++) {
            const y = row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
            
            // Left side row number
            const leftLabel = this.add.text(offsetX - 20, y, row.toString(), {
                fontSize: '10px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(1, 0.5);
            leftLabel.setDepth(1000);
            leftLabel.setScrollFactor(0);
            
            // Right side row number
            const rightLabel = this.add.text(offsetX + GAME_CONFIG.WORLD_WIDTH + 20, y, row.toString(), {
                fontSize: '10px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0, 0.5);
            rightLabel.setDepth(1000);
            rightLabel.setScrollFactor(0);
            
            this.rowNumberLabels.push(leftLabel, rightLabel);
        }
    }
    
    hideRowNumbers() {
        // Destroy all existing row number labels
        this.rowNumberLabels.forEach(label => {
            if (label && label.destroy) {
                label.destroy();
            }
        });
        this.rowNumberLabels = [];
    }
    
    destroy() {
        // Clean up tooltips and related timers/tweens
        if (this.tooltipTimer) {
            this.tooltipTimer.destroy();
            this.tooltipTimer = null;
        }
        
        if (this.tooltipFadeInTween) {
            this.tooltipFadeInTween.destroy();
            this.tooltipFadeInTween = null;
        }
        
        if (this.tooltipFadeOutTween) {
            this.tooltipFadeOutTween.destroy();
            this.tooltipFadeOutTween = null;
        }
        
        if (this.cardTooltip) {
            this.cardTooltip.destroy();
            this.cardTooltip = null;
        }
        
        // Clean up row numbers when scene is destroyed
        this.hideRowNumbers();
        
        // Clean up attack range circles when scene is destroyed
        this.hideAllAttackRanges();
        
        // Clear current scene reference
        if (window.currentScene === this) {
            window.currentScene = null;
        }
        
        super.destroy();
    }

    shutdown() {
        // Clean up deployment preview when scene is shutting down
        this.endDeploymentPreview();
        
        // Clean up tooltip if active
        this.hideCardTooltip();
        
        // Cancel any pending tooltip timer
        if (this.tooltipTimer) {
            this.tooltipTimer.destroy();
            this.tooltipTimer = null;
        }
        
        super.shutdown();
    }
}
