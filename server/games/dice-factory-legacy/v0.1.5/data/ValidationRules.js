// 1001 Game Nights - Game Validation Rules
// Version: 2.0.1 - Fixed recruitment validation for single die
// Updated: December 2024

const { RECRUITMENT_TABLE, getRecruitedDieSize, DICE_PROGRESSION, MAX_DICE_SIDES, SCORING } = require('./GameConstants');

/**
 * FIXED: Validate if dice can recruit (single die per recruiting die)
 * @param {Array} dice - Array of dice objects
 * @param {boolean} diversification - If true, allow d4s to recruit on a 2 as well as a 1
 * @returns {Object} - {isValid: boolean, reason: string, recruited?: Array}
 */
function validateRecruitment(dice, diversification = false) {
  if (dice.length === 0) {
    return { isValid: false, reason: 'Need at least one die to recruit' };
  }
  
  const recruited = [];
  
  for (const die of dice) {
    if (die.value === null) {
      return { isValid: false, reason: 'All dice must have values to recruit' };
    }
    
    let recruitmentValues = RECRUITMENT_TABLE[die.sides];
    if (diversification && die.sides === 4) {
      recruitmentValues = [...recruitmentValues, 2];
    }
    if (!recruitmentValues || !recruitmentValues.includes(die.value)) {
      return { 
        isValid: false, 
        reason: `d${die.sides} with value ${die.value} cannot recruit` 
      };
    }
    
    // FIXED: Add only the single recruited die based on roll value
    const recruitedSize = getRecruitedDieSize(die.sides, die.value);
    recruited.push({ sides: recruitedSize });
    
    
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
 * @param {boolean} verticalIntegration - If true, allow one gap in the sequence (one skipped number)
 * @returns {Object} - {isValid: boolean, reason: string, points?: number}
 */
function validateStraight(dice, verticalIntegration = false) {
  // LOGGING: Start validation
  console.log('[validateStraight] Dice:', dice.map(d => `d${d.sides}:${d.value}`), 'verticalIntegration:', verticalIntegration);
  if (dice.length < SCORING.MIN_STRAIGHT_LENGTH) {
    console.log('[validateStraight] Failed: Not enough dice');
    return { 
      isValid: false, 
      reason: `Need at least ${SCORING.MIN_STRAIGHT_LENGTH} dice for a straight` 
    };
  }
  for (const die of dice) {
    if (die.value === null) {
      console.log('[validateStraight] Failed: Die missing value', die);
      return { isValid: false, reason: 'All dice must have values to score' };
    }
  }
  // Ensure all dice have unique values
  const values = dice.map(d => d.value);
  const uniqueValues = new Set(values);
  if (uniqueValues.size !== values.length) {
    console.log('[validateStraight] Failed: Duplicate values', values);
    return { isValid: false, reason: 'All dice in a straight must have unique values' };
  }
  // Sort dice by value
  const sortedValues = values.sort((a, b) => a - b);
  // Count gaps between consecutive values
  let gaps = 0;
  for (let i = 1; i < sortedValues.length; i++) {
    const diff = sortedValues[i] - sortedValues[i-1];
    if (diff !== 1) {
      gaps += diff - 1;
    }
  }
  console.log('[validateStraight] Sorted values:', sortedValues, 'Gaps:', gaps);
  if (!verticalIntegration && gaps > 0) {
    console.log('[validateStraight] Failed: Gaps not allowed');
    return { isValid: false, reason: 'Dice values must be consecutive for a straight' };
  }
  if (verticalIntegration && gaps > 1) {
    console.log('[validateStraight] Failed: Too many gaps');
    return { isValid: false, reason: 'With Vertical Integration, only one missing number is allowed in a straight' };
  }
  // Calculate points: highest value * number of dice
  const points = Math.max(...sortedValues) * dice.length;
  console.log('[validateStraight] Success: Points:', points);
  return { isValid: true, reason: '', points };
}

/**
 * Validate if dice can form a set
 * @param {Array} dice - Array of dice objects
 * @param {boolean} jointVenture - If true, allow sets with up to two values (all dice must be one of those two values)
 * @returns {Object} - {isValid: boolean, reason: string, points?: number}
 */
function validateSet(dice, jointVenture = false) {
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
  
  // Check if all dice have the same value, or (if jointVenture) up to two values
  const valueCounts = {};
  for (const die of dice) {
    valueCounts[die.value] = (valueCounts[die.value] || 0) + 1;
  }
  const uniqueValues = Object.keys(valueCounts).map(Number);
  if (!jointVenture) {
    if (uniqueValues.length !== 1) {
      return { isValid: false, reason: 'All dice must have the same value for a set' };
    }
    const value = uniqueValues[0];
    const points = value * (dice.length + 1);
    return { isValid: true, reason: '', points };
  } else {
    if (uniqueValues.length > 2) {
      return { isValid: false, reason: 'With Joint Venture, sets can have at most two values' };
    }
    // Points: use the most common value
    let maxCount = 0;
    let mainValue = uniqueValues[0];
    for (const v of uniqueValues) {
      if (valueCounts[v] > maxCount) {
        maxCount = valueCounts[v];
        mainValue = v;
      }
    }
    const points = mainValue * (dice.length + 1);
    return { isValid: true, reason: '', points };
  }
}

/**
 * Validate die modification (increase/decrease value)
 * @param {Object} die - Die to modify
 * @param {number} change - Change amount (+1 or -1)
 * @param {number} pipCost - Cost in pips
 * @param {Object} player - Player object (for Corporate Debt check)
 * @returns {Object} - {isValid: boolean, reason: string}
 */
function validateDieModification(die, change, pipCost, player) {
  const hasCorporateDebt = player.modifications?.includes('corporate_debt');
  const minimumPips = hasCorporateDebt ? -20 : 0;
  
  if (player.freePips - pipCost < minimumPips) {
    return { isValid: false, reason: `Not enough pips (need ${pipCost}, have ${player.freePips})` };
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
 * @param {Object} player - Player object (for Corporate Debt check)
 * @returns {Object} - {isValid: boolean, reason: string}
 */
function validateDieReroll(die, pipCost, player) {
  const hasCorporateDebt = player.modifications?.includes('corporate_debt');
  const minimumPips = hasCorporateDebt ? -20 : 0;
  
  if (player.freePips - pipCost < minimumPips) {
    return { isValid: false, reason: `Not enough pips (need ${pipCost}, have ${player.freePips})` };
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