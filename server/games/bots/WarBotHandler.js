// server/games/bots/WarBotHandler.js
// War-specific bot behavior and logic

class WarBotHandler {
  /**
   * Get available bot styles for War game
   * @returns {Array} - Array of bot style definitions
   */
  getAvailableStyles() {
    return [
      {
        id: 'random',
        name: 'Random Player',
        description: 'Makes random decisions (70% play, 30% fold)',
        difficulty: 'easy'
      },
      {
        id: 'always-play',
        name: 'Always Play',
        description: 'Never folds, always plays their card',
        difficulty: 'easy'
      },
      {
        id: 'conservative',
        name: 'Conservative',
        description: 'Plays high cards, folds low cards',
        difficulty: 'medium'
      },
      {
        id: 'aggressive',
        name: 'Aggressive',
        description: 'Almost always plays, rarely folds',
        difficulty: 'medium'
      }
    ];
  }

  /**
   * Generate a bot name based on style
   * @param {string} style - Bot style
   * @returns {string} - Generated bot name
   */
  generateBotName(style) {
    const namesByStyle = {
      'random': ['Chaos Charlie', 'Random Rita', 'Lucky Larry', 'Dice Danny', 'Wild Wendy'],
      'always-play': ['Bold Bella', 'Fearless Frank', 'All-in Alice', 'Brave Bob', 'Gutsy Grace'],
      'conservative': ['Careful Carl', 'Prudent Pam', 'Cautious Kate', 'Safe Sam', 'Steady Steve'],
      'aggressive': ['Risky Rick', 'Daring Diana', 'Bold Bruce', 'Fierce Fiona', 'Gutsy Greg']
    };
    
    const names = namesByStyle[style] || ['Bot Player'];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Get pending bots that need to make actions
   * @param {Object} gameState - Current War game state
   * @param {Object} botSystem - Bot system instance
   * @returns {Array} - Array of bot players that need to act
   */
  getPendingBots(gameState, botSystem) {
    return gameState.players.filter(p => 
      botSystem.isBot(p.id) && 
      p.action === null && 
      gameState.phase === 'playing'
    );
  }

  /**
   * Get action delay for a bot (makes them feel more human)
   * @param {Object} botPlayer - Bot player object
   * @param {number} index - Index in the bot queue
   * @returns {number} - Delay in milliseconds
   */
  getActionDelay(botPlayer, index) {
    // Base delay varies by bot style
    const baseDelays = {
      'random': 1500,      // Random bots think a bit
      'always-play': 800,  // Aggressive bots are quick
      'conservative': 2500, // Conservative bots think longer
      'aggressive': 1000   // Aggressive bots are fairly quick
    };

    const baseDelay = baseDelays[botPlayer.style] || 1500;
    const indexDelay = index * 300; // Stagger bot actions
    const randomDelay = Math.random() * 1000; // Add some randomness

    return baseDelay + indexDelay + randomDelay;
  }

  /**
   * Determine bot action for War game
   * @param {Object} bot - Bot player object
   * @param {Object} gameState - Current War game state
   * @returns {string} - 'play' or 'fold'
   */
  getBotAction(bot, gameState) {
    const botPlayer = gameState.players.find(p => p.id === bot.id);
    if (!botPlayer || !botPlayer.card) return 'fold';

    const cardValue = botPlayer.card;
    const gameVariant = gameState.variant || 'regular';

    switch (bot.style) {
      case 'always-play':
        return 'play';
        
      case 'random':
        // 70% chance to play, 30% chance to fold
        return Math.random() < 0.7 ? 'play' : 'fold';
        
      case 'conservative':
        return this.getConservativeAction(cardValue, gameVariant, gameState);
        
      case 'aggressive':
        return this.getAggressiveAction(cardValue, gameVariant, gameState);
        
      default:
        return 'fold';
    }
  }

  /**
   * Conservative bot logic - plays safe
   * @param {number} cardValue - Bot's card value
   * @param {string} gameVariant - Game variant
   * @param {Object} gameState - Game state
   * @returns {string} - Action
   */
  getConservativeAction(cardValue, gameVariant, gameState) {
    // In Aces High, always play Aces
    if (gameVariant === 'aces-high' && cardValue === 1) {
      return 'play';
    }
    
    // Conservative strategy:
    // - Play if card is 9 or higher (Jack, Queen, King)
    // - Play Aces in regular variant
    // - Consider current score (play more if losing)
    
    const botPlayer = gameState.players.find(p => p.id);
    const isLosing = botPlayer && botPlayer.score < 0;
    
    if (cardValue >= 11) return 'play'; // Face cards
    if (cardValue === 1 && gameVariant === 'regular') return 'play'; // Aces in regular
    if (cardValue >= 9) return 'play'; // High cards
    if (isLosing && cardValue >= 6) return 'play'; // Take more risks when losing
    
    return 'fold';
  }

  /**
   * Aggressive bot logic - takes more risks
   * @param {number} cardValue - Bot's card value
   * @param {string} gameVariant - Game variant
   * @param {Object} gameState - Game state
   * @returns {string} - Action
   */
  getAggressiveAction(cardValue, gameVariant, gameState) {
    // In Aces High, always play Aces
    if (gameVariant === 'aces-high' && cardValue === 1) {
      return 'play';
    }
    
    // Aggressive strategy:
    // - Play most cards (85% of the time)
    // - Only fold very low cards occasionally
    
    if (cardValue >= 6) return 'play'; // Medium to high cards
    if (cardValue === 1 && gameVariant === 'regular') return 'play'; // Aces in regular
    
    // Even with low cards, play 85% of the time
    return Math.random() < 0.85 ? 'play' : 'fold';
  }

  /**
   * Get bot difficulty rating
   * @param {string} style - Bot style
   * @returns {number} - Difficulty from 1-5
   */
  getBotDifficulty(style) {
    const difficulties = {
      'random': 1,
      'always-play': 1,
      'conservative': 3,
      'aggressive': 3
    };
    return difficulties[style] || 1;
  }

  /**
   * Get style description for UI
   * @param {string} style - Bot style
   * @returns {string} - Human readable description
   */
  getStyleDescription(style) {
    const descriptions = {
      'random': 'Unpredictable play style, good for casual games',
      'always-play': 'Never backs down, always commits to the hand',
      'conservative': 'Plays it safe, only commits with strong cards',
      'aggressive': 'Takes risks, plays most hands regardless of card strength'
    };
    return descriptions[style] || 'Unknown bot style';
  }
}

module.exports = WarBotHandler;