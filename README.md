# 🎲 1001 Game Nights

A modern web platform for hosting and playing multiplayer games with friends—featuring real-time lobbies, modular game logic, and bot support.

---

## 🚀 Quick Start

### Prerequisites

### Installation

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

## 🏗️ Project Structure

```
1001-game-nights/
├── package.json                    # Dependencies & scripts
├── tailwind.config.js              # Tailwind CSS config
├── tsconfig.json                   # TypeScript config (excludes old/)
├── .gitignore                      # Git ignore (includes **/old/**)
├── README.md                       # Project documentation
├── public/                         # Static assets
│   ├── index.html                  # HTML template
│   └── assets/                     # Game assets
│       ├── icon-dice-factory.jpg   # Game icons
│       ├── icon-war.jpg
│       └── icon-home.jpg
├── build/                          # Production build output
├── node_modules/                   # Dependencies
├── src/                            # Frontend React app
└── server/                         # Backend Node.js server
```
### Frontend (src/)
```
App.css
App.tsx
index.css
index.tsx
tree_src.txt

components/
   ExplorePage.tsx
   GamePage.tsx
   LandingPage.tsx
   LobbyPage.tsx
   games/
      dice-factory/
         DiceFactoryGame.tsx
         index.ts
         components/
            game/
               GameHeader.tsx
               GameLog.tsx
            market/
               ActiveFactoryEffects.tsx
               ActiveFactoryModifications.tsx
               AuctionModal.tsx
            player/
               DiceRenderer.tsx
               EffectHand.tsx
               OwnedModifications.tsx
               PlayedEffects.tsx
               PlayerDicePool.tsx
               PlayerList.tsx
         hooks/
            useDiceActions.ts
            useGameState.ts
         old/
            DiceFactoryGame.bak
         types/
            DiceFactoryTypes.ts
      war/
         EnhancedWarGame.tsx
         EnhancedWarSetup.tsx
         index.ts
         WarGame.tsx
         components/
         hooks/
            useWarActions.ts
            useWarGame.ts
         old/
            WarGame.bak
         types/
            WarTypes.ts
         utils/
            cardHelpers.ts
```

### Backend (server/)
```
index.bak
index.js
tree_server.txt

games/
   bots/
      BotSystem.js
      DiceFactoryBotHandler.js
      index.js
      WarBotHandler.js
   dice-factory/
      DiceFactoryGame.js
      index.js
      data/
         FactoryEffects.js
         FactoryModifications.js
         GameConstants.js
         ValidationRules.js
      old/
         dice-factory.bak
      systems/
         CollapseSystem.js
         DiceSystem.js
         FactorySystem.js
         ScoringSystem.js
         TurnSystem.js
      utils/
         DiceHelpers.js
         GameLogger.js
   war/
      EnhancedWarGame.js
      index.js
      WarGame.js
      events/
         basicWarEvents.js
         enhancedWarEvents.js
         index.js
      old/
         war.bak
      utils/
         warConstants.js
      variants/
         VariantRegistry.js
routes/
   api.js
socket/
   diceFactoryEvents.js
   lobbyEvents.js
   socketHandler.js
   warEvents.js
```
```

---

## 🎮 Features

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

## 🕹️ Games Available

### War (Card Game)
- 2–8 players (or bots)
- Play/Fold mechanics, multiple variants (e.g., Aces High)
- First to 5 points wins
- AI bots with different strategies
- Fast-paced, casual gameplay

### Dice Factory
- 2–6 players (or bots)
- Complex dice management, resource and risk balancing
- Modular systems: Dice, Scoring, Factory Modifications
- d4 → d12 dice progression, factory upgrades, and collapse events
- Strategic, longer-form gameplay

---

## 🧩 Architecture Overview

## 🔌 API & Socket Events

## REST API

## Socket.io Events (examples)

## 🛠️ Technical Stack

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

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