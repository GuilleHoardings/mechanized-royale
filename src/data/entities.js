// Unified Entities Data (Cards + Units)
// Replaces CARDS and TANK_DATA
// Depends on constants.js for CARD_TYPES and TANK_TYPES

const ENTITIES = {
    // Units (Cards that are also Tanks)
    tiger: {
        id: 'tiger',
        name: 'Tiger Tank',
        type: CARD_TYPES.TROOP,
        unitType: TANK_TYPES.HEAVY,
        cost: 5,
        tier: 2,
        stats: {
            hp: 1300,           // Very high HP
            damage: 70,         // Moderate damage
            speed: 28,          // Slow
            range: 40,          // Melee
            armor: { front: 90, side: 70, rear: 50 },
            penetration: 90
        },
        targetBuildingsOnly: true, // Only targets buildings
        abilities: [],
        description: 'German heavy tank optimized for destroying enemy fortifications',
        payload: { tankId: 'tiger' }
    },
    panther: {
        id: 'panther',
        name: 'Panther Tank',
        type: CARD_TYPES.TROOP,
        unitType: TANK_TYPES.MEDIUM,
        cost: 3,
        tier: 2,
        stats: {
            hp: 320,
            damage: 110,       // High single-target DPS
            speed: 60,
            range: 170,
            armor: { front: 30, side: 20, rear: 15 },
            penetration: 90
        },
        abilities: [],
        description: 'German medium tank with superior firepower and armor',
        payload: { tankId: 'panther' }
    },
    sherman: {
        id: 'sherman',
        name: 'Sherman Tank',
        type: CARD_TYPES.TROOP,
        unitType: TANK_TYPES.MEDIUM,
        cost: 4,
        tier: 2,
        stats: {
            hp: 380,
            damage: 80,
            speed: 50,
            range: 240,        // Long range
            armor: { front: 30, side: 22, rear: 15 },
            penetration: 95
        },
        abilities: [],
        description: 'Versatile American medium tank with long-range gun',
        payload: { tankId: 'sherman' }
    },
    jagdpanzer: {
        id: 'jagdpanzer',
        name: 'Jagdpanzer IV',
        type: CARD_TYPES.TROOP,
        unitType: TANK_TYPES.TANK_DESTROYER,
        cost: 4,
        tier: 2,
        stats: {
            hp: 360,
            damage: 160,       // Very high single-target
            speed: 55,
            range: 40,
            armor: { front: 40, side: 25, rear: 20 },
            penetration: 140
        },
        abilities: [],
        description: 'German tank destroyer with high penetration gun',
        payload: { tankId: 'jagdpanzer' }
    },

    // Units (Not Cards directly, spawned by cards)
    infantry: {
        id: 'infantry',
        name: 'Infantry Squad',
        unitType: TANK_TYPES.LIGHT,
        tier: 1,
        stats: {
            hp: 60,
            damage: 25,
            speed: 95,
            range: 40,
            armor: { front: 5, side: 5, rear: 5 },
            penetration: 30
        },
        abilities: [],
        description: 'Light infantry unit for scouting and harassment'
    },

    // Spells
    smoke_barrage: {
        id: 'smoke_barrage',
        name: 'Smoke Barrage',
        type: CARD_TYPES.SPELL,
        cost: 2,
        payload: {
            radius: 70,
            damage: 120,
            stunMs: 400
        }
    },
    artillery_strike: {
        id: 'artillery_strike',
        name: 'Artillery Strike',
        type: CARD_TYPES.SPELL,
        cost: 4,
        payload: {
            radius: 120,
            damage: 280,
            knockback: 20
        }
    },

    // Buildings
    v1_launcher: {
        id: 'v1_launcher',
        name: 'V1 Launcher',
        type: CARD_TYPES.BUILDING,
        cost: 4,
        payload: {
            lifetimeMs: 50000,
            launchIntervalMs: 3000,
            missileCount: 1,
            missileDamage: 100,
            missileSpeed: 180,
            blastRadius: 60
        }
    },

    // Special Cards (Spawners)
    infantry_platoon: {
        id: 'infantry_platoon',
        name: 'Infantry Platoon',
        type: CARD_TYPES.TROOP,
        cost: 3,
        payload: {
            swarm: true,
            count: 10,
            tankId: 'infantry'
        }
    }
};

// Default player deck order (8 cards)
const DEFAULT_PLAYER_DECK = [
    'tiger',
    'panther',
    'sherman',
    'jagdpanzer',
    'smoke_barrage',
    'artillery_strike',
    'v1_launcher',
    'infantry_platoon'
];
