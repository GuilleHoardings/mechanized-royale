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
     * Gets the theme colors based on player/enemy status
     * @param {boolean} isPlayer - Whether this is for the player
     * @returns {Object} Object containing base, dark, and accent colors
     */
    getThemeColors(isPlayer) {
        return {
            base: isPlayer ? this.colors.player : this.colors.enemy,
            dark: isPlayer ? this.colors.playerDark : this.colors.enemyDark,
            accent: isPlayer ? this.colors.playerAccent : this.colors.enemyAccent
        };
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
        // Create a container for the tank
        const tank = this.scene.add.container(x, y);

        // Create graphics object for drawing
        const graphics = this.scene.add.graphics();

        // Use unified drawing method
        this.drawUnitGraphics(graphics, tankId || tankType, {
            isPlayer: isPlayerTank,
            scale: 1.0,
            showTracks: true
        });

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
     * Draws graphics for a specific unit by ID
     * @param {Phaser.GameObjects.Graphics} graphics - The graphics object
     * @param {string} unitId - The unit ID (e.g., 'tank_tiger', 'tank_sherman')
     * @param {Object} options - Options: isPlayer, scale, showTracks
     */
    drawUnitGraphics(graphics, unitId, options = {}) {
        const isPlayer = options.isPlayer !== undefined ? options.isPlayer : true;
        const scale = options.scale || 1.0;
        const showTracks = options.showTracks !== undefined ? options.showTracks : true;

        const { base: baseColor, dark: darkColor, accent: accentColor } = this.getThemeColors(isPlayer);

        // Get tank data if available to determine type/accent
        const tankData = TANK_DATA[unitId];
        const tankType = tankData ? tankData.type : null;
        const typeAccentColor = tankType ? this.getTypeAccentColor(tankType, isPlayer) : accentColor;

        // Apply scale
        if (scale !== 1.0) {
            graphics.setScale(scale);
        }

        // Draw specific unit
        switch (unitId) {
            case 'tank_infantry':
                this._drawInfantry(graphics, baseColor, accentColor);
                return; // Infantry has no tracks
            case 'tank_tiger':
                this._drawTigerTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case 'tank_panther':
                this._drawPantherTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case 'tank_sherman':
                this._drawShermanTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case 'tank_jagdpanzer':
                this._drawJagdpanzer(graphics, baseColor, darkColor, typeAccentColor);
                break;
            // Fallbacks for types if specific ID not found
            case TANK_TYPES.LIGHT:
                this._drawLightTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.HEAVY:
                this._drawTigerTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.MEDIUM:
                this._drawShermanTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.ARTILLERY:
                this._drawArtillery(graphics, baseColor, darkColor, typeAccentColor);
                break;
            case TANK_TYPES.FAST_ATTACK:
                this._drawFastAttack(graphics, baseColor, darkColor, typeAccentColor);
                break;
            default:
                console.warn(`No draw method for unit: ${unitId}, falling back to Medium`);
                this._drawShermanTank(graphics, baseColor, darkColor, typeAccentColor);
                break;
        }

        // Draw tracks if needed
        if (showTracks) {
            // Determine track type based on unit or fallback
            // Determine track type based on unit or fallback
            // Most units map directly to their type for track sizing
            const trackParam = tankType || TANK_TYPES.MEDIUM;
            this._drawTracks(graphics, trackParam);
        }
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

        // Use the unified drawing method with scaling
        this.drawUnitGraphics(graphics, tankId, {
            isPlayer: true,
            scale: 0.7, // Scale down for card
            showTracks: true
        });
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
        graphics.setScale(0.6); // Scale down for card

        switch (cardDef.id) {
            case 'v1_launcher':
                this._drawV1LauncherBuilding(graphics);
                break;
            default:
                // Generic building icon
                this._drawGenericBuilding(graphics);
                break;
        }
    }

    // ========================================
    // Full-size Tank Drawing Methods
    // ========================================

    _drawLightTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-10, -6, 28, 20, 5);

        // Hull Body
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -8, 24, 16, 3);

        // Hull depth (darker side for 3D effect)
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRoundedRect(-12, 0, 24, 8, { tl: 0, tr: 0, bl: 3, br: 3 });

        // Armor plating accents
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-10, -6, 20, 2); // Top plate
        graphics.fillRect(-10, 4, 20, 2);  // Bottom plate

        // Engine vents
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-11, -2, 6, 4);
        graphics.lineStyle(1, 0x000000, 0.3);
        graphics.lineBetween(-11, 0, -5, 0);

        // Turret Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillCircle(2, 2, 6);

        // Turret
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 6);

        // Turret bevel
        graphics.fillStyle(0xffffff, 0.2);
        graphics.fillCircle(-1, -1, 5);
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 5);

        // Barrel
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(4, -1, 14, 2);
        graphics.fillStyle(0x000000, 0.3); // Barrel inner shadow
        graphics.fillRect(4, 0, 14, 1);

        // Muzzle brake
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(16, -2, 3, 4);
        graphics.lineStyle(1, 0x000000, 0.5);
        graphics.strokeRect(16, -2, 3, 4);

        // Hatch
        graphics.fillStyle(this.colors.metal);
        graphics.fillCircle(0, 0, 2.5);
        graphics.fillStyle(0x000000, 0.8);
        graphics.fillCircle(0, 0, 1);
    }

    _drawShermanTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Shadow (Oval for rounded cast hull)
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-14, -12, 28, 24, 10);

        // Hull (Cast - very rounded)
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-14, -11, 28, 22, 8);

        // Hull Depth (Rounded)
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRoundedRect(-14, 0, 28, 11, { tl: 0, tr: 0, bl: 8, br: 8 });

        // Transmission cover (Front)
        graphics.fillStyle(this.colors.metal);
        graphics.fillRoundedRect(8, -8, 4, 16, 2);

        // Engine deck (Rear)
        graphics.fillStyle(darkColor);
        graphics.fillRoundedRect(-12, -9, 10, 18, 2);

        // Star Insignia on Engine Deck
        graphics.fillStyle(0xffffff, 0.7);
        this._drawStar(graphics, -7, 0, 4);

        // Turret Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillCircle(2, 2, 8);

        // Turret (Cast rounded)
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 7.5);

        // Turret Bevel
        graphics.fillStyle(0xffffff, 0.2);
        graphics.fillCircle(-2, -2, 5);
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 5);

        // Mantelet (Boxy gun shield on round turret)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRoundedRect(4, -3, 4, 6, 1);

        // Barrel (Short, 75mm)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(6, -1.5, 14, 3);

        // Commander's Cupola
        graphics.fillStyle(this.colors.metal);
        graphics.fillCircle(-2, -3, 2.5);
        graphics.fillStyle(0x000000, 0.5);
        graphics.fillCircle(-2, -3, 1);
    }

    _drawStar(graphics, x, y, radius) {
        const points = 5;
        const innerRadius = radius * 0.4;
        let step = Math.PI / points;
        let angle = -Math.PI / 2;

        graphics.beginPath();
        graphics.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        for (let i = 0; i < points; i++) {
            angle += step;
            graphics.lineTo(x + Math.cos(angle) * innerRadius, y + Math.sin(angle) * innerRadius);
            angle += step;
            graphics.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        }
        graphics.closePath();
        graphics.fillPath();
    }

    _drawPantherTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Shadow (Broader, boxy)
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-16, -12, 32, 28, 2);

        // Hull (Angular, sloped)
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-15, -12, 30, 24, 2);

        // Side Skirts (Schurzen) - Top and Bottom
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-14, -15, 28, 3); // Top skirt
        graphics.fillRect(-14, 12, 28, 3); // Bottom skirt

        // Skirt segments
        graphics.lineStyle(1, 0x000000, 0.3);
        for (let i = 0; i < 5; i++) {
            graphics.lineBetween(-14 + i * 6, -15, -14 + i * 6, -12);
            graphics.lineBetween(-14 + i * 6, 12, -14 + i * 6, 15);
        }

        // Sloped Glacis (Front)
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(15, -12, 15, 12, 5, 0);

        // Engine Vents (Rear)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillCircle(-10, -6, 2.5);
        graphics.fillCircle(-10, 6, 2.5);

        // Turret Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-6, -9, 16, 20, 4);

        // Turret (Boxy with angled front)
        graphics.fillStyle(darkColor);
        graphics.fillRoundedRect(-8, -10, 16, 20, 2);

        // Turret Depth
        graphics.fillStyle(0x000000, 0.2);
        graphics.fillRect(-8, 0, 16, 10);

        // Gun Mantlet (Curved Saukompf)
        graphics.fillStyle(this.colors.metal);
        graphics.fillRoundedRect(6, -4, 5, 8, 2);

        // Barrel (Long, 75mm L/70)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(10, -2, 22, 4);

        // Muzzle Brake
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(30, -3, 4, 6);

        // Commander Hatch
        graphics.fillStyle(this.colors.metal);
        graphics.fillCircle(-4, -5, 3);
    }

    _drawMegaMinion(graphics, baseColor, typeAccentColor) {
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillEllipse(0, 0, 30, 10);

        // Fuselage
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-12, -7, 24, 12, 6); // Main body

        // Depth
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRoundedRect(-12, -1, 24, 6, { tl: 0, tr: 0, bl: 6, br: 6 });

        // Tail boom
        graphics.fillStyle(baseColor);
        graphics.fillRect(8, -4, 16, 4);
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRect(8, -1, 16, 1);

        // Body Stripe
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-10, -2, 20, 2);
        graphics.fillRect(10, -1, 10, 1);

        // Canopy (Shiny)
        const canopyColor = 0xaad4ff;
        graphics.fillStyle(canopyColor);
        graphics.fillRoundedRect(-7, -6, 12, 8, 4);
        // Glint
        graphics.fillStyle(0xffffff, 0.6);
        graphics.fillEllipse(-4, -4, 3, 2);

        // Rotor Mast
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-1, -14, 2, 24);
        graphics.fillCircle(0, 0, 3);

        // Rotor Blades (Blurred motion effect)
        graphics.fillStyle(0x000000, 0.1);
        graphics.fillCircle(0, 0, 24); // Spin blur
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-22, -1, 44, 2); // Main blade
        graphics.fillRect(-1, -22, 2, 44); // Cross blade

        // Tail Rotor
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(24, -6, 2, 12);
        graphics.fillStyle(0x000000, 0.2); // Blur
        graphics.fillCircle(25, 0, 8);

        // Underbelly Accent
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-5, 3, 10, 2);
    }

    _drawTigerTank(graphics, baseColor, darkColor, typeAccentColor) {
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-18, -10, 36, 26, 6);

        // Main Hull
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-18, -12, 36, 24, 5);

        // Hull Depth
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRoundedRect(-18, 0, 36, 12, { tl: 0, tr: 0, bl: 5, br: 5 });

        // Heavy Armor Plates (Front/Back)
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-16, -10, 32, 4);
        graphics.fillRect(-16, 6, 32, 4);
        graphics.fillRect(-17, -3, 34, 2); // Side strip

        // Spaced Armor (Side Skirts)
        graphics.fillStyle(this.colors.metal);
        graphics.fillRoundedRect(-19, -8, 4, 16, 1);
        graphics.fillRoundedRect(15, -8, 4, 16, 1);

        // Armor Depth
        graphics.fillStyle(0x000000, 0.2);
        graphics.fillRect(-19, 0, 4, 8);
        graphics.fillRect(15, 0, 4, 8);

        // Engine Vents
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-16, -6, 8, 12);
        graphics.lineStyle(1, 0x000000, 0.4);
        for (let i = 0; i < 6; i++) graphics.lineBetween(-16, -4 + i * 2, -8, -4 + i * 2);

        // Turret Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillCircle(2, 2, 12);

        // Turret (Large and heavy)
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 11);

        // Turret Bevel
        graphics.fillStyle(0xffffff, 0.15);
        graphics.fillCircle(-2, -2, 9);
        graphics.fillStyle(darkColor);
        graphics.fillCircle(0, 0, 9);

        // Additional Turret Armor
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-8, -8, 16, 4); // Rear bustle
        graphics.strokeCircle(0, 0, 11.5); // Ring

        // Heavy Barrel
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(10, -4, 20, 8);
        graphics.fillStyle(0x000000, 0.3); // Inner
        graphics.fillRect(10, 0, 20, 4);

        // Muzzle Brake (Huge)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(28, -5, 5, 10);

        // Commander Hatch
        graphics.fillStyle(typeAccentColor);
        graphics.fillCircle(-5, -6, 3.5);
        graphics.fillStyle(0x000000, 0.2); // Hatch shadow
        graphics.fillCircle(-5, -6, 2);
    }

    _drawJagdpanzer(graphics, baseColor, darkColor, typeAccentColor) {
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-16, -6, 34, 18, 4);

        // Hull (Low profile)
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-16, -8, 32, 16, 3);

        // Depth
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRoundedRect(-16, 0, 32, 8, { tl: 0, tr: 0, bl: 3, br: 3 });

        // Casemate (Fixed fighting compartment)
        graphics.fillStyle(darkColor);
        graphics.fillRoundedRect(-8, -6, 16, 12, 4);
        graphics.fillStyle(0xffffff, 0.1); // Highlight
        graphics.fillRoundedRect(-8, -6, 16, 6, { tl: 4, tr: 4, bl: 0, br: 0 });

        // Sloped Front Armor
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(16, -8, 16, 8, 22, 0);

        // Zimmerit / Side skirts
        graphics.fillStyle(this.colors.metal);
        graphics.fillRect(-14, -7, 26, 2);
        graphics.fillRect(-14, 5, 26, 2);

        // Gun Mantlet
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillCircle(8, 0, 5);
        graphics.fillStyle(typeAccentColor);
        graphics.fillCircle(8, 0, 3);

        // Very Long Barrel
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(10, -1.5, 26, 3);
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRect(10, 0, 26, 1.5);

        // Muzzle Brake
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(34, -2.5, 4, 5);

        // Camo / Details
        graphics.fillStyle(0x333333);
        graphics.fillCircle(-10, -4, 1.5);
        graphics.fillCircle(0, -4, 1.5);
        graphics.fillCircle(0, 4, 1.5);
    }

    _drawArtillery(graphics, baseColor, darkColor, typeAccentColor) {
        // Shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(-20, -8, 40, 22, 5);

        // Hull (Boxy)
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-20, -10, 40, 20, 4);

        // Hull Depth
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRoundedRect(-20, 0, 40, 10, { tl: 0, tr: 0, bl: 4, br: 4 });

        // Warning/Safety markings
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-18, -8, 36, 4);
        graphics.fillRect(-18, -2, 36, 2);

        // Stabilizers (Deployed)
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(-24, -10, 4, 20); // Rear spades

        // Large Turret Base
        graphics.fillStyle(darkColor);
        graphics.fillRoundedRect(-10, -8, 20, 16, 4);
        graphics.fillStyle(0x000000, 0.2); // Turret side depth
        graphics.fillRoundedRect(-10, 0, 20, 8, { tl: 0, tr: 0, bl: 4, br: 4 });

        // Massive Howitzer Barrel
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(0, -5, 28, 10);
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRect(0, 0, 28, 5);

        // Recoil Cylinders
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(5, -6, 10, 2);
        graphics.fillRect(5, 4, 10, 2);

        // Elevation Gear
        graphics.fillStyle(this.colors.metal);
        graphics.fillCircle(0, 0, 6);
        graphics.strokeCircle(0, 0, 6);
    }

    _drawFastAttack(graphics, baseColor, darkColor, typeAccentColor) {
        // Shadow (Blurred/Speed)
        graphics.fillStyle(0x000000, 0.2);
        graphics.fillRoundedRect(-10, -4, 24, 14, 3);

        // Hull (Sleek)
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(-10, -6, 20, 12, 2);

        // Depth
        graphics.fillStyle(0x000000, 0.15);
        graphics.fillRoundedRect(-10, 0, 20, 6, { tl: 0, tr: 0, bl: 2, br: 2 });

        // Angular Armor
        graphics.fillStyle(typeAccentColor);
        graphics.fillTriangle(10, -6, 10, 6, 16, 0); // Nose cone

        // Racing Stripes/Speed lines
        graphics.fillStyle(typeAccentColor);
        graphics.fillRect(-8, -2, 16, 4);
        graphics.fillStyle(baseColor);
        graphics.fillRect(-10, -1, 20, 2); // Center line break

        // Turret (Small, Offset)
        graphics.fillStyle(darkColor);
        graphics.fillCircle(2, 0, 4);

        // Auto-cannon
        graphics.fillStyle(this.colors.gunmetal);
        graphics.fillRect(6, -1, 10, 2);
        graphics.fillRect(14, -2, 4, 4); // Muzzle

        // Optics / Sensor package
        graphics.fillStyle(0x000000);
        graphics.fillCircle(1, -2, 1.5);

        // Wheels (if visible, but this has tracks in theory, though it looks like an armored car)
        // Let's suggest wheel wells
        graphics.fillStyle(0x000000, 0.4);
        graphics.fillCircle(-6, 6, 3);
        graphics.fillCircle(6, 6, 3);
        graphics.fillCircle(-6, -6, 3);
        graphics.fillCircle(6, -6, 3);
    }

    _drawInfantry(graphics, baseColor, accentColor) {
        // Infantry squad - Top down view with more detail
        const drawSoldier = (x, y, color) => {
            // Shadow
            graphics.fillStyle(0x000000, 0.3);
            graphics.fillCircle(x + 1, y + 1, 4.5);

            // Shoulders/Vest
            graphics.fillStyle(0x2d3748); // Dark grey gear
            graphics.fillRoundedRect(x - 5, y - 3, 10, 6, 2);

            // Helmet
            graphics.fillStyle(color);
            graphics.fillCircle(x, y, 3.5);

            // Helmet shine
            graphics.fillStyle(0xffffff, 0.3);
            graphics.fillCircle(x - 1.5, y - 1.5, 1.5);

            // Weapon (rifle)
            graphics.fillStyle(0x000000);
            graphics.fillRect(x + 1, y - 1, 7, 2); // Barrel
            graphics.fillRect(x + 1, y, 2, 3);   // Grip

            // Backpack/Radio
            graphics.fillStyle(0x333333);
            graphics.fillRect(x - 4, y - 2, 2, 4);
        };

        drawSoldier(-8, -5, baseColor);
        drawSoldier(-2, 2, accentColor); // Squad leader logic for color?
        drawSoldier(4, -5, baseColor);
    }

    _drawTracks(graphics, tankType) {
        const trackSpecs = {
            [TANK_TYPES.HEAVY]: { length: 38, thickness: 5, yTop: -17, yBot: 12 },
            [TANK_TYPES.ARTILLERY]: { length: 40, thickness: 4, yTop: -15, yBot: 11 },
            [TANK_TYPES.TANK_DESTROYER]: { length: 34, thickness: 4, yTop: -14, yBot: 10 },
            [TANK_TYPES.MEDIUM]: { length: 34, thickness: 4, yTop: -14, yBot: 10 },
            // Default/Light/Fast fallthrough
            default: { length: 26, thickness: 3, yTop: -11, yBot: 8 }
        };

        const spec = trackSpecs[tankType] || trackSpecs.default;
        const { length: trackLength, thickness: trackThickness, yTop, yBot } = spec;

        const drawTrack = (y) => {
            const x = -trackLength / 2;

            // Track Mat
            graphics.fillStyle(0x1a1a1a);
            graphics.fillRoundedRect(x, y, trackLength, trackThickness, 1);

            // Segments
            graphics.lineStyle(1, 0x000000, 0.4);
            const segmentCount = Math.floor(trackLength / 3);
            for (let i = 0; i < segmentCount; i++) {
                graphics.lineBetween(x + 2 + i * 3, y, x + 2 + i * 3, y + trackThickness);
            }

            // Wheels
            const wheelRadius = (trackThickness / 2);
            const wheelY = y + trackThickness / 2;
            const numWheels = Math.floor(trackLength / (wheelRadius * 2 + 2));

            graphics.fillStyle(0x444444);
            graphics.lineStyle(1, 0x000000, 0.5);

            // Distribute wheels
            const spacing = trackLength / numWheels;
            for (let i = 0; i < numWheels; i++) {
                const wx = x + spacing / 2 + i * spacing;
                graphics.fillCircle(wx, wheelY, wheelRadius - 0.5);
                graphics.strokeCircle(wx, wheelY, wheelRadius - 0.5);
            }
        };

        drawTrack(yTop);
        drawTrack(yBot);
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
