const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
const comments = [];

// Cleanup inactive lobbies every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [slug, lobby] of lobbies.entries()) {
    // Delete lobby if empty for more than 5 minutes
    if (lobby.players.length === 0 && (now - lobby.lastActivity) > 5 * 60 * 1000) {
      lobbies.delete(slug);
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
    
    // Check if player already exists (reconnection)
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
      
      // First player becomes leader
      if (!lobby.leaderId) {
        lobby.leaderId = player.id;
      }
    } else {
      // Reconnecting player
      player.id = socket.id;
      player.isConnected = true;
    }
    
    lobby.lastActivity = Date.now();
    
    // Join socket room
    socket.join(slug);
    socket.lobbySlug = slug;
    socket.playerId = player.id;
    
    // Send lobby state to all players
    io.to(slug).emit('lobby-updated', {
      slug: lobby.slug,
      title: lobby.title,
      players: lobby.players,
      leaderId: lobby.leaderId,
      gameType: lobby.gameType,
      gameOptions: lobby.gameOptions
    });
    
    console.log(`Player ${player.name} joined lobby ${slug}`);
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
      player.name = newName;
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
    
    // Initialize game based on type
    if (lobby.gameType === 'war') {
      initializeWarGame(lobby);
    } else if (lobby.gameType === 'dice-factory') {
      initializeDiceFactoryGame(lobby);
    }
    
    lobby.lastActivity = Date.now();
    
    io.to(slug).emit('game-started', {
      gameType: lobby.gameType,
      gameState: lobby.gameState
    });
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
          
          // If leader disconnects, transfer leadership
          if (lobby.leaderId === socket.id) {
            const nextLeader = lobby.players.find(p => p.isConnected && p.id !== socket.id);
            if (nextLeader) {
              lobby.leaderId = nextLeader.id;
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

// Game initialization functions (placeholders for now)
function initializeWarGame(lobby) {
  lobby.gameState = {
    type: 'war',
    phase: 'playing',
    round: 1,
    players: lobby.players.map(p => ({
      id: p.id,
      name: p.name,
      score: 0,
      card: Math.floor(Math.random() * 13) + 1, // 1-13 (Ace to King)
      hasPlayed: false,
      hasFolded: false
    }))
  };
}

function initializeDiceFactoryGame(lobby) {
  lobby.gameState = {
    type: 'dice-factory',
    phase: 'rolling',
    round: 1,
    turnCounter: 1,
    collapseStarted: false,
    collapseDice: [4, 6, 8],
    activeEffects: [], // Will be populated with random effects
    players: lobby.players.map(p => ({
      id: p.id,
      name: p.name,
      dicePool: [
        { sides: 4, value: null },
        { sides: 4, value: null },
        { sides: 4, value: null },
        { sides: 4, value: null }
      ],
      diceFloor: 4,
      freePips: 0,
      score: 0,
      hasFled: false
    }))
  };
}

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