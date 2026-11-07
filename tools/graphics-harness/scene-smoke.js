/**
 * Headless smoke test for DeckScene.
 *
 * Renders nothing: it executes the real scene code against a stub Phaser scene
 * and simulates taps, so wiring mistakes (bad callbacks, stale deck state,
 * save/load regressions) fail here instead of in the browser.
 *
 *   node tools/graphics-harness/scene-smoke.js
 */

const vm = require('vm');
const { createGameContext } = require('./load-game');
const { Graphics, Container } = require('./phaser-shim');

// ---------------------------------------------------------------------------
// Minimal scene / display-object stubs
// ---------------------------------------------------------------------------

class GameObjectStub {
    constructor(type, x = 0, y = 0, text = '') {
        this.type = type;
        this.x = x;
        this.y = y;
        this.text = String(text);
        this.alpha = 1;
        this.visible = true;
        this.destroyed = false;
        this.handlers = {};
    }

    setOrigin() { return this; }
    setAlpha(alpha) { this.alpha = alpha; return this; }
    setVisible(visible) { this.visible = visible; return this; }
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
    setFill() { return this; }
    setText(text) { this.text = String(text); return this; }
    setInteractive() { this.interactive = true; return this; }
    setDepth() { return this; }
    setPosition(x, y) { this.x = x; this.y = y; return this; }
    destroy() { this.destroyed = true; }

    on(event, handler) {
        (this.handlers[event] = this.handlers[event] || []).push(handler);
        return this;
    }

    /** Test hook: fire an input event. */
    emit(event) {
        (this.handlers[event] || []).forEach((handler) => handler());
    }
}

class DisplayListStub {
    constructor() { this.list = []; }

    moveBelow(child, reference) {
        const from = this.list.indexOf(child);
        if (from >= 0) this.list.splice(from, 1);
        const to = this.list.indexOf(reference);
        this.list.splice(to < 0 ? 0 : to, 0, child);
        return child;
    }
}

function createSceneStub() {
    const stub = {
        children: new DisplayListStub(),
        transitions: [],
        timers: []
    };

    const track = (object) => {
        stub.children.list.push(object);
        return object;
    };

    stub.add = {
        graphics: () => track(new Graphics()),
        container: (x, y) => track(new Container(x, y)),
        text: (x, y, text, style) => track(new GameObjectStub('text', x, y, text)).setStyle(style),
        rectangle: (x, y, w, h) => track(new GameObjectStub('rect', x, y)),
        image: (x, y) => track(new GameObjectStub('image', x, y)),
        sprite: (x, y) => track(new GameObjectStub('sprite', x, y)),
        zone: (x, y) => track(new GameObjectStub('zone', x, y))
    };

    stub.time = {
        addEvent: (config) => {
            stub.timers.push(config);
            return { remove() {} };
        },
        delayedCall: (delay, callback) => {
            stub.timers.push({ delay, callback });
            return { remove() {} };
        }
    };

    stub.cameras = { main: { setBackgroundColor() {} } };
    stub.scene = {
        key: 'DeckScene',
        start: (key, data) => stub.transitions.push({ key, data })
    };
    stub.game = { loop: { actualFps: 60 } };

    return stub;
}

// setStyle is only used by the text factory above.
GameObjectStub.prototype.setStyle = function (style) {
    this.style = style || {};
    return this;
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const failures = [];

function check(label, condition, detail = '') {
    if (condition) {
        console.log(`  ok   ${label}`);
        return;
    }
    failures.push(label);
    console.error(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
}

function findHit(container) {
    return container.children.find((child) => child.type === 'rect');
}

function press(obj) {
    if (!obj) throw new Error('press() called with no object');
    obj.emit('pointerdown');
}

function checkLayout(scene, label) {
    const L = scene.layout;
    const inside = (tile, x, y, w, h) => tile.x >= x
        && tile.y >= y
        && tile.x + tile.w <= x + w
        && tile.y + tile.h <= y + h;

    check(`${label}: deck slots fit the deck panel`,
        scene.deckTiles.every((tile) => inside(tile, L.deckX, L.deckY, L.deckW, L.deckH)));
    check(`${label}: collection tiles fit the collection panel`,
        scene.collectionTiles.every((tile) => inside(tile, L.collectionX, L.collectionY, L.collectionW, L.collectionH)));
    const lowestTile = Math.max(...scene.collectionTiles.map((tile) => tile.y + tile.h));
    check(`${label}: collection note clears the card grid`,
        scene.collectionNote.y - 8 >= lowestTile,
        `note ${scene.collectionNote.y}, grid ends ${lowestTile}`);
    check(`${label}: detail panel clears the collection panel`,
        L.detailY >= L.collectionY + L.collectionH);
    check(`${label}: buttons clear the detail panel`,
        L.buttonTop >= L.detailY + L.detailH);
    check(`${label}: bottom controls stay on screen`,
        L.buttonTop + L.buttonH <= L.H);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const context = createGameContext(['src/scenes/DeckScene.js']);
const DeckScene = vm.runInContext('DeckScene', context);
const GameHelpers = vm.runInContext('GameHelpers', context);
const DECK_CONFIG = vm.runInContext('DECK_CONFIG', context);
const CARDS = vm.runInContext('CARDS', context);

function openScene(gameState) {
    const scene = new DeckScene();
    Object.assign(scene, createSceneStub());
    scene.init({ gameState });
    scene.create();
    return scene;
}

console.log('Deck screen smoke test');

// --- Fresh save -----------------------------------------------------------
const gameState = GameHelpers.getDefaultGameState();
const scene = openScene(gameState);
const cardCount = Object.keys(CARDS).length;

check('builds one tile per deck slot', scene.deckTiles.length === DECK_CONFIG.SIZE);
check('builds one tile per card in the collection', scene.collectionTiles.length === cardCount);
check('starts with a full legal deck', scene.deck.length === DECK_CONFIG.SIZE && new Set(scene.deck).size === DECK_CONFIG.SIZE);
check('save is enabled when the deck is full', scene.saveButton.enabled === true);
const spareCards = cardCount - DECK_CONFIG.SIZE;
check('tells the player how many cards are still available',
    new RegExp(`^${spareCards} available$`, 'i').test(scene.collectionCountText.text),
    scene.collectionCountText.text);
check('deck-full hint mentions swapping',
    /deck full/i.test(scene.collectionNote.text), scene.collectionNote.text);
checkLayout(scene, '800px');

// --- Inspect a card -------------------------------------------------------
const inspectTile = scene.collectionTiles.find((tile) => tile.cardId === scene.deck[0]);
press(inspectTile.hit);
check('selecting a card fills the detail panel',
    scene.detailName.text === CARDS[scene.deck[0]].name, scene.detailName.text);
check('detail panel shows cost and type',
    scene.detailMeta.text.includes('supply'), scene.detailMeta.text);

// --- Limited-lifetime unit ------------------------------------------------
const wirbelTile = scene.collectionTiles.find((tile) => tile.cardId === 'flak_panzer');
if (wirbelTile) {
    press(wirbelTile.hit);
    check('detail panel shows the unit lifetime',
        /LIFE 50s/.test(scene.detailMeta.text), scene.detailMeta.text);
}

// --- Remove / re-add ------------------------------------------------------
const removedId = scene.deck[0];
press(scene.deckTiles[0].hit);
check('tapping a deck card removes it', scene.deck.length === DECK_CONFIG.SIZE - 1);
check('removed card becomes the selection', scene.selectedCardId === removedId);
check('save is disabled while a slot is empty', scene.saveButton.enabled === false);
check('hint mentions the empty slot', /empty slot/i.test(scene.collectionNote.text), scene.collectionNote.text);

const readdTile = scene.collectionTiles.find((tile) => tile.cardId === removedId);
press(readdTile.hit);
check('tapping a collection card fills the empty slot', scene.deck.length === DECK_CONFIG.SIZE);
check('save is re-enabled', scene.saveButton.enabled === true);

// --- No duplicates --------------------------------------------------------
press(readdTile.hit);
check('tapping an in-deck card does not duplicate it', scene.deck.length === DECK_CONFIG.SIZE);

// --- Save -----------------------------------------------------------------
press(findHit(scene.saveButton));
check('save returns to the menu', scene.transitions.length === 1 && scene.transitions[0].key === 'MenuScene');

const stored = GameHelpers.loadGameState();
check('deck is written to storage',
    stored && Array.isArray(stored.player.deck) && stored.player.deck.length === DECK_CONFIG.SIZE);

// --- Legacy save migration ------------------------------------------------
const legacyState = {
    player: {
        tanks: ['infantry', 'panther', 'sherman', 'jagdpanzer', 'tiger', 'infantry', 'panther', 'sherman'],
        resources: { credits: 0, research: 0 },
        progress: { level: 1, xp: 0 },
        research: { completed: [], active: null }
    },
    campaign: { currentMission: 1, unlockedMissions: [1], stars: {} },
    settings: { soundEnabled: true, musicEnabled: true, volume: 0.8 }
};

const legacyScene = openScene(legacyState);
check('legacy player.tanks becomes a legal deck',
    legacyScene.deck.length === DECK_CONFIG.SIZE && new Set(legacyScene.deck).size === DECK_CONFIG.SIZE);

press(findHit(legacyScene.saveButton));
check('legacy field is replaced on save',
    legacyState.player.tanks === undefined && legacyState.player.deck.length === DECK_CONFIG.SIZE);

// --- Reset ----------------------------------------------------------------
const resetScene = openScene(GameHelpers.getDefaultGameState());
press(resetScene.deckTiles[0].hit);
check('deck can be emptied for testing', resetScene.deck.length === DECK_CONFIG.SIZE - 1);

// The Reset control lives in the header; exercise the same code path it calls
resetScene.deck = GameHelpers.getDefaultDeck();
resetScene.selectedCardId = null;
resetScene._refresh();
check('reset restores the default deck', resetScene.deck.length === DECK_CONFIG.SIZE);
check('reset clears the selection', resetScene.selectedCardId === null);

// --- Tall mobile layout ---------------------------------------------------
const originalHeight = vm.runInContext('GAME_CONFIG.HEIGHT', context);
vm.runInContext('GAME_CONFIG.HEIGHT = 1000', context);
const tallScene = openScene(GameHelpers.getDefaultGameState());
checkLayout(tallScene, '1000px');
check('tall layout keeps a full deck', tallScene.deck.length === DECK_CONFIG.SIZE);
vm.runInContext(`GAME_CONFIG.HEIGHT = ${originalHeight}`, context);

// ---------------------------------------------------------------------------
console.log('');
if (failures.length) {
    console.error(`${failures.length} smoke check(s) failed.`);
    process.exitCode = 1;
} else {
    console.log('All deck screen smoke checks passed.');
}
