/**
 * CanvasTheme - shared visual language for the in-canvas UI.
 *
 * The game is set in the armoured warfare of the 1940s, so the chrome is
 * styled like an analogue field dossier: aged paper, typewriter reports,
 * ink rules, red rubber stamps and olive canvas webbing. Phaser scenes cannot
 * use CSS, so this helper mirrors the HTML shell's palette, fonts and panel
 * primitives for everything drawn inside the game canvas: HUD panels, cards,
 * tooltips, menu/deck/result screens and battlefield framing.
 *
 * Two surface families are provided:
 *   - paper / sheet / stamp  -> menus, deck, loading and after-action reports
 *   - panel / stitch          -> battle HUD webbing over the battlefield
 *
 * Battlefield/unit art intentionally keeps its own colours.
 *
 * Only Graphics APIs supported by the graphics harness are used here:
 * fillStyle, lineStyle, fillRect, fillRoundedRect, strokeRoundedRect,
 * fillCircle, fillEllipse, lineBetween and strokeRect.
 */
const CanvasTheme = {
    colors: {
        // Paper surfaces - menus, deck, loading and reports
        paper: 0xcbb98d,
        paperLight: 0xdccca4,
        paperShade: 0xb9a677,
        paperDeep: 0x9d8b63,
        paperEdge: 0x746444,
        inkText: '#2b2416',
        inkTextDim: '#4d4128',
        inkMuted: '#6b5d3f',
        inkFaint: '#746444',
        stamp: 0x8e3327,
        stampCss: '#8e3327',
        oliveInk: 0x4f5636,
        oliveInkCss: '#4f5636',

        // Canvas / webbing surfaces - battle HUD over the field
        ink: 0x16140d,
        deep: 0x1d1b12,
        panel: 0x3a3b26,
        panelStrong: 0x2a2b1a,
        raised: 0x4a4c31,
        raisedAlt: 0x585a3b,
        glass: 0x63643f,
        canvas: 0x3f4129,
        canvasDark: 0x2b2c1a,
        canvasLight: 0x55583a,
        thread: 0xc9b98d,

        // Lines - khaki, faded brass and parchment
        line: 0xbfae80,
        lineSoft: 0x6f6748,
        lineBright: 0xe6d7ab,

        // Text for dark canvas surfaces (Phaser text styles need CSS strings)
        text: '#f3e9cc',
        textDim: '#d9cba6',
        muted: '#b7a97f',
        faint: '#8c7e5b',

        // Accents - brass, allied olive, signal red
        accent: 0xa8843f,
        accentCss: '#c2a05a',
        blue: 0x6f7f5a,
        blueCss: '#8fa06f',
        blueDeep: 0x4b573a,
        green: 0x8a9a63,
        greenCss: '#a3b37b',
        amber: 0xc09a4e,
        amberCss: '#d3ad58',
        violet: 0x8d7a58,
        violetCss: '#a8926a',
        danger: 0xa84a38,
        dangerCss: '#d47962',
        dangerDeep: 0x74291d,

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
        hazard: 0xc09a4e
    },

    fonts: {
        ui: 'Georgia, "Book Antiqua", "Palatino Linotype", "Times New Roman", serif',
        serif: 'Georgia, "Book Antiqua", "Palatino Linotype", "Times New Roman", serif',
        mono: '"Courier New", "Courier", "Cascadia Mono", monospace',
        display: 'Stencil, "Copperplate Gothic Bold", "Georgia", "Times New Roman", serif'
    },

    /** Converts a 0xRRGGBB number to a CSS hex string. */
    hex(color) {
        return `#${color.toString(16).padStart(6, '0')}`;
    },

    /**
     * Phaser rasterises Text at 1x by default. Because the canvas is scaled
     * with Phaser.Scale.FIT, that makes every label look soft on anything but
     * a 1:1 viewport. Render glyphs at 2x (or the device pixel ratio, capped)
     * so the text stays crisp when the canvas is scaled.
     *
     * Patches the factory once so every `this.add.text(...)` call inherits it,
     * including text created by scenes that predate this helper.
     */
    installTextResolution(resolution = 2) {
        if (this._textResolutionInstalled || typeof Phaser === 'undefined') return;
        const factory = Phaser.GameObjects.GameObjectFactory.prototype;
        const originalText = factory.text;

        factory.text = function (x, y, text, style) {
            let nextStyle = style;
            if (nextStyle && typeof nextStyle === 'object') {
                if (nextStyle.resolution === undefined) {
                    nextStyle = { ...nextStyle, resolution };
                }
            } else if (!nextStyle) {
                nextStyle = { resolution };
            }

            const created = originalText.call(this, x, y, text, nextStyle);
            if (created && typeof created.setResolution === 'function') {
                created.setResolution(resolution);
            }
            return created;
        };

        this._textResolutionInstalled = true;
    },

    /**
     * Paints an aged paper sheet across a rectangle. This is a real fill, not
     * just grain, so menu/deck/loading/report screens read as paper rather
     * than as a dark console.
     */
    paper(graphics, x, y, w, h, options = {}) {
        const fill = options.fill !== undefined ? options.fill : this.colors.paper;
        graphics.fillStyle(fill, options.fillAlpha !== undefined ? options.fillAlpha : 1);
        graphics.fillRect(x, y, w, h);

        // Paper fibres
        graphics.lineStyle(1, this.colors.paperDeep, 0.16);
        for (let i = 0; i < 44; i++) {
            const fy = y + ((i + 0.5) / 44) * h;
            const fx = x + ((i * 53) % 100) / 100 * w;
            graphics.lineBetween(fx, fy, Math.min(x + w, fx + w * 0.1), fy);
        }

        // Fold lines
        graphics.lineStyle(1, this.colors.paperDeep, 0.24);
        graphics.lineBetween(x + w * 0.34, y, x + w * 0.34, y + h);
        graphics.lineBetween(x, y + h * 0.52, x + w, y + h * 0.52);

        // Old damp stains
        const stains = [
            [0.16, 0.22, 0.30, 0.18, this.colors.paperDeep, 0.1],
            [0.78, 0.16, 0.24, 0.14, this.colors.stamp, 0.035],
            [0.58, 0.76, 0.36, 0.22, this.colors.paperDeep, 0.08],
            [0.10, 0.84, 0.26, 0.16, this.colors.ink, 0.035]
        ];
        stains.forEach(([sx, sy, sw, sh, color, alpha]) => {
            graphics.fillStyle(color, alpha);
            graphics.fillEllipse(x + sx * w, y + sy * h, sw * w, sh * h);
        });

        // Darkened deckle edge
        graphics.lineStyle(2, this.colors.paperEdge, 0.28);
        graphics.strokeRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
    },

    /**
     * Draws a paper document panel: light card stock, an ink keyline, an inner
     * double rule and an optional stitched border. Used by menus, deck and
     * after-action reports.
     */
    sheet(graphics, x, y, w, h, options = {}) {
        const radius = options.radius !== undefined ? options.radius : 1;
        const fill = options.fill !== undefined ? options.fill : this.colors.paperLight;
        const edge = options.edge !== undefined ? options.edge : this.colors.paperEdge;
        const ink = options.ink !== undefined ? options.ink : this.colors.ink;

        if (options.shadow !== false) {
            graphics.fillStyle(ink, options.shadowAlpha !== undefined ? options.shadowAlpha : 0.26);
            graphics.fillRoundedRect(x + 3, y + 4, w, h, radius);
        }

        graphics.fillStyle(fill, options.fillAlpha !== undefined ? options.fillAlpha : 1);
        graphics.fillRoundedRect(x, y, w, h, radius);

        // Slightly darker bottom/right edge, like a stacked paper pad.
        graphics.fillStyle(edge, 0.28);
        graphics.fillRect(x + 2, y + h - 2, Math.max(1, w - 4), 1);
        graphics.fillRect(x + w - 2, y + 2, 1, Math.max(1, h - 4));

        // Ink keyline plus an inner double rule.
        graphics.lineStyle(options.strokeWidth !== undefined ? options.strokeWidth : 1, ink,
            options.strokeAlpha !== undefined ? options.strokeAlpha : 0.72);
        graphics.strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, radius);
        if (options.doubleRule !== false) {
            graphics.lineStyle(1, ink, options.doubleRuleAlpha !== undefined ? options.doubleRuleAlpha : 0.24);
            graphics.strokeRoundedRect(x + 3.5, y + 3.5, Math.max(1, w - 7), Math.max(1, h - 7),
                Math.max(0, radius - 1));
        }

        if (options.accent !== undefined && options.accent !== null) {
            graphics.fillStyle(options.accent, options.accentAlpha !== undefined ? options.accentAlpha : 0.9);
            graphics.fillRect(x + 10, y, Math.max(8, w - 20), 2);
        }

        if (options.stitches) {
            this.stitchBorder(graphics, x + 6, y + 6, w - 12, h - 12,
                options.stitchColor !== undefined ? options.stitchColor : ink,
                options.stitchAlpha !== undefined ? options.stitchAlpha : 0.32);
        }
    },

    /**
     * Draws an olive-canvas HUD panel with a stitched edge. Used by the battle
     * HUD so it reads as webbing and field kit rather than a glowing console.
     */
    panel(graphics, x, y, w, h, options = {}) {
        const radius = options.radius !== undefined ? options.radius : 1;
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

        // Faint cloth highlight along the top edge.
        graphics.fillStyle(this.colors.thread, options.sheenAlpha !== undefined ? options.sheenAlpha : 0.06);
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

        if (options.stitches) {
            this.stitchBorder(graphics, x + 6, y + 6, w - 12, h - 12,
                options.stitchColor !== undefined ? options.stitchColor : this.colors.thread,
                options.stitchAlpha !== undefined ? options.stitchAlpha : 0.3);
        }
    },

    /** Draws a dashed line (thread stitches or a typed rule). */
    stitch(graphics, x1, y1, x2, y2, color = this.colors.ink, alpha = 0.4, dash = 4, gap = 3, width = 1) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length <= 0) return;

        const ux = dx / length;
        const uy = dy / length;
        graphics.lineStyle(width, color, alpha);
        for (let d = 0; d < length; d += dash + gap) {
            const end = Math.min(d + dash, length);
            graphics.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * end, y1 + uy * end);
        }
    },

    /** Dashed border around a rectangle. */
    stitchBorder(graphics, x, y, w, h, color = this.colors.thread, alpha = 0.3, dash = 5, gap = 3) {
        this.stitch(graphics, x, y, x + w, y, color, alpha, dash, gap);
        this.stitch(graphics, x + w, y, x + w, y + h, color, alpha, dash, gap);
        this.stitch(graphics, x + w, y + h, x, y + h, color, alpha, dash, gap);
        this.stitch(graphics, x, y + h, x, y, color, alpha, dash, gap);
    },

    /** Double-ruled rubber-stamp box, as used on period paperwork. */
    stampBox(graphics, x, y, w, h, color = this.colors.stamp, alpha = 0.75) {
        graphics.lineStyle(2, color, alpha);
        graphics.strokeRect(x, y, w, h);
        graphics.lineStyle(1, color, alpha * 0.65);
        graphics.strokeRect(x + 3, y + 3, Math.max(1, w - 6), Math.max(1, h - 6));
    },

    /** Simple five-pointed service star. */
    star(graphics, cx, cy, outer, inner, color = this.colors.stamp, alpha = 0.8, width = 1.5) {
        const points = [];
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? outer : inner;
            const angle = -Math.PI / 2 + (i * Math.PI) / 5;
            points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
        }
        graphics.lineStyle(width, color, alpha);
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            graphics.lineBetween(a[0], a[1], b[0], b[1]);
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
        graphics.lineBetween(x0, y0, x0 + length, y0);
        graphics.lineBetween(x0, y0, x0, y0 + length);
        graphics.lineBetween(x1 - length, y0, x1, y0);
        graphics.lineBetween(x1, y0, x1, y0 + length);
        graphics.lineBetween(x0, y1 - length, x0, y1);
        graphics.lineBetween(x0, y1, x0 + length, y1);
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
        const radius = options.radius !== undefined ? options.radius : 1;
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
    grid(graphics, x, y, w, h, step = 40, color = this.colors.paperEdge, alpha = 0.1) {
        const majorAlpha = Math.min(1, alpha * 2.2);
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
