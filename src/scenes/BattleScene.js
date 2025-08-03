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

        // Get player's available tanks
        const availableTanks = this.gameState.player.tanks.slice(0, 4); // First 4 tanks

        this.tankCards = [];
        availableTanks.forEach((tankId, index) => {
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

            // Store card info
            const cardInfo = {
                container: card,
                icon: tankIcon,
                cost: costText,
                tankId: tankId,
                tankData: tankData
            };

            this.tankCards.push(cardInfo);

            // Card click handler
            card.on('pointerdown', () => {
                this.selectTankCard(index);
            });
        });

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
            } else {
                card.container.clearTint();
            }
        });
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
                }
            },
            loop: true
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

        // Simple AI: move towards enemy base (only if not under manual control)
        const enemyBase = this.buildings.find(b => !b.isPlayerBase);
        if (enemyBase && !tank.manualControl) {
            tank.target = enemyBase;
        }

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

    moveTankToTarget(tank) {
        let targetPos = null;
        
        // Determine what to move towards
        if (tank.moveTarget && tank.manualControl) {
            // Manual movement target
            targetPos = tank.moveTarget;
        } else if (tank.target && !tank.manualControl) {
            // AI target (enemy base)
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

        // Move towards target
        const angle = GameHelpers.angle(tank.x, tank.y, targetPos.x, targetPos.y);
        const speed = tank.tankData.stats.speed / 60; // Convert to pixels per frame (assuming 60 FPS)
        
        tank.x += Math.cos(angle) * speed;
        tank.y += Math.sin(angle) * speed;
        
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

    update() {
        // Handle camera movement
        this.handleCameraMovement();
        
        // Update all tanks
        this.tanks.forEach(tank => {
            if (tank.health > 0) {
                this.moveTankToTarget(tank);
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
