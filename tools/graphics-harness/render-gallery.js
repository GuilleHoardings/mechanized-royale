/**
 * Offline renderer + smoke test for Mechanized Royale's vector (procedural) art.
 *
 * Runs the real GraphicsManager against a small Phaser shim and writes PNG
 * contact sheets to tools/graphics-harness/out/. Use it to review visual changes
 * without booting the game:
 *
 *   node tools/graphics-harness/render-gallery.js          # render sheets
 *   node tools/graphics-harness/render-gallery.js --check  # also print/verify bounds
 *
 * Browser screenshots are not needed, so this works in headless environments.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { loadGame } = require('./load-game');
const { MockScene, renderNode, boundsOf } = require('./phaser-shim');

const OUT_DIR = path.join(__dirname, 'out');
const CHECK = process.argv.includes('--check');

const game = loadGame();
const { GraphicsManager, UNITS, CARDS } = game;

const COLORS = {
    bg: '#141c2b',
    panel: '#1c2740',
    panelBorder: '#2f3d5c',
    text: '#e2e8f0',
    muted: '#8fa3c0',
    grid: 'rgba(255,255,255,0.05)',
    player: '#3b82f6',
    enemy: '#ef4444'
};

const FONT = 'Consolas, "Courier New", monospace';

// ---------------------------------------------------------------------------
// Scene helpers
// ---------------------------------------------------------------------------

function withScene(fn) {
    const scene = new MockScene();
    const gm = new GraphicsManager(scene);
    return fn(gm, scene);
}

function unitNode(unitId, isPlayer) {
    return withScene((gm) => {
        const data = UNITS[unitId];
        const type = data.unitType || data.id;
        return gm.createTankGraphics(0, 0, type, isPlayer, unitId);
    });
}

function towerNode(isPlayer, isMain) {
    return withScene((gm) => gm.createTowerGraphics(0, 0, isPlayer, isMain));
}

function buildingNode(buildingId, isPlayer) {
    return withScene((gm) => gm.createBuildingGraphics(0, 0, buildingId, isPlayer));
}

function cardNode(cardId) {
    return withScene((gm) => gm.createMiniCardGraphics(0, 0, cardId));
}

/** Size of an item's drawn content, ignoring its offset from the origin. */
function contentSize(node) {
    const b = boundsOf(node);
    if (b.minX === Infinity) return { w: 0, h: 0, b: null };
    return { w: b.maxX - b.minX, h: b.maxY - b.minY, b };
}

// ---------------------------------------------------------------------------
// Sheet rendering
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

/**
 * @param {Object} sheet
 * @param {string} sheet.title
 * @param {Array<{label: string, sub?: string, node: Object}>} sheet.items
 * @param {number} sheet.zoom
 * @param {number} sheet.columns
 */
function renderSheet(fileName, { title, subtitle, items, zoom, columns }) {
    const labelBand = 46;
    const pad = 18;

    let maxW = 0;
    let maxH = 0;
    for (const item of items) {
        const { w, h } = contentSize(item.node);
        item._size = { w, h };
        maxW = Math.max(maxW, w);
        maxH = Math.max(maxH, h);
    }

    const cellW = Math.max(150, maxW * zoom + pad * 2);
    const cellH = Math.max(120, maxH * zoom + labelBand + pad * 2);
    const rows = Math.ceil(items.length / columns);
    const headerH = 76;
    const width = Math.ceil(columns * cellW + pad * 2);
    const height = Math.ceil(headerH + rows * cellH + pad);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.fillStyle = COLORS.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(title, pad, 34);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(subtitle || `zoom ${zoom}x  •  ${items.length} items`, pad, 58);

    items.forEach((item, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = pad + col * cellW;
        const y = headerH + row * cellH;

        // Panel
        ctx.fillStyle = COLORS.panel;
        roundRect(ctx, x + 6, y, cellW - 12, cellH - 12, 10);
        ctx.fill();
        ctx.strokeStyle = COLORS.panelBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = COLORS.text;
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillText(item.label, x + 18, y + 24);
        if (item.sub) {
            ctx.fillStyle = COLORS.muted;
            ctx.font = `11px ${FONT}`;
            ctx.fillText(item.sub, x + 18, y + 40);
        }

        // Content, centred on its own bounds
        const { b } = contentSize(item.node);
        const cx = x + cellW / 2 - ((b.minX + b.maxX) / 2) * zoom;
        const cy = y + labelBand + (cellH - labelBand - 12) / 2 - ((b.minY + b.maxY) / 2) * zoom;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(zoom, zoom);
        renderNode(ctx, item.node);
        ctx.restore();
    });

    fs.writeFileSync(path.join(OUT_DIR, fileName), canvas.toBuffer('image/png'));
    console.log(`  ${fileName}  ${width}x${height}`);
    return { width, height };
}

// ---------------------------------------------------------------------------
// Battlefield mock (roughly mirrors BattleScene.addArena / initial layout)
// ---------------------------------------------------------------------------

function renderBattlefield(zoom) {
    const TILE = 20;
    const TILES_X = 18;
    const TILES_Y = 34;
    const worldW = TILES_X * TILE;
    const worldH = TILES_Y * TILE;
    const width = worldW * zoom;
    const height = worldH * zoom;
    const offsetX = 0;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Ground + grid
    const ground = ctx.createLinearGradient(0, 0, 0, height);
    ground.addColorStop(0, '#2b3a27');
    ground.addColorStop(0.47, '#39492f');
    ground.addColorStop(0.53, '#39492f');
    ground.addColorStop(1, '#2b3a27');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= TILES_X; i++) {
        const px = Math.round((offsetX + i * TILE) * zoom) + 0.5;
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke();
    }
    for (let j = 0; j <= TILES_Y; j++) {
        const py = Math.round(j * TILE * zoom) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke();
    }

    // River + bridges
    ctx.fillStyle = 'rgba(56, 122, 168, 0.55)';
    ctx.fillRect(0, 16 * TILE * zoom, width, 2 * TILE * zoom);
    ctx.fillStyle = 'rgba(180, 150, 100, 0.85)';
    for (const tileX of [3, 12]) {
        ctx.fillRect(tileX * TILE * zoom, 16 * TILE * zoom, 3 * TILE * zoom, 2 * TILE * zoom);
    }

    const place = (node, tileX, tileY, rotation = 0) => {
        ctx.save();
        ctx.translate((tileX * TILE + TILE / 2) * zoom, (tileY * TILE + TILE / 2) * zoom);
        ctx.scale(zoom, zoom);
        ctx.rotate(rotation);
        renderNode(ctx, node);
        ctx.restore();
    };

    // Towers (main + two side, both teams)
    place(towerNode(true, true), 8, 30);
    place(towerNode(true, false), 3, 27);
    place(towerNode(true, false), 14, 27);
    place(towerNode(false, true), 8, 3);
    place(towerNode(false, false), 3, 6);
    place(towerNode(false, false), 14, 6);

    // A small engagement near the river
    const facingPlayer = -Math.PI / 2;
    const facingEnemy = Math.PI / 2;
    place(unitNode('tiger', true), 6, 20, facingPlayer);
    place(unitNode('sherman', true), 9, 21, facingPlayer);
    place(unitNode('infantry', true), 12, 21, facingPlayer);
    place(unitNode('panther', false), 7, 17, facingEnemy);
    place(unitNode('jagdpanzer', false), 11, 17, facingEnemy);

    // Air support overhead
    place(unitNode('attack_helicopter', true), 8, 19, facingPlayer);
    place(unitNode('bomber', false), 10, 18, facingEnemy);
    place(unitNode('flak_panzer', true), 5, 22, facingPlayer);

    // Labels
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, width, 30 * zoom * 0.6);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${Math.round(11 * zoom)}px ${FONT}`;
    ctx.fillText(`Vector battlefield @ ${zoom}x  (tile ${TILE}px, real in-game scale)`, 8, 20 * zoom * 0.6);

    fs.writeFileSync(path.join(OUT_DIR, `battlefield-${zoom}x.png`), canvas.toBuffer('image/png'));
    console.log(`  battlefield-${zoom}x.png  ${width}x${height}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log('Rendering vector graphics gallery...');

    const unitIds = ['tiger', 'panther', 'sherman', 'jagdpanzer', 'infantry', 'attack_helicopter', 'bomber', 'flak_panzer'];

    const unitItems = [];
    for (const id of unitIds) {
        unitItems.push({ label: `${UNITS[id].name} (player)`, sub: id, node: unitNode(id, true) });
    }
    for (const id of unitIds) {
        unitItems.push({ label: `${UNITS[id].name} (enemy)`, sub: id, node: unitNode(id, false) });
    }

    renderSheet('units.png', {
        title: 'Units — vector art',
        subtitle: 'unit bodies use per-unit colours • health bars show team • barrels point right',
        items: unitItems,
        zoom: 6,
        columns: 4
    });

    renderSheet('towers.png', {
        title: 'Towers — vector art',
        subtitle: 'base + independently rotating turret, aimed at the enemy',
        items: [
            { label: 'King Tower (player)', sub: 'tower_main', node: towerNode(true, true) },
            { label: 'Princess Tower (player)', sub: 'tower_side', node: towerNode(true, false) },
            { label: 'King Tower (enemy)', sub: 'tower_main', node: towerNode(false, true) },
            { label: 'Princess Tower (enemy)', sub: 'tower_side', node: towerNode(false, false) }
        ],
        zoom: 5,
        columns: 4
    });

    renderSheet('buildings.png', {
        title: 'Buildings — vector art',
        items: [
            { label: 'V1 Launcher (player)', sub: 'v1_launcher', node: buildingNode('v1_launcher', true) },
            { label: 'V1 Launcher (enemy)', sub: 'v1_launcher', node: buildingNode('v1_launcher', false) }
        ],
        zoom: 7,
        columns: 2
    });

    renderSheet('cards.png', {
        title: 'Card icons — vector art',
        subtitle: 'normalised to a 64x48 icon box (troops rotate to portrait in the hand)',
        items: Object.keys(CARDS).map((id) => ({
            label: CARDS[id].name,
            sub: `${id} • ${CARDS[id].type} • ${CARDS[id].cost} elixir`,
            node: cardNode(id)
        })),
        zoom: 5,
        columns: 4
    });

    renderBattlefield(1);
    renderBattlefield(2);

    if (CHECK) {
        runChecks();
    }

    console.log(`\nDone. PNGs in ${OUT_DIR}`);
}

function runChecks() {
    console.log('\nBounds check (drawn content, in game pixels):');
    const rows = [];

    const record = (kind, id, node, min, max) => {
        const { w, h, b } = contentSize(node);
        const ok = b && w >= min && h >= min && w <= max.w && h <= max.h;
        rows.push({ kind, id, w: w.toFixed(1), h: h.toFixed(1), ok });
    };

    for (const id of ['tiger', 'panther', 'sherman', 'jagdpanzer', 'infantry', 'attack_helicopter', 'bomber', 'flak_panzer']) {
        record('unit', id, unitNode(id, true), 8, { w: 80, h: 60 });
    }
    record('tower', 'main', towerNode(true, true), 60, { w: 120, h: 140 });
    record('tower', 'side', towerNode(true, false), 40, { w: 80, h: 100 });
    record('building', 'v1_launcher', buildingNode('v1_launcher', true), 30, { w: 80, h: 80 });
    for (const id of Object.keys(CARDS)) {
        record('card', id, cardNode(id), 25, { w: 70, h: 70 });
    }

    for (const r of rows) {
        const status = r.ok ? 'ok  ' : 'FAIL';
        console.log(`  ${status} ${r.kind.padEnd(9)} ${r.id.padEnd(18)} ${r.w.padStart(6)} x ${r.h.padStart(6)}`);
    }

    console.log('\nCard icon centring (art centre should be near 0,0 for a tidy icon):');
    let centringFailures = 0;
    for (const id of Object.keys(CARDS)) {
        const b = contentSize(cardNode(id)).b;
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        const ok = Math.abs(cx) <= 1.5 && Math.abs(cy) <= 1.5;
        if (!ok) centringFailures++;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(18)} centre (${cx.toFixed(1)}, ${cy.toFixed(1)})`);
    }

    // --- Deck rules -------------------------------------------------------
    console.log('\nDeck check (rules live in src/utils/helpers.js):');
    const deckSize = game.DECK_CONFIG.SIZE;
    let deckFailures = 0;

    const checkDeck = (label, deck) => {
        const unique = new Set(deck).size === deck.length;
        const known = deck.every((id) => !!CARDS[id]);
        const ok = deck.length === deckSize && unique && known;
        if (!ok) deckFailures++;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(24)} ${deck.length} cards, unique=${unique}, known=${known}`);
    };

    checkDeck('default deck', game.GameHelpers.getDefaultDeck());
    checkDeck('DEFAULT_PLAYER_DECK', game.GameHelpers.sanitizeDeck(game.DEFAULT_PLAYER_DECK));
    checkDeck('legacy player.tanks', game.GameHelpers.sanitizeDeck([
        'infantry', 'panther', 'sherman', 'jagdpanzer',
        'tiger', 'infantry', 'panther', 'sherman'
    ]));
    checkDeck('unknown/missing ids', game.GameHelpers.sanitizeDeck(['not_a_card', null, 'tiger']));
    checkDeck('overlong input', game.GameHelpers.sanitizeDeck(
        Object.keys(CARDS).concat(Object.keys(CARDS))
    ));

    const once = game.GameHelpers.getDefaultDeck();
    const idempotent = game.GameHelpers.sanitizeDeck(once).join(',') === once.join(',');
    if (!idempotent) deckFailures++;
    console.log(`  ${idempotent ? 'ok  ' : 'FAIL'} sanitizeDeck is idempotent`);

    // --- Air rules --------------------------------------------------------
    console.log('\nAir targeting check (rules live in src/utils/helpers.js):');
    const canTarget = game.GameHelpers.canTarget;
    const airChecks = [
        ['tank -> aircraft', canTarget(UNITS.tiger, UNITS.attack_helicopter), false],
        ['tank -> tank', canTarget(UNITS.tiger, UNITS.panther), true],
        ['helicopter -> tank', canTarget(UNITS.attack_helicopter, UNITS.tiger), true],
        ['helicopter -> aircraft', canTarget(UNITS.attack_helicopter, UNITS.bomber), true],
        ['bomber -> tank', canTarget(UNITS.bomber, UNITS.tiger), true],
        ['bomber -> aircraft', canTarget(UNITS.bomber, UNITS.attack_helicopter), false],
        ['wirbelwind -> aircraft', canTarget(UNITS.flak_panzer, UNITS.bomber), true],
        ['wirbelwind -> tank', canTarget(UNITS.flak_panzer, UNITS.tiger), false],
        ['tower -> aircraft', canTarget({ canTargetAir: true }, UNITS.bomber), true]
    ];
    let airFailures = 0;
    for (const [label, actual, expected] of airChecks) {
        const ok = actual === expected;
        if (!ok) airFailures++;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(24)} ${actual}`);
    }

    // --- Unit lifetime ----------------------------------------------------
    console.log('\nUnit lifetime check (rules live in src/utils/helpers.js):');
    const decay = game.GameHelpers.healthDecayPerMs;
    const wirbelwind = UNITS.flak_panzer;
    const lifetimeChecks = [
        ['wirbelwind has a lifetime', wirbelwind.lifetimeMs > 0, true],
        ['lifetime drains full HP', Math.round(decay(wirbelwind) * wirbelwind.lifetimeMs), wirbelwind.stats.hp],
        ['normal tank has no decay', decay(UNITS.tiger), 0]
    ];
    let lifetimeFailures = 0;
    for (const [label, actual, expected] of lifetimeChecks) {
        const ok = actual === expected;
        if (!ok) lifetimeFailures++;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(24)} ${actual}`);
    }

    const failed = rows.filter((r) => !r.ok);
    if (failed.length || centringFailures || deckFailures || airFailures || lifetimeFailures) {
        console.error(`\n${failed.length} item(s) outside expected bounds, ${centringFailures} icon(s) off-centre, ${deckFailures} deck check(s) failed, ${airFailures} air check(s) failed, ${lifetimeFailures} lifetime check(s) failed.`);
        process.exitCode = 1;
    } else {
        console.log(`\nAll ${rows.length} items within expected bounds; all icons centred; deck, air rules and lifetimes valid.`);
    }
}

main();
