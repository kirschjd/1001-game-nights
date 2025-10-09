// shared/war/cardUtils.js
// Shared card utilities for War game (client & server)

/**
 * Card name constants
 */
const CARD_NAMES = {
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
};

/**
 * Card emoji constants
 */
const CARD_EMOJIS = {
  1: '🎯',   // Ace
  11: '👑',  // Jack
  12: '👑',  // Queen
  13: '👑',  // King
  DEFAULT: '🃏'
};

/**
 * Get card name by value
 * @param {number} cardValue - Card value (1-13)
 * @returns {string} - Card name
 */
function getCardName(cardValue) {
  return CARD_NAMES[cardValue] || cardValue.toString();
}

/**
 * Get card emoji by value
 * @param {number} cardValue - Card value (1-13)
 * @returns {string} - Card emoji
 */
function getCardEmoji(cardValue) {
  if (cardValue === 1) return CARD_EMOJIS[1];
  if (cardValue >= 11) return CARD_EMOJIS[11];
  if (cardValue >= 8) return '💎';
  return CARD_EMOJIS.DEFAULT;
}

/**
 * Check if card value is valid
 * @param {number} cardValue - Card value to check
 * @returns {boolean} - True if valid
 */
function isValidCard(cardValue) {
  return Number.isInteger(cardValue) && cardValue >= 1 && cardValue <= 13;
}

/**
 * Generate random card value
 * @param {number} min - Minimum value (default 1)
 * @param {number} max - Maximum value (default 13)
 * @returns {number} - Random card value
 */
function generateRandomCard(min = 1, max = 13) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get card strength for variant comparison
 * @param {number} cardValue - Card value
 * @param {string} variant - Game variant ('regular' or 'aces-high')
 * @returns {number} - Strength value for comparison
 */
function getCardStrength(cardValue, variant) {
  if (variant === 'aces-high' && cardValue === 1) {
    return 14; // Aces beat everything in aces-high
  }
  return cardValue;
}

// CommonJS export for Node.js (server)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CARD_NAMES,
    CARD_EMOJIS,
    getCardName,
    getCardEmoji,
    isValidCard,
    generateRandomCard,
    getCardStrength
  };
}

// ES Module export for modern bundlers (client)
if (typeof exports !== 'undefined') {
  exports.CARD_NAMES = CARD_NAMES;
  exports.CARD_EMOJIS = CARD_EMOJIS;
  exports.getCardName = getCardName;
  exports.getCardEmoji = getCardEmoji;
  exports.isValidCard = isValidCard;
  exports.generateRandomCard = generateRandomCard;
  exports.getCardStrength = getCardStrength;
}