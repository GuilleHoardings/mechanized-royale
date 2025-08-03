// Game constants
const GAME_CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    BACKGROUND_COLOR: '#2c5234',
    WORLD_WIDTH: 1200,
    WORLD_HEIGHT: 900
};

const TANK_TYPES = {
    LIGHT: 'light',
    MEDIUM: 'medium',
    HEAVY: 'heavy'
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
        PLAYER: { x: 50, y: 400, width: 200, height: 150 },
        ENEMY: { x: 950, y: 50, width: 200, height: 150 }
    }
};
