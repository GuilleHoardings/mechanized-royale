const fs = require('fs');
const path = require('path');
const { createCanvas } = require('./graphics-harness/node_modules/@napi-rs/canvas');

function renderBomber() {
    const size = 1024;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const cx = size / 2; // 512
    const cy = size / 2; // 512

    // Palette
    const cDarkGreen = '#2c3a28';
    const cOlive = '#3d4d34';
    const cGreyGreen = '#4c5c43';
    const cHighlight = '#5b6d51';
    const cUnderbelly = '#687e8d'; // RLM 65 light blue-grey underside hint
    const cCockpitGlass = '#38bdf8';
    const cCockpitGlassDark = '#0284c7';
    const cCockpitFrame = '#1f2937';
    const cGunmetal = '#27272a';
    const cYellow = '#eab308';
    const cBombBody = '#475569';
    const cOutline = '#0b1220';

    ctx.save();

    // 1. Drop shadow for elevation / depth
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 12;
    ctx.shadowOffsetY = 18;

    // Wing & Fuselage Base Silhouette
    ctx.beginPath();
    // Nose
    ctx.moveTo(cx, cy - 350);
    // Right fuselage forward
    ctx.lineTo(cx + 40, cy - 260);
    // Right wing root
    ctx.lineTo(cx + 70, cy - 140);
    // Right gull-wing break (inner wing)
    ctx.lineTo(cx + 200, cy - 110);
    // Right outer wing leading edge
    ctx.lineTo(cx + 430, cy - 70);
    // Right wingtip
    ctx.quadraticCurveTo(cx + 455, cy - 40, cx + 440, cy);
    // Right aileron / trailing edge
    ctx.lineTo(cx + 220, cy + 30);
    ctx.lineTo(cx + 80, cy + 60);
    // Right fuselage aft
    ctx.lineTo(cx + 35, cy + 220);
    // Right horizontal stabilizer
    ctx.lineTo(cx + 170, cy + 260);
    ctx.lineTo(cx + 165, cy + 310);
    ctx.lineTo(cx + 25, cy + 325);
    // Tail cone
    ctx.lineTo(cx, cy + 380);
    // Left horizontal stabilizer
    ctx.lineTo(cx - 25, cy + 325);
    ctx.lineTo(cx - 165, cy + 310);
    ctx.lineTo(cx - 170, cy + 260);
    ctx.lineTo(cx - 35, cy + 220);
    // Left fuselage aft
    ctx.lineTo(cx - 80, cy + 60);
    // Left aileron / trailing edge
    ctx.lineTo(cx - 220, cy + 30);
    ctx.lineTo(cx - 440, cy);
    // Left wingtip
    ctx.quadraticCurveTo(cx - 455, cy - 40, cx - 430, cy - 70);
    // Left outer wing leading edge
    ctx.lineTo(cx - 200, cy - 110);
    // Left gull-wing break
    ctx.lineTo(cx - 70, cy - 140);
    // Left fuselage forward
    ctx.lineTo(cx - 40, cy - 260);
    ctx.closePath();

    ctx.fillStyle = cOlive;
    ctx.fill();
    ctx.restore();

    // 2. Splinter Camouflage Pattern on Wings
    ctx.save();
    // Clip to wing area
    ctx.clip();

    ctx.fillStyle = cDarkGreen;
    ctx.beginPath();
    ctx.moveTo(cx + 70, cy - 140);
    ctx.lineTo(cx + 280, cy - 90);
    ctx.lineTo(cx + 380, cy + 10);
    ctx.lineTo(cx + 150, cy + 40);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 120, cy - 120);
    ctx.lineTo(cx - 360, cy - 80);
    ctx.lineTo(cx - 440, cy - 10);
    ctx.lineTo(cx - 240, cy + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cGreyGreen;
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - 200);
    ctx.lineTo(cx + 40, cy - 180);
    ctx.lineTo(cx + 20, cy + 150);
    ctx.lineTo(cx - 30, cy + 100);
    ctx.closePath();
    ctx.fill();

    // Panel lines & wing ribs
    ctx.strokeStyle = 'rgba(11, 18, 32, 0.4)';
    ctx.lineWidth = 2.5;

    // Wing spar line across wings
    ctx.beginPath();
    ctx.moveTo(cx - 430, cy - 35);
    ctx.lineTo(cx + 430, cy - 35);
    ctx.stroke();

    // Wing ribs
    for (let xOff = 100; xOff <= 400; xOff += 40) {
        ctx.beginPath();
        ctx.moveTo(cx + xOff, cy - 100 + (xOff * 0.15));
        ctx.lineTo(cx + xOff, cy + 30 - (xOff * 0.05));
        ctx.moveTo(cx - xOff, cy - 100 + (xOff * 0.15));
        ctx.lineTo(cx - xOff, cy + 30 - (xOff * 0.05));
        ctx.stroke();
    }

    // Aileron control seams
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 220, cy + 10);
    ctx.lineTo(cx + 420, cy - 15);
    ctx.moveTo(cx - 220, cy + 10);
    ctx.lineTo(cx - 420, cy - 15);
    ctx.stroke();

    ctx.restore();

    // 3. Dive Brakes (slotted grid under outer wings)
    ctx.strokeStyle = cGunmetal;
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        const offset = i * 12;
        ctx.beginPath();
        ctx.moveTo(cx + 250, cy + offset);
        ctx.lineTo(cx + 380, cy - 20 + offset);
        ctx.moveTo(cx - 250, cy + offset);
        ctx.lineTo(cx - 380, cy - 20 + offset);
        ctx.stroke();
    }

    // 4. Fuselage Centerline Body & 3D Shading
    const fuseGrad = ctx.createLinearGradient(cx - 50, cy, cx + 50, cy);
    fuseGrad.addColorStop(0, '#1e293b');
    fuseGrad.addColorStop(0.25, cOlive);
    fuseGrad.addColorStop(0.5, cHighlight);
    fuseGrad.addColorStop(0.75, cOlive);
    fuseGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = fuseGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 48, 280, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engine Cowling (Forward Fuselage)
    const cowlGrad = ctx.createLinearGradient(cx - 40, cy - 280, cx + 40, cy - 280);
    cowlGrad.addColorStop(0, '#1f2937');
    cowlGrad.addColorStop(0.5, '#4b5563');
    cowlGrad.addColorStop(1, '#111827');
    ctx.fillStyle = cowlGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 36, cy - 340, 72, 100, [24, 24, 8, 8]);
    ctx.fill();

    // Exhaust manifolds (left & right sides of cowling)
    ctx.fillStyle = '#1c1917';
    for (let j = 0; j < 4; j++) {
        ctx.fillRect(cx - 42, cy - 320 + j * 16, 6, 8);
        ctx.fillRect(cx + 36, cy - 320 + j * 16, 6, 8);
    }

    // 5. Heavy Aerial Bomb on Centerline Rack
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 8;

    // Bomb body
    const bombGrad = ctx.createLinearGradient(cx - 18, cy, cx + 18, cy);
    bombGrad.addColorStop(0, '#1e293b');
    bombGrad.addColorStop(0.4, '#64748b');
    bombGrad.addColorStop(0.7, '#475569');
    bombGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bombGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 40, 18, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bomb fins
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 20);
    ctx.lineTo(cx + 24, cy + 20);
    ctx.lineTo(cx, cy + 50);
    ctx.closePath();
    ctx.fill();

    // Bomb yellow nose stripe
    ctx.fillStyle = cYellow;
    ctx.fillRect(cx - 14, cy - 110, 28, 8);
    ctx.restore();

    // 6. Cockpit Canopy Glass (Multi-pane greenhouse)
    const glassGrad = ctx.createLinearGradient(cx - 20, cy - 200, cx + 20, cy - 100);
    glassGrad.addColorStop(0, cCockpitGlass);
    glassGrad.addColorStop(0.7, cCockpitGlassDark);
    glassGrad.addColorStop(1, '#0c4a6e');

    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 18, cy - 220, 36, 170, 14);
    ctx.fill();

    // Canopy frame struts (metal ribbing)
    ctx.strokeStyle = cCockpitFrame;
    ctx.lineWidth = 3.5;
    for (let f = cy - 200; f <= cy - 70; f += 25) {
        ctx.beginPath();
        ctx.moveTo(cx - 18, f);
        ctx.lineTo(cx + 18, f);
        ctx.stroke();
    }
    // Center spine of canopy
    ctx.beginPath();
    ctx.moveTo(cx, cy - 220);
    ctx.lineTo(cx, cy - 50);
    ctx.stroke();

    // Pilot & Gunner helmet dots
    ctx.fillStyle = '#d97706'; // Tan leather flight helmet
    ctx.beginPath();
    ctx.arc(cx, cy - 170, 7, 0, Math.PI * 2); // Pilot
    ctx.arc(cx, cy - 80, 6, 0, Math.PI * 2);  // Rear Gunner
    ctx.fill();

    // Rear machine gun barrel pointing aft
    ctx.strokeStyle = cGunmetal;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 65);
    ctx.lineTo(cx, cy - 25);
    ctx.stroke();

    // 7. Wing Cannons (20mm autocannons projecting from wings)
    ctx.fillStyle = cGunmetal;
    ctx.fillRect(cx - 180, cy - 150, 6, 55); // Left cannon
    ctx.fillRect(cx + 174, cy - 150, 6, 55); // Right cannon

    // Muzzle flash suppressors
    ctx.fillRect(cx - 182, cy - 156, 10, 6);
    ctx.fillRect(cx + 172, cy - 156, 10, 6);

    // 8. Propeller Spinner / Nose Hub
    const spinGrad = ctx.createRadialGradient(cx, cy - 355, 2, cx, cy - 355, 22);
    spinGrad.addColorStop(0, '#fef08a');
    spinGrad.addColorStop(0.5, cYellow);
    spinGrad.addColorStop(1, '#854d0e');
    ctx.fillStyle = spinGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - 355, 18, 0, Math.PI * 2);
    ctx.fill();

    // Propeller motion blur disk (subtle high-speed blur)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 355, 160, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 9. National Identification / Wing Markers
    // Subtle yellow wingtip bands (standard Eastern/Western theater markings)
    ctx.fillStyle = 'rgba(234, 179, 8, 0.75)';
    ctx.fillRect(cx - 435, cy - 65, 30, 60);
    ctx.fillRect(cx + 405, cy - 65, 30, 60);

    // Tail fin cross-strip
    ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
    ctx.fillRect(cx - 18, cy + 240, 36, 16);

    // 10. Clean Outer Border / Outline for crisp game readability
    ctx.strokeStyle = cOutline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Trace outer perimeter
    ctx.moveTo(cx, cy - 350);
    ctx.lineTo(cx + 40, cy - 260);
    ctx.lineTo(cx + 70, cy - 140);
    ctx.lineTo(cx + 200, cy - 110);
    ctx.lineTo(cx + 430, cy - 70);
    ctx.quadraticCurveTo(cx + 455, cy - 40, cx + 440, cy);
    ctx.lineTo(cx + 220, cy + 30);
    ctx.lineTo(cx + 80, cy + 60);
    ctx.lineTo(cx + 35, cy + 220);
    ctx.lineTo(cx + 170, cy + 260);
    ctx.lineTo(cx + 165, cy + 310);
    ctx.lineTo(cx + 25, cy + 325);
    ctx.lineTo(cx, cy + 380);
    ctx.lineTo(cx - 25, cy + 325);
    ctx.lineTo(cx - 165, cy + 310);
    ctx.lineTo(cx - 170, cy + 260);
    ctx.lineTo(cx - 35, cy + 220);
    ctx.lineTo(cx - 80, cy + 60);
    ctx.lineTo(cx - 220, cy + 30);
    ctx.lineTo(cx - 440, cy);
    ctx.quadraticCurveTo(cx - 455, cy - 40, cx - 430, cy - 70);
    ctx.lineTo(cx - 200, cy - 110);
    ctx.lineTo(cx - 70, cy - 140);
    ctx.lineTo(cx - 40, cy - 260);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

    return canvas;
}

const bomberCanvas = renderBomber();
const destUnit = path.join(__dirname, '../assets/tanks/unit_bomber.png');
const destCard = path.join(__dirname, '../assets/tanks/card_bomber.png');

fs.writeFileSync(destUnit, bomberCanvas.toBuffer('image/png'));
fs.writeFileSync(destCard, bomberCanvas.toBuffer('image/png'));
console.log('Saved unit_bomber.png and card_bomber.png');
