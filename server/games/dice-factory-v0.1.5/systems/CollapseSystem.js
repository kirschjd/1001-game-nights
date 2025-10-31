// 1001 Game Nights - Collapse System
// Version: 2.0.0 - Handles factory collapse mechanics
// Updated: December 2024

const { GAME_DEFAULTS } = require('../data/GameConstants');
const { logCollapse, logPlayerFlee, logSystem } = require('../utils/GameLogger');

class CollapseSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Check if factory should start collapsing
   * @returns {Object} - {shouldCollapse: boolean, collapseRoll: number}
   */
  checkForCollapseStart() {
    if (this.gameState.collapseStarted) {
      return { shouldCollapse: true, collapseRoll: null };
    }

    // Roll collapse dice (d4, d6, d8)
    const collapseRoll = this.rollCollapseDice();
    
    // If sum is less than turn counter, collapse begins
    if (collapseRoll < this.gameState.turnCounter) {
      this.gameState.collapseStarted = true;
      this.gameState.lastCollapseRoll = collapseRoll.toString();
      
      this.gameState.gameLog = logCollapse(
        this.gameState.gameLog,
        `Factory collapse begins! Rolled ${collapseRoll}, turn counter is ${this.gameState.turnCounter}`,
        this.gameState.round
      );

      return { shouldCollapse: true, collapseRoll };
    }

    this.gameState.lastCollapseRoll = collapseRoll.toString();
    
    return { shouldCollapse: false, collapseRoll };
  }

  /**
   * Handle end-of-turn collapse mechanics
   * @returns {Object} - {gameEnded: boolean, crushedPlayers: Array}
   */
  processCollapsePhase() {
    if (!this.gameState.collapseStarted) {
      return { gameEnded: false, crushedPlayers: [] };
    }

    // Roll remaining collapse dice
    const collapseRoll = this.rollCollapseDice();
    this.gameState.lastCollapseRoll = collapseRoll.toString();

    // Subtract from turn counter
    this.gameState.turnCounter -= collapseRoll;

    this.gameState.gameLog = logCollapse(
      this.gameState.gameLog,
      `Collapse roll: ${collapseRoll}, turn counter now: ${this.gameState.turnCounter}`,
      this.gameState.round
    );

    // Check if remaining players are crushed
    if (this.gameState.turnCounter <= 0) {
      const crushedPlayers = this.crushRemainingPlayers();
      this.gameState.phase = 'complete';
      
      this.gameState.gameLog = logCollapse(
        this.gameState.gameLog,
        'Factory collapsed! Remaining players were crushed',
        this.gameState.round
      );

      return { gameEnded: true, crushedPlayers };
    }

    return { gameEnded: false, crushedPlayers: [] };
  }

  /**
   * Roll the collapse dice
   * @returns {number} - Sum of collapse dice roll
   */
  rollCollapseDice() {
    const dice = [...this.gameState.collapseDice]; // Copy array
    let total = 0;
    
    for (const sides of dice) {
      const roll = Math.floor(Math.random() * sides) + 1;
      total += roll;
    }
    
    return total;
  }

  /**
   * Player flees the factory
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, message: string}
   */
  playerFlees(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (player.hasFled) {
      return { success: false, message: 'Player has already fled' };
    }

    // Player flees - lock in their score
    player.hasFled = true;
    player.isReady = true;

    // Log flee action
    this.gameState.gameLog = logPlayerFlee(
      this.gameState.gameLog,
      player.name,
      player.score,
      this.gameState.round
    );

    // Remove one collapse die when player flees
    if (this.gameState.collapseDice.length > 1) {
      this.gameState.collapseDice.pop();
      
      this.gameState.gameLog = logCollapse(
        this.gameState.gameLog,
        `${player.name} fled! Removed one collapse die (${this.gameState.collapseDice.length} remaining)`,
        this.gameState.round
      );
    }

    return { 
      success: true, 
      message: `${player.name} fled with ${player.score} points` 
    };
  }

  /**
   * Crush remaining players (set their score to 0)
   * @returns {Array} - Array of crushed player names
   */
  crushRemainingPlayers() {
    const crushedPlayers = [];
    
    for (const player of this.gameState.players) {
      if (!player.hasFled) {
        crushedPlayers.push(player.name);
        player.score = 0;
        
        this.gameState.gameLog = logSystem(
          this.gameState.gameLog,
          `${player.name} was crushed! Score set to 0`,
          this.gameState.round
        );
      }
    }
    
    return crushedPlayers;
  }

  /**
   * Check if all players have fled or been crushed
   * @returns {boolean} - True if collapse phase is complete
   */
  isCollapseComplete() {
    return this.gameState.players.every(p => p.hasFled) || this.gameState.turnCounter <= 0;
  }

  /**
   * Get current collapse status
   * @returns {Object} - Collapse status information
   */
  getCollapseStatus() {
    return {
      isCollapsed: this.gameState.collapseStarted,
      turnCounter: this.gameState.turnCounter,
      collapseDice: [...this.gameState.collapseDice],
      lastRoll: this.gameState.lastCollapseRoll,
      remainingPlayers: this.gameState.players.filter(p => !p.hasFled).length,
      fledPlayers: this.gameState.players.filter(p => p.hasFled).length
    };
  }

  /**
   * Simulate collapse probability
   * @returns {Object} - Probability analysis
   */
  calculateCollapseRisk() {
    if (!this.gameState.collapseStarted) {
      // Calculate probability of collapse starting
      const turnCounter = this.gameState.turnCounter;
      const dice = this.gameState.collapseDice;
      
      // Simple probability calculation (exact calculation would be complex)
      const minRoll = dice.length; // Minimum possible roll
      const maxRoll = dice.reduce((sum, sides) => sum + sides, 0); // Maximum possible roll
      const avgRoll = dice.reduce((sum, sides) => sum + (sides + 1) / 2, 0); // Average roll
      
      const riskLevel = turnCounter <= avgRoll ? 'HIGH' : 
                       turnCounter <= avgRoll + 2 ? 'MEDIUM' : 'LOW';
      
      return {
        phase: 'pre-collapse',
        riskLevel,
        turnCounter,
        averageCollapseRoll: Math.round(avgRoll),
        minRoll,
        maxRoll
      };
    } else {
      // Calculate probability of being crushed
      const dice = this.gameState.collapseDice;
      const currentCounter = this.gameState.turnCounter;
      
      const minRoll = dice.length;
      const maxRoll = dice.reduce((sum, sides) => sum + sides, 0);
      const avgRoll = dice.reduce((sum, sides) => sum + (sides + 1) / 2, 0);
      
      const crushRisk = currentCounter <= avgRoll ? 'HIGH' : 
                       currentCounter <= avgRoll + 2 ? 'MEDIUM' : 'LOW';
      
      return {
        phase: 'collapsing',
        crushRisk,
        turnsRemaining: currentCounter,
        averageCollapseRoll: Math.round(avgRoll),
        remainingDice: dice.length,
        minRoll,
        maxRoll
      };
    }
  }

  /**
   * Reset collapse state for new game
   */
  resetCollapseState() {
    this.gameState.collapseStarted = false;
    this.gameState.collapseDice = [...GAME_DEFAULTS.COLLAPSE_DICE];
    this.gameState.lastCollapseRoll = null;
    this.gameState.turnCounter = 1;
    
    // Reset player flee status
    for (const player of this.gameState.players) {
      player.hasFled = false;
    }
  }

  /**
   * Apply collapse effects to game state
   * @param {string} effectType - Type of collapse effect
   * @param {Object} options - Effect options
   * @returns {Object} - {success: boolean, message: string}
   */
  applyCollapseEffect(effectType, options = {}) {
    switch (effectType) {
      case 'speed_collapse':
        // Some effect might speed up collapse
        this.gameState.turnCounter += options.amount || 1;
        this.gameState.gameLog = logCollapse(
          this.gameState.gameLog,
          `Collapse accelerated! Turn counter increased by ${options.amount || 1}`,
          this.gameState.round
        );
        return { success: true, message: 'Collapse accelerated' };
        
      case 'slow_collapse':
        // Some effect might slow down collapse
        this.gameState.turnCounter -= options.amount || 1;
        this.gameState.gameLog = logCollapse(
          this.gameState.gameLog,
          `Collapse slowed! Turn counter decreased by ${options.amount || 1}`,
          this.gameState.round
        );
        return { success: true, message: 'Collapse slowed' };
        
      case 'add_collapse_die':
        // Add a collapse die
        this.gameState.collapseDice.push(options.sides || 6);
        this.gameState.gameLog = logCollapse(
          this.gameState.gameLog,
          `Added d${options.sides || 6} to collapse dice`,
          this.gameState.round
        );
        return { success: true, message: 'Added collapse die' };
        
      default:
        return { success: false, message: 'Unknown collapse effect' };
    }
  }
}

module.exports = CollapseSystem;