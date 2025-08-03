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
                    'tank_light_1', 'tank_light_2', 'tank_medium_1', 'tank_medium_2',
                    'tank_heavy_1', 'tank_light_1', 'tank_medium_1', 'tank_light_2'
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
    }
};
