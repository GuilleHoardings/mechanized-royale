// Tank data definitions
const TANK_DATA = {
    // Card-inspired units
    tank_tiger: {
        id: 'tank_tiger',
        name: 'Tiger Tank',
        type: TANK_TYPES.HEAVY,
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
        cost: 5,
        abilities: [],
        description: 'German heavy tank optimized for destroying enemy fortifications'
    },
    tank_panther: {
        id: 'tank_panther',
        name: 'Panther Tank',
        type: TANK_TYPES.MEDIUM,
        tier: 2,
        stats: {
            hp: 320,
            damage: 110,       // High single-target DPS
            speed: 60,
            range: 170,
            armor: { front: 30, side: 20, rear: 15 },
            penetration: 90
        },
        cost: 3,
        abilities: [],
        description: 'German medium tank with superior firepower and armor'
    },
    tank_sherman: {
        id: 'tank_sherman',
        name: 'Sherman Tank',
        type: TANK_TYPES.MEDIUM,
        tier: 2,
        stats: {
            hp: 380,
            damage: 80,
            speed: 50,
            range: 240,        // Long range
            armor: { front: 30, side: 22, rear: 15 },
            penetration: 95
        },
        cost: 4,
        abilities: [],
        description: 'Versatile American medium tank with long-range gun'
    },
    tank_jagdpanzer: {
        id: 'tank_jagdpanzer',
        name: 'Jagdpanzer IV',
        type: TANK_TYPES.TANK_DESTROYER,
        tier: 2,
        stats: {
            hp: 360,
            damage: 160,       // Very high single-target
            speed: 55,
            range: 40,
            armor: { front: 40, side: 25, rear: 20 },
            penetration: 140
        },
        cost: 4,
        abilities: [],
        description: 'German tank destroyer with high penetration gun'
    },
    tank_infantry: {
        id: 'tank_infantry',
        name: 'Infantry Squad',
        type: TANK_TYPES.LIGHT,
        tier: 1,
        stats: {
            hp: 60,
            damage: 25,
            speed: 95,
            range: 40,
            armor: { front: 5, side: 5, rear: 5 },
            penetration: 30
        },
        cost: 1,
        abilities: [],
        description: 'Light infantry unit for scouting and harassment'
    }
};




