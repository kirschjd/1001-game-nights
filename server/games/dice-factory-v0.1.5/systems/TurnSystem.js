// 1001 Game Nights - Turn System
// Version: 2.1.0 - Added modification auction integration
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
   * @param {string} dividendChoice - 'pips' or 'points' for Dividend mod
   * @returns {Object} - {success: boolean, message: string}
   */
  setPlayerReady(playerId, dividendChoice) {
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

    // Convert unused dice to pips or points (Dividend mod)
    this.convertUnusedDiceToPips(player, dividendChoice);

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
      // IMPORTANT: Don't advance turn immediately - we need auction resolution first
      this.gameState.allPlayersReady = true;
      
      this.gameState.gameLog = logSystem(
        this.gameState.gameLog,
        'All players ready - resolving auctions...',
        this.gameState.round
      );
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
   * Advance to next turn/round (called after auction resolution)
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
   * Process end-of-turn auction resolution
   * @param {Object} factorySystem - Factory system instance for auction resolution
   * @returns {Object} - {needsAuction: boolean, auctions: Array}
   */
  processEndOfTurnAuctions(factorySystem) {
    if (!this.areAllPlayersReady()) {
      return { needsAuction: false, auctions: [] };
    }

    // Resolve modification auctions
    const auctionResult = factorySystem.resolveModificationAuctions();
    
    if (auctionResult.auctions.length > 0) {
      // There are modifications that need blind auction resolution
      this.gameState.gameLog = logSystem(
        this.gameState.gameLog,
        `${auctionResult.auctions.length} modifications require auction resolution`,
        this.gameState.round
      );
      
      return { needsAuction: true, auctions: auctionResult.auctions };
    } else {
      // No auctions needed - can advance turn immediately
      this.completeEndOfTurn(factorySystem);
      return { needsAuction: false, auctions: [] };
    }
  }

  /**
   * Complete end-of-turn processing after auctions are resolved
   * @param {Object} factorySystem - Factory system instance
   */
  completeEndOfTurn(factorySystem) {
    // Start new factory turn (draw new modifications)
    factorySystem.startNewTurn();
    
    // Process other end-of-turn effects
    this.processOtherEndOfTurnEffects();
    
    // Advance to next turn
    this.advanceToNextTurn();
  }

  /**
   * Process other end-of-turn effects (collapse, etc.)
   */
  processOtherEndOfTurnEffects() {
    // Apply Corporate Debt penalty
    for (const player of this.gameState.players) {
      if (player.modifications?.includes('corporate_debt') && player.freePips < 0) {
        const debtPenalty = Math.abs(player.freePips);
        player.score -= debtPenalty;
        
        this.gameState.gameLog = logAction(
          this.gameState.gameLog,
          player.name,
          `lost ${debtPenalty} points due to Corporate Debt`,
          this.gameState.round
        );
      }
    }

    // Other end-of-turn processing would go here
    // (collapse checks, factory triggers, etc.)
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
  
    // CLEAR ACTION HISTORY - fresh start for new turn
    player.actionHistory = [];
  
    // Clear modification bids
    player.modificationBids = {};

    // Reset cash flow enhancement usage
    player._cashFlowUsedThisTurn = false;
    // Reset quality control usage
    player._qualityControlUsedThisTurn = false;
    // Reset Dice Tower usage
    player._diceTowerUsedThisTurn = false;
    // Reset arbitrage usage
    player._arbitrageUsedThisTurn = false;
    // Reset roller derby usage
    player._rollerDerbyUsedThisTurn = false;
    // Reset outsourcing usage
    player._outsourcingUsedThisTurn = false;
  
    // Ensure minimum dice pool
    const minDiceCheck = require('../data/ValidationRules').validateMinimumDicePool(player);
    if (minDiceCheck.needsRecruitment) {
      // Determine minimum die size based on modifications
      const minimumDieSize = player.modifications?.includes('dice_pool_upgrade') ? 6 : 4;
      player.dicePool = require('../utils/DiceHelpers').autoRecruitToFloor(player.dicePool, player.diceFloor, minimumDieSize);
      
      this.gameState.gameLog = require('../utils/GameLogger').logAction(
        this.gameState.gameLog,
        player.name,
        `auto-recruited ${minDiceCheck.diceNeeded} dice to meet minimum floor`,
        this.gameState.round
      );
    }
  
    // Process turn-start modification effects
    this.processTurnStartModifications(player);
  
    // AUTO-ROLL all dice at start of turn
    this.autoRollPlayerDice(player);
  }

  /**
   * Process modification effects that trigger at turn start
   * @param {Object} player - Player object
   */
  processTurnStartModifications(player) {
    // Dice Tower: Option to reroll all dice
    if (player.modifications?.includes('dice_tower')) {
      // This would be handled by the player during their turn
      // Just log that the option is available
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        'has Dice Tower available (can reroll all dice)',
        this.gameState.round
      );
    }

    // Roller Derby: Option to recruit d4 for everyone
    if (player.modifications?.includes('roller_derby') && !player._rollerDerbyUsedThisTurn) {
      // Recruit a d4 for the player (free recruitment)
      const DiceHelpers = require('../utils/DiceHelpers');
      const newDie = DiceHelpers.createDie(4);
      player.dicePool.push(newDie);
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        'used Roller Derby: recruited a d4 for everyone',
        this.gameState.round
      );
      // All players (including this one) recruit a d4
      for (const p of this.gameState.players) {
        p.dicePool.push(DiceHelpers.createDie(4));
        p._rollerDerbyUsedThisTurn = true;
      }
    }


  }

  /**
   * Auto-roll all dice for a player (no button needed)
   * @param {Object} player - Player object
   */
  autoRollPlayerDice(player) {
    // Determine die type based on modifications
    let dieType = 4; // Default d4
    if (player.modifications?.includes('dice_pool_upgrade')) {
      dieType = 6; // Upgrade to d6
    }

    // Check for 2rUS modification
    const has2rUS = player.modifications?.includes('tworus');

    // Roll all dice in player's pool (preventing 2s if they have 2rUS)
    const DiceHelpers = require('../utils/DiceHelpers');
    const rolledDice = DiceHelpers.rollDiceWithout2s(player.dicePool, has2rUS);
    
    // Update the dice values
    for (let i = 0; i < player.dicePool.length; i++) {
      player.dicePool[i].value = rolledDice[i].value;
    }

    // Log the auto-roll
    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      `dice auto-rolled: ${player.dicePool.map(d => `${d.value}(d${d.sides})`).join(', ')}${has2rUS ? ' (2rUS prevented 2s)' : ''}`,
      this.gameState.round
    );
  }

  /**
   * Convert unused dice to pips at end of turn
   * @param {Object} player - Player object
   * @param {string} dividendChoice - 'pips' or 'points' for Dividend mod
   */
  convertUnusedDiceToPips(player, dividendChoice) {
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

    // Check for Dividend modification
    const hasDividend = player.modifications?.includes('dividend');
    
    if (hasDividend && dividendChoice === 'points' && unusedDice.length > 0) {
      // Convert only one unused die (the highest value) to points, rest to pips
      const sortedDice = [...unusedDice].sort((a, b) => b.value - a.value);
      const dieForPoints = sortedDice[0];
      const pointsGained = dieForPoints.value;
      player.score += pointsGained;
      // Remove the die used for points from the unusedDice array
      const remainingDice = sortedDice.slice(1);
      let pipsGained = 0;
      for (const die of remainingDice) {
        pipsGained += die.value;
      }
      player.freePips += pipsGained;
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        `converted 1 unused die to ${pointsGained} points (Dividend), ${remainingDice.length} dice to ${pipsGained} pips`,
        this.gameState.round
      );
    } else {
      // Standard conversion to pips (1 pip per die value)
      let pipsGained = 0;
      for (const die of unusedDice) {
        pipsGained += die.value;
      }
      player.freePips += pipsGained;
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        `converted ${unusedDice.length} unused dice to ${pipsGained} pips${hasDividend ? ' (Dividend available)' : ''}`,
        this.gameState.round
      );
    }
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
    
    // Check experimental turn limit
    if (this.gameState.variant === 'experimental' && this.gameState.experimentalTurnLimit) {
      if (this.gameState.round > this.gameState.experimentalTurnLimit) {
        return { shouldEnd: true, reason: 'Turn limit reached' };
      }
    }
    
    // Other end conditions can be added here
    return { shouldEnd: false, reason: '' };
  }
}

module.exports = TurnSystem;