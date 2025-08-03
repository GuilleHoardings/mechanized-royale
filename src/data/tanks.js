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
    },

    // Tank Destroyers - New class for Milestone 3.1
    tank_destroyer_1: {
        id: 'tank_destroyer_1',
        name: 'Jaguar',
        type: TANK_TYPES.TANK_DESTROYER,
        tier: 3,
        stats: {
            hp: 350,
            damage: 110,
            speed: 40,
            range: 220,
            armor: { front: 50, side: 25, rear: 15 },
            penetration: 130
        },
        cost: 4,
        abilities: ['ambush'],
        description: 'Long-range tank destroyer with high penetration'
    },

    // Artillery - New support class
    tank_artillery_1: {
        id: 'tank_artillery_1',
        name: 'Howitzer',
        type: TANK_TYPES.ARTILLERY,
        tier: 3,
        stats: {
            hp: 300,
            damage: 95,
            speed: 35,
            range: 300,
            armor: { front: 25, side: 20, rear: 15 },
            penetration: 75
        },
        cost: 5,
        abilities: ['artillery_strike'],
        description: 'Long-range artillery with area damage'
    },

    // Fast Attack Vehicle
    tank_light_3: {
        id: 'tank_light_3',
        name: 'Raptor',
        type: TANK_TYPES.FAST_ATTACK,
        tier: 3,
        stats: {
            hp: 180,
            damage: 45,
            speed: 100,
            range: 140,
            armor: { front: 18, side: 12, rear: 8 },
            penetration: 55
        },
        cost: 3,
        abilities: ['hit_and_run'],
        description: 'Ultra-fast hit-and-run specialist'
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
    },

    ambush: {
        id: 'ambush',
        name: 'Ambush',
        description: 'First shot from cover deals +100% damage',
        cooldown: 35,
        duration: 0,
        effect: 'first_shot_bonus'
    },

    artillery_strike: {
        id: 'artillery_strike',
        name: 'Artillery Strike',
        description: 'Call down area bombardment',
        cooldown: 45,
        duration: 0,
        effect: 'area_damage'
    },

    hit_and_run: {
        id: 'hit_and_run',
        name: 'Hit and Run',
        description: 'Gain speed boost after dealing damage',
        cooldown: 20,
        duration: 5,
        effect: 'speed_boost_on_hit'
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
                    tanks: ['tank_light_1', 'tank_light_2', 'tank_light_3']
                },
                medium: {
                    name: 'Medium Tank Line',
                    tanks: ['tank_medium_1', 'tank_medium_2']
                },
                heavy: {
                    name: 'Heavy Tank Line',
                    tanks: ['tank_heavy_1', 'tank_heavy_2']
                },
                tank_destroyer: {
                    name: 'Tank Destroyer Line',
                    tanks: ['tank_destroyer_1']
                },
                artillery: {
                    name: 'Artillery Line',
                    tanks: ['tank_artillery_1']
                }
            }
        }
    }
};
