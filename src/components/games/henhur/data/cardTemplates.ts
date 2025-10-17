// Card Templates for Quick Creation
// Copy and modify these templates to create new cards quickly

import { Card } from '../types/card.types';

/**
 * INSTRUCTIONS:
 * 1. Copy a template below
 * 2. Modify the values
 * 3. Add to the appropriate section in cardDatabase.ts
 * 4. Save and the card will be in the game!
 */

// ============================================================================
// BASIC TEMPLATES
// ============================================================================

/**
 * Simple movement card - moves player forward
 */
export const SIMPLE_MOVEMENT_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap1', // Change to: base, lap1, lap2, lap3
  trickNumber: 2,
  raceNumber: 1,
  priority: 6,
  description: 'Move forward X spaces',
  effect: [
    {
      type: 'move_player_position',
      params: { distance: 3 } // Change distance value
    }
  ],
  burnEffect: [],
  copies: 3
};

/**
 * Movement with card draw
 */
export const MOVEMENT_WITH_DRAW_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap1',
  trickNumber: 2,
  raceNumber: 1,
  priority: 7,
  description: 'Move forward X spaces and draw a card',
  effect: [
    {
      type: 'move_player_position',
      params: { distance: 3 }
    },
    {
      type: 'draw_cards',
      params: { count: 1 }
    }
  ],
  burnEffect: [
    {
      type: 'draw_cards',
      params: { count: 2 }
    }
  ],
  copies: 2
};

/**
 * Opponent interaction card
 */
export const OPPONENT_INTERACTION_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap1',
  trickNumber: 2,
  raceNumber: 0, // Usually 0 for opponent-focused cards
  priority: 7,
  description: 'Move opponent back X spaces',
  effect: [
    {
      type: 'move_opponent_position',
      params: {
        distance: -2, // Negative to move back
        targetSelection: 'choose'
      }
    }
  ],
  burnEffect: [],
  copies: 3
};

/**
 * Token generation card
 */
export const TOKEN_GENERATION_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap2',
  trickNumber: 3,
  raceNumber: 1,
  priority: 7,
  description: 'Move forward X spaces and gain tokens',
  effect: [
    {
      type: 'move_player_position',
      params: { distance: 3 }
    },
    {
      type: 'affect_token_pool',
      params: {
        action: 'gain',
        tokenType: 'P+', // P+, R+, A+, W+, P+3, D
        count: 1
      }
    }
  ],
  burnEffect: [],
  copies: 2
};

/**
 * Priority manipulation card
 */
export const PRIORITY_MANIPULATION_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap2',
  trickNumber: 3,
  raceNumber: 1,
  priority: 8,
  description: 'Move and increase priority for next turn',
  effect: [
    {
      type: 'move_player_position',
      params: { distance: 3 }
    },
    {
      type: 'modify_priority',
      params: { adjustment: 3 }
    }
  ],
  burnEffect: [],
  copies: 2
};

// ============================================================================
// ADVANCED TEMPLATES
// ============================================================================

/**
 * Multi-effect powerful card
 */
export const MULTI_EFFECT_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap3',
  trickNumber: 4,
  raceNumber: 1,
  priority: 10,
  description: 'Does multiple things',
  effect: [
    {
      type: 'move_player_position',
      params: { distance: 5 }
    },
    {
      type: 'draw_cards',
      params: { count: 1 }
    },
    {
      type: 'affect_token_pool',
      params: {
        action: 'gain',
        tokenType: 'W+',
        count: 1
      }
    }
  ],
  burnEffect: [
    {
      type: 'draw_cards',
      params: { count: 3 }
    }
  ],
  copies: 1 // Rare powerful card
};

/**
 * Conditional effect card (move more if in first place, for example)
 */
export const CONDITIONAL_EFFECT_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap2',
  trickNumber: 3,
  raceNumber: 1,
  priority: 8,
  description: 'Move forward, bonus if in first place',
  effect: [
    {
      type: 'move_player_position',
      params: { distance: 3 }
    },
    {
      type: 'move_player_position',
      params: { distance: 2 },
      condition: {
        type: 'position_is_first',
        params: {}
      }
    }
  ],
  burnEffect: [],
  copies: 2
};

/**
 * Defensive card (no movement, gains tokens)
 */
export const DEFENSIVE_TEMPLATE: Card = {
  id: 'lapX_card_name',
  title: 'Card Name',
  deckType: 'lap2',
  trickNumber: 3,
  raceNumber: 0, // No race movement
  priority: 5,
  description: 'Gain multiple tokens',
  effect: [
    {
      type: 'affect_token_pool',
      params: {
        action: 'gain',
        tokenType: 'P+',
        count: 2
      }
    },
    {
      type: 'affect_token_pool',
      params: {
        action: 'gain',
        tokenType: 'R+',
        count: 2
      }
    }
  ],
  burnEffect: [
    {
      type: 'draw_cards',
      params: { count: 2 }
    }
  ],
  copies: 2
};

// ============================================================================
// QUICK BATCH CREATION HELPERS
// ============================================================================

/**
 * Generate a series of movement cards with increasing values
 *
 * Example:
 * const lap1MovementCards = generateMovementSeries('lap1', [2, 3, 4, 5], 7, 2, 2);
 */
export function generateMovementSeries(
  deckType: 'base' | 'lap1' | 'lap2' | 'lap3',
  distances: number[],
  basePriority: number,
  trickNumber: number,
  copiesPerCard: number
): Card[] {
  return distances.map((distance, index) => ({
    id: `${deckType}_move_${distance}`,
    title: `Sprint ${distance}`,
    deckType,
    trickNumber,
    raceNumber: 1,
    priority: basePriority + index,
    description: `Move forward ${distance} space${distance !== 1 ? 's' : ''}`,
    effect: [
      {
        type: 'move_player_position',
        params: { distance }
      }
    ],
    burnEffect: distance > 3 ? [{ type: 'draw_cards', params: { count: 1 } }] : [],
    copies: copiesPerCard
  }));
}

/**
 * Generate token-focused cards
 *
 * Example:
 * const tokenCards = generateTokenCards('lap2', ['P+', 'R+', 'A+'], 3, 8, 2);
 */
export function generateTokenCards(
  deckType: 'base' | 'lap1' | 'lap2' | 'lap3',
  tokenTypes: string[],
  trickNumber: number,
  basePriority: number,
  copiesPerCard: number
): Card[] {
  return tokenTypes.map((tokenType, index) => ({
    id: `${deckType}_gain_${tokenType.toLowerCase()}`,
    title: `Gain ${tokenType}`,
    deckType,
    trickNumber,
    raceNumber: 1,
    priority: basePriority + index,
    description: `Move 2 spaces and gain ${tokenType} token`,
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 2 }
      },
      {
        type: 'affect_token_pool',
        params: {
          action: 'gain',
          tokenType,
          count: 1
        }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: {
          action: 'gain',
          tokenType,
          count: 2
        }
      }
    ],
    copies: copiesPerCard
  }));
}

// ============================================================================
// EXAMPLE BATCH CREATION
// ============================================================================

/**
 * Example: Creating 10 Lap 1 cards at once
 * Uncomment and modify to use:
 */

/*
export const EXAMPLE_LAP1_BATCH: Card[] = [
  // Basic movement cards
  ...generateMovementSeries('lap1', [2, 3, 4], 6, 2, 3),

  // Token cards
  ...generateTokenCards('lap1', ['P+', 'R+'], 2, 7, 2),

  // Custom cards
  {
    id: 'lap1_quick_draw',
    title: 'Quick Draw',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 1,
    priority: 7,
    description: 'Move 2 and draw 2 cards',
    effect: [
      { type: 'move_player_position', params: { distance: 2 } },
      { type: 'draw_cards', params: { count: 2 } }
    ],
    burnEffect: [
      { type: 'draw_cards', params: { count: 3 } }
    ],
    copies: 2
  }
];
*/

// ============================================================================
// NOTES FOR CARD CREATION
// ============================================================================

/**
 * CARD DESIGN TIPS:
 *
 * 1. BALANCE:
 *    - Higher priority = goes first but usually weaker effect
 *    - Lower priority = goes later but usually stronger effect
 *    - High trick number = better for auctions, worse for racing
 *
 * 2. COPIES:
 *    - More copies = more common = less powerful
 *    - Fewer copies = more rare = can be more powerful
 *    - Base cards: 3-5 copies
 *    - Lap 1: 2-4 copies
 *    - Lap 2: 2-3 copies
 *    - Lap 3: 1-2 copies
 *
 * 3. BURN EFFECTS:
 *    - Should be stronger than normal effect
 *    - Player loses the card permanently
 *    - Usually: draw cards, gain tokens, or powerful one-time effect
 *    - Not all cards need burn effects
 *
 * 4. PROGRESSION:
 *    - Base: Simple, consistent, low power
 *    - Lap 1: Moderate power, introduces mechanics
 *    - Lap 2: High power, complex effects
 *    - Lap 3: Very high power, game-changing effects
 *
 * 5. VARIETY:
 *    - Mix movement speeds (2-5 spaces)
 *    - Mix priorities (low, medium, high)
 *    - Include opponent interaction
 *    - Include token generation
 *    - Include card draw
 *    - Some cards with no movement but powerful effects
 */