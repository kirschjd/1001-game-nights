// src/components/games/war/utils/cardHelper.ts
// War game card utility functions

// Import shared card utilities
import {
  CARD_NAMES,
  CARD_EMOJIS,
  getCardName as sharedGetCardName,
  getCardEmoji as sharedGetCardEmoji,
  isValidCard as sharedIsValidCard,
  getCardStrength as sharedGetCardStrength
} from '../../../../shared/war/cardUtils';

export const WAR_UI_CONSTANTS = {
  CARD_NAMES, // Using shared constants
  CARD_EMOJIS, // Using shared constants

  DIFFICULTY_COLORS: {
    easy: '#22c55e',     // green
    medium: '#f59e0b',   // yellow
    hard: '#ef4444'      // red
  },

  WINNING_SCORE: 5,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8
};

// Re-export shared card utilities
export const getCardName = sharedGetCardName;
export const getCardEmoji = sharedGetCardEmoji;
export const isValidCard = sharedIsValidCard;
export const getCardStrength = sharedGetCardStrength;

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