class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
    }

    init(data) {
        this.gameState = (data && data.gameState)
            || GameHelpers.loadGameState()
            || GameHelpers.getDefaultGameState();
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
        this.zoneExpansionTransitions = []; // Track active expansion animations

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

        // Card deck system (8-card rotation) built from the saved deck
        this.deck = GameHelpers.getPlayerDeck(this.gameState);
        this.hand = [];
        this.nextCardIndex = 0;
        this.initializeDeck();

        // Row numbers display
        this.rowNumbersVisible = false;
        this.rowNumberLabels = [];

        // Attack range debug display
        this.attackRangesVisible = false;
        this.attackRangeCircles = [];

        // Card selection state
        this.selectedCard = -1;
        this.tankCards = [];

        // Deployment preview state
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
        this.cameras.main.setBackgroundColor('#0a111c');

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

    /**
     * Replaces a static Graphics object with a baked texture Image.
     *
     * Graphics geometry is re-batched by Phaser every frame, which dominated the
     * frame cost for the battlefield and other fixed art. Baking happens once;
     * the resulting Image is a single quad. Falls back to the live Graphics when
     * texture generation is unavailable.
     */
    cacheStaticGraphics(graphics, key, width, height, refresh = false) {
        if (!graphics || typeof graphics.generateTexture !== 'function') return graphics;

        const textures = this.textures;
        const canRender = !!(this.sys && this.sys.game && this.sys.game.renderer);
        if (!canRender || !textures || typeof textures.exists !== 'function') {
            return graphics;
        }

        // Callers that redraw infrequently (deployment zones) can ask for a
        // fresh bake instead of reusing the cached texture.
        if (refresh && textures.exists(key)) {
            textures.remove(key);
        }

        if (!textures.exists(key)) {
            graphics.generateTexture(key, width, height);
        }
        if (!textures.exists(key)) {
            return graphics;
        }

        const depth = graphics.depth;
        const scrollX = graphics.scrollFactorX;
        const scrollY = graphics.scrollFactorY;
        const image = this.add.image(0, 0, key).setOrigin(0, 0);
        image.setDepth(depth);
        image.setScrollFactor(scrollX, scrollY);
        graphics.destroy();
        return image;
    }

    createDebugBattlefield(offsetX) {
        // Create procedural graphics battlefield for debugging and detailed visualization
        this.battlefieldGraphics = this.add.graphics();
        this.battlefieldGraphics.setDepth(-5); // Behind deployment zones but above background

        const worldW = GAME_CONFIG.WORLD_WIDTH;
        const worldH = GAME_CONFIG.WORLD_HEIGHT;
        const tileSize = GAME_CONFIG.TILE_SIZE;

        // Base ground
        this.battlefieldGraphics.fillStyle(CanvasTheme.colors.ground, 1);
        this.battlefieldGraphics.fillRect(offsetX, 0, worldW, worldH);

        // Sector wash: cool blue for the player half, warm red for the enemy half
        const enemyH = 16 * tileSize;
        this.battlefieldGraphics.fillStyle(0xf87171, 0.025);
        this.battlefieldGraphics.fillRect(offsetX, 0, worldW, enemyH);
        this.battlefieldGraphics.fillStyle(0x60a5fa, 0.03);
        this.battlefieldGraphics.fillRect(offsetX, enemyH + 2 * tileSize, worldW, worldH - enemyH - 2 * tileSize);

        // Soft terrain patches (irregular ground, mud and worn tracks)
        const patches = [
            [0.12, 0.08, 0.30, 0.09, CanvasTheme.colors.groundLight, 0.24],
            [0.62, 0.14, 0.26, 0.07, CanvasTheme.colors.mud, 0.20],
            [0.20, 0.30, 0.22, 0.08, CanvasTheme.colors.groundAlt, 0.50],
            [0.55, 0.42, 0.34, 0.10, CanvasTheme.colors.groundLight, 0.16],
            [0.10, 0.62, 0.28, 0.09, CanvasTheme.colors.mud, 0.16],
            [0.62, 0.74, 0.28, 0.08, CanvasTheme.colors.groundAlt, 0.45],
            [0.30, 0.86, 0.34, 0.10, CanvasTheme.colors.groundLight, 0.18]
        ];
        patches.forEach(([px, py, pw, ph, color, alpha]) => {
            this.battlefieldGraphics.fillStyle(color, alpha);
            this.battlefieldGraphics.fillEllipse(offsetX + px * worldW, py * worldH, pw * worldW, ph * worldH);
        });

        // Grass texture (subtle checker keeps tile readability without banding)
        this.battlefieldGraphics.fillStyle(CanvasTheme.colors.groundLight, 0.14);
        for (let y = 0; y < GAME_CONFIG.TILES_Y; y++) {
            for (let x = 0; x < GAME_CONFIG.TILES_X; x++) {
                if ((x + y) % 2 === 0) {
                    this.battlefieldGraphics.fillRect(offsetX + x * tileSize, y * tileSize, tileSize, tileSize);
                }
            }
        }

        // Tile grid
        this.battlefieldGraphics.lineStyle(1, 0x000000, 0.12);
        for (let tileX = 0; tileX <= GAME_CONFIG.TILES_X; tileX++) {
            const x = offsetX + tileX * tileSize;
            this.battlefieldGraphics.lineBetween(x, 0, x, worldH);
        }
        for (let tileY = 0; tileY <= GAME_CONFIG.TILES_Y; tileY++) {
            const y = tileY * tileSize;
            this.battlefieldGraphics.lineBetween(offsetX, y, offsetX + worldW, y);
        }

        // Edge frame: hairline rail plus corner brackets
        this.battlefieldGraphics.lineStyle(1, CanvasTheme.colors.line, 0.3);
        this.battlefieldGraphics.strokeRect(offsetX, 0.5, worldW, worldH - 1);
        CanvasTheme.brackets(this.battlefieldGraphics, offsetX, 0, worldW, worldH, CanvasTheme.colors.lineBright, 0.4, 18, 4);

        // Center line dividing the sectors
        this.battlefieldGraphics.lineStyle(1, CanvasTheme.colors.lineBright, 0.28);
        const centerY = 16.5 * tileSize;
        const dashLen = 18;
        const gapLen = 10;
        let currentX = offsetX + 4;
        while (currentX < offsetX + worldW - 4) {
            this.battlefieldGraphics.lineBetween(
                currentX, centerY,
                Math.min(currentX + dashLen, offsetX + worldW - 4), centerY
            );
            currentX += dashLen + gapLen;
        }
        // Center marker
        this.battlefieldGraphics.fillStyle(CanvasTheme.colors.accent, 0.55);
        this.battlefieldGraphics.fillCircle(offsetX + worldW / 2, centerY, 2.5);

        // Margin tick rails (read like a map grid around the arena)
        this.battlefieldGraphics.lineStyle(1, CanvasTheme.colors.lineSoft, 0.35);
        for (let tileY = 0; tileY <= GAME_CONFIG.TILES_Y; tileY += 2) {
            const y = tileY * tileSize;
            this.battlefieldGraphics.lineBetween(offsetX - 8, y, offsetX - 3, y);
            this.battlefieldGraphics.lineBetween(offsetX + worldW + 3, y, offsetX + worldW + 8, y);
        }

        // Add river and bridges in debug mode
        this.createRiverAndBridges(this.battlefieldGraphics, offsetX);

        // This art never changes: bake it once instead of re-batching ~4k
        // Graphics commands every frame.
        this.battlefieldGraphics = this.cacheStaticGraphics(
            this.battlefieldGraphics,
            'procedural_battlefield',
            GAME_CONFIG.WIDTH,
            GAME_CONFIG.HEIGHT
        );
    }

    createRiverAndBridges(graphics, offsetX = 0) {
        // River parameters - rows 16-17
        const riverTopY = 16 * GAME_CONFIG.TILE_SIZE;
        const riverBottomY = 17 * GAME_CONFIG.TILE_SIZE;
        const riverHeight = riverBottomY - riverTopY + GAME_CONFIG.TILE_SIZE;
        const riverWidth = GAME_CONFIG.WORLD_WIDTH;

        // Water body
        graphics.fillStyle(CanvasTheme.colors.water, 1);
        graphics.fillRect(offsetX, riverTopY, riverWidth, riverHeight);

        // Deeper channel
        graphics.fillStyle(CanvasTheme.colors.waterDeep, 0.85);
        graphics.fillRect(offsetX, riverTopY + 7, riverWidth, riverHeight - 14);

        // Shallow edges
        graphics.fillStyle(CanvasTheme.colors.waterLight, 0.35);
        graphics.fillRect(offsetX, riverTopY, riverWidth, 3);
        graphics.fillRect(offsetX, riverTopY + riverHeight - 3, riverWidth, 3);

        // Ripple lines
        graphics.lineStyle(1, CanvasTheme.colors.waterRipple, 0.22);
        for (let ry = riverTopY + 6; ry < riverTopY + riverHeight - 4; ry += 7) {
            let rx = offsetX + ((ry / 7) % 2 === 0 ? 8 : 26);
            while (rx < offsetX + riverWidth - 10) {
                graphics.lineBetween(rx, ry, Math.min(rx + 18, offsetX + riverWidth - 4), ry);
                rx += 42;
            }
        }

        // River banks
        graphics.fillStyle(CanvasTheme.colors.mud, 0.95);
        graphics.fillRect(offsetX, riverTopY - 5, riverWidth, 5);
        graphics.fillRect(offsetX, riverBottomY + GAME_CONFIG.TILE_SIZE, riverWidth, 5);
        graphics.fillStyle(CanvasTheme.colors.mudLight, 0.5);
        graphics.fillRect(offsetX, riverTopY - 5, riverWidth, 1.5);
        graphics.fillRect(offsetX, riverBottomY + GAME_CONFIG.TILE_SIZE, riverWidth, 1.5);

        // Bridges
        const leftBridgeStartX = offsetX + BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER.LEFT.tileX * GAME_CONFIG.TILE_SIZE;
        const leftBridgeWidth = 3 * GAME_CONFIG.TILE_SIZE;
        const rightBridgeStartX = offsetX + (BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER.RIGHT.tileX - 1) * GAME_CONFIG.TILE_SIZE;
        const rightBridgeWidth = 3 * GAME_CONFIG.TILE_SIZE;

        const drawBridge = (x, width) => {
            // Dark under-structure
            graphics.fillStyle(CanvasTheme.colors.bridgeDark, 1);
            graphics.fillRect(x - 2, riverTopY - 4, width + 4, riverHeight + 8);

            // Planks
            graphics.fillStyle(CanvasTheme.colors.bridge, 1);
            graphics.fillRect(x, riverTopY - 2, width, riverHeight + 4);

            // Team-neutral hazard edge stripes
            graphics.fillStyle(CanvasTheme.colors.hazard, 0.35);
            graphics.fillRect(x + 2, riverTopY - 2, 2, riverHeight + 4);
            graphics.fillRect(x + width - 4, riverTopY - 2, 2, riverHeight + 4);

            // Plank seams
            graphics.lineStyle(1, CanvasTheme.colors.bridgeDark, 0.75);
            for (let i = 0; i < (riverHeight + 4) / 8; i++) {
                graphics.lineBetween(x, riverTopY - 2 + i * 8, x + width, riverTopY - 2 + i * 8);
            }

            // Railings + posts
            graphics.fillStyle(CanvasTheme.colors.steel, 0.85);
            graphics.fillRect(x - 4, riverTopY - 5, 4, riverHeight + 10);
            graphics.fillRect(x + width, riverTopY - 5, 4, riverHeight + 10);
            graphics.fillStyle(CanvasTheme.colors.steelLight, 0.75);
            for (let i = 0; i <= 4; i++) {
                const py = riverTopY - 5 + (i * (riverHeight + 8)) / 4;
                graphics.fillRect(x - 4, py, 4, 2);
                graphics.fillRect(x + width, py, 4, 2);
            }
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

        // Deployment zones are baked to a texture after drawing. When they need
        // to change, replace the previous Image with a fresh Graphics pass.
        const previousDepth = this.deploymentZoneGraphics.depth;
        if (typeof this.deploymentZoneGraphics.clear !== 'function') {
            this.deploymentZoneGraphics.destroy();
            this.deploymentZoneGraphics = this.add.graphics();
            this.deploymentZoneGraphics.setDepth(previousDepth);
        }

        // Clear existing deployment zone graphics and labels
        this.deploymentZoneGraphics.clear();
        if (this.deploymentZoneLabels) {
            this.deploymentZoneLabels.forEach(label => label.destroy());
            this.deploymentZoneLabels = [];
        }

        // Check the selected card to see if we should show highlights
        const selectedCard = this.selectedCard !== -1 ? this.tankCards[this.selectedCard] : null;

        // No highlights for spells or when no card is selected
        if (!selectedCard || selectedCard.cardType === CARD_TYPES.SPELL) {
            return;
        }

        const offsetX = GameHelpers.getBattlefieldOffset();
        const tileSize = GAME_CONFIG.TILE_SIZE;

        // Configuration for invalid zone visuals
        const overlayColor = CanvasTheme.colors.danger;
        const overlayAlpha = 0.22;
        const borderColor = CanvasTheme.colors.dangerDeep;
        const borderAlpha = 0.55;
        const borderWidth = 1;

        this.deploymentZoneGraphics.fillStyle(overlayColor, overlayAlpha);
        this.deploymentZoneGraphics.lineStyle(borderWidth, borderColor, borderAlpha);

        // Define enemy territory boundary (rows 0-17 include enemy side + river)
        const enemyTerritoryEndRow = 17;

        // Function to check if a specific tile IS INVALID right now, considering animations
        const isCurrentlyInvalid = (tx, ty) => {
            // Rule: Only highlight in enemy territory + river
            if (ty > enemyTerritoryEndRow) return false;

            // First check base validity
            const isBaseValid = GameHelpers.isValidDeploymentTile(tx, ty, true, this.expandedDeploymentZones);

            // If it's naturally invalid (enemy side, towers, etc.), it stays invalid
            if (!isBaseValid) return true;

            // If it's valid, it might still be "becoming valid" (animating retraction)
            // Check active transitions
            for (const transition of this.zoneExpansionTransitions) {
                const area = transition.area;
                if (tx >= area.tileX && tx < area.tileX + area.tilesWidth &&
                    ty >= area.tileY && ty < area.tileY + area.tilesHeight) {

                    // Calculation for shrinking: 
                    // For player expansion, we usually expand from rows 16-17 (river) into row 8.
                    // So at progress 0, rows 8-17 are invalid. At progress 1, all are valid.
                    // We shrink from the valid side (player side) towards the enemy side.
                    // Player side is down (high Y), Enemy side is up (low Y).

                    // normalizedY goes from 0 (enemy end of expansion) to 1 (bridge/player end)
                    const normalizedY = (ty - area.tileY) / (area.tilesHeight - 1);

                    // If progress is less than the position in the area, it's still invalid
                    // We want it to clear from the player side (high Y) towards the enemy side (low Y)
                    // So we compare (1 - progress) with normalizedY
                    if (normalizedY < (1 - transition.progress)) {
                        return true;
                    }
                }
            }

            return false;
        };

        // Draw the invalid zones and their borders
        for (let tileY = 0; tileY < GAME_CONFIG.TILES_Y; tileY++) {
            for (let tileX = 0; tileX < GAME_CONFIG.TILES_X; tileX++) {
                const currentInvalid = isCurrentlyInvalid(tileX, tileY);

                if (currentInvalid) {
                    const x = offsetX + tileX * tileSize;
                    const y = tileY * tileSize;

                    // Fill the invalid tile
                    this.deploymentZoneGraphics.fillRect(x, y, tileSize, tileSize);

                    // Draw borders at the edges of invalid zones
                    // Check neighbors to decide where to draw lines

                    // Top edge
                    if (tileY === 0 || !isCurrentlyInvalid(tileX, tileY - 1)) {
                        this.deploymentZoneGraphics.lineBetween(x, y, x + tileSize, y);
                    }
                    // Bottom edge
                    if (tileY === GAME_CONFIG.TILES_Y - 1 || !isCurrentlyInvalid(tileX, tileY + 1)) {
                        this.deploymentZoneGraphics.lineBetween(x, y + tileSize, x + tileSize, y + tileSize);
                    }
                    // Left edge
                    if (tileX === 0 || !isCurrentlyInvalid(tileX - 1, tileY)) {
                        this.deploymentZoneGraphics.lineBetween(x, y, x, y + tileSize);
                    }
                    // Right edge
                    if (tileX === GAME_CONFIG.TILES_X - 1 || !isCurrentlyInvalid(tileX + 1, tileY)) {
                        this.deploymentZoneGraphics.lineBetween(x + tileSize, y, x + tileSize, y + tileSize);
                    }
                }
            }
        }

        // While an expansion transition animates, this redraws every frame, so
        // keep the live Graphics. Once it settles, bake the result: static art
        // should not be re-batched every frame.
        const isAnimating = this.zoneExpansionTransitions
            && this.zoneExpansionTransitions.some(transition => transition.progress < 1);

        if (!isAnimating) {
            this.deploymentZoneGraphics = this.cacheStaticGraphics(
                this.deploymentZoneGraphics,
                'procedural_deployment_zones',
                GAME_CONFIG.WIDTH,
                GAME_CONFIG.HEIGHT,
                true
            );
        }
    }

    drawExpandedZones(offsetX) {
        // This method is now integrated into drawDeploymentZones logic
        // which iterates through all tiles and uses GameHelpers.isValidDeploymentTile
        // which already accounts for expanded zones.
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
        CanvasTheme.panel(aiStatusBg, 5, 32, 105, 70, {
            radius: 6,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.88,
            stroke: CanvasTheme.colors.amber,
            strokeAlpha: 0.3,
            accent: CanvasTheme.colors.amber,
            accentAlpha: 0.7,
            shadow: false,
            brackets: true,
            bracketColor: CanvasTheme.colors.amber,
            bracketAlpha: 0.28,
            bracketLength: 7
        });
        aiStatusBg.setScrollFactor(0);
        aiStatusBg.setDepth(1000);

        this.add.text(10, 37, 'AI CORE', {
            fontSize: '7px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setScrollFactor(0).setDepth(1000);

        // Signal bars in the panel header
        for (let i = 0; i < 4; i++) {
            aiStatusBg.fillStyle(CanvasTheme.colors.amber, 0.28 + i * 0.16);
            aiStatusBg.fillRect(96 - i * 4, 37, 2, 6);
        }

        this.aiStrategyText = this.add.text(10, 50, 'AI: ---', {
            fontSize: '10px',
            fill: CanvasTheme.colors.amberCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontWeight: '600',
            lineSpacing: 2
        });
        this.aiStrategyText.setScrollFactor(0);
        this.aiStrategyText.setDepth(1000);

        // Thin scan rule under the readout
        aiStatusBg.lineStyle(1, CanvasTheme.colors.line, 0.14);
        aiStatusBg.lineBetween(10, 68, 105, 68);
        this.add.text(10, 77, 'THREAT ASSESSMENT', {
            fontSize: '7px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setScrollFactor(0).setDepth(1000);

        // Back button with modern styling - compact in top left margin
        const backButtonBg = this.add.graphics();
        CanvasTheme.panel(backButtonBg, 5, 5, 70, 24, {
            radius: 5,
            fill: CanvasTheme.colors.raised,
            fillAlpha: 0.9,
            stroke: CanvasTheme.colors.line,
            strokeAlpha: 0.36,
            shadow: false
        });
        backButtonBg.setScrollFactor(0);
        backButtonBg.setDepth(1000);

        const backButton = this.add.text(40, 17, '← MENU', {
            fontSize: '9px',
            fill: CanvasTheme.colors.textDim,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0.5).setInteractive();
        backButton.setScrollFactor(0);
        backButton.setDepth(1000);

        backButton.on('pointerover', () => {
            backButton.setFill(CanvasTheme.colors.accentCss);
        });

        backButton.on('pointerout', () => {
            backButton.setFill(CanvasTheme.colors.textDim);
        });

        backButton.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    /**
     * Shared hand-card layout metrics. Cards are enlarged on tall screens, so
     * every card refresh must use the same sizes as the initial hand.
     */
    getCardLayoutMetrics() {
        // Determine if we are on a tall screen (mobile-like) or standard
        // Standard height is 800. Tall screens usually > 1000.
        const isTallScreen = GAME_CONFIG.HEIGHT > 1000;
        const scaleFactor = isTallScreen ? 1.25 : 1.0;

        return {
            isTallScreen,
            scaleFactor,
            cardWidth: UI_CONFIG.CARDS.WIDTH * scaleFactor,
            cardHeight: UI_CONFIG.CARDS.HEIGHT * scaleFactor,
            cardSpacing: UI_CONFIG.CARDS.SPACING * (isTallScreen ? 1.2 : 1.0), // Slightly more relative spacing on mobile
            iconOffsetY: 30 * scaleFactor
        };
    }

    createTankCards() {
        const { isTallScreen, scaleFactor, cardWidth, cardHeight, cardSpacing, iconOffsetY } = this.getCardLayoutMetrics();

        // Calculate vertical position
        // Battlefield height is fixed. We arrange items in the remaining space below.
        // Space available = HEIGHT - WORLD_HEIGHT.
        const marginBelowBattle = UI_CONFIG.CARDS.MARGIN_BELOW_BATTLEFIELD;

        // Default position (desktop/tight)
        let cardsY = GAME_CONFIG.WORLD_HEIGHT + marginBelowBattle;

        // If tall screen, center the cards better in the available space between battlefield and energy bar
        if (isTallScreen) {
            const energyBarTop = GAME_CONFIG.HEIGHT - (UI_CONFIG.ENERGY_BAR.BOTTOM_MARGIN * 2) - UI_CONFIG.ENERGY_BAR.HEIGHT;
            const availableSpaceCenter = GAME_CONFIG.WORLD_HEIGHT + (energyBarTop - GAME_CONFIG.WORLD_HEIGHT) / 2;
            cardsY = availableSpaceCenter - (cardHeight / 2);
            // Ensure scaling up didn't push it too high into battlefield
            cardsY = Math.max(cardsY, GAME_CONFIG.WORLD_HEIGHT + marginBelowBattle);
        }

        const totalWidth = (4 * cardSpacing) - (cardSpacing - cardWidth); // Account for spacing
        const startX = (GAME_CONFIG.WIDTH - totalWidth) / 2; // Center horizontally

        this.tankCards = [];

        // Create cards from hand
        for (let index = 0; index < DECK_CONFIG.HAND_SIZE; index++) {
            const cardId = this.hand[index];
            const cardDef = CARDS[cardId];
            if (!cardDef) break; // hand can be shorter if the card pool is small
            const unitId = cardDef.type === CARD_TYPES.TROOP ? (cardDef.unitId || (cardDef.payload && cardDef.payload.unitId)) : null;
            const unitData = unitId ? UNITS[unitId] : null;
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
                cardsY + iconOffsetY,
                cardId
            );
            tankIcon.setScale(scaleFactor); // Scale icon with card
            // Rotate troop cards to face upward (enemy field direction)
            // Skip rotation for image-based cards which are already oriented for the UI
            if (cardDef.type === CARD_TYPES.TROOP && !tankIcon.isImageCard) {
                tankIcon.setRotation(-Math.PI / 2); // -90 degrees = upward
            }
            card.tankIcon = tankIcon;

            // Cost - moved to top right corner with better styling
            const costValue = cardDef.cost;
            const costText = this.add.text(cardX + cardWidth - (8 * scaleFactor), cardsY + (8 * scaleFactor), costValue, {
                fontSize: `${parseInt(UI_CONFIG.CARDS.COST_TEXT.FONT_SIZE) * scaleFactor}px`,
                fill: UI_CONFIG.CARDS.COST_TEXT.COLOR,
                fontFamily: CanvasTheme.fonts.mono,
                stroke: UI_CONFIG.CARDS.COST_TEXT.STROKE_COLOR,
                strokeThickness: UI_CONFIG.CARDS.COST_TEXT.STROKE_THICKNESS * scaleFactor
            }).setOrigin(1, 0);
            costText.setScrollFactor(0);

            // Card name - positioned lower with improved styling
            const displayName = cardDef.name;
            const nameText = this.add.text(cardX + cardWidth / 2, cardsY + cardHeight - (12 * scaleFactor), displayName, {
                fontSize: `${parseInt(UI_CONFIG.CARDS.NAME_TEXT.FONT_SIZE) * scaleFactor}px`,
                fill: UI_CONFIG.CARDS.NAME_TEXT.COLOR,
                fontFamily: CanvasTheme.fonts.ui
            }).setOrigin(0.5);
            nameText.setScrollFactor(0);

            // Selection frame (initially hidden)
            const selectionBorder = this.add.graphics();
            selectionBorder.setScrollFactor(0);
            selectionBorder.setVisible(false);

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
        const isTallScreen = GAME_CONFIG.HEIGHT > 1000;

        // Increase bottom margin for tall screens (better visibility on phones)
        const bottomMargin = isTallScreen
            ? UI_CONFIG.ENERGY_BAR.BOTTOM_MARGIN * 2.25 // ~45px
            : UI_CONFIG.ENERGY_BAR.BOTTOM_MARGIN;       // 20px

        // Position energy bar at the bottom center
        const energyY = GAME_CONFIG.HEIGHT - bottomMargin;
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

        // Energy text - positioned to the left of the bar
        this.energyText = this.add.text(barX - 8, energyY + 10, `${this.energy}/${this.maxEnergy}`, {
            fontSize: '12px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 1
        }).setOrigin(1, 0.5); // Right-align the text so it sits left of the bar
        this.energyText.setScrollFactor(0);

        // The cell wells never change: draw them once instead of every frame.
        this.drawEnergyBarBackground();

        // Update energy bar after creating
        this._energyBarStateKey = null;
        this.updateEnergyBar();
    }

    drawEnergyBarBackground() {
        const config = this.energyBarConfig;
        if (!this.energyBarBg || !config) return;

        const graphics = this.energyBarBg;
        graphics.clear();

        // Bake a compact texture for the cell wells. Shift the drawing into the
        // texture's local space first so the bake only covers the bar.
        if (typeof graphics.translateCanvas === 'function') {
            graphics.translateCanvas(-config.x + 1, -config.y + 1);
        }

        for (let i = 0; i < this.maxEnergy; i++) {
            const squareX = config.x + (i * (config.squareSize + config.spacing));
            const squareY = config.y;

            // Empty cell: dark inset well
            graphics.fillStyle(CanvasTheme.colors.panelStrong, 0.92);
            graphics.lineStyle(1, CanvasTheme.colors.line, 0.3);
            graphics.fillRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);
            graphics.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);
            graphics.fillStyle(0x000000, 0.35);
            graphics.fillRect(squareX + 2, squareY + 2, config.squareSize - 4, 2);
        }

        this.energyBarBg = this.cacheStaticGraphics(
            graphics,
            'procedural_energy_bar_bg',
            config.totalWidth + 2,
            config.height + 2
        );

        // The baked Image must sit exactly where the wells were drawn.
        if (this.energyBarBg !== graphics) {
            this.energyBarBg.setPosition(config.x - 1, config.y - 1);
            this.energyBarBg.setScrollFactor(0);
        }
    }

    createTimer() {
        // Timer background panel - compact in top right margin
        const timerBg = this.add.graphics();
        CanvasTheme.panel(timerBg, GAME_CONFIG.WIDTH - 70, 5, 65, 24, {
            radius: 5,
            fill: CanvasTheme.colors.raised,
            fillAlpha: 0.92,
            stroke: CanvasTheme.colors.accent,
            strokeAlpha: 0.34,
            shadow: false,
            accent: CanvasTheme.colors.accent,
            accentAlpha: 0.65
        });
        timerBg.setScrollFactor(0);
        timerBg.setDepth(1000);

        // Timer text with icon
        this.timerText = this.add.text(GAME_CONFIG.WIDTH - 38, 17, this.formatTime(this.battleTime), {
            fontSize: '12px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.mono,
            fontWeight: 'bold',
            letterSpacing: 1
        }).setOrigin(0.5);
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(1000);

        // Tower status display
        this.createTowerStatusDisplay();
    }

    createTowerStatusDisplay() {
        // Enemy tower status panel - below AI status panel (which ends at y=102)
        const enemyPanelBg = this.add.graphics();
        CanvasTheme.panel(enemyPanelBg, 5, 108, 85, 45, {
            radius: 5,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.88,
            stroke: CanvasTheme.colors.danger,
            strokeAlpha: 0.32,
            shadow: false,
            accent: CanvasTheme.colors.danger,
            accentAlpha: 0.7
        });
        enemyPanelBg.setScrollFactor(0);
        enemyPanelBg.setDepth(1000);

        this.enemyTowerStatus = this.add.text(10, 112, '', {
            fontSize: '9px',
            fill: CanvasTheme.colors.dangerCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontWeight: '600',
            lineSpacing: 2
        });
        this.enemyTowerStatus.setScrollFactor(0);
        this.enemyTowerStatus.setDepth(1000);

        // Player tower status panel - below enemy panel (which ends at y=153)
        const playerPanelBg = this.add.graphics();
        CanvasTheme.panel(playerPanelBg, 5, 156, 85, 45, {
            radius: 5,
            fill: CanvasTheme.colors.panel,
            fillAlpha: 0.88,
            stroke: CanvasTheme.colors.blue,
            strokeAlpha: 0.32,
            shadow: false,
            accent: CanvasTheme.colors.blue,
            accentAlpha: 0.7
        });
        playerPanelBg.setScrollFactor(0);
        playerPanelBg.setDepth(1000);

        this.playerTowerStatus = this.add.text(10, 160, '', {
            fontSize: '9px',
            fill: CanvasTheme.colors.blueCss,
            fontFamily: CanvasTheme.fonts.mono,
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

        // Refresh deployment zones to show/hide highlights based on selected card
        this.drawDeploymentZones();
    }

    updateCardSelection() {
        // Update card visuals (don't end previews here - they're managed by selectTankCard)
        this.tankCards.forEach((card, index) => {
            card.clearTint();
            if (index === this.selectedCard) {
                const { cardWidth: w, cardHeight: h } = this.getCardLayoutMetrics();
                card.selectionBorder.clear();
                card.selectionBorder.lineStyle(2, CanvasTheme.colors.amber, 0.95);
                card.selectionBorder.strokeRoundedRect(card.x - 2, card.y - 2, w + 4, h + 4, 9);
                CanvasTheme.brackets(
                    card.selectionBorder,
                    card.x - 5, card.y - 5, w + 10, h + 10,
                    CanvasTheme.colors.amber, 0.9, 10, 0
                );
                card.selectionBorder.setVisible(true);
            } else {
                card.selectionBorder.setVisible(false);
            }
        });
    }

    showCardTooltip(cardIndex, x, y) {
        // Always hide any existing tooltip first to prevent overlaps
        this.hideCardTooltip();
        const cardRef = this.tankCards[cardIndex];
        const isTroop = cardRef.cardType === CARD_TYPES.TROOP;
        const unitId = isTroop ? (cardRef.cardDef.unitId || (cardRef.cardDef.payload && cardRef.cardDef.payload.unitId)) : null;
        const unitData = unitId ? UNITS[unitId] : (isTroop ? cardRef.unitData : null);

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
        this.cardTooltip.setDepth(2000); // Ensure tooltip is on top of everything including tanks

        // Enhanced tooltip background with command-console styling
        const tooltipBg = this.add.graphics();

        // Determine cost (troop vs non-troop) and header colour
        const costVal = cardRef.cardDef.cost;
        const affordable = costVal <= this.energy;

        const typeColors = {
            [TANK_TYPES.LIGHT]: 0x4ade80,
            [TANK_TYPES.MEDIUM]: 0xfbbf24,
            [TANK_TYPES.HEAVY]: 0xf472b6,
            [TANK_TYPES.TANK_DESTROYER]: 0xa78bfa,
            [TANK_TYPES.ARTILLERY]: 0xfacc15,
            [TANK_TYPES.FAST_ATTACK]: 0x38bdf8,
            [TANK_TYPES.AIR]: 0x38bdf8,
            [TANK_TYPES.ANTI_AIR]: 0xa3e635
        };
        const headerColor = isTroop ? (typeColors[unitData.unitType] || CanvasTheme.colors.blue) : CanvasTheme.colors.violet;

        CanvasTheme.panel(tooltipBg, 0, 0, tooltipWidth, tooltipHeight, {
            radius: 8,
            fill: CanvasTheme.colors.panelStrong,
            fillAlpha: 0.97,
            stroke: affordable ? headerColor : CanvasTheme.colors.steelLight,
            strokeAlpha: 0.6,
            accent: headerColor,
            accentAlpha: 0.85,
            shadowAlpha: 0.4
        });

        // Header band tinted by card type
        tooltipBg.fillStyle(headerColor, 0.16);
        tooltipBg.fillRoundedRect(1, 1, tooltipWidth - 2, 34, 7);
        CanvasTheme.rule(tooltipBg, 12, 36, tooltipWidth - 12, 36, CanvasTheme.colors.line, 0.18);

        // Tank name and tier
        const nameText = this.add.text(15, 9, `${cardRef.cardDef.name}`, {
            fontSize: '15px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.ui,
            fontStyle: 'bold',
            letterSpacing: 1
        });
        const tierText = this.add.text(tooltipWidth - 15, 10, isTroop ? `TIER ${unitData.tier}` : `${cardRef.cardDef.type.toUpperCase()}`, {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Tank type indicator
        const typeText = this.add.text(15, 25, isTroop ? unitData.unitType.toUpperCase().replace('_', '-') : cardRef.cardDef.type.toUpperCase(), {
            fontSize: '8px',
            fill: CanvasTheme.hex(headerColor),
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });

        // Cost indicator with energy status
        const costColor = affordable ? CanvasTheme.colors.greenCss : CanvasTheme.colors.dangerCss;
        const costText = this.add.text(tooltipWidth - 15, 24, `COST ${costVal}`, {
            fontSize: '10px',
            fill: costColor,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 1
        }).setOrigin(1, 0);

        if (!isTroop) {
            // Simple content for spells/buildings
            const descY = 56;
            const desc = cardRef.cardDef.id === 'smoke_barrage' ? `Small area damage and brief stun.`
                : cardRef.cardDef.id === 'artillery_strike' ? `Medium-radius area damage.`
                    : cardRef.cardDef.id === 'v1_launcher' ? `Launches homing missiles that explode on impact.`
                        : `Special card.`;
            const body = this.add.text(15, descY, desc, {
                fontSize: '11px',
                fill: CanvasTheme.colors.textDim,
                fontFamily: CanvasTheme.fonts.ui,
                wordWrap: { width: tooltipWidth - 30 },
                lineSpacing: 3
            });
            this.cardTooltip.add([tooltipBg, nameText, tierText, typeText, costText, body]);
            this.cardTooltip.alpha = 0;
            this.tooltipFadeInTween = this.tweens.add({ targets: this.cardTooltip, alpha: 1, duration: 150 });
            return;
        }

        // Main stats section (troop)
        const statsY = 48;
        const leftColumnX = 15;
        const rightColumnX = 150;

        // Combat stats (left column)
        const combatTitle = this.add.text(leftColumnX, statsY, 'COMBAT', {
            fontSize: '8px',
            fill: CanvasTheme.colors.amberCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 1
        });

        const combatStats = this.add.text(leftColumnX, statsY + 14,
            `Health: ${unitData.stats.hp}\n` +
            `Damage: ${unitData.stats.damage}\n` +
            `Range: ${unitData.stats.range}\n` +
            `Penetration: ${unitData.stats.penetration}` +
            (unitData.lifetimeMs ? `\nLifetime: ${Math.round(unitData.lifetimeMs / 1000)}s` : ''), {
            fontSize: '10px',
            fill: CanvasTheme.colors.textDim,
            fontFamily: CanvasTheme.fonts.mono,
            lineSpacing: 3
        });

        // Mobility & Armor stats (right column)
        const mobilityTitle = this.add.text(rightColumnX, statsY, 'MOBILITY & ARMOR', {
            fontSize: '8px',
            fill: CanvasTheme.colors.blueCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 1
        });

        const mobilityStats = this.add.text(rightColumnX, statsY + 14,
            `Speed: ${unitData.stats.speed}\n` +
            (unitData.isAir
                ? `Airborne: Yes\nTargets: ${unitData.canTargetGround === false ? 'Air only' : 'Air + Ground'}`
                : (unitData.canTargetGround === false
                    ? `Front Armor: ${unitData.stats.armor?.front ?? 0}\n` +
                      `Side Armor: ${unitData.stats.armor?.side ?? 0}\n` +
                      `Targets: Air only`
                    : `Front Armor: ${unitData.stats.armor?.front ?? 0}\n` +
                      `Side Armor: ${unitData.stats.armor?.side ?? 0}\n` +
                      `Rear Armor: ${unitData.stats.armor?.rear ?? 0}`)), {
            fontSize: '10px',
            fill: CanvasTheme.colors.textDim,
            fontFamily: CanvasTheme.fonts.mono,
            lineSpacing: 3
        });

        // Abilities section
        const abilitiesY = 120;
        if (unitData.abilities && unitData.abilities.length > 0) {
            const abilitiesTitle = this.add.text(leftColumnX, abilitiesY, 'ABILITIES', {
                fontSize: '8px',
                fill: CanvasTheme.colors.violetCss,
                fontFamily: CanvasTheme.fonts.mono,
                fontStyle: 'bold',
                letterSpacing: 1
            });

            const abilitiesText = unitData.abilities.map(ability => {
                // Convert ability names to readable format
                return ability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }).join(', ');

            const abilitiesDesc = this.add.text(leftColumnX, abilitiesY + 14, abilitiesText, {
                fontSize: '9px',
                fill: CanvasTheme.colors.textDim,
                fontFamily: CanvasTheme.fonts.mono,
                wordWrap: { width: tooltipWidth - 30 }
            });

            this.cardTooltip.add([abilitiesTitle, abilitiesDesc]);
        }

        // Description at bottom
        const descY = abilitiesY + (unitData.abilities && unitData.abilities.length > 0 ? 34 : 14);
        const descText = this.add.text(leftColumnX, descY, unitData.description, {
            fontSize: '9px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.ui,
            fontStyle: 'italic',
            wordWrap: { width: tooltipWidth - 30 },
            lineSpacing: 2
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
        const tower = this.graphicsManager.createTowerGraphics(towerTile.worldX, towerTile.worldY, isPlayerTeam, isMainTower);

        // Set tower properties - Pull stats from UNITS registry
        const entityId = isMainTower ? 'main_tower' : 'side_tower';
        const entityDef = UNITS[entityId];

        tower.health = entityDef.stats.hp;
        tower.maxHealth = entityDef.stats.hp;
        tower.range = entityDef.stats.range;
        tower.damage = entityDef.stats.damage;
        tower.isPlayerOwned = isPlayerTeam;
        tower.isMainTower = isMainTower;
        tower.towerType = towerType;
        tower.canTargetAir = entityDef.canTargetAir !== false;
        tower.canTargetGround = entityDef.canTargetGround !== false;
        tower.lastShotTime = 0;
        tower.target = null;
        tower.lastTargetUpdate = 0;

        // Main towers start deactivated and only activate when hit
        tower.activated = !isMainTower;

        // Adjust position for main towers
        if (isMainTower) {
            // Move the tower half a tile up to center it
            tower.x += GAME_CONFIG.TILE_SIZE / 2;
        }

        // Add to buildings array
        this.buildings.push(tower);

        // Create health bar
        this.createBuildingHealthBar(tower);
    }

    startEnergyRegeneration() {
        this.energyTimer = this.time.addEvent({
            delay: this.getEnergyRegenDelay(),
            callback: this.handleEnergyTick,
            callbackScope: this,
            loop: true
        });
    }

    handleEnergyTick() {
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.energy + ENERGY_CONFIG.REGEN_RATE, this.maxEnergy);
            this.showEnergyGainEffect();
        }
        this.energyRegenProgress = 0;
        this.updateEnergyBar();
        // Reschedule next tick with the *new* delay
        this.energyTimer.reset({
            delay: this.getEnergyRegenDelay(),
            callback: this.handleEnergyTick,
            callbackScope: this,
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
        const energyGainText = this.add.text(GAME_CONFIG.WIDTH / 2, config.y - 18, '+1 ENERGY', {
            fontSize: '11px',
            fill: CanvasTheme.colors.greenCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 1
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
        if (!config || !this.energyBarFill) return;

        const nextFillWidth = this.energy < this.maxEnergy
            ? Math.floor(config.squareSize * this.energyRegenProgress)
            : 0;
        const stateKey = `${this.energy}|${nextFillWidth}`;

        // Redraw only when a cell or the partial fill actually changes. This is
        // called every frame while energy regenerates.
        if (this._energyBarStateKey === stateKey) {
            this.updateEnergyPreview();
            return;
        }
        this._energyBarStateKey = stateKey;

        this.energyBarFill.clear();

        // Draw individual energy squares with modern styling
        for (let i = 0; i < this.maxEnergy; i++) {
            const squareX = config.x + (i * (config.squareSize + config.spacing));
            const squareY = config.y;

            // Filled square if we have energy for this slot
            if (i < this.energy) {
                // Brighter blue for the newest energy points
                let fillColor = CanvasTheme.colors.blueDeep;
                let glowColor = CanvasTheme.colors.blue;

                if (i >= this.energy - 2 && i < this.energy) {
                    fillColor = CanvasTheme.colors.blue;

                    // Subtle glow behind recent energy
                    this.energyBarFill.fillStyle(glowColor, 0.22);
                    this.energyBarFill.fillRoundedRect(squareX - 1.5, squareY - 1.5, config.squareSize + 3, config.squareSize + 3, 4);
                }

                // Main fill
                this.energyBarFill.fillStyle(fillColor, 1);
                this.energyBarFill.fillRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);
                this.energyBarFill.lineStyle(1, CanvasTheme.colors.accent, 0.55);
                this.energyBarFill.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);

                // Inner highlight
                this.energyBarFill.fillStyle(0xffffff, 0.22);
                this.energyBarFill.fillRoundedRect(squareX + 2, squareY + 2, config.squareSize - 6, 3, 1.5);
            }
            // Gradual fill for the next energy cell (showing regeneration progress)
            else if (i === this.energy && this.energy < this.maxEnergy) {
                // Calculate fill width based on progress (fills from left to right)
                const fillWidth = Math.floor(config.squareSize * this.energyRegenProgress);

                if (fillWidth > 0) {
                    // Draw partial fill from left
                    this.energyBarFill.fillStyle(CanvasTheme.colors.blueDeep, 0.65);
                    this.energyBarFill.fillRoundedRect(squareX, squareY, fillWidth, config.squareSize,
                        fillWidth >= config.squareSize - 3 ? 3 : 0);

                    // Progress edge
                    this.energyBarFill.lineStyle(1, CanvasTheme.colors.accent, 0.45);
                    this.energyBarFill.strokeRoundedRect(squareX, squareY, config.squareSize, config.squareSize, 3);
                }
            }
        }

        // Update energy text with modern styling
        if (this.energyText) {
            this.energyText.setText(`${this.energy}/${this.maxEnergy}`);
            this.energyText.setStyle({
                fontSize: '12px',
                fill: CanvasTheme.colors.text,
                fontFamily: CanvasTheme.fonts.mono,
                fontWeight: '700',
                letterSpacing: 1
            });
        }

        this.updateEnergyPreview();
    }

    /**
     * Refreshes the deployment preview when the energy bar itself did not
     * change. Kept separate so the bar's draw loop can stay cheap.
     */
    updateEnergyPreview() {
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
            timeText = `+${this.formatTime(overtimeSeconds)}`;
            timeColor = CanvasTheme.colors.dangerCss;

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
            timeText = this.formatTime(this.battleTime);

            // Change timer color when time is running low
            if (this.battleTime <= 10) {
                timeColor = CanvasTheme.colors.dangerCss; // Red - Critical
                // Flash effect for last 10 seconds
                this.tweens.add({
                    targets: this.timerText,
                    alpha: 0.4,
                    duration: 400,
                    yoyo: true,
                    ease: 'Power2'
                });
            } else if (this.battleTime <= 30) {
                timeColor = CanvasTheme.colors.dangerCss; // Red
            } else if (this.battleTime <= 60) {
                timeColor = CanvasTheme.colors.amberCss; // Yellow
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
        this._showNotification('OVERTIME!', CanvasTheme.colors.dangerCss, 150, 'First to gain advantage wins!');
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
        const accent = parseInt(color.replace('#', ''), 16);
        const panelW = Math.min(GAME_CONFIG.WIDTH - 40, Math.max(subtitle ? 320 : 220, title.length * 16));
        const panelH = subtitle ? 74 : 46;

        const banner = this.add.container(GAME_CONFIG.WIDTH / 2, yPosition);
        banner.setScrollFactor(0);
        banner.setDepth(100);

        const bg = this.add.graphics();
        CanvasTheme.panel(bg, -panelW / 2, -panelH / 2, panelW, panelH, {
            radius: 6,
            fill: CanvasTheme.colors.panelStrong,
            fillAlpha: 0.94,
            stroke: accent,
            strokeAlpha: 0.55,
            accent,
            accentAlpha: 0.9,
            shadowAlpha: 0.34,
            brackets: true,
            bracketColor: accent,
            bracketAlpha: 0.5,
            bracketLength: 8
        });
        banner.add(bg);

        const titleText = this.add.text(0, subtitle ? -6 : 0, title, {
            fontSize: subtitle ? '26px' : '21px',
            fill: color,
            fontFamily: CanvasTheme.fonts.display,
            fontStyle: 'bold',
            letterSpacing: 3,
            stroke: '#05080d',
            strokeThickness: 3
        }).setOrigin(0.5);
        banner.add(titleText);

        if (subtitle) {
            const subtitleText = this.add.text(0, 22, subtitle, {
                fontSize: '10px',
                fill: CanvasTheme.colors.textDim,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
            }).setOrigin(0.5);
            banner.add(subtitleText);
        }

        // Dramatic entrance animation
        banner.setScale(0);
        banner.setAlpha(0);
        this.tweens.add({
            targets: banner,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.out',
            onComplete: () => {
                this.time.delayedCall(subtitle ? 3000 : displayTime, () => {
                    this.tweens.add({
                        targets: banner,
                        alpha: 0,
                        duration: 700,
                        onComplete: () => banner.destroy()
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

        if (card.id === 'smoke_barrage') {
            // Specialized visual effect for smoke barrage
            this.createSmokeBarrageEffect(x, y, card.payload?.radius || 0, isPlayerCast);

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
            const radius = card.payload?.radius || 0;
            const totalDamage = card.payload?.damage || 0;
            const shellCount = 8;
            const damagePerShell = totalDamage / shellCount;

            // Specialized visual effect for artillery strike
            // We pass a callback to apply damage exactly when and where shells land
            this.createArtilleryStrikeEffect(x, y, radius, isPlayerCast, (impactX, impactY) => {
                this.applyAreaEffect(impactX, impactY, radius * 0.75, (target) => {
                    if (!shouldAffect(target)) return;
                    if (target.isMainTower && !target.activated) {
                        target.activated = true;
                    }
                    target.health = Math.max(0, target.health - damagePerShell);
                    this.combatSystem.updateHealthDisplay(target);
                });
            });

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
        // Resolve unit definition if card references a unitId
        const unitId = card.unitId || card.id;
        const unitDef = UNITS[unitId];

        // Resolve payload from card or unit definition
        const payload = card.payload || unitDef?.payload;

        // Create building graphics using GraphicsManager
        const building = this.graphicsManager.createBuildingGraphics(x, y, unitId, isPlayerOwned);

        // Set building properties
        building.buildingId = unitId;
        building.buildingDef = unitDef || card;
        building.type = unitId;
        building.health = (unitDef?.stats?.hp || card.stats?.hp) || 1000;
        building.maxHealth = (unitDef?.stats?.hp || card.stats?.hp) || 1000;
        building.isPlayerOwned = isPlayerOwned;
        building.lastShotTime = 0;
        building.target = null;
        building.lastTargetUpdate = 0;
        building.attackCooldown = 2000; // 2 seconds between attacks
        building.canShoot = !payload?.launchIntervalMs;
        building.canTargetAir = !!unitDef?.canTargetAir;
        building.canTargetGround = unitDef?.canTargetGround !== false;

        // Update statistics
        const stats = isPlayerOwned ? this.battleStats.player : this.battleStats.ai;
        stats.buildingsDeployed++;
        stats.energySpent += card.cost || 0;

        this.buildings.push(building);

        // Create health bar
        this.createBuildingHealthBar(building);

        // Set initial depth based on Y position
        building.setDepth(y);

        // For buildings with lifetime (like V1 launcher), calculate health decay rate
        if (payload?.lifetimeMs) {
            building.healthDecayPerMs = building.health / payload.lifetimeMs;
        }

        // For buildings that launch missiles automatically (like V1 launcher)
        if (payload?.launchIntervalMs) {
            const timer = this.time.addEvent({
                delay: payload.launchIntervalMs,
                loop: true,
                callback: () => {
                    if (!building.scene || building.health <= 0) { timer.remove(); return; }
                    for (let i = 0; i < (payload.missileCount || 1); i++) {
                        this.launchBuildingMissile(building, payload);
                    }
                }
            });
        }

        if (!isPlayerOwned) console.log('🤖 AI: Placed', card.name, 'at', Math.round(x), Math.round(y));
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
            ...this.tanks.filter(t => t.isPlayerTank !== isPlayerBuilding && t.health > 0
                && GameHelpers.canTarget(building, t)),
            ...this.buildings.filter(b => b.isPlayerOwned !== isPlayerBuilding && b.health > 0 && b !== building
                && GameHelpers.canTarget(building, b))
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
        missile.attacker = building;

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
                    ...this.tanks.filter(t => t.isPlayerTank !== missile.isPlayerMissile && t.health > 0
                        && GameHelpers.canTarget(missile.attacker, t)),
                    ...this.buildings.filter(b => b.isPlayerOwned !== missile.isPlayerMissile && b.health > 0
                        && GameHelpers.canTarget(missile.attacker, b))
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

            // Ground-launched warheads cannot reach aircraft
            if (missile.attacker && !GameHelpers.canTarget(missile.attacker, target)) return;

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
     * Creates a specialized smoke barrage visual effect with billowy clouds.
     */
    createSmokeBarrageEffect(x, y, radius, isPlayerCast) {
        console.log('💨 Smoke Barrage effect at', x, y, 'radius:', radius);

        const smokeColors = [0xd1d5db, 0xf9fafb, 0x9ca3af, 0xe5e7eb];
        const puffCount = 18;

        // Initial flash
        const flash = this.add.graphics();
        flash.fillStyle(0xffffff, 0.8);
        flash.fillCircle(x, y, radius * 0.5);
        flash.setDepth(1010);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 250,
            ease: 'Cubic.Out',
            onComplete: () => flash.destroy()
        });

        // Create smoke puffs
        for (let i = 0; i < puffCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.7;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;

            const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
            const puffRadius = 12 + Math.random() * 10;

            const puff = this.add.graphics();
            puff.fillStyle(color, 0.7);
            puff.fillCircle(0, 0, puffRadius);
            puff.setPosition(px, py);
            puff.setDepth(1000 + Math.floor(Math.random() * 5));
            puff.setScale(0.1);

            // Random movement for the puff
            const moveX = (Math.random() - 0.5) * 60;
            const moveY = (Math.random() - 0.5) * 60;

            this.tweens.add({
                targets: puff,
                x: px + moveX,
                y: py + moveY,
                scale: 2.5,
                alpha: 0,
                duration: 1500 + Math.random() * 1500,
                delay: Math.random() * 300,
                ease: 'Cubic.Out',
                onComplete: () => puff.destroy()
            });
        }

        // Add small debris particles for a bit of "pop"
        for (let i = 0; i < 12; i++) {
            const debris = this.add.graphics();
            debris.fillStyle(0x444444, 1);
            debris.fillRect(-2, -2, 4, 4);
            debris.setPosition(x, y);
            debris.setDepth(1006);

            const angle = Math.random() * Math.PI * 2;
            const dist = radius * (0.6 + Math.random() * 0.6);

            this.tweens.add({
                targets: debris,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                rotation: Math.PI * 2,
                alpha: 0,
                duration: 500 + Math.random() * 500,
                ease: 'Cubic.Out',
                onComplete: () => debris.destroy()
            });
        }

        // Add a central lingering cloud for area persistent feel
        const centralCloud = this.add.graphics();
        centralCloud.fillStyle(0xd1d5db, 0.4);
        centralCloud.fillCircle(x, y, radius);
        centralCloud.setDepth(999);
        centralCloud.setScale(0.5);
        centralCloud.alpha = 0;

        this.tweens.add({
            targets: centralCloud,
            scale: 1.1,
            alpha: 0.6,
            duration: 500,
            ease: 'Sine.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: centralCloud,
                    scale: 1.3,
                    alpha: 0,
                    duration: 2500,
                    ease: 'Sine.In',
                    onComplete: () => centralCloud.destroy()
                });
            }
        });
    }

    /**
     * Creates a specialized artillery strike visual effect with incoming shells and a massive explosion.
     * Synchronizes damage with impact using the onImpact callback.
     */
    createArtilleryStrikeEffect(x, y, radius, isPlayerCast, onImpact) {
        console.log('💥 Artillery Strike effect at', x, y, 'radius:', radius);

        // 1. Create incoming shells (staggered barrage) - Increased count and speed
        const shellCount = 8;

        // Find the central tower of the attacker
        const attackerMainTower = this.buildings.find(b => b.isMainTower && b.isPlayerOwned === isPlayerCast);

        for (let i = 0; i < shellCount; i++) {
            // Uniform distribution within the FULL radius
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * radius;

            // Ensure at least one shell (the last/biggest) hits near center
            const finalDist = (i === shellCount - 1) ? dist * 0.3 : dist;

            const dropX = x + Math.cos(angle) * finalDist;
            const dropY = y + Math.sin(angle) * finalDist;

            // Start from the central tower of the attacker
            let startX, startY;
            if (attackerMainTower) {
                startX = attackerMainTower.x;
                startY = attackerMainTower.y;
            } else {
                // Fallback to off-screen based on who is casting
                startY = isPlayerCast ? 900 : -100;
                startX = isPlayerCast ? dropX - 50 : dropX + 50;
            }

            const shell = this.add.graphics();
            // Draw a proper shell shape: pointed cylinder
            shell.fillStyle(0x222222, 1);
            shell.beginPath();
            shell.moveTo(-3, 0);
            shell.lineTo(3, 0);
            shell.lineTo(0, -10); // Pointed tip
            shell.closePath();
            shell.fill();
            shell.fillRect(-3, 0, 6, 8); // Body

            shell.setPosition(startX, startY);
            // Rotate to face the direction of travel
            const travelAngle = Math.atan2(dropY - startY, dropX - startX);
            shell.setRotation(travelAngle + Math.PI / 2);
            shell.setDepth(2000);

            const trail = this.add.graphics();
            trail.setDepth(1999);

            // FASTER timing: 80ms stagger, 350ms flight
            const delay = i * 80;

            this.tweens.add({
                targets: shell,
                x: dropX,
                y: dropY,
                duration: 350,
                delay: delay,
                ease: 'Cubic.In',
                onUpdate: () => {
                    trail.clear();
                    // Fade trail over time
                    const progress = (shell.y - startY) / (dropY - startY);
                    trail.lineStyle(2, 0xffcc33, 0.5 * (1 - Math.abs(progress)));
                    trail.lineBetween(startX, startY, shell.x, shell.y);
                },
                onComplete: () => {
                    shell.destroy();
                    trail.destroy();
                    // Each shell landing triggers its portion of the damage
                    if (onImpact) onImpact(dropX, dropY);

                    // Small impact for each shell, big one for the center/last
                    const isLast = (i === shellCount - 1);
                    this.executeArtilleryImpact(dropX, dropY, radius * 0.5, isLast);
                }
            });
        }
    }

    /**
     * Executes the visual impact of an artillery shell.
     */
    executeArtilleryImpact(x, y, radius, isLarge = false) {
        // Impact sound - play for all, but maybe vary?
        // Actually play explosion for all shells as it's a barrage
        this.playUISound('explosion');

        // Massive flash
        const flash = this.add.graphics();
        flash.fillStyle(0xffffff, isLarge ? 1.0 : 0.6);
        flash.fillCircle(x, y, radius * (isLarge ? 1.5 : 1.0));
        flash.setDepth(1015);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            onComplete: () => flash.destroy()
        });

        // Shockwave rings
        const ringCount = isLarge ? 3 : 1;
        for (let i = 0; i < ringCount; i++) {
            const ring = this.add.graphics();
            ring.lineStyle(isLarge ? 8 : 4, 0xffffff, 0.8);
            ring.strokeCircle(x, y, 10);
            ring.setDepth(1012);
            this.tweens.add({
                targets: ring,
                scaleX: (radius * 2) / 10,
                scaleY: (radius * 2) / 10,
                alpha: 0,
                duration: 600,
                delay: i * 100,
                ease: 'Expo.Out',
                onComplete: () => ring.destroy()
            });
        }

        // Fireballs
        const fireColors = [0xff4400, 0xff8800, 0xffcc00];
        const puffCount = isLarge ? 12 : 5;
        for (let i = 0; i < puffCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const fx = x + Math.cos(angle) * dist;
            const fy = y + Math.sin(angle) * dist;

            const puff = this.add.graphics();
            puff.fillStyle(fireColors[Math.floor(Math.random() * fireColors.length)], 0.9);
            const pSize = (isLarge ? 15 : 8) + Math.random() * (isLarge ? 25 : 12);
            puff.fillCircle(0, 0, pSize);
            puff.setPosition(x, y);
            puff.setDepth(1011);

            this.tweens.add({
                targets: puff,
                x: fx,
                y: fy,
                scale: 0.2,
                alpha: 0,
                duration: 800 + Math.random() * 400,
                ease: 'Quad.Out',
                onComplete: () => puff.destroy()
            });
        }

        // Debris particles
        const debrisCount = isLarge ? 20 : 8;
        for (let i = 0; i < debrisCount; i++) {
            const debris = this.add.graphics();
            debris.fillStyle(0x222222, 1);
            debris.fillRect(-2, -2, 4, 4);
            debris.setPosition(x, y);
            debris.setDepth(1013);

            const angle = Math.random() * Math.PI * 2;
            const dist = radius * (1.0 + Math.random() * 1.5);

            this.tweens.add({
                targets: debris,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                rotation: Math.PI * 4,
                alpha: 0,
                duration: 600 + Math.random() * 600,
                ease: 'Cubic.Out',
                onComplete: () => debris.destroy()
            });
        }

        // Lingering smoke for the final big blast
        if (isLarge) {
            const smoke = this.add.graphics();
            smoke.fillStyle(0x333333, 0.5);
            smoke.fillCircle(x, y, radius * 2);
            smoke.setDepth(1008);
            smoke.alpha = 0;
            this.tweens.add({
                targets: smoke,
                alpha: 0.7,
                duration: 250,
                onComplete: () => {
                    this.tweens.add({
                        targets: smoke,
                        scale: 1.4,
                        alpha: 0,
                        duration: 3000,
                        delay: 500,
                        ease: 'Sine.In',
                        onComplete: () => smoke.destroy()
                    });
                }
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
        const label = message.toUpperCase();
        const width = Math.max(210, label.length * 8 + 44);
        const banner = this.add.container(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 220);
        banner.setScrollFactor(0);
        banner.setDepth(2000);

        const bg = this.add.graphics();
        CanvasTheme.panel(bg, -width / 2, -17, width, 34, {
            radius: 6,
            fill: CanvasTheme.colors.panelStrong,
            fillAlpha: 0.94,
            stroke: CanvasTheme.colors.danger,
            strokeAlpha: 0.6,
            accent: CanvasTheme.colors.danger,
            accentAlpha: 0.9,
            shadowAlpha: 0.3,
            brackets: true,
            bracketColor: CanvasTheme.colors.danger,
            bracketAlpha: 0.45,
            bracketLength: 6
        });

        const text = this.add.text(0, 0, label, {
            fontSize: '11px',
            fill: CanvasTheme.colors.dangerCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 2
        }).setOrigin(0.5);

        banner.add([bg, text]);
        banner.setScale(0.94);

        this.tweens.add({
            targets: banner,
            alpha: 0,
            duration: 700,
            delay: 600,
            onComplete: () => banner.destroy()
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
            this.deploymentPreview.previewTank.setDepth(1000); // Higher than battlefield units
            // Face upward (toward enemy field)
            this.deploymentPreview.previewTank.setRotation(-Math.PI / 2);

            // Create range circle if tank has range
            const range = selectedCard.unitData?.stats?.range || 0;
            if (range > 0) {
                this.deploymentPreview.previewRangeCircle = this.add.graphics();
                this.deploymentPreview.previewRangeCircle.setDepth(1001);
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
            // Valid position and enough energy
            circleColor = CanvasTheme.colors.green;
            circleAlpha = 0.2;
        } else if (isValid && !hasEnoughEnergy) {
            // Valid position but not enough energy
            circleColor = CanvasTheme.colors.steelLight;
            circleAlpha = 0.14;
        } else {
            // Invalid position
            circleColor = CanvasTheme.colors.danger;
            circleAlpha = 0.16;
        }

        this.deploymentPreview.previewRangeCircle.lineStyle(1.5, circleColor, 0.75);
        this.deploymentPreview.previewRangeCircle.fillStyle(circleColor, circleAlpha);
        if (range > 0) {
            this.deploymentPreview.previewRangeCircle.fillCircle(worldX, worldY, range);
            this.deploymentPreview.previewRangeCircle.strokeCircle(worldX, worldY, range);
            // Inner hairline reads as a targeting reticle
            this.deploymentPreview.previewRangeCircle.lineStyle(1, circleColor, 0.35);
            this.deploymentPreview.previewRangeCircle.strokeCircle(worldX, worldY, Math.max(6, range * 0.5));
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

        // Refresh deployment zones when preview ends
        this.drawDeploymentZones();
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
        this.spellPreview.radiusCircle.setDepth(1002);

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

        // Refresh deployment zones when spell preview ends (card deselected)
        this.drawDeploymentZones();
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
     * @param {string} unitId - The unique unit identifier from UNITS.
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
        const unitData = UNITS[unitId];
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
        tank.isAir = !!unitData.isAir;
        tank.canTargetAir = !!unitData.canTargetAir;
        tank.canTargetGround = unitData.canTargetGround !== false;
        tank.healthDecayPerMs = GameHelpers.healthDecayPerMs(unitData);
        tank.expired = false;
        tank.target = null;
        tank.lastShotTime = 0;
        tank.lastTargetUpdate = 0;

        // Assign lane based on X position relative to battlefield center
        const offsetX = GameHelpers.getBattlefieldOffset();
        const relX = x - offsetX;
        tank.lane = (relX < GAME_CONFIG.WORLD_WIDTH / 2) ? 'left' : 'right';

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

        // Set initial depth based on Y position (aircraft stay above ground units)
        tank.setDepth(tank.isAir ? AIR_CONFIG.RENDER_DEPTH : y);

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

        // Set higher depth so health bars are above tanks
        healthBg.setDepth(1500);
        healthFill.setDepth(1501);

        this.updateTankHealth(tank);
    }

    createBuildingHealthBar(building) {
        // Use appropriate config based on building type
        const config = building.isMainTower || building.towerType ? UI_CONFIG.HEALTH_BARS.TOWER : UI_CONFIG.HEALTH_BARS.BUILDING;

        const baseOffsetY = this.computeTowerBaseOffsetY(building, config);

        const healthBg = this.add.graphics();
        healthBg.fillStyle(config.BACKGROUND_COLOR);
        healthBg.fillRect(
            building.x - config.OFFSET_X,
            building.y - baseOffsetY,
            config.WIDTH,
            config.HEIGHT
        );
        building.healthBg = healthBg;

        const healthFill = this.add.graphics();
        building.healthFill = healthFill;

        // Add health text (Simplified: just current health)
        // Overlapping with the bar (vertically centered on the bar)
        // Bar checks: y - baseOffsetY (top), height config.HEIGHT
        const barCenterY = building.y - baseOffsetY + (config.HEIGHT / 2);

        const healthText = this.add.text(
            building.x,
            barCenterY,
            `${Math.ceil(building.health)}`, {
            fontSize: '10px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.mono,
            stroke: '#05080d',
            strokeThickness: 2,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        building.healthText = healthText;

        // Set higher depth so health bars are above buildings
        healthBg.setDepth(1500);
        healthFill.setDepth(1501);
        healthText.setDepth(1502);

        this.updateBuildingHealth(building);
    }

    // For the player's tower, the health bar is too close to the top of the building graphic,
    // so we offset it further up for better visibility.
    computeTowerBaseOffsetY(building, config) {
        // With the new identical assets, we should use the same offset for both teams.
        // Previously Player was 30 (too high) and Enemy was 0 (too low/overlap).
        // Let's try an intermediate value.
        const offsetYAdjustment = building.isMainTower ? 20 : 0;
        const baseOffsetY = config.OFFSET_Y + offsetYAdjustment;
        return baseOffsetY;
    }

    updateTankHealth(tank) {
        const config = UI_CONFIG.HEALTH_BARS.TANK;
        const healthPercent = tank.health / tank.maxHealth;
        const baseOffsetY = this.computeTowerBaseOffsetY(tank, config);

        tank.healthFill.clear();

        // Use team colors: blue for player, red for enemy
        const healthColor = tank.isPlayerTank ? 0x2d7dd2 : 0xd22d2d;

        tank.healthFill.fillStyle(healthColor);
        tank.healthFill.fillRect(
            tank.x - config.OFFSET_X,
            tank.y - baseOffsetY,
            config.WIDTH * healthPercent,
            config.HEIGHT
        );
    }

    updateBuildingHealth(building) {
        // Use appropriate config based on building type
        const config = building.isMainTower || building.towerType ? UI_CONFIG.HEALTH_BARS.TOWER : (UI_CONFIG.HEALTH_BARS.BUILDING || UI_CONFIG.HEALTH_BARS.TANK);
        const healthPercent = building.health / building.maxHealth;

        const baseOffsetY = this.computeTowerBaseOffsetY(building, config);

        building.healthFill.clear();

        // Use team colors: blue for player, red for enemy
        const healthColor = building.isPlayerOwned ? 0x2d7dd2 : 0xd22d2d;

        building.healthFill.fillStyle(healthColor);
        building.healthFill.fillRect(
            building.x - config.OFFSET_X,
            building.y - baseOffsetY,
            config.WIDTH * healthPercent,
            config.HEIGHT
        );

        // Update health text
        if (building.healthText) {
            building.healthText.setText(`${Math.ceil(building.health)}`);
            building.healthText.setFill(CanvasTheme.colors.text);
        }
    }

    updateTankMovement(tank) {
        const isAir = GameHelpers.isAirUnit(tank);

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
            if (!isAir && Pathfinding.needsPathfinding(currentPos, targetPos)) {
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
                // (aircraft fly over the ground battle and ignore traffic)
                const avoidanceRadius = 40;
                let avoidanceX = 0;
                let avoidanceY = 0;

                if (!isAir) {
                    this.tanks.forEach(otherTank => {
                        if (otherTank === tank || otherTank.health <= 0) return;
                        if (otherTank.isAir) return; // don't swerve around aircraft

                        const otherDistance = GameHelpers.distance(tank.x, tank.y, otherTank.x, otherTank.y);
                        if (otherDistance < avoidanceRadius) {
                            // Calculate avoidance vector
                            const avoidAngle = GameHelpers.angle(otherTank.x, otherTank.y, tank.x, tank.y);
                            const avoidForce = (avoidanceRadius - otherDistance) / avoidanceRadius;
                            avoidanceX += Math.cos(avoidAngle) * avoidForce * 30;
                            avoidanceY += Math.sin(avoidAngle) * avoidForce * 30;
                        }
                    });
                }

                // Calculate movement direction towards waypoint
                const targetAngle = GameHelpers.angle(tank.x, tank.y, waypoint.worldX, waypoint.worldY);
                const deltaTime = (this.game.loop.delta / 1000) * (this.simulationSpeed || 1); // Time in seconds since last frame, scaled by simulation speed
                const baseSpeed = tank.unitData.stats.speed; // Assuming speed is in pixels per second

                // Apply movement with avoidance, scaled by delta time for frame-rate independence
                const moveX = (Math.cos(targetAngle) * baseSpeed + avoidanceX) * deltaTime;
                const moveY = (Math.sin(targetAngle) * baseSpeed + avoidanceY) * deltaTime;

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

            // Update tank depth to match its Y position for correct layering
            tank.setDepth(isAir ? AIR_CONFIG.RENDER_DEPTH : tank.y);
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
            tank.rangeCircle.setDepth(1200); // Above tanks
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
            'attack_helicopter', // Air harassment
            'bomber',           // Air win condition
            'flak_panzer',      // Anti-air defense
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
            this.aiStrategyText.setFill(CanvasTheme.colors.dangerCss);
        } else if (strategy.defensiveMode) {
            strategyText += 'DEF';
            this.aiStrategyText.setFill(CanvasTheme.colors.blueCss);
        } else {
            strategyText += strategy.mode.substring(0, 3).toUpperCase();
            this.aiStrategyText.setFill(CanvasTheme.colors.amberCss);
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

        const unitData = UNITS[unitId];

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
            const unitData = UNITS[unitId];
            return unitData && this.aiEnergy >= unitData.cost;
        });

        if (availableTanks.length === 0) {
            // Fallback to cheapest available unit
            availableTanks = this.aiDeck.filter(unitId => {
                const unitData = UNITS[unitId];
                return unitData && unitData.cost <= this.aiEnergy;
            });
        }

        // If still no units available, find the absolute cheapest unit
        if (availableTanks.length === 0) {
            // Get all valid unit IDs and find the cheapest one
            const allValidTanks = this.aiDeck.filter(unitId => UNITS[unitId]);
            if (allValidTanks.length > 0) {
                const cheapestTank = allValidTanks.reduce((cheapest, unitId) => {
                    const unitData = UNITS[unitId];
                    const cheapestData = UNITS[cheapest];
                    return unitData.cost < cheapestData.cost ? unitId : cheapest;
                });

                // If we can afford the cheapest unit, use it
                if (UNITS[cheapestTank] && this.aiEnergy >= UNITS[cheapestTank].cost) {
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
                const unitData = UNITS[unitId];
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
     * @param {Object} card - Card definition from CARDS
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    aiCastSpell(card, x, y) {
        this._castSpellInternal(card, x, y, false);
    }

    /**
     * AI places a building at the specified position
     * @param {Object} card - Card definition from CARDS
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    aiPlaceBuilding(card, x, y) {
        this._placeBuildingInternal(card, x, y, false);
    }

    /**
     * AI deploys a swarm of units
     * @param {Object} card - Card definition from CARDS
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    aiDeploySwarm(card, x, y) {
        const unitId = card.unitId || (card.payload && card.payload.unitId);
        const unitData = UNITS[unitId];
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

    update(time, delta) {
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
                // Units with a limited lifetime (e.g. the Wirbelwind) wear out
                if (tank.healthDecayPerMs) {
                    tank.health = Math.max(0, tank.health - tank.healthDecayPerMs * delta);
                    this.updateTankHealth(tank);
                    if (tank.health <= 0) tank.expired = true;
                }

                if (tank.health > 0) {
                    this.updateTankMovement(tank);
                    this.combatSystem.checkTankCombat(tank);
                }
            }
        });

        // Update base defenses and deployed buildings
        this.buildings.forEach(building => {
            if (building.health > 0) {
                // Apply health decay for buildings with lifetime
                if (building.healthDecayPerMs) {
                    building.health -= building.healthDecayPerMs * delta;
                    this.updateBuildingHealth(building);
                }

                if (building.isMainTower || building.towerType) {
                    // Base towers use tower AI
                    this.updateBaseDefense(building);
                    this.combatSystem.checkBaseCombat(building);
                } else {
                    // Deployed buildings use building AI - skip if they handle their own attacks (like V1)
                    if (!building.buildingDef?.payload?.launchIntervalMs) {
                        this.updateBuildingAI(building);
                        this.combatSystem.checkBaseCombat(building);
                    }
                }
            }
        });

        // Remove destroyed buildings
        this.buildings = this.buildings.filter(building => {
            if (building.health <= 0) {
                // If it's a tower, handle tower destruction system
                if (GameHelpers.isActualTower(building)) {
                    this.destroyTower(building);
                } else {
                    // For regular buildings (like V1 Launcher), handle visual destruction
                    this.combatSystem.showExplosionEffect(building.x, building.y, 1.5);
                    this.playUISound('explosion');

                    // Clean up UI elements
                    if (building.healthBg) building.healthBg.destroy();
                    if (building.healthFill) building.healthFill.destroy();
                    if (building.healthText) building.healthText.destroy();
                    building.destroy();
                }
                return false;
            }
            return true;
        });

        // Remove destroyed tanks
        this.tanks = this.tanks.filter(tank => {
            if (tank.health <= 0) {
                // Track tank destruction statistics
                if (tank.isPlayerTank) {
                    this.battleStats.player.tanksLost++;
                    // AI gets credit for destroying player tank (not for expiry)
                    if (!tank.expired) this.battleStats.ai.tanksDestroyed++;
                } else {
                    this.battleStats.ai.tanksLost++;
                    // Player gets credit for destroying AI tank (not for expiry)
                    if (!tank.expired) this.battleStats.player.tanksDestroyed++;
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
        // Always start from a legal deck (the deck screen may have changed it)
        this.deck = GameHelpers.sanitizeDeck(this.deck);
        this.hand = [];
        this.shuffleDeck();

        const handSize = Math.min(DECK_CONFIG.HAND_SIZE, this.deck.length);
        for (let i = 0; i < handSize; i++) {
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
        const def = CARDS[cardId];
        const unitData = def.type === CARD_TYPES.TROOP ? UNITS[def.unitId || (def.payload && def.payload.unitId)] : null;

        // Destroy old tank icon and create new one
        if (card.tankIcon) {
            card.tankIcon.destroy();
        }

        // Create new tank icon with the same layout metrics as the initial hand
        // so cards drawn later do not shrink or drift on tall screens.
        const { cardWidth, scaleFactor, iconOffsetY } = this.getCardLayoutMetrics();
        const cardX = card.x;
        const cardY = card.y;
        card.tankIcon = this.graphicsManager.createMiniCardGraphics(
            cardX + cardWidth / 2,
            cardY + iconOffsetY,
            cardId
        );
        card.tankIcon.setScale(scaleFactor);

        // Rotate troop cards to face upward (enemy field direction)
        // Skip rotation for image-based cards which are already oriented for the UI
        if (def.type === CARD_TYPES.TROOP && !card.tankIcon.isImageCard) {
            card.tankIcon.setRotation(-Math.PI / 2); // -90 degrees = upward
        }

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
        const config = this.energyBarConfig;

        // Flash the energy cells red with a temporary overlay (the base bar is untouched)
        if (config) {
            const flash = this.add.graphics();
            flash.setScrollFactor(0);
            flash.setDepth(1001);
            flash.fillStyle(CanvasTheme.colors.dangerDeep, 0.32);
            flash.lineStyle(1, CanvasTheme.colors.danger, 0.85);
            for (let i = 0; i < this.maxEnergy; i++) {
                const sx = config.x + i * (config.squareSize + config.spacing);
                flash.fillRoundedRect(sx, config.y, config.squareSize, config.squareSize, 3);
                flash.strokeRoundedRect(sx, config.y, config.squareSize, config.squareSize, 3);
            }
            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 900,
                ease: 'Power2',
                onComplete: () => flash.destroy()
            });
        }

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
            }
        });

        const panelW = 300;
        const panelH = 136;
        const banner = this.add.container(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 10);
        banner.setScrollFactor(0);
        banner.setDepth(100);

        const bg = this.add.graphics();
        CanvasTheme.panel(bg, -panelW / 2, -panelH / 2, panelW, panelH, {
            radius: 8,
            fill: CanvasTheme.colors.panelStrong,
            fillAlpha: 0.97,
            stroke: CanvasTheme.colors.danger,
            strokeAlpha: 0.55,
            accent: CanvasTheme.colors.danger,
            accentAlpha: 0.9,
            shadowAlpha: 0.4,
            brackets: true,
            bracketColor: CanvasTheme.colors.danger,
            bracketAlpha: 0.4,
            bracketLength: 10
        });
        // Alert header band
        bg.fillStyle(CanvasTheme.colors.danger, 0.12);
        bg.fillRoundedRect(-panelW / 2 + 1, -panelH / 2 + 1, panelW - 2, 32, 7);
        CanvasTheme.rule(bg, -panelW / 2 + 14, -panelH / 2 + 33, panelW / 2 - 14, -panelH / 2 + 33, CanvasTheme.colors.line, 0.18);

        const eyebrow = this.add.text(-panelW / 2 + 16, -panelH / 2 + 7, 'SYS ALERT', {
            fontSize: '7px',
            fill: CanvasTheme.colors.dangerCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        });

        const title = this.add.text(0, -panelH / 2 + 20, 'INSUFFICIENT ENERGY', {
            fontSize: '19px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 2
        }).setOrigin(0.5);

        const detail = this.add.text(0, -12,
            `${displayName} requires ${cost} energy\n` +
            `AVAILABLE ${this.energy}   ·   SHORT ${energyNeeded}`, {
            fontSize: '10px',
            fill: CanvasTheme.colors.textDim,
            fontFamily: CanvasTheme.fonts.mono,
            align: 'center',
            lineSpacing: 5,
            letterSpacing: 1
        }).setOrigin(0.5);

        // Energy regeneration timing info
        const regenRate = this.getEnergyRegenDelay() / 1000; // Convert to seconds
        const timeToEnergy = Math.ceil(energyNeeded * regenRate);
        const regen = this.add.text(0, 35,
            `CELL ${regenRate}s  ·  FULL CHARGE ~${timeToEnergy}s`, {
            fontSize: '8px',
            fill: CanvasTheme.colors.faint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0.5);

        banner.add([bg, eyebrow, title, detail, regen]);
        banner.setAlpha(0);
        banner.y += 10;

        this.tweens.add({
            targets: banner,
            alpha: 1,
            y: banner.y - 10,
            duration: 260,
            ease: 'Back.out'
        });

        this.tweens.add({
            targets: banner,
            alpha: 0,
            y: banner.y - 16,
            duration: 500,
            delay: 1800,
            ease: 'Power2',
            onComplete: () => banner.destroy()
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
        // We check if the pointer is below the battlefield or in the card area
        const cardsAreaY = Math.min(GAME_CONFIG.WORLD_HEIGHT + 5, GAME_CONFIG.HEIGHT - 140);
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
        const baseRange = base.range || (base.isMainTower ? UNITS.main_tower.stats.range : UNITS.side_tower.stats.range);

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
                    if (!GameHelpers.canTarget(base, enemy)) return;
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
                    if (!GameHelpers.canTarget(base, enemy)) return;
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
                    if (!GameHelpers.canTarget(building, enemy)) return;
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
                    if (!GameHelpers.canTarget(building, enemy)) return;
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
        const { cardWidth, cardHeight, scaleFactor } = this.getCardLayoutMetrics();
        const cardCenterX = card.x + cardWidth / 2;
        const cardCenterY = card.y + cardHeight / 2;
        selectionPulse.lineStyle(2, CanvasTheme.colors.accent, 0.8);
        selectionPulse.strokeCircle(cardCenterX, cardCenterY, 55 * scaleFactor);

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
        const costVal = card.cardDef?.cost;
        const canAfford = typeof costVal === 'number' ? (this.energy >= costVal) : true;
        let actionLabel;
        let infoText;
        if (isTroop) {
            actionLabel = 'DEPLOY';
            infoText = canAfford
                ? `${displayName} - TAP A VALID TILE TO DEPLOY`
                : `${displayName} - NEED ${costVal - this.energy} MORE ENERGY`;
        } else if (card.cardType === CARD_TYPES.SPELL) {
            actionLabel = 'CAST';
            infoText = canAfford
                ? `${displayName} - TAP A TARGET TO CAST`
                : `${displayName} - NEED ${costVal - this.energy} MORE ENERGY`;
        } else {
            actionLabel = 'PLACE';
            infoText = canAfford
                ? `${displayName} - TAP A VALID TILE TO PLACE`
                : `${displayName} - NEED ${costVal - this.energy} MORE ENERGY`;
        }

        const accent = canAfford ? CanvasTheme.colors.green : CanvasTheme.colors.danger;
        const accentCss = canAfford ? CanvasTheme.colors.greenCss : CanvasTheme.colors.dangerCss;
        const panelW = 300;
        const panelH = 34;
        const panelX = GAME_CONFIG.WIDTH / 2 - panelW / 2;
        const panelY = GAME_CONFIG.HEIGHT - 197;

        // Feedback panel
        const feedbackBg = this.add.graphics();
        CanvasTheme.panel(feedbackBg, panelX, panelY, panelW, panelH, {
            radius: 6,
            fill: CanvasTheme.colors.panelStrong,
            fillAlpha: 0.94,
            stroke: accent,
            strokeAlpha: 0.45,
            accent,
            accentAlpha: 0.85,
            shadowAlpha: 0.3,
            brackets: true,
            bracketColor: accent,
            bracketAlpha: 0.35,
            bracketLength: 6
        });

        // Small action chip on the left
        CanvasTheme.chip(feedbackBg, panelX + 9, panelY + 9, 50, 16, accent, { fillAlpha: 0.18, strokeAlpha: 0.55 });
        const actionText = this.add.text(panelX + 34, panelY + 17, actionLabel, {
            fontSize: '7px',
            fill: accentCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            letterSpacing: 1
        }).setOrigin(0.5);

        const feedbackText = this.add.text(panelX + 68, panelY + 17, infoText, {
            fontSize: '9px',
            fill: accentCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0, 0.5);

        feedbackBg.setScrollFactor(0);
        feedbackBg.setDepth(49);
        actionText.setScrollFactor(0);
        actionText.setDepth(50);
        feedbackText.setScrollFactor(0);
        feedbackText.setDepth(50);

        // Fade out feedback after 2 seconds
        this.tweens.add({
            targets: [feedbackBg, actionText, feedbackText],
            alpha: 0,
            duration: 800,
            delay: 1500,
            ease: 'Power2',
            onComplete: () => {
                feedbackBg.destroy();
                actionText.destroy();
                feedbackText.destroy();
            }
        });

        // Play selection sound
        this.playUISound('select');
    }

    /**
     * Handles visual and logic updates when a main tower is activated
     * @param {Object} tower - The tower that was activated
     */
    onTowerActivated(tower) {
        if (!tower || !tower.active) return;

        // Visual feedback - pop animation
        this.tweens.add({
            targets: tower,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut'
        });

        // Add a permanent glow effect or indicator
        const glowColor = tower.isPlayerOwned ? 0x60a5fa : 0xf87171;

        // Brief activation flash
        const flash = this.add.graphics();
        flash.fillStyle(glowColor, 0.6);
        flash.fillCircle(0, 0, 60);
        tower.addAt(flash, 0);
        flash.setDepth(-1);

        this.tweens.add({
            targets: flash,
            scaleX: 2.5,
            scaleY: 2.5,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });

        // Pulsing active beacon ring around the base of the activated tower
        const beaconRing = this.add.graphics();
        beaconRing.lineStyle(2, glowColor, 0.7);
        beaconRing.strokeCircle(0, 0, 42);
        tower.addAt(beaconRing, 0);

        this.tweens.add({
            targets: beaconRing,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Small indicator light that stays on
        const light = this.add.graphics();
        light.fillStyle(glowColor, 0.8);
        light.fillCircle(tower.isMainTower ? 25 : 15, -20, 4);
        tower.add(light);

        // Pulse the light
        this.tweens.add({
            targets: light,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Show activation alert notification
        const towerOwner = tower.isPlayerOwned ? 'PLAYER' : 'ENEMY';
        this._showNotification(`${towerOwner} MAIN TOWER ACTIVATED!`, tower.isPlayerOwned ? CanvasTheme.colors.blueCss : CanvasTheme.colors.dangerCss, 160);

        // Update UI
        this.updateTowerStatusDisplay();
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

        // When a side tower is destroyed, the friendly Main (King) Tower awakens
        if (!tower.isMainTower) {
            const friendlyMainTower = this.buildings.find(b =>
                b.isPlayerOwned === tower.isPlayerOwned &&
                b.isMainTower &&
                b.health > 0
            );
            if (friendlyMainTower && !friendlyMainTower.activated) {
                friendlyMainTower.activated = true;
                if (this.onTowerActivated) {
                    this.onTowerActivated(friendlyMainTower);
                }
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
        // The "pocket" - includes bridge and extends to near the destroyed tower
        // River/bridge is at rows 16-17
        // Enemy side towers are at tileY=6, Player side towers are at tileY=27
        let expandedArea;
        if (isPlayer) {
            // Player destroyed an enemy tower → Player gets the "pocket" on enemy side
            // Extends from row 8 (near enemy tower at row 6) through the bridge (rows 16-17)
            // This creates a deployment zone from enemy territory through the bridge
            expandedArea = {
                tileX: sideStartCol,
                tileY: 8, // Start near enemy side tower (which is at row 6)
                tilesWidth: sideEndCol - sideStartCol + 1,
                tilesHeight: 10 // Rows 8-17 (includes territory up to and including the bridge)
            };
        } else {
            // AI destroyed a player tower → AI gets the "pocket" on player side
            // Extends from bridge (rows 16-17) down to row 25 (near player tower at row 27)
            expandedArea = {
                tileX: sideStartCol,
                tileY: 16, // Start at the bridge
                tilesWidth: sideEndCol - sideStartCol + 1,
                tilesHeight: 10 // Rows 16-25 (includes bridge and toward player tower)
            };
        }

        // Add this expanded area to the list
        this.expandedDeploymentZones[team].expandedAreas.push(expandedArea);

        // Add a transition to animate the "shrinking" of the invalid zone
        const transition = {
            area: expandedArea,
            progress: 0
        };
        this.zoneExpansionTransitions.push(transition);

        // Animate the progression (clearing the red area)
        this.tweens.add({
            targets: transition,
            progress: 1,
            duration: 600, // Fast animation as requested
            ease: 'Cubic.Out',
            onUpdate: () => {
                this.drawDeploymentZones();
            },
            onComplete: () => {
                // Keep the transition state but it's now fully valid
            }
        });

        // Redraw immediately to start animation
        this.drawDeploymentZones();
    }

    highlightExpandedDeploymentArea(team, expandedArea) {
        // This is now replaced by the self-shrinking animation logic
        // in drawDeploymentZones + expansionTransitions
    }

    showTowerDestroyedNotification(tower) {
        const isPlayerTower = tower.isPlayerOwned;
        const towerName = tower.isMainTower ? 'MAIN TOWER' :
            tower.towerType === 'left' ? 'LEFT TOWER' : 'RIGHT TOWER';
        const message = `${isPlayerTower ? 'PLAYER' : 'ENEMY'} ${towerName} DESTROYED!`;
        const color = isPlayerTower ? CanvasTheme.colors.dangerCss : CanvasTheme.colors.greenCss;
        this._showNotification(message, color, 200);
    }

    checkTowerVictoryConditions() {
        // Main tower destroyed = immediate victory/defeat
        if (this.towerStats.player.mainTowerDestroyed) {
            this.endBattle('victory', 'Enemy Main Tower Destroyed!'); // Player destroyed enemy main tower
            return;
        }
        if (this.towerStats.enemy.mainTowerDestroyed) {
            this.endBattle('defeat', 'Your Main Tower Destroyed!'); // Enemy destroyed player main tower
            return;
        }

        // During overtime, any tower destruction ends the game immediately
        if (this.overtimeActive) {
            const playerTowersDestroyed = this.towerStats.player.towersDestroyed;
            const enemyTowersDestroyed = this.towerStats.enemy.towersDestroyed;

            if (playerTowersDestroyed > enemyTowersDestroyed) {
                this.endBattle('victory', 'Sudden Death Victory!');
                return;
            } else if (enemyTowersDestroyed > playerTowersDestroyed) {
                this.endBattle('defeat', 'Sudden Death Defeat!');
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
            this.endBattle('victory', 'Time Limit: You destroyed more towers!');
        } else {
            console.log(`❌ Result: DEFEAT (Enemy destroyed more: ${enemyTowersDestroyed} > ${playerTowersDestroyed})`);
            console.log('═══════════════════════════════════════════════════════');
            this.endBattle('defeat', 'Time Limit: Enemy destroyed more towers!');
        }
    }

    destroyBuilding(building) {
        // Create massive destruction animation for base
        const x = building.x;
        const y = building.y;

        // Multiple large explosions - reduced from 5 to 3
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 200, () => {
                const offsetX = GameHelpers.randomInt(-20, 20); // Reduced spread
                const offsetY = GameHelpers.randomInt(-20, 20);

                const explosion = this.add.graphics();
                explosion.fillStyle(0xff3300, 0.8);
                explosion.fillCircle(x + offsetX, y + offsetY, 30); // Reduced from 40
                explosion.lineStyle(4, 0xffaa00);
                explosion.strokeCircle(x + offsetX, y + offsetY, 30);

                this.tweens.add({
                    targets: explosion,
                    alpha: 0,
                    scaleX: 3, // Reduced from 5
                    scaleY: 3,
                    duration: 600, // Faster
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

    endBattle(result, reason = '') {
        // Prevent multiple calls to endBattle
        if (this.battleEnded) return;
        this.battleEnded = true;

        console.log('═══════════════════════════════════════════════════════');
        console.log(`🏁 END BATTLE: ${result.toUpperCase()}`);
        console.log(`📝 REASON: ${reason}`);
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
            this.buildings,
            reason
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

        const W = GAME_CONFIG.WIDTH;
        const H = GAME_CONFIG.HEIGHT;

        // Dim the battlefield without hiding it
        this.pauseOverlay = this.add.graphics();
        this.pauseOverlay.fillStyle(CanvasTheme.colors.ink, 0.5);
        this.pauseOverlay.fillRect(0, 0, W, H);
        this.pauseOverlay.setScrollFactor(0);
        this.pauseOverlay.setDepth(90);

        // Compact command banner near the top
        const panelW = 260;
        const panelH = 70;
        const banner = this.add.container(W / 2, 66);
        banner.setScrollFactor(0);
        banner.setDepth(91);

        const bg = this.add.graphics();
        CanvasTheme.panel(bg, -panelW / 2, -panelH / 2, panelW, panelH, {
            radius: 7,
            fill: CanvasTheme.colors.panelStrong,
            fillAlpha: 0.96,
            stroke: CanvasTheme.colors.amber,
            strokeAlpha: 0.42,
            accent: CanvasTheme.colors.amber,
            accentAlpha: 0.9,
            shadowAlpha: 0.34,
            brackets: true,
            bracketColor: CanvasTheme.colors.amber,
            bracketAlpha: 0.4,
            bracketLength: 8
        });
        CanvasTheme.rule(bg, -panelW / 2 + 16, 6, panelW / 2 - 16, 6, CanvasTheme.colors.line, 0.18);

        const title = this.add.text(0, -9, 'SIMULATION PAUSED', {
            fontSize: '19px',
            fill: CanvasTheme.colors.text,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 3
        }).setOrigin(0.5);

        const sub = this.add.text(0, 18, 'PRESS RESUME TO CONTINUE', {
            fontSize: '8px',
            fill: CanvasTheme.colors.muted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setOrigin(0.5);

        banner.add([bg, title, sub]);
        this.pauseBanner = banner;

        // Subtle pulse on the banner accent
        this.pauseTween = this.tweens.add({
            targets: banner,
            alpha: { from: 0.85, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
    }

    hidePauseOverlay() {
        if (this.pauseTween) {
            this.pauseTween.stop();
            this.pauseTween = null;
        }
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
            this.pauseOverlay = null;
        }
        if (this.pauseBanner) {
            this.pauseBanner.destroy();
            this.pauseBanner = null;
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

        // Recreate all game entities
        this.recreateAllGameEntities();
    }

    recreateAllGameEntities() {
        // Recreate Tanks
        this.tanks.forEach(tank => {
            if (tank.health > 0) {
                this.graphicsManager.createTankGraphics(
                    tank.x,
                    tank.y,
                    tank.unitData.unitType,
                    tank.isPlayerTank,
                    tank.unitData.id,
                    tank
                );
            }
        });

        // Recreate Buildings and Towers
        this.buildings.forEach(building => {
            if (building.health > 0) {
                if (building.towerType) {
                    this.graphicsManager.createTowerGraphics(
                        building.x,
                        building.y,
                        building.isPlayerOwned,
                        building.isMainTower,
                        building
                    );
                } else {
                    this.graphicsManager.createBuildingGraphics(
                        building.x,
                        building.y,
                        building.buildingId,
                        building.isPlayerOwned,
                        building
                    );
                }
            }
        });

        // Recreate Tank Card Icons in hand
        const { cardWidth, scaleFactor, iconOffsetY } = this.getCardLayoutMetrics();
        this.tankCards.forEach((card) => {
            const cardId = card.cardId;
            const tankIcon = card.tankIcon;
            if (tankIcon) {
                // Re-draw the card icon using the same layout as createTankCards
                this.graphicsManager.createMiniCardGraphics(
                    card.x + cardWidth / 2,
                    card.y + iconOffsetY,
                    cardId,
                    tankIcon
                );

                // Re-apply scale
                tankIcon.setScale(scaleFactor);

                // Re-apply rotation for troop types in graphics mode
                const cardDef = CARDS[cardId];
                if (cardDef.type === CARD_TYPES.TROOP && !tankIcon.isImageCard) {
                    tankIcon.setRotation(-Math.PI / 2); // -90 degrees = upward
                } else {
                    tankIcon.setRotation(0); // Reset for image cards
                }
            }
        });

        // Recreate Deployment Preview Tank
        if (this.deploymentPreview && this.deploymentPreview.previewTank) {
            const previewTank = this.deploymentPreview.previewTank;
            const unitId = this.deploymentPreview.unitType;
            this.graphicsManager.createTankGraphics(
                previewTank.x,
                previewTank.y,
                unitId,
                true,
                unitId,
                previewTank
            );
            // Set alpha for preview
            previewTank.setAlpha(0.5);
        }
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
            const label = row.toString().padStart(2, '0');

            // Left side row number
            const leftLabel = this.add.text(offsetX - 20, y, label, {
                fontSize: '9px',
                fill: CanvasTheme.colors.muted,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
            }).setOrigin(1, 0.5);
            leftLabel.setDepth(1000);
            leftLabel.setScrollFactor(0);

            // Right side row number
            const rightLabel = this.add.text(offsetX + GAME_CONFIG.WORLD_WIDTH + 20, y, label, {
                fontSize: '9px',
                fill: CanvasTheme.colors.muted,
                fontFamily: CanvasTheme.fonts.mono,
                letterSpacing: 1
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
