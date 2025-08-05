# Attack Range Debug Feature

## Overview
Added a debug button to show the attack radius of all units in the game.

## How to Use
1. Start the game by opening `index.html` in a web browser
2. Navigate to the Battle Scene
3. Look for the orange "Toggle Attack Ranges" button in the top-right corner
4. Click the button to show/hide attack range circles for all tanks

## Features Added

### Visual Indicators
- **Player tanks**: Green circles showing attack range
- **Enemy tanks**: Red circles showing attack range
- **Transparency**: Circles are semi-transparent to not obstruct gameplay

### Behavior
- Attack range circles are dynamically created/destroyed when tanks are deployed/destroyed
- Circles move with tanks as they move around the battlefield
- Debug mode can be toggled on/off at any time during battle
- State persists while tanks remain alive
- Circles are properly cleaned up when tanks are destroyed or scene changes

### Technical Implementation

#### Files Modified:
1. **`src/utils/constants.js`**: Added debug configuration constants
2. **`src/scenes/BattleScene.js`**: Added attack range visualization logic
3. **`index.html`**: Added toggle button and click handler

#### Key Methods Added:
- `toggleAttackRanges()`: Main toggle function
- `showAllAttackRanges()`: Creates circles for all existing tanks
- `hideAllAttackRanges()`: Removes all attack range circles
- `createAttackRangeCircle(tank)`: Creates circle for a specific tank
- `updateAttackRangeCircle(tank)`: Updates circle position when tank moves

#### Configuration:
```javascript
UI_CONFIG.DEBUG.ATTACK_RANGE_CIRCLES: {
    ENABLED: false,           // Initial state
    PLAYER_COLOR: 0x00ff00,   // Green for player tanks
    ENEMY_COLOR: 0xff0000,    // Red for enemy tanks
    LINE_WIDTH: 2,            // Circle line thickness
    ALPHA: 0.4               // Transparency level
}
```

## Testing
1. Deploy some tanks and click "Toggle Attack Ranges" - circles should appear
2. Move tanks around - circles should follow them
3. Deploy new tanks with debug mode on - they should automatically get circles
4. Destroy tanks - their circles should be removed
5. Toggle off - all circles should disappear
6. Toggle back on - circles should reappear for alive tanks

## Visual Design
- Attack ranges are displayed as circular outlines
- Player tank ranges: Bright green (#00ff00)
- Enemy tank ranges: Bright red (#ff0000)
- Semi-transparent (40% alpha) to maintain gameplay visibility
- Rendered below tanks but above terrain (depth: 5)
