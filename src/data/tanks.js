// Tank data definitions
const TANK_DATA = {
    // Card-inspired units
    tank_giant: {
        id: 'tank_giant',
        name: 'Giant',
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
        description: 'Prioritizes buildings; main win condition'
    },
    tank_megaminion: {
        id: 'tank_megaminion',
        name: 'Mega Minion',
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
        description: 'High DPS support'
    },
    tank_musketeer: {
        id: 'tank_musketeer',
        name: 'Musketeer',
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
        description: 'Versatile long-range support'
    },
    tank_minipakka: {
        id: 'tank_minipakka',
        name: 'Mini P.E.K.K.A.',
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
        description: 'Deletes tanks when unopposed'
    },
    tank_skeleton: {
        id: 'tank_skeleton',
        name: 'Skeleton',
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
        description: 'Cheap swarm unit'
    }
};




