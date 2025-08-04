// Game constants
const GAME_CONFIG = {
    WIDTH: 600,
    HEIGHT: 850,
    BACKGROUND_COLOR: '#2c5234',
    WORLD_WIDTH: 600,  // No scrolling - world matches viewport
    WORLD_HEIGHT: 850, // No scrolling - world matches viewport
    // Tile system (Clash Royale style)
    TILES_X: 18,
    TILES_Y: 32,
    TILE_SIZE: 600 / 18  // 33.33px per tile
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
    // Battlefield uses approximately 20 tiles (680px) with UI taking bottom space
    DEPLOYMENT_ZONES: {
        PLAYER: { 
            tileX: 0, 
            tileY: 11, 
            tilesWidth: 18, 
            tilesHeight: 9    // Bottom half minus 1 row buffer (rows 11-19)
        },
        ENEMY: { 
            tileX: 0, 
            tileY: 0, 
            tilesWidth: 18, 
            tilesHeight: 9    // Top half minus 1 row buffer (rows 0-8)
        }
    },
    // Tower system (Clash Royale style)
    TOWERS: {
        SIDE_TOWER_HEALTH: 600,    // Side towers have less health
        MAIN_TOWER_HEALTH: 1200,   // Main tower has more health
        POSITIONS: {
            PLAYER: {
                LEFT: { tileX: 3, tileY: 17 },   // Left side tower (moved forward)
                RIGHT: { tileX: 15, tileY: 17 }, // Right side tower (moved forward)
                MAIN: { tileX: 9, tileY: 19 }    // Main tower (center, back)
            },
            ENEMY: {
                LEFT: { tileX: 3, tileY: 5 },    // Left side tower (moved down for visibility)
                RIGHT: { tileX: 15, tileY: 5 },  // Right side tower (moved down for visibility)
                MAIN: { tileX: 9, tileY: 3 }     // Main tower (moved down for visibility)
            }
        }
    }
};
