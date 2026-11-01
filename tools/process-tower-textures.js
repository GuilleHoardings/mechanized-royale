const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('./graphics-harness/node_modules/@napi-rs/canvas');

const SRC_DIR = 'C:/Users/jentr/.gemini/antigravity/brain/1c90d0a7-3460-4fa8-a355-51f0c8f01451/';
const OUT_DIR = path.join(__dirname, '../assets/towers');

const SOURCES = {
    tower_main_base: path.join(SRC_DIR, 'tower_main_base_1793472388766.jpg'),
    tower_main_turret: path.join(SRC_DIR, 'tower_main_turret_1793472439134.jpg'),
    tower_side_base: path.join(SRC_DIR, 'tower_side_base_1793472453408.jpg'),
    tower_side_turret: path.join(SRC_DIR, 'tower_side_turret_1793472485935.jpg')
};

/**
 * Removes solid/near-white background starting from the canvas edges.
 * Applies anti-aliased edge feathering and de-fringing to eliminate white halos.
 */
function removeBackground(srcCanvas) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0);

    const idata = ctx.getImageData(0, 0, w, h);
    const d = idata.data;

    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let qHead = 0, qTail = 0;

    // Seed edge pixels
    for (let x = 0; x < w; x++) {
        queue[qTail++] = x;
        queue[qTail++] = (h - 1) * w + x;
        visited[x] = 1;
        visited[(h - 1) * w + x] = 1;
    }
    for (let y = 1; y < h - 1; y++) {
        queue[qTail++] = y * w;
        queue[qTail++] = y * w + (w - 1);
        visited[y * w] = 1;
        visited[y * w + (w - 1)] = 1;
    }

    // Flood fill connected background
    while (qHead < qTail) {
        const idx = queue[qHead++];
        const p = idx * 4;
        const r = d[p], g = d[p + 1], b = d[p + 2];
        const minC = Math.min(r, g, b);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (minC >= 235 || lum >= 240) {
            const x = idx % w;
            const y = Math.floor(idx / w);
            const neighbors = [
                x > 0 ? idx - 1 : -1,
                x < w - 1 ? idx + 1 : -1,
                y > 0 ? idx - w : -1,
                y < h - 1 ? idx + w : -1
            ];
            for (const n of neighbors) {
                if (n !== -1 && !visited[n]) {
                    visited[n] = 1;
                    queue[qTail++] = n;
                }
            }
        }
    }

    // Edge feathering and defringing
    for (let i = 0; i < w * h; i++) {
        if (visited[i]) {
            const p = i * 4;
            const r = d[p], g = d[p + 1], b = d[p + 2];
            const minC = Math.min(r, g, b);
            if (minC >= 250) {
                d[p + 3] = 0;
            } else if (minC >= 235) {
                const alpha = Math.max(0, Math.min(255, Math.round((250 - minC) / 15 * 255)));
                d[p + 3] = alpha;
                const a = alpha / 255;
                if (a > 0.05) {
                    d[p] = Math.max(0, Math.min(255, Math.round((r - (1 - a) * 255) / a)));
                    d[p + 1] = Math.max(0, Math.min(255, Math.round((g - (1 - a) * 255) / a)));
                    d[p + 2] = Math.max(0, Math.min(255, Math.round((b - (1 - a) * 255) / a)));
                }
            }
        }
    }

    ctx.putImageData(idata, 0, 0);
    return canvas;
}

/**
 * Normalizes a turret so its cupola rotation pivot is exactly at (512, 512).
 */
function normalizeTurret(cutCanvas, cupolaCenterY, scale = 0.72) {
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(512, 512);
    ctx.scale(scale, scale);
    ctx.drawImage(cutCanvas, -512, -cupolaCenterY);
    ctx.restore();

    return canvas;
}

/**
 * Normalizes a base so its center is exactly at (512, 512).
 */
function normalizeBase(cutCanvas, centerX = 512, centerY = 511.5, scale = 1.0) {
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(512, 512);
    ctx.scale(scale, scale);
    ctx.drawImage(cutCanvas, -centerX, -centerY);
    ctx.restore();

    return canvas;
}

async function main() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    console.log('Loading source images...');
    const [rawMainBase, rawMainTurret, rawSideBase, rawSideTurret] = await Promise.all([
        loadImage(SOURCES.tower_main_base),
        loadImage(SOURCES.tower_main_turret),
        loadImage(SOURCES.tower_side_base),
        loadImage(SOURCES.tower_side_turret)
    ]);

    console.log('Removing backgrounds and defringing...');
    const cutMainBase = removeBackground(rawMainBase);
    const cutMainTurret = removeBackground(rawMainTurret);
    const cutSideBase = removeBackground(rawSideBase);
    const cutSideTurret = removeBackground(rawSideTurret);

    console.log('Centering and aligning rotation pivots...');
    // Main base is already centered at (512, 511)
    const normMainBase = normalizeBase(cutMainBase, 512, 511, 0.98);
    // Main turret cupola is at y = 655
    const normMainTurret = normalizeTurret(cutMainTurret, 655, 0.72);

    // Side base is already centered at (511.5, 511.5)
    const normSideBase = normalizeBase(cutSideBase, 511.5, 511.5, 0.98);
    // Side turret cupola is at y = 670
    const normSideTurret = normalizeTurret(cutSideTurret, 670, 0.70);

    const outputs = [
        { name: 'tower_main_base.png', canvas: normMainBase },
        { name: 'tower_main_turret.png', canvas: normMainTurret },
        { name: 'tower_side_base.png', canvas: normSideBase },
        { name: 'tower_side_turret.png', canvas: normSideTurret }
    ];

    for (const item of outputs) {
        const dest = path.join(OUT_DIR, item.name);
        fs.writeFileSync(dest, item.canvas.toBuffer('image/png'));
        console.log(`Saved ${dest}`);
    }

    console.log('Generating in-game composite preview...');
    const preview = createCanvas(600, 300);
    const pctx = preview.getContext('2d');
    pctx.fillStyle = '#223046';
    pctx.fillRect(0, 0, 600, 300);

    // Simulate in-game Main Tower (80x80 px scaled up 2x for preview = 160x160)
    pctx.drawImage(normMainBase, 100 - 80, 150 - 80, 160, 160);
    pctx.save();
    pctx.translate(100, 150);
    pctx.rotate(-Math.PI / 4); // aim diagonally
    pctx.drawImage(normMainTurret, -80, -80, 160, 160);
    pctx.restore();

    // Simulate in-game Side Tower (60x60 px scaled up 2x for preview = 120x120)
    pctx.drawImage(normSideBase, 400 - 60, 150 - 60, 120, 120);
    pctx.save();
    pctx.translate(400, 150);
    pctx.rotate(Math.PI / 6); // aim slightly right
    pctx.drawImage(normSideTurret, -60, -60, 120, 120);
    pctx.restore();

    const previewDest = path.join(__dirname, 'graphics-harness/out/towers-game-preview.png');
    fs.writeFileSync(previewDest, preview.toBuffer('image/png'));
    console.log(`Saved preview to ${previewDest}`);

    console.log('All textures successfully processed and saved!');
}

main().catch(err => {
    console.error('Error processing textures:', err);
    process.exit(1);
});
