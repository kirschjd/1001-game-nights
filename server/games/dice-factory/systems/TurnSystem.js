// 1001 Game Nights - Turn System
// Version: 2.0.0 - Handles turn and round management
// Updated: December 2024

const { validatePlayerAction, validateMinimumDicePool } = require('../data/ValidationRules');
const { logSystem, logAction } = require('../utils/GameLogger');
const { autoRecruitToFloor } = require('../utils/DiceHelpers');

class TurnSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Set player as ready (end their turn)
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, message: string}
   */
  setPlayerReady(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (player.hasFled) {
      return { success: false, message: 'Player has fled' };
    }

    if (player.isReady) {
      return { success: false, message: 'Player is already ready' };
    }

    // Validate player can end turn
    const validation = validatePlayerAction(player, this.gameState);
    if (!validation.canAct && !player.isReady) {
      return { success: false, message: validation.reason };
    }

    // Convert unused dice to pips (if any)
    this.convertUnusedDiceToPips(player);

    // Set player as ready
    player.isReady = true;

    // Clear exhausted dice for next turn
    player.exhaustedDice = [];

    // Save turn state for undo functionality
    this.saveTurnState(player);

    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      'ended their turn',
      this.gameState.round
    );

    // Check if all players are ready
    if (this.areAllPlayersReady()) {
      this.advanceToNextTurn();
    }

    return { 
      success: true, 
      message: `${player.name} is ready` 
    };
  }

  /**
   * Check if all active players are ready
   * @returns {boolean} - True if all players are ready or have fled
   */
  areAllPlayersReady() {
    return this.gameState.players.every(p => p.isReady || p.hasFled);
  }

  /**
   * Advance to next turn/round
   */
  advanceToNextTurn() {
    // Increment turn counter and round
    this.gameState.turnCounter++;
    this.gameState.round++;

    // Reset all players for next turn
    for (const player of this.gameState.players) {
      if (!player.hasFled) {
        this.resetPlayerForNextTurn(player);
      }
    }

    this.gameState.gameLog = logSystem(
      this.gameState.gameLog,
      `=== ROUND ${this.gameState.round} BEGINS ===`,
      this.gameState.round
    );

    // Update game state
    this.gameState.allPlayersReady = false;
  }

  /**
   * Reset a player for the next turn
   * @param {Object} player - Player object
   */
  resetPlayerForNextTurn(player) {
    // Reset ready status
    player.isReady = false;

    // Clear turn actions and exhausted dice
    player.currentTurnActions = [];
    player.exhaustedDice = [];

    // Ensure minimum dice pool
    const minDiceCheck = validateMinimumDicePool(player);
    if (minDiceCheck.needsRecruitment) {
      player.dicePool = autoRecruitToFloor(player.dicePool, player.diceFloor);
      
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        `auto-recruited ${minDiceCheck.diceNeeded} dice to meet minimum floor`,
        this.gameState.round
      );
    }

    // AUTO-ROLL all dice at start of turn
    this.autoRollPlayerDice(player);
  }

  /**
   * Auto-roll all dice for a player (no button needed)
   * @param {Object} player - Player object
   */
  autoRollPlayerDice(player) {
    // Roll all dice in player's pool
    for (const die of player.dicePool) {
      die.value = Math.floor(Math.random() * die.sides) + 1;
    }

    // Log the auto-roll
    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      `dice auto-rolled: ${player.dicePool.map(d => `${d.value}(d${d.sides})`).join(', ')}`,
      this.gameState.round
    );
  }

  /**
   * Convert unused dice to pips at end of turn
   * @param {Object} player - Player object
   */
  convertUnusedDiceToPips(player) {
    if (!player.dicePool || player.dicePool.length === 0) {
      return;
    }

    // Find unused dice (have values but not exhausted)
    const unusedDice = player.dicePool.filter(die => 
      die.value !== null && 
      (!player.exhaustedDice || !player.exhaustedDice.includes(die.id))
    );

    if (unusedDice.length === 0) {
      return;
    }

    // Convert to pips (1 pip per die value)
    let pipsGained = 0;
    for (const die of unusedDice) {
      pipsGained += die.value;
    }

    player.freePips += pipsGained;

    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      `converted ${unusedDice.length} unused dice to ${pipsGained} pips`,
      this.gameState.round
    );
  }

  /**
   * Save turn state for undo functionality
   * @param {Object} player - Player object
   */
  saveTurnState(player) {
    player.turnStartState = {
      dicePool: JSON.parse(JSON.stringify(player.dicePool)),
      freePips: player.freePips,
      score: player.score,
      modifications: [...(player.modifications || [])],
      effects: [...(player.effects || [])],
      factoryHand: [...(player.factoryHand || [])]
    };
  }

  /**
   * Undo player's turn (restore to turn start state)
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, message: string}
   */
  undoPlayerTurn(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (!player.turnStartState) {
      return { success: false, message: 'No turn state to restore' };
    }

    if (player.isReady) {
      return { success: false, message: 'Cannot undo after ending turn' };
    }

    // Restore player state
    player.dicePool = JSON.parse(JSON.stringify(player.turnStartState.dicePool));
    player.freePips = player.turnStartState.freePips;
    player.score = player.turnStartState.score;
    player.modifications = [...player.turnStartState.modifications];
    player.effects = [...player.turnStartState.effects];
    player.factoryHand = [...player.turnStartState.factoryHand];

    // Clear turn tracking
    player.currentTurnActions = [];
    player.exhaustedDice = [];

    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      'undid their entire turn',
      this.gameState.round
    );

    return { 
      success: true, 
      message: `${player.name}'s turn was undone` 
    };
  }

  /**
   * Get current turn status
   * @returns {Object} - Turn status information
   */
  getTurnStatus() {
    const playersReady = this.gameState.players.filter(p => p.isReady && !p.hasFled).length;
    const playersActive = this.gameState.players.filter(p => !p.hasFled).length;
    const playersFled = this.gameState.players.filter(p => p.hasFled).length;

    return {
      round: this.gameState.round,
      turnCounter: this.gameState.turnCounter,
      playersReady,
      playersActive,
      playersFled,
      allReady: this.areAllPlayersReady(),
      phase: this.gameState.phase
    };
  }

  /**
   * Force advance turn (admin/debug function)
   * @returns {Object} - {success: boolean, message: string}
   */
  forceAdvanceTurn() {
    // Set all active players as ready
    for (const player of this.gameState.players) {
      if (!player.hasFled) {
        player.isReady = true;
      }
    }

    this.advanceToNextTurn();

    this.gameState.gameLog = logSystem(
      this.gameState.gameLog,
      'Turn was force-advanced',
      this.gameState.round
    );

    return { 
      success: true, 
      message: 'Turn force-advanced' 
    };
  }

  /**
   * Get players who still need to end their turn
   * @returns {Array} - Array of player objects who are not ready
   */
  getPlayersNotReady() {
    return this.gameState.players.filter(p => !p.isReady && !p.hasFled);
  }

  /**
   * Check if a specific player can take actions
   * @param {string} playerId - Player ID
   * @returns {Object} - {canAct: boolean, reason: string}
   */
  canPlayerAct(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { canAct: false, reason: 'Player not found' };
    }

    return validatePlayerAction(player, this.gameState);
  }

  /**
   * Record a player action for turn tracking
   * @param {string} playerId - Player ID
   * @param {string} action - Action description
   * @param {Object} actionData - Action data for undo
   */
  recordPlayerAction(playerId, action, actionData = {}) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return;
    }

    if (!player.currentTurnActions) {
      player.currentTurnActions = [];
    }

    player.currentTurnActions.push({
      action,
      timestamp: new Date().toISOString(),
      data: actionData
    });
  }

  /**
   * Get turn statistics
   * @returns {Object} - Turn statistics
   */
  getTurnStatistics() {
    const stats = {
      currentRound: this.gameState.round,
      currentTurnCounter: this.gameState.turnCounter,
      totalPlayers: this.gameState.players.length,
      activePlayers: this.gameState.players.filter(p => !p.hasFled).length,
      readyPlayers: this.gameState.players.filter(p => p.isReady).length,
      fledPlayers: this.gameState.players.filter(p => p.hasFled).length,
      averageActionsPerTurn: 0,
      playerActionCounts: {}
    };

    // Calculate average actions per turn
    let totalActions = 0;
    for (const player of this.gameState.players) {
      const actionCount = player.currentTurnActions?.length || 0;
      totalActions += actionCount;
      stats.playerActionCounts[player.id] = actionCount;
    }

    if (stats.activePlayers > 0) {
      stats.averageActionsPerTurn = totalActions / stats.activePlayers;
    }

    return stats;
  }

  /**
   * Check if game should end due to turn conditions
   * @returns {Object} - {shouldEnd: boolean, reason: string}
   */
  checkTurnEndConditions() {
    // Check if all players have fled
    const activePlayers = this.gameState.players.filter(p => !p.hasFled);
    if (activePlayers.length === 0) {
      return { shouldEnd: true, reason: 'All players have fled' };
    }

    // Check if only one player remains
    if (activePlayers.length === 1) {
      return { shouldEnd: true, reason: 'Only one player remains' };
    }

    // Other end conditions can be added here
    
    return { shouldEnd: false, reason: '' };
  }

  /**
   * Reset turn system for new game 
   */
  resetTurnSystem() {
    this.gameState.round = 1;
    this.gameState.turnCounter = 1;
    this.gameState.allPlayersReady = false;

    for (const player of this.gameState.players) {
      player.isReady = false;
      player.currentTurnActions = [];
      player.exhaustedDice = [];
      player.turnStartState = null;
    }
  }
}

module.exports = TurnSystem;