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
  | 'gain_resource';

export interface CardEffect {
  type: CardEffectType;
  params: Record<string, any>;
}

export interface Card {
  id: string;
  title: string;
  deckType: DeckType;
  trickNumber: number;
  raceNumber: number;
  priority: number;
  description: string;
  effect: CardEffect[];
  burnEffect: CardEffect[];
  copies?: number; // Number of copies in the pool (default: 1)
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
