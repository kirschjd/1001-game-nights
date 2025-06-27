// 1001 Game Nights - Dice Helper Functions
// Version: 2.0.1 - Fixed recruitment to single die based on roll value
// Updated: December 2024

const { RECRUITMENT_TABLE, getRecruitedDieSize, DICE_PROGRESSION, GAME_DEFAULTS } = require('../data/GameConstants');

/**
 * Generate unique ID for dice
 * @returns {string} - Unique ID
 */
function generateDieId() {
  return `die-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new die object
 * @param {number} sides - Number of sides
 * @param {number|null} value - Initial value (null for unrolled)
 * @returns {Object} - Die object
 */
function createDie(sides, value = null) {
  return {
    id: generateDieId(),
    sides,
    value,
    shiny: false,
    rainbow: false
  };
}

/**
 * Roll dice (assign random values)
 * @param {Array} dicePool - Array of dice objects
 * @returns {Array} - Array of dice with new values
 */
function rollDice(dicePool) {
  return dicePool.map(die => ({
    ...die,
    value: Math.floor(Math.random() * die.sides) + 1
  }));
}

/**
 * Create initial dice pool for new players
 * @returns {Array} - Array of d4 dice
 */
function createInitialDicePool() {
  const dicePool = [];
  for (let i = 0; i < GAME_DEFAULTS.INITIAL_DICE_COUNT; i++) {
    dicePool.push(createDie(GAME_DEFAULTS.INITIAL_DIE_SIDES));
  }
  return dicePool;
}

/**
 * Find dice by IDs
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
 * FIXED: Recruit a single die based on recruiting die and roll value
 * @param {Object} recruitingDie - Die used for recruitment
 * @returns {Array} - Array containing single newly recruited die
 */
function recruitDice(recruitingDie) {
  console.log('🎯 RECRUITING SINGLE DIE:', {
    recruitingDie: recruitingDie.sides,
    rollValue: recruitingDie.value
  });
  
  // Get the size of die to recruit based on roll value
  const recruitedSize = getRecruitedDieSize(recruitingDie.sides, recruitingDie.value);
  
  console.log(`📦 Recruiting single d${recruitedSize} (was d${recruitingDie.sides} rolled ${recruitingDie.value})`);
  
  // Create and return single recruited die
  const recruitedDie = createDie(recruitedSize);
  return [recruitedDie];
}

/**
 * Promote a die to the next larger size
 * @param {Object} die - Die to promote
 * @returns {Object} - Promoted die
 */
function promoteDie(die) {
  const currentIndex = DICE_PROGRESSION.indexOf(die.sides);
  if (currentIndex === -1 || currentIndex >= DICE_PROGRESSION.length - 1) {
    // Already at maximum or invalid size
    return { ...die };
  }
  
  const newSides = DICE_PROGRESSION[currentIndex + 1];
  return createDie(newSides);
}

/**
 * Modify die value
 * @param {Object} die - Die to modify
 * @param {number} change - Amount to change (+1 or -1)
 * @returns {Object} - Modified die
 */
function modifyDieValue(die, change) {
  const newValue = Math.max(1, Math.min(die.sides, die.value + change));
  return {
    ...die,
    value: newValue
  };
}

/**
 * Auto-recruit dice to meet minimum dice floor
 * @param {Array} dicePool - Current dice pool
 * @param {number} minimumFloor - Minimum number of dice required
 * @returns {Array} - Dice pool with auto-recruited dice
 */
function autoRecruitToFloor(dicePool, minimumFloor) {
  if (dicePool.length >= minimumFloor) {
    return dicePool;
  }
  
  const neededDice = minimumFloor - dicePool.length;
  const newDice = [];
  
  for (let i = 0; i < neededDice; i++) {
    newDice.push(createDie(GAME_DEFAULTS.INITIAL_DIE_SIDES));
  }
  
  return addDiceToPool(dicePool, newDice);
}

/**
 * Check if a die can recruit
 * @param {Object} die - Die to check
 * @returns {boolean} - True if die can recruit
 */
function canRecruit(die) {
  if (!die.value) return false;
  
  const recruitmentValues = RECRUITMENT_TABLE[die.sides];
  return recruitmentValues && recruitmentValues.includes(die.value);
}

/**
 * Check if a die can be promoted
 * @param {Object} die - Die to check
 * @returns {boolean} - True if die can be promoted
 */
function canPromote(die) {
  if (!die.value) return false;
  
  // Must show maximum value and not be at maximum size
  return die.value === die.sides && die.sides < DICE_PROGRESSION[DICE_PROGRESSION.length - 1];
}

module.exports = {
  generateDieId,
  createDie,
  rollDice,
  createInitialDicePool,
  findDiceByIds,
  removeDiceByIds,
  addDiceToPool,
  recruitDice,
  promoteDie,
  modifyDieValue,
  autoRecruitToFloor,
  canRecruit,
  canPromote
};