// server/games/war/events/index.js
// War game event handler registration

const setupBasicWarEvents = require('./basicWarEvents');
const setupEnhancedWarEvents = require('./enhancedWarEvents');

/**
 * Setup all war game related socket events
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies map
 * @param {Map} games - Games map
 */
function setupWarEvents(io, socket, lobbies, games) {
  console.log('Setting up War game events for socket:', socket.id);
  
  // Setup basic war events (for backward compatibility)
  setupBasicWarEvents(io, socket, lobbies, games);
  
  // Setup enhanced war events (with bots and variants)
  setupEnhancedWarEvents(io, socket, lobbies, games);
  
  // War-specific cleanup on disconnect
  socket.on('disconnect', () => {
    if (socket.lobbySlug) {
      const game = games.get(socket.lobbySlug);
      if (game && game.state.type === 'war') {
        // Clean up any war-specific resources
        const { botSystem } = require('../../bots');
        botSystem.cleanupGame(socket.lobbySlug);
      }
    }
  });
}

module.exports = setupWarEvents;