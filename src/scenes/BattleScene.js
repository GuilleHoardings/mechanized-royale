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
        this.selectedTank = null;
        this.cameraSpeed = 5;
        this.deploymentMode = true; // Toggle between deployment and movement modes
        
        // Card deck system
        this.deck = [...this.gameState.player.tanks]; // Copy player's tanks
        this.hand = [];
        this.nextCardIndex = 0;
        this.initializeDeck();
    }

    create() {
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
        
        // Keyboard controls for camera
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        // Mode toggle key (Space)
        this.input.keyboard.on('keydown-SPACE', this.toggleMode, this);
    }

    createBattlefield() {
        // Set world bounds larger than viewport for camera movement
        this.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
        this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

        // Simple grid background
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x556b2f, 0.3);
        
        // Vertical lines
        for (let x = 0; x <= GAME_CONFIG.WORLD_WIDTH; x += 50) {
            graphics.lineBetween(x, 0, x, GAME_CONFIG.WORLD_HEIGHT - 100); // -100 for UI space
        }
        
        // Horizontal lines
        for (let y = 0; y <= GAME_CONFIG.WORLD_HEIGHT - 100; y += 50) {
            graphics.lineBetween(0, y, GAME_CONFIG.WORLD_WIDTH, y);
        }

        // Deployment zones
        graphics.lineStyle(2, 0x00ff00, 0.8);
        const playerZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.PLAYER;
        graphics.strokeRect(playerZone.x, playerZone.y, playerZone.width, playerZone.height);
        
        graphics.lineStyle(2, 0xff0000, 0.8);
        const enemyZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
        graphics.strokeRect(enemyZone.x, enemyZone.y, enemyZone.width, enemyZone.height);
    }

    createUI() {
        const uiY = GAME_CONFIG.HEIGHT - 100;
        
        // UI background - fixed to camera
        const uiGraphics = this.add.graphics();
        uiGraphics.fillStyle(0x1a1a1a, 0.9);
        uiGraphics.fillRect(0, uiY, GAME_CONFIG.WIDTH, 100);
        uiGraphics.setScrollFactor(0); // Fixed to camera

        // Energy bar
        this.energyBarBg = this.add.graphics();
        this.energyBarBg.fillStyle(0x333333);
        this.energyBarBg.fillRect(20, uiY + 20, 200, 20);
        this.energyBarBg.setScrollFactor(0);

        this.energyBarFill = this.add.graphics();
        this.energyBarFill.setScrollFactor(0);
        this.updateEnergyBar();

        // Energy text
        this.energyText = this.add.text(230, uiY + 22, `${this.energy}/${this.maxEnergy}`, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.energyText.setScrollFactor(0);

        // Battle timer
        this.timerText = this.add.text(GAME_CONFIG.WIDTH - 100, uiY + 20, this.formatTime(this.battleTime), {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.timerText.setScrollFactor(0);

        // Tank cards (placeholder for now)
        this.createTankCards(uiY);

        // Mode indicator
        this.modeText = this.add.text(GAME_CONFIG.WIDTH / 2, uiY + 10, 'DEPLOY MODE - Press SPACE to toggle', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.modeText.setScrollFactor(0);

        // Camera instructions
        const instructionsText = this.add.text(GAME_CONFIG.WIDTH - 200, 50, 'Camera: Arrow Keys or WASD', {
            fontSize: '12px',
            fill: '#cccccc',
            fontFamily: 'Arial'
        });
        instructionsText.setScrollFactor(0);

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

    createTankCards(uiY) {
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

            // Tank icon (simplified)
            let tankTexture = 'tank_light';
            if (tankData.type === TANK_TYPES.MEDIUM) tankTexture = 'tank_medium';
            if (tankData.type === TANK_TYPES.HEAVY) tankTexture = 'tank_heavy';

            const tankIcon = this.add.image(cardX + cardWidth/2, cardY + 20, tankTexture)
                .setScale(0.8)
                .setOrigin(0.5);
            tankIcon.setScrollFactor(0);

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
                card.container.setTint(0xffff00);
                // Highlight border
                if (!card.selectionBorder) {
                    card.selectionBorder = this.add.graphics();
                    card.selectionBorder.setScrollFactor(0);
                }
                card.selectionBorder.clear();
                card.selectionBorder.lineStyle(3, 0xffff00);
                card.selectionBorder.strokeRect(card.container.x - 2, card.container.y - 2, 84, 64);
            } else {
                card.container.clearTint();
                if (card.selectionBorder) {
                    card.selectionBorder.clear();
                }
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
        // Player base
        const playerBase = this.add.image(150, 500, 'base');
        playerBase.health = 1000;
        playerBase.maxHealth = 1000;
        playerBase.isPlayerBase = true;
        this.buildings.push(playerBase);

        // Enemy base
        const enemyBase = this.add.image(1050, 150, 'base');
        enemyBase.health = 1000;
        enemyBase.maxHealth = 1000;
        enemyBase.isPlayerBase = false;
        this.buildings.push(enemyBase);

        // Health bars for bases
        this.createHealthBars();
    }

    createHealthBars() {
        this.buildings.forEach(building => {
            // Health bar background
            const healthBg = this.add.graphics();
            healthBg.fillStyle(0x333333);
            healthBg.fillRect(building.x - 40, building.y - 50, 80, 8);
            building.healthBg = healthBg;

            // Health bar fill
            const healthFill = this.add.graphics();
            building.healthFill = healthFill;
            this.updateBuildingHealth(building);
        });
    }

    updateBuildingHealth(building) {
        const healthPercent = building.health / building.maxHealth;
        building.healthFill.clear();
        building.healthFill.fillStyle(healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000);
        building.healthFill.fillRect(building.x - 40, building.y - 50, 80 * healthPercent, 8);
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
        this.energyBarFill.clear();
        this.energyBarFill.fillStyle(0x4a90e2);
        this.energyBarFill.fillRect(20, GAME_CONFIG.HEIGHT - 80, 200 * energyPercent, 20);
        
        if (this.energyText) {
            this.energyText.setText(`${this.energy}/${this.maxEnergy}`);
        }
    }

    startBattleTimer() {
        this.battleTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.battleTime--;
                this.timerText.setText(this.formatTime(this.battleTime));
                
                if (this.battleTime <= 0) {
                    this.endBattle('time');
                }
            },
            loop: true
        });
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    onBattlefieldClick(pointer) {
        if (this.deploymentMode) {
            // Deployment mode - only allow deployment in player zone
            const playerZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.PLAYER;
            if (!GameHelpers.pointInRect(pointer.x, pointer.y, playerZone.x, playerZone.y, playerZone.width, playerZone.height)) {
                return;
            }

            // Deploy selected tank if we have enough energy
            const selectedCardData = this.tankCards[this.selectedCard];
            if (this.energy >= selectedCardData.tankData.cost) {
                this.deployTank(selectedCardData.tankId, pointer.x, pointer.y);
                this.energy -= selectedCardData.tankData.cost;
                this.updateEnergyBar();
                
                // Cycle the used card
                this.cycleCard(this.selectedCard);
            } else {
                // Visual feedback for insufficient energy
                this.showInsufficientEnergyFeedback();
            }
        } else {
            // Movement mode - select tank or move selected tank
            const clickedTank = this.getTankAtPosition(pointer.x, pointer.y);
            
            if (clickedTank && clickedTank.isPlayerTank) {
                // Select this tank
                this.selectTank(clickedTank);
            } else if (this.selectedTank) {
                // Move selected tank to clicked position
                this.moveSelectedTankTo(pointer.x, pointer.y);
            }
        }
    }

    deployTank(tankId, x, y) {
        const tankData = TANK_DATA[tankId];
        
        // Determine tank texture
        let tankTexture = 'tank_light';
        if (tankData.type === TANK_TYPES.MEDIUM) tankTexture = 'tank_medium';
        if (tankData.type === TANK_TYPES.HEAVY) tankTexture = 'tank_heavy';

        // Create tank sprite
        const tank = this.add.image(x, y, tankTexture);
        tank.setOrigin(0.5);
        
        // Tank properties
        tank.tankId = tankId;
        tank.tankData = tankData;
        tank.health = tankData.stats.hp;
        tank.maxHealth = tankData.stats.hp;
        tank.isPlayerTank = true;
        tank.target = null;
        tank.lastShotTime = 0;
        tank.moveTarget = null; // For manual movement
        tank.manualControl = false; // Whether tank is under manual control
        tank.lastTargetUpdate = 0; // For AI target selection

        // AI behavior: find best target (closest enemy or enemy base)
        this.updateTankAI(tank);

        this.tanks.push(tank);
        
        // Create health bar for tank
        this.createTankHealthBar(tank);
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

        // Calculate movement direction
        const targetAngle = GameHelpers.angle(tank.x, tank.y, targetPos.x, targetPos.y);
        const speed = tank.tankData.stats.speed / 60; // Convert to pixels per frame
        
        // Apply movement with avoidance
        const moveX = Math.cos(targetAngle) * speed + avoidanceX * 0.1;
        const moveY = Math.sin(targetAngle) * speed + avoidanceY * 0.1;
        
        tank.x += moveX;
        tank.y += moveY;
        
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

        tank.moving = true;
    }

    startAI() {
        // AI configuration
        this.aiEnergy = ENERGY_CONFIG.STARTING_ENERGY;
        this.aiMaxEnergy = ENERGY_CONFIG.MAX_ENERGY;
        this.aiDeck = ['tank_light_1', 'tank_medium_1', 'tank_heavy_1', 'tank_light_1'];
        this.aiNextDeployment = this.time.now + GameHelpers.randomInt(3000, 6000);
        
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
        
        // Check if AI should deploy a tank
        if (currentTime >= this.aiNextDeployment && this.aiEnergy >= 2) {
            this.aiDeployTank();
            // Schedule next deployment
            this.aiNextDeployment = currentTime + GameHelpers.randomInt(4000, 8000);
        }
    }

    aiDeployTank() {
        // Choose a random tank from AI deck
        const tankId = this.aiDeck[Math.floor(Math.random() * this.aiDeck.length)];
        const tankData = TANK_DATA[tankId];
        
        if (this.aiEnergy < tankData.cost) return; // Not enough energy
        
        // Deploy in enemy zone
        const enemyZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
        const deployX = enemyZone.x + Math.random() * enemyZone.width;
        const deployY = enemyZone.y + Math.random() * enemyZone.height;
        
        // Create AI tank
        this.deployAITank(tankId, deployX, deployY);
        this.aiEnergy -= tankData.cost;
    }

    deployAITank(tankId, x, y) {
        const tankData = TANK_DATA[tankId];
        
        // Determine tank texture
        let tankTexture = 'tank_light';
        if (tankData.type === TANK_TYPES.MEDIUM) tankTexture = 'tank_medium';
        if (tankData.type === TANK_TYPES.HEAVY) tankTexture = 'tank_heavy';

        // Create tank sprite
        const tank = this.add.image(x, y, tankTexture);
        tank.setOrigin(0.5);
        tank.setTint(0xff6666); // Red tint for enemy tanks
        
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

        // AI behavior: target player base and tanks
        this.updateTankAI(tank);

        this.tanks.push(tank);
        
        // Create health bar for tank
        this.createTankHealthBar(tank);
    }

    update() {
        // Handle camera movement
        this.handleCameraMovement();
        
        // Update AI
        this.updateAI();
        
        // Update all tanks
        this.tanks.forEach(tank => {
            if (tank.health > 0) {
                this.updateTankMovement(tank);
                this.checkTankCombat(tank);
            }
        });

        // Remove destroyed tanks
        this.tanks = this.tanks.filter(tank => {
            if (tank.health <= 0) {
                // If this was the selected tank, deselect it
                if (this.selectedTank === tank) {
                    this.selectedTank = null;
                }
                
                tank.destroy();
                if (tank.healthBg) tank.healthBg.destroy();
                if (tank.healthFill) tank.healthFill.destroy();
                if (tank.selectionCircle) tank.selectionCircle.destroy();
                return false;
            }
            return true;
        });
    }

    toggleMode() {
        this.deploymentMode = !this.deploymentMode;
        const modeText = this.deploymentMode ? 'DEPLOY MODE - Press SPACE to toggle' : 'MOVE MODE - Press SPACE to toggle';
        this.modeText.setText(modeText);
        
        // Clear selection when switching modes
        if (this.selectedTank) {
            this.selectTank(null);
        }
    }

    handleCameraMovement() {
        const camera = this.cameras.main;
        
        // Arrow keys or WASD movement
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            camera.scrollX -= this.cameraSpeed;
        }
        if (this.cursors.right.isDown || this.wasd.D.isDown) {
            camera.scrollX += this.cameraSpeed;
        }
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            camera.scrollY -= this.cameraSpeed;
        }
        if (this.cursors.down.isDown || this.wasd.S.isDown) {
            camera.scrollY += this.cameraSpeed;
        }

        // Keep camera within world bounds
        const maxScrollX = GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.WIDTH;
        const maxScrollY = GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.HEIGHT;
        
        camera.scrollX = GameHelpers.clamp(camera.scrollX, 0, maxScrollX);
        camera.scrollY = GameHelpers.clamp(camera.scrollY, 0, maxScrollY);
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

    selectTank(tank) {
        // Remove previous selection
        if (this.selectedTank && this.selectedTank.selectionCircle) {
            this.selectedTank.selectionCircle.destroy();
            this.selectedTank.selectionCircle = null;
        }

        this.selectedTank = tank;

        if (tank) {
            // Create selection indicator
            const selectionCircle = this.add.graphics();
            selectionCircle.lineStyle(3, 0xffff00);
            selectionCircle.strokeCircle(tank.x, tank.y, 35);
            tank.selectionCircle = selectionCircle;

            // Put tank under manual control
            tank.manualControl = true;
            tank.moveTarget = null;
        }
    }

    moveSelectedTankTo(x, y) {
        if (!this.selectedTank) return;

        // Set manual movement target
        this.selectedTank.moveTarget = { x: x, y: y };
        this.selectedTank.manualControl = true;

        // Update selection circle position over time
        if (this.selectedTank.selectionCircle) {
            this.selectedTank.selectionCircle.destroy();
            const selectionCircle = this.add.graphics();
            selectionCircle.lineStyle(3, 0xffff00);
            selectionCircle.strokeCircle(this.selectedTank.x, this.selectedTank.y, 35);
            this.selectedTank.selectionCircle = selectionCircle;
        }

        // Visual feedback for move target
        this.createMoveTargetIndicator(x, y);
    }

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
        
        // Update tank icon
        let tankTexture = 'tank_light';
        if (tankData.type === TANK_TYPES.MEDIUM) tankTexture = 'tank_medium';
        if (tankData.type === TANK_TYPES.HEAVY) tankTexture = 'tank_heavy';
        
        card.icon.setTexture(tankTexture);
        
        // Update cost
        card.cost.setText(tankData.cost);
        
        // Update stored data
        card.tankId = tankId;
        card.tankData = tankData;
        
        // Brief highlight animation to show card changed
        this.tweens.add({
            targets: card.container,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
        });
    }

    showInsufficientEnergyFeedback() {
        // Flash the energy bar red
        this.energyBarFill.clear();
        this.energyBarFill.fillStyle(0xff0000);
        this.energyBarFill.fillRect(20, GAME_CONFIG.HEIGHT - 80, 200 * (this.energy / this.maxEnergy), 20);
        
        // Flash the selected card
        const selectedCard = this.tankCards[this.selectedCard];
        this.tweens.add({
            targets: selectedCard.container,
            tint: 0xff0000,
            duration: 200,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                selectedCard.container.clearTint();
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
            
            // Find closest enemy target
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            // Check enemy tanks first (higher priority)
            const enemyTanks = this.tanks.filter(t => !t.isPlayerTank && t.health > 0);
            enemyTanks.forEach(enemy => {
                const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
                if (distance < closestDistance && distance <= tank.tankData.stats.range * 2) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            });
            
            // If no enemy tanks in range, target enemy buildings
            if (!closestEnemy) {
                const enemyBuildings = this.buildings.filter(b => !b.isPlayerBase && b.health > 0);
                enemyBuildings.forEach(building => {
                    const distance = GameHelpers.distance(tank.x, tank.y, building.x, building.y);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = building;
                    }
                });
            }
            
            tank.target = closestEnemy;
        }
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
            this.tankShoot(tank, tank.target);
            tank.lastShotTime = currentTime;
        }
    }

    tankShoot(attacker, target) {
        // Simple damage calculation for now
        const damage = attacker.tankData.stats.damage;
        
        // Deal damage to target
        if (target.health) {
            target.health = Math.max(0, target.health - damage);
            
            if (target.healthFill) {
                this.updateTankHealth ? this.updateTankHealth(target) : this.updateBuildingHealth(target);
            }

            // Check if target is destroyed
            if (target.health <= 0) {
                if (target.isPlayerBase !== undefined) {
                    // Base destroyed - end battle
                    this.endBattle(target.isPlayerBase ? 'defeat' : 'victory');
                }
            }

            // Visual feedback
            this.createHitEffect(target.x, target.y);
        }
    }

    createHitEffect(x, y) {
        const effect = this.add.graphics();
        effect.fillStyle(0xff4444);
        effect.fillCircle(x, y, 10);
        
        this.tweens.add({
            targets: effect,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 300,
            onComplete: () => effect.destroy()
        });
    }

    endBattle(result) {
        // Stop timers
        if (this.energyTimer) this.energyTimer.remove();
        if (this.battleTimer) this.battleTimer.remove();
        if (this.aiEnergyTimer) this.aiEnergyTimer.remove();

        // Show result
        const resultText = result === 'victory' ? 'VICTORY!' : 
                          result === 'defeat' ? 'DEFEAT!' : 'TIME UP!';
        
        const resultColor = result === 'victory' ? '#00ff00' : '#ff0000';

        this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, resultText, {
            fontSize: '48px',
            fill: resultColor,
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Return to menu after delay
        this.time.delayedCall(3000, () => {
            this.scene.start('MenuScene');
        });
    }
}
