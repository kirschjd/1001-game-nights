// src/components/games/war/utils/cardUtils.ts
// Card utilities for War game

/**
 * Card name constants
 */
export const CARD_NAMES: Record<number, string> = {
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
export const CARD_EMOJIS = {
  1: '🎯',   // Ace
  11: '👑',  // Jack
  12: '👑',  // Queen
  13: '👑',  // King
  DEFAULT: '🃏'
};

/**
 * Get card name by value
 * @param cardValue - Card value (1-13)
 * @returns Card name
 */
export function getCardName(cardValue: number): string {
  return CARD_NAMES[cardValue] || cardValue.toString();
}

/**
 * Get card emoji by value
 * @param cardValue - Card value (1-13)
 * @returns Card emoji
 */
export function getCardEmoji(cardValue: number): string {
  if (cardValue === 1) return CARD_EMOJIS[1];
  if (cardValue >= 11) return CARD_EMOJIS[11];
  if (cardValue >= 8) return '💎';
  return CARD_EMOJIS.DEFAULT;
}

/**
 * Check if card value is valid
 * @param cardValue - Card value to check
 * @returns True if valid
 */
export function isValidCard(cardValue: number): boolean {
  return Number.isInteger(cardValue) && cardValue >= 1 && cardValue <= 13;
}

/**
 * Generate random card value
 * @param min - Minimum value (default 1)
 * @param max - Maximum value (default 13)
 * @returns Random card value
 */
export function generateRandomCard(min: number = 1, max: number = 13): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get card strength for variant comparison
 * @param cardValue - Card value
 * @param variant - Game variant ('regular' or 'aces-high')
 * @returns Strength value for comparison
 */
export function getCardStrength(cardValue: number, variant: string): number {
  if (variant === 'aces-high' && cardValue === 1) {
    return 14; // Aces beat everything in aces-high
  }
  return cardValue;
}