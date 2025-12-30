// Utility helper functions
const GameHelpers = {
    // Calculate distance between two points
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Calculate angle between two points
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    // Linear interpolation
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },

    // Check if point is inside rectangle
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Generate random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Generate random float between min and max
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Checks if a building is an actual tower (not a Furnace or other deployable building).
     * Towers have either a towerType ('left', 'right') or isMainTower property.
     * @param {Object} building - Building object to check
     * @returns {boolean} True if the building is an actual tower
     */
    isActualTower(building) {
        return !!(building && (building.towerType || building.isMainTower));
    },

    // Tile-based coordinate conversion functions
    
    // Get the horizontal offset for centering the battlefield
    getBattlefieldOffset() {
        return (GAME_CONFIG.WIDTH - GAME_CONFIG.WORLD_WIDTH) / 2;
    },
    
    // Convert world coordinates to tile coordinates
    worldToTile(worldX, worldY) {
        const offsetX = this.getBattlefieldOffset();
        return {
            tileX: Math.floor((worldX - offsetX) / GAME_CONFIG.TILE_SIZE),
            tileY: Math.floor(worldY / GAME_CONFIG.TILE_SIZE)
        };
    },

    // Convert tile coordinates to world coordinates (center of tile)
    tileToWorld(tileX, tileY) {
        const offsetX = this.getBattlefieldOffset();
        return {
            worldX: offsetX + (tileX + 0.5) * GAME_CONFIG.TILE_SIZE,
            worldY: (tileY + 0.5) * GAME_CONFIG.TILE_SIZE
        };
    },

    // Snap world coordinates to nearest tile center
    snapToTile(worldX, worldY) {
        const tile = this.worldToTile(worldX, worldY);
        return this.tileToWorld(tile.tileX, tile.tileY);
    },

    /**
     * Check if tile coordinates are within deployment zone and not occupied by towers.
     * @param {number} tileX - The X coordinate of the tile.
     * @param {number} tileY - The Y coordinate of the tile.
     * @param {boolean} [isPlayer=true] - Whether to check for the player's zone (true) or enemy's zone (false).
     * @param {Object|null} [expandedZones=null] - Optional expanded deployment zones.
     *   Structure:
     *   {
     *     player: {
     *       expandedAreas: [
     *         { tileX: number, tileY: number, tilesWidth: number, tilesHeight: number },
     *         ...
     *       ]
     *     },
     *     enemy: {
     *       expandedAreas: [
     *         { tileX: number, tileY: number, tilesWidth: number, tilesHeight: number },
     *         ...
     *       ]
     *     }
     *   }
     *   Each expandedArea defines a rectangular region in tile coordinates.
     *   If expandedZones is null or missing, only the original deployment zone is checked.
     * @returns {boolean} True if the tile is valid for deployment, false otherwise.
     */
    isValidDeploymentTile(tileX, tileY, isPlayer = true, expandedZones = null) {
        const originalZone = isPlayer ? BATTLE_CONFIG.DEPLOYMENT_ZONES.PLAYER : BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
        
        // First check if tile is within the original deployment zone
        let inOriginalZone = (tileX >= originalZone.tileX && 
                             tileX < originalZone.tileX + originalZone.tilesWidth &&
                             tileY >= originalZone.tileY && 
                             tileY < originalZone.tileY + originalZone.tilesHeight);
        
        // Check if tile is in any expanded areas
        let inExpandedArea = false;
        const zone = isPlayer ? 'player' : 'enemy';
        if (expandedZones && expandedZones[zone]) {
            const teamExpansion = expandedZones[zone];
            if (teamExpansion.expandedAreas) {
                for (const expandedArea of teamExpansion.expandedAreas) {
                    if (tileX >= expandedArea.tileX && 
                        tileX < expandedArea.tileX + expandedArea.tilesWidth &&
                        tileY >= expandedArea.tileY && 
                        tileY < expandedArea.tileY + expandedArea.tilesHeight) {
                        inExpandedArea = true;
                        break;
                    }
                }
            }
        }
        
        // Must be in either original zone or expanded area
        if (!inOriginalZone && !inExpandedArea) {
            return false;
        }
        
        // Get tower positions for the appropriate team
        const towers = isPlayer ? BATTLE_CONFIG.TOWERS.POSITIONS.PLAYER : BATTLE_CONFIG.TOWERS.POSITIONS.ENEMY;
        
        // Check if tile overlaps with any tower (towers are 3x3 or 3x4/4x3)
        const towerList = [towers.LEFT, towers.RIGHT, towers.MAIN];
        
        for (const tower of towerList) {
            // Calculate tower bounds
            let towerWidth, towerHeight;
            
            if (tower === towers.MAIN) {
                // Main towers are 4x3 for both players
                towerWidth = 4; towerHeight = 3;
            } else {
                // Side towers are 3x3
                towerWidth = 3; towerHeight = 3;
            }
            
            // Calculate tower bounds (tower position is center, so offset by half)
            const towerLeft = tower.tileX - Math.floor(towerWidth / 2);
            const towerTop = tower.tileY - Math.floor(towerHeight / 2);
            const towerRight = towerLeft + towerWidth - 1;
            const towerBottom = towerTop + towerHeight - 1;
            
            // Check if deployment tile overlaps with tower area
            if (tileX >= towerLeft && tileX <= towerRight && 
                tileY >= towerTop && tileY <= towerBottom) {
                return false;
            }
        }
        
        return true;
    },

    // Convert deployment zone to world coordinates
    getDeploymentZoneWorldCoords(isPlayer = true) {
        const zone = isPlayer ? BATTLE_CONFIG.DEPLOYMENT_ZONES.PLAYER : BATTLE_CONFIG.DEPLOYMENT_ZONES.ENEMY;
        const offsetX = this.getBattlefieldOffset();
        
        return {
            x: offsetX + zone.tileX * GAME_CONFIG.TILE_SIZE,
            y: zone.tileY * GAME_CONFIG.TILE_SIZE,
            width: zone.tilesWidth * GAME_CONFIG.TILE_SIZE,
            height: zone.tilesHeight * GAME_CONFIG.TILE_SIZE
        };
    },

    // Check if a world position falls within the battlefield bounds
    isWithinBattlefieldWorld(x, y) {
        const offsetX = this.getBattlefieldOffset();
        const minX = offsetX;
        const maxX = offsetX + GAME_CONFIG.WORLD_WIDTH;
        const minY = 0;
        const maxY = GAME_CONFIG.WORLD_HEIGHT;
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    },

    // Save game state to localStorage
    saveGameState(gameState) {
        try {
            localStorage.setItem('tankTacticsData', JSON.stringify(gameState));
            return true;
        } catch (error) {
            console.error('Failed to save game state:', error);
            return false;
        }
    },

    // Load game state from localStorage
    loadGameState() {
        try {
            const saved = localStorage.getItem('tankTacticsData');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Failed to load game state:', error);
            return null;
        }
    },

    // Get default game state
    getDefaultGameState() {
        return {
            player: {
                tanks: [
                    'tank_skeleton', 'tank_megaminion', 'tank_musketeer', 'tank_minipakka',
                    'tank_giant', 'tank_skeleton', 'tank_megaminion', 'tank_musketeer'
                ], // Starting 8-card deck
                resources: { credits: 1000, research: 0 },
                progress: { level: 1, xp: 0 },
                research: { completed: [], active: null }
            },
            campaign: {
                currentMission: 1,
                unlockedMissions: [1],
                stars: {}
            },
            settings: {
                soundEnabled: true,
                musicEnabled: true,
                volume: 0.8
            }
        };
    },

    /**
     * Determines battle result based on tower destruction count and main tower health.
     * @param {Array} buildings - Array of building objects with isPlayerOwned (team ownership), isMainTower, health, maxHealth
     * @returns {'victory'|'defeat'|'draw'|null} - Result or null if no clear winner yet
     */
    determineBattleResult(buildings) {
        // Filter for actual towers only, exclude Furnaces and other buildings
        const actualTowers = buildings.filter(b => this.isActualTower(b));
        
        // Count towers for each side (each side starts with 3 towers)
        const playerTowersAlive = actualTowers.filter(b => b.isPlayerOwned && b.health > 0).length;
        const enemyTowersAlive = actualTowers.filter(b => !b.isPlayerOwned && b.health > 0).length;
        
        // Calculate destroyed towers
        const playerTowersDestroyed = 3 - playerTowersAlive;
        const enemyTowersDestroyed = 3 - enemyTowersAlive;
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('🏆 BATTLE RESULT DETERMINATION');
        console.log('───────────────────────────────────────────────────────');
        console.log(`📊 Total buildings: ${buildings.length}, Actual towers: ${actualTowers.length}`);
        console.log(`🔵 Player: ${playerTowersAlive} towers alive, ${playerTowersDestroyed} destroyed`);
        console.log(`🔴 Enemy: ${enemyTowersAlive} towers alive, ${enemyTowersDestroyed} destroyed`);
        
        // First priority: Compare tower destruction count
        if (enemyTowersDestroyed > playerTowersDestroyed) {
            console.log(`✅ Result: VICTORY (Player destroyed more towers: ${enemyTowersDestroyed} vs ${playerTowersDestroyed})`);
            console.log('═══════════════════════════════════════════════════════');
            return 'victory'; // Player destroyed more enemy towers
        } else if (playerTowersDestroyed > enemyTowersDestroyed) {
            console.log(`❌ Result: DEFEAT (Enemy destroyed more towers: ${playerTowersDestroyed} vs ${enemyTowersDestroyed})`);
            console.log('═══════════════════════════════════════════════════════');
            return 'defeat'; // Enemy destroyed more player towers
        }
        
        // Same number of towers destroyed - compare lowest tower health (absolute values)
        const playerTowers = actualTowers.filter(b => b.isPlayerOwned && b.health > 0);
        const enemyTowers = actualTowers.filter(b => !b.isPlayerOwned && b.health > 0);
        
        // Find lowest absolute health for each side
        let playerLowestHealth = Infinity;
        for (const tower of playerTowers) {
            if (tower.health < playerLowestHealth) {
                playerLowestHealth = tower.health;
            }
        }
        
        let enemyLowestHealth = Infinity;
        for (const tower of enemyTowers) {
            if (tower.health < enemyLowestHealth) {
                enemyLowestHealth = tower.health;
            }
        }
        
        console.log(`⚖️ Tower destruction tied - comparing lowest health`);
        console.log(`🔵 Player lowest tower HP: ${playerLowestHealth}`);
        console.log(`🔴 Enemy lowest tower HP: ${enemyLowestHealth}`);
        
        // The side with the lower health tower loses
        if (enemyLowestHealth < playerLowestHealth) {
            console.log(`✅ Result: VICTORY (Enemy has weaker tower: ${enemyLowestHealth} < ${playerLowestHealth})`);
            console.log('═══════════════════════════════════════════════════════');
            return 'victory'; // Enemy has the weakest tower
        } else if (playerLowestHealth < enemyLowestHealth) {
            console.log(`❌ Result: DEFEAT (Player has weaker tower: ${playerLowestHealth} < ${enemyLowestHealth})`);
            console.log('═══════════════════════════════════════════════════════');
            return 'defeat'; // Player has the weakest tower
        } else {
            console.log(`🤝 Result: DRAW (Equal lowest health: ${playerLowestHealth})`);
            console.log('═══════════════════════════════════════════════════════');
            return 'draw'; // Equal lowest health
        }
    }
};
