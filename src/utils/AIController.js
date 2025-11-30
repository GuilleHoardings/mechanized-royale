/**
 * AIController - Handles AI strategy, decision-making, and tank behavior for Tank Tactics
 * Extracted from BattleScene to improve code organization
 * Enhanced with advanced strategic decision-making
 */

class AIController {
    constructor(scene) {
        this.scene = scene;
        
        // Initialize AI state with enhanced strategy tracking
        this.aiStrategy = {
            mode: 'balanced', // 'aggressive', 'defensive', 'balanced', 'counter-push', 'split-push'
            playerTankCount: 0,
            aiTankCount: 0,
            baseHealthPercent: 1.0,
            playerBaseHealthPercent: 1.0,
            rushMode: false,
            defensiveMode: false,
            preferredTankTypes: ['tank_medium_1', 'tank_light_1'],
            energyThreshold: 3, // Minimum energy to consider deployment
            
            // Lane control tracking (left, center, right)
            laneControl: {
                left: { playerTanks: 0, aiTanks: 0, threat: 0 },
                center: { playerTanks: 0, aiTanks: 0, threat: 0 },
                right: { playerTanks: 0, aiTanks: 0, threat: 0 }
            },
            activeLane: 'center', // Current push lane
            
            // Player behavior tracking
            playerPatterns: {
                preferredTankTypes: {},     // Track what player deploys most
                averageDeployEnergy: 4,     // Track when player typically deploys
                lastDeployTime: 0,
                deployFrequency: 3000,      // Average time between deployments
                aggressionLevel: 0.5,       // 0 = passive, 1 = very aggressive
                rushAttempts: 0             // Count of rush attempts
            },
            
            // Tower threat tracking
            towerStatus: {
                playerLeftTower: true,
                playerRightTower: true,
                playerMainTower: true,
                aiLeftTower: true,
                aiRightTower: true,
                aiMainTower: true
            },
            
            // Energy advantage tracking
            estimatedPlayerEnergy: 5,
            energyAdvantage: 0,
            
            // Combo/counter tracking
            lastPlayerDeploy: null,
            counterUnitReady: false,
            pendingCounterDeploy: null
        };
        
        this.aiLastStrategyUpdate = 0;
        this.aiNextDeployment = 0;
        
        // Difficulty scaling (can be adjusted)
        this.difficultyMultiplier = 1.0;
        this.reactionTimeBase = 800; // Base reaction time in ms
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
        
        // Update AI strategy every 2 seconds (faster reactions)
        if (currentTime - this.aiLastStrategyUpdate > 2000) {
            this.updateAIStrategy();
            this.aiLastStrategyUpdate = currentTime;
        }
        
        // Update lane control assessment every second
        if (currentTime % 1000 < 20) {
            this.assessLaneControl();
        }
        
        // Track estimated player energy
        this.updateEnergyTracking();
        
        // Check if AI should deploy a tank (strategic timing)
        if (currentTime >= this.aiNextDeployment && this.scene.aiEnergy >= 1) {
            const shouldDeploy = this.shouldAIDeploy();
            if (shouldDeploy) {
                this.aiDeployTankStrategically();
                // Dynamic deployment timing based on strategy and difficulty
                const baseDelay = this.getDeploymentDelay();
                const randomDelay = GameHelpers.randomInt(-500, 1000);
                this.aiNextDeployment = currentTime + baseDelay + randomDelay;
            }
        }
        
        // Check for reactive counter-deployment opportunities
        this.checkCounterDeployOpportunity();
    }
    
    /**
     * Get deployment delay based on current strategy
     */
    getDeploymentDelay() {
        const baseDelays = {
            'aggressive': 1500,
            'counter-push': 1800,
            'split-push': 2200,
            'balanced': 2800,
            'defensive': 4000
        };
        
        let delay = baseDelays[this.aiStrategy.mode] || 2800;
        
        // Faster during overtime or low time
        if (this.scene.battleTime <= 60) {
            delay *= 0.6;
        } else if (this.scene.battleTime <= 30) {
            delay *= 0.4;
        }
        
        // Scale with difficulty
        delay /= this.difficultyMultiplier;
        
        return Math.max(delay, 800); // Minimum 800ms between deploys
    }
    
    /**
     * Track estimated player energy based on time and deployments
     */
    updateEnergyTracking() {
        // Estimate player energy regeneration
        const regenDelay = this.scene.getEnergyRegenDelay() / 1000;
        const timeSinceLastPlayerDeploy = (this.scene.time.now - this.aiStrategy.playerPatterns.lastDeployTime) / 1000;
        
        // Rough estimation: player gains 1 energy every regenDelay seconds
        const estimatedGain = Math.floor(timeSinceLastPlayerDeploy / regenDelay);
        this.aiStrategy.estimatedPlayerEnergy = Math.min(10, estimatedGain);
        
        // Calculate energy advantage
        this.aiStrategy.energyAdvantage = this.scene.aiEnergy - this.aiStrategy.estimatedPlayerEnergy;
    }
    
    /**
     * Assess which lanes have the most activity and threats
     */
    assessLaneControl() {
        const lanes = { left: { playerTanks: 0, aiTanks: 0, threat: 0 },
                       center: { playerTanks: 0, aiTanks: 0, threat: 0 },
                       right: { playerTanks: 0, aiTanks: 0, threat: 0 } };
        
        const leftBoundary = GAME_CONFIG.WORLD_WIDTH / 3;
        const rightBoundary = (GAME_CONFIG.WORLD_WIDTH / 3) * 2;
        const offsetX = GameHelpers.getBattlefieldOffset();
        
        this.scene.tanks.forEach(tank => {
            if (tank.health <= 0) return;
            
            const adjustedX = tank.x - offsetX;
            let lane = 'center';
            if (adjustedX < leftBoundary) lane = 'left';
            else if (adjustedX > rightBoundary) lane = 'right';
            
            if (tank.isPlayerTank) {
                lanes[lane].playerTanks++;
                // Calculate threat based on tank HP and damage
                lanes[lane].threat += (tank.tankData.stats.hp + tank.tankData.stats.damage * 2) / 100;
            } else {
                lanes[lane].aiTanks++;
            }
        });
        
        this.aiStrategy.laneControl = lanes;
        
        // Determine best lane to push
        this.determinePushLane();
    }
    
    /**
     * Determine which lane to focus on for pushing
     */
    determinePushLane() {
        const lanes = this.aiStrategy.laneControl;
        const towerStatus = this.aiStrategy.towerStatus;
        
        // Check if battlefield is empty (no significant activity)
        const totalTanks = lanes.left.playerTanks + lanes.center.playerTanks + lanes.right.playerTanks +
                          lanes.left.aiTanks + lanes.center.aiTanks + lanes.right.aiTanks;
        
        // If no tanks on field, randomly choose a lane with bias toward center
        if (totalTanks === 0) {
            const roll = Math.random();
            if (roll < 0.2) {
                this.aiStrategy.activeLane = 'left';
            } else if (roll < 0.4) {
                this.aiStrategy.activeLane = 'right';
            } else {
                this.aiStrategy.activeLane = 'center';
            }
            return;
        }
        
        // Priority: undefended lanes, weak towers, or counter the player's push
        let bestLane = 'center';
        let bestScore = -Infinity;
        
        // Shuffle the lane order to avoid bias toward 'left'
        const laneOrder = ['left', 'center', 'right'].sort(() => Math.random() - 0.5);
        
        laneOrder.forEach(lane => {
            let score = 0;
            
            // Prefer lanes with fewer player tanks
            score -= lanes[lane].playerTanks * 30;
            
            // Prefer lanes with more AI tanks already there
            score += lanes[lane].aiTanks * 20;
            
            // Prefer lanes where player tower is already damaged or destroyed
            if (lane === 'left' && !towerStatus.playerLeftTower) score += 50;
            if (lane === 'right' && !towerStatus.playerRightTower) score += 50;
            
            // If player is pushing one lane hard, consider counter-pushing another
            const playerPushingHard = lanes[lane].threat > 3;
            if (playerPushingHard) {
                // Defensive priority if our tower is threatened
                const aiTowerThreatened = (lane === 'left' && towerStatus.aiLeftTower) ||
                                          (lane === 'right' && towerStatus.aiRightTower);
                if (aiTowerThreatened) {
                    score += 40; // Defend this lane
                }
            }
            
            // Add significant randomness to vary lane choices
            score += GameHelpers.randomInt(-20, 20);
            
            if (score > bestScore) {
                bestScore = score;
                bestLane = lane;
            }
        });
        
        this.aiStrategy.activeLane = bestLane;
    }
    
    /**
     * Check for reactive counter-deployment opportunities
     */
    checkCounterDeployOpportunity() {
        if (!this.aiStrategy.pendingCounterDeploy) return;
        if (this.scene.aiEnergy < 2) return;
        
        const counter = this.aiStrategy.pendingCounterDeploy;
        if (this.scene.time.now >= counter.deployTime) {
            // Deploy the counter unit
            const tankData = TANK_DATA[counter.tankId];
            if (tankData && this.scene.aiEnergy >= tankData.cost) {
                this.scene.deployAITank(counter.tankId, counter.x, counter.y);
                this.scene.aiEnergy -= tankData.cost;
                console.log('🤖 AI: Counter-deployed', counter.tankId);
            }
            this.aiStrategy.pendingCounterDeploy = null;
        }
    }

    /**
     * Updates AI strategy based on battlefield conditions
     */
    updateAIStrategy() {
        // Analyze current battlefield situation
        const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const aiTanks = this.scene.tanks.filter(t => !t.isPlayerTank && t.health > 0);
        
        // Update tower status
        this.updateTowerStatus();
        
        const playerBase = this.scene.buildings.find(b => b.isPlayerBase && b.isMainTower);
        const aiBase = this.scene.buildings.find(b => !b.isPlayerBase && b.isMainTower);
        
        this.aiStrategy.playerTankCount = playerTanks.length;
        this.aiStrategy.aiTankCount = aiTanks.length;
        this.aiStrategy.baseHealthPercent = aiBase ? aiBase.health / aiBase.maxHealth : 0;
        this.aiStrategy.playerBaseHealthPercent = playerBase ? playerBase.health / playerBase.maxHealth : 1;
        
        // Analyze player patterns
        this.analyzePlayerBehavior(playerTanks);
        
        // Determine strategic mode based on multiple factors
        this.determineStrategicMode();
        
        // Update preferred tanks based on strategy and counter-picks
        this.updatePreferredTanks(playerTanks);
        
        // Update AI strategy display
        this.updateAIStrategyDisplay();
    }
    
    /**
     * Update tower status tracking
     */
    updateTowerStatus() {
        const buildings = this.scene.buildings;
        
        this.aiStrategy.towerStatus = {
            playerLeftTower: buildings.some(b => b.isPlayerBase && b.towerType === 'left' && b.health > 0),
            playerRightTower: buildings.some(b => b.isPlayerBase && b.towerType === 'right' && b.health > 0),
            playerMainTower: buildings.some(b => b.isPlayerBase && b.isMainTower && b.health > 0),
            aiLeftTower: buildings.some(b => !b.isPlayerBase && b.towerType === 'left' && b.health > 0),
            aiRightTower: buildings.some(b => !b.isPlayerBase && b.towerType === 'right' && b.health > 0),
            aiMainTower: buildings.some(b => !b.isPlayerBase && b.isMainTower && b.health > 0)
        };
    }
    
    /**
     * Analyze player behavior patterns
     */
    analyzePlayerBehavior(playerTanks) {
        // Count tank types player uses
        playerTanks.forEach(tank => {
            const type = tank.tankData.type;
            this.aiStrategy.playerPatterns.preferredTankTypes[type] = 
                (this.aiStrategy.playerPatterns.preferredTankTypes[type] || 0) + 1;
        });
        
        // Calculate aggression level based on tank positioning
        let aggressionScore = 0;
        const riverY = 16.5 * GAME_CONFIG.TILE_SIZE;
        
        playerTanks.forEach(tank => {
            // Tanks past the river are aggressive
            if (tank.y < riverY) {
                aggressionScore += 0.2;
            }
            // Fast/light tanks indicate aggressive play
            if (tank.tankData.type === TANK_TYPES.LIGHT || 
                tank.tankData.type === TANK_TYPES.FAST_ATTACK) {
                aggressionScore += 0.1;
            }
        });
        
        this.aiStrategy.playerPatterns.aggressionLevel = 
            Math.min(1, aggressionScore / Math.max(1, playerTanks.length));
    }
    
    /**
     * Determine strategic mode based on game state
     */
    determineStrategicMode() {
        const strategy = this.aiStrategy;
        const battleTime = this.scene.battleTime;
        
        // Critical situations take priority
        if (strategy.baseHealthPercent < 0.2) {
            // Base critically low - all-out defense or desperation attack
            if (strategy.playerBaseHealthPercent < 0.3) {
                strategy.mode = 'aggressive'; // Trade damage
                strategy.rushMode = true;
            } else {
                strategy.mode = 'defensive';
                strategy.defensiveMode = true;
            }
            strategy.preferredTankTypes = ['tank_heavy_1', 'tank_medium_1', 'tank_medium_2'];
            return;
        }
        
        // Low time - need to make decisive plays
        if (battleTime <= 30) {
            if (strategy.playerBaseHealthPercent < strategy.baseHealthPercent) {
                strategy.mode = 'defensive'; // Protect lead
            } else {
                strategy.mode = 'aggressive'; // Catch up
                strategy.rushMode = true;
            }
            return;
        }
        
        // Final minute - increase aggression
        if (battleTime <= 60) {
            strategy.mode = 'aggressive';
            strategy.rushMode = true;
            return;
        }
        
        // Check for counter-push opportunity
        if (strategy.energyAdvantage >= 3 && strategy.playerTankCount < strategy.aiTankCount) {
            strategy.mode = 'counter-push';
            strategy.rushMode = false;
            strategy.defensiveMode = false;
            return;
        }
        
        // Player is very aggressive - defend and counter
        if (strategy.playerPatterns.aggressionLevel > 0.7) {
            strategy.mode = 'defensive';
            strategy.defensiveMode = true;
            return;
        }
        
        // Check for split-push opportunity (both side towers down on one side)
        if (!strategy.towerStatus.playerLeftTower && !strategy.towerStatus.playerRightTower) {
            strategy.mode = 'aggressive';
            strategy.rushMode = true;
            return;
        }
        
        // Single tower advantage - push that lane
        if (!strategy.towerStatus.playerLeftTower || !strategy.towerStatus.playerRightTower) {
            strategy.mode = 'counter-push';
            strategy.activeLane = !strategy.towerStatus.playerLeftTower ? 'left' : 'right';
            return;
        }
        
        // Outnumbered - play defensive
        if (strategy.aiTankCount < strategy.playerTankCount - 1) {
            strategy.mode = 'defensive';
            strategy.defensiveMode = true;
            return;
        }
        
        // Default - balanced play with slight aggression if we have advantage
        if (strategy.energyAdvantage > 0 || strategy.aiTankCount > strategy.playerTankCount) {
            strategy.mode = 'balanced';
        } else {
            strategy.mode = 'balanced';
        }
        strategy.rushMode = false;
        strategy.defensiveMode = false;
    }
    
    /**
     * Update preferred tanks based on strategy and counters
     */
    updatePreferredTanks(playerTanks) {
        const playerTypes = this.aiStrategy.playerPatterns.preferredTankTypes;
        
        // Count player's current tank composition
        let heavyCount = 0, lightCount = 0, mediumCount = 0, tdCount = 0;
        playerTanks.forEach(t => {
            switch (t.tankData.type) {
                case TANK_TYPES.HEAVY: heavyCount++; break;
                case TANK_TYPES.LIGHT: 
                case TANK_TYPES.FAST_ATTACK: lightCount++; break;
                case TANK_TYPES.MEDIUM: mediumCount++; break;
                case TANK_TYPES.TANK_DESTROYER: tdCount++; break;
            }
        });
        
        // Counter-pick logic
        const counters = [];
        
        // Counter heavy tanks with tank destroyers or high-pen units
        if (heavyCount >= 2) {
            counters.push('tank_destroyer_1', 'tank_minipakka');
        }
        
        // Counter swarm of light tanks with splash or medium tanks
        if (lightCount >= 3) {
            counters.push('tank_artillery_1', 'tank_medium_1', 'tank_medium_2');
        }
        
        // Counter tank destroyers with fast flankers
        if (tdCount >= 1) {
            counters.push('tank_light_2', 'tank_light_3', 'tank_light_1');
        }
        
        // Mode-specific preferences
        const modePreferences = {
            'aggressive': ['tank_light_1', 'tank_light_2', 'tank_medium_1', 'tank_giant'],
            'defensive': ['tank_heavy_1', 'tank_medium_2', 'tank_musketeer', 'tank_destroyer_1'],
            'counter-push': ['tank_medium_1', 'tank_megaminion', 'tank_light_2'],
            'split-push': ['tank_light_1', 'tank_light_3', 'tank_skeleton'],
            'balanced': ['tank_medium_1', 'tank_light_1', 'tank_heavy_1']
        };
        
        // Combine counters with mode preferences
        const modePrefs = modePreferences[this.aiStrategy.mode] || modePreferences['balanced'];
        this.aiStrategy.preferredTankTypes = [...new Set([...counters, ...modePrefs])];
    }

    /**
     * Updates the display for AI strategy
     */
    updateAIStrategyDisplay() {
        if (this.scene.aiStrategyText) {
            const strategyInfo = [
                `Mode: ${this.aiStrategy.mode.toUpperCase()}`,
                `Base HP: ${Math.round(this.aiStrategy.baseHealthPercent * 100)}%`,
                `Tanks: ${this.aiStrategy.aiTankCount} vs ${this.aiStrategy.playerTankCount}`,
                `Lane: ${this.aiStrategy.activeLane.toUpperCase()}`,
                `Energy Adv: ${this.aiStrategy.energyAdvantage >= 0 ? '+' : ''}${this.aiStrategy.energyAdvantage}`
            ];
            
            this.scene.aiStrategyText.setText(strategyInfo.join('\n'));
        }
    }

    /**
     * Determines if AI should deploy a tank based on current conditions
     * @returns {boolean} Whether AI should deploy
     */
    shouldAIDeploy() {
        const strategy = this.aiStrategy;
        const energy = this.scene.aiEnergy;
        
        // Don't deploy if not enough energy for anything useful
        if (energy < 2) {
            return false;
        }
        
        // Always deploy if we have max or near-max energy (don't waste regen)
        if (energy >= 9) {
            return true;
        }
        
        // If we have a pending counter-deploy, wait for it
        if (strategy.pendingCounterDeploy) {
            return false;
        }
        
        // Reactive deployment based on lane threats
        const lanes = strategy.laneControl;
        const urgentThreat = lanes.left.threat > 4 || lanes.center.threat > 4 || lanes.right.threat > 4;
        if (urgentThreat && energy >= 3) {
            return true;
        }
        
        // Strategic deployment based on current mode
        const playerTankCount = strategy.playerTankCount;
        const aiTankCount = strategy.aiTankCount;
        
        switch (strategy.mode) {
            case 'aggressive':
            case 'counter-push':
                // Deploy quickly to maintain pressure
                return energy >= 3 || (energy >= 2 && aiTankCount < 3);
                
            case 'split-push':
                // Deploy pairs of cheap units
                return energy >= 4 && aiTankCount < 4;
                
            case 'defensive':
                // React to player deployments, don't over-commit
                if (playerTankCount > aiTankCount) {
                    return energy >= 4;
                }
                return energy >= 6; // Save energy for counters
                
            case 'balanced':
            default:
                // Maintain slight pressure, don't fall behind
                if (playerTankCount > aiTankCount && energy >= 3) {
                    return true;
                }
                return energy >= 5 || (Math.random() < 0.3 && energy >= 3);
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
        
        // Choose deployment position based on strategy and lane
        const deploymentPos = this.chooseAIDeploymentPosition(tankData);
        if (!deploymentPos) {
            console.log('🤖 AI: No valid deployment position');
            return;
        }
        
        // Deploy the tank
        this.scene.deployAITank(tankId, deploymentPos.x, deploymentPos.y);
        // Deduct energy now that the tank is deployed
        this.scene.aiEnergy = Math.max(0, this.scene.aiEnergy - tankData.cost);
        
        // Consider deploying a combo unit if we have energy
        this.considerComboDeployment(tankId, tankData, deploymentPos);
    }
    
    /**
     * Consider deploying a combo unit to support the just-deployed tank
     */
    considerComboDeployment(primaryTankId, primaryTankData, deployPos) {
        // Only combo if we have enough energy
        if (this.scene.aiEnergy < 2) return;
        if (this.aiStrategy.mode === 'defensive') return; // Don't over-commit when defensive
        
        // Combo patterns
        const combos = {
            'tank_giant': ['tank_megaminion', 'tank_musketeer'], // Giant + support
            'tank_heavy_1': ['tank_medium_1', 'tank_light_1'],   // Heavy + backup
            'tank_medium_1': ['tank_light_1'],                    // Medium + scout
        };
        
        const comboOptions = combos[primaryTankId];
        if (!comboOptions) return;
        
        // Find affordable combo unit
        for (const comboTankId of comboOptions) {
            const comboData = TANK_DATA[comboTankId];
            if (comboData && this.scene.aiEnergy >= comboData.cost) {
                // Position combo unit near but not on top of primary
                // Offset randomly to the sides or behind
                const sideOffset = GameHelpers.randomInt(-60, 60);
                const behindOffset = GameHelpers.randomInt(-30, -60); // Negative Y = further from river (behind)
                
                this.aiStrategy.pendingCounterDeploy = {
                    tankId: comboTankId,
                    x: deployPos.x + sideOffset,
                    y: deployPos.y + behindOffset,
                    deployTime: this.scene.time.now + GameHelpers.randomInt(300, 600)
                };
                console.log('🤖 AI: Queued combo deploy', comboTankId);
                break;
            }
        }
    }

    /**
     * Chooses which tank type the AI should deploy
     * @returns {string|null} Tank ID to deploy or null if none available
     */
    chooseAITank() {
        const energy = this.scene.aiEnergy;
        
        // Filter available tanks by energy cost
        const availableTanks = this.scene.aiDeck.filter(tankId => {
            const tankData = TANK_DATA[tankId];
            return tankData && tankData.cost <= energy;
        });
        
        if (availableTanks.length === 0) {
            return null;
        }
        
        // Get preferred tanks that are available
        const preferredAvailable = availableTanks.filter(tankId => 
            this.aiStrategy.preferredTankTypes.includes(tankId)
        );
        
        // Weighted selection based on situation
        let chosenTank;
        
        // High priority: Counter picks
        const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const heavyPlayerTanks = playerTanks.filter(t => t.tankData.type === TANK_TYPES.HEAVY).length;
        const lightPlayerTanks = playerTanks.filter(t => 
            t.tankData.type === TANK_TYPES.LIGHT || t.tankData.type === TANK_TYPES.FAST_ATTACK
        ).length;
        
        // Counter logic with higher probability
        if (heavyPlayerTanks >= 2) {
            const antiHeavy = availableTanks.filter(id => 
                ['tank_destroyer_1', 'tank_minipakka'].includes(id)
            );
            if (antiHeavy.length > 0 && Math.random() < 0.6) {
                chosenTank = antiHeavy[Math.floor(Math.random() * antiHeavy.length)];
                console.log('🤖 AI: Counter-picking heavy with', chosenTank);
                return chosenTank;
            }
        }
        
        if (lightPlayerTanks >= 3) {
            const antiSwarm = availableTanks.filter(id => 
                ['tank_artillery_1', 'tank_medium_1', 'tank_medium_2'].includes(id)
            );
            if (antiSwarm.length > 0 && Math.random() < 0.5) {
                chosenTank = antiSwarm[Math.floor(Math.random() * antiSwarm.length)];
                console.log('🤖 AI: Counter-picking swarm with', chosenTank);
                return chosenTank;
            }
        }
        
        // Mode-specific selection
        switch (this.aiStrategy.mode) {
            case 'aggressive':
            case 'counter-push':
                // Prefer DPS and fast units
                const aggressivePicks = availableTanks.filter(id => {
                    const data = TANK_DATA[id];
                    return data && (data.stats.speed >= 50 || data.stats.damage >= 80);
                });
                if (aggressivePicks.length > 0) {
                    chosenTank = aggressivePicks[Math.floor(Math.random() * aggressivePicks.length)];
                }
                break;
                
            case 'defensive':
                // Prefer high HP and range
                const defensivePicks = availableTanks.filter(id => {
                    const data = TANK_DATA[id];
                    return data && (data.stats.hp >= 400 || data.stats.range >= 200);
                });
                if (defensivePicks.length > 0) {
                    chosenTank = defensivePicks[Math.floor(Math.random() * defensivePicks.length)];
                }
                break;
                
            case 'split-push':
                // Prefer cheap, fast units
                const splitPicks = availableTanks.filter(id => {
                    const data = TANK_DATA[id];
                    return data && data.cost <= 3;
                });
                if (splitPicks.length > 0) {
                    chosenTank = splitPicks[Math.floor(Math.random() * splitPicks.length)];
                }
                break;
        }
        
        // Fallback to preferred or random
        if (!chosenTank) {
            if (preferredAvailable.length > 0 && Math.random() < 0.75) {
                chosenTank = preferredAvailable[Math.floor(Math.random() * preferredAvailable.length)];
            } else {
                chosenTank = availableTanks[Math.floor(Math.random() * availableTanks.length)];
            }
        }
        
        console.log('🤖 AI choosing tank:', chosenTank, 'Strategy:', this.aiStrategy.mode, 'Lane:', this.aiStrategy.activeLane);
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
        const activeLane = this.aiStrategy.activeLane;
        
        // Define lane boundaries in tile coordinates (0-17 for 18 tiles)
        // Left: tiles 0-5, Center: tiles 6-11, Right: tiles 12-17
        const laneBounds = {
            left: { minX: 1, maxX: 5 },      // Avoid edge, use tiles 1-5
            center: { minX: 6, maxX: 11 },   // Middle tiles
            right: { minX: 12, maxX: 16 }    // Avoid edge, use tiles 12-16
        };
        
        const targetLane = laneBounds[activeLane] || laneBounds.center;
        
        // Generate potential deployment positions with lane preference
        for (let attempts = 0; attempts < 30; attempts++) {
            let tileX, tileY;
            
            // 60% chance to deploy in active lane, 40% elsewhere for variety
            if (Math.random() < 0.6) {
                tileX = GameHelpers.randomInt(targetLane.minX, targetLane.maxX);
            } else {
                // Deploy anywhere across the full width with some edge buffer
                tileX = GameHelpers.randomInt(1, GAME_CONFIG.TILES_X - 2);
            }
            
            // Y position based on tank type and strategy
            // Enemy deployment zone is rows 0-15 (tileY 0 to 15)
            const baseY = deploymentZone.tileY;
            const maxY = deploymentZone.tileY + deploymentZone.tilesHeight - 1;
            
            if (this.aiStrategy.mode === 'aggressive' || this.aiStrategy.rushMode) {
                // Deploy closer to the front (higher Y values, closer to river)
                // River is at row 16-17, so rows 11-15 are near the front
                tileY = GameHelpers.randomInt(maxY - 5, maxY);
            } else if (this.aiStrategy.mode === 'defensive') {
                // Deploy further back (rows 2-7)
                tileY = GameHelpers.randomInt(baseY + 2, baseY + 7);
            } else if (tankData.type === TANK_TYPES.ARTILLERY) {
                // Artillery deploys far back (rows 1-4)
                tileY = GameHelpers.randomInt(baseY + 1, baseY + 4);
            } else if (tankData.type === TANK_TYPES.HEAVY) {
                // Heavy tanks deploy mid-range (rows 5-12)
                tileY = GameHelpers.randomInt(baseY + 5, maxY - 3);
            } else {
                // Default deployment spreads across the zone (rows 4-13)
                tileY = GameHelpers.randomInt(baseY + 4, maxY - 2);
            }
            
            // Check if tile position is valid
            if (GameHelpers.isValidDeploymentTile(tileX, tileY, false, this.scene.expandedDeploymentZones)) {
                const worldPos = GameHelpers.tileToWorld(tileX, tileY);
                const position = this.evaluateDeploymentPosition(worldPos, tankData, activeLane);
                if (position) {
                    validPositions.push(position);
                }
            }
        }
        
        if (validPositions.length === 0) {
            // Fallback to any valid position
            for (let attempts = 0; attempts < 10; attempts++) {
                const tileX = GameHelpers.randomInt(deploymentZone.tileX, deploymentZone.tileX + deploymentZone.tilesWidth - 1);
                const tileY = GameHelpers.randomInt(deploymentZone.tileY, deploymentZone.tileY + deploymentZone.tilesHeight - 1);
                
                if (GameHelpers.isValidDeploymentTile(tileX, tileY, false, this.scene.expandedDeploymentZones)) {
                    const worldPos = GameHelpers.tileToWorld(tileX, tileY);
                    return { x: worldPos.worldX, y: worldPos.worldY, strategicValue: 0 };
                }
            }
            return null;
        }
        
        // Sort positions by strategic value and choose from top candidates
        validPositions.sort((a, b) => b.strategicValue - a.strategicValue);
        
        // Add more randomness by choosing from top 5 positions
        const topCount = Math.min(5, validPositions.length);
        const chosenIndex = Math.floor(Math.random() * topCount);
        const chosen = validPositions[chosenIndex];
        
        // Debug: log the chosen position

        const tilePos = GameHelpers.worldToTile(chosen.x, chosen.y);
        console.log(`🤖 AI Deploy Position: tileX=${tilePos.tileX}, tileY=${tilePos.tileY}, worldX=${Math.round(chosen.x)}, lane=${activeLane}, value=${Math.round(chosen.strategicValue)}`);
        
        return chosen;
    }

    /**
     * Evaluates the strategic value of a deployment position
     * @param {Object} worldPos - World position {x, y}
     * @param {Object} tankData - Tank data
     * @param {string} targetLane - The lane we're trying to push
     * @returns {Object|null} Position with strategic value or null
     */
    evaluateDeploymentPosition(worldPos, tankData, targetLane) {
        let strategicValue = 0;
        const offsetX = GameHelpers.getBattlefieldOffset();
        
        // Handle both {x, y} and {worldX, worldY} formats
        const posX = worldPos.x !== undefined ? worldPos.x : worldPos.worldX;
        const posY = worldPos.y !== undefined ? worldPos.y : worldPos.worldY;
        
        // Lane alignment bonus - reduced to not dominate scoring
        const laneWidth = GAME_CONFIG.WORLD_WIDTH / 3;
        const adjustedX = posX - offsetX;
        const inTargetLane = (targetLane === 'left' && adjustedX < laneWidth) ||
                            (targetLane === 'center' && adjustedX >= laneWidth && adjustedX < laneWidth * 2) ||
                            (targetLane === 'right' && adjustedX >= laneWidth * 2);
        if (inTargetLane) {
            strategicValue += 20; // Reduced from 40
        }
        
        // Only consider tower proximity if a tower is actually damaged
        // This prevents always favoring left side due to tower distance calculations
        const playerTowers = this.scene.buildings.filter(b => b.isPlayerBase && b.health > 0);
        let weakestTower = null;
        let lowestHealthRatio = 1;
        playerTowers.forEach(tower => {
            const ratio = tower.health / tower.maxHealth;
            if (ratio < lowestHealthRatio) {
                lowestHealthRatio = ratio;
                weakestTower = tower;
            }
        });
        
        // Only add tower proximity bonus if a tower is actually damaged (< 100% health)
        if (weakestTower && lowestHealthRatio < 1.0) {
            const distanceToWeakTower = GameHelpers.distance(posX, posY, weakestTower.x, weakestTower.y);
            // Closer to weak tower = higher value, but reduced impact
            strategicValue += (600 - distanceToWeakTower) / 20;
            // Extra bonus if tower is significantly damaged
            strategicValue += (1 - lowestHealthRatio) * 25;
        }
        
        // Distance to friendly base (defensive positioning)
        const aiBase = this.scene.buildings.find(b => !b.isPlayerBase && b.isMainTower);
        if (aiBase && this.aiStrategy.mode === 'defensive') {
            const distanceToAIBase = GameHelpers.distance(posX, posY, aiBase.x, aiBase.y);
            strategicValue += (400 - distanceToAIBase) / 10; // Reduced impact
        }
        
        // Support positioning - reduced bonus to prevent clustering
        const nearbyAITanks = this.scene.tanks.filter(tank => {
            if (tank.isPlayerTank || tank.health <= 0) return false;
            const distance = GameHelpers.distance(posX, posY, tank.x, tank.y);
            return distance < 100;
        });
        strategicValue += nearbyAITanks.length * 5; // Reduced from 15
        
        // Avoid deploying too close to strong enemy presence
        const nearbyPlayerTanks = this.scene.tanks.filter(tank => {
            if (!tank.isPlayerTank || tank.health <= 0) return false;
            const distance = GameHelpers.distance(posX, posY, tank.x, tank.y);
            return distance < 100;
        });
        strategicValue -= nearbyPlayerTanks.length * 15; // Reduced from 25
        
        // Tank-specific positioning adjustments - reduced impact
        switch (tankData.type) {
            case TANK_TYPES.HEAVY:
                // Heavy tanks prefer front lines
                strategicValue += (posY < 200) ? 10 : 0; // Reduced from 25
                break;
            case TANK_TYPES.ARTILLERY:
                // Artillery prefers back lines
                strategicValue += (posY > 100) ? 15 : -10; // Reduced
                break;
            case TANK_TYPES.LIGHT:
            case TANK_TYPES.FAST_ATTACK:
                // Light/fast tanks prefer flanking positions
                if (adjustedX < 80 || adjustedX > GAME_CONFIG.WORLD_WIDTH - 80) {
                    strategicValue += 10; // Reduced from 20
                }
                break;
            case TANK_TYPES.TANK_DESTROYER:
                // TD prefers positions with clear sight lines
                strategicValue += (posY > 80) ? 10 : 0; // Reduced from 25
                break;
        }
        
        // Avoid overcrowding - keep this penalty
        const nearbyTanks = this.scene.tanks.filter(tank => {
            if (tank.health <= 0) return false;
            const distance = GameHelpers.distance(posX, posY, tank.x, tank.y);
            return distance < 45;
        });
        strategicValue -= nearbyTanks.length * 20;
        
        // Larger random factor for more unpredictability
        strategicValue += GameHelpers.randomInt(-15, 15);
        
        return {
            x: posX,
            y: posY,
            strategicValue: strategicValue
        };
    }

    /**
     * Notifies AI of player actions to adjust strategy
     * @param {string} action - Type of action ('deploy', 'destroy', etc.)
     * @param {Object} data - Action data
     */
    notifyAIOfPlayerAction(action, data) {
        const currentTime = this.scene.time.now;
        const patterns = this.aiStrategy.playerPatterns;
        
        switch (action) {
            case 'deploy':
                console.log('🤖 AI: Player deployed', data.name);
                
                // Track player deployment patterns
                const timeSinceLastDeploy = currentTime - patterns.lastDeployTime;
                if (patterns.lastDeployTime > 0) {
                    // Update running average of deployment frequency
                    patterns.deployFrequency = (patterns.deployFrequency + timeSinceLastDeploy) / 2;
                }
                patterns.lastDeployTime = currentTime;
                patterns.averageDeployEnergy = (patterns.averageDeployEnergy + data.cost) / 2;
                
                // Reset estimated player energy after deploy
                this.aiStrategy.estimatedPlayerEnergy = Math.max(0, 
                    this.aiStrategy.estimatedPlayerEnergy - data.cost);
                
                // Store last player deploy for potential counter
                this.aiStrategy.lastPlayerDeploy = {
                    tankId: data.id,
                    type: data.type,
                    cost: data.cost,
                    time: currentTime
                };
                
                // Consider counter-deployment
                this.prepareCounterDeploy(data);
                
                // Detect rush attempts
                if (data.cost <= 3 && timeSinceLastDeploy < 2000) {
                    patterns.rushAttempts++;
                    if (patterns.rushAttempts >= 2) {
                        console.log('🤖 AI: Detected rush attempt!');
                        this.aiStrategy.mode = 'defensive';
                        this.aiStrategy.defensiveMode = true;
                    }
                }
                break;
                
            case 'destroy':
                console.log('🤖 AI: Player destroyed', data.type);
                
                // If player destroyed our tank, we might need to counter
                if (this.aiStrategy.aiTankCount < this.aiStrategy.playerTankCount) {
                    // Schedule faster deployment
                    this.aiNextDeployment = Math.min(this.aiNextDeployment, 
                        currentTime + 1500);
                }
                break;
                
            case 'towerDamage':
                // Player damaged our tower - defensive reaction
                if (data.isAITower && data.damage > 100) {
                    this.aiStrategy.mode = 'defensive';
                    // Deploy ASAP if we have energy
                    if (this.scene.aiEnergy >= 3) {
                        this.aiNextDeployment = currentTime + 500;
                    }
                }
                break;
        }
    }
    
    /**
     * Prepare a counter-deployment in response to player's deploy
     */
    prepareCounterDeploy(playerTankData) {
        // Only counter if we have enough energy and are not already countering
        if (this.scene.aiEnergy < 3 || this.aiStrategy.pendingCounterDeploy) {
            return;
        }
        
        // Counter-pick table
        const counters = {
            [TANK_TYPES.HEAVY]: ['tank_destroyer_1', 'tank_minipakka', 'tank_medium_2'],
            [TANK_TYPES.LIGHT]: ['tank_medium_1', 'tank_artillery_1'],
            [TANK_TYPES.FAST_ATTACK]: ['tank_medium_1', 'tank_light_2'],
            [TANK_TYPES.TANK_DESTROYER]: ['tank_light_2', 'tank_light_3', 'tank_light_1'],
            [TANK_TYPES.ARTILLERY]: ['tank_light_1', 'tank_light_2', 'tank_light_3'],
            [TANK_TYPES.MEDIUM]: ['tank_heavy_1', 'tank_medium_2']
        };
        
        const counterOptions = counters[playerTankData.type] || ['tank_medium_1'];
        
        // Find affordable counter
        for (const counterId of counterOptions) {
            const counterData = TANK_DATA[counterId];
            if (counterData && this.scene.aiEnergy >= counterData.cost) {
                // Find a good deployment position - spread across full width
                const deployZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
                // Use tiles 2-15 for X (avoiding edges) and rows 8-15 for Y (mid to front)
                const tileX = GameHelpers.randomInt(2, GAME_CONFIG.TILES_X - 3);
                const tileY = GameHelpers.randomInt(deployZone.tileY + 8, 
                                                     deployZone.tileY + deployZone.tilesHeight - 1);
                const worldPos = GameHelpers.tileToWorld(tileX, tileY);
                
                // Schedule counter with reaction delay
                const reactionTime = this.reactionTimeBase + GameHelpers.randomInt(-200, 400);
                this.aiStrategy.pendingCounterDeploy = {
                    tankId: counterId,
                    x: worldPos.worldX,
                    y: worldPos.worldY,
                    deployTime: this.scene.time.now + reactionTime
                };
                console.log('🤖 AI: Preparing counter', counterId, 'in', reactionTime, 'ms');
                break;
            }
        }
    }

    /**
     * Updates individual tank AI behavior (targeting and movement)
     * Enhanced with smarter target prioritization
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
        
        // Enhanced Target Acquisition with priority system
        let bestTarget = null;
        let bestPriority = -Infinity;
        let fallbackTarget = null;
        let fallbackDistance = Infinity;
        
        const isPlayerTank = tank.isPlayerTank;
        const canAttackTanks = !tank.tankData?.targetBuildingsOnly;
        
        // Get potential targets
        let enemies = [];
        if (isPlayerTank) {
            if (canAttackTanks) {
                enemies.push(...this.scene.tanks.filter(t => !t.isPlayerTank && t.health > 0));
            }
            enemies.push(...this.scene.buildings.filter(b => !b.isPlayerBase && b.health > 0));
        } else {
            if (canAttackTanks) {
                enemies.push(...this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0));
            }
            enemies.push(...this.scene.buildings.filter(b => b.isPlayerBase && b.health > 0));
        }
        
        enemies.forEach(enemy => {
            const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
            let priority = 0;
            
            // Base priority: closer targets are higher priority
            priority += (1000 - distance) / 10;
            
            // Priority modifiers based on target type
            const isBuilding = enemy.isPlayerBase !== undefined || enemy.isMainTower !== undefined;
            const isTank = enemy.tankData !== undefined;
            
            if (isBuilding) {
                // Building targeting
                if (enemy.isMainTower) {
                    priority += 50; // High priority for main tower
                } else {
                    priority += 30; // Side towers
                }
                
                // Extra priority if building is damaged
                const healthRatio = enemy.health / enemy.maxHealth;
                priority += (1 - healthRatio) * 40;
                
                // Buildings close to our tanks get priority
                if (distance < 150) {
                    priority += 35;
                }
            } else if (isTank) {
                // Tank targeting - prioritize threats
                const enemyData = enemy.tankData;
                
                // Priority based on threat level
                if (enemyData.type === TANK_TYPES.HEAVY) {
                    // Heavy tanks are high threat but hard to kill
                    priority += 10;
                } else if (enemyData.type === TANK_TYPES.TANK_DESTROYER) {
                    // TDs are dangerous, prioritize killing them
                    priority += 25;
                } else if (enemyData.type === TANK_TYPES.ARTILLERY) {
                    // Artillery is squishy high-value target
                    priority += 35;
                } else if (enemyData.type === TANK_TYPES.LIGHT || 
                           enemyData.type === TANK_TYPES.FAST_ATTACK) {
                    // Light tanks - medium priority
                    priority += 15;
                } else {
                    // Medium tanks - balanced priority
                    priority += 20;
                }
                
                // Low health enemies get priority (finish them off)
                const healthRatio = enemy.health / enemy.maxHealth;
                if (healthRatio < 0.3) {
                    priority += 40;
                } else if (healthRatio < 0.5) {
                    priority += 20;
                }
                
                // Tanks targeting our buildings are high priority
                if (enemy.target && (enemy.target.isPlayerBase !== undefined)) {
                    priority += 25;
                }
            }
            
            // In-range bonus
            if (distance <= tankRange) {
                priority += 100; // Strong preference for targets we can shoot now
                
                if (priority > bestPriority) {
                    bestPriority = priority;
                    bestTarget = enemy;
                }
            }
            
            // Track fallback (nearest target for movement)
            if (distance < fallbackDistance) {
                fallbackDistance = distance;
                fallbackTarget = enemy;
            }
        });
        
        // Set target based on acquisition rules
        if (bestTarget) {
            // Enemy in range - attack it
            tank.target = bestTarget;
            tank.attacking = true;
            tank.moving = false;
        } else if (fallbackTarget) {
            // No enemy in range - move toward best fallback
            tank.target = fallbackTarget;
            tank.attacking = false;
            tank.moving = true;
            tank.needsNewPath = true;
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
