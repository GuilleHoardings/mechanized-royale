/**
 * CanvasTheme - shared visual language for the in-canvas UI.
 *
 * The game is set in the armoured warfare of the 1940s, so the chrome is
 * styled like a field command dossier: olive drab card stock, khaki rules,
 * brass stencilling, typewriter readouts and riveted map boards. Phaser
 * scenes cannot use CSS, so this helper mirrors the HTML shell's palette,
 * fonts and panel primitives for everything drawn inside the game canvas:
 * HUD panels, cards, tooltips, menu/deck/result screens and battlefield
 * framing. Battlefield/unit art intentionally keeps its own colours.
 *
 * Only Graphics APIs supported by the graphics harness are used here:
 * fillStyle, lineStyle, fillRect, fillRoundedRect, strokeRoundedRect,
 * fillCircle, fillEllipse, lineBetween and strokeRect.
 */
const CanvasTheme = {
    colors: {
        // Surfaces - olive drab, field brown and aged card stock
        ink: 0x16140d,
        deep: 0x1d1b12,
        panel: 0x2d2a1c,
        panelStrong: 0x1e1c12,
        raised: 0x373223,
        raisedAlt: 0x433d2b,
        glass: 0x514a33,

        // Lines - khaki, faded brass and parchment
        line: 0xb5a578,
        lineSoft: 0x6f6748,
        lineBright: 0xe0d2a6,

        // Text (Phaser text styles need CSS strings)
        text: '#f2ead3',
        textDim: '#d8cdac',
        muted: '#b0a47f',
        faint: '#857a5b',

        // Accents - brass, allied olive, signal red
        accent: 0xc9a24b,
        accentCss: '#d3ad58',
        blue: 0x8d9b67,
        blueCss: '#a6b47b',
        blueDeep: 0x5b6540,
        green: 0x9cae73,
        greenCss: '#afc186',
        amber: 0xd1a04a,
        amberCss: '#dcb35f',
        violet: 0x9d8055,
        violetCss: '#b5966a',
        danger: 0xc25a44,
        dangerCss: '#d47962',
        dangerDeep: 0x8b3627,

        // Battlefield (kept close to the existing art so gameplay is unchanged)
        ground: 0x16241c,
        groundAlt: 0x1c2e22,
        groundLight: 0x25392b,
        groundDark: 0x0d1812,
        mud: 0x2a2118,
        mudLight: 0x3a2e20,
        water: 0x0f2a3d,
        waterDeep: 0x0a1d2c,
        waterLight: 0x1c4a5c,
        waterRipple: 0x2dd4bf,
        bridge: 0x3b2f24,
        bridgeDark: 0x241b14,
        steel: 0x4b5563,
        steelLight: 0x6b7280,
        concrete: 0x5b6675,
        concreteLight: 0x8a97a8,
        concreteDark: 0x3b4657,
        hazard: 0xd1a04a
    },

    fonts: {
        ui: 'Bahnschrift, "DIN Alternate", "Segoe UI", Arial, sans-serif',
        mono: '"Courier New", "Cascadia Mono", Consolas, monospace',
        display: 'Stencil, "Copperplate Gothic Bold", "Bahnschrift Condensed", "Arial Narrow", Impact, sans-serif'
    },

    /** Converts a 0xRRGGBB number to a CSS hex string. */
    hex(color) {
        return `#${color.toString(16).padStart(6, '0')}`;
    },

    /**
     * Draws a field-dossier panel: flat olive card stock, a dark keyline,
     * an inner khaki rule, optional brass strip, rivets and corner brackets.
     */
    panel(graphics, x, y, w, h, options = {}) {
        const radius = options.radius !== undefined ? options.radius : 2;
        const fill = options.fill !== undefined ? options.fill : this.colors.panel;
        const fillAlpha = options.fillAlpha !== undefined ? options.fillAlpha : 0.94;
        const stroke = options.stroke !== undefined ? options.stroke : this.colors.line;
        const strokeAlpha = options.strokeAlpha !== undefined ? options.strokeAlpha : 0.42;

        if (options.shadow !== false) {
            graphics.fillStyle(0x000000, options.shadowAlpha !== undefined ? options.shadowAlpha : 0.32);
            graphics.fillRoundedRect(x + 3, y + 4, w, h, radius);
        }

        graphics.fillStyle(fill, fillAlpha);
        graphics.fillRoundedRect(x, y, w, h, radius);

        // Faint printed-paper highlight along the top edge.
        graphics.fillStyle(0xf5e6bd, options.sheenAlpha !== undefined ? options.sheenAlpha : 0.055);
        graphics.fillRoundedRect(x + 1, y + 1, w - 2, Math.max(2, Math.min(8, h * 0.22)), Math.max(1, radius - 1));

        // Heavy outer keyline keeps panels looking pressed rather than glowing.
        graphics.lineStyle(2, this.colors.ink, 0.55);
        graphics.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, radius);

        // Inner hairline, like the double rule on a field document.
        graphics.lineStyle(1, stroke, strokeAlpha);
        graphics.strokeRoundedRect(x + 4, y + 4, Math.max(1, w - 8), Math.max(1, h - 8), Math.max(1, radius - 1));

        if (options.accent !== undefined && options.accent !== null) {
            graphics.fillStyle(options.accent, options.accentAlpha !== undefined ? options.accentAlpha : 0.9);
            graphics.fillRoundedRect(x + 10, y + 1, Math.max(8, w - 20), 2, 1);
        }

        if (options.rivets) {
            this.rivets(graphics, x, y, w, h, options.rivetColor, options.rivetAlpha);
        }

        if (options.brackets) {
            this.brackets(
                graphics, x, y, w, h,
                options.bracketColor !== undefined ? options.bracketColor : (options.accent || this.colors.accent),
                options.bracketAlpha !== undefined ? options.bracketAlpha : 0.55,
                options.bracketLength !== undefined ? options.bracketLength : 9
            );
        }
    },

    /** Draws four small screw heads in the corners of a panel. */
    rivets(graphics, x, y, w, h, color, alpha = 0.6) {
        const inset = 8;
        const screwColor = color !== undefined ? color : this.colors.line;
        const points = [
            [x + inset, y + inset],
            [x + w - inset, y + inset],
            [x + inset, y + h - inset],
            [x + w - inset, y + h - inset]
        ];
        points.forEach(([px, py]) => {
            graphics.fillStyle(this.colors.ink, Math.min(1, alpha + 0.2));
            graphics.fillCircle(px, py, 2.4);
            graphics.fillStyle(screwColor, alpha);
            graphics.fillCircle(px - 0.4, py - 0.4, 1.2);
        });
    },

    /** Draws L-shaped corner brackets inside a rectangle. */
    brackets(graphics, x, y, w, h, color, alpha = 0.55, length = 9, inset = 3) {
        const x0 = x + inset;
        const y0 = y + inset;
        const x1 = x + w - inset;
        const y1 = y + h - inset;

        graphics.lineStyle(2, color, alpha);
        // Top-left
        graphics.lineBetween(x0, y0, x0 + length, y0);
        graphics.lineBetween(x0, y0, x0, y0 + length);
        // Top-right
        graphics.lineBetween(x1 - length, y0, x1, y0);
        graphics.lineBetween(x1, y0, x1, y0 + length);
        // Bottom-left
        graphics.lineBetween(x0, y1 - length, x0, y1);
        graphics.lineBetween(x0, y1, x0 + length, y1);
        // Bottom-right
        graphics.lineBetween(x1 - length, y1, x1, y1);
        graphics.lineBetween(x1, y1 - length, x1, y1);
    },

    /** Horizontal or vertical hairline. */
    rule(graphics, x1, y1, x2, y2, color = this.colors.line, alpha = 0.22, width = 1) {
        graphics.lineStyle(width, color, alpha);
        graphics.lineBetween(x1, y1, x2, y2);
    },

    /** Small stamped tag used for status labels and badges. */
    chip(graphics, x, y, w, h, color, options = {}) {
        const radius = options.radius !== undefined ? options.radius : 2;
        graphics.fillStyle(color, options.fillAlpha !== undefined ? options.fillAlpha : 0.16);
        graphics.fillRoundedRect(x, y, w, h, radius);
        graphics.lineStyle(1, color, options.strokeAlpha !== undefined ? options.strokeAlpha : 0.55);
        graphics.strokeRoundedRect(x, y, w, h, radius);
        // Inner rule, like a die-stamped metal tag.
        graphics.lineStyle(1, this.colors.ink, 0.22);
        graphics.strokeRoundedRect(x + 2, y + 2, Math.max(1, w - 4), Math.max(1, h - 4), Math.max(0, radius - 1));
        if (options.dot) {
            const size = Math.max(2, h * 0.22);
            graphics.fillStyle(color, 0.9);
            graphics.fillRect(x + h / 2 - size / 2, y + h / 2 - size / 2, size, size);
        }
    },

    /** Faded map grid used behind menu, deck, boot and battlefield screens. */
    grid(graphics, x, y, w, h, step = 40, color = this.colors.blue, alpha = 0.06) {
        const majorAlpha = Math.min(1, alpha * 2.4);
        graphics.lineStyle(1, color, alpha);
        for (let gx = x; gx <= x + w + 0.5; gx += step) {
            graphics.lineBetween(gx, y, gx, y + h);
        }
        for (let gy = y; gy <= y + h + 0.5; gy += step) {
            graphics.lineBetween(x, gy, x + w, gy);
        }

        // Heavier survey lines every fifth square.
        graphics.lineStyle(1, color, majorAlpha);
        for (let gx = x; gx <= x + w + 0.5; gx += step * 5) {
            graphics.lineBetween(gx, y, gx, y + h);
        }
        for (let gy = y; gy <= y + h + 0.5; gy += step * 5) {
            graphics.lineBetween(x, gy, x + w, gy);
        }
    },

    /** Aged-paper fold lines, dust and fibre marks behind a screen. */
    paper(graphics, x, y, w, h) {
        // Fold lines
        graphics.lineStyle(1, this.colors.lineBright, 0.05);
        graphics.lineBetween(x + w * 0.34, y, x + w * 0.34, y + h);
        graphics.lineBetween(x, y + h * 0.52, x + w, y + h * 0.52);

        // Old damp stains
        const stains = [
            [0.16, 0.22, 0.30, 0.18, this.colors.mud, 0.04],
            [0.78, 0.16, 0.24, 0.14, this.colors.amber, 0.025],
            [0.58, 0.76, 0.36, 0.22, this.colors.mud, 0.035],
            [0.10, 0.84, 0.26, 0.16, this.colors.ink, 0.05]
        ];
        stains.forEach(([sx, sy, sw, sh, color, alpha]) => {
            graphics.fillStyle(color, alpha);
            graphics.fillEllipse(x + sx * w, y + sy * h, sw * w, sh * h);
        });

        // Paper fibres / wear
        graphics.lineStyle(1, this.colors.lineBright, 0.03);
        for (let i = 0; i < 16; i++) {
            const fy = y + ((i + 0.5) / 16) * h;
            const fx = x + ((i * 37) % 100) / 100 * w;
            graphics.lineBetween(fx, fy, Math.min(x + w, fx + w * 0.08), fy);
        }
    },

    /** Darkens the edges of a rectangle in steps (cheap canvas vignette). */
    vignette(graphics, x, y, w, h, steps = 4, alpha = 0.05) {
        for (let i = 0; i < steps; i++) {
            graphics.lineStyle(1, 0x000000, alpha + i * 0.02);
            graphics.strokeRect(x + i, y + i, w - i * 2, h - i * 2);
        }
    },

    /** Standard text style for panel headers/eyebrows. */
    eyebrowStyle(color = this.colors.muted, size = 9) {
        return {
            fontFamily: this.fonts.mono,
            fontSize: `${size}px`,
            fill: color,
            letterSpacing: 1
        };
    },

    /** Standard text style for body/value text. */
    valueStyle(color = this.colors.text, size = 12, weight = '600') {
        return {
            fontFamily: this.fonts.ui,
            fontSize: `${size}px`,
            fill: color,
            fontWeight: weight
        };
    },

    /** Standard text style for typewriter readouts. */
    monoStyle(color = this.colors.textDim, size = 10) {
        return {
            fontFamily: this.fonts.mono,
            fontSize: `${size}px`,
            fill: color
        };
    }
};
