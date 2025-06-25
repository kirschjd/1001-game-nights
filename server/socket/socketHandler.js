// 1001 Game Nights - Main Socket Handler
// Version: 2.0.0 - Modular socket event management
// Updated: December 2024

const { registerLobbyEvents } = require('./lobbyEvents');
const { registerWarEvents } = require('./warEvents');
const { registerDiceFactoryEvents } = require('./diceFactoryEvents');

/**
 * Initialize socket.io event handlers
 * @param {Object} io - Socket.io instance
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function initializeSocketHandlers(io, lobbies, games) {
  
  io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Register all event handlers for this socket
    registerLobbyEvents(io, socket, lobbies, games);
    registerWarEvents(io, socket, lobbies, games);
    registerDiceFactoryEvents(io, socket, lobbies, games);

    // Log when socket disconnects (handled in lobbyEvents)
  });
}

module.exports = { initializeSocketHandlers };