// Game constants
const GAME_CONFIG = {
    WIDTH: 600,
    HEIGHT: 800,
    BACKGROUND_COLOR: '#2c5234',
    WORLD_WIDTH: 600,  // No scrolling - world matches viewport
    WORLD_HEIGHT: 800  // No scrolling - world matches viewport
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
    DEPLOYMENT_ZONES: {
        PLAYER: { x: 0, y: 500, width: 600, height: 200 },    // Bottom area for player
        ENEMY: { x: 0, y: 50, width: 600, height: 200 }       // Top area for enemy spawning
    }
};
