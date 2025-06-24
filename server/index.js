// 1001 Game Nights Server
// Version: 1.2.0 - Socket reconnection fixes and enhanced undo system
// Updated: December 2024

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import game classes
const WarGame = require('./games/war');
const DiceFactoryGame = require('./games/dice-factory');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for React
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000"
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

// In-memory storage (replace with database in production)
const lobbies = new Map();
const games = new Map();
const comments = [];

// Helper function to broadcast dice factory game updates
function broadcastDiceFactoryUpdate(lobbySlug, game) {
  const lobby = lobbies.get(lobbySlug);
  if (!lobby) return;

  lobby.players.forEach(player => {
    if (player.isConnected) {
      const playerView = game.getPlayerView(player.id);
      io.to(player.id).emit('game-state-updated', playerView);
    }
  });
}

// API Routes
app.post('/api/comments', (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  const comment = {
    id: uuidv4(),
    content: content.trim(),
    timestamp: new Date().toISOString(),
    ip: req.ip
  };
  
  comments.push(comment);
  console.log('New comment received');
  
  res.json({ success: true, id: comment.id });
});

app.get('/api/comments', (req, res) => {
  res.json(comments);
});

app.get('/api/lobbies/:slug', (req, res) => {
  const lobby = lobbies.get(req.params.slug);
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }
  res.json(lobby);
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Player joins or rejoins a lobby
  socket.on('join-lobby', (data) => {
    const { slug, playerName } = data;
    
    if (!slug || !playerName) {
      socket.emit('error', { message: 'Missing slug or player name' });
      return;
    }

    // Get or create lobby
    let lobby = lobbies.get(slug);
    if (!lobby) {
      lobby = {
        slug,
        title: `${playerName}'s Game Night`,
        leaderId: socket.id,
        gameType: 'dice-factory',
        gameOptions: {},
        players: [],
        created: Date.now(),
        lastActivity: Date.now()
      };
      lobbies.set(slug, lobby);
      console.log(`Created new lobby: ${slug}`);
    }

    // Check if player is already in lobby (reconnection)
    let existingPlayer = lobby.players.find(p => p.name === playerName);
    
    if (existingPlayer) {
      // Player reconnecting - update their socket ID
      const oldSocketId = existingPlayer.id;
      existingPlayer.id = socket.id;
      existingPlayer.isConnected = true;
      
      console.log(`Player ${playerName} reconnected to ${slug}`);
      
      // Update socket ID in active game if it exists
      const game = games.get(slug);
      if (game && game.state && game.state.players) {
        const gamePlayer = game.state.players.find(p => p.id === oldSocketId);
        if (gamePlayer) {
          gamePlayer.id = socket.id;
        } else {
          // Fallback: try to find by name
          const gamePlayerByName = game.state.players.find(p => p.name === playerName);
          if (gamePlayerByName) {
            gamePlayerByName.id = socket.id;
          } else {
            console.log(`Warning: Could not find game player ${playerName} to update socket ID`);
          }
        }
      }
    } else {
      // New player joining
      const newPlayer = {
        id: socket.id,
        name: playerName,
        isConnected: true,
        joinedAt: Date.now()
      };
      lobby.players.push(newPlayer);
      console.log(`Player ${playerName} joined lobby ${slug}`);
    }

    // Store lobby info on socket
    socket.lobbySlug = slug;
    socket.playerName = playerName;

    // Join socket room
    socket.join(slug);
    lobby.lastActivity = Date.now();

    // Send lobby state to all players
    io.to(slug).emit('lobby-updated', {
      slug: lobby.slug,
      title: lobby.title,
      players: lobby.players,
      leaderId: lobby.leaderId,
      gameType: lobby.gameType,
      gameOptions: lobby.gameOptions
    });

    // If there's an active game, send the game state
    const game = games.get(slug);
    if (game) {
      const playerView = game.getPlayerView(socket.id);
      socket.emit('game-started', playerView);
    }
  });

  // Update lobby title (leader only)
  socket.on('update-lobby-title', (data) => {
    const { slug, newTitle } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    lobby.title = newTitle;
    io.to(slug).emit('lobby-updated', lobby);
  });

  // Update player name
  socket.on('update-player-name', (data) => {
    const { slug, newName } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (player) {
      player.name = newName;
      socket.playerName = newName;
      io.to(slug).emit('lobby-updated', lobby);
    }
  });

  // Update game type (leader only)
  socket.on('update-game-type', (data) => {
    const { slug, gameType } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    lobby.gameType = gameType;
    io.to(slug).emit('lobby-updated', lobby);
  });

  // Change lobby leader
  socket.on('change-leader', (data) => {
    const { slug, newLeaderId } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    const newLeader = lobby.players.find(p => p.id === newLeaderId);
    if (newLeader) {
      lobby.leaderId = newLeaderId;
      io.to(slug).emit('lobby-updated', lobby);
    }
  });

  // Start a new game (leader only)
  socket.on('start-game', (data) => {
    const { slug } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return;
    }

    const connectedPlayers = lobby.players.filter(p => p.isConnected);
    if (connectedPlayers.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    // Create appropriate game instance
    let game;
    
    if (lobby.gameType === 'war') {
      game = new WarGame(connectedPlayers);
      game.dealCards();
    } else if (lobby.gameType === 'dice-factory') {
      game = new DiceFactoryGame(connectedPlayers);
      game.state.phase = 'playing';
      connectedPlayers.forEach(player => {
        game.savePlayerTurnState(player.id);
      });
    } else {
      socket.emit('error', { message: 'Invalid game type' });
      return;
    }

    games.set(slug, game);
    lobby.currentGame = game.state.type;

    console.log(`Started ${lobby.gameType} game in lobby ${slug} with ${connectedPlayers.length} players`);

    // Send initial game state to all players
    connectedPlayers.forEach(player => {
      if (player.isConnected) {
        const playerView = game.getPlayerView(player.id);
        io.to(player.id).emit('game-started', playerView);
      }
    });
  });

  // War game events
  socket.on('war-player-action', (data) => {
    const { action } = data;
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'war') {
      return;
    }
    
    const result = game.playerAction(socket.id, action);
    if (result.success) {
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        lobby.players.forEach(player => {
          if (player.isConnected) {
            const playerView = game.getPlayerView(player.id);
            io.to(player.id).emit('game-state-updated', playerView);
          }
        });
      }
    }
  });

  socket.on('war-next-round', () => {
    const lobby = lobbies.get(socket.lobbySlug);
    const game = games.get(socket.lobbySlug);
    
    if (!game || !lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    const result = game.nextRound();
    if (result.success) {
      lobby.players.forEach(player => {
        if (player.isConnected) {
          const playerView = game.getPlayerView(player.id);
          io.to(player.id).emit('game-state-updated', playerView);
        }
      });
    }
  });

  // Dice Factory game events
  socket.on('dice-factory-roll', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.rollDice(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Undo last action only
  socket.on('dice-factory-undo', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.undoLastAction(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Undo all actions back to turn start
  socket.on('dice-factory-undo-all', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.undoAllActions(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Start new game with same players (leader only)
  socket.on('dice-factory-new-game', () => {
    const lobby = lobbies.get(socket.lobbySlug);
    const game = games.get(socket.lobbySlug);
    
    if (!game || !lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    const result = game.startNewGame();
    if (result.success) {
      lobby.players.forEach(player => {
        game.savePlayerTurnState(player.id);
      });
      
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-promote', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.promoteDice(socket.id, data);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-recruit', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.recruitDice(socket.id, data.recruitingDieId);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-score-straight', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.scoreStraight(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
      socket.emit('dice-factory-scored', { 
        type: 'straight', 
        points: result.points 
      });
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-score-set', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.scoreSet(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
      socket.emit('dice-factory-scored', { 
        type: 'set', 
        points: result.points 
      });
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-modify-die', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.modifyDieValue(socket.id, data.dieId, data.change);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-reroll-die', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.rerollDie(socket.id, data.dieId);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-flee', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.fleeFatory(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
      
      if (game.isGameComplete()) {
        const lobby = lobbies.get(socket.lobbySlug);
        if (lobby) {
          lobby.currentGame = null;
          lobby.gameType = 'dice-factory';
        }
      }
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  socket.on('dice-factory-end-turn', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.setPlayerReady(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(socket.lobbySlug, game);
      
      if (game.isGameComplete()) {
        const lobby = lobbies.get(socket.lobbySlug);
        if (lobby) {
          lobby.currentGame = null;
          lobby.gameType = 'dice-factory';
        }
      }
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    if (socket.lobbySlug) {
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
          player.isConnected = false;
          
          // Clean up empty lobbies after 5 minutes
          setTimeout(() => {
            const currentLobby = lobbies.get(socket.lobbySlug);
            if (currentLobby && currentLobby.players.every(p => !p.isConnected)) {
              lobbies.delete(socket.lobbySlug);
              games.delete(socket.lobbySlug);
              console.log(`Cleaned up empty lobby: ${socket.lobbySlug}`);
            }
          }, 5 * 60 * 1000);
        }
      }
    }
  });
});

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});