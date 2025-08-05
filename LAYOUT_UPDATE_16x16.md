# Battlefield Layout Update - 16x16 Configuration

## Changes Made

### Overview
Updated the battlefield layout from 21+2+21 rows to 16+2+16 rows (total: 34 rows instead of 44).

### Constants Updated (src/utils/constants.js)

1. **GAME_CONFIG.TILES_Y**: Changed from 44 to 34
2. **GAME_CONFIG.TILE_SIZE**: Updated calculation from `710/44` (~16px) to `710/34` (~21px)
3. **DEPLOYMENT_ZONES**:
   - Player zone: Changed from rows 23-43 to rows 18-33 (16 rows)
   - Enemy zone: Changed from rows 0-20 to rows 0-15 (16 rows)
4. **TOWER POSITIONS**:
   - Player towers: Side towers moved from row 38 to row 28, main tower from row 41 to row 31
   - Enemy towers: Unchanged (row 5 for side towers, row 2 for main tower)
   - Maintains same distance from battlefield borders

### Scene Updates (src/scenes/BattleScene.js)

1. **Center Line**: Updated from row 21.5 to row 16.5
2. **River Position**: Updated from rows 21-22 to rows 16-17
3. **Expanded Deployment Zones**:
   - Player expansion: Changed from rows 18-20 to rows 13-15
   - Enemy expansion: Changed from rows 23-25 to rows 18-20

### Pathfinding Updates (src/utils/pathfinding.js)

1. **River Detection**: Updated river row references from 21-22 to 16-17
2. **Cross-River Pathfinding**: Updated to use new river position for bridge detection

### Layout Summary

**New 34-row layout:**
- Rows 0-15: Enemy deployment zone (16 rows)
- Rows 16-17: River with bridges (2 rows)  
- Rows 18-33: Player deployment zone (16 rows)

**Tower positions maintained relative to borders:**
- Enemy: Side towers 5 rows from top, main tower 2 rows from top
- Player: Side towers 5 rows from bottom, main tower 2 rows from bottom

### Benefits

1. **More compact battlefield**: Fits better on displays with reduced vertical space
2. **Larger tiles**: Increased from ~16px to ~21px for better visibility
3. **Maintained tower positioning**: Towers remain at strategic positions relative to borders
4. **Preserved gameplay balance**: Same tower-to-border ratios maintained

### Testing

- Use `test_layout.html` to verify the new layout
- Check that deployment zones are correctly positioned
- Verify that pathfinding across the river still works
- Confirm tower positions are as expected
