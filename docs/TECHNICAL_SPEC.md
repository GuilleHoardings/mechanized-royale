# Technical Specification - Tank Tactics

## Architecture Overview

Tank Tactics is a **client-only browser game** built with Phaser 3 and vanilla JavaScript. No server required - everything runs locally in the browser with AI opponents providing the challenge.

### Game Style

**Clash Royale-inspired vertical battlefield**:
- Fixed camera view (no scrolling)
- Vertical layout: Player base at bottom, enemy base at top
- Deploy-only gameplay (no manual unit control)
- Units automatically advance and engage enemies

### Core Systems

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Game Engine   │    │   Client App    │    │  Local Storage  │
│   (Phaser 3)    │◄──►│  (JavaScript)   │◄──►│   (Browser)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Rendering Layer │    │  AI Opponents   │    │   Game Data     │
│ (WebGL/Canvas)  │    │ (Strategic AI)  │    │     (JSON)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture

### Scene Management
```javascript
// Scene hierarchy for client-only game
BootScene → MenuScene → BattleScene → ResultScene
    │           │           │            │
    ▼           ▼           ▼            ▼
PreloadAssets MainMenu  BattleField  Victory/Defeat
```

### Entity Component System
- **Entities**: Tanks, Buildings, Projectiles, Effects
- **Components**: Position, Health, Weapon, Movement, AI, Graphics
- **Systems**: Combat, Movement, Rendering, Input, AI Strategy

### State Management
```javascript
// Local game state (no server needed)
GameState = {
  player: { 
    tanks: [], 
    progress: { battlesWon: 0, tanksUnlocked: [] },
    statistics: { totalDamage: 0, accuracy: 0.85 }
  },
  battle: { 
    currentEnemy: 'ai_strategic',
    difficulty: 'normal',
    statistics: { /* detailed battle stats */ }
  },
  settings: { 
    soundEnabled: true, 
    graphics: 'high' 
  }
}

// Save/Load functions for local storage
function saveGameState() {
  localStorage.setItem('tankTacticsData', JSON.stringify(GameState));
}

function loadGameState() {
  const saved = localStorage.getItem('tankTacticsData');
  return saved ? JSON.parse(saved) : getDefaultGameState();
}
```

## AI Opponent System

### Strategic AI Architecture
```javascript
class AIOpponent {
  constructor(difficulty = 'normal') {
    this.strategy = 'balanced'; // aggressive, defensive, balanced
    this.difficulty = difficulty;
    this.energy = ENERGY_CONFIG.STARTING_ENERGY;
    this.decisionTimer = 0;
    this.playerAnalysis = {
      preferredTanks: [],
      aggressionLevel: 0.5,
      averageDeploymentSpeed: 3000
    };
  }
  
  updateStrategy() {
    // Analyze player behavior and adapt
    this.analyzePlayerBehavior();
    this.selectOptimalStrategy();
    this.planNextDeployment();
  }
}
```

### AI Decision Making
- **Reactive Deployment**: Counters player tank choices
- **Adaptive Strategy**: Changes tactics based on battle flow
- **Dynamic Difficulty**: Adjusts challenge level during battle
- **Behavioral Analysis**: Learns from player patterns

## Game Systems

### Tank System
```javascript
class Tank {
  constructor(config) {
    this.id = config.id;
    this.stats = config.stats; // HP, damage, speed, armor
    this.position = { x: 0, y: 0 };
    this.target = null;
    this.state = 'idle'; // idle, moving, fighting, destroyed
  }
  
  update(deltaTime) {
    this.processAI();
    this.updateMovement(deltaTime);
    this.updateCombat(deltaTime);
  }
}
```

### Combat System
```javascript
class CombatSystem {
  calculateDamage(attacker, target, hitAngle) {
    const baseDamage = attacker.weapon.damage;
    const penetration = attacker.weapon.penetration;
    const armor = this.getEffectiveArmor(target, hitAngle);
    
    // Realistic armor penetration mechanics
    const penetrationRatio = penetration / armor;
    if (penetrationRatio < 0.5) return 0; // Bounce
    
    const finalDamage = Math.floor(baseDamage * Math.min(penetrationRatio, 2.0));
    return Math.max(finalDamage, baseDamage * 0.1); // Minimum damage
  }
  
  // Enhanced visual feedback
  createHitEffect(x, y, damage, isPenetration) {
    const effectType = isPenetration ? 'critical' : 'bounce';
    this.showDamageNumber(x, y, damage, effectType);
    this.createExplosionEffect(x, y, damage / 50);
  }
}
```

### Deployment System (Clash Royale Style)
```javascript
class DeploymentManager {
  constructor() {
    this.energy = ENERGY_CONFIG.STARTING_ENERGY;
    this.maxEnergy = ENERGY_CONFIG.MAX_ENERGY;
    this.regenRate = ENERGY_CONFIG.REGEN_RATE; // per second
    this.hand = []; // 4 cards visible
    this.deck = []; // Player's tank collection
  }
  
  deployTank(cardIndex, worldPosition) {
    const card = this.hand[cardIndex];
    if (this.energy >= card.cost && this.isValidPosition(worldPosition)) {
      this.energy -= card.cost;
      this.createTank(card.tankId, worldPosition);
      this.cycleCards();
      this.updateStatistics('deploy', card);
      return true;
    }
    return false;
  }
  
  // Vertical deployment zones - no camera movement needed
  isValidPosition(worldPos) {
    // Player can deploy in bottom half of screen
    return worldPos.y >= GAME_CONFIG.HEIGHT / 2 && 
           worldPos.y <= GAME_CONFIG.HEIGHT - 100; // Leave space for UI
  }
}
```

## Battle Polish & Feedback Systems

### Enhanced Visual Effects
- **Muzzle Flash**: Dynamic lighting effects for weapon firing
- **Hit Effects**: Sparks, debris, and damage numbers
- **Explosion Effects**: Multi-layered particle systems

### Audio System
```javascript
class AudioManager {
  playSound(soundType, options = {}) {
    switch(soundType) {
      case 'tankFire':
        // Different sounds per tank type
        break;
      case 'armorPenetration':
        // Critical hit feedback
        break;
      case 'buildingDestroy':
        // Dramatic destruction audio
        break;
    }
  }
}
```

### Battle Statistics
- **Real-time Tracking**: Damage dealt, accuracy, critical hits
- **Overtime Mechanics**: Extended battles with dynamic win conditions
- **Performance Analysis**: Detailed post-battle statistics

## Asset Pipeline

### Image Assets
```
assets/
├── tanks/
│   ├── sprites/      # Tank sprite sheets
│   ├── portraits/    # Card artwork
│   └── icons/        # UI icons
├── environment/
│   ├── maps/         # Background maps
│   ├── buildings/    # Structures
│   └── effects/      # Explosions, smoke
└── ui/
    ├── buttons/      # Interface elements
    ├── frames/       # Card frames
    └── hud/          # HUD elements
```

### Audio Assets
```
audio/
├── sfx/
│   ├── weapons/      # Gun sounds
│   ├── engines/      # Tank movement
│   └── ambient/      # Environment
├── music/
│   ├── menu/         # Menu themes
│   └── battle/       # Combat music
└── voice/
    └── announcer/    # Battle callouts
```

### Data Files
```javascript
// Tank data structure (stored in constants.js)
{
  "light_tank": {
    "name": "Light Tank",
    "type": "light",
    "stats": {
      "hp": 180,
      "damage": 45,
      "penetration": 60,
      "armor": 25,
      "speed": 8,
      "rateOfFire": 1.8,
      "cost": 2
    }
  },
  "heavy_tank": {
    "name": "Heavy Tank", 
    "type": "heavy",
    "stats": {
      "hp": 420,
      "damage": 85,
      "penetration": 105,
      "armor": 75,
      "speed": 3,
      "rateOfFire": 0.8,
      "cost": 6
    }
  }
}
```

## Performance Optimization

### Client-Side Rendering
- **Object Pooling**: Reuse projectile and effect objects
- **Efficient Culling**: Only update visible entities
- **Sprite Optimization**: Custom tank graphics with minimal draw calls
- **Effect Management**: Controlled particle systems with cleanup

### Memory Management
```javascript
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = [];
    
    // Pre-populate pool for smooth gameplay
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
  
  acquire() {
    const obj = this.pool.pop() || this.createFn();
    this.active.push(obj);
    return obj;
  }
  
  release(obj) {
    const index = this.active.indexOf(obj);
    if (index > -1) {
      this.active.splice(index, 1);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
}
```

### Browser Optimization
- **Efficient Game Loop**: 60 FPS target with delta time
- **Local Storage**: Minimal data persistence
- **Canvas Rendering**: Optimized Phaser 3 WebGL pipeline

## Security & Validation

### Client-Side Protection
- **Input Validation**: Sanitize deployment positions and commands
- **Rate Limiting**: Prevent deployment spam through energy system
- **State Integrity**: Validate tank positions and health values
- **Cheat Prevention**: Reasonable bounds checking on all actions

## Testing Strategy

### Unit Tests
```javascript
// Example test for combat system
describe('CombatSystem', () => {
  test('calculates armor penetration correctly', () => {
    const lightTank = { weapon: { damage: 45, penetration: 60 } };
    const heavyTank = { armor: 75 };
    
    const damage = combatSystem.calculateDamage(lightTank, heavyTank);
    expect(damage).toBe(0); // Should bounce off heavy armor
  });
  
  test('handles critical hits properly', () => {
    const heavyTank = { weapon: { damage: 85, penetration: 105 } };
    const lightTank = { armor: 25 };
    
    const damage = combatSystem.calculateDamage(heavyTank, lightTank);
    expect(damage).toBeGreaterThan(85); // Should penetrate easily
  });
});
```

### Integration Tests
- Scene transition testing
- AI behavior validation  
- Local storage persistence
- Cross-browser compatibility

### Performance Tests
- 60 FPS maintenance with multiple tanks
- Memory usage monitoring
- Browser compatibility testing
- Mobile device optimization

## Deployment Strategy

### Development Environment
```bash
# Local development (no server needed!)
# Simply open index.html in browser
# Or use a simple HTTP server for development:
python -m http.server 8000
# or
npx serve .
```

### Production Deployment
```bash
# Static file hosting - any CDN or web host
# Examples:
# - GitHub Pages
# - Netlify 
# - Vercel
# - Any web server serving static files

# No build process needed - pure client-side!
```

### File Structure
```
TankTacticsPhaser/
├── index.html          # Main entry point
├── src/
│   ├── scenes/         # Phaser scenes
│   ├── constants.js    # Game configuration
│   └── utils.js        # Helper functions
├── assets/             # Game assets (if any)
└── docs/              # Documentation
```

## Analytics & Monitoring

### Client-Side Analytics
- Battle outcome tracking (localStorage)
- Player progression monitoring
- Performance metrics (FPS, load times)
- Error tracking and reporting

### Local Statistics
```javascript
// Track player performance locally
const playerStats = {
  battlesPlayed: 0,
  battlesWon: 0,
  totalDamageDealt: 0,
  favoriteStrategy: 'balanced',
  averageBattleTime: 180,
  accuracyRate: 0.68
};
```

### Browser Performance
- Memory usage monitoring
- Rendering performance tracking
- Input latency measurement
- Device compatibility testing
