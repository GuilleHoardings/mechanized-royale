# Technical Specification - Tank Tactics

## Architecture Overview

Tank Tactics uses a client-only architecture built on Phaser 3, designed for simplicity and ease of development without external dependencies.

### Core Systems

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Game Engine   │    │   Client App    │    │  Local Storage  │
│   (Phaser 3)    │◄──►│  (JavaScript)   │◄──►│   (Browser)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Rendering Layer │    │  UI Framework   │    │   Game Data     │
│ (WebGL/Canvas)  │    │   (HTML/CSS)    │    │     (JSON)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture

### Scene Management
```javascript
// Scene hierarchy
GameBootScene → MenuScene → BattleScene → ResultsScene
     │              │           │            │
     ▼              ▼           ▼            ▼
 PreloadAssets  MainMenu   BattleField   Victory/Defeat
```

### Entity Component System (ECS)
- **Entities**: Tanks, Buildings, Projectiles
- **Components**: Position, Health, Weapon, Movement, AI
- **Systems**: Combat, Movement, Rendering, Input

### State Management
```javascript
// Global game state stored in localStorage
GameState = {
  player: { tanks: [], resources: {}, progress: {} },
  battle: { entities: [], systems: [], timeline: [] },
  ui: { activeScreen: '', modalStack: [] },
  campaign: { currentMission: 1, unlockedMissions: [], stars: {} }
}

// Save/Load functions
function saveGameState() {
  localStorage.setItem('tankTacticsData', JSON.stringify(GameState));
}

function loadGameState() {
  const saved = localStorage.getItem('tankTacticsData');
  return saved ? JSON.parse(saved) : getDefaultGameState();
}
```

## Backend Architecture

### API Design
```
/api/v1/
├── auth/           # Player authentication
├── player/         # Player data and progress
├── battles/        # Match creation and results
├── tanks/          # Tank data and stats
├── research/       # Tech tree progression
└── social/         # Clans and friends
```

### Real-time Communication
- **Protocol**: WebSocket (Socket.io)
- **Message Types**: 
  - `tank_deploy`: Unit deployment
  - `ability_use`: Special abilities
  - `battle_state`: Sync game state
  - `battle_end`: Match conclusion

### Database Schema
```mongodb
// Player Collection
{
  _id: ObjectId,
  username: String,
  tanks: [{ tankId: String, level: Number, modules: {} }],
  research: { completedNodes: [], activeResearch: {} },
  stats: { battles: Number, wins: Number, rating: Number }
}

// Battle Collection
{
  _id: ObjectId,
  players: [playerId1, playerId2],
  result: { winner: String, duration: Number },
  replay: { events: [], finalState: {} }
}
```

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
    
    if (penetration < armor) return 0; // Bounce
    
    const damageReduction = armor / penetration * 0.5;
    return Math.max(baseDamage * (1 - damageReduction), baseDamage * 0.25);
  }
}
```

### Deployment System
```javascript
class DeploymentManager {
  constructor() {
    this.energy = 10;
    this.maxEnergy = 10;
    this.regenRate = 1; // per second
    this.hand = []; // 4 cards visible
    this.deck = []; // 8 cards total
  }
  
  deployTank(cardIndex, position) {
    const card = this.hand[cardIndex];
    if (this.energy >= card.cost) {
      this.energy -= card.cost;
      this.createTank(card.tankId, position);
      this.cycleCards();
    }
  }
}
```

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
// Tank data structure
{
  "id": "tank_t34",
  "name": "T-34",
  "nation": "ussr",
  "tier": 5,
  "type": "medium",
  "stats": {
    "hp": 460,
    "speed": 56,
    "damage": 110,
    "penetration": 112,
    "armor": { "front": 45, "side": 40, "rear": 40 }
  },
  "cost": 4,
  "abilities": ["smoke_screen"]
}
```

## Performance Optimization

### Rendering Optimization
- **Object Pooling**: Reuse projectile and effect objects
- **Culling**: Only render visible entities
- **LOD System**: Lower detail for distant objects
- **Sprite Batching**: Group similar sprites in draw calls

### Memory Management
```javascript
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = [];
    
    // Pre-populate pool
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

### Network Optimization
- **Delta Compression**: Only send changed data
- **Client Prediction**: Smooth movement with rollback
- **Lag Compensation**: Adjust for network delays
- **State Synchronization**: Periodic full state updates

## Security Considerations

### Client-Side Protection
- **Input Validation**: Sanitize all user inputs
- **Rate Limiting**: Prevent deployment spam
- **State Verification**: Server validates all actions
- **Anti-Cheat**: Monitor for impossible actions

### Server-Side Security
- **Authentication**: JWT tokens for sessions
- **Authorization**: Role-based access control
- **Data Encryption**: HTTPS for all communication
- **SQL Injection**: Parameterized queries only

## Testing Strategy

### Unit Tests
```javascript
// Example test for combat system
describe('CombatSystem', () => {
  test('calculates damage correctly', () => {
    const attacker = new Tank({ weapon: { damage: 100, penetration: 120 } });
    const target = new Tank({ armor: { front: 80 } });
    
    const damage = combatSystem.calculateDamage(attacker, target, 0);
    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThan(100);
  });
});
```

### Integration Tests
- API endpoint testing
- Database operation testing
- Real-time communication testing
- Cross-browser compatibility

### Performance Tests
- Load testing with multiple concurrent users
- Memory leak detection
- FPS benchmarking on target devices
- Network latency simulation

## Deployment Strategy

### Development Environment
```bash
# Local development
npm run dev        # Start development server
npm run test       # Run test suite
npm run lint       # Code quality checks
```

### Production Deployment
```dockerfile
# Dockerfile for production
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### CI/CD Pipeline
1. **Commit** → Run tests and linting
2. **Pull Request** → Run full test suite
3. **Merge** → Build and deploy to staging
4. **Release** → Deploy to production with rollback capability

## Monitoring and Analytics

### Performance Monitoring
- FPS tracking and reporting
- Memory usage monitoring
- Network latency measurement
- Error rate tracking

### Game Analytics
- Player progression tracking
- Battle outcome analysis
- Feature usage statistics
- Retention funnel analysis

### Infrastructure Monitoring
- Server response times
- Database query performance
- WebSocket connection stability
- Resource utilization
