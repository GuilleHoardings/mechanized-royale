// Cards data: 8-card deck inspired by Clash Royale archetype
// Each card has: id, name, type (troop/spell/building), cost, and payload
// For troops, payload.tankId references TANK_DATA; for spells/buildings, see payload configs.

const CARDS = {
    giant: {
        id: 'giant',
        name: 'Giant',
        type: CARD_TYPES.TROOP,
        cost: 5,
        payload: { tankId: 'tank_giant' }
    },
    mega_minion: {
        id: 'mega_minion',
        name: 'Mega Minion',
        type: CARD_TYPES.TROOP,
        cost: 3,
        payload: { tankId: 'tank_megaminion' }
    },
    musketeer: {
        id: 'musketeer',
        name: 'Musketeer',
        type: CARD_TYPES.TROOP,
        cost: 4,
        payload: { tankId: 'tank_musketeer' }
    },
    mini_pekka: {
        id: 'mini_pekka',
        name: 'Mini P.E.K.K.A.',
        type: CARD_TYPES.TROOP,
        cost: 4,
        payload: { tankId: 'tank_minipakka' }
    },
    zap: {
        id: 'zap',
        name: 'Zap',
        type: CARD_TYPES.SPELL,
        cost: 2,
        payload: {
            radius: 70,
            damage: 120,
            stunMs: 400
        }
    },
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        type: CARD_TYPES.SPELL,
        cost: 4,
        payload: {
            radius: 120,
            damage: 280,
            knockback: 20
        }
    },
    furnace: {
        id: 'furnace',
        name: 'Furnace',
        type: CARD_TYPES.BUILDING,
        cost: 4,
        payload: {
            lifetimeMs: 50000,
            spawnIntervalMs: 4000,
            spawnCount: 2,
            spawnTankId: 'tank_fire_spirit'
        }
    },
    skeleton_army: {
        id: 'skeleton_army',
        name: 'Skeleton Army',
        type: CARD_TYPES.TROOP,
        cost: 3,
        payload: {
            swarm: true,
            count: 10,
            tankId: 'tank_skeleton'
        }
    }
};

// Default player deck order (8 cards)
const DEFAULT_PLAYER_DECK = [
    'giant',
    'mega_minion',
    'musketeer',
    'mini_pekka',
    'zap',
    'fireball',
    'furnace',
    'skeleton_army'
];
