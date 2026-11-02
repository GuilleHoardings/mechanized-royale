/**
 * CanvasTheme - shared visual language for the in-canvas UI.
 *
 * The HTML chrome (styles.css) uses a dark slate console with a blueprint grid,
 * teal/blue accents and machined panels. Phaser scenes cannot use CSS, so this
 * helper mirrors the same palette, fonts and panel/bracket primitives for
 * everything drawn inside the game canvas: HUD panels, cards, tooltips,
 * menu/deck/result screens and battlefield framing.
 *
 * Only Graphics APIs supported by the graphics harness are used here:
 * fillStyle, lineStyle, fillRect, fillRoundedRect, strokeRoundedRect,
 * fillCircle, fillEllipse, lineBetween and strokeRect.
 */
const CanvasTheme = {
    colors: {
        // Surfaces
        ink: 0x05080d,
        deep: 0x0a111c,
        panel: 0x0f1826,
        panelStrong: 0x090f19,
        raised: 0x111b2b,
        raisedAlt: 0x16233a,
        glass: 0x1a2744,

        // Lines
        line: 0x7da3ce,
        lineSoft: 0x3d5a80,
        lineBright: 0xa9c4e2,

        // Text (Phaser text styles need CSS strings)
        text: '#e8f1fb',
        textDim: '#b7c8dd',
        muted: '#8ea3bd',
        faint: '#64748b',

        // Accents
        accent: 0x4fd1c5,
        accentCss: '#4fd1c5',
        blue: 0x60a5fa,
        blueCss: '#60a5fa',
        blueDeep: 0x2563eb,
        green: 0x4ade80,
        greenCss: '#4ade80',
        amber: 0xfbbf24,
        amberCss: '#fbbf24',
        violet: 0xc084fc,
        violetCss: '#c084fc',
        danger: 0xf87171,
        dangerCss: '#f87171',
        dangerDeep: 0xef4444,

        // Battlefield
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
        hazard: 0xfbbf24
    },

    fonts: {
        ui: 'Bahnschrift, Segoe UI, Arial, sans-serif',
        mono: 'Cascadia Mono, Consolas, Courier New, monospace',
        display: 'Impact, Haettenschweiler, Arial Black, sans-serif'
    },

    /** Converts a 0xRRGGBB number to a CSS hex string. */
    hex(color) {
        return `#${color.toString(16).padStart(6, '0')}`;
    },

    /**
     * Draws a console panel: soft drop shadow, dark glass body, top sheen,
     * hairline border, optional accent strip and corner brackets.
     */
    panel(graphics, x, y, w, h, options = {}) {
        const radius = options.radius !== undefined ? options.radius : 8;
        const fill = options.fill !== undefined ? options.fill : this.colors.panel;
        const fillAlpha = options.fillAlpha !== undefined ? options.fillAlpha : 0.94;
        const stroke = options.stroke !== undefined ? options.stroke : this.colors.line;
        const strokeAlpha = options.strokeAlpha !== undefined ? options.strokeAlpha : 0.34;
        const lineWidth = options.lineWidth !== undefined ? options.lineWidth : 1;

        if (options.shadow !== false) {
            graphics.fillStyle(0x000000, options.shadowAlpha !== undefined ? options.shadowAlpha : 0.26);
            graphics.fillRoundedRect(x + 2, y + 3, w, h, radius);
        }

        graphics.fillStyle(fill, fillAlpha);
        graphics.fillRoundedRect(x, y, w, h, radius);

        // Thin top sheen, like the CSS panels' inset highlight.
        graphics.fillStyle(0xffffff, options.sheenAlpha !== undefined ? options.sheenAlpha : 0.04);
        graphics.fillRoundedRect(x + 1, y + 1, w - 2, Math.max(3, Math.min(10, h * 0.3)), Math.max(2, radius - 2));

        graphics.lineStyle(lineWidth, stroke, strokeAlpha);
        graphics.strokeRoundedRect(x, y, w, h, radius);

        if (options.accent !== undefined && options.accent !== null) {
            graphics.fillStyle(options.accent, options.accentAlpha !== undefined ? options.accentAlpha : 0.9);
            graphics.fillRoundedRect(x + 8, y, Math.max(8, w - 16), 2, 1);
        }

        if (options.brackets) {
            this.brackets(
                graphics, x, y, w, h,
                options.bracketColor !== undefined ? options.bracketColor : (options.accent || this.colors.accent),
                options.bracketAlpha !== undefined ? options.bracketAlpha : 0.55,
                options.bracketLength !== undefined ? options.bracketLength : 8
            );
        }
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

    /** Small pill/chip used for status labels and badges. */
    chip(graphics, x, y, w, h, color, options = {}) {
        const radius = options.radius !== undefined ? options.radius : h / 2;
        graphics.fillStyle(color, options.fillAlpha !== undefined ? options.fillAlpha : 0.16);
        graphics.fillRoundedRect(x, y, w, h, radius);
        graphics.lineStyle(1, color, options.strokeAlpha !== undefined ? options.strokeAlpha : 0.5);
        graphics.strokeRoundedRect(x, y, w, h, radius);
        if (options.dot) {
            graphics.fillStyle(color, 0.9);
            graphics.fillCircle(x + h / 2, y + h / 2, Math.max(1.5, h * 0.18));
        }
    },

    /** Blueprint grid used behind menu, deck, boot and battlefield screens. */
    grid(graphics, x, y, w, h, step = 40, color = this.colors.blue, alpha = 0.06) {
        graphics.lineStyle(1, color, alpha);
        for (let gx = x; gx <= x + w + 0.5; gx += step) {
            graphics.lineBetween(gx, y, gx, y + h);
        }
        for (let gy = y; gy <= y + h + 0.5; gy += step) {
            graphics.lineBetween(x, gy, x + w, gy);
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

    /** Standard text style for monospaced readouts. */
    monoStyle(color = this.colors.textDim, size = 10) {
        return {
            fontFamily: this.fonts.mono,
            fontSize: `${size}px`,
            fill: color
        };
    }
};
