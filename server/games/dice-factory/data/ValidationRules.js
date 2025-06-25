// 1001 Game Nights - Dice Factory Validation Rules
// Version: 2.0.0 - Extracted validation logic
// Updated: December 2024

const { RECRUITMENT_TABLE, SCORING, DICE_PROGRESSION, MAX_DICE_SIDES } = require('./GameConstants');

/**
 * Validate if dice can form a straight
 * @param {Array} dice - Array of dice objects
 * @returns {Object} - {isValid: boolean, reason: string, points?: number}
 */
function validateStraight(dice) {
  if (dice.length < SCORING.MIN_STRAIGHT_LENGTH) {
    return { isValid: false, reason: `Need at least ${SCORING.MIN_STRAIGHT_LENGTH} dice for straight` };
  }
  
  // Get values and sort them
  const values = dice.map(die => die.value).filter(val => val !== null).sort((a, b) => a - b);
  
  if (values.length !== dice.length) {
    return { isValid: false, reason: 'All dice must have values' };
  }
  
  // Check for consecutive values
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) {
      return { isValid: false, reason: 'Dice values must be consecutive' };
    }
  }
  
  // Calculate points: highest value * number of dice
  const points = Math.max(...values) * values.length;
  
  return { isValid: true, reason: '', points };
}

/**
 * Validate if dice can form a set
 * @param {Array} dice - Array of dice objects
 * @returns {Object} - {isValid: boolean, reason: string, points?: number}
 */
function validateSet(dice) {
  if (dice.length < SCORING.MIN_SET_SIZE) {
    return { isValid: false, reason: `Need at least ${SCORING.MIN_SET_SIZE} dice for set` };
  }
  
  const values = dice.map(die => die.value).filter(val => val !== null);
  
  if (values.length !== dice.length) {
    return { isValid: false, reason: 'All dice must have values' };
  }
  
  // Check if all values are the same
  const firstValue = values[0];
  if (!values.every(val => val === firstValue)) {
    return { isValid: false, reason: 'All dice must have the same value' };
  }
  
  // Calculate points: value * (number of dice + 1)
  const points = firstValue * (values.length + 1);
  
  return { isValid: true, reason: '', points };
}

/**
 * Validate if dice can be recruited
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
    
    // Add recruited dice based on die sides
    switch (die.sides) {
      case 4:
        recruited.push({ sides: 4 });
        break;
      case 6:
        recruited.push({ sides: 6 }, { sides: 4 });
        break;
      case 8:
        recruited.push({ sides: 8 }, { sides: 6 }, { sides: 4 });
        break;
      case 10:
        recruited.push({ sides: 10 }, { sides: 8 }, { sides: 6 }, { sides: 4 });
        break;
      case 12:
        recruited.push({ sides: 12 }, { sides: 10 }, { sides: 8 }, { sides: 6 }, { sides: 4 });
        break;
    }
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
    
    totalPips += die.value * SCORING.PROCESS_MULTIPLIER;
  }
  
  return { isValid: true, reason: '', pipsGained: totalPips };
}

/**
 * Validate if a die value can be modified
 * @param {Object} die - Die object
 * @param {number} change - Change amount (+1, -1)
 * @returns {Object} - {isValid: boolean, reason: string}
 */
function validateDieModification(die, change) {
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
  validateStraight,
  validateSet,
  validateRecruitment,
  validatePromotion,
  validateProcessing,
  validateDieModification,
  validatePlayerAction,
  validateMinimumDicePool
};