/**
 * Headless targeting test.
 *
 * Runs the real AIController.updateTankAI() against a stub scene with a few
 * static buildings and checks target priority. Touches no rendering, so it is
 * safe in CI and catches the "attacks a farther Wirbelwind instead of the
 * closer tower" regression for every unit type.
 *
 *   node tools/graphics-harness/targeting-smoke.js
 */

const vm = require('vm');
const { createGameContext } = require('./load-game');

const context = createGameContext(['src/utils/AIController.js']);

const cases = vm.runInContext(`
(() => {
    function makeTower(type, x, y, isPlayerOwned) {
        const main = type === 'main';
        const hp = main ? UNITS.main_tower.stats.hp : UNITS.side_tower.stats.hp;
        return {
            buildingId: 'tower_' + type,
            x, y,
            health: hp,
            maxHealth: hp,
            isPlayerOwned,
            isMainTower: main,
            towerType: type,
            canTargetAir: true,
            canTargetGround: true
        };
    }

    function makeBuilding(unitId, x, y, isPlayerOwned, health) {
        const def = UNITS[unitId] || {};
        const maxHealth = def.stats?.hp || 600;
        return {
            buildingId: unitId,
            x, y,
            health: health !== undefined ? health : maxHealth,
            maxHealth,
            isPlayerOwned,
            canTargetAir: !!def.canTargetAir,
            canTargetGround: def.canTargetGround !== false
        };
    }

    function makeTank(unitId, x, y, isPlayerTank) {
        const def = UNITS[unitId];
        return {
            unitId,
            unitData: def,
            x, y,
            health: def.stats.hp,
            maxHealth: def.stats.hp,
            isPlayerTank,
            lane: 'left',
            target: null,
            moving: false,
            attacking: false,
            isAir: !!def.isAir,
            canTargetAir: !!def.canTargetAir,
            canTargetGround: def.canTargetGround !== false
        };
    }

    function run(label, tank, entities) {
        // Entries with unitData are troops and belong in scene.tanks; the rest
        // are static buildings/towers.
        const troops = entities.filter((entity) => entity.unitData);
        const buildings = entities.filter((entity) => !entity.unitData);
        const scene = {
            tanks: [tank, ...troops],
            buildings,
            time: { now: 0 },
            battleEnded: false
        };
        const controller = new AIController(scene);
        controller.updateTankAI(tank);
        const target = tank.target ? (tank.target.buildingId || tank.target.unitId) : null;
        return { label, target };
    }

    const results = [];

    // A decaying Wirbelwind is heavily damaged; that must not outweigh distance.
    results.push(run(
        'in-range: closer tower beats farther damaged Wirbelwind',
        makeTank('sherman', 280, 800, true),
        [
            makeTower('left', 350, 780, false),
            makeBuilding('flak_panzer', 370, 780, false, 13)
        ]
    ));

    // Buildings-only attackers used to ignore towers in the aggro step.
    results.push(run(
        'buildings-only Tiger: closer tower beats farther Wirbelwind',
        makeTank('tiger', 280, 800, true),
        [
            makeTower('left', 355, 780, false),
            makeBuilding('flak_panzer', 375, 780, false, 130)
        ]
    ));

    results.push(run(
        'buildings-only Bomber: closer tower beats farther V1 Launcher',
        makeTank('bomber', 280, 800, true),
        [
            makeTower('left', 355, 780, false),
            makeBuilding('v1_launcher', 375, 780, false)
        ]
    ));

    // Out of gun range but inside aggro range.
    results.push(run(
        'aggro: closer tower beats farther V1 Launcher',
        makeTank('sherman', 280, 800, true),
        [
            makeTower('left', 400, 780, false),
            makeBuilding('v1_launcher', 420, 780, false)
        ]
    ));

    // Main towers are excluded from aggro candidates, so an explicit distance
    // guard must keep a unit from switching to a farther building.
    const mainTowerTank = makeTank('sherman', 280, 800, true);
    const mainTower = makeTower('main', 400, 780, false);
    mainTowerTank.target = mainTower;
    results.push(run(
        'retarget: keeps closer main tower instead of farther Wirbelwind',
        mainTowerTank,
        [
            mainTower,
            makeBuilding('flak_panzer', 420, 780, false, 130)
        ]
    ));

    // The rule is "closest wins", not "towers always win".
    results.push(run(
        'in-range: closer Wirbelwind beats farther tower',
        makeTank('sherman', 280, 800, true),
        [
            makeTower('left', 380, 780, false),
            makeBuilding('flak_panzer', 350, 780, false, 130)
        ]
    ));

    // King Tower immunity still applies now that towers are aggro candidates.
    results.push(run(
        'buildings-only Tiger: cannot skip the lane tower for the King Tower',
        makeTank('tiger', 280, 800, true),
        [
            makeTower('main', 350, 780, false),
            makeTower('left', 380, 780, false)
        ]
    ));

    // Troops keep their defensive pull over buildings.
    const troopTank = makeTank('sherman', 280, 800, true);
    const distantTower = makeTower('left', 400, 780, false);
    troopTank.target = distantTower;
    results.push(run(
        'retarget: a nearby troop still pulls aggro from a tower',
        troopTank,
        [
            distantTower,
            makeTank('infantry', 350, 780, false)
        ]
    ));

    return results;
})()
`, context);

const expected = [
    ['in-range: closer tower beats farther damaged Wirbelwind', 'tower_left'],
    ['buildings-only Tiger: closer tower beats farther Wirbelwind', 'tower_left'],
    ['buildings-only Bomber: closer tower beats farther V1 Launcher', 'tower_left'],
    ['aggro: closer tower beats farther V1 Launcher', 'tower_left'],
    ['retarget: keeps closer main tower instead of farther Wirbelwind', 'tower_main'],
    ['in-range: closer Wirbelwind beats farther tower', 'flak_panzer'],
    ['buildings-only Tiger: cannot skip the lane tower for the King Tower', 'tower_left'],
    ['retarget: a nearby troop still pulls aggro from a tower', 'infantry']
];

console.log('Targeting smoke test');

let failures = 0;
for (const [label, want] of expected) {
    const result = cases.find((entry) => entry.label === label);
    const actual = result ? result.target : null;
    const ok = actual === want;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` (got ${actual}, want ${want})`}`);
}

if (failures) {
    console.error(`\n${failures} targeting check(s) failed.`);
    process.exitCode = 1;
} else {
    console.log('\nAll targeting checks passed.');
}

