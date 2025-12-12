// server/utils/persistence.js
// JSON file persistence for lobbies and games
// Allows game state to survive server restarts

const fs = require('fs');
const path = require('path');

// Data directories
const DATA_DIR = path.join(__dirname, '../data');
const LOBBIES_DIR = path.join(DATA_DIR, 'lobbies');
const GAMES_DIR = path.join(DATA_DIR, 'games');

// Throttling configuration
const SAVE_THROTTLE_MS = 1000; // Maximum 1 save per second per entity
const saveTimestamps = new Map(); // Track last save time per slug

// Cleanup configuration
const MAX_AGE_HOURS = 24; // Delete files older than 24 hours

/**
 * Ensure data directories exist
 */
function ensureDirectories() {
  [DATA_DIR, LOBBIES_DIR, GAMES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Persistence] Created directory: ${dir}`);
    }
  });
}

/**
 * Check if we should throttle a save operation
 * @param {string} key - Unique key for throttling (e.g., 'lobby-slug' or 'game-slug')
 * @returns {boolean} - True if save should be throttled (skipped)
 */
function shouldThrottle(key) {
  const now = Date.now();
  const lastSave = saveTimestamps.get(key);

  if (lastSave && (now - lastSave) < SAVE_THROTTLE_MS) {
    return true;
  }

  saveTimestamps.set(key, now);
  return false;
}

/**
 * Save a lobby to disk
 * @param {string} slug - Lobby slug
 * @param {Object} lobby - Lobby data
 * @param {boolean} force - Skip throttling if true
 */
function saveLobby(slug, lobby, force = false) {
  if (!force && shouldThrottle(`lobby-${slug}`)) {
    return;
  }

  ensureDirectories();

  try {
    const filePath = path.join(LOBBIES_DIR, `${slug}.json`);
    const data = {
      ...lobby,
      savedAt: Date.now()
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[Persistence] Saved lobby: ${slug}`);
  } catch (error) {
    console.error(`[Persistence] Failed to save lobby ${slug}:`, error.message);
  }
}

/**
 * Save a game to disk
 * @param {string} slug - Game/lobby slug
 * @param {Object} game - Game object with state
 * @param {boolean} force - Skip throttling if true
 */
function saveGame(slug, game, force = false) {
  if (!force && shouldThrottle(`game-${slug}`)) {
    return;
  }

  ensureDirectories();

  try {
    const filePath = path.join(GAMES_DIR, `${slug}.json`);
    // Extract serializable state from game object
    const data = {
      state: game.state,
      savedAt: Date.now()
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[Persistence] Saved game: ${slug}`);
  } catch (error) {
    console.error(`[Persistence] Failed to save game ${slug}:`, error.message);
  }
}

/**
 * Load a lobby from disk
 * @param {string} slug - Lobby slug
 * @returns {Object|null} - Lobby data or null if not found
 */
function loadLobby(slug) {
  try {
    const filePath = path.join(LOBBIES_DIR, `${slug}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`[Persistence] Loaded lobby: ${slug}`);
    return data;
  } catch (error) {
    console.error(`[Persistence] Failed to load lobby ${slug}:`, error.message);
    return null;
  }
}

/**
 * Load a game from disk
 * @param {string} slug - Game/lobby slug
 * @returns {Object|null} - Game data or null if not found
 */
function loadGame(slug) {
  try {
    const filePath = path.join(GAMES_DIR, `${slug}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`[Persistence] Loaded game: ${slug}`);
    return data;
  } catch (error) {
    console.error(`[Persistence] Failed to load game ${slug}:`, error.message);
    return null;
  }
}

/**
 * Load all lobbies from disk
 * @returns {Map} - Map of slug -> lobby data
 */
function loadAllLobbies() {
  ensureDirectories();
  const lobbies = new Map();

  try {
    const files = fs.readdirSync(LOBBIES_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const slug = file.replace('.json', '');
        const lobby = loadLobby(slug);
        if (lobby) {
          // Mark all players as disconnected on load
          if (lobby.players) {
            lobby.players.forEach(player => {
              if (!player.isBot) {
                player.isConnected = false;
              }
            });
          }
          lobbies.set(slug, lobby);
        }
      }
    }
    console.log(`[Persistence] Loaded ${lobbies.size} lobbies from disk`);
  } catch (error) {
    console.error('[Persistence] Failed to load lobbies:', error.message);
  }

  return lobbies;
}

/**
 * Load all games from disk
 * @returns {Map} - Map of slug -> game data
 */
function loadAllGames() {
  ensureDirectories();
  const games = new Map();

  try {
    const files = fs.readdirSync(GAMES_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const slug = file.replace('.json', '');
        const gameData = loadGame(slug);
        if (gameData && gameData.state) {
          // Create a game-like object with the loaded state
          // Note: This is a simplified version - game methods won't work
          // but the state can be broadcast to reconnecting clients
          const game = {
            state: gameData.state,
            getPlayerView: function(playerId) {
              return this.state;
            }
          };
          games.set(slug, game);
        }
      }
    }
    console.log(`[Persistence] Loaded ${games.size} games from disk`);
  } catch (error) {
    console.error('[Persistence] Failed to load games:', error.message);
  }

  return games;
}

/**
 * Delete a lobby file
 * @param {string} slug - Lobby slug
 */
function deleteLobby(slug) {
  try {
    const filePath = path.join(LOBBIES_DIR, `${slug}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Persistence] Deleted lobby: ${slug}`);
    }
  } catch (error) {
    console.error(`[Persistence] Failed to delete lobby ${slug}:`, error.message);
  }
}

/**
 * Delete a game file
 * @param {string} slug - Game/lobby slug
 */
function deleteGame(slug) {
  try {
    const filePath = path.join(GAMES_DIR, `${slug}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Persistence] Deleted game: ${slug}`);
    }
  } catch (error) {
    console.error(`[Persistence] Failed to delete game ${slug}:`, error.message);
  }
}

/**
 * Clean up old files (older than MAX_AGE_HOURS)
 * @returns {Object} - Count of deleted files { lobbies, games }
 */
function cleanupOldFiles() {
  const maxAge = MAX_AGE_HOURS * 60 * 60 * 1000; // Convert to milliseconds
  const now = Date.now();
  let deletedLobbies = 0;
  let deletedGames = 0;

  ensureDirectories();

  // Clean up old lobby files
  try {
    const lobbyFiles = fs.readdirSync(LOBBIES_DIR);
    for (const file of lobbyFiles) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LOBBIES_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          deletedLobbies++;
          console.log(`[Persistence] Cleaned up old lobby: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('[Persistence] Failed to cleanup lobbies:', error.message);
  }

  // Clean up old game files
  try {
    const gameFiles = fs.readdirSync(GAMES_DIR);
    for (const file of gameFiles) {
      if (file.endsWith('.json')) {
        const filePath = path.join(GAMES_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          deletedGames++;
          console.log(`[Persistence] Cleaned up old game: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('[Persistence] Failed to cleanup games:', error.message);
  }

  if (deletedLobbies > 0 || deletedGames > 0) {
    console.log(`[Persistence] Cleanup complete: ${deletedLobbies} lobbies, ${deletedGames} games deleted`);
  }

  return { lobbies: deletedLobbies, games: deletedGames };
}

/**
 * Start periodic cleanup job
 * @param {number} intervalHours - How often to run cleanup (default: 1 hour)
 */
function startCleanupJob(intervalHours = 1) {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Run cleanup on startup
  cleanupOldFiles();

  // Schedule periodic cleanup
  setInterval(() => {
    console.log('[Persistence] Running scheduled cleanup...');
    cleanupOldFiles();
  }, intervalMs);

  console.log(`[Persistence] Cleanup job scheduled to run every ${intervalHours} hour(s)`);
}

module.exports = {
  saveLobby,
  saveGame,
  loadLobby,
  loadGame,
  loadAllLobbies,
  loadAllGames,
  deleteLobby,
  deleteGame,
  cleanupOldFiles,
  startCleanupJob,
  ensureDirectories
};
