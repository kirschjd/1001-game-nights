// 1001 Game Nights Server
// Version: 2.0.0 - Modular server architecture
// Updated: December 2024

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import modular components
const apiRoutes = require('./routes/api');
const { initializeSocketHandlers } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Socket.io setup
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

// Make storage available to routes
app.locals.lobbies = lobbies;
app.locals.games = games;

// API Routes
app.use('/api', apiRoutes);

// Initialize socket event handlers
initializeSocketHandlers(io, lobbies, games);

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🎲 1001 Game Nights - Modular Architecture v2.0');
});