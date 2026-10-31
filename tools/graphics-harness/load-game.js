/**
 * Loads the game's plain <script> files into a Node VM context so the real
 * GraphicsManager code can be exercised without a browser.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.join(__dirname, '..', '..');

// Order matters: constants defines TANK_TYPES/CARD_TYPES, entities defines
// UNITS/CARDS, unit-metrics provides UNIT_METRICS, GraphicsManager consumes all.
const SCRIPTS = [
    'src/utils/constants.js',
    'src/data/entities.js',
    'src/data/unit-metrics.js',
    'src/utils/GraphicsManager.js'
];

const PRELUDE = `
    const window = globalThis;
    const Phaser = { GameObjects: {}, Scene: class Scene {}, Math: Math };
`;

/**
 * @returns {{ GraphicsManager: Function, TANK_TYPES: Object, CARD_TYPES: Object,
 *             UNITS: Object, CARDS: Object, UNIT_METRICS: Object }}
 */
function loadGame() {
    const context = vm.createContext({
        console,
        Math,
        Date,
        JSON,
        setTimeout,
        clearTimeout,
        performance: { now: () => Date.now() }
    });

    vm.runInContext(PRELUDE, context, { filename: 'harness-prelude.js' });

    for (const rel of SCRIPTS) {
        const file = path.join(REPO_ROOT, rel);
        const code = fs.readFileSync(file, 'utf8');
        vm.runInContext(code, context, { filename: rel });
    }

    const exported = vm.runInContext(
        '({ GraphicsManager, TANK_TYPES, CARD_TYPES, UNITS, CARDS, UNIT_METRICS, UNIT_SCALE })',
        context
    );
    exported.REPO_ROOT = REPO_ROOT;
    return exported;
}

module.exports = { loadGame, REPO_ROOT };
