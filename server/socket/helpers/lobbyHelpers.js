// server/socket/helpers/lobbyHelpers.js
// Helper functions for lobby event handlers

/**
 * Create a new lobby
 */
function createLobby(slug, playerName, socketId) {
  return {
    slug,
    title: `${playerName}'s Game Night`,
    leaderId: socketId,
    gameType: 'dice-factory',
    gameOptions: {},
    players: [],
    created: Date.now(),
    lastActivity: Date.now()
  };
}

/**
 * Handle player reconnection logic
 */
function handlePlayerReconnection(lobby, playerName, newSocketId, games) {
  const existingPlayer = lobby.players.find(p => p.name === playerName);

  if (!existingPlayer) {
    return { isReconnection: false };
  }

  const oldSocketId = existingPlayer.id;
  const wasLeader = lobby.leaderId === oldSocketId;

  console.log(`🔄 Player ${playerName} reconnecting. Old ID: ${oldSocketId}, New ID: ${newSocketId}`);
  console.log(`👑 Was leader? ${wasLeader} (lobby.leaderId: ${lobby.leaderId})`);

  // Update player socket ID and connection tracking
  const now = Date.now();
  existingPlayer.id = newSocketId;
  existingPlayer.isConnected = true;
  existingPlayer.lastPing = now;
  existingPlayer.lastActivity = now;

  // Preserve leader status on reconnection
  if (wasLeader) {
    lobby.leaderId = newSocketId;
    console.log(`✅ Leader ${playerName} reconnected and preserved leader status. New leaderId: ${newSocketId}`);
  } else {
    console.log(`✅ Player ${playerName} reconnected to ${lobby.slug}`);
  }

  // Update socket ID in active game if it exists
  updateGamePlayerSocketId(games.get(lobby.slug), oldSocketId, newSocketId, playerName);

  return { isReconnection: true, wasLeader };
}

/**
 * Update player socket ID in active game
 */
function updateGamePlayerSocketId(game, oldSocketId, newSocketId, playerName) {
  if (!game || !game.state || !game.state.players) {
    return;
  }

  // If game has a custom update method (like HenHur), use it
  if (typeof game.updatePlayerSocketId === 'function') {
    game.updatePlayerSocketId(oldSocketId, newSocketId);
    return;
  }

  // Otherwise use the default logic for other games
  let gamePlayer = game.state.players.find(p => p.id === oldSocketId);

  if (gamePlayer) {
    gamePlayer.id = newSocketId;
    console.log(`🎮 Updated game player socket ID: ${oldSocketId} → ${newSocketId}`);
  } else {
    // Fallback: try to find by name
    gamePlayer = game.state.players.find(p => p.name === playerName);
    if (gamePlayer) {
      gamePlayer.id = newSocketId;
      console.log(`🎮 Updated game player socket ID by name: ${playerName} → ${newSocketId}`);
    } else {
      console.log(`⚠️ Warning: Could not find game player ${playerName} to update socket ID`);
    }
  }
}

/**
 * Add new player to lobby
 */
function addNewPlayer(lobby, playerName, socketId) {
  const now = Date.now();
  const newPlayer = {
    id: socketId,
    name: playerName,
    isConnected: true,
    joinedAt: now,
    lastPing: now,
    lastActivity: now
  };
  lobby.players.push(newPlayer);
  console.log(`👥 Player ${playerName} joined lobby ${lobby.slug}`);
}

/**
 * Create lobby update object for broadcasting
 */
function createLobbyUpdate(lobby) {
  return {
    slug: lobby.slug,
    title: lobby.title,
    players: lobby.players,
    leaderId: lobby.leaderId,
    gameType: lobby.gameType,
    gameOptions: lobby.gameOptions
  };
}

/**
 * Validate lobby and leader permissions
 */
function validateLeaderPermission(lobby, socketId, slug) {
  if (!lobby) {
    console.log(`❌ Lobby ${slug} not found`);
    return false;
  }

  if (lobby.leaderId !== socketId) {
    console.log(`❌ Permission denied for ${socketId} (not leader of ${slug})`);
    return false;
  }

  return true;
}

/**
 * Preserve bot flags in game state
 */
function preserveBotFlags(game, connectedPlayers, botSystem) {
  console.log('🔧 PRESERVING BOT FLAGS IN GAME:');
  connectedPlayers.forEach((lobbyPlayer, index) => {
    const gamePlayer = game.state.players[index];
    if (gamePlayer && botSystem.isBot(lobbyPlayer.id)) {
      console.log(`  Setting isBot=true for ${gamePlayer.name} (${gamePlayer.id})`);
      gamePlayer.isBot = true;
      gamePlayer.botStyle = lobbyPlayer.botStyle;
    }
  });
}

/**
 * Schedule cleanup for inactive lobbies
 */
function scheduleInactiveLobbyCleanup(lobbies, games, lobbySlug) {
  setTimeout(() => {
    const currentLobby = lobbies.get(lobbySlug);
    if (currentLobby && currentLobby.players.every(p => !p.isConnected)) {
      lobbies.delete(lobbySlug);
      games.delete(lobbySlug);
      console.log(`🧹 Cleaned up empty lobby: ${lobbySlug}`);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

module.exports = {
  createLobby,
  handlePlayerReconnection,
  updateGamePlayerSocketId,
  addNewPlayer,
  createLobbyUpdate,
  validateLeaderPermission,
  preserveBotFlags,
  scheduleInactiveLobbyCleanup
};
