// Cards data: 8-card deck inspired by Clash Royale archetype
// Each card has: id, name, type (troop/spell/building), cost, and payload
// For troops, payload.tankId references TANK_DATA; for spells/buildings, see payload configs.

const CARDS = {
    tiger: {
        id: 'tiger',
        name: 'Tiger Tank',
        type: CARD_TYPES.TROOP,
        cost: 5,
        payload: { tankId: 'tank_tiger' }
    },
    panther: {
        id: 'panther',
        name: 'Panther Tank',
        type: CARD_TYPES.TROOP,
        cost: 3,
        payload: { tankId: 'tank_panther' }
    },
    sherman: {
        id: 'sherman',
        name: 'Sherman Tank',
        type: CARD_TYPES.TROOP,
        cost: 4,
        payload: { tankId: 'tank_sherman' }
    },
    jagdpanzer: {
        id: 'jagdpanzer',
        name: 'Jagdpanzer IV',
        type: CARD_TYPES.TROOP,
        cost: 4,
        payload: { tankId: 'tank_jagdpanzer' }
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
    supply_convoy: {
        id: 'supply_convoy',
        name: 'Supply Convoy',
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
    infantry_platoon: {
        id: 'infantry_platoon',
        name: 'Infantry Platoon',
        type: CARD_TYPES.TROOP,
        cost: 3,
        payload: {
            swarm: true,
            count: 10,
            tankId: 'tank_infantry'
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
    'supply_convoy',
    'infantry_platoon'
];
