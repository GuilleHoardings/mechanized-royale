/**
 * GraphicsManager - Handles all procedural graphics creation for Tank Tactics
 * Extracted from BattleScene to improve code organization
 */

class GraphicsManager {
    constructor(scene) {
        this.scene = scene;
        
        // Enhanced team colors with better contrast
        this.colors = {
            player: 0x3b82f6,      // Vibrant Blue
            enemy: 0xef4444,       // Vibrant Red
            playerAccent: 0x60a5fa,
            enemyAccent: 0xf87171,
            playerDark: 0x1d4ed8,
            enemyDark: 0xdc2626,
            metal: 0x9ca3af,       // Lighter metal
            gunmetal: 0x4b5563     // Softer gunmetal
        };
        
        // Type accent colors for different tank types - more vibrant
        this.typeAccentColors = {
            [TANK_TYPES.LIGHT]: { player: 0x4ade80, enemy: 0x22c55e },         // Brighter Green
            [TANK_TYPES.MEDIUM]: { player: 0xfbbf24, enemy: 0xf59e0b },        // Brighter Orange
            [TANK_TYPES.HEAVY]: { player: 0xf472b6, enemy: 0xec4899 },         // Pink for heavy
            [TANK_TYPES.TANK_DESTROYER]: { player: 0xa78bfa, enemy: 0x8b5cf6 }, // Purple
            [TANK_TYPES.ARTILLERY]: { player: 0xfde047, enemy: 0xeab308 },     // Brighter Yellow
            [TANK_TYPES.FAST_ATTACK]: { player: 0x22d3ee, enemy: 0x06b6d4 }    // Brighter Cyan
        };
    }

    /**
     * Gets the type accent color for a tank type
     * @param {string} tankType - The tank type
     * @param {boolean} isPlayerTank - Whether this is a player tank
     * @returns {number} The accent color
     */
    getTypeAccentColor(tankType, isPlayerTank) {
        const typeColors = this.typeAccentColors[tankType];
        if (typeColors) {
            return isPlayerTank ? typeColors.player : typeColors.enemy;
        }
        return isPlayerTank ? this.colors.playerAccent : this.colors.enemyAccent;
    }

    /**
     * Creates a full-size tank graphic for the battlefield
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} tankType - The type of tank (from TANK_TYPES)
     * @param {boolean} isPlayerTank - Whether this is a player tank
     * @param {string|null} tankId - Optional tank ID for special tanks
     * @returns {Phaser.GameObjects.Container} The tank container
     */
    createTankGraphics(x, y, tankType, isPlayerTank, tankId = null) {
        const baseColor = isPlayerTank ? this.colors.player : this.colors.enemy;
        const accentColor = isPlayerTank ? this.colors.playerAccent : this.colors.enemyAccent;
        const darkColor = isPlayerTank ? this.colors.playerDark : this.colors.enemyDark;
        const typeAccentColor = this.getTypeAccentColor(tankType, isPlayerTank);
        const isPanther = tankId === 'tank_panther';
        const isInfantry = tankId === 'tank_infantry';
        
        // Create a container for the tank
        const tank = this.scene.add.container(x, y);
        
        // Create graphics object for drawing
        const graphics = this.scene.add.graphics();
        
        // Special case for infantry
        if (isInfantry) {
            this._drawInfantry(graphics, baseColor, accentColor);
        } else {
            // Draw the tank based on type
            switch (tankType) {
            case TANK_TYPES.LIGHT:
                this._drawLightTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.MEDIUM:
                if (isPanther) {
                    this._drawPantherTank(graphics, baseColor, darkColor, typeAccentColor);
                } else {
                    this._drawMediumTank(graphics, baseColor, darkColor, typeAccentColor);
                }
                break;
            case TANK_TYPES.HEAVY:
                this._drawHeavyTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.TANK_DESTROYER:
                this._drawTankDestroyer(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.ARTILLERY:
                this._drawArtillery(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.FAST_ATTACK:
                this._drawFastAttack(graphics, baseColor, darkColor, typeAccentColor);
                break;
            }
        }
        
        // Add tracks (except for infantry which has none)
        if (!isInfantry) {
            this._drawTracks(graphics, tankType);
        }
        
        // Add the graphics to the container
        tank.add(graphics);
        
        return tank;
    }

    /**
     * Creates a mini card graphic for cards (troops, spells, buildings)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} cardId - The card ID from CARDS
     * @returns {Phaser.GameObjects.Container} The mini card graphic container
     */
    createMiniCardGraphics(x, y, cardId) {
        const cardDef = CARDS[cardId];
        if (!cardDef) {
            console.error(`Card ${cardId} not found in CARDS`);
            return this.scene.add.container(x, y);
        }

        const container = this.scene.add.container(x, y);
        const graphics = this.scene.add.graphics();

        switch (cardDef.type) {
            case CARD_TYPES.TROOP:
                this._drawMiniTroopGraphics(graphics, cardDef);
                break;
            case CARD_TYPES.SPELL:
                this._drawMiniSpellGraphics(graphics, cardDef);
                break;
            case CARD_TYPES.BUILDING:
                this._drawMiniBuildingGraphics(graphics, cardDef);
                break;
            default:
                console.warn(`Unknown card type: ${cardDef.type} for card ${cardId}`);
                break;
        }

        container.add(graphics);
        container.setScrollFactor(0);
        return container;
    }

    /**
     * Creates building graphics for the battlefield
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} buildingId - The building ID from CARDS
     * @returns {Phaser.GameObjects.Container} The building container
     */
    createBuildingGraphics(x, y, buildingId) {
        const buildingDef = CARDS[buildingId];
        if (!buildingDef || buildingDef.type !== CARD_TYPES.BUILDING) {
            console.error(`Invalid building: ${buildingId}`);
            return this.scene.add.container(x, y);
        }

        const container = this.scene.add.container(x, y);
        const graphics = this.scene.add.graphics();

        switch (buildingId) {
            case 'v1_launcher':
                this._drawV1LauncherBuilding(graphics);
                break;
            default:
                this._drawGenericBuilding(graphics);
                break;
        }

        container.add(graphics);
        return container;
    }

    /**
     * Draws mini graphics for troop cards
     * @param {Phaser.GameObjects.Graphics} graphics - The graphics object
     * @param {Object} cardDef - The card definition
     */
    _drawMiniTroopGraphics(graphics, cardDef) {
        const tankId = cardDef.payload.tankId;
        const tankData = TANK_DATA[tankId];
        if (!tankData) {
            console.error(`Tank data not found for ${tankId}`);
            return;
        }

        const tankType = tankData.type;
        const baseColor = this.colors.player; // Always player color for cards
        const darkColor = this.colors.playerDark;
        const typeAccentColor = this.getTypeAccentColor(tankType, true);
        const isPanther = tankId === 'tank_panther';
        const isInfantry = tankId === 'tank_infantry';

        // Special case for infantry
        if (isInfantry) {
            this._drawMiniInfantry(graphics, baseColor, typeAccentColor);
        } else {
            // Draw the mini tank based on type
            switch (tankType) {
            case TANK_TYPES.LIGHT:
                this._drawMiniLightTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.MEDIUM:
                if (isPanther) {
                    this._drawMiniPantherTank(graphics, baseColor, darkColor, typeAccentColor);
                } else {
                    this._drawMiniMediumTank(graphics, baseColor, darkColor, typeAccentColor);
                }
                break;
            case TANK_TYPES.HEAVY:
                this._drawMiniHeavyTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.TANK_DESTROYER:
                this._drawMiniTankDestroyer(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.ARTILLERY:
                this._drawMiniArtillery(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.FAST_ATTACK:
                this._drawMiniFastAttack(graphics, baseColor, darkColor, typeAccentColor);
                break;
            }
        }

        // Add mini tracks (except for infantry)
        if (!isInfantry) {
            this._drawMiniTracks(graphics, tankType);
        }
    }

    /**
     * Draws mini graphics for spell cards
     * @param {Phaser.GameObjects.Graphics} graphics - The graphics object
     * @param {Object} cardDef - The card definition
     */
    _drawMiniSpellGraphics(graphics, cardDef) {
        const spellColor = 0x8b5cf6; // Purple for spells
        const accentColor = 0xa855f7;

        switch (cardDef.id) {
            case 'smoke_barrage':
                this._drawMiniSmokeBarrage(graphics, spellColor, accentColor);
                break;
            case 'artillery_strike':
                this._drawMiniArtilleryStrike(graphics, spellColor, accentColor);
                break;
            default:
                // Generic spell icon
                this._drawMiniGenericSpell(graphics, spellColor, accentColor);
                break;
        }
    }

    /**
     * Draws mini graphics for building cards
     * @param {Phaser.GameObjects.Graphics} graphics - The graphics object
     * @param {Object} cardDef - The card definition
     */
    _drawMiniBuildingGraphics(graphics, cardDef) {
        const buildingColor = 0x6b7280; // Gray for buildings
        const accentColor = 0x9ca3af;

        switch (cardDef.id) {
            case 'v1_launcher':
                this._drawMiniV1Launcher(graphics, buildingColor, accentColor);
                break;
            default:
                // Generic building icon
                this._drawMiniGenericBuilding(graphics, buildingColor, accentColor);
                break;
        }
    }

    // ========================================
    // Full-size Tank Drawing Methods
    // ========================================

    _drawLightTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Light Tank - Small, fast-looking with more detail
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -8, 24, 16, 3);
        
        // Hull details - armor plating with distinctive green accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-10, -6, 20, 2);
        graphics.fillRect(-10, 4, 20, 2);
        graphics.fillRect(-11, -2, 22, 1);
        
        // Engine grille
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-12, -1, 3, 2);
        
        // Turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 6);
        
        // Turret ring detail
        graphics.fillStyle(this.colors.metal);
        graphics.strokeCircle(0, 0, 7, 1);
        
        // Barrel with muzzle brake
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(6, -1, 12, 2);
        graphics.fillRect(16, -2, 2, 4);
        
        // Vision ports
        graphics.fillStyle(0x000000);
        graphics.fillCircle(-8, -3, 1);
        graphics.fillCircle(8, -3, 1);
    }

    _drawMediumTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Medium Tank - Balanced design with enhanced details
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-15, -10, 30, 20, 4);
        
        // Hull armor plating with distinctive orange accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-13, -8, 26, 3);
        graphics.fillRect(-13, 5, 26, 3);
        graphics.fillRect(-14, -2, 28, 1);
        
        // Side skirts
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-16, -6, 2, 12);
        graphics.fillRect(14, -6, 2, 12);
        
        // Front armor detail
        graphics.fillStyle(darkColor);
        graphics.fillRect(13, -6, 2, 12);
        
        // Engine compartment
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-15, -3, 4, 6);
        
        // Turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 8);
        
        // Turret details
        graphics.fillStyle(this.colors.metal);
        graphics.strokeCircle(0, 0, 9, 1);
        graphics.fillRect(-6, -6, 12, 2);
        
        // Barrel with thermal sleeve (orange accent)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(8, -2, 15, 4);
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(12, -3, 8, 6);
        
        // Commander's cupola with orange accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillCircle(-4, -4, 2);
        
        // Vision blocks
        graphics.fillStyle(0x000000);
        graphics.fillRect(-10, -7, 2, 1);
        graphics.fillRect(-2, -7, 2, 1);
        graphics.fillRect(6, -7, 2, 1);
    }

    _drawPantherTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Panther Tank - Sloped armor design with superior firepower
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-15, -10, 30, 20, 4);
        
        // Sloped front armor with distinctive orange accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(-15, -10, -15, 10, -8, -2); // Left slope
        graphics.fillTriangle(15, -10, 15, 10, 8, -2); // Right slope
        graphics.fillRect(-8, -8, 16, 3); // Front plate
        graphics.fillRect(-13, 5, 26, 3); // Rear armor
        graphics.fillRect(-14, -2, 28, 1); // Center stripe
        
        // Side armor
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-16, -6, 2, 12);
        graphics.fillRect(14, -6, 2, 12);
        
        // Engine compartment
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-15, -3, 4, 6);
        
        // Sloped turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 8);
        // Add sloped turret detail
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(-5, -5, 5, -5, 0, -10);
        
        // Long barrel (high damage)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(8, -1, 18, 2);
        graphics.fillRect(24, -2, 3, 4); // Muzzle brake
        
        // Vision blocks
        graphics.fillStyle(0x000000);
        graphics.fillRect(-12, -8, 2, 1);
        graphics.fillRect(6, -8, 2, 1);
    }

    _drawMegaMinion(graphics, baseColor, typeAccentColor) {
        // Mega Minion uses helicopter silhouette
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -5, 24, 10, 5); // Fuselage
        graphics.fillRect(8, -2, 14, 4); // Tail boom
        
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-10, -1, 20, 2); // Body stripe
        graphics.fillRect(10, 0, 10, 1); // Tail accent
        
        // Canopy - use lighter tint
        const canopyColor = 0xaad4ff; // Light blue canopy
        graphics.fillStyle(canopyColor);
        graphics.fillRoundedRect(-7, -4, 12, 8, 4);
        
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-1, -12, 2, 24); // Rotor mast
        graphics.fillRect(-22, -1, 44, 2); // Rotor blades
        graphics.fillCircle(0, 0, 3); // Rotor hub
        
        graphics.fillRect(20, -4, 8, 2); // Tail rotor blade
        graphics.fillRect(20, 2, 8, 2); // Tail rotor opposite blade
        graphics.fillRect(24, -5, 2, 10); // Tail rotor mast
        
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-6, 1, 12, 1); // Accent underbelly
    }

    _drawHeavyTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Heavy Tank - Large, intimidating with complex armor
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-18, -12, 36, 24, 5);
        
        // Complex armor scheme with distinctive red accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-16, -10, 32, 4);
        graphics.fillRect(-16, 6, 32, 4);
        graphics.fillRect(-17, -3, 34, 2);
        
        // Spaced armor panels
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-18, -8, 3, 16);
        graphics.fillRect(15, -8, 3, 16);
        graphics.fillRect(-15, -11, 30, 2);
        
        // Side armor details
        graphics.fillStyle(darkColor);
        graphics.fillRect(-16, -4, 4, 8);
        graphics.fillRect(12, -4, 4, 8);
        
        // Front glacis plate
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(16, -8, 2, 16);
        
        // Engine deck
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-18, -5, 6, 10);
        
        // Turret - larger and more complex
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 10);
        
        // Turret armor blocks
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-8, -8, 16, 3);
        graphics.fillRect(-10, -2, 20, 4);
        graphics.strokeCircle(0, 0, 11, 2);
        
        // Heavy barrel (thicker) with muzzle brake
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(10, -3, 18, 6);
        graphics.fillRect(26, -4, 3, 8);
        
        // Commander's station with red accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillCircle(-5, -6, 3);
        graphics.fillRect(-7, -8, 4, 2);
        
        // Multiple vision blocks
        graphics.fillStyle(0x000000);
        graphics.fillRect(-12, -9, 2, 1);
        graphics.fillRect(-4, -9, 2, 1);
        graphics.fillRect(4, -9, 2, 1);
        graphics.fillRect(10, -9, 2, 1);
    }

    _drawTankDestroyer(graphics, baseColor, darkColor, typeAccentColor) {
        // Tank Destroyer - Low profile, long barrel, sloped armor
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-16, -8, 32, 16, 3);
        
        // Sloped front armor with distinctive purple accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(16, -8, 16, 8, 20, 0);
        
        // Side armor details with zimmerit paste texture
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-14, -6, 28, 2);
        graphics.fillRect(-14, 4, 28, 2);
        graphics.fillRect(-15, -1, 30, 1);
        
        // Low profile turret/fighting compartment
        graphics.fillStyle(darkColor);
        graphics.fillCircle(2, 0, 6);
        
        // Turret details
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-4, -4, 12, 8);
        
        // Very long barrel with distinctive TD profile
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(8, -1, 22, 2);
        graphics.fillRect(28, -2, 3, 4);
        
        // Gun mantlet with purple accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(6, -3, 4, 6);
        
        // Camouflage netting points
        graphics.fillStyle(0x333333);
        graphics.fillCircle(-10, -6, 1);
        graphics.fillCircle(0, -6, 1);
        graphics.fillCircle(10, -6, 1);
    }

    _drawArtillery(graphics, baseColor, darkColor, typeAccentColor) {
        // Artillery - Large, boxy, huge barrel, complex equipment
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-20, -10, 40, 20, 4);
        
        // Artillery hull details with distinctive yellow accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-18, -8, 36, 3);
        graphics.fillRect(-18, 5, 36, 3);
        graphics.fillRect(-19, -2, 38, 2);
        
        // Equipment boxes and stowage
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-20, -8, 6, 6);
        graphics.fillRect(-20, 2, 6, 6);
        graphics.fillRect(14, -6, 4, 4);
        graphics.fillRect(14, 2, 4, 4);
        
        // Large turret base
        graphics.fillStyle(darkColor);
        graphics.fillCircle(-2, 0, 9);
        
        // Turret ring and rotation mechanism
        graphics.fillStyle(this.colors.metal);
        graphics.strokeCircle(-2, 0, 10, 2);
        graphics.fillRect(-8, -6, 12, 3);
        
        // Massive barrel (thicker and longer)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(7, -4, 25, 8);
        
        // Recoil system with yellow accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(5, -6, 8, 12);
        graphics.fillRect(4, -2, 3, 4);
        
        // Stabilizer supports
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-22, -2, 4, 4);
        graphics.fillRect(18, -2, 4, 4);
        
        // Elevation mechanism
        graphics.fillStyle(darkColor);
        graphics.fillRect(6, -8, 4, 16);
        
        // Artillery computer/rangefinder with yellow accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-12, -8, 8, 4);
        graphics.fillCircle(-8, -6, 2);
    }

    _drawFastAttack(graphics, baseColor, darkColor, typeAccentColor) {
        // Fast Attack - Very small, angular, modern look
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-10, -6, 20, 12, 2);
        
        // Modern angular armor with distinctive cyan accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(10, -6, 10, 6, 14, 0);
        
        // Speed stripes for dynamic look with cyan accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-8, -4, 16, 1);
        graphics.fillRect(-8, 0, 16, 1);
        graphics.fillRect(-8, 3, 16, 1);
        
        // Small, offset turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(3, 0, 4);
        
        // Short barrel with flash suppressor
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(7, -1, 8, 2);
        graphics.fillRect(13, -2, 2, 4);
        
        // Modern optics
        graphics.fillStyle(0x000000);
        graphics.fillRect(1, -2, 2, 1);
        graphics.fillCircle(5, -3, 1);
        
        // Reactive armor blocks with cyan accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-8, -5, 3, 2);
        graphics.fillRect(-2, -5, 3, 2);
        graphics.fillRect(4, -5, 3, 2);
    }

    _drawInfantry(graphics, baseColor, accentColor) {
        // Infantry squad - simple stick figures
        graphics.lineStyle(2, baseColor);
        
        // First soldier
        graphics.moveTo(-8, -5);
        graphics.lineTo(-8, 5); // body
        graphics.moveTo(-8, -2);
        graphics.lineTo(-10, 0); // left arm
        graphics.moveTo(-8, -2);
        graphics.lineTo(-6, 0); // right arm
        graphics.moveTo(-8, 5);
        graphics.lineTo(-10, 7); // left leg
        graphics.moveTo(-8, 5);
        graphics.lineTo(-6, 7); // right leg
        graphics.fillStyle(baseColor);
        graphics.fillCircle(-8, -7, 2); // head
        
        // Second soldier
        graphics.lineStyle(2, accentColor);
        graphics.moveTo(-2, -5);
        graphics.lineTo(-2, 5);
        graphics.moveTo(-2, -2);
        graphics.lineTo(-4, 0);
        graphics.moveTo(-2, -2);
        graphics.lineTo(0, 0);
        graphics.moveTo(-2, 5);
        graphics.lineTo(-4, 7);
        graphics.moveTo(-2, 5);
        graphics.lineTo(0, 7);
        graphics.fillStyle(accentColor);
        graphics.fillCircle(-2, -7, 2);
        
        // Third soldier
        graphics.lineStyle(2, baseColor);
        graphics.moveTo(4, -5);
        graphics.lineTo(4, 5);
        graphics.moveTo(4, -2);
        graphics.lineTo(2, 0);
        graphics.moveTo(4, -2);
        graphics.lineTo(6, 0);
        graphics.moveTo(4, 5);
        graphics.lineTo(2, 7);
        graphics.moveTo(4, 5);
        graphics.lineTo(6, 7);
        graphics.fillStyle(baseColor);
        graphics.fillCircle(4, -7, 2);
    }

    _drawTracks(graphics, tankType) {
        // Add tracks/treads for ground vehicles - enhanced with more detail
        graphics.fillStyle(0x333333);
        let trackWidth;
        let trackHeight;
        
        if (tankType === TANK_TYPES.HEAVY) {
            trackWidth = 20;
            trackHeight = 3;
        } else if (tankType === TANK_TYPES.ARTILLERY) {
            trackWidth = 22;
            trackHeight = 3;
        } else if (tankType === TANK_TYPES.MEDIUM || tankType === TANK_TYPES.TANK_DESTROYER) {
            trackWidth = 16;
            trackHeight = 2;
        } else { // LIGHT and FAST_ATTACK
            trackWidth = 12;
            trackHeight = 2;
        }
        
        // Left track with road wheel details
        graphics.fillRect(-trackWidth / 2, -15, trackWidth, trackHeight);
        graphics.fillStyle(0x666666);
        const wheelCount = Math.floor(trackWidth / 4);
        for (let i = 0; i < wheelCount; i++) {
            graphics.fillCircle(-trackWidth / 2 + 2 + i * 4, -15 + trackHeight / 2, 1);
        }
        
        // Right track with road wheel details
        graphics.fillStyle(0x333333);
        graphics.fillRect(-trackWidth / 2, 13, trackWidth, trackHeight);
        graphics.fillStyle(0x666666);
        for (let i = 0; i < wheelCount; i++) {
            graphics.fillCircle(-trackWidth / 2 + 2 + i * 4, 13 + trackHeight / 2, 1);
        }
    }

    _drawHelicopterSkids(graphics, typeAccentColor) {
        // Landing skids for Mega Minion helicopter profile
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-14, 8, 28, 2); // Cross brace
        graphics.fillRect(-16, 10, 14, 2); // Left skid
        graphics.fillRect(2, 10, 14, 2); // Right skid
        graphics.fillRect(-10, 6, 2, 4); // Left strut
        graphics.fillRect(8, 6, 2, 4); // Right strut
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-6, 7, 12, 1); // Accent stripe on skids
    }

    // ========================================
    // Mini Tank Drawing Methods (for cards)
    // ========================================

    _drawMiniLightTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Light tank - Small, fast-looking with enhanced detail
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-10, -6, 20, 12, 2);
        
        // Hull armor plating with distinctive green accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-9, -5, 18, 1);
        graphics.fillRect(-9, 4, 18, 1);
        graphics.fillRect(-8, -1, 16, 1);
        
        // Small turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 4);
        
        // Fast-looking barrel
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(4, -1, 8, 2);
        graphics.fillRect(10, -1, 2, 2); // Muzzle brake
        
        // Vision blocks
        graphics.fillStyle(0x000000);
        graphics.fillRect(-6, -4, 1, 1);
        graphics.fillRect(2, -4, 1, 1);
    }

    _drawMiniMediumTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Medium tank - Balanced design with enhanced details
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -7, 24, 14, 3);
        
        // Hull armor plating with distinctive orange accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-10, -5, 20, 2);
        graphics.fillRect(-10, 3, 20, 2);
        graphics.fillRect(-11, -1, 22, 1);
        
        // Side skirts
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-12, -4, 2, 8);
        graphics.fillRect(10, -4, 2, 8);
        
        // Medium turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 5);
        
        // Medium barrel with thermal sleeve
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(5, -2, 10, 4);
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(7, -2, 6, 4); // Thermal sleeve with orange accent
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(13, -1, 3, 2); // Muzzle brake
        
        // Commander cupola
        graphics.fillStyle(typeAccentColor);
        graphics.fillCircle(-2, -3, 1);
    }

    _drawMiniPantherTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Panther tank - Sloped armor design with superior firepower
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -7, 24, 14, 3);
        
        // Sloped front armor with distinctive orange accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(-12, -7, -12, 7, -6, -1); // Left slope
        graphics.fillTriangle(12, -7, 12, 7, 6, -1); // Right slope
        graphics.fillRect(-6, -5, 12, 2); // Front plate
        graphics.fillRect(-10, 3, 20, 2); // Rear armor
        graphics.fillRect(-11, -1, 22, 1); // Center stripe
        
        // Side armor
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-12, -4, 2, 8);
        graphics.fillRect(10, -4, 2, 8);
        
        // Sloped turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 5);
        // Add sloped turret detail
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(-3, -3, 3, -3, 0, -6);
        
        // Long barrel (high damage)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(5, -1, 12, 2);
        graphics.fillRect(15, -1, 3, 2); // Muzzle brake
        
        // Vision blocks
        graphics.fillStyle(0x000000);
        graphics.fillRect(-8, -5, 1, 1);
        graphics.fillRect(4, -5, 1, 1);
    }

    _drawMiniMegaMinion(graphics, baseColor, typeAccentColor) {
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-9, -4, 18, 8, 4); // Fuselage
        graphics.fillRect(6, -1, 9, 2); // Tail boom

        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-7, -1, 14, 1); // Body stripe
        graphics.fillRect(8, 0, 6, 1); // Tail accent

        graphics.fillStyle(0xaad4ff);
        graphics.fillRoundedRect(-4, -3, 8, 6, 3); // Canopy

        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-1, -7, 2, 14); // Rotor mast
        graphics.fillRect(-13, -1, 26, 2); // Rotor blades
        graphics.fillCircle(0, 0, 2); // Rotor hub
        graphics.fillRect(12, -3, 5, 1); // Tail rotor top blade
        graphics.fillRect(12, 2, 5, 1); // Tail rotor bottom blade
        graphics.fillRect(14, -4, 1, 8); // Tail rotor mast
    }

    _drawMiniHeavyTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Heavy tank - Large, imposing with complex details
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-14, -9, 28, 18, 4);
        
        // Complex armor scheme with distinctive red accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-12, -7, 24, 2);
        graphics.fillRect(-12, 5, 24, 2);
        graphics.fillRect(-13, -2, 26, 2);
        
        // Spaced armor panels
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-14, -5, 3, 10);
        graphics.fillRect(11, -5, 3, 10);
        graphics.fillRect(-12, -8, 24, 1);
        
        // Large turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 6);
        
        // Heavy barrel (thicker)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(6, -3, 12, 6);
        graphics.fillRect(16, -3, 4, 6); // Large muzzle brake
        
        // Commander's station with red accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillCircle(-3, -5, 2);
        
        // Multiple vision blocks
        graphics.fillStyle(0x000000);
        graphics.fillRect(-8, -7, 1, 1);
        graphics.fillRect(-2, -7, 1, 1);
        graphics.fillRect(4, -7, 1, 1);
    }

    _drawMiniTankDestroyer(graphics, baseColor, darkColor, typeAccentColor) {
        // Tank destroyer - Low profile, long gun, distinctive sloped design
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -6, 24, 12, 2);
        
        // Sloped front armor with purple accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(12, -6, 12, 6, 16, 0);
        
        // Side armor details
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-11, -4, 22, 1);
        graphics.fillRect(-11, 3, 22, 1);
        graphics.fillRect(-10, -1, 20, 1);
        
        // Low profile fighting compartment
        graphics.fillStyle(darkColor);
        graphics.fillCircle(2, 0, 4);
        
        // Very long barrel (distinctive TD feature)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(6, -1, 16, 2);
        graphics.fillRect(20, -2, 3, 4); // Large muzzle brake
        
        // Gun mantlet with purple accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(4, -2, 4, 4);
    }

    _drawMiniArtillery(graphics, baseColor, darkColor, typeAccentColor) {
        // Artillery - Large, complex with distinctive equipment
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-14, -7, 28, 14, 3);
        
        // Artillery hull details with yellow accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-12, -5, 24, 2);
        graphics.fillRect(-12, 3, 24, 2);
        graphics.fillRect(-13, -1, 26, 1);
        
        // Equipment boxes and stowage
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-14, -5, 4, 4);
        graphics.fillRect(-14, 1, 4, 4);
        graphics.fillRect(10, -4, 3, 3);
        graphics.fillRect(10, 1, 3, 3);
        
        // Large turret base
        graphics.fillStyle(darkColor);
        graphics.fillCircle(-1, 0, 5);
        
        // Massive barrel (thicker and longer than others)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(4, -3, 18, 6);
        
        // Recoil system with yellow accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(2, -4, 6, 8);
        graphics.fillRect(1, -2, 3, 4);
        
        // Artillery computer/rangefinder with yellow accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-8, -6, 6, 3);
        graphics.fillCircle(-5, -4, 1);
    }

    _drawMiniFastAttack(graphics, baseColor, darkColor, typeAccentColor) {
        // Fast attack - Modern, angular, high-tech appearance
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-10, -5, 20, 10, 1);
        
        // Modern angular armor with cyan accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(10, -5, 10, 5, 14, 0);
        
        // Speed stripes for dynamic look with cyan accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-8, -3, 16, 1);
        graphics.fillRect(-8, 0, 16, 1);
        graphics.fillRect(-8, 2, 16, 1);
        
        // Small, offset turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(3, 0, 3);
        
        // Short barrel with flash suppressor
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(6, -1, 8, 2);
        graphics.fillRect(12, -2, 2, 4); // Flash suppressor
        
        // Modern optics
        graphics.fillStyle(0x000000);
        graphics.fillRect(1, -2, 2, 1);
        graphics.fillCircle(4, -3, 1);
        
        // Reactive armor blocks with cyan accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-8, -4, 2, 1);
        graphics.fillRect(-2, -4, 2, 1);
        graphics.fillRect(4, -4, 2, 1);
    }

    _drawMiniInfantry(graphics, baseColor, accentColor) {
        // Mini infantry squad - simple figures
        graphics.lineStyle(1, baseColor);
        
        // First soldier
        graphics.moveTo(-4, -3);
        graphics.lineTo(-4, 2); // body
        graphics.moveTo(-4, -1);
        graphics.lineTo(-5, 0); // left arm
        graphics.moveTo(-4, -1);
        graphics.lineTo(-3, 0); // right arm
        graphics.moveTo(-4, 2);
        graphics.lineTo(-5, 3); // left leg
        graphics.moveTo(-4, 2);
        graphics.lineTo(-3, 3); // right leg
        graphics.fillStyle(baseColor);
        graphics.fillCircle(-4, -4, 1); // head
        
        // Second soldier
        graphics.lineStyle(1, accentColor);
        graphics.moveTo(0, -3);
        graphics.lineTo(0, 2);
        graphics.moveTo(0, -1);
        graphics.lineTo(-1, 0);
        graphics.moveTo(0, -1);
        graphics.lineTo(1, 0);
        graphics.moveTo(0, 2);
        graphics.lineTo(-1, 3);
        graphics.moveTo(0, 2);
        graphics.lineTo(1, 3);
        graphics.fillStyle(accentColor);
        graphics.fillCircle(0, -4, 1);
    }

    _drawMiniTracks(graphics, tankType) {
        // Enhanced tracks with more detail
        graphics.fillStyle(0x333333);
        let trackWidth;
        if (tankType === TANK_TYPES.HEAVY) {
            trackWidth = 16;
        } else if (tankType === TANK_TYPES.ARTILLERY) {
            trackWidth = 18;
        } else if (tankType === TANK_TYPES.MEDIUM || tankType === TANK_TYPES.TANK_DESTROYER) {
            trackWidth = 14;
        } else { // LIGHT and FAST_ATTACK
            trackWidth = 12;
        }
        
        // Track base with better definition
        graphics.fillRect(-trackWidth / 2, -12, trackWidth, 2);
        graphics.fillRect(-trackWidth / 2, 10, trackWidth, 2);
        
        // Road wheels (more detailed)
        graphics.fillStyle(0x666666);
        const wheelCount = Math.floor(trackWidth / 4);
        for (let i = 0; i < wheelCount; i++) {
            const wheelX = -trackWidth / 2 + 2 + i * 4;
            graphics.fillCircle(wheelX, -11, 1);
            graphics.fillCircle(wheelX, 11, 1);
            // Add rim detail
            graphics.fillStyle(0x888888);
            graphics.fillCircle(wheelX, -11, 0.5);
            graphics.fillCircle(wheelX, 11, 0.5);
            graphics.fillStyle(0x666666);
        }
    }

    _drawMiniHelicopterSkids(graphics, typeAccentColor) {
        // Landing skids instead of tracks for helicopter icon
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-10, 4, 20, 1); // Cross brace
        graphics.fillRect(-12, 5, 8, 1); // Left skid
        graphics.fillRect(4, 5, 8, 1); // Right skid
        graphics.fillRect(-7, 2, 1, 3); // Left strut
        graphics.fillRect(6, 2, 1, 3); // Right strut
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-6, 4, 12, 1); // Accent stripe on skids
    }

    // ========================================
    // Mini Spell Drawing Methods
    // ========================================

    _drawMiniSmokeBarrage(graphics, baseColor, accentColor) {
        // Smoke barrage - grenade with smoke effect
        // Grenade body
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRoundedRect(-2, -4, 4, 8, 1);
        graphics.fillTriangle(-2, -4, 2, -4, 0, -8); // Pin
        
        // Smoke clouds
        graphics.fillStyle(baseColor);
        graphics.fillEllipse(-6, -2, 6, 4);
        graphics.fillEllipse(0, -3, 8, 5);
        graphics.fillEllipse(6, -1, 5, 3);
        
        // Smoke trails
        graphics.lineStyle(1, accentColor);
        graphics.moveTo(-4, 2);
        graphics.lineTo(-4, 6);
        graphics.moveTo(0, 2);
        graphics.lineTo(0, 6);
        graphics.moveTo(4, 2);
        graphics.lineTo(4, 6);
    }

    _drawMiniArtilleryStrike(graphics, baseColor, accentColor) {
        // Artillery strike - howitzer with shell
        // Gun carriage
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-8, 4, 16, 4, 2);
        graphics.fillRect(-2, 0, 4, 4); // Trail spade
        
        // Barrel
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-1, -8, 2, 12);
        graphics.fillRect(-2, -8, 4, 2); // Breech
        
        // Shell
        graphics.fillStyle(accentColor);
        graphics.fillRect(2, -6, 2, 4);
        graphics.fillTriangle(4, -4, 4, -2, 8, -3);
        
        // Explosion indicator
        graphics.fillStyle(0xff0000);
        graphics.fillCircle(6, -3, 2);
    }

    _drawMiniGenericSpell(graphics, baseColor, accentColor) {
        // Generic spell - magical rune or star
        graphics.fillStyle(baseColor);
        graphics.fillCircle(0, 0, 8);

        // Star pattern
        graphics.fillStyle(accentColor);
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * 6;
            const y = Math.sin(angle) * 6;
            graphics.fillTriangle(0, 0, x * 0.3, y * 0.3, x, y);
        }

        // Inner circle
        graphics.fillStyle(this.colors.metal);
        graphics.fillCircle(0, 0, 3);
    }

    // ========================================
    // Mini Building Drawing Methods
    // ========================================

    _drawMiniV1Launcher(graphics, baseColor, accentColor) {
        // V1 launcher - rocket launcher with missiles
        // Base platform
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-8, 4, 16, 4, 2);

        // Launcher frame
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-6, -6, 12, 10);
        graphics.fillRect(-4, -8, 8, 2);

        // Missiles
        graphics.fillStyle(accentColor);
        graphics.fillRect(-3, -4, 2, 6);
        graphics.fillRect(1, -4, 2, 6);

        // Missile tips
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillTriangle(-4, -4, -2, -4, -3, -8);
        graphics.fillTriangle(0, -4, 2, -4, 1, -8);

        // Launch rails
        graphics.lineStyle(1, this.colors.metal);
        graphics.moveTo(-6, 0);
        graphics.lineTo(-6, 4);
        graphics.moveTo(6, 0);
        graphics.lineTo(6, 4);
    }

    _drawMiniGenericBuilding(graphics, baseColor, accentColor) {
        // Generic building - bunker or tower
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-6, -6, 12, 12, 2);

        // Roof
        graphics.fillStyle(accentColor);
        graphics.fillTriangle(-8, -6, 8, -6, 0, -10);

        // Door/window
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-2, 2, 4, 4);

        // Details
        graphics.lineStyle(1, this.colors.gunmetal);
        graphics.strokeRect(-6, -6, 12, 12);
    }

    // ========================================
    // Full-size Building Drawing Methods
    // ========================================

    _drawV1LauncherBuilding(graphics) {
        // V1 Launcher - rocket launcher building
        const baseColor = 0x6b7280; // Gray
        const accentColor = 0x9ca3af;
        const metalColor = this.colors.gunmetal;

        // Base platform
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-16, 8, 32, 8, 4);

        // Main structure
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -12, 24, 20, 3);

        // Launcher rails
        graphics.fillStyle(metalColor);
        graphics.fillRect(-20, -8, 40, 4);
        graphics.fillRect(-20, 0, 40, 4);

        // Missile silos
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-18, -6, 8, 8, 2);
        graphics.fillRoundedRect(-6, -6, 8, 8, 2);
        graphics.fillRoundedRect(6, -6, 8, 8, 2);
        graphics.fillRoundedRect(12, -6, 8, 8, 2);

        // Missiles in silos
        graphics.fillStyle(accentColor);
        graphics.fillRect(-16, -4, 4, 4);
        graphics.fillRect(-4, -4, 4, 4);
        graphics.fillRect(8, -4, 4, 4);
        graphics.fillRect(14, -4, 4, 4);

        // Missile tips
        graphics.fillStyle(metalColor);
        graphics.fillTriangle(-17, -4, -15, -4, -16, -8);
        graphics.fillTriangle(-5, -4, -3, -4, -4, -8);
        graphics.fillTriangle(7, -4, 9, -4, 8, -8);
        graphics.fillTriangle(13, -4, 15, -4, 14, -8);

        // Control panel
        graphics.fillStyle(metalColor);
        graphics.fillRoundedRect(-8, 2, 16, 6, 1);

        // Antenna
        graphics.fillStyle(metalColor);
        graphics.fillRect(-1, -16, 2, 4);
        graphics.fillCircle(0, -18, 2);
    }

    _drawGenericBuilding(graphics) {
        // Generic building - bunker
        const baseColor = 0x6b7280; // Gray
        const accentColor = 0x9ca3af;
        const metalColor = this.colors.gunmetal;

        // Main structure
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-15, -15, 30, 20, 4);

        // Roof
        graphics.fillStyle(accentColor);
        graphics.fillTriangle(-18, -15, 18, -15, 0, -22);

        // Door
        graphics.fillStyle(metalColor);
        graphics.fillRect(-4, 0, 8, 10);

        // Windows
        graphics.fillStyle(0x000000);
        graphics.fillRect(-12, -8, 6, 4);
        graphics.fillRect(6, -8, 6, 4);
        graphics.fillRect(-12, 0, 6, 4);
        graphics.fillRect(6, 0, 6, 4);

        // Details
        graphics.lineStyle(2, metalColor);
        graphics.strokeRoundedRect(-15, -15, 30, 20, 4);
    }
}
