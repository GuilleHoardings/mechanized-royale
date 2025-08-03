// Tank data definitions
const TANK_DATA = {
    // Light Tanks
    tank_light_1: {
        id: 'tank_light_1',
        name: 'Scout',
        type: TANK_TYPES.LIGHT,
        tier: 1,
        stats: {
            hp: 200,
            damage: 40,
            speed: 80,
            range: 150,
            armor: { front: 15, side: 10, rear: 8 },
            penetration: 50
        },
        cost: 2, // Energy cost to deploy
        abilities: [],
        description: 'Fast reconnaissance tank with light armor'
    },

    tank_light_2: {
        id: 'tank_light_2',
        name: 'Lynx',
        type: TANK_TYPES.LIGHT,
        tier: 2,
        stats: {
            hp: 250,
            damage: 55,
            speed: 85,
            range: 160,
            armor: { front: 20, side: 15, rear: 10 },
            penetration: 60
        },
        cost: 3,
        abilities: ['smoke_screen'],
        description: 'Improved light tank with smoke capability'
    },

    // Medium Tanks
    tank_medium_1: {
        id: 'tank_medium_1',
        name: 'Warrior',
        type: TANK_TYPES.MEDIUM,
        tier: 2,
        stats: {
            hp: 400,
            damage: 75,
            speed: 50,
            range: 180,
            armor: { front: 35, side: 25, rear: 20 },
            penetration: 85
        },
        cost: 4,
        abilities: [],
        description: 'Balanced main battle tank'
    },

    tank_medium_2: {
        id: 'tank_medium_2',
        name: 'Centurion',
        type: TANK_TYPES.MEDIUM,
        tier: 3,
        stats: {
            hp: 500,
            damage: 90,
            speed: 55,
            range: 200,
            armor: { front: 45, side: 35, rear: 25 },
            penetration: 100
        },
        cost: 5,
        abilities: ['precision_shot'],
        description: 'Advanced medium tank with superior firepower'
    },

    // Heavy Tanks
    tank_heavy_1: {
        id: 'tank_heavy_1',
        name: 'Guardian',
        type: TANK_TYPES.HEAVY,
        tier: 3,
        stats: {
            hp: 800,
            damage: 120,
            speed: 30,
            range: 170,
            armor: { front: 80, side: 60, rear: 40 },
            penetration: 120
        },
        cost: 6,
        abilities: [],
        description: 'Heavily armored breakthrough tank'
    },

    tank_heavy_2: {
        id: 'tank_heavy_2',
        name: 'Fortress',
        type: TANK_TYPES.HEAVY,
        tier: 4,
        stats: {
            hp: 1000,
            damage: 150,
            speed: 25,
            range: 180,
            armor: { front: 100, side: 80, rear: 50 },
            penetration: 140
        },
        cost: 7,
        abilities: ['siege_mode'],
        description: 'Ultimate heavy tank with devastating firepower'
    }
};

// Tank abilities
const ABILITIES = {
    smoke_screen: {
        id: 'smoke_screen',
        name: 'Smoke Screen',
        description: 'Deploys smoke to block enemy vision',
        cooldown: 30,
        duration: 10,
        effect: 'vision_block'
    },

    precision_shot: {
        id: 'precision_shot',
        name: 'Precision Shot',
        description: 'Next shot deals double damage',
        cooldown: 25,
        duration: 0,
        effect: 'damage_boost'
    },

    siege_mode: {
        id: 'siege_mode',
        name: 'Siege Mode',
        description: 'Immobilize to gain +50% damage and range',
        cooldown: 40,
        duration: 15,
        effect: 'damage_range_boost'
    }
};

// Research tree for unlocking tanks
const RESEARCH_TREE = {
    nations: {
        generic: {
            name: 'Generic',
            trees: {
                light: {
                    name: 'Light Tank Line',
                    tanks: ['tank_light_1', 'tank_light_2']
                },
                medium: {
                    name: 'Medium Tank Line',
                    tanks: ['tank_medium_1', 'tank_medium_2']
                },
                heavy: {
                    name: 'Heavy Tank Line',
                    tanks: ['tank_heavy_1', 'tank_heavy_2']
                }
            }
        }
    }
};
