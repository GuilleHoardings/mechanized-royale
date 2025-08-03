class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Background
        this.cameras.main.setBackgroundColor('#2c5234');

        // Title
        this.add.text(GAME_CONFIG.WIDTH / 2, 100, 'TANK TACTICS', {
            fontSize: '48px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(GAME_CONFIG.WIDTH / 2, 150, 'Clash Royale meets World of Tanks', {
            fontSize: '20px',
            fill: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Menu buttons
        this.createMenuButtons();

        // Load or create game state
        this.gameState = GameHelpers.loadGameState() || GameHelpers.getDefaultGameState();
        
        // Show player info
        this.showPlayerInfo();
    }

    createMenuButtons() {
        const buttonY = 300;
        const buttonSpacing = 80;

        // Play button
        const playButton = this.add.image(GAME_CONFIG.WIDTH / 2, buttonY, 'button')
            .setInteractive()
            .setScale(1.2);

        this.add.text(GAME_CONFIG.WIDTH / 2, buttonY, 'PLAY', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        playButton.on('pointerdown', () => {
            this.scene.start('BattleScene', { gameState: this.gameState });
        });

        playButton.on('pointerover', () => {
            playButton.setTint(0xdddddd);
        });

        playButton.on('pointerout', () => {
            playButton.clearTint();
        });

        // Research button (placeholder for future)
        const researchButton = this.add.image(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing, 'button')
            .setInteractive()
            .setAlpha(0.6);

        this.add.text(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing, 'RESEARCH', {
            fontSize: '24px',
            fill: '#888888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Settings button (placeholder for future)
        const settingsButton = this.add.image(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing * 2, 'button')
            .setInteractive()
            .setAlpha(0.6);

        this.add.text(GAME_CONFIG.WIDTH / 2, buttonY + buttonSpacing * 2, 'SETTINGS', {
            fontSize: '24px',
            fill: '#888888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }

    showPlayerInfo() {
        // Player level and XP
        const player = this.gameState.player;
        
        this.add.text(20, 20, `Level: ${player.progress.level}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });

        this.add.text(20, 45, `Credits: ${player.resources.credits}`, {
            fontSize: '18px',
            fill: '#ffff00',
            fontFamily: 'Arial'
        });

        this.add.text(20, 70, `Tanks Unlocked: ${player.tanks.length}`, {
            fontSize: '18px',
            fill: '#00ff00',
            fontFamily: 'Arial'
        });
    }
}
