/**
 * DeckScene - review and edit the 8-card battle deck.
 *
 * Cards come from CARDS, so adding a card to entities.js makes it appear here
 * automatically (and can then be swapped into the deck). The deck is saved to
 * gameState.player.deck and read by BattleScene in init().
 */
class DeckScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DeckScene' });
    }

    init(data) {
        this.gameState = (data && data.gameState)
            || GameHelpers.loadGameState()
            || GameHelpers.getDefaultGameState();
        this.deck = GameHelpers.getPlayerDeck(this.gameState);
        this.selectedCardId = null;
        this.useGraphicsMode = true;
    }

    create() {
        // Make this scene accessible to HTML buttons
        window.currentScene = this;
        if (window.refreshSpeedButtonState) window.refreshSpeedButtonState();
        if (window.refreshPauseButtonState) window.refreshPauseButtonState();

        this.cameras.main.setBackgroundColor('#0f172a');
        this.graphicsManager = new GraphicsManager(this);

        this._computeLayout();
        this._createBackground();
        this._createHeader();
        this._createPanels();
        this._createDeckSlots();
        this._createCollectionTiles();
        this._createDetailPanel();
        this._createButtons();
        this._refresh();

        this.initializeDebugPanel();
    }

    // ------------------------------------------------------------------
    // Layout
    // ------------------------------------------------------------------

    _computeLayout() {
        const W = GAME_CONFIG.WIDTH;
        const H = GAME_CONFIG.HEIGHT;

        const deckY = 84;
        const deckH = 208;
        const collectionY = deckY + deckH + 10;
        const detailH = 100;
        const detailY = H - 186;
        const buttonTop = H - 78;

        this.layout = {
            W, H,
            deckX: 24, deckY, deckW: W - 48, deckH,
            collectionX: 24, collectionY, collectionW: W - 48,
            collectionH: detailY - 10 - collectionY,
            detailX: 24, detailY, detailW: W - 48, detailH,
            buttonTop, buttonH: 44
        };
    }

    _createBackground() {
        const { W, H } = this.layout;
        const particles = this.add.graphics();
        particles.setAlpha(0.28);

        for (let i = 0; i < 18; i++) {
            particles.fillStyle(0x60a5fa, Math.random() * 0.3 + 0.08);
            particles.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 2.5 + 1);
        }

        const lines = this.add.graphics();
        lines.lineStyle(1, 0x3d5a80, 0.16);
        for (let i = 0; i < 4; i++) {
            const y = 110 + i * 180;
            lines.lineBetween(0, y, W, y + 40);
        }
    }

    // ------------------------------------------------------------------
    // Chrome
    // ------------------------------------------------------------------

    _createHeader() {
        const { W } = this.layout;

        this.add.text(W / 2, 32, 'BATTLE DECK', {
            fontSize: '30px',
            fill: '#f1f5f9',
            fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
            letterSpacing: 3,
            stroke: '#8b5cf6',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.headerSubtitle = this.add.text(W / 2, 58, '', {
            fontSize: '11px',
            fill: '#94a3b8',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this._createSmallButton(8, 8, 74, 26, '← Menu', () => {
            this.scene.start('MenuScene', { gameState: this.gameState });
        });

        this._createSmallButton(W - 84, 8, 76, 26, '↺ Reset', () => {
            this.deck = GameHelpers.getDefaultDeck();
            this.selectedCardId = null;
            this._refresh();
        });
    }

    _createSmallButton(x, y, w, h, label, onClick) {
        const bg = this.add.graphics();
        bg.fillStyle(0x1e293b, 0.9);
        bg.fillRoundedRect(x, y, w, h, 5);
        bg.lineStyle(1, 0x3d5a80, 0.5);
        bg.strokeRoundedRect(x, y, w, h, 5);

        const text = this.add.text(x + w / 2, y + h / 2, label, {
            fontSize: '11px',
            fill: '#e2e8f0',
            fontFamily: 'Arial',
            fontWeight: '600'
        }).setOrigin(0.5);

        const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.01);

        hit.on('pointerover', () => text.setFill('#60a5fa'));
        hit.on('pointerout', () => text.setFill('#e2e8f0'));
        hit.on('pointerdown', onClick);
    }

    _createPanels() {
        const L = this.layout;

        this._drawPanel(L.deckX, L.deckY, L.deckW, L.deckH);
        this._drawPanel(L.collectionX, L.collectionY, L.collectionW, L.collectionH);

        this.add.text(L.deckX + 16, L.deckY + 14, 'YOUR DECK', {
            fontSize: '13px',
            fill: '#e2e8f0',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            letterSpacing: 1
        });

        this.deckCountText = this.add.text(L.deckX + L.deckW - 16, L.deckY + 15, '', {
            fontSize: '12px',
            fill: '#94a3b8',
            fontFamily: 'Arial'
        }).setOrigin(1, 0);

        this.add.text(L.collectionX + 16, L.collectionY + 14, 'COLLECTION', {
            fontSize: '13px',
            fill: '#e2e8f0',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            letterSpacing: 1
        });

        this.collectionCountText = this.add.text(L.collectionX + L.collectionW - 16, L.collectionY + 15, '', {
            fontSize: '12px',
            fill: '#94a3b8',
            fontFamily: 'Arial'
        }).setOrigin(1, 0);

        this.collectionNote = this.add.text(
            L.collectionX + L.collectionW / 2,
            L.collectionY + L.collectionH - 18,
            '',
            {
                fontSize: '11px',
                fill: '#94a3b8',
                fontFamily: 'Arial',
                align: 'center',
                wordWrap: { width: L.collectionW - 40 }
            }
        ).setOrigin(0.5);
    }

    _drawPanel(x, y, w, h) {
        const g = this.add.graphics();
        g.fillStyle(0x16233a, 0.92);
        g.fillRoundedRect(x, y, w, h, 12);
        g.lineStyle(1, 0x3d5a80, 0.55);
        g.strokeRoundedRect(x, y, w, h, 12);
        return g;
    }

    // ------------------------------------------------------------------
    // Cards
    // ------------------------------------------------------------------

    _createDeckSlots() {
        const L = this.layout;
        const cols = 4;
        const w = 92;
        const h = 76;
        const gapX = 12;
        const gapY = 10;
        const gridW = cols * w + (cols - 1) * gapX;
        const startX = (L.W - gridW) / 2;
        const startY = L.deckY + 36;

        this.deckTiles = [];
        for (let i = 0; i < DECK_CONFIG.SIZE; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const tile = this._createTile({
                x: startX + col * (w + gapX),
                y: startY + row * (h + gapY),
                w, h,
                kind: 'deck',
                artScale: 1.05,
                nameSize: 10
            });

            tile.hit.on('pointerdown', () => this._onDeckTilePressed(i));
            this.deckTiles.push(tile);
        }
    }

    _createCollectionTiles() {
        const L = this.layout;
        const ids = Object.keys(CARDS);
        const cols = 4;
        const w = 84;
        const h = 70;
        const gapX = 12;
        const gapY = 12;
        const rows = Math.ceil(ids.length / cols);
        const gridW = cols * w + (cols - 1) * gapX;
        const gridH = rows * h + (rows - 1) * gapY;
        const startX = (L.W - gridW) / 2;
        const contentTop = L.collectionY + 42;
        const availableH = (L.collectionY + L.collectionH - 14) - contentTop;
        const startY = contentTop + Math.max(0, (availableH - gridH) / 2);

        this.collectionTiles = [];
        ids.forEach((cardId, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const tile = this._createTile({
                x: startX + col * (w + gapX),
                y: startY + row * (h + gapY),
                w, h,
                kind: 'collection',
                artScale: 0.9,
                nameSize: 9
            });

            this._setTileCard(tile, cardId);
            tile.hit.on('pointerdown', () => this._onCollectionTilePressed(cardId));
            this.collectionTiles.push(tile);
        });
    }

    _createTile({ x, y, w, h, kind, artScale, nameSize }) {
        const tile = { x, y, w, h, kind, artScale, cardId: null, art: null };

        tile.bg = this.add.graphics();

        tile.hit = this.add.rectangle(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.01);

        tile.cost = this.add.text(x + w - 6, y + 5, '', {
            fontSize: `${Math.round(nameSize + 3)}px`,
            fill: '#fbbf24',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#1a1a2e',
            strokeThickness: 2
        }).setOrigin(1, 0);

        tile.name = this.add.text(x + w / 2, y + h - 9, '', {
            fontSize: `${nameSize}px`,
            fill: '#e2e8f0',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        tile.check = this.add.text(x + 9, y + 9, '✓', {
            fontSize: '11px',
            fill: '#4ade80',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        return tile;
    }

    /** Swaps the art on a tile. The hitbox is left alone so input stays stable. */
    _setTileCard(tile, cardId) {
        if (tile._initialised && tile.cardId === cardId) return;

        tile.cardId = cardId;
        tile._initialised = true;

        if (tile.art) {
            tile.art.destroy();
            tile.art = null;
        }

        tile.cost.setText(cardId ? String(CARDS[cardId].cost) : '');
        tile.name.setText(cardId ? CARDS[cardId].name : 'Empty');
        tile.name.setFill(cardId ? '#e2e8f0' : '#64748b');

        if (!cardId) return;

        const art = this.graphicsManager.createMiniCardGraphics(
            tile.x + tile.w / 2,
            tile.y + tile.h * 0.45,
            cardId
        );
        art.setScale(tile.artScale);

        // Troops face up, matching the battle hand
        if (CARDS[cardId].type === CARD_TYPES.TROOP) {
            art.setRotation(-Math.PI / 2);
        }

        // Keep the artwork under the cost/name labels
        this.children.moveBelow(art, tile.cost);
        tile.art = art;
    }

    _paintTile(tile, { selected = false, inDeck = false } = {}) {
        const { bg, x, y, w, h } = tile;
        const empty = !tile.cardId;
        const available = tile.kind === 'collection' && !inDeck;

        bg.clear();
        bg.fillStyle(empty ? 0x111c30 : 0x1e3a5f, empty ? 0.7 : 0.95);
        bg.fillRoundedRect(x, y, w, h, 9);

        if (selected) {
            bg.lineStyle(3, 0xfbbf24, 1);
        } else if (available) {
            bg.lineStyle(1.5, 0x60a5fa, 0.8);
        } else if (tile.kind === 'collection') {
            bg.lineStyle(1.5, 0x4ade80, 0.75);
        } else {
            bg.lineStyle(1, 0x3d5a80, empty ? 0.4 : 0.75);
        }
        bg.strokeRoundedRect(x, y, w, h, 9);

        if (tile.art) {
            tile.art.setAlpha(tile.kind === 'collection' && !available && !selected ? 0.45 : 1);
        }
        tile.check.setVisible(tile.kind === 'collection' && inDeck);
        tile.cost.setAlpha(tile.kind === 'collection' && inDeck ? 0.6 : 1);
    }

    // ------------------------------------------------------------------
    // Detail panel and buttons
    // ------------------------------------------------------------------

    _createDetailPanel() {
        const L = this.layout;
        this._drawPanel(L.detailX, L.detailY, L.detailW, L.detailH);

        this.detailName = this.add.text(L.detailX + 16, L.detailY + 12, '', {
            fontSize: '17px',
            fill: '#f1f5f9',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        });

        this.detailMeta = this.add.text(L.detailX + 16, L.detailY + 36, '', {
            fontSize: '11px',
            fill: '#93c5fd',
            fontFamily: 'Arial'
        });

        this.detailDesc = this.add.text(L.detailX + 16, L.detailY + 56, '', {
            fontSize: '11px',
            fill: '#cbd5e1',
            fontFamily: 'Arial',
            wordWrap: { width: L.detailW - 32 },
            lineSpacing: 2
        });
    }

    _createButtons() {
        const L = this.layout;

        this.backButton = this._createButton({
            x: 115,
            y: L.buttonTop,
            w: 150,
            h: L.buttonH,
            label: 'BACK',
            onClick: () => this.scene.start('MenuScene', { gameState: this.gameState })
        });

        this.saveButton = this._createButton({
            x: 285,
            y: L.buttonTop,
            w: 200,
            h: L.buttonH,
            label: 'SAVE DECK',
            primary: true,
            onClick: () => this._saveAndExit()
        });
    }

    _createButton({ x, y, w, h, label, primary = false, onClick }) {
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(primary ? 0x7c3aed : 0x1e293b, primary ? 1 : 0.9);
        bg.fillRoundedRect(0, 0, w, h, 10);
        bg.lineStyle(2, primary ? 0xa78bfa : 0x3d5a80, primary ? 0.9 : 0.5);
        bg.strokeRoundedRect(0, 0, w, h, 10);

        if (primary) {
            bg.fillStyle(0xffffff, 0.08);
            bg.fillRoundedRect(3, 3, w - 6, h / 2 - 4, 8);
        }

        const text = this.add.text(w / 2, h / 2, label, {
            fontSize: '15px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        const hit = this.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 0.001)
            .setInteractive({ useHandCursor: true });

        container.add([bg, text, hit]);
        container.enabled = true;

        hit.on('pointerover', () => {
            if (container.enabled) container.setScale(1.02);
        });
        hit.on('pointerout', () => container.setScale(1));
        hit.on('pointerdown', () => {
            if (!container.enabled) return;
            onClick();
        });

        return container;
    }

    // ------------------------------------------------------------------
    // State changes
    // ------------------------------------------------------------------

    _onDeckTilePressed(index) {
        const cardId = this.deck[index];
        if (!cardId) return;

        this.deck.splice(index, 1);
        this.selectedCardId = cardId;
        this._refresh();
    }

    _onCollectionTilePressed(cardId) {
        this.selectedCardId = cardId;

        if (!this.deck.includes(cardId) && this.deck.length < DECK_CONFIG.SIZE) {
            this.deck.push(cardId);
        }

        this._refresh();
    }

    _saveAndExit() {
        if (this.deck.length !== DECK_CONFIG.SIZE) return;

        GameHelpers.saveDeck(this.gameState, this.deck);
        this.scene.start('MenuScene', { gameState: this.gameState });
    }

    // ------------------------------------------------------------------
    // Refresh
    // ------------------------------------------------------------------

    _refresh() {
        const inDeck = new Set(this.deck);

        this.deckTiles.forEach((tile, index) => {
            const cardId = this.deck[index] || null;
            this._setTileCard(tile, cardId);
            this._paintTile(tile, {
                selected: !!cardId && cardId === this.selectedCardId,
                inDeck: true
            });
        });

        this.collectionTiles.forEach((tile) => {
            this._paintTile(tile, {
                selected: tile.cardId === this.selectedCardId,
                inDeck: inDeck.has(tile.cardId)
            });
        });

        this.deckCountText.setText(`${this.deck.length}/${DECK_CONFIG.SIZE} cards`);

        const available = Object.keys(CARDS).filter((id) => !inDeck.has(id)).length;
        this.collectionCountText.setText(`${available} available`);

        if (this.deck.length < DECK_CONFIG.SIZE) {
            const missing = DECK_CONFIG.SIZE - this.deck.length;
            this.collectionNote.setText(`${missing} empty slot${missing === 1 ? '' : 's'} - tap a card below to add it`);
        } else if (available > 0) {
            this.collectionNote.setText('Deck full - tap a deck card to free a slot, then pick a replacement');
        } else {
            this.collectionNote.setText('Every collected card is already in your deck');
        }

        this._refreshDetail();
        this._refreshSaveButton();
        this._refreshHeaderSubtitle();
    }

    _refreshDetail() {
        const def = this.selectedCardId ? CARDS[this.selectedCardId] : null;

        if (!def) {
            this.detailName.setText('Select a card');
            this.detailMeta.setText(`${this.deck.length} of ${DECK_CONFIG.SIZE} slots filled`);
            this.detailDesc.setText('Tap any card to see its stats.');
            return;
        }

        this.detailName.setText(def.name);
        this.detailMeta.setText(this._cardMeta(def));
        this.detailDesc.setText(this._describeCard(def));
    }

    _refreshHeaderSubtitle() {
        const stored = GameHelpers.getPlayerDeck(this.gameState).join(',');
        const dirty = stored !== this.deck.join(',');

        this.headerSubtitle.setText(
            dirty
                ? 'Unsaved deck changes - press SAVE DECK to keep them'
                : 'Tap a card to inspect it - tap a deck card to remove it'
        );
        this.headerSubtitle.setFill(dirty ? '#fbbf24' : '#94a3b8');
    }

    _refreshSaveButton() {
        const ready = this.deck.length === DECK_CONFIG.SIZE;
        this.saveButton.enabled = ready;
        this.saveButton.setAlpha(ready ? 1 : 0.4);
    }

    _cardMeta(def) {
        const bits = [def.type.toUpperCase(), `${def.cost} elixir`];
        const unitId = def.unitId || (def.payload && def.payload.unitId);
        const unit = unitId ? UNITS[unitId] : null;

        if (unit && unit.stats) {
            bits.push(`HP ${unit.stats.hp}`);
            bits.push(`DMG ${unit.stats.damage}`);
            if (unit.stats.range) bits.push(`RNG ${unit.stats.range}`);
            if (unit.stats.speed) bits.push(`SPD ${unit.stats.speed}`);
        }

        if (def.payload && def.payload.count) {
            bits.push(`x${def.payload.count}`);
        }

        return bits.join('  ·  ');
    }

    _describeCard(def) {
        if (def.description) return def.description;

        const payload = def.payload;
        if (def.type === CARD_TYPES.SPELL && payload) {
            const bits = [];
            if (payload.damage) bits.push(`${payload.damage} damage`);
            if (payload.radius) bits.push(`${payload.radius} radius`);
            if (payload.stunMs) bits.push(`${payload.stunMs}ms stun`);
            if (payload.knockback) bits.push(`${payload.knockback} knockback`);
            if (bits.length) return `Spell effect: ${bits.join(' · ')}`;
        }

        return 'No description available.';
    }

    // ------------------------------------------------------------------
    // Debug panel (matches the other scenes)
    // ------------------------------------------------------------------

    initializeDebugPanel() {
        this.time.addEvent({
            delay: 500,
            callback: this.updateDebugPanel,
            callbackScope: this,
            loop: true
        });
    }

    updateDebugPanel() {
        if (!window.debugPanel) return;

        try {
            window.debugPanel.updateValue('debug-scene', this.scene.key);
            window.debugPanel.updateValue('debug-time', '-');
            window.debugPanel.updateValue('debug-paused', 'Deck');

            window.debugPanel.updateValue('debug-player-energy', '-');
            window.debugPanel.updateValue('debug-player-tanks', this.deck.length);
            window.debugPanel.updateValue('debug-player-hand', this.deck
                .map((id) => (CARDS[id] ? CARDS[id].name : id))
                .join(', ') || '-');

            window.debugPanel.updateValue('debug-ai-energy', '-');
            window.debugPanel.updateValue('debug-ai-tanks', '-');
            window.debugPanel.updateValue('debug-ai-strategy', '-');
            window.debugPanel.updateValue('debug-ai-rush', '-');

            window.debugPanel.updateValue('debug-total-tanks', '-');
            window.debugPanel.updateValue('debug-projectiles', '-');
            window.debugPanel.updateValue('debug-buildings', '-');

            window.debugPanel.updateValue('debug-fps', this.game.loop.actualFps.toFixed(1));
            window.debugPanel.updateValue('debug-objects', this.children.list.length);

            if (performance.memory) {
                const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
                window.debugPanel.updateValue('debug-memory', `${memoryMB} MB`);
            } else {
                window.debugPanel.updateValue('debug-memory', 'N/A');
            }

            window.debugPanel.updateValue('debug-player-towers', '-');
            window.debugPanel.updateValue('debug-ai-towers', '-');
            window.debugPanel.updateValue('debug-player-expanded', '-');
            window.debugPanel.updateValue('debug-ai-expanded', '-');
            window.debugPanel.updateValue('debug-speed', '-');
        } catch (error) {
            console.warn('Debug panel update error in deck:', error);
        }
    }
}
