// server/socket/helpers/stateVersioning.js
// State versioning utilities for detecting and recovering from desync

/**
 * Initialize version tracking for a game state
 * @param {Object} state - The game state object
 * @returns {Object} - State with version tracking added
 */
function initializeVersioning(state) {
  state.version = 1;
  state.lastUpdated = Date.now();
  return state;
}

/**
 * Increment the version number and update timestamp
 * Call this after any state modification
 * @param {Object} state - The game state object
 * @returns {number} - The new version number
 */
function incrementVersion(state) {
  if (!state.version) {
    state.version = 1;
  }
  state.version += 1;
  state.lastUpdated = Date.now();
  return state.version;
}

/**
 * Get the current version info
 * @param {Object} state - The game state object
 * @returns {Object} - Version info { version, lastUpdated }
 */
function getVersionInfo(state) {
  return {
    version: state.version || 0,
    lastUpdated: state.lastUpdated || null
  };
}

/**
 * Check if a client's version is out of sync
 * @param {Object} state - The game state object
 * @param {number} clientVersion - The client's last known version
 * @returns {boolean} - True if client needs full sync
 */
function needsFullSync(state, clientVersion) {
  // If client has no version, they need sync
  if (!clientVersion) return true;

  // If client is more than 1 version behind, recommend full sync
  // (small gaps could be handled by retrying missed updates)
  const serverVersion = state.version || 0;
  const versionGap = serverVersion - clientVersion;

  return versionGap > 1;
}

/**
 * Create a versioned state update wrapper
 * This updates version and returns the state for broadcasting
 * @param {Object} game - The game object
 * @returns {Object} - The updated state with new version
 */
function createVersionedUpdate(game) {
  incrementVersion(game.state);
  return game.state;
}

module.exports = {
  initializeVersioning,
  incrementVersion,
  getVersionInfo,
  needsFullSync,
  createVersionedUpdate
};
