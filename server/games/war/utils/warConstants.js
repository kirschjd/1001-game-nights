// server/games/war/utils/warConstants.js
// War game constants and configuration

const WAR_CONSTANTS = {
  // Game Rules
  WINNING_SCORE: 5,
  FOLD_PENALTY: -1,
  WIN_POINTS: 1,
  LOSE_POINTS: -1,
  
  // Card Values
  CARDS: {
    ACE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
    SIX: 6,
    SEVEN: 7,
    EIGHT: 8,
    NINE: 9,
    TEN: 10,
    JACK: 11,
    QUEEN: 12,
    KING: 13
  },
  
  // Card Names
  CARD_NAMES: {
    1: 'Ace',
    2: '2',
    3: '3', 
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: '10',
    11: 'Jack',
    12: 'Queen',
    13: 'King'
  },
  
  // Game Phases
  PHASES: {
    DEALING: 'dealing',
    PLAYING: 'playing',
    REVEALING: 'revealing',
    COMPLETE: 'complete'
  },
  
  // Player Actions
  ACTIONS: {
    PLAY: 'play',
    FOLD: 'fold'
  },
  
  // Player Limits
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  
  // Variants
  VARIANTS: {
    REGULAR: 'regular',
    ACES_HIGH: 'aces-high'
  },
  
  // Bot Timings (milliseconds)
  BOT_TIMINGS: {
    MIN_DELAY: 800,
    MAX_DELAY: 3500,
    STAGGER_DELAY: 300
  },
  
  // UI Constants
  UI: {
    CARD_EMOJIS: {
      1: '🎯',   // Ace
      11: '👑',  // Jack
      12: '👑',  // Queen  
      13: '👑',  // King
      DEFAULT: '🃏'
    },
    
    DIFFICULTY_COLORS: {
      easy: '#22c55e',     // green
      medium: '#f59e0b',   // yellow
      hard: '#ef4444'      // red
    }
  }
};

/**
 * Get card name by value
 * @param {number} cardValue - Card value (1-13)
 * @returns {string} - Card name
 */
function getCardName(cardValue) {
  return WAR_CONSTANTS.CARD_NAMES[cardValue] || cardValue.toString();
}

/**
 * Get card emoji by value
 * @param {number} cardValue - Card value (1-13)
 * @returns {string} - Card emoji
 */
function getCardEmoji(cardValue) {
  if (cardValue === 1) return WAR_CONSTANTS.UI.CARD_EMOJIS[1];
  if (cardValue >= 11) return WAR_CONSTANTS.UI.CARD_EMOJIS[11];
  if (cardValue >= 8) return '💎';
  return WAR_CONSTANTS.UI.CARD_EMOJIS.DEFAULT;
}

/**
 * Check if card value is valid
 * @param {number} cardValue - Card value to check
 * @returns {boolean} - True if valid
 */
function isValidCard(cardValue) {
  return Number.isInteger(cardValue) && 
         cardValue >= WAR_CONSTANTS.CARDS.ACE && 
         cardValue <= WAR_CONSTANTS.CARDS.KING;
}

/**
 * Generate random card value
 * @returns {number} - Random card value (1-13)
 */
function generateRandomCard() {
  return Math.floor(Math.random() * 13) + 1;
}

/**
 * Get difficulty color for UI
 * @param {string} difficulty - Difficulty level
 * @returns {string} - Color hex code
 */
function getDifficultyColor(difficulty) {
  return WAR_CONSTANTS.UI.DIFFICULTY_COLORS[difficulty] || 
         WAR_CONSTANTS.UI.DIFFICULTY_COLORS.medium;
}

module.exports = {
  WAR_CONSTANTS,
  getCardName,
  getCardEmoji,
  isValidCard,
  generateRandomCard,
  getDifficultyColor
};