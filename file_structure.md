# 1001 Game Nights - Complete Project Structure

## 📁 Root Structure
```
1001-game-nights/
├── 📄 package.json                    # Dependencies & scripts
├── 📄 tailwind.config.js              # Tailwind CSS config
├── 📄 tsconfig.json                   # TypeScript config (excludes old/)
├── 📄 .gitignore                      # Git ignore (includes **/old/**)
├── 📄 README.md                       # Project documentation
├── 📁 public/                         # Static assets
│   ├── 📄 index.html                  # HTML template
│   └── 📁 assets/                     # Game assets
│       ├── 🖼️ icon-dice-factory.jpg   # Game icons
│       ├── 🖼️ icon-war.jpg
│       └── 🖼️ icon-home.jpg
├── 📁 build/                          # Production build output
├── 📁 node_modules/                   # Dependencies
├── 📁 src/                           # Frontend React app
└── 📁 server/                        # Backend Node.js server
```

## 🎨 Frontend Structure (src/)
```
src/
├── 📄 index.tsx                      # React entry point
├── 📄 App.tsx                        # Main React app
├── 📄 App.css                        # Global styles
└── 📁 components/
    ├── 📄 LandingPage.tsx            # Homepage
    ├── 📄 LobbyPage.tsx              # Lobby management
    ├── 📄 ExplorePage.tsx            # Game catalog
    ├── 📄 GamePage.tsx               # Game interface router
    └── 📁 games/
        ├── 📄 WarGame.tsx            # War game component
        ├── 📁 dice-factory/          # 🎲 DICE FACTORY MODULE
        │   ├── 📄 DiceFactoryGame.tsx    # Main orchestrator
        │   ├── 📄 index.ts               # Export barrel
        │   ├── 📁 components/            # UI Components
        │   │   ├── 📄 GameHeader.tsx         # Turn counter, collapse status
        │   │   ├── 📄 FactoryEffects.tsx     # Factory effects display
        │   │   ├── 📄 PlayerDicePool.tsx     # Current player dice & actions
        │   │   ├── 📄 PlayerList.tsx         # Other players display
        │   │   ├── 📄 GameLog.tsx            # Game log component
        │   │   └── 📄 DiceRenderer.tsx       # Dice rendering (moved here)
        │   ├── 📁 hooks/                 # Custom React hooks
        │   │   ├── 📄 useGameState.ts        # State management
        │   │   └── 📄 useDiceActions.ts      # Action logic
        │   ├── 📁 types/                 # TypeScript definitions
        │   │   └── 📄 DiceFactoryTypes.ts    # All interfaces
        │   └── 📁 old.bak/              # Backup of original
        │       └── 📄 DiceFactoryGame.tsx    # Original monolithic component
        └── 📁 old/                      # Other backups
            └── 📄 DiceRenderer.tsx           # Original dice renderer
```

## 🖥️ Backend Structure (server/)
```
server/
├── 📄 index.js                      # Main Express server (modular v2.0)
├── 📁 routes/                       # API route handlers
│   └── 📄 api.js                        # REST API endpoints (/api/comments, /api/lobbies)
├── 📁 socket/                       # Socket.io event handlers
│   ├── 📄 socketHandler.js              # Main socket setup & orchestration
│   ├── 📄 lobbyEvents.js                # Lobby management (join, start, leader)
│   ├── 📄 warEvents.js                  # War game socket events
│   └── 📄 diceFactoryEvents.js          # Dice Factory socket events
├── 📁 games/                        # Game logic implementations
│   ├── 📄 war.js                        # War game logic
│   ├── 📄 index.js.backup               # Original monolithic server
│   └── 📁 dice-factory/             # 🎲 DICE FACTORY MODULE
│       ├── 📄 DiceFactoryGame.js        # Main game orchestrator
│       ├── 📄 index.js                  # Export barrel
│       ├── 📁 data/                     # Game data & configuration
│       │   ├── 📄 GameConstants.js          # Core constants (costs, tables)
│       │   ├── 📄 FactoryEffects.js         # One-time effects (7 pips)
│       │   ├── 📄 FactoryModifications.js   # Permanent modifications (9 pips)
│       │   └── 📄 ValidationRules.js        # Action validation logic
│       ├── 📁 systems/                  # Game logic systems
│       │   ├── 📄 DiceSystem.js             # Dice operations (roll, recruit, promote)
│       │   ├── 📄 ScoringSystem.js          # Scoring logic (straights, sets)
│       │   ├── 📄 CollapseSystem.js         # Factory collapse mechanics
│       │   ├── 📄 FactorySystem.js          # Effects & modifications handler
│       │   └── 📄 TurnSystem.js             # Turn & round management
│       ├── 📁 utils/                    # Utility functions
│       │   ├── 📄 DiceHelpers.js            # Dice manipulation utilities
│       │   └── 📄 GameLogger.js             # Game logging system
│       └── 📁 old/                      # Backup directory
│           └── 📄 dice-factory.js           # Original monolithic file
└── 📁 backups/                      # Server backups
    └── 📄 index.js.backup               # Original monolithic server
```

## 🔄 Data Flow Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Socket.io     │    │   Backend       │
│   Components    │◄──►│   Events        │◄──►│   Game Logic    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ React Hooks     │    │ Modular Socket  │    │ Modular         │
│ • useGameState  │    │ Events          │    │ Systems         │
│ • useDiceActions│    │ • lobbyEvents   │    │ • DiceSystem    │
│                 │    │ • warEvents     │    │ • ScoringSystem │
│                 │    │ • diceFactory   │    │ • FactorySystem │
│                 │    │   Events        │    │ • TurnSystem    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```
