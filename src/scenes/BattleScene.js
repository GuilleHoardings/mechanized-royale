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

        // Energy regeneration progress tracking (0-1 for gradual fill)
        this.energyRegenProgress = 0;

        // Pause state for analysis
        this.gamePaused = false;

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
        this.useGraphicsMode = true;

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

        // Refresh pause button state
        if (window.refreshPauseButtonState) {
            window.refreshPauseButtonState();
        }

        // Enhanced background with darker, more atmospheric color
        this.cameras.main.setBackgroundColor('#1a2744');

        // Deployment preview state - initialize before UI creation
        this.deploymentPreview = {
            active: false,
            unitType: null,
            previewTank: null,
            previewRangeCircle: null,
            validPosition: false,
            startedInBattlefield: false,
            tileX: 0,
            tileY: 0
        };

        // Spell preview state
        this.spellPreview = {
            active: false,
            spellType: null,
            previewGraphics: null,
            validPosition: false,
            tileX: 0,
            tileY: 0
        };

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
            // Texture mode - use battlefield texture scaled so image tiles match game tiles
            // Image is 1536x2816, but only the central 514px width contains the 18 tiles
            // Scale factor: WORLD_WIDTH / 514 to make image tiles match game tiles
            this.addArenaTexture(); // Ensure battlefield is behind other elements
        }

        // Deployment zones with tile-based boundaries - will be drawn dynamically
        this.createDeploymentZoneGraphics();
    }

    addArenaTexture() {
        const imageTileAreaWidth = 875;
        const scaleFactor = GAME_CONFIG.WORLD_WIDTH / imageTileAreaWidth;
        const scaledWidth = 1536 * scaleFactor;
        const scaledHeight = 2816 * scaleFactor;

        // Position so the image's tile area aligns with the game's tile grid
        // Game grid is at (offsetX, 0) to (offsetX + WORLD_WIDTH, WORLD_HEIGHT)
        const offsetX = (GAME_CONFIG.WIDTH - GAME_CONFIG.WORLD_WIDTH) / 2;
        this.battlefieldImage = this.add.image(offsetX + GAME_CONFIG.WORLD_WIDTH / 2, GAME_CONFIG.WORLD_HEIGHT / 2, 'battlefield');
        this.battlefieldImage.setDisplaySize(scaledWidth, scaledHeight);
        this.battlefieldImage.setOrigin(0.5, 0.47);
        this.battlefieldImage.setDepth(-10);
    }

    createDebugBattlefield(offsetX) {
        // Create procedural graphics battlefield for debugging and detailed visualization
        this.battlefieldGraphics = this.add.graphics();
        this.battlefieldGraphics.setDepth(-5); // Behind deployment zones but above background

        // Base Grass
        this.battlefieldGraphics.fillStyle(0x1a472a); // Deep green
        this.battlefieldGraphics.fillRect(offsetX, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

        // Grass Texture/Noise (Checkered for tile visibility but subtle)
        this.battlefieldGraphics.fillStyle(0x2d5a3f, 0.3);
        const tileSize = GAME_CONFIG.TILE_SIZE;
        for (let y = 0; y < GAME_CONFIG.TILES_Y; y++) {
            for (let x = 0; x < GAME_CONFIG.TILES_X; x++) {
                if ((x + y) % 2 === 0) {
                    this.battlefieldGraphics.fillRect(offsetX + x * tileSize, y * tileSize, tileSize, tileSize);
                }
            }
        }

        // Draw tile grid (Subtle)
        this.battlefieldGraphics.lineStyle(1, 0x000000, 0.1);

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

        // Center line to divide battlefield
        this.battlefieldGraphics.lineStyle(2, 0xffffff, 0.3);
        const centerY = 16.5 * GAME_CONFIG.TILE_SIZE;
        // Dashed line
        const dashLen = 20;
        const gapLen = 10;
        let currentX = offsetX;
        while (currentX < offsetX + GAME_CONFIG.WORLD_WIDTH) {
            this.battlefieldGraphics.lineBetween(currentX, centerY, Math.min(currentX + dashLen, offsetX + GAME_CONFIG.WORLD_WIDTH), centerY);
            currentX += dashLen + gapLen;
        }

        // Add river and bridges in debug mode
        this.createRiverAndBridges(this.battlefieldGraphics, offsetX);
    }

    createRiverAndBridges(graphics, offsetX = 0) {
        // River parameters - rows 16-17
        const riverTopY = 16 * GAME_CONFIG.TILE_SIZE;
        const riverBottomY = 17 * GAME_CONFIG.TILE_SIZE;
        const riverHeight = riverBottomY - riverTopY + GAME_CONFIG.TILE_SIZE;
        const riverWidth = GAME_CONFIG.WORLD_WIDTH;

        // Water
        graphics.fillStyle(0x3b82f6); // Base Blue
        graphics.fillRect(offsetX, riverTopY, riverWidth, riverHeight);

        // Water ripples/depth
        graphics.fillStyle(0x2563eb, 0.5);
        graphics.fillRect(offsetX, riverTopY + 10, riverWidth, riverHeight - 20);

        // River banks
        graphics.fillStyle(0x8b4513); // Mud/Bank
        graphics.fillRect(offsetX, riverTopY - 5, riverWidth, 5);
        graphics.fillRect(offsetX, riverBottomY + GAME_CONFIG.TILE_SIZE, riverWidth, 5);

        // Bridges
        const leftBridgeStartX = offsetX + BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER.LEFT.tileX * GAME_CONFIG.TILE_SIZE;
        const leftBridgeWidth = 3 * GAME_CONFIG.TILE_SIZE;
        const rightBridgeStartX = offsetX + (BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER.RIGHT.tileX - 1) * GAME_CONFIG.TILE_SIZE;
        const rightBridgeWidth = 3 * GAME_CONFIG.TILE_SIZE;

        const drawBridge = (x, width) => {
            // Planks
            graphics.fillStyle(0x8b4513);
            graphics.fillRect(x, riverTopY - 2, width, riverHeight + 4);

            // Plank details
            graphics.lineStyle(1, 0x5d4037, 0.5);
            for (let i = 0; i < (riverHeight + 4) / 8; i++) {
                graphics.lineBetween(x, riverTopY - 2 + i * 8, x + width, riverTopY - 2 + i * 8);
            }

            // Railings
            graphics.fillStyle(0x5d4037);
            graphics.fillRect(x - 4, riverTopY - 5, 4, riverHeight + 10);
            graphics.fillRect(x + width, riverTopY - 5, 4, riverHeight + 10);
        };

        drawBridge(leftBridgeStartX, leftBridgeWidth);
        drawBridge(rightBridgeStartX, rightBridgeWidth);
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

        // AI Strategy indicator - sized for 5 lines of debug info
        const aiStatusBg = this.add.graphics();
        aiStatusBg.fillStyle(0x1e293b, 0.85);
        aiStatusBg.fillRoundedRect(5, 32, 105, 70, 4);
        aiStatusBg.lineStyle(1, 0x3d5a80, 0.4);
        aiStatusBg.strokeRoundedRect(5, 32, 105, 70, 4);
        aiStatusBg.setScrollFactor(0);
        aiStatusBg.setDepth(1000);

        this.aiStrategyText = this.add.text(10, 36, 'AI: ---', {
            fontSize: '9px',
            fill: '#fbbf24',
            fontFamily: 'Arial',
            fontWeight: '600',
            lineSpacing: 2
        });
        this.aiStrategyText.setScrollFactor(0);
        this.aiStrategyText.setDepth(1000);

        // Back button with modern styling - compact in top left margin
        const backButtonBg = this.add.graphics();
        backButtonBg.fillStyle(0x1e293b, 0.9);
        backButtonBg.fillRoundedRect(5, 5, 70, 24, 4);
        backButtonBg.lineStyle(1, 0x3d5a80, 0.5);
        backButtonBg.strokeRoundedRect(5, 5, 70, 24, 4);
        backButtonBg.setScrollFactor(0);
        backButtonBg.setDepth(1000);

        const backButton = this.add.text(40, 17, '← Menu', {
            fontSize: '11px',
            fill: '#e2e8f0',
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5).setInteractive();
        backButton.setScrollFactor(0);
        backButton.setDepth(1000);

        backButton.on('pointerover', () => {
            backButton.setFill('#60a5fa');
        });

        backButton.on('pointerout', () => {
            backButton.setFill('#e2e8f0');
        });

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
            const cardDef = ENTITIES[cardId];
            const unitData = cardDef.type === CARD_TYPES.TROOP
                ? ENTITIES[cardDef.unitId || (cardDef.payload && cardDef.payload.unitId)]
                : null;
            const cardX = startX + index * cardSpacing;

            // Card background
            const card = this.add.image(cardX, cardsY, 'card_bg')

                .setDisplaySize(cardWidth, cardHeight)
                .setInteractive()
                .setOrigin(0);
            card.setScrollFactor(0);

            // Icon - use mini card drawing for all card types
            const tankIcon = this.graphicsManager.createMiniCardGraphics(
                cardX + cardWidth / 2,
                cardsY + 30,
                cardId
            );
            tankIcon.setScale(1.0); // Increased from 0.6 to 1.0 for bigger icons
            // Rotate troop cards to face upward (enemy field direction)
            if (cardDef.type === CARD_TYPES.TROOP) {
                tankIcon.setRotation(-Math.PI / 2); // -90 degrees = upward
            }
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
            const nameText = this.add.text(cardX + cardWidth / 2, cardsY + cardHeight - 12, displayName, {
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
            card.unitId = cardDef.type === CARD_TYPES.TROOP ? (cardDef.unitId || (cardDef.payload && cardDef.payload.unitId)) : null;
            card.unitData = unitData;
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
                    this.showCardTooltip(index, cardX + cardWidth / 2, cardsY - 15);
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
        // Timer background panel - compact in top right margin
        const timerBg = this.add.graphics();
        timerBg.fillStyle(0x1e293b, 0.9);
        timerBg.fillRoundedRect(GAME_CONFIG.WIDTH - 70, 5, 65, 24, 4);
        timerBg.lineStyle(1, 0x3d5a80, 0.5);
        timerBg.strokeRoundedRect(GAME_CONFIG.WIDTH - 70, 5, 65, 24, 4);
        timerBg.setScrollFactor(0);
        timerBg.setDepth(1000);

        // Timer text with icon
        this.timerText = this.add.text(GAME_CONFIG.WIDTH - 38, 17, `⏱ ${this.formatTime(this.battleTime)}`, {
            fontSize: '12px',
            fill: '#f1f5f9',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(1000);

        // Tower status display
        this.createTowerStatusDisplay();
    }

    createTowerStatusDisplay() {
        // Enemy tower status panel - below AI status panel (which ends at y=102)
        const enemyPanelBg = this.add.graphics();
        enemyPanelBg.fillStyle(0x1e293b, 0.85);
        enemyPanelBg.fillRoundedRect(5, 108, 85, 45, 4);
        enemyPanelBg.lineStyle(1, 0xf87171, 0.4);
        enemyPanelBg.strokeRoundedRect(5, 108, 85, 45, 4);
        enemyPanelBg.setScrollFactor(0);
        enemyPanelBg.setDepth(1000);

        this.enemyTowerStatus = this.add.text(10, 112, '', {
            fontSize: '9px',
            fill: '#f87171',
            fontFamily: 'Arial',
            fontWeight: '600',
            lineSpacing: 2
        });
        this.enemyTowerStatus.setScrollFactor(0);
        this.enemyTowerStatus.setDepth(1000);

        // Player tower status panel - below enemy panel (which ends at y=153)
        const playerPanelBg = this.add.graphics();
        playerPanelBg.fillStyle(0x1e293b, 0.85);
        playerPanelBg.fillRoundedRect(5, 156, 85, 45, 4);
        playerPanelBg.lineStyle(1, 0x60a5fa, 0.4);
        playerPanelBg.strokeRoundedRect(5, 156, 85, 45, 4);
        playerPanelBg.setScrollFactor(0);
        playerPanelBg.setDepth(1000);

        this.playerTowerStatus = this.add.text(10, 160, '', {
            fontSize: '9px',
            fill: '#60a5fa',
            fontFamily: 'Arial',
            fontWeight: '600',
            lineSpacing: 2
        });
        this.playerTowerStatus.setScrollFactor(0);
        this.playerTowerStatus.setDepth(1000);

        this.updateTowerStatusDisplay();
    }

    updateTowerStatusDisplay() {
        const playerTowers = this.buildings.filter(b => b.isPlayerOwned && b.health > 0);
        const enemyTowers = this.buildings.filter(b => !b.isPlayerOwned && b.health > 0);

        // Compact player towers display without emojis
        // Main tower shows 'z' if dormant (not activated), '+' if active
        const pL = playerTowers.find(t => t.towerType === 'left') ? '+' : 'x';
        const pR = playerTowers.find(t => t.towerType === 'right') ? '+' : 'x';
        const playerMainTower = playerTowers.find(t => t.isMainTower);
        const pM = playerMainTower ? (playerMainTower.activated ? '+' : 'z') : 'x';
        let playerStatus = `YOU\nL:${pL} R:${pR}\nMain:${pM}`;

        // Compact enemy towers display without emojis
        const eL = enemyTowers.find(t => t.towerType === 'left') ? '+' : 'x';
        const eR = enemyTowers.find(t => t.towerType === 'right') ? '+' : 'x';
        const enemyMainTower = enemyTowers.find(t => t.isMainTower);
        const eM = enemyMainTower ? (enemyMainTower.activated ? '+' : 'z') : 'x';
        let enemyStatus = `ENEMY\nL:${eL} R:${eR}\nMain:${eM}`;

        this.playerTowerStatus.setText(playerStatus);
        this.enemyTowerStatus.setText(enemyStatus);
    }

    selectTankCard(index) {
        // Prevent card selection if battle has ended
        if (this.battleEnded) {
            return;
        }

        // End any existing previews before starting new ones
        this.endDeploymentPreview();
        this.endSpellPreview();

        this.selectedCard = index;

        // Start appropriate preview based on card type
        const selectedCard = this.tankCards[index];
        if (selectedCard.cardType === CARD_TYPES.TROOP) {
            this.startDeploymentPreview(selectedCard);
        } else if (selectedCard.cardType === CARD_TYPES.SPELL || selectedCard.cardType === CARD_TYPES.BUILDING) {
            // For spells and buildings, start spell preview (which handles both)
            this.startSpellPreview(0, 0, selectedCard); // Position will be updated on mouse move
        }

        this.updateCardSelection();

        // Show selection feedback
        this.showCardSelectionFeedback(index);
    }

    updateCardSelection() {
        // Update card visuals (don't end previews here - they're managed by selectTankCard)
        this.tankCards.forEach((card, index) => {
            if (index === this.selectedCard) {
                card.setTint(0xfbbf24); // Golden selection color
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
        const unitData = isTroop ? cardRef.unitData : null;

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
        const costVal = cardRef.cardDef.cost;
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
        const headerColor = isTroop ? (typeColors[unitData.unitType] || 0x4a90e2) : 0x4a90e2;
        tooltipBg.fillStyle(headerColor, 0.3);
        tooltipBg.fillRoundedRect(2, 2, tooltipWidth - 4, 35, 6);

        // Tank name and tier
        const nameText = this.add.text(15, 12, `${cardRef.cardDef.name}`, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        const tierText = this.add.text(tooltipWidth - 15, 12, isTroop ? `Tier ${unitData.tier}` : `${cardRef.cardDef.type.toUpperCase()}`, {
            fontSize: '12px',
            fill: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(1, 0);

        // Tank type indicator
        const typeText = this.add.text(15, 28, isTroop ? unitData.unitType.toUpperCase() : cardRef.cardDef.type.toUpperCase(), {
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
            const desc = cardRef.cardDef.id === 'smoke_barrage' ? `Small area damage and brief stun.`
                : cardRef.cardDef.id === 'artillery_strike' ? `Medium-radius area damage.`
                    : cardRef.cardDef.id === 'v1_launcher' ? `Launches homing missiles that explode on impact.`
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
            `Health: ${unitData.stats.hp}\n` +
            `Damage: ${unitData.stats.damage}\n` +
            `Range: ${unitData.stats.range}\n` +
            `Penetration: ${unitData.stats.penetration}`, {
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
            `Speed: ${unitData.stats.speed}\n` +
            `Front Armor: ${unitData.stats.armor.front}\n` +
            `Side Armor: ${unitData.stats.armor.side}\n` +
            `Rear Armor: ${unitData.stats.armor.rear}`, {
            fontSize: '11px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            lineSpacing: 2
        });

        // Abilities section
        const abilitiesY = 120;
        if (unitData.abilities && unitData.abilities.length > 0) {
            const abilitiesTitle = this.add.text(leftColumnX, abilitiesY, 'ABILITIES', {
                fontSize: '11px',
                fill: '#ff6699',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });

            const abilitiesText = unitData.abilities.map(ability => {
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
        const descY = abilitiesY + (unitData.abilities && unitData.abilities.length > 0 ? 35 : 15);
        const descText = this.add.text(leftColumnX, descY, unitData.description, {
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
        tower.isPlayerOwned = isPlayerTeam;
        tower.isMainTower = isMainTower;
        tower.towerType = towerType;
        tower.lastShotTime = 0;
        tower.target = null;
        tower.lastTargetUpdate = 0;

        // Main towers start deactivated and only activate when hit
        tower.activated = isMainTower ? false : true;

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
            graphics.fillRect(-size / 2, size / 3, size, size / 3);

            // Main structure - octagonal shape for more interesting silhouette
            graphics.fillStyle(stoneColor);
            graphics.fillCircle(0, 0, size / 2.2);

            // Tower walls with team colors
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillCircle(0, 0, size / 2.5);

            // Inner keep
            graphics.fillStyle(stoneColor);
            graphics.fillCircle(0, 0, size / 3.5);

            // Golden crown for main towers
            graphics.fillStyle(goldColor);
            graphics.fillRect(-size / 4, -size / 2.2, size / 2, size / 8);
            graphics.fillTriangle(-size / 4, -size / 2.2, 0, -size / 1.8, size / 4, -size / 2.2);

            // Battlements
            graphics.fillStyle(stoneColor);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const bx = Math.cos(angle) * size / 2.8;
                const by = Math.sin(angle) * size / 2.8;
                graphics.fillRect(bx - 2, by - 4, 4, 8);
            }

            // Command center windows
            graphics.fillStyle(0x000000);
            graphics.fillRect(-size / 8, -size / 8, size / 4, size / 8);
            graphics.fillRect(-size / 12, size / 12, size / 6, size / 12);

            // Flag/antenna
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillRect(-1, -size / 1.8, 2, size / 6);
            graphics.fillTriangle(1, -size / 1.8, 1, -size / 2.2, size / 8, -size / 2.4);

        } else {
            // Side Tower - Smaller defensive tower
            const size = 40; // Smaller than main tower

            // Foundation
            graphics.fillStyle(darkStone);
            graphics.fillRect(-size / 2, size / 3, size, size / 4);

            // Main tower body
            graphics.fillStyle(stoneColor);
            graphics.fillRoundedRect(-size / 2.5, -size / 3, size / 1.25, size * 0.8, 4);

            // Team color accent
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillRoundedRect(-size / 3, -size / 4, size / 1.5, size * 0.6, 3);

            // Gun turret
            graphics.fillStyle(metalColor);
            graphics.fillCircle(0, -size / 8, size / 6);

            // Gun barrel
            graphics.fillStyle(darkStone);
            graphics.fillRect(size / 6, -size / 8 - 2, size / 3, 4);

            // Defensive walls
            graphics.fillStyle(stoneColor);
            graphics.fillRect(-size / 2.2, -size / 3, 4, size / 4);
            graphics.fillRect(size / 2.2 - 4, -size / 3, 4, size / 4);

            // Windows/firing ports
            graphics.fillStyle(0x000000);
            graphics.fillRect(-size / 8, -size / 6, size / 4, 3);
            graphics.fillRect(-size / 12, size / 12, size / 6, 2);

            // Team banner
            graphics.fillStyle(isPlayerTeam ? playerBaseColor : enemyBaseColor);
            graphics.fillRect(-1, -size / 2.5, 2, size / 8);
            graphics.fillRect(1, -size / 2.5, size / 12, size / 16);
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
            // Health bar fill (no background)
            const healthFill = this.add.graphics();
            building.healthFill = healthFill;

            // Health percentage text
            const healthText = this.add.text(
                building.x,
                building.y - config.OFFSET_Y,
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

    startEnergyRegeneration() {
        this.energyTimer = this.time.addEvent({
            delay: this.getEnergyRegenDelay(),
            callback: () => {
                if (this.energy < this.maxEnergy) {
                    this.energy = Math.min(this.energy + ENERGY_CONFIG.REGEN_RATE, this.maxEnergy);

                    // Visual feedback for energy gain
                    this.showEnergyGainEffect();
                }

                // Reset progress for next cycle
                this.energyRegenProgress = 0;

                // Update the delay for next tick based on current battle time
                this.energyTimer.delay = this.getEnergyRegenDelay();

                // Update energy bar after resetting progress
                this.updateEnergyBar();
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
        const energyGainText = this.add.text(GAME_CONFIG.WIDTH / 2, config.y - 18, '+1 ⚡', {
            fontSize: '16px',
            fill: '#4ade80',
            fontFamily: 'Arial',
            fontStyle: 'bold'
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
            glowCircle.fillStyle(0x4ade80, 0.5);
            glowCircle.fillCircle(squareX, squareY, config.squareSize);

            this.tweens.add({
                targets: glowCircle,
                scaleX: 1.8,
                scaleY: 1.8,
                alpha: 0,
                duration: 500,
                ease: 'Cubic.easeOut',
                onComplete: () => glowCircle.destroy()
            });
        }

        this.tweens.add({
            targets: energyGainText,
            y: energyGainText.y - 30,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => energyGainText.destroy()
        });
    }

    updateEnergyBar() {
        const config = this.energyBarConfig;

        // Clear previous graphics
        this.energyBarBg.clear();
        this.energyBarFill.clear();

        // Draw individual energy squares with modern styling
        for (let i = 0; i < this.maxEnergy; i++) {
            const squareX = config.x + (i * (config.squareSize + config.spacing));
            const squareY = config.y;

            // Background square (empty state) with modern dark styling
            this.energyBarBg.fillStyle(0x1e3a5f, 0.9);
            this.energyBarBg.lineStyle(1, 0x3d5a80, 0.6);
            this.energyBarBg.fillRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);
            this.energyBarBg.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);

            // Filled square if we have energy for this slot
            if (i < this.energy) {
                // Gradient effect: brighter blue for current energy
                let fillColor = 0x3b82f6; // Base blue
                let glowColor = 0x60a5fa; // Glow color
                let alpha = 1.0;

                // Make the most recent energy points brighter with glow
                if (i >= this.energy - 2 && i < this.energy) {
                    fillColor = 0x60a5fa; // Brighter blue for recent energy

                    // Add subtle glow effect
                    this.energyBarFill.fillStyle(glowColor, 0.3);
                    this.energyBarFill.fillRoundedRect(squareX - 2, squareY - 2, config.squareSize + 4, config.squareSize + 4, 4);
                }

                // Main fill
                this.energyBarFill.fillStyle(fillColor, alpha);
                this.energyBarFill.lineStyle(1, 0x93c5fd, 0.8);
                this.energyBarFill.fillRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);
                this.energyBarFill.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);

                // Add inner highlight for filled squares
                this.energyBarFill.fillStyle(0xffffff, 0.25);
                this.energyBarFill.fillRoundedRect(squareX + 2, squareY + 2, config.squareSize - 6, 4, 2);
            }
            // Gradual fill for the next energy cell (showing regeneration progress)
            else if (i === this.energy && this.energy < this.maxEnergy) {
                // Calculate fill width based on progress (fills from left to right)
                const fillWidth = Math.floor(config.squareSize * this.energyRegenProgress);

                if (fillWidth > 0) {
                    // Darker blue for in-progress fill
                    const progressColor = 0x2563eb;

                    // Draw partial fill from left
                    this.energyBarFill.fillStyle(progressColor, 0.7);
                    this.energyBarFill.fillRoundedRect(squareX, squareY, fillWidth, config.squareSize,
                        fillWidth >= config.squareSize - 3 ? 3 : 0); // Only round corners when nearly full

                    // Add subtle border on the progress
                    this.energyBarFill.lineStyle(1, 0x60a5fa, 0.5);
                    this.energyBarFill.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);
                }
            }
        }

        // Update energy text with modern styling
        if (this.energyText) {
            this.energyText.setText(`⚡ ${this.energy}/${this.maxEnergy}`);
            this.energyText.setStyle({
                fontSize: '15px',
                fill: '#e2e8f0',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            });
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
                            // Max overtime reached - compare health to determine winner
                            this.checkOvertimeVictoryConditions();
                        }
                        // Otherwise continue overtime - tower destruction will end it
                    }
                }
            },
            loop: true
        });
    }

    updateTimerDisplay() {
        let timeText;
        let timeColor = '#f1f5f9';

        if (this.overtimeActive) {
            // Overtime display
            const overtimeSeconds = Math.abs(this.battleTime);
            timeText = `⚡ +${this.formatTime(overtimeSeconds)}`;
            timeColor = '#f87171';

            // Pulse effect during overtime
            this.tweens.add({
                targets: this.timerText,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 200,
                yoyo: true,
                ease: 'Power2'
            });
        } else {
            timeText = `⏱ ${this.formatTime(this.battleTime)}`;

            // Change timer color when time is running low
            if (this.battleTime <= 10) {
                timeColor = '#f87171'; // Red - Critical
                // Flash effect for last 10 seconds
                this.tweens.add({
                    targets: this.timerText,
                    alpha: 0.4,
                    duration: 400,
                    yoyo: true,
                    ease: 'Power2'
                });
            } else if (this.battleTime <= 30) {
                timeColor = '#f87171'; // Red
            } else if (this.battleTime <= 60) {
                timeColor = '#fbbf24'; // Yellow
            }
        }

        this.timerText.setText(timeText);
        this.timerText.setFill(timeColor);
    }

    checkOvertimeConditions() {
        const playerBase = this.buildings.find(b => b.isPlayerOwned);
        const enemyBase = this.buildings.find(b => !b.isPlayerOwned);

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
        this._showNotification('OVERTIME!', '#ff4444', 150, 'First to gain advantage wins!');
    }

    /**
     * Generic notification display with dramatic animation
     * @param {string} title - Main notification text
     * @param {string} color - Text color in hex string format (e.g. '#ff4444')
     * @param {number} yPosition - Y position on screen
     * @param {string|null} subtitle - Optional subtitle text
     * @param {number} displayTime - How long to show (ms), default 2000
     * @returns {void}
     */
    _showNotification(title, color, yPosition, subtitle = null, displayTime = 2000) {
        const titleText = this.add.text(GAME_CONFIG.WIDTH / 2, yPosition, title, {
            fontSize: subtitle ? '32px' : '24px',
            fill: color,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(100);

        const targets = [titleText];

        if (subtitle) {
            const subtitleText = this.add.text(GAME_CONFIG.WIDTH / 2, yPosition + 30, subtitle, {
                fontSize: '16px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            subtitleText.setScrollFactor(0);
            subtitleText.setDepth(100);
            targets.push(subtitleText);
        }

        // Dramatic entrance animation
        this.tweens.add({
            targets: targets,
            scaleX: { from: 0, to: 1 },
            scaleY: { from: 0, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                this.time.delayedCall(subtitle ? 3000 : displayTime, () => {
                    this.tweens.add({
                        targets: targets,
                        alpha: 0,
                        duration: 1000,
                        onComplete: () => targets.forEach(t => t.destroy())
                    });
                });
            }
        });
    }

    checkOvertimeVictoryConditions() {
        // Delegation: All battle result logic is handled by GameHelpers.determineBattleResult.
        // This helper is the single source of truth for victory conditions.
        // Use the shared helper to determine battle result
        const result = GameHelpers.determineBattleResult(this.buildings);
        this.endBattle(result || 'draw');
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                const isEnemy = (o.isPlayerTank === false) || (!o.isPlayerTank && o.isPlayerOwned === false);
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
            this._placeBuildingInternal(card, worldX, worldY, true);
        }

        // Notify AI of player card deployment (spells and buildings)
        this.aiController.notifyAIOfPlayerAction('deploy', {
            cardId: card.id,
            cardName: card.name,
            type: card.type,
            cost: card.cost,
            isSwarm: false,
            count: 1
        });

        this.energy -= card.cost;
        this.updateEnergyBar();
        this.cycleCard(this.selectedCard);
    }

    castSpell(card, x, y) {
        this._castSpellInternal(card, x, y, true);
    }

    /**
     * Internal method that handles spell casting logic for both player and AI.
     *
     * Applies the effects of a spell card (such as "smoke_barrage" or "artillery_strike") at the specified world coordinates.
     * Determines which targets are affected based on the caster (player or AI), applies damage, stun, and triggers visual/sound effects.
     *
     * @param {Object} card - The card definition object containing spell properties (e.g., id, payload).
     * @param {number} x - The world X coordinate where the spell is cast.
     * @param {number} y - The world Y coordinate where the spell is cast.
     * @param {boolean} isPlayerCast - True if the spell is cast by the player, false if cast by the AI.
     *
     * @returns {void}
     */
    _castSpellInternal(card, x, y, isPlayerCast) {

        // Determine target filter and colors based on caster
        const shouldAffect = (target) => {
            if (isPlayerCast) {
                return (target.isPlayerTank === false) || (!target.isPlayerTank && target.isPlayerOwned === false);
            } else {
                return target.isPlayerTank === true || target.isPlayerOwned === true;
            }
        };

        const colors = {
            smoke_barrage: isPlayerCast ? 0x66ccff : 0xff6666,
            artillery_strike: isPlayerCast ? 0xff7733 : 0xff4400
        };

        if (card.id === 'smoke_barrage') {
            // Enhanced visual effect for smoke barrage
            this.createEnhancedSpellEffect(x, y, card.payload?.radius || 0, colors.smoke_barrage, 'SMOKE BARRAGE', isPlayerCast);

            this.applyAreaEffect(x, y, card.payload?.radius || 0, (target) => {
                if (!shouldAffect(target)) return;
                if (target.isMainTower && !target.activated) {
                    target.activated = true;
                }
                target.health = Math.max(0, target.health - (card.payload?.damage || 0));
                target.stunnedUntil = this.time.now + (card.payload?.stunMs || 0);
                this.combatSystem.updateHealthDisplay(target);
                if (target.health <= 0) {
                    this.combatSystem.handleTargetDestruction(target, null);
                }
            });
            this.playUISound('shoot');
            if (!isPlayerCast) console.log('🤖 AI: Cast Smoke Barrage at', Math.round(x), Math.round(y));
        } else if (card.id === 'artillery_strike') {
            // Enhanced visual effect for artillery strike
            this.createEnhancedSpellEffect(x, y, card.payload?.radius || 0, colors.artillery_strike, 'ARTILLERY STRIKE', isPlayerCast);

            this.applyAreaEffect(x, y, card.payload?.radius || 0, (target) => {
                if (!shouldAffect(target)) return;
                if (target.isMainTower && !target.activated) {
                    target.activated = true;
                }
                target.health = Math.max(0, target.health - (card.payload?.damage || 0));
                this.combatSystem.updateHealthDisplay(target);
                if (target.health <= 0) {
                    this.combatSystem.handleTargetDestruction(target, null);
                }
            });
            this.combatSystem.showExplosionEffect(x, y, 1.2);
            this.playUISound('explosion');
            if (!isPlayerCast) console.log('🤖 AI: Cast Artillery Strike at', Math.round(x), Math.round(y));
        }
    }


    /**
     * Places a building (e.g., V1 Launcher) on the battlefield for either the player or AI.
     * This internal method consolidates building placement logic, handling graphics, health,
     * ownership, missile launch loop, and timed destruction. Used by both player and AI systems.
     *
     * @param {Object} card - The card definition containing building payload and properties.
     * @param {number} x - The world X coordinate where the building is placed.
     * @param {number} y - The world Y coordinate where the building is placed.
     * @param {boolean} isPlayerOwned - Ownership flag; true for player buildings, false for AI.
     *   Ownership affects team color, targeting, and battle stats.
     */
    _placeBuildingInternal(card, x, y, isPlayerOwned) {
        // Create building graphics using GraphicsManager
        const building = this.graphicsManager.createBuildingGraphics(x, y, card.id);

        // Set building properties
        building.buildingId = card.id;
        building.buildingDef = card;
        building.type = card.id; // e.g., 'v1_launcher'
        building.health = card.stats?.hp || 1000; // Use health from entities.js fallback to default
        building.maxHealth = card.stats?.hp || 1000;
        building.isPlayerOwned = isPlayerOwned;
        building.lastShotTime = 0;
        building.target = null;
        building.lastTargetUpdate = 0;
        building.attackCooldown = 2000; // 2 seconds between attacks

        // Update statistics
        const stats = isPlayerOwned ? this.battleStats.player : this.battleStats.ai;
        stats.buildingsDeployed++;
        stats.energySpent += card.cost || 0;

        this.buildings.push(building);

        // Create health bar
        this.createBuildingHealthBar(building);

        // For buildings with lifetime (like V1 launcher), set up destruction timer
        if (card.payload?.lifetimeMs) {
            this.time.delayedCall(card.payload.lifetimeMs, () => {
                const idx = this.buildings.indexOf(building);
                if (idx >= 0) this.buildings.splice(idx, 1);
                if (building.healthBg) building.healthBg.destroy();
                if (building.healthFill) building.healthFill.destroy();
                if (building.healthText) building.healthText.destroy();
                building.destroy();
            });
        }

        // For buildings that launch missiles automatically (like V1 launcher)
        if (card.payload?.launchIntervalMs) {
            const timer = this.time.addEvent({
                delay: card.payload.launchIntervalMs,
                loop: true,
                callback: () => {
                    if (!building.scene || building.health <= 0) { timer.remove(); return; }
                    for (let i = 0; i < (card.payload?.missileCount || 1); i++) {
                        this.launchBuildingMissile(building, card.payload);
                    }
                }
            });
        }

        if (!isPlayerOwned) console.log('🤖 AI: Placed', card.name, 'at', Math.round(x), Math.round(y));
    }

    /**
     * Creates a health bar for a building (furnace, etc)
     */
    createBuildingHealthBar(building) {
        const config = UI_CONFIG.HEALTH_BARS.TOWER;
        const healthBg = this.add.graphics();
        healthBg.fillStyle(config.BACKGROUND_COLOR);
        healthBg.fillRect(building.x - config.OFFSET_X, building.y - config.OFFSET_Y, config.WIDTH, config.HEIGHT);
        building.healthBg = healthBg;
        const healthFill = this.add.graphics();
        building.healthFill = healthFill;
        const healthText = this.add.text(
            building.x, building.y - config.OFFSET_Y - 15,
            `${building.health}/${building.maxHealth}`,
            { fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2 }
        ).setOrigin(0.5);
        building.healthText = healthText;
        this.updateBuildingHealth(building);
    }

    /**
     * Launch a missile from the building that tracks toward the closest enemy
     * @param {Object} building - The building launching the missile
     * @param {Object} payload - Missile configuration from the card
     */
    launchBuildingMissile(building, payload) {
        // Find closest enemy target
        const isPlayerBuilding = building.isPlayerOwned;
        const enemies = [
            ...this.tanks.filter(t => t.isPlayerTank !== isPlayerBuilding && t.health > 0),
            ...this.buildings.filter(b => b.isPlayerOwned !== isPlayerBuilding && b.health > 0 && b !== building)
        ];

        if (enemies.length === 0) return; // No targets available

        // Find closest enemy
        let closestEnemy = null;
        let closestDistance = Infinity;
        enemies.forEach(enemy => {
            const distance = GameHelpers.distance(building.x, building.y, enemy.x, enemy.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });

        if (!closestEnemy) return;

        // Create missile graphics
        const missile = this.add.container(building.x, building.y);
        const missileBody = this.add.graphics();

        // Draw missile shape (pointed cylinder)
        missileBody.fillStyle(0xff4400);
        missileBody.fillRect(-3, -8, 6, 16); // Body
        missileBody.fillStyle(0xffaa00);
        missileBody.beginPath();
        missileBody.moveTo(0, -12); // Nose tip
        missileBody.lineTo(-3, -8);
        missileBody.lineTo(3, -8);
        missileBody.closePath();
        missileBody.fillPath();
        // Fins
        missileBody.fillStyle(0x880000);
        missileBody.fillTriangle(-3, 8, -7, 12, -3, 4);
        missileBody.fillTriangle(3, 8, 7, 12, 3, 4);
        // Engine glow
        missileBody.fillStyle(0xffff00);
        missileBody.fillCircle(0, 10, 3);

        missile.add(missileBody);
        missile.setDepth(500);

        // Missile properties
        missile.target = closestEnemy;
        missile.damage = payload.missileDamage || 100;
        missile.speed = payload.missileSpeed || 180;
        missile.blastRadius = payload.blastRadius || 60;
        missile.isPlayerMissile = isPlayerBuilding;
        missile.isMissile = true;

        // Add to projectiles array for cleanup tracking
        this.projectiles.push(missile);

        // Launch effect
        this.combatSystem.showMuzzleFlash(building, closestEnemy.x, closestEnemy.y);
        this.playUISound('shoot');

        // Create smoke trail effect
        const createSmokeTrail = () => {
            if (!missile.scene) return;
            const smoke = this.add.graphics();
            smoke.fillStyle(0x666666, 0.6);
            smoke.fillCircle(missile.x, missile.y, 4);
            smoke.setDepth(499);
            this.tweens.add({
                targets: smoke,
                alpha: 0,
                scale: 2,
                duration: 400,
                onComplete: () => smoke.destroy()
            });
        };

        // Update missile position each frame
        const updateMissile = () => {
            if (!missile.scene) return;

            // Check if target is still valid
            let currentTarget = missile.target;
            if (!currentTarget || !currentTarget.scene || currentTarget.health <= 0) {
                // Retarget to nearest enemy
                const newEnemies = [
                    ...this.tanks.filter(t => t.isPlayerTank !== missile.isPlayerMissile && t.health > 0),
                    ...this.buildings.filter(b => b.isPlayerOwned !== missile.isPlayerMissile && b.health > 0)
                ];

                if (newEnemies.length === 0) {
                    // No targets, explode at current position
                    this.explodeMissile(missile);
                    return;
                }

                let nearest = null;
                let nearestDist = Infinity;
                newEnemies.forEach(e => {
                    const d = GameHelpers.distance(missile.x, missile.y, e.x, e.y);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = e;
                    }
                });
                missile.target = nearest;
                currentTarget = nearest;
            }

            if (!currentTarget) {
                this.explodeMissile(missile);
                return;
            }

            // Calculate direction to target
            const angle = GameHelpers.angle(missile.x, missile.y, currentTarget.x, currentTarget.y);
            const distance = GameHelpers.distance(missile.x, missile.y, currentTarget.x, currentTarget.y);

            // Rotate missile to face target
            missile.setRotation(angle + Math.PI / 2); // +90 degrees because missile points up

            // Move missile toward target
            const deltaTime = 1 / 60; // Approximate frame time
            const moveDistance = missile.speed * deltaTime;

            if (distance <= moveDistance + 10) {
                // Hit target - explode!
                missile.setPosition(currentTarget.x, currentTarget.y);
                this.explodeMissile(missile);
                return;
            }

            // Move toward target
            missile.x += Math.cos(angle) * moveDistance;
            missile.y += Math.sin(angle) * moveDistance;

            // Create smoke trail
            if (Math.random() < 0.3) {
                createSmokeTrail();
            }
        };

        // Create update timer for missile tracking
        const missileTimer = this.time.addEvent({
            delay: 16, // ~60fps
            loop: true,
            callback: updateMissile
        });
        missile.updateTimer = missileTimer;
    }

    /**
     * Explode a missile, dealing area damage
     * @param {Object} missile - The missile to explode
     */
    explodeMissile(missile) {
        if (!missile.scene) return;

        // Stop the update timer
        if (missile.updateTimer) {
            missile.updateTimer.remove();
        }

        // Remove from projectiles array
        const index = this.projectiles.indexOf(missile);
        if (index > -1) {
            this.projectiles.splice(index, 1);
        }

        // Show explosion effect
        this.combatSystem.showExplosionEffect(missile.x, missile.y, 1.5);
        this.playUISound('explosion');

        // Apply area damage
        const isPlayerMissile = missile.isPlayerMissile;
        const damage = missile.damage;
        const radius = missile.blastRadius;

        // Get all potential targets
        const allTargets = [
            ...this.tanks.filter(t => t.health > 0),
            ...this.buildings.filter(b => b.health > 0)
        ];

        allTargets.forEach(target => {
            // Skip friendly units
            const isEnemy = (target.isPlayerTank !== undefined)
                ? target.isPlayerTank !== isPlayerMissile
                : target.isPlayerOwned !== isPlayerMissile;

            if (!isEnemy) return;

            const distance = GameHelpers.distance(missile.x, missile.y, target.x, target.y);
            if (distance <= radius) {
                // Calculate damage falloff based on distance (full damage at center, less at edges)
                const damageMultiplier = 1 - (distance / radius) * 0.5; // 50% to 100% damage
                const finalDamage = Math.floor(damage * damageMultiplier);

                // Activate main towers when hit
                if (target.isMainTower && !target.activated) {
                    target.activated = true;
                    console.log(`Main tower activated by missile! (${target.isPlayerOwned ? 'Player' : 'Enemy'})`);
                }

                // Apply damage (clamp to 0)
                target.health = Math.max(0, target.health - finalDamage);

                // Update health display
                if (target.unitData) {
                    this.updateTankHealth(target);
                } else {
                    this.updateBuildingHealth(target);
                }

                // Show damage number
                this.combatSystem.showDamageNumber(target.x, target.y, finalDamage);

                // Check for destruction
                // Only handle destruction if target is still present in tanks/buildings
                if (
                    target.health <= 0 &&
                    (
                        (target.unitData && this.tanks.includes(target)) ||
                        (!target.unitData && this.buildings.includes(target))
                    )
                ) {
                    this.combatSystem.handleTargetDestruction(target, null);
                }
            }
        });

        // Destroy the missile
        missile.destroy();
    }

    createSpellEffectCircle(x, y, radius, color) {
        const gfx = this.add.graphics();
        gfx.lineStyle(3, color, 1);
        gfx.strokeCircle(x, y, radius);
        gfx.setDepth(999);
        this.tweens.add({ targets: gfx, alpha: 0, duration: 500, onComplete: () => gfx.destroy() });
    }

    /**
     * Create an enhanced visual effect for spell deployment with label and animations
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} radius - Effect radius
     * @param {number} color - Effect color
     * @param {string} spellName - Name of the spell to display
     * @param {boolean} isPlayerCast - Whether cast by player (affects positioning)
     */
    createEnhancedSpellEffect(x, y, radius, color, spellName, isPlayerCast) {
        console.log('🎯 Enhanced spell effect:', spellName, 'at', x, y, 'radius:', radius);

        // Create VERY BRIGHT initial flash
        const flash = this.add.graphics();
        flash.fillStyle(0xffffff, 1.0);
        flash.fillCircle(x, y, radius * 1.2);
        flash.setDepth(1001);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });

        // Create large filled circle background
        const bgCircle = this.add.graphics();
        bgCircle.fillStyle(color, 0.6);
        bgCircle.fillCircle(x, y, radius);
        bgCircle.setDepth(998);

        this.tweens.add({
            targets: bgCircle,
            alpha: 0,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => bgCircle.destroy()
        });

        // Create multiple expanding rings for dramatic effect
        for (let i = 0; i < 4; i++) {
            const ring = this.add.graphics();
            ring.lineStyle(6, color, 1);
            ring.strokeCircle(x, y, 10);
            ring.setDepth(999 + i);

            this.tweens.add({
                targets: ring,
                alpha: 0,
                duration: 800,
                delay: i * 150,
                ease: 'Power2',
                onComplete: () => ring.destroy()
            });

            this.tweens.add({
                targets: ring,
                scaleX: radius / 10,
                scaleY: radius / 10,
                duration: 800,
                delay: i * 150,
                ease: 'Cubic.Out'
            });
        }

        // Add LARGE spell name label in center
        const labelColor = isPlayerCast ? '#66ccff' : '#ff6666';
        const label = this.add.text(x, y - 10, spellName, {
            fontSize: '20px',
            fill: labelColor,
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        label.setDepth(1002);
        label.setScale(0);

        // Animate label with bounce
        this.tweens.add({
            targets: label,
            scale: 1.2,
            duration: 300,
            ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({
                    targets: label,
                    scale: 0,
                    alpha: 0,
                    duration: 300,
                    delay: 1000,
                    ease: 'Back.in',
                    onComplete: () => label.destroy()
                });
            }
        });

        // Add MANY particles for extra visual flair
        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16;
            const particle = this.add.graphics();
            particle.fillStyle(color, 1);
            particle.fillCircle(0, 0, 6);
            particle.setPosition(x, y);
            particle.setDepth(1000);

            const targetX = x + Math.cos(angle) * radius * 1.2;
            const targetY = y + Math.sin(angle) * radius * 1.2;

            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                duration: 700,
                delay: i * 30,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
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
        if (!this.deploymentPreview.active) {
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

        // Create preview graphics if they don't exist yet (lazy initialization)
        if (!this.deploymentPreview.previewTank && this.deploymentPreview.selectedCard) {
            const selectedCard = this.deploymentPreview.selectedCard;
            const snappedPos = GameHelpers.tileToWorld(tileX, tileY);

            this.deploymentPreview.previewTank = this.graphicsManager.createTankGraphics(
                snappedPos.worldX, snappedPos.worldY,
                selectedCard.unitData.unitType, true, selectedCard.unitId
            );
            this.deploymentPreview.previewTank.setAlpha(0.5);
            this.deploymentPreview.previewTank.setDepth(15);
            // Face upward (toward enemy field)
            this.deploymentPreview.previewTank.setRotation(-Math.PI / 2);

            // Create range circle if tank has range
            const range = selectedCard.unitData?.stats?.range || 0;
            if (range > 0) {
                this.deploymentPreview.previewRangeCircle = this.add.graphics();
                this.deploymentPreview.previewRangeCircle.setDepth(25);
            }
        }

        if (!this.deploymentPreview.previewTank) {
            return;
        }

        // Check if current position is valid
        const isValid = GameHelpers.isValidDeploymentTile(tileX, tileY, true, this.expandedDeploymentZones);

        // Check if there's enough energy
        const selectedCardData = this.tankCards[this.selectedCard];
        const cost = selectedCardData.cardDef.cost;
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
        const range = selectedCardData?.unitData?.stats?.range || 0; // Only for troops

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
        if (!this.deploymentPreview) return;

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
    }

    endSpellPreview() {
        if (!this.spellPreview) return;

        if (this.spellPreview.radiusCircle) {
            this.spellPreview.radiusCircle.destroy();
            this.spellPreview.radiusCircle = null;
        }

        this.spellPreview.active = false;
        this.spellPreview.cardType = null;
        this.spellPreview.radius = 0;
    }

    startDeploymentPreview(selectedCard) {
        if (!this.deploymentPreview) return;

        // End any existing previews
        this.endSpellPreview();

        this.deploymentPreview.active = true;
        this.deploymentPreview.unitType = selectedCard.unitData.unitType;
        this.deploymentPreview.selectedCard = selectedCard; // Store for later

        // Don't create preview graphics yet - wait for mouse to move over battlefield
        // This prevents creating preview at card position when card is clicked
        this.deploymentPreview.previewTank = null;
        this.deploymentPreview.previewRangeCircle = null;
    }

    /**
     * Start showing spell/building radius preview
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {Object} selectedCardData - The selected card data
     */
    startSpellPreview(worldX, worldY, selectedCardData) {
        const card = selectedCardData.cardDef;
        if (!card) return;

        // Get the radius from the card payload
        let radius = 0;
        if (card.type === CARD_TYPES.SPELL) {
            radius = card.payload?.radius || 0;
        } else if (card.type === CARD_TYPES.BUILDING) {
            // Buildings might have a blast radius for missiles
            radius = card.payload?.blastRadius || 50; // Default building placement radius
        }

        this.spellPreview.active = true;
        this.spellPreview.cardType = card.type;
        this.spellPreview.radius = radius;

        // Create the radius preview circle
        this.spellPreview.radiusCircle = this.add.graphics();
        this.spellPreview.radiusCircle.setDepth(25);

        this.updateSpellPreview(worldX, worldY);
    }

    /**
     * Update spell/building radius preview position
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     */
    updateSpellPreview(worldX, worldY) {
        if (!this.spellPreview.active || !this.spellPreview.radiusCircle) return;

        const radius = this.spellPreview.radius;
        const selectedCardData = this.tankCards[this.selectedCard];
        const card = selectedCardData.cardDef;
        const hasEnoughEnergy = this.energy >= card.cost;

        // Check if position is valid
        const isWithinBattlefield = GameHelpers.isWithinBattlefieldWorld(worldX, worldY);
        let isValidPosition = isWithinBattlefield;

        // Buildings have stricter placement rules
        if (this.spellPreview.cardType === CARD_TYPES.BUILDING) {
            const { tileX, tileY } = GameHelpers.worldToTile(worldX, worldY);
            isValidPosition = GameHelpers.isValidDeploymentTile(tileX, tileY, true, this.expandedDeploymentZones);
        }

        // Determine colors based on validity and energy
        let circleColor, fillAlpha, strokeAlpha;

        if (isValidPosition && hasEnoughEnergy) {
            // Valid position and enough energy
            if (this.spellPreview.cardType === CARD_TYPES.SPELL) {
                circleColor = 0x66ccff; // Blue for spells
            } else {
                circleColor = 0x00ff00; // Green for buildings
            }
            fillAlpha = 0.25;
            strokeAlpha = 0.9;
        } else if (isValidPosition && !hasEnoughEnergy) {
            // Valid position but not enough energy - gray
            circleColor = 0x888888;
            fillAlpha = 0.15;
            strokeAlpha = 0.6;
        } else {
            // Invalid position - red
            circleColor = 0xff4444;
            fillAlpha = 0.2;
            strokeAlpha = 0.7;
        }

        // Clear and redraw
        this.spellPreview.radiusCircle.clear();

        if (radius > 0) {
            // Draw filled circle
            this.spellPreview.radiusCircle.fillStyle(circleColor, fillAlpha);
            this.spellPreview.radiusCircle.fillCircle(worldX, worldY, radius);

            // Draw stroke
            this.spellPreview.radiusCircle.lineStyle(3, circleColor, strokeAlpha);
            this.spellPreview.radiusCircle.strokeCircle(worldX, worldY, radius);

            // Add crosshair at center for precision
            this.spellPreview.radiusCircle.lineStyle(2, circleColor, strokeAlpha);
            const crossSize = Math.min(15, radius * 0.3);
            this.spellPreview.radiusCircle.lineBetween(worldX - crossSize, worldY, worldX + crossSize, worldY);
            this.spellPreview.radiusCircle.lineBetween(worldX, worldY - crossSize, worldX, worldY + crossSize);
        }
    }

    /**
     * End spell/building radius preview
     */
    endSpellPreview() {
        if (this.spellPreview.radiusCircle) {
            this.spellPreview.radiusCircle.destroy();
            this.spellPreview.radiusCircle = null;
        }

        this.spellPreview.active = false;
        this.spellPreview.cardType = null;
        this.spellPreview.radius = 0;
    }

    /**
     * Deploys a tank onto the battlefield for either the player or AI.
     * 
     * This internal method consolidates all logic for tank deployment, including:
     * - Creating tank graphics and setting team color
     * - Initializing tank properties (health, type, AI state, etc.)
     * - Setting initial facing direction based on team
     * - Adding tank to battlefield arrays and updating statistics
     * - Creating health bar and (optionally) attack range circle
     * - Notifying AI controller for tank targeting logic
     * 
     * Used by both player and AI deployment systems.
     * 
     * @param {string} unitId - The unique unit identifier from ENTITIES.
     * @param {number} x - The world X coordinate (in pixels) for unit deployment.
     * @param {number} y - The world Y coordinate (in pixels) for unit deployment.
     * @param {boolean} isPlayerTank - True if deploying for player, false for AI.
     * 
     * @returns {void}
     */
    deployTank(unitId, x, y) {
        this._deployTankInternal(unitId, x, y, true);
    }

    _deployTankInternal(unitId, x, y, isPlayerTank) {
        const unitData = ENTITIES[unitId];
        if (!unitData) {
            console.error(`Unit data not found for ID: ${unitId}`);
            return;
        }

        const tank = this.graphicsManager.createTankGraphics(x, y, unitData.unitType, isPlayerTank, unitData.id);

        // Tank properties
        tank.unitId = unitId;
        tank.unitData = unitData;
        tank.health = unitData.stats.hp;
        tank.maxHealth = unitData.stats.hp;
        tank.isPlayerTank = isPlayerTank;
        tank.target = null;
        tank.lastShotTime = 0;
        tank.lastTargetUpdate = 0;

        // Pathfinding properties
        tank.path = null;
        tank.pathIndex = 0;
        tank.needsNewPath = true;

        // Set initial facing direction
        if (isPlayerTank) {
            // Always face upward (toward enemy field) initially
            tank.setRotation(-Math.PI / 2); // -90 degrees = upward
        } else {
            // AI tanks face downward (toward player field)
            tank.setRotation(Math.PI / 2); // +90 degrees = downward
        }

        this.aiController.updateTankAI(tank);
        this.tanks.push(tank);
        this.createTankHealthBar(tank);

        if (this.attackRangesVisible) {
            this.createAttackRangeCircle(tank);
        }

        // Update statistics
        const stats = isPlayerTank ? this.battleStats.player : this.battleStats.ai;
        stats.tanksDeployed++;
        stats.energySpent += (unitData.cost || 0);

        if (isPlayerTank) {
            this.playUISound('deploy');
        }

        // Track max tanks alive
        const tanksAlive = this.tanks.filter(t => t.isPlayerTank === isPlayerTank && t.health > 0).length;
        if (tanksAlive > stats.maxTanksAlive) {
            stats.maxTanksAlive = tanksAlive;
        }
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

    createBuildingHealthBar(building) {
        const config = UI_CONFIG.HEALTH_BARS.BUILDING || UI_CONFIG.HEALTH_BARS.TANK; // Fallback to tank config

        const healthBg = this.add.graphics();
        healthBg.fillStyle(config.BACKGROUND_COLOR);
        healthBg.fillRect(
            building.x - config.OFFSET_X,
            building.y - config.OFFSET_Y,
            config.WIDTH,
            config.HEIGHT
        );
        building.healthBg = healthBg;

        const healthFill = this.add.graphics();
        building.healthFill = healthFill;
        this.updateBuildingHealth(building);
    }

    updateTankHealth(tank) {
        const config = UI_CONFIG.HEALTH_BARS.TANK;
        const healthPercent = tank.health / tank.maxHealth;

        tank.healthFill.clear();

        // Use team colors: blue for player, red for enemy
        const healthColor = tank.isPlayerTank ? 0x2d7dd2 : 0xd22d2d;

        tank.healthFill.fillStyle(healthColor);
        tank.healthFill.fillRect(
            tank.x - config.OFFSET_X,
            tank.y - config.OFFSET_Y,
            config.WIDTH * healthPercent,
            config.HEIGHT
        );
    }

    updateBuildingHealth(building) {
        // Use appropriate config based on building type
        const config = building.isMainTower || building.towerType ? UI_CONFIG.HEALTH_BARS.TOWER : (UI_CONFIG.HEALTH_BARS.BUILDING || UI_CONFIG.HEALTH_BARS.TANK);
        const healthPercent = building.health / building.maxHealth;

        building.healthFill.clear();

        // Use team colors: blue for player, red for enemy
        const healthColor = building.isPlayerOwned ? 0x2d7dd2 : 0xd22d2d;

        building.healthFill.fillStyle(healthColor);
        building.healthFill.fillRect(
            building.x - config.OFFSET_X,
            building.y - config.OFFSET_Y + 12,
            config.WIDTH * healthPercent,
            config.HEIGHT
        );

        // Update health text
        if (building.healthText) {
            building.healthText.setText(`${Math.ceil(building.health)}/${building.maxHealth}`);
            building.healthText.setFill('#ffffff');
        }
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
        const range = tank.unitData.stats.range;

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
                const baseSpeed = tank.unitData.stats.speed / 60; // Convert to pixels per frame
                const speedFactor = this.simulationSpeed || 1;

                // Apply movement with avoidance, scaled by simulation speed factor for slow motion
                const moveX = (Math.cos(targetAngle) * baseSpeed + avoidanceX * 0.1) * speedFactor;
                const moveY = (Math.sin(targetAngle) * baseSpeed + avoidanceY * 0.1) * speedFactor;

                tank.x += moveX;
                tank.y += moveY;

                // Always face movement direction when moving
                tank.setRotation(targetAngle);

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
            tank.rangeCircle.strokeCircle(tank.x, tank.y, tank.unitData.stats.range);
        }

        // Update debug attack range circle position
        this.updateAttackRangeCircle(tank);

        tank.moving = true;
    }

    startAI() {
        // AI configuration with strategic deck composition
        this.aiEnergy = ENERGY_CONFIG.STARTING_ENERGY;
        this.aiMaxEnergy = ENERGY_CONFIG.MAX_ENERGY;

        // Enhanced AI deck using CARD IDs - mirrors player's card system
        // This allows AI to use spells, buildings, and special units
        this.aiDeck = [
            'tiger',            // Win condition - heavy tank for base destruction
            'panther',      // High DPS medium tank
            'sherman',        // Long-range medium tank
            'jagdpanzer',       // Tank destroyer
            'smoke_barrage',              // Smoke barrage for disruption
            'artillery_strike',         // Artillery strike for area damage
            'v1_launcher',          // V1 launcher for sustained fire
            'infantry_platoon'     // Infantry platoon for harassment
        ];

        // AI hand system - 4 cards visible from 8-card deck (same as player)
        this.aiHand = [];
        this.aiNextCardIndex = 0;
        this.initializeAIDeck();

        // AI strategy state (managed by AIController)
        this.aiStrategy = {
            mode: 'balanced',
            rushMode: false,
            defensiveMode: false,
            preferredTankTypes: ['sherman', 'panther']
        };

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

    /**
     * Initialize AI deck with shuffled hand of 4 cards
     */
    initializeAIDeck() {
        // Shuffle AI deck
        this.shuffleAIDeck();
        // Draw 4 cards into AI hand
        this.aiHand = [];
        for (let i = 0; i < 4; i++) {
            this.aiHand.push(this.getNextAICard());
        }
    }

    /**
     * Shuffle AI deck using Fisher-Yates algorithm
     */
    shuffleAIDeck() {
        for (let i = this.aiDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.aiDeck[i], this.aiDeck[j]] = [this.aiDeck[j], this.aiDeck[i]];
        }
        // Initialize the AI draw queue with all cards not in hand
        this.aiDrawQueue = [...this.aiDeck];
        this.shuffleArray(this.aiDrawQueue);
    }

    /**
     * Get next card from AI deck (not already in hand)
     * Uses a queue system to ensure cards don't repeat until all others have been drawn
     * @param {number} excludeSlotIndex - Slot being replaced (to allow that card)
     * @returns {string} Card ID
     */
    getNextAICard(excludeSlotIndex = -1) {
        // Get the card being replaced (it will go back to the draw queue)
        const replacedCard = excludeSlotIndex >= 0 ? this.aiHand[excludeSlotIndex] : null;

        // Initialize draw queue if needed
        if (!this.aiDrawQueue || this.aiDrawQueue.length === 0) {
            // Build queue from cards not currently in hand
            const cardsInHand = this.aiHand.filter((_, idx) => idx !== excludeSlotIndex);
            this.aiDrawQueue = this.aiDeck.filter(id => !cardsInHand.includes(id));
            this.shuffleArray(this.aiDrawQueue);
        }

        // Draw the next card from the queue
        const nextCard = this.aiDrawQueue.shift();

        // Add the replaced card back to the end of the queue (if there was one)
        if (replacedCard && !this.aiDrawQueue.includes(replacedCard)) {
            this.aiDrawQueue.push(replacedCard);
        }

        return nextCard;
    }

    /**
     * Cycle a card in AI hand after deployment
     * @param {number} handIndex - Index of card in AI hand (0-3)
     */
    cycleAICard(handIndex) {
        if (handIndex < 0 || handIndex >= this.aiHand.length) return;
        this.aiHand[handIndex] = this.getNextAICard(handIndex);
    }

    updateAIStrategy() {
        // Delegate to AIController which manages the strategy
        if (this.aiController) {
            this.aiController.updateAIStrategy();
        }

        // Update AI strategy display
        this.updateAIStrategyDisplay();
    }

    updateAIStrategyDisplay() {
        if (!this.aiStrategyText) return;
        if (!this.aiController || !this.aiController.aiStrategy) return;

        const aiTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
        const strategy = this.aiController.aiStrategy;

        // Compact single-line display
        let strategyText = 'AI: ';

        if (strategy.rushMode) {
            strategyText += 'RUSH';
            this.aiStrategyText.setFill('#f87171');
        } else if (strategy.defensiveMode) {
            strategyText += 'DEF';
            this.aiStrategyText.setFill('#60a5fa');
        } else {
            strategyText += strategy.mode.substring(0, 3).toUpperCase();
            this.aiStrategyText.setFill('#fbbf24');
        }

        strategyText += ` [${aiTanks.length}]`;
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
        // Choose unit based on current strategy
        const unitId = this.chooseAITank();

        // Check if we got a valid unit ID
        if (!unitId) {
            console.warn('AI could not choose a unit to deploy');
            return;
        }

        const unitData = ENTITIES[unitId];

        // Check if unit data exists
        if (!unitData) {
            console.warn('Unit data not found for ID:', unitId);
            return;
        }

        if (this.aiEnergy < unitData.cost) return; // Not enough energy

        // Strategic deployment positioning
        const deploymentPos = this.chooseAIDeploymentPosition(unitData);

        // Create AI unit
        this.deployAITank(unitId, deploymentPos.x, deploymentPos.y);
        this.aiEnergy -= unitData.cost;
    }

    chooseAITank() {
        // Filter deck by preferred types for current strategy
        let availableTanks = this.aiDeck.filter(unitId => {
            const unitData = ENTITIES[unitId];
            return unitData && this.aiEnergy >= unitData.cost;
        });

        if (availableTanks.length === 0) {
            // Fallback to cheapest available unit
            availableTanks = this.aiDeck.filter(unitId => {
                const unitData = ENTITIES[unitId];
                return unitData && unitData.cost <= this.aiEnergy;
            });
        }

        // If still no units available, find the absolute cheapest unit
        if (availableTanks.length === 0) {
            // Get all valid unit IDs and find the cheapest one
            const allValidTanks = this.aiDeck.filter(unitId => ENTITIES[unitId]);
            if (allValidTanks.length > 0) {
                const cheapestTank = allValidTanks.reduce((cheapest, unitId) => {
                    const unitData = ENTITIES[unitId];
                    const cheapestData = ENTITIES[cheapest];
                    return unitData.cost < cheapestData.cost ? unitId : cheapest;
                });

                // If we can afford the cheapest unit, use it
                if (ENTITIES[cheapestTank] && this.aiEnergy >= ENTITIES[cheapestTank].cost) {
                    availableTanks = [cheapestTank];
                }
            }
        }

        // If we still have no available units, return null
        if (availableTanks.length === 0) {
            return null;
        }

        // Prefer strategy-appropriate units
        const preferredTanks = availableTanks.filter(unitId =>
            this.aiStrategy.preferredTankTypes.includes(unitId)
        );

        if (preferredTanks.length > 0) {
            // 70% chance to use preferred unit
            if (Math.random() < 0.7) {
                return preferredTanks[Math.floor(Math.random() * preferredTanks.length)];
            }
        }

        // Strategic unit selection based on situation
        const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const heavyPlayerTanks = playerTanks.filter(t => t.unitData.type === TANK_TYPES.HEAVY);

        if (heavyPlayerTanks.length > 0 && this.aiEnergy >= 4) {
            // Counter heavy units with medium/heavy units
            const counterTanks = availableTanks.filter(unitId => {
                const unitData = ENTITIES[unitId];
                return unitData && (unitData.type === TANK_TYPES.MEDIUM || unitData.type === TANK_TYPES.HEAVY);
            });
            if (counterTanks.length > 0) {
                return counterTanks[Math.floor(Math.random() * counterTanks.length)];
            }
        }

        // Default random selection from available units
        return availableTanks[Math.floor(Math.random() * availableTanks.length)];
    }

    chooseAIDeploymentPosition(unitData) {
        const enemyZoneCoords = GameHelpers.getDeploymentZoneWorldCoords(false); // false = enemy zone
        const playerBase = this.buildings.find(b => b.isPlayerOwned);
        const aiBase = this.buildings.find(b => !b.isPlayerOwned);

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
                this.aiStrategy.preferredTankTypes = ['sherman', 'tiger'];
            } else if (data.cost <= 2 && this.aiEnergy >= 4) {
                // Player deployed cheap unit - might be rushing
                this.aiStrategy.preferredTankTypes = ['sherman', 'panther'];

                // Deploy sooner to match aggression
                const nextDeploymentDelay = GameHelpers.randomInt(1500, 3000);
                this.aiNextDeployment = Math.min(this.aiNextDeployment, currentTime + nextDeploymentDelay);
            }
        }
    }

    /**
     * AI casts a spell at the specified position
     * @param {Object} card - Card definition from ENTITIES
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    aiCastSpell(card, x, y) {
        this._castSpellInternal(card, x, y, false);
    }

    /**
     * AI places a building at the specified position
     * @param {Object} card - Card definition from ENTITIES
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    aiPlaceBuilding(card, x, y) {
        this._placeBuildingInternal(card, x, y, false);
    }

    /**
     * AI deploys a swarm of units
     * @param {Object} card - Card definition from ENTITIES
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    aiDeploySwarm(card, x, y) {
        const unitId = card.unitId || (card.payload && card.payload.unitId);
        const unitData = ENTITIES[unitId];
        const count = card.payload?.count || 1;

        // Spread units in a formation
        const spreadRadius = 25;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const offsetX = Math.cos(angle) * spreadRadius * (0.5 + Math.random() * 0.5);
            const offsetY = Math.sin(angle) * spreadRadius * (0.5 + Math.random() * 0.5);

            // Small delay between spawns for visual effect
            this.time.delayedCall(i * 50, () => {
                this.deployAITank(unitId, x + offsetX, y + offsetY);
            });
        }

        console.log('🤖 AI: Deployed', count, unitData.name, 'at', Math.round(x), Math.round(y));
    }

    deployAITank(unitId, x, y) {
        this._deployTankInternal(unitId, x, y, false);
    }

    update() {
        // Stop all game updates if battle has ended or game is paused
        if (this.battleEnded || this.gamePaused) {
            return;
        }

        // Update energy regeneration progress for gradual fill display
        if (this.energy < this.maxEnergy && this.energyTimer) {
            // Use the timer's built-in elapsed tracking for accurate progress
            const elapsed = this.energyTimer.getElapsed();
            const totalDelay = this.energyTimer.delay;
            this.energyRegenProgress = Math.min(elapsed / totalDelay, 1);
            this.updateEnergyBar();
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

        // Update base defenses and deployed buildings
        this.buildings.forEach(building => {
            if (building.health > 0) {
                if (building.isMainTower || building.towerType) {
                    // Base towers use tower AI
                    this.updateBaseDefense(building);
                    this.combatSystem.checkBaseCombat(building);
                } else {
                    // Deployed buildings use building AI
                    this.updateBuildingAI(building);
                    this.combatSystem.checkBaseCombat(building);
                }
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
            window.debugPanel.updateValue('debug-paused', this.gamePaused ? 'Paused' : (this.battleEnded ? 'Ended' : 'No'));

            // Player Stats
            window.debugPanel.updateValue('debug-player-energy', `${this.energy}/${this.maxEnergy}`);
            const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
            window.debugPanel.updateValue('debug-player-tanks', playerTanks.length);
            const handNames = this.hand && Array.isArray(this.hand)
                ? this.hand.map(id => ENTITIES?.[id]?.name || id).join(', ')
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
            const playerTowersAlive = this.buildings ? this.buildings.filter(b => b.isPlayerOwned && b.health > 0).length : 0;
            const aiTowersAlive = this.buildings ? this.buildings.filter(b => !b.isPlayerOwned && b.health > 0).length : 0;
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
        // Initialize the draw queue with all cards not in hand
        this.drawQueue = [...this.deck];
        this.shuffleArray(this.drawQueue);
    }

    /**
     * Shuffle an array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getNextCard(excludeSlotIndex = -1) {
        // Get the card being replaced (it will go back to the draw queue)
        const replacedCard = excludeSlotIndex >= 0 ? this.hand[excludeSlotIndex] : null;

        // Initialize draw queue if needed
        if (!this.drawQueue || this.drawQueue.length === 0) {
            // Build queue from cards not currently in hand
            const cardsInHand = this.hand.filter((_, idx) => idx !== excludeSlotIndex);
            this.drawQueue = this.deck.filter(id => !cardsInHand.includes(id));
            this.shuffleArray(this.drawQueue);
        }

        // Draw the next card from the queue
        const nextCard = this.drawQueue.shift();

        // Add the replaced card back to the end of the queue (if there was one)
        if (replacedCard && !this.drawQueue.includes(replacedCard)) {
            this.drawQueue.push(replacedCard);
        }

        return nextCard;
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
        const def = ENTITIES[cardId];
        const unitData = def.type === CARD_TYPES.TROOP ? ENTITIES[def.unitId || (def.payload && def.payload.unitId)] : null;

        // Destroy old tank icon and create new one
        if (card.tankIcon) {
            card.tankIcon.destroy();
        }

        // Create new tank icon with updated graphics
        const cardX = card.x;
        const cardY = card.y;
        const cardWidth = UI_CONFIG.CARDS.WIDTH;
        card.tankIcon = this.graphicsManager.createMiniCardGraphics(
            cardX + cardWidth / 2,
            cardY + 30,
            cardId
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
        card.unitId = def.unitId || (def.payload && def.payload.unitId);
        card.unitData = unitData;

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
        const cost = selectedCard.cardDef.cost;
        const displayName = selectedCard.cardDef.name;
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

    // ========================================
    // Input Handling Methods
    // ========================================

    onPointerDown(pointer) {
        // Only handle deployment if a card is selected and battle is active
        if (this.selectedCard === null || this.battleEnded || this.gamePaused) {
            return;
        }

        const selectedCard = this.tankCards[this.selectedCard];
        if (!selectedCard) return;

        // Don't deploy if clicking on the card UI area (bottom of screen)
        // Cards are at GAME_CONFIG.HEIGHT - 110, so check if pointer is in that area
        const cardsAreaY = GAME_CONFIG.HEIGHT - 120; // A bit above cards to be safe
        if (pointer.y > cardsAreaY) {
            return; // Click is on card UI, don't deploy
        }

        // Check if we have enough energy
        const cost = selectedCard.cardDef.cost;
        if (this.energy < cost) {
            this.showInsufficientEnergyFeedback();
            return;
        }

        // Get world coordinates from pointer
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileCoords = GameHelpers.worldToTile(worldPoint.x, worldPoint.y);

        // Handle different card types
        if (selectedCard.cardType === CARD_TYPES.TROOP) {
            this.handleTroopDeployment(selectedCard, tileCoords, worldPoint);
        } else if (selectedCard.cardType === CARD_TYPES.SPELL) {
            this.handleSpellCast(selectedCard, worldPoint);
        } else if (selectedCard.cardType === CARD_TYPES.BUILDING) {
            this.handleBuildingDeployment(selectedCard, tileCoords, worldPoint);
        }
    }

    onPointerMove(pointer) {
        // Update deployment preview if active
        if (this.deploymentPreview.active) {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const tileCoords = GameHelpers.worldToTile(worldPoint.x, worldPoint.y);
            this.updateDeploymentPreview(tileCoords.tileX, tileCoords.tileY);
        }

        // Update spell preview if active
        if (this.spellPreview.active) {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.updateSpellPreview(worldPoint.x, worldPoint.y);
        }
    }

    onPointerUp(pointer) {
        // Don't end previews here - they should persist until a new card is selected
        // Previews are ended by the deployment/spell handlers after successful use
    }

    handleTroopDeployment(selectedCard, tileCoords, worldPoint) {
        // Check if deployment position is valid
        const isValid = GameHelpers.isValidDeploymentTile(tileCoords.tileX, tileCoords.tileY, true, this.expandedDeploymentZones);

        if (!isValid) {
            this.showInvalidPlacementFeedback('Invalid deployment position');
            return;
        }

        // Deploy the tank(s) - handle swarm units
        const payload = selectedCard.cardDef.payload || {};
        if (payload.swarm && payload.count && selectedCard.unitId) {
            // Deploy multiple units in a spread pattern
            for (let i = 0; i < payload.count; i++) {
                const ox = GameHelpers.randomInt(-15, 15);
                const oy = GameHelpers.randomInt(-10, 10);
                this.deployTank(selectedCard.unitId, worldPoint.x + ox, worldPoint.y + oy);
            }
        } else if (selectedCard.unitId) {
            // Deploy single unit
            this.deployTank(selectedCard.unitId, worldPoint.x, worldPoint.y);
        }

        // Spend energy
        this.energy -= selectedCard.cardDef.cost;
        this.updateEnergyBar();

        // Cycle the card
        this.cycleCard(this.selectedCard);

        // Play deployment sound
        this.playUISound('deploy');

        // End preview and restart for newly cycled card
        this.endDeploymentPreview();
        const newSelectedCard = this.tankCards[this.selectedCard];
        if (newSelectedCard && newSelectedCard.cardType === CARD_TYPES.TROOP) {
            this.startDeploymentPreview(newSelectedCard);
        } else if (newSelectedCard && (newSelectedCard.cardType === CARD_TYPES.SPELL || newSelectedCard.cardType === CARD_TYPES.BUILDING)) {
            this.startSpellPreview(0, 0, newSelectedCard);
        }
    }

    handleSpellCast(selectedCard, worldPoint) {
        // Cast the spell at the target location using the enhanced version
        this._castSpellInternal(selectedCard.cardDef, worldPoint.x, worldPoint.y, true);

        // Spend energy
        this.energy -= selectedCard.cardDef.cost;
        this.updateEnergyBar();

        // Cycle the card
        this.cycleCard(this.selectedCard);

        // End preview and restart for newly cycled card
        this.endSpellPreview();
        const newSelectedCard = this.tankCards[this.selectedCard];
        if (newSelectedCard && newSelectedCard.cardType === CARD_TYPES.TROOP) {
            this.startDeploymentPreview(newSelectedCard);
        } else if (newSelectedCard && (newSelectedCard.cardType === CARD_TYPES.SPELL || newSelectedCard.cardType === CARD_TYPES.BUILDING)) {
            this.startSpellPreview(0, 0, newSelectedCard);
        }
    }

    handleBuildingDeployment(selectedCard, tileCoords, worldPoint) {
        // Check if deployment position is valid (buildings can only be placed in player's deployment zone)
        const isValid = GameHelpers.isValidDeploymentTile(tileCoords.tileX, tileCoords.tileY, true, this.expandedDeploymentZones);

        if (!isValid) {
            this.showInvalidPlacementFeedback('Invalid deployment position');
            return;
        }

        // Deploy the building
        this._placeBuildingInternal(selectedCard.cardDef, worldPoint.x, worldPoint.y, true);

        // Spend energy
        this.energy -= selectedCard.cardDef.cost;
        this.updateEnergyBar();

        // Cycle the card
        this.cycleCard(this.selectedCard);

        // Play deployment sound
        this.playUISound('deploy');

        // End preview and restart for newly cycled card
        this.endSpellPreview();
        const newSelectedCard = this.tankCards[this.selectedCard];
        if (newSelectedCard && newSelectedCard.cardType === CARD_TYPES.TROOP) {
            this.startDeploymentPreview(newSelectedCard);
        } else if (newSelectedCard && (newSelectedCard.cardType === CARD_TYPES.SPELL || newSelectedCard.cardType === CARD_TYPES.BUILDING)) {
            this.startSpellPreview(0, 0, newSelectedCard);
        }
    }


    // Tank AI is delegated to AIController.updateTankAI()

    updateBaseDefense(base) {
        const currentTime = this.time.now;
        const baseRange = 200; // Base defense range

        // Main towers don't target until they've been activated (hit at least once)
        if (base.isMainTower && !base.activated) {
            base.target = null;
            return;
        }

        // Update base target every 2 seconds or if target is destroyed
        if (currentTime - base.lastTargetUpdate > 2000 || !base.target || base.target.health <= 0) {
            base.lastTargetUpdate = currentTime;

            // Find closest enemy tank within range
            let closestEnemy = null;
            let closestDistance = Infinity;

            if (base.isPlayerOwned) {
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

    /**
     * Update AI behavior for deployed buildings (V1 launcher, etc.)
     */
    updateBuildingAI(building) {
        const currentTime = this.time.now;
        const buildingRange = 250; // Building attack range

        // Update building target every 1.5 seconds or if target is destroyed
        if (currentTime - (building.lastTargetUpdate || 0) > 1500 || !building.target || building.target.health <= 0) {
            building.lastTargetUpdate = currentTime;

            // Find closest enemy tank or building within range
            let closestEnemy = null;
            let closestDistance = Infinity;

            if (building.isPlayerOwned) {
                // Player building: target AI tanks and buildings
                const enemyTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
                const enemyBuildings = this.buildings.filter(b => !b.isPlayerOwned && !b.isMainTower && b.health > 0);

                [...enemyTanks, ...enemyBuildings].forEach(enemy => {
                    const distance = GameHelpers.distance(building.x, building.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= buildingRange) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
            } else {
                // AI building: target player tanks and buildings
                const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
                const playerBuildings = this.buildings.filter(b => b.isPlayerOwned && !b.isMainTower && b.health > 0);

                [...playerTanks, ...playerBuildings].forEach(enemy => {
                    const distance = GameHelpers.distance(building.x, building.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= buildingRange) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
            }

            building.target = closestEnemy;
        }

        // If building has a target and is ready to fire, attack
        // Skip manual attack for buildings with automatic timer-based launching (like V1 launcher)
        if (building.target && currentTime - (building.lastAttackTime || 0) > (building.attackCooldown || 2000) && !building.buildingDef?.payload?.launchIntervalMs) {
            building.lastAttackTime = currentTime;

            // Different attack logic based on building type
            switch (building.type) {
                case 'v1_launcher':
                    this.fireV1Missile(building, building.target);
                    break;
                default:
                    // Generic building attack (could be expanded for other building types)
                    this.combatSystem.createProjectile(building.x, building.y, building.target.x, building.target.y,
                        building.isPlayerOwned, 80, 'building');
                    break;
            }
        }
    }

    /**
     * Fire a V1 missile from launcher to target
     */
    fireV1Missile(launcher, target) {
        // Create missile projectile with special effects
        const missile = this.combatSystem.createProjectile(launcher.x, launcher.y, target.x, target.y,
            launcher.isPlayerOwned, 120, 'missile');

        // Add missile trail effect
        if (missile) {
            missile.setTint(launcher.isPlayerOwned ? 0x4444ff : 0xff4444);
            // Could add particle trail here
        }

        // Play missile launch sound
        this.playUISound('explosion'); // Temporary, should be missile sound
    }

    playShootSound(unitType) {
        // Enhanced shooting sounds based on tank type
        switch (unitType) {
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

    // Combat effects are delegated to CombatSystem

    showCardSelectionFeedback(cardIndex) {
        const card = this.tankCards[cardIndex];
        if (!card) return;

        // Create selection pulse effect with modern styling
        const selectionPulse = this.add.graphics();
        selectionPulse.setScrollFactor(0);
        selectionPulse.setDepth(50);

        // Draw pulse circle around card
        const cardCenterX = card.x + UI_CONFIG.CARDS.WIDTH / 2;
        const cardCenterY = card.y + UI_CONFIG.CARDS.HEIGHT / 2;
        selectionPulse.lineStyle(3, 0x60a5fa, 0.8);
        selectionPulse.strokeCircle(cardCenterX, cardCenterY, 55);

        // Animate pulse
        this.tweens.add({
            targets: selectionPulse,
            scaleX: 1.4,
            scaleY: 1.4,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => selectionPulse.destroy()
        });

        // Show brief selection info (troop vs non-troop)
        const isTroop = card.cardType === CARD_TYPES.TROOP;
        const displayName = isTroop ? card.unitData?.name : card.cardDef?.name;
        const costVal = isTroop ? card.cardDef?.cost : card.cardDef?.cost; // Fixed to use cardDef for cost
        const canAfford = typeof costVal === 'number' ? (this.energy >= costVal) : true;
        let infoText;
        let actionIcon;
        if (isTroop) {
            actionIcon = '🎯';
            infoText = canAfford ?
                `${displayName} - Click to deploy` :
                `${displayName} - Need ${costVal - this.energy} more ⚡`;
        } else if (card.cardType === CARD_TYPES.SPELL) {
            actionIcon = '✨';
            infoText = canAfford ?
                `${displayName} - Click to cast` :
                `${displayName} - Need ${costVal - this.energy} more ⚡`;
        } else {
            actionIcon = '🏗️';
            infoText = canAfford ?
                `${displayName} - Click to place` :
                `${displayName} - Need ${costVal - this.energy} more ⚡`;
        }

        // Feedback background panel
        const feedbackBg = this.add.graphics();
        feedbackBg.fillStyle(0x1e293b, 0.9);
        feedbackBg.fillRoundedRect(GAME_CONFIG.WIDTH / 2 - 130, GAME_CONFIG.HEIGHT - 195, 260, 30, 8);
        feedbackBg.lineStyle(1, canAfford ? 0x4ade80 : 0xf87171, 0.5);
        feedbackBg.strokeRoundedRect(GAME_CONFIG.WIDTH / 2 - 130, GAME_CONFIG.HEIGHT - 195, 260, 30, 8);
        feedbackBg.setScrollFactor(0);
        feedbackBg.setDepth(49);

        const feedbackText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 180, `${actionIcon} ${infoText}`, {
            fontSize: '13px',
            fill: canAfford ? '#4ade80' : '#f87171',
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5);
        feedbackText.setScrollFactor(0);
        feedbackText.setDepth(50);

        // Fade out feedback after 2 seconds
        this.tweens.add({
            targets: [feedbackBg, feedbackText],
            alpha: 0,
            duration: 800,
            delay: 1500,
            ease: 'Power2',
            onComplete: () => {
                feedbackBg.destroy();
                feedbackText.destroy();
            }
        });

        // Play selection sound
        this.playUISound('select');
    }

    destroyTower(tower) {
        // Update tower stats
        if (tower.isPlayerOwned) {
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
        const isPlayerTower = tower.isPlayerOwned;
        const towerName = tower.isMainTower ? 'MAIN TOWER' :
            tower.towerType === 'left' ? 'LEFT TOWER' : 'RIGHT TOWER';
        const message = `${isPlayerTower ? 'PLAYER' : 'ENEMY'} ${towerName} DESTROYED!`;
        const color = isPlayerTower ? '#ff4444' : '#44ff44';
        this._showNotification(message, color, 200);
    }

    checkTowerVictoryConditions() {
        // Main tower destroyed = immediate victory/defeat
        if (this.towerStats.player.mainTowerDestroyed) {
            this.endBattle('victory'); // Player destroyed enemy main tower
            return;
        }
        if (this.towerStats.enemy.mainTowerDestroyed) {
            this.endBattle('defeat'); // Enemy destroyed player main tower
            return;
        }

        // During overtime, any tower destruction ends the game immediately
        if (this.overtimeActive) {
            const playerTowersDestroyed = this.towerStats.player.towersDestroyed;
            const enemyTowersDestroyed = this.towerStats.enemy.towersDestroyed;

            if (playerTowersDestroyed > enemyTowersDestroyed) {
                this.endBattle('victory');
                return;
            } else if (enemyTowersDestroyed > playerTowersDestroyed) {
                this.endBattle('defeat');
                return;
            }
        }

        // No immediate victory - game continues
        // Victory will be determined by tower count at end of time
    }

    checkOvertimeConditions() {
        const playerTowersDestroyed = this.towerStats.player.towersDestroyed;
        const enemyTowersDestroyed = this.towerStats.enemy.towersDestroyed;

        console.log('═══════════════════════════════════════════════════════');
        console.log('⏰ CHECK OVERTIME CONDITIONS');
        console.log('───────────────────────────────────────────────────────');
        console.log(`🔵 Player destroyed ${playerTowersDestroyed} enemy towers`);
        console.log(`🔴 Enemy destroyed ${enemyTowersDestroyed} player towers`);

        // If towers destroyed are equal, activate overtime
        if (playerTowersDestroyed === enemyTowersDestroyed && !this.overtimeActive) {
            console.log('⚖️ Towers tied - activating overtime');
            console.log('═══════════════════════════════════════════════════════');
            this.activateOvertime();
            return;
        }

        // End battle based on tower count
        if (playerTowersDestroyed > enemyTowersDestroyed) {
            console.log(`✅ Result: VICTORY (Player destroyed more: ${playerTowersDestroyed} > ${enemyTowersDestroyed})`);
            console.log('═══════════════════════════════════════════════════════');
            this.endBattle('victory');
        } else {
            console.log(`❌ Result: DEFEAT (Enemy destroyed more: ${enemyTowersDestroyed} > ${playerTowersDestroyed})`);
            console.log('═══════════════════════════════════════════════════════');
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
        const tweenTargets = [building, building.healthFill, building.healthText];
        if (building.healthBg) tweenTargets.push(building.healthBg);

        this.tweens.add({
            targets: tweenTargets,
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

        console.log('═══════════════════════════════════════════════════════');
        console.log(`🏁 END BATTLE: ${result.toUpperCase()}`);
        console.log('───────────────────────────────────────────────────────');
        console.log(`📊 towerStats.player: destroyed=${this.towerStats.player.towersDestroyed}, mainDestroyed=${this.towerStats.player.mainTowerDestroyed}`);
        console.log(`📊 towerStats.enemy: destroyed=${this.towerStats.enemy.towersDestroyed}, mainDestroyed=${this.towerStats.enemy.mainTowerDestroyed}`);
        console.log('═══════════════════════════════════════════════════════');

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

    // Pause/Resume methods for game analysis
    togglePause() {
        if (this.battleEnded) return;

        this.gamePaused = !this.gamePaused;

        if (this.gamePaused) {
            this.pauseGame();
        } else {
            this.resumeGame();
        }

        // Update button state
        if (window.updatePauseButtonState) {
            window.updatePauseButtonState(this.gamePaused);
        }

        return this.gamePaused;
    }

    pauseGame() {
        // Cancel any active deployment preview
        this.endDeploymentPreview();

        // Pause physics, tweens, and timers
        if (this.physics && this.physics.world) {
            this.physics.world.pause();
        }

        // Pause all tweens
        if (this.tweens) {
            this.tweens.pauseAll();
        }

        // Pause timers
        if (this.time) {
            this.time.paused = true;
        }

        // Show pause overlay
        this.showPauseOverlay();
    }

    resumeGame() {
        // Resume physics
        if (this.physics && this.physics.world) {
            this.physics.world.resume();
        }

        // Resume all tweens
        if (this.tweens) {
            this.tweens.resumeAll();
        }

        // Resume timers
        if (this.time) {
            this.time.paused = false;
        }

        // Hide pause overlay
        this.hidePauseOverlay();
    }

    showPauseOverlay() {
        if (this.pauseOverlay) return;

        // Create semi-transparent overlay (low opacity to keep battle visible)
        this.pauseOverlay = this.add.graphics();
        this.pauseOverlay.fillStyle(0x000000, 0.3);
        this.pauseOverlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        this.pauseOverlay.setScrollFactor(0);
        this.pauseOverlay.setDepth(90);

        // Create compact pause indicator at top of screen
        this.pauseText = this.add.text(GAME_CONFIG.WIDTH / 2, 60, '⏸ PAUSED', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.pauseText.setScrollFactor(0);
        this.pauseText.setDepth(91);

        // Create compact subtitle
        this.pauseSubtext = this.add.text(GAME_CONFIG.WIDTH / 2, 82, 'Click Resume to continue', {
            fontSize: '12px',
            fill: '#cccccc',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        this.pauseSubtext.setScrollFactor(0);
        this.pauseSubtext.setDepth(91);
    }

    hidePauseOverlay() {
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
            this.pauseOverlay = null;
        }
        if (this.pauseText) {
            this.pauseText.destroy();
            this.pauseText = null;
        }
        if (this.pauseSubtext) {
            this.pauseSubtext.destroy();
            this.pauseSubtext = null;
        }
    }

    isPaused() {
        return this.gamePaused;
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
            this.addArenaTexture();
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
        rangeCircle.strokeCircle(tank.x, tank.y, tank.unitData.stats.range);

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
            tank.debugRangeCircle.strokeCircle(tank.x, tank.y, tank.unitData.stats.range);
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

        // Clean up pause overlay
        this.hidePauseOverlay();
        this.gamePaused = false;

        // Clean up row numbers when scene is destroyed
        this.hideRowNumbers();

        // Clean up attack range circles when scene is destroyed
        this.hideAllAttackRanges();

        // Clear current scene reference
        if (window.currentScene === this) {
            window.currentScene = null;
        }

        // Reset pause button state
        if (window.refreshPauseButtonState) {
            window.refreshPauseButtonState();
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
