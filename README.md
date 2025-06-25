# 🎲 1001 Game Nights

A web application for hosting multiplayer games with dynamic lobby creation and real-time gameplay synchronization.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

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
   # Run both server and client in development mode
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - React frontend on `http://localhost:3000`

### Production Deployment

1. **Build the client**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 🏗️ Project Structure

```
1001-game-nights/
├── server/
│   ├── games/
│   │   ├── dice-factory.js    
│   │   ├── war.js      
│   └── index.js              # Express server with Socket.io
├── src/
│   ├── components/
│   │   ├── LandingPage.tsx    # Main homepage
│   │   ├── LobbyPage.tsx      # Lobby management
│   │   ├── ExplorePage.tsx    # Game catalog
│   │   └── GamePage.tsx       # Game interface
│   │   ├── games
│   │   │   ├── DiceFactoryGame.tsx    
│   │   │   ├── DiceRenderer.tsx      
│   │   │   └── WarGame.tsx       
│   ├── App.tsx               # Main React app
│   ├── App.css               # Styles
│   └── index.tsx             # React entry point
├── public/
│   ├── assets/
│   └── index.html            # HTML template
├── package.json              # All dependencies
├── tailwind.config.js        # Tailwind configuration
└── README.md
```

## 🎮 Features

### Current Implementation
- ✅ Dynamic lobby creation with random 3-word URLs
- ✅ Real-time player management with Socket.io
- ✅ Leader-based lobby control
- ✅ Game selection interface
- ✅ Comments system backend
- ✅ Bug tracking checklist
- ✅ Responsive design with Tailwind CSS

### Games Available
- **War** (Ready for implementation)
  - Simple card game with Play/Fold mechanics
  - 2-8 players, 5-10 minutes
  
- **Dice Factory** (Ready for implementation)
  - Complex dice management game
  - 3-5 players, 45-60 minutes

### Planned Features
- 🔄 Full War game implementation
- 🔄 Full Dice Factory game implementation
- 🔄 Bot player support
- 🔄 Game-specific options
- 🔄 Player reconnection handling
- 🔄 Game replay system

## 🌐 Deployment

### Railway.app Setup

1. **Connect your GitHub repository to Railway**
2. **Set environment variables:**
   ```
   NODE_ENV=production
   PORT=3001
   ```
3. **Deploy:**
   - Railway will automatically build and deploy
   - The build process runs `npm run build` then `npm start`

### Domain Configuration
- Main domain: `1001gamenights.com`
- Lobby URLs: `1001gamenights.com/lobby/horse-hat-wickerbasket`

## 🔧 API Endpoints

### REST API
- `POST /api/comments` - Submit user comments
- `GET /api/comments` - Retrieve comments (admin)
- `GET /api/lobbies/:slug` - Get lobby information

### Socket.io Events
- `join-lobby` - Player joins a lobby
- `update-lobby-title` - Leader updates lobby title
- `update-player-name` - Player changes their name
- `change-leader` - Transfer lobby leadership
- `start-game` - Leader starts the game

## 🎯 Development Workflow

1. **Make changes** to the codebase
2. **Test locally** with `npm run dev`
3. **Commit changes** to GitHub
4. **Deploy automatically** via Railway.app
5. **Test live** at your Railway URL

## 🛠️ Technical Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + Socket.io
- **Database:** In-memory (planned: SQLite/PostgreSQL)
- **Deployment:** Railway.app
- **Real-time:** WebSocket connections for live updates

## 🎲 Game Development

### Adding New Games

1. **Define game interface** in `server/index.js`
2. **Create game component** in `client/src/components/games/`
3. **Add to game catalog** in `ExplorePage.tsx`
4. **Implement game logic** with Socket.io events

### Game Framework

Each game implements:
- `initialize()` - Set up initial game state
- `processAction()` - Handle player actions
- `getPlayerView()` - Return player-specific game state
- `isGameComplete()` - Check for game end conditions

## 🐛 Known Issues

- Lobby title editing needs URL update functionality
- Mobile responsiveness needs improvement
- Game reconnection logic not implemented
- Database persistence not yet added

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

Created by John Kirschenheiter  
Powered by Claude and Railway.app

---

For questions or support, please use the comments feature in the app or create an issue on GitHub.