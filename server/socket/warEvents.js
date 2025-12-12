// 1001 Game Nights - War Game Socket Events
// Version: 2.0.1 - Added persistence for state recovery
// Updated: December 2024

const persistence = require('../utils/persistence');

/**
 * Register War game-related socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerWarEvents(io, socket, lobbies, games) {

  // War game player action
  socket.on('war-player-action', (data) => {
    const { action } = data;
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'war') {
      return;
    }
    
    const result = game.playerAction(socket.id, action);
    if (result.success) {
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        lobby.players.forEach(player => {
          if (player.isConnected) {
            const playerView = game.getPlayerView(player.id);
            io.to(player.id).emit('game-state-updated', playerView);
          }
        });
        // Persist game state (throttled)
        persistence.saveGame(socket.lobbySlug, game);
      }
    }
  });

  // War game next round (leader only)
  socket.on('war-next-round', () => {
    const lobby = lobbies.get(socket.lobbySlug);
    const game = games.get(socket.lobbySlug);
    
    if (!game || !lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    const result = game.nextRound();
    if (result.success) {
      lobby.players.forEach(player => {
        if (player.isConnected) {
          const playerView = game.getPlayerView(player.id);
          io.to(player.id).emit('game-state-updated', playerView);
        }
      });
      // Persist game state (throttled)
      persistence.saveGame(socket.lobbySlug, game);
    }
  });
}

module.exports = { registerWarEvents };