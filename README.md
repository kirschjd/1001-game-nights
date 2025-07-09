# 🎲 1001 Game Nights

A modern web platform for hosting and playing multiplayer games with friends—featuring real-time lobbies, modular game logic, and bot support.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm (or yarn)

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
├── server/           # Node.js backend (Express + Socket.io)
│   ├── games/        # Game logic (modular)
│   ├── routes/       # REST API endpoints
│   ├── socket/       # Socket.io event handlers
│   └── index.js      # Server entry point
├── src/              # React frontend (TypeScript)
│   ├── components/   # Pages & game UIs
│   └── index.tsx     # React entry
├── public/           # Static assets
├── package.json      # Scripts & dependencies
└── README.md
```

---

## 🎮 Features

- **Real-time multiplayer** with Socket.io
- **Dynamic lobby creation** (unique 3-word URLs)
- **Leader-based lobby control**
- **Player reconnection** and state recovery
- **Bot player support** for all games
- **Game selection and modular game logic**
- **Responsive UI** (Tailwind CSS)
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
- 3–5 players (or bots)
- Complex dice management, resource and risk balancing
- Modular systems: Dice, Scoring, Collapse, Factory Effects
- d4 → d20 dice progression, factory upgrades, and collapse events
- Strategic, longer-form gameplay

---

## 🧩 Architecture Overview

- **Backend:** Node.js + Express, modular game logic, Socket.io for real-time events, REST API for comments/lobbies, in-memory data (DB planned)
- **Frontend:** React 18 + TypeScript, modular game UIs, custom hooks for state/actions, Tailwind CSS
- **Bots:** Pluggable bot system for all games
- **Game logic:** Each game implements `initialize`, `processAction`, `getPlayerView`, `isGameComplete`

---

## 🔌 API & Socket Events

### REST API
- `POST /api/comments` — Submit user comments
- `GET /api/comments` — Retrieve comments (admin)
- `GET /api/lobbies/:slug` — Get lobby info

### Socket.io Events (examples)
- `join-lobby` — Player joins a lobby
- `update-lobby-title` — Leader updates lobby title
- `update-player-name` — Player changes their name
- `change-leader` — Transfer lobby leadership
- `start-game` — Leader starts the game
- `game-action` — Player submits a game action
- `reconnect` — Player reconnects to lobby/game

---

## 🛠️ Technical Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, Socket.io
- **Bots:** Modular bot system (Node.js)
- **Database:** In-memory (persistent DB planned)
- **Deployment:** Railway.app, or any Node.js host

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

Created by John Kirschenheiter
Powered by OpenAI, Anthropic, and Railway.app

---

For questions or support, use the comments feature in the app or create an issue on GitHub.