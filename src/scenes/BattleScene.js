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
        this.selectedTank = null;
        this.cameraSpeed = 5;
        // Only deployment mode - Clash Royale style
        
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
        
        // Card deck system
        this.deck = [...this.gameState.player.tanks]; // Copy player's tanks
        this.hand = [];
        this.nextCardIndex = 0;
        this.initializeDeck();
    }

    create() {
        // Initialize battle start time for statistics
        this.battleStats.battle.startTime = this.time.now;
        
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

        // Input handling
        this.input.on('pointerdown', this.onBattlefieldClick, this);
        
        // No camera controls needed - fixed view like Clash Royale
        // Only deployment mode - no manual tank movement
    }

    createBattlefield() {
        // Calculate offset to center the battlefield horizontally
        const offsetX = (GAME_CONFIG.WIDTH - GAME_CONFIG.WORLD_WIDTH) / 2;
        
        // Set world bounds to match the actual battlefield size
        this.physics.world.setBounds(offsetX, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
        
        // Create tile-based grid (Clash Royale style)
        const graphics = this.add.graphics();
        
        // Draw tile grid
        graphics.lineStyle(1, 0x556b2f, 0.2);
        
        // Vertical tile lines
        for (let tileX = 0; tileX <= GAME_CONFIG.TILES_X; tileX++) {
            const x = offsetX + tileX * GAME_CONFIG.TILE_SIZE;
            graphics.lineBetween(x, 0, x, GAME_CONFIG.TILES_Y * GAME_CONFIG.TILE_SIZE);
        }
        
        // Horizontal tile lines
        for (let tileY = 0; tileY <= GAME_CONFIG.TILES_Y; tileY++) {
            const y = tileY * GAME_CONFIG.TILE_SIZE;
            graphics.lineBetween(offsetX, y, offsetX + GAME_CONFIG.TILES_X * GAME_CONFIG.TILE_SIZE, y);
        }

        // Center line to divide battlefield - at row 21.5 (between rows 21 and 22)
        graphics.lineStyle(3, 0x888888, 0.8);
        const centerY = 21.5 * GAME_CONFIG.TILE_SIZE;
        graphics.lineBetween(offsetX, centerY, offsetX + GAME_CONFIG.WORLD_WIDTH, centerY);

        // Deployment zones with tile-based boundaries
        const playerZone = GameHelpers.getDeploymentZoneWorldCoords(true);
        const enemyZone = GameHelpers.getDeploymentZoneWorldCoords(false);
        
        // Player zone (bottom) - coordinates already include offset
        graphics.lineStyle(3, 0x4a90e2, 0.6);
        graphics.fillStyle(0x4a90e2, 0.1);
        graphics.fillRect(playerZone.x, playerZone.y, playerZone.width, playerZone.height);
        graphics.strokeRect(playerZone.x, playerZone.y, playerZone.width, playerZone.height);
        
        // Add player zone label
        this.add.text(GAME_CONFIG.WIDTH / 2, playerZone.y + 20, 'DEPLOYMENT ZONE', {
            fontSize: '14px',
            fill: '#4a90e2',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Enemy zone (top) - coordinates already include offset
        graphics.lineStyle(3, 0xd22d2d, 0.6);
        graphics.fillStyle(0xd22d2d, 0.1);
        graphics.fillRect(enemyZone.x, enemyZone.y, enemyZone.width, enemyZone.height);
        graphics.strokeRect(enemyZone.x, enemyZone.y, enemyZone.width, enemyZone.height);

        // Add river and bridges
        this.createRiverAndBridges(graphics, offsetX);
    }

    createRiverAndBridges(graphics, offsetX = 0) {
        // River parameters - rows 21-22
        const riverTopY = 21 * GAME_CONFIG.TILE_SIZE;
        const riverBottomY = 22 * GAME_CONFIG.TILE_SIZE;
        const riverHeight = riverBottomY - riverTopY + GAME_CONFIG.TILE_SIZE;
        const riverWidth = GAME_CONFIG.WORLD_WIDTH;

        // Draw river
        graphics.fillStyle(0x4169e1, 0.6); // Royal blue for water
        graphics.fillRect(offsetX, riverTopY, riverWidth, riverHeight);
        
        // River borders
        graphics.lineStyle(2, 0x1e3a8a, 0.8); // Darker blue borders
        graphics.lineBetween(offsetX, riverTopY, offsetX + riverWidth, riverTopY);
        graphics.lineBetween(offsetX, riverBottomY + GAME_CONFIG.TILE_SIZE, offsetX + riverWidth, riverBottomY + GAME_CONFIG.TILE_SIZE);

        // Bridge spans columns 6-11
        const bridgeLeftX = offsetX + 6 * GAME_CONFIG.TILE_SIZE;
        const bridgeRightX = offsetX + 11 * GAME_CONFIG.TILE_SIZE;
        const bridgeWidth = bridgeRightX - bridgeLeftX + GAME_CONFIG.TILE_SIZE;
        
        // Bridge deck
        graphics.fillStyle(0x8b4513, 1.0); // Brown bridge
        graphics.fillRect(bridgeLeftX, riverTopY, bridgeWidth, riverHeight);
        
        // Bridge borders
        graphics.lineStyle(2, 0x654321);
        graphics.strokeRect(bridgeLeftX, riverTopY, bridgeWidth, riverHeight);
        
        // Bridge supports
        graphics.fillStyle(0x654321);
        for (let i = 0; i < 4; i++) {
            const supportX = bridgeLeftX + (i + 1) * bridgeWidth / 5;
            graphics.fillRect(supportX - 2, riverTopY, 4, riverHeight);
        }

        // Add river label
        this.add.text(offsetX + GAME_CONFIG.WORLD_WIDTH / 2, riverTopY + riverHeight / 2, 'RIVER', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000080',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Add bridge label
        this.add.text(bridgeLeftX + bridgeWidth / 2, riverTopY + riverHeight / 2, 'BRIDGE', {
            fontSize: '12px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#654321',
            strokeThickness: 1
        }).setOrigin(0.5);
    }

    createUI() {
        // Redesigned UI layout: Base at y=680, Cards below it, Energy bar at bottom
        
        // Remove old UI background - we'll position elements individually
        
        // Tank cards positioned below the base
        this.createTankCards();

        // Energy bar positioned at the very bottom, centered
        this.createEnergyBar();
        
        // Timer in top right corner
        this.createTimer();

        // No mode indicator needed - always deployment in Clash Royale style

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
        const cardsY = GAME_CONFIG.WORLD_HEIGHT + 10; // 10px margin below battlefield
        const cardWidth = 80;
        const cardHeight = 60;
        const cardSpacing = 90;
        const totalWidth = (4 * cardSpacing) - (cardSpacing - cardWidth); // Account for spacing
        const startX = (GAME_CONFIG.WIDTH - totalWidth) / 2; // Center horizontally

        this.tankCards = [];
        
        // Create 4 cards from hand
        for (let index = 0; index < 4; index++) {
            const tankId = this.hand[index];
            const tankData = TANK_DATA[tankId];
            const cardX = startX + index * cardSpacing;

            // Card background
            const card = this.add.image(cardX, cardsY, 'card_bg')
                .setDisplaySize(cardWidth, cardHeight)
                .setInteractive()
                .setOrigin(0);
            card.setScrollFactor(0);

            // Tank icon - create miniature version of actual tank
            const tankIcon = this.createMiniTankGraphics(cardX + cardWidth/2, cardsY + 20, tankData.type);
            tankIcon.setScale(0.6);
            card.tankIcon = tankIcon;

            // Cost
            const costText = this.add.text(cardX + cardWidth - 5, cardsY + cardHeight - 5, tankData.cost, {
                fontSize: '12px',
                fill: '#ffff00',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(1);
            costText.setScrollFactor(0);

            // Card name (small text)
            const nameText = this.add.text(cardX + cardWidth/2, cardsY + 45, tankData.name, {
                fontSize: '9px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            nameText.setScrollFactor(0);

            // Selection border (initially hidden)
            const selectionBorder = this.add.graphics();
            selectionBorder.lineStyle(3, 0xffff00);
            selectionBorder.strokeRect(cardX - 2, cardsY - 2, cardWidth + 4, cardHeight + 4);
            selectionBorder.setVisible(false);
            selectionBorder.setScrollFactor(0);

            // Store references
            card.index = index;
            card.tankId = tankId;
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
                this.showCardTooltip(index, cardX + cardWidth/2, cardsY - 10);
            });

            card.on('pointerout', () => {
                if (index !== this.selectedCard) {
                    card.clearTint();
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
        const barWidth = 200;
        const barHeight = 16;
        const barX = (GAME_CONFIG.WIDTH - barWidth) / 2;

        // Energy bar background
        this.energyBarBg = this.add.graphics();
        this.energyBarBg.fillStyle(0x333333);
        this.energyBarBg.fillRect(barX, energyY, barWidth, barHeight);
        this.energyBarBg.setScrollFactor(0);

        // Energy bar fill
        this.energyBarFill = this.add.graphics();
        this.energyBarFill.setScrollFactor(0);

        // Energy text centered above the bar
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

    createTankCards_OLD(uiY) {
        const cardWidth = 80;
        const cardHeight = 60;
        const cardSpacing = 90;
        const startX = 300;

        this.tankCards = [];
        
        // Create 4 cards from hand
        for (let index = 0; index < 4; index++) {
            const tankId = this.hand[index];
            const tankData = TANK_DATA[tankId];
            const cardX = startX + index * cardSpacing;
            const cardY = uiY + 20;

            // Card background
            const card = this.add.image(cardX, cardY, 'card_bg')
                .setDisplaySize(cardWidth, cardHeight)
                .setInteractive()
                .setOrigin(0);
            card.setScrollFactor(0);

            // Tank icon - create miniature version of actual tank
            const tankIcon = this.createMiniTankGraphics(cardX + cardWidth/2, cardY + 20, tankData.type);
            tankIcon.setScale(0.6);
            card.tankIcon = tankIcon;

            // Cost
            const costText = this.add.text(cardX + cardWidth - 10, cardY + cardHeight - 10, tankData.cost, {
                fontSize: '14px',
                fill: '#ffff00',
                fontFamily: 'Arial'
            }).setOrigin(1);
            costText.setScrollFactor(0);

            // Card name (small text)
            const nameText = this.add.text(cardX + cardWidth/2, cardY + 45, tankData.name, {
                fontSize: '10px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            nameText.setScrollFactor(0);

            // Store card info
            const cardInfo = {
                container: card,
                icon: tankIcon,
                cost: costText,
                name: nameText,
                tankId: tankId,
                tankData: tankData
            };

            this.tankCards.push(cardInfo);

            // Card click handler
            card.on('pointerdown', () => {
                this.selectTankCard(index);
            });

            // Card hover effects
            card.on('pointerover', () => {
                if (this.energy >= tankData.cost) {
                    card.setTint(0xdddddd);
                } else {
                    card.setTint(0x666666);
                }
                this.showCardTooltip(index, cardX, cardY);
            });

            card.on('pointerout', () => {
                card.clearTint();
                this.hideCardTooltip();
            });
        }

        this.selectedCard = 0;
        this.updateCardSelection();
    }

    selectTankCard(index) {
        this.selectedCard = index;
        this.updateCardSelection();
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
        const tankData = this.tankCards[cardIndex].tankData;
        
        this.cardTooltip = this.add.container(x, y - 100);
        this.cardTooltip.setScrollFactor(0);
        
        // Tooltip background
        const tooltipBg = this.add.graphics();
        tooltipBg.fillStyle(0x000000, 0.8);
        tooltipBg.fillRoundedRect(0, 0, 200, 80, 5);
        tooltipBg.lineStyle(2, 0xffffff, 0.5);
        tooltipBg.strokeRoundedRect(0, 0, 200, 80, 5);
        
        // Tank stats
        const statsText = this.add.text(10, 10, 
            `${tankData.name}\n` +
            `HP: ${tankData.stats.hp}\n` +
            `Damage: ${tankData.stats.damage}\n` +
            `Speed: ${tankData.stats.speed}`, {
            fontSize: '12px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        
        this.cardTooltip.add([tooltipBg, statsText]);
    }

    hideCardTooltip() {
        if (this.cardTooltip) {
            this.cardTooltip.destroy();
            this.cardTooltip = null;
        }
    }

    createBases() {
        // Create player towers (3 towers: left, right, main)
        this.createPlayerTowers();
        
        // Create enemy towers (3 towers: left, right, main)
        this.createEnemyTowers();

        // Health bars for all towers
        this.createHealthBars();
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
        
        // Create the tower image
        const tower = this.add.image(towerTile.worldX, towerTile.worldY, 'base');
        
        // Set display size based on tower type
        if (isMainTower) {
            // Main towers are 4x3 for both players
            tower.setDisplaySize(4 * GAME_CONFIG.TILE_SIZE, 3 * GAME_CONFIG.TILE_SIZE);
        } else {
            // Side towers are 3x3
            tower.setDisplaySize(3 * GAME_CONFIG.TILE_SIZE, 3 * GAME_CONFIG.TILE_SIZE);
        }
        
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
        
        // Main towers get golden tint
        if (isMainTower) {
            tower.setTint(0xffdd00);
        }
        
        // Add to buildings array
        this.buildings.push(tower);
    }

    createHealthBars() {
        this.buildings.forEach(building => {
            // Health bar background - larger for bases
            const healthBg = this.add.graphics();
            healthBg.fillStyle(0x333333);
            healthBg.fillRect(building.x - 50, building.y - 60, 100, 10);
            healthBg.setDepth(1000); // Bring to front
            building.healthBg = healthBg;

            // Health bar fill
            const healthFill = this.add.graphics();
            healthFill.setDepth(1001); // Above background
            building.healthFill = healthFill;
            
            // Health percentage text
            const healthText = this.add.text(building.x, building.y - 75, 
                `${building.health}/${building.maxHealth}`, {
                fontSize: '14px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            healthText.setDepth(1002); // Above everything
            building.healthText = healthText;
            
            this.updateBuildingHealth(building);
        });
    }

    updateBuildingHealth(building) {
        const healthPercent = building.health / building.maxHealth;
        building.healthFill.clear();
        
        // Color based on health percentage
        let healthColor = 0x00ff00; // Green
        if (healthPercent <= 0.25) healthColor = 0xff0000; // Red
        else if (healthPercent <= 0.5) healthColor = 0xffff00; // Yellow
        else if (healthPercent <= 0.75) healthColor = 0xffa500; // Orange
        
        building.healthFill.fillStyle(healthColor);
        building.healthFill.fillRect(building.x - 50, building.y - 60, 100 * healthPercent, 10);
        
        // Update health text
        if (building.healthText) {
            building.healthText.setText(`${Math.ceil(building.health)}/${building.maxHealth}`);
            building.healthText.setFill(healthColor === 0xff0000 ? '#ff0000' : '#ffffff');
        }
    }

    startEnergyRegeneration() {
        this.energyTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.energy < this.maxEnergy) {
                    this.energy = Math.min(this.energy + ENERGY_CONFIG.REGEN_RATE, this.maxEnergy);
                    this.updateEnergyBar();
                    
                    // Visual feedback for energy gain
                    this.showEnergyGainEffect();
                }
            },
            loop: true
        });
    }

    showEnergyGainEffect() {
        // Create a small energy gain indicator
        const energyGainText = this.add.text(240, GAME_CONFIG.HEIGHT - 70, '+1', {
            fontSize: '14px',
            fill: '#00ff00',
            fontFamily: 'Arial'
        });
        energyGainText.setScrollFactor(0);
        
        this.tweens.add({
            targets: energyGainText,
            y: energyGainText.y - 20,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => energyGainText.destroy()
        });
    }

    updateEnergyBar() {
        const energyPercent = this.energy / this.maxEnergy;
        const barWidth = 200;
        const barHeight = 16;
        const barX = (GAME_CONFIG.WIDTH - barWidth) / 2;
        const energyY = GAME_CONFIG.HEIGHT - 20;
        
        this.energyBarFill.clear();
        this.energyBarFill.fillStyle(0x4a90e2);
        this.energyBarFill.fillRect(barX, energyY, barWidth * energyPercent, barHeight);
        
        if (this.energyText) {
            this.energyText.setText(`${this.energy}/${this.maxEnergy}`);
        }
    }

    startBattleTimer() {
        this.battleTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.battleTime--;
                this.updateTimerDisplay();
                
                if (this.battleTime <= 0) {
                    // Check if overtime is needed
                    this.checkOvertimeConditions();
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

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    onBattlefieldClick(pointer) {
        // Convert screen coordinates to tile coordinates
        const worldX = pointer.x;
        const worldY = pointer.y;
        const tileCoords = GameHelpers.worldToTile(worldX, worldY);
        
        // Only allow deployment in player zone using tile-based checking
        if (!GameHelpers.isValidDeploymentTile(tileCoords.tileX, tileCoords.tileY, true)) {
            return;
        }

        // Snap to tile center for precise positioning
        const snappedPos = GameHelpers.tileToWorld(tileCoords.tileX, tileCoords.tileY);

        // Deploy selected tank if we have enough energy
        const selectedCardData = this.tankCards[this.selectedCard];
        if (this.energy >= selectedCardData.tankData.cost) {
            this.deployTank(selectedCardData.tankId, snappedPos.worldX, snappedPos.worldY);
            this.energy -= selectedCardData.tankData.cost;
            this.updateEnergyBar();
            
            // Cycle the used card
            this.cycleCard(this.selectedCard);
        } else {
            // Visual feedback for insufficient energy
            this.showInsufficientEnergyFeedback();
        }
    }

    deployTank(tankId, x, y) {
        const tankData = TANK_DATA[tankId];
        
        // Create tank with custom graphics
        const tank = this.createTankGraphics(x, y, tankData.type, true); // true = player tank
        
        // Tank properties
        tank.tankId = tankId;
        tank.tankData = tankData;
        tank.health = tankData.stats.hp;
        tank.maxHealth = tankData.stats.hp;
        tank.isPlayerTank = true;
        tank.target = null;
        tank.lastShotTime = 0;
        tank.moveTarget = null; // Not used in Clash Royale style
        tank.manualControl = false; // Always AI controlled in Clash Royale style
        tank.lastTargetUpdate = 0; // For AI target selection
        
        // Pathfinding properties
        tank.path = null;
        tank.pathIndex = 0;
        tank.needsNewPath = true;

        // Face towards the enemy base initially
        const enemyBase = this.buildings.find(b => !b.isPlayerBase);
        const initialAngle = GameHelpers.angle(x, y, enemyBase.x, enemyBase.y);
        tank.setRotation(initialAngle);

        // AI behavior: find best target (closest enemy or enemy base)
        this.updateTankAI(tank);

        this.tanks.push(tank);
        
        // Create health bar for tank
        this.createTankHealthBar(tank);
        
        // Update statistics
        this.battleStats.player.tanksDeployed++;
        const cost = tankData.stats.cost;
        this.battleStats.player.energySpent += cost;
        this.playUISound('deploy');

        // Track max tanks alive
        const playerTanksAlive = this.tanks.filter(t => t.isPlayerTank && t.health > 0).length;
        if (playerTanksAlive > this.battleStats.player.maxTanksAlive) {
            this.battleStats.player.maxTanksAlive = playerTanksAlive;
        }
        
        // Notify AI of player deployment for reactive strategy
        this.notifyAIOfPlayerAction('deploy', tankData);
    }

    createTankGraphics(x, y, tankType, isPlayerTank) {
        // Team colors
        const playerColor = 0x2d7dd2; // Blue
        const enemyColor = 0xd22d2d;  // Red
        const accentColor = isPlayerTank ? 0x5599ff : 0xff5555;
        const darkColor = isPlayerTank ? 0x1a5aa3 : 0xa31a1a;
        
        // Create a container for the tank
        const tank = this.add.container(x, y);
        
        // Create graphics object for drawing
        const graphics = this.add.graphics();
        
        if (tankType === TANK_TYPES.LIGHT) {
            // Light Tank - Small, fast-looking
            graphics.fillStyle(isPlayerTank ? playerColor : enemyColor);
            graphics.fillRoundedRect(-12, -8, 24, 16, 3);
            
            // Turret
            graphics.fillStyle(darkColor);
            graphics.fillCircle(0, 0, 6);
            
            // Barrel
            graphics.fillRect(6, -1, 12, 2);
            
            // Side details
            graphics.fillStyle(accentColor);
            graphics.fillRect(-10, -6, 20, 2);
            graphics.fillRect(-10, 4, 20, 2);
            
        } else if (tankType === TANK_TYPES.MEDIUM) {
            // Medium Tank - Balanced design
            graphics.fillStyle(isPlayerTank ? playerColor : enemyColor);
            graphics.fillRoundedRect(-15, -10, 30, 20, 4);
            
            // Turret
            graphics.fillStyle(darkColor);
            graphics.fillCircle(0, 0, 8);
            
            // Barrel
            graphics.fillRect(8, -2, 15, 4);
            
            // Side armor plates
            graphics.fillStyle(accentColor);
            graphics.fillRect(-13, -8, 26, 3);
            graphics.fillRect(-13, 5, 26, 3);
            
            // Front armor detail
            graphics.fillRect(13, -6, 2, 12);
            
        } else if (tankType === TANK_TYPES.HEAVY) {
            // Heavy Tank - Large, intimidating
            graphics.fillStyle(isPlayerTank ? playerColor : enemyColor);
            graphics.fillRoundedRect(-18, -12, 36, 24, 5);
            
            // Turret
            graphics.fillStyle(darkColor);
            graphics.fillCircle(0, 0, 10);
            
            // Barrel (thicker)
            graphics.fillRect(10, -3, 18, 6);
            
            // Heavy armor plates
            graphics.fillStyle(accentColor);
            graphics.fillRect(-16, -10, 32, 4);
            graphics.fillRect(-16, 6, 32, 4);
            
            // Side armor details
            graphics.fillRect(-16, -4, 4, 8);
            graphics.fillRect(12, -4, 4, 8);
            
            // Front armor
            graphics.fillRect(16, -8, 2, 16);
            
        } else if (tankType === TANK_TYPES.TANK_DESTROYER) {
            // Tank Destroyer - Low profile, long barrel
            graphics.fillStyle(isPlayerTank ? playerColor : enemyColor);
            graphics.fillRoundedRect(-16, -8, 32, 16, 3);
            
            // Low profile turret
            graphics.fillStyle(darkColor);
            graphics.fillCircle(2, 0, 6);
            
            // Very long barrel
            graphics.fillRect(8, -1, 22, 2);
            
            // Sloped front armor
            graphics.fillStyle(accentColor);
            graphics.fillTriangle(16, -8, 16, 8, 20, 0);
            
            // Side armor details
            graphics.fillRect(-14, -6, 28, 2);
            graphics.fillRect(-14, 4, 28, 2);
            
        } else if (tankType === TANK_TYPES.ARTILLERY) {
            // Artillery - Large, boxy, huge barrel
            graphics.fillStyle(isPlayerTank ? playerColor : enemyColor);
            graphics.fillRoundedRect(-20, -10, 40, 20, 4);
            
            // Large turret base
            graphics.fillStyle(darkColor);
            graphics.fillCircle(-2, 0, 9);
            
            // Massive barrel (thicker and longer)
            graphics.fillRect(7, -4, 25, 8);
            
            // Equipment boxes
            graphics.fillStyle(accentColor);
            graphics.fillRect(-18, -8, 6, 6);
            graphics.fillRect(-18, 2, 6, 6);
            graphics.fillRect(14, -6, 4, 4);
            graphics.fillRect(14, 2, 4, 4);
            
            // Stabilizer supports
            graphics.fillRect(-22, -2, 4, 4);
            graphics.fillRect(18, -2, 4, 4);
            
        } else if (tankType === TANK_TYPES.FAST_ATTACK) {
            // Fast Attack - Very small, angular
            graphics.fillStyle(isPlayerTank ? playerColor : enemyColor);
            graphics.fillRoundedRect(-10, -6, 20, 12, 2);
            
            // Small, offset turret
            graphics.fillStyle(darkColor);
            graphics.fillCircle(3, 0, 4);
            
            // Short barrel
            graphics.fillRect(7, -1, 8, 2);
            
            // Angular front
            graphics.fillStyle(accentColor);
            graphics.fillTriangle(10, -6, 10, 6, 14, 0);
            
            // Speed stripes
            graphics.fillRect(-8, -4, 16, 1);
            graphics.fillRect(-8, 0, 16, 1);
            graphics.fillRect(-8, 3, 16, 1);
        }
        
        // Add tracks/treads for all tanks
        graphics.fillStyle(0x333333);
        let trackWidth, trackHeight;
        
        if (tankType === TANK_TYPES.HEAVY) {
            trackWidth = 20;
            trackHeight = 3;
        } else if (tankType === TANK_TYPES.ARTILLERY) {
            trackWidth = 22;
            trackHeight = 3;
        } else if (tankType === TANK_TYPES.MEDIUM || tankType === TANK_TYPES.TANK_DESTROYER) {
            trackWidth = 16;
            trackHeight = 2;
        } else { // LIGHT and FAST_ATTACK
            trackWidth = 12;
            trackHeight = 2;
        }
        
        // Left track
        graphics.fillRect(-trackWidth/2, -15, trackWidth, trackHeight);
        // Right track
        graphics.fillRect(-trackWidth/2, 13, trackWidth, trackHeight);
        
        // Add the graphics to the container
        tank.add(graphics);
        
        return tank;
    }

    createMiniTankGraphics(x, y, tankType) {
        // Create a simplified version for cards - always blue (player color)
        const playerColor = 0x2d7dd2;
        const accentColor = 0x5599ff;
        const darkColor = 0x1a5aa3;
        
        const tank = this.add.container(x, y);
        const graphics = this.add.graphics();
        
        if (tankType === TANK_TYPES.LIGHT) {
            graphics.fillStyle(playerColor);
            graphics.fillRoundedRect(-8, -5, 16, 10, 2);
            graphics.fillStyle(darkColor);
            graphics.fillCircle(0, 0, 3);
            graphics.fillRect(3, -1, 6, 2);
        } else if (tankType === TANK_TYPES.MEDIUM) {
            graphics.fillStyle(playerColor);
            graphics.fillRoundedRect(-10, -6, 20, 12, 2);
            graphics.fillStyle(darkColor);
            graphics.fillCircle(0, 0, 4);
            graphics.fillRect(4, -1, 8, 2);
            graphics.fillStyle(accentColor);
            graphics.fillRect(-8, -4, 16, 1);
            graphics.fillRect(-8, 3, 16, 1);
        } else if (tankType === TANK_TYPES.HEAVY) {
            graphics.fillStyle(playerColor);
            graphics.fillRoundedRect(-12, -8, 24, 16, 3);
            graphics.fillStyle(darkColor);
            graphics.fillCircle(0, 0, 5);
            graphics.fillRect(5, -2, 10, 4);
            graphics.fillStyle(accentColor);
            graphics.fillRect(-10, -6, 20, 2);
            graphics.fillRect(-10, 4, 20, 2);
            
        } else if (tankType === TANK_TYPES.TANK_DESTROYER) {
            graphics.fillStyle(playerColor);
            graphics.fillRoundedRect(-10, -5, 20, 10, 2);
            graphics.fillStyle(darkColor);
            graphics.fillCircle(1, 0, 3);
            graphics.fillRect(4, 0, 12, 1);
            graphics.fillStyle(accentColor);
            graphics.fillTriangle(10, -5, 10, 5, 12, 0);
            
        } else if (tankType === TANK_TYPES.ARTILLERY) {
            graphics.fillStyle(playerColor);
            graphics.fillRoundedRect(-12, -6, 24, 12, 2);
            graphics.fillStyle(darkColor);
            graphics.fillCircle(-1, 0, 4);
            graphics.fillRect(3, -2, 14, 4);
            graphics.fillStyle(accentColor);
            graphics.fillRect(-10, -4, 3, 3);
            graphics.fillRect(-10, 1, 3, 3);
            
        } else if (tankType === TANK_TYPES.FAST_ATTACK) {
            graphics.fillStyle(playerColor);
            graphics.fillRoundedRect(-8, -4, 16, 8, 1);
            graphics.fillStyle(darkColor);
            graphics.fillCircle(2, 0, 2);
            graphics.fillRect(4, 0, 6, 1);
            graphics.fillStyle(accentColor);
            graphics.fillTriangle(8, -4, 8, 4, 10, 0);
        }
        
        // Tracks
        graphics.fillStyle(0x333333);
        let trackWidth;
        if (tankType === TANK_TYPES.HEAVY) {
            trackWidth = 12;
        } else if (tankType === TANK_TYPES.ARTILLERY) {
            trackWidth = 14;
        } else if (tankType === TANK_TYPES.MEDIUM || tankType === TANK_TYPES.TANK_DESTROYER) {
            trackWidth = 10;
        } else { // LIGHT and FAST_ATTACK
            trackWidth = 8;
        }
        graphics.fillRect(-trackWidth/2, -10, trackWidth, 1);
        graphics.fillRect(-trackWidth/2, 9, trackWidth, 1);
        
        tank.add(graphics);
        tank.setScrollFactor(0);
        
        return tank;
    }

    createTankHealthBar(tank) {
        const healthBg = this.add.graphics();
        healthBg.fillStyle(0x333333);
        healthBg.fillRect(tank.x - 20, tank.y - 30, 40, 4);
        tank.healthBg = healthBg;

        const healthFill = this.add.graphics();
        tank.healthFill = healthFill;
        this.updateTankHealth(tank);
    }

    updateTankHealth(tank) {
        const healthPercent = tank.health / tank.maxHealth;
        tank.healthFill.clear();
        tank.healthFill.fillStyle(healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000);
        tank.healthFill.fillRect(tank.x - 20, tank.y - 30, 40 * healthPercent, 4);
    }

    updateTankMovement(tank) {
        this.updateTankAI(tank); // Update AI targeting
        
        let targetPos = null;
        
        // Determine what to move towards
        if (tank.moveTarget && tank.manualControl) {
            // Manual movement target
            targetPos = tank.moveTarget;
        } else if (tank.target && !tank.manualControl) {
            // AI target
            targetPos = tank.target;
        } else {
            return;
        }

        const distance = GameHelpers.distance(tank.x, tank.y, targetPos.x, targetPos.y);
        
        // If manual movement and close enough to target, stop
        if (tank.manualControl && distance <= 10) {
            tank.moveTarget = null;
            tank.moving = false;
            return;
        }
        
        // If AI movement and in range of target, stop and prepare to shoot
        if (!tank.manualControl && tank.target) {
            const range = tank.tankData.stats.range;
            if (distance <= range) {
                tank.moving = false;
                return;
            }
        }

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

        // Follow the path
        if (tank.path && tank.pathIndex < tank.path.length) {
            const currentWaypoint = tank.path[tank.pathIndex];
            const waypointDistance = GameHelpers.distance(tank.x, tank.y, currentWaypoint.worldX, currentWaypoint.worldY);
            
            // If close enough to current waypoint, move to next one
            if (waypointDistance <= 15) {
                tank.pathIndex++;
                if (tank.pathIndex >= tank.path.length) {
                    // Reached end of path
                    tank.moving = false;
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
                const speed = tank.tankData.stats.speed / 60; // Convert to pixels per frame
                
                // Apply movement with avoidance
                const moveX = Math.cos(targetAngle) * speed + avoidanceX * 0.1;
                const moveY = Math.sin(targetAngle) * speed + avoidanceY * 0.1;
                
                tank.x += moveX;
                tank.y += moveY;
                
                // Face movement direction (but only if moving significantly)
                if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
                    tank.setRotation(targetAngle);
                }
            }
        }
        
        // Keep tanks within battlefield bounds
        tank.x = GameHelpers.clamp(tank.x, 20, GAME_CONFIG.WORLD_WIDTH - 20);
        tank.y = GameHelpers.clamp(tank.y, 20, GAME_CONFIG.WORLD_HEIGHT - 120);
        
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
        
        // AI strategy state
        this.aiStrategy = {
            mode: 'balanced', // 'aggressive', 'defensive', 'balanced'
            lastPlayerAction: 0,
            playerTankCount: 0,
            baseHealthPercent: 1.0,
            preferredTankTypes: ['tank_medium_1', 'tank_light_1'],
            rushMode: false,
            defensiveMode: false
        };
        
        this.aiNextDeployment = this.time.now + GameHelpers.randomInt(2000, 4000);
        this.aiLastStrategyUpdate = this.time.now;
        
        // AI energy regeneration
        this.aiEnergyTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.aiEnergy < this.aiMaxEnergy) {
                    this.aiEnergy = Math.min(this.aiEnergy + ENERGY_CONFIG.REGEN_RATE, this.aiMaxEnergy);
                }
            },
            loop: true
        });
    }

    updateAI() {
        const currentTime = this.time.now;
        
        // Update AI strategy every 3 seconds
        if (currentTime - this.aiLastStrategyUpdate > 3000) {
            this.updateAIStrategy();
            this.aiLastStrategyUpdate = currentTime;
        }
        
        // Check if AI should deploy a tank (strategic timing)
        if (currentTime >= this.aiNextDeployment && this.aiEnergy >= 1) {
            const shouldDeploy = this.shouldAIDeploy();
            if (shouldDeploy) {
                this.aiDeployTankStrategically();
                // Dynamic deployment timing based on strategy
                const baseDelay = this.aiStrategy.mode === 'aggressive' ? 2000 : 
                                this.aiStrategy.mode === 'defensive' ? 5000 : 3500;
                const randomDelay = GameHelpers.randomInt(-1000, 1500);
                this.aiNextDeployment = currentTime + baseDelay + randomDelay;
            }
        }
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
        const enemyZoneCoords = GameHelpers.getDeploymentZoneWorldCoords('enemy');
        const playerBase = this.buildings.find(b => b.isPlayerBase);
        const aiBase = this.buildings.find(b => !b.isPlayerBase);
        
        // Get center tile of enemy deployment zone
        let baseTileX = Math.floor(GAME_CONFIG.TILES_X / 2); // Center column (9 for 18-wide grid)
        let baseTileY = Math.floor((BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tileY + BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tilesHeight) / 2); // Center row of enemy zone
        
        // Strategic positioning based on tank type and strategy
        if (this.aiStrategy.mode === 'aggressive' || this.aiStrategy.rushMode) {
            // Deploy closer to player base for faster attack (further down)
            baseTileY = Math.min(baseTileY + 2, BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tileY + BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tilesHeight - 1);
        } else if (this.aiStrategy.mode === 'defensive') {
            // Deploy closer to our own base for defense (further up)
            baseTileY = Math.max(baseTileY - 2, BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tileY);
        }
        
        // Add some randomness to avoid predictable positioning
        const randomOffsetX = GameHelpers.randomInt(-3, 3);
        const randomOffsetY = GameHelpers.randomInt(-2, 2);
        
        const deployTileX = GameHelpers.clamp(
            baseTileX + randomOffsetX, 
            0, 
            GAME_CONFIG.TILES_X - 1
        );
        const deployTileY = GameHelpers.clamp(
            baseTileY + randomOffsetY, 
            BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tileY, 
            BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tileY + BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY.tilesHeight - 1
        );
        
        // Convert tile coordinates to world coordinates
        return GameHelpers.tileToWorld(deployTileX, deployTileY);
    }

    aiDeployTank() {
        // Legacy method - redirect to strategic deployment
        this.aiDeployTankStrategically();
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
        const tank = this.createTankGraphics(x, y, tankData.type, false); // false = AI tank
        
        // Tank properties
        tank.tankId = tankId;
        tank.tankData = tankData;
        tank.health = tankData.stats.hp;
        tank.maxHealth = tankData.stats.hp;
        tank.isPlayerTank = false; // AI tank
        tank.target = null;
        tank.lastShotTime = 0;
        tank.moveTarget = null;
        tank.manualControl = false;
        tank.lastTargetUpdate = 0;
        
        // Pathfinding properties
        tank.path = null;
        tank.pathIndex = 0;
        tank.needsNewPath = true;

        // Face towards the player side initially
        const playerSideX = GAME_CONFIG.WORLD_WIDTH / 4;
        const playerSideY = GAME_CONFIG.WORLD_HEIGHT * 3 / 4;
        const initialAngle = GameHelpers.angle(x, y, playerSideX, playerSideY);
        tank.setRotation(initialAngle);

        // AI behavior: target player base and tanks
        this.updateTankAI(tank);

        this.tanks.push(tank);
        
        // Create health bar for tank
        this.createTankHealthBar(tank);
    }

    update() {
        // No camera movement in Clash Royale style
        
        // Update AI
        this.updateAI();
        
        // Update all tanks
        this.tanks.forEach(tank => {
            if (tank.health > 0) {
                this.updateTankMovement(tank);
                this.checkTankCombat(tank);
            }
        });

        // Update base defenses
        this.buildings.forEach(building => {
            if (building.health > 0) {
                this.updateBaseDefense(building);
                this.checkBaseCombat(building);
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
                
                // If this was the selected tank, deselect it
                if (this.selectedTank === tank) {
                    this.selectedTank = null;
                }
                
                // Create destruction effect
                this.createExplosionEffect(tank.x, tank.y, 1.2);
                this.playExplosionSound('medium');
                
                tank.destroy();
                if (tank.healthBg) tank.healthBg.destroy();
                if (tank.healthFill) tank.healthFill.destroy();
                if (tank.selectionCircle) tank.selectionCircle.destroy();
                if (tank.rangeCircle) tank.rangeCircle.destroy();
                return false;
            }
            return true;
        });

        // Clean up any stray projectiles that might have missed their targets
        this.projectiles = this.projectiles.filter(projectile => {
            if (!projectile.scene || projectile.x < -100 || projectile.x > GAME_CONFIG.WORLD_WIDTH + 100 || 
                projectile.y < -100 || projectile.y > GAME_CONFIG.WORLD_HEIGHT + 100) {
                if (projectile.destroy) projectile.destroy();
                return false;
            }
            return true;
        });
    }

    // No mode switching in Clash Royale style - only deployment

    // No camera movement in Clash Royale style - fixed view

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

    // Tank selection removed - no manual control in Clash Royale style

    initializeDeck() {
        // Ensure we have at least 4 different tanks by filling with available tanks
        while (this.deck.length < 8) {
            this.deck.push(...this.gameState.player.tanks);
        }
        
        // Shuffle the deck
        this.shuffleDeck();
        
        // Fill initial hand of 4 cards
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

    getNextCard() {
        if (this.nextCardIndex >= this.deck.length) {
            // Reshuffle when deck is exhausted
            this.shuffleDeck();
        }
        
        const card = this.deck[this.nextCardIndex];
        this.nextCardIndex++;
        return card;
    }

    cycleCard(usedCardIndex) {
        // Replace used card with next card from deck
        const newCard = this.getNextCard();
        this.hand[usedCardIndex] = newCard;
        
        // Update the visual representation
        this.updateCardDisplay(usedCardIndex);
    }

    updateCardDisplay(cardIndex) {
        if (!this.tankCards[cardIndex]) return;
        
        const tankId = this.hand[cardIndex];
        const tankData = TANK_DATA[tankId];
        const card = this.tankCards[cardIndex];
        
        // Destroy old tank icon and create new one
        if (card.tankIcon) {
            card.tankIcon.destroy();
        }
        
        // Create new tank icon with updated graphics
        const cardX = card.x;
        const cardY = card.y;
        const cardWidth = 80;
        card.tankIcon = this.createMiniTankGraphics(cardX + cardWidth/2, cardY + 20, tankData.type);
        card.tankIcon.setScale(0.6);
        
        // Update cost
        card.costText.setText(tankData.cost);
        
        // Update name
        card.nameText.setText(tankData.name);
        
        // Update card references
        card.tankId = tankId;
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
        // Flash the energy bar red
        const barWidth = 200;
        const barX = (GAME_CONFIG.WIDTH - barWidth) / 2;
        const energyY = GAME_CONFIG.HEIGHT - 20;
        
        this.energyBarFill.clear();
        this.energyBarFill.fillStyle(0xff0000);
        this.energyBarFill.fillRect(barX, energyY, barWidth * (this.energy / this.maxEnergy), 16);
        
        // Flash the selected card
        const selectedCard = this.tankCards[this.selectedCard];
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
        
        // Show "Not Enough Energy" text
        const errorText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 50, 'NOT ENOUGH ENERGY!', {
            fontSize: '24px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        errorText.setScrollFactor(0);
        
        this.tweens.add({
            targets: errorText,
            alpha: 0,
            y: errorText.y - 30,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => errorText.destroy()
        });
    }

    updateTankAI(tank) {
        if (tank.manualControl) return; // Don't override manual control
        
        const currentTime = this.time.now;
        
        // Update AI target every 2 seconds or if target is destroyed
        if (currentTime - tank.lastTargetUpdate > 2000 || !tank.target || tank.target.health <= 0) {
            tank.lastTargetUpdate = currentTime;
            
            const oldTarget = tank.target;
            
            // Find closest enemy target
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            if (tank.isPlayerTank) {
                // Player tank: target AI tanks and enemy base
                const enemyTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
                enemyTanks.forEach(enemy => {
                    const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= tank.tankData.stats.range * 2) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
                
                // If no enemy tanks in range, target enemy towers (prioritize side towers)
                if (!closestEnemy) {
                    const enemyBuildings = this.buildings.filter(b => !b.isPlayerBase && b.health > 0);
                    
                    // Prioritize side towers over main tower
                    const sideTowers = enemyBuildings.filter(b => !b.isMainTower);
                    const mainTowers = enemyBuildings.filter(b => b.isMainTower);
                    
                    // First try to target side towers
                    if (sideTowers.length > 0) {
                        sideTowers.forEach(building => {
                            const distance = GameHelpers.distance(tank.x, tank.y, building.x, building.y);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestEnemy = building;
                            }
                        });
                    } else if (mainTowers.length > 0) {
                        // Only target main tower if no side towers left
                        mainTowers.forEach(building => {
                            const distance = GameHelpers.distance(tank.x, tank.y, building.x, building.y);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestEnemy = building;
                            }
                        });
                    }
                }
            } else {
                // AI tank: target player tanks and player base
                const playerTanks = this.tanks.filter(t => t.isPlayerTank && t.health > 0);
                playerTanks.forEach(enemy => {
                    const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= tank.tankData.stats.range * 2) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
                
                // If no player tanks in range, target player towers (prioritize side towers)
                if (!closestEnemy) {
                    const playerBuildings = this.buildings.filter(b => b.isPlayerBase && b.health > 0);
                    
                    // Prioritize side towers over main tower
                    const sideTowers = playerBuildings.filter(b => !b.isMainTower);
                    const mainTowers = playerBuildings.filter(b => b.isMainTower);
                    
                    // First try to target side towers
                    if (sideTowers.length > 0) {
                        sideTowers.forEach(building => {
                            const distance = GameHelpers.distance(tank.x, tank.y, building.x, building.y);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestEnemy = building;
                            }
                        });
                    } else if (mainTowers.length > 0) {
                        // Only target main tower if no side towers left
                        mainTowers.forEach(building => {
                            const distance = GameHelpers.distance(tank.x, tank.y, building.x, building.y);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestEnemy = building;
                            }
                        });
                    }
                }
            }
            
            tank.target = closestEnemy;
            
            // If target changed, request new path
            if (oldTarget !== tank.target) {
                tank.needsNewPath = true;
            }
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

    checkBaseCombat(base) {
        if (!base.target) return;

        const currentTime = this.time.now;
        const timeSinceLastShot = currentTime - base.lastShotTime;
        const baseRateOfFire = 1500; // Bases fire faster than tanks

        if (timeSinceLastShot >= baseRateOfFire) {
            this.baseShoot(base, base.target);
            base.lastShotTime = currentTime;
        }
    }

    baseShoot(base, target) {
        // Create a powerful base projectile
        this.createBaseProjectile(base, target);
    }

    createBaseProjectile(base, target) {
        // Base projectiles are more powerful
        const bulletSpeed = 300; // Faster than tank bullets
        const bulletColor = base.isPlayerBase ? 0x0088ff : 0xff0088; // Blue for player, magenta for enemy
        
        // Create bullet sprite
        const bullet = this.add.image(base.x, base.y, 'shell');
        bullet.setTint(bulletColor);
        bullet.setScale(1.2); // Larger bullets
        
        // Create bullet trail
        const trail = this.add.graphics();
        trail.lineStyle(3, bulletColor, 0.8);
        bullet.trail = trail;
        
        // Calculate angle from base to target
        const angle = GameHelpers.angle(base.x, base.y, target.x, target.y);
        const distance = GameHelpers.distance(base.x, base.y, target.x, target.y);
        const travelTime = (distance / bulletSpeed) * 1000;
        
        // Rotate bullet to face direction of travel
        bullet.setRotation(angle);
        
        // Store bullet properties - bases are more powerful
        bullet.damage = 80; // Higher damage than tanks
        bullet.penetration = 100; // High penetration
        bullet.attacker = base;
        bullet.target = target;
        bullet.speed = bulletSpeed;
        bullet.isBaseProjectile = true; // Mark as base projectile
        
        // Add to projectiles array
        this.projectiles.push(bullet);
        
        // Play powerful shoot sound
        const playShootSound = this.registry.get('playShootSound');
        if (playShootSound) playShootSound();
        
        // Animate bullet movement
        this.tweens.add({
            targets: bullet,
            x: target.x,
            y: target.y,
            duration: travelTime,
            ease: 'None',
            onUpdate: () => {
                // Update trail
                if (bullet.trail) {
                    bullet.trail.clear();
                    bullet.trail.lineStyle(3, bulletColor, 0.8);
                    bullet.trail.lineBetween(base.x, base.y, bullet.x, bullet.y);
                }
            },
            onComplete: () => {
                this.onBulletHit(bullet);
            }
        });
        
        // Create larger muzzle flash for base
        this.createBaseMuzzleFlash(base.x, base.y, angle);
    }

    createBaseMuzzleFlash(x, y, angle) {
        // Create larger muzzle flash for base weapons
        const flashOffset = 40; // Distance from base center
        const flashX = x + Math.cos(angle) * flashOffset;
        const flashY = y + Math.sin(angle) * flashOffset;
        
        const flash = this.add.graphics();
        flash.fillStyle(0xffff88, 0.9);
        flash.fillCircle(flashX, flashY, 12); // Larger flash
        
        // Quick flash animation
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 150,
            onComplete: () => flash.destroy()
        });
        
        // Add secondary flash ring
        const flashRing = this.add.graphics();
        flashRing.lineStyle(4, 0xffaa00, 0.7);
        flashRing.strokeCircle(flashX, flashY, 15);
        
        this.tweens.add({
            targets: flashRing,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            onComplete: () => flashRing.destroy()
        });
    }

    createMoveTargetIndicator(x, y) {
        const indicator = this.add.graphics();
        indicator.lineStyle(2, 0x00ff00);
        indicator.strokeCircle(x, y, 15);
        indicator.fillStyle(0x00ff00, 0.3);
        indicator.fillCircle(x, y, 15);

        // Fade out the indicator
        this.tweens.add({
            targets: indicator,
            alpha: 0,
            duration: 1000,
            onComplete: () => indicator.destroy()
        });
    }

    checkTankCombat(tank) {
        if (!tank.target || tank.moving) return;

        const currentTime = this.time.now;
        const timeSinceLastShot = currentTime - tank.lastShotTime;
        const rateOfFire = 2000; // 2 seconds between shots

        if (timeSinceLastShot >= rateOfFire) {
            // Face the target before shooting
            const angle = GameHelpers.angle(tank.x, tank.y, tank.target.x, tank.target.y);
            tank.setRotation(angle);
            
            this.tankShoot(tank, tank.target);
            tank.lastShotTime = currentTime;
        }
    }

    tankShoot(attacker, target) {
        // Create a projectile instead of instant damage
        this.createProjectile(attacker, target);
    }

    createProjectile(attacker, target) {
        // Determine projectile type based on tank type
        let bulletTexture = 'bullet';
        let bulletSpeed = 250; // pixels per second - slower for visibility
        let bulletColor = 0xffff00;
        
        if (attacker.tankData.type === TANK_TYPES.HEAVY) {
            bulletTexture = 'shell';
            bulletSpeed = 200;
            bulletColor = 0xff8800;
        } else if (attacker.tankData.type === TANK_TYPES.MEDIUM) {
            bulletSpeed = 225;
            bulletColor = 0xffffff;
        }

        // Create bullet sprite
        const bullet = this.add.image(attacker.x, attacker.y, bulletTexture);
        bullet.setTint(bulletColor);
        
        // Create bullet trail
        const trail = this.add.graphics();
        trail.lineStyle(2, bulletColor, 0.6);
        bullet.trail = trail;
        
        // Calculate angle from attacker to target
        const angle = GameHelpers.angle(attacker.x, attacker.y, target.x, target.y);
        const distance = GameHelpers.distance(attacker.x, attacker.y, target.x, target.y);
        const travelTime = (distance / bulletSpeed) * 1000; // Convert to milliseconds
        
        // Rotate bullet to face direction of travel
        bullet.setRotation(angle);
        
        // Store bullet properties
        bullet.damage = attacker.tankData.stats.damage;
        bullet.penetration = attacker.tankData.stats.penetration;
        bullet.attacker = attacker;
        bullet.target = target;
        bullet.speed = bulletSpeed;
        
        // Track shots fired statistics
        if (attacker.isPlayerTank) {
            this.battleStats.player.shotsFired++;
        } else {
            this.battleStats.ai.shotsFired++;
        }
        this.battleStats.battle.totalProjectilesFired++;
        
        // Add to projectiles array
        this.projectiles.push(bullet);
        
        // Play shoot sound
        this.playShootSound(attacker.tankData.type);
        
        // Animate bullet movement
        this.tweens.add({
            targets: bullet,
            x: target.x,
            y: target.y,
            duration: travelTime,
            ease: 'None',
            onUpdate: () => {
                // Update trail
                if (bullet.trail) {
                    bullet.trail.clear();
                    bullet.trail.lineStyle(2, bulletColor, 0.6);
                    bullet.trail.lineBetween(attacker.x, attacker.y, bullet.x, bullet.y);
                }
            },
            onComplete: () => {
                this.onBulletHit(bullet);
            }
        });
        
        // Create muzzle flash effect at attacker position
        this.createMuzzleFlash(attacker.x, attacker.y, angle);
    }

    onBulletHit(bullet) {
        // Remove bullet from projectiles array
        const index = this.projectiles.indexOf(bullet);
        if (index > -1) {
            this.projectiles.splice(index, 1);
        }
        
        // Check if target still exists and has health
        if (bullet.target && bullet.target.health > 0) {
            // Calculate damage with armor penetration
            const baseDamage = bullet.damage;
            const penetration = bullet.penetration || baseDamage; // Fallback for old bullets
            const targetArmorData = bullet.target.tankData?.stats?.armor;
            const targetArmor = targetArmorData ? 
                (typeof targetArmorData === 'object' ? targetArmorData.front : targetArmorData) : 0;
            
            // Penetration formula: if penetration >= armor, full damage
            // Otherwise, reduced damage based on armor effectiveness
            let finalDamage;
            let penetrationRatio = 1.0; // Default to full penetration
            
            if (penetration >= targetArmor) {
                finalDamage = baseDamage;
                penetrationRatio = 1.0;
            } else {
                // Armor reduces damage: damage = base * (penetration / armor)
                penetrationRatio = Math.max(0.1, penetration / targetArmor); // Minimum 10% damage
                finalDamage = Math.floor(baseDamage * penetrationRatio);
            }
            
            // Store previous health for destruction check
            const previousHealth = bullet.target.health;
            
            // Apply damage and track statistics
            bullet.target.health = Math.max(0, bullet.target.health - finalDamage);
            
            // Update battle statistics
            if (bullet.attacker) {
                // Track shots hit
                if (bullet.attacker.isPlayerTank) {
                    this.battleStats.player.shotsHit++;
                    this.battleStats.player.totalDamageDealt += finalDamage;
                    if (bullet.target.isPlayerTank !== undefined) {
                        // Tank target
                        if (!bullet.target.isPlayerTank) {
                            // Player hit enemy tank
                            this.battleStats.ai.totalDamageTaken += finalDamage;
                        }
                    } else {
                        // Building target
                        this.battleStats.player.buildingDamage += finalDamage;
                    }
                    
                    // Track critical hits (high penetration)
                    if (penetrationRatio >= 0.8) {
                        this.battleStats.player.criticalHits++;
                    }
                } else {
                    this.battleStats.ai.shotsHit++;
                    this.battleStats.ai.totalDamageDealt += finalDamage;
                    if (bullet.target.isPlayerTank !== undefined) {
                        // Tank target
                        if (bullet.target.isPlayerTank) {
                            // AI hit player tank
                            this.battleStats.player.totalDamageTaken += finalDamage;
                        }
                    } else {
                        // Building target
                        this.battleStats.ai.buildingDamage += finalDamage;
                    }
                    
                    // Track AI critical hits
                    if (penetrationRatio >= 0.8) {
                        this.battleStats.ai.criticalHits++;
                    }
                }
            }
            
            // Track total battle damage
            this.battleStats.battle.totalDamageDealt += finalDamage;
            
            // Update health display
            if (bullet.target.healthFill) {
                if (this.updateTankHealth && bullet.target.tankData) {
                    this.updateTankHealth(bullet.target);
                } else if (this.updateBuildingHealth) {
                    this.updateBuildingHealth(bullet.target);
                }
            }

            // Check if target is destroyed
            if (bullet.target.health <= 0) {
                if (bullet.target.isPlayerBase !== undefined) {
                    // Tower destroyed - handle tower system
                    this.destroyTower(bullet.target);
                } else if (previousHealth > 0) {
                    // Tank destroyed - the update() method will handle cleanup
                    // Just create a destruction effect here
                    this.createExplosionEffect(bullet.target.x, bullet.target.y, 1.5);
                    this.playExplosionSound('large');
                }
            }

            // Create hit effect with actual damage dealt
            this.createHitEffect(bullet.target.x, bullet.target.y, finalDamage, bullet.isBaseProjectile);
            
            // Play explosion sound
            const playExplosionSound = this.registry.get('playExplosionSound');
            if (playExplosionSound) playExplosionSound();
        }
        
        // Destroy bullet sprite
        bullet.destroy();
        
        // Destroy trail
        if (bullet.trail) {
            bullet.trail.destroy();
        }
    }

    createMuzzleFlash(x, y, angle) {
        // Create muzzle flash at barrel tip
        const flashOffset = 25; // Distance from tank center to barrel tip
        const flashX = x + Math.cos(angle) * flashOffset;
        const flashY = y + Math.sin(angle) * flashOffset;
        
        const flash = this.add.graphics();
        flash.fillStyle(0xffff88, 0.8);
        flash.fillCircle(flashX, flashY, 8);
        
        // Quick flash animation
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 100,
            onComplete: () => flash.destroy()
        });
    }

    createHitEffect(x, y, damage = 30, isFromBase = false) {
        // Enhanced main explosion effect
        const explosion = this.add.graphics();
        const explosionColor = isFromBase ? 0xffaa00 : 0xff4444;
        const explosionSize = isFromBase ? 25 : 18;
        
        explosion.fillStyle(explosionColor, 0.9);
        explosion.fillCircle(x, y, explosionSize);
        explosion.lineStyle(3, isFromBase ? 0xff6600 : 0xffaa00);
        explosion.strokeCircle(x, y, explosionSize);
        
        // Enhanced explosion animation with better scaling
        this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: isFromBase ? 3.5 : 3.0,
            scaleY: isFromBase ? 3.5 : 3.0,
            duration: 450,
            ease: 'Power2.out',
            onComplete: () => explosion.destroy()
        });
        
        // Secondary explosion ring for extra impact
        const ring = this.add.graphics();
        ring.lineStyle(4, isFromBase ? 0xffcc00 : 0xff8800, 0.8);
        ring.strokeCircle(x, y, explosionSize - 5);
        
        this.tweens.add({
            targets: ring,
            scaleX: isFromBase ? 4.0 : 3.5,
            scaleY: isFromBase ? 4.0 : 3.5,
            alpha: 0,
            duration: 600,
            ease: 'Power2.out',
            onComplete: () => ring.destroy()
        });
        
        // Enhanced sparks effect with better distribution
        const sparkCount = isFromBase ? 12 : 8;
        for (let i = 0; i < sparkCount; i++) {
            const spark = this.add.graphics();
            spark.fillStyle(isFromBase ? 0xffcc00 : 0xffff00, 0.9);
            spark.fillCircle(x, y, isFromBase ? 4 : 3);
            
            const sparkAngle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
            const sparkDistance = GameHelpers.randomInt(isFromBase ? 35 : 25, isFromBase ? 60 : 45);
            const sparkX = x + Math.cos(sparkAngle) * sparkDistance;
            const sparkY = y + Math.sin(sparkAngle) * sparkDistance;
            
            this.tweens.add({
                targets: spark,
                x: sparkX,
                y: sparkY,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: 350 + Math.random() * 200,
                ease: 'Power2.out',
                onComplete: () => spark.destroy()
            });
        }
        
        // Enhanced damage number with better animation
        const damageColor = isFromBase ? '#ffaa00' : '#ff0000';
        const damageText = this.add.text(x, y - 25, `-${Math.floor(damage)}`, {
            fontSize: isFromBase ? '20px' : '18px',
            fill: damageColor,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Bounce effect for damage numbers
        this.tweens.add({
            targets: damageText,
            y: damageText.y - 40,
            scaleX: { from: 0.5, to: 1.2 },
            scaleY: { from: 0.5, to: 1.2 },
            alpha: 0,
            duration: 1200,
            ease: 'Back.out',
            onComplete: () => damageText.destroy()
        });
        
        // Audio feedback
        this.playHitSound(isFromBase, damage);
    }

    playHitSound(isFromBase, damage) {
        // Enhanced audio feedback based on hit type and damage
        if (isFromBase) {
            // Base/turret hit - deeper, more impactful sounds
            if (damage > 50) {
                console.log('🔊 Playing: Heavy Cannon Impact');
                // this.sound.play('heavyCannonHit', { volume: 0.7 });
            } else {
                console.log('🔊 Playing: Cannon Impact');
                // this.sound.play('cannonHit', { volume: 0.6 });
            }
        } else {
            // Tank hit - metallic impact sounds
            if (damage > 80) {
                console.log('🔊 Playing: Armor Penetration');
                // this.sound.play('armorPenetration', { volume: 0.8 });
            } else if (damage > 40) {
                console.log('🔊 Playing: Heavy Tank Hit');
                // this.sound.play('heavyTankHit', { volume: 0.6 });
            } else {
                console.log('🔊 Playing: Tank Hit');
                // this.sound.play('tankHit', { volume: 0.5 });
            }
        }
    }

    createExplosionEffect(x, y, scale = 1.0) {
        // Large explosion effect for tank/building destruction
        const explosionSize = 30 * scale;
        
        // Main explosion blast
        const explosion = this.add.graphics();
        explosion.fillStyle(0xff4400, 0.95);
        explosion.fillCircle(x, y, explosionSize);
        explosion.lineStyle(4, 0xffaa00);
        explosion.strokeCircle(x, y, explosionSize);
        
        // Explosion animation with powerful scaling
        this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: 4.0 * scale,
            scaleY: 4.0 * scale,
            duration: 600,
            ease: 'Power2.out',
            onComplete: () => explosion.destroy()
        });
        
        // Secondary shockwave ring
        const shockwave = this.add.graphics();
        shockwave.lineStyle(6, 0xff6600, 0.8);
        shockwave.strokeCircle(x, y, explosionSize - 8);
        
        this.tweens.add({
            targets: shockwave,
            scaleX: 5.0 * scale,
            scaleY: 5.0 * scale,
            alpha: 0,
            duration: 800,
            ease: 'Power2.out',
            onComplete: () => shockwave.destroy()
        });
        
        // Debris particles for destruction effect
        const debrisCount = Math.floor(15 * scale);
        for (let i = 0; i < debrisCount; i++) {
            const debris = this.add.graphics();
            debris.fillStyle(0x666666, 0.9);
            debris.fillRect(x - 3, y - 3, 6, 6);
            
            const debrisAngle = (Math.PI * 2 * i) / debrisCount + (Math.random() - 0.5) * 0.8;
            const debrisDistance = GameHelpers.randomInt(40, 80) * scale;
            const debrisX = x + Math.cos(debrisAngle) * debrisDistance;
            const debrisY = y + Math.sin(debrisAngle) * debrisDistance;
            
            this.tweens.add({
                targets: debris,
                x: debrisX,
                y: debrisY,
                rotation: Math.random() * Math.PI * 2,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: 400 + Math.random() * 300,
                ease: 'Power2.out',
                onComplete: () => debris.destroy()
            });
        }
        
        // Fire sparks effect
        const sparkCount = Math.floor(20 * scale);
        for (let i = 0; i < sparkCount; i++) {
            const spark = this.add.graphics();
            spark.fillStyle(0xffdd00, 0.9);
            spark.fillCircle(x, y, 3);
            
            const sparkAngle = Math.random() * Math.PI * 2;
            const sparkDistance = GameHelpers.randomInt(50, 100) * scale;
            const sparkX = x + Math.cos(sparkAngle) * sparkDistance;
            const sparkY = y + Math.sin(sparkAngle) * sparkDistance;
            
            this.tweens.add({
                targets: spark,
                x: sparkX,
                y: sparkY,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: 500 + Math.random() * 300,
                ease: 'Power2.out',
                onComplete: () => spark.destroy()
            });
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

    playExplosionSound(size = 'medium') {
        // Different explosion sounds based on size/impact
        switch (size) {
            case 'small':
                console.log('🔊 Playing: Small Explosion');
                // this.sound.play('smallExplosion', { volume: 0.4 });
                break;
            case 'medium':
                console.log('🔊 Playing: Medium Explosion');
                // this.sound.play('mediumExplosion', { volume: 0.6 });
                break;
            case 'large':
                console.log('🔊 Playing: Large Explosion');
                // this.sound.play('largeExplosion', { volume: 0.8 });
                break;
            case 'building':
                console.log('🔊 Playing: Building Destruction');
                // this.sound.play('buildingDestroyed', { volume: 0.9 });
                break;
        }
    }

    playUISound(action) {
        // UI feedback sounds
        switch (action) {
            case 'deploy':
                console.log('🔊 Playing: Tank Deploy');
                // this.sound.play('tankDeploy', { volume: 0.3 });
                break;
            case 'select':
                console.log('🔊 Playing: UI Select');
                // this.sound.play('uiSelect', { volume: 0.2 });
                break;
            case 'error':
                console.log('🔊 Playing: Error Beep');
                // this.sound.play('errorBeep', { volume: 0.3 });
                break;
            case 'victory':
                console.log('🔊 Playing: Victory Fanfare');
                // this.sound.play('victoryFanfare', { volume: 0.8 });
                break;
            case 'defeat':
                console.log('🔊 Playing: Defeat Sound');
                // this.sound.play('defeatSound', { volume: 0.6 });
                break;
        }
    }

    destroyTower(tower) {
        // Update tower stats
        if (tower.isPlayerBase) {
            this.towerStats.enemy.towersDestroyed++;
            if (tower.isMainTower) {
                this.towerStats.enemy.mainTowerDestroyed = true;
            } else if (tower.towerType === 'left') {
                this.towerStats.enemy.leftTowerDestroyed = true;
            } else if (tower.towerType === 'right') {
                this.towerStats.enemy.rightTowerDestroyed = true;
            }
        } else {
            this.towerStats.player.towersDestroyed++;
            if (tower.isMainTower) {
                this.towerStats.player.mainTowerDestroyed = true;
            } else if (tower.towerType === 'left') {
                this.towerStats.player.leftTowerDestroyed = true;
            } else if (tower.towerType === 'right') {
                this.towerStats.player.rightTowerDestroyed = true;
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
        
        // Create enhanced victory/defeat overlay with statistics
        this.createEnhancedBattleResultScreen(result);
    }

    createEnhancedBattleResultScreen(result) {
        // Dark overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        overlay.setScrollFactor(0);
        overlay.setDepth(100);
        
        // Result container
        const container = this.add.container(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
        container.setScrollFactor(0);
        container.setDepth(101);
        
        // Enhanced result background
        const resultBg = this.add.graphics();
        resultBg.fillStyle(result === 'victory' ? 0x004400 : 0x440000, 0.95);
        resultBg.fillRoundedRect(-300, -250, 600, 500, 25);
        resultBg.lineStyle(6, result === 'victory' ? 0x00ff00 : 0xff0000);
        resultBg.strokeRoundedRect(-300, -250, 600, 500, 25);
        container.add(resultBg);
        
        // Title text with enhanced effects
        let titleText, titleColor;
        if (result === 'victory') {
            titleText = 'VICTORY!';
            titleColor = '#00ff00';
        } else if (result === 'defeat') {
            titleText = 'DEFEAT!';
            titleColor = '#ff0000';
        } else if (result === 'time') {
            // Determine winner based on base health or other criteria
            const playerBase = this.buildings.find(b => b.isPlayerBase);
            const enemyBase = this.buildings.find(b => !b.isPlayerBase);
            
            if (!playerBase && !enemyBase) {
                titleText = 'DRAW!';
                titleColor = '#ffff00';
            } else if (!playerBase) {
                titleText = 'DEFEAT!';
                titleColor = '#ff0000';
                result = 'defeat';
            } else if (!enemyBase) {
                titleText = 'VICTORY!';
                titleColor = '#00ff00';
                result = 'victory';
            } else {
                // Compare base health percentages
                const playerHealthPercent = playerBase.health / playerBase.maxHealth;
                const enemyHealthPercent = enemyBase.health / enemyBase.maxHealth;
                
                if (playerHealthPercent > enemyHealthPercent) {
                    titleText = 'VICTORY!';
                    titleColor = '#00ff00';
                    result = 'victory';
                } else if (enemyHealthPercent > playerHealthPercent) {
                    titleText = 'DEFEAT!';
                    titleColor = '#ff0000';
                    result = 'defeat';
                } else {
                    titleText = 'DRAW!';
                    titleColor = '#ffff00';
                }
            }
        }
        
        const title = this.add.text(0, -200, titleText, {
            fontSize: '48px',
            fill: titleColor,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        container.add(title);
        
        // Calculate battle statistics
        const battleDuration = (this.battleStats.battle.endTime - this.battleStats.battle.startTime) / 1000; // Convert to seconds
        const playerAccuracy = this.battleStats.player.shotsFired > 0 ? 
            ((this.battleStats.player.shotsHit / this.battleStats.player.shotsFired) * 100).toFixed(1) : 0;
        const aiAccuracy = this.battleStats.ai.shotsFired > 0 ? 
            ((this.battleStats.ai.shotsHit / this.battleStats.ai.shotsFired) * 100).toFixed(1) : 0;
        
        // Battle Statistics Header
        const statsTitle = this.add.text(0, -140, 'BATTLE STATISTICS', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(statsTitle);
        
        // Create two-column statistics display
        const leftColumn = [];
        const rightColumn = [];
        
        // Player stats (left column)
        leftColumn.push('PLAYER PERFORMANCE');
        leftColumn.push(`Tanks Deployed: ${this.battleStats.player.tanksDeployed}`);
        leftColumn.push(`Tanks Destroyed: ${this.battleStats.player.tanksDestroyed}`);
        leftColumn.push(`Tanks Lost: ${this.battleStats.player.tanksLost}`);
        leftColumn.push(`Accuracy: ${playerAccuracy}%`);
        leftColumn.push(`Damage Dealt: ${this.battleStats.player.totalDamageDealt.toLocaleString()}`);
        leftColumn.push(`Damage Taken: ${this.battleStats.player.totalDamageTaken.toLocaleString()}`);
        leftColumn.push(`Critical Hits: ${this.battleStats.player.criticalHits}`);
        leftColumn.push(`Energy Spent: ${this.battleStats.player.energySpent}`);
        
        // AI stats (right column)
        rightColumn.push('AI PERFORMANCE');
        rightColumn.push(`Tanks Deployed: ${this.battleStats.ai.tanksDeployed}`);
        rightColumn.push(`Tanks Destroyed: ${this.battleStats.ai.tanksDestroyed}`);
        rightColumn.push(`Tanks Lost: ${this.battleStats.ai.tanksLost}`);
        rightColumn.push(`Accuracy: ${aiAccuracy}%`);
        rightColumn.push(`Damage Dealt: ${this.battleStats.ai.totalDamageDealt.toLocaleString()}`);
        rightColumn.push(`Damage Taken: ${this.battleStats.ai.totalDamageTaken.toLocaleString()}`);
        rightColumn.push(`Critical Hits: ${this.battleStats.ai.criticalHits}`);
        rightColumn.push(`Energy Spent: ${this.battleStats.ai.energySpent}`);
        
        // Display left column
        leftColumn.forEach((text, index) => {
            const isHeader = index === 0;
            const yPos = -100 + (index * 20);
            const textColor = isHeader ? '#00aaff' : '#ffffff';
            const fontSize = isHeader ? '16px' : '14px';
            
            const statText = this.add.text(-140, yPos, text, {
                fontSize: fontSize,
                fill: textColor,
                fontFamily: 'Arial',
                fontStyle: isHeader ? 'bold' : 'normal'
            }).setOrigin(0, 0.5);
            container.add(statText);
        });
        
        // Display right column
        rightColumn.forEach((text, index) => {
            const isHeader = index === 0;
            const yPos = -100 + (index * 20);
            const textColor = isHeader ? '#ff6666' : '#ffffff';
            const fontSize = isHeader ? '16px' : '14px';
            
            const statText = this.add.text(20, yPos, text, {
                fontSize: fontSize,
                fill: textColor,
                fontFamily: 'Arial',
                fontStyle: isHeader ? 'bold' : 'normal'
            }).setOrigin(0, 0.5);
            container.add(statText);
        });
        
        // Battle Summary at bottom
        const summaryText = `Battle Duration: ${Math.floor(battleDuration / 60)}:${(battleDuration % 60).toFixed(0).padStart(2, '0')}`;
        const summary = this.add.text(0, 110, summaryText, {
            fontSize: '16px',
            fill: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        container.add(summary);
        
        if (this.overtimeActive) {
            const overtimeText = this.add.text(0, 130, 'OVERTIME ACTIVATED!', {
                fontSize: '14px',
                fill: '#ff4444',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(overtimeText);
        }
        
        // Continue button with hover effect
        const continueBtn = this.add.text(0, 180, 'Click to Continue', {
            fontSize: '20px',
            fill: '#ffff00',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(continueBtn);
        
        // Add pulsing effect to continue button
        this.tweens.add({
            targets: continueBtn,
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Animate entrance
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.out'
        });
        
        // Make the entire screen clickable to continue
        overlay.setInteractive();
        container.setInteractive(new Phaser.Geom.Rectangle(-300, -250, 600, 500), Phaser.Geom.Rectangle.Contains);
        
        const clickHandler = () => {
            // Update player progress
            if (result === 'victory') {
                this.gameState.player.experience += 100;
                this.gameState.player.wins++;
            } else if (result === 'defeat') {
                this.gameState.player.experience += 25;
                this.gameState.player.losses++;
            }
            
            // Save battle statistics to game state for potential future features
            this.gameState.lastBattleStats = this.battleStats;
            
            this.scene.start('MenuScene', { gameState: this.gameState });
        };
        
        // Add click handlers to both overlay and container for better reliability
        overlay.once('pointerdown', clickHandler);
        container.once('pointerdown', clickHandler);
        
        // Also add input listener for any key press or click anywhere on screen
        this.input.once('pointerdown', clickHandler);
        this.input.keyboard.once('keydown', clickHandler);
    }
}
