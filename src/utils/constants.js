// Game constants
const GAME_CONFIG = {
    WIDTH: 600,
    HEIGHT: 800,  // Reduced from 850 to fit better in 1080p displays
    BACKGROUND_COLOR: '#2c5234',
    // Tile system (Clash Royale style) - calculate tile size to fit everything in viewport
    TILES_X: 18,
    TILES_Y: 44,  // Updated to match new layout: 0-21 (P1), 21-22 (river), 23-43 (P2)
    TILE_SIZE: Math.floor(710 / 44),  // ~16px per tile to leave room for UI (cards + energy bar)
    get WORLD_WIDTH() { return this.TILES_X * this.TILE_SIZE; },  // Calculate width based on tile size
    get WORLD_HEIGHT() { return this.TILES_Y * this.TILE_SIZE; }  // Calculate height based on tile size
};

const TANK_TYPES = {
    LIGHT: 'light',
    MEDIUM: 'medium',
    HEAVY: 'heavy',
    TANK_DESTROYER: 'tank_destroyer',
    ARTILLERY: 'artillery',
    FAST_ATTACK: 'fast_attack'
};

const GAME_STATES = {
    MENU: 'menu',
    BATTLE: 'battle',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

const ENERGY_CONFIG = {
    MAX_ENERGY: 10,
    REGEN_RATE: 1, // per second
    STARTING_ENERGY: 5
};

const BATTLE_CONFIG = {
    DURATION: 180, // 3 minutes in seconds
    // Tile-based deployment zones (in tile coordinates)
    DEPLOYMENT_ZONES: {
        PLAYER: { 
            tileX: 0, 
            tileY: 23, 
            tilesWidth: 18, 
            tilesHeight: 15    // Player 2 side: rows 23-37 (leaving space for towers at 38-43)
        },
        ENEMY: { 
            tileX: 0, 
            tileY: 6, 
            tilesWidth: 18, 
            tilesHeight: 15    // Player 1 side: rows 6-20 (leaving space for towers at 0-5)
        }
    },
    // Tower system (Clash Royale style)
    TOWERS: {
        SIDE_TOWER_HEALTH: 600,    // Side towers have less health
        MAIN_TOWER_HEALTH: 1200,   // Main tower has more health
        POSITIONS: {
            PLAYER: {
                LEFT: { tileX: 4, tileY: 38 },   // Arena tower at (5, 4) from player perspective
                RIGHT: { tileX: 13, tileY: 38 }, // Arena tower at (5, 13) from player perspective
                MAIN: { tileX: 8, tileY: 41 }    // King tower around (2, 8) from player perspective
            },
            ENEMY: {
                LEFT: { tileX: 4, tileY: 5 },    // Arena tower at (38, 4) from enemy perspective
                RIGHT: { tileX: 13, tileY: 5 },  // Arena tower at (38, 13) from enemy perspective
                MAIN: { tileX: 8, tileY: 2 }     // King tower around (41, 8) from enemy perspective
            }
        }
    }
};
