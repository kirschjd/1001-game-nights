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

}

module.exports = {
  registerHeistCityEvents,
};
