// 1001 Game Nights - Dice System
// Version: 2.0.0 - Handles all dice operations
// Updated: December 2024

const { validateRecruitment, validatePromotion, validateProcessing, validateDieModification } = require('../data/ValidationRules');
const { rollDice, findDiceByIds, removeDiceByIds, addDiceToPool, promoteDie, recruitDice, modifyDieValue, autoRecruitToFloor } = require('../utils/DiceHelpers');
const { logDiceRoll, logRecruitment, logPromotion, logProcessing, logAction } = require('../utils/GameLogger');
const { SCORING } = require('../data/GameConstants');

class DiceSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Roll all dice for a player
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, message: string}
   */
  rollPlayerDice(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Roll all dice in player's pool
    player.dicePool = rollDice(player.dicePool);

    // Log the roll
    this.gameState.gameLog = logDiceRoll(
      this.gameState.gameLog,
      player.name,
      player.dicePool,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `${player.name} rolled all dice` 
    };
  }

  /**
 * Recruit new dice using existing dice - FIXED: Properly exhaust recruiting dice
 * @param {string} playerId - Player ID
 * @param {Array} diceIds - IDs of dice to use for recruitment
 * @returns {Object} - {success: boolean, message: string}
 */
  recruitDice(playerId, diceIds) {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.error('Player not found:', playerId);
      return { success: false, message: 'Player not found' };
    }
    const recruitingDice = findDiceByIds(player.dicePool, diceIds);
    if (recruitingDice.length !== diceIds.length) {
      console.error('Some dice not found in pool');
      return { success: false, message: 'Some dice not found in pool' };
    }

    // Outsourcing mod: allow recruitment regardless of value, always recruit same size, but only once per turn
    const hasOutsourcing = player.modifications?.includes('outsourcing');
    let newDice = [];
    if (hasOutsourcing && !player._outsourcingUsedThisTurn) {
      // Only allow one die to use outsourcing per turn
      if (recruitingDice.length > 1) {
        return { success: false, message: 'With Outsourcing, you may only recruit with one die at a time.' };
      }
      const die = recruitingDice[0];
      if (die.value === null) {
        return { success: false, message: 'Die must have a value to recruit' };
      }
      const DiceHelpers = require('../utils/DiceHelpers');
      newDice.push(DiceHelpers.createDie(die.sides));
      player._outsourcingUsedThisTurn = true;
    } else {
      // Validate recruitment
      const hasDiversification = player.modifications?.includes('diversification');
      const validation = validateRecruitment(recruitingDice, hasDiversification);
      if (!validation.isValid) {
        return { success: false, message: validation.reason };
      }
      // Use the recruited dice from validation result
      const DiceHelpers = require('../utils/DiceHelpers');
      for (const recruitedDieData of validation.recruited) {
        newDice.push(DiceHelpers.createDie(recruitedDieData.sides));
      }
    }

    // Add recruited dice to pool (recruiting dice stay in pool but get exhausted)
    player.dicePool = addDiceToPool(player.dicePool, newDice);
    if (!player.exhaustedDice) {
      player.exhaustedDice = [];
    }
    player.exhaustedDice.push(...diceIds);
    // Log recruitment
    this.gameState.gameLog = logRecruitment(
      this.gameState.gameLog,
      player.name,
      recruitingDice,
      newDice,
      this.gameState.round
    );
    return { 
      success: true, 
      message: `Recruited ${newDice.length} dice` 
    };
  }

  /**
   * Promote dice to next size
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to promote
   * @returns {Object} - {success: boolean, message: string}
   */
  promoteDice(playerId, diceIds) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    const dicesToPromote = findDiceByIds(player.dicePool, diceIds);
    
    if (dicesToPromote.length !== diceIds.length) {
      return { success: false, message: 'Some dice not found in pool' };
    }

    // Validate promotion
    const validation = validatePromotion(dicesToPromote);
    if (!validation.isValid) {
      return { success: false, message: validation.reason };
    }

    // Remove old dice and add promoted dice
    player.dicePool = removeDiceByIds(player.dicePool, diceIds);
    
    const promotedDice = [];
    for (const die of dicesToPromote) {
      const promoted = promoteDie(die);
      if (promoted) {
        player.dicePool.push(promoted);
        promotedDice.push({
          oldSides: die.sides,
          newSides: promoted.sides
        });
      }
    }

    // Exhausted dice (used for promotion)
    if (!player.exhaustedDice) {
      player.exhaustedDice = [];
    }
    player.exhaustedDice.push(...diceIds);

    // Log promotion
    this.gameState.gameLog = logPromotion(
      this.gameState.gameLog,
      player.name,
      promotedDice,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Promoted ${promotedDice.length} dice` 
    };
  }

  /**
   * Process dice for pips (removes dice from pool)
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to process
   * @param {string} arbitrageChoice - 'pips' or 'points'
   * @returns {Object} - {success: boolean, message: string, pipsGained: number}
   */
  processDice(playerId, diceIds, arbitrageChoice) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // ADD THIS VALIDATION:
    if (!diceIds || !Array.isArray(diceIds) || diceIds.length === 0) {
      
      return { success: false, message: 'No dice specified to process' };
    }

    const diceToProcess = findDiceByIds(player.dicePool, diceIds);
    if (diceToProcess.length !== diceIds.length) {
      return { success: false, message: 'Some dice not found in pool' };
    }

    // Validate processing
    const validation = validateProcessing(diceToProcess);
    if (!validation.isValid) {
      return { success: false, message: validation.reason };
    }

    // Arbitrage: process for points instead of pips
    if (player.modifications?.includes('arbitrage') && arbitrageChoice === 'points') {
      if (player._arbitrageUsedThisTurn) {
        return { success: false, message: 'You can only use Arbitrage once per turn.' };
      }
      let pointsGained = 0;
      for (const die of diceToProcess) {
        pointsGained += die.value * 2;
      }
      player.dicePool = removeDiceByIds(player.dicePool, diceIds);
      player.score += pointsGained;
      player._arbitrageUsedThisTurn = true;
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        `Arbitrage: processed ${diceToProcess.length} dice for ${pointsGained} points`,
        this.gameState.round
      );
      return {
        success: true,
        message: `Processed ${diceToProcess.length} dice for ${pointsGained} points`,
        pointsGained
      };
    }

    // Cash Flow Enhancement: first processed die gives 3x pips
    let bonusPips = 0;
    if (player.modifications?.includes('cash_flow_enhancement') && !player._cashFlowUsedThisTurn) {
      // Only apply to the first die processed this turn
      // Base gives value * 2, bonus gives value * 1 (total 3x)
      bonusPips = diceToProcess.length > 0 ? diceToProcess[0].value : 0;
      player._cashFlowUsedThisTurn = true;
    }

    // Remove dice from pool and gain pips
    player.dicePool = removeDiceByIds(player.dicePool, diceIds);
    player.freePips += validation.pipsGained + bonusPips;

    // Log processing
    this.gameState.gameLog = logProcessing(
      this.gameState.gameLog,
      player.name,
      diceToProcess,
      validation.pipsGained + bonusPips,
      this.gameState.round
    );
    if (bonusPips > 0) {
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        `Cash Flow Enhancement: first processed die gave ${diceToProcess[0].value * 3} pips!`,
        this.gameState.round
      );
    }

    return { 
      success: true, 
      message: `Processed ${diceToProcess.length} dice for ${validation.pipsGained + bonusPips} pips`,
      pipsGained: validation.pipsGained + bonusPips
    };
  }

  /**
   * Get actual pip cost for die modification based on player's modifications
   * @param {Object} player - Player object
   * @param {string} actionType - 'increase', 'decrease', 'reroll'
   * @returns {number} - Actual cost after modifications
   */
  getModifiedPipCost(player, actionType) {
  const { PIP_COSTS } = require('../data/GameConstants');
  let baseCost;
  
  switch (actionType) {
    case 'increase':
      baseCost = PIP_COSTS.INCREASE_DIE; // 4 pips normally
      // Apply Due Diligence modification
      if (player.modifications?.includes('due_diligence')) {
        return 3; // Reduced from 4 to 3
      }
      return baseCost;
      
    case 'decrease':
      return PIP_COSTS.DECREASE_DIE; // 3 pips - no modifications affect this
      
    case 'reroll':
      baseCost = PIP_COSTS.REROLL_DIE; // 2 pips normally
      // Apply Improved Rollers modification
      if (player.modifications?.includes('improved_rollers')) {
        return 1; // Reduced from 2 to 1
      }
      return baseCost;
      
    default:
      return 0;
  }
  }

  /**
   * Modify a die's value (increase/decrease) - UPDATED with cost modifications
   * @param {string} playerId - Player ID
   * @param {string} dieId - ID of die to modify
   * @param {number} change - Change amount (+1 or -1)
   * @param {number} originalCost - Original pip cost (will be recalculated)
   * @returns {Object} - {success: boolean, message: string}
   */
  modifyDieValue(playerId, dieId, change, originalCost) {
  const player = this.gameState.players.find(p => p.id === playerId);
  
  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  // Calculate actual cost based on modifications
  const actionType = change > 0 ? 'increase' : 'decrease';
  const actualCost = this.getModifiedPipCost(player, actionType);

  const die = player.dicePool.find(d => d.id === dieId);
  if (!die) {
    return { success: false, message: 'Die not found' };
  }

  // Validate modification (includes Corporate Debt check)
  const validation = require('../data/ValidationRules').validateDieModification(die, change, actualCost, player);
  if (!validation.isValid) {
    return { success: false, message: validation.reason };
  }

  // Apply modification
  const oldValue = die.value;
  Object.assign(die, require('../utils/DiceHelpers').modifyDieValue(die, change));
  player.freePips -= actualCost;

  // Log modification with actual cost
  const action = change > 0 ? 'increased' : 'decreased';
  const modificationNote = actualCost !== originalCost ? ` (${originalCost}→${actualCost} pips due to modifications)` : '';
  
  this.gameState.gameLog = require('../utils/GameLogger').logAction(
    this.gameState.gameLog,
    player.name,
    `${action} d${die.sides} from ${oldValue} to ${die.value} (${actualCost} pips${modificationNote})`,
    this.gameState.round
  );

  return { 
    success: true, 
    message: `Modified die value by ${change}`,
    actualCost: actualCost
  };
  }

  /**
   * Reroll a single die - UPDATED with cost modifications
   * @param {string} playerId - Player ID
   * @param {string} dieId - ID of die to reroll
   * @param {number} originalCost - Original pip cost (will be recalculated)
   * @param {number} predeterminedValue - Optional: specific value to set (for undo/redo)
   * @returns {Object} - {success: boolean, message: string, newValue?: number}
   */
  rerollDie(playerId, dieId, originalCost, predeterminedValue = null) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Quality Control: first reroll each turn is free
    let actualCost = this.getModifiedPipCost(player, 'reroll');
    let usedQualityControl = false;
    if (player.modifications?.includes('quality_control') && !player._qualityControlUsedThisTurn) {
      actualCost = 0;
      player._qualityControlUsedThisTurn = true;
      usedQualityControl = true;
    }

    const die = player.dicePool.find(d => d.id === dieId);
    if (!die) {
      return { success: false, message: 'Die not found' };
    }

    // Validate reroll (includes Corporate Debt check)
    const validation = require('../data/ValidationRules').validateDieReroll(die, actualCost, player);
    if (!validation.isValid) {
      return { success: false, message: validation.reason };
    }

    // Reroll the die (use predetermined value if provided, otherwise random)
    const oldValue = die.value;
    if (predeterminedValue !== null) {
      // For undo/redo - use the stored result
      die.value = predeterminedValue;
    } else {
      // Normal random reroll (prevent 2s if player has 2rUS)
      const has2rUS = player.modifications?.includes('tworus');
      if (has2rUS) {
        let value;
        do {
          value = Math.floor(Math.random() * die.sides) + 1;
        } while (value === 2); // Keep rolling until we get a non-2
        die.value = value;
      } else {
        die.value = Math.floor(Math.random() * die.sides) + 1;
      }
    }
    
    player.freePips -= actualCost;

    // Log reroll with actual cost
    const modificationNote = actualCost !== originalCost ? ` (${originalCost}→${actualCost} pips due to modifications)` : '';
    
    this.gameState.gameLog = require('../utils/GameLogger').logAction(
      this.gameState.gameLog,
      player.name,
      `rerolled d${die.sides} from ${oldValue} to ${die.value} (${actualCost} pips${usedQualityControl ? ' - Quality Control' : ''}${modificationNote})`,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Rerolled die to ${die.value}`,
      newValue: die.value,
      actualCost: actualCost
    };
  }

  /**
   * Ensure player meets minimum dice floor requirement
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, message: string}
   */
  enforceMinimumDiceFloor(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Determine minimum die size based on modifications
    const minimumDieSize = player.modifications?.includes('dice_pool_upgrade') ? 6 : 4;

    const originalCount = player.dicePool.length;
    player.dicePool = autoRecruitToFloor(player.dicePool, player.diceFloor, minimumDieSize);
    const newCount = player.dicePool.length;

    if (newCount > originalCount) {
      const recruited = newCount - originalCount;
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        `auto-recruited ${recruited} dice to meet minimum floor`,
        this.gameState.round
      );
    }

    return { 
      success: true, 
      message: `Enforced minimum dice floor` 
    };
  }

  /**
   * Convert unused dice to pips at end of turn
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, message: string, pipsGained: number}
   */
  convertUnusedDiceToPips(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Convert unused dice (those not exhausted) to pips
    const unusedDice = player.dicePool.filter(die => 
      die.value !== null && !player.exhaustedDice?.includes(die.id)
    );

    let pipsGained = 0;
    for (const die of unusedDice) {
      pipsGained += die.value;
    }

    if (pipsGained > 0) {
      player.freePips += pipsGained;
      
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        player.name,
        `converted ${unusedDice.length} unused dice to ${pipsGained} pips`,
        this.gameState.round
      );
    }

    return { 
      success: true, 
      message: `Converted unused dice to ${pipsGained} pips`,
      pipsGained
    };
  }
}

module.exports = DiceSystem;