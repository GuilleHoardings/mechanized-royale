// Main game initialization
class TankTacticsGame {
    constructor() {
        // Adjust height for tall mobile screens
        const screenAspectRatio = window.innerHeight / window.innerWidth;
        if (screenAspectRatio > 1.4) { // Taller than 4:3 (approx 1.33)
            // Calculate height that would match screen aspect ratio, capped at a reasonable max
            // This allows the game to fill more of the screen on tall phones
            const dynamicHeight = Math.min(1600, Math.floor(GAME_CONFIG.WIDTH * screenAspectRatio));
            GAME_CONFIG.HEIGHT = Math.max(GAME_CONFIG.HEIGHT, dynamicHeight);
        }

        this.config = {
            type: Phaser.AUTO,
            width: GAME_CONFIG.WIDTH,
            height: GAME_CONFIG.HEIGHT,
            parent: 'game-container',
            backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
            scene: [BootScene, MenuScene, BattleScene],
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        this.game = new Phaser.Game(this.config);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new TankTacticsGame();
});
