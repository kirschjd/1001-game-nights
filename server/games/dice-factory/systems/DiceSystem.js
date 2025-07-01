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
  console.log('=== DICE SYSTEM: recruitDice FIXED ===');
  console.log('Player ID:', playerId);
  console.log('Dice IDs:', diceIds);
  
  const player = this.gameState.players.find(p => p.id === playerId);
  
  if (!player) {
    console.error('Player not found:', playerId);
    return { success: false, message: 'Player not found' };
  }

  const recruitingDice = findDiceByIds(player.dicePool, diceIds);
  console.log('Recruiting dice found:', recruitingDice.map(d => ({ id: d.id, sides: d.sides, value: d.value })));
  
  if (recruitingDice.length !== diceIds.length) {
    console.error('Some dice not found in pool');
    return { success: false, message: 'Some dice not found in pool' };
  }

  // Validate recruitment
  const validation = validateRecruitment(recruitingDice);
  console.log('Recruitment validation:', validation);
  
  if (!validation.isValid) {
    return { success: false, message: validation.reason };
  }

  // Generate recruited dice
  const newDice = [];
  for (const die of recruitingDice) {
    const recruited = recruitDice(die);
    newDice.push(...recruited);
  }
  console.log('New dice recruited:', newDice.length);

  // Add recruited dice to pool (recruiting dice stay in pool but get exhausted)
  player.dicePool = addDiceToPool(player.dicePool, newDice);

  // FIXED: Exhaust the recruiting dice
  if (!player.exhaustedDice) {
    player.exhaustedDice = [];
  }
  player.exhaustedDice.push(...diceIds);
  console.log('Exhausted dice:', player.exhaustedDice);

  // Log recruitment
  this.gameState.gameLog = logRecruitment(
    this.gameState.gameLog,
    player.name,
    recruitingDice,
    newDice,
    this.gameState.round
  );

  // Check for first recruitment bonus
  if (!this.gameState.firstRecruits.has(playerId)) {
    this.gameState.firstRecruits.add(playerId);
    player.freePips += 3;
    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      'earned 3 bonus pips for first recruitment',
      this.gameState.round
    );
  }

  console.log('Recruitment successful, total dice pool:', player.dicePool.length);
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
   * @returns {Object} - {success: boolean, message: string, pipsGained: number}
   */
  processDice(playerId, diceIds) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // ADD THIS VALIDATION:
    if (!diceIds || !Array.isArray(diceIds) || diceIds.length === 0) {
      console.log(`⚠️ processDice called with invalid diceIds:`, { playerId, diceIds });
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

    // Remove dice from pool and gain pips
    player.dicePool = removeDiceByIds(player.dicePool, diceIds);
    player.freePips += validation.pipsGained;

    // Log processing
    this.gameState.gameLog = logProcessing(
      this.gameState.gameLog,
      player.name,
      diceToProcess,
      validation.pipsGained,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Processed ${diceToProcess.length} dice for ${validation.pipsGained} pips`,
      pipsGained: validation.pipsGained
    };
  }

  /**
   * Modify a die's value (increase/decrease)
   * @param {string} playerId - Player ID
   * @param {string} dieId - ID of die to modify
   * @param {number} change - Change amount (+1 or -1)
   * @param {number} cost - Pip cost for modification
   * @returns {Object} - {success: boolean, message: string}
   */
  modifyDieValue(playerId, dieId, change, cost) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (player.freePips < cost) {
      return { success: false, message: 'Not enough pips' };
    }

    const die = player.dicePool.find(d => d.id === dieId);
    if (!die) {
      return { success: false, message: 'Die not found' };
    }

    // Validate modification
    const validation = validateDieModification(die, change);
    if (!validation.isValid) {
      return { success: false, message: validation.reason };
    }

    // Apply modification
    const oldValue = die.value;
    Object.assign(die, modifyDieValue(die, change));
    player.freePips -= cost;

    // Log modification
    const action = change > 0 ? 'increased' : 'decreased';
    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      `${action} d${die.sides} from ${oldValue} to ${die.value} (${cost} pips)`,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Modified die value by ${change}` 
    };
  }

  /**
   * Reroll a single die (with optional predetermined result for undo/redo)
   * @param {string} playerId - Player ID
   * @param {string} dieId - ID of die to reroll
   * @param {number} cost - Pip cost for reroll
   * @param {number} predeterminedValue - Optional: specific value to set (for undo/redo)
   * @returns {Object} - {success: boolean, message: string, newValue?: number}
   */
  rerollDie(playerId, dieId, cost, predeterminedValue = null) {
    const player = this.gameState.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (player.freePips < cost) {
      return { success: false, message: 'Not enough pips' };
    }

    const die = player.dicePool.find(d => d.id === dieId);
    if (!die) {
      return { success: false, message: 'Die not found' };
    }

    // Reroll the die (use predetermined value if provided, otherwise random)
    const oldValue = die.value;
    if (predeterminedValue !== null) {
      // For undo/redo - use the stored result
      die.value = predeterminedValue;
    } else {
      // Normal random reroll
      die.value = Math.floor(Math.random() * die.sides) + 1;
    }

    player.freePips -= cost;

    // Log reroll
    this.gameState.gameLog = require('../utils/GameLogger').logAction(
      this.gameState.gameLog,
      player.name,
      `rerolled d${die.sides} from ${oldValue} to ${die.value} (${cost} pips)`,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Rerolled die to ${die.value}`,
      newValue: die.value
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

    const originalCount = player.dicePool.length;
    player.dicePool = autoRecruitToFloor(player.dicePool, player.diceFloor);
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