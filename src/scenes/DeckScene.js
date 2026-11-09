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

        this.cameras.main.setBackgroundColor('#cbb98d');
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

        // Aged map paper + survey grid, matching the menu/boot screens
        const backdrop = this.add.graphics();
        CanvasTheme.paper(backdrop, 0, 0, W, H);
        CanvasTheme.grid(backdrop, 0, 0, W, H, 40, CanvasTheme.colors.paperEdge, 0.11);
        CanvasTheme.vignette(backdrop, 0, 0, W, H, 6, 0.05);

        // Double ink frame with a stitched inner rule
        backdrop.lineStyle(2, CanvasTheme.colors.ink, 0.55);
        backdrop.strokeRect(14, 14, W - 28, H - 28);
        CanvasTheme.stitchBorder(backdrop, 20, 20, W - 40, H - 40, CanvasTheme.colors.ink, 0.26, 6, 4);

        // Header / footer rails
        CanvasTheme.rule(backdrop, 24, 58, W - 24, 58, CanvasTheme.colors.ink, 0.45);
        CanvasTheme.rule(backdrop, 24, H - 26, W - 24, H - 26, CanvasTheme.colors.ink, 0.35);

        this.add.text(24, H - 20, 'FIELD DEPOT  ·  ISSUE 07', {
            fontSize: '8px',
            fill: CanvasTheme.colors.inkFaint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        });
        this.add.text(W - 24, H - 20, 'QUARTERMASTER COPY', {
            fontSize: '8px',
            fill: CanvasTheme.colors.inkFaint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0);

        // Soft contour lines, like a field map
        const lines = this.add.graphics();
        lines.lineStyle(1, CanvasTheme.colors.paperEdge, 0.32);
        for (let i = 0; i < 5; i++) {
            const y = 84 + i * 160;
            lines.lineBetween(0, y, W, y + 28);
        }

        // Sparse dust and ink flecks
        const particles = this.add.graphics();
        for (let i = 0; i < 20; i++) {
            const px = Math.random() * W;
            const py = Math.random() * H;
            particles.fillStyle(i % 6 === 0 ? CanvasTheme.colors.stamp : CanvasTheme.colors.ink,
                Math.random() * 0.12 + 0.04);
            particles.fillCircle(px, py, Math.random() * 1.6 + 0.7);
        }
    }

    // ------------------------------------------------------------------
    // Chrome
    // ------------------------------------------------------------------

    _createHeader() {
        const { W } = this.layout;

        this.add.text(W / 2 + 2, 32, 'LOADOUT DOSSIER', {
            fontSize: '28px',
            fill: CanvasTheme.colors.ink,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 4
        }).setOrigin(0.5).setAlpha(0.14);

        this.add.text(W / 2, 30, 'LOADOUT DOSSIER', {
            fontSize: '28px',
            fill: CanvasTheme.colors.inkText,
            fontFamily: CanvasTheme.fonts.display,
            letterSpacing: 4
        }).setOrigin(0.5);

        this.headerSubtitle = this.add.text(W / 2, 55, '', {
            fontSize: '10px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0.5);

        this._createSmallButton(8, 8, 74, 26, '‹ MENU', () => {
            this.scene.start('MenuScene', { gameState: this.gameState });
        });

        this._createSmallButton(W - 84, 8, 76, 26, 'RESET', () => {
            this.deck = GameHelpers.getDefaultDeck();
            this.selectedCardId = null;
            this._refresh();
        });
    }

    _createSmallButton(x, y, w, h, label, onClick) {
        const bg = this.add.graphics();
        bg.fillStyle(CanvasTheme.colors.paperLight, 1);
        bg.fillRoundedRect(x, y, w, h, 1);
        bg.fillStyle(CanvasTheme.colors.paperShade, 0.2);
        bg.fillRoundedRect(x, y, w, h, 1);
        bg.lineStyle(1, CanvasTheme.colors.ink, 0.62);
        bg.strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 1);

        const text = this.add.text(x + w / 2, y + h / 2, label, {
            fontSize: '10px',
            fill: CanvasTheme.colors.inkTextDim,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(0.5);

        const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.01);

        hit.on('pointerover', () => text.setFill(CanvasTheme.colors.stampCss));
        hit.on('pointerout', () => text.setFill(CanvasTheme.colors.inkTextDim));
        hit.on('pointerdown', onClick);
    }

    _createPanels() {
        const L = this.layout;

        this._drawPanel(L.deckX, L.deckY, L.deckW, L.deckH, CanvasTheme.colors.oliveInk);
        this._drawPanel(L.collectionX, L.collectionY, L.collectionW, L.collectionH, CanvasTheme.colors.ink);

        const HEADER_DEPTH = 10;

        this.add.text(L.deckX + 16, L.deckY + 13, 'ACTIVE LOADOUT', {
            fontSize: '10px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setDepth(HEADER_DEPTH);

        this.deckCountText = this.add.text(L.deckX + L.deckW - 16, L.deckY + 13, '', {
            fontSize: '10px',
            fill: CanvasTheme.colors.oliveInkCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0).setDepth(HEADER_DEPTH);

        this.add.text(L.collectionX + 16, L.collectionY + 13, 'ARSENAL', {
            fontSize: '10px',
            fill: CanvasTheme.colors.inkMuted,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setDepth(HEADER_DEPTH);

        this.collectionCountText = this.add.text(L.collectionX + L.collectionW - 16, L.collectionY + 13, '', {
            fontSize: '10px',
            fill: CanvasTheme.colors.inkTextDim,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setOrigin(1, 0).setDepth(HEADER_DEPTH);

        this.collectionNote = this.add.text(
            L.collectionX + L.collectionW / 2,
            L.collectionY + L.collectionH - 18,
            '',
            {
                fontSize: '10px',
                fill: CanvasTheme.colors.inkMuted,
                fontFamily: CanvasTheme.fonts.mono,
                align: 'center',
                wordWrap: { width: L.collectionW - 40 }
            }
        ).setOrigin(0.5).setDepth(HEADER_DEPTH);
    }

    _drawPanel(x, y, w, h, accent = CanvasTheme.colors.ink, divider = true) {
        const g = this.add.graphics();
        CanvasTheme.sheet(g, x, y, w, h, {
            radius: 1,
            fill: CanvasTheme.colors.paperLight,
            edge: CanvasTheme.colors.paperEdge,
            ink: CanvasTheme.colors.ink,
            shadowAlpha: 0.18,
            accent,
            accentAlpha: 0.5,
            // One keyline only; the inner rule made the dossier look boxed-in.
            doubleRule: false
        });
        if (divider) {
            CanvasTheme.rule(g, x + 16, y + 30, x + w - 16, y + 30, CanvasTheme.colors.ink, 0.28);
        }
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
        const rows = Math.ceil(ids.length / cols);
        const w = 84;
        const h = rows > 2 ? 62 : 70;
        const gapX = 12;
        const gapY = rows > 2 ? 8 : 12;
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
                artScale: rows > 2 ? 0.82 : 0.9,
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

        // Keep every label above every tile illustration. Card art is larger
        // than its slip, so without a shared text depth one tile's artwork can
        // paint over a neighbouring tile's name or cost.
        const TILE_ART_DEPTH = 5;
        const TILE_TEXT_DEPTH = 10;

        tile.cost = this.add.text(x + w - 6, y + 5, '', {
            fontSize: `${Math.round(nameSize + 3)}px`,
            fill: CanvasTheme.colors.stampCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold',
            stroke: CanvasTheme.hex(CanvasTheme.colors.paperLight),
            strokeThickness: 2
        }).setOrigin(1, 0).setDepth(TILE_TEXT_DEPTH);

        tile.name = this.add.text(x + w / 2, y + h - 9, '', {
            fontSize: `${nameSize}px`,
            fill: CanvasTheme.colors.inkTextDim,
            fontFamily: CanvasTheme.fonts.ui
        }).setOrigin(0.5).setDepth(TILE_TEXT_DEPTH);

        tile.check = this.add.text(x + 9, y + 9, '✓', {
            fontSize: '11px',
            fill: CanvasTheme.colors.oliveInkCss,
            fontFamily: CanvasTheme.fonts.mono,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(TILE_TEXT_DEPTH).setVisible(false);

        tile.artDepth = TILE_ART_DEPTH;

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
        tile.name.setFill(cardId ? CanvasTheme.colors.inkTextDim : CanvasTheme.colors.inkFaint);

        if (!cardId) return;

        const art = this.graphicsManager.createMiniCardGraphics(
            tile.x + tile.w / 2,
            tile.y + tile.h * 0.45,
            cardId
        );
        art.setScale(tile.artScale);
        art.setDepth(tile.artDepth);

        // Troops face up, matching the battle hand
        if (CARDS[cardId].type === CARD_TYPES.TROOP) {
            art.setRotation(-Math.PI / 2);
        }

        tile.art = art;
    }

    _paintTile(tile, { selected = false, inDeck = false } = {}) {
        const { bg, x, y, w, h } = tile;
        const empty = !tile.cardId;
        const available = tile.kind === 'collection' && !inDeck;

        bg.clear();

        // Flat printed equipment slip: art, cost and name print directly on
        // the stock. No recessed art well, name plate or accent bar inside the
        // tile - just the outer keyline that marks its state.
        bg.fillStyle(CanvasTheme.colors.ink, 0.18);
        bg.fillRoundedRect(x + 2, y + 3, w, h, 1);

        bg.fillStyle(empty ? CanvasTheme.colors.paperShade : CanvasTheme.colors.paperLight,
            empty ? 0.55 : 1);
        bg.fillRoundedRect(x, y, w, h, 1);

        // Aged tint over the stock
        bg.fillStyle(CanvasTheme.colors.paperShade, empty ? 0.08 : 0.16);
        bg.fillRoundedRect(x, y, w, h, 1);

        if (selected) {
            bg.lineStyle(2, CanvasTheme.colors.stamp, 0.9);
        } else if (available) {
            bg.lineStyle(1, CanvasTheme.colors.oliveInk, 0.75);
        } else if (tile.kind === 'collection') {
            bg.lineStyle(1, CanvasTheme.colors.ink, 0.45);
        } else {
            bg.lineStyle(1, CanvasTheme.colors.ink, empty ? 0.2 : 0.55);
        }
        bg.strokeRoundedRect(x, y, w, h, 1);

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
        this._drawPanel(L.detailX, L.detailY, L.detailW, L.detailH, CanvasTheme.colors.stamp, false);

        const TEXT_DEPTH = 10;

        this.add.text(L.detailX + 16, L.detailY + 9, 'EQUIPMENT FILE', {
            fontSize: '8px',
            fill: CanvasTheme.colors.inkFaint,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 2
        }).setDepth(TEXT_DEPTH);

        this.detailName = this.add.text(L.detailX + 16, L.detailY + 22, '', {
            fontSize: '16px',
            fill: CanvasTheme.colors.inkText,
            fontFamily: CanvasTheme.fonts.ui,
            fontWeight: '700'
        }).setDepth(TEXT_DEPTH);

        this.detailMeta = this.add.text(L.detailX + 16, L.detailY + 44, '', {
            fontSize: '10px',
            fill: CanvasTheme.colors.oliveInkCss,
            fontFamily: CanvasTheme.fonts.mono,
            letterSpacing: 1
        }).setDepth(TEXT_DEPTH);

        this.detailDesc = this.add.text(L.detailX + 16, L.detailY + 62, '', {
            fontSize: '10px',
            fill: CanvasTheme.colors.inkTextDim,
            fontFamily: CanvasTheme.fonts.ui,
            wordWrap: { width: L.detailW - 32 },
            lineSpacing: 2
        }).setDepth(TEXT_DEPTH);
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
        container.setDepth(10);

        const bg = this.add.graphics();
        const accent = primary ? CanvasTheme.colors.stamp : CanvasTheme.colors.ink;

        // Hard cast shadow
        bg.fillStyle(CanvasTheme.colors.ink, 0.22);
        bg.fillRoundedRect(2, 3, w, h, 1);

        // Printed card-stock strip
        bg.fillStyle(primary ? CanvasTheme.colors.paper : CanvasTheme.colors.paperLight, 1);
        bg.fillRoundedRect(0, 0, w, h, 1);
        bg.fillStyle(CanvasTheme.colors.paperShade, primary ? 0.24 : 0.16);
        bg.fillRoundedRect(0, 0, w, h, 1);

        // Left order bar
        bg.fillStyle(accent, primary ? 0.9 : 0.5);
        bg.fillRect(1, 8, 4, h - 16);

        if (primary) {
            bg.fillStyle(accent, 0.6);
            bg.fillRect(w - 26, h - 7, 16, 2);
        }

        // Single ink keyline
        bg.lineStyle(1, CanvasTheme.colors.ink, primary ? 0.7 : 0.5);
        bg.strokeRoundedRect(0.5, 0.5, w - 1, h - 1, 1);

        const text = this.add.text(w / 2, h / 2, label, {
            fontSize: '12px',
            fill: primary ? CanvasTheme.colors.inkText : CanvasTheme.colors.inkTextDim,
            fontFamily: CanvasTheme.fonts.ui,
            fontWeight: '700',
            letterSpacing: 2
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
        this.headerSubtitle.setFill(dirty ? CanvasTheme.colors.stampCss : CanvasTheme.colors.inkMuted);
    }

    _refreshSaveButton() {
        const ready = this.deck.length === DECK_CONFIG.SIZE;
        this.saveButton.enabled = ready;
        this.saveButton.setAlpha(ready ? 1 : 0.4);
    }

    _cardMeta(def) {
        const bits = [def.type.toUpperCase(), `${def.cost} supply`];
        const unitId = def.unitId || (def.payload && def.payload.unitId);
        const unit = unitId ? UNITS[unitId] : null;

        if (unit && unit.stats) {
            bits.push(`HP ${unit.stats.hp}`);
            bits.push(`DMG ${unit.stats.damage}`);
            if (unit.stats.range) bits.push(`RNG ${unit.stats.range}`);
            if (unit.stats.speed) bits.push(`SPD ${unit.stats.speed}`);
        }

        const lifetimeMs = unit?.lifetimeMs || unit?.payload?.lifetimeMs;
        if (lifetimeMs) bits.push(`LIFE ${Math.round(lifetimeMs / 1000)}s`);

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
