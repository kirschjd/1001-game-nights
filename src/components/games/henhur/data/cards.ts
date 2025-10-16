// HenHur Card Definitions

import { Card } from '../types/card.types';

// Base deck cards - included in every player's starting deck
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
    copies: 5 // Each player starts with 5 Sprints
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
    copies: 3 // Each player starts with 3 Jogs
  }
];

// Lap 1 cards - available for drafting in the first lap
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
    copies: 4 // 4 copies available in shared pool
  },
  {
    id: 'lap1_trip',
    title: 'Trip',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 2,
    priority: 6,
    description: 'Move opponent back 1 space',
    effect: [
      {
        type: 'move_opponent_position',
        params: { distance: -1, targetSelection: 'choose' }
      }
    ],
    burnEffect: [],
    copies: 3 // 3 copies available in shared pool
  }
];

// Lap 2 cards - available for drafting in the second lap
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
        params: { action: 'gain', tokenType: 'movement', count: 2 }
      }
    ],
    copies: 2 // 2 copies available in shared pool
  }
];

// Lap 3 cards - available for drafting in the third lap
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
    copies: 1 // Only 1 copy - rare powerful card
  }
];

// All cards combined
export const ALL_CARDS: Card[] = [
  ...BASE_CARDS,
  ...LAP1_CARDS,
  ...LAP2_CARDS,
  ...LAP3_CARDS
];

// Helper function to get cards by deck type
export function getCardsByDeckType(deckType: 'base' | 'lap1' | 'lap2' | 'lap3'): Card[] {
  return ALL_CARDS.filter(card => card.deckType === deckType);
}

// Helper function to get card by ID
export function getCardById(cardId: string): Card | undefined {
  return ALL_CARDS.find(card => card.id === cardId);
}

// Helper function to get total number of cards including copies
export function getTotalCardCount(cards: Card[]): number {
  return cards.reduce((total, card) => total + (card.copies || 1), 0);
}

// Helper function to get base card ID (without _copyN suffix)
export function getBaseCardId(cardId: string): string {
  return cardId.replace(/_copy\d+$/, '');
}
