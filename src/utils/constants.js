// Game constants
const GAME_CONFIG = {
    WIDTH: 600,
    HEIGHT: 800,  // Reduced from 850 to fit better in 1080p displays
    BACKGROUND_COLOR: '#2c5234',
    // Tile system (Clash Royale style) - calculate tile size to fit everything in viewport
    TILES_X: 18,
    TILES_Y: 34,  // Updated to match new layout: 0-15 (Enemy), 16-17 (river), 18-33 (Player)
    TILE_SIZE: Math.floor(710 / 34),  // ~21px per tile to leave room for UI (cards + energy bar)
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

// Card categories for the deck/hand system
const CARD_TYPES = {
    TROOP: 'troop',
    SPELL: 'spell',
    BUILDING: 'building'
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
            tileY: 18, 
            tilesWidth: 18, 
            tilesHeight: 16    // Player side: rows 18-33 (full width, but towers will be excluded in logic)
        },
        ENEMY: { 
            tileX: 0, 
            tileY: 0, 
            tilesWidth: 18, 
            tilesHeight: 16    // Enemy side: rows 0-15 (full width, but towers will be excluded in logic)
        }
    },
    // Tower system (Clash Royale style)
    TOWERS: {
        SIDE_TOWER_HEALTH: 600,    // Side towers have less health
        MAIN_TOWER_HEALTH: 1200,   // Main tower has more health
        DIMENSIONS: {
            MAIN_TOWER: {
                TILES_WIDTH: 4,
                TILES_HEIGHT: 5
            },
            SIDE_TOWER: {
                TILES_WIDTH: 3,
                TILES_HEIGHT: 3
            }
        },
        POSITIONS: {
            PLAYER: {
                LEFT: { tileX: 3, tileY: 27 },
                RIGHT: { tileX: 14, tileY: 27 },
                MAIN: { tileX: 8, tileY: 30 }
            },
            ENEMY: {
                LEFT: { tileX: 3, tileY: 6 },
                RIGHT: { tileX: 14, tileY: 6 },
                MAIN: { tileX: 8, tileY: 3 }
            }
        }
    }
};

const UI_COLORS = {
    // Game Over Screen Colors
    GAME_OVER: {
        OVERLAY_COLOR: 0x0a0f1a,
        CARD_BACKGROUND: 0x1a2744,
        CARD_BORDER: 0x3d5a80,
        
        // Result specific colors
        VICTORY: {
            PRIMARY: '#4ade80',
            ACCENT: '#22c55e',
            BACKGROUND: '#065f46',
            GLOW: 0x22c55e
        },
        DEFEAT: {
            PRIMARY: '#f87171', 
            ACCENT: '#ef4444',
            BACKGROUND: '#991b1b',
            GLOW: 0xef4444
        },
        DRAW: {
            PRIMARY: '#fbbf24',
            ACCENT: '#f59e0b', 
            BACKGROUND: '#92400e',
            GLOW: 0xf59e0b
        },
        
        // Text colors
        TEXT: {
            PRIMARY: '#f1f5f9',
            SECONDARY: '#e2e8f0',
            MUTED: '#94a3b8',
            OVERTIME: '#fb923c',
            HIGHLIGHT: '#60a5fa'
        }
    },
    
    // General UI Colors  
    TEXT: {
        WHITE: '#ffffff',
        ERROR: '#f87171',
        SUCCESS: '#4ade80',
        WARNING: '#fbbf24'
    },
    
    // Menu Colors
    MENU: {
        BACKGROUND: 0x1a2744,
        TITLE_GRADIENT_START: '#60a5fa',
        TITLE_GRADIENT_END: '#a78bfa',
        BUTTON_PRIMARY: 0x3b82f6,
        BUTTON_HOVER: 0x60a5fa,
        BUTTON_DISABLED: 0x475569,
        ACCENT: 0xf59e0b
    },
    
    // Energy Bar Colors
    ENERGY: {
        FULL: 0x60a5fa,
        CHARGING: 0x3b82f6,
        GLOW: 0x93c5fd,
        BACKGROUND: 0x1e3a5f
    },
    
    // Card Colors
    CARDS: {
        BACKGROUND: 0x1e3a5f,
        BORDER: 0x3d5a80,
        SELECTED: 0xfbbf24,
        HOVER: 0x60a5fa,
        AFFORDABLE: 0x4ade80,
        UNAFFORDABLE: 0xf87171
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
            OFFSET_Y: 45,
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
        WIDTH: 100,
        HEIGHT: 80,
        SPACING: 110,
        MARGIN_BELOW_BATTLEFIELD: 10,
        SELECTION_BORDER_WIDTH: 3,
        SELECTION_BORDER_COLOR: UI_COLORS.CARDS.SELECTED,
        BORDER_RADIUS: 8,
        COST_TEXT: {
            FONT_SIZE: '16px',
            COLOR: '#fbbf24',
            STROKE_COLOR: '#1a1a2e',
            STROKE_THICKNESS: 3
        },
        NAME_TEXT: {
            FONT_SIZE: '11px',
            COLOR: '#e2e8f0'
        },
        GLOW_COLOR: 0x60a5fa,
        GLOW_ALPHA: 0.3
    },
    ENERGY_BAR: {
        WIDTH: 200,
        HEIGHT: 20,
        BOTTOM_MARGIN: 20,
        TEXT_OFFSET_Y: 10,
        BACKGROUND_COLOR: 0x1e3a5f,
        FILL_COLOR: 0x60a5fa,
        GLOW_COLOR: 0x93c5fd,
        BORDER_COLOR: 0x3d5a80,
        BORDER_RADIUS: 4
    },
    DEBUG: {
        ATTACK_RANGE_CIRCLES: {
            ENABLED: false,
            PLAYER_COLOR: 0x00ff00,      // Green for player tanks
            ENEMY_COLOR: 0xff0000,       // Red for enemy tanks
            LINE_WIDTH: 2,
            ALPHA: 0.4
        }
    },
    GAME_OVER: {
        CLICK_DELAY: 1500  // Delay in milliseconds before allowing clicks to dismiss
    }
};
