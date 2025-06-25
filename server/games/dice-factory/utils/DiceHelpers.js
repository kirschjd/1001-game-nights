// 1001 Game Nights - Dice Factory Helper Functions
// Version: 2.0.2 - Fixed recruitment exhaustion issue
// Updated: December 2024

const { DICE_PROGRESSION, GAME_DEFAULTS } = require('../data/GameConstants');

/**
 * Generate unique die ID
 * @returns {string} - Unique die identifier
 */
function generateDieId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new die object
 * @param {number} sides - Number of sides on the die
 * @param {number|null} value - Initial value (null for unrolled)
 * @param {Object} options - Additional options (shiny, rainbow, etc.)
 * @returns {Object} - Die object
 */
function createDie(sides, value = null, options = {}) {
  return {
    id: generateDieId(),
    sides: sides,
    value: value,
    shiny: options.shiny || false,
    rainbow: options.rainbow || false,
    ...options
  };
}

/**
 * Roll a single die
 * @param {Object} die - Die object to roll
 * @returns {Object} - Die object with new value
 */
function rollDie(die) {
  return {
    ...die,
    value: Math.floor(Math.random() * die.sides) + 1
  };
}

/**
 * Roll multiple dice
 * @param {Array} dice - Array of dice objects
 * @returns {Array} - Array of dice with new values
 */
function rollDice(dice) {
  return dice.map(die => rollDie(die));
}

/**
 * Promote a die to the next size
 * @param {Object} die - Die object to promote
 * @returns {Object|null} - Promoted die or null if cannot promote
 */
function promoteDie(die) {
  const currentIndex = DICE_PROGRESSION.indexOf(die.sides);
  
  if (currentIndex === -1 || currentIndex === DICE_PROGRESSION.length - 1) {
    return null; // Cannot promote
  }
  
  const newSides = DICE_PROGRESSION[currentIndex + 1];
  
  return createDie(newSides, null, {
    shiny: die.shiny,
    rainbow: die.rainbow
  });
}

/**
 * Create initial dice pool for a player
 * @param {number} count - Number of dice to create
 * @param {number} sides - Sides for each die
 * @returns {Array} - Array of die objects
 */
function createInitialDicePool(count = GAME_DEFAULTS.INITIAL_DICE_COUNT, sides = GAME_DEFAULTS.INITIAL_DIE_SIDES) {
  const dicePool = [];
  
  for (let i = 0; i < count; i++) {
    dicePool.push(createDie(sides));
  }
  
  return dicePool;
}

/**
 * Find dice by IDs - FIXED: Complete implementation
 * @param {Array} dicePool - Array of dice objects
 * @param {Array} diceIds - Array of die IDs to find
 * @returns {Array} - Array of found dice objects
 */
function findDiceByIds(dicePool, diceIds) {
  if (!Array.isArray(dicePool) || !Array.isArray(diceIds)) {
    console.error('findDiceByIds: Invalid input - both parameters must be arrays');
    return [];
  }
  
  return dicePool.filter(die => diceIds.includes(die.id));
}

/**
 * Remove dice by IDs
 * @param {Array} dicePool - Array of dice objects
 * @param {Array} diceIds - Array of die IDs to remove
 * @returns {Array} - Array of remaining dice objects
 */
function removeDiceByIds(dicePool, diceIds) {
  if (!Array.isArray(dicePool) || !Array.isArray(diceIds)) {
    console.error('removeDiceByIds: Invalid input - both parameters must be arrays');
    return dicePool;
  }
  
  return dicePool.filter(die => !diceIds.includes(die.id));
}

/**
 * Add dice to pool
 * @param {Array} dicePool - Existing dice pool
 * @param {Array} newDice - New dice to add
 * @returns {Array} - Combined dice pool
 */
function addDiceToPool(dicePool, newDice) {
  if (!Array.isArray(dicePool) || !Array.isArray(newDice)) {
    console.error('addDiceToPool: Invalid input - both parameters must be arrays');
    return dicePool;
  }
  
  return [...dicePool, ...newDice];
}

/**
 * Recruit dice based on recruiting die
 * @param {Object} recruitingDie - Die used for recruitment
 * @returns {Array} - Array of newly recruited dice
 */
function recruitDice(recruitingDie) {
  const recruited = [];
  
  switch (recruitingDie.sides) {
    case 4:
      recruited.push(createDie(4));
      break;
    case 6:
      recruited.push(createDie(6), createDie(4));
      break;
    case 8:
      recruited.push(createDie(8), createDie(6), createDie(4));
      break;
    case 10:
      recruited.push(createDie(10), createDie(8), createDie(6), createDie(4));
      break;
    case 12:
      recruited.push(createDie(12), createDie(10), createDie(8), createDie(6), createDie(4));
      break;
    default:
      console.error(`recruitDice: Invalid die size ${recruitingDie.sides}`);
      break;
  }
  
  return recruited;
}

/**
 * Modify die value
 * @param {Object} die - Die object to modify
 * @param {number} change - Change amount (+1, -1)
 * @returns {Object} - Modified die object
 */
function modifyDieValue(die, change) {
  const newValue = Math.max(1, Math.min(die.sides, die.value + change));
  
  return {
    ...die,
    value: newValue
  };
}

/**
 * Check if dice pool needs automatic recruitment (below floor)
 * @param {Array} dicePool - Current dice pool
 * @param {number} diceFloor - Minimum required dice
 * @returns {Object} - {needsRecruitment: boolean, diceNeeded: number}
 */
function checkDiceFloor(dicePool, diceFloor) {
  const currentCount = dicePool.length;
  
  if (currentCount < diceFloor) {
    return {
      needsRecruitment: true,
      diceNeeded: diceFloor - currentCount
    };
  }
  
  return {
    needsRecruitment: false,
    diceNeeded: 0
  };
}

/**
 * Auto-recruit dice to meet minimum floor requirement
 * @param {Array} dicePool - Current dice pool
 * @param {number} diceFloor - Minimum required dice
 * @returns {Array} - Updated dice pool with auto-recruited dice
 */
function autoRecruitToFloor(dicePool, diceFloor) {
  const check = checkDiceFloor(dicePool, diceFloor);
  
  if (!check.needsRecruitment) {
    return dicePool;
  }
  
  const newDice = [];
  for (let i = 0; i < check.diceNeeded; i++) {
    newDice.push(createDie(GAME_DEFAULTS.INITIAL_DIE_SIDES));
  }
  
  return addDiceToPool(dicePool, newDice);
}

/**
 * Get dice statistics for a pool
 * @param {Array} dicePool - Array of dice objects
 * @returns {Object} - Statistics about the dice pool
 */
function getDicePoolStats(dicePool) {
  const stats = {
    total: dicePool.length,
    bySize: {},
    withValues: 0,
    withoutValues: 0,
    averageValue: 0
  };
  
  let totalValue = 0;
  
  for (const die of dicePool) {
    // Count by size
    stats.bySize[die.sides] = (stats.bySize[die.sides] || 0) + 1;
    
    // Count values
    if (die.value !== null) {
      stats.withValues++;
      totalValue += die.value;
    } else {
      stats.withoutValues++;
    }
  }
  
  if (stats.withValues > 0) {
    stats.averageValue = totalValue / stats.withValues;
  }
  
  return stats;
}

module.exports = {
  generateDieId,
  createDie,
  rollDie,
  rollDice,
  promoteDie,
  createInitialDicePool,
  findDiceByIds,
  removeDiceByIds,
  addDiceToPool,
  recruitDice,
  modifyDieValue,
  checkDiceFloor,
  autoRecruitToFloor,
  getDicePoolStats
};