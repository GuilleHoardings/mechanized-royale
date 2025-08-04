
// Pathfinding utility for Tank Tactics game
class Pathfinding {
    static needsPathfinding(startPos, endPos) {
        // Check if both positions are on the same side of the river
        const riverY = GAME_CONFIG.WORLD_HEIGHT / 2;
        const startSide = startPos.y < riverY ? 'top' : 'bottom';
        const endSide = endPos.y < riverY ? 'top' : 'bottom';
        
        // If they're on the same side, simple movement is fine
        return startSide !== endSide;
    }

    static #isWalkable(tileX, tileY, tank) {
        const riverTopTileY = Math.floor((GAME_CONFIG.WORLD_HEIGHT / 2 - 40) / GAME_CONFIG.TILE_SIZE);
        const riverBottomTileY = Math.floor((GAME_CONFIG.WORLD_HEIGHT / 2 + 40) / GAME_CONFIG.TILE_SIZE);

        if (tileY >= riverTopTileY && tileY <= riverBottomTileY) {
            const bridge1LeftTileX = Math.floor((GAME_CONFIG.WORLD_WIDTH / 4 - 30) / GAME_CONFIG.TILE_SIZE);
            const bridge1RightTileX = Math.floor((GAME_CONFIG.WORLD_WIDTH / 4 + 30) / GAME_CONFIG.TILE_SIZE);
            const bridge2LeftTileX = Math.floor((GAME_CONFIG.WORLD_WIDTH * 3 / 4 - 30) / GAME_CONFIG.TILE_SIZE);
            const bridge2RightTileX = Math.floor((GAME_CONFIG.WORLD_WIDTH * 3 / 4 + 30) / GAME_CONFIG.TILE_SIZE);

            if ((tileX >= bridge1LeftTileX && tileX <= bridge1RightTileX) ||
                (tileX >= bridge2LeftTileX && tileX <= bridge2RightTileX)) {
                return true; // It's a bridge
            }
            return false; // It's water
        }

        return true; // It's land
    }

    static findPath(startPos, endPos, tank) {
        const startTile = GameHelpers.worldToTile(startPos.x, startPos.y);
        const endTile = GameHelpers.worldToTile(endPos.x, endPos.y);

        // Quick check if start and end are the same
        if (startTile.tileX === endTile.tileX && startTile.tileY === endTile.tileY) {
            return [GameHelpers.tileToWorld(startTile.tileX, startTile.tileY)];
        }

        const openSet = [startTile];
        const closedSet = new Set();
        const cameFrom = new Map();

        const gScore = new Map();
        gScore.set(`${startTile.tileX},${startTile.tileY}`, 0);

        const fScore = new Map();
        fScore.set(`${startTile.tileX},${startTile.tileY}`, this.#heuristic(startTile, endTile));

        let iterations = 0;
        const maxIterations = 1000; // Safety limit

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // Find node with lowest fScore
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(`${openSet[i].tileX},${openSet[i].tileY}`) < fScore.get(`${current.tileX},${current.tileY}`)) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            if (current.tileX === endTile.tileX && current.tileY === endTile.tileY) {
                return this.#reconstructPath(cameFrom, current);
            }

            openSet.splice(currentIndex, 1);
            const currentKey = `${current.tileX},${current.tileY}`;
            closedSet.add(currentKey);

            for (const neighbor of this.#getNeighbors(current, tank)) {
                const neighborKey = `${neighbor.tileX},${neighbor.tileY}`;
                
                if (closedSet.has(neighborKey)) {
                    continue; // Skip already evaluated neighbors
                }

                const tentativeGScore = gScore.get(currentKey) + 1;
                
                const existingGScore = gScore.get(neighborKey);
                if (existingGScore === undefined || tentativeGScore < existingGScore) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.#heuristic(neighbor, endTile));
                    
                    if (!openSet.some(node => node.tileX === neighbor.tileX && node.tileY === neighbor.tileY)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        if (iterations >= maxIterations) {
            console.warn('Pathfinding exceeded maximum iterations');
        }

        return null; // No path found
    }

    static #heuristic(a, b) {
        return Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY);
    }

    static #getNeighbors(tile, tank) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        for (const dir of directions) {
            const neighborTileX = tile.tileX + dir.x;
            const neighborTileY = tile.tileY + dir.y;

            if (neighborTileX >= 0 && neighborTileX < GAME_CONFIG.TILES_X &&
                neighborTileY >= 0 && neighborTileY < GAME_CONFIG.TILES_Y &&
                this.#isWalkable(neighborTileX, neighborTileY, tank)) {
                neighbors.push({ tileX: neighborTileX, tileY: neighborTileY });
            }
        }
        return neighbors;
    }

    static #reconstructPath(cameFrom, current) {
        const totalPath = [current];
        let currentKey = `${current.tileX},${current.tileY}`;
        let iterations = 0;
        const maxIterations = 1000; // Safety limit to prevent infinite loops
        
        while (cameFrom.has(currentKey) && iterations < maxIterations) {
            current = cameFrom.get(currentKey);
            totalPath.unshift(current);
            const newKey = `${current.tileX},${current.tileY}`;
            
            // Check for circular reference
            if (newKey === currentKey) {
                console.warn('Circular reference detected in pathfinding');
                break;
            }
            
            currentKey = newKey;
            iterations++;
        }
        
        if (iterations >= maxIterations) {
            console.warn('Pathfinding reconstruction exceeded maximum iterations');
        }
        
        return totalPath.map(tile => GameHelpers.tileToWorld(tile.tileX, tile.tileY));
    }
}
