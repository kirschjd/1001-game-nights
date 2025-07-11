// Enhanced Dice Factory Bot Handler with Pass Bot and Easy Bot Implementation
// server/games/bots/DiceFactoryBotHandler.js

class DiceFactoryBotHandler {
  /**
   * Get available bot styles for Dice Factory game
   * @returns {Array} - Array of bot style definitions
   */
  getAvailableStyles() {
    return [
      {
        id: 'pass',
        name: 'Pass Bot',
        description: 'Immediately ends turn without taking any actions',
        difficulty: 'easy'
      },
      {
        id: 'easy',
        name: 'Easy Bot',
        description: 'Scores if possible, then recruits and promotes aggressively',
        difficulty: 'easy'
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
      'pass': ['Lazy Larry', 'Pass Pat', 'Skip Sam', 'Idle Ian', 'Sleepy Sue'],
      'easy': ['Simple Sam', 'Easy Eddie', 'Basic Bob', 'Straightforward Sue', 'Simple Simon']
    };
    
    const names = namesByStyle[style] || ['Dice Bot'];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Get pending bots that need to make actions
   * @param {Object} gameState - Current Dice Factory game state
   * @param {Object} botSystem - Bot system instance
   * @returns {Array} - Array of bot players that need to act
   */
  getPendingBots(gameState, botSystem) {
    // Check if it's a bot's turn and they haven't acted yet
    if (gameState.phase !== 'playing') {
      return [];
    }
    
    const pendingBots = gameState.players.filter(p => {
      const isBot = botSystem.isBot(p.id);
      const notReady = !p.isReady;
      const notFled = !p.hasFled;
      
      return isBot && notReady && notFled;
    });
    
    return pendingBots;
  }

  /**
   * Get action delay for a bot
   * @param {Object} botPlayer - Bot player object
   * @param {number} index - Index in the bot queue
   * @returns {number} - Delay in milliseconds
   */
  getActionDelay(botPlayer, index) {
    // Dice Factory bots need different thinking times
    const baseDelays = {
      'pass': 500,           // Pass bots are very quick
      'easy': 1500           // Easy bots need time to think about actions
    };

    const baseDelay = baseDelays[botPlayer.botStyle] || 2000;
    const randomDelay = Math.random() * 1000; // Add some randomness

    return baseDelay + randomDelay;
  }

  /**
   * Determine bot action for Dice Factory game
   * @param {Object} bot - Bot player object
   * @param {Object} gameState - Current Dice Factory game state
   * @returns {Object} - Action object
   */
  getBotAction(bot, gameState) {
    const botPlayer = gameState.players.find(p => p.id === bot.id);
    if (!botPlayer) {
      return null;
    }

    switch (bot.botStyle) {
      case 'pass':
        return this.getPassAction(botPlayer, gameState);
        
      case 'easy':
        return this.getEasyAction(botPlayer, gameState);
        
      default:
        return this.getPassAction(botPlayer, gameState);
    }
  }

  /**
   * Pass bot action logic - immediately end turn
   * @param {Object} botPlayer - Bot player data
   * @param {Object} gameState - Game state
   * @returns {Object} - End turn action
   */
  getPassAction(botPlayer, gameState) {
    return { 
      action: 'end-turn' 
    };
  }

  /**
   * Easy bot action logic - score, recruit, promote, then pass
   * @param {Object} botPlayer - Bot player data
   * @param {Object} gameState - Game state
   * @returns {Object} - Action
   */
  getEasyAction(botPlayer, gameState) {
    // 1. First, try to score if possible (main goal)
    const scoringAction = this.findBestScoringAction(botPlayer, gameState);
    if (scoringAction) {
      return scoringAction;
    }
    
    // 2. Try to promote dice (free action if at max value)
    const promoteAction = this.findPromoteAction(botPlayer, gameState);
    if (promoteAction) {
      return promoteAction;
    }
    
    // 3. Try to recruit dice (free action)
    const recruitAction = this.findRecruitAction(botPlayer, gameState);
    if (recruitAction) {
      return recruitAction;
    }
    
    // 4. If no actions possible, end turn
    return { action: 'end-turn' };
  }

  /**
   * Find the best scoring action for the bot
   * @param {Object} botPlayer - Bot player data
   * @param {Object} gameState - Game state
   * @returns {Object|null} - Best scoring action or null
   */
  findBestScoringAction(botPlayer, gameState) {
    const dicePool = botPlayer.dicePool || [];
    
    // Filter out dice with null values (unusable dice)
    const usableDice = dicePool.filter(die => die.value !== null);
    
    if (usableDice.length < 3) {
      return null;
    }
    
    // Find all possible scoring combinations using only usable dice
    const scoringCombinations = this.findScoringCombinations(usableDice);
    
    if (scoringCombinations.length === 0) return null;
    
    // Sort by points (highest first)
    scoringCombinations.sort((a, b) => b.points - a.points);
    
    const bestCombination = scoringCombinations[0];
    
    return {
      action: bestCombination.type === 'straight' ? 'score-straight' : 'score-set',
      diceIds: bestCombination.diceIds
    };
  }

  /**
   * Find all possible scoring combinations
   * @param {Array} dicePool - Player's dice pool
   * @returns {Array} - Array of scoring combinations with points
   */
  findScoringCombinations(dicePool) {
    const combinations = [];
    
    // Check for straights (consecutive values)
    for (let start = 1; start <= 6; start++) {
      const straight = [];
      for (let i = 0; i < 3; i++) {
        const value = start + i;
        const die = dicePool.find(d => d.value === value);
        if (die) {
          straight.push(die);
        } else {
          break;
        }
      }
      if (straight.length >= 3) {
        combinations.push({
          type: 'straight',
          diceIds: straight.map(d => d.id),
          points: straight.length * 2
        });
      }
    }
    
    // Check for sets (same value)
    const valueCounts = {};
    dicePool.forEach(die => {
      valueCounts[die.value] = (valueCounts[die.value] || 0) + 1;
    });
    
    Object.entries(valueCounts).forEach(([value, count]) => {
      if (count >= 3) {
        const setDice = dicePool.filter(d => d.value === parseInt(value)).slice(0, count);
        combinations.push({
          type: 'set',
          diceIds: setDice.map(d => d.id),
          points: count * parseInt(value)
        });
      }
    });
    
    return combinations;
  }

  /**
   * Find recruitment action for the bot
   * @param {Object} botPlayer - Bot player data
   * @param {Object} gameState - Game state
   * @returns {Object|null} - Recruitment action or null
   */
  findRecruitAction(botPlayer, gameState) {
    const dicePool = botPlayer.dicePool || [];
    
    // Filter out dice with null values (unusable dice) and exhausted dice
    const usableDice = dicePool.filter(die => {
      const hasValue = die.value !== null;
      const notExhausted = !botPlayer.exhaustedDice || !botPlayer.exhaustedDice.includes(die.id);
      return hasValue && notExhausted;
    });
    
    const recruitmentTable = {
      4: [1],           // d4 recruits on rolling 1
      6: [1, 2],        // d6 recruits on rolling 1 or 2
      8: [1, 2, 3],     // d8 recruits on rolling 1, 2, or 3
      10: [1, 2, 3, 4], // d10 recruits on rolling 1, 2, 3, or 4
      12: [1, 2, 3, 4, 5] // d12 recruits on rolling 1, 2, 3, 4, or 5
    };
    
    // Find dice that can recruit (only usable and non-exhausted dice)
    const recruitableDice = usableDice.filter(die => {
      const recruitValues = recruitmentTable[die.sides] || [];
      const canRecruit = recruitValues.includes(die.value);
      return canRecruit;
    });
    
    if (recruitableDice.length === 0) return null;
    
    // Just recruit the first available die
    return {
      action: 'recruit',
      diceIds: [recruitableDice[0].id]
    };
  }

  /**
   * Find promotion action for the bot
   * @param {Object} botPlayer - Bot player data
   * @param {Object} gameState - Game state
   * @returns {Object|null} - Promotion action or null
   */
  findPromoteAction(botPlayer, gameState) {
    const dicePool = botPlayer.dicePool || [];
    const freePips = botPlayer.freePips || 0;
    
    // Filter out dice with null values (unusable dice) and exhausted dice
    const usableDice = dicePool.filter(die => {
      const hasValue = die.value !== null;
      const notExhausted = !botPlayer.exhaustedDice || !botPlayer.exhaustedDice.includes(die.id);
      return hasValue && notExhausted;
    });
    
    if (freePips < 2) {
      return null;
    }
    
    // Find dice that can be promoted (only usable and non-exhausted dice, not already max size AND at max value)
    const promotableDice = usableDice.filter(die => {
      const canPromote = die.sides < 12 && die.value === die.sides;
      return canPromote;
    });
    
    if (promotableDice.length === 0) return null;
    
    // Promote the first available die
    return {
      action: 'promote',
      diceIds: [promotableDice[0].id]
    };
  }

  /**
   * Analyze game state for bot decision making
   * @param {Object} gameState - Current game state
   * @returns {Object} - Analysis results
   */
  analyzeGameState(gameState) {
    // Basic analysis for future bot implementations
    return {
      phase: gameState.phase,
      round: gameState.round,
      playerCount: gameState.players.length,
      activePlayers: gameState.players.filter(p => !p.hasFled).length
    };
  }
}

module.exports = DiceFactoryBotHandler;