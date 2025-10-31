// 1001 Game Nights - Dice Factory Game Constants
// Version: 2.0.1 - Fixed recruitment to single die based on roll value
// Updated: December 2024

// Recruitment table - what values can recruit what dice
const RECRUITMENT_TABLE = {
  4: [1],           // d4 recruits on rolling 1
  6: [1, 2],        // d6 recruits on rolling 1 or 2
  8: [1, 2, 3],     // d8 recruits on rolling 1, 2, or 3
  10: [1, 2, 3, 4], // d10 recruits on rolling 1, 2, 3, or 4
  12: [1, 2, 3, 4, 5] // d12 recruits on rolling 1, 2, 3, 4, or 5
};

// FIXED: Single die recruitment based on roll value
// Roll value 1: recruit same size, Roll value 2: recruit one size smaller, etc.
const DICE_PROGRESSION = [4, 6, 8, 10, 12];

/**
 * Get the recruited die size based on recruiting die and roll value
 * @param {number} recruitingDieSides - Size of the recruiting die
 * @param {number} rollValue - The value rolled on the recruiting die
 * @returns {number} - Size of the die to recruit
 */
function getRecruitedDieSize(recruitingDieSides, rollValue) {
  const recruitingIndex = DICE_PROGRESSION.indexOf(recruitingDieSides);
  if (recruitingIndex === -1) return 4; // Fallback to d4
  
  // Roll value 1 = same size, roll value 2 = one size smaller, etc.
  const targetIndex = recruitingIndex - (rollValue - 1);
  
  // Clamp to valid range (can't go below d4)
  const clampedIndex = Math.max(0, targetIndex);
  
  return DICE_PROGRESSION[clampedIndex];
}

// Pip action costs
const PIP_COSTS = {
  INCREASE_DIE: 4,      // Increase die value by 1
  DECREASE_DIE: 3,      // Decrease die value by 1
  REROLL_DIE: 2,        // Reroll a die
  FACTORY_EFFECT: 7,    // Buy factory effect (one-time)
  FACTORY_MODIFICATION: 9 // Buy factory modification (permanent)
};

// Initial game state constants
const GAME_DEFAULTS = {
  INITIAL_DICE_COUNT: 4,
  INITIAL_DIE_SIDES: 4,
  INITIAL_FREE_PIPS: 9,
  INITIAL_SCORE: 0,
  INITIAL_DICE_FLOOR: 4,
  COLLAPSE_DICE: [4, 6, 8] // d4, d6, d8 for collapse check
};

// Scoring constants
const SCORING = {
  MIN_STRAIGHT_LENGTH: 3,   // Minimum dice for straight
  MIN_SET_SIZE: 3,          // Minimum dice for set
  PROCESS_MULTIPLIER: 2     // Free pips = 2x die value when processing
};

// Game phases
const PHASES = {
  ROLLING: 'rolling',
  PLAYING: 'playing', 
  REVEALING: 'revealing',
  COMPLETE: 'complete'
};

// Log entry types
const LOG_TYPES = {
  INFO: 'info',
  ACTION: 'action',
  SCORE: 'score',
  SYSTEM: 'system',
  ERROR: 'error'
};

// Maximum dice sides
const MAX_DICE_SIDES = 12;

module.exports = {
  RECRUITMENT_TABLE,
  DICE_PROGRESSION,
  getRecruitedDieSize,
  PIP_COSTS,
  GAME_DEFAULTS,
  SCORING,
  PHASES,
  LOG_TYPES,
  MAX_DICE_SIDES
};