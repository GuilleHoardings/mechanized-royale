// Game constants
const GAME_CONFIG = {
    WIDTH: 600,
    HEIGHT: 800,  // Reduced from 850 to fit better in 1080p displays
    BACKGROUND_COLOR: '#2c5234',
    // Tile system - calculate tile size to fit everything in viewport
    TILES_X: 18,
    TILES_Y: 34,  // 0-15 (Enemy), 16-17 (river), 18-33 (Player)
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
    FAST_ATTACK: 'fast_attack',
    AIR: 'air',
    ANTI_AIR: 'anti_air'
};

// Air units ignore river pathing and render above the ground battle
const AIR_CONFIG = {
    RENDER_DEPTH: 1000
};

// Card categories for the deck/hand system
const CARD_TYPES = {
    TROOP: 'troop',
    SPELL: 'spell',
    BUILDING: 'building'
};

// Deck rules
const DECK_CONFIG = {
    SIZE: 8,          // Cards in a battle deck (and the rotation pool)
    HAND_SIZE: 4,     // Cards visible at once during a battle
    MAX_COPIES: 1     // One of each card per deck
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
    STARTING_ENERGY: 0,
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
    // Game Over Screen Colors - after-action report on field card stock
    GAME_OVER: {
        OVERLAY_COLOR: 0x16140d,
        CARD_BACKGROUND: 0x1e1c12,
        CARD_BORDER: 0xb5a578,

        // Result specific colors
        VICTORY: {
            PRIMARY: '#afc186',
            ACCENT: '#a6b47b',
            BACKGROUND: '#3a4022',
            GLOW: 0x9cae73
        },
        DEFEAT: {
            PRIMARY: '#d47962',
            ACCENT: '#c25a44',
            BACKGROUND: '#5c241a',
            GLOW: 0xc25a44
        },
        DRAW: {
            PRIMARY: '#dcb35f',
            ACCENT: '#c9a24b',
            BACKGROUND: '#4c3d1f',
            GLOW: 0xd1a04a
        },

        // Text colors
        TEXT: {
            PRIMARY: '#f2ead3',
            SECONDARY: '#d8cdac',
            MUTED: '#b0a47f',
            OVERTIME: '#dcb35f',
            HIGHLIGHT: '#d3ad58'
        }
    },

    // General UI Colors
    TEXT: {
        WHITE: '#f7f0dc',
        ERROR: '#d47962',
        SUCCESS: '#afc186',
        WARNING: '#dcb35f'
    },

    // Menu Colors
    MENU: {
        BACKGROUND: 0x1e1c12,
        TITLE_GRADIENT_START: '#f2ead3',
        TITLE_GRADIENT_END: '#d3ad58',
        BUTTON_PRIMARY: 0xc9a24b,
        BUTTON_HOVER: 0xd1a04a,
        BUTTON_DISABLED: 0x6f6748,
        ACCENT: 0xc9a24b
    },

    // Energy Bar Colors - olive supply cells
    ENERGY: {
        FULL: 0x9cae73,
        CHARGING: 0x5b6540,
        GLOW: 0xa6b47b,
        BACKGROUND: 0x1e1c12
    },

    // Card Colors
    CARDS: {
        BACKGROUND: 0x2d2a1c,
        BORDER: 0x6f6748,
        SELECTED: 0xd1a04a,
        HOVER: 0xa6b47b,
        AFFORDABLE: 0x9cae73,
        UNAFFORDABLE: 0xc25a44
    }
};

const UI_CONFIG = {
    HEALTH_BARS: {
        TANK: {
            WIDTH: 40,
            HEIGHT: 4,
            OFFSET_X: 20,
            OFFSET_Y: 30,
            BACKGROUND_COLOR: 0x16140d,
            COLORS: {
                HIGH: 0x9cae73,    // > 50% health
                MEDIUM: 0xd1a04a,  // 25-50% health
                LOW: 0xc25a44      // < 25% health
            }
        },
        TOWER: {
            WIDTH: 50,
            HEIGHT: 10,
            OFFSET_X: 25,
            OFFSET_Y: 45,
            BACKGROUND_COLOR: 0x16140d,
            COLORS: {
                HIGH: 0x9cae73,
                MEDIUM_HIGH: 0xd1a04a,  // 50-75% health
                MEDIUM: 0xd1a04a,       // 25-50% health
                LOW: 0xc25a44           // < 25% health
            }
        },
        BUILDING: {
            WIDTH: 40,
            HEIGHT: 6,
            OFFSET_X: 20,
            OFFSET_Y: 35,
            BACKGROUND_COLOR: 0x16140d,
            COLORS: {
                HIGH: 0x9cae73,
                MEDIUM: 0xd1a04a,
                LOW: 0xc25a44
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
        BORDER_RADIUS: 3,
        COST_TEXT: {
            FONT_SIZE: '16px',
            COLOR: '#dcb35f',
            STROKE_COLOR: '#16140d',
            STROKE_THICKNESS: 3
        },
        NAME_TEXT: {
            FONT_SIZE: '11px',
            COLOR: '#f2ead3'
        },
        GLOW_COLOR: 0xd1a04a,
        GLOW_ALPHA: 0.2
    },
    ENERGY_BAR: {
        WIDTH: 200,
        HEIGHT: 20,
        BOTTOM_MARGIN: 20,
        TEXT_OFFSET_Y: 10,
        BACKGROUND_COLOR: 0x1e1c12,
        FILL_COLOR: 0x5b6540,
        GLOW_COLOR: 0xa6b47b,
        BORDER_COLOR: 0xb5a578,
        BORDER_RADIUS: 2
    },
    DEBUG: {
        ATTACK_RANGE_CIRCLES: {
            ENABLED: false,
            PLAYER_COLOR: 0x9cae73,      // Olive for player tanks
            ENEMY_COLOR: 0xc25a44,       // Rust for enemy tanks
            LINE_WIDTH: 2,
            ALPHA: 0.35
        }
    },
    GAME_OVER: {
        CLICK_DELAY: 1500,  // Delay in milliseconds before allowing clicks to dismiss
        CARD_WIDTH: 560,
        CARD_HEIGHT: 500
    }
};
