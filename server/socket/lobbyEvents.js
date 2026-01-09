// 1001 Game Nights - Lobby Socket Events
// Version: 2.0.4 - Added auto-transfer leadership on 5-sec disconnect
// Updated: December 2024

const { botSystem } = require('../games/bots');
const {
  createLobby,
  handlePlayerReconnection,
  addNewPlayer,
  createLobbyUpdate,
  validateLeaderPermission,
  scheduleInactiveLobbyCleanup
} = require('./helpers/lobbyHelpers');
const {
  createGame,
  broadcastGameStart,
  scheduleDiceFactoryBotsIfNeeded
} = require('./helpers/gameInitHelpers');
const { broadcastGameState } = require('./henHurEvents');
const persistence = require('../utils/persistence');

// Track pending leader transfer timeouts by lobby slug
const leaderTransferTimeouts = new Map();

// Leader auto-transfer timeout duration (5 seconds)
const LEADER_TRANSFER_TIMEOUT = 5000;

/**
 * Register lobby-related socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerLobbyEvents(io, socket, lobbies, games) {
  // Update Dice Factory variant (leader only)
  socket.on('update-df-variant', (data) => {
    const { slug, variant } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    lobby.gameOptions.variant = variant;
    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
  });

  // Update Dice Factory ability tiers (leader only)
  socket.on('update-df-ability-tiers', (data) => {
    const { slug, tiers } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    if (!lobby.gameOptions) {
      lobby.gameOptions = {};
    }
    lobby.gameOptions.abilityTiers = tiers;
    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
  });

  // Update Dice Factory selected abilities (leader only)
  socket.on('update-df-abilities', (data) => {
    const { slug, abilityIds } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    if (!lobby.gameOptions) {
      lobby.gameOptions = {};
    }
    lobby.gameOptions.selectedAbilities = abilityIds;
    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
  });

  // Update HenHur variant (leader only)
  socket.on('update-henhur-variant', (data) => {
    const { slug, variant } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    lobby.gameOptions.henhurVariant = variant;
    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
  });

  // Update Heist City map (leader only)
  socket.on('update-heist-city-map', (data) => {
    const { slug, mapId } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    lobby.gameOptions.mapId = mapId;
    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
  });

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
      lobby = createLobby(slug, playerName, socket.id);
      lobbies.set(slug, lobby);
      console.log(`✨ Created new lobby: ${slug} with leader: ${socket.id}`);
    }

    // Check if player is reconnecting or new
    const reconnectionResult = handlePlayerReconnection(lobby, playerName, socket.id, games);

    if (!reconnectionResult.isReconnection) {
      // New player joining
      addNewPlayer(lobby, playerName, socket.id);
    } else {
      // Player reconnected - notify others
      socket.to(slug).emit('player-reconnected', {
        playerName: playerName,
        playerId: socket.id,
        timestamp: Date.now()
      });
      console.log(`📢 Broadcast player-reconnected for ${playerName}`);

      // Cancel any pending leader transfer timeout if the leader reconnected
      if (reconnectionResult.wasLeader && leaderTransferTimeouts.has(slug)) {
        clearTimeout(leaderTransferTimeouts.get(slug));
        leaderTransferTimeouts.delete(slug);
        console.log(`✅ Cancelled leader auto-transfer for ${slug} - leader ${playerName} reconnected`);
      }
    }

    // Store lobby info on socket
    socket.lobbySlug = slug;
    socket.playerName = playerName;

    // Join socket room
    socket.join(slug);
    lobby.lastActivity = Date.now();

    console.log(`📊 Final lobby state - leaderId: ${lobby.leaderId}, players: ${lobby.players.length}`);

    // Send lobby state to all players
    const lobbyUpdate = createLobbyUpdate(lobby);
    console.log(`📡 Broadcasting lobby-updated with leaderId: ${lobbyUpdate.leaderId}`);
    io.to(slug).emit('lobby-updated', lobbyUpdate);

    // Persist lobby state
    persistence.saveLobby(slug, lobby);

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

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    lobby.title = newTitle;
    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
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
      persistence.saveLobby(slug, lobby);
    }
  });

  // Update game type (leader only)
  socket.on('update-game-type', (data) => {
    const { slug, gameType } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    // Remove all bots when game type changes (bots are game-type specific)
    const botsToRemove = lobby.players.filter(p => p.isBot);
    if (botsToRemove.length > 0) {
      botsToRemove.forEach(bot => {
        botSystem.removeBot(bot.id);
        console.log(`🤖 Removed bot ${bot.name} (${bot.id}) due to game type change`);
      });
      lobby.players = lobby.players.filter(p => !p.isBot);
      console.log(`🔄 Cleared ${botsToRemove.length} bot(s) when switching to ${gameType}`);
    }

    lobby.gameType = gameType;
    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
  });

  // Change lobby leader
  socket.on('change-leader', (data) => {
    const { slug, newLeaderId } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    const newLeader = lobby.players.find(p => p.id === newLeaderId);
    if (newLeader) {
      const oldLeaderId = lobby.leaderId;
      lobby.leaderId = newLeaderId;
      console.log(`👑 Leadership transferred in ${slug}: ${oldLeaderId} → ${newLeaderId}`);
      io.to(slug).emit('lobby-updated', lobby);
      persistence.saveLobby(slug, lobby);
    }
  });

  // Start a new game (leader only)
  socket.on('start-game', (data) => {
    const { slug, variant: clientVariant, version: clientVersion } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    const connectedPlayers = lobby.players.filter(p => p.isConnected);
    // Allow solo play for: HenHur, Heist City, Baduk Analysis, and Dice Factory v0.2.1
    const allowSolo = lobby.gameType === 'henhur' ||
                      lobby.gameType === 'heist-city' ||
                      lobby.gameType === 'baduk-analysis' ||
                      (lobby.gameType === 'dice-factory' && clientVersion === 'v0.2.1');
    if (!allowSolo && connectedPlayers.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    // Create appropriate game instance using helper
    // Use version for dice-factory, variant for other games
    const variantOrVersion = clientVersion || clientVariant;
    let game;
    try {
      game = createGame(lobby, connectedPlayers, variantOrVersion, botSystem);
    } catch (error) {
      socket.emit('error', { message: error.message });
      return;
    }

    games.set(slug, game);
    lobby.currentGame = game.state.type;

    console.log(`🚀 Started ${lobby.gameType} game in lobby ${slug} with ${connectedPlayers.length} players`);

    // Set up state change callback for HenHur
    if (lobby.gameType === 'henhur' && game.setStateChangeCallback) {
      game.setStateChangeCallback(() => {
        broadcastGameState(io, slug, game);
      });
    }

    // Broadcast game start to all players
    broadcastGameStart(io, game, connectedPlayers);

    // Schedule bots for Dice Factory
    if (lobby.gameType === 'dice-factory') {
      console.log('🎮 DICE FACTORY GAME STARTED - Scheduling initial bots');
      setTimeout(() => {
        scheduleDiceFactoryBotsIfNeeded(io, slug, game, lobbies, botSystem);
      }, 1000);
    }

    // Schedule bots for Kill Team Draft
    if (lobby.gameType === 'kill-team-draft') {
      console.log('🎮 KILL TEAM DRAFT STARTED - Scheduling bot drafters');
      const { scheduleBotActions } = require('./killTeamDraftEvents');
      setTimeout(() => {
        scheduleBotActions(io, lobbies, games, slug);
      }, 500);
    }

    // Persist lobby and game state (force save for game start)
    persistence.saveLobby(slug, lobby, true);
    persistence.saveGame(slug, game, true);
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);

    if (socket.lobbySlug) {
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.id);
        if (player && !player.isBot) {
          player.isConnected = false;
          const wasLeader = lobby.leaderId === socket.id;
          console.log(`😴 Player ${player.name} marked as disconnected in ${socket.lobbySlug}${wasLeader ? ' (was leader)' : ''}`);

          // Broadcast player disconnection to others in the lobby
          socket.to(socket.lobbySlug).emit('player-disconnected', {
            playerName: player.name,
            playerId: socket.id,
            timestamp: Date.now()
          });

          // Also send updated lobby state
          io.to(socket.lobbySlug).emit('lobby-updated', createLobbyUpdate(lobby));

          // Persist lobby state with disconnection
          persistence.saveLobby(socket.lobbySlug, lobby);

          // If the leader disconnected, schedule auto-transfer after 5 seconds
          if (wasLeader) {
            const lobbySlug = socket.lobbySlug;
            console.log(`⏰ Scheduling leader auto-transfer for ${lobbySlug} in ${LEADER_TRANSFER_TIMEOUT}ms`);

            // Clear any existing timeout for this lobby
            if (leaderTransferTimeouts.has(lobbySlug)) {
              clearTimeout(leaderTransferTimeouts.get(lobbySlug));
            }

            const timeoutId = setTimeout(() => {
              const currentLobby = lobbies.get(lobbySlug);
              if (!currentLobby) {
                leaderTransferTimeouts.delete(lobbySlug);
                return;
              }

              // Check if the original leader is still disconnected
              const originalLeader = currentLobby.players.find(p => p.id === currentLobby.leaderId);
              if (originalLeader && originalLeader.isConnected) {
                console.log(`✅ Leader ${originalLeader.name} reconnected, cancelling auto-transfer`);
                leaderTransferTimeouts.delete(lobbySlug);
                return;
              }

              // Find the next connected human player to transfer leadership to
              const nextLeader = currentLobby.players.find(p => p.isConnected && !p.isBot);
              if (nextLeader) {
                const oldLeaderId = currentLobby.leaderId;
                currentLobby.leaderId = nextLeader.id;
                console.log(`👑 Auto-transferred leadership in ${lobbySlug}: ${oldLeaderId} → ${nextLeader.id} (${nextLeader.name})`);

                // Broadcast the leadership change
                io.to(lobbySlug).emit('lobby-updated', createLobbyUpdate(currentLobby));
                io.to(lobbySlug).emit('leader-auto-transferred', {
                  newLeaderId: nextLeader.id,
                  newLeaderName: nextLeader.name,
                  reason: 'Previous leader disconnected'
                });

                persistence.saveLobby(lobbySlug, currentLobby);
              } else {
                console.log(`⚠️ No connected human players to transfer leadership to in ${lobbySlug}`);
              }

              leaderTransferTimeouts.delete(lobbySlug);
            }, LEADER_TRANSFER_TIMEOUT);

            leaderTransferTimeouts.set(lobbySlug, timeoutId);
          }

          // Schedule cleanup for inactive lobbies
          scheduleInactiveLobbyCleanup(lobbies, games, socket.lobbySlug);
        }
      }
    }
  });

  // Add bot to lobby (leader only)
  socket.on('add-bot', (data) => {
    console.log('🤖 ADD-BOT EVENT TRIGGERED:', {
      socketId: socket.id,
      data: data,
      timestamp: new Date().toISOString()
    });

    const { slug, botName, botStyle } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      console.log('❌ ADD-BOT REJECTED - Not leader or no lobby');
      return;
    }

    console.log('✅ ADD-BOT PROCEEDING - Creating bot...');

    // Use the current lobby's game type for bot creation
    const gameType = lobby.gameType || 'dice-factory';
    const bot = botSystem.createBot(botStyle, gameType);
    bot.name = botName;

    console.log(`🎯 BOT CREATED WITH STYLE:`, {
      botStyle: bot.botStyle,
      style: bot.style,
      requestedStyle: botStyle
    });

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
    persistence.saveLobby(slug, lobby);
    console.log('📡 LOBBY-UPDATED EMITTED');
  });

  // Remove bot from lobby (leader only)
  socket.on('remove-bot', (data) => {
    const { slug, botId } = data;
    const lobby = lobbies.get(slug);

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    lobby.players = lobby.players.filter(p => p.id !== botId);
    botSystem.removeBot(botId);

    io.to(slug).emit('lobby-updated', lobby);
    persistence.saveLobby(slug, lobby);
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

    if (!validateLeaderPermission(lobby, socket.id, slug)) {
      return;
    }

    const bot = lobby.players.find(p => p.id === botId && p.isBot);
    if (bot) {
      bot.botStyle = newStyle;
      io.to(slug).emit('lobby-updated', lobby);
      persistence.saveLobby(slug, lobby);
    }
  });

  // Handle HenHur debug actions from clients
  socket.on('henhur-debug-action', (data) => {
    const { slug, player, action } = data || {};
    console.log(`🐞 HenHur debug action received from ${player || socket.id} in ${slug}: ${action}`);

    if (!slug) {
      console.warn('henhur-debug-action missing slug');
      return;
    }

    const lobby = lobbies.get(slug);
    if (!lobby) {
      console.warn(`henhur-debug-action: lobby not found: ${slug}`);
      return;
    }

    // Broadcast a simple debug event to the lobby so clients (or server admins) can react
    io.to(slug).emit('henhur-debug', { player: player || socket.playerName || socket.id, action, from: socket.id, timestamp: Date.now() });
  });
}

module.exports = { registerLobbyEvents };