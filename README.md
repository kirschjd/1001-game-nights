# 🎲 1001 Game Nights

A modern web platform for hosting and playing multiplayer games with friends—featuring real-time lobbies, modular game logic, and bot support.

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/johnkirschenheiter/1001-game-nights.git
   cd 1001-game-nights
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Development setup**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:3001
   - Frontend: http://localhost:3000

4. **Production build**
   ```bash
   npm run build
   npm start
   ```

---

## Root Structure
```
1001-game-nights/
├── package.json                    # Dependencies & scripts
├── tailwind.config.js              # Tailwind CSS config
├── tsconfig.json                   # TypeScript config
├── .gitignore                      # Git ignore
├── README.md                       # Project documentation
├── PLAN.md                         # Implementation plans
├── file_structure.md               # This file
├── public/                         # Static assets
│   ├── index.html                  # HTML template
│   └── assets/                     # Game assets
│       ├── banner-main.jpg
│       ├── icon-dice-factory.jpg
│       ├── icon-heist-city.JPG
│       ├── icon-home.jpg
│       ├── icon-war.jpg
│       └── Cards/                  # Card images
├── build/                          # Production build output
├── node_modules/                   # Dependencies
├── src/                            # Frontend React app
└── server/                         # Backend Node.js server
```

## Frontend Structure (src/)
```
src/
├── index.tsx                       # React entry point
├── App.tsx                         # Main React app with routing
├── App.css                         # Global styles
│
├── constants/                      # Centralized constants
│   ├── index.ts                    # Barrel export
│   └── socketEvents.ts             # All socket event constants
│
├── contexts/                       # React contexts
│   └── SocketContext.tsx           # Socket.io connection management
│
├── shared/                         # Shared utilities
│   └── war/
│       └── cardUtils.ts            # War card utilities
│
├── utils/                          # Utility functions
│   └── lobbyUtils.ts               # Lobby utilities
│
└── components/
    ├── LandingPage.tsx             # Homepage
    ├── LobbyPage.tsx               # Lobby management (orchestrator)
    ├── ExplorePage.tsx             # Game catalog
    ├── GamePage.tsx                # Game interface router
    ├── AbilitySelectionModal.tsx   # DF ability selection
    ├── ConnectionStatus.tsx        # Connection indicator
    │
    ├── shared/                     # Shared UI components
    │   ├── index.ts
    │   └── GameHeader.tsx          # In-game header with player list
    │
    ├── lobby/                      # Lobby components (extracted from LobbyPage)
    │   ├── index.ts                # Barrel exports
    │   ├── LobbyHeader.tsx         # Header with game icon, title, back
    │   ├── LobbyTitleEditor.tsx    # Inline title editing + copy link
    │   ├── LobbyInfo.tsx           # Lobby features info box
    │   ├── PlayerList.tsx          # Player list container
    │   ├── PlayerListItem.tsx      # Individual player row
    │   ├── LeaderSelectModal.tsx   # Leader transfer modal
    │   ├── GameStartButton.tsx     # Start game button
    │   ├── options/                # Game-specific option panels
    │   │   ├── index.ts
    │   │   ├── WarOptions.tsx
    │   │   ├── DiceFactoryOptions.tsx
    │   │   ├── HenHurOptions.tsx
    │   │   ├── KillTeamDraftOptions.tsx
    │   │   └── HeistCityOptions.tsx
    │   └── rules/                  # Game rules panels
    │       ├── index.ts
    │       ├── GameRulesPanel.tsx  # Container switching by game type
    │       ├── WarRules.tsx
    │       ├── DiceFactoryRules.tsx
    │       ├── HenHurRules.tsx
    │       ├── KillTeamDraftRules.tsx
    │       └── HeistCityRules.tsx
    │
    └── games/                      # Game implementations
        │
        ├── war/                    # WAR GAME
        │   ├── index.ts
        │   ├── EnhancedWarGame.tsx
        │   ├── EnhancedWarSetup.tsx
        │   ├── hooks/
        │   │   ├── useWarActions.ts
        │   │   └── useWarGame.ts
        │   ├── types/
        │   │   └── WarTypes.ts
        │   └── utils/
        │       └── cardHelpers.ts
        │
        ├── dice-factory/           # DICE FACTORY (legacy)
        │   ├── index.ts
        │   ├── DiceFactoryGame.tsx
        │   ├── components/
        │   │   ├── game/
        │   │   │   ├── GameHeader.tsx
        │   │   │   └── GameLog.tsx
        │   │   ├── market/
        │   │   │   ├── ActiveFactoryEffects.tsx
        │   │   │   ├── ActiveFactoryModifications.tsx
        │   │   │   └── AuctionModal.tsx
        │   │   └── player/
        │   │       ├── DiceRenderer.tsx
        │   │       ├── EffectHand.tsx
        │   │       ├── OwnedModifications.tsx
        │   │       ├── PlayedEffects.tsx
        │   │       ├── PlayerDicePool.tsx
        │   │       └── PlayerList.tsx
        │   ├── hooks/
        │   │   ├── useDiceActions.ts
        │   │   ├── useGameState.ts
        │   │   └── useModifiedCosts.ts
        │   └── types/
        │       └── DiceFactoryTypes.ts
        │
        ├── dice-factory-v0.1.5/    # DICE FACTORY v0.1.5
        │   └── (same structure as dice-factory)
        │
        ├── dice-factory-v0.2.1/    # DICE FACTORY v0.2.1 (slot-based)
        │   ├── index.ts
        │   ├── DiceFactoryGame.tsx
        │   ├── DiceRenderer.tsx
        │   ├── types.ts
        │   └── data/
        │       └── abilityDecks.json
        │
        ├── henhur/                 # HENHUR
        │   ├── index.ts
        │   ├── init.ts
        │   ├── HenHurGameEnhanced.tsx
        │   ├── components/
        │   │   ├── AuctionTurnControls.tsx
        │   │   ├── CardHand.tsx
        │   │   ├── CardPool.tsx
        │   │   ├── CardSelectionModal.tsx
        │   │   ├── DeckManager.tsx
        │   │   ├── EnhancedPlayerMat.tsx
        │   │   ├── GamePhaseIndicator.tsx
        │   │   ├── LeftInfoDrawer.tsx
        │   │   ├── NewCardPool.tsx
        │   │   ├── PlayerHandSheet.tsx
        │   │   ├── PlayerMat.tsx
        │   │   ├── PlayerStatusDrawer.tsx
        │   │   ├── RaceMat.tsx
        │   │   ├── RaceTurnControls.tsx
        │   │   └── TokenSelector.tsx
        │   ├── data/
        │   │   ├── cardDatabase.ts
        │   │   ├── cards.ts
        │   │   └── cardTemplates.ts
        │   ├── hooks/
        │   │   └── useHenHurGame.ts
        │   ├── types/
        │   │   ├── card.types.ts
        │   │   └── game.types.ts
        │   └── utils/
        │       ├── cardDevTools.ts
        │       ├── cardImportExport.ts
        │       ├── cardUtils.ts
        │       ├── cardValidator.ts
        │       ├── effectExecutor.ts
        │       └── effectRegistry.ts
        │
        ├── heist-city/             # HEIST CITY
        │   ├── index.ts
        │   ├── HeistCityGame.tsx
        │   ├── components/
        │   │   ├── index.ts
        │   │   ├── AlertLevelIndicator.tsx
        │   │   ├── CharacterCard.tsx
        │   │   ├── CharacterToken.tsx
        │   │   ├── DiceRoller.tsx
        │   │   ├── GameLog.tsx
        │   │   ├── GameMap.tsx
        │   │   ├── MapItem.tsx
        │   │   ├── MapLegend.tsx
        │   │   ├── MapSettings.tsx
        │   │   ├── MapToolbar.tsx
        │   │   ├── MapZone.tsx
        │   │   └── ZonePropertiesPanel.tsx
        │   ├── data/
        │   │   ├── actionCosts.ts
        │   │   ├── characterStats.ts
        │   │   ├── enemyStats.ts
        │   │   ├── equipment.json
        │   │   ├── equipmentLoader.ts
        │   │   ├── gridUtils.ts
        │   │   ├── hexGridUtils.ts
        │   │   ├── initialMapState.ts
        │   │   ├── mapConstants.ts
        │   │   ├── mapLoader.ts
        │   │   ├── roleAbilities.ts
        │   │   ├── squareGridUtils.ts
        │   │   ├── stateAbilities.ts
        │   │   └── maps/
        │   │       ├── ballroom.json
        │   │       ├── bank-job.json
        │   │       ├── bank-job-hex.json
        │   │       ├── hex-demo.json
        │   │       ├── jail-break.json
        │   │       ├── server-hack.json
        │   │       ├── skyscrapper.json
        │   │       ├── train-robbery.json
        │   │       └── treasure-hunt.json
        │   └── types/
        │       └── index.ts
        │
        └── kill-team-draft/        # KILL TEAM DRAFT
            ├── KillTeamDraftGame.tsx
            └── components/
                ├── DraftCard.tsx
                ├── ExportDeckModal.tsx
                └── PackSelection.tsx
```

## Backend Structure (server/)
```
server/
├── index.js                        # Main Express server
│
├── routes/                         # API route handlers
│   └── api.js                      # REST API endpoints
│
├── socket/                         # Socket.io event handlers
│   ├── socketHandler.js            # Main socket orchestration
│   ├── lobbyEvents.js              # Lobby management events
│   ├── warEvents.js                # War game events
│   ├── diceFactoryEvents.js        # Dice Factory events
│   ├── henHurEvents.js             # HenHur events
│   ├── heistCityEvents.js          # Heist City events
│   ├── killTeamDraftEvents.js      # Kill Team Draft events
│   └── helpers/                    # Socket helpers
│       ├── gameInitHelpers.js
│       ├── lobbyHelpers.js
│       └── stateVersioning.js
│
├── utils/                          # Server utilities
│   └── persistence.js              # File-based persistence
│
├── data/                           # Persisted game/lobby data
│   ├── games/                      # Game state files
│   └── lobbies/                    # Lobby state files
│
└── games/                          # Game logic implementations
    │
    ├── bots/                       # Bot system
    │   ├── index.js
    │   ├── BotSystem.js
    │   ├── WarBotHandler.js
    │   ├── DiceFactoryBotHandler.js
    │   └── KillTeamDraftBotHandler.js
    │
    ├── war/                        # WAR GAME
    │   ├── index.js
    │   ├── WarGame.js
    │   ├── EnhancedWarGame.js
    │   ├── events/
    │   │   ├── index.js
    │   │   ├── basicWarEvents.js
    │   │   └── enhancedWarEvents.js
    │   ├── utils/
    │   │   └── warConstants.js
    │   └── variants/
    │       └── VariantRegistry.js
    │
    ├── dice-factory/               # DICE FACTORY (legacy)
    │   ├── index.js
    │   ├── DiceFactoryGame.js
    │   ├── data/
    │   │   ├── GameConstants.js
    │   │   ├── FactoryEffects.js
    │   │   ├── FactoryModifications.js
    │   │   └── ValidationRules.js
    │   ├── systems/
    │   │   ├── DiceSystem.js
    │   │   ├── ScoringSystem.js
    │   │   ├── CollapseSystem.js
    │   │   ├── FactorySystem.js
    │   │   └── TurnSystem.js
    │   └── utils/
    │       ├── DiceHelpers.js
    │       └── GameLogger.js
    │
    ├── dice-factory-v0.1.5/        # DICE FACTORY v0.1.5
    │   └── (same structure as dice-factory)
    │
    ├── dice-factory-v0.2.1/        # DICE FACTORY v0.2.1 (slot-based)
    │   ├── index.js
    │   ├── DiceFactoryGame.js
    │   ├── abilityDecks.json
    │   └── factoryCards.json
    │
    ├── henhur/                     # HENHUR
    │   ├── index.js
    │   ├── HenHurGame.js
    │   ├── HenHurGameEnhanced.js
    │   ├── cardData.js
    │   └── cardUtils.js
    │
    ├── heist-city/                 # HEIST CITY
    │   ├── index.js
    │   └── HeistCityGame.js
    │
    └── kill-team-draft/            # KILL TEAM DRAFT
        ├── index.js
        └── KillTeamDraftGame.js
```

---

## Socket Event Constants (src/constants/socketEvents.ts)
```typescript
SOCKET_EVENTS     // Core: connect, lobby, game lifecycle
WAR_EVENTS        // War game specific
DICE_FACTORY_EVENTS // Dice Factory (both versions)
HENHUR_EVENTS     // HenHur specific
HEIST_CITY_EVENTS // Heist City specific
KTD_EVENTS        // Kill Team Draft specific
```

## Data Flow Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Socket.io     │    │   Backend       │
│   Components    │◄──►│   Events        │◄──►│   Game Logic    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ React Hooks     │    │ Event Handlers  │    │ Game Modules    │
│ • useGameState  │    │ • lobbyEvents   │    │ • WarGame       │
│ • useDiceActions│    │ • warEvents     │    │ • DiceFactory   │
│ • useSocket     │    │ • diceFactory   │    │ • HenHur        │
│                 │    │ • henHurEvents  │    │ • HeistCity     │
│                 │    │ • heistCity     │    │ • KillTeamDraft │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Games Overview

| Game | Status | Description |
|------|--------|-------------|
| War | Complete | Strategic card game with variants |
| Dice Factory v0.1.5 | Complete | Factory effects, modifications, auctions |
| Dice Factory v0.2.1 | Complete | Slot-based ability system |
| HenHur | In Progress | Racing/auction card game |
| Heist City | In Progress | Squad-based tactical heist |
| Kill Team Draft | Complete | Card drafting for deck building |

---

## Site Features

- **Real-time multiplayer** with Socket.io
- **Dynamic lobby creation** 
- **Leader-based lobby control**
- **Player reconnection** and state recovery
- **Bot player support** for all games
- **Game selection and modular game logic**
- **Responsive UI** 
- **Comment/feedback system**
- **Bug tracking checklist**

---

## 📄 License

This project is licensed under the MIT License.

---

MIT License

Copyright (c) 2025 John Kirschenheiter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

For questions or support, use the comments feature in the app or create an issue on GitHub.