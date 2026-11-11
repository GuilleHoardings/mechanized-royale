/**
 * AI deck archetypes for Mechanized Royale.
 *
 * Every deck is a balanced 8-card list (same size as the player's) built from
 * the shared CARDS pool. One archetype is drawn at random when a battle starts
 * and its profile is handed to AIController, which then leans into that deck's
 * natural playstyle while still reacting to the battlefield.
 *
 * Profile fields:
 *   defaultMode     - strategic mode the AI falls back to
 *   preferredCards  - cards the AI should prioritise when they are in hand
 *   signatureCards  - the deck's identity cards (picked more eagerly)
 *   signatureChance - how often a signature card is preferred over a counter
 *   pickBias        - fallback weighting per card type (troop/spell/building)
 *   laneBias        - lane the deck likes to mass in when no lane is contested
 *   frontBias       - 0 = deploy near own base, 1 = deploy near the river
 *   rush            - start the battle in rush posture
 */

const AI_DECKS = [
    {
        id: 'armoured',
        tag: 'ARM',
        name: 'Armoured Spearhead',
        summary: 'Heavy armour with helicopter cover and launcher fire.',
        deck: [
            'tiger',
            'panther',
            'sherman',
            'v1_launcher',
            'flak_panzer',
            'infantry_platoon',
            'smoke_barrage',
            'attack_helicopter'
        ],
        defaultMode: 'balanced',
        preferredCards: ['tiger', 'panther', 'sherman', 'v1_launcher'],
        signatureCards: ['tiger', 'v1_launcher'],
        signatureChance: 0.3,
        pickBias: { troop: 1.0, spell: 0.45, building: 0.4 },
        laneBias: 'center',
        frontBias: 0.5,
        rush: false
    },
    {
        id: 'combined',
        tag: 'CMB',
        name: 'Combined Arms',
        summary: 'Tanks, dive bombers and a forward launcher covering one flank.',
        deck: [
            'tiger',
            'panther',
            'sherman',
            'infantry_platoon',
            'bomber',
            'flak_panzer',
            'smoke_barrage',
            'v1_launcher'
        ],
        defaultMode: 'balanced',
        preferredCards: ['tiger', 'panther', 'sherman', 'v1_launcher'],
        signatureCards: ['tiger', 'v1_launcher'],
        signatureChance: 0.3,
        pickBias: { troop: 1.0, spell: 0.45, building: 0.45 },
        laneBias: 'left',
        frontBias: 0.5,
        rush: false
    },
    {
        id: 'air',
        tag: 'AIR',
        name: 'Air Wing',
        summary: 'Bomber and helicopter pressure with fast tanks exploiting gaps.',
        deck: [
            'bomber',
            'attack_helicopter',
            'flak_panzer',
            'panther',
            'infantry_platoon',
            'tiger',
            'smoke_barrage',
            'sherman'
        ],
        defaultMode: 'aggressive',
        preferredCards: ['bomber', 'attack_helicopter', 'panther', 'sherman'],
        signatureCards: ['bomber', 'attack_helicopter'],
        signatureChance: 0.4,
        pickBias: { troop: 1.0, spell: 0.55, building: 0.3 },
        laneBias: 'right',
        frontBias: 0.6,
        rush: false
    },
    {
        id: 'siege',
        tag: 'SGE',
        name: 'Siege Train',
        summary: 'Launchers and artillery soften the lane before armour advances.',
        deck: [
            'v1_launcher',
            'artillery_strike',
            'infantry_platoon',
            'sherman',
            'tiger',
            'flak_panzer',
            'smoke_barrage',
            'panther'
        ],
        defaultMode: 'balanced',
        preferredCards: ['v1_launcher', 'artillery_strike', 'sherman', 'panther'],
        signatureCards: ['tiger', 'v1_launcher'],
        signatureChance: 0.3,
        pickBias: { troop: 1.0, spell: 0.45, building: 0.4 },
        laneBias: 'right',
        frontBias: 0.55,
        rush: false
    },
    {
        id: 'swarm',
        tag: 'SWM',
        name: 'Swarm Columns',
        summary: 'Cheap platoons and fast units splitting pressure across lanes.',
        deck: [
            'infantry_platoon',
            'panther',
            'attack_helicopter',
            'flak_panzer',
            'smoke_barrage',
            'artillery_strike',
            'sherman',
            'tiger'
        ],
        defaultMode: 'split-push',
        preferredCards: ['infantry_platoon', 'panther', 'attack_helicopter', 'smoke_barrage'],
        signatureCards: ['infantry_platoon', 'smoke_barrage'],
        signatureChance: 0.4,
        pickBias: { troop: 1.0, spell: 0.6, building: 0.3 },
        laneBias: 'right',
        frontBias: 0.45,
        rush: false
    }
];

/** Picks one archetype at random for a new battle. */
function pickRandomAIDeck() {
    if (!AI_DECKS.length) return null;
    return AI_DECKS[Math.floor(Math.random() * AI_DECKS.length)];
}

/** Returns an archetype by id, or null when it does not exist. */
function getAIDeckById(id) {
    return AI_DECKS.find((deck) => deck.id === id) || null;
}
