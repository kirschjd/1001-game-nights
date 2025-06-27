// server/games/bots/index.js
// Bot system initialization and registration

const { botSystem } = require('./BotSystem');
const WarBotHandler = require('./WarBotHandler');
const DiceFactoryBotHandler = require('./DiceFactoryBotHandler');

// Initialize bot handlers
function initializeBotSystem() {
  console.log('Initializing bot system...');
  
  // Register game-specific bot handlers
  botSystem.registerGameHandler('war', new WarBotHandler());
  botSystem.registerGameHandler('dice-factory', new DiceFactoryBotHandler());
  
  console.log('Bot system initialized successfully');
}

// Helper functions for easy bot management

/**
 * Create bots for a lobby based on configuration
 * @param {Array} botConfigs - Array of {style, count} objects
 * @param {string} gameType - Game type
 * @returns {Array} - Array of created bot players
 */
function createBotsForLobby(botConfigs, gameType) {
  const createdBots = [];
  
  botConfigs.forEach(config => {
    for (let i = 0; i < config.count; i++) {
      const bot = botSystem.createBot(config.style, gameType);
      createdBots.push(bot);
    }
  });
  
  return createdBots;
}

/**
 * Get available bot styles for a game type
 * @param {string} gameType - Game type
 * @returns {Array} - Array of bot style definitions
 */
function getAvailableBotStyles(gameType) {
  return botSystem.getAvailableBotStyles(gameType);
}

/**
 * Schedule bot actions with error handling
 * @param {string} gameId - Game ID
 * @param {Object} gameState - Game state
 * @param {Function} actionCallback - Callback for bot actions
 */
function scheduleBotActionsWithErrorHandling(gameId, gameState, actionCallback) {
  try {
    botSystem.scheduleBotActions(gameId, gameState, (botId, action) => {
      try {
        actionCallback(botId, action);
      } catch (error) {
        console.error(`Error processing bot action for ${botId}:`, error);
      }
    });
  } catch (error) {
    console.error(`Error scheduling bot actions for game ${gameId}:`, error);
  }
}

/**
 * Clean up all bots for a specific game type
 * @param {string} gameId - Game ID
 * @param {string} gameType - Game type
 */
function cleanupGameBots(gameId, gameType) {
  botSystem.cleanupGame(gameId);
  
  // Remove bots of this game type that are no longer needed
  const allBots = botSystem.getAllBots();
  allBots.forEach(botInfo => {
    if (botInfo.gameType === gameType) {
      // Check if bot is still in an active game
      // This would need to be coordinated with your lobby system
      // For now, just clean up timers
    }
  });
}

/**
 * Get bot statistics for admin/debugging
 * @returns {Object} - Bot statistics
 */
function getBotStatistics() {
  const allBots = botSystem.getAllBots();
  const stats = {
    totalBots: allBots.length,
    byGameType: {},
    byStyle: {},
    activeGames: botSystem.gameTimers.size
  };
  
  allBots.forEach(bot => {
    // Count by game type
    stats.byGameType[bot.gameType] = (stats.byGameType[bot.gameType] || 0) + 1;
    
    // Count by style
    stats.byStyle[bot.style] = (stats.byStyle[bot.style] || 0) + 1;
  });
  
  return stats;
}

/**
 * Validate bot configuration
 * @param {Array} botConfigs - Bot configurations
 * @param {string} gameType - Game type
 * @param {number} maxPlayers - Maximum total players
 * @param {number} currentPlayers - Current human players
 * @returns {Object} - Validation result
 */
function validateBotConfiguration(botConfigs, gameType, maxPlayers, currentPlayers) {
  const availableStyles = getAvailableBotStyles(gameType);
  const styleIds = availableStyles.map(s => s.id);
  
  let totalBots = 0;
  const errors = [];
  
  // Validate each bot config
  botConfigs.forEach((config, index) => {
    if (!styleIds.includes(config.style)) {
      errors.push(`Invalid bot style '${config.style}' at index ${index}`);
    }
    
    if (typeof config.count !== 'number' || config.count < 0) {
      errors.push(`Invalid bot count at index ${index}: must be a positive number`);
    }
    
    totalBots += config.count || 0;
  });
  
  // Check total player count
  const totalPlayers = currentPlayers + totalBots;
  if (totalPlayers > maxPlayers) {
    errors.push(`Too many total players: ${totalPlayers} (max: ${maxPlayers})`);
  }
  
  if (totalPlayers < 2) {
    errors.push(`Not enough players: ${totalPlayers} (min: 2)`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    totalBots,
    totalPlayers
  };
}

module.exports = {
  initializeBotSystem,
  createBotsForLobby,
  getAvailableBotStyles,
  scheduleBotActionsWithErrorHandling,
  cleanupGameBots,
  getBotStatistics,
  validateBotConfiguration,
  botSystem // Export the singleton instance
};