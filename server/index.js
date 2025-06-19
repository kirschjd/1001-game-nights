const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import game modules
const WarGame = require('./games/war');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database later)
const lobbies = new Map();
const games = new Map(); // Store active game instances
const comments = [];

// Cleanup inactive lobbies every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [slug, lobby] of lobbies.entries()) {
    // Delete lobby if empty for more than 5 minutes
    if (lobby.players.length === 0 && (now - lobby.lastActivity) > 5 * 60 * 1000) {
      lobbies.delete(slug);
      games.delete(slug); // Also cleanup game instance
      console.log(`Cleaned up empty lobby: ${slug}`);
    }
  }
}, 5 * 60 * 1000);

// API Routes
app.post('/api/comments', (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content required' });
  }
  
  const comment = {
    id: uuidv4(),
    content: content.trim(),
    timestamp: new Date().toISOString(),
    ip: req.ip
  };
  
  comments.push(comment);
  console.log('New comment:', comment);
  res.json({ success: true });
});

app.get('/api/comments', (req, res) => {
  // Only return comments without IP addresses for privacy
  const publicComments = comments.map(({ ip, ...comment }) => comment);
  res.json(publicComments);
});

app.get('/api/lobbies/:slug', (req, res) => {
  const { slug } = req.params;
  const lobby = lobbies.get(slug);
  
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }
  
  res.json({
    slug: lobby.slug,
    title: lobby.title,
    players: lobby.players,
    leaderId: lobby.leaderId,
    gameType: lobby.gameType,
    gameOptions: lobby.gameOptions
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-lobby', (data) => {
    const { slug, playerName } = data;
    
    // Get or create lobby
    let lobby = lobbies.get(slug);
    if (!lobby) {
      lobby = {
        slug,
        title: slug,
        players: [],
        leaderId: null,
        gameType: 'war', // default game
        gameOptions: {},
        gameState: null,
        lastActivity: Date.now()
      };
      lobbies.set(slug, lobby);
    }
    
    // Check if player already exists by name (for reconnection)
    let player = lobby.players.find(p => p.name === playerName);
    if (!player) {
      // New player
      player = {
        id: socket.id,
        name: playerName || `Player ${lobby.players.length + 1}`,
        isConnected: true,
        joinedAt: new Date().toISOString()
      };
      
      lobby.players.push(player);
      console.log(`New player ${player.name} joined lobby ${slug}`);
      
      // First player becomes leader
      if (!lobby.leaderId) {
        lobby.leaderId = player.id;
      }
    } else {
      // Reconnecting player - update their socket ID
      const wasDisconnected = !player.isConnected;
      const oldId = player.id;
      player.id = socket.id;
      player.isConnected = true;
      
      // Update player ID in active game if it exists
      const game = games.get(slug);
      if (game && game.state && game.state.players) {
        const gamePlayer = game.state.players.find(p => p.name === playerName);
        if (gamePlayer) {
          console.log(`Updating game player ID from ${gamePlayer.id} to ${socket.id} for ${playerName}`);
          gamePlayer.id = socket.id;
        }
      }
      
      if (wasDisconnected) {
        console.log(`Player ${player.name} reconnected to lobby ${slug} (${oldId} -> ${socket.id})`);
      } else {
        console.log(`Player ${player.name} updated socket ID in lobby ${slug} (${oldId} -> ${socket.id})`);
      }
      
      // If this was the leader and they were disconnected, restore leadership
      if (lobby.leaderId === oldId || !lobby.players.find(p => p.id === lobby.leaderId && p.isConnected)) {
        lobby.leaderId = player.id;
      }
    }
    
    lobby.lastActivity = Date.now();
    
    // Join socket room
    socket.join(slug);
    socket.lobbySlug = slug;
    socket.playerId = player.id;
    socket.playerName = player.name;
    
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
      console.log(`Sending existing game state to ${player.name} (ID: ${socket.id})`);
      const playerView = game.getPlayerView(socket.id);
      socket.emit('game-started', playerView);
    }
  });
  
  socket.on('update-lobby-title', (data) => {
    const { slug, newTitle } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return; // Only leader can update title
    }
    
    lobby.title = newTitle;
    lobby.lastActivity = Date.now();
    
    io.to(slug).emit('lobby-updated', {
      slug: lobby.slug,
      title: lobby.title,
      players: lobby.players,
      leaderId: lobby.leaderId,
      gameType: lobby.gameType,
      gameOptions: lobby.gameOptions
    });
  });
  
  socket.on('update-player-name', (data) => {
    const { slug, newName } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby) return;
    
    const player = lobby.players.find(p => p.id === socket.id);
    if (player) {
      const oldName = player.name;
      player.name = newName;
      socket.playerName = newName;
      lobby.lastActivity = Date.now();
      
      // Update name in active game if it exists
      const game = games.get(slug);
      if (game && game.state && game.state.players) {
        const gamePlayer = game.state.players.find(p => p.name === oldName);
        if (gamePlayer) {
          gamePlayer.name = newName;
        }
      }
      
      console.log(`Player ${oldName} changed name to ${newName} in lobby ${slug}`);
      
      io.to(slug).emit('lobby-updated', {
        slug: lobby.slug,
        title: lobby.title,
        players: lobby.players,
        leaderId: lobby.leaderId,
        gameType: lobby.gameType,
        gameOptions: lobby.gameOptions
      });
    }
  });

  socket.on('update-game-type', (data) => {
    const { slug, gameType } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return; // Only leader can update game type
    }
    
    lobby.gameType = gameType;
    lobby.lastActivity = Date.now();
    
    io.to(slug).emit('lobby-updated', {
      slug: lobby.slug,
      title: lobby.title,
      players: lobby.players,
      leaderId: lobby.leaderId,
      gameType: lobby.gameType,
      gameOptions: lobby.gameOptions
    });
    
    console.log(`Lobby ${slug} game type changed to ${gameType}`);
  });
  
  socket.on('change-leader', (data) => {
    const { slug, newLeaderId } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return; // Only current leader can change leadership
    }
    
    const newLeader = lobby.players.find(p => p.id === newLeaderId);
    if (newLeader) {
      lobby.leaderId = newLeaderId;
      lobby.lastActivity = Date.now();
      
      io.to(slug).emit('lobby-updated', {
        slug: lobby.slug,
        title: lobby.title,
        players: lobby.players,
        leaderId: lobby.leaderId,
        gameType: lobby.gameType,
        gameOptions: lobby.gameOptions
      });
    }
  });
  
  socket.on('start-game', (data) => {
    const { slug } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return; // Only leader can start game
    }
    
    // Create game instance based on type
    let game;
    if (lobby.gameType === 'war') {
      game = new WarGame(lobby.players.filter(p => p.isConnected));
      game.dealCards(); // Start first round
    } else if (lobby.gameType === 'dice-factory') {
      // TODO: Initialize Dice Factory game
      console.log('Dice Factory not implemented yet');
      return;
    }
    
    if (game) {
      games.set(slug, game);
      lobby.lastActivity = Date.now();
      
      console.log(`Started ${lobby.gameType} game in lobby ${slug} with ${lobby.players.filter(p => p.isConnected).length} players`);
      console.log('Game players:', game.state.players.map(p => `${p.name} (${p.id})`));
      
      // Send initial game state to all connected players
      lobby.players.forEach(player => {
        if (player.isConnected) {
          const playerView = game.getPlayerView(player.id);
          console.log(`Sending game start to ${player.name} (${player.id})`);
          io.to(player.id).emit('game-started', playerView);
        }
      });
    }
  });

  // War game specific events
  socket.on('war-player-action', (data) => {
    const { action } = data;
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'war') {
      console.log('No war game found for action');
      return;
    }
    
    console.log(`Player ${socket.playerName} (${socket.id}) chose to ${action}`);
    const result = game.playerAction(socket.id, action);
    if (result.success) {
      // Send updated game state to all players
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        lobby.players.forEach(player => {
          if (player.isConnected) {
            const playerView = game.getPlayerView(player.id);
            io.to(player.id).emit('game-state-updated', playerView);
          }
        });
      }
    } else {
      console.log('War action failed:', result.error);
    }
  });

  socket.on('war-next-round', () => {
    const lobby = lobbies.get(socket.lobbySlug);
    const game = games.get(socket.lobbySlug);
    
    if (!game || !lobby || lobby.leaderId !== socket.id) {
      return; // Only leader can advance rounds
    }
    
    console.log(`${socket.playerName} starting next round`);
    const result = game.nextRound();
    if (result.success) {
      // Send updated game state to all players
      lobby.players.forEach(player => {
        if (player.isConnected) {
          const playerView = game.getPlayerView(player.id);
          io.to(player.id).emit('game-state-updated', playerView);
        }
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.lobbySlug) {
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
          player.isConnected = false;
          lobby.lastActivity = Date.now();
          
          console.log(`Player ${player.name} disconnected from lobby ${socket.lobbySlug}`);
          
          // If leader disconnects, transfer leadership
          if (lobby.leaderId === socket.id) {
            const nextLeader = lobby.players.find(p => p.isConnected && p.id !== socket.id);
            if (nextLeader) {
              lobby.leaderId = nextLeader.id;
              console.log(`Leadership transferred to ${nextLeader.name}`);
            }
          }
          
          io.to(socket.lobbySlug).emit('lobby-updated', {
            slug: lobby.slug,
            title: lobby.title,
            players: lobby.players,
            leaderId: lobby.leaderId,
            gameType: lobby.gameType,
            gameOptions: lobby.gameOptions
          });
        }
      }
    }
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});