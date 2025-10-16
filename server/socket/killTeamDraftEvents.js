// Kill Team Draft Socket Events

const { botSystem } = require('../games/bots');

/**
 * Register Kill Team Draft socket events
 */
function registerKillTeamDraftEvents(io, socket, lobbies, games) {

  // Player selects a card from their pack
  socket.on('ktd-select-card', (data) => {
    const { slug, cardId } = data;
    const game = games.get(slug);

    if (!game || game.state.type !== 'kill-team-draft') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Process card selection
    const result = game.selectCard(socket.id, cardId);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast updated game state to all players
    broadcastGameState(io, lobbies, games, slug);

    // Schedule bot actions if needed
    scheduleBotActions(io, lobbies, games, slug);
  });

  // Player reorders their deck
  socket.on('ktd-reorder-deck', (data) => {
    const { slug, newOrder } = data;
    const game = games.get(slug);

    if (!game || game.state.type !== 'kill-team-draft') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.reorderDeck(socket.id, newOrder);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Send updated state to player only
    const playerView = game.getPlayerView(socket.id);
    socket.emit('game-state-updated', playerView);
  });

  // Reset and start a new draft
  socket.on('ktd-draft-again', (data) => {
    const { slug } = data;
    const lobby = lobbies.get(slug);
    const game = games.get(slug);

    if (!lobby || !game || game.state.type !== 'kill-team-draft') {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Check if requester is leader
    if (lobby.leaderId !== socket.id) {
      socket.emit('error', { message: 'Only leader can restart draft' });
      return;
    }

    // Reset the draft
    game.resetDraft();

    // Broadcast to all players
    broadcastGameState(io, lobbies, games, slug);

    // Schedule bot actions for first round
    scheduleBotActions(io, lobbies, games, slug);
  });
}

/**
 * Broadcast game state to all players in lobby
 */
function broadcastGameState(io, lobbies, games, slug) {
  const lobby = lobbies.get(slug);
  const game = games.get(slug);

  if (!lobby || !game) return;

  lobby.players.forEach(player => {
    if (player.isConnected && !botSystem.isBot(player.id)) {
      const playerView = game.getPlayerView(player.id);
      io.to(player.id).emit('game-state-updated', playerView);
    }
  });
}

/**
 * Schedule bot actions if bots need to act
 */
function scheduleBotActions(io, lobbies, games, slug) {
  const game = games.get(slug);
  if (!game || game.state.type !== 'kill-team-draft') return;

  const gameState = game.getGameState();

  botSystem.scheduleBotActions(slug, gameState, (botId, action) => {
    if (action.action === 'select-card') {
      const result = game.selectCard(botId, action.cardId);

      if (result.success) {
        // Broadcast updated state
        broadcastGameState(io, lobbies, games, slug);

        // Check if more bots need to act
        setTimeout(() => {
          scheduleBotActions(io, lobbies, games, slug);
        }, 100); // Small delay between bot actions
      }
    }
  });
}

module.exports = {
  registerKillTeamDraftEvents,
  broadcastGameState,
  scheduleBotActions
};
