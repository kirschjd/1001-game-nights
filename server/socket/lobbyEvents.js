// 1001 Game Nights - Lobby Socket Events
// Version: 2.0.0 - Extracted from main server file
// Updated: December 2024

const WarGame = require('../games/war');
const DiceFactoryGame = require('../games/dice-factory');

/**
 * Register lobby-related socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerLobbyEvents(io, socket, lobbies, games) {

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
}

module.exports = { registerLobbyEvents };