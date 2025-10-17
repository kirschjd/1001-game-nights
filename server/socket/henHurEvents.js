// HenHur Socket Event Handlers
// Handles all multiplayer communication for HenHur game

/**
 * Register HenHur-specific socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerHenHurEvents(io, socket, lobbies, games) {

  /**
   * Player selects a card for race turn
   */
  socket.on('henhur:select-race-card', (data) => {
    const { slug, cardId, willBurn, tokensToUse } = data;

    if (!slug || !cardId) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'henhur') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Handle card selection
    const result = game.selectCardForRace(
      socket.id,
      cardId,
      willBurn || false,
      tokensToUse || []
    );

    if (result.success) {
      // Broadcast updated state to all players
      broadcastGameState(io, slug, game);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Player selects a card for auction turn
   */
  socket.on('henhur:select-auction-card', (data) => {
    const { slug, cardId, willBurn, tokensToUse } = data;

    if (!slug || !cardId) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'henhur') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Handle bid
    const result = game.selectCardForAuction(
      socket.id,
      cardId,
      willBurn || false,
      tokensToUse || []
    );

    if (result.success) {
      // Broadcast updated state to all players
      broadcastGameState(io, slug, game);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Player drafts a card during auction
   */
  socket.on('henhur:draft-card', (data) => {
    const { slug, cardId } = data;

    if (!slug || !cardId) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'henhur') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Handle draft
    const result = game.draftCard(socket.id, cardId);

    if (result.success) {
      // Broadcast updated state to all players
      broadcastGameState(io, slug, game);
    } else {
      socket.emit('error', { message: result.message });
    }
  });

  /**
   * Player manually requests game state refresh
   */
  socket.on('henhur:request-state', (data) => {
    const { slug } = data;

    if (!slug) {
      socket.emit('error', { message: 'Missing slug' });
      return;
    }

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'henhur') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Send current state to requesting player
    const playerView = game.getPlayerView(socket.id);
    socket.emit('henhur:game-state', playerView);
  });

  /**
   * Debug: Give player tokens (debug mode only)
   */
  socket.on('henhur:debug-give-tokens', (data) => {
    const { slug, tokenType, count } = data;

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'henhur') {
      return;
    }

    if (game.state.variant !== 'debug') {
      socket.emit('error', { message: 'Debug mode not enabled' });
      return;
    }

    const player = game.getPlayer(socket.id);
    if (player && player.tokens[tokenType] !== undefined) {
      player.tokens[tokenType] = Math.min(
        player.tokens[tokenType] + count,
        player.maxTokens
      );

      console.log(`🐞 Debug: Gave ${count}x ${tokenType} to ${player.playerName}`);
      broadcastGameState(io, slug, game);
    }
  });

  /**
   * Debug: Move player to specific position
   */
  socket.on('henhur:debug-set-position', (data) => {
    const { slug, space, lap } = data;

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'henhur') {
      return;
    }

    if (game.state.variant !== 'debug') {
      socket.emit('error', { message: 'Debug mode not enabled' });
      return;
    }

    const player = game.getPlayer(socket.id);
    if (player) {
      player.position.space = space;
      player.position.lap = lap;

      console.log(`🐞 Debug: Set ${player.playerName} to lap ${lap}, space ${space}`);
      broadcastGameState(io, slug, game);
    }
  });

  /**
   * Debug: Draw cards
   */
  socket.on('henhur:debug-draw-cards', (data) => {
    const { slug, count } = data;

    const game = games.get(slug);
    if (!game || game.state.gameType !== 'henhur') {
      return;
    }

    if (game.state.variant !== 'debug') {
      socket.emit('error', { message: 'Debug mode not enabled' });
      return;
    }

    const player = game.getPlayer(socket.id);
    if (player) {
      const { drawCards } = require('../games/henhur/cardUtils');
      const result = drawCards(player.deck, count);
      player.deck = result.updatedDeck;

      console.log(`🐞 Debug: ${player.playerName} drew ${count} cards`);
      broadcastGameState(io, slug, game);
    }
  });
}

/**
 * Broadcast game state to all players in lobby
 */
function broadcastGameState(io, slug, game) {
  const lobby = io.sockets.adapter.rooms.get(slug);
  if (!lobby) return;

  // Send personalized view to each player
  for (const socketId of lobby) {
    const playerSocket = io.sockets.sockets.get(socketId);
    if (playerSocket) {
      const playerView = game.getPlayerView(socketId);
      if (playerView) {
        playerSocket.emit('henhur:game-state', playerView);
      }
    }
  }

  console.log(`📡 Broadcasted HenHur state to ${lobby.size} player(s) in ${slug}`);
}

module.exports = {
  registerHenHurEvents,
  broadcastGameState
};