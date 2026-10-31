/**
 * Loads the game's plain <script> files into a Node VM context so the real
 * game code can be exercised without a browser.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.join(__dirname, '..', '..');

// Order matters: constants defines TANK_TYPES/CARD_TYPES/DECK_CONFIG, entities
// defines UNITS/CARDS, helpers uses both for deck rules, unit-metrics provides
// UNIT_METRICS, and GraphicsManager consumes all of the above.
const SCRIPTS = [
    'src/utils/constants.js',
    'src/data/entities.js',
    'src/utils/helpers.js',
    'src/data/unit-metrics.js',
    'src/utils/GraphicsManager.js'
];

const PRELUDE = `
    const window = globalThis;
    const Phaser = { GameObjects: {}, Scene: class Scene { constructor() {} }, Math: Math };
`;

/** In-memory localStorage so save/load paths work outside a browser. */
function createLocalStorage() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(key, String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); }
    };
}

/**
 * Creates a VM context with the game's scripts loaded. Extra scripts (scenes,
 * for example) are appended so callers can reach their top-level classes.
 * @param {Array<string>} extraScripts - Repo-relative script paths
 */
function createGameContext(extraScripts = []) {
    const context = vm.createContext({
        console,
        Math,
        Date,
        JSON,
        setTimeout,
        clearTimeout,
        localStorage: createLocalStorage(),
        performance: { now: () => Date.now() }
    });

    vm.runInContext(PRELUDE, context, { filename: 'harness-prelude.js' });

    for (const rel of SCRIPTS.concat(extraScripts)) {
        const file = path.join(REPO_ROOT, rel);
        const code = fs.readFileSync(file, 'utf8');
        vm.runInContext(code, context, { filename: rel });
    }

    return context;
}

/**
 * @returns {{ GraphicsManager: Function, GameHelpers: Object, TANK_TYPES: Object,
 *             CARD_TYPES: Object, DECK_CONFIG: Object, UNITS: Object, CARDS: Object,
 *             DEFAULT_PLAYER_DECK: Array<string>, UNIT_METRICS: Object }}
 */
function loadGame() {
    const context = createGameContext();

    const exported = vm.runInContext(
        '({ GraphicsManager, GameHelpers, TANK_TYPES, CARD_TYPES, DECK_CONFIG, UNITS, CARDS, DEFAULT_PLAYER_DECK, UNIT_METRICS, UNIT_SCALE })',
        context
    );
    exported.REPO_ROOT = REPO_ROOT;
    return exported;
}

module.exports = { loadGame, createGameContext, REPO_ROOT, SCRIPTS };
