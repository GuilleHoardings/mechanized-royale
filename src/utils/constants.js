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
    REGEN_RATE: 1, // amount gained per regeneration tick
    STARTING_ENERGY: 5,
    NORMAL_TIME_DELAY: 2800, // 2.8 seconds for first 2 minutes
    DOUBLE_TIME_DELAY: 1400, // 1.4 seconds for last minute (double time)
    DOUBLE_TIME_THRESHOLD: 60 // Switch to double time when 60 seconds or less remain
};

const BATTLE_CONFIG = {
    DURATION: 180, // 3 minutes in seconds
    // Tile-based deployment zones (in tile coordinates) - cover full width but avoid towers
    DEPLOYMENT_ZONES: {
        PLAYER: { 
            tileX: 0, 
            tileY: 23, 
            tilesWidth: 18, 
            tilesHeight: 21    // Player side: rows 23-43 (full width, but towers will be excluded in logic)
        },
        ENEMY: { 
            tileX: 0, 
            tileY: 0, 
            tilesWidth: 18, 
            tilesHeight: 21    // Enemy side: rows 0-20 (full width, but towers will be excluded in logic)
        }
    },
    // Tower system (Clash Royale style)
    TOWERS: {
        SIDE_TOWER_HEALTH: 600,    // Side towers have less health
        MAIN_TOWER_HEALTH: 1200,   // Main tower has more health
        POSITIONS: {
            PLAYER: {
                LEFT: { tileX: 3, tileY: 38 },
                RIGHT: { tileX: 14, tileY: 38 },
                MAIN: { tileX: 8, tileY: 41 }
            },
            ENEMY: {
                LEFT: { tileX: 3, tileY: 5 },
                RIGHT: { tileX: 14, tileY: 5 },
                MAIN: { tileX: 8, tileY: 2 }
            }
        }
    }
};

const UI_CONFIG = {
    HEALTH_BARS: {
        TANK: {
            WIDTH: 40,
            HEIGHT: 4,
            OFFSET_X: 20,
            OFFSET_Y: 30,
            BACKGROUND_COLOR: 0x333333,
            COLORS: {
                HIGH: 0x00ff00,    // > 50% health
                MEDIUM: 0xffff00,  // 25-50% health  
                LOW: 0xff0000      // < 25% health
            }
        },
        TOWER: {
            WIDTH: 50,
            HEIGHT: 10,
            OFFSET_X: 25,
            OFFSET_Y: 60,
            BACKGROUND_COLOR: 0x333333,
            COLORS: {
                HIGH: 0x00ff00,
                MEDIUM_HIGH: 0xffa500,  // 50-75% health
                MEDIUM: 0xffff00,       // 25-50% health
                LOW: 0xff0000           // < 25% health
            }
        }
    },
    CARDS: {
        WIDTH: 80,
        HEIGHT: 60,
        SPACING: 90,
        MARGIN_BELOW_BATTLEFIELD: 10,
        SELECTION_BORDER_WIDTH: 3,
        SELECTION_BORDER_COLOR: 0xffff00,
        COST_TEXT: {
            FONT_SIZE: '12px',
            COLOR: '#ffff00',
            STROKE_COLOR: '#000000',
            STROKE_THICKNESS: 1
        },
        NAME_TEXT: {
            FONT_SIZE: '9px',
            COLOR: '#ffffff'
        }
    },
    ENERGY_BAR: {
        WIDTH: 200,
        HEIGHT: 16,
        BOTTOM_MARGIN: 20,
        TEXT_OFFSET_Y: 8,
        BACKGROUND_COLOR: 0x333333,
        FILL_COLOR: 0x4a90e2
    }
};