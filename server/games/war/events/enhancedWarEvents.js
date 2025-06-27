// server/games/war/events/enhancedWarEvents.js
// Socket.io events for enhanced War game with bot support

const EnhancedWarGame = require('../EnhancedWarGame');
const { botSystem } = require('../../bots');

function setupEnhancedWarEvents(io, socket, lobbies, games) {
  
  // Start enhanced war game with variant and existing lobby bots
  socket.on('start-enhanced-war', (data) => {
    const { slug, variant = 'regular' } = data; // Remove bots parameter
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      socket.emit('error', { message: 'Only lobby leader can start game' });
      return;
    }

    // FIXED: Exclude bots from humanPlayers to prevent duplication
    const humanPlayers = lobby.players.filter(p => p.isConnected && !p.isBot);
    
    // Get existing bot players from lobby only
    const existingBots = lobby.players.filter(p => p.isBot);

    const allPlayers = [...humanPlayers, ...existingBots];
    
    if (allPlayers.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players (including bots) to start' });
      return;
    }

    if (allPlayers.length > 8) {
      socket.emit('error', { message: 'Maximum 8 players (including bots)' });
      return;
    }

    // Create enhanced war game with existing lobby players only
    const game = new EnhancedWarGame(allPlayers, variant);
    game.dealCards();
    
    games.set(slug, game);
    lobby.currentGame = game.state.type;
    lobby.gameVariant = variant;

    console.log(`Started ${variant} War game in lobby ${slug} with ${humanPlayers.length} humans and ${existingBots.length} bots`);
    
    // Send initial game state to all human players
    humanPlayers.forEach(player => {
      if (player.isConnected) {
        const playerView = game.getPlayerView(player.id);
        io.to(player.id).emit('game-started', playerView);
      }
    });

    // Schedule bot actions if any bots need to act
    scheduleBotsIfNeeded(slug, game);
  });

  // Enhanced war player action
  socket.on('enhanced-war-action', (data) => {
    const { action } = data;
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'war') {
      return;
    }

    const result = game.playerAction(socket.id, action);

    if (result.success) {
        // Add these debug lines
        console.log('Player action successful, current game state:');
        console.log('- Phase:', game.state.phase);
        console.log('- Players who have acted:', game.state.players.filter(p => p.action !== null).length);
        console.log('- Total players:', game.state.players.length);
        console.log('- All acted?', game.state.players.every(p => p.action !== null));
  
        broadcastGameUpdate(socket.lobbySlug, game);
  
        // Check if bots need to act
        scheduleBotsIfNeeded(socket.lobbySlug, game);
    }
  });

  // Enhanced war next round
  socket.on('enhanced-war-next-round', () => {
    console.log('Received enhanced-war-next-round event');
    const lobby = lobbies.get(socket.lobbySlug);
    const game = games.get(socket.lobbySlug);
    
    if (!game || !lobby) {
      console.log('No game or lobby found');
      return;
    }

    console.log('Before nextRound - Phase:', game.state.phase, 'Round:', game.state.round);
    const result = game.nextRound();
    console.log('After nextRound - Success:', result.success, 'Phase:', game.state.phase, 'Round:', game.state.round);
    if (result.success) {
      console.log('Broadcasting game update...');
      broadcastGameUpdate(socket.lobbySlug, game);
      
      // Schedule bot actions for new round
      scheduleBotsIfNeeded(socket.lobbySlug, game);
    } else {
      console.log('NextRound failed:', result.error);
      socket.emit('war-error', { error: result.error });
    }
  });

  // Handle bot action (internal, triggered by bot system)
  function handleBotAction(lobbySlug, botId, action) {
    const game = games.get(lobbySlug);
    if (!game) return;

    const result = game.playerAction(botId, action);
    if (result.success) {
      broadcastGameUpdate(lobbySlug, game);
      
      // Check if more bots need to act
      scheduleBotsIfNeeded(lobbySlug, game);
    }
  }

  // Schedule bot actions if needed
  function scheduleBotsIfNeeded(lobbySlug, game) {
    if (game.state.phase !== 'playing') return;
    
    const pendingBots = game.getPendingBotPlayers();
    if (pendingBots.length === 0) return;

    botSystem.scheduleBotActions(
      lobbySlug, 
      game.getGameState(), 
      (botId, action) => handleBotAction(lobbySlug, botId, action)
    );
  }

  // Broadcast game update to all human players
  function broadcastGameUpdate(lobbySlug, game) {
    const lobby = lobbies.get(lobbySlug);
    if (!lobby) return;

    console.log('Broadcasting to', lobby.players.length, 'players');
    lobby.players.forEach(player => {
      if (player.isConnected && !botSystem.isBot(player.id)) {
        const playerView = game.getPlayerView(player.id);
        console.log('Sending update to player:', player.name, 'Phase:', playerView.phase);
        io.to(player.id).emit('game-state-updated', playerView);
      }
    });
  }

  // Cleanup when player disconnects
  socket.on('disconnect', () => {
    if (socket.lobbySlug) {
      // Clean up any bot timers for this game
      botSystem.cleanupGame(socket.lobbySlug);
    }
  });

  // Get available game variants
  socket.on('get-war-variants', () => {
    socket.emit('war-variants', {
      variants: [
        {
          id: 'regular',
          name: 'Regular War',
          description: 'Standard rules - highest card wins'
        },
        {
          id: 'aces-high',
          name: 'Aces High',
          description: 'Aces always win, regardless of other cards'
        }
      ]
    });
  });

  // Get available bot styles (game-type aware)
  socket.on('get-bot-styles', () => {
    const lobby = lobbies.get(socket.lobbySlug);
    const gameType = lobby?.gameType || 'war';
    
    // Get styles from the appropriate bot handler
    const styles = botSystem.getAvailableBotStyles(gameType);
    
    socket.emit('bot-styles', {
      styles: styles
    });
  });
}

module.exports = setupEnhancedWarEvents;