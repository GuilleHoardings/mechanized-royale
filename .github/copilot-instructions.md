# Copilot Instructions - Tank Tactics

## Project Architecture

Tank Tactics is a **client-only Phaser 3 game** combining Clash Royale-style deployment with World of Tanks combat. No build tools - pure HTML/JS with Live Server for development.

### Core Game Loop
1. **Deployment Phase**: Player selects cards (4 visible from 8-card deck) and deploys tanks using energy system
2. **Combat Phase**: Tanks auto-move/fight using pathfinding across tile-based battlefield with river/bridges
3. **AI Opponent**: Strategic AI adapts tactics based on player behavior and battlefield state

## Key Architectural Patterns

### Tile-Based Coordinate System
- **World coords** (pixels) vs **tile coords** (grid): Use `GameHelpers.worldToTile()` and `GameHelpers.tileToWorld()`
- Battlefield: 18×44 tiles, river at rows 21-22, bridges provide crossing points
- Deployment zones: Player (rows 23-43), Enemy (rows 0-20)

### Tank Graphics Generation
Tanks are procedurally drawn with `createTankGraphics()` - no sprite assets. Each tank type has distinct visual characteristics:
```javascript
// Team colors differentiate player (blue) vs AI (red)
const playerColor = 0x2d7dd2; // Blue
const enemyColor = 0xd22d2d;  // Red
```

### Energy & Card System
- Energy regenerates at variable rate: 1 every 2.8s (normal time, first 2 minutes), 1 every 1.4s (double time, last minute)
- Cards cycle automatically when deployed - use `cycleCard(usedCardIndex)`
- Tank costs defined in `TANK_DATA` constants

## Critical Systems

### Pathfinding (`src/utils/pathfinding.js`)
- A* pathfinding for river crossings only
- Use `Pathfinding.needsPathfinding(startPos, endPos)` to check if simple movement suffices
- Tanks use bridge choke points (columns 6-11) to cross river

### AI Strategy (`BattleScene.updateAIStrategy()`)
- AI modes: 'aggressive', 'defensive', 'balanced'
- Reactive deployment based on player tank count and types
- Strategic tank selection from `aiDeck` filtered by energy cost and preferences

### Tank Combat & Movement
- Tanks auto-target nearest enemy/building using `updateTankAI()`
- Health bars update via `updateTankHealth()` and `updateBuildingHealth()`
- Tank properties: `health`, `maxHealth`, `isPlayerTank`, `target`, `path`, `pathIndex`

## Development Workflow

### Running the Game
1. Right-click `index.html` → "Open with Live Server"
2. Game loads at `http://127.0.0.1:5500`
3. All data persists to localStorage via `GameHelpers.saveGameState()`

### Adding New Tanks
1. Define in `src/data/tanks.js` with stats, cost, abilities
2. Add visual representation in `createTankGraphics()` switch statement
3. Create mini version in `createMiniTankGraphics()` for cards
4. Update AI deck preferences if needed

### Debugging Combat
- Battle statistics tracked in `this.battleStats` (player/ai/battle sections)
- Tank targeting visible via console logs in `deployTank()`
- Tower health displayed in real-time via `updateTowerStatusDisplay()`

## Key Constants & Data

### Game Configuration (`src/utils/constants.js`)
- `GAME_CONFIG`: Viewport (600×800), tile system (18×44)
- `TANK_TYPES`: Light, Medium, Heavy, Tank Destroyer, Artillery, Fast Attack
- `BATTLE_CONFIG`: 3-min battles, tower positions, deployment zones
- `ENERGY_CONFIG`: Starting/max energy, regen rates

### Tank Data (`src/data/tanks.js`)
- Tank stats: hp, damage, speed, range, armor (front/side/rear), penetration, cost
- Abilities system for special powers (smoke_screen, precision_shot, etc.)
- Research tree structure for progression

## Common Gotchas

- **Coordinate confusion**: Always distinguish tile vs world coordinates
- **Tank graphics**: Use `isPlayerTank` parameter to set correct team colors
- **River crossing**: Tanks need pathfinding OR will get stuck at river edge
- **Card cycling**: Update both hand array AND visual display when cards change
- **Health bar positioning**: Health bars are separate graphics objects that need manual positioning updates

## Things to Avoid
- **Avoid screen shake**: It can be disorienting; never use it for anything.
- **Avoid inline styles**: Use CSS classes for styling instead of inline styles.
