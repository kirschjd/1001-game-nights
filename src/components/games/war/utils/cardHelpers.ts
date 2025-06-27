// src/components/games/war/utils/cardHelper.ts
// War game card utility functions

export const WAR_UI_CONSTANTS = {
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
  } as Record<number, string>,
  
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
  },
  
  WINNING_SCORE: 5,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8
};

/**
 * Get card name by value
 * @param cardValue - Card value (1-13)
 * @returns Card name
 */
export function getCardName(cardValue: number): string {
  return WAR_UI_CONSTANTS.CARD_NAMES[cardValue] || cardValue.toString();
}

/**
 * Get card emoji by value
 * @param cardValue - Card value (1-13)
 * @returns Card emoji
 */
export function getCardEmoji(cardValue: number): string {
  if (cardValue === 1) return WAR_UI_CONSTANTS.CARD_EMOJIS[1];
  if (cardValue >= 11) return WAR_UI_CONSTANTS.CARD_EMOJIS[11];
  if (cardValue >= 8) return '💎';
  return WAR_UI_CONSTANTS.CARD_EMOJIS.DEFAULT;
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
 * Get difficulty color for UI
 * @param difficulty - Difficulty level
 * @returns Color hex code
 */
export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  return WAR_UI_CONSTANTS.DIFFICULTY_COLORS[difficulty] || 
         WAR_UI_CONSTANTS.DIFFICULTY_COLORS.medium;
}

/**
 * Format player action for display
 * @param action - Player action
 * @returns Formatted action string
 */
export function formatAction(action: string | null): string {
  if (!action) return 'Waiting...';
  return action === 'play' ? 'Playing' : 'Folded';
}

/**
 * Get action color class for Tailwind
 * @param action - Player action
 * @returns Tailwind color classes
 */
export function getActionColorClass(action: string | null): string {
  if (!action) return 'bg-yellow-900/50 text-yellow-300 border-yellow-600';
  if (action === 'play') return 'bg-green-900/50 text-green-300 border-green-600';
  return 'bg-red-900/50 text-red-300 border-red-600';
}

/**
 * Calculate total players including bots
 * @param humanPlayers - Number of human players
 * @param botConfigs - Array of bot configurations
 * @returns Total player count
 */
export function calculateTotalPlayers(humanPlayers: number, botConfigs: Array<{count: number}>): number {
  const botCount = botConfigs.reduce((sum, config) => sum + config.count, 0);
  return humanPlayers + botCount;
}

/**
 * Validate player count for war game
 * @param totalPlayers - Total number of players
 * @returns Validation result
 */
export function validatePlayerCount(totalPlayers: number): { valid: boolean; message: string } {
  if (totalPlayers < WAR_UI_CONSTANTS.MIN_PLAYERS) {
    return { 
      valid: false, 
      message: `Need at least ${WAR_UI_CONSTANTS.MIN_PLAYERS} players` 
    };
  }
  
  if (totalPlayers > WAR_UI_CONSTANTS.MAX_PLAYERS) {
    return { 
      valid: false, 
      message: `Maximum ${WAR_UI_CONSTANTS.MAX_PLAYERS} players allowed` 
    };
  }
  
  return { valid: true, message: 'Ready to start!' };
}

/**
 * Get card strength for variant comparison
 * @param cardValue - Card value
 * @param variant - Game variant
 * @returns Strength value for comparison
 */
export function getCardStrength(cardValue: number, variant: string): number {
  if (variant === 'aces-high' && cardValue === 1) {
    return 14; // Aces beat everything in aces-high
  }
  return cardValue;
}

/**
 * Format time duration
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}