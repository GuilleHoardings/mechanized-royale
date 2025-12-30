# Mechanized Royale - Clash Royale meets World of Tanks

A real-time strategy game that combines the fast-paced tower defense mechanics of Clash Royale with the tactical depth and progression system of World of Tanks.

## Game Concept

**Core Gameplay**: Deploy tank units on a battlefield to destroy AI enemy structures while defending your own base. Units move automatically toward targets, but players control deployment timing, positioning, and special abilities.

**Setting**: Modern/historical tank warfare with various tank types from different eras and nations.

## Key Features

- Real-time tactical combat with automatic unit movement
- Diverse tank roster with unique stats and abilities
- Research tree progression system
- Single-player campaign with AI opponents
- Upgrade and customization systems
- Achievement and unlocks system

## Technology Stack

- **Engine**: Phaser 3 (JavaScript via CDN)
- **Storage**: LocalStorage for player data and game state
- **Build Tool**: None - Pure HTML/CSS/JavaScript
- **Development**: Live Server extension for VS Code
- **Deployment**: Static hosting (GitHub Pages, Netlify, etc.)

## Development Philosophy

This project follows an iterative development approach where each milestone delivers a playable version of the game. We prioritize:

1. **Rapid prototyping** - Get something playable quickly
2. **Incremental complexity** - Add features one at a time
3. **Continuous testing** - Ensure each iteration works
4. **Player feedback integration** - Test and refine gameplay

## Project Structure

```
tank-tactics/
├── src/
│   ├── scenes/          # Game scenes (Menu, Battle, etc.)
│   ├── entities/        # Game objects (Tanks, Buildings, etc.)
│   ├── systems/         # Game systems (Combat, Movement, etc.)
│   ├── data/           # Game data (Tank stats, levels, etc.)
│   ├── ui/             # User interface components
│   └── utils/          # Helper functions
├── assets/             # Images, sounds, fonts
├── docs/              # Design documents
└── tests/             # Test files
```

## Getting Started

1. Open `index.html` in VS Code
2. Install "Live Server" extension if not already installed
3. Right-click `index.html` and select "Open with Live Server"
4. Game will open in browser at `http://127.0.0.1:5500`

## Current Status

🚧 **Phase 1: Foundation** - Setting up basic game structure and core mechanics
