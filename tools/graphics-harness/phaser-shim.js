/**
 * Minimal Phaser 3 shim for rendering GraphicsManager output offline.
 *
 * GraphicsManager only touches a small slice of Phaser:
 *   scene.add.graphics() / container() / image() / sprite()
 *   scene.useGraphicsMode, scene.textures
 *   Graphics: fillStyle, lineStyle, fillRect, fillRoundedRect, fillCircle,
 *             fillEllipse, fillTriangle, beginPath, moveTo, lineTo, closePath,
 *             fillPath, strokePath, arc, lineBetween, strokeRect,
 *             strokeRoundedRect, strokeCircle, setScale, setRotation, clear
 *   Container: add, removeAll, setDepth, setRotation, setScale, setAlpha
 *
 * Each Graphics records drawing ops; a replay pass draws them onto a
 * @napi-rs/canvas 2D context. This lets us render the real game code (not a
 * reimplementation) and inspect the result as a PNG.
 */

const TAU = Math.PI * 2;

function toCss(color, alpha = 1) {
    const c = color >>> 0;
    const r = (c >> 16) & 0xff;
    const g = (c >> 8) & 0xff;
    const b = c & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Rounded-rect path with per-corner radii, matching Phaser's fillRoundedRect. */
function roundedRectPath(ctx, x, y, w, h, radius) {
    const r = (radius && typeof radius === 'object') ? radius : {
        tl: radius || 0, tr: radius || 0, bl: radius || 0, br: radius || 0
    };
    const limit = Math.min(Math.abs(w), Math.abs(h)) / 2;
    const clamp = (v) => Math.max(0, Math.min(v || 0, limit));
    const tl = clamp(r.tl), tr = clamp(r.tr), br = clamp(r.br), bl = clamp(r.bl);

    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    if (tr) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    if (br) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    if (bl) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    if (tl) ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
}

class DisplayObject {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.alpha = 1;
        this.visible = true;
        this.depth = 0;
        this.parent = null;
    }

    setPosition(x, y) { this.x = x; this.y = y === undefined ? this.y : y; return this; }
    setX(x) { this.x = x; return this; }
    setY(y) { this.y = y; return this; }
    setRotation(r) { this.rotation = r; return this; }
    setAngle(deg) { this.rotation = deg * Math.PI / 180; return this; }
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
    setAlpha(a) { this.alpha = a; return this; }
    setVisible(v) { this.visible = v; return this; }
    setDepth(d) { this.depth = d; return this; }
    setScrollFactor() { return this; }
    setOrigin() { return this; }
    destroy() { this.destroyed = true; }
}

class Graphics extends DisplayObject {
    constructor() {
        super();
        this.type = 'graphics';
        this.ops = [];
        this.minX = Infinity;
        this.minY = Infinity;
        this.maxX = -Infinity;
        this.maxY = -Infinity;
    }

    // --- style -------------------------------------------------------------
    fillStyle(color, alpha = 1) { this.ops.push({ op: 'fillStyle', color, alpha }); return this; }
    lineStyle(width, color, alpha = 1) { this.ops.push({ op: 'lineStyle', width, color, alpha }); return this; }

    // --- primitives --------------------------------------------------------
    fillRect(x, y, w, h) { this._extendRect(x, y, w, h); this.ops.push({ op: 'rect', x, y, w, h, mode: 'fill' }); return this; }
    strokeRect(x, y, w, h) { this._extendRect(x, y, w, h); this.ops.push({ op: 'rect', x, y, w, h, mode: 'stroke' }); return this; }
    fillRoundedRect(x, y, w, h, radius) { this._extendRect(x, y, w, h); this.ops.push({ op: 'roundRect', x, y, w, h, radius, mode: 'fill' }); return this; }
    strokeRoundedRect(x, y, w, h, radius) { this._extendRect(x, y, w, h); this.ops.push({ op: 'roundRect', x, y, w, h, radius, mode: 'stroke' }); return this; }

    fillCircle(x, y, r) { this._extendCircle(x, y, r); this.ops.push({ op: 'circle', x, y, r, mode: 'fill' }); return this; }
    strokeCircle(x, y, r) { this._extendCircle(x, y, r); this.ops.push({ op: 'circle', x, y, r, mode: 'stroke' }); return this; }

    fillEllipse(x, y, w, h) { this._extendEllipse(x, y, w, h); this.ops.push({ op: 'ellipse', x, y, w, h, mode: 'fill' }); return this; }

    fillTriangle(x1, y1, x2, y2, x3, y3) {
        this._extend(x1, y1); this._extend(x2, y2); this._extend(x3, y3);
        this.ops.push({ op: 'triangle', x1, y1, x2, y2, x3, y3, mode: 'fill' });
        return this;
    }

    // --- path --------------------------------------------------------------
    beginPath() { this.ops.push({ op: 'beginPath' }); this._pathOpen = true; return this; }
    moveTo(x, y) { this._extend(x, y); this.ops.push({ op: 'moveTo', x, y }); return this; }
    lineTo(x, y) { this._extend(x, y); this.ops.push({ op: 'lineTo', x, y }); return this; }
    closePath() { this.ops.push({ op: 'closePath' }); return this; }
    fillPath() { this.ops.push({ op: 'fillPath' }); return this; }
    strokePath() { this.ops.push({ op: 'strokePath' }); return this; }

    arc(x, y, radius, startAngle = 0, endAngle = TAU, anticlockwise = false) {
        this._extendCircle(x, y, radius);
        this.ops.push({ op: 'arc', x, y, radius, startAngle, endAngle, anticlockwise });
        return this;
    }

    lineBetween(x1, y1, x2, y2) {
        this._extend(x1, y1); this._extend(x2, y2);
        this.ops.push({ op: 'line', x1, y1, x2, y2 });
        return this;
    }

    // --- misc --------------------------------------------------------------
    clear() { this.ops.length = 0; this.minX = this.minY = Infinity; this.maxX = this.maxY = -Infinity; return this; }
    generateTexture() { return this; }

    _extend(x, y) {
        x *= this.scaleX; y *= this.scaleY;
        if (x < this.minX) this.minX = x;
        if (y < this.minY) this.minY = y;
        if (x > this.maxX) this.maxX = x;
        if (y > this.maxY) this.maxY = y;
    }
    _extendRect(x, y, w, h) { this._extend(x, y); this._extend(x + w, y + h); }
    _extendCircle(x, y, r) { this._extendRect(x - r, y - r, r * 2, r * 2); }
    _extendEllipse(x, y, w, h) { this._extendRect(x - w / 2, y - h / 2, w, h); }
}

class Container extends DisplayObject {
    constructor(x = 0, y = 0) {
        super();
        this.type = 'container';
        this.x = x;
        this.y = y;
        this.children = [];
    }

    add(...children) {
        for (const child of children) {
            child.parent = this;
            this.children.push(child);
        }
        return this;
    }

    removeAll(destroyChildren = true) {
        if (destroyChildren) this.children.forEach((c) => c.destroy());
        this.children.length = 0;
        return this;
    }
}

// Textures never exist in graphics mode; the renderer falls back to procedural art.
class TextureManager {
    exists() { return false; }
    get() { return { isProcedural: false }; }
}

class MockScene {
    constructor() {
        this.useGraphicsMode = true;
        this.textures = new TextureManager();
        this.scene = { key: 'harness' };
        this.scale = { width: 600, height: 800 };
        this.add = {
            graphics: () => new Graphics(),
            container: (x, y) => new Container(x, y),
            image: (x, y) => { const i = new DisplayObject(); i.x = x || 0; i.y = y || 0; i.width = 1; i.height = 1; return i; },
            sprite: (x, y) => { const s = new DisplayObject(); s.x = x || 0; s.y = y || 0; s.width = 1; s.height = 1; return s; },
            text: () => { const t = new DisplayObject(); t.type = 'text'; return t; }
        };
    }
}

/**
 * Replays a Graphics op list onto a Canvas2D context.
 * The ctx must already carry the graphics object's own transform.
 */
function replayGraphics(ctx, graphics) {
    let pendingPath = false;

    const applyTransform = () => {
        ctx.translate(0, 0);
    };
    applyTransform();

    for (const op of graphics.ops) {
        switch (op.op) {
            case 'fillStyle':
                ctx.fillStyle = toCss(op.color, op.alpha);
                break;
            case 'lineStyle':
                ctx.strokeStyle = toCss(op.color, op.alpha);
                ctx.lineWidth = op.width;
                break;
            case 'rect':
                ctx.beginPath();
                ctx.rect(op.x, op.y, op.w, op.h);
                op.mode === 'fill' ? ctx.fill() : ctx.stroke();
                pendingPath = false;
                break;
            case 'roundRect':
                roundedRectPath(ctx, op.x, op.y, op.w, op.h, op.radius);
                op.mode === 'fill' ? ctx.fill() : ctx.stroke();
                pendingPath = false;
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(op.x, op.y, Math.max(0, op.r), 0, TAU);
                op.mode === 'fill' ? ctx.fill() : ctx.stroke();
                pendingPath = false;
                break;
            case 'ellipse':
                ctx.beginPath();
                ctx.ellipse(op.x, op.y, Math.max(0, op.w / 2), Math.max(0, op.h / 2), 0, 0, TAU);
                ctx.fill();
                pendingPath = false;
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(op.x1, op.y1);
                ctx.lineTo(op.x2, op.y2);
                ctx.lineTo(op.x3, op.y3);
                ctx.closePath();
                ctx.fill();
                pendingPath = false;
                break;
            case 'beginPath':
                ctx.beginPath();
                pendingPath = true;
                break;
            case 'moveTo':
                if (!pendingPath) { ctx.beginPath(); pendingPath = true; }
                ctx.moveTo(op.x, op.y);
                break;
            case 'lineTo':
                if (!pendingPath) { ctx.beginPath(); pendingPath = true; }
                ctx.lineTo(op.x, op.y);
                break;
            case 'closePath':
                ctx.closePath();
                break;
            case 'fillPath':
                ctx.fill();
                break;
            case 'strokePath':
                ctx.stroke();
                break;
            case 'arc':
                if (!pendingPath) { ctx.beginPath(); pendingPath = true; }
                ctx.arc(op.x, op.y, Math.max(0, op.radius), op.startAngle, op.endAngle, op.anticlockwise);
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(op.x1, op.y1);
                ctx.lineTo(op.x2, op.y2);
                ctx.stroke();
                pendingPath = false;
                break;
            default:
                break;
        }
    }
}

/** Renders a display tree. `ctx` is assumed to already be translated to the sheet origin. */
function renderNode(ctx, node, inheritAlpha = 1) {
    if (!node || node.visible === false) return;
    const alpha = inheritAlpha * (node.alpha === undefined ? 1 : node.alpha);

    ctx.save();
    ctx.translate(node.x || 0, node.y || 0);
    if (node.rotation) ctx.rotate(node.rotation);
    ctx.scale(node.scaleX || 1, node.scaleY || 1);

    if (node.type === 'graphics') {
        ctx.globalAlpha = alpha;
        replayGraphics(ctx, node);
    } else if (node.type === 'container') {
        for (const child of node.children) renderNode(ctx, child, alpha);
    }

    ctx.restore();
}

/** Union bbox of every graphics object in the tree, in the tree's local space. */
function boundsOf(node) {
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    const walk = (item, offsetX, offsetY) => {
        if (!item || item.visible === false) return;
        const x = offsetX + (item.x || 0);
        const y = offsetY + (item.y || 0);

        if (item.type === 'graphics' && item.minX !== Infinity) {
            box.minX = Math.min(box.minX, item.minX + x);
            box.minY = Math.min(box.minY, item.minY + y);
            box.maxX = Math.max(box.maxX, item.maxX + x);
            box.maxY = Math.max(box.maxY, item.maxY + y);
        }

        if (item.type === 'container') {
            for (const child of item.children) walk(child, x, y);
        }
    };

    walk(node, 0, 0);
    return box;
}

module.exports = {
    MockScene,
    Graphics,
    Container,
    DisplayObject,
    renderNode,
    boundsOf,
    toCss,
    TAU
};
