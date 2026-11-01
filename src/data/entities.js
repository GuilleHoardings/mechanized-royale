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
            range: 70,
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
            range: 100,
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
            range: 115,
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
            range: 150,
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
            range: 50,
            armor: { front: 5, side: 5, rear: 5 },
            penetration: 30
        },
        abilities: [],
        description: 'Light infantry unit for scouting and harassment'
    },
    attack_helicopter: {
        id: 'attack_helicopter',
        name: 'Attack Helicopter',
        unitType: TANK_TYPES.AIR,
        tier: 2,
        cost: 4,
        stats: {
            hp: 320,
            damage: 50,
            speed: 100,
            range: 95,
            armor: { front: 0, side: 0, rear: 0 },
            penetration: 60
        },
        isAir: true,
        canTargetAir: true,
        canTargetGround: true,
        abilities: [],
        description: 'Fast gunship that strafes ground and air targets. Ignored by tanks without AA guns'
    },
    bomber: {
        id: 'bomber',
        name: 'Dive Bomber',
        unitType: TANK_TYPES.AIR,
        tier: 3,
        cost: 5,
        stats: {
            hp: 480,
            damage: 200,
            speed: 55,
            range: 70,
            armor: { front: 0, side: 0, rear: 0 },
            penetration: 160
        },
        isAir: true,
        canTargetAir: false,
        canTargetGround: true,
        targetBuildingsOnly: true,
        abilities: [],
        description: 'Armoured bomber that flies straight for enemy structures. Cannot attack troops'
    },
    flak_panzer: {
        id: 'flak_panzer', // Kept for save/card compatibility; display name is the vehicle
        name: 'Wirbelwind',
        unitType: TANK_TYPES.ANTI_AIR,
        tier: 2,
        cost: 3,
        stats: {
            hp: 260,
            damage: 70,
            speed: 60,
            range: 180,
            armor: { front: 25, side: 15, rear: 10 },
            penetration: 80
        },
        canTargetAir: true,
        canTargetGround: false,
        abilities: [],
        description: 'Flakpanzer IV with quad 20 mm guns. Shreds aircraft but cannot engage ground troops'
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
        canTargetAir: true,
        stats: {
            hp: 1200,
            damage: 80,
            range: 150
        }
    },
    side_tower: {
        id: 'side_tower',
        name: 'Princess Tower',
        canTargetAir: true,
        stats: {
            hp: 600,
            damage: 80,
            range: 140
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
            radius: 80,
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
            radius: 40,
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
    },
    attack_helicopter: {
        id: 'attack_helicopter',
        name: UNITS.attack_helicopter.name,
        type: CARD_TYPES.TROOP,
        cost: 4,
        unitId: 'attack_helicopter',
        description: UNITS.attack_helicopter.description
    },
    bomber: {
        id: 'bomber',
        name: UNITS.bomber.name,
        type: CARD_TYPES.TROOP,
        cost: 5,
        unitId: 'bomber',
        description: UNITS.bomber.description
    },
    flak_panzer: {
        id: 'flak_panzer',
        name: UNITS.flak_panzer.name,
        type: CARD_TYPES.TROOP,
        cost: 3,
        unitId: 'flak_panzer',
        description: UNITS.flak_panzer.description
    }
};


// Default player deck order (8 cards)
const DEFAULT_PLAYER_DECK = [
    'tiger',
    'panther',
    'sherman',
    'jagdpanzer',
    'attack_helicopter',
    'bomber',
    'flak_panzer',
    'infantry_platoon'
];
