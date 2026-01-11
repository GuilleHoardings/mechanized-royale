// Units/Entities: Pure combat actors (Stats, visual data, combat physics)
const UNITS = {
    tiger: {
        id: 'tiger',
        name: 'Tiger',
        unitType: TANK_TYPES.HEAVY,
        tier: 2,
        stats: {
            hp: 1300,
            damage: 70,
            speed: 28,
            range: 40,
            armor: { front: 90, side: 70, rear: 50 },
            penetration: 90
        },
        targetBuildingsOnly: true,
        abilities: [],
        description: 'German heavy tank optimized for destroying enemy fortifications'
    },
    panther: {
        id: 'panther',
        name: 'Panther',
        unitType: TANK_TYPES.MEDIUM,
        tier: 2,
        stats: {
            hp: 320,
            damage: 110,
            speed: 60,
            range: 170,
            armor: { front: 30, side: 20, rear: 15 },
            penetration: 90
        },
        abilities: [],
        description: 'German medium tank with superior firepower and armor'
    },
    sherman: {
        id: 'sherman',
        name: 'Sherman',
        unitType: TANK_TYPES.MEDIUM,
        tier: 2,
        stats: {
            hp: 380,
            damage: 80,
            speed: 50,
            range: 240,
            armor: { front: 30, side: 22, rear: 15 },
            penetration: 95
        },
        abilities: [],
        description: 'Versatile American medium tank with long-range gun'
    },
    jagdpanzer: {
        id: 'jagdpanzer',
        name: 'Jagdpanzer IV',
        unitType: TANK_TYPES.TANK_DESTROYER,
        tier: 2,
        stats: {
            hp: 360,
            damage: 160,
            speed: 55,
            range: 40,
            armor: { front: 40, side: 25, rear: 20 },
            penetration: 140
        },
        abilities: [],
        description: 'German tank destroyer with high penetration gun'
    },
    infantry: {
        id: 'infantry',
        name: 'Infantry Squad',
        unitType: TANK_TYPES.LIGHT,
        tier: 1,
        stats: {
            hp: 60,
            damage: 25,
            speed: 65,
            range: 40,
            armor: { front: 5, side: 5, rear: 5 },
            penetration: 30
        },
        abilities: [],
        description: 'Light infantry unit for scouting and harassment'
    },
    v1_launcher: {
        id: 'v1_launcher',
        name: 'V1 Launcher',
        unitType: CARD_TYPES.BUILDING, // Using CARD_TYPES as a proxy for building category
        stats: {
            hp: 1000
        },
        payload: {
            lifetimeMs: 50000,
            launchIntervalMs: 7000,
            missileCount: 1,
            missileDamage: 100,
            missileSpeed: 180,
            blastRadius: 60
        },
        description: 'Static launcher that fires V1 missiles at enemy targets'
    },
    main_tower: {
        id: 'main_tower',
        name: 'King Tower',
        stats: {
            hp: 1200,
            damage: 80,
            range: 200
        }
    },
    side_tower: {
        id: 'side_tower',
        name: 'Princess Tower',
        stats: {
            hp: 600,
            damage: 80,
            range: 200
        }
    }
};

// Cards: Player interaction and deployment logic
const CARDS = {
    tiger: {
        id: 'tiger',
        name: UNITS.tiger.name,
        type: CARD_TYPES.TROOP,
        cost: 5,
        unitId: 'tiger',
        description: UNITS.tiger.description
    },
    panther: {
        id: 'panther',
        name: UNITS.panther.name,
        type: CARD_TYPES.TROOP,
        cost: 3,
        unitId: 'panther',
        description: UNITS.panther.description
    },
    sherman: {
        id: 'sherman',
        name: UNITS.sherman.name,
        type: CARD_TYPES.TROOP,
        cost: 4,
        unitId: 'sherman',
        description: UNITS.sherman.description
    },
    jagdpanzer: {
        id: 'jagdpanzer',
        name: UNITS.jagdpanzer.name,
        type: CARD_TYPES.TROOP,
        cost: 4,
        unitId: 'jagdpanzer',
        description: UNITS.jagdpanzer.description
    },
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
    v1_launcher: {
        id: 'v1_launcher',
        name: UNITS.v1_launcher.name,
        type: CARD_TYPES.BUILDING,
        cost: 4,
        unitId: 'v1_launcher',
        description: UNITS.v1_launcher.description
    },
    infantry_platoon: {
        id: 'infantry_platoon',
        name: 'Infantry Platoon',
        type: CARD_TYPES.TROOP,
        cost: 3,
        payload: {
            swarm: true,
            count: 10,
            unitId: 'infantry'
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
