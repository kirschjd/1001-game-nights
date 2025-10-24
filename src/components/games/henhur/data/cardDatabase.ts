// HenHur Card Database
// Central repository for all card definitions
// This file will be the main place to add/edit cards for easy experimentation

import { Card, DeckType, PriorityValue } from '../types/card.types';

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
    id: 'base_pit_stop',
    title: 'Pit Stop',
    deckType: 'base',
    trickNumber: 2,
    raceNumber: 1,
    priority: { base: 1, dice: 'd6' }, // 1 + d6
    description: 'Deck Maintenance - Discard a card from your burn stack',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      },
      {
        type: 'affect_player_mat',
        params: { property: 'deckMaintenance', value: 1, operation: 'set' }
      }
      // TODO: Implement burn stack discard mechanic
    ],
    burnEffect: [
      {
        type: 'affect_player_mat',
        params: { property: 'discardBurnStack', value: true, operation: 'set' }
      }
      // Discard every card from burn stack including this one
    ],
    copies: 1 // Each player gets 1 in their starting deck (12 total)
  },
  {
    id: 'base_high_bid',
    title: 'High Bid',
    deckType: 'base',
    trickNumber: 7,
    raceNumber: 1,
    priority: { base: 1, dice: 'd4' }, // 1 + d4
    description: 'Econ - Move 1 space and gain 4 trick value',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      }
      // Econ effect: +4 to trick value (implicit in trickNumber)
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'P+', count: 1 }
      }
    ],
    copies: 1 // Each player gets 1 in their starting deck (12 total)
  },
  {
    id: 'base_low_bid',
    title: 'Low Bid',
    deckType: 'base',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 2, dice: 'd8' }, // 2 + d8
    description: 'Econ - Move 1 space and gain 8 trick value',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      }
      // Econ effect: +8 to trick value (implicit in trickNumber)
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'A+', count: 1 }
      }
    ],
    copies: 2 // Each player gets 2 in their starting deck (12 total)
  },
  {
    id: 'base_rush',
    title: 'Rush',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 5,
    priority: { base: 2, dice: 'd8' }, // 2 + d8
    description: 'Sprint - Move 4 spaces, you may move at any point in the turn',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 4 }
      },
      {
        type: 'affect_player_mat',
        params: { property: 'canMoveAnytime', value: true, operation: 'set' }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'R+', count: 1 }
      }
    ],
    copies: 2 // Each player gets 2 in their starting deck (12 total)
  },
  {
    id: 'base_stride',
    title: 'Stride',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 7,
    priority: { base: 2, dice: 'd8' }, // 2 + d8
    description: 'Stride - Move forward without using race number',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 0 }
      }
      // Stride mechanic: race number 7 is used differently
    ],
    burnEffect: [
      {
        type: 'move_player_position',
        params: { distance: 8 }
      }
    ],
    copies: 2 // Each player gets 2 in their starting deck (12 total)
  },
  {
    id: 'base_punch',
    title: 'Punch',
    deckType: 'base',
    trickNumber: 3,
    raceNumber: 4,
    priority: { base: 2, dice: 'd8' }, // 2 + d8
    description: 'Fight - Move 2 spaces, then move an adjacent opponent 2 or give a damage token',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 2 }
      },
      {
        type: 'move_opponent_position',
        params: { distance: 2, targetSelection: 'choose', requiresAdjacent: true }
      }
      // OR give damage token (player choice)
    ],
    burnEffect: [
      {
        type: 'move_opponent_position',
        params: { distance: 4, targetSelection: 'choose', requiresAdjacent: true }
      }
      // OR give 2 damage tokens (player choice)
    ],
    copies: 2 // Each player gets 2 in their starting deck (12 total)
  }
];

// ============================================================================
// LAP 1 CARDS
// Available for drafting when any player is on lap 1
// ============================================================================

export const LAP1_CARDS: Card[] = [
  {
    id: 'lap1_golden_grain',
    title: 'Golden Grain',
    deckType: 'lap1',
    trickNumber: 7,
    raceNumber: 1,
    priority: { base: 1, dice: 'd6' },
    description: 'Econ',
    effect: [],
    burnEffect: [
      {
        type: 'modify_race',
        params: { raceValue: 7 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_merchants_wager',
    title: "Merchant's Wager",
    deckType: 'lap1',
    trickNumber: 9,
    raceNumber: 1,
    priority: { base: 3, dice: 'd4' },
    description: 'Econ - As you play this card, discard a token, if you don\'t, the trick number goes to 4',
    effect: [
      {
        type: 'conditional_trick_reduction',
        params: { discardToken: true, reducedTrick: 4 }
      }
    ],
    burnEffect: [
      {
        type: 'ignore_effect',
        params: {}
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_speed_sandals',
    title: 'Speed Sandals',
    deckType: 'lap1',
    trickNumber: 4,
    raceNumber: 1,
    priority: { base: 4, dice: 'd8' },
    description: 'Deck Maintenance - Loot 2',
    effect: [
      {
        type: 'loot',
        params: { count: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'loot',
        params: { count: 4 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_chariot_upgrade',
    title: 'Chariot Upgrade',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 0, dice: 'd6' },
    description: 'Deck Maintenance - Remove a damage token, or discard a card from your burn stack',
    effect: [
      {
        type: 'remove_damage_or_burn',
        params: { damageCount: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'remove_all_damage',
        params: {}
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_crowd_pleaser',
    title: 'Crowd Pleaser',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 3,
    priority: { base: 3, dice: 'd6' },
    description: 'Special - Get a token of your choice',
    effect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'choice', count: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'choice_single_type', count: 2 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_praetorian_plumes',
    title: 'Praetorian Plumes',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 2, dice: 'd6' },
    description: 'Fight - Push enemy 3',
    effect: [
      {
        type: 'move_opponent_position',
        params: { distance: 3, targetSelection: 'choose' }
      }
    ],
    burnEffect: [
      {
        type: 'move_opponent_position',
        params: { distance: 3, targetSelection: 'choose', burnUpgrade: true }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_auctioneers_gavel',
    title: "Auctioneer's Gavel",
    deckType: 'lap1',
    trickNumber: 6,
    raceNumber: 1,
    priority: { base: 1, dice: 'd4' },
    description: 'Econ - Rummage',
    effect: [
      {
        type: 'rummage',
        params: { count: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'rummage',
        params: { count: 2 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_bread_and_circuses',
    title: 'Bread and Circuses',
    deckType: 'lap1',
    trickNumber: 6,
    raceNumber: 1,
    priority: { base: 1, dice: 'd6' },
    description: 'Econ - Get 2 trick tokens, everyone else gets a race token',
    effect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'A+', count: 2 }
      },
      {
        type: 'give_all_opponents_token',
        params: { tokenType: 'R+', count: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'A+', count: 2 }
      },
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'R+', count: 1 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_veterans_pension',
    title: "Veteran's Pension",
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 2, dice: 'd4' },
    description: 'Econ - Get a trick token or a race token',
    effect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'choice_A_or_R', count: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'A+', count: 1 }
      },
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'R+', count: 1 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_chariot_craftsman',
    title: 'Chariot Craftsman',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 0, dice: 'd6' },
    description: 'Deck Maintenance - Remove up to 2 damage tokens',
    effect: [
      {
        type: 'remove_damage',
        params: { count: 2, upTo: true }
      }
    ],
    burnEffect: [
      {
        type: 'remove_all_damage',
        params: {}
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_gladiator_gear_grab',
    title: 'Gladiator Gear Grab',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 1,
    priority: { base: 0, dice: 'd4' },
    description: 'Deck Maintenance - Discard a burn card',
    effect: [
      {
        type: 'discard_burn_card',
        params: { count: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'loot',
        params: { count: 3 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_molting_mishap',
    title: 'Molting Mishap',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 6,
    priority: { base: 2, dice: 'd4' },
    description: 'Defense - Remove a damage token',
    effect: [
      {
        type: 'remove_damage',
        params: { count: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'discard_burn_card',
        params: { count: 1 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_chariot_splinter',
    title: 'Chariot Splinter',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 5,
    priority: { base: 3, dice: 'd4' },
    description: 'Fight - Give the closest enemy a damage token',
    effect: [
      {
        type: 'give_damage',
        params: { target: 'closest', count: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'give_damage',
        params: { target: 'closest', count: 2 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_broken_axle',
    title: 'Broken Axle',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 3,
    priority: { base: 2, dice: 'd6' },
    description: 'Fight - Give 2 damage tokens to an enemy',
    effect: [
      {
        type: 'give_damage',
        params: { target: 'choose', count: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'give_damage',
        params: { target: 'choose', count: 3 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_spur_strike',
    title: 'Spur Strike',
    deckType: 'lap1',
    trickNumber: 1,
    raceNumber: 6,
    priority: { base: 3, dice: 'd8' },
    description: 'Fight - Move an enemy 1',
    effect: [
      {
        type: 'move_opponent_position',
        params: { distance: 1, targetSelection: 'choose' }
      }
    ],
    burnEffect: [
      {
        type: 'move_opponent_position',
        params: { distance: 1, targetSelection: 'choose' }
      },
      {
        type: 'give_damage',
        params: { target: 'same_as_move', count: 1 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_gizzard_grind',
    title: 'Gizzard Grind',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 7,
    priority: { base: 0, dice: 'd4' },
    description: 'Defense - Get a damage token',
    effect: [
      {
        type: 'give_damage',
        params: { target: 'self', count: 1 }
      }
    ],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_wing_boost',
    title: 'Wing Boost',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 5,
    priority: { base: 4, dice: 'd8' },
    description: 'Stride',
    effect: [],
    burnEffect: [
      {
        type: 'move_all_opponents',
        params: { distance: 1 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_chariot_collision',
    title: 'Chariot Collision',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 6,
    priority: { base: 3, dice: 'd6' },
    description: 'Fight - Get a damage token, give 2 damage tokens to another player',
    effect: [
      {
        type: 'give_damage',
        params: { target: 'self', count: 1 }
      },
      {
        type: 'give_damage',
        params: { target: 'choose', count: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'swap_with_adjacent',
        params: { beforeMoving: true }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_sharp_turn',
    title: 'Sharp Turn',
    deckType: 'lap1',
    trickNumber: 4,
    raceNumber: 6,
    priority: { base: 5, dice: 'd8' },
    description: 'Sprint - If played on a turn (on the map), race value +2',
    effect: [
      {
        type: 'conditional_race_bonus',
        params: { condition: 'on_turn', bonus: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'conditional_race_bonus',
        params: { condition: 'on_turn', bonus: 4 }
      }
    ],
    copies: 2
  },
  {
    id: 'lap1_rooster_rush',
    title: 'Rooster Rush',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 7,
    priority: { base: 7, dice: 'd8' },
    description: 'Sprint',
    effect: [],
    burnEffect: [
      {
        type: 'additional_movement',
        params: { dice: 'd4' }
      }
    ],
    copies: 2
  }
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
 * Helper: Get priority base value (for sorting/filtering)
 */
function getPriorityBase(priority: number | PriorityValue): number {
  return typeof priority === 'number' ? priority : priority.base;
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
    const priorityBase = getPriorityBase(card.priority);
    if (criteria.minPriority && priorityBase < criteria.minPriority) return false;
    if (criteria.maxPriority && priorityBase > criteria.maxPriority) return false;
    if (criteria.effectType && !card.effect.some(e => e.type === criteria.effectType)) return false;
    if (criteria.hasBurnEffect !== undefined && (card.burnEffect.length > 0) !== criteria.hasBurnEffect) return false;
    return true;
  });
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  const priorityBases = ALL_CARDS.map(c => getPriorityBase(c.priority));
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
      min: Math.min(...priorityBases),
      max: Math.max(...priorityBases)
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