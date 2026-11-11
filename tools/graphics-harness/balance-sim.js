#!/usr/bin/env node
/**
 * AI deck balance simulator.
 *
 * Runs every AI deck matchup inside the real BattleScene in headless Chrome,
 * stepping the scene manually instead of waiting for real time. A battle that
 * lasts three minutes in the game finishes in a fraction of a second here, so
 * the full matrix can be sampled often enough to see through draw noise.
 *
 * The simulator drives the player side with a second AIController through a
 * mirrored scene facade, so both sides use the real card/deployment/targeting
 * code. Only presentation work (health bars, banners, sounds, explosions) is
 * stubbed out.
 *
 * Usage:
 *
 *   node tools/graphics-harness/balance-sim.js
 *   node tools/graphics-harness/balance-sim.js --runs=30 --seed=1337
 *   node tools/graphics-harness/balance-sim.js --check
 *   node tools/graphics-harness/balance-sim.js --json
 *   node tools/graphics-harness/balance-sim.js --json --detail
 *
 * Exit codes:
 *   0  simulation finished (and every balance check passed with --check)
 *   1  simulation failed, or --check found an out-of-band deck/matchup
 *   2  bad command line
 *
 * Playwright is optional to install locally: the script also looks in the
 * usual npx cache and falls back to an installed Chrome/Edge executable.
 */

'use strict';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const CHECK_BANDS = {
    overall: [0.43, 0.57],
    matchup: [0.32, 0.68],
    minRuns: 20
};

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const options = {
        runs: 10,
        seed: 1337,
        check: false,
        json: false,
        detail: false,
        port: 0,
        help: false
    };

    for (const arg of argv) {
        if (arg === '--check') options.check = true;
        else if (arg === '--json') options.json = true;
        else if (arg === '--detail') options.detail = true;
        else if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg.startsWith('--runs=')) options.runs = Number(arg.slice('--runs='.length));
        else if (arg.startsWith('--seed=')) options.seed = Number(arg.slice('--seed='.length));
        else if (arg.startsWith('--port=')) options.port = Number(arg.slice('--port='.length));
        else if (/^\d+$/.test(arg)) options.runs = Number(arg);
        else throw new Error(`Unknown option: ${arg}`);
    }

    if (!Number.isInteger(options.runs) || options.runs < 1) {
        throw new Error('--runs must be a positive integer');
    }
    if (!Number.isFinite(options.seed)) {
        throw new Error('--seed must be a number');
    }
    if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
        throw new Error('--port must be 0-65535');
    }

    return options;
}

function printHelp() {
    console.log(`AI deck balance simulator

  node tools/graphics-harness/balance-sim.js [options]

Options:
  --runs=N       Battles per ordered matchup (default 10)
  --seed=N       Base RNG seed; each battle derives its own stream (default 1337)
  --check        Exit non-zero when a deck or matchup leaves its balance band
  --json         Print a machine-readable report instead of tables
  --detail       Include per-battle rows in the JSON report
  --port=N       Static server port (default: pick a free port)
  -h, --help     Show this help
`);
}

// ---------------------------------------------------------------------------
// Static file server
// ---------------------------------------------------------------------------

function startStaticServer(port) {
    const server = http.createServer((request, response) => {
        let pathname;
        try {
            pathname = decodeURIComponent((request.url || '/').split('?')[0]);
        } catch {
            response.writeHead(400);
            response.end('Bad request');
            return;
        }

        const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        const filePath = path.resolve(ROOT, relative);
        const insideRoot = filePath === ROOT || filePath.startsWith(ROOT + path.sep);

        if (!insideRoot) {
            response.writeHead(403);
            response.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (error, data) => {
            if (error) {
                response.writeHead(404);
                response.end('Not found');
                return;
            }
            response.writeHead(200, {
                'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
                'Cache-Control': 'no-store'
            });
            response.end(data);
        });
    });

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                server,
                url: `http://127.0.0.1:${address.port}/`
            });
        });
    });
}

// ---------------------------------------------------------------------------
// Playwright / browser resolution
// ---------------------------------------------------------------------------

function playwrightCandidates() {
    const candidates = [];
    if (process.env.PLAYWRIGHT_PATH) candidates.push(process.env.PLAYWRIGHT_PATH);

    candidates.push('playwright', 'playwright-core', 'playwright-chromium');

    // `npx playwright ...` installs under the npm cache. Reuse it so the
    // harness works without a local install.
    const cacheRoots = [
        process.env.npm_config_cache,
        process.env.NPM_CONFIG_CACHE,
        process.env.APPDATA ? path.join(process.env.APPDATA, 'npm-cache') : null,
        path.join(os.homedir(), 'AppData', 'Local', 'npm-cache'),
        path.join(os.homedir(), '.npm')
    ].filter(Boolean);

    for (const cacheRoot of cacheRoots) {
        const npxDir = path.join(cacheRoot, '_npx');
        if (!fs.existsSync(npxDir)) continue;
        for (const entry of fs.readdirSync(npxDir)) {
            const modules = path.join(npxDir, entry, 'node_modules');
            candidates.push(path.join(modules, 'playwright'));
            candidates.push(path.join(modules, 'playwright-core'));
        }
    }

    return [...new Set(candidates)];
}

function loadPlaywright() {
    const errors = [];
    for (const candidate of playwrightCandidates()) {
        try {
            return require(candidate);
        } catch (error) {
            errors.push(`${candidate}: ${error.message}`);
        }
    }
    throw new Error(
        'Playwright could not be loaded. Install it with `npm i -D playwright` ' +
        'or set PLAYWRIGHT_PATH to an existing install.\n' + errors.join('\n')
    );
}

function browserCandidates() {
    const candidates = [
        process.env.CHROME_PATH,
        process.env.EDGE_PATH
    ].filter(Boolean);

    if (process.platform === 'win32') {
        candidates.push(
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
            'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
            'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
        );
    } else if (process.platform === 'darwin') {
        candidates.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
        );
    } else {
        candidates.push(
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/microsoft-edge'
        );
    }

    return [...new Set(candidates)];
}

async function launchBrowser(chromium) {
    const errors = [];

    // Prefer Playwright's bundled browser when it is installed.
    try {
        return await chromium.launch({ headless: true });
    } catch (error) {
        errors.push(`bundled: ${error.message.split('\n')[0]}`);
    }

    for (const executablePath of browserCandidates()) {
        if (!fs.existsSync(executablePath)) continue;
        try {
            return await chromium.launch({ headless: true, executablePath });
        } catch (error) {
            errors.push(`${executablePath}: ${error.message.split('\n')[0]}`);
        }
    }

    throw new Error('No Chromium browser could be launched.\n' + errors.join('\n'));
}

// ---------------------------------------------------------------------------
// In-page simulator
// ---------------------------------------------------------------------------

/**
 * Installs the simulator on the running BattleScene and returns the deck ids.
 *
 * Everything this function uses comes from the page's global game scripts, so
 * it is serialised and executed inside the browser rather than in Node.
 */
function installSimulator() {
    const GAME = GAME_CONFIG;
    const scene0 = window.currentScene;
    const game = scene0.game;
    game.loop.stop();

    const STEP = 33;
    const MAX_STEPS = 9000;
    let simTime = scene0.time.now;
    let currentUsage = { player: {}, enemy: {} };
    let battleCount = 0;

    // Phaser's TweenManager advances from Date.now(), not the scene clock.
    // Bind it to simulated time so projectile travel and every tween finish at
    // the same step regardless of how fast the machine runs the battle.
    Date.now = () => simTime;

    const original = {
        cycleAICard: scene0.cycleAICard,
        endBattle: scene0.endBattle
    };

    // Persistent overrides. Scene restarts reuse the same instance, and these
    // presentation-only methods are stubbed so a battle never builds health
    // bars, banners or a result screen.
    scene0.endBattle = function (result, reason) {
        if (this.battleEnded) return;
        this.battleEnded = true;
        this.simResult = result;
        this.simReason = reason || '';
    };
    scene0.cycleAICard = function (index) {
        const used = this.aiHand[index];
        if (used) currentUsage.enemy[used] = (currentUsage.enemy[used] || 0) + 1;
        return original.cycleAICard.call(this, index);
    };

    const noops = [
        'updateEnergyBar',
        'showEnergyGainEffect',
        'updateTimerDisplay',
        'updateTankHealth',
        'updateBuildingHealth',
        'createTankHealthBar',
        'createBuildingHealthBar',
        'playUISound',
        '_showNotification',
        'showTowerDestroyedNotification',
        'updateTowerStatusDisplay',
        'updateAIStrategyDisplay',
        'updateAttackRangeCircle',
        'drawDeploymentZones'
    ];
    noops.forEach((name) => { scene0[name] = () => {}; });

    const mirrorY = (y) => GAME.WORLD_HEIGHT - y;

    // Mirror the player's expanded deployment areas into the enemy's frame.
    const mirrorZones = (zones) => {
        if (!zones || !zones.player) return null;
        const player = zones.player;
        return {
            enemy: {
                leftSideExpanded: player.leftSideExpanded,
                rightSideExpanded: player.rightSideExpanded,
                expandedAreas: (player.expandedAreas || []).map((area) => ({
                    tileX: area.tileX,
                    tileY: (GAME.TILES_Y - 1) - (area.tileY + area.tilesHeight - 1),
                    tilesWidth: area.tilesWidth,
                    tilesHeight: area.tilesHeight
                }))
            }
        };
    };

    function makeFacade(scene) {
        const facade = {};
        Object.defineProperties(facade, {
            battleEnded: { get: () => scene.battleEnded },
            aiEnergy: { get: () => scene.energy, set: (value) => { scene.energy = value; } },
            aiMaxEnergy: { get: () => scene.maxEnergy },
            aiHand: { get: () => scene.hand },
            aiDeck: { get: () => scene.deck },
            battleTime: { get: () => scene.battleTime },
            time: { get: () => scene.time },
            tanks: {
                get: () => scene.tanks.map((tank) => ({
                    x: tank.x,
                    y: mirrorY(tank.y),
                    health: tank.health,
                    maxHealth: tank.maxHealth,
                    isPlayerTank: !tank.isPlayerTank,
                    isAir: tank.isAir,
                    canTargetAir: tank.canTargetAir,
                    canTargetGround: tank.canTargetGround,
                    lane: tank.lane,
                    unitId: tank.unitId,
                    unitData: tank.unitData,
                    target: tank.target
                }))
            },
            buildings: {
                get: () => scene.buildings.map((building) => ({
                    x: building.x,
                    y: mirrorY(building.y),
                    health: building.health,
                    maxHealth: building.maxHealth,
                    isPlayerOwned: !building.isPlayerOwned,
                    isMainTower: building.isMainTower,
                    towerType: building.towerType,
                    buildingId: building.buildingId,
                    buildingDef: building.buildingDef,
                    type: building.type,
                    unitData: building.unitData
                }))
            },
            expandedDeploymentZones: { get: () => mirrorZones(scene.expandedDeploymentZones) }
        });

        facade.getEnergyRegenDelay = () => scene.getEnergyRegenDelay();
        facade.aiCastSpell = (card, x, y) => scene._castSpellInternal(card, x, mirrorY(y), true);
        facade.aiPlaceBuilding = (card, x, y) => scene._placeBuildingInternal(card, x, mirrorY(y), true);
        facade.deployAITank = (unitId, x, y) => scene._deployTankInternal(unitId, x, mirrorY(y), true);
        facade.aiDeploySwarm = (card, x, y) => {
            const unitId = card.unitId || (card.payload && card.payload.unitId);
            const count = card.payload?.count || 1;
            const spreadRadius = 25;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const ox = Math.cos(angle) * spreadRadius * (0.5 + Math.random() * 0.5);
                const oy = Math.sin(angle) * spreadRadius * (0.5 + Math.random() * 0.5);
                scene.time.delayedCall(i * 50, () => {
                    scene._deployTankInternal(unitId, x + ox, mirrorY(y + oy), true);
                });
            }
        };
        facade.cycleAICard = (index) => {
            const used = scene.hand[index];
            if (used) currentUsage.player[used] = (currentUsage.player[used] || 0) + 1;
            scene.hand[index] = scene.getNextCard(index);
        };

        return facade;
    }

    function restartScene() {
        const scene = window.currentScene;
        scene.scene.restart({ gameState: scene.gameState || {} });
        simTime += STEP;
        game.loop.delta = STEP;
        game.step(simTime, STEP);
        return window.currentScene;
    }

    function configure(playerProfile, enemyProfile) {
        const scene = window.currentScene;
        currentUsage = { player: {}, enemy: {} };
        scene.simResult = null;
        scene.simReason = '';

        scene.deck = [...playerProfile.deck];
        scene.hand = [];
        scene.initializeDeck();

        scene.aiDeckProfile = enemyProfile;
        scene.aiDeck = [...enemyProfile.deck];
        scene.initializeAIDeck();
        scene.aiController.applyDeckProfile(enemyProfile);

        const playerController = new AIController(makeFacade(scene));
        playerController.applyDeckProfile(playerProfile);

        // Both decision controllers run at the same point in the frame, so
        // neither side gets a timing advantage.
        const enemyController = scene.aiController;
        const enemyUpdateAI = enemyController.updateAI.bind(enemyController);
        enemyController.updateAI = () => {};

        scene.battleTime = BATTLE_CONFIG.DURATION;
        scene.energy = 0;
        scene.aiEnergy = 0;
        scene.energyRegenProgress = 0;
        if (scene.energyTimer) scene.energyTimer.elapsed = 0;
        if (scene.aiEnergyTimer) scene.aiEnergyTimer.elapsed = 0;
        if (scene.combatSystem) scene.combatSystem.showExplosionEffect = () => {};

        return { scene, playerController, enemyUpdateAI };
    }

    function runOne(playerId, enemyId) {
        const playerProfile = getAIDeckById(playerId);
        const enemyProfile = getAIDeckById(enemyId);
        if (!playerProfile || !enemyProfile) throw new Error('Unknown deck id');

        const { scene, playerController, enemyUpdateAI } = configure(playerProfile, enemyProfile);
        const startTime = scene.time.now;
        let steps = 0;
        const wallStart = performance.now();

        while (!scene.battleEnded && steps < MAX_STEPS) {
            simTime += STEP;
            game.loop.delta = STEP;
            scene.time.now = simTime;
            scene.time.update(simTime, STEP);
            scene.tweens.update(simTime, STEP);
            scene.sys.updateList.update(simTime, STEP);
            enemyUpdateAI();
            playerController.updateAI();
            scene.update(simTime, STEP);
            steps++;
        }

        const wallMs = performance.now() - wallStart;

        const towers = { player: 0, enemy: 0 };
        scene.buildings.forEach((building) => {
            if (building.isMainTower || building.towerType) {
                towers[building.isPlayerOwned ? 'player' : 'enemy']++;
            }
        });

        // Continuous tower score: destroyed towers count as full value, plus
        // damage dealt to every surviving tower. This breaks the frequent
        // 0-0 official draws into a strength signal.
        const towerStats = scene.towerStats;
        let playerTowerPoints = (towerStats.player.leftTowerDestroyed ? 600 : 0)
            + (towerStats.player.rightTowerDestroyed ? 600 : 0)
            + (towerStats.player.mainTowerDestroyed ? 1200 : 0);
        let enemyTowerPoints = (towerStats.enemy.leftTowerDestroyed ? 600 : 0)
            + (towerStats.enemy.rightTowerDestroyed ? 600 : 0)
            + (towerStats.enemy.mainTowerDestroyed ? 1200 : 0);
        scene.buildings.forEach((building) => {
            if (!(building.isMainTower || building.towerType)) return;
            const damage = Math.max(0, building.maxHealth - building.health);
            if (building.isPlayerOwned) enemyTowerPoints += damage;
            else playerTowerPoints += damage;
        });

        const result = scene.battleEnded ? (scene.simResult || 'draw') : 'timeout';
        const winner = result === 'victory' ? playerId
            : result === 'defeat' ? enemyId
                : 'draw';

        const energy = { player: 0, enemy: 0 };
        Object.entries(currentUsage.player).forEach(([id, count]) => {
            energy.player += (CARDS[id]?.cost || 0) * count;
        });
        Object.entries(currentUsage.enemy).forEach(([id, count]) => {
            energy.enemy += (CARDS[id]?.cost || 0) * count;
        });

        return {
            playerDeck: playerId,
            enemyDeck: enemyId,
            result,
            winner,
            duration: Math.round((simTime - startTime) / 100) / 10,
            overtime: !!scene.overtimeActive,
            steps,
            wallMs: Math.round(wallMs),
            towers,
            towerPoints: {
                player: Math.round(playerTowerPoints),
                enemy: Math.round(enemyTowerPoints),
                margin: Math.round(playerTowerPoints - enemyTowerPoints)
            },
            deployed: {
                player: scene.battleStats.player.tanksDeployed,
                enemy: scene.battleStats.ai.tanksDeployed
            },
            energy,
            usage: JSON.parse(JSON.stringify(currentUsage))
        };
    }

    function mulberry32(a) {
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function runMatchup(playerId, enemyId, runs, seed) {
        const out = [];
        for (let i = 0; i < runs; i++) {
            Math.random = mulberry32((seed + battleCount * 7919) | 0);
            // Anchor the scene clock per battle so timer phases are
            // reproducible regardless of how long the boot scene ran.
            simTime = 1000;
            restartScene();
            battleCount++;
            out.push(runOne(playerId, enemyId));
        }
        return out;
    }

    window.__balanceSim = { runMatchup };
    return AI_DECKS.map((deck) => deck.id);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

const INVERT_RESULT = {
    victory: 'defeat',
    defeat: 'victory',
    draw: 'draw',
    timeout: 'timeout'
};

function emptyStats() {
    return {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        scoreWins: 0,
        scoreLosses: 0,
        scoreDraws: 0,
        margin: 0,
        duration: 0,
        energy: 0,
        deployed: 0,
        usage: {}
    };
}

function viewFrom(battle, deckId) {
    const side = battle.playerDeck === deckId ? 'player' : 'enemy';
    const otherSide = side === 'player' ? 'enemy' : 'player';
    const result = side === 'player' ? battle.result : INVERT_RESULT[battle.result];
    const margin = side === 'player' ? battle.towerPoints.margin : -battle.towerPoints.margin;

    return {
        result,
        margin,
        duration: battle.duration,
        energy: battle.energy[side],
        deployed: battle.deployed[side],
        usage: battle.usage[side],
        otherEnergy: battle.energy[otherSide],
        otherDeployed: battle.deployed[otherSide]
    };
}

function addStats(stats, view) {
    stats.games++;
    if (view.result === 'victory') stats.wins++;
    else if (view.result === 'defeat') stats.losses++;
    else stats.draws++;

    if (view.margin > 0) stats.scoreWins++;
    else if (view.margin < 0) stats.scoreLosses++;
    else stats.scoreDraws++;

    stats.margin += view.margin;
    stats.duration += view.duration;
    stats.energy += view.energy;
    stats.deployed += view.deployed;

    for (const [cardId, count] of Object.entries(view.usage)) {
        stats.usage[cardId] = (stats.usage[cardId] || 0) + count;
    }
}

function winRate(stats) {
    return stats.games ? (stats.wins + stats.draws * 0.5) / stats.games : 0;
}

function scoreRate(stats) {
    return stats.games ? (stats.scoreWins + stats.scoreDraws * 0.5) / stats.games : 0;
}

function aggregate(battles, deckIds) {
    const decks = {};
    const ordered = {};
    const matchups = {};

    deckIds.forEach((deckId) => { decks[deckId] = emptyStats(); });

    battles.forEach((battle) => {
        const orderedKey = `${battle.playerDeck}|${battle.enemyDeck}`;
        if (!ordered[orderedKey]) ordered[orderedKey] = emptyStats();
        addStats(ordered[orderedKey], viewFrom(battle, battle.playerDeck));

        // Mirror battles are a side-bias probe, not a strength signal: both
        // sides are the same deck, so they would just pull every deck toward
        // 50%. Keep them in the ordered table and out of the balance figures.
        if (battle.playerDeck === battle.enemyDeck) return;

        deckIds.forEach((deckId) => {
            if (battle.playerDeck === deckId || battle.enemyDeck === deckId) {
                addStats(decks[deckId], viewFrom(battle, deckId));
            }
        });

        const [first, second] = [battle.playerDeck, battle.enemyDeck].sort();
        const matchupKey = `${first}|${second}`;
        if (!matchups[matchupKey]) matchups[matchupKey] = emptyStats();
        addStats(matchups[matchupKey], viewFrom(battle, first));
    });

    return { decks, ordered, matchups };
}

function serializeStats(stats) {
    const totalUsage = Object.values(stats.usage).reduce((sum, count) => sum + count, 0);
    return {
        games: stats.games,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: winRate(stats),
        scoreWins: stats.scoreWins,
        scoreLosses: stats.scoreLosses,
        scoreDraws: stats.scoreDraws,
        scoreRate: scoreRate(stats),
        avgMargin: stats.games ? stats.margin / stats.games : 0,
        avgDuration: stats.games ? stats.duration / stats.games : 0,
        avgEnergy: stats.games ? stats.energy / stats.games : 0,
        avgDeployed: stats.games ? stats.deployed / stats.games : 0,
        usage: Object.fromEntries(
            Object.entries(stats.usage)
                .sort((a, b) => b[1] - a[1])
                .map(([cardId, count]) => [cardId, {
                    plays: count,
                    share: totalUsage ? count / totalUsage : 0
                }])
        )
    };
}

// ---------------------------------------------------------------------------
// Balance checks
// ---------------------------------------------------------------------------

function runChecks(summary, deckIds, runs) {
    const failures = [];
    const notes = [];
    const [minOverall, maxOverall] = CHECK_BANDS.overall;
    const [minMatchup, maxMatchup] = CHECK_BANDS.matchup;

    if (runs < CHECK_BANDS.minRuns) {
        notes.push(`--check needs at least ${CHECK_BANDS.minRuns} runs per matchup; got ${runs}.`);
    }

    deckIds.forEach((deckId) => {
        const deck = summary.decks[deckId];
        const overall = winRate(deck);
        const score = scoreRate(deck);

        if (overall < minOverall || overall > maxOverall) {
            failures.push({
                type: 'deck-win-rate',
                deck: deckId,
                value: overall,
                band: [minOverall, maxOverall]
            });
        }
        if (score < minOverall || score > maxOverall) {
            failures.push({
                type: 'deck-score-rate',
                deck: deckId,
                value: score,
                band: [minOverall, maxOverall]
            });
        }
    });

    Object.entries(summary.matchups).forEach(([key, stats]) => {
        const value = scoreRate(stats);
        if (value < minMatchup || value > maxMatchup) {
            const [first, second] = key.split('|');
            failures.push({
                type: 'matchup-score-rate',
                matchup: `${first} vs ${second}`,
                value,
                band: [minMatchup, maxMatchup]
            });
        }
    });

    return { failures, notes };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function pct(value, digits = 1) {
    return `${(value * 100).toFixed(digits)}%`;
}

function signed(value, digits = 0) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function pad(value, width, align = 'left') {
    const text = String(value);
    if (text.length >= width) return text;
    const fill = ' '.repeat(width - text.length);
    return align === 'right' ? fill + text : text + fill;
}

function printOrderedTable(summary, deckIds) {
    console.log('Ordered matchups (player vs enemy)');
    console.log('  player     enemy      W-L-D    score W-L-D   margin   avg');
    deckIds.forEach((playerId) => {
        deckIds.forEach((enemyId) => {
            const stats = summary.ordered[`${playerId}|${enemyId}`];
            if (!stats) return;
            console.log(
                `  ${pad(playerId, 10)} ${pad(enemyId, 10)} ` +
                `${pad(`${stats.wins}-${stats.losses}-${stats.draws}`, 8)} ` +
                `${pad(`${stats.scoreWins}-${stats.scoreLosses}-${stats.scoreDraws}`, 13)} ` +
                `${pad(signed(stats.margin / stats.games), 7)} ` +
                `${(stats.duration / stats.games).toFixed(1)}s`
            );
        });
    });
}

function printDeckTable(summary, deckIds) {
    console.log('\nDeck balance (side-neutral, mirror games excluded)');
    console.log('  deck       games  W-L-D    win%   score W-L-D   score%  margin  avgDur  energy  units');
    deckIds.forEach((deckId) => {
        const stats = summary.decks[deckId];
        console.log(
            `  ${pad(deckId, 10)} ${pad(stats.games, 5, 'right')}  ` +
            `${pad(`${stats.wins}-${stats.losses}-${stats.draws}`, 8)} ` +
            `${pad(pct(winRate(stats)), 6, 'right')}  ` +
            `${pad(`${stats.scoreWins}-${stats.scoreLosses}-${stats.scoreDraws}`, 12)}  ` +
            `${pad(pct(scoreRate(stats)), 7, 'right')} ` +
            `${pad(signed(stats.margin / stats.games), 7)} ` +
            `${pad((stats.duration / stats.games).toFixed(1), 7, 'right')} ` +
            `${pad((stats.energy / stats.games).toFixed(1), 7, 'right')} ` +
            `${pad((stats.deployed / stats.games).toFixed(1), 6, 'right')}`
        );
    });
}

function printMatchupTable(summary) {
    console.log('\nSide-neutral matchups (both ordered pairs combined, mirrors excluded)');
    console.log('  matchup                     games  W-L-D    win%   score W-L-D   score%  margin');
    Object.entries(summary.matchups).forEach(([key, stats]) => {
        const [first, second] = key.split('|');
        console.log(
            `  ${pad(`${first} vs ${second}`, 26)} ${pad(stats.games, 5, 'right')}  ` +
            `${pad(`${stats.wins}-${stats.losses}-${stats.draws}`, 8)} ` +
            `${pad(pct(winRate(stats)), 6, 'right')}  ` +
            `${pad(`${stats.scoreWins}-${stats.scoreLosses}-${stats.scoreDraws}`, 12)}  ` +
            `${pad(pct(scoreRate(stats)), 7, 'right')} ` +
            `${pad(signed(stats.margin / stats.games), 7)}`
        );
    });
}

function printUsage(summary, deckIds) {
    console.log('\nCard usage per deck (share of all plays, side-neutral)');
    deckIds.forEach((deckId) => {
        const stats = summary.decks[deckId];
        const total = Object.values(stats.usage).reduce((sum, count) => sum + count, 0);
        const cards = Object.entries(stats.usage)
            .sort((a, b) => b[1] - a[1])
            .map(([cardId, count]) => `${cardId} ${total ? Math.round(count / total * 100) : 0}%`)
            .join(', ');
        console.log(`  ${pad(deckId, 10)} ${cards}`);
    });
}

function printChecks(checks) {
    console.log('\nBalance check');
    checks.notes.forEach((note) => console.log(`  note ${note}`));
    if (!checks.failures.length) {
        console.log(`  ok   every deck within ${pct(CHECK_BANDS.overall[0], 0)}-${pct(CHECK_BANDS.overall[1], 0)} overall and every matchup within ${pct(CHECK_BANDS.matchup[0], 0)}-${pct(CHECK_BANDS.matchup[1], 0)}`);
        return;
    }
    checks.failures.forEach((failure) => {
        if (failure.type === 'matchup-score-rate') {
            console.log(`  FAIL ${failure.matchup} score rate ${pct(failure.value)} (band ${pct(failure.band[0], 0)}-${pct(failure.band[1], 0)})`);
        } else {
            console.log(`  FAIL ${failure.deck} ${failure.type === 'deck-win-rate' ? 'win' : 'score'} rate ${pct(failure.value)} (band ${pct(failure.band[0], 0)}-${pct(failure.band[1], 0)})`);
        }
    });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }

    if (options.check && options.runs < CHECK_BANDS.minRuns) {
        console.error(`--check needs at least ${CHECK_BANDS.minRuns} runs per matchup (got ${options.runs}).`);
        process.exitCode = 2;
        return;
    }

    const { chromium } = loadPlaywright();
    const { server, url } = await startStaticServer(options.port);
    const browser = await launchBrowser(chromium);

    const problems = [];
    const battles = [];
    let deckIds = [];
    let elapsedMs = 0;

    try {
        const page = await browser.newPage({
            viewport: { width: 1200, height: 1040 },
            deviceScaleFactor: 1
        });
        page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
        page.on('console', (message) => {
            if (message.type() === 'error') problems.push(`console: ${message.text()}`);
        });

        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => window.currentScene && window.currentScene.scene,
            null,
            { timeout: 20000 }
        );
        await page.evaluate(() => {
            window.currentScene.scene.start('BattleScene', {
                gameState: window.currentScene.gameState || {}
            });
        });
        await page.waitForFunction(
            () => window.currentScene
                && window.currentScene.sys
                && window.currentScene.sys.settings.key === 'BattleScene'
                && window.currentScene.buildings
                && window.currentScene.buildings.length >= 6,
            null,
            { timeout: 20000 }
        );

        deckIds = await page.evaluate(installSimulator);

        const started = Date.now();
        for (const playerId of deckIds) {
            for (const enemyId of deckIds) {
                const results = await page.evaluate(
                    ({ a, b, n, seed }) => window.__balanceSim.runMatchup(a, b, n, seed),
                    { a: playerId, b: enemyId, n: options.runs, seed: options.seed }
                );
                battles.push(...results);
            }
        }
        elapsedMs = Date.now() - started;
    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }

    const summary = aggregate(battles, deckIds);
    const checks = options.check ? runChecks(summary, deckIds, options.runs) : null;
    const simMs = battles.reduce((sum, battle) => sum + battle.wallMs, 0);
    const steps = battles.reduce((sum, battle) => sum + battle.steps, 0);

    if (options.json) {
        const report = {
            meta: {
                runs: options.runs,
                seed: options.seed,
                decks: deckIds,
                battles: battles.length,
                elapsedMs,
                simMs,
                steps,
                problems,
                bands: CHECK_BANDS
            },
            decks: Object.fromEntries(deckIds.map((deckId) => [deckId, serializeStats(summary.decks[deckId])])),
            orderedMatchups: Object.entries(summary.ordered).map(([key, stats]) => {
                const [player, enemy] = key.split('|');
                return { player, enemy, ...serializeStats(stats) };
            }),
            matchups: Object.entries(summary.matchups).map(([key, stats]) => {
                const [first, second] = key.split('|');
                return { first, second, ...serializeStats(stats) };
            }),
            checks
        };
        if (options.detail) report.battles = battles;
        console.log(JSON.stringify(report, null, 2));
    } else {
        printOrderedTable(summary, deckIds);
        printDeckTable(summary, deckIds);
        printMatchupTable(summary);
        printUsage(summary, deckIds);
        console.log(`\n${battles.length} battles in ${(elapsedMs / 1000).toFixed(1)}s ` +
            `(sim ${(simMs / 1000).toFixed(1)}s, ${steps} steps)`);
        if (checks) printChecks(checks);
        if (problems.length) {
            console.log('\nPage problems:');
            problems.forEach((problem) => console.log(`  ${problem}`));
        }
    }

    if (problems.length) process.exitCode = 1;
    if (checks && checks.failures.length) process.exitCode = 1;
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.stack || error.message || String(error));
        process.exitCode = 1;
    });
}

module.exports = {
    startStaticServer,
    loadPlaywright,
    launchBrowser,
    installSimulator,
    aggregate,
    serializeStats,
    winRate,
    scoreRate,
    viewFrom,
    emptyStats,
    addStats
};
