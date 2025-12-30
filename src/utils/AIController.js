/**
 * AIController - Handles AI strategy, decision-making, and tank behavior for Tank Tactics
 * Extracted from BattleScene to improve code organization
 * Enhanced with advanced strategic decision-making and full card system support
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
            preferredCards: [], // Will be populated based on AI's actual deck
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
            pendingCounterDeploy: null,

            // Building/spell tracking
            aiFurnaceActive: false,
            lastSpellTime: 0,
            lastBuildingTime: 0
        };

        this.aiLastStrategyUpdate = 0;
        this.aiLastLaneAssessment = 0;
        this.aiNextDeployment = 0;

        // Difficulty scaling (can be adjusted)
        this.difficultyMultiplier = 1.0;
        this.reactionTimeBase = 800; // Base reaction time in ms (human-like)
        this.reactionTimeVariance = 800; // Add variance to feel more natural
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
        if (currentTime - this.aiLastLaneAssessment > 1000) {
            this.assessLaneControl();
            this.aiLastLaneAssessment = currentTime;
        }

        // Track estimated player energy
        this.updateEnergyTracking();

        // Check for reactive spell opportunities (high priority)
        this.checkSpellOpportunities();

        // Check if AI should deploy a card (strategic timing)
        if (currentTime >= this.aiNextDeployment && this.scene.aiEnergy >= 1) {
            const shouldDeploy = this.shouldAIDeploy();
            if (shouldDeploy) {
                this.aiDeployCardStrategically();
                // Dynamic deployment timing based on strategy and difficulty
                // Human-like: need time to assess what just happened
                const baseDelay = this.getDeploymentDelay();
                const thinkingTime = GameHelpers.randomInt(300, 1500); // Humans need time to think
                this.aiNextDeployment = currentTime + baseDelay + thinkingTime;
            }
        }

        // Check for reactive counter-deployment opportunities
        this.checkCounterDeployOpportunity();
    }

    /**
     * Check for spell casting opportunities (reactive gameplay)
     */
    checkSpellOpportunities() {
        const currentTime = this.scene.time.now;

        // Human-like spell timing - need time to notice opportunity, aim, and cast
        // Minimum 2-3 seconds between spell casts (humans can't track everything instantly)
        const minSpellInterval = 2000 + GameHelpers.randomInt(0, 1000);
        if (currentTime - this.aiStrategy.lastSpellTime < minSpellInterval) {
            return;
        }

        // If there's already a pending counter deploy and it's a spell, don't queue another spell
        if (this.aiStrategy.pendingCounterDeploy && this.aiStrategy.pendingCounterDeploy.isSpell) {
            return;
        }

        const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
        if (playerTanks.length === 0) return;

        // Check for Smoke Barrage opportunity - multiple weak/grouped units
        // Helper to check if card is in hand
        const findInHand = (id) => this.scene.aiHand.findIndex(cId => cId === id);

        // Check for Smoke Barrage opportunity - multiple weak/grouped units
        const smokeBarrageCard = CARDS['smoke_barrage'];
        const smokeHandIndex = findInHand('smoke_barrage');

        if (smokeBarrageCard && smokeHandIndex !== -1 && this.scene.aiEnergy >= smokeBarrageCard.cost) {
            // Find clusters of player units (2+ in radius)
            const cluster = this.findBestSpellTarget(playerTanks, smokeBarrageCard.payload.radius, 2);
            if (cluster) {
                // Prioritize zapping skeleton armies or low HP swarms
                const swarmUnits = cluster.targets.filter(t => t.tankData && t.tankData.stats.hp <= 100);
                if (swarmUnits.length >= 3 || cluster.targets.length >= 3) {
                    // Queue spell with human-like reaction delay
                    const reactionTime = this.reactionTimeBase + GameHelpers.randomInt(200, this.reactionTimeVariance);
                    this.aiStrategy.pendingCounterDeploy = {
                        cardId: 'smoke_barrage',
                        isSpell: true,
                        deployTime: currentTime + reactionTime,
                        handIndex: smokeHandIndex
                    };
                    // Update lastSpellTime when queueing to prevent spam
                    this.aiStrategy.lastSpellTime = currentTime;
                    console.log('🤖 AI: Spotted swarm, preparing Smoke Barrage in', reactionTime, 'ms');
                    return;
                }
            }
        }

        // Check for Artillery Strike opportunity - high value grouped targets
        const artilleryStrikeCard = CARDS['artillery_strike'];
        const artilleryHandIndex = findInHand('artillery_strike');

        if (artilleryStrikeCard && artilleryHandIndex !== -1 && this.scene.aiEnergy >= artilleryStrikeCard.cost) {
            // Need 2+ medium/high value targets or 1 clump near tower
            const cluster = this.findBestSpellTarget(playerTanks, artilleryStrikeCard.payload.radius, 2);
            if (cluster) {
                // Calculate total HP value in cluster
                const totalValue = cluster.targets.reduce((sum, t) => {
                    const hp = t.tankData ? t.tankData.stats.hp : 500;
                    return sum + hp;
                }, 0);

                // Fireball if high value (800+ HP worth of units) or 3+ units
                if (totalValue >= 800 || cluster.targets.length >= 3) {
                    // Queue spell with human-like reaction delay
                    const reactionTime = this.reactionTimeBase + GameHelpers.randomInt(200, this.reactionTimeVariance);
                    this.aiStrategy.pendingCounterDeploy = {
                        cardId: 'artillery_strike',
                        isSpell: true,
                        deployTime: currentTime + reactionTime,
                        handIndex: artilleryHandIndex
                    };
                    // Update lastSpellTime when queueing to prevent spam
                    this.aiStrategy.lastSpellTime = currentTime;
                    console.log('🤖 AI: Spotted high-value cluster, preparing Artillery Strike in', reactionTime, 'ms');
                    return;
                }
            }

            // Also consider fireballing player units attacking our tower
            const aiTowers = this.scene.buildings.filter(b => !b.isPlayerOwned && b.health > 0);
            for (const tower of aiTowers) {
                const nearbyEnemies = playerTanks.filter(t =>
                    GameHelpers.distance(t.x, t.y, tower.x, tower.y) < 100
                );
                if (nearbyEnemies.length >= 2) {
                    // Queue spell with human-like reaction delay
                    const reactionTime = this.reactionTimeBase + GameHelpers.randomInt(200, this.reactionTimeVariance);
                    this.aiStrategy.pendingCounterDeploy = {
                        cardId: 'artillery_strike',
                        isSpell: true,
                        deployTime: currentTime + reactionTime,
                        handIndex: artilleryHandIndex
                    };
                    // Update lastSpellTime when queueing to prevent spam
                    this.aiStrategy.lastSpellTime = currentTime;
                    console.log('🤖 AI: Tower under attack, preparing Artillery Strike in', reactionTime, 'ms');
                    return;
                }
            }
        }
    }

    /**
     * Find the best position to cast a spell for maximum targets
     * @param {Array} targets - Array of potential targets
     * @param {number} radius - Spell radius
     * @param {number} minTargets - Minimum targets required
     * @returns {Object|null} Best target cluster {x, y, targets} or null
     */
    findBestSpellTarget(targets, radius, minTargets) {
        if (targets.length < minTargets) return null;

        let bestCluster = null;
        let maxTargets = 0;

        // Check each target as potential center
        targets.forEach(centerTarget => {
            const inRadius = targets.filter(t =>
                GameHelpers.distance(centerTarget.x, centerTarget.y, t.x, t.y) <= radius
            );

            if (inRadius.length > maxTargets) {
                maxTargets = inRadius.length;
                // Calculate centroid for better accuracy
                const centerX = inRadius.reduce((s, t) => s + t.x, 0) / inRadius.length;
                const centerY = inRadius.reduce((s, t) => s + t.y, 0) / inRadius.length;
                bestCluster = { x: centerX, y: centerY, targets: inRadius };
            }
        });

        return maxTargets >= minTargets ? bestCluster : null;
    }

    /**
     * Get deployment delay based on current strategy
     */
    getDeploymentDelay() {
        // Human-like deployment delays - people take time to assess and decide
        const baseDelays = {
            'aggressive': 2500,
            'counter-push': 3000,
            'split-push': 3500,
            'balanced': 4000,
            'defensive': 5500
        };

        let delay = baseDelays[this.aiStrategy.mode] || 4000;

        // Add human-like variance (sometimes quick, sometimes hesitant)
        delay += GameHelpers.randomInt(-500, 1200);

        // Faster during overtime or low time (but still human)
        if (this.scene.battleTime <= 60) {
            delay *= 0.7;
        } else if (this.scene.battleTime <= 30) {
            delay *= 0.5;
        }

        // Scale with difficulty
        delay /= this.difficultyMultiplier;

        return Math.max(delay, 1500); // Minimum 1.5s between deploys (human can't click faster while thinking)
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
        const lanes = {
            left: { playerTanks: 0, aiTanks: 0, threat: 0 },
            center: { playerTanks: 0, aiTanks: 0, threat: 0 },
            right: { playerTanks: 0, aiTanks: 0, threat: 0 }
        };

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
            const cardId = counter.cardId;
            const card = cardId ? CARDS[cardId] : null;

            if (card && this.scene.aiEnergy >= card.cost) {
                let deployed = false;

                if (counter.isSpell) {
                    deployed = this.deployCounterSpell(card, cardId, counter.handIndex);
                } else if (card.payload && card.payload.swarm) {
                    deployed = this.deployCounterSwarm(card, cardId, counter.x, counter.y, counter.handIndex);
                } else if (card.payload && card.payload.tankId) {
                    deployed = this.deployCounterTroop(card, cardId, counter.x, counter.y, counter.handIndex);
                }

                if (deployed) {
                    this.scene.aiEnergy -= card.cost;
                    this.aiStrategy.pendingCounterDeploy = null;
                } else {
                    // Deployment failed - clear pending to avoid infinite retries
                    this.aiStrategy.pendingCounterDeploy = null;
                }
            } else {
                // Can't afford or invalid card - clear pending
                this.aiStrategy.pendingCounterDeploy = null;
            }
        }
    }

    /**
     * Deploy a counter spell at the best target location
     * @returns {boolean} Whether the spell was successfully cast
     */
    deployCounterSpell(card, cardId, handIndex) {
        // Verify card is still in hand (if index provided)
        if (handIndex !== undefined) {
            if (this.scene.aiHand[handIndex] !== cardId) {
                console.log('🤖 AI: Counter spell cancelled - card no longer in hand');
                return false;
            }
        }

        const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const cluster = this.findBestSpellTarget(playerTanks, card.payload.radius, 1);
        if (cluster) {
            this.scene.aiCastSpell(card, cluster.x, cluster.y);
            this.aiStrategy.lastSpellTime = this.scene.time.now;

            // Cycle card if hand index provided
            if (handIndex !== undefined) {
                this.scene.cycleAICard(handIndex);
            }

            console.log('🤖 AI: Cast', cardId);
            return true;
        }
        return false;
    }

    /**
     * Deploy a counter swarm at the specified position
     * @returns {boolean} Whether the swarm was successfully deployed
     */
    deployCounterSwarm(card, cardId, x, y, handIndex) {
        // Verify card is still in hand (if index provided)
        if (handIndex !== undefined) {
            if (this.scene.aiHand[handIndex] !== cardId) {
                console.log('🤖 AI: Counter swarm cancelled - card no longer in hand');
                return false;
            }
        }

        this.scene.aiDeploySwarm(card, x, y);

        // Cycle card if hand index provided
        if (handIndex !== undefined) {
            this.scene.cycleAICard(handIndex);
        }

        console.log('🤖 AI: Counter-deployed swarm', cardId);
        return true;
    }

    /**
     * Deploy a counter troop at the specified position
     * @returns {boolean} Whether the troop was successfully deployed
     */
    deployCounterTroop(card, cardId, x, y, handIndex) {
        // Verify card is still in hand (if index provided)
        if (handIndex !== undefined) {
            if (this.scene.aiHand[handIndex] !== cardId) {
                console.log('🤖 AI: Counter troop cancelled - card no longer in hand');
                return false;
            }
        }

        const tankId = card.payload.tankId;
        const tankData = TANK_DATA[tankId];
        if (tankData) {
            this.scene.deployAITank(tankId, x, y);

            // Cycle card if hand index provided
            if (handIndex !== undefined) {
                this.scene.cycleAICard(handIndex);
            }

            console.log('🤖 AI: Counter-deployed', cardId);
            return true;
        }
        console.log('🤖 AI: Invalid tank data for counter', cardId);
        return false;
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

        const playerBase = this.scene.buildings.find(b => b.isPlayerOwned && b.isMainTower);
        const aiBase = this.scene.buildings.find(b => !b.isPlayerOwned && b.isMainTower);

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
            playerLeftTower: buildings.some(b => b.isPlayerOwned && b.towerType === 'left' && b.health > 0),
            playerRightTower: buildings.some(b => b.isPlayerOwned && b.towerType === 'right' && b.health > 0),
            playerMainTower: buildings.some(b => b.isPlayerOwned && b.isMainTower && b.health > 0),
            aiLeftTower: buildings.some(b => !b.isPlayerOwned && b.towerType === 'left' && b.health > 0),
            aiRightTower: buildings.some(b => !b.isPlayerOwned && b.towerType === 'right' && b.health > 0),
            aiMainTower: buildings.some(b => !b.isPlayerOwned && b.isMainTower && b.health > 0)
        };

        // Track if AI has an active V1 launcher (spawner building)
        // V1 launchers don't have towerType and are not main towers
        const aiV1Launchers = buildings.filter(b =>
            !b.isPlayerOwned &&
            !b.towerType &&
            !b.isMainTower &&
            b.health > 0
        );
        this.aiStrategy.aiFurnaceActive = aiV1Launchers.length > 0;
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
            // Only include preferred cards that are actually in the AI's deck
            const criticalPreferred = ['jagdpanzer', 'sherman', 'panther'];
            strategy.preferredCards = criticalPreferred.filter(card => this.scene.aiDeck.includes(card));
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
     * Update preferred cards based on strategy and counters
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

        // Counter-pick logic using CARD IDs
        const counters = [];

        // Counter heavy tanks with mini pekka (tank killer)
        if (heavyCount >= 2) {
            counters.push('jagdpanzer');
        }

        // Counter swarm of light tanks with spells or splash
        if (lightCount >= 3) {
            counters.push('smoke_barrage', 'artillery_strike');
        }

        // Counter tank destroyers with swarm to surround them
        if (tdCount >= 1) {
            counters.push('infantry_platoon', 'panther');
        }

        // Mode-specific preferences using CARD IDs
        const modePreferences = {
            'aggressive': ['tiger', 'panther', 'infantry_platoon', 'jagdpanzer'],
            'defensive': ['sherman', 'jagdpanzer', 'v1_launcher', 'artillery_strike'],
            'counter-push': ['panther', 'jagdpanzer', 'sherman'],
            'split-push': ['infantry_platoon', 'panther'],
            'balanced': ['tiger', 'panther', 'sherman', 'jagdpanzer']
        };

        // Combine counters with mode preferences, filtering by cards actually in AI's deck
        const modePrefs = modePreferences[this.aiStrategy.mode] || modePreferences['balanced'];
        const allPreferred = [...new Set([...counters, ...modePrefs])];
        // Only include cards that are actually in the AI's deck
        const aiDeck = this.scene.aiDeck || [];
        this.aiStrategy.preferredCards = allPreferred.filter(cardId => aiDeck.includes(cardId));
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
     * Chooses and deploys an AI card strategically (troops, spells, or buildings)
     */
    aiDeployCardStrategically() {
        // Get AI's current hand (4 cards from 8-card deck)
        const energy = this.scene.aiEnergy;
        const hand = this.scene.aiHand.map(cardId => {
            const card = CARDS[cardId];
            return {
                id: cardId,
                name: card ? card.name : cardId,
                cost: card ? card.cost : '?',
                affordable: card && card.cost <= energy
            };
        });

        // Choose which card to deploy
        const choice = this.chooseAICard();
        if (!choice) {
            console.log('🤖 AI: No suitable card available');
            return;
        }

        const cardId = choice.cardId;
        const reason = choice.reason;
        const handIndex = choice.handIndex;

        const card = CARDS[cardId];
        if (!card) {
            console.log('🤖 AI: Invalid card data for', cardId);
            return;
        }

        // Check if AI has enough energy
        if (this.scene.aiEnergy < card.cost) {
            console.log('🤖 AI: Not enough energy for', cardId, 'Cost:', card.cost, 'Have:', this.scene.aiEnergy);
            return;
        }

        // Log the deployment decision with full context
        console.log('═══════════════════════════════════════════════════════');
        console.log('🤖 AI CARD DEPLOYMENT');
        console.log('───────────────────────────────────────────────────────');
        console.log('📋 Hand:', hand.map(c => `${c.name}(${c.cost})${c.affordable ? '✓' : '✗'}`).join(', '));
        console.log('⚡ Energy:', energy);
        console.log('🎯 Deployed:', card.name, `(Cost: ${card.cost})`);
        console.log('💭 Reason:', reason);
        console.log('📊 Strategy:', this.aiStrategy.mode, '| Lane:', this.aiStrategy.activeLane);
        console.log('═══════════════════════════════════════════════════════');

        // Handle different card types
        if (card.type === CARD_TYPES.SPELL) {
            // Find best spell target
            const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
            const cluster = this.findBestSpellTarget(playerTanks, card.payload.radius, 1);
            if (cluster) {
                this.scene.aiCastSpell(card, cluster.x, cluster.y);
                this.scene.aiEnergy -= card.cost;
                this.aiStrategy.lastSpellTime = this.scene.time.now;
                // Cycle the used card
                this.scene.cycleAICard(handIndex);
            }
            return;
        }

        if (card.type === CARD_TYPES.BUILDING) {
            // Choose building placement position
            const buildingPos = this.chooseAIBuildingPosition();
            if (buildingPos) {
                this.scene.aiPlaceBuilding(card, buildingPos.x, buildingPos.y);
                this.scene.aiEnergy -= card.cost;
                this.aiStrategy.aiFurnaceActive = true;
                this.aiStrategy.lastBuildingTime = this.scene.time.now;
                // Cycle the used card
                this.scene.cycleAICard(handIndex);
            }
            return;
        }

        // TROOP card - get tank data from payload
        const tankId = card.payload.tankId;
        const tankData = TANK_DATA[tankId];
        if (!tankData) {
            console.log('🤖 AI: Invalid tank data for card', cardId);
            return;
        }

        // Choose deployment position based on strategy and lane
        const deploymentPos = this.chooseAIDeploymentPosition(tankData);
        if (!deploymentPos) {
            console.log('🤖 AI: No valid deployment position');
            return;
        }

        // Check if this is a swarm card
        if (card.payload.swarm) {
            this.scene.aiDeploySwarm(card, deploymentPos.x, deploymentPos.y);
        } else {
            // Deploy single unit
            this.scene.deployAITank(tankId, deploymentPos.x, deploymentPos.y);
        }

        // Deduct energy
        this.scene.aiEnergy = Math.max(0, this.scene.aiEnergy - card.cost);

        // Cycle the used card
        this.scene.cycleAICard(handIndex);

        // Consider deploying a combo card if we have energy
        this.considerComboCardDeployment(cardId, tankData, deploymentPos);
    }

    /**
     * Choose strategic building placement position (for V1 Launcher etc)
     * @returns {Object|null} Position {x, y} or null
     */
    chooseAIBuildingPosition() {
        const deploymentZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
        const offsetX = GameHelpers.getBattlefieldOffset();

        // Buildings should be placed in the back, protected by towers
        // Prefer center-ish position behind the main battle line
        for (let attempts = 0; attempts < 20; attempts++) {
            // Place in rows 3-8 (back half of enemy zone)
            const tileY = GameHelpers.randomInt(deploymentZone.tileY + 3, deploymentZone.tileY + 8);
            // Center-ish X position (tiles 5-12)
            const tileX = GameHelpers.randomInt(5, 12);

            if (GameHelpers.isValidDeploymentTile(tileX, tileY, false, this.scene.expandedDeploymentZones)) {
                const worldPos = GameHelpers.tileToWorld(tileX, tileY);

                // Make sure not too close to other buildings
                const nearbyBuildings = this.scene.buildings.filter(b =>
                    GameHelpers.distance(worldPos.worldX, worldPos.worldY, b.x, b.y) < 60
                );

                if (nearbyBuildings.length === 0) {
                    return { x: worldPos.worldX, y: worldPos.worldY };
                }
            }
        }

        return null;
    }

    /**
     * Consider deploying a combo card to support the just-deployed card
     */
    considerComboCardDeployment(primaryCardId, primaryTankData, deployPos) {
        // Only combo if we have enough energy
        if (this.scene.aiEnergy < 2) return;
        if (this.aiStrategy.mode === 'defensive') return; // Don't over-commit when defensive

        // Combo patterns using CARD IDs
        const combos = {
            'tiger': ['panther', 'sherman'],      // Tiger + ranged support
            'jagdpanzer': ['panther'],               // Jagdpanzer + air support
            'sherman': ['infantry_platoon'],              // Sherman + distraction
        };

        const comboOptions = combos[primaryCardId];
        if (!comboOptions) return;

        // Find affordable combo card
        for (const comboCardId of comboOptions) {
            const comboCard = CARDS[comboCardId];

            // Check if card is in hand
            const handIndex = this.scene.aiHand.findIndex(id => id === comboCardId);

            if (comboCard && handIndex !== -1 && this.scene.aiEnergy >= comboCard.cost) {
                const comboTankId = comboCard.payload.tankId;
                const comboData = TANK_DATA[comboTankId];
                if (!comboData) continue;

                // Position combo unit near but not on top of primary
                const sideOffset = GameHelpers.randomInt(-60, 60);
                const behindOffset = GameHelpers.randomInt(-30, -60);

                this.aiStrategy.pendingCounterDeploy = {
                    cardId: comboCardId,
                    tankId: comboTankId,
                    x: deployPos.x + sideOffset,
                    y: deployPos.y + behindOffset,
                    deployTime: this.scene.time.now + GameHelpers.randomInt(300, 600),
                    handIndex: handIndex
                };
                console.log('🤖 AI: Queued combo deploy', comboCardId);
                break;
            }
        }
    }

    /**
     * Chooses which card the AI should deploy (troop, spell, or building)
     * @returns {Object|null} Object with cardId, reason, and handIndex, or null if none available
     */
    chooseAICard() {
        const energy = this.scene.aiEnergy;
        const currentTime = this.scene.time.now;

        // Filter available cards from AI's 4-card hand by energy cost
        const availableCards = [];
        this.scene.aiHand.forEach((cardId, index) => {
            const card = CARDS[cardId];
            if (card && card.cost <= energy) {
                availableCards.push({ cardId, index });
            }
        });

        if (availableCards.length === 0) {
            return null;
        }

        // Helper to find card in hand
        const findCardInHand = (targetCardId) => {
            return availableCards.find(c => c.cardId === targetCardId);
        };

        // Analyze current battlefield situation
        const playerTanks = this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0);
        const aiTanks = this.scene.tanks.filter(t => !t.isPlayerTank && t.health > 0);
        const heavyPlayerTanks = playerTanks.filter(t => t.tankData.type === TANK_TYPES.HEAVY).length;
        const lightPlayerTanks = playerTanks.filter(t =>
            t.tankData.type === TANK_TYPES.LIGHT || t.tankData.type === TANK_TYPES.FAST_ATTACK
        ).length;

        // PRIORITY 1: Consider placing V1 Launcher if no active one and enough energy
        const v1LauncherInHand = findCardInHand('v1_launcher');
        if (v1LauncherInHand &&
            !this.aiStrategy.aiFurnaceActive &&
            currentTime - this.aiStrategy.lastBuildingTime > 20000 &&
            energy >= 5) {
            if (Math.random() < 0.4) {
                return { cardId: 'v1_launcher', reason: 'Spawner pressure - no active V1 launcher', handIndex: v1LauncherInHand.index };
            }
        }

        // PRIORITY 2: Counter swarms with Smoke Barrage
        const smokeBarrageInHand = findCardInHand('smoke_barrage');
        if (smokeBarrageInHand && lightPlayerTanks >= 3) {
            if (Math.random() < 0.5) {
                return { cardId: 'smoke_barrage', reason: `Counter swarm - ${lightPlayerTanks} light units detected`, handIndex: smokeBarrageInHand.index };
            }
        }

        // PRIORITY 3: Counter heavy pushes with Jagdpanzer
        const jagdpanzerInHand = findCardInHand('jagdpanzer');
        if (jagdpanzerInHand && heavyPlayerTanks >= 1) {
            if (Math.random() < 0.6) {
                return { cardId: 'jagdpanzer', reason: `Counter heavy - ${heavyPlayerTanks} heavy tank(s) detected`, handIndex: jagdpanzerInHand.index };
            }
        }

        // PRIORITY 4: Deploy Tiger as win condition when we have support
        const tigerInHand = findCardInHand('tiger');
        if (tigerInHand && energy >= 7 && aiTanks.length >= 1) {
            if (Math.random() < 0.5) {
                return { cardId: 'tiger', reason: `Win condition - ${aiTanks.length} support units ready, ${energy} energy`, handIndex: tigerInHand.index };
            }
        }

        // PRIORITY 5: Deploy Infantry Platoon as distraction or counter
        const infantryPlatoonInHand = findCardInHand('infantry_platoon');
        if (infantryPlatoonInHand) {
            if (playerTanks.some(t => t.tankData.stats.damage >= 100) && Math.random() < 0.4) {
                return { cardId: 'infantry_platoon', reason: 'Distraction - high damage enemy detected', handIndex: infantryPlatoonInHand.index };
            }
        }

        // Get preferred troop cards that are in hand
        const preferredAvailable = availableCards.filter(item => {
            const card = CARDS[item.cardId];
            return card.type === CARD_TYPES.TROOP && this.aiStrategy.preferredCards.includes(item.cardId);
        });

        // Mode-specific selection for troop cards
        const troopCards = availableCards.filter(item => CARDS[item.cardId].type === CARD_TYPES.TROOP);

        let chosenItem = null;
        let reason = '';

        switch (this.aiStrategy.mode) {
            case 'aggressive':
            case 'counter-push':
                // Prefer high DPS or win conditions
                const aggressivePicks = troopCards.filter(item => {
                    const card = CARDS[item.cardId];
                    if (!card.payload.tankId) return false;
                    const data = TANK_DATA[card.payload.tankId];
                    return data && (data.stats.damage >= 80 || item.cardId === 'tiger');
                });
                if (aggressivePicks.length > 0) {
                    chosenItem = aggressivePicks[Math.floor(Math.random() * aggressivePicks.length)];
                    reason = `Mode ${this.aiStrategy.mode} - high DPS pick`;
                }
                break;

            case 'defensive':
                // Prefer ranged or high HP units
                const defensivePicks = troopCards.filter(item => {
                    const card = CARDS[item.cardId];
                    if (!card.payload.tankId) return false;
                    const data = TANK_DATA[card.payload.tankId];
                    return data && (data.stats.range >= 200 || data.stats.hp >= 400);
                });
                if (defensivePicks.length > 0) {
                    chosenItem = defensivePicks[Math.floor(Math.random() * defensivePicks.length)];
                    reason = 'Mode defensive - ranged/tanky pick';
                }
                break;

            case 'split-push':
                // Prefer cheap units for split pressure
                const splitPicks = troopCards.filter(item => {
                    const card = CARDS[item.cardId];
                    return card.cost <= 3;
                });
                if (splitPicks.length > 0) {
                    chosenItem = splitPicks[Math.floor(Math.random() * splitPicks.length)];
                    reason = 'Mode split-push - cheap unit for pressure';
                }
                break;
        }

        // Fallback to preferred or random troop card
        if (!chosenItem) {
            if (preferredAvailable.length > 0 && Math.random() < 0.75) {
                chosenItem = preferredAvailable[Math.floor(Math.random() * preferredAvailable.length)];
                reason = 'Preferred card from strategy list';
            } else if (troopCards.length > 0) {
                chosenItem = troopCards[Math.floor(Math.random() * troopCards.length)];
                reason = 'Random troop card selection';
            } else {
                // If no troop cards, pick any available card
                chosenItem = availableCards[Math.floor(Math.random() * availableCards.length)];
                reason = 'Fallback - random available card';
            }
        }

        return { cardId: chosenItem.cardId, reason: reason, handIndex: chosenItem.index };
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
        const playerTowers = this.scene.buildings.filter(b => b.isPlayerOwned && b.health > 0);
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
        const aiBase = this.scene.buildings.find(b => !b.isPlayerOwned && b.isMainTower);
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
                // Log which card was played (once per card, even for swarms)
                const countInfo = data.isSwarm ? ` x${data.count}` : '';
                console.log(`🎴 Player played: ${data.cardName}${countInfo} (${data.type}, cost: ${data.cost})`);

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
                    tankId: data.tankId,
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
                    // Schedule deployment with human-like reaction (notice loss -> assess -> respond)
                    const responseTime = this.reactionTimeBase + GameHelpers.randomInt(0, this.reactionTimeVariance);
                    this.aiNextDeployment = Math.min(this.aiNextDeployment,
                        currentTime + responseTime);
                }
                break;

            case 'towerDamage':
                // Player damaged our tower - defensive reaction
                if (data.isAITower && data.damage > 100) {
                    this.aiStrategy.mode = 'defensive';
                    // Deploy with human-like reaction time (notice damage -> panic -> decide -> act)
                    if (this.scene.aiEnergy >= 3) {
                        const panicReaction = this.reactionTimeBase + GameHelpers.randomInt(-300, 500);
                        this.aiNextDeployment = currentTime + panicReaction;
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

        // Counter-pick table using CARD IDs
        const counters = {
            [TANK_TYPES.HEAVY]: ['jagdpanzer', 'infantry_platoon'],     // Jagdpanzer shreds tanks, infantry distract
            [TANK_TYPES.LIGHT]: ['smoke_barrage', 'panther'],               // Smoke for swarms, Panther for damage
            [TANK_TYPES.FAST_ATTACK]: ['smoke_barrage', 'panther'],
            [TANK_TYPES.TANK_DESTROYER]: ['infantry_platoon', 'tiger'], // Swarm to overwhelm, Tiger to tank
            [TANK_TYPES.ARTILLERY]: ['panther', 'jagdpanzer'],   // Fast units to reach artillery
            [TANK_TYPES.MEDIUM]: ['jagdpanzer', 'sherman']
        };

        const counterOptions = counters[playerTankData.type] || ['panther'];

        // Find affordable counter from cards
        for (const cardId of counterOptions) {
            const card = CARDS[cardId];

            // Check if card is in hand
            const handIndex = this.scene.aiHand.findIndex(id => id === cardId);

            if (card && handIndex !== -1 && this.scene.aiEnergy >= card.cost) {
                // Handle spells differently - they don't need deployment position in the same way
                if (card.type === CARD_TYPES.SPELL) {
                    // Queue spell for next opportunity with human-like delay
                    const spellReactionTime = this.reactionTimeBase + GameHelpers.randomInt(200, this.reactionTimeVariance);
                    this.aiStrategy.pendingCounterDeploy = {
                        cardId: cardId,
                        tankId: null,
                        isSpell: true,
                        x: 0, y: 0, // Will be calculated when cast
                        deployTime: this.scene.time.now + spellReactionTime,
                        handIndex: handIndex
                    };
                    console.log('🤖 AI: Preparing spell counter', cardId, 'in', spellReactionTime, 'ms');
                    return;
                }

                // For troop cards
                const tankId = card.payload.tankId;
                if (!tankId) continue;

                // Find a good deployment position
                const deployZone = BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
                const tileX = GameHelpers.randomInt(2, GAME_CONFIG.TILES_X - 3);
                const tileY = GameHelpers.randomInt(deployZone.tileY + 8,
                    deployZone.tileY + deployZone.tilesHeight - 1);
                const worldPos = GameHelpers.tileToWorld(tileX, tileY);

                // Schedule counter with human-like reaction delay
                // Humans need time to: notice deployment -> identify unit -> decide counter -> execute
                const reactionTime = this.reactionTimeBase + GameHelpers.randomInt(0, this.reactionTimeVariance);
                this.aiStrategy.pendingCounterDeploy = {
                    cardId: cardId,
                    tankId: tankId,
                    x: worldPos.worldX,
                    y: worldPos.worldY,
                    deployTime: this.scene.time.now + reactionTime,
                    handIndex: handIndex
                };
                console.log('🤖 AI: Preparing counter', cardId, 'in', reactionTime, 'ms');
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
            enemies.push(...this.scene.buildings.filter(b => !b.isPlayerOwned && b.health > 0));
        } else {
            if (canAttackTanks) {
                enemies.push(...this.scene.tanks.filter(t => t.isPlayerTank && t.health > 0));
            }
            enemies.push(...this.scene.buildings.filter(b => b.isPlayerOwned && b.health > 0));
        }

        enemies.forEach(enemy => {
            const distance = GameHelpers.distance(tank.x, tank.y, enemy.x, enemy.y);
            let priority = 0;

            // Base priority: closer targets are higher priority
            priority += (1000 - distance) / 10;

            // Priority modifiers based on target type
            const isBuilding = enemy.isPlayerOwned !== undefined || enemy.isMainTower !== undefined;
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
                if (enemy.target && (enemy.target.isPlayerOwned !== undefined)) {
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
