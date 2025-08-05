class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Initialize debug panel for menu
        this.initializeDebugPanel();
        
        // Make this scene accessible to HTML buttons
        window.currentScene = this;
        
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

    // Debug Panel Methods for Menu Scene
    initializeDebugPanel() {
        this.debugUpdateTimer = 0;
        this.debugUpdateInterval = 500; // Update every 500ms for menu (less frequent)
        
        // Start debug updates
        this.time.addEvent({
            delay: this.debugUpdateInterval,
            callback: this.updateDebugPanel,
            callbackScope: this,
            loop: true
        });
    }

    updateDebugPanel() {
        // Check if debug panel exists and is visible
        if (!window.debugPanel) return;

        try {
            // Game State
            window.debugPanel.updateValue('debug-scene', this.scene.key);
            window.debugPanel.updateValue('debug-time', '-');
            window.debugPanel.updateValue('debug-paused', 'Menu');

            // Player Stats (from game state)
            if (this.gameState && this.gameState.player) {
                window.debugPanel.updateValue('debug-player-energy', '-');
                window.debugPanel.updateValue('debug-player-tanks', this.gameState.player.tanks.length);
                window.debugPanel.updateValue('debug-player-hand', '-');
            }

            // AI Stats
            window.debugPanel.updateValue('debug-ai-energy', '-');
            window.debugPanel.updateValue('debug-ai-tanks', '-');
            window.debugPanel.updateValue('debug-ai-strategy', '-');
            window.debugPanel.updateValue('debug-ai-rush', '-');

            // Battle Stats
            window.debugPanel.updateValue('debug-total-tanks', '-');
            window.debugPanel.updateValue('debug-projectiles', '-');
            window.debugPanel.updateValue('debug-buildings', '-');

            // Performance
            window.debugPanel.updateValue('debug-fps', this.game.loop.actualFps.toFixed(1));
            const objectCount = this.children.list.length;
            window.debugPanel.updateValue('debug-objects', objectCount);
            
            // Memory usage (if available)
            if (performance.memory) {
                const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
                window.debugPanel.updateValue('debug-memory', `${memoryMB} MB`);
            } else {
                window.debugPanel.updateValue('debug-memory', 'N/A');
            }

            // Tower Status
            window.debugPanel.updateValue('debug-player-towers', '-');
            window.debugPanel.updateValue('debug-ai-towers', '-');

            // Deployment Zones
            window.debugPanel.updateValue('debug-player-expanded', '-');
            window.debugPanel.updateValue('debug-ai-expanded', '-');

        } catch (error) {
            console.warn('Debug panel update error in menu:', error);
        }
    }
    
    // Dummy method for row numbers toggle (not applicable in menu)
    toggleRowNumbers() {
        console.log('Row numbers toggle not available in menu scene');
    }
}
