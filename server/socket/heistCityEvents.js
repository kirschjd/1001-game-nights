// Heist City Socket Event Handlers
// Handles all multiplayer communication for Heist City game

const { incrementVersion, getVersionInfo, needsFullSync } = require('./helpers/stateVersioning');
const persistence = require('../utils/persistence');

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
    const { lobbyId, mapState, gridType } = data;

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

    // Also update gridType if provided (ensures it stays in sync)
    if (gridType) {
      game.state.gridType = gridType;
    }

    // Increment version on state change
    const newVersion = incrementVersion(game.state);

    // Broadcast the updated map state to all other players in the lobby
    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    // Emit to all players in the lobby except the sender (include version)
    socket.to(lobbyId).emit('heist-city-map-state-update', {
      mapState,
      version: newVersion
    });

    // Persist game state (throttled)
    persistence.saveGame(lobbyId, game);

    console.log(`📡 Broadcasted Heist City map state update to lobby ${lobbyId} (v${newVersion})`);
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

    // Increment version on state change
    const newVersion = incrementVersion(game.state);

    // Broadcast to all other players in the lobby (include version)
    socket.to(lobbyId).emit('heist-city-game-info-update', {
      turnNumber,
      blueVictoryPoints,
      redVictoryPoints,
      version: newVersion
    });

    // Persist game state (throttled)
    persistence.saveGame(lobbyId, game);

    console.log(`📊 Broadcasted game info update to lobby ${lobbyId} (Turn: ${turnNumber}, v${newVersion})`);
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

    // Increment version on state change
    const newVersion = incrementVersion(game.state);

    // Broadcast to all players in the lobby (including sender for consistency)
    io.to(lobbyId).emit('heist-city-selection-update', {
      selections,
      version: newVersion
    });

    // Persist game state (throttled)
    persistence.saveGame(lobbyId, game);

    console.log(`🎯 Broadcasted selection update to lobby ${lobbyId} (v${newVersion})`);
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
    game.state.gridType = gridType || 'hex'; // Store grid type

    // Reset game info
    if (!game.state.gameInfo) {
      game.state.gameInfo = {};
    }
    game.state.gameInfo.turnNumber = turnNumber;
    game.state.gameInfo.blueVictoryPoints = blueVictoryPoints;
    game.state.gameInfo.redVictoryPoints = redVictoryPoints;

    // Clear selections
    game.state.playerSelections = [];

    // Increment version on state change (major change = map load)
    const newVersion = incrementVersion(game.state);

    // Broadcast to all players in the lobby (including sender)
    io.to(lobbyId).emit('heist-city-map-loaded', {
      mapState,
      gridType: gridType || 'hex',
      turnNumber,
      blueVictoryPoints,
      redVictoryPoints,
      version: newVersion
    });

    // Persist game state (force save for map load)
    persistence.saveGame(lobbyId, game, true);

    console.log(`🗺️  Loaded map "${mapId}" (${gridType || 'hex'} grid) in lobby ${lobbyId} (v${newVersion})`);
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
      // Send the current game state to the requesting client (include version)
      socket.emit('game-started', {
        ...game.state,
        players: lobby.players,
      });
    }
  });

  /**
   * Handle full sync request
   * Client sends their last known version, server decides if full sync is needed
   */
  socket.on('request-full-sync', (data) => {
    const { lobbyId, clientVersion } = data;

    if (!lobbyId) {
      socket.emit('error', { message: 'Missing lobbyId' });
      return;
    }

    const game = games.get(lobbyId);
    const lobby = lobbies.get(lobbyId);

    if (!game || !lobby) {
      socket.emit('full-sync-response', {
        success: false,
        reason: 'Game not found'
      });
      return;
    }

    // Only handle Heist City games
    if (game.state.type !== 'heist-city') {
      return;
    }

    const versionInfo = getVersionInfo(game.state);

    // Check if client needs full sync
    if (needsFullSync(game.state, clientVersion)) {
      console.log(`🔄 Full sync requested for ${lobbyId}: client v${clientVersion} → server v${versionInfo.version}`);

      // Send complete current state
      socket.emit('full-sync-response', {
        success: true,
        state: {
          ...game.state,
          players: lobby.players
        },
        version: versionInfo.version,
        lastUpdated: versionInfo.lastUpdated
      });
    } else {
      // Client is in sync or only slightly behind
      socket.emit('full-sync-response', {
        success: true,
        inSync: true,
        version: versionInfo.version
      });
    }
  });

}

module.exports = {
  registerHeistCityEvents,
};
