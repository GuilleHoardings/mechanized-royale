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
    }

    createBattlefield() {
        // Simple grid background
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x556b2f, 0.3);
        
        // Vertical lines
        for (let x = 0; x <= GAME_CONFIG.WIDTH; x += 50) {
            graphics.lineBetween(x, 0, x, GAME_CONFIG.HEIGHT - 100); // -100 for UI space
        }
        
        // Horizontal lines
        for (let y = 0; y <= GAME_CONFIG.HEIGHT - 100; y += 50) {
            graphics.lineBetween(0, y, GAME_CONFIG.WIDTH, y);
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
        
        // UI background
        const uiGraphics = this.add.graphics();
        uiGraphics.fillStyle(0x1a1a1a, 0.9);
        uiGraphics.fillRect(0, uiY, GAME_CONFIG.WIDTH, 100);

        // Energy bar
        this.energyBarBg = this.add.graphics();
        this.energyBarBg.fillStyle(0x333333);
        this.energyBarBg.fillRect(20, uiY + 20, 200, 20);

        this.energyBarFill = this.add.graphics();
        this.updateEnergyBar();

        // Energy text
        this.energyText = this.add.text(230, uiY + 22, `${this.energy}/${this.maxEnergy}`, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });

        // Battle timer
        this.timerText = this.add.text(GAME_CONFIG.WIDTH - 100, uiY + 20, this.formatTime(this.battleTime), {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });

        // Tank cards (placeholder for now)
        this.createTankCards(uiY);

        // Back button
        const backButton = this.add.text(20, 20, '← MENU', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setInteractive();

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

            // Tank icon (simplified)
            let tankTexture = 'tank_light';
            if (tankData.type === TANK_TYPES.MEDIUM) tankTexture = 'tank_medium';
            if (tankData.type === TANK_TYPES.HEAVY) tankTexture = 'tank_heavy';

            const tankIcon = this.add.image(cardX + cardWidth/2, cardY + 20, tankTexture)
                .setScale(0.8)
                .setOrigin(0.5);

            // Cost
            const costText = this.add.text(cardX + cardWidth - 10, cardY + cardHeight - 10, tankData.cost, {
                fontSize: '14px',
                fill: '#ffff00',
                fontFamily: 'Arial'
            }).setOrigin(1);

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
        const playerBase = this.add.image(100, 500, 'base');
        playerBase.health = 1000;
        playerBase.maxHealth = 1000;
        playerBase.isPlayerBase = true;
        this.buildings.push(playerBase);

        // Enemy base
        const enemyBase = this.add.image(700, 100, 'base');
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
        // Only allow deployment in player zone
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

        // Simple AI: move towards enemy base
        const enemyBase = this.buildings.find(b => !b.isPlayerBase);
        if (enemyBase) {
            tank.target = enemyBase;
            this.moveTankToTarget(tank);
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
        if (!tank.target) return;

        const distance = GameHelpers.distance(tank.x, tank.y, tank.target.x, tank.target.y);
        const range = tank.tankData.stats.range;

        // If in range, stop and prepare to shoot
        if (distance <= range) {
            tank.moving = false;
            return;
        }

        // Move towards target
        const angle = GameHelpers.angle(tank.x, tank.y, tank.target.x, tank.target.y);
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

        tank.moving = true;
    }

    update() {
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
                tank.destroy();
                if (tank.healthBg) tank.healthBg.destroy();
                if (tank.healthFill) tank.healthFill.destroy();
                return false;
            }
            return true;
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
