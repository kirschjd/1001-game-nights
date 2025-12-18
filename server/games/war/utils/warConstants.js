// server/games/war/utils/warConstants.js
// War game constants and configuration

const {
  CARD_NAMES,
  CARD_EMOJIS,
  getCardName: sharedGetCardName,
  getCardEmoji: sharedGetCardEmoji,
  isValidCard: sharedIsValidCard,
  generateRandomCard: sharedGenerateRandomCard
} = require('./cardUtils');

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
  
  // Card Names (using shared constants)
  CARD_NAMES,
  
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
    CARD_EMOJIS, // Using shared constants

    DIFFICULTY_COLORS: {
      easy: '#22c55e',     // green
      medium: '#f59e0b',   // yellow
      hard: '#ef4444'      // red
    }
  }
};

// Re-export shared card utilities
const getCardName = sharedGetCardName;
const getCardEmoji = sharedGetCardEmoji;
const isValidCard = sharedIsValidCard;
const generateRandomCard = sharedGenerateRandomCard;

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