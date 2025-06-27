// 1001 Game Nights - Game Validation Rules
// Version: 2.0.1 - Fixed recruitment validation for single die
// Updated: December 2024

const { RECRUITMENT_TABLE, getRecruitedDieSize, DICE_PROGRESSION, MAX_DICE_SIDES, SCORING } = require('./GameConstants');

/**
 * FIXED: Validate if dice can recruit (single die per recruiting die)
 * @param {Array} dice - Array of dice objects
 * @returns {Object} - {isValid: boolean, reason: string, recruited?: Array}
 */
function validateRecruitment(dice) {
  if (dice.length === 0) {
    return { isValid: false, reason: 'Need at least one die to recruit' };
  }
  
  const recruited = [];
  
  for (const die of dice) {
    if (die.value === null) {
      return { isValid: false, reason: 'All dice must have values to recruit' };
    }
    
    const recruitmentValues = RECRUITMENT_TABLE[die.sides];
    if (!recruitmentValues || !recruitmentValues.includes(die.value)) {
      return { 
        isValid: false, 
        reason: `d${die.sides} with value ${die.value} cannot recruit` 
      };
    }
    
    // FIXED: Add only the single recruited die based on roll value
    const recruitedSize = getRecruitedDieSize(die.sides, die.value);
    recruited.push({ sides: recruitedSize });
    
    console.log(`✅ Validation: d${die.sides} rolled ${die.value} → recruits single d${recruitedSize}`);
  }
  
  return { isValid: true, reason: '', recruited };
}

/**
 * Validate if dice can be promoted
 * @param {Array} dice - Array of dice objects
 * @returns {Object} - {isValid: boolean, reason: string}
 */
function validatePromotion(dice) {
  if (dice.length === 0) {
    return { isValid: false, reason: 'Need at least one die to promote' };
  }
  
  for (const die of dice) {
    if (die.value === null) {
      return { isValid: false, reason: 'All dice must have values to promote' };
    }
    
    if (die.value !== die.sides) {
      return { isValid: false, reason: `Die must show maximum value (${die.sides}) to promote` };
    }
    
    if (die.sides >= MAX_DICE_SIDES) {
      return { isValid: false, reason: `Cannot promote d${die.sides} - already at maximum` };
    }
  }
  
  return { isValid: true, reason: '' };
}

/**
 * Validate if dice can be processed for pips
 * @param {Array} dice - Array of dice objects
 * @returns {Object} - {isValid: boolean, reason: string, pipsGained?: number}
 */
function validateProcessing(dice) {
  if (dice.length === 0) {
    return { isValid: false, reason: 'Need at least one die to process' };
  }
  
  let totalPips = 0;
  
  for (const die of dice) {
    if (die.value === null) {
      return { isValid: false, reason: 'All dice must have values to process' };
    }
    
    totalPips += die.value * 2; // Processing gives 2x the pip value
  }
  
  return { isValid: true, reason: '', pipsGained: totalPips };
}

/**
 * Validate if dice can form a straight
 * @param {Array} dice - Array of dice objects
 * @returns {Object} - {isValid: boolean, reason: string, points?: number}
 */
function validateStraight(dice) {
  if (dice.length < SCORING.MIN_STRAIGHT_LENGTH) {
    return { 
      isValid: false, 
      reason: `Need at least ${SCORING.MIN_STRAIGHT_LENGTH} dice for a straight` 
    };
  }
  
  for (const die of dice) {
    if (die.value === null) {
      return { isValid: false, reason: 'All dice must have values to score' };
    }
  }
  
  // Sort dice by value
  const sortedValues = dice.map(d => d.value).sort((a, b) => a - b);
  
  // Check if values form a consecutive sequence
  for (let i = 1; i < sortedValues.length; i++) {
    if (sortedValues[i] !== sortedValues[i-1] + 1) {
      return { isValid: false, reason: 'Dice values must be consecutive for a straight' };
    }
  }
  
  // Calculate points: highest value * number of dice
  const points = Math.max(...sortedValues) * dice.length;
  
  return { isValid: true, reason: '', points };
}

/**
 * Validate if dice can form a set
 * @param {Array} dice - Array of dice objects
 * @returns {Object} - {isValid: boolean, reason: string, points?: number}
 */
function validateSet(dice) {
  if (dice.length < SCORING.MIN_SET_SIZE) {
    return { 
      isValid: false, 
      reason: `Need at least ${SCORING.MIN_SET_SIZE} dice for a set` 
    };
  }
  
  for (const die of dice) {
    if (die.value === null) {
      return { isValid: false, reason: 'All dice must have values to score' };
    }
  }
  
  // Check if all dice have the same value
  const firstValue = dice[0].value;
  const allSameValue = dice.every(die => die.value === firstValue);
  
  if (!allSameValue) {
    return { isValid: false, reason: 'All dice must have the same value for a set' };
  }
  
  // Calculate points: value * (number of dice + 1)
  const points = firstValue * (dice.length + 1);
  
  return { isValid: true, reason: '', points };
}

/**
 * Validate die modification (increase/decrease value)
 * @param {Object} die - Die to modify
 * @param {number} change - Change amount (+1 or -1)
 * @param {number} pipCost - Cost in pips
 * @param {number} availablePips - Player's available pips
 * @returns {Object} - {isValid: boolean, reason: string}
 */
function validateDieModification(die, change, pipCost, availablePips) {
  if (availablePips < pipCost) {
    return { isValid: false, reason: `Not enough pips (need ${pipCost}, have ${availablePips})` };
  }
  
  if (die.value === null) {
    return { isValid: false, reason: 'Die must have a value to modify' };
  }
  
  const newValue = die.value + change;
  
  if (newValue < 1) {
    return { isValid: false, reason: 'Die value cannot go below 1' };
  }
  
  if (newValue > die.sides) {
    return { isValid: false, reason: `Die value cannot exceed ${die.sides}` };
  }
  
  return { isValid: true, reason: '' };
}

/**
 * Validate die reroll
 * @param {Object} die - Die to reroll
 * @param {number} pipCost - Cost in pips
 * @param {number} availablePips - Player's available pips
 * @returns {Object} - {isValid: boolean, reason: string}
 */
function validateDieReroll(die, pipCost, availablePips) {
  if (availablePips < pipCost) {
    return { isValid: false, reason: `Not enough pips (need ${pipCost}, have ${availablePips})` };
  }
  
  if (die.value === null) {
    return { isValid: false, reason: 'Die must have a value to reroll' };
  }
  
  return { isValid: true, reason: '' };
}

/**
 * Validate if player can take actions
 * @param {Object} player - Player object
 * @param {Object} gameState - Current game state
 * @returns {Object} - {canAct: boolean, reason: string}
 */
function validatePlayerAction(player, gameState) {
  if (!player) {
    return { canAct: false, reason: 'Player not found' };
  }
  
  if (player.hasFled) {
    return { canAct: false, reason: 'Player has fled the factory' };
  }
  
  if (player.isReady) {
    return { canAct: false, reason: 'Player has already ended their turn' };
  }
  
  if (gameState.phase !== 'playing') {
    return { canAct: false, reason: 'Game is not in playing phase' };
  }
  
  return { canAct: true, reason: '' };
}

/**
 * Validate minimum dice pool requirements
 * @param {Object} player - Player object
 * @returns {Object} - {needsRecruitment: boolean, diceNeeded: number}
 */
function validateMinimumDicePool(player) {
  const currentDiceCount = player.dicePool.length;
  const minimumRequired = player.diceFloor;
  
  if (currentDiceCount < minimumRequired) {
    return { 
      needsRecruitment: true, 
      diceNeeded: minimumRequired - currentDiceCount 
    };
  }
  
  return { needsRecruitment: false, diceNeeded: 0 };
}

module.exports = {
  validateRecruitment,
  validatePromotion, 
  validateProcessing,
  validateStraight,
  validateSet,
  validateDieModification,
  validateDieReroll,
  validatePlayerAction,
  validateMinimumDicePool
};