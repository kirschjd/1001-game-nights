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

  /**
   * Handle game info updates (turn number, victory points)
   * This syncs game info across all players in the lobby
   */
  socket.on('heist-city-game-info-update', (data) => {
    const { lobbyId, turnNumber, blueVictoryPoints, redVictoryPoints } = data;

    if (!lobbyId || turnNumber === undefined) {
      socket.emit('error', { message: 'Missing required game info data' });
      return;
    }

    const game = games.get(lobbyId);
    if (!game || game.state.type !== 'heist-city') {
      socket.emit('error', { message: 'Heist City game not found' });
      return;
    }

    // Store game info in game state
    if (!game.state.gameInfo) {
      game.state.gameInfo = {};
    }
    game.state.gameInfo.turnNumber = turnNumber;
    game.state.gameInfo.blueVictoryPoints = blueVictoryPoints || 0;
    game.state.gameInfo.redVictoryPoints = redVictoryPoints || 0;

    // Broadcast to all other players in the lobby
    socket.to(lobbyId).emit('heist-city-game-info-update', {
      turnNumber,
      blueVictoryPoints,
      redVictoryPoints
    });

    console.log(`📊 Broadcasted game info update to lobby ${lobbyId} (Turn: ${turnNumber})`);
  });

  /**
   * Handle player selection changes
   * This syncs character selections across all players in the lobby
   */
  socket.on('heist-city-selection-change', (data) => {
    const { lobbyId, selections } = data;

    if (!lobbyId || !selections) {
      socket.emit('error', { message: 'Missing required selection data' });
      return;
    }

    const game = games.get(lobbyId);
    if (!game || game.state.type !== 'heist-city') {
      socket.emit('error', { message: 'Heist City game not found' });
      return;
    }

    // Store selections in game state
    game.state.playerSelections = selections;

    // Broadcast to all players in the lobby (including sender for consistency)
    io.to(lobbyId).emit('heist-city-selection-update', selections);

    console.log(`🎯 Broadcasted selection update to lobby ${lobbyId}`);
  });

  /**
   * Handle map loading
   * This syncs new map across all players and resets game state
   */
  socket.on('heist-city-map-load', (data) => {
    const { lobbyId, mapId, mapState, gridType, turnNumber, blueVictoryPoints, redVictoryPoints } = data;

    if (!lobbyId || !mapId || !mapState) {
      socket.emit('error', { message: 'Missing required map load data' });
      return;
    }

    const game = games.get(lobbyId);
    if (!game || game.state.type !== 'heist-city') {
      socket.emit('error', { message: 'Heist City game not found' });
      return;
    }

    // Update game state with new map
    game.state.mapState = mapState;
    game.state.mapId = mapId;
    game.state.gridType = gridType || 'square'; // Store grid type

    // Reset game info
    if (!game.state.gameInfo) {
      game.state.gameInfo = {};
    }
    game.state.gameInfo.turnNumber = turnNumber;
    game.state.gameInfo.blueVictoryPoints = blueVictoryPoints;
    game.state.gameInfo.redVictoryPoints = redVictoryPoints;

    // Clear selections
    game.state.playerSelections = [];

    // Broadcast to all players in the lobby (including sender)
    io.to(lobbyId).emit('heist-city-map-loaded', {
      mapState,
      gridType: gridType || 'square',
      turnNumber,
      blueVictoryPoints,
      redVictoryPoints,
    });

    console.log(`🗺️  Loaded map "${mapId}" (${gridType || 'square'} grid) in lobby ${lobbyId}`);
  });

  /**
   * Handle ruler updates
   * This syncs ruler tool across all players
   */
  socket.on('heist-city-ruler-update', (data) => {
    const { lobbyId, start, end, playerId } = data;

    if (!lobbyId) {
      socket.emit('error', { message: 'Missing required ruler data' });
      return;
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    // Broadcast ruler update to all players in the lobby (including sender)
    io.to(lobbyId).emit('heist-city-ruler-update', { start, end, playerId });

    console.log(`📏 Broadcasted ruler update to lobby ${lobbyId}`);
  });

  /**
   * Handle player name changes
   * This syncs name changes across all players in the lobby
   */
  socket.on('heist-city-name-change', (data) => {
    const { lobbyId, playerId, newName } = data;

    if (!lobbyId || !playerId || !newName) {
      socket.emit('error', { message: 'Missing required name change data' });
      return;
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    // Update the player's name in the lobby
    const player = lobby.players.find(p => p.id === playerId);
    if (player) {
      player.name = newName;
    }

    // Broadcast name update to all players in the lobby (including sender)
    io.to(lobbyId).emit('heist-city-name-update', { playerId, newName });

    console.log(`📛 Player ${playerId} changed name to "${newName}" in lobby ${lobbyId}`);
  });

  /**
   * Handle request for current game state
   * This allows clients to sync on load/refresh
   */
  socket.on('request-game-state', (data) => {
    const { lobbyId } = data;

    if (!lobbyId) {
      socket.emit('error', { message: 'Missing lobbyId' });
      return;
    }

    const game = games.get(lobbyId);
    const lobby = lobbies.get(lobbyId);

    if (!game || !lobby) {
      console.log(`⚠️  No game state found for lobby ${lobbyId}`);
      return;
    }

    // Only send state for Heist City games
    if (game.state.type === 'heist-city') {
      // Send the current game state to the requesting client
      socket.emit('game-started', {
        ...game.state,
        players: lobby.players,
      });

      console.log(`🔄 Sent current game state to client in lobby ${lobbyId}`);
    }
  });

}

module.exports = {
  registerHeistCityEvents,
};
