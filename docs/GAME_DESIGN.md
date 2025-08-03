# Game Design Document - Tank Tactics

## Executive Summary

Tank Tactics is a single-player real-time strategy game inspired by Clash Royale's vertical battlefield and deployment mechanics, combined with World of Tanks' authentic tank warfare and progression systems. Players battle against AI opponents using strategic deployment and tank variety.

## Core Gameplay Loop

### Battle Flow
1. **Preparation Phase** (Battle Setup)
   - View vertical battlefield: player base at bottom, enemy at top
   - Select 8 tank cards from collection
   - No camera control needed - entire battlefield visible

2. **Combat Phase** (3 minutes)
   - Deploy tanks in bottom half using energy system
   - Tanks automatically advance toward enemy base
   - AI handles all unit movement and engagement
   - Focus on strategic deployment timing and positioning

3. **Resolution**
   - Gain XP, credits, and research points
   - Unlock new tanks or upgrades
   - Progress through campaign missions

### Core Mechanics

#### Deployment System (Clash Royale Style)
- **Fixed Camera**: Vertical battlefield, no scrolling needed
- **Energy System**: Regenerating resource for deploying units
- **Card Hand**: 4 visible cards, cycle through 8-card deck
- **Deploy-Only Control**: Click to deploy tanks, they move automatically
- **Strategic Positioning**: Deploy anywhere in bottom half of battlefield

#### Tank Combat (World of Tanks inspired)
- **Armor Mechanics**: Frontal armor > side armor > rear armor
- **Penetration Values**: Different ammo types vs armor thickness
- **Weak Spots**: Specific target areas for critical damage
- **Vision System**: Spotting mechanics affect engagement range

#### Progression (World of Tanks inspired)
- **Research Trees**: Unlock tanks through tech trees by nation
- **Tank Upgrades**: Improve modules (gun, engine, armor)
- **Crew Skills**: Persistent bonuses that transfer between tanks
- **Equipment**: Purchasable items that enhance tank performance

## Tank Categories

### Light Tanks
- **Role**: Scouts, fast flankers
- **Examples**: T-50, Luchs, M5 Stuart
- **Gameplay**: Fast movement, good vision, weak armor
- **Cost**: Low energy cost (2-3 elixir)

### Medium Tanks
- **Role**: Versatile main battle units
- **Examples**: T-34, Panzer IV, Sherman
- **Gameplay**: Balanced stats, reliable damage
- **Cost**: Medium energy cost (4-5 elixir)

### Heavy Tanks
- **Role**: Breakthrough units, damage soaks
- **Examples**: KV-1, Tiger I, M6
- **Gameplay**: High HP and armor, slow movement
- **Cost**: High energy cost (6-7 elixir)

### Tank Destroyers
- **Role**: Anti-tank specialists
- **Examples**: StuG III, Hellcat, SU-85
- **Gameplay**: High damage, poor mobility
- **Cost**: Medium-high energy cost (5-6 elixir)

### Artillery
- **Role**: Long-range support
- **Examples**: Wespe, M7 Priest, SU-5
- **Gameplay**: Indirect fire, area damage
- **Cost**: High energy cost (6-8 elixir)

## Base Defense

### Defensive Structures
- **Main Base**: Primary objective (3000 HP)
- **Fuel Depot**: Secondary objective (1500 HP)
- **Anti-Tank Guns**: Static defense (800 HP)
- **Bunkers**: Infantry support (600 HP)
- **Tank Traps**: Slow enemy movement

### Base Layout
- Fixed defensive positions per map
- Multiple approach routes
- Choke points and flanking opportunities
- Terrain affects movement and cover

## Maps and Environments

### Map Types
1. **Urban Warfare**: City streets with buildings for cover
2. **Open Fields**: Long sightlines, minimal cover
3. **Forested Areas**: Limited vision, ambush opportunities
4. **Industrial Zones**: Mix of cover and open areas

## Progression Systems

### Research Trees
- **Nations**: Soviet, German, American, British, French
- **Tech Levels**: Tiers I-X representing historical progression
- **Branching Paths**: Multiple tank lines per nation
- **Prerequisites**: Some tanks require multiple previous tanks

### Tank Upgrades
- **Modules**: Gun, Turret, Engine, Tracks
- **Performance Impact**: Speed, damage, accuracy, health
- **Visual Changes**: Upgraded tanks look different
- **Cost**: Credits and research points

### Player Progression
- **Battle Pass**: Seasonal rewards and challenges
- **Achievements**: Long-term goals and milestones
- **Mastery Badges**: Tank-specific skill demonstrations
- **Clan Rewards**: Group activities and competitions

## Monetization Strategy

### Free-to-Play Elements
- All core gameplay accessible
- Earn premium currency through play
- Regular free content updates
- Optional cosmetic purchases

### Premium Features
- **Battle Pass**: Accelerated progression
- **Premium Tanks**: Unique vehicles with special abilities
- **Garage Slots**: Increased collection capacity
- **Crew Training**: Faster skill development

## Technical Requirements

### Performance Targets
- 60 FPS on mid-range mobile devices
- Sub-100ms input latency
- Offline practice mode available

### Platform Strategy
- Primary: Web browsers (desktop/mobile)
- Secondary: Mobile app (Cordova/PhoneGap)
- Future: Desktop standalone client

## Success Metrics

### Engagement
- Daily active users
- Session length and frequency
- Battle completion rate
- Progression milestones reached

### Retention
- 1-day, 7-day, 30-day retention
- Churn analysis by player level
- Feature usage statistics
- Community participation

### Revenue
- Conversion rate to paying users
- Average revenue per user (ARPU)
- Lifetime value (LTV)
- Premium feature adoption
