// HenHur Card Database
// Central repository for all card definitions
// This file will be the main place to add/edit cards for easy experimentation

import { Card, DeckType } from '../types/card.types';

/**
 * Card Database Structure
 *
 * To add a new card:
 * 1. Add the card definition to the appropriate deck type array
 * 2. Set copies to determine how many exist in the pool
 * 3. Define effects using the effect registry types
 * 4. Run validation to ensure card is properly formatted
 *
 * Effect types available: see effectRegistry.ts for full list
 */

// ============================================================================
// BASE DECK CARDS
// These cards are included in every player's starting deck
// ============================================================================

export const BASE_CARDS: Card[] = [
  {
    id: 'base_sprint',
    title: 'Sprint',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 1,
    priority: 5,
    description: 'Move forward 1 space',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      }
    ],
    burnEffect: [],
    copies: 5
  },
  {
    id: 'base_jog',
    title: 'Jog',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 2,
    priority: 3,
    description: 'Move forward 2 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 2 }
      }
    ],
    burnEffect: [],
    copies: 3
  }
];

// ============================================================================
// LAP 1 CARDS
// Available for drafting when any player is on lap 1
// ============================================================================

export const LAP1_CARDS: Card[] = [
  {
    id: 'lap1_dash',
    title: 'Dash',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 1,
    priority: 7,
    description: 'Move forward 3 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 3 }
      }
    ],
    burnEffect: [
      {
        type: 'draw_cards',
        params: { count: 1 }
      }
    ],
    copies: 4
  },
  {
    id: 'lap1_trip',
    title: 'Trip',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 0,
    priority: 6,
    description: 'Move opponent back 1 space',
    effect: [
      {
        type: 'move_opponent_position',
        params: { distance: -1, targetSelection: 'choose' }
      }
    ],
    burnEffect: [],
    copies: 3
  },
  // Add more Lap 1 cards here...
];

// ============================================================================
// LAP 2 CARDS
// Available for drafting when any player is on lap 2
// ============================================================================

export const LAP2_CARDS: Card[] = [
  {
    id: 'lap2_surge',
    title: 'Surge',
    deckType: 'lap2',
    trickNumber: 3,
    raceNumber: 1,
    priority: 9,
    description: 'Move forward 4 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 4 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'R+', count: 2 }
      }
    ],
    copies: 2
  },
  // Add more Lap 2 cards here...
];

// ============================================================================
// LAP 3 CARDS
// Available for drafting when any player is on lap 3
// ============================================================================

export const LAP3_CARDS: Card[] = [
  {
    id: 'lap3_turbo',
    title: 'Turbo Boost',
    deckType: 'lap3',
    trickNumber: 4,
    raceNumber: 1,
    priority: 10,
    description: 'Move forward 5 spaces and gain priority',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 5 }
      },
      {
        type: 'modify_priority',
        params: { adjustment: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'draw_cards',
        params: { count: 2 }
      }
    ],
    copies: 1
  },
  // Add more Lap 3 cards here...
];

// ============================================================================
// CARD DATABASE EXPORTS
// ============================================================================

export const CARD_DATABASE = {
  base: BASE_CARDS,
  lap1: LAP1_CARDS,
  lap2: LAP2_CARDS,
  lap3: LAP3_CARDS
} as const;

// All cards combined for easy lookup
export const ALL_CARDS: Card[] = [
  ...BASE_CARDS,
  ...LAP1_CARDS,
  ...LAP2_CARDS,
  ...LAP3_CARDS
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all cards for a specific deck type
 */
export function getCardsByDeckType(deckType: DeckType): Card[] {
  return CARD_DATABASE[deckType];
}

/**
 * Get a specific card by ID
 */
export function getCardById(cardId: string): Card | undefined {
  return ALL_CARDS.find(card => card.id === cardId);
}

/**
 * Get base card ID (strips _copyN suffix)
 */
export function getBaseCardId(cardId: string): string {
  return cardId.replace(/_copy\d+$/, '');
}

/**
 * Get total card count including copies
 */
export function getTotalCardCount(cards: Card[]): number {
  return cards.reduce((total, card) => total + (card.copies || 1), 0);
}

/**
 * Get cards by IDs (useful for game variants)
 */
export function getCardsByIds(cardIds: string[]): Card[] {
  return cardIds.map(id => getCardById(id)).filter(Boolean) as Card[];
}

/**
 * Search cards by title, description, or effect type
 */
export function searchCards(query: string): Card[] {
  const lowerQuery = query.toLowerCase();
  return ALL_CARDS.filter(card =>
    card.title.toLowerCase().includes(lowerQuery) ||
    card.description.toLowerCase().includes(lowerQuery) ||
    card.effect.some(e => e.type.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Filter cards by criteria
 */
export function filterCards(criteria: {
  deckType?: DeckType;
  minPriority?: number;
  maxPriority?: number;
  effectType?: string;
  hasBurnEffect?: boolean;
}): Card[] {
  return ALL_CARDS.filter(card => {
    if (criteria.deckType && card.deckType !== criteria.deckType) return false;
    if (criteria.minPriority && card.priority < criteria.minPriority) return false;
    if (criteria.maxPriority && card.priority > criteria.maxPriority) return false;
    if (criteria.effectType && !card.effect.some(e => e.type === criteria.effectType)) return false;
    if (criteria.hasBurnEffect !== undefined && (card.burnEffect.length > 0) !== criteria.hasBurnEffect) return false;
    return true;
  });
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  return {
    totalUniqueCards: ALL_CARDS.length,
    totalCardCopies: getTotalCardCount(ALL_CARDS),
    byDeckType: {
      base: {
        unique: BASE_CARDS.length,
        total: getTotalCardCount(BASE_CARDS)
      },
      lap1: {
        unique: LAP1_CARDS.length,
        total: getTotalCardCount(LAP1_CARDS)
      },
      lap2: {
        unique: LAP2_CARDS.length,
        total: getTotalCardCount(LAP2_CARDS)
      },
      lap3: {
        unique: LAP3_CARDS.length,
        total: getTotalCardCount(LAP3_CARDS)
      }
    },
    effectTypes: getEffectTypeStats(),
    priorityRange: {
      min: Math.min(...ALL_CARDS.map(c => c.priority)),
      max: Math.max(...ALL_CARDS.map(c => c.priority))
    }
  };
}

function getEffectTypeStats() {
  const stats: Record<string, number> = {};
  ALL_CARDS.forEach(card => {
    card.effect.forEach(effect => {
      stats[effect.type] = (stats[effect.type] || 0) + 1;
    });
  });
  return stats;
}