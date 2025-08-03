// Main game initialization
class TankTacticsGame {
    constructor() {
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
