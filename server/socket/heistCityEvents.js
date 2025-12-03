// Heist City Socket Event Handlers
// Handles all multiplayer communication for Heist City game

/**
 * Register Heist City-specific socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerHeistCityEvents(io, socket, lobbies, games) {

  /**
   * Handle map state changes from players
   * This syncs token positions, item states, etc. across all players
   */
  socket.on('heist-city-map-state-change', (data) => {
    const { lobbyId, mapState } = data;

    if (!lobbyId || !mapState) {
      socket.emit('error', { message: 'Missing required data' });
      return;
    }

    const game = games.get(lobbyId);
    if (!game || game.state.type !== 'heist-city') {
      socket.emit('error', { message: 'Heist City game not found' });
      return;
    }

    // Update the game's map state
    game.state.mapState = mapState;

    // Broadcast the updated map state to all other players in the lobby
    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    // Emit to all players in the lobby except the sender
    socket.to(lobbyId).emit('heist-city-map-state-update', mapState);

    console.log(`📡 Broadcasted Heist City map state update to lobby ${lobbyId}`);
  });

  /**
   * Handle dice roll events
   * This syncs dice rolls across all players in the lobby
   */
  socket.on('heist-city-dice-roll', (data) => {
    const { lobbyId, dice1, dice2, total, roller } = data;

    if (!lobbyId || dice1 === undefined || dice2 === undefined || total === undefined) {
      socket.emit('error', { message: 'Missing required dice roll data' });
      return;
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    // Broadcast the dice roll to all players in the lobby (including sender)
    io.to(lobbyId).emit('heist-city-dice-roll', { dice1, dice2, total, roller });

    console.log(`🎲 Broadcasted dice roll (${dice1}, ${dice2} = ${total}) to lobby ${lobbyId}`);
  });

}

module.exports = {
  registerHeistCityEvents,
};
