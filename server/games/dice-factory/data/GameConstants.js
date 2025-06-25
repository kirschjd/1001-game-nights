// 1001 Game Nights - Dice Factory Game Constants
// Version: 2.0.0 - Extracted from monolithic file
// Updated: December 2024

// Recruitment table - what values can recruit what dice
const RECRUITMENT_TABLE = {
  4: [1],           // d4 recruits on rolling 1
  6: [1, 2],        // d6 recruits on rolling 1 or 2
  8: [1, 2, 3],     // d8 recruits on rolling 1, 2, or 3
  10: [1, 2, 3, 4], // d10 recruits on rolling 1, 2, 3, or 4
  12: [1, 2, 3, 4, 5] // d12 recruits on rolling 1, 2, 3, 4, or 5
};

// What dice are recruited when successful
const RECRUITMENT_REWARDS = {
  4: [4],           // d4 recruits another d4
  6: [6, 4],        // d6 recruits d6 and d4
  8: [8, 6, 4],     // d8 recruits d8, d6, and d4
  10: [10, 8, 6, 4], // d10 recruits d10, d8, d6, and d4
  12: [12, 10, 8, 6, 4] // d12 recruits d12, d10, d8, d6, and d4
};

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
  INITIAL_FREE_PIPS: 0,
  INITIAL_SCORE: 0,
  INITIAL_DICE_FLOOR: 4,
  COLLAPSE_DICE: [4, 6, 8] // d4, d6, d8 for collapse check
};

// Scoring constants
const SCORING = {
  MIN_STRAIGHT_LENGTH: 3,   // Minimum dice for straight
  MIN_SET_SIZE: 4,          // Minimum dice for set
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

// Dice sides progression for promotion
const DICE_PROGRESSION = [4, 6, 8, 10, 12];

// Maximum dice sides
const MAX_DICE_SIDES = 12;

module.exports = {
  RECRUITMENT_TABLE,
  RECRUITMENT_REWARDS,
  PIP_COSTS,
  GAME_DEFAULTS,
  SCORING,
  PHASES,
  LOG_TYPES,
  DICE_PROGRESSION,
  MAX_DICE_SIDES
};