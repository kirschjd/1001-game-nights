// HenHur Card Type Definitions

export type DeckType = 'base' | 'lap1' | 'lap2' | 'lap3';

export type CardEffectType =
  | 'move_player_position'
  | 'move_opponent_position'
  | 'affect_token_pool'
  | 'affect_player_mat'
  | 'draw_cards'
  | 'discard_cards'
  | 'modify_priority'
  | 'block_action'
  | 'gain_resource'
  | string; // Allow custom effect types for experimentation

export interface CardEffect {
  type: CardEffectType;
  params: Record<string, any>;
  condition?: EffectCondition; // Optional condition for when effect triggers
}

export interface EffectCondition {
  type: 'position_is_first' | 'position_is_last' | 'lap_equals' | 'token_count' | 'custom';
  params?: Record<string, any>;
}

// Priority value format: "base + dice" (e.g., "1 + d6")
export interface PriorityValue {
  base: number;       // Base priority value
  dice: string;       // Dice type: 'd4', 'd6', 'd8', etc.
}

export interface Card {
  id: string;
  title: string;
  deckType: DeckType;
  trickNumber: number;
  raceNumber: number; // Static race value
  priority: number | PriorityValue; // Can be static number or base + dice
  description: string;
  effect: CardEffect[];
  burnEffect: CardEffect[];
  copies?: number; // Number of copies per player (for base deck) or in pool (for lap decks)
}

export interface CardInstance {
  card: Card;
  instanceId: string; // Unique ID for this specific copy
}

export interface PlayerDeck {
  playerId: string;
  deck: Card[];
  hand: Card[];
  discard: Card[];
}

export interface SharedCardPool {
  availableCards: Card[];
  currentLap: 'base' | 'lap1' | 'lap2' | 'lap3';
}

export interface CardGameState {
  playerDecks: Record<string, PlayerDeck>;
  sharedPool: SharedCardPool;
  selectedCards: string[]; // IDs of cards enabled for this game session
}
