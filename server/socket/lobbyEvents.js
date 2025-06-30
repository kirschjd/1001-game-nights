// 1001 Game Nights - Lobby Socket Events
// Version: 2.0.1 - Fixed leader reconnection logic and bot scheduling
// Updated: December 2024

const WarGame = require('../games/war');
const DiceFactoryGame = require('../games/dice-factory');
const { botSystem } = require('../games/bots');

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

    console.log(`🔌 Player ${playerName} (${socket.id}) attempting to join lobby ${slug}`);

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
      console.log(`✨ Created new lobby: ${slug} with leader: ${socket.id}`);
    }

    // Check if player is already in lobby (reconnection)
    let existingPlayer = lobby.players.find(p => p.name === playerName);
    
    if (existingPlayer) {
      // Player reconnecting - update their socket ID
      const oldSocketId = existingPlayer.id;
      const wasLeader = lobby.leaderId === oldSocketId; // Check if they were the leader
      
      console.log(`🔄 Player ${playerName} reconnecting. Old ID: ${oldSocketId}, New ID: ${socket.id}`);
      console.log(`👑 Was leader? ${wasLeader} (lobby.leaderId: ${lobby.leaderId})`);
      
      existingPlayer.id = socket.id;
      existingPlayer.isConnected = true;
      
      // CRITICAL FIX: Preserve leader status on reconnection
      if (wasLeader) {
        lobby.leaderId = socket.id;
        console.log(`✅ Leader ${playerName} reconnected and preserved leader status. New leaderId: ${socket.id}`);
      } else {
        console.log(`✅ Player ${playerName} reconnected to ${slug}`);
      }
      
      // Update socket ID in active game if it exists
      const game = games.get(slug);
      if (game && game.state && game.state.players) {
        const gamePlayer = game.state.players.find(p => p.id === oldSocketId);
        if (gamePlayer) {
          gamePlayer.id = socket.id;
          console.log(`🎮 Updated game player socket ID: ${oldSocketId} → ${socket.id}`);
        } else {
          // Fallback: try to find by name
          const gamePlayerByName = game.state.players.find(p => p.name === playerName);
          if (gamePlayerByName) {
            gamePlayerByName.id = socket.id;
            console.log(`🎮 Updated game player socket ID by name: ${playerName} → ${socket.id}`);
          } else {
            console.log(`⚠️ Warning: Could not find game player ${playerName} to update socket ID`);
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
      console.log(`👥 Player ${playerName} joined lobby ${slug}`);
    }

    // Store lobby info on socket
    socket.lobbySlug = slug;
    socket.playerName = playerName;

    // Join socket room
    socket.join(slug);
    lobby.lastActivity = Date.now();

    console.log(`📊 Final lobby state - leaderId: ${lobby.leaderId}, players: ${lobby.players.length}`);

    // Send lobby state to all players
    const lobbyUpdate = {
      slug: lobby.slug,
      title: lobby.title,
      players: lobby.players,
      leaderId: lobby.leaderId,
      gameType: lobby.gameType,
      gameOptions: lobby.gameOptions
    };
    
    console.log(`📡 Broadcasting lobby-updated with leaderId: ${lobbyUpdate.leaderId}`);
    io.to(slug).emit('lobby-updated', lobbyUpdate);

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
      console.log(`❌ Title update denied for ${socket.id} (not leader of ${slug})`);
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
      console.log(`❌ Game type update denied for ${socket.id} (not leader of ${slug})`);
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
      console.log(`❌ Leader change denied for ${socket.id} (not current leader of ${slug})`);
      return;
    }
    
    const newLeader = lobby.players.find(p => p.id === newLeaderId);
    if (newLeader) {
      const oldLeaderId = lobby.leaderId;
      lobby.leaderId = newLeaderId;
      console.log(`👑 Leadership transferred in ${slug}: ${oldLeaderId} → ${newLeaderId}`);
      io.to(slug).emit('lobby-updated', lobby);
    }
  });

  // Start a new game (leader only)
  socket.on('start-game', (data) => {
    const { slug } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      console.log(`❌ Game start denied for ${socket.id} (not leader of ${slug})`);
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
      
      // CRITICAL: Ensure bot flags are preserved in game state
      console.log('🔧 PRESERVING BOT FLAGS IN DICE FACTORY GAME:');
      connectedPlayers.forEach((lobbyPlayer, index) => {
        const gamePlayer = game.state.players[index];
        if (gamePlayer && botSystem.isBot(lobbyPlayer.id)) {
          console.log(`  Setting isBot=true for ${gamePlayer.name} (${gamePlayer.id})`);
          gamePlayer.isBot = true;
          gamePlayer.botStyle = lobbyPlayer.botStyle;
        }
      });
    } else {
      socket.emit('error', { message: 'Invalid game type' });
      return;
    }

    games.set(slug, game);
    lobby.currentGame = game.state.type;

    console.log(`🚀 Started ${lobby.gameType} game in lobby ${slug} with ${connectedPlayers.length} players`);

    // Send initial game state to all players
    connectedPlayers.forEach(player => {
      if (player.isConnected) {
        const playerView = game.getPlayerView(player.id);
        io.to(player.id).emit('game-started', playerView);
      }
    });
    
    // CRITICAL: Schedule initial bots for Dice Factory
    if (lobby.gameType === 'dice-factory') {
      console.log('🎮 DICE FACTORY GAME STARTED - Scheduling initial bots');
      
      // Schedule bots after a short delay to let game state settle
      setTimeout(() => {
        scheduleDiceFactoryBotsIfNeeded(io, slug, game, lobbies);
      }, 1000);
    }
  });

  // Helper function for dice factory bot scheduling
  function scheduleDiceFactoryBotsIfNeeded(io, lobbySlug, game, lobbies) {
    if (game.state.type !== 'dice-factory' || game.state.phase !== 'playing') {
      return;
    }
    
    const pendingBots = game.getPendingBotPlayers ? game.getPendingBotPlayers() : [];
    if (pendingBots.length === 0) {
      return;
    }

    console.log(`🤖 Scheduling ${pendingBots.length} dice factory bots from lobby events`);

    botSystem.scheduleBotActions(
      lobbySlug, 
      game.getGameState(), 
      (botId, action) => {
        // Handle bot action
        const result = game.setPlayerReady(botId);
        if (result.success) {
          // Broadcast update
          const lobby = lobbies.get(lobbySlug);
          if (lobby) {
            lobby.players.forEach(player => {
              if (player.isConnected && !botSystem.isBot(player.id)) {
                const playerView = game.getPlayerView(player.id);
                io.to(player.id).emit('game-state-updated', playerView);
              }
            });
          }
        }
      }
    );
  }

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);
    
    if (socket.lobbySlug) {
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
          player.isConnected = false;
          console.log(`😴 Player ${player.name} marked as disconnected in ${socket.lobbySlug}`);
          
          // Clean up empty lobbies after 5 minutes
          setTimeout(() => {
            const currentLobby = lobbies.get(socket.lobbySlug);
            if (currentLobby && currentLobby.players.every(p => !p.isConnected)) {
              lobbies.delete(socket.lobbySlug);
              games.delete(socket.lobbySlug);
              console.log(`🧹 Cleaned up empty lobby: ${socket.lobbySlug}`);
            }
          }, 5 * 60 * 1000);
        }
      }
    }
  });

  // Add bot to lobby (leader only) - UPDATED FOR DICE FACTORY SUPPORT
  socket.on('add-bot', (data) => {
    console.log('🤖 ADD-BOT EVENT TRIGGERED:', {
      socketId: socket.id,
      data: data,
      timestamp: new Date().toISOString()
    });
    
    const { slug, botName, botStyle } = data;
    const lobby = lobbies.get(slug);

    if (!lobby || lobby.leaderId !== socket.id) {
      console.log('❌ ADD-BOT REJECTED - Not leader or no lobby');
      return;
    }

    console.log('✅ ADD-BOT PROCEEDING - Creating bot...');
    
    // Use the current lobby's game type for bot creation
    const gameType = lobby.gameType || 'dice-factory';
    const bot = botSystem.createBot(botStyle, gameType);
    bot.name = botName;
    bot.botStyle = botStyle;

    console.log('🎯 BOT CREATED:', {
      botId: bot.id,
      botName: bot.name,
      botStyle: bot.style,
      gameType: gameType,
      lobbyPlayerCountBefore: lobby.players.length
    });

    lobby.players.push(bot);
    
    console.log('📊 LOBBY AFTER BOT ADD:', {
      totalPlayers: lobby.players.length,
      botCount: lobby.players.filter(p => p.isBot).length,
      humanCount: lobby.players.filter(p => !p.isBot).length
    });

    io.to(slug).emit('lobby-updated', lobby);
    console.log('📡 LOBBY-UPDATED EMITTED');
  });

  // Remove bot from lobby (leader only)
  socket.on('remove-bot', (data) => {
    const { slug, botId } = data;
    const lobby = lobbies.get(slug);

    if (!lobby || lobby.leaderId !== socket.id) {
      return;
    }

    lobby.players = lobby.players.filter(p => p.id !== botId);

    botSystem.removeBot(botId);

    io.to(slug).emit('lobby-updated', lobby);
  });

  // Handle explicit game state requests
  socket.on('request-game-state', (data) => {
    const { slug } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug in game state request' });
      return;
    }

    console.log(`🎮 Game state requested for lobby: ${slug} by ${socket.id}`);

    const game = games.get(slug);

    if (game) {
      // Game exists - send current state
      console.log(`✅ Sending game state for ${slug}`);
      const playerView = game.getPlayerView(socket.id);
      socket.emit('game-started', playerView);
    } else {
      // No game running - inform client
      console.log(`❌ No game running in lobby ${slug} - informing client`);
      socket.emit('no-game-running', { slug });
    }
  });

  // Change bot style (leader only)
  socket.on('change-bot-style', (data) => {
    const { slug, botId, newStyle } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return;
    }
  
    const bot = lobby.players.find(p => p.id === botId && p.isBot);
    if (bot) {
      bot.botStyle = newStyle;
      io.to(slug).emit('lobby-updated', lobby);
    }
  });
}

module.exports = { registerLobbyEvents };