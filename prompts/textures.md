Battlefield
-----------

Create a top-down battlefield texture for a tank strategy game with these specifications:
Technical Requirements:
- Dimensions: 576×1408 pixels (18×44 tiles at 32px each)
- Vertical orientation (taller than wide)
- Tileable edges for potential expansion
- High contrast for tank visibility
- The tiles have to be visible so that the user knows in which tile he is deploying units.
Battlefield Layout:
- Top section (rows 0-20): Enemy deployment zone with defensive positions
- Middle section (rows 21-22): Horizontal river running across the battlefield
- Bottom section (rows 23-43): Player deployment zone
River location: Horizontal river running across rows 16-17 (middle section of battlefield)
Bridge crossings: Two separate bridges crossing the river
- Left bridge: Located at columns 2-4, spanning 3 tiles wide, aligned with left tower positions
- Right bridge: Located at columns 12-14, spanning 3 tiles wide, aligned with right tower positions
- Bridge gap: Open water section between the two bridges (columns 5-11) with no crossing points
Terrain Features:
- Base terrain: Mixed grass and dirt 
- River: Dark blue-gray water with subtle flow patterns, not too reflective
- Bridges: Concrete or metal bridge segments
Visual Style:
- Inspired by WWII European theater in the style of Clash Royale
- Muted color palette: Greens, browns, grays with battlefield wear
- Top-down perspective optimized for tank visibility
- No large obstacles that would block tank movement paths
- Clear visual distinction between zones without harsh borders
Lighting and Details:
- Consistent top-down lighting casting subtle shadows
- Texture variety to avoid repetitive patterns
Generate this as a seamless battlefield texture. Don't use any text in the image.

General Art Direction
----------------------
Overall cohesive style for all assets to help guide generation systems.
1) What: Global style guide.
2) Style: Top-down semi-stylized WWII-inspired military aesthetic; clean readable silhouettes; soft painted PBR-lite materials; slightly exaggerated proportions for clarity; muted natural palette (olive greens, desaturated browns, steel grays) with accent team colors (player blue: #2d7dd2, enemy red: #d22d2d); subtle ambient occlusion; no harsh photo textures; no text or logos.
3) Size: Not an image; guidance only.
4) Other: Maintain consistent light from top (no perspective foreshortening), crisp edges for tanks, avoid clutter; ensure strong contrast between interactive units and terrain; preserve transparent backgrounds (RGBA) where stated.

Tile Set (Base Terrain)
-----------------------
1) What: 32×32px tile textures set: grass variant A/B/C, worn dirt A/B, grass-dirt transition edges (N,E,S,W, corners), river water tile (animated 4-frame suggestion), shallow edge water, bridge deck, bridge shadow underlay, rubble/impact decal (optional overlay tile), deployment zone subtle overlay (player, enemy).
2) Style: Matches global guide; low-noise hand-painted; edge transition tiles with soft organic blending; water with slow directional flow streaks.
3) Size: Each tile 32×32px; sprite sheet recommended 512×512px (arranged grid with transparent padding) OR individual files; animation frames for water: 4 frames 32×32 each.
4) Other: All tiles perfectly tileable; keep color value range mid so tanks pop; deployment overlays: faint tinted grid (player: soft blue wash 15% opacity; enemy: soft red wash 15% opacity); rubble decal with transparent background.

Structures (Towers & HQ)
------------------------
1) What: Player HQ, Enemy HQ, Left Tower, Right Tower top-down sprites (idle) plus light damage (50% hp) and heavy damage (25% hp) variants.
2) Style: Fortified WWII bunker / command post hybrid; stylized readability; damage variants show scorch marks, partial debris; maintain footprint clarity.
3) Size: HQ 160×160px (covers 5×5 tiles); Towers 96×96px (3×3 tiles). Provide separate PNG per variant with transparency.
4) Other: Center anchor; subtle shadow ellipse baked at 30% opacity; neutral concrete tones; slight team-colored flag panel (blue or red) on roof for identification (keep flag simple geometric, no text/emblems).

Tank Unit Sprites (Card / Detail Art)
-------------------------------------
1) What: High-res top-down illustrations (NOT isometric) for 8 tank types: Scout, Lynx, Raptor (fast attack), Warrior, Centurion, Guardian, Fortress, Jaguar (TD), Howitzer (Artillery). One image per tank.
2) Style: Same global stylization; slight heroic exaggeration (turrets 10% larger, barrels 5% thicker) for readability; clean panel lines.
3) Size: 512×512px each, transparent background.
4) Other: Neutral base lighting; no dramatic perspective; keep barrel direction up (north); include subtle team-color neutral (gray) so tinting possible later (avoid hard-coded blue/red); avoid motion blur.

Tank Mini Icons (In-Game Cards)
-------------------------------
1) What: Simplified mini icon versions of each tank for card display (same list as above) focusing on silhouette; optional minimal shading.
2) Style: Flat+shaded hybrid; fewer details; thicker outlines (2-3px) in darker tone; consistent icon frame margin.
3) Size: 128×128px each (will scale down to ~96px); transparent background.
4) Other: Ensure silhouettes distinct (light vs heavy etc.); keep barrel pointing up; no background plate.

Ability Icons
-------------
1) What: Icons for abilities: Smoke Screen, Precision Shot, Siege Mode, Ambush, Artillery Strike, Hit and Run.
2) Style: Circular badge icons with rim; minimalistic pictograms; limited color palette; subtle gradient; consistent line weight.
3) Size: 256×256px each (export also 128px); transparent background.
4) Other: Visual metaphors: Smoke Screen (billowing plume), Precision Shot (crosshair over shell), Siege Mode (immobile tank with deployed braces), Ambush (silhouette emerging from foliage), Artillery Strike (falling shell cluster / arc), Hit and Run (speed lines trailing a tank silhouette). No text.

Projectile & FX Sprites
-----------------------
1) What: Shell projectile (standard), AP high-penetration shell (sleek), Artillery shell (larger), Explosion A/B (on impact), Smoke puff sequence (for smoke screen), Muzzle flash frames (small, medium, heavy), Dust wake for fast tank.
2) Style: Stylized concise shapes; bright core colors for explosions (white/yellow center, orange outer, minimal black smoke); smoke puffs soft alpha edges.
3) Size: Shells 32×32px (centered); Explosion frames 128×128px (5-frame animation); Smoke puff 96×96px (6 frames); Muzzle flashes 64×64px (3 frames per size); Dust wake 128×64px (4 frames along sheet). Transparent background.
4) Other: Provide sprite sheets per effect horizontally; keep frame-to-frame position centered (except dust which scrolls horizontally); alpha friendly edges; no motion blur.

UI Elements
-----------
1) What: Card frame (normal, selected, unavailable/disabled), Energy bar background + fill segment, Timer panel, Health bar (background + green/yellow/red fills), Deployment invalid overlay (red X translucent), Button styles (primary, secondary), Panel background tile (repeatable 64×64), Minimal icon set (energy lightning, skull for destroyed, shield for armor, speedometer for speed).
2) Style: Clean flat panels with subtle rivet / plate edging; slight inner shadow; semi-translucent dark steel backgrounds; accent neon blue for player interactive highlight.
3) Size: Card frame 180×240px (portrait); Energy bar 400×28px; Timer panel 200×80px; Health bar full 128×20px; Icons 64×64px; Panel tile 64×64px seamless.
4) Other: Transparent cutout center in card frame; export fills separately; maintain consistent 4px rounded corners; no text baked in.

Selection & Targeting Overlays
------------------------------
1) What: Tile highlight (idle, hover, invalid), Tank selection ring (player blue, enemy red), Attack range ring gradient, Path arrow marker sequence (start, mid, end), Bridge highlight marker.
2) Style: Glow-based overlays with soft outer fade; minimal interior noise.
3) Size: Tile highlight 32×32px; Selection ring 96×96px (fits medium tank); Range ring scalable vector-like (provide 512×512 transparent circle with 8px stroke); Path arrows 48×48px each.
4) Other: Premultiply alpha safe colors; invalid highlight uses desaturated red (#aa3333) at 55% opacity; hover uses light yellow (#ffe8a0) at 45%.

Damage & Status Indicators
--------------------------
1) What: Small icon overlays for statuses: Stunned (placeholder if future), Buff (damage up), Debuff (slow), Armor boost, Speed boost, Vision blocked (smoke). Also floating damage number background plate (generic neutral 64×32 with subtle gradient, empty of text).
2) Style: Simple symbolic icons, 1-2 colors plus outline, flat for readability.
3) Size: 64×64px each; number plate 128×64px.
4) Other: Transparent; no numerals; leave interior space for dynamic text.

Research Tree Node Icons
------------------------
1) What: Icons representing tech lines: Light, Medium, Heavy, Tank Destroyer, Artillery, Fast Attack. Distinct stylized tank silhouettes or artillery piece.
2) Style: Monochrome steel silhouette on circular muted background plate; subtle rim lighting.
3) Size: 192×192px.
4) Other: Transparent outside circle; consistent plate color (#3c4450) with 80% opacity.

Energy Orbs (Optional Animated)
-------------------------------
1) What: Animated energy orb frames (8 frames) to display current energy points.
2) Style: Glowing blue plasma orb with subtle swirling interior.
3) Size: Each frame 64×64px; sprite sheet 512×64px horizontal.
4) Other: Loop seamlessly; avoid flicker; center alignment consistent.

Consistency & Export Notes
--------------------------
1) What: Export guidance.
2) Style: N/A.
3) Size: N/A.
4) Other: Use PNG with alpha; maintain sRGB; avoid compression artifacts; name files logically (e.g., tile_grass_a.png, icon_ability_smoke.png). Ensure no copyrighted logos, text, or real-world insignia. All prompts to exclude brand names and avoid realistic photographic textures.

Extended Prompt Template (For Each Asset Above)
-----------------------------------------------
Use this structure when inputting into an image generator:
"[ASSET NAME] -- top-down view, [STYLE KEYWORDS], [SIZE], transparent background (if UI/unit/effect), no text, consistent lighting from above, stylized readable silhouette, muted WWII-inspired palette with subtle painterly texture, avoid clutter, game asset." Replace [ASSET NAME], [STYLE KEYWORDS], [SIZE].

