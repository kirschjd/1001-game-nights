// server/games/bots/BotSystem.js
// Core bot management system - game agnostic

class BotPlayer {
  constructor(id, name, style, gameType) {
    this.id = id;
    this.name = name;
    this.style = style; // 'random', 'always-play', 'conservative', 'aggressive', etc.
    this.gameType = gameType; // 'war', 'dice-factory', etc.
    this.isBot = true;
    this.isConnected = true; // Bots are always "connected"
    this.metadata = {}; // Game-specific data storage
  }
}

class BotSystem {
  constructor() {
    this.bots = new Map(); // botId -> BotPlayer
    this.gameTimers = new Map(); // gameId -> timer for bot actions
    this.gameHandlers = new Map(); // gameType -> game-specific handler
  }

  /**
   * Register a game-specific bot handler
   * @param {string} gameType - Game type ('war', 'dice-factory', etc.)
   * @param {Object} handler - Game-specific bot handler
   */
  registerGameHandler(gameType, handler) {
    this.gameHandlers.set(gameType, handler);
    console.log(`Registered bot handler for ${gameType}`);
  }

  /**
   * Get available bot styles for a specific game
   * @param {string} gameType - Game type
   * @returns {Array} - Array of bot style definitions
   */
  getAvailableBotStyles(gameType) {
    const handler = this.gameHandlers.get(gameType);
    return handler ? handler.getAvailableStyles() : [];
  }

  /**
   * Create a new bot player
   * @param {string} style - Bot behavior style
   * @param {string} gameType - Game type this bot is for
   * @returns {BotPlayer} - The created bot
   */
  createBot(style, gameType) {
    const botId = `bot_${gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const handler = this.gameHandlers.get(gameType);
    const name = handler ? handler.generateBotName(style) : `${style} Bot`;
    
    const bot = new BotPlayer(botId, name, style, gameType);
    this.bots.set(botId, bot);
    
    console.log(`Created ${style} bot for ${gameType}: ${name} (${botId})`);
    return bot;
  }

  /**
   * Get bot by ID
   * @param {string} botId - Bot ID
   * @returns {BotPlayer|null} - The bot or null
   */
  getBot(botId) {
    return this.bots.get(botId) || null;
  }

  /**
   * Check if player is a bot
   * @param {string} playerId - Player ID to check
   * @returns {boolean} - True if player is a bot
   */
  isBot(playerId) {
    return this.bots.has(playerId);
  }

  /**
   * Get bot action for any game type
   * @param {string} botId - Bot ID
   * @param {Object} gameState - Current game state
   * @returns {any} - Game-specific action (string, object, etc.)
   */
  getBotAction(botId, gameState) {
    const bot = this.getBot(botId);
    if (!bot) return null;

    const handler = this.gameHandlers.get(bot.gameType);
    if (!handler) {
      console.warn(`No handler found for game type: ${bot.gameType}`);
      return null;
    }

    return handler.getBotAction(bot, gameState);
  }

  // Add this method to BotSystem.js class

  /**
   * Execute a bot's turn for any game type
   * @param {Object} io - Socket.io instance  
   * @param {string} lobbySlug - Lobby identifier
   * @param {Object} game - Game instance
   * @param {Map} lobbies - Lobbies storage
   * @param {string} botId - Bot ID to execute turn for
   */
  executeBotTurn(io, lobbySlug, game, lobbies, botId) {
  console.log(`🤖 Executing bot turn for ${botId}`);
  
  const bot = this.getBot(botId);
  if (!bot) {
    console.log(`❌ Bot ${botId} not found`);
    return;
  }

  const gameState = game.getGameState();
  const action = this.getBotAction(botId, gameState);
  
  if (!action) {
    console.log(`❌ No action returned for bot ${botId}`);
    return;
  }

  console.log(`🎮 Bot ${bot.name} taking action:`, action);

  // Execute the action on the game
  let result;
  if (action.action === 'end-turn') {
    result = game.setPlayerReady(botId);
  } else {
    result = game.processAction(botId, action);
  }

  if (result.success) {
    console.log(`✅ Bot ${bot.name} action successful`);
    
    // Broadcast update to all human players
    const lobby = lobbies.get(lobbySlug);
    if (lobby) {
      lobby.players.forEach(player => {
        if (player.isConnected && !this.isBot(player.id)) {
          const playerView = game.getPlayerView(player.id);
          io.to(player.id).emit('game-state-updated', playerView);
        }
      });
    }
  } else {
    console.log(`❌ Bot ${bot.name} action failed:`, result.error);
  }
  }

  /**
   * Schedule bot actions for a game
   * @param {string} gameId - Game/lobby slug
   * @param {Object} gameState - Current game state
   * @param {Function} actionCallback - Function to call when bot makes action
   */
  scheduleBotActions(gameId, gameState, actionCallback) {
    // Clear any existing timer for this game
    this.clearBotTimer(gameId);

    const gameType = gameState.type;
    const handler = this.gameHandlers.get(gameType);
    
    if (!handler) {
      console.warn(`No bot handler for game type: ${gameType}`);
      return;
    }

    const pendingBots = handler.getPendingBots(gameState, this);
    if (pendingBots.length === 0) return;

    console.log(`Scheduling actions for ${pendingBots.length} bots in ${gameType} game ${gameId}`);

    // Schedule bot actions with realistic delays
    pendingBots.forEach((botPlayer, index) => {
      const delay = handler.getActionDelay(botPlayer, index);
      
      const timer = setTimeout(() => {
        const action = this.getBotAction(botPlayer.id, gameState);
        if (action !== null) {
          console.log(`Bot ${botPlayer.name} choosing: ${JSON.stringify(action)}`);
          actionCallback(botPlayer.id, action);
        }
      }, delay);

      // Store the timer so we can clear it if needed
      if (!this.gameTimers.has(gameId)) {
        this.gameTimers.set(gameId, []);
      }
      this.gameTimers.get(gameId).push(timer);
    });
  }

  /**
   * Clear bot timers for a game
   * @param {string} gameId - Game/lobby slug
   */
  clearBotTimer(gameId) {
    const timers = this.gameTimers.get(gameId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.gameTimers.delete(gameId);
    }
  }

  /**
   * Remove bot
   * @param {string} botId - Bot ID to remove
   */
  removeBot(botId) {
    this.bots.delete(botId);
    console.log(`Removed bot: ${botId}`);
  }

  /**
   * Clean up all bots for a game
   * @param {string} gameId - Game/lobby slug
   */
  cleanupGame(gameId) {
    this.clearBotTimer(gameId);
  }

  /**
   * Get all bot names (for debugging/admin)
   * @returns {Array} - Array of bot info
   */
  getAllBots() {
    return Array.from(this.bots.values()).map(bot => ({
      id: bot.id,
      name: bot.name,
      style: bot.style,
      gameType: bot.gameType
    }));
  }

  /**
   * Update bot metadata (game-specific data)
   * @param {string} botId - Bot ID
   * @param {Object} metadata - Metadata to store
   */
  updateBotMetadata(botId, metadata) {
    const bot = this.getBot(botId);
    if (bot) {
      bot.metadata = { ...bot.metadata, ...metadata };
    }
  }

  /**
   * Get bot metadata
   * @param {string} botId - Bot ID
   * @returns {Object} - Bot metadata
   */
  getBotMetadata(botId) {
    const bot = this.getBot(botId);
    return bot ? bot.metadata : {};
  }
}

// Create singleton instance
const botSystem = new BotSystem();

module.exports = {
  BotSystem,
  BotPlayer,
  botSystem
};