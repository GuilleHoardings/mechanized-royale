/**
 * AIController - Handles AI strategy, decision-making, and tank behavior for Tank Tactics
 * Extracted from BattleScene to improve code organization
 */

class AIController {
    constructor(scene) {
        this.scene = scene;
        
        // Initialize AI state
        this.aiStrategy = {
            mode: 'balanced', // 'aggressive', 'defensive', 'balanced'
            playerTankCount: 0,
            baseHealthPercent: 1.0,
            rushMode: false,
            defensiveMode: false,
            preferredTankTypes: ['tank_medium_1', 'tank_light_1'],
            energyThreshold: 3 // Minimum energy to consider deployment
        };
        
        this.aiLastStrategyUpdate = 0;
        this.aiNextDeployment = 0;
    }

    /**
     * Main AI update method called each frame
     */
    updateAI() {
        // Don't update AI if battle has ended
        if (this.scene.battleEnded) {
            return;
        }
        
        const currentTime = this.scene.time.now;
        
        // Update AI strategy every 3 seconds
        if (currentTime - this.aiLastStrategyUpdate > 3000) {
            this.updateAIStrategy();
            this.aiLastStrategyUpdate = currentTime;
        }
        
        // Check if AI should deploy a tank (strategic timing)
        if (currentTime >= this.aiNextDeployment && this.scene.aiEnergy >= 1) {
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

    /**
     * Updates AI strategy based on battlefield conditions
     */
    updateAIStrategy() {
        // Analyze current battlefield situation
        const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const aiTanks = this.scene.tanks.filter(t => !t.isPlayerTank && t.health > 0);
        const playerBase = this.scene.buildings.find(b => b.isPlayerBase);
        const aiBase = this.scene.buildings.find(b => !b.isPlayerBase);
        
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
        } else if (this.scene.battleTime < 60) {
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

    /**
     * Updates the debug display for AI strategy
     */
    updateAIStrategyDisplay() {
        if (this.scene.aiStrategyText) {
            const strategyInfo = [
                `Mode: ${this.aiStrategy.mode.toUpperCase()}`,
                `Base HP: ${Math.round(this.aiStrategy.baseHealthPercent * 100)}%`,
                `Player Tanks: ${this.aiStrategy.playerTankCount}`,
                `Energy: ${this.scene.aiEnergy}`,
                `Preferred: ${this.aiStrategy.preferredTankTypes[0]?.replace('tank_', '')?.toUpperCase() || 'NONE'}`
            ];
            
            this.scene.aiStrategyText.setText(strategyInfo.join('\n'));
        }
    }

    /**
     * Determines if AI should deploy a tank based on current conditions
     * @returns {boolean} Whether AI should deploy
     */
    shouldAIDeploy() {
        const minEnergy = this.aiStrategy.energyThreshold;
        
        // Don't deploy if not enough energy
        if (this.scene.aiEnergy < minEnergy) {
            return false;
        }
        
        // Always deploy if we have lots of energy
        if (this.scene.aiEnergy >= 8) {
            return true;
        }
        
        // Strategic deployment based on current mode
        const playerTankCount = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0).length;
        const aiTankCount = this.scene.tanks.filter(t => !t.isPlayerTank && t.health > 0).length;
        
        switch (this.aiStrategy.mode) {
            case 'aggressive':
                return this.scene.aiEnergy >= 2; // Deploy quickly
            case 'defensive':
                return playerTankCount > aiTankCount && this.scene.aiEnergy >= 4; // React to player
            case 'balanced':
            default:
                return this.scene.aiEnergy >= 3 && (playerTankCount >= aiTankCount || Math.random() < 0.3);
        }
    }

    /**
     * Chooses and deploys an AI tank strategically
     */
    aiDeployTankStrategically() {
        // Choose which tank to deploy
        const tankId = this.chooseAITank();
        if (!tankId) {
            console.log('🤖 AI: No suitable tank available');
            return;
        }
        
        const tankData = TANK_DATA[tankId];
        if (!tankData) {
            console.log('🤖 AI: Invalid tank data for', tankId);
            return;
        }
        
        // Check if AI has enough energy
        if (this.scene.aiEnergy < tankData.cost) {
            console.log('🤖 AI: Not enough energy for', tankId, 'Cost:', tankData.cost, 'Have:', this.scene.aiEnergy);
            return;
        }
        
        // Choose deployment position
        const deploymentPos = this.chooseAIDeploymentPosition(tankData);
        if (!deploymentPos) {
            console.log('🤖 AI: No valid deployment position');
            return;
        }
        
        // Deploy the tank
        this.scene.deployAITank(tankId, deploymentPos.x, deploymentPos.y);
    }

    /**
     * Chooses which tank type the AI should deploy
     * @returns {string|null} Tank ID to deploy or null if none available
     */
    chooseAITank() {
        // Filter available tanks by energy cost and preferences
        const availableTanks = this.scene.aiDeck.filter(tankId => {
            const tankData = TANK_DATA[tankId];
            return tankData && tankData.cost <= this.scene.aiEnergy;
        });
        
        if (availableTanks.length === 0) {
            return null;
        }
        
        // Prioritize based on current strategy
        const preferredTanks = availableTanks.filter(tankId => 
            this.aiStrategy.preferredTankTypes.includes(tankId)
        );
        
        // Strategic tank selection
        let chosenTank;
        if (preferredTanks.length > 0) {
            // Use preferred tanks 70% of the time
            if (Math.random() < 0.7) {
                chosenTank = preferredTanks[Math.floor(Math.random() * preferredTanks.length)];
            } else {
                chosenTank = availableTanks[Math.floor(Math.random() * availableTanks.length)];
            }
        } else {
            // No preferred tanks available, choose from available
            chosenTank = availableTanks[Math.floor(Math.random() * availableTanks.length)];
        }
        
        // Counter-strategy adjustments
        const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const heavyPlayerTanks = playerTanks.filter(t => t.tankData.type === TANK_TYPES.HEAVY).length;
        const lightPlayerTanks = playerTanks.filter(t => t.tankData.type === TANK_TYPES.LIGHT).length;
        
        // If player has many heavy tanks, prefer tank destroyers
        if (heavyPlayerTanks >= 2 && availableTanks.includes('tank_destroyer_1')) {
            if (Math.random() < 0.4) {
                chosenTank = 'tank_destroyer_1';
            }
        }
        
        // If player has many light tanks, prefer area damage
        if (lightPlayerTanks >= 3 && availableTanks.includes('tank_artillery_1')) {
            if (Math.random() < 0.3) {
                chosenTank = 'tank_artillery_1';
            }
        }
        
        console.log('🤖 AI choosing tank:', chosenTank, 'Strategy:', this.aiStrategy.mode);
        return chosenTank;
    }

    /**
     * Chooses where to deploy an AI tank
     * @param {Object} tankData - Data for the tank being deployed
     * @returns {Object|null} Position {x, y} or null if no valid position
     */
    chooseAIDeploymentPosition(tankData) {
        const validPositions = [];
        const deploymentZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
        
        // Generate potential deployment positions
        for (let attempts = 0; attempts < 20; attempts++) {
            const tileX = GameHelpers.randomInt(deploymentZone.tileX, deploymentZone.tileX + deploymentZone.tilesWidth - 1);
            const tileY = GameHelpers.randomInt(deploymentZone.tileY, deploymentZone.tileY + deploymentZone.tilesHeight - 1);
            
            // Check if tile position is valid (within deployment zone)
            if (GameHelpers.isValidDeploymentTile(tileX, tileY, false, this.scene.expandedDeploymentZones)) {
                // Convert to world coordinates for position evaluation
                const worldPos = GameHelpers.tileToWorld(tileX, tileY);
                
                // Strategic positioning based on tank type and AI mode
                const position = this.evaluateDeploymentPosition(worldPos, tankData);
                if (position) {
                    validPositions.push(position);
                }
            }
        }
        
        if (validPositions.length === 0) {
            console.log('🤖 AI: No valid deployment positions found');
            return null;
        }
        
        // Sort positions by strategic value and choose the best one
        validPositions.sort((a, b) => b.strategicValue - a.strategicValue);
        return validPositions[0];
    }

    /**
     * Evaluates the strategic value of a deployment position
     * @param {Object} worldPos - World position {x, y}
     * @param {Object} tankData - Tank data
     * @returns {Object|null} Position with strategic value or null
     */
    evaluateDeploymentPosition(worldPos, tankData) {
        let strategicValue = 0;
        
        // Distance to player base (closer is generally better for offense)
        const playerBase = this.scene.buildings.find(b => b.isPlayerBase);
        if (playerBase) {
            const distanceToPlayerBase = GameHelpers.distance(worldPos.x, worldPos.y, playerBase.x, playerBase.y);
            strategicValue += (1000 - distanceToPlayerBase) / 10; // Closer = higher value
        }
        
        // Distance to friendly base (closer is better for defense)
        const aiBase = this.scene.buildings.find(b => !b.isPlayerBase);
        if (aiBase && this.aiStrategy.mode === 'defensive') {
            const distanceToAIBase = GameHelpers.distance(worldPos.x, worldPos.y, aiBase.x, aiBase.y);
            strategicValue += (500 - distanceToAIBase) / 5; // Closer = higher value for defense
        }
        
        // Support positioning - deploy near other AI tanks
        const nearbyAITanks = this.scene.tanks.filter(tank => {
            if (tank.isPlayerTank || tank.health <= 0) return false;
            const distance = GameHelpers.distance(worldPos.x, worldPos.y, tank.x, tank.y);
            return distance < 100; // Within support range
        });
        strategicValue += nearbyAITanks.length * 20; // Bonus for mutual support
        
        // Tank-specific positioning
        switch (tankData.type) {
            case TANK_TYPES.HEAVY:
                // Heavy tanks prefer front lines
                strategicValue += (worldPos.y < 300) ? 30 : 0;
                break;
            case TANK_TYPES.ARTILLERY:
                // Artillery prefers back lines with clear shots
                strategicValue += (worldPos.y > 200) ? 40 : 0;
                break;
            case TANK_TYPES.LIGHT:
                // Light tanks prefer flanking positions
                strategicValue += (worldPos.x < 150 || worldPos.x > 450) ? 25 : 0;
                break;
        }
        
        // Avoid clustering too much
        const nearbyTanks = this.scene.tanks.filter(tank => {
            if (tank.health <= 0) return false;
            const distance = GameHelpers.distance(worldPos.x, worldPos.y, tank.x, tank.y);
            return distance < 50; // Too close
        });
        strategicValue -= nearbyTanks.length * 15; // Penalty for overcrowding
        
        // Random factor to add unpredictability
        strategicValue += GameHelpers.randomInt(-10, 10);
        
        return {
            x: worldPos.x,
            y: worldPos.y,
            strategicValue: strategicValue
        };
    }

    /**
     * Notifies AI of player actions to adjust strategy
     * @param {string} action - Type of action ('deploy', 'destroy', etc.)
     * @param {Object} data - Action data
     */
    notifyAIOfPlayerAction(action, data) {
        switch (action) {
            case 'deploy':
                // Player deployed a tank - AI might react
                console.log('🤖 AI: Player deployed', data.name);
                
                // Aggressive response to heavy player deployments
                if (data.type === TANK_TYPES.HEAVY) {
                    this.aiStrategy.preferredTankTypes = ['tank_destroyer_1', 'tank_medium_1'];
                    console.log('🤖 AI: Switching to anti-heavy strategy');
                }
                
                // Quick deployment response in aggressive mode
                if (this.aiStrategy.mode === 'aggressive' && this.scene.aiEnergy >= 3) {
                    this.aiNextDeployment = this.scene.time.now + 1000; // Deploy soon
                }
                break;
                
            case 'destroy':
                console.log('🤖 AI: Player destroyed', data.type);
                // Could adjust strategy based on what was destroyed
                break;
        }
    }

    /**
     * Updates individual tank AI behavior (targeting and movement)
     * @param {Object} tank - Tank to update
     */
    updateTankAI(tank) {
        if (tank.manualControl) return; // Don't override manual control
        
        const currentTime = this.scene.time.now;
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
            let enemies = [];
            const canAttackTanks = !tank.tankData?.targetBuildingsOnly;
            if (canAttackTanks) {
                enemies.push(...this.scene.tanks.filter(t => !t.isPlayerTank && t.health > 0));
            }
            enemies.push(...this.scene.buildings.filter(b => !b.isPlayerBase && b.health > 0));
            
            enemies.forEach(enemy => {
                const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
                
                // Check if enemy is within attack range
                if (distance <= tankRange) {
                    if (distance < closestDistanceInRange) {
                        closestDistanceInRange = distance;
                        closestEnemyInRange = enemy;
                    }
                }
                
                // Track nearest enemy overall for fallback movement
                if (distance < fallbackDistance) {
                    fallbackDistance = distance;
                    fallbackTarget = enemy;
                }
            });
        } else {
            // AI tank: target player tanks and player buildings (prioritize buildings if close)
            const canAttackTanks = !tank.tankData?.targetBuildingsOnly;
            const playerTanks = canAttackTanks ? this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0) : [];
            const playerBuildings = this.scene.buildings.filter(b => b.isPlayerBase && b.health > 0);
            
            // Combined enemy list with building priority
            const enemies = [...playerTanks, ...playerBuildings];
            
            enemies.forEach(enemy => {
                const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
                
                // Prioritize buildings when close (within 150 pixels)
                const isBuilding = enemy.isPlayerBase !== undefined;
                const priorityBonus = isBuilding && distance < 150 ? -50 : 0; // Negative = higher priority
                const adjustedDistance = distance + priorityBonus;
                
                // Check if enemy is within attack range
                if (distance <= tankRange) {
                    if (adjustedDistance < closestDistanceInRange) {
                        closestDistanceInRange = adjustedDistance;
                        closestEnemyInRange = enemy;
                    }
                }
                
                // Track nearest enemy overall for fallback movement
                if (adjustedDistance < fallbackDistance) {
                    fallbackDistance = adjustedDistance;
                    fallbackTarget = enemy;
                }
            });
        }
        
        // Set target based on acquisition rules
        if (closestEnemyInRange) {
            // Enemy in range - attack it
            tank.target = closestEnemyInRange;
            tank.attacking = true;
            tank.moving = false; // Stop moving to attack
        } else if (fallbackTarget) {
            // No enemy in range - move toward nearest enemy
            tank.target = fallbackTarget;
            tank.attacking = false;
            tank.moving = true;
            tank.needsNewPath = true; // Force path recalculation
        } else {
            // No enemies found - clear target and stop
            tank.target = null;
            tank.attacking = false;
            tank.moving = false;
        }
    }

    /**
     * Gets the current AI strategy for external reference
     * @returns {Object} Current AI strategy
     */
    getStrategy() {
        return { ...this.aiStrategy }; // Return copy to prevent external modification
    }

    /**
     * Forces an immediate strategy update (for testing/debugging)
     */
    forceStrategyUpdate() {
        this.updateAIStrategy();
    }
}
