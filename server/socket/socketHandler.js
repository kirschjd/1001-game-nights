// 1001 Game Nights - Main Socket Handler
// Version: 2.1.0 - Added heartbeat system for connection tracking
// Updated: December 2024

const { registerLobbyEvents } = require('./lobbyEvents');
const { registerWarEvents } = require('./warEvents');
const { registerDiceFactoryEvents } = require('./diceFactoryEvents');
const { registerKillTeamDraftEvents } = require('./killTeamDraftEvents');
const { registerHenHurEvents } = require('./henHurEvents');
const { registerHeistCityEvents } = require('./heistCityEvents');
const { registerBadukAnalysisEvents } = require('./badukAnalysisEvents');

// Import enhanced war events
const setupEnhancedWarEvents = require('../games/war/events/enhancedWarEvents');

// Heartbeat configuration
const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds to respond

// Track active heartbeat timers per socket
const heartbeatTimers = new Map();

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
    registerKillTeamDraftEvents(io, socket, lobbies, games);
    registerHenHurEvents(io, socket, lobbies, games);
    registerHeistCityEvents(io, socket, lobbies, games);
    registerBadukAnalysisEvents(io, socket, lobbies, games);

    // Register enhanced war events (bots, variants, etc.)
    setupEnhancedWarEvents(io, socket, lobbies, games);

    // Start heartbeat for this socket
    startHeartbeat(io, socket, lobbies);

    // Handle heartbeat response from client
    socket.on('heartbeat-pong', () => {
      // Clear the timeout since client responded
      const timers = heartbeatTimers.get(socket.id);
      if (timers && timers.timeout) {
        clearTimeout(timers.timeout);
        timers.timeout = null;
      }

      // Update last activity for the player
      if (socket.lobbySlug) {
        const lobby = lobbies.get(socket.lobbySlug);
        if (lobby) {
          const player = lobby.players.find(p => p.id === socket.id);
          if (player) {
            player.lastPing = Date.now();
          }
        }
      }
    });

    // Cleanup heartbeat on disconnect
    socket.on('disconnect', () => {
      stopHeartbeat(socket.id);
    });
  });
}

/**
 * Start heartbeat monitoring for a socket
 */
function startHeartbeat(io, socket, lobbies) {
  const intervalId = setInterval(() => {
    // Send ping to client
    socket.emit('heartbeat-ping');

    // Set timeout - if no response, mark as potentially disconnected
    const timeoutId = setTimeout(() => {
      console.log(`[Heartbeat] No response from ${socket.id} - connection may be stale`);

      // Mark player as having connection issues (but don't disconnect yet)
      if (socket.lobbySlug) {
        const lobby = lobbies.get(socket.lobbySlug);
        if (lobby) {
          const player = lobby.players.find(p => p.id === socket.id);
          if (player && !player.isBot) {
            // Log but don't mark disconnected - let Socket.IO handle actual disconnect
            console.log(`[Heartbeat] Player ${player.name} in ${socket.lobbySlug} is not responding`);
          }
        }
      }
    }, HEARTBEAT_TIMEOUT);

    // Store timeout reference
    const timers = heartbeatTimers.get(socket.id) || {};
    timers.timeout = timeoutId;
    heartbeatTimers.set(socket.id, timers);

  }, HEARTBEAT_INTERVAL);

  // Store interval reference
  heartbeatTimers.set(socket.id, { interval: intervalId, timeout: null });
}

/**
 * Stop heartbeat monitoring for a socket
 */
function stopHeartbeat(socketId) {
  const timers = heartbeatTimers.get(socketId);
  if (timers) {
    if (timers.interval) clearInterval(timers.interval);
    if (timers.timeout) clearTimeout(timers.timeout);
    heartbeatTimers.delete(socketId);
  }
}

module.exports = { initializeSocketHandlers };